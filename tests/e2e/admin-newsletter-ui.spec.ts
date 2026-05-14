import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin newsletter page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await goToAdmin(page)
  })

  test('renders newsletter page with heading', async ({ page }) => {
    await page.goto('/admin/newsletter', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Newsletter' })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('shows status filter cards', async ({ page }) => {
    await page.goto('/admin/newsletter', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Newsletter' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Pending')).toBeVisible()
    await expect(page.getByText('Confirmed')).toBeVisible()
    await expect(page.getByText('Unsubscribed')).toBeVisible()
    await expect(page.getByText('Bounced')).toBeVisible()
  })

  test('shows table or empty state', async ({ page }) => {
    await page.goto('/admin/newsletter', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Newsletter' })).toBeVisible({
      timeout: 15_000,
    })
    const table = page.getByRole('table')
    const emptyState = page.getByText(/no subscribers/i)
    const hasTable = await table.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    expect(hasTable || hasEmpty).toBe(true)
  })

  test('shows error state when fetch fails', async ({ page }) => {
    await page.route('**/api/admin/newsletter/**', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )
    await page.goto('/admin/newsletter', { waitUntil: 'networkidle' })
    await expect(page.getByText(/failed to load/i)).toBeVisible({ timeout: 10_000 })
  })

  test('authenticated admin can fetch stats via API', async ({ page }) => {
    await page.goto('/admin/newsletter', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Newsletter' })).toBeVisible({
      timeout: 15_000,
    })
    const res = await page.request.get('/api/admin/newsletter/stats')
    expect(res.status()).toBe(200)
  })
})
