import { defineConfig, devices } from '@playwright/test';

// One place for environment values. Point the suite elsewhere with BASE_URL.
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'reports/html', open: 'never' }]],
  outputDir: 'reports/artifacts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      // API tests use the `request` fixture only, so no browser is launched.
      name: 'api',
      testDir: './tests/api',
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
