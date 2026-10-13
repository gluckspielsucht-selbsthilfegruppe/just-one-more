import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import playwright from 'eslint-plugin-playwright';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    files: ['src/client/**/*.{ts,tsx}', 'tests/client/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], jsxA11y.configs.recommended],
    languageOptions: { globals: globals.browser },
    // Existing findings, tracked as M-07 in docs/technical-plan.md; `npm run lint` caps the count.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'jsx-a11y-x/label-has-associated-control': 'warn',
      'jsx-a11y-x/no-autofocus': 'warn',
      'jsx-a11y-x/no-noninteractive-tabindex': 'warn',
      'jsx-a11y-x/click-events-have-key-events': 'warn',
      'jsx-a11y-x/no-noninteractive-element-interactions': 'warn',
    },
  },
  {
    files: ['src/server/**/*.ts', 'tests/**/*.ts', '*.{ts,js}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['tests/{unit,client,integration}/**/*.{ts,tsx}'],
    extends: [vitest.configs.recommended],
    rules: { 'vitest/no-conditional-expect': 'warn' },
  },
  {
    files: ['tests/e2e/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
]);
