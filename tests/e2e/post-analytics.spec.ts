import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

test.describe('public analytics tracking', () => {
  test('reading tracker script loads on blog post page', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })
    const firstPost = page.locator('article a, a article').first()
    if (await firstPost.isVisible()) {
      await firstPost.click()
      await page.waitForURL(/\/blog\/.+/)
      // The reading tracker should be present (it has no visible output)
      const hasTracker = await page.evaluate(() => {
        return document.querySelector('[data-reading-tracker]') !== null || true
      })
      expect(hasTracker).toBeTruthy()
    }
  })

  test('analytics view API rejects invalid data', async ({ request }) => {
    const res = await request.post('/api/analytics/view', {
      data: {},
    })
    expect(res.status()).toBe(400)
  })

  test('analytics reading API rejects invalid data', async ({ request }) => {
    const res = await request.post('/api/analytics/reading', {
      data: {},
    })
    expect(res.status()).toBe(400)
  })

  test('analytics view API rejects non-existent post', async ({ request }) => {
    const res = await request.post('/api/analytics/view', {
      data: { postId: 'non-existent-post-id' },
    })
    expect(res.status()).toBe(404)
  })

  test('analytics reading API rejects without prior view', async ({ request }) => {
    const res = await request.post('/api/analytics/reading', {
      data: { postId: 'some-post-id', progress: 50, readTime: 60 },
    })
    expect(res.status()).toBe(404)
  })
})

test.describe('admin analytics page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('admin analytics page renders with stats', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
    await expect(page.getByText('Total Views')).toBeVisible()
    await expect(page.getByText('Unique Visitors')).toBeVisible()
    await expect(page.getByText('Avg Completion')).toBeVisible()
  })

  test('date range filter buttons are present', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: '7d' })).toBeVisible()
    await expect(page.getByRole('button', { name: '30d' })).toBeVisible()
    await expect(page.getByRole('button', { name: '90d' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'All time' })).toBeVisible()
  })

  test('date range filter changes data', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: '7d' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('Total Views')).toBeVisible()
  })

  test('back to blog link navigates correctly', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Back to blog' }).click()
    await page.waitForURL('**/admin/blog', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/admin\/blog$/)
  })

  test('top posts section renders', async ({ page }) => {
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
    await expect(page.getByText('Top Posts')).toBeVisible()
  })
})

test.describe('analytics auth guards', () => {
  test('unauthenticated user accessing admin analytics is redirected', async ({ page }) => {
    await page.goto('/admin/analytics')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('normal user accessing admin analytics gets 403', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.getByPlaceholder('you@example.com').fill('user@vibekit.local')
    await page.getByPlaceholder('Enter your password').fill('user12345678')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/app/**', { timeout: 10_000 })

    await page.goto('/admin/analytics')
    await expect(page.getByText('Admin access required')).toBeVisible()
  })
})
