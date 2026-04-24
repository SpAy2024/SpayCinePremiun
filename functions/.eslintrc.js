module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2018,
  },
  extends: [
    "eslint:recommended",
  ],
  rules: {
    "quotes": "off",
    "max-len": "off",
    "eol-last": "off",
    "no-unused-vars": "off",
  },
  globals: {},
};