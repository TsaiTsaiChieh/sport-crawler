module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true
  },
  extends: ['standard'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  rules: {
    camelcase: 'off',
    'no-tabs': 0,
    'no-async-promise-executor': 0,
    'prefer-promise-reject-errors': 0,
    'block-spacing': 0,
    'space-before-function-paren': ['error', 'never'],
    semi: ['error', 'always'],
    'no-useless-escape': 0
  }
};
