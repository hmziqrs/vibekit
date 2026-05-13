import { test } from '@playwright/test'

import { runRenderingAudit } from './audit'
import { ROUTES } from './manifest'

const TEST_EMAIL = 'admin@vibekit.local'
const TEST_PASSWORD = 'admin12345678'

const AUTH_ROUTES = ROUTES.filter((r) => r.authenticatedStrategy)

async function login(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL)
  await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/app/**', { timeout: 10_000 })
  await page.waitForLoadState('networkidle')

  const currentUrl = page.url()
  if (!currentUrl.includes('/app')) {
    throw new Error(`Login failed — redirected to ${currentUrl} instead of /app`)
  }
}

test.describe('Authenticated CSR Rendering Proof', () => {
  test('login then prove SPA routes render client-side', async ({ page }) => {
    await runRenderingAudit(page, {
      routes: AUTH_ROUTES,
      setup: login,
      strategyKey: 'authenticatedStrategy',
      subtitle: `Logged in as: ${TEST_EMAIL}\n  Proving: ssr=false routes send EMPTY SHELL from server,\n           then client JavaScript renders all content.`,
      title: 'AUTHENTICATED CSR RENDERING PROOF',
    })
  })
})
