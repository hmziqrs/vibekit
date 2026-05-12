import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

test.describe('Webhooks', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('webhooks page loads', async ({ page }) => {
    await page.goto('/app/settings/webhooks')
    await expect(page.getByText('Webhooks')).toBeVisible()
    await expect(page.getByText('Add Endpoint')).toBeVisible()
  })

  test('webhooks nav link exists', async ({ page }) => {
    await page.goto('/app/dashboard')
    const link = page.getByRole('link', { name: 'Webhooks' })
    await expect(link).toBeVisible()
  })

  test('can list webhooks via API', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/webhooks')
      return (await res.json()) as { endpoints: unknown[] }
    })
    expect(Array.isArray(response.endpoints)).toBeTruthy()
  })

  test('can create a webhook endpoint', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/webhooks', {
        body: JSON.stringify({
          events: ['blog.create', 'blog.update'],
          url: 'https://example.com/webhooks',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return (await res.json()) as { id: string; secret: string }
    })
    expect(response.id).toBeTruthy()
    expect(response.secret.startsWith('whsec_')).toBeTruthy()
  })

  test('create webhook validates required fields', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/webhooks', {
        body: JSON.stringify({ url: '' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('create webhook rejects empty events', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/webhooks', {
        body: JSON.stringify({
          events: [],
          url: 'https://example.com/webhooks',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('create webhook rejects invalid event type', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/webhooks', {
        body: JSON.stringify({
          events: ['invalid.event'],
          url: 'https://example.com/webhooks',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('create webhook rejects invalid url', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/webhooks', {
        body: JSON.stringify({
          events: ['blog.create'],
          url: 'not-a-url',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('can update webhook endpoint', async ({ page }) => {
    // Create first
    const created = await page.evaluate(async () => {
      const res = await fetch('/api/webhooks', {
        body: JSON.stringify({
          events: ['blog.create'],
          url: 'https://example.com/webhooks',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return (await res.json()) as { id: string }
    })

    // Update
    const response = await page.evaluate(async (id) => {
      const res = await fetch(`/api/webhooks/${id}`, {
        body: JSON.stringify({ active: false }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      return { ok: res.ok }
    }, created.id)
    expect(response.ok).toBeTruthy()
  })

  test('can delete webhook endpoint', async ({ page }) => {
    // Create first
    const created = await page.evaluate(async () => {
      const res = await fetch('/api/webhooks', {
        body: JSON.stringify({
          events: ['blog.create'],
          url: 'https://example.com/delete-test',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      return (await res.json()) as { id: string }
    })

    const response = await page.evaluate(async (id) => {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
      return { ok: res.ok }
    }, created.id)
    expect(response.ok).toBeTruthy()
  })

  test('test non-existent endpoint returns 404', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/webhooks/nonexistent/test', { method: 'POST' })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('deliveries for non-existent endpoint returns 404', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/webhooks/nonexistent/deliveries')
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('admin webhook deliveries endpoint returns data', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/admin/webhooks/deliveries')
      return (await res.json()) as { deliveries: unknown[] }
    })
    expect(Array.isArray(response.deliveries)).toBeTruthy()
  })

  test('admin retry non-existent delivery returns 404', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/admin/webhooks/nonexistent/retry', { method: 'POST' })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })
})
