const js = require("@eslint/js");
const globals = require("globals");
const jestPlugin = require("eslint-plugin-jest");
const prettierPlugin = require("eslint-plugin-prettier");

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2017,
      sourceType: "commonjs",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest
      }
    },
    plugins: {
      jest: jestPlugin,
      prettier: prettierPlugin
    },
    rules: {
      "prettier/prettier": "error",
      "linebreak-style": ["error", "unix"],
      "no-redeclare": ["error", { builtinGlobals: false }],
      "no-console": "error"
    }
  }
];
