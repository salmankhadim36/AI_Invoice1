/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Tests run on a fixed clock. It lives here rather than in jest.setup.ts
  // because @testing-library/react-native briefly swaps in real timers and then
  // re-installs fake ones — which restarts any clock set in a setup file at the
  // real time. Every re-install reads `now` from this config.
  fakeTimers: {
    enableGlobally: true,
    doNotFake: ['nextTick'],
    now: Date.parse('2026-01-15T12:00:00.000Z'),
  },
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/*.test.[jt]s?(x)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/features/_TEMPLATE/**',
    '!src/theme/**',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-worklets))',
  ],
};
