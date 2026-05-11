import { expect, test } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe('passkey login page', () => {
  test('shows passkey sign-in button on login page', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: 'Sign in with Passkey' })).toBeVisible()
  })

  test('shows visual separator between email and passkey login', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // The "or" divider sits between email sign-in and passkey sign-in
    await expect(page.locator('text=or').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in with Passkey' })).toBeVisible()
  })

  test('passkey button is visible alongside email form', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in with Passkey' })).toBeVisible()
  })

  test('clicking passkey button does not crash the page', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Sign in with Passkey' }).click()

    // WebAuthn API won't work in automated browsers, so we just verify no crash.
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('passkey settings management', () => {
  test('shows passkeys section in settings after login', async ({ page }) => {
    await login(page, ADMIN)
    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL('/app/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Passkeys')).toBeVisible()
  })

  test('shows add passkey input and button', async ({ page }) => {
    await login(page, ADMIN)
    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL('/app/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByPlaceholder('Passkey name (optional)')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Passkey' })).toBeVisible()
  })

  test('shows only add passkey UI when no passkeys registered', async ({ page }) => {
    await login(page, ADMIN)
    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL('/app/settings')
    await page.waitForLoadState('networkidle')

    // When no passkeys, only the add input + button is shown (no list)
    await expect(page.getByPlaceholder('Passkey name (optional)')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Passkey' })).toBeVisible()
    // No "Remove" buttons should appear since no passkeys are listed
    await expect(page.getByRole('button', { name: 'Remove' })).not.toBeVisible()
  })

  test('add passkey button click does not crash settings page', async ({ page }) => {
    await login(page, ADMIN)
    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL('/app/settings')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Add Passkey' }).click()
    await page.waitForTimeout(1000)

    // WebAuthn registration won't work in automated browsers.
    // Just verify the settings page didn't crash.
    await expect(page.getByText('Passkeys')).toBeVisible()
  })
})
