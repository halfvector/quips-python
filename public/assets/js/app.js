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

},{"./models/CurrentUser":25,"./partials/AudioPlayerView":47,"./polyfill.js":52,"./router":54,"backbone":"backbone","jquery":"jquery"}],23:[function(require,module,exports){
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

},{"./Recorder/RecorderController":35,"./Streams/StreamController.js":38,"./Views":46}],30:[function(require,module,exports){
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
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<div class=\"m-stream-details\">\n    <h1>Stream Details</h1>\n</div>\n<div class=\"g-quips-list\">\n</div>\n";
},"useData":true});

},{"hbsfy/runtime":21}],34:[function(require,module,exports){
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

var _HomepageHbs = require('./Homepage.hbs');

var _HomepageHbs2 = _interopRequireDefault(_HomepageHbs);

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
    }, {
        key: 'render',
        value: function render() {
            this.$el.html((0, _HomepageHbs2['default'])());
        }
    }]);

    return HomepageView;
})(_backbone2['default'].View);

exports['default'] = HomepageView;
module.exports = exports['default'];

},{"../../models/Quip":26,"../../partials/AudioPlayerView":47,"../../partials/QuipView.js":50,"./Homepage.hbs":33,"backbone":"backbone"}],35:[function(require,module,exports){
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

},{"../GetMicrophone/GetMicrophoneView":31,"../GetMicrophone/MicrophonePermissions":32,"./RecorderView":37}],36:[function(require,module,exports){
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

},{"hbsfy/runtime":21}],37:[function(require,module,exports){
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

},{"../../audio-capture":23,"../../models/CreateRecordingModel":24,"../../partials/QuipView.js":50,"./RecorderView.hbs":36,"backbone":"backbone","underscore":"underscore"}],38:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _StreamList = require('./StreamList');

var _StreamList2 = _interopRequireDefault(_StreamList);

var _StreamDetails = require('./StreamDetails');

var _StreamDetails2 = _interopRequireDefault(_StreamDetails);

var StreamController = (function () {
    function StreamController(presenter) {
        _classCallCheck(this, StreamController);

        this.presenter = presenter;
    }

    _createClass(StreamController, [{
        key: 'list_streams',
        value: function list_streams() {
            this.presenter.switchView(new _StreamList2['default']());
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

},{"./StreamDetails":40,"./StreamList":42}],39:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"dup":33,"hbsfy/runtime":21}],40:[function(require,module,exports){
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

},{"../../models/Quip":26,"../../partials/QuipView.js":50,"./StreamDetails.hbs":39,"backbone":"backbone","backbone-bindings":1,"backbone.epoxy":"backbone.epoxy"}],41:[function(require,module,exports){
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
    var stack1;

  return "<!-- TODO: create your first stream -->\n\n<div class=\"m-create-stream\">\n    <form>\n        <input class=\"field\" type=\"text\" name=\"name\" placeholder=\"Stream Name\" />\n\n        <h3>Privacy</h3>\n\n        <label for=\"privacy-public\">\n            <input id=\"privacy-public\" type=\"radio\" name=\"isPublic\" value=\"True\" checked/>\n            <b>Public</b> - Anyone can follow this stream\n        </label>\n        <br>\n        <label for=\"privacy-private\">\n            <input id=\"privacy-private\" type=\"radio\" name=\"isPublic\" value=\"False\"/>\n            <b>Private</b> - Only those you invite can follow this stream.\n        </label>\n        <br>\n        <br>\n\n        <button class=\"square-btn btn-success\" name=\"submit\">Create</button>\n    </form>\n</div>\n\n<div class=\"m-list-streams\">\n    <h3>Streams</h3>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.streams : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"useData":true});

},{"hbsfy/runtime":21}],42:[function(require,module,exports){
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

var _StreamListHbs = require('./StreamList.hbs');

var _StreamListHbs2 = _interopRequireDefault(_StreamListHbs);

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
                name: "",
                description: "",
                isPublic: true
            };
        }
    }, {
        key: 'initialize',
        value: function initialize() {
            this.urlRoot = "/api/streams";
        }
    }, {
        key: 'computeds',
        get: function get() {
            return {
                canSubmit: function canSubmit() {
                    return this.get('name') != "";
                }
            };
        }
    }]);

    return StreamModel;
})(_backbone2['default'].Model);

var StreamList = (function (_Backbone$Epoxy$View) {
    _inherits(StreamList, _Backbone$Epoxy$View);

    function StreamList() {
        _classCallCheck(this, StreamList);

        _get(Object.getPrototypeOf(StreamList.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(StreamList, [{
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
            this.model.save();

            return false;
        }
    }, {
        key: 'render',
        value: function render() {
            this.$el.html((0, _StreamListHbs2['default'])(this.model.attributes));
        }
    }, {
        key: 'bindings',
        get: function get() {
            return {
                "[name=name]": "value:name",
                "[name=isPublic]": "checked:isPublic"
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

    return StreamList;
})(_backbone2['default'].Epoxy.View);

exports['default'] = StreamList;
module.exports = exports['default'];

},{"./StreamList.hbs":41,"backbone":"backbone","backbone-bindings":1,"backbone.epoxy":"backbone.epoxy"}],43:[function(require,module,exports){
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<div class=\"m-stream-details\">\n    <h1>"
    + container.escapeExpression(((helper = (helper = helpers.username || (depth0 != null ? depth0.username : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"username","hash":{},"data":data}) : helper)))
    + "'s Stream</h1>\n</div>\n<div class=\"g-quips-list\">\n</div>\n";
},"useData":true});

},{"hbsfy/runtime":21}],44:[function(require,module,exports){
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

},{"../../models/Quip":26,"../Views":46,"./UserAllRecordings.hbs":43,"backbone":"backbone"}],45:[function(require,module,exports){
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

},{"../../models/Quip":26,"../Views":46,"backbone":"backbone"}],46:[function(require,module,exports){
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

},{"../partials/AudioPlayerView":47,"../partials/HeaderNavView":49,"../partials/QuipView":50,"./Changelog/ChangelogView":28,"./GetMicrophone/GetMicrophoneView":31,"./Homepage/HomepageView":34,"./Recorder/RecorderView":37,"./User/UserAllRecordingsView":44,"./User/UserSingleRecordingView":45}],47:[function(require,module,exports){
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

},{"backbone":"backbone","underscore":"underscore"}],48:[function(require,module,exports){
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

},{"hbsfy/runtime":21}],49:[function(require,module,exports){
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

},{"./HeaderNavView.hbs":48,"backbone":"backbone"}],50:[function(require,module,exports){
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

},{"../app":22,"../models/Quip":26,"./AudioPlayerView.js":47,"./RecordingItem.hbs":51,"backbone":"backbone","underscore":"underscore","vague-time":"vague-time"}],51:[function(require,module,exports){
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

},{"hbsfy/runtime":21}],52:[function(require,module,exports){
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

},{}],53:[function(require,module,exports){
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

},{}],54:[function(require,module,exports){
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
            controller.list_streams();
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

},{"./pages/Controllers":29,"./partials/HeaderNavView":49,"./presenter":53,"backbone":"backbone"}]},{},[22])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmFja2JvbmUtYmluZGluZ3MvYmFja2JvbmUtYmluZGluZ3MuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy5ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2RlY29yYXRvcnMuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9kZWNvcmF0b3JzL2lubGluZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2V4Y2VwdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9oZWxwZXJzL2Jsb2NrLWhlbHBlci1taXNzaW5nLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvaGVscGVycy9lYWNoLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvaGVscGVycy9oZWxwZXItbWlzc2luZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMvaWYuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9oZWxwZXJzL2xvZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMvbG9va3VwLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvaGVscGVycy93aXRoLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvbG9nZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9uby1jb25mbGljdC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9zYWZlLXN0cmluZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwiL1VzZXJzL2FsZWNrei9kZXYvcXVpcHMtcHl0aG9uL3NwYS9hcHAuanMiLCIvVXNlcnMvYWxlY2t6L2Rldi9xdWlwcy1weXRob24vc3BhL2F1ZGlvLWNhcHR1cmUuanMiLCIvVXNlcnMvYWxlY2t6L2Rldi9xdWlwcy1weXRob24vc3BhL21vZGVscy9DcmVhdGVSZWNvcmRpbmdNb2RlbC5qcyIsIi9Vc2Vycy9hbGVja3ovZGV2L3F1aXBzLXB5dGhvbi9zcGEvbW9kZWxzL0N1cnJlbnRVc2VyLmpzIiwiL1VzZXJzL2FsZWNrei9kZXYvcXVpcHMtcHl0aG9uL3NwYS9tb2RlbHMvUXVpcC5qcyIsInNwYS9wYWdlcy9DaGFuZ2Vsb2cvQ2hhbmdlbG9nVmlldy5oYnMiLCIvVXNlcnMvYWxlY2t6L2Rldi9xdWlwcy1weXRob24vc3BhL3BhZ2VzL0NoYW5nZWxvZy9DaGFuZ2Vsb2dWaWV3LmpzIiwiL1VzZXJzL2FsZWNrei9kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9Db250cm9sbGVycy5qcyIsInNwYS9wYWdlcy9HZXRNaWNyb3Bob25lL0dldE1pY3JvcGhvbmUuaGJzIiwiL1VzZXJzL2FsZWNrei9kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9HZXRNaWNyb3Bob25lL0dldE1pY3JvcGhvbmVWaWV3LmpzIiwiL1VzZXJzL2FsZWNrei9kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9HZXRNaWNyb3Bob25lL01pY3JvcGhvbmVQZXJtaXNzaW9ucy5qcyIsInNwYS9wYWdlcy9Ib21lcGFnZS9Ib21lcGFnZS5oYnMiLCIvVXNlcnMvYWxlY2t6L2Rldi9xdWlwcy1weXRob24vc3BhL3BhZ2VzL0hvbWVwYWdlL0hvbWVwYWdlVmlldy5qcyIsIi9Vc2Vycy9hbGVja3ovZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvUmVjb3JkZXIvUmVjb3JkZXJDb250cm9sbGVyLmpzIiwic3BhL3BhZ2VzL1JlY29yZGVyL1JlY29yZGVyVmlldy5oYnMiLCIvVXNlcnMvYWxlY2t6L2Rldi9xdWlwcy1weXRob24vc3BhL3BhZ2VzL1JlY29yZGVyL1JlY29yZGVyVmlldy5qcyIsIi9Vc2Vycy9hbGVja3ovZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvU3RyZWFtcy9TdHJlYW1Db250cm9sbGVyLmpzIiwiL1VzZXJzL2FsZWNrei9kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9TdHJlYW1zL1N0cmVhbURldGFpbHMuanMiLCJzcGEvcGFnZXMvU3RyZWFtcy9TdHJlYW1MaXN0LmhicyIsIi9Vc2Vycy9hbGVja3ovZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvU3RyZWFtcy9TdHJlYW1MaXN0LmpzIiwic3BhL3BhZ2VzL1VzZXIvVXNlckFsbFJlY29yZGluZ3MuaGJzIiwiL1VzZXJzL2FsZWNrei9kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9Vc2VyL1VzZXJBbGxSZWNvcmRpbmdzVmlldy5qcyIsIi9Vc2Vycy9hbGVja3ovZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvVXNlci9Vc2VyU2luZ2xlUmVjb3JkaW5nVmlldy5qcyIsIi9Vc2Vycy9hbGVja3ovZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvVmlld3MuanMiLCIvVXNlcnMvYWxlY2t6L2Rldi9xdWlwcy1weXRob24vc3BhL3BhcnRpYWxzL0F1ZGlvUGxheWVyVmlldy5qcyIsInNwYS9wYXJ0aWFscy9IZWFkZXJOYXZWaWV3LmhicyIsIi9Vc2Vycy9hbGVja3ovZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFydGlhbHMvSGVhZGVyTmF2Vmlldy5qcyIsIi9Vc2Vycy9hbGVja3ovZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFydGlhbHMvUXVpcFZpZXcuanMiLCJzcGEvcGFydGlhbHMvUmVjb3JkaW5nSXRlbS5oYnMiLCIvVXNlcnMvYWxlY2t6L2Rldi9xdWlwcy1weXRob24vc3BhL3BvbHlmaWxsLmpzIiwiL1VzZXJzL2FsZWNrei9kZXYvcXVpcHMtcHl0aG9uL3NwYS9wcmVzZW50ZXIuanMiLCIvVXNlcnMvYWxlY2t6L2Rldi9xdWlwcy1weXRob24vc3BhL3JvdXRlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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LEdBQUcsSUFBSSxXQUFXLENBQUMsZ0JBQWdCLDBCQUFlLENBQUM7QUFDakUsc0JBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDMUI7OztXQS9DZ0IsTUFBTTtHQUFTLHNCQUFTLE1BQU07O3FCQUE5QixNQUFNIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJylcbnZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpXG5cbnZhciBiaW5kaW5nU3BsaXR0ZXIgPSAvXihcXFMrKVxccyooLiopJC87XG5cbl8uZXh0ZW5kKEJhY2tib25lLlZpZXcucHJvdG90eXBlLCB7XG4gICAgYmluZE1vZGVsOiBmdW5jdGlvbihiaW5kaW5ncykge1xuICAgICAgICAvLyBCaW5kaW5ncyBjYW4gYmUgZGVmaW5lZCB0aHJlZSBkaWZmZXJlbnQgd2F5cy4gSXQgY2FuIGJlXG4gICAgICAgIC8vIGRlZmluZWQgb24gdGhlIHZpZXcgYXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHVuZGVyIHRoZSBrZXlcbiAgICAgICAgLy8gJ2JpbmRpbmdzJywgb3IgYXMgYW4gb2JqZWN0IHBhc3NlZCB0byBiaW5kTW9kZWwuXG4gICAgICAgIGJpbmRpbmdzID0gYmluZGluZ3MgfHwgZ2V0VmFsdWUodGhpcywgJ2JpbmRpbmdzJyk7XG5cbiAgICAgICAgLy8gU2tpcCBpZiBubyBiaW5kaW5ncyBjYW4gYmUgZm91bmQgb3IgaWYgdGhlIHZpZXcgaGFzIG5vIG1vZGVsLlxuICAgICAgICBpZiAoIWJpbmRpbmdzIHx8ICF0aGlzLm1vZGVsKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcHJpdmF0ZSBiaW5kaW5ncyBtYXAgaWYgaXQgZG9lc24ndCBleGlzdC5cbiAgICAgICAgdGhpcy5fYmluZGluZ3MgPSB0aGlzLl9iaW5kaW5ncyB8fCB7fTtcblxuICAgICAgICAvLyBDbGVhciBhbnkgcHJldmlvdXMgYmluZGluZ3MgZm9yIHZpZXcuXG4gICAgICAgIHRoaXMudW5iaW5kTW9kZWwoKTtcblxuICAgICAgICBfLmVhY2goYmluZGluZ3MsIGZ1bmN0aW9uKGF0dHJpYnV0ZSwgYmluZGluZykge1xuICAgICAgICAgICAgaWYgKCFfLmlzQXJyYXkoYXR0cmlidXRlKSlcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGUgPSBbYXR0cmlidXRlLCBbbnVsbCwgbnVsbF1dO1xuXG4gICAgICAgICAgICBpZiAoIV8uaXNBcnJheShhdHRyaWJ1dGVbMV0pKVxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZVsxXSA9IFthdHRyaWJ1dGVbMV0sIG51bGxdO1xuXG4gICAgICAgICAgICAvLyBDaGVjayB0byBzZWUgaWYgYSBiaW5kaW5nIGlzIGFscmVhZHkgYm91bmQgdG8gYW5vdGhlciBhdHRyaWJ1dGUuXG4gICAgICAgICAgICBpZiAodGhpcy5fYmluZGluZ3NbYmluZGluZ10pXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiJ1wiICsgYmluZGluZyArIFwiJyBpcyBhbHJlYWR5IGJvdW5kIHRvICdcIiArIGF0dHJpYnV0ZVswXSArIFwiJy5cIik7XG5cbiAgICAgICAgICAgIC8vIFNwbGl0IGJpbmRpbmdzIGp1c3QgbGlrZSBCYWNrYm9uZS5WaWV3LmV2ZW50cyB3aGVyZSB0aGUgZmlyc3QgaGFsZlxuICAgICAgICAgICAgLy8gaXMgdGhlIHByb3BlcnR5IHlvdSB3YW50IHRvIGJpbmQgdG8gYW5kIHRoZSByZW1haW5kZXIgaXMgdGhlIHNlbGVjdG9yXG4gICAgICAgICAgICAvLyBmb3IgdGhlIGVsZW1lbnQgaW4gdGhlIHZpZXcgdGhhdCBwcm9wZXJ0eSBpcyBmb3IuXG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBiaW5kaW5nLm1hdGNoKGJpbmRpbmdTcGxpdHRlciksXG4gICAgICAgICAgICAgICAgcHJvcGVydHkgPSBtYXRjaFsxXSxcbiAgICAgICAgICAgICAgICBzZWxlY3RvciA9IG1hdGNoWzJdLFxuICAgICAgICAgICAgICAgIC8vIEZpbmQgZWxlbWVudCBpbiB2aWV3IGZvciBiaW5kaW5nLiBJZiB0aGVyZSBpcyBubyBzZWxlY3RvclxuICAgICAgICAgICAgICAgIC8vIHVzZSB0aGUgdmlldydzIGVsLlxuICAgICAgICAgICAgICAgIGVsID0gKHNlbGVjdG9yKSA/IHRoaXMuJChzZWxlY3RvcikgOiB0aGlzLiRlbCxcbiAgICAgICAgICAgICAgICAvLyBGaW5kZXIgYmluZGVyIGRlZmluaXRpb24gZm9yIGJpbmRpbmcgYnkgcHJvcGVydHkuIElmIGl0IGNhbid0IGJlIGZvdW5kXG4gICAgICAgICAgICAgICAgLy8gZGVmYXVsdCB0byBwcm9wZXJ0eSAnYXR0cicuXG4gICAgICAgICAgICAgICAgYmluZGVyID0gQmFja2JvbmUuVmlldy5CaW5kZXJzW3Byb3BlcnR5XSB8fCBCYWNrYm9uZS5WaWV3LkJpbmRlcnNbJ19fYXR0cl9fJ10sXG4gICAgICAgICAgICAgICAgLy8gRmV0Y2ggYWNjZXNzb3JzIGZyb20gYmluZGVyLiBUaGUgY29udGV4dCBvZiB0aGUgYmluZGVyIGlzIHRoZSB2aWV3XG4gICAgICAgICAgICAgICAgLy8gYW5kIGJpbmRlciBzaG91bGQgcmV0dXJuIGFuIG9iamVjdCB0aGF0IGhhcyAnc2V0JyBhbmQgb3IgJ2dldCcga2V5cy5cbiAgICAgICAgICAgICAgICAvLyAnc2V0JyBtdXN0IGJlIGEgZnVuY3Rpb24gYW5kIGhhcyBvbmUgYXJndW1lbnQuIGBnZXRgIGNhbiBlaXRoZXIgYmVcbiAgICAgICAgICAgICAgICAvLyBhIGZ1bmN0aW9uIG9yIGEgbGlzdCBbZXZlbnRzLCBmdW5jdGlvbl0gLlRoZSBjb250ZXh0IG9mIGJvdGggc2V0IGFuZFxuICAgICAgICAgICAgICAgIC8vIGdldCBpcyB0aGUgdmlld3MncyAkZWwuXG4gICAgICAgICAgICAgICAgYWNjZXNzb3JzID0gYmluZGVyLmNhbGwodGhpcywgdGhpcy5tb2RlbCwgYXR0cmlidXRlWzBdLCBwcm9wZXJ0eSk7XG5cbiAgICAgICAgICAgIGlmICghYWNjZXNzb3JzKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgLy8gTm9ybWFsaXplIGdldCBhY2Nlc3NvcnMgaWYgb25seSBhIGZ1bmN0aW9uIHdhcyBwcm92aWRlZC4gSWYgbm9cbiAgICAgICAgICAgIC8vIGV2ZW50cyB3ZXJlIHByb3ZpZGVkIGRlZmF1bHQgdG8gb24gJ2NoYW5nZScuXG4gICAgICAgICAgICBpZiAoIV8uaXNBcnJheShhY2Nlc3NvcnMuZ2V0KSlcbiAgICAgICAgICAgICAgICBhY2Nlc3NvcnMuZ2V0ID0gWydjaGFuZ2UnLCBhY2Nlc3NvcnMuZ2V0XTtcblxuICAgICAgICAgICAgaWYgKCFhY2Nlc3NvcnMuZ2V0WzFdICYmICFhY2Nlc3NvcnMuc2V0KVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgLy8gRXZlbnQga2V5IGZvciBtb2RlbCBhdHRyaWJ1dGUgY2hhbmdlcy5cbiAgICAgICAgICAgIHZhciBzZXRUcmlnZ2VyID0gJ2NoYW5nZTonICsgYXR0cmlidXRlWzBdLFxuICAgICAgICAgICAgICAgIC8vIEV2ZW50IGtleXMgZm9yIHZpZXcuJGVsIG5hbWVzcGFjZWQgdG8gdGhlIHZpZXcgZm9yIHVuYmluZGluZy5cbiAgICAgICAgICAgICAgICBnZXRUcmlnZ2VyID0gXy5yZWR1Y2UoYWNjZXNzb3JzLmdldFswXS5zcGxpdCgnICcpLCBmdW5jdGlvbihtZW1vLCBldmVudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbWVtbyArICcgJyArIGV2ZW50ICsgJy5tb2RlbEJpbmRpbmcnICsgdGhpcy5jaWQ7XG4gICAgICAgICAgICAgICAgfSwgJycsIHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBEZWZhdWx0IHRvIGlkZW50aXR5IHRyYW5zZm9ybWVyIGlmIG5vdCBwcm92aWRlZCBmb3IgYXR0cmlidXRlLlxuICAgICAgICAgICAgdmFyIHNldFRyYW5zZm9ybWVyID0gYXR0cmlidXRlWzFdWzBdIHx8IGlkZW50aXR5VHJhbnNmb3JtZXIsXG4gICAgICAgICAgICAgICAgZ2V0VHJhbnNmb3JtZXIgPSBhdHRyaWJ1dGVbMV1bMV0gfHwgaWRlbnRpdHlUcmFuc2Zvcm1lcjtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGdldCBhbmQgc2V0IGNhbGxiYWNrcyBzbyB0aGF0IHdlIGNhbiByZWZlcmVuY2UgdGhlIGZ1bmN0aW9uc1xuICAgICAgICAgICAgLy8gd2hlbiBpdCdzIHRpbWUgdG8gdW5iaW5kLiAnc2V0JyBmb3IgYmluZGluZyB0byB0aGUgbW9kZWwgZXZlbnRzLi4uXG4gICAgICAgICAgICB2YXIgc2V0ID0gXy5iaW5kKGZ1bmN0aW9uKG1vZGVsLCB2YWx1ZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIC8vIFNraXAgaWYgdGhpcyBjYWxsYmFjayB3YXMgYm91bmQgdG8gdGhlIGVsZW1lbnQgdGhhdFxuICAgICAgICAgICAgICAgIC8vIHRyaWdnZXJlZCB0aGUgY2FsbGJhY2suXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5lbCAmJiBvcHRpb25zLmVsLmdldCgwKSA9PSBlbC5nZXQoMCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgcHJvcGVydHkgdmFsdWUgZm9yIHRoZSBiaW5kZXIncyBlbGVtZW50LlxuICAgICAgICAgICAgICAgIGFjY2Vzc29ycy5zZXQuY2FsbChlbCwgc2V0VHJhbnNmb3JtZXIuY2FsbCh0aGlzLCB2YWx1ZSkpO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgICAgIC8vIC4uLmFuZCAnZ2V0JyBjYWxsYmFjayBmb3IgYmluZGluZyB0byBET00gZXZlbnRzLlxuICAgICAgICAgICAgdmFyIGdldCA9IF8uYmluZChmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgcHJvcGVydHkgdmFsdWUgZnJvbSB0aGUgYmluZGVyJ3MgZWxlbWVudC5cbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhhdHRyaWJ1dGVbMF0sIGdldFRyYW5zZm9ybWVyKTtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBnZXRUcmFuc2Zvcm1lci5jYWxsKHRoaXMsIGFjY2Vzc29ycy5nZXRbMV0uY2FsbChlbCkpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoYXR0cmlidXRlWzBdLCB2YWx1ZSwge1xuICAgICAgICAgICAgICAgICAgICBlbDogdGhpcy4kKGV2ZW50LnNyY0VsZW1lbnQpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICAgICAgaWYgKGFjY2Vzc29ycy5zZXQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLm9uKHNldFRyaWdnZXIsIHNldCk7XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgaW5pdGlhbCBzZXQgY2FsbGJhY2sgbWFudWFsbHkgc28gdGhhdCB0aGUgdmlldyBpcyB1cFxuICAgICAgICAgICAgICAgIC8vIHRvIGRhdGUgd2l0aCB0aGUgbW9kZWwgYm91bmQgdG8gaXQuXG4gICAgICAgICAgICAgICAgc2V0KHRoaXMubW9kZWwsIHRoaXMubW9kZWwuZ2V0KGF0dHJpYnV0ZVswXSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYWNjZXNzb3JzLmdldFsxXSlcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5vbihnZXRUcmlnZ2VyLCBzZWxlY3RvciwgZ2V0KTtcblxuICAgICAgICAgICAgLy8gU2F2ZSBhIHJlZmVyZW5jZSB0byBiaW5kaW5nIHNvIHRoYXQgd2UgY2FuIHVuYmluZCBpdCBsYXRlci5cbiAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzW2JpbmRpbmddID0ge1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICAgICAgICAgICAgICBnZXRUcmlnZ2VyOiBnZXRUcmlnZ2VyLFxuICAgICAgICAgICAgICAgIHNldFRyaWdnZXI6IHNldFRyaWdnZXIsXG4gICAgICAgICAgICAgICAgZ2V0OiBnZXQsXG4gICAgICAgICAgICAgICAgc2V0OiBzZXRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgdW5iaW5kTW9kZWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTa2lwIGlmIHZpZXcgaGFzIGJlZW4gYm91bmQgb3IgZG9lc24ndCBoYXZlIGEgbW9kZWwuXG4gICAgICAgIGlmICghdGhpcy5fYmluZGluZ3MgfHwgIXRoaXMubW9kZWwpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgXy5lYWNoKHRoaXMuX2JpbmRpbmdzLCBmdW5jdGlvbihiaW5kaW5nLCBrZXkpIHtcbiAgICAgICAgICAgIGlmIChiaW5kaW5nLmdldFsxXSlcbiAgICAgICAgICAgICAgICB0aGlzLiRlbC5vZmYoYmluZGluZy5nZXRUcmlnZ2VyLCBiaW5kaW5nLnNlbGVjdG9yKTtcblxuICAgICAgICAgICAgaWYgKGJpbmRpbmcuc2V0KVxuICAgICAgICAgICAgICAgIHRoaXMubW9kZWwub2ZmKGJpbmRpbmcuc2V0VHJpZ2dlciwgYmluZGluZy5zZXQpO1xuXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYmluZGluZ3Nba2V5XTtcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufSk7XG5cbkJhY2tib25lLlZpZXcuQmluZGVycyA9IHtcbiAgICAndmFsdWUnOiBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlLCBwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0OiBbJ2NoYW5nZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbCgpO1xuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52YWwodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgJ3RleHQnOiBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlLCBwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZ2V0OiBbJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRleHQoKTtcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMudGV4dCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcbiAgICAnaHRtbCc6IGZ1bmN0aW9uKG1vZGVsLCBhdHRyaWJ1dGUsIHByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnZXQ6IFsnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaHRtbCgpO1xuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9LFxuICAgICdjbGFzcyc6IGZ1bmN0aW9uKG1vZGVsLCBhdHRyaWJ1dGUsIHByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3ByZXZpb3VzQ2xhc3MpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3ModGhpcy5fcHJldmlvdXNDbGFzcyk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmFkZENsYXNzKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2aW91c0NsYXNzID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcbiAgICAnY2hlY2tlZCc6IGZ1bmN0aW9uKG1vZGVsLCBhdHRyaWJ1dGUsIHByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBnZXQ6IFsnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvcCgnY2hlY2tlZCcpO1xuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9wKCdjaGVja2VkJywgISF2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcbiAgICAnX19hdHRyX18nOiBmdW5jdGlvbihtb2RlbCwgYXR0cmlidXRlLCBwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXR0cihwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbn07XG5cbnZhciBpZGVudGl0eVRyYW5zZm9ybWVyID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG4vLyBIZWxwZXIgZnVuY3Rpb24gZnJvbSBCYWNrYm9uZSB0byBnZXQgYSB2YWx1ZSBmcm9tIGEgQmFja2JvbmVcbi8vIG9iamVjdCBhcyBhIHByb3BlcnR5IG9yIGFzIGEgZnVuY3Rpb24uXG52YXIgZ2V0VmFsdWUgPSBmdW5jdGlvbihvYmplY3QsIHByb3ApIHtcbiAgICBpZiAoKG9iamVjdCAmJiBvYmplY3RbcHJvcF0pKVxuICAgICAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKG9iamVjdFtwcm9wXSkgPyBvYmplY3RbcHJvcF0oKSA6IG9iamVjdFtwcm9wXTtcbn07IiwiaW1wb3J0ICogYXMgYmFzZSBmcm9tICcuL2hhbmRsZWJhcnMvYmFzZSc7XG5cbi8vIEVhY2ggb2YgdGhlc2UgYXVnbWVudCB0aGUgSGFuZGxlYmFycyBvYmplY3QuIE5vIG5lZWQgdG8gc2V0dXAgaGVyZS5cbi8vIChUaGlzIGlzIGRvbmUgdG8gZWFzaWx5IHNoYXJlIGNvZGUgYmV0d2VlbiBjb21tb25qcyBhbmQgYnJvd3NlIGVudnMpXG5pbXBvcnQgU2FmZVN0cmluZyBmcm9tICcuL2hhbmRsZWJhcnMvc2FmZS1zdHJpbmcnO1xuaW1wb3J0IEV4Y2VwdGlvbiBmcm9tICcuL2hhbmRsZWJhcnMvZXhjZXB0aW9uJztcbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJy4vaGFuZGxlYmFycy91dGlscyc7XG5pbXBvcnQgKiBhcyBydW50aW1lIGZyb20gJy4vaGFuZGxlYmFycy9ydW50aW1lJztcblxuaW1wb3J0IG5vQ29uZmxpY3QgZnJvbSAnLi9oYW5kbGViYXJzL25vLWNvbmZsaWN0JztcblxuLy8gRm9yIGNvbXBhdGliaWxpdHkgYW5kIHVzYWdlIG91dHNpZGUgb2YgbW9kdWxlIHN5c3RlbXMsIG1ha2UgdGhlIEhhbmRsZWJhcnMgb2JqZWN0IGEgbmFtZXNwYWNlXG5mdW5jdGlvbiBjcmVhdGUoKSB7XG4gIGxldCBoYiA9IG5ldyBiYXNlLkhhbmRsZWJhcnNFbnZpcm9ubWVudCgpO1xuXG4gIFV0aWxzLmV4dGVuZChoYiwgYmFzZSk7XG4gIGhiLlNhZmVTdHJpbmcgPSBTYWZlU3RyaW5nO1xuICBoYi5FeGNlcHRpb24gPSBFeGNlcHRpb247XG4gIGhiLlV0aWxzID0gVXRpbHM7XG4gIGhiLmVzY2FwZUV4cHJlc3Npb24gPSBVdGlscy5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIGhiLlZNID0gcnVudGltZTtcbiAgaGIudGVtcGxhdGUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgcmV0dXJuIHJ1bnRpbWUudGVtcGxhdGUoc3BlYywgaGIpO1xuICB9O1xuXG4gIHJldHVybiBoYjtcbn1cblxubGV0IGluc3QgPSBjcmVhdGUoKTtcbmluc3QuY3JlYXRlID0gY3JlYXRlO1xuXG5ub0NvbmZsaWN0KGluc3QpO1xuXG5pbnN0WydkZWZhdWx0J10gPSBpbnN0O1xuXG5leHBvcnQgZGVmYXVsdCBpbnN0O1xuIiwiaW1wb3J0IHtjcmVhdGVGcmFtZSwgZXh0ZW5kLCB0b1N0cmluZ30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgRXhjZXB0aW9uIGZyb20gJy4vZXhjZXB0aW9uJztcbmltcG9ydCB7cmVnaXN0ZXJEZWZhdWx0SGVscGVyc30gZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7cmVnaXN0ZXJEZWZhdWx0RGVjb3JhdG9yc30gZnJvbSAnLi9kZWNvcmF0b3JzJztcbmltcG9ydCBsb2dnZXIgZnJvbSAnLi9sb2dnZXInO1xuXG5leHBvcnQgY29uc3QgVkVSU0lPTiA9ICc0LjAuNSc7XG5leHBvcnQgY29uc3QgQ09NUElMRVJfUkVWSVNJT04gPSA3O1xuXG5leHBvcnQgY29uc3QgUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc9PSAxLngueCcsXG4gIDU6ICc9PSAyLjAuMC1hbHBoYS54JyxcbiAgNjogJz49IDIuMC4wLWJldGEuMScsXG4gIDc6ICc+PSA0LjAuMCdcbn07XG5cbmNvbnN0IG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuZXhwb3J0IGZ1bmN0aW9uIEhhbmRsZWJhcnNFbnZpcm9ubWVudChoZWxwZXJzLCBwYXJ0aWFscywgZGVjb3JhdG9ycykge1xuICB0aGlzLmhlbHBlcnMgPSBoZWxwZXJzIHx8IHt9O1xuICB0aGlzLnBhcnRpYWxzID0gcGFydGlhbHMgfHwge307XG4gIHRoaXMuZGVjb3JhdG9ycyA9IGRlY29yYXRvcnMgfHwge307XG5cbiAgcmVnaXN0ZXJEZWZhdWx0SGVscGVycyh0aGlzKTtcbiAgcmVnaXN0ZXJEZWZhdWx0RGVjb3JhdG9ycyh0aGlzKTtcbn1cblxuSGFuZGxlYmFyc0Vudmlyb25tZW50LnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEhhbmRsZWJhcnNFbnZpcm9ubWVudCxcblxuICBsb2dnZXI6IGxvZ2dlcixcbiAgbG9nOiBsb2dnZXIubG9nLFxuXG4gIHJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbihuYW1lLCBmbikge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBpZiAoZm4pIHsgdGhyb3cgbmV3IEV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICAgIGV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5oZWxwZXJzW25hbWVdO1xuICB9LFxuXG4gIHJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSwgcGFydGlhbCkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBleHRlbmQodGhpcy5wYXJ0aWFscywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgcGFydGlhbCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihgQXR0ZW1wdGluZyB0byByZWdpc3RlciBhIHBhcnRpYWwgY2FsbGVkIFwiJHtuYW1lfVwiIGFzIHVuZGVmaW5lZGApO1xuICAgICAgfVxuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHBhcnRpYWw7XG4gICAgfVxuICB9LFxuICB1bnJlZ2lzdGVyUGFydGlhbDogZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLnBhcnRpYWxzW25hbWVdO1xuICB9LFxuXG4gIHJlZ2lzdGVyRGVjb3JhdG9yOiBmdW5jdGlvbihuYW1lLCBmbikge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBpZiAoZm4pIHsgdGhyb3cgbmV3IEV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBkZWNvcmF0b3JzJyk7IH1cbiAgICAgIGV4dGVuZCh0aGlzLmRlY29yYXRvcnMsIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRlY29yYXRvcnNbbmFtZV0gPSBmbjtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJEZWNvcmF0b3I6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5kZWNvcmF0b3JzW25hbWVdO1xuICB9XG59O1xuXG5leHBvcnQgbGV0IGxvZyA9IGxvZ2dlci5sb2c7XG5cbmV4cG9ydCB7Y3JlYXRlRnJhbWUsIGxvZ2dlcn07XG4iLCJpbXBvcnQgcmVnaXN0ZXJJbmxpbmUgZnJvbSAnLi9kZWNvcmF0b3JzL2lubGluZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckRlZmF1bHREZWNvcmF0b3JzKGluc3RhbmNlKSB7XG4gIHJlZ2lzdGVySW5saW5lKGluc3RhbmNlKTtcbn1cblxuIiwiaW1wb3J0IHtleHRlbmR9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJEZWNvcmF0b3IoJ2lubGluZScsIGZ1bmN0aW9uKGZuLCBwcm9wcywgY29udGFpbmVyLCBvcHRpb25zKSB7XG4gICAgbGV0IHJldCA9IGZuO1xuICAgIGlmICghcHJvcHMucGFydGlhbHMpIHtcbiAgICAgIHByb3BzLnBhcnRpYWxzID0ge307XG4gICAgICByZXQgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICAgIC8vIENyZWF0ZSBhIG5ldyBwYXJ0aWFscyBzdGFjayBmcmFtZSBwcmlvciB0byBleGVjLlxuICAgICAgICBsZXQgb3JpZ2luYWwgPSBjb250YWluZXIucGFydGlhbHM7XG4gICAgICAgIGNvbnRhaW5lci5wYXJ0aWFscyA9IGV4dGVuZCh7fSwgb3JpZ2luYWwsIHByb3BzLnBhcnRpYWxzKTtcbiAgICAgICAgbGV0IHJldCA9IGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICBjb250YWluZXIucGFydGlhbHMgPSBvcmlnaW5hbDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcHJvcHMucGFydGlhbHNbb3B0aW9ucy5hcmdzWzBdXSA9IG9wdGlvbnMuZm47XG5cbiAgICByZXR1cm4gcmV0O1xuICB9KTtcbn1cbiIsIlxuY29uc3QgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbmZ1bmN0aW9uIEV4Y2VwdGlvbihtZXNzYWdlLCBub2RlKSB7XG4gIGxldCBsb2MgPSBub2RlICYmIG5vZGUubG9jLFxuICAgICAgbGluZSxcbiAgICAgIGNvbHVtbjtcbiAgaWYgKGxvYykge1xuICAgIGxpbmUgPSBsb2Muc3RhcnQubGluZTtcbiAgICBjb2x1bW4gPSBsb2Muc3RhcnQuY29sdW1uO1xuXG4gICAgbWVzc2FnZSArPSAnIC0gJyArIGxpbmUgKyAnOicgKyBjb2x1bW47XG4gIH1cblxuICBsZXQgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG5cbiAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgRXhjZXB0aW9uKTtcbiAgfVxuXG4gIGlmIChsb2MpIHtcbiAgICB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lO1xuICAgIHRoaXMuY29sdW1uID0gY29sdW1uO1xuICB9XG59XG5cbkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuZXhwb3J0IGRlZmF1bHQgRXhjZXB0aW9uO1xuIiwiaW1wb3J0IHJlZ2lzdGVyQmxvY2tIZWxwZXJNaXNzaW5nIGZyb20gJy4vaGVscGVycy9ibG9jay1oZWxwZXItbWlzc2luZyc7XG5pbXBvcnQgcmVnaXN0ZXJFYWNoIGZyb20gJy4vaGVscGVycy9lYWNoJztcbmltcG9ydCByZWdpc3RlckhlbHBlck1pc3NpbmcgZnJvbSAnLi9oZWxwZXJzL2hlbHBlci1taXNzaW5nJztcbmltcG9ydCByZWdpc3RlcklmIGZyb20gJy4vaGVscGVycy9pZic7XG5pbXBvcnQgcmVnaXN0ZXJMb2cgZnJvbSAnLi9oZWxwZXJzL2xvZyc7XG5pbXBvcnQgcmVnaXN0ZXJMb29rdXAgZnJvbSAnLi9oZWxwZXJzL2xvb2t1cCc7XG5pbXBvcnQgcmVnaXN0ZXJXaXRoIGZyb20gJy4vaGVscGVycy93aXRoJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnMoaW5zdGFuY2UpIHtcbiAgcmVnaXN0ZXJCbG9ja0hlbHBlck1pc3NpbmcoaW5zdGFuY2UpO1xuICByZWdpc3RlckVhY2goaW5zdGFuY2UpO1xuICByZWdpc3RlckhlbHBlck1pc3NpbmcoaW5zdGFuY2UpO1xuICByZWdpc3RlcklmKGluc3RhbmNlKTtcbiAgcmVnaXN0ZXJMb2coaW5zdGFuY2UpO1xuICByZWdpc3Rlckxvb2t1cChpbnN0YW5jZSk7XG4gIHJlZ2lzdGVyV2l0aChpbnN0YW5jZSk7XG59XG4iLCJpbXBvcnQge2FwcGVuZENvbnRleHRQYXRoLCBjcmVhdGVGcmFtZSwgaXNBcnJheX0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGxldCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlLFxuICAgICAgICBmbiA9IG9wdGlvbnMuZm47XG5cbiAgICBpZiAoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZuKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmIChjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaWRzKSB7XG4gICAgICAgICAgb3B0aW9ucy5pZHMgPSBbb3B0aW9ucy5uYW1lXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICBsZXQgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBhcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMubmFtZSk7XG4gICAgICAgIG9wdGlvbnMgPSB7ZGF0YTogZGF0YX07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiaW1wb3J0IHthcHBlbmRDb250ZXh0UGF0aCwgYmxvY2tQYXJhbXMsIGNyZWF0ZUZyYW1lLCBpc0FycmF5LCBpc0Z1bmN0aW9ufSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQgRXhjZXB0aW9uIGZyb20gJy4uL2V4Y2VwdGlvbic7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignTXVzdCBwYXNzIGl0ZXJhdG9yIHRvICNlYWNoJyk7XG4gICAgfVxuXG4gICAgbGV0IGZuID0gb3B0aW9ucy5mbixcbiAgICAgICAgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIHJldCA9ICcnLFxuICAgICAgICBkYXRhLFxuICAgICAgICBjb250ZXh0UGF0aDtcblxuICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgIGNvbnRleHRQYXRoID0gYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSkgKyAnLic7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXhlY0l0ZXJhdGlvbihmaWVsZCwgaW5kZXgsIGxhc3QpIHtcbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIGRhdGEua2V5ID0gZmllbGQ7XG4gICAgICAgIGRhdGEuaW5kZXggPSBpbmRleDtcbiAgICAgICAgZGF0YS5maXJzdCA9IGluZGV4ID09PSAwO1xuICAgICAgICBkYXRhLmxhc3QgPSAhIWxhc3Q7XG5cbiAgICAgICAgaWYgKGNvbnRleHRQYXRoKSB7XG4gICAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IGNvbnRleHRQYXRoICsgZmllbGQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtmaWVsZF0sIHtcbiAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgYmxvY2tQYXJhbXM6IGJsb2NrUGFyYW1zKFtjb250ZXh0W2ZpZWxkXSwgZmllbGRdLCBbY29udGV4dFBhdGggKyBmaWVsZCwgbnVsbF0pXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmIChpc0FycmF5KGNvbnRleHQpKSB7XG4gICAgICAgIGZvciAobGV0IGogPSBjb250ZXh0Lmxlbmd0aDsgaSA8IGo7IGkrKykge1xuICAgICAgICAgIGlmIChpIGluIGNvbnRleHQpIHtcbiAgICAgICAgICAgIGV4ZWNJdGVyYXRpb24oaSwgaSwgaSA9PT0gY29udGV4dC5sZW5ndGggLSAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBwcmlvcktleTtcblxuICAgICAgICBmb3IgKGxldCBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICAgIGlmIChjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIC8vIFdlJ3JlIHJ1bm5pbmcgdGhlIGl0ZXJhdGlvbnMgb25lIHN0ZXAgb3V0IG9mIHN5bmMgc28gd2UgY2FuIGRldGVjdFxuICAgICAgICAgICAgLy8gdGhlIGxhc3QgaXRlcmF0aW9uIHdpdGhvdXQgaGF2ZSB0byBzY2FuIHRoZSBvYmplY3QgdHdpY2UgYW5kIGNyZWF0ZVxuICAgICAgICAgICAgLy8gYW4gaXRlcm1lZGlhdGUga2V5cyBhcnJheS5cbiAgICAgICAgICAgIGlmIChwcmlvcktleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGV4ZWNJdGVyYXRpb24ocHJpb3JLZXksIGkgLSAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHByaW9yS2V5ID0ga2V5O1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocHJpb3JLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGV4ZWNJdGVyYXRpb24ocHJpb3JLZXksIGkgLSAxLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xufVxuIiwiaW1wb3J0IEV4Y2VwdGlvbiBmcm9tICcuLi9leGNlcHRpb24nO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKC8qIFthcmdzLCBdb3B0aW9ucyAqLykge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAvLyBBIG1pc3NpbmcgZmllbGQgaW4gYSB7e2Zvb319IGNvbnN0cnVjdC5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFNvbWVvbmUgaXMgYWN0dWFsbHkgdHJ5aW5nIHRvIGNhbGwgc29tZXRoaW5nLCBibG93IHVwLlxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignTWlzc2luZyBoZWxwZXI6IFwiJyArIGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV0ubmFtZSArICdcIicpO1xuICAgIH1cbiAgfSk7XG59XG4iLCJpbXBvcnQge2lzRW1wdHksIGlzRnVuY3Rpb259IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb25kaXRpb25hbCkpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcbiAgICAvLyBiZWhhdmlvciBvZiBpc0VtcHR5LiBFZmZlY3RpdmVseSB0aGlzIGRldGVybWluZXMgaWYgMCBpcyBoYW5kbGVkIGJ5IHRoZSBwb3NpdGl2ZSBwYXRoIG9yIG5lZ2F0aXZlLlxuICAgIGlmICgoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwpIHx8IGlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZuLCBoYXNoOiBvcHRpb25zLmhhc2h9KTtcbiAgfSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24oLyogbWVzc2FnZSwgb3B0aW9ucyAqLykge1xuICAgIGxldCBhcmdzID0gW3VuZGVmaW5lZF0sXG4gICAgICAgIG9wdGlvbnMgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgfVxuXG4gICAgbGV0IGxldmVsID0gMTtcbiAgICBpZiAob3B0aW9ucy5oYXNoLmxldmVsICE9IG51bGwpIHtcbiAgICAgIGxldmVsID0gb3B0aW9ucy5oYXNoLmxldmVsO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsKSB7XG4gICAgICBsZXZlbCA9IG9wdGlvbnMuZGF0YS5sZXZlbDtcbiAgICB9XG4gICAgYXJnc1swXSA9IGxldmVsO1xuXG4gICAgaW5zdGFuY2UubG9nKC4uLiBhcmdzKTtcbiAgfSk7XG59XG4iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9va3VwJywgZnVuY3Rpb24ob2JqLCBmaWVsZCkge1xuICAgIHJldHVybiBvYmogJiYgb2JqW2ZpZWxkXTtcbiAgfSk7XG59XG4iLCJpbXBvcnQge2FwcGVuZENvbnRleHRQYXRoLCBibG9ja1BhcmFtcywgY3JlYXRlRnJhbWUsIGlzRW1wdHksIGlzRnVuY3Rpb259IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgbGV0IGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmICghaXNFbXB0eShjb250ZXh0KSkge1xuICAgICAgbGV0IGRhdGEgPSBvcHRpb25zLmRhdGE7XG4gICAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gYXBwZW5kQ29udGV4dFBhdGgob3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoLCBvcHRpb25zLmlkc1swXSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCB7XG4gICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgIGJsb2NrUGFyYW1zOiBibG9ja1BhcmFtcyhbY29udGV4dF0sIFtkYXRhICYmIGRhdGEuY29udGV4dFBhdGhdKVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfVxuICB9KTtcbn1cbiIsImltcG9ydCB7aW5kZXhPZn0gZnJvbSAnLi91dGlscyc7XG5cbmxldCBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogWydkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXSxcbiAgbGV2ZWw6ICdpbmZvJyxcblxuICAvLyBNYXBzIGEgZ2l2ZW4gbGV2ZWwgdmFsdWUgdG8gdGhlIGBtZXRob2RNYXBgIGluZGV4ZXMgYWJvdmUuXG4gIGxvb2t1cExldmVsOiBmdW5jdGlvbihsZXZlbCkge1xuICAgIGlmICh0eXBlb2YgbGV2ZWwgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsZXQgbGV2ZWxNYXAgPSBpbmRleE9mKGxvZ2dlci5tZXRob2RNYXAsIGxldmVsLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgaWYgKGxldmVsTWFwID49IDApIHtcbiAgICAgICAgbGV2ZWwgPSBsZXZlbE1hcDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldmVsID0gcGFyc2VJbnQobGV2ZWwsIDEwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbGV2ZWw7XG4gIH0sXG5cbiAgLy8gQ2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgLi4ubWVzc2FnZSkge1xuICAgIGxldmVsID0gbG9nZ2VyLmxvb2t1cExldmVsKGxldmVsKTtcblxuICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbG9nZ2VyLmxvb2t1cExldmVsKGxvZ2dlci5sZXZlbCkgPD0gbGV2ZWwpIHtcbiAgICAgIGxldCBtZXRob2QgPSBsb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICghY29uc29sZVttZXRob2RdKSB7ICAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXG4gICAgICAgIG1ldGhvZCA9ICdsb2cnO1xuICAgICAgfVxuICAgICAgY29uc29sZVttZXRob2RdKC4uLm1lc3NhZ2UpOyAgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGxvZ2dlcjtcbiIsIi8qIGdsb2JhbCB3aW5kb3cgKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgbGV0IHJvb3QgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHdpbmRvdyxcbiAgICAgICRIYW5kbGViYXJzID0gcm9vdC5IYW5kbGViYXJzO1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBIYW5kbGViYXJzLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAocm9vdC5IYW5kbGViYXJzID09PSBIYW5kbGViYXJzKSB7XG4gICAgICByb290LkhhbmRsZWJhcnMgPSAkSGFuZGxlYmFycztcbiAgICB9XG4gICAgcmV0dXJuIEhhbmRsZWJhcnM7XG4gIH07XG59XG4iLCJpbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBFeGNlcHRpb24gZnJvbSAnLi9leGNlcHRpb24nO1xuaW1wb3J0IHsgQ09NUElMRVJfUkVWSVNJT04sIFJFVklTSU9OX0NIQU5HRVMsIGNyZWF0ZUZyYW1lIH0gZnJvbSAnLi9iYXNlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrUmV2aXNpb24oY29tcGlsZXJJbmZvKSB7XG4gIGNvbnN0IGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm8gJiYgY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IENPTVBJTEVSX1JFVklTSU9OO1xuXG4gIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgY29uc3QgcnVudGltZVZlcnNpb25zID0gUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiAnICtcbiAgICAgICAgICAgICdQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uICgnICsgcnVudGltZVZlcnNpb25zICsgJykgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uICgnICsgY29tcGlsZXJWZXJzaW9ucyArICcpLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ1RlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gJyArXG4gICAgICAgICAgICAnUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uICgnICsgY29tcGlsZXJJbmZvWzFdICsgJykuJyk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0ZW1wbGF0ZSh0ZW1wbGF0ZVNwZWMsIGVudikge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBpZiAoIWVudikge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ05vIGVudmlyb25tZW50IHBhc3NlZCB0byB0ZW1wbGF0ZScpO1xuICB9XG4gIGlmICghdGVtcGxhdGVTcGVjIHx8ICF0ZW1wbGF0ZVNwZWMubWFpbikge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ1Vua25vd24gdGVtcGxhdGUgb2JqZWN0OiAnICsgdHlwZW9mIHRlbXBsYXRlU3BlYyk7XG4gIH1cblxuICB0ZW1wbGF0ZVNwZWMubWFpbi5kZWNvcmF0b3IgPSB0ZW1wbGF0ZVNwZWMubWFpbl9kO1xuXG4gIC8vIE5vdGU6IFVzaW5nIGVudi5WTSByZWZlcmVuY2VzIHJhdGhlciB0aGFuIGxvY2FsIHZhciByZWZlcmVuY2VzIHRocm91Z2hvdXQgdGhpcyBzZWN0aW9uIHRvIGFsbG93XG4gIC8vIGZvciBleHRlcm5hbCB1c2VycyB0byBvdmVycmlkZSB0aGVzZSBhcyBwc3VlZG8tc3VwcG9ydGVkIEFQSXMuXG4gIGVudi5WTS5jaGVja1JldmlzaW9uKHRlbXBsYXRlU3BlYy5jb21waWxlcik7XG5cbiAgZnVuY3Rpb24gaW52b2tlUGFydGlhbFdyYXBwZXIocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zLmhhc2gpIHtcbiAgICAgIGNvbnRleHQgPSBVdGlscy5leHRlbmQoe30sIGNvbnRleHQsIG9wdGlvbnMuaGFzaCk7XG4gICAgICBpZiAob3B0aW9ucy5pZHMpIHtcbiAgICAgICAgb3B0aW9ucy5pZHNbMF0gPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHBhcnRpYWwgPSBlbnYuVk0ucmVzb2x2ZVBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICBsZXQgcmVzdWx0ID0gZW52LlZNLmludm9rZVBhcnRpYWwuY2FsbCh0aGlzLCBwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKTtcblxuICAgIGlmIChyZXN1bHQgPT0gbnVsbCAmJiBlbnYuY29tcGlsZSkge1xuICAgICAgb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdID0gZW52LmNvbXBpbGUocGFydGlhbCwgdGVtcGxhdGVTcGVjLmNvbXBpbGVyT3B0aW9ucywgZW52KTtcbiAgICAgIHJlc3VsdCA9IG9wdGlvbnMucGFydGlhbHNbb3B0aW9ucy5uYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7XG4gICAgICBpZiAob3B0aW9ucy5pbmRlbnQpIHtcbiAgICAgICAgbGV0IGxpbmVzID0gcmVzdWx0LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBsaW5lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICBpZiAoIWxpbmVzW2ldICYmIGkgKyAxID09PSBsKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaW5lc1tpXSA9IG9wdGlvbnMuaW5kZW50ICsgbGluZXNbaV07XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gbGluZXMuam9pbignXFxuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdUaGUgcGFydGlhbCAnICsgb3B0aW9ucy5uYW1lICsgJyBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgbGV0IGNvbnRhaW5lciA9IHtcbiAgICBzdHJpY3Q6IGZ1bmN0aW9uKG9iaiwgbmFtZSkge1xuICAgICAgaWYgKCEobmFtZSBpbiBvYmopKSB7XG4gICAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ1wiJyArIG5hbWUgKyAnXCIgbm90IGRlZmluZWQgaW4gJyArIG9iaik7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqW25hbWVdO1xuICAgIH0sXG4gICAgbG9va3VwOiBmdW5jdGlvbihkZXB0aHMsIG5hbWUpIHtcbiAgICAgIGNvbnN0IGxlbiA9IGRlcHRocy5sZW5ndGg7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGlmIChkZXB0aHNbaV0gJiYgZGVwdGhzW2ldW25hbWVdICE9IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gZGVwdGhzW2ldW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBsYW1iZGE6IGZ1bmN0aW9uKGN1cnJlbnQsIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgY3VycmVudCA9PT0gJ2Z1bmN0aW9uJyA/IGN1cnJlbnQuY2FsbChjb250ZXh0KSA6IGN1cnJlbnQ7XG4gICAgfSxcblxuICAgIGVzY2FwZUV4cHJlc3Npb246IFV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgaW52b2tlUGFydGlhbDogaW52b2tlUGFydGlhbFdyYXBwZXIsXG5cbiAgICBmbjogZnVuY3Rpb24oaSkge1xuICAgICAgbGV0IHJldCA9IHRlbXBsYXRlU3BlY1tpXTtcbiAgICAgIHJldC5kZWNvcmF0b3IgPSB0ZW1wbGF0ZVNwZWNbaSArICdfZCddO1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuXG4gICAgcHJvZ3JhbXM6IFtdLFxuICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGRhdGEsIGRlY2xhcmVkQmxvY2tQYXJhbXMsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgICAgIGxldCBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0sXG4gICAgICAgICAgZm4gPSB0aGlzLmZuKGkpO1xuICAgICAgaWYgKGRhdGEgfHwgZGVwdGhzIHx8IGJsb2NrUGFyYW1zIHx8IGRlY2xhcmVkQmxvY2tQYXJhbXMpIHtcbiAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB3cmFwUHJvZ3JhbSh0aGlzLCBpLCBmbiwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSB3cmFwUHJvZ3JhbSh0aGlzLCBpLCBmbik7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgfSxcblxuICAgIGRhdGE6IGZ1bmN0aW9uKHZhbHVlLCBkZXB0aCkge1xuICAgICAgd2hpbGUgKHZhbHVlICYmIGRlcHRoLS0pIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5fcGFyZW50O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0sXG4gICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgIGxldCBvYmogPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgIGlmIChwYXJhbSAmJiBjb21tb24gJiYgKHBhcmFtICE9PSBjb21tb24pKSB7XG4gICAgICAgIG9iaiA9IFV0aWxzLmV4dGVuZCh7fSwgY29tbW9uLCBwYXJhbSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfSxcblxuICAgIG5vb3A6IGVudi5WTS5ub29wLFxuICAgIGNvbXBpbGVySW5mbzogdGVtcGxhdGVTcGVjLmNvbXBpbGVyXG4gIH07XG5cbiAgZnVuY3Rpb24gcmV0KGNvbnRleHQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBkYXRhID0gb3B0aW9ucy5kYXRhO1xuXG4gICAgcmV0Ll9zZXR1cChvcHRpb25zKTtcbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCAmJiB0ZW1wbGF0ZVNwZWMudXNlRGF0YSkge1xuICAgICAgZGF0YSA9IGluaXREYXRhKGNvbnRleHQsIGRhdGEpO1xuICAgIH1cbiAgICBsZXQgZGVwdGhzLFxuICAgICAgICBibG9ja1BhcmFtcyA9IHRlbXBsYXRlU3BlYy51c2VCbG9ja1BhcmFtcyA/IFtdIDogdW5kZWZpbmVkO1xuICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlRGVwdGhzKSB7XG4gICAgICBpZiAob3B0aW9ucy5kZXB0aHMpIHtcbiAgICAgICAgZGVwdGhzID0gY29udGV4dCAhPT0gb3B0aW9ucy5kZXB0aHNbMF0gPyBbY29udGV4dF0uY29uY2F0KG9wdGlvbnMuZGVwdGhzKSA6IG9wdGlvbnMuZGVwdGhzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVwdGhzID0gW2NvbnRleHRdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1haW4oY29udGV4dC8qLCBvcHRpb25zKi8pIHtcbiAgICAgIHJldHVybiAnJyArIHRlbXBsYXRlU3BlYy5tYWluKGNvbnRhaW5lciwgY29udGV4dCwgY29udGFpbmVyLmhlbHBlcnMsIGNvbnRhaW5lci5wYXJ0aWFscywgZGF0YSwgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gICAgfVxuICAgIG1haW4gPSBleGVjdXRlRGVjb3JhdG9ycyh0ZW1wbGF0ZVNwZWMubWFpbiwgbWFpbiwgY29udGFpbmVyLCBvcHRpb25zLmRlcHRocyB8fCBbXSwgZGF0YSwgYmxvY2tQYXJhbXMpO1xuICAgIHJldHVybiBtYWluKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG4gIHJldC5pc1RvcCA9IHRydWU7XG5cbiAgcmV0Ll9zZXR1cCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMucGFydGlhbCkge1xuICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5oZWxwZXJzLCBlbnYuaGVscGVycyk7XG5cbiAgICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlUGFydGlhbCkge1xuICAgICAgICBjb250YWluZXIucGFydGlhbHMgPSBjb250YWluZXIubWVyZ2Uob3B0aW9ucy5wYXJ0aWFscywgZW52LnBhcnRpYWxzKTtcbiAgICAgIH1cbiAgICAgIGlmICh0ZW1wbGF0ZVNwZWMudXNlUGFydGlhbCB8fCB0ZW1wbGF0ZVNwZWMudXNlRGVjb3JhdG9ycykge1xuICAgICAgICBjb250YWluZXIuZGVjb3JhdG9ycyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLmRlY29yYXRvcnMsIGVudi5kZWNvcmF0b3JzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29udGFpbmVyLmhlbHBlcnMgPSBvcHRpb25zLmhlbHBlcnM7XG4gICAgICBjb250YWluZXIucGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgICAgY29udGFpbmVyLmRlY29yYXRvcnMgPSBvcHRpb25zLmRlY29yYXRvcnM7XG4gICAgfVxuICB9O1xuXG4gIHJldC5fY2hpbGQgPSBmdW5jdGlvbihpLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VCbG9ja1BhcmFtcyAmJiAhYmxvY2tQYXJhbXMpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ211c3QgcGFzcyBibG9jayBwYXJhbXMnKTtcbiAgICB9XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMgJiYgIWRlcHRocykge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignbXVzdCBwYXNzIHBhcmVudCBkZXB0aHMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gd3JhcFByb2dyYW0oY29udGFpbmVyLCBpLCB0ZW1wbGF0ZVNwZWNbaV0sIGRhdGEsIDAsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICB9O1xuICByZXR1cm4gcmV0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JhcFByb2dyYW0oY29udGFpbmVyLCBpLCBmbiwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICBmdW5jdGlvbiBwcm9nKGNvbnRleHQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBjdXJyZW50RGVwdGhzID0gZGVwdGhzO1xuICAgIGlmIChkZXB0aHMgJiYgY29udGV4dCAhPT0gZGVwdGhzWzBdKSB7XG4gICAgICBjdXJyZW50RGVwdGhzID0gW2NvbnRleHRdLmNvbmNhdChkZXB0aHMpO1xuICAgIH1cblxuICAgIHJldHVybiBmbihjb250YWluZXIsXG4gICAgICAgIGNvbnRleHQsXG4gICAgICAgIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsXG4gICAgICAgIG9wdGlvbnMuZGF0YSB8fCBkYXRhLFxuICAgICAgICBibG9ja1BhcmFtcyAmJiBbb3B0aW9ucy5ibG9ja1BhcmFtc10uY29uY2F0KGJsb2NrUGFyYW1zKSxcbiAgICAgICAgY3VycmVudERlcHRocyk7XG4gIH1cblxuICBwcm9nID0gZXhlY3V0ZURlY29yYXRvcnMoZm4sIHByb2csIGNvbnRhaW5lciwgZGVwdGhzLCBkYXRhLCBibG9ja1BhcmFtcyk7XG5cbiAgcHJvZy5wcm9ncmFtID0gaTtcbiAgcHJvZy5kZXB0aCA9IGRlcHRocyA/IGRlcHRocy5sZW5ndGggOiAwO1xuICBwcm9nLmJsb2NrUGFyYW1zID0gZGVjbGFyZWRCbG9ja1BhcmFtcyB8fCAwO1xuICByZXR1cm4gcHJvZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVQYXJ0aWFsKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgaWYgKCFwYXJ0aWFsKSB7XG4gICAgaWYgKG9wdGlvbnMubmFtZSA9PT0gJ0BwYXJ0aWFsLWJsb2NrJykge1xuICAgICAgcGFydGlhbCA9IG9wdGlvbnMuZGF0YVsncGFydGlhbC1ibG9jayddO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0aWFsID0gb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdO1xuICAgIH1cbiAgfSBlbHNlIGlmICghcGFydGlhbC5jYWxsICYmICFvcHRpb25zLm5hbWUpIHtcbiAgICAvLyBUaGlzIGlzIGEgZHluYW1pYyBwYXJ0aWFsIHRoYXQgcmV0dXJuZWQgYSBzdHJpbmdcbiAgICBvcHRpb25zLm5hbWUgPSBwYXJ0aWFsO1xuICAgIHBhcnRpYWwgPSBvcHRpb25zLnBhcnRpYWxzW3BhcnRpYWxdO1xuICB9XG4gIHJldHVybiBwYXJ0aWFsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMucGFydGlhbCA9IHRydWU7XG4gIGlmIChvcHRpb25zLmlkcykge1xuICAgIG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCA9IG9wdGlvbnMuaWRzWzBdIHx8IG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aDtcbiAgfVxuXG4gIGxldCBwYXJ0aWFsQmxvY2s7XG4gIGlmIChvcHRpb25zLmZuICYmIG9wdGlvbnMuZm4gIT09IG5vb3ApIHtcbiAgICBvcHRpb25zLmRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIHBhcnRpYWxCbG9jayA9IG9wdGlvbnMuZGF0YVsncGFydGlhbC1ibG9jayddID0gb3B0aW9ucy5mbjtcblxuICAgIGlmIChwYXJ0aWFsQmxvY2sucGFydGlhbHMpIHtcbiAgICAgIG9wdGlvbnMucGFydGlhbHMgPSBVdGlscy5leHRlbmQoe30sIG9wdGlvbnMucGFydGlhbHMsIHBhcnRpYWxCbG9jay5wYXJ0aWFscyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHBhcnRpYWwgPT09IHVuZGVmaW5lZCAmJiBwYXJ0aWFsQmxvY2spIHtcbiAgICBwYXJ0aWFsID0gcGFydGlhbEJsb2NrO1xuICB9XG5cbiAgaWYgKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ1RoZSBwYXJ0aWFsICcgKyBvcHRpb25zLm5hbWUgKyAnIGNvdWxkIG5vdCBiZSBmb3VuZCcpO1xuICB9IGVsc2UgaWYgKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub29wKCkgeyByZXR1cm4gJyc7IH1cblxuZnVuY3Rpb24gaW5pdERhdGEoY29udGV4dCwgZGF0YSkge1xuICBpZiAoIWRhdGEgfHwgISgncm9vdCcgaW4gZGF0YSkpIHtcbiAgICBkYXRhID0gZGF0YSA/IGNyZWF0ZUZyYW1lKGRhdGEpIDoge307XG4gICAgZGF0YS5yb290ID0gY29udGV4dDtcbiAgfVxuICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gZXhlY3V0ZURlY29yYXRvcnMoZm4sIHByb2csIGNvbnRhaW5lciwgZGVwdGhzLCBkYXRhLCBibG9ja1BhcmFtcykge1xuICBpZiAoZm4uZGVjb3JhdG9yKSB7XG4gICAgbGV0IHByb3BzID0ge307XG4gICAgcHJvZyA9IGZuLmRlY29yYXRvcihwcm9nLCBwcm9wcywgY29udGFpbmVyLCBkZXB0aHMgJiYgZGVwdGhzWzBdLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgICBVdGlscy5leHRlbmQocHJvZywgcHJvcHMpO1xuICB9XG4gIHJldHVybiBwcm9nO1xufVxuIiwiLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbmZ1bmN0aW9uIFNhZmVTdHJpbmcoc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufVxuXG5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IFNhZmVTdHJpbmcucHJvdG90eXBlLnRvSFRNTCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gJycgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydCBkZWZhdWx0IFNhZmVTdHJpbmc7XG4iLCJjb25zdCBlc2NhcGUgPSB7XG4gICcmJzogJyZhbXA7JyxcbiAgJzwnOiAnJmx0OycsXG4gICc+JzogJyZndDsnLFxuICAnXCInOiAnJnF1b3Q7JyxcbiAgXCInXCI6ICcmI3gyNzsnLFxuICAnYCc6ICcmI3g2MDsnLFxuICAnPSc6ICcmI3gzRDsnXG59O1xuXG5jb25zdCBiYWRDaGFycyA9IC9bJjw+XCInYD1dL2csXG4gICAgICBwb3NzaWJsZSA9IC9bJjw+XCInYD1dLztcblxuZnVuY3Rpb24gZXNjYXBlQ2hhcihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW5kKG9iai8qICwgLi4uc291cmNlICovKSB7XG4gIGZvciAobGV0IGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yIChsZXQga2V5IGluIGFyZ3VtZW50c1tpXSkge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhcmd1bWVudHNbaV0sIGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSBhcmd1bWVudHNbaV1ba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufVxuXG5leHBvcnQgbGV0IHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLy8gU291cmNlZCBmcm9tIGxvZGFzaFxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9MSUNFTlNFLnR4dFxuLyogZXNsaW50LWRpc2FibGUgZnVuYy1zdHlsZSAqL1xubGV0IGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufTtcbi8vIGZhbGxiYWNrIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBDaHJvbWUgYW5kIFNhZmFyaVxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmlmIChpc0Z1bmN0aW9uKC94LykpIHtcbiAgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbiAgfTtcbn1cbmV4cG9ydCB7aXNGdW5jdGlvbn07XG4vKiBlc2xpbnQtZW5hYmxlIGZ1bmMtc3R5bGUgKi9cblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbmV4cG9ydCBjb25zdCBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpID8gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEFycmF5XScgOiBmYWxzZTtcbn07XG5cbi8vIE9sZGVyIElFIHZlcnNpb25zIGRvIG5vdCBkaXJlY3RseSBzdXBwb3J0IGluZGV4T2Ygc28gd2UgbXVzdCBpbXBsZW1lbnQgb3VyIG93biwgc2FkbHkuXG5leHBvcnQgZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgdmFsdWUpIHtcbiAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IGFycmF5Lmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGFycmF5W2ldID09PSB2YWx1ZSkge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgJiYgc3RyaW5nLnRvSFRNTCkge1xuICAgICAgcmV0dXJuIHN0cmluZy50b0hUTUwoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfSBlbHNlIGlmICghc3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nICsgJyc7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmc7XG4gIH1cblxuICBpZiAoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUZyYW1lKG9iamVjdCkge1xuICBsZXQgZnJhbWUgPSBleHRlbmQoe30sIG9iamVjdCk7XG4gIGZyYW1lLl9wYXJlbnQgPSBvYmplY3Q7XG4gIHJldHVybiBmcmFtZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJsb2NrUGFyYW1zKHBhcmFtcywgaWRzKSB7XG4gIHBhcmFtcy5wYXRoID0gaWRzO1xuICByZXR1cm4gcGFyYW1zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kQ29udGV4dFBhdGgoY29udGV4dFBhdGgsIGlkKSB7XG4gIHJldHVybiAoY29udGV4dFBhdGggPyBjb250ZXh0UGF0aCArICcuJyA6ICcnKSArIGlkO1xufVxuIiwiLy8gQ3JlYXRlIGEgc2ltcGxlIHBhdGggYWxpYXMgdG8gYWxsb3cgYnJvd3NlcmlmeSB0byByZXNvbHZlXG4vLyB0aGUgcnVudGltZSBvbiBhIHN1cHBvcnRlZCBwYXRoLlxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZScpWydkZWZhdWx0J107XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJoYW5kbGViYXJzL3J1bnRpbWVcIilbXCJkZWZhdWx0XCJdO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IGpRdWVyeSBmcm9tICdqcXVlcnknXG5pbXBvcnQgeyBDdXJyZW50VXNlck1vZGVsIH0gZnJvbSAnLi9tb2RlbHMvQ3VycmVudFVzZXInXG5pbXBvcnQgeyBBdWRpb1BsYXllclZpZXcgfSBmcm9tICcuL3BhcnRpYWxzL0F1ZGlvUGxheWVyVmlldydcbmltcG9ydCBSb3V0ZXIgZnJvbSAnLi9yb3V0ZXInXG5pbXBvcnQgUG9seWZpbGwgZnJvbSAnLi9wb2x5ZmlsbC5qcydcblxuJCA9IHJlcXVpcmUoJ2pxdWVyeScpO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcHBsaWNhdGlvbiB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMucm91dGVyID0gbnVsbDtcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBQb2x5ZmlsbC5pbnN0YWxsKCk7XG4gICAgICAgIEJhY2tib25lLiQgPSAkO1xuXG4gICAgICAgIHRoaXMucm91dGVyID0gbmV3IFJvdXRlcigpO1xuICAgICAgICB0aGlzLnJlZGlyZWN0VXJsQ2xpY2tzVG9Sb3V0ZXIoKTtcblxuICAgICAgICB2YXIgYXVkaW9QbGF5ZXIgPSBuZXcgQXVkaW9QbGF5ZXJWaWV3KHtlbDogJyNhdWRpby1wbGF5ZXInfSk7XG5cbiAgICAgICAgLy8gbG9hZCB1c2VyXG4gICAgICAgIG5ldyBDdXJyZW50VXNlck1vZGVsKCkuZmV0Y2goKVxuICAgICAgICAgICAgLnRoZW4obW9kZWwgPT4gdGhpcy5vblVzZXJBdXRoZW50aWNhdGVkKG1vZGVsKSwgcmVzcG9uc2UgPT4gdGhpcy5vblVzZXJBdXRoRmFpbChyZXNwb25zZSkpO1xuICAgIH1cblxuICAgIHJlZGlyZWN0VXJsQ2xpY2tzVG9Sb3V0ZXIoKSB7XG4gICAgICAgIC8vIFVzZSBkZWxlZ2F0aW9uIHRvIGF2b2lkIGluaXRpYWwgRE9NIHNlbGVjdGlvbiBhbmQgYWxsb3cgYWxsIG1hdGNoaW5nIGVsZW1lbnRzIHRvIGJ1YmJsZVxuICAgICAgICAkKGRvY3VtZW50KS5kZWxlZ2F0ZShcImFcIiwgXCJjbGlja1wiLCBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIGFuY2hvciBocmVmIGFuZCBwcm90Y29sXG4gICAgICAgICAgICB2YXIgaHJlZiA9ICQodGhpcykuYXR0cihcImhyZWZcIik7XG4gICAgICAgICAgICB2YXIgcHJvdG9jb2wgPSB0aGlzLnByb3RvY29sICsgXCIvL1wiO1xuXG4gICAgICAgICAgICB2YXIgb3BlbkxpbmtJblRhYiA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZihocmVmID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyBubyB1cmwgc3BlY2lmaWVkLCBkb24ndCBkbyBhbnl0aGluZy5cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHNwZWNpYWwgY2FzZXMgdGhhdCB3ZSB3YW50IHRvIGhpdCB0aGUgc2VydmVyXG4gICAgICAgICAgICBpZihocmVmID09IFwiL2F1dGhcIikge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRW5zdXJlIHRoZSBwcm90b2NvbCBpcyBub3QgcGFydCBvZiBVUkwsIG1lYW5pbmcgaXRzIHJlbGF0aXZlLlxuICAgICAgICAgICAgLy8gU3RvcCB0aGUgZXZlbnQgYnViYmxpbmcgdG8gZW5zdXJlIHRoZSBsaW5rIHdpbGwgbm90IGNhdXNlIGEgcGFnZSByZWZyZXNoLlxuICAgICAgICAgICAgaWYgKCFvcGVuTGlua0luVGFiICYmIGhyZWYuc2xpY2UocHJvdG9jb2wubGVuZ3RoKSAhPT0gcHJvdG9jb2wpIHtcbiAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgICAgIC8vIE5vdGUgYnkgdXNpbmcgQmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZSwgcm91dGVyIGV2ZW50cyB3aWxsIG5vdCBiZVxuICAgICAgICAgICAgICAgIC8vIHRyaWdnZXJlZC4gIElmIHRoaXMgaXMgYSBwcm9ibGVtLCBjaGFuZ2UgdGhpcyB0byBuYXZpZ2F0ZSBvbiB5b3VyXG4gICAgICAgICAgICAgICAgLy8gcm91dGVyLlxuICAgICAgICAgICAgICAgIEJhY2tib25lLmhpc3RvcnkubmF2aWdhdGUoaHJlZiwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9uVXNlckF1dGhGYWlsKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIHVzZXIgbm90IGF1dGhlbnRpY2F0ZWRcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PSA0MDEpIHtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucm91dGVyLnNldFVzZXIobnVsbCk7XG4gICAgICAgIHRoaXMuc3RhcnRSb3V0ZXJOYXZpZ2F0aW9uKCk7XG4gICAgfVxuXG4gICAgb25Vc2VyQXV0aGVudGljYXRlZCh1c2VyKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGVkIGN1cnJlbnQgdXNlclwiLCB1c2VyKTtcbiAgICAgICAgdGhpcy5yb3V0ZXIuc2V0VXNlcih1c2VyKTtcbiAgICAgICAgdGhpcy5zdGFydFJvdXRlck5hdmlnYXRpb24oKTtcbiAgICB9XG5cbiAgICBzdGFydFJvdXRlck5hdmlnYXRpb24oKSB7XG4gICAgICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe3B1c2hTdGF0ZTogdHJ1ZSwgaGFzaENoYW5nZTogZmFsc2V9KTtcbiAgICAgICAgLy9pZiAoIUJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe3B1c2hTdGF0ZTogdHJ1ZSwgaGFzaENoYW5nZTogZmFsc2V9KSkgcm91dGVyLm5hdmlnYXRlKCc0MDQnLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuICAgIH1cbn1cblxuZXhwb3J0IGxldCBhcHAgPSBuZXcgQXBwbGljYXRpb24oKTtcblxuXG4kKCgpID0+IHtcbiAgICAvLyBzZXR1cCByYXZlbiB0byBwdXNoIG1lc3NhZ2VzIHRvIG91ciBzZW50cnlcbiAgICAvL1JhdmVuLmNvbmZpZygnaHR0cHM6Ly9kYjJhN2Q1ODEwN2M0OTc1YWU3ZGU3MzZhNjMwOGExZUBhcHAuZ2V0c2VudHJ5LmNvbS81MzQ1NicsIHtcbiAgICAvLyAgICB3aGl0ZWxpc3RVcmxzOiBbJ3N0YWdpbmcuY291Y2hwb2QuY29tJywgJ2NvdWNocG9kLmNvbSddIC8vIHByb2R1Y3Rpb24gb25seVxuICAgIC8vfSkuaW5zdGFsbCgpXG5cbiAgICB3aW5kb3cuYXBwID0gYXBwO1xuICAgIGFwcC5pbml0aWFsaXplKCk7XG5cbiAgICAvLyBmb3IgcHJvZHVjdGlvbiwgY291bGQgd3JhcCBkb21SZWFkeUNhbGxiYWNrIGFuZCBsZXQgcmF2ZW4gaGFuZGxlIGFueSBleGNlcHRpb25zXG5cbiAgICAvKlxuICAgICB0cnkge1xuICAgICBkb21SZWFkeUNhbGxiYWNrKCk7XG4gICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgIFJhdmVuLmNhcHR1cmVFeGNlcHRpb24oZXJyKTtcbiAgICAgY29uc29sZS5sb2coXCJbRXJyb3JdIFVuaGFuZGxlZCBFeGNlcHRpb24gd2FzIGNhdWdodCBhbmQgc2VudCB2aWEgUmF2ZW46XCIpO1xuICAgICBjb25zb2xlLmRpcihlcnIpO1xuICAgICB9XG4gICAgICovXG59KVxuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcblxuY2xhc3MgQXVkaW9DYXB0dXJlIHtcbiAgICBjb25zdHJ1Y3RvcihtaWNyb3Bob25lTWVkaWFTdHJlYW0pIHtcbiAgICAgICAgLy8gc3Bhd24gYmFja2dyb3VuZCB3b3JrZXJcbiAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIgPSBuZXcgV29ya2VyKFwiL2Fzc2V0cy9qcy93b3JrZXItZW5jb2Rlci5taW4uanNcIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJJbml0aWFsaXplZCBBdWRpb0NhcHR1cmVcIik7XG5cbiAgICAgICAgdGhpcy5fYXVkaW9Db250ZXh0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYXVkaW9JbnB1dCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyID0gbnVsbDtcbiAgICAgICAgdGhpcy5faXNSZWNvcmRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lciA9IG51bGw7XG4gICAgICAgIHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2sgPSBudWxsO1xuICAgICAgICB0aGlzLl9hdWRpb0FuYWx5emVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluID0gbnVsbDtcbiAgICAgICAgdGhpcy5fY2FjaGVkTWVkaWFTdHJlYW0gPSBtaWNyb3Bob25lTWVkaWFTdHJlYW07XG5cbiAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbGF0ZXN0QXVkaW9CdWZmZXIgPSBbXTtcbiAgICAgICAgdGhpcy5fY2FjaGVkR2FpblZhbHVlID0gMTtcbiAgICAgICAgdGhpcy5fb25TdGFydGVkQ2FsbGJhY2sgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuX2ZmdFNpemUgPSAyNTY7XG4gICAgICAgIHRoaXMuX2ZmdFNtb290aGluZyA9IDAuODtcbiAgICAgICAgdGhpcy5fdG90YWxOdW1TYW1wbGVzID0gMDtcblxuXG4gICAgfVxuICAgIGNyZWF0ZUF1ZGlvQ29udGV4dChtZWRpYVN0cmVhbSkge1xuICAgICAgICAvLyBidWlsZCBjYXB0dXJlIGdyYXBoXG4gICAgICAgIHRoaXMuX2F1ZGlvQ29udGV4dCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0KSgpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0ID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKG1lZGlhU3RyZWFtKTtcbiAgICAgICAgdGhpcy5fYXVkaW9EZXN0aW5hdGlvbiA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbURlc3RpbmF0aW9uKCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0TWFudWFsRW5jb2RpbmcoKTsgX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlOiBcIiArIHRoaXMuX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlICsgXCIgSHpcIik7XG5cbiAgICAgICAgLy8gY3JlYXRlIGEgbGlzdGVuZXIgbm9kZSB0byBncmFiIG1pY3JvcGhvbmUgc2FtcGxlcyBhbmQgZmVlZCBpdCB0byBvdXIgYmFja2dyb3VuZCB3b3JrZXJcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lciA9ICh0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yIHx8IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVKYXZhU2NyaXB0Tm9kZSkuY2FsbCh0aGlzLl9hdWRpb0NvbnRleHQsIDE2Mzg0LCAxLCAxKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcInRoaXMuX2NhY2hlZEdhaW5WYWx1ZSA9IFwiICsgdGhpcy5fY2FjaGVkR2FpblZhbHVlKTtcblxuICAgICAgICB0aGlzLl9hdWRpb0dhaW4gPSB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLl9hdWRpb0dhaW4uZ2Fpbi52YWx1ZSA9IHRoaXMuX2NhY2hlZEdhaW5WYWx1ZTtcblxuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIgPSB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyLmZmdFNpemUgPSB0aGlzLl9mZnRTaXplO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gdGhpcy5fZmZ0U21vb3RoaW5nO1xuICAgIH1cblxuICAgIHN0YXJ0TWFudWFsRW5jb2RpbmcobWVkaWFTdHJlYW0pIHtcblxuICAgICAgICBpZiAoIXRoaXMuX2F1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5jcmVhdGVBdWRpb0NvbnRleHQobWVkaWFTdHJlYW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLl9lbmNvZGluZ1dvcmtlcilcbiAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyID0gbmV3IFdvcmtlcihcIi9hc3NldHMvanMvd29ya2VyLWVuY29kZXIubWluLmpzXCIpO1xuXG4gICAgICAgIC8vIHJlLWhvb2sgYXVkaW8gbGlzdGVuZXIgbm9kZSBldmVyeSB0aW1lIHdlIHN0YXJ0LCBiZWNhdXNlIF9lbmNvZGluZ1dvcmtlciByZWZlcmVuY2Ugd2lsbCBjaGFuZ2VcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lci5vbmF1ZGlvcHJvY2VzcyA9IChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2lzUmVjb3JkaW5nKSByZXR1cm47XG5cbiAgICAgICAgICAgIHZhciBtc2cgPSB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiBcInByb2Nlc3NcIixcblxuICAgICAgICAgICAgICAgIC8vIHR3byBGbG9hdDMyQXJyYXlzXG4gICAgICAgICAgICAgICAgbGVmdDogZS5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKVxuICAgICAgICAgICAgICAgIC8vcmlnaHQ6IGUuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vdmFyIGxlZnRPdXQgPSBlLm91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgIC8vZm9yKHZhciBpID0gMDsgaSA8IG1zZy5sZWZ0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyAgICBsZWZ0T3V0W2ldID0gbXNnLmxlZnRbaV07XG4gICAgICAgICAgICAvL31cblxuICAgICAgICAgICAgdGhpcy5fdG90YWxOdW1TYW1wbGVzICs9IG1zZy5sZWZ0Lmxlbmd0aDtcblxuICAgICAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIucG9zdE1lc3NhZ2UobXNnKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBoYW5kbGUgbWVzc2FnZXMgZnJvbSB0aGUgZW5jb2Rpbmctd29ya2VyXG4gICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLm9ubWVzc2FnZSA9IChlKSA9PiB7XG5cbiAgICAgICAgICAgIC8vIHdvcmtlciBmaW5pc2hlZCBhbmQgaGFzIHRoZSBmaW5hbCBlbmNvZGVkIGF1ZGlvIGJ1ZmZlciBmb3IgdXNcbiAgICAgICAgICAgIGlmIChlLmRhdGEuYWN0aW9uID09PSBcImVuY29kZWRcIikge1xuICAgICAgICAgICAgICAgIHZhciBlbmNvZGVkX2Jsb2IgPSBuZXcgQmxvYihbZS5kYXRhLmJ1ZmZlcl0sIHt0eXBlOiAnYXVkaW8vb2dnJ30pO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlLmRhdGEuYnVmZmVyLmJ1ZmZlciA9IFwiICsgZS5kYXRhLmJ1ZmZlci5idWZmZXIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZS5kYXRhLmJ1ZmZlci5ieXRlTGVuZ3RoID0gXCIgKyBlLmRhdGEuYnVmZmVyLmJ5dGVMZW5ndGgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic2FtcGxlUmF0ZSA9IFwiICsgdGhpcy5fYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidG90YWxOdW1TYW1wbGVzID0gXCIgKyB0aGlzLl90b3RhbE51bVNhbXBsZXMpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRHVyYXRpb24gb2YgcmVjb3JkaW5nID0gXCIgKyAodGhpcy5fdG90YWxOdW1TYW1wbGVzIC8gdGhpcy5fYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUpICsgXCIgc2Vjb25kc1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ290IGVuY29kZWQgYmxvYjogc2l6ZT1cIiArIGVuY29kZWRfYmxvYi5zaXplICsgXCIgdHlwZT1cIiArIGVuY29kZWRfYmxvYi50eXBlKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKGVuY29kZWRfYmxvYik7XG5cbiAgICAgICAgICAgICAgICAvLyB3b3JrZXIgaGFzIGV4aXRlZCwgdW5yZWZlcmVuY2UgaXRcbiAgICAgICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gY29uZmlndXJlIHdvcmtlciB3aXRoIGEgc2FtcGxpbmcgcmF0ZSBhbmQgYnVmZmVyLXNpemVcbiAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgYWN0aW9uOiBcImluaXRpYWxpemVcIixcbiAgICAgICAgICAgIHNhbXBsZV9yYXRlOiB0aGlzLl9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgIGJ1ZmZlcl9zaXplOiB0aGlzLl9hdWRpb0xpc3RlbmVyLmJ1ZmZlclNpemVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVE9ETzogaXQgbWlnaHQgYmUgYmV0dGVyIHRvIGxpc3RlbiBmb3IgYSBtZXNzYWdlIGJhY2sgZnJvbSB0aGUgYmFja2dyb3VuZCB3b3JrZXIgYmVmb3JlIGNvbnNpZGVyaW5nIHRoYXQgcmVjb3JkaW5nIGhhcyBiZWdhblxuICAgICAgICAvLyBpdCdzIGVhc2llciB0byB0cmltIGF1ZGlvIHRoYW4gY2FwdHVyZSBhIG1pc3Npbmcgd29yZCBhdCB0aGUgc3RhcnQgb2YgYSBzZW50ZW5jZVxuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGZhbHNlO1xuXG4gICAgICAgIC8vIGNvbm5lY3QgYXVkaW8gbm9kZXNcbiAgICAgICAgLy8gYXVkaW8taW5wdXQgLT4gZ2FpbiAtPiBmZnQtYW5hbHl6ZXIgLT4gUENNLWRhdGEgY2FwdHVyZSAtPiBkZXN0aW5hdGlvblxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydE1hbnVhbEVuY29kaW5nKCk7IENvbm5lY3RpbmcgQXVkaW8gTm9kZXMuLlwiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGlucHV0LT5nYWluXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0LmNvbm5lY3QodGhpcy5fYXVkaW9HYWluKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGdhaW4tPmFuYWx5emVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvR2Fpbi5jb25uZWN0KHRoaXMuX2F1ZGlvQW5hbHl6ZXIpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY29ubmVjdGluZzogYW5hbHl6ZXItPmxpc3Rlc25lclwiKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyLmNvbm5lY3QodGhpcy5fYXVkaW9MaXN0ZW5lcik7XG4gICAgICAgIC8vIGNvbm5lY3QgZ2FpbiBkaXJlY3RseSBpbnRvIGxpc3RlbmVyLCBieXBhc3NpbmcgYW5hbHl6ZXJcbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBnYWluLT5saXN0ZW5lclwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluLmNvbm5lY3QodGhpcy5fYXVkaW9MaXN0ZW5lcik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdGluZzogbGlzdGVuZXItPmRlc3RpbmF0aW9uXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyLmNvbm5lY3QodGhpcy5fYXVkaW9EZXN0aW5hdGlvbik7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgc2h1dGRvd25NYW51YWxFbmNvZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnNodXRkb3duTWFudWFsRW5jb2RpbmcoKTsgVGVhcmluZyBkb3duIEF1ZGlvQVBJIGNvbm5lY3Rpb25zLi5cIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBsaXN0ZW5lci0+ZGVzdGluYXRpb25cIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0Rlc3RpbmF0aW9uKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGFuYWx5emVyLT5saXN0ZXNuZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogZ2Fpbi0+YW5hbHl6ZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9HYWluLmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9BbmFseXplcik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogZ2Fpbi0+bGlzdGVuZXJcIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvR2Fpbi5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvTGlzdGVuZXIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGlucHV0LT5nYWluXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0LmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9HYWluKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbWljcm9waG9uZSBtYXkgYmUgbGl2ZSwgYnV0IGl0IGlzbid0IHJlY29yZGluZy4gVGhpcyB0b2dnbGVzIHRoZSBhY3R1YWwgd3JpdGluZyB0byB0aGUgY2FwdHVyZSBzdHJlYW0uXG4gICAgICogY2FwdHVyZUF1ZGlvU2FtcGxlcyBib29sIGluZGljYXRlcyB3aGV0aGVyIHRvIHJlY29yZCBmcm9tIG1pY1xuICAgICAqL1xuICAgIHRvZ2dsZU1pY3JvcGhvbmVSZWNvcmRpbmcoY2FwdHVyZUF1ZGlvU2FtcGxlcykge1xuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGNhcHR1cmVBdWRpb1NhbXBsZXM7XG4gICAgfVxuXG4gICAgc2V0R2FpbihnYWluKSB7XG4gICAgICAgIGlmICh0aGlzLl9hdWRpb0dhaW4pXG4gICAgICAgICAgICB0aGlzLl9hdWRpb0dhaW4uZ2Fpbi52YWx1ZSA9IGdhaW47XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJzZXR0aW5nIGdhaW46IFwiICsgZ2Fpbik7XG4gICAgICAgIHRoaXMuX2NhY2hlZEdhaW5WYWx1ZSA9IGdhaW47XG4gICAgfVxuXG4gICAgc3RhcnQob25TdGFydGVkQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbVwiLCB0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSk7XG4gICAgICAgIHRoaXMuc3RhcnRNYW51YWxFbmNvZGluZyh0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSk7XG5cbiAgICAgICAgLy8gVE9ETzogbWlnaHQgYmUgYSBnb29kIHRpbWUgdG8gc3RhcnQgYSBzcGVjdHJhbCBhbmFseXplclxuXG4gICAgICAgIGlmIChvblN0YXJ0ZWRDYWxsYmFjaylcbiAgICAgICAgICAgIG9uU3RhcnRlZENhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgc3RvcChjYXB0dXJlQ29tcGxldGVDYWxsYmFjaykge1xuICAgICAgICB0aGlzLl9vbkNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrID0gY2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2s7XG4gICAgICAgIHRoaXMuX2lzUmVjb3JkaW5nID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHRoaXMuX2F1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgLy8gc3RvcCB0aGUgbWFudWFsIGVuY29kZXJcbiAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyLnBvc3RNZXNzYWdlKHthY3Rpb246IFwiZmluaXNoXCJ9KTtcbiAgICAgICAgICAgIHRoaXMuc2h1dGRvd25NYW51YWxFbmNvZGluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2F1ZGlvRW5jb2Rlcikge1xuICAgICAgICAgICAgLy8gc3RvcCB0aGUgYXV0b21hdGljIGVuY29kZXJcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2F1ZGlvRW5jb2Rlci5zdGF0ZSAhPT0gJ3JlY29yZGluZycpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJBdWRpb0NhcHR1cmU6OnN0b3AoKTsgX2F1ZGlvRW5jb2Rlci5zdGF0ZSAhPSAncmVjb3JkaW5nJ1wiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fYXVkaW9FbmNvZGVyLnJlcXVlc3REYXRhKCk7XG4gICAgICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIuc3RvcCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVE9ETzogc3RvcCBhbnkgYWN0aXZlIHNwZWN0cmFsIGFuYWx5c2lzXG4gICAgfTtcbn1cblxuLypcbi8vIHVudXNlZCBhdCB0aGUgbW9tZW50XG5mdW5jdGlvbiBBbmFseXplcigpIHtcblxuICAgIHZhciBfYXVkaW9DYW52YXNBbmltYXRpb25JZCxcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXNcbiAgICAgICAgO1xuXG4gICAgdGhpcy5zdGFydEFuYWx5emVyVXBkYXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdXBkYXRlQW5hbHl6ZXIoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zdG9wQW5hbHl6ZXJVcGRhdGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIV9hdWRpb0NhbnZhc0FuaW1hdGlvbklkKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShfYXVkaW9DYW52YXNBbmltYXRpb25JZCk7XG4gICAgICAgIF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkID0gbnVsbDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlQW5hbHl6ZXIoKSB7XG5cbiAgICAgICAgaWYgKCFfYXVkaW9TcGVjdHJ1bUNhbnZhcylcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRpbmctdmlzdWFsaXplclwiKS5nZXRDb250ZXh0KFwiMmRcIik7XG5cbiAgICAgICAgdmFyIGZyZXFEYXRhID0gbmV3IFVpbnQ4QXJyYXkoX2F1ZGlvQW5hbHl6ZXIuZnJlcXVlbmN5QmluQ291bnQpO1xuICAgICAgICBfYXVkaW9BbmFseXplci5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxRGF0YSk7XG5cbiAgICAgICAgdmFyIG51bUJhcnMgPSBfYXVkaW9BbmFseXplci5mcmVxdWVuY3lCaW5Db3VudDtcbiAgICAgICAgdmFyIGJhcldpZHRoID0gTWF0aC5mbG9vcihfY2FudmFzV2lkdGggLyBudW1CYXJzKSAtIF9mZnRCYXJTcGFjaW5nO1xuXG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNsZWFyUmVjdCgwLCAwLCBfY2FudmFzV2lkdGgsIF9jYW52YXNIZWlnaHQpO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSAnI2Y2ZDU2NSc7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmxpbmVDYXAgPSAncm91bmQnO1xuXG4gICAgICAgIHZhciB4LCB5LCB3LCBoO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBmcmVxRGF0YVtpXTtcbiAgICAgICAgICAgIHZhciBzY2FsZWRfdmFsdWUgPSAodmFsdWUgLyAyNTYpICogX2NhbnZhc0hlaWdodDtcblxuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBfZmZ0QmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIHNjYWxlZF92YWx1ZTtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBzY2FsZWRfdmFsdWU7XG5cbiAgICAgICAgICAgIHZhciBncmFkaWVudCA9IF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNyZWF0ZUxpbmVhckdyYWRpZW50KHgsIF9jYW52YXNIZWlnaHQsIHgsIHkpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDEuMCwgXCJyZ2JhKDAsMCwwLDEuMClcIik7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC4wLCBcInJnYmEoMCwwLDAsMS4wKVwiKTtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gZ3JhZGllbnQ7XG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcblxuICAgICAgICAgICAgaWYgKHNjYWxlZF92YWx1ZSA+IF9oaXRIZWlnaHRzW2ldKSB7XG4gICAgICAgICAgICAgICAgX2hpdFZlbG9jaXRpZXNbaV0gKz0gKHNjYWxlZF92YWx1ZSAtIF9oaXRIZWlnaHRzW2ldKSAqIDY7XG4gICAgICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSBzY2FsZWRfdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9oaXRWZWxvY2l0aWVzW2ldIC09IDQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldICs9IF9oaXRWZWxvY2l0aWVzW2ldICogMC4wMTY7XG5cbiAgICAgICAgICAgIGlmIChfaGl0SGVpZ2h0c1tpXSA8IDApXG4gICAgICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2UtYXRvcFwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5kcmF3SW1hZ2UoX2NhbnZhc0JnLCAwLCAwKTtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1vdmVyXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsMjU1LDI1NSwwLjcpXCI7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBfZmZ0QmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIE1hdGgucm91bmQoX2hpdEhlaWdodHNbaV0pIC0gMjtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBiYXJXaWR0aDtcblxuICAgICAgICAgICAgaWYgKF9oaXRIZWlnaHRzW2ldID09PSAwKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAvL19hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IFwicmdiYSgyNTUsIDI1NSwgMjU1LFwiKyBNYXRoLm1heCgwLCAxIC0gTWF0aC5hYnMoX2hpdFZlbG9jaXRpZXNbaV0vMTUwKSkgKyBcIilcIjtcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KHgsIHksIHcsIGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZUFuYWx5emVyKTtcbiAgICB9XG5cbiAgICB2YXIgX2NhbnZhc1dpZHRoLCBfY2FudmFzSGVpZ2h0O1xuICAgIHZhciBfZmZ0U2l6ZSA9IDI1NjtcbiAgICB2YXIgX2ZmdFNtb290aGluZyA9IDAuODtcbiAgICB2YXIgX2ZmdEJhclNwYWNpbmcgPSAxO1xuXG4gICAgdmFyIF9oaXRIZWlnaHRzID0gW107XG4gICAgdmFyIF9oaXRWZWxvY2l0aWVzID0gW107XG5cbiAgICB0aGlzLnRlc3RDYW52YXMgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdmFyIGNhbnZhc0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVjb3JkaW5nLXZpc3VhbGl6ZXJcIik7XG5cbiAgICAgICAgX2NhbnZhc1dpZHRoID0gY2FudmFzQ29udGFpbmVyLndpZHRoO1xuICAgICAgICBfY2FudmFzSGVpZ2h0ID0gY2FudmFzQ29udGFpbmVyLmhlaWdodDtcblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcyA9IGNhbnZhc0NvbnRhaW5lci5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCJyZ2JhKDAsMCwwLDApXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KDAsIDAsIF9jYW52YXNXaWR0aCwgX2NhbnZhc0hlaWdodCk7XG5cbiAgICAgICAgdmFyIG51bUJhcnMgPSBfZmZ0U2l6ZSAvIDI7XG4gICAgICAgIHZhciBiYXJTcGFjaW5nID0gX2ZmdEJhclNwYWNpbmc7XG4gICAgICAgIHZhciBiYXJXaWR0aCA9IE1hdGguZmxvb3IoX2NhbnZhc1dpZHRoIC8gbnVtQmFycykgLSBiYXJTcGFjaW5nO1xuXG4gICAgICAgIHZhciB4LCB5LCB3LCBoLCBpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIF9oaXRIZWlnaHRzW2ldID0gX2NhbnZhc0hlaWdodCAtIDE7XG4gICAgICAgICAgICBfaGl0VmVsb2NpdGllc1tpXSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2NhbGVkX3ZhbHVlID0gTWF0aC5hYnMoTWF0aC5zaW4oTWF0aC5QSSAqIDYgKiAoaSAvIG51bUJhcnMpKSkgKiBfY2FudmFzSGVpZ2h0O1xuXG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIGJhclNwYWNpbmcpO1xuICAgICAgICAgICAgeSA9IF9jYW52YXNIZWlnaHQgLSBzY2FsZWRfdmFsdWU7XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gc2NhbGVkX3ZhbHVlO1xuXG4gICAgICAgICAgICB2YXIgZ3JhZGllbnQgPSBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5jcmVhdGVMaW5lYXJHcmFkaWVudCh4LCBfY2FudmFzSGVpZ2h0LCB4LCB5KTtcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgxLjAsIFwicmdiYSgwLDAsMCwwLjApXCIpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDAuMCwgXCJyZ2JhKDAsMCwwLDEuMClcIik7XG5cbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1hdG9wXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmRyYXdJbWFnZShfY2FudmFzQmcsIDAsIDApO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCIjZmZmZmZmXCI7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKiAoYmFyV2lkdGggKyBiYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gX2hpdEhlaWdodHNbaV07XG4gICAgICAgICAgICB3ID0gYmFyV2lkdGg7XG4gICAgICAgICAgICBoID0gMjtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIF9zY29wZSA9IHRoaXM7XG5cbiAgICB2YXIgX2NhbnZhc0JnID0gbmV3IEltYWdlKCk7XG4gICAgX2NhbnZhc0JnLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgX3Njb3BlLnRlc3RDYW52YXMoKTtcbiAgICB9O1xuICAgIC8vX2NhbnZhc0JnLnNyYyA9IFwiL2ltZy9iZzVzLmpwZ1wiO1xuICAgIF9jYW52YXNCZy5zcmMgPSBcIi9pbWcvYmc2LXdpZGUuanBnXCI7XG59XG4qL1xuXG5leHBvcnQgeyBBdWRpb0NhcHR1cmUgfVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcblxuY2xhc3MgQ3JlYXRlUmVjb3JkaW5nTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBudW1fcmVjb3JkaW5nczogMCxcbiAgICAgICAgICAgIHJlY29yZGluZ190aW1lOiAwXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgICAgIHN1cGVyKG9wdHMpO1xuICAgICAgICAvL1xuICAgICAgICAvL3RoaXMuZGVmYXVsdHMgPSB7XG4gICAgICAgIC8vICAgIG51bV9yZWNvcmRpbmdzOiAwLFxuICAgICAgICAvLyAgICByZWNvcmRpbmdfdGltZTogMFxuICAgICAgICAvL31cblxuICAgICAgICB0aGlzLnVybFJvb3QgPSBcIi9hcGkvY3JlYXRlX3JlY29yZGluZ1wiO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgQ3JlYXRlUmVjb3JkaW5nTW9kZWwgfVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuXG5jbGFzcyBDdXJyZW50VXNlck1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdXNlcm5hbWU6IFwiXCIsXG4gICAgICAgICAgICBwcm9maWxlSW1hZ2U6IFwiXCIsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IFwiXCIsXG4gICAgICAgICAgICBpZDogXCJcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnVybCA9IFwiL2FwaS9jdXJyZW50X3VzZXJcIjtcbiAgICB9XG59XG5cbmV4cG9ydCB7IEN1cnJlbnRVc2VyTW9kZWwgfVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcblxuLyoqXG4gKiBSZWNvcmRpbmdcbiAqIGdldDogcmVjb3JkaW5nIG1ldGFkYXRhICsgY2FsbGluZyB1c2VyJ3MgbGlzdGVuaW5nIHN0YXR1c1xuICogcG9zdDogY3JlYXRlIG5ldyByZWNvcmRpbmdcbiAqIHB1dDogdXBkYXRlIHJlY29yZGluZyBtZXRhZGF0YVxuICovXG5jbGFzcyBRdWlwTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpZDogMCwgLy8gZ3VpZFxuICAgICAgICAgICAgcHJvZ3Jlc3M6IDAsIC8vIFswLTEwMF0gcGVyY2VudGFnZVxuICAgICAgICAgICAgcG9zaXRpb246IDAsIC8vIHNlY29uZHNcbiAgICAgICAgICAgIGR1cmF0aW9uOiAwLCAvLyBzZWNvbmRzXG4gICAgICAgICAgICBpc1B1YmxpYzogZmFsc2VcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICAgICAgc3VwZXIob3B0cyk7XG5cbiAgICAgICAgdGhpcy51cmxSb290ID0gXCIvYXBpL3F1aXBzXCI7XG5cbiAgICAgICAgLy8gc2F2ZSBsaXN0ZW5pbmcgcHJvZ3Jlc3MgYXQgbW9zdCBldmVyeSAzIHNlY29uZHNcbiAgICAgICAgdGhpcy50aHJvdHRsZWRTYXZlID0gXy50aHJvdHRsZSh0aGlzLnNhdmUsIDMwMDApO1xuICAgIH1cbn1cblxuY2xhc3MgTXlRdWlwQ29sbGVjdGlvbiBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb24ge1xuICAgIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICAgICAgc3VwZXIob3B0cyk7XG4gICAgICAgIHRoaXMubW9kZWwgPSBRdWlwTW9kZWw7XG4gICAgICAgIHRoaXMudXJsID0gXCIvYXBpL3F1aXBzXCI7XG4gICAgfVxufVxuXG5leHBvcnQgeyBRdWlwTW9kZWwsIE15UXVpcENvbGxlY3Rpb24gfVxuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcImNvbXBpbGVyXCI6WzcsXCI+PSA0LjAuMFwiXSxcIm1haW5cIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcImNoYW5nZWxvZ1xcXCI+XFxuICAgIDxoMj5DaGFuZ2Vsb2c8L2gyPlxcblxcbiAgICA8aDM+MjAxNi0wMS0wMTwvaDM+XFxuICAgIDxwPlxcbiAgICAgICAgUmVmYWN0b3JlZCBQeXRob24gYW5kIEJhY2tib25lIGNvZGViYXNlIHRvIGJlIHNpbXBsZXIsIG9yZ2FuaXplZCBieS1mZWF0dXJlLCBtb3JlIE1WQ2lzaC5cXG4gICAgICAgIFNob3VsZCBtYWtlIGl0IGVhc2llciBhbmQgbW9yZSBwbGVhc2FudCB0byBhZGQgbmV3IGZlYXR1cmVzLlxcbiAgICAgICAgVG9vayBhYm91dCBhIG1vbnRoIHRvIHBheSBkb3duIGEgbG90IG9mIGV4aXN0aW5nIGRlYnQgYW5kIGJyZWF0aGUgc29tZSBuZXcgZXhjaXRlbWVudCBpbnRvIHRoZSBjb2RlYmFzZS5cXG4gICAgPC9wPlxcbiAgICA8cD5PaCwgYW5kIHN0YXJ0ZWQgd29ya2luZyBvbiBTdHJlYW1zL0dyb3VwcyBzdXBwb3J0ISA6KTwvcD5cXG5cXG4gICAgPGgzPjIwMTUtMTItMDU8L2gzPlxcblxcbiAgICA8cD5EYXJrLXRoZW1lIHdpdGggdW5zcGxhc2guY29tIGJnIC0gYmVjYXVzZSBJIG9mdGVuIHdvcmsgb24gdGhpcyBsYXRlIGF0IG5pZ2h0LjwvcD5cXG5cXG4gICAgPHA+TW9yZSBtb2JpbGUgZnJpZW5kbHkgZGVzaWduLjwvcD5cXG5cXG4gICAgPHA+XFxuICAgICAgICBTdG9wcGVkIHRyeWluZyB0byBnZXQgYXVkaW8tcmVjb3JkaW5nIHRvIHdvcmsgd2VsbCBvbiBBbmRyb2lkIDQueCBhZnRlciBidXJuZWluZyBtYW55IHdlZWtlbmRzIGFuZCBuaWdodHMuXFxuICAgICAgICBUaGUgYXVkaW8gZ2xpdGNoZXMgZXZlbiB3aGVuIHJlY29yZGluZyBwdXJlIFBDTSwgYSBwcm9ibGVtIGF0IHRoZSBXZWIgQXVkaW8gbGV2ZWwsIG5vdGhpbmcgSSBjYW4gZG8gYWJvdXQgaXQuXFxuICAgIDwvcD5cXG5cXG4gICAgPHA+XFxuICAgICAgICBGb3VuZCBhIGZ1biB3b3JrYXJvdW5kIG1vYmlsZSBjaHJvbWUncyBpbmFiaWxpdHkgdG8gcGxheSBXZWIgQXVkaW8gcmVjb3JkZWQgd2F2ZSBmaWxlczpcXG4gICAgICAgIHJ1biB0aGUgZ2VuZXJhdGVkIGJsb2JzIHRocm91Z2ggYW4gYWpheCByZXF1ZXN0LCBtYWtpbmcgdGhlIGJsb2IgZGlzay1iYWNrZWQgbG9jYWxseSwgbm93IHRoZSBsb2NhbCBibG9iXFxuICAgICAgICBjYW4gYmUgcGFzc2VkIGludG8gYW4gJmx0O2F1ZGlvJmd0OyBwbGF5ZXIuXFxuICAgIDwvcD5cXG5cXG4gICAgPHA+Rm9jdXNpbmcgb24gbWFraW5nIHRoZSBtb2JpbGUgbGlzdGVuaW5nIGV4cGVyaWVuY2UgZ3JlYXQuPC9wPlxcblxcbiAgICA8aDM+MjAxNS0xMC0wNDwvaDM+XFxuXFxuICAgIDxwPlNsaWdodCBmYWNlbGlmdCwgdXNpbmcgYSBuZXcgZmxhdCBzdHlsZS4gQWRkZWQgYSBmZXcgYW5pbWF0aW9ucyBhbmQgdGhpcyBwdWJsaWMgY2hhbmdlbG9nISA6KTwvcD5cXG5cXG4gICAgPGgzPjIwMTUtMDktMjY8L2gzPlxcblxcbiAgICA8cD5EZXNpZ25lZCBhIGxvZ28gYW5kIGNyZWF0ZWQgYSBwcmV0dHkgbGFuZGluZy1wYWdlIHdpdGggdHdpdHRlci1sb2dpbi48L3A+XFxuXFxuICAgIDxwPkFkZGVkIFNlbnRyeSBmb3IgSmF2YXNjcmlwdCBlcnJvciBjb2xsZWN0aW9uIGFuZCBIZWFwIEFuYWx5dGljcyBmb3IgY3JlYXRpbmcgYWQtaG9jIGFuYWx5dGljcy48L3A+XFxuXFxuICAgIDxoMz4yMDE1LTA5LTIwPC9oMz5cXG5cXG4gICAgPHA+U2V0dXAgdHdvIG5ldyBzZXJ2ZXJzIG9uIERpZ2l0YWwgT2NlYW5zIHdpdGggUm91dGUgNTMgcm91dGluZyBhbmQgYW4gU1NMIGNlcnRpZmljYXRlIGZvciBwcm9kdWN0aW9uLlxcbiAgICAgICAgSGF2aW5nIGFuIFNTTCBjZXJ0aWZpY2F0ZSBtZWFucyB0aGUgc2l0ZSBjYW4gYmUgYWNjZXNzZWQgdmlhIEhUVFBTIHdoaWNoIGFsbG93cyBicm93c2Vyc1xcbiAgICAgICAgdG8gY2FjaGUgdGhlIE1pY3JvcGhvbmUgQWNjZXNzIHBlcm1pc3Npb25zLCB3aGljaCBtZWFucyB5b3UgZG9uJ3QgaGF2ZSB0byBjbGljayBcXFwiYWxsb3dcXFwiIGV2ZXJ5IHRpbWVcXG4gICAgICAgIHlvdSB3YW50IHRvIG1ha2UgYSByZWNvcmRpbmchPC9wPlxcblxcbiAgICA8cD5GaXhlZCB1cCBQeXRob24gRmFicmljIGRlcGxveW1lbnQgc2NyaXB0IHRvIHdvcmsgaW4gbmV3IHN0YWdpbmcgKyBwcm9kdWN0aW9uIGVudmlyb25tZW50cy5cXG4gICAgICAgIEFuZCBhZGRlZCBNb25nb0RCIGJhY2t1cC9yZXN0b3JlIHN1cHBvcnQuPC9wPlxcblxcbiAgICA8cD5VcGRhdGVkIFB5dGhvbiBkZXBlbmRlbmNpZXMsIHRoZXkgd2VyZSBvdmVyIGEgeWVhciBvbGQsIGFuZCBmaXhlZCBjb2RlIHRoYXQgYnJva2UgYXMgYSByZXN1bHQuXFxuICAgICAgICBNb3N0bHkgYXJvdW5kIGNoYW5nZXMgdG8gTW9uZ29FbmdpbmUgUHl0aG9uIGxpYi48L3A+XFxuXFxuICAgIDxoMz4yMDE1LTA5LTA1PC9oMz5cXG5cXG4gICAgPHA+Rml4ZWQgcHJvamVjdCB0byB3b3JrIG9uIE9TWCBhbmQgd2l0aG91dCB0aGUgTkdJTlggZGVwZW5kZW5jeS4gSSBjYW4gbm93IHJ1biBpdCBhbGwgaW4gcHl0aG9uLFxcbiAgICAgICAgaW5jbHVkaW5nIHRoZSBzdGF0aWMgZmlsZSBob3N0aW5nLiBUaGUgcHJvZHVjdGlvbiBzZXJ2ZXJzIHVzZSBOR0lOWCBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlLjwvcD5cXG5cXG4gICAgPGgzPjIwMTQtMDMtMjk8L2gzPlxcblxcbiAgICA8cD5SZXF1ZXN0IE1lZGlhIFN0cmVhbWluZyBwZXJtaXNzaW9uIGZyb20gYnJvd3NlciBvbiByZWNvcmRpbmctcGFnZSBsb2FkLiBUaGlzIG1ha2VzIHRoZSBtaWNyb3Bob25lXFxuICAgICAgICBhdmFpbGFibGUgdGhlIGluc3RhbnQgeW91IGhpdCB0aGUgcmVjb3JkIGJ1dHRvbi4gTm8gbmVlZCB0byBoaXQgcmVjb3JkIGJ1dHRvbiBhbmQgdGhlbiBkZWFsIHdpdGggYnJvd3NlcidzXFxuICAgICAgICBzZWN1cml0eSBwb3B1cHMgYXNraW5nIGZvciBwZXJtaXNzaW9uIHRvIGFjY2VzcyBtaWNyb3Bob25lLjwvcD5cXG5cXG4gICAgPHA+UmVtb3ZlZCBjb3VudGRvd24gY2xvY2sgdW50aWxsIHJlY29yZGluZyBiZWdpbnMsIHRoZSBcXFwiMy0yLTEgZ29cXFwiIHdhc24ndCB0aGF0IGhlbHBmdWwuPC9wPlxcblxcbiAgICA8aDM+MjAxNC0wMy0yNzwvaDM+XFxuXFxuICAgIDxwPkZpeGVkIGJ1ZyBpbiB0cmFja2luZyB3aGVyZSB5b3UgcGF1c2VkIGluIHRoZSBwbGF5YmFjayBvZiBhIHJlY29yZGluZy4gTm93IHlvdSBzaG91bGQgYmUgYWJsZSB0b1xcbiAgICAgICAgcmVzdW1lIHBsYXliYWNrIGV4YWN0bHkgd2hlcmUgeW91IGxlZnQgb2ZmLiA6KTwvcD5cXG5cXG48L2Rpdj5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL0NoYW5nZWxvZ1ZpZXcuaGJzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDaGFuZ2Vsb2dWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJJbml0aWFsaXppbmcgY2hhbmdlbG9nIHZpZXdcIik7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlbmRlcmluZyBjaGFuZ2Vsb2cgdmlld1wiKTtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0ZW1wbGF0ZSgpKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgKiBhcyBWaWV3cyBmcm9tICcuL1ZpZXdzJ1xuXG5pbXBvcnQgU3RyZWFtQ29udHJvbGxlciBmcm9tICcuL1N0cmVhbXMvU3RyZWFtQ29udHJvbGxlci5qcydcbmltcG9ydCBSZWNvcmRlckNvbnRyb2xsZXIgZnJvbSAnLi9SZWNvcmRlci9SZWNvcmRlckNvbnRyb2xsZXInXG5cbmV4cG9ydCBjbGFzcyBIb21lQ29udHJvbGxlciB7XG4gICAgY29uc3RydWN0b3IocHJlc2VudGVyKSB7XG4gICAgICAgIHByZXNlbnRlci5zd2l0Y2hWaWV3KG5ldyBWaWV3cy5Ib21lcGFnZVZpZXcoKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVXNlckNvbnRyb2xsZXIge1xuICAgIGNvbnN0cnVjdG9yKHByZXNlbnRlciwgdXNlcm5hbWUpIHtcbiAgICAgICAgcHJlc2VudGVyLnN3aXRjaFZpZXcobmV3IFZpZXdzLlVzZXJQb2RDb2xsZWN0aW9uVmlldyh1c2VybmFtZSkpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIENoYW5nZWxvZ0NvbnRyb2xsZXIge1xuICAgIGNvbnN0cnVjdG9yKHByZXNlbnRlcikge1xuICAgICAgICBwcmVzZW50ZXIuc3dpdGNoVmlldyhuZXcgVmlld3MuQ2hhbmdlbG9nVmlldygpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTaW5nbGVQb2RDb250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihwcmVzZW50ZXIsIGlkKSB7XG4gICAgICAgIHByZXNlbnRlci5zd2l0Y2hWaWV3KG5ldyBWaWV3cy5Vc2VyUG9kVmlldyhpZCkpO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgU3RyZWFtQ29udHJvbGxlciwgUmVjb3JkZXJDb250cm9sbGVyIH1cbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls3LFwiPj0gNC4wLjBcIl0sXCJtYWluXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJtLW1pY3JvcGhvbmUtcmVxdWlyZWRcXFwiPlxcbiAgICA8aDI+TWljcm9waG9uZSByZXF1aXJlZC48L2gyPlxcbjwvZGl2PlxcblwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJ1xuaW1wb3J0IHsgQXVkaW9DYXB0dXJlIH0gZnJvbSAnLi4vLi4vYXVkaW8tY2FwdHVyZSdcbmltcG9ydCB7IENyZWF0ZVJlY29yZGluZ01vZGVsIH0gZnJvbSAnLi4vLi4vbW9kZWxzL0NyZWF0ZVJlY29yZGluZ01vZGVsJ1xuXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9HZXRNaWNyb3Bob25lLmhicydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR2V0TWljcm9waG9uZVZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHt9XG4gICAgfVxuXG4gICAgZXZlbnRzKCkge1xuICAgICAgICByZXR1cm4ge31cbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVuZGVyaW5nIHJlY29yZGVyIGNvbnRyb2xcIik7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGVtcGxhdGUodGhpcy5tb2RlbC50b0pTT04oKSkpO1xuICAgIH1cblxuICAgIGJ1aWxkKG1vZGVsKSB7XG4gICAgICAgIHRoaXMubW9kZWwgPSBtb2RlbDtcblxuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZSA9IG5ldyBBdWRpb0NhcHR1cmUoKTtcblxuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlY29yZGVkLXByZXZpZXdcIik7XG4gICAgICAgIGlmICh0aGlzLmF1ZGlvUGxheWVyID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiY2FuIHBsYXkgdm9yYmlzOiBcIiwgISF0aGlzLmF1ZGlvUGxheWVyLmNhblBsYXlUeXBlICYmIFwiXCIgIT0gdGhpcy5hdWRpb1BsYXllci5jYW5QbGF5VHlwZSgnYXVkaW8vb2dnOyBjb2RlY3M9XCJ2b3JiaXNcIicpKTtcblxuICAgICAgICAvL3RoaXMuYXVkaW9QbGF5ZXIubG9vcCA9IFwibG9vcFwiO1xuICAgICAgICAvL3RoaXMuYXVkaW9QbGF5ZXIuYXV0b3BsYXkgPSBcImF1dG9wbGF5XCI7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCIvYXNzZXRzL3NvdW5kcy9iZWVwX3Nob3J0X29uLm9nZ1wiO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcblxuICAgICAgICB0aGlzLm1vZGVsLm9uKCdjaGFuZ2U6cmVjb3JkaW5nVGltZScsIGZ1bmN0aW9uIChtb2RlbCwgdGltZSkge1xuICAgICAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS50ZXh0KHRpbWUpO1xuICAgICAgICB9KVxuXG4gICAgICAgIC8vIGF0dGVtcHQgdG8gZmV0Y2ggbWVkaWEtc3RyZWFtIG9uIHBhZ2UtbG9hZFxuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZS5ncmFiTWljcm9waG9uZShvbk1pY3JvcGhvbmVHcmFudGVkLCBvbk1pY3JvcGhvbmVEZW5pZWQpO1xuICAgIH1cblxuICAgIG9uTWljcm9waG9uZURlbmllZCgpIHtcbiAgICAgICAgLy8gc2hvdyBzY3JlZW4gYXNraW5nIHVzZXIgZm9yIHBlcm1pc3Npb25cbiAgICB9XG5cbiAgICBvbk1pY3JvcGhvbmVHcmFudGVkKCkge1xuICAgICAgICAvLyBzaG93IHJlY29yZGVyXG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZShvcHRpb25zKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXJWaWV3IGluaXRcIik7XG4gICAgICAgIG5ldyBDcmVhdGVSZWNvcmRpbmdNb2RlbCgpLmZldGNoKClcbiAgICAgICAgICAgIC50aGVuKG1vZGVsID0+IHRoaXMuYnVpbGQobmV3IENyZWF0ZVJlY29yZGluZ01vZGVsKG1vZGVsKSkpO1xuXG5cbiAgICAgICAgLy8gVE9ETzogYSBwcmV0dHkgYWR2YW5jZWQgYnV0IG5lYXQgZmVhdHVyZSBtYXkgYmUgdG8gc3RvcmUgYSBiYWNrdXAgY29weSBvZiBhIHJlY29yZGluZyBsb2NhbGx5IGluIGNhc2Ugb2YgYSBjcmFzaCBvciB1c2VyLWVycm9yXG4gICAgICAgIC8qXG4gICAgICAgICAvLyBjaGVjayBob3cgbXVjaCB0ZW1wb3Jhcnkgc3RvcmFnZSBzcGFjZSB3ZSBoYXZlLiBpdCdzIGEgZ29vZCB3YXkgdG8gc2F2ZSByZWNvcmRpbmcgd2l0aG91dCBsb3NpbmcgaXRcbiAgICAgICAgIHdpbmRvdy53ZWJraXRTdG9yYWdlSW5mby5xdWVyeVVzYWdlQW5kUXVvdGEoXG4gICAgICAgICB3ZWJraXRTdG9yYWdlSW5mby5URU1QT1JBUlksXG4gICAgICAgICBmdW5jdGlvbih1c2VkLCByZW1haW5pbmcpIHtcbiAgICAgICAgIHZhciBybWIgPSAocmVtYWluaW5nIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoNCk7XG4gICAgICAgICB2YXIgdW1iID0gKHVzZWQgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCg0KTtcbiAgICAgICAgIGNvbnNvbGUubG9nKFwiVXNlZCBxdW90YTogXCIgKyB1bWIgKyBcIm1iLCByZW1haW5pbmcgcXVvdGE6IFwiICsgcm1iICsgXCJtYlwiKTtcbiAgICAgICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCdFcnJvcicsIGUpO1xuICAgICAgICAgfVxuICAgICAgICAgKTtcblxuICAgICAgICAgZnVuY3Rpb24gb25FcnJvckluRlMoKSB7XG4gICAgICAgICB2YXIgbXNnID0gJyc7XG5cbiAgICAgICAgIHN3aXRjaCAoZS5jb2RlKSB7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5RVU9UQV9FWENFRURFRF9FUlI6XG4gICAgICAgICBtc2cgPSAnUVVPVEFfRVhDRUVERURfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuTk9UX0ZPVU5EX0VSUjpcbiAgICAgICAgIG1zZyA9ICdOT1RfRk9VTkRfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuU0VDVVJJVFlfRVJSOlxuICAgICAgICAgbXNnID0gJ1NFQ1VSSVRZX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLklOVkFMSURfTU9ESUZJQ0FUSU9OX0VSUjpcbiAgICAgICAgIG1zZyA9ICdJTlZBTElEX01PRElGSUNBVElPTl9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5JTlZBTElEX1NUQVRFX0VSUjpcbiAgICAgICAgIG1zZyA9ICdJTlZBTElEX1NUQVRFX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICBtc2cgPSAnVW5rbm93biBFcnJvcic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIH1cblxuICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yOiAnICsgbXNnKTtcbiAgICAgICAgIH1cblxuICAgICAgICAgd2luZG93LnJlcXVlc3RGaWxlU3lzdGVtICA9IHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEZpbGVTeXN0ZW07XG5cbiAgICAgICAgIHdpbmRvdy5yZXF1ZXN0RmlsZVN5c3RlbSh3aW5kb3cuVEVNUE9SQVJZLCA1ICogMTAyNCAqIDEwMjQsIGZ1bmN0aW9uIG9uU3VjY2Vzcyhmcykge1xuXG4gICAgICAgICBjb25zb2xlLmxvZygnb3BlbmluZyBmaWxlJyk7XG5cbiAgICAgICAgIGZzLnJvb3QuZ2V0RmlsZShcInRlc3RcIiwge2NyZWF0ZTp0cnVlfSwgZnVuY3Rpb24oZmUpIHtcblxuICAgICAgICAgY29uc29sZS5sb2coJ3NwYXduZWQgd3JpdGVyJyk7XG5cbiAgICAgICAgIGZlLmNyZWF0ZVdyaXRlcihmdW5jdGlvbihmdykge1xuXG4gICAgICAgICBmdy5vbndyaXRlZW5kID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlIGNvbXBsZXRlZCcpO1xuICAgICAgICAgfTtcblxuICAgICAgICAgZncub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZSBmYWlsZWQ6ICcgKyBlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgfTtcblxuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRpbmcgYmxvYiB0byBmaWxlLi4nKTtcblxuICAgICAgICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbJ3llaCB0aGlzIGlzIGEgdGVzdCEnXSwge3R5cGU6ICd0ZXh0L3BsYWluJ30pO1xuICAgICAgICAgZncud3JpdGUoYmxvYik7XG5cbiAgICAgICAgIH0sIG9uRXJyb3JJbkZTKTtcblxuICAgICAgICAgfSwgb25FcnJvckluRlMpO1xuXG4gICAgICAgICB9LCBvbkVycm9ySW5GUyk7XG4gICAgICAgICAqL1xuICAgIH1cblxuICAgIHRvZ2dsZShldmVudCkge1xuICAgICAgICBpZiAodGhpcy5pc1JlY29yZGluZykge1xuICAgICAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5zdG9wUmVjb3JkaW5nKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRSZWNvcmRpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNhbmNlbFJlY29yZGluZyhldmVudCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBjYW5jZWxpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLWZ1bGxcIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLWNvbnRhaW5lclwiKS5yZW1vdmVDbGFzcyhcImZsaXBwZWRcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCJcIjtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCAzKTtcbiAgICB9XG5cbiAgICB1cGxvYWRSZWNvcmRpbmcoZXZlbnQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgdXBsb2FkaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuXG4gICAgICAgICQoXCIjcmVjb3JkZXItZnVsbFwiKS5hZGRDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLnJlbW92ZUNsYXNzKFwiZmxpcHBlZFwiKTtcblxuICAgICAgICB2YXIgZGVzY3JpcHRpb24gPSAkKCd0ZXh0YXJlYVtuYW1lPWRlc2NyaXB0aW9uXScpWzBdLnZhbHVlO1xuXG4gICAgICAgIHZhciBkYXRhID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdkZXNjcmlwdGlvbicsIGRlc2NyaXB0aW9uKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2lzUHVibGljJywgMSk7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdhdWRpby1ibG9iJywgdGhpcy5hdWRpb0Jsb2IpO1xuXG4gICAgICAgIC8vIHNlbmQgcmF3IGJsb2IgYW5kIG1ldGFkYXRhXG5cbiAgICAgICAgLy8gVE9ETzogZ2V0IGEgcmVwbGFjZW1lbnQgYWpheCBsaWJyYXJ5IChtYXliZSBwYXRjaCByZXF3ZXN0IHRvIHN1cHBvcnQgYmluYXJ5PylcbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbigncG9zdCcsICcvcmVjb3JkaW5nL2NyZWF0ZScsIHRydWUpO1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgeGhyLnVwbG9hZC5vbnByb2dyZXNzID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHZhciBwZXJjZW50ID0gKChlLmxvYWRlZCAvIGUudG90YWwpICogMTAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwZXJjZW50YWdlOiBcIiArIHBlcmNlbnQpO1xuICAgICAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5maW5kKFwiLmJhclwiKS5jc3MoJ3dpZHRoJywgcGVyY2VudCk7XG4gICAgICAgIH07XG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5maW5kKFwiLmJhclwiKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IG1hbnVhbCB4aHIgc3VjY2Vzc2Z1bFwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgbWFudWFsIHhociBlcnJvclwiLCB4aHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwieGhyLnJlc3BvbnNlXCIsIHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlc3VsdFwiLCByZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzdWx0LnVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgeGhyLnNlbmQoZGF0YSk7XG4gICAgfVxuXG4gICAgb25SZWNvcmRpbmdUaWNrKCkge1xuICAgICAgICB2YXIgdGltZVNwYW4gPSBwYXJzZUludCgoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gdGhpcy50aW1lclN0YXJ0KSAvIDEwMDApLnRvRml4ZWQoKSk7XG4gICAgICAgIHZhciB0aW1lU3RyID0gdGhpcy5JbnRUb1RpbWUodGltZVNwYW4pO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRpbWVTdHIpO1xuICAgIH1cblxuICAgIG9uQ291bnRkb3duVGljaygpIHtcbiAgICAgICAgaWYgKC0tdGhpcy50aW1lclN0YXJ0ID4gMCkge1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLnRpbWVyU3RhcnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjb3VudGRvd24gaGl0IHplcm8uIGJlZ2luIHJlY29yZGluZy5cIik7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXJJZCk7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRoaXMuSW50VG9UaW1lKDApKTtcbiAgICAgICAgICAgIHRoaXMub25NaWNSZWNvcmRpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN0YXJ0UmVjb3JkaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInN0YXJ0aW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUuc3RhcnQoKCkgPT4gdGhpcy5vbk1pY1JlYWR5KCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1pY3JvcGhvbmUgaXMgcmVhZHkgdG8gcmVjb3JkLiBEbyBhIGNvdW50LWRvd24sIHRoZW4gc2lnbmFsIGZvciBpbnB1dC1zaWduYWwgdG8gYmVnaW4gcmVjb3JkaW5nXG4gICAgICovXG4gICAgb25NaWNSZWFkeSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJtaWMgcmVhZHkgdG8gcmVjb3JkLiBkbyBjb3VudGRvd24uXCIpO1xuICAgICAgICB0aGlzLnRpbWVyU3RhcnQgPSAzO1xuICAgICAgICAvLyBydW4gY291bnRkb3duXG4gICAgICAgIC8vdGhpcy50aW1lcklkID0gc2V0SW50ZXJ2YWwodGhpcy5vbkNvdW50ZG93blRpY2suYmluZCh0aGlzKSwgMTAwMCk7XG5cbiAgICAgICAgLy8gb3IgbGF1bmNoIGNhcHR1cmUgaW1tZWRpYXRlbHlcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLkludFRvVGltZSgwKSk7XG4gICAgICAgIHRoaXMub25NaWNSZWNvcmRpbmcoKTtcblxuICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLmFkZENsYXNzKFwiaXMtdmlzaWJsZVwiKTtcbiAgICB9XG5cbiAgICBvbk1pY1JlY29yZGluZygpIHtcbiAgICAgICAgdGhpcy50aW1lclN0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIHRoaXMudGltZXJJZCA9IHNldEludGVydmFsKHRoaXMub25SZWNvcmRpbmdUaWNrLmJpbmQodGhpcyksIDEwMDApO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLXNjcmVlblwiKS5hZGRDbGFzcyhcImlzLXJlY29yZGluZ1wiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIk1pYyByZWNvcmRpbmcgc3RhcnRlZFwiKTtcblxuICAgICAgICAvLyBUT0RPOiB0aGUgbWljIGNhcHR1cmUgaXMgYWxyZWFkeSBhY3RpdmUsIHNvIGF1ZGlvIGJ1ZmZlcnMgYXJlIGdldHRpbmcgYnVpbHQgdXBcbiAgICAgICAgLy8gd2hlbiB0b2dnbGluZyB0aGlzIG9uLCB3ZSBtYXkgYWxyZWFkeSBiZSBjYXB0dXJpbmcgYSBidWZmZXIgdGhhdCBoYXMgYXVkaW8gcHJpb3IgdG8gdGhlIGNvdW50ZG93blxuICAgICAgICAvLyBoaXR0aW5nIHplcm8uIHdlIGNhbiBkbyBhIGZldyB0aGluZ3MgaGVyZTpcbiAgICAgICAgLy8gMSkgZmlndXJlIG91dCBob3cgbXVjaCBhdWRpbyB3YXMgYWxyZWFkeSBjYXB0dXJlZCwgYW5kIGN1dCBpdCBvdXRcbiAgICAgICAgLy8gMikgdXNlIGEgZmFkZS1pbiB0byBjb3ZlciB1cCB0aGF0IHNwbGl0LXNlY29uZCBvZiBhdWRpb1xuICAgICAgICAvLyAzKSBhbGxvdyB0aGUgdXNlciB0byBlZGl0IHBvc3QtcmVjb3JkIGFuZCBjbGlwIGFzIHRoZXkgd2lzaCAoYmV0dGVyIGJ1dCBtb3JlIGNvbXBsZXggb3B0aW9uISlcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmF1ZGlvQ2FwdHVyZS50b2dnbGVNaWNyb3Bob25lUmVjb3JkaW5nKHRydWUpLCA1MDApO1xuICAgIH1cblxuICAgIHN0b3BSZWNvcmRpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3RvcHBpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXJJZCk7XG5cbiAgICAgICAgLy8gcGxheSBzb3VuZCBpbW1lZGlhdGVseSB0byBieXBhc3MgbW9iaWxlIGNocm9tZSdzIFwidXNlciBpbml0aWF0ZWQgbWVkaWFcIiByZXF1aXJlbWVudFxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiL2Fzc2V0cy9zb3VuZHMvYmVlcF9zaG9ydF9vbi5vZ2dcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG5cbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUuc3RvcCgoYmxvYikgPT4gdGhpcy5vblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSk7XG5cbiAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS5yZW1vdmVDbGFzcyhcImlzLXZpc2libGVcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctc2NyZWVuXCIpLnJlbW92ZUNsYXNzKFwiaXMtcmVjb3JkaW5nXCIpO1xuXG4gICAgICAgIC8vIFRPRE86IGFuaW1hdGUgcmVjb3JkZXIgb3V0XG4gICAgICAgIC8vIFRPRE86IGFuaW1hdGUgdXBsb2FkZXIgaW5cbiAgICB9XG5cbiAgICBvblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IHByZXZpZXdpbmcgcmVjb3JkZWQgYXVkaW9cIik7XG4gICAgICAgIHRoaXMuYXVkaW9CbG9iID0gYmxvYjtcbiAgICAgICAgdGhpcy5zaG93Q29tcGxldGlvblNjcmVlbigpO1xuICAgIH1cblxuICAgIHBsYXlQcmV2aWV3KCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInBsYXlpbmcgcHJldmlldy4uXCIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImF1ZGlvIGJsb2JcIiwgdGhpcy5hdWRpb0Jsb2IpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImF1ZGlvIGJsb2IgdXJsXCIsIHRoaXMuYXVkaW9CbG9iVXJsKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSB0aGlzLmF1ZGlvQmxvYlVybDtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgfVxuXG4gICAgc2hvd0NvbXBsZXRpb25TY3JlZW4oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IGZsaXBwaW5nIHRvIGF1ZGlvIHBsYXliYWNrXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQmxvYlVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHRoaXMuYXVkaW9CbG9iKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikuYWRkQ2xhc3MoXCJmbGlwcGVkXCIpO1xuXG4gICAgICAgIC8vIEhBQ0s6IHJvdXRlIGJsb2IgdGhyb3VnaCB4aHIgdG8gbGV0IEFuZHJvaWQgQ2hyb21lIHBsYXkgYmxvYnMgdmlhIDxhdWRpbz5cbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbignR0VUJywgdGhpcy5hdWRpb0Jsb2JVcmwsIHRydWUpO1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InO1xuICAgICAgICB4aHIub3ZlcnJpZGVNaW1lVHlwZSgnYXVkaW8vb2dnJyk7XG5cbiAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCAmJiB4aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgIHZhciB4aHJCbG9iVXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoeGhyLnJlc3BvbnNlKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGVkIGJsb2IgZnJvbSBjYWNoZSB1cmw6IFwiICsgdGhpcy5hdWRpb0Jsb2JVcmwpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUm91dGVkIGludG8gYmxvYiB1cmw6IFwiICsgeGhyQmxvYlVybCk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHhockJsb2JVcmw7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhoci5zZW5kKCk7XG4gICAgfVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWljcm9waG9uZVBlcm1pc3Npb25zIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5taWNyb3Bob25lTWVkaWFTdHJlYW0gPSBudWxsO1xuICAgIH1cblxuICAgIGhhdmVNaWNyb3Bob25lKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5taWNyb3Bob25lTWVkaWFTdHJlYW0gIT0gbnVsbCA/IHRydWUgOiBmYWxzZTtcbiAgICB9XG5cbiAgICBzZXRNaWNyb3Bob25lKG1zKSB7XG4gICAgICAgIHRoaXMubWljcm9waG9uZU1lZGlhU3RyZWFtID0gbXM7XG4gICAgfVxuXG4gICAgZ3JhYk1pY3JvcGhvbmUob25NaWNyb3Bob25lR3JhbnRlZCwgb25NaWNyb3Bob25lRGVuaWVkKSB7XG4gICAgICAgIGlmICh0aGlzLmhhdmVNaWNyb3Bob25lKCkpIHtcbiAgICAgICAgICAgIG9uTWljcm9waG9uZUdyYW50ZWQoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZVxuICAgICAgICAgICAgLmdldFVzZXJNZWRpYSh7YXVkaW86IHRydWV9KVxuICAgICAgICAgICAgLnRoZW4oKG1zKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRNaWNyb3Bob25lKG1zKTtcbiAgICAgICAgICAgICAgICBvbk1pY3JvcGhvbmVHcmFudGVkKG1zKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQXVkaW9DYXB0dXJlOjpzdGFydCgpOyBjb3VsZCBub3QgZ3JhYiBtaWNyb3Bob25lLiBwZXJoYXBzIHVzZXIgZGlkbid0IGdpdmUgdXMgcGVybWlzc2lvbj9cIik7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGVycik7XG4gICAgICAgICAgICAgICAgb25NaWNyb3Bob25lRGVuaWVkKGVycik7XG4gICAgICAgICAgICB9KVxuICAgIH1cbn1cbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCJjb21waWxlclwiOls3LFwiPj0gNC4wLjBcIl0sXCJtYWluXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJtLXN0cmVhbS1kZXRhaWxzXFxcIj5cXG4gICAgPGgxPlN0cmVhbSBEZXRhaWxzPC9oMT5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJnLXF1aXBzLWxpc3RcXFwiPlxcbjwvZGl2PlxcblwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgUXVpcFZpZXcgZnJvbSAnLi4vLi4vcGFydGlhbHMvUXVpcFZpZXcuanMnXG5pbXBvcnQgeyBBdWRpb1BsYXllciB9IGZyb20gJy4uLy4uL3BhcnRpYWxzL0F1ZGlvUGxheWVyVmlldydcbmltcG9ydCB7IFF1aXBNb2RlbCwgTXlRdWlwQ29sbGVjdGlvbiB9IGZyb20gJy4uLy4uL21vZGVscy9RdWlwJ1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vSG9tZXBhZ2UuaGJzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIb21lcGFnZVZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBuZXcgTXlRdWlwQ29sbGVjdGlvbigpLmZldGNoKCkudGhlbihxdWlwcyA9PiB0aGlzLm9uUXVpcHNMb2FkZWQocXVpcHMpKVxuICAgIH1cblxuICAgIHNodXRkb3duKCkge1xuICAgICAgICBpZiAodGhpcy5xdWlwVmlld3MgIT0gbnVsbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgcXVpcCBvZiB0aGlzLnF1aXBWaWV3cykge1xuICAgICAgICAgICAgICAgIHF1aXAuc2h1dGRvd24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCJwYXVzZVwiKTtcbiAgICB9XG5cbiAgICBvblF1aXBzTG9hZGVkKHF1aXBzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibG9hZGVkIHF1aXBzXCIsIHF1aXBzKTtcblxuICAgICAgICB0aGlzLnF1aXBWaWV3cyA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIHF1aXAgb2YgcXVpcHMpIHtcbiAgICAgICAgICAgIHZhciBxdWlwVmlldyA9IG5ldyBRdWlwVmlldyh7bW9kZWw6IG5ldyBRdWlwTW9kZWwocXVpcCl9KTtcbiAgICAgICAgICAgIHRoaXMucXVpcFZpZXdzLnB1c2gocXVpcFZpZXcpO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKHF1aXBWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0ZW1wbGF0ZSgpKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgTWljcm9waG9uZVBlcm1pc3Npb25zIGZyb20gJy4uL0dldE1pY3JvcGhvbmUvTWljcm9waG9uZVBlcm1pc3Npb25zJ1xuaW1wb3J0IFJlY29yZGVyVmlldyBmcm9tICcuL1JlY29yZGVyVmlldydcbmltcG9ydCBHZXRNaWNyb3Bob25lVmlldyBmcm9tICcuLi9HZXRNaWNyb3Bob25lL0dldE1pY3JvcGhvbmVWaWV3J1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSZWNvcmRlckNvbnRyb2xsZXIge1xuICAgIGNvbnN0cnVjdG9yKHByZXNlbnRlcikge1xuICAgICAgICB0aGlzLnByZXNlbnRlciA9IHByZXNlbnRlcjtcbiAgICAgICAgbmV3IE1pY3JvcGhvbmVQZXJtaXNzaW9ucygpXG4gICAgICAgICAgICAuZ3JhYk1pY3JvcGhvbmUoKG1zKSA9PiB0aGlzLm9uTWljcm9waG9uZUFjcXVpcmVkKG1zKSwgKCkgPT4gdGhpcy5vbk1pY3JvcGhvbmVEZW5pZWQoKSk7XG4gICAgfVxuXG4gICAgb25NaWNyb3Bob25lQWNxdWlyZWQobWljcm9waG9uZU1lZGlhU3RyZWFtKSB7XG4gICAgICAgIHRoaXMucHJlc2VudGVyLnN3aXRjaFZpZXcobmV3IFJlY29yZGVyVmlldyhtaWNyb3Bob25lTWVkaWFTdHJlYW0pKTtcbiAgICB9XG5cbiAgICBvbk1pY3JvcGhvbmVEZW5pZWQoKSB7XG4gICAgICAgIHRoaXMucHJlc2VudGVyLnN3aXRjaFZpZXcobmV3IEdldE1pY3JvcGhvbmVWaWV3KCkpO1xuICAgIH1cbn1cbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCJcIjtcbn0sXCIzXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCIgICAgICAgIDxkaXYgY2xhc3M9XFxcIm0tcmVjb3JkaW5nLW1vdGl2YXRpb25cXFwiPlxcbiAgICAgICAgICAgIDxoMT5SZWNvcmQgeW91ciBmaXJzdCBwb2RjYXN0LjwvaDE+XFxuXFxuICAgICAgICAgICAgPHA+VGFrZXMgb25seSAzMCBzZWNvbmRzLjwvcD5cXG4gICAgICAgIDwvZGl2PlxcblwiO1xufSxcImNvbXBpbGVyXCI6WzcsXCI+PSA0LjAuMFwiXSxcIm1haW5cIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuIFwiPGF1ZGlvIGlkPVxcXCJyZWNvcmRlZC1wcmV2aWV3XFxcIiBjb250cm9scz1cXFwiY29udHJvbHNcXFwiPjwvYXVkaW8+XFxuXFxuPGRpdiBjbGFzcz1cXFwibS1xdWlwcy1zYW1wbGUtbGlzdGluZ1xcXCI+XFxuXCJcbiAgICArICgoc3RhY2sxID0gaGVscGVyc1tcImlmXCJdLmNhbGwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAgOiB7fSwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAubnVtX3JlY29yZGluZ3MgOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOmNvbnRhaW5lci5wcm9ncmFtKDEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOmNvbnRhaW5lci5wcm9ncmFtKDMsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcIm0tcmVjb3JkaW5nLWNvbnRhaW5lclxcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImNhcmRcXFwiPlxcblxcbiAgICAgICAgPGRpdiBpZD1cXFwicmVjb3JkZXItZnVsbFxcXCIgY2xhc3M9XFxcIm0tcmVjb3JkaW5nLXNjcmVlbiBmYWNlXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IHRpdGxlPVxcXCJ0b2dnbGUgcmVjb3JkaW5nXFxcIiBjbGFzcz1cXFwicmVjb3JkaW5nLXRvZ2dsZVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLW1pY3JvcGhvbmVcXFwiPjwvaT48L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJyZWNvcmRpbmctdGltZVxcXCI+MzwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IGlkPVxcXCJyZWNvcmRlci11cGxvYWRlclxcXCIgY2xhc3M9XFxcIm0tcmVjb3JkaW5nLXVwbG9hZGluZyBmYWNlIGRpc2FibGVkXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJ1cGxvYWQtcHJvZ3Jlc3NcXFwiPlxcbiAgICAgICAgICAgICAgICA8aDQ+VXBsb2FkaW5nPC9oND5cXG5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwicHJvZ3Jlc3MtYmFyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImJhclxcXCI+PC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IGlkPVxcXCJyZWNvcmRlci1kb25lXFxcIiBjbGFzcz1cXFwibS1yZWNvcmRpbmctcHJldmlldyBmYWNlIGJhY2tcXFwiPlxcbiAgICAgICAgICAgIDxoMT5Qb3N0IE5ldyBSZWNvcmRpbmc8L2gxPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcInN0YXRzXFxcIj5cXG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLXBsYXktY2lyY2xlXFxcIj48L2k+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJkdXJhdGlvblxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImRlc2NyaXB0aW9uXFxcIj5cXG4gICAgICAgICAgICAgICAgPHRleHRhcmVhIG5hbWU9XFxcImRlc2NyaXB0aW9uXFxcIiBwbGFjZWhvbGRlcj1cXFwib3B0aW9uYWwgZGVzY3JpcHRpb25cXFwiPjwvdGV4dGFyZWE+XFxuICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiY29udHJvbHNcXFwiPlxcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cXFwic3F1YXJlLWJ0biBidG4tcHJpbWFyeVxcXCIgaWQ9XFxcInVwbG9hZC1yZWNvcmRpbmdcXFwiPlVwbG9hZDwvYT5cXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XFxcInNxdWFyZS1idG4gYnRuLWRlZmF1bHRcXFwiIGlkPVxcXCJwcmV2aWV3LWJ0blxcXCI+UHJldmlldzwvYT5cXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XFxcInNxdWFyZS1idG4gYnRuLWxpbmtcXFwiIGlkPVxcXCJjYW5jZWwtcmVjb3JkaW5nXFxcIj5EZWxldGUgYW5kIFRyeSBBZ2FpbjwvYT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICA8L2Rpdj5cXG5cXG48L2Rpdj5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL1JlY29yZGVyVmlldy5oYnMnXG5cbmltcG9ydCBRdWlwVmlldyBmcm9tICcuLi8uLi9wYXJ0aWFscy9RdWlwVmlldy5qcydcbmltcG9ydCB7IEF1ZGlvQ2FwdHVyZSB9IGZyb20gJy4uLy4uL2F1ZGlvLWNhcHR1cmUnXG5pbXBvcnQgeyBDcmVhdGVSZWNvcmRpbmdNb2RlbCB9IGZyb20gJy4uLy4uL21vZGVscy9DcmVhdGVSZWNvcmRpbmdNb2RlbCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVjb3JkZXJWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgLy8gICAgZWw6ICcubS1yZWNvcmRpbmctY29udGFpbmVyJyxcblxuICAgIEludFRvVGltZSh2YWx1ZSkge1xuICAgICAgICB2YXIgbWludXRlcyA9IE1hdGguZmxvb3IodmFsdWUgLyA2MCk7XG4gICAgICAgIHZhciBzZWNvbmRzID0gTWF0aC5yb3VuZCh2YWx1ZSAtIG1pbnV0ZXMgKiA2MCk7XG5cbiAgICAgICAgcmV0dXJuIChcIjAwXCIgKyBtaW51dGVzKS5zdWJzdHIoLTIpICsgXCI6XCIgKyAoXCIwMFwiICsgc2Vjb25kcykuc3Vic3RyKC0yKTtcbiAgICB9XG5cbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGF1ZGlvQ2FwdHVyZTogbnVsbCxcbiAgICAgICAgICAgIGF1ZGlvQmxvYjogbnVsbCxcbiAgICAgICAgICAgIGF1ZGlvQmxvYlVybDogbnVsbCxcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsLFxuICAgICAgICAgICAgaXNSZWNvcmRpbmc6IGZhbHNlLFxuICAgICAgICAgICAgdGltZXJJZDogMCxcbiAgICAgICAgICAgIHRpbWVyU3RhcnQ6IDNcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGV2ZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwiY2xpY2sgLnJlY29yZGluZy10b2dnbGVcIjogXCJ0b2dnbGVcIixcbiAgICAgICAgICAgIFwiY2xpY2sgI2NhbmNlbC1yZWNvcmRpbmdcIjogXCJjYW5jZWxSZWNvcmRpbmdcIixcbiAgICAgICAgICAgIFwiY2xpY2sgI3VwbG9hZC1yZWNvcmRpbmdcIjogXCJ1cGxvYWRSZWNvcmRpbmdcIixcbiAgICAgICAgICAgIFwiY2xpY2sgI3ByZXZpZXctYnRuXCI6IFwicGxheVByZXZpZXdcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICB0aGlzLiRlbC5odG1sKHRlbXBsYXRlKHRoaXMubW9kZWwudG9KU09OKCkpKTtcbiAgICB9XG5cbiAgICBidWlsZChtb2RlbCkge1xuICAgICAgICB0aGlzLm1vZGVsID0gbW9kZWw7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJtb2RlbFwiLCBtb2RlbCk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcblxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRlZC1wcmV2aWV3XCIpO1xuICAgICAgICBpZiAodGhpcy5hdWRpb1BsYXllciA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY2FuIHBsYXkgdm9yYmlzOiBcIiwgISF0aGlzLmF1ZGlvUGxheWVyLmNhblBsYXlUeXBlICYmIFwiXCIgIT0gdGhpcy5hdWRpb1BsYXllci5jYW5QbGF5VHlwZSgnYXVkaW8vb2dnOyBjb2RlY3M9XCJ2b3JiaXNcIicpKTtcblxuICAgICAgICAvLyBwbGF5IGEgYmVlcFxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiL2Fzc2V0cy9zb3VuZHMvYmVlcF9zaG9ydF9vbi5vZ2dcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG5cbiAgICAgICAgdGhpcy5tb2RlbC5vbignY2hhbmdlOnJlY29yZGluZ1RpbWUnLCBmdW5jdGlvbiAobW9kZWwsIHRpbWUpIHtcbiAgICAgICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikudGV4dCh0aW1lKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKG1pY3JvcGhvbmVNZWRpYVN0cmVhbSkge1xuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZSA9IG5ldyBBdWRpb0NhcHR1cmUobWljcm9waG9uZU1lZGlhU3RyZWFtKTtcblxuICAgICAgICBuZXcgQ3JlYXRlUmVjb3JkaW5nTW9kZWwoKS5mZXRjaCgpXG4gICAgICAgICAgICAudGhlbihtb2RlbCA9PiB0aGlzLmJ1aWxkKG5ldyBDcmVhdGVSZWNvcmRpbmdNb2RlbChtb2RlbCkpKTtcblxuICAgICAgICAvLyBUT0RPOiB0cnkgdXNpbmcgdGhlIG5ldyBmZXRjaCgpIHN5bnRheCBpbnN0ZWFkIG9mIGJhY2tib25lIG1vZGVsc1xuICAgICAgICAvL2ZldGNoKFwiL2FwaS9jcmVhdGVfcmVjb3JkaW5nXCIsIHtjcmVkZW50aWFsczogJ2luY2x1ZGUnfSlcbiAgICAgICAgLy8gICAgLnRoZW4ocmVzID0+IHJlcy5qc29uKCkpXG4gICAgICAgIC8vICAgIC50aGVuKGpzb24gPT4gdGhpcy5zd2l0Y2hWaWV3KG5ldyBSZWNvcmRlclZpZXcoanNvbikpKTtcbiAgICB9XG5cbiAgICB0b2dnbGUoZXZlbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuc3RvcFJlY29yZGluZygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0UmVjb3JkaW5nKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjYW5jZWxSZWNvcmRpbmcoZXZlbnQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgY2FuY2VsaW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgJChcIiNyZWNvcmRlci1mdWxsXCIpLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikuYWRkQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikucmVtb3ZlQ2xhc3MoXCJmbGlwcGVkXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiXCI7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgMyk7XG4gICAgfVxuXG4gICAgdXBsb2FkUmVjb3JkaW5nKGV2ZW50KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IHVwbG9hZGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCJcIjtcblxuICAgICAgICAkKFwiI3JlY29yZGVyLWZ1bGxcIikuYWRkQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLWNvbnRhaW5lclwiKS5yZW1vdmVDbGFzcyhcImZsaXBwZWRcIik7XG5cbiAgICAgICAgdmFyIGRlc2NyaXB0aW9uID0gJCgndGV4dGFyZWFbbmFtZT1kZXNjcmlwdGlvbl0nKVswXS52YWx1ZTtcblxuICAgICAgICB2YXIgZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgICBkYXRhLmFwcGVuZCgnZGVzY3JpcHRpb24nLCBkZXNjcmlwdGlvbik7XG4gICAgICAgIGRhdGEuYXBwZW5kKCdpc1B1YmxpYycsIDEpO1xuICAgICAgICBkYXRhLmFwcGVuZCgnYXVkaW8tYmxvYicsIHRoaXMuYXVkaW9CbG9iKTtcblxuICAgICAgICAvLyBzZW5kIHJhdyBibG9iIGFuZCBtZXRhZGF0YVxuXG4gICAgICAgIC8vIFRPRE86IGdldCBhIHJlcGxhY2VtZW50IGFqYXggbGlicmFyeSAobWF5YmUgcGF0Y2ggcmVxd2VzdCB0byBzdXBwb3J0IGJpbmFyeT8pXG4gICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgeGhyLm9wZW4oJ3Bvc3QnLCAnL2FwaS9xdWlwcycsIHRydWUpO1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgeGhyLnVwbG9hZC5vbnByb2dyZXNzID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHZhciBwZXJjZW50ID0gKChlLmxvYWRlZCAvIGUudG90YWwpICogMTAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwZXJjZW50YWdlOiBcIiArIHBlcmNlbnQpO1xuICAgICAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5maW5kKFwiLmJhclwiKS5jc3MoJ3dpZHRoJywgcGVyY2VudCk7XG4gICAgICAgIH07XG4gICAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgJChcIiNyZWNvcmRlci11cGxvYWRlclwiKS5maW5kKFwiLmJhclwiKS5jc3MoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IG1hbnVhbCB4aHIgc3VjY2Vzc2Z1bFwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgbWFudWFsIHhociBlcnJvclwiLCB4aHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwieGhyLnJlc3BvbnNlXCIsIHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlc3VsdFwiLCByZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gcmVzdWx0LnVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgeGhyLnNlbmQoZGF0YSk7XG4gICAgfVxuXG4gICAgb25SZWNvcmRpbmdUaWNrKCkge1xuICAgICAgICB2YXIgdGltZVNwYW4gPSBwYXJzZUludCgoKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gdGhpcy50aW1lclN0YXJ0KSAvIDEwMDApLnRvRml4ZWQoKSk7XG4gICAgICAgIHZhciB0aW1lU3RyID0gdGhpcy5JbnRUb1RpbWUodGltZVNwYW4pO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRpbWVTdHIpO1xuICAgIH1cblxuICAgIHN0YXJ0UmVjb3JkaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInN0YXJ0aW5nIHJlY29yZGluZ1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUuc3RhcnQoKCkgPT4gdGhpcy5vblJlY29yZGluZ1N0YXJ0ZWQoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWljcm9waG9uZSBpcyByZWFkeSB0byByZWNvcmQuIERvIGEgY291bnQtZG93biwgdGhlbiBzaWduYWwgZm9yIGlucHV0LXNpZ25hbCB0byBiZWdpbiByZWNvcmRpbmdcbiAgICAgKi9cbiAgICBvblJlY29yZGluZ1N0YXJ0ZWQoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibWljIHJlYWR5IHRvIHJlY29yZC4gZG8gY291bnRkb3duLlwiKTtcblxuICAgICAgICAvLyBvciBsYXVuY2ggY2FwdHVyZSBpbW1lZGlhdGVseVxuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRoaXMuSW50VG9UaW1lKDApKTtcbiAgICAgICAgdGhpcy5vbk1pY1JlY29yZGluZygpO1xuXG4gICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikuYWRkQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xuICAgIH1cblxuICAgIG9uTWljUmVjb3JkaW5nKCkge1xuICAgICAgICB0aGlzLnRpbWVyU3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgdGhpcy50aW1lcklkID0gc2V0SW50ZXJ2YWwodGhpcy5vblJlY29yZGluZ1RpY2suYmluZCh0aGlzKSwgMTAwMCk7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctc2NyZWVuXCIpLmFkZENsYXNzKFwiaXMtcmVjb3JkaW5nXCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTWljIHJlY29yZGluZyBzdGFydGVkXCIpO1xuXG4gICAgICAgIC8vIFRPRE86IHRoZSBtaWMgY2FwdHVyZSBpcyBhbHJlYWR5IGFjdGl2ZSwgc28gYXVkaW8gYnVmZmVycyBhcmUgZ2V0dGluZyBidWlsdCB1cFxuICAgICAgICAvLyB3aGVuIHRvZ2dsaW5nIHRoaXMgb24sIHdlIG1heSBhbHJlYWR5IGJlIGNhcHR1cmluZyBhIGJ1ZmZlciB0aGF0IGhhcyBhdWRpbyBwcmlvciB0byB0aGUgY291bnRkb3duXG4gICAgICAgIC8vIGhpdHRpbmcgemVyby4gd2UgY2FuIGRvIGEgZmV3IHRoaW5ncyBoZXJlOlxuICAgICAgICAvLyAxKSBmaWd1cmUgb3V0IGhvdyBtdWNoIGF1ZGlvIHdhcyBhbHJlYWR5IGNhcHR1cmVkLCBhbmQgY3V0IGl0IG91dFxuICAgICAgICAvLyAyKSB1c2UgYSBmYWRlLWluIHRvIGNvdmVyIHVwIHRoYXQgc3BsaXQtc2Vjb25kIG9mIGF1ZGlvXG4gICAgICAgIC8vIDMpIGFsbG93IHRoZSB1c2VyIHRvIGVkaXQgcG9zdC1yZWNvcmQgYW5kIGNsaXAgYXMgdGhleSB3aXNoIChiZXR0ZXIgYnV0IG1vcmUgY29tcGxleCBvcHRpb24hKVxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuYXVkaW9DYXB0dXJlLnRvZ2dsZU1pY3JvcGhvbmVSZWNvcmRpbmcodHJ1ZSksIDIwMCk7XG4gICAgfVxuXG4gICAgc3RvcFJlY29yZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJzdG9wcGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcklkKTtcblxuICAgICAgICAvLyBwbGF5IHNvdW5kIGltbWVkaWF0ZWx5IHRvIGJ5cGFzcyBtb2JpbGUgY2hyb21lJ3MgXCJ1c2VyIGluaXRpYXRlZCBtZWRpYVwiIHJlcXVpcmVtZW50XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCIvYXNzZXRzL3NvdW5kcy9iZWVwX3Nob3J0X29mZi5vZ2dcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG5cbiAgICAgICAgLy8gcmVxdWVzdCByZWNvcmRpbmcgc3RvcFxuICAgICAgICAvLyB3YWl0IGZvciBzeW5jIHRvIGNvbXBsZXRlXG4gICAgICAgIC8vIGFuZCB0aGVuIGNhbGxiYWNrIHRyYW5zaXRpb24gdG8gbmV4dCBzY3JlZW5cbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUuc3RvcCgoYmxvYikgPT4gdGhpcy5vblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSk7XG5cbiAgICAgICAgJChcIi5yZWNvcmRpbmctdGltZVwiKS5yZW1vdmVDbGFzcyhcImlzLXZpc2libGVcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctc2NyZWVuXCIpLnJlbW92ZUNsYXNzKFwiaXMtcmVjb3JkaW5nXCIpO1xuICAgIH1cblxuICAgIG9uUmVjb3JkaW5nQ29tcGxldGVkKGJsb2IpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgcHJldmlld2luZyByZWNvcmRlZCBhdWRpb1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0Jsb2IgPSBibG9iO1xuICAgICAgICB0aGlzLnNob3dDb21wbGV0aW9uU2NyZWVuKCk7XG4gICAgfVxuXG4gICAgcGxheVByZXZpZXcoKSB7XG4gICAgICAgIC8vIGF0IHRoaXMgcG9pbnQgYSBwbGF5YWJsZSBhdWRpbyBibG9iIHNob3VsZCBhbHJlYWR5IGJlIGxvYWRlZCBpbiBhdWRpb1BsYXllclxuICAgICAgICAvLyBzbyBqdXN0IHBsYXkgaXQgYWdhaW5cbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgfVxuXG4gICAgc2hvd0NvbXBsZXRpb25TY3JlZW4oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IGZsaXBwaW5nIHRvIGF1ZGlvIHBsYXliYWNrXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQmxvYlVybCA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHRoaXMuYXVkaW9CbG9iKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikuYWRkQ2xhc3MoXCJmbGlwcGVkXCIpO1xuXG4gICAgICAgIHRoaXMubWFrZUF1ZGlvQmxvYlVybFBsYXlhYmxlKHRoaXMuYXVkaW9CbG9iVXJsLCAocGxheWFibGVBdWRpb0Jsb2JVcmwpID0+IHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gcGxheWFibGVBdWRpb0Jsb2JVcmw7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSEFDSzogcm91dGUgYmxvYiB0aHJvdWdoIHhociB0byBsZXQgQW5kcm9pZCBDaHJvbWUgcGxheSBibG9icyB2aWEgPGF1ZGlvPlxuICAgICAqIEBwYXJhbSBhdWRpb0Jsb2JVcmwgcmVwcmVzZW50aW5nIHBvdGVudGlhbGx5IG5vbi1kaXNrLWJhY2tlZCBibG9iIHVybFxuICAgICAqIEBwYXJhbSBjYWxsYmFjayBmdW5jdGlvbiBhY2NlcHRzIGEgZGlzay1iYWNrZWQgYmxvYiB1cmxcbiAgICAgKi9cbiAgICBtYWtlQXVkaW9CbG9iVXJsUGxheWFibGUoYXVkaW9CbG9iVXJsLCBjYWxsYmFjaykge1xuICAgICAgICAvLyB0aGlzIHJlcXVlc3QgaGFwcGVucyBvdmVyIGxvb3BiYWNrXG4gICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIGF1ZGlvQmxvYlVybCwgdHJ1ZSk7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYic7XG4gICAgICAgIHhoci5vdmVycmlkZU1pbWVUeXBlKCdhdWRpby9vZ2cnKTtcblxuICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0ICYmIHhoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHhockJsb2JVcmwgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTCh4aHIucmVzcG9uc2UpO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJMb2FkZWQgYmxvYiBmcm9tIGNhY2hlIHVybDogXCIgKyBhdWRpb0Jsb2JVcmwpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUm91dGVkIGludG8gYmxvYiB1cmw6IFwiICsgeGhyQmxvYlVybCk7XG5cbiAgICAgICAgICAgICAgICBjYWxsYmFjayh4aHJCbG9iVXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgeGhyLnNlbmQoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgU3RyZWFtTGlzdCBmcm9tICcuL1N0cmVhbUxpc3QnXG5pbXBvcnQgU3RyZWFtRGV0YWlsc1ZpZXcgZnJvbSAnLi9TdHJlYW1EZXRhaWxzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTdHJlYW1Db250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihwcmVzZW50ZXIpIHtcbiAgICAgICAgdGhpcy5wcmVzZW50ZXIgPSBwcmVzZW50ZXI7XG4gICAgfVxuXG4gICAgbGlzdF9zdHJlYW1zKCkge1xuICAgICAgICB0aGlzLnByZXNlbnRlci5zd2l0Y2hWaWV3KG5ldyBTdHJlYW1MaXN0KCkpO1xuICAgIH1cblxuICAgIGRldGFpbHMoaWQpIHtcbiAgICAgICAgdGhpcy5wcmVzZW50ZXIuc3dpdGNoVmlldyhuZXcgU3RyZWFtRGV0YWlsc1ZpZXcoaWQpKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9TdHJlYW1EZXRhaWxzLmhicydcbmltcG9ydCAnYmFja2JvbmUtYmluZGluZ3MnXG5pbXBvcnQgJ2JhY2tib25lLmVwb3h5J1xuaW1wb3J0IHsgUXVpcE1vZGVsLCBNeVF1aXBDb2xsZWN0aW9uIH0gZnJvbSAnLi4vLi4vbW9kZWxzL1F1aXAnXG5pbXBvcnQgUXVpcFZpZXcgZnJvbSAnLi4vLi4vcGFydGlhbHMvUXVpcFZpZXcuanMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0cmVhbURldGFpbHNWaWV3IGV4dGVuZHMgQmFja2JvbmUuRXBveHkuVmlldyB7XG4gICAgaW5pdGlhbGl6ZShpZCkge1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcyhcInN0cmVhbS1kZXRhaWxzXCIpO1xuICAgICAgICBuZXcgTXlRdWlwQ29sbGVjdGlvbigpLmZldGNoKCkudGhlbihxdWlwcyA9PiB0aGlzLm9uUXVpcHNMb2FkZWQocXVpcHMpKVxuICAgIH1cblxuICAgIG9uUXVpcHNMb2FkZWQocXVpcHMpIHtcbiAgICAgICAgdGhpcy5xdWlwVmlld3MgPSBbXTtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLiRlbC5maW5kKCcuZy1xdWlwcy1saXN0Jyk7XG5cbiAgICAgICAgZm9yICh2YXIgcXVpcCBvZiBxdWlwcykge1xuICAgICAgICAgICAgdmFyIHF1aXBWaWV3ID0gbmV3IFF1aXBWaWV3KHttb2RlbDogbmV3IFF1aXBNb2RlbChxdWlwKX0pO1xuICAgICAgICAgICAgdGhpcy5xdWlwVmlld3MucHVzaChxdWlwVmlldyk7XG4gICAgICAgICAgICBsaXN0LmFwcGVuZChxdWlwVmlldy5lbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzaHV0ZG93bigpIHtcbiAgICAgICAgaWYgKHRoaXMucXVpcFZpZXdzICE9IG51bGwpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHF1aXAgb2YgdGhpcy5xdWlwVmlld3MpIHtcbiAgICAgICAgICAgICAgICBxdWlwLnNodXRkb3duKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgYmluZGluZ3MoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAvL1wiW25hbWU9c3RyZWFtTmFtZV1cIjogXCJ2YWx1ZTpzdHJlYW1OYW1lXCIsXG4gICAgICAgICAgICAvL1wiW25hbWU9cHJpdmFjeV1cIjogXCJjaGVja2VkOnByaXZhY3lcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGV2ZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC8vXCJjbGljayAubS1jcmVhdGUtc3RyZWFtIGJ1dHRvblwiOiBcIm9uQ3JlYXRlU3RyZWFtXCIsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvbkNyZWF0ZVN0cmVhbSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJ0aGlzIG1vZGVsXCIsIHRoaXMubW9kZWwuYXR0cmlidXRlcyk7XG5cbiAgICAgICAgdmFyIHN0cmVhbU5hbWUgPSB0aGlzLm1vZGVsLmdldChcInN0cmVhbU5hbWVcIik7XG4gICAgICAgIHZhciBwcml2YWN5ID0gdGhpcy5tb2RlbC5nZXQoXCJwcml2YWN5XCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgbmV3IHN0cmVhbSBuYW1lZCBcIiArIHN0cmVhbU5hbWUgKyBcIiB3aXRoIHByaXZhY3kgPSBcIiArIHByaXZhY3kpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGVtcGxhdGUoKSk7XG4gICAgfVxuXG59XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIGhlbHBlciwgYWxpYXMxPWRlcHRoMCAhPSBudWxsID8gZGVwdGgwIDoge30sIGFsaWFzMj1oZWxwZXJzLmhlbHBlck1pc3NpbmcsIGFsaWFzMz1cImZ1bmN0aW9uXCIsIGFsaWFzND1jb250YWluZXIuZXNjYXBlRXhwcmVzc2lvbjtcblxuICByZXR1cm4gXCIgICAgICAgIDxhIGhyZWY9XFxcIi9zdHJlYW1zL1wiXG4gICAgKyBhbGlhczQoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5pZCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaWQgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMyKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMzID8gaGVscGVyLmNhbGwoYWxpYXMxLHtcIm5hbWVcIjpcImlkXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgY2xhc3M9XFxcInN0cmVhbVxcXCI+XFxuICAgICAgICAgICAgXCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLm5hbWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm5hbWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMyKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMzID8gaGVscGVyLmNhbGwoYWxpYXMxLHtcIm5hbWVcIjpcIm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxuICAgICAgICA8L2E+XFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNyxcIj49IDQuMC4wXCJdLFwibWFpblwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMTtcblxuICByZXR1cm4gXCI8IS0tIFRPRE86IGNyZWF0ZSB5b3VyIGZpcnN0IHN0cmVhbSAtLT5cXG5cXG48ZGl2IGNsYXNzPVxcXCJtLWNyZWF0ZS1zdHJlYW1cXFwiPlxcbiAgICA8Zm9ybT5cXG4gICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiZmllbGRcXFwiIHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcIm5hbWVcXFwiIHBsYWNlaG9sZGVyPVxcXCJTdHJlYW0gTmFtZVxcXCIgLz5cXG5cXG4gICAgICAgIDxoMz5Qcml2YWN5PC9oMz5cXG5cXG4gICAgICAgIDxsYWJlbCBmb3I9XFxcInByaXZhY3ktcHVibGljXFxcIj5cXG4gICAgICAgICAgICA8aW5wdXQgaWQ9XFxcInByaXZhY3ktcHVibGljXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgbmFtZT1cXFwiaXNQdWJsaWNcXFwiIHZhbHVlPVxcXCJUcnVlXFxcIiBjaGVja2VkLz5cXG4gICAgICAgICAgICA8Yj5QdWJsaWM8L2I+IC0gQW55b25lIGNhbiBmb2xsb3cgdGhpcyBzdHJlYW1cXG4gICAgICAgIDwvbGFiZWw+XFxuICAgICAgICA8YnI+XFxuICAgICAgICA8bGFiZWwgZm9yPVxcXCJwcml2YWN5LXByaXZhdGVcXFwiPlxcbiAgICAgICAgICAgIDxpbnB1dCBpZD1cXFwicHJpdmFjeS1wcml2YXRlXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgbmFtZT1cXFwiaXNQdWJsaWNcXFwiIHZhbHVlPVxcXCJGYWxzZVxcXCIvPlxcbiAgICAgICAgICAgIDxiPlByaXZhdGU8L2I+IC0gT25seSB0aG9zZSB5b3UgaW52aXRlIGNhbiBmb2xsb3cgdGhpcyBzdHJlYW0uXFxuICAgICAgICA8L2xhYmVsPlxcbiAgICAgICAgPGJyPlxcbiAgICAgICAgPGJyPlxcblxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwic3F1YXJlLWJ0biBidG4tc3VjY2Vzc1xcXCIgbmFtZT1cXFwic3VibWl0XFxcIj5DcmVhdGU8L2J1dHRvbj5cXG4gICAgPC9mb3JtPlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcIm0tbGlzdC1zdHJlYW1zXFxcIj5cXG4gICAgPGgzPlN0cmVhbXM8L2gzPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwIDoge30sKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnN0cmVhbXMgOiBkZXB0aDApLHtcIm5hbWVcIjpcImVhY2hcIixcImhhc2hcIjp7fSxcImZuXCI6Y29udGFpbmVyLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6Y29udGFpbmVyLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL1N0cmVhbUxpc3QuaGJzJ1xuaW1wb3J0ICdiYWNrYm9uZS1iaW5kaW5ncydcbmltcG9ydCAnYmFja2JvbmUuZXBveHknXG5cbmNsYXNzIFN0cmVhbU1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogXCJcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxuICAgICAgICAgICAgaXNQdWJsaWM6IHRydWVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRoaXMudXJsUm9vdCA9IFwiL2FwaS9zdHJlYW1zXCI7XG4gICAgfVxuXG4gICAgZ2V0IGNvbXB1dGVkcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNhblN1Ym1pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KCduYW1lJykgIT0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3RyZWFtTGlzdCBleHRlbmRzIEJhY2tib25lLkVwb3h5LlZpZXcge1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRoaXMubW9kZWwgPSBuZXcgU3RyZWFtTW9kZWwoKTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoXCJzdHJlYW0tZGV0YWlsc1wiKTtcbiAgICB9XG5cbiAgICBnZXQgYmluZGluZ3MoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBcIltuYW1lPW5hbWVdXCI6IFwidmFsdWU6bmFtZVwiLFxuICAgICAgICAgICAgXCJbbmFtZT1pc1B1YmxpY11cIjogXCJjaGVja2VkOmlzUHVibGljXCJcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCBldmVudHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBcImNsaWNrIC5tLWNyZWF0ZS1zdHJlYW0gYnV0dG9uXCI6IFwib25DcmVhdGVTdHJlYW1cIixcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uQ3JlYXRlU3RyZWFtKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInRoaXMgbW9kZWxcIiwgdGhpcy5tb2RlbC5hdHRyaWJ1dGVzKTtcblxuICAgICAgICB2YXIgc3RyZWFtTmFtZSA9IHRoaXMubW9kZWwuZ2V0KFwic3RyZWFtTmFtZVwiKTtcbiAgICAgICAgdmFyIHByaXZhY3kgPSB0aGlzLm1vZGVsLmdldChcInByaXZhY3lcIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBuZXcgc3RyZWFtIG5hbWVkIFwiICsgc3RyZWFtTmFtZSArIFwiIHdpdGggcHJpdmFjeSA9IFwiICsgcHJpdmFjeSk7XG4gICAgICAgIHRoaXMubW9kZWwuc2F2ZSgpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZW5kZXIoKSB7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGVtcGxhdGUodGhpcy5tb2RlbC5hdHRyaWJ1dGVzKSk7XG4gICAgfVxuXG59XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNyxcIj49IDQuMC4wXCJdLFwibWFpblwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIGhlbHBlcjtcblxuICByZXR1cm4gXCI8ZGl2IGNsYXNzPVxcXCJtLXN0cmVhbS1kZXRhaWxzXFxcIj5cXG4gICAgPGgxPlwiXG4gICAgKyBjb250YWluZXIuZXNjYXBlRXhwcmVzc2lvbigoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnVzZXJuYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51c2VybmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBoZWxwZXJzLmhlbHBlck1pc3NpbmcpLCh0eXBlb2YgaGVscGVyID09PSBcImZ1bmN0aW9uXCIgPyBoZWxwZXIuY2FsbChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMCA6IHt9LHtcIm5hbWVcIjpcInVzZXJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIidzIFN0cmVhbTwvaDE+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiZy1xdWlwcy1saXN0XFxcIj5cXG48L2Rpdj5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0ICogYXMgVmlld3MgZnJvbSAnLi4vVmlld3MnXG5pbXBvcnQgeyBRdWlwTW9kZWwsIE15UXVpcENvbGxlY3Rpb24gfSBmcm9tICcuLi8uLi9tb2RlbHMvUXVpcCdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL1VzZXJBbGxSZWNvcmRpbmdzLmhicydcblxuY2xhc3MgVXNlclBvZENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uIHtcbiAgICBjb25zdHJ1Y3Rvcih1c2VybmFtZSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLm1vZGVsID0gUXVpcE1vZGVsO1xuICAgICAgICB0aGlzLnVzZXJuYW1lID0gdXNlcm5hbWU7XG4gICAgfVxuXG4gICAgdXJsKCkge1xuICAgICAgICByZXR1cm4gXCIvYXBpL3UvXCIgKyB0aGlzLnVzZXJuYW1lICsgXCIvcXVpcHNcIjtcbiAgICB9XG59XG5cbmNsYXNzIFVzZXJQb2RDb2xsZWN0aW9uVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGNvbnN0cnVjdG9yKHVzZXJuYW1lKSB7XG4gICAgICAgIHN1cGVyKHVzZXJuYW1lKTtcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKHVzZXJuYW1lKSB7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgICAgbmV3IFVzZXJQb2RDb2xsZWN0aW9uKHVzZXJuYW1lKVxuICAgICAgICAgICAgLmZldGNoKClcbiAgICAgICAgICAgIC50aGVuKHF1aXBzID0+IHRoaXMuY3JlYXRlQ2hpbGRWaWV3cyhxdWlwcykpXG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICB0aGlzLiRlbC5odG1sKHRlbXBsYXRlKCkpO1xuICAgIH1cblxuICAgIHNodXRkb3duKCkge1xuICAgICAgICBBdWRpb1BsYXllci5wYXVzZSgpO1xuICAgICAgICB0aGlzLmRlc3Ryb3lDaGlsZFZpZXdzKCk7XG4gICAgfVxuXG4gICAgY3JlYXRlQ2hpbGRWaWV3cyhxdWlwcykge1xuICAgICAgICB0aGlzLnF1aXBWaWV3cyA9IFtdO1xuICAgICAgICB2YXIgbGlzdCA9IHRoaXMuJGVsLmZpbmQoJy5nLXF1aXBzLWxpc3QnKTtcblxuICAgICAgICBmb3IgKHZhciBxdWlwIG9mIHF1aXBzKSB7XG4gICAgICAgICAgICB2YXIgcXVpcFZpZXcgPSBuZXcgVmlld3MuUXVpcFZpZXcoe21vZGVsOiBuZXcgUXVpcE1vZGVsKHF1aXApfSk7XG4gICAgICAgICAgICB0aGlzLnF1aXBWaWV3cy5wdXNoKHF1aXBWaWV3KTtcbiAgICAgICAgICAgIGxpc3QuYXBwZW5kKHF1aXBWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRlc3Ryb3lDaGlsZFZpZXdzKCkge1xuICAgICAgICBpZiAodGhpcy5xdWlwVmlld3MgIT0gbnVsbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgcXVpcCBvZiB0aGlzLnF1aXBWaWV3cykge1xuICAgICAgICAgICAgICAgIHF1aXAuc2h1dGRvd24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IHsgVXNlclBvZENvbGxlY3Rpb24sIFVzZXJQb2RDb2xsZWN0aW9uVmlldyB9XG5cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCAqIGFzIFZpZXdzIGZyb20gJy4uL1ZpZXdzJ1xuaW1wb3J0IHsgUXVpcE1vZGVsIH0gZnJvbSAnLi4vLi4vbW9kZWxzL1F1aXAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFVzZXJQb2RWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgaW5pdGlhbGl6ZShxdWlwSWQpIHtcbiAgICAgICAgbmV3IFF1aXBNb2RlbCh7aWQ6IHF1aXBJZH0pXG4gICAgICAgICAgICAuZmV0Y2goKVxuICAgICAgICAgICAgLnRoZW4ocXVpcCA9PiB0aGlzLmNyZWF0ZUNoaWxkVmlld3MocXVpcCkpXG4gICAgfVxuXG4gICAgc2h1dGRvd24oKSB7XG4gICAgICAgIEF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICAgIHRoaXMuZGVzdHJveUNoaWxkVmlld3MoKTtcbiAgICB9XG5cbiAgICBjcmVhdGVDaGlsZFZpZXdzKHF1aXApIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJsb2FkZWQgc2luZ2xlIHBvZFwiLCBxdWlwKTtcblxuICAgICAgICB0aGlzLnF1aXBWaWV3ID0gbmV3IFZpZXdzLlF1aXBWaWV3KHttb2RlbDogbmV3IFF1aXBNb2RlbChxdWlwKX0pO1xuICAgICAgICB0aGlzLiRlbC5hcHBlbmQodGhpcy5xdWlwVmlldy5lbCk7XG4gICAgfVxuXG4gICAgZGVzdHJveUNoaWxkVmlld3MoKSB7XG4gICAgICAgIHRoaXMucXVpcFZpZXcuc2h1dGRvd24oKTtcbiAgICB9XG59XG5cbmV4cG9ydCB7IFVzZXJQb2RWaWV3IH1cblxuIiwiaW1wb3J0IENoYW5nZWxvZ1ZpZXcgZnJvbSAnLi9DaGFuZ2Vsb2cvQ2hhbmdlbG9nVmlldydcbmltcG9ydCBIb21lcGFnZVZpZXcgZnJvbSAnLi9Ib21lcGFnZS9Ib21lcGFnZVZpZXcnXG5pbXBvcnQgUmVjb3JkZXJWaWV3IGZyb20gJy4vUmVjb3JkZXIvUmVjb3JkZXJWaWV3J1xuaW1wb3J0IEdldE1pY3JvcGhvbmVWaWV3IGZyb20gJy4vR2V0TWljcm9waG9uZS9HZXRNaWNyb3Bob25lVmlldydcbmltcG9ydCBVc2VyUG9kVmlldyBmcm9tICcuL1VzZXIvVXNlclNpbmdsZVJlY29yZGluZ1ZpZXcnXG5pbXBvcnQgSGVhZGVyTmF2VmlldyBmcm9tICcuLi9wYXJ0aWFscy9IZWFkZXJOYXZWaWV3J1xuaW1wb3J0IFF1aXBWaWV3IGZyb20gJy4uL3BhcnRpYWxzL1F1aXBWaWV3J1xuaW1wb3J0IHsgVXNlclBvZENvbGxlY3Rpb24sIFVzZXJQb2RDb2xsZWN0aW9uVmlldyB9IGZyb20gJy4vVXNlci9Vc2VyQWxsUmVjb3JkaW5nc1ZpZXcnXG5pbXBvcnQgeyBTb3VuZFBsYXllciwgQXVkaW9QbGF5ZXJWaWV3LCBBdWRpb1BsYXllckV2ZW50cyB9IGZyb20gJy4uL3BhcnRpYWxzL0F1ZGlvUGxheWVyVmlldydcblxuZXhwb3J0IHtcbiAgICBDaGFuZ2Vsb2dWaWV3LCBIb21lcGFnZVZpZXcsIFJlY29yZGVyVmlldywgR2V0TWljcm9waG9uZVZpZXcsIFVzZXJQb2RWaWV3LCBIZWFkZXJOYXZWaWV3LFxuICAgIFF1aXBWaWV3LCBVc2VyUG9kQ29sbGVjdGlvblZpZXcsIEF1ZGlvUGxheWVyVmlld1xufVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSdcblxuY2xhc3MgQXVkaW9QbGF5ZXJFdmVudHMgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgcGF1c2UoKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcihcInBhdXNlXCIpO1xuICAgIH1cbn1cblxuZXhwb3J0IGxldCBBdWRpb1BsYXllciA9IG5ldyBBdWRpb1BsYXllckV2ZW50cygpO1xuXG5jbGFzcyBBdWRpb1BsYXllclZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsLFxuICAgICAgICAgICAgcXVpcE1vZGVsOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvUGxheWVyVmlldyBpbml0aWFsaXplZFwiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXVkaW8tcGxheWVyXCIpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcInRvZ2dsZVwiLCAocXVpcCkgPT4gdGhpcy5vblRvZ2dsZShxdWlwKSwgdGhpcyk7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwicGF1c2VcIiwgKHF1aXApID0+IHRoaXMucGF1c2UocXVpcCksIHRoaXMpO1xuXG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIub25wYXVzZSA9ICgpID0+IHRoaXMub25BdWRpb1BhdXNlZCgpO1xuICAgIH1cblxuICAgIGNsb3NlKCkge1xuICAgICAgICB0aGlzLnN0b3BQZXJpb2RpY1RpbWVyKCk7XG4gICAgfVxuXG4gICAgc3RhcnRQZXJpb2RpY1RpbWVyKCkge1xuICAgICAgICBpZih0aGlzLnBlcmlvZGljVGltZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5wZXJpb2RpY1RpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4gdGhpcy5jaGVja1Byb2dyZXNzKCksIDEwMCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdG9wUGVyaW9kaWNUaW1lcigpIHtcbiAgICAgICAgaWYodGhpcy5wZXJpb2RpY1RpbWVyICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5wZXJpb2RpY1RpbWVyKTtcbiAgICAgICAgICAgIHRoaXMucGVyaW9kaWNUaW1lciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjaGVja1Byb2dyZXNzKCkge1xuICAgICAgICBpZih0aGlzLnF1aXBNb2RlbCA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJvZ3Jlc3NVcGRhdGUgPSB7XG4gICAgICAgICAgICBwb3NpdGlvbjogdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSwgLy8gc2VjXG4gICAgICAgICAgICBkdXJhdGlvbjogdGhpcy5hdWRpb1BsYXllci5kdXJhdGlvbiwgLy8gc2VjXG4gICAgICAgICAgICBwcm9ncmVzczogMTAwICogdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSAvIHRoaXMuYXVkaW9QbGF5ZXIuZHVyYXRpb24gLy8gJVxuICAgICAgICB9XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHRoaXMucXVpcE1vZGVsLmlkICsgXCIvcHJvZ3Jlc3NcIiwgcHJvZ3Jlc3NVcGRhdGUpO1xuICAgIH1cblxuICAgIG9uVG9nZ2xlKHF1aXBNb2RlbCkge1xuICAgICAgICB0aGlzLnF1aXBNb2RlbCA9IHF1aXBNb2RlbDtcblxuICAgICAgICBpZighdGhpcy50cmFja0lzTG9hZGVkKHF1aXBNb2RlbC51cmwpKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRUcmFjayhxdWlwTW9kZWwudXJsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCF0aGlzLnRyYWNrSXNMb2FkZWQocXVpcE1vZGVsLnVybCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRoaXMuYXVkaW9QbGF5ZXIucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLnBsYXkocXVpcE1vZGVsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucGF1c2UocXVpcE1vZGVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHBsYXkocXVpcE1vZGVsKSB7XG4gICAgICAgIC8vIGlmIGF0IHRoZSBlbmQgb2YgZmlsZSAoMjAwbXMgZnVkZ2UpLCByZXdpbmRcbiAgICAgICAgaWYocGFyc2VGbG9hdChxdWlwTW9kZWwucG9zaXRpb24pID4gKHBhcnNlRmxvYXQocXVpcE1vZGVsLmR1cmF0aW9uKSAtIDAuMikpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmV3aW5kaW5nIGF1ZGlvIGNsaXA7IHF1aXBNb2RlbC5wb3NpdGlvbj1cIiArIHF1aXBNb2RlbC5wb3NpdGlvblxuICAgICAgICAgICAgICAgICsgXCIgcXVpcE1vZGVsLmR1cmF0aW9uPVwiICsgcXVpcE1vZGVsLmR1cmF0aW9uKTtcbiAgICAgICAgICAgIHF1aXBNb2RlbC5wb3NpdGlvbiA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5jdXJyZW50VGltZSA9IHF1aXBNb2RlbC5wb3NpdGlvbjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHF1aXBNb2RlbC5pZCArIFwiL3BsYXlpbmdcIik7XG4gICAgICAgIHRoaXMuc3RhcnRQZXJpb2RpY1RpbWVyKCk7XG4gICAgfVxuXG4gICAgcGF1c2UocXVpcE1vZGVsKSB7XG4gICAgICAgIC8vIHJlcXVlc3QgcGF1c2VcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wYXVzZSgpO1xuICAgIH1cblxuICAgIHRyYWNrSXNMb2FkZWQodXJsKSB7XG4gICAgICAgIHJldHVybiB+dGhpcy5hdWRpb1BsYXllci5zcmMuaW5kZXhPZih1cmwpO1xuICAgIH1cblxuICAgIGxvYWRUcmFjayh1cmwpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJMb2FkaW5nIGF1ZGlvOiBcIiArIHVybCk7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gdXJsO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLmxvYWQoKTtcbiAgICB9XG5cbiAgICAvKiBBdWRpbyBlbGVtZW50IHJlcG9ydHMgcGF1c2UgdHJpZ2dlcmVkLCB0cmVhdGluZyBhcyBlbmQgb2YgZmlsZSAqL1xuICAgIG9uQXVkaW9QYXVzZWQoKSB7XG4gICAgICAgIHRoaXMuY2hlY2tQcm9ncmVzcygpO1xuICAgICAgICBpZih0aGlzLnF1aXBNb2RlbCAhPSBudWxsKSB7XG4gICAgICAgICAgICBBdWRpb1BsYXllci50cmlnZ2VyKFwiL1wiICsgdGhpcy5xdWlwTW9kZWwuaWQgKyBcIi9wYXVzZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdG9wUGVyaW9kaWNUaW1lcigpO1xuICAgIH1cbn1cblxuY2xhc3MgU291bmRQbGF5ZXIge1xuICAgIHN0YXRpYyBjcmVhdGUgKG1vZGVsKSB7XG4gICAgICAgIHZhciByZXN1bWVQb3NpdGlvbiA9IHBhcnNlSW50KG1vZGVsLmdldCgncG9zaXRpb24nKSB8fCAwKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkNyZWF0aW5nIHNvdW5kIHBsYXllciBmb3IgbW9kZWw6XCIsIG1vZGVsKTtcblxuICAgICAgICByZXR1cm4gc291bmRNYW5hZ2VyLmNyZWF0ZVNvdW5kKHtcbiAgICAgICAgICAgIGlkOiBtb2RlbC5pZCxcbiAgICAgICAgICAgIHVybDogbW9kZWwudXJsLFxuICAgICAgICAgICAgdm9sdW1lOiAxMDAsXG4gICAgICAgICAgICBhdXRvTG9hZDogdHJ1ZSxcbiAgICAgICAgICAgIGF1dG9QbGF5OiBmYWxzZSxcbiAgICAgICAgICAgIGZyb206IHJlc3VtZVBvc2l0aW9uLFxuICAgICAgICAgICAgd2hpbGVsb2FkaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJsb2FkZWQ6IFwiICsgdGhpcy5ieXRlc0xvYWRlZCArIFwiIG9mIFwiICsgdGhpcy5ieXRlc1RvdGFsKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbmxvYWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU291bmQ7IGF1ZGlvIGxvYWRlZDsgcG9zaXRpb24gPSAnICsgcmVzdW1lUG9zaXRpb24gKyAnLCBkdXJhdGlvbiA9ICcgKyB0aGlzLmR1cmF0aW9uKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmR1cmF0aW9uID09IG51bGwgfHwgdGhpcy5kdXJhdGlvbiA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZHVyYXRpb24gaXMgbnVsbFwiKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICgocmVzdW1lUG9zaXRpb24gKyAxMCkgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSB0cmFjayBpcyBwcmV0dHkgbXVjaCBjb21wbGV0ZSwgbG9vcCBpdFxuICAgICAgICAgICAgICAgICAgICAvLyBGSVhNRTogdGhpcyBzaG91bGQgYWN0dWFsbHkgaGFwcGVuIGVhcmxpZXIsIHdlIHNob3VsZCBrbm93IHRoYXQgdGhlIGFjdGlvbiB3aWxsIGNhdXNlIGEgcmV3aW5kXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICBhbmQgaW5kaWNhdGUgdGhlIHJld2luZCB2aXN1YWxseSBzbyB0aGVyZSBpcyBubyBzdXJwcmlzZVxuICAgICAgICAgICAgICAgICAgICByZXN1bWVQb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTb3VuZDsgdHJhY2sgbmVlZGVkIGEgcmV3aW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRklYTUU6IHJlc3VtZSBjb21wYXRpYmlsaXR5IHdpdGggdmFyaW91cyBicm93c2Vyc1xuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBzb21ldGltZXMgeW91IHJlc3VtZSBhIGZpbGUgYWxsIHRoZSB3YXkgYXQgdGhlIGVuZCwgc2hvdWxkIGxvb3AgdGhlbSBhcm91bmRcbiAgICAgICAgICAgICAgICB0aGlzLnNldFBvc2l0aW9uKHJlc3VtZVBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB0aGlzLnBsYXkoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3aGlsZXBsYXlpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvZ3Jlc3MgPSAodGhpcy5kdXJhdGlvbiA+IDAgPyAxMDAgKiB0aGlzLnBvc2l0aW9uIC8gdGhpcy5kdXJhdGlvbiA6IDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnByb2dyZXNzXCIsIHByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cG9zaXRpb25cIiwgdGhpcy5wb3NpdGlvbi50b0ZpeGVkKDApKTtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoeydwcm9ncmVzcyc6IHByb2dyZXNzfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25wYXVzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU291bmQ7IHBhdXNlZDogXCIgKyB0aGlzLmlkKTtcbiAgICAgICAgICAgICAgICB2YXIgcG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uID8gdGhpcy5wb3NpdGlvbi50b0ZpeGVkKDApIDogMDtcbiAgICAgICAgICAgICAgICB2YXIgcHJvZ3Jlc3MgPSAodGhpcy5kdXJhdGlvbiA+IDAgPyAxMDAgKiBwb3NpdGlvbiAvIHRoaXMuZHVyYXRpb24gOiAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCBwcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnBvc2l0aW9uXCIsIHBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoeydwcm9ncmVzcyc6IHByb2dyZXNzfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25maW5pc2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNvdW5kOyBmaW5pc2hlZCBwbGF5aW5nOiBcIiArIHRoaXMuaWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gc3RvcmUgY29tcGxldGlvbiBpbiBicm93c2VyXG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnByb2dyZXNzXCIsICcxMDAlJyk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnBvc2l0aW9uXCIsIHRoaXMuZHVyYXRpb24udG9GaXhlZCgwKSk7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiAnMTAwJSd9KTtcblxuICAgICAgICAgICAgICAgIC8vIFRPRE86IHVubG9jayBzb21lIHNvcnQgb2YgYWNoaWV2ZW1lbnQgZm9yIGZpbmlzaGluZyB0aGlzIHRyYWNrLCBtYXJrIGl0IGEgZGlmZiBjb2xvciwgZXRjXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogdGhpcyBpcyBhIGdvb2QgcGxhY2UgdG8gZmlyZSBhIGhvb2sgdG8gYSBwbGF5YmFjayBtYW5hZ2VyIHRvIG1vdmUgb250byB0aGUgbmV4dCBhdWRpbyBjbGlwXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufVxuXG5leHBvcnQgeyBTb3VuZFBsYXllciwgQXVkaW9QbGF5ZXJWaWV3LCBBdWRpb1BsYXllckV2ZW50cyB9O1xuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcIjFcIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBoZWxwZXIsIGFsaWFzMT1kZXB0aDAgIT0gbnVsbCA/IGRlcHRoMCA6IHt9LCBhbGlhczI9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBhbGlhczM9XCJmdW5jdGlvblwiLCBhbGlhczQ9Y29udGFpbmVyLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiICAgICAgICA8ZGl2IGNsYXNzPVxcXCJuYXYtcmlnaHRcXFwiPlxcbiAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJidG4gYnRuLXN1Y2Nlc3NcXFwiIGhyZWY9XFxcIi9yZWNvcmRcXFwiPlxcbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtbWljcm9waG9uZVxcXCI+PC9pPlxcbiAgICAgICAgICAgIDwvYT5cXG4gICAgICAgICAgICA8YSBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIiBocmVmPVxcXCIvdS9cIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudXNlcm5hbWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnVzZXJuYW1lIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMiksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMyA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJ1c2VybmFtZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW1nIGNsYXNzPVxcXCJwcm9maWxlLXBpY1xcXCIgc3JjPVxcXCIvcHJvZmlsZV9pbWFnZXNcIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucHJvZmlsZUltYWdlIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5wcm9maWxlSW1hZ2UgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMyKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMzID8gaGVscGVyLmNhbGwoYWxpYXMxLHtcIm5hbWVcIjpcInByb2ZpbGVJbWFnZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiLz5cXG4gICAgICAgICAgICA8L2E+XFxuICAgICAgICA8L2Rpdj5cXG5cIjtcbn0sXCIzXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCIgICAgICAgIDxhIGNsYXNzPVxcXCJidG4tc2lnbi1pblxcXCIgaHJlZj1cXFwiL2F1dGhcXFwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1zaWduLWluXFxcIj48L2k+IExvZ2luIHdpdGggVHdpdHRlclxcbiAgICAgICAgPC9hPlxcblwiO1xufSxcImNvbXBpbGVyXCI6WzcsXCI+PSA0LjAuMFwiXSxcIm1haW5cIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHZhciBzdGFjazE7XG5cbiAgcmV0dXJuIFwiPG5hdiBjbGFzcz1cXFwiaGVhZGVyLW5hdlxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcIm5hdi1sZWZ0XFxcIj5cXG4gICAgICAgIDxhIGNsYXNzPVxcXCJ3b3JkbWFya1xcXCIgaHJlZj1cXFwiL1xcXCI+XFxuICAgICAgICAgICAgPHN0cm9uZz5Db3VjaDwvc3Ryb25nPnBvZFxcbiAgICAgICAgPC9hPlxcbiAgICA8L2Rpdj5cXG4gICAgPCEtLTxhIGNsYXNzPVxcXCJidG4gYnRuLXNxdWFyZVxcXCIgaHJlZj1cXFwiL2NoYW5nZWxvZ1xcXCI+LS0+XFxuICAgICAgICA8IS0tPGltZyBjbGFzcz1cXFwiYnRuLWxvZ29cXFwiIHNyYz1cXFwiL2Fzc2V0cy9pbWcvY291Y2hwb2QtMy10aW55LnBuZ1xcXCIvPi0tPlxcbiAgICA8IS0tPC9hPi0tPlxcblxcbiAgICA8YSBocmVmPVxcXCIvY2hhbmdlbG9nXFxcIj5cXG4gICAgICAgIE5ld3NcXG4gICAgPC9hPlxcblxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbXCJpZlwiXS5jYWxsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwIDoge30sKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnVzZXJuYW1lIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjpjb250YWluZXIucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjpjb250YWluZXIucHJvZ3JhbSgzLCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCI8L25hdj5cXG5cIjtcbn0sXCJ1c2VEYXRhXCI6dHJ1ZX0pO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vSGVhZGVyTmF2Vmlldy5oYnMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEhlYWRlck5hdlZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBpbml0aWFsaXplKHVzZXIpIHtcbiAgICAgICAgdGhpcy5tb2RlbCA9IHVzZXI7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlbmRlcmluZyBoZWFkZXIgbmF2IHZpZXdcIik7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGVtcGxhdGUodGhpcy5tb2RlbCkpO1xuICAgIH1cbn1cbiIsImltcG9ydCB2YWd1ZVRpbWUgZnJvbSAndmFndWUtdGltZSdcbmltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5pbXBvcnQgeyBBdWRpb1BsYXllciB9IGZyb20gJy4vQXVkaW9QbGF5ZXJWaWV3LmpzJ1xuaW1wb3J0IHsgUXVpcE1vZGVsIH0gZnJvbSAnLi4vbW9kZWxzL1F1aXAnXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9SZWNvcmRpbmdJdGVtLmhicydcbmltcG9ydCBhcHAgZnJvbSAnLi4vYXBwJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBRdWlwVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGdldCBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHF1aXBJZDogMCxcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXQgZXZlbnRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgXCJjbGljayAucXVpcC1hY3Rpb25zIC5sb2NrLWluZGljYXRvclwiOiBcInRvZ2dsZVB1YmxpY1wiLFxuICAgICAgICAgICAgXCJjbGljayAucXVpcC1hY3Rpb25zIGFbYWN0aW9uPWRlbGV0ZV1cIjogXCJkZWxldGVcIixcbiAgICAgICAgICAgIFwiY2xpY2sgLnF1aXAtcGxheWVyXCI6IFwidG9nZ2xlUGxheWJhY2tcIlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IHRhZ05hbWUoKSB7XG4gICAgICAgIHJldHVybiAnZGl2JztcbiAgICB9XG5cbiAgICBkZWxldGUoKSB7XG4gICAgICAgIHRoaXMubW9kZWwuZGVzdHJveSgpXG4gICAgICAgICAgICAudGhlbigoKSA9PiB3aW5kb3cuYXBwLnJvdXRlci5ob21lKCkgLCAoKSA9PiBjb25zb2xlLmxvZyhcIkRlbGV0ZSBmYWlsZWRcIikpO1xuICAgIH1cblxuICAgIG9uUGF1c2UoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUXVpcFZpZXc7IHBhdXNlZFwiKTtcblxuICAgICAgICAkKHRoaXMuZWwpXG4gICAgICAgICAgICAuZmluZCgnLmZhLXBhdXNlJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZmEtcGF1c2UnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdmYS1wbGF5Jyk7XG4gICAgfVxuXG4gICAgb25QbGF5KCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlF1aXBWaWV3OyBwbGF5aW5nXCIpO1xuXG4gICAgICAgICQodGhpcy5lbClcbiAgICAgICAgICAgIC5maW5kKCcuZmEtcGxheScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2ZhLXBsYXknKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdmYS1wYXVzZScpO1xuICAgIH1cblxuICAgIG9uUHJvZ3Jlc3MocHJvZ3Jlc3NVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoeydwb3NpdGlvbic6IHByb2dyZXNzVXBkYXRlLnBvc2l0aW9ufSk7IC8vIHNlY1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J2R1cmF0aW9uJzogcHJvZ3Jlc3NVcGRhdGUuZHVyYXRpb259KTsgLy8gc2VjXG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc1VwZGF0ZS5wcm9ncmVzc30pOyAvLyAlXG4gICAgICAgIHRoaXMubW9kZWwudGhyb3R0bGVkU2F2ZSgpO1xuICAgIH1cblxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHZhciBpZCA9IHRoaXMubW9kZWwuZ2V0KFwiaWRcIik7XG5cbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCIvXCIgKyBpZCArIFwiL3BhdXNlZFwiLCAoKSA9PiB0aGlzLm9uUGF1c2UoKSwgdGhpcyk7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwiL1wiICsgaWQgKyBcIi9wbGF5aW5nXCIsICgpID0+IHRoaXMub25QbGF5KCksIHRoaXMpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcIi9cIiArIGlkICsgXCIvcHJvZ3Jlc3NcIiwgKHVwZGF0ZSkgPT4gdGhpcy5vblByb2dyZXNzKHVwZGF0ZSksIHRoaXMpO1xuXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgICAgLy8gdXBkYXRlIHZpc3VhbHMgdG8gaW5kaWNhdGUgcGxheWJhY2sgcHJvZ3Jlc3NcbiAgICAgICAgdGhpcy5tb2RlbC5vbignY2hhbmdlOnByb2dyZXNzJywgKG1vZGVsLCBwcm9ncmVzcykgPT4ge1xuICAgICAgICAgICAgJCh0aGlzLmVsKS5maW5kKFwiLnByb2dyZXNzLWJhclwiKS5jc3MoXCJ3aWR0aFwiLCBwcm9ncmVzcyArIFwiJVwiKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5tb2RlbC5vbignY2hhbmdlOmlzUHVibGljJywgKG1vZGVsKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzaHV0ZG93bigpIHtcbiAgICAgICAgQXVkaW9QbGF5ZXIub2ZmKG51bGwsIG51bGwsIHRoaXMpO1xuICAgICAgICB0aGlzLm1vZGVsLm9mZigpO1xuICAgIH1cblxuICAgIHRvZ2dsZVB1YmxpYyhldikge1xuICAgICAgICB2YXIgbmV3U3RhdGUgPSAhdGhpcy5tb2RlbC5nZXQoJ2lzUHVibGljJyk7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsnaXNQdWJsaWMnOiBuZXdTdGF0ZX0pO1xuICAgICAgICB0aGlzLm1vZGVsLnNhdmUoKTtcbiAgICB9XG5cbiAgICB0b2dnbGVQbGF5YmFjayhldmVudCkge1xuICAgICAgICBBdWRpb1BsYXllci50cmlnZ2VyKFwidG9nZ2xlXCIsIHRoaXMubW9kZWwuYXR0cmlidXRlcyk7XG4gICAgfVxuXG4gICAgcmVuZGVyKCkge1xuICAgICAgICB2YXIgdmlld01vZGVsID0gdGhpcy5tb2RlbC50b0pTT04oKTtcbiAgICAgICAgdmlld01vZGVsLnZhZ3VlVGltZSA9IHZhZ3VlVGltZS5nZXQoe2Zyb206IG5ldyBEYXRlKCksIHRvOiBuZXcgRGF0ZSh0aGlzLm1vZGVsLmdldChcInRpbWVzdGFtcFwiKSl9KTtcblxuICAgICAgICB0aGlzLiRlbC5odG1sKHRlbXBsYXRlKHZpZXdNb2RlbCkpO1xuXG4gICAgICAgIHRoaXMuJGVsLmZpbmQoXCIucHJvZ3Jlc3MtYmFyXCIpLmNzcyhcIndpZHRoXCIsIHRoaXMubW9kZWwuZ2V0KCdwcm9ncmVzcycpICsgXCIlXCIpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn1cbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCIgICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtdW5sb2NrXFxcIj48L2k+IDxzcGFuIGNsYXNzPVxcXCJjYXB0aW9uXFxcIj5NYWtlIFByaXZhdGU8L3NwYW4+XFxuXCI7XG59LFwiM1wiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiICAgICAgICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLWxvY2tcXFwiPjwvaT4gPHNwYW4gY2xhc3M9XFxcImNhcHRpb25cXFwiPk1ha2UgUHVibGljPC9zcGFuPlxcblwiO1xufSxcIjVcIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIiAgICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvblxcXCIgYWN0aW9uPVxcXCJkZWxldGVcXFwiIHRpdGxlPVxcXCJEZWxldGVcXFwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1yZW1vdmVcXFwiPjwvaT4gPHNwYW4gY2xhc3M9XFxcImNhcHRpb25cXFwiPkRlbGV0ZTwvc3Bhbj5cXG4gICAgICAgIDwvYT5cXG5cIjtcbn0sXCJjb21waWxlclwiOls3LFwiPj0gNC4wLjBcIl0sXCJtYWluXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxLCBoZWxwZXIsIGFsaWFzMT1kZXB0aDAgIT0gbnVsbCA/IGRlcHRoMCA6IHt9LCBhbGlhczI9aGVscGVycy5oZWxwZXJNaXNzaW5nLCBhbGlhczM9XCJmdW5jdGlvblwiLCBhbGlhczQ9Y29udGFpbmVyLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgcmV0dXJuIFwiPGRpdiBjbGFzcz1cXFwicXVpcFxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImZsZXgtcm93XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInF1aXAtcHJvZmlsZVxcXCI+XFxuICAgICAgICAgICAgPGEgY2xhc3M9XFxcImJ0blxcXCIgaHJlZj1cXFwiL3UvXCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnVzZXJuYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51c2VybmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwidXNlcm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG4gICAgICAgICAgICAgICAgPGltZyBzcmM9XFxcIi9wcm9maWxlX2ltYWdlc1wiXG4gICAgKyBhbGlhczQoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5wcm9maWxlSW1hZ2UgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnByb2ZpbGVJbWFnZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwicHJvZmlsZUltYWdlXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIvPlxcbiAgICAgICAgICAgIDwvYT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwicXVpcC1kZXRhaWxzXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmbGV4LXJvd1xcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJuYW1lXFxcIj5cIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudXNlcm5hbWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnVzZXJuYW1lIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMiksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMyA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJ1c2VybmFtZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCI8L3NwYW4+XFxuICAgICAgICAgICAgICAgIDx0aW1lPlwiXG4gICAgKyBhbGlhczQoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy52YWd1ZVRpbWUgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnZhZ3VlVGltZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwidmFndWVUaW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIjwvdGltZT5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJ0ZXh0XFxcIj5cIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMuZGVzY3JpcHRpb24gfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmRlc2NyaXB0aW9uIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMiksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMyA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJkZXNjcmlwdGlvblwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCI8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicXVpcC1wbGF5ZXJcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwicHJvZ3Jlc3MtYmFyXFxcIj48L2Rpdj5cXG4gICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1wbGF5XFxcIj48L2k+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJxdWlwLWFjdGlvbnNcXFwiPlxcbiAgICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvblxcXCIgaHJlZj1cXFwiXCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnB1YmxpY1VybCB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAucHVibGljVXJsIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMiksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMyA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJwdWJsaWNVcmxcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIiB0aXRsZT1cXFwiU2hhcmVcXFwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1zaGFyZS1zcXVhcmUtb1xcXCI+PC9pPiA8c3BhbiBjbGFzcz1cXFwiY2FwdGlvblxcXCI+U2hhcmU8L3NwYW4+XFxuICAgICAgICA8L2E+XFxuICAgICAgICA8YSBjbGFzcz1cXFwiYnV0dG9uIGxvY2staW5kaWNhdG9yXFxcIiB0aXRsZT1cXFwiVG9nZ2xlIHZpc2liaWxpdHlcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbXCJpZlwiXS5jYWxsKGFsaWFzMSwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaXNQdWJsaWMgOiBkZXB0aDApLHtcIm5hbWVcIjpcImlmXCIsXCJoYXNoXCI6e30sXCJmblwiOmNvbnRhaW5lci5wcm9ncmFtKDEsIGRhdGEsIDApLFwiaW52ZXJzZVwiOmNvbnRhaW5lci5wcm9ncmFtKDMsIGRhdGEsIDApLFwiZGF0YVwiOmRhdGF9KSkgIT0gbnVsbCA/IHN0YWNrMSA6IFwiXCIpXG4gICAgKyBcIiAgICAgICAgPC9hPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbXCJpZlwiXS5jYWxsKGFsaWFzMSwoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAuaXNNaW5lIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjpjb250YWluZXIucHJvZ3JhbSg1LCBkYXRhLCAwKSxcImludmVyc2VcIjpjb250YWluZXIubm9vcCxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCIgICAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImV4cG9ydCBkZWZhdWx0IGNsYXNzIFBvbHlmaWxsIHtcbiAgICBzdGF0aWMgaW5zdGFsbCgpIHtcbiAgICAgICAgd2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCB8fCBmYWxzZTtcbiAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci5tc0dldFVzZXJNZWRpYSB8fCBmYWxzZTtcblxuICAgICAgICBpZiAobmF2aWdhdG9yLm1lZGlhRGV2aWNlID09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicG9seWZpbGxpbmcgbWVkaWFEZXZpY2UuZ2V0VXNlck1lZGlhXCIpO1xuXG4gICAgICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2UgPSB7XG4gICAgICAgICAgICAgICAgZ2V0VXNlck1lZGlhOiAocHJvcHMpID0+IG5ldyBQcm9taXNlKCh5LCBuKSA9PiBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKHByb3BzLCB5LCBuKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbmF2aWdhdG9yLmdldFVzZXJNZWRpYSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkF1ZGlvQ2FwdHVyZTo6cG9seWZpbGwoKTsgZ2V0VXNlck1lZGlhKCkgbm90IHN1cHBvcnRlZC5cIik7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBQcmVzZW50ZXIge1xuICAgIHNob3dIZWFkZXJOYXYodmlldykge1xuICAgICAgICAkKFwiYm9keSA+IGhlYWRlclwiKS5hcHBlbmQodmlldy5lbCk7XG4gICAgfVxuXG4gICAgc3dpdGNoVmlldyhuZXdWaWV3KSB7XG4gICAgICAgIGlmKHRoaXMudmlldykge1xuICAgICAgICAgICAgdmFyIG9sZFZpZXcgPSB0aGlzLnZpZXc7XG4gICAgICAgICAgICBvbGRWaWV3LiRlbC5yZW1vdmVDbGFzcyhcInRyYW5zaXRpb24taW5cIik7XG4gICAgICAgICAgICBvbGRWaWV3LiRlbC5hZGRDbGFzcyhcInRyYW5zaXRpb24tb3V0XCIpO1xuICAgICAgICAgICAgb2xkVmlldy4kZWwub25lKFwiYW5pbWF0aW9uZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICBvbGRWaWV3LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIG9sZFZpZXcudW5iaW5kKCk7XG4gICAgICAgICAgICAgICAgaWYob2xkVmlldy5zaHV0ZG93biAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIG9sZFZpZXcuc2h1dGRvd24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ld1ZpZXcuJGVsLmFkZENsYXNzKFwidHJhbnNpdGlvbmFibGUgdHJhbnNpdGlvbi1pblwiKTtcbiAgICAgICAgbmV3Vmlldy4kZWwub25lKFwiYW5pbWF0aW9uZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIG5ld1ZpZXcuJGVsLnJlbW92ZUNsYXNzKFwidHJhbnNpdGlvbi1pblwiKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI3ZpZXctY29udGFpbmVyJykuYXBwZW5kKG5ld1ZpZXcuZWwpO1xuICAgICAgICB0aGlzLnZpZXcgPSBuZXdWaWV3O1xuICAgIH1cbn1cblxuZXhwb3J0IGxldCBSb290UHJlc2VudGVyID0gbmV3IFByZXNlbnRlcigpO1xuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0ICogYXMgQ29udHJvbGxlcnMgZnJvbSAnLi9wYWdlcy9Db250cm9sbGVycydcbmltcG9ydCBIZWFkZXJOYXZWaWV3IGZyb20gJy4vcGFydGlhbHMvSGVhZGVyTmF2VmlldydcbmltcG9ydCB7IFJvb3RQcmVzZW50ZXIgfSBmcm9tICcuL3ByZXNlbnRlcidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUm91dGVyIGV4dGVuZHMgQmFja2JvbmUuUm91dGVyIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoe1xuICAgICAgICAgICAgcm91dGVzOiB7XG4gICAgICAgICAgICAgICAgJyc6ICdob21lJyxcbiAgICAgICAgICAgICAgICAncmVjb3JkJzogJ3JlY29yZCcsXG4gICAgICAgICAgICAgICAgJ3UvOnVzZXJuYW1lJzogJ3VzZXInLFxuICAgICAgICAgICAgICAgICdjaGFuZ2Vsb2cnOiAnY2hhbmdlbG9nJyxcbiAgICAgICAgICAgICAgICAncS86cXVpcGlkJzogJ3NpbmdsZV9pdGVtJyxcbiAgICAgICAgICAgICAgICAnc3RyZWFtcyc6ICdsaXN0X3N0cmVhbXMnLFxuICAgICAgICAgICAgICAgICdzdHJlYW1zLzppZCc6ICdzdHJlYW1fZGV0YWlscydcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0VXNlcih1c2VyKSB7XG4gICAgICAgIFJvb3RQcmVzZW50ZXIuc2hvd0hlYWRlck5hdihuZXcgSGVhZGVyTmF2Vmlldyh1c2VyKSlcbiAgICB9XG5cbiAgICBzaW5nbGVfaXRlbShpZCkge1xuICAgICAgICBuZXcgQ29udHJvbGxlcnMuU2luZ2xlUG9kQ29udHJvbGxlcihSb290UHJlc2VudGVyLCBpZCk7XG4gICAgfVxuXG4gICAgaG9tZSgpIHtcbiAgICAgICAgbmV3IENvbnRyb2xsZXJzLkhvbWVDb250cm9sbGVyKFJvb3RQcmVzZW50ZXIpO1xuICAgIH1cblxuICAgIHVzZXIodXNlcm5hbWUpIHtcbiAgICAgICAgbmV3IENvbnRyb2xsZXJzLlVzZXJDb250cm9sbGVyKFJvb3RQcmVzZW50ZXIsIHVzZXJuYW1lKTtcbiAgICB9XG5cbiAgICBjaGFuZ2Vsb2coKSB7XG4gICAgICAgIG5ldyBDb250cm9sbGVycy5DaGFuZ2Vsb2dDb250cm9sbGVyKFJvb3RQcmVzZW50ZXIpO1xuICAgIH1cblxuICAgIHJlY29yZCgpIHtcbiAgICAgICAgbmV3IENvbnRyb2xsZXJzLlJlY29yZGVyQ29udHJvbGxlcihSb290UHJlc2VudGVyKTtcbiAgICB9XG5cbiAgICBsaXN0X3N0cmVhbXMoKSB7XG4gICAgICAgIHZhciBjb250cm9sbGVyID0gbmV3IENvbnRyb2xsZXJzLlN0cmVhbUNvbnRyb2xsZXIoUm9vdFByZXNlbnRlcik7XG4gICAgICAgIGNvbnRyb2xsZXIubGlzdF9zdHJlYW1zKCk7XG4gICAgfVxuXG4gICAgc3RyZWFtX2RldGFpbHMoaWQpIHtcbiAgICAgICAgdmFyIGNvbnRyb2xsZXIgPSBuZXcgQ29udHJvbGxlcnMuU3RyZWFtQ29udHJvbGxlcihSb290UHJlc2VudGVyKTtcbiAgICAgICAgY29udHJvbGxlci5kZXRhaWxzKGlkKTtcbiAgICB9XG59XG4iXX0=
