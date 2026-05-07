import { expect, test } from '@playwright/test'

import { ADMIN, USER } from './helpers/auth'

// Helper to login and get session cookie
async function login(
  request: import('@playwright/test').APIRequestContext,
  credentials: { email: string; password: string }
): Promise<string> {
  const res = await request.post('/api/auth/sign-in/email', {
    headers: { 'Content-Type': 'application/json' },
    data: { email: credentials.email, password: credentials.password },
  })
  const setCookie = res.headers()['set-cookie'] ?? ''
  return setCookie.split(';')[0]
}

test.describe('Hono API integration', () => {
  test.describe.configure({ mode: 'serial' })

  // ── Health ──────────────────────────────────────────────────────────

  test.describe('Health endpoint', () => {
    test('GET /api/health returns ok', async ({ request }) => {
      const res = await request.get('/api/health')
      expect(res.status()).toBe(200)

      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.db).toBe('connected')
      expect(typeof body.responseTime).toBe('number')
      expect(typeof body.time).toBe('string')
    })

    test('health endpoint structure is correct', async ({ request }) => {
      const res = await request.get('/api/health')
      const body = await res.json()
      expect(body).toHaveProperty('ok')
      expect(body).toHaveProperty('db')
      expect(body).toHaveProperty('responseTime')
      expect(body).toHaveProperty('time')
    })
  })

  // ── Auth guards ─────────────────────────────────────────────────────

  test.describe('Auth guard', () => {
    test('unauthenticated request to protected route returns 401', async ({ request }) => {
      const res = await request.get('/api/items')
      expect(res.status()).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    test('unauthenticated request to blog route returns 401', async ({ request }) => {
      const res = await request.get('/api/blog')
      expect([401, 403]).toContain(res.status())
    })

    test('unauthenticated request to admin users returns 401', async ({ request }) => {
      const res = await request.get('/api/admin/users')
      expect([401, 403]).toContain(res.status())
    })
  })

  // ── Items CRUD ──────────────────────────────────────────────────────

  test.describe('Items CRUD (authenticated)', () => {
    test('GET /api/items returns items list', async ({ request }) => {
      const cookie = await login(request, USER)
      const res = await request.get('/api/items', {
        headers: { cookie },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.items)).toBe(true)
    })

    test('POST /api/items with valid data creates item', async ({ request }) => {
      const cookie = await login(request, USER)
      const res = await request.post('/api/items', {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({ name: `E2E Item ${Date.now()}` }),
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.item).toBeDefined()
      expect(body.item.id).toBeTruthy()
      expect(body.item.name).toContain('E2E Item')
    })

    test('POST /api/items with invalid data returns 400', async ({ request }) => {
      const cookie = await login(request, USER)
      const res = await request.post('/api/items', {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({ name: '' }),
      })
      expect(res.status()).toBe(400)
    })

    test('GET /api/items/:id returns single item', async ({ request }) => {
      const cookie = await login(request, USER)

      // Create an item first
      const createRes = await request.post('/api/items', {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({ name: `Single Item ${Date.now()}` }),
      })
      const { item } = await createRes.json()

      // Fetch it by ID
      const res = await request.get(`/api/items/${item.id}`, {
        headers: { cookie },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.item.id).toBe(item.id)
      expect(body.item.name).toBe(item.name)
    })

    test('GET /api/items/:id returns 404 for nonexistent item', async ({ request }) => {
      const cookie = await login(request, USER)
      const res = await request.get('/api/items/00000000-0000-0000-0000-000000000000', {
        headers: { cookie },
      })
      expect(res.status()).toBe(404)
    })

    test('PATCH /api/items/:id updates item', async ({ request }) => {
      const cookie = await login(request, USER)

      // Create an item
      const createRes = await request.post('/api/items', {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({ name: `Update Item ${Date.now()}` }),
      })
      const { item } = await createRes.json()

      // Update it
      const res = await request.patch(`/api/items/${item.id}`, {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({ name: `Updated Item ${Date.now()}` }),
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.item.name).toContain('Updated Item')
    })

    test('DELETE /api/items/:id soft-deletes item', async ({ request }) => {
      const cookie = await login(request, USER)

      // Create an item
      const createRes = await request.post('/api/items', {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({ name: `Delete Item ${Date.now()}` }),
      })
      const { item } = await createRes.json()

      // Delete it
      const res = await request.delete(`/api/items/${item.id}`, {
        headers: { cookie },
      })
      expect(res.status()).toBe(204)

      // Verify it's gone from list
      const listRes = await request.get('/api/items', {
        headers: { cookie },
      })
      const { items } = await listRes.json()
      expect(items.find((i: { id: string }) => i.id === item.id)).toBeUndefined()
    })
  })

  // ── Blog CRUD ───────────────────────────────────────────────────────

  test.describe('Blog CRUD (admin)', () => {
    test('GET /api/blog returns posts list', async ({ request }) => {
      const cookie = await login(request, ADMIN)
      const res = await request.get('/api/blog', {
        headers: { cookie },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.posts)).toBe(true)
    })

    test('POST /api/blog creates a blog post', async ({ request }) => {
      const cookie = await login(request, ADMIN)
      const slug = `e2e-test-${Date.now()}`
      const res = await request.post('/api/blog', {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({
          contentBody: 'Test content for E2E',
          slug,
          status: 'draft',
          title: `E2E Blog Post ${Date.now()}`,
        }),
      })
      expect(res.status()).toBe(201)
      const body = await res.json()
      expect(body.id).toBeTruthy()
    })

    test('POST /api/blog with duplicate slug returns 409', async ({ request }) => {
      const cookie = await login(request, ADMIN)
      const slug = `dup-slug-${Date.now()}`

      // Create first
      await request.post('/api/blog', {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({
          slug,
          status: 'draft',
          title: 'First Post',
        }),
      })

      // Try duplicate slug
      const res = await request.post('/api/blog', {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({
          slug,
          status: 'draft',
          title: 'Second Post',
        }),
      })
      expect(res.status()).toBe(409)
    })

    test('GET /api/blog/:id returns single post', async ({ request }) => {
      const cookie = await login(request, ADMIN)

      // Create a post
      const createRes = await request.post('/api/blog', {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({
          slug: `get-post-${Date.now()}`,
          status: 'draft',
          title: 'Get Single Post',
        }),
      })
      const { id } = await createRes.json()

      // Fetch it
      const res = await request.get(`/api/blog/${id}`, {
        headers: { cookie },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.post.id).toBe(id)
      expect(body.post.title).toBe('Get Single Post')
    })

    test('PATCH /api/blog/:id updates post', async ({ request }) => {
      const cookie = await login(request, ADMIN)

      // Create a post
      const createRes = await request.post('/api/blog', {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({
          slug: `update-post-${Date.now()}`,
          status: 'draft',
          title: 'Before Update',
        }),
      })
      const { id } = await createRes.json()

      // Update it
      const res = await request.patch(`/api/blog/${id}`, {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({ title: 'After Update' }),
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })

    test('blog lifecycle: publish, unpublish, archive, restore, delete', async ({ request }) => {
      const cookie = await login(request, ADMIN)

      // Create a post
      const createRes = await request.post('/api/blog', {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({
          slug: `lifecycle-${Date.now()}`,
          status: 'draft',
          title: 'Lifecycle Test',
        }),
      })
      const { id } = await createRes.json()

      // Publish
      const pubRes = await request.post(`/api/blog/${id}/publish`, {
        headers: { cookie },
      })
      expect(pubRes.status()).toBe(200)
      expect((await pubRes.json()).success).toBe(true)

      // Unpublish
      const unpubRes = await request.post(`/api/blog/${id}/unpublish`, {
        headers: { cookie },
      })
      expect(unpubRes.status()).toBe(200)
      expect((await unpubRes.json()).success).toBe(true)

      // Archive
      const archiveRes = await request.post(`/api/blog/${id}/archive`, {
        headers: { cookie },
      })
      expect(archiveRes.status()).toBe(200)
      expect((await archiveRes.json()).success).toBe(true)

      // Soft delete
      const delRes = await request.delete(`/api/blog/${id}`, {
        headers: { cookie },
      })
      expect(delRes.status()).toBe(200)
      expect((await delRes.json()).success).toBe(true)

      // Verify it appears in trash
      const trashRes = await request.get('/api/blog?status=trash', {
        headers: { cookie },
      })
      const trashBody = await trashRes.json()
      expect(trashBody.posts.some((p: { id: string }) => p.id === id)).toBe(true)

      // Restore from trash
      const restoreRes = await request.post(`/api/blog/${id}/restore`, {
        headers: { cookie },
      })
      expect(restoreRes.status()).toBe(200)
      expect((await restoreRes.json()).success).toBe(true)
    })

    test('non-admin user cannot access blog routes', async ({ request }) => {
      const cookie = await login(request, USER)
      const res = await request.get('/api/blog', {
        headers: { cookie },
      })
      expect(res.status()).toBe(403)
    })
  })

  // ── Admin Users ─────────────────────────────────────────────────────

  test.describe('Admin users (authenticated admin)', () => {
    test('GET /api/admin/users returns users list', async ({ request }) => {
      const cookie = await login(request, ADMIN)
      const res = await request.get('/api/admin/users', {
        headers: { cookie },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.users)).toBe(true)
      expect(typeof body.total).toBe('number')
      expect(body.total).toBeGreaterThanOrEqual(2) // admin + user
    })

    test('GET /api/admin/users supports pagination', async ({ request }) => {
      const cookie = await login(request, ADMIN)
      const res = await request.get('/api/admin/users?limit=1&page=1', {
        headers: { cookie },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.users.length).toBeLessThanOrEqual(1)
      expect(body.total).toBeGreaterThanOrEqual(2)
    })

    test('PATCH /api/admin/users/:id updates user status', async ({ request }) => {
      const cookie = await login(request, ADMIN)

      // Get the regular user's ID
      const listRes = await request.get('/api/admin/users', {
        headers: { cookie },
      })
      const { users } = await listRes.json()
      const targetUser = users.find((u: { email: string }) => u.email === 'user@vibekit.local')
      expect(targetUser).toBeDefined()

      // Suspend the user
      const res = await request.patch(`/api/admin/users/${targetUser.id}`, {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({ status: 'suspended' }),
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.user.status).toBe('suspended')

      // Reactivate
      const reactivateRes = await request.patch(`/api/admin/users/${targetUser.id}`, {
        headers: { 'Content-Type': 'application/json', cookie },
        data: JSON.stringify({ status: 'active' }),
      })
      expect(reactivateRes.status()).toBe(200)
      expect((await reactivateRes.json()).user.status).toBe('active')
    })

    test('DELETE /api/admin/users/:id cannot delete self', async ({ request }) => {
      const cookie = await login(request, ADMIN)

      // Get admin's own ID
      const listRes = await request.get('/api/admin/users', {
        headers: { cookie },
      })
      const { users } = await listRes.json()
      const adminUser = users.find((u: { email: string }) => u.email === 'admin@vibekit.local')

      // Try to delete self — should return 400
      const res = await request.delete(`/api/admin/users/${adminUser.id}`, {
        headers: { cookie },
      })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Cannot delete yourself')
    })

    test('DELETE /api/admin/users/:id returns 404 for nonexistent user', async ({ request }) => {
      const cookie = await login(request, ADMIN)
      const res = await request.delete('/api/admin/users/00000000-0000-0000-0000-000000000000', {
        headers: { cookie },
      })
      expect(res.status()).toBe(404)
    })
  })

  // ── Error handling ──────────────────────────────────────────────────

  test.describe('API error handling', () => {
    test('returns 404 for unknown API route when authenticated', async ({ request }) => {
      const cookie = await login(request, USER)
      const res = await request.get('/api/nonexistent', {
        headers: { cookie },
      })
      expect(res.status()).toBe(404)
    })
  })
})
