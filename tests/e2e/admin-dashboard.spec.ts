import { expect, test, type Page } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin dashboard', () => {
  let authedPage: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    authedPage = await context.newPage()
    await login(authedPage, ADMIN)
  })

  test.afterAll(async () => {
    await authedPage.context().close()
  })

  test('navigates to admin dashboard', async () => {
    await authedPage.goto('/admin/dashboard', { waitUntil: 'networkidle' })
    await expect(authedPage.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()
  })

  test('shows stat cards', async () => {
    await expect(authedPage.getByText('Users').first()).toBeVisible()
    await expect(authedPage.getByText('Blog Posts').first()).toBeVisible()
    await expect(authedPage.getByText('Items').first()).toBeVisible()
    await expect(authedPage.getByText('Active Users').first()).toBeVisible()
  })

  test('shows recent activity section', async () => {
    await expect(authedPage.getByText('Recent Activity')).toBeVisible()
  })

  test('stats API returns valid data', async () => {
    const res = await authedPage.request.get('/api/admin/stats')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data.users).toBeDefined()
    expect(data.posts).toBeDefined()
    expect(data.items).toBeDefined()
    expect(data.audit).toBeDefined()
    expect(typeof data.users.total).toBe('number')
    expect(typeof data.posts.total).toBe('number')
    expect(typeof data.items.total).toBe('number')
    expect(Array.isArray(data.audit)).toBe(true)
  })

  test('stats API requires admin auth', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const res = await page.request.get('/api/admin/stats')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    await context.close()
  })

  test('view all audit link is present', async () => {
    await expect(authedPage.getByRole('link', { name: 'View all' })).toBeVisible()
  })
})
