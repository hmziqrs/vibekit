import { expect, test } from '@playwright/test'

// Helper to login via API and get session cookie
async function login(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const res = await request.post('/api/auth/sign-in/email', {
    data: { email: 'admin@vibekit.local', password: 'admin12345678' },
    headers: { 'Content-Type': 'application/json' },
  })
  const setCookie = res.headers()['set-cookie'] ?? ''
  return setCookie.split(';')[0]
}

test.describe('Blog tags API', () => {
  // ── Auth-gated: no session ─────────────────────────────────────────────

  test('GET /api/blog/tags — requires auth', async ({ request }) => {
    const res = await request.get('/api/blog/tags')
    expect(res.status()).toBe(401)
  })

  test('POST /api/blog/tags — requires auth', async ({ request }) => {
    const res = await request.post('/api/blog/tags', {
      data: { name: 'should-not-create' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(401)
  })

  test('PATCH /api/blog/tags/:id — requires auth', async ({ request }) => {
    const res = await request.patch('/api/blog/tags/00000000-0000-0000-0000-000000000000', {
      data: { name: 'should-not-update' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(401)
  })

  test('DELETE /api/blog/tags/:id — requires auth', async ({ request }) => {
    const res = await request.delete('/api/blog/tags/00000000-0000-0000-0000-000000000000')
    expect(res.status()).toBe(401)
  })

  // ── Authenticated CRUD ────────────────────────────────────────────────

  test.describe('with admin session', () => {
    test.describe.configure({ mode: 'serial' })

    let cookie: string
    let tagId: string

    test.beforeAll(async ({ request }) => {
      cookie = await login(request)
    })

    test('GET /api/blog/tags — returns tag list', async ({ request }) => {
      const res = await request.get('/api/blog/tags', { headers: { cookie } })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.tags)).toBe(true)
    })

    test('POST /api/blog/tags — creates tag', async ({ request }) => {
      const tagName = 'test-tag-' + Date.now()
      const res = await request.post('/api/blog/tags', {
        data: { name: tagName },
        headers: { 'Content-Type': 'application/json', cookie },
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.id).toBeTruthy()
      tagId = body.id
    })

    test('PATCH /api/blog/tags/:id — updates tag', async ({ request }) => {
      expect(tagId).toBeTruthy()
      const updatedName = 'test-tag-updated-' + Date.now()
      const res = await request.patch(`/api/blog/tags/${tagId}`, {
        data: { name: updatedName },
        headers: { 'Content-Type': 'application/json', cookie },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })

    test('DELETE /api/blog/tags/:id — deletes tag', async ({ request }) => {
      expect(tagId).toBeTruthy()
      const res = await request.delete(`/api/blog/tags/${tagId}`, {
        headers: { cookie },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })
  })
})
