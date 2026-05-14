import { expect, test } from '@playwright/test'

import { ADMIN, goToAdmin, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('admin audit log page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await goToAdmin(page)
  })

  test('renders audit log page with heading', async ({ page }) => {
    await page.goto('/admin/audit', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Track all admin actions and system events')).toBeVisible()
  })

  test('shows action filter buttons', async ({ page }) => {
    await page.goto('/admin/audit', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'All Actions' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Update' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible()
  })

  test('shows table or empty state', async ({ page }) => {
    await page.goto('/admin/audit', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 15_000 })
    const table = page.getByRole('table')
    const emptyState = page.getByText('No audit log entries found')
    const hasTable = await table.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    expect(hasTable || hasEmpty).toBe(true)
  })

  test('action filter buttons update URL', async ({ page }) => {
    await page.goto('/admin/audit', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page).toHaveURL(/\?action=create/)
  })
})
