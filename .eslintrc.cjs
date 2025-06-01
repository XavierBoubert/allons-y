/* eslint-env node */
module.exports = {
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/recommended',
  ],
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: [
      './tsconfig.json',
    ],
  },
  plugins: ['@typescript-eslint', 'import'],
  root: true,
  rules: {
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: ['**/*.spec.ts'],
      includeInternal: false
    }],
    'max-len': ['error', 140],
    'object-curly-newline': ['error', {
      ObjectExpression: {
        multiline: true,
        consistent: true
      },
      ObjectPattern: {
        multiline: true,
        consistent: true
      },
      ImportDeclaration: {
        multiline: true,
        consistent: true
      },
      ExportDeclaration: {
        multiline: true,
        consistent: true
      }
    }],
    'function-paren-newline': ['error', 'consistent'],
    'newline-before-return': ['error'],
    '@typescript-eslint/consistent-type-imports': ['warn', {
      prefer: 'type-imports',
      disallowTypeAnnotations: false,
      fixStyle: 'separate-type-imports',
    }]
  },
  ignorePatterns: [
    '.eslintrc.cjs', 'jest.config.ts', 'node_modules', 'dist', 'coverage',
  ],
};
