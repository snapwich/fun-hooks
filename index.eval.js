create.SYNC = 1;
create.ASYNC = 2;
create.QUEUE = 4;

var packageName = "fun-hooks";

var hasProxy = typeof Proxy === "function";

var defaults = Object.freeze({
  useProxy: hasProxy,
  ready: 0
});

var baseObj = Object.getPrototypeOf({});

// detect incorrectly implemented reduce and if found use polyfill
// https://github.com/prebid/Prebid.js/issues/3576
// polyfill from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce
var reduce =
  [1]
    .reduce(function(a, b, c) {
      return [a, b, c];
    }, 2)
    .toString() === "2,1,0"
    ? Array.prototype.reduce
    : function(callback, initial) {
      var o = Object(this);
      var len = o.length >>> 0;
      var k = 0;
      var value;
      if (initial) {
        value = initial;
      } else {
        while (k < len && !(k in o)) {
          k++;
        }
        value = o[k++];
      }
      while (k < len) {
        if (k in o) {
          value = callback(value, o[k], k, o);
        }
        k++;
      }
      return value;
    };

// detect incorrectly implemented bind and if found use polyfill
// https://github.com/snapwich/fun-hooks/issues/1
var bind =
  function(a, b) {
    return b;
  }.bind(null, 1, 4)() === 4
    ? Function.prototype.bind
    : function(bind) {
      var self = this;
      var args = rest(arguments, 1);
      return function() {
        return self.apply(bind, args.concat(rest(arguments)));
      };
    };

function assign(target) {
  return reduce.call(
    rest(arguments, 1),
    function(target, obj) {
      if (obj) {
        Object.keys(obj).forEach(function(prop) {
          target[prop] = obj[prop];
        });
      }
      return target;
    },
    target
  );
}

function rest(args, skip) {
  return Array.prototype.slice.call(args, skip);
}

function runAll(queue) {
  var queued;
  // eslint-disable-next-line no-cond-assign
  while ((queued = queue.shift())) {
    queued();
  }
}

function create(config) {
  var hooks = {};
  var postReady = [];

  config = assign({}, defaults, config);

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
      props = Object.getOwnPropertyNames(obj);
      walk = false;
    }
    var objHooks = {};
    var doNotHook = ["constructor"];
    do {
      props = props.filter(function(prop) {
        return (
          typeof obj[prop] === "function" &&
          !(doNotHook.indexOf(prop) !== -1) &&
          !prop.match(/^_/)
        );
      });
      props.forEach(function(prop) {
        var parts = prop.split(":");
        var name = parts[0];
        var type = parts[1] || "sync";
        if (!objHooks[name]) {
          var fn = obj[name];
          objHooks[name] = obj[name] = hookFn(
            type,
            fn,
            objName ? [objName, name] : undefined
          );
        }
      });
      obj = Object.getPrototypeOf(obj);
    } while (walk && obj !== baseObj);
    return objHooks;
  }

  /**
   * Navigates a string path to return a hookable function.  If not found, creates a placeholder for hooks.
   * @param {(Array<string> | string)} path
   */
  function get(path) {
    var parts = Array.isArray(path) ? path : path.split(".");
    return reduce.call(
      parts,
      function(memo, part, i) {
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
      },
      hooks
    );
  }

  function newHookable(onInstall) {
    var before = [];
    var after = [];
    var generateTrap = function() {};

    return {
      __funHook: {
        install: function(type, fn, generate) {
          this.type = type;
          this.fn = fn;
          generateTrap = generate;
          generate(before, after);
          onInstall && onInstall(fn);
        }
      },
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
        return assign(hooks, {
          remove: function() {
            hooks.forEach(function(entry) {
              entry.remove();
            });
            return this;
          }
        });
      },
      removeAll: function() {
        return this.getHooks().remove();
      }
    };

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
    if (fn.__funHook) {
      if (fn.__funHook.type !== type) {
        throw packageName + ": recreated hookable with different type";
      } else {
        return fn.__funHook.fn;
      }
    }

    var hookable = name ? get(name) : newHookable();

    var trap;
    var hookedFn;
    var handlers = {
      get: function(target, prop) {
        return hookable[prop] || Reflect.get.apply(Reflect, arguments);
      }
    };

    if (!ready) {
      postReady.push(setTrap);
    }

    if (config.useProxy) {
      hookedFn = new Proxy(fn, handlers);
    } else {
      hookedFn = function() {
        return handlers.apply
          ? handlers.apply(fn, this, rest(arguments))
          : fn.apply(this, arguments);
      };
      assign(hookedFn, hookable);
    }

    hookable.__funHook.install(type, hookedFn, generateTrap);

    return hookedFn;

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
        trap = bind.call(
          new Function("i,b,a,n,t,h,g", code),
          null,
          bind,
          before,
          after,
          Object.assign || assign
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

module.exports = create;
