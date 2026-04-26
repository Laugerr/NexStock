/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    '../../packages/eslint-config/index.js',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
    es2022: true,
  },
  rules: {
    // React 18 doesn't require React in scope
    'react/react-in-jsx-scope': 'off',
  },
}
