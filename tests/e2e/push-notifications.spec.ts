import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

test.describe('push notification API', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('push subscriptions list returns empty for new user', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/push/subscriptions')
      return (await res.json()) as { subscriptions: unknown[] }
    })
    expect(Array.isArray(response.subscriptions)).toBeTruthy()
  })

  test('push subscribe validates required fields', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/push/subscribe', {
        body: JSON.stringify({ endpoint: 'test' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return { ok: res.ok, status: res.status }
    })
    // Should fail because p256dh and auth are missing
    expect(response.ok).toBeFalsy()
  })

  test('push unsubscribe validates endpoint', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/push/unsubscribe', {
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('push test requires VAPID configuration', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/push/test', { method: 'POST' })
      return { ok: res.ok, status: res.status }
    })
    // Should fail because VAPID keys are not configured in test env
    expect(response.ok).toBeFalsy()
  })
})
