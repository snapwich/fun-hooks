
let Terser = require('terser');
let _ = require('lodash');
let mkdirp = require('mkdirp');

let fs = require('fs');
let path = require('path');

let pkg = require(path.resolve(__dirname, '../package.json'));

let outFile = 'fun-hooks.min.js';

let license = `/*
* @license MIT
* Fun Hooks v<%= version %>
* (c) <%= author %>
*/
`;

let wrapper = `
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof exports === 'object') {
    // Node, CommonJS-like
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.funHooks = factory();
  }
}(this, function () {
  let module = {};  
  <%= code %>
  return module.exports;
}));
`;

let lib = _.template(wrapper)({
  code: fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf-8')
});

license = _.template(license)({
  date: date(),
  version: pkg.version,
  author: '@snapwich'
});

let result = Terser.minify({
  // "license.js": license,
  "fun-hooks.js": license + lib
}, {
  output: {
    comments: "some"
  },
  sourceMap: {
    filename: outFile,
    url: outFile + '.map'
  }
});

if (result.error) {
  throw result.error;
}

console.log(result.code);

mkdirp(path.resolve(__dirname, '../dist'), err => {
  if (err) {
    throw err;
  }
  fs.writeFile(path.resolve(__dirname, `../dist/${outFile}`), result.code, 'utf8', err => {
    if (err) {
      throw err;
    }
    fs.writeFile(path.resolve(__dirname, `../dist/${outFile}.map`), result.map, 'utf8', err => {
      if (err) {
        throw err;
      }
      console.log(`successfully built: ${outFile}`)
    });
  });
});

function pad(n, width = 2) {
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(0) + n;
}

function date() {
  let today = new Date();
  let day = pad(today.getDate());
  let month = pad(today.getMonth() + 1);
  return [today.getFullYear(), month, day].join('-');
}