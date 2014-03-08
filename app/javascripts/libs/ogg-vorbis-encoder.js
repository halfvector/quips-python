// Note: For maximum-speed code, see "Optimizing Code" on the Emscripten wiki, https://github.com/kripken/emscripten/wiki/Optimizing-Code
// Note: Some Emscripten settings may limit the speed of the generated code.
// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = eval('(function() { try { return Module || {} } catch(e) { return {} } })()');

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  Module['arguments'] = process['argv'].slice(2);

  module['exports'] = Module;
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    return read(f, 'binary');
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  this['Module'] = Module;

  eval("if (typeof gc === 'function' && gc.toString().indexOf('[native code]') > 0) var gc = undefined"); // wipe out the SpiderMonkey shell 'gc' function, which can confuse closure (uses it as a minified name, and it is then initted to a non-falsey value unexpectedly)
}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WEB) {
    this['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Auto-generated preamble library stuff ===

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  forceAlign: function (target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target/quantum)*quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      return '(((' +target + ')+' + (quantum-1) + ')&' + -quantum + ')';
    }
    return 'Math.ceil((' + target + ')/' + quantum + ')*' + quantum;
  },
  isNumberType: function (type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  },
  isPointerType: function isPointerType(type) {
  return type[type.length-1] == '*';
},
  isStructType: function isStructType(type) {
  if (isPointerType(type)) return false;
  if (isArrayType(type)) return true;
  if (/<?\{ ?[^}]* ?\}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
  // See comment in isStructPointerType()
  return type[0] == '%';
},
  INT_TYPES: {"i1":0,"i8":0,"i16":0,"i32":0,"i64":0},
  FLOAT_TYPES: {"float":0,"double":0},
  or64: function (x, y) {
    var l = (x | 0) | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  and64: function (x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  xor64: function (x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  dedup: function dedup(items, ident) {
  var seen = {};
  if (ident) {
    return items.filter(function(item) {
      if (seen[item[ident]]) return false;
      seen[item[ident]] = true;
      return true;
    });
  } else {
    return items.filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
},
  set: function set() {
  var args = typeof arguments[0] === 'object' ? arguments[0] : arguments;
  var ret = {};
  for (var i = 0; i < args.length; i++) {
    ret[args[i]] = 0;
  }
  return ret;
},
  STACK_ALIGN: 8,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (vararg) return 8;
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    var index = 0;
    type.flatIndexes = type.fields.map(function(field) {
      index++;
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = Runtime.getAlignSize(field, size);
      } else if (Runtime.isStructType(field)) {
        if (field[1] === '0') {
          // this is [0 x something]. When inside another structure like here, it must be at the end,
          // and it adds no size
          // XXX this happens in java-nbody for example... assert(index === type.fields.length, 'zero-length in the middle!');
          size = 0;
          if (Types.types[field]) {
            alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
          } else {
            alignSize = type.alignSize || QUANTUM_SIZE;
          }
        } else {
          size = Types.types[field].flatSize;
          alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
        }
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else if (field[0] === '<') {
        // vector type
        size = alignSize = Types.types[field].flatSize; // fully aligned
      } else if (field[0] === 'i') {
        // illegal integer field, that could not be legalized because it is an internal structure field
        // it is ok to have such fields, if we just use them as markers of field size and nothing more complex
        size = alignSize = parseInt(field.substr(1))/8;
        assert(size % 1 === 0, 'cannot handle non-byte-size field ' + field);
      } else {
        assert(false, 'invalid type for calculateStructAlignment');
      }
      if (type.packed) alignSize = 1;
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize); // if necessary, place this on aligned memory
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr-prev);
      }
      prev = curr;
      return curr;
    });
    if (type.name_ && type.name_[0] === '[') {
      // arrays have 2 elements, so we get the proper difference. then we scale here. that way we avoid
      // allocating a potentially huge array for [999999 x i8] etc.
      type.flatSize = parseInt(type.name_.substr(1))*type.flatSize/2;
    }
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = (type.flatFactor != 1);
    return type.flatIndexes;
  },
  generateStructInfo: function (struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === 'undefined' ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr('Number of named fields must match the type for ' + typeName + ': possibly duplicate struct names. Cannot return structInfo');
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = { fields: struct.map(function(item) { return item[0] }) };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach(function(item, i) {
        if (typeof item === 'string') {
          ret[item] = alignment[i] + offset;
        } else {
          // embedded struct
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      });
    } else {
      struct.forEach(function(item, i) {
        ret[item[1]] = alignment[i];
      });
    }
    return ret;
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    code = Pointer_stringify(code);
    if (code[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (code.indexOf('"', 1) === code.length-1) {
        code = code.substr(1, code.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + code + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    return Runtime.asmConstCache[code] = eval('(function(' + args.join(',') + '){ ' + code + ' })'); // new Function does not allow upvars in node
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;

      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }

      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }

      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          Math.floor((codePoint - 0x10000) / 0x400) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function processJSString(string) {
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+7)&-8); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+7)&-8); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+7)&-8); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 8))*(quantum ? quantum : 8); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;









//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// C calling interface. A convenient way to call C functions (in C files, or
// defined with extern "C").
//
// Note: LLVM optimizations can inline and remove functions, after which you will not be
//       able to call them. Closure can also do so. To avoid that, add your function to
//       the exports using something like
//
//         -s EXPORTED_FUNCTIONS='["_main", "_myfunc"]'
//
// @param ident      The name of the C function (note that C++ functions will be name-mangled - use extern "C")
// @param returnType The return type of the function, one of the JS types 'number', 'string' or 'array' (use 'number' for any C pointer, and
//                   'array' for JavaScript arrays and typed arrays; note that arrays are 8-bit).
// @param argTypes   An array of the types of arguments for the function (if there are no arguments, this can be ommitted). Types are as in returnType,
//                   except that 'array' is not possible (there is no way for us to know the length of the array)
// @param args       An array of the arguments to the function, as native JS values (as in returnType)
//                   Note that string arguments will be stored on the stack (the JS string will become a C string on the stack).
// @return           The return value, as a native JS value (as in returnType)
function ccall(ident, returnType, argTypes, args) {
  return ccallFunc(getCFunc(ident), returnType, argTypes, args);
}
Module["ccall"] = ccall;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  try {
    var func = Module['_' + ident]; // closure exported function
    if (!func) func = eval('_' + ident); // explicit lookup
  } catch(e) {
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

// Internal function that does a C call using a function, not an identifier
function ccallFunc(func, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == 'string') {
      if (value === null || value === undefined || value === 0) return 0; // null string
      value = intArrayFromString(value);
      type = 'array';
    }
    if (type == 'array') {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == 'string') {
      return Pointer_stringify(value);
    }
    assert(type != 'array');
    return value;
  }
  var i = 0;
  var cArgs = args ? args.map(function(arg) {
    return toC(arg, argTypes[i++]);
  }) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}

// Returns a native JS wrapper for a C function. This is similar to ccall, but
// returns a function you can call repeatedly in a normal way. For example:
//
//   var my_function = cwrap('my_c_function', 'number', ['number', 'number']);
//   alert(my_function(5, 22));
//   alert(my_function(99, 12));
//
function cwrap(ident, returnType, argTypes) {
  var func = getCFunc(ident);
  return function() {
    return ccallFunc(func, returnType, argTypes, Array.prototype.slice.call(arguments));
  }
}
Module["cwrap"] = cwrap;

// Sets a value in memory in a dynamic way at run-time. Uses the
// type data. This is the same as makeSetValue, except that
// makeSetValue is done at compile-time and generates the needed
// code then, whereas this function picks the right code at
// run-time.
// Note that setValue and getValue only do *aligned* writes and reads!
// Note that ccall uses JS types as for defining types, while setValue and
// getValue need LLVM types ('i8', 'i32') - this is a lower-level operation
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[(ptr)]=value; break;
      case 'i8': HEAP8[(ptr)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;

// Parallel to setValue.
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[(ptr)];
      case 'i8': return HEAP8[(ptr)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)|0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

// Aleckz: hack for base64 encoding

function b64ToUint6 (nChr) {
  return nChr > 64 && nChr < 91 ?
    nChr - 65 : nChr > 96 && nChr < 123 ?
    nChr - 71 : nChr > 47 && nChr < 58 ?
    nChr + 4 : nChr === 43 ? 62 : nChr === 47 ? 63 : 0;
}

function base64DecToArr (sBase64, nBlocksSize) {
  var
    sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""), nInLen = sB64Enc.length,
    nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize
            : nInLen * 3 + 1 >> 2, taBytes = new Uint8Array(nOutLen);

  for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
    nMod4 = nInIdx & 3;
    nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
    if (nMod4 === 3 || nInLen - nInIdx === 1) {
      for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
        taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
      }
      nUint24 = 0;
    }
  }

  return taBytes;
}

// special base64 allocator
// assumes: allocator = ALLOC_NONE and types = i8
function allocateBase64Encoded(slab, length, types, allocator, ptr) {
  HEAPU8.set(base64DecToArr(slab), ptr);
}

function Pointer_stringify(ptr, /* optional */ length) {
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))|0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }

  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    t = HEAPU8[(((ptr)+(i))|0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16LE form. The copy will require at most (str.length*2+1)*2 bytes of space in the HEAP.
function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0;
}
Module['stringToUTF16'] = stringToUTF16;

// Given a pointer 'ptr' to a null-terminated UTF32LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32LE form. The copy will require at most (str.length+1)*4 bytes of space in the HEAP,
// but can use less, since str.length does not return the number of characters in the string, but the number of UTF-16 code units in the string.
function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit;
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0;
}
Module['stringToUTF32'] = stringToUTF32;

function demangle(func) {
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    var i = 3;
    // params, etc.
    var basicTypes = {
      'v': 'void',
      'b': 'bool',
      'c': 'char',
      's': 'short',
      'i': 'int',
      'l': 'long',
      'f': 'float',
      'd': 'double',
      'w': 'wchar_t',
      'a': 'signed char',
      'h': 'unsigned char',
      't': 'unsigned short',
      'j': 'unsigned int',
      'm': 'unsigned long',
      'x': 'long long',
      'y': 'unsigned long long',
      'z': '...'
    };
    function dump(x) {
      //return;
      if (x) Module.print(x);
      Module.print(func);
      var pre = '';
      for (var a = 0; a < i; a++) pre += ' ';
      Module.print (pre + '^');
    }
    var subs = [];
    function parseNested() {
      i++;
      if (func[i] === 'K') i++; // ignore const
      var parts = [];
      while (func[i] !== 'E') {
        if (func[i] === 'S') { // substitution
          i++;
          var next = func.indexOf('_', i);
          var num = func.substring(i, next) || 0;
          parts.push(subs[num] || '?');
          i = next+1;
          continue;
        }
        if (func[i] === 'C') { // constructor
          parts.push(parts[parts.length-1]);
          i += 2;
          continue;
        }
        var size = parseInt(func.substr(i));
        var pre = size.toString().length;
        if (!size || !pre) { i--; break; } // counter i++ below us
        var curr = func.substr(i + pre, size);
        parts.push(curr);
        subs.push(curr);
        i += pre + size;
      }
      i++; // skip E
      return parts;
    }
    var first = true;
    function parse(rawList, limit, allowVoid) { // main parser
      limit = limit || Infinity;
      var ret = '', list = [];
      function flushList() {
        return '(' + list.join(', ') + ')';
      }
      var name;
      if (func[i] === 'N') {
        // namespaced N-E
        name = parseNested().join('::');
        limit--;
        if (limit === 0) return rawList ? [name] : name;
      } else {
        // not namespaced
        if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
        var size = parseInt(func.substr(i));
        if (size) {
          var pre = size.toString().length;
          name = func.substr(i + pre, size);
          i += pre + size;
        }
      }
      first = false;
      if (func[i] === 'I') {
        i++;
        var iList = parse(true);
        var iRet = parse(true, 1, true);
        ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
      } else {
        ret = name;
      }
      paramLoop: while (i < func.length && limit-- > 0) {
        //dump('paramLoop');
        var c = func[i++];
        if (c in basicTypes) {
          list.push(basicTypes[c]);
        } else {
          switch (c) {
            case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
            case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
            case 'L': { // literal
              i++; // skip basic type
              var end = func.indexOf('E', i);
              var size = end - i;
              list.push(func.substr(i, size));
              i += size + 2; // size + 'EE'
              break;
            }
            case 'A': { // array
              var size = parseInt(func.substr(i));
              i += size.toString().length;
              if (func[i] !== '_') throw '?';
              i++; // skip _
              list.push(parse(true, 1, true)[0] + ' [' + size + ']');
              break;
            }
            case 'E': break paramLoop;
            default: ret += '?' + c; break paramLoop;
          }
        }
      }
      if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
      return rawList ? list : ret + flushList();
    }
    return parse();
  } catch(e) {
    return func;
  }
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function stackTrace() {
  var stack = new Error().stack;
  return stack ? demangleAll(stack) : '(no stack trace available)'; // Stack trace is not available at least on IE10 and Safari 6.
}

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays in asm.js. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', or (2) set Module.TOTAL_MEMORY before the program runs.');
}

var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;

var totalMemory = 4096;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be more reasonable');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'Cannot fallback to non-typed array case: Code is too specialized');

var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools

// This processes a JS string into a C-line array of numbers, 0-terminated.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

// Write a Javascript array to somewhere in the heap
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))|0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))|0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===



STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 246992;


/* global initializers */ __ATINIT__.push({ func: function() { runPostSets() } });































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































var __ZTVN10__cxxabiv120__si_class_type_infoE;
__ZTVN10__cxxabiv120__si_class_type_infoE=allocate([0,0,0,0,136,156,3,0,20,0,0,0,26,0,0,0,22,0,0,0,16,0,0,0,2,0,0,0,4,0,0,0,2,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);;
var __ZTVN10__cxxabiv117__class_type_infoE;
__ZTVN10__cxxabiv117__class_type_infoE=allocate([0,0,0,0,152,156,3,0,20,0,0,0,10,0,0,0,22,0,0,0,16,0,0,0,2,0,0,0,2,0,0,0,4,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);;


















































































































































































































































































































































































































/* memory initializer (tweaked) */ allocateBase64Encoded("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", 10240, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer (tweaked) */ allocateBase64Encoded("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", 10240, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+10240);
/* memory initializer (tweaked) */ allocateBase64Encoded("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", 10240, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+20480);
/* memory initializer (tweaked) */ allocateBase64Encoded("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AADEwgAAysIAANTCAADcwgAAhMIAAITCAACEwgAAhMIAAITCAACEwgAAhMIAAITCAACEwgAAhMIAAITCAACEwgAAhMIAAIbCAACGwgAAhsIAAJjCAACQwgAAjsIAAJTCAACYwgAAmMIAAJbCAACcwgAAnsIAAJ7CAACiwgAApsIAAKzCAACywgAAusIAAMLCAADIwgAA0sIAANzCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAAA8wgAAPMIAADzCAAA8wgAAPMIAADzCAAA8wgAAPMIAADzCAAA8wgAAPMIAAEDCAABMwgAAXMIAAGzCAACEwgAAhMIAAITCAACGwgAAhMIAAIjCAACKwgAAjMIAAJTCAACewgAAmsIAAJrCAACcwgAAoMIAAKLCAACkwgAAqMIAAKzCAACwwgAAtsIAAL7CAADIwgAA2MIAAOjCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAABDCAAAQwgAAEMIAABDCAAAQwgAAEMIAABDCAAAQwgAAEMIAABTCAAAUwgAAJMIAADDCAABAwgAATMIAAGjCAAB4wgAAcMIAAGTCAABswgAAbMIAAHDCAAB8wgAAgsIAAJDCAACOwgAAjMIAAJDCAACUwgAAmsIAAJjCAACcwgAAosIAAKLCAACgwgAApsIAAKzCAAC2wgAAwMIAAMjCAADSwgAA3MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA4MEAAODBAADgwQAA4MEAAODBAADgwQAA4MEAAODBAADgwQAA8MEAAADCAAAAwgAABMIAAAzCAAAkwgAARMIAAEjCAABEwgAAPMIAAEDCAABAwgAAUMIAAEzCAABkwgAAgsIAAHTCAABswgAAdMIAAIDCAACKwgAAjMIAAJTCAACawgAAmsIAAJzCAACiwgAAqMIAAKrCAACuwgAAtMIAALjCAADAwgAAyMIAANbCAADgwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAACYwQAAmMEAAJjBAACYwQAAmMEAAJjBAACYwQAAmMEAAKDBAACowQAAuMEAANjBAADwwQAADMIAABDCAAAkwgAAOMIAADDCAAAowgAAIMIAACTCAAAkwgAALMIAAEDCAABcwgAAVMIAAFDCAABUwgAAYMIAAGzCAABowgAAcMIAAIbCAACEwgAAisIAAI7CAACQwgAAlsIAAJ7CAACiwgAAqMIAAK7CAAC0wgAAusIAAMLCAADKwgAA1sIAAOTCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAABDBAAAQwQAAEMEAABDBAAAQwQAAEMEAABDBAAAQwQAAMMEAAEDBAABAwQAAcMEAAIDBAACgwQAAuMEAAPDBAAAUwgAACMIAAATCAAAIwgAA+MEAAADCAAAAwgAAGMIAADzCAAAwwgAAJMIAACDCAAA8wgAARMIAADjCAAA4wgAAaMIAAEjCAABIwgAAWMIAAGjCAAB4wgAAgMIAAIbCAACGwgAAjMIAAJDCAACYwgAAnsIAAKbCAACuwgAAtsIAAMDCAADIwgAA0MIAANzCAMB5xADAecQAwHnEAMB5xAAAeMIAAHjCAAB4wgAAeMIAAHjCAAB4wgAAeMIAAHjCAAB4wgAAeMIAAHzCAACAwgAAhMIAAIbCAACEwgAAiMIAAJbCAACQwgAAmMIAAJbCAACYwgAAnMIAAJ7CAACkwgAAqMIAAKrCAAC0wgAAvMIAAMrCAADcwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAABswgAAbMIAAGzCAABswgAAbMIAAGzCAABswgAAbMIAAGzCAABswgAAbMIAAHDCAABwwgAAdMIAAHzCAACEwgAAjsIAAIjCAACMwgAAjMIAAI7CAACQwgAAkMIAAJbCAACiwgAAnMIAAJ7CAACkwgAApsIAAKzCAAC0wgAAwsIAAM7CAADiwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAAFTCAABUwgAAVMIAAFTCAABUwgAAVMIAAFTCAABUwgAAVMIAAFjCAABcwgAAZMIAAGDCAABkwgAAXMIAAHTCAACCwgAAcMIAAHDCAAB4wgAAfMIAAHzCAACEwgAAiMIAAJTCAACSwgAAlsIAAJbCAACcwgAAoMIAAKDCAACkwgAAqsIAALTCAADAwgAAysIAANjCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAAOMIAADjCAAA4wgAAOMIAADjCAAA4wgAAOMIAADjCAAA4wgAAOMIAADzCAAA8wgAAPMIAADzCAABAwgAATMIAAGTCAABMwgAARMIAAEjCAABMwgAAVMIAAFjCAABswgAAhMIAAHDCAAB4wgAAhsIAAIbCAACMwgAAkMIAAJbCAACYwgAAnMIAAKLCAACqwgAAsMIAALzCAADCwgAA0MIAAODCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAAAQwgAAEMIAABDCAAAQwgAAEMIAABDCAAAQwgAAEMIAABzCAAAkwgAAKMIAACjCAAAcwgAAGMIAACTCAAAswgAAUMIAADDCAAAgwgAAHMIAABTCAAAUwgAAIMIAADzCAABYwgAASMIAAEDCAABIwgAAXMIAAHTCAABswgAAeMIAAITCAACEwgAAhMIAAIrCAACKwgAAksIAAJTCAACUwgAAlsIAAJrCAACewgAApMIAAK7CAAC2wgAAvsIAAMjCAADYwgAA5sIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAAODBAADQwQAAwMEAALDBAACgwQAAoMEAALjBAADowQAA8MEAAPjBAADgwQAA2MEAAODBAADgwQAA4MEAAAzCAAAgwgAABMIAAADCAADowQAA8MEAAPDBAADwwQAAFMIAADTCAAAkwgAAFMIAABjCAAA0wgAAPMIAADzCAABAwgAAVMIAAETCAABAwgAASMIAAETCAABEwgAATMIAAFDCAABowgAAYMIAAGTCAABgwgAAcMIAAHTCAAB4wgAAjMIAAJDCAACUwgAAnMIAAKbCAACwwgAAusIAAMjCAADUwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA3MIAANLCAADIwgAAvsIAALbCAACuwgAApsIAAKDCAACcwgAAmMIAAJzCAACcwgAAosIAAKbCAACqwgAArMIAAKrCAACswgAArsIAALTCAADCwgAA1sIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADcwgAA0sIAAMjCAAC+wgAAtMIAAKrCAACiwgAAmsIAAJLCAACMwgAAhsIAAIbCAACIwgAAlsIAAJLCAACMwgAAisIAAIzCAACQwgAAlsIAAJ7CAACowgAApsIAAKjCAACswgAAsMIAALLCAACywgAAusIAAMTCAADSwgAA4MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANLCAADIwgAAvsIAALTCAACqwgAAoMIAAJjCAACOwgAAiMIAAIjCAACCwgAAfMIAAHzCAAB4wgAAeMIAAIDCAACCwgAAgMIAAHTCAAB4wgAAfMIAAIDCAACEwgAAiMIAAJLCAACSwgAAlMIAAJbCAACYwgAAosIAAKbCAACqwgAAsMIAALLCAAC4wgAAvsIAAMjCAADYwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAAoMIAAJbCAACOwgAAiMIAAILCAAB8wgAAeMIAAHTCAAB0wgAAdMIAAHTCAABswgAAYMIAAGTCAABUwgAASMIAAGjCAABQwgAASMIAAEjCAABQwgAAVMIAAFjCAABowgAAhsIAAHzCAACGwgAAiMIAAJDCAACWwgAAnMIAAKDCAACiwgAAosIAAKTCAACqwgAAssIAALTCAAC6wgAAwsIAAMrCAADWwgAA5MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAACCwgAAdMIAAGzCAABkwgAAYMIAAFzCAABcwgAAYMIAAGDCAABkwgAAXMIAAFTCAABQwgAAPMIAADDCAAAwwgAASMIAADDCAAAkwgAAHMIAABzCAAAowgAAIMIAADjCAABMwgAARMIAAEjCAABUwgAAWMIAAHzCAABwwgAAdMIAAHjCAACEwgAAhMIAAITCAACMwgAAksIAAJTCAACWwgAAmMIAAJbCAACewgAAqsIAALLCAAC2wgAAwMIAAMzCAADcwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAAFDCAABIwgAARMIAAETCAABAwgAAQMIAAEDCAABEwgAASMIAAEjCAABEwgAAOMIAACzCAAAcwgAADMIAAATCAAAYwgAAEMIAAADCAADowQAAAMIAAADCAAAAwgAADMIAADDCAAAcwgAAGMIAABjCAAA4wgAASMIAADTCAAA4wgAAVMIAAEjCAABIwgAASMIAAFjCAABYwgAAVMIAAFTCAABgwgAAZMIAAGzCAACEwgAAjMIAAJDCAACUwgAAnsIAAKbCAACqwgAAtMIAAMLCAADkwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA3MIAANLCAADIwgAAvsIAALTCAACswgAAoMIAAJbCAACWwgAAnsIAAKDCAACewgAAoMIAAKLCAACkwgAAsMIAAL7CAADOwgAA3MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA2MIAAM7CAADEwgAAusIAALDCAACmwgAAnsIAAJzCAACWwgAAjsIAAIbCAACIwgAAksIAAJLCAACQwgAAksIAAJbCAACawgAAoMIAAKTCAACwwgAAusIAAMjCAADWwgAA5MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANzCAADSwgAAysIAAMDCAAC0wgAArMIAAKLCAACawgAAksIAAIrCAACEwgAAdMIAAHjCAACEwgAAgMIAAHjCAACCwgAAhMIAAIzCAACQwgAAmMIAAKLCAACgwgAAqMIAALTCAAC+wgAAzMIAANzCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA1sIAAM7CAADCwgAAuMIAALDCAACmwgAAnsIAAJTCAACMwgAAhMIAAGzCAABUwgAAaMIAAHjCAABcwgAAWMIAAFjCAABYwgAAaMIAAHTCAAB4wgAAkMIAAIzCAACQwgAAlsIAAJzCAACgwgAAosIAAKDCAACmwgAApsIAALDCAAC6wgAAyMIAANbCAADmwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADSwgAAyMIAAL7CAAC0wgAAqsIAAKDCAACWwgAAjMIAAITCAAB4wgAAYMIAAEDCAAAwwgAAQMIAADjCAAA4wgAALMIAADjCAABAwgAAQMIAAEzCAABowgAAaMIAAGzCAABwwgAAeMIAAHjCAAB0wgAAdMIAAILCAACAwgAAgsIAAIjCAACMwgAAlMIAAJbCAACcwgAAosIAAKzCAAC+wgAA3MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA0sIAAMjCAAC+wgAAtMIAAKrCAACgwgAAlsIAAIzCAACCwgAAdMIAAFzCAABEwgAAHMIAAATCAAAgwgAADMIAAADCAAAYwgAAIMIAAATCAAAMwgAAFMIAADjCAAAkwgAANMIAADDCAAA4wgAAKMIAADTCAAA4wgAAUMIAAEjCAABIwgAASMIAAFjCAABYwgAAXMIAAGTCAAB4wgAAgMIAAITCAACIwgAAjMIAAJjCAACiwgAAtMIAAMjCAADcwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADSwgAAxMIAALTCAACqwgAApMIAAKbCAACgwgAAnMIAAKjCAACewgAAoMIAAKbCAACuwgAAssIAALbCAAC6wgAAxsIAANTCAADqwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANLCAADEwgAAtMIAAKrCAACgwgAAlsIAAIzCAACIwgAAlMIAAJDCAACUwgAAmsIAAKDCAACkwgAAqsIAAK7CAAC4wgAAssIAALbCAAC+wgAAyMIAANTCAADgwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA0sIAAMTCAAC0wgAApsIAAJbCAACOwgAAfMIAAIDCAACGwgAAeMIAAIDCAACGwgAAjMIAAJLCAACawgAAosIAAKjCAACmwgAAqsIAALLCAAC0wgAAusIAAMTCAADQwgAA2sIAAOTCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADOwgAAwMIAALDCAACiwgAAlsIAAIjCAABowgAAWMIAAGDCAABYwgAAYMIAAGDCAABowgAAcMIAAHzCAACEwgAAlMIAAIrCAACQwgAAkMIAAJbCAACUwgAAmsIAAKLCAACiwgAApMIAAKjCAACuwgAAusIAAMDCAADGwgAA0MIAANzCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANjCAADMwgAAwMIAALbCAACqwgAAoMIAAJTCAACIwgAAcMIAAEzCAAA4wgAAQMIAADjCAAAswgAANMIAADzCAAA8wgAARMIAAEDCAABgwgAAVMIAAFzCAABowgAAZMIAAHzCAABowgAAcMIAAITCAACAwgAAhsIAAIzCAACMwgAAlMIAAJrCAACowgAArMIAALLCAAC2wgAAusIAALzCAADKwgAA2sIAAOzCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANjCAADOwgAAxMIAALrCAACwwgAApsIAAJzCAACSwgAAiMIAAHDCAABUwgAAMMIAAAzCAAAYwgAAGMIAAAjCAAAIwgAAEMIAACDCAAAkwgAAMMIAAEzCAAA0wgAAOMIAADzCAAA4wgAAWMIAAEjCAABEwg==", 10240, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+30720);
/* memory initializer (tweaked) */ allocateBase64Encoded("AABIwgAASMIAAEjCAABMwgAAWMIAAGTCAABowgAAcMIAAITCAACEwgAAhMIAAIDCAACCwgAAiMIAAJrCAACkwgAArsIAAL7CAADcwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANbCAADMwgAAwsIAALjCAACuwgAApsIAAJzCAACWwgAApMIAAJ7CAACmwgAAqsIAALLCAAC4wgAAvsIAAMTCAADKwgAA0sIAANrCAADiwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADUwgAAyMIAAL7CAAC0wgAArMIAAKLCAACcwgAAlMIAAIrCAACUwgAAlMIAAJjCAACewgAApsIAAKjCAACswgAAssIAALjCAADCwgAAusIAAMjCAADOwgAA1sIAANzCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA1MIAAMjCAAC+wgAAtMIAAK7CAACmwgAAoMIAAJbCAACKwgAAcMIAAITCAACEwgAAiMIAAIzCAACUwgAAnMIAAJ7CAACiwgAAosIAAKbCAACowgAArsIAALrCAADAwgAAxsIAAM7CAADWwgAA3MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANjCAADOwgAAxMIAALrCAACywgAAqsIAAKTCAACcwgAAjsIAAHjCAABcwgAAaMIAAGjCAABYwgAAWMIAAFzCAABswgAAdMIAAHjCAACMwgAAhMIAAITCAACGwgAAjMIAAJDCAACWwgAAnMIAAKjCAACowgAAqMIAALDCAAC2wgAAtMIAAL7CAADEwgAAzMIAAM7CAADUwgAA3MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADYwgAAzsIAAMTCAAC8wgAAtMIAAK7CAACkwgAAnsIAAJLCAACGwgAAaMIAADzCAABIwgAANMIAACTCAAA0wgAAQMIAADDCAAAwwgAARMIAAFjCAABMwgAAQMIAADzCAABEwgAASMIAAEzCAABkwgAAaMIAAHDCAAB8wgAAisIAAIzCAACKwgAAjsIAAJTCAACcwgAApMIAALTCAAC+wgAAysIAANLCAADcwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA0sIAAMrCAADCwgAAusIAALTCAACqwgAAoMIAAJrCAACQwgAAgsIAAGDCAABAwgAAFMIAACDCAAAQwgAACMIAACDCAABIwgAAPMIAABjCAAAkwgAAPMIAABjCAAAMwgAAHMIAABjCAAAswgAAIMIAADTCAABIwgAANMIAADDCAAA8wgAASMIAAFzCAABAwgAAQMIAAFDCAACEwgAAjMIAAJjCAACkwgAAtMIAAMLCAADSwgAA3MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADYwgAAzsIAAMTCAAC6wgAArMIAAJ7CAACYwgAApsIAAKLCAACqwgAArsIAALLCAAC6wgAAxMIAAMzCAADWwgAA4MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANjCAADOwgAAxMIAALrCAACswgAAnsIAAI7CAACawgAAlMIAAJrCAACewgAAosIAAKjCAACqwgAAtMIAALjCAAC6wgAAuMIAAMTCAADKwgAA2MIAAODCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADYwgAAzsIAAMTCAAC6wgAArsIAAJzCAACIwgAAgsIAAITCAAB4wgAAgsIAAIbCAACMwgAAksIAAJbCAACcwgAApMIAAKTCAACmwgAAqMIAALbCAAC6wgAAxMIAAMzCAADUwgAA3MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANLCAADIwgAAvsIAALTCAACkwgAAlMIAAHjCAABkwgAAaMIAAGDCAABMwgAAUMIAAFDCAABYwgAAWMIAAGjCAACEwgAAbMIAAHDCAAB8wgAAhMIAAIrCAACSwgAAnsIAAKbCAACowgAAoMIAAKLCAACiwgAApMIAALDCAAC4wgAAxMIAANLCAADiwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADWwgAAzMIAAMLCAAC4wgAAqMIAAJ7CAACKwgAAZMIAADzCAABQwgAAPMIAADDCAAA0wgAASMIAAFDCAAAowgAAKMIAAFTCAAAswgAALMIAAEDCAABMwgAAYMIAAFzCAABQwgAAZMIAAGzCAAB0wgAAeMIAAIbCAACOwgAAnMIAAKbCAACswgAAvMIAAMTCAADOwgAA3MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA0sIAAMjCAAC+wgAAtMIAAKjCAACcwgAAjMIAAHTCAABMwgAAJMIAACDCAAAYwgAAIMIAADjCAABQwgAATMIAACTCAAAgwgAAOMIAACDCAAAYwgAAGMIAACTCAAA4wgAAJMIAADjCAAA8wgAALMIAACzCAAA0wgAAJMIAADTCAABgwgAAhsIAAIjCAACmwgAArsIAALTCAAC+wgAAzMIAANbCAADiwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADawgAA0sIAAMrCAADAwgAAtsIAAKjCAACawgAApMIAAKTCAACqwgAAssIAALzCAADIwgAA1MIAANzCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANTCAADOwgAAxMIAALjCAACqwgAAoMIAAI7CAACWwgAAkMIAAJjCAACgwgAAqMIAAKzCAACywgAAusIAAMjCAADWwgAA4sIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANbCAADQwgAAysIAAMLCAAC4wgAAsMIAAKjCAACgwgAAgMIAAITCAAB8wgAAgMIAAITCAACKwgAAksIAAJrCAACmwgAApsIAAKzCAAC2wgAAxMIAANDCAADewgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA1sIAANDCAADKwgAAwsIAALjCAAC0wgAAqMIAAJTCAABkwgAAaMIAAFDCAABcwgAAWMIAAEjCAABQwgAASMIAAFDCAAB8wgAAeMIAAIrCAACYwgAAmsIAAJzCAACcwgAAnsIAAKTCAACwwgAAvMIAAMjCAADUwgAA3sIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANTCAADMwgAAxMIAAL7CAAC0wgAAqsIAAKbCAACcwgAAjMIAAEjCAABIwgAAJMIAADDCAABEwgAAPMIAAEjCAABIwgAAMMIAAFzCAAA4wgAAPMIAAEDCAABAwgAAWMIAAETCAABEwgAAaMIAAHjCAACOwgAAosIAAK7CAAC4wgAAwsIAAMzCAADYwgAA5MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA1MIAAMzCAADEwgAAvsIAALTCAACqwgAApsIAAJzCAACMwgAANMIAACzCAAAkwgAAPMIAAEjCAABMwgAASMIAAETCAAA0wgAAPMIAACTCAAAwwgAAJMIAABzCAAAswgAAGMIAABTCAAAgwgAAJMIAADDCAABIwgAAaMIAAILCAACSwgAAnsIAAKrCAAC4wgAAwsIAAMrCAADSwgAA2sIAAOLCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANbCAADIwgAAvsIAAK7CAACiwgAAqsIAAKbCAACwwgAAusIAAMjCAADWwgAA5MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADWwgAAysIAAL7CAACwwgAApsIAAJjCAACSwgAAkMIAAJ7CAACowgAAtMIAAL7CAADIwgAA0sIAANzCAADmwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANDCAADEwgAAuMIAAK7CAACiwgAAjMIAAILCAAB4wgAAhsIAAI7CAACUwgAAoMIAAKrCAAC2wgAAvsIAAMbCAADOwgAA2MIAAN7CAADkwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAAzsIAAMLCAAC0wgAAqsIAAJjCAABwwgAAYMIAAFjCAABwwgAAeMIAAHTCAABgwgAAfMIAAILCAACSwgAAlMIAAJrCAACWwgAAnMIAAKLCAACswgAArsIAALDCAAC2wgAAvMIAAMTCAADOwgAA3MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADSwgAAyMIAAMLCAAC4wgAArMIAAKLCAACewgAAjMIAAGTCAABMwgAAPMIAAEzCAABowgAAcMIAAGDCAABUwgAASMIAAGjCAABQwgAASMIAAEjCAABUwgAAXMIAAIDCAACKwgAAjsIAAKrCAACkwgAAnMIAAKLCAACqwgAAvsIAAMzCAADgwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANLCAADIwgAAwsIAALjCAACqwgAApsIAAJ7CAACQwgAARMIAACDCAAAswgAALMIAAFjCAABgwgAATMIAAEjCAAAgwgAALMIAABjCAAAQwgAADMIAABTCAAAYwgAAFMIAADDCAABYwgAAcMIAAGTCAABwwgAAjMIAAJbCAACowgAAuMIAAM7CAADgwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANzCAADMwgAAvsIAALLCAACkwgAApsIAAKjCAAC0wgAAuMIAAMbCAADWwgAA4sIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADWwgAAysIAAL7CAACywgAApsIAAJDCAACUwgAAnMIAAKrCAACwwgAAsMIAALTCAAC4wgAAxMIAANLCAADewgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA2sIAAM7CAADCwgAAusIAAK7CAACiwgAAjMIAAIzCAACGwgAAlsIAAJLCAACYwgAAnsIAAKLCAACmwgAAsMIAALLCAADCwgAAzsIAANzCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADWwgAAyMIAALzCAACwwgAApsIAAJbCAAB8wgAAbMIAAGzCAAB8wgAAhMIAAHDCAAB4wgAAhsIAAIbCAACawgAAmMIAAKLCAACwwgAArMIAALjCAADAwgAAzMIAANrCAADowgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANLCAADEwgAAuMIAAKzCAACiwgAAksIAAGDCAABQwgAAPMIAAFzCAABwwgAAaMIAAFDCAABMwgAANMIAAETCAABIwgAAVMIAAFjCAAB0wgAAjsIAAIzCAACKwgAAnMIAAJ7CAACuwgAAtMIAAMDCAADQwgAA4MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAAzsIAAMDCAAC0wgAArMIAAJzCAACMwgAATMIAACjCAAA8wgAAQMIAAFzCAABYwgAAWMIAAFTCAAAowgAADMIAAODBAAAEwgAAGMIAABTCAAAwwgAAPMIAAETCAABYwgAAfMIAAIjCAACcwgAApMIAALLCAAC8wgAAxsIAANDCAADawgAA5MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADcwgAAyMIAALTCAACewgAAqsIAAKLCAACkwgAApMIAALLCAAC8wgAAxsIAAM7CAADawgAA5sIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANLCAADCwgAAqsIAAJDCAACUwgAAjMIAAIzCAACMwgAAmMIAAKrCAAC2wgAAusIAAMLCAADOwgAA2sIAAObCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA4MIAALrCAACiwgAAiMIAAHjCAABwwgAAcMIAAGTCAAB8wgAAjMIAAJrCAACkwgAAtMIAALrCAADEwgAA0MIAANrCAADiwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAAOLCAADIwgAAusIAAKjCAAB8wgAAaMIAAEDCAABUwgAAWMIAAFDCAABQwgAAZMIAAIDCAACEwgAAmMIAAKbCAACiwgAAqsIAAKrCAAC0wgAAvsIAAMTCAADKwgAAzsIAANTCAADYwgAA3sIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA0sIAAL7CAACswgAAlMIAAFTCAABIwgAAGMIAACzCAABEwgAALMIAACjCAAAcwgAAHMIAADjCAABQwgAAZMIAAGDCAACQwgAAisIAAJTCAACiwgAArsIAALjCAAC8wgAAwsIAAMbCAADMwgAA0sIAANjCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANjCAADGwgAAtMIAAJjCAACEwgAANMIAACzCAAAkwgAAMMIAADzCAAAswgAAPMIAACDCAADwwQAA+MEAAPjBAAAcwgAABMIAACDCAAAkwgAALMIAAFTCAABswgAAjMIAAJLCAACawgAAnsIAAKTCAACowgAArsIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA3MIAALbCAACYwgAAlsIAAKrCAAC6wgAAxMIAANDCAADcwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADcwgAAtsIAAIzCAACMwgAAlsIAAKzCAACywgAAvMIAAMTCAADKwgAA1MIAANzCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA3MIAAL7CAACgwgAAcMIAAILCAACAwgAAlMIAAKbCAACwwgAAtsIAAL7CAADGwgAAzsIAANbCAADcwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADcwgAAvsIAAKDCAABowgAAXMIAAETCAACEwgAAiMIAAI7CAACcwgAAnMIAAKDCAACwwgAAqsIAALLCAADCwgAAyMIAANLCAADcwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANzCAAC+wgAAoMIAAFTCAABQwgAAJMIAAGzCAABswgAARMIAAGjCAABgwgAAfMIAAKzCAACewgAAtMIAALrCAADEwgAAzsIAANbCAADgwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADcwgAAwsIAALbCAACSwgAANMIAACDCAAAEwgAAVMIAAHTCAABEwgAAWMIAAEjCAABIwgAAcMIAAFDCAACGwgAAlMIAAKLCAAC4wgAAwMIAAMjCAADSwgAA3MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAAOLCAADUwgAAxsIAALjCAACawgAAoMIAALDCAADCwgAA1MIAAObCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADowgAA2sIAAMzCAAC+wgAAssIAAJTCAACQwgAAsMIAAK7CAAC+wgAAzMIAANrCAADowgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAAOjCAADawgAAzMIAAL7CAACywgAAlsIAAITCAACUwgAAmsIAAJzCAACswgAArsIAALTCAADAwgAA0sIAAObCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA5sIAANjCAADKwgAAvMIAALDCAACEwg==", 10240, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+40960);
/* memory initializer (tweaked) */ allocateBase64Encoded("AABgwgAAdMIAAIzCAACCwgAAnMIAAJDCAACmwgAAqMIAALrCAADEwgAA0sIAANzCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANzCAADSwgAAvsIAALLCAACkwgAAZMIAAFDCAABQwgAAbMIAAGDCAABswgAAaMIAAIrCAACGwgAAsMIAAKTCAACkwgAAssIAALzCAADIwgAA2MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADcwgAAysIAAMDCAAC0wgAApsIAAJrCAABYwgAALMIAABjCAABIwgAAQMIAAFDCAABAwgAAKMIAACjCAABMwgAAUMIAAFTCAABswgAAgsIAAI7CAACcwgAAqsIAAL7CAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAAPDCAADSwgAArMIAAIjCAACcwgAAnsIAALTCAADIwgAA3MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA8MIAANLCAACswgAAhMIAAJLCAACawgAAsMIAAMDCAADSwgAA5sIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAAPDCAADSwgAAuMIAAKDCAAB0wgAAgMIAAIjCAACgwgAArsIAALjCAADIwgAA3MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA8MIAANDCAAC2wgAAnsIAAFDCAABwwgAAWMIAAIDCAACKwgAAmsIAAKDCAACkwgAAqMIAAKrCAACuwgAAsMIAALTCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADswgAAyMIAAK7CAACawgAARMIAAEjCAAAwwgAAaMIAAHTCAAB0wgAAhsIAAILCAAB4wgAAeMIAAHjCAACCwgAAiMIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAAObCAADEwgAAqMIAAHjCAABEwgAAMMIAABjCAAA4wgAARMIAAETCAAA4wgAAHMIAABTCAAAcwgAAIMIAACjCAAAswgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADcwgAAsMIAAJTCAACawgAApMIAAKTCAACqwgAAtMIAALzCAADGwgAA0MIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANzCAACwwgAAhMIAAIzCAACiwgAAoMIAAKLCAACowgAAsMIAALbCAAC6wgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA3MIAALDCAAB0wgAAfMIAAIzCAACOwgAAlMIAAJrCAACgwgAApsIAAKrCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADcwgAArMIAAHjCAAB8wgAAeMIAAHjCAABowgAAUMIAAEjCAABIwgAAUMIAAFjCAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA7MIAANjCAACowgAAVMIAAEjCAABIwgAASMIAAFzCAAA8wgAANMIAACDCAAAgwgAAIMIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADswgAAyMIAAJLCAAAswgAAFMIAACjCAAAswgAAVMIAABjCAAAUwgAADMIAAAzCAAAYwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA3MIAAMjCAAC2wgAAqMIAAJTCAACgwgAAoMIAAKDCAACgwgAAoMIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADcwgAAyMIAALbCAACowgAAlMIAAIjCAACIwgAAiMIAAIjCAACIwgDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANzCAADIwgAArMIAAJzCAACMwgAAcMIAADTCAADwwQAAqMEAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xAAA3MIAAMjCAACuwgAAnMIAAIbCAABAwgAAGMIAAOjBAACowQDAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAADcwgAAyMIAAKzCAACKwgAAYMIAADTCAAAMwgAABMIAAOjBAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAANzCAADIwgAApsIAAI7CAABAwgAA2MEAABjCAAAUwgAACMIAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecQAwHnEAMB5xADAecRsZXh5X2VuY29kZXJfZmluaXNoKCk7IGNsZWFuaW5nIHVwAAAAAAAAbGV4eV9lbmNvZGVyX2ZpbmlzaCgpOyBlbmRpbmcgc3RyZWFtAAAAAGxleHlfZW5jb2Rlcl9zdGFydCgpOyBlcnJvciBpbml0aWFsaXppbmcgdm9yYmlzIGVuY29kZXIAAAAAAAAAAAAAAAAAAADgPwAAAAAAAPA/AAAAAAAA+D8AAAAAAAAAQAAAAAAAAARAAAAAAAAAEkAAAAAAAAAhQAAAAARr9DRCAAAAAAAAAAAAAAAAAADgPwAAAAAAAPA/AAAAAAAA+D8AAAAAAAAEQAAAAAAAABJAAAAAAAAAIUAAAAAAAIAwQAAAAARr9DRCSIAAAKh/AAAAAAAAAAAAAAQAAAAMAAAAEAAAAAIAAAAYAAAAAgAAAAIAAAAGAAAABAAAAAwAAAAQAAAAAgAAABgAAAAIAAAABAAAAAoAAAAAAAAADAAAABAAAAACAAAAGAAAAAAAAAAAAAAABAAAAAAAAAAAAPC/AAAAAAAA8L8AAAAAAADwvwAAAAAAAPC/AAAAAAAA8L8AAAAAAADwvwAAAAAAAPC/AAAAAAAA8L8AAAAAAADwvwAAAAAAAPC/AAAAAAAA8L8AAAAAAADwvwAAAAAA+dVAAAAAAABA30AAAAAAAIjjQAAAAAAAcOdAAAAAAABY60AAAAAAAEDvQAAAAAAAiPNAAAAAAABw90AAAAAAAFj7QAAAAAAAQP9AAAAAAACIA0EAAAAAiIQOQZqZmZmZmbm/AAAAAAAAAACamZmZmZm5P5qZmZmZmck/MzMzMzMz0z+amZmZmZnZPwAAAAAAAOA/MzMzMzMz4z9mZmZmZmbmP5qZmZmZmek/zczMzMzM7D8AAAAAAADwPwAAAAABAAAAAwAAAAcAAAAPAAAAHwAAAD8AAAB/AAAA/wAAAP8BAAD/AwAA/wcAAP8PAAD/HwAA/z8AAP9/AAD//wAA//8BAP//AwD//wcA//8PAP//HwD//z8A//9/AP///wD///8B////A////wf///8P////H////z////9//////wAAAAACAAAAEgAAAAwAAAAEAAAAFAAAAAAAAAACAAAAAgAAABgAAAAEAAAACAAAAAoAAAAGAAAAAAAAAAAAAAAGAAAAFgAAABIAAAAcAAAAGgAAAAgAAAAAAAAABAAAAAIAAAADAAAABQAAAAAAAAC3HcEEbjuCCdkmQw3cdgQTa2vFF7JNhhoFUEceuO0IJg/wySLW1oovYctLK2SbDDXThs0xCqCOPL29Tzhw2xFMx8bQSB7gk0Wp/VJBrK0VXxuw1FvClpdWdYtWUsg2GWp/K9hupg2bYxEQWmcUQB15o13cfXp7n3DNZl504LYjmFer4pyOjaGROZBglTzAJ4uL3eaPUvulguXmZIZYWyu+70bqujZgqbeBfWizhC0vrTMw7qnqFq2kXQtsoJBtMtQncPPQ/law3UlLcdlMGzbH+wb3wyIgtM6VPXXKKIA68p+d+/ZGu7j78aZ5//T2PuFD6//lms286C3Qfex3cIY0wG1HMBlLBD2uVsU5qwaCJxwbQyPFPQAuciDBKs+djhJ4gE8WoaYMGxa7zR8T64oBpPZLBX3QCAjKzckMB6uXeLC2VnxpkBVx3o3Uddvdk2tswFJvteYRYgL70Ga/Rp9eCFteWtF9HVdmYNxTYzCbTdQtWkkNCxlEuhbYQJfGpawg22So+f0npU7g5qFLsKG//K1guyWLI7aSluKyLyutipg2bI5BEC+D9g3uh/NdqZlEQGidnWYrkCp76pTnHbTgUAB15IkmNuk+O/ftO2uw84x2cfdVUDL64k3z/l/wvMbo7X3CMcs+z4bW/8uDhrjVNJt50e29OtxaoPvY7uAMaVn9zW2A245gN8ZPZDKWCHqFi8l+XK2Kc+uwS3dWDQRP4RDFSzg2hkaPK0dCinsAXD1mwVjkQIJVU11DUZ47HSUpJtwh8ACfLEcdXihCTRk29VDYMix2mz+ba1o7JtYVA5HL1AdI7ZcK//BWDvqgERBNvdAUlJuTGSOGUh0OVi/xuUvu9WBtrfjXcGz80iAr4mU96ua8G6nrCwZo77a7J9cBpubT2ICl3m+dZNpqzSPE3dDiwAT2oc2z62DJfo0+vcmQ/7kQtry0p6t9sKL7Oq4V5vuqzMC4p3vdeaPGYDabcX33n6hbtJIfRnWWGhYyiK0L84x0LbCBwzBxhZmQil0ujUtZ96sIVEC2yVBF5o5O8vtPSivdDEecwM1DIX2Ce5ZgQ39PRgBy+FvBdv0LhmhKFkdskzAEYSQtxWXpS5sRXlZaFYdwGRgwbdgcNT2fAoIgXgZbBh0L7BvcD1Gmkzfmu1IzP50RPoiA0DqN0JckOs1WIOPrFS1U9tQpeSapxc47aMEXHSvMoADqyKVQrdYSTWzSy2sv33x27tvBy6HjdtZg56/wI+oY7eLuHb2l8KqgZPRzhif5xJvm/Qn9uIm+4HmNZ8Y6gNDb+4TVi7yaYpZ9nruwPpMMrf+XsRCwrwYNcavfKzKmaDbzom1mtLzae3W4A102tbRA97EAAgAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAAAAAAEAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAAAAAIAAAABwAAAAkAAAAGAAAACgAAAAUAAAALAAAABAAAAAwAAAADAAAADQAAAAIAAAAOAAAAAQAAAA8AAAAAAAAAEAAAAAAAAAAGAAAABQAAAAcAAAAEAAAACAAAAAMAAAAJAAAAAgAAAAoAAAABAAAACwAAAAAAAAAMAAAAAAAAAAQAAAADAAAABQAAAAIAAAAGAAAAAQAAAAcAAAAAAAAACAAAAAAAAAACAAAAAQAAAAMAAAAAAAAABAAAAAAAAAAGAAAABQAAAAcAAAAEAAAACAAAAAMAAAAJAAAAAgAAAAoAAAABAAAACwAAAAAAAAAMAAAAAAAAAAUAAAAEAAAABgAAAAMAAAAHAAAAAgAAAAgAAAABAAAACQAAAAAAAAAKAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAIAAAABwAAAAkAAAAGAAAACgAAAAUAAAALAAAABAAAAAwAAAADAAAADQAAAAIAAAAOAAAAAQAAAA8AAAAAAAAAEAAAAAAAAAAEAAAAAwAAAAUAAAACAAAABgAAAAEAAAAHAAAAAAAAAAgAAAAAAAAABAAAAAMAAAAFAAAAAgAAAAYAAAABAAAABwAAAAAAAAAIAAAAAAAAAAIAAAABAAAAAwAAAAAAAAAEAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAIAAAABwAAAAkAAAAGAAAACgAAAAUAAAALAAAABAAAAAwAAAADAAAADQAAAAIAAAAOAAAAAQAAAA8AAAAAAAAAEAAAAAAAAAAGAAAABQAAAAcAAAAEAAAACAAAAAMAAAAJAAAAAgAAAAoAAAABAAAACwAAAAAAAAAMAAAAAAAAAAIAAAABAAAAAwAAAAAAAAAEAAAAAAAAAAIAAAABAAAAAwAAAAAAAAAEAAAAAAAAAAYAAAAFAAAABwAAAAQAAAAIAAAAAwAAAAkAAAACAAAACgAAAAEAAAALAAAAAAAAAAwAAAAAAAAABQAAAAQAAAAGAAAAAwAAAAcAAAACAAAACAAAAAEAAAAJAAAAAAAAAAoAAAAAAAAAAQAAAAAAAAACAAAAAAAAAAgAAAAHAAAACQAAAAYAAAAKAAAABQAAAAsAAAAEAAAADAAAAAMAAAANAAAAAgAAAA4AAAABAAAADwAAAAAAAAAQAAAAAAAAAAQAAAADAAAABQAAAAIAAAAGAAAAAQAAAAcAAAAAAAAACAAAAAAAAAAEAAAAAwAAAAUAAAACAAAABgAAAAEAAAAHAAAAAAAAAAgAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAAAQAAAAAAAAACAAAAAAAAABgAAAAXAAAAGQAAABYAAAAaAAAAFQAAABsAAAAUAAAAHAAAABMAAAAdAAAAEgAAAB4AAAARAAAAHwAAABAAAAAgAAAADwAAACEAAAAOAAAAIgAAAA0AAAAjAAAADAAAACQAAAALAAAAJQAAAAoAAAAmAAAACQAAACcAAAAIAAAAKAAAAAcAAAApAAAABgAAACoAAAAFAAAAKwAAAAQAAAAsAAAAAwAAAC0AAAACAAAALgAAAAEAAAAvAAAAAAAAADAAAAAAAAAACQAAAAgAAAAKAAAABwAAAAsAAAAGAAAADAAAAAUAAAANAAAABAAAAA4AAAADAAAADwAAAAIAAAAQAAAAAQAAABEAAAAAAAAAEgAAAAAAAAAJAAAACAAAAAoAAAAHAAAACwAAAAYAAAAMAAAABQAAAA0AAAAEAAAADgAAAAMAAAAPAAAAAgAAABAAAAABAAAAEQAAAAAAAAASAAAAAAAAAAoAAAAJAAAACwAAAAgAAAAMAAAABwAAAA0AAAAGAAAADgAAAAUAAAAPAAAABAAAABAAAAADAAAAEQAAAAIAAAASAAAAAQAAABMAAAAAAAAAFAAAAAAAAAAHAAAABgAAAAgAAAAFAAAACQAAAAQAAAAKAAAAAwAAAAsAAAACAAAADAAAAAEAAAANAAAAAAAAAA4AAAAAAAAABQAAAAQAAAAGAAAAAwAAAAcAAAACAAAACAAAAAEAAAAJAAAAAAAAAAoAAAAAAAAABgAAAAUAAAAHAAAABAAAAAgAAAADAAAACQAAAAIAAAAKAAAAAQAAAAsAAAAAAAAADAAAAAAAAAACAAAAAQAAAAMAAAAAAAAABAAAAAAAAAAGAAAABQAAAAcAAAAEAAAACAAAAAMAAAAJAAAAAgAAAAoAAAABAAAACwAAAAAAAAAMAAAAAAAAAAUAAAAEAAAABgAAAAMAAAAHAAAAAgAAAAgAAAABAAAACQAAAAAAAAAKAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAIAAAABwAAAAkAAAAGAAAACgAAAAUAAAALAAAABAAAAAwAAAADAAAADQAAAAIAAAAOAAAAAQAAAA8AAAAAAAAAEAAAAAAAAAAEAAAAAwAAAAUAAAACAAAABgAAAAEAAAAHAAAAAAAAAAgAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAAAQAAAAAAAAACAAAAAAAAABgAAAAXAAAAGQAAABYAAAAaAAAAFQAAABsAAAAUAAAAHAAAABMAAAAdAAAAEgAAAB4AAAARAAAAHwAAABAAAAAgAAAADwAAACEAAAAOAAAAIgAAAA0AAAAjAAAADAAAACQAAAALAAAAJQAAAAoAAAAmAAAACQAAACcAAAAIAAAAKAAAAAcAAAApAAAABgAAACoAAAAFAAAAKwAAAAQAAAAsAAAAAwAAAC0AAAACAAAALgAAAAEAAAAvAAAAAAAAADAAAAAAAAAACQAAAAgAAAAKAAAABwAAAAsAAAAGAAAADAAAAAUAAAANAAAABAAAAA4AAAADAAAADwAAAAIAAAAQAAAAAQAAABEAAAAAAAAAEgAAAAAAAAAIAAAABwAAAAkAAAAGAAAACgAAAAUAAAALAAAABAAAAAwAAAADAAAADQAAAAIAAAAOAAAAAQAAAA8AAAAAAAAAEAAAAAAAAAAKAAAACQAAAAsAAAAIAAAADAAAAAcAAAANAAAABgAAAA4AAAAFAAAADwAAAAQAAAAQAAAAAwAAABEAAAACAAAAEgAAAAEAAAATAAAAAAAAABQAAAAAAAAABwAAAAYAAAAIAAAABQAAAAkAAAAEAAAACgAAAAMAAAALAAAAAgAAAAwAAAABAAAADQAAAAAAAAAOAAAAAAAAAAUAAAAEAAAABgAAAAMAAAAHAAAAAgAAAAgAAAABAAAACQAAAAAAAAAKAAAAAAAAAAYAAAAFAAAABwAAAAQAAAAIAAAAAwAAAAkAAAACAAAACgAAAAEAAAALAAAAAAAAAAwAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAABgAAAAUAAAAHAAAABAAAAAgAAAADAAAACQAAAAIAAAAKAAAAAQAAAAsAAAAAAAAADAAAAAAAAAAFAAAABAAAAAYAAAADAAAABwAAAAIAAAAIAAAAAQAAAAkAAAAAAAAACgAAAAAAAAABAAAAAAAAAAIAAAAAAAAACAAAAAcAAAAJAAAABgAAAAoAAAAFAAAACwAAAAQAAAAMAAAAAwAAAA0AAAACAAAADgAAAAEAAAAPAAAAAAAAABAAAAAAAAAABAAAAAMAAAAFAAAAAgAAAAYAAAABAAAABwAAAAAAAAAIAAAAAAAAAAIAAAABAAAAAwAAAAAAAAAEAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAYAAAAFwAAABkAAAAWAAAAGgAAABUAAAAbAAAAFAAAABwAAAATAAAAHQAAABIAAAAeAAAAEQAAAB8AAAAQAAAAIAAAAA8AAAAhAAAADgAAACIAAAANAAAAIwAAAAwAAAAkAAAACwAAACUAAAAKAAAAJgAAAAkAAAAnAAAACAAAACgAAAAHAAAAKQAAAAYAAAAqAAAABQAAACsAAAAEAAAALAAAAAMAAAAtAAAAAgAAAC4AAAABAAAALwAAAAAAAAAwAAAAAAAAAAYAAAAFAAAABwAAAAQAAAAIAAAAAwAAAAkAAAACAAAACgAAAAEAAAALAAAAAAAAAAwAAAAAAAAABgAAAAUAAAAHAAAABAAAAAgAAAADAAAACQAAAAIAAAAKAAAAAQAAAAsAAAAAAAAADAAAAAAAAAAKAAAACQAAAAsAAAAIAAAADAAAAAcAAAANAAAABgAAAA4AAAAFAAAADwAAAAQAAAAQAAAAAwAAABEAAAACAAAAEgAAAAEAAAATAAAAAAAAABQAAAAAAAAABwAAAAYAAAAIAAAABQAAAAkAAAAEAAAACgAAAAMAAAALAAAAAgAAAAwAAAABAAAADQAAAAAAAAAOAAAAAAAAAAUAAAAEAAAABgAAAAMAAAAHAAAAAgAAAAgAAAABAAAACQAAAAAAAAAKAAAAAAAAAAYAAAAFAAAABwAAAAQAAAAIAAAAAwAAAAkAAAACAAAACgAAAAEAAAALAAAAAAAAAAwAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAABgAAAAUAAAAHAAAABAAAAAgAAAADAAAACQAAAAIAAAAKAAAAAQAAAAsAAAAAAAAADAAAAAAAAAAFAAAABAAAAAYAAAADAAAABwAAAAIAAAAIAAAAAQAAAAkAAAAAAAAACgAAAAAAAAABAAAAAAAAAAIAAAAAAAAACAAAAAcAAAAJAAAABgAAAAoAAAAFAAAACwAAAAQAAAAMAAAAAw==", 10237, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+51200);
/* memory initializer (tweaked) */ allocateBase64Encoded("DQAAAAIAAAAOAAAAAQAAAA8AAAAAAAAAEAAAAAAAAAAEAAAAAwAAAAUAAAACAAAABgAAAAEAAAAHAAAAAAAAAAgAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAAAQAAAAAAAAACAAAAAAAAABgAAAAXAAAAGQAAABYAAAAaAAAAFQAAABsAAAAUAAAAHAAAABMAAAAdAAAAEgAAAB4AAAARAAAAHwAAABAAAAAgAAAADwAAACEAAAAOAAAAIgAAAA0AAAAjAAAADAAAACQAAAALAAAAJQAAAAoAAAAmAAAACQAAACcAAAAIAAAAKAAAAAcAAAApAAAABgAAACoAAAAFAAAAKwAAAAQAAAAsAAAAAwAAAC0AAAACAAAALgAAAAEAAAAvAAAAAAAAADAAAAAAAAAABgAAAAUAAAAHAAAABAAAAAgAAAADAAAACQAAAAIAAAAKAAAAAQAAAAsAAAAAAAAADAAAAAAAAAAGAAAABQAAAAcAAAAEAAAACAAAAAMAAAAJAAAAAgAAAAoAAAABAAAACwAAAAAAAAAMAAAAAAAAAAoAAAAJAAAACwAAAAgAAAAMAAAABwAAAA0AAAAGAAAADgAAAAUAAAAPAAAABAAAABAAAAADAAAAEQAAAAIAAAASAAAAAQAAABMAAAAAAAAAFAAAAAAAAAAHAAAABgAAAAgAAAAFAAAACQAAAAQAAAAKAAAAAwAAAAsAAAACAAAADAAAAAEAAAANAAAAAAAAAA4AAAAAAAAABQAAAAQAAAAGAAAAAwAAAAcAAAACAAAACAAAAAEAAAAJAAAAAAAAAAoAAAAAAAAABgAAAAUAAAAHAAAABAAAAAgAAAADAAAACQAAAAIAAAAKAAAAAQAAAAsAAAAAAAAADAAAAAAAAAACAAAAAQAAAAMAAAAAAAAABAAAAAAAAAAGAAAABQAAAAcAAAAEAAAACAAAAAMAAAAJAAAAAgAAAAoAAAABAAAACwAAAAAAAAAMAAAAAAAAAAUAAAAEAAAABgAAAAMAAAAHAAAAAgAAAAgAAAABAAAACQAAAAAAAAAKAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAIAAAABwAAAAkAAAAGAAAACgAAAAUAAAALAAAABAAAAAwAAAADAAAADQAAAAIAAAAOAAAAAQAAAA8AAAAAAAAAEAAAAAAAAAAEAAAAAwAAAAUAAAACAAAABgAAAAEAAAAHAAAAAAAAAAgAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAAAQAAAAAAAAACAAAAAAAAAAoAAAAJAAAACwAAAAgAAAAMAAAABwAAAA0AAAAGAAAADgAAAAUAAAAPAAAABAAAABAAAAADAAAAEQAAAAIAAAASAAAAAQAAABMAAAAAAAAAFAAAAAAAAAAIAAAABwAAAAkAAAAGAAAACgAAAAUAAAALAAAABAAAAAwAAAADAAAADQAAAAIAAAAOAAAAAQAAAA8AAAAAAAAAEAAAAAAAAAAHAAAABgAAAAgAAAAFAAAACQAAAAQAAAAKAAAAAwAAAAsAAAACAAAADAAAAAEAAAANAAAAAAAAAA4AAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAABgAAAAUAAAAHAAAABAAAAAgAAAADAAAACQAAAAIAAAAKAAAAAQAAAAsAAAAAAAAADAAAAAAAAAAFAAAABAAAAAYAAAADAAAABwAAAAIAAAAIAAAAAQAAAAkAAAAAAAAACgAAAAAAAAABAAAAAAAAAAIAAAAAAAAACAAAAAcAAAAJAAAABgAAAAoAAAAFAAAACwAAAAQAAAAMAAAAAwAAAA0AAAACAAAADgAAAAEAAAAPAAAAAAAAABAAAAAAAAAABAAAAAMAAAAFAAAAAgAAAAYAAAABAAAABwAAAAAAAAAIAAAAAAAAAAQAAAADAAAABQAAAAIAAAAGAAAAAQAAAAcAAAAAAAAACAAAAAAAAAACAAAAAQAAAAMAAAAAAAAABAAAAAAAAAACAAAAAQAAAAMAAAAAAAAABAAAAAAAAAABAAAAAAAAAAIAAAAAAAAACgAAAAkAAAALAAAACAAAAAwAAAAHAAAADQAAAAYAAAAOAAAABQAAAA8AAAAEAAAAEAAAAAMAAAARAAAAAgAAABIAAAABAAAAEwAAAAAAAAAUAAAAAAAAAAcAAAAGAAAACAAAAAUAAAAJAAAABAAAAAoAAAADAAAACwAAAAIAAAAMAAAAAQAAAA0AAAAAAAAADgAAAAAAAAAGAAAABQAAAAcAAAAEAAAACAAAAAMAAAAJAAAAAgAAAAoAAAABAAAACwAAAAAAAAAMAAAAAAAAAAIAAAABAAAAAwAAAAAAAAAEAAAAAAAAAAYAAAAFAAAABwAAAAQAAAAIAAAAAwAAAAkAAAACAAAACgAAAAEAAAALAAAAAAAAAAwAAAAAAAAABQAAAAQAAAAGAAAAAwAAAAcAAAACAAAACAAAAAEAAAAJAAAAAAAAAAoAAAAAAAAAAQAAAAAAAAACAAAAAAAAAAgAAAAHAAAACQAAAAYAAAAKAAAABQAAAAsAAAAEAAAADAAAAAMAAAANAAAAAgAAAA4AAAABAAAADwAAAAAAAAAQAAAAAAAAAAQAAAADAAAABQAAAAIAAAAGAAAAAQAAAAcAAAAAAAAACAAAAAAAAAAEAAAAAwAAAAUAAAACAAAABgAAAAEAAAAHAAAAAAAAAAgAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAAAQAAAAAAAAACAAAAAAAAAAgAAAAHAAAACQAAAAYAAAAKAAAABQAAAAsAAAAEAAAADAAAAAMAAAANAAAAAgAAAA4AAAABAAAADwAAAAAAAAAQAAAAAAAAAAcAAAAGAAAACAAAAAUAAAAJAAAABAAAAAoAAAADAAAACwAAAAIAAAAMAAAAAQAAAA0AAAAAAAAADgAAAAAAAAAGAAAABQAAAAcAAAAEAAAACAAAAAMAAAAJAAAAAgAAAAoAAAABAAAACwAAAAAAAAAMAAAAAAAAAAIAAAABAAAAAwAAAAAAAAAEAAAAAAAAAAYAAAAFAAAABwAAAAQAAAAIAAAAAwAAAAkAAAACAAAACgAAAAEAAAALAAAAAAAAAAwAAAAAAAAABQAAAAQAAAAGAAAAAwAAAAcAAAACAAAACAAAAAEAAAAJAAAAAAAAAAoAAAAAAAAAAQAAAAAAAAACAAAAAAAAAAgAAAAHAAAACQAAAAYAAAAKAAAABQAAAAsAAAAEAAAADAAAAAMAAAANAAAAAgAAAA4AAAABAAAADwAAAAAAAAAQAAAAAAAAAAQAAAADAAAABQAAAAIAAAAGAAAAAQAAAAcAAAAAAAAACAAAAAAAAAAEAAAAAwAAAAUAAAACAAAABgAAAAEAAAAHAAAAAAAAAAgAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAAAQAAAAAAAAACAAAAAAAAAAgAAAAHAAAACQAAAAYAAAAKAAAABQAAAAsAAAAEAAAADAAAAAMAAAANAAAAAgAAAA4AAAABAAAADwAAAAAAAAAQAAAAAAAAAAYAAAAFAAAABwAAAAQAAAAIAAAAAwAAAAkAAAACAAAACgAAAAEAAAALAAAAAAAAAAwAAAAAAAAABgAAAAUAAAAHAAAABAAAAAgAAAADAAAACQAAAAIAAAAKAAAAAQAAAAsAAAAAAAAADAAAAAAAAAACAAAAAQAAAAMAAAAAAAAABAAAAAAAAAAGAAAABQAAAAcAAAAEAAAACAAAAAMAAAAJAAAAAgAAAAoAAAABAAAACwAAAAAAAAAMAAAAAAAAAAUAAAAEAAAABgAAAAMAAAAHAAAAAgAAAAgAAAABAAAACQAAAAAAAAAKAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAIAAAABwAAAAkAAAAGAAAACgAAAAUAAAALAAAABAAAAAwAAAADAAAADQAAAAIAAAAOAAAAAQAAAA8AAAAAAAAAEAAAAAAAAAAEAAAAAwAAAAUAAAACAAAABgAAAAEAAAAHAAAAAAAAAAgAAAAAAAAABAAAAAMAAAAFAAAAAgAAAAYAAAABAAAABwAAAAAAAAAIAAAAAAAAAAIAAAABAAAAAwAAAAAAAAAEAAAAAAAAAAIAAAABAAAAAwAAAAAAAAAEAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAIAAAABwAAAAkAAAAGAAAACgAAAAUAAAALAAAABAAAAAwAAAADAAAADQAAAAIAAAAOAAAAAQAAAA8AAAAAAAAAEAAAAAAAAAAGAAAABQAAAAcAAAAEAAAACAAAAAMAAAAJAAAAAgAAAAoAAAABAAAACwAAAAAAAAAMAAAAAAAAAAYAAAAFAAAABwAAAAQAAAAIAAAAAwAAAAkAAAACAAAACgAAAAEAAAALAAAAAAAAAAwAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAABgAAAAUAAAAHAAAABAAAAAgAAAADAAAACQAAAAIAAAAKAAAAAQAAAAsAAAAAAAAADAAAAAAAAAAFAAAABAAAAAYAAAADAAAABwAAAAIAAAAIAAAAAQAAAAkAAAAAAAAACgAAAAAAAAABAAAAAAAAAAIAAAAAAAAACAAAAAcAAAAJAAAABgAAAAoAAAAFAAAACwAAAAQAAAAMAAAAAwAAAA0AAAACAAAADgAAAAEAAAAPAAAAAAAAABAAAAAAAAAABAAAAAMAAAAFAAAAAgAAAAYAAAABAAAABwAAAAAAAAAIAAAAAAAAAAQAAAADAAAABQAAAAIAAAAGAAAAAQAAAAcAAAAAAAAACAAAAAAAAAACAAAAAQAAAAMAAAAAAAAABAAAAAAAAAABAAAAAAAAAAIAAAAAAAAACAAAAAcAAAAJAAAABgAAAAoAAAAFAAAACwAAAAQAAAAMAAAAAwAAAA0AAAACAAAADgAAAAEAAAAPAAAAAAAAABAAAAAAAAAABgAAAAUAAAAHAAAABAAAAAgAAAADAAAACQAAAAIAAAAKAAAAAQAAAAsAAAAAAAAADAAAAAAAAAAGAAAABQAAAAcAAAAEAAAACAAAAAMAAAAJAAAAAgAAAAoAAAABAAAACwAAAAAAAAAMAAAAAAAAAAIAAAABAAAAAwAAAAAAAAAEAAAAAAAAAAYAAAAFAAAABwAAAAQAAAAIAAAAAwAAAAkAAAACAAAACgAAAAEAAAALAAAAAAAAAAwAAAAAAAAABQAAAAQAAAAGAAAAAwAAAAcAAAACAAAACAAAAAEAAAAJAAAAAAAAAAoAAAAAAAAAAQAAAAAAAAACAAAAAAAAAAgAAAAHAAAACQAAAAYAAAAKAAAABQAAAAsAAAAEAAAADAAAAAMAAAANAAAAAgAAAA4AAAABAAAADwAAAAAAAAAQAAAAAAAAAAQAAAADAAAABQAAAAIAAAAGAAAAAQAAAAcAAAAAAAAACAAAAAAAAAAEAAAAAwAAAAUAAAACAAAABgAAAAEAAAAHAAAAAAAAAAgAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAAAQAAAAAAAAACAAAAAAAAAAgAAAAHAAAACQAAAAYAAAAKAAAABQAAAAsAAAAEAAAADAAAAAMAAAANAAAAAgAAAA4AAAABAAAADwAAAAAAAAAQAAAAAAAAAAYAAAAFAAAABwAAAAQAAAAIAAAAAwAAAAkAAAACAAAACgAAAAEAAAALAAAAAAAAAAwAAAAAAAAABAAAAAMAAAAFAAAAAgAAAAYAAAABAAAABwAAAAAAAAAIAAAAAAAAAAIAAAABAAAAAwAAAAAAAAAEAAAAAAAAAAYAAAAFAAAABwAAAAQAAAAIAAAAAwAAAAkAAAACAAAACgAAAAEAAAALAAAAAAAAAAwAAAAAAAAABQAAAAQAAAAGAAAAAwAAAAcAAAACAAAACAAAAAEAAAAJAAAAAAAAAAoAAAAAAAAAAQAAAAAAAAACAAAAAAAAAAgAAAAHAAAACQAAAAYAAAAKAAAABQAAAAsAAAAEAAAADAAAAAMAAAANAAAAAgAAAA4AAAABAAAADwAAAAAAAAAQAAAAAAAAAAQAAAADAAAABQAAAAIAAAAGAAAAAQAAAAcAAAAAAAAACAAAAAAAAAAEAAAAAwAAAAUAAAACAAAABgAAAAEAAAAHAAAAAAAAAAgAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAAAQAAAAAAAAACAAAAAAAAAAgAAAAHAAAACQAAAAYAAAAKAAAABQAAAAsAAAAEAAAADAAAAAMAAAANAAAAAgAAAA4AAAABAAAADwAAAAAAAAAQAAAAAAAAAAYAAAAFAAAABwAAAAQAAAAIAAAAAwAAAAkAAAACAAAACgAAAAEAAAALAAAAAAAAAAwAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAAAgAAAAEAAAADAAAAAAAAAAQAAAAAAAAABgAAAAUAAAAHAAAABAAAAAgAAAADAAAACQAAAAIAAAAKAAAAAQAAAAsAAAAAAAAADAAAAAAAAAAFAAAABAAAAAYAAAADAAAABwAAAAIAAAAIAAAAAQAAAAkAAAAAAAAACgAAAAAAAAABAAAAAAAAAAIAAAAAAAAACAAAAAcAAAAJAAAABgAAAAoAAAAFAAAACwAAAAQAAAAMAAAAAwAAAA0AAAACAAAADgAAAAEAAAAPAAAAAAAAABAAAAAAAAAABAAAAAMAAAAFAAAAAgAAAAYAAAABAAAABwAAAAAAAAAIAAAAAAAAAAQAAAADAAAABQAAAAIAAAAGAAAAAQAAAAcAAAAAAAAACAAAAAAAAAACAAAAAQAAAAMAAAAAAAAABAAAAAAAAAABAAAAAAAAAAIAAAAAAAAAAwQEBgYHBwgICAgJCQkJCQkKBgYGBgcHCAgICQkJCQkJCQoGBgYGBwcICAgICQkJCQkJCgcHBwcICAgICQkJCQkJCQkKCgoHBwcICAgJCQkJCQkJCQoKCggICAgICAkJCQkJCQkJCgoKCAgICAgICQkJCQkJCQkLCgsICAgICAgJCQkJCQkJCQoKCgsLCAgICAkJCQkJCQkJCwoLCwsJCQkJCQkJCQkJCQkKCwoLCwkJCQkJCQkJCQkJCgsLCgsLCQkJCQkJCQkJCQkJCwoLCwsLCwkJCQkJCQkJCQkKCwsLCwsLCQoKCgkJCQkJCQsKCwsLCwsJCQkJCQkJCQkJCwsLCwsLCwoKCQkJCQkJCQkKCwsLCwsLCwsJCQkJCQkJCQAAAAAAAAABBAQGBggICQkKCwsLBgUFBwcICAoKCgsLCwYFBQcHCAgKCgsMDAwOBwcHCAkJCwsLDAsMEQcHCAcJCQsLDAwMDA4LCwgICgoLDAwNCwwOCwsICAoKCwwMDQ0MDg8OCgoKCgsMDAwMCw4NEAoKCgkMCwwMDQ4ODw4ODQoKCwsMCw0LDgwPDQ4LCgwKDAwNDQ0NDg8PDAwLCwwLDQwODg4OEQwMCwoNCw0NAAAAAAAAAAEEBAwLDQ0ODgQHBwsNDg4ODgMIAw4ODg4ODg4KDA4ODg4ODg4OBQ4IDg4ODg4MDg0ODg4ODg4ODQ4KDg4ODg4ODg4ODg4ODg4ODg4ODg4ODgAAAAAAAAACBAQEBQYFBQUFBgUFBQUGBQUFBQYGBgUFAAAAAAAAAAEEBAYGBwcHBwkJCgoHBQUHBwgICAgKCQsKBwUFBwcICAgICQoLCwAICAgICQkJCQoKCwsACAgICAkJCQkKCgsLAAwMCQkJCgoKCwsMDAANDQkJCQkKCgsLDAwAAAAKCgoKCwsMDAwNAAAACgoKCgsLDAwMDAAAAA4OCwsLCwwNDQ0AAAAODgsKCwsMDA0NAAAAAAAMDAwMDQ0NDgAAAAAADQwMDA0NDQ4AAAAAAAAAAgQEBQUHBwcHCAgKBQUGBgcHCAgICAoFBQYGBwcICAgICgcHBwcICAgICAgKCgoHBwcHCAgICAoKCggICAgICAgICgoKCAgICAgICAgKCgoICAgICAgJCQoKCgoKCAgICAkJCgoKCgoJCQkJCAkKCgoKCggJCAgJCAAAAAAAAAABBAQHBgYHBgYEBwYKCQkLCQkEBgcKCQkLCQkHCgoKCwsLCwoGCQkLCgoLCgoGCQkLCgsLCgoHCwsLCwsMCwsHCQkLCgoMCgoHCQkLCgoLCgoAAAAAAAAAAQQEBgYICAkJCAgJCQoKCwsABgYHBwgICQkJCQoKCwsMDAAGBQcHCAgJCQkJCgoLCwwMAAcHBwcICAkJCQkKCgsLDAwAAAAHBwgICQkKCgsLCwsMDAAAAAgICQkKCgoKCwsMDAwMAAAACAgJCQoKCgoLCwwMDAwAAAAJCQkJCgoKCgsLDAwNDQAAAAAACQkKCgoKCwsMDA0NAAAAAAAJCQoKCwsMDA0NDQ0AAAAAAAkJCgoLCwwMDA0NDQAAAAAACgoLCwsLDAwNDQ4OAAAAAAAAAAsLCwsMDA0NDg4AAAAAAAAACwsMDA0NDQ0ODgAAAAAAAAALCwwMDQ0NDQ4OAAAAAAAAAAwMDA0NDQ4ODg4AAAAAAAAAAAAMDA0NDg4ODgAAAAAAAAABBAMGBgcHCQkABQUHBwgHCQkABQUHBwgICQkABwcICAgICgoAAAAICAgICgoAAAAJCQkJCgoAAAAJCQkJCgoAAAAKCgoKCwsAAAAAAAoKCwsAAAAAAAAAAQMEBwcAAAAAAAQEBwcAAAAAAAQFBwcAAAAAAAYHCAgAAAAAAAAACAgAAAAAAAAACQkAAAAAAAAACgkAAAAAAAAACwsAAAAAAAAAAAAAAAAAAAAAAAAAAAEEBAYGAAAAAAAAAAAAAAAAAAAAAAAAAAAEBQUHBwAAAAAAAAAAAAAAAAAAAAAAAAAABAUFBwcAAAAAAAAAAAAAAAAAAAAAAAAAAAYHBwkJAAAAAAAAAAAAAAAAAAAAAAAAAAAHBwcJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQQFAAAAAAAABQcHAAAAAAAABQcHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQgIAAAAAAAACAkJAAAAAAAABwgJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQgIAAAAAAAABwkIAAAAAAAACAkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQgIAAAAAAAACAoJAAAAAAAACAkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwoJAAAAAAAACQkKAAAAAAAACQoKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwkJAAAAAAAACAoJAAAAAAAACQoKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQgIAAAAAAAACAkJAAAAAAAACAkKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwkJAAAAAAAACQoKAAAAAAAACAkKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwkKAAAAAAAACQoKAAAAAAAACQoJ", 8985, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+61440);
/* memory initializer (tweaked) */ allocateBase64Encoded("AwQDBgYHBwgICQkJCQkJCQkKCwsGBgcHCAgJCQkJCQkJCQoKCgYGBwcICAkJCQkJCQkJCgoKBwcHCAgICQkJCQkJCgkKCwoHBgcHCAgJCQkJCQkJCgoKCwcHCAgICAkJCQkJCQkJCgoKBwcICAgICQkJCQkJCQoLCwsICAgICAgJCQkJCQkJCQsKCgsLCAgICQkJCQkJCgkKCgoKCwsJCQkJCQkJCQkJCQkLCwoLCwkJCQkJCQkJCQoKCgoLCgsLCQkJCQkJCQkJCQkJCwoKCwsLCwkJCQkJCQkJCgoKCwsKCwsLCQoKCQkJCQkJCQoLCwsLCwsJCQkJCQkJCQkJCwsLCwsLCwoKCQkJCQkJCQkLCwsKCwsLCwsJCQkKCQkJCQAAAAAAAAABBAQGBggICQoKCwsLBgUFBwcICAkKCQsLDAUFBQcHCAkKCgwMDg0PBwcICAkKCwsKDAoLDwcICAgJCQsLDQwMDQ8KCggICgoMDAsOCgoPCwsICAoKDA0NDg8NDw8PCgoKCgwMDQwNCg8PDwoKCwoNCw0NDw0PDw8NDQoLCwsMCg4LDw8ODg0KCgwLDQ0ODg8PDw8PCwsLCwwLDwwPDw8PDwwMCwsODA0OAAAAAAAAAAEHBwsLCAsLCwsECwMLCwsLCwsLCwsLCwsLCwoLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwoLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLBwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwoLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsKCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsICwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwAAAAAAAAAAgMDBQUGBgYFBQYGBgUFBgYGBQUGBgYFBQAAAAAAAAABBAQGBgcHCAgJCQoKBgUFBwcICAgICQkLCwcFBQcHCAgICAkKCwsACAgICAkJCQkKCgsLAAgICAgJCQkJCgoLCwAMDAkJCQoKCgsLCwwADQ0JCQkJCgoLCwsMAAAACgoKCgsLDAwMDQAAAAoKCgoLCwwMDQwAAAAODgsKCwwMDQ0OAAAADw8LCwwLDAwODQAAAAAADAwMDA0NDg4AAAAAAA0NDAwNDQ0OAAAAAAAAAAEEBAYGBwcICAgICgoKBwYICAgICAgKCgoHBgcHCAgICAoKCgcHCAgICAgICgoKBwcICAgICAgKCgoICAgICQkJCQoKCggICAgJCQkJCgoKCQkJCQkJCQkKCgoKCgkJCQkJCQoKCgoKCQkJCQkJCgoKCgoJCQkJCQkAAAAAAAAAAQQEBwYGBwYGBAYGCgkJCwkJBAYGCgkJCgkJBwoKCwsLDAsLBwkJCwsKCwoKBwkJCwoLCwoKBwoKCwsLDAsLBwkJCwoKCwoKBwkJCwoKCwoKAAAAAAAAAAEEAwYGBwcICAgICQkKCgoKAAAABwcICAkJCQkKCgoKCwsAAAAHBwgICQkJCQoKCgoLCwAAAAcHCAgJCQkJCgoLCwsMAAAABwcICAkJCQkKCgsLCwsAAAAICAkJCQkKCgoKCwsMDAAAAAgICQkJCQoKCgsLCwwMAAAACQkKCQoKCgoLCwsLDAwAAAAAAAkJCgoKCgsLDAwMDAAAAAAACQkKCgoLCwsMDA0NAAAAAAAJCQoKCgoLCwwMDQ0AAAAAAAoKCwoLCwsMDQwNDQAAAAAAAAALCgsLDAwMDA0NAAAAAAAAAAsLDAwMDA0NDQ4AAAAAAAAACwsMDAwMDQ0NDgAAAAAAAAAMDAwNDQ0NDQ4OAAAAAAAAAAAADAwNDA0NDg4AAAAAAAAAAQMDBgYGBggIAAAABgYHBwkJAAAABgYHBwkJAAAABwcICAoKAAAABwcICAoKAAAACQkJCQoKAAAACQkJCQoKAAAACgoKCgsLAAAAAAAKCgsLAAAAAAAAAAECAwcHAAAAAAAAAAYGAAAAAAAAAAYGAAAAAAAAAAcHAAAAAAAAAAcHAAAAAAAAAAkIAAAAAAAAAAgIAAAAAAAAAAoKAAAAAAAAAAAAAAAAAAAAAAAAAAABBAQHBgAAAAAAAAAAAAAAAAAAAAAAAAAABAUFBwcAAAAAAAAAAAAAAAAAAAAAAAAAAAQFBQcHAAAAAAAAAAAAAAAAAAAAAAAAAAAGBwcJCQAAAAAAAAAAAAAAAAAAAAAAAAAABgcHCQkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEEBAAAAAAAAAUHBwAAAAAAAAUHBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUICAAAAAAAAAgJCQAAAAAAAAcJCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUICAAAAAAAAAcKCQAAAAAAAAgKCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUICAAAAAAAAAgKCgAAAAAAAAgJCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcKCgAAAAAAAAkJCwAAAAAAAAoLCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcKCgAAAAAAAAkLCQAAAAAAAAoLCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUICAAAAAAAAAgKCgAAAAAAAAgKCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcKCgAAAAAAAAoLCwAAAAAAAAkJCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcKCgAAAAAAAAoLCwAAAAAAAAkLCQ==", 4273, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+75352);
/* memory initializer (tweaked) */ allocateBase64Encoded("AgQEBQUFBQUGBgYGBgYGBgYGBgYGBgYGBgYGBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwAAAAAAAAABBAQHBwcHCAcJCAkJCgoLCwsLBgUFCAgJCQkICgkLCgwMDQwNDQUFBQgICQkJCQoKCwsMDA0MDQ0RCAgJCQkJCQkKCgwLDQwNDQ0NEggICQkJCQkJCwsMDA0NDQ0NDRENDAkJCgoKCgsLDAwMDQ0NDg4SDQwJCQoKCgoLCwwMDQ0NDg4OERISCgoKCgsLCwwMDA4NDg0NDhISEgoJCgkLCwwMDAwNDQ8ODg4SEhANDgoLCwsMDQ0NDQ4NDQ4OEhISDgwLCQsKDQwNDQ0ODg4NDhISERISCwwMDA0NDg0ODg0ODg4SEhISEQwKDAkNCw0ODg4ODg8OEhIRERIODwwNDQ0ODQ4ODw4PDhIREhISDw8MCg4KDg4NDQ4ODg4SEBISEhIRDg4NDg4NDQ4ODg8PEhISEhEREQ4ODgwODQ4ODw4PDhISEhISEhIREA0NDQ4ODg4PEA8SEhISEhISERENDQ0NDg0ODw8PAAAAAAAAAAEEAwwMDAwMDAwMDAwMDAwMDAwEBQYMDAwMDAwMDAwMDAwMDAwMBAYGDAwMDAwMDAwMDAwMDAwMDAwMCwwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsAAAAAAAAABAYGBwcHBwgICAgICAgICAgICAgICgYGBwcICAgICQkJCQkJCQkJCQkJCgYGBwcICAgICQkJCQkJCQkJCQkJCgcHCAgICAgJCQkJCQkJCQkJCQkJCgoKCAgICAkJCQkJCQkJCQkJCQkJCgoKCAgICAkJCQkJCQkJCQkJCQkJCgoKCAgICAkJCQkJCQkJCQkJCQkJCgoKCQkJCQkJCQkJCQkJCQkJCQkJCgoKCgoJCQkJCQkJCQkJCQkJCQkJCgoKCgoJCQkJCQkJCQkJCQkJCQkJCgoKCgoJCQkJCQkJCQkJCQkJCQkJCgoKCgoJCQkJCQkJCQkJCQkKCQkJCgoKCgoKCgkJCQkJCQoJCQkJCQkJCgoKCgoKCgkJCQoKCgoKCQkJCQkJCgoKCgoKCgkJCgkKCQkJCQkJCQkKCgoKCgoKCgoKCQkKCgkJCQkJCQkJCgoKCgoKCgoKCgoKCgkJCQkJCQkJCgoKCgoKCgoKCgoKCgkJCgkJCQkJCgoKCgoKCgoKCgoJCQoKCQkKCQkJCgoKCgoKCgoKCgoJCQoJCQkJCQkJCgoKCgoKCgoKCgoJCQkJCgkJCQkJAAAAAAAAAAEEBAcGCAgICAkJCgoLCgYFBQcHCQkICQoKCwsMDAYFBQcHCQkJCQoKCwsMDBUHCAgICQkJCQoKCwsMDBUICAgICQkJCQoKCwsMDBULDAkJCgoKCgoLCwwMDBUMDAkICgoKCgsLDAwNDRUVFQkJCQkLCwsLDAwMDRUUFAkJCQkKCwsLDAwNDRQUFA0NCgoLCwwMDQ0NDRQUFA0NCgoLCwwMDQ0NDRQUFBQUDAwMDAwMDQ0ODhQUFBQUDAwMCw0MDQ0ODhQUFBQUDxANDA0NDg0ODhQUFBQUEA8MDA0MDg0ODgAAAAAAAAAFBgYGBgcHBwcHBwcGBgYGBwcHBwcHBwYGBgYHBwcHBwcIBgYGBgcHBwcHBwgICAYGBwcHBwcHCAgIBwcHBwcHBwcICAgHBwcHBwcHBwgICAcHBwcHBwcHCAgICAgHBwcHBwcICAgICAcHBwcHBwgICAgIBwcHBwcHAAAAAAAAAAIEBAYGBwcICAoKCwsGBAQGBggICQkKCgwMBgQFBgYICAkJCgoMDBQGBgYGCAgJCgsLDAwUBgYGBggICgoLCwwMFAoKBwcJCQoKCwsMDBQLCwcHCQkKCgsLDAwUFBQJCQkJCwsMDA0NFBQUCQkJCQsLDAwNDRQUFA0NCgoLCwwNDQ0UFBQNDQoKCwsMDQ0NFBQUFBMMDAwMDQ0ODxMTExMTDAwMDA0NDg4AAAAAAAAABAQEBQUFBAQFBQUEBAUFBQUFBQUFBQUFBQAAAAAAAAACBAQGBgcHBwcICAkJBQQEBgYICAkJCQkKCgYEBAYGCAgJCQkJCgoABgYHBwgICQkKCgsLAAYGBwcICAkJCgoLCwAKCggICQkKCgsLDAwACwsICAkJCgoLCwwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQFBQYGBwcHBwcHCwUFBgYHBwcHCAgLBQUGBgcHBwcICAsFBQYGBwcICAgICwsLBgYHBwcICAgLCwsGBgcHBwgICAsLCwYGBwcHBwgICwsLBwcHBwcHCAgLCwsKCgcHBwcICAsLCwsLBwcHBwcHCwsLCwsHBwcHBwcAAAAAAAAAAQQEBQcHBgcHBAcGCQoKCgoJBAYHCQoKCgkKBQkJCQsLCgsLBwoJCwwLDAwMBwkKCwsMDAwMBgoKCgwMCgwLBwoKCwwMCwwMBwoKCwwMDAwMAAAAAAAAAAMEBAUFBgYHBwgICQkKCgoKAAUEBQUHBwgICAgJCQoKCwsABQUGBgcHCAgICAkJCgoLCwAGBQYGBwcICAkJCgoLCwsMAAAABgYHBwgICQkKCgsLDAwAAAAHBwcHCQkJCQoKCwsMDAAAAAcHBwgJCQkJCgoLCwwMAAAABwcICAkJCgoLCwwMDQ0AAAAAAAgICQkKCgsLDAwMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwQEBQUGBggIAAQEBQUGBwgIAAQEBQUHBwgIAAUFBgYHBwkJAAAABgYHBwkJAAAABwcICAkJAAAABwcICAkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMFBQgIAAUFCAgABQUICAAHBwkJAAAACQkGBwcJCAAICAkJAAgHCQkACQoKCgAAAAsKBgcHCAkACAgJCQAHCAkJAAoJCwoAAAAKCggJCAoKAAoKDAsACgoLCwAMDQ0NAAAADQwICAkKCgAKCgsMAAoKCwsADQwNDQAAAA0NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYIBwoKAAcHCgkABwcKCgAJCQoKAAAACgoGBwgKCgAHBwkKAAcHCgoACQkKCgAAAAoKCAkJCwsACgoLCwAKCgsLAAwMDAwAAAAMDAgJCgsLAAkKCwsACgoLCwAMDAwMAAAADAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQgHCgoABwcKCgAHBwoJAAkJCgoAAAAKCgYHCAoKAAcHCgoABwcJCgAJCQoKAAAACgoICgkMCwAKCgwLAAoJCwsACwwMDAAAAAwMCAkKCwwACgoLCwAJCgsLAAwLDAwAAAAMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHCgkMDAAJCQwLAAkJCwsACgoMCwAAAAsMBwkKDAwACQkLDAAJCQsLAAoKCwwAAAALCwkLCg0MAAoKDAwACgoMDAALCwwMAAAADQwJCgsMDQAKCgwMAAoKDAwACwwMDAAAAAwNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQsKDQ0ACgoMDAAKCgwMAAsMDAwAAAAMDAkKCw0NAAoKDAwACgoMDAAMCw0MAAAADAwAAAAAAAAAAQUFAAUFAAUFBggIAAkIAAkIBggIAAgJAAgJAAAAAAAAAAAABQgIAAcHAAgIBQgIAAcIAAgIAAAAAAAAAAAABQkIAAgIAAcHBQgJAAgIAAcHAAAAAAAAAAIEBAQFBQUFBgYGBgYGBgYGBgYGBgYGBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcAAAAAAAAAAQQEBwYHBwcHCAgJCQoKCgoLCwYGBggICQgIBwoICwoMCwwMDQ0FBQYICAkJCAgKCQsLDAwNDQ0NEQgICQkJCQkJCgkMCgwMDQwNDREJCAkJCQkJCQoKDAwMDA0NDQ0RDQ0JCQoKCgoLCwwLDQwNDQ4PEQ0NCQgKCQoKCwsMDA4NDw0ODxEREQkKCQoLCwwMDAwNDQ4ODw8REREJCAkICwsMDAwMDg0ODg4PERERDA4JCgsLDAwODQ0ODw0PDxEREQ0LCggLCQ0MDQ0NDQ0ODg4REREREQsMCwsNDQ4NDw4NDxAPERERERELCwwIDQwODREODw4PDhERERERDw8MDAwMDQ4ODg8OEQ4RERERERARDAwNDA0NDg4ODg4OEREREREREQ4ODQwNDQ8PDg0PERERERERERENDg0NDQ0ODw8PDg8REREREREREA8NDg0NDg4PDg4QERERERERERAQDQ4NDQ4ODw4PDgAAAAAAAAABBAMLCwsLCwsLCwsLCwsLCwQHBwsLCwsLCwsLCwsLCwsLBAgLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKAAAAAAAAAAQFBQcHBwcICAgICAgICAgICAgICAoGBgcHCAgICAkJCQkJCQkJCQkJCQoGBgcHCAgICAgICQkJCQkJCQkJCQoHBwgICAgJCQkJCQkJCQkJCQkJCQoKCggICAgJCQkJCQkJCQkJCQkJCQoKCggICAkJCQkJCQkJCQkJCQkJCQoKCggICAgJCQkJCQkJCQkJCQkJCQoKCgkJCQkJCQkJCQkJCQkJCQkJCQoKCgoKCQkJCQkJCQkJCQkJCQkJCQoKCgoKCQkJCQkJCQkKCQkJCQkJCQoKCgoKCQkJCQkJCQkJCQkJCQkJCQoKCgoKCQkJCQkJCQkKCgoJCQkJCQoKCgoKCgoJCQkJCQoKCgkJCQkJCQoKCgoKCgoJCgoJCgoKCgkKCQoKCQoKCgoKCgoJCgoKCgoKCQkKCgkKCgoKCgoKCgoKCgoKCgoJCQkKCQkJCQoKCgoKCgoKCgoKCgoKCQkKCQoJCgoKCgoKCgoKCgoKCgoKCgkJCgkJCQoKCgoKCgoKCgoKCQkJCQkJCgkJCgoKCgoKCgoKCgoKCgoKCQoJCQoJCQoKCgoKCgoKCgoKCgoJCQoKCQoJCQAAAAAAAAABBAQHBggICAcJCAoKCwoGBQUHBwkJCAgKCgsLDAsGBQUHBwkJCQkKCgsLDAwUCAgICAkJCQkKCgsLDAwUCAgICAoJCQkKCgsLDAwUDAwJCQoKCgoKCwwMDAwUDAwJCQoKCgoLCwwMDQ0UFBQJCQkJCwoLCwwMDA0UExMJCQkJCwsLDAwMDQ0TExMNDQoKCwsMDA0NDQ0TExMODQsKCwsMDAwNDQ0TExMTEwwMDAwNDQ0NDg0TExMTEwwMDAsMDA0ODg4TExMTExAPDQwNDQ0ODg4TExMTExERDQwNCw4NDw8AAAAAAAAABAUGBgYHBwcHBwcIBgYGBwcHBwcHBwgGBgYGBwcHBwcHCAYGBwcHBwcHBwcICAgHBwcHBwcHBwgICAcHBwcHBwcHCAgIBwcHBwcHBwcICAgHBwcHBwcHBwgICAgIBwcHBwcHCAgICAgHBwcHBwcICAgICAcHBwcHBwAAAAAAAAABBAQGBggHCQkKCgwMBgUFBwcICAoKCwsMDAcFBQcHCAgKCgsLDAwVBwcHBwgJCgoLCwwMFQcHBwcJCQoKDAwNDRULCwgICQkLCwwMDQ0VCwsICAkJCwsMDA0NFRUVCgoKCgsLDA0NDRUVFQoKCgoLCw0NDg0VFRUNDQsLDAwNDQ4OFRUVDg4LCwwMDQ0ODhUVFRUUDQ0NDA4OEA8UFBQUFA0NDQ0ODQ8PAAAAAAAAAAMEBAUFBQQEBQUFBAQFBQYFBQUFBgYGBQUAAAAAAAAAAQQEBgYHBwgICQkKCgYFBQcHCAgJCQoKCwsGBQUHBwgICQkKCgsLAAcHBwcJCQoKCgoLCwAHBwcHCQkKCgoKCwsACwsJCQoKCwsLCwwMAAwMCQkKCgsLDAwMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADBQUGBgcHCAgICAsEBQYGBwcICAgICwUFBgYHBwgICAkMBQUGBgcHCAgJCQwMDAYGBwcICAkJCwsLBgYHBwgICAgLCwsGBgcHCAgICAsLCwcHBwgICAgICwsLCwsHBwgICAgLCwsLCwcHBwcICAsLCwsLBwcHBwgIAAAAAAAAAAEEBAUHBwYHBwQHBgoKCgoKCgQGBgoKCgoJCgUKCgkLCwoLCwcKCgsMDAwMDAcKCgsMDAwMDAYKCgoMDAoMDAcKCgsMDAwMDAcKCgsMDAwMDAAAAAAAAAADBAQFBQcHCAgICAkJCgoLCwAEBAYGBwcICAkICgoLCwsLAAQEBgYHBwgICQkKCgsLCwsABgUGBgcHCQkJCQoKCwsMDAAAAAYGBwcJCQkJCgoLCwwMAAAABwcICAkJCgoLCwsMDAwAAAAHBwgICQkKCgsLCwwMDAAAAAcHCAgJCQoKCwsMDA0NAAAAAAAICAkJCgoLCwwMDQ0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIEBAUFBwcJCQAEBAYGBwcJCQAEBAYGBwcJCQAFBQYGCAgKCgAAAAYGCAgKCgAAAAcHCQkKCgAAAAcHCAgKCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADBQUICAAFBQgIAAUFCAgABwcJCQAAAAkJBQcHCQkACAcKCQAIBwoJAAoKCwsAAAALCwUHBwkJAAcICQoABwgJCgAKCgsLAAAACwsICQkLCgALCgwLAAsKDAwADQ0ODgAAAA4NCAkJCgsACgsMDAAKCwwMAA0NDg4AAAANDgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCAcLCgAHBwoKAAcHCgoACQkKCgAAAAsKBQcICgsABwcKCgAHBwoKAAkJCgoAAAAKCggKCQwMAAoKDAsACgoMDAAMDA0MAAAADQwICQoMDAAKCgsMAAoKCwwADAwNDQAAAAwNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYIBwsKAAcHCgoABwcKCgAJCQoLAAAACgoGBwgKCwAHBwoKAAcHCgoACQkKCgAAAAoKCQoJDAwACgoMDAAKCgwLAAwMDQ0AAAANDAgJCgwMAAoKDAwACgoLDAAMDA0NAAAADA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwoKDQ0ACQkMDAAJCQwMAAoKDAwAAAAMDAcKCg0NAAkJDAwACQkMDAAKCgwMAAAADAwJCwsODQAKCg0MAAsKDQwADAwNDAAAAA0NCQsLDQ4ACgsMDQAKCw0NAAwMDA0AAAANDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkLCw4OAAoLDQ0ACwoNDQALDA0NAAAADQwJCwsODgALCg0NAAoLDQ0ADAwNDQAAAAwNAAAAAAAAAAEFBQAFBQAFBQUHBwAJCAAJCAYHBwAICQAICQAAAAAAAAAAAAUJCAAICAAICAUICQAICAAICAAAAAAAAAAAAAUJCAAICAAICAUICQAICAAICAAAAAAAAAACBAMEBQUFBgYGBgYGBgYGBgcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHAAAAAAAAAAEEBAcHBwcHBggICAgGBgYICAkICAcJCAsKBQYGCAgJCAgICgkLCxAICAkICQkJCAoJCwoQCAgJCQoKCQkKCgsLEA0NCQkKCgkKCwsMCxANDQkICgkKCgoKCwsQDhAICQkJCwoLCwwLEBAQCQcKBwsKCwsMCxAQEAwMCQoLCwwLDAwQEBAMCgoHCwgMCwwMEBAPEBALDAoKDAsMDBAQEA8PCwsKCgwMDAwAAAAAAAAAAQMDCwsLCwsLCwsLCwQGBgsLCwsLCwsLCwsEBwcLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwAAAAAAAAADBQUHBgcHCAgICAgICAgICAgICAgKBgYHBwgICAgJCQkJCQkJCQkJCQkKBgYHBwgICAgJCQkJCQkJCQkJCQkKBwcICAgICQkJCQkJCQkJCQkJCQkKCgoICAgICQkJCQkJCQkJCQkJCQkKCgoICAgJCQkJCQkJCQkJCQkJCQkKCgoICAkJCQkJCQkJCQkJCQkJCQkKCgoJCQkJCQkJCQkJCQkJCQkJCQkKCwoKCgkJCQkJCQkJCQkKCQkKCQkKCwoLCgkJCQkJCQkKCgoJCgkJCQkLCgsKCgkJCQkJCQoJCQoJCQoJCQoLCgoLCgkJCQkJCgoJCgoKCgkKCgoKCgoLCwsKCQkJCgoKCgoKCgoKCgoKCgsLCgoKCgoKCgoKCgoKCQoKCQoLCwoLCgsKCQoKCQoKCgoKCgoKCgoLCwsLCgsLCgoKCgoKCQoJCgoJCgkKCgoLCgsKCwsKCgoKCgoJCgoKCgoKCgsKCgoKCgoKCgoKCgoKCgoKCgoKCgoLCgsLCgoKCgkJCgoJCQoJCgoKCgsLCgoKCgoKCgkJCgoKCQkKCgoKCgsKCwoKCgoKCgkKCgoKCgoKCgoAAAAAAAAAAQQEBwcICAgHCQgJCQoKBgUFBwcJCQgICgkLCgwLBgUFCAcJCQgICgoLCwwLEwgICAgKCgkJCgoLCwwLEwgICAgKCgkJCgoLCwwMEwwMCQkKCgkKCgoLCwwMEwwMCQkKCgoKCgoMDAwMExMTCQkJCQsKCwsMCw0NExMTCQkJCQsKCwsLDA0NExMTDQ0KCgsLDAwMDA0MExMTDg0KCgsLDAwMDQ0NExMTExMMDAwLDA0ODQ0NExMTExMMDAwLDAwNDg0OExMTExMQEAwNDA0NDg8OExISEhIQDwwLDAsODA4OAAAAAAAAAAQFBQYGBwcHBwcHCAYGBwcHBwcHBwcIBgYGBwcHBwcHBwgGBgcHBwcHBwcHCAgIBwcHBwcHBwcICAgHBwcHBwcHBwgICAcHBwcHBwcHCAgIBwcHBwcHBwcICAgICAcHBwcHBwgICAgIBwcHBwcHCAgICAgHBwcHBwcAAAAAAAAAAQQEBgYHCAkJCgoMCwYFBQcHCAgJCgsLDAwHBQUHBwgICgoLCwwMFAcHBwcICQoKCwsMDRQHBwcHCQkKCgsMDQ0UCwsICAkJCwsMDA0NFAsLCAgJCQsLDAwNDRQUFAoKCgoMDA0NDQ0UFBQKCgoKDAwNDQ0OFBQUDg4LCwwMDQ0ODhQUFA4OCwsMDA0NDg4UFBQUEw0NDQ0ODg8OExMTExMNDQ0NDg4PDwAAAAAAAAADBAQFBQUEBAUFBQQEBQUGBQUFBQYGBgUFAAAAAAAAAAEEBAYGBwcIBwkICgoGBQUHBwgICQkJCgsLBwUFBwcICAkJCgoLCwAHBwcHCQgJCQoKCwsACAgHBwgJCQkKCgsLAAsLCQkKCgsKCwsMDAAMDAkJCgoLCwsLDAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwUFBgYHBwgICAgLBAQGBgcHCAgJCQsEBAYGBwcICAkJDAUFBgYHBwkJCQkMDAwGBgcHCQkJCQsLCwcHBwcICAkJCwsLBwcHBwgICQkLCwsHBwgICAgJCQsLCwsLCAgICAgJCwsLCwsICAgICAgLCwsLCwcHCAgICAAAAAAAAAABBAQFBwcGBwcEBgcKCgoKCgkEBgYKCgoKCQoFCgoJCwwKCwwHCgoLDAwMDAwHCgoLDAwMDAwGCgoKDAwLDAwHCgoMDAwMCwwHCgoLDAwMDAwAAAAAAAAAAwQEBQUHBwgICAgJCQoKCwsABAQGBgcHCAgJCQoKCwsMDAAEBAYGBwcICAkJCgoLCwwMAAUFBgYICAkJCQkKCgsMDAwAAAAGBggHCQkJCQoKCwsMDAAAAAcHCAgJCQoKCwsMDA0MAAAABwcICAkJCgoLCwwMDA0AAAAHBwgICQkKCgsLDAwNDQAAAAAACAgJCQoKCwsMDA0NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBAQFBQcHCQkABAQGBgcHCQkABAQGBgcHCQkABQUGBggICgoAAAAGBggICgoAAAAHBwkJCgoAAAAHBwgICgoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwUFCAgABQUICAAFBQgIAAcHCQkAAAAJCQUHBwkJAAgICgoACAcKCQAKCgsLAAAACwsFBwcJCQAICAoKAAcICQoACgoLCwAAAAsLCAkJCwoACwsMDAALCgwMAA0ODg4AAAAODQgJCQoLAAsLDAwACgsMDAANDQ4OAAAADQ4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQgHCwoABwcKCgAHBwoKAAkJCwoAAAALCwUHCAoLAAcHCgoABwcKCgAJCQoLAAAACwsICgkMDAAKCgwMAAoKDAwADAwNDQAAAA0NCAkKDAwACgoMDAAKCgsMAAwMDQ0AAAANDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCAgLCwAHBwoKAAcHCgoACQkKCwAAAAsKBQgICgsABwcKCgAHBwoKAAkJCwoAAAAKCwkKCgwMAAoKDAwACgoMDAAMDQ0NAAAADQwJCgoMDAAKCgwMAAoKDAwADQwNDQAAAAwNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcKCg4NAAkJDAwACQkMDAAKCgwMAAAADAwHCgoNDgAJCQwNAAkJDAwACgoMDAAAAAwMCQsLDg0ACwoNDAALCw0NAAwMDQ0AAAANDQkLCw0OAAoLDA0ACwsNDQAMDA0NAAAADQ0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJCwsODgAKCw0NAAsKDQ0ADAwNDQAAAA0MCQsLDg4ACwoNDQAKCw0NAAwMDg0AAAANDQAAAAAAAAABBQUABQUABQUFCAcACQkACQgFBwgACQkACAkAAAAAAAAAAAAFCQkACAgACAgFCAkACAgACAgAAAAAAAAAAAAFCQkACAgACAgFCAkACAgACAgAAAAAAAAAAgQDBAUFBQYGBgYGBgYGBgYHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwAAAAAAAAABBAQHBwcHBwYICAgIBgYGCAgICAgHCQgKCgUGBggICQkICAoKCgoQCQkJCQkJCQgKCQsLEAgJCQkJCQkJCgoLCxANDQkJCgkJCgsLCwwQDQ4JCAoICQkKCgwLEA4QCQkJCQsLDAsMCxAQEAkHCQYLCwsKCwsQEBALDAkKCwsMCw0NEBAQDAsKBwwKDAwMDBAQDxAQCgsKCw0NDgwQEBAPDwwKCwsNCwwNAAAAAAAAAAEDAwsLCwsLCwsLCwsEBwcLCwsLCwsLCwsLBQgJCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoAAAAAAAAAAwUFBgYHBwcHCAcICAgICAgICAgICgYGBwcICAgICAgJCQkJCQkJCQkJCgYGBwcICAgICAgJCAkJCQkJCQkJCgcHCAgICAgJCQkJCQkJCQkJCQkJCgsLCAcICAgJCQkJCQkJCQkJCQkJCwsLCAgICAkJCQkJCQkJCQkJCQkJCwsLCAgICAkJCQkJCQkJCQkJCQkJCwsLCQkJCQkJCQkJCQkJCQkJCQkJCwsLCwsJCQkJCQkJCQkJCQkJCgoJCwsLCwsJCQkJCQkKCQkKCQoJCQoJCwsLCwsJCQkJCQkJCgoKCgkKCgkKCwsLCwsJCQkJCgoKCQoKCgoJCgoJCwsLCwsLCwkJCQkKCgoKCQoKCgoKCwsLCwsLCwoJCgoKCgoKCgkKCQoKCwsLCwsLCwoJCgkKCgkKCgoKCgoKCwsLCwsLCwoKCgoKCgoJCgoKCgoJCwsLCwsLCwsLCgoKCgoKCgoKCgoKCwsLCwsLCwsLCgoKCgoKCgoKCg==", 10240, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+84552);
/* memory initializer (tweaked) */ allocateBase64Encoded("CgoLCwsLCwsLCwsKCgoKCgoKCgoJCgoLCwsLCwsLCwsKCgoJCgoKCgoKCgoKCwsLCwsLCwsKCwkKCgoKCgoKCgoAAAAAAAAAAQQEBwcICAcHCAcJCAoJBgUFCAgJCQgICQkLCgsKBgUFCAgJCQgICQkKCgsLEggICQgKCgkJCgoKCgsKEggICQkKCgkJCgoLCwwMEgwNCQoKCgkKCgoLCwwLEg0NCQkKCgoKCgoLCwwMEhISCgoJCQsLCwsLDAwMEhISCgkKCQsKCwsLCw0MEhISDg0KCgsLDAwMDAwMEhISDg0KCgsKDAwMDAwMEhISEhIMDAsLDAwNDQ0OEhISEhIMDAsLDAsNDQ4NEhISEhIQEAsMDA0NDQ4NEhISEhIQDwwLDAsNCw8OAAAAAAAAAAMFBQYGBwcHBwcHCQUFBgYHBwcHCAcIBQUGBgcHBwcHBwkGBgcHBwcIBwcICQkJBwcHBwcHBwgJCQkHBwcHCAgICAkJCQcHBwcHBwgICQkJCAgICAcHCAgJCQkJCAgIBwcICAkJCQgICAgHBwgICQkJCAgHBwcHCAgAAAAAAAAAAQQEBgYICAgICgoLCgYFBQcHCAgJCQoKDAsGBQUHBwgICQkKCgwLFQcHBwcJCQoKCwsMDBUHBwcHCQkKCgsLDAwVDAwJCQoKCwsLCwwMFQwMCQkKCgsLDAwMDBUVFQsLCgoLDAwMDQ0VFRULCwoKDAwMDA0NFRUVDw8LCwwMDQ0NDRUVFQ8QCwsMDA0NDg4VFRUVFA0NDQ0NDQ4OFBQUFBQNDQ0NDQ0ODgAAAAAAAAADBAQFBQUEBAUFBQQEBQUGBQUFBQYGBgUFAAAAAAAAAAEEBAYGCAgICAoJCgoGBQUHBwkJCQkKCgsLBgUFBwcJCQoJCwoLCwAGBgcHCQkKCgsLDAwABwcHBwkJCgoLCwwMAAsLCAgKCgsLDAwMDAALDAkICgoLCwwMDQ0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwUEBgYHBwgICAgLBAQGBgcHCAgICAsEBAYGBwcICAgICwYGBgYICAgICQkLCwsGBgcICAgICQsLCwcHCAgICAgICwsLBwcICAgICAgLCwsICAgICAgICAsLCwoKCAgICAgICwsLCgoICAgICAgLCwsKCgcHCAgICAAAAAAAAAABBAQFBwcGBwcEBgYJCQoKCgkEBgYJCgkKCQoGCQkKDAsKCwsHCgkLDAwMDAwHCgoLDAwMDAwGCgoKDAwLDAwHCQoLDAwMDAwHCgkMDAwMDAwAAAAAAAAAAgQEBgYHBwgICAgJCQkKCgoABAQGBggICQkJCQoKCgoLCwAEBAYGCAgJCQkJCgoKCgsLAAYGBwcICAkJCQkKCgsLCwsAAAAHBwgICQkJCQoKCwsLCwAAAAcHCQkKCgoKCwsLCwwMAAAABwcJCQoKCgoLCwsLDAwAAAAHBwgICQkKCgsLDAwMDAAAAAAACAgJCQoKCwsMDAwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAwQGBgcHCQkABAQGBgcHCQoABAQGBgcHCgkABQUHBwgICgoAAAAHBggICgoAAAAHBwkJCwsAAAAHBwkJCwsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwUFCAgABQUICAAFBQgIAAcHCQkAAAAJCQUHBwkJAAgICgoACAcKCQAKCgsLAAAACwsFBwcJCQAICAoKAAcICQoACgoLCwAAAAsLCAkJCwsACwsMDAALCgwMAA0ODg4AAAAODQgJCQsLAAsLDAwACgsMDAAODQ4OAAAADQ4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQgHCwoABwcKCgAHBwoKAAkJCwoAAAALCwUHCAoLAAcHCgoABwcKCgAJCQoLAAAACwsICgkMDAAKCgwMAAoKDAwADAwNDQAAAA0NCAkKDAwACgoLDAAKCgwMAAwMDQ0AAAANDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCAgLCwAHBwoKAAcHCgoACQkKCwAAAAsKBQgICwsABwcKCgAHBwoKAAkJCwsAAAAKCwgKCgwMAAoKDAwACgoMDAAMDQ0NAAAADg0ICgoMDAAKCgwMAAoKDAwADQwNDQAAAA0NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcKCg4NAAkJDQwACQkMDAAKCgwMAAAADAwHCgoNDgAJCQwNAAkJDAwACgoMDAAAAAwMCQsLDg0ACwoODQALCw0NAAwMDQ0AAAANDQkLCw0OAAoLDQ4ACwsNDQAMDA0NAAAADQ0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJCwsODgALCw0NAAsKDQ0ADAwNDQAAAA0NCQsLDg4ACwsNDQAKCw0NAAwMDg0AAAANDQAAAAAAAAABBQUABQUABQUFCAcACQkACQgFBwgACQkACAkAAAAAAAAAAAAFCQgACAgACAgFCAkACAgACAgAAAAAAAAAAAAFCQkACAgACAgFCQkACAgACAgAAAAAAAAAAwUFBgYHBwcHCAgICAgICAgICAgJCwUGBwcIBwgICAgJCQkJCQkJCQkJCwUFBwcHBwgICAgJCQkJCQkJCQkJCwcHBwcICAgICQkJCQkJCQkJCgkKCwsLBwcICAgICQkJCQkJCgoKCgoKCwsLCAgICAkJCQkJCQkKCgoKCgoKCwsLCAgICAkJCQkJCQoKCgoKCgoKCwsLCQkJCQkJCQkJCQoKCgoKCgoKCwsLCwsJCQkJCQkKCQoKCgoKCgoKCwsLCwsJCQkJCQkKCgoKCgoKCgoKCwsLCwsJCQkJCQkKCgoKCgoKCgoKCwsLCwsJCQoJCgoKCgoKCgoKCgoKCwsLCwsLCwkJCgoKCgoKCgoKCgoKCwsLCwsLCwoKCgoKCgoKCgoKCgoKCwsLCwsLCwoKCgoKCgoKCgoKCgoKCwsLCwsLCwoKCgoKCgoKCgoKCgoKCwsLCwsLCwsLCgoKCgoKCgoKCgoKCwsLCwsLCwsLCgoKCgoKCgoKCgoKCwsLCwsLCwsLCgoKCgoKCgoKCgoKCwsLCwsLCwsLCgoKCgoKCgoKCgoKCwsLCwsLCwsLCwsKCgoKCgoKCgoKAAAAAAAAAAEEBAUFBwcJCAoJCgoLCgsLBgUFBwcICQoKCwoMCwwLDQwGBQUHBwkJCgoLCwwMDQwNDRIICAgICQkKCwsLDAsNCw0MEggICAgKCgsLDAwNDQ0NDQ4SDAwJCQsLCwsMDA0MDQwNDRQNDAkJCwsLCwwMDQ0NDg4NFBITCwwLCwwMDQ0NDQ0NDg0SExMMCwsLDAwNDA0NDQ4ODRIREw4PDAwMDQ0NDg4ODg4OExMTEA8MCw0MDg4ODQ0ODg4TEhMSEw0NDQ0ODg4NDg4ODhIRExMTDQ0NCw0LDQ4ODg4OExEREhIQEA0NDQ0ODQ8PDg4TExEREhAQDQsOCg0MDg4ODhMTExMTEhENDg0LDg0ODg8PExMTERMSEg4NDAsOCw8PDw8AAAAAAAAAAQMDDQ0NDQ0NDQ0NDQ0NBAcHDQ0NDQ0NDQ0NDQ0NAwgGDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQwMDAwMDAwMAAAAAAAAAAIEBAUFBgUFBQUGBAUFBQYFBQUFBgYGBQUAAAAAAAAAAQQEBgYHBwgICQkKCgYFBQcHCAgICQoKCgoHBQUHBwgICQkKCgoKAAgICAgJCQkJCgoLCwAICAgICQkJCQoKCwsADAwJCQkKCgoKCgsLAA0NCQkJCQoKCwsLCwAAAAoKCgoKCgsLCwsAAAAKCgoKCgoLCwwMAAAADg4LCwsLDAwMDAAAAA4OCwsLCwwMDAwAAAAAAAwMDAwMDA0NAAAAAAAMDAwMDAwNDQAAAAAAAAACBAQGBgcHCAgICAoFBQYGBwcICAgICgUFBgYHBwgICAgKBgYHBwgICAgICAoKCgcHCAgICAgICgoKBwcICAgICAgKCgoHBwgICAgICAoKCggICAgICAgJCgoKCgoICAgICAgKCgoKCgkJCAgICAoKCgoKCAgICAgIAAAAAAAAAAEEBAcGBgcGBgQHBwoJCQsJCQQHBwoJCQsJCQcKCgsLCgsLCwYJCQsKCgsKCgYJCQsKCgsKCgcLCwwLCwwLCwYJCQsKCgsKCgYJCQsKCgsKCgAAAAAAAAACBAQGBggICQkJCQoKCgoLCwAEBAYGCAgJCQkJCgoLCwwMAAQEBgYICAkJCQkKCgsLDAwABgYHBwgICQkJCQoKCwsMDAAAAAcHCAgJCQkJCgoLCwwMAAAABwcJCQoKCgoLCwsLDAwAAAAHBwgJCgoKCgsLCwsMDAAAAAgICQkKCgoKCwsMDAwMAAAAAAAJCQoKCgoLCwwMDAwAAAAAAAkJCgoKCgsLDAwMDAAAAAAACQkJCgoKCwsMDAwMAAAAAAAKCgoKCwsLDAwMDQ0AAAAAAAAACgoLCwsLDAwNDQAAAAAAAAALCwsLDAwMDQ0NAAAAAAAAAAsLCwsMDAwMDQ0AAAAAAAAADAwMDA0MDQ0NDQAAAAAAAAAAAAwMDAwNDQ0NAAAAAAAAAAIEAwYGBwcJCQAEBAYGBwcJCQAEBAYGBwcJCQAGBgcHBwcJCQAAAAcGBwcJCQAAAAgICAgKCgAAAAgICAgKCgAAAAkJCQkKCgAAAAAACQkKCgAAAAAAAAACAwMGBgAAAAAABAQGBgAAAAAABAQGBgAAAAAABQUGBgAAAAAAAAAGBgAAAAAAAAAHBwAAAAAAAAAIBwAAAAAAAAAJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAgQDBQUAAAAAAAAAAAAAAAAAAAAAAAAAAAQFBQYGAAAAAAAAAAAAAAAAAAAAAAAAAAADBQUGBgAAAAAAAAAAAAAAAAAAAAAAAAAABgYGCAgAAAAAAAAAAAAAAAAAAAAAAAAAAAUGBggIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBAQAAAAFBQAAAAUFAAAACAcAAAAAAAAABAYGAAAACAgAAAAIBwAAAAoKAAAAAAAAAAQGBgAAAAgIAAAABwgAAAAKCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCAcAAAAICAAAAAgIAAAACgoAAAAAAAAABQcIAAAACAgAAAAICAAAAAoKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUICAAAAAgIAAAACAgAAAAKCgAAAAAAAAAFCAgAAAAICAAAAAgIAAAACgoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAoKAAAACgoAAAAJCgAAAAsKAAAAAAAAAAgKCgAAAAoKAAAACgoAAAAKCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIEBAAAAAAAAAQHBwAAAAAAAAQGBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUHBwAAAAAAAAcJCQAAAAAAAAcICQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQHBwAAAAAAAAcJCAAAAAAAAAcJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQHBwAAAAAAAAcJCQAAAAAAAAcJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcJCQAAAAAAAAkKCwAAAAAAAAkKCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcJCQAAAAAAAAgKCQAAAAAAAAkKCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQHBwAAAAAAAAcJCQAAAAAAAAcJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcJCQAAAAAAAAkLCgAAAAAAAAgJCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcJCQAAAAAAAAkKCgAAAAAAAAkLCg==", 6913, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+94792);
/* memory initializer (tweaked) */ allocateBase64Encoded("AgUFBgYHBwcHCAgICAgICAgJCQkJCwYGBwcICAgICQkJCQkJCQkKCgoKCwYGBwcICAgICQkJCQkJCgkKCgoKCwcHBwcICAkJCQkJCQkKCgoKCgoKDAsLBwcICAkJCQkJCQoKCgoKCgoKDAsMCAgICAkJCQkJCgoKCgoKCgoKCwsLCAgICAkJCQkKCgoKCgoKCgoKCwsMCQkJCQkJCgkKCgoKCgoKCgoKCwsLCwsJCQkJCgoKCgoKCgoKCgoKCwwLCwsJCQkKCgoKCgoKCgoKCgoKCwsLCwsJCQkJCgoKCgoKCgoKCgoKCwsLDAwKCgoKCgoKCgoKCgoKCgoKCwwLDAsLCwkKCgoKCgoKCgoKCgoKCwwLCwsLCwoKCgoKCgoKCgoKCgoKCwsLDAsLCwoKCgoKCgoKCgoKCgoKDAsLDAsLCwoKCgoKCgoKCgoKCgoKCwsLCwsLCwsLCgoKCgoKCgoKCgoKCwsLCwwMCwsLCwsLCwoKCgoKCgoKDAwMCwsLDAsLCwoKCgoKCgoKCgoKDAsMDAwMDAsMCwsKCgoKCgoKCgoKDAwMDAsLCwsLCwsKCgoKCgoKCgoKAAAAAAAAAAEEBAUFBwcJCAoJCgoKCgYFBQcHCQgKCQsKDAwNDQYFBQcHCQkKCgsLDAwMDRMICAgICQkKCgwLDAwNDRMICAgICQkLCwwMDQ0NDRMMDAkJCwsLCwwLDQwNDRIMDAkJCwoLCwwMDA0NDhMSEgsLCwsMDA0MDQ0ODhASEgsLCwoMCw0NDQ0NDhESEg4PCwwMDQ0NDQ4ODhISEg8PDAoNCg0NDQ0NDhIREhESDA0MDQ0NDg4QDhIREhIRDQwNCgwMDg4ODhESEhISDg8MDA0MDg4PDxISEhESDw4MCwwMDg4ODwAAAAAAAAABAwMMDAwMDAwMDAwMBAcHDAwMDAwMDAwMDAMICAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMAAAAAAAAAAIEBAUFBgUFBQUGBQQFBQYFBQUFBgYGBQUAAAAAAAAAAQQEBgYHBwgICQkKCgYFBQcHCAgICAkKCwsHBQUHBwgICQkKCgsLAAgICAgJCQkJCgoLCwAICAgICQkJCQoKCwsADAwJCQkJCgoKCgsLAA0NCQkKCQoKCwsLDAAAAAoKCgoKCgsLDAwAAAAKCgoKCgoLCwwMAAAADg4LCwsLDAwMDAAAAA4OCwsLCwwMDA0AAAAAAAwMDAwMDA0NAAAAAAANDAwMDAwNDQAAAAAAAAACBAQGBgcHBwcICAoFBQYGBwcICAgICgUFBgYHBwgICAgKBgYHBwgICAgICAoKCgcHCAgICAgICgoKCAcICAgICAgKCgoHBwgICAgICAoKCggICAgICAgICgoKCgoICAgICAgKCgoKCgkJCAgJCAoKCgoKCAgICAkJAAAAAAAAAAEEBAcGBgcGBgQHBwoJCQsJCQQHBwoJCQsJCQcKCgsLCgsLCwYJCQsKCgsKCgYJCQsKCgsKCgcLCwwLCwwLCwYJCQsKCgsKCgYJCQsKCgsKCgAAAAAAAAACBAQGBggICQkICAkJCgoLCwAEBAYGCAgJCQkJCgoLCwsLAAQEBwYICAkJCQkKCgsLCwsABgYHBwgICQkJCQoKCwsLDAAAAAcHCAgJCQkJCgoLCwwMAAAACAgICAkJCQkKCgsLDAwAAAAICAgICQkJCQoKCwsMDAAAAAkJCQkKCgoKCwsLCwwMAAAAAAAJCQoKCgoLCwsLDAwAAAAAAAkJCQoKCgsLCwsMDAAAAAAACQkJCQoKCwsLDAwMAAAAAAAKCgoKCwsLCwwMDQwAAAAAAAAACgoLCwsLDAwMDAAAAAAAAAALCwsLDAwMDA0NAAAAAAAAAAsLCwsMDAwMDQ0AAAAAAAAADAwMDAwMDQ0NDQAAAAAAAAAAAAwMDAwMDQ0NAAAAAAAAAAIDAwYGBwcJCQAEBAYGBwcJCQAEBQYGBwcJCQAGBgcHCAgKCgAAAAcHCAgKCQAAAAkICAgKCgAAAAgICAgKCgAAAAoKCQkLCwAAAAAACQkKCgAAAAAAAAACAwMGBgAAAAAABAQGBgAAAAAABAQGBgAAAAAABQUGBgAAAAAAAAAGBgAAAAAAAAAHCAAAAAAAAAAHBwAAAAAAAAAJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAgMDBgYAAAAAAAAAAAAAAAAAAAAAAAAAAAQFBAYGAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAUGBgAAAAAAAAAAAAAAAAAAAAAAAAAABgYGCQkAAAAAAAAAAAAAAAAAAAAAAAAAAAYGBwkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBQUAAAAFBQAAAAUFAAAABwcAAAAAAAAABQYGAAAABwcAAAAHBwAAAAoKAAAAAAAAAAUGBgAAAAcHAAAABwcAAAAKCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCAcAAAAHBwAAAAcHAAAACQkAAAAAAAAABQcIAAAABwcAAAAHBwAAAAkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUHBwAAAAcHAAAABwcAAAAJCQAAAAAAAAAFBwcAAAAHBwAAAAcHAAAACQkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwoKAAAACQkAAAAJCQAAAAoKAAAAAAAAAAgKCgAAAAkJAAAACQkAAAAKCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIEBAAAAAAAAAUGBgAAAAAAAAUGBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUHBwAAAAAAAAcICAAAAAAAAAYICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUHBwAAAAAAAAYIBwAAAAAAAAcICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUHBwAAAAAAAAcICAAAAAAAAAcICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcICAAAAAAAAAgJCQAAAAAAAAgJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYICAAAAAAAAAgJCAAAAAAAAAgJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQHBwAAAAAAAAcICAAAAAAAAAcICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYICAAAAAAAAAgJCQAAAAAAAAgICQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcICAAAAAAAAAgJCQAAAAAAAAgJCQ==", 4657, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+106632);
/* memory initializer (tweaked) */ allocateBase64Encoded("AgUFBgYHBwcHBwcICAgICAgKBgYHBwgHCAgICAgJCQkJCQoGBgcHBwcICAgICQkJCQkJCgcHBwcICAgICQkJCQkJCQkKCgoHBwgICAkJCQkJCQkJCQsLCwgICAgJCQkJCQkJCQkJCgoKCAgICAkJCQkJCQkJCQkKCgoICQkJCQkJCQkJCQkKCQoKCgsLCQkJCQkJCQkJCQkJCwoLCwsJCQkJCQkKCgkJCgkLCgsLCwkJCQkJCQkJCgoKCQsLCwsLCQkJCQoKCQkJCQoJCwsLCwsLCwkJCQkJCQoKCgoLCwsLCwsLCgkKCgkKCQkKCQsKCgsLCwsJCgkJCQkKCgoKCwsLCwsLCgoKCQkKCQoJCgoKCgsLCwsLCwsJCQkJCQoKCgAAAAAAAAABBAQGBgcHCAcJCQoKCgoGBQUHBwgICggLCgwMDQ0GBQUHBwgICgkLCwwMDQwSCAgICAkJCgkLCgwMDQ0SCAgICAkJCgoLCw0MDg0SCwsJCQoKCwsLDA0MDQ4SCwsJCAsKCwsLCwwMDg0SEhIKCwoLDAwMDA0MDg0SEhIKCwsJDAsMDAwNDQ0SEhEODgsLDAwNDA4MDg0SEhIODgsKDAkMDQ0NDQ0SEhEQEg0NDAwNCw4MDg4REhIREg0MDQoMCw4ODg4REhISEg8QDAwNCg4MDg8SEhIQERAODAsNCg0NDg8AAAAAAAAAAQQEDAwMDAwMDAwMDAQJCAwMDAwMDAwMDAwCCQcMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCwwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwAAAAAAAAACBAQFBQYFBQUFBgQFBQUGBQUFBQYGBgUFAAAAAAAAAAEEBAYGBwcICAkJCgoGBQUHBwgICAgJCQoKBwUFBwcICAgICQkLCgAICAgICQkJCQoKCwsACAgICAkJCQkKCgsLAAwMCQkKCgoKCwsLDAANDQkJCgoKCgsLDAwAAAAKCgoKCwsMDAwMAAAACgoKCgsLDAwMDAAAAA4OCwsLCwwMDQ0AAAAODgsLCwsMDA0NAAAAAAAMDAwMDQ0ODQAAAAAADQ0MDA0MDg0AAAAAAAAAAgQEBgYHBwcHCAgKBQUGBgcHCAgICAoFBQYGBwcICAgICgYGBwcICAgICAgKCgoHBwgHCAgICAoKCggICAgICAgICgoKBwgICAgICAgKCgoICAgICAgICAoKCgoKCAgICAgICgoKCgoJCQgICQgKCgoKCggICAgICAAAAAAAAAABBAQHBgYHBgYEBwcKCQkLCQkEBwcKCQkLCQkHCgoLCwoMCwsGCQkLCgoLCgoGCQkLCgoLCgoHCwsLCwsMCwsGCQkLCgoLCgoGCQkLCgoLCgoAAAAAAAAAAgMDBgYHBwgICAgJCQoKCwoABQUHBwgICQkJCQoKCgoLCwAFBQcHCAgJCQkJCgoKCgsLAAYGBwcICAkJCQkKCgsLCwsAAAAHBwgICQkJCQoKCwsLDAAAAAgICAgJCQkJCgoLCwwMAAAACAgICAkJCQkKCgsLDAwAAAAJCQkJCgoKCgsKCwsMDAAAAAAACQkKCgoKCwsLCwwMAAAAAAAJCAkJCgoLCwwMDAwAAAAAAAgICQkKCgsLDAsMDAAAAAAACQoKCgsLCwsMDA0NAAAAAAAAAAoKCgoLCwwMDQ0AAAAAAAAACwsLCwwMDAwNDQAAAAAAAAALCwsLDAwMDA0NAAAAAAAAAAsLDAwMDA0NDQ0AAAAAAAAAAAAMDAwMDQ0NDQAAAAAAAAABAwQGBgcHCQkABQUHBwcICQkABQUHBwgICQkABwcICAgICgoAAAAICAgICgoAAAAJCQkJCgoAAAAJCQkJCgoAAAAKCgoKCwsAAAAAAAoKCwsAAAAAAAAAAgMDBgYAAAAAAAQEBgYAAAAAAAQEBgYAAAAAAAUFBgYAAAAAAAAABgYAAAAAAAAABwgAAAAAAAAABwcAAAAAAAAACQkAAAAAAAAAAAAAAAAAAAAAAAAAAAIEAwYGAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAQGBgAAAAAAAAAAAAAAAAAAAAAAAAAABAQEBgYAAAAAAAAAAAAAAAAAAAAAAAAAAAYGBgkJAAAAAAAAAAAAAAAAAAAAAAAAAAAGBgcJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgUFAAAABQUAAAAFBQAAAAcIAAAAAAAAAAUGBgAAAAcHAAAABwcAAAAKCgAAAAAAAAAFBgYAAAAHBwAAAAcHAAAACgoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQcHAAAABwcAAAAHBwAAAAkJAAAAAAAAAAUHBwAAAAcHAAAABwcAAAAJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFBwcAAAAHBwAAAAcHAAAACQkAAAAAAAAABQcHAAAABwcAAAAHBwAAAAkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgKCgAAAAkJAAAACQkAAAAKCgAAAAAAAAAICgoAAAAJCQAAAAkJAAAACgoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBAQAAAAAAAAFBgYAAAAAAAAFBgYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFBwcAAAAAAAAHCAgAAAAAAAAGBwgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFBwcAAAAAAAAGCAcAAAAAAAAHCAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFBwcAAAAAAAAHCAgAAAAAAAAHCAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHCAgAAAAAAAAICAkAAAAAAAAICQkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGCAgAAAAAAAAHCQgAAAAAAAAICQkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFBwcAAAAAAAAHCAgAAAAAAAAHCAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGCAgAAAAAAAAICQkAAAAAAAAHCAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGCAgAAAAAAAAICQkAAAAAAAAICQg=", 4505, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+116216);
/* memory initializer (tweaked) */ allocateBase64Encoded("AgQEBgYHBwcHBwcICAgICAgKBwcHBwcHCAgICAkJCQkJCQoHBwcHCAgICAgICQkJCQkJCggICAgICAgICQkJCQkJCQkKCgoIBwgICAgJCQkJCQkJCQoLCwgICAgJCQkJCQkKCQkJCgsKCAgICAkJCQkJCQkKCgoKCwoICAkJCQkJCQoJCQoJCgsKCwsLCAgJCQkJCQkJCQoKCwsLCwsJCQkJCQkKCQkJCgoLCwsLCwkJCQkJCQkJCQoJCgsLCwsLCQkJCQoKCQkJCgoKCwsLCwsLCwkJCQoJCQoKCgoLCwoLCwsLCgkKCgkJCQkKCgsKCwsLCwsJCQkJCgkKCgoKCwoLCwsLCwoKCQkKCQoKCgoKCgoLCwsLCwsJCQoJCgkKCgAAAAAAAAABBAQGBgcGCAgKCQoKBgUFBwcIBwoJCwsMDQYFBQcHCAgKCgsLDQ0SCAgICAkJCgoMDAwNEggICAgJCQoKDAwNDRILCwgICgoLCwwLDQwSCwsJBwoKCwsLDAwNERERCgoLCwwMDAoMDBEREQsKCwoNDAsMDAwREREPDgsLDAsNCg0MERERDg4MCgsLDQ0NDREREBEQDQ0MCg0KDg0REBEQEQ0MDAoNCw4OAAAAAAAAAAEFBAwMDAwMDAwMDAwECQgLCwsLCwsLCwsLAggHCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwoLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsAAAAAAAAAAgQEBQQGBQUFBQYFBQUFBgUFBQUGBgYFBQAAAAAAAAABBAQGBgcHBwcICAkJBgUFBwcICAgICQkKCgcGBQcHCAgICAkJCgoACAgICAkJCQkKCgsLAAgICAgJCQkJCgoLCwAMDAkJCgoKCgsLCwsADQ0JCQoKCgoLCwwMAAAACgoKCgsLDAwMDQAAAAoKCgoLCwwMDAwAAAAODgoLCwsMDA0NAAAADg4LCgsLDQwNDQAAAAAADAwLDA0MDg4AAAAAAAwMDAwNDA4OAAAAAAAAAAIDBAYGBwcHBwcHCQcHBgYHBwgICAgJBgYGBgcHCAgICAoHBwcHBwcICAgICgoKBwcHBwgICAgKCgoHBwgICAgICAoKCgcICAgICAgICgoKCAgICAgICAgKCgoKCggICAgICAoKCgoKCQkICAgICgoKCgoICAgICAgAAAAAAAAAAQQEBwYGBwYGBAcHCgkJCwkJBAcHCgkJCgkJBwoKCwoLCwoLBgkJCwoKCwoKBgkJCwoLCwoKBwsKCwsLDAsLBgkJCwoKCwsKBgkJCwoKDAoLAAAAAAAAAAEEAwYGCAgJCQkJCQkKCgsLAAcHBwcICAkJCQkKCgsLDAsABwcHBwgICQkJCQoKCwsLDAAICAcHCQkKCgkJCgoLCwwMAAAABwcJCQoKCgkKCgsLDAwAAAAICAkJCgoKCgsLCwsMDAAAAAgICQkKCgoKCwsMDAwMAAAACQkJCQoKCgoLCwwMDAwAAAAAAAkJCgoKCgsLDAwNDQAAAAAACQkKCgsLCwsMDA0NAAAAAAAJCQoKCwsLCwwMDQ0AAAAAAAoKCgoLCwwMDQwNDQAAAAAAAAAKCgsLDAwNDQ0NAAAAAAAAAAsLDAwMDA0NDQ4AAAAAAAAACwsMDAwMDQ0NDgAAAAAAAAAMDAwMDQ0NDQ4OAAAAAAAAAAAADAwNDQ0NDg4AAAAAAAAAAQMDBgYHBwkJAAcHBwcHBwkJAAcHBwcHBwkJAAgIBwcICAoKAAAABwcICAoKAAAACQkICAoKAAAACQkICAoKAAAACgoJCQsLAAAAAAAJCQsLAAAAAAAAAAEDAwYGAAAAAAAGBgYGAAAAAAAGBgYGAAAAAAAHBwYGAAAAAAAAAAYHAAAAAAAAAAcIAAAAAAAAAAgIAAAAAAAAAAkJAAAAAAAAAAAAAAAAAAAAAAAAAAACBAMGBgAAAAAAAAAAAAAAAAAAAAAAAAAABAQEBgYAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAYGAAAAAAAAAAAAAAAAAAAAAAAAAAAGBgYJCQAAAAAAAAAAAAAAAAAAAAAAAAAABgYHCQkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEEBAAAAAcHAAAABwcAAAAICAAAAAAAAAAEBgYAAAAICAAAAAgIAAAACQkAAAAAAAAABAYGAAAACAgAAAAICAAAAAkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcICAAAAAsLAAAACwsAAAAMCwAAAAAAAAAHCAgAAAAKCwAAAAsLAAAACwwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABggIAAAACwsAAAALCwAAAAwMAAAAAAAAAAYICAAAAAoLAAAACgsAAAALCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICQkAAAALDAAAAAsMAAAADAsAAAAAAAAACAoJAAAADAsAAAAMCwAAAAsMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgQEAAAAAAAABQYGAAAAAAAABQYHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQcHAAAAAAAABwgIAAAAAAAABggIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQcHAAAAAAAABggHAAAAAAAABwgIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQcHAAAAAAAABwgIAAAAAAAABwgIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwgIAAAAAAAACAkJAAAAAAAACAkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABggIAAAAAAAACAkIAAAAAAAACAkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAcHAAAAAAAABwgIAAAAAAAABwgIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABggIAAAAAAAACAkJAAAAAAAACAgJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwgIAAAAAAAACAkJAAAAAAAACAkJ", 4449, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+125648);
/* memory initializer (tweaked) */ allocateBase64Encoded("AgUFBgYHBgcHCAgICAgICAgKBgYHBwcHCAgJCQkJCQkJCQoGBgcHCAgICAkJCQkJCQkJCgcHBwcICAgJCQkJCQkJCQkKCgoHBwgICQkJCQkJCQkJCQoLCwgICAgJCQkJCQkKCgkKCgoKCAgICAkJCQkJCQkJCgoLCgoICAkJCQkJCQkJCQkKCQoKCgsLCAgJCQkJCQkJCQkJCwsLCwsJCQkJCQkJCQoJCgkLCwsLCwkICQkJCQkJCQoKCQsLCgsLCQkJCQkJCQkJCgoJCwsLCwsLCwkJCgkJCQkKCQoKCwoLCwsLCQoKCgkJCQkJCQoLCwsLCwsJCQkJCQkJCQoJCwsKCwsLCwoKCQkJCQkJCgkKCwoLCwsLCwsJCQoJCQkJCQAAAAAAAAABBAQGBgcHCQkKCwwMBgUFBwcIBwoKCwsMDAYFBQcHCAgKCgsLDAwQBwcICAkJCwsMDA0NEQcHCAcJCQsKDAwNDRMLCggICgoLCwwMDQ0TCwsJBwsKCwsMDA0MExMTCgoKCgsMDAwNDhITEwsJCwkNDAwMDQ0TFBMNDwsLDAwNDQ4NEhMUDw0MCg0KDQ0NDhQUFBQUDQ4MDA0MDQ0UFBQUFA0MDAwODA4NAAAAAAAAAAEDAw0NDQ0NDQ0NDQ0DBgYNDQ0NDQ0NDQ0NBAgHDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0AAAAAAAAAAgQEBAUGBQUFBQYFBQUFBgUFBQUGBgYFBQAAAAAAAAABBAQGBgcHBwcICAkJBwUFBwcICAgICQkKCgcFBgcHCAgICAkJCwoACAgICAkJCQkKCgsLAAgICAgJCQkJCgoLCwAMDAkJCgoKCgsLCwsADQ0JCQkJCgoLCwwMAAAACQoJCgsLDAsNDAAAAAoKCQkLCwwMDQwAAAANDQoKCwsMDA0NAAAADg4KCgsLDAwNDQAAAAAACwwLCwwNDg0AAAAAAAwMCwsNDA4NAAAAAAAAAAIEBAYGBwcHBwgICgUFBgYHBwgICAgKBQUGBgcHCAgICAoHBwcHCAgICAgICgoKBwcHBwgICAgKCgoHBwgICAgICAoKCgcHCAgICAgICgoKCAgICAgICQgKCgoKCggICAgICAoKCgoKCQkICAgICgoKCgoICAgICAgAAAAAAAAAAQQEBwYGBwYGBAcHCgkJCwkJBAcHCgkJCwkJBwoKCgsLCwoKBgkJCwsKCwoKBgkJCwoLCwoKBwsLCwsLCwsLBgkJCwoKCwsKBgkJCgoKCwoLAAAAAAAAAAIDAwYGBwcICAgICQkKCgsLAAUFBgYICAkJCQkKCgoKCwsABQUGBggICQkJCQoKCgoLCwAHBwcHCAgJCQkJCgoLCwwMAAAABwcICAkJCQkKCgsLDAwAAAAICAgICQkKCgoLCwsMDAAAAAgICAgJCQoKCgoLCwwMAAAACQkJCQoKCgoLCwwMDAwAAAAAAAkJCgoKCgsLDAwNDQAAAAAACQkJCQoKCwsMDA0NAAAAAAAJCQkJCgoLCwwMDQ0AAAAAAAkJCgoLCwwMDAwNDQAAAAAAAAAKCgsLDAwMDA0NAAAAAAAAAAsLCwsMDA0NDQ0AAAAAAAAACwsLCwwMDQ0NDQAAAAAAAAALCwwMDAwNDQ4OAAAAAAAAAAAADAwMDA0NDg4AAAAAAAAAAQMDBgYHBwkJAAYGBwcICAkJAAYGBwcICAkJAAcHCAgICAoKAAAACAgICAoKAAAACAgJCQsLAAAACQkJCQsLAAAACgoKCgsLAAAAAAAJCQsLAAAAAAAAAAEDAwcHAAAAAAAFBQYGAAAAAAAFBQcHAAAAAAAHBwcHAAAAAAAAAAcHAAAAAAAAAAgJAAAAAAAAAAgIAAAAAAAAAAoKAAAAAAAAAAAAAAAAAAAAAAAAAAACAwQGBgAAAAAAAAAAAAAAAAAAAAAAAAAABAQEBgYAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAYGAAAAAAAAAAAAAAAAAAAAAAAAAAAGBgYJCQAAAAAAAAAAAAAAAAAAAAAAAAAABgYHCQkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEFBQAAAAAAAAUHBwAAAAAAAAUHBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUIBwAAAAAAAAcJCQAAAAAAAAcICQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUHBwAAAAAAAAcJCAAAAAAAAAcJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUIBwAAAAAAAAgJCQAAAAAAAAgJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcJCQAAAAAAAAkJCgAAAAAAAAkKCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcJCQAAAAAAAAgKCQAAAAAAAAkKCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUHCAAAAAAAAAgJCQAAAAAAAAgJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcJCQAAAAAAAAkKCgAAAAAAAAgJCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcJCQAAAAAAAAkKCgAAAAAAAAkKCQ==", 3817, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+135024);
/* memory initializer (tweaked) */ allocateBase64Encoded("AgQEBgYGBgcHCAgICAgICAgKCgoHBwcHCAgJCQkJCQkJCQoKCgcHCAcICAkJCQkJCQkJCgoKBwcICAgJCQkJCQkKCQkKCgoHBwgICQgJCQkJCgkJCgoLCwgICAgJCQkJCQkKCQkKCgoKCAgICAkJCQkJCQkJCgoLCwsICAkJCQkJCQkJCQkKCgoKCwsLCAgJCQkJCgkJCQkJCwsLCwsJCQkJCQkJCQkJCQkLCgoLCwkJCQkJCQkJCQoKCgoLCgsLCQkJCQkJCQkJCgoJCgoLCwsLCwkJCQoJCQkJCQkKCwsLCwsLCgoKCgkJCQkJCQoLCwsLCwsJCgkJCQkKCQkJCwsLCwsLCwoKCQkJCQkJCgkLCwoLCwsLCgsJCQkJCQkJCQAAAAAAAAABBAQGBQcHCQkKCgwMBgUFBwcICAoKDAsMDAYFBQcHCAgKCgsLDAwPBwcICAkJCwsMDA0MDwgICAcJCQoKDAwNDRALCggICgoLCwwMDQ0QCwsJCAsKCwsMDA0MEBAQCgsKCwwMDAwNDRAQEAsJCwkODAwMDQ0QEBAMDgsMDAwNDQ4NEBAQDw0MCg0KDQ4NDRAQEBAQDQ4MDQ0MDQ0QEBAQEA0MDAsODA8NAAAAAAAAAAEEAwoKCgoKCgoKCgoECAYKCgoKCgoKCgoKBAgHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoAAAAAAAAAAgMDBQUGBgYFBQYGBgUFBgYGBQUGBgYFBQAAAAAAAAABBAQGBgcHBwcICAoJBwUGBwcICAgICQkKCgcFBQcHCAgICAkJCgoACAgICAkJCQkKCgsKAAgICAgJCQkJCgoLCwAMDAkJCQoKCgsLCwsADQ0JCQkJCgoLCwsLAAAACgoKCgsLDAsMDAAAAAoKCgkLCwwLDQwAAAANDQoKCwsMDA0NAAAADg4KCgsLDAwNDQAAAAAACwwLCwwMDg0AAAAAAAwLCwsNCg4NAAAAAAAAAAIDAwYGBwcHBwgICgoKBgYHBwgICAgKCgoGBgcHCAgICAoKCgcHBwcICAgICgoKBwcHBwgICAgKCgoHBwgICAgICAoKCgcHCAgICAgICgoKCAgICAgICAgKCgoKCggICAgICAoKCgoKCQkICAgICgoKCgoICAgICAgAAAAAAAAAAQQEBwYGBwYGBAcHCgkJCwkJBAcHCgkJCwkJBgoKCwsLCwoKBgkJCwoKCwoKBgkJCwoLCwoKBwsKCwsLDAsLBwkJCwoKCwsKBgkJCgoKDAoLAAAAAAAAAAEEAwYGBwcICAgICQkKCgsLAAAABwcICAkJCQkKCgoKCwsAAAAHBwgICQkJCQoKCgoLCwAAAAcHCAgJCQkJCgoLCwsLAAAABwcICAkJCQkKCgsLDAsAAAAICAkJCQoKCgoKCwsMDAAAAAgICQkKCQoKCgoLCwwMAAAACQkJCQoKCgoLCwwMDAwAAAAAAAkJCgoKCgsLDAwMDAAAAAAACQkKCgoLCwsMDA0NAAAAAAAJCQoKCgoLCwwMDQ0AAAAAAAoKCgoLCwwMDAwNDQAAAAAAAAAKCgsLDAwMDA0NAAAAAAAAAAsLDAwMDA0NDQ0AAAAAAAAACwsLCwwMDQ0NDQAAAAAAAAAMDAwMDAwNDQ4OAAAAAAAAAAAADAwMDA0NDg4AAAAAAAAAAQMDBgUGBggIAAAABwcHBwkJAAAABwcHBwkJAAAABwcICAoKAAAABwcICAoKAAAACQkICAoKAAAACAgICAoKAAAACgoJCQsLAAAAAAAJCQsLAAAAAAAAAAEDAgcHAAAAAAANDQYGAAAAAAAMAAYGAAAAAAAAAAcHAAAAAAAAAAcHAAAAAAAAAAgJAAAAAAAAAAgIAAAAAAAAAAsKAAAAAAAAAAAAAAAAAAAAAAAAAAACAwQGBQAAAAAAAAAAAAAAAAAAAAAAAAAABAQEBgYAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBQYGAAAAAAAAAAAAAAAAAAAAAAAAAAAGBgYICAAAAAAAAAAAAAAAAAAAAAAAAAAABgYGCAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIEBAAAAAAAAAUHBgAAAAAAAAUGBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUHBwAAAAAAAAcICAAAAAAAAAcICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUHBwAAAAAAAAcICAAAAAAAAAcICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQHBwAAAAAAAAcICAAAAAAAAAcICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcICAAAAAAAAAgJCgAAAAAAAAgJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYICAAAAAAAAAgJCAAAAAAAAAgJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQHBwAAAAAAAAcICAAAAAAAAAcICQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYICAAAAAAAAAgKCQAAAAAAAAgICQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcICAAAAAAAAAgJCQAAAAAAAAgJCQ==", 3817, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+143768);
/* memory initializer (tweaked) */ allocateBase64Encoded("AgUFBgYHBwcHCAgICAgICAgKBgYHBwcHCAgJCQkJCQkJCQoGBgcHCAcICAkJCQkJCQkJCgcHBwcICAgJCQkJCQkJCQkKCgoHBwgICQgJCQkJCgkJCgoKCwgICAgJCQkJCQkJCgkKCgoKCAgICAkJCQkJCQkJCgoLCgoICAkJCQkJCQkJCQkKCgoKCgsLCAgJCQkJCQkJCQkKCwsLCwsJCQkJCQkJCQoJCgkLCwoLCwkJCQkJCQkJCQkKCQsLCgsLCQkJCQkJCQkJCQoJCwoLCwsLCwkJCgkJCQkJCQkKCwoLCwsLCgoKCgkJCQkJCQoLCwsLCwsJCgkJCQkJCQkJCwsKCwsLCgoKCQkJCQkJCQkKCwoLCwsLCwsJCQkJCQkJCQAAAAAAAAABBAQGBgcHCQkKCwwMBgUFBwcICAoKDAsMDAYFBQcHCAgKCgwLDAwRBwcICAkJCgoMDA0NEgcHCAcJCQoKDAwMDRMKCggICgoLCwwMDQ4TCwoIBwoKCwsMDA0MExMTCgoKCgsLDAwNDRMTEwsJCwkODA0MDQ0TFBINDgsLDAwNDQ4NFBQUDw0LCg0LDQ0ODRQUFBQUDQ4MDA0NDQ0UFBQUFA0NDAwQDQ8NAAAAAAAAAAEDAwsLCwsLCwMHBgsLCwsLCwQIBwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAAAAAAAAAACBAQEBAYFBQUFBgUFBQUGBgYFBQYGBgUFAAAAAAAAAAEEBAYGBwcHBwgICQkHBQUHBwgICAgJCQoKBwYFBwcICAgICQkKCgAICAgICQkJCQoKCwsACAgICAkJCQkKCgsLAAwMCQkKCgoKCwsLCwANDQkJCQkKCgsLCwwAAAAJCgoKCwsMCwwMAAAACgoJCQsLDAwMDAAAAA0NCgoLCwwMDQ0AAAAODgoKCwsMDA0NAAAAAAALDAsLDQwNDQAAAAAADAwLCw0MDg4AAAAAAAAAAgQEBgYHBwcHBwgJBQUGBgcHCAgICAkFBQYGBwcICAgICgcHBwcHBwgICAgKCgoHBwcHCAgICAoKCggICAgICAgICgoKCAgICAgICAgKCgoICAgICAgICAoKCgoKCAgICAgICgoKCgoJCQgICAgKCgoKCggICAgICAAAAAAAAAABBAQHBgYHBgYEBwcKCQkLCQkEBwcKCQkLCQkHCgoKCwsLCgoGCQkLCwoLCgoGCQkLCgsLCgoHCwoLCwsLCwsGCQkLCgoLCwoGCQkLCgoLCgsAAAAAAAAAAQQEBgYICAgICAgJCQoKCwsABgYHBwgICQkJCQoKCgsLCwAFBgcHCAgJCQkJCgoKCwsLAAcHCAgICAkJCQkKCgsLDAwAAAAICAgICQkJCQoKCwsMDAAAAAgICQkKCgoKCwsLCwwMAAAACAgJCQoKCgoLCwsLDAwAAAAJCQkJCgoKCgsLDAwMDQAAAAAACQkKCgoKCwsMDA0NAAAAAAAJCQoKCwsLCwwMDQ0AAAAAAAkJCgoLCgsLDAwNDQAAAAAACgoKCgsLDAwMDQ0NAAAAAAAAAAoKCwsMDAwNDQ0AAAAAAAAACwsMDAwMDQ0ODgAAAAAAAAALCwwLDAwNDQ0NAAAAAAAAAAwMDAwNDQ0NDg4AAAAAAAAAAAAMDAwMDQ0ODgAAAAAAAAABBAMGBgcHCQkABQUHBwgHCQkABQUHBwgICQkABwcICAgICgoAAAAICAgICgoAAAAJCQkJCwsAAAAJCQkJCwsAAAAKCgoKCwsAAAAAAAkJCwsAAAAAAAAAAQMDBwcAAAAAAAUEBwcAAAAAAAUFBwcAAAAAAAYHCAgAAAAAAAAACAgAAAAAAAAACQoAAAAAAAAACQkAAAAAAAAACwsAAAAAAAAAAAAAAAAAAAAAAAAAAAEEBAYGAAAAAAAAAAAAAAAAAAAAAAAAAAAEBQUHBwAAAAAAAAAAAAAAAAAAAAAAAAAABAUFBwcAAAAAAAAAAAAAAAAAAAAAAAAAAAYHBwkJAAAAAAAAAAAAAAAAAAAAAAAAAAAHBwcJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQUFAAAAAAAABQcHAAAAAAAABQcHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQgHAAAAAAAABwkJAAAAAAAABwgJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQcHAAAAAAAABwkIAAAAAAAABwkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQgHAAAAAAAACAkJAAAAAAAACAkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwkJAAAAAAAACQoKAAAAAAAACQoKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwkJAAAAAAAACAoJAAAAAAAACQoKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQcIAAAAAAAABwkJAAAAAAAACAkJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwkJAAAAAAAACQoKAAAAAAAACQkKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwkJAAAAAAAACQoKAAAAAAAACQoK", 3729, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+152512);
/* memory initializer (tweaked) */ allocateBase64Encoded("AgQEBgYHBwcHCAgICAgICAgKCgoHBwcICAgJCQkJCQkJCQoKCgcHBwcICAkJCQkJCQkJCgoKBwcICAgICQkJCQkKCQkKCgoHBwgICQgJCQkJCgkJCgoKCggICAgJCAkJCQkJCgkKCgoKBwcICAkJCQkJCQoJCgoKCgoICAgJCQkJCQkJCgoKCQsKCgoKCAgJCQkJCQoJCQkKCgoKCwsJCQkJCQkJCQoJCQoLCgoLCwkJCQkJCQkJCQkKCQsLCgsLCQkJCQkJCQkJCQoJCwoKCwsLCwkJCQkJCQkJCQkKCgoLCwsLCQoJCgkJCQkKCQoLCgsKCgoKCgkJCQoJCQkKCwsKCwsKCwoKCgkJCQkKCQkKCwoLCwsLCgsKCgkKCQkJCgAAAAAAAAABBAQGBgcHCQkLDA0MBgUFBwcICAoJDAwMDAYFBQcHCAgKCQwLCw0QBwcICAkJCgoMDA0MEAcHCAcJCQoKCwwMDRAKCggICgoLDAwMDQ0QCwoIBwsKCwsMCw0NEBAQCgoKCgsLDQwNDRAQEAsJCwkPDQwNDQ0QEBAPDQsLDA0MDA4NEBAQDg0LCw0MDg0NDRAQEBAQDQ0NDA4NDg4QEBAQEA0NDAwODg8NAAAAAAAAAAEFBQoKBgkICgoGCgkKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCAoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsKCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsAAAAAAAAAAgMDBQUGBgYFBQYGBgUFBgYGBQUGBgYFBQAAAAAAAAABBAQGBgcHBwcICAkJBwUFBwcICAgICQkKCgcFBgcHCAgICAkJCgoACAgICAkJCQkKCgsLAAgICAgJCQkJCgoLCwAMDAkJCgoKCgsLCwsADQ0JCQkJCgoLCwsMAAAACgoKCgsLCwsMDAAAAAoKCQkLCwsMDAwAAAANDQoKCwsMDA0NAAAADg4KCgsLDAwNDQAAAAAACwsLCw0MDQ0AAAAAAAwMCwsMDA0NAAAAAAAAAAIDAwYGBwcHBwcICgoKBgYHBwgICAgKCgoGBgcHCAgICAoKCgcHBwcICAgICgoKBwcHBwgICAgKCgoIBwgICAgICAoKCgcHCAgICAgICgoKCAgICAgICAgKCgoKCggICAgICAoKCgoKCQkICAgICgoKCgoICAgICAgAAAAAAAAAAQQEBwYGBwYGBAcHCgkJCgkJBAYHCgkJCwkJBwoKCwsLDAoLBgkJCwoLCwoKBgkJCwoLCwoKBwsKDAsLCwsLBwkJCgoKCwsKBgkJCwoKCwoKAAAAAAAAAAEEAwYGCAcICAgICQkKCgsLAAAABwcICAkJCQkJCgoKCwsAAAAHBwgICQkJCQoKCgoLCwAAAAcHCAgJCQkJCgoLCwsLAAAABwcICAkJCQkKCgsLCwsAAAAICAkJCQkKCgoKCwsMDAAAAAgICQkJCQoKCgoLCwwMAAAACQkJCQoKCgoLCwsMDAwAAAAAAAkJCgoKCgsLCwsMDAAAAAAACQkKCgoKCwsMDA0NAAAAAAAJCQoKCgoLCwwMDQ0AAAAAAAoKCwsLCwsMDAwNDQAAAAAAAAALCgsLCwsMDA0NAAAAAAAAAAsLDAsMDAwMDQ0AAAAAAAAACwsLDAwMDA0NDQAAAAAAAAAMDAwMDA0NDQ4OAAAAAAAAAAAADAwMDA0NDg4AAAAAAAAAAQMDBgYGBggIAAAABwcHBwkJAAAABwcHBwkJAAAABwcHCAkJAAAABwcHBwkJAAAACQkICAoKAAAACAkICAoKAAAACgoJCQoKAAAAAAAJCQoKAAAAAAAAAAEDAggHAAAAAAAAAAYGAAAAAAAAAAYGAAAAAAAAAAcHAAAAAAAAAAcHAAAAAAAAAAgIAAAAAAAAAAgIAAAAAAAAAAkJAAAAAAAAAAAAAAAAAAAAAAAAAAABBAQGBgAAAAAAAAAAAAAAAAAAAAAAAAAABAUFBwYAAAAAAAAAAAAAAAAAAAAAAAAAAAQFBgcHAAAAAAAAAAAAAAAAAAAAAAAAAAAGBwcJCQAAAAAAAAAAAAAAAAAAAAAAAAAABgcHCQkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEFBQAAAAAAAAUHBwAAAAAAAAUHBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUIBwAAAAAAAAcJCQAAAAAAAAcJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUHBwAAAAAAAAcJCQAAAAAAAAcJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUHBwAAAAAAAAgKCQAAAAAAAAcJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcJCQAAAAAAAAkKCwAAAAAAAAkLCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcJCQAAAAAAAAkLCQAAAAAAAAkKCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUHBwAAAAAAAAcJCQAAAAAAAAgJCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcJCQAAAAAAAAkLCgAAAAAAAAkJCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcJCgAAAAAAAAkKCwAAAAAAAAkLCg==", 4273, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+161168);
/* memory initializer (tweaked) */ allocateBase64Encoded("/f////j////z////8f////b////2////9/////f////3////9/////f///8BAAAAAQAAAAEAAAABAAAAAQAAAAEAAAD8////9v////L////w////8v////P////0////9P////X////1////9v///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPr////0////8v////D////x////8f////L////z////8/////T////0/////v////7/////////AAAAAAAAAAAAAAAA9P////P////y////8P////D////w////8f////L////z////9P////T////7/////v////////8AAAAAAAAAAAAAAADx////8f////H////w////8P////D////w////8v////P////z////8/////b////8/////v///wAAAAAAAAAAAAAAAPD////w////8P////D////w////8P////D////x////8v////L////z////9f////b//////////////wAAAAAAAAAA8P////D////w////8P////D////w////8P////H////y////8v////P////1////9v//////////////AAAAAAAAAADw////8P////D////w////8P////D////w////8f////L////y////8v////T////4/////P////7////+////AAAAAPD////w////8P////D////w////8P////D////x////8v////L////y////9P////f////8/////v////7///8AAAAA8P////D////w////8P////D////w////8P////H////y////8v////L////0////9/////z////+/////v///wAAAADw////8P////D////w////8P////D////w////8f////L////y////8v////T////3/////P////7////+////AAAAAPD////w////8P////D////w////8P////D////x////8v////L////y////9P////f////8/////v////7///8AAAAA/f////j////z////8f////b////2////9v////b////2////9v////b///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD8////9v////L////w////8f////L////z////9P////T////0////9f//////////////////////////////AAAAAPr////0////8v////D////x////8f////L////z////8/////T////0/////v////7///////////////////8AAAAA9P////P////y////8P////D////w////8f////L////z////9P////T////6/////f///////////////////wAAAADx////8f////H////w////8P////D////w////8v////P////z////8/////b////8/////v//////////////AAAAAPD////w////8P////D////w////8P////D////x////8v////L////z////9f////b//////////////wAAAAAAAAAA8P////D////w////8P////D////w////8P////H////y////8v////P////1////9v//////////////AAAAAAAAAADw////8P////D////w////8P////D////w////8f////L////y////8v////T////4/////P////7////+////AAAAAPD////w////8P////D////w////8P////D////x////8v////L////y////9P////f////8/////v////7///8AAAAA8P////D////w////8P////D////w////8P////H////y////8v////L////0////9/////z////+/////v///wAAAADw////8P////D////w////8P////D////w////8f////L////y////8v////T////3/////P////7////+////AAAAAPD////w////8P////D////w////8P////D////x////8v////L////y////9P////f////8/////v////7///8AAAAAbGV4eV93cml0ZV90ZXN0KCk7IHdyaXRpbmcgdGVzdCBzb3VuZCBhdCAlaSBzYW1wbGVzL3NlYyB3aXRoICVpIGNoYW5uZWxzCgAAAAAAAABsZXh5X2VuY29kZXJfZmluaXNoKCk7IGZpbmFsIGVuY29kZWQgc3RyZWFtIGxlbmd0aDogJWkgYnl0ZXMKAAAAWGlwaC5PcmcgbGliVm9yYmlzIEkgMjAxNDAxMjIgKFR1cnBha8OkcsOkamlpbikAc3RkOjpiYWRfYWxsb2MAAGxleHktY29kZXIAAAAAAABFTkNPREVSAHZvcmJpcwAAbGV4eV9lbmNvZGVyX3N0YXJ0KCk7IGluaXRpYWxpemluZyB2b3JiaXMgZW5jb2RlciB3aXRoIHNhbXBsZV9yYXRlID0gJWkgSHogYW5kIHZiciBxdWFsaXR5ID0gJTMuMmYKAAAAAACQ2wAAcNsAAFDbAAAAAAAAAAAAAP//////////CgAAAP//////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////8=", 2276, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+170368);
/* memory initializer (tweaked) */ allocateBase64Encoded("AQAAAAEAAAACAAAAAgAAAAQAAAAIAAAAEAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADnAwAAAAAAAOcDAAAEAAAACAAAABAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//////////wkAAAD//////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////", 792, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+174692);
/* memory initializer (tweaked) */ allocateBase64Encoded("AQAAAAIAAAACAAAABAAAAAgAAAAQAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA5wMAAAQAAAAIAAAAEAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//////////woAAAD//////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////", 792, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+177532);
/* memory initializer (tweaked) */ allocateBase64Encoded("AQAAAAIAAAAEAAAACAAAABAAAAAgAAAARwAAAJ0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAACAAAAAwAAAAQAAAAIAAAAEAAAAEcAAACdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHCeAwAAAAAAAAAAAAAAAABIngMAAAAAAAAAAAAAAAAAIJ4DAAAAAAAAAAAAAAAAAPidAwAAAAAAAAAAAAAAAADQnQMAAAAAAKidAwCAnQMAAAAAAAAAAABYnQMAMJ0DAAAAAAAAAAAACJ0DAOCcAwC4nAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALCzAwAAAAAAAAAAAAAAAACIswMAAAAAAAAAAAAAAAAAYLMDAAAAAAAAAAAAAAAAADizAwAAAAAAAAAAAAAAAAAQswMAAAAAAOiyAwDAsgMAAAAAAAAAAACYsgMAcLIDAAAAAAAAAAAASLIDACCyAwD4sQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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gGYDAFjJAgBYyQIAAgAAAAAAAAAgAAAAUKECAKhmAwCoZgMAWMkCAFjJAgACAAAAAAAAABAAAABQoQIA0GYDANBmAwAYygIAGMoCAAIAAAAAAAAAIAAAAFChAgD4ZgMA+GYDABjKAgAYygIAAgAAAAAAAAAQAAAAUKECACBnAwAgZwMA2MoCANjKAgACAAAAAAAAACAAAABQoQIASGcDAEhnAwDYygIA2MoCAAIAAAAAAAAAEAAAAGisAgDAZwMAcGcDAJjLAgBYwwIAAgAAAAAAAAAgAAAAaKwCAOhnAwCYZwMAmMsCAFjDAgACAAAAAAAAABAAAABorAIAYGgDABBoAwBYzAIAGMQCAAIAAAAAAAAAIAAAAGisAgCIaAMAOGgDAFjMAgAYxAIA7P///+z////s////7P///+z////o////4v///9j////Y////0////9P////T////IwAAABUAAAAJAAAAAAAAAAAAAAAeAAAAFAAAAAgAAAAAAADAAACgPxkAAAAMAAAAAgAAAAAAAAAAAAAAFAAAAAkAAAD9////AAAAAAAAAAAUAAAACQAAAPz///8AAAAAAAAAABQAAAAJAAAA/P///wAAAAAAAAAAFAAAAAYAAAD6////AAAAAAAAAAAUAAAAAwAAAPb///8AAAAAAAAAABIAAAABAAAA8v///wAAAAAAAAAAEgAAAAAAAADw////AAAAAAAAAAASAAAA/v////D///8AAAAAAAAAAAwAAAD+////7P///wAAAAAAAAAAWgAAAFoAAABfAAAAXwAAAF8AAABfAAAAaQAAAGkAAABpAAAAaQAAAGkAAABpAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAMAAAACAAAAAgAAAAEAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAABQAAAAQAAAADAAAAAACAPwAAAEAAAEBAAACAQAAAgEAAAIBAAACAQAAAgEAAAIBAAACgQAAAwEAAAOBAAAAAQQAAAEEAAABBAABAQQAASEEAAFBBAABYQQAAYEEAAGhBAABwQQAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCBAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAMAAAACAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAIAAAACAAAAAYAAAAGAAAABQAAAAUAAAAFAAAABQAAAAUAAAAFAAAABQAAAAQAAAADAAAAAACAPwAAAEAAAEBAAACAQAAAgEAAAKBAAADAQAAAwEAAAMBAAADAQAAAwEAAAABBAAAAQQAAAEEAAABBAABAQQAASEEAAFBBAABYQQAAYEEAAGhBAABwQQAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAMAAAACAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAIAAAACAAAAAYAAAAGAAAABQAAAAUAAAAFAAAABQAAAAUAAAAFAAAABQAAAAQAAAADAAAAAACAPwAAAEAAAEBAAACAQAAAgEAAAKBAAADAQAAAwEAAAMBAAADAQAAAwEAAAABBAAAAQQAAAEEAAABBAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAIAAAABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAgAAAAGAAAABgAAAAUAAAAFAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAAwAAAAIAAAABAAAAAABAQAAAgEAAAIBAAACgQAAAoEAAAMBAAADAQAAAwEAAAMBAAADAQAAAwEAAAABBAAAAQQAAAEEAAABBAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAgAAAAIAAAACAAAAAgAAAAIAAAABAAAAAQAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAAAwAAAAIAAAABAAAAAACAQAAAgEAAAKBAAADAQAAAwEAAAMBAAADAQAAAwEAAAABBAAAAQQAAIEEAACBBAAAgQQAAIEEAACBBAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAgAAAAIAAAACAAAAAQAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAMAAAADAAAAAgAAAAEAAAAAAAAAAADAQAAAwEAAAMBAAAAAQQAAAEEAAABBAAAAQQAAAEEAAABBAAAAQQAAIEEAACBBAAAgQQAAIEEAACBBAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAgAAAAIAAAACAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAMAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAADAQAAA4EAAAABBAAAAQQAAAEEAACBBAAAgQQAAQEEAAEBBAABAQQAAQEEAAEBBAABAQQAAQEEAAEBBAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAgAAAAIAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQQAAAEEAAABBAAAgQQAAIEEAAEBBAABAQQAAQEEAAEBBAABAQQAAQEEAAEBBAABAQQAAQEEAAEBBAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAgAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQQAAAEEAACBBAAAgQQAAQEEAAEBBAABAQQAAQEEAAEBBAABAQQAAQEEAAEBBAABAQQAAQEEAAEBBAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAIAAAACAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQQAAIEEAACBBAABAQQAAQEEAAEBBAABAQQAAQEEAAEBBAABAQQAAQEEAAEBBAABAQQAAQEEAAEBBAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAQAAAgEAAAIBAAACAQAAAgEAAAIBAAACAQAAAgEAAAIBAAACAQAAAgEAAAIBAAACAQAAAgEAAAIBAAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAQAAAgEAAAIBAAACAQAAAgEAAAIBAAACAQAAAgEAAAIBAAACAQAAAgEAAAIBAAACAQAAAgEAAAIBAAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAADGQgAAxkIAAMZCAwAAAAMAAAAPAAAAAwAAAAMAAAAPAAAACgAAAAoAAABkAAAACgAAAAoAAABkAAAA9v////b////2////9v////b////8////AAAAAAAAAAAEAAAACAAAAAgAAAAIAAAACAAAAAoAAAAMAAAADgAAABQAAADi////4v///+L////i////5v///+z////w////+P////r////6/////v///wIAAAACAAAAAwAAAAYAAAAGAAAADwAAAOL////i////4v///+L////i////6P///+z////y////9v////r////4////+P////r////6////+v////z////+////8f////H////x////8f////H////0////+v////z///8AAAAAAgAAAAQAAAAEAAAABQAAAAUAAAAFAAAACAAAAAoAAADi////4v///+L////i////5v///+r////s////8v////j////8////AAAAAAAAAAAAAAAAAAAAAAIAAAADAAAABgAAAOL////i////4v///+L////m////6v///+z////y////9v////r////6////+v////r////8/////P////z////+////8f////H////x////8f////H////0////9v////j///8AAAAAAgAAAAQAAAAEAAAABQAAAAUAAAAFAAAACAAAAAoAAADi////4v///+L////i////5v///+r////s////8v////b////8/////v////7////+/////v///wAAAAABAAAABAAAAOL////i////4v///+L////m////6v///+z////y////9v////j////4////+P////j////6////+v////r////8////8f////H////x////8f////H////0////9v////j///8AAAAAAgAAAAIAAAACAAAABAAAAAQAAAAFAAAABgAAAAoAAADi////4v///+L////i////5v///+r////s////8v////b////8/////f////3////9/////v////////8AAAAAAwAAAOL////i////4v///+L////m////6v///+z////y////9v////b////2////9v////b////4////+P////n////8////8f////H////x////8f////H////0////9v////j///8AAAAAAgAAAAIAAAACAAAABAAAAAQAAAAEAAAABQAAAAgAAADi////4v///+L////i////5v///+r////s////8v////b////8/////f////3////9/////f////7///8AAAAAAgAAAOL////i////4v///+L////m////6v///+z////y////9v////b////2////9v////b////4////+P////j////8////7P///+z////s////7P///+z////u////8v////j/////////AQAAAAEAAAABAAAAAgAAAAMAAAADAAAABAAAAAcAAADi////4v///+L////i////5v///+r////s////8v////b////8/////f////3////9/////f////7/////////AQAAAOL////i////4v///+L////m////6v///+z////y////9v////b////2////9v////b////4////+P////j////8////6P///+j////o////6P///+z////u////8v////j/////////AQAAAAEAAAABAAAAAgAAAAMAAAADAAAABAAAAAcAAADg////4P///+D////g////5P///+j////q////8P////T////6/////P////z////8/////P////3/////////AAAAAN7////e////3v///97////i////6P///+j////u////8v////T////0////9P////T////2////9v////f////7////6P///+j////o////6P///+z////u////8v////j/////////AQAAAAEAAAABAAAAAgAAAAMAAAADAAAABAAAAAcAAADg////4P///+D////g////5P///+j////o////7v////L////4////+v////r////6////+v////v////+////AAAAAN7////e////3v///97////i////5v///+b////o////6v///+3////t////7f///+3////u////7/////D////0////6P///+j////o////6P///+z////u////8v////j/////////AQAAAAEAAAABAAAAAgAAAAMAAAADAAAABAAAAAcAAADg////4P///+D////g////5P///+j////o////6P///+7////y////9P////b////2////9v////j////6/////v///97////e////3v///97////i////5v///+b////m////6P///+j////o////6P///+j////o////6P///+z////w////6P///+j////o////6P///+r////s////8f////b////4/////v///wAAAAAAAAAAAAAAAAEAAAACAAAAAwAAAAcAAADc////3P///9z////c////4v///+L////i////6P///+z////w////8P////D////w////8v////T////2////+f///9z////c////3P///9z////e////4v///+T////m////6P///+L////i////4v///+L////i////4v///+j////s////5P///+T////k////5P///+T////k////5P///+z////y////+P////z////8/////P////z////8/////v///wIAAADa////2v///9r////a////3P///97////e////4v///+j////s////7P///+z////s////7v////D////0////9v///9j////Y////2P///9j////Y////2P///9j////a////3f///93////d////3f///93////d////3f///93////i////4v///+L////i////4v///+L////i////4v///+T////s////8v////L////y////8v////L////y////9P////b////Y////2P///9j////Y////2P///9j////Y////2P///93////i////4v///+L////i////4v///+L////i////7P///9j////Y////2P///9j////Y////2P///9j////Y////2P///9j////Y////2P///9j////Y////2P///9j////Y////9v////b////2////9v////b////8////AAAAAAAAAAAEAAAACAAAAAgAAAAIAAAACAAAAAoAAAAMAAAADgAAABQAAADi////4v///+L////i////5v///+z////w////+P////r////6/////v///wIAAAACAAAAAwAAAAYAAAAGAAAADwAAAOL////i////4v///+L////i////6P///+z////y////9v////r////4////+P////r////6////+v////z////+////9v////b////2////9v////b////8////AAAAAAAAAAAEAAAACAAAAAgAAAAIAAAACAAAAAoAAAAMAAAADgAAABQAAADi////4v///+L////i////5v///+r////s////8v////b////8/////v///wIAAAADAAAABgAAAAYAAAAIAAAACgAAAOL////i////4v///+L////m////6v///+z////y////9v////z////8/////P////z////8/////v///wAAAAACAAAA9P////T////0////9P////T////4////+v////z///8AAAAABAAAAAQAAAAEAAAABAAAAAoAAAAMAAAADgAAABQAAADi////4v///+L////i////5v///+r////s////8v////b////8////AAAAAAAAAAAAAAAAAgAAAAIAAAAEAAAACAAAAOL////i////4v///+L////m////6v///+z////y////9v////r////6////+v////r////6/////P////7///8AAAAA8v////L////y////8v///w==", 10240, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+180372);
/* memory initializer (tweaked) */ allocateBase64Encoded("8v////b////4////+v////7///8CAAAAAgAAAAIAAAACAAAACAAAAAoAAAAKAAAAEAAAAOL////i////4v///+L////m////6v///+z////y////9v////r///////////////////8AAAAAAAAAAAIAAAAGAAAA4v///+L////i////4v///+b////q////7P////L////2////+P////j////4////+P////j////6/////P////7////y////8v////L////y////8v////b////4////+v////7///8CAAAAAgAAAAIAAAACAAAABgAAAAgAAAAIAAAADgAAAOL////i////4v///+L////m////6v///+z////y////9v////r///////////////////8AAAAAAAAAAAIAAAAGAAAA4v///+L////i////4v///+b////q////7P////L////2////+P////j////4////+P////j////6/////P////7////w////8P////D////w////8P////T////2////+v////7///8AAAAAAAAAAAAAAAAAAAAABAAAAAYAAAAGAAAADAAAAOL////i////4v///+L////m////6v///+z////y////9v////r/////////////////////////AAAAAAIAAAAGAAAA4v///+L////i////4v///+b////q////7P////L////2////+P////j////4////+P////j////6/////P////7////s////7P///+z////s////7P///+7////y////9v////z///8AAAAAAAAAAAAAAAAAAAAABAAAAAYAAAAGAAAADAAAAOD////g////4P///+D////k////6P///+r////w////9P////r////9/////f////3////9/////v///wAAAAAEAAAA3v///97////e////3v///+L////m////6P///+7////y////9v////b////2////9v////b////4////+/////3////s////7P///+z////s////7P///+7////y////9v////z///8AAAAAAAAAAAAAAAAAAAAABAAAAAYAAAAGAAAADAAAAN7////e////3v///97////i////4v///+j////s////8v////j////8/////P////z////8/////f////////8EAAAA3v///97////e////3v///97////i////5v///+z////w////8/////P////z////8/////P////1////+P////r////s////7P///+z////s////7P///+7////y////9v////z///8AAAAAAAAAAAAAAAAAAAAABAAAAAYAAAAGAAAADAAAAN7////e////3v///97////i////4v///+L////o////8P////b////4////+v////r////6////+/////3///8BAAAA3v///97////e////3v///+D////g////5P///+r////u////8P////D////w////8P////D////y////9P////b////q////6v///+r////q////6v///+z////y////9v////z///8AAAAAAAAAAAAAAAAAAAAAAwAAAAUAAAAFAAAACwAAAN7////e////3v///97////i////4v///+L////o////8P////T////2////+P////j////4////+f////v////+////3P///9z////c////3P///9z////e////5P///+r////s////7P///+z////s////7P///+z////s////8P////L////k////5P///+T////k////5P///+T////k////7P////L////4/////v////7////+/////v///wAAAAACAAAABgAAANz////c////3P///9z////e////4P///+D////o////8P////T////0////9P////T////0////9v////j////7////2P///9j////Y////2P///9j////Y////2P///+D////m////6P///+j////o////6P///+j////o////7P///+7////i////4v///+L////i////4v///+b////o////6P///+j////s////9P////T////0////9P////T////2////+P///9j////Y////2P///9j////Y////2P///9j////Y////3f///+L////n////5////+f////n////5////+f////x////2P///9j////Y////2P///9j////Y////2P///9j////Y////2P///9j////Y////2P///9j////Y////2P///9j////2////9v////b////2////9v////z///8AAAAAAAAAAAAAAAAGAAAABgAAAAYAAAAGAAAACgAAAAoAAAAMAAAAFAAAAOz////s////7P///+z////s////7P////b////+////AAAAAAAAAAAAAAAAAAAAAAAAAAACAAAABAAAAAYAAAAPAAAA7P///+z////s////7P///+z////s////7P////b////6////+v////r////6////+v////z////8/////P////7////2////9v////b////2////9v////b////4////AgAAAAIAAAACAAAABAAAAAQAAAAFAAAABQAAAAUAAAAIAAAACgAAAOz////s////7P///+z////s////7P///+z////y////+v///wAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAMAAAAGAAAA7P///+z////s////7P///+z////s////7P////L////4////+v////r////6////+v////z////8/////P////7////2////9v////b////2////9v////b////4/////P///wAAAAACAAAABAAAAAQAAAAFAAAABQAAAAUAAAAIAAAACgAAAOz////s////7P///+z////s////7P///+z////y////9v////z////+/////v////7////+////AAAAAAEAAAAEAAAA7P///+z////s////7P///+z////s////7P////L////2////+P////j////4////+P////r////6////+v////z////2////9v////b////2////9v////b////2////+P///wAAAAACAAAAAgAAAAIAAAAEAAAABAAAAAUAAAAGAAAACgAAAOz////s////7P///+z////s////7P///+z////y////9v////z////9/////f////3////+/////////wAAAAADAAAA7P///+z////s////7P///+z////s////7P////L////2////9v////b////2////9v////j////4////+P////z////2////9v////b////2////9v////b////2////+P///wAAAAACAAAAAgAAAAIAAAAEAAAABAAAAAQAAAAFAAAACAAAAOz////s////7P///+z////s////7P///+z////y////9v////z////9/////f////3////9/////v///wAAAAACAAAA7P///+z////s////7P///+z////s////7P////L////2////9v////b////2////9v////j////4////+P////v////x////8f////H////x////8f////H////x////9v////z///8BAAAAAQAAAAEAAAACAAAAAwAAAAMAAAAEAAAABwAAAOz////s////7P///+z////s////7P///+z////y////9v////z////9/////f////3////9/////v////////8BAAAA7P///+z////s////7P///+z////s////7P////L////2////9v////b////2////9v////j////4////+P////n////x////8f////H////x////8f////H////x////9v////z///8BAAAAAQAAAAEAAAACAAAAAwAAAAMAAAAEAAAABwAAAOr////q////6v///+r////q////6v///+r////w////9P////r////8/////P////z////8/////f////////8AAAAA6P///+j////o////6P///+j////o////6P///+7////y////9P////T////0////9P////b////2////9/////j////x////8f////H////x////8f////H////x////9v////z///8BAAAAAQAAAAEAAAACAAAAAwAAAAMAAAAEAAAABwAAAOj////o////6P///+j////o////6P///+j////u////8v////j////6////+v////r////6////+/////7///8AAAAA5v///+b////m////5v///+b////m////5v///+7////w////8f////H////x////8f////P////z////9P////b////x////8f////H////x////8f////H////x////9v////z///8BAAAAAQAAAAEAAAACAAAAAwAAAAMAAAAEAAAABwAAAOj////o////6P///+j////o////6P///+j////u////8v////b////4////+P////j////4////+v////z///8AAAAA5v///+b////m////5v///+b////m////5v///+r////s////7f///+3////t////7f///+7////v////8P////T////x////8f////H////x////8f////H////x////9v////z///8AAAAAAAAAAAAAAAAAAAAAAQAAAAIAAAADAAAABwAAAOb////m////5v///+b////m////5v///+b////s////8P////T////2////9v////b////2////+P////r////+////5P///+T////k////5P///+T////k////5P///+b////o////6P///+j////o////6P///+j////o////7P////D////q////6v///+r////q////6v///+r////q////7v////L////4/////P////z////8/////P////z////+////AgAAAOb////m////5v///+b////m////5v///+b////q////7v////D////w////8P////D////y////9P////b////5////4v///+L////i////4v///+L////i////4v///+L////i////4v///+L////i////4v///+L////i////6P///+z////o////6P///+j////o////6P///+j////o////6P///+j////u////8v////L////y////8v////L////0////9v///+L////i////4v///+L////i////4v///+L////i////4v///+L////i////4v///+L////i////4v///+L////s////2P///9j////Y////2P///9j////Y////2P///9j////Y////2P///9j////Y////2P///9j////Y////2P///9j////2////9v////b////2////9v////z///8AAAAAAAAAAAQAAAAIAAAACAAAAAgAAAAIAAAACgAAAAwAAAAOAAAAFAAAAOL////i////4v///+L////m////7P////D////4////+v////r////+////AgAAAAIAAAADAAAABgAAAAYAAAAPAAAA4v///+L////i////4v///+L////o////7P////L////2////+v////j////4////+v////r////6/////P////7////2////9v////b////2////9v////z///8AAAAAAAAAAAQAAAAEAAAACAAAAAgAAAAIAAAACgAAAAwAAAAOAAAAFAAAAOL////i////4v///+L////m////6v///+z////y////+v////7///8AAAAAAAAAAAAAAAAAAAAAAgAAAAMAAAAGAAAA4v///+L////i////4v///+L////o////7P////L////2////+v////j////4////+v////r////6/////P////7////0////9P////T////0////9P////j////6/////P///wAAAAAEAAAABAAAAAQAAAAEAAAACgAAAAwAAAAOAAAAFAAAAOL////i////4v///+L////m////6v///+z////y////9v////r////8/////P////7////+/////v////7///8CAAAA4v///+L////i////4v///+b////q////7P////L////2////+P////b////2////+P////j////4////+v////z////y////8v////L////y////8v////b////4////+v////7///8CAAAAAgAAAAIAAAACAAAACAAAAAoAAAAKAAAAEAAAAOL////i////4v///+L////m////6v///+z////y////9v////r////6////+v////z////8/////P////7///8AAAAA4v///+L////i////4v///+b////q////7P////L////2////9v////b////2////9v////b////2////+P////z////y////8v////L////y////8v////b////4////+v////7///8CAAAAAgAAAAIAAAACAAAABgAAAAgAAAAIAAAADgAAAOL////i////4v///+L////m////6v///+z////y////9v////r////6////+v////z////8/////P////7///8AAAAA4v///+L////i////4v///+b////q////7P////L////2////9v////b////2////9v////b////2////+P////z////w////8P////D////w////8P////T////2////+v////7///8AAAAAAAAAAAAAAAAAAAAABAAAAAYAAAAGAAAADAAAAOL////i////4v///+L////m////6v///+z////y////9v////r////6////+v////z////8/////P////7///8AAAAA4v///+L////i////4v///+b////q////7P////L////2////9v////b////2////9v////b////2////+P////z////s////7P///+z////s////7P///+7////y////9v////z///8AAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAGAAAACwAAAOD////g////4P///+D////k////6P///+r////w////9v////r////4////+P////r////6////+v////z////+////3v///97////e////3v///+L////m////6P///+7////y////9P////T////0////9P////T////2////9/////v////s////7P///+z////s////7P///+7////y////9v////z///8AAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAGAAAACwAAAN7////e////3v///97////i////4v///+L////o////8P////D////w////8P////D////w////8v////L////0////3P///9z////c////3P///9z////e////5P///+j////s////7P///+z////s////7P///+z////s////7v////D////q////6v///+r////q////6v///+z////y////9v////r///8AAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAGAAAACwAAAN7////e////3v///97////i////4v///+L////i////5v///+b////m////5v///+b////m////5v///+j////q////2P///9j////Y////2P///9j////Y////2P///+D////i////4v///+L////i////4v///+L////i////4v///+j////o////6P///+j////o////6P///+r////y////9v////r/////////////////////////AwAAAAMAAAAFAAAACgAAAN7////e////3v///97////e////4P///+D////i////5v///+b////m////5v///+b////m////5v///+b////o////2P///9j////Y////2P///9j////Y////2P///+D////i////4v///+L////i////4v///+L////i////4v///+j////k////5P///+T////k////5P///+T////k////7P////L////4/////P////z////8/////P////z////+////AgAAANz////c////3P///9z////e////4P///+D////i////5v///+b////m////5v///+b////m////5v///+b////m////2P///9j////Y////2P///9j////Y////2P///+D////i////4v///+L////i////4v///+L////i////6P///+z////i////4v///+L////i////4v///+b////o////6P///+j////s////8P////D////w////8P////D////y////9P///9j////Y////2P///9j////Y////2P///9j////Y////3f///+L////i////4v///+L////i////4v///+L////m////2P///9j////Y////2P///9j////Y////2P///9j////Y////2P///9j////Y////2P///9j////Y////2P///9j////s////7P///+j////o////6P///+j////i////2P///9j////T////0////9P////NzMzMzMwrQDMzMzMzMy5AmpmZmZmZL0AAAAAAAIAwQDMzMzMzMzFAZmZmZmbmMkCamZmZmRk0QAAAAAAAAEhAAAAAAAA4j0AAAAAAADiPQAAAAAAAOI9AAAAAAAA4j0D/////AAAMwwAADMMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIMIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAACAAAAAPwAAAD8AAAAAAAAAAAAAAAAAAIC/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIC/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADSQgAAAAD//////////wAAAAAAAAAACAAAAAAAoEEAAGBBAABAQQAAQEEAAEBBAABAQQAAQEEAAHDCAADwwQAAIMIAACDCAAAgwgAAIMIAACDCAAAAQAAAlsIAAMDAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAYEEAACBBAAAgQQAAIEEAACBBAAAgQQAAIEEAACDCAADwwQAAyMEAAMjBAADIwQAAyMEAAMjBAAAAQAAAoMIAAMDAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAQEEAACBBAAAgQQAAIEEAACBBAAAgQQAAIEEAAKDBAACgwQAAcMEAAHDBAABwwQAAcMEAAHDBAAAAAAAAoMIAAMDAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAIEEAAABBAAAAQQAAAEEAAABBAAAAQQAAAEEAAKDBAABwwQAAQMEAAEDBAABAwQAAQMEAAEDBAAAAAAAAoMIAAMDAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAIEEAAMBAAADAQAAAwEAAAMBAAADAQAAAwEAAAHDBAABwwQAAQMEAAEDBAABAwQAAQMEAAEDBAAAAAAAAqsIAAMDAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOA/AAAAAAAA8D8AAAAAAADwP83MzMzMzPQ/mpmZmZmZ+T8AAAAAAAAAQAAAAAAAAABAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAAxAAAAAAAAAEEAAAAAAAAAQQDMzMzMzMxFAZmZmZmZmEkAAAAAAAAAUQAAAAAAAABRAAAAAAAAAFEAAAAAAAAAUQAAAAAAAABRAAAAAAAAAFEAAAAAAAAAUQAAAAAABAAAAAgAAAAMAAAAEAAAABQAAAAYAAAAHAAAACAAAAAkAAAAKAAAACwAAAAwAAAANAAAADgAAAA8AAAAQAAAAEQAAABIAAAATAAAAFAAAABUAAAAWAAAAFwAAABgAAAAZAAAAGgAAABsAAAAcAAAAHQAAAB4AAAAfAAAAIAAAACEAAAAiAAAAIwAAACQAAAAlAAAAJgAAACcAAAAAAAAAAQAAAAIAAAADAAAABAAAAAUAAAAGAAAABgAAAAcAAAAHAAAABw==", 10237, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+190612);
/* memory initializer (tweaked) */ allocateBase64Encoded("BwAAAAYAAAAGAAAABgAAAAcAAAAHAAAACAAAAAkAAAAKAAAACwAAAAwAAAANAAAADgAAAA8AAAAQAAAAEQAAABEAAAARAAAAEgAAABIAAAATAAAAEwAAABMAAAAUAAAAFQAAABYAAAAXAAAAGAAAABkAAAAAAAAAAQAAAAIAAAADAAAABAAAAAUAAAAFAAAABQAAAAYAAAAGAAAABgAAAAUAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAFAAAABQAAAAUAAAAGAAAABgAAAAYAAAAHAAAABwAAAAcAAAAIAAAACAAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAABEAAAASAAAAAAAAAAEAAAACAAAAAwAAAAQAAAAFAAAABgAAAAcAAAAIAAAACQAAAAoAAAALAAAADAAAAA0AAAAOAAAADwAAABAAAAARAAAAEgAAABMAAAAUAAAAFQAAABYAAAAXAAAAGAAAABkAAAAaAAAAGwAAABwAAAAdAAAAHgAAAB8AAAAgAAAAIQAAACIAAAAjAAAAJAAAACUAAAAmAAAAJwAAAAAAAAABAAAAAgAAAAMAAAAEAAAABQAAAAYAAAAHAAAACAAAAAkAAAAKAAAACwAAAAwAAAAMAAAADQAAAA0AAAANAAAADgAAAA4AAAAOAAAADwAAAA8AAAAPAAAADwAAABAAAAAQAAAAEQAAABEAAAARAAAAEgAAABIAAAATAAAAEwAAABMAAAAUAAAAFQAAABYAAAAXAAAAGAAAABkAAAAAAAAAAQAAAAIAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAIAAAABwAAAAYAAAAFAAAABAAAAAQAAAAEAAAABAAAAAQAAAAFAAAABQAAAAUAAAAGAAAABgAAAAYAAAAHAAAABwAAAAcAAAAIAAAACAAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAABEAAAASAAAAnP///5z///+c////nP///5z///+c////l////5f///+X////l////5L///+I////fv///37///9+////fv///3T///90////dP///3T///90////dP///3T///9q////mpmZmZmZyT+amZmZmZnJP5qZmZmZmck/mpmZmZmZ2T8zMzMzMzPjPwAAAACAh8NAAAAAAICHw0AAAAAAgIfDQAAAAACAh8NAAAAAAICHw0AAAAAAgIfDQCAAAAAQAAAAEAAAABAAAAAgAAAADycAAA8nAAAPJwAADycAAA8nAAAPJwAAAAAAAAABAACAAAAAgAAAAAABAAAAAgAADycAAA8nAAAPJwAADycAAA8nAAAPJwAAAAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAAAAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAABAAAAiBUDABjNAgCIFQMAmM8CAIgVAwBYzwIAiBUDABjPAgCIFQMA2M4CAIgVAwCYzgIAiBUDAFjOAgCIFQMAGM4CAIgVAwDYzQIAiBUDAJjNAgCIFQMAWM0CAFjdAAAAAAAAAQ==", 1261, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+200852);
/* memory initializer (tweaked) */ allocateBase64Encoded("AQ==", 1, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+203268);
/* memory initializer (tweaked) */ allocateBase64Encoded("AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE=", 1025, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+204296);
/* memory initializer (tweaked) */ allocateBase64Encoded("AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB", 129, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+206348);
/* memory initializer (tweaked) */ allocateBase64Encoded("AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIEBhEEBQcRCAcKEREREREDBAYPAwMGDwcGCRERERERBggKEQYGCBAJCAoREQ8QEREREREMDw8QDA8PEBAQEBADAwMOBQQECwgGBgoRDAsRBgUFDwUDBAsIBQUIEAkKDgoICREIBgYNCgcHChALDQ4RERERERAQEBAPEBAQEBAQAQIDBgUEBwcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQIBAgECAQIBQgFCAYIBAgECAUIBQcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwAAAAAAAAAAAAAAAAAAAAAAAAIDAwQDBQQGBAYFBwYHBggGCAcJCAoIDAkNCg8KDwsOAAAAAAAAAAQEBAQEBAMEBAQEBAUEBQUFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAwMDBAMEBAUFBgYHBwcICAsICQkJCgsLCwkKCgsLCwsKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoAAAAAAAAAAAAAAAAAAAAAAAAEAwQDBAQFBAUEBgQGBQYFBwUHBggGCAYIBwgHCQcJCAAAAAAAAAAEBQQEBAUEBAQFBAUEBQMFAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAMFAwUEBQQFBAUFBQUGBQYFBwUIBggGCAYIBggHCQcJBwsJCwsMCw4MDhAOEA0QDhAMDw0QDhANDgwPDQ8NDQ0PDA4ODw0PDA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PAgQFBAUEBQQFBQUFBQUGBQYFBgYHBgcGCAcIBwgHCAcEBQUFBQUFBQUFBQUFBQUFBQYFBgYGBgUGBgcGBwYHBgcGCAcIBwgHCAcIBwkHCQcJBwkICQgKCAoICgcKBgoICggLBwoHCwgLCwwMCwsMCw0LDQsNDA8MDQ0ODg4ODg8PDxAOERMTEhISEhISEhISEhISEhISEhISEhISEhISEgUGCA8GCQoPCgsMDw8PDw8EBgcPBgcIDwkICQ8PDw8PBggJDwcHCA8KCQoPDw8PDw8NDw8PCgsPDw0NDw8PDw8EBgcPBggJDwoKDA8PDw8PAgUGDwUGBw8IBgcPDw8PDwUGCA8FBgcPCQYHDw8PDw8ODA0PDAoLDw8PDw8PDw8PBwgJDwkKCg8PDg4PDw8PDwUGBw8HCAkPDAkKDw8PDw8HBwkPBwcIDwwICQ8PDw8PDQ0ODwwLDA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8NDQ0PDw8PDw8PDw8PDw8PDwwNDw8MDQ8PDg8PDw8PDw8PDw8PDw0PDw8PDw8PDw8HBQUJCQYGCQwIBwgLCAkPBgMDBwcEAwYJBgUGCAYIDwgFBQkIBQQGCgcFBQsIBw8ODw0NDQ0ICw8KBwYLCQoPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMCBAMGAwcDCAUIBggICAgICAgICAgICAgICAgICAgICAgICAgIBwAAAAAAAAAAAAIDAwQDBAQFBAYFBgcGCAgAAAAAAAAAAAMDAwMCBAMEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADBQIFAwUDBgMGBAcGBwgHCQgJCQkKCQsNCw0KCg0NDQ0NDQwMDAwAAAAAAAAAAAADBAMEAwUDBgMGBAYEBwUHAAAAAAAAAAACAwMDAwQDBAAAAAAAAAAEBQYLBQUGCgcHBgYODQkJBgYGCgYGBgkIBwcJDgwICwgHBwsICAcLCQkHCQ0LCQ0TExITDxAQEwsLCg0KCgkPBQUGDQYGBgsIBwYHDgsKCwYGBgwHBgYLCAcHCw0LCQsJBwYMCAcGDAkICAsNCgcNExMRExEODhMMCggMDQoJEAcIBwwHBwcLCAcHCAwMCwsICAcMCAcGCwgHBwoKCwoLCQgIDQkIBwwKCQcLCQgHCxISDxISEBESDwsKEgsJCRIQEA0QDAsKEAwLCQYPDAsNEBAODg0LDBAMCQkNDQoKDBESEREODw4QDgwODwwKCwwSEhISEhISEhIMDRIQCwkSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMEAgQDBQQFBQUFBgYGBgYGBgcHCAYJBwwLEA0QDA8NDwwODA8PDwAAAAAAAAAAAAADAwMEAwQEBAQEBQUFBgYAAAAAAAAAAAAAAAIDAgMDAwAAAAAAAAEDAgMAAAAABgcHDAYGBwwHBgYKDwwLDQcHCA0HBwgMBwcHCwwMCw0KCQkLCQkJCgoICAwODAwOCwsMDgsMCw8PDA0PDw8PDwYGBwoGBgYLBwYGCQ4MCw0HBwcKBgYHCQcHBgoNDAoMCQkJCwkJCAkJCAgKDQwKDAwMCw0MDAsMDw0MDw8PDg4GBgYIBgYFBgcHBgULCgkIBwYGBwYGBQYHBwYGCwoJCAgICAkICAcICAgGBwsKCQkOCwoODgsKDw0LCQsPDAwLCwkICAoJCAkLCgkIDAsMCw0KCAkLCggJCgkICQoIDAwPCwoKDQsKCggIBwwKCQsMDwwLDw0LCw8MDgsNDw8NDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBAMFAwUDBgQHBAcFBwYHBgcICg0NDQ0NDQ0NDQ0NDQ0NDAwMDAwAAAAAAAAAAAAABAMEAwQDBQMFBAUEBgQGAAAAAAAAAAAAAAACAgMDAwMAAAAAAAACAgICAAAAAAIEBw0EBQcPCAcKEBAOEBACBAcQAwQHDggIChAQEA8QBggLEAcHCRALCQ0QEBAPEBAQEBAOEBAQEBAQEBAQEBADAwYQBQUHEAkICxAQEBAQBQUIEAUFBxAIBwkQEBAQEAkJDBAGCAsQCQoLEBAQEBAQEBAQDRAQEA8QEBAQEBAQBQQHEAYFCBAJCAoQEBAQEAUFBw8FBAYPBwYIEBAQEBAJCQsPBwcJEAgICRAQEBAQEBAQEA8PDxAPDw4QEBAQEAgICxAICQoQCwoOEBAQEBAGCAoQBgcKEAgICxAOEBAQCgsOEAkJCxAKCgsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQDxAQEBAQEBAQEBAQDBAPEAwOEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAQIDBgQHBQcCBggJBwsNDQEDBQUGBgwKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADBgUHBQcHBwcHBQcFBwUHBQcHBwcHBAcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcGBgYGBgYGBgYAAAAAAAAAAAAAAAAAAAAAAAADAgQDBAQEBQUGBQYFBwYGBgcHBwgJCQkMCgsKCgwKCgAAAAAAAAADBAQEBAQEBAQFBAUEBQQEBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwYDBwMHBQcHBwcHBgcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHAAAAAAAAAAAAAAAAAAAAAAAAAwMDBAQEBAQEBQUFBQYGBwYHBggGCQcJBwkJCwkMCgwAAAAAAAAABAQEBAQEBAQEBAQEBAQEBQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMEAwQDBAQFBAUFBQYGBgcGCAYIBgkHCgcKBwoHDAcMBwwJDAsMCgwKDAsMDAwKDAoMCgwJDAsMDAwMDAsMCwwMDAwMDAwMDAoKDAwMDAwKDAwMDAwMDAwMDAwMDAwMDAIEBQQFBAUEBQUFBQUFBgUGBQYGBgYHBwcHBwcICAgIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGBQcFBwQHBAgECAQIBAgDCAQJBAkECQQJBAkFCQUJBgkHCQgJCQkKCQsJDgkPCg8KDwoPCg8LDwoODA4LDg0ODQ8PDwwPDw8NDw0PDQ8PDw8PDw8PDw8PDw8PDw8PDw4EBAQEBAQEBAUFBQUFBQUFBQUGBgYGBgYHBgcGBwYHBgUFBQUFBQYFBgUGBQYFBgUGBQcFBwUHBQgFCAUIBQkFCQYKBgoGCwYLBgsGCwYLBgsGCwYMBwsHCwcLBwsHCgcLBwsHDAcLCAsICwgLCA0IDAkLCQsJCwoMCgwJDAoMCw4MEAwMCw4QEREREREREREREREREREREREREREQEBAQCA0REQgLERELDREREREREQYKEBEGCg8RCAoQEREREREJDQ8RCAsREQoMEREREREREREREREREREREREREREREQYLDxEHCg8RCAoREREPEREECA0RBAcNEQYIDxEQDxERBgsPEQYJDREIChERDxERERAREREMDg8RDQ4PEREREREFCg4RBQkOEQcJDxEPDxERAwcMEQMGCxEFBw0RDAwREQUJDhEDBwsRBQgNEQ0LEBEMERERCQ4PEQoLDhEQDhERCAwREQgMEREKDBEREREREQUKEREFCQ8RBwkREQ0NEREHCxERBgoPEQcJDxEMCxERDA8REQsOERELCg8RERAREQoHCA0JBgcLCggIDBEREREHBQUJBgQECAgFBQgQDg0QBwUFBwYDAwUIBQQHDgwMDwoHCAkHBQUGCQYFBQ8MCQoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQcCBwMIBAkFCQgKCwsMDg4ODg4ODg4ODg4ODg4ODg4ODg4NDQ0NAAAAAAAAAAAAAwQDBgMGAwYDBwMIBAkECQAAAAAAAAAAAwMCAwMEAwQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMFAwUDBQQFBAUFBQUGBQYFBgUGBQYFBwgJCw0NDQ0NDQ0NDQ0NDQAAAAAAAAAAAAMDAwQEBAQFBAUEBQQGBAYAAAAAAAAAAAMDAwMDAwMDAAAAAAAAAAcHBwsGBgcLBwYGCgwKCg0HBwgLBwcHCwcGBwoLCgoNCgoJDAkJCQsICAgLDQsKDg8PDg8PDg0ODwwMEREREREHBwYJBgYGCQcGBggLCwoMBwcHCQcGBgkHBgYJDQoKCwoJCAoJCAgKCAgHCQ0MCgsRDg4NDw4MDRENDA8REQ4RBwYGBwYGBQcGBgYGCwkJCQcHBgcHBgYHBgYGBgoJCAkKCQgICQgHCAgHBggLCgkKEREMDw8PDA4ODgoMDw0MDQsKCAoLCggICgkHBwoJCQsLCwkKCwoICQoIBggKCQkLDg0KDAwLCgoIBwgKCgsLDBERDxEREREREQ0MERERDhEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgQDBQMFAwUEBgUGBQcGBgcHCQkLCxALDgoLCw0QDw8PDw8PDw8PAAAAAAAAAAAAAAMDBAMEAwQEBQQFBAYFBgAAAAAAAAAAAAAAAwIDAgMDAAAAAAAAAgICAgAAAAADBgoRBAgLFAgKCxQUFBQUAgQIEgQGCBEHCAoUFBEUFAMFCBEDBAYRCAgKEREMEBQNDQ8UCgoMFA8ODxQUFBMTAQQKEwMIDRMHDBMTExMTEwIGCxMIDRMTCQsTExMTExMGBw0TCQ0TEwoNEhISEhISEhISEhISEhISEhISEhISEgEDBAcCBQYHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAgQDBAQEBQQHBQgFCwYKBgwHDAcMCAwIDAoMDAwMDAsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsAAAAAAAAAAAAAAAAAAAAAAAAFAwYDBgQHBAcEBwQIBAgECAQIBAkECQUKBQoHCggKCAAAAAAAAAAEBAQEBAQEBQMFAwUEBgQGBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGAAAAAAAAAAAAAAAAAAAAAAAABQEFAwUDBQQHBQoHCgcMCg4KDgkOCw4ODg0NDQ0NDQ0AAAAAAAAABAUEBgQIAwkDCQIJAwgECQQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQDBQMFAwYDBgQGBAcEBwUIBQgGCQcJBwkICgkKCQsKCwsLCwsLDAwMDQwNDA4MDwwODBANEQ0RDhEOEA0RDhEOEQ8RDw8QEREREREREREREREREREREBAQEBAQEBAQEAIFBQQFBAUEBQUFBQUFBgUGBQYFBwYHBgcGCAYJBwkHBQUGBQYFBgUGBQYFBgUGBQcFBwUHBQcFBwUHBQgFCAUIBQgFCAYIBggGCQYJBgkGCQYJBwkHCQcJBwoHCggKCAoICggKCAsICwgLCAsICwkMCQwJDAkMCQwKDAoNCw0LDgwODQ8OEA4RDxIQFBQUFBQUFBQUFBQUFBQUFBQUFBQHBgkRBwYIEQwJCxAQEBAQBQQHEAUDBg4JBggPEBAQEAUEBg0DAgQLBwQGDRALCg4MDAwQCQcKDwwJCxAQDw8QAQYMEAQMDxAJDxAQEBAQEAIFCxAFCw0QCQ0QEBAQEBAECAwQBQkMEAkNDxAQEBAQDxAQEAsODRAMDxAQEBAQDwEGAwcCBAUHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAQYDBwMIBAgFCAgICQcICAcHBwgJCgkJCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCQkAAAAAAAAAAAAAAAAAAAAAAAAFAwUEBgQGBAcEBwQIBAgECQQJBAoECgUKBQsFDAYMBgAAAAAAAAAEBAQEBAQEBAQEBAQEBQQFBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgDCAQIBAgGCAUIBAgECAYIBwgHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHAAAAAAAAAAAAAAAAAAAAAAAAAwMDBAQEBAUEBQQGBQcFBwYIBggGCQcJBwoHCQgLCAsAAAAAAAAABAUEBQQFAwUDBQMFBAQEBQUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUDBQMGBAYEBwQHBAcECAQIBAkFCQUJBQkGCgYKBgsHCgcKCAsJCwkLCgsLDAsLDA8PDA4LDgwOCw4NDgwOCw4LDgwOCw4LDg0NDg4ODg4ODg4ODg4ODg4ODg4ODg4ODgIFBQUFBQUEBQUFBQUFBQUGBQYFBgUHBgcGBwYIBggGBQUFBQUFBgUGBQYFBgUGBQYFBgUGBQYFBgUGBgYGBwYHBgcGBwYHBgcGCAYIBggHCAcIBwgHCQcJCAkICQgKCAoJCgkKCQsJCwkKCgsKCwoLCwsLCwsMDQ4ODg8PEBAQEQ8QDxAQEREQERERERERERERERERERERERERERERERECAwcNBAQHDwgGCREVEA8VAgUHCwUFBw4JBwoQEQ8QFQQHChEHBwkPCwkLEBUSDxUSFRUVDxERExUTEhQVFRUUAQUHFQUICRUKCQwUFBAUFAQICRQGCAkUCwsNFBQPERQJCw4UCAoPFAsNDxQUFBQUFBQUFA0UFBQSEhQUFBQUFAMGCBQGBwkUCgkMFBQUFBQFBwkUBgYJFAoJDBQUFBQUCAoNFAgJDBQLCgwUFBQUFBIUFBQPERIUEhESFBQUFBQHCgwUCAkLFA4NDhQUFBQUBgkMFAcICxQMCw0UFBQUFAkLDxQICg4UDAsOFBQUFBQUFBQUFBQUFBQUFBQUFBQUCxASFA8PERQUERQUFBQUFAkOEBQMDA8UEQ8SFBQUFBQQExIUDxAUFBERFBQUFBQUFBQUFBQUFBQUFBQUFBQUFAEEAgYDBwUHAgoIDgcMCw4BBQMHBAkHDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgUCBgMGBAcEBwUJBQsGCwYLBwsGCwYLCQsICwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCgoKCgoKAAAAAAAAAAAAAAAAAAAAAAAABAIEAgUDBQQGBgYHBwgHCAcIBwkICQgJCAoICwkMCQwAAAAAAAAABAUEBQQFBAUDBQMFAwUEBQQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMHAwgDCgMIAwkDCAQJBAkFCQYKBgkHCwcMCQ0KDQwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAAAAAAAAAAAAAAAAAAAAAAAAAMDBAMEBAQEBQUFBQUGBQcFCAYIBgkHCgcKCAoICwkLAAAAAAAAAAQFBAUDBQMFAwUEBAQEBQUFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAwQDBAQFBAUEBQUGBQYFBwUHBgcGCAcIBwgHCQgJCQkJCgoKCwkMCQwJDwoOCQ0KDQoMCgwKDQoMCw0LDgwNDQ4ODQ4PDhANDQ4QEBAQEBAQEBAQEBAQEBAQEBAQDw8BBQUFBQUFBQYFBgUGBQYFBgYHBwcHCAcICAkICgkKCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAUIBAkECQQJBAkECQQJBAkECQQJBAgECAQJBQkFCQUJBQkGCgYKBwoICwkLCwwNDA4NDw0PDhAOEQ8RDw8QEA8QEBAPEhAPERETExMTExMTExMTExMTExMTExMTExMTAgUFBAUEBQQFBAYFBgUGBQYFBwUHBggGCAYIBgkGCQYFBQUFBgUGBQYFBgUGBQYFBgUGBQYFBgUHBQcFBwUHBQgGCAYIBgkGCQYKBgoGCwYLBwsHDAcMBwwHDAcMBwwHDAcMCA0IDAgMCA0IDQkNCQ0JDQkMCgwKDQoOCw4MDg0ODQ4ODxAPDw8ODxEVFhYVFhYWFhYWFRUVFRUVFRUVFQUGDA4MDhAREgQCBQsHCgwODwkEBQsHCg0PEg8GBwUGCAsNEAsFBgUFBgkNDwwFBwYFBgkMDgwGBwgGBwkMDQ4ICAcFBQgKDBAJCQgGBgcJCQAAAAAAAAADAwgICAgKDA4DAgYHBwgKDBAHBgcJCAoMDhAIBggEBQcJCw0HBggFBgcJCw4ICAoHBwYICg0JCwwJCQcICgwKDQ8LCwoJCg0NEBEODw4NDhEAAAAAAAAACgkMDwwNEA4QBwEFDgcKDRAQCQQGEAgLEBAQDgQHEAkMDhAQCgUHDgkMDg8PDQgJDgoMDQ4PDQkJBwYICwwMDggIBQQFCAsMEAoKBgUGCAkKAAAAAAAAAAQEBwgHCAoMEQMBBgYHCAoMDwcGCQkJCwwOEQgGCQYHCQsNEQcGCQcHCAkMDwgICggHBwcKDgkKDAoICAgKDgsNDw0MCwsMEBESEhMUEhAQFAAAAAAAAAAFDRIQERETEhMTBQcKCwwMDRAREgYGBwcJCQoOERMIBwYFBgcJDBMRCAcHBgUGCAsPEwkIBwYFBQYIDQ8LCggIBwUEBAoODA0LCQcGBAIGDBIQEA0IBwcFCA0QERIPCwkJCAoNAAAAAAMIDA4PDw8NDw8GBQgKDAwNDA4NCgYFBggJCwsNDQ0IBQQFBggKCw0OCgcFBAUHCQsMDQsIBgUEBQcJCwwLCggHBQQFCQoNDQsKCAYFBAcJDw4NDAoJCAcICQwMDg0MCwoJCAkAAAAABAsNDg8PEhETEQUGCAkKCgwPExMGBgYGCAgLDhITCAYFBAYHCg0QEQkHBgUGBwkMDxMKCAcGBgYHCQ0PDAoJCAcGBAUKDw0NCwgGBgQCBwwRDxAKCAgHBgkMExIRDQsKCgkLDgAAAAADCAwNDg4ODQ4OBgQFCAoKCwsODQkFBAUHCAkKDQ0MBwUEBQYICQwNDQkGBQUFBwkLDgwKBwYFBAYHCgsMCwkIBwUFBgoKDQwKCQgGBgUICg4NDAwLCgkHCAoMDQ4ODQwLCQkKAAAAAAQLDA4PDxEREhIFBgYICQoNERITBwUEBggJCw8TEwgGBQUGBwsOEBEJBwcGBwcKDQ8TCggHBgcGBwkOEAwKCQcHBgQFCg8ODQsHBgYEAgcNEBAPCQgICAYJDRMTEQwLCgoJCw4AAAAAAwgLDQ8ODg0PDgYEBQcJCgsLDg0KBAMFBwgJCg0NDAcEBAUGCAkMDg0JBgUFBggJDA4MCQcGBQUGCAsLDAsJCAcGBgcKCw0LCgkIBwYGCQsNDQwMDAoJCAkLDA4PDw4MCwoKDAAAAAADCQsLDQ4TERETBQQFCAoKDRASEwcEBAUICQwOERMIBgUFBwcKDRASCggHBgUFCAsREwsJBwcFBAUIERMNCwgHBwUFBxASDg0IBgYFBQcQEhIQCggIBwcJEBISEgwKCgkJChESAAAAAAMICw0ODg0NEA4GAwQHCQkKCw4NCgQDBQcHCQoNDwwHBAQGBggKDQ8MCAYGBgYICg0OCwkHBgYGBwgMCw0KCQgHBgYHCwsNCwoJCQcHBgoLDQ0NDQ0LCQgKDAwPDxAPDAsKCgwAAAAABQgKDgsLDBAPEQUFBwkHCAoNEREHBQUKBQcICw0PCggKCAgICw8SEggFBQgDBAYKDhAJBwYHBAMFCQ4SCgkICgYFBgkOEgwMCwwIBwgLDhIODQwKBwUGCQ4SDg4NCgYFBggLEAAAAAADCAkNCgwMDAwMBgQGCAYICgoLDAgFBAoEBwgJCgsNCAoICQkLDA0OCgYECQMFBggKCwsIBgkFBQYHCQsMCQcLBgYGBwgKDAsJDAcHBgYHCQ0MCg0JCAcHBwgLDwsPCwoJCAcHAAAAAAQHDgoPCgwPEA8EAgsFCgYICw4ODgoHCwYICgsNDwkECwUJBgkMDg8OCQYJBAUHCgwNCQUHBgUFBwoNDQoICQgHBggKDg4NCwoKBwcICw4PDQwJCQYFBwoOEQ8NCwoGBgcJDBEAAAAABAcLCwsLCgsMCwUCCwUGBgcJCwwLCQYKBgcICQoLCwULBwgICQsNDgsGBQgEBQcICgsKBgcHBQUGCAkLCgcICQYGBgcICQsJCQsHBwYGBwkMDAoNCQgHBwcICw0LDgsKCQgHBwAAAAAKCQ0LDgoMDQ0OBwIMBQoFBwoMDgwGCQgHBwkLDRAKBAwFCgYIDA4QDAYIBwYFBwsMEAoECAUGBAYJDRAKBgoHBwYHCQ0PDAkLCQgGBwoMDg4LCgkGBQYJCw0PDQsKBgUGCAkLAAAAAAUGCwsLCwoKDAsFAgsFBgYHCQsNDQoHCwYHCAkKDAsFCwYIBwkLDg8LBgYIBAUHCAoNCgUHBwUFBggKCwoHBwgGBQUHCQkLCAgLCAcGBgcJDAsKDQkJBwcHCQsNDA8MCwkICAgAAAAACwkNDAwLDAwNDwgCCwQIBQcKDA8NBwoJCAgKDRERCwQMBQkFCAsOEAwGCAcGBggLDRALBAkFBgQGCg0QCwYLBwcGBwoNDw0JDAkIBggKDA4OCgoIBgUGCQsNDwsLCQYFBggJDAAAAAAGBgwKCgoJCgwMBgEKBQYGBwkLDgwJCAsHCAkLDQ8KBQwHCAcJDA4PCgYHCAUGBwkMDgkGCAcGBgcJDAwJBwkJBwYGBwoKCgkKCwgHBgYICgwLDQ0LCggICAoLDQ8PDg0KCAgJAAAAAAQHDQ4ODxASEgQCBQgHCQwPDwoEBQoGCAsPEQwFBwUGCAsOEQsFBgYFBgkNEQwGBw==", 10240, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+207504);
/* memory initializer (tweaked) */ allocateBase64Encoded("BgUGCAwODgcIBgYHCQsODggJBgUGCQsNEAoKBwYHCAoLAAAAAAAAAAUECAoJCQoLDAQCBQYGCAoLDQgEBggHCQwMDgoGCAQFBgkLDAkFBgUFBgkLCwkHCQYFBQcKCgoJCwgHBgcJCwsMDQoKCQgJCwsPDwwNCwkKCwAAAAAAAAAGCA0MDQ4PEBAEAgQHBggLDQ8KBAQIBggLDhELBQYFBggMDhELBQUGBQcKDRAMBgcIBwgKDQ8NCAgHBwgKDA8PBwcFBQcJDA4PCAgGBgcICgsAAAAAAAAABQUJCgkJCgsMBQEFBgYHCgwOCQUGCAgKDA4OCgUIBQYICw0OCQUHBgYICgwLCQcJBwYGBwoKCgkMCQgHBwoMCwsNDAoJCAkLCw4PDw0LCQkLAAAAAAAAAAYGDA0NDhAREQQCBQgHCQwPDwkEBQkHCQwQEgsGBwQGCAsOEgoFBgUFBwoOEQoFBwcGBwoNEAsFBwcHCAoMDw0GBwUFBwkMDRAICQYGBwkKDAAAAAAAAAAFBAkKCQoLDA0EAQUHBwkLDA4IBQcJCAoNDQ0KBwkEBgcKDA4JBgcGBgcKDAwJCAkHBgcICwwLCwsJCAcICgwMDQ4MCwkJCQwMEREPEAwKCw0AAAAAAAAACQgMCwwNDg4QBgEFBgYJDA4RCQQFCQcJDQ8QCAUIBggKDRERCQYHBwgJDQ8RCwgJCQkKDBAQDQcIBwcJDA4PDQYHBQUHCg0NDgcIBQYHCQoMAAAAAAAAAAUECAkICQoMDwQBBQUGCAsMDAgFCAkJCw0MDAkFCAUHCQwNDQgGCAcHCQsLCwkHCQcHBwcKDAoKCwkIBwcJCwsMDQwLCQgJCw0QEA8PDAoLDAAAAAAAAAABAAAAQAAAAJguAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAEAAAADYLgMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAIAAAAGC8DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAgAAAACAvAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAADIAAACgLwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAASAAAA2C8DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAgAAAAPAvAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAADIAAABwMAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAASAAAAqDADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAgAAAAMAwAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAACAAAABAMQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAACAAAAAYDEDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAEAAOAxAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAEAAAADgMgMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAABAAAAAIDMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAGQAAAGAzAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAkAAACAMwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAABAAAAAkDMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAGQAAANAzAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAkAAADwMwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAQAAADQDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAQAAAAAA1AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAABkAAABANQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAKAAAAYDUDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAABAAAAHA1AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAABAAB4NQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAABAAAAAeDYDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAGQAAALg2AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAoAAADYNgMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAEAAAA6DYDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAQAAAAPA2AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAABAAAwNwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAIAAAAMDgDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAEAAAADg4AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAIAAAABIOAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAyAAAAyDgDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAEgAAAAA5AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAIAAAAAYOQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAyAAAAmDkDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAEgAAANA5AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAIAAAADoOQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAgAAAAaDoDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAgAAAAIg6AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAACAAAAAIOwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAACAAAAAKDsDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAEAAKg7AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAEAAAACoPAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAABAAAAA6DwDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAGQAAACg9AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAkAAABIPQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAABAAAAAWD0DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAGQAAAJg9AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAkAAAC4PQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAQAAyD0DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAQAAAAMg+AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAABkAAAAIPwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAKAAAAKD8DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAABAAAADg/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAEAAAABAPwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAABAAAAAgD8DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAACAAAAMA/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAIAAAADIPwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAyAAAASEADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAEgAAAIBAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAIAAAACYQAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAyAAAAGEEDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAEgAAAFBBAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAIAAAABoQQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAgAAAA6EEDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAgAAAAAhCAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAEAAAACIQgMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAABAAAAAyEIDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAACAAAAAhDAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAIAAAAAQQwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAyAAAAkEMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAEgAAAMhDAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAIAAAADgQwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAyAAAAYEQDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAEgAAAJhEAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAIAAAACwRAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAgAAAAMEUDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAgAAAAFBFAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAEAAAADQRQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAQAAEEYDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAACAAAABBHAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAABAAAAAYRwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAACAAAAAKEcDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAMgAAAKhHAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAABIAAADgRwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAACAAAAA+EcDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAMgAAAHhIAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAABIAAACwSAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAACAAAAAyEgDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAIAAAAEhJAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAIAAAABoSQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAgAAAA6EkDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAgAAAAAhKAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAFEAAACISgMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABRAAAA4EoDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAUQAAADhLAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAFEAAACQSwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABkAAAA6EsDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAZAAAAFBMAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAGQAAAC4TAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABkAAAAIE0DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAZAAAAIhNAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAGQAAADwTQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABkAAAAWE4DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAZAAAAMBOAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAGQAAAAoTwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABkAAAAkE8DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAZAAAAPhPAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAGQAAABgUAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABkAAAAyFADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAZAAAADBRAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAGQAAACYUQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABkAAAAAFIDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAUQAAAGhSAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAFEAAADAUgMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABRAAAAGFMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAUQAAAHBTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAFEAAADIUwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAABRAAAAIFQDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAUQAAAHhUAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAFEAAADQVAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8D8AAAAAAADwPwAAAAAAAPg/AAAAAAAAAEAAAAAAAAAAQAAAAAAAAARAmpmZmZmZBUAAAAAAAAAIQJqZmZmZmQ1AAAAAAAAAEEAAAAAAAAAQQAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAAAAAAAAgAAAAHAAAABwAAAAcAAAAHAAAABwAAAAcAAAAHAAAABwAAAAcAAAAHAAAAAAAAAAEAAAAAAAAAAAAAAAIAAAACAAAABAAAAAUAAAAFAAAABQAAAAUAAAAFAAAAAAAAAHBpAwBAaQMAEGkDAAAAAADIagMAUGoDAKhqAwAYagMAEGsDAOBqAwA4agMAQGsDAGhqAwDoaQMAyMQDAAAAAACQ3QAAcN0AAHhVAwBQVQMAKFUDAOBWAwC4VgMAkFYDAGhWAwBAVgMAGFYDAPBVAwDIVQMAoFUDADBXAwAIVwMAIFgDAPhXAwDQVwMAqFcDAIBXAwBYVwMASFgDAOhYAwDAWAMAmFgDAHBYAwAAAAAAEFkDALBZAwCIWQMAYFkDADhZAwAAAAAAUFoDAChaAwAAWgMA2FkDAAhcAwDgWwMAuFsDAJBbAwBoWwMAQFsDABhbAwDwWgMAyFoDAKBaAwB4WgMAAAAAAFhcAwAwXAMASF0DACBdAwD4XAMA0FwDAKhcAwCAXAMAcF0DABBeAwDoXQMAwF0DAJhdAwAAAAAAiF4DAGBeAwA4XgMA8F8DAMhfAwCgXwMAeF8DAFBfAwAoXwMAAF8DANheAwCwXgMAaGADAEBgAwAYYAMA0GEDAKhhAwCAYQMAWGEDADBhAwAIYQMA4GADALhgAwCQYAMAcGIDAEhiAwAgYgMA+GEDAChkAwAAZAMA2GMDALBjAwCIYwMAYGMDADhjAwAQYwMA6GIDAMBiAwCYYgMAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAIAAAADAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAIAAAAAhAAAACAAAABAAAABGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHBCAADwQQAA+kMAAIA/AACQQYAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAACAAAAAwAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAQAAQgAAABAAAAAgAAAAjAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwQgAA8EEAAPpDAACAPwAAkEEAAQAAAgAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////AgAAAAMAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAP////8FAAAABgAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAgAAAAA4AAAAEAAAAOgAAAAIAAAAIAAAAHAAAAFoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcEIAAPBBAAD6QwAAgD8AAJBBgAAAAAIAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////wIAAAADAAAABAAAAAAAAAAAAAAAAAAAAAAAAAD/////BQAAAAYAAAAH", 10101, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+217744);
/* memory initializer (tweaked) */ allocateBase64Encoded("BAAAAAAAAAAAAQAAHAAAAAgAAAB0AAAABAAAABAAAAA4AAAAtAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwQgAA8EEAAPpDAACAPwAAkEEAAQAABAAAAAAAAAABAAAAAgAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAACAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////8AAAAAAQAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////wYAAAAHAAAACAAAAAAAAAAAAAAAAAAAAAAAAAD/////CQAAAAoAAAALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAgAAAAAgAAAAhAAAABAAAABAAAABGAAAAAgAAAAYAAAAMAAAAFwAAAC4AAABaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcEIAAPBBAAD6QwAAgD8AAJBBgAAAAAYAAAAAAAAAAQAAAAEAAAACAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAMAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAgAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////AAAAAAEAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////8GAAAABwAAAAgAAAAAAAAAAAAAAAAAAAAAAAAA/////wkAAAAKAAAACwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAIAAAAAMAAAALgAAAAQAAAAIAAAAEAAAABcAAAAhAAAARgAAAAIAAAAGAAAACgAAAA4AAAATAAAAHAAAACcAAAA6AAAAWgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHBCAADwQQAA+kMAAIA/AACQQYAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAACAAAAAwAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAQAAQgAAABAAAAAgAAAAjAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwQgAA8EEAAPpDAACAPwAAkEEAAQAACAAAAAAAAAABAAAAAgAAAAIAAAADAAAAAwAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAABAAAAAMAAAAEAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAgAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////8AAAAAAQAAAAIAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////CQAAAAoAAAALAAAAAAAAAAAAAAAAAAAAAAAAAP////8MAAAADQAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAQAAF0AAAAXAAAAdAEAAAYAAAAuAAAAugAAAO4CAAAOAAAAIQAAAEEAAACCAAAABAEAACwCAAADAAAACgAAABIAAAAcAAAAJwAAADcAAABPAAAAbwAAAJ4AAADcAAAAOAEAANABAACKAgAAUgMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcEIAAPBBAAD6QwAAQEAAAJBBAAQAAAgAAAAAAAAAAQAAAAIAAAACAAAAAwAAAAMAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAQAAAADAAAABAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAIAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////AAAAAAEAAAACAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////wkAAAAKAAAACwAAAAAAAAAAAAAAAAAAAAAAAAD/////DAAAAA0AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAIAAC6AAAALgAAAOgCAAAMAAAAXAAAAHQBAADcBQAAHAAAAEIAAACCAAAABAEAAAgCAABYBAAABgAAABQAAAAkAAAAOAAAAE4AAABuAAAAngAAAN4AAAA8AQAAuAEAAHACAACgAwAAFAUAAKQGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHBCAADwQQAA+kMAAEBAAACQQQAIAAAGAAAAAAAAAAEAAAABAAAAAgAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAIAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////wAAAAABAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////BgAAAAcAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAP////8JAAAACgAAAAsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAgAALgAAALoAAAAQAAAAIQAAAEEAAABdAAAAggAAABYBAAAHAAAAFwAAACcAAAA3AAAATwAAAG4AAACcAAAA6AAAAGgBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwQgAA8EEAAPpDAACAPwAAkEEAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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", 10233, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+228312);
/* memory initializer (tweaked) */ allocateBase64Encoded("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", 7928, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+238552);



var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


  
  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;var _llvm_memcpy_p0i8_p0i8_i32=_memcpy;

  
  var ___rand_seed=allocate([0x0273459b, 0, 0, 0], "i32", ALLOC_STATIC);function _srand(seed) {
      HEAP32[((___rand_seed)>>2)]=seed
    }

  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  
   
  Module["_rand_r"] = _rand_r; 
  Module["_rand"] = _rand;

  
  
  
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            continue;
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          if (stream.tty.output.length) {
            stream.tty.ops.put_char(stream.tty, 10);
          }
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }}};
  
  var MEMFS={ops_table:null,CONTENT_OWNING:1,CONTENT_FLEXIBLE:2,CONTENT_FIXED:3,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 0777, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            },
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.contents = [];
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },ensureFlexible:function (node) {
        if (node.contentMode !== MEMFS.CONTENT_FLEXIBLE) {
          var contents = node.contents;
          node.contents = Array.prototype.slice.call(contents);
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        }
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.contents.length;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.ensureFlexible(node);
            var contents = node.contents;
            if (attr.size < contents.length) contents.length = attr.size;
            else while (attr.size > contents.length) contents.push(0);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0777 | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          var node = stream.node;
          node.timestamp = Date.now();
          var contents = node.contents;
          if (length && contents.length === 0 && position === 0 && buffer.subarray) {
            // just replace it with the new data
            if (canOwn && offset === 0) {
              node.contents = buffer; // this could be a subarray of Emscripten HEAP, or allocated from some other source.
              node.contentMode = (buffer.buffer === HEAP8.buffer) ? MEMFS.CONTENT_OWNING : MEMFS.CONTENT_FIXED;
            } else {
              node.contents = new Uint8Array(buffer.subarray(offset, offset+length));
              node.contentMode = MEMFS.CONTENT_FIXED;
            }
            return length;
          }
          MEMFS.ensureFlexible(node);
          var contents = node.contents;
          while (contents.length < position) contents.push(0);
          for (var i = 0; i < length; i++) {
            contents[position + i] = buffer[offset + i];
          }
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.contents.length;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.ungotten = [];
          stream.position = position;
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.ensureFlexible(stream.node);
          var contents = stream.node.contents;
          var limit = offset + length;
          while (limit > contents.length) contents.push(0);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          fileStore.createIndex('timestamp', 'timestamp', { unique: false });
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function() { callback(this.error); };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function() { done(this.error); };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          stream.position = position;
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      // we don't currently perform any user-space buffering of data
    }var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); },
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); },
            },
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        return FS.nodePermissions(dir, 'x');
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        if (stream.__proto__) {
          // reuse the object
          stream.__proto__ = FS.FSStream.prototype;
        } else {
          var newStream = new FS.FSStream();
          for (var p in stream) {
            newStream[p] = stream[p];
          }
          stream = newStream;
        }
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },getStreamFromPtr:function (ptr) {
        return FS.streams[ptr - 1];
      },getPtrForStream:function (stream) {
        return stream ? stream.fd + 1 : 0;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 0666;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 0777;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 0666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 0666 : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions
        var err = FS.mayOpen(node, flags);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        return stream.stream_ops.llseek(stream, offset, whence);
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=FS.getPtrForStream(stdin);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=FS.getPtrForStream(stdout);
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=FS.getPtrForStream(stderr);
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno) {
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
          this.message = ERRNO_MESSAGES[errno];
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
          function LazyUint8Array() {
            this.lengthKnown = false;
            this.chunks = []; // Loaded chunks. Index is the chunk number
          }
          LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = Math.floor(idx / this.chunkSize);
            return this.getter(chunkNum)[chunkOffset];
          }
          LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
            this.getter = getter;
          }
          LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
              // Find length
              var xhr = new XMLHttpRequest();
              xhr.open('HEAD', url, false);
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              var datalength = Number(xhr.getResponseHeader("Content-length"));
              var header;
              var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
              var chunkSize = 1024*1024; // Chunk size in bytes
  
              if (!hasByteServing) chunkSize = datalength;
  
              // Function to get a range from the remote URL.
              var doXHR = (function(from, to) {
                if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
                // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
                // Some hints to the browser that we want binary data.
                if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
                if (xhr.overrideMimeType) {
                  xhr.overrideMimeType('text/plain; charset=x-user-defined');
                }
  
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                  return new Uint8Array(xhr.response || []);
                } else {
                  return intArrayFromString(xhr.responseText || '', true);
                }
              });
              var lazyArray = this;
              lazyArray.setDataGetter(function(chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum+1) * chunkSize - 1; // including this byte
                end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
                  lazyArray.chunks[chunkNum] = doXHR(start, end);
                }
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum];
              });
  
              this._length = datalength;
              this._chunkSize = chunkSize;
              this.lengthKnown = true;
          }
  
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};
  
  
  
  
  function _mkport() { throw 'TODO' }var SOCKFS={mount:function (mount) {
        return FS.createNode(null, '/', 16384 | 0777, 0);
      },createSocket:function (family, type, protocol) {
        var streaming = type == 1;
        if (protocol) {
          assert(streaming == (protocol == 6)); // if SOCK_STREAM, must be tcp
        }
  
        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops
        };
  
        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname();
        var node = FS.createNode(SOCKFS.root, name, 49152, 0);
        node.sock = sock;
  
        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: FS.modeStringToFlags('r+'),
          seekable: false,
          stream_ops: SOCKFS.stream_ops
        });
  
        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream;
  
        return sock;
      },getSocket:function (fd) {
        var stream = FS.getStream(fd);
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null;
        }
        return stream.node.sock;
      },stream_ops:{poll:function (stream) {
          var sock = stream.node.sock;
          return sock.sock_ops.poll(sock);
        },ioctl:function (stream, request, varargs) {
          var sock = stream.node.sock;
          return sock.sock_ops.ioctl(sock, request, varargs);
        },read:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          var msg = sock.sock_ops.recvmsg(sock, length);
          if (!msg) {
            // socket is closed
            return 0;
          }
          buffer.set(msg.buffer, offset);
          return msg.buffer.length;
        },write:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          return sock.sock_ops.sendmsg(sock, buffer, offset, length);
        },close:function (stream) {
          var sock = stream.node.sock;
          sock.sock_ops.close(sock);
        }},nextname:function () {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0;
        }
        return 'socket[' + (SOCKFS.nextname.current++) + ']';
      },websocket_sock_ops:{createPeer:function (sock, addr, port) {
          var ws;
  
          if (typeof addr === 'object') {
            ws = addr;
            addr = null;
            port = null;
          }
  
          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress;
              port = ws._socket.remotePort;
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
              if (!result) {
                throw new Error('WebSocket URL must be in the format ws(s)://address:port');
              }
              addr = result[1];
              port = parseInt(result[2], 10);
            }
          } else {
            // create the actual websocket object and connect
            try {
              var url = 'ws://' + addr + ':' + port;
              // the node ws library API is slightly different than the browser's
              var opts = ENVIRONMENT_IS_NODE ? {headers: {'websocket-protocol': ['binary']}} : ['binary'];
              // If node we use the ws library.
              var WebSocket = ENVIRONMENT_IS_NODE ? require('ws') : window['WebSocket'];
              ws = new WebSocket(url, opts);
              ws.binaryType = 'arraybuffer';
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
            }
          }
  
  
          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: []
          };
  
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
  
          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport !== 'undefined') {
            peer.dgram_send_queue.push(new Uint8Array([
                255, 255, 255, 255,
                'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0),
                ((sock.sport & 0xff00) >> 8) , (sock.sport & 0xff)
            ]));
          }
  
          return peer;
        },getPeer:function (sock, addr, port) {
          return sock.peers[addr + ':' + port];
        },addPeer:function (sock, peer) {
          sock.peers[peer.addr + ':' + peer.port] = peer;
        },removePeer:function (sock, peer) {
          delete sock.peers[peer.addr + ':' + peer.port];
        },handlePeerEvents:function (sock, peer) {
          var first = true;
  
          var handleOpen = function () {
            try {
              var queued = peer.dgram_send_queue.shift();
              while (queued) {
                peer.socket.send(queued);
                queued = peer.dgram_send_queue.shift();
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close();
            }
          };
  
          function handleMessage(data) {
            assert(typeof data !== 'string' && data.byteLength !== undefined);  // must receive an ArrayBuffer
            data = new Uint8Array(data);  // make a typed array view on the array buffer
  
  
            // if this is the port message, override the peer's port with it
            var wasfirst = first;
            first = false;
            if (wasfirst &&
                data.length === 10 &&
                data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 &&
                data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
              // update the peer's port and it's key in the peer map
              var newport = ((data[8] << 8) | data[9]);
              SOCKFS.websocket_sock_ops.removePeer(sock, peer);
              peer.port = newport;
              SOCKFS.websocket_sock_ops.addPeer(sock, peer);
              return;
            }
  
            sock.recv_queue.push({ addr: peer.addr, port: peer.port, data: data });
          };
  
          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on('open', handleOpen);
            peer.socket.on('message', function(data, flags) {
              if (!flags.binary) {
                return;
              }
              handleMessage((new Uint8Array(data)).buffer);  // copy from node Buffer -> ArrayBuffer
            });
            peer.socket.on('error', function() {
              // don't throw
            });
          } else {
            peer.socket.onopen = handleOpen;
            peer.socket.onmessage = function peer_socket_onmessage(event) {
              handleMessage(event.data);
            };
          }
        },poll:function (sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? (64 | 1) : 0;
          }
  
          var mask = 0;
          var dest = sock.type === 1 ?  // we only care about the socket state for connection-based sockets
            SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) :
            null;
  
          if (sock.recv_queue.length ||
              !dest ||  // connection-less sockets are always ready to read
              (dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {  // let recv return 0 once closed
            mask |= (64 | 1);
          }
  
          if (!dest ||  // connection-less sockets are always ready to write
              (dest && dest.socket.readyState === dest.socket.OPEN)) {
            mask |= 4;
          }
  
          if ((dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {
            mask |= 16;
          }
  
          return mask;
        },ioctl:function (sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0;
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length;
              }
              HEAP32[((arg)>>2)]=bytes;
              return 0;
            default:
              return ERRNO_CODES.EINVAL;
          }
        },close:function (sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close();
            } catch (e) {
            }
            sock.server = null;
          }
          // close any peer connections
          var peers = Object.keys(sock.peers);
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]];
            try {
              peer.socket.close();
            } catch (e) {
            }
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          }
          return 0;
        },bind:function (sock, addr, port) {
          if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already bound
          }
          sock.saddr = addr;
          sock.sport = port || _mkport();
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close();
              sock.server = null;
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0);
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e;
              if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
            }
          }
        },connect:function (sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(ERRNO_CODS.EOPNOTSUPP);
          }
  
          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }
  
          // early out if we're already connected / in the middle of connecting
          if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
              } else {
                throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
              }
            }
          }
  
          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          sock.daddr = peer.addr;
          sock.dport = peer.port;
  
          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
        },listen:function (sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
          if (sock.server) {
             throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already listening
          }
          var WebSocketServer = require('ws').Server;
          var host = sock.saddr;
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport
            // TODO support backlog
          });
  
          sock.server.on('connection', function(ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
  
              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
              newsock.daddr = peer.addr;
              newsock.dport = peer.port;
  
              // push to queue for accept to pick up
              sock.pending.push(newsock);
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws);
            }
          });
          sock.server.on('closed', function() {
            sock.server = null;
          });
          sock.server.on('error', function() {
            // don't throw
          });
        },accept:function (listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          var newsock = listensock.pending.shift();
          newsock.stream.flags = listensock.stream.flags;
          return newsock;
        },getname:function (sock, peer) {
          var addr, port;
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            }
            addr = sock.daddr;
            port = sock.dport;
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0;
            port = sock.sport || 0;
          }
          return { addr: addr, port: port };
        },sendmsg:function (sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr;
              port = sock.dport;
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr;
            port = sock.dport;
          }
  
          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
  
          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          var data;
          if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
            data = buffer.slice(offset, offset + length);
          } else {  // ArrayBufferView
            data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
          }
  
          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
              }
              dest.dgram_send_queue.push(data);
              return length;
            }
          }
  
          try {
            // send the actual data
            dest.socket.send(data);
            return length;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
        },recvmsg:function (sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          }
  
          var queued = sock.recv_queue.shift();
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
  
              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
              }
              else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                // return null if the socket has closed
                return null;
              }
              else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
  
          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length;
          var queuedOffset = queued.data.byteOffset || 0;
          var queuedBuffer = queued.data.buffer || queued.data;
          var bytesRead = Math.min(length, queuedLength);
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port
          };
  
  
          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead;
            queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
            sock.recv_queue.unshift(queued);
          }
  
          return res;
        }}};function _send(fd, buf, len, flags) {
      var sock = SOCKFS.getSocket(fd);
      if (!sock) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      // TODO honor flags
      return _write(fd, buf, len);
    }
  
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
  
  
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }
  
  function _fileno(stream) {
      // int fileno(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fileno.html
      return FS.getStreamFromPtr(stream).fd;
    }function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var fd = _fileno(stream);
      var bytesWritten = _write(fd, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        var streamObj = FS.getStreamFromPtr(stream);
        if (streamObj) streamObj.error = true;
        return 0;
      } else {
        return Math.floor(bytesWritten / size);
      }
    }
  
  
   
  Module["_strlen"] = _strlen;
  
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = HEAPF64[(((varargs)+(argIndex))>>3)];
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+8))>>2)]];
          argIndex += 8; // each 32-bit chunk is in a 64-bit block
  
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Math.max(Runtime.getNativeFieldSize(type), Runtime.getAlignSize(type, null, true));
        return ret;
      }
  
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[(textIndex)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)|0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          var flagPadSign = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              case 32:
                flagPadSign = true;
                break;
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          }
  
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)|0)];
            }
          }
  
          // Handle precision.
          var precisionSet = false, precision = -1;
          if (next == 46) {
            precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)|0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)|0)];
          }
          if (precision === -1) {
            precision = 6; // Standard default.
            precisionSet = false;
          }
  
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)|0)];
  
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
  
              // Add sign if needed
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  prefix = '+' + prefix;
                } else if (flagPadSign) {
                  prefix = ' ' + prefix;
                }
              }
  
              // Move sign to prefix so we zero-pad after the sign
              if (argText.charAt(0) == '-') {
                prefix = '-' + prefix;
                argText = argText.substr(1);
              }
  
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
  
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
  
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
  
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
  
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
  
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
  
                // Add sign.
                if (currArg >= 0) {
                  if (flagAlwaysSigned) {
                    argText = '+' + argText;
                  } else if (flagPadSign) {
                    argText = ' ' + argText;
                  }
                }
              }
  
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
  
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
  
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)|0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length;
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[(i)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }function _fprintf(stream, format, varargs) {
      // int fprintf(FILE *restrict stream, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var stack = Runtime.stackSave();
      var ret = _fwrite(allocate(result, 'i8', ALLOC_STACK), 1, result.length, stream);
      Runtime.stackRestore(stack);
      return ret;
    }function _printf(format, varargs) {
      // int printf(const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var stdout = HEAP32[((_stdout)>>2)];
      return _fprintf(stdout, format, varargs);
    }

  function _llvm_umul_with_overflow_i32(x, y) {
      x = x>>>0;
      y = y>>>0;
      return ((asm["setTempRet0"](x*y > 4294967295),(x*y)>>>0)|0);
    }

  var _sin=Math_sin;

  
  function _fputs(s, stream) {
      // int fputs(const char *restrict s, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fputs.html
      var fd = _fileno(stream);
      return _write(fd, s, _strlen(s));
    }
  
  function _fputc(c, stream) {
      // int fputc(int c, FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fputc.html
      var chr = unSign(c & 0xFF);
      HEAP8[((_fputc.ret)|0)]=chr;
      var fd = _fileno(stream);
      var ret = _write(fd, _fputc.ret, 1);
      if (ret == -1) {
        var streamObj = FS.getStreamFromPtr(stream);
        if (streamObj) streamObj.error = true;
        return -1;
      } else {
        return chr;
      }
    }function _puts(s) {
      // int puts(const char *s);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/puts.html
      // NOTE: puts() always writes an extra newline.
      var stdout = HEAP32[((_stdout)>>2)];
      var ret = _fputs(s, stdout);
      if (ret < 0) {
        return ret;
      } else {
        var newlineRet = _fputc(10, stdout);
        return (newlineRet < 0) ? -1 : ret + 1;
      }
    }

  
   
  Module["_memset"] = _memset;var _llvm_memset_p0i8_i64=_memset;

  function _rint(x) {
      if (Math.abs(x % 1) !== 0.5) return Math.round(x);
      return x + x % 2 + ((x < 0) ? 1 : -1);
    }

  var _log=Math_log;

  var _cos=Math_cos;

  var _llvm_memset_p0i8_i32=_memset;

  
   
  Module["_memmove"] = _memmove;var _llvm_memmove_p0i8_p0i8_i32=_memmove;

  var _exp=Math_exp;

  var _sqrt=Math_sqrt;

  function _qsort(base, num, size, cmp) {
      if (num == 0 || size == 0) return;
      // forward calls to the JavaScript sort method
      // first, sort the items logically
      var keys = [];
      for (var i = 0; i < num; i++) keys.push(i);
      keys.sort(function(a, b) {
        return Module['dynCall_iii'](cmp, base+a*size, base+b*size);
      });
      // apply the sort
      var temp = _malloc(num*size);
      _memcpy(temp, base, num*size);
      for (var i = 0; i < num; i++) {
        if (keys[i] == i) continue; // already in place
        _memcpy(base+i*size, temp+keys[i]*size, size);
      }
      _free(temp);
    }

  var _atan=Math_atan;

  var _floor=Math_floor;

  var _ceil=Math_ceil;

  var _fabsf=Math_abs;


   
  Module["_strcpy"] = _strcpy;

   
  Module["_strcat"] = _strcat;

  
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }

  var _llvm_pow_f64=Math_pow;

  var _rintf=_rint;

  function ___errno_location() {
      return ___errno_state;
    }

  function __ZNSt9exceptionD2Ev() {}

  function _abort() {
      Module['abort']();
    }

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }

  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: return 1;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }
  
  
  
  function ___cxa_is_number_type(type) {
      var isNumber = false;
      try { if (type == __ZTIi) isNumber = true } catch(e){}
      try { if (type == __ZTIj) isNumber = true } catch(e){}
      try { if (type == __ZTIl) isNumber = true } catch(e){}
      try { if (type == __ZTIm) isNumber = true } catch(e){}
      try { if (type == __ZTIx) isNumber = true } catch(e){}
      try { if (type == __ZTIy) isNumber = true } catch(e){}
      try { if (type == __ZTIf) isNumber = true } catch(e){}
      try { if (type == __ZTId) isNumber = true } catch(e){}
      try { if (type == __ZTIe) isNumber = true } catch(e){}
      try { if (type == __ZTIc) isNumber = true } catch(e){}
      try { if (type == __ZTIa) isNumber = true } catch(e){}
      try { if (type == __ZTIh) isNumber = true } catch(e){}
      try { if (type == __ZTIs) isNumber = true } catch(e){}
      try { if (type == __ZTIt) isNumber = true } catch(e){}
      return isNumber;
    }function ___cxa_does_inherit(definiteType, possibilityType, possibility) {
      if (possibility == 0) return false;
      if (possibilityType == 0 || possibilityType == definiteType)
        return true;
      var possibility_type_info;
      if (___cxa_is_number_type(possibilityType)) {
        possibility_type_info = possibilityType;
      } else {
        var possibility_type_infoAddr = HEAP32[((possibilityType)>>2)] - 8;
        possibility_type_info = HEAP32[((possibility_type_infoAddr)>>2)];
      }
      switch (possibility_type_info) {
      case 0: // possibility is a pointer
        // See if definite type is a pointer
        var definite_type_infoAddr = HEAP32[((definiteType)>>2)] - 8;
        var definite_type_info = HEAP32[((definite_type_infoAddr)>>2)];
        if (definite_type_info == 0) {
          // Also a pointer; compare base types of pointers
          var defPointerBaseAddr = definiteType+8;
          var defPointerBaseType = HEAP32[((defPointerBaseAddr)>>2)];
          var possPointerBaseAddr = possibilityType+8;
          var possPointerBaseType = HEAP32[((possPointerBaseAddr)>>2)];
          return ___cxa_does_inherit(defPointerBaseType, possPointerBaseType, possibility);
        } else
          return false; // one pointer and one non-pointer
      case 1: // class with no base class
        return false;
      case 2: // class with base class
        var parentTypeAddr = possibilityType + 8;
        var parentType = HEAP32[((parentTypeAddr)>>2)];
        return ___cxa_does_inherit(definiteType, parentType, possibility);
      default:
        return false; // some unencountered type
      }
    }
  
  function ___resumeException(ptr) {
      if (!___cxa_last_thrown_exception) { ___cxa_last_thrown_exception = ptr; }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }
  
  var ___cxa_last_thrown_exception=0;
  
  var ___cxa_exception_header_size=8;function ___cxa_find_matching_catch(thrown, throwntype) {
      if (thrown == -1) thrown = ___cxa_last_thrown_exception;
      header = thrown - ___cxa_exception_header_size;
      if (throwntype == -1) throwntype = HEAP32[((header)>>2)];
      var typeArray = Array.prototype.slice.call(arguments, 2);
  
      // If throwntype is a pointer, this means a pointer has been
      // thrown. When a pointer is thrown, actually what's thrown
      // is a pointer to the pointer. We'll dereference it.
      if (throwntype != 0 && !___cxa_is_number_type(throwntype)) {
        var throwntypeInfoAddr= HEAP32[((throwntype)>>2)] - 8;
        var throwntypeInfo= HEAP32[((throwntypeInfoAddr)>>2)];
        if (throwntypeInfo == 0)
          thrown = HEAP32[((thrown)>>2)];
      }
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (___cxa_does_inherit(typeArray[i], throwntype, thrown))
          return ((asm["setTempRet0"](typeArray[i]),thrown)|0);
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      return ((asm["setTempRet0"](throwntype),thrown)|0);
    }function ___gxx_personality_v0() {
    }

  function ___cxa_allocate_exception(size) {
      var ptr = _malloc(size + ___cxa_exception_header_size);
      return ptr + ___cxa_exception_header_size;
    }

  function ___cxa_throw(ptr, type, destructor) {
      if (!___cxa_throw.initialized) {
        try {
          HEAP32[((__ZTVN10__cxxabiv119__pointer_type_infoE)>>2)]=0; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv117__class_type_infoE)>>2)]=1; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv120__si_class_type_infoE)>>2)]=2; // Workaround for libcxxabi integration bug
        } catch(e){}
        ___cxa_throw.initialized = true;
      }
      var header = ptr - ___cxa_exception_header_size;
      HEAP32[((header)>>2)]=type;
      HEAP32[(((header)+(4))>>2)]=destructor;
      ___cxa_last_thrown_exception = ptr;
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }

  function ___cxa_call_unexpected(exception) {
      Module.printErr('Unexpected exception thrown, this is not properly supported - aborting');
      ABORT = true;
      throw exception;
    }






  var Browser={mainLoop:{scheduler:null,method:"",shouldPause:false,paused:false,queue:[],pause:function () {
          Browser.mainLoop.shouldPause = true;
        },resume:function () {
          if (Browser.mainLoop.paused) {
            Browser.mainLoop.paused = false;
            Browser.mainLoop.scheduler();
          }
          Browser.mainLoop.shouldPause = false;
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted || ENVIRONMENT_IS_WORKER) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                    canvas['mozRequestPointerLock'] ||
                                    canvas['webkitRequestPointerLock'];
        canvas.exitPointerLock = document['exitPointerLock'] ||
                                 document['mozExitPointerLock'] ||
                                 document['webkitExitPointerLock'] ||
                                 function(){}; // no-op if function does not exist
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas;
        }
  
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
  
        if (Module['elementPointerLock']) {
          canvas.addEventListener("click", function(ev) {
            if (!Browser.pointerLock && canvas.requestPointerLock) {
              canvas.requestPointerLock();
              ev.preventDefault();
            }
          }, false);
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        var ctx;
        try {
          if (useWebGL) {
            var contextAttributes = {
              antialias: false,
              alpha: false
            };
  
            if (webGLContextAttributes) {
              for (var attribute in webGLContextAttributes) {
                contextAttributes[attribute] = webGLContextAttributes[attribute];
              }
            }
  
  
            var errorInfo = '?';
            function onContextCreationError(event) {
              errorInfo = event.statusMessage || errorInfo;
            }
            canvas.addEventListener('webglcontextcreationerror', onContextCreationError, false);
            try {
              ['experimental-webgl', 'webgl'].some(function(webglId) {
                return ctx = canvas.getContext(webglId, contextAttributes);
              });
            } finally {
              canvas.removeEventListener('webglcontextcreationerror', onContextCreationError, false);
            }
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas: ' + [errorInfo, e]);
          return null;
        }
        if (useWebGL) {
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
  
          // Warn on context loss
          canvas.addEventListener('webglcontextlost', function(event) {
            alert('WebGL context lost. You will need to reload the page.');
          }, false);
        }
        if (setInModule) {
          GLctx = Module.ctx = ctx;
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement']) === canvas) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'];
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else if (Browser.resizeCanvas){
            Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
        }
  
        canvas.requestFullScreen = canvas['requestFullScreen'] ||
                                   canvas['mozRequestFullScreen'] ||
                                   (canvas['webkitRequestFullScreen'] ? function() { canvas['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvas.requestFullScreen();
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          setTimeout(func, 1000/60);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           window['setTimeout'];
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        return Math.max(-1, Math.min(1, event.type === 'DOMMouseScroll' ? event.detail : -event.wheelDelta));
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var x, y;
          
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          if (event.type == 'touchstart' ||
              event.type == 'touchend' ||
              event.type == 'touchmove') {
            var t = event.touches.item(0);
            if (t) {
              x = t.pageX - (scrollX + rect.left);
              y = t.pageY - (scrollY + rect.top);
            } else {
              return;
            }
          } else {
            x = event.pageX - (scrollX + rect.left);
            y = event.pageY - (scrollY + rect.top);
          }
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        canvas.width = width;
        canvas.height = height;
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        var canvas = Module['canvas'];
        this.windowedWidth = canvas.width;
        this.windowedHeight = canvas.height;
        canvas.width = screen.width;
        canvas.height = screen.height;
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        var canvas = Module['canvas'];
        canvas.width = this.windowedWidth;
        canvas.height = this.windowedHeight;
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      }};
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
__ATINIT__.push({ func: function() { SOCKFS.root = FS.mount(SOCKFS, {}, null); } });
_fputc.ret = allocate([0], "i8", ALLOC_STATIC);
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + 5242880;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var ctlz_i8 = allocate([8,7,6,6,5,5,5,5,4,4,4,4,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_DYNAMIC);
 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);

var Math_min = Math.min;
function invoke_viiiii(index,a1,a2,a3,a4,a5) {
  try {
    Module["dynCall_viiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiiiiiii(index,a1,a2,a3,a4,a5,a6,a7,a8) {
  try {
    return Module["dynCall_iiiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7,a8);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiiii(index,a1,a2,a3,a4,a5) {
  try {
    return Module["dynCall_iiiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiii(index,a1,a2,a3,a4) {
  try {
    Module["dynCall_viiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function asmPrintInt(x, y) {
  Module.print('int ' + x + ',' + y);// + ' ' + new Error().stack);
}
function asmPrintFloat(x, y) {
  Module.print('float ' + x + ',' + y);// + ' ' + new Error().stack);
}
// EMSCRIPTEN_START_ASM
var asm=(function(global,env,buffer){"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.STACKTOP|0;var j=env.STACK_MAX|0;var k=env.tempDoublePtr|0;var l=env.ABORT|0;var m=env.cttz_i8|0;var n=env.ctlz_i8|0;var o=env.___rand_seed|0;var p=env.__ZTVN10__cxxabiv120__si_class_type_infoE|0;var q=env.__ZTVN10__cxxabiv117__class_type_infoE|0;var r=+env.NaN;var s=+env.Infinity;var t=0;var u=0;var v=0;var w=0;var x=0,y=0,z=0,A=0,B=0.0,C=0,D=0,E=0,F=0.0;var G=0;var H=0;var I=0;var J=0;var K=0;var L=0;var M=0;var N=0;var O=0;var P=0;var Q=global.Math.floor;var R=global.Math.abs;var S=global.Math.sqrt;var T=global.Math.pow;var U=global.Math.cos;var V=global.Math.sin;var W=global.Math.tan;var X=global.Math.acos;var Y=global.Math.asin;var Z=global.Math.atan;var _=global.Math.atan2;var $=global.Math.exp;var aa=global.Math.log;var ba=global.Math.ceil;var ca=global.Math.imul;var da=env.abort;var ea=env.assert;var fa=env.asmPrintInt;var ga=env.asmPrintFloat;var ha=env.min;var ia=env.invoke_viiiii;var ja=env.invoke_vi;var ka=env.invoke_vii;var la=env.invoke_ii;var ma=env.invoke_iiii;var na=env.invoke_viii;var oa=env.invoke_v;var pa=env.invoke_iiiiiiiii;var qa=env.invoke_iiiii;var ra=env.invoke_viiiiii;var sa=env.invoke_iii;var ta=env.invoke_iiiiii;var ua=env.invoke_viiii;var va=env._fabsf;var wa=env._sysconf;var xa=env._rint;var ya=env.___cxa_throw;var za=env._srand;var Aa=env._abort;var Ba=env._fprintf;var Ca=env._sqrt;var Da=env._printf;var Ea=env._fflush;var Fa=env.__reallyNegative;var Ga=env._fputc;var Ha=env._log;var Ia=env._puts;var Ja=env._floor;var Ka=env.___setErrNo;var La=env._fwrite;var Ma=env._qsort;var Na=env._send;var Oa=env._write;var Pa=env._fputs;var Qa=env._llvm_umul_with_overflow_i32;var Ra=env._exit;var Sa=env.___cxa_find_matching_catch;var Ta=env.___cxa_allocate_exception;var Ua=env._sin;var Va=env._atan;var Wa=env.__ZSt18uncaught_exceptionv;var Xa=env.___cxa_is_number_type;var Ya=env.___resumeException;var Za=env.__formatString;var _a=env.___cxa_does_inherit;var $a=env._ceil;var ab=env._emscripten_memcpy_big;var bb=env._fileno;var cb=env._cos;var db=env._pwrite;var eb=env._llvm_pow_f64;var fb=env.__ZNSt9exceptionD2Ev;var gb=env.___errno_location;var hb=env.___gxx_personality_v0;var ib=env.___cxa_call_unexpected;var jb=env._mkport;var kb=env._sbrk;var lb=env._exp;var mb=env._time;var nb=env.__exit;var ob=0.0;
// EMSCRIPTEN_START_FUNCS
function Cb(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+7&-8;return b|0}function Db(){return i|0}function Eb(a){a=a|0;i=a}function Fb(a,b){a=a|0;b=b|0;if((t|0)==0){t=a;u=b}}function Gb(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0]}function Hb(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0];a[k+4|0]=a[b+4|0];a[k+5|0]=a[b+5|0];a[k+6|0]=a[b+6|0];a[k+7|0]=a[b+7|0]}function Ib(a){a=a|0;G=a}function Jb(a){a=a|0;H=a}function Kb(a){a=a|0;I=a}function Lb(a){a=a|0;J=a}function Mb(a){a=a|0;K=a}function Nb(a){a=a|0;L=a}function Ob(a){a=a|0;M=a}function Pb(a){a=a|0;N=a}function Qb(a){a=a|0;O=a}function Rb(a){a=a|0;P=a}function Sb(){c[59162]=q+8;c[59164]=q+8;c[59166]=p+8;c[59170]=p+8;c[59174]=p+8;c[59178]=p+8}function Tb(a,b){a=a|0;b=+b;var d=0,e=0,f=0,g=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;d=i;i=i+112|0;e=d|0;f=d+32|0;g=d+64|0;j=d+96|0;k=dg(696)|0;l=k;og(k|0,0,696)|0;za(mb(0)|0);m=k;pf(m,mg()|0)|0;c[k+672>>2]=2;n=k+676|0;c[n>>2]=a;o=k+692|0;c[o>>2]=eg(3145728)|0;Da(172248,(p=i,i=i+16|0,c[p>>2]=a,h[p+8>>3]=b,p)|0)|0;i=p;c[k+684>>2]=0;p=k+688|0;c[p>>2]=0;a=k+360|0;pd(a);if((mf(a,2,c[n>>2]|0,b)|0)!=0){Ia(55928)|0;q=0;i=d;return q|0}n=k+392|0;ld(n);nd(n,172232,172216);r=k+408|0;wc(r,a)|0;sc(r,k+520|0)|0;sd(r,n,e,f,g)|0;wf(m,e)|0;wf(m,f)|0;wf(m,g)|0;if((xf(m,j)|0)==0){q=l;i=d;return q|0}g=j|0;f=j+4|0;e=j+8|0;n=j+12|0;while(1){kg((c[o>>2]|0)+(c[p>>2]|0)|0,c[g>>2]|0,c[f>>2]|0)|0;r=(c[p>>2]|0)+(c[f>>2]|0)|0;c[p>>2]=r;kg((c[o>>2]|0)+r|0,c[e>>2]|0,c[n>>2]|0)|0;c[p>>2]=(c[p>>2]|0)+(c[n>>2]|0);if((xf(m,j)|0)==0){q=l;break}}i=d;return q|0}function Ub(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;f=i;i=i+16|0;h=f|0;j=a+408|0;k=zc(j,e)|0;if((e|0)>0){l=c[k>>2]|0;m=c[k+4>>2]|0;k=0;do{g[l+(k<<2)>>2]=+g[b+(k<<2)>>2];g[m+(k<<2)>>2]=+g[d+(k<<2)>>2];k=k+1|0;}while((k|0)<(e|0))}Ac(j,e)|0;e=a+520|0;if((Cc(j,e)|0)!=1){i=f;return}k=a+632|0;d=a|0;m=a+644|0;b=a+692|0;l=a+688|0;a=h|0;n=h+4|0;o=h+8|0;p=h+12|0;do{Pc(e,0)|0;Ve(e)|0;if((We(j,k)|0)!=0){do{wf(d,k)|0;while(1){if((zf(d,h)|0)==0){if((c[m>>2]|0)==0){break}if((xf(d,h)|0)==0){break}}kg((c[b>>2]|0)+(c[l>>2]|0)|0,c[a>>2]|0,c[n>>2]|0)|0;q=(c[l>>2]|0)+(c[n>>2]|0)|0;c[l>>2]=q;kg((c[b>>2]|0)+q|0,c[o>>2]|0,c[p>>2]|0)|0;c[l>>2]=(c[l>>2]|0)+(c[p>>2]|0)}}while((We(j,k)|0)!=0)}}while((Cc(j,e)|0)==1);i=f;return}function Vb(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;b=i;i=i+16|0;d=b|0;Ia(55888)|0;e=a+408|0;Ac(e,0)|0;f=a+520|0;if((Cc(e,f)|0)==1){g=a+632|0;h=a|0;j=a+692|0;k=a+688|0;l=d|0;m=d+4|0;n=d+8|0;o=d+12|0;while(1){Pc(f,0)|0;Ve(f)|0;if((We(e,g)|0)!=0){do{wf(h,g)|0;if((xf(h,d)|0)!=0){do{kg((c[j>>2]|0)+(c[k>>2]|0)|0,c[l>>2]|0,c[m>>2]|0)|0;p=(c[k>>2]|0)+(c[m>>2]|0)|0;c[k>>2]=p;kg((c[j>>2]|0)+p|0,c[n>>2]|0,c[o>>2]|0)|0;c[k>>2]=(c[k>>2]|0)+(c[o>>2]|0);}while((xf(h,d)|0)!=0)}}while((We(e,g)|0)!=0)}if((Cc(e,f)|0)!=1){q=k;r=h;break}}}else{q=a+688|0;r=a|0}Da(172088,(h=i,i=i+8|0,c[h>>2]=c[q>>2],h)|0)|0;i=h;Ia(55848)|0;qf(r)|0;vc(f)|0;yc(e);od(a+392|0);qd(a+360|0);i=b;return}function Wb(a){a=a|0;return c[a+692>>2]|0}function Xb(a){a=a|0;return c[a+688>>2]|0}function Yb(){var a=0,b=0,d=0,e=0,f=0,h=0,i=0.0;a=Tb(48e3,.4000000059604645)|0;b=c[a+676>>2]|0;d=Qa(b|0,4)|0;e=G?-1:d;d=eg(e)|0;f=eg(e)|0;if((b|0)>0){h=0}else{Ub(a,d,f,b);Vb(a);return}do{i=+V(+(h|0)/+(b|0)*2513.2741228718346);g[d+(h<<2)>>2]=i;g[f+(h<<2)>>2]=i;h=h+1|0;}while((h|0)<(b|0));Ub(a,d,f,b);Vb(a);return}function Zb(a){a=a|0;var b=0,d=0,e=0,f=0,h=0,j=0,k=0.0;b=i;d=a+676|0;e=c[a+672>>2]|0;Da(172008,(f=i,i=i+16|0,c[f>>2]=c[d>>2],c[f+8>>2]=e,f)|0)|0;i=f;f=c[d>>2]|0;d=Qa(f|0,4)|0;e=G?-1:d;d=eg(e)|0;h=eg(e)|0;if((f|0)>0){j=0}else{Ub(a,d,h,f);i=b;return}do{k=+V(+(j|0)/+(f|0)*2513.2741228718346);g[d+(j<<2)>>2]=k;g[h+(j<<2)>>2]=k;j=j+1|0;}while((j|0)<(f|0));Ub(a,d,h,f);i=b;return}function _b(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,h=0,i=0.0,j=0,k=0.0,l=0,m=0.0,n=0.0,o=0,p=0.0,q=0,r=0,s=0,t=0;d=(b|0)/4|0;e=Zf(d<<2)|0;f=Zf(d+b<<2)|0;h=b>>1;i=+(b|0);j=~~+xa(+(+aa(i)/.6931471805599453));c[a+4>>2]=j;c[a>>2]=b;c[a+8>>2]=f;c[a+12>>2]=e;if((b|0)<=3){k=4.0/i;l=a+16|0;g[l>>2]=k;return}m=3.141592653589793/+(b|0);n=3.141592653589793/+(b<<1|0);o=0;do{p=+(o<<2|0)*m;q=o<<1;g[f+(q<<2)>>2]=+U(p);r=q|1;g[f+(r<<2)>>2]=-0.0- +V(p);p=+(r|0)*n;r=q+h|0;g[f+(r<<2)>>2]=+U(p);g[f+(r+1<<2)>>2]=+V(p);o=o+1|0;}while((o|0)<(d|0));d=(b|0)/8|0;o=(b|0)>7;if(!o){k=4.0/i;l=a+16|0;g[l>>2]=k;return}n=3.141592653589793/+(b|0);h=0;do{m=+(h<<2|2|0)*n;r=(h<<1)+b|0;g[f+(r<<2)>>2]=+U(m)*.5;g[f+(r+1<<2)>>2]=+V(m)*-.5;h=h+1|0;}while((h|0)<(d|0));h=(1<<j-1)-1|0;f=1<<j-2;if(o){s=0}else{k=4.0/i;l=a+16|0;g[l>>2]=k;return}do{o=0;j=0;b=f;while(1){if((b&s|0)==0){t=j}else{t=j|1<<o}r=o+1|0;q=f>>r;if((q|0)==0){break}else{o=r;j=t;b=q}}b=s<<1;c[e+(b<<2)>>2]=(h&~t)-1;c[e+((b|1)<<2)>>2]=t;s=s+1|0;}while((s|0)<(d|0));k=4.0/i;l=a+16|0;g[l>>2]=k;return}function $b(a){a=a|0;var b=0;if((a|0)==0){return}b=c[a+8>>2]|0;if((b|0)!=0){_f(b)}b=c[a+12>>2]|0;if((b|0)!=0){_f(b)}og(a|0,0,20)|0;return}function ac(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0.0,v=0,w=0;e=a|0;f=c[e>>2]|0;h=f>>1;i=f>>2;f=d+(h+i<<2)|0;j=a+8|0;k=c[j>>2]|0;l=k+(i<<2)|0;m=l;n=f;o=b+(h-7<<2)|0;while(1){p=n-16|0;q=o+8|0;r=m+12|0;s=m+8|0;g[p>>2]=+g[r>>2]*(-0.0- +g[q>>2])- +g[o>>2]*+g[s>>2];g[n-12>>2]=+g[o>>2]*+g[r>>2]- +g[q>>2]*+g[s>>2];s=o+24|0;q=m+4|0;r=o+16|0;g[n-8>>2]=+g[q>>2]*(-0.0- +g[s>>2])- +g[r>>2]*+g[m>>2];g[n-4>>2]=+g[r>>2]*+g[q>>2]- +g[s>>2]*+g[m>>2];s=o-32|0;if(s>>>0<b>>>0){break}else{m=m+16|0;n=p;o=s}}o=d+(h<<2)|0;n=l;l=f;m=b+(h-8<<2)|0;while(1){s=n-16|0;p=m+16|0;q=n-4|0;r=m+24|0;t=n-8|0;g[l>>2]=+g[p>>2]*+g[q>>2]+ +g[r>>2]*+g[t>>2];g[l+4>>2]=+g[p>>2]*+g[t>>2]- +g[r>>2]*+g[q>>2];q=n-12|0;r=m+8|0;g[l+8>>2]=+g[m>>2]*+g[q>>2]+ +g[r>>2]*+g[s>>2];g[l+12>>2]=+g[m>>2]*+g[s>>2]- +g[r>>2]*+g[q>>2];q=m-32|0;if(q>>>0<b>>>0){break}else{n=s;l=l+16|0;m=q}}bc(c[a+4>>2]|0,k,o,h);cc(c[e>>2]|0,c[j>>2]|0,c[a+12>>2]|0,d);a=d;e=f;k=f;m=(c[j>>2]|0)+(h<<2)|0;while(1){h=k-16|0;j=m+4|0;l=a+4|0;g[k-4>>2]=+g[a>>2]*+g[j>>2]- +g[l>>2]*+g[m>>2];g[e>>2]=-0.0-(+g[a>>2]*+g[m>>2]+ +g[l>>2]*+g[j>>2]);j=a+8|0;l=m+12|0;n=a+12|0;b=m+8|0;g[k-8>>2]=+g[j>>2]*+g[l>>2]- +g[n>>2]*+g[b>>2];g[e+4>>2]=-0.0-(+g[j>>2]*+g[b>>2]+ +g[n>>2]*+g[l>>2]);l=a+16|0;n=m+20|0;b=a+20|0;j=m+16|0;g[k-12>>2]=+g[l>>2]*+g[n>>2]- +g[b>>2]*+g[j>>2];g[e+8>>2]=-0.0-(+g[l>>2]*+g[j>>2]+ +g[b>>2]*+g[n>>2]);n=a+24|0;b=m+28|0;j=a+28|0;l=m+24|0;g[h>>2]=+g[n>>2]*+g[b>>2]- +g[j>>2]*+g[l>>2];g[e+12>>2]=-0.0-(+g[n>>2]*+g[l>>2]+ +g[j>>2]*+g[b>>2]);b=a+32|0;if(b>>>0<h>>>0){a=b;e=e+16|0;k=h;m=m+32|0}else{break}}m=d+(i<<2)|0;i=f;d=m;k=m;while(1){m=k-16|0;e=i-16|0;u=+g[i-4>>2];g[k-4>>2]=u;g[d>>2]=-0.0-u;u=+g[i-8>>2];g[k-8>>2]=u;g[d+4>>2]=-0.0-u;u=+g[i-12>>2];g[k-12>>2]=u;g[d+8>>2]=-0.0-u;u=+g[e>>2];g[m>>2]=u;g[d+12>>2]=-0.0-u;a=d+16|0;if(a>>>0<e>>>0){i=e;d=a;k=m}else{v=f;w=f;break}}while(1){f=w-16|0;g[f>>2]=+g[v+12>>2];g[w-12>>2]=+g[v+8>>2];g[w-8>>2]=+g[v+4>>2];g[w-4>>2]=+g[v>>2];if(f>>>0>o>>>0){v=v+16|0;w=f}else{break}}return}function bc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0;if((a-6|0)>0){ec(b,c,d)}e=a-7|0;if((e|0)>0){a=1;f=e;while(1){e=1<<a;if((e|0)>0){g=d>>a;h=4<<a;i=0;do{fc(b,c+((ca(i,g)|0)<<2)|0,g,h);i=i+1|0;}while((i|0)<(e|0))}e=f-1|0;if((e|0)>0){a=a+1|0;f=e}else{break}}}if((d|0)>0){j=0}else{return}do{gc(c+(j<<2)|0);j=j+32|0;}while((j|0)<(d|0));return}function cc(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,h=0,i=0,j=0,k=0.0,l=0.0,m=0.0,n=0.0,o=0.0,p=0.0,q=0.0,r=0.0,s=0.0,t=0.0,u=0;f=a>>1;h=d;d=e;i=e+(f<<2)|0;j=b+(a<<2)|0;while(1){a=(c[h>>2]|0)+f|0;b=(c[h+4>>2]|0)+f|0;k=+g[e+(a+1<<2)>>2];l=+g[e+(b+1<<2)>>2];m=k-l;n=+g[e+(a<<2)>>2];o=+g[e+(b<<2)>>2];p=n+o;q=+g[j>>2];r=+g[j+4>>2];s=p*q+m*r;t=p*r-m*q;b=i-16|0;q=(k+l)*.5;l=(n-o)*.5;g[d>>2]=q+s;g[i-8>>2]=q-s;g[d+4>>2]=l+t;g[i-4>>2]=t-l;a=(c[h+8>>2]|0)+f|0;u=(c[h+12>>2]|0)+f|0;l=+g[e+(a+1<<2)>>2];t=+g[e+(u+1<<2)>>2];s=l-t;q=+g[e+(a<<2)>>2];o=+g[e+(u<<2)>>2];n=q+o;k=+g[j+8>>2];m=+g[j+12>>2];r=n*k+s*m;p=n*m-s*k;k=(l+t)*.5;t=(q-o)*.5;g[d+8>>2]=k+r;g[b>>2]=k-r;g[d+12>>2]=t+p;g[i-12>>2]=p-t;u=d+16|0;if(u>>>0<b>>>0){h=h+16|0;d=u;i=b;j=j+16|0}else{break}}return}function dc(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0.0,C=0.0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;e=i;f=a|0;h=c[f>>2]|0;j=h>>1;k=h>>2;l=h>>3;m=i;i=i+(h<<2)|0;i=i+7&-8;n=m;m=n+(j<<2)|0;o=j+k|0;p=b+(o<<2)|0;q=a+8|0;r=c[q>>2]|0;s=r+(j<<2)|0;if((l|0)>0){t=(l-1|0)>>>1;u=t<<1;v=j-2-u|0;w=o-4-(t<<2)|0;t=p;x=b+(o+1<<2)|0;o=s;y=0;while(1){z=t-16|0;A=o-8|0;B=+g[t-8>>2]+ +g[x>>2];C=+g[z>>2]+ +g[x+8>>2];D=o-4|0;g[n+(y+j<<2)>>2]=C*+g[D>>2]+B*+g[A>>2];g[n+((y|1)+j<<2)>>2]=C*+g[A>>2]-B*+g[D>>2];D=y+2|0;if((D|0)<(l|0)){t=z;x=x+16|0;o=A;y=D}else{break}}E=b+(w<<2)|0;F=r+(v<<2)|0;G=u+2|0}else{E=p;F=s;G=0}s=b+4|0;p=j-l|0;if((G|0)<(p|0)){l=E;E=s;u=F;v=G;while(1){w=u-8|0;y=l-16|0;B=+g[l-8>>2]- +g[E>>2];C=+g[y>>2]- +g[E+8>>2];o=u-4|0;g[n+(v+j<<2)>>2]=C*+g[o>>2]+B*+g[w>>2];g[n+((v|1)+j<<2)>>2]=C*+g[w>>2]-B*+g[o>>2];o=E+16|0;x=v+2|0;if((x|0)<(p|0)){l=y;E=o;u=w;v=x}else{H=o;I=w;J=x;break}}}else{H=s;I=F;J=G}if((J|0)<(j|0)){G=b+(h<<2)|0;h=H;H=I;I=J;while(1){J=H-8|0;b=G-16|0;B=-0.0- +g[G-8>>2]- +g[h>>2];C=-0.0- +g[b>>2]- +g[h+8>>2];F=H-4|0;g[n+(I+j<<2)>>2]=C*+g[F>>2]+B*+g[J>>2];g[n+((I|1)+j<<2)>>2]=C*+g[J>>2]-B*+g[F>>2];F=I+2|0;if((F|0)<(j|0)){G=b;h=h+16|0;H=J;I=F}else{break}}}bc(c[a+4>>2]|0,r,m,j);cc(c[f>>2]|0,c[q>>2]|0,c[a+12>>2]|0,n);if((k|0)<=0){i=e;return}f=a+16|0;a=n;n=d+(j<<2)|0;m=(c[q>>2]|0)+(j<<2)|0;j=0;while(1){q=n-4|0;r=a+4|0;I=m+4|0;g[d+(j<<2)>>2]=+g[f>>2]*(+g[a>>2]*+g[m>>2]+ +g[r>>2]*+g[I>>2]);g[q>>2]=+g[f>>2]*(+g[a>>2]*+g[I>>2]- +g[r>>2]*+g[m>>2]);r=j+1|0;if((r|0)<(k|0)){a=a+8|0;n=q;m=m+8|0;j=r}else{break}}i=e;return}function ec(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0.0,h=0,i=0.0,j=0.0,k=0,l=0.0,m=0,n=0.0;d=a;a=b+(c-8<<2)|0;e=b+((c>>1)-8<<2)|0;while(1){c=a+24|0;f=+g[c>>2];h=e+24|0;i=+g[h>>2];j=f-i;k=a+28|0;l=+g[k>>2];m=e+28|0;n=l- +g[m>>2];g[c>>2]=f+i;g[k>>2]=+g[m>>2]+l;k=d+4|0;g[h>>2]=n*+g[k>>2]+j*+g[d>>2];g[m>>2]=n*+g[d>>2]-j*+g[k>>2];k=a+16|0;j=+g[k>>2];m=e+16|0;n=+g[m>>2];l=j-n;h=a+20|0;i=+g[h>>2];c=e+20|0;f=i- +g[c>>2];g[k>>2]=j+n;g[h>>2]=+g[c>>2]+i;h=d+20|0;k=d+16|0;g[m>>2]=f*+g[h>>2]+l*+g[k>>2];g[c>>2]=f*+g[k>>2]-l*+g[h>>2];h=a+8|0;l=+g[h>>2];k=e+8|0;f=+g[k>>2];i=l-f;c=a+12|0;n=+g[c>>2];m=e+12|0;j=n- +g[m>>2];g[h>>2]=l+f;g[c>>2]=+g[m>>2]+n;c=d+36|0;h=d+32|0;g[k>>2]=j*+g[c>>2]+i*+g[h>>2];g[m>>2]=j*+g[h>>2]-i*+g[c>>2];i=+g[a>>2];j=+g[e>>2];n=i-j;c=a+4|0;f=+g[c>>2];h=e+4|0;l=f- +g[h>>2];g[a>>2]=i+j;g[c>>2]=+g[h>>2]+f;c=d+52|0;m=d+48|0;g[e>>2]=l*+g[c>>2]+n*+g[m>>2];g[h>>2]=l*+g[m>>2]-n*+g[c>>2];c=e-32|0;if(c>>>0<b>>>0){break}else{d=d+64|0;a=a-32|0;e=c}}return}function fc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0.0,o=0,p=0.0,q=0.0,r=0,s=0.0,t=0,u=0.0,v=0;e=d+1|0;f=d<<1;h=f|1;i=f+d|0;j=i+1|0;k=i+d|0;l=a;a=b+(c-8<<2)|0;m=b+((c>>1)-8<<2)|0;while(1){c=a+24|0;n=+g[c>>2];o=m+24|0;p=+g[o>>2];q=n-p;r=a+28|0;s=+g[r>>2];t=m+28|0;u=s- +g[t>>2];g[c>>2]=n+p;g[r>>2]=+g[t>>2]+s;r=l+4|0;g[o>>2]=u*+g[r>>2]+q*+g[l>>2];g[t>>2]=u*+g[l>>2]-q*+g[r>>2];r=l+(d<<2)|0;t=a+16|0;q=+g[t>>2];o=m+16|0;u=+g[o>>2];s=q-u;c=a+20|0;p=+g[c>>2];v=m+20|0;n=p- +g[v>>2];g[t>>2]=q+u;g[c>>2]=+g[v>>2]+p;c=l+(e<<2)|0;g[o>>2]=n*+g[c>>2]+s*+g[r>>2];g[v>>2]=n*+g[r>>2]-s*+g[c>>2];c=l+(f<<2)|0;r=a+8|0;s=+g[r>>2];v=m+8|0;n=+g[v>>2];p=s-n;o=a+12|0;u=+g[o>>2];t=m+12|0;q=u- +g[t>>2];g[r>>2]=s+n;g[o>>2]=+g[t>>2]+u;o=l+(h<<2)|0;g[v>>2]=q*+g[o>>2]+p*+g[c>>2];g[t>>2]=q*+g[c>>2]-p*+g[o>>2];o=l+(i<<2)|0;p=+g[a>>2];q=+g[m>>2];u=p-q;c=a+4|0;n=+g[c>>2];t=m+4|0;s=n- +g[t>>2];g[a>>2]=p+q;g[c>>2]=+g[t>>2]+n;c=l+(j<<2)|0;g[m>>2]=s*+g[c>>2]+u*+g[o>>2];g[t>>2]=s*+g[o>>2]-u*+g[c>>2];c=m-32|0;if(c>>>0<b>>>0){break}else{l=l+(k<<2)|0;a=a-32|0;m=c}}return}function gc(a){a=a|0;var b=0,c=0.0,d=0,e=0.0,f=0,h=0.0,i=0,j=0.0,k=0.0,l=0.0;b=a+120|0;c=+g[b>>2];d=a+56|0;e=+g[d>>2];f=a+124|0;h=+g[f>>2];i=a+60|0;j=+g[i>>2];g[b>>2]=c+e;g[f>>2]=j+h;g[d>>2]=c-e;g[i>>2]=h-j;i=a+112|0;j=+g[i>>2];d=a+48|0;h=+g[d>>2];e=j-h;f=a+116|0;c=+g[f>>2];b=a+52|0;k=+g[b>>2];l=c-k;g[i>>2]=j+h;g[f>>2]=k+c;g[d>>2]=e*.9238795042037964-l*.3826834261417389;g[b>>2]=e*.3826834261417389+l*.9238795042037964;b=a+104|0;l=+g[b>>2];d=a+40|0;e=+g[d>>2];c=l-e;f=a+108|0;k=+g[f>>2];i=a+44|0;h=+g[i>>2];j=k-h;g[b>>2]=l+e;g[f>>2]=h+k;g[d>>2]=(c-j)*.7071067690849304;g[i>>2]=(c+j)*.7071067690849304;i=a+96|0;j=+g[i>>2];d=a+32|0;c=+g[d>>2];k=j-c;f=a+100|0;h=+g[f>>2];b=a+36|0;e=+g[b>>2];l=h-e;g[i>>2]=j+c;g[f>>2]=e+h;g[d>>2]=k*.3826834261417389-l*.9238795042037964;g[b>>2]=k*.9238795042037964+l*.3826834261417389;b=a+88|0;l=+g[b>>2];d=a+24|0;k=+g[d>>2];f=a+28|0;h=+g[f>>2];i=a+92|0;e=+g[i>>2];g[b>>2]=l+k;g[i>>2]=h+e;g[d>>2]=h-e;g[f>>2]=l-k;f=a+16|0;k=+g[f>>2];d=a+80|0;l=+g[d>>2];e=k-l;i=a+20|0;h=+g[i>>2];b=a+84|0;c=+g[b>>2];j=h-c;g[d>>2]=k+l;g[b>>2]=h+c;g[f>>2]=e*.3826834261417389+j*.9238795042037964;g[i>>2]=j*.3826834261417389-e*.9238795042037964;i=a+8|0;e=+g[i>>2];f=a+72|0;j=+g[f>>2];c=e-j;b=a+12|0;h=+g[b>>2];d=a+76|0;l=+g[d>>2];k=h-l;g[f>>2]=e+j;g[d>>2]=h+l;g[i>>2]=(c+k)*.7071067690849304;g[b>>2]=(k-c)*.7071067690849304;c=+g[a>>2];b=a+64|0;k=+g[b>>2];l=c-k;i=a+4|0;h=+g[i>>2];d=a+68|0;j=+g[d>>2];e=h-j;g[b>>2]=c+k;g[d>>2]=h+j;g[a>>2]=l*.9238795042037964+e*.3826834261417389;g[i>>2]=e*.9238795042037964-l*.3826834261417389;hc(a);hc(b);return}function hc(a){a=a|0;var b=0,c=0.0,d=0,e=0.0,f=0.0,h=0.0,i=0,j=0.0,k=0.0,l=0,m=0;b=a+4|0;c=+g[b>>2];d=a+36|0;e=+g[d>>2];f=c-e;h=+g[a>>2];i=a+32|0;j=+g[i>>2];k=h-j;g[i>>2]=h+j;g[d>>2]=c+e;g[a>>2]=(f+k)*.7071067690849304;g[b>>2]=(f-k)*.7071067690849304;b=a+12|0;k=+g[b>>2];d=a+44|0;f=+g[d>>2];l=a+40|0;e=+g[l>>2];m=a+8|0;c=+g[m>>2];g[l>>2]=e+c;g[d>>2]=k+f;g[m>>2]=k-f;g[b>>2]=e-c;b=a+48|0;c=+g[b>>2];m=a+16|0;e=+g[m>>2];f=c-e;d=a+52|0;k=+g[d>>2];l=a+20|0;j=+g[l>>2];h=k-j;g[b>>2]=c+e;g[d>>2]=j+k;g[m>>2]=(f-h)*.7071067690849304;g[l>>2]=(f+h)*.7071067690849304;l=a+56|0;h=+g[l>>2];m=a+24|0;f=+g[m>>2];d=a+60|0;k=+g[d>>2];b=a+28|0;j=+g[b>>2];g[l>>2]=h+f;g[d>>2]=j+k;g[m>>2]=h-f;g[b>>2]=k-j;ic(a);ic(i);return}function ic(a){a=a|0;var b=0,c=0.0,d=0,e=0.0,f=0.0,h=0.0,i=0,j=0.0,k=0.0,l=0,m=0,n=0.0,o=0.0;b=a+24|0;c=+g[b>>2];d=a+8|0;e=+g[d>>2];f=c+e;h=c-e;i=a+16|0;e=+g[i>>2];c=+g[a>>2];j=e+c;k=e-c;g[b>>2]=f+j;g[i>>2]=f-j;i=a+20|0;j=+g[i>>2];b=a+4|0;f=+g[b>>2];c=j-f;l=a+28|0;e=+g[l>>2];m=a+12|0;n=+g[m>>2];o=e-n;g[a>>2]=h+c;g[d>>2]=h-c;c=j+f;f=e+n;g[m>>2]=k+o;g[b>>2]=o-k;g[l>>2]=c+f;g[i>>2]=f-c;return}function jc(a,b){a=a|0;b=b|0;var d=0,e=0;d=c[a>>2]|0;if((d|0)==1){return}e=c[a+4>>2]|0;kc(d,b,e,e+(d<<2)|0,c[a+8>>2]|0);return}function kc(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;h=c[f+4>>2]|0;if((h|0)<=0){return}i=h+1|0;j=a;k=1;l=a;m=0;while(1){n=c[f+(i-m<<2)>>2]|0;o=(l|0)/(n|0)|0;p=(a|0)/(l|0)|0;q=ca(p,o)|0;r=j-(ca(p,n-1|0)|0)|0;s=1-k|0;do{if((n|0)==2){t=e+(r-1<<2)|0;if((k|0)==1){qc(p,o,b,d,t);u=s;break}else{qc(p,o,d,b,t);u=s;break}}else if((n|0)==4){t=r+p|0;v=e+(r-1<<2)|0;w=e+(t-1<<2)|0;x=e+(p-1+t<<2)|0;if((k|0)==1){pc(p,o,b,d,v,w,x);u=s;break}else{pc(p,o,d,b,v,w,x);u=s;break}}else{x=e+(r-1<<2)|0;if((((p|0)==1?k:s)|0)==0){rc(p,n,o,q,b,b,b,d,d,x);u=1;break}else{rc(p,n,o,q,d,d,d,b,b,x);u=0;break}}}while(0);q=m+1|0;if((q|0)<(h|0)){j=r;k=u;l=o;m=q}else{break}}if((u|0)!=1&(a|0)>0){y=0}else{return}do{g[b+(y<<2)>>2]=+g[d+(y<<2)>>2];y=y+1|0;}while((y|0)<(a|0));return}function lc(a,b){a=a|0;b=b|0;var d=0,e=0;c[a>>2]=b;d=$f(b*3|0,4)|0;c[a+4>>2]=d;e=$f(32,4)|0;c[a+8>>2]=e;mc(b,d,e);return}function mc(a,b,c){a=a|0;b=b|0;c=c|0;if((a|0)==1){return}oc(a,b+(a<<2)|0,c);return}function nc(a){a=a|0;var b=0;if((a|0)==0){return}b=c[a+4>>2]|0;if((b|0)!=0){_f(b)}b=c[a+8>>2]|0;if((b|0)!=0){_f(b)}og(a|0,0,12)|0;return}function oc(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0.0,u=0,v=0,w=0,x=0.0,y=0.0,z=0.0,A=0.0,B=0,C=0;e=d+8|0;f=0;h=a;i=0;j=0;a:while(1){if((j|0)<4){k=c[56752+(j<<2)>>2]|0}else{k=i+2|0}l=(k|0)!=2;m=f;n=h;while(1){o=(n|0)/(k|0)|0;if((n|0)!=(ca(o,k)|0)){break}p=m+1|0;c[d+(m+2<<2)>>2]=k;q=(m|0)==0;if(!(l|q)){if((m|0)>0){r=1;do{s=p-r|0;c[d+(s+2<<2)>>2]=c[d+(s+1<<2)>>2];r=r+1|0;}while((r|0)<(p|0))}c[e>>2]=2}if((o|0)==1){break a}else{m=p;n=o}}f=m;h=n;i=k;j=j+1|0}c[d>>2]=a;c[d+4>>2]=p;t=6.2831854820251465/+(a|0);if((m|0)>0&(q^1)){u=1;v=0;w=0}else{return}while(1){q=c[d+(w+2<<2)>>2]|0;p=ca(q,u)|0;j=(a|0)/(p|0)|0;k=q-1|0;if((k|0)>0){q=(j|0)>2;i=ca(j,k)|0;h=0;f=v;e=0;while(1){l=h+u|0;x=t*+(l|0);if(q){r=2;s=f;y=0.0;while(1){z=y+1.0;A=x*z;g[b+(s<<2)>>2]=+U(A);g[b+(s+1<<2)>>2]=+V(A);B=r+2|0;if((B|0)<(j|0)){r=B;s=s+2|0;y=z}else{break}}}s=e+1|0;if((s|0)<(k|0)){h=l;f=f+j|0;e=s}else{break}}C=v+i|0}else{C=v}e=w+1|0;if((e|0)<(m|0)){u=p;v=C;w=e}else{break}}return}function pc(a,b,c,d,e,f,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0.0,v=0,w=0,x=0.0,y=0,z=0,A=0,B=0.0,C=0.0,D=0.0,E=0.0,F=0,G=0.0,H=0.0,I=0.0,J=0.0;i=ca(b,a)|0;j=i<<1;k=(b|0)>0;if(k){l=(a<<2)-1|0;m=a<<1;n=j;o=0;p=j+i|0;q=i;r=0;while(1){s=c+(q<<2)|0;t=c+(p<<2)|0;u=+g[s>>2]+ +g[t>>2];v=c+(o<<2)|0;w=c+(n<<2)|0;x=+g[v>>2]+ +g[w>>2];y=o<<2;g[d+(y<<2)>>2]=u+x;g[d+(l+y<<2)>>2]=x-u;z=y+m|0;g[d+(z-1<<2)>>2]=+g[v>>2]- +g[w>>2];g[d+(z<<2)>>2]=+g[t>>2]- +g[s>>2];s=r+1|0;if((s|0)<(b|0)){n=n+a|0;o=o+a|0;p=p+a|0;q=q+a|0;r=s}else{break}}}if((a|0)<2){return}do{if((a|0)!=2){if(k){r=a<<1;q=(a|0)>2;p=0;o=0;while(1){n=p<<2;if(q){m=n+r|0;l=n;n=p;s=2;while(1){t=n+2|0;z=l+2|0;w=m-2|0;v=t+i|0;y=s-2|0;u=+g[e+(y<<2)>>2];x=+g[c+(v-1<<2)>>2];A=s-1|0;B=+g[e+(A<<2)>>2];C=+g[c+(v<<2)>>2];D=u*x+B*C;E=u*C-x*B;F=v+i|0;B=+g[f+(y<<2)>>2];x=+g[c+(F-1<<2)>>2];C=+g[f+(A<<2)>>2];u=+g[c+(F<<2)>>2];G=B*x+C*u;H=B*u-x*C;v=F+i|0;C=+g[h+(y<<2)>>2];x=+g[c+(v-1<<2)>>2];u=+g[h+(A<<2)>>2];B=+g[c+(v<<2)>>2];I=C*x+u*B;J=C*B-x*u;u=D+I;x=I-D;D=E+J;I=E-J;J=+g[c+(t<<2)>>2];E=H+J;B=J-H;H=+g[c+(n+1<<2)>>2];J=G+H;C=H-G;g[d+((l|1)<<2)>>2]=u+J;g[d+(z<<2)>>2]=E+D;g[d+(m-3<<2)>>2]=C-I;g[d+(w<<2)>>2]=x-B;v=z+r|0;g[d+(v-1<<2)>>2]=I+C;g[d+(v<<2)>>2]=B+x;v=w+r|0;g[d+(v-1<<2)>>2]=J-u;g[d+(v<<2)>>2]=D-E;v=s+2|0;if((v|0)<(a|0)){m=w;l=z;n=t;s=v}else{break}}}s=o+1|0;if((s|0)<(b|0)){p=p+a|0;o=s}else{break}}}if((a&1|0)==0){break}return}}while(0);h=a-1+i|0;f=a<<2;e=a<<1;if(!k){return}k=a;o=a;p=h+j|0;j=h;h=0;while(1){E=+g[c+(j<<2)>>2];D=+g[c+(p<<2)>>2];u=(E+D)*-.7071067690849304;J=(E-D)*.7071067690849304;r=c+(k-1<<2)|0;g[d+(o-1<<2)>>2]=+g[r>>2]+J;q=o+e|0;g[d+(q-1<<2)>>2]=+g[r>>2]-J;r=c+(j+i<<2)|0;g[d+(o<<2)>>2]=u- +g[r>>2];g[d+(q<<2)>>2]=u+ +g[r>>2];r=h+1|0;if((r|0)<(b|0)){k=k+a|0;o=o+f|0;p=p+a|0;j=j+a|0;h=r}else{break}}return}function qc(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0.0,x=0.0,y=0.0,z=0.0,A=0.0,B=0.0,C=0;f=ca(b,a)|0;h=a<<1;i=(b|0)>0;if(i){j=h-1|0;k=0;l=0;m=f;while(1){n=c+(l<<2)|0;o=c+(m<<2)|0;p=l<<1;g[d+(p<<2)>>2]=+g[n>>2]+ +g[o>>2];g[d+(j+p<<2)>>2]=+g[n>>2]- +g[o>>2];o=k+1|0;if((o|0)<(b|0)){k=o;l=l+a|0;m=m+a|0}else{break}}}if((a|0)<2){return}do{if((a|0)!=2){if(i){m=(a|0)>2;l=0;k=0;j=f;while(1){if(m){o=k<<1;n=2;p=j;q=o+h|0;r=k;s=o;while(1){o=p+2|0;t=q-2|0;u=r+2|0;v=s+2|0;w=+g[e+(n-2<<2)>>2];x=+g[c+(p+1<<2)>>2];y=+g[e+(n-1<<2)>>2];z=+g[c+(o<<2)>>2];A=w*x+y*z;B=w*z-x*y;C=c+(u<<2)|0;g[d+(v<<2)>>2]=+g[C>>2]+B;g[d+(t<<2)>>2]=B- +g[C>>2];C=c+(r+1<<2)|0;g[d+((s|1)<<2)>>2]=A+ +g[C>>2];g[d+(q-3<<2)>>2]=+g[C>>2]-A;C=n+2|0;if((C|0)<(a|0)){n=C;p=o;q=t;r=u;s=v}else{break}}}s=l+1|0;if((s|0)<(b|0)){l=s;k=k+a|0;j=j+a|0}else{break}}}if(((a|0)%2|0|0)!=1){break}return}}while(0);e=a-1|0;if(!i){return}i=0;j=a;k=f+e|0;f=e;while(1){g[d+(j<<2)>>2]=-0.0- +g[c+(k<<2)>>2];g[d+(j-1<<2)>>2]=+g[c+(f<<2)>>2];e=i+1|0;if((e|0)<(b|0)){i=e;j=j+h|0;k=k+a|0;f=f+a|0}else{break}}return}function rc(a,b,c,d,e,f,h,i,j,k){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;i=i|0;j=j|0;k=k|0;var l=0.0,m=0.0,n=0.0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0.0,Q=0.0,R=0.0,S=0.0,T=0.0,W=0.0,X=0.0,Y=0,Z=0;l=6.2831854820251465/+(b|0);m=+U(l);n=+V(l);o=b+1>>1;p=a-1>>1;q=ca(c,a)|0;r=ca(b,a)|0;s=(a|0)==1;a:do{if(!s){if((d|0)>0){t=0;do{g[j+(t<<2)>>2]=+g[h+(t<<2)>>2];t=t+1|0;}while((t|0)<(d|0))}t=(b|0)>1;if(t){u=(c|0)>0;v=0;w=1;do{v=v+q|0;if(u){x=v;y=0;while(1){g[i+(x<<2)>>2]=+g[f+(x<<2)>>2];z=y+1|0;if((z|0)<(c|0)){x=x+a|0;y=z}else{break}}}w=w+1|0;}while((w|0)<(b|0))}w=-a|0;do{if((p|0)>(c|0)){if(!t){break}v=(c|0)>0;u=(a|0)>2;y=0;x=w;z=1;do{y=y+q|0;x=x+a|0;if(v){A=x-1|0;B=y-a|0;C=0;do{B=B+a|0;if(u){D=B;E=2;F=A;while(1){G=F+2|0;H=D+2|0;I=k+(F+1<<2)|0;J=D+1|0;K=f+(J<<2)|0;L=k+(G<<2)|0;M=f+(H<<2)|0;g[i+(J<<2)>>2]=+g[I>>2]*+g[K>>2]+ +g[L>>2]*+g[M>>2];g[i+(H<<2)>>2]=+g[I>>2]*+g[M>>2]- +g[L>>2]*+g[K>>2];K=E+2|0;if((K|0)<(a|0)){D=H;E=K;F=G}else{break}}}C=C+1|0;}while((C|0)<(c|0))}z=z+1|0;}while((z|0)<(b|0))}else{if(!t){break}z=(a|0)>2;u=(c|0)>0;y=0;x=w;v=1;do{x=x+a|0;y=y+q|0;if(z){C=y;A=2;B=x-1|0;while(1){F=B+2|0;E=C+2|0;if(u){D=k+(B+1<<2)|0;G=k+(F<<2)|0;K=E;H=0;while(1){L=K-1|0;M=f+(L<<2)|0;I=f+(K<<2)|0;g[i+(L<<2)>>2]=+g[D>>2]*+g[M>>2]+ +g[G>>2]*+g[I>>2];g[i+(K<<2)>>2]=+g[D>>2]*+g[I>>2]- +g[G>>2]*+g[M>>2];M=H+1|0;if((M|0)<(c|0)){K=K+a|0;H=M}else{break}}}H=A+2|0;if((H|0)<(a|0)){C=E;A=H;B=F}else{break}}}v=v+1|0;}while((v|0)<(b|0))}}while(0);w=ca(q,b)|0;t=(o|0)>1;if((p|0)>=(c|0)){if(!t){break}v=(c|0)>0;u=(a|0)>2;x=w;y=0;z=1;while(1){y=y+q|0;x=x-q|0;if(v){B=x;A=y;C=0;while(1){if(u){H=A;K=B;G=2;while(1){D=H+2|0;M=K+2|0;I=H+1|0;L=i+(I<<2)|0;J=K+1|0;N=i+(J<<2)|0;g[f+(I<<2)>>2]=+g[L>>2]+ +g[N>>2];I=i+(D<<2)|0;O=i+(M<<2)|0;g[f+(J<<2)>>2]=+g[I>>2]- +g[O>>2];g[f+(D<<2)>>2]=+g[I>>2]+ +g[O>>2];g[f+(M<<2)>>2]=+g[N>>2]- +g[L>>2];L=G+2|0;if((L|0)<(a|0)){H=D;K=M;G=L}else{break}}}G=C+1|0;if((G|0)<(c|0)){B=B+a|0;A=A+a|0;C=G}else{break}}}z=z+1|0;if((z|0)>=(o|0)){break a}}}if(!t){break}z=(a|0)>2;u=(c|0)>0;y=w;x=0;v=1;do{x=x+q|0;y=y-q|0;if(z){C=y;A=x;B=2;do{A=A+2|0;C=C+2|0;if(u){G=A-a|0;K=C-a|0;H=0;do{G=G+a|0;K=K+a|0;L=G-1|0;M=i+(L<<2)|0;D=K-1|0;N=i+(D<<2)|0;g[f+(L<<2)>>2]=+g[M>>2]+ +g[N>>2];L=i+(G<<2)|0;O=i+(K<<2)|0;g[f+(D<<2)>>2]=+g[L>>2]- +g[O>>2];g[f+(G<<2)>>2]=+g[L>>2]+ +g[O>>2];g[f+(K<<2)>>2]=+g[N>>2]- +g[M>>2];H=H+1|0;}while((H|0)<(c|0))}B=B+2|0;}while((B|0)<(a|0))}v=v+1|0;}while((v|0)<(o|0))}}while(0);k=(d|0)>0;if(k){v=0;do{g[h+(v<<2)>>2]=+g[j+(v<<2)>>2];v=v+1|0;}while((v|0)<(d|0))}v=ca(d,b)|0;u=(o|0)>1;do{if(u){x=(c|0)>0;y=v;z=0;w=1;do{z=z+q|0;y=y-q|0;if(x){t=y-a|0;B=z-a|0;C=0;do{B=B+a|0;t=t+a|0;A=i+(B<<2)|0;H=i+(t<<2)|0;g[f+(B<<2)>>2]=+g[A>>2]+ +g[H>>2];g[f+(t<<2)>>2]=+g[H>>2]- +g[A>>2];C=C+1|0;}while((C|0)<(c|0))}w=w+1|0;}while((w|0)<(o|0));w=ca(b-1|0,d)|0;if(!u){break}z=(o|0)>2;l=0.0;P=1.0;y=v;x=0;C=1;while(1){t=x+d|0;B=y-d|0;Q=m*P-n*l;R=m*l+n*P;if(k){A=B;H=w;K=d;G=t;M=0;while(1){g[j+(G<<2)>>2]=+g[h+(M<<2)>>2]+Q*+g[h+(K<<2)>>2];g[j+(A<<2)>>2]=R*+g[h+(H<<2)>>2];N=M+1|0;if((N|0)<(d|0)){A=A+1|0;H=H+1|0;K=K+1|0;G=G+1|0;M=N}else{break}}}if(z){M=w;G=d;S=R;T=Q;K=2;while(1){H=G+d|0;A=M-d|0;W=Q*T-R*S;X=Q*S+R*T;if(k){N=t;O=B;L=H;D=A;I=0;while(1){J=j+(N<<2)|0;g[J>>2]=+g[J>>2]+W*+g[h+(L<<2)>>2];J=j+(O<<2)|0;g[J>>2]=+g[J>>2]+X*+g[h+(D<<2)>>2];J=I+1|0;if((J|0)<(d|0)){N=N+1|0;O=O+1|0;L=L+1|0;D=D+1|0;I=J}else{break}}}I=K+1|0;if((I|0)<(o|0)){M=A;G=H;S=X;T=W;K=I}else{break}}}K=C+1|0;if((K|0)<(o|0)){l=R;P=Q;y=B;x=t;C=K}else{break}}if(u){Y=0;Z=1}else{break}do{Y=Y+d|0;if(k){C=Y;x=0;while(1){y=j+(x<<2)|0;g[y>>2]=+g[h+(C<<2)>>2]+ +g[y>>2];y=x+1|0;if((y|0)<(d|0)){C=C+1|0;x=y}else{break}}}Z=Z+1|0;}while((Z|0)<(o|0))}}while(0);do{if((a|0)<(c|0)){if((a|0)<=0){break}Z=(c|0)>0;d=0;do{if(Z){h=d;j=d;Y=0;while(1){g[e+(h<<2)>>2]=+g[i+(j<<2)>>2];k=Y+1|0;if((k|0)<(c|0)){h=h+r|0;j=j+a|0;Y=k}else{break}}}d=d+1|0;}while((d|0)<(a|0))}else{if((c|0)<=0){break}d=(a|0)>0;Z=0;Y=0;j=0;while(1){if(d){h=Z;k=Y;v=0;while(1){g[e+(h<<2)>>2]=+g[i+(k<<2)>>2];f=v+1|0;if((f|0)<(a|0)){h=h+1|0;k=k+1|0;v=f}else{break}}}v=j+1|0;if((v|0)<(c|0)){Z=Z+r|0;Y=Y+a|0;j=v}else{break}}}}while(0);j=a<<1;Y=ca(q,b)|0;if(u){b=(c|0)>0;Z=Y;d=0;v=0;k=1;do{v=v+j|0;d=d+q|0;Z=Z-q|0;if(b){h=v;f=d;x=Z;C=0;while(1){g[e+(h-1<<2)>>2]=+g[i+(f<<2)>>2];g[e+(h<<2)>>2]=+g[i+(x<<2)>>2];t=C+1|0;if((t|0)<(c|0)){h=h+r|0;f=f+a|0;x=x+a|0;C=t}else{break}}}k=k+1|0;}while((k|0)<(o|0))}if(s){return}s=-a|0;if((p|0)>=(c|0)){if(!u){return}p=(c|0)>0;k=(a|0)>2;Z=Y;d=0;v=0;b=s;C=1;do{b=b+j|0;v=v+j|0;d=d+q|0;Z=Z-q|0;if(p){x=b;f=v;h=d;t=Z;B=0;while(1){if(k){y=2;do{w=y+h|0;z=i+(w-1<<2)|0;K=y+t|0;G=i+(K-1<<2)|0;M=y+f|0;g[e+(M-1<<2)>>2]=+g[z>>2]+ +g[G>>2];I=a-y+x|0;g[e+(I-1<<2)>>2]=+g[z>>2]- +g[G>>2];G=i+(w<<2)|0;w=i+(K<<2)|0;g[e+(M<<2)>>2]=+g[G>>2]+ +g[w>>2];g[e+(I<<2)>>2]=+g[w>>2]- +g[G>>2];y=y+2|0;}while((y|0)<(a|0))}y=B+1|0;if((y|0)<(c|0)){x=x+r|0;f=f+r|0;h=h+a|0;t=t+a|0;B=y}else{break}}}C=C+1|0;}while((C|0)<(o|0));return}if(!u){return}u=(a|0)>2;C=(c|0)>0;k=Y;Y=0;Z=0;d=s;s=1;do{d=d+j|0;Z=Z+j|0;Y=Y+q|0;k=k-q|0;if(u){v=d+a|0;b=2;do{if(C){p=v-b|0;B=b+Z|0;t=b+Y|0;h=b+k|0;f=0;while(1){x=i+(t-1<<2)|0;y=i+(h-1<<2)|0;g[e+(B-1<<2)>>2]=+g[x>>2]+ +g[y>>2];g[e+(p-1<<2)>>2]=+g[x>>2]- +g[y>>2];y=i+(t<<2)|0;x=i+(h<<2)|0;g[e+(B<<2)>>2]=+g[y>>2]+ +g[x>>2];g[e+(p<<2)>>2]=+g[x>>2]- +g[y>>2];y=f+1|0;if((y|0)<(c|0)){p=p+r|0;B=B+r|0;t=t+a|0;h=h+a|0;f=y}else{break}}}b=b+2|0;}while((b|0)<(a|0))}s=s+1|0;}while((s|0)<(o|0));return}function sc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;og(b|0,0,112)|0;c[b+64>>2]=a;c[b+76>>2]=0;c[b+68>>2]=0;if((c[a>>2]|0)==0){return 0}a=$f(1,72)|0;c[b+104>>2]=a;g[a+4>>2]=-9999.0;d=b+4|0;b=a+12|0;e=0;while(1){if((e|0)==7){c[a+40>>2]=d;Af(d);e=e+1|0;continue}else{f=$f(1,20)|0;c[b+(e<<2)>>2]=f;Af(f);f=e+1|0;if((f|0)<15){e=f;continue}else{break}}}return 0}function tc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;d=b+7&-8;b=a+72|0;e=c[b>>2]|0;f=a+76|0;g=a+68|0;h=c[g>>2]|0;if((e+d|0)<=(c[f>>2]|0)){i=e;j=h;k=j+i|0;l=i+d|0;c[b>>2]=l;return k|0}if((h|0)!=0){m=Zf(8)|0;n=a+80|0;c[n>>2]=(c[n>>2]|0)+e;e=a+84|0;c[m+4>>2]=c[e>>2];c[m>>2]=h;c[e>>2]=m}c[f>>2]=d;f=Zf(d)|0;c[g>>2]=f;c[b>>2]=0;i=0;j=f;k=j+i|0;l=i+d|0;c[b>>2]=l;return k|0}function uc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0;b=a+84|0;d=c[b>>2]|0;if((d|0)!=0){e=d;while(1){d=c[e+4>>2]|0;_f(c[e>>2]|0);_f(e);if((d|0)==0){break}else{e=d}}}e=a+80|0;d=c[e>>2]|0;if((d|0)==0){f=a+72|0;c[f>>2]=0;c[b>>2]=0;return}g=a+68|0;h=a+76|0;c[g>>2]=ag(c[g>>2]|0,(c[h>>2]|0)+d|0)|0;c[h>>2]=(c[h>>2]|0)+(c[e>>2]|0);c[e>>2]=0;f=a+72|0;c[f>>2]=0;c[b>>2]=0;return}function vc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;b=c[a+104>>2]|0;uc(a);d=c[a+68>>2]|0;if((d|0)!=0){_f(d)}if((b|0)==0){e=a;og(e|0,0,112)|0;return 0}d=b+12|0;f=0;while(1){g=d+(f<<2)|0;Df(c[g>>2]|0);if((f|0)==7){f=f+1|0;continue}else{_f(c[g>>2]|0);g=f+1|0;if((g|0)<15){f=g;continue}else{break}}}_f(b);e=a;og(e|0,0,112)|0;return 0}function wc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;if((xc(a,b,1)|0)!=0){d=1;return d|0}e=c[a+104>>2]|0;c[e+60>>2]=Qc(b)|0;f=$f(1,180)|0;c[e>>2]=f;Ec(f,b);Se(b,e+80|0);e=a+64|0;c[e>>2]=3;c[e+4>>2]=0;d=0;return d|0}function xc(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;e=c[b+28>>2]|0;if((e|0)==0){f=1;return f|0}g=c[e+3656>>2]|0;og(a|0,0,112)|0;h=$f(1,136)|0;c[a+104>>2]=h;c[a+4>>2]=b;c[h+44>>2]=Dc(c[e+8>>2]|0)|0;i=$f(1,4)|0;c[h+12>>2]=i;j=$f(1,4)|0;k=h+16|0;c[k>>2]=j;l=$f(1,20)|0;c[i>>2]=l;c[j>>2]=$f(1,20)|0;j=e;i=e;_b(l,c[i>>2]>>g);l=e+4|0;_b(c[c[k>>2]>>2]|0,c[l>>2]>>g);g=c[i>>2]|0;c[h+4>>2]=(Dc(g)|0)-6;c[h+8>>2]=(Dc(c[l>>2]|0)|0)-6;a:do{if((d|0)==0){i=e+2848|0;if((c[i>>2]|0)!=0){break}k=e+24|0;c[i>>2]=$f(c[k>>2]|0,56)|0;m=c[k>>2]|0;if((m|0)<=0){break}n=e+1824|0;o=0;p=m;while(1){m=n+(o<<2)|0;q=c[m>>2]|0;if((q|0)==0){r=p;break}if((Pe((c[i>>2]|0)+(o*56|0)|0,q)|0)!=0){s=19;break}Me(c[m>>2]|0);c[m>>2]=0;o=o+1|0;p=c[k>>2]|0;if((o|0)>=(p|0)){break a}}if((s|0)==19){r=c[k>>2]|0}if((r|0)>0){p=0;o=r;while(1){i=n+(p<<2)|0;m=c[i>>2]|0;if((m|0)==0){t=o}else{Me(m);c[i>>2]=0;t=c[k>>2]|0}i=p+1|0;if((i|0)<(t|0)){p=i;o=t}else{break}}}yc(a);f=-1;return f|0}else{lc(h+20|0,g);lc(h+32|0,c[l>>2]|0);o=e+2848|0;b:do{if((c[o>>2]|0)==0){p=e+24|0;k=$f(c[p>>2]|0,56)|0;c[o>>2]=k;if((c[p>>2]|0)<=0){break}n=e+1824|0;i=0;m=k;while(1){Oe(m+(i*56|0)|0,c[n+(i<<2)>>2]|0)|0;k=i+1|0;if((k|0)>=(c[p>>2]|0)){break b}i=k;m=c[o>>2]|0}}}while(0);o=e+28|0;m=$f(c[o>>2]|0,52)|0;i=h+56|0;c[i>>2]=m;c:do{if((c[o>>2]|0)>0){p=e+2852|0;n=e+2868|0;k=b+8|0;q=0;u=m;while(1){v=c[p+(q<<2)>>2]|0;Tc(u+(q*52|0)|0,v,n,(c[j+(c[v>>2]<<2)>>2]|0)/2|0,c[k>>2]|0);v=q+1|0;if((v|0)>=(c[o>>2]|0)){break c}q=v;u=c[i>>2]|0}}}while(0);c[a>>2]=1}}while(0);j=c[l>>2]|0;c[a+16>>2]=j;g=c[b+4>>2]|0;b=g<<2;t=Zf(b)|0;r=a+8|0;c[r>>2]=t;c[a+12>>2]=Zf(b)|0;d:do{if((g|0)>0){b=0;s=t;while(1){c[s+(b<<2)>>2]=$f(j,4)|0;d=b+1|0;if((d|0)>=(g|0)){break d}b=d;s=c[r>>2]|0}}}while(0);c[a+36>>2]=0;c[a+40>>2]=0;r=(c[l>>2]|0)/2|0;c[a+48>>2]=r;c[a+20>>2]=r;r=e+16|0;l=h+48|0;c[l>>2]=$f(c[r>>2]|0,4)|0;g=e+20|0;j=h+52|0;c[j>>2]=$f(c[g>>2]|0,4)|0;if((c[r>>2]|0)>0){h=e+800|0;t=e+1056|0;s=0;do{b=zb[c[(c[223712+(c[h+(s<<2)>>2]<<2)>>2]|0)+8>>2]&31](a,c[t+(s<<2)>>2]|0)|0;c[(c[l>>2]|0)+(s<<2)>>2]=b;s=s+1|0;}while((s|0)<(c[r>>2]|0))}if((c[g>>2]|0)<=0){f=0;return f|0}r=e+1312|0;s=e+1568|0;e=0;while(1){l=zb[c[(c[172352+(c[r+(e<<2)>>2]<<2)>>2]|0)+8>>2]&31](a,c[s+(e<<2)>>2]|0)|0;c[(c[j>>2]|0)+(e<<2)>>2]=l;l=e+1|0;if((l|0)<(c[g>>2]|0)){e=l}else{f=0;break}}return f|0}function yc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;if((a|0)==0){return}b=c[a+4>>2]|0;d=(b|0)!=0;if(d){e=c[b+28>>2]|0}else{e=0}f=c[a+104>>2]|0;g=(f|0)!=0;if(g){h=f;i=c[h>>2]|0;if((i|0)!=0){Fc(i);_f(c[h>>2]|0)}h=f+12|0;i=c[h>>2]|0;if((i|0)!=0){$b(c[i>>2]|0);_f(c[c[h>>2]>>2]|0);_f(c[h>>2]|0)}h=f+16|0;i=c[h>>2]|0;if((i|0)!=0){$b(c[i>>2]|0);_f(c[c[h>>2]>>2]|0);_f(c[h>>2]|0)}h=f+48|0;i=c[h>>2]|0;if((i|0)!=0){do{if((e|0)==0){j=i}else{k=e+16|0;if((c[k>>2]|0)>0){l=0;m=i}else{j=i;break}while(1){qb[c[(c[223712+(c[e+800+(l<<2)>>2]<<2)>>2]|0)+16>>2]&31](c[m+(l<<2)>>2]|0);n=l+1|0;o=c[h>>2]|0;if((n|0)<(c[k>>2]|0)){l=n;m=o}else{j=o;break}}}}while(0);_f(j)}j=f+52|0;m=c[j>>2]|0;if((m|0)!=0){do{if((e|0)==0){p=m}else{l=e+20|0;if((c[l>>2]|0)>0){q=0;r=m}else{p=m;break}while(1){qb[c[(c[172352+(c[e+1312+(q<<2)>>2]<<2)>>2]|0)+16>>2]&31](c[r+(q<<2)>>2]|0);h=q+1|0;i=c[j>>2]|0;if((h|0)<(c[l>>2]|0)){q=h;r=i}else{p=i;break}}}}while(0);_f(p)}p=f+56|0;r=c[p>>2]|0;if((r|0)!=0){do{if((e|0)==0){s=r}else{q=e+28|0;if((c[q>>2]|0)>0){t=0;u=r}else{s=r;break}while(1){Vc(u+(t*52|0)|0);j=t+1|0;m=c[p>>2]|0;if((j|0)<(c[q>>2]|0)){t=j;u=m}else{s=m;break}}}}while(0);_f(s)}s=c[f+60>>2]|0;if((s|0)!=0){Rc(s)}Te(f+80|0);nc(f+20|0);nc(f+32|0)}s=a+8|0;u=c[s>>2]|0;do{if((u|0)!=0){do{if(d){t=b+4|0;p=c[t>>2]|0;if((p|0)>0){v=0;w=p;x=u}else{y=u;break}while(1){p=c[x+(v<<2)>>2]|0;if((p|0)==0){z=w}else{_f(p);z=c[t>>2]|0}p=v+1|0;r=c[s>>2]|0;if((p|0)<(z|0)){v=p;w=z;x=r}else{y=r;break}}}else{y=u}}while(0);_f(y);t=c[a+12>>2]|0;if((t|0)==0){break}_f(t)}}while(0);if(g){g=c[f+64>>2]|0;if((g|0)!=0){_f(g)}g=c[f+68>>2]|0;if((g|0)!=0){_f(g)}g=c[f+72>>2]|0;if((g|0)!=0){_f(g)}_f(f)}og(a|0,0,112)|0;return}function zc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;d=c[a+4>>2]|0;e=c[a+104>>2]|0;f=e+64|0;g=c[f>>2]|0;if((g|0)!=0){_f(g)}c[f>>2]=0;f=e+68|0;g=c[f>>2]|0;if((g|0)!=0){_f(g)}c[f>>2]=0;f=e+72|0;e=c[f>>2]|0;if((e|0)!=0){_f(e)}c[f>>2]=0;f=a+20|0;e=c[f>>2]|0;g=a+16|0;a:do{if((e+b|0)<(c[g>>2]|0)){h=c[d+4>>2]|0;i=11}else{j=e+(b<<1)|0;c[g>>2]=j;k=d+4|0;if((c[k>>2]|0)<=0){break}l=a+8|0;m=0;n=j;while(1){j=ag(c[(c[l>>2]|0)+(m<<2)>>2]|0,n<<2)|0;c[(c[l>>2]|0)+(m<<2)>>2]=j;j=m+1|0;o=c[k>>2]|0;if((j|0)>=(o|0)){h=o;i=11;break a}m=j;n=c[g>>2]|0}}}while(0);do{if((i|0)==11){if((h|0)<=0){break}g=a+8|0;d=c[f>>2]|0;b=a+12|0;e=0;while(1){c[(c[b>>2]|0)+(e<<2)>>2]=(c[(c[g>>2]|0)+(e<<2)>>2]|0)+(d<<2);n=e+1|0;if((n|0)<(h|0)){e=n}else{p=b;break}}q=c[p>>2]|0;return q|0}}while(0);p=a+12|0;q=c[p>>2]|0;return q|0}function Ac(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;d=i;e=c[a+4>>2]|0;f=c[e+28>>2]|0;if((b|0)>=1){g=a+20|0;h=(c[g>>2]|0)+b|0;if((h|0)>(c[a+16>>2]|0)){j=-131;i=d;return j|0}c[g>>2]=h;if((c[a+28>>2]|0)!=0){j=0;i=d;return j|0}if((h-(c[a+48>>2]|0)|0)<=(c[f+4>>2]|0)){j=0;i=d;return j|0}Bc(a);j=0;i=d;return j|0}h=i;i=i+128|0;g=h|0;if((c[a+28>>2]|0)==0){Bc(a)}h=f+4|0;zc(a,(c[h>>2]|0)*3|0)|0;f=a+20|0;b=c[f>>2]|0;k=a+32|0;c[k>>2]=b;c[f>>2]=b+((c[h>>2]|0)*3|0);l=e+4|0;if((c[l>>2]|0)<=0){j=0;i=d;return j|0}e=a+8|0;a=0;m=b;while(1){if((m|0)>64){b=c[h>>2]|0;n=(m|0)>(b|0)?b:m;+Nc((c[(c[e>>2]|0)+(a<<2)>>2]|0)+(m-n<<2)|0,g,n,32);n=c[(c[e>>2]|0)+(a<<2)>>2]|0;b=c[k>>2]|0;Oc(g,n+(b-32<<2)|0,32,n+(b<<2)|0,(c[f>>2]|0)-b|0)}else{og((c[(c[e>>2]|0)+(a<<2)>>2]|0)+(m<<2)|0,0,(c[f>>2]|0)-m<<2|0)|0}b=a+1|0;if((b|0)>=(c[l>>2]|0)){j=0;break}a=b;m=c[k>>2]|0}i=d;return j|0}function Bc(a){a=a|0;var b=0,d=0,e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0;b=i;i=i+64|0;d=b|0;e=a+20|0;f=c[e>>2]|0;h=i;i=i+(f<<2)|0;i=i+7&-8;j=h;c[a+28>>2]=1;h=a+48|0;if((f-(c[h>>2]|0)|0)<=32){i=b;return}k=a+4|0;if((c[(c[k>>2]|0)+4>>2]|0)<=0){i=b;return}l=a+8|0;a=0;m=f;do{if((m|0)>0){f=c[(c[l>>2]|0)+(a<<2)>>2]|0;n=0;do{g[j+(n<<2)>>2]=+g[f+(m+~n<<2)>>2];n=n+1|0;}while((n|0)<(m|0))}+Nc(j,d,m-(c[h>>2]|0)|0,16);n=c[h>>2]|0;f=(c[e>>2]|0)-n|0;Oc(d,j+(f-16<<2)|0,16,j+(f<<2)|0,n);m=c[e>>2]|0;if((m|0)>0){n=c[(c[l>>2]|0)+(a<<2)>>2]|0;f=0;do{g[n+(m+~f<<2)>>2]=+g[j+(f<<2)>>2];f=f+1|0;}while((f|0)<(m|0))}a=a+1|0;}while((a|0)<(c[(c[k>>2]|0)+4>>2]|0));i=b;return}function Cc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0.0,y=0.0,z=0.0;d=c[a+4>>2]|0;e=c[d+28>>2]|0;f=c[a+104>>2]|0;h=c[f+60>>2]|0;i=a+48|0;j=a+40|0;k=e;l=(c[i>>2]|0)-((c[k+(c[j>>2]<<2)>>2]|0)/2|0)|0;m=c[b+104>>2]|0;if((c[a+28>>2]|0)==0){n=0;return n|0}o=a+32|0;if((c[o>>2]|0)==-1){n=0;return n|0}p=Gc(a)|0;do{if((p|0)==-1){if((c[o>>2]|0)==0){n=0;return n|0}else{c[a+44>>2]=0;q=0;break}}else{r=a+44|0;if((c[e>>2]|0)==(c[e+4>>2]|0)){c[r>>2]=0;q=0;break}else{c[r>>2]=p;q=p;break}}}while(0);p=a+44|0;r=c[k+(q<<2)>>2]|0;q=((c[k+(c[j>>2]<<2)>>2]|0)/4|0)+(c[i>>2]|0)+((r|0)/4|0)|0;s=a+20|0;if((c[s>>2]|0)<(q+((r|0)/2|0)|0)){n=0;return n|0}uc(b);r=a+36|0;c[b+24>>2]=c[r>>2];c[b+28>>2]=c[j>>2];c[b+32>>2]=c[p>>2];a:do{if((c[j>>2]|0)==0){t=m+8|0;if((Ic(a)|0)==0){c[t>>2]=1;break}else{c[t>>2]=0;break}}else{do{if((c[r>>2]|0)!=0){if((c[p>>2]|0)==0){break}c[m+8>>2]=1;break a}}while(0);c[m+8>>2]=0}}while(0);c[b+64>>2]=a;t=a+64|0;u=c[t>>2]|0;v=c[t+4>>2]|0;w=sg(u,v,1,0)|0;c[t>>2]=w;c[t+4>>2]=G;t=b+56|0;c[t>>2]=u;c[t+4>>2]=v;v=a+56|0;t=c[v+4>>2]|0;u=b+48|0;c[u>>2]=c[v>>2];c[u+4>>2]=t;t=b+36|0;c[t>>2]=c[k+(c[j>>2]<<2)>>2];k=m+4|0;x=+g[k>>2];u=h|0;y=+g[u>>2];if(x>y){g[u>>2]=x;z=x}else{z=y}y=+ad(z,a);g[u>>2]=y;g[k>>2]=y;k=d+4|0;d=b|0;c[d>>2]=tc(b,c[k>>2]<<2)|0;u=m;c[u>>2]=tc(b,c[k>>2]<<2)|0;if((c[k>>2]|0)>0){m=a+8|0;h=0;do{w=tc(b,(c[t>>2]|0)+l<<2)|0;c[(c[u>>2]|0)+(h<<2)>>2]=w;kg(c[(c[u>>2]|0)+(h<<2)>>2]|0,c[(c[m>>2]|0)+(h<<2)>>2]|0,(c[t>>2]|0)+l<<2)|0;c[(c[d>>2]|0)+(h<<2)>>2]=(c[(c[u>>2]|0)+(h<<2)>>2]|0)+(l<<2);h=h+1|0;}while((h|0)<(c[k>>2]|0))}h=c[o>>2]|0;do{if((h|0)!=0){if((c[i>>2]|0)<(h|0)){break}c[o>>2]=-1;c[b+44>>2]=1;n=1;return n|0}}while(0);b=(c[e+4>>2]|0)/2|0;e=q-b|0;if((e|0)<=0){n=1;return n|0}Jc(c[f>>2]|0,e);f=(c[s>>2]|0)-e|0;c[s>>2]=f;b:do{if((c[k>>2]|0)>0){q=a+8|0;h=0;l=f;while(1){u=c[(c[q>>2]|0)+(h<<2)>>2]|0;pg(u|0,u+(e<<2)|0,l<<2|0)|0;u=h+1|0;if((u|0)>=(c[k>>2]|0)){break b}h=u;l=c[s>>2]|0}}}while(0);c[r>>2]=c[j>>2];c[j>>2]=c[p>>2];c[i>>2]=b;i=c[o>>2]|0;if((i|0)==0){p=sg(c[v>>2]|0,c[v+4>>2]|0,e,(e|0)<0|0?-1:0)|0;c[v>>2]=p;c[v+4>>2]=G;n=1;return n|0}p=i-e|0;i=(p|0)<1?-1:p;c[o>>2]=i;if((b|0)<(i|0)){o=sg(c[v>>2]|0,c[v+4>>2]|0,e,(e|0)<0|0?-1:0)|0;c[v>>2]=o;c[v+4>>2]=G;n=1;return n|0}else{o=i+e-b|0;b=sg(c[v>>2]|0,c[v+4>>2]|0,o,(o|0)<0|0?-1:0)|0;c[v>>2]=b;c[v+4>>2]=G;n=1;return n|0}return 0}function Dc(a){a=a|0;var b=0,c=0,d=0,e=0;b=(a|0)==0?0:a-1|0;if((b|0)==0){c=0;return c|0}else{d=b;e=0}while(1){b=e+1|0;a=d>>>1;if((a|0)==0){c=b;break}else{d=a;e=b}}return c|0}function Ec(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,h=0.0,i=0,j=0,k=0,l=0.0,m=0.0,n=0.0,o=0,p=0.0;d=c[b+28>>2]|0;e=c[b+4>>2]|0;c[a+4>>2]=128;c[a+8>>2]=64;g[a+12>>2]=+g[d+2932>>2];c[a>>2]=e;b=a+164|0;c[b>>2]=128;c[a+176>>2]=(c[d+4>>2]|0)/2|0;d=a+36|0;c[d>>2]=$f(128,4)|0;_b(a+16|0,128);f=c[d>>2]|0;d=0;do{h=+V(+(d|0)/127.0*3.141592653589793);g[f+(d<<2)>>2]=h*h;d=d+1|0;}while((d|0)<128);c[a+40>>2]=2;c[a+44>>2]=4;c[a+56>>2]=4;c[a+60>>2]=5;c[a+72>>2]=6;c[a+76>>2]=6;c[a+88>>2]=9;c[a+92>>2]=8;c[a+104>>2]=13;c[a+108>>2]=8;c[a+120>>2]=17;c[a+124>>2]=8;c[a+136>>2]=22;c[a+140>>2]=8;d=0;f=4;while(1){i=Zf(f<<2)|0;c[a+40+(d<<4)+8>>2]=i;if((f|0)>0){h=+(f|0);j=a+40+(d<<4)+12|0;k=0;l=+g[j>>2];while(1){m=+V((+(k|0)+.5)/h*3.141592653589793);g[i+(k<<2)>>2]=m;n=m+l;g[j>>2]=n;o=k+1|0;if((o|0)<(f|0)){k=o;l=n}else{p=n;break}}}else{p=+g[a+40+(d<<4)+12>>2]}g[a+40+(d<<4)+12>>2]=1.0/p;k=d+1|0;if((k|0)>=7){break}d=k;f=c[a+40+(k<<4)+4>>2]|0}c[a+152>>2]=$f(e*7|0,144)|0;c[a+160>>2]=$f(c[b>>2]|0,4)|0;return}function Fc(a){a=a|0;$b(a+16|0);_f(c[a+48>>2]|0);_f(c[a+64>>2]|0);_f(c[a+80>>2]|0);_f(c[a+96>>2]|0);_f(c[a+112>>2]|0);_f(c[a+128>>2]|0);_f(c[a+144>>2]|0);_f(c[a+36>>2]|0);_f(c[a+152>>2]|0);_f(c[a+160>>2]|0);og(a|0,0,180)|0;return}function Gc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;b=c[(c[a+4>>2]|0)+28>>2]|0;d=b+2868|0;e=c[c[a+104>>2]>>2]|0;f=e+168|0;g=e+8|0;h=c[g>>2]|0;i=(c[f>>2]|0)/(h|0)|0;j=(c[a+20>>2]|0)/(h|0)|0;h=j-4|0;k=(i|0)<0?0:i;i=j+2|0;j=e+164|0;if((i|0)>(c[j>>2]|0)){c[j>>2]=i;j=e+160|0;c[j>>2]=ag(c[j>>2]|0,i<<2)|0}if((k|0)<(h|0)){i=e+156|0;j=e|0;l=e+160|0;m=a+8|0;n=e+40|0;o=e+152|0;p=k;while(1){k=(c[i>>2]|0)+1|0;c[i>>2]=(k|0)>24?24:k;do{if((c[j>>2]|0)>0){k=0;q=0;do{r=(c[(c[m>>2]|0)+(q<<2)>>2]|0)+((ca(c[g>>2]|0,p)|0)<<2)|0;k=Hc(e,d,r,n,(c[o>>2]|0)+((q*7|0)*144|0)|0)|0|k;q=q+1|0;}while((q|0)<(c[j>>2]|0));q=c[l>>2]|0;c[q+(p+2<<2)>>2]=0;if((k&1|0)!=0){c[q+(p<<2)>>2]=1;c[q+(p+1<<2)>>2]=1}do{if((k&2|0)!=0){c[q+(p<<2)>>2]=1;if((p|0)<=0){break}c[q+(p-1<<2)>>2]=1}}while(0);if((k&4|0)==0){break}c[i>>2]=-1}else{c[(c[l>>2]|0)+(p+2<<2)>>2]=0}}while(0);q=p+1|0;if((q|0)<(h|0)){p=q}else{s=l;break}}}else{s=e+160|0}l=c[g>>2]|0;g=ca(l,h)|0;c[f>>2]=g;f=c[a+48>>2]|0;h=((c[b+(c[a+40>>2]<<2)>>2]|0)/4|0)+f+((c[b+4>>2]|0)/2|0)+((c[b>>2]|0)/4|0)|0;b=e+176|0;a=g-l|0;g=c[b>>2]|0;while(1){if((g|0)>=(a|0)){t=-1;u=22;break}if((g|0)>=(h|0)){t=1;u=22;break}c[b>>2]=g;if((c[(c[s>>2]|0)+(((g|0)/(l|0)|0)<<2)>>2]|0)!=0&(g|0)>(f|0)){u=21;break}else{g=l+g|0}}if((u|0)==21){c[e+172>>2]=g;t=0;return t|0}else if((u|0)==22){return t|0}return 0}function Hc(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var h=0,j=0,k=0.0,l=0,m=0,n=0,o=0,p=0,q=0.0,r=0.0,s=0.0,t=0.0,u=0.0,v=0.0,w=0.0,x=0,y=0,z=0.0,A=0,B=0.0,C=0.0,D=0.0;h=i;j=c[a+4>>2]|0;k=+g[a+12>>2];l=i;i=i+(j<<2)|0;i=i+7&-8;m=l;n=c[a+156>>2]|0;o=(n|0)/2|0;p=(n|0)>5?o:2;q=+g[b+60>>2];r=q- +(o-2|0);s=r<0.0?0.0:r;r=s>q?q:s;if((j|0)>0){o=c[a+36>>2]|0;n=0;do{g[m+(n<<2)>>2]=+g[d+(n<<2)>>2]*+g[o+(n<<2)>>2];n=n+1|0;}while((n|0)<(j|0))}dc(a+16|0,m,m);s=+g[m>>2];q=+g[l+4>>2];t=+g[l+8>>2];u=s*s+q*q*.7+t*t*.2;l=f+140|0;a=c[l>>2]|0;if((a|0)==0){n=f+136|0;t=u+ +g[n>>2];g[f+132>>2]=t;g[n>>2]=u;v=t}else{n=f+132|0;t=u+ +g[n>>2];g[n>>2]=t;n=f+136|0;g[n>>2]=u+ +g[n>>2];v=t}n=f+72+(a<<2)|0;g[f+132>>2]=v- +g[n>>2];g[n>>2]=u;n=(c[l>>2]|0)+1|0;c[l>>2]=(n|0)>14?0:n;n=(j|0)/2|0;a:do{if((j|0)>1){u=+Kc(v*.0625)*.5+-15.0;l=0;t=s;while(1){q=+g[m+((l|1)<<2)>>2];w=+Kc(t*t+q*q)*.5;q=w<u?u:w;g[m+(l>>1<<2)>>2]=q<k?k:q;a=l+2|0;if((a|0)>=(n|0)){break a}u=u+-8.0;l=a;t=+g[m+(a<<2)>>2]}}}while(0);n=(p|0)>0;j=0;l=0;do{a=c[e+(j<<4)+4>>2]|0;if((a|0)>0){o=c[e+(j<<4)>>2]|0;d=c[e+(j<<4)+8>>2]|0;k=0.0;x=0;while(1){s=k+ +g[m+(o+x<<2)>>2]*+g[d+(x<<2)>>2];y=x+1|0;if((y|0)<(a|0)){k=s;x=y}else{z=s;break}}}else{z=0.0}k=z*+g[e+(j<<4)+12>>2];x=f+(j*144|0)+68|0;a=c[x>>2]|0;d=a-1|0;o=(d|0)<0?a+16|0:d;s=+g[f+(j*144|0)+(o<<2)>>2];v=k<s?s:k;t=k>s?s:k;if(n){d=o;o=0;s=-99999.0;u=99999.0;while(1){y=d-1|0;A=(y|0)<0?d+16|0:y;q=+g[f+(j*144|0)+(A<<2)>>2];w=s<q?q:s;B=u>q?q:u;y=o+1|0;if((y|0)<(p|0)){d=A;o=y;s=w;u=B}else{C=w;D=B;break}}}else{C=-99999.0;D=99999.0}g[f+(j*144|0)+(a<<2)>>2]=k;o=(c[x>>2]|0)+1|0;c[x>>2]=(o|0)>16?0:o;o=v-C>r+ +g[b+4+(j<<2)>>2]?l|5:l;l=t-D<+g[b+32+(j<<2)>>2]-r?o|2:o;j=j+1|0;}while((j|0)<7);i=h;return l|0}function Ic(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0;b=c[c[a+104>>2]>>2]|0;d=c[(c[a+4>>2]|0)+28>>2]|0;e=c[a+48>>2]|0;f=c[a+40>>2]|0;g=d;h=(c[g+(f<<2)>>2]|0)/4|0;if((f|0)==0){f=(c[d>>2]|0)/4|0;i=f;j=f}else{i=(c[g+(c[a+36>>2]<<2)>>2]|0)/4|0;j=(c[g+(c[a+44>>2]<<2)>>2]|0)/4|0}a=e-h-i|0;i=h+e+j|0;j=c[b+172>>2]|0;if((j|0)>=(a|0)&(j|0)<(i|0)){k=1;return k|0}j=c[b+8>>2]|0;e=(i|0)/(j|0)|0;i=b+160|0;b=(a|0)/(j|0)|0;while(1){if((b|0)>=(e|0)){k=0;l=8;break}if((c[(c[i>>2]|0)+(b<<2)>>2]|0)==0){b=b+1|0}else{k=1;l=8;break}}if((l|0)==8){return k|0}return 0}function Jc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0;d=a+168|0;e=c[a+8>>2]|0;f=(b|0)/(e|0)|0;g=c[a+160>>2]|0;pg(g|0,g+(f<<2)|0,((c[d>>2]|0)/(e|0)|0)+2-f<<2|0)|0;c[d>>2]=(c[d>>2]|0)-b;d=a+172|0;f=c[d>>2]|0;if(!((f|0)>-1)){h=a+176|0;i=c[h>>2]|0;j=i-b|0;c[h>>2]=j;return}c[d>>2]=f-b;h=a+176|0;i=c[h>>2]|0;j=i-b|0;c[h>>2]=j;return}function Kc(a){a=+a;return+(+(((g[k>>2]=a,c[k>>2]|0)&2147483647)>>>0>>>0)*7.177114298428933e-7+ -764.6162109375)}function Lc(a,b,d,e,f,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0;i=(f|0)!=0;j=i?e:0;e=i?h:0;h=c[32648+(c[b+(j<<2)>>2]<<2)>>2]|0;i=c[32648+(c[b+(e<<2)>>2]<<2)>>2]|0;b=c[d+(f<<2)>>2]|0;f=c[d+(j<<2)>>2]|0;j=c[d+(e<<2)>>2]|0;e=(b|0)/4|0;d=e-((f|0)/4|0)|0;k=d+((f|0)/2|0)|0;f=((b|0)/2|0)+e+((j|0)/-4|0)|0;e=(j|0)/2|0;l=f+e|0;if((d|0)>0){og(a|0,0,d<<2|0)|0;m=d}else{m=0}if((m|0)<(k|0)){d=m;m=0;while(1){n=a+(d<<2)|0;g[n>>2]=+g[h+(m<<2)>>2]*+g[n>>2];n=d+1|0;if((n|0)<(k|0)){d=n;m=m+1|0}else{break}}}if((j|0)>1){j=f+1|0;m=(l|0)>(j|0);d=f;k=e;do{k=k-1|0;e=a+(d<<2)|0;g[e>>2]=+g[i+(k<<2)>>2]*+g[e>>2];d=d+1|0;}while((d|0)<(l|0));o=m?l:j}else{o=f}if((o|0)>=(b|0)){return}og(a+(o<<2)|0,0,b-o<<2|0)|0;return}function Mc(a,b,d,e,f,h,i,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;i=+i;j=+j;var k=0.0,l=0,m=0.0,n=0,o=0,p=0.0,q=0.0,r=0.0,s=0.0,t=0,u=0,v=0.0,w=0.0,x=0.0,y=0.0,z=0,A=0;k=3.141592653589793/+(e|0);if((h|0)>0){e=0;do{l=f+(e<<2)|0;g[l>>2]=+U(+g[l>>2])*2.0;e=e+1|0;}while((e|0)<(h|0))}if((d|0)<=0){return}e=(h|0)>1;m=i;i=j;l=0;while(1){n=c[b+(l<<2)>>2]|0;j=+U(k*+(n|0))*2.0;if(e){o=1;p=.5;q=.5;while(1){r=q*(j- +g[f+(o-1<<2)>>2]);s=p*(j- +g[f+(o<<2)>>2]);t=o+2|0;if((t|0)<(h|0)){o=t;p=s;q=r}else{u=t;v=s;w=r;break}}}else{u=1;v=.5;w=.5}if((u|0)==(h|0)){q=w*(j- +g[f+(h-1<<2)>>2]);x=q*q;y=4.0-j*j}else{x=w*(j+2.0)*w;y=2.0-j}q=+$((m/+S(x+v*v*y)-i)*.1151292473077774);o=a+(l<<2)|0;g[o>>2]=+g[o>>2]*q;o=l+1|0;if((c[b+(o<<2)>>2]|0)==(n|0)){t=o;while(1){z=a+(t<<2)|0;g[z>>2]=q*+g[z>>2];z=t+1|0;if((c[b+(z<<2)>>2]|0)==(n|0)){t=z}else{A=z;break}}}else{A=o}if((A|0)<(d|0)){l=A}else{break}}return}function Nc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,j=0,k=0,l=0,m=0.0,n=0.0,o=0.0,p=0,q=0.0,r=0,s=0.0,t=0.0,u=0.0,v=0,w=0,x=0.0,y=0,z=0,A=0.0,B=0,C=0.0,D=0,E=0.0,F=0;e=i;f=d+1|0;j=i;i=i+(f<<3)|0;i=i+7&-8;k=j;j=i;i=i+(d<<3)|0;i=i+7&-8;l=j;if((f|0)==0){m=0.0}else{f=d;while(1){if((f|0)<(c|0)){n=0.0;j=f;while(1){o=n+ +g[a+(j<<2)>>2]*+g[a+(j-f<<2)>>2];p=j+1|0;if((p|0)<(c|0)){n=o;j=p}else{q=o;break}}}else{q=0.0}h[k+(f<<3)>>3]=q;if((f|0)==0){break}else{f=f-1|0}}m=+h[k>>3]}q=m*1.0000000001;n=m*1.0e-9+1.0e-10;f=(d|0)>0;if(f){r=0;s=q}else{t=q;u=t;i=e;return+u}while(1){c=r+1|0;if(s<n){v=8;break}q=-0.0- +h[k+(c<<3)>>3];do{if((r|0)>0){a=0;m=q;do{m=m- +h[l+(a<<3)>>3]*+h[k+(r-a<<3)>>3];a=a+1|0;}while((a|0)<(r|0));o=m/s;h[l+(r<<3)>>3]=o;a=(r|0)/2|0;if((r|0)<=1){w=0;x=o;break}j=r-1|0;p=(a|0)>1;y=0;do{z=l+(y<<3)|0;A=+h[z>>3];B=l+(j-y<<3)|0;h[z>>3]=A+o*+h[B>>3];h[B>>3]=o*A+ +h[B>>3];y=y+1|0;}while((y|0)<(a|0));w=p?a:1;x=o}else{m=q/s;h[l+(r<<3)>>3]=m;w=0;x=m}}while(0);if((r&1|0)!=0){y=l+(w<<3)|0;q=+h[y>>3];h[y>>3]=q+x*q}q=s*(1.0-x*x);if((c|0)<(d|0)){r=c;s=q}else{C=q;break}}if((v|0)==8){og(l+(r<<3)|0,0,d-r<<3|0)|0;C=s}if(f){D=0;E=.99}else{t=C;u=t;i=e;return+u}while(1){r=l+(D<<3)|0;h[r>>3]=E*+h[r>>3];r=D+1|0;if((r|0)>=(d|0)){break}D=r;E=E*.99}if(f){F=0}else{t=C;u=t;i=e;return+u}while(1){g[b+(F<<2)>>2]=+h[l+(F<<3)>>3];f=F+1|0;if((f|0)<(d|0)){F=f}else{t=C;break}}u=t;i=e;return+u}function Oc(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0.0,p=0,q=0.0,r=0,s=0,t=0.0;f=i;h=b;j=i;i=i+(e+c<<2)|0;i=i+7&-8;k=j;l=(c|0)>0;do{if((b|0)==0){if(!l){break}og(j|0,0,c<<2|0)|0}else{if(!l){break}kg(j|0,h|0,c<<2)|0}}while(0);if((e|0)<=0){i=f;return}h=(c|0)>0;j=0;l=c;while(1){if(h){b=0;m=j;n=c;o=0.0;while(1){p=n-1|0;q=o- +g[k+(m<<2)>>2]*+g[a+(p<<2)>>2];r=b+1|0;if((r|0)<(c|0)){b=r;m=m+1|0;n=p;o=q}else{s=l;t=q;break}}}else{s=j;t=0.0}g[k+(s<<2)>>2]=t;g[d+(j<<2)>>2]=t;n=j+1|0;if((n|0)<(e|0)){j=n;l=l+1|0}else{break}}i=f;return}function Pc(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=(c[a+104>>2]|0)+12|0;og(a+88|0,0,16)|0;e=0;do{Ef(c[d+(e<<2)>>2]|0);e=e+1|0;}while((e|0)<15);e=sb[c[(c[50528]|0)+12>>2]&7](a)|0;if((e|0)!=0){f=e;return f|0}if((b|0)==0){f=0;return f|0}if((Ue(a)|0)!=0){f=-131;return f|0}e=a+4|0;c[b>>2]=Jf(e)|0;c[b+4>>2]=If(e)|0;c[b+8>>2]=0;c[b+12>>2]=c[a+44>>2];e=a+48|0;d=c[e+4>>2]|0;g=b+16|0;c[g>>2]=c[e>>2];c[g+4>>2]=d;d=a+56|0;a=c[d+4>>2]|0;g=b+24|0;c[g>>2]=c[d>>2];c[g+4>>2]=a;f=0;return f|0}function Qc(a){a=a|0;var b=0,d=0;b=(c[a+28>>2]|0)+2868|0;d=$f(1,36)|0;c[d+4>>2]=c[a+4>>2];g[d>>2]=-9999.0;c[d+8>>2]=b;return d|0}function Rc(a){a=a|0;if((a|0)==0){return}_f(a);return}function Sc(a){a=a|0;if((a|0)==0){return}_f(a);return}function Tc(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var h=0,i=0.0,j=0.0,k=0.0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0.0,u=0.0,v=0,w=0,x=0.0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;og(a|0,0,48)|0;h=d|0;c[a+36>>2]=c[h>>2];d=c[h>>2]|0;h=~~(+xa(+(+aa(+(d|0)*8.0)/.6931471805599453))+-1.0);c[a+32>>2]=h;i=+(f|0);j=+(e|0);k=+(1<<h+1|0);h=~~((+aa(i*.25*.5/j)*1.4426950216293335+ -5.965784072875977)*k- +(d|0));c[a+28>>2]=h;c[a+40>>2]=1-h+~~((+aa((+(e|0)+.25)*i*.5/j)*1.4426950216293335+ -5.965784072875977)*k+.5);h=e<<2;d=Zf(h)|0;c[a+16>>2]=d;l=Zf(h)|0;c[a+20>>2]=l;m=Zf(h)|0;c[a+24>>2]=m;n=a+4|0;c[n>>2]=b;c[a>>2]=e;c[a+44>>2]=f;o=a+48|0;g[o>>2]=1.0;do{if((f|0)<26e3){g[o>>2]=0.0}else{if((f|0)<38e3){g[o>>2]=.9399999976158142;break}if((f|0)<=46e3){break}g[o>>2]=1.274999976158142}}while(0);i=+(f|0);o=0;p=0;a:while(1){q=o;while(1){if((q|0)>=87){break a}r=q+1|0;s=~~+xa(+(j*+$((+(r|0)*.125+-2.0+5.965784072875977)*.6931470036506653)*2.0/i));t=+g[246136+(q<<2)>>2];if((p|0)<(s|0)){break}else{q=r}}u=(+g[246136+(r<<2)>>2]-t)/+(s-p|0);if((p|0)>=(e|0)){o=r;p=p;continue}q=p-s|0;v=p-e|0;w=q>>>0>v>>>0?q:v;x=t;v=p;while(1){g[d+(v<<2)>>2]=x+100.0;q=v+1|0;if((q|0)<(s|0)&(q|0)<(e|0)){x=u+x;v=q}else{break}}o=r;p=p-w|0}if((p|0)<(e|0)){r=p;do{g[d+(r<<2)>>2]=+g[d+(r-1<<2)>>2];r=r+1|0;}while((r|0)<(e|0))}r=(e|0)>0;do{if(r){d=(f|0)/(e<<1|0)|0;p=c[b+120>>2]|0;o=b+112|0;s=b+124|0;v=b+116|0;q=1;y=-99;z=0;while(1){A=ca(d,z)|0;t=+(A|0);x=+Z(t*.0007399999885819852)*13.100000381469727+ +Z(+(ca(A,A)|0)*1.8499999754340024e-8)*2.240000009536743+t*9999999747378752.0e-20;A=y;while(1){if((p+A|0)>=(z|0)){break}B=ca(A,d)|0;t=+(B|0);u=t*9999999747378752.0e-20+(+Z(t*.0007399999885819852)*13.100000381469727+ +Z(+(ca(B,B)|0)*1.8499999754340024e-8)*2.240000009536743);if(u<x- +g[o>>2]){A=A+1|0}else{break}}b:do{if((q|0)>(e|0)){C=q}else{B=(c[s>>2]|0)+z|0;D=q;while(1){if((D|0)>=(B|0)){E=ca(D,d)|0;u=+(E|0);t=u*9999999747378752.0e-20+(+Z(u*.0007399999885819852)*13.100000381469727+ +Z(+(ca(E,E)|0)*1.8499999754340024e-8)*2.240000009536743);if(!(t<x+ +g[v>>2])){C=D;break b}}E=D+1|0;if((E|0)>(e|0)){C=E;break}else{D=E}}}}while(0);c[m+(z<<2)>>2]=(A<<16)-65537+C;D=z+1|0;if((D|0)<(e|0)){q=C;y=A;z=D}else{break}}if(r){F=0}else{break}do{c[l+(F<<2)>>2]=~~((+aa(i*(+(F|0)+.25)*.5/j)*1.4426950216293335+ -5.965784072875977)*k+.5);F=F+1|0;}while((F|0)<(e|0))}}while(0);c[a+8>>2]=Uc(b+36|0,i*.5/j,e,+g[b+24>>2],+g[b+28>>2])|0;b=Zf(12)|0;F=b;c[a+12>>2]=F;c[F>>2]=Zf(h)|0;c[b+4>>2]=Zf(h)|0;c[b+8>>2]=Zf(h)|0;if(!r){return}k=j*2.0;r=c[n>>2]|0;n=0;do{j=(+aa(i*(+(n|0)+.5)/k)*1.4426950216293335+ -5.965784072875977)*2.0;x=j<0.0?0.0:j;j=x<16.0?x:16.0;h=~~j;x=j- +(h|0);j=1.0-x;b=h+1|0;a=0;do{g[(c[F+(a<<2)>>2]|0)+(n<<2)>>2]=j*+g[r+132+(a*68|0)+(h<<2)>>2]+x*+g[r+132+(a*68|0)+(b<<2)>>2];a=a+1|0;}while((a|0)<3);n=n+1|0;}while((n|0)<(e|0));return}function Uc(a,b,d,e,f){a=a|0;b=+b;d=d|0;e=+e;f=+f;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0.0,x=0,y=0.0,z=0.0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;h=i;i=i+32480|0;j=h|0;k=h+224|0;l=h+30688|0;m=i;i=i+(d<<2)|0;i=i+7&-8;n=Zf(68)|0;og(k|0,0,30464)|0;o=e>0.0;p=e<0.0;q=j;r=0;do{s=r<<2;t=0;do{u=t+s|0;v=0;w=999.0;while(1){x=u+v|0;do{if((x|0)<88){y=+g[246136+(x<<2)>>2];if(!(w>y)){z=w;break}z=y}else{if(!(w>-30.0)){z=w;break}z=-30.0}}while(0);x=v+1|0;if((x|0)<4){v=x;w=z}else{break}}g[j+(t<<2)>>2]=z;t=t+1|0;}while((t|0)<56);t=33e3+(r*1344|0)|0;kg(k+(r*1792|0)+448|0,t|0,224)|0;kg(k+(r*1792|0)+672|0,33224+(r*1344|0)|0,224)|0;kg(k+(r*1792|0)+896|0,33448+(r*1344|0)|0,224)|0;kg(k+(r*1792|0)+1120|0,33672+(r*1344|0)|0,224)|0;kg(k+(r*1792|0)+1344|0,33896+(r*1344|0)|0,224)|0;kg(k+(r*1792|0)+1568|0,34120+(r*1344|0)|0,224)|0;kg(k+(r*1792|0)|0,t|0,224)|0;kg(k+(r*1792|0)+224|0,t|0,224)|0;t=0;do{s=0;do{v=16-s|0;w=+(((v|0)>-1?v:-v|0)|0)*f+e;y=w<0.0&o?0.0:w;v=k+(r*1792|0)+(t*224|0)+(s<<2)|0;g[v>>2]=(y>0.0&p?0.0:y)+ +g[v>>2];s=s+1|0;}while((s|0)<56);t=t+1|0;}while((t|0)<8);t=a+(r<<2)|0;s=0;while(1){v=k+(r*1792|0)+(s*224|0)|0;id(v,+g[t>>2]+100.0-((s|0)<2?20.0:+(s|0)*10.0)+-30.0);u=l+(s*224|0)|0;kg(u|0,q|0,224)|0;x=u|0;id(x,100.0- +(s|0)*10.0+-30.0);jd(x,v);v=s+1|0;if((v|0)<8){s=v}else{A=1;break}}do{s=l+(A*224|0)|0;kd(s,l+((A-1|0)*224|0)|0);kd(k+(r*1792|0)+(A*224|0)|0,s);A=A+1|0;}while((A|0)<8);r=r+1|0;}while((r|0)<17);r=m;m=n;e=b;n=(d|0)>0;A=~d;l=0;do{q=Zf(32)|0;c[m+(l<<2)>>2]=q;f=+(l|0)*.5;a=~~+Q(+$((f+5.965784072875977)*.6931470036506653)/e);p=~~+ba((+aa(+(a|0)*b+1.0)*1.4426950216293335+ -5.965784072875977)*2.0);o=~~+Q((+aa(+(a+1|0)*b)*1.4426950216293335+ -5.965784072875977)*2.0);a=(p|0)>(l|0)?l:p;p=(a|0)<0?0:a;a=(o|0)>16?16:o;o=(p|0)>(a|0);l=l+1|0;j=(l|0)<17;s=0;do{t=Zf(232)|0;v=t;c[q+(s<<2)>>2]=v;if(n){x=0;do{g[r+(x<<2)>>2]=999.0;x=x+1|0;}while((x|0)<(d|0))}if(!o){x=p;do{z=+(x|0)*.5;u=0;B=0;while(1){y=z+ +(u|0)*.125;C=~~(+$((y+ -2.0625+5.965784072875977)*.6931470036506653)/e);D=~~(+$((y+ -1.9375+5.965784072875977)*.6931470036506653)/e+1.0);E=(C|0)<0?0:C;F=(E|0)>(d|0)?d:E;E=(F|0)<(B|0)?F:B;F=(D|0)<0?0:D;G=(F|0)>(d|0)?d:F;if((E|0)<(G|0)&(E|0)<(d|0)){y=+g[k+(x*1792|0)+(s*224|0)+(u<<2)>>2];F=~B;H=(F|0)>(A|0)?F:A;F=(C|0)>0?~C:-1;C=(H|0)>(F|0)?H:F;F=(D|0)>0?~D:-1;D=((F|0)<(A|0)?A:F)-C|0;F=~(C+d);H=D>>>0>F>>>0?D:F;F=E;do{D=r+(F<<2)|0;if(+g[D>>2]>y){g[D>>2]=y}F=F+1|0;}while((F|0)<(G|0)&(F|0)<(d|0));I=~C-H|0}else{I=E}F=u+1|0;if((F|0)<56){u=F;B=I}else{break}}if((I|0)<(d|0)){z=+g[k+(x*1792|0)+(s*224|0)+220>>2];B=I;do{u=r+(B<<2)|0;if(+g[u>>2]>z){g[u>>2]=z}B=B+1|0;}while((B|0)<(d|0))}x=x+1|0;}while((x|0)<=(a|0))}do{if(j){x=0;B=0;while(1){z=f+ +(x|0)*.125;u=~~(+$((z+ -2.0625+5.965784072875977)*.6931470036506653)/e);F=~~(+$((z+ -1.9375+5.965784072875977)*.6931470036506653)/e+1.0);G=(u|0)<0?0:u;D=(G|0)>(d|0)?d:G;G=(D|0)<(B|0)?D:B;D=(F|0)<0?0:F;J=(D|0)>(d|0)?d:D;if((G|0)<(J|0)&(G|0)<(d|0)){z=+g[k+(l*1792|0)+(s*224|0)+(x<<2)>>2];D=~B;K=(D|0)>(A|0)?D:A;D=(u|0)>0?~u:-1;u=(K|0)>(D|0)?K:D;D=(F|0)>0?~F:-1;F=((D|0)<(A|0)?A:D)-u|0;D=~(u+d);K=F>>>0>D>>>0?F:D;D=G;do{F=r+(D<<2)|0;if(+g[F>>2]>z){g[F>>2]=z}D=D+1|0;}while((D|0)<(J|0)&(D|0)<(d|0));L=~u-K|0}else{L=G}D=x+1|0;if((D|0)<56){x=D;B=L}else{break}}if((L|0)>=(d|0)){M=0;break}z=+g[k+(l*1792|0)+(s*224|0)+220>>2];B=L;while(1){x=r+(B<<2)|0;if(+g[x>>2]>z){g[x>>2]=z}x=B+1|0;if((x|0)<(d|0)){B=x}else{M=0;break}}}else{M=0}}while(0);while(1){B=~~(+$((f+ +(M|0)*.125+-2.0+5.965784072875977)*.6931470036506653)/e);do{if((B|0)<0){x=c[q+(s<<2)>>2]|0;g[x+(M+2<<2)>>2]=-999.0;N=x}else{if((B|0)<(d|0)){g[v+(M+2<<2)>>2]=+g[r+(B<<2)>>2];N=v;break}else{g[v+(M+2<<2)>>2]=-999.0;N=v;break}}}while(0);B=M+1|0;if((B|0)<56){M=B}else{O=0;break}}while(1){if((O|0)>=16){break}if(+g[N+(O+2<<2)>>2]>-200.0){break}else{O=O+1|0}}g[v>>2]=+(O|0);B=55;while(1){if((B|0)<=17){break}if(+g[(c[q+(s<<2)>>2]|0)+(B+2<<2)>>2]>-200.0){break}else{B=B-1|0}}g[t+4>>2]=+(B|0);s=s+1|0;}while((s|0)<8)}while(j);i=h;return m|0}function Vc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;if((a|0)==0){return}b=c[a+16>>2]|0;if((b|0)!=0){_f(b)}b=c[a+20>>2]|0;if((b|0)!=0){_f(b)}b=c[a+24>>2]|0;if((b|0)!=0){_f(b)}b=a+8|0;d=c[b>>2]|0;if((d|0)!=0){e=0;f=d;do{d=0;g=c[f+(e<<2)>>2]|0;do{_f(c[g+(d<<2)>>2]|0);d=d+1|0;g=c[(c[b>>2]|0)+(e<<2)>>2]|0}while((d|0)<8);_f(g);e=e+1|0;f=c[b>>2]|0}while((e|0)<17);_f(f)}f=a+12|0;e=c[f>>2]|0;if((e|0)!=0){_f(c[e>>2]|0);_f(c[(c[f>>2]|0)+4>>2]|0);_f(c[(c[f>>2]|0)+8>>2]|0);_f(c[f>>2]|0)}og(a|0,0,52)|0;return}function Wc(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,m=0;e=i;f=c[a>>2]|0;h=i;i=i+(f<<2)|0;i=i+7&-8;j=h;h=a+24|0;Xc(f,c[h>>2]|0,b,d,140.0,-1);k=(f|0)>0;if(k){l=0;do{g[j+(l<<2)>>2]=+g[b+(l<<2)>>2]- +g[d+(l<<2)>>2];l=l+1|0;}while((l|0)<(f|0))}l=a+4|0;Xc(f,c[h>>2]|0,j,d,0.0,c[(c[l>>2]|0)+128>>2]|0);if(k){m=0}else{i=e;return}do{h=j+(m<<2)|0;g[h>>2]=+g[b+(m<<2)>>2]- +g[h>>2];m=m+1|0;}while((m|0)<(f|0));if(!k){i=e;return}k=c[l>>2]|0;l=0;do{m=d+(l<<2)|0;b=~~(+g[m>>2]+.5);h=(b|0)>39?39:b;g[m>>2]=+g[j+(l<<2)>>2]+ +g[k+336+(((h|0)<0?0:h)<<2)>>2];l=l+1|0;}while((l|0)<(f|0));i=e;return}function Xc(a,b,d,e,f,h){a=a|0;b=b|0;d=d|0;e=e|0;f=+f;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0.0,r=0.0,s=0.0,t=0.0,u=0.0,v=0.0,w=0.0,x=0.0,y=0.0,z=0.0,A=0.0,B=0.0,C=0.0,D=0,E=0,F=0.0,G=0.0,H=0.0,I=0.0,J=0,K=0,L=0,M=0,N=0,O=0.0,P=0.0,Q=0.0,R=0.0,S=0,T=0.0,U=0.0,V=0.0,W=0.0,X=0.0,Y=0.0,Z=0.0,_=0.0,$=0.0,aa=0.0,ba=0,ca=0.0,da=0.0,ea=0.0,fa=0.0,ga=0,ha=0.0;j=i;k=a<<2;l=i;i=i+k|0;i=i+7&-8;m=l;l=i;i=i+k|0;i=i+7&-8;n=l;l=i;i=i+k|0;i=i+7&-8;o=l;l=i;i=i+k|0;i=i+7&-8;p=l;l=i;i=i+k|0;i=i+7&-8;k=l;q=+g[d>>2]+f;r=q<1.0?1.0:q;q=r*r*.5;s=q+0.0;t=r*q+0.0;g[m>>2]=s;g[n>>2]=s;g[o>>2]=0.0;g[p>>2]=t;g[k>>2]=0.0;if((a|0)>1){q=s;r=s;s=0.0;u=t;t=0.0;l=1;v=1.0;while(1){w=+g[d+(l<<2)>>2]+f;x=w<1.0?1.0:w;w=x*x;y=q+w;z=v*w;A=r+z;B=s+v*z;C=u+x*w;w=t+x*z;g[m+(l<<2)>>2]=y;g[n+(l<<2)>>2]=A;g[o+(l<<2)>>2]=B;g[p+(l<<2)>>2]=C;g[k+(l<<2)>>2]=w;D=l+1|0;if((D|0)<(a|0)){q=y;r=A;s=B;u=C;t=w;l=D;v=v+1.0}else{break}}}l=c[b>>2]|0;d=l>>16;if((d|0)>-1){E=0;F=0.0;G=0.0;H=1.0;I=0.0;J=l}else{D=0;v=0.0;K=l;l=d;while(1){d=K&65535;L=-l|0;t=+g[m+(d<<2)>>2]+ +g[m+(L<<2)>>2];u=+g[n+(d<<2)>>2]- +g[n+(L<<2)>>2];s=+g[o+(d<<2)>>2]+ +g[o+(L<<2)>>2];r=+g[p+(d<<2)>>2]+ +g[p+(L<<2)>>2];q=+g[k+(d<<2)>>2]- +g[k+(L<<2)>>2];w=s*r-u*q;C=t*q-u*r;r=t*s-u*u;u=(w+v*C)/r;g[e+(D<<2)>>2]=(u<0.0?0.0:u)-f;L=D+1|0;u=v+1.0;d=c[b+(L<<2)>>2]|0;M=d>>16;if((M|0)>-1){E=L;F=w;G=C;H=r;I=u;J=d;break}else{D=L;v=u;K=d;l=M}}}l=J&65535;if((l|0)<(a|0)){K=E;v=I;D=J;J=l;while(1){l=D>>16;u=+g[m+(J<<2)>>2]- +g[m+(l<<2)>>2];r=+g[n+(J<<2)>>2]- +g[n+(l<<2)>>2];C=+g[o+(J<<2)>>2]- +g[o+(l<<2)>>2];w=+g[p+(J<<2)>>2]- +g[p+(l<<2)>>2];s=+g[k+(J<<2)>>2]- +g[k+(l<<2)>>2];t=C*w-r*s;q=u*s-r*w;w=u*C-r*r;r=(t+v*q)/w;g[e+(K<<2)>>2]=(r<0.0?0.0:r)-f;l=K+1|0;r=v+1.0;M=c[b+(l<<2)>>2]|0;d=M&65535;if((d|0)<(a|0)){K=l;v=r;D=M;J=d}else{N=l;O=t;P=q;Q=w;R=r;break}}}else{N=E;O=F;P=G;Q=H;R=I}if((N|0)<(a|0)){E=N;I=R;while(1){R=(O+P*I)/Q;g[e+(E<<2)>>2]=(R<0.0?0.0:R)-f;N=E+1|0;if((N|0)<(a|0)){E=N;I=I+1.0}else{break}}}if((h|0)<1){i=j;return}E=(h|0)/2|0;N=E-h|0;if((N|0)>-1){S=0;T=O;U=P;V=Q;W=0.0}else{J=0;Q=0.0;D=E;K=N;do{N=-K|0;P=+g[m+(D<<2)>>2]+ +g[m+(N<<2)>>2];O=+g[n+(D<<2)>>2]- +g[n+(N<<2)>>2];I=+g[o+(D<<2)>>2]+ +g[o+(N<<2)>>2];R=+g[p+(D<<2)>>2]+ +g[p+(N<<2)>>2];H=+g[k+(D<<2)>>2]- +g[k+(N<<2)>>2];X=I*R-O*H;Y=P*H-O*R;Z=P*I-O*O;O=(X+Q*Y)/Z-f;N=e+(J<<2)|0;if(O<+g[N>>2]){g[N>>2]=O}J=J+1|0;Q=Q+1.0;D=E+J|0;K=D-h|0;}while(!((K|0)>-1));S=h-E|0;T=X;U=Y;V=Z;W=Q}K=S+E|0;if((K|0)<(a|0)){D=S;Q=W;J=K;do{K=J-h|0;Z=+g[m+(J<<2)>>2]- +g[m+(K<<2)>>2];Y=+g[n+(J<<2)>>2]- +g[n+(K<<2)>>2];X=+g[o+(J<<2)>>2]- +g[o+(K<<2)>>2];O=+g[p+(J<<2)>>2]- +g[p+(K<<2)>>2];I=+g[k+(J<<2)>>2]- +g[k+(K<<2)>>2];_=X*O-Y*I;$=Z*I-Y*O;aa=Z*X-Y*Y;Y=(_+Q*$)/aa-f;K=e+(D<<2)|0;if(Y<+g[K>>2]){g[K>>2]=Y}D=D+1|0;Q=Q+1.0;J=D+E|0;}while((J|0)<(a|0));ba=a-E|0;ca=_;da=$;ea=aa;fa=Q}else{ba=S;ca=T;da=U;ea=V;fa=W}if((ba|0)<(a|0)){ga=ba;ha=fa}else{i=j;return}while(1){fa=(ca+da*ha)/ea-f;ba=e+(ga<<2)|0;if(fa<+g[ba>>2]){g[ba>>2]=fa}ba=ga+1|0;if((ba|0)<(a|0)){ga=ba;ha=ha+1.0}else{break}}i=j;return}function Yc(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=+e;f=+f;var h=0,j=0,k=0,l=0,m=0,n=0.0,o=0,p=0.0,q=0,r=0;h=i;j=c[a>>2]|0;k=c[a+40>>2]|0;l=i;i=i+(k<<2)|0;i=i+7&-8;m=l;l=c[a+4>>2]|0;n=+g[l+4>>2]+f;if((k|0)>0){o=0;do{g[m+(o<<2)>>2]=-9999.0;o=o+1|0;}while((o|0)<(k|0))}f=+g[l+8>>2];p=n<f?f:n;if((j|0)<=0){q=a+8|0;r=c[q>>2]|0;Zc(a,r,b,d,m,e);_c(a,m,d);i=h;return}l=c[a+16>>2]|0;k=0;do{g[d+(k<<2)>>2]=p+ +g[l+(k<<2)>>2];k=k+1|0;}while((k|0)<(j|0));q=a+8|0;r=c[q>>2]|0;Zc(a,r,b,d,m,e);_c(a,m,d);i=h;return}function Zc(a,b,d,e,f,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;h=+h;var i=0,j=0.0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0.0,w=0;i=c[a>>2]|0;j=+g[(c[a+4>>2]|0)+496>>2]-h;if((i|0)<=0){return}k=a+20|0;l=a+32|0;m=a+28|0;n=a+40|0;o=a+36|0;a=0;while(1){p=c[k>>2]|0;q=c[p+(a<<2)>>2]|0;h=+g[d+(a<<2)>>2];r=a;a:while(1){s=r;while(1){t=s+1|0;u=(t|0)<(i|0);if(!u){break a}if((c[p+(t<<2)>>2]|0)!=(q|0)){break a}v=+g[d+(t<<2)>>2];if(v>h){h=v;r=t;continue a}else{s=t}}}if(h+6.0>+g[e+(s<<2)>>2]){r=q>>c[l>>2];w=(r|0)>16?16:r;hd(f,c[b+(((w|0)<0?0:w)<<2)>>2]|0,h,(c[p+(s<<2)>>2]|0)-(c[m>>2]|0)|0,c[n>>2]|0,c[o>>2]|0,j)}if(u){a=t}else{break}}return}function _c(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0.0,r=0.0,s=0.0,t=0,u=0,v=0.0,w=0,x=0,y=0,z=0.0,A=0,B=0,C=0,D=0;e=a+40|0;f=c[a+36>>2]|0;gd(b,f,c[e>>2]|0);h=c[a>>2]|0;a:do{if((h|0)>1){i=c[a+20>>2]|0;j=c[i>>2]|0;k=c[a+28>>2]|0;l=(c[a+4>>2]|0)+32|0;m=j-(f>>1)-k|0;n=0;o=1;p=j;while(1){q=+g[b+(m<<2)>>2];j=((c[i+(o<<2)>>2]|0)+p>>1)-k|0;r=+g[l>>2];s=q>r?r:q;t=m+1|0;b:do{if((t|0)>(j|0)){u=m;v=s}else{q=s;w=t;while(1){x=q==-9999.0;y=w;while(1){z=+g[b+(y<<2)>>2];if(z>-9999.0){if(z<q|x){break}}else{if(x){break}}A=y+1|0;if((A|0)>(j|0)){u=y;v=q;break b}else{y=A}}x=y+1|0;if((x|0)>(j|0)){u=y;v=z;break}else{q=z;w=x}}}}while(0);j=k+u|0;c:do{if((n|0)<(h|0)){t=n;w=p;while(1){if((w|0)>(j|0)){B=t;break c}x=d+(t<<2)|0;if(+g[x>>2]<v){g[x>>2]=v}x=t+1|0;if((x|0)>=(h|0)){B=x;break c}t=x;w=c[i+(x<<2)>>2]|0}}else{B=n}}while(0);j=B+1|0;if((j|0)>=(h|0)){C=B;break a}m=u;n=B;o=j;p=c[i+(B<<2)>>2]|0}}else{C=0}}while(0);v=+g[b+((c[e>>2]|0)-1<<2)>>2];if((C|0)<(h|0)){D=C}else{return}do{C=d+(D<<2)|0;if(+g[C>>2]<v){g[C>>2]=v}D=D+1|0;}while((D|0)<(h|0));return}function $c(a,b,d,e,f,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;i=i|0;var j=0,k=0,l=0.0,m=0,n=0,o=0.0,p=0.0,q=0.0,r=0.0,s=0.0;j=c[a>>2]|0;k=c[a+4>>2]|0;l=+g[k+12+(e<<2)>>2];if((j|0)<=0){return}m=c[(c[a+12>>2]|0)+(e<<2)>>2]|0;n=k+108|0;k=(e|0)==1;o=+g[a+48>>2];a=0;do{p=+g[b+(a<<2)>>2]+ +g[m+(a<<2)>>2];q=+g[n>>2];r=p>q?q:p;p=l+ +g[d+(a<<2)>>2];g[f+(a<<2)>>2]=r<p?p:r;if(k){p=r- +g[i+(a<<2)>>2];r=p+17.200000762939453;do{if(p>-17.200000762939453){q=1.0-o*r*.005;if(!(q<0.0)){s=q;break}s=9999999747378752.0e-20}else{s=1.0-o*r*3.0e-4}}while(0);e=h+(a<<2)|0;g[e>>2]=s*+g[e>>2]}a=a+1|0;}while((a|0)<(j|0));return}function ad(a,b){a=+a;b=b|0;var d=0,e=0,f=0.0;d=c[b+4>>2]|0;e=c[d+28>>2]|0;f=+((c[e+(c[b+40>>2]<<2)>>2]|0)/2|0|0)/+(c[d+8>>2]|0)*+g[e+2936>>2]+a;return+(f<-9999.0?-9999.0:f)}function bd(a,b,d,e,f,j,k,l,m){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0.0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0.0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0.0,S=0.0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0.0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0;n=i;o=c[d>>2]|0;p=d+4|0;d=c[p>>2]|0;if((c[d+500>>2]|0)==0){q=16}else{q=c[d+508>>2]|0}r=c[b+132+((c[d>>2]|0)*60|0)+(a<<2)>>2]|0;s=+h[56056+(c[b+252+(a<<2)>>2]<<3)>>3];d=m<<2;t=i;i=i+d|0;i=i+7&-8;u=t;t=i;i=i+d|0;i=i+7&-8;v=t;t=i;i=i+d|0;i=i+7&-8;w=t;t=i;i=i+d|0;i=i+7&-8;x=t;t=i;i=i+d|0;i=i+7&-8;y=t;z=e+1156|0;A=+h[((o|0)>1e3?55984:56056)+(c[b+312+(a<<2)>>2]<<3)>>3];a=ca(d,q)|0;b=i;i=i+a|0;i=i+7&-8;B=b;c[u>>2]=B;b=i;i=i+a|0;i=i+7&-8;C=b;c[v>>2]=C;b=i;i=i+a|0;i=i+7&-8;D=b;c[w>>2]=D;b=i;i=i+a|0;i=i+7&-8;E=b;c[x>>2]=E;a:do{if((m|0)>1){b=1;F=B;G=C;H=D;I=E;while(1){J=ca(b,q)|0;c[u+(b<<2)>>2]=F+(J<<2);c[v+(b<<2)>>2]=G+(J<<2);c[w+(b<<2)>>2]=H+(J<<2);c[x+(b<<2)>>2]=I+(J<<2);J=b+1|0;if((J|0)>=(m|0)){break a}b=J;F=c[u>>2]|0;G=c[v>>2]|0;H=c[w>>2]|0;I=c[x>>2]|0}}}while(0);E=c[z>>2]|0;if((o|0)>0){D=k;C=c[x>>2]|0;B=(m|0)>0;I=0;while(1){H=o-I|0;G=(q|0)>(H|0)?H:q;kg(t|0,D|0,d)|0;og(C|0,0,a|0)|0;if(B){H=(G|0)>0;F=0;do{b=c[j+(F<<2)>>2]|0;J=b+(I<<2)|0;do{if((c[y+(F<<2)>>2]|0)==0){if(!H){break}K=c[w+(F<<2)>>2]|0;L=c[u+(F<<2)>>2]|0;M=c[v+(F<<2)>>2]|0;N=c[x+(F<<2)>>2]|0;O=0;do{g[K+(O<<2)>>2]=1.000000013351432e-10;g[L+(O<<2)>>2]=0.0;g[M+(O<<2)>>2]=0.0;c[N+(O<<2)>>2]=0;c[b+(O+I<<2)>>2]=0;O=O+1|0;}while((O|0)<(G|0))}else{O=c[w+(F<<2)>>2]|0;if(H){N=0;do{g[O+(N<<2)>>2]=+g[245112+(c[b+(N+I<<2)>>2]<<2)>>2];N=N+1|0;}while((N|0)<(G|0))}N=f+(F<<2)|0;cd(r,s,A,(c[N>>2]|0)+(I<<2)|0,O,c[x+(F<<2)>>2]|0,I,G);if(H){M=c[N>>2]|0;N=c[u+(F<<2)>>2]|0;L=c[v+(F<<2)>>2]|0;K=0;while(1){P=M+(K+I<<2)|0;Q=+g[P>>2];S=Q*Q;T=N+(K<<2)|0;g[T>>2]=S;g[L+(K<<2)>>2]=S;if(+g[P>>2]<0.0){g[T>>2]=+g[T>>2]*-1.0}T=O+(K<<2)|0;S=+g[T>>2];g[T>>2]=S*S;T=K+1|0;if((T|0)<(G|0)){K=T}else{U=N;V=L;break}}}else{U=c[u+(F<<2)>>2]|0;V=c[v+(F<<2)>>2]|0}+dd(c[p>>2]|0,r,U,V,O,0,I,G,J)}}while(0);F=F+1|0;}while((F|0)<(m|0))}F=c[z>>2]|0;if((F|0)>0){H=(G|0)>0;J=l-I|0;b=r-I|0;L=0;N=F;while(1){K=c[e+1160+(L<<2)>>2]|0;M=c[e+2184+(L<<2)>>2]|0;T=c[j+(K<<2)>>2]|0;P=T+(I<<2)|0;W=c[j+(M<<2)>>2]|0;X=c[u+(K<<2)>>2]|0;Y=c[u+(M<<2)>>2]|0;Z=c[v+(K<<2)>>2]|0;_=c[v+(M<<2)>>2]|0;$=c[w+(K<<2)>>2]|0;aa=c[w+(M<<2)>>2]|0;ba=c[x+(K<<2)>>2]|0;da=c[x+(M<<2)>>2]|0;ea=y+(K<<2)|0;K=y+(M<<2)|0;if((c[ea>>2]|0)==0){if((c[K>>2]|0)==0){fa=N}else{ga=29}}else{ga=29}if((ga|0)==29){ga=0;c[K>>2]=1;c[ea>>2]=1;if(H){ea=0;do{b:do{if((ea|0)<(J|0)){K=ba+(ea<<2)|0;M=da+(ea<<2)|0;do{if((c[K>>2]|0)==0){if((c[M>>2]|0)!=0){break}do{if((ea|0)<(b|0)){ha=X+(ea<<2)|0;S=+g[Y+(ea<<2)>>2]+ +g[ha>>2];g[ha>>2]=S;g[Z+(ea<<2)>>2]=+R(+S)}else{ha=X+(ea<<2)|0;S=+g[ha>>2];Q=+g[Y+(ea<<2)>>2];ia=+R(+S)+ +R(+Q);g[Z+(ea<<2)>>2]=ia;if(S+Q<0.0){g[ha>>2]=-0.0-ia;break}else{g[ha>>2]=ia;break}}}while(0);g[_+(ea<<2)>>2]=0.0;g[Y+(ea<<2)>>2]=0.0;c[M>>2]=1;c[W+(ea+I<<2)>>2]=0;break b}}while(0);ha=X+(ea<<2)|0;ia=+R(+(+g[ha>>2]));g[ha>>2]=ia+ +R(+(+g[Y+(ea<<2)>>2]));ha=Z+(ea<<2)|0;g[ha>>2]=+g[ha>>2]+ +g[_+(ea<<2)>>2];c[M>>2]=1;c[K>>2]=1;ha=ea+I|0;ja=T+(ha<<2)|0;ka=c[ja>>2]|0;la=W+(ha<<2)|0;ha=c[la>>2]|0;if((((ka|0)>-1?ka:-ka|0)|0)>(((ha|0)>-1?ha:-ha|0)|0)){ma=(ka|0)>0?ka-ha|0:ha-ka|0;c[la>>2]=ma;na=ma;oa=c[ja>>2]|0}else{c[la>>2]=(ha|0)>0?ka-ha|0:ha-ka|0;c[ja>>2]=ha;na=c[la>>2]|0;oa=ha}if((na|0)<(((oa|0)>-1?oa:-oa|0)<<1|0)){break}c[la>>2]=-na;c[ja>>2]=-(c[ja>>2]|0)}}while(0);O=$+(ea<<2)|0;ja=aa+(ea<<2)|0;ia=+g[O>>2]+ +g[ja>>2];g[ja>>2]=ia;g[O>>2]=ia;ea=ea+1|0;}while((ea|0)<(G|0))}+dd(c[p>>2]|0,r,X,Z,$,ba,I,G,P);fa=c[z>>2]|0}ea=L+1|0;if((ea|0)<(fa|0)){L=ea;N=fa}else{pa=fa;break}}}else{pa=F}N=I+q|0;if((N|0)<(o|0)){I=N}else{qa=pa;break}}}else{qa=E}if((qa|0)>0){ra=0;sa=qa}else{i=n;return}while(1){qa=k+(c[e+1160+(ra<<2)>>2]<<2)|0;E=e+2184+(ra<<2)|0;if((c[qa>>2]|0)==0){if((c[k+(c[E>>2]<<2)>>2]|0)==0){ta=sa}else{ga=50}}else{ga=50}if((ga|0)==50){ga=0;c[qa>>2]=1;c[k+(c[E>>2]<<2)>>2]=1;ta=c[z>>2]|0}E=ra+1|0;if((E|0)<(ta|0)){ra=E;sa=ta}else{break}}i=n;return}function cd(a,b,d,e,f,h,i,j){a=a|0;b=+b;d=+d;e=e|0;f=f|0;h=h|0;i=i|0;j=j|0;var k=0,l=0.0;if((j|0)<=0){return}k=a-i|0;i=0;do{l=+R(+(+g[e+(i<<2)>>2]));c[h+(i<<2)>>2]=l/+g[f+(i<<2)>>2]>=((i|0)>=(k|0)?d:b);i=i+1|0;}while((i|0)<(j|0));return}function dd(a,b,d,e,f,j,k,l,m){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0.0,x=0,y=0.0,z=0.0,A=0,B=0.0,C=0.0,D=0.0,E=0,F=0.0;n=i;o=i;i=i+(l<<2)|0;i=i+7&-8;p=o;if((c[a+500>>2]|0)==0){q=l}else{q=(c[a+504>>2]|0)-k|0}r=(q|0)>(l|0)?l:q;if((r|0)>0){s=(j|0)==0;t=~q;q=~l;u=(t|0)>(q|0)?t:q;q=0;do{if(s){v=10}else{if((c[j+(q<<2)>>2]|0)==0){v=10}}do{if((v|0)==10){v=0;t=+g[d+(q<<2)>>2]<0.0;w=+xa(+(+S(+g[e+(q<<2)>>2]/+g[f+(q<<2)>>2])));if(t){c[m+(q<<2)>>2]=~~(-0.0-w);break}else{c[m+(q<<2)>>2]=~~w;break}}}while(0);q=q+1|0;}while((q|0)<(r|0));x=~u}else{x=0}if((x|0)>=(l|0)){y=0.0;i=n;return+y}u=(j|0)!=0;r=b-k|0;k=0;b=x;w=0.0;while(1){if(u){if((c[j+(b<<2)>>2]|0)==0){v=16}else{z=w;A=k}}else{v=16}a:do{if((v|0)==16){v=0;x=e+(b<<2)|0;B=+g[f+(b<<2)>>2];C=+g[x>>2]/B;do{if(C<.25){if(u&(b|0)<(r|0)){break}c[p+(k<<2)>>2]=x;z=w+C;A=k+1|0;break a}}while(0);q=+g[d+(b<<2)>>2]<0.0;D=+xa(+(+S(C)));if(q){q=~~(-0.0-D);c[m+(b<<2)>>2]=q;E=q}else{q=~~D;c[m+(b<<2)>>2]=q;E=q}g[x>>2]=B*+(ca(E,E)|0);z=w;A=k}}while(0);q=b+1|0;if((q|0)<(l|0)){k=A;b=q;w=z}else{break}}if((A|0)==0){y=z;i=n;return+y}Ma(o|0,A|0,4,4);if((A|0)<=0){y=z;i=n;return+y}o=e;w=+h[a+512>>3];a=0;D=z;while(1){b=(c[p+(a<<2)>>2]|0)-o>>2;if(D<w){c[m+(b<<2)>>2]=0;g[e+(b<<2)>>2]=0.0;F=D}else{c[m+(b<<2)>>2]=~~+fd(+g[d+(b<<2)>>2]);g[e+(b<<2)>>2]=+g[f+(b<<2)>>2];F=D+-1.0}b=a+1|0;if((b|0)<(A|0)){a=b;D=F}else{y=F;break}}i=n;return+y}function ed(a,b){a=a|0;b=b|0;var d=0.0,e=0.0;d=+g[c[a>>2]>>2];e=+g[c[b>>2]>>2];return(d<e)-(d>e)|0}function fd(a){a=+a;return+(c[k>>2]=(g[k>>2]=a,c[k>>2]|0)&-2147483648|1065353216,+g[k>>2])}function gd(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0.0,o=0,p=0.0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;e=i;f=d<<2;h=i;i=i+f|0;i=i+7&-8;j=h;h=i;i=i+f|0;i=i+7&-8;f=h;if((d|0)>0){k=0;l=0}else{i=e;return}do{do{if((k|0)<2){c[j+(k<<2)>>2]=l;g[f+(k<<2)>>2]=+g[a+(l<<2)>>2];m=k}else{n=+g[a+(l<<2)>>2];h=k;while(1){o=h-1|0;p=+g[f+(o<<2)>>2];if(n<p){q=8;break}if(!((l|0)<((c[j+(o<<2)>>2]|0)+b|0)&(h|0)>1)){q=12;break}r=h-2|0;if(p>+g[f+(r<<2)>>2]){q=12;break}if((l|0)<((c[j+(r<<2)>>2]|0)+b|0)){h=o}else{q=12;break}}if((q|0)==8){q=0;c[j+(h<<2)>>2]=l;g[f+(h<<2)>>2]=n;m=h;break}else if((q|0)==12){q=0;c[j+(h<<2)>>2]=l;g[f+(h<<2)>>2]=n;m=h;break}}}while(0);k=m+1|0;l=l+1|0;}while((l|0)<(d|0));if((k|0)<=0){i=e;return}l=b+1|0;b=~d;o=0;r=0;while(1){do{if((r|0)<(m|0)){s=r+1|0;if(!(+g[f+(s<<2)>>2]>+g[f+(r<<2)>>2])){q=17;break}t=c[j+(s<<2)>>2]|0}else{q=17}}while(0);if((q|0)==17){q=0;t=l+(c[j+(r<<2)>>2]|0)|0}s=(t|0)>(d|0)?d:t;if((o|0)<(s|0)){p=+g[f+(r<<2)>>2];u=~t;v=(u|0)>(b|0)?u:b;u=o;do{g[a+(u<<2)>>2]=p;u=u+1|0;}while((u|0)<(s|0));w=~v}else{w=o}s=r+1|0;if((s|0)<(k|0)){o=w;r=s}else{break}}i=e;return}function hd(a,b,d,e,f,h,i){a=a|0;b=b|0;d=+d;e=e|0;f=f|0;h=h|0;i=+i;var j=0,k=0,l=0,m=0;j=~~((d+i+-30.0)*.10000000149011612);k=(j|0)<0?0:j;j=c[b+(((k|0)>7?7:k)<<2)>>2]|0;k=~~+g[j+4>>2];i=+g[j>>2];b=~~i;l=~~(+(e|0)+ +(h|0)*(i+-16.0)- +(h>>1|0));while(1){if((b|0)>=(k|0)){m=7;break}do{if((l|0)>0){i=+g[j+(b+2<<2)>>2]+d;e=a+(l<<2)|0;if(!(+g[e>>2]<i)){break}g[e>>2]=i}}while(0);e=l+h|0;if((e|0)<(f|0)){b=b+1|0;l=e}else{m=7;break}}if((m|0)==7){return}}function id(a,b){a=a|0;b=+b;var c=0,d=0;c=0;do{d=a+(c<<2)|0;g[d>>2]=+g[d>>2]+b;c=c+1|0;}while((c|0)<56);return}function jd(a,b){a=a|0;b=b|0;var c=0,d=0.0,e=0;c=0;do{d=+g[b+(c<<2)>>2];e=a+(c<<2)|0;if(d>+g[e>>2]){g[e>>2]=d}c=c+1|0;}while((c|0)<56);return}function kd(a,b){a=a|0;b=b|0;var c=0,d=0.0,e=0;c=0;do{d=+g[b+(c<<2)>>2];e=a+(c<<2)|0;if(d<+g[e>>2]){g[e>>2]=d}c=c+1|0;}while((c|0)<56);return}function ld(a){a=a|0;og(a|0,0,16)|0;return}function md(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=a|0;e=a+8|0;c[d>>2]=ag(c[d>>2]|0,(c[e>>2]<<2)+8|0)|0;f=a+4|0;a=ag(c[f>>2]|0,(c[e>>2]<<2)+8|0)|0;c[f>>2]=a;f=ng(b|0)|0;g=c[e>>2]|0;c[a+(g<<2)>>2]=f;a=Zf(f+1|0)|0;c[(c[d>>2]|0)+(g<<2)>>2]=a;qg(c[(c[d>>2]|0)+(g<<2)>>2]|0,b|0)|0;b=(c[e>>2]|0)+1|0;c[e>>2]=b;c[(c[d>>2]|0)+(b<<2)>>2]=0;return}function nd(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0;e=i;f=ng(c|0)|0;g=f+2+(ng(d|0)|0)|0;f=i;i=i+g|0;i=i+7&-8;qg(f|0,c|0)|0;c=f+(ng(f|0)|0)|0;y=61;a[c]=y;y=y>>8;a[c+1|0]=y;rg(f|0,d|0)|0;md(b,f);i=e;return}function od(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0;if((a|0)==0){return}b=a|0;d=c[b>>2]|0;if((d|0)!=0){e=a+8|0;f=c[e>>2]|0;if((f|0)>0){g=0;h=d;i=f;while(1){f=c[h+(g<<2)>>2]|0;if((f|0)==0){j=i;k=h}else{_f(f);j=c[e>>2]|0;k=c[b>>2]|0}f=g+1|0;if((f|0)<(j|0)){g=f;h=k;i=j}else{l=k;break}}}else{l=d}_f(l)}l=c[a+4>>2]|0;if((l|0)!=0){_f(l)}l=c[a+12>>2]|0;if((l|0)!=0){_f(l)}og(a|0,0,16)|0;return}function pd(a){a=a|0;og(a|0,0,28)|0;c[a+28>>2]=$f(1,3664)|0;return}function qd(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;b=c[a+28>>2]|0;if((b|0)==0){d=a;og(d|0,0,32)|0;return}e=b+8|0;f=c[e>>2]|0;if((f|0)>0){g=b+32|0;h=0;i=f;while(1){f=c[g+(h<<2)>>2]|0;if((f|0)==0){j=i}else{_f(f);j=c[e>>2]|0}f=h+1|0;if((f|0)<(j|0)){h=f;i=j}else{break}}}j=b+12|0;i=c[j>>2]|0;if((i|0)>0){h=b+544|0;e=b+288|0;g=0;f=i;while(1){i=c[h+(g<<2)>>2]|0;if((i|0)==0){k=f}else{qb[c[(c[202112+(c[e+(g<<2)>>2]<<2)>>2]|0)+8>>2]&31](i);k=c[j>>2]|0}i=g+1|0;if((i|0)<(k|0)){g=i;f=k}else{break}}}k=b+16|0;f=c[k>>2]|0;if((f|0)>0){g=b+1056|0;j=b+800|0;e=0;h=f;while(1){f=c[g+(e<<2)>>2]|0;if((f|0)==0){l=h}else{qb[c[(c[223712+(c[j+(e<<2)>>2]<<2)>>2]|0)+12>>2]&31](f);l=c[k>>2]|0}f=e+1|0;if((f|0)<(l|0)){e=f;h=l}else{break}}}l=b+20|0;h=c[l>>2]|0;if((h|0)>0){e=b+1568|0;k=b+1312|0;j=0;g=h;while(1){h=c[e+(j<<2)>>2]|0;if((h|0)==0){m=g}else{qb[c[(c[172352+(c[k+(j<<2)>>2]<<2)>>2]|0)+12>>2]&31](h);m=c[l>>2]|0}h=j+1|0;if((h|0)<(m|0)){j=h;g=m}else{break}}}m=b+24|0;if((c[m>>2]|0)>0){g=b+1824|0;j=b+2848|0;l=0;while(1){k=c[g+(l<<2)>>2]|0;if((k|0)!=0){Me(k)}k=c[j>>2]|0;if((k|0)!=0){Ne(k+(l*56|0)|0)}k=l+1|0;if((k|0)<(c[m>>2]|0)){l=k}else{n=j;break}}}else{n=b+2848|0}j=c[n>>2]|0;if((j|0)!=0){_f(j)}j=b+28|0;if((c[j>>2]|0)>0){n=b+2852|0;l=0;do{Sc(c[n+(l<<2)>>2]|0);l=l+1|0;}while((l|0)<(c[j>>2]|0))}_f(b);d=a;og(d|0,0,32)|0;return}function rd(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;Cf(a,3,8);vd(a,172240,6);Cf(a,47,32);vd(a,172152,47);d=b+8|0;Cf(a,c[d>>2]|0,32);if((c[d>>2]|0)<=0){Cf(a,1,1);return}e=b|0;f=b+4|0;b=0;do{if((c[(c[e>>2]|0)+(b<<2)>>2]|0)==0){Cf(a,0,32)}else{Cf(a,c[(c[f>>2]|0)+(b<<2)>>2]|0,32);vd(a,c[(c[e>>2]|0)+(b<<2)>>2]|0,c[(c[f>>2]|0)+(b<<2)>>2]|0)}b=b+1|0;}while((b|0)<(c[d>>2]|0));Cf(a,1,1);return}function sd(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;g=i;i=i+24|0;h=g|0;j=c[a+4>>2]|0;k=c[a+104>>2]|0;if((k|0)==0){og(d|0,0,32)|0;og(e|0,0,32)|0;og(f|0,0,32)|0;l=-129;i=g;return l|0}Af(h);do{if((td(h,j)|0)==0){a=k+64|0;m=c[a>>2]|0;if((m|0)!=0){_f(m)}m=Zf(If(h)|0)|0;c[a>>2]=m;n=h+8|0;o=c[n>>2]|0;kg(m|0,o|0,If(h)|0)|0;c[d>>2]=c[a>>2];c[d+4>>2]=If(h)|0;c[d+8>>2]=1;og(d+12|0,0,20)|0;Ef(h);rd(h,b);o=k+68|0;m=c[o>>2]|0;if((m|0)!=0){_f(m)}m=Zf(If(h)|0)|0;c[o>>2]=m;p=c[n>>2]|0;kg(m|0,p|0,If(h)|0)|0;c[e>>2]=c[o>>2];c[e+4>>2]=If(h)|0;o=e+24|0;og(e+8|0,0,16)|0;c[o>>2]=1;c[o+4>>2]=0;Ef(h);if((ud(h,j)|0)!=0){og(d|0,0,32)|0;og(e|0,0,32)|0;og(f|0,0,32)|0;q=a;break}a=k+72|0;o=c[a>>2]|0;if((o|0)!=0){_f(o)}o=Zf(If(h)|0)|0;c[a>>2]=o;p=c[n>>2]|0;kg(o|0,p|0,If(h)|0)|0;c[f>>2]=c[a>>2];c[f+4>>2]=If(h)|0;a=f+24|0;og(f+8|0,0,16)|0;c[a>>2]=2;c[a+4>>2]=0;Df(h);l=0;i=g;return l|0}else{og(d|0,0,32)|0;og(e|0,0,32)|0;og(f|0,0,32)|0;q=k+64|0}}while(0);Df(h);h=c[q>>2]|0;if((h|0)!=0){_f(h)}h=k+68|0;f=c[h>>2]|0;if((f|0)!=0){_f(f)}f=k+72|0;k=c[f>>2]|0;if((k|0)!=0){_f(k)}c[q>>2]=0;c[h>>2]=0;c[f>>2]=0;l=-130;i=g;return l|0}function td(a,b){a=a|0;b=b|0;var d=0,e=0;d=c[b+28>>2]|0;if((d|0)==0){e=-129;return e|0}Cf(a,1,8);vd(a,172240,6);Cf(a,0,32);Cf(a,c[b+4>>2]|0,8);Cf(a,c[b+8>>2]|0,32);Cf(a,c[b+12>>2]|0,32);Cf(a,c[b+16>>2]|0,32);Cf(a,c[b+20>>2]|0,32);Cf(a,wd(c[d>>2]|0)|0,4);Cf(a,wd(c[d+4>>2]|0)|0,4);Cf(a,1,1);e=0;return e|0}function ud(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0;d=c[b+28>>2]|0;if((d|0)==0){e=-129;return e|0}Cf(a,5,8);vd(a,172240,6);f=d+24|0;Cf(a,(c[f>>2]|0)-1|0,8);g=d+1824|0;h=0;while(1){if((h|0)>=(c[f>>2]|0)){break}if((ye(c[g+(h<<2)>>2]|0,a)|0)==0){h=h+1|0}else{e=-1;i=19;break}}if((i|0)==19){return e|0}Cf(a,0,6);Cf(a,0,16);i=d+16|0;Cf(a,(c[i>>2]|0)-1|0,6);a:do{if((c[i>>2]|0)>0){h=d+800|0;g=d+1056|0;f=0;while(1){j=h+(f<<2)|0;Cf(a,c[j>>2]|0,16);k=c[c[223712+(c[j>>2]<<2)>>2]>>2]|0;if((k|0)==0){e=-1;break}rb[k&7](c[g+(f<<2)>>2]|0,a);f=f+1|0;if((f|0)>=(c[i>>2]|0)){break a}}return e|0}}while(0);i=d+20|0;Cf(a,(c[i>>2]|0)-1|0,6);if((c[i>>2]|0)>0){f=d+1312|0;g=d+1568|0;h=0;do{k=f+(h<<2)|0;Cf(a,c[k>>2]|0,16);rb[c[c[172352+(c[k>>2]<<2)>>2]>>2]&7](c[g+(h<<2)>>2]|0,a);h=h+1|0;}while((h|0)<(c[i>>2]|0))}i=d+12|0;Cf(a,(c[i>>2]|0)-1|0,6);if((c[i>>2]|0)>0){h=d+288|0;g=d+544|0;f=0;do{k=h+(f<<2)|0;Cf(a,c[k>>2]|0,16);ub[c[c[202112+(c[k>>2]<<2)>>2]>>2]&3](b,c[g+(f<<2)>>2]|0,a);f=f+1|0;}while((f|0)<(c[i>>2]|0))}i=d+8|0;Cf(a,(c[i>>2]|0)-1|0,6);if((c[i>>2]|0)>0){f=d+32|0;d=0;do{g=f+(d<<2)|0;Cf(a,c[c[g>>2]>>2]|0,1);Cf(a,c[(c[g>>2]|0)+4>>2]|0,16);Cf(a,c[(c[g>>2]|0)+8>>2]|0,16);Cf(a,c[(c[g>>2]|0)+12>>2]|0,8);d=d+1|0;}while((d|0)<(c[i>>2]|0))}Cf(a,1,1);e=0;return e|0}function vd(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0;if((d|0)==0){return}else{e=c;f=d}while(1){d=f-1|0;Cf(b,a[e]|0,8);if((d|0)==0){break}else{e=e+1|0;f=d}}return}function wd(a){a=a|0;var b=0,c=0,d=0,e=0;b=(a|0)==0?0:a-1|0;if((b|0)==0){c=0;return c|0}else{d=b;e=0}while(1){b=e+1|0;a=d>>>1;if((a|0)==0){c=b;break}else{d=a;e=b}}return c|0}function xd(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;f=i;i=i+4376|0;g=f|0;h=f+3584|0;j=f+3848|0;k=f+4112|0;l=k;m=i;i=i+260|0;i=i+7&-8;n=i;i=i+260|0;i=i+7&-8;o=n;p=i;i=i+4|0;i=i+7&-8;q=i;i=i+4|0;i=i+7&-8;r=i;i=i+4|0;i=i+7&-8;s=i;i=i+4|0;i=i+7&-8;t=i;i=i+4|0;i=i+7&-8;u=i;i=i+4|0;i=i+7&-8;v=c[b+1296>>2]|0;w=c[b+1288>>2]|0;x=c[b+1284>>2]|0;y=(x|0)>0;do{if(y){z=0;do{c[h+(z<<2)>>2]=-200;z=z+1|0;}while((z|0)<(x|0));if(y){A=0}else{break}do{c[j+(A<<2)>>2]=-200;A=A+1|0;}while((A|0)<(x|0));if(!y){break}og(l|0,0,x<<2|0)|0;z=0;do{c[m+(z<<2)>>2]=1;z=z+1|0;}while((z|0)<(x|0));if(!y){break}og(o|0,-1|0,x<<2|0)|0}}while(0);if((x|0)==0){B=yd(e,d,0,w,g|0,w,v)|0}else{o=x-1|0;if((o|0)>0){y=0;l=0;while(1){A=l+1|0;z=(yd(e,d,c[b+(l<<2)>>2]|0,c[b+(A<<2)>>2]|0,g+(l*56|0)|0,w,v)|0)+y|0;if((A|0)<(o|0)){y=z;l=A}else{B=z;break}}}else{C=0;i=f;return C|0}}if((B|0)==0){C=0;i=f;return C|0}c[p>>2]=-200;c[q>>2]=-200;zd(g|0,x-1|0,p,q,v)|0;B=c[p>>2]|0;p=h|0;c[p>>2]=B;l=j|0;c[l>>2]=B;B=c[q>>2]|0;q=j+4|0;c[q>>2]=B;c[h+4>>2]=B;B=(x|0)>2;a:do{if(B){y=2;b:while(1){o=c[b+520+(y<<2)>>2]|0;w=c[k+(o<<2)>>2]|0;z=c[m+(o<<2)>>2]|0;A=n+(w<<2)|0;c:do{if((c[A>>2]|0)!=(z|0)){D=c[b+520+(w<<2)>>2]|0;E=c[b+520+(z<<2)>>2]|0;c[A>>2]=z;F=Ad(p,l,w)|0;G=Ad(p,l,z)|0;if((F|0)==-1|(G|0)==-1){break b}if((Bd(c[v+836+(w<<2)>>2]|0,c[v+836+(z<<2)>>2]|0,F,G,e,d,v)|0)==0){c[h+(y<<2)>>2]=-200;c[j+(y<<2)>>2]=-200;break}c[r>>2]=-200;c[s>>2]=-200;c[t>>2]=-200;c[u>>2]=-200;H=zd(g+(D*56|0)|0,o-D|0,r,s,v)|0;D=zd(g+(o*56|0)|0,E-o|0,t,u,v)|0;E=(H|0)!=0;if(E){c[r>>2]=F;c[s>>2]=c[t>>2]}do{if((D|0)!=0){c[t>>2]=c[s>>2];c[u>>2]=G;if(!E){break}c[h+(y<<2)>>2]=-200;c[j+(y<<2)>>2]=-200;break c}}while(0);E=c[r>>2]|0;c[j+(w<<2)>>2]=E;if((w|0)==0){c[p>>2]=E}E=c[s>>2]|0;c[h+(y<<2)>>2]=E;G=c[t>>2]|0;c[j+(y<<2)>>2]=G;D=c[u>>2]|0;c[h+(z<<2)>>2]=D;if((z|0)==1){c[q>>2]=D}if(!((E&G|0)>-1)){break}d:do{if((o|0)>0){G=o;do{G=G-1|0;E=m+(G<<2)|0;if((c[E>>2]|0)!=(z|0)){break d}c[E>>2]=y;}while((G|0)>0)}}while(0);G=o+1|0;if((G|0)<(x|0)){I=G}else{break}do{G=k+(I<<2)|0;if((c[G>>2]|0)!=(w|0)){break c}c[G>>2]=y;I=I+1|0;}while((I|0)<(x|0))}}while(0);y=y+1|0;if((y|0)>=(x|0)){break a}}Ra(1);return 0}}while(0);I=tc(a,x<<2)|0;a=I;c[a>>2]=Ad(p,l,0)|0;c[I+4>>2]=Ad(p,l,1)|0;if(B){J=2}else{C=a;i=f;return C|0}while(1){B=J-2|0;I=c[b+1032+(B<<2)>>2]|0;k=c[b+780+(B<<2)>>2]|0;B=Cd(c[v+836+(I<<2)>>2]|0,c[v+836+(k<<2)>>2]|0,c[a+(I<<2)>>2]|0,c[a+(k<<2)>>2]|0,c[v+836+(J<<2)>>2]|0)|0;k=Ad(p,l,J)|0;if((k|0)<0|(B|0)==(k|0)){c[a+(J<<2)>>2]=B|32768}else{c[a+(J<<2)>>2]=k}k=J+1|0;if((k|0)<(x|0)){J=k}else{C=a;break}}i=f;return C|0}function yd(a,b,d,e,f,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0.0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0;og(f|0,0,56)|0;c[f>>2]=d;c[f+4>>2]=e;j=(e|0)<(h|0)?e:h-1|0;if((j|0)<(d|0)){k=0;l=0;m=0;n=0;o=0;p=0;q=0;r=0;s=0;t=0;u=0;v=0}else{h=i+1112|0;i=d;d=0;e=0;w=0;x=0;y=0;z=0;A=0;B=0;C=0;D=0;E=0;F=0;while(1){G=+g[a+(i<<2)>>2];H=Rd(G)|0;do{if((H|0)==0){I=F;J=E;K=D;L=C;M=B;N=A;O=z;P=y;Q=x;R=w;S=e;T=d}else{if(+g[b+(i<<2)>>2]+ +g[h>>2]<G){I=F+1|0;J=(ca(H,i)|0)+E|0;K=(ca(H,H)|0)+D|0;L=C+(ca(i,i)|0)|0;M=H+B|0;N=A+i|0;O=z;P=y;Q=x;R=w;S=e;T=d;break}else{I=F;J=E;K=D;L=C;M=B;N=A;O=z+1|0;P=(ca(H,i)|0)+y|0;Q=(ca(H,H)|0)+x|0;R=w+(ca(i,i)|0)|0;S=H+e|0;T=d+i|0;break}}}while(0);H=i+1|0;if((H|0)>(j|0)){k=T;l=S;m=R;n=Q;o=P;p=O;q=N;r=M;s=L;t=K;u=J;v=I;break}else{i=H;d=T;e=S;w=R;x=Q;y=P;z=O;A=N;B=M;C=L;D=K;E=J;F=I}}}c[f+8>>2]=k;c[f+12>>2]=l;c[f+16>>2]=m;c[f+20>>2]=n;c[f+24>>2]=o;c[f+28>>2]=p;c[f+32>>2]=q;c[f+36>>2]=r;c[f+40>>2]=s;c[f+44>>2]=t;c[f+48>>2]=u;c[f+52>>2]=v;return p|0}function zd(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var h=0,i=0,j=0.0,k=0.0,l=0.0,m=0.0,n=0.0,o=0.0,p=0,q=0,r=0.0,s=0.0,t=0.0,u=0.0,v=0.0,w=0.0,x=0.0,y=0.0,z=0.0,A=0.0,B=0.0,C=0.0,D=0.0,E=0.0,F=0.0,G=0.0,H=0.0,I=0.0,J=0.0,K=0.0,L=0.0,M=0,N=0,O=0,P=0,Q=0,R=0;h=c[a>>2]|0;i=c[a+((b-1|0)*56|0)+4>>2]|0;if((b|0)>0){j=+g[f+1108>>2];k=0.0;f=0;l=0.0;m=0.0;n=0.0;o=0.0;while(1){p=c[a+(f*56|0)+52>>2]|0;q=c[a+(f*56|0)+28>>2]|0;r=j*+(q+p|0)/+(q+1|0)+1.0;s=o+(+(c[a+(f*56|0)+32>>2]|0)+r*+(c[a+(f*56|0)+8>>2]|0));t=n+(+(c[a+(f*56|0)+36>>2]|0)+r*+(c[a+(f*56|0)+12>>2]|0));u=m+(+(c[a+(f*56|0)+40>>2]|0)+r*+(c[a+(f*56|0)+16>>2]|0));v=l+(+(c[a+(f*56|0)+48>>2]|0)+r*+(c[a+(f*56|0)+24>>2]|0));w=k+(+(p|0)+ +(q|0)*r);q=f+1|0;if((q|0)<(b|0)){k=w;f=q;l=v;m=u;n=t;o=s}else{x=w;y=v;z=u;A=t;B=s;break}}}else{x=0.0;y=0.0;z=0.0;A=0.0;B=0.0}f=c[d>>2]|0;if((f|0)>-1){C=+(h|0)+B;D=A+ +(f|0);E=+(ca(h,h)|0)+z;F=y+ +(ca(f,h)|0);G=x+1.0}else{C=B;D=A;E=z;F=y;G=x}f=c[e>>2]|0;if((f|0)>-1){H=+(i|0)+C;I=D+ +(f|0);J=+(ca(i,i)|0)+E;K=F+ +(ca(f,i)|0);L=G+1.0}else{H=C;I=D;J=E;K=F;L=G}G=L*J-H*H;if(!(G>0.0)){c[d>>2]=0;c[e>>2]=0;M=1;return M|0}F=(J*I-K*H)/G;J=(L*K-I*H)/G;c[d>>2]=~~+xa(+(F+ +(h|0)*J));h=~~+xa(+(F+ +(i|0)*J));c[e>>2]=h;i=c[d>>2]|0;if((i|0)>1023){c[d>>2]=1023;N=c[e>>2]|0;O=1023}else{N=h;O=i}if((N|0)>1023){c[e>>2]=1023;P=c[d>>2]|0;Q=1023}else{P=O;Q=N}if((P|0)<0){c[d>>2]=0;R=c[e>>2]|0}else{R=Q}if((R|0)>=0){M=0;return M|0}c[e>>2]=0;M=0;return M|0}function Ad(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=c[a+(d<<2)>>2]|0;a=c[b+(d<<2)>>2]|0;do{if((e|0)<0){f=a}else{if((a|0)<0){f=e;break}f=a+e>>1}}while(0);return f|0}function Bd(a,b,c,d,e,f,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;h=h|0;var i=0,j=0,k=0,l=0.0,m=0,n=0,o=0,p=0.0,q=0.0,r=0.0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;i=d-c|0;d=b-a|0;j=(i|0)/(d|0)|0;k=i>>31|1;l=+g[e+(a<<2)>>2];m=Rd(l)|0;n=ca(j,d)|0;o=((i|0)>-1?i:-i|0)-((n|0)>-1?n:-n|0)|0;n=c-m|0;i=ca(n,n)|0;p=+g[h+1112>>2];do{if(!(+g[f+(a<<2)>>2]+p<l)){q=+(c|0);r=+(m|0);if(q+ +g[h+1096>>2]<r){s=1;return s|0}if(q- +g[h+1100>>2]>r){s=1}else{break}return s|0}}while(0);m=a+1|0;a=h+1096|0;a:do{if((m|0)<(b|0)){n=h+1100|0;t=c;u=0;v=i;w=1;x=m;while(1){y=u+o|0;z=(y|0)<(d|0);A=y-(z?0:d)|0;y=t+j+(z?0:k)|0;l=+g[e+(x<<2)>>2];z=Rd(l)|0;B=y-z|0;C=(ca(B,B)|0)+v|0;B=w+1|0;if(!(+g[f+(x<<2)>>2]+p<l|(z|0)==0)){l=+(y|0);r=+(z|0);if(l+ +g[a>>2]<r){s=1;D=13;break}if(l- +g[n>>2]>r){s=1;D=13;break}}z=x+1|0;if((z|0)<(b|0)){t=y;u=A;v=C;w=B;x=z}else{E=C;F=B;break a}}if((D|0)==13){return s|0}}else{E=i;F=1}}while(0);p=+g[a>>2];r=+(F|0);l=+g[h+1104>>2];if(p*p/r>l){s=0;return s|0}p=+g[h+1100>>2];if(p*p/r>l){s=0;return s|0}s=+((E|0)/(F|0)|0|0)>l|0;return s|0}function Cd(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0;f=c&32767;c=(d&32767)-f|0;d=(ca((c|0)>-1?c:-c|0,e-a|0)|0)/(b-a|0)|0;return((c|0)<0?-d|0:d)+f|0}function Dd(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0;g=c[b+1284>>2]|0;if((d|0)==0|(e|0)==0){h=0;return h|0}b=tc(a,g<<2)|0;if((g|0)<=0){h=b;return h|0}a=65536-f|0;i=0;while(1){j=d+(i<<2)|0;k=ca(c[j>>2]&32767,a)|0;l=e+(i<<2)|0;m=k+32768+(ca(c[l>>2]&32767,f)|0)>>16;k=b+(i<<2)|0;c[k>>2]=m;do{if((c[j>>2]&32768|0)!=0){if((c[l>>2]&32768|0)==0){break}c[k>>2]=m|32768}}while(0);m=i+1|0;if((m|0)<(g|0)){i=m}else{h=b;break}}return h|0}function Ed(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0;g=i;i=i+328|0;h=g|0;j=g+264|0;k=g+296|0;l=c[d+1296>>2]|0;m=d+1284|0;n=c[m>>2]|0;o=c[(c[(c[b+64>>2]|0)+4>>2]|0)+28>>2]|0;p=o+1824|0;q=c[o+2848>>2]|0;if((e|0)==0){Cf(a,0,1);og(f|0,0,((c[b+36>>2]|0)/2|0)<<2|0)|0;r=0;i=g;return r|0}if((n|0)>0){s=l+832|0;t=0;do{u=e+(t<<2)|0;v=c[u>>2]|0;w=v&32767;x=c[s>>2]|0;if((x|0)==3){y=(w>>>0)/12|0}else if((x|0)==2){y=w>>>3}else if((x|0)==4){y=w>>>4}else if((x|0)==1){y=w>>>2}else{y=w}c[u>>2]=v&32768|y;t=t+1|0;}while((t|0)<(n|0))}t=c[e>>2]|0;y=h|0;c[y>>2]=t;s=c[e+4>>2]|0;v=h+4|0;c[v>>2]=s;u=d+1292|0;if((n|0)>2){w=2;do{x=w-2|0;z=c[d+1032+(x<<2)>>2]|0;A=c[d+780+(x<<2)>>2]|0;x=e+(z<<2)|0;B=e+(A<<2)|0;C=Cd(c[l+836+(z<<2)>>2]|0,c[l+836+(A<<2)>>2]|0,c[x>>2]|0,c[B>>2]|0,c[l+836+(w<<2)>>2]|0)|0;A=e+(w<<2)|0;z=c[A>>2]|0;if((z&32768|0)!=0|(C|0)==(z|0)){c[A>>2]=C|32768;c[h+(w<<2)>>2]=0}else{A=(c[u>>2]|0)-C|0;D=(A|0)<(C|0)?A:C;A=z-C|0;do{if((A|0)<0){if((A|0)<(-D|0)){E=D+~A|0;break}else{E=~(A<<1);break}}else{if((A|0)<(D|0)){E=A<<1;break}else{E=D+A|0;break}}}while(0);c[h+(w<<2)>>2]=E;c[x>>2]=c[x>>2]&32767;c[B>>2]=c[B>>2]&32767}w=w+1|0;}while((w|0)<(n|0));F=c[y>>2]|0;G=c[v>>2]|0}else{F=t;G=s}Cf(a,1,1);s=d+1308|0;c[s>>2]=(c[s>>2]|0)+1;s=Fd((c[u>>2]|0)-1|0)|0;t=d+1304|0;c[t>>2]=(c[t>>2]|0)+(s<<1);Cf(a,F,s);Cf(a,G,Fd((c[u>>2]|0)-1|0)|0);u=l|0;if((c[u>>2]|0)>0){G=j;s=d+1300|0;F=2;v=0;while(1){y=c[l+4+(v<<2)>>2]|0;n=c[l+128+(y<<2)>>2]|0;w=c[l+192+(y<<2)>>2]|0;E=1<<w;og(G|0,0,32)|0;if((w|0)!=0){if((E|0)>0){A=0;do{D=c[l+320+(y<<5)+(A<<2)>>2]|0;if((D|0)<0){c[k+(A<<2)>>2]=1}else{c[k+(A<<2)>>2]=c[(c[p+(D<<2)>>2]|0)+4>>2]}A=A+1|0;}while((A|0)<(E|0))}if((n|0)>0){A=0;B=0;x=0;while(1){D=h+(x+F<<2)|0;C=0;while(1){if((C|0)>=(E|0)){H=36;break}if((c[D>>2]|0)<(c[k+(C<<2)>>2]|0)){H=35;break}else{C=C+1|0}}if((H|0)==35){H=0;D=j+(x<<2)|0;c[D>>2]=C;I=D}else if((H|0)==36){H=0;I=j+(x<<2)|0}D=c[I>>2]<<B|A;z=x+1|0;if((z|0)<(n|0)){A=D;B=B+w|0;x=z}else{J=D;break}}}else{J=0}x=ze(q+((c[l+256+(y<<2)>>2]|0)*56|0)|0,J,a)|0;c[s>>2]=(c[s>>2]|0)+x}if((n|0)>0){x=0;do{w=c[l+320+(y<<5)+(c[j+(x<<2)>>2]<<2)>>2]|0;do{if((w|0)>-1){B=c[h+(x+F<<2)>>2]|0;if((B|0)>=(c[q+(w*56|0)+4>>2]|0)){break}A=ze(q+(w*56|0)|0,B,a)|0;c[t>>2]=(c[t>>2]|0)+A}}while(0);x=x+1|0;}while((x|0)<(n|0))}x=v+1|0;if((x|0)<(c[u>>2]|0)){F=n+F|0;v=x}else{break}}}v=l+832|0;F=ca(c[v>>2]|0,c[e>>2]|0)|0;u=(c[o+(c[b+28>>2]<<2)>>2]|0)/2|0;o=c[m>>2]|0;if((o|0)>1){t=1;a=0;q=0;h=F;j=o;while(1){o=c[d+260+(t<<2)>>2]|0;s=c[e+(o<<2)>>2]|0;if((s&32767|0)==(s|0)){J=ca(c[v>>2]|0,s)|0;s=c[l+836+(o<<2)>>2]|0;Gd(u,q,s,h,J,f);K=J;L=s;M=s;N=c[m>>2]|0}else{K=h;L=q;M=a;N=j}s=t+1|0;if((s|0)<(N|0)){t=s;a=M;q=L;h=K;j=N}else{O=M;P=K;break}}}else{O=0;P=F}F=b+36|0;if((O|0)<((c[F>>2]|0)/2|0|0)){Q=O}else{r=1;i=g;return r|0}while(1){c[f+(Q<<2)>>2]=P;O=Q+1|0;if((O|0)<((c[F>>2]|0)/2|0|0)){Q=O}else{r=1;break}}i=g;return r|0}function Fd(a){a=a|0;var b=0,c=0,d=0,e=0;if((a|0)==0){b=0}else{c=a;a=0;while(1){d=a+1|0;e=c>>>1;if((e|0)==0){b=d;break}else{c=e;a=d}}}return b|0}function Gd(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;h=f-e|0;f=d-b|0;i=(h|0)/(f|0)|0;j=h>>31|1;k=ca(i,f)|0;l=((h|0)>-1?h:-h|0)-((k|0)>-1?k:-k|0)|0;k=(a|0)>(d|0)?d:a;if((k|0)>(b|0)){c[g+(b<<2)>>2]=e}a=b+1|0;if((a|0)<(k|0)){m=e;n=0;o=a}else{return}while(1){a=n+l|0;e=(a|0)<(f|0);b=m+i+(e?0:j)|0;c[g+(o<<2)>>2]=b;d=o+1|0;if((d|0)<(k|0)){m=b;n=a-(e?0:f)|0;o=d}else{break}}return}function Hd(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;d=a+836|0;e=c[a+840>>2]|0;f=a;Cf(b,c[f>>2]|0,5);do{if((c[f>>2]|0)>0){g=a+4|0;h=0;i=-1;do{j=g+(h<<2)|0;Cf(b,c[j>>2]|0,4);k=c[j>>2]|0;i=(i|0)<(k|0)?k:i;h=h+1|0;}while((h|0)<(c[f>>2]|0));h=i+1|0;if((h|0)<=0){break}g=a+128|0;k=a+192|0;j=a+256|0;l=a+320|0;m=0;do{Cf(b,(c[g+(m<<2)>>2]|0)-1|0,3);n=k+(m<<2)|0;Cf(b,c[n>>2]|0,2);if((c[n>>2]|0)==0){o=0}else{Cf(b,c[j+(m<<2)>>2]|0,8);o=c[n>>2]|0}if((1<<o|0)>0){p=0;do{Cf(b,(c[l+(m<<5)+(p<<2)>>2]|0)+1|0,8);p=p+1|0;}while((p|0)<(1<<c[n>>2]|0))}m=m+1|0;}while((m|0)<(h|0))}}while(0);Cf(b,(c[a+832>>2]|0)-1|0,2);o=Qd(e)|0;Cf(b,o,4);e=c[f>>2]|0;if((e|0)<=0){return}h=a+4|0;m=a+128|0;a=0;l=0;j=0;k=e;while(1){e=(c[m+(c[h+(j<<2)>>2]<<2)>>2]|0)+a|0;if((l|0)<(e|0)){g=l;do{Cf(b,c[d+(g+2<<2)>>2]|0,o);g=g+1|0;}while((g|0)<(e|0));q=e;r=c[f>>2]|0}else{q=l;r=k}g=j+1|0;if((g|0)<(r|0)){a=e;l=q;j=g;k=r}else{break}}return}function Id(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;d=i;i=i+264|0;e=d|0;f=c[a+28>>2]|0;a=$f(1,1120)|0;g=Hf(b,5)|0;h=a;c[h>>2]=g;a:do{if((g|0)>0){j=a+4|0;k=-1;l=0;do{m=Hf(b,4)|0;c[j+(l<<2)>>2]=m;if((m|0)<0){break a}k=(k|0)<(m|0)?m:k;l=l+1|0;}while((l|0)<(c[h>>2]|0));l=k+1|0;if((l|0)<=0){n=18;break}j=a+128|0;m=a+192|0;o=a+256|0;p=f+24|0;q=a+320|0;r=0;while(1){c[j+(r<<2)>>2]=(Hf(b,3)|0)+1;s=Hf(b,2)|0;t=m+(r<<2)|0;c[t>>2]=s;if((s|0)<0){break a}if((s|0)==0){u=c[o+(r<<2)>>2]|0}else{s=Hf(b,8)|0;c[o+(r<<2)>>2]=s;u=s}if((u|0)<0){break a}if((u|0)<(c[p>>2]|0)){v=0}else{break a}while(1){if((v|0)>=(1<<c[t>>2]|0)){break}s=Hf(b,8)|0;w=s-1|0;c[q+(r<<5)+(v<<2)>>2]=w;if((s|0)<0){break a}if((w|0)>=(c[p>>2]|0)){break a}v=v+1|0}t=r+1|0;if((t|0)<(l|0)){r=t}else{n=18;break}}}else{n=18}}while(0);b:do{if((n|0)==18){c[a+832>>2]=(Hf(b,2)|0)+1;v=Hf(b,4)|0;if((v|0)<0){break}if((c[h>>2]|0)>0){u=a+4|0;f=a+128|0;g=a+836|0;r=g;l=1<<v;p=0;q=0;o=0;while(1){x=(c[f+(c[u+(o<<2)>>2]<<2)>>2]|0)+p|0;if((x|0)>63){break b}else{y=q}while(1){if((y|0)>=(x|0)){break}m=Hf(b,v)|0;c[r+(y+2<<2)>>2]=m;if((m|0)>-1&(m|0)<(l|0)){y=y+1|0}else{break b}}m=o+1|0;if((m|0)<(c[h>>2]|0)){p=x;q=y;o=m}else{break}}o=x+2|0;q=g;c[q>>2]=0;c[a+840>>2]=l;if((o|0)>0){z=o;A=q;n=27}else{B=o}}else{o=a+836|0;c[o>>2]=0;c[a+840>>2]=1<<v;z=2;A=o;n=27}if((n|0)==27){o=0;while(1){c[e+(o<<2)>>2]=A+(o<<2);q=o+1|0;if((q|0)<(z|0)){o=q}else{B=z;break}}}Ma(e|0,B|0,4,8);o=1;while(1){if((o|0)>=(B|0)){C=a;break}if((c[c[e+(o-1<<2)>>2]>>2]|0)==(c[c[e+(o<<2)>>2]>>2]|0)){break b}else{o=o+1|0}}i=d;return C|0}}while(0);Kd(a);C=0;i=d;return C|0}function Jd(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;a=i;i=i+264|0;d=a|0;e=$f(1,1312)|0;c[e+1296>>2]=b;f=b+836|0;g=f;h=e+1288|0;c[h>>2]=c[b+840>>2];j=c[b>>2]|0;do{if((j|0)>0){k=b+4|0;l=b+128|0;m=0;n=0;do{m=(c[l+(c[k+(n<<2)>>2]<<2)>>2]|0)+m|0;n=n+1|0;}while((n|0)<(j|0));n=m+2|0;c[e+1284>>2]=n;if((n|0)>0){o=m;p=n;q=7;break}Ma(d|0,n|0,4,8);r=m}else{c[e+1284>>2]=2;o=0;p=2;q=7}}while(0);if((q|0)==7){q=f;j=0;do{c[d+(j<<2)>>2]=q+(j<<2);j=j+1|0;}while((j|0)<(p|0));Ma(d|0,p|0,4,8);j=f;f=e+260|0;q=0;do{c[f+(q<<2)>>2]=(c[d+(q<<2)>>2]|0)-j>>2;q=q+1|0;}while((q|0)<(p|0));q=e+260|0;j=e+520|0;d=0;do{c[j+(c[q+(d<<2)>>2]<<2)>>2]=d;d=d+1|0;}while((d|0)<(p|0));d=e+260|0;q=e;j=0;while(1){c[q+(j<<2)>>2]=c[g+(c[d+(j<<2)>>2]<<2)>>2];f=j+1|0;if((f|0)<(p|0)){j=f}else{r=o;break}}}o=c[b+832>>2]|0;if((o|0)==2){c[e+1292>>2]=128}else if((o|0)==3){c[e+1292>>2]=86}else if((o|0)==4){c[e+1292>>2]=64}else if((o|0)==1){c[e+1292>>2]=256}if((r|0)<=0){i=a;return e|0}o=e+1032|0;b=e+780|0;j=0;do{p=j+2|0;d=c[g+(p<<2)>>2]|0;if((p|0)>0){q=0;f=1;n=0;k=c[h>>2]|0;l=0;while(1){s=c[g+(l<<2)>>2]|0;t=(s|0)>(n|0)&(s|0)<(d|0);u=t?l:q;v=(s|0)<(k|0)&(s|0)>(d|0);w=v?l:f;x=l+1|0;if((x|0)<(p|0)){q=u;f=w;n=t?s:n;k=v?s:k;l=x}else{y=u;z=w;break}}}else{y=0;z=1}c[o+(j<<2)>>2]=y;c[b+(j<<2)>>2]=z;j=j+1|0;}while((j|0)<(r|0));i=a;return e|0}function Kd(a){a=a|0;if((a|0)!=0){_f(a)}return}function Ld(a){a=a|0;if((a|0)!=0){_f(a)}return}function Md(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;d=c[b+1296>>2]|0;e=c[(c[(c[(c[a+64>>2]|0)+4>>2]|0)+28>>2]|0)+2848>>2]|0;f=a+4|0;if((Hf(f,1)|0)!=1){g=0;return g|0}h=b+1284|0;i=tc(a,c[h>>2]<<2)|0;a=i;j=b+1292|0;c[a>>2]=Hf(f,Fd((c[j>>2]|0)-1|0)|0)|0;c[i+4>>2]=Hf(f,Fd((c[j>>2]|0)-1|0)|0)|0;k=d|0;a:do{if((c[k>>2]|0)>0){l=2;m=0;b:while(1){n=c[d+4+(m<<2)>>2]|0;o=c[d+128+(n<<2)>>2]|0;p=c[d+192+(n<<2)>>2]|0;q=1<<p;if((p|0)==0){r=0}else{s=Ae(e+((c[d+256+(n<<2)>>2]|0)*56|0)|0,f)|0;if((s|0)==-1){g=0;t=25;break}else{r=s}}if((o|0)>0){s=q-1|0;q=r;u=0;do{v=c[d+320+(n<<5)+((q&s)<<2)>>2]|0;q=q>>p;if((v|0)>-1){w=Ae(e+(v*56|0)|0,f)|0;c[a+(u+l<<2)>>2]=w;if((w|0)==-1){g=0;t=25;break b}}else{c[a+(u+l<<2)>>2]=0}u=u+1|0;}while((u|0)<(o|0))}u=m+1|0;if((u|0)<(c[k>>2]|0)){l=o+l|0;m=u}else{break a}}if((t|0)==25){return g|0}}}while(0);if((c[h>>2]|0)<=2){g=i;return g|0}t=b+1032|0;k=b+780|0;b=2;while(1){f=b-2|0;e=t+(f<<2)|0;r=c[e>>2]|0;m=k+(f<<2)|0;f=c[m>>2]|0;l=Cd(c[d+836+(r<<2)>>2]|0,c[d+836+(f<<2)>>2]|0,c[a+(r<<2)>>2]|0,c[a+(f<<2)>>2]|0,c[d+836+(b<<2)>>2]|0)|0;f=(c[j>>2]|0)-l|0;r=a+(b<<2)|0;u=c[r>>2]|0;if((u|0)==0){c[r>>2]=l|32768}else{do{if((u|0)<(((f|0)<(l|0)?f:l)<<1|0)){if((u&1|0)==0){x=u>>1;break}else{x=-(u+1>>1)|0;break}}else{if((f|0)>(l|0)){x=u-l|0;break}else{x=~(u-f);break}}}while(0);c[r>>2]=x+l&32767;f=a+(c[e>>2]<<2)|0;c[f>>2]=c[f>>2]&32767;f=a+(c[m>>2]<<2)|0;c[f>>2]=c[f>>2]&32767}f=b+1|0;if((f|0)<(c[h>>2]|0)){b=f}else{g=i;break}}return g|0}function Nd(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0.0;f=c[b+1296>>2]|0;h=(c[(c[(c[(c[a+64>>2]|0)+4>>2]|0)+28>>2]|0)+(c[a+28>>2]<<2)>>2]|0)/2|0;if((d|0)==0){og(e|0,0,h<<2|0)|0;i=0;return i|0}a=d;d=f+832|0;j=ca(c[d>>2]|0,c[a>>2]|0)|0;if((j|0)<0){k=0}else{k=(j|0)>255?255:j}j=b+1284|0;l=c[j>>2]|0;if((l|0)>1){m=b+260|0;b=1;n=0;o=0;p=k;q=l;while(1){l=c[m+(b<<2)>>2]|0;r=c[a+(l<<2)>>2]|0;if((r&32767|0)==(r|0)){s=c[f+836+(l<<2)>>2]|0;l=ca(c[d>>2]|0,r)|0;if((l|0)<0){t=0}else{t=(l|0)>255?255:l}Od(h,o,s,p,t,e);u=t;v=s;w=s;x=c[j>>2]|0}else{u=p;v=o;w=n;x=q}s=b+1|0;if((s|0)<(x|0)){b=s;n=w;o=v;p=u;q=x}else{y=w;z=u;break}}}else{y=0;z=k}if((y|0)>=(h|0)){i=1;return i|0}A=+g[244088+(z<<2)>>2];z=y;while(1){y=e+(z<<2)|0;g[y>>2]=A*+g[y>>2];y=z+1|0;if((y|0)<(h|0)){z=y}else{i=1;break}}return i|0}function Od(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;h=e-d|0;e=c-b|0;i=(h|0)/(e|0)|0;j=h>>31|1;k=ca(i,e)|0;l=((h|0)>-1?h:-h|0)-((k|0)>-1?k:-k|0)|0;k=(a|0)>(c|0)?c:a;if((k|0)>(b|0)){a=f+(b<<2)|0;g[a>>2]=+g[244088+(d<<2)>>2]*+g[a>>2]}a=b+1|0;if((a|0)<(k|0)){m=d;n=0;o=a}else{return}while(1){a=n+l|0;d=(a|0)<(e|0);b=m+i+(d?0:j)|0;c=f+(o<<2)|0;g[c>>2]=+g[244088+(b<<2)>>2]*+g[c>>2];c=o+1|0;if((c|0)<(k|0)){m=b;n=a-(d?0:e)|0;o=c}else{break}}return}function Pd(a,b){a=a|0;b=b|0;return(c[c[a>>2]>>2]|0)-(c[c[b>>2]>>2]|0)|0}function Qd(a){a=a|0;var b=0,c=0,d=0,e=0;b=(a|0)==0?0:a-1|0;if((b|0)==0){c=0;return c|0}else{d=b;e=0}while(1){b=e+1|0;a=d>>>1;if((a|0)==0){c=b;break}else{d=a;e=b}}return c|0}function Rd(a){a=+a;var b=0,c=0;b=~~(a*7.314285755157471+1023.5);if((b|0)>1023){c=1023;return c|0}c=(b|0)<0?0:b;return c|0}function Sd(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;d=c[a+28>>2]|0;a=Zf(96)|0;e=Hf(b,8)|0;c[a>>2]=e;f=Hf(b,16)|0;c[a+4>>2]=f;g=Hf(b,16)|0;c[a+8>>2]=g;c[a+12>>2]=Hf(b,6)|0;c[a+16>>2]=Hf(b,8)|0;h=Hf(b,4)|0;i=h+1|0;j=a+20|0;c[j>>2]=i;a:do{if(!((e|0)<1|(f|0)<1)){if((g|0)<1|(h|0)<0){break}k=a+24|0;l=d+24|0;m=d+1824|0;n=0;o=i;while(1){if((n|0)>=(o|0)){p=a;break}q=Hf(b,8)|0;c[k+(n<<2)>>2]=q;if((q|0)<0){break a}if((q|0)>=(c[l>>2]|0)){break a}r=c[m+(q<<2)>>2]|0;if((c[r+12>>2]|0)==0){break a}if((c[r>>2]|0)<1){break a}n=n+1|0;o=c[j>>2]|0}return p|0}}while(0);Ud(a);p=0;return p|0}function Td(a,b){a=a|0;b=b|0;a=$f(1,32)|0;c[a+4>>2]=c[b>>2];c[a>>2]=c[b+8>>2];c[a+20>>2]=b;c[a+8>>2]=$f(2,4)|0;return a|0}function Ud(a){a=a|0;if((a|0)!=0){_f(a)}return}function Vd(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;if((a|0)==0){return}b=a+8|0;d=c[b>>2]|0;if((d|0)!=0){e=c[d>>2]|0;if((e|0)==0){f=d}else{_f(e);f=c[b>>2]|0}e=c[f+4>>2]|0;if((e|0)==0){g=f}else{_f(e);g=c[b>>2]|0}_f(g)}_f(a);return}function Wd(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,h=0,i=0,j=0.0,k=0.0,l=0,m=0,n=0,o=0;d=c[b+20>>2]|0;e=a+4|0;f=d+12|0;h=Hf(e,c[f>>2]|0)|0;if((h|0)<=0){i=0;return i|0}j=+(h|0)/+((1<<c[f>>2])-1|0)*+(c[d+16>>2]|0);f=d+20|0;h=Hf(e,He(c[f>>2]|0)|0)|0;if((h|0)==-1){i=0;return i|0}if((h|0)>=(c[f>>2]|0)){i=0;return i|0}f=(c[(c[(c[(c[a+64>>2]|0)+4>>2]|0)+28>>2]|0)+2848>>2]|0)+((c[d+24+(h<<2)>>2]|0)*56|0)|0;h=b+4|0;b=f|0;d=tc(a,((c[b>>2]|0)+(c[h>>2]|0)<<2)+4|0)|0;a=d;if((Ee(f,a,e,c[h>>2]|0)|0)==-1){i=0;return i|0}e=c[h>>2]|0;if((e|0)>0){h=0;k=0.0;while(1){a:do{if((h|0)<(e|0)){f=c[b>>2]|0;l=0;m=h;while(1){if((l|0)>=(f|0)){n=m;break a}o=a+(m<<2)|0;g[o>>2]=k+ +g[o>>2];o=m+1|0;if((o|0)<(e|0)){l=l+1|0;m=o}else{n=o;break}}}else{n=h}}while(0);if((n|0)<(e|0)){h=n;k=+g[a+(n-1<<2)>>2]}else{break}}}g[a+(e<<2)>>2]=j;i=d;return i|0}function Xd(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,h=0,i=0,j=0;f=c[b+20>>2]|0;Yd(a,f,b);if((d|0)==0){og(e|0,0,c[b+12+(c[a+28>>2]<<2)>>2]<<2|0)|0;h=0;return h|0}else{i=d;d=c[b+4>>2]|0;j=c[a+28>>2]|0;Mc(e,c[(c[b+8>>2]|0)+(j<<2)>>2]|0,c[b+12+(j<<2)>>2]|0,c[b>>2]|0,i,d,+g[i+(d<<2)>>2],+(c[f+16>>2]|0));h=1;return h|0}return 0}function Yd(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0.0,l=0.0,m=0.0,n=0,o=0,p=0;e=c[a+28>>2]|0;f=d+8|0;g=(c[f>>2]|0)+(e<<2)|0;if((c[g>>2]|0)!=0){return}h=c[(c[(c[(c[a+64>>2]|0)+4>>2]|0)+28>>2]|0)+(e<<2)>>2]|0;a=(h|0)/2|0;i=d|0;j=c[i>>2]|0;k=+(c[b+4>>2]|0)*.5;c[g>>2]=Zf((a<<2)+4|0)|0;if((h|0)>1){l=k/+(a|0);m=+(j|0)/(+Z(k*.0007399999885819852)*13.100000381469727+ +Z(k*k*1.8499999754340024e-8)*2.240000009536743+k*9999999747378752.0e-20);h=c[(c[f>>2]|0)+(e<<2)>>2]|0;g=(a|0)>1;b=0;n=j;while(1){k=+(b|0)*l;j=~~+Q(m*(k*9999999747378752.0e-20+(+Z(k*.0007399999885819852)*13.100000381469727+ +Z(k*k*1.8499999754340024e-8)*2.240000009536743)));c[h+(b<<2)>>2]=(j|0)<(n|0)?j:n-1|0;j=b+1|0;if((j|0)>=(a|0)){break}b=j;n=c[i>>2]|0}o=g?a:1;p=h}else{o=0;p=c[(c[f>>2]|0)+(e<<2)>>2]|0}c[p+(o<<2)>>2]=-1;c[d+12+(e<<2)>>2]=a;return}function Zd(a){a=a|0;if((a|0)!=0){_f(a)}return}function _d(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0;if((a|0)==0){return}b=a+4|0;d=c[b>>2]|0;e=a+20|0;f=c[e>>2]|0;if((d|0)>0){g=0;h=f;i=d;while(1){d=c[h+(g<<2)>>2]|0;if((d|0)==0){j=i;k=h}else{_f(d);j=c[b>>2]|0;k=c[e>>2]|0}d=g+1|0;if((d|0)<(j|0)){g=d;h=k;i=j}else{l=k;break}}}else{l=f}_f(l);l=a+24|0;f=a+28|0;k=c[f>>2]|0;if((c[l>>2]|0)>0){j=0;i=k;while(1){_f(c[i+(j<<2)>>2]|0);h=j+1|0;g=c[f>>2]|0;if((h|0)<(c[l>>2]|0)){j=h;i=g}else{m=g;break}}}else{m=k}_f(m);_f(a);return}function $d(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0;Cf(b,c[a>>2]|0,24);Cf(b,c[a+4>>2]|0,24);Cf(b,(c[a+8>>2]|0)-1|0,24);d=a+12|0;Cf(b,(c[d>>2]|0)-1|0,6);Cf(b,c[a+20>>2]|0,8);if((c[d>>2]|0)<=0){return}e=a+24|0;f=0;g=0;do{h=e+(f<<2)|0;i=c[h>>2]|0;if((ae(i)|0)>3){Cf(b,i,3);Cf(b,1,1);Cf(b,c[h>>2]>>3,5)}else{Cf(b,i,4)}g=(be(c[h>>2]|0)|0)+g|0;f=f+1|0;}while((f|0)<(c[d>>2]|0));if((g|0)<=0){return}d=a+280|0;a=0;do{Cf(b,c[d+(a<<2)>>2]|0,8);a=a+1|0;}while((a|0)<(g|0));return}function ae(a){a=a|0;var b=0,c=0,d=0,e=0;if((a|0)==0){b=0}else{c=a;a=0;while(1){d=a+1|0;e=c>>>1;if((e|0)==0){b=d;break}else{c=e;a=d}}}return b|0}function be(a){a=a|0;var b=0,c=0,d=0,e=0;if((a|0)==0){b=0}else{c=a;a=0;while(1){d=a+(c&1)|0;e=c>>>1;if((e|0)==0){b=d;break}else{c=e;a=d}}}return b|0}function ce(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;d=$f(1,2840)|0;e=c[a+28>>2]|0;c[d>>2]=Hf(b,24)|0;c[d+4>>2]=Hf(b,24)|0;c[d+8>>2]=(Hf(b,24)|0)+1;a=(Hf(b,6)|0)+1|0;f=d+12|0;c[f>>2]=a;g=Hf(b,8)|0;h=d+20|0;c[h>>2]=g;a:do{if((g|0)>=0){do{if((a|0)>0){i=d+24|0;j=0;k=0;do{l=Hf(b,3)|0;m=Hf(b,1)|0;if((m|0)<0){break a}if((m|0)==0){n=l}else{m=Hf(b,5)|0;if((m|0)<0){break a}n=m<<3|l}c[i+(k<<2)>>2]=n;j=(be(n)|0)+j|0;k=k+1|0;}while((k|0)<(c[f>>2]|0));if((j|0)<=0){o=j;break}k=d+280|0;i=0;while(1){l=Hf(b,8)|0;if((l|0)<0){break a}c[k+(i<<2)>>2]=l;l=i+1|0;if((l|0)<(j|0)){i=l}else{o=j;break}}}else{o=0}}while(0);j=c[h>>2]|0;i=c[e+24>>2]|0;if((j|0)>=(i|0)){break}k=d+280|0;l=e+1824|0;m=0;while(1){if((m|0)>=(o|0)){break}p=c[k+(m<<2)>>2]|0;if((p|0)>=(i|0)){break a}if((c[(c[l+(p<<2)>>2]|0)+12>>2]|0)==0){break a}else{m=m+1|0}}m=c[l+(j<<2)>>2]|0;i=c[m+4>>2]|0;k=c[m>>2]|0;if((k|0)<1){break}else{q=1;r=k}while(1){if((r|0)<=0){break}k=ca(c[f>>2]|0,q)|0;if((k|0)>(i|0)){break a}else{q=k;r=r-1|0}}c[d+16>>2]=q;s=d;return s|0}}while(0);Zd(d);s=0;return s|0}function de(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;d=$f(1,44)|0;e=c[(c[a+4>>2]|0)+28>>2]|0;c[d>>2]=b;a=c[b+12>>2]|0;c[d+4>>2]=a;f=e+2848|0;e=c[f>>2]|0;c[d+12>>2]=e;g=e+((c[b+20>>2]|0)*56|0)|0;c[d+16>>2]=g;e=c[g>>2]|0;g=$f(a,4)|0;c[d+20>>2]=g;if((a|0)>0){h=b+24|0;i=b+280|0;b=0;j=0;k=0;while(1){l=c[h+(k<<2)>>2]|0;m=ae(l)|0;do{if((m|0)==0){n=j;o=b}else{p=(m|0)>(j|0)?m:j;q=g+(k<<2)|0;c[q>>2]=$f(m,4)|0;if((m|0)>0){r=b;s=0}else{n=p;o=b;break}while(1){if((l&1<<s|0)==0){t=r}else{c[(c[q>>2]|0)+(s<<2)>>2]=(c[f>>2]|0)+((c[i+(r<<2)>>2]|0)*56|0);t=r+1|0}u=s+1|0;if((u|0)<(m|0)){r=t;s=u}else{n=p;o=t;break}}}}while(0);m=k+1|0;if((m|0)<(a|0)){b=o;j=n;k=m}else{v=n;break}}}else{v=0}n=d+24|0;c[n>>2]=1;k=(e|0)>0;if(k){j=0;o=1;do{o=ca(o,a)|0;j=j+1|0;}while((j|0)<(e|0));c[n>>2]=o;w=o}else{w=1}c[d+8>>2]=v;v=Zf(w<<2)|0;c[d+28>>2]=v;if((w|0)<=0){return d|0}o=e<<2;n=0;do{j=Zf(o)|0;c[v+(n<<2)>>2]=j;if(k){b=0;t=n;s=w;do{s=(s|0)/(a|0)|0;r=(t|0)/(s|0)|0;t=t-(ca(r,s)|0)|0;c[j+(b<<2)>>2]=r;b=b+1|0;}while((b|0)<(e|0))}n=n+1|0;}while((n|0)<(w|0));return d|0}function ee(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0;if((f|0)>0){g=0;h=0}else{return 0}while(1){if((c[e+(g<<2)>>2]|0)==0){i=h}else{c[d+(h<<2)>>2]=c[d+(g<<2)>>2];i=h+1|0}j=g+1|0;if((j|0)<(f|0)){g=j;h=i}else{break}}if((i|0)==0){return 0}fe(a,b,d,i,4);return 0}function fe(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;g=i;h=c[b>>2]|0;j=c[h+8>>2]|0;k=b+16|0;l=c[c[k>>2]>>2]|0;m=c[a+36>>2]>>1;n=c[h+4>>2]|0;o=h|0;p=((n|0)<(m|0)?n:m)-(c[o>>2]|0)|0;if((p|0)<=0){i=g;return}m=(p|0)/(j|0)|0;p=i;i=i+(e<<2)|0;i=i+7&-8;n=p;p=(e|0)>0;if(p){q=((l-1+m|0)/(l|0)|0)<<2;r=0;do{c[n+(r<<2)>>2]=tc(a,q)|0;r=r+1|0;}while((r|0)<(e|0))}r=b+8|0;q=c[r>>2]|0;if((q|0)<=0){i=g;return}s=(m|0)>0;t=a+4|0;a=h+16|0;u=b+28|0;v=(l|0)>0;w=b+20|0;b=0;x=q;a:while(1){if(s){q=(b|0)==0;y=1<<b;z=0;A=0;while(1){b:do{if(q){B=0;while(1){if((B|0)>=(e|0)){break b}C=Ae(c[k>>2]|0,t)|0;if((C|0)==-1){D=25;break a}if((C|0)>=(c[a>>2]|0)){D=25;break a}E=c[(c[u>>2]|0)+(C<<2)>>2]|0;c[(c[n+(B<<2)>>2]|0)+(z<<2)>>2]=E;if((E|0)==0){D=25;break a}else{B=B+1|0}}}}while(0);if(v&(A|0)<(m|0)){B=0;E=A;while(1){if(p){C=ca(E,j)|0;F=0;do{G=(c[o>>2]|0)+C|0;H=c[(c[(c[n+(F<<2)>>2]|0)+(z<<2)>>2]|0)+(B<<2)>>2]|0;do{if((c[h+24+(H<<2)>>2]&y|0)!=0){I=c[(c[(c[w>>2]|0)+(H<<2)>>2]|0)+(b<<2)>>2]|0;if((I|0)==0){break}if((xb[f&15](I,(c[d+(F<<2)>>2]|0)+(G<<2)|0,t,j)|0)==-1){D=25;break a}}}while(0);F=F+1|0;}while((F|0)<(e|0))}F=B+1|0;C=E+1|0;if((F|0)<(l|0)&(C|0)<(m|0)){B=F;E=C}else{J=C;break}}}else{J=A}if((J|0)<(m|0)){z=z+1|0;A=J}else{break}}K=c[r>>2]|0}else{K=x}A=b+1|0;if((A|0)<(K|0)){b=A;x=K}else{D=25;break}}if((D|0)==25){i=g;return}}function ge(a,b,d,e,f,g,h,i){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0;if((g|0)>0){j=0;k=0}else{return 0}while(1){if((c[f+(j<<2)>>2]|0)==0){l=k}else{c[e+(k<<2)>>2]=c[e+(j<<2)>>2];l=k+1|0}i=j+1|0;if((i|0)<(g|0)){j=i;k=l}else{break}}if((l|0)==0){return 0}he(a,d,e,l,h);return 0}function he(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0;g=i;i=i+1024|0;h=g|0;j=g+512|0;k=c[b>>2]|0;l=c[k+8>>2]|0;m=c[k+12>>2]|0;n=b+16|0;o=c[c[n>>2]>>2]|0;p=k|0;q=((c[k+4>>2]|0)-(c[p>>2]|0)|0)/(l|0)|0;og(h|0,0,512)|0;og(j|0,0,512)|0;r=b+8|0;s=c[r>>2]|0;if((s|0)<=0){i=g;return}t=(q|0)>0;u=(e|0)>0;v=(o|0)>1;w=b+36|0;x=(o|0)>0;y=b+20|0;z=b+32|0;b=-o|0;A=0;B=s;while(1){if(t){s=(A|0)==0;C=1<<A;D=0;while(1){if(s&u){E=0;do{F=c[f+(E<<2)>>2]|0;G=c[F+(D<<2)>>2]|0;if(v){H=G;I=1;while(1){J=ca(H,m)|0;K=I+D|0;if((K|0)<(q|0)){L=(c[F+(K<<2)>>2]|0)+J|0}else{L=J}J=I+1|0;if((J|0)<(o|0)){H=L;I=J}else{M=L;break}}}else{M=G}I=c[n>>2]|0;if((M|0)<(c[I+4>>2]|0)){H=ze(I,M,a)|0;c[w>>2]=(c[w>>2]|0)+H}E=E+1|0;}while((E|0)<(e|0))}if(x&(D|0)<(q|0)){E=D-q|0;H=E>>>0<b>>>0?b:E;E=1;I=D;while(1){F=ca(I,l)|0;J=(c[p>>2]|0)+F|0;if(u){F=0;do{K=c[(c[f+(F<<2)>>2]|0)+(I<<2)>>2]|0;if(s){N=j+(K<<2)|0;c[N>>2]=(c[N>>2]|0)+l}N=f+(F<<2)|0;do{if((c[k+24+(K<<2)>>2]&C|0)!=0){O=c[(c[(c[y>>2]|0)+(K<<2)>>2]|0)+(A<<2)>>2]|0;if((O|0)==0){break}P=ie(a,(c[d+(F<<2)>>2]|0)+(J<<2)|0,l,O)|0;c[z>>2]=(c[z>>2]|0)+P;O=h+(c[(c[N>>2]|0)+(I<<2)>>2]<<2)|0;c[O>>2]=(c[O>>2]|0)+P}}while(0);F=F+1|0;}while((F|0)<(e|0))}F=I+1|0;if(!((E|0)<(o|0)&(F|0)<(q|0))){break}E=E+1|0;I=F}Q=D-H|0}else{Q=D}if((Q|0)<(q|0)){D=Q}else{break}}R=c[r>>2]|0}else{R=B}D=A+1|0;if((D|0)<(R|0)){A=D;B=R}else{break}}i=g;return}function ie(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0;f=c[e>>2]|0;g=(d|0)/(f|0)|0;if((g|0)>0){h=0;i=0}else{j=0;return j|0}while(1){d=(ze(e,qe(e,b+((ca(i,f)|0)<<2)|0)|0,a)|0)+h|0;k=i+1|0;if((k|0)<(g|0)){h=d;i=k}else{j=d;break}}return j|0}function je(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0;if((f|0)>0){g=0;h=0}else{i=0;return i|0}while(1){if((c[e+(g<<2)>>2]|0)==0){j=h}else{c[d+(h<<2)>>2]=c[d+(g<<2)>>2];j=h+1|0}k=g+1|0;if((k|0)<(f|0)){g=k;h=j}else{break}}if((j|0)==0){i=0;return i|0}i=ke(a,b,d,j)|0;return i|0}function ke(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0.0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0.0,D=0;f=c[b>>2]|0;g=c[f+8>>2]|0;h=c[f+12>>2]|0;i=f|0;j=((c[f+4>>2]|0)-(c[i>>2]|0)|0)/(g|0)|0;k=tc(a,e<<2)|0;l=100.0/+(g|0);m=(e|0)>0;if(m){n=j<<2;o=0;do{p=tc(a,n)|0;c[k+(o<<2)>>2]=p;og(p|0,0,n|0)|0;o=o+1|0;}while((o|0)<(e|0))}if((j|0)<=0){q=b+40|0;r=q;s=c[r>>2]|0;t=s+1|0;c[r>>2]=t;return k|0}o=(g|0)>0;n=h-1|0;h=(n|0)>0;a=0;do{p=ca(a,g)|0;u=(c[i>>2]|0)+p|0;if(m){p=0;do{if(o){v=c[d+(p<<2)>>2]|0;w=0;x=0;y=0;do{z=c[v+(u+w<<2)>>2]|0;A=(z|0)>-1?z:-z|0;x=(A|0)>(x|0)?A:x;y=A+y|0;w=w+1|0;}while((w|0)<(g|0));B=x;C=+(y|0)}else{B=0;C=0.0}w=~~(l*C);a:do{if(h){v=0;while(1){if((B|0)<=(c[f+2328+(v<<2)>>2]|0)){A=c[f+2584+(v<<2)>>2]|0;if((A|0)<0|(w|0)<(A|0)){D=v;break a}}A=v+1|0;if((A|0)<(n|0)){v=A}else{D=A;break}}}else{D=0}}while(0);c[(c[k+(p<<2)>>2]|0)+(a<<2)>>2]=D;p=p+1|0;}while((p|0)<(e|0))}a=a+1|0;}while((a|0)<(j|0));q=b+40|0;r=q;s=c[r>>2]|0;t=s+1|0;c[r>>2]=t;return k|0}function le(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0;if((f|0)>0){g=0;h=0}else{return 0}while(1){if((c[e+(g<<2)>>2]|0)==0){i=h}else{c[d+(h<<2)>>2]=c[d+(g<<2)>>2];i=h+1|0}j=g+1|0;if((j|0)<(f|0)){g=j;h=i}else{break}}if((i|0)==0){return 0}fe(a,b,d,i,2);return 0}function me(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0;if((f|0)>0){g=0;h=0}else{i=0;return i|0}do{h=((c[e+(g<<2)>>2]|0)!=0)+h|0;g=g+1|0;}while((g|0)<(f|0));if((h|0)==0){i=0;return i|0}i=ne(a,b,d,f)|0;return i|0}function ne(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;f=c[b>>2]|0;g=c[f+8>>2]|0;h=c[f+12>>2]|0;i=f|0;j=((c[f+4>>2]|0)-(c[i>>2]|0)|0)/(g|0)|0;k=tc(a,4)|0;l=j<<2;m=tc(a,l)|0;c[k>>2]=m;og(m|0,0,l|0)|0;if((j|0)<=0){n=b+40|0;o=n;p=c[o>>2]|0;q=p+1|0;c[o>>2]=q;return k|0}l=(g|0)>0;m=h-1|0;h=(m|0)>0;a=c[k>>2]|0;r=(e|0)>1;s=(c[i>>2]|0)/(e|0)|0;i=0;while(1){if(l){t=c[d>>2]|0;u=s;v=0;w=0;x=0;while(1){y=c[t+(u<<2)>>2]|0;z=(y|0)>-1?y:-y|0;y=(z|0)>(w|0)?z:w;if(r){z=1;A=x;while(1){B=c[(c[d+(z<<2)>>2]|0)+(u<<2)>>2]|0;C=(B|0)>-1?B:-B|0;B=(C|0)>(A|0)?C:A;C=z+1|0;if((C|0)<(e|0)){z=C;A=B}else{D=B;break}}}else{D=x}A=u+1|0;z=v+e|0;if((z|0)<(g|0)){u=A;v=z;w=y;x=D}else{E=A;F=y;G=D;break}}}else{E=s;F=0;G=0}a:do{if(h){x=0;while(1){if((F|0)<=(c[f+2328+(x<<2)>>2]|0)){if((G|0)<=(c[f+2584+(x<<2)>>2]|0)){H=x;break a}}w=x+1|0;if((w|0)<(m|0)){x=w}else{H=w;break}}}else{H=0}}while(0);c[a+(i<<2)>>2]=H;x=i+1|0;if((x|0)<(j|0)){s=E;i=x}else{break}}n=b+40|0;o=n;p=c[o>>2]|0;q=p+1|0;c[o>>2]=q;return k|0}function oe(a,b,d,e,f,g,h,j){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;j=i;i=i+8|0;k=j|0;l=c[b+36>>2]|0;m=(l|0)/2|0;n=tc(b,ca(g<<2,m)|0)|0;c[k>>2]=n;if((g|0)<=0){i=j;return 0}b=(l|0)>1;l=0;o=0;do{p=c[e+(l<<2)>>2]|0;o=((c[f+(l<<2)>>2]|0)!=0)+o|0;if(b){q=0;r=l;while(1){c[n+(r<<2)>>2]=c[p+(q<<2)>>2];s=q+1|0;if((s|0)<(m|0)){q=s;r=r+g|0}else{break}}}l=l+1|0;}while((l|0)<(g|0));if((o|0)==0){i=j;return 0}he(a,d,k,1,h);i=j;return 0}function pe(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;g=c[b>>2]|0;h=c[g+8>>2]|0;i=b+16|0;j=c[c[i>>2]>>2]|0;k=(ca(c[a+36>>2]|0,f)|0)>>1;l=c[g+4>>2]|0;m=g|0;n=((l|0)<(k|0)?l:k)-(c[m>>2]|0)|0;if((n|0)<=0){return 0}k=(n|0)/(h|0)|0;n=tc(a,((j-1+k|0)/(j|0)|0)<<2)|0;l=0;while(1){if((l|0)>=(f|0)){break}if((c[e+(l<<2)>>2]|0)==0){l=l+1|0}else{break}}if((l|0)==(f|0)){return 0}l=b+8|0;e=c[l>>2]|0;if((e|0)<=0){return 0}o=(k|0)>0;p=a+4|0;a=g+16|0;q=b+28|0;r=(j|0)>0;s=b+20|0;b=0;t=e;a:while(1){if(o){e=(b|0)==0;u=1<<b;v=0;w=0;while(1){if(e){x=Ae(c[i>>2]|0,p)|0;if((x|0)==-1){y=23;break a}if((x|0)>=(c[a>>2]|0)){y=23;break a}z=c[(c[q>>2]|0)+(x<<2)>>2]|0;c[n+(v<<2)>>2]=z;if((z|0)==0){y=23;break a}}if(r&(w|0)<(k|0)){z=n+(v<<2)|0;x=0;A=w;while(1){B=c[(c[z>>2]|0)+(x<<2)>>2]|0;do{if((c[g+24+(B<<2)>>2]&u|0)!=0){C=c[(c[(c[s>>2]|0)+(B<<2)>>2]|0)+(b<<2)>>2]|0;if((C|0)==0){break}D=ca(A,h)|0;if((Fe(C,d,(c[m>>2]|0)+D|0,f,p,h)|0)==-1){y=23;break a}}}while(0);B=x+1|0;D=A+1|0;if((B|0)<(j|0)&(D|0)<(k|0)){x=B;A=D}else{E=D;break}}}else{E=w}if((E|0)<(k|0)){v=v+1|0;w=E}else{break}}F=c[l>>2]|0}else{F=t}w=b+1|0;if((w|0)<(F|0)){b=w;t=F}else{y=23;break}}if((y|0)==23){return 0}return 0}function qe(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;e=i;i=i+64|0;f=e|0;g=e+32|0;h=c[b>>2]|0;j=c[b+48>>2]|0;k=b+52|0;l=c[k>>2]|0;m=c[b+44>>2]|0;n=m>>1;o=f;og(o|0,0,32)|0;p=(h|0)>0;do{if((l|0)==1){if(!p){q=0;break}r=m-1|0;s=0;t=h;u=0;while(1){v=t-1|0;w=c[d+(v<<2)>>2]|0;x=w-j|0;if((x|0)<(n|0)){y=(n-x<<1)-1|0}else{y=x-n<<1}x=ca(s,m)|0;if((y|0)<0){z=0}else{z=(y|0)<(m|0)?y:r}A=z+x|0;c[f+(v<<2)>>2]=w;w=u+1|0;if((w|0)<(h|0)){s=A;t=v;u=w}else{q=A;break}}}else{if(!p){q=0;break}u=(l>>1)-j|0;t=m-1|0;s=0;r=h;A=0;while(1){w=r-1|0;v=(u+(c[d+(w<<2)>>2]|0)|0)/(l|0)|0;if((v|0)<(n|0)){B=(n-v<<1)-1|0}else{B=v-n<<1}x=ca(s,m)|0;if((B|0)<0){C=0}else{C=(B|0)<(m|0)?B:t}D=C+x|0;c[f+(w<<2)>>2]=(ca(v,l)|0)+j;v=A+1|0;if((v|0)<(h|0)){s=D;r=w;A=v}else{q=D;break}}}}while(0);C=c[(c[b+12>>2]|0)+8>>2]|0;do{if((a[C+q|0]|0)<1){B=g;og(B|0,0,32)|0;n=(ca(m-1|0,l)|0)+j|0;p=c[b+4>>2]|0;if((p|0)<=0){E=q;break}z=g|0;y=(h|0)>0;A=q;r=-1;s=0;while(1){do{if((a[C+s|0]|0)>0){if(y){t=0;u=0;while(1){D=(c[g+(t<<2)>>2]|0)-(c[d+(t<<2)>>2]|0)|0;v=(ca(D,D)|0)+u|0;D=t+1|0;if((D|0)<(h|0)){t=D;u=v}else{F=v;break}}}else{F=0}if(!((r|0)==-1|(F|0)<(r|0))){G=r;H=A;break}kg(o|0,B|0,32)|0;G=F;H=s}else{G=r;H=A}}while(0);u=c[z>>2]|0;if((u|0)<(n|0)){I=z;J=u}else{u=0;t=z;while(1){v=u+1|0;c[t>>2]=0;D=g+(v<<2)|0;w=c[D>>2]|0;if((w|0)<(n|0)){I=D;J=w;break}else{u=v;t=D}}}if((J|0)>-1){t=(c[k>>2]|0)+J|0;c[I>>2]=t;K=t}else{K=J}c[I>>2]=-K;t=s+1|0;if((t|0)<(p|0)){A=H;r=G;s=t}else{E=H;break}}}else{E=q}}while(0);if((E|0)>-1&(h|0)>0){L=0;M=d}else{i=e;return E|0}while(1){c[M>>2]=(c[M>>2]|0)-(c[f+(L<<2)>>2]|0);d=L+1|0;if((d|0)<(h|0)){L=d;M=M+4|0}else{break}}i=e;return E|0}function re(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0;e=b;if((c[e>>2]|0)>1){Cf(d,1,1);Cf(d,(c[e>>2]|0)-1|0,4)}else{Cf(d,0,1)}f=b+1156|0;do{if((c[f>>2]|0)>0){Cf(d,1,1);Cf(d,(c[f>>2]|0)-1|0,8);if((c[f>>2]|0)<=0){break}g=b+1160|0;h=a+4|0;i=b+2184|0;j=0;do{k=c[g+(j<<2)>>2]|0;Cf(d,k,xe(c[h>>2]|0)|0);k=c[i+(j<<2)>>2]|0;Cf(d,k,xe(c[h>>2]|0)|0);j=j+1|0;}while((j|0)<(c[f>>2]|0))}else{Cf(d,0,1)}}while(0);Cf(d,0,2);f=c[e>>2]|0;do{if((f|0)>1){j=a+4|0;if((c[j>>2]|0)<=0){break}h=b+4|0;i=0;do{Cf(d,c[h+(i<<2)>>2]|0,4);i=i+1|0;}while((i|0)<(c[j>>2]|0));l=c[e>>2]|0;m=13}else{l=f;m=13}}while(0);do{if((m|0)==13){if((l|0)>0){break}return}}while(0);l=b+1028|0;m=b+1092|0;b=0;do{Cf(d,0,8);Cf(d,c[l+(b<<2)>>2]|0,8);Cf(d,c[m+(b<<2)>>2]|0,8);b=b+1|0;}while((b|0)<(c[e>>2]|0));return}function se(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;d=$f(1,3208)|0;e=c[a+28>>2]|0;og(d|0,0,3208)|0;f=Hf(b,1)|0;a:do{if((f|0)>=0){if((f|0)==0){c[d>>2]=1}else{g=Hf(b,4)|0;c[d>>2]=g+1;if((g|0)<0){break}}g=Hf(b,1)|0;if((g|0)<0){break}b:do{if((g|0)!=0){h=Hf(b,8)|0;i=h+1|0;j=d+1156|0;c[j>>2]=i;if((h|0)<0){break a}h=a+4|0;k=d+1160|0;l=d+2184|0;m=0;n=i;while(1){if((m|0)>=(n|0)){break b}i=Hf(b,xe(c[h>>2]|0)|0)|0;c[k+(m<<2)>>2]=i;o=Hf(b,xe(c[h>>2]|0)|0)|0;c[l+(m<<2)>>2]=o;if((o|i|0)<0|(i|0)==(o|0)){break a}p=c[h>>2]|0;if(!((i|0)<(p|0)&(o|0)<(p|0))){break a}m=m+1|0;n=c[j>>2]|0}}}while(0);if((Hf(b,2)|0)!=0){break}g=d;j=c[g>>2]|0;c:do{if((j|0)>1){n=a+4|0;m=d+4|0;h=0;l=j;while(1){if((h|0)>=(c[n>>2]|0)){q=l;break c}k=Hf(b,4)|0;c[m+(h<<2)>>2]=k;p=c[g>>2]|0;if((k|0)>=(p|0)|(k|0)<0){break a}else{h=h+1|0;l=p}}}else{q=j}}while(0);j=d+1028|0;l=e+16|0;h=d+1092|0;m=e+20|0;n=0;p=q;while(1){if((n|0)>=(p|0)){r=d;break}Hf(b,8)|0;k=Hf(b,8)|0;c[j+(n<<2)>>2]=k;if((k|0)>=(c[l>>2]|0)|(k|0)<0){break a}k=Hf(b,8)|0;c[h+(n<<2)>>2]=k;if((k|0)>=(c[m>>2]|0)|(k|0)<0){break a}n=n+1|0;p=c[g>>2]|0}return r|0}}while(0);te(d);r=0;return r|0}function te(a){a=a|0;if((a|0)!=0){_f(a)}return}function ue(a){a=a|0;var b=0,d=0,e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0.0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0.0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0.0,K=0,L=0,M=0,N=0.0,O=0.0,P=0,Q=0.0,R=0.0,S=0,T=0.0,U=0.0,V=0.0,W=0.0,X=0.0,Y=0.0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0;b=i;d=c[a+64>>2]|0;e=c[d+4>>2]|0;f=c[e+28>>2]|0;h=c[d+104>>2]|0;d=c[a+104>>2]|0;j=c[a+36>>2]|0;k=e+4|0;e=c[k>>2]<<2;l=i;i=i+e|0;i=i+7&-8;m=l;l=tc(a,e)|0;e=tc(a,c[k>>2]<<2)|0;n=tc(a,c[k>>2]<<2)|0;o=d+4|0;p=+g[o>>2];q=i;i=i+(c[k>>2]<<2)|0;i=i+7&-8;r=q;q=a+28|0;s=c[q>>2]|0;t=c[f+544+(s<<2)>>2]|0;u=t;v=(c[h+56>>2]|0)+((((s|0)!=0?2:0)+(c[d+8>>2]|0)|0)*52|0)|0;w=a+40|0;c[w>>2]=s;if((c[k>>2]|0)>0){x=4.0/+(j|0);y=a|0;z=(j|0)/2|0;A=z<<2;B=h+4|0;C=f;D=a+24|0;E=a+32|0;F=h+12|0;G=h+20|0;H=j-1|0;I=(H|0)>1;J=p;K=0;while(1){L=c[(c[y>>2]|0)+(K<<2)>>2]|0;c[e+(K<<2)>>2]=tc(a,A)|0;M=l+(K<<2)|0;c[M>>2]=tc(a,A)|0;N=+we(x)+.345;Lc(L,B,C,c[D>>2]|0,c[q>>2]|0,c[E>>2]|0);dc(c[c[F+(c[q>>2]<<2)>>2]>>2]|0,L,c[M>>2]|0);jc(G+((c[q>>2]|0)*12|0)|0,L);O=N+ +we(+g[L>>2])+.345;g[L>>2]=O;M=r+(K<<2)|0;g[M>>2]=O;if(I){P=1;Q=O;while(1){R=+g[L+(P<<2)>>2];S=P+1|0;T=+g[L+(S<<2)>>2];U=N+ +we(R*R+T*T)*.5+.345;g[L+(S>>1<<2)>>2]=U;if(U>Q){g[M>>2]=U;V=U}else{V=Q}S=P+2|0;if((S|0)<(H|0)){P=S;Q=V}else{W=V;break}}}else{W=O}if(W>0.0){g[M>>2]=0.0;X=0.0}else{X=W}Q=X>J?X:J;P=K+1|0;if((P|0)<(c[k>>2]|0)){J=Q;K=P}else{Y=Q;Z=z;_=A;break}}}else{A=(j|0)/2|0;Y=p;Z=A;_=A<<2}A=tc(a,_)|0;z=tc(a,_)|0;_=c[k>>2]|0;K=t+4|0;a:do{if((_|0)>0){H=a|0;I=(j|0)>1;G=t+1028|0;F=f+800|0;E=h+48|0;D=0;while(1){C=c[K+(D<<2)>>2]|0;B=c[l+(D<<2)>>2]|0;y=c[(c[H>>2]|0)+(D<<2)>>2]|0;P=y+(Z<<2)|0;c[w>>2]=s;L=tc(a,60)|0;S=n+(D<<2)|0;c[S>>2]=L;og(L|0,0,60)|0;if(I){L=0;do{g[y+(L+Z<<2)>>2]=+we(+g[B+(L<<2)>>2])+.345;L=L+1|0;}while((L|0)<(Z|0))}Wc(v,P,A);Yc(v,y,z,Y,+g[r+(D<<2)>>2]);$c(v,A,z,1,y,B,P);L=G+(C<<2)|0;$=c[L>>2]|0;if((c[F+($<<2)>>2]|0)!=1){aa=-1;break}ba=xd(a,c[(c[E>>2]|0)+($<<2)>>2]|0,P,y)|0;c[(c[S>>2]|0)+28>>2]=ba;do{if((Ue(a)|0)!=0){if((c[(c[S>>2]|0)+28>>2]|0)==0){break}$c(v,A,z,2,y,B,P);ba=xd(a,c[(c[E>>2]|0)+(c[L>>2]<<2)>>2]|0,P,y)|0;c[(c[S>>2]|0)+56>>2]=ba;$c(v,A,z,0,y,B,P);ba=xd(a,c[(c[E>>2]|0)+(c[L>>2]<<2)>>2]|0,P,y)|0;c[c[S>>2]>>2]=ba;ba=1;while(1){$=c[S>>2]|0;ca=Dd(a,c[(c[E>>2]|0)+(c[L>>2]<<2)>>2]|0,c[$>>2]|0,c[$+28>>2]|0,(ba<<16|0)/7|0)|0;c[(c[S>>2]|0)+(ba<<2)>>2]=ca;ca=ba+1|0;if((ca|0)<7){ba=ca}else{da=8;break}}do{ba=c[S>>2]|0;ca=Dd(a,c[(c[E>>2]|0)+(c[L>>2]<<2)>>2]|0,c[ba+28>>2]|0,c[ba+56>>2]|0,((da<<16)-458752|0)/7|0)|0;c[(c[S>>2]|0)+(da<<2)>>2]=ca;da=da+1|0;}while((da|0)<14)}}while(0);S=D+1|0;L=c[k>>2]|0;if((S|0)<(L|0)){D=S}else{ea=L;fa=G;ga=E;break a}}i=b;return aa|0}else{ea=_;fa=t+1028|0;ga=h+48|0}}while(0);g[o>>2]=Y;o=ea<<2;ea=i;i=i+o|0;i=i+7&-8;_=ea;ea=i;i=i+o|0;i=i+7&-8;o=ea;ea=(Ue(a)|0)!=0;Ue(a)|0;da=d+12|0;d=h+44|0;z=a+24|0;A=a+32|0;r=f+2868|0;Z=f+3240|0;w=t;j=t+1092|0;t=f+1312|0;f=h+52|0;h=ea?0:7;while(1){ea=c[da+(h<<2)>>2]|0;Cf(ea,0,1);Cf(ea,s,c[d>>2]|0);if((c[q>>2]|0)!=0){Cf(ea,c[z>>2]|0,1);Cf(ea,c[A>>2]|0,1)}E=c[k>>2]|0;if((E|0)>0){G=0;while(1){c[m+(G<<2)>>2]=Ed(ea,a,c[(c[ga>>2]|0)+(c[fa+(c[K+(G<<2)>>2]<<2)>>2]<<2)>>2]|0,c[(c[n+(G<<2)>>2]|0)+(h<<2)>>2]|0,c[e+(G<<2)>>2]|0)|0;D=G+1|0;F=c[k>>2]|0;if((D|0)<(F|0)){G=D}else{ha=F;break}}}else{ha=E}bd(h,r,v,u,l,e,m,c[Z+((c[q>>2]|0)*60|0)+(h<<2)>>2]|0,ha);if((c[w>>2]|0)>0){G=0;do{F=c[j+(G<<2)>>2]|0;D=c[k>>2]|0;if((D|0)>0){I=0;H=0;M=D;while(1){if((c[K+(I<<2)>>2]|0)==(G|0)){D=o+(H<<2)|0;c[D>>2]=0;if((c[m+(I<<2)>>2]|0)!=0){c[D>>2]=1}c[_+(H<<2)>>2]=c[e+(I<<2)>>2];ia=H+1|0;ja=c[k>>2]|0}else{ia=H;ja=M}D=I+1|0;if((D|0)<(ja|0)){I=D;H=ia;M=ja}else{ka=ia;break}}}else{ka=0}M=t+(F<<2)|0;H=Ab[c[(c[172352+(c[M>>2]<<2)>>2]|0)+20>>2]&15](a,c[(c[f>>2]|0)+(F<<2)>>2]|0,_,o,ka)|0;I=c[k>>2]|0;if((I|0)>0){D=0;L=0;while(1){if((c[K+(D<<2)>>2]|0)==(G|0)){c[_+(L<<2)>>2]=c[e+(D<<2)>>2];la=L+1|0}else{la=L}S=D+1|0;if((S|0)<(I|0)){D=S;L=la}else{ma=la;break}}}else{ma=0}wb[c[(c[172352+(c[M>>2]<<2)>>2]|0)+24>>2]&7](ea,a,c[(c[f>>2]|0)+(F<<2)>>2]|0,_,o,ma,H,G)|0;G=G+1|0;}while((G|0)<(c[w>>2]|0))}G=h+1|0;ea=(Ue(a)|0)!=0;if((G|0)>((ea?14:7)|0)){aa=0;break}else{h=G}}i=b;return aa|0}function ve(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0.0,I=0.0,J=0;d=i;e=c[a+64>>2]|0;f=c[e+4>>2]|0;h=c[f+28>>2]|0;j=c[e+104>>2]|0;e=a+28|0;k=c[h+(c[e>>2]<<2)>>2]|0;c[a+36>>2]=k;l=f+4|0;f=c[l>>2]<<2;m=i;i=i+f|0;i=i+7&-8;n=m;m=i;i=i+f|0;i=i+7&-8;o=m;m=i;i=i+f|0;i=i+7&-8;p=m;m=i;i=i+f|0;i=i+7&-8;f=m;m=c[l>>2]|0;if((m|0)>0){q=b+4|0;r=b+1028|0;s=h+800|0;t=j+48|0;u=a|0;v=k<<1&2147483646;w=0;while(1){x=c[r+(c[q+(w<<2)>>2]<<2)>>2]|0;y=zb[c[(c[223712+(c[s+(x<<2)>>2]<<2)>>2]|0)+20>>2]&31](a,c[(c[t>>2]|0)+(x<<2)>>2]|0)|0;c[f+(w<<2)>>2]=y;c[p+(w<<2)>>2]=(y|0)!=0;og(c[(c[u>>2]|0)+(w<<2)>>2]|0,0,v|0)|0;y=w+1|0;x=c[l>>2]|0;if((y|0)<(x|0)){w=y}else{z=x;break}}}else{z=m}m=b+1156|0;w=c[m>>2]|0;if((w|0)>0){v=b+1160|0;u=b+2184|0;t=0;do{s=p+(c[v+(t<<2)>>2]<<2)|0;q=c[u+(t<<2)>>2]|0;if((c[s>>2]|0)==0){if((c[p+(q<<2)>>2]|0)!=0){A=10}}else{A=10}if((A|0)==10){A=0;c[s>>2]=1;c[p+(q<<2)>>2]=1}t=t+1|0;}while((t|0)<(w|0))}t=b;if((c[t>>2]|0)>0){A=b+1092|0;u=h+1312|0;v=j+52|0;q=b+4|0;s=a|0;r=0;x=z;while(1){if((x|0)>0){z=0;y=0;B=x;while(1){if((c[q+(y<<2)>>2]|0)==(r|0)){c[o+(z<<2)>>2]=(c[p+(y<<2)>>2]|0)!=0;c[n+(z<<2)>>2]=c[(c[s>>2]|0)+(y<<2)>>2];C=z+1|0;D=c[l>>2]|0}else{C=z;D=B}E=y+1|0;if((E|0)<(D|0)){z=C;y=E;B=D}else{F=C;break}}}else{F=0}B=c[A+(r<<2)>>2]|0;Ab[c[(c[172352+(c[u+(B<<2)>>2]<<2)>>2]|0)+28>>2]&15](a,c[(c[v>>2]|0)+(B<<2)>>2]|0,n,o,F)|0;B=r+1|0;if((B|0)>=(c[t>>2]|0)){break}r=B;x=c[l>>2]|0}G=c[m>>2]|0}else{G=w}if((G|0)>0){w=b+1160|0;m=c[a>>2]|0;x=b+2184|0;r=(k|0)/2|0;t=(k|0)>1;k=G;do{k=k-1|0;G=c[m+(c[w+(k<<2)>>2]<<2)>>2]|0;F=c[m+(c[x+(k<<2)>>2]<<2)>>2]|0;if(t){o=0;do{n=G+(o<<2)|0;H=+g[n>>2];v=F+(o<<2)|0;I=+g[v>>2];u=I>0.0;do{if(H>0.0){if(u){g[n>>2]=H;g[v>>2]=H-I;break}else{g[v>>2]=H;g[n>>2]=H+I;break}}else{if(u){g[n>>2]=H;g[v>>2]=H+I;break}else{g[v>>2]=H;g[n>>2]=H-I;break}}}while(0);o=o+1|0;}while((o|0)<(r|0))}}while((k|0)>0)}if((c[l>>2]|0)<=0){i=d;return 0}k=a|0;r=b+4|0;t=b+1028|0;b=h+800|0;h=j+48|0;x=0;do{m=c[t+(c[r+(x<<2)>>2]<<2)>>2]|0;xb[c[(c[223712+(c[b+(m<<2)>>2]<<2)>>2]|0)+24>>2]&15](a,c[(c[h>>2]|0)+(m<<2)>>2]|0,c[f+(x<<2)>>2]|0,c[(c[k>>2]|0)+(x<<2)>>2]|0)|0;x=x+1|0;J=c[l>>2]|0;}while((x|0)<(J|0));if((J|0)<=0){i=d;return 0}J=a|0;a=j+12|0;j=0;do{x=c[(c[J>>2]|0)+(j<<2)>>2]|0;ac(c[c[a+(c[e>>2]<<2)>>2]>>2]|0,x,x);j=j+1|0;}while((j|0)<(c[l>>2]|0));i=d;return 0}function we(a){a=+a;return+(+(((g[k>>2]=a,c[k>>2]|0)&2147483647)>>>0>>>0)*7.177114298428933e-7+ -764.6162109375)}function xe(a){a=a|0;var b=0,c=0,d=0,e=0;b=(a|0)==0?0:a-1|0;if((b|0)==0){c=0;return c|0}else{d=b;e=0}while(1){b=e+1|0;a=d>>>1;if((a|0)==0){c=b;break}else{d=a;e=b}}return c|0}function ye(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;Cf(d,5653314,24);e=b|0;Cf(d,c[e>>2]|0,16);f=b+4|0;Cf(d,c[f>>2]|0,24);g=c[f>>2]|0;h=b+8|0;i=1;while(1){if((i|0)>=(g|0)){break}j=c[h>>2]|0;k=a[j+(i-1)|0]|0;if(k<<24>>24==0){break}if((a[j+i|0]|0)<k<<24>>24){break}else{i=i+1|0}}a:do{if((i|0)==(g|0)){Cf(d,1,1);Cf(d,(a[c[h>>2]|0]|0)-1|0,5);k=c[f>>2]|0;if((k|0)>1){j=0;l=1;m=k;while(1){n=c[h>>2]|0;o=a[n+l|0]|0;p=a[n+(l-1)|0]|0;n=o<<24>>24;if(o<<24>>24>p<<24>>24){o=p<<24>>24;p=j;q=m;while(1){Cf(d,l-p|0,He(q-p|0)|0);r=o+1|0;s=c[f>>2]|0;if((r|0)<(n|0)){o=r;p=l;q=s}else{t=l;u=s;break}}}else{t=j;u=m}q=l+1|0;if((q|0)<(u|0)){j=t;l=q;m=u}else{v=t;w=q;x=u;break}}}else{v=0;w=1;x=k}Cf(d,w-v|0,He(x-v|0)|0)}else{Cf(d,0,1);m=c[f>>2]|0;l=0;while(1){if((l|0)>=(m|0)){break}if((a[(c[h>>2]|0)+l|0]|0)==0){break}else{l=l+1|0}}if((l|0)==(m|0)){Cf(d,0,1);if((c[f>>2]|0)>0){y=0}else{break}while(1){Cf(d,(a[(c[h>>2]|0)+y|0]|0)-1|0,5);y=y+1|0;if((y|0)>=(c[f>>2]|0)){break a}}}Cf(d,1,1);if((c[f>>2]|0)>0){z=0}else{break}do{if((a[(c[h>>2]|0)+z|0]|0)==0){Cf(d,0,1)}else{Cf(d,1,1);Cf(d,(a[(c[h>>2]|0)+z|0]|0)-1|0,5)}z=z+1|0;}while((z|0)<(c[f>>2]|0))}}while(0);z=b+12|0;Cf(d,c[z>>2]|0,4);h=c[z>>2]|0;if((h|0)==1|(h|0)==2){A=24}else if((h|0)!=0){B=-1;return B|0}do{if((A|0)==24){h=b+32|0;if((c[h>>2]|0)==0){B=-1;return B|0}Cf(d,c[b+16>>2]|0,32);Cf(d,c[b+20>>2]|0,32);y=b+24|0;Cf(d,(c[y>>2]|0)-1|0,4);Cf(d,c[b+28>>2]|0,1);v=c[z>>2]|0;if((v|0)==1){C=Ke(b)|0}else if((v|0)==2){C=ca(c[e>>2]|0,c[f>>2]|0)|0}else{break}if((C|0)>0){D=0}else{break}do{v=c[(c[h>>2]|0)+(D<<2)>>2]|0;Cf(d,(v|0)>-1?v:-v|0,c[y>>2]|0);D=D+1|0;}while((D|0)<(C|0))}}while(0);B=0;return B|0}function ze(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;if((d|0)<0){f=0;return f|0}g=b+12|0;h=c[g>>2]|0;if((c[h+4>>2]|0)<=(d|0)){f=0;return f|0}Cf(e,c[(c[b+20>>2]|0)+(d<<2)>>2]|0,a[(c[h+8>>2]|0)+d|0]|0);f=a[(c[(c[g>>2]|0)+8>>2]|0)+d|0]|0;return f|0}function Ae(a,b){a=a|0;b=b|0;var d=0,e=0;if((c[a+8>>2]|0)<=0){d=-1;return d|0}e=Be(a,b)|0;if(!((e|0)>-1)){d=-1;return d|0}d=c[(c[a+24>>2]|0)+(e<<2)>>2]|0;return d|0}function Be(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;e=c[b+40>>2]|0;f=Ff(d,c[b+36>>2]|0)|0;do{if((f|0)>-1){g=c[(c[b+32>>2]|0)+(f<<2)>>2]|0;if((g|0)<0){h=g>>>15&32767;i=(c[b+8>>2]|0)-(g&32767)|0;break}j=g-1|0;Gf(d,a[(c[b+28>>2]|0)+j|0]|0);k=j;return k|0}else{h=0;i=c[b+8>>2]|0}}while(0);f=Ff(d,e)|0;j=(f|0)<0;if(j&(e|0)>1){g=e;while(1){l=g-1|0;m=Ff(d,l)|0;n=(m|0)<0;if(n&(l|0)>1){g=l}else{o=m;p=l;q=n;break}}}else{o=f;p=e;q=j}if(q){k=-1;return k|0}q=Ge(o)|0;o=i-h|0;if((o|0)>1){j=c[b+20>>2]|0;e=i;i=h;f=o;while(1){o=f>>1;g=(c[j+(o+i<<2)>>2]|0)>>>0>q>>>0;n=((g^1)<<31>>31&o)+i|0;l=e-(o&-(g&1))|0;g=l-n|0;if((g|0)>1){e=l;i=n;f=g}else{r=n;break}}}else{r=h}h=a[(c[b+28>>2]|0)+r|0]|0;if((h|0)>(p|0)){Gf(d,p);k=-1;return k|0}else{Gf(d,h);k=r;return k|0}return 0}function Ce(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;f=i;if((c[a+8>>2]|0)<=0){h=0;i=f;return h|0}j=a|0;k=c[j>>2]|0;l=(e|0)/(k|0)|0;e=i;i=i+(l<<2)|0;i=i+7&-8;m=e;e=(l|0)>0;a:do{if(e){n=a+16|0;o=0;while(1){p=Be(a,d)|0;if((p|0)==-1){h=-1;break}q=c[j>>2]|0;c[m+(o<<2)>>2]=(c[n>>2]|0)+((ca(q,p)|0)<<2);p=o+1|0;if((p|0)<(l|0)){o=p}else{r=q;break a}}i=f;return h|0}else{r=k}}while(0);if((r|0)>0){s=0;t=0}else{h=0;i=f;return h|0}while(1){if(e){k=0;do{j=b+(k+t<<2)|0;g[j>>2]=+g[(c[m+(k<<2)>>2]|0)+(s<<2)>>2]+ +g[j>>2];k=k+1|0;}while((k|0)<(l|0))}k=s+1|0;if((k|0)<(r|0)){s=k;t=t+l|0}else{h=0;break}}i=f;return h|0}function De(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;if((c[a+8>>2]|0)<=0){f=0;return f|0}h=a|0;if((c[h>>2]|0)>8){if((e|0)<=0){f=0;return f|0}i=a+16|0;j=0;while(1){k=Be(a,d)|0;if((k|0)==-1){f=-1;l=24;break}m=c[i>>2]|0;n=c[h>>2]|0;o=ca(n,k)|0;if((n|0)>0){k=(n|0)>1?n:1;p=j;q=0;while(1){r=q+1|0;s=b+(p<<2)|0;g[s>>2]=+g[m+(q+o<<2)>>2]+ +g[s>>2];if((r|0)<(n|0)){p=p+1|0;q=r}else{break}}t=j+k|0}else{t=j}if((t|0)<(e|0)){j=t}else{f=0;l=24;break}}if((l|0)==24){return f|0}}t=a+16|0;j=0;a:while(1){i=(j|0)<(e|0);b:while(1){if(!i){f=0;l=24;break a}q=Be(a,d)|0;if((q|0)==-1){f=-1;l=24;break a}u=c[t>>2]|0;p=c[h>>2]|0;v=ca(p,q)|0;switch(p|0){case 6:{w=0;x=j;l=17;break b;break};case 2:{y=0;z=j;l=21;break b;break};case 7:{A=0;B=j;l=16;break b;break};case 5:{C=0;D=j;l=18;break b;break};case 3:{E=0;F=j;l=20;break b;break};case 1:{G=0;H=j;break b;break};case 4:{I=0;J=j;l=19;break b;break};case 8:{l=15;break b;break};default:{}}}if((l|0)==15){l=0;i=b+(j<<2)|0;g[i>>2]=+g[u+(v<<2)>>2]+ +g[i>>2];A=1;B=j+1|0;l=16}if((l|0)==16){l=0;i=b+(B<<2)|0;g[i>>2]=+g[u+(A+v<<2)>>2]+ +g[i>>2];w=A+1|0;x=B+1|0;l=17}if((l|0)==17){l=0;i=b+(x<<2)|0;g[i>>2]=+g[u+(w+v<<2)>>2]+ +g[i>>2];C=w+1|0;D=x+1|0;l=18}if((l|0)==18){l=0;i=b+(D<<2)|0;g[i>>2]=+g[u+(C+v<<2)>>2]+ +g[i>>2];I=C+1|0;J=D+1|0;l=19}if((l|0)==19){l=0;i=b+(J<<2)|0;g[i>>2]=+g[u+(I+v<<2)>>2]+ +g[i>>2];E=I+1|0;F=J+1|0;l=20}if((l|0)==20){l=0;i=b+(F<<2)|0;g[i>>2]=+g[u+(E+v<<2)>>2]+ +g[i>>2];y=E+1|0;z=F+1|0;l=21}if((l|0)==21){l=0;i=b+(z<<2)|0;g[i>>2]=+g[u+(y+v<<2)>>2]+ +g[i>>2];G=y+1|0;H=z+1|0}i=b+(H<<2)|0;g[i>>2]=+g[u+(G+v<<2)>>2]+ +g[i>>2];j=H+1|0}if((l|0)==24){return f|0}return 0}function Ee(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;f=b;h=(e|0)>0;if((c[a+8>>2]|0)<=0){if(!h){i=0;return i|0}og(f|0,0,e<<2|0)|0;i=0;return i|0}if(!h){i=0;return i|0}h=a+16|0;f=a|0;j=0;while(1){k=Be(a,d)|0;if((k|0)==-1){i=-1;l=11;break}m=c[h>>2]|0;n=c[f>>2]|0;o=ca(n,k)|0;a:do{if((j|0)<(e|0)){k=0;p=j;while(1){if((k|0)>=(n|0)){q=p;break a}r=p+1|0;g[b+(p<<2)>>2]=+g[m+(k+o<<2)>>2];if((r|0)<(e|0)){k=k+1|0;p=r}else{q=r;break}}}else{q=j}}while(0);if((q|0)<(e|0)){j=q}else{i=0;l=11;break}}if((l|0)==11){return i|0}return 0}function Fe(a,b,d,e,f,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;if((c[a+8>>2]|0)<=0){i=0;return i|0}j=(d|0)/(e|0)|0;k=(h+d|0)/(e|0)|0;if((j|0)>=(k|0)){i=0;return i|0}d=a+16|0;h=a|0;l=j;j=0;while(1){m=Be(a,f)|0;if((m|0)==-1){i=-1;n=8;break}o=c[d>>2]|0;p=c[h>>2]|0;q=ca(p,m)|0;if((p|0)>0){m=0;r=l;s=j;while(1){t=s+1|0;u=(c[b+(s<<2)>>2]|0)+(r<<2)|0;g[u>>2]=+g[o+(m+q<<2)>>2]+ +g[u>>2];u=(t|0)==(e|0);v=(u&1)+r|0;w=u?0:t;t=m+1|0;if((t|0)<(p|0)){m=t;r=v;s=w}else{x=v;y=w;break}}}else{x=l;y=j}if((x|0)<(k|0)){l=x;j=y}else{i=0;n=8;break}}if((n|0)==8){return i|0}return 0}function Ge(a){a=a|0;var b=0;b=a>>>16|a<<16;a=b>>>8&16711935|b<<8&-16711936;b=a>>>4&252645135|a<<4&-252645136;a=b>>>2&858993459|b<<2&-858993460;return a>>>1&1431655765|a<<1&-1431655766|0}function He(a){a=a|0;var b=0,c=0,d=0,e=0;if((a|0)==0){b=0}else{c=a;a=0;while(1){d=a+1|0;e=c>>>1;if((e|0)==0){b=d;break}else{c=e;a=d}}}return b|0}function Ie(a){a=a|0;var b=0.0,c=0.0;b=+(a&2097151|0);if((a|0)<0){c=-0.0-b}else{c=b}return+(+Kf(c,(a>>>21&1023)-788|0))}function Je(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;f=i;i=i+136|0;g=f|0;h=(e|0)!=0;j=Zf((h?e:d)<<2)|0;k=j;og(g|0,0,132)|0;l=(d|0)>0;a:do{if(l){m=g+4|0;n=(e|0)==0|0;o=0;p=0;b:while(1){q=a[b+p|0]|0;r=q<<24>>24;c:do{if(q<<24>>24>0){s=c[g+(r<<2)>>2]|0;if(q<<24>>24<32){if((s>>>(r>>>0)|0)!=0){break b}}c[k+(o<<2)>>2]=s;t=r;u=s;while(1){v=g+(t<<2)|0;if((u&1|0)!=0){w=9;break}c[v>>2]=u+1;x=t-1|0;if((x|0)<=0){break}t=x;u=c[g+(x<<2)>>2]|0}do{if((w|0)==9){w=0;if((t|0)==1){c[m>>2]=(c[m>>2]|0)+1;break}else{c[v>>2]=c[g+(t-1<<2)>>2]<<1;break}}}while(0);t=r+1|0;if((t|0)<33){y=r;z=s;A=t}else{B=1;break}while(1){t=g+(A<<2)|0;u=c[t>>2]|0;if((u>>>1|0)!=(z|0)){B=1;break c}c[t>>2]=c[g+(y<<2)>>2]<<1;t=A+1|0;if((t|0)<33){y=A;z=u;A=t}else{B=1;break}}}else{B=n}}while(0);r=p+1|0;if((r|0)<(d|0)){o=o+B|0;p=r}else{break a}}_f(j);C=0;i=f;return C|0}}while(0);d:do{if((e|0)!=1){B=1;while(1){if((B|0)>=33){break d}if((c[g+(B<<2)>>2]&-1>>>((32-B|0)>>>0)|0)==0){B=B+1|0}else{break}}_f(j);C=0;i=f;return C|0}}while(0);if(l){D=0;E=0}else{C=k;i=f;return C|0}while(1){l=a[b+E|0]|0;if(l<<24>>24>0){j=c[k+(D<<2)>>2]|0;g=l<<24>>24;e=0;B=0;while(1){A=j>>>(e>>>0)&1|B<<1;z=e+1|0;if((z|0)<(g|0)){e=z;B=A}else{F=A;break}}}else{F=0}do{if(h){if(l<<24>>24==0){G=D;break}c[k+(D<<2)>>2]=F;G=D+1|0}else{c[k+(D<<2)>>2]=F;G=D+1|0}}while(0);l=E+1|0;if((l|0)<(d|0)){D=G;E=l}else{C=k;break}}i=f;return C|0}function Ke(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;b=c[a+4>>2]|0;d=c[a>>2]|0;a=(d|0)>0;e=~~+Q(+T(+(+(b|0)),+(1.0/+(d|0))));while(1){if(a){f=e+1|0;g=1;h=1;i=0;while(1){j=ca(g,e)|0;k=ca(h,f)|0;l=i+1|0;if((l|0)<(d|0)){g=j;h=k;i=l}else{m=j;n=k;break}}}else{m=1;n=1}if((m|0)<=(b|0)&(n|0)>(b|0)){break}if((m|0)>(b|0)){e=e-1|0;continue}else{e=e+1|0;continue}}return e|0}function Le(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,h=0,i=0.0,j=0.0,k=0,l=0,m=0,n=0,o=0,p=0,q=0.0,r=0.0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0.0,C=0.0,D=0,E=0;f=b+12|0;if(!(((c[f>>2]|0)-1|0)>>>0<2>>>0)){h=0;return h|0}i=+Ie(c[b+16>>2]|0);j=+Ie(c[b+20>>2]|0);k=c[b>>2]|0;l=$f(ca(k,d)|0,4)|0;d=c[f>>2]|0;if((d|0)==2){f=c[b+4>>2]|0;if((f|0)<=0){h=l;return h|0}m=(e|0)!=0;n=b+8|0;o=m^1;p=b+32|0;q=j;r=i;s=b+28|0;t=0;u=0;while(1){if(m){if((a[(c[n>>2]|0)+u|0]|0)!=0|o){v=19}else{w=t}}else{v=19}if((v|0)==19){v=0;if((k|0)>0){x=c[p>>2]|0;y=(c[s>>2]|0)==0;z=e+(t<<2)|0;A=0;B=0.0;while(1){C=B+(r+q*+R(+(+(c[x+((ca(k,u)|0)+A<<2)>>2]|0))));if(m){g[l+((ca(c[z>>2]|0,k)|0)+A<<2)>>2]=C}else{g[l+((ca(k,t)|0)+A<<2)>>2]=C}D=A+1|0;if((D|0)<(k|0)){A=D;B=y?B:C}else{break}}}w=t+1|0}y=u+1|0;if((y|0)<(f|0)){t=w;u=y}else{h=l;break}}return h|0}else if((d|0)==1){d=Ke(b)|0;u=c[b+4>>2]|0;if((u|0)<=0){h=l;return h|0}w=(e|0)!=0;t=b+8|0;f=w^1;m=b+32|0;q=j;j=i;s=b+28|0;b=0;p=0;while(1){if(w){if((a[(c[t>>2]|0)+p|0]|0)!=0|f){v=9}else{E=b}}else{v=9}if((v|0)==9){v=0;if((k|0)>0){o=c[m>>2]|0;n=(c[s>>2]|0)==0;y=e+(b<<2)|0;A=0;i=0.0;z=1;while(1){r=i+(j+q*+R(+(+(c[o+((((p|0)/(z|0)|0|0)%(d|0)|0)<<2)>>2]|0))));if(w){g[l+((ca(c[y>>2]|0,k)|0)+A<<2)>>2]=r}else{g[l+((ca(k,b)|0)+A<<2)>>2]=r}x=ca(z,d)|0;D=A+1|0;if((D|0)<(k|0)){A=D;i=n?i:r;z=x}else{break}}}E=b+1|0}z=p+1|0;if((z|0)<(u|0)){b=E;p=z}else{h=l;break}}return h|0}else{h=l;return h|0}return 0}function Me(a){a=a|0;var b=0;if((c[a+36>>2]|0)==0){return}b=c[a+32>>2]|0;if((b|0)!=0){_f(b)}b=c[a+8>>2]|0;if((b|0)!=0){_f(b)}_f(a);return}function Ne(a){a=a|0;var b=0,d=0;b=c[a+16>>2]|0;if((b|0)!=0){_f(b)}b=c[a+20>>2]|0;if((b|0)!=0){_f(b)}b=c[a+24>>2]|0;if((b|0)!=0){_f(b)}b=c[a+28>>2]|0;if((b|0)!=0){_f(b)}b=c[a+32>>2]|0;if((b|0)==0){d=a;og(d|0,0,56)|0;return}_f(b);d=a;og(d|0,0,56)|0;return}function Oe(a,b){a=a|0;b=b|0;var d=0;og(a|0,0,56)|0;c[a+12>>2]=b;d=b+4|0;c[a+4>>2]=c[d>>2];c[a+8>>2]=c[d>>2];c[a>>2]=c[b>>2];c[a+20>>2]=Je(c[b+8>>2]|0,c[d>>2]|0,0)|0;c[a+44>>2]=Ke(b)|0;c[a+48>>2]=~~+xa(+(+Ie(c[b+16>>2]|0)));c[a+52>>2]=~~+xa(+(+Ie(c[b+20>>2]|0)));return 0}function Pe(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;e=i;og(b|0,0,56)|0;f=d+4|0;g=c[f>>2]|0;if((g|0)>0){h=c[d+8>>2]|0;j=0;k=0;while(1){l=((a[h+k|0]|0)>0)+j|0;m=k+1|0;if((m|0)<(g|0)){j=l;k=m}else{n=l;break}}}else{n=0}c[b+4>>2]=g;g=b+8|0;c[g>>2]=n;c[b>>2]=c[d>>2];if((n|0)<=0){o=0;i=e;return o|0}k=d+8|0;j=Je(c[k>>2]|0,c[f>>2]|0,n)|0;h=n<<2;l=i;i=i+h|0;i=i+7&-8;m=l;if((j|0)==0){Ne(b);o=-1;i=e;return o|0}else{p=0}do{q=j+(p<<2)|0;c[q>>2]=Qe(c[q>>2]|0)|0;c[m+(p<<2)>>2]=q;p=p+1|0;}while((p|0)<(n|0));Ma(l|0,n|0,4,14);l=i;i=i+h|0;i=i+7&-8;p=l;l=Zf(h)|0;q=b+20|0;c[q>>2]=l;r=j;s=0;while(1){c[p+((c[m+(s<<2)>>2]|0)-r>>2<<2)>>2]=s;t=s+1|0;if((t|0)<(n|0)){s=t}else{u=0;break}}do{c[l+(c[p+(u<<2)>>2]<<2)>>2]=c[j+(u<<2)>>2];u=u+1|0;}while((u|0)<(n|0));_f(j);c[b+16>>2]=Le(d,n,p)|0;n=Zf(h)|0;c[b+24>>2]=n;h=c[f>>2]|0;d=(h|0)>0;do{if(d){j=c[k>>2]|0;u=0;l=0;while(1){if((a[j+l|0]|0)>0){c[n+(c[p+(u<<2)>>2]<<2)>>2]=l;v=u+1|0}else{v=u}s=l+1|0;if((s|0)<(h|0)){u=v;l=s}else{break}}l=b+28|0;c[l>>2]=Zf(v)|0;if(d){w=0;x=0;y=h}else{z=0;A=l;break}while(1){u=a[(c[k>>2]|0)+x|0]|0;if(u<<24>>24>0){a[(c[l>>2]|0)+(c[p+(w<<2)>>2]|0)|0]=u;B=w+1|0;C=c[f>>2]|0}else{B=w;C=y}u=x+1|0;if((u|0)<(C|0)){w=B;x=u;y=C}else{z=B;A=l;break}}}else{l=b+28|0;c[l>>2]=Zf(0)|0;z=0;A=l}}while(0);B=(He(c[g>>2]|0)|0)-4|0;g=b+36|0;C=(B|0)<5?5:B;B=(C|0)>8?8:C;c[g>>2]=B;C=1<<B;y=$f(C,4)|0;c[b+32>>2]=y;x=b+40|0;c[x>>2]=0;a:do{if((z|0)>0){b=c[A>>2]|0;w=0;f=B;p=0;while(1){k=b+w|0;h=a[k]|0;d=h<<24>>24;if((p|0)<(d|0)){c[x>>2]=d;D=a[k]|0}else{D=h}h=D<<24>>24;do{if((h|0)>(f|0)){E=f}else{d=Qe(c[(c[q>>2]|0)+(w<<2)>>2]|0)|0;if((1<<f-h|0)<=0){E=f;break}v=w+1|0;n=0;l=h;while(1){c[y+((n<<l|d)<<2)>>2]=v;u=n+1|0;j=c[g>>2]|0;s=a[k]|0;if((u|0)<(1<<j-s|0)){n=u;l=s}else{E=j;break}}}}while(0);k=w+1|0;if((k|0)>=(z|0)){F=E;break a}w=k;f=E;p=c[x>>2]|0}}else{F=B}}while(0);B=-2<<31-F;if((C|0)>0){G=0;H=0;I=0;J=F}else{o=0;i=e;return o|0}while(1){F=G<<32-J;x=y+((Qe(F)|0)<<2)|0;if((c[x>>2]|0)==0){E=H;while(1){D=E+1|0;if((D|0)>=(z|0)){K=I;break}if((c[(c[q>>2]|0)+(D<<2)>>2]|0)>>>0>F>>>0){K=I;break}else{E=D}}while(1){if((K|0)>=(z|0)){break}if(F>>>0<(c[(c[q>>2]|0)+(K<<2)>>2]&B)>>>0){break}else{K=K+1|0}}F=z-K|0;c[x>>2]=(E>>>0>32767>>>0?-1073774592:E<<15|-2147483648)|(F>>>0>32767>>>0?32767:F);L=K;M=E}else{L=I;M=H}F=G+1|0;if((F|0)>=(C|0)){o=0;break}G=F;H=M;I=L;J=c[g>>2]|0}i=e;return o|0}function Qe(a){a=a|0;var b=0;b=a>>>16|a<<16;a=b>>>8&16711935|b<<8&-16711936;b=a>>>4&252645135|a<<4&-252645136;a=b>>>2&858993459|b<<2&-858993460;return a>>>1&1431655765|a<<1&-1431655766|0}function Re(a,b){a=a|0;b=b|0;var d=0;d=c[c[a>>2]>>2]|0;a=c[c[b>>2]>>2]|0;return(d>>>0>a>>>0)-(d>>>0<a>>>0)|0}function Se(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,i=0.0,j=0.0;d=c[a+28>>2]|0;e=d+3360|0;og(b|0,0,48)|0;if((e|0)==0){return}f=d+3372|0;if((c[f>>2]|0)<=0){return}g=c[a+8>>2]|0;a=c[d>>2]|0;c[b+24>>2]=(c[d+4>>2]|0)/(a|0)|0;c[b>>2]=1;i=+(a>>1|0);j=+(g|0);c[b+12>>2]=~~+xa(+(i*+(c[e>>2]|0)/j));c[b+16>>2]=~~+xa(+(i*+(c[d+3364>>2]|0)/j));c[b+20>>2]=~~+xa(+(i*+(c[d+3368>>2]|0)/j));h[b+32>>3]=7.0;e=~~(+(c[f>>2]|0)*+h[d+3376>>3]);c[b+8>>2]=e;c[b+4>>2]=e;return}function Te(a){a=a|0;og(a|0,0,48)|0;return}function Ue(a){a=a|0;var b=0,d=0;b=(c[(c[a+64>>2]|0)+104>>2]|0)+80|0;do{if((b|0)!=0){if((c[b>>2]|0)==0){break}else{d=1}return d|0}}while(0);d=0;return d|0}function Ve(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0.0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0.0,K=0.0,L=0.0,M=0.0,N=0.0,O=0.0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,da=0,ea=0,fa=0,ga=0,ha=0;b=c[a+104>>2]|0;d=c[a+64>>2]|0;e=c[d+104>>2]|0;f=c[d+4>>2]|0;d=c[f+28>>2]|0;g=e+112|0;i=~~+xa(+(+h[g>>3]));j=b+12|0;b=j;k=(If(c[b+(i<<2)>>2]|0)|0)<<3;l=a+28|0;m=c[l>>2]|0;n=e+96|0;o=c[n>>2]|0;if((m|0)==0){p=e+100|0;q=c[p>>2]|0;r=o;s=p;t=0}else{p=c[e+104>>2]|0;u=ca(p,o)|0;v=e+100|0;q=ca(p,c[v>>2]|0)|0;r=u;s=v;t=m}m=c[d+(t<<2)>>2]>>1;v=d+3372|0;u=~~(+(c[v>>2]|0)*+h[d+3376>>3]);p=e+120|0;if((c[e+80>>2]|0)==0){if((c[p>>2]|0)!=0){w=-1;return w|0}c[p>>2]=a;w=0;return w|0}c[p>>2]=a;a=e+92|0;p=c[a>>2]|0;if((p|0)>0){if((t|0)==0){x=p}else{x=ca(c[e+104>>2]|0,p)|0}y=15.0/+h[d+3384>>3];d=e+84|0;p=c[d>>2]|0;t=p+(k-x)|0;a:do{if((t|0)>(u|0)){if((i|0)>0&(k|0)>(x|0)){z=k;A=i;B=p}else{C=i;break}while(1){if((z-x+B|0)<=(u|0)){C=A;break a}D=A-1|0;E=(If(c[b+(D<<2)>>2]|0)|0)<<3;if(!((D|0)>0&(E|0)>(x|0))){C=D;break a}z=E;A=D;B=c[d>>2]|0}}else{if((t|0)>=(u|0)){C=i;break}D=i+1|0;if((D|0)<15&(k|0)<(x|0)){F=k;G=i;H=D;I=p}else{C=i;break}while(1){if((F-x+I|0)>=(u|0)){C=G;break a}D=(If(c[b+(H<<2)>>2]|0)|0)<<3;E=H+1|0;if(!((E|0)<15&(D|0)<(x|0))){C=H;break a}F=D;G=H;H=E;I=c[d>>2]|0}}}while(0);J=+h[g>>3];K=+(m|0);L=+xa(+(+(C|0)-J))/K;M=+(c[f+8>>2]|0);N=L*M;L=-0.0-y;O=N<L?L:N;N=J+K*((O>y?y:O)/M);h[g>>3]=N;g=~~+xa(+N);f=(If(c[b+(g<<2)>>2]|0)|0)<<3;P=g;Q=f;R=c[n>>2]|0}else{P=i;Q=k;R=o}b:do{if((R|0)>0&(Q|0)<(r|0)){o=e+88|0;if((Q-r+(c[o>>2]|0)|0)<0){S=Q;T=P}else{U=P;V=Q;break}while(1){k=T+1|0;if((k|0)>14){U=k;V=S;break b}i=(If(c[b+(k<<2)>>2]|0)|0)<<3;if((i-r+(c[o>>2]|0)|0)<0){S=i;T=k}else{U=k;V=i;break}}}else{U=P;V=Q}}while(0);c:do{if((c[s>>2]|0)>0&(V|0)>(q|0)){Q=e+88|0;P=c[Q>>2]|0;T=c[v>>2]|0;if((V-q+P|0)>(T|0)){W=V;X=U;Y=T;Z=P}else{_=U;$=V;aa=29;break}while(1){P=X-1|0;if((P|0)<0){ba=W;da=Y;ea=Z;aa=31;break c}T=(If(c[b+(P<<2)>>2]|0)|0)<<3;S=c[Q>>2]|0;R=c[v>>2]|0;if((T-q+S|0)>(R|0)){W=T;X=P;Y=R;Z=S}else{_=P;$=T;aa=29;break}}}else{_=U;$=V;aa=29}}while(0);do{if((aa|0)==29){if((_|0)<0){ba=$;da=c[v>>2]|0;ea=c[e+88>>2]|0;aa=31;break}V=(r+7-(c[e+88>>2]|0)|0)/8|0;U=(_|0)>14?14:_;c[e+124>>2]=U;Z=b+(U<<2)|0;U=V-(If(c[Z>>2]|0)|0)|0;V=c[Z>>2]|0;if((U|0)>0){Y=U;U=V;while(1){X=Y-1|0;Cf(U,0,8);W=c[Z>>2]|0;if((X|0)>0){Y=X;U=W}else{fa=W;break}}}else{fa=V}ga=(If(fa)|0)<<3}}while(0);do{if((aa|0)==31){fa=(da+q-ea|0)/8|0;c[e+124>>2]=0;b=j;if((If(c[b>>2]|0)|0)<=(fa|0)){ga=ba;break}Bf(c[b>>2]|0,fa<<3);ga=(If(c[b>>2]|0)|0)<<3}}while(0);if((c[n>>2]|0)>0){aa=38}else{if((c[s>>2]|0)>0){aa=38}}do{if((aa|0)==38){s=(q|0)>0;if(s&(ga|0)>(q|0)){n=e+88|0;c[n>>2]=ga-q+(c[n>>2]|0);break}n=(r|0)>0;if(n&(ga|0)<(r|0)){ba=e+88|0;c[ba>>2]=ga-r+(c[ba>>2]|0);break}ba=e+88|0;j=c[ba>>2]|0;if((j|0)>(u|0)){if(!s){c[ba>>2]=u;break}s=j+(ga-q)|0;c[ba>>2]=s;if((s|0)>=(u|0)){break}c[ba>>2]=u;break}else{if(!n){c[ba>>2]=u;break}n=j+(ga-r)|0;c[ba>>2]=n;if((n|0)<=(u|0)){break}c[ba>>2]=u;break}}}while(0);u=c[a>>2]|0;if((u|0)<=0){w=0;return w|0}if((c[l>>2]|0)==0){ha=u}else{ha=ca(c[e+104>>2]|0,u)|0}u=e+84|0;c[u>>2]=ga-ha+(c[u>>2]|0);w=0;return w|0}function We(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;d=c[a+104>>2]|0;a=d+120|0;e=c[a>>2]|0;if((e|0)==0){f=0;return f|0}if((b|0)!=0){g=c[e+104>>2]|0;if((Ue(e)|0)==0){h=7}else{h=c[d+124>>2]|0}d=g+12+(h<<2)|0;c[b>>2]=Jf(c[d>>2]|0)|0;c[b+4>>2]=If(c[d>>2]|0)|0;c[b+8>>2]=0;c[b+12>>2]=c[e+44>>2];d=e+48|0;h=c[d+4>>2]|0;g=b+16|0;c[g>>2]=c[d>>2];c[g+4>>2]=h;h=e+56|0;e=c[h+4>>2]|0;g=b+24|0;c[g>>2]=c[h>>2];c[g+4>>2]=e}c[a>>2]=0;f=1;return f|0}



function Xe(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,i=0,j=0,k=0,l=0.0,m=0,n=0,o=0,p=0,q=0,r=0,s=0.0;b=a+28|0;d=c[b>>2]|0;e=d+3392|0;f=e;if((d|0)==0){g=-131;return g|0}i=(c[d+3456>>2]|0)==0;j=i&1;k=d+3496|0;l=+h[k>>3];do{if(l>-80.0){h[k>>3]=-80.0}else{if(!(l<-200.0)){break}h[k>>3]=-200.0}}while(0);k=d+3512|0;l=+h[k>>3];do{if(l>0.0){h[k>>3]=0.0}else{if(!(l<-99999.0)){break}h[k>>3]=-99999.0}}while(0);k=c[d+3396>>2]|0;if((k|0)==0){g=-131;return g|0}c[e>>2]=1;e=d+3400|0;Ye(d,+h[e>>3],c[k+24>>2]|0,c[k+28>>2]|0);m=(c[d>>2]|0)==(c[d+4>>2]|0);n=k+144|0;if((c[n>>2]|0)>0){o=k+136|0;p=k+140|0;q=k+148|0;r=0;do{Ze(a,~~+h[e>>3],c[o>>2]|0,c[p>>2]|0,c[(c[q>>2]|0)+(r<<2)>>2]|0);r=r+1|0;}while((r|0)<(c[n>>2]|0))}_e(c[b>>2]|0,+h[d+3520>>3],c[k+124>>2]|0,c[k+128>>2]|0);$e(a,f,c[k+132>>2]|0);f=k+92|0;n=k+100|0;r=k+108|0;af(c[b>>2]|0,+h[e>>3],c[f>>2]|0,c[n>>2]|0,c[r>>2]|0,0);af(c[b>>2]|0,+h[e>>3],c[f>>2]|0,c[n>>2]|0,c[r>>2]|0,1);if(!m){n=k+96|0;f=k+104|0;af(c[b>>2]|0,+h[e>>3],c[n>>2]|0,c[f>>2]|0,c[r>>2]|0,2);af(c[b>>2]|0,+h[e>>3],c[n>>2]|0,c[f>>2]|0,c[r>>2]|0,3)}r=d+3528|0;f=k+32|0;n=k+36|0;bf(c[b>>2]|0,+h[r+(j<<5)>>3],0,c[f>>2]|0,c[n>>2]|0,c[k+44>>2]|0);q=k+52|0;bf(c[b>>2]|0,+h[d+3560>>3],1,c[f>>2]|0,c[n>>2]|0,c[q>>2]|0);if(!m){bf(c[b>>2]|0,+h[d+3592>>3],2,c[f>>2]|0,c[n>>2]|0,c[q>>2]|0);bf(c[b>>2]|0,+h[d+3624>>3],3,c[f>>2]|0,c[n>>2]|0,c[k+48>>2]|0)}n=k+80|0;f=k+84|0;cf(c[b>>2]|0,+h[r+(j<<5)+24>>3],0,c[n>>2]|0,c[f>>2]|0);cf(c[b>>2]|0,+h[d+3584>>3],1,c[n>>2]|0,c[f>>2]|0);if(!m){f=k+88|0;cf(c[b>>2]|0,+h[d+3616>>3],2,c[n>>2]|0,c[f>>2]|0);cf(c[b>>2]|0,+h[d+3648>>3],3,c[n>>2]|0,c[f>>2]|0)}f=k+40|0;df(c[b>>2]|0,+h[r+(j<<5)+8>>3],0,c[f>>2]|0);df(c[b>>2]|0,+h[d+3568>>3],1,c[f>>2]|0);if(!m){df(c[b>>2]|0,+h[d+3600>>3],2,c[f>>2]|0);df(c[b>>2]|0,+h[d+3632>>3],3,c[f>>2]|0)}f=k+76|0;n=k+56|0;if(i){s=0.0}else{s=+h[d+3408>>3]}ef(c[b>>2]|0,+h[r+(j<<5)+16>>3],0,c[f>>2]|0,c[k+60>>2]|0,c[n>>2]|0,s);ef(c[b>>2]|0,+h[d+3576>>3],1,c[f>>2]|0,c[k+64>>2]|0,c[n>>2]|0,0.0);if(m){ff(c[b>>2]|0,0);ff(c[b>>2]|0,1)}else{ef(c[b>>2]|0,+h[d+3608>>3],2,c[f>>2]|0,c[k+68>>2]|0,c[n>>2]|0,0.0);ef(c[b>>2]|0,+h[d+3640>>3],3,c[f>>2]|0,c[k+72>>2]|0,c[n>>2]|0,0.0);ff(c[b>>2]|0,0);ff(c[b>>2]|0,1);ff(c[b>>2]|0,2);ff(c[b>>2]|0,3)}gf(a,+h[e>>3],c[k+152>>2]|0);k=d+3428|0;e=c[k>>2]|0;if((e|0)>0){c[a+16>>2]=e}else{c[a+16>>2]=~~+hf(a)}e=d+3424|0;c[a+20>>2]=c[e>>2];b=d+3440|0;c[a+12>>2]=c[b>>2];n=c[k>>2]|0;if((n|0)==0){c[a+24>>2]=0}else{c[a+24>>2]=~~(+(c[d+3444>>2]|0)/+(n|0))}if((c[d+3420>>2]|0)==0){g=0;return g|0}c[d+3360>>2]=c[k>>2];c[d+3364>>2]=c[e>>2];c[d+3368>>2]=c[b>>2];c[d+3372>>2]=c[d+3444>>2];h[d+3376>>3]=+h[d+3448>>3];h[d+3384>>3]=+h[d+3432>>3];g=0;return g|0}function Ye(a,b,d,e){a=a|0;b=+b;d=d|0;e=e|0;var f=0,g=0;f=~~b;g=c[e+(f<<2)>>2]|0;c[a>>2]=c[d+(f<<2)>>2];c[a+4>>2]=g;return}function Ze(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;g=$f(1,1120)|0;h=c[a+28>>2]|0;a=f+(b<<2)|0;b=c[a>>2]|0;kg(g|0,e+(b*1120|0)|0,1120)|0;e=c[g>>2]|0;a:do{if((e|0)>0){f=g+4|0;i=0;j=-1;do{k=c[f+(i<<2)>>2]|0;j=(k|0)>(j|0)?k:j;i=i+1|0;}while((i|0)<(e|0));if((j|0)<0){break}i=g+256|0;f=h+24|0;k=g+192|0;l=g+320|0;m=0;n=-1;while(1){o=i+(m<<2)|0;p=c[o>>2]|0;q=(p|0)>(n|0)?p:n;c[o>>2]=(c[f>>2]|0)+p;p=k+(m<<2)|0;o=c[p>>2]|0;if((1<<o|0)>0){r=0;s=q;t=o;while(1){o=l+(m<<5)+(r<<2)|0;u=c[o>>2]|0;v=(u|0)>(s|0)?u:s;if((u|0)>-1){c[o>>2]=(c[f>>2]|0)+u;w=c[p>>2]|0}else{w=t}u=r+1|0;if((u|0)<(1<<w|0)){r=u;s=v;t=w}else{x=v;break}}}else{x=q}t=m+1|0;if((t|0)>(j|0)){break}else{m=t;n=x}}if((x|0)<0){break}n=h+24|0;m=h+1824|0;j=0;f=b;while(1){l=c[(c[d+(f<<2)>>2]|0)+(j<<2)>>2]|0;k=c[n>>2]|0;c[n>>2]=k+1;c[m+(k<<2)>>2]=l;l=j+1|0;if((l|0)>(x|0)){break a}j=l;f=c[a>>2]|0}}}while(0);a=h+16|0;c[h+800+(c[a>>2]<<2)>>2]=1;c[h+1056+(c[a>>2]<<2)>>2]=g;c[a>>2]=(c[a>>2]|0)+1;return}function _e(a,b,c,d){a=a|0;b=+b;c=c|0;d=d|0;var e=0,f=0.0,i=0,j=0,k=0;e=~~b;f=b- +(e|0);i=d+(e<<3)|0;kg(a+2868|0,c+(~~+h[i>>3]*492|0)|0,492)|0;b=(1.0-f)*+h[i>>3]+f*+h[d+(e+1<<3)>>3];e=~~b;f=b- +(e|0);d=f==0.0&(e|0)>0;b=d?1.0:f;i=(d<<31>>31)+e|0;f=1.0-b;e=i+1|0;d=a+2872|0;j=a+2900|0;k=0;do{g[d+(k<<2)>>2]=f*+g[c+(i*492|0)+4+(k<<2)>>2]+b*+g[c+(e*492|0)+4+(k<<2)>>2];g[j+(k<<2)>>2]=f*+g[c+(i*492|0)+32+(k<<2)>>2]+b*+g[c+(e*492|0)+32+(k<<2)>>2];k=k+1|0;}while((k|0)<4);g[a+2936>>2]=+h[a+3512>>3];return}function $e(a,b,d){a=a|0;b=b|0;d=d|0;var e=0.0,f=0,i=0.0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0.0,u=0.0,v=0.0,w=0.0;e=+h[b+80>>3];f=~~e;i=e- +(f|0);j=c[a+28>>2]|0;if((d|0)==0){k=j;l=j+3240|0;m=j+4|0;n=j+3300|0;o=0;do{c[l+(o<<2)>>2]=c[k>>2];c[n+(o<<2)>>2]=c[m>>2];o=o+1|0;}while((o|0)<15);return}kg(j+3120|0,d+(f*240|0)|0,60)|0;kg(j+3180|0,d+(f*240|0)+60|0,60)|0;if((c[b+28>>2]|0)!=0){e=1.0-i;b=f+1|0;o=j;m=j+3e3|0;n=j+4|0;k=j+3060|0;l=j+2940|0;p=j+3240|0;q=j+3300|0;r=c[a+8>>2]|0;s=0;do{t=e*+g[d+(f*240|0)+120+(s<<2)>>2]+i*+g[d+(b*240|0)+120+(s<<2)>>2];u=+(r|0);v=t*1.0e3/u;c[m+(s<<2)>>2]=~~(v*+(c[o>>2]|0));c[k+(s<<2)>>2]=~~(v*+(c[n>>2]|0));c[l+(s<<2)>>2]=~~t;t=(e*+g[d+(f*240|0)+180+(s<<2)>>2]+i*+g[d+(b*240|0)+180+(s<<2)>>2])*1.0e3/u;c[p+(s<<2)>>2]=~~(t*+(c[o>>2]|0));c[q+(s<<2)>>2]=~~(t*+(c[n>>2]|0));s=s+1|0;}while((s|0)<15);return}e=1.0-i;s=f+1|0;t=e*+g[d+(f*240|0)+148>>2]+i*+g[d+(s*240|0)+148>>2];u=t*1.0e3;n=j;q=j+3e3|0;o=j+4|0;p=j+3060|0;b=~~t;l=j+2940|0;k=c[a+8>>2]|0;a=0;do{w=+(k|0);t=u/w;c[q+(a<<2)>>2]=~~(t*+(c[n>>2]|0));c[p+(a<<2)>>2]=~~(t*+(c[o>>2]|0));c[l+(a<<2)>>2]=b;a=a+1|0;}while((a|0)<15);u=(e*+g[d+(f*240|0)+208>>2]+i*+g[d+(s*240|0)+208>>2])*1.0e3;s=j+3240|0;d=j+3300|0;j=0;do{i=u/w;c[s+(j<<2)>>2]=~~(i*+(c[n>>2]|0));c[d+(j<<2)>>2]=~~(i*+(c[o>>2]|0));j=j+1|0;}while((j|0)<15);return}function af(a,b,d,e,f,g){a=a|0;b=+b;d=d|0;e=e|0;f=f|0;g=g|0;var i=0,j=0,k=0,l=0,m=0;i=a+2852+(g<<2)|0;j=c[i>>2]|0;k=~~b;l=a+28|0;if((c[l>>2]|0)<=(g|0)){c[l>>2]=g+1}if((j|0)==0){l=$f(1,520)|0;c[i>>2]=l;m=l}else{m=j}kg(m|0,197480,520)|0;c[m>>2]=g>>1;if((c[a+3460>>2]|0)==0){return}c[m+500>>2]=1;c[m+504>>2]=c[d+(k<<2)>>2];c[m+508>>2]=c[e+(k<<2)>>2];h[m+512>>3]=+h[f+(k<<3)>>3];return}function bf(a,b,d,e,f,h){a=a|0;b=+b;d=d|0;e=e|0;f=f|0;h=h|0;var i=0,j=0.0,k=0;i=~~b;j=b- +(i|0);k=c[a+2852+(d<<2)>>2]|0;b=1.0-j;d=i+1|0;g[k+12>>2]=b*+(c[e+(i*20|0)>>2]|0)+j*+(c[e+(d*20|0)>>2]|0);g[k+16>>2]=b*+(c[e+(i*20|0)+4>>2]|0)+j*+(c[e+(d*20|0)+4>>2]|0);g[k+20>>2]=b*+(c[e+(i*20|0)+8>>2]|0)+j*+(c[e+(d*20|0)+8>>2]|0);g[k+24>>2]=b*+g[e+(i*20|0)+12>>2]+j*+g[e+(d*20|0)+12>>2];g[k+28>>2]=b*+g[e+(i*20|0)+16>>2]+j*+g[e+(d*20|0)+16>>2];g[k+496>>2]=b*+(c[f+(i<<2)>>2]|0)+j*+(c[f+(d<<2)>>2]|0);f=0;do{g[k+36+(f<<2)>>2]=b*+(c[h+(i*68|0)+(f<<2)>>2]|0)+j*+(c[h+(d*68|0)+(f<<2)>>2]|0);f=f+1|0;}while((f|0)<17);return}function cf(a,b,d,e,f){a=a|0;b=+b;d=d|0;e=e|0;f=f|0;var i=0,j=0.0,k=0;i=~~b;j=b- +(i|0);k=c[a+2852+(d<<2)>>2]|0;b=(1.0-j)*+h[f+(i<<3)>>3]+j*+h[f+(i+1<<3)>>3];i=~~b;j=b- +(i|0);f=j==0.0&(i|0)>0;b=f?1.0:j;d=(f<<31>>31)+i|0;j=1.0-b;i=d+1|0;f=0;do{g[k+336+(f<<2)>>2]=j*+(c[e+(d*160|0)+(f<<2)>>2]|0)+b*+(c[e+(i*160|0)+(f<<2)>>2]|0);f=f+1|0;}while((f|0)<40);return}function df(a,b,d,e){a=a|0;b=+b;d=d|0;e=e|0;var f=0,h=0.0;f=~~b;h=b- +(f|0);g[(c[a+2852+(d<<2)>>2]|0)+32>>2]=(1.0-h)*+(c[e+(f<<2)>>2]|0)+h*+(c[e+(f+1<<2)>>2]|0);return}function ef(a,b,d,e,f,h,i){a=a|0;b=+b;d=d|0;e=e|0;f=f|0;h=h|0;i=+i;var j=0,k=0.0,l=0,m=0,n=0.0;j=~~b;k=b- +(j|0);l=c[a+2852+(d<<2)>>2]|0;b=1.0-k;a=j+1|0;g[l+108>>2]=b*+(c[e+(j<<2)>>2]|0)+k*+(c[e+(a<<2)>>2]|0);c[l+120>>2]=c[h+(d*12|0)>>2];c[l+124>>2]=c[h+(d*12|0)+4>>2];c[l+128>>2]=c[h+(d*12|0)+8>>2];d=0;while(1){h=0;do{g[l+132+(d*68|0)+(h<<2)>>2]=b*+(c[f+(j*204|0)+(d*68|0)+(h<<2)>>2]|0)+k*+(c[f+(a*204|0)+(d*68|0)+(h<<2)>>2]|0);h=h+1|0;}while((h|0)<17);h=d+1|0;if((h|0)<3){d=h}else{m=0;break}}do{k=+g[l+132+(m*68|0)>>2];b=k+6.0;d=0;n=k;while(1){k=n+i;g[l+132+(m*68|0)+(d<<2)>>2]=k<b?b:k;a=d+1|0;if((a|0)>=17){break}d=a;n=+g[l+132+(m*68|0)+(a<<2)>>2]}m=m+1|0;}while((m|0)<3);return}function ff(a,b){a=a|0;b=b|0;var d=0;d=c[a+2852+(b<<2)>>2]|0;g[d+4>>2]=+h[a+3496>>3];g[d+8>>2]=+h[a+3504>>3];return}function gf(a,b,d){a=a|0;b=+b;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;e=c[a+28>>2]|0;f=~~b;g=c[d+(f<<3)>>2]|0;h=c[d+(f<<3)+4>>2]|0;f=(c[e>>2]|0)==(c[e+4>>2]|0)?1:2;d=e+544|0;i=e+32|0;j=e+8|0;k=e+288|0;l=e+12|0;e=0;do{m=d+(e<<2)|0;c[m>>2]=$f(1,3208)|0;n=$f(1,16)|0;c[i+(e<<2)>>2]=n;o=201992+(e<<4)|0;c[n>>2]=c[o>>2];c[n+4>>2]=c[o+4>>2];c[n+8>>2]=c[o+8>>2];c[n+12>>2]=c[o+12>>2];if((e|0)>=(c[j>>2]|0)){c[j>>2]=e+1}c[k+(e<<2)>>2]=0;o=g+(e*3208|0)|0;kg(c[m>>2]|0,o|0,3208)|0;if((e|0)>=(c[l>>2]|0)){c[l>>2]=e+1}m=o|0;if((c[m>>2]|0)>0){o=0;do{n=c[g+(e*3208|0)+1092+(o<<2)>>2]|0;nf(a,n,e,h+(n<<5)|0);o=o+1|0;}while((o|0)<(c[m>>2]|0))}e=e+1|0;}while((e|0)<(f|0));return}function hf(a){a=a|0;var b=0,d=0.0,e=0,f=0.0,g=0,i=0.0;b=c[a+28>>2]|0;d=+h[b+3400>>3];e=~~d;f=d- +(e|0);g=c[(c[b+3396>>2]|0)+4>>2]|0;if((g|0)==0){i=-1.0;return+i}i=+(c[a+4>>2]|0)*((1.0-f)*+h[g+(e<<3)>>3]+f*+h[g+(e+1<<3)>>3]);return+i}function jf(a,b,d,e){a=a|0;b=b|0;d=d|0;e=+e;var f=0,h=0.0,i=0,j=0;f=c[a+28>>2]|0;h=e+1.0e-7;e=h<1.0?h:.9998999834060669;g[f+3416>>2]=e;i=kf(b,d,e,0,f+3400|0)|0;c[f+3396>>2]=i;if((i|0)==0){j=-130;return j|0}lf(a,b,d);c[f+3420>>2]=0;c[f+3464>>2]=1;j=0;return j|0}function kf(a,b,d,e,f){a=a|0;b=b|0;d=+d;e=e|0;f=f|0;var g=0,i=0.0,j=0,k=0,l=0,m=0,n=0,o=0.0,p=0,q=0,r=0,s=0.0;g=(e|0)!=0;if(g){i=d/+(a|0)}else{i=d}e=0;j=56128;a:while(1){k=c[j>>2]|0;l=c[k+12>>2]|0;do{if((l|0)==-1|(l|0)==(a|0)){if((c[k+16>>2]|0)>(b|0)){break}if((c[k+20>>2]|0)<(b|0)){break}m=c[k>>2]|0;n=c[(g?k+4|0:k+8|0)>>2]|0;o=+h[n>>3];if(i<o){break}if(!(i>+h[n+(m<<3)>>3])){break a}}}while(0);k=e+1|0;if(k>>>0<2>>>0){e=k;j=56128+(k<<2)|0}else{p=0;q=19;break}}if((q|0)==19){return p|0}b:do{if((m|0)>0){q=0;d=o;while(1){e=q+1|0;if(!(i<d)){if(i<+h[n+(e<<3)>>3]){r=q;break b}}if((e|0)>=(m|0)){r=e;break b}q=e;d=+h[n+(e<<3)>>3]}}else{r=0}}while(0);if((r|0)==(m|0)){s=+(m|0)+-.001}else{o=+h[n+(r<<3)>>3];s=+(r|0)+(i-o)/(+h[n+(r+1<<3)>>3]-o)}h[f>>3]=s;p=c[j>>2]|0;return p|0}function lf(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0.0,i=0.0,j=0.0,k=0,l=0.0,m=0;e=c[a+28>>2]|0;f=c[e+3396>>2]|0;c[a>>2]=0;c[a+4>>2]=b;c[a+8>>2]=d;c[e+3456>>2]=1;c[e+3460>>2]=1;d=e+3400|0;g=+h[d>>3];a=~~g;i=g- +(a|0);h[e+3472>>3]=g;if((c[e+3488>>2]|0)==0){b=c[f+120>>2]|0;j=1.0-i;k=a+1|0;h[e+3480>>3]=j*+h[b+(a<<3)>>3]+i*+h[b+(k<<3)>>3];l=j;m=k}else{l=1.0-i;m=a+1|0}k=c[f+112>>2]|0;h[e+3496>>3]=l*+(c[k+(a<<2)>>2]|0)+i*+(c[k+(m<<2)>>2]|0);k=c[f+116>>2]|0;h[e+3504>>3]=l*+(c[k+(a<<2)>>2]|0)+i*+(c[k+(m<<2)>>2]|0);h[e+3512>>3]=-6.0;h[e+3520>>3]=g;m=e+3528|0;e=0;i=g;do{h[m+(e<<5)>>3]=i;i=+h[d>>3];h[m+(e<<5)+8>>3]=i;h[m+(e<<5)+16>>3]=i;h[m+(e<<5)+24>>3]=i;e=e+1|0;}while((e|0)<4);return}function mf(a,b,c,d){a=a|0;b=b|0;c=c|0;d=+d;var e=0,f=0;e=jf(a,b,c,d)|0;if((e|0)!=0){qd(a);f=e;return f|0}e=Xe(a)|0;if((e|0)==0){f=0;return f|0}qd(a);f=e;return f|0}function nf(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0.0,A=0.0,B=0.0,C=0.0,D=0.0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;f=c[a+28>>2]|0;g=f;i=Zf(2840)|0;c[f+1568+(b<<2)>>2]=i;kg(i|0,c[e+12>>2]|0,2840)|0;j=f+20|0;if((c[j>>2]|0)<=(b|0)){c[j>>2]=b+1}j=i+8|0;c[j>>2]=c[e+8>>2];k=f+1312+(b<<2)|0;c[k>>2]=c[e>>2];l=f+3420|0;m=i+12|0;n=(c[m>>2]|0)>0;do{if((c[l>>2]|0)==0){if(n){o=c[e+24>>2]|0;p=i+24|0;q=0;do{r=p+(q<<2)|0;if((c[o+(q<<4)>>2]|0)!=0){c[r>>2]=c[r>>2]|1}if((c[o+(q<<4)+4>>2]|0)!=0){c[r>>2]=c[r>>2]|2}if((c[o+(q<<4)+8>>2]|0)!=0){c[r>>2]=c[r>>2]|4}if((c[o+(q<<4)+12>>2]|0)!=0){c[r>>2]=c[r>>2]|8}q=q+1|0;}while((q|0)<(c[m>>2]|0))}q=e+16|0;o=of(g,c[q>>2]|0)|0;c[i+20>>2]=o;p=f+1824|0;c[p+(o<<2)>>2]=c[q>>2];if((c[m>>2]|0)<=0){break}q=e+24|0;o=i+280|0;r=0;s=0;while(1){t=0;u=r;while(1){v=c[(c[q>>2]|0)+(s<<4)+(t<<2)>>2]|0;if((v|0)==0){w=u}else{x=of(g,v)|0;c[o+(u<<2)>>2]=x;c[p+(x<<2)>>2]=c[(c[q>>2]|0)+(s<<4)+(t<<2)>>2];w=u+1|0}x=t+1|0;if((x|0)<4){t=x;u=w}else{break}}u=s+1|0;if((u|0)<(c[m>>2]|0)){r=w;s=u}else{break}}}else{if(n){s=c[e+28>>2]|0;r=i+24|0;q=0;do{p=r+(q<<2)|0;if((c[s+(q<<4)>>2]|0)!=0){c[p>>2]=c[p>>2]|1}if((c[s+(q<<4)+4>>2]|0)!=0){c[p>>2]=c[p>>2]|2}if((c[s+(q<<4)+8>>2]|0)!=0){c[p>>2]=c[p>>2]|4}if((c[s+(q<<4)+12>>2]|0)!=0){c[p>>2]=c[p>>2]|8}q=q+1|0;}while((q|0)<(c[m>>2]|0))}q=e+20|0;s=of(g,c[q>>2]|0)|0;c[i+20>>2]=s;r=f+1824|0;c[r+(s<<2)>>2]=c[q>>2];if((c[m>>2]|0)<=0){break}q=e+28|0;s=i+280|0;p=0;o=0;while(1){u=0;t=p;while(1){x=c[(c[q>>2]|0)+(o<<4)+(u<<2)>>2]|0;if((x|0)==0){y=t}else{v=of(g,x)|0;c[s+(t<<2)>>2]=v;c[r+(v<<2)>>2]=c[(c[q>>2]|0)+(o<<4)+(u<<2)>>2];y=t+1|0}v=u+1|0;if((v|0)<4){u=v;t=y}else{break}}t=o+1|0;if((t|0)<(c[m>>2]|0)){p=y;o=t}else{break}}}}while(0);z=+h[f+3480>>3]*1.0e3;A=+(c[a+8>>2]|0)*.5;y=c[f+(d<<2)>>2]>>1;B=z>A?A:z;z=+(y|0);c[(c[f+1056+(d<<2)>>2]|0)+1116>>2]=~~(B/A*z);d=c[e+4>>2]|0;do{if((d|0)==1){C=+(c[((c[l>>2]|0)==0?f+2968|0:f+2996|0)>>2]|0)*1.0e3;if(!(C>A)){D=C;break}D=A}else if((d|0)==2){D=250.0}else{D=B}}while(0);do{if((c[k>>2]|0)==2){d=c[f+12>>2]|0;if((d|0)>0){l=f+544|0;e=a+4|0;m=0;while(1){g=c[l+(m<<2)>>2]|0;n=c[g>>2]|0;if((n|0)>0){w=g+1092|0;o=g+4|0;g=0;while(1){do{if((c[w+(g<<2)>>2]|0)==(b|0)){p=c[e>>2]|0;if((p|0)>0){E=0;F=0}else{G=0;break}while(1){q=((c[o+(E<<2)>>2]|0)==(g|0))+F|0;r=E+1|0;if((r|0)<(p|0)){E=r;F=q}else{G=q;break}}}else{G=0}}while(0);p=g+1|0;if((p|0)<(n|0)&(G|0)==0){g=p}else{H=G;break}}}else{H=0}g=m+1|0;if((g|0)<(d|0)&(H|0)==0){m=g}else{I=H;break}}}else{I=0}m=c[j>>2]|0;d=ca(~~(+(I|0)*z*(D/A)/+(m|0)+.9),m)|0;e=i+4|0;c[e>>2]=d;l=ca(I,y)|0;if((d|0)<=(l|0)){J=d;K=m;break}d=l-((l|0)%(m|0)|0)|0;c[e>>2]=d;J=d;K=m}else{m=c[j>>2]|0;d=ca(~~(z*(D/A)/+(m|0)+.9),m)|0;e=i+4|0;c[e>>2]=d;if((d|0)<=(y|0)){J=d;K=m;break}d=y-((y|0)%(m|0)|0)|0;c[e>>2]=d;J=d;K=m}}while(0);if((J|0)!=0){return}c[i+4>>2]=K;return}function of(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;d=a+24|0;e=c[d>>2]|0;f=0;while(1){if((f|0)>=(e|0)){break}if((c[a+1824+(f<<2)>>2]|0)==(b|0)){g=f;h=5;break}else{f=f+1|0}}if((h|0)==5){return g|0}c[d>>2]=e+1;g=e;return g|0}function pf(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;if((a|0)==0){d=-1;return d|0}og(a|0,0,360)|0;c[a+4>>2]=16384;c[a+24>>2]=1024;e=Zf(16384)|0;c[a>>2]=e;f=Zf(4096)|0;c[a+16>>2]=f;g=Zf(8192)|0;c[a+20>>2]=g;do{if((e|0)!=0){if((f|0)==0|(g|0)==0){break}c[a+336>>2]=b;d=0;return d|0}}while(0);qf(a)|0;d=-1;return d|0}function qf(a){a=a|0;var b=0;if((a|0)==0){return 0}b=c[a>>2]|0;if((b|0)!=0){_f(b)}b=c[a+16>>2]|0;if((b|0)!=0){_f(b)}b=c[a+20>>2]|0;if((b|0)!=0){_f(b)}og(a|0,0,360)|0;return 0}function rf(a){a=a|0;if((a|0)==0){return-1|0}else{return((c[a>>2]|0)==0)<<31>>31|0}return 0}function sf(b){b=b|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;if((b|0)==0){return}e=b|0;a[(c[e>>2]|0)+22|0]=0;a[(c[e>>2]|0)+23|0]=0;a[(c[e>>2]|0)+24|0]=0;a[(c[e>>2]|0)+25|0]=0;f=c[b+4>>2]|0;if((f|0)>0){g=c[e>>2]|0;h=0;i=0;while(1){j=c[56768+(((d[g+i|0]|0)^h>>>24)<<2)>>2]^h<<8;k=i+1|0;if((k|0)<(f|0)){h=j;i=k}else{l=j;break}}}else{l=0}i=c[b+12>>2]|0;if((i|0)>0){h=c[b+8>>2]|0;b=l;f=0;do{b=c[56768+(((d[h+f|0]|0)^b>>>24)<<2)>>2]^b<<8;f=f+1|0;}while((f|0)<(i|0));m=b>>>24&255;n=b>>>16&255;o=b>>>8&255;p=b&255}else{m=l>>>24&255;n=l>>>16&255;o=l>>>8&255;p=l&255}a[(c[e>>2]|0)+22|0]=p;a[(c[e>>2]|0)+23|0]=o;a[(c[e>>2]|0)+24|0]=n;a[(c[e>>2]|0)+25|0]=m;return}function tf(a,b,d,e,f,g){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;if((rf(a)|0)!=0){h=-1;return h|0}if((b|0)==0){h=0;return h|0}i=(d|0)>0;a:do{if(i){j=0;k=0;while(1){l=c[b+(k<<3)+4>>2]|0;if((l|0)<0|(j|0)>(2147483647-l|0)){h=-1;break}m=l+j|0;l=k+1|0;if((l|0)<(d|0)){j=m;k=l}else{n=m;break a}}return h|0}else{n=0}}while(0);k=(n|0)/255|0;j=k+1|0;m=a+12|0;l=c[m>>2]|0;if((l|0)!=0){o=a+8|0;p=c[o>>2]|0;q=p-l|0;c[o>>2]=q;if((p|0)!=(l|0)){p=c[a>>2]|0;pg(p|0,p+l|0,q|0)|0}c[m>>2]=0}if((uf(a,n)|0)!=0){h=-1;return h|0}if((vf(a,j)|0)!=0){h=-1;return h|0}if(i){i=a|0;m=a+8|0;q=0;l=c[m>>2]|0;do{p=b+(q<<3)+4|0;kg((c[i>>2]|0)+l|0,c[b+(q<<3)>>2]|0,c[p>>2]|0)|0;l=(c[m>>2]|0)+(c[p>>2]|0)|0;c[m>>2]=l;q=q+1|0;}while((q|0)<(d|0))}d=c[a+28>>2]|0;q=c[a+16>>2]|0;if((n|0)>254){l=a+352|0;m=c[a+20>>2]|0;b=(k|0)>1;i=0;do{p=d+i|0;c[q+(p<<2)>>2]=255;o=c[l+4>>2]|0;r=m+(p<<3)|0;c[r>>2]=c[l>>2];c[r+4>>2]=o;i=i+1|0;}while((i|0)<(k|0));s=b?k:1;t=m;u=l}else{s=0;t=c[a+20>>2]|0;u=a+352|0}l=d+s|0;c[q+(l<<2)>>2]=(n|0)%255|0;n=t+(l<<3)|0;c[n>>2]=f;c[n+4>>2]=g;c[u>>2]=f;c[u+4>>2]=g;g=q+(d<<2)|0;c[g>>2]=c[g>>2]|256;c[a+28>>2]=d+j;j=a+344|0;d=sg(c[j>>2]|0,c[j+4>>2]|0,1,0)|0;c[j>>2]=d;c[j+4>>2]=G;if((e|0)==0){h=0;return h|0}c[a+328>>2]=1;h=0;return h|0}function uf(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=a+4|0;e=c[d>>2]|0;if((e-b|0)>(c[a+8>>2]|0)){f=0;return f|0}if((e|0)>(2147483647-b|0)){qf(a)|0;f=-1;return f|0}g=e+b|0;b=(g|0)<2147482623?g+1024|0:g;g=a|0;e=ag(c[g>>2]|0,b)|0;if((e|0)==0){qf(a)|0;f=-1;return f|0}else{c[d>>2]=b;c[g>>2]=e;f=0;return f|0}return 0}function vf(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=a+24|0;e=c[d>>2]|0;if((e-b|0)>(c[a+28>>2]|0)){f=0;return f|0}if((e|0)>(2147483647-b|0)){qf(a)|0;f=-1;return f|0}g=e+b|0;b=(g|0)<2147483615?g+32|0:g;g=a+16|0;e=ag(c[g>>2]|0,b<<2)|0;if((e|0)==0){qf(a)|0;f=-1;return f|0}c[g>>2]=e;e=a+20|0;g=ag(c[e>>2]|0,b<<3)|0;if((g|0)==0){qf(a)|0;f=-1;return f|0}else{c[e>>2]=g;c[d>>2]=b;f=0;return f|0}return 0}function wf(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=i;i=i+8|0;e=d|0;c[e>>2]=c[b>>2];c[e+4>>2]=c[b+4>>2];f=b+16|0;g=tf(a,e,1,c[b+12>>2]|0,c[f>>2]|0,c[f+4>>2]|0)|0;i=d;return g|0}function xf(a,b){a=a|0;b=b|0;return yf(a,b,1,4096)|0}function yf(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0;g=b+28|0;h=c[g>>2]|0;i=(h|0)>255?255:h;if((rf(b)|0)!=0|(i|0)==0){j=0;return j|0}k=b+332|0;l=(c[k>>2]|0)==0;a:do{if(l){m=b+16|0;n=0;while(1){if((n|0)>=(i|0)){o=0;p=0;q=n;r=e;break a}s=n+1|0;if((c[(c[m>>2]|0)+(n<<2)>>2]&255|0)==255){n=s}else{o=0;p=0;q=s;r=e;break}}}else{b:do{if((i|0)>0){n=b+16|0;m=b+20|0;s=0;t=0;u=-1;v=-1;w=0;x=0;while(1){if((t|0)>(f|0)&(x|0)>3){z=1;A=s;B=u;C=v;break b}D=c[(c[n>>2]|0)+(s<<2)>>2]&255;if((D|0)==255){E=0;F=w;G=u;H=v}else{I=(c[m>>2]|0)+(s<<3)|0;J=w+1|0;E=J;F=J;G=c[I+4>>2]|0;H=c[I>>2]|0}I=s+1|0;if((I|0)<(i|0)){s=I;t=D+t|0;u=G;v=H;w=F;x=E}else{z=e;A=I;B=G;C=H;break}}}else{z=e;A=0;B=-1;C=-1}}while(0);o=B;p=C;q=A;r=(A|0)==255?1:z}}while(0);if((r|0)==0){j=0;return j|0}r=b+40|0;z=r;y=1399285583;a[z]=y;y=y>>8;a[z+1|0]=y;y=y>>8;a[z+2|0]=y;y=y>>8;a[z+3|0]=y;a[b+44|0]=0;z=b+45|0;a[z]=0;A=b+16|0;if((c[c[A>>2]>>2]&256|0)==0){a[z]=1;K=1}else{K=0}if(l){l=K|2;a[z]=l;L=l}else{L=K}if((c[b+328>>2]|0)!=0&(h|0)==(q|0)){a[z]=L|4}c[k>>2]=1;k=6;L=o;o=p;while(1){a[b+40+k|0]=o;p=o>>>8|L<<24;z=k+1|0;if((z|0)<14){k=z;L=L>>8|((L|0)<0|0?-1:0)<<24;o=p}else{break}}o=c[b+336>>2]|0;a[b+54|0]=o;a[b+55|0]=o>>>8;a[b+56|0]=o>>>16;a[b+57|0]=o>>>24;o=b+340|0;L=c[o>>2]|0;if((L|0)==-1){c[o>>2]=0;M=0}else{M=L}c[o>>2]=M+1;a[b+58|0]=M;a[b+59|0]=M>>>8;a[b+60|0]=M>>>16;a[b+61|0]=M>>>24;M=b+62|0;y=0;a[M]=y;y=y>>8;a[M+1|0]=y;y=y>>8;a[M+2|0]=y;y=y>>8;a[M+3|0]=y;a[b+66|0]=q;if((q|0)>0){M=0;o=0;while(1){L=c[(c[A>>2]|0)+(M<<2)>>2]|0;a[M+27+(b+40)|0]=L;k=(L&255)+o|0;L=M+1|0;if((L|0)<(q|0)){M=L;o=k}else{N=k;break}}}else{N=0}c[d>>2]=r;r=q+27|0;c[b+324>>2]=r;c[d+4>>2]=r;r=b+12|0;c[d+8>>2]=(c[b>>2]|0)+(c[r>>2]|0);c[d+12>>2]=N;o=(c[g>>2]|0)-q|0;c[g>>2]=o;M=c[A>>2]|0;pg(M|0,M+(q<<2)|0,o<<2|0)|0;o=c[b+20>>2]|0;pg(o|0,o+(q<<3)|0,c[g>>2]<<3|0)|0;c[r>>2]=(c[r>>2]|0)+N;sf(d);j=1;return j|0}function zf(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;if((rf(a)|0)!=0){d=0;return d|0}e=(c[a+28>>2]|0)==0;do{if((c[a+328>>2]|0)==0){if(e){f=0;break}if((c[a+332>>2]|0)==0){g=6}else{f=0}}else{if(e){f=0}else{g=6}}}while(0);if((g|0)==6){f=1}d=yf(a,b,f,4096)|0;return d|0}function Af(b){b=b|0;var d=0;og(b|0,0,16)|0;d=Zf(256)|0;c[b+8>>2]=d;c[b+12>>2]=d;a[d]=0;c[b+16>>2]=256;return}function Bf(b,e){b=b|0;e=e|0;var f=0,g=0,h=0;f=e>>3;g=b+12|0;if((c[g>>2]|0)==0){return}h=e-(f<<3)|0;e=(c[b+8>>2]|0)+f|0;c[g>>2]=e;c[b+4>>2]=h;c[b>>2]=f;a[e]=(d[e]|0)&c[56528+(h<<2)>>2];return}function Cf(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0;do{if(!(f>>>0>32>>>0)){g=b|0;h=b+16|0;i=c[h>>2]|0;j=b+12|0;k=c[j>>2]|0;if((c[g>>2]|0)<(i-4|0)){l=k}else{if((k|0)==0){return}if((i|0)>2147483391){break}k=b+8|0;m=ag(c[k>>2]|0,i+256|0)|0;if((m|0)==0){break}c[k>>2]=m;c[h>>2]=(c[h>>2]|0)+256;h=m+(c[g>>2]|0)|0;c[j>>2]=h;l=h}h=c[56528+(f<<2)>>2]&e;j=b+4|0;m=c[j>>2]|0;k=m+f|0;i=b+12|0;a[l]=d[l]|0|h<<m;do{if((k|0)>7){a[(c[i>>2]|0)+1|0]=h>>>((8-(c[j>>2]|0)|0)>>>0);if((k|0)<=15){break}a[(c[i>>2]|0)+2|0]=h>>>((16-(c[j>>2]|0)|0)>>>0);if((k|0)<=23){break}a[(c[i>>2]|0)+3|0]=h>>>((24-(c[j>>2]|0)|0)>>>0);if((k|0)<=31){break}m=c[j>>2]|0;if((m|0)==0){a[(c[i>>2]|0)+4|0]=0;break}else{a[(c[i>>2]|0)+4|0]=h>>>((32-m|0)>>>0);break}}}while(0);h=(k|0)/8|0;c[g>>2]=(c[g>>2]|0)+h;c[i>>2]=(c[i>>2]|0)+h;c[j>>2]=k&7;return}}while(0);Df(b);return}function Df(a){a=a|0;var b=0;b=c[a+8>>2]|0;if((b|0)!=0){_f(b)}og(a|0,0,20)|0;return}function Ef(b){b=b|0;var d=0,e=0;d=b+12|0;if((c[d>>2]|0)==0){return}e=c[b+8>>2]|0;c[d>>2]=e;a[e]=0;c[b>>2]=0;c[b+4>>2]=0;return}function Ff(a,b){a=a|0;b=b|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0;if(b>>>0>32>>>0){e=-1;return e|0}f=c[56528+(b<<2)>>2]|0;g=c[a+4>>2]|0;h=g+b|0;b=c[a>>2]|0;i=c[a+16>>2]|0;do{if((b|0)>=(i-4|0)){if((b|0)>(i-(h+7>>3)|0)){e=-1;return e|0}if((h|0)==0){e=0}else{break}return e|0}}while(0);i=c[a+12>>2]|0;a=(d[i]|0)>>>(g>>>0);do{if((h|0)>8){b=(d[i+1|0]|0)<<8-g|a;if((h|0)<=16){j=b;break}k=(d[i+2|0]|0)<<16-g|b;if((h|0)<=24){j=k;break}b=(d[i+3|0]|0)<<24-g|k;if((h|0)<33|(g|0)==0){j=b;break}j=(d[i+4|0]|0)<<32-g|b}else{j=a}}while(0);e=j&f;return e|0}function Gf(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0;d=a+4|0;e=(c[d>>2]|0)+b|0;b=a|0;f=c[b>>2]|0;g=c[a+16>>2]|0;if((f|0)>(g-(e+7>>3)|0)){c[a+12>>2]=0;c[b>>2]=g;h=1;c[d>>2]=h;return}else{g=(e|0)/8|0;i=a+12|0;c[i>>2]=(c[i>>2]|0)+g;c[b>>2]=f+g;h=e&7;c[d>>2]=h;return}}function Hf(a,b){a=a|0;b=b|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;a:do{if(b>>>0>32>>>0){e=c[a+16>>2]|0;f=a|0;g=a+4|0}else{h=c[56528+(b<<2)>>2]|0;i=a+4|0;j=c[i>>2]|0;k=j+b|0;l=a|0;m=c[l>>2]|0;n=c[a+16>>2]|0;do{if((m|0)>=(n-4|0)){if((m|0)>(n-(k+7>>3)|0)){e=n;f=l;g=i;break a}if((k|0)==0){o=0}else{break}return o|0}}while(0);n=a+12|0;p=c[n>>2]|0;q=(d[p]|0)>>>(j>>>0);do{if((k|0)>8){r=(d[p+1|0]|0)<<8-j|q;if((k|0)<=16){s=r;break}t=(d[p+2|0]|0)<<16-j|r;if((k|0)<=24){s=t;break}r=(d[p+3|0]|0)<<24-j|t;if((k|0)<33|(j|0)==0){s=r;break}s=(d[p+4|0]|0)<<32-j|r}else{s=q}}while(0);q=(k|0)/8|0;c[n>>2]=p+q;c[l>>2]=m+q;c[i>>2]=k&7;o=s&h;return o|0}}while(0);c[a+12>>2]=0;c[f>>2]=e;c[g>>2]=1;o=-1;return o|0}function If(a){a=a|0;return(((c[a+4>>2]|0)+7|0)/8|0)+(c[a>>2]|0)|0}function Jf(a){a=a|0;return c[a+8>>2]|0}function Kf(a,b){a=+a;b=b|0;return+(+jg(a,b))}function Lf(a){a=a|0;return}function Mf(a){a=a|0;Lf(a|0);return}function Nf(a){a=a|0;return}function Of(a){a=a|0;return}function Pf(a){a=a|0;Lf(a|0);fg(a);return}function Qf(a){a=a|0;Lf(a|0);fg(a);return}function Rf(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;i=i+56|0;f=e|0;if((a|0)==(b|0)){g=1;i=e;return g|0}if((b|0)==0){g=0;i=e;return g|0}h=Uf(b,236712,236696,-1)|0;b=h;if((h|0)==0){g=0;i=e;return g|0}og(f|0,0,56)|0;c[f>>2]=b;c[f+8>>2]=a;c[f+12>>2]=-1;c[f+48>>2]=1;Bb[c[(c[h>>2]|0)+28>>2]&7](b,f,c[d>>2]|0,1);if((c[f+24>>2]|0)!=1){g=0;i=e;return g|0}c[d>>2]=c[f+16>>2];g=1;i=e;return g|0}function Sf(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0;if((c[d+8>>2]|0)!=(b|0)){return}b=d+16|0;g=c[b>>2]|0;if((g|0)==0){c[b>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;return}if((g|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;return}e=d+24|0;if((c[e>>2]|0)!=2){return}c[e>>2]=f;return}function Tf(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0;if((b|0)!=(c[d+8>>2]|0)){g=c[b+8>>2]|0;Bb[c[(c[g>>2]|0)+28>>2]&7](g,d,e,f);return}g=d+16|0;b=c[g>>2]|0;if((b|0)==0){c[g>>2]=e;c[d+24>>2]=f;c[d+36>>2]=1;return}if((b|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;c[d+24>>2]=2;a[d+54|0]=1;return}e=d+24|0;if((c[e>>2]|0)!=2){return}c[e>>2]=f;return}function Uf(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0;f=i;i=i+56|0;g=f|0;h=c[a>>2]|0;j=a+(c[h-8>>2]|0)|0;k=c[h-4>>2]|0;h=k;c[g>>2]=d;c[g+4>>2]=a;c[g+8>>2]=b;c[g+12>>2]=e;e=g+16|0;b=g+20|0;a=g+24|0;l=g+28|0;m=g+32|0;n=g+40|0;og(e|0,0,39)|0;if((k|0)==(d|0)){c[g+48>>2]=1;yb[c[(c[k>>2]|0)+20>>2]&7](h,g,j,j,1,0);i=f;return((c[a>>2]|0)==1?j:0)|0}pb[c[(c[k>>2]|0)+24>>2]&7](h,g,j,1,0);j=c[g+36>>2]|0;if((j|0)==1){do{if((c[a>>2]|0)!=1){if((c[n>>2]|0)!=0){o=0;i=f;return o|0}if((c[l>>2]|0)!=1){o=0;i=f;return o|0}if((c[m>>2]|0)==1){break}else{o=0}i=f;return o|0}}while(0);o=c[e>>2]|0;i=f;return o|0}else if((j|0)==0){if((c[n>>2]|0)!=1){o=0;i=f;return o|0}if((c[l>>2]|0)!=1){o=0;i=f;return o|0}o=(c[m>>2]|0)==1?c[b>>2]|0:0;i=f;return o|0}else{o=0;i=f;return o|0}return 0}function Vf(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0;h=b|0;if((h|0)==(c[d+8>>2]|0)){if((c[d+4>>2]|0)!=(e|0)){return}i=d+28|0;if((c[i>>2]|0)==1){return}c[i>>2]=f;return}if((h|0)!=(c[d>>2]|0)){h=c[b+8>>2]|0;pb[c[(c[h>>2]|0)+24>>2]&7](h,d,e,f,g);return}do{if((c[d+16>>2]|0)!=(e|0)){h=d+20|0;if((c[h>>2]|0)==(e|0)){break}c[d+32>>2]=f;i=d+44|0;if((c[i>>2]|0)==4){return}j=d+52|0;a[j]=0;k=d+53|0;a[k]=0;l=c[b+8>>2]|0;yb[c[(c[l>>2]|0)+20>>2]&7](l,d,e,e,1,g);if((a[k]|0)==0){m=0;n=13}else{if((a[j]|0)==0){m=1;n=13}}a:do{if((n|0)==13){c[h>>2]=e;j=d+40|0;c[j>>2]=(c[j>>2]|0)+1;do{if((c[d+36>>2]|0)==1){if((c[d+24>>2]|0)!=2){n=16;break}a[d+54|0]=1;if(m){break a}}else{n=16}}while(0);if((n|0)==16){if(m){break}}c[i>>2]=4;return}}while(0);c[i>>2]=3;return}}while(0);if((f|0)!=1){return}c[d+32>>2]=1;return}function Wf(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;if((c[d+8>>2]|0)==(b|0)){if((c[d+4>>2]|0)!=(e|0)){return}g=d+28|0;if((c[g>>2]|0)==1){return}c[g>>2]=f;return}if((c[d>>2]|0)!=(b|0)){return}do{if((c[d+16>>2]|0)!=(e|0)){b=d+20|0;if((c[b>>2]|0)==(e|0)){break}c[d+32>>2]=f;c[b>>2]=e;b=d+40|0;c[b>>2]=(c[b>>2]|0)+1;do{if((c[d+36>>2]|0)==1){if((c[d+24>>2]|0)!=2){break}a[d+54|0]=1}}while(0);c[d+44>>2]=4;return}}while(0);if((f|0)!=1){return}c[d+32>>2]=1;return}function Xf(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0;if((b|0)!=(c[d+8>>2]|0)){i=c[b+8>>2]|0;yb[c[(c[i>>2]|0)+20>>2]&7](i,d,e,f,g,h);return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){return}a[d+52|0]=1;f=d+16|0;h=c[f>>2]|0;if((h|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){return}a[d+54|0]=1;return}if((h|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;a[d+54|0]=1;return}e=d+24|0;h=c[e>>2]|0;if((h|0)==2){c[e>>2]=g;j=g}else{j=h}if(!((c[d+48>>2]|0)==1&(j|0)==1)){return}a[d+54|0]=1;return}function Yf(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0;if((c[d+8>>2]|0)!=(b|0)){return}a[d+53|0]=1;if((c[d+4>>2]|0)!=(f|0)){return}a[d+52|0]=1;f=d+16|0;b=c[f>>2]|0;if((b|0)==0){c[f>>2]=e;c[d+24>>2]=g;c[d+36>>2]=1;if(!((c[d+48>>2]|0)==1&(g|0)==1)){return}a[d+54|0]=1;return}if((b|0)!=(e|0)){e=d+36|0;c[e>>2]=(c[e>>2]|0)+1;a[d+54|0]=1;return}e=d+24|0;b=c[e>>2]|0;if((b|0)==2){c[e>>2]=g;i=g}else{i=b}if(!((c[d+48>>2]|0)==1&(i|0)==1)){return}a[d+54|0]=1;return}function Zf(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,xa=0,ya=0,za=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0;do{if(a>>>0<245>>>0){if(a>>>0<11>>>0){b=16}else{b=a+11&-8}d=b>>>3;e=c[61628]|0;f=e>>>(d>>>0);if((f&3|0)!=0){g=(f&1^1)+d|0;h=g<<1;i=246552+(h<<2)|0;j=246552+(h+2<<2)|0;h=c[j>>2]|0;k=h+8|0;l=c[k>>2]|0;do{if((i|0)==(l|0)){c[61628]=e&~(1<<g)}else{if(l>>>0<(c[61632]|0)>>>0){Aa();return 0}m=l+12|0;if((c[m>>2]|0)==(h|0)){c[m>>2]=i;c[j>>2]=l;break}else{Aa();return 0}}}while(0);l=g<<3;c[h+4>>2]=l|3;j=h+(l|4)|0;c[j>>2]=c[j>>2]|1;n=k;return n|0}if(!(b>>>0>(c[61630]|0)>>>0)){o=b;break}if((f|0)!=0){j=2<<d;l=f<<d&(j|-j);j=(l&-l)-1|0;l=j>>>12&16;i=j>>>(l>>>0);j=i>>>5&8;m=i>>>(j>>>0);i=m>>>2&4;p=m>>>(i>>>0);m=p>>>1&2;q=p>>>(m>>>0);p=q>>>1&1;r=(j|l|i|m|p)+(q>>>(p>>>0))|0;p=r<<1;q=246552+(p<<2)|0;m=246552+(p+2<<2)|0;p=c[m>>2]|0;i=p+8|0;l=c[i>>2]|0;do{if((q|0)==(l|0)){c[61628]=e&~(1<<r)}else{if(l>>>0<(c[61632]|0)>>>0){Aa();return 0}j=l+12|0;if((c[j>>2]|0)==(p|0)){c[j>>2]=q;c[m>>2]=l;break}else{Aa();return 0}}}while(0);l=r<<3;m=l-b|0;c[p+4>>2]=b|3;q=p;e=q+b|0;c[q+(b|4)>>2]=m|1;c[q+l>>2]=m;l=c[61630]|0;if((l|0)!=0){q=c[61633]|0;d=l>>>3;l=d<<1;f=246552+(l<<2)|0;k=c[61628]|0;h=1<<d;do{if((k&h|0)==0){c[61628]=k|h;s=f;t=246552+(l+2<<2)|0}else{d=246552+(l+2<<2)|0;g=c[d>>2]|0;if(!(g>>>0<(c[61632]|0)>>>0)){s=g;t=d;break}Aa();return 0}}while(0);c[t>>2]=q;c[s+12>>2]=q;c[q+8>>2]=s;c[q+12>>2]=f}c[61630]=m;c[61633]=e;n=i;return n|0}l=c[61629]|0;if((l|0)==0){o=b;break}h=(l&-l)-1|0;l=h>>>12&16;k=h>>>(l>>>0);h=k>>>5&8;p=k>>>(h>>>0);k=p>>>2&4;r=p>>>(k>>>0);p=r>>>1&2;d=r>>>(p>>>0);r=d>>>1&1;g=c[246816+((h|l|k|p|r)+(d>>>(r>>>0))<<2)>>2]|0;r=g;d=g;p=(c[g+4>>2]&-8)-b|0;while(1){g=c[r+16>>2]|0;if((g|0)==0){k=c[r+20>>2]|0;if((k|0)==0){break}else{u=k}}else{u=g}g=(c[u+4>>2]&-8)-b|0;k=g>>>0<p>>>0;r=u;d=k?u:d;p=k?g:p}r=d;i=c[61632]|0;if(r>>>0<i>>>0){Aa();return 0}e=r+b|0;m=e;if(!(r>>>0<e>>>0)){Aa();return 0}e=c[d+24>>2]|0;f=c[d+12>>2]|0;do{if((f|0)==(d|0)){q=d+20|0;g=c[q>>2]|0;if((g|0)==0){k=d+16|0;l=c[k>>2]|0;if((l|0)==0){v=0;break}else{w=l;x=k}}else{w=g;x=q}while(1){q=w+20|0;g=c[q>>2]|0;if((g|0)!=0){w=g;x=q;continue}q=w+16|0;g=c[q>>2]|0;if((g|0)==0){break}else{w=g;x=q}}if(x>>>0<i>>>0){Aa();return 0}else{c[x>>2]=0;v=w;break}}else{q=c[d+8>>2]|0;if(q>>>0<i>>>0){Aa();return 0}g=q+12|0;if((c[g>>2]|0)!=(d|0)){Aa();return 0}k=f+8|0;if((c[k>>2]|0)==(d|0)){c[g>>2]=f;c[k>>2]=q;v=f;break}else{Aa();return 0}}}while(0);a:do{if((e|0)!=0){f=c[d+28>>2]|0;i=246816+(f<<2)|0;do{if((d|0)==(c[i>>2]|0)){c[i>>2]=v;if((v|0)!=0){break}c[61629]=c[61629]&~(1<<f);break a}else{if(e>>>0<(c[61632]|0)>>>0){Aa();return 0}q=e+16|0;if((c[q>>2]|0)==(d|0)){c[q>>2]=v}else{c[e+20>>2]=v}if((v|0)==0){break a}}}while(0);if(v>>>0<(c[61632]|0)>>>0){Aa();return 0}c[v+24>>2]=e;f=c[d+16>>2]|0;do{if((f|0)!=0){if(f>>>0<(c[61632]|0)>>>0){Aa();return 0}else{c[v+16>>2]=f;c[f+24>>2]=v;break}}}while(0);f=c[d+20>>2]|0;if((f|0)==0){break}if(f>>>0<(c[61632]|0)>>>0){Aa();return 0}else{c[v+20>>2]=f;c[f+24>>2]=v;break}}}while(0);if(p>>>0<16>>>0){e=p+b|0;c[d+4>>2]=e|3;f=r+(e+4)|0;c[f>>2]=c[f>>2]|1}else{c[d+4>>2]=b|3;c[r+(b|4)>>2]=p|1;c[r+(p+b)>>2]=p;f=c[61630]|0;if((f|0)!=0){e=c[61633]|0;i=f>>>3;f=i<<1;q=246552+(f<<2)|0;k=c[61628]|0;g=1<<i;do{if((k&g|0)==0){c[61628]=k|g;y=q;z=246552+(f+2<<2)|0}else{i=246552+(f+2<<2)|0;l=c[i>>2]|0;if(!(l>>>0<(c[61632]|0)>>>0)){y=l;z=i;break}Aa();return 0}}while(0);c[z>>2]=e;c[y+12>>2]=e;c[e+8>>2]=y;c[e+12>>2]=q}c[61630]=p;c[61633]=m}f=d+8|0;if((f|0)==0){o=b;break}else{n=f}return n|0}else{if(a>>>0>4294967231>>>0){o=-1;break}f=a+11|0;g=f&-8;k=c[61629]|0;if((k|0)==0){o=g;break}r=-g|0;i=f>>>8;do{if((i|0)==0){A=0}else{if(g>>>0>16777215>>>0){A=31;break}f=(i+1048320|0)>>>16&8;l=i<<f;h=(l+520192|0)>>>16&4;j=l<<h;l=(j+245760|0)>>>16&2;B=14-(h|f|l)+(j<<l>>>15)|0;A=g>>>((B+7|0)>>>0)&1|B<<1}}while(0);i=c[246816+(A<<2)>>2]|0;b:do{if((i|0)==0){C=0;D=r;E=0}else{if((A|0)==31){F=0}else{F=25-(A>>>1)|0}d=0;m=r;p=i;q=g<<F;e=0;while(1){B=c[p+4>>2]&-8;l=B-g|0;if(l>>>0<m>>>0){if((B|0)==(g|0)){C=p;D=l;E=p;break b}else{G=p;H=l}}else{G=d;H=m}l=c[p+20>>2]|0;B=c[p+16+(q>>>31<<2)>>2]|0;j=(l|0)==0|(l|0)==(B|0)?e:l;if((B|0)==0){C=G;D=H;E=j;break}else{d=G;m=H;p=B;q=q<<1;e=j}}}}while(0);if((E|0)==0&(C|0)==0){i=2<<A;r=k&(i|-i);if((r|0)==0){o=g;break}i=(r&-r)-1|0;r=i>>>12&16;e=i>>>(r>>>0);i=e>>>5&8;q=e>>>(i>>>0);e=q>>>2&4;p=q>>>(e>>>0);q=p>>>1&2;m=p>>>(q>>>0);p=m>>>1&1;I=c[246816+((i|r|e|q|p)+(m>>>(p>>>0))<<2)>>2]|0}else{I=E}if((I|0)==0){J=D;K=C}else{p=I;m=D;q=C;while(1){e=(c[p+4>>2]&-8)-g|0;r=e>>>0<m>>>0;i=r?e:m;e=r?p:q;r=c[p+16>>2]|0;if((r|0)!=0){p=r;m=i;q=e;continue}r=c[p+20>>2]|0;if((r|0)==0){J=i;K=e;break}else{p=r;m=i;q=e}}}if((K|0)==0){o=g;break}if(!(J>>>0<((c[61630]|0)-g|0)>>>0)){o=g;break}q=K;m=c[61632]|0;if(q>>>0<m>>>0){Aa();return 0}p=q+g|0;k=p;if(!(q>>>0<p>>>0)){Aa();return 0}e=c[K+24>>2]|0;i=c[K+12>>2]|0;do{if((i|0)==(K|0)){r=K+20|0;d=c[r>>2]|0;if((d|0)==0){j=K+16|0;B=c[j>>2]|0;if((B|0)==0){L=0;break}else{M=B;N=j}}else{M=d;N=r}while(1){r=M+20|0;d=c[r>>2]|0;if((d|0)!=0){M=d;N=r;continue}r=M+16|0;d=c[r>>2]|0;if((d|0)==0){break}else{M=d;N=r}}if(N>>>0<m>>>0){Aa();return 0}else{c[N>>2]=0;L=M;break}}else{r=c[K+8>>2]|0;if(r>>>0<m>>>0){Aa();return 0}d=r+12|0;if((c[d>>2]|0)!=(K|0)){Aa();return 0}j=i+8|0;if((c[j>>2]|0)==(K|0)){c[d>>2]=i;c[j>>2]=r;L=i;break}else{Aa();return 0}}}while(0);c:do{if((e|0)!=0){i=c[K+28>>2]|0;m=246816+(i<<2)|0;do{if((K|0)==(c[m>>2]|0)){c[m>>2]=L;if((L|0)!=0){break}c[61629]=c[61629]&~(1<<i);break c}else{if(e>>>0<(c[61632]|0)>>>0){Aa();return 0}r=e+16|0;if((c[r>>2]|0)==(K|0)){c[r>>2]=L}else{c[e+20>>2]=L}if((L|0)==0){break c}}}while(0);if(L>>>0<(c[61632]|0)>>>0){Aa();return 0}c[L+24>>2]=e;i=c[K+16>>2]|0;do{if((i|0)!=0){if(i>>>0<(c[61632]|0)>>>0){Aa();return 0}else{c[L+16>>2]=i;c[i+24>>2]=L;break}}}while(0);i=c[K+20>>2]|0;if((i|0)==0){break}if(i>>>0<(c[61632]|0)>>>0){Aa();return 0}else{c[L+20>>2]=i;c[i+24>>2]=L;break}}}while(0);do{if(J>>>0<16>>>0){e=J+g|0;c[K+4>>2]=e|3;i=q+(e+4)|0;c[i>>2]=c[i>>2]|1}else{c[K+4>>2]=g|3;c[q+(g|4)>>2]=J|1;c[q+(J+g)>>2]=J;i=J>>>3;if(J>>>0<256>>>0){e=i<<1;m=246552+(e<<2)|0;r=c[61628]|0;j=1<<i;do{if((r&j|0)==0){c[61628]=r|j;O=m;P=246552+(e+2<<2)|0}else{i=246552+(e+2<<2)|0;d=c[i>>2]|0;if(!(d>>>0<(c[61632]|0)>>>0)){O=d;P=i;break}Aa();return 0}}while(0);c[P>>2]=k;c[O+12>>2]=k;c[q+(g+8)>>2]=O;c[q+(g+12)>>2]=m;break}e=p;j=J>>>8;do{if((j|0)==0){Q=0}else{if(J>>>0>16777215>>>0){Q=31;break}r=(j+1048320|0)>>>16&8;i=j<<r;d=(i+520192|0)>>>16&4;B=i<<d;i=(B+245760|0)>>>16&2;l=14-(d|r|i)+(B<<i>>>15)|0;Q=J>>>((l+7|0)>>>0)&1|l<<1}}while(0);j=246816+(Q<<2)|0;c[q+(g+28)>>2]=Q;c[q+(g+20)>>2]=0;c[q+(g+16)>>2]=0;m=c[61629]|0;l=1<<Q;if((m&l|0)==0){c[61629]=m|l;c[j>>2]=e;c[q+(g+24)>>2]=j;c[q+(g+12)>>2]=e;c[q+(g+8)>>2]=e;break}if((Q|0)==31){R=0}else{R=25-(Q>>>1)|0}l=J<<R;m=c[j>>2]|0;while(1){if((c[m+4>>2]&-8|0)==(J|0)){break}S=m+16+(l>>>31<<2)|0;j=c[S>>2]|0;if((j|0)==0){T=151;break}else{l=l<<1;m=j}}if((T|0)==151){if(S>>>0<(c[61632]|0)>>>0){Aa();return 0}else{c[S>>2]=e;c[q+(g+24)>>2]=m;c[q+(g+12)>>2]=e;c[q+(g+8)>>2]=e;break}}l=m+8|0;j=c[l>>2]|0;i=c[61632]|0;if(m>>>0<i>>>0){Aa();return 0}if(j>>>0<i>>>0){Aa();return 0}else{c[j+12>>2]=e;c[l>>2]=e;c[q+(g+8)>>2]=j;c[q+(g+12)>>2]=m;c[q+(g+24)>>2]=0;break}}}while(0);q=K+8|0;if((q|0)==0){o=g;break}else{n=q}return n|0}}while(0);K=c[61630]|0;if(!(o>>>0>K>>>0)){S=K-o|0;J=c[61633]|0;if(S>>>0>15>>>0){R=J;c[61633]=R+o;c[61630]=S;c[R+(o+4)>>2]=S|1;c[R+K>>2]=S;c[J+4>>2]=o|3}else{c[61630]=0;c[61633]=0;c[J+4>>2]=K|3;S=J+(K+4)|0;c[S>>2]=c[S>>2]|1}n=J+8|0;return n|0}J=c[61631]|0;if(o>>>0<J>>>0){S=J-o|0;c[61631]=S;J=c[61634]|0;K=J;c[61634]=K+o;c[K+(o+4)>>2]=S|1;c[J+4>>2]=o|3;n=J+8|0;return n|0}do{if((c[61622]|0)==0){J=wa(30)|0;if((J-1&J|0)==0){c[61624]=J;c[61623]=J;c[61625]=-1;c[61626]=-1;c[61627]=0;c[61739]=0;c[61622]=(mb(0)|0)&-16^1431655768;break}else{Aa();return 0}}}while(0);J=o+48|0;S=c[61624]|0;K=o+47|0;R=S+K|0;Q=-S|0;S=R&Q;if(!(S>>>0>o>>>0)){n=0;return n|0}O=c[61738]|0;do{if((O|0)!=0){P=c[61736]|0;L=P+S|0;if(L>>>0<=P>>>0|L>>>0>O>>>0){n=0}else{break}return n|0}}while(0);d:do{if((c[61739]&4|0)==0){O=c[61634]|0;e:do{if((O|0)==0){T=181}else{L=O;P=246960;while(1){U=P|0;M=c[U>>2]|0;if(!(M>>>0>L>>>0)){V=P+4|0;if((M+(c[V>>2]|0)|0)>>>0>L>>>0){break}}M=c[P+8>>2]|0;if((M|0)==0){T=181;break e}else{P=M}}if((P|0)==0){T=181;break}L=R-(c[61631]|0)&Q;if(!(L>>>0<2147483647>>>0)){W=0;break}m=kb(L|0)|0;e=(m|0)==((c[U>>2]|0)+(c[V>>2]|0)|0);X=e?m:-1;Y=e?L:0;Z=m;_=L;T=190}}while(0);do{if((T|0)==181){O=kb(0)|0;if((O|0)==-1){W=0;break}g=O;L=c[61623]|0;m=L-1|0;if((m&g|0)==0){$=S}else{$=S-g+(m+g&-L)|0}L=c[61736]|0;g=L+$|0;if(!($>>>0>o>>>0&$>>>0<2147483647>>>0)){W=0;break}m=c[61738]|0;if((m|0)!=0){if(g>>>0<=L>>>0|g>>>0>m>>>0){W=0;break}}m=kb($|0)|0;g=(m|0)==(O|0);X=g?O:-1;Y=g?$:0;Z=m;_=$;T=190}}while(0);f:do{if((T|0)==190){m=-_|0;if(!((X|0)==-1)){aa=Y;ba=X;T=201;break d}do{if((Z|0)!=-1&_>>>0<2147483647>>>0&_>>>0<J>>>0){g=c[61624]|0;O=K-_+g&-g;if(!(O>>>0<2147483647>>>0)){ca=_;break}if((kb(O|0)|0)==-1){kb(m|0)|0;W=Y;break f}else{ca=O+_|0;break}}else{ca=_}}while(0);if((Z|0)==-1){W=Y}else{aa=ca;ba=Z;T=201;break d}}}while(0);c[61739]=c[61739]|4;da=W;T=198}else{da=0;T=198}}while(0);do{if((T|0)==198){if(!(S>>>0<2147483647>>>0)){break}W=kb(S|0)|0;Z=kb(0)|0;if(!((Z|0)!=-1&(W|0)!=-1&W>>>0<Z>>>0)){break}ca=Z-W|0;Z=ca>>>0>(o+40|0)>>>0;Y=Z?W:-1;if(!((Y|0)==-1)){aa=Z?ca:da;ba=Y;T=201}}}while(0);do{if((T|0)==201){da=(c[61736]|0)+aa|0;c[61736]=da;if(da>>>0>(c[61737]|0)>>>0){c[61737]=da}da=c[61634]|0;g:do{if((da|0)==0){S=c[61632]|0;if((S|0)==0|ba>>>0<S>>>0){c[61632]=ba}c[61740]=ba;c[61741]=aa;c[61743]=0;c[61637]=c[61622];c[61636]=-1;S=0;do{Y=S<<1;ca=246552+(Y<<2)|0;c[246552+(Y+3<<2)>>2]=ca;c[246552+(Y+2<<2)>>2]=ca;S=S+1|0;}while(S>>>0<32>>>0);S=ba+8|0;if((S&7|0)==0){ea=0}else{ea=-S&7}S=aa-40-ea|0;c[61634]=ba+ea;c[61631]=S;c[ba+(ea+4)>>2]=S|1;c[ba+(aa-36)>>2]=40;c[61635]=c[61626]}else{S=246960;while(1){fa=c[S>>2]|0;ga=S+4|0;ha=c[ga>>2]|0;if((ba|0)==(fa+ha|0)){T=213;break}ca=c[S+8>>2]|0;if((ca|0)==0){break}else{S=ca}}do{if((T|0)==213){if((c[S+12>>2]&8|0)!=0){break}ca=da;if(!(ca>>>0>=fa>>>0&ca>>>0<ba>>>0)){break}c[ga>>2]=ha+aa;Y=(c[61631]|0)+aa|0;Z=da+8|0;if((Z&7|0)==0){ia=0}else{ia=-Z&7}Z=Y-ia|0;c[61634]=ca+ia;c[61631]=Z;c[ca+(ia+4)>>2]=Z|1;c[ca+(Y+4)>>2]=40;c[61635]=c[61626];break g}}while(0);if(ba>>>0<(c[61632]|0)>>>0){c[61632]=ba}S=ba+aa|0;Y=246960;while(1){ja=Y|0;if((c[ja>>2]|0)==(S|0)){T=223;break}ca=c[Y+8>>2]|0;if((ca|0)==0){break}else{Y=ca}}do{if((T|0)==223){if((c[Y+12>>2]&8|0)!=0){break}c[ja>>2]=ba;S=Y+4|0;c[S>>2]=(c[S>>2]|0)+aa;S=ba+8|0;if((S&7|0)==0){ka=0}else{ka=-S&7}S=ba+(aa+8)|0;if((S&7|0)==0){la=0}else{la=-S&7}S=ba+(la+aa)|0;ca=S;Z=ka+o|0;W=ba+Z|0;_=W;K=S-(ba+ka)-o|0;c[ba+(ka+4)>>2]=o|3;do{if((ca|0)==(c[61634]|0)){J=(c[61631]|0)+K|0;c[61631]=J;c[61634]=_;c[ba+(Z+4)>>2]=J|1}else{if((ca|0)==(c[61633]|0)){J=(c[61630]|0)+K|0;c[61630]=J;c[61633]=_;c[ba+(Z+4)>>2]=J|1;c[ba+(J+Z)>>2]=J;break}J=aa+4|0;X=c[ba+(J+la)>>2]|0;if((X&3|0)==1){$=X&-8;V=X>>>3;h:do{if(X>>>0<256>>>0){U=c[ba+((la|8)+aa)>>2]|0;Q=c[ba+(aa+12+la)>>2]|0;R=246552+(V<<1<<2)|0;do{if((U|0)!=(R|0)){if(U>>>0<(c[61632]|0)>>>0){Aa();return 0}if((c[U+12>>2]|0)==(ca|0)){break}Aa();return 0}}while(0);if((Q|0)==(U|0)){c[61628]=c[61628]&~(1<<V);break}do{if((Q|0)==(R|0)){ma=Q+8|0}else{if(Q>>>0<(c[61632]|0)>>>0){Aa();return 0}m=Q+8|0;if((c[m>>2]|0)==(ca|0)){ma=m;break}Aa();return 0}}while(0);c[U+12>>2]=Q;c[ma>>2]=U}else{R=S;m=c[ba+((la|24)+aa)>>2]|0;P=c[ba+(aa+12+la)>>2]|0;do{if((P|0)==(R|0)){O=la|16;g=ba+(J+O)|0;L=c[g>>2]|0;if((L|0)==0){e=ba+(O+aa)|0;O=c[e>>2]|0;if((O|0)==0){na=0;break}else{oa=O;pa=e}}else{oa=L;pa=g}while(1){g=oa+20|0;L=c[g>>2]|0;if((L|0)!=0){oa=L;pa=g;continue}g=oa+16|0;L=c[g>>2]|0;if((L|0)==0){break}else{oa=L;pa=g}}if(pa>>>0<(c[61632]|0)>>>0){Aa();return 0}else{c[pa>>2]=0;na=oa;break}}else{g=c[ba+((la|8)+aa)>>2]|0;if(g>>>0<(c[61632]|0)>>>0){Aa();return 0}L=g+12|0;if((c[L>>2]|0)!=(R|0)){Aa();return 0}e=P+8|0;if((c[e>>2]|0)==(R|0)){c[L>>2]=P;c[e>>2]=g;na=P;break}else{Aa();return 0}}}while(0);if((m|0)==0){break}P=c[ba+(aa+28+la)>>2]|0;U=246816+(P<<2)|0;do{if((R|0)==(c[U>>2]|0)){c[U>>2]=na;if((na|0)!=0){break}c[61629]=c[61629]&~(1<<P);break h}else{if(m>>>0<(c[61632]|0)>>>0){Aa();return 0}Q=m+16|0;if((c[Q>>2]|0)==(R|0)){c[Q>>2]=na}else{c[m+20>>2]=na}if((na|0)==0){break h}}}while(0);if(na>>>0<(c[61632]|0)>>>0){Aa();return 0}c[na+24>>2]=m;R=la|16;P=c[ba+(R+aa)>>2]|0;do{if((P|0)!=0){if(P>>>0<(c[61632]|0)>>>0){Aa();return 0}else{c[na+16>>2]=P;c[P+24>>2]=na;break}}}while(0);P=c[ba+(J+R)>>2]|0;if((P|0)==0){break}if(P>>>0<(c[61632]|0)>>>0){Aa();return 0}else{c[na+20>>2]=P;c[P+24>>2]=na;break}}}while(0);qa=ba+(($|la)+aa)|0;ra=$+K|0}else{qa=ca;ra=K}J=qa+4|0;c[J>>2]=c[J>>2]&-2;c[ba+(Z+4)>>2]=ra|1;c[ba+(ra+Z)>>2]=ra;J=ra>>>3;if(ra>>>0<256>>>0){V=J<<1;X=246552+(V<<2)|0;P=c[61628]|0;m=1<<J;do{if((P&m|0)==0){c[61628]=P|m;sa=X;ta=246552+(V+2<<2)|0}else{J=246552+(V+2<<2)|0;U=c[J>>2]|0;if(!(U>>>0<(c[61632]|0)>>>0)){sa=U;ta=J;break}Aa();return 0}}while(0);c[ta>>2]=_;c[sa+12>>2]=_;c[ba+(Z+8)>>2]=sa;c[ba+(Z+12)>>2]=X;break}V=W;m=ra>>>8;do{if((m|0)==0){ua=0}else{if(ra>>>0>16777215>>>0){ua=31;break}P=(m+1048320|0)>>>16&8;$=m<<P;J=($+520192|0)>>>16&4;U=$<<J;$=(U+245760|0)>>>16&2;Q=14-(J|P|$)+(U<<$>>>15)|0;ua=ra>>>((Q+7|0)>>>0)&1|Q<<1}}while(0);m=246816+(ua<<2)|0;c[ba+(Z+28)>>2]=ua;c[ba+(Z+20)>>2]=0;c[ba+(Z+16)>>2]=0;X=c[61629]|0;Q=1<<ua;if((X&Q|0)==0){c[61629]=X|Q;c[m>>2]=V;c[ba+(Z+24)>>2]=m;c[ba+(Z+12)>>2]=V;c[ba+(Z+8)>>2]=V;break}if((ua|0)==31){va=0}else{va=25-(ua>>>1)|0}Q=ra<<va;X=c[m>>2]|0;while(1){if((c[X+4>>2]&-8|0)==(ra|0)){break}xa=X+16+(Q>>>31<<2)|0;m=c[xa>>2]|0;if((m|0)==0){T=296;break}else{Q=Q<<1;X=m}}if((T|0)==296){if(xa>>>0<(c[61632]|0)>>>0){Aa();return 0}else{c[xa>>2]=V;c[ba+(Z+24)>>2]=X;c[ba+(Z+12)>>2]=V;c[ba+(Z+8)>>2]=V;break}}Q=X+8|0;m=c[Q>>2]|0;$=c[61632]|0;if(X>>>0<$>>>0){Aa();return 0}if(m>>>0<$>>>0){Aa();return 0}else{c[m+12>>2]=V;c[Q>>2]=V;c[ba+(Z+8)>>2]=m;c[ba+(Z+12)>>2]=X;c[ba+(Z+24)>>2]=0;break}}}while(0);n=ba+(ka|8)|0;return n|0}}while(0);Y=da;Z=246960;while(1){ya=c[Z>>2]|0;if(!(ya>>>0>Y>>>0)){za=c[Z+4>>2]|0;Ba=ya+za|0;if(Ba>>>0>Y>>>0){break}}Z=c[Z+8>>2]|0}Z=ya+(za-39)|0;if((Z&7|0)==0){Ca=0}else{Ca=-Z&7}Z=ya+(za-47+Ca)|0;W=Z>>>0<(da+16|0)>>>0?Y:Z;Z=W+8|0;_=ba+8|0;if((_&7|0)==0){Da=0}else{Da=-_&7}_=aa-40-Da|0;c[61634]=ba+Da;c[61631]=_;c[ba+(Da+4)>>2]=_|1;c[ba+(aa-36)>>2]=40;c[61635]=c[61626];c[W+4>>2]=27;c[Z>>2]=c[61740];c[Z+4>>2]=c[61741];c[Z+8>>2]=c[61742];c[Z+12>>2]=c[61743];c[61740]=ba;c[61741]=aa;c[61743]=0;c[61742]=Z;Z=W+28|0;c[Z>>2]=7;if((W+32|0)>>>0<Ba>>>0){_=Z;while(1){Z=_+4|0;c[Z>>2]=7;if((_+8|0)>>>0<Ba>>>0){_=Z}else{break}}}if((W|0)==(Y|0)){break}_=W-da|0;Z=Y+(_+4)|0;c[Z>>2]=c[Z>>2]&-2;c[da+4>>2]=_|1;c[Y+_>>2]=_;Z=_>>>3;if(_>>>0<256>>>0){K=Z<<1;ca=246552+(K<<2)|0;S=c[61628]|0;m=1<<Z;do{if((S&m|0)==0){c[61628]=S|m;Ea=ca;Fa=246552+(K+2<<2)|0}else{Z=246552+(K+2<<2)|0;Q=c[Z>>2]|0;if(!(Q>>>0<(c[61632]|0)>>>0)){Ea=Q;Fa=Z;break}Aa();return 0}}while(0);c[Fa>>2]=da;c[Ea+12>>2]=da;c[da+8>>2]=Ea;c[da+12>>2]=ca;break}K=da;m=_>>>8;do{if((m|0)==0){Ga=0}else{if(_>>>0>16777215>>>0){Ga=31;break}S=(m+1048320|0)>>>16&8;Y=m<<S;W=(Y+520192|0)>>>16&4;Z=Y<<W;Y=(Z+245760|0)>>>16&2;Q=14-(W|S|Y)+(Z<<Y>>>15)|0;Ga=_>>>((Q+7|0)>>>0)&1|Q<<1}}while(0);m=246816+(Ga<<2)|0;c[da+28>>2]=Ga;c[da+20>>2]=0;c[da+16>>2]=0;ca=c[61629]|0;Q=1<<Ga;if((ca&Q|0)==0){c[61629]=ca|Q;c[m>>2]=K;c[da+24>>2]=m;c[da+12>>2]=da;c[da+8>>2]=da;break}if((Ga|0)==31){Ha=0}else{Ha=25-(Ga>>>1)|0}Q=_<<Ha;ca=c[m>>2]|0;while(1){if((c[ca+4>>2]&-8|0)==(_|0)){break}Ia=ca+16+(Q>>>31<<2)|0;m=c[Ia>>2]|0;if((m|0)==0){T=331;break}else{Q=Q<<1;ca=m}}if((T|0)==331){if(Ia>>>0<(c[61632]|0)>>>0){Aa();return 0}else{c[Ia>>2]=K;c[da+24>>2]=ca;c[da+12>>2]=da;c[da+8>>2]=da;break}}Q=ca+8|0;_=c[Q>>2]|0;m=c[61632]|0;if(ca>>>0<m>>>0){Aa();return 0}if(_>>>0<m>>>0){Aa();return 0}else{c[_+12>>2]=K;c[Q>>2]=K;c[da+8>>2]=_;c[da+12>>2]=ca;c[da+24>>2]=0;break}}}while(0);da=c[61631]|0;if(!(da>>>0>o>>>0)){break}_=da-o|0;c[61631]=_;da=c[61634]|0;Q=da;c[61634]=Q+o;c[Q+(o+4)>>2]=_|1;c[da+4>>2]=o|3;n=da+8|0;return n|0}}while(0);c[(gb()|0)>>2]=12;n=0;return n|0}function _f(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;if((a|0)==0){return}b=a-8|0;d=b;e=c[61632]|0;if(b>>>0<e>>>0){Aa()}f=c[a-4>>2]|0;g=f&3;if((g|0)==1){Aa()}h=f&-8;i=a+(h-8)|0;j=i;a:do{if((f&1|0)==0){k=c[b>>2]|0;if((g|0)==0){return}l=-8-k|0;m=a+l|0;n=m;o=k+h|0;if(m>>>0<e>>>0){Aa()}if((n|0)==(c[61633]|0)){p=a+(h-4)|0;if((c[p>>2]&3|0)!=3){q=n;r=o;break}c[61630]=o;c[p>>2]=c[p>>2]&-2;c[a+(l+4)>>2]=o|1;c[i>>2]=o;return}p=k>>>3;if(k>>>0<256>>>0){k=c[a+(l+8)>>2]|0;s=c[a+(l+12)>>2]|0;t=246552+(p<<1<<2)|0;do{if((k|0)!=(t|0)){if(k>>>0<e>>>0){Aa()}if((c[k+12>>2]|0)==(n|0)){break}Aa()}}while(0);if((s|0)==(k|0)){c[61628]=c[61628]&~(1<<p);q=n;r=o;break}do{if((s|0)==(t|0)){u=s+8|0}else{if(s>>>0<e>>>0){Aa()}v=s+8|0;if((c[v>>2]|0)==(n|0)){u=v;break}Aa()}}while(0);c[k+12>>2]=s;c[u>>2]=k;q=n;r=o;break}t=m;p=c[a+(l+24)>>2]|0;v=c[a+(l+12)>>2]|0;do{if((v|0)==(t|0)){w=a+(l+20)|0;x=c[w>>2]|0;if((x|0)==0){y=a+(l+16)|0;z=c[y>>2]|0;if((z|0)==0){A=0;break}else{B=z;C=y}}else{B=x;C=w}while(1){w=B+20|0;x=c[w>>2]|0;if((x|0)!=0){B=x;C=w;continue}w=B+16|0;x=c[w>>2]|0;if((x|0)==0){break}else{B=x;C=w}}if(C>>>0<e>>>0){Aa()}else{c[C>>2]=0;A=B;break}}else{w=c[a+(l+8)>>2]|0;if(w>>>0<e>>>0){Aa()}x=w+12|0;if((c[x>>2]|0)!=(t|0)){Aa()}y=v+8|0;if((c[y>>2]|0)==(t|0)){c[x>>2]=v;c[y>>2]=w;A=v;break}else{Aa()}}}while(0);if((p|0)==0){q=n;r=o;break}v=c[a+(l+28)>>2]|0;m=246816+(v<<2)|0;do{if((t|0)==(c[m>>2]|0)){c[m>>2]=A;if((A|0)!=0){break}c[61629]=c[61629]&~(1<<v);q=n;r=o;break a}else{if(p>>>0<(c[61632]|0)>>>0){Aa()}k=p+16|0;if((c[k>>2]|0)==(t|0)){c[k>>2]=A}else{c[p+20>>2]=A}if((A|0)==0){q=n;r=o;break a}}}while(0);if(A>>>0<(c[61632]|0)>>>0){Aa()}c[A+24>>2]=p;t=c[a+(l+16)>>2]|0;do{if((t|0)!=0){if(t>>>0<(c[61632]|0)>>>0){Aa()}else{c[A+16>>2]=t;c[t+24>>2]=A;break}}}while(0);t=c[a+(l+20)>>2]|0;if((t|0)==0){q=n;r=o;break}if(t>>>0<(c[61632]|0)>>>0){Aa()}else{c[A+20>>2]=t;c[t+24>>2]=A;q=n;r=o;break}}else{q=d;r=h}}while(0);d=q;if(!(d>>>0<i>>>0)){Aa()}A=a+(h-4)|0;e=c[A>>2]|0;if((e&1|0)==0){Aa()}do{if((e&2|0)==0){if((j|0)==(c[61634]|0)){B=(c[61631]|0)+r|0;c[61631]=B;c[61634]=q;c[q+4>>2]=B|1;if((q|0)!=(c[61633]|0)){return}c[61633]=0;c[61630]=0;return}if((j|0)==(c[61633]|0)){B=(c[61630]|0)+r|0;c[61630]=B;c[61633]=q;c[q+4>>2]=B|1;c[d+B>>2]=B;return}B=(e&-8)+r|0;C=e>>>3;b:do{if(e>>>0<256>>>0){u=c[a+h>>2]|0;g=c[a+(h|4)>>2]|0;b=246552+(C<<1<<2)|0;do{if((u|0)!=(b|0)){if(u>>>0<(c[61632]|0)>>>0){Aa()}if((c[u+12>>2]|0)==(j|0)){break}Aa()}}while(0);if((g|0)==(u|0)){c[61628]=c[61628]&~(1<<C);break}do{if((g|0)==(b|0)){D=g+8|0}else{if(g>>>0<(c[61632]|0)>>>0){Aa()}f=g+8|0;if((c[f>>2]|0)==(j|0)){D=f;break}Aa()}}while(0);c[u+12>>2]=g;c[D>>2]=u}else{b=i;f=c[a+(h+16)>>2]|0;t=c[a+(h|4)>>2]|0;do{if((t|0)==(b|0)){p=a+(h+12)|0;v=c[p>>2]|0;if((v|0)==0){m=a+(h+8)|0;k=c[m>>2]|0;if((k|0)==0){E=0;break}else{F=k;G=m}}else{F=v;G=p}while(1){p=F+20|0;v=c[p>>2]|0;if((v|0)!=0){F=v;G=p;continue}p=F+16|0;v=c[p>>2]|0;if((v|0)==0){break}else{F=v;G=p}}if(G>>>0<(c[61632]|0)>>>0){Aa()}else{c[G>>2]=0;E=F;break}}else{p=c[a+h>>2]|0;if(p>>>0<(c[61632]|0)>>>0){Aa()}v=p+12|0;if((c[v>>2]|0)!=(b|0)){Aa()}m=t+8|0;if((c[m>>2]|0)==(b|0)){c[v>>2]=t;c[m>>2]=p;E=t;break}else{Aa()}}}while(0);if((f|0)==0){break}t=c[a+(h+20)>>2]|0;u=246816+(t<<2)|0;do{if((b|0)==(c[u>>2]|0)){c[u>>2]=E;if((E|0)!=0){break}c[61629]=c[61629]&~(1<<t);break b}else{if(f>>>0<(c[61632]|0)>>>0){Aa()}g=f+16|0;if((c[g>>2]|0)==(b|0)){c[g>>2]=E}else{c[f+20>>2]=E}if((E|0)==0){break b}}}while(0);if(E>>>0<(c[61632]|0)>>>0){Aa()}c[E+24>>2]=f;b=c[a+(h+8)>>2]|0;do{if((b|0)!=0){if(b>>>0<(c[61632]|0)>>>0){Aa()}else{c[E+16>>2]=b;c[b+24>>2]=E;break}}}while(0);b=c[a+(h+12)>>2]|0;if((b|0)==0){break}if(b>>>0<(c[61632]|0)>>>0){Aa()}else{c[E+20>>2]=b;c[b+24>>2]=E;break}}}while(0);c[q+4>>2]=B|1;c[d+B>>2]=B;if((q|0)!=(c[61633]|0)){H=B;break}c[61630]=B;return}else{c[A>>2]=e&-2;c[q+4>>2]=r|1;c[d+r>>2]=r;H=r}}while(0);r=H>>>3;if(H>>>0<256>>>0){d=r<<1;e=246552+(d<<2)|0;A=c[61628]|0;E=1<<r;do{if((A&E|0)==0){c[61628]=A|E;I=e;J=246552+(d+2<<2)|0}else{r=246552+(d+2<<2)|0;h=c[r>>2]|0;if(!(h>>>0<(c[61632]|0)>>>0)){I=h;J=r;break}Aa()}}while(0);c[J>>2]=q;c[I+12>>2]=q;c[q+8>>2]=I;c[q+12>>2]=e;return}e=q;I=H>>>8;do{if((I|0)==0){K=0}else{if(H>>>0>16777215>>>0){K=31;break}J=(I+1048320|0)>>>16&8;d=I<<J;E=(d+520192|0)>>>16&4;A=d<<E;d=(A+245760|0)>>>16&2;r=14-(E|J|d)+(A<<d>>>15)|0;K=H>>>((r+7|0)>>>0)&1|r<<1}}while(0);I=246816+(K<<2)|0;c[q+28>>2]=K;c[q+20>>2]=0;c[q+16>>2]=0;r=c[61629]|0;d=1<<K;do{if((r&d|0)==0){c[61629]=r|d;c[I>>2]=e;c[q+24>>2]=I;c[q+12>>2]=q;c[q+8>>2]=q}else{if((K|0)==31){L=0}else{L=25-(K>>>1)|0}A=H<<L;J=c[I>>2]|0;while(1){if((c[J+4>>2]&-8|0)==(H|0)){break}M=J+16+(A>>>31<<2)|0;E=c[M>>2]|0;if((E|0)==0){N=129;break}else{A=A<<1;J=E}}if((N|0)==129){if(M>>>0<(c[61632]|0)>>>0){Aa()}else{c[M>>2]=e;c[q+24>>2]=J;c[q+12>>2]=q;c[q+8>>2]=q;break}}A=J+8|0;B=c[A>>2]|0;E=c[61632]|0;if(J>>>0<E>>>0){Aa()}if(B>>>0<E>>>0){Aa()}else{c[B+12>>2]=e;c[A>>2]=e;c[q+8>>2]=B;c[q+12>>2]=J;c[q+24>>2]=0;break}}}while(0);q=(c[61636]|0)-1|0;c[61636]=q;if((q|0)==0){O=246968}else{return}while(1){q=c[O>>2]|0;if((q|0)==0){break}else{O=q+8|0}}c[61636]=-1;return}function $f(a,b){a=a|0;b=b|0;var d=0,e=0;do{if((a|0)==0){d=0}else{e=ca(b,a)|0;if(!((b|a)>>>0>65535>>>0)){d=e;break}d=((e>>>0)/(a>>>0)|0|0)==(b|0)?e:-1}}while(0);b=Zf(d)|0;if((b|0)==0){return b|0}if((c[b-4>>2]&3|0)==0){return b|0}og(b|0,0,d|0)|0;return b|0}function ag(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;if((a|0)==0){d=Zf(b)|0;return d|0}if(b>>>0>4294967231>>>0){c[(gb()|0)>>2]=12;d=0;return d|0}if(b>>>0<11>>>0){e=16}else{e=b+11&-8}f=bg(a-8|0,e)|0;if((f|0)!=0){d=f+8|0;return d|0}f=Zf(b)|0;if((f|0)==0){d=0;return d|0}e=c[a-4>>2]|0;g=(e&-8)-((e&3|0)==0?8:4)|0;kg(f|0,a|0,g>>>0<b>>>0?g:b)|0;_f(a);d=f;return d|0}function bg(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;d=a+4|0;e=c[d>>2]|0;f=e&-8;g=a;h=g+f|0;i=h;j=c[61632]|0;if(g>>>0<j>>>0){Aa();return 0}k=e&3;if(!((k|0)!=1&g>>>0<h>>>0)){Aa();return 0}l=g+(f|4)|0;m=c[l>>2]|0;if((m&1|0)==0){Aa();return 0}if((k|0)==0){if(b>>>0<256>>>0){n=0;return n|0}do{if(!(f>>>0<(b+4|0)>>>0)){if((f-b|0)>>>0>c[61624]<<1>>>0){break}else{n=a}return n|0}}while(0);n=0;return n|0}if(!(f>>>0<b>>>0)){k=f-b|0;if(!(k>>>0>15>>>0)){n=a;return n|0}c[d>>2]=e&1|b|2;c[g+(b+4)>>2]=k|3;c[l>>2]=c[l>>2]|1;cg(g+b|0,k);n=a;return n|0}if((i|0)==(c[61634]|0)){k=(c[61631]|0)+f|0;if(!(k>>>0>b>>>0)){n=0;return n|0}l=k-b|0;c[d>>2]=e&1|b|2;c[g+(b+4)>>2]=l|1;c[61634]=g+b;c[61631]=l;n=a;return n|0}if((i|0)==(c[61633]|0)){l=(c[61630]|0)+f|0;if(l>>>0<b>>>0){n=0;return n|0}k=l-b|0;if(k>>>0>15>>>0){c[d>>2]=e&1|b|2;c[g+(b+4)>>2]=k|1;c[g+l>>2]=k;o=g+(l+4)|0;c[o>>2]=c[o>>2]&-2;p=g+b|0;q=k}else{c[d>>2]=e&1|l|2;e=g+(l+4)|0;c[e>>2]=c[e>>2]|1;p=0;q=0}c[61630]=q;c[61633]=p;n=a;return n|0}if((m&2|0)!=0){n=0;return n|0}p=(m&-8)+f|0;if(p>>>0<b>>>0){n=0;return n|0}q=p-b|0;e=m>>>3;a:do{if(m>>>0<256>>>0){l=c[g+(f+8)>>2]|0;k=c[g+(f+12)>>2]|0;o=246552+(e<<1<<2)|0;do{if((l|0)!=(o|0)){if(l>>>0<j>>>0){Aa();return 0}if((c[l+12>>2]|0)==(i|0)){break}Aa();return 0}}while(0);if((k|0)==(l|0)){c[61628]=c[61628]&~(1<<e);break}do{if((k|0)==(o|0)){r=k+8|0}else{if(k>>>0<j>>>0){Aa();return 0}s=k+8|0;if((c[s>>2]|0)==(i|0)){r=s;break}Aa();return 0}}while(0);c[l+12>>2]=k;c[r>>2]=l}else{o=h;s=c[g+(f+24)>>2]|0;t=c[g+(f+12)>>2]|0;do{if((t|0)==(o|0)){u=g+(f+20)|0;v=c[u>>2]|0;if((v|0)==0){w=g+(f+16)|0;x=c[w>>2]|0;if((x|0)==0){y=0;break}else{z=x;A=w}}else{z=v;A=u}while(1){u=z+20|0;v=c[u>>2]|0;if((v|0)!=0){z=v;A=u;continue}u=z+16|0;v=c[u>>2]|0;if((v|0)==0){break}else{z=v;A=u}}if(A>>>0<j>>>0){Aa();return 0}else{c[A>>2]=0;y=z;break}}else{u=c[g+(f+8)>>2]|0;if(u>>>0<j>>>0){Aa();return 0}v=u+12|0;if((c[v>>2]|0)!=(o|0)){Aa();return 0}w=t+8|0;if((c[w>>2]|0)==(o|0)){c[v>>2]=t;c[w>>2]=u;y=t;break}else{Aa();return 0}}}while(0);if((s|0)==0){break}t=c[g+(f+28)>>2]|0;l=246816+(t<<2)|0;do{if((o|0)==(c[l>>2]|0)){c[l>>2]=y;if((y|0)!=0){break}c[61629]=c[61629]&~(1<<t);break a}else{if(s>>>0<(c[61632]|0)>>>0){Aa();return 0}k=s+16|0;if((c[k>>2]|0)==(o|0)){c[k>>2]=y}else{c[s+20>>2]=y}if((y|0)==0){break a}}}while(0);if(y>>>0<(c[61632]|0)>>>0){Aa();return 0}c[y+24>>2]=s;o=c[g+(f+16)>>2]|0;do{if((o|0)!=0){if(o>>>0<(c[61632]|0)>>>0){Aa();return 0}else{c[y+16>>2]=o;c[o+24>>2]=y;break}}}while(0);o=c[g+(f+20)>>2]|0;if((o|0)==0){break}if(o>>>0<(c[61632]|0)>>>0){Aa();return 0}else{c[y+20>>2]=o;c[o+24>>2]=y;break}}}while(0);if(q>>>0<16>>>0){c[d>>2]=p|c[d>>2]&1|2;y=g+(p|4)|0;c[y>>2]=c[y>>2]|1;n=a;return n|0}else{c[d>>2]=c[d>>2]&1|b|2;c[g+(b+4)>>2]=q|3;d=g+(p|4)|0;c[d>>2]=c[d>>2]|1;cg(g+b|0,q);n=a;return n|0}return 0}function cg(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;d=a;e=d+b|0;f=e;g=c[a+4>>2]|0;a:do{if((g&1|0)==0){h=c[a>>2]|0;if((g&3|0)==0){return}i=d+(-h|0)|0;j=i;k=h+b|0;l=c[61632]|0;if(i>>>0<l>>>0){Aa()}if((j|0)==(c[61633]|0)){m=d+(b+4)|0;if((c[m>>2]&3|0)!=3){n=j;o=k;break}c[61630]=k;c[m>>2]=c[m>>2]&-2;c[d+(4-h)>>2]=k|1;c[e>>2]=k;return}m=h>>>3;if(h>>>0<256>>>0){p=c[d+(8-h)>>2]|0;q=c[d+(12-h)>>2]|0;r=246552+(m<<1<<2)|0;do{if((p|0)!=(r|0)){if(p>>>0<l>>>0){Aa()}if((c[p+12>>2]|0)==(j|0)){break}Aa()}}while(0);if((q|0)==(p|0)){c[61628]=c[61628]&~(1<<m);n=j;o=k;break}do{if((q|0)==(r|0)){s=q+8|0}else{if(q>>>0<l>>>0){Aa()}t=q+8|0;if((c[t>>2]|0)==(j|0)){s=t;break}Aa()}}while(0);c[p+12>>2]=q;c[s>>2]=p;n=j;o=k;break}r=i;m=c[d+(24-h)>>2]|0;t=c[d+(12-h)>>2]|0;do{if((t|0)==(r|0)){u=16-h|0;v=d+(u+4)|0;w=c[v>>2]|0;if((w|0)==0){x=d+u|0;u=c[x>>2]|0;if((u|0)==0){y=0;break}else{z=u;A=x}}else{z=w;A=v}while(1){v=z+20|0;w=c[v>>2]|0;if((w|0)!=0){z=w;A=v;continue}v=z+16|0;w=c[v>>2]|0;if((w|0)==0){break}else{z=w;A=v}}if(A>>>0<l>>>0){Aa()}else{c[A>>2]=0;y=z;break}}else{v=c[d+(8-h)>>2]|0;if(v>>>0<l>>>0){Aa()}w=v+12|0;if((c[w>>2]|0)!=(r|0)){Aa()}x=t+8|0;if((c[x>>2]|0)==(r|0)){c[w>>2]=t;c[x>>2]=v;y=t;break}else{Aa()}}}while(0);if((m|0)==0){n=j;o=k;break}t=c[d+(28-h)>>2]|0;l=246816+(t<<2)|0;do{if((r|0)==(c[l>>2]|0)){c[l>>2]=y;if((y|0)!=0){break}c[61629]=c[61629]&~(1<<t);n=j;o=k;break a}else{if(m>>>0<(c[61632]|0)>>>0){Aa()}i=m+16|0;if((c[i>>2]|0)==(r|0)){c[i>>2]=y}else{c[m+20>>2]=y}if((y|0)==0){n=j;o=k;break a}}}while(0);if(y>>>0<(c[61632]|0)>>>0){Aa()}c[y+24>>2]=m;r=16-h|0;t=c[d+r>>2]|0;do{if((t|0)!=0){if(t>>>0<(c[61632]|0)>>>0){Aa()}else{c[y+16>>2]=t;c[t+24>>2]=y;break}}}while(0);t=c[d+(r+4)>>2]|0;if((t|0)==0){n=j;o=k;break}if(t>>>0<(c[61632]|0)>>>0){Aa()}else{c[y+20>>2]=t;c[t+24>>2]=y;n=j;o=k;break}}else{n=a;o=b}}while(0);a=c[61632]|0;if(e>>>0<a>>>0){Aa()}y=d+(b+4)|0;z=c[y>>2]|0;do{if((z&2|0)==0){if((f|0)==(c[61634]|0)){A=(c[61631]|0)+o|0;c[61631]=A;c[61634]=n;c[n+4>>2]=A|1;if((n|0)!=(c[61633]|0)){return}c[61633]=0;c[61630]=0;return}if((f|0)==(c[61633]|0)){A=(c[61630]|0)+o|0;c[61630]=A;c[61633]=n;c[n+4>>2]=A|1;c[n+A>>2]=A;return}A=(z&-8)+o|0;s=z>>>3;b:do{if(z>>>0<256>>>0){g=c[d+(b+8)>>2]|0;t=c[d+(b+12)>>2]|0;h=246552+(s<<1<<2)|0;do{if((g|0)!=(h|0)){if(g>>>0<a>>>0){Aa()}if((c[g+12>>2]|0)==(f|0)){break}Aa()}}while(0);if((t|0)==(g|0)){c[61628]=c[61628]&~(1<<s);break}do{if((t|0)==(h|0)){B=t+8|0}else{if(t>>>0<a>>>0){Aa()}m=t+8|0;if((c[m>>2]|0)==(f|0)){B=m;break}Aa()}}while(0);c[g+12>>2]=t;c[B>>2]=g}else{h=e;m=c[d+(b+24)>>2]|0;l=c[d+(b+12)>>2]|0;do{if((l|0)==(h|0)){i=d+(b+20)|0;p=c[i>>2]|0;if((p|0)==0){q=d+(b+16)|0;v=c[q>>2]|0;if((v|0)==0){C=0;break}else{D=v;E=q}}else{D=p;E=i}while(1){i=D+20|0;p=c[i>>2]|0;if((p|0)!=0){D=p;E=i;continue}i=D+16|0;p=c[i>>2]|0;if((p|0)==0){break}else{D=p;E=i}}if(E>>>0<a>>>0){Aa()}else{c[E>>2]=0;C=D;break}}else{i=c[d+(b+8)>>2]|0;if(i>>>0<a>>>0){Aa()}p=i+12|0;if((c[p>>2]|0)!=(h|0)){Aa()}q=l+8|0;if((c[q>>2]|0)==(h|0)){c[p>>2]=l;c[q>>2]=i;C=l;break}else{Aa()}}}while(0);if((m|0)==0){break}l=c[d+(b+28)>>2]|0;g=246816+(l<<2)|0;do{if((h|0)==(c[g>>2]|0)){c[g>>2]=C;if((C|0)!=0){break}c[61629]=c[61629]&~(1<<l);break b}else{if(m>>>0<(c[61632]|0)>>>0){Aa()}t=m+16|0;if((c[t>>2]|0)==(h|0)){c[t>>2]=C}else{c[m+20>>2]=C}if((C|0)==0){break b}}}while(0);if(C>>>0<(c[61632]|0)>>>0){Aa()}c[C+24>>2]=m;h=c[d+(b+16)>>2]|0;do{if((h|0)!=0){if(h>>>0<(c[61632]|0)>>>0){Aa()}else{c[C+16>>2]=h;c[h+24>>2]=C;break}}}while(0);h=c[d+(b+20)>>2]|0;if((h|0)==0){break}if(h>>>0<(c[61632]|0)>>>0){Aa()}else{c[C+20>>2]=h;c[h+24>>2]=C;break}}}while(0);c[n+4>>2]=A|1;c[n+A>>2]=A;if((n|0)!=(c[61633]|0)){F=A;break}c[61630]=A;return}else{c[y>>2]=z&-2;c[n+4>>2]=o|1;c[n+o>>2]=o;F=o}}while(0);o=F>>>3;if(F>>>0<256>>>0){z=o<<1;y=246552+(z<<2)|0;C=c[61628]|0;b=1<<o;do{if((C&b|0)==0){c[61628]=C|b;G=y;H=246552+(z+2<<2)|0}else{o=246552+(z+2<<2)|0;d=c[o>>2]|0;if(!(d>>>0<(c[61632]|0)>>>0)){G=d;H=o;break}Aa()}}while(0);c[H>>2]=n;c[G+12>>2]=n;c[n+8>>2]=G;c[n+12>>2]=y;return}y=n;G=F>>>8;do{if((G|0)==0){I=0}else{if(F>>>0>16777215>>>0){I=31;break}H=(G+1048320|0)>>>16&8;z=G<<H;b=(z+520192|0)>>>16&4;C=z<<b;z=(C+245760|0)>>>16&2;o=14-(b|H|z)+(C<<z>>>15)|0;I=F>>>((o+7|0)>>>0)&1|o<<1}}while(0);G=246816+(I<<2)|0;c[n+28>>2]=I;c[n+20>>2]=0;c[n+16>>2]=0;o=c[61629]|0;z=1<<I;if((o&z|0)==0){c[61629]=o|z;c[G>>2]=y;c[n+24>>2]=G;c[n+12>>2]=n;c[n+8>>2]=n;return}if((I|0)==31){J=0}else{J=25-(I>>>1)|0}I=F<<J;J=c[G>>2]|0;while(1){if((c[J+4>>2]&-8|0)==(F|0)){break}K=J+16+(I>>>31<<2)|0;G=c[K>>2]|0;if((G|0)==0){L=126;break}else{I=I<<1;J=G}}if((L|0)==126){if(K>>>0<(c[61632]|0)>>>0){Aa()}c[K>>2]=y;c[n+24>>2]=J;c[n+12>>2]=n;c[n+8>>2]=n;return}K=J+8|0;L=c[K>>2]|0;I=c[61632]|0;if(J>>>0<I>>>0){Aa()}if(L>>>0<I>>>0){Aa()}c[L+12>>2]=y;c[K>>2]=y;c[n+8>>2]=L;c[n+12>>2]=J;c[n+24>>2]=0;return}function dg(a){a=a|0;var b=0,d=0,e=0;b=(a|0)==0?1:a;while(1){d=Zf(b)|0;if((d|0)!=0){e=10;break}a=(E=c[61748]|0,c[61748]=E+0,E);if((a|0)==0){break}vb[a&1]()}if((e|0)==10){return d|0}d=Ta(4)|0;c[d>>2]=236456;ya(d|0,236664,14);return 0}function eg(a){a=a|0;return dg(a)|0}function fg(a){a=a|0;if((a|0)==0){return}_f(a);return}function gg(a){a=a|0;fg(a);return}function hg(a){a=a|0;return}function ig(a){a=a|0;return 172200}function jg(a,b){a=+a;b=b|0;var d=0.0,e=0,f=0.0,g=0;do{if((b|0)>1023){d=a*8.98846567431158e+307;e=b-1023|0;if((e|0)<=1023){f=d;g=e;break}e=b-2046|0;f=d*8.98846567431158e+307;g=(e|0)>1023?1023:e}else{if(!((b|0)<-1022)){f=a;g=b;break}d=a*2.2250738585072014e-308;e=b+1022|0;if(!((e|0)<-1022)){f=d;g=e;break}e=b+2044|0;f=d*2.2250738585072014e-308;g=(e|0)<-1022?-1022:e}}while(0);return+(f*(c[k>>2]=0<<20|0>>>12,c[k+4>>2]=g+1023<<20|0>>>12,+h[k>>3]))}function kg(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((e|0)>=4096)return ab(b|0,d|0,e|0)|0;f=b|0;if((b&3)==(d&3)){while(b&3){if((e|0)==0)return f|0;a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function lg(a){a=a|0;var b=0;b=(ca(c[a>>2]|0,31010991)|0)+1735287159&2147483647;c[a>>2]=b;return b|0}function mg(){return lg(o)|0}function ng(b){b=b|0;var c=0;c=b;while(a[c]|0){c=c+1|0}return c-b|0}function og(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=b+e|0;if((e|0)>=20){d=d&255;g=b&3;h=d|d<<8|d<<16|d<<24;i=f&~3;if(g){g=b+4-g|0;while((b|0)<(g|0)){a[b]=d;b=b+1|0}}while((b|0)<(i|0)){c[b>>2]=h;b=b+4|0}}while((b|0)<(f|0)){a[b]=d;b=b+1|0}return b-e|0}function pg(b,c,d){b=b|0;c=c|0;d=d|0;var e=0;if((c|0)<(b|0)&(b|0)<(c+d|0)){e=b;c=c+d|0;b=b+d|0;while((d|0)>0){b=b-1|0;c=c-1|0;d=d-1|0;a[b]=a[c]|0}b=e}else{kg(b,c,d)|0}return b|0}function qg(b,c){b=b|0;c=c|0;var d=0;do{a[b+d|0]=a[c+d|0];d=d+1|0}while(a[c+(d-1)|0]|0);return b|0}function rg(b,c){b=b|0;c=c|0;var d=0,e=0;d=b+(ng(b)|0)|0;do{a[d+e|0]=a[c+e|0];e=e+1|0}while(a[c+(e-1)|0]|0);return b|0}function sg(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=a+c>>>0;return(G=b+d+(e>>>0<a>>>0|0)>>>0,e|0)|0}function tg(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=b-d>>>0;e=b-d-(c>>>0>a>>>0|0)>>>0;return(G=e,a-c>>>0|0)|0}function ug(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){G=b<<c|(a&(1<<c)-1<<32-c)>>>32-c;return a<<c}G=a<<c-32;return 0}function vg(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){G=b>>>c;return a>>>c|(b&(1<<c)-1)<<32-c}G=0;return b>>>c-32|0}function wg(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){G=b>>c;return a>>>c|(b&(1<<c)-1)<<32-c}G=(b|0)<0?-1:0;return b>>c-32|0}function xg(b){b=b|0;var c=0;c=a[n+(b>>>24)|0]|0;if((c|0)<8)return c|0;c=a[n+(b>>16&255)|0]|0;if((c|0)<8)return c+8|0;c=a[n+(b>>8&255)|0]|0;if((c|0)<8)return c+16|0;return(a[n+(b&255)|0]|0)+24|0}function yg(b){b=b|0;var c=0;c=a[m+(b&255)|0]|0;if((c|0)<8)return c|0;c=a[m+(b>>8&255)|0]|0;if((c|0)<8)return c+8|0;c=a[m+(b>>16&255)|0]|0;if((c|0)<8)return c+16|0;return(a[m+(b>>>24)|0]|0)+24|0}function zg(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0;c=a&65535;d=b&65535;e=ca(d,c)|0;f=a>>>16;a=(e>>>16)+(ca(d,f)|0)|0;d=b>>>16;b=ca(d,c)|0;return(G=(a>>>16)+(ca(d,f)|0)+(((a&65535)+b|0)>>>16)|0,a+b<<16|e&65535|0)|0}function Ag(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,i=0;e=b>>31|((b|0)<0?-1:0)<<1;f=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;g=d>>31|((d|0)<0?-1:0)<<1;h=((d|0)<0?-1:0)>>31|((d|0)<0?-1:0)<<1;i=tg(e^a,f^b,e,f)|0;b=G;a=g^e;e=h^f;f=tg((Fg(i,b,tg(g^c,h^d,g,h)|0,G,0)|0)^a,G^e,a,e)|0;return(G=G,f)|0}function Bg(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0;f=i;i=i+8|0;g=f|0;h=b>>31|((b|0)<0?-1:0)<<1;j=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;k=e>>31|((e|0)<0?-1:0)<<1;l=((e|0)<0?-1:0)>>31|((e|0)<0?-1:0)<<1;m=tg(h^a,j^b,h,j)|0;b=G;Fg(m,b,tg(k^d,l^e,k,l)|0,G,g)|0;l=tg(c[g>>2]^h,c[g+4>>2]^j,h,j)|0;j=G;i=f;return(G=j,l)|0}function Cg(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=a;a=c;c=zg(e,a)|0;f=G;return(G=(ca(b,a)|0)+(ca(d,e)|0)+f|f&0,c|0|0)|0}function Dg(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=Fg(a,b,c,d,0)|0;return(G=G,e)|0}function Eg(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+8|0;g=f|0;Fg(a,b,d,e,g)|0;i=f;return(G=c[g+4>>2]|0,c[g>>2]|0)|0}function Fg(a,b,d,e,f){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,H=0,I=0,J=0,K=0,L=0,M=0;g=a;h=b;i=h;j=d;k=e;l=k;if((i|0)==0){m=(f|0)!=0;if((l|0)==0){if(m){c[f>>2]=(g>>>0)%(j>>>0);c[f+4>>2]=0}n=0;o=(g>>>0)/(j>>>0)>>>0;return(G=n,o)|0}else{if(!m){n=0;o=0;return(G=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=b&0;n=0;o=0;return(G=n,o)|0}}m=(l|0)==0;do{if((j|0)==0){if(m){if((f|0)!=0){c[f>>2]=(i>>>0)%(j>>>0);c[f+4>>2]=0}n=0;o=(i>>>0)/(j>>>0)>>>0;return(G=n,o)|0}if((g|0)==0){if((f|0)!=0){c[f>>2]=0;c[f+4>>2]=(i>>>0)%(l>>>0)}n=0;o=(i>>>0)/(l>>>0)>>>0;return(G=n,o)|0}p=l-1|0;if((p&l|0)==0){if((f|0)!=0){c[f>>2]=a|0;c[f+4>>2]=p&i|b&0}n=0;o=i>>>((yg(l|0)|0)>>>0);return(G=n,o)|0}p=(xg(l|0)|0)-(xg(i|0)|0)|0;if(p>>>0<=30){q=p+1|0;r=31-p|0;s=q;t=i<<r|g>>>(q>>>0);u=i>>>(q>>>0);v=0;w=g<<r;break}if((f|0)==0){n=0;o=0;return(G=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=h|b&0;n=0;o=0;return(G=n,o)|0}else{if(!m){r=(xg(l|0)|0)-(xg(i|0)|0)|0;if(r>>>0<=31){q=r+1|0;p=31-r|0;x=r-31>>31;s=q;t=g>>>(q>>>0)&x|i<<p;u=i>>>(q>>>0)&x;v=0;w=g<<p;break}if((f|0)==0){n=0;o=0;return(G=n,o)|0}c[f>>2]=a|0;c[f+4>>2]=h|b&0;n=0;o=0;return(G=n,o)|0}p=j-1|0;if((p&j|0)!=0){x=(xg(j|0)|0)+33-(xg(i|0)|0)|0;q=64-x|0;r=32-x|0;y=r>>31;z=x-32|0;A=z>>31;s=x;t=r-1>>31&i>>>(z>>>0)|(i<<r|g>>>(x>>>0))&A;u=A&i>>>(x>>>0);v=g<<q&y;w=(i<<q|g>>>(z>>>0))&y|g<<r&x-33>>31;break}if((f|0)!=0){c[f>>2]=p&g;c[f+4>>2]=0}if((j|0)==1){n=h|b&0;o=a|0|0;return(G=n,o)|0}else{p=yg(j|0)|0;n=i>>>(p>>>0)|0;o=i<<32-p|g>>>(p>>>0)|0;return(G=n,o)|0}}}while(0);if((s|0)==0){B=w;C=v;D=u;E=t;F=0;H=0}else{g=d|0|0;d=k|e&0;e=sg(g,d,-1,-1)|0;k=G;i=w;w=v;v=u;u=t;t=s;s=0;while(1){I=w>>>31|i<<1;J=s|w<<1;j=u<<1|i>>>31|0;a=u>>>31|v<<1|0;tg(e,k,j,a)|0;b=G;h=b>>31|((b|0)<0?-1:0)<<1;K=h&1;L=tg(j,a,h&g,(((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1)&d)|0;M=G;b=t-1|0;if((b|0)==0){break}else{i=I;w=J;v=M;u=L;t=b;s=K}}B=I;C=J;D=M;E=L;F=0;H=K}K=C;C=0;if((f|0)!=0){c[f>>2]=E;c[f+4>>2]=D}n=(K|0)>>>31|(B|C)<<1|(C<<1|K>>>31)&0|F;o=(K<<1|0>>>31)&-2|H;return(G=n,o)|0}function Gg(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;pb[a&7](b|0,c|0,d|0,e|0,f|0)}function Hg(a,b){a=a|0;b=b|0;qb[a&31](b|0)}function Ig(a,b,c){a=a|0;b=b|0;c=c|0;rb[a&7](b|0,c|0)}function Jg(a,b){a=a|0;b=b|0;return sb[a&7](b|0)|0}function Kg(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return tb[a&3](b|0,c|0,d|0)|0}function Lg(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;ub[a&3](b|0,c|0,d|0)}function Mg(a){a=a|0;vb[a&1]()}function Ng(a,b,c,d,e,f,g,h,i){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;return wb[a&7](b|0,c|0,d|0,e|0,f|0,g|0,h|0,i|0)|0}function Og(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return xb[a&15](b|0,c|0,d|0,e|0)|0}function Pg(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;yb[a&7](b|0,c|0,d|0,e|0,f|0,g|0)}function Qg(a,b,c){a=a|0;b=b|0;c=c|0;return zb[a&31](b|0,c|0)|0}function Rg(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return Ab[a&15](b|0,c|0,d|0,e|0,f|0)|0}function Sg(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;Bb[a&7](b|0,c|0,d|0,e|0)}function Tg(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;da(0)}function Ug(a){a=a|0;da(1)}function Vg(a,b){a=a|0;b=b|0;da(2)}function Wg(a){a=a|0;da(3);return 0}function Xg(a,b,c){a=a|0;b=b|0;c=c|0;da(4);return 0}function Yg(a,b,c){a=a|0;b=b|0;c=c|0;da(5)}function Zg(){da(6)}function _g(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;da(7);return 0}function $g(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;da(8);return 0}function ah(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;da(9)}function bh(a,b){a=a|0;b=b|0;da(10);return 0}function ch(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;da(11);return 0}function dh(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;da(12)}




// EMSCRIPTEN_END_FUNCS
var pb=[Tg,Tg,Vf,Tg,Wf,Tg,Tg,Tg];var qb=[Ug,Ug,Zd,Ug,Kd,Ug,gg,Ug,Ld,Ug,Pf,Ug,te,Ug,hg,Ug,Of,Ug,Ud,Ug,Mf,Ug,Nf,Ug,_d,Ug,Qf,Ug,Vd,Ug,Ug,Ug];var rb=[Vg,Vg,Hd,Vg,$d,Vg,Vg,Vg];var sb=[Wg,Wg,ig,Wg,ue,Wg,Wg,Wg];var tb=[Xg,Xg,Rf,Xg];var ub=[Yg,Yg,re,Yg];var vb=[Zg,Zg];var wb=[_g,_g,oe,_g,ge,_g,_g,_g];var xb=[$g,$g,De,$g,Ce,$g,Nd,$g,Xd,$g,$g,$g,$g,$g,$g,$g];var yb=[ah,ah,Yf,ah,Xf,ah,ah,ah];var zb=[bh,bh,Id,bh,ed,bh,Sd,bh,Pd,bh,Md,bh,ce,bh,Re,bh,de,bh,se,bh,ve,bh,Td,bh,Jd,bh,Wd,bh,bh,bh,bh,bh];var Ab=[ch,ch,me,ch,ee,ch,pe,ch,je,ch,le,ch,ch,ch,ch,ch];var Bb=[dh,dh,Sf,dh,Tf,dh,dh,dh];return{_strlen:ng,_strcat:rg,_free:_f,_rand_r:lg,_lexy_write_test:Zb,_lexy_get_buffer:Wb,_lexy_test:Yb,_memmove:pg,_realloc:ag,_lexy_encoder_finish:Vb,_memset:og,_malloc:Zf,_memcpy:kg,_lexy_encoder_start:Tb,_lexy_encoder_write:Ub,_lexy_get_buffer_length:Xb,_strcpy:qg,_calloc:$f,_rand:mg,runPostSets:Sb,stackAlloc:Cb,stackSave:Db,stackRestore:Eb,setThrew:Fb,setTempRet0:Ib,setTempRet1:Jb,setTempRet2:Kb,setTempRet3:Lb,setTempRet4:Mb,setTempRet5:Nb,setTempRet6:Ob,setTempRet7:Pb,setTempRet8:Qb,setTempRet9:Rb,dynCall_viiiii:Gg,dynCall_vi:Hg,dynCall_vii:Ig,dynCall_ii:Jg,dynCall_iiii:Kg,dynCall_viii:Lg,dynCall_v:Mg,dynCall_iiiiiiiii:Ng,dynCall_iiiii:Og,dynCall_viiiiii:Pg,dynCall_iii:Qg,dynCall_iiiiii:Rg,dynCall_viiii:Sg}})


// EMSCRIPTEN_END_ASM
({ "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array }, { "abort": abort, "assert": assert, "asmPrintInt": asmPrintInt, "asmPrintFloat": asmPrintFloat, "min": Math_min, "invoke_viiiii": invoke_viiiii, "invoke_vi": invoke_vi, "invoke_vii": invoke_vii, "invoke_ii": invoke_ii, "invoke_iiii": invoke_iiii, "invoke_viii": invoke_viii, "invoke_v": invoke_v, "invoke_iiiiiiiii": invoke_iiiiiiiii, "invoke_iiiii": invoke_iiiii, "invoke_viiiiii": invoke_viiiiii, "invoke_iii": invoke_iii, "invoke_iiiiii": invoke_iiiiii, "invoke_viiii": invoke_viiii, "_fabsf": _fabsf, "_sysconf": _sysconf, "_rint": _rint, "___cxa_throw": ___cxa_throw, "_srand": _srand, "_abort": _abort, "_fprintf": _fprintf, "_sqrt": _sqrt, "_printf": _printf, "_fflush": _fflush, "__reallyNegative": __reallyNegative, "_fputc": _fputc, "_log": _log, "_puts": _puts, "_floor": _floor, "___setErrNo": ___setErrNo, "_fwrite": _fwrite, "_qsort": _qsort, "_send": _send, "_write": _write, "_fputs": _fputs, "_llvm_umul_with_overflow_i32": _llvm_umul_with_overflow_i32, "_exit": _exit, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "___cxa_allocate_exception": ___cxa_allocate_exception, "_sin": _sin, "_atan": _atan, "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv, "___cxa_is_number_type": ___cxa_is_number_type, "___resumeException": ___resumeException, "__formatString": __formatString, "___cxa_does_inherit": ___cxa_does_inherit, "_ceil": _ceil, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_fileno": _fileno, "_cos": _cos, "_pwrite": _pwrite, "_llvm_pow_f64": _llvm_pow_f64, "__ZNSt9exceptionD2Ev": __ZNSt9exceptionD2Ev, "___errno_location": ___errno_location, "___gxx_personality_v0": ___gxx_personality_v0, "___cxa_call_unexpected": ___cxa_call_unexpected, "_mkport": _mkport, "_sbrk": _sbrk, "_exp": _exp, "_time": _time, "__exit": __exit, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8, "ctlz_i8": ctlz_i8, "___rand_seed": ___rand_seed, "NaN": NaN, "Infinity": Infinity, "__ZTVN10__cxxabiv120__si_class_type_infoE": __ZTVN10__cxxabiv120__si_class_type_infoE, "__ZTVN10__cxxabiv117__class_type_infoE": __ZTVN10__cxxabiv117__class_type_infoE }, buffer);
var _strlen = Module["_strlen"] = asm["_strlen"];
var _strcat = Module["_strcat"] = asm["_strcat"];
var _free = Module["_free"] = asm["_free"];
var _rand_r = Module["_rand_r"] = asm["_rand_r"];
var _lexy_write_test = Module["_lexy_write_test"] = asm["_lexy_write_test"];
var _lexy_get_buffer = Module["_lexy_get_buffer"] = asm["_lexy_get_buffer"];
var _lexy_test = Module["_lexy_test"] = asm["_lexy_test"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var _lexy_encoder_finish = Module["_lexy_encoder_finish"] = asm["_lexy_encoder_finish"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _lexy_encoder_start = Module["_lexy_encoder_start"] = asm["_lexy_encoder_start"];
var _lexy_encoder_write = Module["_lexy_encoder_write"] = asm["_lexy_encoder_write"];
var _lexy_get_buffer_length = Module["_lexy_get_buffer_length"] = asm["_lexy_get_buffer_length"];
var _strcpy = Module["_strcpy"] = asm["_strcpy"];
var _calloc = Module["_calloc"] = asm["_calloc"];
var _rand = Module["_rand"] = asm["_rand"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = asm["dynCall_iiiiiiiii"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_iiiiii = Module["dynCall_iiiiii"] = asm["dynCall_iiiiii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];

Runtime.stackAlloc = function(size) { return asm['stackAlloc'](size) };
Runtime.stackSave = function() { return asm['stackSave']() };
Runtime.stackRestore = function(top) { asm['stackRestore'](top) };

// TODO: strip out parts of this we do not need

//======= begin closure i64 code =======

// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 *
 */

var i64Math = (function() { // Emscripten wrapper
  var goog = { math: {} };


  /**
   * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
   * values as *signed* integers.  See the from* functions below for more
   * convenient ways of constructing Longs.
   *
   * The internal representation of a long is the two given signed, 32-bit values.
   * We use 32-bit pieces because these are the size of integers on which
   * Javascript performs bit-operations.  For operations like addition and
   * multiplication, we split each number into 16-bit pieces, which can easily be
   * multiplied within Javascript's floating-point representation without overflow
   * or change in sign.
   *
   * In the algorithms below, we frequently reduce the negative case to the
   * positive case by negating the input(s) and then post-processing the result.
   * Note that we must ALWAYS check specially whether those values are MIN_VALUE
   * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
   * a positive number, it overflows back into a negative).  Not handling this
   * case would often result in infinite recursion.
   *
   * @param {number} low  The low (signed) 32 bits of the long.
   * @param {number} high  The high (signed) 32 bits of the long.
   * @constructor
   */
  goog.math.Long = function(low, high) {
    /**
     * @type {number}
     * @private
     */
    this.low_ = low | 0;  // force into 32 signed bits.

    /**
     * @type {number}
     * @private
     */
    this.high_ = high | 0;  // force into 32 signed bits.
  };


  // NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
  // from* methods on which they depend.


  /**
   * A cache of the Long representations of small integer values.
   * @type {!Object}
   * @private
   */
  goog.math.Long.IntCache_ = {};


  /**
   * Returns a Long representing the given (32-bit) integer value.
   * @param {number} value The 32-bit integer in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromInt = function(value) {
    if (-128 <= value && value < 128) {
      var cachedObj = goog.math.Long.IntCache_[value];
      if (cachedObj) {
        return cachedObj;
      }
    }

    var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
    if (-128 <= value && value < 128) {
      goog.math.Long.IntCache_[value] = obj;
    }
    return obj;
  };


  /**
   * Returns a Long representing the given value, provided that it is a finite
   * number.  Otherwise, zero is returned.
   * @param {number} value The number in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) {
      return goog.math.Long.ZERO;
    } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MIN_VALUE;
    } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MAX_VALUE;
    } else if (value < 0) {
      return goog.math.Long.fromNumber(-value).negate();
    } else {
      return new goog.math.Long(
          (value % goog.math.Long.TWO_PWR_32_DBL_) | 0,
          (value / goog.math.Long.TWO_PWR_32_DBL_) | 0);
    }
  };


  /**
   * Returns a Long representing the 64-bit integer that comes by concatenating
   * the given high and low bits.  Each is assumed to use 32 bits.
   * @param {number} lowBits The low 32-bits.
   * @param {number} highBits The high 32-bits.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
  };


  /**
   * Returns a Long representation of the given string, written using the given
   * radix.
   * @param {string} str The textual representation of the Long.
   * @param {number=} opt_radix The radix in which the text is written.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromString = function(str, opt_radix) {
    if (str.length == 0) {
      throw Error('number format error: empty string');
    }

    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (str.charAt(0) == '-') {
      return goog.math.Long.fromString(str.substring(1), radix).negate();
    } else if (str.indexOf('-') >= 0) {
      throw Error('number format error: interior "-" character: ' + str);
    }

    // Do several (8) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));

    var result = goog.math.Long.ZERO;
    for (var i = 0; i < str.length; i += 8) {
      var size = Math.min(8, str.length - i);
      var value = parseInt(str.substring(i, i + size), radix);
      if (size < 8) {
        var power = goog.math.Long.fromNumber(Math.pow(radix, size));
        result = result.multiply(power).add(goog.math.Long.fromNumber(value));
      } else {
        result = result.multiply(radixToPower);
        result = result.add(goog.math.Long.fromNumber(value));
      }
    }
    return result;
  };


  // NOTE: the compiler should inline these constant values below and then remove
  // these variables, so there should be no runtime penalty for these.


  /**
   * Number used repeated below in calculations.  This must appear before the
   * first call to any from* function below.
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_32_DBL_ =
      goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_31_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ / 2;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_48_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_64_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_63_DBL_ =
      goog.math.Long.TWO_PWR_64_DBL_ / 2;


  /** @type {!goog.math.Long} */
  goog.math.Long.ZERO = goog.math.Long.fromInt(0);


  /** @type {!goog.math.Long} */
  goog.math.Long.ONE = goog.math.Long.fromInt(1);


  /** @type {!goog.math.Long} */
  goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);


  /** @type {!goog.math.Long} */
  goog.math.Long.MAX_VALUE =
      goog.math.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);


  /** @type {!goog.math.Long} */
  goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 0x80000000 | 0);


  /**
   * @type {!goog.math.Long}
   * @private
   */
  goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);


  /** @return {number} The value, assuming it is a 32-bit integer. */
  goog.math.Long.prototype.toInt = function() {
    return this.low_;
  };


  /** @return {number} The closest floating-point representation to this value. */
  goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ +
           this.getLowBitsUnsigned();
  };


  /**
   * @param {number=} opt_radix The radix in which the text should be written.
   * @return {string} The textual representation of this value.
   */
  goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (this.isZero()) {
      return '0';
    }

    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        // We need to change the Long value before it can be negated, so we remove
        // the bottom-most digit in this base and then recurse to do the rest.
        var radixLong = goog.math.Long.fromNumber(radix);
        var div = this.div(radixLong);
        var rem = div.multiply(radixLong).subtract(this);
        return div.toString(radix) + rem.toInt().toString(radix);
      } else {
        return '-' + this.negate().toString(radix);
      }
    }

    // Do several (6) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));

    var rem = this;
    var result = '';
    while (true) {
      var remDiv = rem.div(radixToPower);
      var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
      var digits = intval.toString(radix);

      rem = remDiv;
      if (rem.isZero()) {
        return digits + result;
      } else {
        while (digits.length < 6) {
          digits = '0' + digits;
        }
        result = '' + digits + result;
      }
    }
  };


  /** @return {number} The high 32-bits as a signed value. */
  goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
  };


  /** @return {number} The low 32-bits as a signed value. */
  goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
  };


  /** @return {number} The low 32-bits as an unsigned value. */
  goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return (this.low_ >= 0) ?
        this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
  };


  /**
   * @return {number} Returns the number of bits needed to represent the absolute
   *     value of this Long.
   */
  goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        return 64;
      } else {
        return this.negate().getNumBitsAbs();
      }
    } else {
      var val = this.high_ != 0 ? this.high_ : this.low_;
      for (var bit = 31; bit > 0; bit--) {
        if ((val & (1 << bit)) != 0) {
          break;
        }
      }
      return this.high_ != 0 ? bit + 33 : bit + 1;
    }
  };


  /** @return {boolean} Whether this value is zero. */
  goog.math.Long.prototype.isZero = function() {
    return this.high_ == 0 && this.low_ == 0;
  };


  /** @return {boolean} Whether this value is negative. */
  goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
  };


  /** @return {boolean} Whether this value is odd. */
  goog.math.Long.prototype.isOdd = function() {
    return (this.low_ & 1) == 1;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long equals the other.
   */
  goog.math.Long.prototype.equals = function(other) {
    return (this.high_ == other.high_) && (this.low_ == other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long does not equal the other.
   */
  goog.math.Long.prototype.notEquals = function(other) {
    return (this.high_ != other.high_) || (this.low_ != other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than the other.
   */
  goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than or equal to the other.
   */
  goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than the other.
   */
  goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than or equal to the other.
   */
  goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
  };


  /**
   * Compares this Long with the given one.
   * @param {goog.math.Long} other Long to compare against.
   * @return {number} 0 if they are the same, 1 if the this is greater, and -1
   *     if the given one is greater.
   */
  goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) {
      return 0;
    }

    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) {
      return -1;
    }
    if (!thisNeg && otherNeg) {
      return 1;
    }

    // at this point, the signs are the same, so subtraction will not overflow
    if (this.subtract(other).isNegative()) {
      return -1;
    } else {
      return 1;
    }
  };


  /** @return {!goog.math.Long} The negation of this value. */
  goog.math.Long.prototype.negate = function() {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.MIN_VALUE;
    } else {
      return this.not().add(goog.math.Long.ONE);
    }
  };


  /**
   * Returns the sum of this and the given Long.
   * @param {goog.math.Long} other Long to add to this one.
   * @return {!goog.math.Long} The sum of this and the given Long.
   */
  goog.math.Long.prototype.add = function(other) {
    // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns the difference of this and the given Long.
   * @param {goog.math.Long} other Long to subtract from this.
   * @return {!goog.math.Long} The difference of this and the given Long.
   */
  goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
  };


  /**
   * Returns the product of this and the given long.
   * @param {goog.math.Long} other Long to multiply with this.
   * @return {!goog.math.Long} The product of this and the other.
   */
  goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) {
      return goog.math.Long.ZERO;
    } else if (other.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().multiply(other.negate());
      } else {
        return this.negate().multiply(other).negate();
      }
    } else if (other.isNegative()) {
      return this.multiply(other.negate()).negate();
    }

    // If both longs are small, use float multiplication
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) &&
        other.lessThan(goog.math.Long.TWO_PWR_24_)) {
      return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    }

    // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
    // We can skip products that would overflow.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns this Long divided by the given one.
   * @param {goog.math.Long} other Long by which to divide.
   * @return {!goog.math.Long} This Long divided by the given one.
   */
  goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) {
      throw Error('division by zero');
    } else if (this.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      if (other.equals(goog.math.Long.ONE) ||
          other.equals(goog.math.Long.NEG_ONE)) {
        return goog.math.Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
      } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ONE;
      } else {
        // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
        var halfThis = this.shiftRight(1);
        var approx = halfThis.div(other).shiftLeft(1);
        if (approx.equals(goog.math.Long.ZERO)) {
          return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
        } else {
          var rem = this.subtract(other.multiply(approx));
          var result = approx.add(rem.div(other));
          return result;
        }
      }
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().div(other.negate());
      } else {
        return this.negate().div(other).negate();
      }
    } else if (other.isNegative()) {
      return this.div(other.negate()).negate();
    }

    // Repeat the following until the remainder is less than other:  find a
    // floating-point that approximates remainder / other *from below*, add this
    // into the result, and subtract it from the remainder.  It is critical that
    // the approximate value is less than or equal to the real value so that the
    // remainder never becomes negative.
    var res = goog.math.Long.ZERO;
    var rem = this;
    while (rem.greaterThanOrEqual(other)) {
      // Approximate the result of division. This may be a little greater or
      // smaller than the actual value.
      var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

      // We will tweak the approximate result by changing it in the 48-th digit or
      // the smallest non-fractional digit, whichever is larger.
      var log2 = Math.ceil(Math.log(approx) / Math.LN2);
      var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

      // Decrease the approximation until it is smaller than the remainder.  Note
      // that if it is too large, the product overflows and is negative.
      var approxRes = goog.math.Long.fromNumber(approx);
      var approxRem = approxRes.multiply(other);
      while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
        approx -= delta;
        approxRes = goog.math.Long.fromNumber(approx);
        approxRem = approxRes.multiply(other);
      }

      // We know the answer can't be zero... and actually, zero would cause
      // infinite recursion since we would make no progress.
      if (approxRes.isZero()) {
        approxRes = goog.math.Long.ONE;
      }

      res = res.add(approxRes);
      rem = rem.subtract(approxRem);
    }
    return res;
  };


  /**
   * Returns this Long modulo the given one.
   * @param {goog.math.Long} other Long by which to mod.
   * @return {!goog.math.Long} This Long modulo the given one.
   */
  goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
  };


  /** @return {!goog.math.Long} The bitwise-NOT of this value. */
  goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
  };


  /**
   * Returns the bitwise-AND of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to AND.
   * @return {!goog.math.Long} The bitwise-AND of this and the other.
   */
  goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_,
                                   this.high_ & other.high_);
  };


  /**
   * Returns the bitwise-OR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to OR.
   * @return {!goog.math.Long} The bitwise-OR of this and the other.
   */
  goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_,
                                   this.high_ | other.high_);
  };


  /**
   * Returns the bitwise-XOR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to XOR.
   * @return {!goog.math.Long} The bitwise-XOR of this and the other.
   */
  goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_,
                                   this.high_ ^ other.high_);
  };


  /**
   * Returns this Long with bits shifted to the left by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the left by the given amount.
   */
  goog.math.Long.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var low = this.low_;
      if (numBits < 32) {
        var high = this.high_;
        return goog.math.Long.fromBits(
            low << numBits,
            (high << numBits) | (low >>> (32 - numBits)));
      } else {
        return goog.math.Long.fromBits(0, low << (numBits - 32));
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount.
   */
  goog.math.Long.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >> numBits);
      } else {
        return goog.math.Long.fromBits(
            high >> (numBits - 32),
            high >= 0 ? 0 : -1);
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount, with
   * the new top bits matching the current sign bit.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount, with
   *     zeros placed into the new leading bits.
   */
  goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >>> numBits);
      } else if (numBits == 32) {
        return goog.math.Long.fromBits(high, 0);
      } else {
        return goog.math.Long.fromBits(high >>> (numBits - 32), 0);
      }
    }
  };

  //======= begin jsbn =======

  var navigator = { appName: 'Modern Browser' }; // polyfill a little

  // Copyright (c) 2005  Tom Wu
  // All Rights Reserved.
  // http://www-cs-students.stanford.edu/~tjw/jsbn/

  /*
   * Copyright (c) 2003-2005  Tom Wu
   * All Rights Reserved.
   *
   * Permission is hereby granted, free of charge, to any person obtaining
   * a copy of this software and associated documentation files (the
   * "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish,
   * distribute, sublicense, and/or sell copies of the Software, and to
   * permit persons to whom the Software is furnished to do so, subject to
   * the following conditions:
   *
   * The above copyright notice and this permission notice shall be
   * included in all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
   * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
   * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
   *
   * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
   * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
   * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
   * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
   * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * In addition, the following condition applies:
   *
   * All redistributions must retain an intact copy of this copyright notice
   * and disclaimer.
   */

  // Basic JavaScript BN library - subset useful for RSA encryption.

  // Bits per digit
  var dbits;

  // JavaScript engine analysis
  var canary = 0xdeadbeefcafe;
  var j_lm = ((canary&0xffffff)==0xefcafe);

  // (public) Constructor
  function BigInteger(a,b,c) {
    if(a != null)
      if("number" == typeof a) this.fromNumber(a,b,c);
      else if(b == null && "string" != typeof a) this.fromString(a,256);
      else this.fromString(a,b);
  }

  // return new, unset BigInteger
  function nbi() { return new BigInteger(null); }

  // am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
  // We need to select the fastest one that works in this environment.

  // am1: use a single mult and divide to get the high bits,
  // max digit bits should be 26 because
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
  function am1(i,x,w,j,c,n) {
    while(--n >= 0) {
      var v = x*this[i++]+w[j]+c;
      c = Math.floor(v/0x4000000);
      w[j++] = v&0x3ffffff;
    }
    return c;
  }
  // am2 avoids a big mult-and-extract completely.
  // Max digit bits should be <= 30 because we do bitwise ops
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
  function am2(i,x,w,j,c,n) {
    var xl = x&0x7fff, xh = x>>15;
    while(--n >= 0) {
      var l = this[i]&0x7fff;
      var h = this[i++]>>15;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
      c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
      w[j++] = l&0x3fffffff;
    }
    return c;
  }
  // Alternately, set max digit bits to 28 since some
  // browsers slow down when dealing with 32-bit numbers.
  function am3(i,x,w,j,c,n) {
    var xl = x&0x3fff, xh = x>>14;
    while(--n >= 0) {
      var l = this[i]&0x3fff;
      var h = this[i++]>>14;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x3fff)<<14)+w[j]+c;
      c = (l>>28)+(m>>14)+xh*h;
      w[j++] = l&0xfffffff;
    }
    return c;
  }
  if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30;
  }
  else if(j_lm && (navigator.appName != "Netscape")) {
    BigInteger.prototype.am = am1;
    dbits = 26;
  }
  else { // Mozilla/Netscape seems to prefer am3
    BigInteger.prototype.am = am3;
    dbits = 28;
  }

  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = ((1<<dbits)-1);
  BigInteger.prototype.DV = (1<<dbits);

  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2,BI_FP);
  BigInteger.prototype.F1 = BI_FP-dbits;
  BigInteger.prototype.F2 = 2*dbits-BI_FP;

  // Digit conversions
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr,vv;
  rr = "0".charCodeAt(0);
  for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = "a".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = "A".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

  function int2char(n) { return BI_RM.charAt(n); }
  function intAt(s,i) {
    var c = BI_RC[s.charCodeAt(i)];
    return (c==null)?-1:c;
  }

  // (protected) copy this to r
  function bnpCopyTo(r) {
    for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
    r.t = this.t;
    r.s = this.s;
  }

  // (protected) set from integer value x, -DV <= x < DV
  function bnpFromInt(x) {
    this.t = 1;
    this.s = (x<0)?-1:0;
    if(x > 0) this[0] = x;
    else if(x < -1) this[0] = x+DV;
    else this.t = 0;
  }

  // return bigint initialized to value
  function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

  // (protected) set from string and radix
  function bnpFromString(s,b) {
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 256) k = 8; // byte array
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else { this.fromRadix(s,b); return; }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while(--i >= 0) {
      var x = (k==8)?s[i]&0xff:intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if(sh == 0)
        this[this.t++] = x;
      else if(sh+k > this.DB) {
        this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
        this[this.t++] = (x>>(this.DB-sh));
      }
      else
        this[this.t-1] |= x<<sh;
      sh += k;
      if(sh >= this.DB) sh -= this.DB;
    }
    if(k == 8 && (s[0]&0x80) != 0) {
      this.s = -1;
      if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
    }
    this.clamp();
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) clamp off excess high words
  function bnpClamp() {
    var c = this.s&this.DM;
    while(this.t > 0 && this[this.t-1] == c) --this.t;
  }

  // (public) return string representation in given radix
  function bnToString(b) {
    if(this.s < 0) return "-"+this.negate().toString(b);
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1<<k)-1, d, m = false, r = "", i = this.t;
    var p = this.DB-(i*this.DB)%k;
    if(i-- > 0) {
      if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
      while(i >= 0) {
        if(p < k) {
          d = (this[i]&((1<<p)-1))<<(k-p);
          d |= this[--i]>>(p+=this.DB-k);
        }
        else {
          d = (this[i]>>(p-=k))&km;
          if(p <= 0) { p += this.DB; --i; }
        }
        if(d > 0) m = true;
        if(m) r += int2char(d);
      }
    }
    return m?r:"0";
  }

  // (public) -this
  function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

  // (public) |this|
  function bnAbs() { return (this.s<0)?this.negate():this; }

  // (public) return + if this > a, - if this < a, 0 if equal
  function bnCompareTo(a) {
    var r = this.s-a.s;
    if(r != 0) return r;
    var i = this.t;
    r = i-a.t;
    if(r != 0) return (this.s<0)?-r:r;
    while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
    return 0;
  }

  // returns bit length of the integer x
  function nbits(x) {
    var r = 1, t;
    if((t=x>>>16) != 0) { x = t; r += 16; }
    if((t=x>>8) != 0) { x = t; r += 8; }
    if((t=x>>4) != 0) { x = t; r += 4; }
    if((t=x>>2) != 0) { x = t; r += 2; }
    if((t=x>>1) != 0) { x = t; r += 1; }
    return r;
  }

  // (public) return the number of bits in "this"
  function bnBitLength() {
    if(this.t <= 0) return 0;
    return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
  }

  // (protected) r = this << n*DB
  function bnpDLShiftTo(n,r) {
    var i;
    for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
    for(i = n-1; i >= 0; --i) r[i] = 0;
    r.t = this.t+n;
    r.s = this.s;
  }

  // (protected) r = this >> n*DB
  function bnpDRShiftTo(n,r) {
    for(var i = n; i < this.t; ++i) r[i-n] = this[i];
    r.t = Math.max(this.t-n,0);
    r.s = this.s;
  }

  // (protected) r = this << n
  function bnpLShiftTo(n,r) {
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<cbs)-1;
    var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
    for(i = this.t-1; i >= 0; --i) {
      r[i+ds+1] = (this[i]>>cbs)|c;
      c = (this[i]&bm)<<bs;
    }
    for(i = ds-1; i >= 0; --i) r[i] = 0;
    r[ds] = c;
    r.t = this.t+ds+1;
    r.s = this.s;
    r.clamp();
  }

  // (protected) r = this >> n
  function bnpRShiftTo(n,r) {
    r.s = this.s;
    var ds = Math.floor(n/this.DB);
    if(ds >= this.t) { r.t = 0; return; }
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<bs)-1;
    r[0] = this[ds]>>bs;
    for(var i = ds+1; i < this.t; ++i) {
      r[i-ds-1] |= (this[i]&bm)<<cbs;
      r[i-ds] = this[i]>>bs;
    }
    if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
    r.t = this.t-ds;
    r.clamp();
  }

  // (protected) r = this - a
  function bnpSubTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]-a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c -= a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c -= a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c -= a.s;
    }
    r.s = (c<0)?-1:0;
    if(c < -1) r[i++] = this.DV+c;
    else if(c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
  }

  // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.
  function bnpMultiplyTo(a,r) {
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i+y.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
    r.s = 0;
    r.clamp();
    if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
  }

  // (protected) r = this^2, r != this (HAC 14.16)
  function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2*x.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < x.t-1; ++i) {
      var c = x.am(i,x[i],r,2*i,0,1);
      if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
        r[i+x.t] -= x.DV;
        r[i+x.t+1] = 1;
      }
    }
    if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
    r.s = 0;
    r.clamp();
  }

  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.
  function bnpDivRemTo(m,q,r) {
    var pm = m.abs();
    if(pm.t <= 0) return;
    var pt = this.abs();
    if(pt.t < pm.t) {
      if(q != null) q.fromInt(0);
      if(r != null) this.copyTo(r);
      return;
    }
    if(r == null) r = nbi();
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
    if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
    else { pm.copyTo(y); pt.copyTo(r); }
    var ys = y.t;
    var y0 = y[ys-1];
    if(y0 == 0) return;
    var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
    var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
    var i = r.t, j = i-ys, t = (q==null)?nbi():q;
    y.dlShiftTo(j,t);
    if(r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t,r);
    }
    BigInteger.ONE.dlShiftTo(ys,t);
    t.subTo(y,y);	// "negative" y so we can replace sub with am later
    while(y.t < ys) y[y.t++] = 0;
    while(--j >= 0) {
      // Estimate quotient digit
      var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
      if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
        y.dlShiftTo(j,t);
        r.subTo(t,r);
        while(r[i] < --qd) r.subTo(t,r);
      }
    }
    if(q != null) {
      r.drShiftTo(ys,q);
      if(ts != ms) BigInteger.ZERO.subTo(q,q);
    }
    r.t = ys;
    r.clamp();
    if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
    if(ts < 0) BigInteger.ZERO.subTo(r,r);
  }

  // (public) this mod a
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a,null,r);
    if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
    return r;
  }

  // Modular reduction using "classic" algorithm
  function Classic(m) { this.m = m; }
  function cConvert(x) {
    if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) { return x; }
  function cReduce(x) { x.divRemTo(this.m,null,x); }
  function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
  function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;

  // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  // justification:
  //         xy == 1 (mod m)
  //         xy =  1+km
  //   xy(2-xy) = (1+km)(1-km)
  // x[y(2-xy)] = 1-k^2m^2
  // x[y(2-xy)] == 1 (mod m^2)
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
  // JS multiply "overflows" differently from C/C++, so care is needed here.
  function bnpInvDigit() {
    if(this.t < 1) return 0;
    var x = this[0];
    if((x&1) == 0) return 0;
    var y = x&3;		// y == 1/x mod 2^2
    y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
    y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
    y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
    y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV
    return (y>0)?this.DV-y:-y;
  }

  // Montgomery reduction
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp&0x7fff;
    this.mph = this.mp>>15;
    this.um = (1<<(m.DB-15))-1;
    this.mt2 = 2*m.t;
  }

  // xR mod m
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t,r);
    r.divRemTo(this.m,null,r);
    if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
    return r;
  }

  // x/R mod m
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }

  // x = x/R mod m (HAC 14.32)
  function montReduce(x) {
    while(x.t <= this.mt2)	// pad x so am has enough room later
      x[x.t++] = 0;
    for(var i = 0; i < this.m.t; ++i) {
      // faster way of calculating u0 = x[i]*mp mod DV
      var j = x[i]&0x7fff;
      var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
      // use am to combine the multiply-shift-add into one call
      j = i+this.m.t;
      x[j] += this.m.am(0,u0,x,i,0,this.m.t);
      // propagate carry
      while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
    }
    x.clamp();
    x.drShiftTo(this.m.t,x);
    if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
  }

  // r = "x^2/R mod m"; x != r
  function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  // r = "xy/R mod m"; x,y != r
  function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;

  // (protected) true iff this is even
  function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

  // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
  function bnpExp(e,z) {
    if(e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
    g.copyTo(r);
    while(--i >= 0) {
      z.sqrTo(r,r2);
      if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
      else { var t = r; r = r2; r2 = t; }
    }
    return z.revert(r);
  }

  // (public) this^e % m, 0 <= e < 2^32
  function bnModPowInt(e,m) {
    var z;
    if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
    return this.exp(e,z);
  }

  // protected
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;

  // public
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;

  // "constants"
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);

  // jsbn2 stuff

  // (protected) convert from radix string
  function bnpFromRadix(s,b) {
    this.fromInt(0);
    if(b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
    for(var i = 0; i < s.length; ++i) {
      var x = intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w = b*w+x;
      if(++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w,0);
        j = 0;
        w = 0;
      }
    }
    if(j > 0) {
      this.dMultiply(Math.pow(b,j));
      this.dAddOffset(w,0);
    }
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) return x s.t. r^x < DV
  function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

  // (public) 0 if this == 0, 1 if this > 0
  function bnSigNum() {
    if(this.s < 0) return -1;
    else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
    else return 1;
  }

  // (protected) this *= n, this >= 0, 1 < n < DV
  function bnpDMultiply(n) {
    this[this.t] = this.am(0,n-1,this,0,0,this.t);
    ++this.t;
    this.clamp();
  }

  // (protected) this += n << w words, this >= 0
  function bnpDAddOffset(n,w) {
    if(n == 0) return;
    while(this.t <= w) this[this.t++] = 0;
    this[w] += n;
    while(this[w] >= this.DV) {
      this[w] -= this.DV;
      if(++w >= this.t) this[this.t++] = 0;
      ++this[w];
    }
  }

  // (protected) convert to radix string
  function bnpToRadix(b) {
    if(b == null) b = 10;
    if(this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b,cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d,y,z);
    while(y.signum() > 0) {
      r = (a+z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d,y,z);
    }
    return z.intValue().toString(b) + r;
  }

  // (public) return value as integer
  function bnIntValue() {
    if(this.s < 0) {
      if(this.t == 1) return this[0]-this.DV;
      else if(this.t == 0) return -1;
    }
    else if(this.t == 1) return this[0];
    else if(this.t == 0) return 0;
    // assumes 16 < DB < 32
    return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
  }

  // (protected) r = this + a
  function bnpAddTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]+a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c += a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c += a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += a.s;
    }
    r.s = (c<0)?-1:0;
    if(c > 0) r[i++] = c;
    else if(c < -1) r[i++] = this.DV+c;
    r.t = i;
    r.clamp();
  }

  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.addTo = bnpAddTo;

  //======= end jsbn =======

  // Emscripten wrapper
  var Wrapper = {
    abs: function(l, h) {
      var x = new goog.math.Long(l, h);
      var ret;
      if (x.isNegative()) {
        ret = x.negate();
      } else {
        ret = x;
      }
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
    },
    ensureTemps: function() {
      if (Wrapper.ensuredTemps) return;
      Wrapper.ensuredTemps = true;
      Wrapper.two32 = new BigInteger();
      Wrapper.two32.fromString('4294967296', 10);
      Wrapper.two64 = new BigInteger();
      Wrapper.two64.fromString('18446744073709551616', 10);
      Wrapper.temp1 = new BigInteger();
      Wrapper.temp2 = new BigInteger();
    },
    lh2bignum: function(l, h) {
      var a = new BigInteger();
      a.fromString(h.toString(), 10);
      var b = new BigInteger();
      a.multiplyTo(Wrapper.two32, b);
      var c = new BigInteger();
      c.fromString(l.toString(), 10);
      var d = new BigInteger();
      c.addTo(b, d);
      return d;
    },
    stringify: function(l, h, unsigned) {
      var ret = new goog.math.Long(l, h).toString();
      if (unsigned && ret[0] == '-') {
        // unsign slowly using jsbn bignums
        Wrapper.ensureTemps();
        var bignum = new BigInteger();
        bignum.fromString(ret, 10);
        ret = new BigInteger();
        Wrapper.two64.addTo(bignum, ret);
        ret = ret.toString(10);
      }
      return ret;
    },
    fromString: function(str, base, min, max, unsigned) {
      Wrapper.ensureTemps();
      var bignum = new BigInteger();
      bignum.fromString(str, base);
      var bigmin = new BigInteger();
      bigmin.fromString(min, 10);
      var bigmax = new BigInteger();
      bigmax.fromString(max, 10);
      if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
        var temp = new BigInteger();
        bignum.addTo(Wrapper.two64, temp);
        bignum = temp;
      }
      var error = false;
      if (bignum.compareTo(bigmin) < 0) {
        bignum = bigmin;
        error = true;
      } else if (bignum.compareTo(bigmax) > 0) {
        bignum = bigmax;
        error = true;
      }
      var ret = goog.math.Long.fromString(bignum.toString()); // min-max checks should have clamped this to a range goog.math.Long can handle well
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
      if (error) throw 'range error';
    }
  };
  return Wrapper;
})();

//======= end closure i64 code =======



// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  function applyData(data) {
    HEAPU8.set(data, STATIC_BASE);
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    applyData(Module['readBinary'](memoryInitializer));
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      applyData(data);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
    Module.printErr('preload time: ' + (Date.now() - preloadStartTime) + ' ms');
  }

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    if (!Module['noExitRuntime']) {
      exit(ret);
    }
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    ensureInitRuntime();

    preMain();

    if (Module['_main'] && shouldRunNow) {
      Module['callMain'](args);
    }

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      if (!ABORT) doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  // TODO We should handle this differently based on environment.
  // In the browser, the best we can do is throw an exception
  // to halt execution, but in node we could process.exit and
  // I'd imagine SM shell would have something equivalent.
  // This would let us set a proper exit status (which
  // would be great for checking test exit statuses).
  // https://github.com/kripken/emscripten/issues/1371

  // throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }

  ABORT = true;
  EXITSTATUS = 1;

  throw 'abort() at ' + stackTrace();
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}






