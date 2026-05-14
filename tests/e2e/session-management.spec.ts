import { expect, test } from '@playwright/test'

import { ADMIN, login } from './helpers/auth'

test.describe('session management in settings', () => {
  test('shows active sessions section', async ({ page }) => {
    await login(page, ADMIN)
    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL('/app/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Active Sessions')).toBeVisible()
  })

  test('shows current device session', async ({ page }) => {
    await login(page, ADMIN)
    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL('/app/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('This device')).toBeVisible()
  })

  test('displays browser and OS info for sessions', async ({ page }) => {
    await login(page, ADMIN)
    await page.getByRole('link', { name: 'Settings' }).first().click()
    await expect(page).toHaveURL('/app/settings')
    await page.waitForLoadState('networkidle')

    // Should show some browser info (Chromium in Playwright)
    await expect(page.getByText(/on (macOS|Windows|Linux)/).first()).toBeVisible()
  })
})
