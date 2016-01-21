(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Backbone = require('backbone')
var _ = require('underscore')

var bindingSplitter = /^(\S+)\s*(.*)$/;

_.extend(Backbone.View.prototype, {
    bindModel: function(bindings) {
        // Bindings can be defined three different ways. It can be
        // defined on the view as an object or function under the key
        // 'bindings', or as an object passed to bindModel.
        bindings = bindings || getValue(this, 'bindings');

        // Skip if no bindings can be found or if the view has no model.
        if (!bindings || !this.model)
            return;

        // Create the private bindings map if it doesn't exist.
        this._bindings = this._bindings || {};

        // Clear any previous bindings for view.
        this.unbindModel();

        _.each(bindings, function(attribute, binding) {
            if (!_.isArray(attribute))
                attribute = [attribute, [null, null]];

            if (!_.isArray(attribute[1]))
                attribute[1] = [attribute[1], null];

            // Check to see if a binding is already bound to another attribute.
            if (this._bindings[binding])
                throw new Error("'" + binding + "' is already bound to '" + attribute[0] + "'.");

            // Split bindings just like Backbone.View.events where the first half
            // is the property you want to bind to and the remainder is the selector
            // for the element in the view that property is for.
            var match = binding.match(bindingSplitter),
                property = match[1],
                selector = match[2],
                // Find element in view for binding. If there is no selector
                // use the view's el.
                el = (selector) ? this.$(selector) : this.$el,
                // Finder binder definition for binding by property. If it can't be found
                // default to property 'attr'.
                binder = Backbone.View.Binders[property] || Backbone.View.Binders['__attr__'],
                // Fetch accessors from binder. The context of the binder is the view
                // and binder should return an object that has 'set' and or 'get' keys.
                // 'set' must be a function and has one argument. `get` can either be
                // a function or a list [events, function] .The context of both set and
                // get is the views's $el.
                accessors = binder.call(this, this.model, attribute[0], property);

            if (!accessors)
                return;

            // Normalize get accessors if only a function was provided. If no
            // events were provided default to on 'change'.
            if (!_.isArray(accessors.get))
                accessors.get = ['change', accessors.get];

            if (!accessors.get[1] && !accessors.set)
                return;

            // Event key for model attribute changes.
            var setTrigger = 'change:' + attribute[0],
                // Event keys for view.$el namespaced to the view for unbinding.
                getTrigger = _.reduce(accessors.get[0].split(' '), function(memo, event) {
                    return memo + ' ' + event + '.modelBinding' + this.cid;
                }, '', this);

            // Default to identity transformer if not provided for attribute.
            var setTransformer = attribute[1][0] || identityTransformer,
                getTransformer = attribute[1][1] || identityTransformer;

            // Create get and set callbacks so that we can reference the functions
            // when it's time to unbind. 'set' for binding to the model events...
            var set = _.bind(function(model, value, options) {
                // Skip if this callback was bound to the element that
                // triggered the callback.
                if (options && options.el && options.el.get(0) == el.get(0))
                    return;

                // Set the property value for the binder's element.
                accessors.set.call(el, setTransformer.call(this, value));
            }, this);

            // ...and 'get' callback for binding to DOM events.
            var get = _.bind(function(event) {
                // Get the property value from the binder's element.
                // console.log(attribute[0], getTransformer);
                var value = getTransformer.call(this, accessors.get[1].call(el));

                this.model.set(attribute[0], value, {
                    el: this.$(event.srcElement)
                });
            }, this);

            if (accessors.set) {
                this.model.on(setTrigger, set);
                // Trigger the initial set callback manually so that the view is up
                // to date with the model bound to it.
                set(this.model, this.model.get(attribute[0]));
            }

            if (accessors.get[1])
                this.$el.on(getTrigger, selector, get);

            // Save a reference to binding so that we can unbind it later.
            this._bindings[binding] = {
                selector: selector,
                getTrigger: getTrigger,
                setTrigger: setTrigger,
                get: get,
                set: set
            };
        }, this);

        return this;
    },
    unbindModel: function() {
        // Skip if view has been bound or doesn't have a model.
        if (!this._bindings || !this.model)
            return;

        _.each(this._bindings, function(binding, key) {
            if (binding.get[1])
                this.$el.off(binding.getTrigger, binding.selector);

            if (binding.set)
                this.model.off(binding.setTrigger, binding.set);

            delete this._bindings[key];
        }, this);

        return this;
    }
});

Backbone.View.Binders = {
    'value': function(model, attribute, property) {
        return {
            get: ['change keyup', function() {
                return this.val();
            }],
            set: function(value) {
                this.val(value);
            }
        };
    },
    'text': function(model, attribute, property) {
        return {
            get: ['change', function() {
                return this.text();
            }],
            set: function(value) {
                this.text(value);
            }
        };
    },
    'html': function(model, attribute, property) {
        return {
            get: ['change', function() {
                return this.html();
            }],
            set: function(value) {
                this.html(value);
            }
        };
    },
    'class': function(model, attribute, property) {
        return {
            set: function(value) {
                if (this._previousClass)
                    this.removeClass(this._previousClass);

                this.addClass(value);
                this._previousClass = value;
            }
        };
    },
    'checked': function(model, attribute, property) {
        return {
            get: ['change', function() {
                return this.prop('checked');
            }],
            set: function(value) {
                this.prop('checked', !!value);
            }
        };
    },
    '__attr__': function(model, attribute, property) {
        return {
            set: function(value) {
                this.attr(property, value);
            }
        };
    }
};

var identityTransformer = function(value) {
    return value;
};

// Helper function from Backbone to get a value from a Backbone
// object as a property or as a function.
var getValue = function(object, prop) {
    if ((object && object[prop]))
        return _.isFunction(object[prop]) ? object[prop]() : object[prop];
};
},{"backbone":"backbone","underscore":"underscore"}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _handlebarsBase = require('./handlebars/base');

var base = _interopRequireWildcard(_handlebarsBase);

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)

var _handlebarsSafeString = require('./handlebars/safe-string');

var _handlebarsSafeString2 = _interopRequireDefault(_handlebarsSafeString);

var _handlebarsException = require('./handlebars/exception');

var _handlebarsException2 = _interopRequireDefault(_handlebarsException);

var _handlebarsUtils = require('./handlebars/utils');

var Utils = _interopRequireWildcard(_handlebarsUtils);

var _handlebarsRuntime = require('./handlebars/runtime');

var runtime = _interopRequireWildcard(_handlebarsRuntime);

var _handlebarsNoConflict = require('./handlebars/no-conflict');

var _handlebarsNoConflict2 = _interopRequireDefault(_handlebarsNoConflict);

// For compatibility and usage outside of module systems, make the Handlebars object a namespace
function create() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = _handlebarsSafeString2['default'];
  hb.Exception = _handlebarsException2['default'];
  hb.Utils = Utils;
  hb.escapeExpression = Utils.escapeExpression;

  hb.VM = runtime;
  hb.template = function (spec) {
    return runtime.template(spec, hb);
  };

  return hb;
}

var inst = create();
inst.create = create;

_handlebarsNoConflict2['default'](inst);

inst['default'] = inst;

exports['default'] = inst;
module.exports = exports['default'];


},{"./handlebars/base":3,"./handlebars/exception":6,"./handlebars/no-conflict":16,"./handlebars/runtime":17,"./handlebars/safe-string":18,"./handlebars/utils":19}],3:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.HandlebarsEnvironment = HandlebarsEnvironment;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('./utils');

var _exception = require('./exception');

var _exception2 = _interopRequireDefault(_exception);

var _helpers = require('./helpers');

var _decorators = require('./decorators');

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var VERSION = '4.0.5';
exports.VERSION = VERSION;
var COMPILER_REVISION = 7;

exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '== 1.x.x',
  5: '== 2.0.0-alpha.x',
  6: '>= 2.0.0-beta.1',
  7: '>= 4.0.0'
};

exports.REVISION_CHANGES = REVISION_CHANGES;
var objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials, decorators) {
  this.helpers = helpers || {};
  this.partials = partials || {};
  this.decorators = decorators || {};

  _helpers.registerDefaultHelpers(this);
  _decorators.registerDefaultDecorators(this);
}

HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: _logger2['default'],
  log: _logger2['default'].log,

  registerHelper: function registerHelper(name, fn) {
    if (_utils.toString.call(name) === objectType) {
      if (fn) {
        throw new _exception2['default']('Arg not supported with multiple helpers');
      }
      _utils.extend(this.helpers, name);
    } else {
      this.helpers[name] = fn;
    }
  },
  unregisterHelper: function unregisterHelper(name) {
    delete this.helpers[name];
  },

  registerPartial: function registerPartial(name, partial) {
    if (_utils.toString.call(name) === objectType) {
      _utils.extend(this.partials, name);
    } else {
      if (typeof partial === 'undefined') {
        throw new _exception2['default']('Attempting to register a partial called "' + name + '" as undefined');
      }
      this.partials[name] = partial;
    }
  },
  unregisterPartial: function unregisterPartial(name) {
    delete this.partials[name];
  },

  registerDecorator: function registerDecorator(name, fn) {
    if (_utils.toString.call(name) === objectType) {
      if (fn) {
        throw new _exception2['default']('Arg not supported with multiple decorators');
      }
      _utils.extend(this.decorators, name);
    } else {
      this.decorators[name] = fn;
    }
  },
  unregisterDecorator: function unregisterDecorator(name) {
    delete this.decorators[name];
  }
};

var log = _logger2['default'].log;

exports.log = log;
exports.createFrame = _utils.createFrame;
exports.logger = _logger2['default'];


},{"./decorators":4,"./exception":6,"./helpers":7,"./logger":15,"./utils":19}],4:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.registerDefaultDecorators = registerDefaultDecorators;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _decoratorsInline = require('./decorators/inline');

var _decoratorsInline2 = _interopRequireDefault(_decoratorsInline);

function registerDefaultDecorators(instance) {
  _decoratorsInline2['default'](instance);
}


},{"./decorators/inline":5}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerDecorator('inline', function (fn, props, container, options) {
    var ret = fn;
    if (!props.partials) {
      props.partials = {};
      ret = function (context, options) {
        // Create a new partials stack frame prior to exec.
        var original = container.partials;
        container.partials = _utils.extend({}, original, props.partials);
        var ret = fn(context, options);
        container.partials = original;
        return ret;
      };
    }

    props.partials[options.args[0]] = options.fn;

    return ret;
  });
};

module.exports = exports['default'];


},{"../utils":19}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var loc = node && node.loc,
      line = undefined,
      column = undefined;
  if (loc) {
    line = loc.start.line;
    column = loc.start.column;

    message += ' - ' + line + ':' + column;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  /* istanbul ignore else */
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, Exception);
  }

  if (loc) {
    this.lineNumber = line;
    this.column = column;
  }
}

Exception.prototype = new Error();

exports['default'] = Exception;
module.exports = exports['default'];


},{}],7:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.registerDefaultHelpers = registerDefaultHelpers;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _helpersBlockHelperMissing = require('./helpers/block-helper-missing');

var _helpersBlockHelperMissing2 = _interopRequireDefault(_helpersBlockHelperMissing);

var _helpersEach = require('./helpers/each');

var _helpersEach2 = _interopRequireDefault(_helpersEach);

var _helpersHelperMissing = require('./helpers/helper-missing');

var _helpersHelperMissing2 = _interopRequireDefault(_helpersHelperMissing);

var _helpersIf = require('./helpers/if');

var _helpersIf2 = _interopRequireDefault(_helpersIf);

var _helpersLog = require('./helpers/log');

var _helpersLog2 = _interopRequireDefault(_helpersLog);

var _helpersLookup = require('./helpers/lookup');

var _helpersLookup2 = _interopRequireDefault(_helpersLookup);

var _helpersWith = require('./helpers/with');

var _helpersWith2 = _interopRequireDefault(_helpersWith);

function registerDefaultHelpers(instance) {
  _helpersBlockHelperMissing2['default'](instance);
  _helpersEach2['default'](instance);
  _helpersHelperMissing2['default'](instance);
  _helpersIf2['default'](instance);
  _helpersLog2['default'](instance);
  _helpersLookup2['default'](instance);
  _helpersWith2['default'](instance);
}


},{"./helpers/block-helper-missing":8,"./helpers/each":9,"./helpers/helper-missing":10,"./helpers/if":11,"./helpers/log":12,"./helpers/lookup":13,"./helpers/with":14}],8:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerHelper('blockHelperMissing', function (context, options) {
    var inverse = options.inverse,
        fn = options.fn;

    if (context === true) {
      return fn(this);
    } else if (context === false || context == null) {
      return inverse(this);
    } else if (_utils.isArray(context)) {
      if (context.length > 0) {
        if (options.ids) {
          options.ids = [options.name];
        }

        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      if (options.data && options.ids) {
        var data = _utils.createFrame(options.data);
        data.contextPath = _utils.appendContextPath(options.data.contextPath, options.name);
        options = { data: data };
      }

      return fn(context, options);
    }
  });
};

module.exports = exports['default'];


},{"../utils":19}],9:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('../utils');

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

exports['default'] = function (instance) {
  instance.registerHelper('each', function (context, options) {
    if (!options) {
      throw new _exception2['default']('Must pass iterator to #each');
    }

    var fn = options.fn,
        inverse = options.inverse,
        i = 0,
        ret = '',
        data = undefined,
        contextPath = undefined;

    if (options.data && options.ids) {
      contextPath = _utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
    }

    if (_utils.isFunction(context)) {
      context = context.call(this);
    }

    if (options.data) {
      data = _utils.createFrame(options.data);
    }

    function execIteration(field, index, last) {
      if (data) {
        data.key = field;
        data.index = index;
        data.first = index === 0;
        data.last = !!last;

        if (contextPath) {
          data.contextPath = contextPath + field;
        }
      }

      ret = ret + fn(context[field], {
        data: data,
        blockParams: _utils.blockParams([context[field], field], [contextPath + field, null])
      });
    }

    if (context && typeof context === 'object') {
      if (_utils.isArray(context)) {
        for (var j = context.length; i < j; i++) {
          if (i in context) {
            execIteration(i, i, i === context.length - 1);
          }
        }
      } else {
        var priorKey = undefined;

        for (var key in context) {
          if (context.hasOwnProperty(key)) {
            // We're running the iterations one step out of sync so we can detect
            // the last iteration without have to scan the object twice and create
            // an itermediate keys array.
            if (priorKey !== undefined) {
              execIteration(priorKey, i - 1);
            }
            priorKey = key;
            i++;
          }
        }
        if (priorKey !== undefined) {
          execIteration(priorKey, i - 1, true);
        }
      }
    }

    if (i === 0) {
      ret = inverse(this);
    }

    return ret;
  });
};

module.exports = exports['default'];


},{"../exception":6,"../utils":19}],10:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

exports['default'] = function (instance) {
  instance.registerHelper('helperMissing', function () /* [args, ]options */{
    if (arguments.length === 1) {
      // A missing field in a {{foo}} construct.
      return undefined;
    } else {
      // Someone is actually trying to call something, blow up.
      throw new _exception2['default']('Missing helper: "' + arguments[arguments.length - 1].name + '"');
    }
  });
};

module.exports = exports['default'];


},{"../exception":6}],11:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerHelper('if', function (conditional, options) {
    if (_utils.isFunction(conditional)) {
      conditional = conditional.call(this);
    }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if (!options.hash.includeZero && !conditional || _utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function (conditional, options) {
    return instance.helpers['if'].call(this, conditional, { fn: options.inverse, inverse: options.fn, hash: options.hash });
  });
};

module.exports = exports['default'];


},{"../utils":19}],12:[function(require,module,exports){
'use strict';

exports.__esModule = true;

exports['default'] = function (instance) {
  instance.registerHelper('log', function () /* message, options */{
    var args = [undefined],
        options = arguments[arguments.length - 1];
    for (var i = 0; i < arguments.length - 1; i++) {
      args.push(arguments[i]);
    }

    var level = 1;
    if (options.hash.level != null) {
      level = options.hash.level;
    } else if (options.data && options.data.level != null) {
      level = options.data.level;
    }
    args[0] = level;

    instance.log.apply(instance, args);
  });
};

module.exports = exports['default'];


},{}],13:[function(require,module,exports){
'use strict';

exports.__esModule = true;

exports['default'] = function (instance) {
  instance.registerHelper('lookup', function (obj, field) {
    return obj && obj[field];
  });
};

module.exports = exports['default'];


},{}],14:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerHelper('with', function (context, options) {
    if (_utils.isFunction(context)) {
      context = context.call(this);
    }

    var fn = options.fn;

    if (!_utils.isEmpty(context)) {
      var data = options.data;
      if (options.data && options.ids) {
        data = _utils.createFrame(options.data);
        data.contextPath = _utils.appendContextPath(options.data.contextPath, options.ids[0]);
      }

      return fn(context, {
        data: data,
        blockParams: _utils.blockParams([context], [data && data.contextPath])
      });
    } else {
      return options.inverse(this);
    }
  });
};

module.exports = exports['default'];


},{"../utils":19}],15:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('./utils');

var logger = {
  methodMap: ['debug', 'info', 'warn', 'error'],
  level: 'info',

  // Maps a given level value to the `methodMap` indexes above.
  lookupLevel: function lookupLevel(level) {
    if (typeof level === 'string') {
      var levelMap = _utils.indexOf(logger.methodMap, level.toLowerCase());
      if (levelMap >= 0) {
        level = levelMap;
      } else {
        level = parseInt(level, 10);
      }
    }

    return level;
  },

  // Can be overridden in the host environment
  log: function log(level) {
    level = logger.lookupLevel(level);

    if (typeof console !== 'undefined' && logger.lookupLevel(logger.level) <= level) {
      var method = logger.methodMap[level];
      if (!console[method]) {
        // eslint-disable-line no-console
        method = 'log';
      }

      for (var _len = arguments.length, message = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        message[_key - 1] = arguments[_key];
      }

      console[method].apply(console, message); // eslint-disable-line no-console
    }
  }
};

exports['default'] = logger;
module.exports = exports['default'];


},{"./utils":19}],16:[function(require,module,exports){
(function (global){
/* global window */
'use strict';

exports.__esModule = true;

exports['default'] = function (Handlebars) {
  /* istanbul ignore next */
  var root = typeof global !== 'undefined' ? global : window,
      $Handlebars = root.Handlebars;
  /* istanbul ignore next */
  Handlebars.noConflict = function () {
    if (root.Handlebars === Handlebars) {
      root.Handlebars = $Handlebars;
    }
    return Handlebars;
  };
};

module.exports = exports['default'];


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],17:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.checkRevision = checkRevision;
exports.template = template;
exports.wrapProgram = wrapProgram;
exports.resolvePartial = resolvePartial;
exports.invokePartial = invokePartial;
exports.noop = noop;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _utils = require('./utils');

var Utils = _interopRequireWildcard(_utils);

var _exception = require('./exception');

var _exception2 = _interopRequireDefault(_exception);

var _base = require('./base');

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = _base.COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = _base.REVISION_CHANGES[currentRevision],
          compilerVersions = _base.REVISION_CHANGES[compilerRevision];
      throw new _exception2['default']('Template was precompiled with an older version of Handlebars than the current runtime. ' + 'Please update your precompiler to a newer version (' + runtimeVersions + ') or downgrade your runtime to an older version (' + compilerVersions + ').');
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new _exception2['default']('Template was precompiled with a newer version of Handlebars than the current runtime. ' + 'Please update your runtime to a newer version (' + compilerInfo[1] + ').');
    }
  }
}

function template(templateSpec, env) {
  /* istanbul ignore next */
  if (!env) {
    throw new _exception2['default']('No environment passed to template');
  }
  if (!templateSpec || !templateSpec.main) {
    throw new _exception2['default']('Unknown template object: ' + typeof templateSpec);
  }

  templateSpec.main.decorator = templateSpec.main_d;

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  env.VM.checkRevision(templateSpec.compiler);

  function invokePartialWrapper(partial, context, options) {
    if (options.hash) {
      context = Utils.extend({}, context, options.hash);
      if (options.ids) {
        options.ids[0] = true;
      }
    }

    partial = env.VM.resolvePartial.call(this, partial, context, options);
    var result = env.VM.invokePartial.call(this, partial, context, options);

    if (result == null && env.compile) {
      options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
      result = options.partials[options.name](context, options);
    }
    if (result != null) {
      if (options.indent) {
        var lines = result.split('\n');
        for (var i = 0, l = lines.length; i < l; i++) {
          if (!lines[i] && i + 1 === l) {
            break;
          }

          lines[i] = options.indent + lines[i];
        }
        result = lines.join('\n');
      }
      return result;
    } else {
      throw new _exception2['default']('The partial ' + options.name + ' could not be compiled when running in runtime-only mode');
    }
  }

  // Just add water
  var container = {
    strict: function strict(obj, name) {
      if (!(name in obj)) {
        throw new _exception2['default']('"' + name + '" not defined in ' + obj);
      }
      return obj[name];
    },
    lookup: function lookup(depths, name) {
      var len = depths.length;
      for (var i = 0; i < len; i++) {
        if (depths[i] && depths[i][name] != null) {
          return depths[i][name];
        }
      }
    },
    lambda: function lambda(current, context) {
      return typeof current === 'function' ? current.call(context) : current;
    },

    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,

    fn: function fn(i) {
      var ret = templateSpec[i];
      ret.decorator = templateSpec[i + '_d'];
      return ret;
    },

    programs: [],
    program: function program(i, data, declaredBlockParams, blockParams, depths) {
      var programWrapper = this.programs[i],
          fn = this.fn(i);
      if (data || depths || blockParams || declaredBlockParams) {
        programWrapper = wrapProgram(this, i, fn, data, declaredBlockParams, blockParams, depths);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = wrapProgram(this, i, fn);
      }
      return programWrapper;
    },

    data: function data(value, depth) {
      while (value && depth--) {
        value = value._parent;
      }
      return value;
    },
    merge: function merge(param, common) {
      var obj = param || common;

      if (param && common && param !== common) {
        obj = Utils.extend({}, common, param);
      }

      return obj;
    },

    noop: env.VM.noop,
    compilerInfo: templateSpec.compiler
  };

  function ret(context) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var data = options.data;

    ret._setup(options);
    if (!options.partial && templateSpec.useData) {
      data = initData(context, data);
    }
    var depths = undefined,
        blockParams = templateSpec.useBlockParams ? [] : undefined;
    if (templateSpec.useDepths) {
      if (options.depths) {
        depths = context !== options.depths[0] ? [context].concat(options.depths) : options.depths;
      } else {
        depths = [context];
      }
    }

    function main(context /*, options*/) {
      return '' + templateSpec.main(container, context, container.helpers, container.partials, data, blockParams, depths);
    }
    main = executeDecorators(templateSpec.main, main, container, options.depths || [], data, blockParams);
    return main(context, options);
  }
  ret.isTop = true;

  ret._setup = function (options) {
    if (!options.partial) {
      container.helpers = container.merge(options.helpers, env.helpers);

      if (templateSpec.usePartial) {
        container.partials = container.merge(options.partials, env.partials);
      }
      if (templateSpec.usePartial || templateSpec.useDecorators) {
        container.decorators = container.merge(options.decorators, env.decorators);
      }
    } else {
      container.helpers = options.helpers;
      container.partials = options.partials;
      container.decorators = options.decorators;
    }
  };

  ret._child = function (i, data, blockParams, depths) {
    if (templateSpec.useBlockParams && !blockParams) {
      throw new _exception2['default']('must pass block params');
    }
    if (templateSpec.useDepths && !depths) {
      throw new _exception2['default']('must pass parent depths');
    }

    return wrapProgram(container, i, templateSpec[i], data, 0, blockParams, depths);
  };
  return ret;
}

function wrapProgram(container, i, fn, data, declaredBlockParams, blockParams, depths) {
  function prog(context) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var currentDepths = depths;
    if (depths && context !== depths[0]) {
      currentDepths = [context].concat(depths);
    }

    return fn(container, context, container.helpers, container.partials, options.data || data, blockParams && [options.blockParams].concat(blockParams), currentDepths);
  }

  prog = executeDecorators(fn, prog, container, depths, data, blockParams);

  prog.program = i;
  prog.depth = depths ? depths.length : 0;
  prog.blockParams = declaredBlockParams || 0;
  return prog;
}

function resolvePartial(partial, context, options) {
  if (!partial) {
    if (options.name === '@partial-block') {
      partial = options.data['partial-block'];
    } else {
      partial = options.partials[options.name];
    }
  } else if (!partial.call && !options.name) {
    // This is a dynamic partial that returned a string
    options.name = partial;
    partial = options.partials[partial];
  }
  return partial;
}

function invokePartial(partial, context, options) {
  options.partial = true;
  if (options.ids) {
    options.data.contextPath = options.ids[0] || options.data.contextPath;
  }

  var partialBlock = undefined;
  if (options.fn && options.fn !== noop) {
    options.data = _base.createFrame(options.data);
    partialBlock = options.data['partial-block'] = options.fn;

    if (partialBlock.partials) {
      options.partials = Utils.extend({}, options.partials, partialBlock.partials);
    }
  }

  if (partial === undefined && partialBlock) {
    partial = partialBlock;
  }

  if (partial === undefined) {
    throw new _exception2['default']('The partial ' + options.name + ' could not be found');
  } else if (partial instanceof Function) {
    return partial(context, options);
  }
}

function noop() {
  return '';
}

function initData(context, data) {
  if (!data || !('root' in data)) {
    data = data ? _base.createFrame(data) : {};
    data.root = context;
  }
  return data;
}

function executeDecorators(fn, prog, container, depths, data, blockParams) {
  if (fn.decorator) {
    var props = {};
    prog = fn.decorator(prog, props, container, depths && depths[0], data, blockParams, depths);
    Utils.extend(prog, props);
  }
  return prog;
}


},{"./base":3,"./exception":6,"./utils":19}],18:[function(require,module,exports){
// Build out our basic SafeString type
'use strict';

exports.__esModule = true;
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
  return '' + this.string;
};

exports['default'] = SafeString;
module.exports = exports['default'];


},{}],19:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.extend = extend;
exports.indexOf = indexOf;
exports.escapeExpression = escapeExpression;
exports.isEmpty = isEmpty;
exports.createFrame = createFrame;
exports.blockParams = blockParams;
exports.appendContextPath = appendContextPath;
var escape = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

var badChars = /[&<>"'`=]/g,
    possible = /[&<>"'`=]/;

function escapeChar(chr) {
  return escape[chr];
}

function extend(obj /* , ...source */) {
  for (var i = 1; i < arguments.length; i++) {
    for (var key in arguments[i]) {
      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
        obj[key] = arguments[i][key];
      }
    }
  }

  return obj;
}

var toString = Object.prototype.toString;

exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
/* eslint-disable func-style */
var isFunction = function isFunction(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
/* istanbul ignore next */
if (isFunction(/x/)) {
  exports.isFunction = isFunction = function (value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
exports.isFunction = isFunction;

/* eslint-enable func-style */

/* istanbul ignore next */
var isArray = Array.isArray || function (value) {
  return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
};

exports.isArray = isArray;
// Older IE versions do not directly support indexOf so we must implement our own, sadly.

function indexOf(array, value) {
  for (var i = 0, len = array.length; i < len; i++) {
    if (array[i] === value) {
      return i;
    }
  }
  return -1;
}

function escapeExpression(string) {
  if (typeof string !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string == null) {
      return '';
    } else if (!string) {
      return string + '';
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = '' + string;
  }

  if (!possible.test(string)) {
    return string;
  }
  return string.replace(badChars, escapeChar);
}

function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

function createFrame(object) {
  var frame = extend({}, object);
  frame._parent = object;
  return frame;
}

function blockParams(params, ids) {
  params.path = ids;
  return params;
}

function appendContextPath(contextPath, id) {
  return (contextPath ? contextPath + '.' : '') + id;
}


},{}],20:[function(require,module,exports){
// Create a simple path alias to allow browserify to resolve
// the runtime on a supported path.
module.exports = require('./dist/cjs/handlebars.runtime')['default'];

},{"./dist/cjs/handlebars.runtime":2}],21:[function(require,module,exports){
module.exports = require("handlebars/runtime")["default"];

},{"handlebars/runtime":20}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _modelsCurrentUser = require('./models/CurrentUser');

var _partialsAudioPlayerView = require('./partials/AudioPlayerView');

var _router = require('./router');

var _router2 = _interopRequireDefault(_router);

var _polyfillJs = require('./polyfill.js');

var _polyfillJs2 = _interopRequireDefault(_polyfillJs);

$ = require('jquery');

var Application = (function () {
    function Application() {
        _classCallCheck(this, Application);

        this.router = null;
    }

    _createClass(Application, [{
        key: 'initialize',
        value: function initialize() {
            var _this = this;

            _polyfillJs2['default'].install();
            _backbone2['default'].$ = $;

            this.router = new _router2['default']();
            this.redirectUrlClicksToRouter();

            var audioPlayer = new _partialsAudioPlayerView.AudioPlayerView({ el: '#audio-player' });

            // load user
            new _modelsCurrentUser.CurrentUserModel().fetch().then(function (model) {
                return _this.onUserAuthenticated(model);
            }, function (response) {
                return _this.onUserAuthFail(response);
            });
        }
    }, {
        key: 'redirectUrlClicksToRouter',
        value: function redirectUrlClicksToRouter() {
            // Use delegation to avoid initial DOM selection and allow all matching elements to bubble
            $(document).delegate("a", "click", function (evt) {
                // Get the anchor href and protcol
                var href = $(this).attr("href");
                var protocol = this.protocol + "//";

                var openLinkInTab = false;

                if (href == null) {
                    // no url specified, don't do anything.
                    return;
                }

                // special cases that we want to hit the server
                if (href == "/auth") {
                    return;
                }

                // Ensure the protocol is not part of URL, meaning its relative.
                // Stop the event bubbling to ensure the link will not cause a page refresh.
                if (!openLinkInTab && href.slice(protocol.length) !== protocol) {
                    evt.preventDefault();

                    // Note by using Backbone.history.navigate, router events will not be
                    // triggered.  If this is a problem, change this to navigate on your
                    // router.
                    _backbone2['default'].history.navigate(href, true);
                }
            });
        }
    }, {
        key: 'onUserAuthFail',
        value: function onUserAuthFail(response) {
            // user not authenticated
            if (response.status == 401) {}

            this.router.setUser(null);
            this.startRouterNavigation();
        }
    }, {
        key: 'onUserAuthenticated',
        value: function onUserAuthenticated(user) {
            console.log("Loaded current user", user);
            this.router.setUser(user);
            this.startRouterNavigation();
        }
    }, {
        key: 'startRouterNavigation',
        value: function startRouterNavigation() {
            _backbone2['default'].history.start({ pushState: true, hashChange: false });
            //if (!Backbone.history.start({pushState: true, hashChange: false})) router.navigate('404', {trigger: true});
        }
    }]);

    return Application;
})();

exports['default'] = Application;
var app = new Application();

exports.app = app;
$(function () {
    // setup raven to push messages to our sentry
    //Raven.config('https://db2a7d58107c4975ae7de736a6308a1e@app.getsentry.com/53456', {
    //    whitelistUrls: ['staging.couchpod.com', 'couchpod.com'] // production only
    //}).install()

    window.app = app;
    app.initialize();

    // for production, could wrap domReadyCallback and let raven handle any exceptions

    /*
     try {
     domReadyCallback();
     } catch(err) {
     Raven.captureException(err);
     console.log("[Error] Unhandled Exception was caught and sent via Raven:");
     console.dir(err);
     }
     */
});

},{"./models/CurrentUser":25,"./partials/AudioPlayerView":45,"./polyfill.js":50,"./router":52,"backbone":"backbone","jquery":"jquery"}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var AudioCapture = (function () {
    function AudioCapture(microphoneMediaStream) {
        _classCallCheck(this, AudioCapture);

        // spawn background worker
        this._encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

        console.log("Initialized AudioCapture");

        this._audioContext = null;
        this._audioInput = null;
        this._encodingWorker = null;
        this._isRecording = false;
        this._audioListener = null;
        this._onCaptureCompleteCallback = null;
        this._audioAnalyzer = null;
        this._audioGain = null;
        this._cachedMediaStream = microphoneMediaStream;

        this._audioEncoder = null;
        this._latestAudioBuffer = [];
        this._cachedGainValue = 1;
        this._onStartedCallback = null;

        this._fftSize = 256;
        this._fftSmoothing = 0.8;
        this._totalNumSamples = 0;
    }

    /*
    // unused at the moment
    function Analyzer() {
    
        var _audioCanvasAnimationId,
            _audioSpectrumCanvas
            ;
    
        this.startAnalyzerUpdates = function () {
            updateAnalyzer();
        };
    
        this.stopAnalyzerUpdates = function () {
            if (!_audioCanvasAnimationId)
                return;
    
            window.cancelAnimationFrame(_audioCanvasAnimationId);
            _audioCanvasAnimationId = null;
        };
    
        function updateAnalyzer() {
    
            if (!_audioSpectrumCanvas)
                _audioSpectrumCanvas = document.getElementById("recording-visualizer").getContext("2d");
    
            var freqData = new Uint8Array(_audioAnalyzer.frequencyBinCount);
            _audioAnalyzer.getByteFrequencyData(freqData);
    
            var numBars = _audioAnalyzer.frequencyBinCount;
            var barWidth = Math.floor(_canvasWidth / numBars) - _fftBarSpacing;
    
    
            _audioSpectrumCanvas.globalCompositeOperation = "source-over";
    
            _audioSpectrumCanvas.clearRect(0, 0, _canvasWidth, _canvasHeight);
            _audioSpectrumCanvas.fillStyle = '#f6d565';
            _audioSpectrumCanvas.lineCap = 'round';
    
            var x, y, w, h;
    
            for (var i = 0; i < numBars; i++) {
                var value = freqData[i];
                var scaled_value = (value / 256) * _canvasHeight;
    
                x = i * (barWidth + _fftBarSpacing);
                y = _canvasHeight - scaled_value;
                w = barWidth;
                h = scaled_value;
    
                var gradient = _audioSpectrumCanvas.createLinearGradient(x, _canvasHeight, x, y);
                gradient.addColorStop(1.0, "rgba(0,0,0,1.0)");
                gradient.addColorStop(0.0, "rgba(0,0,0,1.0)");
    
                _audioSpectrumCanvas.fillStyle = gradient;
                _audioSpectrumCanvas.fillRect(x, y, w, h);
    
                if (scaled_value > _hitHeights[i]) {
                    _hitVelocities[i] += (scaled_value - _hitHeights[i]) * 6;
                    _hitHeights[i] = scaled_value;
                } else {
                    _hitVelocities[i] -= 4;
                }
    
                _hitHeights[i] += _hitVelocities[i] * 0.016;
    
                if (_hitHeights[i] < 0)
                    _hitHeights[i] = 0;
            }
    
            _audioSpectrumCanvas.globalCompositeOperation = "source-atop";
            _audioSpectrumCanvas.drawImage(_canvasBg, 0, 0);
    
            _audioSpectrumCanvas.globalCompositeOperation = "source-over";
            _audioSpectrumCanvas.fillStyle = "rgba(255,255,255,0.7)";
    
            for (i = 0; i < numBars; i++) {
                x = i * (barWidth + _fftBarSpacing);
                y = _canvasHeight - Math.round(_hitHeights[i]) - 2;
                w = barWidth;
                h = barWidth;
    
                if (_hitHeights[i] === 0)
                    continue;
    
                //_audioSpectrumCanvas.fillStyle = "rgba(255, 255, 255,"+ Math.max(0, 1 - Math.abs(_hitVelocities[i]/150)) + ")";
                _audioSpectrumCanvas.fillRect(x, y, w, h);
            }
    
            _audioCanvasAnimationId = window.requestAnimationFrame(updateAnalyzer);
        }
    
        var _canvasWidth, _canvasHeight;
        var _fftSize = 256;
        var _fftSmoothing = 0.8;
        var _fftBarSpacing = 1;
    
        var _hitHeights = [];
        var _hitVelocities = [];
    
        this.testCanvas = function () {
    
            var canvasContainer = document.getElementById("recording-visualizer");
    
            _canvasWidth = canvasContainer.width;
            _canvasHeight = canvasContainer.height;
    
            _audioSpectrumCanvas = canvasContainer.getContext("2d");
            _audioSpectrumCanvas.globalCompositeOperation = "source-over";
            _audioSpectrumCanvas.fillStyle = "rgba(0,0,0,0)";
            _audioSpectrumCanvas.fillRect(0, 0, _canvasWidth, _canvasHeight);
    
            var numBars = _fftSize / 2;
            var barSpacing = _fftBarSpacing;
            var barWidth = Math.floor(_canvasWidth / numBars) - barSpacing;
    
            var x, y, w, h, i;
    
            for (i = 0; i < numBars; i++) {
                _hitHeights[i] = _canvasHeight - 1;
                _hitVelocities[i] = 0;
            }
    
            for (i = 0; i < numBars; i++) {
                var scaled_value = Math.abs(Math.sin(Math.PI * 6 * (i / numBars))) * _canvasHeight;
    
                x = i * (barWidth + barSpacing);
                y = _canvasHeight - scaled_value;
                w = barWidth;
                h = scaled_value;
    
                var gradient = _audioSpectrumCanvas.createLinearGradient(x, _canvasHeight, x, y);
                gradient.addColorStop(1.0, "rgba(0,0,0,0.0)");
                gradient.addColorStop(0.0, "rgba(0,0,0,1.0)");
    
                _audioSpectrumCanvas.fillStyle = gradient;
                _audioSpectrumCanvas.fillRect(x, y, w, h);
            }
    
            _audioSpectrumCanvas.globalCompositeOperation = "source-atop";
            _audioSpectrumCanvas.drawImage(_canvasBg, 0, 0);
    
            _audioSpectrumCanvas.globalCompositeOperation = "source-over";
            _audioSpectrumCanvas.fillStyle = "#ffffff";
    
            for (i = 0; i < numBars; i++) {
                x = i * (barWidth + barSpacing);
                y = _canvasHeight - _hitHeights[i];
                w = barWidth;
                h = 2;
    
                _audioSpectrumCanvas.fillRect(x, y, w, h);
            }
        };
    
        var _scope = this;
    
        var _canvasBg = new Image();
        _canvasBg.onload = function () {
            _scope.testCanvas();
        };
        //_canvasBg.src = "/img/bg5s.jpg";
        _canvasBg.src = "/img/bg6-wide.jpg";
    }
    */

    _createClass(AudioCapture, [{
        key: "createAudioContext",
        value: function createAudioContext(mediaStream) {
            // build capture graph
            this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this._audioInput = this._audioContext.createMediaStreamSource(mediaStream);
            this._audioDestination = this._audioContext.createMediaStreamDestination();

            console.log("AudioCapture::startManualEncoding(); _audioContext.sampleRate: " + this._audioContext.sampleRate + " Hz");

            // create a listener node to grab microphone samples and feed it to our background worker
            this._audioListener = (this._audioContext.createScriptProcessor || this._audioContext.createJavaScriptNode).call(this._audioContext, 16384, 1, 1);

            console.log("this._cachedGainValue = " + this._cachedGainValue);

            this._audioGain = this._audioContext.createGain();
            this._audioGain.gain.value = this._cachedGainValue;

            //this._audioAnalyzer = this._audioContext.createAnalyser();
            //this._audioAnalyzer.fftSize = this._fftSize;
            //this._audioAnalyzer.smoothingTimeConstant = this._fftSmoothing;
        }
    }, {
        key: "startManualEncoding",
        value: function startManualEncoding(mediaStream) {
            var _this = this;

            if (!this._audioContext) {
                this.createAudioContext(mediaStream);
            }

            if (!this._encodingWorker) this._encodingWorker = new Worker("/assets/js/worker-encoder.min.js");

            // re-hook audio listener node every time we start, because _encodingWorker reference will change
            this._audioListener.onaudioprocess = function (e) {
                if (!_this._isRecording) return;

                var msg = {
                    action: "process",

                    // two Float32Arrays
                    left: e.inputBuffer.getChannelData(0)
                    //right: e.inputBuffer.getChannelData(1)
                };

                //var leftOut = e.outputBuffer.getChannelData(0);
                //for(var i = 0; i < msg.left.length; i++) {
                //    leftOut[i] = msg.left[i];
                //}

                _this._totalNumSamples += msg.left.length;

                _this._encodingWorker.postMessage(msg);
            };

            // handle messages from the encoding-worker
            this._encodingWorker.onmessage = function (e) {

                // worker finished and has the final encoded audio buffer for us
                if (e.data.action === "encoded") {
                    var encoded_blob = new Blob([e.data.buffer], { type: 'audio/ogg' });

                    console.log("e.data.buffer.buffer = " + e.data.buffer.buffer);
                    console.log("e.data.buffer.byteLength = " + e.data.buffer.byteLength);
                    console.log("sampleRate = " + _this._audioContext.sampleRate);
                    console.log("totalNumSamples = " + _this._totalNumSamples);
                    console.log("Duration of recording = " + _this._totalNumSamples / _this._audioContext.sampleRate + " seconds");

                    console.log("got encoded blob: size=" + encoded_blob.size + " type=" + encoded_blob.type);

                    if (_this._onCaptureCompleteCallback) _this._onCaptureCompleteCallback(encoded_blob);

                    // worker has exited, unreference it
                    _this._encodingWorker = null;
                }
            };

            // configure worker with a sampling rate and buffer-size
            this._encodingWorker.postMessage({
                action: "initialize",
                sample_rate: this._audioContext.sampleRate,
                buffer_size: this._audioListener.bufferSize
            });

            // TODO: it might be better to listen for a message back from the background worker before considering that recording has began
            // it's easier to trim audio than capture a missing word at the start of a sentence
            this._isRecording = false;

            // connect audio nodes
            // audio-input -> gain -> fft-analyzer -> PCM-data capture -> destination

            console.log("AudioCapture::startManualEncoding(); Connecting Audio Nodes..");

            console.log("connecting: input->gain");
            this._audioInput.connect(this._audioGain);
            //console.log("connecting: gain->analyzer");
            //this._audioGain.connect(this._audioAnalyzer);
            //console.log("connecting: analyzer->listesner");
            //this._audioAnalyzer.connect(this._audioListener);
            // connect gain directly into listener, bypassing analyzer
            console.log("connecting: gain->listener");
            this._audioGain.connect(this._audioListener);
            console.log("connecting: listener->destination");
            this._audioListener.connect(this._audioDestination);

            return true;
        }
    }, {
        key: "shutdownManualEncoding",
        value: function shutdownManualEncoding() {
            console.log("AudioCapture::shutdownManualEncoding(); Tearing down AudioAPI connections..");

            console.log("disconnecting: listener->destination");
            this._audioListener.disconnect(this._audioDestination);
            //console.log("disconnecting: analyzer->listesner");
            //this._audioAnalyzer.disconnect(this._audioListener);
            //console.log("disconnecting: gain->analyzer");
            //this._audioGain.disconnect(this._audioAnalyzer);
            console.log("disconnecting: gain->listener");
            this._audioGain.disconnect(this._audioListener);
            console.log("disconnecting: input->gain");
            this._audioInput.disconnect(this._audioGain);
        }

        /**
         * The microphone may be live, but it isn't recording. This toggles the actual writing to the capture stream.
         * captureAudioSamples bool indicates whether to record from mic
         */
    }, {
        key: "toggleMicrophoneRecording",
        value: function toggleMicrophoneRecording(captureAudioSamples) {
            this._isRecording = captureAudioSamples;
        }
    }, {
        key: "setGain",
        value: function setGain(gain) {
            if (this._audioGain) this._audioGain.gain.value = gain;

            console.log("setting gain: " + gain);
            this._cachedGainValue = gain;
        }
    }, {
        key: "start",
        value: function start(onStartedCallback) {
            console.log("this._cachedMediaStream", this._cachedMediaStream);
            this.startManualEncoding(this._cachedMediaStream);

            // TODO: might be a good time to start a spectral analyzer

            if (onStartedCallback) onStartedCallback();
        }
    }, {
        key: "stop",
        value: function stop(captureCompleteCallback) {
            this._onCaptureCompleteCallback = captureCompleteCallback;
            this._isRecording = false;

            if (this._audioContext) {
                // stop the manual encoder
                this._encodingWorker.postMessage({ action: "finish" });
                this.shutdownManualEncoding();
            }

            if (this._audioEncoder) {
                // stop the automatic encoder

                if (this._audioEncoder.state !== 'recording') {
                    console.warn("AudioCapture::stop(); _audioEncoder.state != 'recording'");
                }

                this._audioEncoder.requestData();
                this._audioEncoder.stop();
            }

            // TODO: stop any active spectral analysis
        }
    }]);

    return AudioCapture;
})();

exports.AudioCapture = AudioCapture;

},{"underscore":"underscore"}],24:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var CreateRecordingModel = (function (_Backbone$Model) {
    _inherits(CreateRecordingModel, _Backbone$Model);

    _createClass(CreateRecordingModel, [{
        key: 'defaults',
        value: function defaults() {
            return {
                num_recordings: 0,
                recording_time: 0
            };
        }
    }]);

    function CreateRecordingModel(opts) {
        _classCallCheck(this, CreateRecordingModel);

        _get(Object.getPrototypeOf(CreateRecordingModel.prototype), 'constructor', this).call(this, opts);
        //
        //this.defaults = {
        //    num_recordings: 0,
        //    recording_time: 0
        //}

        this.urlRoot = "/api/create_recording";
    }

    return CreateRecordingModel;
})(_backbone2['default'].Model);

exports.CreateRecordingModel = CreateRecordingModel;

},{"backbone":"backbone","underscore":"underscore"}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var CurrentUserModel = (function (_Backbone$Model) {
    _inherits(CurrentUserModel, _Backbone$Model);

    _createClass(CurrentUserModel, [{
        key: "defaults",
        value: function defaults() {
            return {
                username: "",
                profileImage: "",
                createdAt: "",
                id: ""
            };
        }
    }]);

    function CurrentUserModel(props) {
        _classCallCheck(this, CurrentUserModel);

        _get(Object.getPrototypeOf(CurrentUserModel.prototype), "constructor", this).call(this, props);
        this.url = "/api/current_user";
    }

    return CurrentUserModel;
})(_backbone2["default"].Model);

exports.CurrentUserModel = CurrentUserModel;

},{"backbone":"backbone"}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

/**
 * Recording
 * get: recording metadata + calling user's listening status
 * post: create new recording
 * put: update recording metadata
 */

var QuipModel = (function (_Backbone$Model) {
    _inherits(QuipModel, _Backbone$Model);

    _createClass(QuipModel, [{
        key: 'defaults',
        value: function defaults() {
            return {
                id: 0, // guid
                progress: 0, // [0-100] percentage
                position: 0, // seconds
                duration: 0, // seconds
                isPublic: false
            };
        }
    }]);

    function QuipModel(opts) {
        _classCallCheck(this, QuipModel);

        _get(Object.getPrototypeOf(QuipModel.prototype), 'constructor', this).call(this, opts);

        this.urlRoot = "/api/quips";

        // save listening progress at most every 3 seconds
        this.throttledSave = _underscore2['default'].throttle(this.save, 3000);
    }

    return QuipModel;
})(_backbone2['default'].Model);

var MyQuipCollection = (function (_Backbone$Collection) {
    _inherits(MyQuipCollection, _Backbone$Collection);

    function MyQuipCollection(opts) {
        _classCallCheck(this, MyQuipCollection);

        _get(Object.getPrototypeOf(MyQuipCollection.prototype), 'constructor', this).call(this, opts);
        this.model = QuipModel;
        this.url = "/api/quips";
    }

    return MyQuipCollection;
})(_backbone2['default'].Collection);

exports.QuipModel = QuipModel;
exports.MyQuipCollection = MyQuipCollection;

},{"backbone":"backbone","underscore":"underscore"}],27:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<div class=\"changelog\">\n    <h2>Changelog</h2>\n\n    <h3>2016-01-01</h3>\n    <p>\n        Refactored Python and Backbone codebase to be simpler, organized by-feature, more MVCish.\n        Should make it easier and more pleasant to add new features.\n        Took about a month to pay down a lot of existing debt and breathe some new excitement into the codebase.\n    </p>\n    <p>Oh, and started working on Streams/Groups support! :)</p>\n\n    <h3>2015-12-05</h3>\n\n    <p>Dark-theme with unsplash.com bg - because I often work on this late at night.</p>\n\n    <p>More mobile friendly design.</p>\n\n    <p>\n        Stopped trying to get audio-recording to work well on Android 4.x after burneing many weekends and nights.\n        The audio glitches even when recording pure PCM, a problem at the Web Audio level, nothing I can do about it.\n    </p>\n\n    <p>\n        Found a fun workaround mobile chrome's inability to play Web Audio recorded wave files:\n        run the generated blobs through an ajax request, making the blob disk-backed locally, now the local blob\n        can be passed into an &lt;audio&gt; player.\n    </p>\n\n    <p>Focusing on making the mobile listening experience great.</p>\n\n    <h3>2015-10-04</h3>\n\n    <p>Slight facelift, using a new flat style. Added a few animations and this public changelog! :)</p>\n\n    <h3>2015-09-26</h3>\n\n    <p>Designed a logo and created a pretty landing-page with twitter-login.</p>\n\n    <p>Added Sentry for Javascript error collection and Heap Analytics for creating ad-hoc analytics.</p>\n\n    <h3>2015-09-20</h3>\n\n    <p>Setup two new servers on Digital Oceans with Route 53 routing and an SSL certificate for production.\n        Having an SSL certificate means the site can be accessed via HTTPS which allows browsers\n        to cache the Microphone Access permissions, which means you don't have to click \"allow\" every time\n        you want to make a recording!</p>\n\n    <p>Fixed up Python Fabric deployment script to work in new staging + production environments.\n        And added MongoDB backup/restore support.</p>\n\n    <p>Updated Python dependencies, they were over a year old, and fixed code that broke as a result.\n        Mostly around changes to MongoEngine Python lib.</p>\n\n    <h3>2015-09-05</h3>\n\n    <p>Fixed project to work on OSX and without the NGINX dependency. I can now run it all in python,\n        including the static file hosting. The production servers use NGINX for better performance.</p>\n\n    <h3>2014-03-29</h3>\n\n    <p>Request Media Streaming permission from browser on recording-page load. This makes the microphone\n        available the instant you hit the record button. No need to hit record button and then deal with browser's\n        security popups asking for permission to access microphone.</p>\n\n    <p>Removed countdown clock untill recording begins, the \"3-2-1 go\" wasn't that helpful.</p>\n\n    <h3>2014-03-27</h3>\n\n    <p>Fixed bug in tracking where you paused in the playback of a recording. Now you should be able to\n        resume playback exactly where you left off. :)</p>\n\n</div>\n";
},"useData":true});

},{"hbsfy/runtime":21}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _ChangelogViewHbs = require('./ChangelogView.hbs');

var _ChangelogViewHbs2 = _interopRequireDefault(_ChangelogViewHbs);

var ChangelogView = (function (_Backbone$View) {
    _inherits(ChangelogView, _Backbone$View);

    function ChangelogView() {
        _classCallCheck(this, ChangelogView);

        _get(Object.getPrototypeOf(ChangelogView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(ChangelogView, [{
        key: 'initialize',
        value: function initialize() {
            console.log("Initializing changelog view");
            this.render();
        }
    }, {
        key: 'render',
        value: function render() {
            console.log("Rendering changelog view");
            this.$el.html((0, _ChangelogViewHbs2['default'])());
        }
    }]);

    return ChangelogView;
})(_backbone2['default'].View);

exports['default'] = ChangelogView;
module.exports = exports['default'];

},{"./ChangelogView.hbs":27,"backbone":"backbone","underscore":"underscore"}],29:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _Views = require('./Views');

var Views = _interopRequireWildcard(_Views);

var _StreamsStreamControllerJs = require('./Streams/StreamController.js');

var _StreamsStreamControllerJs2 = _interopRequireDefault(_StreamsStreamControllerJs);

var _RecorderRecorderController = require('./Recorder/RecorderController');

var _RecorderRecorderController2 = _interopRequireDefault(_RecorderRecorderController);

var HomeController = function HomeController(presenter) {
    _classCallCheck(this, HomeController);

    presenter.switchView(new Views.HomepageView());
};

exports.HomeController = HomeController;

var UserController = function UserController(presenter, username) {
    _classCallCheck(this, UserController);

    presenter.switchView(new Views.UserPodCollectionView(username));
};

exports.UserController = UserController;

var ChangelogController = function ChangelogController(presenter) {
    _classCallCheck(this, ChangelogController);

    presenter.switchView(new Views.ChangelogView());
};

exports.ChangelogController = ChangelogController;

var SinglePodController = function SinglePodController(presenter, id) {
    _classCallCheck(this, SinglePodController);

    presenter.switchView(new Views.UserPodView(id));
};

exports.SinglePodController = SinglePodController;
exports.StreamController = _StreamsStreamControllerJs2['default'];
exports.RecorderController = _RecorderRecorderController2['default'];

},{"./Recorder/RecorderController":34,"./Streams/StreamController.js":39,"./Views":44}],30:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<div class=\"m-microphone-required\">\n    <h2>Microphone required.</h2>\n</div>\n";
},"useData":true});

},{"hbsfy/runtime":21}],31:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _audioCapture = require('../../audio-capture');

var _modelsCreateRecordingModel = require('../../models/CreateRecordingModel');

var _GetMicrophoneHbs = require('./GetMicrophone.hbs');

var _GetMicrophoneHbs2 = _interopRequireDefault(_GetMicrophoneHbs);

var GetMicrophoneView = (function (_Backbone$View) {
    _inherits(GetMicrophoneView, _Backbone$View);

    function GetMicrophoneView() {
        _classCallCheck(this, GetMicrophoneView);

        _get(Object.getPrototypeOf(GetMicrophoneView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(GetMicrophoneView, [{
        key: 'defaults',
        value: function defaults() {
            return {};
        }
    }, {
        key: 'events',
        value: function events() {
            return {};
        }
    }, {
        key: 'render',
        value: function render() {
            console.log("rendering recorder control");
            this.$el.html((0, _GetMicrophoneHbs2['default'])(this.model.toJSON()));
        }
    }, {
        key: 'build',
        value: function build(model) {
            this.model = model;

            this.audioCapture = new _audioCapture.AudioCapture();

            this.render();

            this.audioPlayer = document.getElementById("recorded-preview");
            if (this.audioPlayer == null) {
                return;
            }

            console.log("can play vorbis: ", !!this.audioPlayer.canPlayType && "" != this.audioPlayer.canPlayType('audio/ogg; codecs="vorbis"'));

            //this.audioPlayer.loop = "loop";
            //this.audioPlayer.autoplay = "autoplay";
            this.audioPlayer.src = "/assets/sounds/beep_short_on.ogg";
            this.audioPlayer.play();

            this.model.on('change:recordingTime', function (model, time) {
                $(".recording-time").text(time);
            });

            // attempt to fetch media-stream on page-load
            this.audioCapture.grabMicrophone(onMicrophoneGranted, onMicrophoneDenied);
        }
    }, {
        key: 'onMicrophoneDenied',
        value: function onMicrophoneDenied() {
            // show screen asking user for permission
        }
    }, {
        key: 'onMicrophoneGranted',
        value: function onMicrophoneGranted() {
            // show recorder
        }
    }, {
        key: 'initialize',
        value: function initialize(options) {
            var _this = this;

            console.log("RecorderView init");
            new _modelsCreateRecordingModel.CreateRecordingModel().fetch().then(function (model) {
                return _this.build(new _modelsCreateRecordingModel.CreateRecordingModel(model));
            });

            // TODO: a pretty advanced but neat feature may be to store a backup copy of a recording locally in case of a crash or user-error
            /*
             // check how much temporary storage space we have. it's a good way to save recording without losing it
             window.webkitStorageInfo.queryUsageAndQuota(
             webkitStorageInfo.TEMPORARY,
             function(used, remaining) {
             var rmb = (remaining / 1024 / 1024).toFixed(4);
             var umb = (used / 1024 / 1024).toFixed(4);
             console.log("Used quota: " + umb + "mb, remaining quota: " + rmb + "mb");
             }, function(e) {
             console.log('Error', e);
             }
             );
              function onErrorInFS() {
             var msg = '';
              switch (e.code) {
             case FileError.QUOTA_EXCEEDED_ERR:
             msg = 'QUOTA_EXCEEDED_ERR';
             break;
             case FileError.NOT_FOUND_ERR:
             msg = 'NOT_FOUND_ERR';
             break;
             case FileError.SECURITY_ERR:
             msg = 'SECURITY_ERR';
             break;
             case FileError.INVALID_MODIFICATION_ERR:
             msg = 'INVALID_MODIFICATION_ERR';
             break;
             case FileError.INVALID_STATE_ERR:
             msg = 'INVALID_STATE_ERR';
             break;
             default:
             msg = 'Unknown Error';
             break;
             }
              console.log('Error: ' + msg);
             }
              window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
              window.requestFileSystem(window.TEMPORARY, 5 * 1024 * 1024, function onSuccess(fs) {
              console.log('opening file');
              fs.root.getFile("test", {create:true}, function(fe) {
              console.log('spawned writer');
              fe.createWriter(function(fw) {
              fw.onwriteend = function(e) {
             console.log('write completed');
             };
              fw.onerror = function(e) {
             console.log('write failed: ' + e.toString());
             };
              console.log('writing blob to file..');
              var blob = new Blob(['yeh this is a test!'], {type: 'text/plain'});
             fw.write(blob);
              }, onErrorInFS);
              }, onErrorInFS);
              }, onErrorInFS);
             */
        }
    }, {
        key: 'toggle',
        value: function toggle(event) {
            if (this.isRecording) {
                this.isRecording = false;
                this.stopRecording();
            } else {
                this.isRecording = true;
                this.startRecording();
            }
        }
    }, {
        key: 'cancelRecording',
        value: function cancelRecording(event) {
            console.log("Recorder::onRecordingCompleted(); canceling recording");
            $("#recorder-full").removeClass("disabled");
            $("#recorder-uploader").addClass("disabled");
            $(".m-recording-container").removeClass("flipped");
            this.audioPlayer.src = "";
            this.model.set('recordingTime', 3);
        }
    }, {
        key: 'uploadRecording',
        value: function uploadRecording(event) {
            console.log("Recorder::onRecordingCompleted(); uploading recording");
            this.audioPlayer.src = "";

            $("#recorder-full").addClass("disabled");
            $("#recorder-uploader").removeClass("disabled");
            $(".m-recording-container").removeClass("flipped");

            var description = $('textarea[name=description]')[0].value;

            var data = new FormData();
            data.append('description', description);
            data.append('isPublic', 1);
            data.append('audio-blob', this.audioBlob);

            // send raw blob and metadata

            // TODO: get a replacement ajax library (maybe patch reqwest to support binary?)
            var xhr = new XMLHttpRequest();
            xhr.open('post', '/recording/create', true);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.upload.onprogress = function (e) {
                var percent = (e.loaded / e.total * 100).toFixed(0) + '%';
                console.log("percentage: " + percent);
                $("#recorder-uploader").find(".bar").css('width', percent);
            };
            xhr.onload = function (e) {
                $("#recorder-uploader").find(".bar").css('width', '100%');
                if (xhr.status == 200) {
                    console.log("Recorder::onRecordingCompleted(); manual xhr successful");
                } else {
                    console.log("Recorder::onRecordingCompleted(); manual xhr error", xhr);
                }
                var result = JSON.parse(xhr.response);
                console.log("xhr.response", xhr.response);
                console.log("result", result);

                if (result.status == "success") {
                    window.location.href = result.url;
                }
            };
            xhr.send(data);
        }
    }, {
        key: 'onRecordingTick',
        value: function onRecordingTick() {
            var timeSpan = parseInt(((new Date().getTime() - this.timerStart) / 1000).toFixed());
            var timeStr = this.IntToTime(timeSpan);
            this.model.set('recordingTime', timeStr);
        }
    }, {
        key: 'onCountdownTick',
        value: function onCountdownTick() {
            if (--this.timerStart > 0) {
                this.model.set('recordingTime', this.timerStart);
            } else {
                console.log("countdown hit zero. begin recording.");
                clearInterval(this.timerId);
                this.model.set('recordingTime', this.IntToTime(0));
                this.onMicRecording();
            }
        }
    }, {
        key: 'startRecording',
        value: function startRecording() {
            var _this2 = this;

            console.log("starting recording");
            this.audioCapture.start(function () {
                return _this2.onMicReady();
            });
        }

        /**
         * Microphone is ready to record. Do a count-down, then signal for input-signal to begin recording
         */
    }, {
        key: 'onMicReady',
        value: function onMicReady() {
            console.log("mic ready to record. do countdown.");
            this.timerStart = 3;
            // run countdown
            //this.timerId = setInterval(this.onCountdownTick.bind(this), 1000);

            // or launch capture immediately
            this.model.set('recordingTime', this.IntToTime(0));
            this.onMicRecording();

            $(".recording-time").addClass("is-visible");
        }
    }, {
        key: 'onMicRecording',
        value: function onMicRecording() {
            var _this3 = this;

            this.timerStart = new Date().getTime();
            this.timerId = setInterval(this.onRecordingTick.bind(this), 1000);
            $(".m-recording-screen").addClass("is-recording");

            console.log("Mic recording started");

            // TODO: the mic capture is already active, so audio buffers are getting built up
            // when toggling this on, we may already be capturing a buffer that has audio prior to the countdown
            // hitting zero. we can do a few things here:
            // 1) figure out how much audio was already captured, and cut it out
            // 2) use a fade-in to cover up that split-second of audio
            // 3) allow the user to edit post-record and clip as they wish (better but more complex option!)
            setTimeout(function () {
                return _this3.audioCapture.toggleMicrophoneRecording(true);
            }, 500);
        }
    }, {
        key: 'stopRecording',
        value: function stopRecording() {
            var _this4 = this;

            console.log("stopping recording");
            clearInterval(this.timerId);

            // play sound immediately to bypass mobile chrome's "user initiated media" requirement
            this.audioPlayer.src = "/assets/sounds/beep_short_on.ogg";
            this.audioPlayer.play();

            this.audioCapture.stop(function (blob) {
                return _this4.onRecordingCompleted(blob);
            });

            $(".recording-time").removeClass("is-visible");
            $(".m-recording-screen").removeClass("is-recording");

            // TODO: animate recorder out
            // TODO: animate uploader in
        }
    }, {
        key: 'onRecordingCompleted',
        value: function onRecordingCompleted(blob) {
            console.log("Recorder::onRecordingCompleted(); previewing recorded audio");
            this.audioBlob = blob;
            this.showCompletionScreen();
        }
    }, {
        key: 'playPreview',
        value: function playPreview() {
            console.log("playing preview..");
            console.log("audio blob", this.audioBlob);
            console.log("audio blob url", this.audioBlobUrl);
            this.audioPlayer.src = this.audioBlobUrl;
            this.audioPlayer.play();
        }
    }, {
        key: 'showCompletionScreen',
        value: function showCompletionScreen() {
            var _this5 = this;

            console.log("Recorder::onRecordingCompleted(); flipping to audio playback");
            this.audioBlobUrl = window.URL.createObjectURL(this.audioBlob);
            $(".m-recording-container").addClass("flipped");

            // HACK: route blob through xhr to let Android Chrome play blobs via <audio>
            var xhr = new XMLHttpRequest();
            xhr.open('GET', this.audioBlobUrl, true);
            xhr.responseType = 'blob';
            xhr.overrideMimeType('audio/ogg');

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4 && xhr.status == 200) {
                    var xhrBlobUrl = window.URL.createObjectURL(xhr.response);

                    console.log("Loaded blob from cache url: " + _this5.audioBlobUrl);
                    console.log("Routed into blob url: " + xhrBlobUrl);

                    _this5.audioPlayer.src = xhrBlobUrl;
                    _this5.audioPlayer.play();
                }
            };
            xhr.send();
        }
    }]);

    return GetMicrophoneView;
})(_backbone2['default'].View);

exports['default'] = GetMicrophoneView;
module.exports = exports['default'];

},{"../../audio-capture":23,"../../models/CreateRecordingModel":24,"./GetMicrophone.hbs":30,"backbone":"backbone","underscore":"underscore"}],32:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MicrophonePermissions = (function () {
    function MicrophonePermissions() {
        _classCallCheck(this, MicrophonePermissions);

        this.microphoneMediaStream = null;
    }

    _createClass(MicrophonePermissions, [{
        key: "haveMicrophone",
        value: function haveMicrophone() {
            return this.microphoneMediaStream != null ? true : false;
        }
    }, {
        key: "setMicrophone",
        value: function setMicrophone(ms) {
            this.microphoneMediaStream = ms;
        }
    }, {
        key: "grabMicrophone",
        value: function grabMicrophone(onMicrophoneGranted, onMicrophoneDenied) {
            var _this = this;

            if (this.haveMicrophone()) {
                onMicrophoneGranted();
                return;
            }

            navigator.mediaDevice.getUserMedia({ audio: true }).then(function (ms) {
                _this.setMicrophone(ms);
                onMicrophoneGranted(ms);
            })["catch"](function (err) {
                console.log("AudioCapture::start(); could not grab microphone. perhaps user didn't give us permission?");
                console.warn(err);
                onMicrophoneDenied(err);
            });
        }
    }]);

    return MicrophonePermissions;
})();

exports["default"] = MicrophonePermissions;
module.exports = exports["default"];

},{}],33:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _partialsQuipViewJs = require('../../partials/QuipView.js');

var _partialsQuipViewJs2 = _interopRequireDefault(_partialsQuipViewJs);

var _partialsAudioPlayerView = require('../../partials/AudioPlayerView');

var _modelsQuip = require('../../models/Quip');

var HomepageView = (function (_Backbone$View) {
    _inherits(HomepageView, _Backbone$View);

    function HomepageView() {
        _classCallCheck(this, HomepageView);

        _get(Object.getPrototypeOf(HomepageView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(HomepageView, [{
        key: 'initialize',
        value: function initialize() {
            var _this = this;

            new _modelsQuip.MyQuipCollection().fetch().then(function (quips) {
                return _this.onQuipsLoaded(quips);
            });
        }
    }, {
        key: 'shutdown',
        value: function shutdown() {
            if (this.quipViews != null) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = this.quipViews[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var quip = _step.value;

                        quip.shutdown();
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator['return']) {
                            _iterator['return']();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            }

            _partialsAudioPlayerView.AudioPlayer.trigger("pause");
        }
    }, {
        key: 'onQuipsLoaded',
        value: function onQuipsLoaded(quips) {
            console.log("loaded quips", quips);

            this.quipViews = [];

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = quips[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var quip = _step2.value;

                    var quipView = new _partialsQuipViewJs2['default']({ model: new _modelsQuip.QuipModel(quip) });
                    this.quipViews.push(quipView);
                    this.$el.append(quipView.el);
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                        _iterator2['return']();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }
        }
    }]);

    return HomepageView;
})(_backbone2['default'].View);

exports['default'] = HomepageView;
module.exports = exports['default'];

},{"../../models/Quip":26,"../../partials/AudioPlayerView":45,"../../partials/QuipView.js":48,"backbone":"backbone"}],34:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _GetMicrophoneMicrophonePermissions = require('../GetMicrophone/MicrophonePermissions');

var _GetMicrophoneMicrophonePermissions2 = _interopRequireDefault(_GetMicrophoneMicrophonePermissions);

var _RecorderView = require('./RecorderView');

var _RecorderView2 = _interopRequireDefault(_RecorderView);

var _GetMicrophoneGetMicrophoneView = require('../GetMicrophone/GetMicrophoneView');

var _GetMicrophoneGetMicrophoneView2 = _interopRequireDefault(_GetMicrophoneGetMicrophoneView);

var RecorderController = (function () {
    function RecorderController(presenter) {
        var _this = this;

        _classCallCheck(this, RecorderController);

        this.presenter = presenter;
        new _GetMicrophoneMicrophonePermissions2['default']().grabMicrophone(function (ms) {
            return _this.onMicrophoneAcquired(ms);
        }, function () {
            return _this.onMicrophoneDenied();
        });
    }

    _createClass(RecorderController, [{
        key: 'onMicrophoneAcquired',
        value: function onMicrophoneAcquired(microphoneMediaStream) {
            this.presenter.switchView(new _RecorderView2['default'](microphoneMediaStream));
        }
    }, {
        key: 'onMicrophoneDenied',
        value: function onMicrophoneDenied() {
            this.presenter.switchView(new _GetMicrophoneGetMicrophoneView2['default']());
        }
    }]);

    return RecorderController;
})();

exports['default'] = RecorderController;
module.exports = exports['default'];

},{"../GetMicrophone/GetMicrophoneView":31,"../GetMicrophone/MicrophonePermissions":32,"./RecorderView":36}],35:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"1":function(container,depth0,helpers,partials,data) {
    return "";
},"3":function(container,depth0,helpers,partials,data) {
    return "        <div class=\"m-recording-motivation\">\n            <h1>Record your first podcast.</h1>\n\n            <p>Takes only 30 seconds.</p>\n        </div>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<audio id=\"recorded-preview\" controls=\"controls\"></audio>\n\n<div class=\"m-quips-sample-listing\">\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.num_recordings : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "</div>\n\n<div class=\"m-recording-container\">\n\n    <div class=\"card\">\n\n        <div id=\"recorder-full\" class=\"m-recording-screen face\">\n            <div title=\"toggle recording\" class=\"recording-toggle\"><i class=\"fa fa-microphone\"></i></div>\n            <div class=\"recording-time\">3</div>\n        </div>\n\n        <div id=\"recorder-uploader\" class=\"m-recording-uploading face disabled\">\n            <div class=\"upload-progress\">\n                <h4>Uploading</h4>\n\n                <div class=\"progress-bar\">\n                    <div class=\"bar\"></div>\n                </div>\n            </div>\n        </div>\n\n        <div id=\"recorder-done\" class=\"m-recording-preview face back\">\n            <h1>Post New Recording</h1>\n            <div class=\"stats\">\n                <i class=\"fa fa-play-circle\"></i>\n                <span class=\"duration\"></span>\n            </div>\n\n            <div class=\"description\">\n                <textarea name=\"description\" placeholder=\"optional description\"></textarea>\n            </div>\n\n            <div class=\"controls\">\n                <a class=\"square-btn btn-primary\" id=\"upload-recording\">Upload</a>\n                <a class=\"square-btn btn-default\" id=\"preview-btn\">Preview</a>\n                <a class=\"square-btn btn-link\" id=\"cancel-recording\">Delete and Try Again</a>\n            </div>\n\n        </div>\n\n    </div>\n\n</div>\n";
},"useData":true});

},{"hbsfy/runtime":21}],36:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _RecorderViewHbs = require('./RecorderView.hbs');

var _RecorderViewHbs2 = _interopRequireDefault(_RecorderViewHbs);

var _partialsQuipViewJs = require('../../partials/QuipView.js');

var _partialsQuipViewJs2 = _interopRequireDefault(_partialsQuipViewJs);

var _audioCapture = require('../../audio-capture');

var _modelsCreateRecordingModel = require('../../models/CreateRecordingModel');

var RecorderView = (function (_Backbone$View) {
    _inherits(RecorderView, _Backbone$View);

    function RecorderView() {
        _classCallCheck(this, RecorderView);

        _get(Object.getPrototypeOf(RecorderView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(RecorderView, [{
        key: 'IntToTime',

        //    el: '.m-recording-container',

        value: function IntToTime(value) {
            var minutes = Math.floor(value / 60);
            var seconds = Math.round(value - minutes * 60);

            return ("00" + minutes).substr(-2) + ":" + ("00" + seconds).substr(-2);
        }
    }, {
        key: 'defaults',
        value: function defaults() {
            return {
                audioCapture: null,
                audioBlob: null,
                audioBlobUrl: null,
                audioPlayer: null,
                isRecording: false,
                timerId: 0,
                timerStart: 3
            };
        }
    }, {
        key: 'events',
        value: function events() {
            return {
                "click .recording-toggle": "toggle",
                "click #cancel-recording": "cancelRecording",
                "click #upload-recording": "uploadRecording",
                "click #preview-btn": "playPreview"
            };
        }
    }, {
        key: 'render',
        value: function render() {
            this.$el.html((0, _RecorderViewHbs2['default'])(this.model.toJSON()));
        }
    }, {
        key: 'build',
        value: function build(model) {
            this.model = model;

            console.log("model", model);

            this.render();

            this.audioPlayer = document.getElementById("recorded-preview");
            if (this.audioPlayer == null) {
                return;
            }

            //console.log("can play vorbis: ", !!this.audioPlayer.canPlayType && "" != this.audioPlayer.canPlayType('audio/ogg; codecs="vorbis"'));

            // play a beep
            this.audioPlayer.src = "/assets/sounds/beep_short_on.ogg";
            this.audioPlayer.play();

            this.model.on('change:recordingTime', function (model, time) {
                $(".recording-time").text(time);
            });
        }
    }, {
        key: 'initialize',
        value: function initialize(microphoneMediaStream) {
            var _this = this;

            this.audioCapture = new _audioCapture.AudioCapture(microphoneMediaStream);

            new _modelsCreateRecordingModel.CreateRecordingModel().fetch().then(function (model) {
                return _this.build(new _modelsCreateRecordingModel.CreateRecordingModel(model));
            });

            // TODO: try using the new fetch() syntax instead of backbone models
            //fetch("/api/create_recording", {credentials: 'include'})
            //    .then(res => res.json())
            //    .then(json => this.switchView(new RecorderView(json)));
        }
    }, {
        key: 'toggle',
        value: function toggle(event) {
            if (this.isRecording) {
                this.isRecording = false;
                this.stopRecording();
            } else {
                this.isRecording = true;
                this.startRecording();
            }
        }
    }, {
        key: 'cancelRecording',
        value: function cancelRecording(event) {
            console.log("Recorder::onRecordingCompleted(); canceling recording");
            $("#recorder-full").removeClass("disabled");
            $("#recorder-uploader").addClass("disabled");
            $(".m-recording-container").removeClass("flipped");
            this.audioPlayer.src = "";
            this.model.set('recordingTime', 3);
        }
    }, {
        key: 'uploadRecording',
        value: function uploadRecording(event) {
            console.log("Recorder::onRecordingCompleted(); uploading recording");
            this.audioPlayer.src = "";

            $("#recorder-full").addClass("disabled");
            $("#recorder-uploader").removeClass("disabled");
            $(".m-recording-container").removeClass("flipped");

            var description = $('textarea[name=description]')[0].value;

            var data = new FormData();
            data.append('description', description);
            data.append('isPublic', 1);
            data.append('audio-blob', this.audioBlob);

            // send raw blob and metadata

            // TODO: get a replacement ajax library (maybe patch reqwest to support binary?)
            var xhr = new XMLHttpRequest();
            xhr.open('post', '/api/quips', true);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.upload.onprogress = function (e) {
                var percent = (e.loaded / e.total * 100).toFixed(0) + '%';
                console.log("percentage: " + percent);
                $("#recorder-uploader").find(".bar").css('width', percent);
            };
            xhr.onload = function (e) {
                $("#recorder-uploader").find(".bar").css('width', '100%');
                if (xhr.status == 200) {
                    console.log("Recorder::onRecordingCompleted(); manual xhr successful");
                } else {
                    console.log("Recorder::onRecordingCompleted(); manual xhr error", xhr);
                }
                var result = JSON.parse(xhr.response);
                console.log("xhr.response", xhr.response);
                console.log("result", result);

                if (result.status == "success") {
                    window.location.href = result.url;
                }
            };
            xhr.send(data);
        }
    }, {
        key: 'onRecordingTick',
        value: function onRecordingTick() {
            var timeSpan = parseInt(((new Date().getTime() - this.timerStart) / 1000).toFixed());
            var timeStr = this.IntToTime(timeSpan);
            this.model.set('recordingTime', timeStr);
        }
    }, {
        key: 'startRecording',
        value: function startRecording() {
            var _this2 = this;

            console.log("starting recording");
            this.audioCapture.start(function () {
                return _this2.onRecordingStarted();
            });
        }

        /**
         * Microphone is ready to record. Do a count-down, then signal for input-signal to begin recording
         */
    }, {
        key: 'onRecordingStarted',
        value: function onRecordingStarted() {
            console.log("mic ready to record. do countdown.");

            // or launch capture immediately
            this.model.set('recordingTime', this.IntToTime(0));
            this.onMicRecording();

            $(".recording-time").addClass("is-visible");
        }
    }, {
        key: 'onMicRecording',
        value: function onMicRecording() {
            var _this3 = this;

            this.timerStart = new Date().getTime();
            this.timerId = setInterval(this.onRecordingTick.bind(this), 1000);
            $(".m-recording-screen").addClass("is-recording");

            console.log("Mic recording started");

            // TODO: the mic capture is already active, so audio buffers are getting built up
            // when toggling this on, we may already be capturing a buffer that has audio prior to the countdown
            // hitting zero. we can do a few things here:
            // 1) figure out how much audio was already captured, and cut it out
            // 2) use a fade-in to cover up that split-second of audio
            // 3) allow the user to edit post-record and clip as they wish (better but more complex option!)
            setTimeout(function () {
                return _this3.audioCapture.toggleMicrophoneRecording(true);
            }, 200);
        }
    }, {
        key: 'stopRecording',
        value: function stopRecording() {
            var _this4 = this;

            console.log("stopping recording");
            clearInterval(this.timerId);

            // play sound immediately to bypass mobile chrome's "user initiated media" requirement
            this.audioPlayer.src = "/assets/sounds/beep_short_off.ogg";
            this.audioPlayer.play();

            // request recording stop
            // wait for sync to complete
            // and then callback transition to next screen
            this.audioCapture.stop(function (blob) {
                return _this4.onRecordingCompleted(blob);
            });

            $(".recording-time").removeClass("is-visible");
            $(".m-recording-screen").removeClass("is-recording");
        }
    }, {
        key: 'onRecordingCompleted',
        value: function onRecordingCompleted(blob) {
            console.log("Recorder::onRecordingCompleted(); previewing recorded audio");
            this.audioBlob = blob;
            this.showCompletionScreen();
        }
    }, {
        key: 'playPreview',
        value: function playPreview() {
            // at this point a playable audio blob should already be loaded in audioPlayer
            // so just play it again
            this.audioPlayer.play();
        }
    }, {
        key: 'showCompletionScreen',
        value: function showCompletionScreen() {
            var _this5 = this;

            console.log("Recorder::onRecordingCompleted(); flipping to audio playback");
            this.audioBlobUrl = window.URL.createObjectURL(this.audioBlob);
            $(".m-recording-container").addClass("flipped");

            this.makeAudioBlobUrlPlayable(this.audioBlobUrl, function (playableAudioBlobUrl) {
                _this5.audioPlayer.src = playableAudioBlobUrl;
                _this5.audioPlayer.play();
            });
        }

        /**
         * HACK: route blob through xhr to let Android Chrome play blobs via <audio>
         * @param audioBlobUrl representing potentially non-disk-backed blob url
         * @param callback function accepts a disk-backed blob url
         */
    }, {
        key: 'makeAudioBlobUrlPlayable',
        value: function makeAudioBlobUrlPlayable(audioBlobUrl, callback) {
            // this request happens over loopback
            var xhr = new XMLHttpRequest();
            xhr.open('GET', audioBlobUrl, true);
            xhr.responseType = 'blob';
            xhr.overrideMimeType('audio/ogg');

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4 && xhr.status == 200) {
                    var xhrBlobUrl = window.URL.createObjectURL(xhr.response);

                    console.log("Loaded blob from cache url: " + audioBlobUrl);
                    console.log("Routed into blob url: " + xhrBlobUrl);

                    callback(xhrBlobUrl);
                }
            };
            xhr.send();
        }
    }]);

    return RecorderView;
})(_backbone2['default'].View);

exports['default'] = RecorderView;
module.exports = exports['default'];

},{"../../audio-capture":23,"../../models/CreateRecordingModel":24,"../../partials/QuipView.js":48,"./RecorderView.hbs":35,"backbone":"backbone","underscore":"underscore"}],37:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <a href=\"/streams/"
    + alias4(((helper = (helper = helpers.id || (depth0 != null ? depth0.id : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"id","hash":{},"data":data}) : helper)))
    + "\" class=\"stream\">\n            "
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "\n        </a>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "<div class=\"m-create-stream\">\n    <form>\n        <input class=\"field\" type=\"text\" name=\"streamName\" placeholder=\"Stream Name\" value=\""
    + container.escapeExpression(((helper = (helper = helpers.streamName || (depth0 != null ? depth0.streamName : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"streamName","hash":{},"data":data}) : helper)))
    + "\"/>\n\n        <h3>Privacy</h3>\n\n        <label for=\"privacy-public\">\n            <input id=\"privacy-public\" type=\"radio\" name=\"privacy\" value=\"public\" checked/>\n            <b>Public</b> - Anyone can follow this stream\n        </label>\n        <br>\n        <label for=\"privacy-private\">\n            <input id=\"privacy-private\" type=\"radio\" name=\"privacy\" value=\"private\"/>\n            <b>Private</b> - Only those you invite can follow this stream.\n        </label>\n        <br>\n        <br>\n\n        <button class=\"square-btn btn-success\" name=\"submit\">Create</button>\n    </form>\n</div>\n\n<div class=\"m-list-streams\">\n    <h3>Streams</h3>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.streams : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"useData":true});

},{"hbsfy/runtime":21}],38:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _CreateStreamHbs = require('./CreateStream.hbs');

var _CreateStreamHbs2 = _interopRequireDefault(_CreateStreamHbs);

require('backbone-bindings');

require('backbone.epoxy');

var StreamModel = (function (_Backbone$Model) {
    _inherits(StreamModel, _Backbone$Model);

    function StreamModel() {
        _classCallCheck(this, StreamModel);

        _get(Object.getPrototypeOf(StreamModel.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(StreamModel, [{
        key: 'defaults',
        value: function defaults() {
            return {
                streamName: "",
                privacy: "public",
                streams: [{
                    id: 1,
                    name: "stream 1"
                }, {
                    id: 2,
                    name: "stream 2"
                }]
            };
        }
    }, {
        key: 'computeds',
        get: function get() {
            return {
                canSubmit: function canSubmit() {
                    return this.get('streamName') != "";
                }
            };
        }
    }]);

    return StreamModel;
})(_backbone2['default'].Model);

var CreateStreamView = (function (_Backbone$Epoxy$View) {
    _inherits(CreateStreamView, _Backbone$Epoxy$View);

    function CreateStreamView() {
        _classCallCheck(this, CreateStreamView);

        _get(Object.getPrototypeOf(CreateStreamView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(CreateStreamView, [{
        key: 'initialize',
        value: function initialize() {
            this.model = new StreamModel();
            this.render();
            this.$el.addClass("stream-details");
        }
    }, {
        key: 'onCreateStream',
        value: function onCreateStream() {
            console.log("this model", this.model.attributes);

            var streamName = this.model.get("streamName");
            var privacy = this.model.get("privacy");

            console.log("Creating new stream named " + streamName + " with privacy = " + privacy);

            return false;
        }
    }, {
        key: 'render',
        value: function render() {
            this.$el.html((0, _CreateStreamHbs2['default'])(this.model.attributes));
        }
    }, {
        key: 'bindings',
        get: function get() {
            return {
                "[name=streamName]": "value:streamName",
                "[name=privacy]": "checked:privacy"
            };
        }
    }, {
        key: 'events',
        get: function get() {
            return {
                "click .m-create-stream button": "onCreateStream"
            };
        }
    }]);

    return CreateStreamView;
})(_backbone2['default'].Epoxy.View);

exports['default'] = CreateStreamView;
module.exports = exports['default'];

},{"./CreateStream.hbs":37,"backbone":"backbone","backbone-bindings":1,"backbone.epoxy":"backbone.epoxy"}],39:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _CreateStream = require('./CreateStream');

var _CreateStream2 = _interopRequireDefault(_CreateStream);

var _StreamDetails = require('./StreamDetails');

var _StreamDetails2 = _interopRequireDefault(_StreamDetails);

var StreamController = (function () {
    function StreamController(presenter) {
        _classCallCheck(this, StreamController);

        this.presenter = presenter;
    }

    _createClass(StreamController, [{
        key: 'create',
        value: function create() {
            this.presenter.switchView(new _CreateStream2['default']());
        }
    }, {
        key: 'details',
        value: function details(id) {
            this.presenter.switchView(new _StreamDetails2['default'](id));
        }
    }]);

    return StreamController;
})();

exports['default'] = StreamController;
module.exports = exports['default'];

},{"./CreateStream":38,"./StreamDetails":41}],40:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<div class=\"m-stream-details\">\n    <form>\n        <h3>Stream Details</h3>\n    </form>\n</div>\n";
},"useData":true});

},{"hbsfy/runtime":21}],41:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _StreamDetailsHbs = require('./StreamDetails.hbs');

var _StreamDetailsHbs2 = _interopRequireDefault(_StreamDetailsHbs);

require('backbone-bindings');

require('backbone.epoxy');

var _modelsQuip = require('../../models/Quip');

var _partialsQuipViewJs = require('../../partials/QuipView.js');

var _partialsQuipViewJs2 = _interopRequireDefault(_partialsQuipViewJs);

var StreamDetailsView = (function (_Backbone$Epoxy$View) {
    _inherits(StreamDetailsView, _Backbone$Epoxy$View);

    function StreamDetailsView() {
        _classCallCheck(this, StreamDetailsView);

        _get(Object.getPrototypeOf(StreamDetailsView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(StreamDetailsView, [{
        key: 'initialize',
        value: function initialize(id) {
            var _this = this;

            //this.model = new StreamModel();
            this.render();
            this.$el.addClass("stream-details");
            new _modelsQuip.MyQuipCollection().fetch().then(function (quips) {
                return _this.onQuipsLoaded(quips);
            });
        }
    }, {
        key: 'onQuipsLoaded',
        value: function onQuipsLoaded(quips) {
            this.quipViews = [];

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = quips[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var quip = _step.value;

                    var quipView = new _partialsQuipViewJs2['default']({ model: new _modelsQuip.QuipModel(quip) });
                    this.quipViews.push(quipView);
                    this.$el.append(quipView.el);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator['return']) {
                        _iterator['return']();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }
    }, {
        key: 'shutdown',
        value: function shutdown() {
            if (this.quipViews != null) {
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = this.quipViews[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var quip = _step2.value;

                        quip.shutdown();
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                            _iterator2['return']();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }
            }
        }
    }, {
        key: 'onCreateStream',

        //"click .m-create-stream button": "onCreateStream",
        value: function onCreateStream() {
            console.log("this model", this.model.attributes);

            var streamName = this.model.get("streamName");
            var privacy = this.model.get("privacy");

            console.log("Creating new stream named " + streamName + " with privacy = " + privacy);

            return false;
        }
    }, {
        key: 'render',
        value: function render() {
            this.$el.html((0, _StreamDetailsHbs2['default'])());
        }
    }, {
        key: 'bindings',
        get: function get() {
            return {
                //"[name=streamName]": "value:streamName",
                //"[name=privacy]": "checked:privacy"
            };
        }
    }, {
        key: 'events',
        get: function get() {
            return {};
        }
    }]);

    return StreamDetailsView;
})(_backbone2['default'].Epoxy.View);

exports['default'] = StreamDetailsView;
module.exports = exports['default'];

},{"../../models/Quip":26,"../../partials/QuipView.js":48,"./StreamDetails.hbs":40,"backbone":"backbone","backbone-bindings":1,"backbone.epoxy":"backbone.epoxy"}],42:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _Views = require('../Views');

var Views = _interopRequireWildcard(_Views);

var _modelsQuip = require('../../models/Quip');

var UserPodCollection = (function (_Backbone$Collection) {
    _inherits(UserPodCollection, _Backbone$Collection);

    function UserPodCollection(username) {
        _classCallCheck(this, UserPodCollection);

        _get(Object.getPrototypeOf(UserPodCollection.prototype), 'constructor', this).call(this);
        this.model = _modelsQuip.QuipModel;
        this.username = username;
    }

    _createClass(UserPodCollection, [{
        key: 'url',
        value: function url() {
            return "/api/u/" + this.username + "/quips";
        }
    }]);

    return UserPodCollection;
})(_backbone2['default'].Collection);

var UserPodCollectionView = (function (_Backbone$View) {
    _inherits(UserPodCollectionView, _Backbone$View);

    function UserPodCollectionView(username) {
        _classCallCheck(this, UserPodCollectionView);

        _get(Object.getPrototypeOf(UserPodCollectionView.prototype), 'constructor', this).call(this, username);
    }

    _createClass(UserPodCollectionView, [{
        key: 'initialize',
        value: function initialize(username) {
            var _this = this;

            new UserPodCollection(username).fetch().then(function (quips) {
                return _this.createChildViews(quips);
            });
        }
    }, {
        key: 'shutdown',
        value: function shutdown() {
            AudioPlayer.pause();
            this.destroyChildViews();
        }
    }, {
        key: 'createChildViews',
        value: function createChildViews(quips) {
            this.quipViews = [];

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = quips[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var quip = _step.value;

                    var quipView = new Views.QuipView({ model: new _modelsQuip.QuipModel(quip) });
                    this.quipViews.push(quipView);
                    this.$el.append(quipView.el);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator['return']) {
                        _iterator['return']();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }
    }, {
        key: 'destroyChildViews',
        value: function destroyChildViews() {
            if (this.quipViews != null) {
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = this.quipViews[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var quip = _step2.value;

                        quip.shutdown();
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                            _iterator2['return']();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }
            }
        }
    }]);

    return UserPodCollectionView;
})(_backbone2['default'].View);

exports.UserPodCollection = UserPodCollection;
exports.UserPodCollectionView = UserPodCollectionView;

},{"../../models/Quip":26,"../Views":44,"backbone":"backbone"}],43:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _Views = require('../Views');

var Views = _interopRequireWildcard(_Views);

var _modelsQuip = require('../../models/Quip');

var UserPodView = (function (_Backbone$View) {
    _inherits(UserPodView, _Backbone$View);

    function UserPodView() {
        _classCallCheck(this, UserPodView);

        _get(Object.getPrototypeOf(UserPodView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(UserPodView, [{
        key: 'initialize',
        value: function initialize(quipId) {
            var _this = this;

            new _modelsQuip.QuipModel({ id: quipId }).fetch().then(function (quip) {
                return _this.createChildViews(quip);
            });
        }
    }, {
        key: 'shutdown',
        value: function shutdown() {
            AudioPlayer.pause();
            this.destroyChildViews();
        }
    }, {
        key: 'createChildViews',
        value: function createChildViews(quip) {
            console.log("loaded single pod", quip);

            this.quipView = new Views.QuipView({ model: new _modelsQuip.QuipModel(quip) });
            this.$el.append(this.quipView.el);
        }
    }, {
        key: 'destroyChildViews',
        value: function destroyChildViews() {
            this.quipView.shutdown();
        }
    }]);

    return UserPodView;
})(_backbone2['default'].View);

exports['default'] = UserPodView;
exports.UserPodView = UserPodView;

},{"../../models/Quip":26,"../Views":44,"backbone":"backbone"}],44:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _ChangelogChangelogView = require('./Changelog/ChangelogView');

var _ChangelogChangelogView2 = _interopRequireDefault(_ChangelogChangelogView);

var _HomepageHomepageView = require('./Homepage/HomepageView');

var _HomepageHomepageView2 = _interopRequireDefault(_HomepageHomepageView);

var _RecorderRecorderView = require('./Recorder/RecorderView');

var _RecorderRecorderView2 = _interopRequireDefault(_RecorderRecorderView);

var _GetMicrophoneGetMicrophoneView = require('./GetMicrophone/GetMicrophoneView');

var _GetMicrophoneGetMicrophoneView2 = _interopRequireDefault(_GetMicrophoneGetMicrophoneView);

var _UserUserSingleRecordingView = require('./User/UserSingleRecordingView');

var _UserUserSingleRecordingView2 = _interopRequireDefault(_UserUserSingleRecordingView);

var _partialsHeaderNavView = require('../partials/HeaderNavView');

var _partialsHeaderNavView2 = _interopRequireDefault(_partialsHeaderNavView);

var _partialsQuipView = require('../partials/QuipView');

var _partialsQuipView2 = _interopRequireDefault(_partialsQuipView);

var _UserUserAllRecordingsView = require('./User/UserAllRecordingsView');

var _partialsAudioPlayerView = require('../partials/AudioPlayerView');

exports.ChangelogView = _ChangelogChangelogView2['default'];
exports.HomepageView = _HomepageHomepageView2['default'];
exports.RecorderView = _RecorderRecorderView2['default'];
exports.GetMicrophoneView = _GetMicrophoneGetMicrophoneView2['default'];
exports.UserPodView = _UserUserSingleRecordingView2['default'];
exports.HeaderNavView = _partialsHeaderNavView2['default'];
exports.QuipView = _partialsQuipView2['default'];
exports.UserPodCollectionView = _UserUserAllRecordingsView.UserPodCollectionView;
exports.AudioPlayerView = _partialsAudioPlayerView.AudioPlayerView;

},{"../partials/AudioPlayerView":45,"../partials/HeaderNavView":47,"../partials/QuipView":48,"./Changelog/ChangelogView":28,"./GetMicrophone/GetMicrophoneView":31,"./Homepage/HomepageView":33,"./Recorder/RecorderView":36,"./User/UserAllRecordingsView":42,"./User/UserSingleRecordingView":43}],45:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var AudioPlayerEvents = (function (_Backbone$Model) {
    _inherits(AudioPlayerEvents, _Backbone$Model);

    function AudioPlayerEvents() {
        _classCallCheck(this, AudioPlayerEvents);

        _get(Object.getPrototypeOf(AudioPlayerEvents.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(AudioPlayerEvents, [{
        key: 'pause',
        value: function pause() {
            this.trigger("pause");
        }
    }]);

    return AudioPlayerEvents;
})(_backbone2['default'].Model);

var AudioPlayer = new AudioPlayerEvents();

exports.AudioPlayer = AudioPlayer;

var AudioPlayerView = (function (_Backbone$View) {
    _inherits(AudioPlayerView, _Backbone$View);

    function AudioPlayerView() {
        _classCallCheck(this, AudioPlayerView);

        _get(Object.getPrototypeOf(AudioPlayerView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(AudioPlayerView, [{
        key: 'defaults',
        value: function defaults() {
            return {
                audioPlayer: null,
                quipModel: null
            };
        }
    }, {
        key: 'initialize',
        value: function initialize() {
            var _this = this;

            console.log("AudioPlayerView initialized");
            this.audioPlayer = document.getElementById("audio-player");
            AudioPlayer.on("toggle", function (quip) {
                return _this.onToggle(quip);
            }, this);
            AudioPlayer.on("pause", function (quip) {
                return _this.pause(quip);
            }, this);

            this.audioPlayer.onpause = function () {
                return _this.onAudioPaused();
            };
        }
    }, {
        key: 'close',
        value: function close() {
            this.stopPeriodicTimer();
        }
    }, {
        key: 'startPeriodicTimer',
        value: function startPeriodicTimer() {
            var _this2 = this;

            if (this.periodicTimer == null) {
                this.periodicTimer = setInterval(function () {
                    return _this2.checkProgress();
                }, 100);
            }
        }
    }, {
        key: 'stopPeriodicTimer',
        value: function stopPeriodicTimer() {
            if (this.periodicTimer != null) {
                clearInterval(this.periodicTimer);
                this.periodicTimer = null;
            }
        }
    }, {
        key: 'checkProgress',
        value: function checkProgress() {
            if (this.quipModel == null) {
                return;
            }

            var progressUpdate = {
                position: this.audioPlayer.currentTime, // sec
                duration: this.audioPlayer.duration, // sec
                progress: 100 * this.audioPlayer.currentTime / this.audioPlayer.duration // %
            };

            AudioPlayer.trigger("/" + this.quipModel.id + "/progress", progressUpdate);
        }
    }, {
        key: 'onToggle',
        value: function onToggle(quipModel) {
            this.quipModel = quipModel;

            if (!this.trackIsLoaded(quipModel.url)) {
                this.loadTrack(quipModel.url);
            }

            if (!this.trackIsLoaded(quipModel.url)) {
                return;
            }

            if (this.audioPlayer.paused) {
                this.play(quipModel);
            } else {
                this.pause(quipModel);
            }
        }
    }, {
        key: 'play',
        value: function play(quipModel) {
            // if at the end of file (200ms fudge), rewind
            if (parseFloat(quipModel.position) > parseFloat(quipModel.duration) - 0.2) {
                console.log("Rewinding audio clip; quipModel.position=" + quipModel.position + " quipModel.duration=" + quipModel.duration);
                quipModel.position = 0;
            }
            this.audioPlayer.currentTime = quipModel.position;
            this.audioPlayer.play();

            AudioPlayer.trigger("/" + quipModel.id + "/playing");
            this.startPeriodicTimer();
        }
    }, {
        key: 'pause',
        value: function pause(quipModel) {
            // request pause
            this.audioPlayer.pause();
        }
    }, {
        key: 'trackIsLoaded',
        value: function trackIsLoaded(url) {
            return ~this.audioPlayer.src.indexOf(url);
        }
    }, {
        key: 'loadTrack',
        value: function loadTrack(url) {
            console.log("Loading audio: " + url);
            this.audioPlayer.src = url;
            this.audioPlayer.load();
        }

        /* Audio element reports pause triggered, treating as end of file */
    }, {
        key: 'onAudioPaused',
        value: function onAudioPaused() {
            this.checkProgress();
            if (this.quipModel != null) {
                AudioPlayer.trigger("/" + this.quipModel.id + "/paused");
            }
            this.stopPeriodicTimer();
        }
    }]);

    return AudioPlayerView;
})(_backbone2['default'].View);

var SoundPlayer = (function () {
    function SoundPlayer() {
        _classCallCheck(this, SoundPlayer);
    }

    _createClass(SoundPlayer, null, [{
        key: 'create',
        value: function create(model) {
            var resumePosition = parseInt(model.get('position') || 0);

            console.log("Creating sound player for model:", model);

            return soundManager.createSound({
                id: model.id,
                url: model.url,
                volume: 100,
                autoLoad: true,
                autoPlay: false,
                from: resumePosition,
                whileloading: function whileloading() {
                    console.log("loaded: " + this.bytesLoaded + " of " + this.bytesTotal);
                },
                onload: function onload() {
                    console.log('Sound; audio loaded; position = ' + resumePosition + ', duration = ' + this.duration);

                    if (this.duration == null || this.duration == 0) {
                        console.log("duration is null");
                        return;
                    }

                    if (resumePosition + 10 > this.duration) {
                        // the track is pretty much complete, loop it
                        // FIXME: this should actually happen earlier, we should know that the action will cause a rewind
                        //        and indicate the rewind visually so there is no surprise
                        resumePosition = 0;
                        console.log('Sound; track needed a rewind');
                    }

                    // FIXME: resume compatibility with various browsers
                    // FIXME: sometimes you resume a file all the way at the end, should loop them around
                    this.setPosition(resumePosition);
                    this.play();
                },
                whileplaying: function whileplaying() {
                    var progress = (this.duration > 0 ? 100 * this.position / this.duration : 0).toFixed(0) + '%';
                    localStorage.setItem("quip:" + this.id + ":progress", progress);
                    localStorage.setItem("quip:" + this.id + ":position", this.position.toFixed(0));
                    model.set({ 'progress': progress });
                },
                onpause: function onpause() {
                    console.log("Sound; paused: " + this.id);
                    var position = this.position ? this.position.toFixed(0) : 0;
                    var progress = (this.duration > 0 ? 100 * position / this.duration : 0).toFixed(0) + '%';
                    localStorage.setItem("quip:" + this.id + ":progress", progress);
                    localStorage.setItem("quip:" + this.id + ":position", position);
                    model.set({ 'progress': progress });
                },
                onfinish: function onfinish() {
                    console.log("Sound; finished playing: " + this.id);

                    // store completion in browser
                    localStorage.setItem("quip:" + this.id + ":progress", '100%');
                    localStorage.setItem("quip:" + this.id + ":position", this.duration.toFixed(0));
                    model.set({ 'progress': '100%' });

                    // TODO: unlock some sort of achievement for finishing this track, mark it a diff color, etc
                    // TODO: this is a good place to fire a hook to a playback manager to move onto the next audio clip
                }
            });
        }
    }]);

    return SoundPlayer;
})();

exports.SoundPlayer = SoundPlayer;
exports.AudioPlayerView = AudioPlayerView;
exports.AudioPlayerEvents = AudioPlayerEvents;

},{"backbone":"backbone","underscore":"underscore"}],46:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <div class=\"nav-right\">\n            <a class=\"btn btn-success\" href=\"/record\">\n                <i class=\"fa fa-microphone\"></i>\n            </a>\n            <a class=\"btn btn-default\" href=\"/u/"
    + alias4(((helper = (helper = helpers.username || (depth0 != null ? depth0.username : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"username","hash":{},"data":data}) : helper)))
    + "\">\n                <img class=\"profile-pic\" src=\"/profile_images"
    + alias4(((helper = (helper = helpers.profileImage || (depth0 != null ? depth0.profileImage : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"profileImage","hash":{},"data":data}) : helper)))
    + "\"/>\n            </a>\n        </div>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "        <a class=\"btn-sign-in\" href=\"/auth\">\n            <i class=\"fa fa-sign-in\"></i> Login with Twitter\n        </a>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<nav class=\"header-nav\">\n    <div class=\"nav-left\">\n        <a class=\"wordmark\" href=\"/changelog\">\n            <strong>Couch</strong>pod\n        </a>\n    </div>\n    <a class=\"btn btn-square\" href=\"/\">\n        <img class=\"btn-logo\" src=\"/assets/img/couchpod-3-tiny.png\"/>\n    </a>\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.username : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "</nav>\n";
},"useData":true});

},{"hbsfy/runtime":21}],47:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _HeaderNavViewHbs = require('./HeaderNavView.hbs');

var _HeaderNavViewHbs2 = _interopRequireDefault(_HeaderNavViewHbs);

var HeaderNavView = (function (_Backbone$View) {
    _inherits(HeaderNavView, _Backbone$View);

    function HeaderNavView() {
        _classCallCheck(this, HeaderNavView);

        _get(Object.getPrototypeOf(HeaderNavView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(HeaderNavView, [{
        key: 'initialize',
        value: function initialize(user) {
            this.model = user;
            this.render();
        }
    }, {
        key: 'render',
        value: function render() {
            console.log("Rendering header nav view");
            this.$el.html((0, _HeaderNavViewHbs2['default'])(this.model));
        }
    }]);

    return HeaderNavView;
})(_backbone2['default'].View);

exports['default'] = HeaderNavView;
module.exports = exports['default'];

},{"./HeaderNavView.hbs":46,"backbone":"backbone"}],48:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _vagueTime = require('vague-time');

var _vagueTime2 = _interopRequireDefault(_vagueTime);

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _AudioPlayerViewJs = require('./AudioPlayerView.js');

var _modelsQuip = require('../models/Quip');

var _RecordingItemHbs = require('./RecordingItem.hbs');

var _RecordingItemHbs2 = _interopRequireDefault(_RecordingItemHbs);

var _app = require('../app');

var _app2 = _interopRequireDefault(_app);

var QuipView = (function (_Backbone$View) {
    _inherits(QuipView, _Backbone$View);

    function QuipView() {
        _classCallCheck(this, QuipView);

        _get(Object.getPrototypeOf(QuipView.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(QuipView, [{
        key: 'delete',
        value: function _delete() {
            this.model.destroy().then(function () {
                return window.app.router.home();
            }, function () {
                return console.log("Delete failed");
            });
        }
    }, {
        key: 'onPause',
        value: function onPause() {
            console.log("QuipView; paused");

            $(this.el).find('.fa-pause').removeClass('fa-pause').addClass('fa-play');
        }
    }, {
        key: 'onPlay',
        value: function onPlay() {
            console.log("QuipView; playing");

            $(this.el).find('.fa-play').removeClass('fa-play').addClass('fa-pause');
        }
    }, {
        key: 'onProgress',
        value: function onProgress(progressUpdate) {
            this.model.set({ 'position': progressUpdate.position }); // sec
            this.model.set({ 'duration': progressUpdate.duration }); // sec
            this.model.set({ 'progress': progressUpdate.progress }); // %
            this.model.throttledSave();
        }
    }, {
        key: 'initialize',
        value: function initialize() {
            var _this = this;

            var id = this.model.get("id");

            _AudioPlayerViewJs.AudioPlayer.on("/" + id + "/paused", function () {
                return _this.onPause();
            }, this);
            _AudioPlayerViewJs.AudioPlayer.on("/" + id + "/playing", function () {
                return _this.onPlay();
            }, this);
            _AudioPlayerViewJs.AudioPlayer.on("/" + id + "/progress", function (update) {
                return _this.onProgress(update);
            }, this);

            this.render();

            // update visuals to indicate playback progress
            this.model.on('change:progress', function (model, progress) {
                $(_this.el).find(".progress-bar").css("width", progress + "%");
            });

            this.model.on('change:isPublic', function (model) {
                _this.render();
            });
        }
    }, {
        key: 'shutdown',
        value: function shutdown() {
            _AudioPlayerViewJs.AudioPlayer.off(null, null, this);
            this.model.off();
        }
    }, {
        key: 'togglePublic',
        value: function togglePublic(ev) {
            var newState = !this.model.get('isPublic');
            this.model.set({ 'isPublic': newState });
            this.model.save();
        }
    }, {
        key: 'togglePlayback',
        value: function togglePlayback(event) {
            _AudioPlayerViewJs.AudioPlayer.trigger("toggle", this.model.attributes);
        }
    }, {
        key: 'render',
        value: function render() {
            var viewModel = this.model.toJSON();
            viewModel.vagueTime = _vagueTime2['default'].get({ from: new Date(), to: new Date(this.model.get("timestamp")) });

            this.$el.html((0, _RecordingItemHbs2['default'])(viewModel));

            this.$el.find(".progress-bar").css("width", this.model.get('progress') + "%");

            return this;
        }
    }, {
        key: 'defaults',
        get: function get() {
            return {
                quipId: 0,
                audioPlayer: null
            };
        }
    }, {
        key: 'events',
        get: function get() {
            return {
                "click .quip-actions .lock-indicator": "togglePublic",
                "click .quip-actions a[action=delete]": "delete",
                "click .quip-player": "togglePlayback"
            };
        }
    }, {
        key: 'tagName',
        get: function get() {
            return 'div';
        }
    }]);

    return QuipView;
})(_backbone2['default'].View);

exports['default'] = QuipView;
module.exports = exports['default'];

},{"../app":22,"../models/Quip":26,"./AudioPlayerView.js":45,"./RecordingItem.hbs":49,"backbone":"backbone","underscore":"underscore","vague-time":"vague-time"}],49:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"1":function(container,depth0,helpers,partials,data) {
    return "            <i class=\"fa fa-unlock\"></i> <span class=\"caption\">Make Private</span>\n";
},"3":function(container,depth0,helpers,partials,data) {
    return "            <i class=\"fa fa-lock\"></i> <span class=\"caption\">Make Public</span>\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "        <a class=\"button\" action=\"delete\" title=\"Delete\">\n            <i class=\"fa fa-remove\"></i> <span class=\"caption\">Delete</span>\n        </a>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"quip\">\n    <div class=\"flex-row\">\n        <div class=\"quip-profile\">\n            <a class=\"btn\" href=\"/u/"
    + alias4(((helper = (helper = helpers.username || (depth0 != null ? depth0.username : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"username","hash":{},"data":data}) : helper)))
    + "\">\n                <img src=\"/profile_images"
    + alias4(((helper = (helper = helpers.profileImage || (depth0 != null ? depth0.profileImage : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"profileImage","hash":{},"data":data}) : helper)))
    + "\"/>\n            </a>\n        </div>\n        <div class=\"quip-details\">\n            <div class=\"flex-row\">\n                <span class=\"name\">"
    + alias4(((helper = (helper = helpers.username || (depth0 != null ? depth0.username : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"username","hash":{},"data":data}) : helper)))
    + "</span>\n                <time>"
    + alias4(((helper = (helper = helpers.vagueTime || (depth0 != null ? depth0.vagueTime : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"vagueTime","hash":{},"data":data}) : helper)))
    + "</time>\n            </div>\n            <div class=\"text\">"
    + alias4(((helper = (helper = helpers.description || (depth0 != null ? depth0.description : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"description","hash":{},"data":data}) : helper)))
    + "</div>\n        </div>\n    </div>\n    <div class=\"quip-player\">\n        <div class=\"progress-bar\"></div>\n        <i class=\"fa fa-play\"></i>\n    </div>\n    <div class=\"quip-actions\">\n        <a class=\"button\" href=\""
    + alias4(((helper = (helper = helpers.publicUrl || (depth0 != null ? depth0.publicUrl : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"publicUrl","hash":{},"data":data}) : helper)))
    + "\" title=\"Share\">\n            <i class=\"fa fa-share-square-o\"></i> <span class=\"caption\">Share</span>\n        </a>\n        <a class=\"button lock-indicator\" title=\"Toggle visibility\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.isPublic : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "        </a>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.isMine : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n</div>\n";
},"useData":true});

},{"hbsfy/runtime":21}],50:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Polyfill = (function () {
    function Polyfill() {
        _classCallCheck(this, Polyfill);
    }

    _createClass(Polyfill, null, [{
        key: "install",
        value: function install() {
            window.AudioContext = window.AudioContext || window.webkitAudioContext || false;
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || false;

            if (navigator.mediaDevice == null) {
                console.log("polyfilling mediaDevice.getUserMedia");

                navigator.mediaDevice = {
                    getUserMedia: function getUserMedia(props) {
                        return new Promise(function (y, n) {
                            return navigator.getUserMedia(props, y, n);
                        });
                    }
                };
            }

            if (!navigator.getUserMedia) {
                console.error("AudioCapture::polyfill(); getUserMedia() not supported.");
                return false;
            }
        }
    }]);

    return Polyfill;
})();

exports["default"] = Polyfill;
module.exports = exports["default"];

},{}],51:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Presenter = (function () {
    function Presenter() {
        _classCallCheck(this, Presenter);
    }

    _createClass(Presenter, [{
        key: "showHeaderNav",
        value: function showHeaderNav(view) {
            $("body > header").append(view.el);
        }
    }, {
        key: "switchView",
        value: function switchView(newView) {
            if (this.view) {
                var oldView = this.view;
                oldView.$el.removeClass("transition-in");
                oldView.$el.addClass("transition-out");
                oldView.$el.one("animationend", function () {
                    oldView.remove();
                    oldView.unbind();
                    if (oldView.shutdown != null) {
                        oldView.shutdown();
                    }
                });
            }

            newView.$el.addClass("transitionable transition-in");
            newView.$el.one("animationend", function () {
                newView.$el.removeClass("transition-in");
            });

            $('#view-container').append(newView.el);
            this.view = newView;
        }
    }]);

    return Presenter;
})();

exports["default"] = Presenter;
var RootPresenter = new Presenter();
exports.RootPresenter = RootPresenter;

},{}],52:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _pagesControllers = require('./pages/Controllers');

var Controllers = _interopRequireWildcard(_pagesControllers);

var _partialsHeaderNavView = require('./partials/HeaderNavView');

var _partialsHeaderNavView2 = _interopRequireDefault(_partialsHeaderNavView);

var _presenter = require('./presenter');

var Router = (function (_Backbone$Router) {
    _inherits(Router, _Backbone$Router);

    function Router() {
        _classCallCheck(this, Router);

        _get(Object.getPrototypeOf(Router.prototype), 'constructor', this).call(this, {
            routes: {
                '': 'home',
                'record': 'record',
                'u/:username': 'user',
                'changelog': 'changelog',
                'q/:quipid': 'single_item',
                'streams': 'list_streams',
                'streams/:id': 'stream_details'
            }
        });
    }

    _createClass(Router, [{
        key: 'setUser',
        value: function setUser(user) {
            _presenter.RootPresenter.showHeaderNav(new _partialsHeaderNavView2['default'](user));
        }
    }, {
        key: 'single_item',
        value: function single_item(id) {
            new Controllers.SinglePodController(_presenter.RootPresenter, id);
        }
    }, {
        key: 'home',
        value: function home() {
            new Controllers.HomeController(_presenter.RootPresenter);
        }
    }, {
        key: 'user',
        value: function user(username) {
            new Controllers.UserController(_presenter.RootPresenter, username);
        }
    }, {
        key: 'changelog',
        value: function changelog() {
            new Controllers.ChangelogController(_presenter.RootPresenter);
        }
    }, {
        key: 'record',
        value: function record() {
            new Controllers.RecorderController(_presenter.RootPresenter);
        }
    }, {
        key: 'list_streams',
        value: function list_streams() {
            var controller = new Controllers.StreamController(_presenter.RootPresenter);
            controller.create();
        }
    }, {
        key: 'stream_details',
        value: function stream_details(id) {
            var controller = new Controllers.StreamController(_presenter.RootPresenter);
            controller.details(id);
        }
    }]);

    return Router;
})(_backbone2['default'].Router);

exports['default'] = Router;
module.exports = exports['default'];

},{"./pages/Controllers":29,"./partials/HeaderNavView":47,"./presenter":51,"backbone":"backbone"}]},{},[22])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmFja2JvbmUtYmluZGluZ3MvYmFja2JvbmUtYmluZGluZ3MuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy5ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2RlY29yYXRvcnMuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9kZWNvcmF0b3JzL2lubGluZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2V4Y2VwdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9oZWxwZXJzL2Jsb2NrLWhlbHBlci1taXNzaW5nLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvaGVscGVycy9lYWNoLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvaGVscGVycy9oZWxwZXItbWlzc2luZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMvaWYuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9oZWxwZXJzL2xvZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMvbG9va3VwLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvaGVscGVycy93aXRoLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvbG9nZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9uby1jb25mbGljdC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9zYWZlLXN0cmluZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9hcHAuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL2F1ZGlvLWNhcHR1cmUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL21vZGVscy9DcmVhdGVSZWNvcmRpbmdNb2RlbC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvbW9kZWxzL0N1cnJlbnRVc2VyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9tb2RlbHMvUXVpcC5qcyIsInNwYS9wYWdlcy9DaGFuZ2Vsb2cvQ2hhbmdlbG9nVmlldy5oYnMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL3BhZ2VzL0NoYW5nZWxvZy9DaGFuZ2Vsb2dWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9Db250cm9sbGVycy5qcyIsInNwYS9wYWdlcy9HZXRNaWNyb3Bob25lL0dldE1pY3JvcGhvbmUuaGJzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9HZXRNaWNyb3Bob25lL0dldE1pY3JvcGhvbmVWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9HZXRNaWNyb3Bob25lL01pY3JvcGhvbmVQZXJtaXNzaW9ucy5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvSG9tZXBhZ2UvSG9tZXBhZ2VWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9SZWNvcmRlci9SZWNvcmRlckNvbnRyb2xsZXIuanMiLCJzcGEvcGFnZXMvUmVjb3JkZXIvUmVjb3JkZXJWaWV3LmhicyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvUmVjb3JkZXIvUmVjb3JkZXJWaWV3LmpzIiwic3BhL3BhZ2VzL1N0cmVhbXMvQ3JlYXRlU3RyZWFtLmhicyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvU3RyZWFtcy9DcmVhdGVTdHJlYW0uanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL3BhZ2VzL1N0cmVhbXMvU3RyZWFtQ29udHJvbGxlci5qcyIsInNwYS9wYWdlcy9TdHJlYW1zL1N0cmVhbURldGFpbHMuaGJzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9TdHJlYW1zL1N0cmVhbURldGFpbHMuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL3BhZ2VzL1VzZXIvVXNlckFsbFJlY29yZGluZ3NWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9Vc2VyL1VzZXJTaW5nbGVSZWNvcmRpbmdWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9WaWV3cy5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFydGlhbHMvQXVkaW9QbGF5ZXJWaWV3LmpzIiwic3BhL3BhcnRpYWxzL0hlYWRlck5hdlZpZXcuaGJzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYXJ0aWFscy9IZWFkZXJOYXZWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYXJ0aWFscy9RdWlwVmlldy5qcyIsInNwYS9wYXJ0aWFscy9SZWNvcmRpbmdJdGVtLmhicyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcG9seWZpbGwuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL3ByZXNlbnRlci5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcm91dGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpXG52YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKVxuXG52YXIgYmluZGluZ1NwbGl0dGVyID0gL14oXFxTKylcXHMqKC4qKSQvO1xuXG5fLmV4dGVuZChCYWNrYm9uZS5WaWV3LnByb3RvdHlwZSwge1xuICAgIGJpbmRNb2RlbDogZnVuY3Rpb24oYmluZGluZ3MpIHtcbiAgICAgICAgLy8gQmluZGluZ3MgY2FuIGJlIGRlZmluZWQgdGhyZWUgZGlmZmVyZW50IHdheXMuIEl0IGNhbiBiZVxuICAgICAgICAvLyBkZWZpbmVkIG9uIHRoZSB2aWV3IGFzIGFuIG9iamVjdCBvciBmdW5jdGlvbiB1bmRlciB0aGUga2V5XG4gICAgICAgIC8vICdiaW5kaW5ncycsIG9yIGFzIGFuIG9iamVjdCBwYXNzZWQgdG8gYmluZE1vZGVsLlxuICAgICAgICBiaW5kaW5ncyA9IGJpbmRpbmdzIHx8IGdldFZhbHVlKHRoaXMsICdiaW5kaW5ncycpO1xuXG4gICAgICAgIC8vIFNraXAgaWYgbm8gYmluZGluZ3MgY2FuIGJlIGZvdW5kIG9yIGlmIHRoZSB2aWV3IGhhcyBubyBtb2RlbC5cbiAgICAgICAgaWYgKCFiaW5kaW5ncyB8fCAhdGhpcy5tb2RlbClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIHByaXZhdGUgYmluZGluZ3MgbWFwIGlmIGl0IGRvZXNuJ3QgZXhpc3QuXG4gICAgICAgIHRoaXMuX2JpbmRpbmdzID0gdGhpcy5fYmluZGluZ3MgfHwge307XG5cbiAgICAgICAgLy8gQ2xlYXIgYW55IHByZXZpb3VzIGJpbmRpbmdzIGZvciB2aWV3LlxuICAgICAgICB0aGlzLnVuYmluZE1vZGVsKCk7XG5cbiAgICAgICAgXy5lYWNoKGJpbmRpbmdzLCBmdW5jdGlvbihhdHRyaWJ1dGUsIGJpbmRpbmcpIHtcbiAgICAgICAgICAgIGlmICghXy5pc0FycmF5KGF0dHJpYnV0ZSkpXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlID0gW2F0dHJpYnV0ZSwgW251bGwsIG51bGxdXTtcblxuICAgICAgICAgICAgaWYgKCFfLmlzQXJyYXkoYXR0cmlidXRlWzFdKSlcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVbMV0gPSBbYXR0cmlidXRlWzFdLCBudWxsXTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIGEgYmluZGluZyBpcyBhbHJlYWR5IGJvdW5kIHRvIGFub3RoZXIgYXR0cmlidXRlLlxuICAgICAgICAgICAgaWYgKHRoaXMuX2JpbmRpbmdzW2JpbmRpbmddKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIidcIiArIGJpbmRpbmcgKyBcIicgaXMgYWxyZWFkeSBib3VuZCB0byAnXCIgKyBhdHRyaWJ1dGVbMF0gKyBcIicuXCIpO1xuXG4gICAgICAgICAgICAvLyBTcGxpdCBiaW5kaW5ncyBqdXN0IGxpa2UgQmFja2JvbmUuVmlldy5ldmVudHMgd2hlcmUgdGhlIGZpcnN0IGhhbGZcbiAgICAgICAgICAgIC8vIGlzIHRoZSBwcm9wZXJ0eSB5b3Ugd2FudCB0byBiaW5kIHRvIGFuZCB0aGUgcmVtYWluZGVyIGlzIHRoZSBzZWxlY3RvclxuICAgICAgICAgICAgLy8gZm9yIHRoZSBlbGVtZW50IGluIHRoZSB2aWV3IHRoYXQgcHJvcGVydHkgaXMgZm9yLlxuICAgICAgICAgICAgdmFyIG1hdGNoID0gYmluZGluZy5tYXRjaChiaW5kaW5nU3BsaXR0ZXIpLFxuICAgICAgICAgICAgICAgIHByb3BlcnR5ID0gbWF0Y2hbMV0sXG4gICAgICAgICAgICAgICAgc2VsZWN0b3IgPSBtYXRjaFsyXSxcbiAgICAgICAgICAgICAgICAvLyBGaW5kIGVsZW1lbnQgaW4gdmlldyBmb3IgYmluZGluZy4gSWYgdGhlcmUgaXMgbm8gc2VsZWN0b3JcbiAgICAgICAgICAgICAgICAvLyB1c2UgdGhlIHZpZXcncyBlbC5cbiAgICAgICAgICAgICAgICBlbCA9IChzZWxlY3RvcikgPyB0aGlzLiQoc2VsZWN0b3IpIDogdGhpcy4kZWwsXG4gICAgICAgICAgICAgICAgLy8gRmluZGVyIGJpbmRlciBkZWZpbml0aW9uIGZvciBiaW5kaW5nIGJ5IHByb3BlcnR5LiBJZiBpdCBjYW4ndCBiZSBmb3VuZFxuICAgICAgICAgICAgICAgIC8vIGRlZmF1bHQgdG8gcHJvcGVydHkgJ2F0dHInLlxuICAgICAgICAgICAgICAgIGJpbmRlciA9IEJhY2tib25lLlZpZXcuQmluZGVyc1twcm9wZXJ0eV0gfHwgQmFja2JvbmUuVmlldy5CaW5kZXJzWydfX2F0dHJfXyddLFxuICAgICAgICAgICAgICAgIC8vIEZldGNoIGFjY2Vzc29ycyBmcm9tIGJpbmRlci4gVGhlIGNvbnRleHQgb2YgdGhlIGJpbmRlciBpcyB0aGUgdmlld1xuICAgICAgICAgICAgICAgIC8vIGFuZCBiaW5kZXIgc2hvdWxkIHJldHVybiBhbiBvYmplY3QgdGhhdCBoYXMgJ3NldCcgYW5kIG9yICdnZXQnIGtleXMuXG4gICAgICAgICAgICAgICAgLy8gJ3NldCcgbXVzdCBiZSBhIGZ1bmN0aW9uIGFuZCBoYXMgb25lIGFyZ3VtZW50LiBgZ2V0YCBjYW4gZWl0aGVyIGJlXG4gICAgICAgICAgICAgICAgLy8gYSBmdW5jdGlvbiBvciBhIGxpc3QgW2V2ZW50cywgZnVuY3Rpb25dIC5UaGUgY29udGV4dCBvZiBib3RoIHNldCBhbmRcbiAgICAgICAgICAgICAgICAvLyBnZXQgaXMgdGhlIHZpZXdzJ3MgJGVsLlxuICAgICAgICAgICAgICAgIGFjY2Vzc29ycyA9IGJpbmRlci5jYWxsKHRoaXMsIHRoaXMubW9kZWwsIGF0dHJpYnV0ZVswXSwgcHJvcGVydHkpO1xuXG4gICAgICAgICAgICBpZiAoIWFjY2Vzc29ycylcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIE5vcm1hbGl6ZSBnZXQgYWNjZXNzb3JzIGlmIG9ubHkgYSBmdW5jdGlvbiB3YXMgcHJvdmlkZWQuIElmIG5vXG4gICAgICAgICAgICAvLyBldmVudHMgd2VyZSBwcm92aWRlZCBkZWZhdWx0IHRvIG9uICdjaGFuZ2UnLlxuICAgICAgICAgICAgaWYgKCFfLmlzQXJyYXkoYWNjZXNzb3JzLmdldCkpXG4gICAgICAgICAgICAgICAgYWNjZXNzb3JzLmdldCA9IFsnY2hhbmdlJywgYWNjZXNzb3JzLmdldF07XG5cbiAgICAgICAgICAgIGlmICghYWNjZXNzb3JzLmdldFsxXSAmJiAhYWNjZXNzb3JzLnNldClcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIEV2ZW50IGtleSBmb3IgbW9kZWwgYXR0cmlidXRlIGNoYW5nZXMuXG4gICAgICAgICAgICB2YXIgc2V0VHJpZ2dlciA9ICdjaGFuZ2U6JyArIGF0dHJpYnV0ZVswXSxcbiAgICAgICAgICAgICAgICAvLyBFdmVudCBrZXlzIGZvciB2aWV3LiRlbCBuYW1lc3BhY2VkIHRvIHRoZSB2aWV3IGZvciB1bmJpbmRpbmcuXG4gICAgICAgICAgICAgICAgZ2V0VHJpZ2dlciA9IF8ucmVkdWNlKGFjY2Vzc29ycy5nZXRbMF0uc3BsaXQoJyAnKSwgZnVuY3Rpb24obWVtbywgZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1lbW8gKyAnICcgKyBldmVudCArICcubW9kZWxCaW5kaW5nJyArIHRoaXMuY2lkO1xuICAgICAgICAgICAgICAgIH0sICcnLCB0aGlzKTtcblxuICAgICAgICAgICAgLy8gRGVmYXVsdCB0byBpZGVudGl0eSB0cmFuc2Zvcm1lciBpZiBub3QgcHJvdmlkZWQgZm9yIGF0dHJpYnV0ZS5cbiAgICAgICAgICAgIHZhciBzZXRUcmFuc2Zvcm1lciA9IGF0dHJpYnV0ZVsxXVswXSB8fCBpZGVudGl0eVRyYW5zZm9ybWVyLFxuICAgICAgICAgICAgICAgIGdldFRyYW5zZm9ybWVyID0gYXR0cmlidXRlWzFdWzFdIHx8IGlkZW50aXR5VHJhbnNmb3JtZXI7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBnZXQgYW5kIHNldCBjYWxsYmFja3Mgc28gdGhhdCB3ZSBjYW4gcmVmZXJlbmNlIHRoZSBmdW5jdGlvbnNcbiAgICAgICAgICAgIC8vIHdoZW4gaXQncyB0aW1lIHRvIHVuYmluZC4gJ3NldCcgZm9yIGJpbmRpbmcgdG8gdGhlIG1vZGVsIGV2ZW50cy4uLlxuICAgICAgICAgICAgdmFyIHNldCA9IF8uYmluZChmdW5jdGlvbihtb2RlbCwgdmFsdWUsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAvLyBTa2lwIGlmIHRoaXMgY2FsbGJhY2sgd2FzIGJvdW5kIHRvIHRoZSBlbGVtZW50IHRoYXRcbiAgICAgICAgICAgICAgICAvLyB0cmlnZ2VyZWQgdGhlIGNhbGxiYWNrLlxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZWwgJiYgb3B0aW9ucy5lbC5nZXQoMCkgPT0gZWwuZ2V0KDApKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIHByb3BlcnR5IHZhbHVlIGZvciB0aGUgYmluZGVyJ3MgZWxlbWVudC5cbiAgICAgICAgICAgICAgICBhY2Nlc3NvcnMuc2V0LmNhbGwoZWwsIHNldFRyYW5zZm9ybWVyLmNhbGwodGhpcywgdmFsdWUpKTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgICAgICAvLyAuLi5hbmQgJ2dldCcgY2FsbGJhY2sgZm9yIGJpbmRpbmcgdG8gRE9NIGV2ZW50cy5cbiAgICAgICAgICAgIHZhciBnZXQgPSBfLmJpbmQoZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIHByb3BlcnR5IHZhbHVlIGZyb20gdGhlIGJpbmRlcidzIGVsZW1lbnQuXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYXR0cmlidXRlWzBdLCBnZXRUcmFuc2Zvcm1lcik7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gZ2V0VHJhbnNmb3JtZXIuY2FsbCh0aGlzLCBhY2Nlc3NvcnMuZ2V0WzFdLmNhbGwoZWwpKTtcblxuICAgICAgICAgICAgICAgIHRoaXMubW9kZWwuc2V0KGF0dHJpYnV0ZVswXSwgdmFsdWUsIHtcbiAgICAgICAgICAgICAgICAgICAgZWw6IHRoaXMuJChldmVudC5zcmNFbGVtZW50KVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgICAgIGlmIChhY2Nlc3NvcnMuc2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlbC5vbihzZXRUcmlnZ2VyLCBzZXQpO1xuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdGhlIGluaXRpYWwgc2V0IGNhbGxiYWNrIG1hbnVhbGx5IHNvIHRoYXQgdGhlIHZpZXcgaXMgdXBcbiAgICAgICAgICAgICAgICAvLyB0byBkYXRlIHdpdGggdGhlIG1vZGVsIGJvdW5kIHRvIGl0LlxuICAgICAgICAgICAgICAgIHNldCh0aGlzLm1vZGVsLCB0aGlzLm1vZGVsLmdldChhdHRyaWJ1dGVbMF0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGFjY2Vzc29ycy5nZXRbMV0pXG4gICAgICAgICAgICAgICAgdGhpcy4kZWwub24oZ2V0VHJpZ2dlciwgc2VsZWN0b3IsIGdldCk7XG5cbiAgICAgICAgICAgIC8vIFNhdmUgYSByZWZlcmVuY2UgdG8gYmluZGluZyBzbyB0aGF0IHdlIGNhbiB1bmJpbmQgaXQgbGF0ZXIuXG4gICAgICAgICAgICB0aGlzLl9iaW5kaW5nc1tiaW5kaW5nXSA9IHtcbiAgICAgICAgICAgICAgICBzZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgZ2V0VHJpZ2dlcjogZ2V0VHJpZ2dlcixcbiAgICAgICAgICAgICAgICBzZXRUcmlnZ2VyOiBzZXRUcmlnZ2VyLFxuICAgICAgICAgICAgICAgIGdldDogZ2V0LFxuICAgICAgICAgICAgICAgIHNldDogc2V0XG4gICAgICAgICAgICB9O1xuICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHVuYmluZE1vZGVsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gU2tpcCBpZiB2aWV3IGhhcyBiZWVuIGJvdW5kIG9yIGRvZXNuJ3QgaGF2ZSBhIG1vZGVsLlxuICAgICAgICBpZiAoIXRoaXMuX2JpbmRpbmdzIHx8ICF0aGlzLm1vZGVsKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIF8uZWFjaCh0aGlzLl9iaW5kaW5ncywgZnVuY3Rpb24oYmluZGluZywga2V5KSB7XG4gICAgICAgICAgICBpZiAoYmluZGluZy5nZXRbMV0pXG4gICAgICAgICAgICAgICAgdGhpcy4kZWwub2ZmKGJpbmRpbmcuZ2V0VHJpZ2dlciwgYmluZGluZy5zZWxlY3Rvcik7XG5cbiAgICAgICAgICAgIGlmIChiaW5kaW5nLnNldClcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLm9mZihiaW5kaW5nLnNldFRyaWdnZXIsIGJpbmRpbmcuc2V0KTtcblxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JpbmRpbmdzW2tleV07XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn0pO1xuXG5CYWNrYm9uZS5WaWV3LkJpbmRlcnMgPSB7XG4gICAgJ3ZhbHVlJzogZnVuY3Rpb24obW9kZWwsIGF0dHJpYnV0ZSwgcHJvcGVydHkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGdldDogWydjaGFuZ2Uga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy52YWwoKTtcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMudmFsKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9LFxuICAgICd0ZXh0JzogZnVuY3Rpb24obW9kZWwsIGF0dHJpYnV0ZSwgcHJvcGVydHkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGdldDogWydjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCk7XG4gICAgICAgICAgICB9XSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRleHQodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgJ2h0bWwnOiBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlLCBwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0OiBbJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmh0bWwoKTtcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcbiAgICAnY2xhc3MnOiBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlLCBwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9wcmV2aW91c0NsYXNzKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUNsYXNzKHRoaXMuX3ByZXZpb3VzQ2xhc3MpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRDbGFzcyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJldmlvdXNDbGFzcyA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgJ2NoZWNrZWQnOiBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlLCBwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0OiBbJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb3AoJ2NoZWNrZWQnKTtcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvcCgnY2hlY2tlZCcsICEhdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgJ19fYXR0cl9fJzogZnVuY3Rpb24obW9kZWwsIGF0dHJpYnV0ZSwgcHJvcGVydHkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmF0dHIocHJvcGVydHksIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG52YXIgaWRlbnRpdHlUcmFuc2Zvcm1lciA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuLy8gSGVscGVyIGZ1bmN0aW9uIGZyb20gQmFja2JvbmUgdG8gZ2V0IGEgdmFsdWUgZnJvbSBhIEJhY2tib25lXG4vLyBvYmplY3QgYXMgYSBwcm9wZXJ0eSBvciBhcyBhIGZ1bmN0aW9uLlxudmFyIGdldFZhbHVlID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wKSB7XG4gICAgaWYgKChvYmplY3QgJiYgb2JqZWN0W3Byb3BdKSlcbiAgICAgICAgcmV0dXJuIF8uaXNGdW5jdGlvbihvYmplY3RbcHJvcF0pID8gb2JqZWN0W3Byb3BdKCkgOiBvYmplY3RbcHJvcF07XG59OyIsImltcG9ydCAqIGFzIGJhc2UgZnJvbSAnLi9oYW5kbGViYXJzL2Jhc2UnO1xuXG4vLyBFYWNoIG9mIHRoZXNlIGF1Z21lbnQgdGhlIEhhbmRsZWJhcnMgb2JqZWN0LiBObyBuZWVkIHRvIHNldHVwIGhlcmUuXG4vLyAoVGhpcyBpcyBkb25lIHRvIGVhc2lseSBzaGFyZSBjb2RlIGJldHdlZW4gY29tbW9uanMgYW5kIGJyb3dzZSBlbnZzKVxuaW1wb3J0IFNhZmVTdHJpbmcgZnJvbSAnLi9oYW5kbGViYXJzL3NhZmUtc3RyaW5nJztcbmltcG9ydCBFeGNlcHRpb24gZnJvbSAnLi9oYW5kbGViYXJzL2V4Y2VwdGlvbic7XG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuL2hhbmRsZWJhcnMvdXRpbHMnO1xuaW1wb3J0ICogYXMgcnVudGltZSBmcm9tICcuL2hhbmRsZWJhcnMvcnVudGltZSc7XG5cbmltcG9ydCBub0NvbmZsaWN0IGZyb20gJy4vaGFuZGxlYmFycy9uby1jb25mbGljdCc7XG5cbi8vIEZvciBjb21wYXRpYmlsaXR5IGFuZCB1c2FnZSBvdXRzaWRlIG9mIG1vZHVsZSBzeXN0ZW1zLCBtYWtlIHRoZSBIYW5kbGViYXJzIG9iamVjdCBhIG5hbWVzcGFjZVxuZnVuY3Rpb24gY3JlYXRlKCkge1xuICBsZXQgaGIgPSBuZXcgYmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoaGIsIGJhc2UpO1xuICBoYi5TYWZlU3RyaW5nID0gU2FmZVN0cmluZztcbiAgaGIuRXhjZXB0aW9uID0gRXhjZXB0aW9uO1xuICBoYi5VdGlscyA9IFV0aWxzO1xuICBoYi5lc2NhcGVFeHByZXNzaW9uID0gVXRpbHMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICBoYi5WTSA9IHJ1bnRpbWU7XG4gIGhiLnRlbXBsYXRlID0gZnVuY3Rpb24oc3BlYykge1xuICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGhiKTtcbiAgfTtcblxuICByZXR1cm4gaGI7XG59XG5cbmxldCBpbnN0ID0gY3JlYXRlKCk7XG5pbnN0LmNyZWF0ZSA9IGNyZWF0ZTtcblxubm9Db25mbGljdChpbnN0KTtcblxuaW5zdFsnZGVmYXVsdCddID0gaW5zdDtcblxuZXhwb3J0IGRlZmF1bHQgaW5zdDtcbiIsImltcG9ydCB7Y3JlYXRlRnJhbWUsIGV4dGVuZCwgdG9TdHJpbmd9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IEV4Y2VwdGlvbiBmcm9tICcuL2V4Y2VwdGlvbic7XG5pbXBvcnQge3JlZ2lzdGVyRGVmYXVsdEhlbHBlcnN9IGZyb20gJy4vaGVscGVycyc7XG5pbXBvcnQge3JlZ2lzdGVyRGVmYXVsdERlY29yYXRvcnN9IGZyb20gJy4vZGVjb3JhdG9ycyc7XG5pbXBvcnQgbG9nZ2VyIGZyb20gJy4vbG9nZ2VyJztcblxuZXhwb3J0IGNvbnN0IFZFUlNJT04gPSAnNC4wLjUnO1xuZXhwb3J0IGNvbnN0IENPTVBJTEVSX1JFVklTSU9OID0gNztcblxuZXhwb3J0IGNvbnN0IFJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPT0gMS54LngnLFxuICA1OiAnPT0gMi4wLjAtYWxwaGEueCcsXG4gIDY6ICc+PSAyLjAuMC1iZXRhLjEnLFxuICA3OiAnPj0gNC4wLjAnXG59O1xuXG5jb25zdCBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBIYW5kbGViYXJzRW52aXJvbm1lbnQoaGVscGVycywgcGFydGlhbHMsIGRlY29yYXRvcnMpIHtcbiAgdGhpcy5oZWxwZXJzID0gaGVscGVycyB8fCB7fTtcbiAgdGhpcy5wYXJ0aWFscyA9IHBhcnRpYWxzIHx8IHt9O1xuICB0aGlzLmRlY29yYXRvcnMgPSBkZWNvcmF0b3JzIHx8IHt9O1xuXG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG4gIHJlZ2lzdGVyRGVmYXVsdERlY29yYXRvcnModGhpcyk7XG59XG5cbkhhbmRsZWJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBIYW5kbGViYXJzRW52aXJvbm1lbnQsXG5cbiAgbG9nZ2VyOiBsb2dnZXIsXG4gIGxvZzogbG9nZ2VyLmxvZyxcblxuICByZWdpc3RlckhlbHBlcjogZnVuY3Rpb24obmFtZSwgZm4pIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgaWYgKGZuKSB7IHRocm93IG5ldyBFeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgICBleHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMuaGVscGVyc1tuYW1lXTtcbiAgfSxcblxuICByZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uKG5hbWUsIHBhcnRpYWwpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgZXh0ZW5kKHRoaXMucGFydGlhbHMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIHBhcnRpYWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oYEF0dGVtcHRpbmcgdG8gcmVnaXN0ZXIgYSBwYXJ0aWFsIGNhbGxlZCBcIiR7bmFtZX1cIiBhcyB1bmRlZmluZWRgKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBwYXJ0aWFsO1xuICAgIH1cbiAgfSxcbiAgdW5yZWdpc3RlclBhcnRpYWw6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5wYXJ0aWFsc1tuYW1lXTtcbiAgfSxcblxuICByZWdpc3RlckRlY29yYXRvcjogZnVuY3Rpb24obmFtZSwgZm4pIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgaWYgKGZuKSB7IHRocm93IG5ldyBFeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgZGVjb3JhdG9ycycpOyB9XG4gICAgICBleHRlbmQodGhpcy5kZWNvcmF0b3JzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kZWNvcmF0b3JzW25hbWVdID0gZm47XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVyRGVjb3JhdG9yOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMuZGVjb3JhdG9yc1tuYW1lXTtcbiAgfVxufTtcblxuZXhwb3J0IGxldCBsb2cgPSBsb2dnZXIubG9nO1xuXG5leHBvcnQge2NyZWF0ZUZyYW1lLCBsb2dnZXJ9O1xuIiwiaW1wb3J0IHJlZ2lzdGVySW5saW5lIGZyb20gJy4vZGVjb3JhdG9ycy9pbmxpbmUnO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0RGVjb3JhdG9ycyhpbnN0YW5jZSkge1xuICByZWdpc3RlcklubGluZShpbnN0YW5jZSk7XG59XG5cbiIsImltcG9ydCB7ZXh0ZW5kfSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVyRGVjb3JhdG9yKCdpbmxpbmUnLCBmdW5jdGlvbihmbiwgcHJvcHMsIGNvbnRhaW5lciwgb3B0aW9ucykge1xuICAgIGxldCByZXQgPSBmbjtcbiAgICBpZiAoIXByb3BzLnBhcnRpYWxzKSB7XG4gICAgICBwcm9wcy5wYXJ0aWFscyA9IHt9O1xuICAgICAgcmV0ID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgcGFydGlhbHMgc3RhY2sgZnJhbWUgcHJpb3IgdG8gZXhlYy5cbiAgICAgICAgbGV0IG9yaWdpbmFsID0gY29udGFpbmVyLnBhcnRpYWxzO1xuICAgICAgICBjb250YWluZXIucGFydGlhbHMgPSBleHRlbmQoe30sIG9yaWdpbmFsLCBwcm9wcy5wYXJ0aWFscyk7XG4gICAgICAgIGxldCByZXQgPSBmbihjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gb3JpZ2luYWw7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHByb3BzLnBhcnRpYWxzW29wdGlvbnMuYXJnc1swXV0gPSBvcHRpb25zLmZuO1xuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG59XG4iLCJcbmNvbnN0IGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5mdW5jdGlvbiBFeGNlcHRpb24obWVzc2FnZSwgbm9kZSkge1xuICBsZXQgbG9jID0gbm9kZSAmJiBub2RlLmxvYyxcbiAgICAgIGxpbmUsXG4gICAgICBjb2x1bW47XG4gIGlmIChsb2MpIHtcbiAgICBsaW5lID0gbG9jLnN0YXJ0LmxpbmU7XG4gICAgY29sdW1uID0gbG9jLnN0YXJ0LmNvbHVtbjtcblxuICAgIG1lc3NhZ2UgKz0gJyAtICcgKyBsaW5lICsgJzonICsgY29sdW1uO1xuICB9XG5cbiAgbGV0IHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxuXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIEV4Y2VwdGlvbik7XG4gIH1cblxuICBpZiAobG9jKSB7XG4gICAgdGhpcy5saW5lTnVtYmVyID0gbGluZTtcbiAgICB0aGlzLmNvbHVtbiA9IGNvbHVtbjtcbiAgfVxufVxuXG5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbmV4cG9ydCBkZWZhdWx0IEV4Y2VwdGlvbjtcbiIsImltcG9ydCByZWdpc3RlckJsb2NrSGVscGVyTWlzc2luZyBmcm9tICcuL2hlbHBlcnMvYmxvY2staGVscGVyLW1pc3NpbmcnO1xuaW1wb3J0IHJlZ2lzdGVyRWFjaCBmcm9tICcuL2hlbHBlcnMvZWFjaCc7XG5pbXBvcnQgcmVnaXN0ZXJIZWxwZXJNaXNzaW5nIGZyb20gJy4vaGVscGVycy9oZWxwZXItbWlzc2luZyc7XG5pbXBvcnQgcmVnaXN0ZXJJZiBmcm9tICcuL2hlbHBlcnMvaWYnO1xuaW1wb3J0IHJlZ2lzdGVyTG9nIGZyb20gJy4vaGVscGVycy9sb2cnO1xuaW1wb3J0IHJlZ2lzdGVyTG9va3VwIGZyb20gJy4vaGVscGVycy9sb29rdXAnO1xuaW1wb3J0IHJlZ2lzdGVyV2l0aCBmcm9tICcuL2hlbHBlcnMvd2l0aCc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckRlZmF1bHRIZWxwZXJzKGluc3RhbmNlKSB7XG4gIHJlZ2lzdGVyQmxvY2tIZWxwZXJNaXNzaW5nKGluc3RhbmNlKTtcbiAgcmVnaXN0ZXJFYWNoKGluc3RhbmNlKTtcbiAgcmVnaXN0ZXJIZWxwZXJNaXNzaW5nKGluc3RhbmNlKTtcbiAgcmVnaXN0ZXJJZihpbnN0YW5jZSk7XG4gIHJlZ2lzdGVyTG9nKGluc3RhbmNlKTtcbiAgcmVnaXN0ZXJMb29rdXAoaW5zdGFuY2UpO1xuICByZWdpc3RlcldpdGgoaW5zdGFuY2UpO1xufVxuIiwiaW1wb3J0IHthcHBlbmRDb250ZXh0UGF0aCwgY3JlYXRlRnJhbWUsIGlzQXJyYXl9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBsZXQgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSxcbiAgICAgICAgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmbih0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICBpZiAoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmlkcykge1xuICAgICAgICAgIG9wdGlvbnMuaWRzID0gW29wdGlvbnMubmFtZV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgbGV0IGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLm5hbWUpO1xuICAgICAgICBvcHRpb25zID0ge2RhdGE6IGRhdGF9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9KTtcbn1cbiIsImltcG9ydCB7YXBwZW5kQ29udGV4dFBhdGgsIGJsb2NrUGFyYW1zLCBjcmVhdGVGcmFtZSwgaXNBcnJheSwgaXNGdW5jdGlvbn0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IEV4Y2VwdGlvbiBmcm9tICcuLi9leGNlcHRpb24nO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ011c3QgcGFzcyBpdGVyYXRvciB0byAjZWFjaCcpO1xuICAgIH1cblxuICAgIGxldCBmbiA9IG9wdGlvbnMuZm4sXG4gICAgICAgIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UsXG4gICAgICAgIGkgPSAwLFxuICAgICAgICByZXQgPSAnJyxcbiAgICAgICAgZGF0YSxcbiAgICAgICAgY29udGV4dFBhdGg7XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICBjb250ZXh0UGF0aCA9IGFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5pZHNbMF0pICsgJy4nO1xuICAgIH1cblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4ZWNJdGVyYXRpb24oZmllbGQsIGluZGV4LCBsYXN0KSB7XG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICBkYXRhLmtleSA9IGZpZWxkO1xuICAgICAgICBkYXRhLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGRhdGEuZmlyc3QgPSBpbmRleCA9PT0gMDtcbiAgICAgICAgZGF0YS5sYXN0ID0gISFsYXN0O1xuXG4gICAgICAgIGlmIChjb250ZXh0UGF0aCkge1xuICAgICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBjb250ZXh0UGF0aCArIGZpZWxkO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbZmllbGRdLCB7XG4gICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgIGJsb2NrUGFyYW1zOiBibG9ja1BhcmFtcyhbY29udGV4dFtmaWVsZF0sIGZpZWxkXSwgW2NvbnRleHRQYXRoICsgZmllbGQsIG51bGxdKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgICBmb3IgKGxldCBqID0gY29udGV4dC5sZW5ndGg7IGkgPCBqOyBpKyspIHtcbiAgICAgICAgICBpZiAoaSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgICBleGVjSXRlcmF0aW9uKGksIGksIGkgPT09IGNvbnRleHQubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcHJpb3JLZXk7XG5cbiAgICAgICAgZm9yIChsZXQga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgICBpZiAoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAvLyBXZSdyZSBydW5uaW5nIHRoZSBpdGVyYXRpb25zIG9uZSBzdGVwIG91dCBvZiBzeW5jIHNvIHdlIGNhbiBkZXRlY3RcbiAgICAgICAgICAgIC8vIHRoZSBsYXN0IGl0ZXJhdGlvbiB3aXRob3V0IGhhdmUgdG8gc2NhbiB0aGUgb2JqZWN0IHR3aWNlIGFuZCBjcmVhdGVcbiAgICAgICAgICAgIC8vIGFuIGl0ZXJtZWRpYXRlIGtleXMgYXJyYXkuXG4gICAgICAgICAgICBpZiAocHJpb3JLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBleGVjSXRlcmF0aW9uKHByaW9yS2V5LCBpIC0gMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcmlvcktleSA9IGtleTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByaW9yS2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBleGVjSXRlcmF0aW9uKHByaW9yS2V5LCBpIC0gMSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmV0O1xuICB9KTtcbn1cbiIsImltcG9ydCBFeGNlcHRpb24gZnJvbSAnLi4vZXhjZXB0aW9uJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbigvKiBbYXJncywgXW9wdGlvbnMgKi8pIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgLy8gQSBtaXNzaW5nIGZpZWxkIGluIGEge3tmb299fSBjb25zdHJ1Y3QuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTb21lb25lIGlzIGFjdHVhbGx5IHRyeWluZyB0byBjYWxsIHNvbWV0aGluZywgYmxvdyB1cC5cbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ01pc3NpbmcgaGVscGVyOiBcIicgKyBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdLm5hbWUgKyAnXCInKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiaW1wb3J0IHtpc0VtcHR5LCBpc0Z1bmN0aW9ufSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29uZGl0aW9uYWwpKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gICAgLy8gRGVmYXVsdCBiZWhhdmlvciBpcyB0byByZW5kZXIgdGhlIHBvc2l0aXZlIHBhdGggaWYgdGhlIHZhbHVlIGlzIHRydXRoeSBhbmQgbm90IGVtcHR5LlxuICAgIC8vIFRoZSBgaW5jbHVkZVplcm9gIG9wdGlvbiBtYXkgYmUgc2V0IHRvIHRyZWF0IHRoZSBjb25kdGlvbmFsIGFzIHB1cmVseSBub3QgZW1wdHkgYmFzZWQgb24gdGhlXG4gICAgLy8gYmVoYXZpb3Igb2YgaXNFbXB0eS4gRWZmZWN0aXZlbHkgdGhpcyBkZXRlcm1pbmVzIGlmIDAgaXMgaGFuZGxlZCBieSB0aGUgcG9zaXRpdmUgcGF0aCBvciBuZWdhdGl2ZS5cbiAgICBpZiAoKCFvcHRpb25zLmhhc2guaW5jbHVkZVplcm8gJiYgIWNvbmRpdGlvbmFsKSB8fCBpc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gaW5zdGFuY2UuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7Zm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbiwgaGFzaDogb3B0aW9ucy5oYXNofSk7XG4gIH0pO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKC8qIG1lc3NhZ2UsIG9wdGlvbnMgKi8pIHtcbiAgICBsZXQgYXJncyA9IFt1bmRlZmluZWRdLFxuICAgICAgICBvcHRpb25zID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgIGFyZ3MucHVzaChhcmd1bWVudHNbaV0pO1xuICAgIH1cblxuICAgIGxldCBsZXZlbCA9IDE7XG4gICAgaWYgKG9wdGlvbnMuaGFzaC5sZXZlbCAhPSBudWxsKSB7XG4gICAgICBsZXZlbCA9IG9wdGlvbnMuaGFzaC5sZXZlbDtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGEubGV2ZWwgIT0gbnVsbCkge1xuICAgICAgbGV2ZWwgPSBvcHRpb25zLmRhdGEubGV2ZWw7XG4gICAgfVxuICAgIGFyZ3NbMF0gPSBsZXZlbDtcblxuICAgIGluc3RhbmNlLmxvZyguLi4gYXJncyk7XG4gIH0pO1xufVxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2xvb2t1cCcsIGZ1bmN0aW9uKG9iaiwgZmllbGQpIHtcbiAgICByZXR1cm4gb2JqICYmIG9ialtmaWVsZF07XG4gIH0pO1xufVxuIiwiaW1wb3J0IHthcHBlbmRDb250ZXh0UGF0aCwgYmxvY2tQYXJhbXMsIGNyZWF0ZUZyYW1lLCBpc0VtcHR5LCBpc0Z1bmN0aW9ufSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGxldCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoIWlzRW1wdHkoY29udGV4dCkpIHtcbiAgICAgIGxldCBkYXRhID0gb3B0aW9ucy5kYXRhO1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IGFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5pZHNbMF0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwge1xuICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICBibG9ja1BhcmFtczogYmxvY2tQYXJhbXMoW2NvbnRleHRdLCBbZGF0YSAmJiBkYXRhLmNvbnRleHRQYXRoXSlcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSk7XG59XG4iLCJpbXBvcnQge2luZGV4T2Z9IGZyb20gJy4vdXRpbHMnO1xuXG5sZXQgbG9nZ2VyID0ge1xuICBtZXRob2RNYXA6IFsnZGVidWcnLCAnaW5mbycsICd3YXJuJywgJ2Vycm9yJ10sXG4gIGxldmVsOiAnaW5mbycsXG5cbiAgLy8gTWFwcyBhIGdpdmVuIGxldmVsIHZhbHVlIHRvIHRoZSBgbWV0aG9kTWFwYCBpbmRleGVzIGFib3ZlLlxuICBsb29rdXBMZXZlbDogZnVuY3Rpb24obGV2ZWwpIHtcbiAgICBpZiAodHlwZW9mIGxldmVsID09PSAnc3RyaW5nJykge1xuICAgICAgbGV0IGxldmVsTWFwID0gaW5kZXhPZihsb2dnZXIubWV0aG9kTWFwLCBsZXZlbC50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIGlmIChsZXZlbE1hcCA+PSAwKSB7XG4gICAgICAgIGxldmVsID0gbGV2ZWxNYXA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXZlbCA9IHBhcnNlSW50KGxldmVsLCAxMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxldmVsO1xuICB9LFxuXG4gIC8vIENhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24obGV2ZWwsIC4uLm1lc3NhZ2UpIHtcbiAgICBsZXZlbCA9IGxvZ2dlci5sb29rdXBMZXZlbChsZXZlbCk7XG5cbiAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGxvZ2dlci5sb29rdXBMZXZlbChsb2dnZXIubGV2ZWwpIDw9IGxldmVsKSB7XG4gICAgICBsZXQgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAoIWNvbnNvbGVbbWV0aG9kXSkgeyAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uc29sZVxuICAgICAgICBtZXRob2QgPSAnbG9nJztcbiAgICAgIH1cbiAgICAgIGNvbnNvbGVbbWV0aG9kXSguLi5tZXNzYWdlKTsgICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBsb2dnZXI7XG4iLCIvKiBnbG9iYWwgd2luZG93ICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIGxldCByb290ID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3csXG4gICAgICAkSGFuZGxlYmFycyA9IHJvb3QuSGFuZGxlYmFycztcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgSGFuZGxlYmFycy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHJvb3QuSGFuZGxlYmFycyA9PT0gSGFuZGxlYmFycykge1xuICAgICAgcm9vdC5IYW5kbGViYXJzID0gJEhhbmRsZWJhcnM7XG4gICAgfVxuICAgIHJldHVybiBIYW5kbGViYXJzO1xuICB9O1xufVxuIiwiaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgRXhjZXB0aW9uIGZyb20gJy4vZXhjZXB0aW9uJztcbmltcG9ydCB7IENPTVBJTEVSX1JFVklTSU9OLCBSRVZJU0lPTl9DSEFOR0VTLCBjcmVhdGVGcmFtZSB9IGZyb20gJy4vYmFzZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjaGVja1JldmlzaW9uKGNvbXBpbGVySW5mbykge1xuICBjb25zdCBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvICYmIGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgICBjdXJyZW50UmV2aXNpb24gPSBDT01QSUxFUl9SRVZJU0lPTjtcblxuICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgIGNvbnN0IHJ1bnRpbWVWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gJyArXG4gICAgICAgICAgICAnUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoJyArIHJ1bnRpbWVWZXJzaW9ucyArICcpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVyVmVyc2lvbnMgKyAnKS4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuICcgK1xuICAgICAgICAgICAgJ1BsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoJyArIGNvbXBpbGVySW5mb1sxXSArICcpLicpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdGVtcGxhdGUodGVtcGxhdGVTcGVjLCBlbnYpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgaWYgKCFlbnYpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdObyBlbnZpcm9ubWVudCBwYXNzZWQgdG8gdGVtcGxhdGUnKTtcbiAgfVxuICBpZiAoIXRlbXBsYXRlU3BlYyB8fCAhdGVtcGxhdGVTcGVjLm1haW4pIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdVbmtub3duIHRlbXBsYXRlIG9iamVjdDogJyArIHR5cGVvZiB0ZW1wbGF0ZVNwZWMpO1xuICB9XG5cbiAgdGVtcGxhdGVTcGVjLm1haW4uZGVjb3JhdG9yID0gdGVtcGxhdGVTcGVjLm1haW5fZDtcblxuICAvLyBOb3RlOiBVc2luZyBlbnYuVk0gcmVmZXJlbmNlcyByYXRoZXIgdGhhbiBsb2NhbCB2YXIgcmVmZXJlbmNlcyB0aHJvdWdob3V0IHRoaXMgc2VjdGlvbiB0byBhbGxvd1xuICAvLyBmb3IgZXh0ZXJuYWwgdXNlcnMgdG8gb3ZlcnJpZGUgdGhlc2UgYXMgcHN1ZWRvLXN1cHBvcnRlZCBBUElzLlxuICBlbnYuVk0uY2hlY2tSZXZpc2lvbih0ZW1wbGF0ZVNwZWMuY29tcGlsZXIpO1xuXG4gIGZ1bmN0aW9uIGludm9rZVBhcnRpYWxXcmFwcGVyKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy5oYXNoKSB7XG4gICAgICBjb250ZXh0ID0gVXRpbHMuZXh0ZW5kKHt9LCBjb250ZXh0LCBvcHRpb25zLmhhc2gpO1xuICAgICAgaWYgKG9wdGlvbnMuaWRzKSB7XG4gICAgICAgIG9wdGlvbnMuaWRzWzBdID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBwYXJ0aWFsID0gZW52LlZNLnJlc29sdmVQYXJ0aWFsLmNhbGwodGhpcywgcGFydGlhbCwgY29udGV4dCwgb3B0aW9ucyk7XG4gICAgbGV0IHJlc3VsdCA9IGVudi5WTS5pbnZva2VQYXJ0aWFsLmNhbGwodGhpcywgcGFydGlhbCwgY29udGV4dCwgb3B0aW9ucyk7XG5cbiAgICBpZiAocmVzdWx0ID09IG51bGwgJiYgZW52LmNvbXBpbGUpIHtcbiAgICAgIG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXSA9IGVudi5jb21waWxlKHBhcnRpYWwsIHRlbXBsYXRlU3BlYy5jb21waWxlck9wdGlvbnMsIGVudik7XG4gICAgICByZXN1bHQgPSBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQgIT0gbnVsbCkge1xuICAgICAgaWYgKG9wdGlvbnMuaW5kZW50KSB7XG4gICAgICAgIGxldCBsaW5lcyA9IHJlc3VsdC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gbGluZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgaWYgKCFsaW5lc1tpXSAmJiBpICsgMSA9PT0gbCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGluZXNbaV0gPSBvcHRpb25zLmluZGVudCArIGxpbmVzW2ldO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9IGxpbmVzLmpvaW4oJ1xcbicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignVGhlIHBhcnRpYWwgJyArIG9wdGlvbnMubmFtZSArICcgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZScpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEp1c3QgYWRkIHdhdGVyXG4gIGxldCBjb250YWluZXIgPSB7XG4gICAgc3RyaWN0OiBmdW5jdGlvbihvYmosIG5hbWUpIHtcbiAgICAgIGlmICghKG5hbWUgaW4gb2JqKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdcIicgKyBuYW1lICsgJ1wiIG5vdCBkZWZpbmVkIGluICcgKyBvYmopO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9ialtuYW1lXTtcbiAgICB9LFxuICAgIGxvb2t1cDogZnVuY3Rpb24oZGVwdGhzLCBuYW1lKSB7XG4gICAgICBjb25zdCBsZW4gPSBkZXB0aHMubGVuZ3RoO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoZGVwdGhzW2ldICYmIGRlcHRoc1tpXVtuYW1lXSAhPSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIGRlcHRoc1tpXVtuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgbGFtYmRhOiBmdW5jdGlvbihjdXJyZW50LCBjb250ZXh0KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIGN1cnJlbnQgPT09ICdmdW5jdGlvbicgPyBjdXJyZW50LmNhbGwoY29udGV4dCkgOiBjdXJyZW50O1xuICAgIH0sXG5cbiAgICBlc2NhcGVFeHByZXNzaW9uOiBVdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgIGludm9rZVBhcnRpYWw6IGludm9rZVBhcnRpYWxXcmFwcGVyLFxuXG4gICAgZm46IGZ1bmN0aW9uKGkpIHtcbiAgICAgIGxldCByZXQgPSB0ZW1wbGF0ZVNwZWNbaV07XG4gICAgICByZXQuZGVjb3JhdG9yID0gdGVtcGxhdGVTcGVjW2kgKyAnX2QnXTtcbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcblxuICAgIHByb2dyYW1zOiBbXSxcbiAgICBwcm9ncmFtOiBmdW5jdGlvbihpLCBkYXRhLCBkZWNsYXJlZEJsb2NrUGFyYW1zLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gICAgICBsZXQgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldLFxuICAgICAgICAgIGZuID0gdGhpcy5mbihpKTtcbiAgICAgIGlmIChkYXRhIHx8IGRlcHRocyB8fCBibG9ja1BhcmFtcyB8fCBkZWNsYXJlZEJsb2NrUGFyYW1zKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gd3JhcFByb2dyYW0odGhpcywgaSwgZm4sIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gd3JhcFByb2dyYW0odGhpcywgaSwgZm4pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgIH0sXG5cbiAgICBkYXRhOiBmdW5jdGlvbih2YWx1ZSwgZGVwdGgpIHtcbiAgICAgIHdoaWxlICh2YWx1ZSAmJiBkZXB0aC0tKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUuX3BhcmVudDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9LFxuICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICBsZXQgb2JqID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICBpZiAocGFyYW0gJiYgY29tbW9uICYmIChwYXJhbSAhPT0gY29tbW9uKSkge1xuICAgICAgICBvYmogPSBVdGlscy5leHRlbmQoe30sIGNvbW1vbiwgcGFyYW0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gb2JqO1xuICAgIH0sXG5cbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IHRlbXBsYXRlU3BlYy5jb21waWxlclxuICB9O1xuXG4gIGZ1bmN0aW9uIHJldChjb250ZXh0LCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgZGF0YSA9IG9wdGlvbnMuZGF0YTtcblxuICAgIHJldC5fc2V0dXAob3B0aW9ucyk7XG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwgJiYgdGVtcGxhdGVTcGVjLnVzZURhdGEpIHtcbiAgICAgIGRhdGEgPSBpbml0RGF0YShjb250ZXh0LCBkYXRhKTtcbiAgICB9XG4gICAgbGV0IGRlcHRocyxcbiAgICAgICAgYmxvY2tQYXJhbXMgPSB0ZW1wbGF0ZVNwZWMudXNlQmxvY2tQYXJhbXMgPyBbXSA6IHVuZGVmaW5lZDtcbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZURlcHRocykge1xuICAgICAgaWYgKG9wdGlvbnMuZGVwdGhzKSB7XG4gICAgICAgIGRlcHRocyA9IGNvbnRleHQgIT09IG9wdGlvbnMuZGVwdGhzWzBdID8gW2NvbnRleHRdLmNvbmNhdChvcHRpb25zLmRlcHRocykgOiBvcHRpb25zLmRlcHRocztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlcHRocyA9IFtjb250ZXh0XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYWluKGNvbnRleHQvKiwgb3B0aW9ucyovKSB7XG4gICAgICByZXR1cm4gJycgKyB0ZW1wbGF0ZVNwZWMubWFpbihjb250YWluZXIsIGNvbnRleHQsIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsIGRhdGEsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICAgIH1cbiAgICBtYWluID0gZXhlY3V0ZURlY29yYXRvcnModGVtcGxhdGVTcGVjLm1haW4sIG1haW4sIGNvbnRhaW5lciwgb3B0aW9ucy5kZXB0aHMgfHwgW10sIGRhdGEsIGJsb2NrUGFyYW1zKTtcbiAgICByZXR1cm4gbWFpbihjb250ZXh0LCBvcHRpb25zKTtcbiAgfVxuICByZXQuaXNUb3AgPSB0cnVlO1xuXG4gIHJldC5fc2V0dXAgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMuaGVscGVycywgZW52LmhlbHBlcnMpO1xuXG4gICAgICBpZiAodGVtcGxhdGVTcGVjLnVzZVBhcnRpYWwpIHtcbiAgICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMucGFydGlhbHMsIGVudi5wYXJ0aWFscyk7XG4gICAgICB9XG4gICAgICBpZiAodGVtcGxhdGVTcGVjLnVzZVBhcnRpYWwgfHwgdGVtcGxhdGVTcGVjLnVzZURlY29yYXRvcnMpIHtcbiAgICAgICAgY29udGFpbmVyLmRlY29yYXRvcnMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5kZWNvcmF0b3JzLCBlbnYuZGVjb3JhdG9ycyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnRhaW5lci5oZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gb3B0aW9ucy5wYXJ0aWFscztcbiAgICAgIGNvbnRhaW5lci5kZWNvcmF0b3JzID0gb3B0aW9ucy5kZWNvcmF0b3JzO1xuICAgIH1cbiAgfTtcblxuICByZXQuX2NoaWxkID0gZnVuY3Rpb24oaSwgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlQmxvY2tQYXJhbXMgJiYgIWJsb2NrUGFyYW1zKSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdtdXN0IHBhc3MgYmxvY2sgcGFyYW1zJyk7XG4gICAgfVxuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlRGVwdGhzICYmICFkZXB0aHMpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ211c3QgcGFzcyBwYXJlbnQgZGVwdGhzJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdyYXBQcm9ncmFtKGNvbnRhaW5lciwgaSwgdGVtcGxhdGVTcGVjW2ldLCBkYXRhLCAwLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgfTtcbiAgcmV0dXJuIHJldDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyYXBQcm9ncmFtKGNvbnRhaW5lciwgaSwgZm4sIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgZnVuY3Rpb24gcHJvZyhjb250ZXh0LCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgY3VycmVudERlcHRocyA9IGRlcHRocztcbiAgICBpZiAoZGVwdGhzICYmIGNvbnRleHQgIT09IGRlcHRoc1swXSkge1xuICAgICAgY3VycmVudERlcHRocyA9IFtjb250ZXh0XS5jb25jYXQoZGVwdGhzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZm4oY29udGFpbmVyLFxuICAgICAgICBjb250ZXh0LFxuICAgICAgICBjb250YWluZXIuaGVscGVycywgY29udGFpbmVyLnBhcnRpYWxzLFxuICAgICAgICBvcHRpb25zLmRhdGEgfHwgZGF0YSxcbiAgICAgICAgYmxvY2tQYXJhbXMgJiYgW29wdGlvbnMuYmxvY2tQYXJhbXNdLmNvbmNhdChibG9ja1BhcmFtcyksXG4gICAgICAgIGN1cnJlbnREZXB0aHMpO1xuICB9XG5cbiAgcHJvZyA9IGV4ZWN1dGVEZWNvcmF0b3JzKGZuLCBwcm9nLCBjb250YWluZXIsIGRlcHRocywgZGF0YSwgYmxvY2tQYXJhbXMpO1xuXG4gIHByb2cucHJvZ3JhbSA9IGk7XG4gIHByb2cuZGVwdGggPSBkZXB0aHMgPyBkZXB0aHMubGVuZ3RoIDogMDtcbiAgcHJvZy5ibG9ja1BhcmFtcyA9IGRlY2xhcmVkQmxvY2tQYXJhbXMgfHwgMDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlUGFydGlhbChwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gIGlmICghcGFydGlhbCkge1xuICAgIGlmIChvcHRpb25zLm5hbWUgPT09ICdAcGFydGlhbC1ibG9jaycpIHtcbiAgICAgIHBhcnRpYWwgPSBvcHRpb25zLmRhdGFbJ3BhcnRpYWwtYmxvY2snXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydGlhbCA9IG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoIXBhcnRpYWwuY2FsbCAmJiAhb3B0aW9ucy5uYW1lKSB7XG4gICAgLy8gVGhpcyBpcyBhIGR5bmFtaWMgcGFydGlhbCB0aGF0IHJldHVybmVkIGEgc3RyaW5nXG4gICAgb3B0aW9ucy5uYW1lID0gcGFydGlhbDtcbiAgICBwYXJ0aWFsID0gb3B0aW9ucy5wYXJ0aWFsc1twYXJ0aWFsXTtcbiAgfVxuICByZXR1cm4gcGFydGlhbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGludm9rZVBhcnRpYWwocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICBvcHRpb25zLnBhcnRpYWwgPSB0cnVlO1xuICBpZiAob3B0aW9ucy5pZHMpIHtcbiAgICBvcHRpb25zLmRhdGEuY29udGV4dFBhdGggPSBvcHRpb25zLmlkc1swXSB8fCBvcHRpb25zLmRhdGEuY29udGV4dFBhdGg7XG4gIH1cblxuICBsZXQgcGFydGlhbEJsb2NrO1xuICBpZiAob3B0aW9ucy5mbiAmJiBvcHRpb25zLmZuICE9PSBub29wKSB7XG4gICAgb3B0aW9ucy5kYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICBwYXJ0aWFsQmxvY2sgPSBvcHRpb25zLmRhdGFbJ3BhcnRpYWwtYmxvY2snXSA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAocGFydGlhbEJsb2NrLnBhcnRpYWxzKSB7XG4gICAgICBvcHRpb25zLnBhcnRpYWxzID0gVXRpbHMuZXh0ZW5kKHt9LCBvcHRpb25zLnBhcnRpYWxzLCBwYXJ0aWFsQmxvY2sucGFydGlhbHMpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChwYXJ0aWFsID09PSB1bmRlZmluZWQgJiYgcGFydGlhbEJsb2NrKSB7XG4gICAgcGFydGlhbCA9IHBhcnRpYWxCbG9jaztcbiAgfVxuXG4gIGlmIChwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdUaGUgcGFydGlhbCAnICsgb3B0aW9ucy5uYW1lICsgJyBjb3VsZCBub3QgYmUgZm91bmQnKTtcbiAgfSBlbHNlIGlmIChwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9vcCgpIHsgcmV0dXJuICcnOyB9XG5cbmZ1bmN0aW9uIGluaXREYXRhKGNvbnRleHQsIGRhdGEpIHtcbiAgaWYgKCFkYXRhIHx8ICEoJ3Jvb3QnIGluIGRhdGEpKSB7XG4gICAgZGF0YSA9IGRhdGEgPyBjcmVhdGVGcmFtZShkYXRhKSA6IHt9O1xuICAgIGRhdGEucm9vdCA9IGNvbnRleHQ7XG4gIH1cbiAgcmV0dXJuIGRhdGE7XG59XG5cbmZ1bmN0aW9uIGV4ZWN1dGVEZWNvcmF0b3JzKGZuLCBwcm9nLCBjb250YWluZXIsIGRlcHRocywgZGF0YSwgYmxvY2tQYXJhbXMpIHtcbiAgaWYgKGZuLmRlY29yYXRvcikge1xuICAgIGxldCBwcm9wcyA9IHt9O1xuICAgIHByb2cgPSBmbi5kZWNvcmF0b3IocHJvZywgcHJvcHMsIGNvbnRhaW5lciwgZGVwdGhzICYmIGRlcHRoc1swXSwgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gICAgVXRpbHMuZXh0ZW5kKHByb2csIHByb3BzKTtcbiAgfVxuICByZXR1cm4gcHJvZztcbn1cbiIsIi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBTYWZlU3RyaW5nLnByb3RvdHlwZS50b0hUTUwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICcnICsgdGhpcy5zdHJpbmc7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBTYWZlU3RyaW5nO1xuIiwiY29uc3QgZXNjYXBlID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7JyxcbiAgJ1wiJzogJyZxdW90OycsXG4gIFwiJ1wiOiAnJiN4Mjc7JyxcbiAgJ2AnOiAnJiN4NjA7JyxcbiAgJz0nOiAnJiN4M0Q7J1xufTtcblxuY29uc3QgYmFkQ2hhcnMgPSAvWyY8PlwiJ2A9XS9nLFxuICAgICAgcG9zc2libGUgPSAvWyY8PlwiJ2A9XS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dGVuZChvYmovKiAsIC4uLnNvdXJjZSAqLykge1xuICBmb3IgKGxldCBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGZvciAobGV0IGtleSBpbiBhcmd1bWVudHNbaV0pIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYXJndW1lbnRzW2ldLCBrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gYXJndW1lbnRzW2ldW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn1cblxuZXhwb3J0IGxldCB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8vIFNvdXJjZWQgZnJvbSBsb2Rhc2hcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvTElDRU5TRS50eHRcbi8qIGVzbGludC1kaXNhYmxlIGZ1bmMtc3R5bGUgKi9cbmxldCBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn07XG4vLyBmYWxsYmFjayBmb3Igb2xkZXIgdmVyc2lvbnMgb2YgQ2hyb21lIGFuZCBTYWZhcmlcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG5leHBvcnQge2lzRnVuY3Rpb259O1xuLyogZXNsaW50LWVuYWJsZSBmdW5jLXN0eWxlICovXG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG5leHBvcnQgY29uc3QgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG59O1xuXG4vLyBPbGRlciBJRSB2ZXJzaW9ucyBkbyBub3QgZGlyZWN0bHkgc3VwcG9ydCBpbmRleE9mIHNvIHdlIG11c3QgaW1wbGVtZW50IG91ciBvd24sIHNhZGx5LlxuZXhwb3J0IGZ1bmN0aW9uIGluZGV4T2YoYXJyYXksIHZhbHVlKSB7XG4gIGZvciAobGV0IGkgPSAwLCBsZW4gPSBhcnJheS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGlmIChhcnJheVtpXSA9PT0gdmFsdWUpIHtcbiAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGVzY2FwZUV4cHJlc3Npb24oc3RyaW5nKSB7XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgICBpZiAoc3RyaW5nICYmIHN0cmluZy50b0hUTUwpIHtcbiAgICAgIHJldHVybiBzdHJpbmcudG9IVE1MKCk7XG4gICAgfSBlbHNlIGlmIChzdHJpbmcgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH0gZWxzZSBpZiAoIXN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZyArICcnO1xuICAgIH1cblxuICAgIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAgIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAgIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nO1xuICB9XG5cbiAgaWYgKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHsgcmV0dXJuIHN0cmluZzsgfVxuICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSkge1xuICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVGcmFtZShvYmplY3QpIHtcbiAgbGV0IGZyYW1lID0gZXh0ZW5kKHt9LCBvYmplY3QpO1xuICBmcmFtZS5fcGFyZW50ID0gb2JqZWN0O1xuICByZXR1cm4gZnJhbWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBibG9ja1BhcmFtcyhwYXJhbXMsIGlkcykge1xuICBwYXJhbXMucGF0aCA9IGlkcztcbiAgcmV0dXJuIHBhcmFtcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZENvbnRleHRQYXRoKGNvbnRleHRQYXRoLCBpZCkge1xuICByZXR1cm4gKGNvbnRleHRQYXRoID8gY29udGV4dFBhdGggKyAnLicgOiAnJykgKyBpZDtcbn1cbiIsIi8vIENyZWF0ZSBhIHNpbXBsZSBwYXRoIGFsaWFzIHRvIGFsbG93IGJyb3dzZXJpZnkgdG8gcmVzb2x2ZVxuLy8gdGhlIHJ1bnRpbWUgb24gYSBzdXBwb3J0ZWQgcGF0aC5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9kaXN0L2Nqcy9oYW5kbGViYXJzLnJ1bnRpbWUnKVsnZGVmYXVsdCddO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiaGFuZGxlYmFycy9ydW50aW1lXCIpW1wiZGVmYXVsdFwiXTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBqUXVlcnkgZnJvbSAnanF1ZXJ5J1xuaW1wb3J0IHsgQ3VycmVudFVzZXJNb2RlbCB9IGZyb20gJy4vbW9kZWxzL0N1cnJlbnRVc2VyJ1xuaW1wb3J0IHsgQXVkaW9QbGF5ZXJWaWV3IH0gZnJvbSAnLi9wYXJ0aWFscy9BdWRpb1BsYXllclZpZXcnXG5pbXBvcnQgUm91dGVyIGZyb20gJy4vcm91dGVyJ1xuaW1wb3J0IFBvbHlmaWxsIGZyb20gJy4vcG9seWZpbGwuanMnXG5cbiQgPSByZXF1aXJlKCdqcXVlcnknKTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXBwbGljYXRpb24ge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnJvdXRlciA9IG51bGw7XG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgUG9seWZpbGwuaW5zdGFsbCgpO1xuICAgICAgICBCYWNrYm9uZS4kID0gJDtcblxuICAgICAgICB0aGlzLnJvdXRlciA9IG5ldyBSb3V0ZXIoKTtcbiAgICAgICAgdGhpcy5yZWRpcmVjdFVybENsaWNrc1RvUm91dGVyKCk7XG5cbiAgICAgICAgdmFyIGF1ZGlvUGxheWVyID0gbmV3IEF1ZGlvUGxheWVyVmlldyh7ZWw6ICcjYXVkaW8tcGxheWVyJ30pO1xuXG4gICAgICAgIC8vIGxvYWQgdXNlclxuICAgICAgICBuZXcgQ3VycmVudFVzZXJNb2RlbCgpLmZldGNoKClcbiAgICAgICAgICAgIC50aGVuKG1vZGVsID0+IHRoaXMub25Vc2VyQXV0aGVudGljYXRlZChtb2RlbCksIHJlc3BvbnNlID0+IHRoaXMub25Vc2VyQXV0aEZhaWwocmVzcG9uc2UpKTtcbiAgICB9XG5cbiAgICByZWRpcmVjdFVybENsaWNrc1RvUm91dGVyKCkge1xuICAgICAgICAvLyBVc2UgZGVsZWdhdGlvbiB0byBhdm9pZCBpbml0aWFsIERPTSBzZWxlY3Rpb24gYW5kIGFsbG93IGFsbCBtYXRjaGluZyBlbGVtZW50cyB0byBidWJibGVcbiAgICAgICAgJChkb2N1bWVudCkuZGVsZWdhdGUoXCJhXCIsIFwiY2xpY2tcIiwgZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBhbmNob3IgaHJlZiBhbmQgcHJvdGNvbFxuICAgICAgICAgICAgdmFyIGhyZWYgPSAkKHRoaXMpLmF0dHIoXCJocmVmXCIpO1xuICAgICAgICAgICAgdmFyIHByb3RvY29sID0gdGhpcy5wcm90b2NvbCArIFwiLy9cIjtcblxuICAgICAgICAgICAgdmFyIG9wZW5MaW5rSW5UYWIgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYoaHJlZiA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gdXJsIHNwZWNpZmllZCwgZG9uJ3QgZG8gYW55dGhpbmcuXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzcGVjaWFsIGNhc2VzIHRoYXQgd2Ugd2FudCB0byBoaXQgdGhlIHNlcnZlclxuICAgICAgICAgICAgaWYoaHJlZiA9PSBcIi9hdXRoXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEVuc3VyZSB0aGUgcHJvdG9jb2wgaXMgbm90IHBhcnQgb2YgVVJMLCBtZWFuaW5nIGl0cyByZWxhdGl2ZS5cbiAgICAgICAgICAgIC8vIFN0b3AgdGhlIGV2ZW50IGJ1YmJsaW5nIHRvIGVuc3VyZSB0aGUgbGluayB3aWxsIG5vdCBjYXVzZSBhIHBhZ2UgcmVmcmVzaC5cbiAgICAgICAgICAgIGlmICghb3BlbkxpbmtJblRhYiAmJiBocmVmLnNsaWNlKHByb3RvY29sLmxlbmd0aCkgIT09IHByb3RvY29sKSB7XG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgICAgICAvLyBOb3RlIGJ5IHVzaW5nIEJhY2tib25lLmhpc3RvcnkubmF2aWdhdGUsIHJvdXRlciBldmVudHMgd2lsbCBub3QgYmVcbiAgICAgICAgICAgICAgICAvLyB0cmlnZ2VyZWQuICBJZiB0aGlzIGlzIGEgcHJvYmxlbSwgY2hhbmdlIHRoaXMgdG8gbmF2aWdhdGUgb24geW91clxuICAgICAgICAgICAgICAgIC8vIHJvdXRlci5cbiAgICAgICAgICAgICAgICBCYWNrYm9uZS5oaXN0b3J5Lm5hdmlnYXRlKGhyZWYsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBvblVzZXJBdXRoRmFpbChyZXNwb25zZSkge1xuICAgICAgICAvLyB1c2VyIG5vdCBhdXRoZW50aWNhdGVkXG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT0gNDAxKSB7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJvdXRlci5zZXRVc2VyKG51bGwpO1xuICAgICAgICB0aGlzLnN0YXJ0Um91dGVyTmF2aWdhdGlvbigpO1xuICAgIH1cblxuICAgIG9uVXNlckF1dGhlbnRpY2F0ZWQodXNlcikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkxvYWRlZCBjdXJyZW50IHVzZXJcIiwgdXNlcik7XG4gICAgICAgIHRoaXMucm91dGVyLnNldFVzZXIodXNlcik7XG4gICAgICAgIHRoaXMuc3RhcnRSb3V0ZXJOYXZpZ2F0aW9uKCk7XG4gICAgfVxuXG4gICAgc3RhcnRSb3V0ZXJOYXZpZ2F0aW9uKCkge1xuICAgICAgICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtwdXNoU3RhdGU6IHRydWUsIGhhc2hDaGFuZ2U6IGZhbHNlfSk7XG4gICAgICAgIC8vaWYgKCFCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtwdXNoU3RhdGU6IHRydWUsIGhhc2hDaGFuZ2U6IGZhbHNlfSkpIHJvdXRlci5uYXZpZ2F0ZSgnNDA0Jywge3RyaWdnZXI6IHRydWV9KTtcbiAgICB9XG59XG5cbmV4cG9ydCBsZXQgYXBwID0gbmV3IEFwcGxpY2F0aW9uKCk7XG5cblxuJCgoKSA9PiB7XG4gICAgLy8gc2V0dXAgcmF2ZW4gdG8gcHVzaCBtZXNzYWdlcyB0byBvdXIgc2VudHJ5XG4gICAgLy9SYXZlbi5jb25maWcoJ2h0dHBzOi8vZGIyYTdkNTgxMDdjNDk3NWFlN2RlNzM2YTYzMDhhMWVAYXBwLmdldHNlbnRyeS5jb20vNTM0NTYnLCB7XG4gICAgLy8gICAgd2hpdGVsaXN0VXJsczogWydzdGFnaW5nLmNvdWNocG9kLmNvbScsICdjb3VjaHBvZC5jb20nXSAvLyBwcm9kdWN0aW9uIG9ubHlcbiAgICAvL30pLmluc3RhbGwoKVxuXG4gICAgd2luZG93LmFwcCA9IGFwcDtcbiAgICBhcHAuaW5pdGlhbGl6ZSgpO1xuXG4gICAgLy8gZm9yIHByb2R1Y3Rpb24sIGNvdWxkIHdyYXAgZG9tUmVhZHlDYWxsYmFjayBhbmQgbGV0IHJhdmVuIGhhbmRsZSBhbnkgZXhjZXB0aW9uc1xuXG4gICAgLypcbiAgICAgdHJ5IHtcbiAgICAgZG9tUmVhZHlDYWxsYmFjaygpO1xuICAgICB9IGNhdGNoKGVycikge1xuICAgICBSYXZlbi5jYXB0dXJlRXhjZXB0aW9uKGVycik7XG4gICAgIGNvbnNvbGUubG9nKFwiW0Vycm9yXSBVbmhhbmRsZWQgRXhjZXB0aW9uIHdhcyBjYXVnaHQgYW5kIHNlbnQgdmlhIFJhdmVuOlwiKTtcbiAgICAgY29uc29sZS5kaXIoZXJyKTtcbiAgICAgfVxuICAgICAqL1xufSlcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5cbmNsYXNzIEF1ZGlvQ2FwdHVyZSB7XG4gICAgY29uc3RydWN0b3IobWljcm9waG9uZU1lZGlhU3RyZWFtKSB7XG4gICAgICAgIC8vIHNwYXduIGJhY2tncm91bmQgd29ya2VyXG4gICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyID0gbmV3IFdvcmtlcihcIi9hc3NldHMvanMvd29ya2VyLWVuY29kZXIubWluLmpzXCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiSW5pdGlhbGl6ZWQgQXVkaW9DYXB0dXJlXCIpO1xuXG4gICAgICAgIHRoaXMuX2F1ZGlvQ29udGV4dCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2F1ZGlvSW5wdXQgPSBudWxsO1xuICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG51bGw7XG4gICAgICAgIHRoaXMuX2lzUmVjb3JkaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYXVkaW9BbmFseXplciA9IG51bGw7XG4gICAgICAgIHRoaXMuX2F1ZGlvR2FpbiA9IG51bGw7XG4gICAgICAgIHRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtID0gbWljcm9waG9uZU1lZGlhU3RyZWFtO1xuXG4gICAgICAgIHRoaXMuX2F1ZGlvRW5jb2RlciA9IG51bGw7XG4gICAgICAgIHRoaXMuX2xhdGVzdEF1ZGlvQnVmZmVyID0gW107XG4gICAgICAgIHRoaXMuX2NhY2hlZEdhaW5WYWx1ZSA9IDE7XG4gICAgICAgIHRoaXMuX29uU3RhcnRlZENhbGxiYWNrID0gbnVsbDtcblxuICAgICAgICB0aGlzLl9mZnRTaXplID0gMjU2O1xuICAgICAgICB0aGlzLl9mZnRTbW9vdGhpbmcgPSAwLjg7XG4gICAgICAgIHRoaXMuX3RvdGFsTnVtU2FtcGxlcyA9IDA7XG5cblxuICAgIH1cbiAgICBjcmVhdGVBdWRpb0NvbnRleHQobWVkaWFTdHJlYW0pIHtcbiAgICAgICAgLy8gYnVpbGQgY2FwdHVyZSBncmFwaFxuICAgICAgICB0aGlzLl9hdWRpb0NvbnRleHQgPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCkoKTtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dCA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShtZWRpYVN0cmVhbSk7XG4gICAgICAgIHRoaXMuX2F1ZGlvRGVzdGluYXRpb24gPSB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1EZXN0aW5hdGlvbigpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydE1hbnVhbEVuY29kaW5nKCk7IF9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZTogXCIgKyB0aGlzLl9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSArIFwiIEh6XCIpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhIGxpc3RlbmVyIG5vZGUgdG8gZ3JhYiBtaWNyb3Bob25lIHNhbXBsZXMgYW5kIGZlZWQgaXQgdG8gb3VyIGJhY2tncm91bmQgd29ya2VyXG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIgPSAodGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvciB8fCB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlSmF2YVNjcmlwdE5vZGUpLmNhbGwodGhpcy5fYXVkaW9Db250ZXh0LCAxNjM4NCwgMSwgMSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLl9jYWNoZWRHYWluVmFsdWUgPSBcIiArIHRoaXMuX2NhY2hlZEdhaW5WYWx1ZSk7XG5cbiAgICAgICAgdGhpcy5fYXVkaW9HYWluID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluLmdhaW4udmFsdWUgPSB0aGlzLl9jYWNoZWRHYWluVmFsdWU7XG5cbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5mZnRTaXplID0gdGhpcy5fZmZ0U2l6ZTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyLnNtb290aGluZ1RpbWVDb25zdGFudCA9IHRoaXMuX2ZmdFNtb290aGluZztcbiAgICB9XG5cbiAgICBzdGFydE1hbnVhbEVuY29kaW5nKG1lZGlhU3RyZWFtKSB7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9hdWRpb0NvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlQXVkaW9Db250ZXh0KG1lZGlhU3RyZWFtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5fZW5jb2RpbmdXb3JrZXIpXG4gICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG5ldyBXb3JrZXIoXCIvYXNzZXRzL2pzL3dvcmtlci1lbmNvZGVyLm1pbi5qc1wiKTtcblxuICAgICAgICAvLyByZS1ob29rIGF1ZGlvIGxpc3RlbmVyIG5vZGUgZXZlcnkgdGltZSB3ZSBzdGFydCwgYmVjYXVzZSBfZW5jb2RpbmdXb3JrZXIgcmVmZXJlbmNlIHdpbGwgY2hhbmdlXG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIub25hdWRpb3Byb2Nlc3MgPSAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9pc1JlY29yZGluZykgcmV0dXJuO1xuXG4gICAgICAgICAgICB2YXIgbXNnID0ge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogXCJwcm9jZXNzXCIsXG5cbiAgICAgICAgICAgICAgICAvLyB0d28gRmxvYXQzMkFycmF5c1xuICAgICAgICAgICAgICAgIGxlZnQ6IGUuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMClcbiAgICAgICAgICAgICAgICAvL3JpZ2h0OiBlLmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDEpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvL3ZhciBsZWZ0T3V0ID0gZS5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgICAgICAvL2Zvcih2YXIgaSA9IDA7IGkgPCBtc2cubGVmdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgLy8gICAgbGVmdE91dFtpXSA9IG1zZy5sZWZ0W2ldO1xuICAgICAgICAgICAgLy99XG5cbiAgICAgICAgICAgIHRoaXMuX3RvdGFsTnVtU2FtcGxlcyArPSBtc2cubGVmdC5sZW5ndGg7XG5cbiAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLnBvc3RNZXNzYWdlKG1zZyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gaGFuZGxlIG1lc3NhZ2VzIGZyb20gdGhlIGVuY29kaW5nLXdvcmtlclxuICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlci5vbm1lc3NhZ2UgPSAoZSkgPT4ge1xuXG4gICAgICAgICAgICAvLyB3b3JrZXIgZmluaXNoZWQgYW5kIGhhcyB0aGUgZmluYWwgZW5jb2RlZCBhdWRpbyBidWZmZXIgZm9yIHVzXG4gICAgICAgICAgICBpZiAoZS5kYXRhLmFjdGlvbiA9PT0gXCJlbmNvZGVkXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZW5jb2RlZF9ibG9iID0gbmV3IEJsb2IoW2UuZGF0YS5idWZmZXJdLCB7dHlwZTogJ2F1ZGlvL29nZyd9KTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZS5kYXRhLmJ1ZmZlci5idWZmZXIgPSBcIiArIGUuZGF0YS5idWZmZXIuYnVmZmVyKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImUuZGF0YS5idWZmZXIuYnl0ZUxlbmd0aCA9IFwiICsgZS5kYXRhLmJ1ZmZlci5ieXRlTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInNhbXBsZVJhdGUgPSBcIiArIHRoaXMuX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInRvdGFsTnVtU2FtcGxlcyA9IFwiICsgdGhpcy5fdG90YWxOdW1TYW1wbGVzKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkR1cmF0aW9uIG9mIHJlY29yZGluZyA9IFwiICsgKHRoaXMuX3RvdGFsTnVtU2FtcGxlcyAvIHRoaXMuX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlKSArIFwiIHNlY29uZHNcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImdvdCBlbmNvZGVkIGJsb2I6IHNpemU9XCIgKyBlbmNvZGVkX2Jsb2Iuc2l6ZSArIFwiIHR5cGU9XCIgKyBlbmNvZGVkX2Jsb2IudHlwZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjaylcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjayhlbmNvZGVkX2Jsb2IpO1xuXG4gICAgICAgICAgICAgICAgLy8gd29ya2VyIGhhcyBleGl0ZWQsIHVucmVmZXJlbmNlIGl0XG4gICAgICAgICAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGNvbmZpZ3VyZSB3b3JrZXIgd2l0aCBhIHNhbXBsaW5nIHJhdGUgYW5kIGJ1ZmZlci1zaXplXG4gICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIGFjdGlvbjogXCJpbml0aWFsaXplXCIsXG4gICAgICAgICAgICBzYW1wbGVfcmF0ZTogdGhpcy5fYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUsXG4gICAgICAgICAgICBidWZmZXJfc2l6ZTogdGhpcy5fYXVkaW9MaXN0ZW5lci5idWZmZXJTaXplXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRPRE86IGl0IG1pZ2h0IGJlIGJldHRlciB0byBsaXN0ZW4gZm9yIGEgbWVzc2FnZSBiYWNrIGZyb20gdGhlIGJhY2tncm91bmQgd29ya2VyIGJlZm9yZSBjb25zaWRlcmluZyB0aGF0IHJlY29yZGluZyBoYXMgYmVnYW5cbiAgICAgICAgLy8gaXQncyBlYXNpZXIgdG8gdHJpbSBhdWRpbyB0aGFuIGNhcHR1cmUgYSBtaXNzaW5nIHdvcmQgYXQgdGhlIHN0YXJ0IG9mIGEgc2VudGVuY2VcbiAgICAgICAgdGhpcy5faXNSZWNvcmRpbmcgPSBmYWxzZTtcblxuICAgICAgICAvLyBjb25uZWN0IGF1ZGlvIG5vZGVzXG4gICAgICAgIC8vIGF1ZGlvLWlucHV0IC0+IGdhaW4gLT4gZmZ0LWFuYWx5emVyIC0+IFBDTS1kYXRhIGNhcHR1cmUgLT4gZGVzdGluYXRpb25cblxuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnRNYW51YWxFbmNvZGluZygpOyBDb25uZWN0aW5nIEF1ZGlvIE5vZGVzLi5cIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBpbnB1dC0+Z2FpblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dC5jb25uZWN0KHRoaXMuX2F1ZGlvR2Fpbik7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBnYWluLT5hbmFseXplclwiKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0dhaW4uY29ubmVjdCh0aGlzLl9hdWRpb0FuYWx5emVyKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGFuYWx5emVyLT5saXN0ZXNuZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5jb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICAvLyBjb25uZWN0IGdhaW4gZGlyZWN0bHkgaW50byBsaXN0ZW5lciwgYnlwYXNzaW5nIGFuYWx5emVyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdGluZzogZ2Fpbi0+bGlzdGVuZXJcIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvR2Fpbi5jb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGxpc3RlbmVyLT5kZXN0aW5hdGlvblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lci5jb25uZWN0KHRoaXMuX2F1ZGlvRGVzdGluYXRpb24pO1xuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHNodXRkb3duTWFudWFsRW5jb2RpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzaHV0ZG93bk1hbnVhbEVuY29kaW5nKCk7IFRlYXJpbmcgZG93biBBdWRpb0FQSSBjb25uZWN0aW9ucy4uXCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogbGlzdGVuZXItPmRlc3RpbmF0aW9uXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyLmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9EZXN0aW5hdGlvbik7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBhbmFseXplci0+bGlzdGVzbmVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGdhaW4tPmFuYWx5emVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvR2Fpbi5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvQW5hbHl6ZXIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGdhaW4tPmxpc3RlbmVyXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0dhaW4uZGlzY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBpbnB1dC0+Z2FpblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dC5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvR2Fpbik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhlIG1pY3JvcGhvbmUgbWF5IGJlIGxpdmUsIGJ1dCBpdCBpc24ndCByZWNvcmRpbmcuIFRoaXMgdG9nZ2xlcyB0aGUgYWN0dWFsIHdyaXRpbmcgdG8gdGhlIGNhcHR1cmUgc3RyZWFtLlxuICAgICAqIGNhcHR1cmVBdWRpb1NhbXBsZXMgYm9vbCBpbmRpY2F0ZXMgd2hldGhlciB0byByZWNvcmQgZnJvbSBtaWNcbiAgICAgKi9cbiAgICB0b2dnbGVNaWNyb3Bob25lUmVjb3JkaW5nKGNhcHR1cmVBdWRpb1NhbXBsZXMpIHtcbiAgICAgICAgdGhpcy5faXNSZWNvcmRpbmcgPSBjYXB0dXJlQXVkaW9TYW1wbGVzO1xuICAgIH1cblxuICAgIHNldEdhaW4oZ2Fpbikge1xuICAgICAgICBpZiAodGhpcy5fYXVkaW9HYWluKVxuICAgICAgICAgICAgdGhpcy5fYXVkaW9HYWluLmdhaW4udmFsdWUgPSBnYWluO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwic2V0dGluZyBnYWluOiBcIiArIGdhaW4pO1xuICAgICAgICB0aGlzLl9jYWNoZWRHYWluVmFsdWUgPSBnYWluO1xuICAgIH1cblxuICAgIHN0YXJ0KG9uU3RhcnRlZENhbGxiYWNrKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwidGhpcy5fY2FjaGVkTWVkaWFTdHJlYW1cIiwgdGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0pO1xuICAgICAgICB0aGlzLnN0YXJ0TWFudWFsRW5jb2RpbmcodGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0pO1xuXG4gICAgICAgIC8vIFRPRE86IG1pZ2h0IGJlIGEgZ29vZCB0aW1lIHRvIHN0YXJ0IGEgc3BlY3RyYWwgYW5hbHl6ZXJcblxuICAgICAgICBpZiAob25TdGFydGVkQ2FsbGJhY2spXG4gICAgICAgICAgICBvblN0YXJ0ZWRDYWxsYmFjaygpO1xuICAgIH1cblxuICAgIHN0b3AoY2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjayA9IGNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrO1xuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGZhbHNlO1xuXG4gICAgICAgIGlmICh0aGlzLl9hdWRpb0NvbnRleHQpIHtcbiAgICAgICAgICAgIC8vIHN0b3AgdGhlIG1hbnVhbCBlbmNvZGVyXG4gICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlci5wb3N0TWVzc2FnZSh7YWN0aW9uOiBcImZpbmlzaFwifSk7XG4gICAgICAgICAgICB0aGlzLnNodXRkb3duTWFudWFsRW5jb2RpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9hdWRpb0VuY29kZXIpIHtcbiAgICAgICAgICAgIC8vIHN0b3AgdGhlIGF1dG9tYXRpYyBlbmNvZGVyXG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9hdWRpb0VuY29kZXIuc3RhdGUgIT09ICdyZWNvcmRpbmcnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiQXVkaW9DYXB0dXJlOjpzdG9wKCk7IF9hdWRpb0VuY29kZXIuc3RhdGUgIT0gJ3JlY29yZGluZydcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5yZXF1ZXN0RGF0YSgpO1xuICAgICAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLnN0b3AoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRPRE86IHN0b3AgYW55IGFjdGl2ZSBzcGVjdHJhbCBhbmFseXNpc1xuICAgIH07XG59XG5cbi8qXG4vLyB1bnVzZWQgYXQgdGhlIG1vbWVudFxuZnVuY3Rpb24gQW5hbHl6ZXIoKSB7XG5cbiAgICB2YXIgX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQsXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzXG4gICAgICAgIDtcblxuICAgIHRoaXMuc3RhcnRBbmFseXplclVwZGF0ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHVwZGF0ZUFuYWx5emVyKCk7XG4gICAgfTtcblxuICAgIHRoaXMuc3RvcEFuYWx5emVyVXBkYXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFfYXVkaW9DYW52YXNBbmltYXRpb25JZClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQpO1xuICAgICAgICBfYXVkaW9DYW52YXNBbmltYXRpb25JZCA9IG51bGw7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUFuYWx5emVyKCkge1xuXG4gICAgICAgIGlmICghX2F1ZGlvU3BlY3RydW1DYW52YXMpXG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVjb3JkaW5nLXZpc3VhbGl6ZXJcIikuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG4gICAgICAgIHZhciBmcmVxRGF0YSA9IG5ldyBVaW50OEFycmF5KF9hdWRpb0FuYWx5emVyLmZyZXF1ZW5jeUJpbkNvdW50KTtcbiAgICAgICAgX2F1ZGlvQW5hbHl6ZXIuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcURhdGEpO1xuXG4gICAgICAgIHZhciBudW1CYXJzID0gX2F1ZGlvQW5hbHl6ZXIuZnJlcXVlbmN5QmluQ291bnQ7XG4gICAgICAgIHZhciBiYXJXaWR0aCA9IE1hdGguZmxvb3IoX2NhbnZhc1dpZHRoIC8gbnVtQmFycykgLSBfZmZ0QmFyU3BhY2luZztcblxuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5jbGVhclJlY3QoMCwgMCwgX2NhbnZhc1dpZHRoLCBfY2FudmFzSGVpZ2h0KTtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gJyNmNmQ1NjUnO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5saW5lQ2FwID0gJ3JvdW5kJztcblxuICAgICAgICB2YXIgeCwgeSwgdywgaDtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gZnJlcURhdGFbaV07XG4gICAgICAgICAgICB2YXIgc2NhbGVkX3ZhbHVlID0gKHZhbHVlIC8gMjU2KSAqIF9jYW52YXNIZWlnaHQ7XG5cbiAgICAgICAgICAgIHggPSBpICogKGJhcldpZHRoICsgX2ZmdEJhclNwYWNpbmcpO1xuICAgICAgICAgICAgeSA9IF9jYW52YXNIZWlnaHQgLSBzY2FsZWRfdmFsdWU7XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gc2NhbGVkX3ZhbHVlO1xuXG4gICAgICAgICAgICB2YXIgZ3JhZGllbnQgPSBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5jcmVhdGVMaW5lYXJHcmFkaWVudCh4LCBfY2FudmFzSGVpZ2h0LCB4LCB5KTtcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgxLjAsIFwicmdiYSgwLDAsMCwxLjApXCIpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAuMCwgXCJyZ2JhKDAsMCwwLDEuMClcIik7XG5cbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG5cbiAgICAgICAgICAgIGlmIChzY2FsZWRfdmFsdWUgPiBfaGl0SGVpZ2h0c1tpXSkge1xuICAgICAgICAgICAgICAgIF9oaXRWZWxvY2l0aWVzW2ldICs9IChzY2FsZWRfdmFsdWUgLSBfaGl0SGVpZ2h0c1tpXSkgKiA2O1xuICAgICAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldID0gc2NhbGVkX3ZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfaGl0VmVsb2NpdGllc1tpXSAtPSA0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfaGl0SGVpZ2h0c1tpXSArPSBfaGl0VmVsb2NpdGllc1tpXSAqIDAuMDE2O1xuXG4gICAgICAgICAgICBpZiAoX2hpdEhlaWdodHNbaV0gPCAwKVxuICAgICAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLWF0b3BcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZHJhd0ltYWdlKF9jYW52YXNCZywgMCwgMCk7XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBcInJnYmEoMjU1LDI1NSwyNTUsMC43KVwiO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIHggPSBpICogKGJhcldpZHRoICsgX2ZmdEJhclNwYWNpbmcpO1xuICAgICAgICAgICAgeSA9IF9jYW52YXNIZWlnaHQgLSBNYXRoLnJvdW5kKF9oaXRIZWlnaHRzW2ldKSAtIDI7XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gYmFyV2lkdGg7XG5cbiAgICAgICAgICAgIGlmIChfaGl0SGVpZ2h0c1tpXSA9PT0gMClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgLy9fYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBcInJnYmEoMjU1LCAyNTUsIDI1NSxcIisgTWF0aC5tYXgoMCwgMSAtIE1hdGguYWJzKF9oaXRWZWxvY2l0aWVzW2ldLzE1MCkpICsgXCIpXCI7XG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh1cGRhdGVBbmFseXplcik7XG4gICAgfVxuXG4gICAgdmFyIF9jYW52YXNXaWR0aCwgX2NhbnZhc0hlaWdodDtcbiAgICB2YXIgX2ZmdFNpemUgPSAyNTY7XG4gICAgdmFyIF9mZnRTbW9vdGhpbmcgPSAwLjg7XG4gICAgdmFyIF9mZnRCYXJTcGFjaW5nID0gMTtcblxuICAgIHZhciBfaGl0SGVpZ2h0cyA9IFtdO1xuICAgIHZhciBfaGl0VmVsb2NpdGllcyA9IFtdO1xuXG4gICAgdGhpcy50ZXN0Q2FudmFzID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHZhciBjYW52YXNDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlY29yZGluZy12aXN1YWxpemVyXCIpO1xuXG4gICAgICAgIF9jYW52YXNXaWR0aCA9IGNhbnZhc0NvbnRhaW5lci53aWR0aDtcbiAgICAgICAgX2NhbnZhc0hlaWdodCA9IGNhbnZhc0NvbnRhaW5lci5oZWlnaHQ7XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMgPSBjYW52YXNDb250YWluZXIuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1vdmVyXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwicmdiYSgwLDAsMCwwKVwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCgwLCAwLCBfY2FudmFzV2lkdGgsIF9jYW52YXNIZWlnaHQpO1xuXG4gICAgICAgIHZhciBudW1CYXJzID0gX2ZmdFNpemUgLyAyO1xuICAgICAgICB2YXIgYmFyU3BhY2luZyA9IF9mZnRCYXJTcGFjaW5nO1xuICAgICAgICB2YXIgYmFyV2lkdGggPSBNYXRoLmZsb29yKF9jYW52YXNXaWR0aCAvIG51bUJhcnMpIC0gYmFyU3BhY2luZztcblxuICAgICAgICB2YXIgeCwgeSwgdywgaCwgaTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICBfaGl0SGVpZ2h0c1tpXSA9IF9jYW52YXNIZWlnaHQgLSAxO1xuICAgICAgICAgICAgX2hpdFZlbG9jaXRpZXNbaV0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgdmFyIHNjYWxlZF92YWx1ZSA9IE1hdGguYWJzKE1hdGguc2luKE1hdGguUEkgKiA2ICogKGkgLyBudW1CYXJzKSkpICogX2NhbnZhc0hlaWdodDtcblxuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBiYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gc2NhbGVkX3ZhbHVlO1xuICAgICAgICAgICAgdyA9IGJhcldpZHRoO1xuICAgICAgICAgICAgaCA9IHNjYWxlZF92YWx1ZTtcblxuICAgICAgICAgICAgdmFyIGdyYWRpZW50ID0gX2F1ZGlvU3BlY3RydW1DYW52YXMuY3JlYXRlTGluZWFyR3JhZGllbnQoeCwgX2NhbnZhc0hlaWdodCwgeCwgeSk7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMS4wLCBcInJnYmEoMCwwLDAsMC4wKVwiKTtcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgwLjAsIFwicmdiYSgwLDAsMCwxLjApXCIpO1xuXG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBncmFkaWVudDtcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KHgsIHksIHcsIGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2UtYXRvcFwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5kcmF3SW1hZ2UoX2NhbnZhc0JnLCAwLCAwKTtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1vdmVyXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwiI2ZmZmZmZlwiO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIHggPSBpICogKGJhcldpZHRoICsgYmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIF9oaXRIZWlnaHRzW2ldO1xuICAgICAgICAgICAgdyA9IGJhcldpZHRoO1xuICAgICAgICAgICAgaCA9IDI7XG5cbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KHgsIHksIHcsIGgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBfc2NvcGUgPSB0aGlzO1xuXG4gICAgdmFyIF9jYW52YXNCZyA9IG5ldyBJbWFnZSgpO1xuICAgIF9jYW52YXNCZy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF9zY29wZS50ZXN0Q2FudmFzKCk7XG4gICAgfTtcbiAgICAvL19jYW52YXNCZy5zcmMgPSBcIi9pbWcvYmc1cy5qcGdcIjtcbiAgICBfY2FudmFzQmcuc3JjID0gXCIvaW1nL2JnNi13aWRlLmpwZ1wiO1xufVxuKi9cblxuZXhwb3J0IHsgQXVkaW9DYXB0dXJlIH1cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5cbmNsYXNzIENyZWF0ZVJlY29yZGluZ01vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbnVtX3JlY29yZGluZ3M6IDAsXG4gICAgICAgICAgICByZWNvcmRpbmdfdGltZTogMFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3Iob3B0cykge1xuICAgICAgICBzdXBlcihvcHRzKTtcbiAgICAgICAgLy9cbiAgICAgICAgLy90aGlzLmRlZmF1bHRzID0ge1xuICAgICAgICAvLyAgICBudW1fcmVjb3JkaW5nczogMCxcbiAgICAgICAgLy8gICAgcmVjb3JkaW5nX3RpbWU6IDBcbiAgICAgICAgLy99XG5cbiAgICAgICAgdGhpcy51cmxSb290ID0gXCIvYXBpL2NyZWF0ZV9yZWNvcmRpbmdcIjtcbiAgICB9XG59XG5cbmV4cG9ydCB7IENyZWF0ZVJlY29yZGluZ01vZGVsIH1cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcblxuY2xhc3MgQ3VycmVudFVzZXJNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsIHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiBcIlwiLFxuICAgICAgICAgICAgcHJvZmlsZUltYWdlOiBcIlwiLFxuICAgICAgICAgICAgY3JlYXRlZEF0OiBcIlwiLFxuICAgICAgICAgICAgaWQ6IFwiXCJcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKHByb3BzKSB7XG4gICAgICAgIHN1cGVyKHByb3BzKTtcbiAgICAgICAgdGhpcy51cmwgPSBcIi9hcGkvY3VycmVudF91c2VyXCI7XG4gICAgfVxufVxuXG5leHBvcnQgeyBDdXJyZW50VXNlck1vZGVsIH1cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5cbi8qKlxuICogUmVjb3JkaW5nXG4gKiBnZXQ6IHJlY29yZGluZyBtZXRhZGF0YSArIGNhbGxpbmcgdXNlcidzIGxpc3RlbmluZyBzdGF0dXNcbiAqIHBvc3Q6IGNyZWF0ZSBuZXcgcmVjb3JkaW5nXG4gKiBwdXQ6IHVwZGF0ZSByZWNvcmRpbmcgbWV0YWRhdGFcbiAqL1xuY2xhc3MgUXVpcE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaWQ6IDAsIC8vIGd1aWRcbiAgICAgICAgICAgIHByb2dyZXNzOiAwLCAvLyBbMC0xMDBdIHBlcmNlbnRhZ2VcbiAgICAgICAgICAgIHBvc2l0aW9uOiAwLCAvLyBzZWNvbmRzXG4gICAgICAgICAgICBkdXJhdGlvbjogMCwgLy8gc2Vjb25kc1xuICAgICAgICAgICAgaXNQdWJsaWM6IGZhbHNlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgICAgIHN1cGVyKG9wdHMpO1xuXG4gICAgICAgIHRoaXMudXJsUm9vdCA9IFwiL2FwaS9xdWlwc1wiO1xuXG4gICAgICAgIC8vIHNhdmUgbGlzdGVuaW5nIHByb2dyZXNzIGF0IG1vc3QgZXZlcnkgMyBzZWNvbmRzXG4gICAgICAgIHRoaXMudGhyb3R0bGVkU2F2ZSA9IF8udGhyb3R0bGUodGhpcy5zYXZlLCAzMDAwKTtcbiAgICB9XG59XG5cbmNsYXNzIE15UXVpcENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgICAgIHN1cGVyKG9wdHMpO1xuICAgICAgICB0aGlzLm1vZGVsID0gUXVpcE1vZGVsO1xuICAgICAgICB0aGlzLnVybCA9IFwiL2FwaS9xdWlwc1wiO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgUXVpcE1vZGVsLCBNeVF1aXBDb2xsZWN0aW9uIH1cbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls3LFwiPj0gNC4wLjBcIl0sXCJtYWluXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJjaGFuZ2Vsb2dcXFwiPlxcbiAgICA8aDI+Q2hhbmdlbG9nPC9oMj5cXG5cXG4gICAgPGgzPjIwMTYtMDEtMDE8L2gzPlxcbiAgICA8cD5cXG4gICAgICAgIFJlZmFjdG9yZWQgUHl0aG9uIGFuZCBCYWNrYm9uZSBjb2RlYmFzZSB0byBiZSBzaW1wbGVyLCBvcmdhbml6ZWQgYnktZmVhdHVyZSwgbW9yZSBNVkNpc2guXFxuICAgICAgICBTaG91bGQgbWFrZSBpdCBlYXNpZXIgYW5kIG1vcmUgcGxlYXNhbnQgdG8gYWRkIG5ldyBmZWF0dXJlcy5cXG4gICAgICAgIFRvb2sgYWJvdXQgYSBtb250aCB0byBwYXkgZG93biBhIGxvdCBvZiBleGlzdGluZyBkZWJ0IGFuZCBicmVhdGhlIHNvbWUgbmV3IGV4Y2l0ZW1lbnQgaW50byB0aGUgY29kZWJhc2UuXFxuICAgIDwvcD5cXG4gICAgPHA+T2gsIGFuZCBzdGFydGVkIHdvcmtpbmcgb24gU3RyZWFtcy9Hcm91cHMgc3VwcG9ydCEgOik8L3A+XFxuXFxuICAgIDxoMz4yMDE1LTEyLTA1PC9oMz5cXG5cXG4gICAgPHA+RGFyay10aGVtZSB3aXRoIHVuc3BsYXNoLmNvbSBiZyAtIGJlY2F1c2UgSSBvZnRlbiB3b3JrIG9uIHRoaXMgbGF0ZSBhdCBuaWdodC48L3A+XFxuXFxuICAgIDxwPk1vcmUgbW9iaWxlIGZyaWVuZGx5IGRlc2lnbi48L3A+XFxuXFxuICAgIDxwPlxcbiAgICAgICAgU3RvcHBlZCB0cnlpbmcgdG8gZ2V0IGF1ZGlvLXJlY29yZGluZyB0byB3b3JrIHdlbGwgb24gQW5kcm9pZCA0LnggYWZ0ZXIgYnVybmVpbmcgbWFueSB3ZWVrZW5kcyBhbmQgbmlnaHRzLlxcbiAgICAgICAgVGhlIGF1ZGlvIGdsaXRjaGVzIGV2ZW4gd2hlbiByZWNvcmRpbmcgcHVyZSBQQ00sIGEgcHJvYmxlbSBhdCB0aGUgV2ViIEF1ZGlvIGxldmVsLCBub3RoaW5nIEkgY2FuIGRvIGFib3V0IGl0LlxcbiAgICA8L3A+XFxuXFxuICAgIDxwPlxcbiAgICAgICAgRm91bmQgYSBmdW4gd29ya2Fyb3VuZCBtb2JpbGUgY2hyb21lJ3MgaW5hYmlsaXR5IHRvIHBsYXkgV2ViIEF1ZGlvIHJlY29yZGVkIHdhdmUgZmlsZXM6XFxuICAgICAgICBydW4gdGhlIGdlbmVyYXRlZCBibG9icyB0aHJvdWdoIGFuIGFqYXggcmVxdWVzdCwgbWFraW5nIHRoZSBibG9iIGRpc2stYmFja2VkIGxvY2FsbHksIG5vdyB0aGUgbG9jYWwgYmxvYlxcbiAgICAgICAgY2FuIGJlIHBhc3NlZCBpbnRvIGFuICZsdDthdWRpbyZndDsgcGxheWVyLlxcbiAgICA8L3A+XFxuXFxuICAgIDxwPkZvY3VzaW5nIG9uIG1ha2luZyB0aGUgbW9iaWxlIGxpc3RlbmluZyBleHBlcmllbmNlIGdyZWF0LjwvcD5cXG5cXG4gICAgPGgzPjIwMTUtMTAtMDQ8L2gzPlxcblxcbiAgICA8cD5TbGlnaHQgZmFjZWxpZnQsIHVzaW5nIGEgbmV3IGZsYXQgc3R5bGUuIEFkZGVkIGEgZmV3IGFuaW1hdGlvbnMgYW5kIHRoaXMgcHVibGljIGNoYW5nZWxvZyEgOik8L3A+XFxuXFxuICAgIDxoMz4yMDE1LTA5LTI2PC9oMz5cXG5cXG4gICAgPHA+RGVzaWduZWQgYSBsb2dvIGFuZCBjcmVhdGVkIGEgcHJldHR5IGxhbmRpbmctcGFnZSB3aXRoIHR3aXR0ZXItbG9naW4uPC9wPlxcblxcbiAgICA8cD5BZGRlZCBTZW50cnkgZm9yIEphdmFzY3JpcHQgZXJyb3IgY29sbGVjdGlvbiBhbmQgSGVhcCBBbmFseXRpY3MgZm9yIGNyZWF0aW5nIGFkLWhvYyBhbmFseXRpY3MuPC9wPlxcblxcbiAgICA8aDM+MjAxNS0wOS0yMDwvaDM+XFxuXFxuICAgIDxwPlNldHVwIHR3byBuZXcgc2VydmVycyBvbiBEaWdpdGFsIE9jZWFucyB3aXRoIFJvdXRlIDUzIHJvdXRpbmcgYW5kIGFuIFNTTCBjZXJ0aWZpY2F0ZSBmb3IgcHJvZHVjdGlvbi5cXG4gICAgICAgIEhhdmluZyBhbiBTU0wgY2VydGlmaWNhdGUgbWVhbnMgdGhlIHNpdGUgY2FuIGJlIGFjY2Vzc2VkIHZpYSBIVFRQUyB3aGljaCBhbGxvd3MgYnJvd3NlcnNcXG4gICAgICAgIHRvIGNhY2hlIHRoZSBNaWNyb3Bob25lIEFjY2VzcyBwZXJtaXNzaW9ucywgd2hpY2ggbWVhbnMgeW91IGRvbid0IGhhdmUgdG8gY2xpY2sgXFxcImFsbG93XFxcIiBldmVyeSB0aW1lXFxuICAgICAgICB5b3Ugd2FudCB0byBtYWtlIGEgcmVjb3JkaW5nITwvcD5cXG5cXG4gICAgPHA+Rml4ZWQgdXAgUHl0aG9uIEZhYnJpYyBkZXBsb3ltZW50IHNjcmlwdCB0byB3b3JrIGluIG5ldyBzdGFnaW5nICsgcHJvZHVjdGlvbiBlbnZpcm9ubWVudHMuXFxuICAgICAgICBBbmQgYWRkZWQgTW9uZ29EQiBiYWNrdXAvcmVzdG9yZSBzdXBwb3J0LjwvcD5cXG5cXG4gICAgPHA+VXBkYXRlZCBQeXRob24gZGVwZW5kZW5jaWVzLCB0aGV5IHdlcmUgb3ZlciBhIHllYXIgb2xkLCBhbmQgZml4ZWQgY29kZSB0aGF0IGJyb2tlIGFzIGEgcmVzdWx0LlxcbiAgICAgICAgTW9zdGx5IGFyb3VuZCBjaGFuZ2VzIHRvIE1vbmdvRW5naW5lIFB5dGhvbiBsaWIuPC9wPlxcblxcbiAgICA8aDM+MjAxNS0wOS0wNTwvaDM+XFxuXFxuICAgIDxwPkZpeGVkIHByb2plY3QgdG8gd29yayBvbiBPU1ggYW5kIHdpdGhvdXQgdGhlIE5HSU5YIGRlcGVuZGVuY3kuIEkgY2FuIG5vdyBydW4gaXQgYWxsIGluIHB5dGhvbixcXG4gICAgICAgIGluY2x1ZGluZyB0aGUgc3RhdGljIGZpbGUgaG9zdGluZy4gVGhlIHByb2R1Y3Rpb24gc2VydmVycyB1c2UgTkdJTlggZm9yIGJldHRlciBwZXJmb3JtYW5jZS48L3A+XFxuXFxuICAgIDxoMz4yMDE0LTAzLTI5PC9oMz5cXG5cXG4gICAgPHA+UmVxdWVzdCBNZWRpYSBTdHJlYW1pbmcgcGVybWlzc2lvbiBmcm9tIGJyb3dzZXIgb24gcmVjb3JkaW5nLXBhZ2UgbG9hZC4gVGhpcyBtYWtlcyB0aGUgbWljcm9waG9uZVxcbiAgICAgICAgYXZhaWxhYmxlIHRoZSBpbnN0YW50IHlvdSBoaXQgdGhlIHJlY29yZCBidXR0b24uIE5vIG5lZWQgdG8gaGl0IHJlY29yZCBidXR0b24gYW5kIHRoZW4gZGVhbCB3aXRoIGJyb3dzZXInc1xcbiAgICAgICAgc2VjdXJpdHkgcG9wdXBzIGFza2luZyBmb3IgcGVybWlzc2lvbiB0byBhY2Nlc3MgbWljcm9waG9uZS48L3A+XFxuXFxuICAgIDxwPlJlbW92ZWQgY291bnRkb3duIGNsb2NrIHVudGlsbCByZWNvcmRpbmcgYmVnaW5zLCB0aGUgXFxcIjMtMi0xIGdvXFxcIiB3YXNuJ3QgdGhhdCBoZWxwZnVsLjwvcD5cXG5cXG4gICAgPGgzPjIwMTQtMDMtMjc8L2gzPlxcblxcbiAgICA8cD5GaXhlZCBidWcgaW4gdHJhY2tpbmcgd2hlcmUgeW91IHBhdXNlZCBpbiB0aGUgcGxheWJhY2sgb2YgYSByZWNvcmRpbmcuIE5vdyB5b3Ugc2hvdWxkIGJlIGFibGUgdG9cXG4gICAgICAgIHJlc3VtZSBwbGF5YmFjayBleGFjdGx5IHdoZXJlIHlvdSBsZWZ0IG9mZi4gOik8L3A+XFxuXFxuPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9DaGFuZ2Vsb2dWaWV3LmhicydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2hhbmdlbG9nVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiSW5pdGlhbGl6aW5nIGNoYW5nZWxvZyB2aWV3XCIpO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZW5kZXJpbmcgY2hhbmdlbG9nIHZpZXdcIik7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGVtcGxhdGUoKSk7XG4gICAgfVxufVxuIiwiaW1wb3J0ICogYXMgVmlld3MgZnJvbSAnLi9WaWV3cydcblxuaW1wb3J0IFN0cmVhbUNvbnRyb2xsZXIgZnJvbSAnLi9TdHJlYW1zL1N0cmVhbUNvbnRyb2xsZXIuanMnXG5pbXBvcnQgUmVjb3JkZXJDb250cm9sbGVyIGZyb20gJy4vUmVjb3JkZXIvUmVjb3JkZXJDb250cm9sbGVyJ1xuXG5leHBvcnQgY2xhc3MgSG9tZUNvbnRyb2xsZXIge1xuICAgIGNvbnN0cnVjdG9yKHByZXNlbnRlcikge1xuICAgICAgICBwcmVzZW50ZXIuc3dpdGNoVmlldyhuZXcgVmlld3MuSG9tZXBhZ2VWaWV3KCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFVzZXJDb250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihwcmVzZW50ZXIsIHVzZXJuYW1lKSB7XG4gICAgICAgIHByZXNlbnRlci5zd2l0Y2hWaWV3KG5ldyBWaWV3cy5Vc2VyUG9kQ29sbGVjdGlvblZpZXcodXNlcm5hbWUpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDaGFuZ2Vsb2dDb250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihwcmVzZW50ZXIpIHtcbiAgICAgICAgcHJlc2VudGVyLnN3aXRjaFZpZXcobmV3IFZpZXdzLkNoYW5nZWxvZ1ZpZXcoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgU2luZ2xlUG9kQ29udHJvbGxlciB7XG4gICAgY29uc3RydWN0b3IocHJlc2VudGVyLCBpZCkge1xuICAgICAgICBwcmVzZW50ZXIuc3dpdGNoVmlldyhuZXcgVmlld3MuVXNlclBvZFZpZXcoaWQpKTtcbiAgICB9XG59XG5cbmV4cG9ydCB7IFN0cmVhbUNvbnRyb2xsZXIsIFJlY29yZGVyQ29udHJvbGxlciB9XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNyxcIj49IDQuMC4wXCJdLFwibWFpblwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz1cXFwibS1taWNyb3Bob25lLXJlcXVpcmVkXFxcIj5cXG4gICAgPGgyPk1pY3JvcGhvbmUgcmVxdWlyZWQuPC9oMj5cXG48L2Rpdj5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcbmltcG9ydCB7IEF1ZGlvQ2FwdHVyZSB9IGZyb20gJy4uLy4uL2F1ZGlvLWNhcHR1cmUnXG5pbXBvcnQgeyBDcmVhdGVSZWNvcmRpbmdNb2RlbCB9IGZyb20gJy4uLy4uL21vZGVscy9DcmVhdGVSZWNvcmRpbmdNb2RlbCdcblxuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vR2V0TWljcm9waG9uZS5oYnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEdldE1pY3JvcGhvbmVWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7fVxuICAgIH1cblxuICAgIGV2ZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHt9XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlbmRlcmluZyByZWNvcmRlciBjb250cm9sXCIpO1xuICAgICAgICB0aGlzLiRlbC5odG1sKHRlbXBsYXRlKHRoaXMubW9kZWwudG9KU09OKCkpKTtcbiAgICB9XG5cbiAgICBidWlsZChtb2RlbCkge1xuICAgICAgICB0aGlzLm1vZGVsID0gbW9kZWw7XG5cbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUgPSBuZXcgQXVkaW9DYXB0dXJlKCk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcblxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRlZC1wcmV2aWV3XCIpO1xuICAgICAgICBpZiAodGhpcy5hdWRpb1BsYXllciA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhcImNhbiBwbGF5IHZvcmJpczogXCIsICEhdGhpcy5hdWRpb1BsYXllci5jYW5QbGF5VHlwZSAmJiBcIlwiICE9IHRoaXMuYXVkaW9QbGF5ZXIuY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwidm9yYmlzXCInKSk7XG5cbiAgICAgICAgLy90aGlzLmF1ZGlvUGxheWVyLmxvb3AgPSBcImxvb3BcIjtcbiAgICAgICAgLy90aGlzLmF1ZGlvUGxheWVyLmF1dG9wbGF5ID0gXCJhdXRvcGxheVwiO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiL2Fzc2V0cy9zb3VuZHMvYmVlcF9zaG9ydF9vbi5vZ2dcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG5cbiAgICAgICAgdGhpcy5tb2RlbC5vbignY2hhbmdlOnJlY29yZGluZ1RpbWUnLCBmdW5jdGlvbiAobW9kZWwsIHRpbWUpIHtcbiAgICAgICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikudGV4dCh0aW1lKTtcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBhdHRlbXB0IHRvIGZldGNoIG1lZGlhLXN0cmVhbSBvbiBwYWdlLWxvYWRcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUuZ3JhYk1pY3JvcGhvbmUob25NaWNyb3Bob25lR3JhbnRlZCwgb25NaWNyb3Bob25lRGVuaWVkKTtcbiAgICB9XG5cbiAgICBvbk1pY3JvcGhvbmVEZW5pZWQoKSB7XG4gICAgICAgIC8vIHNob3cgc2NyZWVuIGFza2luZyB1c2VyIGZvciBwZXJtaXNzaW9uXG4gICAgfVxuXG4gICAgb25NaWNyb3Bob25lR3JhbnRlZCgpIHtcbiAgICAgICAgLy8gc2hvdyByZWNvcmRlclxuICAgIH1cblxuICAgIGluaXRpYWxpemUob3B0aW9ucykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyVmlldyBpbml0XCIpO1xuICAgICAgICBuZXcgQ3JlYXRlUmVjb3JkaW5nTW9kZWwoKS5mZXRjaCgpXG4gICAgICAgICAgICAudGhlbihtb2RlbCA9PiB0aGlzLmJ1aWxkKG5ldyBDcmVhdGVSZWNvcmRpbmdNb2RlbChtb2RlbCkpKTtcblxuXG4gICAgICAgIC8vIFRPRE86IGEgcHJldHR5IGFkdmFuY2VkIGJ1dCBuZWF0IGZlYXR1cmUgbWF5IGJlIHRvIHN0b3JlIGEgYmFja3VwIGNvcHkgb2YgYSByZWNvcmRpbmcgbG9jYWxseSBpbiBjYXNlIG9mIGEgY3Jhc2ggb3IgdXNlci1lcnJvclxuICAgICAgICAvKlxuICAgICAgICAgLy8gY2hlY2sgaG93IG11Y2ggdGVtcG9yYXJ5IHN0b3JhZ2Ugc3BhY2Ugd2UgaGF2ZS4gaXQncyBhIGdvb2Qgd2F5IHRvIHNhdmUgcmVjb3JkaW5nIHdpdGhvdXQgbG9zaW5nIGl0XG4gICAgICAgICB3aW5kb3cud2Via2l0U3RvcmFnZUluZm8ucXVlcnlVc2FnZUFuZFF1b3RhKFxuICAgICAgICAgd2Via2l0U3RvcmFnZUluZm8uVEVNUE9SQVJZLFxuICAgICAgICAgZnVuY3Rpb24odXNlZCwgcmVtYWluaW5nKSB7XG4gICAgICAgICB2YXIgcm1iID0gKHJlbWFpbmluZyAvIDEwMjQgLyAxMDI0KS50b0ZpeGVkKDQpO1xuICAgICAgICAgdmFyIHVtYiA9ICh1c2VkIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoNCk7XG4gICAgICAgICBjb25zb2xlLmxvZyhcIlVzZWQgcXVvdGE6IFwiICsgdW1iICsgXCJtYiwgcmVtYWluaW5nIHF1b3RhOiBcIiArIHJtYiArIFwibWJcIik7XG4gICAgICAgICB9LCBmdW5jdGlvbihlKSB7XG4gICAgICAgICBjb25zb2xlLmxvZygnRXJyb3InLCBlKTtcbiAgICAgICAgIH1cbiAgICAgICAgICk7XG5cbiAgICAgICAgIGZ1bmN0aW9uIG9uRXJyb3JJbkZTKCkge1xuICAgICAgICAgdmFyIG1zZyA9ICcnO1xuXG4gICAgICAgICBzd2l0Y2ggKGUuY29kZSkge1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuUVVPVEFfRVhDRUVERURfRVJSOlxuICAgICAgICAgbXNnID0gJ1FVT1RBX0VYQ0VFREVEX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLk5PVF9GT1VORF9FUlI6XG4gICAgICAgICBtc2cgPSAnTk9UX0ZPVU5EX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLlNFQ1VSSVRZX0VSUjpcbiAgICAgICAgIG1zZyA9ICdTRUNVUklUWV9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5JTlZBTElEX01PRElGSUNBVElPTl9FUlI6XG4gICAgICAgICBtc2cgPSAnSU5WQUxJRF9NT0RJRklDQVRJT05fRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuSU5WQUxJRF9TVEFURV9FUlI6XG4gICAgICAgICBtc2cgPSAnSU5WQUxJRF9TVEFURV9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgbXNnID0gJ1Vua25vd24gRXJyb3InO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICB9XG5cbiAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcjogJyArIG1zZyk7XG4gICAgICAgICB9XG5cbiAgICAgICAgIHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbSAgPSB3aW5kb3cucmVxdWVzdEZpbGVTeXN0ZW0gfHwgd2luZG93LndlYmtpdFJlcXVlc3RGaWxlU3lzdGVtO1xuXG4gICAgICAgICB3aW5kb3cucmVxdWVzdEZpbGVTeXN0ZW0od2luZG93LlRFTVBPUkFSWSwgNSAqIDEwMjQgKiAxMDI0LCBmdW5jdGlvbiBvblN1Y2Nlc3MoZnMpIHtcblxuICAgICAgICAgY29uc29sZS5sb2coJ29wZW5pbmcgZmlsZScpO1xuXG4gICAgICAgICBmcy5yb290LmdldEZpbGUoXCJ0ZXN0XCIsIHtjcmVhdGU6dHJ1ZX0sIGZ1bmN0aW9uKGZlKSB7XG5cbiAgICAgICAgIGNvbnNvbGUubG9nKCdzcGF3bmVkIHdyaXRlcicpO1xuXG4gICAgICAgICBmZS5jcmVhdGVXcml0ZXIoZnVuY3Rpb24oZncpIHtcblxuICAgICAgICAgZncub253cml0ZWVuZCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZSBjb21wbGV0ZWQnKTtcbiAgICAgICAgIH07XG5cbiAgICAgICAgIGZ3Lm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICBjb25zb2xlLmxvZygnd3JpdGUgZmFpbGVkOiAnICsgZS50b1N0cmluZygpKTtcbiAgICAgICAgIH07XG5cbiAgICAgICAgIGNvbnNvbGUubG9nKCd3cml0aW5nIGJsb2IgdG8gZmlsZS4uJyk7XG5cbiAgICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoWyd5ZWggdGhpcyBpcyBhIHRlc3QhJ10sIHt0eXBlOiAndGV4dC9wbGFpbid9KTtcbiAgICAgICAgIGZ3LndyaXRlKGJsb2IpO1xuXG4gICAgICAgICB9LCBvbkVycm9ySW5GUyk7XG5cbiAgICAgICAgIH0sIG9uRXJyb3JJbkZTKTtcblxuICAgICAgICAgfSwgb25FcnJvckluRlMpO1xuICAgICAgICAgKi9cbiAgICB9XG5cbiAgICB0b2dnbGUoZXZlbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuc3RvcFJlY29yZGluZygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0UmVjb3JkaW5nKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjYW5jZWxSZWNvcmRpbmcoZXZlbnQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgY2FuY2VsaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgJChcIiNyZWNvcmRlci1mdWxsXCIpLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikuYWRkQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikucmVtb3ZlQ2xhc3MoXCJmbGlwcGVkXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiXCI7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgMyk7XG4gICAgfVxuXG4gICAgdXBsb2FkUmVjb3JkaW5nKGV2ZW50KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IHVwbG9hZGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCJcIjtcblxuICAgICAgICAkKFwiI3JlY29yZGVyLWZ1bGxcIikuYWRkQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLWNvbnRhaW5lclwiKS5yZW1vdmVDbGFzcyhcImZsaXBwZWRcIik7XG5cbiAgICAgICAgdmFyIGRlc2NyaXB0aW9uID0gJCgndGV4dGFyZWFbbmFtZT1kZXNjcmlwdGlvbl0nKVswXS52YWx1ZTtcblxuICAgICAgICB2YXIgZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgICBkYXRhLmFwcGVuZCgnZGVzY3JpcHRpb24nLCBkZXNjcmlwdGlvbik7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdpc1B1YmxpYycsIDEpO1xuICAgICAgICBkYXRhLmFwcGVuZCgnYXVkaW8tYmxvYicsIHRoaXMuYXVkaW9CbG9iKTtcblxuICAgICAgICAvLyBzZW5kIHJhdyBibG9iIGFuZCBtZXRhZGF0YVxuXG4gICAgICAgIC8vIFRPRE86IGdldCBhIHJlcGxhY2VtZW50IGFqYXggbGlicmFyeSAobWF5YmUgcGF0Y2ggcmVxd2VzdCB0byBzdXBwb3J0IGJpbmFyeT8pXG4gICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgeGhyLm9wZW4oJ3Bvc3QnLCAnL3JlY29yZGluZy9jcmVhdGUnLCB0cnVlKTtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgIHhoci51cGxvYWQub25wcm9ncmVzcyA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB2YXIgcGVyY2VudCA9ICgoZS5sb2FkZWQgLyBlLnRvdGFsKSAqIDEwMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicGVyY2VudGFnZTogXCIgKyBwZXJjZW50KTtcbiAgICAgICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikuZmluZChcIi5iYXJcIikuY3NzKCd3aWR0aCcsIHBlcmNlbnQpO1xuICAgICAgICB9O1xuICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikuZmluZChcIi5iYXJcIikuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBtYW51YWwgeGhyIHN1Y2Nlc3NmdWxcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IG1hbnVhbCB4aHIgZXJyb3JcIiwgeGhyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInhoci5yZXNwb25zZVwiLCB4aHIucmVzcG9uc2UpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZXN1bHRcIiwgcmVzdWx0KTtcblxuICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlc3VsdC51cmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhoci5zZW5kKGRhdGEpO1xuICAgIH1cblxuICAgIG9uUmVjb3JkaW5nVGljaygpIHtcbiAgICAgICAgdmFyIHRpbWVTcGFuID0gcGFyc2VJbnQoKChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHRoaXMudGltZXJTdGFydCkgLyAxMDAwKS50b0ZpeGVkKCkpO1xuICAgICAgICB2YXIgdGltZVN0ciA9IHRoaXMuSW50VG9UaW1lKHRpbWVTcGFuKTtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aW1lU3RyKTtcbiAgICB9XG5cbiAgICBvbkNvdW50ZG93blRpY2soKSB7XG4gICAgICAgIGlmICgtLXRoaXMudGltZXJTdGFydCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGhpcy50aW1lclN0YXJ0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY291bnRkb3duIGhpdCB6ZXJvLiBiZWdpbiByZWNvcmRpbmcuXCIpO1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVySWQpO1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLkludFRvVGltZSgwKSk7XG4gICAgICAgICAgICB0aGlzLm9uTWljUmVjb3JkaW5nKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdGFydFJlY29yZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJzdGFydGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlLnN0YXJ0KCgpID0+IHRoaXMub25NaWNSZWFkeSgpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNaWNyb3Bob25lIGlzIHJlYWR5IHRvIHJlY29yZC4gRG8gYSBjb3VudC1kb3duLCB0aGVuIHNpZ25hbCBmb3IgaW5wdXQtc2lnbmFsIHRvIGJlZ2luIHJlY29yZGluZ1xuICAgICAqL1xuICAgIG9uTWljUmVhZHkoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibWljIHJlYWR5IHRvIHJlY29yZC4gZG8gY291bnRkb3duLlwiKTtcbiAgICAgICAgdGhpcy50aW1lclN0YXJ0ID0gMztcbiAgICAgICAgLy8gcnVuIGNvdW50ZG93blxuICAgICAgICAvL3RoaXMudGltZXJJZCA9IHNldEludGVydmFsKHRoaXMub25Db3VudGRvd25UaWNrLmJpbmQodGhpcyksIDEwMDApO1xuXG4gICAgICAgIC8vIG9yIGxhdW5jaCBjYXB0dXJlIGltbWVkaWF0ZWx5XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGhpcy5JbnRUb1RpbWUoMCkpO1xuICAgICAgICB0aGlzLm9uTWljUmVjb3JkaW5nKCk7XG5cbiAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS5hZGRDbGFzcyhcImlzLXZpc2libGVcIik7XG4gICAgfVxuXG4gICAgb25NaWNSZWNvcmRpbmcoKSB7XG4gICAgICAgIHRoaXMudGltZXJTdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICB0aGlzLnRpbWVySWQgPSBzZXRJbnRlcnZhbCh0aGlzLm9uUmVjb3JkaW5nVGljay5iaW5kKHRoaXMpLCAxMDAwKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1zY3JlZW5cIikuYWRkQ2xhc3MoXCJpcy1yZWNvcmRpbmdcIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJNaWMgcmVjb3JkaW5nIHN0YXJ0ZWRcIik7XG5cbiAgICAgICAgLy8gVE9ETzogdGhlIG1pYyBjYXB0dXJlIGlzIGFscmVhZHkgYWN0aXZlLCBzbyBhdWRpbyBidWZmZXJzIGFyZSBnZXR0aW5nIGJ1aWx0IHVwXG4gICAgICAgIC8vIHdoZW4gdG9nZ2xpbmcgdGhpcyBvbiwgd2UgbWF5IGFscmVhZHkgYmUgY2FwdHVyaW5nIGEgYnVmZmVyIHRoYXQgaGFzIGF1ZGlvIHByaW9yIHRvIHRoZSBjb3VudGRvd25cbiAgICAgICAgLy8gaGl0dGluZyB6ZXJvLiB3ZSBjYW4gZG8gYSBmZXcgdGhpbmdzIGhlcmU6XG4gICAgICAgIC8vIDEpIGZpZ3VyZSBvdXQgaG93IG11Y2ggYXVkaW8gd2FzIGFscmVhZHkgY2FwdHVyZWQsIGFuZCBjdXQgaXQgb3V0XG4gICAgICAgIC8vIDIpIHVzZSBhIGZhZGUtaW4gdG8gY292ZXIgdXAgdGhhdCBzcGxpdC1zZWNvbmQgb2YgYXVkaW9cbiAgICAgICAgLy8gMykgYWxsb3cgdGhlIHVzZXIgdG8gZWRpdCBwb3N0LXJlY29yZCBhbmQgY2xpcCBhcyB0aGV5IHdpc2ggKGJldHRlciBidXQgbW9yZSBjb21wbGV4IG9wdGlvbiEpXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5hdWRpb0NhcHR1cmUudG9nZ2xlTWljcm9waG9uZVJlY29yZGluZyh0cnVlKSwgNTAwKTtcbiAgICB9XG5cbiAgICBzdG9wUmVjb3JkaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInN0b3BwaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVySWQpO1xuXG4gICAgICAgIC8vIHBsYXkgc291bmQgaW1tZWRpYXRlbHkgdG8gYnlwYXNzIG1vYmlsZSBjaHJvbWUncyBcInVzZXIgaW5pdGlhdGVkIG1lZGlhXCIgcmVxdWlyZW1lbnRcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIi9hc3NldHMvc291bmRzL2JlZXBfc2hvcnRfb24ub2dnXCI7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlLnN0b3AoKGJsb2IpID0+IHRoaXMub25SZWNvcmRpbmdDb21wbGV0ZWQoYmxvYikpO1xuXG4gICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikucmVtb3ZlQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLXNjcmVlblwiKS5yZW1vdmVDbGFzcyhcImlzLXJlY29yZGluZ1wiKTtcblxuICAgICAgICAvLyBUT0RPOiBhbmltYXRlIHJlY29yZGVyIG91dFxuICAgICAgICAvLyBUT0RPOiBhbmltYXRlIHVwbG9hZGVyIGluXG4gICAgfVxuXG4gICAgb25SZWNvcmRpbmdDb21wbGV0ZWQoYmxvYikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBwcmV2aWV3aW5nIHJlY29yZGVkIGF1ZGlvXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQmxvYiA9IGJsb2I7XG4gICAgICAgIHRoaXMuc2hvd0NvbXBsZXRpb25TY3JlZW4oKTtcbiAgICB9XG5cbiAgICBwbGF5UHJldmlldygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJwbGF5aW5nIHByZXZpZXcuLlwiKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJhdWRpbyBibG9iXCIsIHRoaXMuYXVkaW9CbG9iKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJhdWRpbyBibG9iIHVybFwiLCB0aGlzLmF1ZGlvQmxvYlVybCk7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gdGhpcy5hdWRpb0Jsb2JVcmw7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuICAgIH1cblxuICAgIHNob3dDb21wbGV0aW9uU2NyZWVuKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBmbGlwcGluZyB0byBhdWRpbyBwbGF5YmFja1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0Jsb2JVcmwgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTCh0aGlzLmF1ZGlvQmxvYik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLmFkZENsYXNzKFwiZmxpcHBlZFwiKTtcblxuICAgICAgICAvLyBIQUNLOiByb3V0ZSBibG9iIHRocm91Z2ggeGhyIHRvIGxldCBBbmRyb2lkIENocm9tZSBwbGF5IGJsb2JzIHZpYSA8YXVkaW8+XG4gICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHRoaXMuYXVkaW9CbG9iVXJsLCB0cnVlKTtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJztcbiAgICAgICAgeGhyLm92ZXJyaWRlTWltZVR5cGUoJ2F1ZGlvL29nZycpO1xuXG4gICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQgJiYgeGhyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICB2YXIgeGhyQmxvYlVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHhoci5yZXNwb25zZSk7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkxvYWRlZCBibG9iIGZyb20gY2FjaGUgdXJsOiBcIiArIHRoaXMuYXVkaW9CbG9iVXJsKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJvdXRlZCBpbnRvIGJsb2IgdXJsOiBcIiArIHhockJsb2JVcmwpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSB4aHJCbG9iVXJsO1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB4aHIuc2VuZCgpO1xuICAgIH1cbn1cbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIE1pY3JvcGhvbmVQZXJtaXNzaW9ucyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMubWljcm9waG9uZU1lZGlhU3RyZWFtID0gbnVsbDtcbiAgICB9XG5cbiAgICBoYXZlTWljcm9waG9uZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWljcm9waG9uZU1lZGlhU3RyZWFtICE9IG51bGwgPyB0cnVlIDogZmFsc2U7XG4gICAgfVxuXG4gICAgc2V0TWljcm9waG9uZShtcykge1xuICAgICAgICB0aGlzLm1pY3JvcGhvbmVNZWRpYVN0cmVhbSA9IG1zO1xuICAgIH1cblxuICAgIGdyYWJNaWNyb3Bob25lKG9uTWljcm9waG9uZUdyYW50ZWQsIG9uTWljcm9waG9uZURlbmllZCkge1xuICAgICAgICBpZiAodGhpcy5oYXZlTWljcm9waG9uZSgpKSB7XG4gICAgICAgICAgICBvbk1pY3JvcGhvbmVHcmFudGVkKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VcbiAgICAgICAgICAgIC5nZXRVc2VyTWVkaWEoe2F1ZGlvOiB0cnVlfSlcbiAgICAgICAgICAgIC50aGVuKChtcykgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0TWljcm9waG9uZShtcyk7XG4gICAgICAgICAgICAgICAgb25NaWNyb3Bob25lR3JhbnRlZChtcyk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnQoKTsgY291bGQgbm90IGdyYWIgbWljcm9waG9uZS4gcGVyaGFwcyB1c2VyIGRpZG4ndCBnaXZlIHVzIHBlcm1pc3Npb24/XCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihlcnIpO1xuICAgICAgICAgICAgICAgIG9uTWljcm9waG9uZURlbmllZChlcnIpO1xuICAgICAgICAgICAgfSlcbiAgICB9XG59XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgUXVpcFZpZXcgZnJvbSAnLi4vLi4vcGFydGlhbHMvUXVpcFZpZXcuanMnXG5pbXBvcnQgeyBBdWRpb1BsYXllciB9IGZyb20gJy4uLy4uL3BhcnRpYWxzL0F1ZGlvUGxheWVyVmlldydcbmltcG9ydCB7IFF1aXBNb2RlbCwgTXlRdWlwQ29sbGVjdGlvbiB9IGZyb20gJy4uLy4uL21vZGVscy9RdWlwJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIb21lcGFnZVZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBuZXcgTXlRdWlwQ29sbGVjdGlvbigpLmZldGNoKCkudGhlbihxdWlwcyA9PiB0aGlzLm9uUXVpcHNMb2FkZWQocXVpcHMpKVxuICAgIH1cblxuICAgIHNodXRkb3duKCkge1xuICAgICAgICBpZiAodGhpcy5xdWlwVmlld3MgIT0gbnVsbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgcXVpcCBvZiB0aGlzLnF1aXBWaWV3cykge1xuICAgICAgICAgICAgICAgIHF1aXAuc2h1dGRvd24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCJwYXVzZVwiKTtcbiAgICB9XG5cbiAgICBvblF1aXBzTG9hZGVkKHF1aXBzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibG9hZGVkIHF1aXBzXCIsIHF1aXBzKTtcblxuICAgICAgICB0aGlzLnF1aXBWaWV3cyA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIHF1aXAgb2YgcXVpcHMpIHtcbiAgICAgICAgICAgIHZhciBxdWlwVmlldyA9IG5ldyBRdWlwVmlldyh7bW9kZWw6IG5ldyBRdWlwTW9kZWwocXVpcCl9KTtcbiAgICAgICAgICAgIHRoaXMucXVpcFZpZXdzLnB1c2gocXVpcFZpZXcpO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKHF1aXBWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCBNaWNyb3Bob25lUGVybWlzc2lvbnMgZnJvbSAnLi4vR2V0TWljcm9waG9uZS9NaWNyb3Bob25lUGVybWlzc2lvbnMnXG5pbXBvcnQgUmVjb3JkZXJWaWV3IGZyb20gJy4vUmVjb3JkZXJWaWV3J1xuaW1wb3J0IEdldE1pY3JvcGhvbmVWaWV3IGZyb20gJy4uL0dldE1pY3JvcGhvbmUvR2V0TWljcm9waG9uZVZpZXcnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY29yZGVyQ29udHJvbGxlciB7XG4gICAgY29uc3RydWN0b3IocHJlc2VudGVyKSB7XG4gICAgICAgIHRoaXMucHJlc2VudGVyID0gcHJlc2VudGVyO1xuICAgICAgICBuZXcgTWljcm9waG9uZVBlcm1pc3Npb25zKClcbiAgICAgICAgICAgIC5ncmFiTWljcm9waG9uZSgobXMpID0+IHRoaXMub25NaWNyb3Bob25lQWNxdWlyZWQobXMpLCAoKSA9PiB0aGlzLm9uTWljcm9waG9uZURlbmllZCgpKTtcbiAgICB9XG5cbiAgICBvbk1pY3JvcGhvbmVBY3F1aXJlZChtaWNyb3Bob25lTWVkaWFTdHJlYW0pIHtcbiAgICAgICAgdGhpcy5wcmVzZW50ZXIuc3dpdGNoVmlldyhuZXcgUmVjb3JkZXJWaWV3KG1pY3JvcGhvbmVNZWRpYVN0cmVhbSkpO1xuICAgIH1cblxuICAgIG9uTWljcm9waG9uZURlbmllZCgpIHtcbiAgICAgICAgdGhpcy5wcmVzZW50ZXIuc3dpdGNoVmlldyhuZXcgR2V0TWljcm9waG9uZVZpZXcoKSk7XG4gICAgfVxufVxuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIlwiO1xufSxcIjNcIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIiAgICAgICAgPGRpdiBjbGFzcz1cXFwibS1yZWNvcmRpbmctbW90aXZhdGlvblxcXCI+XFxuICAgICAgICAgICAgPGgxPlJlY29yZCB5b3VyIGZpcnN0IHBvZGNhc3QuPC9oMT5cXG5cXG4gICAgICAgICAgICA8cD5UYWtlcyBvbmx5IDMwIHNlY29uZHMuPC9wPlxcbiAgICAgICAgPC9kaXY+XFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNyxcIj49IDQuMC4wXCJdLFwibWFpblwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gXCI8YXVkaW8gaWQ9XFxcInJlY29yZGVkLXByZXZpZXdcXFwiIGNvbnRyb2xzPVxcXCJjb250cm9sc1xcXCI+PC9hdWRpbz5cXG5cXG48ZGl2IGNsYXNzPVxcXCJtLXF1aXBzLXNhbXBsZS1saXN0aW5nXFxcIj5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzW1wiaWZcIl0uY2FsbChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMCA6IHt9LChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5udW1fcmVjb3JkaW5ncyA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6Y29udGFpbmVyLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6Y29udGFpbmVyLnByb2dyYW0oMywgZGF0YSwgMCksXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwibS1yZWNvcmRpbmctY29udGFpbmVyXFxcIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY2FyZFxcXCI+XFxuXFxuICAgICAgICA8ZGl2IGlkPVxcXCJyZWNvcmRlci1mdWxsXFxcIiBjbGFzcz1cXFwibS1yZWNvcmRpbmctc2NyZWVuIGZhY2VcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgdGl0bGU9XFxcInRvZ2dsZSByZWNvcmRpbmdcXFwiIGNsYXNzPVxcXCJyZWNvcmRpbmctdG9nZ2xlXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbWljcm9waG9uZVxcXCI+PC9pPjwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcInJlY29yZGluZy10aW1lXFxcIj4zPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgIDxkaXYgaWQ9XFxcInJlY29yZGVyLXVwbG9hZGVyXFxcIiBjbGFzcz1cXFwibS1yZWNvcmRpbmctdXBsb2FkaW5nIGZhY2UgZGlzYWJsZWRcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcInVwbG9hZC1wcm9ncmVzc1xcXCI+XFxuICAgICAgICAgICAgICAgIDxoND5VcGxvYWRpbmc8L2g0PlxcblxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJwcm9ncmVzcy1iYXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFyXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgIDxkaXYgaWQ9XFxcInJlY29yZGVyLWRvbmVcXFwiIGNsYXNzPVxcXCJtLXJlY29yZGluZy1wcmV2aWV3IGZhY2UgYmFja1xcXCI+XFxuICAgICAgICAgICAgPGgxPlBvc3QgTmV3IFJlY29yZGluZzwvaDE+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RhdHNcXFwiPlxcbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtcGxheS1jaXJjbGVcXFwiPjwvaT5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImR1cmF0aW9uXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZGVzY3JpcHRpb25cXFwiPlxcbiAgICAgICAgICAgICAgICA8dGV4dGFyZWEgbmFtZT1cXFwiZGVzY3JpcHRpb25cXFwiIHBsYWNlaG9sZGVyPVxcXCJvcHRpb25hbCBkZXNjcmlwdGlvblxcXCI+PC90ZXh0YXJlYT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb250cm9sc1xcXCI+XFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJzcXVhcmUtYnRuIGJ0bi1wcmltYXJ5XFxcIiBpZD1cXFwidXBsb2FkLXJlY29yZGluZ1xcXCI+VXBsb2FkPC9hPlxcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cXFwic3F1YXJlLWJ0biBidG4tZGVmYXVsdFxcXCIgaWQ9XFxcInByZXZpZXctYnRuXFxcIj5QcmV2aWV3PC9hPlxcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cXFwic3F1YXJlLWJ0biBidG4tbGlua1xcXCIgaWQ9XFxcImNhbmNlbC1yZWNvcmRpbmdcXFwiPkRlbGV0ZSBhbmQgVHJ5IEFnYWluPC9hPlxcbiAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgIDwvZGl2PlxcblxcbjwvZGl2PlxcblwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJ1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vUmVjb3JkZXJWaWV3LmhicydcblxuaW1wb3J0IFF1aXBWaWV3IGZyb20gJy4uLy4uL3BhcnRpYWxzL1F1aXBWaWV3LmpzJ1xuaW1wb3J0IHsgQXVkaW9DYXB0dXJlIH0gZnJvbSAnLi4vLi4vYXVkaW8tY2FwdHVyZSdcbmltcG9ydCB7IENyZWF0ZVJlY29yZGluZ01vZGVsIH0gZnJvbSAnLi4vLi4vbW9kZWxzL0NyZWF0ZVJlY29yZGluZ01vZGVsJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWNvcmRlclZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICAvLyAgICBlbDogJy5tLXJlY29yZGluZy1jb250YWluZXInLFxuXG4gICAgSW50VG9UaW1lKHZhbHVlKSB7XG4gICAgICAgIHZhciBtaW51dGVzID0gTWF0aC5mbG9vcih2YWx1ZSAvIDYwKTtcbiAgICAgICAgdmFyIHNlY29uZHMgPSBNYXRoLnJvdW5kKHZhbHVlIC0gbWludXRlcyAqIDYwKTtcblxuICAgICAgICByZXR1cm4gKFwiMDBcIiArIG1pbnV0ZXMpLnN1YnN0cigtMikgKyBcIjpcIiArIChcIjAwXCIgKyBzZWNvbmRzKS5zdWJzdHIoLTIpO1xuICAgIH1cblxuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXVkaW9DYXB0dXJlOiBudWxsLFxuICAgICAgICAgICAgYXVkaW9CbG9iOiBudWxsLFxuICAgICAgICAgICAgYXVkaW9CbG9iVXJsOiBudWxsLFxuICAgICAgICAgICAgYXVkaW9QbGF5ZXI6IG51bGwsXG4gICAgICAgICAgICBpc1JlY29yZGluZzogZmFsc2UsXG4gICAgICAgICAgICB0aW1lcklkOiAwLFxuICAgICAgICAgICAgdGltZXJTdGFydDogM1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXZlbnRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJjbGljayAucmVjb3JkaW5nLXRvZ2dsZVwiOiBcInRvZ2dsZVwiLFxuICAgICAgICAgICAgXCJjbGljayAjY2FuY2VsLXJlY29yZGluZ1wiOiBcImNhbmNlbFJlY29yZGluZ1wiLFxuICAgICAgICAgICAgXCJjbGljayAjdXBsb2FkLXJlY29yZGluZ1wiOiBcInVwbG9hZFJlY29yZGluZ1wiLFxuICAgICAgICAgICAgXCJjbGljayAjcHJldmlldy1idG5cIjogXCJwbGF5UHJldmlld1wiXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGVtcGxhdGUodGhpcy5tb2RlbC50b0pTT04oKSkpO1xuICAgIH1cblxuICAgIGJ1aWxkKG1vZGVsKSB7XG4gICAgICAgIHRoaXMubW9kZWwgPSBtb2RlbDtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIm1vZGVsXCIsIG1vZGVsKTtcblxuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlY29yZGVkLXByZXZpZXdcIik7XG4gICAgICAgIGlmICh0aGlzLmF1ZGlvUGxheWVyID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJjYW4gcGxheSB2b3JiaXM6IFwiLCAhIXRoaXMuYXVkaW9QbGF5ZXIuY2FuUGxheVR5cGUgJiYgXCJcIiAhPSB0aGlzLmF1ZGlvUGxheWVyLmNhblBsYXlUeXBlKCdhdWRpby9vZ2c7IGNvZGVjcz1cInZvcmJpc1wiJykpO1xuXG4gICAgICAgIC8vIHBsYXkgYSBiZWVwXG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCIvYXNzZXRzL3NvdW5kcy9iZWVwX3Nob3J0X29uLm9nZ1wiO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcblxuICAgICAgICB0aGlzLm1vZGVsLm9uKCdjaGFuZ2U6cmVjb3JkaW5nVGltZScsIGZ1bmN0aW9uIChtb2RlbCwgdGltZSkge1xuICAgICAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS50ZXh0KHRpbWUpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIGluaXRpYWxpemUobWljcm9waG9uZU1lZGlhU3RyZWFtKSB7XG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlID0gbmV3IEF1ZGlvQ2FwdHVyZShtaWNyb3Bob25lTWVkaWFTdHJlYW0pO1xuXG4gICAgICAgIG5ldyBDcmVhdGVSZWNvcmRpbmdNb2RlbCgpLmZldGNoKClcbiAgICAgICAgICAgIC50aGVuKG1vZGVsID0+IHRoaXMuYnVpbGQobmV3IENyZWF0ZVJlY29yZGluZ01vZGVsKG1vZGVsKSkpO1xuXG4gICAgICAgIC8vIFRPRE86IHRyeSB1c2luZyB0aGUgbmV3IGZldGNoKCkgc3ludGF4IGluc3RlYWQgb2YgYmFja2JvbmUgbW9kZWxzXG4gICAgICAgIC8vZmV0Y2goXCIvYXBpL2NyZWF0ZV9yZWNvcmRpbmdcIiwge2NyZWRlbnRpYWxzOiAnaW5jbHVkZSd9KVxuICAgICAgICAvLyAgICAudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcbiAgICAgICAgLy8gICAgLnRoZW4oanNvbiA9PiB0aGlzLnN3aXRjaFZpZXcobmV3IFJlY29yZGVyVmlldyhqc29uKSkpO1xuICAgIH1cblxuICAgIHRvZ2dsZShldmVudCkge1xuICAgICAgICBpZiAodGhpcy5pc1JlY29yZGluZykge1xuICAgICAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5zdG9wUmVjb3JkaW5nKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRSZWNvcmRpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNhbmNlbFJlY29yZGluZyhldmVudCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBjYW5jZWxpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLWZ1bGxcIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLWNvbnRhaW5lclwiKS5yZW1vdmVDbGFzcyhcImZsaXBwZWRcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCJcIjtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCAzKTtcbiAgICB9XG5cbiAgICB1cGxvYWRSZWNvcmRpbmcoZXZlbnQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgdXBsb2FkaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuXG4gICAgICAgICQoXCIjcmVjb3JkZXItZnVsbFwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLnJlbW92ZUNsYXNzKFwiZmxpcHBlZFwiKTtcblxuICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSAkKCd0ZXh0YXJlYVtuYW1lPWRlc2NyaXB0aW9uXScpWzBdLnZhbHVlO1xuXG4gICAgICAgIHZhciBkYXRhID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdkZXNjcmlwdGlvbicsIGRlc2NyaXB0aW9uKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2lzUHVibGljJywgMSk7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdhdWRpby1ibG9iJywgdGhpcy5hdWRpb0Jsb2IpO1xuXG4gICAgICAgIC8vIHNlbmQgcmF3IGJsb2IgYW5kIG1ldGFkYXRhXG5cbiAgICAgICAgLy8gVE9ETzogZ2V0IGEgcmVwbGFjZW1lbnQgYWpheCBsaWJyYXJ5IChtYXliZSBwYXRjaCByZXF3ZXN0IHRvIHN1cHBvcnQgYmluYXJ5PylcbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbigncG9zdCcsICcvYXBpL3F1aXBzJywgdHJ1ZSk7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICB4aHIudXBsb2FkLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdmFyIHBlcmNlbnQgPSAoKGUubG9hZGVkIC8gZS50b3RhbCkgKiAxMDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInBlcmNlbnRhZ2U6IFwiICsgcGVyY2VudCk7XG4gICAgICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmZpbmQoXCIuYmFyXCIpLmNzcygnd2lkdGgnLCBwZXJjZW50KTtcbiAgICAgICAgfTtcbiAgICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmZpbmQoXCIuYmFyXCIpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgbWFudWFsIHhociBzdWNjZXNzZnVsXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBtYW51YWwgeGhyIGVycm9yXCIsIHhocik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2UpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ4aHIucmVzcG9uc2VcIiwgeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVzdWx0XCIsIHJlc3VsdCk7XG5cbiAgICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXN1bHQudXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB4aHIuc2VuZChkYXRhKTtcbiAgICB9XG5cbiAgICBvblJlY29yZGluZ1RpY2soKSB7XG4gICAgICAgIHZhciB0aW1lU3BhbiA9IHBhcnNlSW50KCgobmV3IERhdGUoKS5nZXRUaW1lKCkgLSB0aGlzLnRpbWVyU3RhcnQpIC8gMTAwMCkudG9GaXhlZCgpKTtcbiAgICAgICAgdmFyIHRpbWVTdHIgPSB0aGlzLkludFRvVGltZSh0aW1lU3Bhbik7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGltZVN0cik7XG4gICAgfVxuXG4gICAgc3RhcnRSZWNvcmRpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3RhcnRpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZS5zdGFydCgoKSA9PiB0aGlzLm9uUmVjb3JkaW5nU3RhcnRlZCgpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNaWNyb3Bob25lIGlzIHJlYWR5IHRvIHJlY29yZC4gRG8gYSBjb3VudC1kb3duLCB0aGVuIHNpZ25hbCBmb3IgaW5wdXQtc2lnbmFsIHRvIGJlZ2luIHJlY29yZGluZ1xuICAgICAqL1xuICAgIG9uUmVjb3JkaW5nU3RhcnRlZCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJtaWMgcmVhZHkgdG8gcmVjb3JkLiBkbyBjb3VudGRvd24uXCIpO1xuXG4gICAgICAgIC8vIG9yIGxhdW5jaCBjYXB0dXJlIGltbWVkaWF0ZWx5XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGhpcy5JbnRUb1RpbWUoMCkpO1xuICAgICAgICB0aGlzLm9uTWljUmVjb3JkaW5nKCk7XG5cbiAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS5hZGRDbGFzcyhcImlzLXZpc2libGVcIik7XG4gICAgfVxuXG4gICAgb25NaWNSZWNvcmRpbmcoKSB7XG4gICAgICAgIHRoaXMudGltZXJTdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICB0aGlzLnRpbWVySWQgPSBzZXRJbnRlcnZhbCh0aGlzLm9uUmVjb3JkaW5nVGljay5iaW5kKHRoaXMpLCAxMDAwKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1zY3JlZW5cIikuYWRkQ2xhc3MoXCJpcy1yZWNvcmRpbmdcIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJNaWMgcmVjb3JkaW5nIHN0YXJ0ZWRcIik7XG5cbiAgICAgICAgLy8gVE9ETzogdGhlIG1pYyBjYXB0dXJlIGlzIGFscmVhZHkgYWN0aXZlLCBzbyBhdWRpbyBidWZmZXJzIGFyZSBnZXR0aW5nIGJ1aWx0IHVwXG4gICAgICAgIC8vIHdoZW4gdG9nZ2xpbmcgdGhpcyBvbiwgd2UgbWF5IGFscmVhZHkgYmUgY2FwdHVyaW5nIGEgYnVmZmVyIHRoYXQgaGFzIGF1ZGlvIHByaW9yIHRvIHRoZSBjb3VudGRvd25cbiAgICAgICAgLy8gaGl0dGluZyB6ZXJvLiB3ZSBjYW4gZG8gYSBmZXcgdGhpbmdzIGhlcmU6XG4gICAgICAgIC8vIDEpIGZpZ3VyZSBvdXQgaG93IG11Y2ggYXVkaW8gd2FzIGFscmVhZHkgY2FwdHVyZWQsIGFuZCBjdXQgaXQgb3V0XG4gICAgICAgIC8vIDIpIHVzZSBhIGZhZGUtaW4gdG8gY292ZXIgdXAgdGhhdCBzcGxpdC1zZWNvbmQgb2YgYXVkaW9cbiAgICAgICAgLy8gMykgYWxsb3cgdGhlIHVzZXIgdG8gZWRpdCBwb3N0LXJlY29yZCBhbmQgY2xpcCBhcyB0aGV5IHdpc2ggKGJldHRlciBidXQgbW9yZSBjb21wbGV4IG9wdGlvbiEpXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5hdWRpb0NhcHR1cmUudG9nZ2xlTWljcm9waG9uZVJlY29yZGluZyh0cnVlKSwgMjAwKTtcbiAgICB9XG5cbiAgICBzdG9wUmVjb3JkaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInN0b3BwaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVySWQpO1xuXG4gICAgICAgIC8vIHBsYXkgc291bmQgaW1tZWRpYXRlbHkgdG8gYnlwYXNzIG1vYmlsZSBjaHJvbWUncyBcInVzZXIgaW5pdGlhdGVkIG1lZGlhXCIgcmVxdWlyZW1lbnRcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIi9hc3NldHMvc291bmRzL2JlZXBfc2hvcnRfb2ZmLm9nZ1wiO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcblxuICAgICAgICAvLyByZXF1ZXN0IHJlY29yZGluZyBzdG9wXG4gICAgICAgIC8vIHdhaXQgZm9yIHN5bmMgdG8gY29tcGxldGVcbiAgICAgICAgLy8gYW5kIHRoZW4gY2FsbGJhY2sgdHJhbnNpdGlvbiB0byBuZXh0IHNjcmVlblxuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZS5zdG9wKChibG9iKSA9PiB0aGlzLm9uUmVjb3JkaW5nQ29tcGxldGVkKGJsb2IpKTtcblxuICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLnJlbW92ZUNsYXNzKFwiaXMtdmlzaWJsZVwiKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1zY3JlZW5cIikucmVtb3ZlQ2xhc3MoXCJpcy1yZWNvcmRpbmdcIik7XG4gICAgfVxuXG4gICAgb25SZWNvcmRpbmdDb21wbGV0ZWQoYmxvYikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBwcmV2aWV3aW5nIHJlY29yZGVkIGF1ZGlvXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQmxvYiA9IGJsb2I7XG4gICAgICAgIHRoaXMuc2hvd0NvbXBsZXRpb25TY3JlZW4oKTtcbiAgICB9XG5cbiAgICBwbGF5UHJldmlldygpIHtcbiAgICAgICAgLy8gYXQgdGhpcyBwb2ludCBhIHBsYXlhYmxlIGF1ZGlvIGJsb2Igc2hvdWxkIGFscmVhZHkgYmUgbG9hZGVkIGluIGF1ZGlvUGxheWVyXG4gICAgICAgIC8vIHNvIGp1c3QgcGxheSBpdCBhZ2FpblxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcbiAgICB9XG5cbiAgICBzaG93Q29tcGxldGlvblNjcmVlbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgZmxpcHBpbmcgdG8gYXVkaW8gcGxheWJhY2tcIik7XG4gICAgICAgIHRoaXMuYXVkaW9CbG9iVXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwodGhpcy5hdWRpb0Jsb2IpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLWNvbnRhaW5lclwiKS5hZGRDbGFzcyhcImZsaXBwZWRcIik7XG5cbiAgICAgICAgdGhpcy5tYWtlQXVkaW9CbG9iVXJsUGxheWFibGUodGhpcy5hdWRpb0Jsb2JVcmwsIChwbGF5YWJsZUF1ZGlvQmxvYlVybCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBwbGF5YWJsZUF1ZGlvQmxvYlVybDtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIQUNLOiByb3V0ZSBibG9iIHRocm91Z2ggeGhyIHRvIGxldCBBbmRyb2lkIENocm9tZSBwbGF5IGJsb2JzIHZpYSA8YXVkaW8+XG4gICAgICogQHBhcmFtIGF1ZGlvQmxvYlVybCByZXByZXNlbnRpbmcgcG90ZW50aWFsbHkgbm9uLWRpc2stYmFja2VkIGJsb2IgdXJsXG4gICAgICogQHBhcmFtIGNhbGxiYWNrIGZ1bmN0aW9uIGFjY2VwdHMgYSBkaXNrLWJhY2tlZCBibG9iIHVybFxuICAgICAqL1xuICAgIG1ha2VBdWRpb0Jsb2JVcmxQbGF5YWJsZShhdWRpb0Jsb2JVcmwsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIHRoaXMgcmVxdWVzdCBoYXBwZW5zIG92ZXIgbG9vcGJhY2tcbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbignR0VUJywgYXVkaW9CbG9iVXJsLCB0cnVlKTtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJztcbiAgICAgICAgeGhyLm92ZXJyaWRlTWltZVR5cGUoJ2F1ZGlvL29nZycpO1xuXG4gICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQgJiYgeGhyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICB2YXIgeGhyQmxvYlVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHhoci5yZXNwb25zZSk7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkxvYWRlZCBibG9iIGZyb20gY2FjaGUgdXJsOiBcIiArIGF1ZGlvQmxvYlVybCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSb3V0ZWQgaW50byBibG9iIHVybDogXCIgKyB4aHJCbG9iVXJsKTtcblxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHhockJsb2JVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB4aHIuc2VuZCgpO1xuICAgIH1cbn1cbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgaGVscGVyLCBhbGlhczE9ZGVwdGgwICE9IG51bGwgPyBkZXB0aDAgOiB7fSwgYWxpYXMyPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMzPVwiZnVuY3Rpb25cIiwgYWxpYXM0PWNvbnRhaW5lci5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIHJldHVybiBcIiAgICAgICAgPGEgaHJlZj1cXFwiL3N0cmVhbXMvXCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmlkIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5pZCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwiaWRcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiBjbGFzcz1cXFwic3RyZWFtXFxcIj5cXG4gICAgICAgICAgICBcIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMubmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwibmFtZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXG4gICAgICAgIDwvYT5cXG5cIjtcbn0sXCJjb21waWxlclwiOls3LFwiPj0gNC4wLjBcIl0sXCJtYWluXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXIsIGFsaWFzMT1kZXB0aDAgIT0gbnVsbCA/IGRlcHRoMCA6IHt9O1xuXG4gIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcIm0tY3JlYXRlLXN0cmVhbVxcXCI+XFxuICAgIDxmb3JtPlxcbiAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJmaWVsZFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwic3RyZWFtTmFtZVxcXCIgcGxhY2Vob2xkZXI9XFxcIlN0cmVhbSBOYW1lXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGNvbnRhaW5lci5lc2NhcGVFeHByZXNzaW9uKCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuc3RyZWFtTmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuc3RyZWFtTmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBcImZ1bmN0aW9uXCIgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwic3RyZWFtTmFtZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiLz5cXG5cXG4gICAgICAgIDxoMz5Qcml2YWN5PC9oMz5cXG5cXG4gICAgICAgIDxsYWJlbCBmb3I9XFxcInByaXZhY3ktcHVibGljXFxcIj5cXG4gICAgICAgICAgICA8aW5wdXQgaWQ9XFxcInByaXZhY3ktcHVibGljXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgbmFtZT1cXFwicHJpdmFjeVxcXCIgdmFsdWU9XFxcInB1YmxpY1xcXCIgY2hlY2tlZC8+XFxuICAgICAgICAgICAgPGI+UHVibGljPC9iPiAtIEFueW9uZSBjYW4gZm9sbG93IHRoaXMgc3RyZWFtXFxuICAgICAgICA8L2xhYmVsPlxcbiAgICAgICAgPGJyPlxcbiAgICAgICAgPGxhYmVsIGZvcj1cXFwicHJpdmFjeS1wcml2YXRlXFxcIj5cXG4gICAgICAgICAgICA8aW5wdXQgaWQ9XFxcInByaXZhY3ktcHJpdmF0ZVxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIG5hbWU9XFxcInByaXZhY3lcXFwiIHZhbHVlPVxcXCJwcml2YXRlXFxcIi8+XFxuICAgICAgICAgICAgPGI+UHJpdmF0ZTwvYj4gLSBPbmx5IHRob3NlIHlvdSBpbnZpdGUgY2FuIGZvbGxvdyB0aGlzIHN0cmVhbS5cXG4gICAgICAgIDwvbGFiZWw+XFxuICAgICAgICA8YnI+XFxuICAgICAgICA8YnI+XFxuXFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJzcXVhcmUtYnRuIGJ0bi1zdWNjZXNzXFxcIiBuYW1lPVxcXCJzdWJtaXRcXFwiPkNyZWF0ZTwvYnV0dG9uPlxcbiAgICA8L2Zvcm0+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwibS1saXN0LXN0cmVhbXNcXFwiPlxcbiAgICA8aDM+U3RyZWFtczwvaDM+XFxuXCJcbiAgICArICgoc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoYWxpYXMxLChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5zdHJlYW1zIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJlYWNoXCIsXCJoYXNoXCI6e30sXCJmblwiOmNvbnRhaW5lci5wcm9ncmFtKDEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOmNvbnRhaW5lci5ub29wLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIjwvZGl2PlxcblwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9DcmVhdGVTdHJlYW0uaGJzJ1xuaW1wb3J0ICdiYWNrYm9uZS1iaW5kaW5ncydcbmltcG9ydCAnYmFja2JvbmUuZXBveHknXG5cbmNsYXNzIFN0cmVhbU1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RyZWFtTmFtZTogXCJcIixcbiAgICAgICAgICAgIHByaXZhY3k6IFwicHVibGljXCIsXG4gICAgICAgICAgICBzdHJlYW1zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBpZDogMSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJzdHJlYW0gMVwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBpZDogMixcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJzdHJlYW0gMlwiLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBjb21wdXRlZHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjYW5TdWJtaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldCgnc3RyZWFtTmFtZScpICE9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENyZWF0ZVN0cmVhbVZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5FcG94eS5WaWV3IHtcbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB0aGlzLm1vZGVsID0gbmV3IFN0cmVhbU1vZGVsKCk7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKFwic3RyZWFtLWRldGFpbHNcIik7XG4gICAgfVxuXG4gICAgZ2V0IGJpbmRpbmdzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJbbmFtZT1zdHJlYW1OYW1lXVwiOiBcInZhbHVlOnN0cmVhbU5hbWVcIixcbiAgICAgICAgICAgIFwiW25hbWU9cHJpdmFjeV1cIjogXCJjaGVja2VkOnByaXZhY3lcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGV2ZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwiY2xpY2sgLm0tY3JlYXRlLXN0cmVhbSBidXR0b25cIjogXCJvbkNyZWF0ZVN0cmVhbVwiLFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgb25DcmVhdGVTdHJlYW0oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwidGhpcyBtb2RlbFwiLCB0aGlzLm1vZGVsLmF0dHJpYnV0ZXMpO1xuXG4gICAgICAgIHZhciBzdHJlYW1OYW1lID0gdGhpcy5tb2RlbC5nZXQoXCJzdHJlYW1OYW1lXCIpO1xuICAgICAgICB2YXIgcHJpdmFjeSA9IHRoaXMubW9kZWwuZ2V0KFwicHJpdmFjeVwiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkNyZWF0aW5nIG5ldyBzdHJlYW0gbmFtZWQgXCIgKyBzdHJlYW1OYW1lICsgXCIgd2l0aCBwcml2YWN5ID0gXCIgKyBwcml2YWN5KTtcblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICB0aGlzLiRlbC5odG1sKHRlbXBsYXRlKHRoaXMubW9kZWwuYXR0cmlidXRlcykpO1xuICAgIH1cblxufVxuIiwiaW1wb3J0IENyZWF0ZVN0cmVhbVZpZXcgZnJvbSAnLi9DcmVhdGVTdHJlYW0nXG5pbXBvcnQgU3RyZWFtRGV0YWlsc1ZpZXcgZnJvbSAnLi9TdHJlYW1EZXRhaWxzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTdHJlYW1Db250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihwcmVzZW50ZXIpIHtcbiAgICAgICAgdGhpcy5wcmVzZW50ZXIgPSBwcmVzZW50ZXI7XG4gICAgfVxuXG4gICAgY3JlYXRlKCkge1xuICAgICAgICB0aGlzLnByZXNlbnRlci5zd2l0Y2hWaWV3KG5ldyBDcmVhdGVTdHJlYW1WaWV3KCkpO1xuICAgIH1cblxuICAgIGRldGFpbHMoaWQpIHtcbiAgICAgICAgdGhpcy5wcmVzZW50ZXIuc3dpdGNoVmlldyhuZXcgU3RyZWFtRGV0YWlsc1ZpZXcoaWQpKTtcbiAgICB9XG59XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNyxcIj49IDQuMC4wXCJdLFwibWFpblwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz1cXFwibS1zdHJlYW0tZGV0YWlsc1xcXCI+XFxuICAgIDxmb3JtPlxcbiAgICAgICAgPGgzPlN0cmVhbSBEZXRhaWxzPC9oMz5cXG4gICAgPC9mb3JtPlxcbjwvZGl2PlxcblwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9TdHJlYW1EZXRhaWxzLmhicydcbmltcG9ydCAnYmFja2JvbmUtYmluZGluZ3MnXG5pbXBvcnQgJ2JhY2tib25lLmVwb3h5J1xuaW1wb3J0IHsgUXVpcE1vZGVsLCBNeVF1aXBDb2xsZWN0aW9uIH0gZnJvbSAnLi4vLi4vbW9kZWxzL1F1aXAnXG5pbXBvcnQgUXVpcFZpZXcgZnJvbSAnLi4vLi4vcGFydGlhbHMvUXVpcFZpZXcuanMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0cmVhbURldGFpbHNWaWV3IGV4dGVuZHMgQmFja2JvbmUuRXBveHkuVmlldyB7XG4gICAgaW5pdGlhbGl6ZShpZCkge1xuICAgICAgICAvL3RoaXMubW9kZWwgPSBuZXcgU3RyZWFtTW9kZWwoKTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoXCJzdHJlYW0tZGV0YWlsc1wiKTtcbiAgICAgICAgbmV3IE15UXVpcENvbGxlY3Rpb24oKS5mZXRjaCgpLnRoZW4ocXVpcHMgPT4gdGhpcy5vblF1aXBzTG9hZGVkKHF1aXBzKSlcbiAgICB9XG5cbiAgICBvblF1aXBzTG9hZGVkKHF1aXBzKSB7XG4gICAgICAgIHRoaXMucXVpcFZpZXdzID0gW107XG5cbiAgICAgICAgZm9yICh2YXIgcXVpcCBvZiBxdWlwcykge1xuICAgICAgICAgICAgdmFyIHF1aXBWaWV3ID0gbmV3IFF1aXBWaWV3KHttb2RlbDogbmV3IFF1aXBNb2RlbChxdWlwKX0pO1xuICAgICAgICAgICAgdGhpcy5xdWlwVmlld3MucHVzaChxdWlwVmlldyk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQocXVpcFZpZXcuZWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2h1dGRvd24oKSB7XG4gICAgICAgIGlmICh0aGlzLnF1aXBWaWV3cyAhPSBudWxsKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBxdWlwIG9mIHRoaXMucXVpcFZpZXdzKSB7XG4gICAgICAgICAgICAgICAgcXVpcC5zaHV0ZG93bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGJpbmRpbmdzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLy9cIltuYW1lPXN0cmVhbU5hbWVdXCI6IFwidmFsdWU6c3RyZWFtTmFtZVwiLFxuICAgICAgICAgICAgLy9cIltuYW1lPXByaXZhY3ldXCI6IFwiY2hlY2tlZDpwcml2YWN5XCJcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBldmVudHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAvL1wiY2xpY2sgLm0tY3JlYXRlLXN0cmVhbSBidXR0b25cIjogXCJvbkNyZWF0ZVN0cmVhbVwiLFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgb25DcmVhdGVTdHJlYW0oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwidGhpcyBtb2RlbFwiLCB0aGlzLm1vZGVsLmF0dHJpYnV0ZXMpO1xuXG4gICAgICAgIHZhciBzdHJlYW1OYW1lID0gdGhpcy5tb2RlbC5nZXQoXCJzdHJlYW1OYW1lXCIpO1xuICAgICAgICB2YXIgcHJpdmFjeSA9IHRoaXMubW9kZWwuZ2V0KFwicHJpdmFjeVwiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkNyZWF0aW5nIG5ldyBzdHJlYW0gbmFtZWQgXCIgKyBzdHJlYW1OYW1lICsgXCIgd2l0aCBwcml2YWN5ID0gXCIgKyBwcml2YWN5KTtcblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICB0aGlzLiRlbC5odG1sKHRlbXBsYXRlKCkpO1xuICAgIH1cblxufVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0ICogYXMgVmlld3MgZnJvbSAnLi4vVmlld3MnXG5pbXBvcnQgeyBRdWlwTW9kZWwsIE15UXVpcENvbGxlY3Rpb24gfSBmcm9tICcuLi8uLi9tb2RlbHMvUXVpcCdcblxuY2xhc3MgVXNlclBvZENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uIHtcbiAgICBjb25zdHJ1Y3Rvcih1c2VybmFtZSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLm1vZGVsID0gUXVpcE1vZGVsO1xuICAgICAgICB0aGlzLnVzZXJuYW1lID0gdXNlcm5hbWU7XG4gICAgfVxuXG4gICAgdXJsKCkge1xuICAgICAgICByZXR1cm4gXCIvYXBpL3UvXCIgKyB0aGlzLnVzZXJuYW1lICsgXCIvcXVpcHNcIjtcbiAgICB9XG59XG5cbmNsYXNzIFVzZXJQb2RDb2xsZWN0aW9uVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGNvbnN0cnVjdG9yKHVzZXJuYW1lKSB7XG4gICAgICAgIHN1cGVyKHVzZXJuYW1lKTtcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKHVzZXJuYW1lKSB7XG4gICAgICAgIG5ldyBVc2VyUG9kQ29sbGVjdGlvbih1c2VybmFtZSlcbiAgICAgICAgICAgIC5mZXRjaCgpXG4gICAgICAgICAgICAudGhlbihxdWlwcyA9PiB0aGlzLmNyZWF0ZUNoaWxkVmlld3MocXVpcHMpKVxuICAgIH1cblxuICAgIHNodXRkb3duKCkge1xuICAgICAgICBBdWRpb1BsYXllci5wYXVzZSgpO1xuICAgICAgICB0aGlzLmRlc3Ryb3lDaGlsZFZpZXdzKCk7XG4gICAgfVxuXG4gICAgY3JlYXRlQ2hpbGRWaWV3cyhxdWlwcykge1xuICAgICAgICB0aGlzLnF1aXBWaWV3cyA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIHF1aXAgb2YgcXVpcHMpIHtcbiAgICAgICAgICAgIHZhciBxdWlwVmlldyA9IG5ldyBWaWV3cy5RdWlwVmlldyh7bW9kZWw6IG5ldyBRdWlwTW9kZWwocXVpcCl9KTtcbiAgICAgICAgICAgIHRoaXMucXVpcFZpZXdzLnB1c2gocXVpcFZpZXcpO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKHF1aXBWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRlc3Ryb3lDaGlsZFZpZXdzKCkge1xuICAgICAgICBpZiAodGhpcy5xdWlwVmlld3MgIT0gbnVsbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgcXVpcCBvZiB0aGlzLnF1aXBWaWV3cykge1xuICAgICAgICAgICAgICAgIHF1aXAuc2h1dGRvd24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IHsgVXNlclBvZENvbGxlY3Rpb24sIFVzZXJQb2RDb2xsZWN0aW9uVmlldyB9XG5cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCAqIGFzIFZpZXdzIGZyb20gJy4uL1ZpZXdzJ1xuaW1wb3J0IHsgUXVpcE1vZGVsIH0gZnJvbSAnLi4vLi4vbW9kZWxzL1F1aXAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFVzZXJQb2RWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgaW5pdGlhbGl6ZShxdWlwSWQpIHtcbiAgICAgICAgbmV3IFF1aXBNb2RlbCh7aWQ6IHF1aXBJZH0pXG4gICAgICAgICAgICAuZmV0Y2goKVxuICAgICAgICAgICAgLnRoZW4ocXVpcCA9PiB0aGlzLmNyZWF0ZUNoaWxkVmlld3MocXVpcCkpXG4gICAgfVxuXG4gICAgc2h1dGRvd24oKSB7XG4gICAgICAgIEF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICAgIHRoaXMuZGVzdHJveUNoaWxkVmlld3MoKTtcbiAgICB9XG5cbiAgICBjcmVhdGVDaGlsZFZpZXdzKHF1aXApIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJsb2FkZWQgc2luZ2xlIHBvZFwiLCBxdWlwKTtcblxuICAgICAgICB0aGlzLnF1aXBWaWV3ID0gbmV3IFZpZXdzLlF1aXBWaWV3KHttb2RlbDogbmV3IFF1aXBNb2RlbChxdWlwKX0pO1xuICAgICAgICB0aGlzLiRlbC5hcHBlbmQodGhpcy5xdWlwVmlldy5lbCk7XG4gICAgfVxuXG4gICAgZGVzdHJveUNoaWxkVmlld3MoKSB7XG4gICAgICAgIHRoaXMucXVpcFZpZXcuc2h1dGRvd24oKTtcbiAgICB9XG59XG5cbmV4cG9ydCB7IFVzZXJQb2RWaWV3IH1cblxuIiwiaW1wb3J0IENoYW5nZWxvZ1ZpZXcgZnJvbSAnLi9DaGFuZ2Vsb2cvQ2hhbmdlbG9nVmlldydcbmltcG9ydCBIb21lcGFnZVZpZXcgZnJvbSAnLi9Ib21lcGFnZS9Ib21lcGFnZVZpZXcnXG5pbXBvcnQgUmVjb3JkZXJWaWV3IGZyb20gJy4vUmVjb3JkZXIvUmVjb3JkZXJWaWV3J1xuaW1wb3J0IEdldE1pY3JvcGhvbmVWaWV3IGZyb20gJy4vR2V0TWljcm9waG9uZS9HZXRNaWNyb3Bob25lVmlldydcbmltcG9ydCBVc2VyUG9kVmlldyBmcm9tICcuL1VzZXIvVXNlclNpbmdsZVJlY29yZGluZ1ZpZXcnXG5pbXBvcnQgSGVhZGVyTmF2VmlldyBmcm9tICcuLi9wYXJ0aWFscy9IZWFkZXJOYXZWaWV3J1xuaW1wb3J0IFF1aXBWaWV3IGZyb20gJy4uL3BhcnRpYWxzL1F1aXBWaWV3J1xuaW1wb3J0IHsgVXNlclBvZENvbGxlY3Rpb24sIFVzZXJQb2RDb2xsZWN0aW9uVmlldyB9IGZyb20gJy4vVXNlci9Vc2VyQWxsUmVjb3JkaW5nc1ZpZXcnXG5pbXBvcnQgeyBTb3VuZFBsYXllciwgQXVkaW9QbGF5ZXJWaWV3LCBBdWRpb1BsYXllckV2ZW50cyB9IGZyb20gJy4uL3BhcnRpYWxzL0F1ZGlvUGxheWVyVmlldydcblxuZXhwb3J0IHtcbiAgICBDaGFuZ2Vsb2dWaWV3LCBIb21lcGFnZVZpZXcsIFJlY29yZGVyVmlldywgR2V0TWljcm9waG9uZVZpZXcsIFVzZXJQb2RWaWV3LCBIZWFkZXJOYXZWaWV3LFxuICAgIFF1aXBWaWV3LCBVc2VyUG9kQ29sbGVjdGlvblZpZXcsIEF1ZGlvUGxheWVyVmlld1xufVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcblxuY2xhc3MgQXVkaW9QbGF5ZXJFdmVudHMgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgcGF1c2UoKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcInBhdXNlXCIpO1xuICAgIH1cbn1cblxuZXhwb3J0IGxldCBBdWRpb1BsYXllciA9IG5ldyBBdWRpb1BsYXllckV2ZW50cygpO1xuXG5jbGFzcyBBdWRpb1BsYXllclZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsLFxuICAgICAgICAgICAgcXVpcE1vZGVsOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvUGxheWVyVmlldyBpbml0aWFsaXplZFwiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXVkaW8tcGxheWVyXCIpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcInRvZ2dsZVwiLCAocXVpcCkgPT4gdGhpcy5vblRvZ2dsZShxdWlwKSwgdGhpcyk7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwicGF1c2VcIiwgKHF1aXApID0+IHRoaXMucGF1c2UocXVpcCksIHRoaXMpO1xuXG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIub25wYXVzZSA9ICgpID0+IHRoaXMub25BdWRpb1BhdXNlZCgpO1xuICAgIH1cblxuICAgIGNsb3NlKCkge1xuICAgICAgICB0aGlzLnN0b3BQZXJpb2RpY1RpbWVyKCk7XG4gICAgfVxuXG4gICAgc3RhcnRQZXJpb2RpY1RpbWVyKCkge1xuICAgICAgICBpZih0aGlzLnBlcmlvZGljVGltZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5wZXJpb2RpY1RpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4gdGhpcy5jaGVja1Byb2dyZXNzKCksIDEwMCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdG9wUGVyaW9kaWNUaW1lcigpIHtcbiAgICAgICAgaWYodGhpcy5wZXJpb2RpY1RpbWVyICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5wZXJpb2RpY1RpbWVyKTtcbiAgICAgICAgICAgIHRoaXMucGVyaW9kaWNUaW1lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjaGVja1Byb2dyZXNzKCkge1xuICAgICAgICBpZih0aGlzLnF1aXBNb2RlbCA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJvZ3Jlc3NVcGRhdGUgPSB7XG4gICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSwgLy8gc2VjXG4gICAgICAgICAgICBkdXJhdGlvbjogdGhpcy5hdWRpb1BsYXllci5kdXJhdGlvbiwgLy8gc2VjXG4gICAgICAgICAgICBwcm9ncmVzczogMTAwICogdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSAvIHRoaXMuYXVkaW9QbGF5ZXIuZHVyYXRpb24gLy8gJVxuICAgICAgICB9XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHRoaXMucXVpcE1vZGVsLmlkICsgXCIvcHJvZ3Jlc3NcIiwgcHJvZ3Jlc3NVcGRhdGUpO1xuICAgIH1cblxuICAgIG9uVG9nZ2xlKHF1aXBNb2RlbCkge1xuICAgICAgICB0aGlzLnF1aXBNb2RlbCA9IHF1aXBNb2RlbDtcblxuICAgICAgICBpZighdGhpcy50cmFja0lzTG9hZGVkKHF1aXBNb2RlbC51cmwpKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRUcmFjayhxdWlwTW9kZWwudXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCF0aGlzLnRyYWNrSXNMb2FkZWQocXVpcE1vZGVsLnVybCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRoaXMuYXVkaW9QbGF5ZXIucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLnBsYXkocXVpcE1vZGVsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucGF1c2UocXVpcE1vZGVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBsYXkocXVpcE1vZGVsKSB7XG4gICAgICAgIC8vIGlmIGF0IHRoZSBlbmQgb2YgZmlsZSAoMjAwbXMgZnVkZ2UpLCByZXdpbmRcbiAgICAgICAgaWYocGFyc2VGbG9hdChxdWlwTW9kZWwucG9zaXRpb24pID4gKHBhcnNlRmxvYXQocXVpcE1vZGVsLmR1cmF0aW9uKSAtIDAuMikpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmV3aW5kaW5nIGF1ZGlvIGNsaXA7IHF1aXBNb2RlbC5wb3NpdGlvbj1cIiArIHF1aXBNb2RlbC5wb3NpdGlvblxuICAgICAgICAgICAgICAgICsgXCIgcXVpcE1vZGVsLmR1cmF0aW9uPVwiICsgcXVpcE1vZGVsLmR1cmF0aW9uKTtcbiAgICAgICAgICAgIHF1aXBNb2RlbC5wb3NpdGlvbiA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSA9IHF1aXBNb2RlbC5wb3NpdGlvbjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHF1aXBNb2RlbC5pZCArIFwiL3BsYXlpbmdcIik7XG4gICAgICAgIHRoaXMuc3RhcnRQZXJpb2RpY1RpbWVyKCk7XG4gICAgfVxuXG4gICAgcGF1c2UocXVpcE1vZGVsKSB7XG4gICAgICAgIC8vIHJlcXVlc3QgcGF1c2VcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wYXVzZSgpO1xuICAgIH1cblxuICAgIHRyYWNrSXNMb2FkZWQodXJsKSB7XG4gICAgICAgIHJldHVybiB+dGhpcy5hdWRpb1BsYXllci5zcmMuaW5kZXhPZih1cmwpO1xuICAgIH1cblxuICAgIGxvYWRUcmFjayh1cmwpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJMb2FkaW5nIGF1ZGlvOiBcIiArIHVybCk7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gdXJsO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLmxvYWQoKTtcbiAgICB9XG5cbiAgICAvKiBBdWRpbyBlbGVtZW50IHJlcG9ydHMgcGF1c2UgdHJpZ2dlcmVkLCB0cmVhdGluZyBhcyBlbmQgb2YgZmlsZSAqL1xuICAgIG9uQXVkaW9QYXVzZWQoKSB7XG4gICAgICAgIHRoaXMuY2hlY2tQcm9ncmVzcygpO1xuICAgICAgICBpZih0aGlzLnF1aXBNb2RlbCAhPSBudWxsKSB7XG4gICAgICAgICAgICBBdWRpb1BsYXllci50cmlnZ2VyKFwiL1wiICsgdGhpcy5xdWlwTW9kZWwuaWQgKyBcIi9wYXVzZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdG9wUGVyaW9kaWNUaW1lcigpO1xuICAgIH1cbn1cblxuY2xhc3MgU291bmRQbGF5ZXIge1xuICAgIHN0YXRpYyBjcmVhdGUgKG1vZGVsKSB7XG4gICAgICAgIHZhciByZXN1bWVQb3NpdGlvbiA9IHBhcnNlSW50KG1vZGVsLmdldCgncG9zaXRpb24nKSB8fCAwKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkNyZWF0aW5nIHNvdW5kIHBsYXllciBmb3IgbW9kZWw6XCIsIG1vZGVsKTtcblxuICAgICAgICByZXR1cm4gc291bmRNYW5hZ2VyLmNyZWF0ZVNvdW5kKHtcbiAgICAgICAgICAgIGlkOiBtb2RlbC5pZCxcbiAgICAgICAgICAgIHVybDogbW9kZWwudXJsLFxuICAgICAgICAgICAgdm9sdW1lOiAxMDAsXG4gICAgICAgICAgICBhdXRvTG9hZDogdHJ1ZSxcbiAgICAgICAgICAgIGF1dG9QbGF5OiBmYWxzZSxcbiAgICAgICAgICAgIGZyb206IHJlc3VtZVBvc2l0aW9uLFxuICAgICAgICAgICAgd2hpbGVsb2FkaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJsb2FkZWQ6IFwiICsgdGhpcy5ieXRlc0xvYWRlZCArIFwiIG9mIFwiICsgdGhpcy5ieXRlc1RvdGFsKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbmxvYWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU291bmQ7IGF1ZGlvIGxvYWRlZDsgcG9zaXRpb24gPSAnICsgcmVzdW1lUG9zaXRpb24gKyAnLCBkdXJhdGlvbiA9ICcgKyB0aGlzLmR1cmF0aW9uKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmR1cmF0aW9uID09IG51bGwgfHwgdGhpcy5kdXJhdGlvbiA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZHVyYXRpb24gaXMgbnVsbFwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICgocmVzdW1lUG9zaXRpb24gKyAxMCkgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSB0cmFjayBpcyBwcmV0dHkgbXVjaCBjb21wbGV0ZSwgbG9vcCBpdFxuICAgICAgICAgICAgICAgICAgICAvLyBGSVhNRTogdGhpcyBzaG91bGQgYWN0dWFsbHkgaGFwcGVuIGVhcmxpZXIsIHdlIHNob3VsZCBrbm93IHRoYXQgdGhlIGFjdGlvbiB3aWxsIGNhdXNlIGEgcmV3aW5kXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICBhbmQgaW5kaWNhdGUgdGhlIHJld2luZCB2aXN1YWxseSBzbyB0aGVyZSBpcyBubyBzdXJwcmlzZVxuICAgICAgICAgICAgICAgICAgICByZXN1bWVQb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTb3VuZDsgdHJhY2sgbmVlZGVkIGEgcmV3aW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRklYTUU6IHJlc3VtZSBjb21wYXRpYmlsaXR5IHdpdGggdmFyaW91cyBicm93c2Vyc1xuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBzb21ldGltZXMgeW91IHJlc3VtZSBhIGZpbGUgYWxsIHRoZSB3YXkgYXQgdGhlIGVuZCwgc2hvdWxkIGxvb3AgdGhlbSBhcm91bmRcbiAgICAgICAgICAgICAgICB0aGlzLnNldFBvc2l0aW9uKHJlc3VtZVBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB0aGlzLnBsYXkoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3aGlsZXBsYXlpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvZ3Jlc3MgPSAodGhpcy5kdXJhdGlvbiA+IDAgPyAxMDAgKiB0aGlzLnBvc2l0aW9uIC8gdGhpcy5kdXJhdGlvbiA6IDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnByb2dyZXNzXCIsIHByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cG9zaXRpb25cIiwgdGhpcy5wb3NpdGlvbi50b0ZpeGVkKDApKTtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoeydwcm9ncmVzcyc6IHByb2dyZXNzfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25wYXVzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU291bmQ7IHBhdXNlZDogXCIgKyB0aGlzLmlkKTtcbiAgICAgICAgICAgICAgICB2YXIgcG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uID8gdGhpcy5wb3NpdGlvbi50b0ZpeGVkKDApIDogMDtcbiAgICAgICAgICAgICAgICB2YXIgcHJvZ3Jlc3MgPSAodGhpcy5kdXJhdGlvbiA+IDAgPyAxMDAgKiBwb3NpdGlvbiAvIHRoaXMuZHVyYXRpb24gOiAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCBwcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnBvc2l0aW9uXCIsIHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoeydwcm9ncmVzcyc6IHByb2dyZXNzfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25maW5pc2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNvdW5kOyBmaW5pc2hlZCBwbGF5aW5nOiBcIiArIHRoaXMuaWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gc3RvcmUgY29tcGxldGlvbiBpbiBicm93c2VyXG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnByb2dyZXNzXCIsICcxMDAlJyk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnBvc2l0aW9uXCIsIHRoaXMuZHVyYXRpb24udG9GaXhlZCgwKSk7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiAnMTAwJSd9KTtcblxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHVubG9jayBzb21lIHNvcnQgb2YgYWNoaWV2ZW1lbnQgZm9yIGZpbmlzaGluZyB0aGlzIHRyYWNrLCBtYXJrIGl0IGEgZGlmZiBjb2xvciwgZXRjXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdGhpcyBpcyBhIGdvb2QgcGxhY2UgdG8gZmlyZSBhIGhvb2sgdG8gYSBwbGF5YmFjayBtYW5hZ2VyIHRvIG1vdmUgb250byB0aGUgbmV4dCBhdWRpbyBjbGlwXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufVxuXG5leHBvcnQgeyBTb3VuZFBsYXllciwgQXVkaW9QbGF5ZXJWaWV3LCBBdWRpb1BsYXllckV2ZW50cyB9O1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBoZWxwZXIsIGFsaWFzMT1kZXB0aDAgIT0gbnVsbCA/IGRlcHRoMCA6IHt9LCBhbGlhczI9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBhbGlhczM9XCJmdW5jdGlvblwiLCBhbGlhczQ9Y29udGFpbmVyLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiICAgICAgICA8ZGl2IGNsYXNzPVxcXCJuYXYtcmlnaHRcXFwiPlxcbiAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJidG4gYnRuLXN1Y2Nlc3NcXFwiIGhyZWY9XFxcIi9yZWNvcmRcXFwiPlxcbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtbWljcm9waG9uZVxcXCI+PC9pPlxcbiAgICAgICAgICAgIDwvYT5cXG4gICAgICAgICAgICA8YSBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIiBocmVmPVxcXCIvdS9cIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudXNlcm5hbWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnVzZXJuYW1lIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMiksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMyA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJ1c2VybmFtZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW1nIGNsYXNzPVxcXCJwcm9maWxlLXBpY1xcXCIgc3JjPVxcXCIvcHJvZmlsZV9pbWFnZXNcIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucHJvZmlsZUltYWdlIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5wcm9maWxlSW1hZ2UgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMyKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMzID8gaGVscGVyLmNhbGwoYWxpYXMxLHtcIm5hbWVcIjpcInByb2ZpbGVJbWFnZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiLz5cXG4gICAgICAgICAgICA8L2E+XFxuICAgICAgICA8L2Rpdj5cXG5cIjtcbn0sXCIzXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCIgICAgICAgIDxhIGNsYXNzPVxcXCJidG4tc2lnbi1pblxcXCIgaHJlZj1cXFwiL2F1dGhcXFwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1zaWduLWluXFxcIj48L2k+IExvZ2luIHdpdGggVHdpdHRlclxcbiAgICAgICAgPC9hPlxcblwiO1xufSxcImNvbXBpbGVyXCI6WzcsXCI+PSA0LjAuMFwiXSxcIm1haW5cIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuIFwiPG5hdiBjbGFzcz1cXFwiaGVhZGVyLW5hdlxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcIm5hdi1sZWZ0XFxcIj5cXG4gICAgICAgIDxhIGNsYXNzPVxcXCJ3b3JkbWFya1xcXCIgaHJlZj1cXFwiL2NoYW5nZWxvZ1xcXCI+XFxuICAgICAgICAgICAgPHN0cm9uZz5Db3VjaDwvc3Ryb25nPnBvZFxcbiAgICAgICAgPC9hPlxcbiAgICA8L2Rpdj5cXG4gICAgPGEgY2xhc3M9XFxcImJ0biBidG4tc3F1YXJlXFxcIiBocmVmPVxcXCIvXFxcIj5cXG4gICAgICAgIDxpbWcgY2xhc3M9XFxcImJ0bi1sb2dvXFxcIiBzcmM9XFxcIi9hc3NldHMvaW1nL2NvdWNocG9kLTMtdGlueS5wbmdcXFwiLz5cXG4gICAgPC9hPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbXCJpZlwiXS5jYWxsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwIDoge30sKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnVzZXJuYW1lIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjpjb250YWluZXIucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjpjb250YWluZXIucHJvZ3JhbSgzLCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCI8L25hdj5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vSGVhZGVyTmF2Vmlldy5oYnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhlYWRlck5hdlZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBpbml0aWFsaXplKHVzZXIpIHtcbiAgICAgICAgdGhpcy5tb2RlbCA9IHVzZXI7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlbmRlcmluZyBoZWFkZXIgbmF2IHZpZXdcIik7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGVtcGxhdGUodGhpcy5tb2RlbCkpO1xuICAgIH1cbn1cbiIsImltcG9ydCB2YWd1ZVRpbWUgZnJvbSAndmFndWUtdGltZSdcbmltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5pbXBvcnQgeyBBdWRpb1BsYXllciB9IGZyb20gJy4vQXVkaW9QbGF5ZXJWaWV3LmpzJ1xuaW1wb3J0IHsgUXVpcE1vZGVsIH0gZnJvbSAnLi4vbW9kZWxzL1F1aXAnXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9SZWNvcmRpbmdJdGVtLmhicydcbmltcG9ydCBhcHAgZnJvbSAnLi4vYXBwJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBRdWlwVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGdldCBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHF1aXBJZDogMCxcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgZXZlbnRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJjbGljayAucXVpcC1hY3Rpb25zIC5sb2NrLWluZGljYXRvclwiOiBcInRvZ2dsZVB1YmxpY1wiLFxuICAgICAgICAgICAgXCJjbGljayAucXVpcC1hY3Rpb25zIGFbYWN0aW9uPWRlbGV0ZV1cIjogXCJkZWxldGVcIixcbiAgICAgICAgICAgIFwiY2xpY2sgLnF1aXAtcGxheWVyXCI6IFwidG9nZ2xlUGxheWJhY2tcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IHRhZ05hbWUoKSB7XG4gICAgICAgIHJldHVybiAnZGl2JztcbiAgICB9XG5cbiAgICBkZWxldGUoKSB7XG4gICAgICAgIHRoaXMubW9kZWwuZGVzdHJveSgpXG4gICAgICAgICAgICAudGhlbigoKSA9PiB3aW5kb3cuYXBwLnJvdXRlci5ob21lKCkgLCAoKSA9PiBjb25zb2xlLmxvZyhcIkRlbGV0ZSBmYWlsZWRcIikpO1xuICAgIH1cblxuICAgIG9uUGF1c2UoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUXVpcFZpZXc7IHBhdXNlZFwiKTtcblxuICAgICAgICAkKHRoaXMuZWwpXG4gICAgICAgICAgICAuZmluZCgnLmZhLXBhdXNlJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZmEtcGF1c2UnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdmYS1wbGF5Jyk7XG4gICAgfVxuXG4gICAgb25QbGF5KCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlF1aXBWaWV3OyBwbGF5aW5nXCIpO1xuXG4gICAgICAgICQodGhpcy5lbClcbiAgICAgICAgICAgIC5maW5kKCcuZmEtcGxheScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2ZhLXBsYXknKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdmYS1wYXVzZScpO1xuICAgIH1cblxuICAgIG9uUHJvZ3Jlc3MocHJvZ3Jlc3NVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoeydwb3NpdGlvbic6IHByb2dyZXNzVXBkYXRlLnBvc2l0aW9ufSk7IC8vIHNlY1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J2R1cmF0aW9uJzogcHJvZ3Jlc3NVcGRhdGUuZHVyYXRpb259KTsgLy8gc2VjXG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc1VwZGF0ZS5wcm9ncmVzc30pOyAvLyAlXG4gICAgICAgIHRoaXMubW9kZWwudGhyb3R0bGVkU2F2ZSgpO1xuICAgIH1cblxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHZhciBpZCA9IHRoaXMubW9kZWwuZ2V0KFwiaWRcIik7XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCIvXCIgKyBpZCArIFwiL3BhdXNlZFwiLCAoKSA9PiB0aGlzLm9uUGF1c2UoKSwgdGhpcyk7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwiL1wiICsgaWQgKyBcIi9wbGF5aW5nXCIsICgpID0+IHRoaXMub25QbGF5KCksIHRoaXMpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcIi9cIiArIGlkICsgXCIvcHJvZ3Jlc3NcIiwgKHVwZGF0ZSkgPT4gdGhpcy5vblByb2dyZXNzKHVwZGF0ZSksIHRoaXMpO1xuXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgICAgLy8gdXBkYXRlIHZpc3VhbHMgdG8gaW5kaWNhdGUgcGxheWJhY2sgcHJvZ3Jlc3NcbiAgICAgICAgdGhpcy5tb2RlbC5vbignY2hhbmdlOnByb2dyZXNzJywgKG1vZGVsLCBwcm9ncmVzcykgPT4ge1xuICAgICAgICAgICAgJCh0aGlzLmVsKS5maW5kKFwiLnByb2dyZXNzLWJhclwiKS5jc3MoXCJ3aWR0aFwiLCBwcm9ncmVzcyArIFwiJVwiKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5tb2RlbC5vbignY2hhbmdlOmlzUHVibGljJywgKG1vZGVsKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzaHV0ZG93bigpIHtcbiAgICAgICAgQXVkaW9QbGF5ZXIub2ZmKG51bGwsIG51bGwsIHRoaXMpO1xuICAgICAgICB0aGlzLm1vZGVsLm9mZigpO1xuICAgIH1cblxuICAgIHRvZ2dsZVB1YmxpYyhldikge1xuICAgICAgICB2YXIgbmV3U3RhdGUgPSAhdGhpcy5tb2RlbC5nZXQoJ2lzUHVibGljJyk7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsnaXNQdWJsaWMnOiBuZXdTdGF0ZX0pO1xuICAgICAgICB0aGlzLm1vZGVsLnNhdmUoKTtcbiAgICB9XG5cbiAgICB0b2dnbGVQbGF5YmFjayhldmVudCkge1xuICAgICAgICBBdWRpb1BsYXllci50cmlnZ2VyKFwidG9nZ2xlXCIsIHRoaXMubW9kZWwuYXR0cmlidXRlcyk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICB2YXIgdmlld01vZGVsID0gdGhpcy5tb2RlbC50b0pTT04oKTtcbiAgICAgICAgdmlld01vZGVsLnZhZ3VlVGltZSA9IHZhZ3VlVGltZS5nZXQoe2Zyb206IG5ldyBEYXRlKCksIHRvOiBuZXcgRGF0ZSh0aGlzLm1vZGVsLmdldChcInRpbWVzdGFtcFwiKSl9KTtcblxuICAgICAgICB0aGlzLiRlbC5odG1sKHRlbXBsYXRlKHZpZXdNb2RlbCkpO1xuXG4gICAgICAgIHRoaXMuJGVsLmZpbmQoXCIucHJvZ3Jlc3MtYmFyXCIpLmNzcyhcIndpZHRoXCIsIHRoaXMubW9kZWwuZ2V0KCdwcm9ncmVzcycpICsgXCIlXCIpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCIgICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtdW5sb2NrXFxcIj48L2k+IDxzcGFuIGNsYXNzPVxcXCJjYXB0aW9uXFxcIj5NYWtlIFByaXZhdGU8L3NwYW4+XFxuXCI7XG59LFwiM1wiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiICAgICAgICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLWxvY2tcXFwiPjwvaT4gPHNwYW4gY2xhc3M9XFxcImNhcHRpb25cXFwiPk1ha2UgUHVibGljPC9zcGFuPlxcblwiO1xufSxcIjVcIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIiAgICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvblxcXCIgYWN0aW9uPVxcXCJkZWxldGVcXFwiIHRpdGxlPVxcXCJEZWxldGVcXFwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1yZW1vdmVcXFwiPjwvaT4gPHNwYW4gY2xhc3M9XFxcImNhcHRpb25cXFwiPkRlbGV0ZTwvc3Bhbj5cXG4gICAgICAgIDwvYT5cXG5cIjtcbn0sXCJjb21waWxlclwiOls3LFwiPj0gNC4wLjBcIl0sXCJtYWluXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXIsIGFsaWFzMT1kZXB0aDAgIT0gbnVsbCA/IGRlcHRoMCA6IHt9LCBhbGlhczI9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBhbGlhczM9XCJmdW5jdGlvblwiLCBhbGlhczQ9Y29udGFpbmVyLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiPGRpdiBjbGFzcz1cXFwicXVpcFxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImZsZXgtcm93XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInF1aXAtcHJvZmlsZVxcXCI+XFxuICAgICAgICAgICAgPGEgY2xhc3M9XFxcImJ0blxcXCIgaHJlZj1cXFwiL3UvXCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnVzZXJuYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51c2VybmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwidXNlcm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG4gICAgICAgICAgICAgICAgPGltZyBzcmM9XFxcIi9wcm9maWxlX2ltYWdlc1wiXG4gICAgKyBhbGlhczQoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5wcm9maWxlSW1hZ2UgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnByb2ZpbGVJbWFnZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwicHJvZmlsZUltYWdlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIvPlxcbiAgICAgICAgICAgIDwvYT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwicXVpcC1kZXRhaWxzXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmbGV4LXJvd1xcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJuYW1lXFxcIj5cIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudXNlcm5hbWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnVzZXJuYW1lIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMiksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMyA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJ1c2VybmFtZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCI8L3NwYW4+XFxuICAgICAgICAgICAgICAgIDx0aW1lPlwiXG4gICAgKyBhbGlhczQoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy52YWd1ZVRpbWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnZhZ3VlVGltZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwidmFndWVUaW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIjwvdGltZT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJ0ZXh0XFxcIj5cIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZGVzY3JpcHRpb24gfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmRlc2NyaXB0aW9uIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMiksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMyA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJkZXNjcmlwdGlvblwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCI8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicXVpcC1wbGF5ZXJcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwicHJvZ3Jlc3MtYmFyXFxcIj48L2Rpdj5cXG4gICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1wbGF5XFxcIj48L2k+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJxdWlwLWFjdGlvbnNcXFwiPlxcbiAgICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvblxcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnB1YmxpY1VybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAucHVibGljVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMiksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMyA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJwdWJsaWNVcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiB0aXRsZT1cXFwiU2hhcmVcXFwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1zaGFyZS1zcXVhcmUtb1xcXCI+PC9pPiA8c3BhbiBjbGFzcz1cXFwiY2FwdGlvblxcXCI+U2hhcmU8L3NwYW4+XFxuICAgICAgICA8L2E+XFxuICAgICAgICA8YSBjbGFzcz1cXFwiYnV0dG9uIGxvY2staW5kaWNhdG9yXFxcIiB0aXRsZT1cXFwiVG9nZ2xlIHZpc2liaWxpdHlcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbXCJpZlwiXS5jYWxsKGFsaWFzMSwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaXNQdWJsaWMgOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOmNvbnRhaW5lci5wcm9ncmFtKDEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOmNvbnRhaW5lci5wcm9ncmFtKDMsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIiAgICAgICAgPC9hPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbXCJpZlwiXS5jYWxsKGFsaWFzMSwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaXNNaW5lIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjpjb250YWluZXIucHJvZ3JhbSg1LCBkYXRhLCAwKSxcImludmVyc2VcIjpjb250YWluZXIubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCIgICAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvbHlmaWxsIHtcbiAgICBzdGF0aWMgaW5zdGFsbCgpIHtcbiAgICAgICAgd2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCB8fCBmYWxzZTtcbiAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci5tc0dldFVzZXJNZWRpYSB8fCBmYWxzZTtcblxuICAgICAgICBpZiAobmF2aWdhdG9yLm1lZGlhRGV2aWNlID09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicG9seWZpbGxpbmcgbWVkaWFEZXZpY2UuZ2V0VXNlck1lZGlhXCIpO1xuXG4gICAgICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2UgPSB7XG4gICAgICAgICAgICAgICAgZ2V0VXNlck1lZGlhOiAocHJvcHMpID0+IG5ldyBQcm9taXNlKCh5LCBuKSA9PiBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKHByb3BzLCB5LCBuKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbmF2aWdhdG9yLmdldFVzZXJNZWRpYSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkF1ZGlvQ2FwdHVyZTo6cG9seWZpbGwoKTsgZ2V0VXNlck1lZGlhKCkgbm90IHN1cHBvcnRlZC5cIik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBQcmVzZW50ZXIge1xuICAgIHNob3dIZWFkZXJOYXYodmlldykge1xuICAgICAgICAkKFwiYm9keSA+IGhlYWRlclwiKS5hcHBlbmQodmlldy5lbCk7XG4gICAgfVxuXG4gICAgc3dpdGNoVmlldyhuZXdWaWV3KSB7XG4gICAgICAgIGlmKHRoaXMudmlldykge1xuICAgICAgICAgICAgdmFyIG9sZFZpZXcgPSB0aGlzLnZpZXc7XG4gICAgICAgICAgICBvbGRWaWV3LiRlbC5yZW1vdmVDbGFzcyhcInRyYW5zaXRpb24taW5cIik7XG4gICAgICAgICAgICBvbGRWaWV3LiRlbC5hZGRDbGFzcyhcInRyYW5zaXRpb24tb3V0XCIpO1xuICAgICAgICAgICAgb2xkVmlldy4kZWwub25lKFwiYW5pbWF0aW9uZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICBvbGRWaWV3LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIG9sZFZpZXcudW5iaW5kKCk7XG4gICAgICAgICAgICAgICAgaWYob2xkVmlldy5zaHV0ZG93biAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIG9sZFZpZXcuc2h1dGRvd24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ld1ZpZXcuJGVsLmFkZENsYXNzKFwidHJhbnNpdGlvbmFibGUgdHJhbnNpdGlvbi1pblwiKTtcbiAgICAgICAgbmV3Vmlldy4kZWwub25lKFwiYW5pbWF0aW9uZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIG5ld1ZpZXcuJGVsLnJlbW92ZUNsYXNzKFwidHJhbnNpdGlvbi1pblwiKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI3ZpZXctY29udGFpbmVyJykuYXBwZW5kKG5ld1ZpZXcuZWwpO1xuICAgICAgICB0aGlzLnZpZXcgPSBuZXdWaWV3O1xuICAgIH1cbn1cblxuZXhwb3J0IGxldCBSb290UHJlc2VudGVyID0gbmV3IFByZXNlbnRlcigpO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0ICogYXMgQ29udHJvbGxlcnMgZnJvbSAnLi9wYWdlcy9Db250cm9sbGVycydcbmltcG9ydCBIZWFkZXJOYXZWaWV3IGZyb20gJy4vcGFydGlhbHMvSGVhZGVyTmF2VmlldydcbmltcG9ydCB7IFJvb3RQcmVzZW50ZXIgfSBmcm9tICcuL3ByZXNlbnRlcidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUm91dGVyIGV4dGVuZHMgQmFja2JvbmUuUm91dGVyIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoe1xuICAgICAgICAgICAgcm91dGVzOiB7XG4gICAgICAgICAgICAgICAgJyc6ICdob21lJyxcbiAgICAgICAgICAgICAgICAncmVjb3JkJzogJ3JlY29yZCcsXG4gICAgICAgICAgICAgICAgJ3UvOnVzZXJuYW1lJzogJ3VzZXInLFxuICAgICAgICAgICAgICAgICdjaGFuZ2Vsb2cnOiAnY2hhbmdlbG9nJyxcbiAgICAgICAgICAgICAgICAncS86cXVpcGlkJzogJ3NpbmdsZV9pdGVtJyxcbiAgICAgICAgICAgICAgICAnc3RyZWFtcyc6ICdsaXN0X3N0cmVhbXMnLFxuICAgICAgICAgICAgICAgICdzdHJlYW1zLzppZCc6ICdzdHJlYW1fZGV0YWlscydcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0VXNlcih1c2VyKSB7XG4gICAgICAgIFJvb3RQcmVzZW50ZXIuc2hvd0hlYWRlck5hdihuZXcgSGVhZGVyTmF2Vmlldyh1c2VyKSlcbiAgICB9XG5cbiAgICBzaW5nbGVfaXRlbShpZCkge1xuICAgICAgICBuZXcgQ29udHJvbGxlcnMuU2luZ2xlUG9kQ29udHJvbGxlcihSb290UHJlc2VudGVyLCBpZCk7XG4gICAgfVxuXG4gICAgaG9tZSgpIHtcbiAgICAgICAgbmV3IENvbnRyb2xsZXJzLkhvbWVDb250cm9sbGVyKFJvb3RQcmVzZW50ZXIpO1xuICAgIH1cblxuICAgIHVzZXIodXNlcm5hbWUpIHtcbiAgICAgICAgbmV3IENvbnRyb2xsZXJzLlVzZXJDb250cm9sbGVyKFJvb3RQcmVzZW50ZXIsIHVzZXJuYW1lKTtcbiAgICB9XG5cbiAgICBjaGFuZ2Vsb2coKSB7XG4gICAgICAgIG5ldyBDb250cm9sbGVycy5DaGFuZ2Vsb2dDb250cm9sbGVyKFJvb3RQcmVzZW50ZXIpO1xuICAgIH1cblxuICAgIHJlY29yZCgpIHtcbiAgICAgICAgbmV3IENvbnRyb2xsZXJzLlJlY29yZGVyQ29udHJvbGxlcihSb290UHJlc2VudGVyKTtcbiAgICB9XG5cbiAgICBsaXN0X3N0cmVhbXMoKSB7XG4gICAgICAgIHZhciBjb250cm9sbGVyID0gbmV3IENvbnRyb2xsZXJzLlN0cmVhbUNvbnRyb2xsZXIoUm9vdFByZXNlbnRlcik7XG4gICAgICAgIGNvbnRyb2xsZXIuY3JlYXRlKCk7XG4gICAgfVxuXG4gICAgc3RyZWFtX2RldGFpbHMoaWQpIHtcbiAgICAgICAgdmFyIGNvbnRyb2xsZXIgPSBuZXcgQ29udHJvbGxlcnMuU3RyZWFtQ29udHJvbGxlcihSb290UHJlc2VudGVyKTtcbiAgICAgICAgY29udHJvbGxlci5kZXRhaWxzKGlkKTtcbiAgICB9XG59XG4iXX0=
