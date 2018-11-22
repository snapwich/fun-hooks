const hasProxy = typeof Proxy === 'function';

function create(config = {}) {
  let hooks = new Map();

  let useProxy = config.useProxy || hasProxy;

  return function hook(type, fn, name) {
    let handlers = {};
    let before = [];
    let after = [];

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
        } else if(type === 'async') {
          code = [
            '"use strict"',
            'let z=g.pop()',
            chainCallbacks(before, 'b', 'function partial(){t.apply(b,Array.prototype.slice.call(arguments).concat('
              + chainCallbacks(after, 'a', 'z') + ' ))}')
          ].join(';');
        }
        handlers.apply = (new Function('b,a,t,h,g', code)).bind(null, before, after);
      } else {
        delete handlers.apply;
      }
    }

    function wrapper() {
      let args = Array.prototype.slice.call(arguments);
      return handlers.apply ? handlers.apply(fn, this, args) : fn.apply(this, args);
    }

    function add(fn, priority = 10) {
      let entry = {fn, priority};
      this.push(entry);
      this.sort((a, b) => b.priority - a.priority);
      generateTrap();
      return function () {
        this.splice(this.indexOf(entry), 1);
        generateTrap();
      }
    }

    if (useProxy) {
      let proxy =  new Proxy(fn, handlers);
      proxy.before = add.bind(before);
      proxy.after = add.bind(after);
      return proxy;
    }

    wrapper.before = add.bind(before);
    wrapper.after = add.bind(after);
    return wrapper;
  }
}

module.exports = create;
