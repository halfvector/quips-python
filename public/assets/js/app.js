(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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


},{"./handlebars/base":2,"./handlebars/exception":5,"./handlebars/no-conflict":15,"./handlebars/runtime":16,"./handlebars/safe-string":17,"./handlebars/utils":18}],2:[function(require,module,exports){
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


},{"./decorators":3,"./exception":5,"./helpers":6,"./logger":14,"./utils":18}],3:[function(require,module,exports){
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


},{"./decorators/inline":4}],4:[function(require,module,exports){
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


},{"../utils":18}],5:[function(require,module,exports){
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


},{}],6:[function(require,module,exports){
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


},{"./helpers/block-helper-missing":7,"./helpers/each":8,"./helpers/helper-missing":9,"./helpers/if":10,"./helpers/log":11,"./helpers/lookup":12,"./helpers/with":13}],7:[function(require,module,exports){
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


},{"../utils":18}],8:[function(require,module,exports){
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


},{"../exception":5,"../utils":18}],9:[function(require,module,exports){
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


},{"../exception":5}],10:[function(require,module,exports){
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


},{"../utils":18}],11:[function(require,module,exports){
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


},{}],12:[function(require,module,exports){
'use strict';

exports.__esModule = true;

exports['default'] = function (instance) {
  instance.registerHelper('lookup', function (obj, field) {
    return obj && obj[field];
  });
};

module.exports = exports['default'];


},{}],13:[function(require,module,exports){
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


},{"../utils":18}],14:[function(require,module,exports){
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


},{"./utils":18}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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


},{"./base":2,"./exception":5,"./utils":18}],17:[function(require,module,exports){
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


},{}],18:[function(require,module,exports){
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


},{}],19:[function(require,module,exports){
// Create a simple path alias to allow browserify to resolve
// the runtime on a supported path.
module.exports = require('./dist/cjs/handlebars.runtime')['default'];

},{"./dist/cjs/handlebars.runtime":1}],20:[function(require,module,exports){
module.exports = require("handlebars/runtime")["default"];

},{"handlebars/runtime":19}],21:[function(require,module,exports){
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

var _modelsListenState = require('./models/ListenState');

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
            //if (!Backbone.history.start({pushState: true, hashChange: false})) router.navigate('404', {trigger: true});

            this.router = new _router2['default']();
            this.redirectUrlClicksToRouter();

            var audioPlayer = new _partialsAudioPlayerView.AudioPlayerView({ el: '#audio-player' });

            // load user
            new _modelsCurrentUser.CurrentUserModel().fetch().then(function (model) {
                return _this.onUserAuthenticated(model);
            }, function (response) {
                return _this.onUserAuthFail(response);
            });

            //new ListenStateCollection().fetch().then((state) => console.log("got listen states", state));
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
        }
    }]);

    return Application;
})();

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

exports['default'] = { Application: Application };

},{"./models/CurrentUser":24,"./models/ListenState":25,"./partials/AudioPlayerView":38,"./polyfill.js":43,"./router":45,"backbone":"backbone","jquery":"jquery"}],22:[function(require,module,exports){
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

},{"underscore":"underscore"}],23:[function(require,module,exports){
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

},{"backbone":"backbone","underscore":"underscore"}],24:[function(require,module,exports){
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

},{"backbone":"backbone"}],25:[function(require,module,exports){
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

var ListenState = (function (_Backbone$Model) {
    _inherits(ListenState, _Backbone$Model);

    _createClass(ListenState, [{
        key: 'defaults',
        value: function defaults() {
            return {
                audioId: 0, // id string of quip
                progress: 0 };
        }
    }]);

    // [0-100]

    function ListenState(props) {
        _classCallCheck(this, ListenState);

        _get(Object.getPrototypeOf(ListenState.prototype), 'constructor', this).call(this, props);
        this.urlRoot = '/api/listen';
    }

    return ListenState;
})(_backbone2['default'].Model);

var ListenStateCollection = (function (_Backbone$Collection) {
    _inherits(ListenStateCollection, _Backbone$Collection);

    function ListenStateCollection(opts) {
        _classCallCheck(this, ListenStateCollection);

        _get(Object.getPrototypeOf(ListenStateCollection.prototype), 'constructor', this).call(this, opts);
        this.model = ListenState;
        this.url = "/api/listen";
    }

    return ListenStateCollection;
})(_backbone2['default'].Collection);

exports.ListenState = ListenState;
exports.ListenStateCollection = ListenStateCollection;

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
    return "<div class=\"changelog\">\n    <h2>Changelog</h2>\n\n    <h3>2015-12-05</h3>\n\n    <p>Dark-theme with unsplash.com bg - because I often work on this late at night.</p>\n\n    <p>More mobile friendly design.</p>\n\n    <p>\n        Stopped trying to get audio-recording to work well on Android 4.x after burneing many weekends and nights.\n        The audio glitches even when recording pure PCM, a problem at the Web Audio level, nothing I can do about it.\n    </p>\n\n    <p>\n        Found a fun workaround mobile chrome's inability to play Web Audio recorded wave files:\n        run the generated blobs through an ajax request, making the blob disk-backed locally, now the local blob\n        can be passed into an &lt;audio&gt; player.\n    </p>\n\n    <p>Focusing on making the mobile listening experience great.</p>\n\n    <h3>2015-10-04</h3>\n\n    <p>Slight facelift, using a new flat style. Added a few animations and this public changelog! :)</p>\n\n    <h3>2015-09-26</h3>\n\n    <p>Designed a logo and created a pretty landing-page with twitter-login.</p>\n\n    <p>Added Sentry for Javascript error collection and Heap Analytics for creating ad-hoc analytics.</p>\n\n    <h3>2015-09-20</h3>\n\n    <p>Setup two new servers on Digital Oceans with Route 53 routing and an SSL certificate for production.\n        Having an SSL certificate means the site can be accessed via HTTPS which allows browsers\n        to cache the Microphone Access permissions, which means you don't have to click \"allow\" every time\n        you want to make a recording!</p>\n\n    <p>Fixed up Python Fabric deployment script to work in new staging + production environments.\n        And added MongoDB backup/restore support.</p>\n\n    <p>Updated Python dependencies, they were over a year old, and fixed code that broke as a result.\n        Mostly around changes to MongoEngine Python lib.</p>\n\n    <h3>2015-09-05</h3>\n\n    <p>Fixed project to work on OSX and without the NGINX dependency. I can now run it all in python,\n        including the static file hosting. The production servers use NGINX for better performance.</p>\n\n    <h3>2014-03-29</h3>\n\n    <p>Request Media Streaming permission from browser on recording-page load. This makes the microphone\n        available the instant you hit the record button. No need to hit record button and then deal with browser's\n        security popups asking for permission to access microphone.</p>\n\n    <p>Removed countdown clock untill recording begins, the \"3-2-1 go\" wasn't that helpful.</p>\n\n    <h3>2014-03-27</h3>\n\n    <p>Fixed bug in tracking where you paused in the playback of a recording. Now you should be able to\n        resume playback exactly where you left off. :)</p>\n\n</div>\n";
},"useData":true});

},{"hbsfy/runtime":20}],28:[function(require,module,exports){
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
// hbsfy compiled Handlebars template
var HandlebarsCompiler = require('hbsfy/runtime');
module.exports = HandlebarsCompiler.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<div class=\"m-microphone-required\">\n    <h2>Microphone required.</h2>\n</div>\n";
},"useData":true});

},{"hbsfy/runtime":20}],30:[function(require,module,exports){
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

},{"../../audio-capture":22,"../../models/CreateRecordingModel":23,"./GetMicrophone.hbs":29,"backbone":"backbone","underscore":"underscore"}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){
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

},{"../../models/Quip":26,"../../partials/AudioPlayerView":38,"../../partials/QuipView.js":41,"backbone":"backbone"}],33:[function(require,module,exports){
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

},{"hbsfy/runtime":20}],34:[function(require,module,exports){
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

},{"../../audio-capture":22,"../../models/CreateRecordingModel":23,"../../partials/QuipView.js":41,"./RecorderView.hbs":33,"backbone":"backbone","underscore":"underscore"}],35:[function(require,module,exports){
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

},{"../../models/Quip":26,"../Views":37,"backbone":"backbone"}],36:[function(require,module,exports){
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

},{"../../models/Quip":26,"../Views":37,"backbone":"backbone"}],37:[function(require,module,exports){
'use strict';

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

},{"../partials/AudioPlayerView":38,"../partials/HeaderNavView":40,"../partials/QuipView":41,"./Changelog/ChangelogView":28,"./GetMicrophone/GetMicrophoneView":30,"./Homepage/HomepageView":32,"./Recorder/RecorderView":34,"./User/UserAllRecordingsView":35,"./User/UserSingleRecordingView":36}],38:[function(require,module,exports){
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

},{"backbone":"backbone","underscore":"underscore"}],39:[function(require,module,exports){
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

},{"hbsfy/runtime":20}],40:[function(require,module,exports){
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

},{"./HeaderNavView.hbs":39,"backbone":"backbone"}],41:[function(require,module,exports){
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

},{"../app":21,"../models/Quip":26,"./AudioPlayerView.js":38,"./RecordingItem.hbs":42,"backbone":"backbone","underscore":"underscore","vague-time":"vague-time"}],42:[function(require,module,exports){
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

},{"hbsfy/runtime":20}],43:[function(require,module,exports){
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

},{}],44:[function(require,module,exports){
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

},{}],45:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _backbone = require('backbone');

var _backbone2 = _interopRequireDefault(_backbone);

var _pagesChangelogChangelogView = require('./pages/Changelog/ChangelogView');

var _pagesChangelogChangelogView2 = _interopRequireDefault(_pagesChangelogChangelogView);

var _pagesHomepageHomepageView = require('./pages/Homepage/HomepageView');

var _pagesHomepageHomepageView2 = _interopRequireDefault(_pagesHomepageHomepageView);

var _pagesRecorderRecorderView = require('./pages/Recorder/RecorderView');

var _pagesRecorderRecorderView2 = _interopRequireDefault(_pagesRecorderRecorderView);

var _pagesGetMicrophoneGetMicrophoneView = require('./pages/GetMicrophone/GetMicrophoneView');

var _pagesGetMicrophoneGetMicrophoneView2 = _interopRequireDefault(_pagesGetMicrophoneGetMicrophoneView);

var _pagesUserUserSingleRecordingView = require('./pages/User/UserSingleRecordingView');

var _pagesUserUserSingleRecordingView2 = _interopRequireDefault(_pagesUserUserSingleRecordingView);

var _partialsHeaderNavView = require('./partials/HeaderNavView');

var _partialsHeaderNavView2 = _interopRequireDefault(_partialsHeaderNavView);

var _partialsQuipView = require('./partials/QuipView');

var _partialsQuipView2 = _interopRequireDefault(_partialsQuipView);

var _pagesUserUserAllRecordingsView = require('./pages/User/UserAllRecordingsView');

var _pagesGetMicrophoneMicrophonePermissions = require('./pages/GetMicrophone/MicrophonePermissions');

var _pagesGetMicrophoneMicrophonePermissions2 = _interopRequireDefault(_pagesGetMicrophoneMicrophonePermissions);

var _presenter = require('./presenter');

var RecorderController = (function () {
    function RecorderController(presenter) {
        _classCallCheck(this, RecorderController);

        this.presenter = presenter;
        new _pagesGetMicrophoneMicrophonePermissions2['default']().grabMicrophone(this.onMicrophoneAcquired, this.onMicrophoneDenied);
    }

    _createClass(RecorderController, [{
        key: 'onMicrophoneAcquired',
        value: function onMicrophoneAcquired(microphoneMediaStream) {
            this.presenter.switchView(new _pagesRecorderRecorderView2['default'](microphoneMediaStream));
        }
    }, {
        key: 'onMicrophoneDenied',
        value: function onMicrophoneDenied() {
            this.presenter.switchView(new _pagesGetMicrophoneGetMicrophoneView2['default']());
        }
    }]);

    return RecorderController;
})();

var HomeController = function HomeController(presenter) {
    _classCallCheck(this, HomeController);

    presenter.switchView(new _pagesHomepageHomepageView2['default']());
};

var UserController = function UserController(presenter, username) {
    _classCallCheck(this, UserController);

    presenter.switchView(new _pagesUserUserAllRecordingsView.UserPodCollectionView(username));
};

var ChangelogController = function ChangelogController(presenter) {
    _classCallCheck(this, ChangelogController);

    presenter.switchView(new _pagesChangelogChangelogView2['default']());
};

var SinglePodController = function SinglePodController(presenter, id) {
    _classCallCheck(this, SinglePodController);

    presenter.switchView(new _pagesUserUserSingleRecordingView2['default'](id));
};

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
                'q/:quipid': 'single_item'
            }
        });
    }

    _createClass(Router, [{
        key: 'initialize',
        value: function initialize() {}
    }, {
        key: 'setUser',
        value: function setUser(user) {
            _presenter.RootPresenter.showHeaderNav(new _partialsHeaderNavView2['default'](user));
        }
    }, {
        key: 'single_item',
        value: function single_item(id) {
            new SinglePodController(_presenter.RootPresenter, id);
        }
    }, {
        key: 'home',
        value: function home() {
            new HomeController(_presenter.RootPresenter);
        }
    }, {
        key: 'user',
        value: function user(username) {
            new UserController(_presenter.RootPresenter, username);
        }
    }, {
        key: 'changelog',
        value: function changelog() {
            new ChangelogController(_presenter.RootPresenter);
        }
    }, {
        key: 'record',
        value: function record() {
            new RecorderController(_presenter.RootPresenter);
        }
    }]);

    return Router;
})(_backbone2['default'].Router);

exports['default'] = Router;
module.exports = exports['default'];

},{"./pages/Changelog/ChangelogView":28,"./pages/GetMicrophone/GetMicrophoneView":30,"./pages/GetMicrophone/MicrophonePermissions":31,"./pages/Homepage/HomepageView":32,"./pages/Recorder/RecorderView":34,"./pages/User/UserAllRecordingsView":35,"./pages/User/UserSingleRecordingView":36,"./partials/HeaderNavView":40,"./partials/QuipView":41,"./presenter":44,"backbone":"backbone"}]},{},[21])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy5ydW50aW1lLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2RlY29yYXRvcnMuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9kZWNvcmF0b3JzL2lubGluZS5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2V4Y2VwdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9oZWxwZXJzL2Jsb2NrLWhlbHBlci1taXNzaW5nLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvaGVscGVycy9lYWNoLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvaGVscGVycy9oZWxwZXItbWlzc2luZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMvaWYuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9oZWxwZXJzL2xvZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2hlbHBlcnMvbG9va3VwLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvaGVscGVycy93aXRoLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvbG9nZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9uby1jb25mbGljdC5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCJub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9zYWZlLXN0cmluZy5qcyIsIm5vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIm5vZGVfbW9kdWxlcy9oYnNmeS9ydW50aW1lLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9hcHAuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL2F1ZGlvLWNhcHR1cmUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL21vZGVscy9DcmVhdGVSZWNvcmRpbmdNb2RlbC5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvbW9kZWxzL0N1cnJlbnRVc2VyLmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9tb2RlbHMvTGlzdGVuU3RhdGUuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL21vZGVscy9RdWlwLmpzIiwic3BhL3BhZ2VzL0NoYW5nZWxvZy9DaGFuZ2Vsb2dWaWV3LmhicyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvQ2hhbmdlbG9nL0NoYW5nZWxvZ1ZpZXcuanMiLCJzcGEvcGFnZXMvR2V0TWljcm9waG9uZS9HZXRNaWNyb3Bob25lLmhicyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvR2V0TWljcm9waG9uZS9HZXRNaWNyb3Bob25lVmlldy5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFnZXMvR2V0TWljcm9waG9uZS9NaWNyb3Bob25lUGVybWlzc2lvbnMuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL3BhZ2VzL0hvbWVwYWdlL0hvbWVwYWdlVmlldy5qcyIsInNwYS9wYWdlcy9SZWNvcmRlci9SZWNvcmRlclZpZXcuaGJzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9SZWNvcmRlci9SZWNvcmRlclZpZXcuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL3BhZ2VzL1VzZXIvVXNlckFsbFJlY29yZGluZ3NWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9Vc2VyL1VzZXJTaW5nbGVSZWNvcmRpbmdWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYWdlcy9WaWV3cy5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcGFydGlhbHMvQXVkaW9QbGF5ZXJWaWV3LmpzIiwic3BhL3BhcnRpYWxzL0hlYWRlck5hdlZpZXcuaGJzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYXJ0aWFscy9IZWFkZXJOYXZWaWV3LmpzIiwiL1VzZXJzL2FiYXJrYW4vYWxleC1kZXYvcXVpcHMtcHl0aG9uL3NwYS9wYXJ0aWFscy9RdWlwVmlldy5qcyIsInNwYS9wYXJ0aWFscy9SZWNvcmRpbmdJdGVtLmhicyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcG9seWZpbGwuanMiLCIvVXNlcnMvYWJhcmthbi9hbGV4LWRldi9xdWlwcy1weXRob24vc3BhL3ByZXNlbnRlci5qcyIsIi9Vc2Vycy9hYmFya2FuL2FsZXgtZGV2L3F1aXBzLXB5dGhvbi9zcGEvcm91dGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7OEJDQXNCLG1CQUFtQjs7SUFBN0IsSUFBSTs7Ozs7b0NBSU8sMEJBQTBCOzs7O21DQUMzQix3QkFBd0I7Ozs7K0JBQ3ZCLG9CQUFvQjs7SUFBL0IsS0FBSzs7aUNBQ1Esc0JBQXNCOztJQUFuQyxPQUFPOztvQ0FFSSwwQkFBMEI7Ozs7O0FBR2pELFNBQVMsTUFBTSxHQUFHO0FBQ2hCLE1BQUksRUFBRSxHQUFHLElBQUksSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7O0FBRTFDLE9BQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3ZCLElBQUUsQ0FBQyxVQUFVLG9DQUFhLENBQUM7QUFDM0IsSUFBRSxDQUFDLFNBQVMsbUNBQVksQ0FBQztBQUN6QixJQUFFLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUNqQixJQUFFLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDOztBQUU3QyxJQUFFLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQztBQUNoQixJQUFFLENBQUMsUUFBUSxHQUFHLFVBQVMsSUFBSSxFQUFFO0FBQzNCLFdBQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FDbkMsQ0FBQzs7QUFFRixTQUFPLEVBQUUsQ0FBQztDQUNYOztBQUVELElBQUksSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDO0FBQ3BCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDOztBQUVyQixrQ0FBVyxJQUFJLENBQUMsQ0FBQzs7QUFFakIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQzs7cUJBRVIsSUFBSTs7Ozs7Ozs7Ozs7OztxQkNwQ3lCLFNBQVM7O3lCQUMvQixhQUFhOzs7O3VCQUNFLFdBQVc7OzBCQUNSLGNBQWM7O3NCQUNu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QUNWLHdCQUFRLEVBQUUsUUFBUTtBQUNsQiw2QkFBYSxFQUFFLE1BQU07QUFDckIsMkJBQVcsRUFBRSxXQUFXO0FBQ3hCLDJCQUFXLEVBQUUsYUFBYTthQUM3QjtTQUNKLEVBQUU7S0FDTjs7aUJBWEMsTUFBTTs7ZUFhRSxzQkFBRyxFQUNaOzs7ZUFFTSxpQkFBQyxJQUFJLEVBQUU7QUFDVixxQ0FBYyxhQUFhLENBQUMsdUNBQWtCLElBQUksQ0FBQyxDQUFDLENBQUE7U0FDdkQ7OztlQUVVLHFCQUFDLEVBQUUsRUFBRTtBQUNaLGdCQUFJLG1CQUFtQiwyQkFBZ0IsRUFBRSxDQUFDLENBQUM7U0FDOUM7OztlQUVHLGdCQUFHO0FBQ0gsZ0JBQUksY0FBYywwQkFBZSxDQUFDO1NBQ3JDOzs7ZUFFRyxjQUFDLFFBQVEsRUFBRTtBQUNYLGdCQUFJLGNBQWMsMkJBQWdCLFFBQVEsQ0FBQyxDQUFDO1NBQy9DOzs7ZUFFUSxxQkFBRztBQUNSLGdCQUFJLG1CQUFtQiwwQkFBZSxDQUFDO1NBQzFDOzs7ZUFFSyxrQkFBRztBQUNMLGdCQUFJLGtCQUFrQiwwQkFBZSxDQUFDO1NBQ3pDOzs7V0F0Q0MsTUFBTTtHQUFTLHNCQUFTLE1BQU07O3FCQTJDckIsTUFBTSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQgKiBhcyBiYXNlIGZyb20gJy4vaGFuZGxlYmFycy9iYXNlJztcblxuLy8gRWFjaCBvZiB0aGVzZSBhdWdtZW50IHRoZSBIYW5kbGViYXJzIG9iamVjdC4gTm8gbmVlZCB0byBzZXR1cCBoZXJlLlxuLy8gKFRoaXMgaXMgZG9uZSB0byBlYXNpbHkgc2hhcmUgY29kZSBiZXR3ZWVuIGNvbW1vbmpzIGFuZCBicm93c2UgZW52cylcbmltcG9ydCBTYWZlU3RyaW5nIGZyb20gJy4vaGFuZGxlYmFycy9zYWZlLXN0cmluZyc7XG5pbXBvcnQgRXhjZXB0aW9uIGZyb20gJy4vaGFuZGxlYmFycy9leGNlcHRpb24nO1xuaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnLi9oYW5kbGViYXJzL3V0aWxzJztcbmltcG9ydCAqIGFzIHJ1bnRpbWUgZnJvbSAnLi9oYW5kbGViYXJzL3J1bnRpbWUnO1xuXG5pbXBvcnQgbm9Db25mbGljdCBmcm9tICcuL2hhbmRsZWJhcnMvbm8tY29uZmxpY3QnO1xuXG4vLyBGb3IgY29tcGF0aWJpbGl0eSBhbmQgdXNhZ2Ugb3V0c2lkZSBvZiBtb2R1bGUgc3lzdGVtcywgbWFrZSB0aGUgSGFuZGxlYmFycyBvYmplY3QgYSBuYW1lc3BhY2VcbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgbGV0IGhiID0gbmV3IGJhc2UuSGFuZGxlYmFyc0Vudmlyb25tZW50KCk7XG5cbiAgVXRpbHMuZXh0ZW5kKGhiLCBiYXNlKTtcbiAgaGIuU2FmZVN0cmluZyA9IFNhZmVTdHJpbmc7XG4gIGhiLkV4Y2VwdGlvbiA9IEV4Y2VwdGlvbjtcbiAgaGIuVXRpbHMgPSBVdGlscztcbiAgaGIuZXNjYXBlRXhwcmVzc2lvbiA9IFV0aWxzLmVzY2FwZUV4cHJlc3Npb247XG5cbiAgaGIuVk0gPSBydW50aW1lO1xuICBoYi50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICByZXR1cm4gcnVudGltZS50ZW1wbGF0ZShzcGVjLCBoYik7XG4gIH07XG5cbiAgcmV0dXJuIGhiO1xufVxuXG5sZXQgaW5zdCA9IGNyZWF0ZSgpO1xuaW5zdC5jcmVhdGUgPSBjcmVhdGU7XG5cbm5vQ29uZmxpY3QoaW5zdCk7XG5cbmluc3RbJ2RlZmF1bHQnXSA9IGluc3Q7XG5cbmV4cG9ydCBkZWZhdWx0IGluc3Q7XG4iLCJpbXBvcnQge2NyZWF0ZUZyYW1lLCBleHRlbmQsIHRvU3RyaW5nfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBFeGNlcHRpb24gZnJvbSAnLi9leGNlcHRpb24nO1xuaW1wb3J0IHtyZWdpc3RlckRlZmF1bHRIZWxwZXJzfSBmcm9tICcuL2hlbHBlcnMnO1xuaW1wb3J0IHtyZWdpc3RlckRlZmF1bHREZWNvcmF0b3JzfSBmcm9tICcuL2RlY29yYXRvcnMnO1xuaW1wb3J0IGxvZ2dlciBmcm9tICcuL2xvZ2dlcic7XG5cbmV4cG9ydCBjb25zdCBWRVJTSU9OID0gJzQuMC41JztcbmV4cG9ydCBjb25zdCBDT01QSUxFUl9SRVZJU0lPTiA9IDc7XG5cbmV4cG9ydCBjb25zdCBSRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz09IDEueC54JyxcbiAgNTogJz09IDIuMC4wLWFscGhhLngnLFxuICA2OiAnPj0gMi4wLjAtYmV0YS4xJyxcbiAgNzogJz49IDQuMC4wJ1xufTtcblxuY29uc3Qgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5leHBvcnQgZnVuY3Rpb24gSGFuZGxlYmFyc0Vudmlyb25tZW50KGhlbHBlcnMsIHBhcnRpYWxzLCBkZWNvcmF0b3JzKSB7XG4gIHRoaXMuaGVscGVycyA9IGhlbHBlcnMgfHwge307XG4gIHRoaXMucGFydGlhbHMgPSBwYXJ0aWFscyB8fCB7fTtcbiAgdGhpcy5kZWNvcmF0b3JzID0gZGVjb3JhdG9ycyB8fCB7fTtcblxuICByZWdpc3RlckRlZmF1bHRIZWxwZXJzKHRoaXMpO1xuICByZWdpc3RlckRlZmF1bHREZWNvcmF0b3JzKHRoaXMpO1xufVxuXG5IYW5kbGViYXJzRW52aXJvbm1lbnQucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogSGFuZGxlYmFyc0Vudmlyb25tZW50LFxuXG4gIGxvZ2dlcjogbG9nZ2VyLFxuICBsb2c6IGxvZ2dlci5sb2csXG5cbiAgcmVnaXN0ZXJIZWxwZXI6IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChmbikgeyB0aHJvdyBuZXcgRXhjZXB0aW9uKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTsgfVxuICAgICAgZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICAgIH1cbiAgfSxcbiAgdW5yZWdpc3RlckhlbHBlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLmhlbHBlcnNbbmFtZV07XG4gIH0sXG5cbiAgcmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbihuYW1lLCBwYXJ0aWFsKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGV4dGVuZCh0aGlzLnBhcnRpYWxzLCBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBwYXJ0aWFsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKGBBdHRlbXB0aW5nIHRvIHJlZ2lzdGVyIGEgcGFydGlhbCBjYWxsZWQgXCIke25hbWV9XCIgYXMgdW5kZWZpbmVkYCk7XG4gICAgICB9XG4gICAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gcGFydGlhbDtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMucGFydGlhbHNbbmFtZV07XG4gIH0sXG5cbiAgcmVnaXN0ZXJEZWNvcmF0b3I6IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICAgIGlmIChmbikgeyB0aHJvdyBuZXcgRXhjZXB0aW9uKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGRlY29yYXRvcnMnKTsgfVxuICAgICAgZXh0ZW5kKHRoaXMuZGVjb3JhdG9ycywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGVjb3JhdG9yc1tuYW1lXSA9IGZuO1xuICAgIH1cbiAgfSxcbiAgdW5yZWdpc3RlckRlY29yYXRvcjogZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLmRlY29yYXRvcnNbbmFtZV07XG4gIH1cbn07XG5cbmV4cG9ydCBsZXQgbG9nID0gbG9nZ2VyLmxvZztcblxuZXhwb3J0IHtjcmVhdGVGcmFtZSwgbG9nZ2VyfTtcbiIsImltcG9ydCByZWdpc3RlcklubGluZSBmcm9tICcuL2RlY29yYXRvcnMvaW5saW5lJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdERlY29yYXRvcnMoaW5zdGFuY2UpIHtcbiAgcmVnaXN0ZXJJbmxpbmUoaW5zdGFuY2UpO1xufVxuXG4iLCJpbXBvcnQge2V4dGVuZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckRlY29yYXRvcignaW5saW5lJywgZnVuY3Rpb24oZm4sIHByb3BzLCBjb250YWluZXIsIG9wdGlvbnMpIHtcbiAgICBsZXQgcmV0ID0gZm47XG4gICAgaWYgKCFwcm9wcy5wYXJ0aWFscykge1xuICAgICAgcHJvcHMucGFydGlhbHMgPSB7fTtcbiAgICAgIHJldCA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IHBhcnRpYWxzIHN0YWNrIGZyYW1lIHByaW9yIHRvIGV4ZWMuXG4gICAgICAgIGxldCBvcmlnaW5hbCA9IGNvbnRhaW5lci5wYXJ0aWFscztcbiAgICAgICAgY29udGFpbmVyLnBhcnRpYWxzID0gZXh0ZW5kKHt9LCBvcmlnaW5hbCwgcHJvcHMucGFydGlhbHMpO1xuICAgICAgICBsZXQgcmV0ID0gZm4oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICAgIGNvbnRhaW5lci5wYXJ0aWFscyA9IG9yaWdpbmFsO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBwcm9wcy5wYXJ0aWFsc1tvcHRpb25zLmFyZ3NbMF1dID0gb3B0aW9ucy5mbjtcblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xufVxuIiwiXG5jb25zdCBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuZnVuY3Rpb24gRXhjZXB0aW9uKG1lc3NhZ2UsIG5vZGUpIHtcbiAgbGV0IGxvYyA9IG5vZGUgJiYgbm9kZS5sb2MsXG4gICAgICBsaW5lLFxuICAgICAgY29sdW1uO1xuICBpZiAobG9jKSB7XG4gICAgbGluZSA9IGxvYy5zdGFydC5saW5lO1xuICAgIGNvbHVtbiA9IGxvYy5zdGFydC5jb2x1bW47XG5cbiAgICBtZXNzYWdlICs9ICcgLSAnICsgbGluZSArICc6JyArIGNvbHVtbjtcbiAgfVxuXG4gIGxldCB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuY2FsbCh0aGlzLCBtZXNzYWdlKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cblxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBFeGNlcHRpb24pO1xuICB9XG5cbiAgaWYgKGxvYykge1xuICAgIHRoaXMubGluZU51bWJlciA9IGxpbmU7XG4gICAgdGhpcy5jb2x1bW4gPSBjb2x1bW47XG4gIH1cbn1cblxuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG5leHBvcnQgZGVmYXVsdCBFeGNlcHRpb247XG4iLCJpbXBvcnQgcmVnaXN0ZXJCbG9ja0hlbHBlck1pc3NpbmcgZnJvbSAnLi9oZWxwZXJzL2Jsb2NrLWhlbHBlci1taXNzaW5nJztcbmltcG9ydCByZWdpc3RlckVhY2ggZnJvbSAnLi9oZWxwZXJzL2VhY2gnO1xuaW1wb3J0IHJlZ2lzdGVySGVscGVyTWlzc2luZyBmcm9tICcuL2hlbHBlcnMvaGVscGVyLW1pc3NpbmcnO1xuaW1wb3J0IHJlZ2lzdGVySWYgZnJvbSAnLi9oZWxwZXJzL2lmJztcbmltcG9ydCByZWdpc3RlckxvZyBmcm9tICcuL2hlbHBlcnMvbG9nJztcbmltcG9ydCByZWdpc3Rlckxvb2t1cCBmcm9tICcuL2hlbHBlcnMvbG9va3VwJztcbmltcG9ydCByZWdpc3RlcldpdGggZnJvbSAnLi9oZWxwZXJzL3dpdGgnO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0SGVscGVycyhpbnN0YW5jZSkge1xuICByZWdpc3RlckJsb2NrSGVscGVyTWlzc2luZyhpbnN0YW5jZSk7XG4gIHJlZ2lzdGVyRWFjaChpbnN0YW5jZSk7XG4gIHJlZ2lzdGVySGVscGVyTWlzc2luZyhpbnN0YW5jZSk7XG4gIHJlZ2lzdGVySWYoaW5zdGFuY2UpO1xuICByZWdpc3RlckxvZyhpbnN0YW5jZSk7XG4gIHJlZ2lzdGVyTG9va3VwKGluc3RhbmNlKTtcbiAgcmVnaXN0ZXJXaXRoKGluc3RhbmNlKTtcbn1cbiIsImltcG9ydCB7YXBwZW5kQ29udGV4dFBhdGgsIGNyZWF0ZUZyYW1lLCBpc0FycmF5fSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgbGV0IGludmVyc2UgPSBvcHRpb25zLmludmVyc2UsXG4gICAgICAgIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmIChjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gZm4odGhpcyk7XG4gICAgfSBlbHNlIGlmIChjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgaWYgKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICBpZiAob3B0aW9ucy5pZHMpIHtcbiAgICAgICAgICBvcHRpb25zLmlkcyA9IFtvcHRpb25zLm5hbWVdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICAgIGxldCBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IGFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5uYW1lKTtcbiAgICAgICAgb3B0aW9ucyA9IHtkYXRhOiBkYXRhfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfSk7XG59XG4iLCJpbXBvcnQge2FwcGVuZENvbnRleHRQYXRoLCBibG9ja1BhcmFtcywgY3JlYXRlRnJhbWUsIGlzQXJyYXksIGlzRnVuY3Rpb259IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCBFeGNlcHRpb24gZnJvbSAnLi4vZXhjZXB0aW9uJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdNdXN0IHBhc3MgaXRlcmF0b3IgdG8gI2VhY2gnKTtcbiAgICB9XG5cbiAgICBsZXQgZm4gPSBvcHRpb25zLmZuLFxuICAgICAgICBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlLFxuICAgICAgICBpID0gMCxcbiAgICAgICAgcmV0ID0gJycsXG4gICAgICAgIGRhdGEsXG4gICAgICAgIGNvbnRleHRQYXRoO1xuXG4gICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgY29udGV4dFBhdGggPSBhcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKSArICcuJztcbiAgICB9XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgICBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleGVjSXRlcmF0aW9uKGZpZWxkLCBpbmRleCwgbGFzdCkge1xuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgZGF0YS5rZXkgPSBmaWVsZDtcbiAgICAgICAgZGF0YS5pbmRleCA9IGluZGV4O1xuICAgICAgICBkYXRhLmZpcnN0ID0gaW5kZXggPT09IDA7XG4gICAgICAgIGRhdGEubGFzdCA9ICEhbGFzdDtcblxuICAgICAgICBpZiAoY29udGV4dFBhdGgpIHtcbiAgICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gY29udGV4dFBhdGggKyBmaWVsZDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ZpZWxkXSwge1xuICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICBibG9ja1BhcmFtczogYmxvY2tQYXJhbXMoW2NvbnRleHRbZmllbGRdLCBmaWVsZF0sIFtjb250ZXh0UGF0aCArIGZpZWxkLCBudWxsXSlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IGNvbnRleHQubGVuZ3RoOyBpIDwgajsgaSsrKSB7XG4gICAgICAgICAgaWYgKGkgaW4gY29udGV4dCkge1xuICAgICAgICAgICAgZXhlY0l0ZXJhdGlvbihpLCBpLCBpID09PSBjb250ZXh0Lmxlbmd0aCAtIDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHByaW9yS2V5O1xuXG4gICAgICAgIGZvciAobGV0IGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgaWYgKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgLy8gV2UncmUgcnVubmluZyB0aGUgaXRlcmF0aW9ucyBvbmUgc3RlcCBvdXQgb2Ygc3luYyBzbyB3ZSBjYW4gZGV0ZWN0XG4gICAgICAgICAgICAvLyB0aGUgbGFzdCBpdGVyYXRpb24gd2l0aG91dCBoYXZlIHRvIHNjYW4gdGhlIG9iamVjdCB0d2ljZSBhbmQgY3JlYXRlXG4gICAgICAgICAgICAvLyBhbiBpdGVybWVkaWF0ZSBrZXlzIGFycmF5LlxuICAgICAgICAgICAgaWYgKHByaW9yS2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgZXhlY0l0ZXJhdGlvbihwcmlvcktleSwgaSAtIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcHJpb3JLZXkgPSBrZXk7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwcmlvcktleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZXhlY0l0ZXJhdGlvbihwcmlvcktleSwgaSAtIDEsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG59XG4iLCJpbXBvcnQgRXhjZXB0aW9uIGZyb20gJy4uL2V4Y2VwdGlvbic7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oLyogW2FyZ3MsIF1vcHRpb25zICovKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgIC8vIEEgbWlzc2luZyBmaWVsZCBpbiBhIHt7Zm9vfX0gY29uc3RydWN0LlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU29tZW9uZSBpcyBhY3R1YWxseSB0cnlpbmcgdG8gY2FsbCBzb21ldGhpbmcsIGJsb3cgdXAuXG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdNaXNzaW5nIGhlbHBlcjogXCInICsgYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXS5uYW1lICsgJ1wiJyk7XG4gICAgfVxuICB9KTtcbn1cbiIsImltcG9ydCB7aXNFbXB0eSwgaXNGdW5jdGlvbn0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIGlmIChpc0Z1bmN0aW9uKGNvbmRpdGlvbmFsKSkgeyBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7IH1cblxuICAgIC8vIERlZmF1bHQgYmVoYXZpb3IgaXMgdG8gcmVuZGVyIHRoZSBwb3NpdGl2ZSBwYXRoIGlmIHRoZSB2YWx1ZSBpcyB0cnV0aHkgYW5kIG5vdCBlbXB0eS5cbiAgICAvLyBUaGUgYGluY2x1ZGVaZXJvYCBvcHRpb24gbWF5IGJlIHNldCB0byB0cmVhdCB0aGUgY29uZHRpb25hbCBhcyBwdXJlbHkgbm90IGVtcHR5IGJhc2VkIG9uIHRoZVxuICAgIC8vIGJlaGF2aW9yIG9mIGlzRW1wdHkuIEVmZmVjdGl2ZWx5IHRoaXMgZGV0ZXJtaW5lcyBpZiAwIGlzIGhhbmRsZWQgYnkgdGhlIHBvc2l0aXZlIHBhdGggb3IgbmVnYXRpdmUuXG4gICAgaWYgKCghb3B0aW9ucy5oYXNoLmluY2x1ZGVaZXJvICYmICFjb25kaXRpb25hbCkgfHwgaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm4sIGhhc2g6IG9wdGlvbnMuaGFzaH0pO1xuICB9KTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbigvKiBtZXNzYWdlLCBvcHRpb25zICovKSB7XG4gICAgbGV0IGFyZ3MgPSBbdW5kZWZpbmVkXSxcbiAgICAgICAgb3B0aW9ucyA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICBhcmdzLnB1c2goYXJndW1lbnRzW2ldKTtcbiAgICB9XG5cbiAgICBsZXQgbGV2ZWwgPSAxO1xuICAgIGlmIChvcHRpb25zLmhhc2gubGV2ZWwgIT0gbnVsbCkge1xuICAgICAgbGV2ZWwgPSBvcHRpb25zLmhhc2gubGV2ZWw7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwpIHtcbiAgICAgIGxldmVsID0gb3B0aW9ucy5kYXRhLmxldmVsO1xuICAgIH1cbiAgICBhcmdzWzBdID0gbGV2ZWw7XG5cbiAgICBpbnN0YW5jZS5sb2coLi4uIGFyZ3MpO1xuICB9KTtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCdsb29rdXAnLCBmdW5jdGlvbihvYmosIGZpZWxkKSB7XG4gICAgcmV0dXJuIG9iaiAmJiBvYmpbZmllbGRdO1xuICB9KTtcbn1cbiIsImltcG9ydCB7YXBwZW5kQ29udGV4dFBhdGgsIGJsb2NrUGFyYW1zLCBjcmVhdGVGcmFtZSwgaXNFbXB0eSwgaXNGdW5jdGlvbn0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihpbnN0YW5jZSkge1xuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb250ZXh0KSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgICBsZXQgZm4gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKCFpc0VtcHR5KGNvbnRleHQpKSB7XG4gICAgICBsZXQgZGF0YSA9IG9wdGlvbnMuZGF0YTtcbiAgICAgIGlmIChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5pZHMpIHtcbiAgICAgICAgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBhcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIHtcbiAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgYmxvY2tQYXJhbXM6IGJsb2NrUGFyYW1zKFtjb250ZXh0XSwgW2RhdGEgJiYgZGF0YS5jb250ZXh0UGF0aF0pXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiaW1wb3J0IHtpbmRleE9mfSBmcm9tICcuL3V0aWxzJztcblxubGV0IGxvZ2dlciA9IHtcbiAgbWV0aG9kTWFwOiBbJ2RlYnVnJywgJ2luZm8nLCAnd2FybicsICdlcnJvciddLFxuICBsZXZlbDogJ2luZm8nLFxuXG4gIC8vIE1hcHMgYSBnaXZlbiBsZXZlbCB2YWx1ZSB0byB0aGUgYG1ldGhvZE1hcGAgaW5kZXhlcyBhYm92ZS5cbiAgbG9va3VwTGV2ZWw6IGZ1bmN0aW9uKGxldmVsKSB7XG4gICAgaWYgKHR5cGVvZiBsZXZlbCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxldCBsZXZlbE1hcCA9IGluZGV4T2YobG9nZ2VyLm1ldGhvZE1hcCwgbGV2ZWwudG9Mb3dlckNhc2UoKSk7XG4gICAgICBpZiAobGV2ZWxNYXAgPj0gMCkge1xuICAgICAgICBsZXZlbCA9IGxldmVsTWFwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV2ZWwgPSBwYXJzZUludChsZXZlbCwgMTApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsZXZlbDtcbiAgfSxcblxuICAvLyBDYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCAuLi5tZXNzYWdlKSB7XG4gICAgbGV2ZWwgPSBsb2dnZXIubG9va3VwTGV2ZWwobGV2ZWwpO1xuXG4gICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBsb2dnZXIubG9va3VwTGV2ZWwobG9nZ2VyLmxldmVsKSA8PSBsZXZlbCkge1xuICAgICAgbGV0IG1ldGhvZCA9IGxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgaWYgKCFjb25zb2xlW21ldGhvZF0pIHsgICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgbWV0aG9kID0gJ2xvZyc7XG4gICAgICB9XG4gICAgICBjb25zb2xlW21ldGhvZF0oLi4ubWVzc2FnZSk7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uc29sZVxuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgbG9nZ2VyO1xuIiwiLyogZ2xvYmFsIHdpbmRvdyAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oSGFuZGxlYmFycykge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBsZXQgcm9vdCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogd2luZG93LFxuICAgICAgJEhhbmRsZWJhcnMgPSByb290LkhhbmRsZWJhcnM7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIEhhbmRsZWJhcnMubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChyb290LkhhbmRsZWJhcnMgPT09IEhhbmRsZWJhcnMpIHtcbiAgICAgIHJvb3QuSGFuZGxlYmFycyA9ICRIYW5kbGViYXJzO1xuICAgIH1cbiAgICByZXR1cm4gSGFuZGxlYmFycztcbiAgfTtcbn1cbiIsImltcG9ydCAqIGFzIFV0aWxzIGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IEV4Y2VwdGlvbiBmcm9tICcuL2V4Y2VwdGlvbic7XG5pbXBvcnQgeyBDT01QSUxFUl9SRVZJU0lPTiwgUkVWSVNJT05fQ0hBTkdFUywgY3JlYXRlRnJhbWUgfSBmcm9tICcuL2Jhc2UnO1xuXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tSZXZpc2lvbihjb21waWxlckluZm8pIHtcbiAgY29uc3QgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mbyAmJiBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgICAgY3VycmVudFJldmlzaW9uID0gQ09NUElMRVJfUkVWSVNJT047XG5cbiAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICBjb25zdCBydW50aW1lVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ1RlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuICcgK1xuICAgICAgICAgICAgJ1BsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKCcgKyBydW50aW1lVmVyc2lvbnMgKyAnKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKCcgKyBjb21waWxlclZlcnNpb25zICsgJykuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiAnICtcbiAgICAgICAgICAgICdQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKCcgKyBjb21waWxlckluZm9bMV0gKyAnKS4nKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRlbXBsYXRlKHRlbXBsYXRlU3BlYywgZW52KSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gIGlmICghZW52KSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignTm8gZW52aXJvbm1lbnQgcGFzc2VkIHRvIHRlbXBsYXRlJyk7XG4gIH1cbiAgaWYgKCF0ZW1wbGF0ZVNwZWMgfHwgIXRlbXBsYXRlU3BlYy5tYWluKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignVW5rbm93biB0ZW1wbGF0ZSBvYmplY3Q6ICcgKyB0eXBlb2YgdGVtcGxhdGVTcGVjKTtcbiAgfVxuXG4gIHRlbXBsYXRlU3BlYy5tYWluLmRlY29yYXRvciA9IHRlbXBsYXRlU3BlYy5tYWluX2Q7XG5cbiAgLy8gTm90ZTogVXNpbmcgZW52LlZNIHJlZmVyZW5jZXMgcmF0aGVyIHRoYW4gbG9jYWwgdmFyIHJlZmVyZW5jZXMgdGhyb3VnaG91dCB0aGlzIHNlY3Rpb24gdG8gYWxsb3dcbiAgLy8gZm9yIGV4dGVybmFsIHVzZXJzIHRvIG92ZXJyaWRlIHRoZXNlIGFzIHBzdWVkby1zdXBwb3J0ZWQgQVBJcy5cbiAgZW52LlZNLmNoZWNrUmV2aXNpb24odGVtcGxhdGVTcGVjLmNvbXBpbGVyKTtcblxuICBmdW5jdGlvbiBpbnZva2VQYXJ0aWFsV3JhcHBlcihwYXJ0aWFsLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMuaGFzaCkge1xuICAgICAgY29udGV4dCA9IFV0aWxzLmV4dGVuZCh7fSwgY29udGV4dCwgb3B0aW9ucy5oYXNoKTtcbiAgICAgIGlmIChvcHRpb25zLmlkcykge1xuICAgICAgICBvcHRpb25zLmlkc1swXSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcGFydGlhbCA9IGVudi5WTS5yZXNvbHZlUGFydGlhbC5jYWxsKHRoaXMsIHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIGxldCByZXN1bHQgPSBlbnYuVk0uaW52b2tlUGFydGlhbC5jYWxsKHRoaXMsIHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpO1xuXG4gICAgaWYgKHJlc3VsdCA9PSBudWxsICYmIGVudi5jb21waWxlKSB7XG4gICAgICBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV0gPSBlbnYuY29tcGlsZShwYXJ0aWFsLCB0ZW1wbGF0ZVNwZWMuY29tcGlsZXJPcHRpb25zLCBlbnYpO1xuICAgICAgcmVzdWx0ID0gb3B0aW9ucy5wYXJ0aWFsc1tvcHRpb25zLm5hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAocmVzdWx0ICE9IG51bGwpIHtcbiAgICAgIGlmIChvcHRpb25zLmluZGVudCkge1xuICAgICAgICBsZXQgbGluZXMgPSByZXN1bHQuc3BsaXQoJ1xcbicpO1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbCA9IGxpbmVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIGlmICghbGluZXNbaV0gJiYgaSArIDEgPT09IGwpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpbmVzW2ldID0gb3B0aW9ucy5pbmRlbnQgKyBsaW5lc1tpXTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgPSBsaW5lcy5qb2luKCdcXG4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ1RoZSBwYXJ0aWFsICcgKyBvcHRpb25zLm5hbWUgKyAnIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGUnKTtcbiAgICB9XG4gIH1cblxuICAvLyBKdXN0IGFkZCB3YXRlclxuICBsZXQgY29udGFpbmVyID0ge1xuICAgIHN0cmljdDogZnVuY3Rpb24ob2JqLCBuYW1lKSB7XG4gICAgICBpZiAoIShuYW1lIGluIG9iaikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignXCInICsgbmFtZSArICdcIiBub3QgZGVmaW5lZCBpbiAnICsgb2JqKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmpbbmFtZV07XG4gICAgfSxcbiAgICBsb29rdXA6IGZ1bmN0aW9uKGRlcHRocywgbmFtZSkge1xuICAgICAgY29uc3QgbGVuID0gZGVwdGhzLmxlbmd0aDtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKGRlcHRoc1tpXSAmJiBkZXB0aHNbaV1bbmFtZV0gIT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBkZXB0aHNbaV1bbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGxhbWJkYTogZnVuY3Rpb24oY3VycmVudCwgY29udGV4dCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiBjdXJyZW50ID09PSAnZnVuY3Rpb24nID8gY3VycmVudC5jYWxsKGNvbnRleHQpIDogY3VycmVudDtcbiAgICB9LFxuXG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBpbnZva2VQYXJ0aWFsOiBpbnZva2VQYXJ0aWFsV3JhcHBlcixcblxuICAgIGZuOiBmdW5jdGlvbihpKSB7XG4gICAgICBsZXQgcmV0ID0gdGVtcGxhdGVTcGVjW2ldO1xuICAgICAgcmV0LmRlY29yYXRvciA9IHRlbXBsYXRlU3BlY1tpICsgJ19kJ107XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG5cbiAgICBwcm9ncmFtczogW10sXG4gICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZGF0YSwgZGVjbGFyZWRCbG9ja1BhcmFtcywgYmxvY2tQYXJhbXMsIGRlcHRocykge1xuICAgICAgbGV0IHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSxcbiAgICAgICAgICBmbiA9IHRoaXMuZm4oaSk7XG4gICAgICBpZiAoZGF0YSB8fCBkZXB0aHMgfHwgYmxvY2tQYXJhbXMgfHwgZGVjbGFyZWRCbG9ja1BhcmFtcykge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHdyYXBQcm9ncmFtKHRoaXMsIGksIGZuLCBkYXRhLCBkZWNsYXJlZEJsb2NrUGFyYW1zLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IHdyYXBQcm9ncmFtKHRoaXMsIGksIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICB9LFxuXG4gICAgZGF0YTogZnVuY3Rpb24odmFsdWUsIGRlcHRoKSB7XG4gICAgICB3aGlsZSAodmFsdWUgJiYgZGVwdGgtLSkge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLl9wYXJlbnQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSxcbiAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgbGV0IG9iaiA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbiAmJiAocGFyYW0gIT09IGNvbW1vbikpIHtcbiAgICAgICAgb2JqID0gVXRpbHMuZXh0ZW5kKHt9LCBjb21tb24sIHBhcmFtKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9LFxuXG4gICAgbm9vcDogZW52LlZNLm5vb3AsXG4gICAgY29tcGlsZXJJbmZvOiB0ZW1wbGF0ZVNwZWMuY29tcGlsZXJcbiAgfTtcblxuICBmdW5jdGlvbiByZXQoY29udGV4dCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IGRhdGEgPSBvcHRpb25zLmRhdGE7XG5cbiAgICByZXQuX3NldHVwKG9wdGlvbnMpO1xuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsICYmIHRlbXBsYXRlU3BlYy51c2VEYXRhKSB7XG4gICAgICBkYXRhID0gaW5pdERhdGEoY29udGV4dCwgZGF0YSk7XG4gICAgfVxuICAgIGxldCBkZXB0aHMsXG4gICAgICAgIGJsb2NrUGFyYW1zID0gdGVtcGxhdGVTcGVjLnVzZUJsb2NrUGFyYW1zID8gW10gOiB1bmRlZmluZWQ7XG4gICAgaWYgKHRlbXBsYXRlU3BlYy51c2VEZXB0aHMpIHtcbiAgICAgIGlmIChvcHRpb25zLmRlcHRocykge1xuICAgICAgICBkZXB0aHMgPSBjb250ZXh0ICE9PSBvcHRpb25zLmRlcHRoc1swXSA/IFtjb250ZXh0XS5jb25jYXQob3B0aW9ucy5kZXB0aHMpIDogb3B0aW9ucy5kZXB0aHM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZXB0aHMgPSBbY29udGV4dF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFpbihjb250ZXh0LyosIG9wdGlvbnMqLykge1xuICAgICAgcmV0dXJuICcnICsgdGVtcGxhdGVTcGVjLm1haW4oY29udGFpbmVyLCBjb250ZXh0LCBjb250YWluZXIuaGVscGVycywgY29udGFpbmVyLnBhcnRpYWxzLCBkYXRhLCBibG9ja1BhcmFtcywgZGVwdGhzKTtcbiAgICB9XG4gICAgbWFpbiA9IGV4ZWN1dGVEZWNvcmF0b3JzKHRlbXBsYXRlU3BlYy5tYWluLCBtYWluLCBjb250YWluZXIsIG9wdGlvbnMuZGVwdGhzIHx8IFtdLCBkYXRhLCBibG9ja1BhcmFtcyk7XG4gICAgcmV0dXJuIG1haW4oY29udGV4dCwgb3B0aW9ucyk7XG4gIH1cbiAgcmV0LmlzVG9wID0gdHJ1ZTtcblxuICByZXQuX3NldHVwID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucy5wYXJ0aWFsKSB7XG4gICAgICBjb250YWluZXIuaGVscGVycyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLmhlbHBlcnMsIGVudi5oZWxwZXJzKTtcblxuICAgICAgaWYgKHRlbXBsYXRlU3BlYy51c2VQYXJ0aWFsKSB7XG4gICAgICAgIGNvbnRhaW5lci5wYXJ0aWFscyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLnBhcnRpYWxzLCBlbnYucGFydGlhbHMpO1xuICAgICAgfVxuICAgICAgaWYgKHRlbXBsYXRlU3BlYy51c2VQYXJ0aWFsIHx8IHRlbXBsYXRlU3BlYy51c2VEZWNvcmF0b3JzKSB7XG4gICAgICAgIGNvbnRhaW5lci5kZWNvcmF0b3JzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMuZGVjb3JhdG9ycywgZW52LmRlY29yYXRvcnMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXIuaGVscGVycyA9IG9wdGlvbnMuaGVscGVycztcbiAgICAgIGNvbnRhaW5lci5wYXJ0aWFscyA9IG9wdGlvbnMucGFydGlhbHM7XG4gICAgICBjb250YWluZXIuZGVjb3JhdG9ycyA9IG9wdGlvbnMuZGVjb3JhdG9ycztcbiAgICB9XG4gIH07XG5cbiAgcmV0Ll9jaGlsZCA9IGZ1bmN0aW9uKGksIGRhdGEsIGJsb2NrUGFyYW1zLCBkZXB0aHMpIHtcbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZUJsb2NrUGFyYW1zICYmICFibG9ja1BhcmFtcykge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignbXVzdCBwYXNzIGJsb2NrIHBhcmFtcycpO1xuICAgIH1cbiAgICBpZiAodGVtcGxhdGVTcGVjLnVzZURlcHRocyAmJiAhZGVwdGhzKSB7XG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdtdXN0IHBhc3MgcGFyZW50IGRlcHRocycpO1xuICAgIH1cblxuICAgIHJldHVybiB3cmFwUHJvZ3JhbShjb250YWluZXIsIGksIHRlbXBsYXRlU3BlY1tpXSwgZGF0YSwgMCwgYmxvY2tQYXJhbXMsIGRlcHRocyk7XG4gIH07XG4gIHJldHVybiByZXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cmFwUHJvZ3JhbShjb250YWluZXIsIGksIGZuLCBkYXRhLCBkZWNsYXJlZEJsb2NrUGFyYW1zLCBibG9ja1BhcmFtcywgZGVwdGhzKSB7XG4gIGZ1bmN0aW9uIHByb2coY29udGV4dCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IGN1cnJlbnREZXB0aHMgPSBkZXB0aHM7XG4gICAgaWYgKGRlcHRocyAmJiBjb250ZXh0ICE9PSBkZXB0aHNbMF0pIHtcbiAgICAgIGN1cnJlbnREZXB0aHMgPSBbY29udGV4dF0uY29uY2F0KGRlcHRocyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZuKGNvbnRhaW5lcixcbiAgICAgICAgY29udGV4dCxcbiAgICAgICAgY29udGFpbmVyLmhlbHBlcnMsIGNvbnRhaW5lci5wYXJ0aWFscyxcbiAgICAgICAgb3B0aW9ucy5kYXRhIHx8IGRhdGEsXG4gICAgICAgIGJsb2NrUGFyYW1zICYmIFtvcHRpb25zLmJsb2NrUGFyYW1zXS5jb25jYXQoYmxvY2tQYXJhbXMpLFxuICAgICAgICBjdXJyZW50RGVwdGhzKTtcbiAgfVxuXG4gIHByb2cgPSBleGVjdXRlRGVjb3JhdG9ycyhmbiwgcHJvZywgY29udGFpbmVyLCBkZXB0aHMsIGRhdGEsIGJsb2NrUGFyYW1zKTtcblxuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gZGVwdGhzID8gZGVwdGhzLmxlbmd0aCA6IDA7XG4gIHByb2cuYmxvY2tQYXJhbXMgPSBkZWNsYXJlZEJsb2NrUGFyYW1zIHx8IDA7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZVBhcnRpYWwocGFydGlhbCwgY29udGV4dCwgb3B0aW9ucykge1xuICBpZiAoIXBhcnRpYWwpIHtcbiAgICBpZiAob3B0aW9ucy5uYW1lID09PSAnQHBhcnRpYWwtYmxvY2snKSB7XG4gICAgICBwYXJ0aWFsID0gb3B0aW9ucy5kYXRhWydwYXJ0aWFsLWJsb2NrJ107XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcnRpYWwgPSBvcHRpb25zLnBhcnRpYWxzW29wdGlvbnMubmFtZV07XG4gICAgfVxuICB9IGVsc2UgaWYgKCFwYXJ0aWFsLmNhbGwgJiYgIW9wdGlvbnMubmFtZSkge1xuICAgIC8vIFRoaXMgaXMgYSBkeW5hbWljIHBhcnRpYWwgdGhhdCByZXR1cm5lZCBhIHN0cmluZ1xuICAgIG9wdGlvbnMubmFtZSA9IHBhcnRpYWw7XG4gICAgcGFydGlhbCA9IG9wdGlvbnMucGFydGlhbHNbcGFydGlhbF07XG4gIH1cbiAgcmV0dXJuIHBhcnRpYWw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnZva2VQYXJ0aWFsKHBhcnRpYWwsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucy5wYXJ0aWFsID0gdHJ1ZTtcbiAgaWYgKG9wdGlvbnMuaWRzKSB7XG4gICAgb3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoID0gb3B0aW9ucy5pZHNbMF0gfHwgb3B0aW9ucy5kYXRhLmNvbnRleHRQYXRoO1xuICB9XG5cbiAgbGV0IHBhcnRpYWxCbG9jaztcbiAgaWYgKG9wdGlvbnMuZm4gJiYgb3B0aW9ucy5mbiAhPT0gbm9vcCkge1xuICAgIG9wdGlvbnMuZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgcGFydGlhbEJsb2NrID0gb3B0aW9ucy5kYXRhWydwYXJ0aWFsLWJsb2NrJ10gPSBvcHRpb25zLmZuO1xuXG4gICAgaWYgKHBhcnRpYWxCbG9jay5wYXJ0aWFscykge1xuICAgICAgb3B0aW9ucy5wYXJ0aWFscyA9IFV0aWxzLmV4dGVuZCh7fSwgb3B0aW9ucy5wYXJ0aWFscywgcGFydGlhbEJsb2NrLnBhcnRpYWxzKTtcbiAgICB9XG4gIH1cblxuICBpZiAocGFydGlhbCA9PT0gdW5kZWZpbmVkICYmIHBhcnRpYWxCbG9jaykge1xuICAgIHBhcnRpYWwgPSBwYXJ0aWFsQmxvY2s7XG4gIH1cblxuICBpZiAocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbignVGhlIHBhcnRpYWwgJyArIG9wdGlvbnMubmFtZSArICcgY291bGQgbm90IGJlIGZvdW5kJyk7XG4gIH0gZWxzZSBpZiAocGFydGlhbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG5vb3AoKSB7IHJldHVybiAnJzsgfVxuXG5mdW5jdGlvbiBpbml0RGF0YShjb250ZXh0LCBkYXRhKSB7XG4gIGlmICghZGF0YSB8fCAhKCdyb290JyBpbiBkYXRhKSkge1xuICAgIGRhdGEgPSBkYXRhID8gY3JlYXRlRnJhbWUoZGF0YSkgOiB7fTtcbiAgICBkYXRhLnJvb3QgPSBjb250ZXh0O1xuICB9XG4gIHJldHVybiBkYXRhO1xufVxuXG5mdW5jdGlvbiBleGVjdXRlRGVjb3JhdG9ycyhmbiwgcHJvZywgY29udGFpbmVyLCBkZXB0aHMsIGRhdGEsIGJsb2NrUGFyYW1zKSB7XG4gIGlmIChmbi5kZWNvcmF0b3IpIHtcbiAgICBsZXQgcHJvcHMgPSB7fTtcbiAgICBwcm9nID0gZm4uZGVjb3JhdG9yKHByb2csIHByb3BzLCBjb250YWluZXIsIGRlcHRocyAmJiBkZXB0aHNbMF0sIGRhdGEsIGJsb2NrUGFyYW1zLCBkZXB0aHMpO1xuICAgIFV0aWxzLmV4dGVuZChwcm9nLCBwcm9wcyk7XG4gIH1cbiAgcmV0dXJuIHByb2c7XG59XG4iLCIvLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuZnVuY3Rpb24gU2FmZVN0cmluZyhzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59XG5cblNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gU2FmZVN0cmluZy5wcm90b3R5cGUudG9IVE1MID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnJyArIHRoaXMuc3RyaW5nO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgU2FmZVN0cmluZztcbiIsImNvbnN0IGVzY2FwZSA9IHtcbiAgJyYnOiAnJmFtcDsnLFxuICAnPCc6ICcmbHQ7JyxcbiAgJz4nOiAnJmd0OycsXG4gICdcIic6ICcmcXVvdDsnLFxuICBcIidcIjogJyYjeDI3OycsXG4gICdgJzogJyYjeDYwOycsXG4gICc9JzogJyYjeDNEOydcbn07XG5cbmNvbnN0IGJhZENoYXJzID0gL1smPD5cIidgPV0vZyxcbiAgICAgIHBvc3NpYmxlID0gL1smPD5cIidgPV0vO1xuXG5mdW5jdGlvbiBlc2NhcGVDaGFyKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmQob2JqLyogLCAuLi5zb3VyY2UgKi8pIHtcbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKGxldCBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFyZ3VtZW50c1tpXSwga2V5KSkge1xuICAgICAgICBvYmpba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59XG5cbmV4cG9ydCBsZXQgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG4vKiBlc2xpbnQtZGlzYWJsZSBmdW5jLXN0eWxlICovXG5sZXQgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59O1xuLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuaWYgKGlzRnVuY3Rpb24oL3gvKSkge1xuICBpc0Z1bmN0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nICYmIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuICB9O1xufVxuZXhwb3J0IHtpc0Z1bmN0aW9ufTtcbi8qIGVzbGludC1lbmFibGUgZnVuYy1zdHlsZSAqL1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuZXhwb3J0IGNvbnN0IGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JykgPyB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgQXJyYXldJyA6IGZhbHNlO1xufTtcblxuLy8gT2xkZXIgSUUgdmVyc2lvbnMgZG8gbm90IGRpcmVjdGx5IHN1cHBvcnQgaW5kZXhPZiBzbyB3ZSBtdXN0IGltcGxlbWVudCBvdXIgb3duLCBzYWRseS5cbmV4cG9ydCBmdW5jdGlvbiBpbmRleE9mKGFycmF5LCB2YWx1ZSkge1xuICBmb3IgKGxldCBpID0gMCwgbGVuID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBpZiAoYXJyYXlbaV0gPT09IHZhbHVlKSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBlc2NhcGVFeHByZXNzaW9uKHN0cmluZykge1xuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gICAgaWYgKHN0cmluZyAmJiBzdHJpbmcudG9IVE1MKSB7XG4gICAgICByZXR1cm4gc3RyaW5nLnRvSFRNTCgpO1xuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9IGVsc2UgaWYgKCFzdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdHJpbmcgKyAnJztcbiAgICB9XG5cbiAgICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgICBzdHJpbmcgPSAnJyArIHN0cmluZztcbiAgfVxuXG4gIGlmICghcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpIHtcbiAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRnJhbWUob2JqZWN0KSB7XG4gIGxldCBmcmFtZSA9IGV4dGVuZCh7fSwgb2JqZWN0KTtcbiAgZnJhbWUuX3BhcmVudCA9IG9iamVjdDtcbiAgcmV0dXJuIGZyYW1lO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmxvY2tQYXJhbXMocGFyYW1zLCBpZHMpIHtcbiAgcGFyYW1zLnBhdGggPSBpZHM7XG4gIHJldHVybiBwYXJhbXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBlbmRDb250ZXh0UGF0aChjb250ZXh0UGF0aCwgaWQpIHtcbiAgcmV0dXJuIChjb250ZXh0UGF0aCA/IGNvbnRleHRQYXRoICsgJy4nIDogJycpICsgaWQ7XG59XG4iLCIvLyBDcmVhdGUgYSBzaW1wbGUgcGF0aCBhbGlhcyB0byBhbGxvdyBicm93c2VyaWZ5IHRvIHJlc29sdmVcbi8vIHRoZSBydW50aW1lIG9uIGEgc3VwcG9ydGVkIHBhdGguXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGlzdC9janMvaGFuZGxlYmFycy5ydW50aW1lJylbJ2RlZmF1bHQnXTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImhhbmRsZWJhcnMvcnVudGltZVwiKVtcImRlZmF1bHRcIl07XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgalF1ZXJ5IGZyb20gJ2pxdWVyeSdcbmltcG9ydCB7IExpc3RlblN0YXRlLCBMaXN0ZW5TdGF0ZUNvbGxlY3Rpb24gfSBmcm9tICcuL21vZGVscy9MaXN0ZW5TdGF0ZSdcbmltcG9ydCB7IEN1cnJlbnRVc2VyTW9kZWwgfSBmcm9tICcuL21vZGVscy9DdXJyZW50VXNlcidcbmltcG9ydCB7IEF1ZGlvUGxheWVyVmlldyB9IGZyb20gJy4vcGFydGlhbHMvQXVkaW9QbGF5ZXJWaWV3J1xuaW1wb3J0IFJvdXRlciBmcm9tICcuL3JvdXRlcidcbmltcG9ydCBQb2x5ZmlsbCBmcm9tICcuL3BvbHlmaWxsLmpzJ1xuXG4kID0gcmVxdWlyZSgnanF1ZXJ5Jyk7XG5cbmNsYXNzIEFwcGxpY2F0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5yb3V0ZXIgPSBudWxsO1xuICAgIH1cblxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIFBvbHlmaWxsLmluc3RhbGwoKTtcbiAgICAgICAgQmFja2JvbmUuJCA9ICQ7XG4gICAgICAgIC8vaWYgKCFCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtwdXNoU3RhdGU6IHRydWUsIGhhc2hDaGFuZ2U6IGZhbHNlfSkpIHJvdXRlci5uYXZpZ2F0ZSgnNDA0Jywge3RyaWdnZXI6IHRydWV9KTtcblxuICAgICAgICB0aGlzLnJvdXRlciA9IG5ldyBSb3V0ZXIoKTtcbiAgICAgICAgdGhpcy5yZWRpcmVjdFVybENsaWNrc1RvUm91dGVyKCk7XG5cbiAgICAgICAgdmFyIGF1ZGlvUGxheWVyID0gbmV3IEF1ZGlvUGxheWVyVmlldyh7ZWw6ICcjYXVkaW8tcGxheWVyJ30pO1xuXG4gICAgICAgIC8vIGxvYWQgdXNlclxuICAgICAgICBuZXcgQ3VycmVudFVzZXJNb2RlbCgpLmZldGNoKClcbiAgICAgICAgICAgIC50aGVuKG1vZGVsID0+IHRoaXMub25Vc2VyQXV0aGVudGljYXRlZChtb2RlbCksIHJlc3BvbnNlID0+IHRoaXMub25Vc2VyQXV0aEZhaWwocmVzcG9uc2UpKTtcblxuICAgICAgICAvL25ldyBMaXN0ZW5TdGF0ZUNvbGxlY3Rpb24oKS5mZXRjaCgpLnRoZW4oKHN0YXRlKSA9PiBjb25zb2xlLmxvZyhcImdvdCBsaXN0ZW4gc3RhdGVzXCIsIHN0YXRlKSk7XG4gICAgfVxuXG4gICAgcmVkaXJlY3RVcmxDbGlja3NUb1JvdXRlcigpIHtcbiAgICAgICAgLy8gVXNlIGRlbGVnYXRpb24gdG8gYXZvaWQgaW5pdGlhbCBET00gc2VsZWN0aW9uIGFuZCBhbGxvdyBhbGwgbWF0Y2hpbmcgZWxlbWVudHMgdG8gYnViYmxlXG4gICAgICAgICQoZG9jdW1lbnQpLmRlbGVnYXRlKFwiYVwiLCBcImNsaWNrXCIsIGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgYW5jaG9yIGhyZWYgYW5kIHByb3Rjb2xcbiAgICAgICAgICAgIHZhciBocmVmID0gJCh0aGlzKS5hdHRyKFwiaHJlZlwiKTtcbiAgICAgICAgICAgIHZhciBwcm90b2NvbCA9IHRoaXMucHJvdG9jb2wgKyBcIi8vXCI7XG5cbiAgICAgICAgICAgIHZhciBvcGVuTGlua0luVGFiID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGlmKGhyZWYgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIC8vIG5vIHVybCBzcGVjaWZpZWQsIGRvbid0IGRvIGFueXRoaW5nLlxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc3BlY2lhbCBjYXNlcyB0aGF0IHdlIHdhbnQgdG8gaGl0IHRoZSBzZXJ2ZXJcbiAgICAgICAgICAgIGlmKGhyZWYgPT0gXCIvYXV0aFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFbnN1cmUgdGhlIHByb3RvY29sIGlzIG5vdCBwYXJ0IG9mIFVSTCwgbWVhbmluZyBpdHMgcmVsYXRpdmUuXG4gICAgICAgICAgICAvLyBTdG9wIHRoZSBldmVudCBidWJibGluZyB0byBlbnN1cmUgdGhlIGxpbmsgd2lsbCBub3QgY2F1c2UgYSBwYWdlIHJlZnJlc2guXG4gICAgICAgICAgICBpZiAoIW9wZW5MaW5rSW5UYWIgJiYgaHJlZi5zbGljZShwcm90b2NvbC5sZW5ndGgpICE9PSBwcm90b2NvbCkge1xuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAgICAgLy8gTm90ZSBieSB1c2luZyBCYWNrYm9uZS5oaXN0b3J5Lm5hdmlnYXRlLCByb3V0ZXIgZXZlbnRzIHdpbGwgbm90IGJlXG4gICAgICAgICAgICAgICAgLy8gdHJpZ2dlcmVkLiAgSWYgdGhpcyBpcyBhIHByb2JsZW0sIGNoYW5nZSB0aGlzIHRvIG5hdmlnYXRlIG9uIHlvdXJcbiAgICAgICAgICAgICAgICAvLyByb3V0ZXIuXG4gICAgICAgICAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZShocmVmLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgb25Vc2VyQXV0aEZhaWwocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gdXNlciBub3QgYXV0aGVudGljYXRlZFxuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09IDQwMSkge1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yb3V0ZXIuc2V0VXNlcihudWxsKTtcbiAgICAgICAgdGhpcy5zdGFydFJvdXRlck5hdmlnYXRpb24oKTtcbiAgICB9XG5cbiAgICBvblVzZXJBdXRoZW50aWNhdGVkKHVzZXIpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJMb2FkZWQgY3VycmVudCB1c2VyXCIsIHVzZXIpO1xuICAgICAgICB0aGlzLnJvdXRlci5zZXRVc2VyKHVzZXIpO1xuICAgICAgICB0aGlzLnN0YXJ0Um91dGVyTmF2aWdhdGlvbigpO1xuICAgIH1cblxuICAgIHN0YXJ0Um91dGVyTmF2aWdhdGlvbigpIHtcbiAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5zdGFydCh7cHVzaFN0YXRlOiB0cnVlLCBoYXNoQ2hhbmdlOiBmYWxzZX0pO1xuICAgIH1cbn1cblxuZXhwb3J0IGxldCBhcHAgPSBuZXcgQXBwbGljYXRpb24oKTtcblxuXG4kKCgpID0+IHtcbiAgICAvLyBzZXR1cCByYXZlbiB0byBwdXNoIG1lc3NhZ2VzIHRvIG91ciBzZW50cnlcbiAgICAvL1JhdmVuLmNvbmZpZygnaHR0cHM6Ly9kYjJhN2Q1ODEwN2M0OTc1YWU3ZGU3MzZhNjMwOGExZUBhcHAuZ2V0c2VudHJ5LmNvbS81MzQ1NicsIHtcbiAgICAvLyAgICB3aGl0ZWxpc3RVcmxzOiBbJ3N0YWdpbmcuY291Y2hwb2QuY29tJywgJ2NvdWNocG9kLmNvbSddIC8vIHByb2R1Y3Rpb24gb25seVxuICAgIC8vfSkuaW5zdGFsbCgpXG5cbiAgICB3aW5kb3cuYXBwID0gYXBwO1xuICAgIGFwcC5pbml0aWFsaXplKCk7XG5cbiAgICAvLyBmb3IgcHJvZHVjdGlvbiwgY291bGQgd3JhcCBkb21SZWFkeUNhbGxiYWNrIGFuZCBsZXQgcmF2ZW4gaGFuZGxlIGFueSBleGNlcHRpb25zXG5cbiAgICAvKlxuICAgICB0cnkge1xuICAgICBkb21SZWFkeUNhbGxiYWNrKCk7XG4gICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgIFJhdmVuLmNhcHR1cmVFeGNlcHRpb24oZXJyKTtcbiAgICAgY29uc29sZS5sb2coXCJbRXJyb3JdIFVuaGFuZGxlZCBFeGNlcHRpb24gd2FzIGNhdWdodCBhbmQgc2VudCB2aWEgUmF2ZW46XCIpO1xuICAgICBjb25zb2xlLmRpcihlcnIpO1xuICAgICB9XG4gICAgICovXG59KVxuXG5leHBvcnQgZGVmYXVsdCB7QXBwbGljYXRpb259XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJ1xuXG5jbGFzcyBBdWRpb0NhcHR1cmUge1xuICAgIGNvbnN0cnVjdG9yKG1pY3JvcGhvbmVNZWRpYVN0cmVhbSkge1xuICAgICAgICAvLyBzcGF3biBiYWNrZ3JvdW5kIHdvcmtlclxuICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlciA9IG5ldyBXb3JrZXIoXCIvYXNzZXRzL2pzL3dvcmtlci1lbmNvZGVyLm1pbi5qc1wiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkluaXRpYWxpemVkIEF1ZGlvQ2FwdHVyZVwiKTtcblxuICAgICAgICB0aGlzLl9hdWRpb0NvbnRleHQgPSBudWxsO1xuICAgICAgICB0aGlzLl9hdWRpb0lucHV0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9pc1JlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fb25DYXB0dXJlQ29tcGxldGVDYWxsYmFjayA9IG51bGw7XG4gICAgICAgIHRoaXMuX2F1ZGlvQW5hbHl6ZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9hdWRpb0dhaW4gPSBudWxsO1xuICAgICAgICB0aGlzLl9jYWNoZWRNZWRpYVN0cmVhbSA9IG1pY3JvcGhvbmVNZWRpYVN0cmVhbTtcblxuICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9sYXRlc3RBdWRpb0J1ZmZlciA9IFtdO1xuICAgICAgICB0aGlzLl9jYWNoZWRHYWluVmFsdWUgPSAxO1xuICAgICAgICB0aGlzLl9vblN0YXJ0ZWRDYWxsYmFjayA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5fZmZ0U2l6ZSA9IDI1NjtcbiAgICAgICAgdGhpcy5fZmZ0U21vb3RoaW5nID0gMC44O1xuICAgICAgICB0aGlzLl90b3RhbE51bVNhbXBsZXMgPSAwO1xuXG5cbiAgICB9XG4gICAgY3JlYXRlQXVkaW9Db250ZXh0KG1lZGlhU3RyZWFtKSB7XG4gICAgICAgIC8vIGJ1aWxkIGNhcHR1cmUgZ3JhcGhcbiAgICAgICAgdGhpcy5fYXVkaW9Db250ZXh0ID0gbmV3ICh3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQpKCk7XG4gICAgICAgIHRoaXMuX2F1ZGlvSW5wdXQgPSB0aGlzLl9hdWRpb0NvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2UobWVkaWFTdHJlYW0pO1xuICAgICAgICB0aGlzLl9hdWRpb0Rlc3RpbmF0aW9uID0gdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtRGVzdGluYXRpb24oKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c3RhcnRNYW51YWxFbmNvZGluZygpOyBfYXVkaW9Db250ZXh0LnNhbXBsZVJhdGU6IFwiICsgdGhpcy5fYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUgKyBcIiBIelwiKTtcblxuICAgICAgICAvLyBjcmVhdGUgYSBsaXN0ZW5lciBub2RlIHRvIGdyYWIgbWljcm9waG9uZSBzYW1wbGVzIGFuZCBmZWVkIGl0IHRvIG91ciBiYWNrZ3JvdW5kIHdvcmtlclxuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyID0gKHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IgfHwgdGhpcy5fYXVkaW9Db250ZXh0LmNyZWF0ZUphdmFTY3JpcHROb2RlKS5jYWxsKHRoaXMuX2F1ZGlvQ29udGV4dCwgMTYzODQsIDEsIDEpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwidGhpcy5fY2FjaGVkR2FpblZhbHVlID0gXCIgKyB0aGlzLl9jYWNoZWRHYWluVmFsdWUpO1xuXG4gICAgICAgIHRoaXMuX2F1ZGlvR2FpbiA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuX2F1ZGlvR2Fpbi5nYWluLnZhbHVlID0gdGhpcy5fY2FjaGVkR2FpblZhbHVlO1xuXG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplciA9IHRoaXMuX2F1ZGlvQ29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIuZmZ0U2l6ZSA9IHRoaXMuX2ZmdFNpemU7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9BbmFseXplci5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSB0aGlzLl9mZnRTbW9vdGhpbmc7XG4gICAgfVxuXG4gICAgc3RhcnRNYW51YWxFbmNvZGluZyhtZWRpYVN0cmVhbSkge1xuXG4gICAgICAgIGlmICghdGhpcy5fYXVkaW9Db250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUF1ZGlvQ29udGV4dChtZWRpYVN0cmVhbSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuX2VuY29kaW5nV29ya2VyKVxuICAgICAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIgPSBuZXcgV29ya2VyKFwiL2Fzc2V0cy9qcy93b3JrZXItZW5jb2Rlci5taW4uanNcIik7XG5cbiAgICAgICAgLy8gcmUtaG9vayBhdWRpbyBsaXN0ZW5lciBub2RlIGV2ZXJ5IHRpbWUgd2Ugc3RhcnQsIGJlY2F1c2UgX2VuY29kaW5nV29ya2VyIHJlZmVyZW5jZSB3aWxsIGNoYW5nZVxuICAgICAgICB0aGlzLl9hdWRpb0xpc3RlbmVyLm9uYXVkaW9wcm9jZXNzID0gKGUpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5faXNSZWNvcmRpbmcpIHJldHVybjtcblxuICAgICAgICAgICAgdmFyIG1zZyA9IHtcbiAgICAgICAgICAgICAgICBhY3Rpb246IFwicHJvY2Vzc1wiLFxuXG4gICAgICAgICAgICAgICAgLy8gdHdvIEZsb2F0MzJBcnJheXNcbiAgICAgICAgICAgICAgICBsZWZ0OiBlLmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApXG4gICAgICAgICAgICAgICAgLy9yaWdodDogZS5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy92YXIgbGVmdE91dCA9IGUub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgLy9mb3IodmFyIGkgPSAwOyBpIDwgbXNnLmxlZnQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIC8vICAgIGxlZnRPdXRbaV0gPSBtc2cubGVmdFtpXTtcbiAgICAgICAgICAgIC8vfVxuXG4gICAgICAgICAgICB0aGlzLl90b3RhbE51bVNhbXBsZXMgKz0gbXNnLmxlZnQubGVuZ3RoO1xuXG4gICAgICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlci5wb3N0TWVzc2FnZShtc2cpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGhhbmRsZSBtZXNzYWdlcyBmcm9tIHRoZSBlbmNvZGluZy13b3JrZXJcbiAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIub25tZXNzYWdlID0gKGUpID0+IHtcblxuICAgICAgICAgICAgLy8gd29ya2VyIGZpbmlzaGVkIGFuZCBoYXMgdGhlIGZpbmFsIGVuY29kZWQgYXVkaW8gYnVmZmVyIGZvciB1c1xuICAgICAgICAgICAgaWYgKGUuZGF0YS5hY3Rpb24gPT09IFwiZW5jb2RlZFwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVuY29kZWRfYmxvYiA9IG5ldyBCbG9iKFtlLmRhdGEuYnVmZmVyXSwge3R5cGU6ICdhdWRpby9vZ2cnfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImUuZGF0YS5idWZmZXIuYnVmZmVyID0gXCIgKyBlLmRhdGEuYnVmZmVyLmJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlLmRhdGEuYnVmZmVyLmJ5dGVMZW5ndGggPSBcIiArIGUuZGF0YS5idWZmZXIuYnl0ZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzYW1wbGVSYXRlID0gXCIgKyB0aGlzLl9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0b3RhbE51bVNhbXBsZXMgPSBcIiArIHRoaXMuX3RvdGFsTnVtU2FtcGxlcyk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJEdXJhdGlvbiBvZiByZWNvcmRpbmcgPSBcIiArICh0aGlzLl90b3RhbE51bVNhbXBsZXMgLyB0aGlzLl9hdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSkgKyBcIiBzZWNvbmRzXCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJnb3QgZW5jb2RlZCBibG9iOiBzaXplPVwiICsgZW5jb2RlZF9ibG9iLnNpemUgKyBcIiB0eXBlPVwiICsgZW5jb2RlZF9ibG9iLnR5cGUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2spXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2soZW5jb2RlZF9ibG9iKTtcblxuICAgICAgICAgICAgICAgIC8vIHdvcmtlciBoYXMgZXhpdGVkLCB1bnJlZmVyZW5jZSBpdFxuICAgICAgICAgICAgICAgIHRoaXMuX2VuY29kaW5nV29ya2VyID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBjb25maWd1cmUgd29ya2VyIHdpdGggYSBzYW1wbGluZyByYXRlIGFuZCBidWZmZXItc2l6ZVxuICAgICAgICB0aGlzLl9lbmNvZGluZ1dvcmtlci5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICBhY3Rpb246IFwiaW5pdGlhbGl6ZVwiLFxuICAgICAgICAgICAgc2FtcGxlX3JhdGU6IHRoaXMuX2F1ZGlvQ29udGV4dC5zYW1wbGVSYXRlLFxuICAgICAgICAgICAgYnVmZmVyX3NpemU6IHRoaXMuX2F1ZGlvTGlzdGVuZXIuYnVmZmVyU2l6ZVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUT0RPOiBpdCBtaWdodCBiZSBiZXR0ZXIgdG8gbGlzdGVuIGZvciBhIG1lc3NhZ2UgYmFjayBmcm9tIHRoZSBiYWNrZ3JvdW5kIHdvcmtlciBiZWZvcmUgY29uc2lkZXJpbmcgdGhhdCByZWNvcmRpbmcgaGFzIGJlZ2FuXG4gICAgICAgIC8vIGl0J3MgZWFzaWVyIHRvIHRyaW0gYXVkaW8gdGhhbiBjYXB0dXJlIGEgbWlzc2luZyB3b3JkIGF0IHRoZSBzdGFydCBvZiBhIHNlbnRlbmNlXG4gICAgICAgIHRoaXMuX2lzUmVjb3JkaW5nID0gZmFsc2U7XG5cbiAgICAgICAgLy8gY29ubmVjdCBhdWRpbyBub2Rlc1xuICAgICAgICAvLyBhdWRpby1pbnB1dCAtPiBnYWluIC0+IGZmdC1hbmFseXplciAtPiBQQ00tZGF0YSBjYXB0dXJlIC0+IGRlc3RpbmF0aW9uXG5cbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0TWFudWFsRW5jb2RpbmcoKTsgQ29ubmVjdGluZyBBdWRpbyBOb2Rlcy4uXCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdGluZzogaW5wdXQtPmdhaW5cIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvSW5wdXQuY29ubmVjdCh0aGlzLl9hdWRpb0dhaW4pO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY29ubmVjdGluZzogZ2Fpbi0+YW5hbHl6ZXJcIik7XG4gICAgICAgIC8vdGhpcy5fYXVkaW9HYWluLmNvbm5lY3QodGhpcy5fYXVkaW9BbmFseXplcik7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBhbmFseXplci0+bGlzdGVzbmVyXCIpO1xuICAgICAgICAvL3RoaXMuX2F1ZGlvQW5hbHl6ZXIuY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgLy8gY29ubmVjdCBnYWluIGRpcmVjdGx5IGludG8gbGlzdGVuZXIsIGJ5cGFzc2luZyBhbmFseXplclxuICAgICAgICBjb25zb2xlLmxvZyhcImNvbm5lY3Rpbmc6IGdhaW4tPmxpc3RlbmVyXCIpO1xuICAgICAgICB0aGlzLl9hdWRpb0dhaW4uY29ubmVjdCh0aGlzLl9hdWRpb0xpc3RlbmVyKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0aW5nOiBsaXN0ZW5lci0+ZGVzdGluYXRpb25cIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvTGlzdGVuZXIuY29ubmVjdCh0aGlzLl9hdWRpb0Rlc3RpbmF0aW9uKTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBzaHV0ZG93bk1hbnVhbEVuY29kaW5nKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvQ2FwdHVyZTo6c2h1dGRvd25NYW51YWxFbmNvZGluZygpOyBUZWFyaW5nIGRvd24gQXVkaW9BUEkgY29ubmVjdGlvbnMuLlwiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcImRpc2Nvbm5lY3Rpbmc6IGxpc3RlbmVyLT5kZXN0aW5hdGlvblwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9MaXN0ZW5lci5kaXNjb25uZWN0KHRoaXMuX2F1ZGlvRGVzdGluYXRpb24pO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogYW5hbHl6ZXItPmxpc3Rlc25lclwiKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0FuYWx5emVyLmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9MaXN0ZW5lcik7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBnYWluLT5hbmFseXplclwiKTtcbiAgICAgICAgLy90aGlzLl9hdWRpb0dhaW4uZGlzY29ubmVjdCh0aGlzLl9hdWRpb0FuYWx5emVyKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJkaXNjb25uZWN0aW5nOiBnYWluLT5saXN0ZW5lclwiKTtcbiAgICAgICAgdGhpcy5fYXVkaW9HYWluLmRpc2Nvbm5lY3QodGhpcy5fYXVkaW9MaXN0ZW5lcik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZGlzY29ubmVjdGluZzogaW5wdXQtPmdhaW5cIik7XG4gICAgICAgIHRoaXMuX2F1ZGlvSW5wdXQuZGlzY29ubmVjdCh0aGlzLl9hdWRpb0dhaW4pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBtaWNyb3Bob25lIG1heSBiZSBsaXZlLCBidXQgaXQgaXNuJ3QgcmVjb3JkaW5nLiBUaGlzIHRvZ2dsZXMgdGhlIGFjdHVhbCB3cml0aW5nIHRvIHRoZSBjYXB0dXJlIHN0cmVhbS5cbiAgICAgKiBjYXB0dXJlQXVkaW9TYW1wbGVzIGJvb2wgaW5kaWNhdGVzIHdoZXRoZXIgdG8gcmVjb3JkIGZyb20gbWljXG4gICAgICovXG4gICAgdG9nZ2xlTWljcm9waG9uZVJlY29yZGluZyhjYXB0dXJlQXVkaW9TYW1wbGVzKSB7XG4gICAgICAgIHRoaXMuX2lzUmVjb3JkaW5nID0gY2FwdHVyZUF1ZGlvU2FtcGxlcztcbiAgICB9XG5cbiAgICBzZXRHYWluKGdhaW4pIHtcbiAgICAgICAgaWYgKHRoaXMuX2F1ZGlvR2FpbilcbiAgICAgICAgICAgIHRoaXMuX2F1ZGlvR2Fpbi5nYWluLnZhbHVlID0gZ2FpbjtcblxuICAgICAgICBjb25zb2xlLmxvZyhcInNldHRpbmcgZ2FpbjogXCIgKyBnYWluKTtcbiAgICAgICAgdGhpcy5fY2FjaGVkR2FpblZhbHVlID0gZ2FpbjtcbiAgICB9XG5cbiAgICBzdGFydChvblN0YXJ0ZWRDYWxsYmFjaykge1xuICAgICAgICBjb25zb2xlLmxvZyhcInRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtXCIsIHRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtKTtcbiAgICAgICAgdGhpcy5zdGFydE1hbnVhbEVuY29kaW5nKHRoaXMuX2NhY2hlZE1lZGlhU3RyZWFtKTtcblxuICAgICAgICAvLyBUT0RPOiBtaWdodCBiZSBhIGdvb2QgdGltZSB0byBzdGFydCBhIHNwZWN0cmFsIGFuYWx5emVyXG5cbiAgICAgICAgaWYgKG9uU3RhcnRlZENhbGxiYWNrKVxuICAgICAgICAgICAgb25TdGFydGVkQ2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICBzdG9wKGNhcHR1cmVDb21wbGV0ZUNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuX29uQ2FwdHVyZUNvbXBsZXRlQ2FsbGJhY2sgPSBjYXB0dXJlQ29tcGxldGVDYWxsYmFjaztcbiAgICAgICAgdGhpcy5faXNSZWNvcmRpbmcgPSBmYWxzZTtcblxuICAgICAgICBpZiAodGhpcy5fYXVkaW9Db250ZXh0KSB7XG4gICAgICAgICAgICAvLyBzdG9wIHRoZSBtYW51YWwgZW5jb2RlclxuICAgICAgICAgICAgdGhpcy5fZW5jb2RpbmdXb3JrZXIucG9zdE1lc3NhZ2Uoe2FjdGlvbjogXCJmaW5pc2hcIn0pO1xuICAgICAgICAgICAgdGhpcy5zaHV0ZG93bk1hbnVhbEVuY29kaW5nKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYXVkaW9FbmNvZGVyKSB7XG4gICAgICAgICAgICAvLyBzdG9wIHRoZSBhdXRvbWF0aWMgZW5jb2RlclxuXG4gICAgICAgICAgICBpZiAodGhpcy5fYXVkaW9FbmNvZGVyLnN0YXRlICE9PSAncmVjb3JkaW5nJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkF1ZGlvQ2FwdHVyZTo6c3RvcCgpOyBfYXVkaW9FbmNvZGVyLnN0YXRlICE9ICdyZWNvcmRpbmcnXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9hdWRpb0VuY29kZXIucmVxdWVzdERhdGEoKTtcbiAgICAgICAgICAgIHRoaXMuX2F1ZGlvRW5jb2Rlci5zdG9wKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUT0RPOiBzdG9wIGFueSBhY3RpdmUgc3BlY3RyYWwgYW5hbHlzaXNcbiAgICB9O1xufVxuXG4vKlxuLy8gdW51c2VkIGF0IHRoZSBtb21lbnRcbmZ1bmN0aW9uIEFuYWx5emVyKCkge1xuXG4gICAgdmFyIF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkLFxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhc1xuICAgICAgICA7XG5cbiAgICB0aGlzLnN0YXJ0QW5hbHl6ZXJVcGRhdGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB1cGRhdGVBbmFseXplcigpO1xuICAgIH07XG5cbiAgICB0aGlzLnN0b3BBbmFseXplclVwZGF0ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKF9hdWRpb0NhbnZhc0FuaW1hdGlvbklkKTtcbiAgICAgICAgX2F1ZGlvQ2FudmFzQW5pbWF0aW9uSWQgPSBudWxsO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVBbmFseXplcigpIHtcblxuICAgICAgICBpZiAoIV9hdWRpb1NwZWN0cnVtQ2FudmFzKVxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlY29yZGluZy12aXN1YWxpemVyXCIpLmdldENvbnRleHQoXCIyZFwiKTtcblxuICAgICAgICB2YXIgZnJlcURhdGEgPSBuZXcgVWludDhBcnJheShfYXVkaW9BbmFseXplci5mcmVxdWVuY3lCaW5Db3VudCk7XG4gICAgICAgIF9hdWRpb0FuYWx5emVyLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXFEYXRhKTtcblxuICAgICAgICB2YXIgbnVtQmFycyA9IF9hdWRpb0FuYWx5emVyLmZyZXF1ZW5jeUJpbkNvdW50O1xuICAgICAgICB2YXIgYmFyV2lkdGggPSBNYXRoLmZsb29yKF9jYW52YXNXaWR0aCAvIG51bUJhcnMpIC0gX2ZmdEJhclNwYWNpbmc7XG5cblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1vdmVyXCI7XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuY2xlYXJSZWN0KDAsIDAsIF9jYW52YXNXaWR0aCwgX2NhbnZhc0hlaWdodCk7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxTdHlsZSA9ICcjZjZkNTY1JztcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMubGluZUNhcCA9ICdyb3VuZCc7XG5cbiAgICAgICAgdmFyIHgsIHksIHcsIGg7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGZyZXFEYXRhW2ldO1xuICAgICAgICAgICAgdmFyIHNjYWxlZF92YWx1ZSA9ICh2YWx1ZSAvIDI1NikgKiBfY2FudmFzSGVpZ2h0O1xuXG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIF9mZnRCYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gc2NhbGVkX3ZhbHVlO1xuICAgICAgICAgICAgdyA9IGJhcldpZHRoO1xuICAgICAgICAgICAgaCA9IHNjYWxlZF92YWx1ZTtcblxuICAgICAgICAgICAgdmFyIGdyYWRpZW50ID0gX2F1ZGlvU3BlY3RydW1DYW52YXMuY3JlYXRlTGluZWFyR3JhZGllbnQoeCwgX2NhbnZhc0hlaWdodCwgeCwgeSk7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMS4wLCBcInJnYmEoMCwwLDAsMS4wKVwiKTtcbiAgICAgICAgICAgIGdyYWRpZW50LmFkZENvbG9yU3RvcCgwLjAsIFwicmdiYSgwLDAsMCwxLjApXCIpO1xuXG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBncmFkaWVudDtcbiAgICAgICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmZpbGxSZWN0KHgsIHksIHcsIGgpO1xuXG4gICAgICAgICAgICBpZiAoc2NhbGVkX3ZhbHVlID4gX2hpdEhlaWdodHNbaV0pIHtcbiAgICAgICAgICAgICAgICBfaGl0VmVsb2NpdGllc1tpXSArPSAoc2NhbGVkX3ZhbHVlIC0gX2hpdEhlaWdodHNbaV0pICogNjtcbiAgICAgICAgICAgICAgICBfaGl0SGVpZ2h0c1tpXSA9IHNjYWxlZF92YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX2hpdFZlbG9jaXRpZXNbaV0gLT0gNDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gKz0gX2hpdFZlbG9jaXRpZXNbaV0gKiAwLjAxNjtcblxuICAgICAgICAgICAgaWYgKF9oaXRIZWlnaHRzW2ldIDwgMClcbiAgICAgICAgICAgICAgICBfaGl0SGVpZ2h0c1tpXSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBcInNvdXJjZS1hdG9wXCI7XG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmRyYXdJbWFnZShfY2FudmFzQmcsIDAsIDApO1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLW92ZXJcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwyNTUsMjU1LDAuNylcIjtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIF9mZnRCYXJTcGFjaW5nKTtcbiAgICAgICAgICAgIHkgPSBfY2FudmFzSGVpZ2h0IC0gTWF0aC5yb3VuZChfaGl0SGVpZ2h0c1tpXSkgLSAyO1xuICAgICAgICAgICAgdyA9IGJhcldpZHRoO1xuICAgICAgICAgICAgaCA9IGJhcldpZHRoO1xuXG4gICAgICAgICAgICBpZiAoX2hpdEhlaWdodHNbaV0gPT09IDApXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIC8vX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gXCJyZ2JhKDI1NSwgMjU1LCAyNTUsXCIrIE1hdGgubWF4KDAsIDEgLSBNYXRoLmFicyhfaGl0VmVsb2NpdGllc1tpXS8xNTApKSArIFwiKVwiO1xuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoeCwgeSwgdywgaCk7XG4gICAgICAgIH1cblxuICAgICAgICBfYXVkaW9DYW52YXNBbmltYXRpb25JZCA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlQW5hbHl6ZXIpO1xuICAgIH1cblxuICAgIHZhciBfY2FudmFzV2lkdGgsIF9jYW52YXNIZWlnaHQ7XG4gICAgdmFyIF9mZnRTaXplID0gMjU2O1xuICAgIHZhciBfZmZ0U21vb3RoaW5nID0gMC44O1xuICAgIHZhciBfZmZ0QmFyU3BhY2luZyA9IDE7XG5cbiAgICB2YXIgX2hpdEhlaWdodHMgPSBbXTtcbiAgICB2YXIgX2hpdFZlbG9jaXRpZXMgPSBbXTtcblxuICAgIHRoaXMudGVzdENhbnZhcyA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB2YXIgY2FudmFzQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWNvcmRpbmctdmlzdWFsaXplclwiKTtcblxuICAgICAgICBfY2FudmFzV2lkdGggPSBjYW52YXNDb250YWluZXIud2lkdGg7XG4gICAgICAgIF9jYW52YXNIZWlnaHQgPSBjYW52YXNDb250YWluZXIuaGVpZ2h0O1xuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzID0gY2FudmFzQ29udGFpbmVyLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBcInJnYmEoMCwwLDAsMClcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFJlY3QoMCwgMCwgX2NhbnZhc1dpZHRoLCBfY2FudmFzSGVpZ2h0KTtcblxuICAgICAgICB2YXIgbnVtQmFycyA9IF9mZnRTaXplIC8gMjtcbiAgICAgICAgdmFyIGJhclNwYWNpbmcgPSBfZmZ0QmFyU3BhY2luZztcbiAgICAgICAgdmFyIGJhcldpZHRoID0gTWF0aC5mbG9vcihfY2FudmFzV2lkdGggLyBudW1CYXJzKSAtIGJhclNwYWNpbmc7XG5cbiAgICAgICAgdmFyIHgsIHksIHcsIGgsIGk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG51bUJhcnM7IGkrKykge1xuICAgICAgICAgICAgX2hpdEhlaWdodHNbaV0gPSBfY2FudmFzSGVpZ2h0IC0gMTtcbiAgICAgICAgICAgIF9oaXRWZWxvY2l0aWVzW2ldID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1CYXJzOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzY2FsZWRfdmFsdWUgPSBNYXRoLmFicyhNYXRoLnNpbihNYXRoLlBJICogNiAqIChpIC8gbnVtQmFycykpKSAqIF9jYW52YXNIZWlnaHQ7XG5cbiAgICAgICAgICAgIHggPSBpICogKGJhcldpZHRoICsgYmFyU3BhY2luZyk7XG4gICAgICAgICAgICB5ID0gX2NhbnZhc0hlaWdodCAtIHNjYWxlZF92YWx1ZTtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSBzY2FsZWRfdmFsdWU7XG5cbiAgICAgICAgICAgIHZhciBncmFkaWVudCA9IF9hdWRpb1NwZWN0cnVtQ2FudmFzLmNyZWF0ZUxpbmVhckdyYWRpZW50KHgsIF9jYW52YXNIZWlnaHQsIHgsIHkpO1xuICAgICAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKDEuMCwgXCJyZ2JhKDAsMCwwLDAuMClcIik7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoMC4wLCBcInJnYmEoMCwwLDAsMS4wKVwiKTtcblxuICAgICAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZmlsbFN0eWxlID0gZ3JhZGllbnQ7XG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9hdWRpb1NwZWN0cnVtQ2FudmFzLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IFwic291cmNlLWF0b3BcIjtcbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZHJhd0ltYWdlKF9jYW52YXNCZywgMCwgMCk7XG5cbiAgICAgICAgX2F1ZGlvU3BlY3RydW1DYW52YXMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsU3R5bGUgPSBcIiNmZmZmZmZcIjtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbnVtQmFyczsgaSsrKSB7XG4gICAgICAgICAgICB4ID0gaSAqIChiYXJXaWR0aCArIGJhclNwYWNpbmcpO1xuICAgICAgICAgICAgeSA9IF9jYW52YXNIZWlnaHQgLSBfaGl0SGVpZ2h0c1tpXTtcbiAgICAgICAgICAgIHcgPSBiYXJXaWR0aDtcbiAgICAgICAgICAgIGggPSAyO1xuXG4gICAgICAgICAgICBfYXVkaW9TcGVjdHJ1bUNhbnZhcy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgX3Njb3BlID0gdGhpcztcblxuICAgIHZhciBfY2FudmFzQmcgPSBuZXcgSW1hZ2UoKTtcbiAgICBfY2FudmFzQmcub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBfc2NvcGUudGVzdENhbnZhcygpO1xuICAgIH07XG4gICAgLy9fY2FudmFzQmcuc3JjID0gXCIvaW1nL2JnNXMuanBnXCI7XG4gICAgX2NhbnZhc0JnLnNyYyA9IFwiL2ltZy9iZzYtd2lkZS5qcGdcIjtcbn1cbiovXG5cbmV4cG9ydCB7IEF1ZGlvQ2FwdHVyZSB9XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJ1xuXG5jbGFzcyBDcmVhdGVSZWNvcmRpbmdNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsIHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG51bV9yZWNvcmRpbmdzOiAwLFxuICAgICAgICAgICAgcmVjb3JkaW5nX3RpbWU6IDBcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICAgICAgc3VwZXIob3B0cyk7XG4gICAgICAgIC8vXG4gICAgICAgIC8vdGhpcy5kZWZhdWx0cyA9IHtcbiAgICAgICAgLy8gICAgbnVtX3JlY29yZGluZ3M6IDAsXG4gICAgICAgIC8vICAgIHJlY29yZGluZ190aW1lOiAwXG4gICAgICAgIC8vfVxuXG4gICAgICAgIHRoaXMudXJsUm9vdCA9IFwiL2FwaS9jcmVhdGVfcmVjb3JkaW5nXCI7XG4gICAgfVxufVxuXG5leHBvcnQgeyBDcmVhdGVSZWNvcmRpbmdNb2RlbCB9XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5cbmNsYXNzIEN1cnJlbnRVc2VyTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbCB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB1c2VybmFtZTogXCJcIixcbiAgICAgICAgICAgIHByb2ZpbGVJbWFnZTogXCJcIixcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogXCJcIixcbiAgICAgICAgICAgIGlkOiBcIlwiXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMudXJsID0gXCIvYXBpL2N1cnJlbnRfdXNlclwiO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgQ3VycmVudFVzZXJNb2RlbCB9XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5cbmNsYXNzIExpc3RlblN0YXRlIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXVkaW9JZDogMCwgLy8gaWQgc3RyaW5nIG9mIHF1aXBcbiAgICAgICAgICAgIHByb2dyZXNzOiAwLCAvLyBbMC0xMDBdXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdHJ1Y3Rvcihwcm9wcykge1xuICAgICAgICBzdXBlcihwcm9wcyk7XG4gICAgICAgIHRoaXMudXJsUm9vdCA9ICcvYXBpL2xpc3Rlbic7XG4gICAgfVxufVxuXG5jbGFzcyBMaXN0ZW5TdGF0ZUNvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uIHtcbiAgICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgICAgIHN1cGVyKG9wdHMpO1xuICAgICAgICB0aGlzLm1vZGVsID0gTGlzdGVuU3RhdGU7XG4gICAgICAgIHRoaXMudXJsID0gXCIvYXBpL2xpc3RlblwiO1xuICAgIH1cbn1cblxuZXhwb3J0IHsgTGlzdGVuU3RhdGUsIExpc3RlblN0YXRlQ29sbGVjdGlvbiB9XG4iLCJpbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJ1xuXG4vKipcbiAqIFJlY29yZGluZ1xuICogZ2V0OiByZWNvcmRpbmcgbWV0YWRhdGEgKyBjYWxsaW5nIHVzZXIncyBsaXN0ZW5pbmcgc3RhdHVzXG4gKiBwb3N0OiBjcmVhdGUgbmV3IHJlY29yZGluZ1xuICogcHV0OiB1cGRhdGUgcmVjb3JkaW5nIG1ldGFkYXRhXG4gKi9cbmNsYXNzIFF1aXBNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsIHtcbiAgICBkZWZhdWx0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlkOiAwLCAvLyBndWlkXG4gICAgICAgICAgICBwcm9ncmVzczogMCwgLy8gWzAtMTAwXSBwZXJjZW50YWdlXG4gICAgICAgICAgICBwb3NpdGlvbjogMCwgLy8gc2Vjb25kc1xuICAgICAgICAgICAgZHVyYXRpb246IDAsIC8vIHNlY29uZHNcbiAgICAgICAgICAgIGlzUHVibGljOiBmYWxzZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3Iob3B0cykge1xuICAgICAgICBzdXBlcihvcHRzKTtcblxuICAgICAgICB0aGlzLnVybFJvb3QgPSBcIi9hcGkvcXVpcHNcIjtcblxuICAgICAgICAvLyBzYXZlIGxpc3RlbmluZyBwcm9ncmVzcyBhdCBtb3N0IGV2ZXJ5IDMgc2Vjb25kc1xuICAgICAgICB0aGlzLnRocm90dGxlZFNhdmUgPSBfLnRocm90dGxlKHRoaXMuc2F2ZSwgMzAwMCk7XG4gICAgfVxufVxuXG5jbGFzcyBNeVF1aXBDb2xsZWN0aW9uIGV4dGVuZHMgQmFja2JvbmUuQ29sbGVjdGlvbiB7XG4gICAgY29uc3RydWN0b3Iob3B0cykge1xuICAgICAgICBzdXBlcihvcHRzKTtcbiAgICAgICAgdGhpcy5tb2RlbCA9IFF1aXBNb2RlbDtcbiAgICAgICAgdGhpcy51cmwgPSBcIi9hcGkvcXVpcHNcIjtcbiAgICB9XG59XG5cbmV4cG9ydCB7IFF1aXBNb2RlbCwgTXlRdWlwQ29sbGVjdGlvbiB9XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiY29tcGlsZXJcIjpbNyxcIj49IDQuMC4wXCJdLFwibWFpblwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiPGRpdiBjbGFzcz1cXFwiY2hhbmdlbG9nXFxcIj5cXG4gICAgPGgyPkNoYW5nZWxvZzwvaDI+XFxuXFxuICAgIDxoMz4yMDE1LTEyLTA1PC9oMz5cXG5cXG4gICAgPHA+RGFyay10aGVtZSB3aXRoIHVuc3BsYXNoLmNvbSBiZyAtIGJlY2F1c2UgSSBvZnRlbiB3b3JrIG9uIHRoaXMgbGF0ZSBhdCBuaWdodC48L3A+XFxuXFxuICAgIDxwPk1vcmUgbW9iaWxlIGZyaWVuZGx5IGRlc2lnbi48L3A+XFxuXFxuICAgIDxwPlxcbiAgICAgICAgU3RvcHBlZCB0cnlpbmcgdG8gZ2V0IGF1ZGlvLXJlY29yZGluZyB0byB3b3JrIHdlbGwgb24gQW5kcm9pZCA0LnggYWZ0ZXIgYnVybmVpbmcgbWFueSB3ZWVrZW5kcyBhbmQgbmlnaHRzLlxcbiAgICAgICAgVGhlIGF1ZGlvIGdsaXRjaGVzIGV2ZW4gd2hlbiByZWNvcmRpbmcgcHVyZSBQQ00sIGEgcHJvYmxlbSBhdCB0aGUgV2ViIEF1ZGlvIGxldmVsLCBub3RoaW5nIEkgY2FuIGRvIGFib3V0IGl0LlxcbiAgICA8L3A+XFxuXFxuICAgIDxwPlxcbiAgICAgICAgRm91bmQgYSBmdW4gd29ya2Fyb3VuZCBtb2JpbGUgY2hyb21lJ3MgaW5hYmlsaXR5IHRvIHBsYXkgV2ViIEF1ZGlvIHJlY29yZGVkIHdhdmUgZmlsZXM6XFxuICAgICAgICBydW4gdGhlIGdlbmVyYXRlZCBibG9icyB0aHJvdWdoIGFuIGFqYXggcmVxdWVzdCwgbWFraW5nIHRoZSBibG9iIGRpc2stYmFja2VkIGxvY2FsbHksIG5vdyB0aGUgbG9jYWwgYmxvYlxcbiAgICAgICAgY2FuIGJlIHBhc3NlZCBpbnRvIGFuICZsdDthdWRpbyZndDsgcGxheWVyLlxcbiAgICA8L3A+XFxuXFxuICAgIDxwPkZvY3VzaW5nIG9uIG1ha2luZyB0aGUgbW9iaWxlIGxpc3RlbmluZyBleHBlcmllbmNlIGdyZWF0LjwvcD5cXG5cXG4gICAgPGgzPjIwMTUtMTAtMDQ8L2gzPlxcblxcbiAgICA8cD5TbGlnaHQgZmFjZWxpZnQsIHVzaW5nIGEgbmV3IGZsYXQgc3R5bGUuIEFkZGVkIGEgZmV3IGFuaW1hdGlvbnMgYW5kIHRoaXMgcHVibGljIGNoYW5nZWxvZyEgOik8L3A+XFxuXFxuICAgIDxoMz4yMDE1LTA5LTI2PC9oMz5cXG5cXG4gICAgPHA+RGVzaWduZWQgYSBsb2dvIGFuZCBjcmVhdGVkIGEgcHJldHR5IGxhbmRpbmctcGFnZSB3aXRoIHR3aXR0ZXItbG9naW4uPC9wPlxcblxcbiAgICA8cD5BZGRlZCBTZW50cnkgZm9yIEphdmFzY3JpcHQgZXJyb3IgY29sbGVjdGlvbiBhbmQgSGVhcCBBbmFseXRpY3MgZm9yIGNyZWF0aW5nIGFkLWhvYyBhbmFseXRpY3MuPC9wPlxcblxcbiAgICA8aDM+MjAxNS0wOS0yMDwvaDM+XFxuXFxuICAgIDxwPlNldHVwIHR3byBuZXcgc2VydmVycyBvbiBEaWdpdGFsIE9jZWFucyB3aXRoIFJvdXRlIDUzIHJvdXRpbmcgYW5kIGFuIFNTTCBjZXJ0aWZpY2F0ZSBmb3IgcHJvZHVjdGlvbi5cXG4gICAgICAgIEhhdmluZyBhbiBTU0wgY2VydGlmaWNhdGUgbWVhbnMgdGhlIHNpdGUgY2FuIGJlIGFjY2Vzc2VkIHZpYSBIVFRQUyB3aGljaCBhbGxvd3MgYnJvd3NlcnNcXG4gICAgICAgIHRvIGNhY2hlIHRoZSBNaWNyb3Bob25lIEFjY2VzcyBwZXJtaXNzaW9ucywgd2hpY2ggbWVhbnMgeW91IGRvbid0IGhhdmUgdG8gY2xpY2sgXFxcImFsbG93XFxcIiBldmVyeSB0aW1lXFxuICAgICAgICB5b3Ugd2FudCB0byBtYWtlIGEgcmVjb3JkaW5nITwvcD5cXG5cXG4gICAgPHA+Rml4ZWQgdXAgUHl0aG9uIEZhYnJpYyBkZXBsb3ltZW50IHNjcmlwdCB0byB3b3JrIGluIG5ldyBzdGFnaW5nICsgcHJvZHVjdGlvbiBlbnZpcm9ubWVudHMuXFxuICAgICAgICBBbmQgYWRkZWQgTW9uZ29EQiBiYWNrdXAvcmVzdG9yZSBzdXBwb3J0LjwvcD5cXG5cXG4gICAgPHA+VXBkYXRlZCBQeXRob24gZGVwZW5kZW5jaWVzLCB0aGV5IHdlcmUgb3ZlciBhIHllYXIgb2xkLCBhbmQgZml4ZWQgY29kZSB0aGF0IGJyb2tlIGFzIGEgcmVzdWx0LlxcbiAgICAgICAgTW9zdGx5IGFyb3VuZCBjaGFuZ2VzIHRvIE1vbmdvRW5naW5lIFB5dGhvbiBsaWIuPC9wPlxcblxcbiAgICA8aDM+MjAxNS0wOS0wNTwvaDM+XFxuXFxuICAgIDxwPkZpeGVkIHByb2plY3QgdG8gd29yayBvbiBPU1ggYW5kIHdpdGhvdXQgdGhlIE5HSU5YIGRlcGVuZGVuY3kuIEkgY2FuIG5vdyBydW4gaXQgYWxsIGluIHB5dGhvbixcXG4gICAgICAgIGluY2x1ZGluZyB0aGUgc3RhdGljIGZpbGUgaG9zdGluZy4gVGhlIHByb2R1Y3Rpb24gc2VydmVycyB1c2UgTkdJTlggZm9yIGJldHRlciBwZXJmb3JtYW5jZS48L3A+XFxuXFxuICAgIDxoMz4yMDE0LTAzLTI5PC9oMz5cXG5cXG4gICAgPHA+UmVxdWVzdCBNZWRpYSBTdHJlYW1pbmcgcGVybWlzc2lvbiBmcm9tIGJyb3dzZXIgb24gcmVjb3JkaW5nLXBhZ2UgbG9hZC4gVGhpcyBtYWtlcyB0aGUgbWljcm9waG9uZVxcbiAgICAgICAgYXZhaWxhYmxlIHRoZSBpbnN0YW50IHlvdSBoaXQgdGhlIHJlY29yZCBidXR0b24uIE5vIG5lZWQgdG8gaGl0IHJlY29yZCBidXR0b24gYW5kIHRoZW4gZGVhbCB3aXRoIGJyb3dzZXInc1xcbiAgICAgICAgc2VjdXJpdHkgcG9wdXBzIGFza2luZyBmb3IgcGVybWlzc2lvbiB0byBhY2Nlc3MgbWljcm9waG9uZS48L3A+XFxuXFxuICAgIDxwPlJlbW92ZWQgY291bnRkb3duIGNsb2NrIHVudGlsbCByZWNvcmRpbmcgYmVnaW5zLCB0aGUgXFxcIjMtMi0xIGdvXFxcIiB3YXNuJ3QgdGhhdCBoZWxwZnVsLjwvcD5cXG5cXG4gICAgPGgzPjIwMTQtMDMtMjc8L2gzPlxcblxcbiAgICA8cD5GaXhlZCBidWcgaW4gdHJhY2tpbmcgd2hlcmUgeW91IHBhdXNlZCBpbiB0aGUgcGxheWJhY2sgb2YgYSByZWNvcmRpbmcuIE5vdyB5b3Ugc2hvdWxkIGJlIGFibGUgdG9cXG4gICAgICAgIHJlc3VtZSBwbGF5YmFjayBleGFjdGx5IHdoZXJlIHlvdSBsZWZ0IG9mZi4gOik8L3A+XFxuXFxuPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9DaGFuZ2Vsb2dWaWV3LmhicydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ2hhbmdlbG9nVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiSW5pdGlhbGl6aW5nIGNoYW5nZWxvZyB2aWV3XCIpO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZW5kZXJpbmcgY2hhbmdlbG9nIHZpZXdcIik7XG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGVtcGxhdGUoKSk7XG4gICAgfVxufVxuIiwiLy8gaGJzZnkgY29tcGlsZWQgSGFuZGxlYmFycyB0ZW1wbGF0ZVxudmFyIEhhbmRsZWJhcnNDb21waWxlciA9IHJlcXVpcmUoJ2hic2Z5L3J1bnRpbWUnKTtcbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlYmFyc0NvbXBpbGVyLnRlbXBsYXRlKHtcImNvbXBpbGVyXCI6WzcsXCI+PSA0LjAuMFwiXSxcIm1haW5cIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcIm0tbWljcm9waG9uZS1yZXF1aXJlZFxcXCI+XFxuICAgIDxoMj5NaWNyb3Bob25lIHJlcXVpcmVkLjwvaDI+XFxuPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5pbXBvcnQgeyBBdWRpb0NhcHR1cmUgfSBmcm9tICcuLi8uLi9hdWRpby1jYXB0dXJlJ1xuaW1wb3J0IHsgQ3JlYXRlUmVjb3JkaW5nTW9kZWwgfSBmcm9tICcuLi8uLi9tb2RlbHMvQ3JlYXRlUmVjb3JkaW5nTW9kZWwnXG5cbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL0dldE1pY3JvcGhvbmUuaGJzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBHZXRNaWNyb3Bob25lVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGRlZmF1bHRzKCkge1xuICAgICAgICByZXR1cm4ge31cbiAgICB9XG5cbiAgICBldmVudHMoKSB7XG4gICAgICAgIHJldHVybiB7fVxuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJyZW5kZXJpbmcgcmVjb3JkZXIgY29udHJvbFwiKTtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0ZW1wbGF0ZSh0aGlzLm1vZGVsLnRvSlNPTigpKSk7XG4gICAgfVxuXG4gICAgYnVpbGQobW9kZWwpIHtcbiAgICAgICAgdGhpcy5tb2RlbCA9IG1vZGVsO1xuXG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlID0gbmV3IEF1ZGlvQ2FwdHVyZSgpO1xuXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgICAgdGhpcy5hdWRpb1BsYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVjb3JkZWQtcHJldmlld1wiKTtcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9QbGF5ZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJjYW4gcGxheSB2b3JiaXM6IFwiLCAhIXRoaXMuYXVkaW9QbGF5ZXIuY2FuUGxheVR5cGUgJiYgXCJcIiAhPSB0aGlzLmF1ZGlvUGxheWVyLmNhblBsYXlUeXBlKCdhdWRpby9vZ2c7IGNvZGVjcz1cInZvcmJpc1wiJykpO1xuXG4gICAgICAgIC8vdGhpcy5hdWRpb1BsYXllci5sb29wID0gXCJsb29wXCI7XG4gICAgICAgIC8vdGhpcy5hdWRpb1BsYXllci5hdXRvcGxheSA9IFwiYXV0b3BsYXlcIjtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIi9hc3NldHMvc291bmRzL2JlZXBfc2hvcnRfb24ub2dnXCI7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIHRoaXMubW9kZWwub24oJ2NoYW5nZTpyZWNvcmRpbmdUaW1lJywgZnVuY3Rpb24gKG1vZGVsLCB0aW1lKSB7XG4gICAgICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLnRleHQodGltZSk7XG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gYXR0ZW1wdCB0byBmZXRjaCBtZWRpYS1zdHJlYW0gb24gcGFnZS1sb2FkXG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlLmdyYWJNaWNyb3Bob25lKG9uTWljcm9waG9uZUdyYW50ZWQsIG9uTWljcm9waG9uZURlbmllZCk7XG4gICAgfVxuXG4gICAgb25NaWNyb3Bob25lRGVuaWVkKCkge1xuICAgICAgICAvLyBzaG93IHNjcmVlbiBhc2tpbmcgdXNlciBmb3IgcGVybWlzc2lvblxuICAgIH1cblxuICAgIG9uTWljcm9waG9uZUdyYW50ZWQoKSB7XG4gICAgICAgIC8vIHNob3cgcmVjb3JkZXJcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKG9wdGlvbnMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlclZpZXcgaW5pdFwiKTtcbiAgICAgICAgbmV3IENyZWF0ZVJlY29yZGluZ01vZGVsKCkuZmV0Y2goKVxuICAgICAgICAgICAgLnRoZW4obW9kZWwgPT4gdGhpcy5idWlsZChuZXcgQ3JlYXRlUmVjb3JkaW5nTW9kZWwobW9kZWwpKSk7XG5cblxuICAgICAgICAvLyBUT0RPOiBhIHByZXR0eSBhZHZhbmNlZCBidXQgbmVhdCBmZWF0dXJlIG1heSBiZSB0byBzdG9yZSBhIGJhY2t1cCBjb3B5IG9mIGEgcmVjb3JkaW5nIGxvY2FsbHkgaW4gY2FzZSBvZiBhIGNyYXNoIG9yIHVzZXItZXJyb3JcbiAgICAgICAgLypcbiAgICAgICAgIC8vIGNoZWNrIGhvdyBtdWNoIHRlbXBvcmFyeSBzdG9yYWdlIHNwYWNlIHdlIGhhdmUuIGl0J3MgYSBnb29kIHdheSB0byBzYXZlIHJlY29yZGluZyB3aXRob3V0IGxvc2luZyBpdFxuICAgICAgICAgd2luZG93LndlYmtpdFN0b3JhZ2VJbmZvLnF1ZXJ5VXNhZ2VBbmRRdW90YShcbiAgICAgICAgIHdlYmtpdFN0b3JhZ2VJbmZvLlRFTVBPUkFSWSxcbiAgICAgICAgIGZ1bmN0aW9uKHVzZWQsIHJlbWFpbmluZykge1xuICAgICAgICAgdmFyIHJtYiA9IChyZW1haW5pbmcgLyAxMDI0IC8gMTAyNCkudG9GaXhlZCg0KTtcbiAgICAgICAgIHZhciB1bWIgPSAodXNlZCAvIDEwMjQgLyAxMDI0KS50b0ZpeGVkKDQpO1xuICAgICAgICAgY29uc29sZS5sb2coXCJVc2VkIHF1b3RhOiBcIiArIHVtYiArIFwibWIsIHJlbWFpbmluZyBxdW90YTogXCIgKyBybWIgKyBcIm1iXCIpO1xuICAgICAgICAgfSwgZnVuY3Rpb24oZSkge1xuICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yJywgZSk7XG4gICAgICAgICB9XG4gICAgICAgICApO1xuXG4gICAgICAgICBmdW5jdGlvbiBvbkVycm9ySW5GUygpIHtcbiAgICAgICAgIHZhciBtc2cgPSAnJztcblxuICAgICAgICAgc3dpdGNoIChlLmNvZGUpIHtcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLlFVT1RBX0VYQ0VFREVEX0VSUjpcbiAgICAgICAgIG1zZyA9ICdRVU9UQV9FWENFRURFRF9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5OT1RfRk9VTkRfRVJSOlxuICAgICAgICAgbXNnID0gJ05PVF9GT1VORF9FUlInO1xuICAgICAgICAgYnJlYWs7XG4gICAgICAgICBjYXNlIEZpbGVFcnJvci5TRUNVUklUWV9FUlI6XG4gICAgICAgICBtc2cgPSAnU0VDVVJJVFlfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgY2FzZSBGaWxlRXJyb3IuSU5WQUxJRF9NT0RJRklDQVRJT05fRVJSOlxuICAgICAgICAgbXNnID0gJ0lOVkFMSURfTU9ESUZJQ0FUSU9OX0VSUic7XG4gICAgICAgICBicmVhaztcbiAgICAgICAgIGNhc2UgRmlsZUVycm9yLklOVkFMSURfU1RBVEVfRVJSOlxuICAgICAgICAgbXNnID0gJ0lOVkFMSURfU1RBVEVfRVJSJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgIG1zZyA9ICdVbmtub3duIEVycm9yJztcbiAgICAgICAgIGJyZWFrO1xuICAgICAgICAgfVxuXG4gICAgICAgICBjb25zb2xlLmxvZygnRXJyb3I6ICcgKyBtc2cpO1xuICAgICAgICAgfVxuXG4gICAgICAgICB3aW5kb3cucmVxdWVzdEZpbGVTeXN0ZW0gID0gd2luZG93LnJlcXVlc3RGaWxlU3lzdGVtIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0RmlsZVN5c3RlbTtcblxuICAgICAgICAgd2luZG93LnJlcXVlc3RGaWxlU3lzdGVtKHdpbmRvdy5URU1QT1JBUlksIDUgKiAxMDI0ICogMTAyNCwgZnVuY3Rpb24gb25TdWNjZXNzKGZzKSB7XG5cbiAgICAgICAgIGNvbnNvbGUubG9nKCdvcGVuaW5nIGZpbGUnKTtcblxuICAgICAgICAgZnMucm9vdC5nZXRGaWxlKFwidGVzdFwiLCB7Y3JlYXRlOnRydWV9LCBmdW5jdGlvbihmZSkge1xuXG4gICAgICAgICBjb25zb2xlLmxvZygnc3Bhd25lZCB3cml0ZXInKTtcblxuICAgICAgICAgZmUuY3JlYXRlV3JpdGVyKGZ1bmN0aW9uKGZ3KSB7XG5cbiAgICAgICAgIGZ3Lm9ud3JpdGVlbmQgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICBjb25zb2xlLmxvZygnd3JpdGUgY29tcGxldGVkJyk7XG4gICAgICAgICB9O1xuXG4gICAgICAgICBmdy5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlIGZhaWxlZDogJyArIGUudG9TdHJpbmcoKSk7XG4gICAgICAgICB9O1xuXG4gICAgICAgICBjb25zb2xlLmxvZygnd3JpdGluZyBibG9iIHRvIGZpbGUuLicpO1xuXG4gICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFsneWVoIHRoaXMgaXMgYSB0ZXN0ISddLCB7dHlwZTogJ3RleHQvcGxhaW4nfSk7XG4gICAgICAgICBmdy53cml0ZShibG9iKTtcblxuICAgICAgICAgfSwgb25FcnJvckluRlMpO1xuXG4gICAgICAgICB9LCBvbkVycm9ySW5GUyk7XG5cbiAgICAgICAgIH0sIG9uRXJyb3JJbkZTKTtcbiAgICAgICAgICovXG4gICAgfVxuXG4gICAgdG9nZ2xlKGV2ZW50KSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnN0b3BSZWNvcmRpbmcoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zdGFydFJlY29yZGluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2FuY2VsUmVjb3JkaW5nKGV2ZW50KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IGNhbmNlbGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItZnVsbFwiKS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLnJlbW92ZUNsYXNzKFwiZmxpcHBlZFwiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIDMpO1xuICAgIH1cblxuICAgIHVwbG9hZFJlY29yZGluZyhldmVudCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyB1cGxvYWRpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiXCI7XG5cbiAgICAgICAgJChcIiNyZWNvcmRlci1mdWxsXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikucmVtb3ZlQ2xhc3MoXCJmbGlwcGVkXCIpO1xuXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9ICQoJ3RleHRhcmVhW25hbWU9ZGVzY3JpcHRpb25dJylbMF0udmFsdWU7XG5cbiAgICAgICAgdmFyIGRhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2Rlc2NyaXB0aW9uJywgZGVzY3JpcHRpb24pO1xuICAgICAgICBkYXRhLmFwcGVuZCgnaXNQdWJsaWMnLCAxKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2F1ZGlvLWJsb2InLCB0aGlzLmF1ZGlvQmxvYik7XG5cbiAgICAgICAgLy8gc2VuZCByYXcgYmxvYiBhbmQgbWV0YWRhdGFcblxuICAgICAgICAvLyBUT0RPOiBnZXQgYSByZXBsYWNlbWVudCBhamF4IGxpYnJhcnkgKG1heWJlIHBhdGNoIHJlcXdlc3QgdG8gc3VwcG9ydCBiaW5hcnk/KVxuICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHhoci5vcGVuKCdwb3N0JywgJy9yZWNvcmRpbmcvY3JlYXRlJywgdHJ1ZSk7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICB4aHIudXBsb2FkLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdmFyIHBlcmNlbnQgPSAoKGUubG9hZGVkIC8gZS50b3RhbCkgKiAxMDApLnRvRml4ZWQoMCkgKyAnJSc7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInBlcmNlbnRhZ2U6IFwiICsgcGVyY2VudCk7XG4gICAgICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmZpbmQoXCIuYmFyXCIpLmNzcygnd2lkdGgnLCBwZXJjZW50KTtcbiAgICAgICAgfTtcbiAgICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmZpbmQoXCIuYmFyXCIpLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgbWFudWFsIHhociBzdWNjZXNzZnVsXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBtYW51YWwgeGhyIGVycm9yXCIsIHhocik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2UpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ4aHIucmVzcG9uc2VcIiwgeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVzdWx0XCIsIHJlc3VsdCk7XG5cbiAgICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09IFwic3VjY2Vzc1wiKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZXN1bHQudXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB4aHIuc2VuZChkYXRhKTtcbiAgICB9XG5cbiAgICBvblJlY29yZGluZ1RpY2soKSB7XG4gICAgICAgIHZhciB0aW1lU3BhbiA9IHBhcnNlSW50KCgobmV3IERhdGUoKS5nZXRUaW1lKCkgLSB0aGlzLnRpbWVyU3RhcnQpIC8gMTAwMCkudG9GaXhlZCgpKTtcbiAgICAgICAgdmFyIHRpbWVTdHIgPSB0aGlzLkludFRvVGltZSh0aW1lU3Bhbik7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGltZVN0cik7XG4gICAgfVxuXG4gICAgb25Db3VudGRvd25UaWNrKCkge1xuICAgICAgICBpZiAoLS10aGlzLnRpbWVyU3RhcnQgPiAwKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRoaXMudGltZXJTdGFydCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImNvdW50ZG93biBoaXQgemVyby4gYmVnaW4gcmVjb3JkaW5nLlwiKTtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcklkKTtcbiAgICAgICAgICAgIHRoaXMubW9kZWwuc2V0KCdyZWNvcmRpbmdUaW1lJywgdGhpcy5JbnRUb1RpbWUoMCkpO1xuICAgICAgICAgICAgdGhpcy5vbk1pY1JlY29yZGluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RhcnRSZWNvcmRpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3RhcnRpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZS5zdGFydCgoKSA9PiB0aGlzLm9uTWljUmVhZHkoKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWljcm9waG9uZSBpcyByZWFkeSB0byByZWNvcmQuIERvIGEgY291bnQtZG93biwgdGhlbiBzaWduYWwgZm9yIGlucHV0LXNpZ25hbCB0byBiZWdpbiByZWNvcmRpbmdcbiAgICAgKi9cbiAgICBvbk1pY1JlYWR5KCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIm1pYyByZWFkeSB0byByZWNvcmQuIGRvIGNvdW50ZG93bi5cIik7XG4gICAgICAgIHRoaXMudGltZXJTdGFydCA9IDM7XG4gICAgICAgIC8vIHJ1biBjb3VudGRvd25cbiAgICAgICAgLy90aGlzLnRpbWVySWQgPSBzZXRJbnRlcnZhbCh0aGlzLm9uQ291bnRkb3duVGljay5iaW5kKHRoaXMpLCAxMDAwKTtcblxuICAgICAgICAvLyBvciBsYXVuY2ggY2FwdHVyZSBpbW1lZGlhdGVseVxuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIHRoaXMuSW50VG9UaW1lKDApKTtcbiAgICAgICAgdGhpcy5vbk1pY1JlY29yZGluZygpO1xuXG4gICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikuYWRkQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xuICAgIH1cblxuICAgIG9uTWljUmVjb3JkaW5nKCkge1xuICAgICAgICB0aGlzLnRpbWVyU3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgdGhpcy50aW1lcklkID0gc2V0SW50ZXJ2YWwodGhpcy5vblJlY29yZGluZ1RpY2suYmluZCh0aGlzKSwgMTAwMCk7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctc2NyZWVuXCIpLmFkZENsYXNzKFwiaXMtcmVjb3JkaW5nXCIpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTWljIHJlY29yZGluZyBzdGFydGVkXCIpO1xuXG4gICAgICAgIC8vIFRPRE86IHRoZSBtaWMgY2FwdHVyZSBpcyBhbHJlYWR5IGFjdGl2ZSwgc28gYXVkaW8gYnVmZmVycyBhcmUgZ2V0dGluZyBidWlsdCB1cFxuICAgICAgICAvLyB3aGVuIHRvZ2dsaW5nIHRoaXMgb24sIHdlIG1heSBhbHJlYWR5IGJlIGNhcHR1cmluZyBhIGJ1ZmZlciB0aGF0IGhhcyBhdWRpbyBwcmlvciB0byB0aGUgY291bnRkb3duXG4gICAgICAgIC8vIGhpdHRpbmcgemVyby4gd2UgY2FuIGRvIGEgZmV3IHRoaW5ncyBoZXJlOlxuICAgICAgICAvLyAxKSBmaWd1cmUgb3V0IGhvdyBtdWNoIGF1ZGlvIHdhcyBhbHJlYWR5IGNhcHR1cmVkLCBhbmQgY3V0IGl0IG91dFxuICAgICAgICAvLyAyKSB1c2UgYSBmYWRlLWluIHRvIGNvdmVyIHVwIHRoYXQgc3BsaXQtc2Vjb25kIG9mIGF1ZGlvXG4gICAgICAgIC8vIDMpIGFsbG93IHRoZSB1c2VyIHRvIGVkaXQgcG9zdC1yZWNvcmQgYW5kIGNsaXAgYXMgdGhleSB3aXNoIChiZXR0ZXIgYnV0IG1vcmUgY29tcGxleCBvcHRpb24hKVxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuYXVkaW9DYXB0dXJlLnRvZ2dsZU1pY3JvcGhvbmVSZWNvcmRpbmcodHJ1ZSksIDUwMCk7XG4gICAgfVxuXG4gICAgc3RvcFJlY29yZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJzdG9wcGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcklkKTtcblxuICAgICAgICAvLyBwbGF5IHNvdW5kIGltbWVkaWF0ZWx5IHRvIGJ5cGFzcyBtb2JpbGUgY2hyb21lJ3MgXCJ1c2VyIGluaXRpYXRlZCBtZWRpYVwiIHJlcXVpcmVtZW50XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0gXCIvYXNzZXRzL3NvdW5kcy9iZWVwX3Nob3J0X29uLm9nZ1wiO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcblxuICAgICAgICB0aGlzLmF1ZGlvQ2FwdHVyZS5zdG9wKChibG9iKSA9PiB0aGlzLm9uUmVjb3JkaW5nQ29tcGxldGVkKGJsb2IpKTtcblxuICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLnJlbW92ZUNsYXNzKFwiaXMtdmlzaWJsZVwiKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1zY3JlZW5cIikucmVtb3ZlQ2xhc3MoXCJpcy1yZWNvcmRpbmdcIik7XG5cbiAgICAgICAgLy8gVE9ETzogYW5pbWF0ZSByZWNvcmRlciBvdXRcbiAgICAgICAgLy8gVE9ETzogYW5pbWF0ZSB1cGxvYWRlciBpblxuICAgIH1cblxuICAgIG9uUmVjb3JkaW5nQ29tcGxldGVkKGJsb2IpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgcHJldmlld2luZyByZWNvcmRlZCBhdWRpb1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0Jsb2IgPSBibG9iO1xuICAgICAgICB0aGlzLnNob3dDb21wbGV0aW9uU2NyZWVuKCk7XG4gICAgfVxuXG4gICAgcGxheVByZXZpZXcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicGxheWluZyBwcmV2aWV3Li5cIik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYXVkaW8gYmxvYlwiLCB0aGlzLmF1ZGlvQmxvYik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYXVkaW8gYmxvYiB1cmxcIiwgdGhpcy5hdWRpb0Jsb2JVcmwpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHRoaXMuYXVkaW9CbG9iVXJsO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcbiAgICB9XG5cbiAgICBzaG93Q29tcGxldGlvblNjcmVlbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZWNvcmRlcjo6b25SZWNvcmRpbmdDb21wbGV0ZWQoKTsgZmxpcHBpbmcgdG8gYXVkaW8gcGxheWJhY2tcIik7XG4gICAgICAgIHRoaXMuYXVkaW9CbG9iVXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwodGhpcy5hdWRpb0Jsb2IpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLWNvbnRhaW5lclwiKS5hZGRDbGFzcyhcImZsaXBwZWRcIik7XG5cbiAgICAgICAgLy8gSEFDSzogcm91dGUgYmxvYiB0aHJvdWdoIHhociB0byBsZXQgQW5kcm9pZCBDaHJvbWUgcGxheSBibG9icyB2aWEgPGF1ZGlvPlxuICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHhoci5vcGVuKCdHRVQnLCB0aGlzLmF1ZGlvQmxvYlVybCwgdHJ1ZSk7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYic7XG4gICAgICAgIHhoci5vdmVycmlkZU1pbWVUeXBlKCdhdWRpby9vZ2cnKTtcblxuICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0ICYmIHhoci5zdGF0dXMgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHhockJsb2JVcmwgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTCh4aHIucmVzcG9uc2UpO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJMb2FkZWQgYmxvYiBmcm9tIGNhY2hlIHVybDogXCIgKyB0aGlzLmF1ZGlvQmxvYlVybCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJSb3V0ZWQgaW50byBibG9iIHVybDogXCIgKyB4aHJCbG9iVXJsKTtcblxuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3JjID0geGhyQmxvYlVybDtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBsYXkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgeGhyLnNlbmQoKTtcbiAgICB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBNaWNyb3Bob25lUGVybWlzc2lvbnMge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLm1pY3JvcGhvbmVNZWRpYVN0cmVhbSA9IG51bGw7XG4gICAgfVxuXG4gICAgaGF2ZU1pY3JvcGhvbmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1pY3JvcGhvbmVNZWRpYVN0cmVhbSAhPSBudWxsID8gdHJ1ZSA6IGZhbHNlO1xuICAgIH1cblxuICAgIHNldE1pY3JvcGhvbmUobXMpIHtcbiAgICAgICAgdGhpcy5taWNyb3Bob25lTWVkaWFTdHJlYW0gPSBtcztcbiAgICB9XG5cbiAgICBncmFiTWljcm9waG9uZShvbk1pY3JvcGhvbmVHcmFudGVkLCBvbk1pY3JvcGhvbmVEZW5pZWQpIHtcbiAgICAgICAgaWYgKHRoaXMuaGF2ZU1pY3JvcGhvbmUoKSkge1xuICAgICAgICAgICAgb25NaWNyb3Bob25lR3JhbnRlZCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlXG4gICAgICAgICAgICAuZ2V0VXNlck1lZGlhKHthdWRpbzogdHJ1ZX0pXG4gICAgICAgICAgICAudGhlbigobXMpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldE1pY3JvcGhvbmUobXMpO1xuICAgICAgICAgICAgICAgIG9uTWljcm9waG9uZUdyYW50ZWQobXMpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb0NhcHR1cmU6OnN0YXJ0KCk7IGNvdWxkIG5vdCBncmFiIG1pY3JvcGhvbmUuIHBlcmhhcHMgdXNlciBkaWRuJ3QgZ2l2ZSB1cyBwZXJtaXNzaW9uP1wiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oZXJyKTtcbiAgICAgICAgICAgICAgICBvbk1pY3JvcGhvbmVEZW5pZWQoZXJyKTtcbiAgICAgICAgICAgIH0pXG4gICAgfVxufVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0IFF1aXBWaWV3IGZyb20gJy4uLy4uL3BhcnRpYWxzL1F1aXBWaWV3LmpzJ1xuaW1wb3J0IHsgQXVkaW9QbGF5ZXIgfSBmcm9tICcuLi8uLi9wYXJ0aWFscy9BdWRpb1BsYXllclZpZXcnXG5pbXBvcnQgeyBRdWlwTW9kZWwsIE15UXVpcENvbGxlY3Rpb24gfSBmcm9tICcuLi8uLi9tb2RlbHMvUXVpcCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSG9tZXBhZ2VWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgbmV3IE15UXVpcENvbGxlY3Rpb24oKS5mZXRjaCgpLnRoZW4ocXVpcHMgPT4gdGhpcy5vblF1aXBzTG9hZGVkKHF1aXBzKSlcbiAgICB9XG5cbiAgICBzaHV0ZG93bigpIHtcbiAgICAgICAgaWYgKHRoaXMucXVpcFZpZXdzICE9IG51bGwpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHF1aXAgb2YgdGhpcy5xdWlwVmlld3MpIHtcbiAgICAgICAgICAgICAgICBxdWlwLnNodXRkb3duKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBBdWRpb1BsYXllci50cmlnZ2VyKFwicGF1c2VcIik7XG4gICAgfVxuXG4gICAgb25RdWlwc0xvYWRlZChxdWlwcykge1xuICAgICAgICBjb25zb2xlLmxvZyhcImxvYWRlZCBxdWlwc1wiLCBxdWlwcyk7XG5cbiAgICAgICAgdGhpcy5xdWlwVmlld3MgPSBbXTtcblxuICAgICAgICBmb3IgKHZhciBxdWlwIG9mIHF1aXBzKSB7XG4gICAgICAgICAgICB2YXIgcXVpcFZpZXcgPSBuZXcgUXVpcFZpZXcoe21vZGVsOiBuZXcgUXVpcE1vZGVsKHF1aXApfSk7XG4gICAgICAgICAgICB0aGlzLnF1aXBWaWV3cy5wdXNoKHF1aXBWaWV3KTtcbiAgICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZChxdWlwVmlldy5lbCk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiXCI7XG59LFwiM1wiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtLXJlY29yZGluZy1tb3RpdmF0aW9uXFxcIj5cXG4gICAgICAgICAgICA8aDE+UmVjb3JkIHlvdXIgZmlyc3QgcG9kY2FzdC48L2gxPlxcblxcbiAgICAgICAgICAgIDxwPlRha2VzIG9ubHkgMzAgc2Vjb25kcy48L3A+XFxuICAgICAgICA8L2Rpdj5cXG5cIjtcbn0sXCJjb21waWxlclwiOls3LFwiPj0gNC4wLjBcIl0sXCJtYWluXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxO1xuXG4gIHJldHVybiBcIjxhdWRpbyBpZD1cXFwicmVjb3JkZWQtcHJldmlld1xcXCIgY29udHJvbHM9XFxcImNvbnRyb2xzXFxcIj48L2F1ZGlvPlxcblxcbjxkaXYgY2xhc3M9XFxcIm0tcXVpcHMtc2FtcGxlLWxpc3RpbmdcXFwiPlxcblwiXG4gICAgKyAoKHN0YWNrMSA9IGhlbHBlcnNbXCJpZlwiXS5jYWxsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwIDoge30sKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLm51bV9yZWNvcmRpbmdzIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjpjb250YWluZXIucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjpjb250YWluZXIucHJvZ3JhbSgzLCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCI8L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJtLXJlY29yZGluZy1jb250YWluZXJcXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjYXJkXFxcIj5cXG5cXG4gICAgICAgIDxkaXYgaWQ9XFxcInJlY29yZGVyLWZ1bGxcXFwiIGNsYXNzPVxcXCJtLXJlY29yZGluZy1zY3JlZW4gZmFjZVxcXCI+XFxuICAgICAgICAgICAgPGRpdiB0aXRsZT1cXFwidG9nZ2xlIHJlY29yZGluZ1xcXCIgY2xhc3M9XFxcInJlY29yZGluZy10b2dnbGVcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1taWNyb3Bob25lXFxcIj48L2k+PC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwicmVjb3JkaW5nLXRpbWVcXFwiPjM8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBpZD1cXFwicmVjb3JkZXItdXBsb2FkZXJcXFwiIGNsYXNzPVxcXCJtLXJlY29yZGluZy11cGxvYWRpbmcgZmFjZSBkaXNhYmxlZFxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwidXBsb2FkLXByb2dyZXNzXFxcIj5cXG4gICAgICAgICAgICAgICAgPGg0PlVwbG9hZGluZzwvaDQ+XFxuXFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcInByb2dyZXNzLWJhclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYXJcXFwiPjwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBpZD1cXFwicmVjb3JkZXItZG9uZVxcXCIgY2xhc3M9XFxcIm0tcmVjb3JkaW5nLXByZXZpZXcgZmFjZSBiYWNrXFxcIj5cXG4gICAgICAgICAgICA8aDE+UG9zdCBOZXcgUmVjb3JkaW5nPC9oMT5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGF0c1xcXCI+XFxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1wbGF5LWNpcmNsZVxcXCI+PC9pPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwiZHVyYXRpb25cXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJkZXNjcmlwdGlvblxcXCI+XFxuICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSBuYW1lPVxcXCJkZXNjcmlwdGlvblxcXCIgcGxhY2Vob2xkZXI9XFxcIm9wdGlvbmFsIGRlc2NyaXB0aW9uXFxcIj48L3RleHRhcmVhPlxcbiAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImNvbnRyb2xzXFxcIj5cXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XFxcInNxdWFyZS1idG4gYnRuLXByaW1hcnlcXFwiIGlkPVxcXCJ1cGxvYWQtcmVjb3JkaW5nXFxcIj5VcGxvYWQ8L2E+XFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJzcXVhcmUtYnRuIGJ0bi1kZWZhdWx0XFxcIiBpZD1cXFwicHJldmlldy1idG5cXFwiPlByZXZpZXc8L2E+XFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJzcXVhcmUtYnRuIGJ0bi1saW5rXFxcIiBpZD1cXFwiY2FuY2VsLXJlY29yZGluZ1xcXCI+RGVsZXRlIGFuZCBUcnkgQWdhaW48L2E+XFxuICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8L2Rpdj5cXG5cXG4gICAgPC9kaXY+XFxuXFxuPC9kaXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5pbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi9SZWNvcmRlclZpZXcuaGJzJ1xuXG5pbXBvcnQgUXVpcFZpZXcgZnJvbSAnLi4vLi4vcGFydGlhbHMvUXVpcFZpZXcuanMnXG5pbXBvcnQgeyBBdWRpb0NhcHR1cmUgfSBmcm9tICcuLi8uLi9hdWRpby1jYXB0dXJlJ1xuaW1wb3J0IHsgQ3JlYXRlUmVjb3JkaW5nTW9kZWwgfSBmcm9tICcuLi8uLi9tb2RlbHMvQ3JlYXRlUmVjb3JkaW5nTW9kZWwnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlY29yZGVyVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIC8vICAgIGVsOiAnLm0tcmVjb3JkaW5nLWNvbnRhaW5lcicsXG5cbiAgICBJbnRUb1RpbWUodmFsdWUpIHtcbiAgICAgICAgdmFyIG1pbnV0ZXMgPSBNYXRoLmZsb29yKHZhbHVlIC8gNjApO1xuICAgICAgICB2YXIgc2Vjb25kcyA9IE1hdGgucm91bmQodmFsdWUgLSBtaW51dGVzICogNjApO1xuXG4gICAgICAgIHJldHVybiAoXCIwMFwiICsgbWludXRlcykuc3Vic3RyKC0yKSArIFwiOlwiICsgKFwiMDBcIiArIHNlY29uZHMpLnN1YnN0cigtMik7XG4gICAgfVxuXG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhdWRpb0NhcHR1cmU6IG51bGwsXG4gICAgICAgICAgICBhdWRpb0Jsb2I6IG51bGwsXG4gICAgICAgICAgICBhdWRpb0Jsb2JVcmw6IG51bGwsXG4gICAgICAgICAgICBhdWRpb1BsYXllcjogbnVsbCxcbiAgICAgICAgICAgIGlzUmVjb3JkaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHRpbWVySWQ6IDAsXG4gICAgICAgICAgICB0aW1lclN0YXJ0OiAzXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBldmVudHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBcImNsaWNrIC5yZWNvcmRpbmctdG9nZ2xlXCI6IFwidG9nZ2xlXCIsXG4gICAgICAgICAgICBcImNsaWNrICNjYW5jZWwtcmVjb3JkaW5nXCI6IFwiY2FuY2VsUmVjb3JkaW5nXCIsXG4gICAgICAgICAgICBcImNsaWNrICN1cGxvYWQtcmVjb3JkaW5nXCI6IFwidXBsb2FkUmVjb3JkaW5nXCIsXG4gICAgICAgICAgICBcImNsaWNrICNwcmV2aWV3LWJ0blwiOiBcInBsYXlQcmV2aWV3XCJcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0ZW1wbGF0ZSh0aGlzLm1vZGVsLnRvSlNPTigpKSk7XG4gICAgfVxuXG4gICAgYnVpbGQobW9kZWwpIHtcbiAgICAgICAgdGhpcy5tb2RlbCA9IG1vZGVsO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwibW9kZWxcIiwgbW9kZWwpO1xuXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAgICAgdGhpcy5hdWRpb1BsYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVjb3JkZWQtcHJldmlld1wiKTtcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9QbGF5ZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImNhbiBwbGF5IHZvcmJpczogXCIsICEhdGhpcy5hdWRpb1BsYXllci5jYW5QbGF5VHlwZSAmJiBcIlwiICE9IHRoaXMuYXVkaW9QbGF5ZXIuY2FuUGxheVR5cGUoJ2F1ZGlvL29nZzsgY29kZWNzPVwidm9yYmlzXCInKSk7XG5cbiAgICAgICAgLy8gcGxheSBhIGJlZXBcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIi9hc3NldHMvc291bmRzL2JlZXBfc2hvcnRfb24ub2dnXCI7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIHRoaXMubW9kZWwub24oJ2NoYW5nZTpyZWNvcmRpbmdUaW1lJywgZnVuY3Rpb24gKG1vZGVsLCB0aW1lKSB7XG4gICAgICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLnRleHQodGltZSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZShtaWNyb3Bob25lTWVkaWFTdHJlYW0pIHtcbiAgICAgICAgdGhpcy5hdWRpb0NhcHR1cmUgPSBuZXcgQXVkaW9DYXB0dXJlKG1pY3JvcGhvbmVNZWRpYVN0cmVhbSk7XG5cbiAgICAgICAgbmV3IENyZWF0ZVJlY29yZGluZ01vZGVsKCkuZmV0Y2goKVxuICAgICAgICAgICAgLnRoZW4obW9kZWwgPT4gdGhpcy5idWlsZChuZXcgQ3JlYXRlUmVjb3JkaW5nTW9kZWwobW9kZWwpKSk7XG5cbiAgICAgICAgLy8gVE9ETzogdHJ5IHVzaW5nIHRoZSBuZXcgZmV0Y2goKSBzeW50YXggaW5zdGVhZCBvZiBiYWNrYm9uZSBtb2RlbHNcbiAgICAgICAgLy9mZXRjaChcIi9hcGkvY3JlYXRlX3JlY29yZGluZ1wiLCB7Y3JlZGVudGlhbHM6ICdpbmNsdWRlJ30pXG4gICAgICAgIC8vICAgIC50aGVuKHJlcyA9PiByZXMuanNvbigpKVxuICAgICAgICAvLyAgICAudGhlbihqc29uID0+IHRoaXMuc3dpdGNoVmlldyhuZXcgUmVjb3JkZXJWaWV3KGpzb24pKSk7XG4gICAgfVxuXG4gICAgdG9nZ2xlKGV2ZW50KSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnN0b3BSZWNvcmRpbmcoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zdGFydFJlY29yZGluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2FuY2VsUmVjb3JkaW5nKGV2ZW50KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IGNhbmNlbGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItZnVsbFwiKS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpO1xuICAgICAgICAkKFwiI3JlY29yZGVyLXVwbG9hZGVyXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLnJlbW92ZUNsYXNzKFwiZmxpcHBlZFwiKTtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCgncmVjb3JkaW5nVGltZScsIDMpO1xuICAgIH1cblxuICAgIHVwbG9hZFJlY29yZGluZyhldmVudCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyB1cGxvYWRpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiXCI7XG5cbiAgICAgICAgJChcIiNyZWNvcmRlci1mdWxsXCIpLmFkZENsYXNzKFwiZGlzYWJsZWRcIik7XG4gICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikucmVtb3ZlQ2xhc3MoXCJkaXNhYmxlZFwiKTtcbiAgICAgICAgJChcIi5tLXJlY29yZGluZy1jb250YWluZXJcIikucmVtb3ZlQ2xhc3MoXCJmbGlwcGVkXCIpO1xuXG4gICAgICAgIHZhciBkZXNjcmlwdGlvbiA9ICQoJ3RleHRhcmVhW25hbWU9ZGVzY3JpcHRpb25dJylbMF0udmFsdWU7XG5cbiAgICAgICAgdmFyIGRhdGEgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2Rlc2NyaXB0aW9uJywgZGVzY3JpcHRpb24pO1xuICAgICAgICBkYXRhLmFwcGVuZCgnaXNQdWJsaWMnLCAxKTtcbiAgICAgICAgZGF0YS5hcHBlbmQoJ2F1ZGlvLWJsb2InLCB0aGlzLmF1ZGlvQmxvYik7XG5cbiAgICAgICAgLy8gc2VuZCByYXcgYmxvYiBhbmQgbWV0YWRhdGFcblxuICAgICAgICAvLyBUT0RPOiBnZXQgYSByZXBsYWNlbWVudCBhamF4IGxpYnJhcnkgKG1heWJlIHBhdGNoIHJlcXdlc3QgdG8gc3VwcG9ydCBiaW5hcnk/KVxuICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHhoci5vcGVuKCdwb3N0JywgJy9hcGkvcXVpcHMnLCB0cnVlKTtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgIHhoci51cGxvYWQub25wcm9ncmVzcyA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB2YXIgcGVyY2VudCA9ICgoZS5sb2FkZWQgLyBlLnRvdGFsKSAqIDEwMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicGVyY2VudGFnZTogXCIgKyBwZXJjZW50KTtcbiAgICAgICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikuZmluZChcIi5iYXJcIikuY3NzKCd3aWR0aCcsIHBlcmNlbnQpO1xuICAgICAgICB9O1xuICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICQoXCIjcmVjb3JkZXItdXBsb2FkZXJcIikuZmluZChcIi5iYXJcIikuY3NzKCd3aWR0aCcsICcxMDAlJyk7XG4gICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBtYW51YWwgeGhyIHN1Y2Nlc3NmdWxcIik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IG1hbnVhbCB4aHIgZXJyb3JcIiwgeGhyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInhoci5yZXNwb25zZVwiLCB4aHIucmVzcG9uc2UpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZXN1bHRcIiwgcmVzdWx0KTtcblxuICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgPT0gXCJzdWNjZXNzXCIpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlc3VsdC51cmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhoci5zZW5kKGRhdGEpO1xuICAgIH1cblxuICAgIG9uUmVjb3JkaW5nVGljaygpIHtcbiAgICAgICAgdmFyIHRpbWVTcGFuID0gcGFyc2VJbnQoKChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHRoaXMudGltZXJTdGFydCkgLyAxMDAwKS50b0ZpeGVkKCkpO1xuICAgICAgICB2YXIgdGltZVN0ciA9IHRoaXMuSW50VG9UaW1lKHRpbWVTcGFuKTtcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aW1lU3RyKTtcbiAgICB9XG5cbiAgICBzdGFydFJlY29yZGluZygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJzdGFydGluZyByZWNvcmRpbmdcIik7XG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlLnN0YXJ0KCgpID0+IHRoaXMub25SZWNvcmRpbmdTdGFydGVkKCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1pY3JvcGhvbmUgaXMgcmVhZHkgdG8gcmVjb3JkLiBEbyBhIGNvdW50LWRvd24sIHRoZW4gc2lnbmFsIGZvciBpbnB1dC1zaWduYWwgdG8gYmVnaW4gcmVjb3JkaW5nXG4gICAgICovXG4gICAgb25SZWNvcmRpbmdTdGFydGVkKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIm1pYyByZWFkeSB0byByZWNvcmQuIGRvIGNvdW50ZG93bi5cIik7XG5cbiAgICAgICAgLy8gb3IgbGF1bmNoIGNhcHR1cmUgaW1tZWRpYXRlbHlcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoJ3JlY29yZGluZ1RpbWUnLCB0aGlzLkludFRvVGltZSgwKSk7XG4gICAgICAgIHRoaXMub25NaWNSZWNvcmRpbmcoKTtcblxuICAgICAgICAkKFwiLnJlY29yZGluZy10aW1lXCIpLmFkZENsYXNzKFwiaXMtdmlzaWJsZVwiKTtcbiAgICB9XG5cbiAgICBvbk1pY1JlY29yZGluZygpIHtcbiAgICAgICAgdGhpcy50aW1lclN0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIHRoaXMudGltZXJJZCA9IHNldEludGVydmFsKHRoaXMub25SZWNvcmRpbmdUaWNrLmJpbmQodGhpcyksIDEwMDApO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLXNjcmVlblwiKS5hZGRDbGFzcyhcImlzLXJlY29yZGluZ1wiKTtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIk1pYyByZWNvcmRpbmcgc3RhcnRlZFwiKTtcblxuICAgICAgICAvLyBUT0RPOiB0aGUgbWljIGNhcHR1cmUgaXMgYWxyZWFkeSBhY3RpdmUsIHNvIGF1ZGlvIGJ1ZmZlcnMgYXJlIGdldHRpbmcgYnVpbHQgdXBcbiAgICAgICAgLy8gd2hlbiB0b2dnbGluZyB0aGlzIG9uLCB3ZSBtYXkgYWxyZWFkeSBiZSBjYXB0dXJpbmcgYSBidWZmZXIgdGhhdCBoYXMgYXVkaW8gcHJpb3IgdG8gdGhlIGNvdW50ZG93blxuICAgICAgICAvLyBoaXR0aW5nIHplcm8uIHdlIGNhbiBkbyBhIGZldyB0aGluZ3MgaGVyZTpcbiAgICAgICAgLy8gMSkgZmlndXJlIG91dCBob3cgbXVjaCBhdWRpbyB3YXMgYWxyZWFkeSBjYXB0dXJlZCwgYW5kIGN1dCBpdCBvdXRcbiAgICAgICAgLy8gMikgdXNlIGEgZmFkZS1pbiB0byBjb3ZlciB1cCB0aGF0IHNwbGl0LXNlY29uZCBvZiBhdWRpb1xuICAgICAgICAvLyAzKSBhbGxvdyB0aGUgdXNlciB0byBlZGl0IHBvc3QtcmVjb3JkIGFuZCBjbGlwIGFzIHRoZXkgd2lzaCAoYmV0dGVyIGJ1dCBtb3JlIGNvbXBsZXggb3B0aW9uISlcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmF1ZGlvQ2FwdHVyZS50b2dnbGVNaWNyb3Bob25lUmVjb3JkaW5nKHRydWUpLCAyMDApO1xuICAgIH1cblxuICAgIHN0b3BSZWNvcmRpbmcoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic3RvcHBpbmcgcmVjb3JkaW5nXCIpO1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXJJZCk7XG5cbiAgICAgICAgLy8gcGxheSBzb3VuZCBpbW1lZGlhdGVseSB0byBieXBhc3MgbW9iaWxlIGNocm9tZSdzIFwidXNlciBpbml0aWF0ZWQgbWVkaWFcIiByZXF1aXJlbWVudFxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IFwiL2Fzc2V0cy9zb3VuZHMvYmVlcF9zaG9ydF9vZmYub2dnXCI7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIC8vIHJlcXVlc3QgcmVjb3JkaW5nIHN0b3BcbiAgICAgICAgLy8gd2FpdCBmb3Igc3luYyB0byBjb21wbGV0ZVxuICAgICAgICAvLyBhbmQgdGhlbiBjYWxsYmFjayB0cmFuc2l0aW9uIHRvIG5leHQgc2NyZWVuXG4gICAgICAgIHRoaXMuYXVkaW9DYXB0dXJlLnN0b3AoKGJsb2IpID0+IHRoaXMub25SZWNvcmRpbmdDb21wbGV0ZWQoYmxvYikpO1xuXG4gICAgICAgICQoXCIucmVjb3JkaW5nLXRpbWVcIikucmVtb3ZlQ2xhc3MoXCJpcy12aXNpYmxlXCIpO1xuICAgICAgICAkKFwiLm0tcmVjb3JkaW5nLXNjcmVlblwiKS5yZW1vdmVDbGFzcyhcImlzLXJlY29yZGluZ1wiKTtcbiAgICB9XG5cbiAgICBvblJlY29yZGluZ0NvbXBsZXRlZChibG9iKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVjb3JkZXI6Om9uUmVjb3JkaW5nQ29tcGxldGVkKCk7IHByZXZpZXdpbmcgcmVjb3JkZWQgYXVkaW9cIik7XG4gICAgICAgIHRoaXMuYXVkaW9CbG9iID0gYmxvYjtcbiAgICAgICAgdGhpcy5zaG93Q29tcGxldGlvblNjcmVlbigpO1xuICAgIH1cblxuICAgIHBsYXlQcmV2aWV3KCkge1xuICAgICAgICAvLyBhdCB0aGlzIHBvaW50IGEgcGxheWFibGUgYXVkaW8gYmxvYiBzaG91bGQgYWxyZWFkeSBiZSBsb2FkZWQgaW4gYXVkaW9QbGF5ZXJcbiAgICAgICAgLy8gc28ganVzdCBwbGF5IGl0IGFnYWluXG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuICAgIH1cblxuICAgIHNob3dDb21wbGV0aW9uU2NyZWVuKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29yZGVyOjpvblJlY29yZGluZ0NvbXBsZXRlZCgpOyBmbGlwcGluZyB0byBhdWRpbyBwbGF5YmFja1wiKTtcbiAgICAgICAgdGhpcy5hdWRpb0Jsb2JVcmwgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTCh0aGlzLmF1ZGlvQmxvYik7XG4gICAgICAgICQoXCIubS1yZWNvcmRpbmctY29udGFpbmVyXCIpLmFkZENsYXNzKFwiZmxpcHBlZFwiKTtcblxuICAgICAgICB0aGlzLm1ha2VBdWRpb0Jsb2JVcmxQbGF5YWJsZSh0aGlzLmF1ZGlvQmxvYlVybCwgKHBsYXlhYmxlQXVkaW9CbG9iVXJsKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHBsYXlhYmxlQXVkaW9CbG9iVXJsO1xuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEhBQ0s6IHJvdXRlIGJsb2IgdGhyb3VnaCB4aHIgdG8gbGV0IEFuZHJvaWQgQ2hyb21lIHBsYXkgYmxvYnMgdmlhIDxhdWRpbz5cbiAgICAgKiBAcGFyYW0gYXVkaW9CbG9iVXJsIHJlcHJlc2VudGluZyBwb3RlbnRpYWxseSBub24tZGlzay1iYWNrZWQgYmxvYiB1cmxcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2sgZnVuY3Rpb24gYWNjZXB0cyBhIGRpc2stYmFja2VkIGJsb2IgdXJsXG4gICAgICovXG4gICAgbWFrZUF1ZGlvQmxvYlVybFBsYXlhYmxlKGF1ZGlvQmxvYlVybCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gdGhpcyByZXF1ZXN0IGhhcHBlbnMgb3ZlciBsb29wYmFja1xuICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHhoci5vcGVuKCdHRVQnLCBhdWRpb0Jsb2JVcmwsIHRydWUpO1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InO1xuICAgICAgICB4aHIub3ZlcnJpZGVNaW1lVHlwZSgnYXVkaW8vb2dnJyk7XG5cbiAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gNCAmJiB4aHIuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgICAgICAgIHZhciB4aHJCbG9iVXJsID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoeGhyLnJlc3BvbnNlKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGVkIGJsb2IgZnJvbSBjYWNoZSB1cmw6IFwiICsgYXVkaW9CbG9iVXJsKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJvdXRlZCBpbnRvIGJsb2IgdXJsOiBcIiArIHhockJsb2JVcmwpO1xuXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soeGhyQmxvYlVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhoci5zZW5kKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IEJhY2tib25lIGZyb20gJ2JhY2tib25lJ1xuaW1wb3J0ICogYXMgVmlld3MgZnJvbSAnLi4vVmlld3MnXG5pbXBvcnQgeyBRdWlwTW9kZWwsIE15UXVpcENvbGxlY3Rpb24gfSBmcm9tICcuLi8uLi9tb2RlbHMvUXVpcCdcblxuY2xhc3MgVXNlclBvZENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uIHtcbiAgICBjb25zdHJ1Y3Rvcih1c2VybmFtZSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLm1vZGVsID0gUXVpcE1vZGVsO1xuICAgICAgICB0aGlzLnVzZXJuYW1lID0gdXNlcm5hbWU7XG4gICAgfVxuXG4gICAgdXJsKCkge1xuICAgICAgICByZXR1cm4gXCIvYXBpL3UvXCIgKyB0aGlzLnVzZXJuYW1lICsgXCIvcXVpcHNcIjtcbiAgICB9XG59XG5cbmNsYXNzIFVzZXJQb2RDb2xsZWN0aW9uVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcge1xuICAgIGNvbnN0cnVjdG9yKHVzZXJuYW1lKSB7XG4gICAgICAgIHN1cGVyKHVzZXJuYW1lKTtcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKHVzZXJuYW1lKSB7XG4gICAgICAgIG5ldyBVc2VyUG9kQ29sbGVjdGlvbih1c2VybmFtZSlcbiAgICAgICAgICAgIC5mZXRjaCgpXG4gICAgICAgICAgICAudGhlbihxdWlwcyA9PiB0aGlzLmNyZWF0ZUNoaWxkVmlld3MocXVpcHMpKVxuICAgIH1cblxuICAgIHNodXRkb3duKCkge1xuICAgICAgICBBdWRpb1BsYXllci5wYXVzZSgpO1xuICAgICAgICB0aGlzLmRlc3Ryb3lDaGlsZFZpZXdzKCk7XG4gICAgfVxuXG4gICAgY3JlYXRlQ2hpbGRWaWV3cyhxdWlwcykge1xuICAgICAgICB0aGlzLnF1aXBWaWV3cyA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIHF1aXAgb2YgcXVpcHMpIHtcbiAgICAgICAgICAgIHZhciBxdWlwVmlldyA9IG5ldyBWaWV3cy5RdWlwVmlldyh7bW9kZWw6IG5ldyBRdWlwTW9kZWwocXVpcCl9KTtcbiAgICAgICAgICAgIHRoaXMucXVpcFZpZXdzLnB1c2gocXVpcFZpZXcpO1xuICAgICAgICAgICAgdGhpcy4kZWwuYXBwZW5kKHF1aXBWaWV3LmVsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRlc3Ryb3lDaGlsZFZpZXdzKCkge1xuICAgICAgICBpZiAodGhpcy5xdWlwVmlld3MgIT0gbnVsbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgcXVpcCBvZiB0aGlzLnF1aXBWaWV3cykge1xuICAgICAgICAgICAgICAgIHF1aXAuc2h1dGRvd24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZXhwb3J0IHsgVXNlclBvZENvbGxlY3Rpb24sIFVzZXJQb2RDb2xsZWN0aW9uVmlldyB9XG5cbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCAqIGFzIFZpZXdzIGZyb20gJy4uL1ZpZXdzJ1xuaW1wb3J0IHsgUXVpcE1vZGVsIH0gZnJvbSAnLi4vLi4vbW9kZWxzL1F1aXAnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFVzZXJQb2RWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgaW5pdGlhbGl6ZShxdWlwSWQpIHtcbiAgICAgICAgbmV3IFF1aXBNb2RlbCh7aWQ6IHF1aXBJZH0pXG4gICAgICAgICAgICAuZmV0Y2goKVxuICAgICAgICAgICAgLnRoZW4ocXVpcCA9PiB0aGlzLmNyZWF0ZUNoaWxkVmlld3MocXVpcCkpXG4gICAgfVxuXG4gICAgc2h1dGRvd24oKSB7XG4gICAgICAgIEF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICAgIHRoaXMuZGVzdHJveUNoaWxkVmlld3MoKTtcbiAgICB9XG5cbiAgICBjcmVhdGVDaGlsZFZpZXdzKHF1aXApIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJsb2FkZWQgc2luZ2xlIHBvZFwiLCBxdWlwKTtcblxuICAgICAgICB0aGlzLnF1aXBWaWV3ID0gbmV3IFZpZXdzLlF1aXBWaWV3KHttb2RlbDogbmV3IFF1aXBNb2RlbChxdWlwKX0pO1xuICAgICAgICB0aGlzLiRlbC5hcHBlbmQodGhpcy5xdWlwVmlldy5lbCk7XG4gICAgfVxuXG4gICAgZGVzdHJveUNoaWxkVmlld3MoKSB7XG4gICAgICAgIHRoaXMucXVpcFZpZXcuc2h1dGRvd24oKTtcbiAgICB9XG59XG5cbmV4cG9ydCB7IFVzZXJQb2RWaWV3IH1cblxuIiwiaW1wb3J0IENoYW5nZWxvZ1ZpZXcgZnJvbSAnLi9DaGFuZ2Vsb2cvQ2hhbmdlbG9nVmlldydcbmltcG9ydCBIb21lcGFnZVZpZXcgZnJvbSAnLi9Ib21lcGFnZS9Ib21lcGFnZVZpZXcnXG5pbXBvcnQgUmVjb3JkZXJWaWV3IGZyb20gJy4vUmVjb3JkZXIvUmVjb3JkZXJWaWV3J1xuaW1wb3J0IEdldE1pY3JvcGhvbmVWaWV3IGZyb20gJy4vR2V0TWljcm9waG9uZS9HZXRNaWNyb3Bob25lVmlldydcbmltcG9ydCBVc2VyUG9kVmlldyBmcm9tICcuL1VzZXIvVXNlclNpbmdsZVJlY29yZGluZ1ZpZXcnXG5pbXBvcnQgSGVhZGVyTmF2VmlldyBmcm9tICcuLi9wYXJ0aWFscy9IZWFkZXJOYXZWaWV3J1xuaW1wb3J0IFF1aXBWaWV3IGZyb20gJy4uL3BhcnRpYWxzL1F1aXBWaWV3J1xuaW1wb3J0IHsgVXNlclBvZENvbGxlY3Rpb24sIFVzZXJQb2RDb2xsZWN0aW9uVmlldyB9IGZyb20gJy4vVXNlci9Vc2VyQWxsUmVjb3JkaW5nc1ZpZXcnXG5pbXBvcnQgeyBTb3VuZFBsYXllciwgQXVkaW9QbGF5ZXJWaWV3LCBBdWRpb1BsYXllckV2ZW50cyB9IGZyb20gJy4uL3BhcnRpYWxzL0F1ZGlvUGxheWVyVmlldydcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnXG5cbmNsYXNzIEF1ZGlvUGxheWVyRXZlbnRzIGV4dGVuZHMgQmFja2JvbmUuTW9kZWwge1xuICAgIHBhdXNlKCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoXCJwYXVzZVwiKTtcbiAgICB9XG59XG5cbmV4cG9ydCBsZXQgQXVkaW9QbGF5ZXIgPSBuZXcgQXVkaW9QbGF5ZXJFdmVudHMoKTtcblxuY2xhc3MgQXVkaW9QbGF5ZXJWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhdWRpb1BsYXllcjogbnVsbCxcbiAgICAgICAgICAgIHF1aXBNb2RlbDogbnVsbFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJBdWRpb1BsYXllclZpZXcgaW5pdGlhbGl6ZWRcIik7XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImF1ZGlvLXBsYXllclwiKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCJ0b2dnbGVcIiwgKHF1aXApID0+IHRoaXMub25Ub2dnbGUocXVpcCksIHRoaXMpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcInBhdXNlXCIsIChxdWlwKSA9PiB0aGlzLnBhdXNlKHF1aXApLCB0aGlzKTtcblxuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLm9ucGF1c2UgPSAoKSA9PiB0aGlzLm9uQXVkaW9QYXVzZWQoKTtcbiAgICB9XG5cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgdGhpcy5zdG9wUGVyaW9kaWNUaW1lcigpO1xuICAgIH1cblxuICAgIHN0YXJ0UGVyaW9kaWNUaW1lcigpIHtcbiAgICAgICAgaWYodGhpcy5wZXJpb2RpY1RpbWVyID09IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMucGVyaW9kaWNUaW1lciA9IHNldEludGVydmFsKCgpID0+IHRoaXMuY2hlY2tQcm9ncmVzcygpLCAxMDApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RvcFBlcmlvZGljVGltZXIoKSB7XG4gICAgICAgIGlmKHRoaXMucGVyaW9kaWNUaW1lciAhPSBudWxsKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMucGVyaW9kaWNUaW1lcik7XG4gICAgICAgICAgICB0aGlzLnBlcmlvZGljVGltZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2hlY2tQcm9ncmVzcygpIHtcbiAgICAgICAgaWYodGhpcy5xdWlwTW9kZWwgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHByb2dyZXNzVXBkYXRlID0ge1xuICAgICAgICAgICAgcG9zaXRpb246IHRoaXMuYXVkaW9QbGF5ZXIuY3VycmVudFRpbWUsIC8vIHNlY1xuICAgICAgICAgICAgZHVyYXRpb246IHRoaXMuYXVkaW9QbGF5ZXIuZHVyYXRpb24sIC8vIHNlY1xuICAgICAgICAgICAgcHJvZ3Jlc3M6IDEwMCAqIHRoaXMuYXVkaW9QbGF5ZXIuY3VycmVudFRpbWUgLyB0aGlzLmF1ZGlvUGxheWVyLmR1cmF0aW9uIC8vICVcbiAgICAgICAgfVxuXG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCIvXCIgKyB0aGlzLnF1aXBNb2RlbC5pZCArIFwiL3Byb2dyZXNzXCIsIHByb2dyZXNzVXBkYXRlKTtcbiAgICB9XG5cbiAgICBvblRvZ2dsZShxdWlwTW9kZWwpIHtcbiAgICAgICAgdGhpcy5xdWlwTW9kZWwgPSBxdWlwTW9kZWw7XG5cbiAgICAgICAgaWYoIXRoaXMudHJhY2tJc0xvYWRlZChxdWlwTW9kZWwudXJsKSkge1xuICAgICAgICAgICAgdGhpcy5sb2FkVHJhY2socXVpcE1vZGVsLnVybCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZighdGhpcy50cmFja0lzTG9hZGVkKHF1aXBNb2RlbC51cmwpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLmF1ZGlvUGxheWVyLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5wbGF5KHF1aXBNb2RlbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnBhdXNlKHF1aXBNb2RlbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwbGF5KHF1aXBNb2RlbCkge1xuICAgICAgICAvLyBpZiBhdCB0aGUgZW5kIG9mIGZpbGUgKDIwMG1zIGZ1ZGdlKSwgcmV3aW5kXG4gICAgICAgIGlmKHBhcnNlRmxvYXQocXVpcE1vZGVsLnBvc2l0aW9uKSA+IChwYXJzZUZsb2F0KHF1aXBNb2RlbC5kdXJhdGlvbikgLSAwLjIpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJld2luZGluZyBhdWRpbyBjbGlwOyBxdWlwTW9kZWwucG9zaXRpb249XCIgKyBxdWlwTW9kZWwucG9zaXRpb25cbiAgICAgICAgICAgICAgICArIFwiIHF1aXBNb2RlbC5kdXJhdGlvbj1cIiArIHF1aXBNb2RlbC5kdXJhdGlvbik7XG4gICAgICAgICAgICBxdWlwTW9kZWwucG9zaXRpb24gPSAwO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuY3VycmVudFRpbWUgPSBxdWlwTW9kZWwucG9zaXRpb247XG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGxheSgpO1xuXG4gICAgICAgIEF1ZGlvUGxheWVyLnRyaWdnZXIoXCIvXCIgKyBxdWlwTW9kZWwuaWQgKyBcIi9wbGF5aW5nXCIpO1xuICAgICAgICB0aGlzLnN0YXJ0UGVyaW9kaWNUaW1lcigpO1xuICAgIH1cblxuICAgIHBhdXNlKHF1aXBNb2RlbCkge1xuICAgICAgICAvLyByZXF1ZXN0IHBhdXNlXG4gICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGF1c2UoKTtcbiAgICB9XG5cbiAgICB0cmFja0lzTG9hZGVkKHVybCkge1xuICAgICAgICByZXR1cm4gfnRoaXMuYXVkaW9QbGF5ZXIuc3JjLmluZGV4T2YodXJsKTtcbiAgICB9XG5cbiAgICBsb2FkVHJhY2sodXJsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGluZyBhdWRpbzogXCIgKyB1cmwpO1xuICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IHVybDtcbiAgICAgICAgdGhpcy5hdWRpb1BsYXllci5sb2FkKCk7XG4gICAgfVxuXG4gICAgLyogQXVkaW8gZWxlbWVudCByZXBvcnRzIHBhdXNlIHRyaWdnZXJlZCwgdHJlYXRpbmcgYXMgZW5kIG9mIGZpbGUgKi9cbiAgICBvbkF1ZGlvUGF1c2VkKCkge1xuICAgICAgICB0aGlzLmNoZWNrUHJvZ3Jlc3MoKTtcbiAgICAgICAgaWYodGhpcy5xdWlwTW9kZWwgIT0gbnVsbCkge1xuICAgICAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcIi9cIiArIHRoaXMucXVpcE1vZGVsLmlkICsgXCIvcGF1c2VkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RvcFBlcmlvZGljVGltZXIoKTtcbiAgICB9XG59XG5cbmNsYXNzIFNvdW5kUGxheWVyIHtcbiAgICBzdGF0aWMgY3JlYXRlIChtb2RlbCkge1xuICAgICAgICB2YXIgcmVzdW1lUG9zaXRpb24gPSBwYXJzZUludChtb2RlbC5nZXQoJ3Bvc2l0aW9uJykgfHwgMCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBzb3VuZCBwbGF5ZXIgZm9yIG1vZGVsOlwiLCBtb2RlbCk7XG5cbiAgICAgICAgcmV0dXJuIHNvdW5kTWFuYWdlci5jcmVhdGVTb3VuZCh7XG4gICAgICAgICAgICBpZDogbW9kZWwuaWQsXG4gICAgICAgICAgICB1cmw6IG1vZGVsLnVybCxcbiAgICAgICAgICAgIHZvbHVtZTogMTAwLFxuICAgICAgICAgICAgYXV0b0xvYWQ6IHRydWUsXG4gICAgICAgICAgICBhdXRvUGxheTogZmFsc2UsXG4gICAgICAgICAgICBmcm9tOiByZXN1bWVQb3NpdGlvbixcbiAgICAgICAgICAgIHdoaWxlbG9hZGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibG9hZGVkOiBcIiArIHRoaXMuYnl0ZXNMb2FkZWQgKyBcIiBvZiBcIiArIHRoaXMuYnl0ZXNUb3RhbCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25sb2FkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NvdW5kOyBhdWRpbyBsb2FkZWQ7IHBvc2l0aW9uID0gJyArIHJlc3VtZVBvc2l0aW9uICsgJywgZHVyYXRpb24gPSAnICsgdGhpcy5kdXJhdGlvbik7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiA9PSBudWxsIHx8IHRoaXMuZHVyYXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImR1cmF0aW9uIGlzIG51bGxcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoKHJlc3VtZVBvc2l0aW9uICsgMTApID4gdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyB0aGUgdHJhY2sgaXMgcHJldHR5IG11Y2ggY29tcGxldGUsIGxvb3AgaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IHRoaXMgc2hvdWxkIGFjdHVhbGx5IGhhcHBlbiBlYXJsaWVyLCB3ZSBzaG91bGQga25vdyB0aGF0IHRoZSBhY3Rpb24gd2lsbCBjYXVzZSBhIHJld2luZFxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgYW5kIGluZGljYXRlIHRoZSByZXdpbmQgdmlzdWFsbHkgc28gdGhlcmUgaXMgbm8gc3VycHJpc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzdW1lUG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU291bmQ7IHRyYWNrIG5lZWRlZCBhIHJld2luZCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiByZXN1bWUgY29tcGF0aWJpbGl0eSB3aXRoIHZhcmlvdXMgYnJvd3NlcnNcbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogc29tZXRpbWVzIHlvdSByZXN1bWUgYSBmaWxlIGFsbCB0aGUgd2F5IGF0IHRoZSBlbmQsIHNob3VsZCBsb29wIHRoZW0gYXJvdW5kXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRQb3NpdGlvbihyZXN1bWVQb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgd2hpbGVwbGF5aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb2dyZXNzID0gKHRoaXMuZHVyYXRpb24gPiAwID8gMTAwICogdGhpcy5wb3NpdGlvbiAvIHRoaXMuZHVyYXRpb24gOiAwKS50b0ZpeGVkKDApICsgJyUnO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCBwcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJxdWlwOlwiICsgdGhpcy5pZCArIFwiOnBvc2l0aW9uXCIsIHRoaXMucG9zaXRpb24udG9GaXhlZCgwKSk7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc30pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9ucGF1c2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlNvdW5kOyBwYXVzZWQ6IFwiICsgdGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgdmFyIHBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbiA/IHRoaXMucG9zaXRpb24udG9GaXhlZCgwKSA6IDA7XG4gICAgICAgICAgICAgICAgdmFyIHByb2dyZXNzID0gKHRoaXMuZHVyYXRpb24gPiAwID8gMTAwICogcG9zaXRpb24gLyB0aGlzLmR1cmF0aW9uIDogMCkudG9GaXhlZCgwKSArICclJztcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInF1aXA6XCIgKyB0aGlzLmlkICsgXCI6cHJvZ3Jlc3NcIiwgcHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwb3NpdGlvblwiLCBwb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KHsncHJvZ3Jlc3MnOiBwcm9ncmVzc30pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uZmluaXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTb3VuZDsgZmluaXNoZWQgcGxheWluZzogXCIgKyB0aGlzLmlkKTtcblxuICAgICAgICAgICAgICAgIC8vIHN0b3JlIGNvbXBsZXRpb24gaW4gYnJvd3NlclxuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwcm9ncmVzc1wiLCAnMTAwJScpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicXVpcDpcIiArIHRoaXMuaWQgKyBcIjpwb3NpdGlvblwiLCB0aGlzLmR1cmF0aW9uLnRvRml4ZWQoMCkpO1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCh7J3Byb2dyZXNzJzogJzEwMCUnfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB1bmxvY2sgc29tZSBzb3J0IG9mIGFjaGlldmVtZW50IGZvciBmaW5pc2hpbmcgdGhpcyB0cmFjaywgbWFyayBpdCBhIGRpZmYgY29sb3IsIGV0Y1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IHRoaXMgaXMgYSBnb29kIHBsYWNlIHRvIGZpcmUgYSBob29rIHRvIGEgcGxheWJhY2sgbWFuYWdlciB0byBtb3ZlIG9udG8gdGhlIG5leHQgYXVkaW8gY2xpcFxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH1cbn1cblxuZXhwb3J0IHsgU291bmRQbGF5ZXIsIEF1ZGlvUGxheWVyVmlldywgQXVkaW9QbGF5ZXJFdmVudHMgfTtcbiIsIi8vIGhic2Z5IGNvbXBpbGVkIEhhbmRsZWJhcnMgdGVtcGxhdGVcbnZhciBIYW5kbGViYXJzQ29tcGlsZXIgPSByZXF1aXJlKCdoYnNmeS9ydW50aW1lJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEhhbmRsZWJhcnNDb21waWxlci50ZW1wbGF0ZSh7XCIxXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgaGVscGVyLCBhbGlhczE9ZGVwdGgwICE9IG51bGwgPyBkZXB0aDAgOiB7fSwgYWxpYXMyPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMzPVwiZnVuY3Rpb25cIiwgYWxpYXM0PWNvbnRhaW5lci5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIHJldHVybiBcIiAgICAgICAgPGRpdiBjbGFzcz1cXFwibmF2LXJpZ2h0XFxcIj5cXG4gICAgICAgICAgICA8YSBjbGFzcz1cXFwiYnRuIGJ0bi1zdWNjZXNzXFxcIiBocmVmPVxcXCIvcmVjb3JkXFxcIj5cXG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLW1pY3JvcGhvbmVcXFwiPjwvaT5cXG4gICAgICAgICAgICA8L2E+XFxuICAgICAgICAgICAgPGEgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCIgaHJlZj1cXFwiL3UvXCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnVzZXJuYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51c2VybmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwidXNlcm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIj5cXG4gICAgICAgICAgICAgICAgPGltZyBjbGFzcz1cXFwicHJvZmlsZS1waWNcXFwiIHNyYz1cXFwiL3Byb2ZpbGVfaW1hZ2VzXCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnByb2ZpbGVJbWFnZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAucHJvZmlsZUltYWdlIDogZGVwdGgwKSkgIT0gbnVsbCA/IGhlbHBlciA6IGFsaWFzMiksKHR5cGVvZiBoZWxwZXIgPT09IGFsaWFzMyA/IGhlbHBlci5jYWxsKGFsaWFzMSx7XCJuYW1lXCI6XCJwcm9maWxlSW1hZ2VcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiXFxcIi8+XFxuICAgICAgICAgICAgPC9hPlxcbiAgICAgICAgPC9kaXY+XFxuXCI7XG59LFwiM1wiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiICAgICAgICA8YSBjbGFzcz1cXFwiYnRuLXNpZ24taW5cXFwiIGhyZWY9XFxcIi9hdXRoXFxcIj5cXG4gICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtc2lnbi1pblxcXCI+PC9pPiBMb2dpbiB3aXRoIFR3aXR0ZXJcXG4gICAgICAgIDwvYT5cXG5cIjtcbn0sXCJjb21waWxlclwiOls3LFwiPj0gNC4wLjBcIl0sXCJtYWluXCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICB2YXIgc3RhY2sxO1xuXG4gIHJldHVybiBcIjxuYXYgY2xhc3M9XFxcImhlYWRlci1uYXZcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJuYXYtbGVmdFxcXCI+XFxuICAgICAgICA8YSBjbGFzcz1cXFwid29yZG1hcmtcXFwiIGhyZWY9XFxcIi9jaGFuZ2Vsb2dcXFwiPlxcbiAgICAgICAgICAgIDxzdHJvbmc+Q291Y2g8L3N0cm9uZz5wb2RcXG4gICAgICAgIDwvYT5cXG4gICAgPC9kaXY+XFxuICAgIDxhIGNsYXNzPVxcXCJidG4gYnRuLXNxdWFyZVxcXCIgaHJlZj1cXFwiL1xcXCI+XFxuICAgICAgICA8aW1nIGNsYXNzPVxcXCJidG4tbG9nb1xcXCIgc3JjPVxcXCIvYXNzZXRzL2ltZy9jb3VjaHBvZC0zLXRpbnkucG5nXFxcIi8+XFxuICAgIDwvYT5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzW1wiaWZcIl0uY2FsbChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMCA6IHt9LChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51c2VybmFtZSA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6Y29udGFpbmVyLnByb2dyYW0oMSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6Y29udGFpbmVyLnByb2dyYW0oMywgZGF0YSwgMCksXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiPC9uYXY+XFxuXCI7XG59LFwidXNlRGF0YVwiOnRydWV9KTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcbmltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL0hlYWRlck5hdlZpZXcuaGJzJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIZWFkZXJOYXZWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyB7XG4gICAgaW5pdGlhbGl6ZSh1c2VyKSB7XG4gICAgICAgIHRoaXMubW9kZWwgPSB1c2VyO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZW5kZXJpbmcgaGVhZGVyIG5hdiB2aWV3XCIpO1xuICAgICAgICB0aGlzLiRlbC5odG1sKHRlbXBsYXRlKHRoaXMubW9kZWwpKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdmFndWVUaW1lIGZyb20gJ3ZhZ3VlLXRpbWUnXG5pbXBvcnQgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJ1xuaW1wb3J0IHsgQXVkaW9QbGF5ZXIgfSBmcm9tICcuL0F1ZGlvUGxheWVyVmlldy5qcydcbmltcG9ydCB7IFF1aXBNb2RlbCB9IGZyb20gJy4uL21vZGVscy9RdWlwJ1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vUmVjb3JkaW5nSXRlbS5oYnMnXG5pbXBvcnQgYXBwIGZyb20gJy4uL2FwcCdcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUXVpcFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IHtcbiAgICBnZXQgZGVmYXVsdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBxdWlwSWQ6IDAsXG4gICAgICAgICAgICBhdWRpb1BsYXllcjogbnVsbFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0IGV2ZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIFwiY2xpY2sgLnF1aXAtYWN0aW9ucyAubG9jay1pbmRpY2F0b3JcIjogXCJ0b2dnbGVQdWJsaWNcIixcbiAgICAgICAgICAgIFwiY2xpY2sgLnF1aXAtYWN0aW9ucyBhW2FjdGlvbj1kZWxldGVdXCI6IFwiZGVsZXRlXCIsXG4gICAgICAgICAgICBcImNsaWNrIC5xdWlwLXBsYXllclwiOiBcInRvZ2dsZVBsYXliYWNrXCJcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGdldCB0YWdOYW1lKCkge1xuICAgICAgICByZXR1cm4gJ2Rpdic7XG4gICAgfVxuXG4gICAgZGVsZXRlKCkge1xuICAgICAgICB0aGlzLm1vZGVsLmRlc3Ryb3koKVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4gd2luZG93LmFwcC5yb3V0ZXIuaG9tZSgpICwgKCkgPT4gY29uc29sZS5sb2coXCJEZWxldGUgZmFpbGVkXCIpKTtcbiAgICB9XG5cbiAgICBvblBhdXNlKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlF1aXBWaWV3OyBwYXVzZWRcIik7XG5cbiAgICAgICAgJCh0aGlzLmVsKVxuICAgICAgICAgICAgLmZpbmQoJy5mYS1wYXVzZScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2ZhLXBhdXNlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnZmEtcGxheScpO1xuICAgIH1cblxuICAgIG9uUGxheSgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJRdWlwVmlldzsgcGxheWluZ1wiKTtcblxuICAgICAgICAkKHRoaXMuZWwpXG4gICAgICAgICAgICAuZmluZCgnLmZhLXBsYXknKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdmYS1wbGF5JylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnZmEtcGF1c2UnKTtcbiAgICB9XG5cbiAgICBvblByb2dyZXNzKHByb2dyZXNzVXBkYXRlKSB7XG4gICAgICAgIHRoaXMubW9kZWwuc2V0KHsncG9zaXRpb24nOiBwcm9ncmVzc1VwZGF0ZS5wb3NpdGlvbn0pOyAvLyBzZWNcbiAgICAgICAgdGhpcy5tb2RlbC5zZXQoeydkdXJhdGlvbic6IHByb2dyZXNzVXBkYXRlLmR1cmF0aW9ufSk7IC8vIHNlY1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J3Byb2dyZXNzJzogcHJvZ3Jlc3NVcGRhdGUucHJvZ3Jlc3N9KTsgLy8gJVxuICAgICAgICB0aGlzLm1vZGVsLnRocm90dGxlZFNhdmUoKTtcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB2YXIgaWQgPSB0aGlzLm1vZGVsLmdldChcImlkXCIpO1xuXG4gICAgICAgIEF1ZGlvUGxheWVyLm9uKFwiL1wiICsgaWQgKyBcIi9wYXVzZWRcIiwgKCkgPT4gdGhpcy5vblBhdXNlKCksIHRoaXMpO1xuICAgICAgICBBdWRpb1BsYXllci5vbihcIi9cIiArIGlkICsgXCIvcGxheWluZ1wiLCAoKSA9PiB0aGlzLm9uUGxheSgpLCB0aGlzKTtcbiAgICAgICAgQXVkaW9QbGF5ZXIub24oXCIvXCIgKyBpZCArIFwiL3Byb2dyZXNzXCIsICh1cGRhdGUpID0+IHRoaXMub25Qcm9ncmVzcyh1cGRhdGUpLCB0aGlzKTtcblxuICAgICAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSB2aXN1YWxzIHRvIGluZGljYXRlIHBsYXliYWNrIHByb2dyZXNzXG4gICAgICAgIHRoaXMubW9kZWwub24oJ2NoYW5nZTpwcm9ncmVzcycsIChtb2RlbCwgcHJvZ3Jlc3MpID0+IHtcbiAgICAgICAgICAgICQodGhpcy5lbCkuZmluZChcIi5wcm9ncmVzcy1iYXJcIikuY3NzKFwid2lkdGhcIiwgcHJvZ3Jlc3MgKyBcIiVcIik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMubW9kZWwub24oJ2NoYW5nZTppc1B1YmxpYycsIChtb2RlbCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2h1dGRvd24oKSB7XG4gICAgICAgIEF1ZGlvUGxheWVyLm9mZihudWxsLCBudWxsLCB0aGlzKTtcbiAgICAgICAgdGhpcy5tb2RlbC5vZmYoKTtcbiAgICB9XG5cbiAgICB0b2dnbGVQdWJsaWMoZXYpIHtcbiAgICAgICAgdmFyIG5ld1N0YXRlID0gIXRoaXMubW9kZWwuZ2V0KCdpc1B1YmxpYycpO1xuICAgICAgICB0aGlzLm1vZGVsLnNldCh7J2lzUHVibGljJzogbmV3U3RhdGV9KTtcbiAgICAgICAgdGhpcy5tb2RlbC5zYXZlKCk7XG4gICAgfVxuXG4gICAgdG9nZ2xlUGxheWJhY2soZXZlbnQpIHtcbiAgICAgICAgQXVkaW9QbGF5ZXIudHJpZ2dlcihcInRvZ2dsZVwiLCB0aGlzLm1vZGVsLmF0dHJpYnV0ZXMpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgdmFyIHZpZXdNb2RlbCA9IHRoaXMubW9kZWwudG9KU09OKCk7XG4gICAgICAgIHZpZXdNb2RlbC52YWd1ZVRpbWUgPSB2YWd1ZVRpbWUuZ2V0KHtmcm9tOiBuZXcgRGF0ZSgpLCB0bzogbmV3IERhdGUodGhpcy5tb2RlbC5nZXQoXCJ0aW1lc3RhbXBcIikpfSk7XG5cbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0ZW1wbGF0ZSh2aWV3TW9kZWwpKTtcblxuICAgICAgICB0aGlzLiRlbC5maW5kKFwiLnByb2dyZXNzLWJhclwiKS5jc3MoXCJ3aWR0aFwiLCB0aGlzLm1vZGVsLmdldCgncHJvZ3Jlc3MnKSArIFwiJVwiKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59XG4iLCIvLyBoYnNmeSBjb21waWxlZCBIYW5kbGViYXJzIHRlbXBsYXRlXG52YXIgSGFuZGxlYmFyc0NvbXBpbGVyID0gcmVxdWlyZSgnaGJzZnkvcnVudGltZScpO1xubW9kdWxlLmV4cG9ydHMgPSBIYW5kbGViYXJzQ29tcGlsZXIudGVtcGxhdGUoe1wiMVwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgcmV0dXJuIFwiICAgICAgICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLXVubG9ja1xcXCI+PC9pPiA8c3BhbiBjbGFzcz1cXFwiY2FwdGlvblxcXCI+TWFrZSBQcml2YXRlPC9zcGFuPlxcblwiO1xufSxcIjNcIjpmdW5jdGlvbihjb250YWluZXIsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICAgIHJldHVybiBcIiAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1sb2NrXFxcIj48L2k+IDxzcGFuIGNsYXNzPVxcXCJjYXB0aW9uXFxcIj5NYWtlIFB1YmxpYzwvc3Bhbj5cXG5cIjtcbn0sXCI1XCI6ZnVuY3Rpb24oY29udGFpbmVyLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgICByZXR1cm4gXCIgICAgICAgIDxhIGNsYXNzPVxcXCJidXR0b25cXFwiIGFjdGlvbj1cXFwiZGVsZXRlXFxcIiB0aXRsZT1cXFwiRGVsZXRlXFxcIj5cXG4gICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtcmVtb3ZlXFxcIj48L2k+IDxzcGFuIGNsYXNzPVxcXCJjYXB0aW9uXFxcIj5EZWxldGU8L3NwYW4+XFxuICAgICAgICA8L2E+XFxuXCI7XG59LFwiY29tcGlsZXJcIjpbNyxcIj49IDQuMC4wXCJdLFwibWFpblwiOmZ1bmN0aW9uKGNvbnRhaW5lcixkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gICAgdmFyIHN0YWNrMSwgaGVscGVyLCBhbGlhczE9ZGVwdGgwICE9IG51bGwgPyBkZXB0aDAgOiB7fSwgYWxpYXMyPWhlbHBlcnMuaGVscGVyTWlzc2luZywgYWxpYXMzPVwiZnVuY3Rpb25cIiwgYWxpYXM0PWNvbnRhaW5lci5lc2NhcGVFeHByZXNzaW9uO1xuXG4gIHJldHVybiBcIjxkaXYgY2xhc3M9XFxcInF1aXBcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJmbGV4LXJvd1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJxdWlwLXByb2ZpbGVcXFwiPlxcbiAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJidG5cXFwiIGhyZWY9XFxcIi91L1wiXG4gICAgKyBhbGlhczQoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy51c2VybmFtZSB8fCAoZGVwdGgwICE9IG51bGwgPyBkZXB0aDAudXNlcm5hbWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMyKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMzID8gaGVscGVyLmNhbGwoYWxpYXMxLHtcIm5hbWVcIjpcInVzZXJuYW1lXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCI+XFxuICAgICAgICAgICAgICAgIDxpbWcgc3JjPVxcXCIvcHJvZmlsZV9pbWFnZXNcIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMucHJvZmlsZUltYWdlIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5wcm9maWxlSW1hZ2UgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMyKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMzID8gaGVscGVyLmNhbGwoYWxpYXMxLHtcIm5hbWVcIjpcInByb2ZpbGVJbWFnZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCJcXFwiLz5cXG4gICAgICAgICAgICA8L2E+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInF1aXAtZGV0YWlsc1xcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZmxleC1yb3dcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwibmFtZVxcXCI+XCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLnVzZXJuYW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC51c2VybmFtZSA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwidXNlcm5hbWVcIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8dGltZT5cIlxuICAgICsgYWxpYXM0KCgoaGVscGVyID0gKGhlbHBlciA9IGhlbHBlcnMudmFndWVUaW1lIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC52YWd1ZVRpbWUgOiBkZXB0aDApKSAhPSBudWxsID8gaGVscGVyIDogYWxpYXMyKSwodHlwZW9mIGhlbHBlciA9PT0gYWxpYXMzID8gaGVscGVyLmNhbGwoYWxpYXMxLHtcIm5hbWVcIjpcInZhZ3VlVGltZVwiLFwiaGFzaFwiOnt9LFwiZGF0YVwiOmRhdGF9KSA6IGhlbHBlcikpKVxuICAgICsgXCI8L3RpbWU+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwidGV4dFxcXCI+XCJcbiAgICArIGFsaWFzNCgoKGhlbHBlciA9IChoZWxwZXIgPSBoZWxwZXJzLmRlc2NyaXB0aW9uIHx8IChkZXB0aDAgIT0gbnVsbCA/IGRlcHRoMC5kZXNjcmlwdGlvbiA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwiZGVzY3JpcHRpb25cIixcImhhc2hcIjp7fSxcImRhdGFcIjpkYXRhfSkgOiBoZWxwZXIpKSlcbiAgICArIFwiPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcInF1aXAtcGxheWVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInByb2dyZXNzLWJhclxcXCI+PC9kaXY+XFxuICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtcGxheVxcXCI+PC9pPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicXVpcC1hY3Rpb25zXFxcIj5cXG4gICAgICAgIDxhIGNsYXNzPVxcXCJidXR0b25cXFwiIGhyZWY9XFxcIlwiXG4gICAgKyBhbGlhczQoKChoZWxwZXIgPSAoaGVscGVyID0gaGVscGVycy5wdWJsaWNVcmwgfHwgKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLnB1YmxpY1VybCA6IGRlcHRoMCkpICE9IG51bGwgPyBoZWxwZXIgOiBhbGlhczIpLCh0eXBlb2YgaGVscGVyID09PSBhbGlhczMgPyBoZWxwZXIuY2FsbChhbGlhczEse1wibmFtZVwiOlwicHVibGljVXJsXCIsXCJoYXNoXCI6e30sXCJkYXRhXCI6ZGF0YX0pIDogaGVscGVyKSkpXG4gICAgKyBcIlxcXCIgdGl0bGU9XFxcIlNoYXJlXFxcIj5cXG4gICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtc2hhcmUtc3F1YXJlLW9cXFwiPjwvaT4gPHNwYW4gY2xhc3M9XFxcImNhcHRpb25cXFwiPlNoYXJlPC9zcGFuPlxcbiAgICAgICAgPC9hPlxcbiAgICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvbiBsb2NrLWluZGljYXRvclxcXCIgdGl0bGU9XFxcIlRvZ2dsZSB2aXNpYmlsaXR5XFxcIj5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzW1wiaWZcIl0uY2FsbChhbGlhczEsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlzUHVibGljIDogZGVwdGgwKSx7XCJuYW1lXCI6XCJpZlwiLFwiaGFzaFwiOnt9LFwiZm5cIjpjb250YWluZXIucHJvZ3JhbSgxLCBkYXRhLCAwKSxcImludmVyc2VcIjpjb250YWluZXIucHJvZ3JhbSgzLCBkYXRhLCAwKSxcImRhdGFcIjpkYXRhfSkpICE9IG51bGwgPyBzdGFjazEgOiBcIlwiKVxuICAgICsgXCIgICAgICAgIDwvYT5cXG5cIlxuICAgICsgKChzdGFjazEgPSBoZWxwZXJzW1wiaWZcIl0uY2FsbChhbGlhczEsKGRlcHRoMCAhPSBudWxsID8gZGVwdGgwLmlzTWluZSA6IGRlcHRoMCkse1wibmFtZVwiOlwiaWZcIixcImhhc2hcIjp7fSxcImZuXCI6Y29udGFpbmVyLnByb2dyYW0oNSwgZGF0YSwgMCksXCJpbnZlcnNlXCI6Y29udGFpbmVyLm5vb3AsXCJkYXRhXCI6ZGF0YX0pKSAhPSBudWxsID8gc3RhY2sxIDogXCJcIilcbiAgICArIFwiICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xufSxcInVzZURhdGFcIjp0cnVlfSk7XG4iLCJleHBvcnQgZGVmYXVsdCBjbGFzcyBQb2x5ZmlsbCB7XG4gICAgc3RhdGljIGluc3RhbGwoKSB7XG4gICAgICAgIHdpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQgfHwgZmFsc2U7XG4gICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWEgfHwgZmFsc2U7XG5cbiAgICAgICAgaWYgKG5hdmlnYXRvci5tZWRpYURldmljZSA9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInBvbHlmaWxsaW5nIG1lZGlhRGV2aWNlLmdldFVzZXJNZWRpYVwiKTtcblxuICAgICAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlID0ge1xuICAgICAgICAgICAgICAgIGdldFVzZXJNZWRpYTogKHByb3BzKSA9PiBuZXcgUHJvbWlzZSgoeSwgbikgPT4gbmF2aWdhdG9yLmdldFVzZXJNZWRpYShwcm9wcywgeSwgbikpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5hdmlnYXRvci5nZXRVc2VyTWVkaWEpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJBdWRpb0NhcHR1cmU6OnBvbHlmaWxsKCk7IGdldFVzZXJNZWRpYSgpIG5vdCBzdXBwb3J0ZWQuXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgUHJlc2VudGVyIHtcbiAgICBzaG93SGVhZGVyTmF2KHZpZXcpIHtcbiAgICAgICAgJChcImJvZHkgPiBoZWFkZXJcIikuYXBwZW5kKHZpZXcuZWwpO1xuICAgIH1cblxuICAgIHN3aXRjaFZpZXcobmV3Vmlldykge1xuICAgICAgICBpZih0aGlzLnZpZXcpIHtcbiAgICAgICAgICAgIHZhciBvbGRWaWV3ID0gdGhpcy52aWV3O1xuICAgICAgICAgICAgb2xkVmlldy4kZWwucmVtb3ZlQ2xhc3MoXCJ0cmFuc2l0aW9uLWluXCIpO1xuICAgICAgICAgICAgb2xkVmlldy4kZWwuYWRkQ2xhc3MoXCJ0cmFuc2l0aW9uLW91dFwiKTtcbiAgICAgICAgICAgIG9sZFZpZXcuJGVsLm9uZShcImFuaW1hdGlvbmVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgb2xkVmlldy5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBvbGRWaWV3LnVuYmluZCgpO1xuICAgICAgICAgICAgICAgIGlmKG9sZFZpZXcuc2h1dGRvd24gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBvbGRWaWV3LnNodXRkb3duKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdWaWV3LiRlbC5hZGRDbGFzcyhcInRyYW5zaXRpb25hYmxlIHRyYW5zaXRpb24taW5cIik7XG4gICAgICAgIG5ld1ZpZXcuJGVsLm9uZShcImFuaW1hdGlvbmVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICBuZXdWaWV3LiRlbC5yZW1vdmVDbGFzcyhcInRyYW5zaXRpb24taW5cIik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyN2aWV3LWNvbnRhaW5lcicpLmFwcGVuZChuZXdWaWV3LmVsKTtcbiAgICAgICAgdGhpcy52aWV3ID0gbmV3VmlldztcbiAgICB9XG59XG5cbmV4cG9ydCBsZXQgUm9vdFByZXNlbnRlciA9IG5ldyBQcmVzZW50ZXIoKTtcbiIsImltcG9ydCBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSdcblxuaW1wb3J0IENoYW5nZWxvZ1ZpZXcgZnJvbSAnLi9wYWdlcy9DaGFuZ2Vsb2cvQ2hhbmdlbG9nVmlldydcbmltcG9ydCBIb21lcGFnZVZpZXcgZnJvbSAnLi9wYWdlcy9Ib21lcGFnZS9Ib21lcGFnZVZpZXcnXG5pbXBvcnQgUmVjb3JkZXJWaWV3IGZyb20gJy4vcGFnZXMvUmVjb3JkZXIvUmVjb3JkZXJWaWV3J1xuaW1wb3J0IEdldE1pY3JvcGhvbmVWaWV3IGZyb20gJy4vcGFnZXMvR2V0TWljcm9waG9uZS9HZXRNaWNyb3Bob25lVmlldydcbmltcG9ydCBVc2VyUG9kVmlldyBmcm9tICcuL3BhZ2VzL1VzZXIvVXNlclNpbmdsZVJlY29yZGluZ1ZpZXcnXG5pbXBvcnQgSGVhZGVyTmF2VmlldyBmcm9tICcuL3BhcnRpYWxzL0hlYWRlck5hdlZpZXcnXG5pbXBvcnQgUXVpcFZpZXcgZnJvbSAnLi9wYXJ0aWFscy9RdWlwVmlldydcbmltcG9ydCB7IFVzZXJQb2RDb2xsZWN0aW9uVmlldyB9IGZyb20gJy4vcGFnZXMvVXNlci9Vc2VyQWxsUmVjb3JkaW5nc1ZpZXcnXG5pbXBvcnQgTWljcm9waG9uZVBlcm1pc3Npb25zIGZyb20gJy4vcGFnZXMvR2V0TWljcm9waG9uZS9NaWNyb3Bob25lUGVybWlzc2lvbnMnXG5cbmltcG9ydCB7IFJvb3RQcmVzZW50ZXIgfSBmcm9tICcuL3ByZXNlbnRlcidcblxuY2xhc3MgUmVjb3JkZXJDb250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihwcmVzZW50ZXIpIHtcbiAgICAgICAgdGhpcy5wcmVzZW50ZXIgPSBwcmVzZW50ZXI7XG4gICAgICAgIG5ldyBNaWNyb3Bob25lUGVybWlzc2lvbnMoKVxuICAgICAgICAgICAgLmdyYWJNaWNyb3Bob25lKHRoaXMub25NaWNyb3Bob25lQWNxdWlyZWQsIHRoaXMub25NaWNyb3Bob25lRGVuaWVkKTtcbiAgICB9XG5cbiAgICBvbk1pY3JvcGhvbmVBY3F1aXJlZChtaWNyb3Bob25lTWVkaWFTdHJlYW0pIHtcbiAgICAgICAgdGhpcy5wcmVzZW50ZXIuc3dpdGNoVmlldyhuZXcgUmVjb3JkZXJWaWV3KG1pY3JvcGhvbmVNZWRpYVN0cmVhbSkpO1xuICAgIH1cblxuICAgIG9uTWljcm9waG9uZURlbmllZCgpIHtcbiAgICAgICAgdGhpcy5wcmVzZW50ZXIuc3dpdGNoVmlldyhuZXcgR2V0TWljcm9waG9uZVZpZXcoKSk7XG4gICAgfVxufVxuXG5jbGFzcyBIb21lQ29udHJvbGxlciB7XG4gICAgY29uc3RydWN0b3IocHJlc2VudGVyKSB7XG4gICAgICAgIHByZXNlbnRlci5zd2l0Y2hWaWV3KG5ldyBIb21lcGFnZVZpZXcoKSk7XG4gICAgfVxufVxuXG5jbGFzcyBVc2VyQ29udHJvbGxlciB7XG4gICAgY29uc3RydWN0b3IocHJlc2VudGVyLCB1c2VybmFtZSkge1xuICAgICAgICBwcmVzZW50ZXIuc3dpdGNoVmlldyhuZXcgVXNlclBvZENvbGxlY3Rpb25WaWV3KHVzZXJuYW1lKSk7XG4gICAgfVxufVxuXG5jbGFzcyBDaGFuZ2Vsb2dDb250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihwcmVzZW50ZXIpIHtcbiAgICAgICAgcHJlc2VudGVyLnN3aXRjaFZpZXcobmV3IENoYW5nZWxvZ1ZpZXcoKSk7XG4gICAgfVxufVxuXG5jbGFzcyBTaW5nbGVQb2RDb250cm9sbGVyIHtcbiAgICBjb25zdHJ1Y3RvcihwcmVzZW50ZXIsIGlkKSB7XG4gICAgICAgIHByZXNlbnRlci5zd2l0Y2hWaWV3KG5ldyBVc2VyUG9kVmlldyhpZCkpO1xuICAgIH1cbn1cblxuY2xhc3MgUm91dGVyIGV4dGVuZHMgQmFja2JvbmUuUm91dGVyIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoe1xuICAgICAgICAgICAgcm91dGVzOiB7XG4gICAgICAgICAgICAgICAgJyc6ICdob21lJyxcbiAgICAgICAgICAgICAgICAncmVjb3JkJzogJ3JlY29yZCcsXG4gICAgICAgICAgICAgICAgJ3UvOnVzZXJuYW1lJzogJ3VzZXInLFxuICAgICAgICAgICAgICAgICdjaGFuZ2Vsb2cnOiAnY2hhbmdlbG9nJyxcbiAgICAgICAgICAgICAgICAncS86cXVpcGlkJzogJ3NpbmdsZV9pdGVtJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgIH1cblxuICAgIHNldFVzZXIodXNlcikge1xuICAgICAgICBSb290UHJlc2VudGVyLnNob3dIZWFkZXJOYXYobmV3IEhlYWRlck5hdlZpZXcodXNlcikpXG4gICAgfVxuXG4gICAgc2luZ2xlX2l0ZW0oaWQpIHtcbiAgICAgICAgbmV3IFNpbmdsZVBvZENvbnRyb2xsZXIoUm9vdFByZXNlbnRlciwgaWQpO1xuICAgIH1cblxuICAgIGhvbWUoKSB7XG4gICAgICAgIG5ldyBIb21lQ29udHJvbGxlcihSb290UHJlc2VudGVyKTtcbiAgICB9XG5cbiAgICB1c2VyKHVzZXJuYW1lKSB7XG4gICAgICAgIG5ldyBVc2VyQ29udHJvbGxlcihSb290UHJlc2VudGVyLCB1c2VybmFtZSk7XG4gICAgfVxuXG4gICAgY2hhbmdlbG9nKCkge1xuICAgICAgICBuZXcgQ2hhbmdlbG9nQ29udHJvbGxlcihSb290UHJlc2VudGVyKTtcbiAgICB9XG5cbiAgICByZWNvcmQoKSB7XG4gICAgICAgIG5ldyBSZWNvcmRlckNvbnRyb2xsZXIoUm9vdFByZXNlbnRlcik7XG4gICAgfVxuXG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgUm91dGVyO1xuIl19
