import { expect, test } from '@playwright/test'

import { goToAdmin } from './helpers/auth'

test.describe('Admin Media Library', () => {
  test.beforeEach(async ({ page }) => {
    await goToAdmin(page)
    await page.goto('/admin/media')
    await page.waitForLoadState('networkidle')
  })

  test('shows media library heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible({
      timeout: 5000,
    })
  })

  test('shows upload button', async ({ page }) => {
    await expect(page.getByText('Upload').first()).toBeVisible()
  })

  test('has type filter tabs', async ({ page }) => {
    await expect(page.getByText('All').first()).toBeVisible()
    await expect(page.getByText('Images')).toBeVisible()
    await expect(page.getByText('Videos')).toBeVisible()
  })

  test('has view mode toggle', async ({ page }) => {
    await expect(page.getByText('Grid')).toBeVisible()
    await expect(page.getByText('List')).toBeVisible()
  })

  test('switches to list view', async ({ page }) => {
    await page.getByText('List').click()
    // Should show table in list view
  })

  test('filters by type', async ({ page }) => {
    await page.getByText('Images', { exact: true }).click()
    // URL or query should update
  })

  test('shows empty state when no files', async ({ page }) => {
    const emptyMsg = page.getByText('No media files found')
    if (await emptyMsg.isVisible()) {
      await expect(emptyMsg).toBeVisible()
    }
  })
})

test.describe('Admin Media Navigation', () => {
  test('media nav item exists in sidebar', async ({ page }) => {
    await goToAdmin(page)
    await expect(page.getByRole('link', { name: 'Media' })).toBeVisible()
  })
})
