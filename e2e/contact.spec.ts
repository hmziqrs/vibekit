import { expect, test } from '@playwright/test'

test.describe('contact form', () => {
  test('submit valid form shows success message', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible()

    await page.getByPlaceholder('Your name').fill('Test User')
    await page.getByPlaceholder('you@example.com').fill('test@example.com')
    await page.getByPlaceholder('How can we help?').fill('Test inquiry')
    await page
      .getByPlaceholder('Tell us more...')
      .fill('This is a test message from the E2E suite.')
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.getByText('Message sent!')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/respond within 24 hours/i)).toBeVisible()
  })

  test('empty submit shows validation errors', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.getByText('Name is required')).toBeVisible()
    await expect(page.getByText('Please enter a valid email address')).toBeVisible()
    await expect(page.getByText('Subject is required')).toBeVisible()
    await expect(page.getByText('Message must be at least 10 characters')).toBeVisible()
  })
})
