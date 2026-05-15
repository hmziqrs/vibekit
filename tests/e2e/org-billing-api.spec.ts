import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth'

function getBaseUrl(page: Page): string {
  const url = new URL(page.url())
  return `${url.protocol}//${url.host}`
}

test.describe('Org billing API', () => {
  const nonexistentOrg = '00000000-0000-0000-0000-000000000000'

  // ── Auth-gated: no session ─────────────────────────────────────────────

  test('POST /api/orgs/:orgId/billing/cancel — requires auth', async ({ page, request }) => {
    const res = await request.post(`/api/orgs/${nonexistentOrg}/billing/cancel`)
    expect(res.status()).toBe(401)
  })

  test('POST /api/orgs/:orgId/billing/reactivate — requires auth', async ({ page, request }) => {
    const res = await request.post(`/api/orgs/${nonexistentOrg}/billing/reactivate`)
    expect(res.status()).toBe(401)
  })

  test('GET /api/orgs/:orgId/billing/subscription — requires auth', async ({ page, request }) => {
    const res = await request.get('/api/orgs/test/billing/subscription')
    expect(res.status()).toBe(401)
  })

  test('GET /api/orgs/:orgId/billing/invoices — requires auth', async ({ page, request }) => {
    const res = await request.get('/api/orgs/test/billing/invoices')
    expect(res.status()).toBe(401)
  })

  // ── Authenticated: nonexistent org ─────────────────────────────────────

  test.describe('with admin session', () => {
    test.beforeAll(async ({ browser }) => {
      const page = await browser.newPage()
      await loginAsAdmin(page)
      await page.close()
    })

    test('POST /api/orgs/:orgId/billing/cancel — nonexistent org returns 404 or 403', async ({
      request,
    }) => {
      const loginRes = await request.post('/api/auth/sign-in/email', {
        data: { email: 'admin@vibekit.local', password: 'admin12345678' },
        headers: { 'Content-Type': 'application/json' },
      })
      const setCookie = loginRes.headers()['set-cookie'] ?? ''
      const cookie = setCookie.split(';')[0]

      const res = await request.post(`/api/orgs/${nonexistentOrg}/billing/cancel`, {
        headers: { cookie },
      })
      expect([403, 404]).toContain(res.status())
    })

    test('POST /api/orgs/:orgId/billing/reactivate — nonexistent org returns 404 or 403', async ({
      request,
    }) => {
      const loginRes = await request.post('/api/auth/sign-in/email', {
        data: { email: 'admin@vibekit.local', password: 'admin12345678' },
        headers: { 'Content-Type': 'application/json' },
      })
      const setCookie = loginRes.headers()['set-cookie'] ?? ''
      const cookie = setCookie.split(';')[0]

      const res = await request.post(`/api/orgs/${nonexistentOrg}/billing/reactivate`, {
        headers: { cookie },
      })
      expect([403, 404]).toContain(res.status())
    })
  })
})
