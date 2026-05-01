import { defineConfig } from '@playwright/test'

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  reporter: 'html',
  retries: process.env.CI ? 2 : 0,
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'bun run preview',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    url: 'http://localhost:4173',
  },
  workers: process.env.CI ? 1 : undefined,
})
