# Fun Hooks
## Installation
```bash
npm install fun-hooks --save
```

## Motivation
Fun Hooks are an attempt to make a generalized and simple hooking API for the intent of designing extensible 
applications. This function-based approach operates on functions themselves rather than object methods to be fully 
compatible with purely functional code, but still maintains some convenience operations for dealing with 
object-oriented code.

The goals of this library are the following (in priority order):

  1. [Easy debugging](#debugging)
  2. [Performance](#performance)
  3. [Simple but powerful API](#usage)
  4. [Limited footprint](#footprint)

### Usage
Hooks follow the same format whether they're `sync` or `async` and whether they're `before` or `after` hooks; however, 
it's important to remember that `sync` `after` hooks act on the _return_ result and `async` `after` hooks act on the 
_callback's_ arguments.

#### Configuration
  - **useProxy** : boolean - (Default: **true**) Whether to use `Proxy` or a wrapper function for hooked functions.  
  _Note: if `Proxy` is unavailable then the library will automatically fallback to using wrapper functions._
```javascript
import configureHook from 'fun-hooks';    // babel (using webpack or such)
let configureHook = require('fun-hooks'); // or in node
let createHook = configureHook({
  useProxy: false
});
```

#### Sync (`before`, `after`)
```javascript
function sum(a, b) {
  return a + b;
}

let hookedSum = createHook('sync', sum);

// sync `before` hooks accept the arguments to sum, and `next` passes the arguments to sum (or next `before` hook)
hookedSum.before(function(next, a, b) {
  a = a + 1;    // modify arguments or do some operation
  next(a, b);   // call next when you're done
});

// sync `after` hooks accepts the return result from sum, and `next` returns the result (or calls next `after` hook)
hookedSum.after(function(next, result) {
  next(result + 1);
});

let result = hookedSum(1, 1);
// hookedSum(1, 1) -> hookedSum.before(1, 1) -> sum(2, 1) -> hookedSum.after(3) -> 4

console.log(result); // 4
```

_Note: You should always use `sync` if you are returning a value.  This includes if you are returning a `Promise`.  
Also, if you're hooking a function with `sync` your hooks should all call `next` synchronously (e.g. no ajax) so that 
your value can be returned.  If you asynchronously call `next` in a `sync` hook then the return value will be 
`undefined`._

#### Async (`before`, `after`)
```javascript
function increment(a, b, callback) {
  callback(a + 1, b + 1);
}

let hookedIncrement = createHook('async', increment);

// async `before` hooks accept the arguments to sum, and `next` passes the arguments to the next `before` hook or sum (same as sync)
hookedIncrement.before(function(next, a, b) {
  a = a + 1;
  next(a, b);
});

// async `after` hooks accept the arguments sum passed to callback, and `next` calls sum's actual callback (or next `after` hook)
hookedIncrement.after(function(next, a, b) {
  next(a, b + 1);
});

hookedIncrement(1, 1, function(a, b) {
  console.log(a, b); // 3, 3
})
// hookedIncrement(1, 1) -> hookedIncrement.before(1, 1) -> increment(2, 1) -> hookedIncrement.after(3, 2) -> callback(3, 3)
```

You'll notice no difference above in `sync` or `async` with the `before` hooks, but the `after` hooks are dealing with 
the `callback`'s parameters in one case and the return result (which will always be a single value) in the other.

#### Removing a hook
When a hook is created, a removal function is returned.  Calling the function will remove the hook.
```javascript
function beforeHook() {
  console.log("called");
}

let removeHook = hookedSum.before(beforeHook);

hookedSum(1, 1); // "called"

removeHook();

hookedSum(1, 1); // hook not called
```

#### Priority
You can attach as many `before` or `after` hooks as you'd like to a function.  The order in which the hooks are ran is
dependant on the order they're added or an optional `priority` argument set when creating the hook (which defaults 
to a priority of `10`).

```javascript
hookedSum.before(beforeHook1);
hookedSum.before(beforeHook2, 9);
hookedSum.before(beforeHook3, 11);
hookedSum.after(afterHook1, 8);
hookedSum.after(afterHook2);

hookedSum(1, 1); // hookedSum -> beforeHook3 -> beforeHook1 -> beforeHook2 -> sum -> afterHook2 -> afterHook1
```

#### Bailing
A hook can bail early to skip the other hooks or to skip the hooked function altogether (effectively stubbing it).

```javascript
function bailHook(next, a, b) {
  next.bail(1, 1);
}

hookedIncrement.after(bailHook);
hookedIncrement.after(afterHook2);

// notice `afterHook2` is not called
hookedIncrement(1, 1, function callback(a, b) {}); // hookedIncrement -> increment -> bailHook -> callback(1, 1)

hookedIncrement.before(bailHook);

// notice not even the original `increment` function is called now
hookedIncrement(1, 1, function callback(a, b) {}); // hookedIncrement -> bailHook -> callback(1, 1)
```

If you want to bail completely (i.e. not even call the callback) then just don't call `next`.

#### Side-effect (or pass-through) only hooks
If you want to have a hook that just performs some side-effect before or after the hooked function but does not modify 
arguments, just call `next` and pass-through the arguments without modifying them.  It's important that `next` is
still called with the original arguments so that the hook-chain can continue.

```javascript
hookedIncrement.before(function sideEffect(next, ...args) {
  console.log("I'm a side-effect!");
  next.apply(this, args);
})
```

#### Naming
Hooks can be given a name and then they will be exported using the `.hooks` property.  This can be useful for defining the 
extensible API for your application.  _Note: You can also just expose references to the hooked functions themselves, 
this is just a convenience to group all those function references together._

```javascript
// some-applicaiton
import hookFactory from 'fun-hooks'; 
let hook = hookFactory(); // default configuration

function getItem(id, cb) {
  fetchItem(id).then(cb);
}

function getPrice(item) {
  return item.price;
}

hook('async', getItem, 'item'); // naming this hook `item`
hook('sync', getPrice, 'price'); // naming this hook `price`

export const hooks = hook.hooks;

// extending application
import { hooks } from 'some-application';

hooks.item.before(function modifyId(next, id) {
  let newId = getUpdatedId(id); // `id` naming scheme changed... luckily we have this hook available!
  next(newId);
});

hooks.price.after(function currencyConversion(next, price) {
  let newPrice = convert(price, 'USD');
  next(newPrice);
});
```

#### Objects
While functions are the base unit of extension in this library, there is a convenience provided to apply hooks to object
methods if an object is passed to the hook creator. _Note: `this` will be bound correctly in the hooked function as well 
as in the `before` and `after` hooks (i.e. `this` refers to the object instance inside hooks)._

```javascript
class Thing {
  constructor() {
    this.value = 1;
  }
  setValue(value) {
    this.value = value;
  },
  getValue() {
    return this.value;
  }
}
hook(Thing.prototype, ['setValue', 'getValue']);

let myThing = new Thing();

myThing.getValue.after(function(next) {
  next(2);
});

console.log(myThing.getValue()); // 2
```

_Note: `hook` will also walk the prototype chain and find `getValue` if it were an inherited method._

If `['setValue', 'getValue']` were omitted then `hook` would hook the results of
`Object.getOwnPropertyNames(Thing.prototype)` excluding `constructor` and any methods marked private with a preceding
underscore (e.g. `_privateMethod() {}`).  Also, if the list of methods to hook is omitted, `hook` will no longer walk 
the prototype chain to avoid creating accidental hooks.  

Hooked methods are all assumed to be `sync` unless otherwise specified.

```javascript
hook(Thing.prototype, ['setValue', 'sync:getValue' /* same as 'getValue' */, 'async:loadData']);
```

If a third argument, `name`, is provided, then the object's hooked methods will be added to the `.hooks` property 
described above in [Naming](#naming).

```javascript
hook(Thing.prototype, ['setValue', 'getValue'], 'thing');

hook.hooks; // {thing: {setValue, getValue}}
```

### Debugging
One of the hardest parts of using libraries that allow for hooking, intercepting, and/or adding some sort of middleware 
comes about when attempting to debug the code.  These libraries usually require a lot of scaffolding that manages
the hooks, caches results, changes some internal state, and calls the appropriate next hook in the sequence; this 
creates a debugging nightmare when you step into your wrapped function or your hook's `next` call and are now sifting 
through some library's scaffolding code helplessly trying to find your way back to your own code base.  

Fun Hooks solves this problem by doing as much work as possible when the hook is created (rather than when it's 
invoked) dynamically generating a wrapper function that already has the hooks (and the original function) chained in 
the proper callback order.  This means that the `next` function passed into each hook immediately invokes the next hook 
and not some scaffolding code.

example:
```
wrappedFn() => hook1() -> hook2() -> wrappedFn() -> hook3() -> hook4()
rather than
wrappedFn() => hook1() -> scaffolding -> hook2() -> scaffolding -> wrappedFn() ... etc
```
(Depending on the type and nature of the hook, some _might_ have a one-line wrapper function to do something like 
extract a return result from a `sync` function)

Also, when wrapping a function for extension, Fun Hooks returns a Proxy object rather than a wrapper function. This
allows the library to skip scaffolding code altogether if there are no hooks to apply, meaning if you step into your
`wrappedFn()` invocation but no hooks have been attached, you'll step directly into your `wrappedFn` code.

Finally, when you're stepping through your hooks or wrapped function code, the previously executed hooks will be still 
be present in the stack since they are all invoked by the previous hook as opposed to iteratively looped through in 
scaffolding code and invoked individually.

All of the above creates a pleasant hooking environment that is much easier to debug.

### Performance
Since most of the scaffolding code involved with function invocation has been avoided, this makes the execution of a 
function and all its hooks more efficient at the sake of a little more overhead when creating the hook. Considering 
hooked functions (and their hooks) are usually invoked a lot more frequently than hooks are added/removed, I think 
this is a decent trade-off.

Proxy forwarding is also much more performant than a function wrapper* (in a browser; in Node.js that currently 
doesn't seem to be the case, but will probably change as Proxies are further optimized).

### Footprint
Since this hooking library is written for Browsers first (as opposed to many in NPM which are expected to run in a Node
environment) the footprint and API is being kept as slim as possible.

## Code readability
Currently parts of this library are not very readable. Since much of the code is dynamically generated (using 
`new Function`) and is in strings it can't be properly minified by a minifier and is therefore written into the code 
pre-minified. This hurts readability but is necessary to remain as small as possible. Readability could probably 
still be improved somewhat but is considered low-priority compared to the goals stated above.  There are extensive 
tests to ensure the code is as bug-free as possible.

## `next` as first argument
It is a common convention in Javascript to pass callbacks as the last argument to a function. However, `fun-hooks` 
breaks this convention for a two reasons.

 1. Javascript provides `Funciton.prototype.bind` to set `this` as well as for providing partial function application. 
 `fun-hooks` uses this feature extensively in order to to stack the hooks in such a way that they directly call
 each other. However, `bind` only allows partially applying arguments starting from the left. If the `next` callback 
 were the last argument, this would require each hook being wrapped in another function to perform _right_ partial
 function application. (this is actually what is done for the hooked `async` function itself since it will have 
 its callback on the right by convention)
 2. Having the `next` callback on the left allows "pass-through" hooks to easily decouple themselves from worrying
 about function arity. (i.e. `(next, ...args) => { doSomething(); next.apply(null, args) }` is easy and still works 
 if parameters are added to the function, whereas `(a, b, next) => { doSomething(); next.call(null, a, b) }` is coupled 
 to the hooked function's interface and needs to be refactored if the interface changes)

## Development
(tests require Node v10.0.0+ for util.types.isProxy check)
```bash
npm run test 
# or with debugging
npm run test:debug
```