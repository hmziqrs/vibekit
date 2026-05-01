import { defineConfig } from '@playwright/test'

export default defineConfig({
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  reporter: 'html',
  retries: process.env.CI ? 2 : 0,
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'bun run dev',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    url: 'http://localhost:5173',
  },
  workers: process.env.CI ? 1 : undefined,
})
