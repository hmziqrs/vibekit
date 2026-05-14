import { expect, test } from '@playwright/test'

import { goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('system config endpoints require auth', () => {
  test('GET /api/admin/config returns error without admin auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.get('/api/admin/config')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('PATCH /api/admin/config/:key returns error without admin auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.patch('/api/admin/config/maintenance_mode', {
      data: { value: 'true' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('GET /api/admin/announcements returns error without admin auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.get('/api/admin/announcements')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('POST /api/admin/announcements returns error without admin auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.post('/api/admin/announcements', {
      data: { message: 'Test announcement' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('PATCH /api/admin/announcements/:id returns error without admin auth', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const res = await context.request.patch('/api/admin/announcements/test-id', {
      data: { isActive: false },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('DELETE /api/admin/announcements/:id returns error without admin auth', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const res = await context.request.delete('/api/admin/announcements/test-id')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('GET /api/announcements returns array without auth', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.get('/api/announcements')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    await context.close()
  })
})

test.describe('admin settings page', () => {
  test.beforeEach(async ({ page }) => {
    await goToAdmin(page)
  })

  test('displays settings page heading', async ({ page }) => {
    await page.goto('/admin/settings', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'System Settings' })).toBeVisible()
  })

  test('shows section tabs', async ({ page }) => {
    await page.goto('/admin/settings', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Feature Flags' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Maintenance' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'History' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Announcements' })).toBeVisible()
  })

  test('feature flags section shows config entries', async ({ page }) => {
    await page.goto('/admin/settings', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    // Default section is Feature Flags
    await expect(
      page.getByText('Manage feature flags, maintenance mode, and announcements.')
    ).toBeVisible()
  })

  test('maintenance section shows toggle', async ({ page }) => {
    await page.goto('/admin/settings', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Maintenance' }).click()
    await expect(page.getByRole('heading', { name: 'Maintenance Mode' })).toBeVisible()
  })

  test('announcements section shows list and create button', async ({ page }) => {
    await page.goto('/admin/settings', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Announcements' }).click()
    await expect(page.getByText('System Announcements')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New Announcement' })).toBeVisible()
  })

  test('admin can fetch config via API', async ({ page }) => {
    await page.goto('/admin/settings', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    const res = await page.request.get('/api/admin/config')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('admin can fetch announcements via API', async ({ page }) => {
    await page.goto('/admin/settings', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    const res = await page.request.get('/api/admin/announcements')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('announcements')
    expect(data).toHaveProperty('total')
  })
})
