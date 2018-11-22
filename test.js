
if (typeof window !== 'undefined') {
  window.define = {};
  window.define.amd = {};
}

var Benchmark = require('benchmark');
var suite = new Benchmark.Suite;

let prebidHook = require('./hooks.js');
let newHook = require('./index.js')();

function fn(a, b, cb) {
  cb(a + b, 1);
}

let newHookFn = newHook('async', fn);
let newHookNoHooksFn = newHook('async', fn);
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
  add('new hook', function() {
    // newHookFn(1, 2, function() {});
    newHookNoHooksFn(1, 2, function() {});
  }).
  add('prebid hook', function() {
    // prebidHookFn(1, 2);
    prebidHookNoHooksFn(1, 2, function() {});
  }).
  on('cycle', function(event) {
    console.log(String(event.target));
  }).
  on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  }).
  run();
