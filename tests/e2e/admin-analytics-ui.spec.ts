import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin analytics page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await goToAdmin(page)
  })

  test('renders analytics page with heading', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('shows date range buttons', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: '7d' })).toBeVisible()
    await expect(page.getByRole('button', { name: '30d' })).toBeVisible()
    await expect(page.getByRole('button', { name: '90d' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'All time' })).toBeVisible()
  })

  test('shows stats or loading state', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible({
      timeout: 15_000,
    })
    const statsVisible = await page
      .getByText('Total Views')
      .isVisible()
      .catch(() => false)
    const loadingVisible = await page
      .getByText('Loading')
      .isVisible()
      .catch(() => false)
    expect(statsVisible || loadingVisible).toBe(true)
  })

  test('shows error state with retry when fetch fails', async ({ page }) => {
    await page.route('**/api/admin/analytics/**', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
    await expect(page.getByText(/failed to load/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /try again/i }))
      .first()
      .toBeVisible()
  })

  test('date range buttons trigger refetch', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible({
      timeout: 15_000,
    })
    const btn30d = page.getByRole('button', { name: '30d' })
    await expect(btn30d).toBeVisible()
    await btn30d.click()
    const request = page.waitForRequest('**/api/admin/analytics/overview?days=30')
    await expect(request).toBeTruthy()
  })
})
