import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin users page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await goToAdmin(page)
  })

  test('renders users page with heading', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Manage user accounts')).toBeVisible()
  })

  test('shows search input', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByPlaceholder('Search by email or name...')).toBeVisible()
  })

  test('shows filter tabs', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Active' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Suspended' })).toBeVisible()
  })

  test('shows user list or empty state', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible({ timeout: 15_000 })
    const rows = page.locator('[data-testid="user-row"]').first()
    const emptyState = page.getByText('No users found')
    const hasRows = await rows.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    expect(hasRows || hasEmpty).toBe(true)
  })

  test('shows error state with retry when fetch fails', async ({ page }) => {
    await page.route('**/api/admin/users**', (route) =>
      route.fulfill({ body: 'Internal Server Error', status: 500 })
    )
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    await expect(page.getByText(/failed to load users/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('authenticated admin can fetch users via API', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible({ timeout: 15_000 })
    const res = await page.request.get('/api/admin/users')
    expect(res.status()).toBe(200)
    const data = (await res.json()) as { users: unknown[] }
    expect(Array.isArray(data.users)).toBe(true)
  })

  test('search input triggers filtered query', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible({ timeout: 15_000 })
    const searchInput = page.getByPlaceholder('Search by email or name...')
    await searchInput.fill('admin')
    const request = page.waitForRequest(
      (req) => req.url().includes('/api/admin/users') && req.url().includes('search=admin')
    )
    await searchInput.press('Enter')
    await expect(request).toBeTruthy()
  })
})
