import { expect, test } from '@playwright/test'

test.describe('keyboard accessibility - modal dialogs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('consent'))
    await page.reload()
    await page.waitForSelector('[role="dialog"][aria-label="Cookie consent"]', { timeout: 10000 })
  })

  test('consent banner has focusable buttons', async ({ page }) => {
    const banner = page.getByRole('dialog', { name: 'Cookie consent' })
    await expect(banner).toBeVisible()

    const declineButton = banner.getByRole('button', { name: 'Decline' })
    const acceptButton = banner.getByRole('button', { name: 'Accept' })

    await expect(declineButton).toBeVisible()
    await expect(acceptButton).toBeVisible()
    await expect(declineButton).toBeEnabled()
    await expect(acceptButton).toBeEnabled()
  })

  test('consent banner has correct ARIA attributes', async ({ page }) => {
    const banner = page.getByRole('dialog', { name: 'Cookie consent' })
    await expect(banner).toBeVisible()

    await expect(banner).toHaveAttribute('role', 'dialog')
    await expect(banner).toHaveAttribute('aria-label', 'Cookie consent')
  })

  test('Escape key does not throw errors', async ({ page }) => {
    const banner = page.getByRole('dialog', { name: 'Cookie consent' })
    await expect(banner).toBeVisible()

    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await banner.getByRole('button', { name: 'Decline' }).focus()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    expect(errors).toEqual([])
    await expect(banner).toBeVisible()
  })
})
