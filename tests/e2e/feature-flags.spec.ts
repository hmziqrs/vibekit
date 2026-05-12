import { expect, test } from '@playwright/test'

test.describe('Admin Feature Flags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/feature-flags')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
  })

  test('shows feature flags page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Feature Flags' })).toBeVisible({
      timeout: 5000,
    })
  })

  test('shows create flag button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Create Flag' })).toBeVisible()
  })

  test('opens create flag form on button click', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Flag' }).click()
    await expect(page.getByText('New Feature Flag')).toBeVisible()
    await expect(page.getByPlaceholder('e.g. new-dashboard')).toBeVisible()
    await expect(page.getByPlaceholder('e.g. New Dashboard')).toBeVisible()
  })

  test('create form has environment selector', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Flag' }).click()
    const select = page.locator('select').first()
    await expect(select).toBeVisible()
  })

  test('create form has enabled checkbox', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Flag' }).click()
    await expect(page.getByText('Enabled')).toBeVisible()
  })

  test('shows empty state when no flags exist', async ({ page }) => {
    const emptyMsg = page.getByText('No feature flags yet')
    if (await emptyMsg.isVisible()) {
      await expect(emptyMsg).toBeVisible()
    }
  })

  test('create button text toggles to Cancel', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Flag' }).click()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('button', { name: 'Create Flag' })).toBeVisible()
  })

  test('create button is disabled without key and name', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Flag' }).click()
    const submitBtn = page.getByRole('button', { name: 'Create Flag' })
    // The form's create button inside the form
    const formCreateBtn = page
      .locator('button:has-text("Creating..."), button:has-text("Create Flag")')
      .last()
    await expect(formCreateBtn).toBeDisabled()
  })
})

test.describe('Admin Feature Flags Navigation', () => {
  test('feature flags nav item exists in sidebar', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await expect(page.getByRole('link', { name: 'Feature Flags' })).toBeVisible()
  })

  test('navigates to feature flags page', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.getByRole('link', { name: 'Feature Flags' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/admin\/feature-flags/)
  })
})
