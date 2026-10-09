// @ts-check
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Money is integer sen, never a float (CLAUDE.md). Nowhere in the source may text become a float or a
// float become text. Banned everywhere amounts can flow (the app, the API, the worker and core), by
// name and by route (QA B01, findings 3 and run 2's 4): toFixed and toPrecision; Number(…), a unary +,
// parseInt and parseFloat, however they're reached (Number.parseInt, window.parseFloat, globalThis.Number,
// new Number); an input's valueAsNumber. Outside the money module, sen never becomes ringgit or back by
// hand either: no / 100, no Math.round(… * 100), no Intl.NumberFormat and no toLocaleString. formatSen,
// parseSen and percent do those, in packages/core/src/money.ts. Only the looks' drawing code is exempt.
// scripts/no-float.test.mjs plants each of these and checks this config catches it. What no selector
// sees (JSON.parse of a number, a string coerced by * 1) is left to review and the types.
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
    selector: "CallExpression[callee.property.name='Number']",
    message: 'Money is integer sen: parse typed text with parseSen, never Number().',
  },
  {
    selector: "NewExpression[callee.name='Number']",
    message: 'Money is integer sen: parse typed text with parseSen, never new Number().',
  },
  {
    selector: "UnaryExpression[operator='+']",
    message: 'Money is integer sen: parse typed text with parseSen, never a unary +.',
  },
  {
    selector: "CallExpression[callee.name='parseInt']",
    message: 'Money is integer sen: parse typed text with parseSen, never parseInt.',
  },
  {
    selector: 'MemberExpression[property.name=/^(parseInt|parseFloat)$/]',
    message: 'Money is integer sen: parse typed text with parseSen, never parseInt or parseFloat.',
  },
  {
    selector: "MemberExpression[property.name='valueAsNumber']",
    message: "Money is integer sen: read the input's text and parse it with parseSen, never valueAsNumber.",
  },
];
const conversionBans = [
  {
    selector: "BinaryExpression[operator='/'][right.value=100]",
    message: 'Money is integer sen: show it with formatSen, never sen / 100.',
  },
  {
    selector: "CallExpression[callee.object.name='Math'] > BinaryExpression[operator='*'][right.value=100]",
    message: 'Money is integer sen: parse with parseSen, or show a share with percent, never Math.round(x * 100).',
  },
  {
    selector: "MemberExpression[object.name='Intl'][property.name='NumberFormat']",
    message: 'Money is integer sen: format with formatSen, never Intl.NumberFormat.',
  },
  {
    selector: "CallExpression[callee.property.name='toLocaleString']",
    message: 'Money is integer sen: format amounts with formatSen and dates with lib/dates, never toLocaleString.',
  },
];
/** The one place sen becomes ringgit text and back. */
export const MONEY_MODULE = ['packages/core/src/money.ts'];

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
      // The shell's Android project: Gradle's outputs and Capacitor's copies of www/.
      'apps/shell/android/**',
      'apps/shell/core/build/**',
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
      'no-restricted-syntax': ['error', ...moneyBans, ...conversionBans],
    },
  },
  {
    // Number(), a unary + and parseInt are allowed only where no amount can flow: the looks' drawing
    // code, which reads its own SVG geometry.
    files: DRAWING_FILES,
    rules: { 'no-restricted-syntax': ['error', ...floatBans] },
  },
  { files: MONEY_MODULE, rules: { 'no-restricted-syntax': ['error', ...moneyBans] } },
  { files: ['**/*.test.{ts,tsx}', '**/e2e/**'], rules: { 'no-restricted-syntax': 'off' } },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' },
  },
);
