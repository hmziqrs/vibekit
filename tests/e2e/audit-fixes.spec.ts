import { expect, test } from '@playwright/test'

test.describe('Audit Fixes E2E', () => {
  test.use({ storageState: 'tests/.auth/admin.json' })

  test('profile bio should persist after save', async ({ page }) => {
    await page.goto('/app/profile')

    // Click edit button
    await page.getByRole('button', { name: 'Edit' }).click()

    // Fill bio field
    const bioText = `E2E test bio ${Date.now()}`
    await page.getByRole('textbox', { name: 'Bio' }).fill(bioText)

    // Save
    await page.getByRole('button', { name: 'Save' }).click()

    // Wait for success and verify bio is displayed
    await expect(page.getByText(bioText)).toBeVisible({ timeout: 5000 })

    // Reload to verify persistence
    await page.reload()
    await expect(page.getByText(bioText)).toBeVisible()
  })

  test('admin audit log page should load with pagination', async ({ page }) => {
    await page.goto('/admin/audit')

    // Should show audit log heading
    await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible()

    // Should show pagination
    await expect(page.getByText(/Page \d+ of \d+/)).toBeVisible()

    // Should show action filter buttons
    await expect(page.getByRole('button', { name: 'All Actions' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
  })

  test('webhooks page should load without errors', async ({ page }) => {
    await page.goto('/app/settings/webhooks')

    // Should show webhooks heading
    await expect(page.getByRole('heading', { name: 'Webhooks' })).toBeVisible()

    // Should show add endpoint button
    await expect(page.getByRole('button', { name: 'Add Endpoint' })).toBeVisible()

    // No console errors
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('organization list should load', async ({ page }) => {
    await page.goto('/app/organizations')

    await expect(page.getByRole('heading', { name: 'Organizations' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'New Organization' })).toBeVisible()

    // Should have at least one org listed
    const orgLinks = page.locator('a[href*="/app/organizations/"]')
    await expect(orgLinks.first()).toBeVisible()
  })
})
