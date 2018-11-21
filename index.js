const hasProxy = typeof Proxy === 'function';

function create(config = {}) {
  let hooks = new Map();

  let useProxy = config.useProxy || hasProxy;

  return function hook(type, fn, name) {
    let handlers = {};
    let before = [];
    let after = [];
    let hooks = {
      b: [],
      a: []
    };

    let trap;

    // function trap(a, b, c) {
    //     let r;
    //     before1.apply(b, [
    //         before2.bind(b,
    //             before3.bind(b,
    //                 function extract() {
    //                     r = a.apply(b, arguments)
    //                 }
    //             )
    //         )
    //     ].concat(c));
    //     after1.apply(b, [
    //         after2.bind(b,
    //             after3.bind(b,
    //                 function extract(ret) {
    //                     r = ret;
    //                 }
    //             )
    //         ), [r]
    //     ]);
    //     return r;
    // }

    function genTrap() {
      function chainSyncCallbacks(hooks, name, code) {
        for (let i = hooks.length; i-- > 0;) {
          if (i === 0) {
            code = name + '[' + i + '].fn.apply(h,[' + code +
              (name === 'b' ? '].concat(g))' : ',r])');
          } else {
            code = name + '[' + i + '].fn.bind(h,' + code + ')';
          }
        }
        return code;
      }
      function chainAsyncCallbacks(hooks, name, code) {
        for (let i = hooks.length; i-- > 0;) {
          if (i === 0) {
            code = name + '[' + i + '].fn.apply(h,[' + code +
              (name === 'b' ? '].concat(g))' : ',r])');
          } else {
            code = name + '[' + i + '].fn.bind(h,' + code + ')';
          }
        }
        return code;
      }

      if (before.length || after.length) {
        if (type === 'sync') {
          let beforeCode = 'r=t.apply(h,' + (before.length ? 'arguments' : 'g') + ')';
          let afterCode;
          if (before.length) {
            beforeCode = chainSyncCallbacks(before, 'b', 'function extract(){' + beforeCode + '}');
          }
          if (after.length) {
            afterCode = chainSyncCallbacks(after, 'a', 'function extract(s){r=s}');
          }

          let code = ['"use strict"', 'var r', beforeCode, afterCode, 'return r'].join(';');

          console.log(code);

          trap = (new Function('b,a,t,h,g', code)).bind(null, before, after);
          handlers.apply = trap;
        } else if(type === 'async') {
          let code = chainCallbacks(before, 'b', '')

          code = ['"use strict"', 'let r;let z=g.pop();', code].join(';');
        }
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
      genTrap();
      return function () {
        this.splice(this.indexOf(entry), 1);
        genTrap();
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

let hookedFn = create()('sync', function sum(a, b) {
  console.log('sum', [a, b]);
  return a + b;
});

// hookedFn.before(function before1(cb, a, b) {
//   console.log("before1", [a, b]);
//   a++;
//   cb.apply(this, [a, b]);
// });
//
// hookedFn.before(function before2(cb, a, b) {
//   console.log("before2", [a, b]);
//   a++;
//   cb.apply(this, [a, b]);
// });
//
// hookedFn.before(function before3(cb, a, b) {
//   console.log("before3", [a, b]);
//   a++;
//   cb.apply(this, [a, b]);
// });
//
hookedFn.after(function after1(cb, a) {
  console.log("after1", [a]);
  a++;
  cb.apply(this, [a]);
});
//
// hookedFn.after(function after2(cb, a) {
//   console.log("after2", [a]);
//   a++;
//   cb.apply(this, [a]);
// });
//
// hookedFn.after(function after3(cb, a) {
//   console.log("after3", [a]);
//   a++;
//   cb.apply(this, [a]);
// });


let result = hookedFn(1, 2);

console.log('result', result);

module.exports = create;
