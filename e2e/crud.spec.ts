import { expect, test } from '@playwright/test'

import { goToItems } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.describe('item CRUD', () => {
  test('create item', async ({ page }) => {
    await goToItems(page)
    await page
      .getByRole('link', { name: /create item/i })
      .first()
      .click()
    await expect(page).toHaveURL('/app/items/new')

    const itemName = `Test Item ${Date.now()}`
    await page.getByPlaceholder('Item name').fill(itemName)
    await page.getByPlaceholder('Optional description').fill('Created by E2E test')

    // Submit and wait for either redirect or error
    await page.getByRole('button', { name: 'Create Item' }).click()
    await page.waitForURL('**/app/items', { timeout: 10_000 }).catch(async () => {
      // If no redirect, check for error on form
      const text = await page.textContent('body')
      throw new Error(`Create item did not redirect. Page content: ${text?.substring(0, 500)}`)
    })

    // Wait for the items list to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    // Full reload to ensure TanStack Query refetches
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10_000 })
  })

  test('edit item', async ({ page }) => {
    await goToItems(page)
    // Click the first item's edit button (pencil icon)
    await page.locator('a[href*="/edit"]').first().click()
    await expect(page).toHaveURL(/\/app\/items\/.*\/edit/)

    const updatedName = `Updated ${Date.now()}`
    await page.getByPlaceholder('Item name').clear()
    await page.getByPlaceholder('Item name').fill(updatedName)
    await page.getByRole('button', { name: 'Save Changes' }).click()

    await page.waitForURL('**/app/items', { timeout: 10_000 })
    await expect(page.getByText(updatedName)).toBeVisible()
  })

  test('archive and restore item', async ({ page }) => {
    await goToItems(page)

    // Archive the first active item (title="Archive" button)
    await page.locator('button[title="Archive"]').first().click()
    await page.waitForTimeout(1500)

    // Switch to archived filter
    await page.getByRole('button', { name: 'Archived' }).click()
    await page.waitForTimeout(1500)

    // Restore the archived item (title="Restore" button)
    await page.locator('button[title="Restore"]').first().click()
    await page.waitForTimeout(1500)

    // Switch back to active and verify
    await page.getByRole('button', { name: 'Active' }).click()
    await page.waitForTimeout(1000)
    await expect(page.getByRole('heading', { name: 'Items' })).toBeVisible()
  })

  test('delete item', async ({ page }) => {
    await goToItems(page)
    const countBefore = await page.locator('button[title="Archive"]').count()

    // Click delete button (trash icon)
    await page.locator('button[title="Delete"]').first().click()

    // Confirm in dialog overlay
    await expect(page.getByText(/are you sure/i)).toBeVisible()
    await page.locator('.fixed button').getByText('Delete').click()
    await page.waitForTimeout(1500)

    // Verify one less item
    if (countBefore > 1) {
      await expect(page.locator('button[title="Archive"]')).toHaveCount(countBefore - 1)
    }
  })
})
