"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../node_modules/universalify/index.js
var require_universalify = __commonJS({
  "../node_modules/universalify/index.js"(exports2) {
    "use strict";
    exports2.fromCallback = function(fn) {
      return Object.defineProperty(function(...args) {
        if (typeof args[args.length - 1] === "function") fn.apply(this, args);
        else {
          return new Promise((resolve2, reject) => {
            args.push((err, res) => err != null ? reject(err) : resolve2(res));
            fn.apply(this, args);
          });
        }
      }, "name", { value: fn.name });
    };
    exports2.fromPromise = function(fn) {
      return Object.defineProperty(function(...args) {
        const cb = args[args.length - 1];
        if (typeof cb !== "function") return fn.apply(this, args);
        else {
          args.pop();
          fn.apply(this, args).then((r) => cb(null, r), cb);
        }
      }, "name", { value: fn.name });
    };
  }
});

// ../node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "../node_modules/graceful-fs/polyfills.js"(exports2, module2) {
    "use strict";
    var constants = require("constants");
    var origCwd = process.cwd;
    var cwd = null;
    var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      if (!cwd)
        cwd = origCwd.call(process);
      return cwd;
    };
    try {
      process.cwd();
    } catch (er) {
    }
    if (typeof process.chdir === "function") {
      chdir = process.chdir;
      process.chdir = function(d) {
        cwd = null;
        chdir.call(process, d);
      };
      if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
    }
    var chdir;
    module2.exports = patch;
    function patch(fs3) {
      if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs3);
      }
      if (!fs3.lutimes) {
        patchLutimes(fs3);
      }
      fs3.chown = chownFix(fs3.chown);
      fs3.fchown = chownFix(fs3.fchown);
      fs3.lchown = chownFix(fs3.lchown);
      fs3.chmod = chmodFix(fs3.chmod);
      fs3.fchmod = chmodFix(fs3.fchmod);
      fs3.lchmod = chmodFix(fs3.lchmod);
      fs3.chownSync = chownFixSync(fs3.chownSync);
      fs3.fchownSync = chownFixSync(fs3.fchownSync);
      fs3.lchownSync = chownFixSync(fs3.lchownSync);
      fs3.chmodSync = chmodFixSync(fs3.chmodSync);
      fs3.fchmodSync = chmodFixSync(fs3.fchmodSync);
      fs3.lchmodSync = chmodFixSync(fs3.lchmodSync);
      fs3.stat = statFix(fs3.stat);
      fs3.fstat = statFix(fs3.fstat);
      fs3.lstat = statFix(fs3.lstat);
      fs3.statSync = statFixSync(fs3.statSync);
      fs3.fstatSync = statFixSync(fs3.fstatSync);
      fs3.lstatSync = statFixSync(fs3.lstatSync);
      if (fs3.chmod && !fs3.lchmod) {
        fs3.lchmod = function(path3, mode, cb) {
          if (cb) process.nextTick(cb);
        };
        fs3.lchmodSync = function() {
        };
      }
      if (fs3.chown && !fs3.lchown) {
        fs3.lchown = function(path3, uid, gid, cb) {
          if (cb) process.nextTick(cb);
        };
        fs3.lchownSync = function() {
        };
      }
      if (platform === "win32") {
        fs3.rename = typeof fs3.rename !== "function" ? fs3.rename : (function(fs$rename) {
          function rename(from, to, cb) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs3.stat(to, function(stater, st) {
                    if (stater && stater.code === "ENOENT")
                      fs$rename(from, to, CB);
                    else
                      cb(er);
                  });
                }, backoff);
                if (backoff < 100)
                  backoff += 10;
                return;
              }
              if (cb) cb(er);
            });
          }
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
          return rename;
        })(fs3.rename);
      }
      fs3.read = typeof fs3.read !== "function" ? fs3.read : (function(fs$read) {
        function read(fd, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs3, fd, buffer, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs3, fd, buffer, offset, length, position, callback);
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
        return read;
      })(fs3.read);
      fs3.readSync = typeof fs3.readSync !== "function" ? fs3.readSync : /* @__PURE__ */ (function(fs$readSync) {
        return function(fd, buffer, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs3, fd, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      })(fs3.readSync);
      function patchLchmod(fs4) {
        fs4.lchmod = function(path3, mode, callback) {
          fs4.open(
            path3,
            constants.O_WRONLY | constants.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                if (callback) callback(err);
                return;
              }
              fs4.fchmod(fd, mode, function(err2) {
                fs4.close(fd, function(err22) {
                  if (callback) callback(err2 || err22);
                });
              });
            }
          );
        };
        fs4.lchmodSync = function(path3, mode) {
          var fd = fs4.openSync(path3, constants.O_WRONLY | constants.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs4.fchmodSync(fd, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs4.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs4.closeSync(fd);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs4) {
        if (constants.hasOwnProperty("O_SYMLINK") && fs4.futimes) {
          fs4.lutimes = function(path3, at, mt, cb) {
            fs4.open(path3, constants.O_SYMLINK, function(er, fd) {
              if (er) {
                if (cb) cb(er);
                return;
              }
              fs4.futimes(fd, at, mt, function(er2) {
                fs4.close(fd, function(er22) {
                  if (cb) cb(er2 || er22);
                });
              });
            });
          };
          fs4.lutimesSync = function(path3, at, mt) {
            var fd = fs4.openSync(path3, constants.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs4.futimesSync(fd, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs4.closeSync(fd);
                } catch (er) {
                }
              } else {
                fs4.closeSync(fd);
              }
            }
            return ret;
          };
        } else if (fs4.futimes) {
          fs4.lutimes = function(_a, _b, _c, cb) {
            if (cb) process.nextTick(cb);
          };
          fs4.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig) return orig;
        return function(target, mode, cb) {
          return orig.call(fs3, target, mode, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig) return orig;
        return function(target, mode) {
          try {
            return orig.call(fs3, target, mode);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig) return orig;
        return function(target, uid, gid, cb) {
          return orig.call(fs3, target, uid, gid, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig) return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs3, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function statFix(orig) {
        if (!orig) return orig;
        return function(target, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = null;
          }
          function callback(er, stats) {
            if (stats) {
              if (stats.uid < 0) stats.uid += 4294967296;
              if (stats.gid < 0) stats.gid += 4294967296;
            }
            if (cb) cb.apply(this, arguments);
          }
          return options ? orig.call(fs3, target, options, callback) : orig.call(fs3, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig) return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs3, target, options) : orig.call(fs3, target);
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          return stats;
        };
      }
      function chownErOk(er) {
        if (!er)
          return true;
        if (er.code === "ENOSYS")
          return true;
        var nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (er.code === "EINVAL" || er.code === "EPERM")
            return true;
        }
        return false;
      }
    }
  }
});

// ../node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "../node_modules/graceful-fs/legacy-streams.js"(exports2, module2) {
    "use strict";
    var Stream = require("stream").Stream;
    module2.exports = legacy;
    function legacy(fs3) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path3, options) {
        if (!(this instanceof ReadStream)) return new ReadStream(path3, options);
        Stream.call(this);
        var self = this;
        this.path = path3;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = "r";
        this.mode = 438;
        this.bufferSize = 64 * 1024;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding) this.setEncoding(this.encoding);
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.end === void 0) {
            this.end = Infinity;
          } else if ("number" !== typeof this.end) {
            throw TypeError("end must be a Number");
          }
          if (this.start > this.end) {
            throw new Error("start must be <= end");
          }
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self._read();
          });
          return;
        }
        fs3.open(this.path, this.flags, this.mode, function(err, fd) {
          if (err) {
            self.emit("error", err);
            self.readable = false;
            return;
          }
          self.fd = fd;
          self.emit("open", fd);
          self._read();
        });
      }
      function WriteStream(path3, options) {
        if (!(this instanceof WriteStream)) return new WriteStream(path3, options);
        Stream.call(this);
        this.path = path3;
        this.fd = null;
        this.writable = true;
        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438;
        this.bytesWritten = 0;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.start < 0) {
            throw new Error("start must be >= zero");
          }
          this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
          this._open = fs3.open;
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
          this.flush();
        }
      }
    }
  }
});

// ../node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "../node_modules/graceful-fs/clone.js"(exports2, module2) {
    "use strict";
    module2.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj !== "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      });
      return copy;
    }
  }
});

// ../node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "../node_modules/graceful-fs/graceful-fs.js"(exports2, module2) {
    "use strict";
    var fs3 = require("fs");
    var polyfills = require_polyfills();
    var legacy = require_legacy_streams();
    var clone = require_clone();
    var util = require("util");
    var gracefulQueue;
    var previousSymbol;
    if (typeof Symbol === "function" && typeof Symbol.for === "function") {
      gracefulQueue = /* @__PURE__ */ Symbol.for("graceful-fs.queue");
      previousSymbol = /* @__PURE__ */ Symbol.for("graceful-fs.previous");
    } else {
      gracefulQueue = "___graceful-fs.queue";
      previousSymbol = "___graceful-fs.previous";
    }
    function noop() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop;
    if (util.debuglog)
      debug = util.debuglog("gfs4");
    else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
      debug = function() {
        var m = util.format.apply(util, arguments);
        m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
        console.error(m);
      };
    if (!fs3[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs3, queue);
      fs3.close = (function(fs$close) {
        function close(fd, cb) {
          return fs$close.call(fs3, fd, function(err) {
            if (!err) {
              resetQueue();
            }
            if (typeof cb === "function")
              cb.apply(this, arguments);
          });
        }
        Object.defineProperty(close, previousSymbol, {
          value: fs$close
        });
        return close;
      })(fs3.close);
      fs3.closeSync = (function(fs$closeSync) {
        function closeSync(fd) {
          fs$closeSync.apply(fs3, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      })(fs3.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs3[gracefulQueue]);
          require("assert").equal(fs3[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs3[gracefulQueue]);
    }
    module2.exports = patch(clone(fs3));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs3.__patched) {
      module2.exports = patch(fs3);
      fs3.__patched = true;
    }
    function patch(fs4) {
      polyfills(fs4);
      fs4.gracefulify = patch;
      fs4.createReadStream = createReadStream;
      fs4.createWriteStream = createWriteStream;
      var fs$readFile = fs4.readFile;
      fs4.readFile = readFile;
      function readFile(path3, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$readFile(path3, options, cb);
        function go$readFile(path4, options2, cb2, startTime) {
          return fs$readFile(path4, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path4, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs4.writeFile;
      fs4.writeFile = writeFile;
      function writeFile(path3, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$writeFile(path3, data, options, cb);
        function go$writeFile(path4, data2, options2, cb2, startTime) {
          return fs$writeFile(path4, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path4, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs4.appendFile;
      if (fs$appendFile)
        fs4.appendFile = appendFile;
      function appendFile(path3, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$appendFile(path3, data, options, cb);
        function go$appendFile(path4, data2, options2, cb2, startTime) {
          return fs$appendFile(path4, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path4, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs4.copyFile;
      if (fs$copyFile)
        fs4.copyFile = copyFile;
      function copyFile(src, dest, flags, cb) {
        if (typeof flags === "function") {
          cb = flags;
          flags = 0;
        }
        return go$copyFile(src, dest, flags, cb);
        function go$copyFile(src2, dest2, flags2, cb2, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$readdir = fs4.readdir;
      fs4.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path3, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path4, options2, cb2, startTime) {
          return fs$readdir(path4, fs$readdirCallback(
            path4,
            options2,
            cb2,
            startTime
          ));
        } : function go$readdir2(path4, options2, cb2, startTime) {
          return fs$readdir(path4, options2, fs$readdirCallback(
            path4,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path3, options, cb);
        function fs$readdirCallback(path4, options2, cb2, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path4, options2, cb2],
                err,
                startTime || Date.now(),
                Date.now()
              ]);
            else {
              if (files && files.sort)
                files.sort();
              if (typeof cb2 === "function")
                cb2.call(this, err, files);
            }
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs4);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs4.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs4.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs4, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs4, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs4, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs4, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path3, options) {
        if (this instanceof ReadStream)
          return fs$ReadStream.apply(this, arguments), this;
        else
          return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            if (that.autoClose)
              that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
            that.read();
          }
        });
      }
      function WriteStream(path3, options) {
        if (this instanceof WriteStream)
          return fs$WriteStream.apply(this, arguments), this;
        else
          return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
          }
        });
      }
      function createReadStream(path3, options) {
        return new fs4.ReadStream(path3, options);
      }
      function createWriteStream(path3, options) {
        return new fs4.WriteStream(path3, options);
      }
      var fs$open = fs4.open;
      fs4.open = open;
      function open(path3, flags, mode, cb) {
        if (typeof mode === "function")
          cb = mode, mode = null;
        return go$open(path3, flags, mode, cb);
        function go$open(path4, flags2, mode2, cb2, startTime) {
          return fs$open(path4, flags2, mode2, function(err, fd) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path4, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      return fs4;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs3[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now = Date.now();
      for (var i = 0; i < fs3[gracefulQueue].length; ++i) {
        if (fs3[gracefulQueue][i].length > 2) {
          fs3[gracefulQueue][i][3] = now;
          fs3[gracefulQueue][i][4] = now;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs3[gracefulQueue].length === 0)
        return;
      var elem = fs3[gracefulQueue].shift();
      var fn = elem[0];
      var args = elem[1];
      var err = elem[2];
      var startTime = elem[3];
      var lastTime = elem[4];
      if (startTime === void 0) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args);
      } else if (Date.now() - startTime >= 6e4) {
        debug("TIMEOUT", fn.name, args);
        var cb = args.pop();
        if (typeof cb === "function")
          cb.call(null, err);
      } else {
        var sinceAttempt = Date.now() - lastTime;
        var sinceStart = Math.max(lastTime - startTime, 1);
        var desiredDelay = Math.min(sinceStart * 1.2, 100);
        if (sinceAttempt >= desiredDelay) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args.concat([startTime]));
        } else {
          fs3[gracefulQueue].push(elem);
        }
      }
      if (retryTimer === void 0) {
        retryTimer = setTimeout(retry, 0);
      }
    }
  }
});

// ../node_modules/fs-extra/lib/fs/index.js
var require_fs = __commonJS({
  "../node_modules/fs-extra/lib/fs/index.js"(exports2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var fs3 = require_graceful_fs();
    var api = [
      "access",
      "appendFile",
      "chmod",
      "chown",
      "close",
      "copyFile",
      "cp",
      "fchmod",
      "fchown",
      "fdatasync",
      "fstat",
      "fsync",
      "ftruncate",
      "futimes",
      "glob",
      "lchmod",
      "lchown",
      "lutimes",
      "link",
      "lstat",
      "mkdir",
      "mkdtemp",
      "open",
      "opendir",
      "readdir",
      "readFile",
      "readlink",
      "realpath",
      "rename",
      "rm",
      "rmdir",
      "stat",
      "statfs",
      "symlink",
      "truncate",
      "unlink",
      "utimes",
      "writeFile"
    ].filter((key) => {
      return typeof fs3[key] === "function";
    });
    Object.assign(exports2, fs3);
    api.forEach((method) => {
      exports2[method] = u(fs3[method]);
    });
    exports2.exists = function(filename, callback) {
      if (typeof callback === "function") {
        return fs3.exists(filename, callback);
      }
      return new Promise((resolve2) => {
        return fs3.exists(filename, resolve2);
      });
    };
    exports2.read = function(fd, buffer, offset, length, position, callback) {
      if (typeof callback === "function") {
        return fs3.read(fd, buffer, offset, length, position, callback);
      }
      return new Promise((resolve2, reject) => {
        fs3.read(fd, buffer, offset, length, position, (err, bytesRead, buffer2) => {
          if (err) return reject(err);
          resolve2({ bytesRead, buffer: buffer2 });
        });
      });
    };
    exports2.write = function(fd, buffer, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs3.write(fd, buffer, ...args);
      }
      return new Promise((resolve2, reject) => {
        fs3.write(fd, buffer, ...args, (err, bytesWritten, buffer2) => {
          if (err) return reject(err);
          resolve2({ bytesWritten, buffer: buffer2 });
        });
      });
    };
    exports2.readv = function(fd, buffers, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs3.readv(fd, buffers, ...args);
      }
      return new Promise((resolve2, reject) => {
        fs3.readv(fd, buffers, ...args, (err, bytesRead, buffers2) => {
          if (err) return reject(err);
          resolve2({ bytesRead, buffers: buffers2 });
        });
      });
    };
    exports2.writev = function(fd, buffers, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs3.writev(fd, buffers, ...args);
      }
      return new Promise((resolve2, reject) => {
        fs3.writev(fd, buffers, ...args, (err, bytesWritten, buffers2) => {
          if (err) return reject(err);
          resolve2({ bytesWritten, buffers: buffers2 });
        });
      });
    };
    if (typeof fs3.realpath.native === "function") {
      exports2.realpath.native = u(fs3.realpath.native);
    } else {
      process.emitWarning(
        "fs.realpath.native is not a function. Is fs being monkey-patched?",
        "Warning",
        "fs-extra-WARN0003"
      );
    }
  }
});

// ../node_modules/fs-extra/lib/mkdirs/utils.js
var require_utils = __commonJS({
  "../node_modules/fs-extra/lib/mkdirs/utils.js"(exports2, module2) {
    "use strict";
    var path3 = require("path");
    module2.exports.checkPath = function checkPath(pth) {
      if (process.platform === "win32") {
        const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path3.parse(pth).root, ""));
        if (pathHasInvalidWinCharacters) {
          const error = new Error(`Path contains invalid characters: ${pth}`);
          error.code = "EINVAL";
          throw error;
        }
      }
    };
  }
});

// ../node_modules/fs-extra/lib/mkdirs/make-dir.js
var require_make_dir = __commonJS({
  "../node_modules/fs-extra/lib/mkdirs/make-dir.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var { checkPath } = require_utils();
    var getMode = (options) => {
      const defaults = { mode: 511 };
      if (typeof options === "number") return options;
      return { ...defaults, ...options }.mode;
    };
    module2.exports.makeDir = async (dir, options) => {
      checkPath(dir);
      return fs3.mkdir(dir, {
        mode: getMode(options),
        recursive: true
      });
    };
    module2.exports.makeDirSync = (dir, options) => {
      checkPath(dir);
      return fs3.mkdirSync(dir, {
        mode: getMode(options),
        recursive: true
      });
    };
  }
});

// ../node_modules/fs-extra/lib/mkdirs/index.js
var require_mkdirs = __commonJS({
  "../node_modules/fs-extra/lib/mkdirs/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var { makeDir: _makeDir, makeDirSync } = require_make_dir();
    var makeDir = u(_makeDir);
    module2.exports = {
      mkdirs: makeDir,
      mkdirsSync: makeDirSync,
      // alias
      mkdirp: makeDir,
      mkdirpSync: makeDirSync,
      ensureDir: makeDir,
      ensureDirSync: makeDirSync
    };
  }
});

// ../node_modules/fs-extra/lib/path-exists/index.js
var require_path_exists = __commonJS({
  "../node_modules/fs-extra/lib/path-exists/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var fs3 = require_fs();
    function pathExists(path3) {
      return fs3.access(path3).then(() => true).catch(() => false);
    }
    module2.exports = {
      pathExists: u(pathExists),
      pathExistsSync: fs3.existsSync
    };
  }
});

// ../node_modules/fs-extra/lib/util/utimes.js
var require_utimes = __commonJS({
  "../node_modules/fs-extra/lib/util/utimes.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var u = require_universalify().fromPromise;
    async function utimesMillis(path3, atime, mtime) {
      const fd = await fs3.open(path3, "r+");
      let error = null;
      try {
        await fs3.futimes(fd, atime, mtime);
      } catch (futimesErr) {
        error = futimesErr;
      } finally {
        try {
          await fs3.close(fd);
        } catch (closeErr) {
          if (!error) error = closeErr;
        }
      }
      if (error) {
        throw error;
      }
    }
    function utimesMillisSync(path3, atime, mtime) {
      const fd = fs3.openSync(path3, "r+");
      let error = null;
      try {
        fs3.futimesSync(fd, atime, mtime);
      } catch (futimesErr) {
        error = futimesErr;
      } finally {
        try {
          fs3.closeSync(fd);
        } catch (closeErr) {
          if (!error) error = closeErr;
        }
      }
      if (error) {
        throw error;
      }
    }
    module2.exports = {
      utimesMillis: u(utimesMillis),
      utimesMillisSync
    };
  }
});

// ../node_modules/fs-extra/lib/util/stat.js
var require_stat = __commonJS({
  "../node_modules/fs-extra/lib/util/stat.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var path3 = require("path");
    var u = require_universalify().fromPromise;
    function getStats(src, dest, opts) {
      const statFunc = opts.dereference ? (file) => fs3.stat(file, { bigint: true }) : (file) => fs3.lstat(file, { bigint: true });
      return Promise.all([
        statFunc(src),
        statFunc(dest).catch((err) => {
          if (err.code === "ENOENT") return null;
          throw err;
        })
      ]).then(([srcStat, destStat]) => ({ srcStat, destStat }));
    }
    function getStatsSync(src, dest, opts) {
      let destStat;
      const statFunc = opts.dereference ? (file) => fs3.statSync(file, { bigint: true }) : (file) => fs3.lstatSync(file, { bigint: true });
      const srcStat = statFunc(src);
      try {
        destStat = statFunc(dest);
      } catch (err) {
        if (err.code === "ENOENT") return { srcStat, destStat: null };
        throw err;
      }
      return { srcStat, destStat };
    }
    async function checkPaths(src, dest, funcName, opts) {
      const { srcStat, destStat } = await getStats(src, dest, opts);
      if (destStat) {
        if (areIdentical(srcStat, destStat)) {
          const srcBaseName = path3.basename(src);
          const destBaseName = path3.basename(dest);
          if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
            return { srcStat, destStat, isChangingCase: true };
          }
          throw new Error("Source and destination must not be the same.");
        }
        if (srcStat.isDirectory() && !destStat.isDirectory()) {
          throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
        }
        if (!srcStat.isDirectory() && destStat.isDirectory()) {
          throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
        }
      }
      if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return { srcStat, destStat };
    }
    function checkPathsSync(src, dest, funcName, opts) {
      const { srcStat, destStat } = getStatsSync(src, dest, opts);
      if (destStat) {
        if (areIdentical(srcStat, destStat)) {
          const srcBaseName = path3.basename(src);
          const destBaseName = path3.basename(dest);
          if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
            return { srcStat, destStat, isChangingCase: true };
          }
          throw new Error("Source and destination must not be the same.");
        }
        if (srcStat.isDirectory() && !destStat.isDirectory()) {
          throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
        }
        if (!srcStat.isDirectory() && destStat.isDirectory()) {
          throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
        }
      }
      if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return { srcStat, destStat };
    }
    async function checkParentPaths(src, srcStat, dest, funcName) {
      const srcParent = path3.resolve(path3.dirname(src));
      const destParent = path3.resolve(path3.dirname(dest));
      if (destParent === srcParent || destParent === path3.parse(destParent).root) return;
      let destStat;
      try {
        destStat = await fs3.stat(destParent, { bigint: true });
      } catch (err) {
        if (err.code === "ENOENT") return;
        throw err;
      }
      if (areIdentical(srcStat, destStat)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return checkParentPaths(src, srcStat, destParent, funcName);
    }
    function checkParentPathsSync(src, srcStat, dest, funcName) {
      const srcParent = path3.resolve(path3.dirname(src));
      const destParent = path3.resolve(path3.dirname(dest));
      if (destParent === srcParent || destParent === path3.parse(destParent).root) return;
      let destStat;
      try {
        destStat = fs3.statSync(destParent, { bigint: true });
      } catch (err) {
        if (err.code === "ENOENT") return;
        throw err;
      }
      if (areIdentical(srcStat, destStat)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return checkParentPathsSync(src, srcStat, destParent, funcName);
    }
    function areIdentical(srcStat, destStat) {
      return destStat.ino !== void 0 && destStat.dev !== void 0 && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev;
    }
    function isSrcSubdir(src, dest) {
      const srcArr = path3.resolve(src).split(path3.sep).filter((i) => i);
      const destArr = path3.resolve(dest).split(path3.sep).filter((i) => i);
      return srcArr.every((cur, i) => destArr[i] === cur);
    }
    function errMsg(src, dest, funcName) {
      return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
    }
    module2.exports = {
      // checkPaths
      checkPaths: u(checkPaths),
      checkPathsSync,
      // checkParent
      checkParentPaths: u(checkParentPaths),
      checkParentPathsSync,
      // Misc
      isSrcSubdir,
      areIdentical
    };
  }
});

// ../node_modules/fs-extra/lib/util/async.js
var require_async = __commonJS({
  "../node_modules/fs-extra/lib/util/async.js"(exports2, module2) {
    "use strict";
    async function asyncIteratorConcurrentProcess(iterator, fn) {
      const promises = [];
      for await (const item of iterator) {
        promises.push(
          fn(item).then(
            () => null,
            (err) => err ?? new Error("unknown error")
          )
        );
      }
      await Promise.all(
        promises.map(
          (promise) => promise.then((possibleErr) => {
            if (possibleErr !== null) throw possibleErr;
          })
        )
      );
    }
    module2.exports = {
      asyncIteratorConcurrentProcess
    };
  }
});

// ../node_modules/fs-extra/lib/copy/copy.js
var require_copy = __commonJS({
  "../node_modules/fs-extra/lib/copy/copy.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var path3 = require("path");
    var { mkdirs } = require_mkdirs();
    var { pathExists } = require_path_exists();
    var { utimesMillis } = require_utimes();
    var stat = require_stat();
    var { asyncIteratorConcurrentProcess } = require_async();
    async function copy(src, dest, opts = {}) {
      if (typeof opts === "function") {
        opts = { filter: opts };
      }
      opts.clobber = "clobber" in opts ? !!opts.clobber : true;
      opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
      if (opts.preserveTimestamps && process.arch === "ia32") {
        process.emitWarning(
          "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
          "Warning",
          "fs-extra-WARN0001"
        );
      }
      const { srcStat, destStat } = await stat.checkPaths(src, dest, "copy", opts);
      await stat.checkParentPaths(src, srcStat, dest, "copy");
      const include = await runFilter(src, dest, opts);
      if (!include) return;
      const destParent = path3.dirname(dest);
      const dirExists = await pathExists(destParent);
      if (!dirExists) {
        await mkdirs(destParent);
      }
      await getStatsAndPerformCopy(destStat, src, dest, opts);
    }
    async function runFilter(src, dest, opts) {
      if (!opts.filter) return true;
      return opts.filter(src, dest);
    }
    async function getStatsAndPerformCopy(destStat, src, dest, opts) {
      const statFn = opts.dereference ? fs3.stat : fs3.lstat;
      const srcStat = await statFn(src);
      if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
      if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);
      if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
      if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
      if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
      throw new Error(`Unknown file: ${src}`);
    }
    async function onFile(srcStat, destStat, src, dest, opts) {
      if (!destStat) return copyFile(srcStat, src, dest, opts);
      if (opts.overwrite) {
        await fs3.unlink(dest);
        return copyFile(srcStat, src, dest, opts);
      }
      if (opts.errorOnExist) {
        throw new Error(`'${dest}' already exists`);
      }
    }
    async function copyFile(srcStat, src, dest, opts) {
      await fs3.copyFile(src, dest);
      if (opts.preserveTimestamps) {
        if (fileIsNotWritable(srcStat.mode)) {
          await makeFileWritable(dest, srcStat.mode);
        }
        const updatedSrcStat = await fs3.stat(src);
        await utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
      }
      return fs3.chmod(dest, srcStat.mode);
    }
    function fileIsNotWritable(srcMode) {
      return (srcMode & 128) === 0;
    }
    function makeFileWritable(dest, srcMode) {
      return fs3.chmod(dest, srcMode | 128);
    }
    async function onDir(srcStat, destStat, src, dest, opts) {
      if (!destStat) {
        await fs3.mkdir(dest);
      }
      await asyncIteratorConcurrentProcess(await fs3.opendir(src), async (item) => {
        const srcItem = path3.join(src, item.name);
        const destItem = path3.join(dest, item.name);
        const include = await runFilter(srcItem, destItem, opts);
        if (include) {
          const { destStat: destStat2 } = await stat.checkPaths(srcItem, destItem, "copy", opts);
          await getStatsAndPerformCopy(destStat2, srcItem, destItem, opts);
        }
      });
      if (!destStat) {
        await fs3.chmod(dest, srcStat.mode);
      }
    }
    async function onLink(destStat, src, dest, opts) {
      let resolvedSrc = await fs3.readlink(src);
      if (opts.dereference) {
        resolvedSrc = path3.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs3.symlink(resolvedSrc, dest);
      }
      let resolvedDest = null;
      try {
        resolvedDest = await fs3.readlink(dest);
      } catch (e) {
        if (e.code === "EINVAL" || e.code === "UNKNOWN") return fs3.symlink(resolvedSrc, dest);
        throw e;
      }
      if (opts.dereference) {
        resolvedDest = path3.resolve(process.cwd(), resolvedDest);
      }
      if (resolvedSrc !== resolvedDest) {
        if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
          throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
        }
        if (stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
          throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
        }
      }
      await fs3.unlink(dest);
      return fs3.symlink(resolvedSrc, dest);
    }
    module2.exports = copy;
  }
});

// ../node_modules/fs-extra/lib/copy/copy-sync.js
var require_copy_sync = __commonJS({
  "../node_modules/fs-extra/lib/copy/copy-sync.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    var path3 = require("path");
    var mkdirsSync = require_mkdirs().mkdirsSync;
    var utimesMillisSync = require_utimes().utimesMillisSync;
    var stat = require_stat();
    function copySync(src, dest, opts) {
      if (typeof opts === "function") {
        opts = { filter: opts };
      }
      opts = opts || {};
      opts.clobber = "clobber" in opts ? !!opts.clobber : true;
      opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
      if (opts.preserveTimestamps && process.arch === "ia32") {
        process.emitWarning(
          "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
          "Warning",
          "fs-extra-WARN0002"
        );
      }
      const { srcStat, destStat } = stat.checkPathsSync(src, dest, "copy", opts);
      stat.checkParentPathsSync(src, srcStat, dest, "copy");
      if (opts.filter && !opts.filter(src, dest)) return;
      const destParent = path3.dirname(dest);
      if (!fs3.existsSync(destParent)) mkdirsSync(destParent);
      return getStats(destStat, src, dest, opts);
    }
    function getStats(destStat, src, dest, opts) {
      const statSync = opts.dereference ? fs3.statSync : fs3.lstatSync;
      const srcStat = statSync(src);
      if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
      else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);
      else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
      else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
      else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
      throw new Error(`Unknown file: ${src}`);
    }
    function onFile(srcStat, destStat, src, dest, opts) {
      if (!destStat) return copyFile(srcStat, src, dest, opts);
      return mayCopyFile(srcStat, src, dest, opts);
    }
    function mayCopyFile(srcStat, src, dest, opts) {
      if (opts.overwrite) {
        fs3.unlinkSync(dest);
        return copyFile(srcStat, src, dest, opts);
      } else if (opts.errorOnExist) {
        throw new Error(`'${dest}' already exists`);
      }
    }
    function copyFile(srcStat, src, dest, opts) {
      fs3.copyFileSync(src, dest);
      if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest);
      return setDestMode(dest, srcStat.mode);
    }
    function handleTimestamps(srcMode, src, dest) {
      if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode);
      return setDestTimestamps(src, dest);
    }
    function fileIsNotWritable(srcMode) {
      return (srcMode & 128) === 0;
    }
    function makeFileWritable(dest, srcMode) {
      return setDestMode(dest, srcMode | 128);
    }
    function setDestMode(dest, srcMode) {
      return fs3.chmodSync(dest, srcMode);
    }
    function setDestTimestamps(src, dest) {
      const updatedSrcStat = fs3.statSync(src);
      return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
    }
    function onDir(srcStat, destStat, src, dest, opts) {
      if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts);
      return copyDir(src, dest, opts);
    }
    function mkDirAndCopy(srcMode, src, dest, opts) {
      fs3.mkdirSync(dest);
      copyDir(src, dest, opts);
      return setDestMode(dest, srcMode);
    }
    function copyDir(src, dest, opts) {
      const dir = fs3.opendirSync(src);
      try {
        let dirent;
        while ((dirent = dir.readSync()) !== null) {
          copyDirItem(dirent.name, src, dest, opts);
        }
      } finally {
        dir.closeSync();
      }
    }
    function copyDirItem(item, src, dest, opts) {
      const srcItem = path3.join(src, item);
      const destItem = path3.join(dest, item);
      if (opts.filter && !opts.filter(srcItem, destItem)) return;
      const { destStat } = stat.checkPathsSync(srcItem, destItem, "copy", opts);
      return getStats(destStat, srcItem, destItem, opts);
    }
    function onLink(destStat, src, dest, opts) {
      let resolvedSrc = fs3.readlinkSync(src);
      if (opts.dereference) {
        resolvedSrc = path3.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs3.symlinkSync(resolvedSrc, dest);
      } else {
        let resolvedDest;
        try {
          resolvedDest = fs3.readlinkSync(dest);
        } catch (err) {
          if (err.code === "EINVAL" || err.code === "UNKNOWN") return fs3.symlinkSync(resolvedSrc, dest);
          throw err;
        }
        if (opts.dereference) {
          resolvedDest = path3.resolve(process.cwd(), resolvedDest);
        }
        if (resolvedSrc !== resolvedDest) {
          if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
            throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
          }
          if (stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
            throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
          }
        }
        return copyLink(resolvedSrc, dest);
      }
    }
    function copyLink(resolvedSrc, dest) {
      fs3.unlinkSync(dest);
      return fs3.symlinkSync(resolvedSrc, dest);
    }
    module2.exports = copySync;
  }
});

// ../node_modules/fs-extra/lib/copy/index.js
var require_copy2 = __commonJS({
  "../node_modules/fs-extra/lib/copy/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    module2.exports = {
      copy: u(require_copy()),
      copySync: require_copy_sync()
    };
  }
});

// ../node_modules/fs-extra/lib/remove/index.js
var require_remove = __commonJS({
  "../node_modules/fs-extra/lib/remove/index.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    var u = require_universalify().fromCallback;
    function remove(path3, callback) {
      fs3.rm(path3, { recursive: true, force: true }, callback);
    }
    function removeSync(path3) {
      fs3.rmSync(path3, { recursive: true, force: true });
    }
    module2.exports = {
      remove: u(remove),
      removeSync
    };
  }
});

// ../node_modules/fs-extra/lib/empty/index.js
var require_empty = __commonJS({
  "../node_modules/fs-extra/lib/empty/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var fs3 = require_fs();
    var path3 = require("path");
    var mkdir = require_mkdirs();
    var remove = require_remove();
    var emptyDir = u(async function emptyDir2(dir) {
      let items;
      try {
        items = await fs3.readdir(dir);
      } catch {
        return mkdir.mkdirs(dir);
      }
      return Promise.all(items.map((item) => remove.remove(path3.join(dir, item))));
    });
    function emptyDirSync(dir) {
      let items;
      try {
        items = fs3.readdirSync(dir);
      } catch {
        return mkdir.mkdirsSync(dir);
      }
      items.forEach((item) => {
        item = path3.join(dir, item);
        remove.removeSync(item);
      });
    }
    module2.exports = {
      emptyDirSync,
      emptydirSync: emptyDirSync,
      emptyDir,
      emptydir: emptyDir
    };
  }
});

// ../node_modules/fs-extra/lib/ensure/file.js
var require_file = __commonJS({
  "../node_modules/fs-extra/lib/ensure/file.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var path3 = require("path");
    var fs3 = require_fs();
    var mkdir = require_mkdirs();
    async function createFile(file) {
      let stats;
      try {
        stats = await fs3.stat(file);
      } catch {
      }
      if (stats && stats.isFile()) return;
      const dir = path3.dirname(file);
      let dirStats = null;
      try {
        dirStats = await fs3.stat(dir);
      } catch (err) {
        if (err.code === "ENOENT") {
          await mkdir.mkdirs(dir);
          await fs3.writeFile(file, "");
          return;
        } else {
          throw err;
        }
      }
      if (dirStats.isDirectory()) {
        await fs3.writeFile(file, "");
      } else {
        await fs3.readdir(dir);
      }
    }
    function createFileSync(file) {
      let stats;
      try {
        stats = fs3.statSync(file);
      } catch {
      }
      if (stats && stats.isFile()) return;
      const dir = path3.dirname(file);
      try {
        if (!fs3.statSync(dir).isDirectory()) {
          fs3.readdirSync(dir);
        }
      } catch (err) {
        if (err && err.code === "ENOENT") mkdir.mkdirsSync(dir);
        else throw err;
      }
      fs3.writeFileSync(file, "");
    }
    module2.exports = {
      createFile: u(createFile),
      createFileSync
    };
  }
});

// ../node_modules/fs-extra/lib/ensure/link.js
var require_link = __commonJS({
  "../node_modules/fs-extra/lib/ensure/link.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var path3 = require("path");
    var fs3 = require_fs();
    var mkdir = require_mkdirs();
    var { pathExists } = require_path_exists();
    var { areIdentical } = require_stat();
    async function createLink(srcpath, dstpath) {
      let dstStat;
      try {
        dstStat = await fs3.lstat(dstpath, { bigint: true });
      } catch {
      }
      let srcStat;
      try {
        srcStat = await fs3.lstat(srcpath, { bigint: true });
      } catch (err) {
        err.message = err.message.replace("lstat", "ensureLink");
        throw err;
      }
      if (dstStat && areIdentical(srcStat, dstStat)) return;
      const dir = path3.dirname(dstpath);
      const dirExists = await pathExists(dir);
      if (!dirExists) {
        await mkdir.mkdirs(dir);
      }
      await fs3.link(srcpath, dstpath);
    }
    function createLinkSync(srcpath, dstpath) {
      let dstStat;
      try {
        dstStat = fs3.lstatSync(dstpath, { bigint: true });
      } catch {
      }
      try {
        const srcStat = fs3.lstatSync(srcpath, { bigint: true });
        if (dstStat && areIdentical(srcStat, dstStat)) return;
      } catch (err) {
        err.message = err.message.replace("lstat", "ensureLink");
        throw err;
      }
      const dir = path3.dirname(dstpath);
      const dirExists = fs3.existsSync(dir);
      if (dirExists) return fs3.linkSync(srcpath, dstpath);
      mkdir.mkdirsSync(dir);
      return fs3.linkSync(srcpath, dstpath);
    }
    module2.exports = {
      createLink: u(createLink),
      createLinkSync
    };
  }
});

// ../node_modules/fs-extra/lib/ensure/symlink-paths.js
var require_symlink_paths = __commonJS({
  "../node_modules/fs-extra/lib/ensure/symlink-paths.js"(exports2, module2) {
    "use strict";
    var path3 = require("path");
    var fs3 = require_fs();
    var { pathExists } = require_path_exists();
    var u = require_universalify().fromPromise;
    async function symlinkPaths(srcpath, dstpath) {
      if (path3.isAbsolute(srcpath)) {
        try {
          await fs3.lstat(srcpath);
        } catch (err) {
          err.message = err.message.replace("lstat", "ensureSymlink");
          throw err;
        }
        return {
          toCwd: srcpath,
          toDst: srcpath
        };
      }
      const dstdir = path3.dirname(dstpath);
      const relativeToDst = path3.join(dstdir, srcpath);
      const exists = await pathExists(relativeToDst);
      if (exists) {
        return {
          toCwd: relativeToDst,
          toDst: srcpath
        };
      }
      try {
        await fs3.lstat(srcpath);
      } catch (err) {
        err.message = err.message.replace("lstat", "ensureSymlink");
        throw err;
      }
      return {
        toCwd: srcpath,
        toDst: path3.relative(dstdir, srcpath)
      };
    }
    function symlinkPathsSync(srcpath, dstpath) {
      if (path3.isAbsolute(srcpath)) {
        const exists2 = fs3.existsSync(srcpath);
        if (!exists2) throw new Error("absolute srcpath does not exist");
        return {
          toCwd: srcpath,
          toDst: srcpath
        };
      }
      const dstdir = path3.dirname(dstpath);
      const relativeToDst = path3.join(dstdir, srcpath);
      const exists = fs3.existsSync(relativeToDst);
      if (exists) {
        return {
          toCwd: relativeToDst,
          toDst: srcpath
        };
      }
      const srcExists = fs3.existsSync(srcpath);
      if (!srcExists) throw new Error("relative srcpath does not exist");
      return {
        toCwd: srcpath,
        toDst: path3.relative(dstdir, srcpath)
      };
    }
    module2.exports = {
      symlinkPaths: u(symlinkPaths),
      symlinkPathsSync
    };
  }
});

// ../node_modules/fs-extra/lib/ensure/symlink-type.js
var require_symlink_type = __commonJS({
  "../node_modules/fs-extra/lib/ensure/symlink-type.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var u = require_universalify().fromPromise;
    async function symlinkType(srcpath, type) {
      if (type) return type;
      let stats;
      try {
        stats = await fs3.lstat(srcpath);
      } catch {
        return "file";
      }
      return stats && stats.isDirectory() ? "dir" : "file";
    }
    function symlinkTypeSync(srcpath, type) {
      if (type) return type;
      let stats;
      try {
        stats = fs3.lstatSync(srcpath);
      } catch {
        return "file";
      }
      return stats && stats.isDirectory() ? "dir" : "file";
    }
    module2.exports = {
      symlinkType: u(symlinkType),
      symlinkTypeSync
    };
  }
});

// ../node_modules/fs-extra/lib/ensure/symlink.js
var require_symlink = __commonJS({
  "../node_modules/fs-extra/lib/ensure/symlink.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var path3 = require("path");
    var fs3 = require_fs();
    var { mkdirs, mkdirsSync } = require_mkdirs();
    var { symlinkPaths, symlinkPathsSync } = require_symlink_paths();
    var { symlinkType, symlinkTypeSync } = require_symlink_type();
    var { pathExists } = require_path_exists();
    var { areIdentical } = require_stat();
    async function createSymlink(srcpath, dstpath, type) {
      let stats;
      try {
        stats = await fs3.lstat(dstpath);
      } catch {
      }
      if (stats && stats.isSymbolicLink()) {
        let srcStat;
        if (path3.isAbsolute(srcpath)) {
          srcStat = await fs3.stat(srcpath, { bigint: true });
        } else {
          const dstdir = path3.dirname(dstpath);
          const relativeToDst = path3.join(dstdir, srcpath);
          try {
            srcStat = await fs3.stat(relativeToDst, { bigint: true });
          } catch {
            srcStat = await fs3.stat(srcpath, { bigint: true });
          }
        }
        const dstStat = await fs3.stat(dstpath, { bigint: true });
        if (areIdentical(srcStat, dstStat)) return;
      }
      const relative = await symlinkPaths(srcpath, dstpath);
      srcpath = relative.toDst;
      const toType = await symlinkType(relative.toCwd, type);
      const dir = path3.dirname(dstpath);
      if (!await pathExists(dir)) {
        await mkdirs(dir);
      }
      return fs3.symlink(srcpath, dstpath, toType);
    }
    function createSymlinkSync(srcpath, dstpath, type) {
      let stats;
      try {
        stats = fs3.lstatSync(dstpath);
      } catch {
      }
      if (stats && stats.isSymbolicLink()) {
        let srcStat;
        if (path3.isAbsolute(srcpath)) {
          srcStat = fs3.statSync(srcpath, { bigint: true });
        } else {
          const dstdir = path3.dirname(dstpath);
          const relativeToDst = path3.join(dstdir, srcpath);
          try {
            srcStat = fs3.statSync(relativeToDst, { bigint: true });
          } catch {
            srcStat = fs3.statSync(srcpath, { bigint: true });
          }
        }
        const dstStat = fs3.statSync(dstpath, { bigint: true });
        if (areIdentical(srcStat, dstStat)) return;
      }
      const relative = symlinkPathsSync(srcpath, dstpath);
      srcpath = relative.toDst;
      type = symlinkTypeSync(relative.toCwd, type);
      const dir = path3.dirname(dstpath);
      const exists = fs3.existsSync(dir);
      if (exists) return fs3.symlinkSync(srcpath, dstpath, type);
      mkdirsSync(dir);
      return fs3.symlinkSync(srcpath, dstpath, type);
    }
    module2.exports = {
      createSymlink: u(createSymlink),
      createSymlinkSync
    };
  }
});

// ../node_modules/fs-extra/lib/ensure/index.js
var require_ensure = __commonJS({
  "../node_modules/fs-extra/lib/ensure/index.js"(exports2, module2) {
    "use strict";
    var { createFile, createFileSync } = require_file();
    var { createLink, createLinkSync } = require_link();
    var { createSymlink, createSymlinkSync } = require_symlink();
    module2.exports = {
      // file
      createFile,
      createFileSync,
      ensureFile: createFile,
      ensureFileSync: createFileSync,
      // link
      createLink,
      createLinkSync,
      ensureLink: createLink,
      ensureLinkSync: createLinkSync,
      // symlink
      createSymlink,
      createSymlinkSync,
      ensureSymlink: createSymlink,
      ensureSymlinkSync: createSymlinkSync
    };
  }
});

// ../node_modules/jsonfile/utils.js
var require_utils2 = __commonJS({
  "../node_modules/jsonfile/utils.js"(exports2, module2) {
    "use strict";
    function stringify(obj, { EOL = "\n", finalEOL = true, replacer = null, spaces } = {}) {
      const EOF = finalEOL ? EOL : "";
      const str = JSON.stringify(obj, replacer, spaces);
      if (str === void 0) {
        throw new TypeError(`Converting ${typeof obj} value to JSON is not supported`);
      }
      return str.replace(/\n/g, EOL) + EOF;
    }
    function stripBom(content) {
      if (Buffer.isBuffer(content)) content = content.toString("utf8");
      return content.replace(/^\uFEFF/, "");
    }
    module2.exports = { stringify, stripBom };
  }
});

// ../node_modules/jsonfile/index.js
var require_jsonfile = __commonJS({
  "../node_modules/jsonfile/index.js"(exports2, module2) {
    "use strict";
    var _fs;
    try {
      _fs = require_graceful_fs();
    } catch (_) {
      _fs = require("fs");
    }
    var universalify = require_universalify();
    var { stringify, stripBom } = require_utils2();
    async function _readFile(file, options = {}) {
      if (typeof options === "string") {
        options = { encoding: options };
      }
      const fs3 = options.fs || _fs;
      const shouldThrow = "throws" in options ? options.throws : true;
      let data = await universalify.fromCallback(fs3.readFile)(file, options);
      data = stripBom(data);
      let obj;
      try {
        obj = JSON.parse(data, options ? options.reviver : null);
      } catch (err) {
        if (shouldThrow) {
          err.message = `${file}: ${err.message}`;
          throw err;
        } else {
          return null;
        }
      }
      return obj;
    }
    var readFile = universalify.fromPromise(_readFile);
    function readFileSync(file, options = {}) {
      if (typeof options === "string") {
        options = { encoding: options };
      }
      const fs3 = options.fs || _fs;
      const shouldThrow = "throws" in options ? options.throws : true;
      try {
        let content = fs3.readFileSync(file, options);
        content = stripBom(content);
        return JSON.parse(content, options.reviver);
      } catch (err) {
        if (shouldThrow) {
          err.message = `${file}: ${err.message}`;
          throw err;
        } else {
          return null;
        }
      }
    }
    async function _writeFile(file, obj, options = {}) {
      const fs3 = options.fs || _fs;
      const str = stringify(obj, options);
      await universalify.fromCallback(fs3.writeFile)(file, str, options);
    }
    var writeFile = universalify.fromPromise(_writeFile);
    function writeFileSync(file, obj, options = {}) {
      const fs3 = options.fs || _fs;
      const str = stringify(obj, options);
      return fs3.writeFileSync(file, str, options);
    }
    module2.exports = {
      readFile,
      readFileSync,
      writeFile,
      writeFileSync
    };
  }
});

// ../node_modules/fs-extra/lib/json/jsonfile.js
var require_jsonfile2 = __commonJS({
  "../node_modules/fs-extra/lib/json/jsonfile.js"(exports2, module2) {
    "use strict";
    var jsonFile = require_jsonfile();
    module2.exports = {
      // jsonfile exports
      readJson: jsonFile.readFile,
      readJsonSync: jsonFile.readFileSync,
      writeJson: jsonFile.writeFile,
      writeJsonSync: jsonFile.writeFileSync
    };
  }
});

// ../node_modules/fs-extra/lib/output-file/index.js
var require_output_file = __commonJS({
  "../node_modules/fs-extra/lib/output-file/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var fs3 = require_fs();
    var path3 = require("path");
    var mkdir = require_mkdirs();
    var pathExists = require_path_exists().pathExists;
    async function outputFile(file, data, encoding = "utf-8") {
      const dir = path3.dirname(file);
      if (!await pathExists(dir)) {
        await mkdir.mkdirs(dir);
      }
      return fs3.writeFile(file, data, encoding);
    }
    function outputFileSync(file, ...args) {
      const dir = path3.dirname(file);
      if (!fs3.existsSync(dir)) {
        mkdir.mkdirsSync(dir);
      }
      fs3.writeFileSync(file, ...args);
    }
    module2.exports = {
      outputFile: u(outputFile),
      outputFileSync
    };
  }
});

// ../node_modules/fs-extra/lib/json/output-json.js
var require_output_json = __commonJS({
  "../node_modules/fs-extra/lib/json/output-json.js"(exports2, module2) {
    "use strict";
    var { stringify } = require_utils2();
    var { outputFile } = require_output_file();
    async function outputJson(file, data, options = {}) {
      const str = stringify(data, options);
      await outputFile(file, str, options);
    }
    module2.exports = outputJson;
  }
});

// ../node_modules/fs-extra/lib/json/output-json-sync.js
var require_output_json_sync = __commonJS({
  "../node_modules/fs-extra/lib/json/output-json-sync.js"(exports2, module2) {
    "use strict";
    var { stringify } = require_utils2();
    var { outputFileSync } = require_output_file();
    function outputJsonSync(file, data, options) {
      const str = stringify(data, options);
      outputFileSync(file, str, options);
    }
    module2.exports = outputJsonSync;
  }
});

// ../node_modules/fs-extra/lib/json/index.js
var require_json = __commonJS({
  "../node_modules/fs-extra/lib/json/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var jsonFile = require_jsonfile2();
    jsonFile.outputJson = u(require_output_json());
    jsonFile.outputJsonSync = require_output_json_sync();
    jsonFile.outputJSON = jsonFile.outputJson;
    jsonFile.outputJSONSync = jsonFile.outputJsonSync;
    jsonFile.writeJSON = jsonFile.writeJson;
    jsonFile.writeJSONSync = jsonFile.writeJsonSync;
    jsonFile.readJSON = jsonFile.readJson;
    jsonFile.readJSONSync = jsonFile.readJsonSync;
    module2.exports = jsonFile;
  }
});

// ../node_modules/fs-extra/lib/move/move.js
var require_move = __commonJS({
  "../node_modules/fs-extra/lib/move/move.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var path3 = require("path");
    var { copy } = require_copy2();
    var { remove } = require_remove();
    var { mkdirp } = require_mkdirs();
    var { pathExists } = require_path_exists();
    var stat = require_stat();
    async function move(src, dest, opts = {}) {
      const overwrite = opts.overwrite || opts.clobber || false;
      const { srcStat, isChangingCase = false } = await stat.checkPaths(src, dest, "move", opts);
      await stat.checkParentPaths(src, srcStat, dest, "move");
      const destParent = path3.dirname(dest);
      const parsedParentPath = path3.parse(destParent);
      if (parsedParentPath.root !== destParent) {
        await mkdirp(destParent);
      }
      return doRename(src, dest, overwrite, isChangingCase);
    }
    async function doRename(src, dest, overwrite, isChangingCase) {
      if (!isChangingCase) {
        if (overwrite) {
          await remove(dest);
        } else if (await pathExists(dest)) {
          throw new Error("dest already exists.");
        }
      }
      try {
        await fs3.rename(src, dest);
      } catch (err) {
        if (err.code !== "EXDEV") {
          throw err;
        }
        await moveAcrossDevice(src, dest, overwrite);
      }
    }
    async function moveAcrossDevice(src, dest, overwrite) {
      const opts = {
        overwrite,
        errorOnExist: true,
        preserveTimestamps: true
      };
      await copy(src, dest, opts);
      return remove(src);
    }
    module2.exports = move;
  }
});

// ../node_modules/fs-extra/lib/move/move-sync.js
var require_move_sync = __commonJS({
  "../node_modules/fs-extra/lib/move/move-sync.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    var path3 = require("path");
    var copySync = require_copy2().copySync;
    var removeSync = require_remove().removeSync;
    var mkdirpSync = require_mkdirs().mkdirpSync;
    var stat = require_stat();
    function moveSync(src, dest, opts) {
      opts = opts || {};
      const overwrite = opts.overwrite || opts.clobber || false;
      const { srcStat, isChangingCase = false } = stat.checkPathsSync(src, dest, "move", opts);
      stat.checkParentPathsSync(src, srcStat, dest, "move");
      if (!isParentRoot(dest)) mkdirpSync(path3.dirname(dest));
      return doRename(src, dest, overwrite, isChangingCase);
    }
    function isParentRoot(dest) {
      const parent = path3.dirname(dest);
      const parsedPath = path3.parse(parent);
      return parsedPath.root === parent;
    }
    function doRename(src, dest, overwrite, isChangingCase) {
      if (isChangingCase) return rename(src, dest, overwrite);
      if (overwrite) {
        removeSync(dest);
        return rename(src, dest, overwrite);
      }
      if (fs3.existsSync(dest)) throw new Error("dest already exists.");
      return rename(src, dest, overwrite);
    }
    function rename(src, dest, overwrite) {
      try {
        fs3.renameSync(src, dest);
      } catch (err) {
        if (err.code !== "EXDEV") throw err;
        return moveAcrossDevice(src, dest, overwrite);
      }
    }
    function moveAcrossDevice(src, dest, overwrite) {
      const opts = {
        overwrite,
        errorOnExist: true,
        preserveTimestamps: true
      };
      copySync(src, dest, opts);
      return removeSync(src);
    }
    module2.exports = moveSync;
  }
});

// ../node_modules/fs-extra/lib/move/index.js
var require_move2 = __commonJS({
  "../node_modules/fs-extra/lib/move/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    module2.exports = {
      move: u(require_move()),
      moveSync: require_move_sync()
    };
  }
});

// ../node_modules/fs-extra/lib/index.js
var require_lib = __commonJS({
  "../node_modules/fs-extra/lib/index.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      // Export promiseified graceful-fs:
      ...require_fs(),
      // Export extra methods:
      ...require_copy2(),
      ...require_empty(),
      ...require_ensure(),
      ...require_json(),
      ...require_mkdirs(),
      ...require_move2(),
      ...require_output_file(),
      ...require_path_exists(),
      ...require_remove()
    };
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode2 = __toESM(require("vscode"));
var path2 = __toESM(require("path"));
var fs2 = __toESM(require_lib());
var cp2 = __toESM(require("child_process"));

// src/sidebarEmptyState.ts
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}
function renderHome(state) {
  return `
    <section class="hero-card">
      <div class="hero-badge">Icarus Sidebar</div>
      <h2>No Active Solution File</h2>
      <p class="hero-copy">
        Open a solution file to see full problem details, or browse company questions right here and open one into your workspace.
      </p>
      <div class="hero-actions">
        <button class="primary-btn" data-action="browse-companies" type="button">
          Browse Company Questions
        </button>
      </div>
      <div class="hero-tip">
        Terminal fallback: <code>lcx open &lt;slug&gt;</code>
      </div>
      ${state.summary ? `
            <div class="summary-strip">
              <span>${formatNumber(state.summary.companySheets.length)} companies</span>
              <span>${formatNumber(state.summary.totalQuestions)} workbook entries</span>
            </div>
          ` : ""}
    </section>
  `;
}
function renderCompanyList(state) {
  if (!state.summary) {
    return `
      <section class="panel-card">
        <div class="empty-panel">Company workbook not loaded yet.</div>
      </section>
    `;
  }
  return `
    <section class="panel-card">
      <div class="panel-header">
        <button class="back-btn" data-action="back-home" type="button">Back</button>
        <div>
          <div class="panel-title">Company Questions</div>
          <div class="panel-subtitle">${formatNumber(state.summary.companySheets.length)} companies available</div>
        </div>
      </div>
      <input
        class="filter-input"
        id="company-filter"
        type="search"
        placeholder="Filter companies"
      />
      <div class="company-list" id="company-list">
        ${state.summary.companySheets.map(
    (company) => `
              <button
                class="company-item"
                data-company="${escapeHtml(company.name)}"
                data-filter="${escapeHtml(company.name.toLowerCase())}"
                type="button"
              >
                <span class="company-name">${escapeHtml(company.name)}</span>
                <span class="company-meta">${company.companyQuestions} questions</span>
              </button>
            `
  ).join("")}
      </div>
    </section>
  `;
}
function renderProblemList(state) {
  const company = state.selectedCompany;
  if (!company) {
    return `
      <section class="panel-card">
        <div class="empty-panel">Pick a company to view its questions.</div>
      </section>
    `;
  }
  return `
    <section class="panel-card">
      <div class="panel-header">
        <button class="back-btn" data-action="back-companies" type="button">Back</button>
        <div>
          <div class="panel-title">${escapeHtml(company.name)}</div>
          <div class="panel-subtitle">${company.companyQuestions} company questions</div>
        </div>
      </div>
      <input
        class="filter-input"
        id="problem-filter"
        type="search"
        placeholder="Filter problems"
      />
      <div class="problem-list" id="problem-list">
        ${company.questions.map(
    (question) => `
              <article
                class="problem-item"
                data-filter="${escapeHtml(`${question.title} ${question.slug}`.toLowerCase())}"
              >
                <div class="problem-copy">
                  <div class="problem-title">
                    ${question.isDailyQuestion ? '<span class="pill">Daily</span>' : ""}
                    <span>${escapeHtml(question.title)}</span>
                  </div>
                  <div class="problem-meta">${escapeHtml(question.slug)}</div>
                </div>
                <button
                  class="open-btn"
                  data-problem="${escapeHtml(question.slug)}"
                  type="button"
                >
                  Open
                </button>
              </article>
            `
  ).join("")}
      </div>
    </section>
  `;
}
function renderError(state) {
  if (!state.errorMessage) {
    return "";
  }
  return `
    <div class="error-card">
      <div class="error-title">Could not load company questions</div>
      <div class="error-body">${escapeHtml(state.errorMessage)}</div>
    </div>
  `;
}
function renderLoading(state) {
  if (!state.loadingLabel) {
    return "";
  }
  return `
    <div class="loading-banner">
      <span class="loading-dot"></span>
      <span>${escapeHtml(state.loadingLabel)}</span>
    </div>
  `;
}
function getEmptyStateWebviewContent(state) {
  const content = state.mode === "problems" ? renderProblemList(state) : state.mode === "companies" ? renderCompanyList(state) : renderHome(state);
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        :root {
          --panel-bg: color-mix(in srgb, var(--vscode-sideBar-background) 90%, black);
          --panel-card: color-mix(in srgb, var(--vscode-editor-background) 88%, transparent);
          --panel-border: color-mix(in srgb, var(--vscode-foreground) 12%, transparent);
          --panel-text: var(--vscode-foreground);
          --panel-muted: var(--vscode-descriptionForeground);
          --panel-accent: #39a0ed;
          --panel-accent-soft: rgba(57, 160, 237, 0.16);
          --panel-green: #22c55e;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          min-height: 100vh;
          font-family: var(--vscode-font-family, system-ui, sans-serif);
          background:
            radial-gradient(circle at top, rgba(57, 160, 237, 0.14), transparent 30%),
            linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 94%, black), var(--panel-bg));
          color: var(--panel-text);
          padding: 14px;
        }

        button,
        input {
          font: inherit;
        }

        .shell {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hero-card,
        .panel-card,
        .error-card,
        .loading-banner {
          border: 1px solid var(--panel-border);
          border-radius: 18px;
          background: var(--panel-card);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16);
        }

        .hero-card,
        .panel-card,
        .error-card {
          padding: 16px;
        }

        .hero-badge,
        .panel-subtitle,
        .hero-copy,
        .hero-tip,
        .company-meta,
        .problem-meta,
        .error-body {
          color: var(--panel-muted);
        }

        .hero-badge {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          margin-bottom: 8px;
        }

        h2,
        .panel-title {
          margin: 0;
          font-size: 18px;
          line-height: 1.2;
          font-weight: 700;
        }

        .hero-copy {
          margin: 10px 0 0;
          line-height: 1.55;
          font-size: 13px;
        }

        .hero-actions {
          margin-top: 16px;
          display: flex;
          gap: 10px;
        }

        .primary-btn,
        .open-btn {
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--panel-accent), #0ea5e9);
          color: white;
          cursor: pointer;
          font-weight: 700;
          transition: transform 120ms ease, opacity 120ms ease;
        }

        .primary-btn {
          width: 100%;
          padding: 12px 14px;
        }

        .open-btn {
          flex: none;
          padding: 8px 12px;
        }

        .primary-btn:hover,
        .open-btn:hover,
        .company-item:hover,
        .back-btn:hover {
          transform: translateY(-1px);
        }

        .hero-tip {
          margin-top: 12px;
          font-size: 12px;
        }

        code {
          font-family: var(--vscode-editor-font-family, monospace);
          background: color-mix(in srgb, var(--panel-card) 75%, black);
          padding: 2px 5px;
          border-radius: 6px;
        }

        .summary-strip {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
          color: var(--panel-muted);
          padding-top: 12px;
          border-top: 1px solid var(--panel-border);
        }

        .panel-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 14px;
        }

        .back-btn {
          border: 1px solid var(--panel-border);
          border-radius: 10px;
          background: transparent;
          color: var(--panel-text);
          padding: 8px 10px;
          cursor: pointer;
          flex: none;
        }

        .filter-input {
          width: 100%;
          border: 1px solid var(--panel-border);
          border-radius: 12px;
          background: color-mix(in srgb, var(--panel-card) 82%, black);
          color: var(--panel-text);
          padding: 10px 12px;
          margin-bottom: 12px;
        }

        .company-list,
        .problem-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 68vh;
          overflow-y: auto;
        }

        .company-item,
        .problem-item {
          width: 100%;
          border: 1px solid var(--panel-border);
          border-radius: 14px;
          background: color-mix(in srgb, var(--panel-card) 78%, black);
        }

        .company-item {
          padding: 12px 14px;
          text-align: left;
          color: var(--panel-text);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .company-name,
        .problem-title {
          font-weight: 600;
        }

        .problem-item {
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .problem-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .problem-title {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pill {
          border-radius: 999px;
          padding: 3px 7px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          background: color-mix(in srgb, var(--panel-green) 22%, transparent);
          color: #d4ffe2;
        }

        .problem-meta {
          font-size: 12px;
        }

        .loading-banner {
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--panel-muted);
          font-size: 12px;
        }

        .loading-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--panel-accent);
          box-shadow: 0 0 0 6px var(--panel-accent-soft);
          animation: pulse 1s ease-in-out infinite;
        }

        .error-title {
          font-weight: 700;
          margin-bottom: 6px;
        }

        .empty-panel {
          color: var(--panel-muted);
          text-align: center;
          padding: 16px 8px;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.85); opacity: 0.75; }
        }
      </style>
    </head>
    <body>
      <div class="shell">
        ${renderLoading(state)}
        ${renderError(state)}
        ${content}
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        document.querySelector('[data-action="browse-companies"]')?.addEventListener('click', () => {
          vscode.postMessage({ command: 'browseCompanies' });
        });

        document.querySelector('[data-action="back-home"]')?.addEventListener('click', () => {
          vscode.postMessage({ command: 'backHome' });
        });

        document.querySelector('[data-action="back-companies"]')?.addEventListener('click', () => {
          vscode.postMessage({ command: 'backCompanies' });
        });

        document.querySelectorAll('[data-company]').forEach((button) => {
          button.addEventListener('click', () => {
            vscode.postMessage({
              command: 'selectCompany',
              companyName: button.getAttribute('data-company'),
            });
          });
        });

        document.querySelectorAll('[data-problem]').forEach((button) => {
          button.addEventListener('click', () => {
            vscode.postMessage({
              command: 'openProblem',
              slug: button.getAttribute('data-problem'),
            });
          });
        });

        const companyFilter = document.getElementById('company-filter');
        if (companyFilter) {
          companyFilter.addEventListener('input', () => {
            const term = companyFilter.value.trim().toLowerCase();
            document.querySelectorAll('[data-company]').forEach((item) => {
              const text = item.getAttribute('data-filter') || '';
              item.style.display = text.includes(term) ? '' : 'none';
            });
          });
        }

        const problemFilter = document.getElementById('problem-filter');
        if (problemFilter) {
          problemFilter.addEventListener('input', () => {
            const term = problemFilter.value.trim().toLowerCase();
            document.querySelectorAll('[data-filter]').forEach((item) => {
              if (!item.classList.contains('problem-item')) {
                return;
              }
              const text = item.getAttribute('data-filter') || '';
              item.style.display = text.includes(term) ? '' : 'none';
            });
          });
        }
      </script>
    </body>
  </html>`;
}

// src/webview.ts
function getWebviewContent(problem, emptyState) {
  if (!problem) {
    return getEmptyStateWebviewContent(
      emptyState || {
        mode: "home",
        summary: null,
        selectedCompany: null,
        loadingLabel: null,
        errorMessage: null
      }
    );
  }
  const difficultyClass = problem.difficulty.toLowerCase();
  const tagsHtml = (problem.topicTags || []).map((t) => `<span class="tag">${typeof t === "string" ? t : t.name}</span>`).join("");
  const hintsHtml = (problem.hints || []).map((hint, index) => `
        <details class="hint-details">
            <summary class="hint-summary">Hint ${index + 1}</summary>
            <div class="hint-content">${hint}</div>
        </details>
    `).join("");
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
          :root {
              --difficulty-easy: #22c55e;
              --difficulty-medium: #eab308;
              --difficulty-hard: #ef4444;
          }

          body {
              font-family: var(--vscode-font-family, system-ui, sans-serif);
              font-size: 13px;
              color: var(--vscode-foreground);
              background-color: var(--vscode-sideBar-background);
              padding: 12px 16px;
              margin: 0;
              box-sizing: border-box;
              line-height: 1.5;
          }

          /* Scrollbar Customization */
          ::-webkit-scrollbar {
              width: 8px;
              height: 8px;
          }
          ::-webkit-scrollbar-track {
              background: transparent;
          }
          ::-webkit-scrollbar-thumb {
              background: var(--vscode-scrollbarSlider-background, rgba(100,100,100,0.4));
              border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
              background: var(--vscode-scrollbarSlider-activeBackground, rgba(100,100,100,0.6));
          }

          .header {
              border-bottom: 1px solid var(--vscode-divider, rgba(128,128,128,0.25));
              padding-bottom: 12px;
              margin-bottom: 14px;
          }

          .title-container {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 8px;
          }

          h2 {
              font-size: 16px;
              margin: 0 0 6px 0;
              font-weight: 600;
              color: var(--vscode-sideBarTitle-foreground, var(--vscode-foreground));
          }

          .difficulty-badge {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 2px 6px;
              border-radius: 4px;
              display: inline-block;
              color: #ffffff;
          }

          .difficulty-badge.easy { background-color: var(--difficulty-easy); }
          .difficulty-badge.medium { background-color: var(--difficulty-medium); }
          .difficulty-badge.hard { background-color: var(--difficulty-hard); }

          .stats {
              font-size: 11px;
              color: var(--vscode-descriptionForeground);
              margin-top: 6px;
              display: flex;
              gap: 12px;
          }

          .tags-container {
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
              margin-top: 8px;
          }

          .tag {
              font-size: 10px;
              background-color: var(--vscode-badge-background, rgba(128, 128, 128, 0.15));
              color: var(--vscode-badge-foreground, var(--vscode-foreground));
              padding: 2px 6px;
              border-radius: 3px;
          }

          .actions {
              display: flex;
              gap: 8px;
              margin: 16px 0;
          }

          button {
              flex: 1;
              background-color: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
              border: none;
              padding: 8px 12px;
              font-size: 12px;
              font-weight: 600;
              border-radius: 4px;
              cursor: pointer;
              transition: background-color 0.15s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
          }

          button:hover {
              background-color: var(--vscode-button-hoverBackground);
          }

          button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
          }

          button.secondary {
              background-color: var(--vscode-button-secondaryBackground, rgba(128,128,128,0.2));
              color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
          }

          button.secondary:hover {
              background-color: var(--vscode-button-secondaryHoverBackground, rgba(128,128,128,0.3));
          }

          /* Problem content styling */
          .content {
              margin-bottom: 20px;
          }

          .content p {
              margin: 0 0 10px 0;
          }

          .content code {
              font-family: var(--vscode-editor-font-family, monospace);
              background-color: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.15));
              padding: 2px 4px;
              border-radius: 3px;
              font-size: 12px;
          }

          .content pre {
              background-color: var(--vscode-textBlockQuote-background, rgba(0,0,0,0.15));
              padding: 10px;
              border-radius: 4px;
              overflow-x: auto;
              border-left: 3px solid var(--vscode-textBlockQuote-border, var(--vscode-button-background));
              margin: 12px 0;
          }

          .content pre code {
              background-color: transparent;
              padding: 0;
              border-radius: 0;
          }

          .content ul, .content ol {
              margin: 0 0 10px 0;
              padding-left: 20px;
          }

          .content li {
              margin-bottom: 4px;
          }

          /* Hints section */
          .hints-header {
              font-size: 13px;
              font-weight: 600;
              margin: 16px 0 8px 0;
              border-bottom: 1px solid var(--vscode-divider, rgba(128,128,128,0.2));
              padding-bottom: 4px;
          }

          .hint-details {
              margin-bottom: 8px;
              border: 1px solid var(--vscode-divider, rgba(128,128,128,0.15));
              border-radius: 4px;
              background-color: var(--vscode-sideBar-background);
          }

          .hint-summary {
              padding: 8px 12px;
              font-weight: 600;
              cursor: pointer;
              outline: none;
              user-select: none;
          }

          .hint-summary:hover {
              background-color: rgba(128, 128, 128, 0.05);
          }

          .hint-content {
              padding: 10px 12px;
              border-top: 1px solid var(--vscode-divider, rgba(128,128,128,0.15));
              font-size: 12px;
              background-color: rgba(0, 0, 0, 0.1);
          }

          /* Console section */
          .console-container {
              margin-top: 24px;
              display: flex;
              flex-direction: column;
          }

          .console-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 6px;
              color: var(--vscode-sideBarTitle-foreground, var(--vscode-foreground));
          }

          .clear-btn {
              background: transparent;
              color: var(--vscode-descriptionForeground);
              padding: 2px 6px;
              font-size: 11px;
              font-weight: 500;
              border-radius: 3px;
              cursor: pointer;
              border: 1px solid var(--vscode-divider, rgba(128,128,128,0.2));
              flex: none;
          }

          .clear-btn:hover {
              background: rgba(128,128,128,0.1);
              color: var(--vscode-foreground);
          }

          .console-log {
              background-color: #0c0a0f;
              border: 1px solid #3c1e5a;
              box-shadow: 0 0 8px rgba(168, 85, 247, 0.15);
              border-radius: 4px;
              font-family: var(--vscode-editor-font-family, monospace);
              font-size: 11px;
              padding: 10px;
              min-height: 120px;
              max-height: 300px;
              overflow-y: auto;
              white-space: pre-wrap;
              color: #a855f7;
          }

          .console-log.running {
              border-color: #eab308;
              box-shadow: 0 0 8px rgba(234, 179, 8, 0.15);
          }

          .console-log.success {
              border-color: var(--difficulty-easy);
              box-shadow: 0 0 8px rgba(34, 197, 94, 0.15);
          }

          .console-log.failed {
              border-color: var(--difficulty-hard);
              box-shadow: 0 0 8px rgba(239, 68, 68, 0.15);
          }

          /* Loading indicator */
          .spinner {
              display: none;
              width: 14px;
              height: 14px;
              border: 2px solid rgba(255,255,255,0.2);
              border-radius: 50%;
              border-top-color: currentColor;
              animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
              to { transform: rotate(360deg); }
          }

          .running .spinner {
              display: inline-block;
          }

          .link-container {
              margin-top: 14px;
              text-align: center;
          }

          .leetcode-link {
              color: var(--vscode-textLink-foreground);
              text-decoration: none;
              font-size: 12px;
          }

          .leetcode-link:hover {
              text-decoration: underline;
          }
      </style>
  </head>
  <body>
      <div class="header">
          <div class="title-container">
              <h2>${problem.frontendId}. ${problem.title}</h2>
              <span class="difficulty-badge ${difficultyClass}">${problem.difficulty}</span>
          </div>
          <div class="stats">
              <span>\u{1F44D} ${problem.likes?.toLocaleString() || 0}</span>
              <span>\u{1F44E} ${problem.dislikes?.toLocaleString() || 0}</span>
          </div>
          <div class="tags-container">
              ${tagsHtml}
          </div>
      </div>

      <div class="actions">
          <button id="run-btn">
              <span class="spinner"></span>
              <span class="btn-text">\u25B6 Run</span>
          </button>
          <button id="submit-btn" class="secondary">
              <span class="spinner"></span>
              <span class="btn-text">\u{1F680} Submit</span>
          </button>
      </div>

      <div class="content">
          ${problem.description || problem.content}
      </div>

      ${hintsHtml.length > 0 ? `
          <div class="hints-header">Hints</div>
          <div class="hints-container">
              ${hintsHtml}
          </div>
      ` : ""}

      <div class="link-container">
          <a class="leetcode-link" href="https://leetcode.com/problems/${problem.titleSlug}/" target="_blank">\u{1F517} Open in LeetCode</a>
      </div>

      <div class="console-container">
          <div class="console-header">
              <span>Execution Output</span>
              <button class="clear-btn" id="clear-btn">Clear</button>
          </div>
          <div class="console-log" id="console-log">Console ready...</div>
      </div>

      <script>
          const vscode = acquireVsCodeApi();
          const runBtn = document.getElementById('run-btn');
          const submitBtn = document.getElementById('submit-btn');
          const clearBtn = document.getElementById('clear-btn');
          const consoleLog = document.getElementById('console-log');

          // Disable buttons & show loading spinners
          function setLoading(isLoading, type) {
              if (isLoading) {
                  runBtn.disabled = true;
                  submitBtn.disabled = true;
                  if (type === 'run') {
                      runBtn.classList.add('running');
                  } else {
                      submitBtn.classList.add('running');
                  }
                  consoleLog.className = 'console-log running';
              } else {
                  runBtn.disabled = false;
                  submitBtn.disabled = false;
                  runBtn.classList.remove('running');
                  submitBtn.classList.remove('running');
              }
          }

          runBtn.addEventListener('click', () => {
              setLoading(true, 'run');
              consoleLog.textContent = 'Running test cases on LeetCode...\\n';
              vscode.postMessage({ command: 'run' });
          });

          submitBtn.addEventListener('click', () => {
              setLoading(true, 'submit');
              consoleLog.textContent = 'Submitting code to LeetCode...\\n';
              vscode.postMessage({ command: 'submit' });
          });

          clearBtn.addEventListener('click', () => {
              consoleLog.textContent = 'Console cleared...';
              consoleLog.className = 'console-log';
          });

          // Handle messages sent from the extension
          window.addEventListener('message', event => {
              const message = event.data;
              switch (message.command) {
                  case 'log':
                      consoleLog.textContent += message.text;
                      // Auto-scroll to bottom
                      consoleLog.scrollTop = consoleLog.scrollHeight;
                      break;
                  case 'result':
                      setLoading(false);
                      consoleLog.textContent = message.output;
                      consoleLog.scrollTop = consoleLog.scrollHeight;
                      if (message.success) {
                          consoleLog.className = 'console-log success';
                      } else {
                          consoleLog.className = 'console-log failed';
                      }
                      break;
                  case 'error':
                      setLoading(false);
                      consoleLog.textContent += '\\nError: ' + message.text;
                      consoleLog.className = 'console-log failed';
                      break;
              }
          });
      </script>
  </body>
  </html>`;
}

// src/companyExplorer.ts
var vscode = __toESM(require("vscode"));

// src/cliRunner.ts
var cp = __toESM(require("child_process"));
var fs = __toESM(require_lib());
var path = __toESM(require("path"));
function stripAnsi(str) {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
}
function resolveCliPath() {
  const candidates = [
    path.resolve(__dirname, "..", "..", "dist", "index.js"),
    "/Users/divyanksisodia/lcx/dist/index.js"
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `LCX CLI executable not found. Checked: ${candidates.join(", ")}`
  );
}
async function runCliJsonCommand(args, cwd) {
  const cliPath = resolveCliPath();
  return await new Promise((resolve2, reject) => {
    const child = cp.spawn("node", [cliPath, ...args], {
      cwd,
      env: { ...process.env, FORCE_COLOR: "0" }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            stripAnsi(stderr.trim()) || `LCX command failed with exit code ${code ?? "unknown"}`
          )
        );
        return;
      }
      try {
        resolve2(JSON.parse(stdout.trim()));
      } catch (error) {
        reject(
          new Error(
            `Failed to parse LCX JSON output: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });
  });
}

// src/companyExplorer.ts
function escapeHtml2(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function formatNumber2(value) {
  return new Intl.NumberFormat("en-US").format(value);
}
function badgeClass(kind) {
  return kind === "company" ? "company" : "difficulty";
}
function renderStatsCards(stats) {
  return `
    <div class="stats-grid">
      <div class="card stat-card accent-green">
        <div class="label">Solved</div>
        <div class="value">${formatNumber2(stats.solvedCount)}</div>
        <div class="meta">${stats.solvedByDifficulty.Easy} Easy \xB7 ${stats.solvedByDifficulty.Medium} Medium \xB7 ${stats.solvedByDifficulty.Hard} Hard</div>
      </div>
      <div class="card stat-card accent-cyan">
        <div class="label">Attempts</div>
        <div class="value">${formatNumber2(stats.totalAttempts)}</div>
        <div class="meta">Acceptance ${escapeHtml2(stats.acceptanceRate)}</div>
      </div>
      <div class="card stat-card accent-amber">
        <div class="label">Most Attempted</div>
        <div class="value">${stats.mostAttempted.length}</div>
        <div class="meta">Tracked locally</div>
      </div>
    </div>
  `;
}
function renderMostAttempted(stats) {
  if (stats.mostAttempted.length === 0) {
    return `<p class="empty-note">No attempt history yet.</p>`;
  }
  return `
    <div class="mini-list">
      ${stats.mostAttempted.map(
    (item) => `
            <div class="mini-row">
              <div>
                <div class="mini-title">${escapeHtml2(item.title)}</div>
                <div class="mini-subtitle">${escapeHtml2(item.slug)}</div>
              </div>
              <div class="mini-pill">${item.count}x</div>
            </div>
          `
  ).join("")}
    </div>
  `;
}
function renderRecentAccepted(stats) {
  if (stats.recentAccepted.length === 0) {
    return `<p class="empty-note">No accepted submissions yet.</p>`;
  }
  return `
    <div class="mini-list">
      ${stats.recentAccepted.map(
    (item) => `
            <div class="mini-row">
              <div>
                <div class="mini-title">${escapeHtml2(item.title)}</div>
                <div class="mini-subtitle">${escapeHtml2(item.slug)}</div>
              </div>
              <div class="mini-pill success">Accepted</div>
            </div>
          `
  ).join("")}
    </div>
  `;
}
function renderWorkbookCards(summary) {
  return `
    <div class="stats-grid">
      <div class="card stat-card accent-violet">
        <div class="label">Sheets</div>
        <div class="value">${formatNumber2(summary.sheetCount)}</div>
        <div class="meta">${summary.companySheets.length} company \xB7 ${summary.difficultySheets.length} difficulty</div>
      </div>
      <div class="card stat-card accent-blue">
        <div class="label">Questions</div>
        <div class="value">${formatNumber2(summary.totalQuestions)}</div>
        <div class="meta">Across the workbook</div>
      </div>
      <div class="card stat-card accent-orange">
        <div class="label">Company Sheets</div>
        <div class="value">${formatNumber2(summary.companySheets.length)}</div>
        <div class="meta">Browsable sheets</div>
      </div>
    </div>
  `;
}
function renderSheetList(summary) {
  return `
    <div class="sheet-toolbar">
      <input
        class="search"
        id="sheet-filter"
        type="search"
        placeholder="Filter companies or difficulty sheets"
      />
      <div class="sheet-hint">${formatNumber2(summary.sheets.length)} sheets</div>
    </div>
    <div class="sheet-grid" id="sheet-grid">
      ${summary.sheets.map(
    (sheet) => `
            <button
              class="sheet-card"
              data-sheet="${escapeHtml2(sheet.name)}"
              data-search="${escapeHtml2(`${sheet.name} ${sheet.kind} ${sheet.totalQuestions} ${sheet.companyQuestions} ${sheet.dailyQuestions}`.toLowerCase())}"
              type="button"
            >
              <div class="sheet-card-header">
                <span class="sheet-name">${escapeHtml2(sheet.name)}</span>
                <span class="sheet-badge ${badgeClass(sheet.kind)}">${sheet.kind}</span>
              </div>
              <div class="sheet-count">${sheet.kind === "company" ? `${sheet.companyQuestions} company questions` : `${sheet.totalQuestions} questions`}</div>
              ${sheet.dailyQuestions > 0 ? `<div class="sheet-meta">${sheet.dailyQuestions} daily question${sheet.dailyQuestions === 1 ? "" : "s"}</div>` : ""}
            </button>
          `
  ).join("")}
    </div>
  `;
}
function renderSelectedSheet(sheet) {
  return `
    <div class="selected-sheet">
      <div class="sheet-toolbar compact">
        <div>
          <div class="selected-title">${escapeHtml2(sheet.name)}</div>
          <div class="selected-subtitle">${sheet.companyQuestions} company questions${sheet.dailyQuestions > 0 ? ` \xB7 ${sheet.dailyQuestions} daily` : ""}</div>
        </div>
        <div class="sheet-actions">
          <input
            class="search"
            id="question-filter"
            type="search"
            placeholder="Filter questions"
          />
          <button class="ghost-button" data-action="back" type="button">Back</button>
        </div>
      </div>

      <div class="question-list" id="question-list">
        ${sheet.questions.map(
    (question) => `
              <article
                class="question-row"
                data-search="${escapeHtml2(`${question.title} ${question.slug} ${question.topic || ""} ${question.difficulty || ""}`.toLowerCase())}"
              >
                <div class="question-main">
                  <div class="question-title">
                    ${question.isDailyQuestion ? '<span class="sheet-badge daily">daily</span>' : ""}
                    <span>${escapeHtml2(question.title)}</span>
                  </div>
                  <div class="question-meta">
                    <span>${escapeHtml2(question.slug)}</span>
                    ${question.topic ? `<span>${escapeHtml2(question.topic)}</span>` : ""}
                    ${question.difficulty ? `<span>${escapeHtml2(question.difficulty)}</span>` : ""}
                    <span>#${question.rowNumber}</span>
                  </div>
                </div>
                <button class="open-link" data-url="${escapeHtml2(question.url)}" type="button">Open</button>
              </article>
            `
  ).join("")}
      </div>
    </div>
  `;
}
function renderError2(message) {
  return `
    <div class="error-card">
      <div class="error-title">Workbook unavailable</div>
      <div class="error-message">${escapeHtml2(message)}</div>
      <div class="error-help">
        Set the workbook path once with:
        <code>lcx config set companyWorkbookPath /path/to/Leetcode problem set (company tag, sorted by freq).xlsx</code>
      </div>
    </div>
  `;
}
function getCompanyExplorerContent(state) {
  const hasData = Boolean(state.stats && state.summary);
  const statsSection = state.stats ? `
      <section class="panel-section" id="panel-stats" ${state.activeTab === "stats" ? "" : "hidden"}>
        <div class="section-header">
          <h2>Stats</h2>
          <span class="section-chip">Local + workbook overview</span>
        </div>
        ${renderStatsCards(state.stats)}
        <div class="card stack-card">
          <h3>Attempted Problems</h3>
          ${renderMostAttempted(state.stats)}
        </div>
        <div class="card stack-card">
          <h3>Recent Accepted</h3>
          ${renderRecentAccepted(state.stats)}
        </div>
      </section>
    ` : "";
  const companiesSection = state.summary ? `
      <section class="panel-section" id="panel-companies" ${state.activeTab === "companies" ? "" : "hidden"}>
        <div class="section-header">
          <h2>Companies</h2>
          <span class="section-chip">${formatNumber2(state.summary.companySheets.length)} company sheets</span>
        </div>
        ${renderWorkbookCards(state.summary)}
        ${state.loadingSheet ? `<div class="loading-pill">Loading ${escapeHtml2(state.loadingSheet)}...</div>` : ""}
        ${state.selectedSheet ? `<div class="card stack-card">${renderSelectedSheet(state.selectedSheet)}</div>` : `<div class="card stack-card">${renderSheetList(state.summary)}</div>`}
      </section>
    ` : "";
  const title = state.errorMessage ? "LCX Workbook Explorer" : hasData ? `LCX Workbook Explorer \xB7 ${state.summary?.sheetCount ?? 0} sheets` : "LCX Workbook Explorer";
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        :root {
          --bg: var(--vscode-sideBar-background);
          --bg-elevated: color-mix(in srgb, var(--vscode-editor-background) 86%, transparent);
          --border: color-mix(in srgb, var(--vscode-foreground) 12%, transparent);
          --text: var(--vscode-foreground);
          --muted: var(--vscode-descriptionForeground);
          --accent: var(--vscode-button-background);
          --accent-strong: var(--vscode-button-hoverBackground);
        }

        body {
          margin: 0;
          padding: 18px;
          background:
            radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 14%, transparent), transparent 34%),
            linear-gradient(180deg, color-mix(in srgb, var(--bg) 94%, black) 0%, var(--bg) 100%);
          color: var(--text);
          font-family: var(--vscode-font-family, system-ui, sans-serif);
        }

        * {
          box-sizing: border-box;
        }

        button,
        input {
          font: inherit;
        }

        .shell {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .hero {
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 18px;
          background: linear-gradient(135deg, color-mix(in srgb, var(--bg-elevated) 92%, transparent), color-mix(in srgb, var(--accent) 6%, transparent));
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.14);
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 11px;
          color: var(--muted);
          margin-bottom: 6px;
        }

        h1 {
          margin: 0;
          font-size: 22px;
          line-height: 1.2;
        }

        .subtitle {
          margin-top: 8px;
          color: var(--muted);
          font-size: 13px;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .tab-button,
        .ghost-button {
          border: 1px solid var(--border);
          border-radius: 999px;
          background: color-mix(in srgb, var(--bg-elevated) 90%, transparent);
          color: var(--text);
          padding: 8px 14px;
          cursor: pointer;
          transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
        }

        .tab-button:hover,
        .ghost-button:hover,
        .sheet-card:hover,
        .open-link:hover {
          transform: translateY(-1px);
          border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
        }

        .tab-button.active {
          background: color-mix(in srgb, var(--accent) 20%, var(--bg-elevated));
          border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
        }

        .panel-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .section-header h2,
        .stack-card h3 {
          margin: 0;
          font-size: 16px;
        }

        .section-chip {
          border-radius: 999px;
          padding: 5px 10px;
          border: 1px solid var(--border);
          font-size: 12px;
          color: var(--muted);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 12px;
        }

        .card {
          border: 1px solid var(--border);
          border-radius: 18px;
          background: color-mix(in srgb, var(--bg-elevated) 94%, transparent);
        }

        .stat-card {
          padding: 16px;
        }

        .stat-card .label {
          color: var(--muted);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .stat-card .value {
          margin-top: 10px;
          font-size: 28px;
          font-weight: 700;
        }

        .stat-card .meta {
          margin-top: 6px;
          color: var(--muted);
          font-size: 12px;
        }

        .accent-green { box-shadow: inset 0 1px 0 rgba(34, 197, 94, 0.14); }
        .accent-cyan { box-shadow: inset 0 1px 0 rgba(6, 182, 212, 0.14); }
        .accent-amber { box-shadow: inset 0 1px 0 rgba(245, 158, 11, 0.14); }
        .accent-violet { box-shadow: inset 0 1px 0 rgba(139, 92, 246, 0.14); }
        .accent-blue { box-shadow: inset 0 1px 0 rgba(59, 130, 246, 0.14); }
        .accent-orange { box-shadow: inset 0 1px 0 rgba(249, 115, 22, 0.14); }

        .stack-card {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mini-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mini-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
          background: color-mix(in srgb, var(--bg) 78%, transparent);
        }

        .mini-title,
        .selected-title {
          font-weight: 600;
        }

        .mini-subtitle,
        .selected-subtitle,
        .empty-note,
        .sheet-meta,
        .sheet-count {
          color: var(--muted);
          font-size: 12px;
        }

        .mini-pill,
        .sheet-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--accent) 10%, transparent);
        }

        .mini-pill.success,
        .sheet-badge.company {
          background: color-mix(in srgb, #22c55e 18%, transparent);
        }

        .sheet-badge.difficulty {
          background: color-mix(in srgb, #f59e0b 18%, transparent);
        }

        .sheet-badge.daily {
          background: color-mix(in srgb, #10b981 18%, transparent);
        }

        .sheet-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sheet-toolbar.compact {
          align-items: flex-start;
        }

        .search {
          flex: 1;
          min-width: 220px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg) 84%, transparent);
          color: var(--text);
          padding: 10px 12px;
          outline: none;
        }

        .search:focus {
          border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent);
        }

        .sheet-hint {
          color: var(--muted);
          font-size: 12px;
        }

        .sheet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .sheet-card {
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 14px;
          text-align: left;
          background: color-mix(in srgb, var(--bg-elevated) 92%, transparent);
          color: var(--text);
          cursor: pointer;
          transition: transform 120ms ease, border-color 120ms ease;
        }

        .sheet-card-header,
        .question-title,
        .question-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .sheet-name {
          font-weight: 600;
        }

        .sheet-count {
          margin-top: 8px;
        }

        .question-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 60vh;
          overflow: auto;
          padding-right: 2px;
        }

        .question-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 12px 14px;
          background: color-mix(in srgb, var(--bg) 84%, transparent);
        }

        .question-main {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .question-title {
          font-weight: 600;
        }

        .question-meta {
          color: var(--muted);
          font-size: 12px;
        }

        .open-link {
          border: 1px solid var(--border);
          border-radius: 999px;
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          color: var(--text);
          padding: 8px 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .selected-sheet {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sheet-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ghost-button {
          white-space: nowrap;
        }

        .loading-pill {
          align-self: flex-start;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 6px 10px;
          color: var(--muted);
          font-size: 12px;
          background: color-mix(in srgb, var(--accent) 8%, transparent);
        }

        .error-card {
          border: 1px solid color-mix(in srgb, #ef4444 38%, var(--border));
          background: color-mix(in srgb, #ef4444 9%, var(--bg-elevated));
          border-radius: 18px;
          padding: 18px;
        }

        .error-title {
          font-weight: 700;
          font-size: 16px;
        }

        .error-message,
        .error-help {
          margin-top: 8px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.6;
        }

        .error-help code {
          display: block;
          margin-top: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--bg) 78%, transparent);
          color: var(--text);
          overflow: auto;
        }

        [hidden] {
          display: none !important;
        }
      </style>
    </head>
    <body>
      <div class="shell">
        <header class="hero">
          <div class="eyebrow">LCX Workbook Explorer</div>
          <h1>${escapeHtml2(title)}</h1>
          <div class="subtitle">
            ${state.summary ? `Loaded ${formatNumber2(state.summary.sheetCount)} sheets from <code>${escapeHtml2(state.summary.workbookPath)}</code>` : "Connect the workbook path in your LCX config to browse companies and sheet stats."}
          </div>
          <div class="tabs">
            <button class="tab-button ${state.activeTab === "stats" ? "active" : ""}" data-tab="stats" type="button">Stats</button>
            <button class="tab-button ${state.activeTab === "companies" ? "active" : ""}" data-tab="companies" type="button">Companies</button>
            <button class="tab-button" data-tab="refresh" type="button">Refresh</button>
          </div>
        </header>

        ${state.errorMessage ? renderError2(state.errorMessage) : ""}
        ${statsSection}
        ${companiesSection}
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        document.querySelectorAll('[data-tab]').forEach((button) => {
          button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            if (tab === 'refresh') {
              vscode.postMessage({ command: 'refresh' });
              return;
            }
            vscode.postMessage({ command: 'switchTab', tab });
          });
        });

        document.querySelectorAll('[data-sheet]').forEach((button) => {
          button.addEventListener('click', () => {
            vscode.postMessage({ command: 'loadSheet', sheetName: button.getAttribute('data-sheet') });
          });
        });

        document.querySelectorAll('[data-url]').forEach((button) => {
          button.addEventListener('click', () => {
            vscode.postMessage({ command: 'openUrl', url: button.getAttribute('data-url') });
          });
        });

        const backButton = document.querySelector('[data-action="back"]');
        if (backButton) {
          backButton.addEventListener('click', () => {
            vscode.postMessage({ command: 'clearSheet' });
          });
        }

        const sheetFilter = document.getElementById('sheet-filter');
        if (sheetFilter) {
          sheetFilter.addEventListener('input', () => {
            const term = sheetFilter.value.trim().toLowerCase();
            document.querySelectorAll('[data-search]').forEach((card) => {
              const text = card.getAttribute('data-search') || '';
              card.style.display = text.includes(term) ? '' : 'none';
            });
          });
        }

        const questionFilter = document.getElementById('question-filter');
        if (questionFilter) {
          questionFilter.addEventListener('input', () => {
            const term = questionFilter.value.trim().toLowerCase();
            document.querySelectorAll('#question-list [data-search]').forEach((row) => {
              const text = row.getAttribute('data-search') || '';
              row.style.display = text.includes(term) ? '' : 'none';
            });
          });
        }
      </script>
    </body>
  </html>`;
}
var CompanyExplorerPanel = class _CompanyExplorerPanel {
  constructor(panel, extensionUri, initialTab) {
    this.extensionUri = extensionUri;
    this.panel = panel;
    this.state.activeTab = initialTab;
    this.panel.onDidDispose(() => {
      this.disposed = true;
      if (_CompanyExplorerPanel.currentPanel === this) {
        _CompanyExplorerPanel.currentPanel = void 0;
      }
    });
    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "switchTab":
          this.state.activeTab = message.tab === "companies" ? "companies" : "stats";
          this.render();
          break;
        case "loadSheet":
          if (typeof message.sheetName === "string" && message.sheetName.trim()) {
            await this.loadSheet(message.sheetName.trim());
          }
          break;
        case "clearSheet":
          this.state.selectedSheet = null;
          this.state.loadingSheet = null;
          this.state.errorMessage = null;
          this.render();
          break;
        case "openUrl":
          if (typeof message.url === "string" && message.url) {
            vscode.env.openExternal(vscode.Uri.parse(message.url));
          }
          break;
        case "refresh":
          await this.refresh();
          break;
      }
    });
  }
  extensionUri;
  static currentPanel;
  panel;
  state = {
    activeTab: "stats",
    stats: null,
    summary: null,
    selectedSheet: null,
    loadingSheet: null,
    errorMessage: null
  };
  disposed = false;
  static async show(extensionUri, initialTab) {
    if (_CompanyExplorerPanel.currentPanel) {
      _CompanyExplorerPanel.currentPanel.state.activeTab = initialTab;
      _CompanyExplorerPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      _CompanyExplorerPanel.currentPanel.render();
      await _CompanyExplorerPanel.currentPanel.refresh();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      "lcxWorkbookExplorer",
      "LCX Workbook Explorer",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    _CompanyExplorerPanel.currentPanel = new _CompanyExplorerPanel(
      panel,
      extensionUri,
      initialTab
    );
    await _CompanyExplorerPanel.currentPanel.refresh();
  }
  async refresh() {
    if (this.disposed) {
      return;
    }
    this.state.loadingSheet = null;
    this.state.errorMessage = null;
    try {
      const [stats, summary] = await Promise.all([
        runCliJsonCommand(["stats", "--json"]),
        runCliJsonCommand(["companies", "--json"])
      ]);
      this.state.stats = stats;
      this.state.summary = summary;
      this.render();
    } catch (error) {
      this.state.stats = null;
      this.state.summary = null;
      this.state.selectedSheet = null;
      this.state.errorMessage = error instanceof Error ? error.message : String(error);
      this.render();
    }
  }
  async loadSheet(sheetName) {
    if (this.disposed) {
      return;
    }
    this.state.loadingSheet = sheetName;
    this.state.errorMessage = null;
    this.render();
    try {
      const payload = await runCliJsonCommand([
        "companies",
        sheetName,
        "--json",
        "--all"
      ]);
      this.state.selectedSheet = payload.sheet;
      this.state.activeTab = "companies";
      this.render();
    } catch (error) {
      this.state.selectedSheet = null;
      this.state.errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      this.state.loadingSheet = null;
      this.render();
    }
  }
  render() {
    if (this.disposed) {
      return;
    }
    this.panel.webview.html = getCompanyExplorerContent(this.state);
  }
};

// src/extension.ts
var activeProblem = null;
function activate(context) {
  const provider = new IcarusProblemViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode2.window.registerWebviewViewProvider(
      "icarus-sidebar-view",
      provider
    )
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("lcx.showProblemDescription", async () => {
      await vscode2.commands.executeCommand("workbench.view.extension.icarus");
      provider.refresh();
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("lcx.run", () => {
      provider.runLcxCommand("run");
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("lcx.submit", () => {
      provider.runLcxCommand("submit");
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("lcx.showStats", async () => {
      await CompanyExplorerPanel.show(context.extensionUri, "stats");
    })
  );
  context.subscriptions.push(
    vscode2.commands.registerCommand("lcx.showCompanies", async () => {
      await CompanyExplorerPanel.show(context.extensionUri, "companies");
    })
  );
  context.subscriptions.push(
    vscode2.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        provider.checkActiveEditor(editor.document.fileName);
      } else {
        provider.clearActiveProblem();
      }
    })
  );
  if (vscode2.window.activeTextEditor) {
    provider.checkActiveEditor(
      vscode2.window.activeTextEditor.document.fileName
    );
  }
}
var IcarusProblemViewProvider = class {
  constructor(_extensionUri) {
    this._extensionUri = _extensionUri;
  }
  _extensionUri;
  _view;
  emptyStateMode = "home";
  emptyStateSummary = null;
  emptyStateSelectedCompany = null;
  emptyStateLoadingLabel = null;
  emptyStateErrorMessage = null;
  resolveWebviewView(webviewView, context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    this.updateWebview();
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "run":
          this.runLcxCommand("run");
          break;
        case "submit":
          this.runLcxCommand("submit");
          break;
        case "browseCompanies":
          await this.showCompanyBrowser();
          break;
        case "backHome":
          this.goBackHome();
          break;
        case "backCompanies":
          this.goBackToCompanies();
          break;
        case "selectCompany":
          if (typeof message.companyName === "string" && message.companyName) {
            await this.selectCompany(message.companyName);
          }
          break;
        case "openProblem":
          if (typeof message.slug === "string" && message.slug) {
            await this.openProblemFromSidebar(message.slug);
          }
          break;
      }
    });
  }
  refresh() {
    this.updateWebview();
  }
  clearActiveProblem() {
    if (!activeProblem) {
      this.updateWebview();
      return;
    }
    activeProblem = null;
    this.updateWebview();
  }
  // Check if opened file is inside the local solutions folder and load problem.json
  checkActiveEditor(filePath) {
    const parentDir = path2.dirname(filePath);
    const metaPath = path2.join(parentDir, "metadata.json");
    const fileName = path2.basename(filePath);
    const isSolutionFile = fileName.startsWith("solution.latest.") || fileName.startsWith("solution.accepted-submit.");
    if (isSolutionFile && fs2.existsSync(metaPath)) {
      try {
        const metadata = fs2.readJsonSync(metaPath);
        activeProblem = {
          slug: metadata.titleSlug,
          dir: parentDir,
          solutionPath: filePath,
          language: metadata.language
        };
        this.updateWebview();
      } catch (err) {
        activeProblem = null;
        console.error("Failed to read metadata.json:", err);
        this.updateWebview();
      }
      return;
    }
    activeProblem = null;
    this.updateWebview();
  }
  updateWebview() {
    if (!this._view) {
      return;
    }
    if (!activeProblem) {
      this._view.webview.html = getWebviewContent(
        null,
        this.getEmptyState()
      );
      return;
    }
    const problemJsonPath = path2.join(activeProblem.dir, "problem.json");
    const metaPath = path2.join(activeProblem.dir, "metadata.json");
    try {
      if (fs2.existsSync(problemJsonPath)) {
        const problemData = fs2.readJsonSync(problemJsonPath);
        this._view.webview.html = getWebviewContent(problemData);
      } else if (fs2.existsSync(metaPath)) {
        const metadata = fs2.readJsonSync(metaPath);
        this._view.webview.html = getWebviewContent({
          frontendId: metadata.frontendId,
          title: metadata.title,
          titleSlug: metadata.titleSlug,
          difficulty: metadata.difficulty,
          likes: 0,
          dislikes: 0,
          topicTags: metadata.topicTags || [],
          description: `<p>Problem statement is not cached locally. Run <code>lcx open ${metadata.titleSlug}</code> in the terminal to download it.</p>`,
          hints: []
        });
      }
    } catch (err) {
      this._view.webview.html = getWebviewContent(
        null,
        this.getEmptyState()
      );
    }
  }
  getEmptyState() {
    return {
      mode: this.emptyStateMode,
      summary: this.emptyStateSummary,
      selectedCompany: this.emptyStateSelectedCompany,
      loadingLabel: this.emptyStateLoadingLabel,
      errorMessage: this.emptyStateErrorMessage
    };
  }
  async showCompanyBrowser() {
    this.emptyStateMode = "companies";
    this.emptyStateErrorMessage = null;
    if (this.emptyStateSummary) {
      this.updateWebview();
      return;
    }
    this.emptyStateLoadingLabel = "Loading company workbook...";
    this.updateWebview();
    try {
      this.emptyStateSummary = await runCliJsonCommand([
        "companies",
        "--json"
      ]);
    } catch (error) {
      this.emptyStateErrorMessage = error instanceof Error ? error.message : String(error);
      this.emptyStateMode = "home";
    } finally {
      this.emptyStateLoadingLabel = null;
      this.updateWebview();
    }
  }
  goBackHome() {
    this.emptyStateMode = "home";
    this.emptyStateSelectedCompany = null;
    this.emptyStateLoadingLabel = null;
    this.emptyStateErrorMessage = null;
    this.updateWebview();
  }
  goBackToCompanies() {
    this.emptyStateMode = "companies";
    this.emptyStateSelectedCompany = null;
    this.emptyStateLoadingLabel = null;
    this.emptyStateErrorMessage = null;
    this.updateWebview();
  }
  async selectCompany(companyName) {
    this.emptyStateLoadingLabel = `Loading ${companyName} questions...`;
    this.emptyStateErrorMessage = null;
    this.updateWebview();
    try {
      const payload = await runCliJsonCommand([
        "companies",
        companyName,
        "--json",
        "--all"
      ]);
      this.emptyStateSelectedCompany = payload.sheet;
      this.emptyStateMode = "problems";
    } catch (error) {
      this.emptyStateErrorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      this.emptyStateLoadingLabel = null;
      this.updateWebview();
    }
  }
  async openProblemFromSidebar(slug) {
    this.emptyStateLoadingLabel = `Opening ${slug}...`;
    this.emptyStateErrorMessage = null;
    this.updateWebview();
    try {
      const result = await runCliJsonCommand([
        "open",
        slug,
        "--json",
        "--no-editor"
      ]);
      const document = await vscode2.workspace.openTextDocument(
        vscode2.Uri.file(result.solutionPath)
      );
      await vscode2.window.showTextDocument(document, { preview: false });
    } catch (error) {
      this.emptyStateErrorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      this.emptyStateLoadingLabel = null;
      this.updateWebview();
    }
  }
  // Spawn the CLI to execute "run" or "submit" commands.
  runLcxCommand(type) {
    if (!activeProblem) {
      vscode2.window.showErrorMessage("No active LeetCode solution file is open.");
      return;
    }
    if (!this._view) {
      return;
    }
    const webview = this._view.webview;
    let cliPath;
    try {
      cliPath = resolveCliPath();
    } catch (error) {
      webview.postMessage({
        command: "error",
        text: error instanceof Error ? error.message : "LCX CLI executable not found."
      });
      return;
    }
    const child = cp2.spawn("node", [cliPath, type], {
      cwd: activeProblem.dir,
      env: { ...process.env, FORCE_COLOR: "0" }
    });
    let outputBuffer = "";
    child.stdout.on("data", (data) => {
      const text = stripAnsi(data.toString());
      outputBuffer += text;
      webview.postMessage({ command: "log", text });
    });
    child.stderr.on("data", (data) => {
      const text = stripAnsi(data.toString());
      outputBuffer += text;
      webview.postMessage({ command: "log", text });
    });
    child.on("close", (code) => {
      const success = code === 0 && (outputBuffer.includes("Accepted") || outputBuffer.includes("\u2714") || outputBuffer.includes("Compilation Success"));
      webview.postMessage({
        command: "result",
        success,
        output: outputBuffer
      });
    });
    child.on("error", (err) => {
      webview.postMessage({
        command: "error",
        text: err.message
      });
    });
  }
};
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map