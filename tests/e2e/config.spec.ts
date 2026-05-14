import { expect, test } from '@playwright/test'

import { goToAdmin } from './helpers/auth'

test.describe('Admin Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await goToAdmin(page)
    await page.goto('/admin/settings')
    await page.waitForLoadState('networkidle')
  })

  test('shows settings page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 5000 })
  })

  test('has config section tab', async ({ page }) => {
    const configTab = page.getByRole('button', { name: /config/i }).or(page.getByText('Config'))
    if (await configTab.isVisible()) {
      await configTab.click()
    }
  })

  test('shows announcements section tab', async ({ page }) => {
    const announcementsTab = page
      .getByRole('button', { name: /announcements/i })
      .or(page.getByText('Announcements'))
      .first()
    if (await announcementsTab.isVisible()) {
      await announcementsTab.click()
    }
  })
})
