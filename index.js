


function before1(cb, ...args) {
    console.log("before1", args);
    cb.apply(this, args);
}

function before2(cb, ...args) {
    console.log("before2", args);
    cb.apply(this, args);
}

function before3(cb, ...args) {
    console.log("before3", args);
    cb.apply(this, args);
}

function after1(cb, ...args) {
    console.log("after1", args);
    cb.apply(this, args);
}

function after2(cb, ...args) {
    console.log("after2", args);
    cb.apply(this, args);
}

function after3(cb, ...args) {
    console.log("after3", args);
    cb.apply(this, args);
}


const hasProxy = typeof Proxy === 'function';

function create(config = {}) {
    let hooks = new Map();

    let useProxy = config.useProxy || hasProxy;

    return function hook(type, fn, name) {
        let handler = {
            apply: trap
        };
        let _before = [];
        let _after = [];

        function trap(target, thisArg, args) {
            let result;
            before1.apply(thisArg, [
                before2.bind(thisArg,
                    before3.bind(thisArg,
                        (...args) => result = after1.apply(thisArg, [fn.apply(thisArg, args)])
                    )
                ),
            ...args]);
            console.log('result', result);
        }

        function remove() {

        }

        Object.assign(trap, {
            before() {
                return remove;
            },
            after() {
                return remove;
            }
        });

        if (useProxy) {
            return new Proxy(fn, handler)
        }

        return hasProxy ? fn : trap;
    }
}

let hookedFn = create()('sync', function sum(a, b) {
    console.log('sum', arguments);
    return a + b;
});

hookedFn(1, 2);

module.exports = create;