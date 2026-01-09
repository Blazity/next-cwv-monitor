import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  workers: isCI ? 1 : undefined, 
  fullyParallel: !isCI,
  timeout: isCI ? 60_000 : 30_000,
  expect: { timeout: 10_000 },
  webServer: {
    command: isCI ? 'pnpm run start -p 3001' : 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !isCI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});