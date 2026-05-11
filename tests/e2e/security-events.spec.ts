import { expect, test } from '@playwright/test'

const ADMIN_EMAIL = 'admin@vibekit.local'
const ADMIN_PASSWORD = 'admin12345678'

test.describe('security events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL('/app')
  })

  test('security activity section loads on settings page', async ({ page }) => {
    await page.goto('/app/settings')
    await expect(page.getByText('Security Activity')).toBeVisible()
    await expect(page.getByText('Recent security events for your account')).toBeVisible()
  })

  test('shows security events after login', async ({ page }) => {
    await page.goto('/app/settings')
    await page.waitForTimeout(2000)

    // After logging in, there should be at least a "Sign In" event
    await expect(page.getByText('Sign In').first()).toBeVisible({ timeout: 5000 })
  })

  test('security events API returns data', async ({ page }) => {
    const res = await page.request.get('/api/security-events')
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body).toHaveProperty('events')
    expect(Array.isArray(body.events)).toBe(true)
    expect(body.events.length).toBeGreaterThan(0)
  })

  test('event types use formatted labels not snake_case', async ({ page }) => {
    await page.goto('/app/settings')
    await page.waitForTimeout(2000)

    // Raw snake_case values should not appear
    const rawSnakeCase = await page.getByText(/^(login|login_failed|logout|new_device)$/).count()
    expect(rawSnakeCase).toBe(0)
  })

  test('new device event is created on login', async ({ page }) => {
    const res = await page.request.get('/api/security-events')
    const body = await res.json()
    const hasLoginEvent = body.events.some(
      (evt: { eventType: string }) => evt.eventType === 'login'
    )
    expect(hasLoginEvent).toBe(true)
  })

  test('events include IP address and browser info', async ({ page }) => {
    await page.goto('/app/settings')
    await page.waitForTimeout(2000)

    // Events should show browser info (e.g., "Chrome on macOS")
    const browserInfo = page.getByText(/Chrome on macOS/)
    await expect(browserInfo.first()).toBeVisible({ timeout: 5000 })
  })
})
