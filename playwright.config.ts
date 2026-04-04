import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: './tests/global-setup.ts',
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Match Docker's UTC timezone so seed dates align with browser "today"
    timezoneId: 'UTC',
  },
  projects: [
    // Auth setup — runs first, saves login state
    { name: 'setup', testMatch: /.*\.setup\.ts/, teardown: 'cleanup' },
    // Cleanup — runs after all tests
    { name: 'cleanup', testMatch: /.*\.teardown\.ts/ },
    // Tests — use authenticated state
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  // Start Vite dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
