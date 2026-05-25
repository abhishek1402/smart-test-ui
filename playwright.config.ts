import { defineConfig, devices } from '@playwright/test';
import { userProjectsConfig } from './user-projects.config'

export default defineConfig({
  // testDir: './e2e-tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  timeout: 3 * 60 * 1000, // 3 minutes per test
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 3,
  /* Opt out of parallel tests on CI. */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  workers: process.env.CI ? 1 : 4,
  use: {
    baseURL: process.env.BASE_URL || 'https://cleartax-qa-http.internal.cleartax.co',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      headless: true, // or false for debugging
      slowMo: 1000, // 👈 increased to prevent skipped inputs
    },
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: '**/*.setup.ts',
    },

    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        // storageState: '.auth/user.json',
      },
      // dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/user.json',
      },
      // dependencies: ['setup'],
    },
    ...userProjectsConfig,
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
