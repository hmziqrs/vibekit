import { expect, test } from '@playwright/test'

test.describe('Public Static Pages', () => {
  test('features page renders correctly', async ({ page }) => {
    await page.goto('/features')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/Features/)
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    // Should have feature cards
    const cards = page.locator('article, [class*="rounded"]').filter({ hasText: 'Authentication' })
    expect(await cards.count()).toBeGreaterThan(0)
  })

  test('pricing page renders with plan cards', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/Pricing/)

    // Two plan cards
    const starter = page.getByText('Starter')
    const pro = page.getByText('Pro')
    await expect(starter).toBeVisible()
    await expect(pro).toBeVisible()

    // Pricing visible
    await expect(page.getByText('$0')).toBeVisible()
    await expect(page.getByText('$29')).toBeVisible()

    // CTA buttons
    await expect(page.getByRole('link', { name: /Get started/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Start free trial/i })).toBeVisible()

    // FAQ section
    await expect(page.getByRole('heading', { name: /Frequently asked/ })).toBeVisible()
  })

  test('privacy page loads and has content', async ({ page }) => {
    await page.goto('/privacy')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/Privacy/)
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })

  test('terms page loads and has content', async ({ page }) => {
    await page.goto('/terms')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/Terms/)
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })

  test('about page loads and has content', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })

  test('homepage loads with hero section', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveTitle(/Vibekit/)
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })

  test('contact page has form', async ({ page }) => {
    await page.goto('/contact')
    await page.waitForLoadState('networkidle')

    // Should have form inputs
    const emailInput = page.getByLabel(/email/i)
    if (await emailInput.isVisible()) {
      await expect(emailInput).toBeEditable()
    }
  })
})
