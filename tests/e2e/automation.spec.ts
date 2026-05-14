import { expect, test } from '@playwright/test'

test.describe('Automation', () => {
  test('automation docs page loads', async ({ page }) => {
    await page.goto('/docs/automation')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('No-Code Automation')).toBeVisible()
  })

  test('shows platform tabs', async ({ page }) => {
    await page.goto('/docs/automation')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('ZAPIER').first()).toBeVisible()
    await expect(page.getByText('N8N').first()).toBeVisible()
  })

  test('zapier content visible by default', async ({ page }) => {
    await page.goto('/docs/automation')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Zapier Setup')).toBeVisible()
  })

  test('n8n tab switches content', async ({ page }) => {
    await page.goto('/docs/automation')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await page.getByText('n8n', { exact: true }).first().click()
    await expect(page.getByText('n8n Setup')).toBeVisible({ timeout: 5000 })
  })

  test('make tab switches content', async ({ page }) => {
    await page.goto('/docs/automation')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    // The make tab renders as "Make (Integromat)" in the DOM (p === 'make' condition in template)
    await page.getByText('Make (Integromat)', { exact: true }).first().click()
    await expect(page.getByText('Make (Integromat) Setup')).toBeVisible({ timeout: 5000 })
  })

  test('shows trigger examples', async ({ page }) => {
    await page.goto('/docs/automation')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Available Triggers').first()).toBeVisible()
  })

  test('manifest endpoint accessible', async ({ page }) => {
    const response = await page.goto('/api/automation/manifest')
    expect(response?.ok()).toBeTruthy()
  })

  test('manifest contains triggers and actions', async ({ page }) => {
    await page.goto('/docs/automation', { waitUntil: 'networkidle' })
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/automation/manifest')
      return (await res.json()) as {
        actions: unknown[]
        name: string
        triggers: unknown[]
        version: string
      }
    })
    expect(response.name).toBe('Vibekit')
    expect(response.triggers.length).toBeGreaterThan(10)
    expect(response.actions.length).toBeGreaterThan(3)
  })

  test('Get API Key link exists', async ({ page }) => {
    await page.goto('/docs/automation')
    await page.waitForLoadState('networkidle')
    const link = page.getByRole('link', { name: 'Get API Key' })
    await expect(link).toBeVisible()
  })

  test('Manage Webhooks link exists', async ({ page }) => {
    await page.goto('/docs/automation')
    await page.waitForLoadState('networkidle')
    const link = page.getByRole('link', { name: 'Manage Webhooks' })
    await expect(link).toBeVisible()
  })
})
