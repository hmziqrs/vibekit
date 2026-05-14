import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export const ADMIN = { email: 'admin@vibekit.local', name: 'Test Admin', password: 'admin12345678' }
export const USER = { email: 'user@vibekit.local', name: 'Test User', password: 'user12345678' }

export async function dismissCookieConsent(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: /cookie consent/i })
  if (await dialog.isVisible()) {
    await dialog
      .getByRole('button', { name: 'Decline' })
      .click()
      .catch(() => {})
  }
}

export async function login(
  page: Page,
  credentials: { email: string; password: string },
  next?: string
): Promise<void> {
  // If already on an app page, we're logged in
  if (page.url().includes('/app/')) return
  const loginUrl = next ? `/login?next=${encodeURIComponent(next)}` : '/login'
  await page.goto(loginUrl, { waitUntil: 'networkidle' })
  // If redirected to app, already logged in
  if (page.url().includes('/app/')) {
    await dismissCookieConsent(page)
    return
  }
  await page.fill('input[name="email"], input[type="email"]', credentials.email)
  await page.fill('input[name="password"], input[type="password"]', credentials.password)
  await page.locator('form button[type="submit"]').first().click()
  await page.waitForURL('**/app/**', { timeout: 10_000 })
  await page.waitForLoadState('networkidle')
  await dismissCookieConsent(page)
}

export async function logout(page: Page): Promise<void> {
  await dismissCookieConsent(page)
  await page.getByRole('button', { name: /sign out/i }).click()
  // Sign out invalidates the session; the layout guard may redirect to /login?next=...
  // Before goto('/') runs. Accept either / or /login.
  await page.waitForURL(/^(.*\/(login|\?))|\/$/, { timeout: 10_000 })
}

export async function assertOnLogin(page: Page): Promise<void> {
  await page.waitForURL(/\/login/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/login/)
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await login(page, ADMIN)
}

export async function goToItems(page: Page): Promise<void> {
  await loginAsAdmin(page)
  await page.getByRole('link', { name: 'Items' }).first().click()
  await expect(page).toHaveURL('/app/items')
  await page.waitForLoadState('networkidle')
}

export async function goToAdmin(page: Page): Promise<void> {
  // Try navigating to admin directly — if session is still valid, this works
  await page.goto('/admin/dashboard', { waitUntil: 'networkidle' }).catch(() => {})
  if (page.url().includes('/admin/')) {
    await dismissCookieConsent(page)
    return
  }
  // Session expired — wait for rate limit window, then re-login
  await page.waitForTimeout(5000)
  await loginAsAdmin(page)
  await page.goto('/admin/dashboard', { waitUntil: 'networkidle' })
  await dismissCookieConsent(page)
}
