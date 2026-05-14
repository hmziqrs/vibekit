import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin billing page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await goToAdmin(page)
  })

  test('renders billing page with heading and stats', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Active Subscriptions')).toBeVisible()
    await expect(page.getByText('Total Subscriptions')).toBeVisible()
    await expect(page.getByText('Plans')).toBeVisible()
  })

  test('shows create plan button', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: 'Create Plan' })).toBeVisible()
  })

  test('opens and closes create plan form', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible({
      timeout: 15_000,
    })

    await page.getByRole('button', { name: 'Create Plan' }).click()
    await expect(page.getByRole('heading', { name: 'New Plan' })).toBeVisible()
    await expect(page.getByPlaceholder('Pro')).toBeVisible()
    await expect(page.getByPlaceholder('pro')).toBeVisible()
    await expect(page.getByPlaceholder('29.00')).toBeVisible()

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'New Plan' })).not.toBeVisible()
  })

  test('shows plans list with seeded plans', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Starter')).toBeVisible()
    await expect(page.getByText('Pro')).toBeVisible()
  })

  test('shows error state when overview fetch fails', async ({ page }) => {
    await page.route('**/api/admin/billing/overview', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )

    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByText('Failed to load billing overview')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  test('shows error state when plans fetch fails', async ({ page }) => {
    await page.route('**/api/admin/billing/plans', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )

    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByText('Failed to load plans')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  test('authenticated admin can fetch billing plans via API', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible({
      timeout: 15_000,
    })
    const res = await page.request.get('/api/admin/billing/plans')
    expect(res.status()).toBe(200)
    const data = (await res.json()) as { plans: unknown[] }
    expect(Array.isArray(data.plans)).toBe(true)
  })

  test('authenticated admin can fetch billing overview via API', async ({ page }) => {
    await page.goto('/admin/billing', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible({
      timeout: 15_000,
    })
    const res = await page.request.get('/api/admin/billing/overview')
    expect(res.status()).toBe(200)
    const data = (await res.json()) as { activeSubscriptions: number; totalSubscriptions: number }
    expect(typeof data.activeSubscriptions).toBe('number')
    expect(typeof data.totalSubscriptions).toBe('number')
  })
})
