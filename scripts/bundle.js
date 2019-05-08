let path = require("path");
let fs = require("fs");
let pp = require("preprocess");
let Terser = require("terser");
let _ = require("lodash");
let mkdirp = require("mkdirp");
let argv = require("yargs").argv;

/* global module, require, __dirname */

let pkg = require(path.resolve(__dirname, "../package.json"));

let code = fs.readFileSync(path.resolve(__dirname, "../index.js"), "utf-8");

let outDir = path.resolve(__dirname, "../dist");

function minify(name, code) {
  let outMinFile = name.replace(".", ".min.");
  let result = Terser.minify(
    {
      [name]: code
    },
    {
      output: {
        comments: "some"
      },
      sourceMap: {
        filename: outMinFile,
        url: outMinFile + ".map"
      }
    }
  );
  if (result.error) {
    throw result.error;
  }
  return result;
}

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
  code: code
});

license = _.template(license)({
  version: pkg.version,
  author: "@snapwich"
});

lib = license + lib;

let evalCode = pp.preprocess(lib, { EVAL: true }, { type: "js" });
let noEvalCode = pp.preprocess(lib, {}, { type: "js" });

let minEvalCode = minify("fun-hooks.js", evalCode);
let minNoEvalCode = minify("fun-hooks.no-eval.js", noEvalCode);

let output = {
  "fun-hooks.js": evalCode,
  "fun-hooks.min.js": minEvalCode.code,
  "fun-hooks.min.js.map": minEvalCode.map,
  "fun-hooks.no-eval.js": noEvalCode,
  "fun-hooks.no-eval.min.js": minNoEvalCode.code,
  "fun-hooks.no-eval.min.js.map": minNoEvalCode.map,
  "../no-eval/index.js": noEvalCode,
  "../eval/index.js": evalCode
};

if (argv.output) {
  Promise.all(
    _.map(output, (code, name) => {
      let file = path.join(outDir, name);
      return new Promise((resolve, reject) => {
        mkdirp(path.dirname(file), err => {
          if (err) {
            return reject(err);
          }
          fs.writeFile(file, code, "utf-8", err => {
            if (err) {
              return reject(err);
            }
            resolve(file);
          });
        });
      });
    })
  ).then(files => {
    // eslint-disable-next-line no-console
    console.log("bundle output:\n", files);
  });
} else {
  module.exports = output;
}
