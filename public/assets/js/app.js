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

},{"./models/CurrentUser":25,"./partials/AudioPlayerView":46,"./polyfill.js":51,"./router":53,"backbone":"backbone","jquery":"jquery"}],23:[function(require,module,exports){
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

},{"./Recorder/RecorderController":34,"./Streams/StreamController.js":39,"./Views":45}],30:[function(require,module,exports){
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

},{"../../models/Quip":26,"../../partials/AudioPlayerView":46,"../../partials/QuipView.js":49,"backbone":"backbone"}],34:[function(require,module,exports){
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

},{"../../audio-capture":23,"../../models/CreateRecordingModel":24,"../../partials/QuipView.js":49,"./RecorderView.hbs":35,"backbone":"backbone","underscore":"underscore"}],37:[function(require,module,exports){
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

  return "<!-- TODO: create your first stream -->\n\n<div class=\"m-create-stream\">\n    <form>\n        <input class=\"field\" type=\"text\" name=\"streamName\" placeholder=\"Stream Name\" value=\""
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
    return "<div class=\"m-stream-details\">\n    <h1>Stream Details</h1>\n</div>\n<div class=\"g-quips-list\">\n</div>\n";
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
            var list = this.$el.find('.g-quips-list');

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = quips[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var quip = _step.value;

                    var quipView = new _partialsQuipViewJs2['default']({ model: new _modelsQuip.QuipModel(quip) });
                    this.quipViews.push(quipView);
                    list.append(quipView.el);
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

},{"../../models/Quip":26,"../../partials/QuipView.js":49,"./StreamDetails.hbs":40,"backbone":"backbone","backbone-bindings":1,"backbone.epoxy":"backbone.epoxy"}],42:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<div class=\"m-stream-details\">\n    <h1>"
    + container.escapeExpression(((helper = (helper = helpers.username || (depth0 != null ? depth0.username : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"username","hash":{},"data":data}) : helper)))
    + "'s Stream</h1>\n</div>\n<div class=\"g-quips-list\">\n</div>\n";
},"useData":true});

},{"hbsfy/runtime":21}],43:[function(require,module,exports){
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

var _UserAllRecordingsHbs = require('./UserAllRecordings.hbs');

var _UserAllRecordingsHbs2 = _interopRequireDefault(_UserAllRecordingsHbs);

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

            this.render();
            new UserPodCollection(username).fetch().then(function (quips) {
                return _this.createChildViews(quips);
            });
        }
    }, {
        key: 'render',
        value: function render() {
            this.$el.html((0, _UserAllRecordingsHbs2['default'])());
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
            var list = this.$el.find('.g-quips-list');

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = quips[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var quip = _step.value;

                    var quipView = new Views.QuipView({ model: new _modelsQuip.QuipModel(quip) });
                    this.quipViews.push(quipView);
                    list.append(quipView.el);
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

},{"../../models/Quip":26,"../Views":45,"./UserAllRecordings.hbs":42,"backbone":"backbone"}],44:[function(require,module,exports){
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

},{"../../models/Quip":26,"../Views":45,"backbone":"backbone"}],45:[function(require,module,exports){
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

},{"../partials/AudioPlayerView":46,"../partials/HeaderNavView":48,"../partials/QuipView":49,"./Changelog/ChangelogView":28,"./GetMicrophone/GetMicrophoneView":31,"./Homepage/HomepageView":33,"./Recorder/RecorderView":36,"./User/UserAllRecordingsView":43,"./User/UserSingleRecordingView":44}],46:[function(require,module,exports){
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

},{"backbone":"backbone","underscore":"underscore"}],47:[function(require,module,exports){
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

  return "<nav class=\"header-nav\">\n    <div class=\"nav-left\">\n        <a class=\"wordmark\" href=\"/\">\n            <strong>Couch</strong>pod\n        </a>\n    </div>\n    <!--<a class=\"btn btn-square\" href=\"/changelog\">-->\n        <!--<img class=\"btn-logo\" src=\"/assets/img/couchpod-3-tiny.png\"/>-->\n    <!--</a>-->\n\n    <a href=\"/changelog\">\n        News\n    </a>\n\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.username : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "</nav>\n";
},"useData":true});

},{"hbsfy/runtime":21}],48:[function(require,module,exports){
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

},{"./HeaderNavView.hbs":47,"backbone":"backbone"}],49:[function(require,module,exports){
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

},{"../app":22,"../models/Quip":26,"./AudioPlayerView.js":46,"./RecordingItem.hbs":50,"backbone":"backbone","underscore":"underscore","vague-time":"vague-time"}],50:[function(require,module,exports){
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

},{"hbsfy/runtime":21}],51:[function(require,module,exports){
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

},{}],52:[function(require,module,exports){
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

},{}],53:[function(require,module,exports){
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

},{"./pages/Controllers":29,"./partials/HeaderNavView":48,"./presenter":52,"backbone":"backbone"}]},{},[22])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmFja2JvbmUtYmluZGluZ3MvYmFja2JvbmUtYmluZGluZ3MuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy5ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2RlY29yYXRvcnMuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9kZWNvcmF0b3JzL2lubGluZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2V4Y2VwdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9oZWxwZXJzL2Jsb2NrLWhlbHBlci1taXNzaW5nLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvaGVscGVycy9lYWNoLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvaGVscGVycy9oZWxwZXItbWlzc2luZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMvaWYuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9oZWxwZXJzL2xvZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMvbG9va3VwLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvaGVscGVycy93aXRoLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvbG9nZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9uby1jb25mbGljdC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9zYWZlLXN0cmluZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9hcHAuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL2F1ZGlvLWNhcHR1cmUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL21vZGVscy9DcmVhdGVSZWNvcmRpbmdNb2RlbC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvbW9kZWxzL0N1cnJlbnRVc2VyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9tb2RlbHMvUXVpcC5qcyIsInNwYS9wYWdlcy9DaGFuZ2Vsb2cvQ2hhbmdlbG9nVmlldy5oYnMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL3BhZ2VzL0NoYW5nZWxvZy9DaGFuZ2Vsb2dWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9Db250cm9sbGVycy5qcyIsInNwYS9wYWdlcy9HZXRNaWNyb3Bob25lL0dldE1pY3JvcGhvbmUuaGJzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9HZXRNaWNyb3Bob25lL0dldE1pY3JvcGhvbmVWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9HZXRNaWNyb3Bob25lL01pY3JvcGhvbmVQZXJtaXNzaW9ucy5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvSG9tZXBhZ2UvSG9tZXBhZ2VWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9SZWNvcmRlci9SZWNvcmRlckNvbnRyb2xsZXIuanMiLCJzcGEvcGFnZXMvUmVjb3JkZXIvUmVjb3JkZXJWaWV3LmhicyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvUmVjb3JkZXIvUmVjb3JkZXJWaWV3LmpzIiwic3BhL3BhZ2VzL1N0cmVhbXMvQ3JlYXRlU3RyZWFtLmhicyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvU3RyZWFtcy9DcmVhdGVTdHJlYW0uanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL3BhZ2VzL1N0cmVhbXMvU3RyZWFtQ29udHJvbGxlci5qcyIsInNwYS9wYWdlcy9TdHJlYW1zL1N0cmVhbURldGFpbHMuaGJzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9TdHJlYW1zL1N0cmVhbURldGFpbHMuanMiLCJzcGEvcGFnZXMvVXNlci9Vc2VyQWxsUmVjb3JkaW5ncy5oYnMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL3BhZ2VzL1VzZXIvVXNlckFsbFJlY29yZGluZ3NWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9Vc2VyL1VzZXJTaW5nbGVSZWNvcmRpbmdWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9WaWV3cy5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFydGlhbHMvQXVkaW9QbGF5ZXJWaWV3LmpzIiwic3BhL3BhcnRpYWxzL0hlYWRlck5hdlZpZXcuaGJzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYXJ0aWFscy9IZWFkZXJOYXZWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYXJ0aWFscy9RdWlwVmlldy5qcyIsInNwYS9wYXJ0aWFscy9SZWNvcmRpbmdJdGVtLmhicyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcG9seWZpbGwuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL3ByZXNlbnRlci5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcm91dGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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RztBQUNYLGdCQUFJLFVBQVUsR0FBRyxJQUFJLFdBQVcsQ0FBQyxnQkFBZ0IsMEJBQWUsQ0FBQztBQUNqRSxzQkFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO1NBQ3ZCOzs7ZUFFYSx3QkFBQyxFQUFFLEVBQUU7QUFDZixnQkFBSSxVQUFVLEdBQUcsSUFBSSxXQUFXLENBQUMsZ0JBQWdCLDBCQUFlLENBQUM7QUFDakUsc0JBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDMUI7OztXQS9DZ0IsTUFBTTtHQUFTLHNCQUFTLE1BQU07O3FCQUE5QixNQUFNIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJylcbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpXG5cbnZhciBiaW5kaW5nU3BsaXR0ZXIgPSAvXihcXFMrKVxccyooLiopJC87XG5cbl8uZXh0ZW5kKEJhY2tib25lLlZpZXcucHJvdG90eXBlLCB7XG4gICAgYmluZE1vZGVsOiBmdW5jdGlvbihiaW5kaW5ncykge1xuICAgICAgICAvLyBCaW5kaW5ncyBjYW4gYmUgZGVmaW5lZCB0aHJlZSBkaWZmZXJlbnQgd2F5cy4gSXQgY2FuIGJlXG4gICAgICAgIC8vIGRlZmluZWQgb24gdGhlIHZpZXcgYXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHVuZGVyIHRoZSBrZXlcbiAgICAgICAgLy8gJ2JpbmRpbmdzJywgb3IgYXMgYW4gb2JqZWN0IHBhc3NlZCB0byBiaW5kTW9kZWwuXG4gICAgICAgIGJpbmRpbmdzID0gYmluZGluZ3MgfHwgZ2V0VmFsdWUodGhpcywgJ2JpbmRpbmdzJyk7XG5cbiAgICAgICAgLy8gU2tpcCBpZiBubyBiaW5kaW5ncyBjYW4gYmUgZm91bmQgb3IgaWYgdGhlIHZpZXcgaGFzIG5vIG1vZGVsLlxuICAgICAgICBpZiAoIWJpbmRpbmdzIHx8ICF0aGlzLm1vZGVsKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcHJpdmF0ZSBiaW5kaW5ncyBtYXAgaWYgaXQgZG9lc24ndCBleGlzdC5cbiAgICAgICAgdGhpcy5fYmluZGluZ3MgPSB0aGlzLl9iaW5kaW5ncyB8fCB7fTtcblxuICAgICAgICAvLyBDbGVhciBhbnkgcHJldmlvdXMgYmluZGluZ3MgZm9yIHZpZXcuXG4gICAgICAgIHRoaXMudW5iaW5kTW9kZWwoKTtcblxuICAgICAgICBfLmVhY2goYmluZGluZ3MsIGZ1bmN0aW9uKGF0dHJpYnV0ZSwgYmluZGluZykge1xuICAgICAgICAgICAgaWYgKCFfLmlzQXJyYXkoYXR0cmlidXRlKSlcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGUgPSBbYXR0cmlidXRlLCBbbnVsbCwgbnVsbF1dO1xuXG4gICAgICAgICAgICBpZiAoIV8uaXNBcnJheShhdHRyaWJ1dGVbMV0pKVxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZVsxXSA9IFthdHRyaWJ1dGVbMV0sIG51bGxdO1xuXG4gICAgICAgICAgICAvLyBDaGVjayB0byBzZWUgaWYgYSBiaW5kaW5nIGlzIGFscmVhZHkgYm91bmQgdG8gYW5vdGhlciBhdHRyaWJ1dGUuXG4gICAgICAgICAgICBpZiAodGhpcy5fYmluZGluZ3NbYmluZGluZ10pXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiJ1wiICsgYmluZGluZyArIFwiJyBpcyBhbHJlYWR5IGJvdW5kIHRvICdcIiArIGF0dHJpYnV0ZVswXSArIFwiJy5cIik7XG5cbiAgICAgICAgICAgIC8vIFNwbGl0IGJpbmRpbmdzIGp1c3QgbGlrZSBCYWNrYm9uZS5WaWV3LmV2ZW50cyB3aGVyZSB0aGUgZmlyc3QgaGFsZlxuICAgICAgICAgICAgLy8gaXMgdGhlIHByb3BlcnR5IHlvdSB3YW50IHRvIGJpbmQgdG8gYW5kIHRoZSByZW1haW5kZXIgaXMgdGhlIHNlbGVjdG9yXG4gICAgICAgICAgICAvLyBmb3IgdGhlIGVsZW1lbnQgaW4gdGhlIHZpZXcgdGhhdCBwcm9wZXJ0eSBpcyBmb3IuXG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBiaW5kaW5nLm1hdGNoKGJpbmRpbmdTcGxpdHRlciksXG4gICAgICAgICAgICAgICAgcHJvcGVydHkgPSBtYXRjaFsxXSxcbiAgICAgICAgICAgICAgICBzZWxlY3RvciA9IG1hdGNoWzJdLFxuICAgICAgICAgICAgICAgIC8vIEZpbmQgZWxlbWVudCBpbiB2aWV3IGZvciBiaW5kaW5nLiBJZiB0aGVyZSBpcyBubyBzZWxlY3RvclxuICAgICAgICAgICAgICAgIC8vIHVzZSB0aGUgdmlldydzIGVsLlxuICAgICAgICAgICAgICAgIGVsID0gKHNlbGVjdG9yKSA/IHRoaXMuJChzZWxlY3RvcikgOiB0aGlzLiRlbCxcbiAgICAgICAgICAgICAgICAvLyBGaW5kZXIgYmluZGVyIGRlZmluaXRpb24gZm9yIGJpbmRpbmcgYnkgcHJvcGVydHkuIElmIGl0IGNhbid0IGJlIGZvdW5kXG4gICAgICAgICAgICAgICAgLy8gZGVmYXVsdCB0byBwcm9wZXJ0eSAnYXR0cicuXG4gICAgICAgICAgICAgICAgYmluZGVyID0gQmFja2JvbmUuVmlldy5CaW5kZXJzW3Byb3BlcnR5XSB8fCBCYWNrYm9uZS5WaWV3LkJpbmRlcnNbJ19fYXR0cl9fJ10sXG4gICAgICAgICAgICAgICAgLy8gRmV0Y2ggYWNjZXNzb3JzIGZyb20gYmluZGVyLiBUaGUgY29udGV4dCBvZiB0aGUgYmluZGVyIGlzIHRoZSB2aWV3XG4gICAgICAgICAgICAgICAgLy8gYW5kIGJpbmRlciBzaG91bGQgcmV0dXJuIGFuIG9iamVjdCB0aGF0IGhhcyAnc2V0JyBhbmQgb3IgJ2dldCcga2V5cy5cbiAgICAgICAgICAgICAgICAvLyAnc2V0JyBtdXN0IGJlIGEgZnVuY3Rpb24gYW5kIGhhcyBvbmUgYXJndW1lbnQuIGBnZXRgIGNhbiBlaXRoZXIgYmVcbiAgICAgICAgICAgICAgICAvLyBhIGZ1bmN0aW9uIG9yIGEgbGlzdCBbZXZlbnRzLCBmdW5jdGlvbl0gLlRoZSBjb250ZXh0IG9mIGJvdGggc2V0IGFuZFxuICAgICAgICAgICAgICAgIC8vIGdldCBpcyB0aGUgdmlld3MncyAkZWwuXG4gICAgICAgICAgICAgICAgYWNjZXNzb3JzID0gYmluZGVyLmNhbGwodGhpcywgdGhpcy5tb2RlbCwgYXR0cmlidXRlWzBdLCBwcm9wZXJ0eSk7XG5cbiAgICAgICAgICAgIGlmICghYWNjZXNzb3JzKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgLy8gTm9ybWFsaXplIGdldCBhY2Nlc3NvcnMgaWYgb25seSBhIGZ1bmN0aW9uIHdhcyBwcm92aWRlZC4gSWYgbm9cbiAgICAgICAgICAgIC8vIGV2ZW50cyB3ZXJlIHByb3ZpZGVkIGRlZmF1bHQgdG8gb24gJ2NoYW5nZScuXG4gICAgICAgICAgICBpZiAoIV8uaXNBcnJheShhY2Nlc3NvcnMuZ2V0KSlcbiAgICAgICAgICAgICAgICBhY2Nlc3NvcnMuZ2V0ID0gWydjaGFuZ2UnLCBhY2Nlc3NvcnMuZ2V0XTtcblxuICAgICAgICAgICAgaWYgKCFhY2Nlc3NvcnMuZ2V0WzFdICYmICFhY2Nlc3NvcnMuc2V0KVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgLy8gRXZlbnQga2V5IGZvciBtb2RlbCBhdHRyaWJ1dGUgY2hhbmdlcy5cbiAgICAgICAgICAgIHZhciBzZXRUcmlnZ2VyID0gJ2NoYW5nZTonICsgYXR0cmlidXRlWzBdLFxuICAgICAgICAgICAgICAgIC8vIEV2ZW50IGtleXMgZm9yIHZpZXcuJGVsIG5hbWVzcGFjZWQgdG8gdGhlIHZpZXcgZm9yIHVuYmluZGluZy5cbiAgICAgICAgICAgICAgICBnZXRUcmlnZ2VyID0gXy5yZWR1Y2UoYWNjZXNzb3JzLmdldFswXS5zcGxpdCgnICcpLCBmdW5jdGlvbihtZW1vLCBldmVudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbWVtbyArICcgJyArIGV2ZW50ICsgJy5tb2RlbEJpbmRpbmcnICsgdGhpcy5jaWQ7XG4gICAgICAgICAgICAgICAgfSwgJycsIHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBEZWZhdWx0IHRvIGlkZW50aXR5IHRyYW5zZm9ybWVyIGlmIG5vdCBwcm92aWRlZCBmb3IgYXR0cmlidXRlLlxuICAgICAgICAgICAgdmFyIHNldFRyYW5zZm9ybWVyID0gYXR0cmlidXRlWzFdWzBdIHx8IGlkZW50aXR5VHJhbnNmb3JtZXIsXG4gICAgICAgICAgICAgICAgZ2V0VHJhbnNmb3JtZXIgPSBhdHRyaWJ1dGVbMV1bMV0gfHwgaWRlbnRpdHlUcmFuc2Zvcm1lcjtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGdldCBhbmQgc2V0IGNhbGxiYWNrcyBzbyB0aGF0IHdlIGNhbiByZWZlcmVuY2UgdGhlIGZ1bmN0aW9uc1xuICAgICAgICAgICAgLy8gd2hlbiBpdCdzIHRpbWUgdG8gdW5iaW5kLiAnc2V0JyBmb3IgYmluZGluZyB0byB0aGUgbW9kZWwgZXZlbnRzLi4uXG4gICAgICAgICAgICB2YXIgc2V0ID0gXy5iaW5kKGZ1bmN0aW9uKG1vZGVsLCB2YWx1ZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIC8vIFNraXAgaWYgdGhpcyBjYWxsYmFjayB3YXMgYm91bmQgdG8gdGhlIGVsZW1lbnQgdGhhdFxuICAgICAgICAgICAgICAgIC8vIHRyaWdnZXJlZCB0aGUgY2FsbGJhY2suXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5lbCAmJiBvcHRpb25zLmVsLmdldCgwKSA9PSBlbC5nZXQoMCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgcHJvcGVydHkgdmFsdWUgZm9yIHRoZSBiaW5kZXIncyBlbGVtZW50LlxuICAgICAgICAgICAgICAgIGFjY2Vzc29ycy5zZXQuY2FsbChlbCwgc2V0VHJhbnNmb3JtZXIuY2FsbCh0aGlzLCB2YWx1ZSkpO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgICAgIC8vIC4uLmFuZCAnZ2V0JyBjYWxsYmFjayBmb3IgYmluZGluZyB0byBET00gZXZlbnRzLlxuICAgICAgICAgICAgdmFyIGdldCA9IF8uYmluZChmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgcHJvcGVydHkgdmFsdWUgZnJvbSB0aGUgYmluZGVyJ3MgZWxlbWVudC5cbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhhdHRyaWJ1dGVbMF0sIGdldFRyYW5zZm9ybWVyKTtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBnZXRUcmFuc2Zvcm1lci5jYWxsKHRoaXMsIGFjY2Vzc29ycy5nZXRbMV0uY2FsbChlbCkpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoYXR0cmlidXRlWzBdLCB2YWx1ZSwge1xuICAgICAgICAgICAgICAgICAgICBlbDogdGhpcy4kKGV2ZW50LnNyY0VsZW1lbnQpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICAgICAgaWYgKGFjY2Vzc29ycy5zZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLm9uKHNldFRyaWdnZXIsIHNldCk7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgaW5pdGlhbCBzZXQgY2FsbGJhY2sgbWFudWFsbHkgc28gdGhhdCB0aGUgdmlldyBpcyB1cFxuICAgICAgICAgICAgICAgIC8vIHRvIGRhdGUgd2l0aCB0aGUgbW9kZWwgYm91bmQgdG8gaXQuXG4gICAgICAgICAgICAgICAgc2V0KHRoaXMubW9kZWwsIHRoaXMubW9kZWwuZ2V0KGF0dHJpYnV0ZVswXSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYWNjZXNzb3JzLmdldFsxXSlcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5vbihnZXRUcmlnZ2VyLCBzZWxlY3RvciwgZ2V0KTtcblxuICAgICAgICAgICAgLy8gU2F2ZSBhIHJlZmVyZW5jZSB0byBiaW5kaW5nIHNvIHRoYXQgd2UgY2FuIHVuYmluZCBpdCBsYXRlci5cbiAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzW2JpbmRpbmddID0ge1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICAgICAgICAgICAgICBnZXRUcmlnZ2VyOiBnZXRUcmlnZ2VyLFxuICAgICAgICAgICAgICAgIHNldFRyaWdnZXI6IHNldFRyaWdnZXIsXG4gICAgICAgICAgICAgICAgZ2V0OiBnZXQsXG4gICAgICAgICAgICAgICAgc2V0OiBzZXRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgdW5iaW5kTW9kZWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTa2lwIGlmIHZpZXcgaGFzIGJlZW4gYm91bmQgb3IgZG9lc24ndCBoYXZlIGEgbW9kZWwuXG4gICAgICAgIGlmICghdGhpcy5fYmluZGluZ3MgfHwgIXRoaXMubW9kZWwpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgXy5lYWNoKHRoaXMuX2JpbmRpbmdzLCBmdW5jdGlvbihiaW5kaW5nLCBrZXkpIHtcbiAgICAgICAgICAgIGlmIChiaW5kaW5nLmdldFsxXSlcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5vZmYoYmluZGluZy5nZXRUcmlnZ2VyLCBiaW5kaW5nLnNlbGVjdG9yKTtcblxuICAgICAgICAgICAgaWYgKGJpbmRpbmcuc2V0KVxuICAgICAgICAgICAgICAgIHRoaXMubW9kZWwub2ZmKGJpbmRpbmcuc2V0VHJpZ2dlciwgYmluZGluZy5zZXQpO1xuXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYmluZGluZ3Nba2V5XTtcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufSk7XG5cbkJhY2tib25lLlZpZXcuQmluZGVycyA9IHtcbiAgICAndmFsdWUnOiBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlLCBwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0OiBbJ2NoYW5nZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbCgpO1xuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52YWwodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgJ3RleHQnOiBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlLCBwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0OiBbJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRleHQoKTtcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMudGV4dCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcbiAgICAnaHRtbCc6IGZ1bmN0aW9uKG1vZGVsLCBhdHRyaWJ1dGUsIHByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnZXQ6IFsnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaHRtbCgpO1xuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9LFxuICAgICdjbGFzcyc6IGZ1bmN0aW9uKG1vZGVsLCBhdHRyaWJ1dGUsIHByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3ByZXZpb3VzQ2xhc3MpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3ModGhpcy5fcHJldmlvdXNDbGFzcyk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmFkZENsYXNzKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcbiAgICAnY2hlY2tlZCc6IGZ1bmN0aW9uKG1vZGVsLCBhdHRyaWJ1dGUsIHByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnZXQ6IFsnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvcCgnY2hlY2tlZCcpO1xuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9wKCdjaGVja2VkJywgISF2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcbiAgICAnX19hdHRyX18nOiBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlLCBwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXR0cihwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbn07XG5cbnZhciBpZGVudGl0eVRyYW5zZm9ybWVyID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG4vLyBIZWxwZXIgZnVuY3Rpb24gZnJvbSBCYWNrYm9uZSB0byBnZXQgYSB2YWx1ZSBmcm9tIGEgQmFja2JvbmVcbi8vIG9iamVjdCBhcyBhIHByb3BlcnR5IG9yIGFzIGEgZnVuY3Rpb24uXG52YXIgZ2V0VmFsdWUgPSBmdW5jdGlvbihvYmplY3QsIHByb3ApIHtcbiAgICBpZiAoKG9iamVjdCAmJiBvYmplY3RbcHJvcF0pKVxuICAgICAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKG9iamVjdFtwcm9wXSkgPyBvYmplY3RbcHJvcF0oKSA6IG9iamVjdFtwcm9wXTtcbn07IiwiaW1wb3J0ICogYXMgYmFzZSBmcm9tICcuL2hhbmRsZWJhcnMvYmFzZSc7XG5cbi8vIEVhY2ggb2YgdGhlc2UgYXVnbWVudCB0aGUgSGFuZGxlYmFycyBvYmplY3QuIE5vIG5lZWQgdG8gc2V0dXAgaGVyZS5cbi8vIChUaGlzIGlzIGRvbmUgdG8gZWFzaWx5IHNoYXJlIGNvZGUgYmV0d2VlbiBjb21tb25qcyBhbmQgYnJvd3NlIGVudnMpXG5pbXBvcnQgU2FmZVN0cmluZyBmcm9tICcuL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcnO1xuaW1wb3J0IEV4Y2VwdGlvbiBmcm9tICcuL2hhbmRsZWJhcnMvZXhjZXB0aW9uJztcbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJy4vaGFuZGxlYmFycy91dGlscyc7XG5pbXBvcnQgKiBhcyBydW50aW1lIGZyb20gJy4vaGFuZGxlYmFycy9ydW50aW1lJztcblxuaW1wb3J0IG5vQ29uZmxpY3QgZnJvbSAnLi9oYW5kbGViYXJzL25vLWNvbmZsaWN0JztcblxuLy8gRm9yIGNvbXBhdGliaWxpdHkgYW5kIHVzYWdlIG91dHNpZGUgb2YgbW9kdWxlIHN5c3RlbXMsIG1ha2UgdGhlIEhhbmRsZWJhcnMgb2JqZWN0IGEgbmFtZXNwYWNlXG5mdW5jdGlvbiBjcmVhdGUoKSB7XG4gIGxldCBoYiA9IG5ldyBiYXNlLkhhbmRsZWJhcnNFbnZpcm9ubWVudCgpO1xuXG4gIFV0aWxzLmV4dGVuZChoYiwgYmFzZSk7XG4gIGhiLlNhZmVTdHJpbmcgPSBTYWZlU3RyaW5nO1xuICBoYi5FeGNlcHRpb24gPSBFeGNlcHRpb247XG4gIGhiLlV0aWxzID0gVXRpbHM7XG4gIGhiLmVzY2FwZUV4cHJlc3Npb24gPSBVdGlscy5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIGhiLlZNID0gcnVudGltZTtcbiAgaGIudGVtcGxhdGUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgcmV0dXJuIHJ1bnRpbWUudGVtcGxhdGUoc3BlYywgaGIpO1xuICB9O1xuXG4gIHJldHVybiBoYjtcbn1cblxubGV0IGluc3QgPSBjcmVhdGUoKTtcbmluc3QuY3JlYXRlID0gY3JlYXRlO1xuXG5ub0NvbmZsaWN0KGluc3QpO1xuXG5pbnN0WydkZWZhdWx0J10gPSBpbnN0O1xuXG5leHBvcnQgZGVmYXVsdCBpbnN0O1xuIiwiaW1wb3J0IHtjcmVhdGVGcmFtZSwgZXh0ZW5kLCB0b1N0cmluZ30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgRXhjZXB0aW9uIGZyb20gJy4vZXhjZXB0aW9uJztcbmltcG9ydCB7cmVnaXN0ZXJEZWZhdWx0SGVscGVyc30gZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7cmVnaXN0ZXJEZWZhdWx0RGVjb3JhdG9yc30gZnJvbSAnLi9kZWNvcmF0b3JzJztcbmltcG9ydCBsb2dnZXIgZnJvbSAnLi9sb2dnZXInO1xuXG5leHBvcnQgY29uc3QgVkVSU0lPTiA9ICc0LjAuNSc7XG5leHBvcnQgY29uc3QgQ09NUElMRVJfUkVWSVNJT04gPSA3O1xuXG5leHBvcnQgY29uc3QgUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc9PSAxLngueCcsXG4gIDU6ICc9PSAyLjAuMC1hbHBoYS54JyxcbiAgNjogJz49IDIuMC4wLWJldGEuMScsXG4gIDc6ICc+PSA0LjAuMCdcbn07XG5cbmNvbnN0IG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuZXhwb3J0IGZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscywgZGVjb3JhdG9ycykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG4gIHRoaXMuZGVjb3JhdG9ycyA9IGRlY29yYXRvcnMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbiAgcmVnaXN0ZXJEZWZhdWx0RGVjb3JhdG9ycyh0aGlzKTtcbn1cblxuSGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2dnZXIubG9nLFxuXG4gIHJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbihuYW1lLCBmbikge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBpZiAoZm4pIHsgdGhyb3cgbmV3IEV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICAgIGV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5oZWxwZXJzW25hbWVdO1xuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSwgcGFydGlhbCkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBleHRlbmQodGhpcy5wYXJ0aWFscywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgcGFydGlhbCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihgQXR0ZW1wdGluZyB0byByZWdpc3RlciBhIHBhcnRpYWwgY2FsbGVkIFwiJHtuYW1lfVwiIGFzIHVuZGVmaW5lZGApO1xuICAgICAgfVxuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHBhcnRpYWw7XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLnBhcnRpYWxzW25hbWVdO1xuICB9LFxuXG4gIHJlZ2lzdGVyRGVjb3JhdG9yOiBmdW5jdGlvbihuYW1lLCBmbikge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBpZiAoZm4pIHsgdGhyb3cgbmV3IEV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBkZWNvcmF0b3JzJyk7IH1cbiAgICAgIGV4dGVuZCh0aGlzLmRlY29yYXRvcnMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRlY29yYXRvcnNbbmFtZV0gPSBmbjtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJEZWNvcmF0b3I6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5kZWNvcmF0b3JzW25hbWVdO1xuICB9XG59O1xuXG5leHBvcnQgbGV0IGxvZyA9IGxvZ2dlci5sb2c7XG5cbmV4cG9ydCB7Y3JlYXRlRnJhbWUsIGxvZ2dlcn07XG4iLCJpbXBvcnQgcmVnaXN0ZXJJbmxpbmUgZnJvbSAnLi9kZWNvcmF0b3JzL2lubGluZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckRlZmF1bHREZWNvcmF0b3JzKGluc3RhbmNlKSB7XG4gIHJlZ2lzdGVySW5saW5lKGluc3RhbmNlKTtcbn1cblxuIiwiaW1wb3J0IHtleHRlbmR9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJEZWNvcmF0b3IoJ2lubGluZScsIGZ1bmN0aW9uKGZuLCBwcm9wcywgY29udGFpbmVyLCBvcHRpb25zKSB7XG4gICAgbGV0IHJldCA9IGZuO1xuICAgIGlmICghcHJvcHMucGFydGlhbHMpIHtcbiAgICAgIHByb3BzLnBhcnRpYWxzID0ge307XG4gICAgICByZXQgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICAgIC8vIENyZWF0ZSBhIG5ldyBwYXJ0aWFscyBzdGFjayBmcmFtZSBwcmlvciB0byBleGVjLlxuICAgICAgICBsZXQgb3JpZ2luYWwgPSBjb250YWluZXIucGFydGlhbHM7XG4gICAgICAgIGNvbnRhaW5lci5wYXJ0aWFscyA9IGV4dGVuZCh7fSwgb3JpZ2luYWwsIHByb3BzLnBhcnRpYWxzKTtcbiAgICAgICAgbGV0IHJldCA9IGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICBjb250YWluZXIucGFydGlhbHMgPSBvcmlnaW5hbDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcHJvcHMucGFydGlhbHNbb3B0aW9ucy5hcmdzWzBdXSA9IG9wdGlvbnMuZm47XG5cbiAgICByZXR1cm4gcmV0O1xuICB9KTtcbn1cbiIsIlxuY29uc3QgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbmZ1bmN0aW9uIEV4Y2VwdGlvbihtZXNzYWdlLCBub2RlKSB7XG4gIGxldCBsb2MgPSBub2RlICYmIG5vZGUubG9jLFxuICAgICAgbGluZSxcbiAgICAgIGNvbHVtbjtcbiAgaWYgKGxvYykge1xuICAgIGxpbmUgPSBsb2Muc3RhcnQubGluZTtcbiAgICBjb2x1bW4gPSBsb2Muc3RhcnQuY29sdW1uO1xuXG4gICAgbWVzc2FnZSArPSAnIC0gJyArIGxpbmUgKyAnOicgKyBjb2x1bW47XG4gIH1cblxuICBsZXQgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG5cbiAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgRXhjZXB0aW9uKTtcbiAgfVxuXG4gIGlmIChsb2MpIHtcbiAgICB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lO1xuICAgIHRoaXMuY29sdW1uID0gY29sdW1uO1xuICB9XG59XG5cbkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuZXhwb3J0IGRlZmF1bHQgRXhjZXB0aW9uO1xuIiwiaW1wb3J0IHJlZ2lzdGVyQmxvY2tIZWxwZXJNaXNzaW5nIGZyb20gJy4vaGVscGVycy9ibG9jay1oZWxwZXItbWlzc2luZyc7XG5pbXBvcnQgcmVnaXN0ZXJFYWNoIGZyb20gJy4vaGVscGVycy9lYWNoJztcbmltcG9ydCByZWdpc3RlckhlbHBlck1pc3NpbmcgZnJvbSAnLi9oZWxwZXJzL2hlbHBlci1taXNzaW5nJztcbmltcG9ydCByZWdpc3RlcklmIGZyb20gJy4vaGVscGVycy9pZic7XG5pbXBvcnQgcmVnaXN0ZXJMb2cgZnJvbSAnLi9oZWxwZXJzL2xvZyc7XG5pbXBvcnQgcmVnaXN0ZXJMb29rdXAgZnJvbSAnLi9oZWxwZXJzL2xvb2t1cCc7XG5pbXBvcnQgcmVnaXN0ZXJXaXRoIGZyb20gJy4vaGVscGVycy93aXRoJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnMoaW5zdGFuY2UpIHtcbiAgcmVnaXN0ZXJCbG9ja0hlbHBlck1pc3NpbmcoaW5zdGFuY2UpO1xuICByZWdpc3RlckVhY2goaW5zdGFuY2UpO1xuICByZWdpc3RlckhlbHBlck1pc3NpbmcoaW5zdGFuY2UpO1xuICByZWdpc3RlcklmKGluc3RhbmNlKTtcbiAgcmVnaXN0ZXJMb2coaW5zdGFuY2UpO1xuICByZWdpc3Rlckxvb2t1cChpbnN0YW5jZSk7XG4gIHJlZ2lzdGVyV2l0aChpbnN0YW5jZSk7XG59XG4iLCJpbXBvcnQge2FwcGVuZENvbnRleHRQYXRoLCBjcmVhdGVGcmFtZSwgaXNBcnJheX0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGxldCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlLFxuICAgICAgICBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZuKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmIChjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaWRzKSB7XG4gICAgICAgICAgb3B0aW9ucy5pZHMgPSBbb3B0aW9ucy5uYW1lXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICBsZXQgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBhcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMubmFtZSk7XG4gICAgICAgIG9wdGlvbnMgPSB7ZGF0YTogZGF0YX07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiaW1wb3J0IHthcHBlbmRDb250ZXh0UGF0aCwgYmxvY2tQYXJhbXMsIGNyZWF0ZUZyYW1lLCBpc0FycmF5LCBpc0Z1bmN0aW9ufSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQgRXhjZXB0aW9uIGZyb20gJy4uL2V4Y2VwdGlvbic7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignTXVzdCBwYXNzIGl0ZXJhdG9yIHRvICNlYWNoJyk7XG4gICAgfVxuXG4gICAgbGV0IGZuID0gb3B0aW9ucy5mbixcbiAgICAgICAgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIHJldCA9ICcnLFxuICAgICAgICBkYXRhLFxuICAgICAgICBjb250ZXh0UGF0aDtcblxuICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgIGNvbnRleHRQYXRoID0gYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSkgKyAnLic7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXhlY0l0ZXJhdGlvbihmaWVsZCwgaW5kZXgsIGxhc3QpIHtcbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIGRhdGEua2V5ID0gZmllbGQ7XG4gICAgICAgIGRhdGEuaW5kZXggPSBpbmRleDtcbiAgICAgICAgZGF0YS5maXJzdCA9IGluZGV4ID09PSAwO1xuICAgICAgICBkYXRhLmxhc3QgPSAhIWxhc3Q7XG5cbiAgICAgICAgaWYgKGNvbnRleHRQYXRoKSB7XG4gICAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IGNvbnRleHRQYXRoICsgZmllbGQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtmaWVsZF0sIHtcbiAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgYmxvY2tQYXJhbXM6IGJsb2NrUGFyYW1zKFtjb250ZXh0W2ZpZWxkXSwgZmllbGRdLCBbY29udGV4dFBhdGggKyBmaWVsZCwgbnVsbF0pXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICAgIGZvciAobGV0IGogPSBjb250ZXh0Lmxlbmd0aDsgaSA8IGo7IGkrKykge1xuICAgICAgICAgIGlmIChpIGluIGNvbnRleHQpIHtcbiAgICAgICAgICAgIGV4ZWNJdGVyYXRpb24oaSwgaSwgaSA9PT0gY29udGV4dC5sZW5ndGggLSAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBwcmlvcktleTtcblxuICAgICAgICBmb3IgKGxldCBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmIChjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIC8vIFdlJ3JlIHJ1bm5pbmcgdGhlIGl0ZXJhdGlvbnMgb25lIHN0ZXAgb3V0IG9mIHN5bmMgc28gd2UgY2FuIGRldGVjdFxuICAgICAgICAgICAgLy8gdGhlIGxhc3QgaXRlcmF0aW9uIHdpdGhvdXQgaGF2ZSB0byBzY2FuIHRoZSBvYmplY3QgdHdpY2UgYW5kIGNyZWF0ZVxuICAgICAgICAgICAgLy8gYW4gaXRlcm1lZGlhdGUga2V5cyBhcnJheS5cbiAgICAgICAgICAgIGlmIChwcmlvcktleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGV4ZWNJdGVyYXRpb24ocHJpb3JLZXksIGkgLSAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByaW9yS2V5ID0ga2V5O1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocHJpb3JLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGV4ZWNJdGVyYXRpb24ocHJpb3JLZXksIGkgLSAxLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xufVxuIiwiaW1wb3J0IEV4Y2VwdGlvbiBmcm9tICcuLi9leGNlcHRpb24nO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKC8qIFthcmdzLCBdb3B0aW9ucyAqLykge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAvLyBBIG1pc3NpbmcgZmllbGQgaW4gYSB7e2Zvb319IGNvbnN0cnVjdC5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNvbWVvbmUgaXMgYWN0dWFsbHkgdHJ5aW5nIHRvIGNhbGwgc29tZXRoaW5nLCBibG93IHVwLlxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignTWlzc2luZyBoZWxwZXI6IFwiJyArIGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV0ubmFtZSArICdcIicpO1xuICAgIH1cbiAgfSk7XG59XG4iLCJpbXBvcnQge2lzRW1wdHksIGlzRnVuY3Rpb259IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb25kaXRpb25hbCkpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcbiAgICAvLyBiZWhhdmlvciBvZiBpc0VtcHR5LiBFZmZlY3RpdmVseSB0aGlzIGRldGVybWluZXMgaWYgMCBpcyBoYW5kbGVkIGJ5IHRoZSBwb3NpdGl2ZSBwYXRoIG9yIG5lZ2F0aXZlLlxuICAgIGlmICgoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwpIHx8IGlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZuLCBoYXNoOiBvcHRpb25zLmhhc2h9KTtcbiAgfSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24oLyogbWVzc2FnZSwgb3B0aW9ucyAqLykge1xuICAgIGxldCBhcmdzID0gW3VuZGVmaW5lZF0sXG4gICAgICAgIG9wdGlvbnMgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgfVxuXG4gICAgbGV0IGxldmVsID0gMTtcbiAgICBpZiAob3B0aW9ucy5oYXNoLmxldmVsICE9IG51bGwpIHtcbiAgICAgIGxldmVsID0gb3B0aW9ucy5oYXNoLmxldmVsO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsKSB7XG4gICAgICBsZXZlbCA9IG9wdGlvbnMuZGF0YS5sZXZlbDtcbiAgICB9XG4gICAgYXJnc1swXSA9IGxldmVsO1xuXG4gICAgaW5zdGFuY2UubG9nKC4uLiBhcmdzKTtcbiAgfSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9va3VwJywgZnVuY3Rpb24ob2JqLCBmaWVsZCkge1xuICAgIHJldHVybiBvYmogJiYgb2JqW2ZpZWxkXTtcbiAgfSk7XG59XG4iLCJpbXBvcnQge2FwcGVuZENvbnRleHRQYXRoLCBibG9ja1BhcmFtcywgY3JlYXRlRnJhbWUsIGlzRW1wdHksIGlzRnVuY3Rpb259IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgbGV0IGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmICghaXNFbXB0eShjb250ZXh0KSkge1xuICAgICAgbGV0IGRhdGEgPSBvcHRpb25zLmRhdGE7XG4gICAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCB7XG4gICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgIGJsb2NrUGFyYW1zOiBibG9ja1BhcmFtcyhbY29udGV4dF0sIFtkYXRhICYmIGRhdGEuY29udGV4dFBhdGhdKVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfVxuICB9KTtcbn1cbiIsImltcG9ydCB7aW5kZXhPZn0gZnJvbSAnLi91dGlscyc7XG5cbmxldCBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogWydkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXSxcbiAgbGV2ZWw6ICdpbmZvJyxcblxuICAvLyBNYXBzIGEgZ2l2ZW4gbGV2ZWwgdmFsdWUgdG8gdGhlIGBtZXRob2RNYXBgIGluZGV4ZXMgYWJvdmUuXG4gIGxvb2t1cExldmVsOiBmdW5jdGlvbihsZXZlbCkge1xuICAgIGlmICh0eXBlb2YgbGV2ZWwgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsZXQgbGV2ZWxNYXAgPSBpbmRleE9mKGxvZ2dlci5tZXRob2RNYXAsIGxldmVsLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgaWYgKGxldmVsTWFwID49IDApIHtcbiAgICAgICAgbGV2ZWwgPSBsZXZlbE1hcDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldmVsID0gcGFyc2VJbnQobGV2ZWwsIDEwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGV2ZWw7XG4gIH0sXG5cbiAgLy8gQ2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgLi4ubWVzc2FnZSkge1xuICAgIGxldmVsID0gbG9nZ2VyLmxvb2t1cExldmVsKGxldmVsKTtcblxuICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbG9nZ2VyLmxvb2t1cExldmVsKGxvZ2dlci5sZXZlbCkgPD0gbGV2ZWwpIHtcbiAgICAgIGxldCBtZXRob2QgPSBsb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICghY29uc29sZVttZXRob2RdKSB7ICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXG4gICAgICAgIG1ldGhvZCA9ICdsb2cnO1xuICAgICAgfVxuICAgICAgY29uc29sZVttZXRob2RdKC4uLm1lc3NhZ2UpOyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGxvZ2dlcjtcbiIsIi8qIGdsb2JhbCB3aW5kb3cgKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgbGV0IHJvb3QgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHdpbmRvdyxcbiAgICAgICRIYW5kbGViYXJzID0gcm9vdC5IYW5kbGViYXJzO1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBIYW5kbGViYXJzLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAocm9vdC5IYW5kbGViYXJzID09PSBIYW5kbGViYXJzKSB7XG4gICAgICByb290LkhhbmRsZWJhcnMgPSAkSGFuZGxlYmFycztcbiAgICB9XG4gICAgcmV0dXJuIEhhbmRsZWJhcnM7XG4gIH07XG59XG4iLCJpbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBFeGNlcHRpb24gZnJvbSAnLi9leGNlcHRpb24nO1xuaW1wb3J0IHsgQ09NUElMRVJfUkVWSVNJT04sIFJFVklTSU9OX0NIQU5HRVMsIGNyZWF0ZUZyYW1lIH0gZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrUmV2aXNpb24oY29tcGlsZXJJbmZvKSB7XG4gIGNvbnN0IGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IENPTVBJTEVSX1JFVklTSU9OO1xuXG4gIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgY29uc3QgcnVudGltZVZlcnNpb25zID0gUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiAnICtcbiAgICAgICAgICAgICdQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uICgnICsgcnVudGltZVZlcnNpb25zICsgJykgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uICgnICsgY29tcGlsZXJWZXJzaW9ucyArICcpLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ1RlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gJyArXG4gICAgICAgICAgICAnUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uICgnICsgY29tcGlsZXJJbmZvWzFdICsgJykuJyk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBpZiAoIWVudikge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ05vIGVudmlyb25tZW50IHBhc3NlZCB0byB0ZW1wbGF0ZScpO1xuICB9XG4gIGlmICghdGVtcGxhdGVTcGVjIHx8ICF0ZW1wbGF0ZVNwZWMubWFpbikge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ1Vua25vd24gdGVtcGxhdGUgb2JqZWN0OiAnICsgdHlwZW9mIHRlbXBsYXRlU3BlYyk7XG4gIH1cblxuICB0ZW1wbGF0ZVNwZWMubWFpbi5kZWNvcmF0b3IgPSB0ZW1wbGF0ZVNwZWMubWFpbl9kO1xuXG4gIC8vIE5vdGU6IFVzaW5nIGVudi5WTSByZWZlcmVuY2VzIHJhdGhlciB0aGFuIGxvY2FsIHZhciByZWZlcmVuY2VzIHRocm91Z2hvdXQgdGhpcyBzZWN0aW9uIHRvIGFsbG93XG4gIC8vIGZvciBleHRlcm5hbCB1c2VycyB0byBvdmVycmlkZSB0aGVzZSBhcyBwc3VlZG8tc3VwcG9ydGVkIEFQSXMuXG4gIGVudi5WTS5jaGVja1JldmlzaW9uKHRlbXBsYXRlU3BlYy5jb21waWxlcik7XG5cbiAgZnVuY3Rpb24gaW52b2tlUGFydGlhbFdyYXBwZXIocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zLmhhc2gpIHtcbiAgICAgIGNvbnRleHQgPSBVdGlscy5leHRlbmQoe30sIGNvbnRleHQsIG9wdGlvbnMuaGFzaCk7XG4gICAgICBpZiAob3B0aW9ucy5pZHMpIHtcbiAgICAgICAgb3B0aW9ucy5pZHNbMF0gPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHBhcnRpYWwgPSBlbnYuVk0ucmVzb2x2ZVBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICBsZXQgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKTtcblxuICAgIGlmIChyZXN1bHQgPT0gbnVsbCAmJiBlbnYuY29tcGlsZSkge1xuICAgICAgb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdID0gZW52LmNvbXBpbGUocGFydGlhbCwgdGVtcGxhdGVTcGVjLmNvbXBpbGVyT3B0aW9ucywgZW52KTtcbiAgICAgIHJlc3VsdCA9IG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7XG4gICAgICBpZiAob3B0aW9ucy5pbmRlbnQpIHtcbiAgICAgICAgbGV0IGxpbmVzID0gcmVzdWx0LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBsaW5lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICBpZiAoIWxpbmVzW2ldICYmIGkgKyAxID09PSBsKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaW5lc1tpXSA9IG9wdGlvbnMuaW5kZW50ICsgbGluZXNbaV07XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gbGluZXMuam9pbignXFxuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdUaGUgcGFydGlhbCAnICsgb3B0aW9ucy5uYW1lICsgJyBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgbGV0IGNvbnRhaW5lciA9IHtcbiAgICBzdHJpY3Q6IGZ1bmN0aW9uKG9iaiwgbmFtZSkge1xuICAgICAgaWYgKCEobmFtZSBpbiBvYmopKSB7XG4gICAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ1wiJyArIG5hbWUgKyAnXCIgbm90IGRlZmluZWQgaW4gJyArIG9iaik7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqW25hbWVdO1xuICAgIH0sXG4gICAgbG9va3VwOiBmdW5jdGlvbihkZXB0aHMsIG5hbWUpIHtcbiAgICAgIGNvbnN0IGxlbiA9IGRlcHRocy5sZW5ndGg7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmIChkZXB0aHNbaV0gJiYgZGVwdGhzW2ldW25hbWVdICE9IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gZGVwdGhzW2ldW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBsYW1iZGE6IGZ1bmN0aW9uKGN1cnJlbnQsIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgY3VycmVudCA9PT0gJ2Z1bmN0aW9uJyA/IGN1cnJlbnQuY2FsbChjb250ZXh0KSA6IGN1cnJlbnQ7XG4gICAgfSxcblxuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG5cbiAgICBmbjogZnVuY3Rpb24oaSkge1xuICAgICAgbGV0IHJldCA9IHRlbXBsYXRlU3BlY1tpXTtcbiAgICAgIHJldC5kZWNvcmF0b3IgPSB0ZW1wbGF0ZVNwZWNbaSArICdfZCddO1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgICAgIGxldCBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0sXG4gICAgICAgICAgZm4gPSB0aGlzLmZuKGkpO1xuICAgICAgaWYgKGRhdGEgfHwgZGVwdGhzIHx8IGJsb2NrUGFyYW1zIHx8IGRlY2xhcmVkQmxvY2tQYXJhbXMpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB3cmFwUHJvZ3JhbSh0aGlzLCBpLCBmbiwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSB3cmFwUHJvZ3JhbSh0aGlzLCBpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcblxuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbHVlLCBkZXB0aCkge1xuICAgICAgd2hpbGUgKHZhbHVlICYmIGRlcHRoLS0pIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5fcGFyZW50O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0sXG4gICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgIGxldCBvYmogPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgICAgIG9iaiA9IFV0aWxzLmV4dGVuZCh7fSwgY29tbW9uLCBwYXJhbSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfSxcblxuICAgIG5vb3A6IGVudi5WTS5ub29wLFxuICAgIGNvbXBpbGVySW5mbzogdGVtcGxhdGVTcGVjLmNvbXBpbGVyXG4gIH07XG5cbiAgZnVuY3Rpb24gcmV0KGNvbnRleHQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBkYXRhID0gb3B0aW9ucy5kYXRhO1xuXG4gICAgcmV0Ll9zZXR1cChvcHRpb25zKTtcbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCAmJiB0ZW1wbGF0ZVNwZWMudXNlRGF0YSkge1xuICAgICAgZGF0YSA9IGluaXREYXRhKGNvbnRleHQsIGRhdGEpO1xuICAgIH1cbiAgICBsZXQgZGVwdGhzLFxuICAgICAgICBibG9ja1BhcmFtcyA9IHRlbXBsYXRlU3BlYy51c2VCbG9ja1BhcmFtcyA/IFtdIDogdW5kZWZpbmVkO1xuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlRGVwdGhzKSB7XG4gICAgICBpZiAob3B0aW9ucy5kZXB0aHMpIHtcbiAgICAgICAgZGVwdGhzID0gY29udGV4dCAhPT0gb3B0aW9ucy5kZXB0aHNbMF0gPyBbY29udGV4dF0uY29uY2F0KG9wdGlvbnMuZGVwdGhzKSA6IG9wdGlvbnMuZGVwdGhzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVwdGhzID0gW2NvbnRleHRdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1haW4oY29udGV4dC8qLCBvcHRpb25zKi8pIHtcbiAgICAgIHJldHVybiAnJyArIHRlbXBsYXRlU3BlYy5tYWluKGNvbnRhaW5lciwgY29udGV4dCwgY29udGFpbmVyLmhlbHBlcnMsIGNvbnRhaW5lci5wYXJ0aWFscywgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gICAgfVxuICAgIG1haW4gPSBleGVjdXRlRGVjb3JhdG9ycyh0ZW1wbGF0ZVNwZWMubWFpbiwgbWFpbiwgY29udGFpbmVyLCBvcHRpb25zLmRlcHRocyB8fCBbXSwgZGF0YSwgYmxvY2tQYXJhbXMpO1xuICAgIHJldHVybiBtYWluKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG4gIHJldC5pc1RvcCA9IHRydWU7XG5cbiAgcmV0Ll9zZXR1cCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5oZWxwZXJzLCBlbnYuaGVscGVycyk7XG5cbiAgICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlUGFydGlhbCkge1xuICAgICAgICBjb250YWluZXIucGFydGlhbHMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5wYXJ0aWFscywgZW52LnBhcnRpYWxzKTtcbiAgICAgIH1cbiAgICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlUGFydGlhbCB8fCB0ZW1wbGF0ZVNwZWMudXNlRGVjb3JhdG9ycykge1xuICAgICAgICBjb250YWluZXIuZGVjb3JhdG9ycyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLmRlY29yYXRvcnMsIGVudi5kZWNvcmF0b3JzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBvcHRpb25zLmhlbHBlcnM7XG4gICAgICBjb250YWluZXIucGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgICAgY29udGFpbmVyLmRlY29yYXRvcnMgPSBvcHRpb25zLmRlY29yYXRvcnM7XG4gICAgfVxuICB9O1xuXG4gIHJldC5fY2hpbGQgPSBmdW5jdGlvbihpLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VCbG9ja1BhcmFtcyAmJiAhYmxvY2tQYXJhbXMpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ211c3QgcGFzcyBibG9jayBwYXJhbXMnKTtcbiAgICB9XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMgJiYgIWRlcHRocykge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignbXVzdCBwYXNzIHBhcmVudCBkZXB0aHMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd3JhcFByb2dyYW0oY29udGFpbmVyLCBpLCB0ZW1wbGF0ZVNwZWNbaV0sIGRhdGEsIDAsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICB9O1xuICByZXR1cm4gcmV0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JhcFByb2dyYW0oY29udGFpbmVyLCBpLCBmbiwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICBmdW5jdGlvbiBwcm9nKGNvbnRleHQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBjdXJyZW50RGVwdGhzID0gZGVwdGhzO1xuICAgIGlmIChkZXB0aHMgJiYgY29udGV4dCAhPT0gZGVwdGhzWzBdKSB7XG4gICAgICBjdXJyZW50RGVwdGhzID0gW2NvbnRleHRdLmNvbmNhdChkZXB0aHMpO1xuICAgIH1cblxuICAgIHJldHVybiBmbihjb250YWluZXIsXG4gICAgICAgIGNvbnRleHQsXG4gICAgICAgIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsXG4gICAgICAgIG9wdGlvbnMuZGF0YSB8fCBkYXRhLFxuICAgICAgICBibG9ja1BhcmFtcyAmJiBbb3B0aW9ucy5ibG9ja1BhcmFtc10uY29uY2F0KGJsb2NrUGFyYW1zKSxcbiAgICAgICAgY3VycmVudERlcHRocyk7XG4gIH1cblxuICBwcm9nID0gZXhlY3V0ZURlY29yYXRvcnMoZm4sIHByb2csIGNvbnRhaW5lciwgZGVwdGhzLCBkYXRhLCBibG9ja1BhcmFtcyk7XG5cbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IGRlcHRocyA/IGRlcHRocy5sZW5ndGggOiAwO1xuICBwcm9nLmJsb2NrUGFyYW1zID0gZGVjbGFyZWRCbG9ja1BhcmFtcyB8fCAwO1xuICByZXR1cm4gcHJvZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVQYXJ0aWFsKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgaWYgKCFwYXJ0aWFsKSB7XG4gICAgaWYgKG9wdGlvbnMubmFtZSA9PT0gJ0BwYXJ0aWFsLWJsb2NrJykge1xuICAgICAgcGFydGlhbCA9IG9wdGlvbnMuZGF0YVsncGFydGlhbC1ibG9jayddO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0aWFsID0gb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdO1xuICAgIH1cbiAgfSBlbHNlIGlmICghcGFydGlhbC5jYWxsICYmICFvcHRpb25zLm5hbWUpIHtcbiAgICAvLyBUaGlzIGlzIGEgZHluYW1pYyBwYXJ0aWFsIHRoYXQgcmV0dXJuZWQgYSBzdHJpbmdcbiAgICBvcHRpb25zLm5hbWUgPSBwYXJ0aWFsO1xuICAgIHBhcnRpYWwgPSBvcHRpb25zLnBhcnRpYWxzW3BhcnRpYWxdO1xuICB9XG4gIHJldHVybiBwYXJ0aWFsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMucGFydGlhbCA9IHRydWU7XG4gIGlmIChvcHRpb25zLmlkcykge1xuICAgIG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCA9IG9wdGlvbnMuaWRzWzBdIHx8IG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aDtcbiAgfVxuXG4gIGxldCBwYXJ0aWFsQmxvY2s7XG4gIGlmIChvcHRpb25zLmZuICYmIG9wdGlvbnMuZm4gIT09IG5vb3ApIHtcbiAgICBvcHRpb25zLmRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIHBhcnRpYWxCbG9jayA9IG9wdGlvbnMuZGF0YVsncGFydGlhbC1ibG9jayddID0gb3B0aW9ucy5mbjtcblxuICAgIGlmIChwYXJ0aWFsQmxvY2sucGFydGlhbHMpIHtcbiAgICAgIG9wdGlvbnMucGFydGlhbHMgPSBVdGlscy5leHRlbmQoe30sIG9wdGlvbnMucGFydGlhbHMsIHBhcnRpYWxCbG9jay5wYXJ0aWFscyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHBhcnRpYWwgPT09IHVuZGVmaW5lZCAmJiBwYXJ0aWFsQmxvY2spIHtcbiAgICBwYXJ0aWFsID0gcGFydGlhbEJsb2NrO1xuICB9XG5cbiAgaWYgKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ1RoZSBwYXJ0aWFsICcgKyBvcHRpb25zLm5hbWUgKyAnIGNvdWxkIG5vdCBiZSBmb3VuZCcpO1xuICB9IGVsc2UgaWYgKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub29wKCkgeyByZXR1cm4gJyc7IH1cblxuZnVuY3Rpb24gaW5pdERhdGEoY29udGV4dCwgZGF0YSkge1xuICBpZiAoIWRhdGEgfHwgISgncm9vdCcgaW4gZGF0YSkpIHtcbiAgICBkYXRhID0gZGF0YSA/IGNyZWF0ZUZyYW1lKGRhdGEpIDoge307XG4gICAgZGF0YS5yb290ID0gY29udGV4dDtcbiAgfVxuICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gZXhlY3V0ZURlY29yYXRvcnMoZm4sIHByb2csIGNvbnRhaW5lciwgZGVwdGhzLCBkYXRhLCBibG9ja1BhcmFtcykge1xuICBpZiAoZm4uZGVjb3JhdG9yKSB7XG4gICAgbGV0IHByb3BzID0ge307XG4gICAgcHJvZyA9IGZuLmRlY29yYXRvcihwcm9nLCBwcm9wcywgY29udGFpbmVyLCBkZXB0aHMgJiYgZGVwdGhzWzBdLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgICBVdGlscy5leHRlbmQocHJvZywgcHJvcHMpO1xuICB9XG4gIHJldHVybiBwcm9nO1xufVxuIiwiLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbmZ1bmN0aW9uIFNhZmVTdHJpbmcoc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufVxuXG5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IFNhZmVTdHJpbmcucHJvdG90eXBlLnRvSFRNTCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJycgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydCBkZWZhdWx0IFNhZmVTdHJpbmc7XG4iLCJjb25zdCBlc2NhcGUgPSB7XG4gICcmJzogJyZhbXA7JyxcbiAgJzwnOiAnJmx0OycsXG4gICc+JzogJyZndDsnLFxuICAnXCInOiAnJnF1b3Q7JyxcbiAgXCInXCI6ICcmI3gyNzsnLFxuICAnYCc6ICcmI3g2MDsnLFxuICAnPSc6ICcmI3gzRDsnXG59O1xuXG5jb25zdCBiYWRDaGFycyA9IC9bJjw+XCInYD1dL2csXG4gICAgICBwb3NzaWJsZSA9IC9bJjw+XCInYD1dLztcblxuZnVuY3Rpb24gZXNjYXBlQ2hhcihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW5kKG9iai8qICwgLi4uc291cmNlICovKSB7XG4gIGZvciAobGV0IGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yIChsZXQga2V5IGluIGFyZ3VtZW50c1tpXSkge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhcmd1bWVudHNbaV0sIGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSBhcmd1bWVudHNbaV1ba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufVxuXG5leHBvcnQgbGV0IHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLy8gU291cmNlZCBmcm9tIGxvZGFzaFxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9MSUNFTlNFLnR4dFxuLyogZXNsaW50LWRpc2FibGUgZnVuYy1zdHlsZSAqL1xubGV0IGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIGZhbGxiYWNrIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaVxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmlmIChpc0Z1bmN0aW9uKC94LykpIHtcbiAgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfTtcbn1cbmV4cG9ydCB7aXNGdW5jdGlvbn07XG4vKiBlc2xpbnQtZW5hYmxlIGZ1bmMtc3R5bGUgKi9cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmV4cG9ydCBjb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpID8gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgOiBmYWxzZTtcbn07XG5cbi8vIE9sZGVyIElFIHZlcnNpb25zIGRvIG5vdCBkaXJlY3RseSBzdXBwb3J0IGluZGV4T2Ygc28gd2UgbXVzdCBpbXBsZW1lbnQgb3VyIG93biwgc2FkbHkuXG5leHBvcnQgZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgdmFsdWUpIHtcbiAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGFycmF5W2ldID09PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgJiYgc3RyaW5nLnRvSFRNTCkge1xuICAgICAgcmV0dXJuIHN0cmluZy50b0hUTUwoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfSBlbHNlIGlmICghc3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nICsgJyc7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmc7XG4gIH1cblxuICBpZiAoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUZyYW1lKG9iamVjdCkge1xuICBsZXQgZnJhbWUgPSBleHRlbmQoe30sIG9iamVjdCk7XG4gIGZyYW1lLl9wYXJlbnQgPSBvYmplY3Q7XG4gIHJldHVybiBmcmFtZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJsb2NrUGFyYW1zKHBhcmFtcywgaWRzKSB7XG4gIHBhcmFtcy5wYXRoID0gaWRzO1xuICByZXR1cm4gcGFyYW1zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kQ29udGV4dFBhdGgoY29udGV4dFBhdGgsIGlkKSB7XG4gIHJldHVybiAoY29udGV4dFBhdGggPyBjb250ZXh0UGF0aCArICcuJyA6ICcnKSArIGlkO1xufVxuIiwiLy8gQ3JlYXRlIGEgc2ltcGxlIHBhdGggYWxpYXMgdG8gYWxsb3cgYnJvd3NlcmlmeSB0byByZXNvbHZlXG4vLyB0aGUgcnVudGltZSBvbiBhIHN1cHBvcnRlZCBwYXRoLlxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZScpWydkZWZhdWx0J107XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIilbXCJkZWZhdWx0XCJdO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IGpRdWVyeSBmcm9tICdqcXVlcnknXG5pbXBvcnQgeyBDdXJyZW50VXNlck1vZGVsIH0gZnJvbSAnLi9tb2RlbHMvQ3VycmVudFVzZXInXG5pbXBvcnQgeyBBdWRpb1BsYXllclZpZXcgfSBmcm9tICcuL3BhcnRpYWxzL0F1ZGlvUGxheWVyVmlldydcbmltcG9ydCBSb3V0ZXIgZnJvbSAnLi9yb3V0ZXInXG5pbXBvcnQgUG9seWZpbGwgZnJvbSAnLi9wb2x5ZmlsbC5qcydcblxuJCA9IHJlcXVpcmUoJ2pxdWVyeScpO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcHBsaWNhdGlvbiB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMucm91dGVyID0gbnVsbDtcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBQb2x5ZmlsbC5pbnN0YWxsKCk7XG4gICAgICAgIEJhY2tib25lLiQgPSAkO1xuXG4gICAgICAgIHRoaXMucm91dGVyID0gbmV3IFJvdXRlcigpO1xuICAgICAgICB0aGlzLnJlZGlyZWN0VXJsQ2xpY2tzVG9Sb3V0ZXIoKTtcblxuICAgICAgICB2YXIgYXVkaW9QbGF5ZXIgPSBuZXcgQXVkaW9QbGF5ZXJWaWV3KHtlbDogJyNhdWRpby1wbGF5ZXInfSk7XG5cbiAgICAgICAgLy8gbG9hZCB1c2VyXG4gICAgICAgIG5ldyBDdXJyZW50VXNlck1vZGVsKCkuZmV0Y2goKVxuICAgICAgICAgICAgLnRoZW4obW9kZWwgPT4gdGhpcy5vblVzZXJBdXRoZW50aWNhdGVkKG1vZGVsKSwgcmVzcG9uc2UgPT4gdGhpcy5vblVzZXJBdXRoRmFpbChyZXNwb25zZSkpO1xuICAgIH1cblxuICAgIHJlZGlyZWN0VXJsQ2xpY2tzVG9Sb3V0ZXIoKSB7XG4gICAgICAgIC8vIFVzZSBkZWxlZ2F0aW9uIHRvIGF2b2lkIGluaXRpYWwgRE9NIHNlbGVjdGlvbiBhbmQgYWxsb3cgYWxsIG1hdGNoaW5nIGVsZW1lbnRzIHRvIGJ1YmJsZVxuICAgICAgICAkKGRvY3VtZW50KS5kZWxlZ2F0ZShcImFcIiwgXCJjbGlja1wiLCBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIGFuY2hvciBocmVmIGFuZCBwcm90Y29sXG4gICAgICAgICAgICB2YXIgaHJlZiA9ICQodGhpcykuYXR0cihcImhyZWZcIik7XG4gICAgICAgICAgICB2YXIgcHJvdG9jb2wgPSB0aGlzLnByb3RvY29sICsgXCIvL1wiO1xuXG4gICAgICAgICAgICB2YXIgb3BlbkxpbmtJblRhYiA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZihocmVmID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyBubyB1cmwgc3BlY2lmaWVkLCBkb24ndCBkbyBhbnl0aGluZy5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHNwZWNpYWwgY2FzZXMgdGhhdCB3ZSB3YW50IHRvIGhpdCB0aGUgc2VydmVyXG4gICAgICAgICAgICBpZihocmVmID09IFwiL2F1dGhcIikge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRW5zdXJlIHRoZSBwcm90b2NvbCBpcyBub3QgcGFydCBvZiBVUkwsIG1lYW5pbmcgaXRzIHJlbGF0aXZlLlxuICAgICAgICAgICAgLy8gU3RvcCB0aGUgZXZlbnQgYnViYmxpbmcgdG8gZW5zdXJlIHRoZSBsaW5rIHdpbGwgbm90IGNhdXNlIGEgcGFnZSByZWZyZXNoLlxuICAgICAgICAgICAgaWYgKCFvcGVuTGlua0luVGFiICYmIGhyZWYuc2xpY2UocHJvdG9jb2wubGVuZ3RoKSAhPT0gcHJvdG9jb2wpIHtcbiAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgICAgIC8vIE5vdGUgYnkgdXNpbmcgQmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZSwgcm91dGVyIGV2ZW50cyB3aWxsIG5vdCBiZVxuICAgICAgICAgICAgICAgIC8vIHRyaWdnZXJlZC4gIElmIHRoaXMgaXMgYSBwcm9ibGVtLCBjaGFuZ2UgdGhpcyB0byBuYXZpZ2F0ZSBvbiB5b3VyXG4gICAgICAgICAgICAgICAgLy8gcm91dGVyLlxuICAgICAgICAgICAgICAgIEJhY2tib25lLmhpc3RvcnkubmF2aWdhdGUoaHJlZiwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9uVXNlckF1dGhGYWlsKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIHVzZXIgbm90IGF1dGhlbnRpY2F0ZWRcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PSA0MDEpIHtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucm91dGVyLnNldFVzZXIobnVsbCk7XG4gICAgICAgIHRoaXMuc3RhcnRSb3V0ZXJOYXZpZ2F0aW9uKCk7XG4gICAgfVxuXG4gICAgb25Vc2VyQXV0aGVudGljYXRlZCh1c2VyKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGVkIGN1cnJlbnQgdXNlclwiLCB1c2VyKTtcbiAgICAgICAgdGhpcy5yb3V0ZXIuc2V0VXNlcih1c2VyKTtcbiAgICAgICAgdGhpcy5zdGFydFJvdXRlck5hdmlnYXRpb24oKTtcbiAgICB9XG5cbiAgICBzdGFydFJvdXRlck5hdmlnYXRpb24oKSB7XG4gICAgICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe3B1c2hTdGF0ZTogdHJ1ZSwgaGFzaENoYW5nZTogZmFsc2V9KTtcbiAgICAgICAgLy9pZiAoIUJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe3B1c2hTdGF0ZTogdHJ1ZSwgaGFzaENoYW5nZTogZmFsc2V9KSkgcm91dGVyLm5hdmlnYXRlKCc0MDQnLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuICAgIH1cbn1cblxuZXhwb3J0IGxldCBhcHAgPSBuZXcgQXBwbGljYXRpb24oKTtcblxuXG4kKCgpID0+IHtcbiAgICAvLyBzZXR1cCByYXZlbiB0byBwdXNoIG1lc3NhZ2VzIHRvIG91ciBzZW50cnlcbiAgICAvL1JhdmVuLmNvbmZpZygnaHR0cHM6Ly9kYjJhN2Q1ODEwN2M0OTc1YWU3ZGU3MzZhNjMwOGExZUBhcHAuZ2V0c2VudHJ5LmNvbS81MzQ1NicsIHtcbiAgICAvLyAgICB3aGl0ZWxpc3RVcmxzOiBbJ3N0YWdpbmcuY291Y2hwb2QuY29tJywgJ2NvdWNocG9kLmNvbSddIC8vIHByb2R1Y3Rpb24gb25seVxuICAgIC8vfSkuaW5zdGFsbCgpXG5cbiAgICB3aW5kb3cuYXBwID0gYXBwO1xuICAgIGFwcC5pbml0aWFsaXplKCk7XG5cbiAgICAvLyBmb3IgcHJvZHVjdGlvbiwgY291bGQgd3JhcCBkb21SZWFkeUNhbGxiYWNrIGFuZCBsZXQgcmF2ZW4gaGFuZGxlIGFueSBleGNlcHRpb25zXG5cbiAgICAvKlxuICAgICB0cnkge1xuICAgICBkb21SZWFkeUNhbGxiYWNrKCk7XG4gICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgIFJhdmVuLmNhcHR1cmVFeGNlcHRpb24oZXJyKTtcbiAgICAgY29uc29sZS5sb2coXCJbRXJyb3JdIFVuaGFuZGxlZCBFeGNlcHRpb24gd2FzIGNhdWdodCBhbmQgc2VudCB2aWEgUmF2ZW46XCIpO1xuICAgICBjb25zb2xlLmRpcihlcnIpO1xuICAgICB9XG4gICAgICovXG59KVxuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcblxuY2xhc3MgQXVkaW9DYXB0dXJlIHtcbiAgICBjb25zdHJ1Y3RvcihtaWNyb3Bob25lTWVkaWFTdHJlYW0pIHtcbiAgICAgICAgLy8gc3Bhd24gYmFja2dyb3VuZCB3b3JrZXJcbiAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIgPSBuZXcgV29ya2VyKFwiL2Fzc2V0cy9qcy93b3JrZXItZW5jb2Rlci5taW4uanNcIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJJbml0aWFsaXplZCBBdWRpb0NhcHR1cmVcIik7XG5cbiAgICAgICAgdGhpcy5fYXVkaW9Db250ZXh0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyID0gbnVsbDtcbiAgICAgICAgdGhpcy5faXNSZWNvcmRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lciA9IG51bGw7XG4gICAgICAgIHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2sgPSBudWxsO1xuICAgICAgICB0aGlzLl9hdWRpb0FuYWx5emVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluID0gbnVsbDtcbiAgICAgICAgdGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0gPSBtaWNyb3Bob25lTWVkaWFTdHJlYW07XG5cbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbGF0ZXN0QXVkaW9CdWZmZXIgPSBbXTtcbiAgICAgICAgdGhpcy5fY2FjaGVkR2FpblZhbHVlID0gMTtcbiAgICAgICAgdGhpcy5fb25TdGFydGVkQ2FsbGJhY2sgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuX2ZmdFNpemUgPSAyNTY7XG4gICAgICAgIHRoaXMuX2ZmdFNtb290aGluZyA9IDAuODtcbiAgICAgICAgdGhpcy5fdG90YWxOdW1TYW1wbGVzID0gMDtcblxuXG4gICAgfVxuICAgIGNyZWF0ZUF1ZGlvQ29udGV4dChtZWRpYVN0cmVhbSkge1xuICAgICAgICAvLyBidWlsZCBjYXB0dXJlIGdyYXBoXG4gICAgICAgIHRoaXMuX2F1ZGlvQ29udGV4dCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0KSgpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0ID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKG1lZGlhU3RyZWFtKTtcbiAgICAgICAgdGhpcy5fYXVkaW9EZXN0aW5hdGlvbiA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbURlc3RpbmF0aW9uKCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0TWFudWFsRW5jb2RpbmcoKTsgX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlOiBcIiArIHRoaXMuX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlICsgXCIgSHpcIik7XG5cbiAgICAgICAgLy8gY3JlYXRlIGEgbGlzdGVuZXIgbm9kZSB0byBncmFiIG1pY3JvcGhvbmUgc2FtcGxlcyBhbmQgZmVlZCBpdCB0byBvdXIgYmFja2dyb3VuZCB3b3JrZXJcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lciA9ICh0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yIHx8IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVKYXZhU2NyaXB0Tm9kZSkuY2FsbCh0aGlzLl9hdWRpb0NvbnRleHQsIDE2Mzg0LCAxLCAxKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcInRoaXMuX2NhY2hlZEdhaW5WYWx1ZSA9IFwiICsgdGhpcy5fY2FjaGVkR2FpblZhbHVlKTtcblxuICAgICAgICB0aGlzLl9hdWRpb0dhaW4gPSB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLl9hdWRpb0dhaW4uZ2Fpbi52YWx1ZSA9IHRoaXMuX2NhY2hlZEdhaW5WYWx1ZTtcblxuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIgPSB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyLmZmdFNpemUgPSB0aGlzLl9mZnRTaXplO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gdGhpcy5fZmZ0U21vb3RoaW5nO1xuICAgIH1cblxuICAgIHN0YXJ0TWFudWFsRW5jb2RpbmcobWVkaWFTdHJlYW0pIHtcblxuICAgICAgICBpZiAoIXRoaXMuX2F1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5jcmVhdGVBdWRpb0NvbnRleHQobWVkaWFTdHJlYW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLl9lbmNvZGluZ1dvcmtlcilcbiAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyID0gbmV3IFdvcmtlcihcIi9hc3NldHMvanMvd29ya2VyLWVuY29kZXIubWluLmpzXCIpO1xuXG4gICAgICAgIC8vIHJlLWhvb2sgYXVkaW8gbGlzdGVuZXIgbm9kZSBldmVyeSB0aW1lIHdlIHN0YXJ0LCBiZWNhdXNlIF9lbmNvZGluZ1dvcmtlciByZWZlcmVuY2Ugd2lsbCBjaGFuZ2VcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lci5vbmF1ZGlvcHJvY2VzcyA9IChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2lzUmVjb3JkaW5nKSByZXR1cm47XG5cbiAgICAgICAgICAgIHZhciBtc2cgPSB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiBcInByb2Nlc3NcIixcblxuICAgICAgICAgICAgICAgIC8vIHR3byBGbG9hdDMyQXJyYXlzXG4gICAgICAgICAgICAgICAgbGVmdDogZS5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKVxuICAgICAgICAgICAgICAgIC8vcmlnaHQ6IGUuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vdmFyIGxlZnRPdXQgPSBlLm91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgIC8vZm9yKHZhciBpID0gMDsgaSA8IG1zZy5sZWZ0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyAgICBsZWZ0T3V0W2ldID0gbXNnLmxlZnRbaV07XG4gICAgICAgICAgICAvL31cblxuICAgICAgICAgICAgdGhpcy5fdG90YWxOdW1TYW1wbGVzICs9IG1zZy5sZWZ0Lmxlbmd0aDtcblxuICAgICAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIucG9zdE1lc3NhZ2UobXNnKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBoYW5kbGUgbWVzc2FnZXMgZnJvbSB0aGUgZW5jb2Rpbmctd29ya2VyXG4gICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLm9ubWVzc2FnZSA9IChlKSA9PiB7XG5cbiAgICAgICAgICAgIC8vIHdvcmtlciBmaW5pc2hlZCBhbmQgaGFzIHRoZSBmaW5hbCBlbmNvZGVkIGF1ZGlvIGJ1ZmZlciBmb3IgdXNcbiAgICAgICAgICAgIGlmIChlLmRhdGEuYWN0aW9uID09PSBcImVuY29kZWRcIikge1xuICAgICAgICAgICAgICAgIHZhciBlbmNvZGVkX2Jsb2IgPSBuZXcgQmxvYihbZS5kYXRhLmJ1ZmZlcl0sIHt0eXBlOiAnYXVkaW8vb2dnJ30pO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlLmRhdGEuYnVmZmVyLmJ1ZmZlciA9IFwiICsgZS5kYXRhLmJ1ZmZlci5idWZmZXIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZS5kYXRhLmJ1ZmZlci5ieXRlTGVuZ3RoID0gXCIgKyBlLmRhdGEuYnVmZmVyLmJ5dGVMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic2FtcGxlUmF0ZSA9IFwiICsgdGhpcy5fYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidG90YWxOdW1TYW1wbGVzID0gXCIgKyB0aGlzLl90b3RhbE51bVNhbXBsZXMpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRHVyYXRpb24gb2YgcmVjb3JkaW5nID0gXCIgKyAodGhpcy5fdG90YWxOdW1TYW1wbGVzIC8gdGhpcy5fYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUpICsgXCIgc2Vjb25kc1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IGVuY29kZWQgYmxvYjogc2l6ZT1cIiArIGVuY29kZWRfYmxvYi5zaXplICsgXCIgdHlwZT1cIiArIGVuY29kZWRfYmxvYi50eXBlKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKGVuY29kZWRfYmxvYik7XG5cbiAgICAgICAgICAgICAgICAvLyB3b3JrZXIgaGFzIGV4aXRlZCwgdW5yZWZlcmVuY2UgaXRcbiAgICAgICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gY29uZmlndXJlIHdvcmtlciB3aXRoIGEgc2FtcGxpbmcgcmF0ZSBhbmQgYnVmZmVyLXNpemVcbiAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgYWN0aW9uOiBcImluaXRpYWxpemVcIixcbiAgICAgICAgICAgIHNhbXBsZV9yYXRlOiB0aGlzLl9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgIGJ1ZmZlcl9zaXplOiB0aGlzLl9hdWRpb0xpc3RlbmVyLmJ1ZmZlclNpemVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVE9ETzogaXQgbWlnaHQgYmUgYmV0dGVyIHRvIGxpc3RlbiBmb3IgYSBtZXNzYWdlIGJhY2sgZnJvbSB0aGUgYmFja2dyb3VuZCB3b3JrZXIgYmVmb3JlIGNvbnNpZGVyaW5nIHRoYXQgcmVjb3JkaW5nIGhhcyBiZWdhblxuICAgICAgICAvLyBpdCdzIGVhc2llciB0byB0cmltIGF1ZGlvIHRoYW4gY2FwdHVyZSBhIG1pc3Npbmcgd29yZCBhdCB0aGUgc3RhcnQgb2YgYSBzZW50ZW5jZVxuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGZhbHNlO1xuXG4gICAgICAgIC8vIGNvbm5lY3QgYXVkaW8gbm9kZXNcbiAgICAgICAgLy8gYXVkaW8taW5wdXQgLT4gZ2FpbiAtPiBmZnQtYW5hbHl6ZXIgLT4gUENNLWRhdGEgY2FwdHVyZSAtPiBkZXN0aW5hdGlvblxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydE1hbnVhbEVuY29kaW5nKCk7IENvbm5lY3RpbmcgQXVkaW8gTm9kZXMuLlwiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGlucHV0LT5nYWluXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0LmNvbm5lY3QodGhpcy5fYXVkaW9HYWluKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGdhaW4tPmFuYWx5emVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvR2Fpbi5jb25uZWN0KHRoaXMuX2F1ZGlvQW5hbHl6ZXIpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY29ubmVjdGluZzogYW5hbHl6ZXItPmxpc3Rlc25lclwiKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyLmNvbm5lY3QodGhpcy5fYXVkaW9MaXN0ZW5lcik7XG4gICAgICAgIC8vIGNvbm5lY3QgZ2FpbiBkaXJlY3RseSBpbnRvIGxpc3RlbmVyLCBieXBhc3NpbmcgYW5hbHl6ZXJcbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBnYWluLT5saXN0ZW5lclwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluLmNvbm5lY3QodGhpcy5fYXVkaW9MaXN0ZW5lcik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdGluZzogbGlzdGVuZXItPmRlc3RpbmF0aW9uXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyLmNvbm5lY3QodGhpcy5fYXVkaW9EZXN0aW5hdGlvbik7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgc2h1dGRvd25NYW51YWxFbmNvZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnNodXRkb3duTWFudWFsRW5jb2RpbmcoKTsgVGVhcmluZyBkb3duIEF1ZGlvQVBJIGNvbm5lY3Rpb25zLi5cIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBsaXN0ZW5lci0+ZGVzdGluYXRpb25cIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0Rlc3RpbmF0aW9uKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGFuYWx5emVyLT5saXN0ZXNuZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogZ2Fpbi0+YW5hbHl6ZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9HYWluLmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9BbmFseXplcik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogZ2Fpbi0+bGlzdGVuZXJcIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvR2Fpbi5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGlucHV0LT5nYWluXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0LmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9HYWluKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbWljcm9waG9uZSBtYXkgYmUgbGl2ZSwgYnV0IGl0IGlzbid0IHJlY29yZGluZy4gVGhpcyB0b2dnbGVzIHRoZSBhY3R1YWwgd3JpdGluZyB0byB0aGUgY2FwdHVyZSBzdHJlYW0uXG4gICAgICogY2FwdHVyZUF1ZGlvU2FtcGxlcyBib29sIGluZGljYXRlcyB3aGV0aGVyIHRvIHJlY29yZCBmcm9tIG1pY1xuICAgICAqL1xuICAgIHRvZ2dsZU1pY3JvcGhvbmVSZWNvcmRpbmcoY2FwdHVyZUF1ZGlvU2FtcGxlcykge1xuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGNhcHR1cmVBdWRpb1NhbXBsZXM7XG4gICAgfVxuXG4gICAgc2V0R2FpbihnYWluKSB7XG4gICAgICAgIGlmICh0aGlzLl9hdWRpb0dhaW4pXG4gICAgICAgICAgICB0aGlzLl9hdWRpb0dhaW4uZ2Fpbi52YWx1ZSA9IGdhaW47XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJzZXR0aW5nIGdhaW46IFwiICsgZ2Fpbik7XG4gICAgICAgIHRoaXMuX2NhY2hlZEdhaW5WYWx1ZSA9IGdhaW47XG4gICAgfVxuXG4gICAgc3RhcnQob25TdGFydGVkQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbVwiLCB0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSk7XG4gICAgICAgIHRoaXMuc3RhcnRNYW51YWxFbmNvZGluZyh0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSk7XG5cbiAgICAgICAgLy8gVE9ETzogbWlnaHQgYmUgYSBnb29kIHRpbWUgdG8gc3RhcnQgYSBzcGVjdHJhbCBhbmFseXplclxuXG4gICAgICAgIGlmIChvblN0YXJ0ZWRDYWxsYmFjaylcbiAgICAgICAgICAgIG9uU3RhcnRlZENhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgc3RvcChjYXB0dXJlQ29tcGxldGVDYWxsYmFjaykge1xuICAgICAgICB0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrID0gY2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2s7XG4gICAgICAgIHRoaXMuX2lzUmVjb3JkaW5nID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHRoaXMuX2F1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgLy8gc3RvcCB0aGUgbWFudWFsIGVuY29kZXJcbiAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLnBvc3RNZXNzYWdlKHthY3Rpb246IFwiZmluaXNoXCJ9KTtcbiAgICAgICAgICAgIHRoaXMuc2h1dGRvd25NYW51YWxFbmNvZGluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2F1ZGlvRW5jb2Rlcikge1xuICAgICAgICAgICAgLy8gc3RvcCB0aGUgYXV0b21hdGljIGVuY29kZXJcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2F1ZGlvRW5jb2Rlci5zdGF0ZSAhPT0gJ3JlY29yZGluZycpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJBdWRpb0NhcHR1cmU6OnN0b3AoKTsgX2F1ZGlvRW5jb2Rlci5zdGF0ZSAhPSAncmVjb3JkaW5nJ1wiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLnJlcXVlc3REYXRhKCk7XG4gICAgICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIuc3RvcCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVE9ETzogc3RvcCBhbnkgYWN0aXZlIHNwZWN0cmFsIGFuYWx5c2lzXG4gICAgfTtcbn1cblxuLypcbi8vIHVudXNlZCBhdCB0aGUgbW9tZW50XG5mdW5jdGlvbiBBbmFseXplcigpIHtcblxuICAgIHZhciBfYXVkaW9DYW52YXNBbmltYXRpb25JZCxcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXNcbiAgICAgICAgO1xuXG4gICAgdGhpcy5zdGFydEFuYWx5emVyVXBkYXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXBkYXRlQW5hbHl6ZXIoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zdG9wQW5hbHl6ZXJVcGRhdGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIV9hdWRpb0NhbnZhc0FuaW1hdGlvbklkKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShfYXVkaW9DYW52YXNBbmltYXRpb25JZCk7XG4gICAgICAgIF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkID0gbnVsbDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlQW5hbHl6ZXIoKSB7XG5cbiAgICAgICAgaWYgKCFfYXVkaW9TcGVjdHJ1bUNhbnZhcylcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRpbmctdmlzdWFsaXplclwiKS5nZXRDb250ZXh0KFwiMmRcIik7XG5cbiAgICAgICAgdmFyIGZyZXFEYXRhID0gbmV3IFVpbnQ4QXJyYXkoX2F1ZGlvQW5hbHl6ZXIuZnJlcXVlbmN5QmluQ291bnQpO1xuICAgICAgICBfYXVkaW9BbmFseXplci5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxRGF0YSk7XG5cbiAgICAgICAgdmFyIG51bUJhcnMgPSBfYXVkaW9BbmFseXplci5mcmVxdWVuY3lCaW5Db3VudDtcbiAgICAgICAgdmFyIGJhcldpZHRoID0gTWF0aC5mbG9vcihfY2FudmFzV2lkdGggLyBudW1CYXJzKSAtIF9mZnRCYXJTcGFjaW5nO1xuXG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNsZWFyUmVjdCgwLCAwLCBfY2FudmFzV2lkdGgsIF9jYW52YXNIZWlnaHQpO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSAnI2Y2ZDU2NSc7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmxpbmVDYXAgPSAncm91bmQnO1xuXG4gICAgICAgIHZhciB4LCB5LCB3LCBoO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBmcmVxRGF0YVtpXTtcbiAgICAgICAgICAgIHZhciBzY2FsZWRfdmFsdWUgPSAodmFsdWUgLyAyNTYpICogX2NhbnZhc0hlaWdodDtcblxuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBfZmZ0QmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIHNjYWxlZF92YWx1ZTtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBzY2FsZWRfdmFsdWU7XG5cbiAgICAgICAgICAgIHZhciBncmFkaWVudCA9IF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNyZWF0ZUxpbmVhckdyYWRpZW50KHgsIF9jYW52YXNIZWlnaHQsIHgsIHkpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDEuMCwgXCJyZ2JhKDAsMCwwLDEuMClcIik7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC4wLCBcInJnYmEoMCwwLDAsMS4wKVwiKTtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gZ3JhZGllbnQ7XG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcblxuICAgICAgICAgICAgaWYgKHNjYWxlZF92YWx1ZSA+IF9oaXRIZWlnaHRzW2ldKSB7XG4gICAgICAgICAgICAgICAgX2hpdFZlbG9jaXRpZXNbaV0gKz0gKHNjYWxlZF92YWx1ZSAtIF9oaXRIZWlnaHRzW2ldKSAqIDY7XG4gICAgICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSBzY2FsZWRfdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9oaXRWZWxvY2l0aWVzW2ldIC09IDQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldICs9IF9oaXRWZWxvY2l0aWVzW2ldICogMC4wMTY7XG5cbiAgICAgICAgICAgIGlmIChfaGl0SGVpZ2h0c1tpXSA8IDApXG4gICAgICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2UtYXRvcFwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5kcmF3SW1hZ2UoX2NhbnZhc0JnLCAwLCAwKTtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1vdmVyXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsMjU1LDI1NSwwLjcpXCI7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBfZmZ0QmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIE1hdGgucm91bmQoX2hpdEhlaWdodHNbaV0pIC0gMjtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBiYXJXaWR0aDtcblxuICAgICAgICAgICAgaWYgKF9oaXRIZWlnaHRzW2ldID09PSAwKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAvL19hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsIDI1NSwgMjU1LFwiKyBNYXRoLm1heCgwLCAxIC0gTWF0aC5hYnMoX2hpdFZlbG9jaXRpZXNbaV0vMTUwKSkgKyBcIilcIjtcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KHgsIHksIHcsIGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZUFuYWx5emVyKTtcbiAgICB9XG5cbiAgICB2YXIgX2NhbnZhc1dpZHRoLCBfY2FudmFzSGVpZ2h0O1xuICAgIHZhciBfZmZ0U2l6ZSA9IDI1NjtcbiAgICB2YXIgX2ZmdFNtb290aGluZyA9IDAuODtcbiAgICB2YXIgX2ZmdEJhclNwYWNpbmcgPSAxO1xuXG4gICAgdmFyIF9oaXRIZWlnaHRzID0gW107XG4gICAgdmFyIF9oaXRWZWxvY2l0aWVzID0gW107XG5cbiAgICB0aGlzLnRlc3RDYW52YXMgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdmFyIGNhbnZhc0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVjb3JkaW5nLXZpc3VhbGl6ZXJcIik7XG5cbiAgICAgICAgX2NhbnZhc1dpZHRoID0gY2FudmFzQ29udGFpbmVyLndpZHRoO1xuICAgICAgICBfY2FudmFzSGVpZ2h0ID0gY2FudmFzQ29udGFpbmVyLmhlaWdodDtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcyA9IGNhbnZhc0NvbnRhaW5lci5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCJyZ2JhKDAsMCwwLDApXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KDAsIDAsIF9jYW52YXNXaWR0aCwgX2NhbnZhc0hlaWdodCk7XG5cbiAgICAgICAgdmFyIG51bUJhcnMgPSBfZmZ0U2l6ZSAvIDI7XG4gICAgICAgIHZhciBiYXJTcGFjaW5nID0gX2ZmdEJhclNwYWNpbmc7XG4gICAgICAgIHZhciBiYXJXaWR0aCA9IE1hdGguZmxvb3IoX2NhbnZhc1dpZHRoIC8gbnVtQmFycykgLSBiYXJTcGFjaW5nO1xuXG4gICAgICAgIHZhciB4LCB5LCB3LCBoLCBpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldID0gX2NhbnZhc0hlaWdodCAtIDE7XG4gICAgICAgICAgICBfaGl0VmVsb2NpdGllc1tpXSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2NhbGVkX3ZhbHVlID0gTWF0aC5hYnMoTWF0aC5zaW4oTWF0aC5QSSAqIDYgKiAoaSAvIG51bUJhcnMpKSkgKiBfY2FudmFzSGVpZ2h0O1xuXG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIGJhclNwYWNpbmcpO1xuICAgICAgICAgICAgeSA9IF9jYW52YXNIZWlnaHQgLSBzY2FsZWRfdmFsdWU7XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gc2NhbGVkX3ZhbHVlO1xuXG4gICAgICAgICAgICB2YXIgZ3JhZGllbnQgPSBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5jcmVhdGVMaW5lYXJHcmFkaWVudCh4LCBfY2FudmFzSGVpZ2h0LCB4LCB5KTtcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgxLjAsIFwicmdiYSgwLDAsMCwwLjApXCIpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAuMCwgXCJyZ2JhKDAsMCwwLDEuMClcIik7XG5cbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1hdG9wXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmRyYXdJbWFnZShfY2FudmFzQmcsIDAsIDApO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCIjZmZmZmZmXCI7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBiYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gX2hpdEhlaWdodHNbaV07XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gMjtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIF9zY29wZSA9IHRoaXM7XG5cbiAgICB2YXIgX2NhbnZhc0JnID0gbmV3IEltYWdlKCk7XG4gICAgX2NhbnZhc0JnLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX3Njb3BlLnRlc3RDYW52YXMoKTtcbiAgICB9O1xuICAgIC8vX2NhbnZhc0JnLnNyYyA9IFwiL2ltZy9iZzVzLmpwZ1wiO1xuICAgIF9jYW52YXNCZy5zcmMgPSBcIi9pbWcvYmc2LXdpZGUuanBnXCI7XG59XG4qL1xuXG5leHBvcnQgeyBBdWRpb0NhcHR1cmUgfVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcblxuY2xhc3MgQ3JlYXRlUmVjb3JkaW5nTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBudW1fcmVjb3JkaW5nczogMCxcbiAgICAgICAgICAgIHJlY29yZGluZ190aW1lOiAwXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgICAgIHN1cGVyKG9wdHMpO1xuICAgICAgICAvL1xuICAgICAgICAvL3RoaXMuZGVmYXVsdHMgPSB7XG4gICAgICAgIC8vICAgIG51bV9yZWNvcmRpbmdzOiAwLFxuICAgICAgICAvLyAgICByZWNvcmRpbmdfdGltZTogMFxuICAgICAgICAvL31cblxuICAgICAgICB0aGlzLnVybFJvb3QgPSBcIi9hcGkvY3JlYXRlX3JlY29yZGluZ1wiO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgQ3JlYXRlUmVjb3JkaW5nTW9kZWwgfVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuXG5jbGFzcyBDdXJyZW50VXNlck1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdXNlcm5hbWU6IFwiXCIsXG4gICAgICAgICAgICBwcm9maWxlSW1hZ2U6IFwiXCIsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IFwiXCIsXG4gICAgICAgICAgICBpZDogXCJcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnVybCA9IFwiL2FwaS9jdXJyZW50X3VzZXJcIjtcbiAgICB9XG59XG5cbmV4cG9ydCB7IEN1cnJlbnRVc2VyTW9kZWwgfVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcblxuLyoqXG4gKiBSZWNvcmRpbmdcbiAqIGdldDogcmVjb3JkaW5nIG1ldGFkYXRhICsgY2FsbGluZyB1c2VyJ3MgbGlzdGVuaW5nIHN0YXR1c1xuICogcG9zdDogY3JlYXRlIG5ldyByZWNvcmRpbmdcbiAqIHB1dDogdXBkYXRlIHJlY29yZGluZyBtZXRhZGF0YVxuICovXG5jbGFzcyBRdWlwTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpZDogMCwgLy8gZ3VpZFxuICAgICAgICAgICAgcHJvZ3Jlc3M6IDAsIC8vIFswLTEwMF0gcGVyY2VudGFnZVxuICAgICAgICAgICAgcG9zaXRpb246IDAsIC8vIHNlY29uZHNcbiAgICAgICAgICAgIGR1cmF0aW9uOiAwLCAvLyBzZWNvbmRzXG4gICAgICAgICAgICBpc1B1YmxpYzogZmFsc2VcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICAgICAgc3VwZXIob3B0cyk7XG5cbiAgICAgICAgdGhpcy51cmxSb290ID0gXCIvYXBpL3F1aXBzXCI7XG5cbiAgICAgICAgLy8gc2F2ZSBsaXN0ZW5pbmcgcHJvZ3Jlc3MgYXQgbW9zdCBldmVyeSAzIHNlY29uZHNcbiAgICAgICAgdGhpcy50aHJvdHRsZWRTYXZlID0gXy50aHJvdHRsZSh0aGlzLnNhdmUsIDMwMDApO1xuICAgIH1cbn1cblxuY2xhc3MgTXlRdWlwQ29sbGVjdGlvbiBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb24ge1xuICAgIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICAgICAgc3VwZXIob3B0cyk7XG4gICAgICAgIHRoaXMubW9kZWwgPSBRdWlwTW9kZWw7XG4gICAgICAgIHRoaXMudXJsID0gXCIvYXBpL3F1aXBzXCI7XG4gICAgfVxufVxuXG5leHBvcnQgeyBRdWlwTW9kZWwsIE15UXVpcENvbGxlY3Rpb24gfVxuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcImNvbXBpbGVyXCI6WzcsXCI+PSA0LjAuMFwiXSxcIm1haW5cIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcImNoYW5nZWxvZ1xcXCI+XFxuICAgIDxoMj5DaGFuZ2Vsb2c8L2gyPlxcblxcbiAgICA8aDM+MjAxNi0wMS0wMTwvaDM+XFxuICAgIDxwPlxcbiAgICAgICAgUmVmYWN0b3JlZCBQeXRob24gYW5kIEJhY2tib25lIGNvZGViYXNlIHRvIGJlIHNpbXBsZXIsIG9yZ2FuaXplZCBieS1mZWF0dXJlLCBtb3JlIE1WQ2lzaC5cXG4gICAgICAgIFNob3VsZCBtYWtlIGl0IGVhc2llciBhbmQgbW9yZSBwbGVhc2FudCB0byBhZGQgbmV3IGZlYXR1cmVzLlxcbiAgICAgICAgVG9vayBhYm91dCBhIG1vbnRoIHRvIHBheSBkb3duIGEgbG90IG9mIGV4aXN0aW5nIGRlYnQgYW5kIGJyZWF0aGUgc29tZSBuZXcgZXhjaXRlbWVudCBpbnRvIHRoZSBjb2RlYmFzZS5cXG4gICAgPC9wPlxcbiAgICA8cD5PaCwgYW5kIHN0YXJ0ZWQgd29ya2luZyBvbiBTdHJlYW1zL0dyb3VwcyBzdXBwb3J0ISA6KTwvcD5cXG5cXG4gICAgPGgzPjIwMTUtMTItMDU8L2gzPlxcblxcbiAgICA8cD5EYXJrLXRoZW1lIHdpdGggdW5zcGxhc2guY29tIGJnIC0gYmVjYXVzZSBJIG9mdGVuIHdvcmsgb24gdGhpcyBsYXRlIGF0IG5pZ2h0LjwvcD5cXG5cXG4gICAgPHA+TW9yZSBtb2JpbGUgZnJpZW5kbHkgZGVzaWduLjwvcD5cXG5cXG4gICAgPHA+XFxuICAgICAgICBTdG9wcGVkIHRyeWluZyB0byBnZXQgYXVkaW8tcmVjb3JkaW5nIHRvIHdvcmsgd2VsbCBvbiBBbmRyb2lkIDQueCBhZnRlciBidXJuZWluZyBtYW55IHdlZWtlbmRzIGFuZCBuaWdodHMuXFxuICAgICAgICBUaGUgYXVkaW8gZ2xpdGNoZXMgZXZlbiB3aGVuIHJlY29yZGluZyBwdXJlIFBDTSwgYSBwcm9ibGVtIGF0IHRoZSBXZWIgQXVkaW8gbGV2ZWwsIG5vdGhpbmcgSSBjYW4gZG8gYWJvdXQgaXQuXFxuICAgIDwvcD5cXG5cXG4gICAgPHA+XFxuICAgICAgICBGb3VuZCBhIGZ1biB3b3JrYXJvdW5kIG1vYmlsZSBjaHJvbWUncyBpbmFiaWxpdHkgdG8gcGxheSBXZWIgQXVkaW8gcmVjb3JkZWQgd2F2ZSBmaWxlczpcXG4gICAgICAgIHJ1biB0aGUgZ2VuZXJhdGVkIGJsb2JzIHRocm91Z2ggYW4gYWpheCByZXF1ZXN0LCBtYWtpbmcgdGhlIGJsb2IgZGlzay1iYWNrZWQgbG9jYWxseSwgbm93IHRoZSBsb2NhbCBibG9iXFxuICAgICAgICBjYW4gYmUgcGFzc2VkIGludG8gYW4gJmx0O2F1ZGlvJmd0OyBwbGF5ZXIuXFxuICAgIDwvcD5cXG5cXG4gICAgPHA+Rm9jdXNpbmcgb24gbWFraW5nIHRoZSBtb2JpbGUgbGlzdGVuaW5nIGV4cGVyaWVuY2UgZ3JlYXQuPC9wPlxcblxcbiAgICA8aDM+MjAxNS0xMC0wNDwvaDM+XFxuXFxuICAgIDxwPlNsaWdodCBmYWNlbGlmdCwgdXNpbmcgYSBuZXcgZmxhdCBzdHlsZS4gQWRkZWQgYSBmZXcgYW5pbWF0aW9ucyBhbmQgdGhpcyBwdWJsaWMgY2hhbmdlbG9nISA6KTwvcD5cXG5cXG4gICAgPGgzPjIwMTUtMDktMjY8L2gzPlxcblxcbiAgICA8cD5EZXNpZ25lZCBhIGxvZ28gYW5kIGNyZWF0ZWQgYSBwcmV0dHkgbGFuZGluZy1wYWdlIHdpdGggdHdpdHRlci1sb2dpbi48L3A+XFxuXFxuICAgIDxwPkFkZGVkIFNlbnRyeSBmb3IgSmF2YXNjcmlwdCBlcnJvciBjb2xsZWN0aW9uIGFuZCBIZWFwIEFuYWx5dGljcyBmb3IgY3JlYXRpbmcgYWQtaG9jIGFuYWx5dGljcy48L3A+XFxuXFxuICAgIDxoMz4yMDE1LTA5LTIwPC9oMz5cXG5cXG4gICAgPHA+U2V0dXAgdHdvIG5ldyBzZXJ2ZXJzIG9uIERpZ2l0YWwgT2NlYW5zIHdpdGggUm91dGUgNTMgcm91dGluZyBhbmQgYW4gU1NMIGNlcnRpZmljYXRlIGZvciBwcm9kdWN0aW9uLlxcbiAgICAgICAgSGF2aW5nIGFuIFNTTCBjZXJ0aWZpY2F0ZSBtZWFucyB0aGUgc2l0ZSBjYW4gYmUgYWNjZXNzZWQgdmlhIEhUVFBTIHdoaWNoIGFsbG93cyBicm93c2Vyc1xcbiAgICAgICAgdG8gY2FjaGUgdGhlIE1pY3JvcGhvbmUgQWNjZXNzIHBlcm1pc3Npb25zLCB3aGljaCBtZWFucyB5b3UgZG9uJ3QgaGF2ZSB0byBjbGljayBcXFwiYWxsb3dcXFwiIGV2ZXJ5IHRpbWVcXG4gICAgICAgIHlvdSB3YW50IHRvIG1ha2UgYSByZWNvcmRpbmchPC9wPlxcblxcbiAgICA8cD5GaXhlZCB1cCBQeXRob24gRmFicmljIGRlcGxveW1lbnQgc2NyaXB0IHRvIHdvcmsgaW4gbmV3IHN0YWdpbmcgKyBwcm9kdWN0aW9uIGVudmlyb25tZW50cy5cXG4gICAgICAgIEFuZCBhZGRlZCBNb25nb0RCIGJhY2t1cC9yZXN0b3JlIHN1cHBvcnQuPC9wPlxcblxcbiAgICA8cD5VcGRhdGVkIFB5dGhvbiBkZXBlbmRlbmNpZXMsIHRoZXkgd2VyZSBvdmVyIGEgeWVhciBvbGQsIGFuZCBmaXhlZCBjb2RlIHRoYXQgYnJva2UgYXMgYSByZXN1bHQuXFxuICAgICAgICBNb3N0bHkgYXJvdW5kIGNoYW5nZXMgdG8gTW9uZ29FbmdpbmUgUHl0aG9uIGxpYi48L3A+XFxuXFxuICAgIDxoMz4yMDE1LTA5LTA1PC9oMz5cXG5cXG4gICAgPHA+Rml4ZWQgcHJvamVjdCB0byB3b3JrIG9uIE9TWCBhbmQgd2l0aG91dCB0aGUgTkdJTlggZGVwZW5kZW5jeS4gSSBjYW4gbm93IHJ1biBpdCBhbGwgaW4gcHl0aG9uLFxcbiAgICAgICAgaW5jbHVkaW5nIHRoZSBzdGF0aWMgZmlsZSBob3N0aW5nLiBUaGUgcHJvZHVjdGlvbiBzZXJ2ZXJzIHVzZSBOR0lOWCBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlLjwvcD5cXG5cXG4gICAgPGgzPjIwMTQtMDMtMjk8L2gzPlxcblxcbiAgICA8cD5SZXF1ZXN0IE1lZGlhIFN0cmVhbWluZyBwZXJtaXNzaW9uIGZyb20gYnJvd3NlciBvbiByZWNvcmRpbmctcGFnZSBsb2FkLiBUaGlzIG1ha2VzIHRoZSBtaWNyb3Bob25lXFxuICAgICAgICBhdmFpbGFibGUgdGhlIGluc3RhbnQgeW91IGhpdCB0aGUgcmVjb3JkIGJ1dHRvbi4gTm8gbmVlZCB0byBoaXQgcmVjb3JkIGJ1dHRvbiBhbmQgdGhlbiBkZWFsIHdpdGggYnJvd3NlcidzXFxuICAgICAgICBzZWN1cml0eSBwb3B1cHMgYXNraW5nIGZvciBwZXJtaXNzaW9uIHRvIGFjY2VzcyBtaWNyb3Bob25lLjwvcD5cXG5cXG4gICAgPHA+UmVtb3ZlZCBjb3VudGRvd24gY2xvY2sgdW50aWxsIHJlY29yZGluZyBiZWdpbnMsIHRoZSBcXFwiMy0yLTEgZ29cXFwiIHdhc24ndCB0aGF0IGhlbHBmdWwuPC9wPlxcblxcbiAgICA8aDM+MjAxNC0wMy0yNzwvaDM+XFxuXFxuICAgIDxwPkZpeGVkIGJ1ZyBpbiB0cmFja2luZyB3aGVyZSB5b3UgcGF1c2VkIGluIHRoZSBwbGF5YmFjayBvZiBhIHJlY29yZGluZy4gTm93IHlvdSBzaG91bGQgYmUgYWJsZSB0b1xcbiAgICAgICAgcmVzdW1lIHBsYXliYWNrIGV4YWN0bHkgd2hlcmUgeW91IGxlZnQgb2ZmLiA6KTwvcD5cXG5cXG48L2Rpdj5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL0NoYW5nZWxvZ1ZpZXcuaGJzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDaGFuZ2Vsb2dWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJJbml0aWFsaXppbmcgY2hhbmdlbG9nIHZpZXdcIik7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlbmRlcmluZyBjaGFuZ2Vsb2cgdmlld1wiKTtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0ZW1wbGF0ZSgpKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgKiBhcyBWaWV3cyBmcm9tICcuL1ZpZXdzJ1xuXG5pbXBvcnQgU3RyZWFtQ29udHJvbGxlciBmcm9tICcuL1N0cmVhbXMvU3RyZWFtQ29udHJvbGxlci5qcydcbmltcG9ydCBSZWNvcmRlckNvbnRyb2xsZXIgZnJvbSAnLi9SZWNvcmRlci9SZWNvcmRlckNvbnRyb2xsZXInXG5cbmV4cG9ydCBjbGFzcyBIb21lQ29udHJvbGxlciB7XG4gICAgY29uc3RydWN0b3IocHJlc2VudGVyKSB7XG4gICAgICAgIHByZXNlbnRlci5zd2l0Y2hWaWV3KG5ldyBWaWV3cy5Ib21lcGFnZVZpZXcoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVXNlckNvbnRyb2xsZXIge1xuICAgIGNvbnN0cnVjdG9yKHByZXNlbnRlciwgdXNlcm5hbWUpIHtcbiAgICAgICAgcHJlc2VudGVyLnN3aXRjaFZpZXcobmV3IFZpZXdzLlVzZXJQb2RDb2xsZWN0aW9uVmlldyh1c2VybmFtZSkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIENoYW5nZWxvZ0NvbnRyb2xsZXIge1xuICAgIGNvbnN0cnVjdG9yKHByZXNlbnRlcikge1xuICAgICAgICBwcmVzZW50ZXIuc3dpdGNoVmlldyhuZXcgVmlld3MuQ2hhbmdlbG9nVmlldygpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTaW5nbGVQb2RDb250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihwcmVzZW50ZXIsIGlkKSB7XG4gICAgICAgIHByZXNlbnRlci5zd2l0Y2hWaWV3KG5ldyBWaWV3cy5Vc2VyUG9kVmlldyhpZCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgU3RyZWFtQ29udHJvbGxlciwgUmVjb3JkZXJDb250cm9sbGVyIH1cbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls3LFwiPj0gNC4wLjBcIl0sXCJtYWluXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJtLW1pY3JvcGhvbmUtcmVxdWlyZWRcXFwiPlxcbiAgICA8aDI+TWljcm9waG9uZSByZXF1aXJlZC48L2gyPlxcbjwvZGl2PlxcblwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJ1xuaW1wb3J0IHsgQXVkaW9DYXB0dXJlIH0gZnJvbSAnLi4vLi4vYXVkaW8tY2FwdHVyZSdcbmltcG9ydCB7IENyZWF0ZVJlY29yZGluZ01vZGVsIH0gZnJvbSAnLi4vLi4vbW9kZWxzL0NyZWF0ZVJlY29yZGluZ01vZGVsJ1xuXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9HZXRNaWNyb3Bob25lLmhicydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2V0TWljcm9waG9uZVZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHt9XG4gICAgfVxuXG4gICAgZXZlbnRzKCkge1xuICAgICAgICByZXR1cm4ge31cbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVuZGVyaW5nIHJlY29yZGVyIGNvbnRyb2xcIik7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGVtcGxhdGUodGhpcy5tb2RlbC50b0pTT04oKSkpO1xuICAgIH1cblxuICAgIGJ1aWxkKG1vZGVsKSB7XG4gICAgICAgIHRoaXMubW9kZWwgPSBtb2RlbDtcblxuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZSA9IG5ldyBBdWRpb0NhcHR1cmUoKTtcblxuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlY29yZGVkLXByZXZpZXdcIik7XG4gICAgICAgIGlmICh0aGlzLmF1ZGlvUGxheWVyID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiY2FuIHBsYXkgdm9yYmlzOiBcIiwgISF0aGlzLmF1ZGlvUGxheWVyLmNhblBsYXlUeXBlICYmIFwiXCIgIT0gdGhpcy5hdWRpb1BsYXllci5jYW5QbGF5VHlwZSgnYXVkaW8vb2dnOyBjb2RlY3M9XCJ2b3JiaXNcIicpKTtcblxuICAgICAgICAvL3RoaXMuYXVkaW9QbGF5ZXIubG9vcCA9IFwibG9vcFwiO1xuICAgICAgICAvL3RoaXMuYXVkaW9QbGF5ZXIuYXV0b3BsYXkgPSBcImF1dG9wbGF5XCI7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCIvYXNzZXRzL3NvdW5kcy9iZWVwX3Nob3J0X29uLm9nZ1wiO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcblxuICAgICAgICB0aGlzLm1vZGVsLm9uKCdjaGFuZ2U6cmVjb3JkaW5nVGltZScsIGZ1bmN0aW9uIChtb2RlbCwgdGltZSkge1xuICAgICAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS50ZXh0KHRpbWUpO1xuICAgICAgICB9KVxuXG4gICAgICAgIC8vIGF0dGVtcHQgdG8gZmV0Y2ggbWVkaWEtc3RyZWFtIG9uIHBhZ2UtbG9hZFxuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZS5ncmFiTWljcm9waG9uZShvbk1pY3JvcGhvbmVHcmFudGVkLCBvbk1pY3JvcGhvbmVEZW5pZWQpO1xuICAgIH1cblxuICAgIG9uTWljcm9waG9uZURlbmllZCgpIHtcbiAgICAgICAgLy8gc2hvdyBzY3JlZW4gYXNraW5nIHVzZXIgZm9yIHBlcm1pc3Npb25cbiAgICB9XG5cbiAgICBvbk1pY3JvcGhvbmVHcmFudGVkKCkge1xuICAgICAgICAvLyBzaG93IHJlY29yZGVyXG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZShvcHRpb25zKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXJWaWV3IGluaXRcIik7XG4gICAgICAgIG5ldyBDcmVhdGVSZWNvcmRpbmdNb2RlbCgpLmZldGNoKClcbiAgICAgICAgICAgIC50aGVuKG1vZGVsID0+IHRoaXMuYnVpbGQobmV3IENyZWF0ZVJlY29yZGluZ01vZGVsKG1vZGVsKSkpO1xuXG5cbiAgICAgICAgLy8gVE9ETzogYSBwcmV0dHkgYWR2YW5jZWQgYnV0IG5lYXQgZmVhdHVyZSBtYXkgYmUgdG8gc3RvcmUgYSBiYWNrdXAgY29weSBvZiBhIHJlY29yZGluZyBsb2NhbGx5IGluIGNhc2Ugb2YgYSBjcmFzaCBvciB1c2VyLWVycm9yXG4gICAgICAgIC8qXG4gICAgICAgICAvLyBjaGVjayBob3cgbXVjaCB0ZW1wb3Jhcnkgc3RvcmFnZSBzcGFjZSB3ZSBoYXZlLiBpdCdzIGEgZ29vZCB3YXkgdG8gc2F2ZSByZWNvcmRpbmcgd2l0aG91dCBsb3NpbmcgaXRcbiAgICAgICAgIHdpbmRvdy53ZWJraXRTdG9yYWdlSW5mby5xdWVyeVVzYWdlQW5kUXVvdGEoXG4gICAgICAgICB3ZWJraXRTdG9yYWdlSW5mby5URU1QT1JBUlksXG4gICAgICAgICBmdW5jdGlvbih1c2VkLCByZW1haW5pbmcpIHtcbiAgICAgICAgIHZhciBybWIgPSAocmVtYWluaW5nIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoNCk7XG4gICAgICAgICB2YXIgdW1iID0gKHVzZWQgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCg0KTtcbiAgICAgICAgIGNvbnNvbGUubG9nKFwiVXNlZCBxdW90YTogXCIgKyB1bWIgKyBcIm1iLCByZW1haW5pbmcgcXVvdGE6IFwiICsgcm1iICsgXCJtYlwiKTtcbiAgICAgICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcicsIGUpO1xuICAgICAgICAgfVxuICAgICAgICAgKTtcblxuICAgICAgICAgZnVuY3Rpb24gb25FcnJvckluRlMoKSB7XG4gICAgICAgICB2YXIgbXNnID0gJyc7XG5cbiAgICAgICAgIHN3aXRjaCAoZS5jb2RlKSB7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5RVU9UQV9FWENFRURFRF9FUlI6XG4gICAgICAgICBtc2cgPSAnUVVPVEFfRVhDRUVERURfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuTk9UX0ZPVU5EX0VSUjpcbiAgICAgICAgIG1zZyA9ICdOT1RfRk9VTkRfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuU0VDVVJJVFlfRVJSOlxuICAgICAgICAgbXNnID0gJ1NFQ1VSSVRZX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLklOVkFMSURfTU9ESUZJQ0FUSU9OX0VSUjpcbiAgICAgICAgIG1zZyA9ICdJTlZBTElEX01PRElGSUNBVElPTl9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5JTlZBTElEX1NUQVRFX0VSUjpcbiAgICAgICAgIG1zZyA9ICdJTlZBTElEX1NUQVRFX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICBtc2cgPSAnVW5rbm93biBFcnJvcic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIH1cblxuICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgbXNnKTtcbiAgICAgICAgIH1cblxuICAgICAgICAgd2luZG93LnJlcXVlc3RGaWxlU3lzdGVtICA9IHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEZpbGVTeXN0ZW07XG5cbiAgICAgICAgIHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbSh3aW5kb3cuVEVNUE9SQVJZLCA1ICogMTAyNCAqIDEwMjQsIGZ1bmN0aW9uIG9uU3VjY2Vzcyhmcykge1xuXG4gICAgICAgICBjb25zb2xlLmxvZygnb3BlbmluZyBmaWxlJyk7XG5cbiAgICAgICAgIGZzLnJvb3QuZ2V0RmlsZShcInRlc3RcIiwge2NyZWF0ZTp0cnVlfSwgZnVuY3Rpb24oZmUpIHtcblxuICAgICAgICAgY29uc29sZS5sb2coJ3NwYXduZWQgd3JpdGVyJyk7XG5cbiAgICAgICAgIGZlLmNyZWF0ZVdyaXRlcihmdW5jdGlvbihmdykge1xuXG4gICAgICAgICBmdy5vbndyaXRlZW5kID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlIGNvbXBsZXRlZCcpO1xuICAgICAgICAgfTtcblxuICAgICAgICAgZncub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZSBmYWlsZWQ6ICcgKyBlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgfTtcblxuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRpbmcgYmxvYiB0byBmaWxlLi4nKTtcblxuICAgICAgICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbJ3llaCB0aGlzIGlzIGEgdGVzdCEnXSwge3R5cGU6ICd0ZXh0L3BsYWluJ30pO1xuICAgICAgICAgZncud3JpdGUoYmxvYik7XG5cbiAgICAgICAgIH0sIG9uRXJyb3JJbkZTKTtcblxuICAgICAgICAgfSwgb25FcnJvckluRlMpO1xuXG4gICAgICAgICB9LCBvbkVycm9ySW5GUyk7XG4gICAgICAgICAqL1xuICAgIH1cblxuICAgIHRvZ2dsZShldmVudCkge1xuICAgICAgICBpZiAodGhpcy5pc1JlY29yZGluZykge1xuICAgICAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5zdG9wUmVjb3JkaW5nKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRSZWNvcmRpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNhbmNlbFJlY29yZGluZyhldmVudCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBjYW5jZWxpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLWZ1bGxcIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLWNvbnRhaW5lclwiKS5yZW1vdmVDbGFzcyhcImZsaXBwZWRcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCJcIjtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCAzKTtcbiAgICB9XG5cbiAgICB1cGxvYWRSZWNvcmRpbmcoZXZlbnQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgdXBsb2FkaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuXG4gICAgICAgICQoXCIjcmVjb3JkZXItZnVsbFwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLnJlbW92ZUNsYXNzKFwiZmxpcHBlZFwiKTtcblxuICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSAkKCd0ZXh0YXJlYVtuYW1lPWRlc2NyaXB0aW9uXScpWzBdLnZhbHVlO1xuXG4gICAgICAgIHZhciBkYXRhID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdkZXNjcmlwdGlvbicsIGRlc2NyaXB0aW9uKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2lzUHVibGljJywgMSk7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdhdWRpby1ibG9iJywgdGhpcy5hdWRpb0Jsb2IpO1xuXG4gICAgICAgIC8vIHNlbmQgcmF3IGJsb2IgYW5kIG1ldGFkYXRhXG5cbiAgICAgICAgLy8gVE9ETzogZ2V0IGEgcmVwbGFjZW1lbnQgYWpheCBsaWJyYXJ5IChtYXliZSBwYXRjaCByZXF3ZXN0IHRvIHN1cHBvcnQgYmluYXJ5PylcbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbigncG9zdCcsICcvcmVjb3JkaW5nL2NyZWF0ZScsIHRydWUpO1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgeGhyLnVwbG9hZC5vbnByb2dyZXNzID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHZhciBwZXJjZW50ID0gKChlLmxvYWRlZCAvIGUudG90YWwpICogMTAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwZXJjZW50YWdlOiBcIiArIHBlcmNlbnQpO1xuICAgICAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5maW5kKFwiLmJhclwiKS5jc3MoJ3dpZHRoJywgcGVyY2VudCk7XG4gICAgICAgIH07XG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5maW5kKFwiLmJhclwiKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IG1hbnVhbCB4aHIgc3VjY2Vzc2Z1bFwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgbWFudWFsIHhociBlcnJvclwiLCB4aHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwieGhyLnJlc3BvbnNlXCIsIHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlc3VsdFwiLCByZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzdWx0LnVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgeGhyLnNlbmQoZGF0YSk7XG4gICAgfVxuXG4gICAgb25SZWNvcmRpbmdUaWNrKCkge1xuICAgICAgICB2YXIgdGltZVNwYW4gPSBwYXJzZUludCgoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gdGhpcy50aW1lclN0YXJ0KSAvIDEwMDApLnRvRml4ZWQoKSk7XG4gICAgICAgIHZhciB0aW1lU3RyID0gdGhpcy5JbnRUb1RpbWUodGltZVNwYW4pO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRpbWVTdHIpO1xuICAgIH1cblxuICAgIG9uQ291bnRkb3duVGljaygpIHtcbiAgICAgICAgaWYgKC0tdGhpcy50aW1lclN0YXJ0ID4gMCkge1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLnRpbWVyU3RhcnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjb3VudGRvd24gaGl0IHplcm8uIGJlZ2luIHJlY29yZGluZy5cIik7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXJJZCk7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRoaXMuSW50VG9UaW1lKDApKTtcbiAgICAgICAgICAgIHRoaXMub25NaWNSZWNvcmRpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN0YXJ0UmVjb3JkaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInN0YXJ0aW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUuc3RhcnQoKCkgPT4gdGhpcy5vbk1pY1JlYWR5KCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1pY3JvcGhvbmUgaXMgcmVhZHkgdG8gcmVjb3JkLiBEbyBhIGNvdW50LWRvd24sIHRoZW4gc2lnbmFsIGZvciBpbnB1dC1zaWduYWwgdG8gYmVnaW4gcmVjb3JkaW5nXG4gICAgICovXG4gICAgb25NaWNSZWFkeSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJtaWMgcmVhZHkgdG8gcmVjb3JkLiBkbyBjb3VudGRvd24uXCIpO1xuICAgICAgICB0aGlzLnRpbWVyU3RhcnQgPSAzO1xuICAgICAgICAvLyBydW4gY291bnRkb3duXG4gICAgICAgIC8vdGhpcy50aW1lcklkID0gc2V0SW50ZXJ2YWwodGhpcy5vbkNvdW50ZG93blRpY2suYmluZCh0aGlzKSwgMTAwMCk7XG5cbiAgICAgICAgLy8gb3IgbGF1bmNoIGNhcHR1cmUgaW1tZWRpYXRlbHlcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLkludFRvVGltZSgwKSk7XG4gICAgICAgIHRoaXMub25NaWNSZWNvcmRpbmcoKTtcblxuICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLmFkZENsYXNzKFwiaXMtdmlzaWJsZVwiKTtcbiAgICB9XG5cbiAgICBvbk1pY1JlY29yZGluZygpIHtcbiAgICAgICAgdGhpcy50aW1lclN0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIHRoaXMudGltZXJJZCA9IHNldEludGVydmFsKHRoaXMub25SZWNvcmRpbmdUaWNrLmJpbmQodGhpcyksIDEwMDApO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLXNjcmVlblwiKS5hZGRDbGFzcyhcImlzLXJlY29yZGluZ1wiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIk1pYyByZWNvcmRpbmcgc3RhcnRlZFwiKTtcblxuICAgICAgICAvLyBUT0RPOiB0aGUgbWljIGNhcHR1cmUgaXMgYWxyZWFkeSBhY3RpdmUsIHNvIGF1ZGlvIGJ1ZmZlcnMgYXJlIGdldHRpbmcgYnVpbHQgdXBcbiAgICAgICAgLy8gd2hlbiB0b2dnbGluZyB0aGlzIG9uLCB3ZSBtYXkgYWxyZWFkeSBiZSBjYXB0dXJpbmcgYSBidWZmZXIgdGhhdCBoYXMgYXVkaW8gcHJpb3IgdG8gdGhlIGNvdW50ZG93blxuICAgICAgICAvLyBoaXR0aW5nIHplcm8uIHdlIGNhbiBkbyBhIGZldyB0aGluZ3MgaGVyZTpcbiAgICAgICAgLy8gMSkgZmlndXJlIG91dCBob3cgbXVjaCBhdWRpbyB3YXMgYWxyZWFkeSBjYXB0dXJlZCwgYW5kIGN1dCBpdCBvdXRcbiAgICAgICAgLy8gMikgdXNlIGEgZmFkZS1pbiB0byBjb3ZlciB1cCB0aGF0IHNwbGl0LXNlY29uZCBvZiBhdWRpb1xuICAgICAgICAvLyAzKSBhbGxvdyB0aGUgdXNlciB0byBlZGl0IHBvc3QtcmVjb3JkIGFuZCBjbGlwIGFzIHRoZXkgd2lzaCAoYmV0dGVyIGJ1dCBtb3JlIGNvbXBsZXggb3B0aW9uISlcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmF1ZGlvQ2FwdHVyZS50b2dnbGVNaWNyb3Bob25lUmVjb3JkaW5nKHRydWUpLCA1MDApO1xuICAgIH1cblxuICAgIHN0b3BSZWNvcmRpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3RvcHBpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXJJZCk7XG5cbiAgICAgICAgLy8gcGxheSBzb3VuZCBpbW1lZGlhdGVseSB0byBieXBhc3MgbW9iaWxlIGNocm9tZSdzIFwidXNlciBpbml0aWF0ZWQgbWVkaWFcIiByZXF1aXJlbWVudFxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiL2Fzc2V0cy9zb3VuZHMvYmVlcF9zaG9ydF9vbi5vZ2dcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG5cbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUuc3RvcCgoYmxvYikgPT4gdGhpcy5vblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSk7XG5cbiAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS5yZW1vdmVDbGFzcyhcImlzLXZpc2libGVcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctc2NyZWVuXCIpLnJlbW92ZUNsYXNzKFwiaXMtcmVjb3JkaW5nXCIpO1xuXG4gICAgICAgIC8vIFRPRE86IGFuaW1hdGUgcmVjb3JkZXIgb3V0XG4gICAgICAgIC8vIFRPRE86IGFuaW1hdGUgdXBsb2FkZXIgaW5cbiAgICB9XG5cbiAgICBvblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IHByZXZpZXdpbmcgcmVjb3JkZWQgYXVkaW9cIik7XG4gICAgICAgIHRoaXMuYXVkaW9CbG9iID0gYmxvYjtcbiAgICAgICAgdGhpcy5zaG93Q29tcGxldGlvblNjcmVlbigpO1xuICAgIH1cblxuICAgIHBsYXlQcmV2aWV3KCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInBsYXlpbmcgcHJldmlldy4uXCIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImF1ZGlvIGJsb2JcIiwgdGhpcy5hdWRpb0Jsb2IpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImF1ZGlvIGJsb2IgdXJsXCIsIHRoaXMuYXVkaW9CbG9iVXJsKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSB0aGlzLmF1ZGlvQmxvYlVybDtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgfVxuXG4gICAgc2hvd0NvbXBsZXRpb25TY3JlZW4oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IGZsaXBwaW5nIHRvIGF1ZGlvIHBsYXliYWNrXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQmxvYlVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHRoaXMuYXVkaW9CbG9iKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikuYWRkQ2xhc3MoXCJmbGlwcGVkXCIpO1xuXG4gICAgICAgIC8vIEhBQ0s6IHJvdXRlIGJsb2IgdGhyb3VnaCB4aHIgdG8gbGV0IEFuZHJvaWQgQ2hyb21lIHBsYXkgYmxvYnMgdmlhIDxhdWRpbz5cbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbignR0VUJywgdGhpcy5hdWRpb0Jsb2JVcmwsIHRydWUpO1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InO1xuICAgICAgICB4aHIub3ZlcnJpZGVNaW1lVHlwZSgnYXVkaW8vb2dnJyk7XG5cbiAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCAmJiB4aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgIHZhciB4aHJCbG9iVXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoeGhyLnJlc3BvbnNlKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGVkIGJsb2IgZnJvbSBjYWNoZSB1cmw6IFwiICsgdGhpcy5hdWRpb0Jsb2JVcmwpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUm91dGVkIGludG8gYmxvYiB1cmw6IFwiICsgeGhyQmxvYlVybCk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHhockJsb2JVcmw7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhoci5zZW5kKCk7XG4gICAgfVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWljcm9waG9uZVBlcm1pc3Npb25zIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5taWNyb3Bob25lTWVkaWFTdHJlYW0gPSBudWxsO1xuICAgIH1cblxuICAgIGhhdmVNaWNyb3Bob25lKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5taWNyb3Bob25lTWVkaWFTdHJlYW0gIT0gbnVsbCA/IHRydWUgOiBmYWxzZTtcbiAgICB9XG5cbiAgICBzZXRNaWNyb3Bob25lKG1zKSB7XG4gICAgICAgIHRoaXMubWljcm9waG9uZU1lZGlhU3RyZWFtID0gbXM7XG4gICAgfVxuXG4gICAgZ3JhYk1pY3JvcGhvbmUob25NaWNyb3Bob25lR3JhbnRlZCwgb25NaWNyb3Bob25lRGVuaWVkKSB7XG4gICAgICAgIGlmICh0aGlzLmhhdmVNaWNyb3Bob25lKCkpIHtcbiAgICAgICAgICAgIG9uTWljcm9waG9uZUdyYW50ZWQoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZVxuICAgICAgICAgICAgLmdldFVzZXJNZWRpYSh7YXVkaW86IHRydWV9KVxuICAgICAgICAgICAgLnRoZW4oKG1zKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRNaWNyb3Bob25lKG1zKTtcbiAgICAgICAgICAgICAgICBvbk1pY3JvcGhvbmVHcmFudGVkKG1zKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydCgpOyBjb3VsZCBub3QgZ3JhYiBtaWNyb3Bob25lLiBwZXJoYXBzIHVzZXIgZGlkbid0IGdpdmUgdXMgcGVybWlzc2lvbj9cIik7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGVycik7XG4gICAgICAgICAgICAgICAgb25NaWNyb3Bob25lRGVuaWVkKGVycik7XG4gICAgICAgICAgICB9KVxuICAgIH1cbn1cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBRdWlwVmlldyBmcm9tICcuLi8uLi9wYXJ0aWFscy9RdWlwVmlldy5qcydcbmltcG9ydCB7IEF1ZGlvUGxheWVyIH0gZnJvbSAnLi4vLi4vcGFydGlhbHMvQXVkaW9QbGF5ZXJWaWV3J1xuaW1wb3J0IHsgUXVpcE1vZGVsLCBNeVF1aXBDb2xsZWN0aW9uIH0gZnJvbSAnLi4vLi4vbW9kZWxzL1F1aXAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhvbWVwYWdlVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIG5ldyBNeVF1aXBDb2xsZWN0aW9uKCkuZmV0Y2goKS50aGVuKHF1aXBzID0+IHRoaXMub25RdWlwc0xvYWRlZChxdWlwcykpXG4gICAgfVxuXG4gICAgc2h1dGRvd24oKSB7XG4gICAgICAgIGlmICh0aGlzLnF1aXBWaWV3cyAhPSBudWxsKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBxdWlwIG9mIHRoaXMucXVpcFZpZXdzKSB7XG4gICAgICAgICAgICAgICAgcXVpcC5zaHV0ZG93bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcInBhdXNlXCIpO1xuICAgIH1cblxuICAgIG9uUXVpcHNMb2FkZWQocXVpcHMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJsb2FkZWQgcXVpcHNcIiwgcXVpcHMpO1xuXG4gICAgICAgIHRoaXMucXVpcFZpZXdzID0gW107XG5cbiAgICAgICAgZm9yICh2YXIgcXVpcCBvZiBxdWlwcykge1xuICAgICAgICAgICAgdmFyIHF1aXBWaWV3ID0gbmV3IFF1aXBWaWV3KHttb2RlbDogbmV3IFF1aXBNb2RlbChxdWlwKX0pO1xuICAgICAgICAgICAgdGhpcy5xdWlwVmlld3MucHVzaChxdWlwVmlldyk7XG4gICAgICAgICAgICB0aGlzLiRlbC5hcHBlbmQocXVpcFZpZXcuZWwpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IE1pY3JvcGhvbmVQZXJtaXNzaW9ucyBmcm9tICcuLi9HZXRNaWNyb3Bob25lL01pY3JvcGhvbmVQZXJtaXNzaW9ucydcbmltcG9ydCBSZWNvcmRlclZpZXcgZnJvbSAnLi9SZWNvcmRlclZpZXcnXG5pbXBvcnQgR2V0TWljcm9waG9uZVZpZXcgZnJvbSAnLi4vR2V0TWljcm9waG9uZS9HZXRNaWNyb3Bob25lVmlldydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjb3JkZXJDb250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihwcmVzZW50ZXIpIHtcbiAgICAgICAgdGhpcy5wcmVzZW50ZXIgPSBwcmVzZW50ZXI7XG4gICAgICAgIG5ldyBNaWNyb3Bob25lUGVybWlzc2lvbnMoKVxuICAgICAgICAgICAgLmdyYWJNaWNyb3Bob25lKChtcykgPT4gdGhpcy5vbk1pY3JvcGhvbmVBY3F1aXJlZChtcyksICgpID0+IHRoaXMub25NaWNyb3Bob25lRGVuaWVkKCkpO1xuICAgIH1cblxuICAgIG9uTWljcm9waG9uZUFjcXVpcmVkKG1pY3JvcGhvbmVNZWRpYVN0cmVhbSkge1xuICAgICAgICB0aGlzLnByZXNlbnRlci5zd2l0Y2hWaWV3KG5ldyBSZWNvcmRlclZpZXcobWljcm9waG9uZU1lZGlhU3RyZWFtKSk7XG4gICAgfVxuXG4gICAgb25NaWNyb3Bob25lRGVuaWVkKCkge1xuICAgICAgICB0aGlzLnByZXNlbnRlci5zd2l0Y2hWaWV3KG5ldyBHZXRNaWNyb3Bob25lVmlldygpKTtcbiAgICB9XG59XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiXCI7XG59LFwiM1wiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtLXJlY29yZGluZy1tb3RpdmF0aW9uXFxcIj5cXG4gICAgICAgICAgICA8aDE+UmVjb3JkIHlvdXIgZmlyc3QgcG9kY2FzdC48L2gxPlxcblxcbiAgICAgICAgICAgIDxwPlRha2VzIG9ubHkgMzAgc2Vjb25kcy48L3A+XFxuICAgICAgICA8L2Rpdj5cXG5cIjtcbn0sXCJjb21waWxlclwiOls3LFwiPj0gNC4wLjBcIl0sXCJtYWluXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxO1xuXG4gIHJldHVybiBcIjxhdWRpbyBpZD1cXFwicmVjb3JkZWQtcHJldmlld1xcXCIgY29udHJvbHM9XFxcImNvbnRyb2xzXFxcIj48L2F1ZGlvPlxcblxcbjxkaXYgY2xhc3M9XFxcIm0tcXVpcHMtc2FtcGxlLWxpc3RpbmdcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbXCJpZlwiXS5jYWxsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwIDoge30sKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm51bV9yZWNvcmRpbmdzIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjpjb250YWluZXIucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjpjb250YWluZXIucHJvZ3JhbSgzLCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCI8L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJtLXJlY29yZGluZy1jb250YWluZXJcXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjYXJkXFxcIj5cXG5cXG4gICAgICAgIDxkaXYgaWQ9XFxcInJlY29yZGVyLWZ1bGxcXFwiIGNsYXNzPVxcXCJtLXJlY29yZGluZy1zY3JlZW4gZmFjZVxcXCI+XFxuICAgICAgICAgICAgPGRpdiB0aXRsZT1cXFwidG9nZ2xlIHJlY29yZGluZ1xcXCIgY2xhc3M9XFxcInJlY29yZGluZy10b2dnbGVcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1taWNyb3Bob25lXFxcIj48L2k+PC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwicmVjb3JkaW5nLXRpbWVcXFwiPjM8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBpZD1cXFwicmVjb3JkZXItdXBsb2FkZXJcXFwiIGNsYXNzPVxcXCJtLXJlY29yZGluZy11cGxvYWRpbmcgZmFjZSBkaXNhYmxlZFxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwidXBsb2FkLXByb2dyZXNzXFxcIj5cXG4gICAgICAgICAgICAgICAgPGg0PlVwbG9hZGluZzwvaDQ+XFxuXFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcInByb2dyZXNzLWJhclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYXJcXFwiPjwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBpZD1cXFwicmVjb3JkZXItZG9uZVxcXCIgY2xhc3M9XFxcIm0tcmVjb3JkaW5nLXByZXZpZXcgZmFjZSBiYWNrXFxcIj5cXG4gICAgICAgICAgICA8aDE+UG9zdCBOZXcgUmVjb3JkaW5nPC9oMT5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGF0c1xcXCI+XFxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1wbGF5LWNpcmNsZVxcXCI+PC9pPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwiZHVyYXRpb25cXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkZXNjcmlwdGlvblxcXCI+XFxuICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBuYW1lPVxcXCJkZXNjcmlwdGlvblxcXCIgcGxhY2Vob2xkZXI9XFxcIm9wdGlvbmFsIGRlc2NyaXB0aW9uXFxcIj48L3RleHRhcmVhPlxcbiAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImNvbnRyb2xzXFxcIj5cXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XFxcInNxdWFyZS1idG4gYnRuLXByaW1hcnlcXFwiIGlkPVxcXCJ1cGxvYWQtcmVjb3JkaW5nXFxcIj5VcGxvYWQ8L2E+XFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJzcXVhcmUtYnRuIGJ0bi1kZWZhdWx0XFxcIiBpZD1cXFwicHJldmlldy1idG5cXFwiPlByZXZpZXc8L2E+XFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJzcXVhcmUtYnRuIGJ0bi1saW5rXFxcIiBpZD1cXFwiY2FuY2VsLXJlY29yZGluZ1xcXCI+RGVsZXRlIGFuZCBUcnkgQWdhaW48L2E+XFxuICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8L2Rpdj5cXG5cXG4gICAgPC9kaXY+XFxuXFxuPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9SZWNvcmRlclZpZXcuaGJzJ1xuXG5pbXBvcnQgUXVpcFZpZXcgZnJvbSAnLi4vLi4vcGFydGlhbHMvUXVpcFZpZXcuanMnXG5pbXBvcnQgeyBBdWRpb0NhcHR1cmUgfSBmcm9tICcuLi8uLi9hdWRpby1jYXB0dXJlJ1xuaW1wb3J0IHsgQ3JlYXRlUmVjb3JkaW5nTW9kZWwgfSBmcm9tICcuLi8uLi9tb2RlbHMvQ3JlYXRlUmVjb3JkaW5nTW9kZWwnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY29yZGVyVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIC8vICAgIGVsOiAnLm0tcmVjb3JkaW5nLWNvbnRhaW5lcicsXG5cbiAgICBJbnRUb1RpbWUodmFsdWUpIHtcbiAgICAgICAgdmFyIG1pbnV0ZXMgPSBNYXRoLmZsb29yKHZhbHVlIC8gNjApO1xuICAgICAgICB2YXIgc2Vjb25kcyA9IE1hdGgucm91bmQodmFsdWUgLSBtaW51dGVzICogNjApO1xuXG4gICAgICAgIHJldHVybiAoXCIwMFwiICsgbWludXRlcykuc3Vic3RyKC0yKSArIFwiOlwiICsgKFwiMDBcIiArIHNlY29uZHMpLnN1YnN0cigtMik7XG4gICAgfVxuXG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhdWRpb0NhcHR1cmU6IG51bGwsXG4gICAgICAgICAgICBhdWRpb0Jsb2I6IG51bGwsXG4gICAgICAgICAgICBhdWRpb0Jsb2JVcmw6IG51bGwsXG4gICAgICAgICAgICBhdWRpb1BsYXllcjogbnVsbCxcbiAgICAgICAgICAgIGlzUmVjb3JkaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHRpbWVySWQ6IDAsXG4gICAgICAgICAgICB0aW1lclN0YXJ0OiAzXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBldmVudHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBcImNsaWNrIC5yZWNvcmRpbmctdG9nZ2xlXCI6IFwidG9nZ2xlXCIsXG4gICAgICAgICAgICBcImNsaWNrICNjYW5jZWwtcmVjb3JkaW5nXCI6IFwiY2FuY2VsUmVjb3JkaW5nXCIsXG4gICAgICAgICAgICBcImNsaWNrICN1cGxvYWQtcmVjb3JkaW5nXCI6IFwidXBsb2FkUmVjb3JkaW5nXCIsXG4gICAgICAgICAgICBcImNsaWNrICNwcmV2aWV3LWJ0blwiOiBcInBsYXlQcmV2aWV3XCJcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0ZW1wbGF0ZSh0aGlzLm1vZGVsLnRvSlNPTigpKSk7XG4gICAgfVxuXG4gICAgYnVpbGQobW9kZWwpIHtcbiAgICAgICAgdGhpcy5tb2RlbCA9IG1vZGVsO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwibW9kZWxcIiwgbW9kZWwpO1xuXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgICAgdGhpcy5hdWRpb1BsYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVjb3JkZWQtcHJldmlld1wiKTtcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9QbGF5ZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImNhbiBwbGF5IHZvcmJpczogXCIsICEhdGhpcy5hdWRpb1BsYXllci5jYW5QbGF5VHlwZSAmJiBcIlwiICE9IHRoaXMuYXVkaW9QbGF5ZXIuY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwidm9yYmlzXCInKSk7XG5cbiAgICAgICAgLy8gcGxheSBhIGJlZXBcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIi9hc3NldHMvc291bmRzL2JlZXBfc2hvcnRfb24ub2dnXCI7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIHRoaXMubW9kZWwub24oJ2NoYW5nZTpyZWNvcmRpbmdUaW1lJywgZnVuY3Rpb24gKG1vZGVsLCB0aW1lKSB7XG4gICAgICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLnRleHQodGltZSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZShtaWNyb3Bob25lTWVkaWFTdHJlYW0pIHtcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUgPSBuZXcgQXVkaW9DYXB0dXJlKG1pY3JvcGhvbmVNZWRpYVN0cmVhbSk7XG5cbiAgICAgICAgbmV3IENyZWF0ZVJlY29yZGluZ01vZGVsKCkuZmV0Y2goKVxuICAgICAgICAgICAgLnRoZW4obW9kZWwgPT4gdGhpcy5idWlsZChuZXcgQ3JlYXRlUmVjb3JkaW5nTW9kZWwobW9kZWwpKSk7XG5cbiAgICAgICAgLy8gVE9ETzogdHJ5IHVzaW5nIHRoZSBuZXcgZmV0Y2goKSBzeW50YXggaW5zdGVhZCBvZiBiYWNrYm9uZSBtb2RlbHNcbiAgICAgICAgLy9mZXRjaChcIi9hcGkvY3JlYXRlX3JlY29yZGluZ1wiLCB7Y3JlZGVudGlhbHM6ICdpbmNsdWRlJ30pXG4gICAgICAgIC8vICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuICAgICAgICAvLyAgICAudGhlbihqc29uID0+IHRoaXMuc3dpdGNoVmlldyhuZXcgUmVjb3JkZXJWaWV3KGpzb24pKSk7XG4gICAgfVxuXG4gICAgdG9nZ2xlKGV2ZW50KSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnN0b3BSZWNvcmRpbmcoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zdGFydFJlY29yZGluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2FuY2VsUmVjb3JkaW5nKGV2ZW50KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IGNhbmNlbGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItZnVsbFwiKS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLnJlbW92ZUNsYXNzKFwiZmxpcHBlZFwiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIDMpO1xuICAgIH1cblxuICAgIHVwbG9hZFJlY29yZGluZyhldmVudCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyB1cGxvYWRpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiXCI7XG5cbiAgICAgICAgJChcIiNyZWNvcmRlci1mdWxsXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikucmVtb3ZlQ2xhc3MoXCJmbGlwcGVkXCIpO1xuXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9ICQoJ3RleHRhcmVhW25hbWU9ZGVzY3JpcHRpb25dJylbMF0udmFsdWU7XG5cbiAgICAgICAgdmFyIGRhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2Rlc2NyaXB0aW9uJywgZGVzY3JpcHRpb24pO1xuICAgICAgICBkYXRhLmFwcGVuZCgnaXNQdWJsaWMnLCAxKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2F1ZGlvLWJsb2InLCB0aGlzLmF1ZGlvQmxvYik7XG5cbiAgICAgICAgLy8gc2VuZCByYXcgYmxvYiBhbmQgbWV0YWRhdGFcblxuICAgICAgICAvLyBUT0RPOiBnZXQgYSByZXBsYWNlbWVudCBhamF4IGxpYnJhcnkgKG1heWJlIHBhdGNoIHJlcXdlc3QgdG8gc3VwcG9ydCBiaW5hcnk/KVxuICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHhoci5vcGVuKCdwb3N0JywgJy9hcGkvcXVpcHMnLCB0cnVlKTtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgIHhoci51cGxvYWQub25wcm9ncmVzcyA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB2YXIgcGVyY2VudCA9ICgoZS5sb2FkZWQgLyBlLnRvdGFsKSAqIDEwMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicGVyY2VudGFnZTogXCIgKyBwZXJjZW50KTtcbiAgICAgICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikuZmluZChcIi5iYXJcIikuY3NzKCd3aWR0aCcsIHBlcmNlbnQpO1xuICAgICAgICB9O1xuICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikuZmluZChcIi5iYXJcIikuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBtYW51YWwgeGhyIHN1Y2Nlc3NmdWxcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IG1hbnVhbCB4aHIgZXJyb3JcIiwgeGhyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInhoci5yZXNwb25zZVwiLCB4aHIucmVzcG9uc2UpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZXN1bHRcIiwgcmVzdWx0KTtcblxuICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlc3VsdC51cmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhoci5zZW5kKGRhdGEpO1xuICAgIH1cblxuICAgIG9uUmVjb3JkaW5nVGljaygpIHtcbiAgICAgICAgdmFyIHRpbWVTcGFuID0gcGFyc2VJbnQoKChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHRoaXMudGltZXJTdGFydCkgLyAxMDAwKS50b0ZpeGVkKCkpO1xuICAgICAgICB2YXIgdGltZVN0ciA9IHRoaXMuSW50VG9UaW1lKHRpbWVTcGFuKTtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aW1lU3RyKTtcbiAgICB9XG5cbiAgICBzdGFydFJlY29yZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJzdGFydGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlLnN0YXJ0KCgpID0+IHRoaXMub25SZWNvcmRpbmdTdGFydGVkKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1pY3JvcGhvbmUgaXMgcmVhZHkgdG8gcmVjb3JkLiBEbyBhIGNvdW50LWRvd24sIHRoZW4gc2lnbmFsIGZvciBpbnB1dC1zaWduYWwgdG8gYmVnaW4gcmVjb3JkaW5nXG4gICAgICovXG4gICAgb25SZWNvcmRpbmdTdGFydGVkKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIm1pYyByZWFkeSB0byByZWNvcmQuIGRvIGNvdW50ZG93bi5cIik7XG5cbiAgICAgICAgLy8gb3IgbGF1bmNoIGNhcHR1cmUgaW1tZWRpYXRlbHlcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLkludFRvVGltZSgwKSk7XG4gICAgICAgIHRoaXMub25NaWNSZWNvcmRpbmcoKTtcblxuICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLmFkZENsYXNzKFwiaXMtdmlzaWJsZVwiKTtcbiAgICB9XG5cbiAgICBvbk1pY1JlY29yZGluZygpIHtcbiAgICAgICAgdGhpcy50aW1lclN0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIHRoaXMudGltZXJJZCA9IHNldEludGVydmFsKHRoaXMub25SZWNvcmRpbmdUaWNrLmJpbmQodGhpcyksIDEwMDApO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLXNjcmVlblwiKS5hZGRDbGFzcyhcImlzLXJlY29yZGluZ1wiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIk1pYyByZWNvcmRpbmcgc3RhcnRlZFwiKTtcblxuICAgICAgICAvLyBUT0RPOiB0aGUgbWljIGNhcHR1cmUgaXMgYWxyZWFkeSBhY3RpdmUsIHNvIGF1ZGlvIGJ1ZmZlcnMgYXJlIGdldHRpbmcgYnVpbHQgdXBcbiAgICAgICAgLy8gd2hlbiB0b2dnbGluZyB0aGlzIG9uLCB3ZSBtYXkgYWxyZWFkeSBiZSBjYXB0dXJpbmcgYSBidWZmZXIgdGhhdCBoYXMgYXVkaW8gcHJpb3IgdG8gdGhlIGNvdW50ZG93blxuICAgICAgICAvLyBoaXR0aW5nIHplcm8uIHdlIGNhbiBkbyBhIGZldyB0aGluZ3MgaGVyZTpcbiAgICAgICAgLy8gMSkgZmlndXJlIG91dCBob3cgbXVjaCBhdWRpbyB3YXMgYWxyZWFkeSBjYXB0dXJlZCwgYW5kIGN1dCBpdCBvdXRcbiAgICAgICAgLy8gMikgdXNlIGEgZmFkZS1pbiB0byBjb3ZlciB1cCB0aGF0IHNwbGl0LXNlY29uZCBvZiBhdWRpb1xuICAgICAgICAvLyAzKSBhbGxvdyB0aGUgdXNlciB0byBlZGl0IHBvc3QtcmVjb3JkIGFuZCBjbGlwIGFzIHRoZXkgd2lzaCAoYmV0dGVyIGJ1dCBtb3JlIGNvbXBsZXggb3B0aW9uISlcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmF1ZGlvQ2FwdHVyZS50b2dnbGVNaWNyb3Bob25lUmVjb3JkaW5nKHRydWUpLCAyMDApO1xuICAgIH1cblxuICAgIHN0b3BSZWNvcmRpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3RvcHBpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXJJZCk7XG5cbiAgICAgICAgLy8gcGxheSBzb3VuZCBpbW1lZGlhdGVseSB0byBieXBhc3MgbW9iaWxlIGNocm9tZSdzIFwidXNlciBpbml0aWF0ZWQgbWVkaWFcIiByZXF1aXJlbWVudFxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiL2Fzc2V0cy9zb3VuZHMvYmVlcF9zaG9ydF9vZmYub2dnXCI7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIC8vIHJlcXVlc3QgcmVjb3JkaW5nIHN0b3BcbiAgICAgICAgLy8gd2FpdCBmb3Igc3luYyB0byBjb21wbGV0ZVxuICAgICAgICAvLyBhbmQgdGhlbiBjYWxsYmFjayB0cmFuc2l0aW9uIHRvIG5leHQgc2NyZWVuXG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlLnN0b3AoKGJsb2IpID0+IHRoaXMub25SZWNvcmRpbmdDb21wbGV0ZWQoYmxvYikpO1xuXG4gICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikucmVtb3ZlQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLXNjcmVlblwiKS5yZW1vdmVDbGFzcyhcImlzLXJlY29yZGluZ1wiKTtcbiAgICB9XG5cbiAgICBvblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IHByZXZpZXdpbmcgcmVjb3JkZWQgYXVkaW9cIik7XG4gICAgICAgIHRoaXMuYXVkaW9CbG9iID0gYmxvYjtcbiAgICAgICAgdGhpcy5zaG93Q29tcGxldGlvblNjcmVlbigpO1xuICAgIH1cblxuICAgIHBsYXlQcmV2aWV3KCkge1xuICAgICAgICAvLyBhdCB0aGlzIHBvaW50IGEgcGxheWFibGUgYXVkaW8gYmxvYiBzaG91bGQgYWxyZWFkeSBiZSBsb2FkZWQgaW4gYXVkaW9QbGF5ZXJcbiAgICAgICAgLy8gc28ganVzdCBwbGF5IGl0IGFnYWluXG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuICAgIH1cblxuICAgIHNob3dDb21wbGV0aW9uU2NyZWVuKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBmbGlwcGluZyB0byBhdWRpbyBwbGF5YmFja1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0Jsb2JVcmwgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTCh0aGlzLmF1ZGlvQmxvYik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLmFkZENsYXNzKFwiZmxpcHBlZFwiKTtcblxuICAgICAgICB0aGlzLm1ha2VBdWRpb0Jsb2JVcmxQbGF5YWJsZSh0aGlzLmF1ZGlvQmxvYlVybCwgKHBsYXlhYmxlQXVkaW9CbG9iVXJsKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHBsYXlhYmxlQXVkaW9CbG9iVXJsO1xuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhBQ0s6IHJvdXRlIGJsb2IgdGhyb3VnaCB4aHIgdG8gbGV0IEFuZHJvaWQgQ2hyb21lIHBsYXkgYmxvYnMgdmlhIDxhdWRpbz5cbiAgICAgKiBAcGFyYW0gYXVkaW9CbG9iVXJsIHJlcHJlc2VudGluZyBwb3RlbnRpYWxseSBub24tZGlzay1iYWNrZWQgYmxvYiB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb24gYWNjZXB0cyBhIGRpc2stYmFja2VkIGJsb2IgdXJsXG4gICAgICovXG4gICAgbWFrZUF1ZGlvQmxvYlVybFBsYXlhYmxlKGF1ZGlvQmxvYlVybCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gdGhpcyByZXF1ZXN0IGhhcHBlbnMgb3ZlciBsb29wYmFja1xuICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHhoci5vcGVuKCdHRVQnLCBhdWRpb0Jsb2JVcmwsIHRydWUpO1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InO1xuICAgICAgICB4aHIub3ZlcnJpZGVNaW1lVHlwZSgnYXVkaW8vb2dnJyk7XG5cbiAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCAmJiB4aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgIHZhciB4aHJCbG9iVXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoeGhyLnJlc3BvbnNlKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGVkIGJsb2IgZnJvbSBjYWNoZSB1cmw6IFwiICsgYXVkaW9CbG9iVXJsKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJvdXRlZCBpbnRvIGJsb2IgdXJsOiBcIiArIHhockJsb2JVcmwpO1xuXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soeGhyQmxvYlVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhoci5zZW5kKCk7XG4gICAgfVxufVxuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBoZWxwZXIsIGFsaWFzMT1kZXB0aDAgIT0gbnVsbCA/IGRlcHRoMCA6IHt9LCBhbGlhczI9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBhbGlhczM9XCJmdW5jdGlvblwiLCBhbGlhczQ9Y29udGFpbmVyLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiICAgICAgICA8YSBocmVmPVxcXCIvc3RyZWFtcy9cIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuaWQgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlkIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMiksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMyA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJpZFwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiIGNsYXNzPVxcXCJzdHJlYW1cXFwiPlxcbiAgICAgICAgICAgIFwiXG4gICAgKyBhbGlhczQoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5uYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5uYW1lIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMiksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMyA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcbiAgICAgICAgPC9hPlxcblwiO1xufSxcImNvbXBpbGVyXCI6WzcsXCI+PSA0LjAuMFwiXSxcIm1haW5cIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazEsIGhlbHBlciwgYWxpYXMxPWRlcHRoMCAhPSBudWxsID8gZGVwdGgwIDoge307XG5cbiAgcmV0dXJuIFwiPCEtLSBUT0RPOiBjcmVhdGUgeW91ciBmaXJzdCBzdHJlYW0gLS0+XFxuXFxuPGRpdiBjbGFzcz1cXFwibS1jcmVhdGUtc3RyZWFtXFxcIj5cXG4gICAgPGZvcm0+XFxuICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImZpZWxkXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJzdHJlYW1OYW1lXFxcIiBwbGFjZWhvbGRlcj1cXFwiU3RyZWFtIE5hbWVcXFwiIHZhbHVlPVxcXCJcIlxuICAgICsgY29udGFpbmVyLmVzY2FwZUV4cHJlc3Npb24oKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5zdHJlYW1OYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5zdHJlYW1OYW1lIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGhlbHBlcnMuaGVscGVyTWlzc2luZyksKHR5cGVvZiBoZWxwZXIgPT09IFwiZnVuY3Rpb25cIiA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJzdHJlYW1OYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIvPlxcblxcbiAgICAgICAgPGgzPlByaXZhY3k8L2gzPlxcblxcbiAgICAgICAgPGxhYmVsIGZvcj1cXFwicHJpdmFjeS1wdWJsaWNcXFwiPlxcbiAgICAgICAgICAgIDxpbnB1dCBpZD1cXFwicHJpdmFjeS1wdWJsaWNcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBuYW1lPVxcXCJwcml2YWN5XFxcIiB2YWx1ZT1cXFwicHVibGljXFxcIiBjaGVja2VkLz5cXG4gICAgICAgICAgICA8Yj5QdWJsaWM8L2I+IC0gQW55b25lIGNhbiBmb2xsb3cgdGhpcyBzdHJlYW1cXG4gICAgICAgIDwvbGFiZWw+XFxuICAgICAgICA8YnI+XFxuICAgICAgICA8bGFiZWwgZm9yPVxcXCJwcml2YWN5LXByaXZhdGVcXFwiPlxcbiAgICAgICAgICAgIDxpbnB1dCBpZD1cXFwicHJpdmFjeS1wcml2YXRlXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgbmFtZT1cXFwicHJpdmFjeVxcXCIgdmFsdWU9XFxcInByaXZhdGVcXFwiLz5cXG4gICAgICAgICAgICA8Yj5Qcml2YXRlPC9iPiAtIE9ubHkgdGhvc2UgeW91IGludml0ZSBjYW4gZm9sbG93IHRoaXMgc3RyZWFtLlxcbiAgICAgICAgPC9sYWJlbD5cXG4gICAgICAgIDxicj5cXG4gICAgICAgIDxicj5cXG5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcInNxdWFyZS1idG4gYnRuLXN1Y2Nlc3NcXFwiIG5hbWU9XFxcInN1Ym1pdFxcXCI+Q3JlYXRlPC9idXR0b24+XFxuICAgIDwvZm9ybT5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJtLWxpc3Qtc3RyZWFtc1xcXCI+XFxuICAgIDxoMz5TdHJlYW1zPC9oMz5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChhbGlhczEsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnN0cmVhbXMgOiBkZXB0aDApLHtcIm5hbWVcIjpcImVhY2hcIixcImhhc2hcIjp7fSxcImZuXCI6Y29udGFpbmVyLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6Y29udGFpbmVyLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL0NyZWF0ZVN0cmVhbS5oYnMnXG5pbXBvcnQgJ2JhY2tib25lLWJpbmRpbmdzJ1xuaW1wb3J0ICdiYWNrYm9uZS5lcG94eSdcblxuY2xhc3MgU3RyZWFtTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdHJlYW1OYW1lOiBcIlwiLFxuICAgICAgICAgICAgcHJpdmFjeTogXCJwdWJsaWNcIixcbiAgICAgICAgICAgIHN0cmVhbXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAxLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcInN0cmVhbSAxXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiAyLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcInN0cmVhbSAyXCIsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGNvbXB1dGVkcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNhblN1Ym1pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KCdzdHJlYW1OYW1lJykgIT0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ3JlYXRlU3RyZWFtVmlldyBleHRlbmRzIEJhY2tib25lLkVwb3h5LlZpZXcge1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRoaXMubW9kZWwgPSBuZXcgU3RyZWFtTW9kZWwoKTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoXCJzdHJlYW0tZGV0YWlsc1wiKTtcbiAgICB9XG5cbiAgICBnZXQgYmluZGluZ3MoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBcIltuYW1lPXN0cmVhbU5hbWVdXCI6IFwidmFsdWU6c3RyZWFtTmFtZVwiLFxuICAgICAgICAgICAgXCJbbmFtZT1wcml2YWN5XVwiOiBcImNoZWNrZWQ6cHJpdmFjeVwiXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgZXZlbnRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJjbGljayAubS1jcmVhdGUtc3RyZWFtIGJ1dHRvblwiOiBcIm9uQ3JlYXRlU3RyZWFtXCIsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvbkNyZWF0ZVN0cmVhbSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzIG1vZGVsXCIsIHRoaXMubW9kZWwuYXR0cmlidXRlcyk7XG5cbiAgICAgICAgdmFyIHN0cmVhbU5hbWUgPSB0aGlzLm1vZGVsLmdldChcInN0cmVhbU5hbWVcIik7XG4gICAgICAgIHZhciBwcml2YWN5ID0gdGhpcy5tb2RlbC5nZXQoXCJwcml2YWN5XCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgbmV3IHN0cmVhbSBuYW1lZCBcIiArIHN0cmVhbU5hbWUgKyBcIiB3aXRoIHByaXZhY3kgPSBcIiArIHByaXZhY3kpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGVtcGxhdGUodGhpcy5tb2RlbC5hdHRyaWJ1dGVzKSk7XG4gICAgfVxuXG59XG4iLCJpbXBvcnQgQ3JlYXRlU3RyZWFtVmlldyBmcm9tICcuL0NyZWF0ZVN0cmVhbSdcbmltcG9ydCBTdHJlYW1EZXRhaWxzVmlldyBmcm9tICcuL1N0cmVhbURldGFpbHMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0cmVhbUNvbnRyb2xsZXIge1xuICAgIGNvbnN0cnVjdG9yKHByZXNlbnRlcikge1xuICAgICAgICB0aGlzLnByZXNlbnRlciA9IHByZXNlbnRlcjtcbiAgICB9XG5cbiAgICBjcmVhdGUoKSB7XG4gICAgICAgIHRoaXMucHJlc2VudGVyLnN3aXRjaFZpZXcobmV3IENyZWF0ZVN0cmVhbVZpZXcoKSk7XG4gICAgfVxuXG4gICAgZGV0YWlscyhpZCkge1xuICAgICAgICB0aGlzLnByZXNlbnRlci5zd2l0Y2hWaWV3KG5ldyBTdHJlYW1EZXRhaWxzVmlldyhpZCkpO1xuICAgIH1cbn1cbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls3LFwiPj0gNC4wLjBcIl0sXCJtYWluXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJtLXN0cmVhbS1kZXRhaWxzXFxcIj5cXG4gICAgPGgxPlN0cmVhbSBEZXRhaWxzPC9oMT5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJnLXF1aXBzLWxpc3RcXFwiPlxcbjwvZGl2PlxcblwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9TdHJlYW1EZXRhaWxzLmhicydcbmltcG9ydCAnYmFja2JvbmUtYmluZGluZ3MnXG5pbXBvcnQgJ2JhY2tib25lLmVwb3h5J1xuaW1wb3J0IHsgUXVpcE1vZGVsLCBNeVF1aXBDb2xsZWN0aW9uIH0gZnJvbSAnLi4vLi4vbW9kZWxzL1F1aXAnXG5pbXBvcnQgUXVpcFZpZXcgZnJvbSAnLi4vLi4vcGFydGlhbHMvUXVpcFZpZXcuanMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0cmVhbURldGFpbHNWaWV3IGV4dGVuZHMgQmFja2JvbmUuRXBveHkuVmlldyB7XG4gICAgaW5pdGlhbGl6ZShpZCkge1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcyhcInN0cmVhbS1kZXRhaWxzXCIpO1xuICAgICAgICBuZXcgTXlRdWlwQ29sbGVjdGlvbigpLmZldGNoKCkudGhlbihxdWlwcyA9PiB0aGlzLm9uUXVpcHNMb2FkZWQocXVpcHMpKVxuICAgIH1cblxuICAgIG9uUXVpcHNMb2FkZWQocXVpcHMpIHtcbiAgICAgICAgdGhpcy5xdWlwVmlld3MgPSBbXTtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLiRlbC5maW5kKCcuZy1xdWlwcy1saXN0Jyk7XG5cbiAgICAgICAgZm9yICh2YXIgcXVpcCBvZiBxdWlwcykge1xuICAgICAgICAgICAgdmFyIHF1aXBWaWV3ID0gbmV3IFF1aXBWaWV3KHttb2RlbDogbmV3IFF1aXBNb2RlbChxdWlwKX0pO1xuICAgICAgICAgICAgdGhpcy5xdWlwVmlld3MucHVzaChxdWlwVmlldyk7XG4gICAgICAgICAgICBsaXN0LmFwcGVuZChxdWlwVmlldy5lbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzaHV0ZG93bigpIHtcbiAgICAgICAgaWYgKHRoaXMucXVpcFZpZXdzICE9IG51bGwpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHF1aXAgb2YgdGhpcy5xdWlwVmlld3MpIHtcbiAgICAgICAgICAgICAgICBxdWlwLnNodXRkb3duKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgYmluZGluZ3MoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAvL1wiW25hbWU9c3RyZWFtTmFtZV1cIjogXCJ2YWx1ZTpzdHJlYW1OYW1lXCIsXG4gICAgICAgICAgICAvL1wiW25hbWU9cHJpdmFjeV1cIjogXCJjaGVja2VkOnByaXZhY3lcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGV2ZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC8vXCJjbGljayAubS1jcmVhdGUtc3RyZWFtIGJ1dHRvblwiOiBcIm9uQ3JlYXRlU3RyZWFtXCIsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvbkNyZWF0ZVN0cmVhbSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzIG1vZGVsXCIsIHRoaXMubW9kZWwuYXR0cmlidXRlcyk7XG5cbiAgICAgICAgdmFyIHN0cmVhbU5hbWUgPSB0aGlzLm1vZGVsLmdldChcInN0cmVhbU5hbWVcIik7XG4gICAgICAgIHZhciBwcml2YWN5ID0gdGhpcy5tb2RlbC5nZXQoXCJwcml2YWN5XCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgbmV3IHN0cmVhbSBuYW1lZCBcIiArIHN0cmVhbU5hbWUgKyBcIiB3aXRoIHByaXZhY3kgPSBcIiArIHByaXZhY3kpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGVtcGxhdGUoKSk7XG4gICAgfVxuXG59XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNyxcIj49IDQuMC4wXCJdLFwibWFpblwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIGhlbHBlcjtcblxuICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJtLXN0cmVhbS1kZXRhaWxzXFxcIj5cXG4gICAgPGgxPlwiXG4gICAgKyBjb250YWluZXIuZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnVzZXJuYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51c2VybmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBcImZ1bmN0aW9uXCIgPyBoZWxwZXIuY2FsbChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMCA6IHt9LHtcIm5hbWVcIjpcInVzZXJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIidzIFN0cmVhbTwvaDE+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiZy1xdWlwcy1saXN0XFxcIj5cXG48L2Rpdj5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0ICogYXMgVmlld3MgZnJvbSAnLi4vVmlld3MnXG5pbXBvcnQgeyBRdWlwTW9kZWwsIE15UXVpcENvbGxlY3Rpb24gfSBmcm9tICcuLi8uLi9tb2RlbHMvUXVpcCdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL1VzZXJBbGxSZWNvcmRpbmdzLmhicydcblxuY2xhc3MgVXNlclBvZENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uIHtcbiAgICBjb25zdHJ1Y3Rvcih1c2VybmFtZSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLm1vZGVsID0gUXVpcE1vZGVsO1xuICAgICAgICB0aGlzLnVzZXJuYW1lID0gdXNlcm5hbWU7XG4gICAgfVxuXG4gICAgdXJsKCkge1xuICAgICAgICByZXR1cm4gXCIvYXBpL3UvXCIgKyB0aGlzLnVzZXJuYW1lICsgXCIvcXVpcHNcIjtcbiAgICB9XG59XG5cbmNsYXNzIFVzZXJQb2RDb2xsZWN0aW9uVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGNvbnN0cnVjdG9yKHVzZXJuYW1lKSB7XG4gICAgICAgIHN1cGVyKHVzZXJuYW1lKTtcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKHVzZXJuYW1lKSB7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICAgIG5ldyBVc2VyUG9kQ29sbGVjdGlvbih1c2VybmFtZSlcbiAgICAgICAgICAgIC5mZXRjaCgpXG4gICAgICAgICAgICAudGhlbihxdWlwcyA9PiB0aGlzLmNyZWF0ZUNoaWxkVmlld3MocXVpcHMpKVxuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0ZW1wbGF0ZSgpKTtcbiAgICB9XG5cbiAgICBzaHV0ZG93bigpIHtcbiAgICAgICAgQXVkaW9QbGF5ZXIucGF1c2UoKTtcbiAgICAgICAgdGhpcy5kZXN0cm95Q2hpbGRWaWV3cygpO1xuICAgIH1cblxuICAgIGNyZWF0ZUNoaWxkVmlld3MocXVpcHMpIHtcbiAgICAgICAgdGhpcy5xdWlwVmlld3MgPSBbXTtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLiRlbC5maW5kKCcuZy1xdWlwcy1saXN0Jyk7XG5cbiAgICAgICAgZm9yICh2YXIgcXVpcCBvZiBxdWlwcykge1xuICAgICAgICAgICAgdmFyIHF1aXBWaWV3ID0gbmV3IFZpZXdzLlF1aXBWaWV3KHttb2RlbDogbmV3IFF1aXBNb2RlbChxdWlwKX0pO1xuICAgICAgICAgICAgdGhpcy5xdWlwVmlld3MucHVzaChxdWlwVmlldyk7XG4gICAgICAgICAgICBsaXN0LmFwcGVuZChxdWlwVmlldy5lbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkZXN0cm95Q2hpbGRWaWV3cygpIHtcbiAgICAgICAgaWYgKHRoaXMucXVpcFZpZXdzICE9IG51bGwpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHF1aXAgb2YgdGhpcy5xdWlwVmlld3MpIHtcbiAgICAgICAgICAgICAgICBxdWlwLnNodXRkb3duKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmV4cG9ydCB7IFVzZXJQb2RDb2xsZWN0aW9uLCBVc2VyUG9kQ29sbGVjdGlvblZpZXcgfVxuXG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgKiBhcyBWaWV3cyBmcm9tICcuLi9WaWV3cydcbmltcG9ydCB7IFF1aXBNb2RlbCB9IGZyb20gJy4uLy4uL21vZGVscy9RdWlwJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBVc2VyUG9kVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGluaXRpYWxpemUocXVpcElkKSB7XG4gICAgICAgIG5ldyBRdWlwTW9kZWwoe2lkOiBxdWlwSWR9KVxuICAgICAgICAgICAgLmZldGNoKClcbiAgICAgICAgICAgIC50aGVuKHF1aXAgPT4gdGhpcy5jcmVhdGVDaGlsZFZpZXdzKHF1aXApKVxuICAgIH1cblxuICAgIHNodXRkb3duKCkge1xuICAgICAgICBBdWRpb1BsYXllci5wYXVzZSgpO1xuICAgICAgICB0aGlzLmRlc3Ryb3lDaGlsZFZpZXdzKCk7XG4gICAgfVxuXG4gICAgY3JlYXRlQ2hpbGRWaWV3cyhxdWlwKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibG9hZGVkIHNpbmdsZSBwb2RcIiwgcXVpcCk7XG5cbiAgICAgICAgdGhpcy5xdWlwVmlldyA9IG5ldyBWaWV3cy5RdWlwVmlldyh7bW9kZWw6IG5ldyBRdWlwTW9kZWwocXVpcCl9KTtcbiAgICAgICAgdGhpcy4kZWwuYXBwZW5kKHRoaXMucXVpcFZpZXcuZWwpO1xuICAgIH1cblxuICAgIGRlc3Ryb3lDaGlsZFZpZXdzKCkge1xuICAgICAgICB0aGlzLnF1aXBWaWV3LnNodXRkb3duKCk7XG4gICAgfVxufVxuXG5leHBvcnQgeyBVc2VyUG9kVmlldyB9XG5cbiIsImltcG9ydCBDaGFuZ2Vsb2dWaWV3IGZyb20gJy4vQ2hhbmdlbG9nL0NoYW5nZWxvZ1ZpZXcnXG5pbXBvcnQgSG9tZXBhZ2VWaWV3IGZyb20gJy4vSG9tZXBhZ2UvSG9tZXBhZ2VWaWV3J1xuaW1wb3J0IFJlY29yZGVyVmlldyBmcm9tICcuL1JlY29yZGVyL1JlY29yZGVyVmlldydcbmltcG9ydCBHZXRNaWNyb3Bob25lVmlldyBmcm9tICcuL0dldE1pY3JvcGhvbmUvR2V0TWljcm9waG9uZVZpZXcnXG5pbXBvcnQgVXNlclBvZFZpZXcgZnJvbSAnLi9Vc2VyL1VzZXJTaW5nbGVSZWNvcmRpbmdWaWV3J1xuaW1wb3J0IEhlYWRlck5hdlZpZXcgZnJvbSAnLi4vcGFydGlhbHMvSGVhZGVyTmF2VmlldydcbmltcG9ydCBRdWlwVmlldyBmcm9tICcuLi9wYXJ0aWFscy9RdWlwVmlldydcbmltcG9ydCB7IFVzZXJQb2RDb2xsZWN0aW9uLCBVc2VyUG9kQ29sbGVjdGlvblZpZXcgfSBmcm9tICcuL1VzZXIvVXNlckFsbFJlY29yZGluZ3NWaWV3J1xuaW1wb3J0IHsgU291bmRQbGF5ZXIsIEF1ZGlvUGxheWVyVmlldywgQXVkaW9QbGF5ZXJFdmVudHMgfSBmcm9tICcuLi9wYXJ0aWFscy9BdWRpb1BsYXllclZpZXcnXG5cbmV4cG9ydCB7XG4gICAgQ2hhbmdlbG9nVmlldywgSG9tZXBhZ2VWaWV3LCBSZWNvcmRlclZpZXcsIEdldE1pY3JvcGhvbmVWaWV3LCBVc2VyUG9kVmlldywgSGVhZGVyTmF2VmlldyxcbiAgICBRdWlwVmlldywgVXNlclBvZENvbGxlY3Rpb25WaWV3LCBBdWRpb1BsYXllclZpZXdcbn1cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5cbmNsYXNzIEF1ZGlvUGxheWVyRXZlbnRzIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIHBhdXNlKCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoXCJwYXVzZVwiKTtcbiAgICB9XG59XG5cbmV4cG9ydCBsZXQgQXVkaW9QbGF5ZXIgPSBuZXcgQXVkaW9QbGF5ZXJFdmVudHMoKTtcblxuY2xhc3MgQXVkaW9QbGF5ZXJWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhdWRpb1BsYXllcjogbnVsbCxcbiAgICAgICAgICAgIHF1aXBNb2RlbDogbnVsbFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb1BsYXllclZpZXcgaW5pdGlhbGl6ZWRcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImF1ZGlvLXBsYXllclwiKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCJ0b2dnbGVcIiwgKHF1aXApID0+IHRoaXMub25Ub2dnbGUocXVpcCksIHRoaXMpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcInBhdXNlXCIsIChxdWlwKSA9PiB0aGlzLnBhdXNlKHF1aXApLCB0aGlzKTtcblxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLm9ucGF1c2UgPSAoKSA9PiB0aGlzLm9uQXVkaW9QYXVzZWQoKTtcbiAgICB9XG5cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgdGhpcy5zdG9wUGVyaW9kaWNUaW1lcigpO1xuICAgIH1cblxuICAgIHN0YXJ0UGVyaW9kaWNUaW1lcigpIHtcbiAgICAgICAgaWYodGhpcy5wZXJpb2RpY1RpbWVyID09IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMucGVyaW9kaWNUaW1lciA9IHNldEludGVydmFsKCgpID0+IHRoaXMuY2hlY2tQcm9ncmVzcygpLCAxMDApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RvcFBlcmlvZGljVGltZXIoKSB7XG4gICAgICAgIGlmKHRoaXMucGVyaW9kaWNUaW1lciAhPSBudWxsKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMucGVyaW9kaWNUaW1lcik7XG4gICAgICAgICAgICB0aGlzLnBlcmlvZGljVGltZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2hlY2tQcm9ncmVzcygpIHtcbiAgICAgICAgaWYodGhpcy5xdWlwTW9kZWwgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHByb2dyZXNzVXBkYXRlID0ge1xuICAgICAgICAgICAgcG9zaXRpb246IHRoaXMuYXVkaW9QbGF5ZXIuY3VycmVudFRpbWUsIC8vIHNlY1xuICAgICAgICAgICAgZHVyYXRpb246IHRoaXMuYXVkaW9QbGF5ZXIuZHVyYXRpb24sIC8vIHNlY1xuICAgICAgICAgICAgcHJvZ3Jlc3M6IDEwMCAqIHRoaXMuYXVkaW9QbGF5ZXIuY3VycmVudFRpbWUgLyB0aGlzLmF1ZGlvUGxheWVyLmR1cmF0aW9uIC8vICVcbiAgICAgICAgfVxuXG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCIvXCIgKyB0aGlzLnF1aXBNb2RlbC5pZCArIFwiL3Byb2dyZXNzXCIsIHByb2dyZXNzVXBkYXRlKTtcbiAgICB9XG5cbiAgICBvblRvZ2dsZShxdWlwTW9kZWwpIHtcbiAgICAgICAgdGhpcy5xdWlwTW9kZWwgPSBxdWlwTW9kZWw7XG5cbiAgICAgICAgaWYoIXRoaXMudHJhY2tJc0xvYWRlZChxdWlwTW9kZWwudXJsKSkge1xuICAgICAgICAgICAgdGhpcy5sb2FkVHJhY2socXVpcE1vZGVsLnVybCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZighdGhpcy50cmFja0lzTG9hZGVkKHF1aXBNb2RlbC51cmwpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLmF1ZGlvUGxheWVyLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5wbGF5KHF1aXBNb2RlbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnBhdXNlKHF1aXBNb2RlbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwbGF5KHF1aXBNb2RlbCkge1xuICAgICAgICAvLyBpZiBhdCB0aGUgZW5kIG9mIGZpbGUgKDIwMG1zIGZ1ZGdlKSwgcmV3aW5kXG4gICAgICAgIGlmKHBhcnNlRmxvYXQocXVpcE1vZGVsLnBvc2l0aW9uKSA+IChwYXJzZUZsb2F0KHF1aXBNb2RlbC5kdXJhdGlvbikgLSAwLjIpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJld2luZGluZyBhdWRpbyBjbGlwOyBxdWlwTW9kZWwucG9zaXRpb249XCIgKyBxdWlwTW9kZWwucG9zaXRpb25cbiAgICAgICAgICAgICAgICArIFwiIHF1aXBNb2RlbC5kdXJhdGlvbj1cIiArIHF1aXBNb2RlbC5kdXJhdGlvbik7XG4gICAgICAgICAgICBxdWlwTW9kZWwucG9zaXRpb24gPSAwO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuY3VycmVudFRpbWUgPSBxdWlwTW9kZWwucG9zaXRpb247XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCIvXCIgKyBxdWlwTW9kZWwuaWQgKyBcIi9wbGF5aW5nXCIpO1xuICAgICAgICB0aGlzLnN0YXJ0UGVyaW9kaWNUaW1lcigpO1xuICAgIH1cblxuICAgIHBhdXNlKHF1aXBNb2RlbCkge1xuICAgICAgICAvLyByZXF1ZXN0IHBhdXNlXG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGF1c2UoKTtcbiAgICB9XG5cbiAgICB0cmFja0lzTG9hZGVkKHVybCkge1xuICAgICAgICByZXR1cm4gfnRoaXMuYXVkaW9QbGF5ZXIuc3JjLmluZGV4T2YodXJsKTtcbiAgICB9XG5cbiAgICBsb2FkVHJhY2sodXJsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGluZyBhdWRpbzogXCIgKyB1cmwpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHVybDtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5sb2FkKCk7XG4gICAgfVxuXG4gICAgLyogQXVkaW8gZWxlbWVudCByZXBvcnRzIHBhdXNlIHRyaWdnZXJlZCwgdHJlYXRpbmcgYXMgZW5kIG9mIGZpbGUgKi9cbiAgICBvbkF1ZGlvUGF1c2VkKCkge1xuICAgICAgICB0aGlzLmNoZWNrUHJvZ3Jlc3MoKTtcbiAgICAgICAgaWYodGhpcy5xdWlwTW9kZWwgIT0gbnVsbCkge1xuICAgICAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHRoaXMucXVpcE1vZGVsLmlkICsgXCIvcGF1c2VkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RvcFBlcmlvZGljVGltZXIoKTtcbiAgICB9XG59XG5cbmNsYXNzIFNvdW5kUGxheWVyIHtcbiAgICBzdGF0aWMgY3JlYXRlIChtb2RlbCkge1xuICAgICAgICB2YXIgcmVzdW1lUG9zaXRpb24gPSBwYXJzZUludChtb2RlbC5nZXQoJ3Bvc2l0aW9uJykgfHwgMCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBzb3VuZCBwbGF5ZXIgZm9yIG1vZGVsOlwiLCBtb2RlbCk7XG5cbiAgICAgICAgcmV0dXJuIHNvdW5kTWFuYWdlci5jcmVhdGVTb3VuZCh7XG4gICAgICAgICAgICBpZDogbW9kZWwuaWQsXG4gICAgICAgICAgICB1cmw6IG1vZGVsLnVybCxcbiAgICAgICAgICAgIHZvbHVtZTogMTAwLFxuICAgICAgICAgICAgYXV0b0xvYWQ6IHRydWUsXG4gICAgICAgICAgICBhdXRvUGxheTogZmFsc2UsXG4gICAgICAgICAgICBmcm9tOiByZXN1bWVQb3NpdGlvbixcbiAgICAgICAgICAgIHdoaWxlbG9hZGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibG9hZGVkOiBcIiArIHRoaXMuYnl0ZXNMb2FkZWQgKyBcIiBvZiBcIiArIHRoaXMuYnl0ZXNUb3RhbCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25sb2FkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NvdW5kOyBhdWRpbyBsb2FkZWQ7IHBvc2l0aW9uID0gJyArIHJlc3VtZVBvc2l0aW9uICsgJywgZHVyYXRpb24gPSAnICsgdGhpcy5kdXJhdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiA9PSBudWxsIHx8IHRoaXMuZHVyYXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImR1cmF0aW9uIGlzIG51bGxcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoKHJlc3VtZVBvc2l0aW9uICsgMTApID4gdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgdHJhY2sgaXMgcHJldHR5IG11Y2ggY29tcGxldGUsIGxvb3AgaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMgc2hvdWxkIGFjdHVhbGx5IGhhcHBlbiBlYXJsaWVyLCB3ZSBzaG91bGQga25vdyB0aGF0IHRoZSBhY3Rpb24gd2lsbCBjYXVzZSBhIHJld2luZFxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgYW5kIGluZGljYXRlIHRoZSByZXdpbmQgdmlzdWFsbHkgc28gdGhlcmUgaXMgbm8gc3VycHJpc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzdW1lUG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU291bmQ7IHRyYWNrIG5lZWRlZCBhIHJld2luZCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiByZXN1bWUgY29tcGF0aWJpbGl0eSB3aXRoIHZhcmlvdXMgYnJvd3NlcnNcbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogc29tZXRpbWVzIHlvdSByZXN1bWUgYSBmaWxlIGFsbCB0aGUgd2F5IGF0IHRoZSBlbmQsIHNob3VsZCBsb29wIHRoZW0gYXJvdW5kXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRQb3NpdGlvbihyZXN1bWVQb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgd2hpbGVwbGF5aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb2dyZXNzID0gKHRoaXMuZHVyYXRpb24gPiAwID8gMTAwICogdGhpcy5wb3NpdGlvbiAvIHRoaXMuZHVyYXRpb24gOiAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCBwcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnBvc2l0aW9uXCIsIHRoaXMucG9zaXRpb24udG9GaXhlZCgwKSk7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc30pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9ucGF1c2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNvdW5kOyBwYXVzZWQ6IFwiICsgdGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgdmFyIHBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiA/IHRoaXMucG9zaXRpb24udG9GaXhlZCgwKSA6IDA7XG4gICAgICAgICAgICAgICAgdmFyIHByb2dyZXNzID0gKHRoaXMuZHVyYXRpb24gPiAwID8gMTAwICogcG9zaXRpb24gLyB0aGlzLmR1cmF0aW9uIDogMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cHJvZ3Jlc3NcIiwgcHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwb3NpdGlvblwiLCBwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc30pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uZmluaXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTb3VuZDsgZmluaXNoZWQgcGxheWluZzogXCIgKyB0aGlzLmlkKTtcblxuICAgICAgICAgICAgICAgIC8vIHN0b3JlIGNvbXBsZXRpb24gaW4gYnJvd3NlclxuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCAnMTAwJScpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwb3NpdGlvblwiLCB0aGlzLmR1cmF0aW9uLnRvRml4ZWQoMCkpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCh7J3Byb2dyZXNzJzogJzEwMCUnfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB1bmxvY2sgc29tZSBzb3J0IG9mIGFjaGlldmVtZW50IGZvciBmaW5pc2hpbmcgdGhpcyB0cmFjaywgbWFyayBpdCBhIGRpZmYgY29sb3IsIGV0Y1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IHRoaXMgaXMgYSBnb29kIHBsYWNlIHRvIGZpcmUgYSBob29rIHRvIGEgcGxheWJhY2sgbWFuYWdlciB0byBtb3ZlIG9udG8gdGhlIG5leHQgYXVkaW8gY2xpcFxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbn1cblxuZXhwb3J0IHsgU291bmRQbGF5ZXIsIEF1ZGlvUGxheWVyVmlldywgQXVkaW9QbGF5ZXJFdmVudHMgfTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgaGVscGVyLCBhbGlhczE9ZGVwdGgwICE9IG51bGwgPyBkZXB0aDAgOiB7fSwgYWxpYXMyPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMzPVwiZnVuY3Rpb25cIiwgYWxpYXM0PWNvbnRhaW5lci5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIHJldHVybiBcIiAgICAgICAgPGRpdiBjbGFzcz1cXFwibmF2LXJpZ2h0XFxcIj5cXG4gICAgICAgICAgICA8YSBjbGFzcz1cXFwiYnRuIGJ0bi1zdWNjZXNzXFxcIiBocmVmPVxcXCIvcmVjb3JkXFxcIj5cXG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLW1pY3JvcGhvbmVcXFwiPjwvaT5cXG4gICAgICAgICAgICA8L2E+XFxuICAgICAgICAgICAgPGEgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCIgaHJlZj1cXFwiL3UvXCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnVzZXJuYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51c2VybmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwidXNlcm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG4gICAgICAgICAgICAgICAgPGltZyBjbGFzcz1cXFwicHJvZmlsZS1waWNcXFwiIHNyYz1cXFwiL3Byb2ZpbGVfaW1hZ2VzXCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnByb2ZpbGVJbWFnZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAucHJvZmlsZUltYWdlIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMiksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMyA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJwcm9maWxlSW1hZ2VcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIi8+XFxuICAgICAgICAgICAgPC9hPlxcbiAgICAgICAgPC9kaXY+XFxuXCI7XG59LFwiM1wiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiICAgICAgICA8YSBjbGFzcz1cXFwiYnRuLXNpZ24taW5cXFwiIGhyZWY9XFxcIi9hdXRoXFxcIj5cXG4gICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtc2lnbi1pblxcXCI+PC9pPiBMb2dpbiB3aXRoIFR3aXR0ZXJcXG4gICAgICAgIDwvYT5cXG5cIjtcbn0sXCJjb21waWxlclwiOls3LFwiPj0gNC4wLjBcIl0sXCJtYWluXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxO1xuXG4gIHJldHVybiBcIjxuYXYgY2xhc3M9XFxcImhlYWRlci1uYXZcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJuYXYtbGVmdFxcXCI+XFxuICAgICAgICA8YSBjbGFzcz1cXFwid29yZG1hcmtcXFwiIGhyZWY9XFxcIi9cXFwiPlxcbiAgICAgICAgICAgIDxzdHJvbmc+Q291Y2g8L3N0cm9uZz5wb2RcXG4gICAgICAgIDwvYT5cXG4gICAgPC9kaXY+XFxuICAgIDwhLS08YSBjbGFzcz1cXFwiYnRuIGJ0bi1zcXVhcmVcXFwiIGhyZWY9XFxcIi9jaGFuZ2Vsb2dcXFwiPi0tPlxcbiAgICAgICAgPCEtLTxpbWcgY2xhc3M9XFxcImJ0bi1sb2dvXFxcIiBzcmM9XFxcIi9hc3NldHMvaW1nL2NvdWNocG9kLTMtdGlueS5wbmdcXFwiLz4tLT5cXG4gICAgPCEtLTwvYT4tLT5cXG5cXG4gICAgPGEgaHJlZj1cXFwiL2NoYW5nZWxvZ1xcXCI+XFxuICAgICAgICBOZXdzXFxuICAgIDwvYT5cXG5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzW1wiaWZcIl0uY2FsbChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMCA6IHt9LChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51c2VybmFtZSA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6Y29udGFpbmVyLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6Y29udGFpbmVyLnByb2dyYW0oMywgZGF0YSwgMCksXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiPC9uYXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL0hlYWRlck5hdlZpZXcuaGJzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIZWFkZXJOYXZWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgaW5pdGlhbGl6ZSh1c2VyKSB7XG4gICAgICAgIHRoaXMubW9kZWwgPSB1c2VyO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZW5kZXJpbmcgaGVhZGVyIG5hdiB2aWV3XCIpO1xuICAgICAgICB0aGlzLiRlbC5odG1sKHRlbXBsYXRlKHRoaXMubW9kZWwpKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdmFndWVUaW1lIGZyb20gJ3ZhZ3VlLXRpbWUnXG5pbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJ1xuaW1wb3J0IHsgQXVkaW9QbGF5ZXIgfSBmcm9tICcuL0F1ZGlvUGxheWVyVmlldy5qcydcbmltcG9ydCB7IFF1aXBNb2RlbCB9IGZyb20gJy4uL21vZGVscy9RdWlwJ1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vUmVjb3JkaW5nSXRlbS5oYnMnXG5pbXBvcnQgYXBwIGZyb20gJy4uL2FwcCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUXVpcFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBnZXQgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBxdWlwSWQ6IDAsXG4gICAgICAgICAgICBhdWRpb1BsYXllcjogbnVsbFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGV2ZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwiY2xpY2sgLnF1aXAtYWN0aW9ucyAubG9jay1pbmRpY2F0b3JcIjogXCJ0b2dnbGVQdWJsaWNcIixcbiAgICAgICAgICAgIFwiY2xpY2sgLnF1aXAtYWN0aW9ucyBhW2FjdGlvbj1kZWxldGVdXCI6IFwiZGVsZXRlXCIsXG4gICAgICAgICAgICBcImNsaWNrIC5xdWlwLXBsYXllclwiOiBcInRvZ2dsZVBsYXliYWNrXCJcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCB0YWdOYW1lKCkge1xuICAgICAgICByZXR1cm4gJ2Rpdic7XG4gICAgfVxuXG4gICAgZGVsZXRlKCkge1xuICAgICAgICB0aGlzLm1vZGVsLmRlc3Ryb3koKVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4gd2luZG93LmFwcC5yb3V0ZXIuaG9tZSgpICwgKCkgPT4gY29uc29sZS5sb2coXCJEZWxldGUgZmFpbGVkXCIpKTtcbiAgICB9XG5cbiAgICBvblBhdXNlKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlF1aXBWaWV3OyBwYXVzZWRcIik7XG5cbiAgICAgICAgJCh0aGlzLmVsKVxuICAgICAgICAgICAgLmZpbmQoJy5mYS1wYXVzZScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2ZhLXBhdXNlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnZmEtcGxheScpO1xuICAgIH1cblxuICAgIG9uUGxheSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJRdWlwVmlldzsgcGxheWluZ1wiKTtcblxuICAgICAgICAkKHRoaXMuZWwpXG4gICAgICAgICAgICAuZmluZCgnLmZhLXBsYXknKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdmYS1wbGF5JylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnZmEtcGF1c2UnKTtcbiAgICB9XG5cbiAgICBvblByb2dyZXNzKHByb2dyZXNzVXBkYXRlKSB7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsncG9zaXRpb24nOiBwcm9ncmVzc1VwZGF0ZS5wb3NpdGlvbn0pOyAvLyBzZWNcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoeydkdXJhdGlvbic6IHByb2dyZXNzVXBkYXRlLmR1cmF0aW9ufSk7IC8vIHNlY1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J3Byb2dyZXNzJzogcHJvZ3Jlc3NVcGRhdGUucHJvZ3Jlc3N9KTsgLy8gJVxuICAgICAgICB0aGlzLm1vZGVsLnRocm90dGxlZFNhdmUoKTtcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB2YXIgaWQgPSB0aGlzLm1vZGVsLmdldChcImlkXCIpO1xuXG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwiL1wiICsgaWQgKyBcIi9wYXVzZWRcIiwgKCkgPT4gdGhpcy5vblBhdXNlKCksIHRoaXMpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcIi9cIiArIGlkICsgXCIvcGxheWluZ1wiLCAoKSA9PiB0aGlzLm9uUGxheSgpLCB0aGlzKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCIvXCIgKyBpZCArIFwiL3Byb2dyZXNzXCIsICh1cGRhdGUpID0+IHRoaXMub25Qcm9ncmVzcyh1cGRhdGUpLCB0aGlzKTtcblxuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSB2aXN1YWxzIHRvIGluZGljYXRlIHBsYXliYWNrIHByb2dyZXNzXG4gICAgICAgIHRoaXMubW9kZWwub24oJ2NoYW5nZTpwcm9ncmVzcycsIChtb2RlbCwgcHJvZ3Jlc3MpID0+IHtcbiAgICAgICAgICAgICQodGhpcy5lbCkuZmluZChcIi5wcm9ncmVzcy1iYXJcIikuY3NzKFwid2lkdGhcIiwgcHJvZ3Jlc3MgKyBcIiVcIik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubW9kZWwub24oJ2NoYW5nZTppc1B1YmxpYycsIChtb2RlbCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2h1dGRvd24oKSB7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9mZihudWxsLCBudWxsLCB0aGlzKTtcbiAgICAgICAgdGhpcy5tb2RlbC5vZmYoKTtcbiAgICB9XG5cbiAgICB0b2dnbGVQdWJsaWMoZXYpIHtcbiAgICAgICAgdmFyIG5ld1N0YXRlID0gIXRoaXMubW9kZWwuZ2V0KCdpc1B1YmxpYycpO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J2lzUHVibGljJzogbmV3U3RhdGV9KTtcbiAgICAgICAgdGhpcy5tb2RlbC5zYXZlKCk7XG4gICAgfVxuXG4gICAgdG9nZ2xlUGxheWJhY2soZXZlbnQpIHtcbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcInRvZ2dsZVwiLCB0aGlzLm1vZGVsLmF0dHJpYnV0ZXMpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgdmFyIHZpZXdNb2RlbCA9IHRoaXMubW9kZWwudG9KU09OKCk7XG4gICAgICAgIHZpZXdNb2RlbC52YWd1ZVRpbWUgPSB2YWd1ZVRpbWUuZ2V0KHtmcm9tOiBuZXcgRGF0ZSgpLCB0bzogbmV3IERhdGUodGhpcy5tb2RlbC5nZXQoXCJ0aW1lc3RhbXBcIikpfSk7XG5cbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0ZW1wbGF0ZSh2aWV3TW9kZWwpKTtcblxuICAgICAgICB0aGlzLiRlbC5maW5kKFwiLnByb2dyZXNzLWJhclwiKS5jc3MoXCJ3aWR0aFwiLCB0aGlzLm1vZGVsLmdldCgncHJvZ3Jlc3MnKSArIFwiJVwiKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiICAgICAgICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLXVubG9ja1xcXCI+PC9pPiA8c3BhbiBjbGFzcz1cXFwiY2FwdGlvblxcXCI+TWFrZSBQcml2YXRlPC9zcGFuPlxcblwiO1xufSxcIjNcIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIiAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1sb2NrXFxcIj48L2k+IDxzcGFuIGNsYXNzPVxcXCJjYXB0aW9uXFxcIj5NYWtlIFB1YmxpYzwvc3Bhbj5cXG5cIjtcbn0sXCI1XCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCIgICAgICAgIDxhIGNsYXNzPVxcXCJidXR0b25cXFwiIGFjdGlvbj1cXFwiZGVsZXRlXFxcIiB0aXRsZT1cXFwiRGVsZXRlXFxcIj5cXG4gICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtcmVtb3ZlXFxcIj48L2k+IDxzcGFuIGNsYXNzPVxcXCJjYXB0aW9uXFxcIj5EZWxldGU8L3NwYW4+XFxuICAgICAgICA8L2E+XFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNyxcIj49IDQuMC4wXCJdLFwibWFpblwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMSwgaGVscGVyLCBhbGlhczE9ZGVwdGgwICE9IG51bGwgPyBkZXB0aDAgOiB7fSwgYWxpYXMyPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMzPVwiZnVuY3Rpb25cIiwgYWxpYXM0PWNvbnRhaW5lci5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcInF1aXBcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJmbGV4LXJvd1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJxdWlwLXByb2ZpbGVcXFwiPlxcbiAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJidG5cXFwiIGhyZWY9XFxcIi91L1wiXG4gICAgKyBhbGlhczQoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy51c2VybmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudXNlcm5hbWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMyKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMzID8gaGVscGVyLmNhbGwoYWxpYXMxLHtcIm5hbWVcIjpcInVzZXJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuICAgICAgICAgICAgICAgIDxpbWcgc3JjPVxcXCIvcHJvZmlsZV9pbWFnZXNcIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucHJvZmlsZUltYWdlIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5wcm9maWxlSW1hZ2UgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMyKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMzID8gaGVscGVyLmNhbGwoYWxpYXMxLHtcIm5hbWVcIjpcInByb2ZpbGVJbWFnZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiLz5cXG4gICAgICAgICAgICA8L2E+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInF1aXAtZGV0YWlsc1xcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZmxleC1yb3dcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwibmFtZVxcXCI+XCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnVzZXJuYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51c2VybmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwidXNlcm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8dGltZT5cIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudmFndWVUaW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC52YWd1ZVRpbWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMyKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMzID8gaGVscGVyLmNhbGwoYWxpYXMxLHtcIm5hbWVcIjpcInZhZ3VlVGltZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCI8L3RpbWU+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwidGV4dFxcXCI+XCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmRlc2NyaXB0aW9uIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5kZXNjcmlwdGlvbiA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwiZGVzY3JpcHRpb25cIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcInF1aXAtcGxheWVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInByb2dyZXNzLWJhclxcXCI+PC9kaXY+XFxuICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtcGxheVxcXCI+PC9pPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicXVpcC1hY3Rpb25zXFxcIj5cXG4gICAgICAgIDxhIGNsYXNzPVxcXCJidXR0b25cXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczQoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5wdWJsaWNVcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnB1YmxpY1VybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwicHVibGljVXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgdGl0bGU9XFxcIlNoYXJlXFxcIj5cXG4gICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtc2hhcmUtc3F1YXJlLW9cXFwiPjwvaT4gPHNwYW4gY2xhc3M9XFxcImNhcHRpb25cXFwiPlNoYXJlPC9zcGFuPlxcbiAgICAgICAgPC9hPlxcbiAgICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvbiBsb2NrLWluZGljYXRvclxcXCIgdGl0bGU9XFxcIlRvZ2dsZSB2aXNpYmlsaXR5XFxcIj5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzW1wiaWZcIl0uY2FsbChhbGlhczEsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlzUHVibGljIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjpjb250YWluZXIucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjpjb250YWluZXIucHJvZ3JhbSgzLCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCIgICAgICAgIDwvYT5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzW1wiaWZcIl0uY2FsbChhbGlhczEsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlzTWluZSA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6Y29udGFpbmVyLnByb2dyYW0oNSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6Y29udGFpbmVyLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBQb2x5ZmlsbCB7XG4gICAgc3RhdGljIGluc3RhbGwoKSB7XG4gICAgICAgIHdpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQgfHwgZmFsc2U7XG4gICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWEgfHwgZmFsc2U7XG5cbiAgICAgICAgaWYgKG5hdmlnYXRvci5tZWRpYURldmljZSA9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInBvbHlmaWxsaW5nIG1lZGlhRGV2aWNlLmdldFVzZXJNZWRpYVwiKTtcblxuICAgICAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlID0ge1xuICAgICAgICAgICAgICAgIGdldFVzZXJNZWRpYTogKHByb3BzKSA9PiBuZXcgUHJvbWlzZSgoeSwgbikgPT4gbmF2aWdhdG9yLmdldFVzZXJNZWRpYShwcm9wcywgeSwgbikpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5hdmlnYXRvci5nZXRVc2VyTWVkaWEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJBdWRpb0NhcHR1cmU6OnBvbHlmaWxsKCk7IGdldFVzZXJNZWRpYSgpIG5vdCBzdXBwb3J0ZWQuXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgUHJlc2VudGVyIHtcbiAgICBzaG93SGVhZGVyTmF2KHZpZXcpIHtcbiAgICAgICAgJChcImJvZHkgPiBoZWFkZXJcIikuYXBwZW5kKHZpZXcuZWwpO1xuICAgIH1cblxuICAgIHN3aXRjaFZpZXcobmV3Vmlldykge1xuICAgICAgICBpZih0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgIHZhciBvbGRWaWV3ID0gdGhpcy52aWV3O1xuICAgICAgICAgICAgb2xkVmlldy4kZWwucmVtb3ZlQ2xhc3MoXCJ0cmFuc2l0aW9uLWluXCIpO1xuICAgICAgICAgICAgb2xkVmlldy4kZWwuYWRkQ2xhc3MoXCJ0cmFuc2l0aW9uLW91dFwiKTtcbiAgICAgICAgICAgIG9sZFZpZXcuJGVsLm9uZShcImFuaW1hdGlvbmVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgb2xkVmlldy5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBvbGRWaWV3LnVuYmluZCgpO1xuICAgICAgICAgICAgICAgIGlmKG9sZFZpZXcuc2h1dGRvd24gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBvbGRWaWV3LnNodXRkb3duKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdWaWV3LiRlbC5hZGRDbGFzcyhcInRyYW5zaXRpb25hYmxlIHRyYW5zaXRpb24taW5cIik7XG4gICAgICAgIG5ld1ZpZXcuJGVsLm9uZShcImFuaW1hdGlvbmVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICBuZXdWaWV3LiRlbC5yZW1vdmVDbGFzcyhcInRyYW5zaXRpb24taW5cIik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyN2aWV3LWNvbnRhaW5lcicpLmFwcGVuZChuZXdWaWV3LmVsKTtcbiAgICAgICAgdGhpcy52aWV3ID0gbmV3VmlldztcbiAgICB9XG59XG5cbmV4cG9ydCBsZXQgUm9vdFByZXNlbnRlciA9IG5ldyBQcmVzZW50ZXIoKTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCAqIGFzIENvbnRyb2xsZXJzIGZyb20gJy4vcGFnZXMvQ29udHJvbGxlcnMnXG5pbXBvcnQgSGVhZGVyTmF2VmlldyBmcm9tICcuL3BhcnRpYWxzL0hlYWRlck5hdlZpZXcnXG5pbXBvcnQgeyBSb290UHJlc2VudGVyIH0gZnJvbSAnLi9wcmVzZW50ZXInXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlciB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKHtcbiAgICAgICAgICAgIHJvdXRlczoge1xuICAgICAgICAgICAgICAgICcnOiAnaG9tZScsXG4gICAgICAgICAgICAgICAgJ3JlY29yZCc6ICdyZWNvcmQnLFxuICAgICAgICAgICAgICAgICd1Lzp1c2VybmFtZSc6ICd1c2VyJyxcbiAgICAgICAgICAgICAgICAnY2hhbmdlbG9nJzogJ2NoYW5nZWxvZycsXG4gICAgICAgICAgICAgICAgJ3EvOnF1aXBpZCc6ICdzaW5nbGVfaXRlbScsXG4gICAgICAgICAgICAgICAgJ3N0cmVhbXMnOiAnbGlzdF9zdHJlYW1zJyxcbiAgICAgICAgICAgICAgICAnc3RyZWFtcy86aWQnOiAnc3RyZWFtX2RldGFpbHMnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHNldFVzZXIodXNlcikge1xuICAgICAgICBSb290UHJlc2VudGVyLnNob3dIZWFkZXJOYXYobmV3IEhlYWRlck5hdlZpZXcodXNlcikpXG4gICAgfVxuXG4gICAgc2luZ2xlX2l0ZW0oaWQpIHtcbiAgICAgICAgbmV3IENvbnRyb2xsZXJzLlNpbmdsZVBvZENvbnRyb2xsZXIoUm9vdFByZXNlbnRlciwgaWQpO1xuICAgIH1cblxuICAgIGhvbWUoKSB7XG4gICAgICAgIG5ldyBDb250cm9sbGVycy5Ib21lQ29udHJvbGxlcihSb290UHJlc2VudGVyKTtcbiAgICB9XG5cbiAgICB1c2VyKHVzZXJuYW1lKSB7XG4gICAgICAgIG5ldyBDb250cm9sbGVycy5Vc2VyQ29udHJvbGxlcihSb290UHJlc2VudGVyLCB1c2VybmFtZSk7XG4gICAgfVxuXG4gICAgY2hhbmdlbG9nKCkge1xuICAgICAgICBuZXcgQ29udHJvbGxlcnMuQ2hhbmdlbG9nQ29udHJvbGxlcihSb290UHJlc2VudGVyKTtcbiAgICB9XG5cbiAgICByZWNvcmQoKSB7XG4gICAgICAgIG5ldyBDb250cm9sbGVycy5SZWNvcmRlckNvbnRyb2xsZXIoUm9vdFByZXNlbnRlcik7XG4gICAgfVxuXG4gICAgbGlzdF9zdHJlYW1zKCkge1xuICAgICAgICB2YXIgY29udHJvbGxlciA9IG5ldyBDb250cm9sbGVycy5TdHJlYW1Db250cm9sbGVyKFJvb3RQcmVzZW50ZXIpO1xuICAgICAgICBjb250cm9sbGVyLmNyZWF0ZSgpO1xuICAgIH1cblxuICAgIHN0cmVhbV9kZXRhaWxzKGlkKSB7XG4gICAgICAgIHZhciBjb250cm9sbGVyID0gbmV3IENvbnRyb2xsZXJzLlN0cmVhbUNvbnRyb2xsZXIoUm9vdFByZXNlbnRlcik7XG4gICAgICAgIGNvbnRyb2xsZXIuZGV0YWlscyhpZCk7XG4gICAgfVxufVxuIl19
