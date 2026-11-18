import { defineConfig, devices } from '@playwright/test';
import { env } from './framework/config/env';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // One retry in CI. A test that passes on retry is a flake and gets reported, not ignored.
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'reports/html', open: 'never' }]],
  outputDir: 'reports/artifacts',
  use: {
    baseURL: env.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      // Checks each user's token and saves their auth state to .auth/ before any test runs.
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      // API tests use the `request` fixture only, so no browser is launched.
      name: 'api',
      testDir: './tests/api',
      dependencies: ['setup'],
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
