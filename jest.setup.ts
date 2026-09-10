/**
 * Global test setup. Keep this small — per-test mocks belong in the test file.
 */

// Config reads this at import time; without it every suite logs a setup warning.
process.env.EXPO_PUBLIC_API_URL ??= 'https://api.test.invalid';
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://supabase.test.invalid';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'test-publishable-key';

// AsyncStorage is a native module; the store's persist middleware needs a stand-in.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports, so require() is the only option here.
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Tests must be deterministic: no real clock (fixed in jest.config.js →
// fakeTimers), no real network, no real randomness.
global.fetch = jest.fn(() => {
  throw new Error('Unmocked network call in a test — mock @/services/api-client instead.');
}) as unknown as typeof fetch;
