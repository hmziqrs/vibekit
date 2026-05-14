import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin blog page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await goToAdmin(page)
  })

  test('renders blog page with heading', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Blog Posts' })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('shows new post link', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Blog Posts' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('link', { name: /new post/i })).toBeVisible()
  })

  test('shows status filter tabs', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Blog Posts' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Published' })).toBeVisible()
  })

  test('shows search input', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Blog Posts' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByPlaceholder(/search/i)).toBeVisible()
  })

  test('shows sort select', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Blog Posts' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('combobox')).toBeVisible()
  })

  test('shows posts table or empty state', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Blog Posts' })).toBeVisible({
      timeout: 15_000,
    })
    const table = page.getByRole('table')
    const emptyState = page.getByText(/no posts/i)
    const hasTable = await table.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    expect(hasTable || hasEmpty).toBe(true)
  })

  test('shows error state when fetch fails', async ({ page }) => {
    await page.route('**/api/blog**', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await expect(page.getByText(/failed to load posts/i)).toBeVisible({ timeout: 10_000 })
  })

  test('authenticated admin can fetch posts via API', async ({ page }) => {
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Blog Posts' })).toBeVisible({
      timeout: 15_000,
    })
    const res = await page.request.get('/api/blog')
    expect(res.status()).toBe(200)
  })
})
