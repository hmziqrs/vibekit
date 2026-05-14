import { expect, test } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('profile page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN)
    await page.goto('/app/profile', { waitUntil: 'networkidle' })
  })

  test('displays profile page with user info', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible()
    await expect(page.getByText(ADMIN.email).nth(1)).toBeVisible()
    await expect(page.getByText('Role').first()).toBeVisible()
    await expect(page.getByText('Member Since').first()).toBeVisible()
  })

  test('shows read-only profile details by default', async ({ page }) => {
    await expect(page.getByText('Profile Details')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()
    // No form fields visible in read-only mode
    await expect(page.getByPlaceholder('Enter your name')).not.toBeVisible()
  })

  test('enters edit mode when Edit is clicked', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByPlaceholder('Enter your name')).toBeVisible()
    await expect(page.getByPlaceholder('Public display name (optional)')).toBeVisible()
    await expect(page.getByPlaceholder('Tell us about yourself (optional)')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
  })

  test('cancels editing without saving', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByPlaceholder('Enter your name').fill('Temporary Name')
    await page.getByRole('button', { name: 'Cancel' }).click()
    // Back to read-only mode
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(page.getByPlaceholder('Enter your name')).not.toBeVisible()
  })

  test('saves profile changes and shows success', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByPlaceholder('Enter your name').fill('Admin Updated')
    await page.getByRole('button', { name: 'Save' }).click()
    // After save, returns to read-only mode (Edit button confirms save completed)
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible({ timeout: 10_000 })
    // Reload to ensure auth context has refreshed with the new name
    await page.reload({ waitUntil: 'networkidle' })
    // Name appears in both sidebar nav and profile content — use .nth(1) for profile content
    await expect(page.getByText('Admin Updated').nth(1)).toBeVisible({ timeout: 10_000 })
  })

  test('persists saved name after page reload', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByPlaceholder('Enter your name').fill('Persistent Name')
    await page.getByRole('button', { name: 'Save' }).click()
    // After save, returns to read-only mode
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible({ timeout: 10_000 })
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByText('Persistent Name').nth(1)).toBeVisible()
  })

  test('validates empty name on submit', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByPlaceholder('Enter your name').fill('')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Name is required')).toBeVisible({ timeout: 5000 })
  })

  test('form submission does not add URL query params', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByPlaceholder('Enter your name').fill('No Params')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).not.toContain('?')
    expect(url).not.toContain('name=')
    expect(url).not.toContain('bio=')
    expect(url).not.toContain('timezone=')
  })

  test('displays avatar with change overlay on hover', async ({ page }) => {
    // Avatar section should be visible
    const avatarArea = page.locator('.group.relative')
    await expect(avatarArea).toBeVisible()
    // Hover to reveal "Change" label
    await avatarArea.hover()
    await expect(avatarArea.getByText('Change')).toBeVisible()
  })

  test('shows timezone dropdown in edit mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click()
    const timezoneSelect = page.locator('select')
    await expect(timezoneSelect).toBeVisible()
    // Check that common timezones are present
    await expect(timezoneSelect.locator('option', { hasText: 'UTC' })).toBeAttached()
    await expect(timezoneSelect.locator('option', { hasText: 'America/New_York' })).toBeAttached()
    await expect(timezoneSelect.locator('option', { hasText: 'Europe/London' })).toBeAttached()
  })

  test('email section is read-only', async ({ page }) => {
    await expect(page.getByText('Email').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Your email address cannot be changed.')).toBeVisible()
    // The email section should show the email but no edit button
    // (the "Your email address cannot be changed" message serves as the indicator)
  })

  test('restores original name after failed edit is cancelled', async ({ page }) => {
    // First verify the current name
    await page.getByRole('button', { name: 'Edit' }).click()
    const nameInput = page.getByPlaceholder('Enter your name')
    const originalName = await nameInput.inputValue()
    // Change it and cancel
    await nameInput.fill('Cancelled Name')
    await page.getByRole('button', { name: 'Cancel' }).click()
    // Re-enter edit to verify reset
    await page.getByRole('button', { name: 'Edit' }).click()
    const restoredName = await nameInput.inputValue()
    expect(restoredName).toBe(originalName)
  })
})
