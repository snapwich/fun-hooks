
"use strict";

let create = require('./index.js');
let util = require('util');

test('honors config.useProxy', () => {
  let hooksWithProxy = create({
    useProxy: true
  });
  let proxyHook = hooksWithProxy('sync', jest.fn());

  let hooksWithoutProxy = create({
    useProxy: false
  });
  let noProxyHook = hooksWithoutProxy('sync', jest.fn());

  expect(util.types.isProxy(proxyHook)).toEqual(true);
  expect(util.types.isProxy(noProxyHook)).toEqual(false);
});

[true, false].forEach(useProxy => {
  let hook = create({
    useProxy
  });

  let n = (str) => str + (useProxy ? ' with proxy' : ' with wrapper');

  function genHooks(count) {
    let hooks = [];
    for (let i = 0; i < count; i++) {
      hooks.push(jest.fn((cb, a, b) => {
        cb(a + 1, b + 1);
      }));
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

  test(n('calls hooked sync fn with no hooks'), () => {
      let syncFn = jest.fn().mockReturnValue(3);
      let hookedSyncFn = hook('sync', syncFn);

      let value = hookedSyncFn(1, 2);

      expect(syncFn).toBeCalledWith(1, 2);
      expect(value).toEqual(3);
  });

  test(n('calls hooked async fn with no hooks'), () => {
    let asyncFn = (a, b, cb) => cb(a, b, 3);
    let cb = jest.fn();
    let hookedAsyncFn = hook('async', asyncFn);

    hookedAsyncFn(1, 2, cb);

    expect(cb).toBeCalledWith(1, 2, 3);
  });

  test(n('calls all hooks on sync hooked fn'), () => {
    let syncFn = jest.fn((a, b) => a + b);

    let hookedSyncFn = hook('sync', syncFn);
    let result;

    let before = genHooks(3);
    let after = genHooks(3);

    hookedSyncFn.before(before[0]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 1);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(5);

    hookedSyncFn.before(before[1]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 2);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(7);

    hookedSyncFn.before(before[2]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 3);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(9);

    hookedSyncFn.after(after[0]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 3);
    expectCalled(after, 1);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(10);

    hookedSyncFn.after(after[1]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 3);
    expectCalled(after, 2);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(11);

    hookedSyncFn.after(after[2]);
    result = hookedSyncFn(1, 2);
    expectCalled(before, 3);
    expectCalled(after, 3);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(12);

    hookedSyncFn = hook('sync', syncFn);
    after = genHooks(3);
    hookedSyncFn.after(after[0]);
    result = hookedSyncFn(1, 2);
    expectCalled(after, 1);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(4);

    hookedSyncFn.after(after[1]);
    result = hookedSyncFn(1, 2);
    expectCalled(after, 2);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(5);

    hookedSyncFn.after(after[2]);
    result = hookedSyncFn(1, 2);
    expectCalled(after, 3);
    expect(syncFn).toBeCalled();
    expect(result).toEqual(6);
  });

  test(n('calls hooks on async hooked fn'), () => {
    let result;
    let cb = jest.fn(function(a, b) {
      result = a + b
    });

    let asyncFn = jest.fn(function(a, b, cb) {
      cb(a + 1, b +1);
    });

    let hookedAsyncFn = hook('async', asyncFn);

    let before = genHooks(3);
    let after = genHooks(3);

    hookedAsyncFn.before(before[0]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 1);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(7);

    hookedAsyncFn.before(before[1]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 2);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(9);

    hookedAsyncFn.before(before[2]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 3);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(11);

    hookedAsyncFn.after(after[0]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 3);
    expectCalled(after, 1);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(13);

    hookedAsyncFn.after(after[1]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 3);
    expectCalled(after, 2);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(15);

    hookedAsyncFn.after(after[2]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(before, 3);
    expectCalled(after, 3);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(17);

    hookedAsyncFn = hook('async', asyncFn);
    after = genHooks(3);
    hookedAsyncFn.after(after[0]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(after, 1);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(7);

    hookedAsyncFn.after(after[1]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(after, 2);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(9);

    hookedAsyncFn.after(after[2]);
    hookedAsyncFn(1, 2, cb);
    expectCalled(after, 3);
    expect(asyncFn).toBeCalled();
    expect(cb).toBeCalled();
    expect(result).toEqual(11);
  });

  test(n('calls before hooks on async hooked fn without callback'), () => {
    let asyncFn = jest.fn();

    let hookedAsyncFn = hook('async', asyncFn);
    let before = genHooks(3);
    hookedAsyncFn.before(before[0]);
    hookedAsyncFn(1, 2);
    expectCalled(before, 1);
    expect(asyncFn).toBeCalledWith(2, 3);

    hookedAsyncFn.before(before[1]);
    hookedAsyncFn(1, 2);
    expectCalled(before, 2);
    expect(asyncFn).toBeCalledWith(3, 4);

    hookedAsyncFn.before(before[2]);
    hookedAsyncFn(1, 2);
    expectCalled(before, 3);
    expect(asyncFn).toBeCalledWith(4, 5);
  });

  test(n('calls before hooks on async hooked fn without callback'), () => {
    let asyncFn = jest.fn();

    let hookedAsyncFn = hook('async', asyncFn);
    let before = genHooks(3);
    hookedAsyncFn.before(before[0]);
    hookedAsyncFn(1, 2);
    expectCalled(before, 1);
    expect(asyncFn).toBeCalledWith(2, 3);

    hookedAsyncFn.before(before[1]);
    hookedAsyncFn(1, 2);
    expectCalled(before, 2);
    expect(asyncFn).toBeCalledWith(3, 4);

    hookedAsyncFn.before(before[2]);
    hookedAsyncFn(1, 2);
    expectCalled(before, 3);
    expect(asyncFn).toBeCalledWith(4, 5);
  });
});
