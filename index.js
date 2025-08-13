create.SYNC = 1;
create.ASYNC = 2;
create.QUEUE = 4;

var packageName = "fun-hooks";

var defaults = Object.freeze({
  ready: 0
});

var hookableMap = new WeakMap();

function rest(args, skip) {
  return Array.prototype.slice.call(args, skip);
}

function runAll(queue) {
  var queued;

  while ((queued = queue.shift())) {
    queued();
  }
}

function create(config) {
  var hooks = {};
  var postReady = [];

  config = Object.assign({}, defaults, config);

  function dispatch(arg1, arg2) {
    if (typeof arg1 === "function") {
      return hookFn.call(null, "sync", arg1, arg2);
    } else if (typeof arg1 === "string" && typeof arg2 === "function") {
      return hookFn.apply(null, arguments);
    } else if (typeof arg1 === "object") {
      return hookObj.apply(null, arguments);
    }
  }

  var ready;
  if (config.ready) {
    dispatch.ready = function() {
      ready = true;
      runAll(postReady);
    };
  } else {
    ready = true;
  }

  function hookObj(obj, props, objName) {
    var walk = true;
    if (typeof props === "undefined") {
      props = Object.getOwnPropertyNames(obj).filter(prop => !prop.match(/^_/));
      walk = false;
    }
    var objHooks = {};
    var doNotHook = ["constructor"];
    do {
      props.forEach(function(prop) {
        var parts = prop.match(/(?:(sync|async):)?(.+)/);
        var type = parts[1] || "sync";
        var name = parts[2];
        if (
          !objHooks[name] &&
          typeof obj[name] === "function" &&
          !(doNotHook.indexOf(name) !== -1)
        ) {
          var fn = obj[name];
          objHooks[name] = obj[name] = hookFn(
            type,
            fn,
            objName ? [objName, name] : undefined
          );
        }
      });
      obj = Object.getPrototypeOf(obj);
    } while (walk && obj);
    return objHooks;
  }

  /**
   * Navigates a string path to return a hookable function.  If not found, creates a placeholder for hooks.
   * @param {(Array<string> | string)} path
   */
  function get(path) {
    var parts = Array.isArray(path) ? path : path.split(".");
    return parts.reduce(function(memo, part, i) {
      var item = memo[part];
      var installed = false;
      if (item) {
        return item;
      } else if (i === parts.length - 1) {
        if (!ready) {
          postReady.push(function() {
            if (!installed) {
              // eslint-disable-next-line no-console
              console.warn(
                packageName +
                  ": referenced '" +
                  path +
                  "' but it was never created"
              );
            }
          });
        }
        return (memo[part] = newHookable(function(fn) {
          memo[part] = fn;
          installed = true;
        }));
      }
      return (memo[part] = {});
    }, hooks);
  }

  function newHookable(onInstall) {
    var before = [];
    var after = [];
    var generateTrap = function() {};

    var api = {
      before: function(hook, priority) {
        return add.call(this, before, "before", hook, priority);
      },
      after: function(hook, priority) {
        return add.call(this, after, "after", hook, priority);
      },
      getHooks: function(match) {
        var hooks = before.concat(after);
        if (typeof match === "object") {
          hooks = hooks.filter(function(entry) {
            return Object.keys(match).every(function(prop) {
              return entry[prop] === match[prop];
            });
          });
        }
        try {
          Object.assign(hooks, {
            remove: function() {
              hooks.forEach(function(entry) {
                entry.remove();
              });
              return this;
            }
          });
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(
            "error adding `remove` to array, did you modify Array.prototype?"
          );
        }
        return hooks;
      },
      removeAll: function() {
        return this.getHooks().remove();
      }
    };

    var meta = {
      install: function(type, fn, generate) {
        this.type = type;
        generateTrap = generate;
        generate(before, after);
        onInstall && onInstall(fn);
      }
    };

    // store meta data related to hookable. use `api.after` since `api` reference is not available on our proxy.
    hookableMap.set(api.after, meta);

    return api;

    function add(store, type, hook, priority) {
      var entry = {
        hook: hook,
        type: type,
        priority: priority || 10,
        remove: function() {
          var index = store.indexOf(entry);
          if (index !== -1) {
            store.splice(index, 1);
            generateTrap(before, after);
          }
        }
      };
      store.push(entry);
      store.sort(function(a, b) {
        return b.priority - a.priority;
      });
      generateTrap(before, after);
      return this;
    }
  }

  function hookFn(type, fn, name) {
    // check if function has already been wrapped
    var meta = fn.after && hookableMap.get(fn.after);
    if (meta) {
      if (meta.type !== type) {
        throw packageName + ": recreated hookable with different type";
      } else {
        return fn;
      }
    }

    var hookable = name ? get(name) : newHookable();

    var trap;

    var handlers = {
      get: function(target, prop) {
        return hookable[prop] || Reflect.get.apply(Reflect, arguments);
      }
    };

    if (!ready) {
      postReady.push(setTrap);
    }

    var hookedFn = new Proxy(fn, handlers);

    hookableMap.get(hookedFn.after).install(type, hookedFn, generateTrap);

    return hookedFn;

    /* @ifdef EVAL */
    function generateTrap(before, after) {
      if (before.length || after.length) {
        var code;
        if (type === "sync") {
          var beforeCode =
            "r=t.apply(h," + (before.length ? "arguments" : "g") + ")";
          var afterCode;
          if (after.length) {
            afterCode = chainHooks(after, "a", "n(function extract(s){r=s},e)");
          }
          if (before.length) {
            beforeCode = chainHooks(
              before,
              "b",
              "n(function extract(){" + beforeCode + ";" + afterCode + "},e)"
            );
            afterCode = "";
          }
          code = [
            "var r,e={bail:function(a){r=a}}",
            beforeCode,
            afterCode,
            "return r"
          ].join(";");
        } else if (type === "async") {
          code =
            "t.apply(h," +
            (before.length
              ? "Array.prototype.slice.call(arguments)" // if we're wrapped in partial, extract arguments
              : "g") + // otherwise, we can just use passed in arguments
            ".concat(" +
            chainHooks(after, "a", "z?n(z,e):[]") +
            "))";
          if (before.length) {
            code = "n(function partial(){" + code + "},e)";
          }
          code = [
            "var z",
            'typeof g[g.length-1]==="function"&&(z=i.call(g.pop(),null))',
            "var e={bail:z}",
            chainHooks(before, "b", code)
          ].join(";");
        }
        trap = new Function("i,b,a,n,t,h,g", code).bind(
          null,
          Function.prototype.bind,
          before,
          after,
          Object.assign
        );
      } else {
        trap = undefined;
      }
      setTrap();

      function chainHooks(hooks, name, code) {
        for (var i = hooks.length; i-- > 0; ) {
          if (i === 0 && !(type === "async" && name === "a")) {
            code =
              name +
              "[" +
              i +
              "].hook.apply(h,[" +
              code +
              (name === "b" ? "].concat(g))" : ",r])");
          } else {
            code = "i.call(" + name + "[" + i + "].hook, h," + code + ")";
            if (!(type === "async" && name === "a" && i === 0)) {
              code = "n(" + code + ",e)";
            }
          }
        }
        return code;
      }
    }
    /* @endif */
    /* @ifndef EVAL */
    // eslint-disable-next-line no-redeclare
    function generateTrap(before, after) {
      var order = [];
      var targetIndex;
      if (before.length || after.length) {
        before.forEach(addToOrder);
        // placeholder for target function wrapper
        targetIndex = order.push(undefined) - 1;
        after.forEach(addToOrder);
        trap = function(target, thisArg, args) {
          var localOrder = order.slice();
          var curr = 0;
          var result;
          var callback =
            type === "async" &&
            typeof args[args.length - 1] === "function" &&
            args.pop();
          function bail(value) {
            if (type === "sync") {
              result = value;
            } else if (callback) {
              callback.apply(null, arguments);
            }
          }
          function next(value) {
            if (localOrder[curr]) {
              var args = rest(arguments);
              next.bail = bail;
              args.unshift(next);
              return localOrder[curr++].apply(thisArg, args);
            }
            if (type === "sync") {
              result = value;
            } else if (callback) {
              callback.apply(null, arguments);
            }
          }
          localOrder[targetIndex] = function() {
            var args = rest(arguments, 1);
            if (type === "async" && callback) {
              delete next.bail;
              args.push(next);
            }
            var result = target.apply(thisArg, args);
            if (type === "sync") {
              next(result);
            }
          };
          next.apply(null, args);
          return result;
        };
      } else {
        trap = undefined;
      }
      setTrap();

      function addToOrder(entry) {
        order.push(entry.hook);
      }
    }
    /* @endif */

    function setTrap() {
      if (
        ready ||
        (type === "sync" && !(config.ready & create.SYNC)) ||
        (type === "async" && !(config.ready & create.ASYNC))
      ) {
        handlers.apply = trap;
      } else if (type === "sync" || !(config.ready & create.QUEUE)) {
        handlers.apply = function() {
          throw packageName + ": hooked function not ready";
        };
      } else {
        handlers.apply = function() {
          var args = arguments;
          postReady.push(function() {
            hookedFn.apply(args[1], args[2]);
          });
        };
      }
    }
  }

  dispatch.get = get;
  return dispatch;
}

/* global module */
module.exports = create;
