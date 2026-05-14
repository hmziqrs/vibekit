import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin webhooks page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await goToAdmin(page)
  })

  test('renders webhook deliveries page with heading', async ({ page }) => {
    await page.goto('/admin/webhooks', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Webhook Deliveries' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByText('Monitor all webhook delivery attempts across the platform')
    ).toBeVisible()
  })

  test('shows status filter dropdown', async ({ page }) => {
    await page.goto('/admin/webhooks', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Webhook Deliveries' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByLabel('Filter by delivery status')).toBeVisible()
  })

  test('shows event type filter input', async ({ page }) => {
    await page.goto('/admin/webhooks', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Webhook Deliveries' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByPlaceholder('Filter by event type...')).toBeVisible()
  })

  test('shows refresh button', async ({ page }) => {
    await page.goto('/admin/webhooks', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Webhook Deliveries' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible()
  })

  test('shows table or empty state', async ({ page }) => {
    await page.goto('/admin/webhooks', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Webhook Deliveries' })).toBeVisible({
      timeout: 15_000,
    })
    const table = page.getByRole('table')
    const emptyState = page.getByText('No webhook deliveries found')
    const hasTable = await table.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    expect(hasTable || hasEmpty).toBe(true)
  })

  test('shows error state with retry when fetch fails', async ({ page }) => {
    await page.route('**/api/admin/webhooks/deliveries**', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )

    await page.goto('/admin/webhooks', { waitUntil: 'networkidle' })
    await expect(page.getByText('Failed to load webhook deliveries')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  })

  test('authenticated admin can fetch webhook deliveries via API', async ({ page }) => {
    await page.goto('/admin/webhooks', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Webhook Deliveries' })).toBeVisible({
      timeout: 15_000,
    })
    const res = await page.request.get('/api/admin/webhooks/deliveries')
    expect(res.status()).toBe(200)
    const data = (await res.json()) as { deliveries: unknown[] }
    expect(Array.isArray(data.deliveries)).toBe(true)
  })
})
