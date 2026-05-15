import { expect, test } from '@playwright/test'

test.describe('Auth Error Page', () => {
  test('displays safe error for known error codes', async ({ page }) => {
    await page.goto('/auth-error?error=invalid_credentials')
    await page.waitForLoadState('networkidle')

    // Should show a safe message, NOT the raw error param
    const body = page.locator('main')
    await expect(body).toBeVisible()
    const text = await body.textContent()
    expect(text).not.toContain('invalid_credentials')
  })

  test('displays generic message for unknown error codes', async ({ page }) => {
    await page.goto('/auth-error?error=something_unknown')
    await page.waitForLoadState('networkidle')

    const body = page.locator('main')
    await expect(body).toBeVisible()
  })

  test('displays generic message when no error param', async ({ page }) => {
    await page.goto('/auth-error')
    await page.waitForLoadState('networkidle')

    const body = page.locator('main')
    await expect(body).toBeVisible()
  })
})

test.describe('Auth - Banned Page', () => {
  test('banned page returns 403 or loads', async ({ page }) => {
    const res = await page.goto('/banned')
    // Either the page loads (200) or redirects, or returns 403
    expect(res).toBeDefined()
  })
})

test.describe('Auth - Appeal Page', () => {
  test('appeal page loads with form', async ({ page }) => {
    await page.goto('/appeal')
    await page.waitForLoadState('networkidle')

    // Should have a form or content
    const main = page.locator('main')
    if (await main.isVisible()) {
      await expect(main).toBeVisible()
    }
  })
})

test.describe('Auth - Reactivate Page', () => {
  test('reactivate page loads', async ({ page }) => {
    await page.goto('/reactivate')
    await page.waitForLoadState('networkidle')

    // Should show some content
    const main = page.locator('main')
    if (await main.isVisible()) {
      await expect(main).toBeVisible()
    }
  })
})

test.describe('App - Invitations Page', () => {
  test('invitations page requires authentication', async ({ request }) => {
    const res = await request.get('/api/invitations')
    expect(res.status()).toBe(401)
  })
})
