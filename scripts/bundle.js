let Terser = require("terser");
let _ = require("lodash");
let mkdirp = require("mkdirp");

let fs = require("fs");
let path = require("path");

/* global __dirname */
let pkg = require(path.resolve(__dirname, "../package.json"));

let outDir = path.resolve(__dirname, "../dist");
let outFile = "fun-hooks.js";
let outMinFile = outFile.replace(".", ".min.");

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
  code: fs.readFileSync(path.resolve(__dirname, "../index.js"), "utf-8")
});

license = _.template(license)({
  date: date(),
  version: pkg.version,
  author: "@snapwich"
});

lib = license + lib;

let result = Terser.minify(
  {
    "fun-hooks.js": lib
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

mkdirp(path.resolve(__dirname, "../dist"), err => {
  if (err) {
    throw err;
  }

  Promise.all(
    _.map(
      {
        [path.join(outDir, outFile)]: lib,
        [path.join(outDir, outMinFile)]: result.code,
        [path.join(outDir, outMinFile + ".map")]: result.map
      },
      (code, file) =>
        new Promise((resolve, reject) => {
          fs.writeFile(file, code, "utf8", err => {
            if (err) {
              return reject(err);
            }
            resolve(file);
          });
        })
    )
  )
    .then(files => {
      // eslint-disable-next-line no-console
      console.log("bundle output:\n", files);
    })
    .catch(err => {
      throw err;
    });
});

function pad(n, width = 2) {
  n = n + "";
  return n.length >= width ? n : new Array(width - n.length + 1).join(0) + n;
}

function date() {
  let today = new Date();
  let day = pad(today.getDate());
  let month = pad(today.getMonth() + 1);
  return [today.getFullYear(), month, day].join("-");
}
