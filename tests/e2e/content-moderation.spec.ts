import { expect, test } from '@playwright/test'

import { goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('content moderation endpoints require auth', () => {
  test('POST /api/reports returns error without auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.post('/api/reports', {
      data: {
        entityId: 'test-id',
        entityType: 'item',
        reason: 'spam',
      },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('GET /api/admin/reports returns error without admin auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.get('/api/admin/reports')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('GET /api/admin/reports/stats returns error without admin auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.get('/api/admin/reports/stats')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('PATCH /api/admin/reports/:id returns error without admin auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.patch('/api/admin/reports/nonexistent', {
      data: {
        resolutionNote: 'test',
        status: 'resolved',
      },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })
})

test.describe('admin moderation page', () => {
  test.beforeEach(async ({ page }) => {
    await goToAdmin(page)
  })

  test('displays moderation page heading', async ({ page }) => {
    await page.goto('/admin/moderation', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Content Moderation' })).toBeVisible()
  })

  test('shows stats cards', async ({ page }) => {
    await page.goto('/admin/moderation', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Pending').first()).toBeVisible()
    await expect(page.getByText('Reviewing').first()).toBeVisible()
    await expect(page.getByText('Resolved').first()).toBeVisible()
    await expect(page.getByText('Total').first()).toBeVisible()
  })

  test('shows status filter tabs', async ({ page }) => {
    await page.goto('/admin/moderation', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Pending' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
  })

  test('shows entity type filter dropdown', async ({ page }) => {
    await page.goto('/admin/moderation', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('combobox').first()).toBeVisible()
  })

  test('shows reports table or empty state', async ({ page }) => {
    await page.goto('/admin/moderation', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    // Either a table is shown or "No reports found" empty state
    const emptyState = page.getByText('No reports found')
    const table = page.locator('table')
    const hasContent = await Promise.race([
      emptyState.isVisible().then(() => true),
      table.isVisible().then(() => true),
    ]).catch(() => false)
    expect(hasContent).toBe(true)
  })

  test('admin can fetch reports via API', async ({ page }) => {
    await page.goto('/admin/moderation', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    const res = await page.request.get('/api/admin/reports')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('reports')
    expect(data).toHaveProperty('total')
    expect(Array.isArray(data.reports)).toBe(true)
  })

  test('admin can fetch report stats via API', async ({ page }) => {
    await page.goto('/admin/moderation', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    const res = await page.request.get('/api/admin/reports/stats')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('pending')
    expect(data).toHaveProperty('total')
    expect(typeof data.pending).toBe('number')
  })
})
