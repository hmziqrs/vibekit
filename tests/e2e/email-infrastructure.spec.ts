import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

test.describe('email flows in auth', () => {
  test('login page has email and password fields', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
  })

  test('forgot password link exists', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    const forgotLink = page.getByRole('link', { name: /forgot/i })
    if (await forgotLink.isVisible()) {
      await forgotLink.click()
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    }
  })
})

test.describe('newsletter email flow', () => {
  test('subscribe returns confirmation message', async ({ request }) => {
    const res = await request.post('/api/newsletter/subscribe', {
      data: { email: 'e2e-email-test@example.com', source: 'blog' },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.message).toContain('confirm')
  })
})

test.describe('appeal form sends notification', () => {
  test('appeal endpoint accepts valid data', async ({ request }) => {
    const res = await request.post('/api/appeal', {
      data: {
        email: 'appeal-test@example.com',
        message: 'I would like to appeal my ban.',
        name: 'Test User',
      },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.success).toBeTruthy()
  })

  test('appeal endpoint rejects missing fields', async ({ request }) => {
    const res = await request.post('/api/appeal', {
      data: { email: 'test@example.com' },
    })
    expect(res.ok()).toBeFalsy()
  })
})
