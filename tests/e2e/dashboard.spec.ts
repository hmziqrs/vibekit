import { expect, test } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/app/dashboard', { waitUntil: 'networkidle' })
  })

  test('shows welcome message with user name', async ({ page }) => {
    await expect(page.getByText('Welcome back, Test Admin')).toBeVisible()
  })

  test('shows stats section with 4 cards', async ({ page }) => {
    await expect(page.getByText('Active Items')).toBeVisible()
    await expect(page.getByText('Total Created')).toBeVisible()
    await expect(page.getByText('This Week')).toBeVisible()
    await expect(page.getByText('Quick Actions')).toBeVisible()
  })

  test('shows quick action links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'New Item' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Edit Profile' })).toBeVisible()
  })

  test('shows recent items section', async ({ page }) => {
    await expect(page.getByText('Recent Items')).toBeVisible()
  })

  test('shows activity feed section', async ({ page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible()
  })

  test('stats API returns correct shape', async ({ page }) => {
    const res = await page.request.get('/api/stats')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(typeof data.activeItems).toBe('number')
    expect(typeof data.totalItems).toBe('number')
    expect(typeof data.itemsThisWeek).toBe('number')
  })

  test('audit log API returns entries', async ({ page }) => {
    const res = await page.request.get('/api/audit-log')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.entries)).toBe(true)
  })

  test('audit log API respects limit param', async ({ page }) => {
    const res = await page.request.get('/api/audit-log?limit=5')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.entries.length).toBeLessThanOrEqual(5)
  })

  test('stats API requires authentication', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const res = await page.request.get('/api/stats')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })
})
