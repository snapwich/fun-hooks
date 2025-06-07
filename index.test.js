"use strict";

let _eval = require("eval");
let code = require("./scripts/bundle");

/* global process */
const DEBUG = !!process.env.DEBUG;

// run test suite on eval and non-eval versions of code
let creates = [
  [
    "eval",
    _eval(
      code[DEBUG ? "fun-hooks.js" : "fun-hooks.min.js"],
      "fun-hooks.min.js",
      {
        console
      }
    )
  ],
  [
    "no-eval",
    _eval(
      code[DEBUG ? "fun-hooks.no-eval.js" : "fun-hooks.no-eval.min.js"],
      "fun-hooks.no-eval.min.js",
      {
        console
      }
    )
  ]
];

/* global describe, it, expect */

describe.each(creates)("%s", (_, create) => {
  test("exposes named hooks", () => {
    let hook = create();
    let hooked1 = hook("sync", jest.fn(), "hooked1");
    let hooked2 = hook("async", jest.fn(), "hooked2");

    expect(hook.get("hooked1")).toEqual(hooked1);
    expect(hook.get("hooked2")).toEqual(hooked2);
  });

  let config = {};

  function genHooks(count) {
    let hooks = [];
    for (let i = 0; i < count; i++) {
      hooks.push(
        jest.fn((cb, a, b) => {
          cb(a + 1, b + 1);
        })
      );
    }
    return hooks;
  }

  function expectCalled(arr, count) {
    arr.forEach((hook, i) => {
      if (i < count) {
        expect(arr[i]).toBeCalled();
      } else {
        expect(arr[i]).not.toBeCalled();
      }
    });
  }

  function clearMocks(...arrs) {
    arrs.forEach(arr => {
      arr.forEach(mock => mock.mockClear());
    });
  }

  test("calls hooked sync fn with no hooks", () => {
    let hook = create(config);

    let syncFn = jest.fn().mockReturnValue(3);
    let hookedSyncFn = hook("sync", syncFn);

    let value = hookedSyncFn(1, 2);

    expect(syncFn).toBeCalledWith(1, 2);
    expect(value).toEqual(3);
  });

  test("calls hooked async fn with no hooks", () => {
    let hook = create(config);

    let asyncFn = (a, b, cb) => cb(a, b, 3);
    let cb = jest.fn();
    let hookedAsyncFn = hook("async", asyncFn);

    hookedAsyncFn(1, 2, cb);

    expect(cb).toBeCalledWith(1, 2, 3);
  });

  test("assumes sync if not specified", () => {
    let hook = create(config);

    let syncFn = jest.fn((a, b) => a + b);

    let hookedSyncFn = hook(syncFn);
    let result;

    let before = genHooks(3);

    hookedSyncFn.before(before[0]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 1);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(5);
  });

  test("calls all hooks on sync hooked fn", () => {
    let hook = create(config);

    let syncFn = jest.fn((a, b) => a + b);

    let hookedSyncFn = hook("sync", syncFn);
    let result;

    let before = genHooks(3);
    let after = genHooks(3);

    hookedSyncFn.before(before[0]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 1);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(5);

    clearMocks(before, after);
    hookedSyncFn.before(before[1]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 2);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(7);

    clearMocks(before, after);
    hookedSyncFn.before(before[2]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 3);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(9);

    clearMocks(before, after);
    hookedSyncFn.after(after[0]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 3);
    expectCalled(after, 1);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(10);

    clearMocks(before, after);
    hookedSyncFn.after(after[1]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 3);
    expectCalled(after, 2);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(11);

    clearMocks(before, after);
    hookedSyncFn.after(after[2]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 3);
    expectCalled(after, 3);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(12);

    clearMocks(before, after);
    hookedSyncFn = hook("sync", syncFn);
    after = genHooks(3);
    hookedSyncFn.after(after[0]);
    result = hookedSyncFn(1, 2);
    expectCalled(after, 1);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(4);

    clearMocks(before, after);
    hookedSyncFn.after(after[1]);
    result = hookedSyncFn(1, 2);
    expectCalled(after, 2);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(5);

    clearMocks(before, after);
    hookedSyncFn.after(after[2]);
    result = hookedSyncFn(1, 2);
    expectCalled(after, 3);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(6);
  });

  test("calls hooks on async hooked fn", () => {
    let hook = create(config);

    let result;
    let cb = jest.fn(function(a, b) {
      result = a + b;
    });

    let asyncFn = jest.fn(function(a, b, cb) {
      cb(a + 1, b + 1);
    });

    let hookedAsyncFn = hook("async", asyncFn);

    let before = genHooks(3);
    let after = genHooks(3);

    hookedAsyncFn.before(before[0]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 1);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(7);

    clearMocks(before, after);
    hookedAsyncFn.before(before[1]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 2);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(9);

    clearMocks(before, after);
    hookedAsyncFn.before(before[2]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 3);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(11);

    clearMocks(before, after);
    hookedAsyncFn.after(after[0]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 3);
    expectCalled(after, 1);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(13);

    clearMocks(before, after);
    hookedAsyncFn.after(after[1]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 3);
    expectCalled(after, 2);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(15);

    clearMocks(before, after);
    hookedAsyncFn.after(after[2]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 3);
    expectCalled(after, 3);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(17);

    clearMocks(before, after);
    hookedAsyncFn = hook("async", asyncFn);
    after = genHooks(3);
    hookedAsyncFn.after(after[0]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(after, 1);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(7);

    clearMocks(before, after);
    hookedAsyncFn.after(after[1]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(after, 2);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(9);

    clearMocks(before, after);
    hookedAsyncFn.after(after[2]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(after, 3);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(11);
  });

  test("allows bailing early using cb.bail", () => {
    let hook = create(config);

    let result;
    let cb = jest.fn((a, b) => (result = a + b));

    let asyncFn = jest.fn((a, b, cb) => cb(a + 1, b + 1));
    let syncFn = jest.fn((a, b) => a + b);

    let hookedSyncFn = hook("sync", syncFn);
    hookedSyncFn.after((cb, x) => cb.bail(x + 1));
    result = hookedSyncFn(1, 2);
    expect(result).toEqual(4);

    hookedSyncFn.after((cb, x) => cb.bail(x + 2), 11);
    result = hookedSyncFn(1, 2);
    expect(result).toEqual(5);

    hookedSyncFn.after((cb, x) => cb.bail(x + 3), 12);
    result = hookedSyncFn(1, 2);
    expect(result).toEqual(6);

    hookedSyncFn.before(cb => cb.bail(4), 13);
    result = hookedSyncFn(1, 2);
    expect(result).toEqual(4);

    hookedSyncFn.before(cb => cb.bail(5), 14);
    result = hookedSyncFn(1, 2);
    expect(result).toEqual(5);

    hookedSyncFn.before(cb => cb.bail(6), 15);
    result = hookedSyncFn(1, 2);
    expect(result).toEqual(6);

    let hookedAsyncFn = hook("async", asyncFn);
    hookedAsyncFn.after((cb, x, y) => cb.bail(x + 1, y + 1));
    hookedAsyncFn(1, 2, cb);
    expect(result).toEqual(7);

    hookedAsyncFn.after((cb, x, y) => cb.bail(x + 2, y + 2), 11);
    hookedAsyncFn(1, 2, cb);
    expect(result).toEqual(9);

    hookedAsyncFn.after((cb, x, y) => cb.bail(x + 3, y + 3), 12);
    hookedAsyncFn(1, 2, cb);
    expect(result).toEqual(11);

    hookedAsyncFn.before((cb, x, y) => cb.bail(x + 4, y + 4), 13);
    hookedAsyncFn(1, 2, cb);
    expect(result).toEqual(11); // only 11 because we bail before hooked fn now

    hookedAsyncFn.before((cb, x, y) => cb.bail(x + 5, y + 5), 14);
    hookedAsyncFn(1, 2, cb);
    expect(result).toEqual(13);

    hookedAsyncFn.before((cb, x, y) => cb.bail(x + 6, y + 6), 15);
    hookedAsyncFn(1, 2, cb);
    expect(result).toEqual(15);
  });

  test("callback to wrapped async fn should not have bail attached", () => {
    let hook = create(config);

    let cb = jest.fn((a, b) => a + b);
    let asyncFn = jest.fn((a, b, cb) => {
      expect(cb.bail).toBeUndefined();
    });

    let hookedAsyncFn = hook("async", asyncFn);

    hookedAsyncFn(1, 2, cb);

    hookedAsyncFn.after((cb, x, y) => cb.bail(x + 1, y + 1));
    hookedAsyncFn(1, 2, cb);

    hookedAsyncFn.before((cb, x, y) => cb.bail(x + 1, y + 1));
    hookedAsyncFn(1, 2, cb);
  });

  test("calls before hooks on async hooked fn without callback", () => {
    let hook = create(config);

    let asyncFn = jest.fn();

    let hookedAsyncFn = hook("async", asyncFn);
    let before = genHooks(3);
    hookedAsyncFn.before(before[0]);
    hookedAsyncFn(1, 2);
    expectCalled(before, 1);
    expect(asyncFn).toBeCalledWith(2, 3);

    clearMocks(before);
    hookedAsyncFn.before(before[1]);
    hookedAsyncFn(1, 2);
    expectCalled(before, 2);
    expect(asyncFn).toBeCalledWith(3, 4);

    clearMocks(before);
    hookedAsyncFn.before(before[2]);
    hookedAsyncFn(1, 2);
    expectCalled(before, 3);
    expect(asyncFn).toBeCalledWith(4, 5);
  });

  test("hooks work correctly after removing", () => {
    let hook = create(config);

    let result;
    let cb = jest.fn(function(a, b) {
      result = a + b;
    });

    let asyncFn = jest.fn(function(a, b, cb) {
      cb(a + 1, b + 1);
    });

    let hookedAsyncFn = hook("async", asyncFn);

    let before = genHooks(2);
    let after = genHooks(2);

    hookedAsyncFn.before(before[0]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 1);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(7);

    clearMocks(before, after);
    hookedAsyncFn.before(before[1]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 2);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(9);

    clearMocks(before, after);
    hookedAsyncFn.after(after[0]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 2);
    expectCalled(after, 1);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(11);

    clearMocks(before, after);
    hookedAsyncFn.after(after[1]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 2);
    expectCalled(after, 2);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(13);

    clearMocks(before, after);
    hookedAsyncFn.getHooks({ hook: after[1] }).remove();
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 2);
    expectCalled(after, 1);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(11);

    clearMocks(before, after);
    hookedAsyncFn.getHooks({ hook: before[1] }).remove();
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 1);
    expectCalled(after, 1);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(9);

    hookedAsyncFn.removeAll();
    hookedAsyncFn(1, 2, cb);
    expect(result).toEqual(5);
  });

  test("hooks have correct bound context", () => {
    let hook = create(config);

    let fnThis = {};
    let beforeThis = {};
    let afterThis = {};

    let asyncFn = function(cb) {
      expect(this).toEqual(fnThis);
      cb();
    };

    let hookedAsyncFn = hook("async", asyncFn);

    hookedAsyncFn
      .before(function(cb) {
        expect(this).toEqual(fnThis);
        cb();
      })
      .after(function(cb) {
        expect(this).toEqual(fnThis);
        cb();
      })
      .before(
        function(cb) {
          expect(this).toEqual(beforeThis);
          cb();
        }.bind(beforeThis)
      )
      .after(
        function(cb) {
          expect(this).toEqual(afterThis);
          cb();
        }.bind(afterThis)
      );

    hookedAsyncFn.bind(fnThis)(function() {});
  });

  test("hooks run in correct priority order", () => {
    let hook = create(config);

    let order = [];
    let callback = () => order.push(9);

    let asyncFn = jest.fn(function(cb) {
      order.push("fn");
      cb();
    });

    let hookedAsyncFn = hook("async", asyncFn);
    hookedAsyncFn
      .before(function(next) {
        order.push(2);
        next();
      })
      .before(function(next) {
        order.push(1);
        next();
      }, 11)
      .before(function(next) {
        order.push(3);
        next();
      })
      .before(function(next) {
        order.push(4);
        next();
      })
      .after(function(next) {
        order.push(7);
        next();
      })
      .after(function(next) {
        order.push(8);
        next();
      })
      .after(function(next) {
        order.push(6);
        next();
      }, 12)
      .after(function(next) {
        order.push(5);
        next();
      }, 13);

    hookedAsyncFn(callback);

    expect(order).toEqual([1, 2, 3, 4, "fn", 5, 6, 7, 8, 9]);
  });

  test("async calls to next in sync hooks should not mix arguments", () => {
    jest.useFakeTimers();
    let hook = create(config);
    let log = [];

    let hooked = hook("sync", a => {
      log.push(["inner", a]);
    });

    hooked.before((next, a) => {
      log.push(["outer", a]);
      setTimeout(() => next(a), 0);
    });

    hooked(1);
    hooked(2);

    jest.runAllTimers();
    jest.useRealTimers();

    expect(log).toEqual([
      ["outer", 1],
      ["outer", 2],
      ["inner", 1],
      ["inner", 2]
    ]);
  });

  test("allows hooking objects (and prototypes)", () => {
    let hook = create(config);

    // should allow us to attach hooks before hookable is created
    hook.get("myObj.someFun").after(function(cb, result) {
      cb(result + 1);
    });
    hook.get("myObj.someFun2").after(function(cb, result) {
      cb(result + 2);
    });

    let obj = Object.create({
      someFun() {
        return 1;
      },
      someFun2(cb) {
        cb(2);
      },
      someFun3() {}
    });
    obj.someFun4 = function() {
      return 3;
    };
    obj.someFun5 = function() {};

    let hooks = hook(
      obj,
      ["someFun", "async:someFun2", "sync:someFun4"],
      "myObj"
    );

    obj.someFun4.after(function(cb, result) {
      cb(result + 1);
    });

    expect(hooks["someFun"]).toEqual(obj.someFun);
    expect(typeof obj.someFun.before).toEqual("function");
    expect(typeof obj.someFun.after).toEqual("function");
    expect(obj.someFun()).toEqual(2);
    expect(hooks["someFun2"]).toEqual(obj.someFun2);
    expect(typeof obj.someFun2.before).toEqual("function");
    expect(typeof obj.someFun2.after).toEqual("function");
    obj.someFun2(result => {
      expect(result).toEqual(4);
    });
    expect(obj.someFun3.before).toBeUndefined();
    expect(obj.someFun3.after).toBeUndefined();
    expect(hooks["someFun4"]).toEqual(obj.someFun4);
    expect(typeof obj.someFun4.before).toEqual("function");
    expect(typeof obj.someFun4.after).toEqual("function");
    expect(obj.someFun4()).toEqual(4);
    expect(obj.someFun5.before).toBeUndefined();
    expect(obj.someFun5.after).toBeUndefined();

    expect(hook.get("myObj")).toEqual(hooks);
    expect(hook.get("myObj").someFun).toEqual(obj.someFun);
    expect(hook.get("myObj").someFun2).toEqual(obj.someFun2);
    expect(hook.get("myObj").someFun4).toEqual(obj.someFun4);
    expect(hook.get("myObj.someFun")).toEqual(obj.someFun);
    expect(hook.get("myObj.someFun2")).toEqual(obj.someFun2);
    expect(hook.get("myObj.someFun4")).toEqual(obj.someFun4);
  });

  test("allows us to add/remove hooks by name before a hookable is created", () => {
    let hook = create(config);

    function addOne(cb, a) {
      cb(a + 1);
    }

    hook.get("myHook").before(addOne);
    hook.get("myHook").after(addOne);

    let myHook = hook(function(a) {
      return a;
    }, "myHook");

    myHook.after(addOne);

    expect(myHook(1)).toEqual(4);

    hook.get("myObj.someFun").before(addOne);
    hook.get("myObj.someFun").after(addOne);

    function ten(cb) {
      cb(10);
    }

    hook.get("myObj.someFun").after(ten);
    hook
      .get("myObj.someFun")
      .getHooks({
        hook: ten
      })
      .remove();

    let obj = Object.create({
      someFun(a) {
        return a;
      }
    });

    // hook created here should use named hooks created above.
    hook(obj, ["someFun"], "myObj");

    expect(obj.someFun(1)).toEqual(3);
  });

  test("will display warning when a hook is referenced but never created before ready", () => {
    /* eslint-disable no-console */

    let hook = create(
      Object.assign(
        {
          ready: create.SYNC
        },
        config
      )
    );

    let oldWarn = console.warn;
    console.warn = jest.fn();

    expect(console.warn).not.toHaveBeenCalled();

    hook.get("myHook").before(function(cb) {
      cb.bail(1);
    });

    hook.ready();

    expect(console.warn).toHaveBeenCalled();

    console.warn = oldWarn;

    /* eslint-enable no-console */
  });

  test("will not wrap hooks more than once", () => {
    let hook = create(config);

    let fn = () => {};
    let hookedFn = hook(fn);
    let hookedFn2 = hook(hookedFn);
    expect(hookedFn).toEqual(hookedFn2);
  });

  test("should allow us to get hooks with getHooks", () => {
    let hook = create(config);

    let fn = () => {};
    let hookedFn = hook(fn);
    let hook1 = () => {};
    let hook2 = () => {};

    hookedFn.before(hook1, 8);
    hookedFn.before(hook1);
    hookedFn.after(hook2);

    let remove = hookedFn.getHooks().map(entry => entry.remove);

    expect(hookedFn.getHooks().length).toEqual(3);
    expect(hookedFn.getHooks()[0]).toEqual({
      hook: hook1,
      type: "before",
      priority: 10,
      remove: remove[0]
    });
    expect(hookedFn.getHooks()[1]).toEqual({
      hook: hook1,
      type: "before",
      priority: 8,
      remove: remove[1]
    });
    expect(hookedFn.getHooks()[2]).toEqual({
      hook: hook2,
      type: "after",
      priority: 10,
      remove: remove[2]
    });

    expect(hookedFn.getHooks({ hook: hook2 }).length).toEqual(1);
    expect(hookedFn.getHooks({ hook: hook2 })[0]).toEqual({
      hook: hook2,
      type: "after",
      priority: 10,
      remove: remove[2]
    });

    expect(hookedFn.getHooks({ type: "before" }).length).toEqual(2);
    expect(hookedFn.getHooks({ type: "before" })[0]).toEqual({
      hook: hook1,
      type: "before",
      priority: 10,
      remove: remove[0]
    });
    expect(hookedFn.getHooks({ type: "before" })[1]).toEqual({
      hook: hook1,
      type: "before",
      priority: 8,
      remove: remove[1]
    });

    expect(hookedFn.getHooks({ priority: 10 }).length).toEqual(2);
    expect(hookedFn.getHooks({ priority: 10 })[0]).toEqual({
      hook: hook1,
      type: "before",
      priority: 10,
      remove: remove[0]
    });
    expect(hookedFn.getHooks({ priority: 10 })[1]).toEqual({
      hook: hook2,
      type: "after",
      priority: 10,
      remove: remove[2]
    });
  });

  describe("the ready option", () => {
    let before, after;
    beforeEach(() => {
      before = jest.fn(cb => cb());
      after = jest.fn(cb => cb());
    });
    describe("for sync functions", () => {
      describe("when sync flag not set", () => {
        let hook, fn, hookedFn;
        beforeEach(() => {
          hook = create(
            Object.assign(
              {
                ready: create.ASYNC
              },
              config
            )
          );

          fn = jest.fn(() => {});
          hookedFn = hook(fn);
        });

        it("should run instantly with no hooks", () => {
          hookedFn();

          expect(fn).toBeCalled();
        });

        it("should run instantly with before hooks", () => {
          hookedFn.before(before);

          hookedFn();

          expect(fn).toBeCalled();
          expect(before).toBeCalled();
        });

        it("should run instantly with after hooks", () => {
          hookedFn.after(after);

          hookedFn();

          expect(fn).toBeCalled();
          expect(after).toBeCalled();
        });
      });

      describe("when sync flag is set but not ready", () => {
        let hook, fn, hookedFn;
        beforeEach(() => {
          hook = create(
            Object.assign(
              {
                ready: create.SYNC
              },
              config
            )
          );

          fn = jest.fn(() => {});
          hookedFn = hook(fn);
        });

        it("should throw when not ready but run when ready with no hooks", () => {
          expect(hookedFn).toThrow();
          expect(fn).not.toBeCalled();

          hook.ready();

          expect(hookedFn).not.toThrow();
          expect(fn).toBeCalled();
        });

        it("should throw when not ready but run when ready with before hooks", () => {
          hookedFn.before(before);

          expect(hookedFn).toThrow();
          expect(fn).not.toBeCalled();
          expect(before).not.toBeCalled();

          hook.ready();

          expect(hookedFn).not.toThrow();
          expect(fn).toBeCalled();
          expect(before).toBeCalled();
        });

        it("should throw when not ready but run when ready with after hooks", () => {
          hookedFn.after(after);

          expect(hookedFn).toThrow();
          expect(fn).not.toBeCalled();
          expect(after).not.toBeCalled();

          hook.ready();

          expect(hookedFn).not.toThrow();
          expect(fn).toBeCalled();
          expect(after).toBeCalled();
        });
      });
    });
    describe("for async functions", () => {
      describe("with async flag not set", () => {
        let hook, cb, fn, hookedFn;
        beforeEach(() => {
          hook = create(
            Object.assign(
              {
                ready: create.SYNC
              },
              config
            )
          );

          cb = jest.fn(() => {});
          fn = jest.fn(cb => cb());

          hookedFn = hook("async", fn);
        });

        it("should run instantly with no hooks", () => {
          hookedFn(cb);

          expect(fn).toBeCalled();
        });

        it("should run instantly with before hooks", () => {
          hookedFn.before(before);

          hookedFn(cb);

          expect(fn).toBeCalled();
          expect(before).toBeCalled();
        });

        it("should run instantly with after hooks", () => {
          hookedFn.after(after);

          hookedFn(cb);

          expect(fn).toBeCalled();
          expect(after).toBeCalled();
        });
      });

      describe("with async flag set", () => {
        let hook, cb, fn, hookedFn;
        beforeEach(() => {
          hook = create(
            Object.assign(
              {
                ready: create.ASYNC
              },
              config
            )
          );

          cb = jest.fn(() => {});
          fn = jest.fn(cb => cb());

          hookedFn = hook("async", fn);
        });

        it("should throw when not ready but run when ready with no hooks", () => {
          expect(function() {
            hookedFn(cb);
          }).toThrow();

          expect(fn).not.toBeCalled();

          hook.ready();

          expect(function() {
            hookedFn(cb);
          }).not.toThrow();

          expect(fn).toBeCalled();
        });

        it("should throw when not ready but run when ready with before hooks", () => {
          hookedFn.before(before);

          expect(function() {
            hookedFn(cb);
          }).toThrow();

          expect(fn).not.toBeCalled();
          expect(before).not.toBeCalled();

          hook.ready();

          expect(function() {
            hookedFn(cb);
          }).not.toThrow();

          expect(fn).toBeCalled();
          expect(before).toBeCalled();
        });

        it("should throw when not ready but run when ready with after hooks", () => {
          hookedFn.after(after);

          expect(function() {
            hookedFn(cb);
          }).toThrow();

          expect(fn).not.toBeCalled();
          expect(after).not.toBeCalled();

          hook.ready();

          expect(function() {
            hookedFn(cb);
          }).not.toThrow();

          expect(fn).toBeCalled();
          expect(after).toBeCalled();
        });
      });

      describe("with async and queue flags set", () => {
        let hook, cb, fn, hookedFn;
        beforeEach(() => {
          hook = create(
            Object.assign(
              {
                ready: create.ASYNC | create.QUEUE
              },
              config
            )
          );

          cb = jest.fn(() => {});
          fn = jest.fn(cb => cb());

          hookedFn = hook("async", fn);
        });

        it("should queue when not ready and run when ready with no hooks", () => {
          hookedFn(cb);

          expect(fn).not.toBeCalled();
          expect(cb).not.toBeCalled();

          hook.ready();

          expect(fn).toBeCalled();
          expect(cb).toBeCalled();
        });

        it("should queue when not ready and run when ready with before hooks", () => {
          hookedFn.before(before);

          hookedFn(cb);

          expect(fn).not.toBeCalled();
          expect(cb).not.toBeCalled();
          expect(before).not.toBeCalled();

          hook.ready();

          expect(fn).toBeCalled();
          expect(cb).toBeCalled();
          expect(before).toBeCalled();
        });

        it("should queue when not ready and run when ready with after hooks", () => {
          hookedFn.after(after);

          hookedFn(cb);

          expect(fn).not.toBeCalled();
          expect(cb).not.toBeCalled();
          expect(after).not.toBeCalled();

          hook.ready();

          expect(fn).toBeCalled();
          expect(cb).toBeCalled();
          expect(after).toBeCalled();
        });

        it("should run immediately after ready", () => {
          hookedFn.before(before);
          hookedFn.after(after);

          hook.ready();

          hookedFn(cb);

          expect(fn).toBeCalled();
          expect(cb).toBeCalled();
          expect(before).toBeCalled();
          expect(after).toBeCalled();
        });

        it("should behave the same after ready if ready was called more than once", () => {
          hookedFn.before(before);
          hookedFn.after(after);

          hookedFn(cb);

          expect(fn).not.toBeCalled();
          expect(cb).not.toBeCalled();
          expect(before).not.toBeCalled();
          expect(after).not.toBeCalled();

          hook.ready();
          hook.ready();

          hookedFn(cb);

          // each called twice for two hookedFn calls above (one queued), but not more
          expect(fn).toBeCalledTimes(2);
          expect(cb).toBeCalledTimes(2);
          expect(before).toBeCalledTimes(2);
          expect(after).toBeCalledTimes(2);
        });
      });
    });
  });
});
