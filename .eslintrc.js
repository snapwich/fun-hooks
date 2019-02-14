module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    "jest/globals": true
  },
  extends: "eslint:recommended",
  plugins: ["jest", "prettier"],
  parserOptions: {
    ecmaVersion: 2017
  },
  rules: {
    "prettier/prettier": "error",
    "linebreak-style": [
      "error",
      "unix"
    ]
  }
};
