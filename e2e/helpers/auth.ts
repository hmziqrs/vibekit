import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export const ADMIN = { email: 'admin@vibekit.local', password: 'admin12345678', name: 'Test Admin' }
export const USER = { email: 'user@vibekit.local', password: 'user12345678', name: 'Test User' }

export async function dismissCookieConsent(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: /cookie consent/i })
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: 'Decline' }).click().catch(() => {})
  }
}

export async function login(
  page: Page,
  credentials: { email: string; password: string },
  next?: string,
): Promise<void> {
  const loginUrl = next ? `/login?next=${encodeURIComponent(next)}` : '/login'
  await page.goto(loginUrl, { waitUntil: 'networkidle' })
  await page.fill('input[name="email"], input[type="email"]', credentials.email)
  await page.fill('input[name="password"], input[type="password"]', credentials.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/app/**', { timeout: 10000 })
  await page.waitForLoadState('networkidle')
  await dismissCookieConsent(page)
}

export async function logout(page: Page): Promise<void> {
  await dismissCookieConsent(page)
  await page.getByRole('button', { name: /sign out/i }).click()
  // Sign out invalidates the session; the layout guard may redirect to /login?next=...
  // before goto('/') runs. Accept either / or /login.
  await page.waitForURL(/^(.*\/(login|\?))|\/$/, { timeout: 10000 })
}

export async function assertOnLogin(page: Page): Promise<void> {
  await page.waitForURL(/\/login/, { timeout: 10000 })
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
  await loginAsAdmin(page)
  await page.goto('/admin/dashboard')
  await page.waitForLoadState('networkidle')
  await dismissCookieConsent(page)
}
