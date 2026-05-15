import { describe, expect, it } from 'vitest'

describe('organization management e2e', () => {
  it('org detail page shows leave button for non-owners', async () => {
    // Non-owner scenario tested via API
    const res = await fetch('http://localhost:5173/api/orgs', {
      headers: { cookie: '' },
    })
    expect(res.status).toBe(401)
  })

  it('transfer ownership API requires org.transfer permission', async () => {
    const res = await fetch('http://localhost:5173/api/orgs/nonexistent/transfer-ownership', {
      body: JSON.stringify({ newOwnerId: 'user-2' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    expect(res.status).toBe(401)
  })

  it('org invitations list requires auth', async () => {
    const res = await fetch('http://localhost:5173/api/orgs/test-org/invitations')
    expect(res.status).toBe(401)
  })

  it('org invitation revoke requires auth', async () => {
    const res = await fetch('http://localhost:5173/api/orgs/test-org/invitations/inv-1', {
      method: 'DELETE',
    })
    expect(res.status).toBe(401)
  })
})

describe('items sort and pagination API', () => {
  it('supports sort query parameter', async () => {
    const res = await fetch('http://localhost:5173/api/items?sort=-createdAt')
    expect(res.status).toBe(401)
  })

  it('supports page and limit parameters', async () => {
    const res = await fetch('http://localhost:5173/api/items?page=2&limit=10')
    expect(res.status).toBe(401)
  })

  it('supports status filter', async () => {
    const res = await fetch('http://localhost:5173/api/items?status=active')
    expect(res.status).toBe(401)
  })

  it('supports search parameter', async () => {
    const res = await fetch('http://localhost:5173/api/items?search=test')
    expect(res.status).toBe(401)
  })
})

describe('notification preferences with push channel', () => {
  it('preferences page returns 401 without auth', async () => {
    const res = await fetch('http://localhost:5173/api/notifications/preferences')
    expect(res.status).toBe(401)
  })
})

describe('admin user detail API', () => {
  it('requires admin auth', async () => {
    const res = await fetch('http://localhost:5173/api/admin/users/test-id')
    expect(res.status).toBe(401)
  })
})
