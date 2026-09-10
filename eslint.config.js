// ESLint 9 flat config. The architecture rules in CLAUDE.md §3 are enforced
// here as real lint errors — a rule nothing checks is a rule nothing follows.
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettier,
  {
    ignores: ['dist/*', 'web-build/*', '.expo/*', 'node_modules/*', 'android/*', 'ios/*'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Use api() from @/services/api-client (CLAUDE.md §4.5).' },
      ],
    },
  },
  {
    // Imports flow downward only: nothing under src/ may reach into the routes layer.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/app/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*', '**/app/*'],
              message: 'src/ must not import from the routes layer (CLAUDE.md §3).',
            },
          ],
        },
      ],
    },
  },
  {
    // Shared UI stays dumb: no store, no services, no feature/domain knowledge.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/store/*', '@/features/*', '@/services/*'],
              message:
                'src/components/ui must stay presentational: no store, feature, or service imports (CLAUDE.md §3).',
            },
          ],
        },
      ],
    },
  },
  {
    // Only the API client may call fetch directly.
    files: ['src/services/api-client.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'jest.setup.ts'],
    rules: { 'no-console': 'off', 'no-restricted-globals': 'off' },
  },
];
