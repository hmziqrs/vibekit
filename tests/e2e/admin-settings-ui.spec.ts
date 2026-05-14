import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin settings page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await goToAdmin(page)
  })

  test('renders settings page with heading', async ({ page }) => {
    await page.goto('/admin/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'System Settings' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Manage feature flags, maintenance mode')).toBeVisible()
  })

  test('shows section tabs', async ({ page }) => {
    await page.goto('/admin/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'System Settings' })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('shows config or loading state', async ({ page }) => {
    await page.goto('/admin/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'System Settings' })).toBeVisible({
      timeout: 15_000,
    })
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows error state when fetch fails', async ({ page }) => {
    await page.route('**/api/admin/config**', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )
    await page.goto('/admin/settings', { waitUntil: 'networkidle' })
    await expect(page.getByText(/failed/i)).toBeVisible({ timeout: 10_000 })
  })

  test('authenticated admin can fetch config via API', async ({ page }) => {
    await page.goto('/admin/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'System Settings' })).toBeVisible({
      timeout: 15_000,
    })
    const res = await page.request.get('/api/admin/config')
    expect(res.status()).toBe(200)
    const data = (await res.json()) as { configs: unknown[] }
    expect(Array.isArray(data.configs)).toBe(true)
  })
})
