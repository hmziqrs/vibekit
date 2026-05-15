import { expect, test } from '@playwright/test'

import { login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('Notification Preferences', () => {
  test('loads notification preferences page', async ({ page }) => {
    await login(page, { email: 'user@vibekit.local', password: 'user12345678' })
    await page.goto('/app/settings/notifications', { waitUntil: 'networkidle' })

    await expect(page.getByRole('heading', { name: /notification preferences/i })).toBeVisible()
    await expect(page.getByText('Choose how you want to be notified')).toBeVisible()
  })

  test('renders all notification types', async ({ page }) => {
    await login(page, { email: 'user@vibekit.local', password: 'user12345678' })
    await page.goto('/app/settings/notifications', { waitUntil: 'networkidle' })

    const types = ['Broadcasts', 'Billing', 'Security', 'Comments', 'Organizations', 'General']
    for (const type of types) {
      await expect(page.getByText(type, { exact: true })).toBeVisible()
    }
  })

  test('renders channel column headers', async ({ page }) => {
    await login(page, { email: 'user@vibekit.local', password: 'user12345678' })
    await page.goto('/app/settings/notifications', { waitUntil: 'networkidle' })

    await expect(page.getByRole('columnheader', { name: 'In-App' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible()
  })

  test('renders toggle switches for each type and channel', async ({ page }) => {
    await login(page, { email: 'user@vibekit.local', password: 'user12345678' })
    await page.goto('/app/settings/notifications', { waitUntil: 'networkidle' })

    // Should have 12 toggle switches: 6 types × 2 channels
    const switches = page.getByRole('switch')
    await expect(switches).toHaveCount(12)
  })

  test('toggle switch sends PATCH request', async ({ page }) => {
    await login(page, { email: 'user@vibekit.local', password: 'user12345678' })
    await page.goto('/app/settings/notifications', { waitUntil: 'networkidle' })

    const firstSwitch = page.getByRole('switch', { name: 'Broadcasts In-App' }).first()
    await expect(firstSwitch).toBeVisible()

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/notifications/preferences') && resp.request().method() === 'PATCH'
    )

    await firstSwitch.click()
    const response = await responsePromise
    expect(response.status()).toBeLessThan(500)
  })

  test('shows auto-save hint text', async ({ page }) => {
    await login(page, { email: 'user@vibekit.local', password: 'user12345678' })
    await page.goto('/app/settings/notifications', { waitUntil: 'networkidle' })

    await expect(page.getByText(/Changes are saved automatically/)).toBeVisible()
  })

  test('shows loading skeleton before data loads', async ({ page }) => {
    await login(page, { email: 'user@vibekit.local', password: 'user12345678' })

    // Intercept API to delay response so we can see loading state
    await page.route('**/api/notifications/preferences', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.continue()
    })

    await page.goto('/app/settings/notifications')

    // Should show loading skeletons
    const skeletons = page.locator('.animate-pulse')
    await expect(skeletons.first()).toBeVisible({ timeout: 3000 })
  })
})
