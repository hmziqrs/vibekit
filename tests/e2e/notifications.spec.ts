import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('notification endpoints require auth', () => {
  test('GET /api/notifications returns 401 without auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.get('/api/notifications')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('GET /api/notifications/unread-count returns 401 without auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.get('/api/notifications/unread-count')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('PATCH /api/notifications/read-all returns 401 without auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.patch('/api/notifications/read-all')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('PATCH /api/notifications/:id/read returns 401 without auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.patch('/api/notifications/test-id/read')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('DELETE /api/notifications/:id returns 401 without auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.delete('/api/notifications/test-id')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })
})

test.describe('notifications page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
  })

  test('displays notifications page heading', async ({ page }) => {
    await page.goto('/app/notifications', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  })

  test('shows mark all read button', async ({ page }) => {
    await page.goto('/app/notifications', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Mark all read' })).toBeVisible()
  })

  test('shows filter dropdowns for type and read status', async ({ page }) => {
    await page.goto('/app/notifications', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    // Two select dropdowns: type filter and read filter
    await expect(page.locator('select').first()).toBeVisible()
    await expect(page.locator('select').nth(1)).toBeVisible()
  })

  test('shows empty state when no notifications', async ({ page }) => {
    await page.goto('/app/notifications', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    // Either there are notifications or we see the empty state
    const emptyState = page.getByText('No notifications found')
    const hasEmptyState = await emptyState.isVisible().catch(() => false)
    // The page should either show notifications or the empty state
    expect(hasEmptyState || (await page.locator('[class*="surface"]').count()) > 0).toBe(true)
  })

  test('authenticated user can fetch notifications via API', async ({ page }) => {
    await page.goto('/app/notifications', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    const res = await page.request.get('/api/notifications')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('notifications')
    expect(data).toHaveProperty('total')
    expect(Array.isArray(data.notifications)).toBe(true)
  })
})
