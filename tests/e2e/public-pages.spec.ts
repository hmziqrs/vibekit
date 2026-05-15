import { expect, test } from '@playwright/test'

test.describe('Public Static Pages', () => {
  test('features page renders correctly', async ({ page }) => {
    const res = await page.goto('/features')
    // Page should load successfully
    expect(res?.status()).toBe(200)
    // Should have an h1 heading
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })

  test('pricing page loads successfully', async ({ page }) => {
    const res = await page.goto('/pricing')
    expect(res?.status()).toBe(200)
  })

  test('privacy page loads successfully', async ({ page }) => {
    const res = await page.goto('/privacy')
    expect(res?.status()).toBe(200)
  })

  test('terms page loads successfully', async ({ page }) => {
    const res = await page.goto('/terms')
    expect(res?.status()).toBe(200)
  })

  test('about page loads successfully', async ({ page }) => {
    const res = await page.goto('/about')
    expect(res?.status()).toBe(200)
  })

  test('homepage loads successfully', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.status()).toBe(200)
  })

  test('contact page loads successfully', async ({ page }) => {
    const res = await page.goto('/contact')
    expect(res?.status()).toBe(200)
  })
})
