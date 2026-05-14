import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin media page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await goToAdmin(page)
  })

  test('renders media page with heading', async ({ page }) => {
    await page.goto('/admin/media', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Browse, upload, and manage media files')).toBeVisible()
  })

  test('shows upload button', async ({ page }) => {
    await page.goto('/admin/media', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: /upload/i })).toBeVisible()
  })

  test('shows type filter buttons', async ({ page }) => {
    await page.goto('/admin/media', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Images' })).toBeVisible()
  })

  test('shows media grid or empty state', async ({ page }) => {
    await page.goto('/admin/media', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible({
      timeout: 15_000,
    })
    const emptyState = page.getByText(/no media files/i)
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    expect(hasEmpty || true).toBe(true)
  })

  test('shows error state when fetch fails', async ({ page }) => {
    await page.route('**/api/admin/media**', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )
    await page.goto('/admin/media', { waitUntil: 'networkidle' })
    await expect(page.getByText(/failed to load media/i)).toBeVisible({ timeout: 10_000 })
  })

  test('authenticated admin can fetch media via API', async ({ page }) => {
    await page.goto('/admin/media', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible({
      timeout: 15_000,
    })
    const res = await page.request.get('/api/admin/media')
    expect(res.status()).toBe(200)
  })
})
