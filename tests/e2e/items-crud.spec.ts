import { expect, test } from '@playwright/test'

import { USER, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('items CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USER)
  })

  test('renders items page with heading and create link', async ({ page }) => {
    await page.goto('/app/items', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: /create item/i })).toBeVisible()
  })

  test('shows empty state when no items', async ({ page }) => {
    await page.route('**/api/items**', (route) =>
      route.fulfill({ body: JSON.stringify({ items: [] }), contentType: 'application/json' })
    )
    await page.goto('/app/items', { waitUntil: 'networkidle' })
    await expect(page.getByText(/no items/i)).toBeVisible({ timeout: 10_000 })
  })

  test('shows loading skeleton', async ({ page }) => {
    await page.route('**/api/items**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      route.fulfill({ body: JSON.stringify({ items: [] }), contentType: 'application/json' })
    })
    await page.goto('/app/items', { waitUntil: 'networkidle' })
    await expect(page.getByText('Items')).toBeVisible({ timeout: 15_000 })
    const skeletons = page.locator('.animate-pulse')
    await expect(skeletons.first()).toBeVisible({ timeout: 5_000 })
  })

  test('shows error state with retry', async ({ page }) => {
    await page.route('**/api/items**', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )
    await page.goto('/app/items', { waitUntil: 'networkidle' })
    await expect(page.getByText(/failed to load items/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()
  })

  test('renders new item form', async ({ page }) => {
    await page.goto('/app/items/new', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Create Item' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByPlaceholder('Item name')).toBeVisible()
    await expect(page.getByPlaceholder('Optional description')).toBeVisible()
    await expect(page.getByRole('button', { name: /create item/i })).toBeVisible()
  })

  test('renders edit item page with loading state', async ({ page }) => {
    await page.goto('/app/items/nonexistent-id/edit', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Edit Item' })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('shows error on edit page when item not found', async ({ page }) => {
    await page.route('**/api/items/nonexistent-id', (route) =>
      route.fulfill({ body: 'Not Found', status: 404 })
    )
    await page.goto('/app/items/nonexistent-id/edit', { waitUntil: 'networkidle' })
    await expect(page.getByText(/not found|failed/i)).toBeVisible({ timeout: 10_000 })
  })

  test('filter tabs are present', async ({ page }) => {
    await page.goto('/app/items', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Active' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Archived' })).toBeVisible()
  })

  test('search input is present', async ({ page }) => {
    await page.goto('/app/items', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByPlaceholder(/search items/i)).toBeVisible()
  })
})
