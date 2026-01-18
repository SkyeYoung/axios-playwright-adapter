import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for API requests */
    baseURL: 'https://jsonplaceholder.typicode.com',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Record video on first retry */
    video: 'on-first-retry',
  },

  /* Configure projects for different scenarios */
  projects: [
    {
      name: 'api-tests',
      testMatch: '**/*.spec.ts',
    },
  ],

  /* Timeout for each test */
  timeout: 30000,

  /* Timeout for each expect() call */
  expect: {
    timeout: 5000,
  },
});
