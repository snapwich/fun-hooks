const hasProxy = typeof Proxy === 'function';

function create(config = {}) {
  let hooks = new Map();

  let useProxy = config.useProxy || hasProxy;

  return function hook(type, fn, name) {
    let handlers = {};
    let before = [];
    let after = [];
    let trap;

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
        console.log(code);
        trap = (new Function('b,a,t,h,g', code)).bind(null, before, after);
        handlers.apply = trap;
      } else {
        delete handlers.apply;
      }
    }

    function wrapper(...args) {
      return trap(fn, this, args)
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

    let methods = {
      before: add.bind(before),
      after: add.bind(after)
    };

    if (useProxy) {
      return Object.assign(new Proxy(fn, handlers), methods);
    }

    return Object.assign(wrapper, methods);
  }
}

let hookedFn = create()('async', function sum(a, b, cb) {
  console.log('sum', [a, b]);
  cb(a + b, 1);
});

hookedFn.before(function before1(cb, a, b) {
  console.log("before1", [a, b]);
  a++;
  cb.apply(this, [a, b]);
});

hookedFn.before(function before2(cb, a, b) {
  console.log("before2", [a, b]);
  a++;
  cb.apply(this, [a, b]);
});

hookedFn.before(function before3(cb, a, b) {
  console.log("before3", [a, b]);
  a++;
  cb.apply(this, [a, b]);
});

hookedFn.after(function after1(cb, a, b) {
  console.log("after1", [a, b]);
  a++;
  cb.apply(this, [a, b]);
});

hookedFn.after(function after2(cb, a, b) {
  console.log("after2", [a, b]);
  a++;
  cb.apply(this, [a, b]);
});

hookedFn.after(function after3(cb, a, b) {
  console.log("after3", [a, b]);
  a++;
  cb.apply(this, [a, b]);
});


let result = hookedFn(1, 2, function(a, b) {
  console.log('result', [a, b]);
});



// module.exports = create;
