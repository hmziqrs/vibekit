import { expect, test } from '@playwright/test'

test.describe('protected routes', () => {
  test('/app redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/app')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('/admin redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
