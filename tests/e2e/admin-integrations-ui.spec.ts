import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin integrations page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await goToAdmin(page)
  })

  test('renders integrations page with heading', async ({ page }) => {
    await page.goto('/admin/integrations', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByText('Monitor third-party integration connections across the platform')
    ).toBeVisible()
  })

  test('shows table or empty state', async ({ page }) => {
    await page.goto('/admin/integrations', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible({
      timeout: 15_000,
    })
    const table = page.getByRole('table')
    const emptyState = page.getByText('No integrations found')
    const hasTable = await table.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    expect(hasTable || hasEmpty).toBe(true)
  })

  test('shows error state with retry when fetch fails', async ({ page }) => {
    await page.route('**/api/admin/integrations', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )

    await page.goto('/admin/integrations', { waitUntil: 'networkidle' })
    await expect(page.getByText('Failed to load integrations')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  test('authenticated admin can fetch integrations via API', async ({ page }) => {
    await page.goto('/admin/integrations', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible({
      timeout: 15_000,
    })
    const res = await page.request.get('/api/admin/integrations')
    expect(res.status()).toBe(200)
    const data = (await res.json()) as { integrations: unknown[] }
    expect(Array.isArray(data.integrations)).toBe(true)
  })
})
