import { expect, test } from '@playwright/test'

test.describe('Newsletter Subscribe — Submission', () => {
  test('subscribe API accepts valid email', async ({ request }) => {
    const res = await request.post('/api/newsletter/subscribe', {
      data: { email: `e2e-test-${Date.now()}@example.com` },
      headers: { 'Content-Type': 'application/json' },
    })
    // Should succeed or already subscribed
    expect([200, 201, 409]).toContain(res.status())
  })

  test('subscribe API rejects empty email', async ({ request }) => {
    const res = await request.post('/api/newsletter/subscribe', {
      data: { email: '' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
  })

  test('subscribe API rejects invalid email', async ({ request }) => {
    const res = await request.post('/api/newsletter/subscribe', {
      data: { email: 'not-an-email' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
  })

  test('subscribe API rejects missing email field', async ({ request }) => {
    const res = await request.post('/api/newsletter/subscribe', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
  })

  test('blog page subscribe form submits with valid email', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'networkidle' })

    const emailInput = page.getByPlaceholder('your@email.com').first()
    if (!(await emailInput.isVisible())) return test.skip()

    const testEmail = `e2e-blog-${Date.now()}@example.com`
    await emailInput.fill(testEmail)

    const subscribeBtn = page.getByRole('button', { name: 'Subscribe' }).first()
    await expect(subscribeBtn).toBeEnabled()
    await subscribeBtn.click()

    // Wait for response — success message or no error
    await page.waitForTimeout(1000)
  })
})

test.describe('Newsletter Unsubscribe', () => {
  test('unsubscribe API requires token', async ({ request }) => {
    const res = await request.post('/api/newsletter/unsubscribe', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
  })

  test('unsubscribe API rejects empty token', async ({ request }) => {
    const res = await request.post('/api/newsletter/unsubscribe', {
      data: { token: '' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(400)
  })

  test('unsubscribe API rejects invalid token', async ({ request }) => {
    const res = await request.post('/api/newsletter/unsubscribe', {
      data: { token: 'invalid-token' },
      headers: { 'Content-Type': 'application/json' },
    })
    // Should return 404 or 400 for invalid token
    expect([400, 404]).toContain(res.status())
  })
})
