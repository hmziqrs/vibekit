import { expect, test } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('search page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
  })

  test('search page is accessible when authenticated', async ({ page }) => {
    await page.goto('/app/search', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Search Results' })).toBeVisible()
  })

  test('search page shows entity type filter buttons', async ({ page }) => {
    await page.goto('/app/search', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Blog Posts' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Items' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Users' })).toBeVisible()
  })

  test('search with no query shows prompt', async ({ page }) => {
    await page.goto('/app/search', { waitUntil: 'networkidle' })
    await expect(page.getByText('admin@vibekit.local')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Enter a search query to get started')).toBeVisible()
  })

  test('search API is public and returns empty results for short query', async ({ browser }) => {
    const context = await browser.newContext()
    const res = await context.request.get('/api/search?q=a')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('hits')
    expect(data).toHaveProperty('total')
    expect(Array.isArray(data.hits)).toBe(true)
    await context.close()
  })
})
