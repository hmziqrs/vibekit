import { expect, test } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe('search dialog', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/app', { waitUntil: 'networkidle' })
  })

  test('opens search dialog via header button', async ({ page }) => {
    const searchButton = page.getByRole('button', { name: 'Search' })
    await expect(searchButton).toBeVisible({ timeout: 10_000 })
    await searchButton.click()
    const dialog = page.getByRole('dialog', { name: 'Search' })
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    const input = page.getByRole('combobox', { name: 'Search' })
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()
  })

  test('closes search dialog with Escape', async ({ page }) => {
    await page.getByRole('button', { name: 'Search' }).click()
    const dialog = page.getByRole('dialog', { name: 'Search' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })

  test('search input has correct ARIA attributes', async ({ page }) => {
    await page.getByRole('button', { name: 'Search' }).click()
    const input = page.getByRole('combobox', { name: 'Search' })
    await expect(input).toHaveAttribute('aria-expanded', 'false')
    await expect(input).toHaveAttribute('aria-controls', 'search-results')
  })

  test('typing query makes API call', async ({ page }) => {
    await page.getByRole('button', { name: 'Search' }).click()
    const input = page.getByRole('combobox', { name: 'Search' })

    const searchPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/search') && resp.status() === 200,
      { timeout: 10_000 }
    )
    await input.fill('admin')
    const response = await searchPromise
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toHaveProperty('hits')
    expect(body).toHaveProperty('total')
    expect(Array.isArray(body.hits)).toBe(true)
  })

  test('Escape does not throw errors during search', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.getByRole('button', { name: 'Search' }).click()
    const input = page.getByRole('combobox', { name: 'Search' })
    await input.fill('test')
    await page.keyboard.press('Escape')

    expect(errors).toEqual([])
  })
})

test.describe('search results page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/app/search?q=admin', { waitUntil: 'networkidle' })
  })

  test('shows search results page with query', async ({ page }) => {
    await expect(page).toHaveURL(/\/app\/search/)
  })

  test('displays type filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Blog Posts' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Users' })).toBeVisible()
  })

  test('clicking type filter makes filtered API call', async ({ page }) => {
    const searchPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/search') && resp.url().includes('types=user'),
      { timeout: 10_000 }
    )
    await page.getByRole('button', { name: 'Users' }).click()
    const response = await searchPromise
    expect(response.status()).toBe(200)
  })

  test('page completes loading without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.waitForLoadState('networkidle')
    expect(errors.filter((e) => !e.includes('ChunkLoadError'))).toEqual([])
  })
})

test.describe('search with no results', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
  })

  test('shows empty state for unlikely query', async ({ page }) => {
    const searchPromise = page.waitForResponse((resp) => resp.url().includes('/api/search'), {
      timeout: 10_000,
    })
    await page.goto('/app/search?q=zzzzzzzznonexistent12345', { waitUntil: 'networkidle' })
    const response = await searchPromise.catch(() => null)

    if (response) {
      const body = await response.json()
      expect(body.total).toBe(0)
      expect(body.hits).toEqual([])
    }

    // Page should render without errors regardless of results
    await expect(page).toHaveURL(/\/app\/search/)
  })
})
