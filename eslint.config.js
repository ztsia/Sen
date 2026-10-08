// @ts-check
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Money is integer sen, never a float (CLAUDE.md). Nowhere in the source may text become a float or a
// float become text: no parseFloat and no toFixed. Number(…), a unary + and parseInt are banned too,
// because each turns "12.50" into a float or drops its sen, everywhere amounts can flow: the app, the
// API, the worker and core (QA B01, finding 3). Only the looks' drawing code is exempt. scripts/no-float.test.mjs plants each of these and checks this config catches it.
const floatBans = [
  {
    selector: "CallExpression[callee.property.name='toFixed']",
    message: 'Money is integer sen: format with formatSen, never toFixed.',
  },
  {
    selector: "CallExpression[callee.property.name='toPrecision']",
    message: 'Money is integer sen: format with formatSen, never toPrecision.',
  },
];
const moneyBans = [
  ...floatBans,
  {
    selector: "CallExpression[callee.name='Number']",
    message: 'Money is integer sen: parse typed text with parseSen, never Number().',
  },
  {
    selector: "UnaryExpression[operator='+']",
    message: 'Money is integer sen: parse typed text with parseSen, never a unary +.',
  },
  {
    selector: "CallExpression[callee.name='parseInt']",
    message: 'Money is integer sen: parse typed text with parseSen, never parseInt.',
  },
];
export const MONEY_FILES = [
  '**/money*.{ts,tsx}',
  '**/money/**/*.{ts,tsx}',
  '**/Money*.tsx',
  '**/*-money*.{ts,tsx}',
  '**/*Money*.tsx',
];

export const DRAWING_FILES = ['packages/looks/src/**/*.{ts,tsx}'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-production/**',
      'docs/ui/directions/**',
      '.claude/**',
      'coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'qa-artifacts/**',
      'apps/web/src/styles/looks.gen.css',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // the app's and packages' source: where money flows
    files: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'parseFloat', message: 'Money is integer sen: parse typed text with parseSen.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Number', property: 'parseFloat', message: 'Money is integer sen: parse typed text with parseSen.' },
      ],
      'no-restricted-syntax': ['error', ...moneyBans],
    },
  },
  {
    // Number(), a unary + and parseInt are allowed only where no amount can flow: the looks' drawing
    // code, which reads its own SVG geometry.
    files: DRAWING_FILES,
    rules: { 'no-restricted-syntax': ['error', ...floatBans] },
  },
  { files: MONEY_FILES, rules: { 'no-restricted-syntax': ['error', ...moneyBans] } },
  { files: ['**/*.test.{ts,tsx}', '**/e2e/**'], rules: { 'no-restricted-syntax': 'off' } },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' },
  },
);
