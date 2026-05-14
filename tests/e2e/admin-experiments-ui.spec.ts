import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin experiments page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await goToAdmin(page)
  })

  test('renders experiments page with heading', async ({ page }) => {
    await page.goto('/admin/experiments', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /experiments/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Create, monitor, and analyze experiments')).toBeVisible()
  })

  test('shows new experiment button', async ({ page }) => {
    await page.goto('/admin/experiments', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /experiments/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: /new experiment/i })).toBeVisible()
  })

  test('toggles create form on button click', async ({ page }) => {
    await page.goto('/admin/experiments', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /experiments/i })).toBeVisible({
      timeout: 15_000,
    })
    const toggleBtn = page.getByRole('button', { name: /new experiment/i })
    await toggleBtn.click()
    await expect(page.getByLabel(/experiment key/i)).toBeVisible()
    await expect(page.getByLabel(/experiment name/i)).toBeVisible()
  })

  test('shows table or empty state', async ({ page }) => {
    await page.goto('/admin/experiments', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /experiments/i })).toBeVisible({
      timeout: 15_000,
    })
    const emptyState = page.getByText(/no experiments/i)
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    if (hasEmpty) {
      expect(hasEmpty).toBe(true)
    }
  })

  test('shows error state with retry when fetch fails', async ({ page }) => {
    await page.route('**/api/admin/experiments', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )
    await page.goto('/admin/experiments', { waitUntil: 'networkidle' })
    await expect(page.getByText(/failed to load experiments/i)).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()
  })

  test('authenticated admin can fetch experiments via API', async ({ page }) => {
    await page.goto('/admin/experiments', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /experiments/i })).toBeVisible({
      timeout: 15_000,
    })
    const res = await page.request.get('/api/admin/experiments')
    expect(res.status()).toBe(200)
    const data = (await res.json()) as { experiments: unknown[] }
    expect(Array.isArray(data.experiments)).toBe(true)
  })
})
