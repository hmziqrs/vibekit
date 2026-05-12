import { expect, test } from '@playwright/test'

test.describe('API Documentation', () => {
  test('docs page loads with title', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('API Documentation')).toBeVisible()
  })

  test('overview tab shows quick start steps', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Quick Start')).toBeVisible()
    await expect(page.getByText('Create an API Key')).toBeVisible()
    await expect(page.getByText('Make Your First Request')).toBeVisible()
    await expect(page.getByText('Explore the API')).toBeVisible()
  })

  test('overview shows curl code example', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('/api/items')).toBeVisible()
  })

  test('language selector switches code examples', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.getByText('python', { exact: true }).click()
    await expect(page.getByText('import requests')).toBeVisible()
  })

  test('authentication tab content visible after click', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.getByText('authentication', { exact: true }).click()
    await page.waitForTimeout(300)
    await expect(page.getByText('Session Cookies')).toBeVisible()
    await expect(page.getByText('Webhook Signature Verification')).toBeVisible()
  })

  test('authentication tab shows API key scopes', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.getByText('authentication', { exact: true }).click()
    await expect(page.getByText('Session Cookies')).toBeVisible()
    await expect(page.getByText('Available Scopes')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('code:text-is("items.read")').first()).toBeVisible()
    await expect(page.locator('code:text-is("webhooks.write")').first()).toBeVisible()
  })

  test('reference tab shows heading and spec link', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.getByText('reference', { exact: true }).click()
    await expect(page.getByRole('heading', { name: 'API Reference' })).toBeVisible({
      timeout: 5000,
    })
    const link = page.locator('a[href="/openapi.yaml"]')
    await expect(link).toBeVisible()
  })

  test('openapi.yaml is accessible and valid', async ({ page }) => {
    const response = await page.goto('/openapi.yaml')
    expect(response?.ok()).toBeTruthy()
    const text = await response?.text()
    expect(text).toContain('openapi: 3.1.0')
    expect(text).toContain('Vibekit API')
    expect(text).toContain('paths:')
  })

  test('sidebar shows base URL and rate limits', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Base URL')).toBeVisible()
    await expect(page.getByText('Rate Limits')).toBeVisible()
    await expect(page.getByText('60 req/min')).toBeVisible()
  })

  test('sidebar shows error format section', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Error Format')).toBeVisible()
  })

  test('Get API Key CTA link exists', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    const link = page.getByRole('link', { name: 'Get API Key' })
    await expect(link).toBeVisible()
  })

  test('Response Format section visible', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Response Format')).toBeVisible()
  })

  test('tab navigation works between all tabs', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Default is overview
    await expect(page.getByText('Quick Start')).toBeVisible()

    // Switch to authentication
    await page.getByText('authentication', { exact: true }).click()
    await page.waitForTimeout(300)
    await expect(page.getByText('Session Cookies')).toBeVisible()

    // Switch back to overview
    await page.getByText('overview', { exact: true }).click()
    await page.waitForTimeout(300)
    await expect(page.getByText('Quick Start')).toBeVisible()
  })
})
