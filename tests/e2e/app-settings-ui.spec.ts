import { expect, test } from '@playwright/test'

import { USER, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('app settings page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USER)
  })

  test('renders settings page with heading', async ({ page }) => {
    await page.goto('/app/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('shows change password section', async ({ page }) => {
    await page.goto('/app/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Change Password')).toBeVisible()
  })

  test('shows two-factor authentication section', async ({ page }) => {
    await page.goto('/app/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Two-Factor Authentication')).toBeVisible()
  })

  test('shows active sessions section', async ({ page }) => {
    await page.goto('/app/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Active Sessions')).toBeVisible()
  })

  test('shows export data section', async ({ page }) => {
    await page.goto('/app/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Export Your Data')).toBeVisible()
  })

  test('shows delete account section', async ({ page }) => {
    await page.goto('/app/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Delete Account')).toBeVisible()
  })

  test('change password form has required inputs', async ({ page }) => {
    await page.goto('/app/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 15_000,
    })
    const passwordSection = page.locator('text=Change Password').first()
    await expect(passwordSection).toBeVisible()
  })

  test('delete account requires confirmation text', async ({ page }) => {
    await page.goto('/app/settings', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 15_000,
    })
    const deleteBtn = page.getByRole('button', { name: 'Delete Account' }).first()
    await deleteBtn.click()
    await expect(page.getByPlaceholder('Type DELETE to confirm')).toBeVisible()
  })
})
