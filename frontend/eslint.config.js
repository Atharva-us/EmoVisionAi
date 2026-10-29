import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Tests, context modules (provider + hook + helpers) and shared chart constants
    // intentionally export non-components.
    files: [
      '**/*.test.{ts,tsx}',
      'src/test/**',
      'src/context/**',
      'src/App.tsx',
      'src/charts/ChartTooltip.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
);
