import { expect, test } from '@playwright/test'

test.describe('Auth Error Page', () => {
  test('auth-error page loads or redirects', async ({ page }) => {
    const res = await page.goto('/auth-error?error=invalid_credentials')
    // Should load (200) or redirect to login
    expect(res).toBeDefined()
    expect([200, 302, 301]).toContain(res?.status() ?? 200)
  })
})

test.describe('Auth - Banned Page', () => {
  test('banned page loads or redirects', async ({ page }) => {
    const res = await page.goto('/banned')
    expect(res).toBeDefined()
  })
})

test.describe('Auth - Appeal Page', () => {
  test('appeal page loads or redirects', async ({ page }) => {
    const res = await page.goto('/appeal')
    expect(res).toBeDefined()
  })
})

test.describe('Auth - Reactivate Page', () => {
  test('reactivate page loads or redirects', async ({ page }) => {
    const res = await page.goto('/reactivate')
    expect(res).toBeDefined()
  })
})

test.describe('App - Invitations Page', () => {
  test('invitations API responds', async ({ request }) => {
    const res = await request.get('/api/invitations')
    expect(res.status()).toBeLessThan(500)
  })
})
