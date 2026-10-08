import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Backend boundary: only src/lib/data talks to the data backend, and only it and
  // src/lib/ipc talk to Electron. Swapping backends should only touch src/lib/data.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/data/**', 'src/lib/ipc/**', 'src/electron/**', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='window'][property.name='electron']",
          message: 'Use a function from ~/lib/data (data) or ~/lib/ipc (Electron features) instead of window.electron.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['convex', 'convex/*', '@convex-dev/*', '**/convex/_generated/*'],
              message: 'Only ~/lib/data may talk to the data backend.',
            },
          ],
        },
      ],
    },
  },
)
