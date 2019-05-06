
var _ = require("lodash");
var process = require("process");
var benchmark = require("benchmark");
var Benchmark = benchmark.runInContext({_, process});
//window.Benchmark = Benchmark;
var hookNoEval = require("./index.js")();
var hookEval = require("./index.eval")();

var addHooks = new Benchmark.Suite("add hooks");

var hook = function(next, a, b) {
  next(a + 1, b + 1);
};

var hookedEval;
var hookedNoEval;

addHooks
  .add("add hooks eval", function() {
    function increment(a, b, cb) {
      cb(a + 1, b + 1);
    }
    hookedEval = hookEval("async", increment);
    hookedEval.before(hook);
    hookedEval.before(hook);
    // hookedEval.after(hook);
    // hookedEval.after(hook);
  })
  .add("add hooks no eval", function() {
    function increment(a, b, cb) {
      cb(a + 1, b + 1);
    }
    hookedNoEval = hookNoEval("async", increment);
    hookedNoEval.before(hook);
    hookedNoEval.before(hook);
    // hookedNoEval.after(hook);
    // hookedNoEval.after(hook);
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run();

var executeHooks = new Benchmark.Suite("execute hooks");
executeHooks
  .add("execute hooks eval", function() {
    hookedEval(1, 2, function() {})
  })
  .add("execute hooks no eval", function() {
    hookedNoEval(1, 2, function() {})
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run();
