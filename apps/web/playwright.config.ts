import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['allure-playwright', { outputFolder: 'allure-results' }]],
  use: {
    baseURL: 'http://localhost:5190',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx vite --port 5190',
    url: 'http://localhost:5190',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
