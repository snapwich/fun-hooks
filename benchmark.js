
if (typeof window !== 'undefined') {
  window.define = {};
  window.define.amd = {};
}

var Benchmark = require('benchmark');
var suite = new Benchmark.Suite;

let prebidHook = require('./hooks.js');
let newHook = require('./index.js')();
let newHookWrapped = require('./index.js')({
  useProxy: false
});

function fn(a, b, cb) {
  cb(a + b, 1);
}

let newHookFn = newHook('async', fn);
let newHookNoHooksFn = newHook('async', fn);
let newHookWrappedFn = newHookWrapped('async', fn);
let newHookNoHooksWrappedFn = newHookWrapped('async', fn);
newHookFn.before(function (cb, a, b) {
  a++;
  cb.apply(this, [a, b]);
});
newHookFn.before(function (cb, a, b){
  a++;
  cb.apply(this, [a, b]);
});
newHookFn.before(function (cb, a, b){
  a++;
  cb.apply(this, [a, b]);
});
newHookFn.after(function (cb, a, b){
  a++;
  cb.apply(this, [a, b]);
});
newHookFn.after(function (cb, a, b){
  a++;
  cb.apply(this, [a, b]);
});
newHookFn.after(function (cb, a, b){
  a++;
  cb.apply(this, [a, b]);
});

newHookWrappedFn.before(function (cb, a, b) {
  a++;
  cb.apply(this, [a, b]);
});
newHookWrappedFn.before(function (cb, a, b){
  a++;
  cb.apply(this, [a, b]);
});
newHookWrappedFn.before(function (cb, a, b){
  a++;
  cb.apply(this, [a, b]);
});
newHookWrappedFn.after(function (cb, a, b){
  a++;
  cb.apply(this, [a, b]);
});
newHookWrappedFn.after(function (cb, a, b){
  a++;
  cb.apply(this, [a, b]);
});
newHookWrappedFn.after(function (cb, a, b){
  a++;
  cb.apply(this, [a, b]);
});

let prebidHookFn = prebidHook('asyncSeries', fn);
let prebidHookNoHooksFn = prebidHook('asyncSeries', fn);
prebidHookFn.addHook(function (a, b, cb) {
  a++;
  cb.apply(this, [a, b]);
}, 15);
prebidHookFn.addHook(function (a, b, cb){
  a++;
  cb.apply(this, [a, b]);
}, 14);
prebidHookFn.addHook(function (a, b, cb){
  a++;
  cb.apply(this, [a, b]);
}, 13);
prebidHookFn.addHook(function (a, b, cb){
  a++;
  cb.apply(this, [a, b]);
}, 12);
prebidHookFn.addHook(function (a, b, cb){
  a++;
  cb.apply(this, [a, b]);
}, 11);
prebidHookFn.addHook(function (a, b, cb){
  a++;
  cb.apply(this, [a, b]);
}, 11);

suite.
add('prebid hook with hooks', function() {
  prebidHookFn(1, 2);
}).
add('prebid hook no hook', function() {
  prebidHookNoHooksFn(1, 2, function() {});
}).
add('new hook with hooks', function() {
  newHookFn(1, 2, function() {});
}).
add('new hook no hook', function() {
  newHookNoHooksFn(1, 2, function() {});
}).
add('new wrapped hook with hooks', function() {
  newHookWrappedFn(1, 2, function() {});
}).
add('new wrapped hook no hooks', function() {
  newHookNoHooksWrappedFn(1, 2, function() {});
}).
on('cycle', function(event) {
  console.log(String(event.target));
}).
// on('complete', function() {
//   console.log('Fastest is ' + this.filter('fastest').map('name'));
// }).
run();
