const hasProxy = typeof Proxy === 'function';

function create(config = {}) {
  let hooks = {};
  let useProxy = typeof config.useProxy !== 'undefined' ? config.useProxy : hasProxy;

  function dispatch(arg1, arg2) {
    if (typeof arg1 === 'function') {
      return hookFn.call(null, 'sync', arg1, arg2);
    } else if (typeof arg1 === 'string' && typeof arg2 === 'function') {
      return hookFn.apply(null, arguments);
    } else if (typeof arg1 === 'object') {
      return hookObj.apply(null, arguments);
    }
  }

  function hookObj(obj, props = Object.getOwnPropertyNames(obj), objName) {
    let objHooks = {};
    let doNotHook = [
      'constructor'
    ];
    props = props.filter(prop => typeof obj[prop] === 'function' && !doNotHook.includes(prop) && !prop.match(/^_/));
    props.forEach(prop => {
      let [name, type = 'sync'] = prop.split(':');
      objHooks[name] = obj[name] = hookFn(type, obj[name]);
    });
    if (objName) {
      hooks[objName] = objHooks;
    }
    return objHooks;
  }

  function hookFn(type, fn, name) {
    let before = [];
    let after = [];
    let beforeFn = add.bind(before);
    let afterFn = add.bind(after);
    let handlers = {
      get(target, prop, receiver) {
        return {
          before: beforeFn,
          after: afterFn,
          fn: fn
        }[prop] || Reflect.get(...arguments);
      }
    };

    function generateTrap() {
      function chainCallbacks(hooks, name, code) {
        for (let i = hooks.length; i-- > 0;) {
          if (i === 0 && !(type === 'async' && name ==='a')) {
            code = name + '[' + i + '].fn.apply(h,[' + code +
              (name === 'b' ? '].concat(g))' : ',r])');
          } else {
            code = name + '[' + i + '].fn.bind(h,' + code + ')';
          }
        }
        return code;
      }

      if (before.length || after.length) {
        let code;
        if (type === 'sync') {
          let beforeCode = 'r=t.apply(h,' + (before.length ? 'arguments' : 'g') + ')';
          let afterCode;
          if (before.length) {
            beforeCode = chainCallbacks(before, 'b', 'function extract(){' + beforeCode + '}');
          }
          if (after.length) {
            afterCode = chainCallbacks(after, 'a', 'function extract(s){r=s}');
          }
          code = ['"use strict"', 'var r', beforeCode, afterCode, 'return r'].join(';');
        } else if (type === 'async') {
          code = 't.apply(b,' +
            (before.length ?
            'Array.prototype.slice.call(arguments)' : // if we're wrapped in partial, extract arguments
            'g')                                       // otherwise, we can just use passed in arguments
            + '.concat(' + chainCallbacks(after, 'a', 'z||[]') + '))';
          if (before.length) {
            code = 'function partial(){' + code + '}';
          }
          code = [
            '"use strict"',
            'var z;typeof g[g.length-1]=="function"&&(z=g.pop())',
            chainCallbacks(before, 'b', code)
          ].join(';');
        }
        handlers.apply = (new Function('b,a,t,h,g', code)).bind(null, before, after);
      } else {
        delete handlers.apply;
      }
    }

    function add(fn, priority = 10) {
      let entry = {fn, priority};
      this.push(entry);
      this.sort((a, b) => b.priority - a.priority);
      generateTrap();
      return () => {
        this.splice(this.indexOf(entry), 1);
        generateTrap();
      }
    }

    let hook;
    if (useProxy) {
      hook =  new Proxy(fn, handlers);
    } else {
      hook = function(...args) {
        return handlers.apply ? handlers.apply(fn, this, args) : fn.apply(this, args);
      };
      hook.before = beforeFn;
      hook.after = afterFn;
      hook.fn = fn;
    }

    if (name) {
      hooks[name] = hook;
    }
    return hook;
  }

  dispatch.hooks = hooks;
  return dispatch;
}

module.exports = create;
