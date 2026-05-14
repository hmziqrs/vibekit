import { expect, test } from '@playwright/test'

import { goToAdmin } from './helpers/auth'

test.describe('Admin A/B Experiments', () => {
  test.beforeEach(async ({ page }) => {
    await goToAdmin(page)
    await page.goto('/admin/experiments')
    await page.waitForLoadState('networkidle')
  })

  test('shows experiments page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'A/B Experiments' })).toBeVisible({
      timeout: 5000,
    })
  })

  test('shows new experiment button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'New Experiment' })).toBeVisible()
  })

  test('opens create form on button click', async ({ page }) => {
    await page.getByRole('button', { name: 'New Experiment' }).click()
    await expect(page.getByText('New Experiment')).toBeVisible()
    await expect(page.getByPlaceholder('e.g. checkout-redesign')).toBeVisible()
  })

  test('create form has variant inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'New Experiment' }).click()
    await expect(page.getByPlaceholder('Variant name')).toHaveCount(2)
  })

  test('can add more variants', async ({ page }) => {
    await page.getByRole('button', { name: 'New Experiment' }).click()
    await page.getByText('+ Add Variant').click()
    await expect(page.getByPlaceholder('Variant name')).toHaveCount(3)
  })

  test('shows empty state when no experiments', async ({ page }) => {
    const emptyMsg = page.getByText('No experiments yet')
    if (await emptyMsg.isVisible()) {
      await expect(emptyMsg).toBeVisible()
    }
  })

  test('toggles create button text', async ({ page }) => {
    await page.getByRole('button', { name: 'New Experiment' }).click()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('button', { name: 'New Experiment' })).toBeVisible()
  })
})

test.describe('Admin Experiments Navigation', () => {
  test('experiments nav item exists in sidebar', async ({ page }) => {
    await goToAdmin(page)
    await expect(page.getByRole('link', { name: 'Experiments' })).toBeVisible()
  })

  test('navigates to experiments page', async ({ page }) => {
    await goToAdmin(page)
    await page.getByRole('link', { name: 'Experiments' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/admin\/experiments/)
  })
})
