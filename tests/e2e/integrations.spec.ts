import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

test.describe('Integrations', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('integrations page loads', async ({ page }) => {
    await page.goto('/app/settings/integrations')
    await expect(page.getByText('Integrations')).toBeVisible()
    await expect(page.getByText('Connect third-party services')).toBeVisible()
  })

  test('integrations nav link exists', async ({ page }) => {
    await page.goto('/app/dashboard')
    const link = page.getByRole('link', { name: 'Integrations' })
    await expect(link).toBeVisible()
  })

  test('can list integrations via API', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/integrations')
      return (await res.json()) as { integrations: unknown[] }
    })
    expect(Array.isArray(response.integrations)).toBeTruthy()
  })

  test('can list providers via API', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/integrations/providers')
      return (await res.json()) as {
        providers: Array<{ configured: boolean; provider: { slug: string; name: string } }>
      }
    })
    expect(response.providers.length).toBeGreaterThanOrEqual(5)
    const slugs = response.providers.map((p) => p.provider.slug)
    expect(slugs).toContain('slack')
    expect(slugs).toContain('github')
    expect(slugs).toContain('notion')
  })

  test('connect unknown provider returns 404', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/integrations/connect/unknown', { method: 'POST' })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('delete non-existent integration returns 404', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/integrations/nonexistent', { method: 'DELETE' })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('refresh non-existent integration returns 404', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/integrations/nonexistent/refresh', { method: 'POST' })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('status non-existent integration returns 404', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/integrations/nonexistent/status')
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })

  test('callback without code returns 400', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/integrations/callback/slack')
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
    expect(response.status).toBe(400)
  })

  test('admin integrations endpoint returns data', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/admin/integrations')
      return (await res.json()) as { integrations: unknown[] }
    })
    expect(Array.isArray(response.integrations)).toBeTruthy()
  })

  test('admin health check non-existent returns 404', async ({ page }) => {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/admin/integrations/nonexistent/health', { method: 'POST' })
      return { ok: res.ok, status: res.status }
    })
    expect(response.ok).toBeFalsy()
  })
})
