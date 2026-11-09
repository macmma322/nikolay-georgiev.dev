import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  workers: 1,
  timeout: 120_000,
  reporter: 'list',
  outputDir: '../../test-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:18787',
    viewport: { width: 1440, height: 900 },
  },
});
