/*!
  * =============================================================
  * Ender: open module JavaScript framework (https://enderjs.com)
  * Build: ender build jquery vague-time backbone@1.2.3 backbone.modelbinder backbone.epoxy
  * Packages: ender-core@2.0.0 ender-commonjs@1.0.8 jquery@2.1.4 vague-time@1.3.0 underscore@1.8.3 backbone@1.2.3 backbone.modelbinder@1.1.0 backbone.epoxy@1.3.4
  * =============================================================
  */

(function () {

  /*!
    * Ender: open module JavaScript framework (client-lib)
    * http://enderjs.com
    * License MIT
    */
  
  /**
   * @constructor
   * @param  {*=}      item      selector|node|collection|callback|anything
   * @param  {Object=} root      node(s) from which to base selector queries
   */
  function Ender(item, root) {
    var i
    this.length = 0 // Ensure that instance owns length
  
    if (typeof item == 'string')
      // start with strings so the result parlays into the other checks
      // the .selector prop only applies to strings
      item = ender._select(this['selector'] = item, root)
  
    if (null == item) return this // Do not wrap null|undefined
  
    if (typeof item == 'function') ender._closure(item, root)
  
    // DOM node | scalar | not array-like
    else if (typeof item != 'object' || item.nodeType || (i = item.length) !== +i || item == item.window)
      this[this.length++] = item
  
    // array-like - bitwise ensures integer length
    else for (this.length = i = (i > 0 ? ~~i : 0); i--;)
      this[i] = item[i]
  }
  
  /**
   * @param  {*=}      item   selector|node|collection|callback|anything
   * @param  {Object=} root   node(s) from which to base selector queries
   * @return {Ender}
   */
  function ender(item, root) {
    return new Ender(item, root)
  }
  
  
  /**
   * @expose
   * sync the prototypes for jQuery compatibility
   */
  ender.fn = ender.prototype = Ender.prototype
  
  /**
   * @enum {number}  protects local symbols from being overwritten
   */
  ender._reserved = {
    reserved: 1,
    ender: 1,
    expose: 1,
    noConflict: 1,
    fn: 1
  }
  
  /**
   * @expose
   * handy reference to self
   */
  Ender.prototype.$ = ender
  
  /**
   * @expose
   * make webkit dev tools pretty-print ender instances like arrays
   */
  Ender.prototype.splice = function () { throw new Error('Not implemented') }
  
  /**
   * @expose
   * @param   {function(*, number, Ender)}  fn
   * @param   {object=}                     scope
   * @return  {Ender}
   */
  Ender.prototype.forEach = function (fn, scope) {
    var i, l
    // opt out of native forEach so we can intentionally call our own scope
    // defaulting to the current item and be able to return self
    for (i = 0, l = this.length; i < l; ++i) i in this && fn.call(scope || this[i], this[i], i, this)
    // return self for chaining
    return this
  }
  
  /**
   * @expose
   * @param {object|function} o
   * @param {boolean=}        chain
   */
  ender.ender = function (o, chain) {
    var o2 = chain ? Ender.prototype : ender
    for (var k in o) !(k in ender._reserved) && (o2[k] = o[k])
    return o2
  }
  
  /**
   * @expose
   * @param {string}  s
   * @param {Node=}   r
   */
  ender._select = function (s, r) {
    return s ? (r || document).querySelectorAll(s) : []
  }
  
  /**
   * @expose
   * @param {function} fn
   */
  ender._closure = function (fn) {
    fn.call(document, ender)
  }
  
  if (typeof module !== 'undefined' && module['exports']) module['exports'] = ender
  var $ = ender
  
  /**
   * @expose
   * @param {string} name
   * @param {*}      value
   */
  ender.expose = function (name, value) {
    ender.expose.old[name] = window[name]
    window[name] = value
  }
  
  /**
   * @expose
   */
  ender.expose.old = {}
  
  /**
   * @expose
   * @param {boolean} all   restore only $ or all ender globals
   */
  ender.noConflict = function (all) {
    window['$'] = ender.expose.old['$']
    if (all) for (var k in ender.expose.old) window[k] = ender.expose.old[k]
    return this
  }
  
  ender.expose('$', ender)
  ender.expose('ender', ender); // uglify needs this semi-colon between concating files
  
  /*!
    * Ender: open module JavaScript framework (module-lib)
    * http://enderjs.com
    * License MIT
    */
  
  var global = this
  
  /**
   * @param  {string}  id   module id to load
   * @return {object}
   */
  function require(id) {
    if ('$' + id in require._cache)
      return require._cache['$' + id]
    if ('$' + id in require._modules)
      return (require._cache['$' + id] = require._modules['$' + id]._load())
    if (id in window)
      return window[id]
  
    throw new Error('Requested module "' + id + '" has not been defined.')
  }
  
  /**
   * @param  {string}  id       module id to provide to require calls
   * @param  {object}  exports  the exports object to be returned
   */
  function provide(id, exports) {
    return (require._cache['$' + id] = exports)
  }
  
  /**
   * @expose
   * @dict
   */
  require._cache = {}
  
  /**
   * @expose
   * @dict
   */
  require._modules = {}
  
  /**
   * @constructor
   * @param  {string}                                          id   module id for this module
   * @param  {function(Module, object, function(id), object)}  fn   module definition
   */
  function Module(id, fn) {
    this.id = id
    this.fn = fn
    require._modules['$' + id] = this
  }
  
  /**
   * @expose
   * @param  {string}  id   module id to load from the local module context
   * @return {object}
   */
  Module.prototype.require = function (id) {
    var parts, i
  
    if (id.charAt(0) == '.') {
      parts = (this.id.replace(/\/.*?$/, '/') + id.replace(/\.js$/, '')).split('/')
  
      while (~(i = parts.indexOf('.')))
        parts.splice(i, 1)
  
      while ((i = parts.lastIndexOf('..')) > 0)
        parts.splice(i - 1, 2)
  
      id = parts.join('/')
    }
  
    return require(id)
  }
  
  /**
   * @expose
   * @return {object}
   */
   Module.prototype._load = function () {
     var m = this
     var dotdotslash = /^\.\.\//g
     var dotslash = /^\.\/[^\/]+$/g
     if (!m._loaded) {
       m._loaded = true
  
       /**
        * @expose
        */
       m.exports = {}
       m.fn.call(global, m, m.exports, function (id) {
         if (id.match(dotdotslash)) {
           id = m.id.replace(/[^\/]+\/[^\/]+$/, '') + id.replace(dotdotslash, '')
         }
         else if (id.match(dotslash)) {
           id = m.id.replace(/\/[^\/]+$/, '') + id.replace('.', '')
         }
         return m.require(id)
       }, global)
     }
  
     return m.exports
   }
  
  /**
   * @expose
   * @param  {string}                     id        main module id
   * @param  {Object.<string, function>}  modules   mapping of module ids to definitions
   * @param  {string}                     main      the id of the main module
   */
  Module.createPackage = function (id, modules, main) {
    var path, m
  
    for (path in modules) {
      new Module(id + '/' + path, modules[path])
      if (m = path.match(/^(.+)\/index$/)) new Module(id + '/' + m[1], modules[path])
    }
  
    if (main) require._modules['$' + id] = require._modules['$' + id + '/' + main]
  }
  
  if (ender && ender.expose) {
    /*global global,require,provide,Module */
    ender.expose('global', global)
    ender.expose('require', require)
    ender.expose('provide', provide)
    ender.expose('Module', Module)
  }
  
  Module.createPackage('jquery', {
    'dist/jquery': function (module, exports, require, global) {
      /*!
       * jQuery JavaScript Library v2.1.4
       * http://jquery.com/
       *
       * Includes Sizzle.js
       * http://sizzlejs.com/
       *
       * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
       * Released under the MIT license
       * http://jquery.org/license
       *
       * Date: 2015-04-28T16:01Z
       */
      
      (function( global, factory ) {
      
      	if ( typeof module === "object" && typeof module.exports === "object" ) {
      		// For CommonJS and CommonJS-like environments where a proper `window`
      		// is present, execute the factory and get jQuery.
      		// For environments that do not have a `window` with a `document`
      		// (such as Node.js), expose a factory as module.exports.
      		// This accentuates the need for the creation of a real `window`.
      		// e.g. var jQuery = require("jquery")(window);
      		// See ticket #14549 for more info.
      		module.exports = global.document ?
      			factory( global, true ) :
      			function( w ) {
      				if ( !w.document ) {
      					throw new Error( "jQuery requires a window with a document" );
      				}
      				return factory( w );
      			};
      	} else {
      		factory( global );
      	}
      
      // Pass this if window is not defined yet
      }(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {
      
      // Support: Firefox 18+
      // Can't be in strict mode, several libs including ASP.NET trace
      // the stack via arguments.caller.callee and Firefox dies if
      // you try to trace through "use strict" call chains. (#13335)
      //
      
      var arr = [];
      
      var slice = arr.slice;
      
      var concat = arr.concat;
      
      var push = arr.push;
      
      var indexOf = arr.indexOf;
      
      var class2type = {};
      
      var toString = class2type.toString;
      
      var hasOwn = class2type.hasOwnProperty;
      
      var support = {};
      
      
      
      var
      	// Use the correct document accordingly with window argument (sandbox)
      	document = window.document,
      
      	version = "2.1.4",
      
      	// Define a local copy of jQuery
      	jQuery = function( selector, context ) {
      		// The jQuery object is actually just the init constructor 'enhanced'
      		// Need init if jQuery is called (just allow error to be thrown if not included)
      		return new jQuery.fn.init( selector, context );
      	},
      
      	// Support: Android<4.1
      	// Make sure we trim BOM and NBSP
      	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,
      
      	// Matches dashed string for camelizing
      	rmsPrefix = /^-ms-/,
      	rdashAlpha = /-([\da-z])/gi,
      
      	// Used by jQuery.camelCase as callback to replace()
      	fcamelCase = function( all, letter ) {
      		return letter.toUpperCase();
      	};
      
      jQuery.fn = jQuery.prototype = {
      	// The current version of jQuery being used
      	jquery: version,
      
      	constructor: jQuery,
      
      	// Start with an empty selector
      	selector: "",
      
      	// The default length of a jQuery object is 0
      	length: 0,
      
      	toArray: function() {
      		return slice.call( this );
      	},
      
      	// Get the Nth element in the matched element set OR
      	// Get the whole matched element set as a clean array
      	get: function( num ) {
      		return num != null ?
      
      			// Return just the one element from the set
      			( num < 0 ? this[ num + this.length ] : this[ num ] ) :
      
      			// Return all the elements in a clean array
      			slice.call( this );
      	},
      
      	// Take an array of elements and push it onto the stack
      	// (returning the new matched element set)
      	pushStack: function( elems ) {
      
      		// Build a new jQuery matched element set
      		var ret = jQuery.merge( this.constructor(), elems );
      
      		// Add the old object onto the stack (as a reference)
      		ret.prevObject = this;
      		ret.context = this.context;
      
      		// Return the newly-formed element set
      		return ret;
      	},
      
      	// Execute a callback for every element in the matched set.
      	// (You can seed the arguments with an array of args, but this is
      	// only used internally.)
      	each: function( callback, args ) {
      		return jQuery.each( this, callback, args );
      	},
      
      	map: function( callback ) {
      		return this.pushStack( jQuery.map(this, function( elem, i ) {
      			return callback.call( elem, i, elem );
      		}));
      	},
      
      	slice: function() {
      		return this.pushStack( slice.apply( this, arguments ) );
      	},
      
      	first: function() {
      		return this.eq( 0 );
      	},
      
      	last: function() {
      		return this.eq( -1 );
      	},
      
      	eq: function( i ) {
      		var len = this.length,
      			j = +i + ( i < 0 ? len : 0 );
      		return this.pushStack( j >= 0 && j < len ? [ this[j] ] : [] );
      	},
      
      	end: function() {
      		return this.prevObject || this.constructor(null);
      	},
      
      	// For internal use only.
      	// Behaves like an Array's method, not like a jQuery method.
      	push: push,
      	sort: arr.sort,
      	splice: arr.splice
      };
      
      jQuery.extend = jQuery.fn.extend = function() {
      	var options, name, src, copy, copyIsArray, clone,
      		target = arguments[0] || {},
      		i = 1,
      		length = arguments.length,
      		deep = false;
      
      	// Handle a deep copy situation
      	if ( typeof target === "boolean" ) {
      		deep = target;
      
      		// Skip the boolean and the target
      		target = arguments[ i ] || {};
      		i++;
      	}
      
      	// Handle case when target is a string or something (possible in deep copy)
      	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
      		target = {};
      	}
      
      	// Extend jQuery itself if only one argument is passed
      	if ( i === length ) {
      		target = this;
      		i--;
      	}
      
      	for ( ; i < length; i++ ) {
      		// Only deal with non-null/undefined values
      		if ( (options = arguments[ i ]) != null ) {
      			// Extend the base object
      			for ( name in options ) {
      				src = target[ name ];
      				copy = options[ name ];
      
      				// Prevent never-ending loop
      				if ( target === copy ) {
      					continue;
      				}
      
      				// Recurse if we're merging plain objects or arrays
      				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
      					if ( copyIsArray ) {
      						copyIsArray = false;
      						clone = src && jQuery.isArray(src) ? src : [];
      
      					} else {
      						clone = src && jQuery.isPlainObject(src) ? src : {};
      					}
      
      					// Never move original objects, clone them
      					target[ name ] = jQuery.extend( deep, clone, copy );
      
      				// Don't bring in undefined values
      				} else if ( copy !== undefined ) {
      					target[ name ] = copy;
      				}
      			}
      		}
      	}
      
      	// Return the modified object
      	return target;
      };
      
      jQuery.extend({
      	// Unique for each copy of jQuery on the page
      	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),
      
      	// Assume jQuery is ready without the ready module
      	isReady: true,
      
      	error: function( msg ) {
      		throw new Error( msg );
      	},
      
      	noop: function() {},
      
      	isFunction: function( obj ) {
      		return jQuery.type(obj) === "function";
      	},
      
      	isArray: Array.isArray,
      
      	isWindow: function( obj ) {
      		return obj != null && obj === obj.window;
      	},
      
      	isNumeric: function( obj ) {
      		// parseFloat NaNs numeric-cast false positives (null|true|false|"")
      		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
      		// subtraction forces infinities to NaN
      		// adding 1 corrects loss of precision from parseFloat (#15100)
      		return !jQuery.isArray( obj ) && (obj - parseFloat( obj ) + 1) >= 0;
      	},
      
      	isPlainObject: function( obj ) {
      		// Not plain objects:
      		// - Any object or value whose internal [[Class]] property is not "[object Object]"
      		// - DOM nodes
      		// - window
      		if ( jQuery.type( obj ) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
      			return false;
      		}
      
      		if ( obj.constructor &&
      				!hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
      			return false;
      		}
      
      		// If the function hasn't returned already, we're confident that
      		// |obj| is a plain object, created by {} or constructed with new Object
      		return true;
      	},
      
      	isEmptyObject: function( obj ) {
      		var name;
      		for ( name in obj ) {
      			return false;
      		}
      		return true;
      	},
      
      	type: function( obj ) {
      		if ( obj == null ) {
      			return obj + "";
      		}
      		// Support: Android<4.0, iOS<6 (functionish RegExp)
      		return typeof obj === "object" || typeof obj === "function" ?
      			class2type[ toString.call(obj) ] || "object" :
      			typeof obj;
      	},
      
      	// Evaluates a script in a global context
      	globalEval: function( code ) {
      		var script,
      			indirect = eval;
      
      		code = jQuery.trim( code );
      
      		if ( code ) {
      			// If the code includes a valid, prologue position
      			// strict mode pragma, execute code by injecting a
      			// script tag into the document.
      			if ( code.indexOf("use strict") === 1 ) {
      				script = document.createElement("script");
      				script.text = code;
      				document.head.appendChild( script ).parentNode.removeChild( script );
      			} else {
      			// Otherwise, avoid the DOM node creation, insertion
      			// and removal by using an indirect global eval
      				indirect( code );
      			}
      		}
      	},
      
      	// Convert dashed to camelCase; used by the css and data modules
      	// Support: IE9-11+
      	// Microsoft forgot to hump their vendor prefix (#9572)
      	camelCase: function( string ) {
      		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
      	},
      
      	nodeName: function( elem, name ) {
      		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
      	},
      
      	// args is for internal usage only
      	each: function( obj, callback, args ) {
      		var value,
      			i = 0,
      			length = obj.length,
      			isArray = isArraylike( obj );
      
      		if ( args ) {
      			if ( isArray ) {
      				for ( ; i < length; i++ ) {
      					value = callback.apply( obj[ i ], args );
      
      					if ( value === false ) {
      						break;
      					}
      				}
      			} else {
      				for ( i in obj ) {
      					value = callback.apply( obj[ i ], args );
      
      					if ( value === false ) {
      						break;
      					}
      				}
      			}
      
      		// A special, fast, case for the most common use of each
      		} else {
      			if ( isArray ) {
      				for ( ; i < length; i++ ) {
      					value = callback.call( obj[ i ], i, obj[ i ] );
      
      					if ( value === false ) {
      						break;
      					}
      				}
      			} else {
      				for ( i in obj ) {
      					value = callback.call( obj[ i ], i, obj[ i ] );
      
      					if ( value === false ) {
      						break;
      					}
      				}
      			}
      		}
      
      		return obj;
      	},
      
      	// Support: Android<4.1
      	trim: function( text ) {
      		return text == null ?
      			"" :
      			( text + "" ).replace( rtrim, "" );
      	},
      
      	// results is for internal usage only
      	makeArray: function( arr, results ) {
      		var ret = results || [];
      
      		if ( arr != null ) {
      			if ( isArraylike( Object(arr) ) ) {
      				jQuery.merge( ret,
      					typeof arr === "string" ?
      					[ arr ] : arr
      				);
      			} else {
      				push.call( ret, arr );
      			}
      		}
      
      		return ret;
      	},
      
      	inArray: function( elem, arr, i ) {
      		return arr == null ? -1 : indexOf.call( arr, elem, i );
      	},
      
      	merge: function( first, second ) {
      		var len = +second.length,
      			j = 0,
      			i = first.length;
      
      		for ( ; j < len; j++ ) {
      			first[ i++ ] = second[ j ];
      		}
      
      		first.length = i;
      
      		return first;
      	},
      
      	grep: function( elems, callback, invert ) {
      		var callbackInverse,
      			matches = [],
      			i = 0,
      			length = elems.length,
      			callbackExpect = !invert;
      
      		// Go through the array, only saving the items
      		// that pass the validator function
      		for ( ; i < length; i++ ) {
      			callbackInverse = !callback( elems[ i ], i );
      			if ( callbackInverse !== callbackExpect ) {
      				matches.push( elems[ i ] );
      			}
      		}
      
      		return matches;
      	},
      
      	// arg is for internal usage only
      	map: function( elems, callback, arg ) {
      		var value,
      			i = 0,
      			length = elems.length,
      			isArray = isArraylike( elems ),
      			ret = [];
      
      		// Go through the array, translating each of the items to their new values
      		if ( isArray ) {
      			for ( ; i < length; i++ ) {
      				value = callback( elems[ i ], i, arg );
      
      				if ( value != null ) {
      					ret.push( value );
      				}
      			}
      
      		// Go through every key on the object,
      		} else {
      			for ( i in elems ) {
      				value = callback( elems[ i ], i, arg );
      
      				if ( value != null ) {
      					ret.push( value );
      				}
      			}
      		}
      
      		// Flatten any nested arrays
      		return concat.apply( [], ret );
      	},
      
      	// A global GUID counter for objects
      	guid: 1,
      
      	// Bind a function to a context, optionally partially applying any
      	// arguments.
      	proxy: function( fn, context ) {
      		var tmp, args, proxy;
      
      		if ( typeof context === "string" ) {
      			tmp = fn[ context ];
      			context = fn;
      			fn = tmp;
      		}
      
      		// Quick check to determine if target is callable, in the spec
      		// this throws a TypeError, but we will just return undefined.
      		if ( !jQuery.isFunction( fn ) ) {
      			return undefined;
      		}
      
      		// Simulated bind
      		args = slice.call( arguments, 2 );
      		proxy = function() {
      			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
      		};
      
      		// Set the guid of unique handler to the same of original handler, so it can be removed
      		proxy.guid = fn.guid = fn.guid || jQuery.guid++;
      
      		return proxy;
      	},
      
      	now: Date.now,
      
      	// jQuery.support is not used in Core but other projects attach their
      	// properties to it so it needs to exist.
      	support: support
      });
      
      // Populate the class2type map
      jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
      	class2type[ "[object " + name + "]" ] = name.toLowerCase();
      });
      
      function isArraylike( obj ) {
      
      	// Support: iOS 8.2 (not reproducible in simulator)
      	// `in` check used to prevent JIT error (gh-2145)
      	// hasOwn isn't used here due to false negatives
      	// regarding Nodelist length in IE
      	var length = "length" in obj && obj.length,
      		type = jQuery.type( obj );
      
      	if ( type === "function" || jQuery.isWindow( obj ) ) {
      		return false;
      	}
      
      	if ( obj.nodeType === 1 && length ) {
      		return true;
      	}
      
      	return type === "array" || length === 0 ||
      		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
      }
      var Sizzle =
      /*!
       * Sizzle CSS Selector Engine v2.2.0-pre
       * http://sizzlejs.com/
       *
       * Copyright 2008, 2014 jQuery Foundation, Inc. and other contributors
       * Released under the MIT license
       * http://jquery.org/license
       *
       * Date: 2014-12-16
       */
      (function( window ) {
      
      var i,
      	support,
      	Expr,
      	getText,
      	isXML,
      	tokenize,
      	compile,
      	select,
      	outermostContext,
      	sortInput,
      	hasDuplicate,
      
      	// Local document vars
      	setDocument,
      	document,
      	docElem,
      	documentIsHTML,
      	rbuggyQSA,
      	rbuggyMatches,
      	matches,
      	contains,
      
      	// Instance-specific data
      	expando = "sizzle" + 1 * new Date(),
      	preferredDoc = window.document,
      	dirruns = 0,
      	done = 0,
      	classCache = createCache(),
      	tokenCache = createCache(),
      	compilerCache = createCache(),
      	sortOrder = function( a, b ) {
      		if ( a === b ) {
      			hasDuplicate = true;
      		}
      		return 0;
      	},
      
      	// General-purpose constants
      	MAX_NEGATIVE = 1 << 31,
      
      	// Instance methods
      	hasOwn = ({}).hasOwnProperty,
      	arr = [],
      	pop = arr.pop,
      	push_native = arr.push,
      	push = arr.push,
      	slice = arr.slice,
      	// Use a stripped-down indexOf as it's faster than native
      	// http://jsperf.com/thor-indexof-vs-for/5
      	indexOf = function( list, elem ) {
      		var i = 0,
      			len = list.length;
      		for ( ; i < len; i++ ) {
      			if ( list[i] === elem ) {
      				return i;
      			}
      		}
      		return -1;
      	},
      
      	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",
      
      	// Regular expressions
      
      	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
      	whitespace = "[\\x20\\t\\r\\n\\f]",
      	// http://www.w3.org/TR/css3-syntax/#characters
      	characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",
      
      	// Loosely modeled on CSS identifier characters
      	// An unquoted value should be a CSS identifier http://www.w3.org/TR/css3-selectors/#attribute-selectors
      	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
      	identifier = characterEncoding.replace( "w", "w#" ),
      
      	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
      	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")(?:" + whitespace +
      		// Operator (capture 2)
      		"*([*^$|!~]?=)" + whitespace +
      		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
      		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
      		"*\\]",
      
      	pseudos = ":(" + characterEncoding + ")(?:\\((" +
      		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
      		// 1. quoted (capture 3; capture 4 or capture 5)
      		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
      		// 2. simple (capture 6)
      		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
      		// 3. anything else (capture 2)
      		".*" +
      		")\\)|)",
      
      	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
      	rwhitespace = new RegExp( whitespace + "+", "g" ),
      	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),
      
      	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
      	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),
      
      	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),
      
      	rpseudo = new RegExp( pseudos ),
      	ridentifier = new RegExp( "^" + identifier + "$" ),
      
      	matchExpr = {
      		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
      		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
      		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
      		"ATTR": new RegExp( "^" + attributes ),
      		"PSEUDO": new RegExp( "^" + pseudos ),
      		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
      			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
      			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
      		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
      		// For use in libraries implementing .is()
      		// We use this for POS matching in `select`
      		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
      			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
      	},
      
      	rinputs = /^(?:input|select|textarea|button)$/i,
      	rheader = /^h\d$/i,
      
      	rnative = /^[^{]+\{\s*\[native \w/,
      
      	// Easily-parseable/retrievable ID or TAG or CLASS selectors
      	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
      
      	rsibling = /[+~]/,
      	rescape = /'|\\/g,
      
      	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
      	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
      	funescape = function( _, escaped, escapedWhitespace ) {
      		var high = "0x" + escaped - 0x10000;
      		// NaN means non-codepoint
      		// Support: Firefox<24
      		// Workaround erroneous numeric interpretation of +"0x"
      		return high !== high || escapedWhitespace ?
      			escaped :
      			high < 0 ?
      				// BMP codepoint
      				String.fromCharCode( high + 0x10000 ) :
      				// Supplemental Plane codepoint (surrogate pair)
      				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
      	},
      
      	// Used for iframes
      	// See setDocument()
      	// Removing the function wrapper causes a "Permission Denied"
      	// error in IE
      	unloadHandler = function() {
      		setDocument();
      	};
      
      // Optimize for push.apply( _, NodeList )
      try {
      	push.apply(
      		(arr = slice.call( preferredDoc.childNodes )),
      		preferredDoc.childNodes
      	);
      	// Support: Android<4.0
      	// Detect silently failing push.apply
      	arr[ preferredDoc.childNodes.length ].nodeType;
      } catch ( e ) {
      	push = { apply: arr.length ?
      
      		// Leverage slice if possible
      		function( target, els ) {
      			push_native.apply( target, slice.call(els) );
      		} :
      
      		// Support: IE<9
      		// Otherwise append directly
      		function( target, els ) {
      			var j = target.length,
      				i = 0;
      			// Can't trust NodeList.length
      			while ( (target[j++] = els[i++]) ) {}
      			target.length = j - 1;
      		}
      	};
      }
      
      function Sizzle( selector, context, results, seed ) {
      	var match, elem, m, nodeType,
      		// QSA vars
      		i, groups, old, nid, newContext, newSelector;
      
      	if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
      		setDocument( context );
      	}
      
      	context = context || document;
      	results = results || [];
      	nodeType = context.nodeType;
      
      	if ( typeof selector !== "string" || !selector ||
      		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {
      
      		return results;
      	}
      
      	if ( !seed && documentIsHTML ) {
      
      		// Try to shortcut find operations when possible (e.g., not under DocumentFragment)
      		if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {
      			// Speed-up: Sizzle("#ID")
      			if ( (m = match[1]) ) {
      				if ( nodeType === 9 ) {
      					elem = context.getElementById( m );
      					// Check parentNode to catch when Blackberry 4.6 returns
      					// nodes that are no longer in the document (jQuery #6963)
      					if ( elem && elem.parentNode ) {
      						// Handle the case where IE, Opera, and Webkit return items
      						// by name instead of ID
      						if ( elem.id === m ) {
      							results.push( elem );
      							return results;
      						}
      					} else {
      						return results;
      					}
      				} else {
      					// Context is not a document
      					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
      						contains( context, elem ) && elem.id === m ) {
      						results.push( elem );
      						return results;
      					}
      				}
      
      			// Speed-up: Sizzle("TAG")
      			} else if ( match[2] ) {
      				push.apply( results, context.getElementsByTagName( selector ) );
      				return results;
      
      			// Speed-up: Sizzle(".CLASS")
      			} else if ( (m = match[3]) && support.getElementsByClassName ) {
      				push.apply( results, context.getElementsByClassName( m ) );
      				return results;
      			}
      		}
      
      		// QSA path
      		if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
      			nid = old = expando;
      			newContext = context;
      			newSelector = nodeType !== 1 && selector;
      
      			// qSA works strangely on Element-rooted queries
      			// We can work around this by specifying an extra ID on the root
      			// and working up from there (Thanks to Andrew Dupont for the technique)
      			// IE 8 doesn't work on object elements
      			if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
      				groups = tokenize( selector );
      
      				if ( (old = context.getAttribute("id")) ) {
      					nid = old.replace( rescape, "\\$&" );
      				} else {
      					context.setAttribute( "id", nid );
      				}
      				nid = "[id='" + nid + "'] ";
      
      				i = groups.length;
      				while ( i-- ) {
      					groups[i] = nid + toSelector( groups[i] );
      				}
      				newContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;
      				newSelector = groups.join(",");
      			}
      
      			if ( newSelector ) {
      				try {
      					push.apply( results,
      						newContext.querySelectorAll( newSelector )
      					);
      					return results;
      				} catch(qsaError) {
      				} finally {
      					if ( !old ) {
      						context.removeAttribute("id");
      					}
      				}
      			}
      		}
      	}
      
      	// All others
      	return select( selector.replace( rtrim, "$1" ), context, results, seed );
      }
      
      /**
       * Create key-value caches of limited size
       * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
       *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
       *	deleting the oldest entry
       */
      function createCache() {
      	var keys = [];
      
      	function cache( key, value ) {
      		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
      		if ( keys.push( key + " " ) > Expr.cacheLength ) {
      			// Only keep the most recent entries
      			delete cache[ keys.shift() ];
      		}
      		return (cache[ key + " " ] = value);
      	}
      	return cache;
      }
      
      /**
       * Mark a function for special use by Sizzle
       * @param {Function} fn The function to mark
       */
      function markFunction( fn ) {
      	fn[ expando ] = true;
      	return fn;
      }
      
      /**
       * Support testing using an element
       * @param {Function} fn Passed the created div and expects a boolean result
       */
      function assert( fn ) {
      	var div = document.createElement("div");
      
      	try {
      		return !!fn( div );
      	} catch (e) {
      		return false;
      	} finally {
      		// Remove from its parent by default
      		if ( div.parentNode ) {
      			div.parentNode.removeChild( div );
      		}
      		// release memory in IE
      		div = null;
      	}
      }
      
      /**
       * Adds the same handler for all of the specified attrs
       * @param {String} attrs Pipe-separated list of attributes
       * @param {Function} handler The method that will be applied
       */
      function addHandle( attrs, handler ) {
      	var arr = attrs.split("|"),
      		i = attrs.length;
      
      	while ( i-- ) {
      		Expr.attrHandle[ arr[i] ] = handler;
      	}
      }
      
      /**
       * Checks document order of two siblings
       * @param {Element} a
       * @param {Element} b
       * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
       */
      function siblingCheck( a, b ) {
      	var cur = b && a,
      		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
      			( ~b.sourceIndex || MAX_NEGATIVE ) -
      			( ~a.sourceIndex || MAX_NEGATIVE );
      
      	// Use IE sourceIndex if available on both nodes
      	if ( diff ) {
      		return diff;
      	}
      
      	// Check if b follows a
      	if ( cur ) {
      		while ( (cur = cur.nextSibling) ) {
      			if ( cur === b ) {
      				return -1;
      			}
      		}
      	}
      
      	return a ? 1 : -1;
      }
      
      /**
       * Returns a function to use in pseudos for input types
       * @param {String} type
       */
      function createInputPseudo( type ) {
      	return function( elem ) {
      		var name = elem.nodeName.toLowerCase();
      		return name === "input" && elem.type === type;
      	};
      }
      
      /**
       * Returns a function to use in pseudos for buttons
       * @param {String} type
       */
      function createButtonPseudo( type ) {
      	return function( elem ) {
      		var name = elem.nodeName.toLowerCase();
      		return (name === "input" || name === "button") && elem.type === type;
      	};
      }
      
      /**
       * Returns a function to use in pseudos for positionals
       * @param {Function} fn
       */
      function createPositionalPseudo( fn ) {
      	return markFunction(function( argument ) {
      		argument = +argument;
      		return markFunction(function( seed, matches ) {
      			var j,
      				matchIndexes = fn( [], seed.length, argument ),
      				i = matchIndexes.length;
      
      			// Match elements found at the specified indexes
      			while ( i-- ) {
      				if ( seed[ (j = matchIndexes[i]) ] ) {
      					seed[j] = !(matches[j] = seed[j]);
      				}
      			}
      		});
      	});
      }
      
      /**
       * Checks a node for validity as a Sizzle context
       * @param {Element|Object=} context
       * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
       */
      function testContext( context ) {
      	return context && typeof context.getElementsByTagName !== "undefined" && context;
      }
      
      // Expose support vars for convenience
      support = Sizzle.support = {};
      
      /**
       * Detects XML nodes
       * @param {Element|Object} elem An element or a document
       * @returns {Boolean} True iff elem is a non-HTML XML node
       */
      isXML = Sizzle.isXML = function( elem ) {
      	// documentElement is verified for cases where it doesn't yet exist
      	// (such as loading iframes in IE - #4833)
      	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
      	return documentElement ? documentElement.nodeName !== "HTML" : false;
      };
      
      /**
       * Sets document-related variables once based on the current document
       * @param {Element|Object} [doc] An element or document object to use to set the document
       * @returns {Object} Returns the current document
       */
      setDocument = Sizzle.setDocument = function( node ) {
      	var hasCompare, parent,
      		doc = node ? node.ownerDocument || node : preferredDoc;
      
      	// If no document and documentElement is available, return
      	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
      		return document;
      	}
      
      	// Set our document
      	document = doc;
      	docElem = doc.documentElement;
      	parent = doc.defaultView;
      
      	// Support: IE>8
      	// If iframe document is assigned to "document" variable and if iframe has been reloaded,
      	// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
      	// IE6-8 do not support the defaultView property so parent will be undefined
      	if ( parent && parent !== parent.top ) {
      		// IE11 does not have attachEvent, so all must suffer
      		if ( parent.addEventListener ) {
      			parent.addEventListener( "unload", unloadHandler, false );
      		} else if ( parent.attachEvent ) {
      			parent.attachEvent( "onunload", unloadHandler );
      		}
      	}
      
      	/* Support tests
      	---------------------------------------------------------------------- */
      	documentIsHTML = !isXML( doc );
      
      	/* Attributes
      	---------------------------------------------------------------------- */
      
      	// Support: IE<8
      	// Verify that getAttribute really returns attributes and not properties
      	// (excepting IE8 booleans)
      	support.attributes = assert(function( div ) {
      		div.className = "i";
      		return !div.getAttribute("className");
      	});
      
      	/* getElement(s)By*
      	---------------------------------------------------------------------- */
      
      	// Check if getElementsByTagName("*") returns only elements
      	support.getElementsByTagName = assert(function( div ) {
      		div.appendChild( doc.createComment("") );
      		return !div.getElementsByTagName("*").length;
      	});
      
      	// Support: IE<9
      	support.getElementsByClassName = rnative.test( doc.getElementsByClassName );
      
      	// Support: IE<10
      	// Check if getElementById returns elements by name
      	// The broken getElementById methods don't pick up programatically-set names,
      	// so use a roundabout getElementsByName test
      	support.getById = assert(function( div ) {
      		docElem.appendChild( div ).id = expando;
      		return !doc.getElementsByName || !doc.getElementsByName( expando ).length;
      	});
      
      	// ID find and filter
      	if ( support.getById ) {
      		Expr.find["ID"] = function( id, context ) {
      			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
      				var m = context.getElementById( id );
      				// Check parentNode to catch when Blackberry 4.6 returns
      				// nodes that are no longer in the document #6963
      				return m && m.parentNode ? [ m ] : [];
      			}
      		};
      		Expr.filter["ID"] = function( id ) {
      			var attrId = id.replace( runescape, funescape );
      			return function( elem ) {
      				return elem.getAttribute("id") === attrId;
      			};
      		};
      	} else {
      		// Support: IE6/7
      		// getElementById is not reliable as a find shortcut
      		delete Expr.find["ID"];
      
      		Expr.filter["ID"] =  function( id ) {
      			var attrId = id.replace( runescape, funescape );
      			return function( elem ) {
      				var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
      				return node && node.value === attrId;
      			};
      		};
      	}
      
      	// Tag
      	Expr.find["TAG"] = support.getElementsByTagName ?
      		function( tag, context ) {
      			if ( typeof context.getElementsByTagName !== "undefined" ) {
      				return context.getElementsByTagName( tag );
      
      			// DocumentFragment nodes don't have gEBTN
      			} else if ( support.qsa ) {
      				return context.querySelectorAll( tag );
      			}
      		} :
      
      		function( tag, context ) {
      			var elem,
      				tmp = [],
      				i = 0,
      				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
      				results = context.getElementsByTagName( tag );
      
      			// Filter out possible comments
      			if ( tag === "*" ) {
      				while ( (elem = results[i++]) ) {
      					if ( elem.nodeType === 1 ) {
      						tmp.push( elem );
      					}
      				}
      
      				return tmp;
      			}
      			return results;
      		};
      
      	// Class
      	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
      		if ( documentIsHTML ) {
      			return context.getElementsByClassName( className );
      		}
      	};
      
      	/* QSA/matchesSelector
      	---------------------------------------------------------------------- */
      
      	// QSA and matchesSelector support
      
      	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
      	rbuggyMatches = [];
      
      	// qSa(:focus) reports false when true (Chrome 21)
      	// We allow this because of a bug in IE8/9 that throws an error
      	// whenever `document.activeElement` is accessed on an iframe
      	// So, we allow :focus to pass through QSA all the time to avoid the IE error
      	// See http://bugs.jquery.com/ticket/13378
      	rbuggyQSA = [];
      
      	if ( (support.qsa = rnative.test( doc.querySelectorAll )) ) {
      		// Build QSA regex
      		// Regex strategy adopted from Diego Perini
      		assert(function( div ) {
      			// Select is set to empty string on purpose
      			// This is to test IE's treatment of not explicitly
      			// setting a boolean content attribute,
      			// since its presence should be enough
      			// http://bugs.jquery.com/ticket/12359
      			docElem.appendChild( div ).innerHTML = "<a id='" + expando + "'></a>" +
      				"<select id='" + expando + "-\f]' msallowcapture=''>" +
      				"<option selected=''></option></select>";
      
      			// Support: IE8, Opera 11-12.16
      			// Nothing should be selected when empty strings follow ^= or $= or *=
      			// The test attribute must be unknown in Opera but "safe" for WinRT
      			// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
      			if ( div.querySelectorAll("[msallowcapture^='']").length ) {
      				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
      			}
      
      			// Support: IE8
      			// Boolean attributes and "value" are not treated correctly
      			if ( !div.querySelectorAll("[selected]").length ) {
      				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
      			}
      
      			// Support: Chrome<29, Android<4.2+, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.7+
      			if ( !div.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
      				rbuggyQSA.push("~=");
      			}
      
      			// Webkit/Opera - :checked should return selected option elements
      			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
      			// IE8 throws error here and will not see later tests
      			if ( !div.querySelectorAll(":checked").length ) {
      				rbuggyQSA.push(":checked");
      			}
      
      			// Support: Safari 8+, iOS 8+
      			// https://bugs.webkit.org/show_bug.cgi?id=136851
      			// In-page `selector#id sibing-combinator selector` fails
      			if ( !div.querySelectorAll( "a#" + expando + "+*" ).length ) {
      				rbuggyQSA.push(".#.+[+~]");
      			}
      		});
      
      		assert(function( div ) {
      			// Support: Windows 8 Native Apps
      			// The type and name attributes are restricted during .innerHTML assignment
      			var input = doc.createElement("input");
      			input.setAttribute( "type", "hidden" );
      			div.appendChild( input ).setAttribute( "name", "D" );
      
      			// Support: IE8
      			// Enforce case-sensitivity of name attribute
      			if ( div.querySelectorAll("[name=d]").length ) {
      				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
      			}
      
      			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
      			// IE8 throws error here and will not see later tests
      			if ( !div.querySelectorAll(":enabled").length ) {
      				rbuggyQSA.push( ":enabled", ":disabled" );
      			}
      
      			// Opera 10-11 does not throw on post-comma invalid pseudos
      			div.querySelectorAll("*,:x");
      			rbuggyQSA.push(",.*:");
      		});
      	}
      
      	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
      		docElem.webkitMatchesSelector ||
      		docElem.mozMatchesSelector ||
      		docElem.oMatchesSelector ||
      		docElem.msMatchesSelector) )) ) {
      
      		assert(function( div ) {
      			// Check to see if it's possible to do matchesSelector
      			// on a disconnected node (IE 9)
      			support.disconnectedMatch = matches.call( div, "div" );
      
      			// This should fail with an exception
      			// Gecko does not error, returns false instead
      			matches.call( div, "[s!='']:x" );
      			rbuggyMatches.push( "!=", pseudos );
      		});
      	}
      
      	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
      	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );
      
      	/* Contains
      	---------------------------------------------------------------------- */
      	hasCompare = rnative.test( docElem.compareDocumentPosition );
      
      	// Element contains another
      	// Purposefully does not implement inclusive descendent
      	// As in, an element does not contain itself
      	contains = hasCompare || rnative.test( docElem.contains ) ?
      		function( a, b ) {
      			var adown = a.nodeType === 9 ? a.documentElement : a,
      				bup = b && b.parentNode;
      			return a === bup || !!( bup && bup.nodeType === 1 && (
      				adown.contains ?
      					adown.contains( bup ) :
      					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
      			));
      		} :
      		function( a, b ) {
      			if ( b ) {
      				while ( (b = b.parentNode) ) {
      					if ( b === a ) {
      						return true;
      					}
      				}
      			}
      			return false;
      		};
      
      	/* Sorting
      	---------------------------------------------------------------------- */
      
      	// Document order sorting
      	sortOrder = hasCompare ?
      	function( a, b ) {
      
      		// Flag for duplicate removal
      		if ( a === b ) {
      			hasDuplicate = true;
      			return 0;
      		}
      
      		// Sort on method existence if only one input has compareDocumentPosition
      		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
      		if ( compare ) {
      			return compare;
      		}
      
      		// Calculate position if both inputs belong to the same document
      		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
      			a.compareDocumentPosition( b ) :
      
      			// Otherwise we know they are disconnected
      			1;
      
      		// Disconnected nodes
      		if ( compare & 1 ||
      			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {
      
      			// Choose the first element that is related to our preferred document
      			if ( a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
      				return -1;
      			}
      			if ( b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
      				return 1;
      			}
      
      			// Maintain original order
      			return sortInput ?
      				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
      				0;
      		}
      
      		return compare & 4 ? -1 : 1;
      	} :
      	function( a, b ) {
      		// Exit early if the nodes are identical
      		if ( a === b ) {
      			hasDuplicate = true;
      			return 0;
      		}
      
      		var cur,
      			i = 0,
      			aup = a.parentNode,
      			bup = b.parentNode,
      			ap = [ a ],
      			bp = [ b ];
      
      		// Parentless nodes are either documents or disconnected
      		if ( !aup || !bup ) {
      			return a === doc ? -1 :
      				b === doc ? 1 :
      				aup ? -1 :
      				bup ? 1 :
      				sortInput ?
      				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
      				0;
      
      		// If the nodes are siblings, we can do a quick check
      		} else if ( aup === bup ) {
      			return siblingCheck( a, b );
      		}
      
      		// Otherwise we need full lists of their ancestors for comparison
      		cur = a;
      		while ( (cur = cur.parentNode) ) {
      			ap.unshift( cur );
      		}
      		cur = b;
      		while ( (cur = cur.parentNode) ) {
      			bp.unshift( cur );
      		}
      
      		// Walk down the tree looking for a discrepancy
      		while ( ap[i] === bp[i] ) {
      			i++;
      		}
      
      		return i ?
      			// Do a sibling check if the nodes have a common ancestor
      			siblingCheck( ap[i], bp[i] ) :
      
      			// Otherwise nodes in our document sort first
      			ap[i] === preferredDoc ? -1 :
      			bp[i] === preferredDoc ? 1 :
      			0;
      	};
      
      	return doc;
      };
      
      Sizzle.matches = function( expr, elements ) {
      	return Sizzle( expr, null, null, elements );
      };
      
      Sizzle.matchesSelector = function( elem, expr ) {
      	// Set document vars if needed
      	if ( ( elem.ownerDocument || elem ) !== document ) {
      		setDocument( elem );
      	}
      
      	// Make sure that attribute selectors are quoted
      	expr = expr.replace( rattributeQuotes, "='$1']" );
      
      	if ( support.matchesSelector && documentIsHTML &&
      		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
      		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {
      
      		try {
      			var ret = matches.call( elem, expr );
      
      			// IE 9's matchesSelector returns false on disconnected nodes
      			if ( ret || support.disconnectedMatch ||
      					// As well, disconnected nodes are said to be in a document
      					// fragment in IE 9
      					elem.document && elem.document.nodeType !== 11 ) {
      				return ret;
      			}
      		} catch (e) {}
      	}
      
      	return Sizzle( expr, document, null, [ elem ] ).length > 0;
      };
      
      Sizzle.contains = function( context, elem ) {
      	// Set document vars if needed
      	if ( ( context.ownerDocument || context ) !== document ) {
      		setDocument( context );
      	}
      	return contains( context, elem );
      };
      
      Sizzle.attr = function( elem, name ) {
      	// Set document vars if needed
      	if ( ( elem.ownerDocument || elem ) !== document ) {
      		setDocument( elem );
      	}
      
      	var fn = Expr.attrHandle[ name.toLowerCase() ],
      		// Don't get fooled by Object.prototype properties (jQuery #13807)
      		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
      			fn( elem, name, !documentIsHTML ) :
      			undefined;
      
      	return val !== undefined ?
      		val :
      		support.attributes || !documentIsHTML ?
      			elem.getAttribute( name ) :
      			(val = elem.getAttributeNode(name)) && val.specified ?
      				val.value :
      				null;
      };
      
      Sizzle.error = function( msg ) {
      	throw new Error( "Syntax error, unrecognized expression: " + msg );
      };
      
      /**
       * Document sorting and removing duplicates
       * @param {ArrayLike} results
       */
      Sizzle.uniqueSort = function( results ) {
      	var elem,
      		duplicates = [],
      		j = 0,
      		i = 0;
      
      	// Unless we *know* we can detect duplicates, assume their presence
      	hasDuplicate = !support.detectDuplicates;
      	sortInput = !support.sortStable && results.slice( 0 );
      	results.sort( sortOrder );
      
      	if ( hasDuplicate ) {
      		while ( (elem = results[i++]) ) {
      			if ( elem === results[ i ] ) {
      				j = duplicates.push( i );
      			}
      		}
      		while ( j-- ) {
      			results.splice( duplicates[ j ], 1 );
      		}
      	}
      
      	// Clear input after sorting to release objects
      	// See https://github.com/jquery/sizzle/pull/225
      	sortInput = null;
      
      	return results;
      };
      
      /**
       * Utility function for retrieving the text value of an array of DOM nodes
       * @param {Array|Element} elem
       */
      getText = Sizzle.getText = function( elem ) {
      	var node,
      		ret = "",
      		i = 0,
      		nodeType = elem.nodeType;
      
      	if ( !nodeType ) {
      		// If no nodeType, this is expected to be an array
      		while ( (node = elem[i++]) ) {
      			// Do not traverse comment nodes
      			ret += getText( node );
      		}
      	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
      		// Use textContent for elements
      		// innerText usage removed for consistency of new lines (jQuery #11153)
      		if ( typeof elem.textContent === "string" ) {
      			return elem.textContent;
      		} else {
      			// Traverse its children
      			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
      				ret += getText( elem );
      			}
      		}
      	} else if ( nodeType === 3 || nodeType === 4 ) {
      		return elem.nodeValue;
      	}
      	// Do not include comment or processing instruction nodes
      
      	return ret;
      };
      
      Expr = Sizzle.selectors = {
      
      	// Can be adjusted by the user
      	cacheLength: 50,
      
      	createPseudo: markFunction,
      
      	match: matchExpr,
      
      	attrHandle: {},
      
      	find: {},
      
      	relative: {
      		">": { dir: "parentNode", first: true },
      		" ": { dir: "parentNode" },
      		"+": { dir: "previousSibling", first: true },
      		"~": { dir: "previousSibling" }
      	},
      
      	preFilter: {
      		"ATTR": function( match ) {
      			match[1] = match[1].replace( runescape, funescape );
      
      			// Move the given value to match[3] whether quoted or unquoted
      			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );
      
      			if ( match[2] === "~=" ) {
      				match[3] = " " + match[3] + " ";
      			}
      
      			return match.slice( 0, 4 );
      		},
      
      		"CHILD": function( match ) {
      			/* matches from matchExpr["CHILD"]
      				1 type (only|nth|...)
      				2 what (child|of-type)
      				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
      				4 xn-component of xn+y argument ([+-]?\d*n|)
      				5 sign of xn-component
      				6 x of xn-component
      				7 sign of y-component
      				8 y of y-component
      			*/
      			match[1] = match[1].toLowerCase();
      
      			if ( match[1].slice( 0, 3 ) === "nth" ) {
      				// nth-* requires argument
      				if ( !match[3] ) {
      					Sizzle.error( match[0] );
      				}
      
      				// numeric x and y parameters for Expr.filter.CHILD
      				// remember that false/true cast respectively to 0/1
      				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
      				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );
      
      			// other types prohibit arguments
      			} else if ( match[3] ) {
      				Sizzle.error( match[0] );
      			}
      
      			return match;
      		},
      
      		"PSEUDO": function( match ) {
      			var excess,
      				unquoted = !match[6] && match[2];
      
      			if ( matchExpr["CHILD"].test( match[0] ) ) {
      				return null;
      			}
      
      			// Accept quoted arguments as-is
      			if ( match[3] ) {
      				match[2] = match[4] || match[5] || "";
      
      			// Strip excess characters from unquoted arguments
      			} else if ( unquoted && rpseudo.test( unquoted ) &&
      				// Get excess from tokenize (recursively)
      				(excess = tokenize( unquoted, true )) &&
      				// advance to the next closing parenthesis
      				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {
      
      				// excess is a negative index
      				match[0] = match[0].slice( 0, excess );
      				match[2] = unquoted.slice( 0, excess );
      			}
      
      			// Return only captures needed by the pseudo filter method (type and argument)
      			return match.slice( 0, 3 );
      		}
      	},
      
      	filter: {
      
      		"TAG": function( nodeNameSelector ) {
      			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
      			return nodeNameSelector === "*" ?
      				function() { return true; } :
      				function( elem ) {
      					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
      				};
      		},
      
      		"CLASS": function( className ) {
      			var pattern = classCache[ className + " " ];
      
      			return pattern ||
      				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
      				classCache( className, function( elem ) {
      					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
      				});
      		},
      
      		"ATTR": function( name, operator, check ) {
      			return function( elem ) {
      				var result = Sizzle.attr( elem, name );
      
      				if ( result == null ) {
      					return operator === "!=";
      				}
      				if ( !operator ) {
      					return true;
      				}
      
      				result += "";
      
      				return operator === "=" ? result === check :
      					operator === "!=" ? result !== check :
      					operator === "^=" ? check && result.indexOf( check ) === 0 :
      					operator === "*=" ? check && result.indexOf( check ) > -1 :
      					operator === "$=" ? check && result.slice( -check.length ) === check :
      					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
      					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
      					false;
      			};
      		},
      
      		"CHILD": function( type, what, argument, first, last ) {
      			var simple = type.slice( 0, 3 ) !== "nth",
      				forward = type.slice( -4 ) !== "last",
      				ofType = what === "of-type";
      
      			return first === 1 && last === 0 ?
      
      				// Shortcut for :nth-*(n)
      				function( elem ) {
      					return !!elem.parentNode;
      				} :
      
      				function( elem, context, xml ) {
      					var cache, outerCache, node, diff, nodeIndex, start,
      						dir = simple !== forward ? "nextSibling" : "previousSibling",
      						parent = elem.parentNode,
      						name = ofType && elem.nodeName.toLowerCase(),
      						useCache = !xml && !ofType;
      
      					if ( parent ) {
      
      						// :(first|last|only)-(child|of-type)
      						if ( simple ) {
      							while ( dir ) {
      								node = elem;
      								while ( (node = node[ dir ]) ) {
      									if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
      										return false;
      									}
      								}
      								// Reverse direction for :only-* (if we haven't yet done so)
      								start = dir = type === "only" && !start && "nextSibling";
      							}
      							return true;
      						}
      
      						start = [ forward ? parent.firstChild : parent.lastChild ];
      
      						// non-xml :nth-child(...) stores cache data on `parent`
      						if ( forward && useCache ) {
      							// Seek `elem` from a previously-cached index
      							outerCache = parent[ expando ] || (parent[ expando ] = {});
      							cache = outerCache[ type ] || [];
      							nodeIndex = cache[0] === dirruns && cache[1];
      							diff = cache[0] === dirruns && cache[2];
      							node = nodeIndex && parent.childNodes[ nodeIndex ];
      
      							while ( (node = ++nodeIndex && node && node[ dir ] ||
      
      								// Fallback to seeking `elem` from the start
      								(diff = nodeIndex = 0) || start.pop()) ) {
      
      								// When found, cache indexes on `parent` and break
      								if ( node.nodeType === 1 && ++diff && node === elem ) {
      									outerCache[ type ] = [ dirruns, nodeIndex, diff ];
      									break;
      								}
      							}
      
      						// Use previously-cached element index if available
      						} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
      							diff = cache[1];
      
      						// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
      						} else {
      							// Use the same loop as above to seek `elem` from the start
      							while ( (node = ++nodeIndex && node && node[ dir ] ||
      								(diff = nodeIndex = 0) || start.pop()) ) {
      
      								if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
      									// Cache the index of each encountered element
      									if ( useCache ) {
      										(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
      									}
      
      									if ( node === elem ) {
      										break;
      									}
      								}
      							}
      						}
      
      						// Incorporate the offset, then check against cycle size
      						diff -= last;
      						return diff === first || ( diff % first === 0 && diff / first >= 0 );
      					}
      				};
      		},
      
      		"PSEUDO": function( pseudo, argument ) {
      			// pseudo-class names are case-insensitive
      			// http://www.w3.org/TR/selectors/#pseudo-classes
      			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
      			// Remember that setFilters inherits from pseudos
      			var args,
      				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
      					Sizzle.error( "unsupported pseudo: " + pseudo );
      
      			// The user may use createPseudo to indicate that
      			// arguments are needed to create the filter function
      			// just as Sizzle does
      			if ( fn[ expando ] ) {
      				return fn( argument );
      			}
      
      			// But maintain support for old signatures
      			if ( fn.length > 1 ) {
      				args = [ pseudo, pseudo, "", argument ];
      				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
      					markFunction(function( seed, matches ) {
      						var idx,
      							matched = fn( seed, argument ),
      							i = matched.length;
      						while ( i-- ) {
      							idx = indexOf( seed, matched[i] );
      							seed[ idx ] = !( matches[ idx ] = matched[i] );
      						}
      					}) :
      					function( elem ) {
      						return fn( elem, 0, args );
      					};
      			}
      
      			return fn;
      		}
      	},
      
      	pseudos: {
      		// Potentially complex pseudos
      		"not": markFunction(function( selector ) {
      			// Trim the selector passed to compile
      			// to avoid treating leading and trailing
      			// spaces as combinators
      			var input = [],
      				results = [],
      				matcher = compile( selector.replace( rtrim, "$1" ) );
      
      			return matcher[ expando ] ?
      				markFunction(function( seed, matches, context, xml ) {
      					var elem,
      						unmatched = matcher( seed, null, xml, [] ),
      						i = seed.length;
      
      					// Match elements unmatched by `matcher`
      					while ( i-- ) {
      						if ( (elem = unmatched[i]) ) {
      							seed[i] = !(matches[i] = elem);
      						}
      					}
      				}) :
      				function( elem, context, xml ) {
      					input[0] = elem;
      					matcher( input, null, xml, results );
      					// Don't keep the element (issue #299)
      					input[0] = null;
      					return !results.pop();
      				};
      		}),
      
      		"has": markFunction(function( selector ) {
      			return function( elem ) {
      				return Sizzle( selector, elem ).length > 0;
      			};
      		}),
      
      		"contains": markFunction(function( text ) {
      			text = text.replace( runescape, funescape );
      			return function( elem ) {
      				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
      			};
      		}),
      
      		// "Whether an element is represented by a :lang() selector
      		// is based solely on the element's language value
      		// being equal to the identifier C,
      		// or beginning with the identifier C immediately followed by "-".
      		// The matching of C against the element's language value is performed case-insensitively.
      		// The identifier C does not have to be a valid language name."
      		// http://www.w3.org/TR/selectors/#lang-pseudo
      		"lang": markFunction( function( lang ) {
      			// lang value must be a valid identifier
      			if ( !ridentifier.test(lang || "") ) {
      				Sizzle.error( "unsupported lang: " + lang );
      			}
      			lang = lang.replace( runescape, funescape ).toLowerCase();
      			return function( elem ) {
      				var elemLang;
      				do {
      					if ( (elemLang = documentIsHTML ?
      						elem.lang :
      						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {
      
      						elemLang = elemLang.toLowerCase();
      						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
      					}
      				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
      				return false;
      			};
      		}),
      
      		// Miscellaneous
      		"target": function( elem ) {
      			var hash = window.location && window.location.hash;
      			return hash && hash.slice( 1 ) === elem.id;
      		},
      
      		"root": function( elem ) {
      			return elem === docElem;
      		},
      
      		"focus": function( elem ) {
      			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
      		},
      
      		// Boolean properties
      		"enabled": function( elem ) {
      			return elem.disabled === false;
      		},
      
      		"disabled": function( elem ) {
      			return elem.disabled === true;
      		},
      
      		"checked": function( elem ) {
      			// In CSS3, :checked should return both checked and selected elements
      			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
      			var nodeName = elem.nodeName.toLowerCase();
      			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
      		},
      
      		"selected": function( elem ) {
      			// Accessing this property makes selected-by-default
      			// options in Safari work properly
      			if ( elem.parentNode ) {
      				elem.parentNode.selectedIndex;
      			}
      
      			return elem.selected === true;
      		},
      
      		// Contents
      		"empty": function( elem ) {
      			// http://www.w3.org/TR/selectors/#empty-pseudo
      			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
      			//   but not by others (comment: 8; processing instruction: 7; etc.)
      			// nodeType < 6 works because attributes (2) do not appear as children
      			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
      				if ( elem.nodeType < 6 ) {
      					return false;
      				}
      			}
      			return true;
      		},
      
      		"parent": function( elem ) {
      			return !Expr.pseudos["empty"]( elem );
      		},
      
      		// Element/input types
      		"header": function( elem ) {
      			return rheader.test( elem.nodeName );
      		},
      
      		"input": function( elem ) {
      			return rinputs.test( elem.nodeName );
      		},
      
      		"button": function( elem ) {
      			var name = elem.nodeName.toLowerCase();
      			return name === "input" && elem.type === "button" || name === "button";
      		},
      
      		"text": function( elem ) {
      			var attr;
      			return elem.nodeName.toLowerCase() === "input" &&
      				elem.type === "text" &&
      
      				// Support: IE<8
      				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
      				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
      		},
      
      		// Position-in-collection
      		"first": createPositionalPseudo(function() {
      			return [ 0 ];
      		}),
      
      		"last": createPositionalPseudo(function( matchIndexes, length ) {
      			return [ length - 1 ];
      		}),
      
      		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
      			return [ argument < 0 ? argument + length : argument ];
      		}),
      
      		"even": createPositionalPseudo(function( matchIndexes, length ) {
      			var i = 0;
      			for ( ; i < length; i += 2 ) {
      				matchIndexes.push( i );
      			}
      			return matchIndexes;
      		}),
      
      		"odd": createPositionalPseudo(function( matchIndexes, length ) {
      			var i = 1;
      			for ( ; i < length; i += 2 ) {
      				matchIndexes.push( i );
      			}
      			return matchIndexes;
      		}),
      
      		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
      			var i = argument < 0 ? argument + length : argument;
      			for ( ; --i >= 0; ) {
      				matchIndexes.push( i );
      			}
      			return matchIndexes;
      		}),
      
      		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
      			var i = argument < 0 ? argument + length : argument;
      			for ( ; ++i < length; ) {
      				matchIndexes.push( i );
      			}
      			return matchIndexes;
      		})
      	}
      };
      
      Expr.pseudos["nth"] = Expr.pseudos["eq"];
      
      // Add button/input type pseudos
      for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
      	Expr.pseudos[ i ] = createInputPseudo( i );
      }
      for ( i in { submit: true, reset: true } ) {
      	Expr.pseudos[ i ] = createButtonPseudo( i );
      }
      
      // Easy API for creating new setFilters
      function setFilters() {}
      setFilters.prototype = Expr.filters = Expr.pseudos;
      Expr.setFilters = new setFilters();
      
      tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
      	var matched, match, tokens, type,
      		soFar, groups, preFilters,
      		cached = tokenCache[ selector + " " ];
      
      	if ( cached ) {
      		return parseOnly ? 0 : cached.slice( 0 );
      	}
      
      	soFar = selector;
      	groups = [];
      	preFilters = Expr.preFilter;
      
      	while ( soFar ) {
      
      		// Comma and first run
      		if ( !matched || (match = rcomma.exec( soFar )) ) {
      			if ( match ) {
      				// Don't consume trailing commas as valid
      				soFar = soFar.slice( match[0].length ) || soFar;
      			}
      			groups.push( (tokens = []) );
      		}
      
      		matched = false;
      
      		// Combinators
      		if ( (match = rcombinators.exec( soFar )) ) {
      			matched = match.shift();
      			tokens.push({
      				value: matched,
      				// Cast descendant combinators to space
      				type: match[0].replace( rtrim, " " )
      			});
      			soFar = soFar.slice( matched.length );
      		}
      
      		// Filters
      		for ( type in Expr.filter ) {
      			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
      				(match = preFilters[ type ]( match ))) ) {
      				matched = match.shift();
      				tokens.push({
      					value: matched,
      					type: type,
      					matches: match
      				});
      				soFar = soFar.slice( matched.length );
      			}
      		}
      
      		if ( !matched ) {
      			break;
      		}
      	}
      
      	// Return the length of the invalid excess
      	// if we're just parsing
      	// Otherwise, throw an error or return tokens
      	return parseOnly ?
      		soFar.length :
      		soFar ?
      			Sizzle.error( selector ) :
      			// Cache the tokens
      			tokenCache( selector, groups ).slice( 0 );
      };
      
      function toSelector( tokens ) {
      	var i = 0,
      		len = tokens.length,
      		selector = "";
      	for ( ; i < len; i++ ) {
      		selector += tokens[i].value;
      	}
      	return selector;
      }
      
      function addCombinator( matcher, combinator, base ) {
      	var dir = combinator.dir,
      		checkNonElements = base && dir === "parentNode",
      		doneName = done++;
      
      	return combinator.first ?
      		// Check against closest ancestor/preceding element
      		function( elem, context, xml ) {
      			while ( (elem = elem[ dir ]) ) {
      				if ( elem.nodeType === 1 || checkNonElements ) {
      					return matcher( elem, context, xml );
      				}
      			}
      		} :
      
      		// Check against all ancestor/preceding elements
      		function( elem, context, xml ) {
      			var oldCache, outerCache,
      				newCache = [ dirruns, doneName ];
      
      			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
      			if ( xml ) {
      				while ( (elem = elem[ dir ]) ) {
      					if ( elem.nodeType === 1 || checkNonElements ) {
      						if ( matcher( elem, context, xml ) ) {
      							return true;
      						}
      					}
      				}
      			} else {
      				while ( (elem = elem[ dir ]) ) {
      					if ( elem.nodeType === 1 || checkNonElements ) {
      						outerCache = elem[ expando ] || (elem[ expando ] = {});
      						if ( (oldCache = outerCache[ dir ]) &&
      							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {
      
      							// Assign to newCache so results back-propagate to previous elements
      							return (newCache[ 2 ] = oldCache[ 2 ]);
      						} else {
      							// Reuse newcache so results back-propagate to previous elements
      							outerCache[ dir ] = newCache;
      
      							// A match means we're done; a fail means we have to keep checking
      							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
      								return true;
      							}
      						}
      					}
      				}
      			}
      		};
      }
      
      function elementMatcher( matchers ) {
      	return matchers.length > 1 ?
      		function( elem, context, xml ) {
      			var i = matchers.length;
      			while ( i-- ) {
      				if ( !matchers[i]( elem, context, xml ) ) {
      					return false;
      				}
      			}
      			return true;
      		} :
      		matchers[0];
      }
      
      function multipleContexts( selector, contexts, results ) {
      	var i = 0,
      		len = contexts.length;
      	for ( ; i < len; i++ ) {
      		Sizzle( selector, contexts[i], results );
      	}
      	return results;
      }
      
      function condense( unmatched, map, filter, context, xml ) {
      	var elem,
      		newUnmatched = [],
      		i = 0,
      		len = unmatched.length,
      		mapped = map != null;
      
      	for ( ; i < len; i++ ) {
      		if ( (elem = unmatched[i]) ) {
      			if ( !filter || filter( elem, context, xml ) ) {
      				newUnmatched.push( elem );
      				if ( mapped ) {
      					map.push( i );
      				}
      			}
      		}
      	}
      
      	return newUnmatched;
      }
      
      function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
      	if ( postFilter && !postFilter[ expando ] ) {
      		postFilter = setMatcher( postFilter );
      	}
      	if ( postFinder && !postFinder[ expando ] ) {
      		postFinder = setMatcher( postFinder, postSelector );
      	}
      	return markFunction(function( seed, results, context, xml ) {
      		var temp, i, elem,
      			preMap = [],
      			postMap = [],
      			preexisting = results.length,
      
      			// Get initial elements from seed or context
      			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),
      
      			// Prefilter to get matcher input, preserving a map for seed-results synchronization
      			matcherIn = preFilter && ( seed || !selector ) ?
      				condense( elems, preMap, preFilter, context, xml ) :
      				elems,
      
      			matcherOut = matcher ?
      				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
      				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?
      
      					// ...intermediate processing is necessary
      					[] :
      
      					// ...otherwise use results directly
      					results :
      				matcherIn;
      
      		// Find primary matches
      		if ( matcher ) {
      			matcher( matcherIn, matcherOut, context, xml );
      		}
      
      		// Apply postFilter
      		if ( postFilter ) {
      			temp = condense( matcherOut, postMap );
      			postFilter( temp, [], context, xml );
      
      			// Un-match failing elements by moving them back to matcherIn
      			i = temp.length;
      			while ( i-- ) {
      				if ( (elem = temp[i]) ) {
      					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
      				}
      			}
      		}
      
      		if ( seed ) {
      			if ( postFinder || preFilter ) {
      				if ( postFinder ) {
      					// Get the final matcherOut by condensing this intermediate into postFinder contexts
      					temp = [];
      					i = matcherOut.length;
      					while ( i-- ) {
      						if ( (elem = matcherOut[i]) ) {
      							// Restore matcherIn since elem is not yet a final match
      							temp.push( (matcherIn[i] = elem) );
      						}
      					}
      					postFinder( null, (matcherOut = []), temp, xml );
      				}
      
      				// Move matched elements from seed to results to keep them synchronized
      				i = matcherOut.length;
      				while ( i-- ) {
      					if ( (elem = matcherOut[i]) &&
      						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {
      
      						seed[temp] = !(results[temp] = elem);
      					}
      				}
      			}
      
      		// Add elements to results, through postFinder if defined
      		} else {
      			matcherOut = condense(
      				matcherOut === results ?
      					matcherOut.splice( preexisting, matcherOut.length ) :
      					matcherOut
      			);
      			if ( postFinder ) {
      				postFinder( null, results, matcherOut, xml );
      			} else {
      				push.apply( results, matcherOut );
      			}
      		}
      	});
      }
      
      function matcherFromTokens( tokens ) {
      	var checkContext, matcher, j,
      		len = tokens.length,
      		leadingRelative = Expr.relative[ tokens[0].type ],
      		implicitRelative = leadingRelative || Expr.relative[" "],
      		i = leadingRelative ? 1 : 0,
      
      		// The foundational matcher ensures that elements are reachable from top-level context(s)
      		matchContext = addCombinator( function( elem ) {
      			return elem === checkContext;
      		}, implicitRelative, true ),
      		matchAnyContext = addCombinator( function( elem ) {
      			return indexOf( checkContext, elem ) > -1;
      		}, implicitRelative, true ),
      		matchers = [ function( elem, context, xml ) {
      			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
      				(checkContext = context).nodeType ?
      					matchContext( elem, context, xml ) :
      					matchAnyContext( elem, context, xml ) );
      			// Avoid hanging onto element (issue #299)
      			checkContext = null;
      			return ret;
      		} ];
      
      	for ( ; i < len; i++ ) {
      		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
      			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
      		} else {
      			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );
      
      			// Return special upon seeing a positional matcher
      			if ( matcher[ expando ] ) {
      				// Find the next relative operator (if any) for proper handling
      				j = ++i;
      				for ( ; j < len; j++ ) {
      					if ( Expr.relative[ tokens[j].type ] ) {
      						break;
      					}
      				}
      				return setMatcher(
      					i > 1 && elementMatcher( matchers ),
      					i > 1 && toSelector(
      						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
      						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
      					).replace( rtrim, "$1" ),
      					matcher,
      					i < j && matcherFromTokens( tokens.slice( i, j ) ),
      					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
      					j < len && toSelector( tokens )
      				);
      			}
      			matchers.push( matcher );
      		}
      	}
      
      	return elementMatcher( matchers );
      }
      
      function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
      	var bySet = setMatchers.length > 0,
      		byElement = elementMatchers.length > 0,
      		superMatcher = function( seed, context, xml, results, outermost ) {
      			var elem, j, matcher,
      				matchedCount = 0,
      				i = "0",
      				unmatched = seed && [],
      				setMatched = [],
      				contextBackup = outermostContext,
      				// We must always have either seed elements or outermost context
      				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
      				// Use integer dirruns iff this is the outermost matcher
      				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
      				len = elems.length;
      
      			if ( outermost ) {
      				outermostContext = context !== document && context;
      			}
      
      			// Add elements passing elementMatchers directly to results
      			// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
      			// Support: IE<9, Safari
      			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
      			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
      				if ( byElement && elem ) {
      					j = 0;
      					while ( (matcher = elementMatchers[j++]) ) {
      						if ( matcher( elem, context, xml ) ) {
      							results.push( elem );
      							break;
      						}
      					}
      					if ( outermost ) {
      						dirruns = dirrunsUnique;
      					}
      				}
      
      				// Track unmatched elements for set filters
      				if ( bySet ) {
      					// They will have gone through all possible matchers
      					if ( (elem = !matcher && elem) ) {
      						matchedCount--;
      					}
      
      					// Lengthen the array for every element, matched or not
      					if ( seed ) {
      						unmatched.push( elem );
      					}
      				}
      			}
      
      			// Apply set filters to unmatched elements
      			matchedCount += i;
      			if ( bySet && i !== matchedCount ) {
      				j = 0;
      				while ( (matcher = setMatchers[j++]) ) {
      					matcher( unmatched, setMatched, context, xml );
      				}
      
      				if ( seed ) {
      					// Reintegrate element matches to eliminate the need for sorting
      					if ( matchedCount > 0 ) {
      						while ( i-- ) {
      							if ( !(unmatched[i] || setMatched[i]) ) {
      								setMatched[i] = pop.call( results );
      							}
      						}
      					}
      
      					// Discard index placeholder values to get only actual matches
      					setMatched = condense( setMatched );
      				}
      
      				// Add matches to results
      				push.apply( results, setMatched );
      
      				// Seedless set matches succeeding multiple successful matchers stipulate sorting
      				if ( outermost && !seed && setMatched.length > 0 &&
      					( matchedCount + setMatchers.length ) > 1 ) {
      
      					Sizzle.uniqueSort( results );
      				}
      			}
      
      			// Override manipulation of globals by nested matchers
      			if ( outermost ) {
      				dirruns = dirrunsUnique;
      				outermostContext = contextBackup;
      			}
      
      			return unmatched;
      		};
      
      	return bySet ?
      		markFunction( superMatcher ) :
      		superMatcher;
      }
      
      compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
      	var i,
      		setMatchers = [],
      		elementMatchers = [],
      		cached = compilerCache[ selector + " " ];
      
      	if ( !cached ) {
      		// Generate a function of recursive functions that can be used to check each element
      		if ( !match ) {
      			match = tokenize( selector );
      		}
      		i = match.length;
      		while ( i-- ) {
      			cached = matcherFromTokens( match[i] );
      			if ( cached[ expando ] ) {
      				setMatchers.push( cached );
      			} else {
      				elementMatchers.push( cached );
      			}
      		}
      
      		// Cache the compiled function
      		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );
      
      		// Save selector and tokenization
      		cached.selector = selector;
      	}
      	return cached;
      };
      
      /**
       * A low-level selection function that works with Sizzle's compiled
       *  selector functions
       * @param {String|Function} selector A selector or a pre-compiled
       *  selector function built with Sizzle.compile
       * @param {Element} context
       * @param {Array} [results]
       * @param {Array} [seed] A set of elements to match against
       */
      select = Sizzle.select = function( selector, context, results, seed ) {
      	var i, tokens, token, type, find,
      		compiled = typeof selector === "function" && selector,
      		match = !seed && tokenize( (selector = compiled.selector || selector) );
      
      	results = results || [];
      
      	// Try to minimize operations if there is no seed and only one group
      	if ( match.length === 1 ) {
      
      		// Take a shortcut and set the context if the root selector is an ID
      		tokens = match[0] = match[0].slice( 0 );
      		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
      				support.getById && context.nodeType === 9 && documentIsHTML &&
      				Expr.relative[ tokens[1].type ] ) {
      
      			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
      			if ( !context ) {
      				return results;
      
      			// Precompiled matchers will still verify ancestry, so step up a level
      			} else if ( compiled ) {
      				context = context.parentNode;
      			}
      
      			selector = selector.slice( tokens.shift().value.length );
      		}
      
      		// Fetch a seed set for right-to-left matching
      		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
      		while ( i-- ) {
      			token = tokens[i];
      
      			// Abort if we hit a combinator
      			if ( Expr.relative[ (type = token.type) ] ) {
      				break;
      			}
      			if ( (find = Expr.find[ type ]) ) {
      				// Search, expanding context for leading sibling combinators
      				if ( (seed = find(
      					token.matches[0].replace( runescape, funescape ),
      					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
      				)) ) {
      
      					// If seed is empty or no tokens remain, we can return early
      					tokens.splice( i, 1 );
      					selector = seed.length && toSelector( tokens );
      					if ( !selector ) {
      						push.apply( results, seed );
      						return results;
      					}
      
      					break;
      				}
      			}
      		}
      	}
      
      	// Compile and execute a filtering function if one is not provided
      	// Provide `match` to avoid retokenization if we modified the selector above
      	( compiled || compile( selector, match ) )(
      		seed,
      		context,
      		!documentIsHTML,
      		results,
      		rsibling.test( selector ) && testContext( context.parentNode ) || context
      	);
      	return results;
      };
      
      // One-time assignments
      
      // Sort stability
      support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;
      
      // Support: Chrome 14-35+
      // Always assume duplicates if they aren't passed to the comparison function
      support.detectDuplicates = !!hasDuplicate;
      
      // Initialize against the default document
      setDocument();
      
      // Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
      // Detached nodes confoundingly follow *each other*
      support.sortDetached = assert(function( div1 ) {
      	// Should return 1, but returns 4 (following)
      	return div1.compareDocumentPosition( document.createElement("div") ) & 1;
      });
      
      // Support: IE<8
      // Prevent attribute/property "interpolation"
      // http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
      if ( !assert(function( div ) {
      	div.innerHTML = "<a href='#'></a>";
      	return div.firstChild.getAttribute("href") === "#" ;
      }) ) {
      	addHandle( "type|href|height|width", function( elem, name, isXML ) {
      		if ( !isXML ) {
      			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
      		}
      	});
      }
      
      // Support: IE<9
      // Use defaultValue in place of getAttribute("value")
      if ( !support.attributes || !assert(function( div ) {
      	div.innerHTML = "<input/>";
      	div.firstChild.setAttribute( "value", "" );
      	return div.firstChild.getAttribute( "value" ) === "";
      }) ) {
      	addHandle( "value", function( elem, name, isXML ) {
      		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
      			return elem.defaultValue;
      		}
      	});
      }
      
      // Support: IE<9
      // Use getAttributeNode to fetch booleans when getAttribute lies
      if ( !assert(function( div ) {
      	return div.getAttribute("disabled") == null;
      }) ) {
      	addHandle( booleans, function( elem, name, isXML ) {
      		var val;
      		if ( !isXML ) {
      			return elem[ name ] === true ? name.toLowerCase() :
      					(val = elem.getAttributeNode( name )) && val.specified ?
      					val.value :
      				null;
      		}
      	});
      }
      
      return Sizzle;
      
      })( window );
      
      
      
      jQuery.find = Sizzle;
      jQuery.expr = Sizzle.selectors;
      jQuery.expr[":"] = jQuery.expr.pseudos;
      jQuery.unique = Sizzle.uniqueSort;
      jQuery.text = Sizzle.getText;
      jQuery.isXMLDoc = Sizzle.isXML;
      jQuery.contains = Sizzle.contains;
      
      
      
      var rneedsContext = jQuery.expr.match.needsContext;
      
      var rsingleTag = (/^<(\w+)\s*\/?>(?:<\/\1>|)$/);
      
      
      
      var risSimple = /^.[^:#\[\.,]*$/;
      
      // Implement the identical functionality for filter and not
      function winnow( elements, qualifier, not ) {
      	if ( jQuery.isFunction( qualifier ) ) {
      		return jQuery.grep( elements, function( elem, i ) {
      			/* jshint -W018 */
      			return !!qualifier.call( elem, i, elem ) !== not;
      		});
      
      	}
      
      	if ( qualifier.nodeType ) {
      		return jQuery.grep( elements, function( elem ) {
      			return ( elem === qualifier ) !== not;
      		});
      
      	}
      
      	if ( typeof qualifier === "string" ) {
      		if ( risSimple.test( qualifier ) ) {
      			return jQuery.filter( qualifier, elements, not );
      		}
      
      		qualifier = jQuery.filter( qualifier, elements );
      	}
      
      	return jQuery.grep( elements, function( elem ) {
      		return ( indexOf.call( qualifier, elem ) >= 0 ) !== not;
      	});
      }
      
      jQuery.filter = function( expr, elems, not ) {
      	var elem = elems[ 0 ];
      
      	if ( not ) {
      		expr = ":not(" + expr + ")";
      	}
      
      	return elems.length === 1 && elem.nodeType === 1 ?
      		jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
      		jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
      			return elem.nodeType === 1;
      		}));
      };
      
      jQuery.fn.extend({
      	find: function( selector ) {
      		var i,
      			len = this.length,
      			ret = [],
      			self = this;
      
      		if ( typeof selector !== "string" ) {
      			return this.pushStack( jQuery( selector ).filter(function() {
      				for ( i = 0; i < len; i++ ) {
      					if ( jQuery.contains( self[ i ], this ) ) {
      						return true;
      					}
      				}
      			}) );
      		}
      
      		for ( i = 0; i < len; i++ ) {
      			jQuery.find( selector, self[ i ], ret );
      		}
      
      		// Needed because $( selector, context ) becomes $( context ).find( selector )
      		ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
      		ret.selector = this.selector ? this.selector + " " + selector : selector;
      		return ret;
      	},
      	filter: function( selector ) {
      		return this.pushStack( winnow(this, selector || [], false) );
      	},
      	not: function( selector ) {
      		return this.pushStack( winnow(this, selector || [], true) );
      	},
      	is: function( selector ) {
      		return !!winnow(
      			this,
      
      			// If this is a positional/relative selector, check membership in the returned set
      			// so $("p:first").is("p:last") won't return true for a doc with two "p".
      			typeof selector === "string" && rneedsContext.test( selector ) ?
      				jQuery( selector ) :
      				selector || [],
      			false
      		).length;
      	}
      });
      
      
      // Initialize a jQuery object
      
      
      // A central reference to the root jQuery(document)
      var rootjQuery,
      
      	// A simple way to check for HTML strings
      	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
      	// Strict HTML recognition (#11290: must start with <)
      	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,
      
      	init = jQuery.fn.init = function( selector, context ) {
      		var match, elem;
      
      		// HANDLE: $(""), $(null), $(undefined), $(false)
      		if ( !selector ) {
      			return this;
      		}
      
      		// Handle HTML strings
      		if ( typeof selector === "string" ) {
      			if ( selector[0] === "<" && selector[ selector.length - 1 ] === ">" && selector.length >= 3 ) {
      				// Assume that strings that start and end with <> are HTML and skip the regex check
      				match = [ null, selector, null ];
      
      			} else {
      				match = rquickExpr.exec( selector );
      			}
      
      			// Match html or make sure no context is specified for #id
      			if ( match && (match[1] || !context) ) {
      
      				// HANDLE: $(html) -> $(array)
      				if ( match[1] ) {
      					context = context instanceof jQuery ? context[0] : context;
      
      					// Option to run scripts is true for back-compat
      					// Intentionally let the error be thrown if parseHTML is not present
      					jQuery.merge( this, jQuery.parseHTML(
      						match[1],
      						context && context.nodeType ? context.ownerDocument || context : document,
      						true
      					) );
      
      					// HANDLE: $(html, props)
      					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
      						for ( match in context ) {
      							// Properties of context are called as methods if possible
      							if ( jQuery.isFunction( this[ match ] ) ) {
      								this[ match ]( context[ match ] );
      
      							// ...and otherwise set as attributes
      							} else {
      								this.attr( match, context[ match ] );
      							}
      						}
      					}
      
      					return this;
      
      				// HANDLE: $(#id)
      				} else {
      					elem = document.getElementById( match[2] );
      
      					// Support: Blackberry 4.6
      					// gEBID returns nodes no longer in the document (#6963)
      					if ( elem && elem.parentNode ) {
      						// Inject the element directly into the jQuery object
      						this.length = 1;
      						this[0] = elem;
      					}
      
      					this.context = document;
      					this.selector = selector;
      					return this;
      				}
      
      			// HANDLE: $(expr, $(...))
      			} else if ( !context || context.jquery ) {
      				return ( context || rootjQuery ).find( selector );
      
      			// HANDLE: $(expr, context)
      			// (which is just equivalent to: $(context).find(expr)
      			} else {
      				return this.constructor( context ).find( selector );
      			}
      
      		// HANDLE: $(DOMElement)
      		} else if ( selector.nodeType ) {
      			this.context = this[0] = selector;
      			this.length = 1;
      			return this;
      
      		// HANDLE: $(function)
      		// Shortcut for document ready
      		} else if ( jQuery.isFunction( selector ) ) {
      			return typeof rootjQuery.ready !== "undefined" ?
      				rootjQuery.ready( selector ) :
      				// Execute immediately if ready is not present
      				selector( jQuery );
      		}
      
      		if ( selector.selector !== undefined ) {
      			this.selector = selector.selector;
      			this.context = selector.context;
      		}
      
      		return jQuery.makeArray( selector, this );
      	};
      
      // Give the init function the jQuery prototype for later instantiation
      init.prototype = jQuery.fn;
      
      // Initialize central reference
      rootjQuery = jQuery( document );
      
      
      var rparentsprev = /^(?:parents|prev(?:Until|All))/,
      	// Methods guaranteed to produce a unique set when starting from a unique set
      	guaranteedUnique = {
      		children: true,
      		contents: true,
      		next: true,
      		prev: true
      	};
      
      jQuery.extend({
      	dir: function( elem, dir, until ) {
      		var matched = [],
      			truncate = until !== undefined;
      
      		while ( (elem = elem[ dir ]) && elem.nodeType !== 9 ) {
      			if ( elem.nodeType === 1 ) {
      				if ( truncate && jQuery( elem ).is( until ) ) {
      					break;
      				}
      				matched.push( elem );
      			}
      		}
      		return matched;
      	},
      
      	sibling: function( n, elem ) {
      		var matched = [];
      
      		for ( ; n; n = n.nextSibling ) {
      			if ( n.nodeType === 1 && n !== elem ) {
      				matched.push( n );
      			}
      		}
      
      		return matched;
      	}
      });
      
      jQuery.fn.extend({
      	has: function( target ) {
      		var targets = jQuery( target, this ),
      			l = targets.length;
      
      		return this.filter(function() {
      			var i = 0;
      			for ( ; i < l; i++ ) {
      				if ( jQuery.contains( this, targets[i] ) ) {
      					return true;
      				}
      			}
      		});
      	},
      
      	closest: function( selectors, context ) {
      		var cur,
      			i = 0,
      			l = this.length,
      			matched = [],
      			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
      				jQuery( selectors, context || this.context ) :
      				0;
      
      		for ( ; i < l; i++ ) {
      			for ( cur = this[i]; cur && cur !== context; cur = cur.parentNode ) {
      				// Always skip document fragments
      				if ( cur.nodeType < 11 && (pos ?
      					pos.index(cur) > -1 :
      
      					// Don't pass non-elements to Sizzle
      					cur.nodeType === 1 &&
      						jQuery.find.matchesSelector(cur, selectors)) ) {
      
      					matched.push( cur );
      					break;
      				}
      			}
      		}
      
      		return this.pushStack( matched.length > 1 ? jQuery.unique( matched ) : matched );
      	},
      
      	// Determine the position of an element within the set
      	index: function( elem ) {
      
      		// No argument, return index in parent
      		if ( !elem ) {
      			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
      		}
      
      		// Index in selector
      		if ( typeof elem === "string" ) {
      			return indexOf.call( jQuery( elem ), this[ 0 ] );
      		}
      
      		// Locate the position of the desired element
      		return indexOf.call( this,
      
      			// If it receives a jQuery object, the first element is used
      			elem.jquery ? elem[ 0 ] : elem
      		);
      	},
      
      	add: function( selector, context ) {
      		return this.pushStack(
      			jQuery.unique(
      				jQuery.merge( this.get(), jQuery( selector, context ) )
      			)
      		);
      	},
      
      	addBack: function( selector ) {
      		return this.add( selector == null ?
      			this.prevObject : this.prevObject.filter(selector)
      		);
      	}
      });
      
      function sibling( cur, dir ) {
      	while ( (cur = cur[dir]) && cur.nodeType !== 1 ) {}
      	return cur;
      }
      
      jQuery.each({
      	parent: function( elem ) {
      		var parent = elem.parentNode;
      		return parent && parent.nodeType !== 11 ? parent : null;
      	},
      	parents: function( elem ) {
      		return jQuery.dir( elem, "parentNode" );
      	},
      	parentsUntil: function( elem, i, until ) {
      		return jQuery.dir( elem, "parentNode", until );
      	},
      	next: function( elem ) {
      		return sibling( elem, "nextSibling" );
      	},
      	prev: function( elem ) {
      		return sibling( elem, "previousSibling" );
      	},
      	nextAll: function( elem ) {
      		return jQuery.dir( elem, "nextSibling" );
      	},
      	prevAll: function( elem ) {
      		return jQuery.dir( elem, "previousSibling" );
      	},
      	nextUntil: function( elem, i, until ) {
      		return jQuery.dir( elem, "nextSibling", until );
      	},
      	prevUntil: function( elem, i, until ) {
      		return jQuery.dir( elem, "previousSibling", until );
      	},
      	siblings: function( elem ) {
      		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
      	},
      	children: function( elem ) {
      		return jQuery.sibling( elem.firstChild );
      	},
      	contents: function( elem ) {
      		return elem.contentDocument || jQuery.merge( [], elem.childNodes );
      	}
      }, function( name, fn ) {
      	jQuery.fn[ name ] = function( until, selector ) {
      		var matched = jQuery.map( this, fn, until );
      
      		if ( name.slice( -5 ) !== "Until" ) {
      			selector = until;
      		}
      
      		if ( selector && typeof selector === "string" ) {
      			matched = jQuery.filter( selector, matched );
      		}
      
      		if ( this.length > 1 ) {
      			// Remove duplicates
      			if ( !guaranteedUnique[ name ] ) {
      				jQuery.unique( matched );
      			}
      
      			// Reverse order for parents* and prev-derivatives
      			if ( rparentsprev.test( name ) ) {
      				matched.reverse();
      			}
      		}
      
      		return this.pushStack( matched );
      	};
      });
      var rnotwhite = (/\S+/g);
      
      
      
      // String to Object options format cache
      var optionsCache = {};
      
      // Convert String-formatted options into Object-formatted ones and store in cache
      function createOptions( options ) {
      	var object = optionsCache[ options ] = {};
      	jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
      		object[ flag ] = true;
      	});
      	return object;
      }
      
      /*
       * Create a callback list using the following parameters:
       *
       *	options: an optional list of space-separated options that will change how
       *			the callback list behaves or a more traditional option object
       *
       * By default a callback list will act like an event callback list and can be
       * "fired" multiple times.
       *
       * Possible options:
       *
       *	once:			will ensure the callback list can only be fired once (like a Deferred)
       *
       *	memory:			will keep track of previous values and will call any callback added
       *					after the list has been fired right away with the latest "memorized"
       *					values (like a Deferred)
       *
       *	unique:			will ensure a callback can only be added once (no duplicate in the list)
       *
       *	stopOnFalse:	interrupt callings when a callback returns false
       *
       */
      jQuery.Callbacks = function( options ) {
      
      	// Convert options from String-formatted to Object-formatted if needed
      	// (we check in cache first)
      	options = typeof options === "string" ?
      		( optionsCache[ options ] || createOptions( options ) ) :
      		jQuery.extend( {}, options );
      
      	var // Last fire value (for non-forgettable lists)
      		memory,
      		// Flag to know if list was already fired
      		fired,
      		// Flag to know if list is currently firing
      		firing,
      		// First callback to fire (used internally by add and fireWith)
      		firingStart,
      		// End of the loop when firing
      		firingLength,
      		// Index of currently firing callback (modified by remove if needed)
      		firingIndex,
      		// Actual callback list
      		list = [],
      		// Stack of fire calls for repeatable lists
      		stack = !options.once && [],
      		// Fire callbacks
      		fire = function( data ) {
      			memory = options.memory && data;
      			fired = true;
      			firingIndex = firingStart || 0;
      			firingStart = 0;
      			firingLength = list.length;
      			firing = true;
      			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
      				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
      					memory = false; // To prevent further calls using add
      					break;
      				}
      			}
      			firing = false;
      			if ( list ) {
      				if ( stack ) {
      					if ( stack.length ) {
      						fire( stack.shift() );
      					}
      				} else if ( memory ) {
      					list = [];
      				} else {
      					self.disable();
      				}
      			}
      		},
      		// Actual Callbacks object
      		self = {
      			// Add a callback or a collection of callbacks to the list
      			add: function() {
      				if ( list ) {
      					// First, we save the current length
      					var start = list.length;
      					(function add( args ) {
      						jQuery.each( args, function( _, arg ) {
      							var type = jQuery.type( arg );
      							if ( type === "function" ) {
      								if ( !options.unique || !self.has( arg ) ) {
      									list.push( arg );
      								}
      							} else if ( arg && arg.length && type !== "string" ) {
      								// Inspect recursively
      								add( arg );
      							}
      						});
      					})( arguments );
      					// Do we need to add the callbacks to the
      					// current firing batch?
      					if ( firing ) {
      						firingLength = list.length;
      					// With memory, if we're not firing then
      					// we should call right away
      					} else if ( memory ) {
      						firingStart = start;
      						fire( memory );
      					}
      				}
      				return this;
      			},
      			// Remove a callback from the list
      			remove: function() {
      				if ( list ) {
      					jQuery.each( arguments, function( _, arg ) {
      						var index;
      						while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
      							list.splice( index, 1 );
      							// Handle firing indexes
      							if ( firing ) {
      								if ( index <= firingLength ) {
      									firingLength--;
      								}
      								if ( index <= firingIndex ) {
      									firingIndex--;
      								}
      							}
      						}
      					});
      				}
      				return this;
      			},
      			// Check if a given callback is in the list.
      			// If no argument is given, return whether or not list has callbacks attached.
      			has: function( fn ) {
      				return fn ? jQuery.inArray( fn, list ) > -1 : !!( list && list.length );
      			},
      			// Remove all callbacks from the list
      			empty: function() {
      				list = [];
      				firingLength = 0;
      				return this;
      			},
      			// Have the list do nothing anymore
      			disable: function() {
      				list = stack = memory = undefined;
      				return this;
      			},
      			// Is it disabled?
      			disabled: function() {
      				return !list;
      			},
      			// Lock the list in its current state
      			lock: function() {
      				stack = undefined;
      				if ( !memory ) {
      					self.disable();
      				}
      				return this;
      			},
      			// Is it locked?
      			locked: function() {
      				return !stack;
      			},
      			// Call all callbacks with the given context and arguments
      			fireWith: function( context, args ) {
      				if ( list && ( !fired || stack ) ) {
      					args = args || [];
      					args = [ context, args.slice ? args.slice() : args ];
      					if ( firing ) {
      						stack.push( args );
      					} else {
      						fire( args );
      					}
      				}
      				return this;
      			},
      			// Call all the callbacks with the given arguments
      			fire: function() {
      				self.fireWith( this, arguments );
      				return this;
      			},
      			// To know if the callbacks have already been called at least once
      			fired: function() {
      				return !!fired;
      			}
      		};
      
      	return self;
      };
      
      
      jQuery.extend({
      
      	Deferred: function( func ) {
      		var tuples = [
      				// action, add listener, listener list, final state
      				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
      				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
      				[ "notify", "progress", jQuery.Callbacks("memory") ]
      			],
      			state = "pending",
      			promise = {
      				state: function() {
      					return state;
      				},
      				always: function() {
      					deferred.done( arguments ).fail( arguments );
      					return this;
      				},
      				then: function( /* fnDone, fnFail, fnProgress */ ) {
      					var fns = arguments;
      					return jQuery.Deferred(function( newDefer ) {
      						jQuery.each( tuples, function( i, tuple ) {
      							var fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];
      							// deferred[ done | fail | progress ] for forwarding actions to newDefer
      							deferred[ tuple[1] ](function() {
      								var returned = fn && fn.apply( this, arguments );
      								if ( returned && jQuery.isFunction( returned.promise ) ) {
      									returned.promise()
      										.done( newDefer.resolve )
      										.fail( newDefer.reject )
      										.progress( newDefer.notify );
      								} else {
      									newDefer[ tuple[ 0 ] + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );
      								}
      							});
      						});
      						fns = null;
      					}).promise();
      				},
      				// Get a promise for this deferred
      				// If obj is provided, the promise aspect is added to the object
      				promise: function( obj ) {
      					return obj != null ? jQuery.extend( obj, promise ) : promise;
      				}
      			},
      			deferred = {};
      
      		// Keep pipe for back-compat
      		promise.pipe = promise.then;
      
      		// Add list-specific methods
      		jQuery.each( tuples, function( i, tuple ) {
      			var list = tuple[ 2 ],
      				stateString = tuple[ 3 ];
      
      			// promise[ done | fail | progress ] = list.add
      			promise[ tuple[1] ] = list.add;
      
      			// Handle state
      			if ( stateString ) {
      				list.add(function() {
      					// state = [ resolved | rejected ]
      					state = stateString;
      
      				// [ reject_list | resolve_list ].disable; progress_list.lock
      				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
      			}
      
      			// deferred[ resolve | reject | notify ]
      			deferred[ tuple[0] ] = function() {
      				deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
      				return this;
      			};
      			deferred[ tuple[0] + "With" ] = list.fireWith;
      		});
      
      		// Make the deferred a promise
      		promise.promise( deferred );
      
      		// Call given func if any
      		if ( func ) {
      			func.call( deferred, deferred );
      		}
      
      		// All done!
      		return deferred;
      	},
      
      	// Deferred helper
      	when: function( subordinate /* , ..., subordinateN */ ) {
      		var i = 0,
      			resolveValues = slice.call( arguments ),
      			length = resolveValues.length,
      
      			// the count of uncompleted subordinates
      			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,
      
      			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
      			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),
      
      			// Update function for both resolve and progress values
      			updateFunc = function( i, contexts, values ) {
      				return function( value ) {
      					contexts[ i ] = this;
      					values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
      					if ( values === progressValues ) {
      						deferred.notifyWith( contexts, values );
      					} else if ( !( --remaining ) ) {
      						deferred.resolveWith( contexts, values );
      					}
      				};
      			},
      
      			progressValues, progressContexts, resolveContexts;
      
      		// Add listeners to Deferred subordinates; treat others as resolved
      		if ( length > 1 ) {
      			progressValues = new Array( length );
      			progressContexts = new Array( length );
      			resolveContexts = new Array( length );
      			for ( ; i < length; i++ ) {
      				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
      					resolveValues[ i ].promise()
      						.done( updateFunc( i, resolveContexts, resolveValues ) )
      						.fail( deferred.reject )
      						.progress( updateFunc( i, progressContexts, progressValues ) );
      				} else {
      					--remaining;
      				}
      			}
      		}
      
      		// If we're not waiting on anything, resolve the master
      		if ( !remaining ) {
      			deferred.resolveWith( resolveContexts, resolveValues );
      		}
      
      		return deferred.promise();
      	}
      });
      
      
      // The deferred used on DOM ready
      var readyList;
      
      jQuery.fn.ready = function( fn ) {
      	// Add the callback
      	jQuery.ready.promise().done( fn );
      
      	return this;
      };
      
      jQuery.extend({
      	// Is the DOM ready to be used? Set to true once it occurs.
      	isReady: false,
      
      	// A counter to track how many items to wait for before
      	// the ready event fires. See #6781
      	readyWait: 1,
      
      	// Hold (or release) the ready event
      	holdReady: function( hold ) {
      		if ( hold ) {
      			jQuery.readyWait++;
      		} else {
      			jQuery.ready( true );
      		}
      	},
      
      	// Handle when the DOM is ready
      	ready: function( wait ) {
      
      		// Abort if there are pending holds or we're already ready
      		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
      			return;
      		}
      
      		// Remember that the DOM is ready
      		jQuery.isReady = true;
      
      		// If a normal DOM Ready event fired, decrement, and wait if need be
      		if ( wait !== true && --jQuery.readyWait > 0 ) {
      			return;
      		}
      
      		// If there are functions bound, to execute
      		readyList.resolveWith( document, [ jQuery ] );
      
      		// Trigger any bound ready events
      		if ( jQuery.fn.triggerHandler ) {
      			jQuery( document ).triggerHandler( "ready" );
      			jQuery( document ).off( "ready" );
      		}
      	}
      });
      
      /**
       * The ready event handler and self cleanup method
       */
      function completed() {
      	document.removeEventListener( "DOMContentLoaded", completed, false );
      	window.removeEventListener( "load", completed, false );
      	jQuery.ready();
      }
      
      jQuery.ready.promise = function( obj ) {
      	if ( !readyList ) {
      
      		readyList = jQuery.Deferred();
      
      		// Catch cases where $(document).ready() is called after the browser event has already occurred.
      		// We once tried to use readyState "interactive" here, but it caused issues like the one
      		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
      		if ( document.readyState === "complete" ) {
      			// Handle it asynchronously to allow scripts the opportunity to delay ready
      			setTimeout( jQuery.ready );
      
      		} else {
      
      			// Use the handy event callback
      			document.addEventListener( "DOMContentLoaded", completed, false );
      
      			// A fallback to window.onload, that will always work
      			window.addEventListener( "load", completed, false );
      		}
      	}
      	return readyList.promise( obj );
      };
      
      // Kick off the DOM ready check even if the user does not
      jQuery.ready.promise();
      
      
      
      
      // Multifunctional method to get and set values of a collection
      // The value/s can optionally be executed if it's a function
      var access = jQuery.access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
      	var i = 0,
      		len = elems.length,
      		bulk = key == null;
      
      	// Sets many values
      	if ( jQuery.type( key ) === "object" ) {
      		chainable = true;
      		for ( i in key ) {
      			jQuery.access( elems, fn, i, key[i], true, emptyGet, raw );
      		}
      
      	// Sets one value
      	} else if ( value !== undefined ) {
      		chainable = true;
      
      		if ( !jQuery.isFunction( value ) ) {
      			raw = true;
      		}
      
      		if ( bulk ) {
      			// Bulk operations run against the entire set
      			if ( raw ) {
      				fn.call( elems, value );
      				fn = null;
      
      			// ...except when executing function values
      			} else {
      				bulk = fn;
      				fn = function( elem, key, value ) {
      					return bulk.call( jQuery( elem ), value );
      				};
      			}
      		}
      
      		if ( fn ) {
      			for ( ; i < len; i++ ) {
      				fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
      			}
      		}
      	}
      
      	return chainable ?
      		elems :
      
      		// Gets
      		bulk ?
      			fn.call( elems ) :
      			len ? fn( elems[0], key ) : emptyGet;
      };
      
      
      /**
       * Determines whether an object can have data
       */
      jQuery.acceptData = function( owner ) {
      	// Accepts only:
      	//  - Node
      	//    - Node.ELEMENT_NODE
      	//    - Node.DOCUMENT_NODE
      	//  - Object
      	//    - Any
      	/* jshint -W018 */
      	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
      };
      
      
      function Data() {
      	// Support: Android<4,
      	// Old WebKit does not have Object.preventExtensions/freeze method,
      	// return new empty object instead with no [[set]] accessor
      	Object.defineProperty( this.cache = {}, 0, {
      		get: function() {
      			return {};
      		}
      	});
      
      	this.expando = jQuery.expando + Data.uid++;
      }
      
      Data.uid = 1;
      Data.accepts = jQuery.acceptData;
      
      Data.prototype = {
      	key: function( owner ) {
      		// We can accept data for non-element nodes in modern browsers,
      		// but we should not, see #8335.
      		// Always return the key for a frozen object.
      		if ( !Data.accepts( owner ) ) {
      			return 0;
      		}
      
      		var descriptor = {},
      			// Check if the owner object already has a cache key
      			unlock = owner[ this.expando ];
      
      		// If not, create one
      		if ( !unlock ) {
      			unlock = Data.uid++;
      
      			// Secure it in a non-enumerable, non-writable property
      			try {
      				descriptor[ this.expando ] = { value: unlock };
      				Object.defineProperties( owner, descriptor );
      
      			// Support: Android<4
      			// Fallback to a less secure definition
      			} catch ( e ) {
      				descriptor[ this.expando ] = unlock;
      				jQuery.extend( owner, descriptor );
      			}
      		}
      
      		// Ensure the cache object
      		if ( !this.cache[ unlock ] ) {
      			this.cache[ unlock ] = {};
      		}
      
      		return unlock;
      	},
      	set: function( owner, data, value ) {
      		var prop,
      			// There may be an unlock assigned to this node,
      			// if there is no entry for this "owner", create one inline
      			// and set the unlock as though an owner entry had always existed
      			unlock = this.key( owner ),
      			cache = this.cache[ unlock ];
      
      		// Handle: [ owner, key, value ] args
      		if ( typeof data === "string" ) {
      			cache[ data ] = value;
      
      		// Handle: [ owner, { properties } ] args
      		} else {
      			// Fresh assignments by object are shallow copied
      			if ( jQuery.isEmptyObject( cache ) ) {
      				jQuery.extend( this.cache[ unlock ], data );
      			// Otherwise, copy the properties one-by-one to the cache object
      			} else {
      				for ( prop in data ) {
      					cache[ prop ] = data[ prop ];
      				}
      			}
      		}
      		return cache;
      	},
      	get: function( owner, key ) {
      		// Either a valid cache is found, or will be created.
      		// New caches will be created and the unlock returned,
      		// allowing direct access to the newly created
      		// empty data object. A valid owner object must be provided.
      		var cache = this.cache[ this.key( owner ) ];
      
      		return key === undefined ?
      			cache : cache[ key ];
      	},
      	access: function( owner, key, value ) {
      		var stored;
      		// In cases where either:
      		//
      		//   1. No key was specified
      		//   2. A string key was specified, but no value provided
      		//
      		// Take the "read" path and allow the get method to determine
      		// which value to return, respectively either:
      		//
      		//   1. The entire cache object
      		//   2. The data stored at the key
      		//
      		if ( key === undefined ||
      				((key && typeof key === "string") && value === undefined) ) {
      
      			stored = this.get( owner, key );
      
      			return stored !== undefined ?
      				stored : this.get( owner, jQuery.camelCase(key) );
      		}
      
      		// [*]When the key is not a string, or both a key and value
      		// are specified, set or extend (existing objects) with either:
      		//
      		//   1. An object of properties
      		//   2. A key and value
      		//
      		this.set( owner, key, value );
      
      		// Since the "set" path can have two possible entry points
      		// return the expected data based on which path was taken[*]
      		return value !== undefined ? value : key;
      	},
      	remove: function( owner, key ) {
      		var i, name, camel,
      			unlock = this.key( owner ),
      			cache = this.cache[ unlock ];
      
      		if ( key === undefined ) {
      			this.cache[ unlock ] = {};
      
      		} else {
      			// Support array or space separated string of keys
      			if ( jQuery.isArray( key ) ) {
      				// If "name" is an array of keys...
      				// When data is initially created, via ("key", "val") signature,
      				// keys will be converted to camelCase.
      				// Since there is no way to tell _how_ a key was added, remove
      				// both plain key and camelCase key. #12786
      				// This will only penalize the array argument path.
      				name = key.concat( key.map( jQuery.camelCase ) );
      			} else {
      				camel = jQuery.camelCase( key );
      				// Try the string as a key before any manipulation
      				if ( key in cache ) {
      					name = [ key, camel ];
      				} else {
      					// If a key with the spaces exists, use it.
      					// Otherwise, create an array by matching non-whitespace
      					name = camel;
      					name = name in cache ?
      						[ name ] : ( name.match( rnotwhite ) || [] );
      				}
      			}
      
      			i = name.length;
      			while ( i-- ) {
      				delete cache[ name[ i ] ];
      			}
      		}
      	},
      	hasData: function( owner ) {
      		return !jQuery.isEmptyObject(
      			this.cache[ owner[ this.expando ] ] || {}
      		);
      	},
      	discard: function( owner ) {
      		if ( owner[ this.expando ] ) {
      			delete this.cache[ owner[ this.expando ] ];
      		}
      	}
      };
      var data_priv = new Data();
      
      var data_user = new Data();
      
      
      
      //	Implementation Summary
      //
      //	1. Enforce API surface and semantic compatibility with 1.9.x branch
      //	2. Improve the module's maintainability by reducing the storage
      //		paths to a single mechanism.
      //	3. Use the same single mechanism to support "private" and "user" data.
      //	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
      //	5. Avoid exposing implementation details on user objects (eg. expando properties)
      //	6. Provide a clear path for implementation upgrade to WeakMap in 2014
      
      var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
      	rmultiDash = /([A-Z])/g;
      
      function dataAttr( elem, key, data ) {
      	var name;
      
      	// If nothing was found internally, try to fetch any
      	// data from the HTML5 data-* attribute
      	if ( data === undefined && elem.nodeType === 1 ) {
      		name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();
      		data = elem.getAttribute( name );
      
      		if ( typeof data === "string" ) {
      			try {
      				data = data === "true" ? true :
      					data === "false" ? false :
      					data === "null" ? null :
      					// Only convert to a number if it doesn't change the string
      					+data + "" === data ? +data :
      					rbrace.test( data ) ? jQuery.parseJSON( data ) :
      					data;
      			} catch( e ) {}
      
      			// Make sure we set the data so it isn't changed later
      			data_user.set( elem, key, data );
      		} else {
      			data = undefined;
      		}
      	}
      	return data;
      }
      
      jQuery.extend({
      	hasData: function( elem ) {
      		return data_user.hasData( elem ) || data_priv.hasData( elem );
      	},
      
      	data: function( elem, name, data ) {
      		return data_user.access( elem, name, data );
      	},
      
      	removeData: function( elem, name ) {
      		data_user.remove( elem, name );
      	},
      
      	// TODO: Now that all calls to _data and _removeData have been replaced
      	// with direct calls to data_priv methods, these can be deprecated.
      	_data: function( elem, name, data ) {
      		return data_priv.access( elem, name, data );
      	},
      
      	_removeData: function( elem, name ) {
      		data_priv.remove( elem, name );
      	}
      });
      
      jQuery.fn.extend({
      	data: function( key, value ) {
      		var i, name, data,
      			elem = this[ 0 ],
      			attrs = elem && elem.attributes;
      
      		// Gets all values
      		if ( key === undefined ) {
      			if ( this.length ) {
      				data = data_user.get( elem );
      
      				if ( elem.nodeType === 1 && !data_priv.get( elem, "hasDataAttrs" ) ) {
      					i = attrs.length;
      					while ( i-- ) {
      
      						// Support: IE11+
      						// The attrs elements can be null (#14894)
      						if ( attrs[ i ] ) {
      							name = attrs[ i ].name;
      							if ( name.indexOf( "data-" ) === 0 ) {
      								name = jQuery.camelCase( name.slice(5) );
      								dataAttr( elem, name, data[ name ] );
      							}
      						}
      					}
      					data_priv.set( elem, "hasDataAttrs", true );
      				}
      			}
      
      			return data;
      		}
      
      		// Sets multiple values
      		if ( typeof key === "object" ) {
      			return this.each(function() {
      				data_user.set( this, key );
      			});
      		}
      
      		return access( this, function( value ) {
      			var data,
      				camelKey = jQuery.camelCase( key );
      
      			// The calling jQuery object (element matches) is not empty
      			// (and therefore has an element appears at this[ 0 ]) and the
      			// `value` parameter was not undefined. An empty jQuery object
      			// will result in `undefined` for elem = this[ 0 ] which will
      			// throw an exception if an attempt to read a data cache is made.
      			if ( elem && value === undefined ) {
      				// Attempt to get data from the cache
      				// with the key as-is
      				data = data_user.get( elem, key );
      				if ( data !== undefined ) {
      					return data;
      				}
      
      				// Attempt to get data from the cache
      				// with the key camelized
      				data = data_user.get( elem, camelKey );
      				if ( data !== undefined ) {
      					return data;
      				}
      
      				// Attempt to "discover" the data in
      				// HTML5 custom data-* attrs
      				data = dataAttr( elem, camelKey, undefined );
      				if ( data !== undefined ) {
      					return data;
      				}
      
      				// We tried really hard, but the data doesn't exist.
      				return;
      			}
      
      			// Set the data...
      			this.each(function() {
      				// First, attempt to store a copy or reference of any
      				// data that might've been store with a camelCased key.
      				var data = data_user.get( this, camelKey );
      
      				// For HTML5 data-* attribute interop, we have to
      				// store property names with dashes in a camelCase form.
      				// This might not apply to all properties...*
      				data_user.set( this, camelKey, value );
      
      				// *... In the case of properties that might _actually_
      				// have dashes, we need to also store a copy of that
      				// unchanged property.
      				if ( key.indexOf("-") !== -1 && data !== undefined ) {
      					data_user.set( this, key, value );
      				}
      			});
      		}, null, value, arguments.length > 1, null, true );
      	},
      
      	removeData: function( key ) {
      		return this.each(function() {
      			data_user.remove( this, key );
      		});
      	}
      });
      
      
      jQuery.extend({
      	queue: function( elem, type, data ) {
      		var queue;
      
      		if ( elem ) {
      			type = ( type || "fx" ) + "queue";
      			queue = data_priv.get( elem, type );
      
      			// Speed up dequeue by getting out quickly if this is just a lookup
      			if ( data ) {
      				if ( !queue || jQuery.isArray( data ) ) {
      					queue = data_priv.access( elem, type, jQuery.makeArray(data) );
      				} else {
      					queue.push( data );
      				}
      			}
      			return queue || [];
      		}
      	},
      
      	dequeue: function( elem, type ) {
      		type = type || "fx";
      
      		var queue = jQuery.queue( elem, type ),
      			startLength = queue.length,
      			fn = queue.shift(),
      			hooks = jQuery._queueHooks( elem, type ),
      			next = function() {
      				jQuery.dequeue( elem, type );
      			};
      
      		// If the fx queue is dequeued, always remove the progress sentinel
      		if ( fn === "inprogress" ) {
      			fn = queue.shift();
      			startLength--;
      		}
      
      		if ( fn ) {
      
      			// Add a progress sentinel to prevent the fx queue from being
      			// automatically dequeued
      			if ( type === "fx" ) {
      				queue.unshift( "inprogress" );
      			}
      
      			// Clear up the last queue stop function
      			delete hooks.stop;
      			fn.call( elem, next, hooks );
      		}
      
      		if ( !startLength && hooks ) {
      			hooks.empty.fire();
      		}
      	},
      
      	// Not public - generate a queueHooks object, or return the current one
      	_queueHooks: function( elem, type ) {
      		var key = type + "queueHooks";
      		return data_priv.get( elem, key ) || data_priv.access( elem, key, {
      			empty: jQuery.Callbacks("once memory").add(function() {
      				data_priv.remove( elem, [ type + "queue", key ] );
      			})
      		});
      	}
      });
      
      jQuery.fn.extend({
      	queue: function( type, data ) {
      		var setter = 2;
      
      		if ( typeof type !== "string" ) {
      			data = type;
      			type = "fx";
      			setter--;
      		}
      
      		if ( arguments.length < setter ) {
      			return jQuery.queue( this[0], type );
      		}
      
      		return data === undefined ?
      			this :
      			this.each(function() {
      				var queue = jQuery.queue( this, type, data );
      
      				// Ensure a hooks for this queue
      				jQuery._queueHooks( this, type );
      
      				if ( type === "fx" && queue[0] !== "inprogress" ) {
      					jQuery.dequeue( this, type );
      				}
      			});
      	},
      	dequeue: function( type ) {
      		return this.each(function() {
      			jQuery.dequeue( this, type );
      		});
      	},
      	clearQueue: function( type ) {
      		return this.queue( type || "fx", [] );
      	},
      	// Get a promise resolved when queues of a certain type
      	// are emptied (fx is the type by default)
      	promise: function( type, obj ) {
      		var tmp,
      			count = 1,
      			defer = jQuery.Deferred(),
      			elements = this,
      			i = this.length,
      			resolve = function() {
      				if ( !( --count ) ) {
      					defer.resolveWith( elements, [ elements ] );
      				}
      			};
      
      		if ( typeof type !== "string" ) {
      			obj = type;
      			type = undefined;
      		}
      		type = type || "fx";
      
      		while ( i-- ) {
      			tmp = data_priv.get( elements[ i ], type + "queueHooks" );
      			if ( tmp && tmp.empty ) {
      				count++;
      				tmp.empty.add( resolve );
      			}
      		}
      		resolve();
      		return defer.promise( obj );
      	}
      });
      var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;
      
      var cssExpand = [ "Top", "Right", "Bottom", "Left" ];
      
      var isHidden = function( elem, el ) {
      		// isHidden might be called from jQuery#filter function;
      		// in that case, element will be second argument
      		elem = el || elem;
      		return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
      	};
      
      var rcheckableType = (/^(?:checkbox|radio)$/i);
      
      
      
      (function() {
      	var fragment = document.createDocumentFragment(),
      		div = fragment.appendChild( document.createElement( "div" ) ),
      		input = document.createElement( "input" );
      
      	// Support: Safari<=5.1
      	// Check state lost if the name is set (#11217)
      	// Support: Windows Web Apps (WWA)
      	// `name` and `type` must use .setAttribute for WWA (#14901)
      	input.setAttribute( "type", "radio" );
      	input.setAttribute( "checked", "checked" );
      	input.setAttribute( "name", "t" );
      
      	div.appendChild( input );
      
      	// Support: Safari<=5.1, Android<4.2
      	// Older WebKit doesn't clone checked state correctly in fragments
      	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;
      
      	// Support: IE<=11+
      	// Make sure textarea (and checkbox) defaultValue is properly cloned
      	div.innerHTML = "<textarea>x</textarea>";
      	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
      })();
      var strundefined = typeof undefined;
      
      
      
      support.focusinBubbles = "onfocusin" in window;
      
      
      var
      	rkeyEvent = /^key/,
      	rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/,
      	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
      	rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;
      
      function returnTrue() {
      	return true;
      }
      
      function returnFalse() {
      	return false;
      }
      
      function safeActiveElement() {
      	try {
      		return document.activeElement;
      	} catch ( err ) { }
      }
      
      /*
       * Helper functions for managing events -- not part of the public interface.
       * Props to Dean Edwards' addEvent library for many of the ideas.
       */
      jQuery.event = {
      
      	global: {},
      
      	add: function( elem, types, handler, data, selector ) {
      
      		var handleObjIn, eventHandle, tmp,
      			events, t, handleObj,
      			special, handlers, type, namespaces, origType,
      			elemData = data_priv.get( elem );
      
      		// Don't attach events to noData or text/comment nodes (but allow plain objects)
      		if ( !elemData ) {
      			return;
      		}
      
      		// Caller can pass in an object of custom data in lieu of the handler
      		if ( handler.handler ) {
      			handleObjIn = handler;
      			handler = handleObjIn.handler;
      			selector = handleObjIn.selector;
      		}
      
      		// Make sure that the handler has a unique ID, used to find/remove it later
      		if ( !handler.guid ) {
      			handler.guid = jQuery.guid++;
      		}
      
      		// Init the element's event structure and main handler, if this is the first
      		if ( !(events = elemData.events) ) {
      			events = elemData.events = {};
      		}
      		if ( !(eventHandle = elemData.handle) ) {
      			eventHandle = elemData.handle = function( e ) {
      				// Discard the second event of a jQuery.event.trigger() and
      				// when an event is called after a page has unloaded
      				return typeof jQuery !== strundefined && jQuery.event.triggered !== e.type ?
      					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
      			};
      		}
      
      		// Handle multiple events separated by a space
      		types = ( types || "" ).match( rnotwhite ) || [ "" ];
      		t = types.length;
      		while ( t-- ) {
      			tmp = rtypenamespace.exec( types[t] ) || [];
      			type = origType = tmp[1];
      			namespaces = ( tmp[2] || "" ).split( "." ).sort();
      
      			// There *must* be a type, no attaching namespace-only handlers
      			if ( !type ) {
      				continue;
      			}
      
      			// If event changes its type, use the special event handlers for the changed type
      			special = jQuery.event.special[ type ] || {};
      
      			// If selector defined, determine special event api type, otherwise given type
      			type = ( selector ? special.delegateType : special.bindType ) || type;
      
      			// Update special based on newly reset type
      			special = jQuery.event.special[ type ] || {};
      
      			// handleObj is passed to all event handlers
      			handleObj = jQuery.extend({
      				type: type,
      				origType: origType,
      				data: data,
      				handler: handler,
      				guid: handler.guid,
      				selector: selector,
      				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
      				namespace: namespaces.join(".")
      			}, handleObjIn );
      
      			// Init the event handler queue if we're the first
      			if ( !(handlers = events[ type ]) ) {
      				handlers = events[ type ] = [];
      				handlers.delegateCount = 0;
      
      				// Only use addEventListener if the special events handler returns false
      				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
      					if ( elem.addEventListener ) {
      						elem.addEventListener( type, eventHandle, false );
      					}
      				}
      			}
      
      			if ( special.add ) {
      				special.add.call( elem, handleObj );
      
      				if ( !handleObj.handler.guid ) {
      					handleObj.handler.guid = handler.guid;
      				}
      			}
      
      			// Add to the element's handler list, delegates in front
      			if ( selector ) {
      				handlers.splice( handlers.delegateCount++, 0, handleObj );
      			} else {
      				handlers.push( handleObj );
      			}
      
      			// Keep track of which events have ever been used, for event optimization
      			jQuery.event.global[ type ] = true;
      		}
      
      	},
      
      	// Detach an event or set of events from an element
      	remove: function( elem, types, handler, selector, mappedTypes ) {
      
      		var j, origCount, tmp,
      			events, t, handleObj,
      			special, handlers, type, namespaces, origType,
      			elemData = data_priv.hasData( elem ) && data_priv.get( elem );
      
      		if ( !elemData || !(events = elemData.events) ) {
      			return;
      		}
      
      		// Once for each type.namespace in types; type may be omitted
      		types = ( types || "" ).match( rnotwhite ) || [ "" ];
      		t = types.length;
      		while ( t-- ) {
      			tmp = rtypenamespace.exec( types[t] ) || [];
      			type = origType = tmp[1];
      			namespaces = ( tmp[2] || "" ).split( "." ).sort();
      
      			// Unbind all events (on this namespace, if provided) for the element
      			if ( !type ) {
      				for ( type in events ) {
      					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
      				}
      				continue;
      			}
      
      			special = jQuery.event.special[ type ] || {};
      			type = ( selector ? special.delegateType : special.bindType ) || type;
      			handlers = events[ type ] || [];
      			tmp = tmp[2] && new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" );
      
      			// Remove matching events
      			origCount = j = handlers.length;
      			while ( j-- ) {
      				handleObj = handlers[ j ];
      
      				if ( ( mappedTypes || origType === handleObj.origType ) &&
      					( !handler || handler.guid === handleObj.guid ) &&
      					( !tmp || tmp.test( handleObj.namespace ) ) &&
      					( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
      					handlers.splice( j, 1 );
      
      					if ( handleObj.selector ) {
      						handlers.delegateCount--;
      					}
      					if ( special.remove ) {
      						special.remove.call( elem, handleObj );
      					}
      				}
      			}
      
      			// Remove generic event handler if we removed something and no more handlers exist
      			// (avoids potential for endless recursion during removal of special event handlers)
      			if ( origCount && !handlers.length ) {
      				if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
      					jQuery.removeEvent( elem, type, elemData.handle );
      				}
      
      				delete events[ type ];
      			}
      		}
      
      		// Remove the expando if it's no longer used
      		if ( jQuery.isEmptyObject( events ) ) {
      			delete elemData.handle;
      			data_priv.remove( elem, "events" );
      		}
      	},
      
      	trigger: function( event, data, elem, onlyHandlers ) {
      
      		var i, cur, tmp, bubbleType, ontype, handle, special,
      			eventPath = [ elem || document ],
      			type = hasOwn.call( event, "type" ) ? event.type : event,
      			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];
      
      		cur = tmp = elem = elem || document;
      
      		// Don't do events on text and comment nodes
      		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
      			return;
      		}
      
      		// focus/blur morphs to focusin/out; ensure we're not firing them right now
      		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
      			return;
      		}
      
      		if ( type.indexOf(".") >= 0 ) {
      			// Namespaced trigger; create a regexp to match event type in handle()
      			namespaces = type.split(".");
      			type = namespaces.shift();
      			namespaces.sort();
      		}
      		ontype = type.indexOf(":") < 0 && "on" + type;
      
      		// Caller can pass in a jQuery.Event object, Object, or just an event type string
      		event = event[ jQuery.expando ] ?
      			event :
      			new jQuery.Event( type, typeof event === "object" && event );
      
      		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
      		event.isTrigger = onlyHandlers ? 2 : 3;
      		event.namespace = namespaces.join(".");
      		event.namespace_re = event.namespace ?
      			new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
      			null;
      
      		// Clean up the event in case it is being reused
      		event.result = undefined;
      		if ( !event.target ) {
      			event.target = elem;
      		}
      
      		// Clone any incoming data and prepend the event, creating the handler arg list
      		data = data == null ?
      			[ event ] :
      			jQuery.makeArray( data, [ event ] );
      
      		// Allow special events to draw outside the lines
      		special = jQuery.event.special[ type ] || {};
      		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
      			return;
      		}
      
      		// Determine event propagation path in advance, per W3C events spec (#9951)
      		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
      		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {
      
      			bubbleType = special.delegateType || type;
      			if ( !rfocusMorph.test( bubbleType + type ) ) {
      				cur = cur.parentNode;
      			}
      			for ( ; cur; cur = cur.parentNode ) {
      				eventPath.push( cur );
      				tmp = cur;
      			}
      
      			// Only add window if we got to document (e.g., not plain obj or detached DOM)
      			if ( tmp === (elem.ownerDocument || document) ) {
      				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
      			}
      		}
      
      		// Fire handlers on the event path
      		i = 0;
      		while ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {
      
      			event.type = i > 1 ?
      				bubbleType :
      				special.bindType || type;
      
      			// jQuery handler
      			handle = ( data_priv.get( cur, "events" ) || {} )[ event.type ] && data_priv.get( cur, "handle" );
      			if ( handle ) {
      				handle.apply( cur, data );
      			}
      
      			// Native handler
      			handle = ontype && cur[ ontype ];
      			if ( handle && handle.apply && jQuery.acceptData( cur ) ) {
      				event.result = handle.apply( cur, data );
      				if ( event.result === false ) {
      					event.preventDefault();
      				}
      			}
      		}
      		event.type = type;
      
      		// If nobody prevented the default action, do it now
      		if ( !onlyHandlers && !event.isDefaultPrevented() ) {
      
      			if ( (!special._default || special._default.apply( eventPath.pop(), data ) === false) &&
      				jQuery.acceptData( elem ) ) {
      
      				// Call a native DOM method on the target with the same name name as the event.
      				// Don't do default actions on window, that's where global variables be (#6170)
      				if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {
      
      					// Don't re-trigger an onFOO event when we call its FOO() method
      					tmp = elem[ ontype ];
      
      					if ( tmp ) {
      						elem[ ontype ] = null;
      					}
      
      					// Prevent re-triggering of the same event, since we already bubbled it above
      					jQuery.event.triggered = type;
      					elem[ type ]();
      					jQuery.event.triggered = undefined;
      
      					if ( tmp ) {
      						elem[ ontype ] = tmp;
      					}
      				}
      			}
      		}
      
      		return event.result;
      	},
      
      	dispatch: function( event ) {
      
      		// Make a writable jQuery.Event from the native event object
      		event = jQuery.event.fix( event );
      
      		var i, j, ret, matched, handleObj,
      			handlerQueue = [],
      			args = slice.call( arguments ),
      			handlers = ( data_priv.get( this, "events" ) || {} )[ event.type ] || [],
      			special = jQuery.event.special[ event.type ] || {};
      
      		// Use the fix-ed jQuery.Event rather than the (read-only) native event
      		args[0] = event;
      		event.delegateTarget = this;
      
      		// Call the preDispatch hook for the mapped type, and let it bail if desired
      		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
      			return;
      		}
      
      		// Determine handlers
      		handlerQueue = jQuery.event.handlers.call( this, event, handlers );
      
      		// Run delegates first; they may want to stop propagation beneath us
      		i = 0;
      		while ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {
      			event.currentTarget = matched.elem;
      
      			j = 0;
      			while ( (handleObj = matched.handlers[ j++ ]) && !event.isImmediatePropagationStopped() ) {
      
      				// Triggered event must either 1) have no namespace, or 2) have namespace(s)
      				// a subset or equal to those in the bound event (both can have no namespace).
      				if ( !event.namespace_re || event.namespace_re.test( handleObj.namespace ) ) {
      
      					event.handleObj = handleObj;
      					event.data = handleObj.data;
      
      					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
      							.apply( matched.elem, args );
      
      					if ( ret !== undefined ) {
      						if ( (event.result = ret) === false ) {
      							event.preventDefault();
      							event.stopPropagation();
      						}
      					}
      				}
      			}
      		}
      
      		// Call the postDispatch hook for the mapped type
      		if ( special.postDispatch ) {
      			special.postDispatch.call( this, event );
      		}
      
      		return event.result;
      	},
      
      	handlers: function( event, handlers ) {
      		var i, matches, sel, handleObj,
      			handlerQueue = [],
      			delegateCount = handlers.delegateCount,
      			cur = event.target;
      
      		// Find delegate handlers
      		// Black-hole SVG <use> instance trees (#13180)
      		// Avoid non-left-click bubbling in Firefox (#3861)
      		if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {
      
      			for ( ; cur !== this; cur = cur.parentNode || this ) {
      
      				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
      				if ( cur.disabled !== true || event.type !== "click" ) {
      					matches = [];
      					for ( i = 0; i < delegateCount; i++ ) {
      						handleObj = handlers[ i ];
      
      						// Don't conflict with Object.prototype properties (#13203)
      						sel = handleObj.selector + " ";
      
      						if ( matches[ sel ] === undefined ) {
      							matches[ sel ] = handleObj.needsContext ?
      								jQuery( sel, this ).index( cur ) >= 0 :
      								jQuery.find( sel, this, null, [ cur ] ).length;
      						}
      						if ( matches[ sel ] ) {
      							matches.push( handleObj );
      						}
      					}
      					if ( matches.length ) {
      						handlerQueue.push({ elem: cur, handlers: matches });
      					}
      				}
      			}
      		}
      
      		// Add the remaining (directly-bound) handlers
      		if ( delegateCount < handlers.length ) {
      			handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });
      		}
      
      		return handlerQueue;
      	},
      
      	// Includes some event props shared by KeyEvent and MouseEvent
      	props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),
      
      	fixHooks: {},
      
      	keyHooks: {
      		props: "char charCode key keyCode".split(" "),
      		filter: function( event, original ) {
      
      			// Add which for key events
      			if ( event.which == null ) {
      				event.which = original.charCode != null ? original.charCode : original.keyCode;
      			}
      
      			return event;
      		}
      	},
      
      	mouseHooks: {
      		props: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
      		filter: function( event, original ) {
      			var eventDoc, doc, body,
      				button = original.button;
      
      			// Calculate pageX/Y if missing and clientX/Y available
      			if ( event.pageX == null && original.clientX != null ) {
      				eventDoc = event.target.ownerDocument || document;
      				doc = eventDoc.documentElement;
      				body = eventDoc.body;
      
      				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
      				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
      			}
      
      			// Add which for click: 1 === left; 2 === middle; 3 === right
      			// Note: button is not normalized, so don't use it
      			if ( !event.which && button !== undefined ) {
      				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
      			}
      
      			return event;
      		}
      	},
      
      	fix: function( event ) {
      		if ( event[ jQuery.expando ] ) {
      			return event;
      		}
      
      		// Create a writable copy of the event object and normalize some properties
      		var i, prop, copy,
      			type = event.type,
      			originalEvent = event,
      			fixHook = this.fixHooks[ type ];
      
      		if ( !fixHook ) {
      			this.fixHooks[ type ] = fixHook =
      				rmouseEvent.test( type ) ? this.mouseHooks :
      				rkeyEvent.test( type ) ? this.keyHooks :
      				{};
      		}
      		copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;
      
      		event = new jQuery.Event( originalEvent );
      
      		i = copy.length;
      		while ( i-- ) {
      			prop = copy[ i ];
      			event[ prop ] = originalEvent[ prop ];
      		}
      
      		// Support: Cordova 2.5 (WebKit) (#13255)
      		// All events should have a target; Cordova deviceready doesn't
      		if ( !event.target ) {
      			event.target = document;
      		}
      
      		// Support: Safari 6.0+, Chrome<28
      		// Target should not be a text node (#504, #13143)
      		if ( event.target.nodeType === 3 ) {
      			event.target = event.target.parentNode;
      		}
      
      		return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
      	},
      
      	special: {
      		load: {
      			// Prevent triggered image.load events from bubbling to window.load
      			noBubble: true
      		},
      		focus: {
      			// Fire native event if possible so blur/focus sequence is correct
      			trigger: function() {
      				if ( this !== safeActiveElement() && this.focus ) {
      					this.focus();
      					return false;
      				}
      			},
      			delegateType: "focusin"
      		},
      		blur: {
      			trigger: function() {
      				if ( this === safeActiveElement() && this.blur ) {
      					this.blur();
      					return false;
      				}
      			},
      			delegateType: "focusout"
      		},
      		click: {
      			// For checkbox, fire native event so checked state will be right
      			trigger: function() {
      				if ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {
      					this.click();
      					return false;
      				}
      			},
      
      			// For cross-browser consistency, don't fire native .click() on links
      			_default: function( event ) {
      				return jQuery.nodeName( event.target, "a" );
      			}
      		},
      
      		beforeunload: {
      			postDispatch: function( event ) {
      
      				// Support: Firefox 20+
      				// Firefox doesn't alert if the returnValue field is not set.
      				if ( event.result !== undefined && event.originalEvent ) {
      					event.originalEvent.returnValue = event.result;
      				}
      			}
      		}
      	},
      
      	simulate: function( type, elem, event, bubble ) {
      		// Piggyback on a donor event to simulate a different one.
      		// Fake originalEvent to avoid donor's stopPropagation, but if the
      		// simulated event prevents default then we do the same on the donor.
      		var e = jQuery.extend(
      			new jQuery.Event(),
      			event,
      			{
      				type: type,
      				isSimulated: true,
      				originalEvent: {}
      			}
      		);
      		if ( bubble ) {
      			jQuery.event.trigger( e, null, elem );
      		} else {
      			jQuery.event.dispatch.call( elem, e );
      		}
      		if ( e.isDefaultPrevented() ) {
      			event.preventDefault();
      		}
      	}
      };
      
      jQuery.removeEvent = function( elem, type, handle ) {
      	if ( elem.removeEventListener ) {
      		elem.removeEventListener( type, handle, false );
      	}
      };
      
      jQuery.Event = function( src, props ) {
      	// Allow instantiation without the 'new' keyword
      	if ( !(this instanceof jQuery.Event) ) {
      		return new jQuery.Event( src, props );
      	}
      
      	// Event object
      	if ( src && src.type ) {
      		this.originalEvent = src;
      		this.type = src.type;
      
      		// Events bubbling up the document may have been marked as prevented
      		// by a handler lower down the tree; reflect the correct value.
      		this.isDefaultPrevented = src.defaultPrevented ||
      				src.defaultPrevented === undefined &&
      				// Support: Android<4.0
      				src.returnValue === false ?
      			returnTrue :
      			returnFalse;
      
      	// Event type
      	} else {
      		this.type = src;
      	}
      
      	// Put explicitly provided properties onto the event object
      	if ( props ) {
      		jQuery.extend( this, props );
      	}
      
      	// Create a timestamp if incoming event doesn't have one
      	this.timeStamp = src && src.timeStamp || jQuery.now();
      
      	// Mark it as fixed
      	this[ jQuery.expando ] = true;
      };
      
      // jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
      // http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
      jQuery.Event.prototype = {
      	isDefaultPrevented: returnFalse,
      	isPropagationStopped: returnFalse,
      	isImmediatePropagationStopped: returnFalse,
      
      	preventDefault: function() {
      		var e = this.originalEvent;
      
      		this.isDefaultPrevented = returnTrue;
      
      		if ( e && e.preventDefault ) {
      			e.preventDefault();
      		}
      	},
      	stopPropagation: function() {
      		var e = this.originalEvent;
      
      		this.isPropagationStopped = returnTrue;
      
      		if ( e && e.stopPropagation ) {
      			e.stopPropagation();
      		}
      	},
      	stopImmediatePropagation: function() {
      		var e = this.originalEvent;
      
      		this.isImmediatePropagationStopped = returnTrue;
      
      		if ( e && e.stopImmediatePropagation ) {
      			e.stopImmediatePropagation();
      		}
      
      		this.stopPropagation();
      	}
      };
      
      // Create mouseenter/leave events using mouseover/out and event-time checks
      // Support: Chrome 15+
      jQuery.each({
      	mouseenter: "mouseover",
      	mouseleave: "mouseout",
      	pointerenter: "pointerover",
      	pointerleave: "pointerout"
      }, function( orig, fix ) {
      	jQuery.event.special[ orig ] = {
      		delegateType: fix,
      		bindType: fix,
      
      		handle: function( event ) {
      			var ret,
      				target = this,
      				related = event.relatedTarget,
      				handleObj = event.handleObj;
      
      			// For mousenter/leave call the handler if related is outside the target.
      			// NB: No relatedTarget if the mouse left/entered the browser window
      			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
      				event.type = handleObj.origType;
      				ret = handleObj.handler.apply( this, arguments );
      				event.type = fix;
      			}
      			return ret;
      		}
      	};
      });
      
      // Support: Firefox, Chrome, Safari
      // Create "bubbling" focus and blur events
      if ( !support.focusinBubbles ) {
      	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {
      
      		// Attach a single capturing handler on the document while someone wants focusin/focusout
      		var handler = function( event ) {
      				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
      			};
      
      		jQuery.event.special[ fix ] = {
      			setup: function() {
      				var doc = this.ownerDocument || this,
      					attaches = data_priv.access( doc, fix );
      
      				if ( !attaches ) {
      					doc.addEventListener( orig, handler, true );
      				}
      				data_priv.access( doc, fix, ( attaches || 0 ) + 1 );
      			},
      			teardown: function() {
      				var doc = this.ownerDocument || this,
      					attaches = data_priv.access( doc, fix ) - 1;
      
      				if ( !attaches ) {
      					doc.removeEventListener( orig, handler, true );
      					data_priv.remove( doc, fix );
      
      				} else {
      					data_priv.access( doc, fix, attaches );
      				}
      			}
      		};
      	});
      }
      
      jQuery.fn.extend({
      
      	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
      		var origFn, type;
      
      		// Types can be a map of types/handlers
      		if ( typeof types === "object" ) {
      			// ( types-Object, selector, data )
      			if ( typeof selector !== "string" ) {
      				// ( types-Object, data )
      				data = data || selector;
      				selector = undefined;
      			}
      			for ( type in types ) {
      				this.on( type, selector, data, types[ type ], one );
      			}
      			return this;
      		}
      
      		if ( data == null && fn == null ) {
      			// ( types, fn )
      			fn = selector;
      			data = selector = undefined;
      		} else if ( fn == null ) {
      			if ( typeof selector === "string" ) {
      				// ( types, selector, fn )
      				fn = data;
      				data = undefined;
      			} else {
      				// ( types, data, fn )
      				fn = data;
      				data = selector;
      				selector = undefined;
      			}
      		}
      		if ( fn === false ) {
      			fn = returnFalse;
      		} else if ( !fn ) {
      			return this;
      		}
      
      		if ( one === 1 ) {
      			origFn = fn;
      			fn = function( event ) {
      				// Can use an empty set, since event contains the info
      				jQuery().off( event );
      				return origFn.apply( this, arguments );
      			};
      			// Use same guid so caller can remove using origFn
      			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
      		}
      		return this.each( function() {
      			jQuery.event.add( this, types, fn, data, selector );
      		});
      	},
      	one: function( types, selector, data, fn ) {
      		return this.on( types, selector, data, fn, 1 );
      	},
      	off: function( types, selector, fn ) {
      		var handleObj, type;
      		if ( types && types.preventDefault && types.handleObj ) {
      			// ( event )  dispatched jQuery.Event
      			handleObj = types.handleObj;
      			jQuery( types.delegateTarget ).off(
      				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
      				handleObj.selector,
      				handleObj.handler
      			);
      			return this;
      		}
      		if ( typeof types === "object" ) {
      			// ( types-object [, selector] )
      			for ( type in types ) {
      				this.off( type, selector, types[ type ] );
      			}
      			return this;
      		}
      		if ( selector === false || typeof selector === "function" ) {
      			// ( types [, fn] )
      			fn = selector;
      			selector = undefined;
      		}
      		if ( fn === false ) {
      			fn = returnFalse;
      		}
      		return this.each(function() {
      			jQuery.event.remove( this, types, fn, selector );
      		});
      	},
      
      	trigger: function( type, data ) {
      		return this.each(function() {
      			jQuery.event.trigger( type, data, this );
      		});
      	},
      	triggerHandler: function( type, data ) {
      		var elem = this[0];
      		if ( elem ) {
      			return jQuery.event.trigger( type, data, elem, true );
      		}
      	}
      });
      
      
      var
      	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
      	rtagName = /<([\w:]+)/,
      	rhtml = /<|&#?\w+;/,
      	rnoInnerhtml = /<(?:script|style|link)/i,
      	// checked="checked" or checked
      	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
      	rscriptType = /^$|\/(?:java|ecma)script/i,
      	rscriptTypeMasked = /^true\/(.*)/,
      	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,
      
      	// We have to close these tags to support XHTML (#13200)
      	wrapMap = {
      
      		// Support: IE9
      		option: [ 1, "<select multiple='multiple'>", "</select>" ],
      
      		thead: [ 1, "<table>", "</table>" ],
      		col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
      		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
      		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
      
      		_default: [ 0, "", "" ]
      	};
      
      // Support: IE9
      wrapMap.optgroup = wrapMap.option;
      
      wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
      wrapMap.th = wrapMap.td;
      
      // Support: 1.x compatibility
      // Manipulating tables requires a tbody
      function manipulationTarget( elem, content ) {
      	return jQuery.nodeName( elem, "table" ) &&
      		jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ?
      
      		elem.getElementsByTagName("tbody")[0] ||
      			elem.appendChild( elem.ownerDocument.createElement("tbody") ) :
      		elem;
      }
      
      // Replace/restore the type attribute of script elements for safe DOM manipulation
      function disableScript( elem ) {
      	elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
      	return elem;
      }
      function restoreScript( elem ) {
      	var match = rscriptTypeMasked.exec( elem.type );
      
      	if ( match ) {
      		elem.type = match[ 1 ];
      	} else {
      		elem.removeAttribute("type");
      	}
      
      	return elem;
      }
      
      // Mark scripts as having already been evaluated
      function setGlobalEval( elems, refElements ) {
      	var i = 0,
      		l = elems.length;
      
      	for ( ; i < l; i++ ) {
      		data_priv.set(
      			elems[ i ], "globalEval", !refElements || data_priv.get( refElements[ i ], "globalEval" )
      		);
      	}
      }
      
      function cloneCopyEvent( src, dest ) {
      	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;
      
      	if ( dest.nodeType !== 1 ) {
      		return;
      	}
      
      	// 1. Copy private data: events, handlers, etc.
      	if ( data_priv.hasData( src ) ) {
      		pdataOld = data_priv.access( src );
      		pdataCur = data_priv.set( dest, pdataOld );
      		events = pdataOld.events;
      
      		if ( events ) {
      			delete pdataCur.handle;
      			pdataCur.events = {};
      
      			for ( type in events ) {
      				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
      					jQuery.event.add( dest, type, events[ type ][ i ] );
      				}
      			}
      		}
      	}
      
      	// 2. Copy user data
      	if ( data_user.hasData( src ) ) {
      		udataOld = data_user.access( src );
      		udataCur = jQuery.extend( {}, udataOld );
      
      		data_user.set( dest, udataCur );
      	}
      }
      
      function getAll( context, tag ) {
      	var ret = context.getElementsByTagName ? context.getElementsByTagName( tag || "*" ) :
      			context.querySelectorAll ? context.querySelectorAll( tag || "*" ) :
      			[];
      
      	return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
      		jQuery.merge( [ context ], ret ) :
      		ret;
      }
      
      // Fix IE bugs, see support tests
      function fixInput( src, dest ) {
      	var nodeName = dest.nodeName.toLowerCase();
      
      	// Fails to persist the checked state of a cloned checkbox or radio button.
      	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
      		dest.checked = src.checked;
      
      	// Fails to return the selected option to the default selected state when cloning options
      	} else if ( nodeName === "input" || nodeName === "textarea" ) {
      		dest.defaultValue = src.defaultValue;
      	}
      }
      
      jQuery.extend({
      	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
      		var i, l, srcElements, destElements,
      			clone = elem.cloneNode( true ),
      			inPage = jQuery.contains( elem.ownerDocument, elem );
      
      		// Fix IE cloning issues
      		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
      				!jQuery.isXMLDoc( elem ) ) {
      
      			// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
      			destElements = getAll( clone );
      			srcElements = getAll( elem );
      
      			for ( i = 0, l = srcElements.length; i < l; i++ ) {
      				fixInput( srcElements[ i ], destElements[ i ] );
      			}
      		}
      
      		// Copy the events from the original to the clone
      		if ( dataAndEvents ) {
      			if ( deepDataAndEvents ) {
      				srcElements = srcElements || getAll( elem );
      				destElements = destElements || getAll( clone );
      
      				for ( i = 0, l = srcElements.length; i < l; i++ ) {
      					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
      				}
      			} else {
      				cloneCopyEvent( elem, clone );
      			}
      		}
      
      		// Preserve script evaluation history
      		destElements = getAll( clone, "script" );
      		if ( destElements.length > 0 ) {
      			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
      		}
      
      		// Return the cloned set
      		return clone;
      	},
      
      	buildFragment: function( elems, context, scripts, selection ) {
      		var elem, tmp, tag, wrap, contains, j,
      			fragment = context.createDocumentFragment(),
      			nodes = [],
      			i = 0,
      			l = elems.length;
      
      		for ( ; i < l; i++ ) {
      			elem = elems[ i ];
      
      			if ( elem || elem === 0 ) {
      
      				// Add nodes directly
      				if ( jQuery.type( elem ) === "object" ) {
      					// Support: QtWebKit, PhantomJS
      					// push.apply(_, arraylike) throws on ancient WebKit
      					jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );
      
      				// Convert non-html into a text node
      				} else if ( !rhtml.test( elem ) ) {
      					nodes.push( context.createTextNode( elem ) );
      
      				// Convert html into DOM nodes
      				} else {
      					tmp = tmp || fragment.appendChild( context.createElement("div") );
      
      					// Deserialize a standard representation
      					tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
      					wrap = wrapMap[ tag ] || wrapMap._default;
      					tmp.innerHTML = wrap[ 1 ] + elem.replace( rxhtmlTag, "<$1></$2>" ) + wrap[ 2 ];
      
      					// Descend through wrappers to the right content
      					j = wrap[ 0 ];
      					while ( j-- ) {
      						tmp = tmp.lastChild;
      					}
      
      					// Support: QtWebKit, PhantomJS
      					// push.apply(_, arraylike) throws on ancient WebKit
      					jQuery.merge( nodes, tmp.childNodes );
      
      					// Remember the top-level container
      					tmp = fragment.firstChild;
      
      					// Ensure the created nodes are orphaned (#12392)
      					tmp.textContent = "";
      				}
      			}
      		}
      
      		// Remove wrapper from fragment
      		fragment.textContent = "";
      
      		i = 0;
      		while ( (elem = nodes[ i++ ]) ) {
      
      			// #4087 - If origin and destination elements are the same, and this is
      			// that element, do not do anything
      			if ( selection && jQuery.inArray( elem, selection ) !== -1 ) {
      				continue;
      			}
      
      			contains = jQuery.contains( elem.ownerDocument, elem );
      
      			// Append to fragment
      			tmp = getAll( fragment.appendChild( elem ), "script" );
      
      			// Preserve script evaluation history
      			if ( contains ) {
      				setGlobalEval( tmp );
      			}
      
      			// Capture executables
      			if ( scripts ) {
      				j = 0;
      				while ( (elem = tmp[ j++ ]) ) {
      					if ( rscriptType.test( elem.type || "" ) ) {
      						scripts.push( elem );
      					}
      				}
      			}
      		}
      
      		return fragment;
      	},
      
      	cleanData: function( elems ) {
      		var data, elem, type, key,
      			special = jQuery.event.special,
      			i = 0;
      
      		for ( ; (elem = elems[ i ]) !== undefined; i++ ) {
      			if ( jQuery.acceptData( elem ) ) {
      				key = elem[ data_priv.expando ];
      
      				if ( key && (data = data_priv.cache[ key ]) ) {
      					if ( data.events ) {
      						for ( type in data.events ) {
      							if ( special[ type ] ) {
      								jQuery.event.remove( elem, type );
      
      							// This is a shortcut to avoid jQuery.event.remove's overhead
      							} else {
      								jQuery.removeEvent( elem, type, data.handle );
      							}
      						}
      					}
      					if ( data_priv.cache[ key ] ) {
      						// Discard any remaining `private` data
      						delete data_priv.cache[ key ];
      					}
      				}
      			}
      			// Discard any remaining `user` data
      			delete data_user.cache[ elem[ data_user.expando ] ];
      		}
      	}
      });
      
      jQuery.fn.extend({
      	text: function( value ) {
      		return access( this, function( value ) {
      			return value === undefined ?
      				jQuery.text( this ) :
      				this.empty().each(function() {
      					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
      						this.textContent = value;
      					}
      				});
      		}, null, value, arguments.length );
      	},
      
      	append: function() {
      		return this.domManip( arguments, function( elem ) {
      			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
      				var target = manipulationTarget( this, elem );
      				target.appendChild( elem );
      			}
      		});
      	},
      
      	prepend: function() {
      		return this.domManip( arguments, function( elem ) {
      			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
      				var target = manipulationTarget( this, elem );
      				target.insertBefore( elem, target.firstChild );
      			}
      		});
      	},
      
      	before: function() {
      		return this.domManip( arguments, function( elem ) {
      			if ( this.parentNode ) {
      				this.parentNode.insertBefore( elem, this );
      			}
      		});
      	},
      
      	after: function() {
      		return this.domManip( arguments, function( elem ) {
      			if ( this.parentNode ) {
      				this.parentNode.insertBefore( elem, this.nextSibling );
      			}
      		});
      	},
      
      	remove: function( selector, keepData /* Internal Use Only */ ) {
      		var elem,
      			elems = selector ? jQuery.filter( selector, this ) : this,
      			i = 0;
      
      		for ( ; (elem = elems[i]) != null; i++ ) {
      			if ( !keepData && elem.nodeType === 1 ) {
      				jQuery.cleanData( getAll( elem ) );
      			}
      
      			if ( elem.parentNode ) {
      				if ( keepData && jQuery.contains( elem.ownerDocument, elem ) ) {
      					setGlobalEval( getAll( elem, "script" ) );
      				}
      				elem.parentNode.removeChild( elem );
      			}
      		}
      
      		return this;
      	},
      
      	empty: function() {
      		var elem,
      			i = 0;
      
      		for ( ; (elem = this[i]) != null; i++ ) {
      			if ( elem.nodeType === 1 ) {
      
      				// Prevent memory leaks
      				jQuery.cleanData( getAll( elem, false ) );
      
      				// Remove any remaining nodes
      				elem.textContent = "";
      			}
      		}
      
      		return this;
      	},
      
      	clone: function( dataAndEvents, deepDataAndEvents ) {
      		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
      		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;
      
      		return this.map(function() {
      			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
      		});
      	},
      
      	html: function( value ) {
      		return access( this, function( value ) {
      			var elem = this[ 0 ] || {},
      				i = 0,
      				l = this.length;
      
      			if ( value === undefined && elem.nodeType === 1 ) {
      				return elem.innerHTML;
      			}
      
      			// See if we can take a shortcut and just use innerHTML
      			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
      				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {
      
      				value = value.replace( rxhtmlTag, "<$1></$2>" );
      
      				try {
      					for ( ; i < l; i++ ) {
      						elem = this[ i ] || {};
      
      						// Remove element nodes and prevent memory leaks
      						if ( elem.nodeType === 1 ) {
      							jQuery.cleanData( getAll( elem, false ) );
      							elem.innerHTML = value;
      						}
      					}
      
      					elem = 0;
      
      				// If using innerHTML throws an exception, use the fallback method
      				} catch( e ) {}
      			}
      
      			if ( elem ) {
      				this.empty().append( value );
      			}
      		}, null, value, arguments.length );
      	},
      
      	replaceWith: function() {
      		var arg = arguments[ 0 ];
      
      		// Make the changes, replacing each context element with the new content
      		this.domManip( arguments, function( elem ) {
      			arg = this.parentNode;
      
      			jQuery.cleanData( getAll( this ) );
      
      			if ( arg ) {
      				arg.replaceChild( elem, this );
      			}
      		});
      
      		// Force removal if there was no new content (e.g., from empty arguments)
      		return arg && (arg.length || arg.nodeType) ? this : this.remove();
      	},
      
      	detach: function( selector ) {
      		return this.remove( selector, true );
      	},
      
      	domManip: function( args, callback ) {
      
      		// Flatten any nested arrays
      		args = concat.apply( [], args );
      
      		var fragment, first, scripts, hasScripts, node, doc,
      			i = 0,
      			l = this.length,
      			set = this,
      			iNoClone = l - 1,
      			value = args[ 0 ],
      			isFunction = jQuery.isFunction( value );
      
      		// We can't cloneNode fragments that contain checked, in WebKit
      		if ( isFunction ||
      				( l > 1 && typeof value === "string" &&
      					!support.checkClone && rchecked.test( value ) ) ) {
      			return this.each(function( index ) {
      				var self = set.eq( index );
      				if ( isFunction ) {
      					args[ 0 ] = value.call( this, index, self.html() );
      				}
      				self.domManip( args, callback );
      			});
      		}
      
      		if ( l ) {
      			fragment = jQuery.buildFragment( args, this[ 0 ].ownerDocument, false, this );
      			first = fragment.firstChild;
      
      			if ( fragment.childNodes.length === 1 ) {
      				fragment = first;
      			}
      
      			if ( first ) {
      				scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
      				hasScripts = scripts.length;
      
      				// Use the original fragment for the last item instead of the first because it can end up
      				// being emptied incorrectly in certain situations (#8070).
      				for ( ; i < l; i++ ) {
      					node = fragment;
      
      					if ( i !== iNoClone ) {
      						node = jQuery.clone( node, true, true );
      
      						// Keep references to cloned scripts for later restoration
      						if ( hasScripts ) {
      							// Support: QtWebKit
      							// jQuery.merge because push.apply(_, arraylike) throws
      							jQuery.merge( scripts, getAll( node, "script" ) );
      						}
      					}
      
      					callback.call( this[ i ], node, i );
      				}
      
      				if ( hasScripts ) {
      					doc = scripts[ scripts.length - 1 ].ownerDocument;
      
      					// Reenable scripts
      					jQuery.map( scripts, restoreScript );
      
      					// Evaluate executable scripts on first document insertion
      					for ( i = 0; i < hasScripts; i++ ) {
      						node = scripts[ i ];
      						if ( rscriptType.test( node.type || "" ) &&
      							!data_priv.access( node, "globalEval" ) && jQuery.contains( doc, node ) ) {
      
      							if ( node.src ) {
      								// Optional AJAX dependency, but won't run scripts if not present
      								if ( jQuery._evalUrl ) {
      									jQuery._evalUrl( node.src );
      								}
      							} else {
      								jQuery.globalEval( node.textContent.replace( rcleanScript, "" ) );
      							}
      						}
      					}
      				}
      			}
      		}
      
      		return this;
      	}
      });
      
      jQuery.each({
      	appendTo: "append",
      	prependTo: "prepend",
      	insertBefore: "before",
      	insertAfter: "after",
      	replaceAll: "replaceWith"
      }, function( name, original ) {
      	jQuery.fn[ name ] = function( selector ) {
      		var elems,
      			ret = [],
      			insert = jQuery( selector ),
      			last = insert.length - 1,
      			i = 0;
      
      		for ( ; i <= last; i++ ) {
      			elems = i === last ? this : this.clone( true );
      			jQuery( insert[ i ] )[ original ]( elems );
      
      			// Support: QtWebKit
      			// .get() because push.apply(_, arraylike) throws
      			push.apply( ret, elems.get() );
      		}
      
      		return this.pushStack( ret );
      	};
      });
      
      
      var iframe,
      	elemdisplay = {};
      
      /**
       * Retrieve the actual display of a element
       * @param {String} name nodeName of the element
       * @param {Object} doc Document object
       */
      // Called only from within defaultDisplay
      function actualDisplay( name, doc ) {
      	var style,
      		elem = jQuery( doc.createElement( name ) ).appendTo( doc.body ),
      
      		// getDefaultComputedStyle might be reliably used only on attached element
      		display = window.getDefaultComputedStyle && ( style = window.getDefaultComputedStyle( elem[ 0 ] ) ) ?
      
      			// Use of this method is a temporary fix (more like optimization) until something better comes along,
      			// since it was removed from specification and supported only in FF
      			style.display : jQuery.css( elem[ 0 ], "display" );
      
      	// We don't have any data stored on the element,
      	// so use "detach" method as fast way to get rid of the element
      	elem.detach();
      
      	return display;
      }
      
      /**
       * Try to determine the default display value of an element
       * @param {String} nodeName
       */
      function defaultDisplay( nodeName ) {
      	var doc = document,
      		display = elemdisplay[ nodeName ];
      
      	if ( !display ) {
      		display = actualDisplay( nodeName, doc );
      
      		// If the simple way fails, read from inside an iframe
      		if ( display === "none" || !display ) {
      
      			// Use the already-created iframe if possible
      			iframe = (iframe || jQuery( "<iframe frameborder='0' width='0' height='0'/>" )).appendTo( doc.documentElement );
      
      			// Always write a new HTML skeleton so Webkit and Firefox don't choke on reuse
      			doc = iframe[ 0 ].contentDocument;
      
      			// Support: IE
      			doc.write();
      			doc.close();
      
      			display = actualDisplay( nodeName, doc );
      			iframe.detach();
      		}
      
      		// Store the correct default display
      		elemdisplay[ nodeName ] = display;
      	}
      
      	return display;
      }
      var rmargin = (/^margin/);
      
      var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );
      
      var getStyles = function( elem ) {
      		// Support: IE<=11+, Firefox<=30+ (#15098, #14150)
      		// IE throws on elements created in popups
      		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
      		if ( elem.ownerDocument.defaultView.opener ) {
      			return elem.ownerDocument.defaultView.getComputedStyle( elem, null );
      		}
      
      		return window.getComputedStyle( elem, null );
      	};
      
      
      
      function curCSS( elem, name, computed ) {
      	var width, minWidth, maxWidth, ret,
      		style = elem.style;
      
      	computed = computed || getStyles( elem );
      
      	// Support: IE9
      	// getPropertyValue is only needed for .css('filter') (#12537)
      	if ( computed ) {
      		ret = computed.getPropertyValue( name ) || computed[ name ];
      	}
      
      	if ( computed ) {
      
      		if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
      			ret = jQuery.style( elem, name );
      		}
      
      		// Support: iOS < 6
      		// A tribute to the "awesome hack by Dean Edwards"
      		// iOS < 6 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
      		// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
      		if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {
      
      			// Remember the original values
      			width = style.width;
      			minWidth = style.minWidth;
      			maxWidth = style.maxWidth;
      
      			// Put in the new values to get a computed value out
      			style.minWidth = style.maxWidth = style.width = ret;
      			ret = computed.width;
      
      			// Revert the changed values
      			style.width = width;
      			style.minWidth = minWidth;
      			style.maxWidth = maxWidth;
      		}
      	}
      
      	return ret !== undefined ?
      		// Support: IE
      		// IE returns zIndex value as an integer.
      		ret + "" :
      		ret;
      }
      
      
      function addGetHookIf( conditionFn, hookFn ) {
      	// Define the hook, we'll check on the first run if it's really needed.
      	return {
      		get: function() {
      			if ( conditionFn() ) {
      				// Hook not needed (or it's not possible to use it due
      				// to missing dependency), remove it.
      				delete this.get;
      				return;
      			}
      
      			// Hook needed; redefine it so that the support test is not executed again.
      			return (this.get = hookFn).apply( this, arguments );
      		}
      	};
      }
      
      
      (function() {
      	var pixelPositionVal, boxSizingReliableVal,
      		docElem = document.documentElement,
      		container = document.createElement( "div" ),
      		div = document.createElement( "div" );
      
      	if ( !div.style ) {
      		return;
      	}
      
      	// Support: IE9-11+
      	// Style of cloned element affects source element cloned (#8908)
      	div.style.backgroundClip = "content-box";
      	div.cloneNode( true ).style.backgroundClip = "";
      	support.clearCloneStyle = div.style.backgroundClip === "content-box";
      
      	container.style.cssText = "border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;" +
      		"position:absolute";
      	container.appendChild( div );
      
      	// Executing both pixelPosition & boxSizingReliable tests require only one layout
      	// so they're executed at the same time to save the second computation.
      	function computePixelPositionAndBoxSizingReliable() {
      		div.style.cssText =
      			// Support: Firefox<29, Android 2.3
      			// Vendor-prefix box-sizing
      			"-webkit-box-sizing:border-box;-moz-box-sizing:border-box;" +
      			"box-sizing:border-box;display:block;margin-top:1%;top:1%;" +
      			"border:1px;padding:1px;width:4px;position:absolute";
      		div.innerHTML = "";
      		docElem.appendChild( container );
      
      		var divStyle = window.getComputedStyle( div, null );
      		pixelPositionVal = divStyle.top !== "1%";
      		boxSizingReliableVal = divStyle.width === "4px";
      
      		docElem.removeChild( container );
      	}
      
      	// Support: node.js jsdom
      	// Don't assume that getComputedStyle is a property of the global object
      	if ( window.getComputedStyle ) {
      		jQuery.extend( support, {
      			pixelPosition: function() {
      
      				// This test is executed only once but we still do memoizing
      				// since we can use the boxSizingReliable pre-computing.
      				// No need to check if the test was already performed, though.
      				computePixelPositionAndBoxSizingReliable();
      				return pixelPositionVal;
      			},
      			boxSizingReliable: function() {
      				if ( boxSizingReliableVal == null ) {
      					computePixelPositionAndBoxSizingReliable();
      				}
      				return boxSizingReliableVal;
      			},
      			reliableMarginRight: function() {
      
      				// Support: Android 2.3
      				// Check if div with explicit width and no margin-right incorrectly
      				// gets computed margin-right based on width of container. (#3333)
      				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
      				// This support function is only executed once so no memoizing is needed.
      				var ret,
      					marginDiv = div.appendChild( document.createElement( "div" ) );
      
      				// Reset CSS: box-sizing; display; margin; border; padding
      				marginDiv.style.cssText = div.style.cssText =
      					// Support: Firefox<29, Android 2.3
      					// Vendor-prefix box-sizing
      					"-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" +
      					"box-sizing:content-box;display:block;margin:0;border:0;padding:0";
      				marginDiv.style.marginRight = marginDiv.style.width = "0";
      				div.style.width = "1px";
      				docElem.appendChild( container );
      
      				ret = !parseFloat( window.getComputedStyle( marginDiv, null ).marginRight );
      
      				docElem.removeChild( container );
      				div.removeChild( marginDiv );
      
      				return ret;
      			}
      		});
      	}
      })();
      
      
      // A method for quickly swapping in/out CSS properties to get correct calculations.
      jQuery.swap = function( elem, options, callback, args ) {
      	var ret, name,
      		old = {};
      
      	// Remember the old values, and insert the new ones
      	for ( name in options ) {
      		old[ name ] = elem.style[ name ];
      		elem.style[ name ] = options[ name ];
      	}
      
      	ret = callback.apply( elem, args || [] );
      
      	// Revert the old values
      	for ( name in options ) {
      		elem.style[ name ] = old[ name ];
      	}
      
      	return ret;
      };
      
      
      var
      	// Swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
      	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
      	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
      	rnumsplit = new RegExp( "^(" + pnum + ")(.*)$", "i" ),
      	rrelNum = new RegExp( "^([+-])=(" + pnum + ")", "i" ),
      
      	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
      	cssNormalTransform = {
      		letterSpacing: "0",
      		fontWeight: "400"
      	},
      
      	cssPrefixes = [ "Webkit", "O", "Moz", "ms" ];
      
      // Return a css property mapped to a potentially vendor prefixed property
      function vendorPropName( style, name ) {
      
      	// Shortcut for names that are not vendor prefixed
      	if ( name in style ) {
      		return name;
      	}
      
      	// Check for vendor prefixed names
      	var capName = name[0].toUpperCase() + name.slice(1),
      		origName = name,
      		i = cssPrefixes.length;
      
      	while ( i-- ) {
      		name = cssPrefixes[ i ] + capName;
      		if ( name in style ) {
      			return name;
      		}
      	}
      
      	return origName;
      }
      
      function setPositiveNumber( elem, value, subtract ) {
      	var matches = rnumsplit.exec( value );
      	return matches ?
      		// Guard against undefined "subtract", e.g., when used as in cssHooks
      		Math.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :
      		value;
      }
      
      function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
      	var i = extra === ( isBorderBox ? "border" : "content" ) ?
      		// If we already have the right measurement, avoid augmentation
      		4 :
      		// Otherwise initialize for horizontal or vertical properties
      		name === "width" ? 1 : 0,
      
      		val = 0;
      
      	for ( ; i < 4; i += 2 ) {
      		// Both box models exclude margin, so add it if we want it
      		if ( extra === "margin" ) {
      			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
      		}
      
      		if ( isBorderBox ) {
      			// border-box includes padding, so remove it if we want content
      			if ( extra === "content" ) {
      				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
      			}
      
      			// At this point, extra isn't border nor margin, so remove border
      			if ( extra !== "margin" ) {
      				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
      			}
      		} else {
      			// At this point, extra isn't content, so add padding
      			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
      
      			// At this point, extra isn't content nor padding, so add border
      			if ( extra !== "padding" ) {
      				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
      			}
      		}
      	}
      
      	return val;
      }
      
      function getWidthOrHeight( elem, name, extra ) {
      
      	// Start with offset property, which is equivalent to the border-box value
      	var valueIsBorderBox = true,
      		val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
      		styles = getStyles( elem ),
      		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";
      
      	// Some non-html elements return undefined for offsetWidth, so check for null/undefined
      	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
      	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
      	if ( val <= 0 || val == null ) {
      		// Fall back to computed then uncomputed css if necessary
      		val = curCSS( elem, name, styles );
      		if ( val < 0 || val == null ) {
      			val = elem.style[ name ];
      		}
      
      		// Computed unit is not pixels. Stop here and return.
      		if ( rnumnonpx.test(val) ) {
      			return val;
      		}
      
      		// Check for style in case a browser which returns unreliable values
      		// for getComputedStyle silently falls back to the reliable elem.style
      		valueIsBorderBox = isBorderBox &&
      			( support.boxSizingReliable() || val === elem.style[ name ] );
      
      		// Normalize "", auto, and prepare for extra
      		val = parseFloat( val ) || 0;
      	}
      
      	// Use the active box-sizing model to add/subtract irrelevant styles
      	return ( val +
      		augmentWidthOrHeight(
      			elem,
      			name,
      			extra || ( isBorderBox ? "border" : "content" ),
      			valueIsBorderBox,
      			styles
      		)
      	) + "px";
      }
      
      function showHide( elements, show ) {
      	var display, elem, hidden,
      		values = [],
      		index = 0,
      		length = elements.length;
      
      	for ( ; index < length; index++ ) {
      		elem = elements[ index ];
      		if ( !elem.style ) {
      			continue;
      		}
      
      		values[ index ] = data_priv.get( elem, "olddisplay" );
      		display = elem.style.display;
      		if ( show ) {
      			// Reset the inline display of this element to learn if it is
      			// being hidden by cascaded rules or not
      			if ( !values[ index ] && display === "none" ) {
      				elem.style.display = "";
      			}
      
      			// Set elements which have been overridden with display: none
      			// in a stylesheet to whatever the default browser style is
      			// for such an element
      			if ( elem.style.display === "" && isHidden( elem ) ) {
      				values[ index ] = data_priv.access( elem, "olddisplay", defaultDisplay(elem.nodeName) );
      			}
      		} else {
      			hidden = isHidden( elem );
      
      			if ( display !== "none" || !hidden ) {
      				data_priv.set( elem, "olddisplay", hidden ? display : jQuery.css( elem, "display" ) );
      			}
      		}
      	}
      
      	// Set the display of most of the elements in a second loop
      	// to avoid the constant reflow
      	for ( index = 0; index < length; index++ ) {
      		elem = elements[ index ];
      		if ( !elem.style ) {
      			continue;
      		}
      		if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
      			elem.style.display = show ? values[ index ] || "" : "none";
      		}
      	}
      
      	return elements;
      }
      
      jQuery.extend({
      
      	// Add in style property hooks for overriding the default
      	// behavior of getting and setting a style property
      	cssHooks: {
      		opacity: {
      			get: function( elem, computed ) {
      				if ( computed ) {
      
      					// We should always get a number back from opacity
      					var ret = curCSS( elem, "opacity" );
      					return ret === "" ? "1" : ret;
      				}
      			}
      		}
      	},
      
      	// Don't automatically add "px" to these possibly-unitless properties
      	cssNumber: {
      		"columnCount": true,
      		"fillOpacity": true,
      		"flexGrow": true,
      		"flexShrink": true,
      		"fontWeight": true,
      		"lineHeight": true,
      		"opacity": true,
      		"order": true,
      		"orphans": true,
      		"widows": true,
      		"zIndex": true,
      		"zoom": true
      	},
      
      	// Add in properties whose names you wish to fix before
      	// setting or getting the value
      	cssProps: {
      		"float": "cssFloat"
      	},
      
      	// Get and set the style property on a DOM Node
      	style: function( elem, name, value, extra ) {
      
      		// Don't set styles on text and comment nodes
      		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
      			return;
      		}
      
      		// Make sure that we're working with the right name
      		var ret, type, hooks,
      			origName = jQuery.camelCase( name ),
      			style = elem.style;
      
      		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );
      
      		// Gets hook for the prefixed version, then unprefixed version
      		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];
      
      		// Check if we're setting a value
      		if ( value !== undefined ) {
      			type = typeof value;
      
      			// Convert "+=" or "-=" to relative numbers (#7345)
      			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
      				value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
      				// Fixes bug #9237
      				type = "number";
      			}
      
      			// Make sure that null and NaN values aren't set (#7116)
      			if ( value == null || value !== value ) {
      				return;
      			}
      
      			// If a number, add 'px' to the (except for certain CSS properties)
      			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
      				value += "px";
      			}
      
      			// Support: IE9-11+
      			// background-* props affect original clone's values
      			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
      				style[ name ] = "inherit";
      			}
      
      			// If a hook was provided, use that value, otherwise just set the specified value
      			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {
      				style[ name ] = value;
      			}
      
      		} else {
      			// If a hook was provided get the non-computed value from there
      			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
      				return ret;
      			}
      
      			// Otherwise just get the value from the style object
      			return style[ name ];
      		}
      	},
      
      	css: function( elem, name, extra, styles ) {
      		var val, num, hooks,
      			origName = jQuery.camelCase( name );
      
      		// Make sure that we're working with the right name
      		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );
      
      		// Try prefixed name followed by the unprefixed name
      		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];
      
      		// If a hook was provided get the computed value from there
      		if ( hooks && "get" in hooks ) {
      			val = hooks.get( elem, true, extra );
      		}
      
      		// Otherwise, if a way to get the computed value exists, use that
      		if ( val === undefined ) {
      			val = curCSS( elem, name, styles );
      		}
      
      		// Convert "normal" to computed value
      		if ( val === "normal" && name in cssNormalTransform ) {
      			val = cssNormalTransform[ name ];
      		}
      
      		// Make numeric if forced or a qualifier was provided and val looks numeric
      		if ( extra === "" || extra ) {
      			num = parseFloat( val );
      			return extra === true || jQuery.isNumeric( num ) ? num || 0 : val;
      		}
      		return val;
      	}
      });
      
      jQuery.each([ "height", "width" ], function( i, name ) {
      	jQuery.cssHooks[ name ] = {
      		get: function( elem, computed, extra ) {
      			if ( computed ) {
      
      				// Certain elements can have dimension info if we invisibly show them
      				// but it must have a current display style that would benefit
      				return rdisplayswap.test( jQuery.css( elem, "display" ) ) && elem.offsetWidth === 0 ?
      					jQuery.swap( elem, cssShow, function() {
      						return getWidthOrHeight( elem, name, extra );
      					}) :
      					getWidthOrHeight( elem, name, extra );
      			}
      		},
      
      		set: function( elem, value, extra ) {
      			var styles = extra && getStyles( elem );
      			return setPositiveNumber( elem, value, extra ?
      				augmentWidthOrHeight(
      					elem,
      					name,
      					extra,
      					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
      					styles
      				) : 0
      			);
      		}
      	};
      });
      
      // Support: Android 2.3
      jQuery.cssHooks.marginRight = addGetHookIf( support.reliableMarginRight,
      	function( elem, computed ) {
      		if ( computed ) {
      			return jQuery.swap( elem, { "display": "inline-block" },
      				curCSS, [ elem, "marginRight" ] );
      		}
      	}
      );
      
      // These hooks are used by animate to expand properties
      jQuery.each({
      	margin: "",
      	padding: "",
      	border: "Width"
      }, function( prefix, suffix ) {
      	jQuery.cssHooks[ prefix + suffix ] = {
      		expand: function( value ) {
      			var i = 0,
      				expanded = {},
      
      				// Assumes a single number if not a string
      				parts = typeof value === "string" ? value.split(" ") : [ value ];
      
      			for ( ; i < 4; i++ ) {
      				expanded[ prefix + cssExpand[ i ] + suffix ] =
      					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
      			}
      
      			return expanded;
      		}
      	};
      
      	if ( !rmargin.test( prefix ) ) {
      		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
      	}
      });
      
      jQuery.fn.extend({
      	css: function( name, value ) {
      		return access( this, function( elem, name, value ) {
      			var styles, len,
      				map = {},
      				i = 0;
      
      			if ( jQuery.isArray( name ) ) {
      				styles = getStyles( elem );
      				len = name.length;
      
      				for ( ; i < len; i++ ) {
      					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
      				}
      
      				return map;
      			}
      
      			return value !== undefined ?
      				jQuery.style( elem, name, value ) :
      				jQuery.css( elem, name );
      		}, name, value, arguments.length > 1 );
      	},
      	show: function() {
      		return showHide( this, true );
      	},
      	hide: function() {
      		return showHide( this );
      	},
      	toggle: function( state ) {
      		if ( typeof state === "boolean" ) {
      			return state ? this.show() : this.hide();
      		}
      
      		return this.each(function() {
      			if ( isHidden( this ) ) {
      				jQuery( this ).show();
      			} else {
      				jQuery( this ).hide();
      			}
      		});
      	}
      });
      
      
      function Tween( elem, options, prop, end, easing ) {
      	return new Tween.prototype.init( elem, options, prop, end, easing );
      }
      jQuery.Tween = Tween;
      
      Tween.prototype = {
      	constructor: Tween,
      	init: function( elem, options, prop, end, easing, unit ) {
      		this.elem = elem;
      		this.prop = prop;
      		this.easing = easing || "swing";
      		this.options = options;
      		this.start = this.now = this.cur();
      		this.end = end;
      		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
      	},
      	cur: function() {
      		var hooks = Tween.propHooks[ this.prop ];
      
      		return hooks && hooks.get ?
      			hooks.get( this ) :
      			Tween.propHooks._default.get( this );
      	},
      	run: function( percent ) {
      		var eased,
      			hooks = Tween.propHooks[ this.prop ];
      
      		if ( this.options.duration ) {
      			this.pos = eased = jQuery.easing[ this.easing ](
      				percent, this.options.duration * percent, 0, 1, this.options.duration
      			);
      		} else {
      			this.pos = eased = percent;
      		}
      		this.now = ( this.end - this.start ) * eased + this.start;
      
      		if ( this.options.step ) {
      			this.options.step.call( this.elem, this.now, this );
      		}
      
      		if ( hooks && hooks.set ) {
      			hooks.set( this );
      		} else {
      			Tween.propHooks._default.set( this );
      		}
      		return this;
      	}
      };
      
      Tween.prototype.init.prototype = Tween.prototype;
      
      Tween.propHooks = {
      	_default: {
      		get: function( tween ) {
      			var result;
      
      			if ( tween.elem[ tween.prop ] != null &&
      				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
      				return tween.elem[ tween.prop ];
      			}
      
      			// Passing an empty string as a 3rd parameter to .css will automatically
      			// attempt a parseFloat and fallback to a string if the parse fails.
      			// Simple values such as "10px" are parsed to Float;
      			// complex values such as "rotate(1rad)" are returned as-is.
      			result = jQuery.css( tween.elem, tween.prop, "" );
      			// Empty strings, null, undefined and "auto" are converted to 0.
      			return !result || result === "auto" ? 0 : result;
      		},
      		set: function( tween ) {
      			// Use step hook for back compat.
      			// Use cssHook if its there.
      			// Use .style if available and use plain properties where available.
      			if ( jQuery.fx.step[ tween.prop ] ) {
      				jQuery.fx.step[ tween.prop ]( tween );
      			} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
      				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
      			} else {
      				tween.elem[ tween.prop ] = tween.now;
      			}
      		}
      	}
      };
      
      // Support: IE9
      // Panic based approach to setting things on disconnected nodes
      Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
      	set: function( tween ) {
      		if ( tween.elem.nodeType && tween.elem.parentNode ) {
      			tween.elem[ tween.prop ] = tween.now;
      		}
      	}
      };
      
      jQuery.easing = {
      	linear: function( p ) {
      		return p;
      	},
      	swing: function( p ) {
      		return 0.5 - Math.cos( p * Math.PI ) / 2;
      	}
      };
      
      jQuery.fx = Tween.prototype.init;
      
      // Back Compat <1.8 extension point
      jQuery.fx.step = {};
      
      
      
      
      var
      	fxNow, timerId,
      	rfxtypes = /^(?:toggle|show|hide)$/,
      	rfxnum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" ),
      	rrun = /queueHooks$/,
      	animationPrefilters = [ defaultPrefilter ],
      	tweeners = {
      		"*": [ function( prop, value ) {
      			var tween = this.createTween( prop, value ),
      				target = tween.cur(),
      				parts = rfxnum.exec( value ),
      				unit = parts && parts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),
      
      				// Starting value computation is required for potential unit mismatches
      				start = ( jQuery.cssNumber[ prop ] || unit !== "px" && +target ) &&
      					rfxnum.exec( jQuery.css( tween.elem, prop ) ),
      				scale = 1,
      				maxIterations = 20;
      
      			if ( start && start[ 3 ] !== unit ) {
      				// Trust units reported by jQuery.css
      				unit = unit || start[ 3 ];
      
      				// Make sure we update the tween properties later on
      				parts = parts || [];
      
      				// Iteratively approximate from a nonzero starting point
      				start = +target || 1;
      
      				do {
      					// If previous iteration zeroed out, double until we get *something*.
      					// Use string for doubling so we don't accidentally see scale as unchanged below
      					scale = scale || ".5";
      
      					// Adjust and apply
      					start = start / scale;
      					jQuery.style( tween.elem, prop, start + unit );
      
      				// Update scale, tolerating zero or NaN from tween.cur(),
      				// break the loop if scale is unchanged or perfect, or if we've just had enough
      				} while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
      			}
      
      			// Update tween properties
      			if ( parts ) {
      				start = tween.start = +start || +target || 0;
      				tween.unit = unit;
      				// If a +=/-= token was provided, we're doing a relative animation
      				tween.end = parts[ 1 ] ?
      					start + ( parts[ 1 ] + 1 ) * parts[ 2 ] :
      					+parts[ 2 ];
      			}
      
      			return tween;
      		} ]
      	};
      
      // Animations created synchronously will run synchronously
      function createFxNow() {
      	setTimeout(function() {
      		fxNow = undefined;
      	});
      	return ( fxNow = jQuery.now() );
      }
      
      // Generate parameters to create a standard animation
      function genFx( type, includeWidth ) {
      	var which,
      		i = 0,
      		attrs = { height: type };
      
      	// If we include width, step value is 1 to do all cssExpand values,
      	// otherwise step value is 2 to skip over Left and Right
      	includeWidth = includeWidth ? 1 : 0;
      	for ( ; i < 4 ; i += 2 - includeWidth ) {
      		which = cssExpand[ i ];
      		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
      	}
      
      	if ( includeWidth ) {
      		attrs.opacity = attrs.width = type;
      	}
      
      	return attrs;
      }
      
      function createTween( value, prop, animation ) {
      	var tween,
      		collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
      		index = 0,
      		length = collection.length;
      	for ( ; index < length; index++ ) {
      		if ( (tween = collection[ index ].call( animation, prop, value )) ) {
      
      			// We're done with this property
      			return tween;
      		}
      	}
      }
      
      function defaultPrefilter( elem, props, opts ) {
      	/* jshint validthis: true */
      	var prop, value, toggle, tween, hooks, oldfire, display, checkDisplay,
      		anim = this,
      		orig = {},
      		style = elem.style,
      		hidden = elem.nodeType && isHidden( elem ),
      		dataShow = data_priv.get( elem, "fxshow" );
      
      	// Handle queue: false promises
      	if ( !opts.queue ) {
      		hooks = jQuery._queueHooks( elem, "fx" );
      		if ( hooks.unqueued == null ) {
      			hooks.unqueued = 0;
      			oldfire = hooks.empty.fire;
      			hooks.empty.fire = function() {
      				if ( !hooks.unqueued ) {
      					oldfire();
      				}
      			};
      		}
      		hooks.unqueued++;
      
      		anim.always(function() {
      			// Ensure the complete handler is called before this completes
      			anim.always(function() {
      				hooks.unqueued--;
      				if ( !jQuery.queue( elem, "fx" ).length ) {
      					hooks.empty.fire();
      				}
      			});
      		});
      	}
      
      	// Height/width overflow pass
      	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
      		// Make sure that nothing sneaks out
      		// Record all 3 overflow attributes because IE9-10 do not
      		// change the overflow attribute when overflowX and
      		// overflowY are set to the same value
      		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];
      
      		// Set display property to inline-block for height/width
      		// animations on inline elements that are having width/height animated
      		display = jQuery.css( elem, "display" );
      
      		// Test default display if display is currently "none"
      		checkDisplay = display === "none" ?
      			data_priv.get( elem, "olddisplay" ) || defaultDisplay( elem.nodeName ) : display;
      
      		if ( checkDisplay === "inline" && jQuery.css( elem, "float" ) === "none" ) {
      			style.display = "inline-block";
      		}
      	}
      
      	if ( opts.overflow ) {
      		style.overflow = "hidden";
      		anim.always(function() {
      			style.overflow = opts.overflow[ 0 ];
      			style.overflowX = opts.overflow[ 1 ];
      			style.overflowY = opts.overflow[ 2 ];
      		});
      	}
      
      	// show/hide pass
      	for ( prop in props ) {
      		value = props[ prop ];
      		if ( rfxtypes.exec( value ) ) {
      			delete props[ prop ];
      			toggle = toggle || value === "toggle";
      			if ( value === ( hidden ? "hide" : "show" ) ) {
      
      				// If there is dataShow left over from a stopped hide or show and we are going to proceed with show, we should pretend to be hidden
      				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
      					hidden = true;
      				} else {
      					continue;
      				}
      			}
      			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
      
      		// Any non-fx value stops us from restoring the original display value
      		} else {
      			display = undefined;
      		}
      	}
      
      	if ( !jQuery.isEmptyObject( orig ) ) {
      		if ( dataShow ) {
      			if ( "hidden" in dataShow ) {
      				hidden = dataShow.hidden;
      			}
      		} else {
      			dataShow = data_priv.access( elem, "fxshow", {} );
      		}
      
      		// Store state if its toggle - enables .stop().toggle() to "reverse"
      		if ( toggle ) {
      			dataShow.hidden = !hidden;
      		}
      		if ( hidden ) {
      			jQuery( elem ).show();
      		} else {
      			anim.done(function() {
      				jQuery( elem ).hide();
      			});
      		}
      		anim.done(function() {
      			var prop;
      
      			data_priv.remove( elem, "fxshow" );
      			for ( prop in orig ) {
      				jQuery.style( elem, prop, orig[ prop ] );
      			}
      		});
      		for ( prop in orig ) {
      			tween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
      
      			if ( !( prop in dataShow ) ) {
      				dataShow[ prop ] = tween.start;
      				if ( hidden ) {
      					tween.end = tween.start;
      					tween.start = prop === "width" || prop === "height" ? 1 : 0;
      				}
      			}
      		}
      
      	// If this is a noop like .hide().hide(), restore an overwritten display value
      	} else if ( (display === "none" ? defaultDisplay( elem.nodeName ) : display) === "inline" ) {
      		style.display = display;
      	}
      }
      
      function propFilter( props, specialEasing ) {
      	var index, name, easing, value, hooks;
      
      	// camelCase, specialEasing and expand cssHook pass
      	for ( index in props ) {
      		name = jQuery.camelCase( index );
      		easing = specialEasing[ name ];
      		value = props[ index ];
      		if ( jQuery.isArray( value ) ) {
      			easing = value[ 1 ];
      			value = props[ index ] = value[ 0 ];
      		}
      
      		if ( index !== name ) {
      			props[ name ] = value;
      			delete props[ index ];
      		}
      
      		hooks = jQuery.cssHooks[ name ];
      		if ( hooks && "expand" in hooks ) {
      			value = hooks.expand( value );
      			delete props[ name ];
      
      			// Not quite $.extend, this won't overwrite existing keys.
      			// Reusing 'index' because we have the correct "name"
      			for ( index in value ) {
      				if ( !( index in props ) ) {
      					props[ index ] = value[ index ];
      					specialEasing[ index ] = easing;
      				}
      			}
      		} else {
      			specialEasing[ name ] = easing;
      		}
      	}
      }
      
      function Animation( elem, properties, options ) {
      	var result,
      		stopped,
      		index = 0,
      		length = animationPrefilters.length,
      		deferred = jQuery.Deferred().always( function() {
      			// Don't match elem in the :animated selector
      			delete tick.elem;
      		}),
      		tick = function() {
      			if ( stopped ) {
      				return false;
      			}
      			var currentTime = fxNow || createFxNow(),
      				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
      				// Support: Android 2.3
      				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
      				temp = remaining / animation.duration || 0,
      				percent = 1 - temp,
      				index = 0,
      				length = animation.tweens.length;
      
      			for ( ; index < length ; index++ ) {
      				animation.tweens[ index ].run( percent );
      			}
      
      			deferred.notifyWith( elem, [ animation, percent, remaining ]);
      
      			if ( percent < 1 && length ) {
      				return remaining;
      			} else {
      				deferred.resolveWith( elem, [ animation ] );
      				return false;
      			}
      		},
      		animation = deferred.promise({
      			elem: elem,
      			props: jQuery.extend( {}, properties ),
      			opts: jQuery.extend( true, { specialEasing: {} }, options ),
      			originalProperties: properties,
      			originalOptions: options,
      			startTime: fxNow || createFxNow(),
      			duration: options.duration,
      			tweens: [],
      			createTween: function( prop, end ) {
      				var tween = jQuery.Tween( elem, animation.opts, prop, end,
      						animation.opts.specialEasing[ prop ] || animation.opts.easing );
      				animation.tweens.push( tween );
      				return tween;
      			},
      			stop: function( gotoEnd ) {
      				var index = 0,
      					// If we are going to the end, we want to run all the tweens
      					// otherwise we skip this part
      					length = gotoEnd ? animation.tweens.length : 0;
      				if ( stopped ) {
      					return this;
      				}
      				stopped = true;
      				for ( ; index < length ; index++ ) {
      					animation.tweens[ index ].run( 1 );
      				}
      
      				// Resolve when we played the last frame; otherwise, reject
      				if ( gotoEnd ) {
      					deferred.resolveWith( elem, [ animation, gotoEnd ] );
      				} else {
      					deferred.rejectWith( elem, [ animation, gotoEnd ] );
      				}
      				return this;
      			}
      		}),
      		props = animation.props;
      
      	propFilter( props, animation.opts.specialEasing );
      
      	for ( ; index < length ; index++ ) {
      		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
      		if ( result ) {
      			return result;
      		}
      	}
      
      	jQuery.map( props, createTween, animation );
      
      	if ( jQuery.isFunction( animation.opts.start ) ) {
      		animation.opts.start.call( elem, animation );
      	}
      
      	jQuery.fx.timer(
      		jQuery.extend( tick, {
      			elem: elem,
      			anim: animation,
      			queue: animation.opts.queue
      		})
      	);
      
      	// attach callbacks from options
      	return animation.progress( animation.opts.progress )
      		.done( animation.opts.done, animation.opts.complete )
      		.fail( animation.opts.fail )
      		.always( animation.opts.always );
      }
      
      jQuery.Animation = jQuery.extend( Animation, {
      
      	tweener: function( props, callback ) {
      		if ( jQuery.isFunction( props ) ) {
      			callback = props;
      			props = [ "*" ];
      		} else {
      			props = props.split(" ");
      		}
      
      		var prop,
      			index = 0,
      			length = props.length;
      
      		for ( ; index < length ; index++ ) {
      			prop = props[ index ];
      			tweeners[ prop ] = tweeners[ prop ] || [];
      			tweeners[ prop ].unshift( callback );
      		}
      	},
      
      	prefilter: function( callback, prepend ) {
      		if ( prepend ) {
      			animationPrefilters.unshift( callback );
      		} else {
      			animationPrefilters.push( callback );
      		}
      	}
      });
      
      jQuery.speed = function( speed, easing, fn ) {
      	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
      		complete: fn || !fn && easing ||
      			jQuery.isFunction( speed ) && speed,
      		duration: speed,
      		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
      	};
      
      	opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
      		opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;
      
      	// Normalize opt.queue - true/undefined/null -> "fx"
      	if ( opt.queue == null || opt.queue === true ) {
      		opt.queue = "fx";
      	}
      
      	// Queueing
      	opt.old = opt.complete;
      
      	opt.complete = function() {
      		if ( jQuery.isFunction( opt.old ) ) {
      			opt.old.call( this );
      		}
      
      		if ( opt.queue ) {
      			jQuery.dequeue( this, opt.queue );
      		}
      	};
      
      	return opt;
      };
      
      jQuery.fn.extend({
      	fadeTo: function( speed, to, easing, callback ) {
      
      		// Show any hidden elements after setting opacity to 0
      		return this.filter( isHidden ).css( "opacity", 0 ).show()
      
      			// Animate to the value specified
      			.end().animate({ opacity: to }, speed, easing, callback );
      	},
      	animate: function( prop, speed, easing, callback ) {
      		var empty = jQuery.isEmptyObject( prop ),
      			optall = jQuery.speed( speed, easing, callback ),
      			doAnimation = function() {
      				// Operate on a copy of prop so per-property easing won't be lost
      				var anim = Animation( this, jQuery.extend( {}, prop ), optall );
      
      				// Empty animations, or finishing resolves immediately
      				if ( empty || data_priv.get( this, "finish" ) ) {
      					anim.stop( true );
      				}
      			};
      			doAnimation.finish = doAnimation;
      
      		return empty || optall.queue === false ?
      			this.each( doAnimation ) :
      			this.queue( optall.queue, doAnimation );
      	},
      	stop: function( type, clearQueue, gotoEnd ) {
      		var stopQueue = function( hooks ) {
      			var stop = hooks.stop;
      			delete hooks.stop;
      			stop( gotoEnd );
      		};
      
      		if ( typeof type !== "string" ) {
      			gotoEnd = clearQueue;
      			clearQueue = type;
      			type = undefined;
      		}
      		if ( clearQueue && type !== false ) {
      			this.queue( type || "fx", [] );
      		}
      
      		return this.each(function() {
      			var dequeue = true,
      				index = type != null && type + "queueHooks",
      				timers = jQuery.timers,
      				data = data_priv.get( this );
      
      			if ( index ) {
      				if ( data[ index ] && data[ index ].stop ) {
      					stopQueue( data[ index ] );
      				}
      			} else {
      				for ( index in data ) {
      					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
      						stopQueue( data[ index ] );
      					}
      				}
      			}
      
      			for ( index = timers.length; index--; ) {
      				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
      					timers[ index ].anim.stop( gotoEnd );
      					dequeue = false;
      					timers.splice( index, 1 );
      				}
      			}
      
      			// Start the next in the queue if the last step wasn't forced.
      			// Timers currently will call their complete callbacks, which
      			// will dequeue but only if they were gotoEnd.
      			if ( dequeue || !gotoEnd ) {
      				jQuery.dequeue( this, type );
      			}
      		});
      	},
      	finish: function( type ) {
      		if ( type !== false ) {
      			type = type || "fx";
      		}
      		return this.each(function() {
      			var index,
      				data = data_priv.get( this ),
      				queue = data[ type + "queue" ],
      				hooks = data[ type + "queueHooks" ],
      				timers = jQuery.timers,
      				length = queue ? queue.length : 0;
      
      			// Enable finishing flag on private data
      			data.finish = true;
      
      			// Empty the queue first
      			jQuery.queue( this, type, [] );
      
      			if ( hooks && hooks.stop ) {
      				hooks.stop.call( this, true );
      			}
      
      			// Look for any active animations, and finish them
      			for ( index = timers.length; index--; ) {
      				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
      					timers[ index ].anim.stop( true );
      					timers.splice( index, 1 );
      				}
      			}
      
      			// Look for any animations in the old queue and finish them
      			for ( index = 0; index < length; index++ ) {
      				if ( queue[ index ] && queue[ index ].finish ) {
      					queue[ index ].finish.call( this );
      				}
      			}
      
      			// Turn off finishing flag
      			delete data.finish;
      		});
      	}
      });
      
      jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
      	var cssFn = jQuery.fn[ name ];
      	jQuery.fn[ name ] = function( speed, easing, callback ) {
      		return speed == null || typeof speed === "boolean" ?
      			cssFn.apply( this, arguments ) :
      			this.animate( genFx( name, true ), speed, easing, callback );
      	};
      });
      
      // Generate shortcuts for custom animations
      jQuery.each({
      	slideDown: genFx("show"),
      	slideUp: genFx("hide"),
      	slideToggle: genFx("toggle"),
      	fadeIn: { opacity: "show" },
      	fadeOut: { opacity: "hide" },
      	fadeToggle: { opacity: "toggle" }
      }, function( name, props ) {
      	jQuery.fn[ name ] = function( speed, easing, callback ) {
      		return this.animate( props, speed, easing, callback );
      	};
      });
      
      jQuery.timers = [];
      jQuery.fx.tick = function() {
      	var timer,
      		i = 0,
      		timers = jQuery.timers;
      
      	fxNow = jQuery.now();
      
      	for ( ; i < timers.length; i++ ) {
      		timer = timers[ i ];
      		// Checks the timer has not already been removed
      		if ( !timer() && timers[ i ] === timer ) {
      			timers.splice( i--, 1 );
      		}
      	}
      
      	if ( !timers.length ) {
      		jQuery.fx.stop();
      	}
      	fxNow = undefined;
      };
      
      jQuery.fx.timer = function( timer ) {
      	jQuery.timers.push( timer );
      	if ( timer() ) {
      		jQuery.fx.start();
      	} else {
      		jQuery.timers.pop();
      	}
      };
      
      jQuery.fx.interval = 13;
      
      jQuery.fx.start = function() {
      	if ( !timerId ) {
      		timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
      	}
      };
      
      jQuery.fx.stop = function() {
      	clearInterval( timerId );
      	timerId = null;
      };
      
      jQuery.fx.speeds = {
      	slow: 600,
      	fast: 200,
      	// Default speed
      	_default: 400
      };
      
      
      // Based off of the plugin by Clint Helfers, with permission.
      // http://blindsignals.com/index.php/2009/07/jquery-delay/
      jQuery.fn.delay = function( time, type ) {
      	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
      	type = type || "fx";
      
      	return this.queue( type, function( next, hooks ) {
      		var timeout = setTimeout( next, time );
      		hooks.stop = function() {
      			clearTimeout( timeout );
      		};
      	});
      };
      
      
      (function() {
      	var input = document.createElement( "input" ),
      		select = document.createElement( "select" ),
      		opt = select.appendChild( document.createElement( "option" ) );
      
      	input.type = "checkbox";
      
      	// Support: iOS<=5.1, Android<=4.2+
      	// Default value for a checkbox should be "on"
      	support.checkOn = input.value !== "";
      
      	// Support: IE<=11+
      	// Must access selectedIndex to make default options select
      	support.optSelected = opt.selected;
      
      	// Support: Android<=2.3
      	// Options inside disabled selects are incorrectly marked as disabled
      	select.disabled = true;
      	support.optDisabled = !opt.disabled;
      
      	// Support: IE<=11+
      	// An input loses its value after becoming a radio
      	input = document.createElement( "input" );
      	input.value = "t";
      	input.type = "radio";
      	support.radioValue = input.value === "t";
      })();
      
      
      var nodeHook, boolHook,
      	attrHandle = jQuery.expr.attrHandle;
      
      jQuery.fn.extend({
      	attr: function( name, value ) {
      		return access( this, jQuery.attr, name, value, arguments.length > 1 );
      	},
      
      	removeAttr: function( name ) {
      		return this.each(function() {
      			jQuery.removeAttr( this, name );
      		});
      	}
      });
      
      jQuery.extend({
      	attr: function( elem, name, value ) {
      		var hooks, ret,
      			nType = elem.nodeType;
      
      		// don't get/set attributes on text, comment and attribute nodes
      		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
      			return;
      		}
      
      		// Fallback to prop when attributes are not supported
      		if ( typeof elem.getAttribute === strundefined ) {
      			return jQuery.prop( elem, name, value );
      		}
      
      		// All attributes are lowercase
      		// Grab necessary hook if one is defined
      		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
      			name = name.toLowerCase();
      			hooks = jQuery.attrHooks[ name ] ||
      				( jQuery.expr.match.bool.test( name ) ? boolHook : nodeHook );
      		}
      
      		if ( value !== undefined ) {
      
      			if ( value === null ) {
      				jQuery.removeAttr( elem, name );
      
      			} else if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
      				return ret;
      
      			} else {
      				elem.setAttribute( name, value + "" );
      				return value;
      			}
      
      		} else if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
      			return ret;
      
      		} else {
      			ret = jQuery.find.attr( elem, name );
      
      			// Non-existent attributes return null, we normalize to undefined
      			return ret == null ?
      				undefined :
      				ret;
      		}
      	},
      
      	removeAttr: function( elem, value ) {
      		var name, propName,
      			i = 0,
      			attrNames = value && value.match( rnotwhite );
      
      		if ( attrNames && elem.nodeType === 1 ) {
      			while ( (name = attrNames[i++]) ) {
      				propName = jQuery.propFix[ name ] || name;
      
      				// Boolean attributes get special treatment (#10870)
      				if ( jQuery.expr.match.bool.test( name ) ) {
      					// Set corresponding property to false
      					elem[ propName ] = false;
      				}
      
      				elem.removeAttribute( name );
      			}
      		}
      	},
      
      	attrHooks: {
      		type: {
      			set: function( elem, value ) {
      				if ( !support.radioValue && value === "radio" &&
      					jQuery.nodeName( elem, "input" ) ) {
      					var val = elem.value;
      					elem.setAttribute( "type", value );
      					if ( val ) {
      						elem.value = val;
      					}
      					return value;
      				}
      			}
      		}
      	}
      });
      
      // Hooks for boolean attributes
      boolHook = {
      	set: function( elem, value, name ) {
      		if ( value === false ) {
      			// Remove boolean attributes when set to false
      			jQuery.removeAttr( elem, name );
      		} else {
      			elem.setAttribute( name, name );
      		}
      		return name;
      	}
      };
      jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
      	var getter = attrHandle[ name ] || jQuery.find.attr;
      
      	attrHandle[ name ] = function( elem, name, isXML ) {
      		var ret, handle;
      		if ( !isXML ) {
      			// Avoid an infinite loop by temporarily removing this function from the getter
      			handle = attrHandle[ name ];
      			attrHandle[ name ] = ret;
      			ret = getter( elem, name, isXML ) != null ?
      				name.toLowerCase() :
      				null;
      			attrHandle[ name ] = handle;
      		}
      		return ret;
      	};
      });
      
      
      
      
      var rfocusable = /^(?:input|select|textarea|button)$/i;
      
      jQuery.fn.extend({
      	prop: function( name, value ) {
      		return access( this, jQuery.prop, name, value, arguments.length > 1 );
      	},
      
      	removeProp: function( name ) {
      		return this.each(function() {
      			delete this[ jQuery.propFix[ name ] || name ];
      		});
      	}
      });
      
      jQuery.extend({
      	propFix: {
      		"for": "htmlFor",
      		"class": "className"
      	},
      
      	prop: function( elem, name, value ) {
      		var ret, hooks, notxml,
      			nType = elem.nodeType;
      
      		// Don't get/set properties on text, comment and attribute nodes
      		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
      			return;
      		}
      
      		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );
      
      		if ( notxml ) {
      			// Fix name and attach hooks
      			name = jQuery.propFix[ name ] || name;
      			hooks = jQuery.propHooks[ name ];
      		}
      
      		if ( value !== undefined ) {
      			return hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ?
      				ret :
      				( elem[ name ] = value );
      
      		} else {
      			return hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ?
      				ret :
      				elem[ name ];
      		}
      	},
      
      	propHooks: {
      		tabIndex: {
      			get: function( elem ) {
      				return elem.hasAttribute( "tabindex" ) || rfocusable.test( elem.nodeName ) || elem.href ?
      					elem.tabIndex :
      					-1;
      			}
      		}
      	}
      });
      
      if ( !support.optSelected ) {
      	jQuery.propHooks.selected = {
      		get: function( elem ) {
      			var parent = elem.parentNode;
      			if ( parent && parent.parentNode ) {
      				parent.parentNode.selectedIndex;
      			}
      			return null;
      		}
      	};
      }
      
      jQuery.each([
      	"tabIndex",
      	"readOnly",
      	"maxLength",
      	"cellSpacing",
      	"cellPadding",
      	"rowSpan",
      	"colSpan",
      	"useMap",
      	"frameBorder",
      	"contentEditable"
      ], function() {
      	jQuery.propFix[ this.toLowerCase() ] = this;
      });
      
      
      
      
      var rclass = /[\t\r\n\f]/g;
      
      jQuery.fn.extend({
      	addClass: function( value ) {
      		var classes, elem, cur, clazz, j, finalValue,
      			proceed = typeof value === "string" && value,
      			i = 0,
      			len = this.length;
      
      		if ( jQuery.isFunction( value ) ) {
      			return this.each(function( j ) {
      				jQuery( this ).addClass( value.call( this, j, this.className ) );
      			});
      		}
      
      		if ( proceed ) {
      			// The disjunction here is for better compressibility (see removeClass)
      			classes = ( value || "" ).match( rnotwhite ) || [];
      
      			for ( ; i < len; i++ ) {
      				elem = this[ i ];
      				cur = elem.nodeType === 1 && ( elem.className ?
      					( " " + elem.className + " " ).replace( rclass, " " ) :
      					" "
      				);
      
      				if ( cur ) {
      					j = 0;
      					while ( (clazz = classes[j++]) ) {
      						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
      							cur += clazz + " ";
      						}
      					}
      
      					// only assign if different to avoid unneeded rendering.
      					finalValue = jQuery.trim( cur );
      					if ( elem.className !== finalValue ) {
      						elem.className = finalValue;
      					}
      				}
      			}
      		}
      
      		return this;
      	},
      
      	removeClass: function( value ) {
      		var classes, elem, cur, clazz, j, finalValue,
      			proceed = arguments.length === 0 || typeof value === "string" && value,
      			i = 0,
      			len = this.length;
      
      		if ( jQuery.isFunction( value ) ) {
      			return this.each(function( j ) {
      				jQuery( this ).removeClass( value.call( this, j, this.className ) );
      			});
      		}
      		if ( proceed ) {
      			classes = ( value || "" ).match( rnotwhite ) || [];
      
      			for ( ; i < len; i++ ) {
      				elem = this[ i ];
      				// This expression is here for better compressibility (see addClass)
      				cur = elem.nodeType === 1 && ( elem.className ?
      					( " " + elem.className + " " ).replace( rclass, " " ) :
      					""
      				);
      
      				if ( cur ) {
      					j = 0;
      					while ( (clazz = classes[j++]) ) {
      						// Remove *all* instances
      						while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
      							cur = cur.replace( " " + clazz + " ", " " );
      						}
      					}
      
      					// Only assign if different to avoid unneeded rendering.
      					finalValue = value ? jQuery.trim( cur ) : "";
      					if ( elem.className !== finalValue ) {
      						elem.className = finalValue;
      					}
      				}
      			}
      		}
      
      		return this;
      	},
      
      	toggleClass: function( value, stateVal ) {
      		var type = typeof value;
      
      		if ( typeof stateVal === "boolean" && type === "string" ) {
      			return stateVal ? this.addClass( value ) : this.removeClass( value );
      		}
      
      		if ( jQuery.isFunction( value ) ) {
      			return this.each(function( i ) {
      				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
      			});
      		}
      
      		return this.each(function() {
      			if ( type === "string" ) {
      				// Toggle individual class names
      				var className,
      					i = 0,
      					self = jQuery( this ),
      					classNames = value.match( rnotwhite ) || [];
      
      				while ( (className = classNames[ i++ ]) ) {
      					// Check each className given, space separated list
      					if ( self.hasClass( className ) ) {
      						self.removeClass( className );
      					} else {
      						self.addClass( className );
      					}
      				}
      
      			// Toggle whole class name
      			} else if ( type === strundefined || type === "boolean" ) {
      				if ( this.className ) {
      					// store className if set
      					data_priv.set( this, "__className__", this.className );
      				}
      
      				// If the element has a class name or if we're passed `false`,
      				// then remove the whole classname (if there was one, the above saved it).
      				// Otherwise bring back whatever was previously saved (if anything),
      				// falling back to the empty string if nothing was stored.
      				this.className = this.className || value === false ? "" : data_priv.get( this, "__className__" ) || "";
      			}
      		});
      	},
      
      	hasClass: function( selector ) {
      		var className = " " + selector + " ",
      			i = 0,
      			l = this.length;
      		for ( ; i < l; i++ ) {
      			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
      				return true;
      			}
      		}
      
      		return false;
      	}
      });
      
      
      
      
      var rreturn = /\r/g;
      
      jQuery.fn.extend({
      	val: function( value ) {
      		var hooks, ret, isFunction,
      			elem = this[0];
      
      		if ( !arguments.length ) {
      			if ( elem ) {
      				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];
      
      				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
      					return ret;
      				}
      
      				ret = elem.value;
      
      				return typeof ret === "string" ?
      					// Handle most common string cases
      					ret.replace(rreturn, "") :
      					// Handle cases where value is null/undef or number
      					ret == null ? "" : ret;
      			}
      
      			return;
      		}
      
      		isFunction = jQuery.isFunction( value );
      
      		return this.each(function( i ) {
      			var val;
      
      			if ( this.nodeType !== 1 ) {
      				return;
      			}
      
      			if ( isFunction ) {
      				val = value.call( this, i, jQuery( this ).val() );
      			} else {
      				val = value;
      			}
      
      			// Treat null/undefined as ""; convert numbers to string
      			if ( val == null ) {
      				val = "";
      
      			} else if ( typeof val === "number" ) {
      				val += "";
      
      			} else if ( jQuery.isArray( val ) ) {
      				val = jQuery.map( val, function( value ) {
      					return value == null ? "" : value + "";
      				});
      			}
      
      			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];
      
      			// If set returns undefined, fall back to normal setting
      			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
      				this.value = val;
      			}
      		});
      	}
      });
      
      jQuery.extend({
      	valHooks: {
      		option: {
      			get: function( elem ) {
      				var val = jQuery.find.attr( elem, "value" );
      				return val != null ?
      					val :
      					// Support: IE10-11+
      					// option.text throws exceptions (#14686, #14858)
      					jQuery.trim( jQuery.text( elem ) );
      			}
      		},
      		select: {
      			get: function( elem ) {
      				var value, option,
      					options = elem.options,
      					index = elem.selectedIndex,
      					one = elem.type === "select-one" || index < 0,
      					values = one ? null : [],
      					max = one ? index + 1 : options.length,
      					i = index < 0 ?
      						max :
      						one ? index : 0;
      
      				// Loop through all the selected options
      				for ( ; i < max; i++ ) {
      					option = options[ i ];
      
      					// IE6-9 doesn't update selected after form reset (#2551)
      					if ( ( option.selected || i === index ) &&
      							// Don't return options that are disabled or in a disabled optgroup
      							( support.optDisabled ? !option.disabled : option.getAttribute( "disabled" ) === null ) &&
      							( !option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {
      
      						// Get the specific value for the option
      						value = jQuery( option ).val();
      
      						// We don't need an array for one selects
      						if ( one ) {
      							return value;
      						}
      
      						// Multi-Selects return an array
      						values.push( value );
      					}
      				}
      
      				return values;
      			},
      
      			set: function( elem, value ) {
      				var optionSet, option,
      					options = elem.options,
      					values = jQuery.makeArray( value ),
      					i = options.length;
      
      				while ( i-- ) {
      					option = options[ i ];
      					if ( (option.selected = jQuery.inArray( option.value, values ) >= 0) ) {
      						optionSet = true;
      					}
      				}
      
      				// Force browsers to behave consistently when non-matching value is set
      				if ( !optionSet ) {
      					elem.selectedIndex = -1;
      				}
      				return values;
      			}
      		}
      	}
      });
      
      // Radios and checkboxes getter/setter
      jQuery.each([ "radio", "checkbox" ], function() {
      	jQuery.valHooks[ this ] = {
      		set: function( elem, value ) {
      			if ( jQuery.isArray( value ) ) {
      				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
      			}
      		}
      	};
      	if ( !support.checkOn ) {
      		jQuery.valHooks[ this ].get = function( elem ) {
      			return elem.getAttribute("value") === null ? "on" : elem.value;
      		};
      	}
      });
      
      
      
      
      // Return jQuery for attributes-only inclusion
      
      
      jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
      	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
      	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {
      
      	// Handle event binding
      	jQuery.fn[ name ] = function( data, fn ) {
      		return arguments.length > 0 ?
      			this.on( name, null, data, fn ) :
      			this.trigger( name );
      	};
      });
      
      jQuery.fn.extend({
      	hover: function( fnOver, fnOut ) {
      		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
      	},
      
      	bind: function( types, data, fn ) {
      		return this.on( types, null, data, fn );
      	},
      	unbind: function( types, fn ) {
      		return this.off( types, null, fn );
      	},
      
      	delegate: function( selector, types, data, fn ) {
      		return this.on( types, selector, data, fn );
      	},
      	undelegate: function( selector, types, fn ) {
      		// ( namespace ) or ( selector, types [, fn] )
      		return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
      	}
      });
      
      
      var nonce = jQuery.now();
      
      var rquery = (/\?/);
      
      
      
      // Support: Android 2.3
      // Workaround failure to string-cast null input
      jQuery.parseJSON = function( data ) {
      	return JSON.parse( data + "" );
      };
      
      
      // Cross-browser xml parsing
      jQuery.parseXML = function( data ) {
      	var xml, tmp;
      	if ( !data || typeof data !== "string" ) {
      		return null;
      	}
      
      	// Support: IE9
      	try {
      		tmp = new DOMParser();
      		xml = tmp.parseFromString( data, "text/xml" );
      	} catch ( e ) {
      		xml = undefined;
      	}
      
      	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
      		jQuery.error( "Invalid XML: " + data );
      	}
      	return xml;
      };
      
      
      var
      	rhash = /#.*$/,
      	rts = /([?&])_=[^&]*/,
      	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,
      	// #7653, #8125, #8152: local protocol detection
      	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
      	rnoContent = /^(?:GET|HEAD)$/,
      	rprotocol = /^\/\//,
      	rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,
      
      	/* Prefilters
      	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
      	 * 2) These are called:
      	 *    - BEFORE asking for a transport
      	 *    - AFTER param serialization (s.data is a string if s.processData is true)
      	 * 3) key is the dataType
      	 * 4) the catchall symbol "*" can be used
      	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
      	 */
      	prefilters = {},
      
      	/* Transports bindings
      	 * 1) key is the dataType
      	 * 2) the catchall symbol "*" can be used
      	 * 3) selection will start with transport dataType and THEN go to "*" if needed
      	 */
      	transports = {},
      
      	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
      	allTypes = "*/".concat( "*" ),
      
      	// Document location
      	ajaxLocation = window.location.href,
      
      	// Segment location into parts
      	ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];
      
      // Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
      function addToPrefiltersOrTransports( structure ) {
      
      	// dataTypeExpression is optional and defaults to "*"
      	return function( dataTypeExpression, func ) {
      
      		if ( typeof dataTypeExpression !== "string" ) {
      			func = dataTypeExpression;
      			dataTypeExpression = "*";
      		}
      
      		var dataType,
      			i = 0,
      			dataTypes = dataTypeExpression.toLowerCase().match( rnotwhite ) || [];
      
      		if ( jQuery.isFunction( func ) ) {
      			// For each dataType in the dataTypeExpression
      			while ( (dataType = dataTypes[i++]) ) {
      				// Prepend if requested
      				if ( dataType[0] === "+" ) {
      					dataType = dataType.slice( 1 ) || "*";
      					(structure[ dataType ] = structure[ dataType ] || []).unshift( func );
      
      				// Otherwise append
      				} else {
      					(structure[ dataType ] = structure[ dataType ] || []).push( func );
      				}
      			}
      		}
      	};
      }
      
      // Base inspection function for prefilters and transports
      function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {
      
      	var inspected = {},
      		seekingTransport = ( structure === transports );
      
      	function inspect( dataType ) {
      		var selected;
      		inspected[ dataType ] = true;
      		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
      			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
      			if ( typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[ dataTypeOrTransport ] ) {
      				options.dataTypes.unshift( dataTypeOrTransport );
      				inspect( dataTypeOrTransport );
      				return false;
      			} else if ( seekingTransport ) {
      				return !( selected = dataTypeOrTransport );
      			}
      		});
      		return selected;
      	}
      
      	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
      }
      
      // A special extend for ajax options
      // that takes "flat" options (not to be deep extended)
      // Fixes #9887
      function ajaxExtend( target, src ) {
      	var key, deep,
      		flatOptions = jQuery.ajaxSettings.flatOptions || {};
      
      	for ( key in src ) {
      		if ( src[ key ] !== undefined ) {
      			( flatOptions[ key ] ? target : ( deep || (deep = {}) ) )[ key ] = src[ key ];
      		}
      	}
      	if ( deep ) {
      		jQuery.extend( true, target, deep );
      	}
      
      	return target;
      }
      
      /* Handles responses to an ajax request:
       * - finds the right dataType (mediates between content-type and expected dataType)
       * - returns the corresponding response
       */
      function ajaxHandleResponses( s, jqXHR, responses ) {
      
      	var ct, type, finalDataType, firstDataType,
      		contents = s.contents,
      		dataTypes = s.dataTypes;
      
      	// Remove auto dataType and get content-type in the process
      	while ( dataTypes[ 0 ] === "*" ) {
      		dataTypes.shift();
      		if ( ct === undefined ) {
      			ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
      		}
      	}
      
      	// Check if we're dealing with a known content-type
      	if ( ct ) {
      		for ( type in contents ) {
      			if ( contents[ type ] && contents[ type ].test( ct ) ) {
      				dataTypes.unshift( type );
      				break;
      			}
      		}
      	}
      
      	// Check to see if we have a response for the expected dataType
      	if ( dataTypes[ 0 ] in responses ) {
      		finalDataType = dataTypes[ 0 ];
      	} else {
      		// Try convertible dataTypes
      		for ( type in responses ) {
      			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
      				finalDataType = type;
      				break;
      			}
      			if ( !firstDataType ) {
      				firstDataType = type;
      			}
      		}
      		// Or just use first one
      		finalDataType = finalDataType || firstDataType;
      	}
      
      	// If we found a dataType
      	// We add the dataType to the list if needed
      	// and return the corresponding response
      	if ( finalDataType ) {
      		if ( finalDataType !== dataTypes[ 0 ] ) {
      			dataTypes.unshift( finalDataType );
      		}
      		return responses[ finalDataType ];
      	}
      }
      
      /* Chain conversions given the request and the original response
       * Also sets the responseXXX fields on the jqXHR instance
       */
      function ajaxConvert( s, response, jqXHR, isSuccess ) {
      	var conv2, current, conv, tmp, prev,
      		converters = {},
      		// Work with a copy of dataTypes in case we need to modify it for conversion
      		dataTypes = s.dataTypes.slice();
      
      	// Create converters map with lowercased keys
      	if ( dataTypes[ 1 ] ) {
      		for ( conv in s.converters ) {
      			converters[ conv.toLowerCase() ] = s.converters[ conv ];
      		}
      	}
      
      	current = dataTypes.shift();
      
      	// Convert to each sequential dataType
      	while ( current ) {
      
      		if ( s.responseFields[ current ] ) {
      			jqXHR[ s.responseFields[ current ] ] = response;
      		}
      
      		// Apply the dataFilter if provided
      		if ( !prev && isSuccess && s.dataFilter ) {
      			response = s.dataFilter( response, s.dataType );
      		}
      
      		prev = current;
      		current = dataTypes.shift();
      
      		if ( current ) {
      
      		// There's only work to do if current dataType is non-auto
      			if ( current === "*" ) {
      
      				current = prev;
      
      			// Convert response if prev dataType is non-auto and differs from current
      			} else if ( prev !== "*" && prev !== current ) {
      
      				// Seek a direct converter
      				conv = converters[ prev + " " + current ] || converters[ "* " + current ];
      
      				// If none found, seek a pair
      				if ( !conv ) {
      					for ( conv2 in converters ) {
      
      						// If conv2 outputs current
      						tmp = conv2.split( " " );
      						if ( tmp[ 1 ] === current ) {
      
      							// If prev can be converted to accepted input
      							conv = converters[ prev + " " + tmp[ 0 ] ] ||
      								converters[ "* " + tmp[ 0 ] ];
      							if ( conv ) {
      								// Condense equivalence converters
      								if ( conv === true ) {
      									conv = converters[ conv2 ];
      
      								// Otherwise, insert the intermediate dataType
      								} else if ( converters[ conv2 ] !== true ) {
      									current = tmp[ 0 ];
      									dataTypes.unshift( tmp[ 1 ] );
      								}
      								break;
      							}
      						}
      					}
      				}
      
      				// Apply converter (if not an equivalence)
      				if ( conv !== true ) {
      
      					// Unless errors are allowed to bubble, catch and return them
      					if ( conv && s[ "throws" ] ) {
      						response = conv( response );
      					} else {
      						try {
      							response = conv( response );
      						} catch ( e ) {
      							return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
      						}
      					}
      				}
      			}
      		}
      	}
      
      	return { state: "success", data: response };
      }
      
      jQuery.extend({
      
      	// Counter for holding the number of active queries
      	active: 0,
      
      	// Last-Modified header cache for next request
      	lastModified: {},
      	etag: {},
      
      	ajaxSettings: {
      		url: ajaxLocation,
      		type: "GET",
      		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
      		global: true,
      		processData: true,
      		async: true,
      		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
      		/*
      		timeout: 0,
      		data: null,
      		dataType: null,
      		username: null,
      		password: null,
      		cache: null,
      		throws: false,
      		traditional: false,
      		headers: {},
      		*/
      
      		accepts: {
      			"*": allTypes,
      			text: "text/plain",
      			html: "text/html",
      			xml: "application/xml, text/xml",
      			json: "application/json, text/javascript"
      		},
      
      		contents: {
      			xml: /xml/,
      			html: /html/,
      			json: /json/
      		},
      
      		responseFields: {
      			xml: "responseXML",
      			text: "responseText",
      			json: "responseJSON"
      		},
      
      		// Data converters
      		// Keys separate source (or catchall "*") and destination types with a single space
      		converters: {
      
      			// Convert anything to text
      			"* text": String,
      
      			// Text to html (true = no transformation)
      			"text html": true,
      
      			// Evaluate text as a json expression
      			"text json": jQuery.parseJSON,
      
      			// Parse text as xml
      			"text xml": jQuery.parseXML
      		},
      
      		// For options that shouldn't be deep extended:
      		// you can add your own custom options here if
      		// and when you create one that shouldn't be
      		// deep extended (see ajaxExtend)
      		flatOptions: {
      			url: true,
      			context: true
      		}
      	},
      
      	// Creates a full fledged settings object into target
      	// with both ajaxSettings and settings fields.
      	// If target is omitted, writes into ajaxSettings.
      	ajaxSetup: function( target, settings ) {
      		return settings ?
      
      			// Building a settings object
      			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :
      
      			// Extending ajaxSettings
      			ajaxExtend( jQuery.ajaxSettings, target );
      	},
      
      	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
      	ajaxTransport: addToPrefiltersOrTransports( transports ),
      
      	// Main method
      	ajax: function( url, options ) {
      
      		// If url is an object, simulate pre-1.5 signature
      		if ( typeof url === "object" ) {
      			options = url;
      			url = undefined;
      		}
      
      		// Force options to be an object
      		options = options || {};
      
      		var transport,
      			// URL without anti-cache param
      			cacheURL,
      			// Response headers
      			responseHeadersString,
      			responseHeaders,
      			// timeout handle
      			timeoutTimer,
      			// Cross-domain detection vars
      			parts,
      			// To know if global events are to be dispatched
      			fireGlobals,
      			// Loop variable
      			i,
      			// Create the final options object
      			s = jQuery.ajaxSetup( {}, options ),
      			// Callbacks context
      			callbackContext = s.context || s,
      			// Context for global events is callbackContext if it is a DOM node or jQuery collection
      			globalEventContext = s.context && ( callbackContext.nodeType || callbackContext.jquery ) ?
      				jQuery( callbackContext ) :
      				jQuery.event,
      			// Deferreds
      			deferred = jQuery.Deferred(),
      			completeDeferred = jQuery.Callbacks("once memory"),
      			// Status-dependent callbacks
      			statusCode = s.statusCode || {},
      			// Headers (they are sent all at once)
      			requestHeaders = {},
      			requestHeadersNames = {},
      			// The jqXHR state
      			state = 0,
      			// Default abort message
      			strAbort = "canceled",
      			// Fake xhr
      			jqXHR = {
      				readyState: 0,
      
      				// Builds headers hashtable if needed
      				getResponseHeader: function( key ) {
      					var match;
      					if ( state === 2 ) {
      						if ( !responseHeaders ) {
      							responseHeaders = {};
      							while ( (match = rheaders.exec( responseHeadersString )) ) {
      								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
      							}
      						}
      						match = responseHeaders[ key.toLowerCase() ];
      					}
      					return match == null ? null : match;
      				},
      
      				// Raw string
      				getAllResponseHeaders: function() {
      					return state === 2 ? responseHeadersString : null;
      				},
      
      				// Caches the header
      				setRequestHeader: function( name, value ) {
      					var lname = name.toLowerCase();
      					if ( !state ) {
      						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
      						requestHeaders[ name ] = value;
      					}
      					return this;
      				},
      
      				// Overrides response content-type header
      				overrideMimeType: function( type ) {
      					if ( !state ) {
      						s.mimeType = type;
      					}
      					return this;
      				},
      
      				// Status-dependent callbacks
      				statusCode: function( map ) {
      					var code;
      					if ( map ) {
      						if ( state < 2 ) {
      							for ( code in map ) {
      								// Lazy-add the new callback in a way that preserves old ones
      								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
      							}
      						} else {
      							// Execute the appropriate callbacks
      							jqXHR.always( map[ jqXHR.status ] );
      						}
      					}
      					return this;
      				},
      
      				// Cancel the request
      				abort: function( statusText ) {
      					var finalText = statusText || strAbort;
      					if ( transport ) {
      						transport.abort( finalText );
      					}
      					done( 0, finalText );
      					return this;
      				}
      			};
      
      		// Attach deferreds
      		deferred.promise( jqXHR ).complete = completeDeferred.add;
      		jqXHR.success = jqXHR.done;
      		jqXHR.error = jqXHR.fail;
      
      		// Remove hash character (#7531: and string promotion)
      		// Add protocol if not provided (prefilters might expect it)
      		// Handle falsy url in the settings object (#10093: consistency with old signature)
      		// We also use the url parameter if available
      		s.url = ( ( url || s.url || ajaxLocation ) + "" ).replace( rhash, "" )
      			.replace( rprotocol, ajaxLocParts[ 1 ] + "//" );
      
      		// Alias method option to type as per ticket #12004
      		s.type = options.method || options.type || s.method || s.type;
      
      		// Extract dataTypes list
      		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( rnotwhite ) || [ "" ];
      
      		// A cross-domain request is in order when we have a protocol:host:port mismatch
      		if ( s.crossDomain == null ) {
      			parts = rurl.exec( s.url.toLowerCase() );
      			s.crossDomain = !!( parts &&
      				( parts[ 1 ] !== ajaxLocParts[ 1 ] || parts[ 2 ] !== ajaxLocParts[ 2 ] ||
      					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? "80" : "443" ) ) !==
      						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? "80" : "443" ) ) )
      			);
      		}
      
      		// Convert data if not already a string
      		if ( s.data && s.processData && typeof s.data !== "string" ) {
      			s.data = jQuery.param( s.data, s.traditional );
      		}
      
      		// Apply prefilters
      		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );
      
      		// If request was aborted inside a prefilter, stop there
      		if ( state === 2 ) {
      			return jqXHR;
      		}
      
      		// We can fire global events as of now if asked to
      		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
      		fireGlobals = jQuery.event && s.global;
      
      		// Watch for a new set of requests
      		if ( fireGlobals && jQuery.active++ === 0 ) {
      			jQuery.event.trigger("ajaxStart");
      		}
      
      		// Uppercase the type
      		s.type = s.type.toUpperCase();
      
      		// Determine if request has content
      		s.hasContent = !rnoContent.test( s.type );
      
      		// Save the URL in case we're toying with the If-Modified-Since
      		// and/or If-None-Match header later on
      		cacheURL = s.url;
      
      		// More options handling for requests with no content
      		if ( !s.hasContent ) {
      
      			// If data is available, append data to url
      			if ( s.data ) {
      				cacheURL = ( s.url += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data );
      				// #9682: remove data so that it's not used in an eventual retry
      				delete s.data;
      			}
      
      			// Add anti-cache in url if needed
      			if ( s.cache === false ) {
      				s.url = rts.test( cacheURL ) ?
      
      					// If there is already a '_' parameter, set its value
      					cacheURL.replace( rts, "$1_=" + nonce++ ) :
      
      					// Otherwise add one to the end
      					cacheURL + ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + nonce++;
      			}
      		}
      
      		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
      		if ( s.ifModified ) {
      			if ( jQuery.lastModified[ cacheURL ] ) {
      				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
      			}
      			if ( jQuery.etag[ cacheURL ] ) {
      				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
      			}
      		}
      
      		// Set the correct header, if data is being sent
      		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
      			jqXHR.setRequestHeader( "Content-Type", s.contentType );
      		}
      
      		// Set the Accepts header for the server, depending on the dataType
      		jqXHR.setRequestHeader(
      			"Accept",
      			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
      				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
      				s.accepts[ "*" ]
      		);
      
      		// Check for headers option
      		for ( i in s.headers ) {
      			jqXHR.setRequestHeader( i, s.headers[ i ] );
      		}
      
      		// Allow custom headers/mimetypes and early abort
      		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
      			// Abort if not done already and return
      			return jqXHR.abort();
      		}
      
      		// Aborting is no longer a cancellation
      		strAbort = "abort";
      
      		// Install callbacks on deferreds
      		for ( i in { success: 1, error: 1, complete: 1 } ) {
      			jqXHR[ i ]( s[ i ] );
      		}
      
      		// Get transport
      		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );
      
      		// If no transport, we auto-abort
      		if ( !transport ) {
      			done( -1, "No Transport" );
      		} else {
      			jqXHR.readyState = 1;
      
      			// Send global event
      			if ( fireGlobals ) {
      				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
      			}
      			// Timeout
      			if ( s.async && s.timeout > 0 ) {
      				timeoutTimer = setTimeout(function() {
      					jqXHR.abort("timeout");
      				}, s.timeout );
      			}
      
      			try {
      				state = 1;
      				transport.send( requestHeaders, done );
      			} catch ( e ) {
      				// Propagate exception as error if not done
      				if ( state < 2 ) {
      					done( -1, e );
      				// Simply rethrow otherwise
      				} else {
      					throw e;
      				}
      			}
      		}
      
      		// Callback for when everything is done
      		function done( status, nativeStatusText, responses, headers ) {
      			var isSuccess, success, error, response, modified,
      				statusText = nativeStatusText;
      
      			// Called once
      			if ( state === 2 ) {
      				return;
      			}
      
      			// State is "done" now
      			state = 2;
      
      			// Clear timeout if it exists
      			if ( timeoutTimer ) {
      				clearTimeout( timeoutTimer );
      			}
      
      			// Dereference transport for early garbage collection
      			// (no matter how long the jqXHR object will be used)
      			transport = undefined;
      
      			// Cache response headers
      			responseHeadersString = headers || "";
      
      			// Set readyState
      			jqXHR.readyState = status > 0 ? 4 : 0;
      
      			// Determine if successful
      			isSuccess = status >= 200 && status < 300 || status === 304;
      
      			// Get response data
      			if ( responses ) {
      				response = ajaxHandleResponses( s, jqXHR, responses );
      			}
      
      			// Convert no matter what (that way responseXXX fields are always set)
      			response = ajaxConvert( s, response, jqXHR, isSuccess );
      
      			// If successful, handle type chaining
      			if ( isSuccess ) {
      
      				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
      				if ( s.ifModified ) {
      					modified = jqXHR.getResponseHeader("Last-Modified");
      					if ( modified ) {
      						jQuery.lastModified[ cacheURL ] = modified;
      					}
      					modified = jqXHR.getResponseHeader("etag");
      					if ( modified ) {
      						jQuery.etag[ cacheURL ] = modified;
      					}
      				}
      
      				// if no content
      				if ( status === 204 || s.type === "HEAD" ) {
      					statusText = "nocontent";
      
      				// if not modified
      				} else if ( status === 304 ) {
      					statusText = "notmodified";
      
      				// If we have data, let's convert it
      				} else {
      					statusText = response.state;
      					success = response.data;
      					error = response.error;
      					isSuccess = !error;
      				}
      			} else {
      				// Extract error from statusText and normalize for non-aborts
      				error = statusText;
      				if ( status || !statusText ) {
      					statusText = "error";
      					if ( status < 0 ) {
      						status = 0;
      					}
      				}
      			}
      
      			// Set data for the fake xhr object
      			jqXHR.status = status;
      			jqXHR.statusText = ( nativeStatusText || statusText ) + "";
      
      			// Success/Error
      			if ( isSuccess ) {
      				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
      			} else {
      				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
      			}
      
      			// Status-dependent callbacks
      			jqXHR.statusCode( statusCode );
      			statusCode = undefined;
      
      			if ( fireGlobals ) {
      				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
      					[ jqXHR, s, isSuccess ? success : error ] );
      			}
      
      			// Complete
      			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );
      
      			if ( fireGlobals ) {
      				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
      				// Handle the global AJAX counter
      				if ( !( --jQuery.active ) ) {
      					jQuery.event.trigger("ajaxStop");
      				}
      			}
      		}
      
      		return jqXHR;
      	},
      
      	getJSON: function( url, data, callback ) {
      		return jQuery.get( url, data, callback, "json" );
      	},
      
      	getScript: function( url, callback ) {
      		return jQuery.get( url, undefined, callback, "script" );
      	}
      });
      
      jQuery.each( [ "get", "post" ], function( i, method ) {
      	jQuery[ method ] = function( url, data, callback, type ) {
      		// Shift arguments if data argument was omitted
      		if ( jQuery.isFunction( data ) ) {
      			type = type || callback;
      			callback = data;
      			data = undefined;
      		}
      
      		return jQuery.ajax({
      			url: url,
      			type: method,
      			dataType: type,
      			data: data,
      			success: callback
      		});
      	};
      });
      
      
      jQuery._evalUrl = function( url ) {
      	return jQuery.ajax({
      		url: url,
      		type: "GET",
      		dataType: "script",
      		async: false,
      		global: false,
      		"throws": true
      	});
      };
      
      
      jQuery.fn.extend({
      	wrapAll: function( html ) {
      		var wrap;
      
      		if ( jQuery.isFunction( html ) ) {
      			return this.each(function( i ) {
      				jQuery( this ).wrapAll( html.call(this, i) );
      			});
      		}
      
      		if ( this[ 0 ] ) {
      
      			// The elements to wrap the target around
      			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );
      
      			if ( this[ 0 ].parentNode ) {
      				wrap.insertBefore( this[ 0 ] );
      			}
      
      			wrap.map(function() {
      				var elem = this;
      
      				while ( elem.firstElementChild ) {
      					elem = elem.firstElementChild;
      				}
      
      				return elem;
      			}).append( this );
      		}
      
      		return this;
      	},
      
      	wrapInner: function( html ) {
      		if ( jQuery.isFunction( html ) ) {
      			return this.each(function( i ) {
      				jQuery( this ).wrapInner( html.call(this, i) );
      			});
      		}
      
      		return this.each(function() {
      			var self = jQuery( this ),
      				contents = self.contents();
      
      			if ( contents.length ) {
      				contents.wrapAll( html );
      
      			} else {
      				self.append( html );
      			}
      		});
      	},
      
      	wrap: function( html ) {
      		var isFunction = jQuery.isFunction( html );
      
      		return this.each(function( i ) {
      			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
      		});
      	},
      
      	unwrap: function() {
      		return this.parent().each(function() {
      			if ( !jQuery.nodeName( this, "body" ) ) {
      				jQuery( this ).replaceWith( this.childNodes );
      			}
      		}).end();
      	}
      });
      
      
      jQuery.expr.filters.hidden = function( elem ) {
      	// Support: Opera <= 12.12
      	// Opera reports offsetWidths and offsetHeights less than zero on some elements
      	return elem.offsetWidth <= 0 && elem.offsetHeight <= 0;
      };
      jQuery.expr.filters.visible = function( elem ) {
      	return !jQuery.expr.filters.hidden( elem );
      };
      
      
      
      
      var r20 = /%20/g,
      	rbracket = /\[\]$/,
      	rCRLF = /\r?\n/g,
      	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
      	rsubmittable = /^(?:input|select|textarea|keygen)/i;
      
      function buildParams( prefix, obj, traditional, add ) {
      	var name;
      
      	if ( jQuery.isArray( obj ) ) {
      		// Serialize array item.
      		jQuery.each( obj, function( i, v ) {
      			if ( traditional || rbracket.test( prefix ) ) {
      				// Treat each array item as a scalar.
      				add( prefix, v );
      
      			} else {
      				// Item is non-scalar (array or object), encode its numeric index.
      				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
      			}
      		});
      
      	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
      		// Serialize object item.
      		for ( name in obj ) {
      			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
      		}
      
      	} else {
      		// Serialize scalar item.
      		add( prefix, obj );
      	}
      }
      
      // Serialize an array of form elements or a set of
      // key/values into a query string
      jQuery.param = function( a, traditional ) {
      	var prefix,
      		s = [],
      		add = function( key, value ) {
      			// If value is a function, invoke it and return its value
      			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
      			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
      		};
      
      	// Set traditional to true for jQuery <= 1.3.2 behavior.
      	if ( traditional === undefined ) {
      		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
      	}
      
      	// If an array was passed in, assume that it is an array of form elements.
      	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
      		// Serialize the form elements
      		jQuery.each( a, function() {
      			add( this.name, this.value );
      		});
      
      	} else {
      		// If traditional, encode the "old" way (the way 1.3.2 or older
      		// did it), otherwise encode params recursively.
      		for ( prefix in a ) {
      			buildParams( prefix, a[ prefix ], traditional, add );
      		}
      	}
      
      	// Return the resulting serialization
      	return s.join( "&" ).replace( r20, "+" );
      };
      
      jQuery.fn.extend({
      	serialize: function() {
      		return jQuery.param( this.serializeArray() );
      	},
      	serializeArray: function() {
      		return this.map(function() {
      			// Can add propHook for "elements" to filter or add form elements
      			var elements = jQuery.prop( this, "elements" );
      			return elements ? jQuery.makeArray( elements ) : this;
      		})
      		.filter(function() {
      			var type = this.type;
      
      			// Use .is( ":disabled" ) so that fieldset[disabled] works
      			return this.name && !jQuery( this ).is( ":disabled" ) &&
      				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
      				( this.checked || !rcheckableType.test( type ) );
      		})
      		.map(function( i, elem ) {
      			var val = jQuery( this ).val();
      
      			return val == null ?
      				null :
      				jQuery.isArray( val ) ?
      					jQuery.map( val, function( val ) {
      						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
      					}) :
      					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
      		}).get();
      	}
      });
      
      
      jQuery.ajaxSettings.xhr = function() {
      	try {
      		return new XMLHttpRequest();
      	} catch( e ) {}
      };
      
      var xhrId = 0,
      	xhrCallbacks = {},
      	xhrSuccessStatus = {
      		// file protocol always yields status code 0, assume 200
      		0: 200,
      		// Support: IE9
      		// #1450: sometimes IE returns 1223 when it should be 204
      		1223: 204
      	},
      	xhrSupported = jQuery.ajaxSettings.xhr();
      
      // Support: IE9
      // Open requests must be manually aborted on unload (#5280)
      // See https://support.microsoft.com/kb/2856746 for more info
      if ( window.attachEvent ) {
      	window.attachEvent( "onunload", function() {
      		for ( var key in xhrCallbacks ) {
      			xhrCallbacks[ key ]();
      		}
      	});
      }
      
      support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
      support.ajax = xhrSupported = !!xhrSupported;
      
      jQuery.ajaxTransport(function( options ) {
      	var callback;
      
      	// Cross domain only allowed if supported through XMLHttpRequest
      	if ( support.cors || xhrSupported && !options.crossDomain ) {
      		return {
      			send: function( headers, complete ) {
      				var i,
      					xhr = options.xhr(),
      					id = ++xhrId;
      
      				xhr.open( options.type, options.url, options.async, options.username, options.password );
      
      				// Apply custom fields if provided
      				if ( options.xhrFields ) {
      					for ( i in options.xhrFields ) {
      						xhr[ i ] = options.xhrFields[ i ];
      					}
      				}
      
      				// Override mime type if needed
      				if ( options.mimeType && xhr.overrideMimeType ) {
      					xhr.overrideMimeType( options.mimeType );
      				}
      
      				// X-Requested-With header
      				// For cross-domain requests, seeing as conditions for a preflight are
      				// akin to a jigsaw puzzle, we simply never set it to be sure.
      				// (it can always be set on a per-request basis or even using ajaxSetup)
      				// For same-domain requests, won't change header if already provided.
      				if ( !options.crossDomain && !headers["X-Requested-With"] ) {
      					headers["X-Requested-With"] = "XMLHttpRequest";
      				}
      
      				// Set headers
      				for ( i in headers ) {
      					xhr.setRequestHeader( i, headers[ i ] );
      				}
      
      				// Callback
      				callback = function( type ) {
      					return function() {
      						if ( callback ) {
      							delete xhrCallbacks[ id ];
      							callback = xhr.onload = xhr.onerror = null;
      
      							if ( type === "abort" ) {
      								xhr.abort();
      							} else if ( type === "error" ) {
      								complete(
      									// file: protocol always yields status 0; see #8605, #14207
      									xhr.status,
      									xhr.statusText
      								);
      							} else {
      								complete(
      									xhrSuccessStatus[ xhr.status ] || xhr.status,
      									xhr.statusText,
      									// Support: IE9
      									// Accessing binary-data responseText throws an exception
      									// (#11426)
      									typeof xhr.responseText === "string" ? {
      										text: xhr.responseText
      									} : undefined,
      									xhr.getAllResponseHeaders()
      								);
      							}
      						}
      					};
      				};
      
      				// Listen to events
      				xhr.onload = callback();
      				xhr.onerror = callback("error");
      
      				// Create the abort callback
      				callback = xhrCallbacks[ id ] = callback("abort");
      
      				try {
      					// Do send the request (this may raise an exception)
      					xhr.send( options.hasContent && options.data || null );
      				} catch ( e ) {
      					// #14683: Only rethrow if this hasn't been notified as an error yet
      					if ( callback ) {
      						throw e;
      					}
      				}
      			},
      
      			abort: function() {
      				if ( callback ) {
      					callback();
      				}
      			}
      		};
      	}
      });
      
      
      
      
      // Install script dataType
      jQuery.ajaxSetup({
      	accepts: {
      		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
      	},
      	contents: {
      		script: /(?:java|ecma)script/
      	},
      	converters: {
      		"text script": function( text ) {
      			jQuery.globalEval( text );
      			return text;
      		}
      	}
      });
      
      // Handle cache's special case and crossDomain
      jQuery.ajaxPrefilter( "script", function( s ) {
      	if ( s.cache === undefined ) {
      		s.cache = false;
      	}
      	if ( s.crossDomain ) {
      		s.type = "GET";
      	}
      });
      
      // Bind script tag hack transport
      jQuery.ajaxTransport( "script", function( s ) {
      	// This transport only deals with cross domain requests
      	if ( s.crossDomain ) {
      		var script, callback;
      		return {
      			send: function( _, complete ) {
      				script = jQuery("<script>").prop({
      					async: true,
      					charset: s.scriptCharset,
      					src: s.url
      				}).on(
      					"load error",
      					callback = function( evt ) {
      						script.remove();
      						callback = null;
      						if ( evt ) {
      							complete( evt.type === "error" ? 404 : 200, evt.type );
      						}
      					}
      				);
      				document.head.appendChild( script[ 0 ] );
      			},
      			abort: function() {
      				if ( callback ) {
      					callback();
      				}
      			}
      		};
      	}
      });
      
      
      
      
      var oldCallbacks = [],
      	rjsonp = /(=)\?(?=&|$)|\?\?/;
      
      // Default jsonp settings
      jQuery.ajaxSetup({
      	jsonp: "callback",
      	jsonpCallback: function() {
      		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
      		this[ callback ] = true;
      		return callback;
      	}
      });
      
      // Detect, normalize options and install callbacks for jsonp requests
      jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {
      
      	var callbackName, overwritten, responseContainer,
      		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
      			"url" :
      			typeof s.data === "string" && !( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") && rjsonp.test( s.data ) && "data"
      		);
      
      	// Handle iff the expected data type is "jsonp" or we have a parameter to set
      	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {
      
      		// Get callback name, remembering preexisting value associated with it
      		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
      			s.jsonpCallback() :
      			s.jsonpCallback;
      
      		// Insert callback into url or form data
      		if ( jsonProp ) {
      			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
      		} else if ( s.jsonp !== false ) {
      			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
      		}
      
      		// Use data converter to retrieve json after script execution
      		s.converters["script json"] = function() {
      			if ( !responseContainer ) {
      				jQuery.error( callbackName + " was not called" );
      			}
      			return responseContainer[ 0 ];
      		};
      
      		// force json dataType
      		s.dataTypes[ 0 ] = "json";
      
      		// Install callback
      		overwritten = window[ callbackName ];
      		window[ callbackName ] = function() {
      			responseContainer = arguments;
      		};
      
      		// Clean-up function (fires after converters)
      		jqXHR.always(function() {
      			// Restore preexisting value
      			window[ callbackName ] = overwritten;
      
      			// Save back as free
      			if ( s[ callbackName ] ) {
      				// make sure that re-using the options doesn't screw things around
      				s.jsonpCallback = originalSettings.jsonpCallback;
      
      				// save the callback name for future use
      				oldCallbacks.push( callbackName );
      			}
      
      			// Call if it was a function and we have a response
      			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
      				overwritten( responseContainer[ 0 ] );
      			}
      
      			responseContainer = overwritten = undefined;
      		});
      
      		// Delegate to script
      		return "script";
      	}
      });
      
      
      
      
      // data: string of html
      // context (optional): If specified, the fragment will be created in this context, defaults to document
      // keepScripts (optional): If true, will include scripts passed in the html string
      jQuery.parseHTML = function( data, context, keepScripts ) {
      	if ( !data || typeof data !== "string" ) {
      		return null;
      	}
      	if ( typeof context === "boolean" ) {
      		keepScripts = context;
      		context = false;
      	}
      	context = context || document;
      
      	var parsed = rsingleTag.exec( data ),
      		scripts = !keepScripts && [];
      
      	// Single tag
      	if ( parsed ) {
      		return [ context.createElement( parsed[1] ) ];
      	}
      
      	parsed = jQuery.buildFragment( [ data ], context, scripts );
      
      	if ( scripts && scripts.length ) {
      		jQuery( scripts ).remove();
      	}
      
      	return jQuery.merge( [], parsed.childNodes );
      };
      
      
      // Keep a copy of the old load method
      var _load = jQuery.fn.load;
      
      /**
       * Load a url into a page
       */
      jQuery.fn.load = function( url, params, callback ) {
      	if ( typeof url !== "string" && _load ) {
      		return _load.apply( this, arguments );
      	}
      
      	var selector, type, response,
      		self = this,
      		off = url.indexOf(" ");
      
      	if ( off >= 0 ) {
      		selector = jQuery.trim( url.slice( off ) );
      		url = url.slice( 0, off );
      	}
      
      	// If it's a function
      	if ( jQuery.isFunction( params ) ) {
      
      		// We assume that it's the callback
      		callback = params;
      		params = undefined;
      
      	// Otherwise, build a param string
      	} else if ( params && typeof params === "object" ) {
      		type = "POST";
      	}
      
      	// If we have elements to modify, make the request
      	if ( self.length > 0 ) {
      		jQuery.ajax({
      			url: url,
      
      			// if "type" variable is undefined, then "GET" method will be used
      			type: type,
      			dataType: "html",
      			data: params
      		}).done(function( responseText ) {
      
      			// Save response for use in complete callback
      			response = arguments;
      
      			self.html( selector ?
      
      				// If a selector was specified, locate the right elements in a dummy div
      				// Exclude scripts to avoid IE 'Permission Denied' errors
      				jQuery("<div>").append( jQuery.parseHTML( responseText ) ).find( selector ) :
      
      				// Otherwise use the full result
      				responseText );
      
      		}).complete( callback && function( jqXHR, status ) {
      			self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
      		});
      	}
      
      	return this;
      };
      
      
      
      
      // Attach a bunch of functions for handling common AJAX events
      jQuery.each( [ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function( i, type ) {
      	jQuery.fn[ type ] = function( fn ) {
      		return this.on( type, fn );
      	};
      });
      
      
      
      
      jQuery.expr.filters.animated = function( elem ) {
      	return jQuery.grep(jQuery.timers, function( fn ) {
      		return elem === fn.elem;
      	}).length;
      };
      
      
      
      
      var docElem = window.document.documentElement;
      
      /**
       * Gets a window from an element
       */
      function getWindow( elem ) {
      	return jQuery.isWindow( elem ) ? elem : elem.nodeType === 9 && elem.defaultView;
      }
      
      jQuery.offset = {
      	setOffset: function( elem, options, i ) {
      		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
      			position = jQuery.css( elem, "position" ),
      			curElem = jQuery( elem ),
      			props = {};
      
      		// Set position first, in-case top/left are set even on static elem
      		if ( position === "static" ) {
      			elem.style.position = "relative";
      		}
      
      		curOffset = curElem.offset();
      		curCSSTop = jQuery.css( elem, "top" );
      		curCSSLeft = jQuery.css( elem, "left" );
      		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
      			( curCSSTop + curCSSLeft ).indexOf("auto") > -1;
      
      		// Need to be able to calculate position if either
      		// top or left is auto and position is either absolute or fixed
      		if ( calculatePosition ) {
      			curPosition = curElem.position();
      			curTop = curPosition.top;
      			curLeft = curPosition.left;
      
      		} else {
      			curTop = parseFloat( curCSSTop ) || 0;
      			curLeft = parseFloat( curCSSLeft ) || 0;
      		}
      
      		if ( jQuery.isFunction( options ) ) {
      			options = options.call( elem, i, curOffset );
      		}
      
      		if ( options.top != null ) {
      			props.top = ( options.top - curOffset.top ) + curTop;
      		}
      		if ( options.left != null ) {
      			props.left = ( options.left - curOffset.left ) + curLeft;
      		}
      
      		if ( "using" in options ) {
      			options.using.call( elem, props );
      
      		} else {
      			curElem.css( props );
      		}
      	}
      };
      
      jQuery.fn.extend({
      	offset: function( options ) {
      		if ( arguments.length ) {
      			return options === undefined ?
      				this :
      				this.each(function( i ) {
      					jQuery.offset.setOffset( this, options, i );
      				});
      		}
      
      		var docElem, win,
      			elem = this[ 0 ],
      			box = { top: 0, left: 0 },
      			doc = elem && elem.ownerDocument;
      
      		if ( !doc ) {
      			return;
      		}
      
      		docElem = doc.documentElement;
      
      		// Make sure it's not a disconnected DOM node
      		if ( !jQuery.contains( docElem, elem ) ) {
      			return box;
      		}
      
      		// Support: BlackBerry 5, iOS 3 (original iPhone)
      		// If we don't have gBCR, just use 0,0 rather than error
      		if ( typeof elem.getBoundingClientRect !== strundefined ) {
      			box = elem.getBoundingClientRect();
      		}
      		win = getWindow( doc );
      		return {
      			top: box.top + win.pageYOffset - docElem.clientTop,
      			left: box.left + win.pageXOffset - docElem.clientLeft
      		};
      	},
      
      	position: function() {
      		if ( !this[ 0 ] ) {
      			return;
      		}
      
      		var offsetParent, offset,
      			elem = this[ 0 ],
      			parentOffset = { top: 0, left: 0 };
      
      		// Fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is its only offset parent
      		if ( jQuery.css( elem, "position" ) === "fixed" ) {
      			// Assume getBoundingClientRect is there when computed position is fixed
      			offset = elem.getBoundingClientRect();
      
      		} else {
      			// Get *real* offsetParent
      			offsetParent = this.offsetParent();
      
      			// Get correct offsets
      			offset = this.offset();
      			if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
      				parentOffset = offsetParent.offset();
      			}
      
      			// Add offsetParent borders
      			parentOffset.top += jQuery.css( offsetParent[ 0 ], "borderTopWidth", true );
      			parentOffset.left += jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true );
      		}
      
      		// Subtract parent offsets and element margins
      		return {
      			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
      			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
      		};
      	},
      
      	offsetParent: function() {
      		return this.map(function() {
      			var offsetParent = this.offsetParent || docElem;
      
      			while ( offsetParent && ( !jQuery.nodeName( offsetParent, "html" ) && jQuery.css( offsetParent, "position" ) === "static" ) ) {
      				offsetParent = offsetParent.offsetParent;
      			}
      
      			return offsetParent || docElem;
      		});
      	}
      });
      
      // Create scrollLeft and scrollTop methods
      jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
      	var top = "pageYOffset" === prop;
      
      	jQuery.fn[ method ] = function( val ) {
      		return access( this, function( elem, method, val ) {
      			var win = getWindow( elem );
      
      			if ( val === undefined ) {
      				return win ? win[ prop ] : elem[ method ];
      			}
      
      			if ( win ) {
      				win.scrollTo(
      					!top ? val : window.pageXOffset,
      					top ? val : window.pageYOffset
      				);
      
      			} else {
      				elem[ method ] = val;
      			}
      		}, method, val, arguments.length, null );
      	};
      });
      
      // Support: Safari<7+, Chrome<37+
      // Add the top/left cssHooks using jQuery.fn.position
      // Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
      // Blink bug: https://code.google.com/p/chromium/issues/detail?id=229280
      // getComputedStyle returns percent when specified for top/left/bottom/right;
      // rather than make the css module depend on the offset module, just check for it here
      jQuery.each( [ "top", "left" ], function( i, prop ) {
      	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
      		function( elem, computed ) {
      			if ( computed ) {
      				computed = curCSS( elem, prop );
      				// If curCSS returns percentage, fallback to offset
      				return rnumnonpx.test( computed ) ?
      					jQuery( elem ).position()[ prop ] + "px" :
      					computed;
      			}
      		}
      	);
      });
      
      
      // Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
      jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
      	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
      		// Margin is only for outerHeight, outerWidth
      		jQuery.fn[ funcName ] = function( margin, value ) {
      			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
      				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );
      
      			return access( this, function( elem, type, value ) {
      				var doc;
      
      				if ( jQuery.isWindow( elem ) ) {
      					// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
      					// isn't a whole lot we can do. See pull request at this URL for discussion:
      					// https://github.com/jquery/jquery/pull/764
      					return elem.document.documentElement[ "client" + name ];
      				}
      
      				// Get document width or height
      				if ( elem.nodeType === 9 ) {
      					doc = elem.documentElement;
      
      					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
      					// whichever is greatest
      					return Math.max(
      						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
      						elem.body[ "offset" + name ], doc[ "offset" + name ],
      						doc[ "client" + name ]
      					);
      				}
      
      				return value === undefined ?
      					// Get width or height on the element, requesting but not forcing parseFloat
      					jQuery.css( elem, type, extra ) :
      
      					// Set width or height on the element
      					jQuery.style( elem, type, value, extra );
      			}, type, chainable ? margin : undefined, chainable, null );
      		};
      	});
      });
      
      
      // The number of elements contained in the matched element set
      jQuery.fn.size = function() {
      	return this.length;
      };
      
      jQuery.fn.andSelf = jQuery.fn.addBack;
      
      
      
      
      // Register as a named AMD module, since jQuery can be concatenated with other
      // files that may use define, but not via a proper concatenation script that
      // understands anonymous AMD modules. A named AMD is safest and most robust
      // way to register. Lowercase jquery is used because AMD module names are
      // derived from file names, and jQuery is normally delivered in a lowercase
      // file name. Do this after creating the global so that if an AMD module wants
      // to call noConflict to hide this version of jQuery, it will work.
      
      // Note that for maximum portability, libraries that are not jQuery should
      // declare themselves as anonymous modules, and avoid setting a global if an
      // AMD loader is present. jQuery is a special case. For more information, see
      // https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon
      
      if ( typeof define === "function" && define.amd ) {
      	define( "jquery", [], function() {
      		return jQuery;
      	});
      }
      
      
      
      
      var
      	// Map over jQuery in case of overwrite
      	_jQuery = window.jQuery,
      
      	// Map over the $ in case of overwrite
      	_$ = window.$;
      
      jQuery.noConflict = function( deep ) {
      	if ( window.$ === jQuery ) {
      		window.$ = _$;
      	}
      
      	if ( deep && window.jQuery === jQuery ) {
      		window.jQuery = _jQuery;
      	}
      
      	return jQuery;
      };
      
      // Expose jQuery and $ identifiers, even in AMD
      // (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
      // and CommonJS for browser emulators (#13566)
      if ( typeof noGlobal === strundefined ) {
      	window.jQuery = window.$ = jQuery;
      }
      
      
      
      
      return jQuery;
      
      }));
      
    }
  }, 'dist/jquery');

  Module.createPackage('vague-time', {
    'lib/vagueTime': function (module, exports, require, global) {
      /**
       * This module formats precise time differences as a vague/fuzzy
       * time, e.g. '3 weeks ago', 'just now' or 'in 2 hours'.
       */
      
       /*globals define, module */
      
      (function (globals) {
          'use strict';
      
          var times = {
              year: 31557600000, // 1000 ms * 60 s * 60 m * 24 h * 365.25 d
              month: 2629800000, // 31557600000 ms / 12 m
              week: 604800000, // 1000 ms * 60 s * 60 m * 24 h * 7 d
              day: 86400000, // 1000 ms * 60 s * 60 m * 24 h
              hour: 3600000, // 1000 ms * 60 s * 60 m
              minute: 60000 // 1000 ms * 60 s
          },
      
          languages = {
              br: {
                  year: [ 'ano', 'anos' ],
                  month: [ 'mês', 'meses' ],
                  week: [ 'semana', 'semanas' ],
                  day: [ 'dia', 'dias' ],
                  hour: [ 'hora', 'horas' ],
                  minute: [ 'minuto', 'minutos' ],
      
                  past: function (vagueTime, unit) {
                      return vagueTime + ' ' + unit + ' atrás';
                  },
      
                  future: function (vagueTime, unit) {
                      return 'em ' + vagueTime + ' ' + unit;
                  },
      
                  defaults: {
                      past: 'agora mesmo',
                      future: 'em breve'
                  }
              }
      ,
              da: {
                  year: [ 'år', 'år' ],
                  month: [ 'måned', 'måneder' ],
                  week: [ 'uge', 'uger' ],
                  day: [ 'dag', 'dage' ],
                  hour: [ 'time', 'timer' ],
                  minute: [ 'minut', 'minutter' ],
              
                  past: function (vagueTime, unit) {
                      return vagueTime + ' ' + unit + ' siden';
                  },
              
                  future: function (vagueTime, unit) {
                      return 'om ' + vagueTime + ' ' + unit;
                  },
              
                  defaults: {
                      past: 'lige nu',
                      future: 'snart'
                  }
              },
              de: {
                  year: [ 'Jahr', 'Jahren' ],
                  month: [ 'Monat', 'Monaten' ],
                  week: [ 'Woche', 'Wochen' ],
                  day: [ 'Tag', 'Tagen' ],
                  hour: [ 'Stunde', 'Stunden' ],
                  minute: [ 'Minute', 'Minuten' ],
              
                  past: function (vagueTime, unit) {
                      return 'vor ' + vagueTime + ' ' + unit;
                  },
              
                  future: function (vagueTime, unit) {
                      return 'in ' + vagueTime + ' ' + unit;
                  },
              
                  defaults: {
                      past: 'jetzt gerade',
                      future: 'bald'
                  }
              },
              en: {
                  year: [ 'year', 'years' ],
                  month: [ 'month', 'months' ],
                  week: [ 'week', 'weeks' ],
                  day: [ 'day', 'days' ],
                  hour: [ 'hour', 'hours' ],
                  minute: [ 'minute', 'minutes' ],
              
                  past: function (vagueTime, unit) {
                      return vagueTime + ' ' + unit + ' ago';
                  },
              
                  future: function (vagueTime, unit) {
                      return 'in ' + vagueTime + ' ' + unit;
                  },
              
                  defaults: {
                      past: 'just now',
                      future: 'soon'
                  }
              },
              es: {
                  year: [ 'año', 'años' ],
                  month: [ 'mes', 'meses' ],
                  week: [ 'semana', 'semanas' ],
                  day: [ 'día', 'días' ],
                  hour: [ 'hora', 'horas' ],
                  minute: [ 'minuto', 'minutos' ],
      
                  past: function (vagueTime, unit) {
                      return 'hace ' + vagueTime + ' ' + unit;
                  },
      
                  future: function (vagueTime, unit) {
                      return 'en ' + vagueTime + ' ' + unit;
                  },
      
                  defaults: {
                      past: 'recién',
                      future: 'dentro de poco'
                  }
              }
      ,
              fr: {
                  year: [ 'an', 'ans' ],
                  month: [ 'mois', 'mois' ],
                  week: [ 'semaine', 'semaines' ],
                  day: [ 'jour', 'jours' ],
                  hour: [ 'heure', 'heures' ],
                  minute: [ 'minute', 'minutes' ],
              
                  past: function (vagueTime, unit) {
                      return 'il y a ' + vagueTime + ' ' + unit;
                  },
              
                  future: function (vagueTime, unit) {
                      return 'dans ' + vagueTime + ' ' + unit;
                  },
              
                  defaults: {
                      past: 'tout de suite',
                      future: 'bientôt'
                  }
              },
      		jp: {
      			year: [ '年', '年' ],
      				month: [ 'ヶ月', 'ヶ月' ],
      				week: [ '週間', '週間' ],
      				day: [ '日', '日' ],
      				hour: [ '時間', '時間' ],
      				minute: [ '分', '分' ],
      
      				past: function (vagueTime, unit) {
      				return vagueTime + ' ' + unit + '前';
      			},
      
      			future: function (vagueTime, unit) {
      				return vagueTime + ' ' + unit + '後';
      			},
      
      			defaults: {
      				past: '今',
      					future: 'すぐに'
      			}
      		},
      		ko: {
      			year: [ '년', '년' ],
      				month: [ '개월', '개월' ],
      				week: [ '주', '주' ],
      				day: [ '일', '일' ],
      				hour: [ '시간', '시간' ],
      				minute: [ '분', '분' ],
      
      				past: function (vagueTime, unit) {
      				return vagueTime + ' ' + unit + ' 전';
      			},
      
      			future: function (vagueTime, unit) {
      				return vagueTime + ' ' + unit + ' 후';
      			},
      
      			defaults: {
      				past: '지금',
      					future: '곧'
      			}
        		},
              nl: {
                  year: [ 'jaar', 'jaar' ],
                  month: [ 'maand', 'maanden' ],
                  week: [ 'week', 'weken' ],
                  day: [ 'dag', 'dagen' ],
                  hour: [ 'uur', 'uur' ],
                  minute: [ 'minuut', 'minuten' ],
              
                  past: function (vagueTime, unit) {
                      return vagueTime + ' ' + unit + ' geleden';
                  },
              
                  future: function (vagueTime, unit) {
                      return 'over ' + vagueTime + ' ' + unit;
                  },
              
                  defaults: {
                      past: 'juist nu',
                      future: 'binnenkort'
                  }
              },
      		zh: {
      			year: [ '年', '年' ],
      				month: [ '个月', '个月' ],
      				week: [ '周', '周' ],
      				day: [ '天', '天' ],
      				hour: [ '小时', '小时' ],
      				minute: [ '分钟', '分钟' ],
      
      				past: function (vagueTime, unit) {
      				return vagueTime + ' ' + unit + ' 之前';
      			},
      
      			future: function (vagueTime, unit) {
      				return 'in ' + vagueTime + ' ' + unit;
      			},
      
      			defaults: {
      				past: '刚刚',
      					future: '马上'
      			}
      		}
          },
      
          defaultLanguage = 'en',
      
          functions = {
              get: getVagueTime
          };
      
          exportFunctions();
      
          /**
           * Public function `get`.
           *
           * Returns a vague time, such as '3 weeks ago', 'just now' or 'in 2 hours'.
           *
           * @option [from] {Date}    The origin time. Defaults to `Date.now()`.
           * @option [to] {Date}      The target time. Defaults to `Date.now()`.
           * @option [units] {string} If `from` or `to` are timestamps rather than date
           *                          instances, this indicates the units that they are
           *                          measured in. Can be either `ms` for milliseconds
           *                          or `s` for seconds. Defaults to `ms`.
           * @option [lang] {string}  The output language. Default is specified as a
           *                          build option.
           */
          function getVagueTime (options) {
              var units = normaliseUnits(options.units),
                  now = Date.now(),
                  from = normaliseTime(options.from, units, now),
                  to = normaliseTime(options.to, units, now),
                  difference = from - to,
                  type;
      
              if (difference >= 0) {
                  type = 'past';
              } else {
                  type = 'future';
                  difference = -difference;
              }
      
              return estimate(difference, type, options.lang);
          }
      
          function normaliseUnits (units) {
              if (typeof units === 'undefined') {
                  return 'ms';
              }
      
              if (units === 's' || units === 'ms') {
                  return units;
              }
      
              throw new Error('Invalid units');
          }
      
          function normaliseTime(time, units, defaultTime) {
              if (typeof time === 'undefined') {
                  return defaultTime;
              }
      
              if (typeof time === 'string') {
                  time = parseInt(time, 10);
              }
      
              if (isNotDate(time) && isNotTimestamp(time)) {
                  throw new Error('Invalid time');
              }
      
              if (typeof time === 'number' && units === 's') {
                  time *= 1000;
              }
      
              return time;
          }
      
          function isNotDate (date) {
              return Object.prototype.toString.call(date) !== '[object Date]' || isNaN(date.getTime());
          }
      
          function isNotTimestamp (timestamp) {
              return typeof timestamp !== 'number' || isNaN(timestamp);
          }
      
          function estimate (difference, type, language) {
              var time, vagueTime, lang = languages[language] || languages[defaultLanguage];
      
              for (time in times) {
                  if (times.hasOwnProperty(time) && difference >= times[time]) {
                      vagueTime = Math.floor(difference / times[time]);
                      return lang[type](vagueTime, lang[time][(vagueTime > 1)+0]);
                  }
              }
      
              return lang.defaults[type];
          }
      
          function exportFunctions () {
              if (typeof define === 'function' && define.amd) {
                  define(function () {
                      return functions;
                  });
              } else if (typeof module !== 'undefined' && module !== null) {
                  module.exports = functions;
              } else {
                  globals.vagueTime = functions;
              }
          }
      }(this));
      
      
    }
  }, 'lib/vagueTime');

  Module.createPackage('underscore', {
    'underscore': function (module, exports, require, global) {
      //     Underscore.js 1.8.3
      //     http://underscorejs.org
      //     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
      //     Underscore may be freely distributed under the MIT license.
      
      (function() {
      
        // Baseline setup
        // --------------
      
        // Establish the root object, `window` in the browser, or `exports` on the server.
        var root = this;
      
        // Save the previous value of the `_` variable.
        var previousUnderscore = root._;
      
        // Save bytes in the minified (but not gzipped) version:
        var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
      
        // Create quick reference variables for speed access to core prototypes.
        var
          push             = ArrayProto.push,
          slice            = ArrayProto.slice,
          toString         = ObjProto.toString,
          hasOwnProperty   = ObjProto.hasOwnProperty;
      
        // All **ECMAScript 5** native function implementations that we hope to use
        // are declared here.
        var
          nativeIsArray      = Array.isArray,
          nativeKeys         = Object.keys,
          nativeBind         = FuncProto.bind,
          nativeCreate       = Object.create;
      
        // Naked function reference for surrogate-prototype-swapping.
        var Ctor = function(){};
      
        // Create a safe reference to the Underscore object for use below.
        var _ = function(obj) {
          if (obj instanceof _) return obj;
          if (!(this instanceof _)) return new _(obj);
          this._wrapped = obj;
        };
      
        // Export the Underscore object for **Node.js**, with
        // backwards-compatibility for the old `require()` API. If we're in
        // the browser, add `_` as a global object.
        if (typeof exports !== 'undefined') {
          if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = _;
          }
          exports._ = _;
        } else {
          root._ = _;
        }
      
        // Current version.
        _.VERSION = '1.8.3';
      
        // Internal function that returns an efficient (for current engines) version
        // of the passed-in callback, to be repeatedly applied in other Underscore
        // functions.
        var optimizeCb = function(func, context, argCount) {
          if (context === void 0) return func;
          switch (argCount == null ? 3 : argCount) {
            case 1: return function(value) {
              return func.call(context, value);
            };
            case 2: return function(value, other) {
              return func.call(context, value, other);
            };
            case 3: return function(value, index, collection) {
              return func.call(context, value, index, collection);
            };
            case 4: return function(accumulator, value, index, collection) {
              return func.call(context, accumulator, value, index, collection);
            };
          }
          return function() {
            return func.apply(context, arguments);
          };
        };
      
        // A mostly-internal function to generate callbacks that can be applied
        // to each element in a collection, returning the desired result — either
        // identity, an arbitrary callback, a property matcher, or a property accessor.
        var cb = function(value, context, argCount) {
          if (value == null) return _.identity;
          if (_.isFunction(value)) return optimizeCb(value, context, argCount);
          if (_.isObject(value)) return _.matcher(value);
          return _.property(value);
        };
        _.iteratee = function(value, context) {
          return cb(value, context, Infinity);
        };
      
        // An internal function for creating assigner functions.
        var createAssigner = function(keysFunc, undefinedOnly) {
          return function(obj) {
            var length = arguments.length;
            if (length < 2 || obj == null) return obj;
            for (var index = 1; index < length; index++) {
              var source = arguments[index],
                  keys = keysFunc(source),
                  l = keys.length;
              for (var i = 0; i < l; i++) {
                var key = keys[i];
                if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
              }
            }
            return obj;
          };
        };
      
        // An internal function for creating a new object that inherits from another.
        var baseCreate = function(prototype) {
          if (!_.isObject(prototype)) return {};
          if (nativeCreate) return nativeCreate(prototype);
          Ctor.prototype = prototype;
          var result = new Ctor;
          Ctor.prototype = null;
          return result;
        };
      
        var property = function(key) {
          return function(obj) {
            return obj == null ? void 0 : obj[key];
          };
        };
      
        // Helper for collection methods to determine whether a collection
        // should be iterated as an array or as an object
        // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
        // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
        var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
        var getLength = property('length');
        var isArrayLike = function(collection) {
          var length = getLength(collection);
          return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
        };
      
        // Collection Functions
        // --------------------
      
        // The cornerstone, an `each` implementation, aka `forEach`.
        // Handles raw objects in addition to array-likes. Treats all
        // sparse array-likes as if they were dense.
        _.each = _.forEach = function(obj, iteratee, context) {
          iteratee = optimizeCb(iteratee, context);
          var i, length;
          if (isArrayLike(obj)) {
            for (i = 0, length = obj.length; i < length; i++) {
              iteratee(obj[i], i, obj);
            }
          } else {
            var keys = _.keys(obj);
            for (i = 0, length = keys.length; i < length; i++) {
              iteratee(obj[keys[i]], keys[i], obj);
            }
          }
          return obj;
        };
      
        // Return the results of applying the iteratee to each element.
        _.map = _.collect = function(obj, iteratee, context) {
          iteratee = cb(iteratee, context);
          var keys = !isArrayLike(obj) && _.keys(obj),
              length = (keys || obj).length,
              results = Array(length);
          for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            results[index] = iteratee(obj[currentKey], currentKey, obj);
          }
          return results;
        };
      
        // Create a reducing function iterating left or right.
        function createReduce(dir) {
          // Optimized iterator function as using arguments.length
          // in the main function will deoptimize the, see #1991.
          function iterator(obj, iteratee, memo, keys, index, length) {
            for (; index >= 0 && index < length; index += dir) {
              var currentKey = keys ? keys[index] : index;
              memo = iteratee(memo, obj[currentKey], currentKey, obj);
            }
            return memo;
          }
      
          return function(obj, iteratee, memo, context) {
            iteratee = optimizeCb(iteratee, context, 4);
            var keys = !isArrayLike(obj) && _.keys(obj),
                length = (keys || obj).length,
                index = dir > 0 ? 0 : length - 1;
            // Determine the initial value if none is provided.
            if (arguments.length < 3) {
              memo = obj[keys ? keys[index] : index];
              index += dir;
            }
            return iterator(obj, iteratee, memo, keys, index, length);
          };
        }
      
        // **Reduce** builds up a single result from a list of values, aka `inject`,
        // or `foldl`.
        _.reduce = _.foldl = _.inject = createReduce(1);
      
        // The right-associative version of reduce, also known as `foldr`.
        _.reduceRight = _.foldr = createReduce(-1);
      
        // Return the first value which passes a truth test. Aliased as `detect`.
        _.find = _.detect = function(obj, predicate, context) {
          var key;
          if (isArrayLike(obj)) {
            key = _.findIndex(obj, predicate, context);
          } else {
            key = _.findKey(obj, predicate, context);
          }
          if (key !== void 0 && key !== -1) return obj[key];
        };
      
        // Return all the elements that pass a truth test.
        // Aliased as `select`.
        _.filter = _.select = function(obj, predicate, context) {
          var results = [];
          predicate = cb(predicate, context);
          _.each(obj, function(value, index, list) {
            if (predicate(value, index, list)) results.push(value);
          });
          return results;
        };
      
        // Return all the elements for which a truth test fails.
        _.reject = function(obj, predicate, context) {
          return _.filter(obj, _.negate(cb(predicate)), context);
        };
      
        // Determine whether all of the elements match a truth test.
        // Aliased as `all`.
        _.every = _.all = function(obj, predicate, context) {
          predicate = cb(predicate, context);
          var keys = !isArrayLike(obj) && _.keys(obj),
              length = (keys || obj).length;
          for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            if (!predicate(obj[currentKey], currentKey, obj)) return false;
          }
          return true;
        };
      
        // Determine if at least one element in the object matches a truth test.
        // Aliased as `any`.
        _.some = _.any = function(obj, predicate, context) {
          predicate = cb(predicate, context);
          var keys = !isArrayLike(obj) && _.keys(obj),
              length = (keys || obj).length;
          for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            if (predicate(obj[currentKey], currentKey, obj)) return true;
          }
          return false;
        };
      
        // Determine if the array or object contains a given item (using `===`).
        // Aliased as `includes` and `include`.
        _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
          if (!isArrayLike(obj)) obj = _.values(obj);
          if (typeof fromIndex != 'number' || guard) fromIndex = 0;
          return _.indexOf(obj, item, fromIndex) >= 0;
        };
      
        // Invoke a method (with arguments) on every item in a collection.
        _.invoke = function(obj, method) {
          var args = slice.call(arguments, 2);
          var isFunc = _.isFunction(method);
          return _.map(obj, function(value) {
            var func = isFunc ? method : value[method];
            return func == null ? func : func.apply(value, args);
          });
        };
      
        // Convenience version of a common use case of `map`: fetching a property.
        _.pluck = function(obj, key) {
          return _.map(obj, _.property(key));
        };
      
        // Convenience version of a common use case of `filter`: selecting only objects
        // containing specific `key:value` pairs.
        _.where = function(obj, attrs) {
          return _.filter(obj, _.matcher(attrs));
        };
      
        // Convenience version of a common use case of `find`: getting the first object
        // containing specific `key:value` pairs.
        _.findWhere = function(obj, attrs) {
          return _.find(obj, _.matcher(attrs));
        };
      
        // Return the maximum element (or element-based computation).
        _.max = function(obj, iteratee, context) {
          var result = -Infinity, lastComputed = -Infinity,
              value, computed;
          if (iteratee == null && obj != null) {
            obj = isArrayLike(obj) ? obj : _.values(obj);
            for (var i = 0, length = obj.length; i < length; i++) {
              value = obj[i];
              if (value > result) {
                result = value;
              }
            }
          } else {
            iteratee = cb(iteratee, context);
            _.each(obj, function(value, index, list) {
              computed = iteratee(value, index, list);
              if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
                result = value;
                lastComputed = computed;
              }
            });
          }
          return result;
        };
      
        // Return the minimum element (or element-based computation).
        _.min = function(obj, iteratee, context) {
          var result = Infinity, lastComputed = Infinity,
              value, computed;
          if (iteratee == null && obj != null) {
            obj = isArrayLike(obj) ? obj : _.values(obj);
            for (var i = 0, length = obj.length; i < length; i++) {
              value = obj[i];
              if (value < result) {
                result = value;
              }
            }
          } else {
            iteratee = cb(iteratee, context);
            _.each(obj, function(value, index, list) {
              computed = iteratee(value, index, list);
              if (computed < lastComputed || computed === Infinity && result === Infinity) {
                result = value;
                lastComputed = computed;
              }
            });
          }
          return result;
        };
      
        // Shuffle a collection, using the modern version of the
        // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
        _.shuffle = function(obj) {
          var set = isArrayLike(obj) ? obj : _.values(obj);
          var length = set.length;
          var shuffled = Array(length);
          for (var index = 0, rand; index < length; index++) {
            rand = _.random(0, index);
            if (rand !== index) shuffled[index] = shuffled[rand];
            shuffled[rand] = set[index];
          }
          return shuffled;
        };
      
        // Sample **n** random values from a collection.
        // If **n** is not specified, returns a single random element.
        // The internal `guard` argument allows it to work with `map`.
        _.sample = function(obj, n, guard) {
          if (n == null || guard) {
            if (!isArrayLike(obj)) obj = _.values(obj);
            return obj[_.random(obj.length - 1)];
          }
          return _.shuffle(obj).slice(0, Math.max(0, n));
        };
      
        // Sort the object's values by a criterion produced by an iteratee.
        _.sortBy = function(obj, iteratee, context) {
          iteratee = cb(iteratee, context);
          return _.pluck(_.map(obj, function(value, index, list) {
            return {
              value: value,
              index: index,
              criteria: iteratee(value, index, list)
            };
          }).sort(function(left, right) {
            var a = left.criteria;
            var b = right.criteria;
            if (a !== b) {
              if (a > b || a === void 0) return 1;
              if (a < b || b === void 0) return -1;
            }
            return left.index - right.index;
          }), 'value');
        };
      
        // An internal function used for aggregate "group by" operations.
        var group = function(behavior) {
          return function(obj, iteratee, context) {
            var result = {};
            iteratee = cb(iteratee, context);
            _.each(obj, function(value, index) {
              var key = iteratee(value, index, obj);
              behavior(result, value, key);
            });
            return result;
          };
        };
      
        // Groups the object's values by a criterion. Pass either a string attribute
        // to group by, or a function that returns the criterion.
        _.groupBy = group(function(result, value, key) {
          if (_.has(result, key)) result[key].push(value); else result[key] = [value];
        });
      
        // Indexes the object's values by a criterion, similar to `groupBy`, but for
        // when you know that your index values will be unique.
        _.indexBy = group(function(result, value, key) {
          result[key] = value;
        });
      
        // Counts instances of an object that group by a certain criterion. Pass
        // either a string attribute to count by, or a function that returns the
        // criterion.
        _.countBy = group(function(result, value, key) {
          if (_.has(result, key)) result[key]++; else result[key] = 1;
        });
      
        // Safely create a real, live array from anything iterable.
        _.toArray = function(obj) {
          if (!obj) return [];
          if (_.isArray(obj)) return slice.call(obj);
          if (isArrayLike(obj)) return _.map(obj, _.identity);
          return _.values(obj);
        };
      
        // Return the number of elements in an object.
        _.size = function(obj) {
          if (obj == null) return 0;
          return isArrayLike(obj) ? obj.length : _.keys(obj).length;
        };
      
        // Split a collection into two arrays: one whose elements all satisfy the given
        // predicate, and one whose elements all do not satisfy the predicate.
        _.partition = function(obj, predicate, context) {
          predicate = cb(predicate, context);
          var pass = [], fail = [];
          _.each(obj, function(value, key, obj) {
            (predicate(value, key, obj) ? pass : fail).push(value);
          });
          return [pass, fail];
        };
      
        // Array Functions
        // ---------------
      
        // Get the first element of an array. Passing **n** will return the first N
        // values in the array. Aliased as `head` and `take`. The **guard** check
        // allows it to work with `_.map`.
        _.first = _.head = _.take = function(array, n, guard) {
          if (array == null) return void 0;
          if (n == null || guard) return array[0];
          return _.initial(array, array.length - n);
        };
      
        // Returns everything but the last entry of the array. Especially useful on
        // the arguments object. Passing **n** will return all the values in
        // the array, excluding the last N.
        _.initial = function(array, n, guard) {
          return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
        };
      
        // Get the last element of an array. Passing **n** will return the last N
        // values in the array.
        _.last = function(array, n, guard) {
          if (array == null) return void 0;
          if (n == null || guard) return array[array.length - 1];
          return _.rest(array, Math.max(0, array.length - n));
        };
      
        // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
        // Especially useful on the arguments object. Passing an **n** will return
        // the rest N values in the array.
        _.rest = _.tail = _.drop = function(array, n, guard) {
          return slice.call(array, n == null || guard ? 1 : n);
        };
      
        // Trim out all falsy values from an array.
        _.compact = function(array) {
          return _.filter(array, _.identity);
        };
      
        // Internal implementation of a recursive `flatten` function.
        var flatten = function(input, shallow, strict, startIndex) {
          var output = [], idx = 0;
          for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
            var value = input[i];
            if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
              //flatten current level of array or arguments object
              if (!shallow) value = flatten(value, shallow, strict);
              var j = 0, len = value.length;
              output.length += len;
              while (j < len) {
                output[idx++] = value[j++];
              }
            } else if (!strict) {
              output[idx++] = value;
            }
          }
          return output;
        };
      
        // Flatten out an array, either recursively (by default), or just one level.
        _.flatten = function(array, shallow) {
          return flatten(array, shallow, false);
        };
      
        // Return a version of the array that does not contain the specified value(s).
        _.without = function(array) {
          return _.difference(array, slice.call(arguments, 1));
        };
      
        // Produce a duplicate-free version of the array. If the array has already
        // been sorted, you have the option of using a faster algorithm.
        // Aliased as `unique`.
        _.uniq = _.unique = function(array, isSorted, iteratee, context) {
          if (!_.isBoolean(isSorted)) {
            context = iteratee;
            iteratee = isSorted;
            isSorted = false;
          }
          if (iteratee != null) iteratee = cb(iteratee, context);
          var result = [];
          var seen = [];
          for (var i = 0, length = getLength(array); i < length; i++) {
            var value = array[i],
                computed = iteratee ? iteratee(value, i, array) : value;
            if (isSorted) {
              if (!i || seen !== computed) result.push(value);
              seen = computed;
            } else if (iteratee) {
              if (!_.contains(seen, computed)) {
                seen.push(computed);
                result.push(value);
              }
            } else if (!_.contains(result, value)) {
              result.push(value);
            }
          }
          return result;
        };
      
        // Produce an array that contains the union: each distinct element from all of
        // the passed-in arrays.
        _.union = function() {
          return _.uniq(flatten(arguments, true, true));
        };
      
        // Produce an array that contains every item shared between all the
        // passed-in arrays.
        _.intersection = function(array) {
          var result = [];
          var argsLength = arguments.length;
          for (var i = 0, length = getLength(array); i < length; i++) {
            var item = array[i];
            if (_.contains(result, item)) continue;
            for (var j = 1; j < argsLength; j++) {
              if (!_.contains(arguments[j], item)) break;
            }
            if (j === argsLength) result.push(item);
          }
          return result;
        };
      
        // Take the difference between one array and a number of other arrays.
        // Only the elements present in just the first array will remain.
        _.difference = function(array) {
          var rest = flatten(arguments, true, true, 1);
          return _.filter(array, function(value){
            return !_.contains(rest, value);
          });
        };
      
        // Zip together multiple lists into a single array -- elements that share
        // an index go together.
        _.zip = function() {
          return _.unzip(arguments);
        };
      
        // Complement of _.zip. Unzip accepts an array of arrays and groups
        // each array's elements on shared indices
        _.unzip = function(array) {
          var length = array && _.max(array, getLength).length || 0;
          var result = Array(length);
      
          for (var index = 0; index < length; index++) {
            result[index] = _.pluck(array, index);
          }
          return result;
        };
      
        // Converts lists into objects. Pass either a single array of `[key, value]`
        // pairs, or two parallel arrays of the same length -- one of keys, and one of
        // the corresponding values.
        _.object = function(list, values) {
          var result = {};
          for (var i = 0, length = getLength(list); i < length; i++) {
            if (values) {
              result[list[i]] = values[i];
            } else {
              result[list[i][0]] = list[i][1];
            }
          }
          return result;
        };
      
        // Generator function to create the findIndex and findLastIndex functions
        function createPredicateIndexFinder(dir) {
          return function(array, predicate, context) {
            predicate = cb(predicate, context);
            var length = getLength(array);
            var index = dir > 0 ? 0 : length - 1;
            for (; index >= 0 && index < length; index += dir) {
              if (predicate(array[index], index, array)) return index;
            }
            return -1;
          };
        }
      
        // Returns the first index on an array-like that passes a predicate test
        _.findIndex = createPredicateIndexFinder(1);
        _.findLastIndex = createPredicateIndexFinder(-1);
      
        // Use a comparator function to figure out the smallest index at which
        // an object should be inserted so as to maintain order. Uses binary search.
        _.sortedIndex = function(array, obj, iteratee, context) {
          iteratee = cb(iteratee, context, 1);
          var value = iteratee(obj);
          var low = 0, high = getLength(array);
          while (low < high) {
            var mid = Math.floor((low + high) / 2);
            if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
          }
          return low;
        };
      
        // Generator function to create the indexOf and lastIndexOf functions
        function createIndexFinder(dir, predicateFind, sortedIndex) {
          return function(array, item, idx) {
            var i = 0, length = getLength(array);
            if (typeof idx == 'number') {
              if (dir > 0) {
                  i = idx >= 0 ? idx : Math.max(idx + length, i);
              } else {
                  length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
              }
            } else if (sortedIndex && idx && length) {
              idx = sortedIndex(array, item);
              return array[idx] === item ? idx : -1;
            }
            if (item !== item) {
              idx = predicateFind(slice.call(array, i, length), _.isNaN);
              return idx >= 0 ? idx + i : -1;
            }
            for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
              if (array[idx] === item) return idx;
            }
            return -1;
          };
        }
      
        // Return the position of the first occurrence of an item in an array,
        // or -1 if the item is not included in the array.
        // If the array is large and already in sort order, pass `true`
        // for **isSorted** to use binary search.
        _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
        _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);
      
        // Generate an integer Array containing an arithmetic progression. A port of
        // the native Python `range()` function. See
        // [the Python documentation](http://docs.python.org/library/functions.html#range).
        _.range = function(start, stop, step) {
          if (stop == null) {
            stop = start || 0;
            start = 0;
          }
          step = step || 1;
      
          var length = Math.max(Math.ceil((stop - start) / step), 0);
          var range = Array(length);
      
          for (var idx = 0; idx < length; idx++, start += step) {
            range[idx] = start;
          }
      
          return range;
        };
      
        // Function (ahem) Functions
        // ------------------
      
        // Determines whether to execute a function as a constructor
        // or a normal function with the provided arguments
        var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
          if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
          var self = baseCreate(sourceFunc.prototype);
          var result = sourceFunc.apply(self, args);
          if (_.isObject(result)) return result;
          return self;
        };
      
        // Create a function bound to a given object (assigning `this`, and arguments,
        // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
        // available.
        _.bind = function(func, context) {
          if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
          if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
          var args = slice.call(arguments, 2);
          var bound = function() {
            return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
          };
          return bound;
        };
      
        // Partially apply a function by creating a version that has had some of its
        // arguments pre-filled, without changing its dynamic `this` context. _ acts
        // as a placeholder, allowing any combination of arguments to be pre-filled.
        _.partial = function(func) {
          var boundArgs = slice.call(arguments, 1);
          var bound = function() {
            var position = 0, length = boundArgs.length;
            var args = Array(length);
            for (var i = 0; i < length; i++) {
              args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
            }
            while (position < arguments.length) args.push(arguments[position++]);
            return executeBound(func, bound, this, this, args);
          };
          return bound;
        };
      
        // Bind a number of an object's methods to that object. Remaining arguments
        // are the method names to be bound. Useful for ensuring that all callbacks
        // defined on an object belong to it.
        _.bindAll = function(obj) {
          var i, length = arguments.length, key;
          if (length <= 1) throw new Error('bindAll must be passed function names');
          for (i = 1; i < length; i++) {
            key = arguments[i];
            obj[key] = _.bind(obj[key], obj);
          }
          return obj;
        };
      
        // Memoize an expensive function by storing its results.
        _.memoize = function(func, hasher) {
          var memoize = function(key) {
            var cache = memoize.cache;
            var address = '' + (hasher ? hasher.apply(this, arguments) : key);
            if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
            return cache[address];
          };
          memoize.cache = {};
          return memoize;
        };
      
        // Delays a function for the given number of milliseconds, and then calls
        // it with the arguments supplied.
        _.delay = function(func, wait) {
          var args = slice.call(arguments, 2);
          return setTimeout(function(){
            return func.apply(null, args);
          }, wait);
        };
      
        // Defers a function, scheduling it to run after the current call stack has
        // cleared.
        _.defer = _.partial(_.delay, _, 1);
      
        // Returns a function, that, when invoked, will only be triggered at most once
        // during a given window of time. Normally, the throttled function will run
        // as much as it can, without ever going more than once per `wait` duration;
        // but if you'd like to disable the execution on the leading edge, pass
        // `{leading: false}`. To disable execution on the trailing edge, ditto.
        _.throttle = function(func, wait, options) {
          var context, args, result;
          var timeout = null;
          var previous = 0;
          if (!options) options = {};
          var later = function() {
            previous = options.leading === false ? 0 : _.now();
            timeout = null;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
          };
          return function() {
            var now = _.now();
            if (!previous && options.leading === false) previous = now;
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0 || remaining > wait) {
              if (timeout) {
                clearTimeout(timeout);
                timeout = null;
              }
              previous = now;
              result = func.apply(context, args);
              if (!timeout) context = args = null;
            } else if (!timeout && options.trailing !== false) {
              timeout = setTimeout(later, remaining);
            }
            return result;
          };
        };
      
        // Returns a function, that, as long as it continues to be invoked, will not
        // be triggered. The function will be called after it stops being called for
        // N milliseconds. If `immediate` is passed, trigger the function on the
        // leading edge, instead of the trailing.
        _.debounce = function(func, wait, immediate) {
          var timeout, args, context, timestamp, result;
      
          var later = function() {
            var last = _.now() - timestamp;
      
            if (last < wait && last >= 0) {
              timeout = setTimeout(later, wait - last);
            } else {
              timeout = null;
              if (!immediate) {
                result = func.apply(context, args);
                if (!timeout) context = args = null;
              }
            }
          };
      
          return function() {
            context = this;
            args = arguments;
            timestamp = _.now();
            var callNow = immediate && !timeout;
            if (!timeout) timeout = setTimeout(later, wait);
            if (callNow) {
              result = func.apply(context, args);
              context = args = null;
            }
      
            return result;
          };
        };
      
        // Returns the first function passed as an argument to the second,
        // allowing you to adjust arguments, run code before and after, and
        // conditionally execute the original function.
        _.wrap = function(func, wrapper) {
          return _.partial(wrapper, func);
        };
      
        // Returns a negated version of the passed-in predicate.
        _.negate = function(predicate) {
          return function() {
            return !predicate.apply(this, arguments);
          };
        };
      
        // Returns a function that is the composition of a list of functions, each
        // consuming the return value of the function that follows.
        _.compose = function() {
          var args = arguments;
          var start = args.length - 1;
          return function() {
            var i = start;
            var result = args[start].apply(this, arguments);
            while (i--) result = args[i].call(this, result);
            return result;
          };
        };
      
        // Returns a function that will only be executed on and after the Nth call.
        _.after = function(times, func) {
          return function() {
            if (--times < 1) {
              return func.apply(this, arguments);
            }
          };
        };
      
        // Returns a function that will only be executed up to (but not including) the Nth call.
        _.before = function(times, func) {
          var memo;
          return function() {
            if (--times > 0) {
              memo = func.apply(this, arguments);
            }
            if (times <= 1) func = null;
            return memo;
          };
        };
      
        // Returns a function that will be executed at most one time, no matter how
        // often you call it. Useful for lazy initialization.
        _.once = _.partial(_.before, 2);
      
        // Object Functions
        // ----------------
      
        // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
        var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
        var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                            'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];
      
        function collectNonEnumProps(obj, keys) {
          var nonEnumIdx = nonEnumerableProps.length;
          var constructor = obj.constructor;
          var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;
      
          // Constructor is a special case.
          var prop = 'constructor';
          if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);
      
          while (nonEnumIdx--) {
            prop = nonEnumerableProps[nonEnumIdx];
            if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
              keys.push(prop);
            }
          }
        }
      
        // Retrieve the names of an object's own properties.
        // Delegates to **ECMAScript 5**'s native `Object.keys`
        _.keys = function(obj) {
          if (!_.isObject(obj)) return [];
          if (nativeKeys) return nativeKeys(obj);
          var keys = [];
          for (var key in obj) if (_.has(obj, key)) keys.push(key);
          // Ahem, IE < 9.
          if (hasEnumBug) collectNonEnumProps(obj, keys);
          return keys;
        };
      
        // Retrieve all the property names of an object.
        _.allKeys = function(obj) {
          if (!_.isObject(obj)) return [];
          var keys = [];
          for (var key in obj) keys.push(key);
          // Ahem, IE < 9.
          if (hasEnumBug) collectNonEnumProps(obj, keys);
          return keys;
        };
      
        // Retrieve the values of an object's properties.
        _.values = function(obj) {
          var keys = _.keys(obj);
          var length = keys.length;
          var values = Array(length);
          for (var i = 0; i < length; i++) {
            values[i] = obj[keys[i]];
          }
          return values;
        };
      
        // Returns the results of applying the iteratee to each element of the object
        // In contrast to _.map it returns an object
        _.mapObject = function(obj, iteratee, context) {
          iteratee = cb(iteratee, context);
          var keys =  _.keys(obj),
                length = keys.length,
                results = {},
                currentKey;
            for (var index = 0; index < length; index++) {
              currentKey = keys[index];
              results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
            }
            return results;
        };
      
        // Convert an object into a list of `[key, value]` pairs.
        _.pairs = function(obj) {
          var keys = _.keys(obj);
          var length = keys.length;
          var pairs = Array(length);
          for (var i = 0; i < length; i++) {
            pairs[i] = [keys[i], obj[keys[i]]];
          }
          return pairs;
        };
      
        // Invert the keys and values of an object. The values must be serializable.
        _.invert = function(obj) {
          var result = {};
          var keys = _.keys(obj);
          for (var i = 0, length = keys.length; i < length; i++) {
            result[obj[keys[i]]] = keys[i];
          }
          return result;
        };
      
        // Return a sorted list of the function names available on the object.
        // Aliased as `methods`
        _.functions = _.methods = function(obj) {
          var names = [];
          for (var key in obj) {
            if (_.isFunction(obj[key])) names.push(key);
          }
          return names.sort();
        };
      
        // Extend a given object with all the properties in passed-in object(s).
        _.extend = createAssigner(_.allKeys);
      
        // Assigns a given object with all the own properties in the passed-in object(s)
        // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
        _.extendOwn = _.assign = createAssigner(_.keys);
      
        // Returns the first key on an object that passes a predicate test
        _.findKey = function(obj, predicate, context) {
          predicate = cb(predicate, context);
          var keys = _.keys(obj), key;
          for (var i = 0, length = keys.length; i < length; i++) {
            key = keys[i];
            if (predicate(obj[key], key, obj)) return key;
          }
        };
      
        // Return a copy of the object only containing the whitelisted properties.
        _.pick = function(object, oiteratee, context) {
          var result = {}, obj = object, iteratee, keys;
          if (obj == null) return result;
          if (_.isFunction(oiteratee)) {
            keys = _.allKeys(obj);
            iteratee = optimizeCb(oiteratee, context);
          } else {
            keys = flatten(arguments, false, false, 1);
            iteratee = function(value, key, obj) { return key in obj; };
            obj = Object(obj);
          }
          for (var i = 0, length = keys.length; i < length; i++) {
            var key = keys[i];
            var value = obj[key];
            if (iteratee(value, key, obj)) result[key] = value;
          }
          return result;
        };
      
         // Return a copy of the object without the blacklisted properties.
        _.omit = function(obj, iteratee, context) {
          if (_.isFunction(iteratee)) {
            iteratee = _.negate(iteratee);
          } else {
            var keys = _.map(flatten(arguments, false, false, 1), String);
            iteratee = function(value, key) {
              return !_.contains(keys, key);
            };
          }
          return _.pick(obj, iteratee, context);
        };
      
        // Fill in a given object with default properties.
        _.defaults = createAssigner(_.allKeys, true);
      
        // Creates an object that inherits from the given prototype object.
        // If additional properties are provided then they will be added to the
        // created object.
        _.create = function(prototype, props) {
          var result = baseCreate(prototype);
          if (props) _.extendOwn(result, props);
          return result;
        };
      
        // Create a (shallow-cloned) duplicate of an object.
        _.clone = function(obj) {
          if (!_.isObject(obj)) return obj;
          return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
        };
      
        // Invokes interceptor with the obj, and then returns obj.
        // The primary purpose of this method is to "tap into" a method chain, in
        // order to perform operations on intermediate results within the chain.
        _.tap = function(obj, interceptor) {
          interceptor(obj);
          return obj;
        };
      
        // Returns whether an object has a given set of `key:value` pairs.
        _.isMatch = function(object, attrs) {
          var keys = _.keys(attrs), length = keys.length;
          if (object == null) return !length;
          var obj = Object(object);
          for (var i = 0; i < length; i++) {
            var key = keys[i];
            if (attrs[key] !== obj[key] || !(key in obj)) return false;
          }
          return true;
        };
      
      
        // Internal recursive comparison function for `isEqual`.
        var eq = function(a, b, aStack, bStack) {
          // Identical objects are equal. `0 === -0`, but they aren't identical.
          // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
          if (a === b) return a !== 0 || 1 / a === 1 / b;
          // A strict comparison is necessary because `null == undefined`.
          if (a == null || b == null) return a === b;
          // Unwrap any wrapped objects.
          if (a instanceof _) a = a._wrapped;
          if (b instanceof _) b = b._wrapped;
          // Compare `[[Class]]` names.
          var className = toString.call(a);
          if (className !== toString.call(b)) return false;
          switch (className) {
            // Strings, numbers, regular expressions, dates, and booleans are compared by value.
            case '[object RegExp]':
            // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
            case '[object String]':
              // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
              // equivalent to `new String("5")`.
              return '' + a === '' + b;
            case '[object Number]':
              // `NaN`s are equivalent, but non-reflexive.
              // Object(NaN) is equivalent to NaN
              if (+a !== +a) return +b !== +b;
              // An `egal` comparison is performed for other numeric values.
              return +a === 0 ? 1 / +a === 1 / b : +a === +b;
            case '[object Date]':
            case '[object Boolean]':
              // Coerce dates and booleans to numeric primitive values. Dates are compared by their
              // millisecond representations. Note that invalid dates with millisecond representations
              // of `NaN` are not equivalent.
              return +a === +b;
          }
      
          var areArrays = className === '[object Array]';
          if (!areArrays) {
            if (typeof a != 'object' || typeof b != 'object') return false;
      
            // Objects with different constructors are not equivalent, but `Object`s or `Array`s
            // from different frames are.
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                                     _.isFunction(bCtor) && bCtor instanceof bCtor)
                                && ('constructor' in a && 'constructor' in b)) {
              return false;
            }
          }
          // Assume equality for cyclic structures. The algorithm for detecting cyclic
          // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
      
          // Initializing stack of traversed objects.
          // It's done here since we only need them for objects and arrays comparison.
          aStack = aStack || [];
          bStack = bStack || [];
          var length = aStack.length;
          while (length--) {
            // Linear search. Performance is inversely proportional to the number of
            // unique nested structures.
            if (aStack[length] === a) return bStack[length] === b;
          }
      
          // Add the first object to the stack of traversed objects.
          aStack.push(a);
          bStack.push(b);
      
          // Recursively compare objects and arrays.
          if (areArrays) {
            // Compare array lengths to determine if a deep comparison is necessary.
            length = a.length;
            if (length !== b.length) return false;
            // Deep compare the contents, ignoring non-numeric properties.
            while (length--) {
              if (!eq(a[length], b[length], aStack, bStack)) return false;
            }
          } else {
            // Deep compare objects.
            var keys = _.keys(a), key;
            length = keys.length;
            // Ensure that both objects contain the same number of properties before comparing deep equality.
            if (_.keys(b).length !== length) return false;
            while (length--) {
              // Deep compare each member
              key = keys[length];
              if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
            }
          }
          // Remove the first object from the stack of traversed objects.
          aStack.pop();
          bStack.pop();
          return true;
        };
      
        // Perform a deep comparison to check if two objects are equal.
        _.isEqual = function(a, b) {
          return eq(a, b);
        };
      
        // Is a given array, string, or object empty?
        // An "empty" object has no enumerable own-properties.
        _.isEmpty = function(obj) {
          if (obj == null) return true;
          if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
          return _.keys(obj).length === 0;
        };
      
        // Is a given value a DOM element?
        _.isElement = function(obj) {
          return !!(obj && obj.nodeType === 1);
        };
      
        // Is a given value an array?
        // Delegates to ECMA5's native Array.isArray
        _.isArray = nativeIsArray || function(obj) {
          return toString.call(obj) === '[object Array]';
        };
      
        // Is a given variable an object?
        _.isObject = function(obj) {
          var type = typeof obj;
          return type === 'function' || type === 'object' && !!obj;
        };
      
        // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
        _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
          _['is' + name] = function(obj) {
            return toString.call(obj) === '[object ' + name + ']';
          };
        });
      
        // Define a fallback version of the method in browsers (ahem, IE < 9), where
        // there isn't any inspectable "Arguments" type.
        if (!_.isArguments(arguments)) {
          _.isArguments = function(obj) {
            return _.has(obj, 'callee');
          };
        }
      
        // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
        // IE 11 (#1621), and in Safari 8 (#1929).
        if (typeof /./ != 'function' && typeof Int8Array != 'object') {
          _.isFunction = function(obj) {
            return typeof obj == 'function' || false;
          };
        }
      
        // Is a given object a finite number?
        _.isFinite = function(obj) {
          return isFinite(obj) && !isNaN(parseFloat(obj));
        };
      
        // Is the given value `NaN`? (NaN is the only number which does not equal itself).
        _.isNaN = function(obj) {
          return _.isNumber(obj) && obj !== +obj;
        };
      
        // Is a given value a boolean?
        _.isBoolean = function(obj) {
          return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
        };
      
        // Is a given value equal to null?
        _.isNull = function(obj) {
          return obj === null;
        };
      
        // Is a given variable undefined?
        _.isUndefined = function(obj) {
          return obj === void 0;
        };
      
        // Shortcut function for checking if an object has a given property directly
        // on itself (in other words, not on a prototype).
        _.has = function(obj, key) {
          return obj != null && hasOwnProperty.call(obj, key);
        };
      
        // Utility Functions
        // -----------------
      
        // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
        // previous owner. Returns a reference to the Underscore object.
        _.noConflict = function() {
          root._ = previousUnderscore;
          return this;
        };
      
        // Keep the identity function around for default iteratees.
        _.identity = function(value) {
          return value;
        };
      
        // Predicate-generating functions. Often useful outside of Underscore.
        _.constant = function(value) {
          return function() {
            return value;
          };
        };
      
        _.noop = function(){};
      
        _.property = property;
      
        // Generates a function for a given object that returns a given property.
        _.propertyOf = function(obj) {
          return obj == null ? function(){} : function(key) {
            return obj[key];
          };
        };
      
        // Returns a predicate for checking whether an object has a given set of
        // `key:value` pairs.
        _.matcher = _.matches = function(attrs) {
          attrs = _.extendOwn({}, attrs);
          return function(obj) {
            return _.isMatch(obj, attrs);
          };
        };
      
        // Run a function **n** times.
        _.times = function(n, iteratee, context) {
          var accum = Array(Math.max(0, n));
          iteratee = optimizeCb(iteratee, context, 1);
          for (var i = 0; i < n; i++) accum[i] = iteratee(i);
          return accum;
        };
      
        // Return a random integer between min and max (inclusive).
        _.random = function(min, max) {
          if (max == null) {
            max = min;
            min = 0;
          }
          return min + Math.floor(Math.random() * (max - min + 1));
        };
      
        // A (possibly faster) way to get the current timestamp as an integer.
        _.now = Date.now || function() {
          return new Date().getTime();
        };
      
         // List of HTML entities for escaping.
        var escapeMap = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '`': '&#x60;'
        };
        var unescapeMap = _.invert(escapeMap);
      
        // Functions for escaping and unescaping strings to/from HTML interpolation.
        var createEscaper = function(map) {
          var escaper = function(match) {
            return map[match];
          };
          // Regexes for identifying a key that needs to be escaped
          var source = '(?:' + _.keys(map).join('|') + ')';
          var testRegexp = RegExp(source);
          var replaceRegexp = RegExp(source, 'g');
          return function(string) {
            string = string == null ? '' : '' + string;
            return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
          };
        };
        _.escape = createEscaper(escapeMap);
        _.unescape = createEscaper(unescapeMap);
      
        // If the value of the named `property` is a function then invoke it with the
        // `object` as context; otherwise, return it.
        _.result = function(object, property, fallback) {
          var value = object == null ? void 0 : object[property];
          if (value === void 0) {
            value = fallback;
          }
          return _.isFunction(value) ? value.call(object) : value;
        };
      
        // Generate a unique integer id (unique within the entire client session).
        // Useful for temporary DOM ids.
        var idCounter = 0;
        _.uniqueId = function(prefix) {
          var id = ++idCounter + '';
          return prefix ? prefix + id : id;
        };
      
        // By default, Underscore uses ERB-style template delimiters, change the
        // following template settings to use alternative delimiters.
        _.templateSettings = {
          evaluate    : /<%([\s\S]+?)%>/g,
          interpolate : /<%=([\s\S]+?)%>/g,
          escape      : /<%-([\s\S]+?)%>/g
        };
      
        // When customizing `templateSettings`, if you don't want to define an
        // interpolation, evaluation or escaping regex, we need one that is
        // guaranteed not to match.
        var noMatch = /(.)^/;
      
        // Certain characters need to be escaped so that they can be put into a
        // string literal.
        var escapes = {
          "'":      "'",
          '\\':     '\\',
          '\r':     'r',
          '\n':     'n',
          '\u2028': 'u2028',
          '\u2029': 'u2029'
        };
      
        var escaper = /\\|'|\r|\n|\u2028|\u2029/g;
      
        var escapeChar = function(match) {
          return '\\' + escapes[match];
        };
      
        // JavaScript micro-templating, similar to John Resig's implementation.
        // Underscore templating handles arbitrary delimiters, preserves whitespace,
        // and correctly escapes quotes within interpolated code.
        // NB: `oldSettings` only exists for backwards compatibility.
        _.template = function(text, settings, oldSettings) {
          if (!settings && oldSettings) settings = oldSettings;
          settings = _.defaults({}, settings, _.templateSettings);
      
          // Combine delimiters into one regular expression via alternation.
          var matcher = RegExp([
            (settings.escape || noMatch).source,
            (settings.interpolate || noMatch).source,
            (settings.evaluate || noMatch).source
          ].join('|') + '|$', 'g');
      
          // Compile the template source, escaping string literals appropriately.
          var index = 0;
          var source = "__p+='";
          text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
            source += text.slice(index, offset).replace(escaper, escapeChar);
            index = offset + match.length;
      
            if (escape) {
              source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
            } else if (interpolate) {
              source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
            } else if (evaluate) {
              source += "';\n" + evaluate + "\n__p+='";
            }
      
            // Adobe VMs need the match returned to produce the correct offest.
            return match;
          });
          source += "';\n";
      
          // If a variable is not specified, place data values in local scope.
          if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';
      
          source = "var __t,__p='',__j=Array.prototype.join," +
            "print=function(){__p+=__j.call(arguments,'');};\n" +
            source + 'return __p;\n';
      
          try {
            var render = new Function(settings.variable || 'obj', '_', source);
          } catch (e) {
            e.source = source;
            throw e;
          }
      
          var template = function(data) {
            return render.call(this, data, _);
          };
      
          // Provide the compiled source as a convenience for precompilation.
          var argument = settings.variable || 'obj';
          template.source = 'function(' + argument + '){\n' + source + '}';
      
          return template;
        };
      
        // Add a "chain" function. Start chaining a wrapped Underscore object.
        _.chain = function(obj) {
          var instance = _(obj);
          instance._chain = true;
          return instance;
        };
      
        // OOP
        // ---------------
        // If Underscore is called as a function, it returns a wrapped object that
        // can be used OO-style. This wrapper holds altered versions of all the
        // underscore functions. Wrapped objects may be chained.
      
        // Helper function to continue chaining intermediate results.
        var result = function(instance, obj) {
          return instance._chain ? _(obj).chain() : obj;
        };
      
        // Add your own custom functions to the Underscore object.
        _.mixin = function(obj) {
          _.each(_.functions(obj), function(name) {
            var func = _[name] = obj[name];
            _.prototype[name] = function() {
              var args = [this._wrapped];
              push.apply(args, arguments);
              return result(this, func.apply(_, args));
            };
          });
        };
      
        // Add all of the Underscore functions to the wrapper object.
        _.mixin(_);
      
        // Add all mutator Array functions to the wrapper.
        _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
          var method = ArrayProto[name];
          _.prototype[name] = function() {
            var obj = this._wrapped;
            method.apply(obj, arguments);
            if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
            return result(this, obj);
          };
        });
      
        // Add all accessor Array functions to the wrapper.
        _.each(['concat', 'join', 'slice'], function(name) {
          var method = ArrayProto[name];
          _.prototype[name] = function() {
            return result(this, method.apply(this._wrapped, arguments));
          };
        });
      
        // Extracts the result from a wrapped and chained object.
        _.prototype.value = function() {
          return this._wrapped;
        };
      
        // Provide unwrapping proxy for some methods used in engine operations
        // such as arithmetic and JSON stringification.
        _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;
      
        _.prototype.toString = function() {
          return '' + this._wrapped;
        };
      
        // AMD registration happens at the end for compatibility with AMD loaders
        // that may not enforce next-turn semantics on modules. Even though general
        // practice for AMD registration is to be anonymous, underscore registers
        // as a named module because, like jQuery, it is a base library that is
        // popular enough to be bundled in a third party lib, but not be part of
        // an AMD load request. Those cases could generate an error when an
        // anonymous define() is called outside of a loader request.
        if (typeof define === 'function' && define.amd) {
          define('underscore', [], function() {
            return _;
          });
        }
      }.call(this));
      
    },
    'underscore-min': function (module, exports, require, global) {
      //     Underscore.js 1.8.3
      //     http://underscorejs.org
      //     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
      //     Underscore may be freely distributed under the MIT license.
      (function(){function n(n){function t(t,r,e,u,i,o){for(;i>=0&&o>i;i+=n){var a=u?u[i]:i;e=r(e,t[a],a,t)}return e}return function(r,e,u,i){e=b(e,i,4);var o=!k(r)&&m.keys(r),a=(o||r).length,c=n>0?0:a-1;return arguments.length<3&&(u=r[o?o[c]:c],c+=n),t(r,e,u,o,c,a)}}function t(n){return function(t,r,e){r=x(r,e);for(var u=O(t),i=n>0?0:u-1;i>=0&&u>i;i+=n)if(r(t[i],i,t))return i;return-1}}function r(n,t,r){return function(e,u,i){var o=0,a=O(e);if("number"==typeof i)n>0?o=i>=0?i:Math.max(i+a,o):a=i>=0?Math.min(i+1,a):i+a+1;else if(r&&i&&a)return i=r(e,u),e[i]===u?i:-1;if(u!==u)return i=t(l.call(e,o,a),m.isNaN),i>=0?i+o:-1;for(i=n>0?o:a-1;i>=0&&a>i;i+=n)if(e[i]===u)return i;return-1}}function e(n,t){var r=I.length,e=n.constructor,u=m.isFunction(e)&&e.prototype||a,i="constructor";for(m.has(n,i)&&!m.contains(t,i)&&t.push(i);r--;)i=I[r],i in n&&n[i]!==u[i]&&!m.contains(t,i)&&t.push(i)}var u=this,i=u._,o=Array.prototype,a=Object.prototype,c=Function.prototype,f=o.push,l=o.slice,s=a.toString,p=a.hasOwnProperty,h=Array.isArray,v=Object.keys,g=c.bind,y=Object.create,d=function(){},m=function(n){return n instanceof m?n:this instanceof m?void(this._wrapped=n):new m(n)};"undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=m),exports._=m):u._=m,m.VERSION="1.8.3";var b=function(n,t,r){if(t===void 0)return n;switch(null==r?3:r){case 1:return function(r){return n.call(t,r)};case 2:return function(r,e){return n.call(t,r,e)};case 3:return function(r,e,u){return n.call(t,r,e,u)};case 4:return function(r,e,u,i){return n.call(t,r,e,u,i)}}return function(){return n.apply(t,arguments)}},x=function(n,t,r){return null==n?m.identity:m.isFunction(n)?b(n,t,r):m.isObject(n)?m.matcher(n):m.property(n)};m.iteratee=function(n,t){return x(n,t,1/0)};var _=function(n,t){return function(r){var e=arguments.length;if(2>e||null==r)return r;for(var u=1;e>u;u++)for(var i=arguments[u],o=n(i),a=o.length,c=0;a>c;c++){var f=o[c];t&&r[f]!==void 0||(r[f]=i[f])}return r}},j=function(n){if(!m.isObject(n))return{};if(y)return y(n);d.prototype=n;var t=new d;return d.prototype=null,t},w=function(n){return function(t){return null==t?void 0:t[n]}},A=Math.pow(2,53)-1,O=w("length"),k=function(n){var t=O(n);return"number"==typeof t&&t>=0&&A>=t};m.each=m.forEach=function(n,t,r){t=b(t,r);var e,u;if(k(n))for(e=0,u=n.length;u>e;e++)t(n[e],e,n);else{var i=m.keys(n);for(e=0,u=i.length;u>e;e++)t(n[i[e]],i[e],n)}return n},m.map=m.collect=function(n,t,r){t=x(t,r);for(var e=!k(n)&&m.keys(n),u=(e||n).length,i=Array(u),o=0;u>o;o++){var a=e?e[o]:o;i[o]=t(n[a],a,n)}return i},m.reduce=m.foldl=m.inject=n(1),m.reduceRight=m.foldr=n(-1),m.find=m.detect=function(n,t,r){var e;return e=k(n)?m.findIndex(n,t,r):m.findKey(n,t,r),e!==void 0&&e!==-1?n[e]:void 0},m.filter=m.select=function(n,t,r){var e=[];return t=x(t,r),m.each(n,function(n,r,u){t(n,r,u)&&e.push(n)}),e},m.reject=function(n,t,r){return m.filter(n,m.negate(x(t)),r)},m.every=m.all=function(n,t,r){t=x(t,r);for(var e=!k(n)&&m.keys(n),u=(e||n).length,i=0;u>i;i++){var o=e?e[i]:i;if(!t(n[o],o,n))return!1}return!0},m.some=m.any=function(n,t,r){t=x(t,r);for(var e=!k(n)&&m.keys(n),u=(e||n).length,i=0;u>i;i++){var o=e?e[i]:i;if(t(n[o],o,n))return!0}return!1},m.contains=m.includes=m.include=function(n,t,r,e){return k(n)||(n=m.values(n)),("number"!=typeof r||e)&&(r=0),m.indexOf(n,t,r)>=0},m.invoke=function(n,t){var r=l.call(arguments,2),e=m.isFunction(t);return m.map(n,function(n){var u=e?t:n[t];return null==u?u:u.apply(n,r)})},m.pluck=function(n,t){return m.map(n,m.property(t))},m.where=function(n,t){return m.filter(n,m.matcher(t))},m.findWhere=function(n,t){return m.find(n,m.matcher(t))},m.max=function(n,t,r){var e,u,i=-1/0,o=-1/0;if(null==t&&null!=n){n=k(n)?n:m.values(n);for(var a=0,c=n.length;c>a;a++)e=n[a],e>i&&(i=e)}else t=x(t,r),m.each(n,function(n,r,e){u=t(n,r,e),(u>o||u===-1/0&&i===-1/0)&&(i=n,o=u)});return i},m.min=function(n,t,r){var e,u,i=1/0,o=1/0;if(null==t&&null!=n){n=k(n)?n:m.values(n);for(var a=0,c=n.length;c>a;a++)e=n[a],i>e&&(i=e)}else t=x(t,r),m.each(n,function(n,r,e){u=t(n,r,e),(o>u||1/0===u&&1/0===i)&&(i=n,o=u)});return i},m.shuffle=function(n){for(var t,r=k(n)?n:m.values(n),e=r.length,u=Array(e),i=0;e>i;i++)t=m.random(0,i),t!==i&&(u[i]=u[t]),u[t]=r[i];return u},m.sample=function(n,t,r){return null==t||r?(k(n)||(n=m.values(n)),n[m.random(n.length-1)]):m.shuffle(n).slice(0,Math.max(0,t))},m.sortBy=function(n,t,r){return t=x(t,r),m.pluck(m.map(n,function(n,r,e){return{value:n,index:r,criteria:t(n,r,e)}}).sort(function(n,t){var r=n.criteria,e=t.criteria;if(r!==e){if(r>e||r===void 0)return 1;if(e>r||e===void 0)return-1}return n.index-t.index}),"value")};var F=function(n){return function(t,r,e){var u={};return r=x(r,e),m.each(t,function(e,i){var o=r(e,i,t);n(u,e,o)}),u}};m.groupBy=F(function(n,t,r){m.has(n,r)?n[r].push(t):n[r]=[t]}),m.indexBy=F(function(n,t,r){n[r]=t}),m.countBy=F(function(n,t,r){m.has(n,r)?n[r]++:n[r]=1}),m.toArray=function(n){return n?m.isArray(n)?l.call(n):k(n)?m.map(n,m.identity):m.values(n):[]},m.size=function(n){return null==n?0:k(n)?n.length:m.keys(n).length},m.partition=function(n,t,r){t=x(t,r);var e=[],u=[];return m.each(n,function(n,r,i){(t(n,r,i)?e:u).push(n)}),[e,u]},m.first=m.head=m.take=function(n,t,r){return null==n?void 0:null==t||r?n[0]:m.initial(n,n.length-t)},m.initial=function(n,t,r){return l.call(n,0,Math.max(0,n.length-(null==t||r?1:t)))},m.last=function(n,t,r){return null==n?void 0:null==t||r?n[n.length-1]:m.rest(n,Math.max(0,n.length-t))},m.rest=m.tail=m.drop=function(n,t,r){return l.call(n,null==t||r?1:t)},m.compact=function(n){return m.filter(n,m.identity)};var S=function(n,t,r,e){for(var u=[],i=0,o=e||0,a=O(n);a>o;o++){var c=n[o];if(k(c)&&(m.isArray(c)||m.isArguments(c))){t||(c=S(c,t,r));var f=0,l=c.length;for(u.length+=l;l>f;)u[i++]=c[f++]}else r||(u[i++]=c)}return u};m.flatten=function(n,t){return S(n,t,!1)},m.without=function(n){return m.difference(n,l.call(arguments,1))},m.uniq=m.unique=function(n,t,r,e){m.isBoolean(t)||(e=r,r=t,t=!1),null!=r&&(r=x(r,e));for(var u=[],i=[],o=0,a=O(n);a>o;o++){var c=n[o],f=r?r(c,o,n):c;t?(o&&i===f||u.push(c),i=f):r?m.contains(i,f)||(i.push(f),u.push(c)):m.contains(u,c)||u.push(c)}return u},m.union=function(){return m.uniq(S(arguments,!0,!0))},m.intersection=function(n){for(var t=[],r=arguments.length,e=0,u=O(n);u>e;e++){var i=n[e];if(!m.contains(t,i)){for(var o=1;r>o&&m.contains(arguments[o],i);o++);o===r&&t.push(i)}}return t},m.difference=function(n){var t=S(arguments,!0,!0,1);return m.filter(n,function(n){return!m.contains(t,n)})},m.zip=function(){return m.unzip(arguments)},m.unzip=function(n){for(var t=n&&m.max(n,O).length||0,r=Array(t),e=0;t>e;e++)r[e]=m.pluck(n,e);return r},m.object=function(n,t){for(var r={},e=0,u=O(n);u>e;e++)t?r[n[e]]=t[e]:r[n[e][0]]=n[e][1];return r},m.findIndex=t(1),m.findLastIndex=t(-1),m.sortedIndex=function(n,t,r,e){r=x(r,e,1);for(var u=r(t),i=0,o=O(n);o>i;){var a=Math.floor((i+o)/2);r(n[a])<u?i=a+1:o=a}return i},m.indexOf=r(1,m.findIndex,m.sortedIndex),m.lastIndexOf=r(-1,m.findLastIndex),m.range=function(n,t,r){null==t&&(t=n||0,n=0),r=r||1;for(var e=Math.max(Math.ceil((t-n)/r),0),u=Array(e),i=0;e>i;i++,n+=r)u[i]=n;return u};var E=function(n,t,r,e,u){if(!(e instanceof t))return n.apply(r,u);var i=j(n.prototype),o=n.apply(i,u);return m.isObject(o)?o:i};m.bind=function(n,t){if(g&&n.bind===g)return g.apply(n,l.call(arguments,1));if(!m.isFunction(n))throw new TypeError("Bind must be called on a function");var r=l.call(arguments,2),e=function(){return E(n,e,t,this,r.concat(l.call(arguments)))};return e},m.partial=function(n){var t=l.call(arguments,1),r=function(){for(var e=0,u=t.length,i=Array(u),o=0;u>o;o++)i[o]=t[o]===m?arguments[e++]:t[o];for(;e<arguments.length;)i.push(arguments[e++]);return E(n,r,this,this,i)};return r},m.bindAll=function(n){var t,r,e=arguments.length;if(1>=e)throw new Error("bindAll must be passed function names");for(t=1;e>t;t++)r=arguments[t],n[r]=m.bind(n[r],n);return n},m.memoize=function(n,t){var r=function(e){var u=r.cache,i=""+(t?t.apply(this,arguments):e);return m.has(u,i)||(u[i]=n.apply(this,arguments)),u[i]};return r.cache={},r},m.delay=function(n,t){var r=l.call(arguments,2);return setTimeout(function(){return n.apply(null,r)},t)},m.defer=m.partial(m.delay,m,1),m.throttle=function(n,t,r){var e,u,i,o=null,a=0;r||(r={});var c=function(){a=r.leading===!1?0:m.now(),o=null,i=n.apply(e,u),o||(e=u=null)};return function(){var f=m.now();a||r.leading!==!1||(a=f);var l=t-(f-a);return e=this,u=arguments,0>=l||l>t?(o&&(clearTimeout(o),o=null),a=f,i=n.apply(e,u),o||(e=u=null)):o||r.trailing===!1||(o=setTimeout(c,l)),i}},m.debounce=function(n,t,r){var e,u,i,o,a,c=function(){var f=m.now()-o;t>f&&f>=0?e=setTimeout(c,t-f):(e=null,r||(a=n.apply(i,u),e||(i=u=null)))};return function(){i=this,u=arguments,o=m.now();var f=r&&!e;return e||(e=setTimeout(c,t)),f&&(a=n.apply(i,u),i=u=null),a}},m.wrap=function(n,t){return m.partial(t,n)},m.negate=function(n){return function(){return!n.apply(this,arguments)}},m.compose=function(){var n=arguments,t=n.length-1;return function(){for(var r=t,e=n[t].apply(this,arguments);r--;)e=n[r].call(this,e);return e}},m.after=function(n,t){return function(){return--n<1?t.apply(this,arguments):void 0}},m.before=function(n,t){var r;return function(){return--n>0&&(r=t.apply(this,arguments)),1>=n&&(t=null),r}},m.once=m.partial(m.before,2);var M=!{toString:null}.propertyIsEnumerable("toString"),I=["valueOf","isPrototypeOf","toString","propertyIsEnumerable","hasOwnProperty","toLocaleString"];m.keys=function(n){if(!m.isObject(n))return[];if(v)return v(n);var t=[];for(var r in n)m.has(n,r)&&t.push(r);return M&&e(n,t),t},m.allKeys=function(n){if(!m.isObject(n))return[];var t=[];for(var r in n)t.push(r);return M&&e(n,t),t},m.values=function(n){for(var t=m.keys(n),r=t.length,e=Array(r),u=0;r>u;u++)e[u]=n[t[u]];return e},m.mapObject=function(n,t,r){t=x(t,r);for(var e,u=m.keys(n),i=u.length,o={},a=0;i>a;a++)e=u[a],o[e]=t(n[e],e,n);return o},m.pairs=function(n){for(var t=m.keys(n),r=t.length,e=Array(r),u=0;r>u;u++)e[u]=[t[u],n[t[u]]];return e},m.invert=function(n){for(var t={},r=m.keys(n),e=0,u=r.length;u>e;e++)t[n[r[e]]]=r[e];return t},m.functions=m.methods=function(n){var t=[];for(var r in n)m.isFunction(n[r])&&t.push(r);return t.sort()},m.extend=_(m.allKeys),m.extendOwn=m.assign=_(m.keys),m.findKey=function(n,t,r){t=x(t,r);for(var e,u=m.keys(n),i=0,o=u.length;o>i;i++)if(e=u[i],t(n[e],e,n))return e},m.pick=function(n,t,r){var e,u,i={},o=n;if(null==o)return i;m.isFunction(t)?(u=m.allKeys(o),e=b(t,r)):(u=S(arguments,!1,!1,1),e=function(n,t,r){return t in r},o=Object(o));for(var a=0,c=u.length;c>a;a++){var f=u[a],l=o[f];e(l,f,o)&&(i[f]=l)}return i},m.omit=function(n,t,r){if(m.isFunction(t))t=m.negate(t);else{var e=m.map(S(arguments,!1,!1,1),String);t=function(n,t){return!m.contains(e,t)}}return m.pick(n,t,r)},m.defaults=_(m.allKeys,!0),m.create=function(n,t){var r=j(n);return t&&m.extendOwn(r,t),r},m.clone=function(n){return m.isObject(n)?m.isArray(n)?n.slice():m.extend({},n):n},m.tap=function(n,t){return t(n),n},m.isMatch=function(n,t){var r=m.keys(t),e=r.length;if(null==n)return!e;for(var u=Object(n),i=0;e>i;i++){var o=r[i];if(t[o]!==u[o]||!(o in u))return!1}return!0};var N=function(n,t,r,e){if(n===t)return 0!==n||1/n===1/t;if(null==n||null==t)return n===t;n instanceof m&&(n=n._wrapped),t instanceof m&&(t=t._wrapped);var u=s.call(n);if(u!==s.call(t))return!1;switch(u){case"[object RegExp]":case"[object String]":return""+n==""+t;case"[object Number]":return+n!==+n?+t!==+t:0===+n?1/+n===1/t:+n===+t;case"[object Date]":case"[object Boolean]":return+n===+t}var i="[object Array]"===u;if(!i){if("object"!=typeof n||"object"!=typeof t)return!1;var o=n.constructor,a=t.constructor;if(o!==a&&!(m.isFunction(o)&&o instanceof o&&m.isFunction(a)&&a instanceof a)&&"constructor"in n&&"constructor"in t)return!1}r=r||[],e=e||[];for(var c=r.length;c--;)if(r[c]===n)return e[c]===t;if(r.push(n),e.push(t),i){if(c=n.length,c!==t.length)return!1;for(;c--;)if(!N(n[c],t[c],r,e))return!1}else{var f,l=m.keys(n);if(c=l.length,m.keys(t).length!==c)return!1;for(;c--;)if(f=l[c],!m.has(t,f)||!N(n[f],t[f],r,e))return!1}return r.pop(),e.pop(),!0};m.isEqual=function(n,t){return N(n,t)},m.isEmpty=function(n){return null==n?!0:k(n)&&(m.isArray(n)||m.isString(n)||m.isArguments(n))?0===n.length:0===m.keys(n).length},m.isElement=function(n){return!(!n||1!==n.nodeType)},m.isArray=h||function(n){return"[object Array]"===s.call(n)},m.isObject=function(n){var t=typeof n;return"function"===t||"object"===t&&!!n},m.each(["Arguments","Function","String","Number","Date","RegExp","Error"],function(n){m["is"+n]=function(t){return s.call(t)==="[object "+n+"]"}}),m.isArguments(arguments)||(m.isArguments=function(n){return m.has(n,"callee")}),"function"!=typeof/./&&"object"!=typeof Int8Array&&(m.isFunction=function(n){return"function"==typeof n||!1}),m.isFinite=function(n){return isFinite(n)&&!isNaN(parseFloat(n))},m.isNaN=function(n){return m.isNumber(n)&&n!==+n},m.isBoolean=function(n){return n===!0||n===!1||"[object Boolean]"===s.call(n)},m.isNull=function(n){return null===n},m.isUndefined=function(n){return n===void 0},m.has=function(n,t){return null!=n&&p.call(n,t)},m.noConflict=function(){return u._=i,this},m.identity=function(n){return n},m.constant=function(n){return function(){return n}},m.noop=function(){},m.property=w,m.propertyOf=function(n){return null==n?function(){}:function(t){return n[t]}},m.matcher=m.matches=function(n){return n=m.extendOwn({},n),function(t){return m.isMatch(t,n)}},m.times=function(n,t,r){var e=Array(Math.max(0,n));t=b(t,r,1);for(var u=0;n>u;u++)e[u]=t(u);return e},m.random=function(n,t){return null==t&&(t=n,n=0),n+Math.floor(Math.random()*(t-n+1))},m.now=Date.now||function(){return(new Date).getTime()};var B={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"},T=m.invert(B),R=function(n){var t=function(t){return n[t]},r="(?:"+m.keys(n).join("|")+")",e=RegExp(r),u=RegExp(r,"g");return function(n){return n=null==n?"":""+n,e.test(n)?n.replace(u,t):n}};m.escape=R(B),m.unescape=R(T),m.result=function(n,t,r){var e=null==n?void 0:n[t];return e===void 0&&(e=r),m.isFunction(e)?e.call(n):e};var q=0;m.uniqueId=function(n){var t=++q+"";return n?n+t:t},m.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var K=/(.)^/,z={"'":"'","\\":"\\","\r":"r","\n":"n","\u2028":"u2028","\u2029":"u2029"},D=/\\|'|\r|\n|\u2028|\u2029/g,L=function(n){return"\\"+z[n]};m.template=function(n,t,r){!t&&r&&(t=r),t=m.defaults({},t,m.templateSettings);var e=RegExp([(t.escape||K).source,(t.interpolate||K).source,(t.evaluate||K).source].join("|")+"|$","g"),u=0,i="__p+='";n.replace(e,function(t,r,e,o,a){return i+=n.slice(u,a).replace(D,L),u=a+t.length,r?i+="'+\n((__t=("+r+"))==null?'':_.escape(__t))+\n'":e?i+="'+\n((__t=("+e+"))==null?'':__t)+\n'":o&&(i+="';\n"+o+"\n__p+='"),t}),i+="';\n",t.variable||(i="with(obj||{}){\n"+i+"}\n"),i="var __t,__p='',__j=Array.prototype.join,"+"print=function(){__p+=__j.call(arguments,'');};\n"+i+"return __p;\n";try{var o=new Function(t.variable||"obj","_",i)}catch(a){throw a.source=i,a}var c=function(n){return o.call(this,n,m)},f=t.variable||"obj";return c.source="function("+f+"){\n"+i+"}",c},m.chain=function(n){var t=m(n);return t._chain=!0,t};var P=function(n,t){return n._chain?m(t).chain():t};m.mixin=function(n){m.each(m.functions(n),function(t){var r=m[t]=n[t];m.prototype[t]=function(){var n=[this._wrapped];return f.apply(n,arguments),P(this,r.apply(m,n))}})},m.mixin(m),m.each(["pop","push","reverse","shift","sort","splice","unshift"],function(n){var t=o[n];m.prototype[n]=function(){var r=this._wrapped;return t.apply(r,arguments),"shift"!==n&&"splice"!==n||0!==r.length||delete r[0],P(this,r)}}),m.each(["concat","join","slice"],function(n){var t=o[n];m.prototype[n]=function(){return P(this,t.apply(this._wrapped,arguments))}}),m.prototype.value=function(){return this._wrapped},m.prototype.valueOf=m.prototype.toJSON=m.prototype.value,m.prototype.toString=function(){return""+this._wrapped},"function"==typeof define&&define.amd&&define("underscore",[],function(){return m})}).call(this);
      //# sourceMappingURL=underscore-min.map
    }
  }, 'underscore');

  Module.createPackage('backbone', {
    'backbone': function (module, exports, require, global) {
      //     Backbone.js 1.2.3
      
      //     (c) 2010-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
      //     Backbone may be freely distributed under the MIT license.
      //     For all details and documentation:
      //     http://backbonejs.org
      
      (function(factory) {
      
        // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
        // We use `self` instead of `window` for `WebWorker` support.
        var root = (typeof self == 'object' && self.self == self && self) ||
                  (typeof global == 'object' && global.global == global && global);
      
        // Set up Backbone appropriately for the environment. Start with AMD.
        if (typeof define === 'function' && define.amd) {
          define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
            // Export global even in AMD case in case this script is loaded with
            // others that may still expect a global Backbone.
            root.Backbone = factory(root, exports, _, $);
          });
      
        // Next for Node.js or CommonJS. jQuery may not be needed as a module.
        } else if (typeof exports !== 'undefined') {
          var _ = require('underscore'), $;
          try { $ = require('jquery'); } catch(e) {}
          factory(root, exports, _, $);
      
        // Finally, as a browser global.
        } else {
          root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
        }
      
      }(function(root, Backbone, _, $) {
      
        // Initial Setup
        // -------------
      
        // Save the previous value of the `Backbone` variable, so that it can be
        // restored later on, if `noConflict` is used.
        var previousBackbone = root.Backbone;
      
        // Create a local reference to a common array method we'll want to use later.
        var slice = Array.prototype.slice;
      
        // Current version of the library. Keep in sync with `package.json`.
        Backbone.VERSION = '1.2.3';
      
        // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
        // the `$` variable.
        Backbone.$ = $;
      
        // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
        // to its previous owner. Returns a reference to this Backbone object.
        Backbone.noConflict = function() {
          root.Backbone = previousBackbone;
          return this;
        };
      
        // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
        // will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
        // set a `X-Http-Method-Override` header.
        Backbone.emulateHTTP = false;
      
        // Turn on `emulateJSON` to support legacy servers that can't deal with direct
        // `application/json` requests ... this will encode the body as
        // `application/x-www-form-urlencoded` instead and will send the model in a
        // form param named `model`.
        Backbone.emulateJSON = false;
      
        // Proxy Backbone class methods to Underscore functions, wrapping the model's
        // `attributes` object or collection's `models` array behind the scenes.
        //
        // collection.filter(function(model) { return model.get('age') > 10 });
        // collection.each(this.addView);
        //
        // `Function#apply` can be slow so we use the method's arg count, if we know it.
        var addMethod = function(length, method, attribute) {
          switch (length) {
            case 1: return function() {
              return _[method](this[attribute]);
            };
            case 2: return function(value) {
              return _[method](this[attribute], value);
            };
            case 3: return function(iteratee, context) {
              return _[method](this[attribute], cb(iteratee, this), context);
            };
            case 4: return function(iteratee, defaultVal, context) {
              return _[method](this[attribute], cb(iteratee, this), defaultVal, context);
            };
            default: return function() {
              var args = slice.call(arguments);
              args.unshift(this[attribute]);
              return _[method].apply(_, args);
            };
          }
        };
        var addUnderscoreMethods = function(Class, methods, attribute) {
          _.each(methods, function(length, method) {
            if (_[method]) Class.prototype[method] = addMethod(length, method, attribute);
          });
        };
      
        // Support `collection.sortBy('attr')` and `collection.findWhere({id: 1})`.
        var cb = function(iteratee, instance) {
          if (_.isFunction(iteratee)) return iteratee;
          if (_.isObject(iteratee) && !instance._isModel(iteratee)) return modelMatcher(iteratee);
          if (_.isString(iteratee)) return function(model) { return model.get(iteratee); };
          return iteratee;
        };
        var modelMatcher = function(attrs) {
          var matcher = _.matches(attrs);
          return function(model) {
            return matcher(model.attributes);
          };
        };
      
        // Backbone.Events
        // ---------------
      
        // A module that can be mixed in to *any object* in order to provide it with
        // a custom event channel. You may bind a callback to an event with `on` or
        // remove with `off`; `trigger`-ing an event fires all callbacks in
        // succession.
        //
        //     var object = {};
        //     _.extend(object, Backbone.Events);
        //     object.on('expand', function(){ alert('expanded'); });
        //     object.trigger('expand');
        //
        var Events = Backbone.Events = {};
      
        // Regular expression used to split event strings.
        var eventSplitter = /\s+/;
      
        // Iterates over the standard `event, callback` (as well as the fancy multiple
        // space-separated events `"change blur", callback` and jQuery-style event
        // maps `{event: callback}`).
        var eventsApi = function(iteratee, events, name, callback, opts) {
          var i = 0, names;
          if (name && typeof name === 'object') {
            // Handle event maps.
            if (callback !== void 0 && 'context' in opts && opts.context === void 0) opts.context = callback;
            for (names = _.keys(name); i < names.length ; i++) {
              events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
            }
          } else if (name && eventSplitter.test(name)) {
            // Handle space separated event names by delegating them individually.
            for (names = name.split(eventSplitter); i < names.length; i++) {
              events = iteratee(events, names[i], callback, opts);
            }
          } else {
            // Finally, standard events.
            events = iteratee(events, name, callback, opts);
          }
          return events;
        };
      
        // Bind an event to a `callback` function. Passing `"all"` will bind
        // the callback to all events fired.
        Events.on = function(name, callback, context) {
          return internalOn(this, name, callback, context);
        };
      
        // Guard the `listening` argument from the public API.
        var internalOn = function(obj, name, callback, context, listening) {
          obj._events = eventsApi(onApi, obj._events || {}, name, callback, {
              context: context,
              ctx: obj,
              listening: listening
          });
      
          if (listening) {
            var listeners = obj._listeners || (obj._listeners = {});
            listeners[listening.id] = listening;
          }
      
          return obj;
        };
      
        // Inversion-of-control versions of `on`. Tell *this* object to listen to
        // an event in another object... keeping track of what it's listening to
        // for easier unbinding later.
        Events.listenTo =  function(obj, name, callback) {
          if (!obj) return this;
          var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
          var listeningTo = this._listeningTo || (this._listeningTo = {});
          var listening = listeningTo[id];
      
          // This object is not listening to any other events on `obj` yet.
          // Setup the necessary references to track the listening callbacks.
          if (!listening) {
            var thisId = this._listenId || (this._listenId = _.uniqueId('l'));
            listening = listeningTo[id] = {obj: obj, objId: id, id: thisId, listeningTo: listeningTo, count: 0};
          }
      
          // Bind callbacks on obj, and keep track of them on listening.
          internalOn(obj, name, callback, this, listening);
          return this;
        };
      
        // The reducing API that adds a callback to the `events` object.
        var onApi = function(events, name, callback, options) {
          if (callback) {
            var handlers = events[name] || (events[name] = []);
            var context = options.context, ctx = options.ctx, listening = options.listening;
            if (listening) listening.count++;
      
            handlers.push({ callback: callback, context: context, ctx: context || ctx, listening: listening });
          }
          return events;
        };
      
        // Remove one or many callbacks. If `context` is null, removes all
        // callbacks with that function. If `callback` is null, removes all
        // callbacks for the event. If `name` is null, removes all bound
        // callbacks for all events.
        Events.off =  function(name, callback, context) {
          if (!this._events) return this;
          this._events = eventsApi(offApi, this._events, name, callback, {
              context: context,
              listeners: this._listeners
          });
          return this;
        };
      
        // Tell this object to stop listening to either specific events ... or
        // to every object it's currently listening to.
        Events.stopListening =  function(obj, name, callback) {
          var listeningTo = this._listeningTo;
          if (!listeningTo) return this;
      
          var ids = obj ? [obj._listenId] : _.keys(listeningTo);
      
          for (var i = 0; i < ids.length; i++) {
            var listening = listeningTo[ids[i]];
      
            // If listening doesn't exist, this object is not currently
            // listening to obj. Break out early.
            if (!listening) break;
      
            listening.obj.off(name, callback, this);
          }
          if (_.isEmpty(listeningTo)) this._listeningTo = void 0;
      
          return this;
        };
      
        // The reducing API that removes a callback from the `events` object.
        var offApi = function(events, name, callback, options) {
          if (!events) return;
      
          var i = 0, listening;
          var context = options.context, listeners = options.listeners;
      
          // Delete all events listeners and "drop" events.
          if (!name && !callback && !context) {
            var ids = _.keys(listeners);
            for (; i < ids.length; i++) {
              listening = listeners[ids[i]];
              delete listeners[listening.id];
              delete listening.listeningTo[listening.objId];
            }
            return;
          }
      
          var names = name ? [name] : _.keys(events);
          for (; i < names.length; i++) {
            name = names[i];
            var handlers = events[name];
      
            // Bail out if there are no events stored.
            if (!handlers) break;
      
            // Replace events if there are any remaining.  Otherwise, clean up.
            var remaining = [];
            for (var j = 0; j < handlers.length; j++) {
              var handler = handlers[j];
              if (
                callback && callback !== handler.callback &&
                  callback !== handler.callback._callback ||
                    context && context !== handler.context
              ) {
                remaining.push(handler);
              } else {
                listening = handler.listening;
                if (listening && --listening.count === 0) {
                  delete listeners[listening.id];
                  delete listening.listeningTo[listening.objId];
                }
              }
            }
      
            // Update tail event if the list has any events.  Otherwise, clean up.
            if (remaining.length) {
              events[name] = remaining;
            } else {
              delete events[name];
            }
          }
          if (_.size(events)) return events;
        };
      
        // Bind an event to only be triggered a single time. After the first time
        // the callback is invoked, its listener will be removed. If multiple events
        // are passed in using the space-separated syntax, the handler will fire
        // once for each event, not once for a combination of all events.
        Events.once =  function(name, callback, context) {
          // Map the event into a `{event: once}` object.
          var events = eventsApi(onceMap, {}, name, callback, _.bind(this.off, this));
          return this.on(events, void 0, context);
        };
      
        // Inversion-of-control versions of `once`.
        Events.listenToOnce =  function(obj, name, callback) {
          // Map the event into a `{event: once}` object.
          var events = eventsApi(onceMap, {}, name, callback, _.bind(this.stopListening, this, obj));
          return this.listenTo(obj, events);
        };
      
        // Reduces the event callbacks into a map of `{event: onceWrapper}`.
        // `offer` unbinds the `onceWrapper` after it has been called.
        var onceMap = function(map, name, callback, offer) {
          if (callback) {
            var once = map[name] = _.once(function() {
              offer(name, once);
              callback.apply(this, arguments);
            });
            once._callback = callback;
          }
          return map;
        };
      
        // Trigger one or many events, firing all bound callbacks. Callbacks are
        // passed the same arguments as `trigger` is, apart from the event name
        // (unless you're listening on `"all"`, which will cause your callback to
        // receive the true name of the event as the first argument).
        Events.trigger =  function(name) {
          if (!this._events) return this;
      
          var length = Math.max(0, arguments.length - 1);
          var args = Array(length);
          for (var i = 0; i < length; i++) args[i] = arguments[i + 1];
      
          eventsApi(triggerApi, this._events, name, void 0, args);
          return this;
        };
      
        // Handles triggering the appropriate event callbacks.
        var triggerApi = function(objEvents, name, cb, args) {
          if (objEvents) {
            var events = objEvents[name];
            var allEvents = objEvents.all;
            if (events && allEvents) allEvents = allEvents.slice();
            if (events) triggerEvents(events, args);
            if (allEvents) triggerEvents(allEvents, [name].concat(args));
          }
          return objEvents;
        };
      
        // A difficult-to-believe, but optimized internal dispatch function for
        // triggering events. Tries to keep the usual cases speedy (most internal
        // Backbone events have 3 arguments).
        var triggerEvents = function(events, args) {
          var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
          switch (args.length) {
            case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
            case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
            case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
            case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
            default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
          }
        };
      
        // Aliases for backwards compatibility.
        Events.bind   = Events.on;
        Events.unbind = Events.off;
      
        // Allow the `Backbone` object to serve as a global event bus, for folks who
        // want global "pubsub" in a convenient place.
        _.extend(Backbone, Events);
      
        // Backbone.Model
        // --------------
      
        // Backbone **Models** are the basic data object in the framework --
        // frequently representing a row in a table in a database on your server.
        // A discrete chunk of data and a bunch of useful, related methods for
        // performing computations and transformations on that data.
      
        // Create a new model with the specified attributes. A client id (`cid`)
        // is automatically generated and assigned for you.
        var Model = Backbone.Model = function(attributes, options) {
          var attrs = attributes || {};
          options || (options = {});
          this.cid = _.uniqueId(this.cidPrefix);
          this.attributes = {};
          if (options.collection) this.collection = options.collection;
          if (options.parse) attrs = this.parse(attrs, options) || {};
          attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
          this.set(attrs, options);
          this.changed = {};
          this.initialize.apply(this, arguments);
        };
      
        // Attach all inheritable methods to the Model prototype.
        _.extend(Model.prototype, Events, {
      
          // A hash of attributes whose current and previous value differ.
          changed: null,
      
          // The value returned during the last failed validation.
          validationError: null,
      
          // The default name for the JSON `id` attribute is `"id"`. MongoDB and
          // CouchDB users may want to set this to `"_id"`.
          idAttribute: 'id',
      
          // The prefix is used to create the client id which is used to identify models locally.
          // You may want to override this if you're experiencing name clashes with model ids.
          cidPrefix: 'c',
      
          // Initialize is an empty function by default. Override it with your own
          // initialization logic.
          initialize: function(){},
      
          // Return a copy of the model's `attributes` object.
          toJSON: function(options) {
            return _.clone(this.attributes);
          },
      
          // Proxy `Backbone.sync` by default -- but override this if you need
          // custom syncing semantics for *this* particular model.
          sync: function() {
            return Backbone.sync.apply(this, arguments);
          },
      
          // Get the value of an attribute.
          get: function(attr) {
            return this.attributes[attr];
          },
      
          // Get the HTML-escaped value of an attribute.
          escape: function(attr) {
            return _.escape(this.get(attr));
          },
      
          // Returns `true` if the attribute contains a value that is not null
          // or undefined.
          has: function(attr) {
            return this.get(attr) != null;
          },
      
          // Special-cased proxy to underscore's `_.matches` method.
          matches: function(attrs) {
            return !!_.iteratee(attrs, this)(this.attributes);
          },
      
          // Set a hash of model attributes on the object, firing `"change"`. This is
          // the core primitive operation of a model, updating the data and notifying
          // anyone who needs to know about the change in state. The heart of the beast.
          set: function(key, val, options) {
            if (key == null) return this;
      
            // Handle both `"key", value` and `{key: value}` -style arguments.
            var attrs;
            if (typeof key === 'object') {
              attrs = key;
              options = val;
            } else {
              (attrs = {})[key] = val;
            }
      
            options || (options = {});
      
            // Run validation.
            if (!this._validate(attrs, options)) return false;
      
            // Extract attributes and options.
            var unset      = options.unset;
            var silent     = options.silent;
            var changes    = [];
            var changing   = this._changing;
            this._changing = true;
      
            if (!changing) {
              this._previousAttributes = _.clone(this.attributes);
              this.changed = {};
            }
      
            var current = this.attributes;
            var changed = this.changed;
            var prev    = this._previousAttributes;
      
            // For each `set` attribute, update or delete the current value.
            for (var attr in attrs) {
              val = attrs[attr];
              if (!_.isEqual(current[attr], val)) changes.push(attr);
              if (!_.isEqual(prev[attr], val)) {
                changed[attr] = val;
              } else {
                delete changed[attr];
              }
              unset ? delete current[attr] : current[attr] = val;
            }
      
            // Update the `id`.
            this.id = this.get(this.idAttribute);
      
            // Trigger all relevant attribute changes.
            if (!silent) {
              if (changes.length) this._pending = options;
              for (var i = 0; i < changes.length; i++) {
                this.trigger('change:' + changes[i], this, current[changes[i]], options);
              }
            }
      
            // You might be wondering why there's a `while` loop here. Changes can
            // be recursively nested within `"change"` events.
            if (changing) return this;
            if (!silent) {
              while (this._pending) {
                options = this._pending;
                this._pending = false;
                this.trigger('change', this, options);
              }
            }
            this._pending = false;
            this._changing = false;
            return this;
          },
      
          // Remove an attribute from the model, firing `"change"`. `unset` is a noop
          // if the attribute doesn't exist.
          unset: function(attr, options) {
            return this.set(attr, void 0, _.extend({}, options, {unset: true}));
          },
      
          // Clear all attributes on the model, firing `"change"`.
          clear: function(options) {
            var attrs = {};
            for (var key in this.attributes) attrs[key] = void 0;
            return this.set(attrs, _.extend({}, options, {unset: true}));
          },
      
          // Determine if the model has changed since the last `"change"` event.
          // If you specify an attribute name, determine if that attribute has changed.
          hasChanged: function(attr) {
            if (attr == null) return !_.isEmpty(this.changed);
            return _.has(this.changed, attr);
          },
      
          // Return an object containing all the attributes that have changed, or
          // false if there are no changed attributes. Useful for determining what
          // parts of a view need to be updated and/or what attributes need to be
          // persisted to the server. Unset attributes will be set to undefined.
          // You can also pass an attributes object to diff against the model,
          // determining if there *would be* a change.
          changedAttributes: function(diff) {
            if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
            var old = this._changing ? this._previousAttributes : this.attributes;
            var changed = {};
            for (var attr in diff) {
              var val = diff[attr];
              if (_.isEqual(old[attr], val)) continue;
              changed[attr] = val;
            }
            return _.size(changed) ? changed : false;
          },
      
          // Get the previous value of an attribute, recorded at the time the last
          // `"change"` event was fired.
          previous: function(attr) {
            if (attr == null || !this._previousAttributes) return null;
            return this._previousAttributes[attr];
          },
      
          // Get all of the attributes of the model at the time of the previous
          // `"change"` event.
          previousAttributes: function() {
            return _.clone(this._previousAttributes);
          },
      
          // Fetch the model from the server, merging the response with the model's
          // local attributes. Any changed attributes will trigger a "change" event.
          fetch: function(options) {
            options = _.extend({parse: true}, options);
            var model = this;
            var success = options.success;
            options.success = function(resp) {
              var serverAttrs = options.parse ? model.parse(resp, options) : resp;
              if (!model.set(serverAttrs, options)) return false;
              if (success) success.call(options.context, model, resp, options);
              model.trigger('sync', model, resp, options);
            };
            wrapError(this, options);
            return this.sync('read', this, options);
          },
      
          // Set a hash of model attributes, and sync the model to the server.
          // If the server returns an attributes hash that differs, the model's
          // state will be `set` again.
          save: function(key, val, options) {
            // Handle both `"key", value` and `{key: value}` -style arguments.
            var attrs;
            if (key == null || typeof key === 'object') {
              attrs = key;
              options = val;
            } else {
              (attrs = {})[key] = val;
            }
      
            options = _.extend({validate: true, parse: true}, options);
            var wait = options.wait;
      
            // If we're not waiting and attributes exist, save acts as
            // `set(attr).save(null, opts)` with validation. Otherwise, check if
            // the model will be valid when the attributes, if any, are set.
            if (attrs && !wait) {
              if (!this.set(attrs, options)) return false;
            } else {
              if (!this._validate(attrs, options)) return false;
            }
      
            // After a successful server-side save, the client is (optionally)
            // updated with the server-side state.
            var model = this;
            var success = options.success;
            var attributes = this.attributes;
            options.success = function(resp) {
              // Ensure attributes are restored during synchronous saves.
              model.attributes = attributes;
              var serverAttrs = options.parse ? model.parse(resp, options) : resp;
              if (wait) serverAttrs = _.extend({}, attrs, serverAttrs);
              if (serverAttrs && !model.set(serverAttrs, options)) return false;
              if (success) success.call(options.context, model, resp, options);
              model.trigger('sync', model, resp, options);
            };
            wrapError(this, options);
      
            // Set temporary attributes if `{wait: true}` to properly find new ids.
            if (attrs && wait) this.attributes = _.extend({}, attributes, attrs);
      
            var method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
            if (method === 'patch' && !options.attrs) options.attrs = attrs;
            var xhr = this.sync(method, this, options);
      
            // Restore attributes.
            this.attributes = attributes;
      
            return xhr;
          },
      
          // Destroy this model on the server if it was already persisted.
          // Optimistically removes the model from its collection, if it has one.
          // If `wait: true` is passed, waits for the server to respond before removal.
          destroy: function(options) {
            options = options ? _.clone(options) : {};
            var model = this;
            var success = options.success;
            var wait = options.wait;
      
            var destroy = function() {
              model.stopListening();
              model.trigger('destroy', model, model.collection, options);
            };
      
            options.success = function(resp) {
              if (wait) destroy();
              if (success) success.call(options.context, model, resp, options);
              if (!model.isNew()) model.trigger('sync', model, resp, options);
            };
      
            var xhr = false;
            if (this.isNew()) {
              _.defer(options.success);
            } else {
              wrapError(this, options);
              xhr = this.sync('delete', this, options);
            }
            if (!wait) destroy();
            return xhr;
          },
      
          // Default URL for the model's representation on the server -- if you're
          // using Backbone's restful methods, override this to change the endpoint
          // that will be called.
          url: function() {
            var base =
              _.result(this, 'urlRoot') ||
              _.result(this.collection, 'url') ||
              urlError();
            if (this.isNew()) return base;
            var id = this.get(this.idAttribute);
            return base.replace(/[^\/]$/, '$&/') + encodeURIComponent(id);
          },
      
          // **parse** converts a response into the hash of attributes to be `set` on
          // the model. The default implementation is just to pass the response along.
          parse: function(resp, options) {
            return resp;
          },
      
          // Create a new model with identical attributes to this one.
          clone: function() {
            return new this.constructor(this.attributes);
          },
      
          // A model is new if it has never been saved to the server, and lacks an id.
          isNew: function() {
            return !this.has(this.idAttribute);
          },
      
          // Check if the model is currently in a valid state.
          isValid: function(options) {
            return this._validate({}, _.defaults({validate: true}, options));
          },
      
          // Run validation against the next complete set of model attributes,
          // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
          _validate: function(attrs, options) {
            if (!options.validate || !this.validate) return true;
            attrs = _.extend({}, this.attributes, attrs);
            var error = this.validationError = this.validate(attrs, options) || null;
            if (!error) return true;
            this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
            return false;
          }
      
        });
      
        // Underscore methods that we want to implement on the Model, mapped to the
        // number of arguments they take.
        var modelMethods = { keys: 1, values: 1, pairs: 1, invert: 1, pick: 0,
            omit: 0, chain: 1, isEmpty: 1 };
      
        // Mix in each Underscore method as a proxy to `Model#attributes`.
        addUnderscoreMethods(Model, modelMethods, 'attributes');
      
        // Backbone.Collection
        // -------------------
      
        // If models tend to represent a single row of data, a Backbone Collection is
        // more analogous to a table full of data ... or a small slice or page of that
        // table, or a collection of rows that belong together for a particular reason
        // -- all of the messages in this particular folder, all of the documents
        // belonging to this particular author, and so on. Collections maintain
        // indexes of their models, both in order, and for lookup by `id`.
      
        // Create a new **Collection**, perhaps to contain a specific type of `model`.
        // If a `comparator` is specified, the Collection will maintain
        // its models in sort order, as they're added and removed.
        var Collection = Backbone.Collection = function(models, options) {
          options || (options = {});
          if (options.model) this.model = options.model;
          if (options.comparator !== void 0) this.comparator = options.comparator;
          this._reset();
          this.initialize.apply(this, arguments);
          if (models) this.reset(models, _.extend({silent: true}, options));
        };
      
        // Default options for `Collection#set`.
        var setOptions = {add: true, remove: true, merge: true};
        var addOptions = {add: true, remove: false};
      
        // Splices `insert` into `array` at index `at`.
        var splice = function(array, insert, at) {
          at = Math.min(Math.max(at, 0), array.length);
          var tail = Array(array.length - at);
          var length = insert.length;
          for (var i = 0; i < tail.length; i++) tail[i] = array[i + at];
          for (i = 0; i < length; i++) array[i + at] = insert[i];
          for (i = 0; i < tail.length; i++) array[i + length + at] = tail[i];
        };
      
        // Define the Collection's inheritable methods.
        _.extend(Collection.prototype, Events, {
      
          // The default model for a collection is just a **Backbone.Model**.
          // This should be overridden in most cases.
          model: Model,
      
          // Initialize is an empty function by default. Override it with your own
          // initialization logic.
          initialize: function(){},
      
          // The JSON representation of a Collection is an array of the
          // models' attributes.
          toJSON: function(options) {
            return this.map(function(model) { return model.toJSON(options); });
          },
      
          // Proxy `Backbone.sync` by default.
          sync: function() {
            return Backbone.sync.apply(this, arguments);
          },
      
          // Add a model, or list of models to the set. `models` may be Backbone
          // Models or raw JavaScript objects to be converted to Models, or any
          // combination of the two.
          add: function(models, options) {
            return this.set(models, _.extend({merge: false}, options, addOptions));
          },
      
          // Remove a model, or a list of models from the set.
          remove: function(models, options) {
            options = _.extend({}, options);
            var singular = !_.isArray(models);
            models = singular ? [models] : _.clone(models);
            var removed = this._removeModels(models, options);
            if (!options.silent && removed) this.trigger('update', this, options);
            return singular ? removed[0] : removed;
          },
      
          // Update a collection by `set`-ing a new list of models, adding new ones,
          // removing models that are no longer present, and merging models that
          // already exist in the collection, as necessary. Similar to **Model#set**,
          // the core operation for updating the data contained by the collection.
          set: function(models, options) {
            if (models == null) return;
      
            options = _.defaults({}, options, setOptions);
            if (options.parse && !this._isModel(models)) models = this.parse(models, options);
      
            var singular = !_.isArray(models);
            models = singular ? [models] : models.slice();
      
            var at = options.at;
            if (at != null) at = +at;
            if (at < 0) at += this.length + 1;
      
            var set = [];
            var toAdd = [];
            var toRemove = [];
            var modelMap = {};
      
            var add = options.add;
            var merge = options.merge;
            var remove = options.remove;
      
            var sort = false;
            var sortable = this.comparator && (at == null) && options.sort !== false;
            var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      
            // Turn bare objects into model references, and prevent invalid models
            // from being added.
            var model;
            for (var i = 0; i < models.length; i++) {
              model = models[i];
      
              // If a duplicate is found, prevent it from being added and
              // optionally merge it into the existing model.
              var existing = this.get(model);
              if (existing) {
                if (merge && model !== existing) {
                  var attrs = this._isModel(model) ? model.attributes : model;
                  if (options.parse) attrs = existing.parse(attrs, options);
                  existing.set(attrs, options);
                  if (sortable && !sort) sort = existing.hasChanged(sortAttr);
                }
                if (!modelMap[existing.cid]) {
                  modelMap[existing.cid] = true;
                  set.push(existing);
                }
                models[i] = existing;
      
              // If this is a new, valid model, push it to the `toAdd` list.
              } else if (add) {
                model = models[i] = this._prepareModel(model, options);
                if (model) {
                  toAdd.push(model);
                  this._addReference(model, options);
                  modelMap[model.cid] = true;
                  set.push(model);
                }
              }
            }
      
            // Remove stale models.
            if (remove) {
              for (i = 0; i < this.length; i++) {
                model = this.models[i];
                if (!modelMap[model.cid]) toRemove.push(model);
              }
              if (toRemove.length) this._removeModels(toRemove, options);
            }
      
            // See if sorting is needed, update `length` and splice in new models.
            var orderChanged = false;
            var replace = !sortable && add && remove;
            if (set.length && replace) {
              orderChanged = this.length != set.length || _.some(this.models, function(model, index) {
                return model !== set[index];
              });
              this.models.length = 0;
              splice(this.models, set, 0);
              this.length = this.models.length;
            } else if (toAdd.length) {
              if (sortable) sort = true;
              splice(this.models, toAdd, at == null ? this.length : at);
              this.length = this.models.length;
            }
      
            // Silently sort the collection if appropriate.
            if (sort) this.sort({silent: true});
      
            // Unless silenced, it's time to fire all appropriate add/sort events.
            if (!options.silent) {
              for (i = 0; i < toAdd.length; i++) {
                if (at != null) options.index = at + i;
                model = toAdd[i];
                model.trigger('add', model, this, options);
              }
              if (sort || orderChanged) this.trigger('sort', this, options);
              if (toAdd.length || toRemove.length) this.trigger('update', this, options);
            }
      
            // Return the added (or merged) model (or models).
            return singular ? models[0] : models;
          },
      
          // When you have more items than you want to add or remove individually,
          // you can reset the entire set with a new list of models, without firing
          // any granular `add` or `remove` events. Fires `reset` when finished.
          // Useful for bulk operations and optimizations.
          reset: function(models, options) {
            options = options ? _.clone(options) : {};
            for (var i = 0; i < this.models.length; i++) {
              this._removeReference(this.models[i], options);
            }
            options.previousModels = this.models;
            this._reset();
            models = this.add(models, _.extend({silent: true}, options));
            if (!options.silent) this.trigger('reset', this, options);
            return models;
          },
      
          // Add a model to the end of the collection.
          push: function(model, options) {
            return this.add(model, _.extend({at: this.length}, options));
          },
      
          // Remove a model from the end of the collection.
          pop: function(options) {
            var model = this.at(this.length - 1);
            return this.remove(model, options);
          },
      
          // Add a model to the beginning of the collection.
          unshift: function(model, options) {
            return this.add(model, _.extend({at: 0}, options));
          },
      
          // Remove a model from the beginning of the collection.
          shift: function(options) {
            var model = this.at(0);
            return this.remove(model, options);
          },
      
          // Slice out a sub-array of models from the collection.
          slice: function() {
            return slice.apply(this.models, arguments);
          },
      
          // Get a model from the set by id.
          get: function(obj) {
            if (obj == null) return void 0;
            var id = this.modelId(this._isModel(obj) ? obj.attributes : obj);
            return this._byId[obj] || this._byId[id] || this._byId[obj.cid];
          },
      
          // Get the model at the given index.
          at: function(index) {
            if (index < 0) index += this.length;
            return this.models[index];
          },
      
          // Return models with matching attributes. Useful for simple cases of
          // `filter`.
          where: function(attrs, first) {
            return this[first ? 'find' : 'filter'](attrs);
          },
      
          // Return the first model with matching attributes. Useful for simple cases
          // of `find`.
          findWhere: function(attrs) {
            return this.where(attrs, true);
          },
      
          // Force the collection to re-sort itself. You don't need to call this under
          // normal circumstances, as the set will maintain sort order as each item
          // is added.
          sort: function(options) {
            var comparator = this.comparator;
            if (!comparator) throw new Error('Cannot sort a set without a comparator');
            options || (options = {});
      
            var length = comparator.length;
            if (_.isFunction(comparator)) comparator = _.bind(comparator, this);
      
            // Run sort based on type of `comparator`.
            if (length === 1 || _.isString(comparator)) {
              this.models = this.sortBy(comparator);
            } else {
              this.models.sort(comparator);
            }
            if (!options.silent) this.trigger('sort', this, options);
            return this;
          },
      
          // Pluck an attribute from each model in the collection.
          pluck: function(attr) {
            return _.invoke(this.models, 'get', attr);
          },
      
          // Fetch the default set of models for this collection, resetting the
          // collection when they arrive. If `reset: true` is passed, the response
          // data will be passed through the `reset` method instead of `set`.
          fetch: function(options) {
            options = _.extend({parse: true}, options);
            var success = options.success;
            var collection = this;
            options.success = function(resp) {
              var method = options.reset ? 'reset' : 'set';
              collection[method](resp, options);
              if (success) success.call(options.context, collection, resp, options);
              collection.trigger('sync', collection, resp, options);
            };
            wrapError(this, options);
            return this.sync('read', this, options);
          },
      
          // Create a new instance of a model in this collection. Add the model to the
          // collection immediately, unless `wait: true` is passed, in which case we
          // wait for the server to agree.
          create: function(model, options) {
            options = options ? _.clone(options) : {};
            var wait = options.wait;
            model = this._prepareModel(model, options);
            if (!model) return false;
            if (!wait) this.add(model, options);
            var collection = this;
            var success = options.success;
            options.success = function(model, resp, callbackOpts) {
              if (wait) collection.add(model, callbackOpts);
              if (success) success.call(callbackOpts.context, model, resp, callbackOpts);
            };
            model.save(null, options);
            return model;
          },
      
          // **parse** converts a response into a list of models to be added to the
          // collection. The default implementation is just to pass it through.
          parse: function(resp, options) {
            return resp;
          },
      
          // Create a new collection with an identical list of models as this one.
          clone: function() {
            return new this.constructor(this.models, {
              model: this.model,
              comparator: this.comparator
            });
          },
      
          // Define how to uniquely identify models in the collection.
          modelId: function (attrs) {
            return attrs[this.model.prototype.idAttribute || 'id'];
          },
      
          // Private method to reset all internal state. Called when the collection
          // is first initialized or reset.
          _reset: function() {
            this.length = 0;
            this.models = [];
            this._byId  = {};
          },
      
          // Prepare a hash of attributes (or other model) to be added to this
          // collection.
          _prepareModel: function(attrs, options) {
            if (this._isModel(attrs)) {
              if (!attrs.collection) attrs.collection = this;
              return attrs;
            }
            options = options ? _.clone(options) : {};
            options.collection = this;
            var model = new this.model(attrs, options);
            if (!model.validationError) return model;
            this.trigger('invalid', this, model.validationError, options);
            return false;
          },
      
          // Internal method called by both remove and set.
          _removeModels: function(models, options) {
            var removed = [];
            for (var i = 0; i < models.length; i++) {
              var model = this.get(models[i]);
              if (!model) continue;
      
              var index = this.indexOf(model);
              this.models.splice(index, 1);
              this.length--;
      
              if (!options.silent) {
                options.index = index;
                model.trigger('remove', model, this, options);
              }
      
              removed.push(model);
              this._removeReference(model, options);
            }
            return removed.length ? removed : false;
          },
      
          // Method for checking whether an object should be considered a model for
          // the purposes of adding to the collection.
          _isModel: function (model) {
            return model instanceof Model;
          },
      
          // Internal method to create a model's ties to a collection.
          _addReference: function(model, options) {
            this._byId[model.cid] = model;
            var id = this.modelId(model.attributes);
            if (id != null) this._byId[id] = model;
            model.on('all', this._onModelEvent, this);
          },
      
          // Internal method to sever a model's ties to a collection.
          _removeReference: function(model, options) {
            delete this._byId[model.cid];
            var id = this.modelId(model.attributes);
            if (id != null) delete this._byId[id];
            if (this === model.collection) delete model.collection;
            model.off('all', this._onModelEvent, this);
          },
      
          // Internal method called every time a model in the set fires an event.
          // Sets need to update their indexes when models change ids. All other
          // events simply proxy through. "add" and "remove" events that originate
          // in other collections are ignored.
          _onModelEvent: function(event, model, collection, options) {
            if ((event === 'add' || event === 'remove') && collection !== this) return;
            if (event === 'destroy') this.remove(model, options);
            if (event === 'change') {
              var prevId = this.modelId(model.previousAttributes());
              var id = this.modelId(model.attributes);
              if (prevId !== id) {
                if (prevId != null) delete this._byId[prevId];
                if (id != null) this._byId[id] = model;
              }
            }
            this.trigger.apply(this, arguments);
          }
      
        });
      
        // Underscore methods that we want to implement on the Collection.
        // 90% of the core usefulness of Backbone Collections is actually implemented
        // right here:
        var collectionMethods = { forEach: 3, each: 3, map: 3, collect: 3, reduce: 4,
            foldl: 4, inject: 4, reduceRight: 4, foldr: 4, find: 3, detect: 3, filter: 3,
            select: 3, reject: 3, every: 3, all: 3, some: 3, any: 3, include: 3, includes: 3,
            contains: 3, invoke: 0, max: 3, min: 3, toArray: 1, size: 1, first: 3,
            head: 3, take: 3, initial: 3, rest: 3, tail: 3, drop: 3, last: 3,
            without: 0, difference: 0, indexOf: 3, shuffle: 1, lastIndexOf: 3,
            isEmpty: 1, chain: 1, sample: 3, partition: 3, groupBy: 3, countBy: 3,
            sortBy: 3, indexBy: 3};
      
        // Mix in each Underscore method as a proxy to `Collection#models`.
        addUnderscoreMethods(Collection, collectionMethods, 'models');
      
        // Backbone.View
        // -------------
      
        // Backbone Views are almost more convention than they are actual code. A View
        // is simply a JavaScript object that represents a logical chunk of UI in the
        // DOM. This might be a single item, an entire list, a sidebar or panel, or
        // even the surrounding frame which wraps your whole app. Defining a chunk of
        // UI as a **View** allows you to define your DOM events declaratively, without
        // having to worry about render order ... and makes it easy for the view to
        // react to specific changes in the state of your models.
      
        // Creating a Backbone.View creates its initial element outside of the DOM,
        // if an existing element is not provided...
        var View = Backbone.View = function(options) {
          this.cid = _.uniqueId('view');
          _.extend(this, _.pick(options, viewOptions));
          this._ensureElement();
          this.initialize.apply(this, arguments);
        };
      
        // Cached regex to split keys for `delegate`.
        var delegateEventSplitter = /^(\S+)\s*(.*)$/;
      
        // List of view options to be set as properties.
        var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];
      
        // Set up all inheritable **Backbone.View** properties and methods.
        _.extend(View.prototype, Events, {
      
          // The default `tagName` of a View's element is `"div"`.
          tagName: 'div',
      
          // jQuery delegate for element lookup, scoped to DOM elements within the
          // current view. This should be preferred to global lookups where possible.
          $: function(selector) {
            return this.$el.find(selector);
          },
      
          // Initialize is an empty function by default. Override it with your own
          // initialization logic.
          initialize: function(){},
      
          // **render** is the core function that your view should override, in order
          // to populate its element (`this.el`), with the appropriate HTML. The
          // convention is for **render** to always return `this`.
          render: function() {
            return this;
          },
      
          // Remove this view by taking the element out of the DOM, and removing any
          // applicable Backbone.Events listeners.
          remove: function() {
            this._removeElement();
            this.stopListening();
            return this;
          },
      
          // Remove this view's element from the document and all event listeners
          // attached to it. Exposed for subclasses using an alternative DOM
          // manipulation API.
          _removeElement: function() {
            this.$el.remove();
          },
      
          // Change the view's element (`this.el` property) and re-delegate the
          // view's events on the new element.
          setElement: function(element) {
            this.undelegateEvents();
            this._setElement(element);
            this.delegateEvents();
            return this;
          },
      
          // Creates the `this.el` and `this.$el` references for this view using the
          // given `el`. `el` can be a CSS selector or an HTML string, a jQuery
          // context or an element. Subclasses can override this to utilize an
          // alternative DOM manipulation API and are only required to set the
          // `this.el` property.
          _setElement: function(el) {
            this.$el = el instanceof Backbone.$ ? el : Backbone.$(el);
            this.el = this.$el[0];
          },
      
          // Set callbacks, where `this.events` is a hash of
          //
          // *{"event selector": "callback"}*
          //
          //     {
          //       'mousedown .title':  'edit',
          //       'click .button':     'save',
          //       'click .open':       function(e) { ... }
          //     }
          //
          // pairs. Callbacks will be bound to the view, with `this` set properly.
          // Uses event delegation for efficiency.
          // Omitting the selector binds the event to `this.el`.
          delegateEvents: function(events) {
            events || (events = _.result(this, 'events'));
            if (!events) return this;
            this.undelegateEvents();
            for (var key in events) {
              var method = events[key];
              if (!_.isFunction(method)) method = this[method];
              if (!method) continue;
              var match = key.match(delegateEventSplitter);
              this.delegate(match[1], match[2], _.bind(method, this));
            }
            return this;
          },
      
          // Add a single event listener to the view's element (or a child element
          // using `selector`). This only works for delegate-able events: not `focus`,
          // `blur`, and not `change`, `submit`, and `reset` in Internet Explorer.
          delegate: function(eventName, selector, listener) {
            this.$el.on(eventName + '.delegateEvents' + this.cid, selector, listener);
            return this;
          },
      
          // Clears all callbacks previously bound to the view by `delegateEvents`.
          // You usually don't need to use this, but may wish to if you have multiple
          // Backbone views attached to the same DOM element.
          undelegateEvents: function() {
            if (this.$el) this.$el.off('.delegateEvents' + this.cid);
            return this;
          },
      
          // A finer-grained `undelegateEvents` for removing a single delegated event.
          // `selector` and `listener` are both optional.
          undelegate: function(eventName, selector, listener) {
            this.$el.off(eventName + '.delegateEvents' + this.cid, selector, listener);
            return this;
          },
      
          // Produces a DOM element to be assigned to your view. Exposed for
          // subclasses using an alternative DOM manipulation API.
          _createElement: function(tagName) {
            return document.createElement(tagName);
          },
      
          // Ensure that the View has a DOM element to render into.
          // If `this.el` is a string, pass it through `$()`, take the first
          // matching element, and re-assign it to `el`. Otherwise, create
          // an element from the `id`, `className` and `tagName` properties.
          _ensureElement: function() {
            if (!this.el) {
              var attrs = _.extend({}, _.result(this, 'attributes'));
              if (this.id) attrs.id = _.result(this, 'id');
              if (this.className) attrs['class'] = _.result(this, 'className');
              this.setElement(this._createElement(_.result(this, 'tagName')));
              this._setAttributes(attrs);
            } else {
              this.setElement(_.result(this, 'el'));
            }
          },
      
          // Set attributes from a hash on this view's element.  Exposed for
          // subclasses using an alternative DOM manipulation API.
          _setAttributes: function(attributes) {
            this.$el.attr(attributes);
          }
      
        });
      
        // Backbone.sync
        // -------------
      
        // Override this function to change the manner in which Backbone persists
        // models to the server. You will be passed the type of request, and the
        // model in question. By default, makes a RESTful Ajax request
        // to the model's `url()`. Some possible customizations could be:
        //
        // * Use `setTimeout` to batch rapid-fire updates into a single request.
        // * Send up the models as XML instead of JSON.
        // * Persist models via WebSockets instead of Ajax.
        //
        // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
        // as `POST`, with a `_method` parameter containing the true HTTP method,
        // as well as all requests with the body as `application/x-www-form-urlencoded`
        // instead of `application/json` with the model in a param named `model`.
        // Useful when interfacing with server-side languages like **PHP** that make
        // it difficult to read the body of `PUT` requests.
        Backbone.sync = function(method, model, options) {
          var type = methodMap[method];
      
          // Default options, unless specified.
          _.defaults(options || (options = {}), {
            emulateHTTP: Backbone.emulateHTTP,
            emulateJSON: Backbone.emulateJSON
          });
      
          // Default JSON-request options.
          var params = {type: type, dataType: 'json'};
      
          // Ensure that we have a URL.
          if (!options.url) {
            params.url = _.result(model, 'url') || urlError();
          }
      
          // Ensure that we have the appropriate request data.
          if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
            params.contentType = 'application/json';
            params.data = JSON.stringify(options.attrs || model.toJSON(options));
          }
      
          // For older servers, emulate JSON by encoding the request into an HTML-form.
          if (options.emulateJSON) {
            params.contentType = 'application/x-www-form-urlencoded';
            params.data = params.data ? {model: params.data} : {};
          }
      
          // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
          // And an `X-HTTP-Method-Override` header.
          if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
            params.type = 'POST';
            if (options.emulateJSON) params.data._method = type;
            var beforeSend = options.beforeSend;
            options.beforeSend = function(xhr) {
              xhr.setRequestHeader('X-HTTP-Method-Override', type);
              if (beforeSend) return beforeSend.apply(this, arguments);
            };
          }
      
          // Don't process data on a non-GET request.
          if (params.type !== 'GET' && !options.emulateJSON) {
            params.processData = false;
          }
      
          // Pass along `textStatus` and `errorThrown` from jQuery.
          var error = options.error;
          options.error = function(xhr, textStatus, errorThrown) {
            options.textStatus = textStatus;
            options.errorThrown = errorThrown;
            if (error) error.call(options.context, xhr, textStatus, errorThrown);
          };
      
          // Make the request, allowing the user to override any Ajax options.
          var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
          model.trigger('request', model, xhr, options);
          return xhr;
        };
      
        // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
        var methodMap = {
          'create': 'POST',
          'update': 'PUT',
          'patch':  'PATCH',
          'delete': 'DELETE',
          'read':   'GET'
        };
      
        // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
        // Override this if you'd like to use a different library.
        Backbone.ajax = function() {
          return Backbone.$.ajax.apply(Backbone.$, arguments);
        };
      
        // Backbone.Router
        // ---------------
      
        // Routers map faux-URLs to actions, and fire events when routes are
        // matched. Creating a new one sets its `routes` hash, if not set statically.
        var Router = Backbone.Router = function(options) {
          options || (options = {});
          if (options.routes) this.routes = options.routes;
          this._bindRoutes();
          this.initialize.apply(this, arguments);
        };
      
        // Cached regular expressions for matching named param parts and splatted
        // parts of route strings.
        var optionalParam = /\((.*?)\)/g;
        var namedParam    = /(\(\?)?:\w+/g;
        var splatParam    = /\*\w+/g;
        var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;
      
        // Set up all inheritable **Backbone.Router** properties and methods.
        _.extend(Router.prototype, Events, {
      
          // Initialize is an empty function by default. Override it with your own
          // initialization logic.
          initialize: function(){},
      
          // Manually bind a single named route to a callback. For example:
          //
          //     this.route('search/:query/p:num', 'search', function(query, num) {
          //       ...
          //     });
          //
          route: function(route, name, callback) {
            if (!_.isRegExp(route)) route = this._routeToRegExp(route);
            if (_.isFunction(name)) {
              callback = name;
              name = '';
            }
            if (!callback) callback = this[name];
            var router = this;
            Backbone.history.route(route, function(fragment) {
              var args = router._extractParameters(route, fragment);
              if (router.execute(callback, args, name) !== false) {
                router.trigger.apply(router, ['route:' + name].concat(args));
                router.trigger('route', name, args);
                Backbone.history.trigger('route', router, name, args);
              }
            });
            return this;
          },
      
          // Execute a route handler with the provided parameters.  This is an
          // excellent place to do pre-route setup or post-route cleanup.
          execute: function(callback, args, name) {
            if (callback) callback.apply(this, args);
          },
      
          // Simple proxy to `Backbone.history` to save a fragment into the history.
          navigate: function(fragment, options) {
            Backbone.history.navigate(fragment, options);
            return this;
          },
      
          // Bind all defined routes to `Backbone.history`. We have to reverse the
          // order of the routes here to support behavior where the most general
          // routes can be defined at the bottom of the route map.
          _bindRoutes: function() {
            if (!this.routes) return;
            this.routes = _.result(this, 'routes');
            var route, routes = _.keys(this.routes);
            while ((route = routes.pop()) != null) {
              this.route(route, this.routes[route]);
            }
          },
      
          // Convert a route string into a regular expression, suitable for matching
          // against the current location hash.
          _routeToRegExp: function(route) {
            route = route.replace(escapeRegExp, '\\$&')
                         .replace(optionalParam, '(?:$1)?')
                         .replace(namedParam, function(match, optional) {
                           return optional ? match : '([^/?]+)';
                         })
                         .replace(splatParam, '([^?]*?)');
            return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
          },
      
          // Given a route, and a URL fragment that it matches, return the array of
          // extracted decoded parameters. Empty or unmatched parameters will be
          // treated as `null` to normalize cross-browser behavior.
          _extractParameters: function(route, fragment) {
            var params = route.exec(fragment).slice(1);
            return _.map(params, function(param, i) {
              // Don't decode the search params.
              if (i === params.length - 1) return param || null;
              return param ? decodeURIComponent(param) : null;
            });
          }
      
        });
      
        // Backbone.History
        // ----------------
      
        // Handles cross-browser history management, based on either
        // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
        // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
        // and URL fragments. If the browser supports neither (old IE, natch),
        // falls back to polling.
        var History = Backbone.History = function() {
          this.handlers = [];
          this.checkUrl = _.bind(this.checkUrl, this);
      
          // Ensure that `History` can be used outside of the browser.
          if (typeof window !== 'undefined') {
            this.location = window.location;
            this.history = window.history;
          }
        };
      
        // Cached regex for stripping a leading hash/slash and trailing space.
        var routeStripper = /^[#\/]|\s+$/g;
      
        // Cached regex for stripping leading and trailing slashes.
        var rootStripper = /^\/+|\/+$/g;
      
        // Cached regex for stripping urls of hash.
        var pathStripper = /#.*$/;
      
        // Has the history handling already been started?
        History.started = false;
      
        // Set up all inheritable **Backbone.History** properties and methods.
        _.extend(History.prototype, Events, {
      
          // The default interval to poll for hash changes, if necessary, is
          // twenty times a second.
          interval: 50,
      
          // Are we at the app root?
          atRoot: function() {
            var path = this.location.pathname.replace(/[^\/]$/, '$&/');
            return path === this.root && !this.getSearch();
          },
      
          // Does the pathname match the root?
          matchRoot: function() {
            var path = this.decodeFragment(this.location.pathname);
            var root = path.slice(0, this.root.length - 1) + '/';
            return root === this.root;
          },
      
          // Unicode characters in `location.pathname` are percent encoded so they're
          // decoded for comparison. `%25` should not be decoded since it may be part
          // of an encoded parameter.
          decodeFragment: function(fragment) {
            return decodeURI(fragment.replace(/%25/g, '%2525'));
          },
      
          // In IE6, the hash fragment and search params are incorrect if the
          // fragment contains `?`.
          getSearch: function() {
            var match = this.location.href.replace(/#.*/, '').match(/\?.+/);
            return match ? match[0] : '';
          },
      
          // Gets the true hash value. Cannot use location.hash directly due to bug
          // in Firefox where location.hash will always be decoded.
          getHash: function(window) {
            var match = (window || this).location.href.match(/#(.*)$/);
            return match ? match[1] : '';
          },
      
          // Get the pathname and search params, without the root.
          getPath: function() {
            var path = this.decodeFragment(
              this.location.pathname + this.getSearch()
            ).slice(this.root.length - 1);
            return path.charAt(0) === '/' ? path.slice(1) : path;
          },
      
          // Get the cross-browser normalized URL fragment from the path or hash.
          getFragment: function(fragment) {
            if (fragment == null) {
              if (this._usePushState || !this._wantsHashChange) {
                fragment = this.getPath();
              } else {
                fragment = this.getHash();
              }
            }
            return fragment.replace(routeStripper, '');
          },
      
          // Start the hash change handling, returning `true` if the current URL matches
          // an existing route, and `false` otherwise.
          start: function(options) {
            if (History.started) throw new Error('Backbone.history has already been started');
            History.started = true;
      
            // Figure out the initial configuration. Do we need an iframe?
            // Is pushState desired ... is it available?
            this.options          = _.extend({root: '/'}, this.options, options);
            this.root             = this.options.root;
            this._wantsHashChange = this.options.hashChange !== false;
            this._hasHashChange   = 'onhashchange' in window && (document.documentMode === void 0 || document.documentMode > 7);
            this._useHashChange   = this._wantsHashChange && this._hasHashChange;
            this._wantsPushState  = !!this.options.pushState;
            this._hasPushState    = !!(this.history && this.history.pushState);
            this._usePushState    = this._wantsPushState && this._hasPushState;
            this.fragment         = this.getFragment();
      
            // Normalize root to always include a leading and trailing slash.
            this.root = ('/' + this.root + '/').replace(rootStripper, '/');
      
            // Transition from hashChange to pushState or vice versa if both are
            // requested.
            if (this._wantsHashChange && this._wantsPushState) {
      
              // If we've started off with a route from a `pushState`-enabled
              // browser, but we're currently in a browser that doesn't support it...
              if (!this._hasPushState && !this.atRoot()) {
                var root = this.root.slice(0, -1) || '/';
                this.location.replace(root + '#' + this.getPath());
                // Return immediately as browser will do redirect to new url
                return true;
      
              // Or if we've started out with a hash-based route, but we're currently
              // in a browser where it could be `pushState`-based instead...
              } else if (this._hasPushState && this.atRoot()) {
                this.navigate(this.getHash(), {replace: true});
              }
      
            }
      
            // Proxy an iframe to handle location events if the browser doesn't
            // support the `hashchange` event, HTML5 history, or the user wants
            // `hashChange` but not `pushState`.
            if (!this._hasHashChange && this._wantsHashChange && !this._usePushState) {
              this.iframe = document.createElement('iframe');
              this.iframe.src = 'javascript:0';
              this.iframe.style.display = 'none';
              this.iframe.tabIndex = -1;
              var body = document.body;
              // Using `appendChild` will throw on IE < 9 if the document is not ready.
              var iWindow = body.insertBefore(this.iframe, body.firstChild).contentWindow;
              iWindow.document.open();
              iWindow.document.close();
              iWindow.location.hash = '#' + this.fragment;
            }
      
            // Add a cross-platform `addEventListener` shim for older browsers.
            var addEventListener = window.addEventListener || function (eventName, listener) {
              return attachEvent('on' + eventName, listener);
            };
      
            // Depending on whether we're using pushState or hashes, and whether
            // 'onhashchange' is supported, determine how we check the URL state.
            if (this._usePushState) {
              addEventListener('popstate', this.checkUrl, false);
            } else if (this._useHashChange && !this.iframe) {
              addEventListener('hashchange', this.checkUrl, false);
            } else if (this._wantsHashChange) {
              this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
            }
      
            if (!this.options.silent) return this.loadUrl();
          },
      
          // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
          // but possibly useful for unit testing Routers.
          stop: function() {
            // Add a cross-platform `removeEventListener` shim for older browsers.
            var removeEventListener = window.removeEventListener || function (eventName, listener) {
              return detachEvent('on' + eventName, listener);
            };
      
            // Remove window listeners.
            if (this._usePushState) {
              removeEventListener('popstate', this.checkUrl, false);
            } else if (this._useHashChange && !this.iframe) {
              removeEventListener('hashchange', this.checkUrl, false);
            }
      
            // Clean up the iframe if necessary.
            if (this.iframe) {
              document.body.removeChild(this.iframe);
              this.iframe = null;
            }
      
            // Some environments will throw when clearing an undefined interval.
            if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
            History.started = false;
          },
      
          // Add a route to be tested when the fragment changes. Routes added later
          // may override previous routes.
          route: function(route, callback) {
            this.handlers.unshift({route: route, callback: callback});
          },
      
          // Checks the current URL to see if it has changed, and if it has,
          // calls `loadUrl`, normalizing across the hidden iframe.
          checkUrl: function(e) {
            var current = this.getFragment();
      
            // If the user pressed the back button, the iframe's hash will have
            // changed and we should use that for comparison.
            if (current === this.fragment && this.iframe) {
              current = this.getHash(this.iframe.contentWindow);
            }
      
            if (current === this.fragment) return false;
            if (this.iframe) this.navigate(current);
            this.loadUrl();
          },
      
          // Attempt to load the current URL fragment. If a route succeeds with a
          // match, returns `true`. If no defined routes matches the fragment,
          // returns `false`.
          loadUrl: function(fragment) {
            // If the root doesn't match, no routes can match either.
            if (!this.matchRoot()) return false;
            fragment = this.fragment = this.getFragment(fragment);
            return _.some(this.handlers, function(handler) {
              if (handler.route.test(fragment)) {
                handler.callback(fragment);
                return true;
              }
            });
          },
      
          // Save a fragment into the hash history, or replace the URL state if the
          // 'replace' option is passed. You are responsible for properly URL-encoding
          // the fragment in advance.
          //
          // The options object can contain `trigger: true` if you wish to have the
          // route callback be fired (not usually desirable), or `replace: true`, if
          // you wish to modify the current URL without adding an entry to the history.
          navigate: function(fragment, options) {
            if (!History.started) return false;
            if (!options || options === true) options = {trigger: !!options};
      
            // Normalize the fragment.
            fragment = this.getFragment(fragment || '');
      
            // Don't include a trailing slash on the root.
            var root = this.root;
            if (fragment === '' || fragment.charAt(0) === '?') {
              root = root.slice(0, -1) || '/';
            }
            var url = root + fragment;
      
            // Strip the hash and decode for matching.
            fragment = this.decodeFragment(fragment.replace(pathStripper, ''));
      
            if (this.fragment === fragment) return;
            this.fragment = fragment;
      
            // If pushState is available, we use it to set the fragment as a real URL.
            if (this._usePushState) {
              this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);
      
            // If hash changes haven't been explicitly disabled, update the hash
            // fragment to store history.
            } else if (this._wantsHashChange) {
              this._updateHash(this.location, fragment, options.replace);
              if (this.iframe && (fragment !== this.getHash(this.iframe.contentWindow))) {
                var iWindow = this.iframe.contentWindow;
      
                // Opening and closing the iframe tricks IE7 and earlier to push a
                // history entry on hash-tag change.  When replace is true, we don't
                // want this.
                if (!options.replace) {
                  iWindow.document.open();
                  iWindow.document.close();
                }
      
                this._updateHash(iWindow.location, fragment, options.replace);
              }
      
            // If you've told us that you explicitly don't want fallback hashchange-
            // based history, then `navigate` becomes a page refresh.
            } else {
              return this.location.assign(url);
            }
            if (options.trigger) return this.loadUrl(fragment);
          },
      
          // Update the hash location, either replacing the current entry, or adding
          // a new one to the browser history.
          _updateHash: function(location, fragment, replace) {
            if (replace) {
              var href = location.href.replace(/(javascript:|#).*$/, '');
              location.replace(href + '#' + fragment);
            } else {
              // Some browsers require that `hash` contains a leading #.
              location.hash = '#' + fragment;
            }
          }
      
        });
      
        // Create the default Backbone.history.
        Backbone.history = new History;
      
        // Helpers
        // -------
      
        // Helper function to correctly set up the prototype chain for subclasses.
        // Similar to `goog.inherits`, but uses a hash of prototype properties and
        // class properties to be extended.
        var extend = function(protoProps, staticProps) {
          var parent = this;
          var child;
      
          // The constructor function for the new subclass is either defined by you
          // (the "constructor" property in your `extend` definition), or defaulted
          // by us to simply call the parent constructor.
          if (protoProps && _.has(protoProps, 'constructor')) {
            child = protoProps.constructor;
          } else {
            child = function(){ return parent.apply(this, arguments); };
          }
      
          // Add static properties to the constructor function, if supplied.
          _.extend(child, parent, staticProps);
      
          // Set the prototype chain to inherit from `parent`, without calling
          // `parent` constructor function.
          var Surrogate = function(){ this.constructor = child; };
          Surrogate.prototype = parent.prototype;
          child.prototype = new Surrogate;
      
          // Add prototype properties (instance properties) to the subclass,
          // if supplied.
          if (protoProps) _.extend(child.prototype, protoProps);
      
          // Set a convenience property in case the parent's prototype is needed
          // later.
          child.__super__ = parent.prototype;
      
          return child;
        };
      
        // Set up inheritance for the model, collection, router, view and history.
        Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;
      
        // Throw an error when a URL is needed, and none is supplied.
        var urlError = function() {
          throw new Error('A "url" property or function must be specified');
        };
      
        // Wrap an optional error callback with a fallback error event.
        var wrapError = function(model, options) {
          var error = options.error;
          options.error = function(resp) {
            if (error) error.call(options.context, model, resp, options);
            model.trigger('error', model, resp, options);
          };
        };
      
        return Backbone;
      
      }));
      
    },
    'backbone-min': function (module, exports, require, global) {
      (function(t){var e=typeof self=="object"&&self.self==self&&self||typeof global=="object"&&global.global==global&&global;if(typeof define==="function"&&define.amd){define(["underscore","jquery","exports"],function(i,r,n){e.Backbone=t(e,n,i,r)})}else if(typeof exports!=="undefined"){var i=require("underscore"),r;try{r=require("jquery")}catch(n){}t(e,exports,i,r)}else{e.Backbone=t(e,{},e._,e.jQuery||e.Zepto||e.ender||e.$)}})(function(t,e,i,r){var n=t.Backbone;var s=Array.prototype.slice;e.VERSION="1.2.3";e.$=r;e.noConflict=function(){t.Backbone=n;return this};e.emulateHTTP=false;e.emulateJSON=false;var a=function(t,e,r){switch(t){case 1:return function(){return i[e](this[r])};case 2:return function(t){return i[e](this[r],t)};case 3:return function(t,n){return i[e](this[r],h(t,this),n)};case 4:return function(t,n,s){return i[e](this[r],h(t,this),n,s)};default:return function(){var t=s.call(arguments);t.unshift(this[r]);return i[e].apply(i,t)}}};var o=function(t,e,r){i.each(e,function(e,n){if(i[n])t.prototype[n]=a(e,n,r)})};var h=function(t,e){if(i.isFunction(t))return t;if(i.isObject(t)&&!e._isModel(t))return u(t);if(i.isString(t))return function(e){return e.get(t)};return t};var u=function(t){var e=i.matches(t);return function(t){return e(t.attributes)}};var l=e.Events={};var c=/\s+/;var f=function(t,e,r,n,s){var a=0,o;if(r&&typeof r==="object"){if(n!==void 0&&"context"in s&&s.context===void 0)s.context=n;for(o=i.keys(r);a<o.length;a++){e=f(t,e,o[a],r[o[a]],s)}}else if(r&&c.test(r)){for(o=r.split(c);a<o.length;a++){e=t(e,o[a],n,s)}}else{e=t(e,r,n,s)}return e};l.on=function(t,e,i){return d(this,t,e,i)};var d=function(t,e,i,r,n){t._events=f(v,t._events||{},e,i,{context:r,ctx:t,listening:n});if(n){var s=t._listeners||(t._listeners={});s[n.id]=n}return t};l.listenTo=function(t,e,r){if(!t)return this;var n=t._listenId||(t._listenId=i.uniqueId("l"));var s=this._listeningTo||(this._listeningTo={});var a=s[n];if(!a){var o=this._listenId||(this._listenId=i.uniqueId("l"));a=s[n]={obj:t,objId:n,id:o,listeningTo:s,count:0}}d(t,e,r,this,a);return this};var v=function(t,e,i,r){if(i){var n=t[e]||(t[e]=[]);var s=r.context,a=r.ctx,o=r.listening;if(o)o.count++;n.push({callback:i,context:s,ctx:s||a,listening:o})}return t};l.off=function(t,e,i){if(!this._events)return this;this._events=f(g,this._events,t,e,{context:i,listeners:this._listeners});return this};l.stopListening=function(t,e,r){var n=this._listeningTo;if(!n)return this;var s=t?[t._listenId]:i.keys(n);for(var a=0;a<s.length;a++){var o=n[s[a]];if(!o)break;o.obj.off(e,r,this)}if(i.isEmpty(n))this._listeningTo=void 0;return this};var g=function(t,e,r,n){if(!t)return;var s=0,a;var o=n.context,h=n.listeners;if(!e&&!r&&!o){var u=i.keys(h);for(;s<u.length;s++){a=h[u[s]];delete h[a.id];delete a.listeningTo[a.objId]}return}var l=e?[e]:i.keys(t);for(;s<l.length;s++){e=l[s];var c=t[e];if(!c)break;var f=[];for(var d=0;d<c.length;d++){var v=c[d];if(r&&r!==v.callback&&r!==v.callback._callback||o&&o!==v.context){f.push(v)}else{a=v.listening;if(a&&--a.count===0){delete h[a.id];delete a.listeningTo[a.objId]}}}if(f.length){t[e]=f}else{delete t[e]}}if(i.size(t))return t};l.once=function(t,e,r){var n=f(p,{},t,e,i.bind(this.off,this));return this.on(n,void 0,r)};l.listenToOnce=function(t,e,r){var n=f(p,{},e,r,i.bind(this.stopListening,this,t));return this.listenTo(t,n)};var p=function(t,e,r,n){if(r){var s=t[e]=i.once(function(){n(e,s);r.apply(this,arguments)});s._callback=r}return t};l.trigger=function(t){if(!this._events)return this;var e=Math.max(0,arguments.length-1);var i=Array(e);for(var r=0;r<e;r++)i[r]=arguments[r+1];f(m,this._events,t,void 0,i);return this};var m=function(t,e,i,r){if(t){var n=t[e];var s=t.all;if(n&&s)s=s.slice();if(n)_(n,r);if(s)_(s,[e].concat(r))}return t};var _=function(t,e){var i,r=-1,n=t.length,s=e[0],a=e[1],o=e[2];switch(e.length){case 0:while(++r<n)(i=t[r]).callback.call(i.ctx);return;case 1:while(++r<n)(i=t[r]).callback.call(i.ctx,s);return;case 2:while(++r<n)(i=t[r]).callback.call(i.ctx,s,a);return;case 3:while(++r<n)(i=t[r]).callback.call(i.ctx,s,a,o);return;default:while(++r<n)(i=t[r]).callback.apply(i.ctx,e);return}};l.bind=l.on;l.unbind=l.off;i.extend(e,l);var y=e.Model=function(t,e){var r=t||{};e||(e={});this.cid=i.uniqueId(this.cidPrefix);this.attributes={};if(e.collection)this.collection=e.collection;if(e.parse)r=this.parse(r,e)||{};r=i.defaults({},r,i.result(this,"defaults"));this.set(r,e);this.changed={};this.initialize.apply(this,arguments)};i.extend(y.prototype,l,{changed:null,validationError:null,idAttribute:"id",cidPrefix:"c",initialize:function(){},toJSON:function(t){return i.clone(this.attributes)},sync:function(){return e.sync.apply(this,arguments)},get:function(t){return this.attributes[t]},escape:function(t){return i.escape(this.get(t))},has:function(t){return this.get(t)!=null},matches:function(t){return!!i.iteratee(t,this)(this.attributes)},set:function(t,e,r){if(t==null)return this;var n;if(typeof t==="object"){n=t;r=e}else{(n={})[t]=e}r||(r={});if(!this._validate(n,r))return false;var s=r.unset;var a=r.silent;var o=[];var h=this._changing;this._changing=true;if(!h){this._previousAttributes=i.clone(this.attributes);this.changed={}}var u=this.attributes;var l=this.changed;var c=this._previousAttributes;for(var f in n){e=n[f];if(!i.isEqual(u[f],e))o.push(f);if(!i.isEqual(c[f],e)){l[f]=e}else{delete l[f]}s?delete u[f]:u[f]=e}this.id=this.get(this.idAttribute);if(!a){if(o.length)this._pending=r;for(var d=0;d<o.length;d++){this.trigger("change:"+o[d],this,u[o[d]],r)}}if(h)return this;if(!a){while(this._pending){r=this._pending;this._pending=false;this.trigger("change",this,r)}}this._pending=false;this._changing=false;return this},unset:function(t,e){return this.set(t,void 0,i.extend({},e,{unset:true}))},clear:function(t){var e={};for(var r in this.attributes)e[r]=void 0;return this.set(e,i.extend({},t,{unset:true}))},hasChanged:function(t){if(t==null)return!i.isEmpty(this.changed);return i.has(this.changed,t)},changedAttributes:function(t){if(!t)return this.hasChanged()?i.clone(this.changed):false;var e=this._changing?this._previousAttributes:this.attributes;var r={};for(var n in t){var s=t[n];if(i.isEqual(e[n],s))continue;r[n]=s}return i.size(r)?r:false},previous:function(t){if(t==null||!this._previousAttributes)return null;return this._previousAttributes[t]},previousAttributes:function(){return i.clone(this._previousAttributes)},fetch:function(t){t=i.extend({parse:true},t);var e=this;var r=t.success;t.success=function(i){var n=t.parse?e.parse(i,t):i;if(!e.set(n,t))return false;if(r)r.call(t.context,e,i,t);e.trigger("sync",e,i,t)};z(this,t);return this.sync("read",this,t)},save:function(t,e,r){var n;if(t==null||typeof t==="object"){n=t;r=e}else{(n={})[t]=e}r=i.extend({validate:true,parse:true},r);var s=r.wait;if(n&&!s){if(!this.set(n,r))return false}else{if(!this._validate(n,r))return false}var a=this;var o=r.success;var h=this.attributes;r.success=function(t){a.attributes=h;var e=r.parse?a.parse(t,r):t;if(s)e=i.extend({},n,e);if(e&&!a.set(e,r))return false;if(o)o.call(r.context,a,t,r);a.trigger("sync",a,t,r)};z(this,r);if(n&&s)this.attributes=i.extend({},h,n);var u=this.isNew()?"create":r.patch?"patch":"update";if(u==="patch"&&!r.attrs)r.attrs=n;var l=this.sync(u,this,r);this.attributes=h;return l},destroy:function(t){t=t?i.clone(t):{};var e=this;var r=t.success;var n=t.wait;var s=function(){e.stopListening();e.trigger("destroy",e,e.collection,t)};t.success=function(i){if(n)s();if(r)r.call(t.context,e,i,t);if(!e.isNew())e.trigger("sync",e,i,t)};var a=false;if(this.isNew()){i.defer(t.success)}else{z(this,t);a=this.sync("delete",this,t)}if(!n)s();return a},url:function(){var t=i.result(this,"urlRoot")||i.result(this.collection,"url")||F();if(this.isNew())return t;var e=this.get(this.idAttribute);return t.replace(/[^\/]$/,"$&/")+encodeURIComponent(e)},parse:function(t,e){return t},clone:function(){return new this.constructor(this.attributes)},isNew:function(){return!this.has(this.idAttribute)},isValid:function(t){return this._validate({},i.defaults({validate:true},t))},_validate:function(t,e){if(!e.validate||!this.validate)return true;t=i.extend({},this.attributes,t);var r=this.validationError=this.validate(t,e)||null;if(!r)return true;this.trigger("invalid",this,r,i.extend(e,{validationError:r}));return false}});var b={keys:1,values:1,pairs:1,invert:1,pick:0,omit:0,chain:1,isEmpty:1};o(y,b,"attributes");var x=e.Collection=function(t,e){e||(e={});if(e.model)this.model=e.model;if(e.comparator!==void 0)this.comparator=e.comparator;this._reset();this.initialize.apply(this,arguments);if(t)this.reset(t,i.extend({silent:true},e))};var w={add:true,remove:true,merge:true};var E={add:true,remove:false};var k=function(t,e,i){i=Math.min(Math.max(i,0),t.length);var r=Array(t.length-i);var n=e.length;for(var s=0;s<r.length;s++)r[s]=t[s+i];for(s=0;s<n;s++)t[s+i]=e[s];for(s=0;s<r.length;s++)t[s+n+i]=r[s]};i.extend(x.prototype,l,{model:y,initialize:function(){},toJSON:function(t){return this.map(function(e){return e.toJSON(t)})},sync:function(){return e.sync.apply(this,arguments)},add:function(t,e){return this.set(t,i.extend({merge:false},e,E))},remove:function(t,e){e=i.extend({},e);var r=!i.isArray(t);t=r?[t]:i.clone(t);var n=this._removeModels(t,e);if(!e.silent&&n)this.trigger("update",this,e);return r?n[0]:n},set:function(t,e){if(t==null)return;e=i.defaults({},e,w);if(e.parse&&!this._isModel(t))t=this.parse(t,e);var r=!i.isArray(t);t=r?[t]:t.slice();var n=e.at;if(n!=null)n=+n;if(n<0)n+=this.length+1;var s=[];var a=[];var o=[];var h={};var u=e.add;var l=e.merge;var c=e.remove;var f=false;var d=this.comparator&&n==null&&e.sort!==false;var v=i.isString(this.comparator)?this.comparator:null;var g;for(var p=0;p<t.length;p++){g=t[p];var m=this.get(g);if(m){if(l&&g!==m){var _=this._isModel(g)?g.attributes:g;if(e.parse)_=m.parse(_,e);m.set(_,e);if(d&&!f)f=m.hasChanged(v)}if(!h[m.cid]){h[m.cid]=true;s.push(m)}t[p]=m}else if(u){g=t[p]=this._prepareModel(g,e);if(g){a.push(g);this._addReference(g,e);h[g.cid]=true;s.push(g)}}}if(c){for(p=0;p<this.length;p++){g=this.models[p];if(!h[g.cid])o.push(g)}if(o.length)this._removeModels(o,e)}var y=false;var b=!d&&u&&c;if(s.length&&b){y=this.length!=s.length||i.some(this.models,function(t,e){return t!==s[e]});this.models.length=0;k(this.models,s,0);this.length=this.models.length}else if(a.length){if(d)f=true;k(this.models,a,n==null?this.length:n);this.length=this.models.length}if(f)this.sort({silent:true});if(!e.silent){for(p=0;p<a.length;p++){if(n!=null)e.index=n+p;g=a[p];g.trigger("add",g,this,e)}if(f||y)this.trigger("sort",this,e);if(a.length||o.length)this.trigger("update",this,e)}return r?t[0]:t},reset:function(t,e){e=e?i.clone(e):{};for(var r=0;r<this.models.length;r++){this._removeReference(this.models[r],e)}e.previousModels=this.models;this._reset();t=this.add(t,i.extend({silent:true},e));if(!e.silent)this.trigger("reset",this,e);return t},push:function(t,e){return this.add(t,i.extend({at:this.length},e))},pop:function(t){var e=this.at(this.length-1);return this.remove(e,t)},unshift:function(t,e){return this.add(t,i.extend({at:0},e))},shift:function(t){var e=this.at(0);return this.remove(e,t)},slice:function(){return s.apply(this.models,arguments)},get:function(t){if(t==null)return void 0;var e=this.modelId(this._isModel(t)?t.attributes:t);return this._byId[t]||this._byId[e]||this._byId[t.cid]},at:function(t){if(t<0)t+=this.length;return this.models[t]},where:function(t,e){return this[e?"find":"filter"](t)},findWhere:function(t){return this.where(t,true)},sort:function(t){var e=this.comparator;if(!e)throw new Error("Cannot sort a set without a comparator");t||(t={});var r=e.length;if(i.isFunction(e))e=i.bind(e,this);if(r===1||i.isString(e)){this.models=this.sortBy(e)}else{this.models.sort(e)}if(!t.silent)this.trigger("sort",this,t);return this},pluck:function(t){return i.invoke(this.models,"get",t)},fetch:function(t){t=i.extend({parse:true},t);var e=t.success;var r=this;t.success=function(i){var n=t.reset?"reset":"set";r[n](i,t);if(e)e.call(t.context,r,i,t);r.trigger("sync",r,i,t)};z(this,t);return this.sync("read",this,t)},create:function(t,e){e=e?i.clone(e):{};var r=e.wait;t=this._prepareModel(t,e);if(!t)return false;if(!r)this.add(t,e);var n=this;var s=e.success;e.success=function(t,e,i){if(r)n.add(t,i);if(s)s.call(i.context,t,e,i)};t.save(null,e);return t},parse:function(t,e){return t},clone:function(){return new this.constructor(this.models,{model:this.model,comparator:this.comparator})},modelId:function(t){return t[this.model.prototype.idAttribute||"id"]},_reset:function(){this.length=0;this.models=[];this._byId={}},_prepareModel:function(t,e){if(this._isModel(t)){if(!t.collection)t.collection=this;return t}e=e?i.clone(e):{};e.collection=this;var r=new this.model(t,e);if(!r.validationError)return r;this.trigger("invalid",this,r.validationError,e);return false},_removeModels:function(t,e){var i=[];for(var r=0;r<t.length;r++){var n=this.get(t[r]);if(!n)continue;var s=this.indexOf(n);this.models.splice(s,1);this.length--;if(!e.silent){e.index=s;n.trigger("remove",n,this,e)}i.push(n);this._removeReference(n,e)}return i.length?i:false},_isModel:function(t){return t instanceof y},_addReference:function(t,e){this._byId[t.cid]=t;var i=this.modelId(t.attributes);if(i!=null)this._byId[i]=t;t.on("all",this._onModelEvent,this)},_removeReference:function(t,e){delete this._byId[t.cid];var i=this.modelId(t.attributes);if(i!=null)delete this._byId[i];if(this===t.collection)delete t.collection;t.off("all",this._onModelEvent,this)},_onModelEvent:function(t,e,i,r){if((t==="add"||t==="remove")&&i!==this)return;if(t==="destroy")this.remove(e,r);if(t==="change"){var n=this.modelId(e.previousAttributes());var s=this.modelId(e.attributes);if(n!==s){if(n!=null)delete this._byId[n];if(s!=null)this._byId[s]=e}}this.trigger.apply(this,arguments)}});var S={forEach:3,each:3,map:3,collect:3,reduce:4,foldl:4,inject:4,reduceRight:4,foldr:4,find:3,detect:3,filter:3,select:3,reject:3,every:3,all:3,some:3,any:3,include:3,includes:3,contains:3,invoke:0,max:3,min:3,toArray:1,size:1,first:3,head:3,take:3,initial:3,rest:3,tail:3,drop:3,last:3,without:0,difference:0,indexOf:3,shuffle:1,lastIndexOf:3,isEmpty:1,chain:1,sample:3,partition:3,groupBy:3,countBy:3,sortBy:3,indexBy:3};o(x,S,"models");var I=e.View=function(t){this.cid=i.uniqueId("view");i.extend(this,i.pick(t,P));this._ensureElement();this.initialize.apply(this,arguments)};var T=/^(\S+)\s*(.*)$/;var P=["model","collection","el","id","attributes","className","tagName","events"];i.extend(I.prototype,l,{tagName:"div",$:function(t){return this.$el.find(t)},initialize:function(){},render:function(){return this},remove:function(){this._removeElement();this.stopListening();return this},_removeElement:function(){this.$el.remove()},setElement:function(t){this.undelegateEvents();this._setElement(t);this.delegateEvents();return this},_setElement:function(t){this.$el=t instanceof e.$?t:e.$(t);this.el=this.$el[0]},delegateEvents:function(t){t||(t=i.result(this,"events"));if(!t)return this;this.undelegateEvents();for(var e in t){var r=t[e];if(!i.isFunction(r))r=this[r];if(!r)continue;var n=e.match(T);this.delegate(n[1],n[2],i.bind(r,this))}return this},delegate:function(t,e,i){this.$el.on(t+".delegateEvents"+this.cid,e,i);return this},undelegateEvents:function(){if(this.$el)this.$el.off(".delegateEvents"+this.cid);return this},undelegate:function(t,e,i){this.$el.off(t+".delegateEvents"+this.cid,e,i);return this},_createElement:function(t){return document.createElement(t)},_ensureElement:function(){if(!this.el){var t=i.extend({},i.result(this,"attributes"));if(this.id)t.id=i.result(this,"id");if(this.className)t["class"]=i.result(this,"className");this.setElement(this._createElement(i.result(this,"tagName")));this._setAttributes(t)}else{this.setElement(i.result(this,"el"))}},_setAttributes:function(t){this.$el.attr(t)}});e.sync=function(t,r,n){var s=H[t];i.defaults(n||(n={}),{emulateHTTP:e.emulateHTTP,emulateJSON:e.emulateJSON});var a={type:s,dataType:"json"};if(!n.url){a.url=i.result(r,"url")||F()}if(n.data==null&&r&&(t==="create"||t==="update"||t==="patch")){a.contentType="application/json";a.data=JSON.stringify(n.attrs||r.toJSON(n))}if(n.emulateJSON){a.contentType="application/x-www-form-urlencoded";a.data=a.data?{model:a.data}:{}}if(n.emulateHTTP&&(s==="PUT"||s==="DELETE"||s==="PATCH")){a.type="POST";if(n.emulateJSON)a.data._method=s;var o=n.beforeSend;n.beforeSend=function(t){t.setRequestHeader("X-HTTP-Method-Override",s);if(o)return o.apply(this,arguments)}}if(a.type!=="GET"&&!n.emulateJSON){a.processData=false}var h=n.error;n.error=function(t,e,i){n.textStatus=e;n.errorThrown=i;if(h)h.call(n.context,t,e,i)};var u=n.xhr=e.ajax(i.extend(a,n));r.trigger("request",r,u,n);return u};var H={create:"POST",update:"PUT",patch:"PATCH","delete":"DELETE",read:"GET"};e.ajax=function(){return e.$.ajax.apply(e.$,arguments)};var $=e.Router=function(t){t||(t={});if(t.routes)this.routes=t.routes;this._bindRoutes();this.initialize.apply(this,arguments)};var A=/\((.*?)\)/g;var C=/(\(\?)?:\w+/g;var R=/\*\w+/g;var j=/[\-{}\[\]+?.,\\\^$|#\s]/g;i.extend($.prototype,l,{initialize:function(){},route:function(t,r,n){if(!i.isRegExp(t))t=this._routeToRegExp(t);if(i.isFunction(r)){n=r;r=""}if(!n)n=this[r];var s=this;e.history.route(t,function(i){var a=s._extractParameters(t,i);if(s.execute(n,a,r)!==false){s.trigger.apply(s,["route:"+r].concat(a));s.trigger("route",r,a);e.history.trigger("route",s,r,a)}});return this},execute:function(t,e,i){if(t)t.apply(this,e)},navigate:function(t,i){e.history.navigate(t,i);return this},_bindRoutes:function(){if(!this.routes)return;this.routes=i.result(this,"routes");var t,e=i.keys(this.routes);while((t=e.pop())!=null){this.route(t,this.routes[t])}},_routeToRegExp:function(t){t=t.replace(j,"\\$&").replace(A,"(?:$1)?").replace(C,function(t,e){return e?t:"([^/?]+)"}).replace(R,"([^?]*?)");return new RegExp("^"+t+"(?:\\?([\\s\\S]*))?$")},_extractParameters:function(t,e){var r=t.exec(e).slice(1);return i.map(r,function(t,e){if(e===r.length-1)return t||null;return t?decodeURIComponent(t):null})}});var M=e.History=function(){this.handlers=[];this.checkUrl=i.bind(this.checkUrl,this);if(typeof window!=="undefined"){this.location=window.location;this.history=window.history}};var N=/^[#\/]|\s+$/g;var O=/^\/+|\/+$/g;var U=/#.*$/;M.started=false;i.extend(M.prototype,l,{interval:50,atRoot:function(){var t=this.location.pathname.replace(/[^\/]$/,"$&/");return t===this.root&&!this.getSearch()},matchRoot:function(){var t=this.decodeFragment(this.location.pathname);var e=t.slice(0,this.root.length-1)+"/";return e===this.root},decodeFragment:function(t){return decodeURI(t.replace(/%25/g,"%2525"))},getSearch:function(){var t=this.location.href.replace(/#.*/,"").match(/\?.+/);return t?t[0]:""},getHash:function(t){var e=(t||this).location.href.match(/#(.*)$/);return e?e[1]:""},getPath:function(){var t=this.decodeFragment(this.location.pathname+this.getSearch()).slice(this.root.length-1);return t.charAt(0)==="/"?t.slice(1):t},getFragment:function(t){if(t==null){if(this._usePushState||!this._wantsHashChange){t=this.getPath()}else{t=this.getHash()}}return t.replace(N,"")},start:function(t){if(M.started)throw new Error("Backbone.history has already been started");M.started=true;this.options=i.extend({root:"/"},this.options,t);this.root=this.options.root;this._wantsHashChange=this.options.hashChange!==false;this._hasHashChange="onhashchange"in window&&(document.documentMode===void 0||document.documentMode>7);this._useHashChange=this._wantsHashChange&&this._hasHashChange;this._wantsPushState=!!this.options.pushState;this._hasPushState=!!(this.history&&this.history.pushState);this._usePushState=this._wantsPushState&&this._hasPushState;this.fragment=this.getFragment();this.root=("/"+this.root+"/").replace(O,"/");if(this._wantsHashChange&&this._wantsPushState){if(!this._hasPushState&&!this.atRoot()){var e=this.root.slice(0,-1)||"/";this.location.replace(e+"#"+this.getPath());return true}else if(this._hasPushState&&this.atRoot()){this.navigate(this.getHash(),{replace:true})}}if(!this._hasHashChange&&this._wantsHashChange&&!this._usePushState){this.iframe=document.createElement("iframe");this.iframe.src="javascript:0";this.iframe.style.display="none";this.iframe.tabIndex=-1;var r=document.body;var n=r.insertBefore(this.iframe,r.firstChild).contentWindow;n.document.open();n.document.close();n.location.hash="#"+this.fragment}var s=window.addEventListener||function(t,e){return attachEvent("on"+t,e)};if(this._usePushState){s("popstate",this.checkUrl,false)}else if(this._useHashChange&&!this.iframe){s("hashchange",this.checkUrl,false)}else if(this._wantsHashChange){this._checkUrlInterval=setInterval(this.checkUrl,this.interval)}if(!this.options.silent)return this.loadUrl()},stop:function(){var t=window.removeEventListener||function(t,e){return detachEvent("on"+t,e)};if(this._usePushState){t("popstate",this.checkUrl,false)}else if(this._useHashChange&&!this.iframe){t("hashchange",this.checkUrl,false)}if(this.iframe){document.body.removeChild(this.iframe);this.iframe=null}if(this._checkUrlInterval)clearInterval(this._checkUrlInterval);M.started=false},route:function(t,e){this.handlers.unshift({route:t,callback:e})},checkUrl:function(t){var e=this.getFragment();if(e===this.fragment&&this.iframe){e=this.getHash(this.iframe.contentWindow)}if(e===this.fragment)return false;if(this.iframe)this.navigate(e);this.loadUrl()},loadUrl:function(t){if(!this.matchRoot())return false;t=this.fragment=this.getFragment(t);return i.some(this.handlers,function(e){if(e.route.test(t)){e.callback(t);return true}})},navigate:function(t,e){if(!M.started)return false;if(!e||e===true)e={trigger:!!e};t=this.getFragment(t||"");var i=this.root;if(t===""||t.charAt(0)==="?"){i=i.slice(0,-1)||"/"}var r=i+t;t=this.decodeFragment(t.replace(U,""));if(this.fragment===t)return;this.fragment=t;if(this._usePushState){this.history[e.replace?"replaceState":"pushState"]({},document.title,r)}else if(this._wantsHashChange){this._updateHash(this.location,t,e.replace);if(this.iframe&&t!==this.getHash(this.iframe.contentWindow)){var n=this.iframe.contentWindow;if(!e.replace){n.document.open();n.document.close()}this._updateHash(n.location,t,e.replace)}}else{return this.location.assign(r)}if(e.trigger)return this.loadUrl(t)},_updateHash:function(t,e,i){if(i){var r=t.href.replace(/(javascript:|#).*$/,"");t.replace(r+"#"+e)}else{t.hash="#"+e}}});e.history=new M;var q=function(t,e){var r=this;var n;if(t&&i.has(t,"constructor")){n=t.constructor}else{n=function(){return r.apply(this,arguments)}}i.extend(n,r,e);var s=function(){this.constructor=n};s.prototype=r.prototype;n.prototype=new s;if(t)i.extend(n.prototype,t);n.__super__=r.prototype;return n};y.extend=x.extend=$.extend=I.extend=M.extend=q;var F=function(){throw new Error('A "url" property or function must be specified')};var z=function(t,e){var i=e.error;e.error=function(r){if(i)i.call(e.context,t,r,e);t.trigger("error",t,r,e)}};return e});
      //# sourceMappingURL=backbone-min.map
    }
  }, 'backbone');

  Module.createPackage('backbone.modelbinder', {
    'Backbone.ModelBinder': function (module, exports, require, global) {
      // Backbone.ModelBinder v1.1.0      
      // (c) 2015 Bart Wood      
      // Distributed Under MIT License      
            
      (function (factory) {      
          if (typeof define === 'function' && define.amd) {      
              // AMD. Register as an anonymous module.      
              define(['underscore', 'jquery', 'backbone'], factory);      
          } else if(typeof module !== 'undefined' && module.exports) {      
              // CommonJS      
              module.exports = factory(      
                  require('underscore'),      
                  require('jquery'),      
                  require('backbone')      
              );      
          } else {      
              // Browser globals      
              factory(_, jQuery, Backbone);      
          }      
      }(function(_, $, Backbone){      
            
          if(!Backbone){      
              throw 'Please include Backbone.js before Backbone.ModelBinder.js';      
          }      
            
          Backbone.ModelBinder = function(){      
              _.bindAll.apply(_, [this].concat(_.functions(this)));      
          };      
            
          // Static setter for class level options      
          Backbone.ModelBinder.SetOptions = function(options){      
              Backbone.ModelBinder.options = options;      
          };      
            
          // Current version of the library.      
          Backbone.ModelBinder.VERSION = '1.1.0';      
          Backbone.ModelBinder.Constants = {};      
          Backbone.ModelBinder.Constants.ModelToView = 'ModelToView';      
          Backbone.ModelBinder.Constants.ViewToModel = 'ViewToModel';      
            
          _.extend(Backbone.ModelBinder.prototype, {      
            
              bind:function (model, rootEl, attributeBindings, options) {      
                  this.unbind();      
            
                  this._model = model;      
                  this._rootEl = rootEl;      
                  this._setOptions(options);      
            
                  if (!this._model) this._throwException('model must be specified');      
                  if (!this._rootEl) this._throwException('rootEl must be specified');      
            
                  if(attributeBindings){      
                      // Create a deep clone of the attribute bindings      
                      this._attributeBindings = $.extend(true, {}, attributeBindings);      
            
                      this._initializeAttributeBindings();      
                      this._initializeElBindings();      
                  }      
                  else {      
                      this._initializeDefaultBindings();      
                  }      
            
                  this._bindModelToView();      
                  this._bindViewToModel();      
              },      
            
              bindCustomTriggers: function (model, rootEl, triggers, attributeBindings, modelSetOptions) {      
                  this._triggers = triggers;      
                  this.bind(model, rootEl, attributeBindings, modelSetOptions);      
              },      
            
              unbind:function () {      
                  this._unbindModelToView();      
                  this._unbindViewToModel();      
            
                  if(this._attributeBindings){      
                      delete this._attributeBindings;      
                      this._attributeBindings = undefined;      
                  }      
              },      
            
              _setOptions: function(options){      
                  this._options = _.extend({      
                      boundAttribute: 'name'      
                  }, Backbone.ModelBinder.options, options);      
            
                  // initialize default options      
                  if(!this._options['modelSetOptions']){      
                      this._options['modelSetOptions'] = {};      
                  }      
                  this._options['modelSetOptions'].changeSource = 'ModelBinder';      
            
                  if(!this._options['changeTriggers']){      
                      this._options['changeTriggers'] = {'': 'change', '[contenteditable]': 'blur'};      
                  }      
            
                  if(!this._options['initialCopyDirection']){      
                      this._options['initialCopyDirection'] = Backbone.ModelBinder.Constants.ModelToView;      
                  }      
              },      
            
              // Converts the input bindings, which might just be empty or strings, to binding objects      
              _initializeAttributeBindings:function () {      
                  var attributeBindingKey, inputBinding, attributeBinding, elementBindingCount, elementBinding;      
            
                  for (attributeBindingKey in this._attributeBindings) {      
                      inputBinding = this._attributeBindings[attributeBindingKey];      
            
                      if (_.isString(inputBinding)) {      
                          attributeBinding = {elementBindings: [{selector: inputBinding}]};      
                      }      
                      else if (_.isArray(inputBinding)) {      
                          attributeBinding = {elementBindings: inputBinding};      
                      }      
                      else if(_.isObject(inputBinding)){      
                          attributeBinding = {elementBindings: [inputBinding]};      
                      }      
                      else {      
                          this._throwException('Unsupported type passed to Model Binder ' + attributeBinding);      
                      }      
            
                      // Add a linkage from the element binding back to the attribute binding      
                      for(elementBindingCount = 0; elementBindingCount < attributeBinding.elementBindings.length; elementBindingCount++){      
                          elementBinding = attributeBinding.elementBindings[elementBindingCount];      
                          elementBinding.attributeBinding = attributeBinding;      
                      }      
            
                      attributeBinding.attributeName = attributeBindingKey;      
                      this._attributeBindings[attributeBindingKey] = attributeBinding;      
                  }      
              },      
            
              // If the bindings are not specified, the default binding is performed on the specified attribute, name by default      
              _initializeDefaultBindings: function(){      
                  var elCount, elsWithAttribute, matchedEl, name, attributeBinding;      
            
                  this._attributeBindings = {};      
                  elsWithAttribute = $('[' + this._options['boundAttribute'] + ']', this._rootEl);      
            
                  for(elCount = 0; elCount < elsWithAttribute.length; elCount++){      
                      matchedEl = elsWithAttribute[elCount];      
                      name = $(matchedEl).attr(this._options['boundAttribute']);      
            
                      // For elements like radio buttons we only want a single attribute binding with possibly multiple element bindings      
                      if(!this._attributeBindings[name]){      
                          attributeBinding =  {attributeName: name};      
                          attributeBinding.elementBindings = [{attributeBinding: attributeBinding, boundEls: [matchedEl]}];      
                          this._attributeBindings[name] = attributeBinding;      
                      }      
                      else{      
                          this._attributeBindings[name].elementBindings.push({attributeBinding: this._attributeBindings[name], boundEls: [matchedEl]});      
                      }      
                  }      
              },      
            
              _initializeElBindings:function () {      
                  var bindingKey, attributeBinding, bindingCount, elementBinding, foundEls, elCount, el;      
                  for (bindingKey in this._attributeBindings) {      
                      attributeBinding = this._attributeBindings[bindingKey];      
            
                      for (bindingCount = 0; bindingCount < attributeBinding.elementBindings.length; bindingCount++) {      
                          elementBinding = attributeBinding.elementBindings[bindingCount];      
                          if (elementBinding.selector === '') {      
                              foundEls = $(this._rootEl);      
                          }      
                          else {      
                              foundEls = $(elementBinding.selector, this._rootEl);      
                          }      
            
                          if (foundEls.length === 0) {      
                              this._throwException('Bad binding found. No elements returned for binding selector ' + elementBinding.selector);      
                          }      
                          else {      
                              elementBinding.boundEls = [];      
                              for (elCount = 0; elCount < foundEls.length; elCount++) {      
                                  el = foundEls[elCount];      
                                  elementBinding.boundEls.push(el);      
                              }      
                          }      
                      }      
                  }      
              },      
            
              _bindModelToView: function () {      
                  this._model.on('change', this._onModelChange, this);      
            
                  if(this._options['initialCopyDirection'] === Backbone.ModelBinder.Constants.ModelToView){      
                      this.copyModelAttributesToView();      
                  }      
              },      
            
              // attributesToCopy is an optional parameter - if empty, all attributes      
              // that are bound will be copied.  Otherwise, only attributeBindings specified      
              // in the attributesToCopy are copied.      
              copyModelAttributesToView: function(attributesToCopy){      
                  var attributeName, attributeBinding;      
            
                  for (attributeName in this._attributeBindings) {      
                      if(attributesToCopy === undefined || _.indexOf(attributesToCopy, attributeName) !== -1){      
                          attributeBinding = this._attributeBindings[attributeName];      
                          this._copyModelToView(attributeBinding);      
                      }      
                  }      
              },      
            
              copyViewValuesToModel: function(){      
                  var bindingKey, attributeBinding, bindingCount, elementBinding, elCount, el;      
                  for (bindingKey in this._attributeBindings) {      
                      attributeBinding = this._attributeBindings[bindingKey];      
            
                      for (bindingCount = 0; bindingCount < attributeBinding.elementBindings.length; bindingCount++) {      
                          elementBinding = attributeBinding.elementBindings[bindingCount];      
            
                          if(this._isBindingUserEditable(elementBinding)){      
                              if(this._isBindingRadioGroup(elementBinding)){      
                                  el = this._getRadioButtonGroupCheckedEl(elementBinding);      
                                  if(el){      
                                      this._copyViewToModel(elementBinding, el);      
                                  }      
                              }      
                              else {      
                                  for(elCount = 0; elCount < elementBinding.boundEls.length; elCount++){      
                                      el = $(elementBinding.boundEls[elCount]);      
                                      if(this._isElUserEditable(el)){      
                                          this._copyViewToModel(elementBinding, el);      
                                      }      
                                  }      
                              }      
                          }      
                      }      
                  }      
              },      
            
              _unbindModelToView: function(){      
                  if(this._model){      
                      this._model.off('change', this._onModelChange);      
                      this._model = undefined;      
                  }      
              },      
            
              _bindViewToModel: function () {      
                  _.each(this._options['changeTriggers'], function (event, selector) {      
                      $(this._rootEl).on(event, selector, this._onElChanged);      
                  }, this);      
            
                  if(this._options['initialCopyDirection'] === Backbone.ModelBinder.Constants.ViewToModel){      
                      this.copyViewValuesToModel();      
                  }      
              },      
            
              _unbindViewToModel: function () {      
                  if(this._options && this._options['changeTriggers']){      
                      _.each(this._options['changeTriggers'], function (event, selector) {      
                          $(this._rootEl).off(event, selector, this._onElChanged);      
                      }, this);      
                  }      
              },      
            
              _onElChanged:function (event) {      
                  var el, elBindings, elBindingCount, elBinding;      
            
                  el = $(event.target)[0];      
                  elBindings = this._getElBindings(el);      
            
                  for(elBindingCount = 0; elBindingCount < elBindings.length; elBindingCount++){      
                      elBinding = elBindings[elBindingCount];      
                      if (this._isBindingUserEditable(elBinding)) {      
                          this._copyViewToModel(elBinding, el);      
                      }      
                  }      
              },      
            
              _isBindingUserEditable: function(elBinding){      
                  return elBinding.elAttribute === undefined ||      
                      elBinding.elAttribute === 'text' ||      
                      elBinding.elAttribute === 'html';      
              },      
            
              _isElUserEditable: function(el){      
                  var isContentEditable = el.attr('contenteditable');      
                  return isContentEditable || el.is('input') || el.is('select') || el.is('textarea');      
              },      
            
              _isBindingRadioGroup: function(elBinding){      
                  var elCount, el;      
                  var isAllRadioButtons = elBinding.boundEls.length > 0;      
                  for(elCount = 0; elCount < elBinding.boundEls.length; elCount++){      
                      el = $(elBinding.boundEls[elCount]);      
                      if(el.attr('type') !== 'radio'){      
                          isAllRadioButtons = false;      
                          break;      
                      }      
                  }      
            
                  return isAllRadioButtons;      
              },      
            
              _getRadioButtonGroupCheckedEl: function(elBinding){      
                  var elCount, el;      
                  for(elCount = 0; elCount < elBinding.boundEls.length; elCount++){      
                      el = $(elBinding.boundEls[elCount]);      
                      if(el.attr('type') === 'radio' && el.prop('checked')){      
                          return el;      
                      }      
                  }      
            
                  return undefined;      
              },      
            
              _getElBindings:function (findEl) {      
                  var attributeName, attributeBinding, elementBindingCount, elementBinding, boundElCount, boundEl;      
                  var elBindings = [];      
            
                  for (attributeName in this._attributeBindings) {      
                      attributeBinding = this._attributeBindings[attributeName];      
            
                      for (elementBindingCount = 0; elementBindingCount < attributeBinding.elementBindings.length; elementBindingCount++) {      
                          elementBinding = attributeBinding.elementBindings[elementBindingCount];      
            
                          for (boundElCount = 0; boundElCount < elementBinding.boundEls.length; boundElCount++) {      
                              boundEl = elementBinding.boundEls[boundElCount];      
            
                              if (boundEl === findEl) {      
                                  elBindings.push(elementBinding);      
                              }      
                          }      
                      }      
                  }      
            
                  return elBindings;      
              },      
            
              _onModelChange:function () {      
                  var changedAttribute, attributeBinding;      
            
                  for (changedAttribute in this._model.changedAttributes()) {      
                      attributeBinding = this._attributeBindings[changedAttribute];      
            
                      if (attributeBinding) {      
                          this._copyModelToView(attributeBinding);      
                      }      
                  }      
              },      
            
              _copyModelToView:function (attributeBinding) {      
                  var elementBindingCount, elementBinding, boundElCount, boundEl, value, convertedValue;      
            
                  value = this._model.get(attributeBinding.attributeName);      
            
                  for (elementBindingCount = 0; elementBindingCount < attributeBinding.elementBindings.length; elementBindingCount++) {      
                      elementBinding = attributeBinding.elementBindings[elementBindingCount];      
            
                      for (boundElCount = 0; boundElCount < elementBinding.boundEls.length; boundElCount++) {      
                          boundEl = elementBinding.boundEls[boundElCount];      
            
                          if(!boundEl._isSetting){      
                              convertedValue = this._getConvertedValue(Backbone.ModelBinder.Constants.ModelToView, elementBinding, value);      
                              this._setEl($(boundEl), elementBinding, convertedValue);      
                          }      
                      }      
                  }      
              },      
            
              _setEl: function (el, elementBinding, convertedValue) {      
                  if (elementBinding.elAttribute) {      
                      this._setElAttribute(el, elementBinding, convertedValue);      
                  }      
                  else {      
                      this._setElValue(el, convertedValue);      
                  }      
              },      
            
              _setElAttribute:function (el, elementBinding, convertedValue) {      
                  switch (elementBinding.elAttribute) {      
                      case 'html':      
                          el.html(convertedValue);      
                          break;      
                      case 'text':      
                          el.text(convertedValue);      
                          break;      
                      case 'enabled':      
                          el.prop('disabled', !convertedValue);      
                          break;      
                      case 'displayed':      
                          el[convertedValue ? 'show' : 'hide']();      
                          break;      
                      case 'hidden':      
                          el[convertedValue ? 'hide' : 'show']();      
                          break;      
                      case 'css':      
                          el.css(elementBinding.cssAttribute, convertedValue);      
                          break;      
                      case 'class':      
                          var previousValue = this._model.previous(elementBinding.attributeBinding.attributeName);      
                          var currentValue = this._model.get(elementBinding.attributeBinding.attributeName);      
                          // is current value is now defined then remove the class the may have been set for the undefined value      
                          if(!_.isUndefined(previousValue) || !_.isUndefined(currentValue)){      
                              previousValue = this._getConvertedValue(Backbone.ModelBinder.Constants.ModelToView, elementBinding, previousValue);      
                              el.removeClass(previousValue);      
                          }      
            
                          if(convertedValue){      
                              el.addClass(convertedValue);      
                          }      
                          break;      
                      default:      
                          el.attr(elementBinding.elAttribute, convertedValue);      
                  }      
              },      
            
              _setElValue:function (el, convertedValue) {      
                  if(el.attr('type')){      
                      switch (el.attr('type')) {      
                          case 'radio':      
                              el.prop('checked', el.val() === convertedValue);      
                              break;      
                          case 'checkbox':      
                               el.prop('checked', !!convertedValue);      
                              break;      
                          case 'file':      
                              break;      
                          default:      
                              el.val(convertedValue);      
                      }      
                  }      
                  else if(el.is('input') || el.is('select') || el.is('textarea')){      
                      el.val(convertedValue || (convertedValue === 0 ? '0' : ''));      
                  }      
                  else {      
                      el.text(convertedValue || (convertedValue === 0 ? '0' : ''));      
                  }      
              },      
            
              _copyViewToModel: function (elementBinding, el) {      
                  var result, value, convertedValue;      
            
                  if (!el._isSetting) {      
            
                      el._isSetting = true;      
                      result = this._setModel(elementBinding, $(el));      
                      el._isSetting = false;      
            
                      if(result && elementBinding.converter){      
                          value = this._model.get(elementBinding.attributeBinding.attributeName);      
                          convertedValue = this._getConvertedValue(Backbone.ModelBinder.Constants.ModelToView, elementBinding, value);      
                          this._setEl($(el), elementBinding, convertedValue);      
                      }      
                  }      
              },      
            
              _getElValue: function(elementBinding, el){      
                  switch (el.attr('type')) {      
                      case 'checkbox':      
                          return el.prop('checked') ? true : false;      
                      default:      
                          if(el.attr('contenteditable') !== undefined){      
                              return el.html();      
                          }      
                          else {      
                              return el.val();      
                          }      
                  }      
              },      
            
              _setModel: function (elementBinding, el) {      
                  var data = {};      
                  var elVal = this._getElValue(elementBinding, el);      
                  elVal = this._getConvertedValue(Backbone.ModelBinder.Constants.ViewToModel, elementBinding, elVal);      
                  data[elementBinding.attributeBinding.attributeName] = elVal;      
                  return this._model.set(data,  this._options['modelSetOptions']);      
              },      
            
              _getConvertedValue: function (direction, elementBinding, value) {      
            
                  if (elementBinding.converter) {      
                      value = elementBinding.converter(direction, value, elementBinding.attributeBinding.attributeName, this._model, elementBinding.boundEls);      
                  }      
                  else if(this._options['converter']){      
                      value = this._options['converter'](direction, value, elementBinding.attributeBinding.attributeName, this._model, elementBinding.boundEls);      
                  }      
            
                  return value;      
              },      
            
              _throwException: function(message){      
                  if(this._options.suppressThrows){      
                      if(typeof(console) !== 'undefined' && console.error){      
                          console.error(message);      
                      }      
                  }      
                  else {      
                      throw message;      
                  }      
              }      
          });      
            
          Backbone.ModelBinder.CollectionConverter = function(collection){      
              this._collection = collection;      
            
              if(!this._collection){      
                  throw 'Collection must be defined';      
              }      
              _.bindAll(this, 'convert');      
          };      
            
          _.extend(Backbone.ModelBinder.CollectionConverter.prototype, {      
              convert: function(direction, value){      
                  if (direction === Backbone.ModelBinder.Constants.ModelToView) {      
                      return value ? value.id : undefined;      
                  }      
                  else {      
                      return this._collection.get(value);      
                  }      
              }      
          });      
            
          // A static helper function to create a default set of bindings that you can customize before calling the bind() function      
          // rootEl - where to find all of the bound elements      
          // attributeType - probably 'name' or 'id' in most cases      
          // converter(optional) - the default converter you want applied to all your bindings      
          // elAttribute(optional) - the default elAttribute you want applied to all your bindings      
          Backbone.ModelBinder.createDefaultBindings = function(rootEl, attributeType, converter, elAttribute){      
              var foundEls, elCount, foundEl, attributeName;      
              var bindings = {};      
            
              foundEls = $('[' + attributeType + ']', rootEl);      
            
              for(elCount = 0; elCount < foundEls.length; elCount++){      
                  foundEl = foundEls[elCount];      
                  attributeName = $(foundEl).attr(attributeType);      
            
                  if(!bindings[attributeName]){      
                      var attributeBinding =  {selector: '[' + attributeType + '="' + attributeName + '"]'};      
                      bindings[attributeName] = attributeBinding;      
            
                      if(converter){      
                          bindings[attributeName].converter = converter;      
                      }      
            
                      if(elAttribute){      
                          bindings[attributeName].elAttribute = elAttribute;      
                      }      
                  }      
              }      
            
              return bindings;      
          };      
            
          // Helps you to combine 2 sets of bindings      
          Backbone.ModelBinder.combineBindings = function(destination, source){      
              _.each(source, function(value, key){      
                  var elementBinding = {selector: value.selector};      
            
                  if(value.converter){      
                      elementBinding.converter = value.converter;      
                  }      
            
                  if(value.elAttribute){      
                      elementBinding.elAttribute = value.elAttribute;      
                  }      
            
                  if(!destination[key]){      
                      destination[key] = elementBinding;      
                  }      
                  else {      
                      destination[key] = [destination[key], elementBinding];      
                  }      
              });      
            
              return destination;      
          };      
            
            
          return Backbone.ModelBinder;      
            
      }));      
      
    },
    'Backbone.CollectionBinder': function (module, exports, require, global) {
      // Backbone.CollectionBinder v1.1.0      
      // (c) 2015 Bart Wood      
      // Distributed Under MIT License      
            
      (function (factory) {      
          if (typeof define === 'function' && define.amd) {      
              // AMD. Register as an anonymous module.      
              define(['underscore', 'jquery', 'backbone', 'Backbone.ModelBinder'], factory);      
          }      
          else if(typeof module !== 'undefined' && module.exports) {      
              // CommonJS      
              module.exports = factory(      
                  require('underscore'),      
                  require('jquery'),      
                  require('backbone')      
              );      
          }      
          else {      
              // Browser globals      
              factory(_, $, Backbone);      
          }      
      }      
      (function(_, $, Backbone){      
            
          if(!Backbone){      
              throw 'Please include Backbone.js before Backbone.ModelBinder.js';      
          }      
            
          if(!Backbone.ModelBinder){      
              throw 'Please include Backbone.ModelBinder.js before Backbone.CollectionBinder.js';      
          }      
            
          Backbone.CollectionBinder = function(elManagerFactory, options){      
              _.bindAll.apply(_, [this].concat(_.functions(this)));      
              this._elManagers = {};      
            
              this._elManagerFactory = elManagerFactory;      
              if(!this._elManagerFactory) throw 'elManagerFactory must be defined.';      
            
              // Let the factory just use the trigger function on the view binder      
              this._elManagerFactory.trigger = this.trigger;      
            
              this._options = _.extend({}, Backbone.CollectionBinder.options, options);      
          };      
            
          // Static setter for class level options      
          Backbone.CollectionBinder.SetOptions = function(options){      
              Backbone.CollectionBinder.options = options;      
          };      
            
          Backbone.CollectionBinder.VERSION = '1.1.0';      
            
          _.extend(Backbone.CollectionBinder.prototype, Backbone.Events, {      
              bind: function(collection, parentEl){      
                  this.unbind();      
            
                  if(!collection) throw 'collection must be defined';      
                  if(!parentEl) throw 'parentEl must be defined';      
            
                  this._collection = collection;      
                  this._elManagerFactory._setParentEl(parentEl);      
            
                  this._onCollectionReset();      
            
                  this._collection.on('add', this._onCollectionAdd, this);      
                  this._collection.on('remove', this._onCollectionRemove, this);      
                  this._collection.on('reset', this._onCollectionReset, this);      
                  this._collection.on('sort', this._onCollectionSort, this);      
              },      
            
              unbind: function(){      
                  if(this._collection !== undefined){      
                      this._collection.off('add', this._onCollectionAdd);      
                      this._collection.off('remove', this._onCollectionRemove);      
                      this._collection.off('reset', this._onCollectionReset);      
                      this._collection.off('sort', this._onCollectionSort);      
                  }      
            
                  this._removeAllElManagers();      
              },      
            
              getManagerForEl: function(el){      
                  var i, elManager, elManagers = _.values(this._elManagers);      
            
                  for(i = 0; i < elManagers.length; i++){      
                      elManager = elManagers[i];      
            
                      if(elManager.isElContained(el)){      
                          return elManager;      
                      }      
                  }      
            
                  return undefined;      
              },      
            
              getManagerForModel: function(model){      
                 return this._elManagers[_.isObject(model)? model.cid : model];      
              },      
            
              _onCollectionAdd: function(model, collection, options){      
                  var manager = this._elManagers[model.cid] = this._elManagerFactory.makeElManager(model);      
                  manager.createEl();      
            
                  var position = options && options.at;      
            
                  if (this._options['autoSort'] && position != null && position < this._collection.length - 1) {      
                      this._moveElToPosition(manager.getEl(), position);      
                  }      
              },      
            
              _onCollectionRemove: function(model){      
                  this._removeElManager(model);      
              },      
            
              _onCollectionReset: function(){      
                  this._removeAllElManagers();      
            
                  this._collection.each(function(model){      
                      this._onCollectionAdd(model);      
                  }, this);      
            
                  this.trigger('elsReset', this._collection);      
              },      
            
              _onCollectionSort: function() {      
                  if(this._options['autoSort']){      
                      this.sortRootEls();      
                  }      
              },      
            
              _removeAllElManagers: function(){      
                  _.each(this._elManagers, function(elManager){      
                      elManager.removeEl();      
                      delete this._elManagers[elManager._model.cid];      
                  }, this);      
            
                  delete this._elManagers;      
                  this._elManagers = {};      
              },      
            
              _removeElManager: function(model){      
                  if(this._elManagers[model.cid] !== undefined){      
                      this._elManagers[model.cid].removeEl();      
                      delete this._elManagers[model.cid];      
                  }      
              },      
            
              _moveElToPosition: function (modelEl, position) {      
                  var nextModel = this._collection.at(position + 1);      
                  if (!nextModel) return;      
            
                  var nextManager = this.getManagerForModel(nextModel);      
                  if (!nextManager) return;      
            
                  var nextEl = nextManager.getEl();      
                  if (!nextEl) return;      
            
                  modelEl.detach();      
                  modelEl.insertBefore(nextEl);      
              },      
            
              sortRootEls: function(){      
                  this._collection.each(function(model, modelIndex){      
                      var modelElManager = this.getManagerForModel(model);      
                      if(modelElManager){      
                          var modelEl = modelElManager.getEl();      
                          var currentRootEls = $(this._elManagerFactory._getParentEl()).children();      
            
                          if(currentRootEls[modelIndex] !== modelEl[0]){      
                              modelEl.detach();      
                              modelEl.insertBefore(currentRootEls[modelIndex]);      
                          }      
                      }      
                  }, this);      
              }      
          });      
            
          // The ElManagerFactory is used for els that are just html templates      
          // elHtml - how the model's html will be rendered.  Must have a single root element (div,span).      
          // bindings (optional) - either a string which is the binding attribute (name, id, data-name, etc.) or a normal bindings hash      
          Backbone.CollectionBinder.ElManagerFactory = function(elHtml, bindings){      
              _.bindAll.apply(_, [this].concat(_.functions(this)));      
            
              this._elHtml = elHtml;      
              this._bindings = bindings;      
            
              if(!_.isFunction(this._elHtml) && ! _.isString(this._elHtml)) throw 'elHtml must be a compliled template or an html string';      
          };      
            
          _.extend(Backbone.CollectionBinder.ElManagerFactory.prototype, {      
              _setParentEl: function(parentEl){      
                  this._parentEl = parentEl;      
              },      
            
              _getParentEl: function(){      
                  return this._parentEl;      
              },      
            
              makeElManager: function(model){      
            
                  var elManager = {      
                      _model: model,      
            
                      createEl: function(){      
                          this._el = _.isFunction(this._elHtml) ? $(this._elHtml({model: this._model.toJSON()})) : $(this._elHtml);      
                          $(this._parentEl).append(this._el);      
            
                          if(this._bindings){      
                              if(_.isString(this._bindings)){      
                                  this._modelBinder = new Backbone.ModelBinder();      
                                  this._modelBinder.bind(this._model, this._el, Backbone.ModelBinder.createDefaultBindings(this._el, this._bindings));      
                              }      
                              else if(_.isObject(this._bindings)){      
                                  this._modelBinder = new Backbone.ModelBinder();      
                                  this._modelBinder.bind(this._model, this._el, this._bindings);      
                              }      
                              else {      
                                  throw 'Unsupported bindings type, please use a boolean or a bindings hash';      
                              }      
                          }      
            
                          this.trigger('elCreated', this._model, this._el);      
                      },      
            
                      removeEl: function(){      
                          if(this._modelBinder !== undefined){      
                              this._modelBinder.unbind();      
                          }      
            
                          this._el.remove();      
                          this.trigger('elRemoved', this._model, this._el);      
                      },      
            
                      isElContained: function(findEl){      
                          return this._el === findEl || $(this._el).has(findEl).length > 0;      
                      },      
            
                      getModel: function(){      
                          return this._model;      
                      },      
            
                      getEl: function(){      
                          return this._el;      
                      }      
                  };      
            
                  _.extend(elManager, this);      
                  return elManager;      
              }      
          });      
            
            
          // The ViewManagerFactory is used for els that are created and owned by backbone views.      
          // There is no bindings option because the view made by the viewCreator should take care of any binding      
          // viewCreator - a callback that will create backbone view instances for a model passed to the callback      
          Backbone.CollectionBinder.ViewManagerFactory = function(viewCreator){      
              _.bindAll.apply(_, [this].concat(_.functions(this)));      
              this._viewCreator = viewCreator;      
            
              if(!_.isFunction(this._viewCreator)) throw 'viewCreator must be a valid function that accepts a model and returns a backbone view';      
          };      
            
          _.extend(Backbone.CollectionBinder.ViewManagerFactory.prototype, {      
              _setParentEl: function(parentEl){      
                  this._parentEl = parentEl;      
              },      
            
              _getParentEl: function(){      
                  return this._parentEl;      
              },      
            
              makeElManager: function(model){      
                  var elManager = {      
            
                      _model: model,      
            
                      createEl: function(){      
                          this._view = this._viewCreator(model);      
                          this._view.render(this._model);      
                          $(this._parentEl).append(this._view.el);      
            
                          this.trigger('elCreated', this._model, this._view);      
                      },      
            
                      removeEl: function(){      
                          if(this._view.close !== undefined){      
                              this._view.close();      
                          }      
                          else {      
                              this._view.$el.remove();      
                              console && console.log && console.log('warning, you should implement a close() function for your view, you might end up with zombies');      
                          }      
            
                          this.trigger('elRemoved', this._model, this._view);      
                      },      
            
                      isElContained: function(findEl){      
                          return this._view.el === findEl || this._view.$el.has(findEl).length > 0;      
                      },      
            
                      getModel: function(){      
                          return this._model;      
                      },      
            
                      getView: function(){      
                          return this._view;      
                      },      
            
                      getEl: function(){      
                          return this._view.$el;      
                      }      
                  };      
            
                  _.extend(elManager, this);      
            
                  return elManager;      
              }      
          });      
            
      }));      
      
    }
  }, 'Backbone.ModelBinder');

  Module.createPackage('backbone.epoxy', {
    'backbone.epoxy': function (module, exports, require, global) {
      // Backbone.Epoxy
      
      // (c) 2015 Greg MacWilliam
      // Freely distributed under the MIT license
      // For usage and documentation:
      // http://epoxyjs.org
      
      (function(root, factory) {
      
        if (typeof exports !== 'undefined') {
          // Define as CommonJS export:
          module.exports = factory(require("underscore"), require("backbone"));
        } else if (typeof define === 'function' && define.amd) {
          // Define as AMD:
          define(["underscore", "backbone"], factory);
        } else {
          // Just run it:
          factory(root._, root.Backbone);
        }
      
      }(this, function(_, Backbone) {
      
        // Epoxy namespace:
        var Epoxy = Backbone.Epoxy = {};
      
        // Object-type utils:
        var array = Array.prototype;
        var isUndefined = _.isUndefined;
        var isFunction = _.isFunction;
        var isObject = _.isObject;
        var isArray = _.isArray;
        var isModel = function(obj) { return obj instanceof Backbone.Model; };
        var isCollection = function(obj) { return obj instanceof Backbone.Collection; };
        var blankMethod = function() {};
      
        // Static mixins API:
        // added as a static member to Epoxy class objects (Model & View);
        // generates a set of class attributes for mixin with other objects.
        var mixins = {
          mixin: function(extend) {
            extend = extend || {};
      
            for (var i in this.prototype) {
              // Skip override on pre-defined binding declarations:
              if (i === 'bindings' && extend.bindings) continue;
      
              // Assimilate non-constructor Epoxy prototype properties onto extended object:
              if (this.prototype.hasOwnProperty(i) && i !== 'constructor') {
                extend[i] = this.prototype[i];
              }
            }
            return extend;
          }
        };
      
        // Calls method implementations of a super-class object:
        function _super(instance, method, args) {
          return instance._super.prototype[method].apply(instance, args);
        }
      
        // Epoxy.Model
        // -----------
        var modelMap;
        var modelProps = ['computeds'];
      
        Epoxy.Model = Backbone.Model.extend({
          _super: Backbone.Model,
      
          // Backbone.Model constructor override:
          // configures computed model attributes around the underlying native Backbone model.
          constructor: function(attributes, options) {
            _.extend(this, _.pick(options||{}, modelProps));
            _super(this, 'constructor', arguments);
            this.initComputeds(this.attributes, options);
          },
      
          // Gets a copy of a model attribute value:
          // Array and Object values will return a shallow copy,
          // primitive values will be returned directly.
          getCopy: function(attribute) {
            return _.clone(this.get(attribute));
          },
      
          // Backbone.Model.get() override:
          // provides access to computed attributes,
          // and maps computed dependency references while establishing bindings.
          get: function(attribute) {
      
            // Automatically register bindings while building out computed dependency graphs:
            modelMap && modelMap.push(['change:'+attribute, this]);
      
            // Return a computed property value, if available:
            if (this.hasComputed(attribute)) {
              return this.c()[ attribute ].get();
            }
      
            // Default to native Backbone.Model get operation:
            return _super(this, 'get', arguments);
          },
      
          // Backbone.Model.set() override:
          // will process any computed attribute setters,
          // and then pass along all results to the underlying model.
          set: function(key, value, options) {
            var params = key;
      
            // Convert key/value arguments into {key:value} format:
            if (params && !isObject(params)) {
              params = {};
              params[ key ] = value;
            } else {
              options = value;
            }
      
            // Default options definition:
            options = options || {};
      
            // Create store for capturing computed change events:
            var computedEvents = this._setting = [];
      
            // Attempt to set computed attributes while not unsetting:
            if (!options.unset) {
              // All param properties are tested against computed setters,
              // properties set to computeds will be removed from the params table.
              // Optionally, an computed setter may return key/value pairs to be merged into the set.
              params = deepModelSet(this, params, {}, []);
            }
      
            // Remove computed change events store:
            delete this._setting;
      
            // Pass all resulting set params along to the underlying Backbone Model.
            var result = _super(this, 'set', [params, options]);
      
            // Dispatch all outstanding computed events:
            if (!options.silent) {
              // Make sure computeds get a "change" event:
              if (!this.hasChanged() && computedEvents.length) {
                this.trigger('change', this);
              }
      
              // Trigger each individual computed attribute change:
              // NOTE: computeds now officially fire AFTER basic "change"...
              // We can't really fire them earlier without duplicating the Backbone "set" method here.
              _.each(computedEvents, function(evt) {
                this.trigger.apply(this, evt);
              }, this);
            }
            return result;
          },
      
          // Backbone.Model.toJSON() override:
          // adds a 'computed' option, specifying to include computed attributes.
          toJSON: function(options) {
            var json = _super(this, 'toJSON', arguments);
      
            if (options && options.computed) {
              _.each(this.c(), function(computed, attribute) {
                json[ attribute ] = computed.value;
              });
            }
      
            return json;
          },
      
          // Backbone.Model.destroy() override:
          // clears all computed attributes before destroying.
          destroy: function() {
            this.clearComputeds();
            return _super(this, 'destroy', arguments);
          },
      
          // Computed namespace manager:
          // Allows the model to operate as a mixin.
          c: function() {
            return this._c || (this._c = {});
          },
      
          // Initializes the Epoxy model:
          // called automatically by the native constructor,
          // or may be called manually when adding Epoxy as a mixin.
          initComputeds: function(attributes, options) {
            this.clearComputeds();
      
            // Resolve computeds hash, and extend it with any preset attribute keys:
            // TODO: write test.
            var computeds = _.result(this, 'computeds')||{};
            computeds = _.extend(computeds, _.pick(attributes||{}, _.keys(computeds)));
      
            // Add all computed attributes:
            _.each(computeds, function(params, attribute) {
              params._init = 1;
              this.addComputed(attribute, params);
            }, this);
      
            // Initialize all computed attributes:
            // all presets have been constructed and may reference each other now.
            _.invoke(this.c(), 'init');
          },
      
          // Adds a computed attribute to the model:
          // computed attribute will assemble and return customized values.
          // @param attribute (string)
          // @param getter (function) OR params (object)
          // @param [setter (function)]
          // @param [dependencies ...]
          addComputed: function(attribute, getter, setter) {
            this.removeComputed(attribute);
      
            var params = getter;
            var delayInit = params._init;
      
            // Test if getter and/or setter are provided:
            if (isFunction(getter)) {
              var depsIndex = 2;
      
              // Add getter param:
              params = {};
              params._get = getter;
      
              // Test for setter param:
              if (isFunction(setter)) {
                params._set = setter;
                depsIndex++;
              }
      
              // Collect all additional arguments as dependency definitions:
              params.deps = array.slice.call(arguments, depsIndex);
            }
      
            // Create a new computed attribute:
            this.c()[ attribute ] = new EpoxyComputedModel(this, attribute, params, delayInit);
            return this;
          },
      
          // Tests the model for a computed attribute definition:
          hasComputed: function(attribute) {
            return this.c().hasOwnProperty(attribute);
          },
      
          // Removes an computed attribute from the model:
          removeComputed: function(attribute) {
            if (this.hasComputed(attribute)) {
              this.c()[ attribute ].dispose();
              delete this.c()[ attribute ];
            }
            return this;
          },
      
          // Removes all computed attributes:
          clearComputeds: function() {
            for (var attribute in this.c()) {
              this.removeComputed(attribute);
            }
            return this;
          },
      
          // Internal array value modifier:
          // performs array ops on a stored array value, then fires change.
          // No action is taken if the specified attribute value is not an array.
          modifyArray: function(attribute, method, options) {
            var obj = this.get(attribute);
      
            if (isArray(obj) && isFunction(array[method])) {
              var args = array.slice.call(arguments, 2);
              var result = array[ method ].apply(obj, args);
              options = options || {};
      
              if (!options.silent) {
                this.trigger('change:'+attribute+' change', this, array, options);
              }
              return result;
            }
            return null;
          },
      
          // Internal object value modifier:
          // sets new property values on a stored object value, then fires change.
          // No action is taken if the specified attribute value is not an object.
          modifyObject: function(attribute, property, value, options) {
            var obj = this.get(attribute);
            var change = false;
      
            // If property is Object:
            if (isObject(obj)) {
      
              options = options || {};
      
              // Delete existing property in response to undefined values:
              if (isUndefined(value) && obj.hasOwnProperty(property)) {
                delete obj[property];
                change = true;
              }
              // Set new and/or changed property values:
              else if (obj[ property ] !== value) {
                obj[ property ] = value;
                change = true;
              }
      
              // Trigger model change:
              if (change && !options.silent) {
                this.trigger('change:'+attribute+' change', this, obj, options);
              }
      
              // Return the modified object:
              return obj;
            }
            return null;
          }
        }, mixins);
      
        // Epoxy.Model -> Private
        // ----------------------
      
        // Model deep-setter:
        // Attempts to set a collection of key/value attribute pairs to computed attributes.
        // Observable setters may digest values, and then return mutated key/value pairs for inclusion into the set operation.
        // Values returned from computed setters will be recursively deep-set, allowing computeds to set other computeds.
        // The final collection of resolved key/value pairs (after setting all computeds) will be returned to the native model.
        // @param model: target Epoxy model on which to operate.
        // @param toSet: an object of key/value pairs to attempt to set within the computed model.
        // @param toReturn: resolved non-ovservable attribute values to be returned back to the native model.
        // @param trace: property stack trace (prevents circular setter loops).
        function deepModelSet(model, toSet, toReturn, stack) {
      
          // Loop through all setter properties:
          for (var attribute in toSet) {
            if (toSet.hasOwnProperty(attribute)) {
      
              // Pull each setter value:
              var value = toSet[ attribute ];
      
              if (model.hasComputed(attribute)) {
      
                // Has a computed attribute:
                // comfirm attribute does not already exist within the stack trace.
                if (!stack.length || !_.contains(stack, attribute)) {
      
                  // Non-recursive:
                  // set and collect value from computed attribute.
                  value = model.c()[attribute].set(value);
      
                  // Recursively set new values for a returned params object:
                  // creates a new copy of the stack trace for each new search branch.
                  if (value && isObject(value)) {
                    toReturn = deepModelSet(model, value, toReturn, stack.concat(attribute));
                  }
      
                } else {
                  // Recursive:
                  // Throw circular reference error.
                  throw('Recursive setter: '+stack.join(' > '));
                }
      
              } else {
                // No computed attribute:
                // set the value to the keeper values.
                toReturn[ attribute ] = value;
              }
            }
          }
      
          return toReturn;
        }
      
      
        // Epoxy.Model -> Computed
        // -----------------------
        // Computed objects store model values independently from the model's attributes table.
        // Computeds define custom getter/setter functions to manage their value.
      
        function EpoxyComputedModel(model, name, params, delayInit) {
          params = params || {};
      
          // Rewrite getter param:
          if (params.get && isFunction(params.get)) {
            params._get = params.get;
          }
      
          // Rewrite setter param:
          if (params.set && isFunction(params.set)) {
            params._set = params.set;
          }
      
          // Prohibit override of 'get()' and 'set()', then extend:
          delete params.get;
          delete params.set;
          _.extend(this, params);
      
          // Set model, name, and default dependencies array:
          this.model = model;
          this.name = name;
          this.deps = this.deps || [];
      
          // Skip init while parent model is initializing:
          // Model will initialize in two passes...
          // the first pass sets up all computed attributes,
          // then the second pass initializes all bindings.
          if (!delayInit) this.init();
        }
      
        _.extend(EpoxyComputedModel.prototype, Backbone.Events, {
      
          // Initializes the computed's value and bindings:
          // this method is called independently from the object constructor,
          // allowing computeds to build and initialize in two passes by the parent model.
          init: function() {
      
            // Configure dependency map, then update the computed's value:
            // All Epoxy.Model attributes accessed while getting the initial value
            // will automatically register themselves within the model bindings map.
            var bindings = {};
            var deps = modelMap = [];
            this.get(true);
            modelMap = null;
      
            // If the computed has dependencies, then proceed to binding it:
            if (deps.length) {
      
              // Compile normalized bindings table:
              // Ultimately, we want a table of event types, each with an array of their associated targets:
              // {'change:name':[<model1>], 'change:status':[<model1>,<model2>]}
      
              // Compile normalized bindings map:
              _.each(deps, function(value) {
                var attribute = value[0];
                var target = value[1];
      
                // Populate event target arrays:
                if (!bindings[attribute]) {
                  bindings[attribute] = [ target ];
      
                } else if (!_.contains(bindings[attribute], target)) {
                  bindings[attribute].push(target);
                }
              });
      
              // Bind all event declarations to their respective targets:
              _.each(bindings, function(targets, binding) {
                for (var i=0, len=targets.length; i < len; i++) {
                  this.listenTo(targets[i], binding, _.bind(this.get, this, true));
                }
              }, this);
            }
          },
      
          // Gets an attribute value from the parent model.
          val: function(attribute) {
            return this.model.get(attribute);
          },
      
          // Gets the computed's current value:
          // Computed values flagged as dirty will need to regenerate themselves.
          // Note: 'update' is strongly checked as TRUE to prevent unintended arguments (handler events, etc) from qualifying.
          get: function(update) {
            if (update === true && this._get) {
              var val = this._get.apply(this.model, _.map(this.deps, this.val, this));
              this.change(val);
            }
            return this.value;
          },
      
          // Sets the computed's current value:
          // computed values (have a custom getter method) require a custom setter.
          // Custom setters should return an object of key/values pairs;
          // key/value pairs returned to the parent model will be merged into its main .set() operation.
          set: function(val) {
            if (this._get) {
              if (this._set) return this._set.apply(this.model, arguments);
              else throw('Cannot set read-only computed attribute.');
            }
            this.change(val);
            return null;
          },
      
          // Changes the computed's value:
          // new values are cached, then fire an update event.
          change: function(value) {
            if (!_.isEqual(value, this.value)) {
              this.value = value;
              var evt = ['change:'+this.name, this.model, value];
      
              if (this.model._setting) {
                this.model._setting.push(evt);
              } else {
                evt[0] += ' change';
                this.model.trigger.apply(this.model, evt);
              }
            }
          },
      
          // Disposal:
          // cleans up events and releases references.
          dispose: function() {
            this.stopListening();
            this.off();
            this.model = this.value = null;
          }
        });
      
      
        // Epoxy.binding -> Binding API
        // ----------------------------
      
        var bindingSettings = {
          optionText: 'label',
          optionValue: 'value'
        };
      
      
        // Cache for storing binding parser functions:
        // Cuts down on redundancy when building repetitive binding views.
        var bindingCache = {};
      
      
        // Reads value from an accessor:
        // Accessors come in three potential forms:
        // => A function to call for the requested value.
        // => An object with a collection of attribute accessors.
        // => A primitive (string, number, boolean, etc).
        // This function unpacks an accessor and returns its underlying value(s).
      
        function readAccessor(accessor) {
      
          if (isFunction(accessor)) {
            // Accessor is function: return invoked value.
            return accessor();
          }
          else if (isObject(accessor)) {
            // Accessor is object/array: return copy with all attributes read.
            accessor = _.clone(accessor);
      
            _.each(accessor, function(value, key) {
              accessor[ key ] = readAccessor(value);
            });
          }
          // return formatted value, or pass through primitives:
          return accessor;
        }
      
      
        // Binding Handlers
        // ----------------
        // Handlers define set/get methods for exchanging data with the DOM.
      
        // Formatting function for defining new handler objects:
        function makeHandler(handler) {
          return isFunction(handler) ? {set: handler} : handler;
        }
      
        var bindingHandlers = {
          // Attribute: write-only. Sets element attributes.
          attr: makeHandler(function($element, value) {
            $element.attr(value);
          }),
      
          // Checked: read-write. Toggles the checked status of a form element.
          checked: makeHandler({
            get: function($element, currentValue, evt) {
              if ($element.length > 1) {
                $element = $element.filter(evt.target);
              }
      
              var checked = !!$element.prop('checked');
              var value = $element.val();
      
              if (this.isRadio($element)) {
                // Radio button: return value directly.
                return value;
      
              } else if (isArray(currentValue)) {
                // Checkbox array: add/remove value from list.
                currentValue = currentValue.slice();
                var index = _.indexOf(currentValue, value);
      
                if (checked && index < 0) {
                  currentValue.push(value);
                } else if (!checked && index > -1) {
                  currentValue.splice(index, 1);
                }
                return currentValue;
              }
              // Checkbox: return boolean toggle.
              return checked;
            },
            set: function($element, value) {
              if ($element.length > 1) {
                $element = $element.filter('[value="'+ value +'"]');
              }
              
              // Default as loosely-typed boolean:
              var checked = !!value;
      
              if (this.isRadio($element)) {
                // Radio button: match checked state to radio value.
                checked = (value == $element.val());
      
              } else if (isArray(value)) {
                // Checkbox array: match checked state to checkbox value in array contents.
                checked = _.contains(value, $element.val());
              }
      
              // Set checked property to element:
              $element.prop('checked', checked);
            },
            // Is radio button: avoids '.is(":radio");' check for basic Zepto compatibility.
            isRadio: function($element) {
              return $element.attr('type').toLowerCase() === 'radio';
            }
          }),
      
          // Class Name: write-only. Toggles a collection of class name definitions.
          classes: makeHandler(function($element, value) {
            _.each(value, function(enabled, className) {
              $element.toggleClass(className, !!enabled);
            });
          }),
      
          // Collection: write-only. Manages a list of views bound to a Backbone.Collection.
          collection: makeHandler({
            init: function($element, collection, context, bindings) {
              this.i = bindings.itemView ? this.view[bindings.itemView] : this.view.itemView;
              if (!isCollection(collection)) throw('Binding "collection" requires a Collection.');
              if (!isFunction(this.i)) throw('Binding "collection" requires an itemView.');
              this.v = {};
            },
            set: function($element, collection, target) {
      
              var view;
              var views = this.v;
              var ItemView = this.i;
              var models = collection.models;
      
              // Cache and reset the current dependency graph state:
              // sub-views may be created (each with their own dependency graph),
              // therefore we need to suspend the working graph map here before making children...
              var mapCache = viewMap;
              viewMap = null;
      
              // Default target to the bound collection object:
              // during init (or failure), the binding will reset.
              target = target || collection;
      
              if (isModel(target)) {
      
                // ADD/REMOVE Event (from a Model):
                // test if view exists within the binding...
                if (!views.hasOwnProperty(target.cid)) {
      
                  // Add new view:
                  views[ target.cid ] = view = new ItemView({model: target, collectionView: this.view});
                  var index = _.indexOf(models, target);
                  var $children = $element.children();
      
                  // Attempt to add at proper index,
                  // otherwise just append into the element.
                  if (index < $children.length) {
                    $children.eq(index).before(view.$el);
                  } else {
                    $element.append(view.$el);
                  }
      
                } else {
      
                  // Remove existing view:
                  views[ target.cid ].remove();
                  delete views[ target.cid ];
                }
      
              } else if (isCollection(target)) {
      
                // SORT/RESET Event (from a Collection):
                // First test if we're sorting...
                // (number of models has not changed and all their views are present)
                var sort = models.length === _.size(views) && collection.every(function(model) {
                  return views.hasOwnProperty(model.cid);
                });
      
                // Hide element before manipulating:
                $element.children().detach();
                var frag = document.createDocumentFragment();
      
                if (sort) {
                  // Sort existing views:
                  collection.each(function(model) {
                    frag.appendChild(views[model.cid].el);
                  });
      
                } else {
                  // Reset with new views:
                  this.clean();
                  collection.each(function(model) {
                    views[ model.cid ] = view = new ItemView({model: model, collectionView: this.view});
                    frag.appendChild(view.el);
                  }, this);
                }
      
                $element.append(frag);
              }
      
              // Restore cached dependency graph configuration:
              viewMap = mapCache;
            },
            clean: function() {
              for (var id in this.v) {
                if (this.v.hasOwnProperty(id)) {
                  this.v[ id ].remove();
                  delete this.v[ id ];
                }
              }
            }
          }),
      
          // CSS: write-only. Sets a collection of CSS styles to an element.
          css: makeHandler(function($element, value) {
            $element.css(value);
          }),
      
          // Disabled: write-only. Sets the 'disabled' status of a form element (true :: disabled).
          disabled: makeHandler(function($element, value) {
            $element.prop('disabled', !!value);
          }),
      
          // Enabled: write-only. Sets the 'disabled' status of a form element (true :: !disabled).
          enabled: makeHandler(function($element, value) {
            $element.prop('disabled', !value);
          }),
      
          // HTML: write-only. Sets the inner HTML value of an element.
          html: makeHandler(function($element, value) {
            $element.html(value);
          }),
      
          // Options: write-only. Sets option items to a <select> element, then updates the value.
          options: makeHandler({
            init: function($element, value, context, bindings) {
              this.e = bindings.optionsEmpty;
              this.d = bindings.optionsDefault;
              this.v = bindings.value;
            },
            set: function($element, value) {
      
              // Pre-compile empty and default option values:
              // both values MUST be accessed, for two reasons:
              // 1) we need to need to guarentee that both values are reached for mapping purposes.
              // 2) we'll need their values anyway to determine their defined/undefined status.
              var self = this;
              var optionsEmpty = readAccessor(self.e);
              var optionsDefault = readAccessor(self.d);
              var currentValue = readAccessor(self.v);
              var options = isCollection(value) ? value.models : value;
              var numOptions = options.length;
              var enabled = true;
              var html = '';
      
              // No options or default, and has an empty options placeholder:
              // display placeholder and disable select menu.
              if (!numOptions && !optionsDefault && optionsEmpty) {
      
                html += self.opt(optionsEmpty, numOptions);
                enabled = false;
      
              } else {
                // Try to populate default option and options list:
      
                // Configure list with a default first option, if defined:
                if (optionsDefault) {
                  options = [ optionsDefault ].concat(options);
                }
      
                // Create all option items:
                _.each(options, function(option, index) {
                  html += self.opt(option, numOptions);
                });
              }
              // Set new HTML to the element and toggle disabled status:
              $element.html(html).prop('disabled', !enabled).val(currentValue);
      
              // Forcibly set default selection:
              if ($element[0].selectedIndex < 0 && $element.children().length) {
                $element[0].selectedIndex = 0;
              }
              
              // Pull revised value with new options selection state:
              var revisedValue = $element.val();
      
              // Test if the current value was successfully applied:
              // if not, set the new selection state into the model.
              if (self.v && !_.isEqual(currentValue, revisedValue)) {
                self.v(revisedValue);
              }
            },
            opt: function(option, numOptions) {
              // Set both label and value as the raw option object by default:
              var label = option;
              var value = option;
              var textAttr = bindingSettings.optionText;
              var valueAttr = bindingSettings.optionValue;
      
              // Dig deeper into label/value settings for non-primitive values:
              if (isObject(option)) {
                // Extract a label and value from each object:
                // a model's 'get' method is used to access potential computed values.
                label = isModel(option) ? option.get(textAttr) : option[ textAttr ];
                value = isModel(option) ? option.get(valueAttr) : option[ valueAttr ];
              }
      
              return ['<option value="', value, '">', label, '</option>'].join('');
            },
            clean: function() {
              this.d = this.e = this.v = 0;
            }
          }),
      
          // Template: write-only. Renders the bound element with an Underscore template.
          template: makeHandler({
            init: function($element, value, context) {
              var raw = $element.find('script,template');
              this.t = _.template(raw.length ? raw.html() : $element.html());
      
              // If an array of template attributes was provided,
              // then replace array with a compiled hash of attribute accessors:
              if (isArray(value)) {
                return _.pick(context, value);
              }
            },
            set: function($element, value) {
              value = isModel(value) ? value.toJSON({computed:true}) : value;
              $element.html(this.t(value));
            },
            clean: function() {
              this.t = null;
            }
          }),
      
          // Text: read-write. Gets and sets the text value of an element.
          text: makeHandler({
            get: function($element) {
              return $element.text();
            },
            set: function($element, value) {
              $element.text(value);
            }
          }),
      
          // Toggle: write-only. Toggles the visibility of an element.
          toggle: makeHandler(function($element, value) {
            $element.toggle(!!value);
          }),
      
          // Value: read-write. Gets and sets the value of a form element.
          value: makeHandler({
            get: function($element) {
              return $element.val();
            },
            set: function($element, value) {
              try {
                if ($element.val() + '' != value + '') $element.val(value);
              } catch (error) {
                // Error setting value: IGNORE.
                // This occurs in IE6 while attempting to set an undefined multi-select option.
                // unfortuantely, jQuery doesn't gracefully handle this error for us.
                // remove this try/catch block when IE6 is officially deprecated.
              }
            }
          })
        };
      
      
        // Binding Filters
        // ---------------
        // Filters are special binding handlers that may be invoked while binding;
        // they will return a wrapper function used to modify how accessors are read.
      
        // Partial application wrapper for creating binding filters:
        function makeFilter(handler) {
          return function() {
            var params = arguments;
            var read = isFunction(handler) ? handler : handler.get;
            var write = handler.set;
            return function(value) {
              return isUndefined(value) ?
                read.apply(this, _.map(params, readAccessor)) :
                params[0]((write ? write : read).call(this, value));
            };
          };
        }
      
        var bindingFilters = {
          // Positive collection assessment [read-only]:
          // Tests if all of the provided accessors are truthy (and).
          all: makeFilter(function() {
            var params = arguments;
            for (var i=0, len=params.length; i < len; i++) {
              if (!params[i]) return false;
            }
            return true;
          }),
      
          // Partial collection assessment [read-only]:
          // tests if any of the provided accessors are truthy (or).
          any: makeFilter(function() {
            var params = arguments;
            for (var i=0, len=params.length; i < len; i++) {
              if (params[i]) return true;
            }
            return false;
          }),
      
          // Collection length accessor [read-only]:
          // assumes accessor value to be an Array or Collection; defaults to 0.
          length: makeFilter(function(value) {
            return value.length || 0;
          }),
      
          // Negative collection assessment [read-only]:
          // tests if none of the provided accessors are truthy (and not).
          none: makeFilter(function() {
            var params = arguments;
            for (var i=0, len=params.length; i < len; i++) {
              if (params[i]) return false;
            }
            return true;
          }),
      
          // Negation [read-only]:
          not: makeFilter(function(value) {
            return !value;
          }),
      
          // Formats one or more accessors into a text string:
          // ('$1 $2 did $3', firstName, lastName, action)
          format: makeFilter(function(str) {
            var params = arguments;
      
            for (var i=1, len=params.length; i < len; i++) {
              // TODO: need to make something like this work: (?<!\\)\$1
              str = str.replace(new RegExp('\\$'+i, 'g'), params[i]);
            }
            return str;
          }),
      
          // Provides one of two values based on a ternary condition:
          // uses first param (a) as condition, and returns either b (truthy) or c (falsey).
          select: makeFilter(function(condition, truthy, falsey) {
            return condition ? truthy : falsey;
          }),
      
          // CSV array formatting [read-write]:
          csv: makeFilter({
            get: function(value) {
              value = String(value);
              return value ? value.split(',') : [];
            },
            set: function(value) {
              return isArray(value) ? value.join(',') : value;
            }
          }),
      
          // Integer formatting [read-write]:
          integer: makeFilter(function(value) {
            return value ? parseInt(value, 10) : 0;
          }),
      
          // Float formatting [read-write]:
          decimal: makeFilter(function(value) {
            return value ? parseFloat(value) : 0;
          })
        };
      
        // Define allowed binding parameters:
        // These params may be included in binding handlers without throwing errors.
        var allowedParams = {
          events: 1,
          itemView: 1,
          optionsDefault: 1,
          optionsEmpty: 1
        };
      
        // Define binding API:
        Epoxy.binding = {
          allowedParams: allowedParams,
          addHandler: function(name, handler) {
            bindingHandlers[ name ] = makeHandler(handler);
          },
          addFilter: function(name, handler) {
            bindingFilters[ name ] = makeFilter(handler);
          },
          config: function(settings) {
            _.extend(bindingSettings, settings);
          },
          emptyCache: function() {
            bindingCache = {};
          }
        };
      
      
        // Epoxy.View
        // ----------
        var viewMap;
        var viewProps = ['viewModel', 'bindings', 'bindingFilters', 'bindingHandlers', 'bindingSources', 'computeds'];
      
        Epoxy.View = Backbone.View.extend({
          _super: Backbone.View,
      
          // Backbone.View constructor override:
          // sets up binding controls around call to super.
          constructor: function(options) {
            _.extend(this, _.pick(options||{}, viewProps));
            _super(this, 'constructor', arguments);
            this.applyBindings();
          },
      
          // Bindings list accessor:
          b: function() {
            return this._b || (this._b = []);
          },
      
          // Bindings definition:
          // this setting defines a DOM attribute name used to query for bindings.
          // Alternatively, this be replaced with a hash table of key/value pairs,
          // where 'key' is a DOM query and 'value' is its binding declaration.
          bindings: 'data-bind',
      
          // Setter options:
          // Defines an optional hashtable of options to be passed to setter operations.
          // Accepts a custom option '{save:true}' that will write to the model via ".save()".
          setterOptions: null,
      
          // Compiles a model context, then applies bindings to the view:
          // All Model->View relationships will be baked at the time of applying bindings;
          // changes in configuration to source attributes or view bindings will require a complete re-bind.
          applyBindings: function() {
            this.removeBindings();
      
            var self = this;
            var sources = _.clone(_.result(self, 'bindingSources'));
            var declarations = self.bindings;
            var options = self.setterOptions;
            var handlers = _.clone(bindingHandlers);
            var filters = _.clone(bindingFilters);
            var context = self._c = {};
      
            // Compile a complete set of binding handlers for the view:
            // mixes all custom handlers into a copy of default handlers.
            // Custom handlers defined as plain functions are registered as read-only setters.
            _.each(_.result(self, 'bindingHandlers')||{}, function(handler, name) {
                handlers[ name ] = makeHandler(handler);
            });
      
            // Compile a complete set of binding filters for the view:
            // mixes all custom filters into a copy of default filters.
            _.each(_.result(self, 'bindingFilters')||{}, function(filter, name) {
                filters[ name ] = makeFilter(filter);
            });
      
            // Add native 'model' and 'collection' data sources:
            self.model = addSourceToViewContext(self, context, options, 'model');
            self.viewModel = addSourceToViewContext(self, context, options, 'viewModel');
            self.collection = addSourceToViewContext(self, context, options, 'collection');
      
            // Support legacy "collection.view" API for rendering list items:
            // **Deprecated: will be removed after next release*.*
            if (self.collection && self.collection.view) {
              self.itemView = self.collection.view;
            }
      
            // Add all additional data sources:
            if (sources) {
              _.each(sources, function(source, sourceName) {
                sources[ sourceName ] = addSourceToViewContext(sources, context, options, sourceName, sourceName);
              });
      
              // Reapply resulting sources to view instance.
              self.bindingSources = sources;
            }
      
            // Add all computed view properties:
            _.each(_.result(self, 'computeds')||{}, function(computed, name) {
              var getter = isFunction(computed) ? computed : computed.get;
              var setter = computed.set;
              var deps = computed.deps;
      
              context[ name ] = function(value) {
                return (!isUndefined(value) && setter) ?
                  setter.call(self, value) :
                  getter.apply(self, getDepsFromViewContext(self._c, deps));
              };
            });
      
            // Create all bindings:
            // bindings are created from an object hash of query/binding declarations,
            // OR based on queried DOM attributes.
            if (isObject(declarations)) {
      
              // Object declaration method:
              // {'span.my-element': 'text:attribute'}
      
              _.each(declarations, function(elementDecs, selector) {
                // Get DOM jQuery reference:
                var $element = queryViewForSelector(self, selector);
      
                // flattern object notated binding declaration
                if (isObject(elementDecs)) {
                  elementDecs = flattenBindingDeclaration(elementDecs);
                }
      
                // Ignore empty DOM queries (without errors):
                if ($element.length) {
                  bindElementToView(self, $element, elementDecs, context, handlers, filters);
                }
              });
      
            } else {
      
              // DOM attributes declaration method:
              // <span data-bind='text:attribute'></span>
      
              // Create bindings for each matched element:
              queryViewForSelector(self, '['+declarations+']').each(function() {
                var $element = Backbone.$(this);
                bindElementToView(self, $element, $element.attr(declarations), context, handlers, filters);
              });
            }
          },
      
          // Gets a value from the binding context:
          getBinding: function(attribute) {
            return accessViewContext(this._c, attribute);
          },
      
          // Sets a value to the binding context:
          setBinding: function(attribute, value) {
            return accessViewContext(this._c, attribute, value);
          },
      
          // Disposes of all view bindings:
          removeBindings: function() {
            this._c = null;
      
            if (this._b) {
              while (this._b.length) {
                this._b.pop().dispose();
              }
            }
          },
      
          // Backbone.View.remove() override:
          // unbinds the view before performing native removal tasks.
          remove: function() {
            this.removeBindings();
            _super(this, 'remove', arguments);
          }
      
        }, mixins);
      
        // Epoxy.View -> Private
        // ---------------------
      
        // Adds a data source to a view:
        // Data sources are Backbone.Model and Backbone.Collection instances.
        // @param source: a source instance, or a function that returns a source.
        // @param context: the working binding context. All bindings in a view share a context.
        function addSourceToViewContext(source, context, options, name, prefix) {
      
          // Resolve source instance:
          source = _.result(source, name);
      
          // Ignore missing sources, and invoke non-instances:
          if (!source) return;
      
          // Add Backbone.Model source instance:
          if (isModel(source)) {
      
            // Establish source prefix:
            prefix = prefix ? prefix+'_' : '';
      
            // Create a read-only accessor for the model instance:
            context['$'+name] = function() {
              viewMap && viewMap.push([source, 'change']);
              return source;
            };
      
            // Compile all model attributes as accessors within the context:
            var modelAttributes = _.extend({}, source.attributes, _.isFunction(source.c) ? source.c() : {});
            _.each(modelAttributes, function(value, attribute) {
      
              // Create named accessor functions:
              // -> Attributes from 'view.model' use their normal names.
              // -> Attributes from additional sources are named as 'source_attribute'.
              context[prefix+attribute] = function(value) {
                return accessViewDataAttribute(source, attribute, value, options);
              };
            });
          }
          // Add Backbone.Collection source instance:
          else if (isCollection(source)) {
      
            // Create a read-only accessor for the collection instance:
            context['$'+name] = function() {
              viewMap && viewMap.push([source, 'reset add remove sort update']);
              return source;
            };
          }
      
          // Return original object, or newly constructed data source:
          return source;
        }
      
        // Attribute data accessor:
        // exchanges individual attribute values with model sources.
        // This function is separated out from the accessor creation process for performance.
        // @param source: the model data source to interact with.
        // @param attribute: the model attribute to read/write.
        // @param value: the value to set, or 'undefined' to get the current value.
        function accessViewDataAttribute(source, attribute, value, options) {
          // Register the attribute to the bindings map, if enabled:
          viewMap && viewMap.push([source, 'change:'+attribute]);
      
          // Set attribute value when accessor is invoked with an argument:
          if (!isUndefined(value)) {
      
            // Set Object (non-null, non-array) hashtable value:
            if (!isObject(value) || isArray(value) || _.isDate(value)) {
              var val = value;
              value = {};
              value[attribute] = val;
            }
      
            // Set value:
            return options && options.save ? source.save(value, options) : source.set(value, options);
          }
      
          // Get the attribute value by default:
          return source.get(attribute);
        }
      
        // Queries element selectors within a view:
        // matches elements within the view, and the view's container element.
        function queryViewForSelector(view, selector) {
          if (selector === ':el' || selector === ':scope') return view.$el;
          var $elements = view.$(selector);
      
          // Include top-level view in bindings search:
          if (view.$el.is(selector)) {
            $elements = $elements.add(view.$el);
          }
      
          return $elements;
        }
      
        // Binds an element into a view:
        // The element's declarations are parsed, then a binding is created for each declared handler.
        // @param view: the parent View to bind into.
        // @param $element: the target element (as jQuery) to bind.
        // @param declarations: the string of binding declarations provided for the element.
        // @param context: a compiled binding context with all availabe view data.
        // @param handlers: a compiled handlers table with all native/custom handlers.
        function bindElementToView(view, $element, declarations, context, handlers, filters) {
      
          // Parse localized binding context:
          // parsing function is invoked with 'filters' and 'context' properties made available,
          // yeilds a native context object with element-specific bindings defined.
          try {
            var parserFunct = bindingCache[declarations] || (bindingCache[declarations] = new Function('$f','$c','with($f){with($c){return{'+ declarations +'}}}'));
            var bindings = parserFunct(filters, context);
          } catch (error) {
            throw('Error parsing bindings: "'+declarations +'"\n>> '+error);
          }
      
          // Format the 'events' option:
          // include events from the binding declaration along with a default 'change' trigger,
          // then format all event names with a '.epoxy' namespace.
          var events = _.map(_.union(bindings.events || [], ['change']), function(name) {
            return name+'.epoxy';
          }).join(' ');
      
          // Apply bindings from native context:
          _.each(bindings, function(accessor, handlerName) {
      
            // Validate that each defined handler method exists before binding:
            if (handlers.hasOwnProperty(handlerName)) {
              // Create and add binding to the view's list of handlers:
              view.b().push(new EpoxyBinding(view, $element, handlers[handlerName], accessor, events, context, bindings));
            } else if (!allowedParams.hasOwnProperty(handlerName)) {
              throw('binding handler "'+ handlerName +'" is not defined.');
            }
          });
        }
      
        // Gets and sets view context data attributes:
        // used by the implementations of "getBinding" and "setBinding".
        function accessViewContext(context, attribute, value) {
          if (context && context.hasOwnProperty(attribute)) {
            return isUndefined(value) ? readAccessor(context[attribute]) : context[attribute](value);
          }
        }
      
        // Accesses an array of dependency properties from a view context:
        // used for mapping view dependencies by manual declaration.
        function getDepsFromViewContext(context, attributes) {
          var values = [];
          if (attributes && context) {
            for (var i=0, len=attributes.length; i < len; i++) {
              values.push(attributes[i] in context ? context[ attributes[i] ]() : null);
            }
          }
          return values;
        }
      
        var identifierRegex = /^[a-z_$][a-z0-9_$]*$/i;
        var quotedStringRegex = /^\s*(["']).*\1\s*$/;
      
        // Converts a binding declaration object into a flattened string.
        // Input: {text: 'firstName', attr: {title: '"hello"'}}
        // Output: 'text:firstName,attr:{title:"hello"}'
        function flattenBindingDeclaration(declaration) {
          var result = [];
      
          for (var key in declaration) {
            var value = declaration[key];
      
            if (isObject(value)) {
              value = '{'+ flattenBindingDeclaration(value) +'}';
            }
      
            // non-identifier keys that aren't already quoted need to be quoted
            if (!identifierRegex.test(key) && !quotedStringRegex.test(key)) {
              key = '"' + key + '"';
            }
      
            result.push(key +':'+ value);
          }
      
          return result.join(',');
        }
      
      
        // Epoxy.View -> Binding
        // ---------------------
        // The binding object connects an element to a bound handler.
        // @param view: the view object this binding is attached to.
        // @param $element: the target element (as jQuery) to bind.
        // @param handler: the handler object to apply (include all handler methods).
        // @param accessor: an accessor method from the binding context that exchanges data with the model.
        // @param events:
        // @param context:
        // @param bindings:
        function EpoxyBinding(view, $element, handler, accessor, events, context, bindings) {
      
          var self = this;
          var tag = ($element[0].tagName).toLowerCase();
          var changable = (tag == 'input' || tag == 'select' || tag == 'textarea' || $element.prop('contenteditable') == 'true');
          var triggers = [];
          var reset = function(target) {
            self.$el && self.set(self.$el, readAccessor(accessor), target);
          };
      
          self.view = view;
          self.$el = $element;
          self.evt = events;
          _.extend(self, handler);
      
          // Initialize the binding:
          // allow the initializer to redefine/modify the attribute accessor if needed.
          accessor = self.init(self.$el, readAccessor(accessor), context, bindings) || accessor;
      
          // Set default binding, then initialize & map bindings:
          // each binding handler is invoked to populate its initial value.
          // While running a handler, all accessed attributes will be added to the handler's dependency map.
          viewMap = triggers;
          reset();
          viewMap = null;
      
          // Configure READ/GET-able binding. Requires:
          // => Form element.
          // => Binding handler has a getter method.
          // => Value accessor is a function.
          if (changable && handler.get && isFunction(accessor)) {
            self.$el.on(events, function(evt) {
              accessor(self.get(self.$el, readAccessor(accessor), evt));
            });
          }
      
          // Configure WRITE/SET-able binding. Requires:
          // => One or more events triggers.
          if (triggers.length) {
            for (var i=0, len=triggers.length; i < len; i++) {
              self.listenTo(triggers[i][0], triggers[i][1], reset);
            }
          }
        }
      
        _.extend(EpoxyBinding.prototype, Backbone.Events, {
      
          // Pass-through binding methods:
          // for override by actual implementations.
          init: blankMethod,
          get: blankMethod,
          set: blankMethod,
          clean: blankMethod,
      
          // Destroys the binding:
          // all events and managed sub-views are killed.
          dispose: function() {
            this.clean();
            this.stopListening();
            this.$el.off(this.evt);
            this.$el = this.view = null;
          }
        });
      
        return Epoxy;
      }));
      
    }
  }, 'backbone.epoxy');

  require('jquery');
  require('vague-time');
  require('underscore');
  require('backbone');
  require('backbone.modelbinder');
  require('backbone.epoxy');

}.call(window));
//# sourceMappingURL=ender.js.map

/*!
  * =============================================================
  * Ender: open module JavaScript framework (https://enderjs.com)
  * Build: ender build jquery vague-time backbone@1.2.3 backbone.modelbinder backbone.epoxy
  * Packages: ender-core@2.0.0 ender-commonjs@1.0.8 jquery@2.1.4 vague-time@1.3.0 underscore@1.8.3 backbone@1.2.3 backbone.modelbinder@1.1.0 backbone.epoxy@1.3.4
  * =============================================================
  */
(function(){/*!
    * Ender: open module JavaScript framework (client-lib)
    * http://enderjs.com
    * License MIT
    */
function t(t,n){var i;if(this.length=0,"string"==typeof t&&(t=e._select(this.selector=t,n)),null==t)return this;if("function"==typeof t)e._closure(t,n);else if("object"!=typeof t||t.nodeType||(i=t.length)!==+i||t==t.window)this[this.length++]=t;else for(this.length=i=i>0?~~i:0;i--;)this[i]=t[i]}function e(e,n){return new t(e,n)}function n(t){if("$"+t in n._cache)return n._cache["$"+t];if("$"+t in n._modules)return n._cache["$"+t]=n._modules["$"+t]._load();if(t in window)return window[t];throw new Error('Requested module "'+t+'" has not been defined.')}function i(t,e){return n._cache["$"+t]=e}function r(t,e){this.id=t,this.fn=e,n._modules["$"+t]=this}e.fn=e.prototype=t.prototype,e._reserved={reserved:1,ender:1,expose:1,noConflict:1,fn:1},t.prototype.$=e,t.prototype.splice=function(){throw new Error("Not implemented")},t.prototype.forEach=function(t,e){var n,i;for(n=0,i=this.length;i>n;++n)n in this&&t.call(e||this[n],this[n],n,this);return this},e.ender=function(n,i){var r=i?t.prototype:e;for(var o in n)!(o in e._reserved)&&(r[o]=n[o]);return r},e._select=function(t,e){return t?(e||document).querySelectorAll(t):[]},e._closure=function(t){t.call(document,e)},"undefined"!=typeof module&&module.exports&&(module.exports=e);var o=e;e.expose=function(t,n){e.expose.old[t]=window[t],window[t]=n},e.expose.old={},e.noConflict=function(t){if(window.$=e.expose.old.$,t)for(var n in e.expose.old)window[n]=e.expose.old[n];return this},e.expose("$",e),e.expose("ender",e);/*!
    * Ender: open module JavaScript framework (module-lib)
    * http://enderjs.com
    * License MIT
    */
var s=this;n._cache={},n._modules={},r.prototype.require=function(t){var e,i;if("."==t.charAt(0)){for(e=(this.id.replace(/\/.*?$/,"/")+t.replace(/\.js$/,"")).split("/");~(i=e.indexOf("."));)e.splice(i,1);for(;(i=e.lastIndexOf(".."))>0;)e.splice(i-1,2);t=e.join("/")}return n(t)},r.prototype._load=function(){var t=this,e=/^\.\.\//g,n=/^\.\/[^\/]+$/g;return t._loaded||(t._loaded=!0,t.exports={},t.fn.call(s,t,t.exports,function(i){return i.match(e)?i=t.id.replace(/[^\/]+\/[^\/]+$/,"")+i.replace(e,""):i.match(n)&&(i=t.id.replace(/\/[^\/]+$/,"")+i.replace(".","")),t.require(i)},s)),t.exports},r.createPackage=function(t,e,i){var o,s;for(o in e)new r(t+"/"+o,e[o]),(s=o.match(/^(.+)\/index$/))&&new r(t+"/"+s[1],e[o]);i&&(n._modules["$"+t]=n._modules["$"+t+"/"+i])},e&&e.expose&&(e.expose("global",s),e.expose("require",n),e.expose("provide",i),e.expose("Module",r)),r.createPackage("jquery",{"dist/jquery":function(t,e,n,i){/*!
       * jQuery JavaScript Library v2.1.4
       * http://jquery.com/
       *
       * Includes Sizzle.js
       * http://sizzlejs.com/
       *
       * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
       * Released under the MIT license
       * http://jquery.org/license
       *
       * Date: 2015-04-28T16:01Z
       */
!function(e,n){"object"==typeof t&&"object"==typeof t.exports?t.exports=e.document?n(e,!0):function(t){if(!t.document)throw new Error("jQuery requires a window with a document");return n(t)}:n(e)}("undefined"!=typeof window?window:this,function(t,e){function n(t){var e="length"in t&&t.length,n=Z.type(t);return"function"===n||Z.isWindow(t)?!1:1===t.nodeType&&e?!0:"array"===n||0===e||"number"==typeof e&&e>0&&e-1 in t}function i(t,e,n){if(Z.isFunction(e))return Z.grep(t,function(t,i){return!!e.call(t,i,t)!==n});if(e.nodeType)return Z.grep(t,function(t){return t===e!==n});if("string"==typeof e){if(at.test(e))return Z.filter(e,t,n);e=Z.filter(e,t)}return Z.grep(t,function(t){return W.call(e,t)>=0!==n})}function r(t,e){for(;(t=t[e])&&1!==t.nodeType;);return t}function o(t){var e=pt[t]={};return Z.each(t.match(dt)||[],function(t,n){e[n]=!0}),e}function s(){Y.removeEventListener("DOMContentLoaded",s,!1),t.removeEventListener("load",s,!1),Z.ready()}function a(){Object.defineProperty(this.cache={},0,{get:function(){return{}}}),this.expando=Z.expando+a.uid++}function u(t,e,n){var i;if(void 0===n&&1===t.nodeType)if(i="data-"+e.replace(xt,"-$1").toLowerCase(),n=t.getAttribute(i),"string"==typeof n){try{n="true"===n?!0:"false"===n?!1:"null"===n?null:+n+""===n?+n:bt.test(n)?Z.parseJSON(n):n}catch(r){}yt.set(t,e,n)}else n=void 0;return n}function l(){return!0}function c(){return!1}function h(){try{return Y.activeElement}catch(t){}}function f(t,e){return Z.nodeName(t,"table")&&Z.nodeName(11!==e.nodeType?e:e.firstChild,"tr")?t.getElementsByTagName("tbody")[0]||t.appendChild(t.ownerDocument.createElement("tbody")):t}function d(t){return t.type=(null!==t.getAttribute("type"))+"/"+t.type,t}function p(t){var e=Dt.exec(t.type);return e?t.type=e[1]:t.removeAttribute("type"),t}function g(t,e){for(var n=0,i=t.length;i>n;n++)mt.set(t[n],"globalEval",!e||mt.get(e[n],"globalEval"))}function v(t,e){var n,i,r,o,s,a,u,l;if(1===e.nodeType){if(mt.hasData(t)&&(o=mt.access(t),s=mt.set(e,o),l=o.events)){delete s.handle,s.events={};for(r in l)for(n=0,i=l[r].length;i>n;n++)Z.event.add(e,r,l[r][n])}yt.hasData(t)&&(a=yt.access(t),u=Z.extend({},a),yt.set(e,u))}}function m(t,e){var n=t.getElementsByTagName?t.getElementsByTagName(e||"*"):t.querySelectorAll?t.querySelectorAll(e||"*"):[];return void 0===e||e&&Z.nodeName(t,e)?Z.merge([t],n):n}function y(t,e){var n=e.nodeName.toLowerCase();"input"===n&&kt.test(t.type)?e.checked=t.checked:("input"===n||"textarea"===n)&&(e.defaultValue=t.defaultValue)}function b(e,n){var i,r=Z(n.createElement(e)).appendTo(n.body),o=t.getDefaultComputedStyle&&(i=t.getDefaultComputedStyle(r[0]))?i.display:Z.css(r[0],"display");return r.detach(),o}function x(t){var e=Y,n=qt[t];return n||(n=b(t,e),"none"!==n&&n||(It=(It||Z("<iframe frameborder='0' width='0' height='0'/>")).appendTo(e.documentElement),e=It[0].contentDocument,e.write(),e.close(),n=b(t,e),It.detach()),qt[t]=n),n}function _(t,e,n){var i,r,o,s,a=t.style;return n=n||Vt(t),n&&(s=n.getPropertyValue(e)||n[e]),n&&(""!==s||Z.contains(t.ownerDocument,t)||(s=Z.style(t,e)),Lt.test(s)&&Rt.test(e)&&(i=a.width,r=a.minWidth,o=a.maxWidth,a.minWidth=a.maxWidth=a.width=s,s=n.width,a.width=i,a.minWidth=r,a.maxWidth=o)),void 0!==s?s+"":s}function w(t,e){return{get:function(){return t()?void delete this.get:(this.get=e).apply(this,arguments)}}}function E(t,e){if(e in t)return e;for(var n=e[0].toUpperCase()+e.slice(1),i=e,r=Gt.length;r--;)if(e=Gt[r]+n,e in t)return e;return i}function k(t,e,n){var i=Ut.exec(e);return i?Math.max(0,i[1]-(n||0))+(i[2]||"px"):e}function T(t,e,n,i,r){for(var o=n===(i?"border":"content")?4:"width"===e?1:0,s=0;4>o;o+=2)"margin"===n&&(s+=Z.css(t,n+wt[o],!0,r)),i?("content"===n&&(s-=Z.css(t,"padding"+wt[o],!0,r)),"margin"!==n&&(s-=Z.css(t,"border"+wt[o]+"Width",!0,r))):(s+=Z.css(t,"padding"+wt[o],!0,r),"padding"!==n&&(s+=Z.css(t,"border"+wt[o]+"Width",!0,r)));return s}function C(t,e,n){var i=!0,r="width"===e?t.offsetWidth:t.offsetHeight,o=Vt(t),s="border-box"===Z.css(t,"boxSizing",!1,o);if(0>=r||null==r){if(r=_(t,e,o),(0>r||null==r)&&(r=t.style[e]),Lt.test(r))return r;i=s&&(K.boxSizingReliable()||r===t.style[e]),r=parseFloat(r)||0}return r+T(t,e,n||(s?"border":"content"),i,o)+"px"}function j(t,e){for(var n,i,r,o=[],s=0,a=t.length;a>s;s++)i=t[s],i.style&&(o[s]=mt.get(i,"olddisplay"),n=i.style.display,e?(o[s]||"none"!==n||(i.style.display=""),""===i.style.display&&Et(i)&&(o[s]=mt.access(i,"olddisplay",x(i.nodeName)))):(r=Et(i),"none"===n&&r||mt.set(i,"olddisplay",r?n:Z.css(i,"display"))));for(s=0;a>s;s++)i=t[s],i.style&&(e&&"none"!==i.style.display&&""!==i.style.display||(i.style.display=e?o[s]||"":"none"));return t}function S(t,e,n,i,r){return new S.prototype.init(t,e,n,i,r)}function A(){return setTimeout(function(){Kt=void 0}),Kt=Z.now()}function M(t,e){var n,i=0,r={height:t};for(e=e?1:0;4>i;i+=2-e)n=wt[i],r["margin"+n]=r["padding"+n]=t;return e&&(r.opacity=r.width=t),r}function N(t,e,n){for(var i,r=(ne[e]||[]).concat(ne["*"]),o=0,s=r.length;s>o;o++)if(i=r[o].call(n,e,t))return i}function B(t,e,n){var i,r,o,s,a,u,l,c,h=this,f={},d=t.style,p=t.nodeType&&Et(t),g=mt.get(t,"fxshow");n.queue||(a=Z._queueHooks(t,"fx"),null==a.unqueued&&(a.unqueued=0,u=a.empty.fire,a.empty.fire=function(){a.unqueued||u()}),a.unqueued++,h.always(function(){h.always(function(){a.unqueued--,Z.queue(t,"fx").length||a.empty.fire()})})),1===t.nodeType&&("height"in e||"width"in e)&&(n.overflow=[d.overflow,d.overflowX,d.overflowY],l=Z.css(t,"display"),c="none"===l?mt.get(t,"olddisplay")||x(t.nodeName):l,"inline"===c&&"none"===Z.css(t,"float")&&(d.display="inline-block")),n.overflow&&(d.overflow="hidden",h.always(function(){d.overflow=n.overflow[0],d.overflowX=n.overflow[1],d.overflowY=n.overflow[2]}));for(i in e)if(r=e[i],Qt.exec(r)){if(delete e[i],o=o||"toggle"===r,r===(p?"hide":"show")){if("show"!==r||!g||void 0===g[i])continue;p=!0}f[i]=g&&g[i]||Z.style(t,i)}else l=void 0;if(Z.isEmptyObject(f))"inline"===("none"===l?x(t.nodeName):l)&&(d.display=l);else{g?"hidden"in g&&(p=g.hidden):g=mt.access(t,"fxshow",{}),o&&(g.hidden=!p),p?Z(t).show():h.done(function(){Z(t).hide()}),h.done(function(){var e;mt.remove(t,"fxshow");for(e in f)Z.style(t,e,f[e])});for(i in f)s=N(p?g[i]:0,i,h),i in g||(g[i]=s.start,p&&(s.end=s.start,s.start="width"===i||"height"===i?1:0))}}function O(t,e){var n,i,r,o,s;for(n in t)if(i=Z.camelCase(n),r=e[i],o=t[n],Z.isArray(o)&&(r=o[1],o=t[n]=o[0]),n!==i&&(t[i]=o,delete t[n]),s=Z.cssHooks[i],s&&"expand"in s){o=s.expand(o),delete t[i];for(n in o)n in t||(t[n]=o[n],e[n]=r)}else e[i]=r}function P(t,e,n){var i,r,o=0,s=ee.length,a=Z.Deferred().always(function(){delete u.elem}),u=function(){if(r)return!1;for(var e=Kt||A(),n=Math.max(0,l.startTime+l.duration-e),i=n/l.duration||0,o=1-i,s=0,u=l.tweens.length;u>s;s++)l.tweens[s].run(o);return a.notifyWith(t,[l,o,n]),1>o&&u?n:(a.resolveWith(t,[l]),!1)},l=a.promise({elem:t,props:Z.extend({},e),opts:Z.extend(!0,{specialEasing:{}},n),originalProperties:e,originalOptions:n,startTime:Kt||A(),duration:n.duration,tweens:[],createTween:function(e,n){var i=Z.Tween(t,l.opts,e,n,l.opts.specialEasing[e]||l.opts.easing);return l.tweens.push(i),i},stop:function(e){var n=0,i=e?l.tweens.length:0;if(r)return this;for(r=!0;i>n;n++)l.tweens[n].run(1);return e?a.resolveWith(t,[l,e]):a.rejectWith(t,[l,e]),this}}),c=l.props;for(O(c,l.opts.specialEasing);s>o;o++)if(i=ee[o].call(l,t,c,l.opts))return i;return Z.map(c,N,l),Z.isFunction(l.opts.start)&&l.opts.start.call(t,l),Z.fx.timer(Z.extend(u,{elem:t,anim:l,queue:l.opts.queue})),l.progress(l.opts.progress).done(l.opts.done,l.opts.complete).fail(l.opts.fail).always(l.opts.always)}function $(t){return function(e,n){"string"!=typeof e&&(n=e,e="*");var i,r=0,o=e.toLowerCase().match(dt)||[];if(Z.isFunction(n))for(;i=o[r++];)"+"===i[0]?(i=i.slice(1)||"*",(t[i]=t[i]||[]).unshift(n)):(t[i]=t[i]||[]).push(n)}}function D(t,e,n,i){function r(a){var u;return o[a]=!0,Z.each(t[a]||[],function(t,a){var l=a(e,n,i);return"string"!=typeof l||s||o[l]?s?!(u=l):void 0:(e.dataTypes.unshift(l),r(l),!1)}),u}var o={},s=t===be;return r(e.dataTypes[0])||!o["*"]&&r("*")}function F(t,e){var n,i,r=Z.ajaxSettings.flatOptions||{};for(n in e)void 0!==e[n]&&((r[n]?t:i||(i={}))[n]=e[n]);return i&&Z.extend(!0,t,i),t}function H(t,e,n){for(var i,r,o,s,a=t.contents,u=t.dataTypes;"*"===u[0];)u.shift(),void 0===i&&(i=t.mimeType||e.getResponseHeader("Content-Type"));if(i)for(r in a)if(a[r]&&a[r].test(i)){u.unshift(r);break}if(u[0]in n)o=u[0];else{for(r in n){if(!u[0]||t.converters[r+" "+u[0]]){o=r;break}s||(s=r)}o=o||s}return o?(o!==u[0]&&u.unshift(o),n[o]):void 0}function I(t,e,n,i){var r,o,s,a,u,l={},c=t.dataTypes.slice();if(c[1])for(s in t.converters)l[s.toLowerCase()]=t.converters[s];for(o=c.shift();o;)if(t.responseFields[o]&&(n[t.responseFields[o]]=e),!u&&i&&t.dataFilter&&(e=t.dataFilter(e,t.dataType)),u=o,o=c.shift())if("*"===o)o=u;else if("*"!==u&&u!==o){if(s=l[u+" "+o]||l["* "+o],!s)for(r in l)if(a=r.split(" "),a[1]===o&&(s=l[u+" "+a[0]]||l["* "+a[0]])){s===!0?s=l[r]:l[r]!==!0&&(o=a[0],c.unshift(a[1]));break}if(s!==!0)if(s&&t["throws"])e=s(e);else try{e=s(e)}catch(h){return{state:"parsererror",error:s?h:"No conversion from "+u+" to "+o}}}return{state:"success",data:e}}function q(t,e,n,i){var r;if(Z.isArray(e))Z.each(e,function(e,r){n||ke.test(t)?i(t,r):q(t+"["+("object"==typeof r?e:"")+"]",r,n,i)});else if(n||"object"!==Z.type(e))i(t,e);else for(r in e)q(t+"["+r+"]",e[r],n,i)}function R(t){return Z.isWindow(t)?t:9===t.nodeType&&t.defaultView}var L=[],V=L.slice,z=L.concat,U=L.push,W=L.indexOf,J={},X=J.toString,G=J.hasOwnProperty,K={},Y=t.document,Q="2.1.4",Z=function(t,e){return new Z.fn.init(t,e)},tt=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,et=/^-ms-/,nt=/-([\da-z])/gi,it=function(t,e){return e.toUpperCase()};Z.fn=Z.prototype={jquery:Q,constructor:Z,selector:"",length:0,toArray:function(){return V.call(this)},get:function(t){return null!=t?0>t?this[t+this.length]:this[t]:V.call(this)},pushStack:function(t){var e=Z.merge(this.constructor(),t);return e.prevObject=this,e.context=this.context,e},each:function(t,e){return Z.each(this,t,e)},map:function(t){return this.pushStack(Z.map(this,function(e,n){return t.call(e,n,e)}))},slice:function(){return this.pushStack(V.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(t){var e=this.length,n=+t+(0>t?e:0);return this.pushStack(n>=0&&e>n?[this[n]]:[])},end:function(){return this.prevObject||this.constructor(null)},push:U,sort:L.sort,splice:L.splice},Z.extend=Z.fn.extend=function(){var t,e,n,i,r,o,s=arguments[0]||{},a=1,u=arguments.length,l=!1;for("boolean"==typeof s&&(l=s,s=arguments[a]||{},a++),"object"==typeof s||Z.isFunction(s)||(s={}),a===u&&(s=this,a--);u>a;a++)if(null!=(t=arguments[a]))for(e in t)n=s[e],i=t[e],s!==i&&(l&&i&&(Z.isPlainObject(i)||(r=Z.isArray(i)))?(r?(r=!1,o=n&&Z.isArray(n)?n:[]):o=n&&Z.isPlainObject(n)?n:{},s[e]=Z.extend(l,o,i)):void 0!==i&&(s[e]=i));return s},Z.extend({expando:"jQuery"+(Q+Math.random()).replace(/\D/g,""),isReady:!0,error:function(t){throw new Error(t)},noop:function(){},isFunction:function(t){return"function"===Z.type(t)},isArray:Array.isArray,isWindow:function(t){return null!=t&&t===t.window},isNumeric:function(t){return!Z.isArray(t)&&t-parseFloat(t)+1>=0},isPlainObject:function(t){return"object"!==Z.type(t)||t.nodeType||Z.isWindow(t)?!1:t.constructor&&!G.call(t.constructor.prototype,"isPrototypeOf")?!1:!0},isEmptyObject:function(t){var e;for(e in t)return!1;return!0},type:function(t){return null==t?t+"":"object"==typeof t||"function"==typeof t?J[X.call(t)]||"object":typeof t},globalEval:function(t){var e,n=eval;t=Z.trim(t),t&&(1===t.indexOf("use strict")?(e=Y.createElement("script"),e.text=t,Y.head.appendChild(e).parentNode.removeChild(e)):n(t))},camelCase:function(t){return t.replace(et,"ms-").replace(nt,it)},nodeName:function(t,e){return t.nodeName&&t.nodeName.toLowerCase()===e.toLowerCase()},each:function(t,e,i){var r,o=0,s=t.length,a=n(t);if(i){if(a)for(;s>o&&(r=e.apply(t[o],i),r!==!1);o++);else for(o in t)if(r=e.apply(t[o],i),r===!1)break}else if(a)for(;s>o&&(r=e.call(t[o],o,t[o]),r!==!1);o++);else for(o in t)if(r=e.call(t[o],o,t[o]),r===!1)break;return t},trim:function(t){return null==t?"":(t+"").replace(tt,"")},makeArray:function(t,e){var i=e||[];return null!=t&&(n(Object(t))?Z.merge(i,"string"==typeof t?[t]:t):U.call(i,t)),i},inArray:function(t,e,n){return null==e?-1:W.call(e,t,n)},merge:function(t,e){for(var n=+e.length,i=0,r=t.length;n>i;i++)t[r++]=e[i];return t.length=r,t},grep:function(t,e,n){for(var i,r=[],o=0,s=t.length,a=!n;s>o;o++)i=!e(t[o],o),i!==a&&r.push(t[o]);return r},map:function(t,e,i){var r,o=0,s=t.length,a=n(t),u=[];if(a)for(;s>o;o++)r=e(t[o],o,i),null!=r&&u.push(r);else for(o in t)r=e(t[o],o,i),null!=r&&u.push(r);return z.apply([],u)},guid:1,proxy:function(t,e){var n,i,r;return"string"==typeof e&&(n=t[e],e=t,t=n),Z.isFunction(t)?(i=V.call(arguments,2),r=function(){return t.apply(e||this,i.concat(V.call(arguments)))},r.guid=t.guid=t.guid||Z.guid++,r):void 0},now:Date.now,support:K}),Z.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(t,e){J["[object "+e+"]"]=e.toLowerCase()});var rt=/*!
       * Sizzle CSS Selector Engine v2.2.0-pre
       * http://sizzlejs.com/
       *
       * Copyright 2008, 2014 jQuery Foundation, Inc. and other contributors
       * Released under the MIT license
       * http://jquery.org/license
       *
       * Date: 2014-12-16
       */
function(t){function e(t,e,n,i){var r,o,s,a,u,l,h,d,p,g;if((e?e.ownerDocument||e:q)!==B&&N(e),e=e||B,n=n||[],a=e.nodeType,"string"!=typeof t||!t||1!==a&&9!==a&&11!==a)return n;if(!i&&P){if(11!==a&&(r=yt.exec(t)))if(s=r[1]){if(9===a){if(o=e.getElementById(s),!o||!o.parentNode)return n;if(o.id===s)return n.push(o),n}else if(e.ownerDocument&&(o=e.ownerDocument.getElementById(s))&&H(e,o)&&o.id===s)return n.push(o),n}else{if(r[2])return Q.apply(n,e.getElementsByTagName(t)),n;if((s=r[3])&&_.getElementsByClassName)return Q.apply(n,e.getElementsByClassName(s)),n}if(_.qsa&&(!$||!$.test(t))){if(d=h=I,p=e,g=1!==a&&t,1===a&&"object"!==e.nodeName.toLowerCase()){for(l=T(t),(h=e.getAttribute("id"))?d=h.replace(xt,"\\$&"):e.setAttribute("id",d),d="[id='"+d+"'] ",u=l.length;u--;)l[u]=d+f(l[u]);p=bt.test(t)&&c(e.parentNode)||e,g=l.join(",")}if(g)try{return Q.apply(n,p.querySelectorAll(g)),n}catch(v){}finally{h||e.removeAttribute("id")}}}return j(t.replace(ut,"$1"),e,n,i)}function n(){function t(n,i){return e.push(n+" ")>w.cacheLength&&delete t[e.shift()],t[n+" "]=i}var e=[];return t}function i(t){return t[I]=!0,t}function r(t){var e=B.createElement("div");try{return!!t(e)}catch(n){return!1}finally{e.parentNode&&e.parentNode.removeChild(e),e=null}}function o(t,e){for(var n=t.split("|"),i=t.length;i--;)w.attrHandle[n[i]]=e}function s(t,e){var n=e&&t,i=n&&1===t.nodeType&&1===e.nodeType&&(~e.sourceIndex||J)-(~t.sourceIndex||J);if(i)return i;if(n)for(;n=n.nextSibling;)if(n===e)return-1;return t?1:-1}function a(t){return function(e){var n=e.nodeName.toLowerCase();return"input"===n&&e.type===t}}function u(t){return function(e){var n=e.nodeName.toLowerCase();return("input"===n||"button"===n)&&e.type===t}}function l(t){return i(function(e){return e=+e,i(function(n,i){for(var r,o=t([],n.length,e),s=o.length;s--;)n[r=o[s]]&&(n[r]=!(i[r]=n[r]))})})}function c(t){return t&&"undefined"!=typeof t.getElementsByTagName&&t}function h(){}function f(t){for(var e=0,n=t.length,i="";n>e;e++)i+=t[e].value;return i}function d(t,e,n){var i=e.dir,r=n&&"parentNode"===i,o=L++;return e.first?function(e,n,o){for(;e=e[i];)if(1===e.nodeType||r)return t(e,n,o)}:function(e,n,s){var a,u,l=[R,o];if(s){for(;e=e[i];)if((1===e.nodeType||r)&&t(e,n,s))return!0}else for(;e=e[i];)if(1===e.nodeType||r){if(u=e[I]||(e[I]={}),(a=u[i])&&a[0]===R&&a[1]===o)return l[2]=a[2];if(u[i]=l,l[2]=t(e,n,s))return!0}}}function p(t){return t.length>1?function(e,n,i){for(var r=t.length;r--;)if(!t[r](e,n,i))return!1;return!0}:t[0]}function g(t,n,i){for(var r=0,o=n.length;o>r;r++)e(t,n[r],i);return i}function v(t,e,n,i,r){for(var o,s=[],a=0,u=t.length,l=null!=e;u>a;a++)(o=t[a])&&(!n||n(o,i,r))&&(s.push(o),l&&e.push(a));return s}function m(t,e,n,r,o,s){return r&&!r[I]&&(r=m(r)),o&&!o[I]&&(o=m(o,s)),i(function(i,s,a,u){var l,c,h,f=[],d=[],p=s.length,m=i||g(e||"*",a.nodeType?[a]:a,[]),y=!t||!i&&e?m:v(m,f,t,a,u),b=n?o||(i?t:p||r)?[]:s:y;if(n&&n(y,b,a,u),r)for(l=v(b,d),r(l,[],a,u),c=l.length;c--;)(h=l[c])&&(b[d[c]]=!(y[d[c]]=h));if(i){if(o||t){if(o){for(l=[],c=b.length;c--;)(h=b[c])&&l.push(y[c]=h);o(null,b=[],l,u)}for(c=b.length;c--;)(h=b[c])&&(l=o?tt(i,h):f[c])>-1&&(i[l]=!(s[l]=h))}}else b=v(b===s?b.splice(p,b.length):b),o?o(null,s,b,u):Q.apply(s,b)})}function y(t){for(var e,n,i,r=t.length,o=w.relative[t[0].type],s=o||w.relative[" "],a=o?1:0,u=d(function(t){return t===e},s,!0),l=d(function(t){return tt(e,t)>-1},s,!0),c=[function(t,n,i){var r=!o&&(i||n!==S)||((e=n).nodeType?u(t,n,i):l(t,n,i));return e=null,r}];r>a;a++)if(n=w.relative[t[a].type])c=[d(p(c),n)];else{if(n=w.filter[t[a].type].apply(null,t[a].matches),n[I]){for(i=++a;r>i&&!w.relative[t[i].type];i++);return m(a>1&&p(c),a>1&&f(t.slice(0,a-1).concat({value:" "===t[a-2].type?"*":""})).replace(ut,"$1"),n,i>a&&y(t.slice(a,i)),r>i&&y(t=t.slice(i)),r>i&&f(t))}c.push(n)}return p(c)}function b(t,n){var r=n.length>0,o=t.length>0,s=function(i,s,a,u,l){var c,h,f,d=0,p="0",g=i&&[],m=[],y=S,b=i||o&&w.find.TAG("*",l),x=R+=null==y?1:Math.random()||.1,_=b.length;for(l&&(S=s!==B&&s);p!==_&&null!=(c=b[p]);p++){if(o&&c){for(h=0;f=t[h++];)if(f(c,s,a)){u.push(c);break}l&&(R=x)}r&&((c=!f&&c)&&d--,i&&g.push(c))}if(d+=p,r&&p!==d){for(h=0;f=n[h++];)f(g,m,s,a);if(i){if(d>0)for(;p--;)g[p]||m[p]||(m[p]=K.call(u));m=v(m)}Q.apply(u,m),l&&!i&&m.length>0&&d+n.length>1&&e.uniqueSort(u)}return l&&(R=x,S=y),g};return r?i(s):s}var x,_,w,E,k,T,C,j,S,A,M,N,B,O,P,$,D,F,H,I="sizzle"+1*new Date,q=t.document,R=0,L=0,V=n(),z=n(),U=n(),W=function(t,e){return t===e&&(M=!0),0},J=1<<31,X={}.hasOwnProperty,G=[],K=G.pop,Y=G.push,Q=G.push,Z=G.slice,tt=function(t,e){for(var n=0,i=t.length;i>n;n++)if(t[n]===e)return n;return-1},et="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",nt="[\\x20\\t\\r\\n\\f]",it="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",rt=it.replace("w","w#"),ot="\\["+nt+"*("+it+")(?:"+nt+"*([*^$|!~]?=)"+nt+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+rt+"))|)"+nt+"*\\]",st=":("+it+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+ot+")*)|.*)\\)|)",at=new RegExp(nt+"+","g"),ut=new RegExp("^"+nt+"+|((?:^|[^\\\\])(?:\\\\.)*)"+nt+"+$","g"),lt=new RegExp("^"+nt+"*,"+nt+"*"),ct=new RegExp("^"+nt+"*([>+~]|"+nt+")"+nt+"*"),ht=new RegExp("="+nt+"*([^\\]'\"]*?)"+nt+"*\\]","g"),ft=new RegExp(st),dt=new RegExp("^"+rt+"$"),pt={ID:new RegExp("^#("+it+")"),CLASS:new RegExp("^\\.("+it+")"),TAG:new RegExp("^("+it.replace("w","w*")+")"),ATTR:new RegExp("^"+ot),PSEUDO:new RegExp("^"+st),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+nt+"*(even|odd|(([+-]|)(\\d*)n|)"+nt+"*(?:([+-]|)"+nt+"*(\\d+)|))"+nt+"*\\)|)","i"),bool:new RegExp("^(?:"+et+")$","i"),needsContext:new RegExp("^"+nt+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+nt+"*((?:-\\d)?\\d*)"+nt+"*\\)|)(?=[^-]|$)","i")},gt=/^(?:input|select|textarea|button)$/i,vt=/^h\d$/i,mt=/^[^{]+\{\s*\[native \w/,yt=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,bt=/[+~]/,xt=/'|\\/g,_t=new RegExp("\\\\([\\da-f]{1,6}"+nt+"?|("+nt+")|.)","ig"),wt=function(t,e,n){var i="0x"+e-65536;return i!==i||n?e:0>i?String.fromCharCode(i+65536):String.fromCharCode(i>>10|55296,1023&i|56320)},Et=function(){N()};try{Q.apply(G=Z.call(q.childNodes),q.childNodes),G[q.childNodes.length].nodeType}catch(kt){Q={apply:G.length?function(t,e){Y.apply(t,Z.call(e))}:function(t,e){for(var n=t.length,i=0;t[n++]=e[i++];);t.length=n-1}}}_=e.support={},k=e.isXML=function(t){var e=t&&(t.ownerDocument||t).documentElement;return e?"HTML"!==e.nodeName:!1},N=e.setDocument=function(t){var e,n,i=t?t.ownerDocument||t:q;return i!==B&&9===i.nodeType&&i.documentElement?(B=i,O=i.documentElement,n=i.defaultView,n&&n!==n.top&&(n.addEventListener?n.addEventListener("unload",Et,!1):n.attachEvent&&n.attachEvent("onunload",Et)),P=!k(i),_.attributes=r(function(t){return t.className="i",!t.getAttribute("className")}),_.getElementsByTagName=r(function(t){return t.appendChild(i.createComment("")),!t.getElementsByTagName("*").length}),_.getElementsByClassName=mt.test(i.getElementsByClassName),_.getById=r(function(t){return O.appendChild(t).id=I,!i.getElementsByName||!i.getElementsByName(I).length}),_.getById?(w.find.ID=function(t,e){if("undefined"!=typeof e.getElementById&&P){var n=e.getElementById(t);return n&&n.parentNode?[n]:[]}},w.filter.ID=function(t){var e=t.replace(_t,wt);return function(t){return t.getAttribute("id")===e}}):(delete w.find.ID,w.filter.ID=function(t){var e=t.replace(_t,wt);return function(t){var n="undefined"!=typeof t.getAttributeNode&&t.getAttributeNode("id");return n&&n.value===e}}),w.find.TAG=_.getElementsByTagName?function(t,e){return"undefined"!=typeof e.getElementsByTagName?e.getElementsByTagName(t):_.qsa?e.querySelectorAll(t):void 0}:function(t,e){var n,i=[],r=0,o=e.getElementsByTagName(t);if("*"===t){for(;n=o[r++];)1===n.nodeType&&i.push(n);return i}return o},w.find.CLASS=_.getElementsByClassName&&function(t,e){return P?e.getElementsByClassName(t):void 0},D=[],$=[],(_.qsa=mt.test(i.querySelectorAll))&&(r(function(t){O.appendChild(t).innerHTML="<a id='"+I+"'></a><select id='"+I+"-\f]' msallowcapture=''><option selected=''></option></select>",t.querySelectorAll("[msallowcapture^='']").length&&$.push("[*^$]="+nt+"*(?:''|\"\")"),t.querySelectorAll("[selected]").length||$.push("\\["+nt+"*(?:value|"+et+")"),t.querySelectorAll("[id~="+I+"-]").length||$.push("~="),t.querySelectorAll(":checked").length||$.push(":checked"),t.querySelectorAll("a#"+I+"+*").length||$.push(".#.+[+~]")}),r(function(t){var e=i.createElement("input");e.setAttribute("type","hidden"),t.appendChild(e).setAttribute("name","D"),t.querySelectorAll("[name=d]").length&&$.push("name"+nt+"*[*^$|!~]?="),t.querySelectorAll(":enabled").length||$.push(":enabled",":disabled"),t.querySelectorAll("*,:x"),$.push(",.*:")})),(_.matchesSelector=mt.test(F=O.matches||O.webkitMatchesSelector||O.mozMatchesSelector||O.oMatchesSelector||O.msMatchesSelector))&&r(function(t){_.disconnectedMatch=F.call(t,"div"),F.call(t,"[s!='']:x"),D.push("!=",st)}),$=$.length&&new RegExp($.join("|")),D=D.length&&new RegExp(D.join("|")),e=mt.test(O.compareDocumentPosition),H=e||mt.test(O.contains)?function(t,e){var n=9===t.nodeType?t.documentElement:t,i=e&&e.parentNode;return t===i||!(!i||1!==i.nodeType||!(n.contains?n.contains(i):t.compareDocumentPosition&&16&t.compareDocumentPosition(i)))}:function(t,e){if(e)for(;e=e.parentNode;)if(e===t)return!0;return!1},W=e?function(t,e){if(t===e)return M=!0,0;var n=!t.compareDocumentPosition-!e.compareDocumentPosition;return n?n:(n=(t.ownerDocument||t)===(e.ownerDocument||e)?t.compareDocumentPosition(e):1,1&n||!_.sortDetached&&e.compareDocumentPosition(t)===n?t===i||t.ownerDocument===q&&H(q,t)?-1:e===i||e.ownerDocument===q&&H(q,e)?1:A?tt(A,t)-tt(A,e):0:4&n?-1:1)}:function(t,e){if(t===e)return M=!0,0;var n,r=0,o=t.parentNode,a=e.parentNode,u=[t],l=[e];if(!o||!a)return t===i?-1:e===i?1:o?-1:a?1:A?tt(A,t)-tt(A,e):0;if(o===a)return s(t,e);for(n=t;n=n.parentNode;)u.unshift(n);for(n=e;n=n.parentNode;)l.unshift(n);for(;u[r]===l[r];)r++;return r?s(u[r],l[r]):u[r]===q?-1:l[r]===q?1:0},i):B},e.matches=function(t,n){return e(t,null,null,n)},e.matchesSelector=function(t,n){if((t.ownerDocument||t)!==B&&N(t),n=n.replace(ht,"='$1']"),_.matchesSelector&&P&&(!D||!D.test(n))&&(!$||!$.test(n)))try{var i=F.call(t,n);if(i||_.disconnectedMatch||t.document&&11!==t.document.nodeType)return i}catch(r){}return e(n,B,null,[t]).length>0},e.contains=function(t,e){return(t.ownerDocument||t)!==B&&N(t),H(t,e)},e.attr=function(t,e){(t.ownerDocument||t)!==B&&N(t);var n=w.attrHandle[e.toLowerCase()],i=n&&X.call(w.attrHandle,e.toLowerCase())?n(t,e,!P):void 0;return void 0!==i?i:_.attributes||!P?t.getAttribute(e):(i=t.getAttributeNode(e))&&i.specified?i.value:null},e.error=function(t){throw new Error("Syntax error, unrecognized expression: "+t)},e.uniqueSort=function(t){var e,n=[],i=0,r=0;if(M=!_.detectDuplicates,A=!_.sortStable&&t.slice(0),t.sort(W),M){for(;e=t[r++];)e===t[r]&&(i=n.push(r));for(;i--;)t.splice(n[i],1)}return A=null,t},E=e.getText=function(t){var e,n="",i=0,r=t.nodeType;if(r){if(1===r||9===r||11===r){if("string"==typeof t.textContent)return t.textContent;for(t=t.firstChild;t;t=t.nextSibling)n+=E(t)}else if(3===r||4===r)return t.nodeValue}else for(;e=t[i++];)n+=E(e);return n},w=e.selectors={cacheLength:50,createPseudo:i,match:pt,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(t){return t[1]=t[1].replace(_t,wt),t[3]=(t[3]||t[4]||t[5]||"").replace(_t,wt),"~="===t[2]&&(t[3]=" "+t[3]+" "),t.slice(0,4)},CHILD:function(t){return t[1]=t[1].toLowerCase(),"nth"===t[1].slice(0,3)?(t[3]||e.error(t[0]),t[4]=+(t[4]?t[5]+(t[6]||1):2*("even"===t[3]||"odd"===t[3])),t[5]=+(t[7]+t[8]||"odd"===t[3])):t[3]&&e.error(t[0]),t},PSEUDO:function(t){var e,n=!t[6]&&t[2];return pt.CHILD.test(t[0])?null:(t[3]?t[2]=t[4]||t[5]||"":n&&ft.test(n)&&(e=T(n,!0))&&(e=n.indexOf(")",n.length-e)-n.length)&&(t[0]=t[0].slice(0,e),t[2]=n.slice(0,e)),t.slice(0,3))}},filter:{TAG:function(t){var e=t.replace(_t,wt).toLowerCase();return"*"===t?function(){return!0}:function(t){return t.nodeName&&t.nodeName.toLowerCase()===e}},CLASS:function(t){var e=V[t+" "];return e||(e=new RegExp("(^|"+nt+")"+t+"("+nt+"|$)"))&&V(t,function(t){return e.test("string"==typeof t.className&&t.className||"undefined"!=typeof t.getAttribute&&t.getAttribute("class")||"")})},ATTR:function(t,n,i){return function(r){var o=e.attr(r,t);return null==o?"!="===n:n?(o+="","="===n?o===i:"!="===n?o!==i:"^="===n?i&&0===o.indexOf(i):"*="===n?i&&o.indexOf(i)>-1:"$="===n?i&&o.slice(-i.length)===i:"~="===n?(" "+o.replace(at," ")+" ").indexOf(i)>-1:"|="===n?o===i||o.slice(0,i.length+1)===i+"-":!1):!0}},CHILD:function(t,e,n,i,r){var o="nth"!==t.slice(0,3),s="last"!==t.slice(-4),a="of-type"===e;return 1===i&&0===r?function(t){return!!t.parentNode}:function(e,n,u){var l,c,h,f,d,p,g=o!==s?"nextSibling":"previousSibling",v=e.parentNode,m=a&&e.nodeName.toLowerCase(),y=!u&&!a;if(v){if(o){for(;g;){for(h=e;h=h[g];)if(a?h.nodeName.toLowerCase()===m:1===h.nodeType)return!1;p=g="only"===t&&!p&&"nextSibling"}return!0}if(p=[s?v.firstChild:v.lastChild],s&&y){for(c=v[I]||(v[I]={}),l=c[t]||[],d=l[0]===R&&l[1],f=l[0]===R&&l[2],h=d&&v.childNodes[d];h=++d&&h&&h[g]||(f=d=0)||p.pop();)if(1===h.nodeType&&++f&&h===e){c[t]=[R,d,f];break}}else if(y&&(l=(e[I]||(e[I]={}))[t])&&l[0]===R)f=l[1];else for(;(h=++d&&h&&h[g]||(f=d=0)||p.pop())&&((a?h.nodeName.toLowerCase()!==m:1!==h.nodeType)||!++f||(y&&((h[I]||(h[I]={}))[t]=[R,f]),h!==e)););return f-=r,f===i||f%i===0&&f/i>=0}}},PSEUDO:function(t,n){var r,o=w.pseudos[t]||w.setFilters[t.toLowerCase()]||e.error("unsupported pseudo: "+t);return o[I]?o(n):o.length>1?(r=[t,t,"",n],w.setFilters.hasOwnProperty(t.toLowerCase())?i(function(t,e){for(var i,r=o(t,n),s=r.length;s--;)i=tt(t,r[s]),t[i]=!(e[i]=r[s])}):function(t){return o(t,0,r)}):o}},pseudos:{not:i(function(t){var e=[],n=[],r=C(t.replace(ut,"$1"));return r[I]?i(function(t,e,n,i){for(var o,s=r(t,null,i,[]),a=t.length;a--;)(o=s[a])&&(t[a]=!(e[a]=o))}):function(t,i,o){return e[0]=t,r(e,null,o,n),e[0]=null,!n.pop()}}),has:i(function(t){return function(n){return e(t,n).length>0}}),contains:i(function(t){return t=t.replace(_t,wt),function(e){return(e.textContent||e.innerText||E(e)).indexOf(t)>-1}}),lang:i(function(t){return dt.test(t||"")||e.error("unsupported lang: "+t),t=t.replace(_t,wt).toLowerCase(),function(e){var n;do if(n=P?e.lang:e.getAttribute("xml:lang")||e.getAttribute("lang"))return n=n.toLowerCase(),n===t||0===n.indexOf(t+"-");while((e=e.parentNode)&&1===e.nodeType);return!1}}),target:function(e){var n=t.location&&t.location.hash;return n&&n.slice(1)===e.id},root:function(t){return t===O},focus:function(t){return t===B.activeElement&&(!B.hasFocus||B.hasFocus())&&!!(t.type||t.href||~t.tabIndex)},enabled:function(t){return t.disabled===!1},disabled:function(t){return t.disabled===!0},checked:function(t){var e=t.nodeName.toLowerCase();return"input"===e&&!!t.checked||"option"===e&&!!t.selected},selected:function(t){return t.parentNode&&t.parentNode.selectedIndex,t.selected===!0},empty:function(t){for(t=t.firstChild;t;t=t.nextSibling)if(t.nodeType<6)return!1;return!0},parent:function(t){return!w.pseudos.empty(t)},header:function(t){return vt.test(t.nodeName)},input:function(t){return gt.test(t.nodeName)},button:function(t){var e=t.nodeName.toLowerCase();return"input"===e&&"button"===t.type||"button"===e},text:function(t){var e;return"input"===t.nodeName.toLowerCase()&&"text"===t.type&&(null==(e=t.getAttribute("type"))||"text"===e.toLowerCase())},first:l(function(){return[0]}),last:l(function(t,e){return[e-1]}),eq:l(function(t,e,n){return[0>n?n+e:n]}),even:l(function(t,e){for(var n=0;e>n;n+=2)t.push(n);return t}),odd:l(function(t,e){for(var n=1;e>n;n+=2)t.push(n);return t}),lt:l(function(t,e,n){for(var i=0>n?n+e:n;--i>=0;)t.push(i);return t}),gt:l(function(t,e,n){for(var i=0>n?n+e:n;++i<e;)t.push(i);return t})}},w.pseudos.nth=w.pseudos.eq;for(x in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})w.pseudos[x]=a(x);for(x in{submit:!0,reset:!0})w.pseudos[x]=u(x);return h.prototype=w.filters=w.pseudos,w.setFilters=new h,T=e.tokenize=function(t,n){var i,r,o,s,a,u,l,c=z[t+" "];if(c)return n?0:c.slice(0);for(a=t,u=[],l=w.preFilter;a;){(!i||(r=lt.exec(a)))&&(r&&(a=a.slice(r[0].length)||a),u.push(o=[])),i=!1,(r=ct.exec(a))&&(i=r.shift(),o.push({value:i,type:r[0].replace(ut," ")}),a=a.slice(i.length));for(s in w.filter)!(r=pt[s].exec(a))||l[s]&&!(r=l[s](r))||(i=r.shift(),o.push({value:i,type:s,matches:r}),a=a.slice(i.length));if(!i)break}return n?a.length:a?e.error(t):z(t,u).slice(0)},C=e.compile=function(t,e){var n,i=[],r=[],o=U[t+" "];if(!o){for(e||(e=T(t)),n=e.length;n--;)o=y(e[n]),o[I]?i.push(o):r.push(o);o=U(t,b(r,i)),o.selector=t}return o},j=e.select=function(t,e,n,i){var r,o,s,a,u,l="function"==typeof t&&t,h=!i&&T(t=l.selector||t);if(n=n||[],1===h.length){if(o=h[0]=h[0].slice(0),o.length>2&&"ID"===(s=o[0]).type&&_.getById&&9===e.nodeType&&P&&w.relative[o[1].type]){if(e=(w.find.ID(s.matches[0].replace(_t,wt),e)||[])[0],!e)return n;l&&(e=e.parentNode),t=t.slice(o.shift().value.length)}for(r=pt.needsContext.test(t)?0:o.length;r--&&(s=o[r],!w.relative[a=s.type]);)if((u=w.find[a])&&(i=u(s.matches[0].replace(_t,wt),bt.test(o[0].type)&&c(e.parentNode)||e))){if(o.splice(r,1),t=i.length&&f(o),!t)return Q.apply(n,i),n;break}}return(l||C(t,h))(i,e,!P,n,bt.test(t)&&c(e.parentNode)||e),n},_.sortStable=I.split("").sort(W).join("")===I,_.detectDuplicates=!!M,N(),_.sortDetached=r(function(t){return 1&t.compareDocumentPosition(B.createElement("div"))}),r(function(t){return t.innerHTML="<a href='#'></a>","#"===t.firstChild.getAttribute("href")})||o("type|href|height|width",function(t,e,n){return n?void 0:t.getAttribute(e,"type"===e.toLowerCase()?1:2)}),_.attributes&&r(function(t){return t.innerHTML="<input/>",t.firstChild.setAttribute("value",""),""===t.firstChild.getAttribute("value")})||o("value",function(t,e,n){return n||"input"!==t.nodeName.toLowerCase()?void 0:t.defaultValue}),r(function(t){return null==t.getAttribute("disabled")})||o(et,function(t,e,n){var i;return n?void 0:t[e]===!0?e.toLowerCase():(i=t.getAttributeNode(e))&&i.specified?i.value:null}),e}(t);Z.find=rt,Z.expr=rt.selectors,Z.expr[":"]=Z.expr.pseudos,Z.unique=rt.uniqueSort,Z.text=rt.getText,Z.isXMLDoc=rt.isXML,Z.contains=rt.contains;var ot=Z.expr.match.needsContext,st=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,at=/^.[^:#\[\.,]*$/;Z.filter=function(t,e,n){var i=e[0];return n&&(t=":not("+t+")"),1===e.length&&1===i.nodeType?Z.find.matchesSelector(i,t)?[i]:[]:Z.find.matches(t,Z.grep(e,function(t){return 1===t.nodeType}))},Z.fn.extend({find:function(t){var e,n=this.length,i=[],r=this;if("string"!=typeof t)return this.pushStack(Z(t).filter(function(){for(e=0;n>e;e++)if(Z.contains(r[e],this))return!0}));for(e=0;n>e;e++)Z.find(t,r[e],i);return i=this.pushStack(n>1?Z.unique(i):i),i.selector=this.selector?this.selector+" "+t:t,i},filter:function(t){return this.pushStack(i(this,t||[],!1))},not:function(t){return this.pushStack(i(this,t||[],!0))},is:function(t){return!!i(this,"string"==typeof t&&ot.test(t)?Z(t):t||[],!1).length}});var ut,lt=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,ct=Z.fn.init=function(t,e){var n,i;if(!t)return this;if("string"==typeof t){if(n="<"===t[0]&&">"===t[t.length-1]&&t.length>=3?[null,t,null]:lt.exec(t),!n||!n[1]&&e)return!e||e.jquery?(e||ut).find(t):this.constructor(e).find(t);if(n[1]){if(e=e instanceof Z?e[0]:e,Z.merge(this,Z.parseHTML(n[1],e&&e.nodeType?e.ownerDocument||e:Y,!0)),st.test(n[1])&&Z.isPlainObject(e))for(n in e)Z.isFunction(this[n])?this[n](e[n]):this.attr(n,e[n]);return this}return i=Y.getElementById(n[2]),i&&i.parentNode&&(this.length=1,this[0]=i),this.context=Y,this.selector=t,this}return t.nodeType?(this.context=this[0]=t,this.length=1,this):Z.isFunction(t)?"undefined"!=typeof ut.ready?ut.ready(t):t(Z):(void 0!==t.selector&&(this.selector=t.selector,this.context=t.context),Z.makeArray(t,this))};ct.prototype=Z.fn,ut=Z(Y);var ht=/^(?:parents|prev(?:Until|All))/,ft={children:!0,contents:!0,next:!0,prev:!0};Z.extend({dir:function(t,e,n){for(var i=[],r=void 0!==n;(t=t[e])&&9!==t.nodeType;)if(1===t.nodeType){if(r&&Z(t).is(n))break;i.push(t)}return i},sibling:function(t,e){for(var n=[];t;t=t.nextSibling)1===t.nodeType&&t!==e&&n.push(t);return n}}),Z.fn.extend({has:function(t){var e=Z(t,this),n=e.length;return this.filter(function(){for(var t=0;n>t;t++)if(Z.contains(this,e[t]))return!0})},closest:function(t,e){for(var n,i=0,r=this.length,o=[],s=ot.test(t)||"string"!=typeof t?Z(t,e||this.context):0;r>i;i++)for(n=this[i];n&&n!==e;n=n.parentNode)if(n.nodeType<11&&(s?s.index(n)>-1:1===n.nodeType&&Z.find.matchesSelector(n,t))){o.push(n);break}return this.pushStack(o.length>1?Z.unique(o):o)},index:function(t){return t?"string"==typeof t?W.call(Z(t),this[0]):W.call(this,t.jquery?t[0]:t):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(t,e){return this.pushStack(Z.unique(Z.merge(this.get(),Z(t,e))))},addBack:function(t){return this.add(null==t?this.prevObject:this.prevObject.filter(t))}}),Z.each({parent:function(t){var e=t.parentNode;return e&&11!==e.nodeType?e:null},parents:function(t){return Z.dir(t,"parentNode")},parentsUntil:function(t,e,n){return Z.dir(t,"parentNode",n)},next:function(t){return r(t,"nextSibling")},prev:function(t){return r(t,"previousSibling")},nextAll:function(t){return Z.dir(t,"nextSibling")},prevAll:function(t){return Z.dir(t,"previousSibling")},nextUntil:function(t,e,n){return Z.dir(t,"nextSibling",n)},prevUntil:function(t,e,n){return Z.dir(t,"previousSibling",n)},siblings:function(t){return Z.sibling((t.parentNode||{}).firstChild,t)},children:function(t){return Z.sibling(t.firstChild)},contents:function(t){return t.contentDocument||Z.merge([],t.childNodes)}},function(t,e){Z.fn[t]=function(n,i){var r=Z.map(this,e,n);return"Until"!==t.slice(-5)&&(i=n),i&&"string"==typeof i&&(r=Z.filter(i,r)),this.length>1&&(ft[t]||Z.unique(r),ht.test(t)&&r.reverse()),this.pushStack(r)}});var dt=/\S+/g,pt={};Z.Callbacks=function(t){t="string"==typeof t?pt[t]||o(t):Z.extend({},t);var e,n,i,r,s,a,u=[],l=!t.once&&[],c=function(o){for(e=t.memory&&o,n=!0,a=r||0,r=0,s=u.length,i=!0;u&&s>a;a++)if(u[a].apply(o[0],o[1])===!1&&t.stopOnFalse){e=!1;break}i=!1,u&&(l?l.length&&c(l.shift()):e?u=[]:h.disable())},h={add:function(){if(u){var n=u.length;!function o(e){Z.each(e,function(e,n){var i=Z.type(n);"function"===i?t.unique&&h.has(n)||u.push(n):n&&n.length&&"string"!==i&&o(n)})}(arguments),i?s=u.length:e&&(r=n,c(e))}return this},remove:function(){return u&&Z.each(arguments,function(t,e){for(var n;(n=Z.inArray(e,u,n))>-1;)u.splice(n,1),i&&(s>=n&&s--,a>=n&&a--)}),this},has:function(t){return t?Z.inArray(t,u)>-1:!(!u||!u.length)},empty:function(){return u=[],s=0,this},disable:function(){return u=l=e=void 0,this},disabled:function(){return!u},lock:function(){return l=void 0,e||h.disable(),this},locked:function(){return!l},fireWith:function(t,e){return!u||n&&!l||(e=e||[],e=[t,e.slice?e.slice():e],i?l.push(e):c(e)),this},fire:function(){return h.fireWith(this,arguments),this},fired:function(){return!!n}};return h},Z.extend({Deferred:function(t){var e=[["resolve","done",Z.Callbacks("once memory"),"resolved"],["reject","fail",Z.Callbacks("once memory"),"rejected"],["notify","progress",Z.Callbacks("memory")]],n="pending",i={state:function(){return n},always:function(){return r.done(arguments).fail(arguments),this},then:function(){var t=arguments;return Z.Deferred(function(n){Z.each(e,function(e,o){var s=Z.isFunction(t[e])&&t[e];r[o[1]](function(){var t=s&&s.apply(this,arguments);t&&Z.isFunction(t.promise)?t.promise().done(n.resolve).fail(n.reject).progress(n.notify):n[o[0]+"With"](this===i?n.promise():this,s?[t]:arguments)})}),t=null}).promise()},promise:function(t){return null!=t?Z.extend(t,i):i}},r={};return i.pipe=i.then,Z.each(e,function(t,o){var s=o[2],a=o[3];i[o[1]]=s.add,a&&s.add(function(){n=a},e[1^t][2].disable,e[2][2].lock),r[o[0]]=function(){return r[o[0]+"With"](this===r?i:this,arguments),this},r[o[0]+"With"]=s.fireWith}),i.promise(r),t&&t.call(r,r),r},when:function(t){var e,n,i,r=0,o=V.call(arguments),s=o.length,a=1!==s||t&&Z.isFunction(t.promise)?s:0,u=1===a?t:Z.Deferred(),l=function(t,n,i){return function(r){n[t]=this,i[t]=arguments.length>1?V.call(arguments):r,i===e?u.notifyWith(n,i):--a||u.resolveWith(n,i)}};if(s>1)for(e=new Array(s),n=new Array(s),i=new Array(s);s>r;r++)o[r]&&Z.isFunction(o[r].promise)?o[r].promise().done(l(r,i,o)).fail(u.reject).progress(l(r,n,e)):--a;return a||u.resolveWith(i,o),u.promise()}});var gt;Z.fn.ready=function(t){return Z.ready.promise().done(t),this},Z.extend({isReady:!1,readyWait:1,holdReady:function(t){t?Z.readyWait++:Z.ready(!0)},ready:function(t){(t===!0?--Z.readyWait:Z.isReady)||(Z.isReady=!0,t!==!0&&--Z.readyWait>0||(gt.resolveWith(Y,[Z]),Z.fn.triggerHandler&&(Z(Y).triggerHandler("ready"),Z(Y).off("ready"))))}}),Z.ready.promise=function(e){return gt||(gt=Z.Deferred(),"complete"===Y.readyState?setTimeout(Z.ready):(Y.addEventListener("DOMContentLoaded",s,!1),t.addEventListener("load",s,!1))),gt.promise(e)},Z.ready.promise();var vt=Z.access=function(t,e,n,i,r,o,s){var a=0,u=t.length,l=null==n;if("object"===Z.type(n)){r=!0;for(a in n)Z.access(t,e,a,n[a],!0,o,s)}else if(void 0!==i&&(r=!0,Z.isFunction(i)||(s=!0),l&&(s?(e.call(t,i),e=null):(l=e,e=function(t,e,n){return l.call(Z(t),n)})),e))for(;u>a;a++)e(t[a],n,s?i:i.call(t[a],a,e(t[a],n)));return r?t:l?e.call(t):u?e(t[0],n):o};Z.acceptData=function(t){return 1===t.nodeType||9===t.nodeType||!+t.nodeType},a.uid=1,a.accepts=Z.acceptData,a.prototype={key:function(t){if(!a.accepts(t))return 0;var e={},n=t[this.expando];if(!n){n=a.uid++;try{e[this.expando]={value:n},Object.defineProperties(t,e)}catch(i){e[this.expando]=n,Z.extend(t,e)}}return this.cache[n]||(this.cache[n]={}),n},set:function(t,e,n){var i,r=this.key(t),o=this.cache[r];if("string"==typeof e)o[e]=n;else if(Z.isEmptyObject(o))Z.extend(this.cache[r],e);else for(i in e)o[i]=e[i];return o},get:function(t,e){var n=this.cache[this.key(t)];return void 0===e?n:n[e]},access:function(t,e,n){var i;return void 0===e||e&&"string"==typeof e&&void 0===n?(i=this.get(t,e),void 0!==i?i:this.get(t,Z.camelCase(e))):(this.set(t,e,n),void 0!==n?n:e)},remove:function(t,e){var n,i,r,o=this.key(t),s=this.cache[o];if(void 0===e)this.cache[o]={};else{Z.isArray(e)?i=e.concat(e.map(Z.camelCase)):(r=Z.camelCase(e),e in s?i=[e,r]:(i=r,i=i in s?[i]:i.match(dt)||[])),n=i.length;for(;n--;)delete s[i[n]]}},hasData:function(t){return!Z.isEmptyObject(this.cache[t[this.expando]]||{})},discard:function(t){t[this.expando]&&delete this.cache[t[this.expando]]}};var mt=new a,yt=new a,bt=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,xt=/([A-Z])/g;Z.extend({hasData:function(t){return yt.hasData(t)||mt.hasData(t)},data:function(t,e,n){return yt.access(t,e,n)},removeData:function(t,e){yt.remove(t,e)},_data:function(t,e,n){return mt.access(t,e,n)},_removeData:function(t,e){mt.remove(t,e)}}),Z.fn.extend({data:function(t,e){var n,i,r,o=this[0],s=o&&o.attributes;if(void 0===t){if(this.length&&(r=yt.get(o),1===o.nodeType&&!mt.get(o,"hasDataAttrs"))){for(n=s.length;n--;)s[n]&&(i=s[n].name,0===i.indexOf("data-")&&(i=Z.camelCase(i.slice(5)),u(o,i,r[i])));mt.set(o,"hasDataAttrs",!0)}return r}return"object"==typeof t?this.each(function(){yt.set(this,t)}):vt(this,function(e){var n,i=Z.camelCase(t);if(o&&void 0===e){if(n=yt.get(o,t),void 0!==n)return n;if(n=yt.get(o,i),void 0!==n)return n;if(n=u(o,i,void 0),void 0!==n)return n}else this.each(function(){var n=yt.get(this,i);yt.set(this,i,e),-1!==t.indexOf("-")&&void 0!==n&&yt.set(this,t,e)})},null,e,arguments.length>1,null,!0)},removeData:function(t){return this.each(function(){yt.remove(this,t)})}}),Z.extend({queue:function(t,e,n){var i;return t?(e=(e||"fx")+"queue",i=mt.get(t,e),n&&(!i||Z.isArray(n)?i=mt.access(t,e,Z.makeArray(n)):i.push(n)),i||[]):void 0},dequeue:function(t,e){e=e||"fx";var n=Z.queue(t,e),i=n.length,r=n.shift(),o=Z._queueHooks(t,e),s=function(){Z.dequeue(t,e)};"inprogress"===r&&(r=n.shift(),i--),r&&("fx"===e&&n.unshift("inprogress"),delete o.stop,r.call(t,s,o)),!i&&o&&o.empty.fire()},_queueHooks:function(t,e){var n=e+"queueHooks";return mt.get(t,n)||mt.access(t,n,{empty:Z.Callbacks("once memory").add(function(){mt.remove(t,[e+"queue",n])})})}}),Z.fn.extend({queue:function(t,e){var n=2;return"string"!=typeof t&&(e=t,t="fx",n--),arguments.length<n?Z.queue(this[0],t):void 0===e?this:this.each(function(){var n=Z.queue(this,t,e);Z._queueHooks(this,t),"fx"===t&&"inprogress"!==n[0]&&Z.dequeue(this,t)})},dequeue:function(t){return this.each(function(){Z.dequeue(this,t)})},clearQueue:function(t){return this.queue(t||"fx",[])},promise:function(t,e){var n,i=1,r=Z.Deferred(),o=this,s=this.length,a=function(){--i||r.resolveWith(o,[o])};for("string"!=typeof t&&(e=t,t=void 0),t=t||"fx";s--;)n=mt.get(o[s],t+"queueHooks"),n&&n.empty&&(i++,n.empty.add(a));return a(),r.promise(e)}});var _t=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,wt=["Top","Right","Bottom","Left"],Et=function(t,e){return t=e||t,"none"===Z.css(t,"display")||!Z.contains(t.ownerDocument,t)},kt=/^(?:checkbox|radio)$/i;!function(){var t=Y.createDocumentFragment(),e=t.appendChild(Y.createElement("div")),n=Y.createElement("input");n.setAttribute("type","radio"),n.setAttribute("checked","checked"),n.setAttribute("name","t"),e.appendChild(n),K.checkClone=e.cloneNode(!0).cloneNode(!0).lastChild.checked,e.innerHTML="<textarea>x</textarea>",K.noCloneChecked=!!e.cloneNode(!0).lastChild.defaultValue}();var Tt="undefined";K.focusinBubbles="onfocusin"in t;var Ct=/^key/,jt=/^(?:mouse|pointer|contextmenu)|click/,St=/^(?:focusinfocus|focusoutblur)$/,At=/^([^.]*)(?:\.(.+)|)$/;Z.event={global:{},add:function(t,e,n,i,r){var o,s,a,u,l,c,h,f,d,p,g,v=mt.get(t);if(v)for(n.handler&&(o=n,n=o.handler,r=o.selector),n.guid||(n.guid=Z.guid++),(u=v.events)||(u=v.events={}),(s=v.handle)||(s=v.handle=function(e){return typeof Z!==Tt&&Z.event.triggered!==e.type?Z.event.dispatch.apply(t,arguments):void 0}),e=(e||"").match(dt)||[""],l=e.length;l--;)a=At.exec(e[l])||[],d=g=a[1],p=(a[2]||"").split(".").sort(),d&&(h=Z.event.special[d]||{},d=(r?h.delegateType:h.bindType)||d,h=Z.event.special[d]||{},c=Z.extend({type:d,origType:g,data:i,handler:n,guid:n.guid,selector:r,needsContext:r&&Z.expr.match.needsContext.test(r),namespace:p.join(".")},o),(f=u[d])||(f=u[d]=[],f.delegateCount=0,h.setup&&h.setup.call(t,i,p,s)!==!1||t.addEventListener&&t.addEventListener(d,s,!1)),h.add&&(h.add.call(t,c),c.handler.guid||(c.handler.guid=n.guid)),r?f.splice(f.delegateCount++,0,c):f.push(c),Z.event.global[d]=!0)},remove:function(t,e,n,i,r){var o,s,a,u,l,c,h,f,d,p,g,v=mt.hasData(t)&&mt.get(t);if(v&&(u=v.events)){for(e=(e||"").match(dt)||[""],l=e.length;l--;)if(a=At.exec(e[l])||[],d=g=a[1],p=(a[2]||"").split(".").sort(),d){for(h=Z.event.special[d]||{},d=(i?h.delegateType:h.bindType)||d,f=u[d]||[],a=a[2]&&new RegExp("(^|\\.)"+p.join("\\.(?:.*\\.|)")+"(\\.|$)"),s=o=f.length;o--;)c=f[o],!r&&g!==c.origType||n&&n.guid!==c.guid||a&&!a.test(c.namespace)||i&&i!==c.selector&&("**"!==i||!c.selector)||(f.splice(o,1),c.selector&&f.delegateCount--,h.remove&&h.remove.call(t,c));s&&!f.length&&(h.teardown&&h.teardown.call(t,p,v.handle)!==!1||Z.removeEvent(t,d,v.handle),delete u[d])}else for(d in u)Z.event.remove(t,d+e[l],n,i,!0);Z.isEmptyObject(u)&&(delete v.handle,mt.remove(t,"events"))}},trigger:function(e,n,i,r){var o,s,a,u,l,c,h,f=[i||Y],d=G.call(e,"type")?e.type:e,p=G.call(e,"namespace")?e.namespace.split("."):[];if(s=a=i=i||Y,3!==i.nodeType&&8!==i.nodeType&&!St.test(d+Z.event.triggered)&&(d.indexOf(".")>=0&&(p=d.split("."),d=p.shift(),p.sort()),l=d.indexOf(":")<0&&"on"+d,e=e[Z.expando]?e:new Z.Event(d,"object"==typeof e&&e),e.isTrigger=r?2:3,e.namespace=p.join("."),e.namespace_re=e.namespace?new RegExp("(^|\\.)"+p.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,e.result=void 0,e.target||(e.target=i),
n=null==n?[e]:Z.makeArray(n,[e]),h=Z.event.special[d]||{},r||!h.trigger||h.trigger.apply(i,n)!==!1)){if(!r&&!h.noBubble&&!Z.isWindow(i)){for(u=h.delegateType||d,St.test(u+d)||(s=s.parentNode);s;s=s.parentNode)f.push(s),a=s;a===(i.ownerDocument||Y)&&f.push(a.defaultView||a.parentWindow||t)}for(o=0;(s=f[o++])&&!e.isPropagationStopped();)e.type=o>1?u:h.bindType||d,c=(mt.get(s,"events")||{})[e.type]&&mt.get(s,"handle"),c&&c.apply(s,n),c=l&&s[l],c&&c.apply&&Z.acceptData(s)&&(e.result=c.apply(s,n),e.result===!1&&e.preventDefault());return e.type=d,r||e.isDefaultPrevented()||h._default&&h._default.apply(f.pop(),n)!==!1||!Z.acceptData(i)||l&&Z.isFunction(i[d])&&!Z.isWindow(i)&&(a=i[l],a&&(i[l]=null),Z.event.triggered=d,i[d](),Z.event.triggered=void 0,a&&(i[l]=a)),e.result}},dispatch:function(t){t=Z.event.fix(t);var e,n,i,r,o,s=[],a=V.call(arguments),u=(mt.get(this,"events")||{})[t.type]||[],l=Z.event.special[t.type]||{};if(a[0]=t,t.delegateTarget=this,!l.preDispatch||l.preDispatch.call(this,t)!==!1){for(s=Z.event.handlers.call(this,t,u),e=0;(r=s[e++])&&!t.isPropagationStopped();)for(t.currentTarget=r.elem,n=0;(o=r.handlers[n++])&&!t.isImmediatePropagationStopped();)(!t.namespace_re||t.namespace_re.test(o.namespace))&&(t.handleObj=o,t.data=o.data,i=((Z.event.special[o.origType]||{}).handle||o.handler).apply(r.elem,a),void 0!==i&&(t.result=i)===!1&&(t.preventDefault(),t.stopPropagation()));return l.postDispatch&&l.postDispatch.call(this,t),t.result}},handlers:function(t,e){var n,i,r,o,s=[],a=e.delegateCount,u=t.target;if(a&&u.nodeType&&(!t.button||"click"!==t.type))for(;u!==this;u=u.parentNode||this)if(u.disabled!==!0||"click"!==t.type){for(i=[],n=0;a>n;n++)o=e[n],r=o.selector+" ",void 0===i[r]&&(i[r]=o.needsContext?Z(r,this).index(u)>=0:Z.find(r,this,null,[u]).length),i[r]&&i.push(o);i.length&&s.push({elem:u,handlers:i})}return a<e.length&&s.push({elem:this,handlers:e.slice(a)}),s},props:"altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(t,e){return null==t.which&&(t.which=null!=e.charCode?e.charCode:e.keyCode),t}},mouseHooks:{props:"button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(t,e){var n,i,r,o=e.button;return null==t.pageX&&null!=e.clientX&&(n=t.target.ownerDocument||Y,i=n.documentElement,r=n.body,t.pageX=e.clientX+(i&&i.scrollLeft||r&&r.scrollLeft||0)-(i&&i.clientLeft||r&&r.clientLeft||0),t.pageY=e.clientY+(i&&i.scrollTop||r&&r.scrollTop||0)-(i&&i.clientTop||r&&r.clientTop||0)),t.which||void 0===o||(t.which=1&o?1:2&o?3:4&o?2:0),t}},fix:function(t){if(t[Z.expando])return t;var e,n,i,r=t.type,o=t,s=this.fixHooks[r];for(s||(this.fixHooks[r]=s=jt.test(r)?this.mouseHooks:Ct.test(r)?this.keyHooks:{}),i=s.props?this.props.concat(s.props):this.props,t=new Z.Event(o),e=i.length;e--;)n=i[e],t[n]=o[n];return t.target||(t.target=Y),3===t.target.nodeType&&(t.target=t.target.parentNode),s.filter?s.filter(t,o):t},special:{load:{noBubble:!0},focus:{trigger:function(){return this!==h()&&this.focus?(this.focus(),!1):void 0},delegateType:"focusin"},blur:{trigger:function(){return this===h()&&this.blur?(this.blur(),!1):void 0},delegateType:"focusout"},click:{trigger:function(){return"checkbox"===this.type&&this.click&&Z.nodeName(this,"input")?(this.click(),!1):void 0},_default:function(t){return Z.nodeName(t.target,"a")}},beforeunload:{postDispatch:function(t){void 0!==t.result&&t.originalEvent&&(t.originalEvent.returnValue=t.result)}}},simulate:function(t,e,n,i){var r=Z.extend(new Z.Event,n,{type:t,isSimulated:!0,originalEvent:{}});i?Z.event.trigger(r,null,e):Z.event.dispatch.call(e,r),r.isDefaultPrevented()&&n.preventDefault()}},Z.removeEvent=function(t,e,n){t.removeEventListener&&t.removeEventListener(e,n,!1)},Z.Event=function(t,e){return this instanceof Z.Event?(t&&t.type?(this.originalEvent=t,this.type=t.type,this.isDefaultPrevented=t.defaultPrevented||void 0===t.defaultPrevented&&t.returnValue===!1?l:c):this.type=t,e&&Z.extend(this,e),this.timeStamp=t&&t.timeStamp||Z.now(),void(this[Z.expando]=!0)):new Z.Event(t,e)},Z.Event.prototype={isDefaultPrevented:c,isPropagationStopped:c,isImmediatePropagationStopped:c,preventDefault:function(){var t=this.originalEvent;this.isDefaultPrevented=l,t&&t.preventDefault&&t.preventDefault()},stopPropagation:function(){var t=this.originalEvent;this.isPropagationStopped=l,t&&t.stopPropagation&&t.stopPropagation()},stopImmediatePropagation:function(){var t=this.originalEvent;this.isImmediatePropagationStopped=l,t&&t.stopImmediatePropagation&&t.stopImmediatePropagation(),this.stopPropagation()}},Z.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(t,e){Z.event.special[t]={delegateType:e,bindType:e,handle:function(t){var n,i=this,r=t.relatedTarget,o=t.handleObj;return(!r||r!==i&&!Z.contains(i,r))&&(t.type=o.origType,n=o.handler.apply(this,arguments),t.type=e),n}}}),K.focusinBubbles||Z.each({focus:"focusin",blur:"focusout"},function(t,e){var n=function(t){Z.event.simulate(e,t.target,Z.event.fix(t),!0)};Z.event.special[e]={setup:function(){var i=this.ownerDocument||this,r=mt.access(i,e);r||i.addEventListener(t,n,!0),mt.access(i,e,(r||0)+1)},teardown:function(){var i=this.ownerDocument||this,r=mt.access(i,e)-1;r?mt.access(i,e,r):(i.removeEventListener(t,n,!0),mt.remove(i,e))}}}),Z.fn.extend({on:function(t,e,n,i,r){var o,s;if("object"==typeof t){"string"!=typeof e&&(n=n||e,e=void 0);for(s in t)this.on(s,e,n,t[s],r);return this}if(null==n&&null==i?(i=e,n=e=void 0):null==i&&("string"==typeof e?(i=n,n=void 0):(i=n,n=e,e=void 0)),i===!1)i=c;else if(!i)return this;return 1===r&&(o=i,i=function(t){return Z().off(t),o.apply(this,arguments)},i.guid=o.guid||(o.guid=Z.guid++)),this.each(function(){Z.event.add(this,t,i,n,e)})},one:function(t,e,n,i){return this.on(t,e,n,i,1)},off:function(t,e,n){var i,r;if(t&&t.preventDefault&&t.handleObj)return i=t.handleObj,Z(t.delegateTarget).off(i.namespace?i.origType+"."+i.namespace:i.origType,i.selector,i.handler),this;if("object"==typeof t){for(r in t)this.off(r,e,t[r]);return this}return(e===!1||"function"==typeof e)&&(n=e,e=void 0),n===!1&&(n=c),this.each(function(){Z.event.remove(this,t,n,e)})},trigger:function(t,e){return this.each(function(){Z.event.trigger(t,e,this)})},triggerHandler:function(t,e){var n=this[0];return n?Z.event.trigger(t,e,n,!0):void 0}});var Mt=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,Nt=/<([\w:]+)/,Bt=/<|&#?\w+;/,Ot=/<(?:script|style|link)/i,Pt=/checked\s*(?:[^=]|=\s*.checked.)/i,$t=/^$|\/(?:java|ecma)script/i,Dt=/^true\/(.*)/,Ft=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,Ht={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};Ht.optgroup=Ht.option,Ht.tbody=Ht.tfoot=Ht.colgroup=Ht.caption=Ht.thead,Ht.th=Ht.td,Z.extend({clone:function(t,e,n){var i,r,o,s,a=t.cloneNode(!0),u=Z.contains(t.ownerDocument,t);if(!(K.noCloneChecked||1!==t.nodeType&&11!==t.nodeType||Z.isXMLDoc(t)))for(s=m(a),o=m(t),i=0,r=o.length;r>i;i++)y(o[i],s[i]);if(e)if(n)for(o=o||m(t),s=s||m(a),i=0,r=o.length;r>i;i++)v(o[i],s[i]);else v(t,a);return s=m(a,"script"),s.length>0&&g(s,!u&&m(t,"script")),a},buildFragment:function(t,e,n,i){for(var r,o,s,a,u,l,c=e.createDocumentFragment(),h=[],f=0,d=t.length;d>f;f++)if(r=t[f],r||0===r)if("object"===Z.type(r))Z.merge(h,r.nodeType?[r]:r);else if(Bt.test(r)){for(o=o||c.appendChild(e.createElement("div")),s=(Nt.exec(r)||["",""])[1].toLowerCase(),a=Ht[s]||Ht._default,o.innerHTML=a[1]+r.replace(Mt,"<$1></$2>")+a[2],l=a[0];l--;)o=o.lastChild;Z.merge(h,o.childNodes),o=c.firstChild,o.textContent=""}else h.push(e.createTextNode(r));for(c.textContent="",f=0;r=h[f++];)if((!i||-1===Z.inArray(r,i))&&(u=Z.contains(r.ownerDocument,r),o=m(c.appendChild(r),"script"),u&&g(o),n))for(l=0;r=o[l++];)$t.test(r.type||"")&&n.push(r);return c},cleanData:function(t){for(var e,n,i,r,o=Z.event.special,s=0;void 0!==(n=t[s]);s++){if(Z.acceptData(n)&&(r=n[mt.expando],r&&(e=mt.cache[r]))){if(e.events)for(i in e.events)o[i]?Z.event.remove(n,i):Z.removeEvent(n,i,e.handle);mt.cache[r]&&delete mt.cache[r]}delete yt.cache[n[yt.expando]]}}}),Z.fn.extend({text:function(t){return vt(this,function(t){return void 0===t?Z.text(this):this.empty().each(function(){(1===this.nodeType||11===this.nodeType||9===this.nodeType)&&(this.textContent=t)})},null,t,arguments.length)},append:function(){return this.domManip(arguments,function(t){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var e=f(this,t);e.appendChild(t)}})},prepend:function(){return this.domManip(arguments,function(t){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var e=f(this,t);e.insertBefore(t,e.firstChild)}})},before:function(){return this.domManip(arguments,function(t){this.parentNode&&this.parentNode.insertBefore(t,this)})},after:function(){return this.domManip(arguments,function(t){this.parentNode&&this.parentNode.insertBefore(t,this.nextSibling)})},remove:function(t,e){for(var n,i=t?Z.filter(t,this):this,r=0;null!=(n=i[r]);r++)e||1!==n.nodeType||Z.cleanData(m(n)),n.parentNode&&(e&&Z.contains(n.ownerDocument,n)&&g(m(n,"script")),n.parentNode.removeChild(n));return this},empty:function(){for(var t,e=0;null!=(t=this[e]);e++)1===t.nodeType&&(Z.cleanData(m(t,!1)),t.textContent="");return this},clone:function(t,e){return t=null==t?!1:t,e=null==e?t:e,this.map(function(){return Z.clone(this,t,e)})},html:function(t){return vt(this,function(t){var e=this[0]||{},n=0,i=this.length;if(void 0===t&&1===e.nodeType)return e.innerHTML;if("string"==typeof t&&!Ot.test(t)&&!Ht[(Nt.exec(t)||["",""])[1].toLowerCase()]){t=t.replace(Mt,"<$1></$2>");try{for(;i>n;n++)e=this[n]||{},1===e.nodeType&&(Z.cleanData(m(e,!1)),e.innerHTML=t);e=0}catch(r){}}e&&this.empty().append(t)},null,t,arguments.length)},replaceWith:function(){var t=arguments[0];return this.domManip(arguments,function(e){t=this.parentNode,Z.cleanData(m(this)),t&&t.replaceChild(e,this)}),t&&(t.length||t.nodeType)?this:this.remove()},detach:function(t){return this.remove(t,!0)},domManip:function(t,e){t=z.apply([],t);var n,i,r,o,s,a,u=0,l=this.length,c=this,h=l-1,f=t[0],g=Z.isFunction(f);if(g||l>1&&"string"==typeof f&&!K.checkClone&&Pt.test(f))return this.each(function(n){var i=c.eq(n);g&&(t[0]=f.call(this,n,i.html())),i.domManip(t,e)});if(l&&(n=Z.buildFragment(t,this[0].ownerDocument,!1,this),i=n.firstChild,1===n.childNodes.length&&(n=i),i)){for(r=Z.map(m(n,"script"),d),o=r.length;l>u;u++)s=n,u!==h&&(s=Z.clone(s,!0,!0),o&&Z.merge(r,m(s,"script"))),e.call(this[u],s,u);if(o)for(a=r[r.length-1].ownerDocument,Z.map(r,p),u=0;o>u;u++)s=r[u],$t.test(s.type||"")&&!mt.access(s,"globalEval")&&Z.contains(a,s)&&(s.src?Z._evalUrl&&Z._evalUrl(s.src):Z.globalEval(s.textContent.replace(Ft,"")))}return this}}),Z.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(t,e){Z.fn[t]=function(t){for(var n,i=[],r=Z(t),o=r.length-1,s=0;o>=s;s++)n=s===o?this:this.clone(!0),Z(r[s])[e](n),U.apply(i,n.get());return this.pushStack(i)}});var It,qt={},Rt=/^margin/,Lt=new RegExp("^("+_t+")(?!px)[a-z%]+$","i"),Vt=function(e){return e.ownerDocument.defaultView.opener?e.ownerDocument.defaultView.getComputedStyle(e,null):t.getComputedStyle(e,null)};!function(){function e(){s.style.cssText="-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;display:block;margin-top:1%;top:1%;border:1px;padding:1px;width:4px;position:absolute",s.innerHTML="",r.appendChild(o);var e=t.getComputedStyle(s,null);n="1%"!==e.top,i="4px"===e.width,r.removeChild(o)}var n,i,r=Y.documentElement,o=Y.createElement("div"),s=Y.createElement("div");s.style&&(s.style.backgroundClip="content-box",s.cloneNode(!0).style.backgroundClip="",K.clearCloneStyle="content-box"===s.style.backgroundClip,o.style.cssText="border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;position:absolute",o.appendChild(s),t.getComputedStyle&&Z.extend(K,{pixelPosition:function(){return e(),n},boxSizingReliable:function(){return null==i&&e(),i},reliableMarginRight:function(){var e,n=s.appendChild(Y.createElement("div"));return n.style.cssText=s.style.cssText="-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:0",n.style.marginRight=n.style.width="0",s.style.width="1px",r.appendChild(o),e=!parseFloat(t.getComputedStyle(n,null).marginRight),r.removeChild(o),s.removeChild(n),e}}))}(),Z.swap=function(t,e,n,i){var r,o,s={};for(o in e)s[o]=t.style[o],t.style[o]=e[o];r=n.apply(t,i||[]);for(o in e)t.style[o]=s[o];return r};var zt=/^(none|table(?!-c[ea]).+)/,Ut=new RegExp("^("+_t+")(.*)$","i"),Wt=new RegExp("^([+-])=("+_t+")","i"),Jt={position:"absolute",visibility:"hidden",display:"block"},Xt={letterSpacing:"0",fontWeight:"400"},Gt=["Webkit","O","Moz","ms"];Z.extend({cssHooks:{opacity:{get:function(t,e){if(e){var n=_(t,"opacity");return""===n?"1":n}}}},cssNumber:{columnCount:!0,fillOpacity:!0,flexGrow:!0,flexShrink:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":"cssFloat"},style:function(t,e,n,i){if(t&&3!==t.nodeType&&8!==t.nodeType&&t.style){var r,o,s,a=Z.camelCase(e),u=t.style;return e=Z.cssProps[a]||(Z.cssProps[a]=E(u,a)),s=Z.cssHooks[e]||Z.cssHooks[a],void 0===n?s&&"get"in s&&void 0!==(r=s.get(t,!1,i))?r:u[e]:(o=typeof n,"string"===o&&(r=Wt.exec(n))&&(n=(r[1]+1)*r[2]+parseFloat(Z.css(t,e)),o="number"),null!=n&&n===n&&("number"!==o||Z.cssNumber[a]||(n+="px"),K.clearCloneStyle||""!==n||0!==e.indexOf("background")||(u[e]="inherit"),s&&"set"in s&&void 0===(n=s.set(t,n,i))||(u[e]=n)),void 0)}},css:function(t,e,n,i){var r,o,s,a=Z.camelCase(e);return e=Z.cssProps[a]||(Z.cssProps[a]=E(t.style,a)),s=Z.cssHooks[e]||Z.cssHooks[a],s&&"get"in s&&(r=s.get(t,!0,n)),void 0===r&&(r=_(t,e,i)),"normal"===r&&e in Xt&&(r=Xt[e]),""===n||n?(o=parseFloat(r),n===!0||Z.isNumeric(o)?o||0:r):r}}),Z.each(["height","width"],function(t,e){Z.cssHooks[e]={get:function(t,n,i){return n?zt.test(Z.css(t,"display"))&&0===t.offsetWidth?Z.swap(t,Jt,function(){return C(t,e,i)}):C(t,e,i):void 0},set:function(t,n,i){var r=i&&Vt(t);return k(t,n,i?T(t,e,i,"border-box"===Z.css(t,"boxSizing",!1,r),r):0)}}}),Z.cssHooks.marginRight=w(K.reliableMarginRight,function(t,e){return e?Z.swap(t,{display:"inline-block"},_,[t,"marginRight"]):void 0}),Z.each({margin:"",padding:"",border:"Width"},function(t,e){Z.cssHooks[t+e]={expand:function(n){for(var i=0,r={},o="string"==typeof n?n.split(" "):[n];4>i;i++)r[t+wt[i]+e]=o[i]||o[i-2]||o[0];return r}},Rt.test(t)||(Z.cssHooks[t+e].set=k)}),Z.fn.extend({css:function(t,e){return vt(this,function(t,e,n){var i,r,o={},s=0;if(Z.isArray(e)){for(i=Vt(t),r=e.length;r>s;s++)o[e[s]]=Z.css(t,e[s],!1,i);return o}return void 0!==n?Z.style(t,e,n):Z.css(t,e)},t,e,arguments.length>1)},show:function(){return j(this,!0)},hide:function(){return j(this)},toggle:function(t){return"boolean"==typeof t?t?this.show():this.hide():this.each(function(){Et(this)?Z(this).show():Z(this).hide()})}}),Z.Tween=S,S.prototype={constructor:S,init:function(t,e,n,i,r,o){this.elem=t,this.prop=n,this.easing=r||"swing",this.options=e,this.start=this.now=this.cur(),this.end=i,this.unit=o||(Z.cssNumber[n]?"":"px")},cur:function(){var t=S.propHooks[this.prop];return t&&t.get?t.get(this):S.propHooks._default.get(this)},run:function(t){var e,n=S.propHooks[this.prop];return this.options.duration?this.pos=e=Z.easing[this.easing](t,this.options.duration*t,0,1,this.options.duration):this.pos=e=t,this.now=(this.end-this.start)*e+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):S.propHooks._default.set(this),this}},S.prototype.init.prototype=S.prototype,S.propHooks={_default:{get:function(t){var e;return null==t.elem[t.prop]||t.elem.style&&null!=t.elem.style[t.prop]?(e=Z.css(t.elem,t.prop,""),e&&"auto"!==e?e:0):t.elem[t.prop]},set:function(t){Z.fx.step[t.prop]?Z.fx.step[t.prop](t):t.elem.style&&(null!=t.elem.style[Z.cssProps[t.prop]]||Z.cssHooks[t.prop])?Z.style(t.elem,t.prop,t.now+t.unit):t.elem[t.prop]=t.now}}},S.propHooks.scrollTop=S.propHooks.scrollLeft={set:function(t){t.elem.nodeType&&t.elem.parentNode&&(t.elem[t.prop]=t.now)}},Z.easing={linear:function(t){return t},swing:function(t){return.5-Math.cos(t*Math.PI)/2}},Z.fx=S.prototype.init,Z.fx.step={};var Kt,Yt,Qt=/^(?:toggle|show|hide)$/,Zt=new RegExp("^(?:([+-])=|)("+_t+")([a-z%]*)$","i"),te=/queueHooks$/,ee=[B],ne={"*":[function(t,e){var n=this.createTween(t,e),i=n.cur(),r=Zt.exec(e),o=r&&r[3]||(Z.cssNumber[t]?"":"px"),s=(Z.cssNumber[t]||"px"!==o&&+i)&&Zt.exec(Z.css(n.elem,t)),a=1,u=20;if(s&&s[3]!==o){o=o||s[3],r=r||[],s=+i||1;do a=a||".5",s/=a,Z.style(n.elem,t,s+o);while(a!==(a=n.cur()/i)&&1!==a&&--u)}return r&&(s=n.start=+s||+i||0,n.unit=o,n.end=r[1]?s+(r[1]+1)*r[2]:+r[2]),n}]};Z.Animation=Z.extend(P,{tweener:function(t,e){Z.isFunction(t)?(e=t,t=["*"]):t=t.split(" ");for(var n,i=0,r=t.length;r>i;i++)n=t[i],ne[n]=ne[n]||[],ne[n].unshift(e)},prefilter:function(t,e){e?ee.unshift(t):ee.push(t)}}),Z.speed=function(t,e,n){var i=t&&"object"==typeof t?Z.extend({},t):{complete:n||!n&&e||Z.isFunction(t)&&t,duration:t,easing:n&&e||e&&!Z.isFunction(e)&&e};return i.duration=Z.fx.off?0:"number"==typeof i.duration?i.duration:i.duration in Z.fx.speeds?Z.fx.speeds[i.duration]:Z.fx.speeds._default,(null==i.queue||i.queue===!0)&&(i.queue="fx"),i.old=i.complete,i.complete=function(){Z.isFunction(i.old)&&i.old.call(this),i.queue&&Z.dequeue(this,i.queue)},i},Z.fn.extend({fadeTo:function(t,e,n,i){return this.filter(Et).css("opacity",0).show().end().animate({opacity:e},t,n,i)},animate:function(t,e,n,i){var r=Z.isEmptyObject(t),o=Z.speed(e,n,i),s=function(){var e=P(this,Z.extend({},t),o);(r||mt.get(this,"finish"))&&e.stop(!0)};return s.finish=s,r||o.queue===!1?this.each(s):this.queue(o.queue,s)},stop:function(t,e,n){var i=function(t){var e=t.stop;delete t.stop,e(n)};return"string"!=typeof t&&(n=e,e=t,t=void 0),e&&t!==!1&&this.queue(t||"fx",[]),this.each(function(){var e=!0,r=null!=t&&t+"queueHooks",o=Z.timers,s=mt.get(this);if(r)s[r]&&s[r].stop&&i(s[r]);else for(r in s)s[r]&&s[r].stop&&te.test(r)&&i(s[r]);for(r=o.length;r--;)o[r].elem!==this||null!=t&&o[r].queue!==t||(o[r].anim.stop(n),e=!1,o.splice(r,1));(e||!n)&&Z.dequeue(this,t)})},finish:function(t){return t!==!1&&(t=t||"fx"),this.each(function(){var e,n=mt.get(this),i=n[t+"queue"],r=n[t+"queueHooks"],o=Z.timers,s=i?i.length:0;for(n.finish=!0,Z.queue(this,t,[]),r&&r.stop&&r.stop.call(this,!0),e=o.length;e--;)o[e].elem===this&&o[e].queue===t&&(o[e].anim.stop(!0),o.splice(e,1));for(e=0;s>e;e++)i[e]&&i[e].finish&&i[e].finish.call(this);delete n.finish})}}),Z.each(["toggle","show","hide"],function(t,e){var n=Z.fn[e];Z.fn[e]=function(t,i,r){return null==t||"boolean"==typeof t?n.apply(this,arguments):this.animate(M(e,!0),t,i,r)}}),Z.each({slideDown:M("show"),slideUp:M("hide"),slideToggle:M("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(t,e){Z.fn[t]=function(t,n,i){return this.animate(e,t,n,i)}}),Z.timers=[],Z.fx.tick=function(){var t,e=0,n=Z.timers;for(Kt=Z.now();e<n.length;e++)t=n[e],t()||n[e]!==t||n.splice(e--,1);n.length||Z.fx.stop(),Kt=void 0},Z.fx.timer=function(t){Z.timers.push(t),t()?Z.fx.start():Z.timers.pop()},Z.fx.interval=13,Z.fx.start=function(){Yt||(Yt=setInterval(Z.fx.tick,Z.fx.interval))},Z.fx.stop=function(){clearInterval(Yt),Yt=null},Z.fx.speeds={slow:600,fast:200,_default:400},Z.fn.delay=function(t,e){return t=Z.fx?Z.fx.speeds[t]||t:t,e=e||"fx",this.queue(e,function(e,n){var i=setTimeout(e,t);n.stop=function(){clearTimeout(i)}})},function(){var t=Y.createElement("input"),e=Y.createElement("select"),n=e.appendChild(Y.createElement("option"));t.type="checkbox",K.checkOn=""!==t.value,K.optSelected=n.selected,e.disabled=!0,K.optDisabled=!n.disabled,t=Y.createElement("input"),t.value="t",t.type="radio",K.radioValue="t"===t.value}();var ie,re,oe=Z.expr.attrHandle;Z.fn.extend({attr:function(t,e){return vt(this,Z.attr,t,e,arguments.length>1)},removeAttr:function(t){return this.each(function(){Z.removeAttr(this,t)})}}),Z.extend({attr:function(t,e,n){var i,r,o=t.nodeType;if(t&&3!==o&&8!==o&&2!==o)return typeof t.getAttribute===Tt?Z.prop(t,e,n):(1===o&&Z.isXMLDoc(t)||(e=e.toLowerCase(),i=Z.attrHooks[e]||(Z.expr.match.bool.test(e)?re:ie)),void 0===n?i&&"get"in i&&null!==(r=i.get(t,e))?r:(r=Z.find.attr(t,e),null==r?void 0:r):null!==n?i&&"set"in i&&void 0!==(r=i.set(t,n,e))?r:(t.setAttribute(e,n+""),n):void Z.removeAttr(t,e))},removeAttr:function(t,e){var n,i,r=0,o=e&&e.match(dt);if(o&&1===t.nodeType)for(;n=o[r++];)i=Z.propFix[n]||n,Z.expr.match.bool.test(n)&&(t[i]=!1),t.removeAttribute(n)},attrHooks:{type:{set:function(t,e){if(!K.radioValue&&"radio"===e&&Z.nodeName(t,"input")){var n=t.value;return t.setAttribute("type",e),n&&(t.value=n),e}}}}}),re={set:function(t,e,n){return e===!1?Z.removeAttr(t,n):t.setAttribute(n,n),n}},Z.each(Z.expr.match.bool.source.match(/\w+/g),function(t,e){var n=oe[e]||Z.find.attr;oe[e]=function(t,e,i){var r,o;return i||(o=oe[e],oe[e]=r,r=null!=n(t,e,i)?e.toLowerCase():null,oe[e]=o),r}});var se=/^(?:input|select|textarea|button)$/i;Z.fn.extend({prop:function(t,e){return vt(this,Z.prop,t,e,arguments.length>1)},removeProp:function(t){return this.each(function(){delete this[Z.propFix[t]||t]})}}),Z.extend({propFix:{"for":"htmlFor","class":"className"},prop:function(t,e,n){var i,r,o,s=t.nodeType;if(t&&3!==s&&8!==s&&2!==s)return o=1!==s||!Z.isXMLDoc(t),o&&(e=Z.propFix[e]||e,r=Z.propHooks[e]),void 0!==n?r&&"set"in r&&void 0!==(i=r.set(t,n,e))?i:t[e]=n:r&&"get"in r&&null!==(i=r.get(t,e))?i:t[e]},propHooks:{tabIndex:{get:function(t){return t.hasAttribute("tabindex")||se.test(t.nodeName)||t.href?t.tabIndex:-1}}}}),K.optSelected||(Z.propHooks.selected={get:function(t){var e=t.parentNode;return e&&e.parentNode&&e.parentNode.selectedIndex,null}}),Z.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){Z.propFix[this.toLowerCase()]=this});var ae=/[\t\r\n\f]/g;Z.fn.extend({addClass:function(t){var e,n,i,r,o,s,a="string"==typeof t&&t,u=0,l=this.length;if(Z.isFunction(t))return this.each(function(e){Z(this).addClass(t.call(this,e,this.className))});if(a)for(e=(t||"").match(dt)||[];l>u;u++)if(n=this[u],i=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(ae," "):" ")){for(o=0;r=e[o++];)i.indexOf(" "+r+" ")<0&&(i+=r+" ");s=Z.trim(i),n.className!==s&&(n.className=s)}return this},removeClass:function(t){var e,n,i,r,o,s,a=0===arguments.length||"string"==typeof t&&t,u=0,l=this.length;if(Z.isFunction(t))return this.each(function(e){Z(this).removeClass(t.call(this,e,this.className))});if(a)for(e=(t||"").match(dt)||[];l>u;u++)if(n=this[u],i=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(ae," "):"")){for(o=0;r=e[o++];)for(;i.indexOf(" "+r+" ")>=0;)i=i.replace(" "+r+" "," ");s=t?Z.trim(i):"",n.className!==s&&(n.className=s)}return this},toggleClass:function(t,e){var n=typeof t;return"boolean"==typeof e&&"string"===n?e?this.addClass(t):this.removeClass(t):Z.isFunction(t)?this.each(function(n){Z(this).toggleClass(t.call(this,n,this.className,e),e)}):this.each(function(){if("string"===n)for(var e,i=0,r=Z(this),o=t.match(dt)||[];e=o[i++];)r.hasClass(e)?r.removeClass(e):r.addClass(e);else(n===Tt||"boolean"===n)&&(this.className&&mt.set(this,"__className__",this.className),this.className=this.className||t===!1?"":mt.get(this,"__className__")||"")})},hasClass:function(t){for(var e=" "+t+" ",n=0,i=this.length;i>n;n++)if(1===this[n].nodeType&&(" "+this[n].className+" ").replace(ae," ").indexOf(e)>=0)return!0;return!1}});var ue=/\r/g;Z.fn.extend({val:function(t){var e,n,i,r=this[0];{if(arguments.length)return i=Z.isFunction(t),this.each(function(n){var r;1===this.nodeType&&(r=i?t.call(this,n,Z(this).val()):t,null==r?r="":"number"==typeof r?r+="":Z.isArray(r)&&(r=Z.map(r,function(t){return null==t?"":t+""})),e=Z.valHooks[this.type]||Z.valHooks[this.nodeName.toLowerCase()],e&&"set"in e&&void 0!==e.set(this,r,"value")||(this.value=r))});if(r)return e=Z.valHooks[r.type]||Z.valHooks[r.nodeName.toLowerCase()],e&&"get"in e&&void 0!==(n=e.get(r,"value"))?n:(n=r.value,"string"==typeof n?n.replace(ue,""):null==n?"":n)}}}),Z.extend({valHooks:{option:{get:function(t){var e=Z.find.attr(t,"value");return null!=e?e:Z.trim(Z.text(t))}},select:{get:function(t){for(var e,n,i=t.options,r=t.selectedIndex,o="select-one"===t.type||0>r,s=o?null:[],a=o?r+1:i.length,u=0>r?a:o?r:0;a>u;u++)if(n=i[u],(n.selected||u===r)&&(K.optDisabled?!n.disabled:null===n.getAttribute("disabled"))&&(!n.parentNode.disabled||!Z.nodeName(n.parentNode,"optgroup"))){if(e=Z(n).val(),o)return e;s.push(e)}return s},set:function(t,e){for(var n,i,r=t.options,o=Z.makeArray(e),s=r.length;s--;)i=r[s],(i.selected=Z.inArray(i.value,o)>=0)&&(n=!0);return n||(t.selectedIndex=-1),o}}}}),Z.each(["radio","checkbox"],function(){Z.valHooks[this]={set:function(t,e){return Z.isArray(e)?t.checked=Z.inArray(Z(t).val(),e)>=0:void 0}},K.checkOn||(Z.valHooks[this].get=function(t){return null===t.getAttribute("value")?"on":t.value})}),Z.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(t,e){Z.fn[e]=function(t,n){return arguments.length>0?this.on(e,null,t,n):this.trigger(e)}}),Z.fn.extend({hover:function(t,e){return this.mouseenter(t).mouseleave(e||t)},bind:function(t,e,n){return this.on(t,null,e,n)},unbind:function(t,e){return this.off(t,null,e)},delegate:function(t,e,n,i){return this.on(e,t,n,i)},undelegate:function(t,e,n){return 1===arguments.length?this.off(t,"**"):this.off(e,t||"**",n)}});var le=Z.now(),ce=/\?/;Z.parseJSON=function(t){return JSON.parse(t+"")},Z.parseXML=function(t){var e,n;if(!t||"string"!=typeof t)return null;try{n=new DOMParser,e=n.parseFromString(t,"text/xml")}catch(i){e=void 0}return(!e||e.getElementsByTagName("parsererror").length)&&Z.error("Invalid XML: "+t),e};var he=/#.*$/,fe=/([?&])_=[^&]*/,de=/^(.*?):[ \t]*([^\r\n]*)$/gm,pe=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,ge=/^(?:GET|HEAD)$/,ve=/^\/\//,me=/^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,ye={},be={},xe="*/".concat("*"),_e=t.location.href,we=me.exec(_e.toLowerCase())||[];Z.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:_e,type:"GET",isLocal:pe.test(we[1]),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":xe,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":Z.parseJSON,"text xml":Z.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(t,e){return e?F(F(t,Z.ajaxSettings),e):F(Z.ajaxSettings,t)},ajaxPrefilter:$(ye),ajaxTransport:$(be),ajax:function(t,e){function n(t,e,n,s){var u,c,m,y,x,w=e;2!==b&&(b=2,a&&clearTimeout(a),i=void 0,o=s||"",_.readyState=t>0?4:0,u=t>=200&&300>t||304===t,n&&(y=H(h,_,n)),y=I(h,y,_,u),u?(h.ifModified&&(x=_.getResponseHeader("Last-Modified"),x&&(Z.lastModified[r]=x),x=_.getResponseHeader("etag"),x&&(Z.etag[r]=x)),204===t||"HEAD"===h.type?w="nocontent":304===t?w="notmodified":(w=y.state,c=y.data,m=y.error,u=!m)):(m=w,(t||!w)&&(w="error",0>t&&(t=0))),_.status=t,_.statusText=(e||w)+"",u?p.resolveWith(f,[c,w,_]):p.rejectWith(f,[_,w,m]),_.statusCode(v),v=void 0,l&&d.trigger(u?"ajaxSuccess":"ajaxError",[_,h,u?c:m]),g.fireWith(f,[_,w]),l&&(d.trigger("ajaxComplete",[_,h]),--Z.active||Z.event.trigger("ajaxStop")))}"object"==typeof t&&(e=t,t=void 0),e=e||{};var i,r,o,s,a,u,l,c,h=Z.ajaxSetup({},e),f=h.context||h,d=h.context&&(f.nodeType||f.jquery)?Z(f):Z.event,p=Z.Deferred(),g=Z.Callbacks("once memory"),v=h.statusCode||{},m={},y={},b=0,x="canceled",_={readyState:0,getResponseHeader:function(t){var e;if(2===b){if(!s)for(s={};e=de.exec(o);)s[e[1].toLowerCase()]=e[2];e=s[t.toLowerCase()]}return null==e?null:e},getAllResponseHeaders:function(){return 2===b?o:null},setRequestHeader:function(t,e){var n=t.toLowerCase();return b||(t=y[n]=y[n]||t,m[t]=e),this},overrideMimeType:function(t){return b||(h.mimeType=t),this},statusCode:function(t){var e;if(t)if(2>b)for(e in t)v[e]=[v[e],t[e]];else _.always(t[_.status]);return this},abort:function(t){var e=t||x;return i&&i.abort(e),n(0,e),this}};if(p.promise(_).complete=g.add,_.success=_.done,_.error=_.fail,h.url=((t||h.url||_e)+"").replace(he,"").replace(ve,we[1]+"//"),h.type=e.method||e.type||h.method||h.type,h.dataTypes=Z.trim(h.dataType||"*").toLowerCase().match(dt)||[""],null==h.crossDomain&&(u=me.exec(h.url.toLowerCase()),h.crossDomain=!(!u||u[1]===we[1]&&u[2]===we[2]&&(u[3]||("http:"===u[1]?"80":"443"))===(we[3]||("http:"===we[1]?"80":"443")))),h.data&&h.processData&&"string"!=typeof h.data&&(h.data=Z.param(h.data,h.traditional)),D(ye,h,e,_),2===b)return _;l=Z.event&&h.global,l&&0===Z.active++&&Z.event.trigger("ajaxStart"),h.type=h.type.toUpperCase(),h.hasContent=!ge.test(h.type),r=h.url,h.hasContent||(h.data&&(r=h.url+=(ce.test(r)?"&":"?")+h.data,delete h.data),h.cache===!1&&(h.url=fe.test(r)?r.replace(fe,"$1_="+le++):r+(ce.test(r)?"&":"?")+"_="+le++)),h.ifModified&&(Z.lastModified[r]&&_.setRequestHeader("If-Modified-Since",Z.lastModified[r]),Z.etag[r]&&_.setRequestHeader("If-None-Match",Z.etag[r])),(h.data&&h.hasContent&&h.contentType!==!1||e.contentType)&&_.setRequestHeader("Content-Type",h.contentType),_.setRequestHeader("Accept",h.dataTypes[0]&&h.accepts[h.dataTypes[0]]?h.accepts[h.dataTypes[0]]+("*"!==h.dataTypes[0]?", "+xe+"; q=0.01":""):h.accepts["*"]);for(c in h.headers)_.setRequestHeader(c,h.headers[c]);if(h.beforeSend&&(h.beforeSend.call(f,_,h)===!1||2===b))return _.abort();x="abort";for(c in{success:1,error:1,complete:1})_[c](h[c]);if(i=D(be,h,e,_)){_.readyState=1,l&&d.trigger("ajaxSend",[_,h]),h.async&&h.timeout>0&&(a=setTimeout(function(){_.abort("timeout")},h.timeout));try{b=1,i.send(m,n)}catch(w){if(!(2>b))throw w;n(-1,w)}}else n(-1,"No Transport");return _},getJSON:function(t,e,n){return Z.get(t,e,n,"json")},getScript:function(t,e){return Z.get(t,void 0,e,"script")}}),Z.each(["get","post"],function(t,e){Z[e]=function(t,n,i,r){return Z.isFunction(n)&&(r=r||i,i=n,n=void 0),Z.ajax({url:t,type:e,dataType:r,data:n,success:i})}}),Z._evalUrl=function(t){return Z.ajax({url:t,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0})},Z.fn.extend({wrapAll:function(t){var e;return Z.isFunction(t)?this.each(function(e){Z(this).wrapAll(t.call(this,e))}):(this[0]&&(e=Z(t,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&e.insertBefore(this[0]),e.map(function(){for(var t=this;t.firstElementChild;)t=t.firstElementChild;return t}).append(this)),this)},wrapInner:function(t){return Z.isFunction(t)?this.each(function(e){Z(this).wrapInner(t.call(this,e))}):this.each(function(){var e=Z(this),n=e.contents();n.length?n.wrapAll(t):e.append(t)})},wrap:function(t){var e=Z.isFunction(t);return this.each(function(n){Z(this).wrapAll(e?t.call(this,n):t)})},unwrap:function(){return this.parent().each(function(){Z.nodeName(this,"body")||Z(this).replaceWith(this.childNodes)}).end()}}),Z.expr.filters.hidden=function(t){return t.offsetWidth<=0&&t.offsetHeight<=0},Z.expr.filters.visible=function(t){return!Z.expr.filters.hidden(t)};var Ee=/%20/g,ke=/\[\]$/,Te=/\r?\n/g,Ce=/^(?:submit|button|image|reset|file)$/i,je=/^(?:input|select|textarea|keygen)/i;Z.param=function(t,e){var n,i=[],r=function(t,e){e=Z.isFunction(e)?e():null==e?"":e,
i[i.length]=encodeURIComponent(t)+"="+encodeURIComponent(e)};if(void 0===e&&(e=Z.ajaxSettings&&Z.ajaxSettings.traditional),Z.isArray(t)||t.jquery&&!Z.isPlainObject(t))Z.each(t,function(){r(this.name,this.value)});else for(n in t)q(n,t[n],e,r);return i.join("&").replace(Ee,"+")},Z.fn.extend({serialize:function(){return Z.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var t=Z.prop(this,"elements");return t?Z.makeArray(t):this}).filter(function(){var t=this.type;return this.name&&!Z(this).is(":disabled")&&je.test(this.nodeName)&&!Ce.test(t)&&(this.checked||!kt.test(t))}).map(function(t,e){var n=Z(this).val();return null==n?null:Z.isArray(n)?Z.map(n,function(t){return{name:e.name,value:t.replace(Te,"\r\n")}}):{name:e.name,value:n.replace(Te,"\r\n")}}).get()}}),Z.ajaxSettings.xhr=function(){try{return new XMLHttpRequest}catch(t){}};var Se=0,Ae={},Me={0:200,1223:204},Ne=Z.ajaxSettings.xhr();t.attachEvent&&t.attachEvent("onunload",function(){for(var t in Ae)Ae[t]()}),K.cors=!!Ne&&"withCredentials"in Ne,K.ajax=Ne=!!Ne,Z.ajaxTransport(function(t){var e;return K.cors||Ne&&!t.crossDomain?{send:function(n,i){var r,o=t.xhr(),s=++Se;if(o.open(t.type,t.url,t.async,t.username,t.password),t.xhrFields)for(r in t.xhrFields)o[r]=t.xhrFields[r];t.mimeType&&o.overrideMimeType&&o.overrideMimeType(t.mimeType),t.crossDomain||n["X-Requested-With"]||(n["X-Requested-With"]="XMLHttpRequest");for(r in n)o.setRequestHeader(r,n[r]);e=function(t){return function(){e&&(delete Ae[s],e=o.onload=o.onerror=null,"abort"===t?o.abort():"error"===t?i(o.status,o.statusText):i(Me[o.status]||o.status,o.statusText,"string"==typeof o.responseText?{text:o.responseText}:void 0,o.getAllResponseHeaders()))}},o.onload=e(),o.onerror=e("error"),e=Ae[s]=e("abort");try{o.send(t.hasContent&&t.data||null)}catch(a){if(e)throw a}},abort:function(){e&&e()}}:void 0}),Z.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/(?:java|ecma)script/},converters:{"text script":function(t){return Z.globalEval(t),t}}}),Z.ajaxPrefilter("script",function(t){void 0===t.cache&&(t.cache=!1),t.crossDomain&&(t.type="GET")}),Z.ajaxTransport("script",function(t){if(t.crossDomain){var e,n;return{send:function(i,r){e=Z("<script>").prop({async:!0,charset:t.scriptCharset,src:t.url}).on("load error",n=function(t){e.remove(),n=null,t&&r("error"===t.type?404:200,t.type)}),Y.head.appendChild(e[0])},abort:function(){n&&n()}}}});var Be=[],Oe=/(=)\?(?=&|$)|\?\?/;Z.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var t=Be.pop()||Z.expando+"_"+le++;return this[t]=!0,t}}),Z.ajaxPrefilter("json jsonp",function(e,n,i){var r,o,s,a=e.jsonp!==!1&&(Oe.test(e.url)?"url":"string"==typeof e.data&&!(e.contentType||"").indexOf("application/x-www-form-urlencoded")&&Oe.test(e.data)&&"data");return a||"jsonp"===e.dataTypes[0]?(r=e.jsonpCallback=Z.isFunction(e.jsonpCallback)?e.jsonpCallback():e.jsonpCallback,a?e[a]=e[a].replace(Oe,"$1"+r):e.jsonp!==!1&&(e.url+=(ce.test(e.url)?"&":"?")+e.jsonp+"="+r),e.converters["script json"]=function(){return s||Z.error(r+" was not called"),s[0]},e.dataTypes[0]="json",o=t[r],t[r]=function(){s=arguments},i.always(function(){t[r]=o,e[r]&&(e.jsonpCallback=n.jsonpCallback,Be.push(r)),s&&Z.isFunction(o)&&o(s[0]),s=o=void 0}),"script"):void 0}),Z.parseHTML=function(t,e,n){if(!t||"string"!=typeof t)return null;"boolean"==typeof e&&(n=e,e=!1),e=e||Y;var i=st.exec(t),r=!n&&[];return i?[e.createElement(i[1])]:(i=Z.buildFragment([t],e,r),r&&r.length&&Z(r).remove(),Z.merge([],i.childNodes))};var Pe=Z.fn.load;Z.fn.load=function(t,e,n){if("string"!=typeof t&&Pe)return Pe.apply(this,arguments);var i,r,o,s=this,a=t.indexOf(" ");return a>=0&&(i=Z.trim(t.slice(a)),t=t.slice(0,a)),Z.isFunction(e)?(n=e,e=void 0):e&&"object"==typeof e&&(r="POST"),s.length>0&&Z.ajax({url:t,type:r,dataType:"html",data:e}).done(function(t){o=arguments,s.html(i?Z("<div>").append(Z.parseHTML(t)).find(i):t)}).complete(n&&function(t,e){s.each(n,o||[t.responseText,e,t])}),this},Z.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(t,e){Z.fn[e]=function(t){return this.on(e,t)}}),Z.expr.filters.animated=function(t){return Z.grep(Z.timers,function(e){return t===e.elem}).length};var $e=t.document.documentElement;Z.offset={setOffset:function(t,e,n){var i,r,o,s,a,u,l,c=Z.css(t,"position"),h=Z(t),f={};"static"===c&&(t.style.position="relative"),a=h.offset(),o=Z.css(t,"top"),u=Z.css(t,"left"),l=("absolute"===c||"fixed"===c)&&(o+u).indexOf("auto")>-1,l?(i=h.position(),s=i.top,r=i.left):(s=parseFloat(o)||0,r=parseFloat(u)||0),Z.isFunction(e)&&(e=e.call(t,n,a)),null!=e.top&&(f.top=e.top-a.top+s),null!=e.left&&(f.left=e.left-a.left+r),"using"in e?e.using.call(t,f):h.css(f)}},Z.fn.extend({offset:function(t){if(arguments.length)return void 0===t?this:this.each(function(e){Z.offset.setOffset(this,t,e)});var e,n,i=this[0],r={top:0,left:0},o=i&&i.ownerDocument;if(o)return e=o.documentElement,Z.contains(e,i)?(typeof i.getBoundingClientRect!==Tt&&(r=i.getBoundingClientRect()),n=R(o),{top:r.top+n.pageYOffset-e.clientTop,left:r.left+n.pageXOffset-e.clientLeft}):r},position:function(){if(this[0]){var t,e,n=this[0],i={top:0,left:0};return"fixed"===Z.css(n,"position")?e=n.getBoundingClientRect():(t=this.offsetParent(),e=this.offset(),Z.nodeName(t[0],"html")||(i=t.offset()),i.top+=Z.css(t[0],"borderTopWidth",!0),i.left+=Z.css(t[0],"borderLeftWidth",!0)),{top:e.top-i.top-Z.css(n,"marginTop",!0),left:e.left-i.left-Z.css(n,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){for(var t=this.offsetParent||$e;t&&!Z.nodeName(t,"html")&&"static"===Z.css(t,"position");)t=t.offsetParent;return t||$e})}}),Z.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(e,n){var i="pageYOffset"===n;Z.fn[e]=function(r){return vt(this,function(e,r,o){var s=R(e);return void 0===o?s?s[n]:e[r]:void(s?s.scrollTo(i?t.pageXOffset:o,i?o:t.pageYOffset):e[r]=o)},e,r,arguments.length,null)}}),Z.each(["top","left"],function(t,e){Z.cssHooks[e]=w(K.pixelPosition,function(t,n){return n?(n=_(t,e),Lt.test(n)?Z(t).position()[e]+"px":n):void 0})}),Z.each({Height:"height",Width:"width"},function(t,e){Z.each({padding:"inner"+t,content:e,"":"outer"+t},function(n,i){Z.fn[i]=function(i,r){var o=arguments.length&&(n||"boolean"!=typeof i),s=n||(i===!0||r===!0?"margin":"border");return vt(this,function(e,n,i){var r;return Z.isWindow(e)?e.document.documentElement["client"+t]:9===e.nodeType?(r=e.documentElement,Math.max(e.body["scroll"+t],r["scroll"+t],e.body["offset"+t],r["offset"+t],r["client"+t])):void 0===i?Z.css(e,n,s):Z.style(e,n,i,s)},e,o?i:void 0,o,null)}})}),Z.fn.size=function(){return this.length},Z.fn.andSelf=Z.fn.addBack,"function"==typeof define&&define.amd&&define("jquery",[],function(){return Z});var De=t.jQuery,Fe=t.$;return Z.noConflict=function(e){return t.$===Z&&(t.$=Fe),e&&t.jQuery===Z&&(t.jQuery=De),Z},typeof e===Tt&&(t.jQuery=t.$=Z),Z})}},"dist/jquery"),r.createPackage("vague-time",{"lib/vagueTime":function(t,e,n,i){!function(e){"use strict";function n(t){var e,n=i(t.units),o=Date.now(),s=r(t.from,n,o),u=r(t.to,n,o),l=s-u;return l>=0?e="past":(e="future",l=-l),a(l,e,t.lang)}function i(t){if("undefined"==typeof t)return"ms";if("s"===t||"ms"===t)return t;throw new Error("Invalid units")}function r(t,e,n){if("undefined"==typeof t)return n;if("string"==typeof t&&(t=parseInt(t,10)),o(t)&&s(t))throw new Error("Invalid time");return"number"==typeof t&&"s"===e&&(t*=1e3),t}function o(t){return"[object Date]"!==Object.prototype.toString.call(t)||isNaN(t.getTime())}function s(t){return"number"!=typeof t||isNaN(t)}function a(t,e,n){var i,r,o=c[n]||c[h];for(i in l)if(l.hasOwnProperty(i)&&t>=l[i])return r=Math.floor(t/l[i]),o[e](r,o[i][(r>1)+0]);return o.defaults[e]}function u(){"function"==typeof define&&define.amd?define(function(){return f}):"undefined"!=typeof t&&null!==t?t.exports=f:e.vagueTime=f}var l={year:315576e5,month:26298e5,week:6048e5,day:864e5,hour:36e5,minute:6e4},c={br:{year:["ano","anos"],month:["mês","meses"],week:["semana","semanas"],day:["dia","dias"],hour:["hora","horas"],minute:["minuto","minutos"],past:function(t,e){return t+" "+e+" atrás"},future:function(t,e){return"em "+t+" "+e},defaults:{past:"agora mesmo",future:"em breve"}},da:{year:["år","år"],month:["måned","måneder"],week:["uge","uger"],day:["dag","dage"],hour:["time","timer"],minute:["minut","minutter"],past:function(t,e){return t+" "+e+" siden"},future:function(t,e){return"om "+t+" "+e},defaults:{past:"lige nu",future:"snart"}},de:{year:["Jahr","Jahren"],month:["Monat","Monaten"],week:["Woche","Wochen"],day:["Tag","Tagen"],hour:["Stunde","Stunden"],minute:["Minute","Minuten"],past:function(t,e){return"vor "+t+" "+e},future:function(t,e){return"in "+t+" "+e},defaults:{past:"jetzt gerade",future:"bald"}},en:{year:["year","years"],month:["month","months"],week:["week","weeks"],day:["day","days"],hour:["hour","hours"],minute:["minute","minutes"],past:function(t,e){return t+" "+e+" ago"},future:function(t,e){return"in "+t+" "+e},defaults:{past:"just now",future:"soon"}},es:{year:["año","años"],month:["mes","meses"],week:["semana","semanas"],day:["día","días"],hour:["hora","horas"],minute:["minuto","minutos"],past:function(t,e){return"hace "+t+" "+e},future:function(t,e){return"en "+t+" "+e},defaults:{past:"recién",future:"dentro de poco"}},fr:{year:["an","ans"],month:["mois","mois"],week:["semaine","semaines"],day:["jour","jours"],hour:["heure","heures"],minute:["minute","minutes"],past:function(t,e){return"il y a "+t+" "+e},future:function(t,e){return"dans "+t+" "+e},defaults:{past:"tout de suite",future:"bientôt"}},jp:{year:["年","年"],month:["ヶ月","ヶ月"],week:["週間","週間"],day:["日","日"],hour:["時間","時間"],minute:["分","分"],past:function(t,e){return t+" "+e+"前"},future:function(t,e){return t+" "+e+"後"},defaults:{past:"今",future:"すぐに"}},ko:{year:["년","년"],month:["개월","개월"],week:["주","주"],day:["일","일"],hour:["시간","시간"],minute:["분","분"],past:function(t,e){return t+" "+e+" 전"},future:function(t,e){return t+" "+e+" 후"},defaults:{past:"지금",future:"곧"}},nl:{year:["jaar","jaar"],month:["maand","maanden"],week:["week","weken"],day:["dag","dagen"],hour:["uur","uur"],minute:["minuut","minuten"],past:function(t,e){return t+" "+e+" geleden"},future:function(t,e){return"over "+t+" "+e},defaults:{past:"juist nu",future:"binnenkort"}},zh:{year:["年","年"],month:["个月","个月"],week:["周","周"],day:["天","天"],hour:["小时","小时"],minute:["分钟","分钟"],past:function(t,e){return t+" "+e+" 之前"},future:function(t,e){return"in "+t+" "+e},defaults:{past:"刚刚",future:"马上"}}},h="en",f={get:n};u()}(this)}},"lib/vagueTime"),r.createPackage("underscore",{underscore:function(t,e,n,i){(function(){function n(t){function e(e,n,i,r,o,s){for(;o>=0&&s>o;o+=t){var a=r?r[o]:o;i=n(i,e[a],a,e)}return i}return function(n,i,r,o){i=_(i,o,4);var s=!S(n)&&x.keys(n),a=(s||n).length,u=t>0?0:a-1;return arguments.length<3&&(r=n[s?s[u]:u],u+=t),e(n,i,r,s,u,a)}}function i(t){return function(e,n,i){n=w(n,i);for(var r=j(e),o=t>0?0:r-1;o>=0&&r>o;o+=t)if(n(e[o],o,e))return o;return-1}}function r(t,e,n){return function(i,r,o){var s=0,a=j(i);if("number"==typeof o)t>0?s=o>=0?o:Math.max(o+a,s):a=o>=0?Math.min(o+1,a):o+a+1;else if(n&&o&&a)return o=n(i,r),i[o]===r?o:-1;if(r!==r)return o=e(f.call(i,s,a),x.isNaN),o>=0?o+s:-1;for(o=t>0?s:a-1;o>=0&&a>o;o+=t)if(i[o]===r)return o;return-1}}function o(t,e){var n=O.length,i=t.constructor,r=x.isFunction(i)&&i.prototype||l,o="constructor";for(x.has(t,o)&&!x.contains(e,o)&&e.push(o);n--;)o=O[n],o in t&&t[o]!==r[o]&&!x.contains(e,o)&&e.push(o)}var s=this,a=s._,u=Array.prototype,l=Object.prototype,c=Function.prototype,h=u.push,f=u.slice,d=l.toString,p=l.hasOwnProperty,g=Array.isArray,v=Object.keys,m=c.bind,y=Object.create,b=function(){},x=function(t){return t instanceof x?t:this instanceof x?void(this._wrapped=t):new x(t)};"undefined"!=typeof e?("undefined"!=typeof t&&t.exports&&(e=t.exports=x),e._=x):s._=x,x.VERSION="1.8.3";var _=function(t,e,n){if(void 0===e)return t;switch(null==n?3:n){case 1:return function(n){return t.call(e,n)};case 2:return function(n,i){return t.call(e,n,i)};case 3:return function(n,i,r){return t.call(e,n,i,r)};case 4:return function(n,i,r,o){return t.call(e,n,i,r,o)}}return function(){return t.apply(e,arguments)}},w=function(t,e,n){return null==t?x.identity:x.isFunction(t)?_(t,e,n):x.isObject(t)?x.matcher(t):x.property(t)};x.iteratee=function(t,e){return w(t,e,1/0)};var E=function(t,e){return function(n){var i=arguments.length;if(2>i||null==n)return n;for(var r=1;i>r;r++)for(var o=arguments[r],s=t(o),a=s.length,u=0;a>u;u++){var l=s[u];e&&void 0!==n[l]||(n[l]=o[l])}return n}},k=function(t){if(!x.isObject(t))return{};if(y)return y(t);b.prototype=t;var e=new b;return b.prototype=null,e},T=function(t){return function(e){return null==e?void 0:e[t]}},C=Math.pow(2,53)-1,j=T("length"),S=function(t){var e=j(t);return"number"==typeof e&&e>=0&&C>=e};x.each=x.forEach=function(t,e,n){e=_(e,n);var i,r;if(S(t))for(i=0,r=t.length;r>i;i++)e(t[i],i,t);else{var o=x.keys(t);for(i=0,r=o.length;r>i;i++)e(t[o[i]],o[i],t)}return t},x.map=x.collect=function(t,e,n){e=w(e,n);for(var i=!S(t)&&x.keys(t),r=(i||t).length,o=Array(r),s=0;r>s;s++){var a=i?i[s]:s;o[s]=e(t[a],a,t)}return o},x.reduce=x.foldl=x.inject=n(1),x.reduceRight=x.foldr=n(-1),x.find=x.detect=function(t,e,n){var i;return i=S(t)?x.findIndex(t,e,n):x.findKey(t,e,n),void 0!==i&&-1!==i?t[i]:void 0},x.filter=x.select=function(t,e,n){var i=[];return e=w(e,n),x.each(t,function(t,n,r){e(t,n,r)&&i.push(t)}),i},x.reject=function(t,e,n){return x.filter(t,x.negate(w(e)),n)},x.every=x.all=function(t,e,n){e=w(e,n);for(var i=!S(t)&&x.keys(t),r=(i||t).length,o=0;r>o;o++){var s=i?i[o]:o;if(!e(t[s],s,t))return!1}return!0},x.some=x.any=function(t,e,n){e=w(e,n);for(var i=!S(t)&&x.keys(t),r=(i||t).length,o=0;r>o;o++){var s=i?i[o]:o;if(e(t[s],s,t))return!0}return!1},x.contains=x.includes=x.include=function(t,e,n,i){return S(t)||(t=x.values(t)),("number"!=typeof n||i)&&(n=0),x.indexOf(t,e,n)>=0},x.invoke=function(t,e){var n=f.call(arguments,2),i=x.isFunction(e);return x.map(t,function(t){var r=i?e:t[e];return null==r?r:r.apply(t,n)})},x.pluck=function(t,e){return x.map(t,x.property(e))},x.where=function(t,e){return x.filter(t,x.matcher(e))},x.findWhere=function(t,e){return x.find(t,x.matcher(e))},x.max=function(t,e,n){var i,r,o=-(1/0),s=-(1/0);if(null==e&&null!=t){t=S(t)?t:x.values(t);for(var a=0,u=t.length;u>a;a++)i=t[a],i>o&&(o=i)}else e=w(e,n),x.each(t,function(t,n,i){r=e(t,n,i),(r>s||r===-(1/0)&&o===-(1/0))&&(o=t,s=r)});return o},x.min=function(t,e,n){var i,r,o=1/0,s=1/0;if(null==e&&null!=t){t=S(t)?t:x.values(t);for(var a=0,u=t.length;u>a;a++)i=t[a],o>i&&(o=i)}else e=w(e,n),x.each(t,function(t,n,i){r=e(t,n,i),(s>r||r===1/0&&o===1/0)&&(o=t,s=r)});return o},x.shuffle=function(t){for(var e,n=S(t)?t:x.values(t),i=n.length,r=Array(i),o=0;i>o;o++)e=x.random(0,o),e!==o&&(r[o]=r[e]),r[e]=n[o];return r},x.sample=function(t,e,n){return null==e||n?(S(t)||(t=x.values(t)),t[x.random(t.length-1)]):x.shuffle(t).slice(0,Math.max(0,e))},x.sortBy=function(t,e,n){return e=w(e,n),x.pluck(x.map(t,function(t,n,i){return{value:t,index:n,criteria:e(t,n,i)}}).sort(function(t,e){var n=t.criteria,i=e.criteria;if(n!==i){if(n>i||void 0===n)return 1;if(i>n||void 0===i)return-1}return t.index-e.index}),"value")};var A=function(t){return function(e,n,i){var r={};return n=w(n,i),x.each(e,function(i,o){var s=n(i,o,e);t(r,i,s)}),r}};x.groupBy=A(function(t,e,n){x.has(t,n)?t[n].push(e):t[n]=[e]}),x.indexBy=A(function(t,e,n){t[n]=e}),x.countBy=A(function(t,e,n){x.has(t,n)?t[n]++:t[n]=1}),x.toArray=function(t){return t?x.isArray(t)?f.call(t):S(t)?x.map(t,x.identity):x.values(t):[]},x.size=function(t){return null==t?0:S(t)?t.length:x.keys(t).length},x.partition=function(t,e,n){e=w(e,n);var i=[],r=[];return x.each(t,function(t,n,o){(e(t,n,o)?i:r).push(t)}),[i,r]},x.first=x.head=x.take=function(t,e,n){return null!=t?null==e||n?t[0]:x.initial(t,t.length-e):void 0},x.initial=function(t,e,n){return f.call(t,0,Math.max(0,t.length-(null==e||n?1:e)))},x.last=function(t,e,n){return null!=t?null==e||n?t[t.length-1]:x.rest(t,Math.max(0,t.length-e)):void 0},x.rest=x.tail=x.drop=function(t,e,n){return f.call(t,null==e||n?1:e)},x.compact=function(t){return x.filter(t,x.identity)};var M=function(t,e,n,i){for(var r=[],o=0,s=i||0,a=j(t);a>s;s++){var u=t[s];if(S(u)&&(x.isArray(u)||x.isArguments(u))){e||(u=M(u,e,n));var l=0,c=u.length;for(r.length+=c;c>l;)r[o++]=u[l++]}else n||(r[o++]=u)}return r};x.flatten=function(t,e){return M(t,e,!1)},x.without=function(t){return x.difference(t,f.call(arguments,1))},x.uniq=x.unique=function(t,e,n,i){x.isBoolean(e)||(i=n,n=e,e=!1),null!=n&&(n=w(n,i));for(var r=[],o=[],s=0,a=j(t);a>s;s++){var u=t[s],l=n?n(u,s,t):u;e?(s&&o===l||r.push(u),o=l):n?x.contains(o,l)||(o.push(l),r.push(u)):x.contains(r,u)||r.push(u)}return r},x.union=function(){return x.uniq(M(arguments,!0,!0))},x.intersection=function(t){for(var e=[],n=arguments.length,i=0,r=j(t);r>i;i++){var o=t[i];if(!x.contains(e,o)){for(var s=1;n>s&&x.contains(arguments[s],o);s++);s===n&&e.push(o)}}return e},x.difference=function(t){var e=M(arguments,!0,!0,1);return x.filter(t,function(t){return!x.contains(e,t)})},x.zip=function(){return x.unzip(arguments)},x.unzip=function(t){for(var e=t&&x.max(t,j).length||0,n=Array(e),i=0;e>i;i++)n[i]=x.pluck(t,i);return n},x.object=function(t,e){for(var n={},i=0,r=j(t);r>i;i++)e?n[t[i]]=e[i]:n[t[i][0]]=t[i][1];return n},x.findIndex=i(1),x.findLastIndex=i(-1),x.sortedIndex=function(t,e,n,i){n=w(n,i,1);for(var r=n(e),o=0,s=j(t);s>o;){var a=Math.floor((o+s)/2);n(t[a])<r?o=a+1:s=a}return o},x.indexOf=r(1,x.findIndex,x.sortedIndex),x.lastIndexOf=r(-1,x.findLastIndex),x.range=function(t,e,n){null==e&&(e=t||0,t=0),n=n||1;for(var i=Math.max(Math.ceil((e-t)/n),0),r=Array(i),o=0;i>o;o++,t+=n)r[o]=t;return r};var N=function(t,e,n,i,r){if(!(i instanceof e))return t.apply(n,r);var o=k(t.prototype),s=t.apply(o,r);return x.isObject(s)?s:o};x.bind=function(t,e){if(m&&t.bind===m)return m.apply(t,f.call(arguments,1));if(!x.isFunction(t))throw new TypeError("Bind must be called on a function");var n=f.call(arguments,2),i=function(){return N(t,i,e,this,n.concat(f.call(arguments)))};return i},x.partial=function(t){var e=f.call(arguments,1),n=function(){for(var i=0,r=e.length,o=Array(r),s=0;r>s;s++)o[s]=e[s]===x?arguments[i++]:e[s];for(;i<arguments.length;)o.push(arguments[i++]);return N(t,n,this,this,o)};return n},x.bindAll=function(t){var e,n,i=arguments.length;if(1>=i)throw new Error("bindAll must be passed function names");for(e=1;i>e;e++)n=arguments[e],t[n]=x.bind(t[n],t);return t},x.memoize=function(t,e){var n=function(i){var r=n.cache,o=""+(e?e.apply(this,arguments):i);return x.has(r,o)||(r[o]=t.apply(this,arguments)),r[o]};return n.cache={},n},x.delay=function(t,e){var n=f.call(arguments,2);return setTimeout(function(){return t.apply(null,n)},e)},x.defer=x.partial(x.delay,x,1),x.throttle=function(t,e,n){var i,r,o,s=null,a=0;n||(n={});var u=function(){a=n.leading===!1?0:x.now(),s=null,o=t.apply(i,r),s||(i=r=null)};return function(){var l=x.now();a||n.leading!==!1||(a=l);var c=e-(l-a);return i=this,r=arguments,0>=c||c>e?(s&&(clearTimeout(s),s=null),a=l,o=t.apply(i,r),s||(i=r=null)):s||n.trailing===!1||(s=setTimeout(u,c)),o}},x.debounce=function(t,e,n){var i,r,o,s,a,u=function(){var l=x.now()-s;e>l&&l>=0?i=setTimeout(u,e-l):(i=null,n||(a=t.apply(o,r),i||(o=r=null)))};return function(){o=this,r=arguments,s=x.now();var l=n&&!i;return i||(i=setTimeout(u,e)),l&&(a=t.apply(o,r),o=r=null),a}},x.wrap=function(t,e){return x.partial(e,t)},x.negate=function(t){return function(){return!t.apply(this,arguments)}},x.compose=function(){var t=arguments,e=t.length-1;return function(){for(var n=e,i=t[e].apply(this,arguments);n--;)i=t[n].call(this,i);return i}},x.after=function(t,e){return function(){return--t<1?e.apply(this,arguments):void 0}},x.before=function(t,e){var n;return function(){return--t>0&&(n=e.apply(this,arguments)),1>=t&&(e=null),n}},x.once=x.partial(x.before,2);var B=!{toString:null}.propertyIsEnumerable("toString"),O=["valueOf","isPrototypeOf","toString","propertyIsEnumerable","hasOwnProperty","toLocaleString"];x.keys=function(t){if(!x.isObject(t))return[];if(v)return v(t);var e=[];for(var n in t)x.has(t,n)&&e.push(n);return B&&o(t,e),e},x.allKeys=function(t){if(!x.isObject(t))return[];var e=[];for(var n in t)e.push(n);return B&&o(t,e),e},x.values=function(t){for(var e=x.keys(t),n=e.length,i=Array(n),r=0;n>r;r++)i[r]=t[e[r]];return i},x.mapObject=function(t,e,n){e=w(e,n);for(var i,r=x.keys(t),o=r.length,s={},a=0;o>a;a++)i=r[a],s[i]=e(t[i],i,t);return s},x.pairs=function(t){for(var e=x.keys(t),n=e.length,i=Array(n),r=0;n>r;r++)i[r]=[e[r],t[e[r]]];return i},x.invert=function(t){for(var e={},n=x.keys(t),i=0,r=n.length;r>i;i++)e[t[n[i]]]=n[i];return e},x.functions=x.methods=function(t){var e=[];for(var n in t)x.isFunction(t[n])&&e.push(n);return e.sort()},x.extend=E(x.allKeys),x.extendOwn=x.assign=E(x.keys),x.findKey=function(t,e,n){e=w(e,n);for(var i,r=x.keys(t),o=0,s=r.length;s>o;o++)if(i=r[o],e(t[i],i,t))return i},x.pick=function(t,e,n){var i,r,o={},s=t;if(null==s)return o;x.isFunction(e)?(r=x.allKeys(s),i=_(e,n)):(r=M(arguments,!1,!1,1),i=function(t,e,n){return e in n},s=Object(s));for(var a=0,u=r.length;u>a;a++){var l=r[a],c=s[l];i(c,l,s)&&(o[l]=c)}return o},x.omit=function(t,e,n){if(x.isFunction(e))e=x.negate(e);else{var i=x.map(M(arguments,!1,!1,1),String);e=function(t,e){return!x.contains(i,e)}}return x.pick(t,e,n)},x.defaults=E(x.allKeys,!0),x.create=function(t,e){var n=k(t);return e&&x.extendOwn(n,e),n},x.clone=function(t){return x.isObject(t)?x.isArray(t)?t.slice():x.extend({},t):t},x.tap=function(t,e){return e(t),t},x.isMatch=function(t,e){var n=x.keys(e),i=n.length;if(null==t)return!i;for(var r=Object(t),o=0;i>o;o++){var s=n[o];if(e[s]!==r[s]||!(s in r))return!1}return!0};var P=function(t,e,n,i){if(t===e)return 0!==t||1/t===1/e;if(null==t||null==e)return t===e;t instanceof x&&(t=t._wrapped),e instanceof x&&(e=e._wrapped);var r=d.call(t);if(r!==d.call(e))return!1;switch(r){case"[object RegExp]":case"[object String]":return""+t==""+e;case"[object Number]":return+t!==+t?+e!==+e:0===+t?1/+t===1/e:+t===+e;case"[object Date]":case"[object Boolean]":return+t===+e}var o="[object Array]"===r;if(!o){if("object"!=typeof t||"object"!=typeof e)return!1;var s=t.constructor,a=e.constructor;if(s!==a&&!(x.isFunction(s)&&s instanceof s&&x.isFunction(a)&&a instanceof a)&&"constructor"in t&&"constructor"in e)return!1}n=n||[],i=i||[];for(var u=n.length;u--;)if(n[u]===t)return i[u]===e;if(n.push(t),i.push(e),o){if(u=t.length,u!==e.length)return!1;for(;u--;)if(!P(t[u],e[u],n,i))return!1}else{var l,c=x.keys(t);if(u=c.length,x.keys(e).length!==u)return!1;for(;u--;)if(l=c[u],!x.has(e,l)||!P(t[l],e[l],n,i))return!1}return n.pop(),i.pop(),!0};x.isEqual=function(t,e){return P(t,e)},x.isEmpty=function(t){return null==t?!0:S(t)&&(x.isArray(t)||x.isString(t)||x.isArguments(t))?0===t.length:0===x.keys(t).length},x.isElement=function(t){return!(!t||1!==t.nodeType)},x.isArray=g||function(t){return"[object Array]"===d.call(t)},x.isObject=function(t){var e=typeof t;return"function"===e||"object"===e&&!!t},x.each(["Arguments","Function","String","Number","Date","RegExp","Error"],function(t){x["is"+t]=function(e){return d.call(e)==="[object "+t+"]"}}),x.isArguments(arguments)||(x.isArguments=function(t){return x.has(t,"callee")}),"function"!=typeof/./&&"object"!=typeof Int8Array&&(x.isFunction=function(t){return"function"==typeof t||!1}),x.isFinite=function(t){return isFinite(t)&&!isNaN(parseFloat(t))},x.isNaN=function(t){return x.isNumber(t)&&t!==+t},x.isBoolean=function(t){return t===!0||t===!1||"[object Boolean]"===d.call(t)},x.isNull=function(t){return null===t},x.isUndefined=function(t){return void 0===t},x.has=function(t,e){return null!=t&&p.call(t,e)},x.noConflict=function(){return s._=a,this},x.identity=function(t){return t},x.constant=function(t){return function(){return t}},x.noop=function(){},x.property=T,x.propertyOf=function(t){return null==t?function(){}:function(e){return t[e]}},x.matcher=x.matches=function(t){return t=x.extendOwn({},t),function(e){return x.isMatch(e,t)}},x.times=function(t,e,n){var i=Array(Math.max(0,t));e=_(e,n,1);for(var r=0;t>r;r++)i[r]=e(r);return i},x.random=function(t,e){return null==e&&(e=t,t=0),t+Math.floor(Math.random()*(e-t+1))},x.now=Date.now||function(){return(new Date).getTime()};var $={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"},D=x.invert($),F=function(t){var e=function(e){return t[e]},n="(?:"+x.keys(t).join("|")+")",i=RegExp(n),r=RegExp(n,"g");return function(t){return t=null==t?"":""+t,i.test(t)?t.replace(r,e):t}};x.escape=F($),x.unescape=F(D),x.result=function(t,e,n){var i=null==t?void 0:t[e];return void 0===i&&(i=n),x.isFunction(i)?i.call(t):i};var H=0;x.uniqueId=function(t){var e=++H+"";return t?t+e:e},x.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var I=/(.)^/,q={"'":"'","\\":"\\","\r":"r","\n":"n","\u2028":"u2028","\u2029":"u2029"},R=/\\|'|\r|\n|\u2028|\u2029/g,L=function(t){return"\\"+q[t]};x.template=function(t,e,n){!e&&n&&(e=n),e=x.defaults({},e,x.templateSettings);var i=RegExp([(e.escape||I).source,(e.interpolate||I).source,(e.evaluate||I).source].join("|")+"|$","g"),r=0,o="__p+='";t.replace(i,function(e,n,i,s,a){return o+=t.slice(r,a).replace(R,L),r=a+e.length,n?o+="'+\n((__t=("+n+"))==null?'':_.escape(__t))+\n'":i?o+="'+\n((__t=("+i+"))==null?'':__t)+\n'":s&&(o+="';\n"+s+"\n__p+='"),e}),o+="';\n",e.variable||(o="with(obj||{}){\n"+o+"}\n"),o="var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\n"+o+"return __p;\n";try{var s=new Function(e.variable||"obj","_",o)}catch(a){throw a.source=o,a}var u=function(t){return s.call(this,t,x)},l=e.variable||"obj";return u.source="function("+l+"){\n"+o+"}",u},x.chain=function(t){var e=x(t);return e._chain=!0,e};var V=function(t,e){return t._chain?x(e).chain():e};x.mixin=function(t){x.each(x.functions(t),function(e){var n=x[e]=t[e];x.prototype[e]=function(){var t=[this._wrapped];return h.apply(t,arguments),V(this,n.apply(x,t))}})},x.mixin(x),x.each(["pop","push","reverse","shift","sort","splice","unshift"],function(t){var e=u[t];x.prototype[t]=function(){var n=this._wrapped;return e.apply(n,arguments),"shift"!==t&&"splice"!==t||0!==n.length||delete n[0],V(this,n)}}),x.each(["concat","join","slice"],function(t){var e=u[t];x.prototype[t]=function(){return V(this,e.apply(this._wrapped,arguments))}}),x.prototype.value=function(){return this._wrapped},x.prototype.valueOf=x.prototype.toJSON=x.prototype.value,x.prototype.toString=function(){return""+this._wrapped},"function"==typeof define&&define.amd&&define("underscore",[],function(){return x})}).call(this)},"underscore-min":function(t,e,n,i){(function(){function n(t){function e(e,n,i,r,o,s){for(;o>=0&&s>o;o+=t){var a=r?r[o]:o;i=n(i,e[a],a,e)}return i}return function(n,i,r,o){i=_(i,o,4);var s=!S(n)&&x.keys(n),a=(s||n).length,u=t>0?0:a-1;return arguments.length<3&&(r=n[s?s[u]:u],u+=t),e(n,i,r,s,u,a)}}function i(t){return function(e,n,i){n=w(n,i);for(var r=j(e),o=t>0?0:r-1;o>=0&&r>o;o+=t)if(n(e[o],o,e))return o;return-1}}function r(t,e,n){return function(i,r,o){var s=0,a=j(i);if("number"==typeof o)t>0?s=o>=0?o:Math.max(o+a,s):a=o>=0?Math.min(o+1,a):o+a+1;else if(n&&o&&a)return o=n(i,r),i[o]===r?o:-1;if(r!==r)return o=e(f.call(i,s,a),x.isNaN),o>=0?o+s:-1;for(o=t>0?s:a-1;o>=0&&a>o;o+=t)if(i[o]===r)return o;return-1}}function o(t,e){var n=O.length,i=t.constructor,r=x.isFunction(i)&&i.prototype||l,o="constructor";for(x.has(t,o)&&!x.contains(e,o)&&e.push(o);n--;)o=O[n],o in t&&t[o]!==r[o]&&!x.contains(e,o)&&e.push(o)}var s=this,a=s._,u=Array.prototype,l=Object.prototype,c=Function.prototype,h=u.push,f=u.slice,d=l.toString,p=l.hasOwnProperty,g=Array.isArray,v=Object.keys,m=c.bind,y=Object.create,b=function(){},x=function(t){return t instanceof x?t:this instanceof x?void(this._wrapped=t):new x(t)};"undefined"!=typeof e?("undefined"!=typeof t&&t.exports&&(e=t.exports=x),e._=x):s._=x,x.VERSION="1.8.3";var _=function(t,e,n){if(void 0===e)return t;switch(null==n?3:n){case 1:return function(n){return t.call(e,n)};case 2:return function(n,i){return t.call(e,n,i)};case 3:return function(n,i,r){return t.call(e,n,i,r)};case 4:return function(n,i,r,o){return t.call(e,n,i,r,o)}}return function(){return t.apply(e,arguments)}},w=function(t,e,n){return null==t?x.identity:x.isFunction(t)?_(t,e,n):x.isObject(t)?x.matcher(t):x.property(t)};x.iteratee=function(t,e){return w(t,e,1/0)};var E=function(t,e){return function(n){var i=arguments.length;if(2>i||null==n)return n;for(var r=1;i>r;r++)for(var o=arguments[r],s=t(o),a=s.length,u=0;a>u;u++){var l=s[u];e&&void 0!==n[l]||(n[l]=o[l])}return n}},k=function(t){if(!x.isObject(t))return{};if(y)return y(t);b.prototype=t;var e=new b;return b.prototype=null,e},T=function(t){return function(e){return null==e?void 0:e[t]}},C=Math.pow(2,53)-1,j=T("length"),S=function(t){var e=j(t);return"number"==typeof e&&e>=0&&C>=e};x.each=x.forEach=function(t,e,n){e=_(e,n);var i,r;if(S(t))for(i=0,r=t.length;r>i;i++)e(t[i],i,t);else{var o=x.keys(t);for(i=0,r=o.length;r>i;i++)e(t[o[i]],o[i],t)}return t},x.map=x.collect=function(t,e,n){e=w(e,n);for(var i=!S(t)&&x.keys(t),r=(i||t).length,o=Array(r),s=0;r>s;s++){var a=i?i[s]:s;o[s]=e(t[a],a,t)}return o},x.reduce=x.foldl=x.inject=n(1),x.reduceRight=x.foldr=n(-1),x.find=x.detect=function(t,e,n){var i;return i=S(t)?x.findIndex(t,e,n):x.findKey(t,e,n),void 0!==i&&-1!==i?t[i]:void 0},x.filter=x.select=function(t,e,n){var i=[];return e=w(e,n),x.each(t,function(t,n,r){e(t,n,r)&&i.push(t)}),i},x.reject=function(t,e,n){return x.filter(t,x.negate(w(e)),n)},x.every=x.all=function(t,e,n){e=w(e,n);for(var i=!S(t)&&x.keys(t),r=(i||t).length,o=0;r>o;o++){var s=i?i[o]:o;if(!e(t[s],s,t))return!1}return!0},x.some=x.any=function(t,e,n){e=w(e,n);for(var i=!S(t)&&x.keys(t),r=(i||t).length,o=0;r>o;o++){var s=i?i[o]:o;if(e(t[s],s,t))return!0}return!1},x.contains=x.includes=x.include=function(t,e,n,i){return S(t)||(t=x.values(t)),("number"!=typeof n||i)&&(n=0),x.indexOf(t,e,n)>=0},x.invoke=function(t,e){var n=f.call(arguments,2),i=x.isFunction(e);return x.map(t,function(t){var r=i?e:t[e];return null==r?r:r.apply(t,n)})},x.pluck=function(t,e){return x.map(t,x.property(e))},x.where=function(t,e){return x.filter(t,x.matcher(e))},x.findWhere=function(t,e){return x.find(t,x.matcher(e))},x.max=function(t,e,n){var i,r,o=-1/0,s=-1/0;if(null==e&&null!=t){t=S(t)?t:x.values(t);for(var a=0,u=t.length;u>a;a++)i=t[a],i>o&&(o=i)}else e=w(e,n),x.each(t,function(t,n,i){r=e(t,n,i),(r>s||r===-1/0&&o===-1/0)&&(o=t,s=r)});return o},x.min=function(t,e,n){var i,r,o=1/0,s=1/0;if(null==e&&null!=t){t=S(t)?t:x.values(t);for(var a=0,u=t.length;u>a;a++)i=t[a],o>i&&(o=i)}else e=w(e,n),x.each(t,function(t,n,i){r=e(t,n,i),(s>r||1/0===r&&1/0===o)&&(o=t,s=r)});return o},x.shuffle=function(t){for(var e,n=S(t)?t:x.values(t),i=n.length,r=Array(i),o=0;i>o;o++)e=x.random(0,o),e!==o&&(r[o]=r[e]),r[e]=n[o];return r},x.sample=function(t,e,n){return null==e||n?(S(t)||(t=x.values(t)),t[x.random(t.length-1)]):x.shuffle(t).slice(0,Math.max(0,e))},x.sortBy=function(t,e,n){return e=w(e,n),x.pluck(x.map(t,function(t,n,i){return{value:t,index:n,criteria:e(t,n,i)}}).sort(function(t,e){var n=t.criteria,i=e.criteria;if(n!==i){if(n>i||void 0===n)return 1;if(i>n||void 0===i)return-1}return t.index-e.index}),"value")};var A=function(t){return function(e,n,i){var r={};return n=w(n,i),x.each(e,function(i,o){var s=n(i,o,e);t(r,i,s)}),r}};x.groupBy=A(function(t,e,n){x.has(t,n)?t[n].push(e):t[n]=[e]}),x.indexBy=A(function(t,e,n){t[n]=e}),x.countBy=A(function(t,e,n){x.has(t,n)?t[n]++:t[n]=1}),x.toArray=function(t){return t?x.isArray(t)?f.call(t):S(t)?x.map(t,x.identity):x.values(t):[]},x.size=function(t){return null==t?0:S(t)?t.length:x.keys(t).length},x.partition=function(t,e,n){
e=w(e,n);var i=[],r=[];return x.each(t,function(t,n,o){(e(t,n,o)?i:r).push(t)}),[i,r]},x.first=x.head=x.take=function(t,e,n){return null==t?void 0:null==e||n?t[0]:x.initial(t,t.length-e)},x.initial=function(t,e,n){return f.call(t,0,Math.max(0,t.length-(null==e||n?1:e)))},x.last=function(t,e,n){return null==t?void 0:null==e||n?t[t.length-1]:x.rest(t,Math.max(0,t.length-e))},x.rest=x.tail=x.drop=function(t,e,n){return f.call(t,null==e||n?1:e)},x.compact=function(t){return x.filter(t,x.identity)};var M=function(t,e,n,i){for(var r=[],o=0,s=i||0,a=j(t);a>s;s++){var u=t[s];if(S(u)&&(x.isArray(u)||x.isArguments(u))){e||(u=M(u,e,n));var l=0,c=u.length;for(r.length+=c;c>l;)r[o++]=u[l++]}else n||(r[o++]=u)}return r};x.flatten=function(t,e){return M(t,e,!1)},x.without=function(t){return x.difference(t,f.call(arguments,1))},x.uniq=x.unique=function(t,e,n,i){x.isBoolean(e)||(i=n,n=e,e=!1),null!=n&&(n=w(n,i));for(var r=[],o=[],s=0,a=j(t);a>s;s++){var u=t[s],l=n?n(u,s,t):u;e?(s&&o===l||r.push(u),o=l):n?x.contains(o,l)||(o.push(l),r.push(u)):x.contains(r,u)||r.push(u)}return r},x.union=function(){return x.uniq(M(arguments,!0,!0))},x.intersection=function(t){for(var e=[],n=arguments.length,i=0,r=j(t);r>i;i++){var o=t[i];if(!x.contains(e,o)){for(var s=1;n>s&&x.contains(arguments[s],o);s++);s===n&&e.push(o)}}return e},x.difference=function(t){var e=M(arguments,!0,!0,1);return x.filter(t,function(t){return!x.contains(e,t)})},x.zip=function(){return x.unzip(arguments)},x.unzip=function(t){for(var e=t&&x.max(t,j).length||0,n=Array(e),i=0;e>i;i++)n[i]=x.pluck(t,i);return n},x.object=function(t,e){for(var n={},i=0,r=j(t);r>i;i++)e?n[t[i]]=e[i]:n[t[i][0]]=t[i][1];return n},x.findIndex=i(1),x.findLastIndex=i(-1),x.sortedIndex=function(t,e,n,i){n=w(n,i,1);for(var r=n(e),o=0,s=j(t);s>o;){var a=Math.floor((o+s)/2);n(t[a])<r?o=a+1:s=a}return o},x.indexOf=r(1,x.findIndex,x.sortedIndex),x.lastIndexOf=r(-1,x.findLastIndex),x.range=function(t,e,n){null==e&&(e=t||0,t=0),n=n||1;for(var i=Math.max(Math.ceil((e-t)/n),0),r=Array(i),o=0;i>o;o++,t+=n)r[o]=t;return r};var N=function(t,e,n,i,r){if(!(i instanceof e))return t.apply(n,r);var o=k(t.prototype),s=t.apply(o,r);return x.isObject(s)?s:o};x.bind=function(t,e){if(m&&t.bind===m)return m.apply(t,f.call(arguments,1));if(!x.isFunction(t))throw new TypeError("Bind must be called on a function");var n=f.call(arguments,2),i=function(){return N(t,i,e,this,n.concat(f.call(arguments)))};return i},x.partial=function(t){var e=f.call(arguments,1),n=function(){for(var i=0,r=e.length,o=Array(r),s=0;r>s;s++)o[s]=e[s]===x?arguments[i++]:e[s];for(;i<arguments.length;)o.push(arguments[i++]);return N(t,n,this,this,o)};return n},x.bindAll=function(t){var e,n,i=arguments.length;if(1>=i)throw new Error("bindAll must be passed function names");for(e=1;i>e;e++)n=arguments[e],t[n]=x.bind(t[n],t);return t},x.memoize=function(t,e){var n=function(i){var r=n.cache,o=""+(e?e.apply(this,arguments):i);return x.has(r,o)||(r[o]=t.apply(this,arguments)),r[o]};return n.cache={},n},x.delay=function(t,e){var n=f.call(arguments,2);return setTimeout(function(){return t.apply(null,n)},e)},x.defer=x.partial(x.delay,x,1),x.throttle=function(t,e,n){var i,r,o,s=null,a=0;n||(n={});var u=function(){a=n.leading===!1?0:x.now(),s=null,o=t.apply(i,r),s||(i=r=null)};return function(){var l=x.now();a||n.leading!==!1||(a=l);var c=e-(l-a);return i=this,r=arguments,0>=c||c>e?(s&&(clearTimeout(s),s=null),a=l,o=t.apply(i,r),s||(i=r=null)):s||n.trailing===!1||(s=setTimeout(u,c)),o}},x.debounce=function(t,e,n){var i,r,o,s,a,u=function(){var l=x.now()-s;e>l&&l>=0?i=setTimeout(u,e-l):(i=null,n||(a=t.apply(o,r),i||(o=r=null)))};return function(){o=this,r=arguments,s=x.now();var l=n&&!i;return i||(i=setTimeout(u,e)),l&&(a=t.apply(o,r),o=r=null),a}},x.wrap=function(t,e){return x.partial(e,t)},x.negate=function(t){return function(){return!t.apply(this,arguments)}},x.compose=function(){var t=arguments,e=t.length-1;return function(){for(var n=e,i=t[e].apply(this,arguments);n--;)i=t[n].call(this,i);return i}},x.after=function(t,e){return function(){return--t<1?e.apply(this,arguments):void 0}},x.before=function(t,e){var n;return function(){return--t>0&&(n=e.apply(this,arguments)),1>=t&&(e=null),n}},x.once=x.partial(x.before,2);var B=!{toString:null}.propertyIsEnumerable("toString"),O=["valueOf","isPrototypeOf","toString","propertyIsEnumerable","hasOwnProperty","toLocaleString"];x.keys=function(t){if(!x.isObject(t))return[];if(v)return v(t);var e=[];for(var n in t)x.has(t,n)&&e.push(n);return B&&o(t,e),e},x.allKeys=function(t){if(!x.isObject(t))return[];var e=[];for(var n in t)e.push(n);return B&&o(t,e),e},x.values=function(t){for(var e=x.keys(t),n=e.length,i=Array(n),r=0;n>r;r++)i[r]=t[e[r]];return i},x.mapObject=function(t,e,n){e=w(e,n);for(var i,r=x.keys(t),o=r.length,s={},a=0;o>a;a++)i=r[a],s[i]=e(t[i],i,t);return s},x.pairs=function(t){for(var e=x.keys(t),n=e.length,i=Array(n),r=0;n>r;r++)i[r]=[e[r],t[e[r]]];return i},x.invert=function(t){for(var e={},n=x.keys(t),i=0,r=n.length;r>i;i++)e[t[n[i]]]=n[i];return e},x.functions=x.methods=function(t){var e=[];for(var n in t)x.isFunction(t[n])&&e.push(n);return e.sort()},x.extend=E(x.allKeys),x.extendOwn=x.assign=E(x.keys),x.findKey=function(t,e,n){e=w(e,n);for(var i,r=x.keys(t),o=0,s=r.length;s>o;o++)if(i=r[o],e(t[i],i,t))return i},x.pick=function(t,e,n){var i,r,o={},s=t;if(null==s)return o;x.isFunction(e)?(r=x.allKeys(s),i=_(e,n)):(r=M(arguments,!1,!1,1),i=function(t,e,n){return e in n},s=Object(s));for(var a=0,u=r.length;u>a;a++){var l=r[a],c=s[l];i(c,l,s)&&(o[l]=c)}return o},x.omit=function(t,e,n){if(x.isFunction(e))e=x.negate(e);else{var i=x.map(M(arguments,!1,!1,1),String);e=function(t,e){return!x.contains(i,e)}}return x.pick(t,e,n)},x.defaults=E(x.allKeys,!0),x.create=function(t,e){var n=k(t);return e&&x.extendOwn(n,e),n},x.clone=function(t){return x.isObject(t)?x.isArray(t)?t.slice():x.extend({},t):t},x.tap=function(t,e){return e(t),t},x.isMatch=function(t,e){var n=x.keys(e),i=n.length;if(null==t)return!i;for(var r=Object(t),o=0;i>o;o++){var s=n[o];if(e[s]!==r[s]||!(s in r))return!1}return!0};var P=function(t,e,n,i){if(t===e)return 0!==t||1/t===1/e;if(null==t||null==e)return t===e;t instanceof x&&(t=t._wrapped),e instanceof x&&(e=e._wrapped);var r=d.call(t);if(r!==d.call(e))return!1;switch(r){case"[object RegExp]":case"[object String]":return""+t==""+e;case"[object Number]":return+t!==+t?+e!==+e:0===+t?1/+t===1/e:+t===+e;case"[object Date]":case"[object Boolean]":return+t===+e}var o="[object Array]"===r;if(!o){if("object"!=typeof t||"object"!=typeof e)return!1;var s=t.constructor,a=e.constructor;if(s!==a&&!(x.isFunction(s)&&s instanceof s&&x.isFunction(a)&&a instanceof a)&&"constructor"in t&&"constructor"in e)return!1}n=n||[],i=i||[];for(var u=n.length;u--;)if(n[u]===t)return i[u]===e;if(n.push(t),i.push(e),o){if(u=t.length,u!==e.length)return!1;for(;u--;)if(!P(t[u],e[u],n,i))return!1}else{var l,c=x.keys(t);if(u=c.length,x.keys(e).length!==u)return!1;for(;u--;)if(l=c[u],!x.has(e,l)||!P(t[l],e[l],n,i))return!1}return n.pop(),i.pop(),!0};x.isEqual=function(t,e){return P(t,e)},x.isEmpty=function(t){return null==t?!0:S(t)&&(x.isArray(t)||x.isString(t)||x.isArguments(t))?0===t.length:0===x.keys(t).length},x.isElement=function(t){return!(!t||1!==t.nodeType)},x.isArray=g||function(t){return"[object Array]"===d.call(t)},x.isObject=function(t){var e=typeof t;return"function"===e||"object"===e&&!!t},x.each(["Arguments","Function","String","Number","Date","RegExp","Error"],function(t){x["is"+t]=function(e){return d.call(e)==="[object "+t+"]"}}),x.isArguments(arguments)||(x.isArguments=function(t){return x.has(t,"callee")}),"function"!=typeof/./&&"object"!=typeof Int8Array&&(x.isFunction=function(t){return"function"==typeof t||!1}),x.isFinite=function(t){return isFinite(t)&&!isNaN(parseFloat(t))},x.isNaN=function(t){return x.isNumber(t)&&t!==+t},x.isBoolean=function(t){return t===!0||t===!1||"[object Boolean]"===d.call(t)},x.isNull=function(t){return null===t},x.isUndefined=function(t){return void 0===t},x.has=function(t,e){return null!=t&&p.call(t,e)},x.noConflict=function(){return s._=a,this},x.identity=function(t){return t},x.constant=function(t){return function(){return t}},x.noop=function(){},x.property=T,x.propertyOf=function(t){return null==t?function(){}:function(e){return t[e]}},x.matcher=x.matches=function(t){return t=x.extendOwn({},t),function(e){return x.isMatch(e,t)}},x.times=function(t,e,n){var i=Array(Math.max(0,t));e=_(e,n,1);for(var r=0;t>r;r++)i[r]=e(r);return i},x.random=function(t,e){return null==e&&(e=t,t=0),t+Math.floor(Math.random()*(e-t+1))},x.now=Date.now||function(){return(new Date).getTime()};var $={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"},D=x.invert($),F=function(t){var e=function(e){return t[e]},n="(?:"+x.keys(t).join("|")+")",i=RegExp(n),r=RegExp(n,"g");return function(t){return t=null==t?"":""+t,i.test(t)?t.replace(r,e):t}};x.escape=F($),x.unescape=F(D),x.result=function(t,e,n){var i=null==t?void 0:t[e];return void 0===i&&(i=n),x.isFunction(i)?i.call(t):i};var H=0;x.uniqueId=function(t){var e=++H+"";return t?t+e:e},x.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var I=/(.)^/,q={"'":"'","\\":"\\","\r":"r","\n":"n","\u2028":"u2028","\u2029":"u2029"},R=/\\|'|\r|\n|\u2028|\u2029/g,L=function(t){return"\\"+q[t]};x.template=function(t,e,n){!e&&n&&(e=n),e=x.defaults({},e,x.templateSettings);var i=RegExp([(e.escape||I).source,(e.interpolate||I).source,(e.evaluate||I).source].join("|")+"|$","g"),r=0,o="__p+='";t.replace(i,function(e,n,i,s,a){return o+=t.slice(r,a).replace(R,L),r=a+e.length,n?o+="'+\n((__t=("+n+"))==null?'':_.escape(__t))+\n'":i?o+="'+\n((__t=("+i+"))==null?'':__t)+\n'":s&&(o+="';\n"+s+"\n__p+='"),e}),o+="';\n",e.variable||(o="with(obj||{}){\n"+o+"}\n"),o="var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\n"+o+"return __p;\n";try{var s=new Function(e.variable||"obj","_",o)}catch(a){throw a.source=o,a}var u=function(t){return s.call(this,t,x)},l=e.variable||"obj";return u.source="function("+l+"){\n"+o+"}",u},x.chain=function(t){var e=x(t);return e._chain=!0,e};var V=function(t,e){return t._chain?x(e).chain():e};x.mixin=function(t){x.each(x.functions(t),function(e){var n=x[e]=t[e];x.prototype[e]=function(){var t=[this._wrapped];return h.apply(t,arguments),V(this,n.apply(x,t))}})},x.mixin(x),x.each(["pop","push","reverse","shift","sort","splice","unshift"],function(t){var e=u[t];x.prototype[t]=function(){var n=this._wrapped;return e.apply(n,arguments),"shift"!==t&&"splice"!==t||0!==n.length||delete n[0],V(this,n)}}),x.each(["concat","join","slice"],function(t){var e=u[t];x.prototype[t]=function(){return V(this,e.apply(this._wrapped,arguments))}}),x.prototype.value=function(){return this._wrapped},x.prototype.valueOf=x.prototype.toJSON=x.prototype.value,x.prototype.toString=function(){return""+this._wrapped},"function"==typeof define&&define.amd&&define("underscore",[],function(){return x})}).call(this)}},"underscore"),r.createPackage("backbone",{backbone:function(t,e,n,i){!function(t){var r="object"==typeof self&&self.self==self&&self||"object"==typeof i&&i.global==i&&i;if("function"==typeof define&&define.amd)define(["underscore","jquery","exports"],function(e,n,i){r.Backbone=t(r,i,e,n)});else if("undefined"!=typeof e){var o,s=n("underscore");try{o=n("jquery")}catch(a){}t(r,e,s,o)}else r.Backbone=t(r,{},r._,r.jQuery||r.Zepto||r.ender||r.$)}(function(t,e,n,i){var r=t.Backbone,o=Array.prototype.slice;e.VERSION="1.2.3",e.$=i,e.noConflict=function(){return t.Backbone=r,this},e.emulateHTTP=!1,e.emulateJSON=!1;var s=function(t,e,i){switch(t){case 1:return function(){return n[e](this[i])};case 2:return function(t){return n[e](this[i],t)};case 3:return function(t,r){return n[e](this[i],u(t,this),r)};case 4:return function(t,r,o){return n[e](this[i],u(t,this),r,o)};default:return function(){var t=o.call(arguments);return t.unshift(this[i]),n[e].apply(n,t)}}},a=function(t,e,i){n.each(e,function(e,r){n[r]&&(t.prototype[r]=s(e,r,i))})},u=function(t,e){return n.isFunction(t)?t:n.isObject(t)&&!e._isModel(t)?l(t):n.isString(t)?function(e){return e.get(t)}:t},l=function(t){var e=n.matches(t);return function(t){return e(t.attributes)}},c=e.Events={},h=/\s+/,f=function(t,e,i,r,o){var s,a=0;if(i&&"object"==typeof i){void 0!==r&&"context"in o&&void 0===o.context&&(o.context=r);for(s=n.keys(i);a<s.length;a++)e=f(t,e,s[a],i[s[a]],o)}else if(i&&h.test(i))for(s=i.split(h);a<s.length;a++)e=t(e,s[a],r,o);else e=t(e,i,r,o);return e};c.on=function(t,e,n){return d(this,t,e,n)};var d=function(t,e,n,i,r){if(t._events=f(p,t._events||{},e,n,{context:i,ctx:t,listening:r}),r){var o=t._listeners||(t._listeners={});o[r.id]=r}return t};c.listenTo=function(t,e,i){if(!t)return this;var r=t._listenId||(t._listenId=n.uniqueId("l")),o=this._listeningTo||(this._listeningTo={}),s=o[r];if(!s){var a=this._listenId||(this._listenId=n.uniqueId("l"));s=o[r]={obj:t,objId:r,id:a,listeningTo:o,count:0}}return d(t,e,i,this,s),this};var p=function(t,e,n,i){if(n){var r=t[e]||(t[e]=[]),o=i.context,s=i.ctx,a=i.listening;a&&a.count++,r.push({callback:n,context:o,ctx:o||s,listening:a})}return t};c.off=function(t,e,n){return this._events?(this._events=f(g,this._events,t,e,{context:n,listeners:this._listeners}),this):this},c.stopListening=function(t,e,i){var r=this._listeningTo;if(!r)return this;for(var o=t?[t._listenId]:n.keys(r),s=0;s<o.length;s++){var a=r[o[s]];if(!a)break;a.obj.off(e,i,this)}return n.isEmpty(r)&&(this._listeningTo=void 0),this};var g=function(t,e,i,r){if(t){var o,s=0,a=r.context,u=r.listeners;if(e||i||a){for(var l=e?[e]:n.keys(t);s<l.length;s++){e=l[s];var c=t[e];if(!c)break;for(var h=[],f=0;f<c.length;f++){var d=c[f];i&&i!==d.callback&&i!==d.callback._callback||a&&a!==d.context?h.push(d):(o=d.listening,o&&0===--o.count&&(delete u[o.id],delete o.listeningTo[o.objId]))}h.length?t[e]=h:delete t[e]}return n.size(t)?t:void 0}for(var p=n.keys(u);s<p.length;s++)o=u[p[s]],delete u[o.id],delete o.listeningTo[o.objId]}};c.once=function(t,e,i){var r=f(v,{},t,e,n.bind(this.off,this));return this.on(r,void 0,i)},c.listenToOnce=function(t,e,i){var r=f(v,{},e,i,n.bind(this.stopListening,this,t));return this.listenTo(t,r)};var v=function(t,e,i,r){if(i){var o=t[e]=n.once(function(){r(e,o),i.apply(this,arguments)});o._callback=i}return t};c.trigger=function(t){if(!this._events)return this;for(var e=Math.max(0,arguments.length-1),n=Array(e),i=0;e>i;i++)n[i]=arguments[i+1];return f(m,this._events,t,void 0,n),this};var m=function(t,e,n,i){if(t){var r=t[e],o=t.all;r&&o&&(o=o.slice()),r&&y(r,i),o&&y(o,[e].concat(i))}return t},y=function(t,e){var n,i=-1,r=t.length,o=e[0],s=e[1],a=e[2];switch(e.length){case 0:for(;++i<r;)(n=t[i]).callback.call(n.ctx);return;case 1:for(;++i<r;)(n=t[i]).callback.call(n.ctx,o);return;case 2:for(;++i<r;)(n=t[i]).callback.call(n.ctx,o,s);return;case 3:for(;++i<r;)(n=t[i]).callback.call(n.ctx,o,s,a);return;default:for(;++i<r;)(n=t[i]).callback.apply(n.ctx,e);return}};c.bind=c.on,c.unbind=c.off,n.extend(e,c);var b=e.Model=function(t,e){var i=t||{};e||(e={}),this.cid=n.uniqueId(this.cidPrefix),this.attributes={},e.collection&&(this.collection=e.collection),e.parse&&(i=this.parse(i,e)||{}),i=n.defaults({},i,n.result(this,"defaults")),this.set(i,e),this.changed={},this.initialize.apply(this,arguments)};n.extend(b.prototype,c,{changed:null,validationError:null,idAttribute:"id",cidPrefix:"c",initialize:function(){},toJSON:function(t){return n.clone(this.attributes)},sync:function(){return e.sync.apply(this,arguments)},get:function(t){return this.attributes[t]},escape:function(t){return n.escape(this.get(t))},has:function(t){return null!=this.get(t)},matches:function(t){return!!n.iteratee(t,this)(this.attributes)},set:function(t,e,i){if(null==t)return this;var r;if("object"==typeof t?(r=t,i=e):(r={})[t]=e,i||(i={}),!this._validate(r,i))return!1;var o=i.unset,s=i.silent,a=[],u=this._changing;this._changing=!0,u||(this._previousAttributes=n.clone(this.attributes),this.changed={});var l=this.attributes,c=this.changed,h=this._previousAttributes;for(var f in r)e=r[f],n.isEqual(l[f],e)||a.push(f),n.isEqual(h[f],e)?delete c[f]:c[f]=e,o?delete l[f]:l[f]=e;if(this.id=this.get(this.idAttribute),!s){a.length&&(this._pending=i);for(var d=0;d<a.length;d++)this.trigger("change:"+a[d],this,l[a[d]],i)}if(u)return this;if(!s)for(;this._pending;)i=this._pending,this._pending=!1,this.trigger("change",this,i);return this._pending=!1,this._changing=!1,this},unset:function(t,e){return this.set(t,void 0,n.extend({},e,{unset:!0}))},clear:function(t){var e={};for(var i in this.attributes)e[i]=void 0;return this.set(e,n.extend({},t,{unset:!0}))},hasChanged:function(t){return null==t?!n.isEmpty(this.changed):n.has(this.changed,t)},changedAttributes:function(t){if(!t)return this.hasChanged()?n.clone(this.changed):!1;var e=this._changing?this._previousAttributes:this.attributes,i={};for(var r in t){var o=t[r];n.isEqual(e[r],o)||(i[r]=o)}return n.size(i)?i:!1},previous:function(t){return null!=t&&this._previousAttributes?this._previousAttributes[t]:null},previousAttributes:function(){return n.clone(this._previousAttributes)},fetch:function(t){t=n.extend({parse:!0},t);var e=this,i=t.success;return t.success=function(n){var r=t.parse?e.parse(n,t):n;return e.set(r,t)?(i&&i.call(t.context,e,n,t),void e.trigger("sync",e,n,t)):!1},R(this,t),this.sync("read",this,t)},save:function(t,e,i){var r;null==t||"object"==typeof t?(r=t,i=e):(r={})[t]=e,i=n.extend({validate:!0,parse:!0},i);var o=i.wait;if(r&&!o){if(!this.set(r,i))return!1}else if(!this._validate(r,i))return!1;var s=this,a=i.success,u=this.attributes;i.success=function(t){s.attributes=u;var e=i.parse?s.parse(t,i):t;return o&&(e=n.extend({},r,e)),e&&!s.set(e,i)?!1:(a&&a.call(i.context,s,t,i),void s.trigger("sync",s,t,i))},R(this,i),r&&o&&(this.attributes=n.extend({},u,r));var l=this.isNew()?"create":i.patch?"patch":"update";"patch"!==l||i.attrs||(i.attrs=r);var c=this.sync(l,this,i);return this.attributes=u,c},destroy:function(t){t=t?n.clone(t):{};var e=this,i=t.success,r=t.wait,o=function(){e.stopListening(),e.trigger("destroy",e,e.collection,t)};t.success=function(n){r&&o(),i&&i.call(t.context,e,n,t),e.isNew()||e.trigger("sync",e,n,t)};var s=!1;return this.isNew()?n.defer(t.success):(R(this,t),s=this.sync("delete",this,t)),r||o(),s},url:function(){var t=n.result(this,"urlRoot")||n.result(this.collection,"url")||q();if(this.isNew())return t;var e=this.get(this.idAttribute);return t.replace(/[^\/]$/,"$&/")+encodeURIComponent(e)},parse:function(t,e){return t},clone:function(){return new this.constructor(this.attributes)},isNew:function(){return!this.has(this.idAttribute)},isValid:function(t){return this._validate({},n.defaults({validate:!0},t))},_validate:function(t,e){if(!e.validate||!this.validate)return!0;t=n.extend({},this.attributes,t);var i=this.validationError=this.validate(t,e)||null;return i?(this.trigger("invalid",this,i,n.extend(e,{validationError:i})),!1):!0}});var x={keys:1,values:1,pairs:1,invert:1,pick:0,omit:0,chain:1,isEmpty:1};a(b,x,"attributes");var _=e.Collection=function(t,e){e||(e={}),e.model&&(this.model=e.model),void 0!==e.comparator&&(this.comparator=e.comparator),this._reset(),this.initialize.apply(this,arguments),t&&this.reset(t,n.extend({silent:!0},e))},w={add:!0,remove:!0,merge:!0},E={add:!0,remove:!1},k=function(t,e,n){n=Math.min(Math.max(n,0),t.length);for(var i=Array(t.length-n),r=e.length,o=0;o<i.length;o++)i[o]=t[o+n];for(o=0;r>o;o++)t[o+n]=e[o];for(o=0;o<i.length;o++)t[o+r+n]=i[o]};n.extend(_.prototype,c,{model:b,initialize:function(){},toJSON:function(t){return this.map(function(e){return e.toJSON(t)})},sync:function(){return e.sync.apply(this,arguments)},add:function(t,e){return this.set(t,n.extend({merge:!1},e,E))},remove:function(t,e){e=n.extend({},e);var i=!n.isArray(t);t=i?[t]:n.clone(t);var r=this._removeModels(t,e);return!e.silent&&r&&this.trigger("update",this,e),i?r[0]:r},set:function(t,e){if(null!=t){e=n.defaults({},e,w),e.parse&&!this._isModel(t)&&(t=this.parse(t,e));var i=!n.isArray(t);t=i?[t]:t.slice();var r=e.at;null!=r&&(r=+r),0>r&&(r+=this.length+1);for(var o,s=[],a=[],u=[],l={},c=e.add,h=e.merge,f=e.remove,d=!1,p=this.comparator&&null==r&&e.sort!==!1,g=n.isString(this.comparator)?this.comparator:null,v=0;v<t.length;v++){o=t[v];var m=this.get(o);if(m){if(h&&o!==m){var y=this._isModel(o)?o.attributes:o;e.parse&&(y=m.parse(y,e)),m.set(y,e),p&&!d&&(d=m.hasChanged(g))}l[m.cid]||(l[m.cid]=!0,s.push(m)),t[v]=m}else c&&(o=t[v]=this._prepareModel(o,e),o&&(a.push(o),this._addReference(o,e),l[o.cid]=!0,s.push(o)))}if(f){for(v=0;v<this.length;v++)o=this.models[v],l[o.cid]||u.push(o);u.length&&this._removeModels(u,e)}var b=!1,x=!p&&c&&f;if(s.length&&x?(b=this.length!=s.length||n.some(this.models,function(t,e){return t!==s[e]}),this.models.length=0,k(this.models,s,0),this.length=this.models.length):a.length&&(p&&(d=!0),k(this.models,a,null==r?this.length:r),this.length=this.models.length),d&&this.sort({silent:!0}),!e.silent){for(v=0;v<a.length;v++)null!=r&&(e.index=r+v),o=a[v],o.trigger("add",o,this,e);(d||b)&&this.trigger("sort",this,e),(a.length||u.length)&&this.trigger("update",this,e)}return i?t[0]:t}},reset:function(t,e){e=e?n.clone(e):{};for(var i=0;i<this.models.length;i++)this._removeReference(this.models[i],e);return e.previousModels=this.models,this._reset(),t=this.add(t,n.extend({silent:!0},e)),e.silent||this.trigger("reset",this,e),t},push:function(t,e){return this.add(t,n.extend({at:this.length},e))},pop:function(t){var e=this.at(this.length-1);return this.remove(e,t)},unshift:function(t,e){return this.add(t,n.extend({at:0},e))},shift:function(t){var e=this.at(0);return this.remove(e,t)},slice:function(){return o.apply(this.models,arguments)},get:function(t){if(null!=t){var e=this.modelId(this._isModel(t)?t.attributes:t);return this._byId[t]||this._byId[e]||this._byId[t.cid]}},at:function(t){return 0>t&&(t+=this.length),this.models[t]},where:function(t,e){return this[e?"find":"filter"](t)},findWhere:function(t){return this.where(t,!0)},sort:function(t){var e=this.comparator;if(!e)throw new Error("Cannot sort a set without a comparator");t||(t={});var i=e.length;return n.isFunction(e)&&(e=n.bind(e,this)),1===i||n.isString(e)?this.models=this.sortBy(e):this.models.sort(e),t.silent||this.trigger("sort",this,t),this},pluck:function(t){return n.invoke(this.models,"get",t)},fetch:function(t){t=n.extend({parse:!0},t);var e=t.success,i=this;return t.success=function(n){var r=t.reset?"reset":"set";i[r](n,t),e&&e.call(t.context,i,n,t),i.trigger("sync",i,n,t)},R(this,t),this.sync("read",this,t)},create:function(t,e){e=e?n.clone(e):{};var i=e.wait;if(t=this._prepareModel(t,e),!t)return!1;i||this.add(t,e);var r=this,o=e.success;return e.success=function(t,e,n){i&&r.add(t,n),o&&o.call(n.context,t,e,n)},t.save(null,e),t},parse:function(t,e){return t},clone:function(){return new this.constructor(this.models,{model:this.model,comparator:this.comparator})},modelId:function(t){return t[this.model.prototype.idAttribute||"id"]},_reset:function(){this.length=0,this.models=[],this._byId={}},_prepareModel:function(t,e){if(this._isModel(t))return t.collection||(t.collection=this),t;e=e?n.clone(e):{},e.collection=this;var i=new this.model(t,e);return i.validationError?(this.trigger("invalid",this,i.validationError,e),!1):i},_removeModels:function(t,e){for(var n=[],i=0;i<t.length;i++){var r=this.get(t[i]);if(r){var o=this.indexOf(r);this.models.splice(o,1),this.length--,e.silent||(e.index=o,r.trigger("remove",r,this,e)),n.push(r),this._removeReference(r,e)}}return n.length?n:!1},_isModel:function(t){return t instanceof b},_addReference:function(t,e){this._byId[t.cid]=t;var n=this.modelId(t.attributes);null!=n&&(this._byId[n]=t),t.on("all",this._onModelEvent,this)},_removeReference:function(t,e){delete this._byId[t.cid];var n=this.modelId(t.attributes);null!=n&&delete this._byId[n],this===t.collection&&delete t.collection,t.off("all",this._onModelEvent,this)},_onModelEvent:function(t,e,n,i){if("add"!==t&&"remove"!==t||n===this){if("destroy"===t&&this.remove(e,i),"change"===t){var r=this.modelId(e.previousAttributes()),o=this.modelId(e.attributes);r!==o&&(null!=r&&delete this._byId[r],null!=o&&(this._byId[o]=e))}this.trigger.apply(this,arguments)}}});var T={forEach:3,each:3,map:3,collect:3,reduce:4,foldl:4,inject:4,reduceRight:4,foldr:4,find:3,detect:3,filter:3,select:3,reject:3,every:3,all:3,some:3,any:3,include:3,includes:3,contains:3,invoke:0,max:3,min:3,toArray:1,size:1,first:3,head:3,take:3,initial:3,rest:3,tail:3,drop:3,last:3,without:0,difference:0,indexOf:3,shuffle:1,lastIndexOf:3,isEmpty:1,chain:1,sample:3,partition:3,groupBy:3,countBy:3,sortBy:3,indexBy:3};a(_,T,"models");var C=e.View=function(t){this.cid=n.uniqueId("view"),n.extend(this,n.pick(t,S)),this._ensureElement(),this.initialize.apply(this,arguments)},j=/^(\S+)\s*(.*)$/,S=["model","collection","el","id","attributes","className","tagName","events"];n.extend(C.prototype,c,{tagName:"div",$:function(t){return this.$el.find(t)},initialize:function(){},render:function(){return this},remove:function(){return this._removeElement(),this.stopListening(),this},_removeElement:function(){this.$el.remove()},setElement:function(t){return this.undelegateEvents(),this._setElement(t),this.delegateEvents(),this},_setElement:function(t){this.$el=t instanceof e.$?t:e.$(t),this.el=this.$el[0]},delegateEvents:function(t){if(t||(t=n.result(this,"events")),!t)return this;this.undelegateEvents();for(var e in t){var i=t[e];if(n.isFunction(i)||(i=this[i]),i){var r=e.match(j);this.delegate(r[1],r[2],n.bind(i,this))}}return this},delegate:function(t,e,n){return this.$el.on(t+".delegateEvents"+this.cid,e,n),this},undelegateEvents:function(){return this.$el&&this.$el.off(".delegateEvents"+this.cid),this},undelegate:function(t,e,n){return this.$el.off(t+".delegateEvents"+this.cid,e,n),this},_createElement:function(t){return document.createElement(t)},_ensureElement:function(){if(this.el)this.setElement(n.result(this,"el"));else{var t=n.extend({},n.result(this,"attributes"));this.id&&(t.id=n.result(this,"id")),this.className&&(t["class"]=n.result(this,"className")),this.setElement(this._createElement(n.result(this,"tagName"))),this._setAttributes(t)}},_setAttributes:function(t){this.$el.attr(t)}}),e.sync=function(t,i,r){var o=A[t];n.defaults(r||(r={}),{emulateHTTP:e.emulateHTTP,emulateJSON:e.emulateJSON});var s={type:o,dataType:"json"};if(r.url||(s.url=n.result(i,"url")||q()),null!=r.data||!i||"create"!==t&&"update"!==t&&"patch"!==t||(s.contentType="application/json",s.data=JSON.stringify(r.attrs||i.toJSON(r))),r.emulateJSON&&(s.contentType="application/x-www-form-urlencoded",s.data=s.data?{model:s.data}:{}),r.emulateHTTP&&("PUT"===o||"DELETE"===o||"PATCH"===o)){s.type="POST",r.emulateJSON&&(s.data._method=o);var a=r.beforeSend;r.beforeSend=function(t){return t.setRequestHeader("X-HTTP-Method-Override",o),a?a.apply(this,arguments):void 0}}"GET"===s.type||r.emulateJSON||(s.processData=!1);var u=r.error;r.error=function(t,e,n){r.textStatus=e,r.errorThrown=n,u&&u.call(r.context,t,e,n)};var l=r.xhr=e.ajax(n.extend(s,r));return i.trigger("request",i,l,r),l};var A={create:"POST",update:"PUT",patch:"PATCH","delete":"DELETE",read:"GET"};e.ajax=function(){return e.$.ajax.apply(e.$,arguments)};var M=e.Router=function(t){t||(t={}),t.routes&&(this.routes=t.routes),this._bindRoutes(),this.initialize.apply(this,arguments)},N=/\((.*?)\)/g,B=/(\(\?)?:\w+/g,O=/\*\w+/g,P=/[\-{}\[\]+?.,\\\^$|#\s]/g;n.extend(M.prototype,c,{initialize:function(){},route:function(t,i,r){n.isRegExp(t)||(t=this._routeToRegExp(t)),n.isFunction(i)&&(r=i,i=""),r||(r=this[i]);var o=this;return e.history.route(t,function(n){var s=o._extractParameters(t,n);o.execute(r,s,i)!==!1&&(o.trigger.apply(o,["route:"+i].concat(s)),o.trigger("route",i,s),e.history.trigger("route",o,i,s))}),this},execute:function(t,e,n){t&&t.apply(this,e)},navigate:function(t,n){return e.history.navigate(t,n),this},_bindRoutes:function(){if(this.routes){this.routes=n.result(this,"routes");for(var t,e=n.keys(this.routes);null!=(t=e.pop());)this.route(t,this.routes[t])}},_routeToRegExp:function(t){return t=t.replace(P,"\\$&").replace(N,"(?:$1)?").replace(B,function(t,e){return e?t:"([^/?]+)"}).replace(O,"([^?]*?)"),new RegExp("^"+t+"(?:\\?([\\s\\S]*))?$")},_extractParameters:function(t,e){var i=t.exec(e).slice(1);return n.map(i,function(t,e){return e===i.length-1?t||null:t?decodeURIComponent(t):null})}});var $=e.History=function(){this.handlers=[],this.checkUrl=n.bind(this.checkUrl,this),"undefined"!=typeof window&&(this.location=window.location,this.history=window.history)},D=/^[#\/]|\s+$/g,F=/^\/+|\/+$/g,H=/#.*$/;$.started=!1,n.extend($.prototype,c,{interval:50,atRoot:function(){var t=this.location.pathname.replace(/[^\/]$/,"$&/");return t===this.root&&!this.getSearch()},matchRoot:function(){var t=this.decodeFragment(this.location.pathname),e=t.slice(0,this.root.length-1)+"/";return e===this.root},decodeFragment:function(t){return decodeURI(t.replace(/%25/g,"%2525"))},getSearch:function(){var t=this.location.href.replace(/#.*/,"").match(/\?.+/);return t?t[0]:""},getHash:function(t){var e=(t||this).location.href.match(/#(.*)$/);return e?e[1]:""},getPath:function(){var t=this.decodeFragment(this.location.pathname+this.getSearch()).slice(this.root.length-1);return"/"===t.charAt(0)?t.slice(1):t},getFragment:function(t){return null==t&&(t=this._usePushState||!this._wantsHashChange?this.getPath():this.getHash()),t.replace(D,"")},start:function(t){if($.started)throw new Error("Backbone.history has already been started");if($.started=!0,this.options=n.extend({root:"/"},this.options,t),this.root=this.options.root,this._wantsHashChange=this.options.hashChange!==!1,this._hasHashChange="onhashchange"in window&&(void 0===document.documentMode||document.documentMode>7),this._useHashChange=this._wantsHashChange&&this._hasHashChange,this._wantsPushState=!!this.options.pushState,this._hasPushState=!(!this.history||!this.history.pushState),this._usePushState=this._wantsPushState&&this._hasPushState,this.fragment=this.getFragment(),this.root=("/"+this.root+"/").replace(F,"/"),this._wantsHashChange&&this._wantsPushState){if(!this._hasPushState&&!this.atRoot()){var e=this.root.slice(0,-1)||"/";return this.location.replace(e+"#"+this.getPath()),!0}this._hasPushState&&this.atRoot()&&this.navigate(this.getHash(),{replace:!0})}if(!this._hasHashChange&&this._wantsHashChange&&!this._usePushState){this.iframe=document.createElement("iframe"),this.iframe.src="javascript:0",this.iframe.style.display="none",this.iframe.tabIndex=-1;var i=document.body,r=i.insertBefore(this.iframe,i.firstChild).contentWindow;r.document.open(),r.document.close(),r.location.hash="#"+this.fragment}var o=window.addEventListener||function(t,e){return attachEvent("on"+t,e)};return this._usePushState?o("popstate",this.checkUrl,!1):this._useHashChange&&!this.iframe?o("hashchange",this.checkUrl,!1):this._wantsHashChange&&(this._checkUrlInterval=setInterval(this.checkUrl,this.interval)),this.options.silent?void 0:this.loadUrl()},stop:function(){var t=window.removeEventListener||function(t,e){return detachEvent("on"+t,e)};this._usePushState?t("popstate",this.checkUrl,!1):this._useHashChange&&!this.iframe&&t("hashchange",this.checkUrl,!1),this.iframe&&(document.body.removeChild(this.iframe),this.iframe=null),this._checkUrlInterval&&clearInterval(this._checkUrlInterval),$.started=!1},route:function(t,e){this.handlers.unshift({route:t,callback:e})},checkUrl:function(t){var e=this.getFragment();return e===this.fragment&&this.iframe&&(e=this.getHash(this.iframe.contentWindow)),e===this.fragment?!1:(this.iframe&&this.navigate(e),void this.loadUrl())},loadUrl:function(t){return this.matchRoot()?(t=this.fragment=this.getFragment(t),n.some(this.handlers,function(e){return e.route.test(t)?(e.callback(t),!0):void 0})):!1},navigate:function(t,e){
if(!$.started)return!1;e&&e!==!0||(e={trigger:!!e}),t=this.getFragment(t||"");var n=this.root;(""===t||"?"===t.charAt(0))&&(n=n.slice(0,-1)||"/");var i=n+t;if(t=this.decodeFragment(t.replace(H,"")),this.fragment!==t){if(this.fragment=t,this._usePushState)this.history[e.replace?"replaceState":"pushState"]({},document.title,i);else{if(!this._wantsHashChange)return this.location.assign(i);if(this._updateHash(this.location,t,e.replace),this.iframe&&t!==this.getHash(this.iframe.contentWindow)){var r=this.iframe.contentWindow;e.replace||(r.document.open(),r.document.close()),this._updateHash(r.location,t,e.replace)}}return e.trigger?this.loadUrl(t):void 0}},_updateHash:function(t,e,n){if(n){var i=t.href.replace(/(javascript:|#).*$/,"");t.replace(i+"#"+e)}else t.hash="#"+e}}),e.history=new $;var I=function(t,e){var i,r=this;i=t&&n.has(t,"constructor")?t.constructor:function(){return r.apply(this,arguments)},n.extend(i,r,e);var o=function(){this.constructor=i};return o.prototype=r.prototype,i.prototype=new o,t&&n.extend(i.prototype,t),i.__super__=r.prototype,i};b.extend=_.extend=M.extend=C.extend=$.extend=I;var q=function(){throw new Error('A "url" property or function must be specified')},R=function(t,e){var n=e.error;e.error=function(i){n&&n.call(e.context,t,i,e),t.trigger("error",t,i,e)}};return e})},"backbone-min":function(t,e,n,i){!function(t){var r="object"==typeof self&&self.self==self&&self||"object"==typeof i&&i.global==i&&i;if("function"==typeof define&&define.amd)define(["underscore","jquery","exports"],function(e,n,i){r.Backbone=t(r,i,e,n)});else if("undefined"!=typeof e){var o,s=n("underscore");try{o=n("jquery")}catch(a){}t(r,e,s,o)}else r.Backbone=t(r,{},r._,r.jQuery||r.Zepto||r.ender||r.$)}(function(t,e,n,i){var r=t.Backbone,o=Array.prototype.slice;e.VERSION="1.2.3",e.$=i,e.noConflict=function(){return t.Backbone=r,this},e.emulateHTTP=!1,e.emulateJSON=!1;var s=function(t,e,i){switch(t){case 1:return function(){return n[e](this[i])};case 2:return function(t){return n[e](this[i],t)};case 3:return function(t,r){return n[e](this[i],u(t,this),r)};case 4:return function(t,r,o){return n[e](this[i],u(t,this),r,o)};default:return function(){var t=o.call(arguments);return t.unshift(this[i]),n[e].apply(n,t)}}},a=function(t,e,i){n.each(e,function(e,r){n[r]&&(t.prototype[r]=s(e,r,i))})},u=function(t,e){return n.isFunction(t)?t:n.isObject(t)&&!e._isModel(t)?l(t):n.isString(t)?function(e){return e.get(t)}:t},l=function(t){var e=n.matches(t);return function(t){return e(t.attributes)}},c=e.Events={},h=/\s+/,f=function(t,e,i,r,o){var s,a=0;if(i&&"object"==typeof i){void 0!==r&&"context"in o&&void 0===o.context&&(o.context=r);for(s=n.keys(i);a<s.length;a++)e=f(t,e,s[a],i[s[a]],o)}else if(i&&h.test(i))for(s=i.split(h);a<s.length;a++)e=t(e,s[a],r,o);else e=t(e,i,r,o);return e};c.on=function(t,e,n){return d(this,t,e,n)};var d=function(t,e,n,i,r){if(t._events=f(p,t._events||{},e,n,{context:i,ctx:t,listening:r}),r){var o=t._listeners||(t._listeners={});o[r.id]=r}return t};c.listenTo=function(t,e,i){if(!t)return this;var r=t._listenId||(t._listenId=n.uniqueId("l")),o=this._listeningTo||(this._listeningTo={}),s=o[r];if(!s){var a=this._listenId||(this._listenId=n.uniqueId("l"));s=o[r]={obj:t,objId:r,id:a,listeningTo:o,count:0}}return d(t,e,i,this,s),this};var p=function(t,e,n,i){if(n){var r=t[e]||(t[e]=[]),o=i.context,s=i.ctx,a=i.listening;a&&a.count++,r.push({callback:n,context:o,ctx:o||s,listening:a})}return t};c.off=function(t,e,n){return this._events?(this._events=f(g,this._events,t,e,{context:n,listeners:this._listeners}),this):this},c.stopListening=function(t,e,i){var r=this._listeningTo;if(!r)return this;for(var o=t?[t._listenId]:n.keys(r),s=0;s<o.length;s++){var a=r[o[s]];if(!a)break;a.obj.off(e,i,this)}return n.isEmpty(r)&&(this._listeningTo=void 0),this};var g=function(t,e,i,r){if(t){var o,s=0,a=r.context,u=r.listeners;if(e||i||a){for(var l=e?[e]:n.keys(t);s<l.length;s++){e=l[s];var c=t[e];if(!c)break;for(var h=[],f=0;f<c.length;f++){var d=c[f];i&&i!==d.callback&&i!==d.callback._callback||a&&a!==d.context?h.push(d):(o=d.listening,o&&0===--o.count&&(delete u[o.id],delete o.listeningTo[o.objId]))}h.length?t[e]=h:delete t[e]}return n.size(t)?t:void 0}for(var p=n.keys(u);s<p.length;s++)o=u[p[s]],delete u[o.id],delete o.listeningTo[o.objId]}};c.once=function(t,e,i){var r=f(v,{},t,e,n.bind(this.off,this));return this.on(r,void 0,i)},c.listenToOnce=function(t,e,i){var r=f(v,{},e,i,n.bind(this.stopListening,this,t));return this.listenTo(t,r)};var v=function(t,e,i,r){if(i){var o=t[e]=n.once(function(){r(e,o),i.apply(this,arguments)});o._callback=i}return t};c.trigger=function(t){if(!this._events)return this;for(var e=Math.max(0,arguments.length-1),n=Array(e),i=0;e>i;i++)n[i]=arguments[i+1];return f(m,this._events,t,void 0,n),this};var m=function(t,e,n,i){if(t){var r=t[e],o=t.all;r&&o&&(o=o.slice()),r&&y(r,i),o&&y(o,[e].concat(i))}return t},y=function(t,e){var n,i=-1,r=t.length,o=e[0],s=e[1],a=e[2];switch(e.length){case 0:for(;++i<r;)(n=t[i]).callback.call(n.ctx);return;case 1:for(;++i<r;)(n=t[i]).callback.call(n.ctx,o);return;case 2:for(;++i<r;)(n=t[i]).callback.call(n.ctx,o,s);return;case 3:for(;++i<r;)(n=t[i]).callback.call(n.ctx,o,s,a);return;default:for(;++i<r;)(n=t[i]).callback.apply(n.ctx,e);return}};c.bind=c.on,c.unbind=c.off,n.extend(e,c);var b=e.Model=function(t,e){var i=t||{};e||(e={}),this.cid=n.uniqueId(this.cidPrefix),this.attributes={},e.collection&&(this.collection=e.collection),e.parse&&(i=this.parse(i,e)||{}),i=n.defaults({},i,n.result(this,"defaults")),this.set(i,e),this.changed={},this.initialize.apply(this,arguments)};n.extend(b.prototype,c,{changed:null,validationError:null,idAttribute:"id",cidPrefix:"c",initialize:function(){},toJSON:function(t){return n.clone(this.attributes)},sync:function(){return e.sync.apply(this,arguments)},get:function(t){return this.attributes[t]},escape:function(t){return n.escape(this.get(t))},has:function(t){return null!=this.get(t)},matches:function(t){return!!n.iteratee(t,this)(this.attributes)},set:function(t,e,i){if(null==t)return this;var r;if("object"==typeof t?(r=t,i=e):(r={})[t]=e,i||(i={}),!this._validate(r,i))return!1;var o=i.unset,s=i.silent,a=[],u=this._changing;this._changing=!0,u||(this._previousAttributes=n.clone(this.attributes),this.changed={});var l=this.attributes,c=this.changed,h=this._previousAttributes;for(var f in r)e=r[f],n.isEqual(l[f],e)||a.push(f),n.isEqual(h[f],e)?delete c[f]:c[f]=e,o?delete l[f]:l[f]=e;if(this.id=this.get(this.idAttribute),!s){a.length&&(this._pending=i);for(var d=0;d<a.length;d++)this.trigger("change:"+a[d],this,l[a[d]],i)}if(u)return this;if(!s)for(;this._pending;)i=this._pending,this._pending=!1,this.trigger("change",this,i);return this._pending=!1,this._changing=!1,this},unset:function(t,e){return this.set(t,void 0,n.extend({},e,{unset:!0}))},clear:function(t){var e={};for(var i in this.attributes)e[i]=void 0;return this.set(e,n.extend({},t,{unset:!0}))},hasChanged:function(t){return null==t?!n.isEmpty(this.changed):n.has(this.changed,t)},changedAttributes:function(t){if(!t)return this.hasChanged()?n.clone(this.changed):!1;var e=this._changing?this._previousAttributes:this.attributes,i={};for(var r in t){var o=t[r];n.isEqual(e[r],o)||(i[r]=o)}return n.size(i)?i:!1},previous:function(t){return null!=t&&this._previousAttributes?this._previousAttributes[t]:null},previousAttributes:function(){return n.clone(this._previousAttributes)},fetch:function(t){t=n.extend({parse:!0},t);var e=this,i=t.success;return t.success=function(n){var r=t.parse?e.parse(n,t):n;return e.set(r,t)?(i&&i.call(t.context,e,n,t),void e.trigger("sync",e,n,t)):!1},R(this,t),this.sync("read",this,t)},save:function(t,e,i){var r;null==t||"object"==typeof t?(r=t,i=e):(r={})[t]=e,i=n.extend({validate:!0,parse:!0},i);var o=i.wait;if(r&&!o){if(!this.set(r,i))return!1}else if(!this._validate(r,i))return!1;var s=this,a=i.success,u=this.attributes;i.success=function(t){s.attributes=u;var e=i.parse?s.parse(t,i):t;return o&&(e=n.extend({},r,e)),e&&!s.set(e,i)?!1:(a&&a.call(i.context,s,t,i),void s.trigger("sync",s,t,i))},R(this,i),r&&o&&(this.attributes=n.extend({},u,r));var l=this.isNew()?"create":i.patch?"patch":"update";"patch"!==l||i.attrs||(i.attrs=r);var c=this.sync(l,this,i);return this.attributes=u,c},destroy:function(t){t=t?n.clone(t):{};var e=this,i=t.success,r=t.wait,o=function(){e.stopListening(),e.trigger("destroy",e,e.collection,t)};t.success=function(n){r&&o(),i&&i.call(t.context,e,n,t),e.isNew()||e.trigger("sync",e,n,t)};var s=!1;return this.isNew()?n.defer(t.success):(R(this,t),s=this.sync("delete",this,t)),r||o(),s},url:function(){var t=n.result(this,"urlRoot")||n.result(this.collection,"url")||q();if(this.isNew())return t;var e=this.get(this.idAttribute);return t.replace(/[^\/]$/,"$&/")+encodeURIComponent(e)},parse:function(t,e){return t},clone:function(){return new this.constructor(this.attributes)},isNew:function(){return!this.has(this.idAttribute)},isValid:function(t){return this._validate({},n.defaults({validate:!0},t))},_validate:function(t,e){if(!e.validate||!this.validate)return!0;t=n.extend({},this.attributes,t);var i=this.validationError=this.validate(t,e)||null;return i?(this.trigger("invalid",this,i,n.extend(e,{validationError:i})),!1):!0}});var x={keys:1,values:1,pairs:1,invert:1,pick:0,omit:0,chain:1,isEmpty:1};a(b,x,"attributes");var _=e.Collection=function(t,e){e||(e={}),e.model&&(this.model=e.model),void 0!==e.comparator&&(this.comparator=e.comparator),this._reset(),this.initialize.apply(this,arguments),t&&this.reset(t,n.extend({silent:!0},e))},w={add:!0,remove:!0,merge:!0},E={add:!0,remove:!1},k=function(t,e,n){n=Math.min(Math.max(n,0),t.length);for(var i=Array(t.length-n),r=e.length,o=0;o<i.length;o++)i[o]=t[o+n];for(o=0;r>o;o++)t[o+n]=e[o];for(o=0;o<i.length;o++)t[o+r+n]=i[o]};n.extend(_.prototype,c,{model:b,initialize:function(){},toJSON:function(t){return this.map(function(e){return e.toJSON(t)})},sync:function(){return e.sync.apply(this,arguments)},add:function(t,e){return this.set(t,n.extend({merge:!1},e,E))},remove:function(t,e){e=n.extend({},e);var i=!n.isArray(t);t=i?[t]:n.clone(t);var r=this._removeModels(t,e);return!e.silent&&r&&this.trigger("update",this,e),i?r[0]:r},set:function(t,e){if(null!=t){e=n.defaults({},e,w),e.parse&&!this._isModel(t)&&(t=this.parse(t,e));var i=!n.isArray(t);t=i?[t]:t.slice();var r=e.at;null!=r&&(r=+r),0>r&&(r+=this.length+1);for(var o,s=[],a=[],u=[],l={},c=e.add,h=e.merge,f=e.remove,d=!1,p=this.comparator&&null==r&&e.sort!==!1,g=n.isString(this.comparator)?this.comparator:null,v=0;v<t.length;v++){o=t[v];var m=this.get(o);if(m){if(h&&o!==m){var y=this._isModel(o)?o.attributes:o;e.parse&&(y=m.parse(y,e)),m.set(y,e),p&&!d&&(d=m.hasChanged(g))}l[m.cid]||(l[m.cid]=!0,s.push(m)),t[v]=m}else c&&(o=t[v]=this._prepareModel(o,e),o&&(a.push(o),this._addReference(o,e),l[o.cid]=!0,s.push(o)))}if(f){for(v=0;v<this.length;v++)o=this.models[v],l[o.cid]||u.push(o);u.length&&this._removeModels(u,e)}var b=!1,x=!p&&c&&f;if(s.length&&x?(b=this.length!=s.length||n.some(this.models,function(t,e){return t!==s[e]}),this.models.length=0,k(this.models,s,0),this.length=this.models.length):a.length&&(p&&(d=!0),k(this.models,a,null==r?this.length:r),this.length=this.models.length),d&&this.sort({silent:!0}),!e.silent){for(v=0;v<a.length;v++)null!=r&&(e.index=r+v),o=a[v],o.trigger("add",o,this,e);(d||b)&&this.trigger("sort",this,e),(a.length||u.length)&&this.trigger("update",this,e)}return i?t[0]:t}},reset:function(t,e){e=e?n.clone(e):{};for(var i=0;i<this.models.length;i++)this._removeReference(this.models[i],e);return e.previousModels=this.models,this._reset(),t=this.add(t,n.extend({silent:!0},e)),e.silent||this.trigger("reset",this,e),t},push:function(t,e){return this.add(t,n.extend({at:this.length},e))},pop:function(t){var e=this.at(this.length-1);return this.remove(e,t)},unshift:function(t,e){return this.add(t,n.extend({at:0},e))},shift:function(t){var e=this.at(0);return this.remove(e,t)},slice:function(){return o.apply(this.models,arguments)},get:function(t){if(null!=t){var e=this.modelId(this._isModel(t)?t.attributes:t);return this._byId[t]||this._byId[e]||this._byId[t.cid]}},at:function(t){return 0>t&&(t+=this.length),this.models[t]},where:function(t,e){return this[e?"find":"filter"](t)},findWhere:function(t){return this.where(t,!0)},sort:function(t){var e=this.comparator;if(!e)throw new Error("Cannot sort a set without a comparator");t||(t={});var i=e.length;return n.isFunction(e)&&(e=n.bind(e,this)),1===i||n.isString(e)?this.models=this.sortBy(e):this.models.sort(e),t.silent||this.trigger("sort",this,t),this},pluck:function(t){return n.invoke(this.models,"get",t)},fetch:function(t){t=n.extend({parse:!0},t);var e=t.success,i=this;return t.success=function(n){var r=t.reset?"reset":"set";i[r](n,t),e&&e.call(t.context,i,n,t),i.trigger("sync",i,n,t)},R(this,t),this.sync("read",this,t)},create:function(t,e){e=e?n.clone(e):{};var i=e.wait;if(t=this._prepareModel(t,e),!t)return!1;i||this.add(t,e);var r=this,o=e.success;return e.success=function(t,e,n){i&&r.add(t,n),o&&o.call(n.context,t,e,n)},t.save(null,e),t},parse:function(t,e){return t},clone:function(){return new this.constructor(this.models,{model:this.model,comparator:this.comparator})},modelId:function(t){return t[this.model.prototype.idAttribute||"id"]},_reset:function(){this.length=0,this.models=[],this._byId={}},_prepareModel:function(t,e){if(this._isModel(t))return t.collection||(t.collection=this),t;e=e?n.clone(e):{},e.collection=this;var i=new this.model(t,e);return i.validationError?(this.trigger("invalid",this,i.validationError,e),!1):i},_removeModels:function(t,e){for(var n=[],i=0;i<t.length;i++){var r=this.get(t[i]);if(r){var o=this.indexOf(r);this.models.splice(o,1),this.length--,e.silent||(e.index=o,r.trigger("remove",r,this,e)),n.push(r),this._removeReference(r,e)}}return n.length?n:!1},_isModel:function(t){return t instanceof b},_addReference:function(t,e){this._byId[t.cid]=t;var n=this.modelId(t.attributes);null!=n&&(this._byId[n]=t),t.on("all",this._onModelEvent,this)},_removeReference:function(t,e){delete this._byId[t.cid];var n=this.modelId(t.attributes);null!=n&&delete this._byId[n],this===t.collection&&delete t.collection,t.off("all",this._onModelEvent,this)},_onModelEvent:function(t,e,n,i){if("add"!==t&&"remove"!==t||n===this){if("destroy"===t&&this.remove(e,i),"change"===t){var r=this.modelId(e.previousAttributes()),o=this.modelId(e.attributes);r!==o&&(null!=r&&delete this._byId[r],null!=o&&(this._byId[o]=e))}this.trigger.apply(this,arguments)}}});var T={forEach:3,each:3,map:3,collect:3,reduce:4,foldl:4,inject:4,reduceRight:4,foldr:4,find:3,detect:3,filter:3,select:3,reject:3,every:3,all:3,some:3,any:3,include:3,includes:3,contains:3,invoke:0,max:3,min:3,toArray:1,size:1,first:3,head:3,take:3,initial:3,rest:3,tail:3,drop:3,last:3,without:0,difference:0,indexOf:3,shuffle:1,lastIndexOf:3,isEmpty:1,chain:1,sample:3,partition:3,groupBy:3,countBy:3,sortBy:3,indexBy:3};a(_,T,"models");var C=e.View=function(t){this.cid=n.uniqueId("view"),n.extend(this,n.pick(t,S)),this._ensureElement(),this.initialize.apply(this,arguments)},j=/^(\S+)\s*(.*)$/,S=["model","collection","el","id","attributes","className","tagName","events"];n.extend(C.prototype,c,{tagName:"div",$:function(t){return this.$el.find(t)},initialize:function(){},render:function(){return this},remove:function(){return this._removeElement(),this.stopListening(),this},_removeElement:function(){this.$el.remove()},setElement:function(t){return this.undelegateEvents(),this._setElement(t),this.delegateEvents(),this},_setElement:function(t){this.$el=t instanceof e.$?t:e.$(t),this.el=this.$el[0]},delegateEvents:function(t){if(t||(t=n.result(this,"events")),!t)return this;this.undelegateEvents();for(var e in t){var i=t[e];if(n.isFunction(i)||(i=this[i]),i){var r=e.match(j);this.delegate(r[1],r[2],n.bind(i,this))}}return this},delegate:function(t,e,n){return this.$el.on(t+".delegateEvents"+this.cid,e,n),this},undelegateEvents:function(){return this.$el&&this.$el.off(".delegateEvents"+this.cid),this},undelegate:function(t,e,n){return this.$el.off(t+".delegateEvents"+this.cid,e,n),this},_createElement:function(t){return document.createElement(t)},_ensureElement:function(){if(this.el)this.setElement(n.result(this,"el"));else{var t=n.extend({},n.result(this,"attributes"));this.id&&(t.id=n.result(this,"id")),this.className&&(t["class"]=n.result(this,"className")),this.setElement(this._createElement(n.result(this,"tagName"))),this._setAttributes(t)}},_setAttributes:function(t){this.$el.attr(t)}}),e.sync=function(t,i,r){var o=A[t];n.defaults(r||(r={}),{emulateHTTP:e.emulateHTTP,emulateJSON:e.emulateJSON});var s={type:o,dataType:"json"};if(r.url||(s.url=n.result(i,"url")||q()),null!=r.data||!i||"create"!==t&&"update"!==t&&"patch"!==t||(s.contentType="application/json",s.data=JSON.stringify(r.attrs||i.toJSON(r))),r.emulateJSON&&(s.contentType="application/x-www-form-urlencoded",s.data=s.data?{model:s.data}:{}),r.emulateHTTP&&("PUT"===o||"DELETE"===o||"PATCH"===o)){s.type="POST",r.emulateJSON&&(s.data._method=o);var a=r.beforeSend;r.beforeSend=function(t){return t.setRequestHeader("X-HTTP-Method-Override",o),a?a.apply(this,arguments):void 0}}"GET"===s.type||r.emulateJSON||(s.processData=!1);var u=r.error;r.error=function(t,e,n){r.textStatus=e,r.errorThrown=n,u&&u.call(r.context,t,e,n)};var l=r.xhr=e.ajax(n.extend(s,r));return i.trigger("request",i,l,r),l};var A={create:"POST",update:"PUT",patch:"PATCH","delete":"DELETE",read:"GET"};e.ajax=function(){return e.$.ajax.apply(e.$,arguments)};var M=e.Router=function(t){t||(t={}),t.routes&&(this.routes=t.routes),this._bindRoutes(),this.initialize.apply(this,arguments)},N=/\((.*?)\)/g,B=/(\(\?)?:\w+/g,O=/\*\w+/g,P=/[\-{}\[\]+?.,\\\^$|#\s]/g;n.extend(M.prototype,c,{initialize:function(){},route:function(t,i,r){n.isRegExp(t)||(t=this._routeToRegExp(t)),n.isFunction(i)&&(r=i,i=""),r||(r=this[i]);var o=this;return e.history.route(t,function(n){var s=o._extractParameters(t,n);o.execute(r,s,i)!==!1&&(o.trigger.apply(o,["route:"+i].concat(s)),o.trigger("route",i,s),e.history.trigger("route",o,i,s))}),this},execute:function(t,e,n){t&&t.apply(this,e)},navigate:function(t,n){return e.history.navigate(t,n),this},_bindRoutes:function(){if(this.routes){this.routes=n.result(this,"routes");for(var t,e=n.keys(this.routes);null!=(t=e.pop());)this.route(t,this.routes[t])}},_routeToRegExp:function(t){return t=t.replace(P,"\\$&").replace(N,"(?:$1)?").replace(B,function(t,e){return e?t:"([^/?]+)"}).replace(O,"([^?]*?)"),new RegExp("^"+t+"(?:\\?([\\s\\S]*))?$")},_extractParameters:function(t,e){var i=t.exec(e).slice(1);return n.map(i,function(t,e){return e===i.length-1?t||null:t?decodeURIComponent(t):null})}});var $=e.History=function(){this.handlers=[],this.checkUrl=n.bind(this.checkUrl,this),"undefined"!=typeof window&&(this.location=window.location,this.history=window.history)},D=/^[#\/]|\s+$/g,F=/^\/+|\/+$/g,H=/#.*$/;$.started=!1,n.extend($.prototype,c,{interval:50,atRoot:function(){var t=this.location.pathname.replace(/[^\/]$/,"$&/");return t===this.root&&!this.getSearch()},matchRoot:function(){var t=this.decodeFragment(this.location.pathname),e=t.slice(0,this.root.length-1)+"/";return e===this.root},decodeFragment:function(t){return decodeURI(t.replace(/%25/g,"%2525"))},getSearch:function(){var t=this.location.href.replace(/#.*/,"").match(/\?.+/);return t?t[0]:""},getHash:function(t){var e=(t||this).location.href.match(/#(.*)$/);return e?e[1]:""},getPath:function(){var t=this.decodeFragment(this.location.pathname+this.getSearch()).slice(this.root.length-1);return"/"===t.charAt(0)?t.slice(1):t},getFragment:function(t){return null==t&&(t=this._usePushState||!this._wantsHashChange?this.getPath():this.getHash()),t.replace(D,"")},start:function(t){if($.started)throw new Error("Backbone.history has already been started");if($.started=!0,this.options=n.extend({root:"/"},this.options,t),this.root=this.options.root,this._wantsHashChange=this.options.hashChange!==!1,this._hasHashChange="onhashchange"in window&&(void 0===document.documentMode||document.documentMode>7),this._useHashChange=this._wantsHashChange&&this._hasHashChange,this._wantsPushState=!!this.options.pushState,this._hasPushState=!(!this.history||!this.history.pushState),this._usePushState=this._wantsPushState&&this._hasPushState,this.fragment=this.getFragment(),this.root=("/"+this.root+"/").replace(F,"/"),this._wantsHashChange&&this._wantsPushState){if(!this._hasPushState&&!this.atRoot()){var e=this.root.slice(0,-1)||"/";return this.location.replace(e+"#"+this.getPath()),!0}this._hasPushState&&this.atRoot()&&this.navigate(this.getHash(),{replace:!0})}if(!this._hasHashChange&&this._wantsHashChange&&!this._usePushState){this.iframe=document.createElement("iframe"),this.iframe.src="javascript:0",this.iframe.style.display="none",this.iframe.tabIndex=-1;var i=document.body,r=i.insertBefore(this.iframe,i.firstChild).contentWindow;r.document.open(),r.document.close(),r.location.hash="#"+this.fragment}var o=window.addEventListener||function(t,e){return attachEvent("on"+t,e)};return this._usePushState?o("popstate",this.checkUrl,!1):this._useHashChange&&!this.iframe?o("hashchange",this.checkUrl,!1):this._wantsHashChange&&(this._checkUrlInterval=setInterval(this.checkUrl,this.interval)),this.options.silent?void 0:this.loadUrl()},stop:function(){var t=window.removeEventListener||function(t,e){return detachEvent("on"+t,e)};this._usePushState?t("popstate",this.checkUrl,!1):this._useHashChange&&!this.iframe&&t("hashchange",this.checkUrl,!1),this.iframe&&(document.body.removeChild(this.iframe),this.iframe=null),this._checkUrlInterval&&clearInterval(this._checkUrlInterval),$.started=!1},route:function(t,e){this.handlers.unshift({route:t,callback:e})},checkUrl:function(t){var e=this.getFragment();return e===this.fragment&&this.iframe&&(e=this.getHash(this.iframe.contentWindow)),e===this.fragment?!1:(this.iframe&&this.navigate(e),void this.loadUrl())},loadUrl:function(t){return this.matchRoot()?(t=this.fragment=this.getFragment(t),n.some(this.handlers,function(e){return e.route.test(t)?(e.callback(t),!0):void 0})):!1},navigate:function(t,e){if(!$.started)return!1;e&&e!==!0||(e={trigger:!!e}),t=this.getFragment(t||"");var n=this.root;(""===t||"?"===t.charAt(0))&&(n=n.slice(0,-1)||"/");var i=n+t;if(t=this.decodeFragment(t.replace(H,"")),this.fragment!==t){if(this.fragment=t,this._usePushState)this.history[e.replace?"replaceState":"pushState"]({},document.title,i);else{if(!this._wantsHashChange)return this.location.assign(i);if(this._updateHash(this.location,t,e.replace),this.iframe&&t!==this.getHash(this.iframe.contentWindow)){var r=this.iframe.contentWindow;e.replace||(r.document.open(),r.document.close()),this._updateHash(r.location,t,e.replace)}}return e.trigger?this.loadUrl(t):void 0}},_updateHash:function(t,e,n){if(n){var i=t.href.replace(/(javascript:|#).*$/,"");t.replace(i+"#"+e)}else t.hash="#"+e}}),e.history=new $;var I=function(t,e){var i,r=this;i=t&&n.has(t,"constructor")?t.constructor:function(){return r.apply(this,arguments)},n.extend(i,r,e);var o=function(){this.constructor=i};return o.prototype=r.prototype,i.prototype=new o,t&&n.extend(i.prototype,t),i.__super__=r.prototype,i};b.extend=_.extend=M.extend=C.extend=$.extend=I;var q=function(){throw new Error('A "url" property or function must be specified')},R=function(t,e){var n=e.error;e.error=function(i){n&&n.call(e.context,t,i,e),t.trigger("error",t,i,e)}};return e})}},"backbone"),r.createPackage("backbone.modelbinder",{"Backbone.ModelBinder":function(t,e,n,i){!function(e){"function"==typeof define&&define.amd?define(["underscore","jquery","backbone"],e):"undefined"!=typeof t&&t.exports?t.exports=e(n("underscore"),n("jquery"),n("backbone")):e(_,jQuery,Backbone)}(function(t,e,n){if(!n)throw"Please include Backbone.js before Backbone.ModelBinder.js";return n.ModelBinder=function(){t.bindAll.apply(t,[this].concat(t.functions(this)))},n.ModelBinder.SetOptions=function(t){n.ModelBinder.options=t},n.ModelBinder.VERSION="1.1.0",n.ModelBinder.Constants={},n.ModelBinder.Constants.ModelToView="ModelToView",n.ModelBinder.Constants.ViewToModel="ViewToModel",t.extend(n.ModelBinder.prototype,{bind:function(t,n,i,r){this.unbind(),this._model=t,this._rootEl=n,this._setOptions(r),this._model||this._throwException("model must be specified"),this._rootEl||this._throwException("rootEl must be specified"),i?(this._attributeBindings=e.extend(!0,{},i),this._initializeAttributeBindings(),this._initializeElBindings()):this._initializeDefaultBindings(),this._bindModelToView(),this._bindViewToModel()},bindCustomTriggers:function(t,e,n,i,r){this._triggers=n,this.bind(t,e,i,r)},unbind:function(){this._unbindModelToView(),this._unbindViewToModel(),this._attributeBindings&&(delete this._attributeBindings,this._attributeBindings=void 0)},_setOptions:function(e){this._options=t.extend({boundAttribute:"name"},n.ModelBinder.options,e),this._options.modelSetOptions||(this._options.modelSetOptions={}),this._options.modelSetOptions.changeSource="ModelBinder",this._options.changeTriggers||(this._options.changeTriggers={"":"change","[contenteditable]":"blur"}),this._options.initialCopyDirection||(this._options.initialCopyDirection=n.ModelBinder.Constants.ModelToView)},_initializeAttributeBindings:function(){var e,n,i,r,o;for(e in this._attributeBindings){for(n=this._attributeBindings[e],t.isString(n)?i={elementBindings:[{selector:n}]}:t.isArray(n)?i={elementBindings:n}:t.isObject(n)?i={elementBindings:[n]}:this._throwException("Unsupported type passed to Model Binder "+i),r=0;r<i.elementBindings.length;r++)o=i.elementBindings[r],o.attributeBinding=i;i.attributeName=e,this._attributeBindings[e]=i}},_initializeDefaultBindings:function(){var t,n,i,r,o;for(this._attributeBindings={},n=e("["+this._options.boundAttribute+"]",this._rootEl),t=0;t<n.length;t++)i=n[t],r=e(i).attr(this._options.boundAttribute),this._attributeBindings[r]?this._attributeBindings[r].elementBindings.push({attributeBinding:this._attributeBindings[r],boundEls:[i]}):(o={attributeName:r},o.elementBindings=[{attributeBinding:o,boundEls:[i]}],this._attributeBindings[r]=o)},_initializeElBindings:function(){var t,n,i,r,o,s,a;for(t in this._attributeBindings)for(n=this._attributeBindings[t],i=0;i<n.elementBindings.length;i++)if(r=n.elementBindings[i],o=""===r.selector?e(this._rootEl):e(r.selector,this._rootEl),0===o.length)this._throwException("Bad binding found. No elements returned for binding selector "+r.selector);else for(r.boundEls=[],s=0;s<o.length;s++)a=o[s],r.boundEls.push(a)},_bindModelToView:function(){this._model.on("change",this._onModelChange,this),this._options.initialCopyDirection===n.ModelBinder.Constants.ModelToView&&this.copyModelAttributesToView()},copyModelAttributesToView:function(e){var n,i;for(n in this._attributeBindings)(void 0===e||-1!==t.indexOf(e,n))&&(i=this._attributeBindings[n],this._copyModelToView(i))},copyViewValuesToModel:function(){var t,n,i,r,o,s;for(t in this._attributeBindings)for(n=this._attributeBindings[t],i=0;i<n.elementBindings.length;i++)if(r=n.elementBindings[i],this._isBindingUserEditable(r))if(this._isBindingRadioGroup(r))s=this._getRadioButtonGroupCheckedEl(r),s&&this._copyViewToModel(r,s);else for(o=0;o<r.boundEls.length;o++)s=e(r.boundEls[o]),this._isElUserEditable(s)&&this._copyViewToModel(r,s)},_unbindModelToView:function(){this._model&&(this._model.off("change",this._onModelChange),this._model=void 0)},_bindViewToModel:function(){t.each(this._options.changeTriggers,function(t,n){e(this._rootEl).on(t,n,this._onElChanged)},this),this._options.initialCopyDirection===n.ModelBinder.Constants.ViewToModel&&this.copyViewValuesToModel()},_unbindViewToModel:function(){this._options&&this._options.changeTriggers&&t.each(this._options.changeTriggers,function(t,n){e(this._rootEl).off(t,n,this._onElChanged)},this)},_onElChanged:function(t){var n,i,r,o;for(n=e(t.target)[0],i=this._getElBindings(n),r=0;r<i.length;r++)o=i[r],this._isBindingUserEditable(o)&&this._copyViewToModel(o,n)},_isBindingUserEditable:function(t){return void 0===t.elAttribute||"text"===t.elAttribute||"html"===t.elAttribute},_isElUserEditable:function(t){var e=t.attr("contenteditable");return e||t.is("input")||t.is("select")||t.is("textarea")},_isBindingRadioGroup:function(t){var n,i,r=t.boundEls.length>0;for(n=0;n<t.boundEls.length;n++)if(i=e(t.boundEls[n]),"radio"!==i.attr("type")){r=!1;break}return r},_getRadioButtonGroupCheckedEl:function(t){var n,i;for(n=0;n<t.boundEls.length;n++)if(i=e(t.boundEls[n]),"radio"===i.attr("type")&&i.prop("checked"))return i},_getElBindings:function(t){var e,n,i,r,o,s,a=[];for(e in this._attributeBindings)for(n=this._attributeBindings[e],i=0;i<n.elementBindings.length;i++)for(r=n.elementBindings[i],o=0;o<r.boundEls.length;o++)s=r.boundEls[o],s===t&&a.push(r);return a},_onModelChange:function(){var t,e;for(t in this._model.changedAttributes())e=this._attributeBindings[t],e&&this._copyModelToView(e)},_copyModelToView:function(t){var i,r,o,s,a,u;for(a=this._model.get(t.attributeName),i=0;i<t.elementBindings.length;i++)for(r=t.elementBindings[i],o=0;o<r.boundEls.length;o++)s=r.boundEls[o],s._isSetting||(u=this._getConvertedValue(n.ModelBinder.Constants.ModelToView,r,a),this._setEl(e(s),r,u))},_setEl:function(t,e,n){e.elAttribute?this._setElAttribute(t,e,n):this._setElValue(t,n)},_setElAttribute:function(e,i,r){switch(i.elAttribute){case"html":e.html(r);break;case"text":e.text(r);break;case"enabled":e.prop("disabled",!r);break;case"displayed":e[r?"show":"hide"]();break;case"hidden":e[r?"hide":"show"]();break;case"css":e.css(i.cssAttribute,r);break;case"class":var o=this._model.previous(i.attributeBinding.attributeName),s=this._model.get(i.attributeBinding.attributeName);t.isUndefined(o)&&t.isUndefined(s)||(o=this._getConvertedValue(n.ModelBinder.Constants.ModelToView,i,o),e.removeClass(o)),r&&e.addClass(r);break;default:e.attr(i.elAttribute,r)}},_setElValue:function(t,e){if(t.attr("type"))switch(t.attr("type")){case"radio":t.prop("checked",t.val()===e);break;case"checkbox":t.prop("checked",!!e);break;case"file":break;default:t.val(e)}else t.is("input")||t.is("select")||t.is("textarea")?t.val(e||(0===e?"0":"")):t.text(e||(0===e?"0":""))},_copyViewToModel:function(t,i){var r,o,s;i._isSetting||(i._isSetting=!0,r=this._setModel(t,e(i)),i._isSetting=!1,r&&t.converter&&(o=this._model.get(t.attributeBinding.attributeName),s=this._getConvertedValue(n.ModelBinder.Constants.ModelToView,t,o),this._setEl(e(i),t,s)))},_getElValue:function(t,e){switch(e.attr("type")){case"checkbox":return e.prop("checked")?!0:!1;default:return void 0!==e.attr("contenteditable")?e.html():e.val()}},_setModel:function(t,e){var i={},r=this._getElValue(t,e);return r=this._getConvertedValue(n.ModelBinder.Constants.ViewToModel,t,r),i[t.attributeBinding.attributeName]=r,this._model.set(i,this._options.modelSetOptions)},_getConvertedValue:function(t,e,n){return e.converter?n=e.converter(t,n,e.attributeBinding.attributeName,this._model,e.boundEls):this._options.converter&&(n=this._options.converter(t,n,e.attributeBinding.attributeName,this._model,e.boundEls)),n},_throwException:function(t){if(!this._options.suppressThrows)throw t;"undefined"!=typeof console&&console.error&&console.error(t)}}),n.ModelBinder.CollectionConverter=function(e){if(this._collection=e,!this._collection)throw"Collection must be defined";t.bindAll(this,"convert")},t.extend(n.ModelBinder.CollectionConverter.prototype,{convert:function(t,e){return t===n.ModelBinder.Constants.ModelToView?e?e.id:void 0:this._collection.get(e)}}),n.ModelBinder.createDefaultBindings=function(t,n,i,r){var o,s,a,u,l={};for(o=e("["+n+"]",t),s=0;s<o.length;s++)if(a=o[s],u=e(a).attr(n),!l[u]){var c={selector:"["+n+'="'+u+'"]'};l[u]=c,i&&(l[u].converter=i),r&&(l[u].elAttribute=r)}return l},n.ModelBinder.combineBindings=function(e,n){return t.each(n,function(t,n){var i={selector:t.selector};t.converter&&(i.converter=t.converter),
t.elAttribute&&(i.elAttribute=t.elAttribute),e[n]?e[n]=[e[n],i]:e[n]=i}),e},n.ModelBinder})},"Backbone.CollectionBinder":function(t,e,n,i){!function(e){"function"==typeof define&&define.amd?define(["underscore","jquery","backbone","Backbone.ModelBinder"],e):"undefined"!=typeof t&&t.exports?t.exports=e(n("underscore"),n("jquery"),n("backbone")):e(_,o,Backbone)}(function(t,e,n){if(!n)throw"Please include Backbone.js before Backbone.ModelBinder.js";if(!n.ModelBinder)throw"Please include Backbone.ModelBinder.js before Backbone.CollectionBinder.js";n.CollectionBinder=function(e,i){if(t.bindAll.apply(t,[this].concat(t.functions(this))),this._elManagers={},this._elManagerFactory=e,!this._elManagerFactory)throw"elManagerFactory must be defined.";this._elManagerFactory.trigger=this.trigger,this._options=t.extend({},n.CollectionBinder.options,i)},n.CollectionBinder.SetOptions=function(t){n.CollectionBinder.options=t},n.CollectionBinder.VERSION="1.1.0",t.extend(n.CollectionBinder.prototype,n.Events,{bind:function(t,e){if(this.unbind(),!t)throw"collection must be defined";if(!e)throw"parentEl must be defined";this._collection=t,this._elManagerFactory._setParentEl(e),this._onCollectionReset(),this._collection.on("add",this._onCollectionAdd,this),this._collection.on("remove",this._onCollectionRemove,this),this._collection.on("reset",this._onCollectionReset,this),this._collection.on("sort",this._onCollectionSort,this)},unbind:function(){void 0!==this._collection&&(this._collection.off("add",this._onCollectionAdd),this._collection.off("remove",this._onCollectionRemove),this._collection.off("reset",this._onCollectionReset),this._collection.off("sort",this._onCollectionSort)),this._removeAllElManagers()},getManagerForEl:function(e){var n,i,r=t.values(this._elManagers);for(n=0;n<r.length;n++)if(i=r[n],i.isElContained(e))return i},getManagerForModel:function(e){return this._elManagers[t.isObject(e)?e.cid:e]},_onCollectionAdd:function(t,e,n){var i=this._elManagers[t.cid]=this._elManagerFactory.makeElManager(t);i.createEl();var r=n&&n.at;this._options.autoSort&&null!=r&&r<this._collection.length-1&&this._moveElToPosition(i.getEl(),r)},_onCollectionRemove:function(t){this._removeElManager(t)},_onCollectionReset:function(){this._removeAllElManagers(),this._collection.each(function(t){this._onCollectionAdd(t)},this),this.trigger("elsReset",this._collection)},_onCollectionSort:function(){this._options.autoSort&&this.sortRootEls()},_removeAllElManagers:function(){t.each(this._elManagers,function(t){t.removeEl(),delete this._elManagers[t._model.cid]},this),delete this._elManagers,this._elManagers={}},_removeElManager:function(t){void 0!==this._elManagers[t.cid]&&(this._elManagers[t.cid].removeEl(),delete this._elManagers[t.cid])},_moveElToPosition:function(t,e){var n=this._collection.at(e+1);if(n){var i=this.getManagerForModel(n);if(i){var r=i.getEl();r&&(t.detach(),t.insertBefore(r))}}},sortRootEls:function(){this._collection.each(function(t,n){var i=this.getManagerForModel(t);if(i){var r=i.getEl(),o=e(this._elManagerFactory._getParentEl()).children();o[n]!==r[0]&&(r.detach(),r.insertBefore(o[n]))}},this)}}),n.CollectionBinder.ElManagerFactory=function(e,n){if(t.bindAll.apply(t,[this].concat(t.functions(this))),this._elHtml=e,this._bindings=n,!t.isFunction(this._elHtml)&&!t.isString(this._elHtml))throw"elHtml must be a compliled template or an html string"},t.extend(n.CollectionBinder.ElManagerFactory.prototype,{_setParentEl:function(t){this._parentEl=t},_getParentEl:function(){return this._parentEl},makeElManager:function(i){var r={_model:i,createEl:function(){if(this._el=e(t.isFunction(this._elHtml)?this._elHtml({model:this._model.toJSON()}):this._elHtml),e(this._parentEl).append(this._el),this._bindings)if(t.isString(this._bindings))this._modelBinder=new n.ModelBinder,this._modelBinder.bind(this._model,this._el,n.ModelBinder.createDefaultBindings(this._el,this._bindings));else{if(!t.isObject(this._bindings))throw"Unsupported bindings type, please use a boolean or a bindings hash";this._modelBinder=new n.ModelBinder,this._modelBinder.bind(this._model,this._el,this._bindings)}this.trigger("elCreated",this._model,this._el)},removeEl:function(){void 0!==this._modelBinder&&this._modelBinder.unbind(),this._el.remove(),this.trigger("elRemoved",this._model,this._el)},isElContained:function(t){return this._el===t||e(this._el).has(t).length>0},getModel:function(){return this._model},getEl:function(){return this._el}};return t.extend(r,this),r}}),n.CollectionBinder.ViewManagerFactory=function(e){if(t.bindAll.apply(t,[this].concat(t.functions(this))),this._viewCreator=e,!t.isFunction(this._viewCreator))throw"viewCreator must be a valid function that accepts a model and returns a backbone view"},t.extend(n.CollectionBinder.ViewManagerFactory.prototype,{_setParentEl:function(t){this._parentEl=t},_getParentEl:function(){return this._parentEl},makeElManager:function(n){var i={_model:n,createEl:function(){this._view=this._viewCreator(n),this._view.render(this._model),e(this._parentEl).append(this._view.el),this.trigger("elCreated",this._model,this._view)},removeEl:function(){void 0!==this._view.close?this._view.close():(this._view.$el.remove(),console&&console.log&&console.log("warning, you should implement a close() function for your view, you might end up with zombies")),this.trigger("elRemoved",this._model,this._view)},isElContained:function(t){return this._view.el===t||this._view.$el.has(t).length>0},getModel:function(){return this._model},getView:function(){return this._view},getEl:function(){return this._view.$el}};return t.extend(i,this),i}})})}},"Backbone.ModelBinder"),r.createPackage("backbone.epoxy",{"backbone.epoxy":function(t,e,n,i){!function(i,r){"undefined"!=typeof e?t.exports=r(n("underscore"),n("backbone")):"function"==typeof define&&define.amd?define(["underscore","backbone"],r):r(i._,i.Backbone)}(this,function(t,e){function n(t,e,n){return t._super.prototype[e].apply(t,n)}function i(e,n,r,o){for(var s in n)if(n.hasOwnProperty(s)){var a=n[s];if(e.hasComputed(s)){if(o.length&&t.contains(o,s))throw"Recursive setter: "+o.join(" > ");a=e.c()[s].set(a),a&&_(a)&&(r=i(e,a,r,o.concat(s)))}else r[s]=a}return r}function r(e,n,i,r){i=i||{},i.get&&x(i.get)&&(i._get=i.get),i.set&&x(i.set)&&(i._set=i.set),delete i.get,delete i.set,t.extend(this,i),this.model=e,this.name=n,this.deps=this.deps||[],r||this.init()}function o(e){return x(e)?e():(_(e)&&(e=t.clone(e),t.each(e,function(t,n){e[n]=o(t)})),e)}function s(t){return x(t)?{set:t}:t}function a(e){return function(){var n=arguments,i=x(e)?e:e.get,r=e.set;return function(e){return b(e)?i.apply(this,t.map(n,o)):n[0]((r?r:i).call(this,e))}}}function u(e,n,i,r,o){if(e=t.result(e,r)){if(E(e)){o=o?o+"_":"",n["$"+r]=function(){return O&&O.push([e,"change"]),e};var s=t.extend({},e.attributes,t.isFunction(e.c)?e.c():{});t.each(s,function(t,r){n[o+r]=function(t){return l(e,r,t,i)}})}else k(e)&&(n["$"+r]=function(){return O&&O.push([e,"reset add remove sort update"]),e});return e}}function l(e,n,i,r){if(O&&O.push([e,"change:"+n]),!b(i)){if(!_(i)||w(i)||t.isDate(i)){var o=i;i={},i[n]=o}return r&&r.save?e.save(i,r):e.set(i,r)}return e.get(n)}function c(t,e){if(":el"===e||":scope"===e)return t.$el;var n=t.$(e);return t.$el.is(e)&&(n=n.add(t.$el)),n}function h(e,n,i,r,o,s){try{var a=A[i]||(A[i]=new Function("$f","$c","with($f){with($c){return{"+i+"}}}")),u=a(s,r)}catch(l){throw'Error parsing bindings: "'+i+'"\n>> '+l}var c=t.map(t.union(u.events||[],["change"]),function(t){return t+".epoxy"}).join(" ");t.each(u,function(t,i){if(o.hasOwnProperty(i))e.b().push(new g(e,n,o[i],t,c,r,u));else if(!B.hasOwnProperty(i))throw'binding handler "'+i+'" is not defined.'})}function f(t,e,n){return t&&t.hasOwnProperty(e)?b(n)?o(t[e]):t[e](n):void 0}function d(t,e){var n=[];if(e&&t)for(var i=0,r=e.length;r>i;i++)n.push(e[i]in t?t[e[i]]():null);return n}function p(t){var e=[];for(var n in t){var i=t[n];_(i)&&(i="{"+p(i)+"}"),$.test(n)||D.test(n)||(n='"'+n+'"'),e.push(n+":"+i)}return e.join(",")}function g(e,n,i,r,s,a,u){var l=this,c=n[0].tagName.toLowerCase(),h="input"==c||"select"==c||"textarea"==c||"true"==n.prop("contenteditable"),f=[],d=function(t){l.$el&&l.set(l.$el,o(r),t)};if(l.view=e,l.$el=n,l.evt=s,t.extend(l,i),r=l.init(l.$el,o(r),a,u)||r,O=f,d(),O=null,h&&i.get&&x(r)&&l.$el.on(s,function(t){r(l.get(l.$el,o(r),t))}),f.length)for(var p=0,g=f.length;g>p;p++)l.listenTo(f[p][0],f[p][1],d)}var v,m=e.Epoxy={},y=Array.prototype,b=t.isUndefined,x=t.isFunction,_=t.isObject,w=t.isArray,E=function(t){return t instanceof e.Model},k=function(t){return t instanceof e.Collection},T=function(){},C={mixin:function(t){t=t||{};for(var e in this.prototype)"bindings"===e&&t.bindings||this.prototype.hasOwnProperty(e)&&"constructor"!==e&&(t[e]=this.prototype[e]);return t}},j=["computeds"];m.Model=e.Model.extend({_super:e.Model,constructor:function(e,i){t.extend(this,t.pick(i||{},j)),n(this,"constructor",arguments),this.initComputeds(this.attributes,i)},getCopy:function(e){return t.clone(this.get(e))},get:function(t){return v&&v.push(["change:"+t,this]),this.hasComputed(t)?this.c()[t].get():n(this,"get",arguments)},set:function(e,r,o){var s=e;s&&!_(s)?(s={},s[e]=r):o=r,o=o||{};var a=this._setting=[];o.unset||(s=i(this,s,{},[])),delete this._setting;var u=n(this,"set",[s,o]);return o.silent||(!this.hasChanged()&&a.length&&this.trigger("change",this),t.each(a,function(t){this.trigger.apply(this,t)},this)),u},toJSON:function(e){var i=n(this,"toJSON",arguments);return e&&e.computed&&t.each(this.c(),function(t,e){i[e]=t.value}),i},destroy:function(){return this.clearComputeds(),n(this,"destroy",arguments)},c:function(){return this._c||(this._c={})},initComputeds:function(e,n){this.clearComputeds();var i=t.result(this,"computeds")||{};i=t.extend(i,t.pick(e||{},t.keys(i))),t.each(i,function(t,e){t._init=1,this.addComputed(e,t)},this),t.invoke(this.c(),"init")},addComputed:function(t,e,n){this.removeComputed(t);var i=e,o=i._init;if(x(e)){var s=2;i={},i._get=e,x(n)&&(i._set=n,s++),i.deps=y.slice.call(arguments,s)}return this.c()[t]=new r(this,t,i,o),this},hasComputed:function(t){return this.c().hasOwnProperty(t)},removeComputed:function(t){return this.hasComputed(t)&&(this.c()[t].dispose(),delete this.c()[t]),this},clearComputeds:function(){for(var t in this.c())this.removeComputed(t);return this},modifyArray:function(t,e,n){var i=this.get(t);if(w(i)&&x(y[e])){var r=y.slice.call(arguments,2),o=y[e].apply(i,r);return n=n||{},n.silent||this.trigger("change:"+t+" change",this,y,n),o}return null},modifyObject:function(t,e,n,i){var r=this.get(t),o=!1;return _(r)?(i=i||{},b(n)&&r.hasOwnProperty(e)?(delete r[e],o=!0):r[e]!==n&&(r[e]=n,o=!0),o&&!i.silent&&this.trigger("change:"+t+" change",this,r,i),r):null}},C),t.extend(r.prototype,e.Events,{init:function(){var e={},n=v=[];this.get(!0),v=null,n.length&&(t.each(n,function(n){var i=n[0],r=n[1];e[i]?t.contains(e[i],r)||e[i].push(r):e[i]=[r]}),t.each(e,function(e,n){for(var i=0,r=e.length;r>i;i++)this.listenTo(e[i],n,t.bind(this.get,this,!0))},this))},val:function(t){return this.model.get(t)},get:function(e){if(e===!0&&this._get){var n=this._get.apply(this.model,t.map(this.deps,this.val,this));this.change(n)}return this.value},set:function(t){if(this._get){if(this._set)return this._set.apply(this.model,arguments);throw"Cannot set read-only computed attribute."}return this.change(t),null},change:function(e){if(!t.isEqual(e,this.value)){this.value=e;var n=["change:"+this.name,this.model,e];this.model._setting?this.model._setting.push(n):(n[0]+=" change",this.model.trigger.apply(this.model,n))}},dispose:function(){this.stopListening(),this.off(),this.model=this.value=null}});var S={optionText:"label",optionValue:"value"},A={},M={attr:s(function(t,e){t.attr(e)}),checked:s({get:function(e,n,i){e.length>1&&(e=e.filter(i.target));var r=!!e.prop("checked"),o=e.val();if(this.isRadio(e))return o;if(w(n)){n=n.slice();var s=t.indexOf(n,o);return r&&0>s?n.push(o):!r&&s>-1&&n.splice(s,1),n}return r},set:function(e,n){e.length>1&&(e=e.filter('[value="'+n+'"]'));var i=!!n;this.isRadio(e)?i=n==e.val():w(n)&&(i=t.contains(n,e.val())),e.prop("checked",i)},isRadio:function(t){return"radio"===t.attr("type").toLowerCase()}}),classes:s(function(e,n){t.each(n,function(t,n){e.toggleClass(n,!!t)})}),collection:s({init:function(t,e,n,i){if(this.i=i.itemView?this.view[i.itemView]:this.view.itemView,!k(e))throw'Binding "collection" requires a Collection.';if(!x(this.i))throw'Binding "collection" requires an itemView.';this.v={}},set:function(e,n,i){var r,o=this.v,s=this.i,a=n.models,u=O;if(O=null,i=i||n,E(i))if(o.hasOwnProperty(i.cid))o[i.cid].remove(),delete o[i.cid];else{o[i.cid]=r=new s({model:i,collectionView:this.view});var l=t.indexOf(a,i),c=e.children();l<c.length?c.eq(l).before(r.$el):e.append(r.$el)}else if(k(i)){var h=a.length===t.size(o)&&n.every(function(t){return o.hasOwnProperty(t.cid)});e.children().detach();var f=document.createDocumentFragment();h?n.each(function(t){f.appendChild(o[t.cid].el)}):(this.clean(),n.each(function(t){o[t.cid]=r=new s({model:t,collectionView:this.view}),f.appendChild(r.el)},this)),e.append(f)}O=u},clean:function(){for(var t in this.v)this.v.hasOwnProperty(t)&&(this.v[t].remove(),delete this.v[t])}}),css:s(function(t,e){t.css(e)}),disabled:s(function(t,e){t.prop("disabled",!!e)}),enabled:s(function(t,e){t.prop("disabled",!e)}),html:s(function(t,e){t.html(e)}),options:s({init:function(t,e,n,i){this.e=i.optionsEmpty,this.d=i.optionsDefault,this.v=i.value},set:function(e,n){var i=this,r=o(i.e),s=o(i.d),a=o(i.v),u=k(n)?n.models:n,l=u.length,c=!0,h="";l||s||!r?(s&&(u=[s].concat(u)),t.each(u,function(t,e){h+=i.opt(t,l)})):(h+=i.opt(r,l),c=!1),e.html(h).prop("disabled",!c).val(a),e[0].selectedIndex<0&&e.children().length&&(e[0].selectedIndex=0);var f=e.val();i.v&&!t.isEqual(a,f)&&i.v(f)},opt:function(t,e){var n=t,i=t,r=S.optionText,o=S.optionValue;return _(t)&&(n=E(t)?t.get(r):t[r],i=E(t)?t.get(o):t[o]),['<option value="',i,'">',n,"</option>"].join("")},clean:function(){this.d=this.e=this.v=0}}),template:s({init:function(e,n,i){var r=e.find("script,template");return this.t=t.template(r.length?r.html():e.html()),w(n)?t.pick(i,n):void 0},set:function(t,e){e=E(e)?e.toJSON({computed:!0}):e,t.html(this.t(e))},clean:function(){this.t=null}}),text:s({get:function(t){return t.text()},set:function(t,e){t.text(e)}}),toggle:s(function(t,e){t.toggle(!!e)}),value:s({get:function(t){return t.val()},set:function(t,e){try{t.val()+""!=e+""&&t.val(e)}catch(n){}}})},N={all:a(function(){for(var t=arguments,e=0,n=t.length;n>e;e++)if(!t[e])return!1;return!0}),any:a(function(){for(var t=arguments,e=0,n=t.length;n>e;e++)if(t[e])return!0;return!1}),length:a(function(t){return t.length||0}),none:a(function(){for(var t=arguments,e=0,n=t.length;n>e;e++)if(t[e])return!1;return!0}),not:a(function(t){return!t}),format:a(function(t){for(var e=arguments,n=1,i=e.length;i>n;n++)t=t.replace(new RegExp("\\$"+n,"g"),e[n]);return t}),select:a(function(t,e,n){return t?e:n}),csv:a({get:function(t){return t=String(t),t?t.split(","):[]},set:function(t){return w(t)?t.join(","):t}}),integer:a(function(t){return t?parseInt(t,10):0}),decimal:a(function(t){return t?parseFloat(t):0})},B={events:1,itemView:1,optionsDefault:1,optionsEmpty:1};m.binding={allowedParams:B,addHandler:function(t,e){M[t]=s(e)},addFilter:function(t,e){N[t]=a(e)},config:function(e){t.extend(S,e)},emptyCache:function(){A={}}};var O,P=["viewModel","bindings","bindingFilters","bindingHandlers","bindingSources","computeds"];m.View=e.View.extend({_super:e.View,constructor:function(e){t.extend(this,t.pick(e||{},P)),n(this,"constructor",arguments),this.applyBindings()},b:function(){return this._b||(this._b=[])},bindings:"data-bind",setterOptions:null,applyBindings:function(){this.removeBindings();var n=this,i=t.clone(t.result(n,"bindingSources")),r=n.bindings,o=n.setterOptions,l=t.clone(M),f=t.clone(N),g=n._c={};t.each(t.result(n,"bindingHandlers")||{},function(t,e){l[e]=s(t)}),t.each(t.result(n,"bindingFilters")||{},function(t,e){f[e]=a(t)}),n.model=u(n,g,o,"model"),n.viewModel=u(n,g,o,"viewModel"),n.collection=u(n,g,o,"collection"),n.collection&&n.collection.view&&(n.itemView=n.collection.view),i&&(t.each(i,function(t,e){i[e]=u(i,g,o,e,e)}),n.bindingSources=i),t.each(t.result(n,"computeds")||{},function(t,e){var i=x(t)?t:t.get,r=t.set,o=t.deps;g[e]=function(t){return!b(t)&&r?r.call(n,t):i.apply(n,d(n._c,o))}}),_(r)?t.each(r,function(t,e){var i=c(n,e);_(t)&&(t=p(t)),i.length&&h(n,i,t,g,l,f)}):c(n,"["+r+"]").each(function(){var t=e.$(this);h(n,t,t.attr(r),g,l,f)})},getBinding:function(t){return f(this._c,t)},setBinding:function(t,e){return f(this._c,t,e)},removeBindings:function(){if(this._c=null,this._b)for(;this._b.length;)this._b.pop().dispose()},remove:function(){this.removeBindings(),n(this,"remove",arguments)}},C);var $=/^[a-z_$][a-z0-9_$]*$/i,D=/^\s*(["']).*\1\s*$/;return t.extend(g.prototype,e.Events,{init:T,get:T,set:T,clean:T,dispose:function(){this.clean(),this.stopListening(),this.$el.off(this.evt),this.$el=this.view=null}}),m})}},"backbone.epoxy"),n("jquery"),n("vague-time"),n("underscore"),n("backbone"),n("backbone.modelbinder"),n("backbone.epoxy")}).call(window);
/*! Hammer.JS - v1.0.9 - 2014-03-18
 * http://eightmedia.github.com/hammer.js
 *
 * Copyright (c) 2014 Jorik Tangelder <j.tangelder@gmail.com>;
 * Licensed under the MIT license */


!function(a,b){"use strict";function c(){d.READY||(s.determineEventTypes(),o.each(d.gestures,function(a){u.register(a)}),s.onTouch(d.DOCUMENT,m,u.detect),s.onTouch(d.DOCUMENT,n,u.detect),d.READY=!0)}var d=function(a,b){return new d.Instance(a,b||{})};d.defaults={stop_browser_behavior:{userSelect:"none",touchAction:"none",touchCallout:"none",contentZooming:"none",userDrag:"none",tapHighlightColor:"rgba(0,0,0,0)"}},d.HAS_POINTEREVENTS=a.navigator.pointerEnabled||a.navigator.msPointerEnabled,d.HAS_TOUCHEVENTS="ontouchstart"in a,d.MOBILE_REGEX=/mobile|tablet|ip(ad|hone|od)|android|silk/i,d.NO_MOUSEEVENTS=d.HAS_TOUCHEVENTS&&a.navigator.userAgent.match(d.MOBILE_REGEX),d.EVENT_TYPES={},d.UPDATE_VELOCITY_INTERVAL=16,d.DOCUMENT=a.document;var e=d.DIRECTION_DOWN="down",f=d.DIRECTION_LEFT="left",g=d.DIRECTION_UP="up",h=d.DIRECTION_RIGHT="right",i=d.POINTER_MOUSE="mouse",j=d.POINTER_TOUCH="touch",k=d.POINTER_PEN="pen",l=d.EVENT_START="start",m=d.EVENT_MOVE="move",n=d.EVENT_END="end";d.plugins=d.plugins||{},d.gestures=d.gestures||{},d.READY=!1;var o=d.utils={extend:function(a,c,d){for(var e in c)a[e]!==b&&d||(a[e]=c[e]);return a},each:function(a,c,d){var e,f;if("forEach"in a)a.forEach(c,d);else if(a.length!==b){for(e=-1;f=a[++e];)if(c.call(d,f,e,a)===!1)return}else for(e in a)if(a.hasOwnProperty(e)&&c.call(d,a[e],e,a)===!1)return},hasParent:function(a,b){for(;a;){if(a==b)return!0;a=a.parentNode}return!1},getCenter:function(a){var b=[],c=[];return o.each(a,function(a){b.push("undefined"!=typeof a.clientX?a.clientX:a.pageX),c.push("undefined"!=typeof a.clientY?a.clientY:a.pageY)}),{pageX:(Math.min.apply(Math,b)+Math.max.apply(Math,b))/2,pageY:(Math.min.apply(Math,c)+Math.max.apply(Math,c))/2}},getVelocity:function(a,b,c){return{x:Math.abs(b/a)||0,y:Math.abs(c/a)||0}},getAngle:function(a,b){var c=b.pageY-a.pageY,d=b.pageX-a.pageX;return 180*Math.atan2(c,d)/Math.PI},getDirection:function(a,b){var c=Math.abs(a.pageX-b.pageX),d=Math.abs(a.pageY-b.pageY);return c>=d?a.pageX-b.pageX>0?f:h:a.pageY-b.pageY>0?g:e},getDistance:function(a,b){var c=b.pageX-a.pageX,d=b.pageY-a.pageY;return Math.sqrt(c*c+d*d)},getScale:function(a,b){return a.length>=2&&b.length>=2?this.getDistance(b[0],b[1])/this.getDistance(a[0],a[1]):1},getRotation:function(a,b){return a.length>=2&&b.length>=2?this.getAngle(b[1],b[0])-this.getAngle(a[1],a[0]):0},isVertical:function(a){return a==g||a==e},toggleDefaultBehavior:function(a,b,c){if(b&&a&&a.style){o.each(["webkit","moz","Moz","ms","o",""],function(d){o.each(b,function(b,e){d&&(e=d+e.substring(0,1).toUpperCase()+e.substring(1)),e in a.style&&(a.style[e]=!c&&b)})});var d=function(){return!1};"none"==b.userSelect&&(a.onselectstart=!c&&d),"none"==b.userDrag&&(a.ondragstart=!c&&d)}}};d.Instance=function(a,b){var e=this;return c(),this.element=a,this.enabled=!0,this.options=o.extend(o.extend({},d.defaults),b||{}),this.options.stop_browser_behavior&&o.toggleDefaultBehavior(this.element,this.options.stop_browser_behavior,!1),this.eventStartHandler=s.onTouch(a,l,function(a){e.enabled&&u.startDetect(e,a)}),this.eventHandlers=[],this},d.Instance.prototype={on:function(a,b){var c=a.split(" ");return o.each(c,function(a){this.element.addEventListener(a,b,!1),this.eventHandlers.push({gesture:a,handler:b})},this),this},off:function(a,b){var c,d,e=a.split(" ");return o.each(e,function(a){for(this.element.removeEventListener(a,b,!1),c=-1;d=this.eventHandlers[++c];)d.gesture===a&&d.handler===b&&this.eventHandlers.splice(c,1)},this),this},trigger:function(a,b){b||(b={});var c=d.DOCUMENT.createEvent("Event");c.initEvent(a,!0,!0),c.gesture=b;var e=this.element;return o.hasParent(b.target,e)&&(e=b.target),e.dispatchEvent(c),this},enable:function(a){return this.enabled=a,this},dispose:function(){var a,b;for(this.options.stop_browser_behavior&&o.toggleDefaultBehavior(this.element,this.options.stop_browser_behavior,!0),a=-1;b=this.eventHandlers[++a];)this.element.removeEventListener(b.gesture,b.handler,!1);return this.eventHandlers=[],s.unbindDom(this.element,d.EVENT_TYPES[l],this.eventStartHandler),null}};var p=null,q=!1,r=!1,s=d.event={bindDom:function(a,b,c){var d=b.split(" ");o.each(d,function(b){a.addEventListener(b,c,!1)})},unbindDom:function(a,b,c){var d=b.split(" ");o.each(d,function(b){a.removeEventListener(b,c,!1)})},onTouch:function(a,b,c){var e=this,f=function(f){var g=f.type.toLowerCase();if(!g.match(/mouse/)||!r){g.match(/touch/)||g.match(/pointerdown/)||g.match(/mouse/)&&1===f.which?q=!0:g.match(/mouse/)&&!f.which&&(q=!1),g.match(/touch|pointer/)&&(r=!0);var h=0;q&&(d.HAS_POINTEREVENTS&&b!=n?h=t.updatePointer(b,f):g.match(/touch/)?h=f.touches.length:r||(h=g.match(/up/)?0:1),h>0&&b==n?b=m:h||(b=n),(h||null===p)&&(p=f),c.call(u,e.collectEventData(a,b,e.getTouchList(p,b),f)),d.HAS_POINTEREVENTS&&b==n&&(h=t.updatePointer(b,f))),h||(p=null,q=!1,r=!1,t.reset())}};return this.bindDom(a,d.EVENT_TYPES[b],f),f},determineEventTypes:function(){var a;a=d.HAS_POINTEREVENTS?t.getEvents():d.NO_MOUSEEVENTS?["touchstart","touchmove","touchend touchcancel"]:["touchstart mousedown","touchmove mousemove","touchend touchcancel mouseup"],d.EVENT_TYPES[l]=a[0],d.EVENT_TYPES[m]=a[1],d.EVENT_TYPES[n]=a[2]},getTouchList:function(a){return d.HAS_POINTEREVENTS?t.getTouchList():a.touches?a.touches:(a.identifier=1,[a])},collectEventData:function(a,b,c,d){var e=j;return(d.type.match(/mouse/)||t.matchType(i,d))&&(e=i),{center:o.getCenter(c),timeStamp:(new Date).getTime(),target:d.target,touches:c,eventType:b,pointerType:e,srcEvent:d,preventDefault:function(){this.srcEvent.preventManipulation&&this.srcEvent.preventManipulation(),this.srcEvent.preventDefault&&this.srcEvent.preventDefault()},stopPropagation:function(){this.srcEvent.stopPropagation()},stopDetect:function(){return u.stopDetect()}}}},t=d.PointerEvent={pointers:{},getTouchList:function(){var a=[];return o.each(this.pointers,function(b){a.push(b)}),a},updatePointer:function(a,b){return a==n?delete this.pointers[b.pointerId]:(b.identifier=b.pointerId,this.pointers[b.pointerId]=b),Object.keys(this.pointers).length},matchType:function(a,b){if(!b.pointerType)return!1;var c=b.pointerType,d={};return d[i]=c===i,d[j]=c===j,d[k]=c===k,d[a]},getEvents:function(){return["pointerdown MSPointerDown","pointermove MSPointerMove","pointerup pointercancel MSPointerUp MSPointerCancel"]},reset:function(){this.pointers={}}},u=d.detection={gestures:[],current:null,previous:null,stopped:!1,startDetect:function(a,b){this.current||(this.stopped=!1,this.current={inst:a,startEvent:o.extend({},b),lastEvent:!1,lastVelocityEvent:!1,velocity:!1,name:""},this.detect(b))},detect:function(a){if(this.current&&!this.stopped){a=this.extendEventData(a);var b=this.current.inst.options;return o.each(this.gestures,function(c){return this.stopped||b[c.name]===!1||c.handler.call(c,a,this.current.inst)!==!1?void 0:(this.stopDetect(),!1)},this),this.current&&(this.current.lastEvent=a),a.eventType==n&&!a.touches.length-1&&this.stopDetect(),a}},stopDetect:function(){this.previous=o.extend({},this.current),this.current=null,this.stopped=!0},extendEventData:function(a){var b=this.current,c=b.startEvent;(a.touches.length!=c.touches.length||a.touches===c.touches)&&(c.touches=[],o.each(a.touches,function(a){c.touches.push(o.extend({},a))}));var e,f,g=a.timeStamp-c.timeStamp,h=a.center.pageX-c.center.pageX,i=a.center.pageY-c.center.pageY,j=b.lastVelocityEvent,k=b.velocity;return j&&a.timeStamp-j.timeStamp>d.UPDATE_VELOCITY_INTERVAL?(k=o.getVelocity(a.timeStamp-j.timeStamp,a.center.pageX-j.center.pageX,a.center.pageY-j.center.pageY),b.lastVelocityEvent=a,b.velocity=k):b.velocity||(k=o.getVelocity(g,h,i),b.lastVelocityEvent=a,b.velocity=k),a.eventType==n?(e=b.lastEvent&&b.lastEvent.interimAngle,f=b.lastEvent&&b.lastEvent.interimDirection):(e=b.lastEvent&&o.getAngle(b.lastEvent.center,a.center),f=b.lastEvent&&o.getDirection(b.lastEvent.center,a.center)),o.extend(a,{deltaTime:g,deltaX:h,deltaY:i,velocityX:k.x,velocityY:k.y,distance:o.getDistance(c.center,a.center),angle:o.getAngle(c.center,a.center),interimAngle:e,direction:o.getDirection(c.center,a.center),interimDirection:f,scale:o.getScale(c.touches,a.touches),rotation:o.getRotation(c.touches,a.touches),startEvent:c}),a},register:function(a){var c=a.defaults||{};return c[a.name]===b&&(c[a.name]=!0),o.extend(d.defaults,c,!0),a.index=a.index||1e3,this.gestures.push(a),this.gestures.sort(function(a,b){return a.index<b.index?-1:a.index>b.index?1:0}),this.gestures}};d.gestures.Drag={name:"drag",index:50,defaults:{drag_min_distance:10,correct_for_drag_min_distance:!0,drag_max_touches:1,drag_block_horizontal:!1,drag_block_vertical:!1,drag_lock_to_axis:!1,drag_lock_min_distance:25},triggered:!1,handler:function(a,b){if(u.current.name!=this.name&&this.triggered)return b.trigger(this.name+"end",a),void(this.triggered=!1);if(!(b.options.drag_max_touches>0&&a.touches.length>b.options.drag_max_touches))switch(a.eventType){case l:this.triggered=!1;break;case m:if(a.distance<b.options.drag_min_distance&&u.current.name!=this.name)return;if(u.current.name!=this.name&&(u.current.name=this.name,b.options.correct_for_drag_min_distance&&a.distance>0)){var c=Math.abs(b.options.drag_min_distance/a.distance);u.current.startEvent.center.pageX+=a.deltaX*c,u.current.startEvent.center.pageY+=a.deltaY*c,a=u.extendEventData(a)}(u.current.lastEvent.drag_locked_to_axis||b.options.drag_lock_to_axis&&b.options.drag_lock_min_distance<=a.distance)&&(a.drag_locked_to_axis=!0);var d=u.current.lastEvent.direction;a.drag_locked_to_axis&&d!==a.direction&&(a.direction=o.isVertical(d)?a.deltaY<0?g:e:a.deltaX<0?f:h),this.triggered||(b.trigger(this.name+"start",a),this.triggered=!0),b.trigger(this.name,a),b.trigger(this.name+a.direction,a);var i=o.isVertical(a.direction);(b.options.drag_block_vertical&&i||b.options.drag_block_horizontal&&!i)&&a.preventDefault();break;case n:this.triggered&&b.trigger(this.name+"end",a),this.triggered=!1}}},d.gestures.Hold={name:"hold",index:10,defaults:{hold_timeout:500,hold_threshold:1},timer:null,handler:function(a,b){switch(a.eventType){case l:clearTimeout(this.timer),u.current.name=this.name,this.timer=setTimeout(function(){"hold"==u.current.name&&b.trigger("hold",a)},b.options.hold_timeout);break;case m:a.distance>b.options.hold_threshold&&clearTimeout(this.timer);break;case n:clearTimeout(this.timer)}}},d.gestures.Release={name:"release",index:1/0,handler:function(a,b){a.eventType==n&&b.trigger(this.name,a)}},d.gestures.Swipe={name:"swipe",index:40,defaults:{swipe_min_touches:1,swipe_max_touches:1,swipe_velocity:.7},handler:function(a,b){if(a.eventType==n){if(a.touches.length<b.options.swipe_min_touches||a.touches.length>b.options.swipe_max_touches)return;(a.velocityX>b.options.swipe_velocity||a.velocityY>b.options.swipe_velocity)&&(b.trigger(this.name,a),b.trigger(this.name+a.direction,a))}}},d.gestures.Tap={name:"tap",index:100,defaults:{tap_max_touchtime:250,tap_max_distance:10,tap_always:!0,doubletap_distance:20,doubletap_interval:300},has_moved:!1,handler:function(a,b){var c,d,e;a.eventType==l?this.has_moved=!1:a.eventType!=m||this.moved?a.eventType==n&&"touchcancel"!=a.srcEvent.type&&a.deltaTime<b.options.tap_max_touchtime&&!this.has_moved&&(c=u.previous,d=c&&c.lastEvent&&a.timeStamp-c.lastEvent.timeStamp,e=!1,c&&"tap"==c.name&&d&&d<b.options.doubletap_interval&&a.distance<b.options.doubletap_distance&&(b.trigger("doubletap",a),e=!0),(!e||b.options.tap_always)&&(u.current.name="tap",b.trigger(u.current.name,a))):this.has_moved=a.distance>b.options.tap_max_distance}},d.gestures.Touch={name:"touch",index:-1/0,defaults:{prevent_default:!1,prevent_mouseevents:!1},handler:function(a,b){return b.options.prevent_mouseevents&&a.pointerType==i?void a.stopDetect():(b.options.prevent_default&&a.preventDefault(),void(a.eventType==l&&b.trigger(this.name,a)))}},d.gestures.Transform={name:"transform",index:45,defaults:{transform_min_scale:.01,transform_min_rotation:1,transform_always_block:!1,transform_within_instance:!1},triggered:!1,handler:function(a,b){if(u.current.name!=this.name&&this.triggered)return b.trigger(this.name+"end",a),void(this.triggered=!1);if(!(a.touches.length<2)){if(b.options.transform_always_block&&a.preventDefault(),b.options.transform_within_instance)for(var c=-1;a.touches[++c];)if(!o.hasParent(a.touches[c].target,b.element))return;switch(a.eventType){case l:this.triggered=!1;break;case m:var d=Math.abs(1-a.scale),e=Math.abs(a.rotation);if(d<b.options.transform_min_scale&&e<b.options.transform_min_rotation)return;u.current.name=this.name,this.triggered||(b.trigger(this.name+"start",a),this.triggered=!0),b.trigger(this.name,a),e>b.options.transform_min_rotation&&b.trigger("rotate",a),d>b.options.transform_min_scale&&(b.trigger("pinch",a),b.trigger("pinch"+(a.scale<1?"in":"out"),a));break;case n:this.triggered&&b.trigger(this.name+"end",a),this.triggered=!1}}}},"function"==typeof define&&define.amd?define(function(){return d}):"object"==typeof module&&module.exports?module.exports=d:a.Hammer=d}(window);
//# sourceMappingURL=hammer.min.map
/** @license
 *
 * SoundManager 2: JavaScript Sound for the Web
 * ----------------------------------------------
 * http://schillmania.com/projects/soundmanager2/
 *
 * Copyright (c) 2007, Scott Schiller. All rights reserved.
 * Code provided under the BSD License:
 * http://schillmania.com/projects/soundmanager2/license.txt
 *
 * V2.97a.20131201
 */
(function(g,k){function U(U,ka){function V(b){return c.preferFlash&&v&&!c.ignoreFlash&&c.flash[b]!==k&&c.flash[b]}function q(b){return function(c){var d=this._s;return!d||!d._a?null:b.call(this,c)}}this.setupOptions={url:U||null,flashVersion:8,debugMode:!0,debugFlash:!1,useConsole:!0,consoleOnly:!0,waitForWindowLoad:!1,bgColor:"#ffffff",useHighPerformance:!1,flashPollingInterval:null,html5PollingInterval:null,flashLoadTimeout:1E3,wmode:null,allowScriptAccess:"always",useFlashBlock:!1,useHTML5Audio:!0,
html5Test:/^(probably|maybe)$/i,preferFlash:!1,noSWFCache:!1,idPrefix:"sound"};this.defaultOptions={autoLoad:!1,autoPlay:!1,from:null,loops:1,onid3:null,onload:null,whileloading:null,onplay:null,onpause:null,onresume:null,whileplaying:null,onposition:null,onstop:null,onfailure:null,onfinish:null,multiShot:!0,multiShotEvents:!1,position:null,pan:0,stream:!0,to:null,type:null,usePolicyFile:!1,volume:100};this.flash9Options={isMovieStar:null,usePeakData:!1,useWaveformData:!1,useEQData:!1,onbufferchange:null,
ondataerror:null};this.movieStarOptions={bufferTime:3,serverURL:null,onconnect:null,duration:null};this.audioFormats={mp3:{type:['audio/mpeg; codecs\x3d"mp3"',"audio/mpeg","audio/mp3","audio/MPA","audio/mpa-robust"],required:!0},mp4:{related:["aac","m4a","m4b"],type:['audio/mp4; codecs\x3d"mp4a.40.2"',"audio/aac","audio/x-m4a","audio/MP4A-LATM","audio/mpeg4-generic"],required:!1},ogg:{type:["audio/ogg; codecs\x3dvorbis"],required:!1},opus:{type:["audio/ogg; codecs\x3dopus","audio/opus"],required:!1},
wav:{type:['audio/wav; codecs\x3d"1"',"audio/wav","audio/wave","audio/x-wav"],required:!1}};this.movieID="sm2-container";this.id=ka||"sm2movie";this.debugID="soundmanager-debug";this.debugURLParam=/([#?&])debug=1/i;this.versionNumber="V2.97a.20131201";this.altURL=this.movieURL=this.version=null;this.enabled=this.swfLoaded=!1;this.oMC=null;this.sounds={};this.soundIDs=[];this.didFlashBlock=this.muted=!1;this.filePattern=null;this.filePatterns={flash8:/\.mp3(\?.*)?$/i,flash9:/\.mp3(\?.*)?$/i};this.features=
{buffering:!1,peakData:!1,waveformData:!1,eqData:!1,movieStar:!1};this.sandbox={};this.html5={usingFlash:null};this.flash={};this.ignoreFlash=this.html5Only=!1;var Ja,c=this,Ka=null,l=null,W,s=navigator.userAgent,La=g.location.href.toString(),n=document,la,Ma,ma,m,x=[],K=!1,L=!1,p=!1,y=!1,na=!1,M,w,oa,X,pa,D,E,F,Na,qa,ra,Y,sa,Z,ta,G,ua,N,va,$,H,Oa,wa,Pa,xa,Qa,O=null,ya=null,P,za,I,aa,ba,r,Q=!1,Aa=!1,Ra,Sa,Ta,ca=0,R=null,da,Ua=[],S,u=null,Va,ea,T,z,fa,Ba,Wa,t,fb=Array.prototype.slice,A=!1,Ca,v,Da,
Xa,B,ga,Ya=0,ha=s.match(/(ipad|iphone|ipod)/i),Za=s.match(/android/i),C=s.match(/msie/i),gb=s.match(/webkit/i),ia=s.match(/safari/i)&&!s.match(/chrome/i),Ea=s.match(/opera/i),Fa=s.match(/(mobile|pre\/|xoom)/i)||ha||Za,$a=!La.match(/usehtml5audio/i)&&!La.match(/sm2\-ignorebadua/i)&&ia&&!s.match(/silk/i)&&s.match(/OS X 10_6_([3-7])/i),Ga=n.hasFocus!==k?n.hasFocus():null,ja=ia&&(n.hasFocus===k||!n.hasFocus()),ab=!ja,bb=/(mp3|mp4|mpa|m4a|m4b)/i,Ha=n.location?n.location.protocol.match(/http/i):null,cb=
!Ha?"http://":"",db=/^\s*audio\/(?:x-)?(?:mpeg4|aac|flv|mov|mp4||m4v|m4a|m4b|mp4v|3gp|3g2)\s*(?:$|;)/i,eb="mpeg4 aac flv mov mp4 m4v f4v m4a m4b mp4v 3gp 3g2".split(" "),hb=RegExp("\\.("+eb.join("|")+")(\\?.*)?$","i");this.mimePattern=/^\s*audio\/(?:x-)?(?:mp(?:eg|3))\s*(?:$|;)/i;this.useAltURL=!Ha;var Ia;try{Ia=Audio!==k&&(Ea&&opera!==k&&10>opera.version()?new Audio(null):new Audio).canPlayType!==k}catch(ib){Ia=!1}this.hasHTML5=Ia;this.setup=function(b){var e=!c.url;b!==k&&p&&u&&c.ok();oa(b);b&&
(e&&(N&&b.url!==k)&&c.beginDelayedInit(),!N&&(b.url!==k&&"complete"===n.readyState)&&setTimeout(G,1));return c};this.supported=this.ok=function(){return u?p&&!y:c.useHTML5Audio&&c.hasHTML5};this.getMovie=function(b){return W(b)||n[b]||g[b]};this.createSound=function(b,e){function d(){a=aa(a);c.sounds[a.id]=new Ja(a);c.soundIDs.push(a.id);return c.sounds[a.id]}var a,f=null;if(!p||!c.ok())return!1;e!==k&&(b={id:b,url:e});a=w(b);a.url=da(a.url);void 0===a.id&&(a.id=c.setupOptions.idPrefix+Ya++);if(r(a.id,
!0))return c.sounds[a.id];if(ea(a))f=d(),f._setup_html5(a);else{if(c.html5Only||c.html5.usingFlash&&a.url&&a.url.match(/data\:/i))return d();8<m&&null===a.isMovieStar&&(a.isMovieStar=!(!a.serverURL&&!(a.type&&a.type.match(db)||a.url&&a.url.match(hb))));a=ba(a,void 0);f=d();8===m?l._createSound(a.id,a.loops||1,a.usePolicyFile):(l._createSound(a.id,a.url,a.usePeakData,a.useWaveformData,a.useEQData,a.isMovieStar,a.isMovieStar?a.bufferTime:!1,a.loops||1,a.serverURL,a.duration||null,a.autoPlay,!0,a.autoLoad,
a.usePolicyFile),a.serverURL||(f.connected=!0,a.onconnect&&a.onconnect.apply(f)));!a.serverURL&&(a.autoLoad||a.autoPlay)&&f.load(a)}!a.serverURL&&a.autoPlay&&f.play();return f};this.destroySound=function(b,e){if(!r(b))return!1;var d=c.sounds[b],a;d._iO={};d.stop();d.unload();for(a=0;a<c.soundIDs.length;a++)if(c.soundIDs[a]===b){c.soundIDs.splice(a,1);break}e||d.destruct(!0);delete c.sounds[b];return!0};this.load=function(b,e){return!r(b)?!1:c.sounds[b].load(e)};this.unload=function(b){return!r(b)?
!1:c.sounds[b].unload()};this.onposition=this.onPosition=function(b,e,d,a){return!r(b)?!1:c.sounds[b].onposition(e,d,a)};this.clearOnPosition=function(b,e,d){return!r(b)?!1:c.sounds[b].clearOnPosition(e,d)};this.start=this.play=function(b,e){var d=null,a=e&&!(e instanceof Object);if(!p||!c.ok())return!1;if(r(b,a))a&&(e={url:e});else{if(!a)return!1;a&&(e={url:e});e&&e.url&&(e.id=b,d=c.createSound(e).play())}null===d&&(d=c.sounds[b].play(e));return d};this.setPosition=function(b,e){return!r(b)?!1:c.sounds[b].setPosition(e)};
this.stop=function(b){return!r(b)?!1:c.sounds[b].stop()};this.stopAll=function(){for(var b in c.sounds)c.sounds.hasOwnProperty(b)&&c.sounds[b].stop()};this.pause=function(b){return!r(b)?!1:c.sounds[b].pause()};this.pauseAll=function(){var b;for(b=c.soundIDs.length-1;0<=b;b--)c.sounds[c.soundIDs[b]].pause()};this.resume=function(b){return!r(b)?!1:c.sounds[b].resume()};this.resumeAll=function(){var b;for(b=c.soundIDs.length-1;0<=b;b--)c.sounds[c.soundIDs[b]].resume()};this.togglePause=function(b){return!r(b)?
!1:c.sounds[b].togglePause()};this.setPan=function(b,e){return!r(b)?!1:c.sounds[b].setPan(e)};this.setVolume=function(b,e){return!r(b)?!1:c.sounds[b].setVolume(e)};this.mute=function(b){var e=0;b instanceof String&&(b=null);if(b)return!r(b)?!1:c.sounds[b].mute();for(e=c.soundIDs.length-1;0<=e;e--)c.sounds[c.soundIDs[e]].mute();return c.muted=!0};this.muteAll=function(){c.mute()};this.unmute=function(b){b instanceof String&&(b=null);if(b)return!r(b)?!1:c.sounds[b].unmute();for(b=c.soundIDs.length-
1;0<=b;b--)c.sounds[c.soundIDs[b]].unmute();c.muted=!1;return!0};this.unmuteAll=function(){c.unmute()};this.toggleMute=function(b){return!r(b)?!1:c.sounds[b].toggleMute()};this.getMemoryUse=function(){var b=0;l&&8!==m&&(b=parseInt(l._getMemoryUse(),10));return b};this.disable=function(b){var e;b===k&&(b=!1);if(y)return!1;y=!0;for(e=c.soundIDs.length-1;0<=e;e--)Pa(c.sounds[c.soundIDs[e]]);M(b);t.remove(g,"load",E);return!0};this.canPlayMIME=function(b){var e;c.hasHTML5&&(e=T({type:b}));!e&&u&&(e=b&&
c.ok()?!!(8<m&&b.match(db)||b.match(c.mimePattern)):null);return e};this.canPlayURL=function(b){var e;c.hasHTML5&&(e=T({url:b}));!e&&u&&(e=b&&c.ok()?!!b.match(c.filePattern):null);return e};this.canPlayLink=function(b){return b.type!==k&&b.type&&c.canPlayMIME(b.type)?!0:c.canPlayURL(b.href)};this.getSoundById=function(b,e){return!b?null:c.sounds[b]};this.onready=function(b,c){if("function"===typeof b)c||(c=g),pa("onready",b,c),D();else throw P("needFunction","onready");return!0};this.ontimeout=function(b,
c){if("function"===typeof b)c||(c=g),pa("ontimeout",b,c),D({type:"ontimeout"});else throw P("needFunction","ontimeout");return!0};this._wD=this._writeDebug=function(b,c){return!0};this._debug=function(){};this.reboot=function(b,e){var d,a,f;for(d=c.soundIDs.length-1;0<=d;d--)c.sounds[c.soundIDs[d]].destruct();if(l)try{C&&(ya=l.innerHTML),O=l.parentNode.removeChild(l)}catch(k){}ya=O=u=l=null;c.enabled=N=p=Q=Aa=K=L=y=A=c.swfLoaded=!1;c.soundIDs=[];c.sounds={};Ya=0;if(b)x=[];else for(d in x)if(x.hasOwnProperty(d)){a=
0;for(f=x[d].length;a<f;a++)x[d][a].fired=!1}c.html5={usingFlash:null};c.flash={};c.html5Only=!1;c.ignoreFlash=!1;g.setTimeout(function(){ta();e||c.beginDelayedInit()},20);return c};this.reset=function(){return c.reboot(!0,!0)};this.getMoviePercent=function(){return l&&"PercentLoaded"in l?l.PercentLoaded():null};this.beginDelayedInit=function(){na=!0;G();setTimeout(function(){if(Aa)return!1;$();Z();return Aa=!0},20);F()};this.destruct=function(){c.disable(!0)};Ja=function(b){var e,d,a=this,f,h,J,
g,n,q,s=!1,p=[],u=0,x,y,v=null,z;d=e=null;this.sID=this.id=b.id;this.url=b.url;this._iO=this.instanceOptions=this.options=w(b);this.pan=this.options.pan;this.volume=this.options.volume;this.isHTML5=!1;this._a=null;z=this.url?!1:!0;this.id3={};this._debug=function(){};this.load=function(b){var e=null,d;b!==k?a._iO=w(b,a.options):(b=a.options,a._iO=b,v&&v!==a.url&&(a._iO.url=a.url,a.url=null));a._iO.url||(a._iO.url=a.url);a._iO.url=da(a._iO.url);d=a.instanceOptions=a._iO;if(!d.url&&!a.url)return a;
if(d.url===a.url&&0!==a.readyState&&2!==a.readyState)return 3===a.readyState&&d.onload&&ga(a,function(){d.onload.apply(a,[!!a.duration])}),a;a.loaded=!1;a.readyState=1;a.playState=0;a.id3={};if(ea(d))e=a._setup_html5(d),e._called_load||(a._html5_canplay=!1,a.url!==d.url&&(a._a.src=d.url,a.setPosition(0)),a._a.autobuffer="auto",a._a.preload="auto",a._a._called_load=!0);else{if(c.html5Only||a._iO.url&&a._iO.url.match(/data\:/i))return a;try{a.isHTML5=!1,a._iO=ba(aa(d)),d=a._iO,8===m?l._load(a.id,d.url,
d.stream,d.autoPlay,d.usePolicyFile):l._load(a.id,d.url,!!d.stream,!!d.autoPlay,d.loops||1,!!d.autoLoad,d.usePolicyFile)}catch(f){H({type:"SMSOUND_LOAD_JS_EXCEPTION",fatal:!0})}}a.url=d.url;return a};this.unload=function(){0!==a.readyState&&(a.isHTML5?(g(),a._a&&(a._a.pause(),v=fa(a._a))):8===m?l._unload(a.id,"about:blank"):l._unload(a.id),f());return a};this.destruct=function(b){a.isHTML5?(g(),a._a&&(a._a.pause(),fa(a._a),A||J(),a._a._s=null,a._a=null)):(a._iO.onfailure=null,l._destroySound(a.id));
b||c.destroySound(a.id,!0)};this.start=this.play=function(b,e){var d,f,h,g,J;f=!0;f=null;e=e===k?!0:e;b||(b={});a.url&&(a._iO.url=a.url);a._iO=w(a._iO,a.options);a._iO=w(b,a._iO);a._iO.url=da(a._iO.url);a.instanceOptions=a._iO;if(!a.isHTML5&&a._iO.serverURL&&!a.connected)return a.getAutoPlay()||a.setAutoPlay(!0),a;ea(a._iO)&&(a._setup_html5(a._iO),n());1===a.playState&&!a.paused&&(d=a._iO.multiShot,d||(a.isHTML5&&a.setPosition(a._iO.position),f=a));if(null!==f)return f;b.url&&b.url!==a.url&&(!a.readyState&&
!a.isHTML5&&8===m&&z?z=!1:a.load(a._iO));a.loaded||(0===a.readyState?(!a.isHTML5&&!c.html5Only?(a._iO.autoPlay=!0,a.load(a._iO)):a.isHTML5?a.load(a._iO):f=a,a.instanceOptions=a._iO):2===a.readyState&&(f=a));if(null!==f)return f;!a.isHTML5&&(9===m&&0<a.position&&a.position===a.duration)&&(b.position=0);if(a.paused&&0<=a.position&&(!a._iO.serverURL||0<a.position))a.resume();else{a._iO=w(b,a._iO);if(null!==a._iO.from&&null!==a._iO.to&&0===a.instanceCount&&0===a.playState&&!a._iO.serverURL){d=function(){a._iO=
w(b,a._iO);a.play(a._iO)};if(a.isHTML5&&!a._html5_canplay)a.load({_oncanplay:d}),f=!1;else if(!a.isHTML5&&!a.loaded&&(!a.readyState||2!==a.readyState))a.load({onload:d}),f=!1;if(null!==f)return f;a._iO=y()}(!a.instanceCount||a._iO.multiShotEvents||a.isHTML5&&a._iO.multiShot&&!A||!a.isHTML5&&8<m&&!a.getAutoPlay())&&a.instanceCount++;a._iO.onposition&&0===a.playState&&q(a);a.playState=1;a.paused=!1;a.position=a._iO.position!==k&&!isNaN(a._iO.position)?a._iO.position:0;a.isHTML5||(a._iO=ba(aa(a._iO)));
a._iO.onplay&&e&&(a._iO.onplay.apply(a),s=!0);a.setVolume(a._iO.volume,!0);a.setPan(a._iO.pan,!0);a.isHTML5?2>a.instanceCount?(n(),f=a._setup_html5(),a.setPosition(a._iO.position),f.play()):(h=new Audio(a._iO.url),g=function(){t.remove(h,"ended",g);a._onfinish(a);fa(h);h=null},J=function(){t.remove(h,"canplay",J);try{h.currentTime=a._iO.position/1E3}catch(b){}h.play()},t.add(h,"ended",g),void 0!==a._iO.volume&&(h.volume=Math.max(0,Math.min(1,a._iO.volume/100))),a.muted&&(h.muted=!0),a._iO.position?
t.add(h,"canplay",J):h.play()):(f=l._start(a.id,a._iO.loops||1,9===m?a.position:a.position/1E3,a._iO.multiShot||!1),9===m&&!f&&a._iO.onplayerror&&a._iO.onplayerror.apply(a))}return a};this.stop=function(b){var c=a._iO;1===a.playState&&(a._onbufferchange(0),a._resetOnPosition(0),a.paused=!1,a.isHTML5||(a.playState=0),x(),c.to&&a.clearOnPosition(c.to),a.isHTML5?a._a&&(b=a.position,a.setPosition(0),a.position=b,a._a.pause(),a.playState=0,a._onTimer(),g()):(l._stop(a.id,b),c.serverURL&&a.unload()),a.instanceCount=
0,a._iO={},c.onstop&&c.onstop.apply(a));return a};this.setAutoPlay=function(b){a._iO.autoPlay=b;a.isHTML5||(l._setAutoPlay(a.id,b),b&&!a.instanceCount&&1===a.readyState&&a.instanceCount++)};this.getAutoPlay=function(){return a._iO.autoPlay};this.setPosition=function(b){b===k&&(b=0);var c=a.isHTML5?Math.max(b,0):Math.min(a.duration||a._iO.duration,Math.max(b,0));a.position=c;b=a.position/1E3;a._resetOnPosition(a.position);a._iO.position=c;if(a.isHTML5){if(a._a){if(a._html5_canplay){if(a._a.currentTime!==
b)try{a._a.currentTime=b,(0===a.playState||a.paused)&&a._a.pause()}catch(e){}}else if(b)return a;a.paused&&a._onTimer(!0)}}else b=9===m?a.position:b,a.readyState&&2!==a.readyState&&l._setPosition(a.id,b,a.paused||!a.playState,a._iO.multiShot);return a};this.pause=function(b){if(a.paused||0===a.playState&&1!==a.readyState)return a;a.paused=!0;a.isHTML5?(a._setup_html5().pause(),g()):(b||b===k)&&l._pause(a.id,a._iO.multiShot);a._iO.onpause&&a._iO.onpause.apply(a);return a};this.resume=function(){var b=
a._iO;if(!a.paused)return a;a.paused=!1;a.playState=1;a.isHTML5?(a._setup_html5().play(),n()):(b.isMovieStar&&!b.serverURL&&a.setPosition(a.position),l._pause(a.id,b.multiShot));!s&&b.onplay?(b.onplay.apply(a),s=!0):b.onresume&&b.onresume.apply(a);return a};this.togglePause=function(){if(0===a.playState)return a.play({position:9===m&&!a.isHTML5?a.position:a.position/1E3}),a;a.paused?a.resume():a.pause();return a};this.setPan=function(b,c){b===k&&(b=0);c===k&&(c=!1);a.isHTML5||l._setPan(a.id,b);a._iO.pan=
b;c||(a.pan=b,a.options.pan=b);return a};this.setVolume=function(b,e){b===k&&(b=100);e===k&&(e=!1);a.isHTML5?a._a&&(c.muted&&!a.muted&&(a.muted=!0,a._a.muted=!0),a._a.volume=Math.max(0,Math.min(1,b/100))):l._setVolume(a.id,c.muted&&!a.muted||a.muted?0:b);a._iO.volume=b;e||(a.volume=b,a.options.volume=b);return a};this.mute=function(){a.muted=!0;a.isHTML5?a._a&&(a._a.muted=!0):l._setVolume(a.id,0);return a};this.unmute=function(){a.muted=!1;var b=a._iO.volume!==k;a.isHTML5?a._a&&(a._a.muted=!1):l._setVolume(a.id,
b?a._iO.volume:a.options.volume);return a};this.toggleMute=function(){return a.muted?a.unmute():a.mute()};this.onposition=this.onPosition=function(b,c,e){p.push({position:parseInt(b,10),method:c,scope:e!==k?e:a,fired:!1});return a};this.clearOnPosition=function(a,b){var c;a=parseInt(a,10);if(isNaN(a))return!1;for(c=0;c<p.length;c++)if(a===p[c].position&&(!b||b===p[c].method))p[c].fired&&u--,p.splice(c,1)};this._processOnPosition=function(){var b,c;b=p.length;if(!b||!a.playState||u>=b)return!1;for(b-=
1;0<=b;b--)c=p[b],!c.fired&&a.position>=c.position&&(c.fired=!0,u++,c.method.apply(c.scope,[c.position]));return!0};this._resetOnPosition=function(a){var b,c;b=p.length;if(!b)return!1;for(b-=1;0<=b;b--)c=p[b],c.fired&&a<=c.position&&(c.fired=!1,u--);return!0};y=function(){var b=a._iO,c=b.from,e=b.to,d,f;f=function(){a.clearOnPosition(e,f);a.stop()};d=function(){if(null!==e&&!isNaN(e))a.onPosition(e,f)};null!==c&&!isNaN(c)&&(b.position=c,b.multiShot=!1,d());return b};q=function(){var b,c=a._iO.onposition;
if(c)for(b in c)if(c.hasOwnProperty(b))a.onPosition(parseInt(b,10),c[b])};x=function(){var b,c=a._iO.onposition;if(c)for(b in c)c.hasOwnProperty(b)&&a.clearOnPosition(parseInt(b,10))};n=function(){a.isHTML5&&Ra(a)};g=function(){a.isHTML5&&Sa(a)};f=function(b){b||(p=[],u=0);s=!1;a._hasTimer=null;a._a=null;a._html5_canplay=!1;a.bytesLoaded=null;a.bytesTotal=null;a.duration=a._iO&&a._iO.duration?a._iO.duration:null;a.durationEstimate=null;a.buffered=[];a.eqData=[];a.eqData.left=[];a.eqData.right=[];
a.failures=0;a.isBuffering=!1;a.instanceOptions={};a.instanceCount=0;a.loaded=!1;a.metadata={};a.readyState=0;a.muted=!1;a.paused=!1;a.peakData={left:0,right:0};a.waveformData={left:[],right:[]};a.playState=0;a.position=null;a.id3={}};f();this._onTimer=function(b){var c,f=!1,h={};if(a._hasTimer||b){if(a._a&&(b||(0<a.playState||1===a.readyState)&&!a.paused))c=a._get_html5_duration(),c!==e&&(e=c,a.duration=c,f=!0),a.durationEstimate=a.duration,c=1E3*a._a.currentTime||0,c!==d&&(d=c,f=!0),(f||b)&&a._whileplaying(c,
h,h,h,h);return f}};this._get_html5_duration=function(){var b=a._iO;return(b=a._a&&a._a.duration?1E3*a._a.duration:b&&b.duration?b.duration:null)&&!isNaN(b)&&Infinity!==b?b:null};this._apply_loop=function(a,b){a.loop=1<b?"loop":""};this._setup_html5=function(b){b=w(a._iO,b);var c=A?Ka:a._a,e=decodeURI(b.url),d;A?e===decodeURI(Ca)&&(d=!0):e===decodeURI(v)&&(d=!0);if(c){if(c._s)if(A)c._s&&(c._s.playState&&!d)&&c._s.stop();else if(!A&&e===decodeURI(v))return a._apply_loop(c,b.loops),c;d||(v&&f(!1),c.src=
b.url,Ca=v=a.url=b.url,c._called_load=!1)}else b.autoLoad||b.autoPlay?(a._a=new Audio(b.url),a._a.load()):a._a=Ea&&10>opera.version()?new Audio(null):new Audio,c=a._a,c._called_load=!1,A&&(Ka=c);a.isHTML5=!0;a._a=c;c._s=a;h();a._apply_loop(c,b.loops);b.autoLoad||b.autoPlay?a.load():(c.autobuffer=!1,c.preload="auto");return c};h=function(){if(a._a._added_events)return!1;var b;a._a._added_events=!0;for(b in B)B.hasOwnProperty(b)&&a._a&&a._a.addEventListener(b,B[b],!1);return!0};J=function(){var b;a._a._added_events=
!1;for(b in B)B.hasOwnProperty(b)&&a._a&&a._a.removeEventListener(b,B[b],!1)};this._onload=function(b){var c=!!b||!a.isHTML5&&8===m&&a.duration;a.loaded=c;a.readyState=c?3:2;a._onbufferchange(0);a._iO.onload&&ga(a,function(){a._iO.onload.apply(a,[c])});return!0};this._onbufferchange=function(b){if(0===a.playState||b&&a.isBuffering||!b&&!a.isBuffering)return!1;a.isBuffering=1===b;a._iO.onbufferchange&&a._iO.onbufferchange.apply(a);return!0};this._onsuspend=function(){a._iO.onsuspend&&a._iO.onsuspend.apply(a);
return!0};this._onfailure=function(b,c,e){a.failures++;if(a._iO.onfailure&&1===a.failures)a._iO.onfailure(a,b,c,e)};this._onfinish=function(){var b=a._iO.onfinish;a._onbufferchange(0);a._resetOnPosition(0);a.instanceCount&&(a.instanceCount--,a.instanceCount||(x(),a.playState=0,a.paused=!1,a.instanceCount=0,a.instanceOptions={},a._iO={},g(),a.isHTML5&&(a.position=0)),(!a.instanceCount||a._iO.multiShotEvents)&&b&&ga(a,function(){b.apply(a)}))};this._whileloading=function(b,c,e,d){var f=a._iO;a.bytesLoaded=
b;a.bytesTotal=c;a.duration=Math.floor(e);a.bufferLength=d;a.durationEstimate=!a.isHTML5&&!f.isMovieStar?f.duration?a.duration>f.duration?a.duration:f.duration:parseInt(a.bytesTotal/a.bytesLoaded*a.duration,10):a.duration;a.isHTML5||(a.buffered=[{start:0,end:a.duration}]);(3!==a.readyState||a.isHTML5)&&f.whileloading&&f.whileloading.apply(a)};this._whileplaying=function(b,c,e,d,f){var h=a._iO;if(isNaN(b)||null===b)return!1;a.position=Math.max(0,b);a._processOnPosition();!a.isHTML5&&8<m&&(h.usePeakData&&
(c!==k&&c)&&(a.peakData={left:c.leftPeak,right:c.rightPeak}),h.useWaveformData&&(e!==k&&e)&&(a.waveformData={left:e.split(","),right:d.split(",")}),h.useEQData&&(f!==k&&f&&f.leftEQ)&&(b=f.leftEQ.split(","),a.eqData=b,a.eqData.left=b,f.rightEQ!==k&&f.rightEQ&&(a.eqData.right=f.rightEQ.split(","))));1===a.playState&&(!a.isHTML5&&(8===m&&!a.position&&a.isBuffering)&&a._onbufferchange(0),h.whileplaying&&h.whileplaying.apply(a));return!0};this._oncaptiondata=function(b){a.captiondata=b;a._iO.oncaptiondata&&
a._iO.oncaptiondata.apply(a,[b])};this._onmetadata=function(b,c){var e={},d,f;d=0;for(f=b.length;d<f;d++)e[b[d]]=c[d];a.metadata=e;a._iO.onmetadata&&a._iO.onmetadata.apply(a)};this._onid3=function(b,c){var e=[],d,f;d=0;for(f=b.length;d<f;d++)e[b[d]]=c[d];a.id3=w(a.id3,e);a._iO.onid3&&a._iO.onid3.apply(a)};this._onconnect=function(b){b=1===b;if(a.connected=b)a.failures=0,r(a.id)&&(a.getAutoPlay()?a.play(k,a.getAutoPlay()):a._iO.autoLoad&&a.load()),a._iO.onconnect&&a._iO.onconnect.apply(a,[b])};this._ondataerror=
function(b){0<a.playState&&a._iO.ondataerror&&a._iO.ondataerror.apply(a)}};va=function(){return n.body||n.getElementsByTagName("div")[0]};W=function(b){return n.getElementById(b)};w=function(b,e){var d=b||{},a,f;a=e===k?c.defaultOptions:e;for(f in a)a.hasOwnProperty(f)&&d[f]===k&&(d[f]="object"!==typeof a[f]||null===a[f]?a[f]:w(d[f],a[f]));return d};ga=function(b,c){!b.isHTML5&&8===m?g.setTimeout(c,0):c()};X={onready:1,ontimeout:1,defaultOptions:1,flash9Options:1,movieStarOptions:1};oa=function(b,
e){var d,a=!0,f=e!==k,h=c.setupOptions;for(d in b)if(b.hasOwnProperty(d))if("object"!==typeof b[d]||null===b[d]||b[d]instanceof Array||b[d]instanceof RegExp)f&&X[e]!==k?c[e][d]=b[d]:h[d]!==k?(c.setupOptions[d]=b[d],c[d]=b[d]):X[d]===k?a=!1:c[d]instanceof Function?c[d].apply(c,b[d]instanceof Array?b[d]:[b[d]]):c[d]=b[d];else if(X[d]===k)a=!1;else return oa(b[d],d);return a};t=function(){function b(a){a=fb.call(a);var b=a.length;d?(a[1]="on"+a[1],3<b&&a.pop()):3===b&&a.push(!1);return a}function c(b,
e){var k=b.shift(),g=[a[e]];if(d)k[g](b[0],b[1]);else k[g].apply(k,b)}var d=g.attachEvent,a={add:d?"attachEvent":"addEventListener",remove:d?"detachEvent":"removeEventListener"};return{add:function(){c(b(arguments),"add")},remove:function(){c(b(arguments),"remove")}}}();B={abort:q(function(){}),canplay:q(function(){var b=this._s,c;if(b._html5_canplay)return!0;b._html5_canplay=!0;b._onbufferchange(0);c=b._iO.position!==k&&!isNaN(b._iO.position)?b._iO.position/1E3:null;if(b.position&&this.currentTime!==
c)try{this.currentTime=c}catch(d){}b._iO._oncanplay&&b._iO._oncanplay()}),canplaythrough:q(function(){var b=this._s;b.loaded||(b._onbufferchange(0),b._whileloading(b.bytesLoaded,b.bytesTotal,b._get_html5_duration()),b._onload(!0))}),ended:q(function(){this._s._onfinish()}),error:q(function(){this._s._onload(!1)}),loadeddata:q(function(){var b=this._s;!b._loaded&&!ia&&(b.duration=b._get_html5_duration())}),loadedmetadata:q(function(){}),loadstart:q(function(){this._s._onbufferchange(1)}),play:q(function(){this._s._onbufferchange(0)}),
playing:q(function(){this._s._onbufferchange(0)}),progress:q(function(b){var c=this._s,d,a,f=0,f=b.target.buffered;d=b.loaded||0;var h=b.total||1;c.buffered=[];if(f&&f.length){d=0;for(a=f.length;d<a;d++)c.buffered.push({start:1E3*f.start(d),end:1E3*f.end(d)});f=1E3*(f.end(0)-f.start(0));d=Math.min(1,f/(1E3*b.target.duration))}isNaN(d)||(c._onbufferchange(0),c._whileloading(d,h,c._get_html5_duration()),d&&(h&&d===h)&&B.canplaythrough.call(this,b))}),ratechange:q(function(){}),suspend:q(function(b){var c=
this._s;B.progress.call(this,b);c._onsuspend()}),stalled:q(function(){}),timeupdate:q(function(){this._s._onTimer()}),waiting:q(function(){this._s._onbufferchange(1)})};ea=function(b){return!b||!b.type&&!b.url&&!b.serverURL?!1:b.serverURL||b.type&&V(b.type)?!1:b.type?T({type:b.type}):T({url:b.url})||c.html5Only||b.url.match(/data\:/i)};fa=function(b){var e;b&&(e=ia?"about:blank":c.html5.canPlayType("audio/wav")?"data:audio/wave;base64,/UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAD//w\x3d\x3d":
"about:blank",b.src=e,void 0!==b._called_unload&&(b._called_load=!1));A&&(Ca=null);return e};T=function(b){if(!c.useHTML5Audio||!c.hasHTML5)return!1;var e=b.url||null;b=b.type||null;var d=c.audioFormats,a;if(b&&c.html5[b]!==k)return c.html5[b]&&!V(b);if(!z){z=[];for(a in d)d.hasOwnProperty(a)&&(z.push(a),d[a].related&&(z=z.concat(d[a].related)));z=RegExp("\\.("+z.join("|")+")(\\?.*)?$","i")}a=e?e.toLowerCase().match(z):null;!a||!a.length?b&&(e=b.indexOf(";"),a=(-1!==e?b.substr(0,e):b).substr(6)):
a=a[1];a&&c.html5[a]!==k?e=c.html5[a]&&!V(a):(b="audio/"+a,e=c.html5.canPlayType({type:b}),e=(c.html5[a]=e)&&c.html5[b]&&!V(b));return e};Wa=function(){function b(a){var b,d=b=!1;if(!e||"function"!==typeof e.canPlayType)return b;if(a instanceof Array){g=0;for(b=a.length;g<b;g++)if(c.html5[a[g]]||e.canPlayType(a[g]).match(c.html5Test))d=!0,c.html5[a[g]]=!0,c.flash[a[g]]=!!a[g].match(bb);b=d}else a=e&&"function"===typeof e.canPlayType?e.canPlayType(a):!1,b=!(!a||!a.match(c.html5Test));return b}if(!c.useHTML5Audio||
!c.hasHTML5)return u=c.html5.usingFlash=!0,!1;var e=Audio!==k?Ea&&10>opera.version()?new Audio(null):new Audio:null,d,a,f={},h,g;h=c.audioFormats;for(d in h)if(h.hasOwnProperty(d)&&(a="audio/"+d,f[d]=b(h[d].type),f[a]=f[d],d.match(bb)?(c.flash[d]=!0,c.flash[a]=!0):(c.flash[d]=!1,c.flash[a]=!1),h[d]&&h[d].related))for(g=h[d].related.length-1;0<=g;g--)f["audio/"+h[d].related[g]]=f[d],c.html5[h[d].related[g]]=f[d],c.flash[h[d].related[g]]=f[d];f.canPlayType=e?b:null;c.html5=w(c.html5,f);c.html5.usingFlash=
Va();u=c.html5.usingFlash;return!0};sa={};P=function(){};aa=function(b){8===m&&(1<b.loops&&b.stream)&&(b.stream=!1);return b};ba=function(b,c){if(b&&!b.usePolicyFile&&(b.onid3||b.usePeakData||b.useWaveformData||b.useEQData))b.usePolicyFile=!0;return b};la=function(){return!1};Pa=function(b){for(var c in b)b.hasOwnProperty(c)&&"function"===typeof b[c]&&(b[c]=la)};xa=function(b){b===k&&(b=!1);(y||b)&&c.disable(b)};Qa=function(b){var e=null;if(b)if(b.match(/\.swf(\?.*)?$/i)){if(e=b.substr(b.toLowerCase().lastIndexOf(".swf?")+
4))return b}else b.lastIndexOf("/")!==b.length-1&&(b+="/");b=(b&&-1!==b.lastIndexOf("/")?b.substr(0,b.lastIndexOf("/")+1):"./")+c.movieURL;c.noSWFCache&&(b+="?ts\x3d"+(new Date).getTime());return b};ra=function(){m=parseInt(c.flashVersion,10);8!==m&&9!==m&&(c.flashVersion=m=8);var b=c.debugMode||c.debugFlash?"_debug.swf":".swf";c.useHTML5Audio&&(!c.html5Only&&c.audioFormats.mp4.required&&9>m)&&(c.flashVersion=m=9);c.version=c.versionNumber+(c.html5Only?" (HTML5-only mode)":9===m?" (AS3/Flash 9)":
" (AS2/Flash 8)");8<m?(c.defaultOptions=w(c.defaultOptions,c.flash9Options),c.features.buffering=!0,c.defaultOptions=w(c.defaultOptions,c.movieStarOptions),c.filePatterns.flash9=RegExp("\\.(mp3|"+eb.join("|")+")(\\?.*)?$","i"),c.features.movieStar=!0):c.features.movieStar=!1;c.filePattern=c.filePatterns[8!==m?"flash9":"flash8"];c.movieURL=(8===m?"soundmanager2.swf":"soundmanager2_flash9.swf").replace(".swf",b);c.features.peakData=c.features.waveformData=c.features.eqData=8<m};Oa=function(b,c){if(!l)return!1;
l._setPolling(b,c)};wa=function(){};r=this.getSoundById;I=function(){var b=[];c.debugMode&&b.push("sm2_debug");c.debugFlash&&b.push("flash_debug");c.useHighPerformance&&b.push("high_performance");return b.join(" ")};za=function(){P("fbHandler");var b=c.getMoviePercent(),e={type:"FLASHBLOCK"};if(c.html5Only)return!1;c.ok()?c.oMC&&(c.oMC.className=[I(),"movieContainer","swf_loaded"+(c.didFlashBlock?" swf_unblocked":"")].join(" ")):(u&&(c.oMC.className=I()+" movieContainer "+(null===b?"swf_timedout":
"swf_error")),c.didFlashBlock=!0,D({type:"ontimeout",ignoreInit:!0,error:e}),H(e))};pa=function(b,c,d){x[b]===k&&(x[b]=[]);x[b].push({method:c,scope:d||null,fired:!1})};D=function(b){b||(b={type:c.ok()?"onready":"ontimeout"});if(!p&&b&&!b.ignoreInit||"ontimeout"===b.type&&(c.ok()||y&&!b.ignoreInit))return!1;var e={success:b&&b.ignoreInit?c.ok():!y},d=b&&b.type?x[b.type]||[]:[],a=[],f,e=[e],h=u&&!c.ok();b.error&&(e[0].error=b.error);b=0;for(f=d.length;b<f;b++)!0!==d[b].fired&&a.push(d[b]);if(a.length){b=
0;for(f=a.length;b<f;b++)a[b].scope?a[b].method.apply(a[b].scope,e):a[b].method.apply(this,e),h||(a[b].fired=!0)}return!0};E=function(){g.setTimeout(function(){c.useFlashBlock&&za();D();"function"===typeof c.onload&&c.onload.apply(g);c.waitForWindowLoad&&t.add(g,"load",E)},1)};Da=function(){if(v!==k)return v;var b=!1,c=navigator,d=c.plugins,a,f=g.ActiveXObject;if(d&&d.length)(c=c.mimeTypes)&&(c["application/x-shockwave-flash"]&&c["application/x-shockwave-flash"].enabledPlugin&&c["application/x-shockwave-flash"].enabledPlugin.description)&&
(b=!0);else if(f!==k&&!s.match(/MSAppHost/i)){try{a=new f("ShockwaveFlash.ShockwaveFlash")}catch(h){a=null}b=!!a}return v=b};Va=function(){var b,e,d=c.audioFormats;if(ha&&s.match(/os (1|2|3_0|3_1)/i))c.hasHTML5=!1,c.html5Only=!0,c.oMC&&(c.oMC.style.display="none");else if(c.useHTML5Audio&&(!c.html5||!c.html5.canPlayType))c.hasHTML5=!1;if(c.useHTML5Audio&&c.hasHTML5)for(e in S=!0,d)if(d.hasOwnProperty(e)&&d[e].required)if(c.html5.canPlayType(d[e].type)){if(c.preferFlash&&(c.flash[e]||c.flash[d[e].type]))b=
!0}else S=!1,b=!0;c.ignoreFlash&&(b=!1,S=!0);c.html5Only=c.hasHTML5&&c.useHTML5Audio&&!b;return!c.html5Only};da=function(b){var e,d,a=0;if(b instanceof Array){e=0;for(d=b.length;e<d;e++)if(b[e]instanceof Object){if(c.canPlayMIME(b[e].type)){a=e;break}}else if(c.canPlayURL(b[e])){a=e;break}b[a].url&&(b[a]=b[a].url);b=b[a]}return b};Ra=function(b){b._hasTimer||(b._hasTimer=!0,!Fa&&c.html5PollingInterval&&(null===R&&0===ca&&(R=setInterval(Ta,c.html5PollingInterval)),ca++))};Sa=function(b){b._hasTimer&&
(b._hasTimer=!1,!Fa&&c.html5PollingInterval&&ca--)};Ta=function(){var b;if(null!==R&&!ca)return clearInterval(R),R=null,!1;for(b=c.soundIDs.length-1;0<=b;b--)c.sounds[c.soundIDs[b]].isHTML5&&c.sounds[c.soundIDs[b]]._hasTimer&&c.sounds[c.soundIDs[b]]._onTimer()};H=function(b){b=b!==k?b:{};"function"===typeof c.onerror&&c.onerror.apply(g,[{type:b.type!==k?b.type:null}]);b.fatal!==k&&b.fatal&&c.disable()};Xa=function(){if(!$a||!Da())return!1;var b=c.audioFormats,e,d;for(d in b)if(b.hasOwnProperty(d)&&
("mp3"===d||"mp4"===d))if(c.html5[d]=!1,b[d]&&b[d].related)for(e=b[d].related.length-1;0<=e;e--)c.html5[b[d].related[e]]=!1};this._setSandboxType=function(b){};this._externalInterfaceOK=function(b){if(c.swfLoaded)return!1;c.swfLoaded=!0;ja=!1;$a&&Xa();setTimeout(ma,C?100:1)};$=function(b,e){function d(a,b){return'\x3cparam name\x3d"'+a+'" value\x3d"'+b+'" /\x3e'}if(K&&L)return!1;if(c.html5Only)return ra(),c.oMC=W(c.movieID),ma(),L=K=!0,!1;var a=e||c.url,f=c.altURL||a,h=va(),g=I(),l=null,l=n.getElementsByTagName("html")[0],
m,p,q,l=l&&l.dir&&l.dir.match(/rtl/i);b=b===k?c.id:b;ra();c.url=Qa(Ha?a:f);e=c.url;c.wmode=!c.wmode&&c.useHighPerformance?"transparent":c.wmode;if(null!==c.wmode&&(s.match(/msie 8/i)||!C&&!c.useHighPerformance)&&navigator.platform.match(/win32|win64/i))Ua.push(sa.spcWmode),c.wmode=null;h={name:b,id:b,src:e,quality:"high",allowScriptAccess:c.allowScriptAccess,bgcolor:c.bgColor,pluginspage:cb+"www.macromedia.com/go/getflashplayer",title:"JS/Flash audio component (SoundManager 2)",type:"application/x-shockwave-flash",
wmode:c.wmode,hasPriority:"true"};c.debugFlash&&(h.FlashVars="debug\x3d1");c.wmode||delete h.wmode;if(C)a=n.createElement("div"),p=['\x3cobject id\x3d"'+b+'" data\x3d"'+e+'" type\x3d"'+h.type+'" title\x3d"'+h.title+'" classid\x3d"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase\x3d"'+cb+'download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version\x3d6,0,40,0"\x3e',d("movie",e),d("AllowScriptAccess",c.allowScriptAccess),d("quality",h.quality),c.wmode?d("wmode",c.wmode):"",d("bgcolor",
c.bgColor),d("hasPriority","true"),c.debugFlash?d("FlashVars",h.FlashVars):"","\x3c/object\x3e"].join("");else for(m in a=n.createElement("embed"),h)h.hasOwnProperty(m)&&a.setAttribute(m,h[m]);wa();g=I();if(h=va())if(c.oMC=W(c.movieID)||n.createElement("div"),c.oMC.id)q=c.oMC.className,c.oMC.className=(q?q+" ":"movieContainer")+(g?" "+g:""),c.oMC.appendChild(a),C&&(m=c.oMC.appendChild(n.createElement("div")),m.className="sm2-object-box",m.innerHTML=p),L=!0;else{c.oMC.id=c.movieID;c.oMC.className=
"movieContainer "+g;m=g=null;c.useFlashBlock||(c.useHighPerformance?g={position:"fixed",width:"8px",height:"8px",bottom:"0px",left:"0px",overflow:"hidden"}:(g={position:"absolute",width:"6px",height:"6px",top:"-9999px",left:"-9999px"},l&&(g.left=Math.abs(parseInt(g.left,10))+"px")));gb&&(c.oMC.style.zIndex=1E4);if(!c.debugFlash)for(q in g)g.hasOwnProperty(q)&&(c.oMC.style[q]=g[q]);try{C||c.oMC.appendChild(a),h.appendChild(c.oMC),C&&(m=c.oMC.appendChild(n.createElement("div")),m.className="sm2-object-box",
m.innerHTML=p),L=!0}catch(r){throw Error(P("domError")+" \n"+r.toString());}}return K=!0};Z=function(){if(c.html5Only)return $(),!1;if(l||!c.url)return!1;l=c.getMovie(c.id);l||(O?(C?c.oMC.innerHTML=ya:c.oMC.appendChild(O),O=null,K=!0):$(c.id,c.url),l=c.getMovie(c.id));"function"===typeof c.oninitmovie&&setTimeout(c.oninitmovie,1);return!0};F=function(){setTimeout(Na,1E3)};qa=function(){g.setTimeout(function(){c.setup({preferFlash:!1}).reboot();c.didFlashBlock=!0;c.beginDelayedInit()},1)};Na=function(){var b,
e=!1;if(!c.url||Q)return!1;Q=!0;t.remove(g,"load",F);if(v&&ja&&!Ga)return!1;p||(b=c.getMoviePercent(),0<b&&100>b&&(e=!0));setTimeout(function(){b=c.getMoviePercent();if(e)return Q=!1,g.setTimeout(F,1),!1;!p&&ab&&(null===b?c.useFlashBlock||0===c.flashLoadTimeout?c.useFlashBlock&&za():!c.useFlashBlock&&S?qa():D({type:"ontimeout",ignoreInit:!0,error:{type:"INIT_FLASHBLOCK"}}):0!==c.flashLoadTimeout&&(!c.useFlashBlock&&S?qa():xa(!0)))},c.flashLoadTimeout)};Y=function(){if(Ga||!ja)return t.remove(g,"focus",
Y),!0;Ga=ab=!0;Q=!1;F();t.remove(g,"focus",Y);return!0};M=function(b){if(p)return!1;if(c.html5Only)return p=!0,E(),!0;var e=!0,d;if(!c.useFlashBlock||!c.flashLoadTimeout||c.getMoviePercent())p=!0;d={type:!v&&u?"NO_FLASH":"INIT_TIMEOUT"};if(y||b)c.useFlashBlock&&c.oMC&&(c.oMC.className=I()+" "+(null===c.getMoviePercent()?"swf_timedout":"swf_error")),D({type:"ontimeout",error:d,ignoreInit:!0}),H(d),e=!1;y||(c.waitForWindowLoad&&!na?t.add(g,"load",E):E());return e};Ma=function(){var b,e=c.setupOptions;
for(b in e)e.hasOwnProperty(b)&&(c[b]===k?c[b]=e[b]:c[b]!==e[b]&&(c.setupOptions[b]=c[b]))};ma=function(){if(p)return!1;if(c.html5Only)return p||(t.remove(g,"load",c.beginDelayedInit),c.enabled=!0,M()),!0;Z();try{l._externalInterfaceTest(!1),Oa(!0,c.flashPollingInterval||(c.useHighPerformance?10:50)),c.debugMode||l._disableDebug(),c.enabled=!0,c.html5Only||t.add(g,"unload",la)}catch(b){return H({type:"JS_TO_FLASH_EXCEPTION",fatal:!0}),xa(!0),M(),!1}M();t.remove(g,"load",c.beginDelayedInit);return!0};
G=function(){if(N)return!1;N=!0;Ma();wa();!v&&c.hasHTML5&&c.setup({useHTML5Audio:!0,preferFlash:!1});Wa();!v&&u&&(Ua.push(sa.needFlash),c.setup({flashLoadTimeout:1}));n.removeEventListener&&n.removeEventListener("DOMContentLoaded",G,!1);Z();return!0};Ba=function(){"complete"===n.readyState&&(G(),n.detachEvent("onreadystatechange",Ba));return!0};ua=function(){na=!0;t.remove(g,"load",ua)};ta=function(){if(Fa&&(c.setupOptions.useHTML5Audio=!0,c.setupOptions.preferFlash=!1,ha||Za&&!s.match(/android\s2\.3/i)))ha&&
(c.ignoreFlash=!0),A=!0};ta();Da();t.add(g,"focus",Y);t.add(g,"load",F);t.add(g,"load",ua);n.addEventListener?n.addEventListener("DOMContentLoaded",G,!1):n.attachEvent?n.attachEvent("onreadystatechange",Ba):H({type:"NO_DOM2_EVENTS",fatal:!0})}var ka=null;if(void 0===g.SM2_DEFER||!SM2_DEFER)ka=new U;g.SoundManager=U;g.soundManager=ka})(window);