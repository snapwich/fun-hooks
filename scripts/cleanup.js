let shell = require("shelljs");
let path = require("path");

/* global __dirname */

shell.rm("-rf", path.join(__dirname, "../dist"));
shell.rm("-rf", path.join(__dirname, "../eval"));
shell.rm("-rf", path.join(__dirname, "../no-eval"));
