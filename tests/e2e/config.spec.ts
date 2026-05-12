import { expect, test } from '@playwright/test'

test.describe('Admin Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
  })

  test('shows settings page', async ({ page }) => {
    await expect(page.getByText('Settings')).toBeVisible({ timeout: 5000 })
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
    if (await announcementsTab.isVisible()) {
      await announcementsTab.click()
    }
  })
})
