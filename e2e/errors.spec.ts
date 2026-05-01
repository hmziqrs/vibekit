import { expect, test } from '@playwright/test'
import { expect, test } from 'vitest'

test.describe('error handling', () => {
  test('nonexistent page returns 404', async ({ page }) => {
    const resp = await page.goto('/this-page-does-not-exist-at-all')
    expect(resp?.status()).toBe(404)
  })

  test('unauthenticated API call returns error', async ({ page }) => {
    const resp = await page.request.get('/api/items')
    // Should either redirect or return error
    expect(resp.status()).toBeGreaterThanOrEqual(300)
  })

  test('invalid admin API returns error for non-admin', async ({ page }) => {
    const resp = await page.request.get('/api/admin/users')
    expect(resp.status()).toBeGreaterThanOrEqual(300)
  })
})
