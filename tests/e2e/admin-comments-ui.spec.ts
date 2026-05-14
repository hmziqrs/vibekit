import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin comments page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await goToAdmin(page)
  })

  test('renders comments page with heading', async ({ page }) => {
    await page.goto('/admin/comments', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible({ timeout: 15_000 })
  })

  test('shows status filter stats', async ({ page }) => {
    await page.goto('/admin/comments', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Pending')).toBeVisible()
    await expect(page.getByText('Approved')).toBeVisible()
  })

  test('shows table or empty state', async ({ page }) => {
    await page.goto('/admin/comments', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible({ timeout: 15_000 })
    const table = page.getByRole('table')
    const emptyState = page.getByText(/no comments/i)
    const hasTable = await table.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    expect(hasTable || hasEmpty).toBe(true)
  })

  test('shows error state when fetch fails', async ({ page }) => {
    await page.route('**/api/admin/comments**', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )
    await page.goto('/admin/comments', { waitUntil: 'networkidle' })
    await expect(page.getByText(/failed/i)).toBeVisible({ timeout: 10_000 })
  })

  test('authenticated admin can fetch comments via API', async ({ page }) => {
    await page.goto('/admin/comments', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible({ timeout: 15_000 })
    const res = await page.request.get('/api/admin/comments')
    expect(res.status()).toBe(200)
  })
})
