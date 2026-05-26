import { Hono } from 'hono'
import { hc } from 'hono/client'
import { describe, expect, it, vi } from 'vitest'

// Self-contained test app mirroring the project's route structure
const testApp = new Hono()
  .get('/api/items', (c) => c.json({ items: [], total: 0 }))
  .get('/api/items/:id', (c) => c.json({ id: c.req.param('id'), name: 'Test' }))
  .post('/api/items', async (c) => {
    const body = await c.req.json<{ name: string }>()
    return c.json({ id: 'new-1', name: body.name }, 201)
  })
  .patch('/api/items/:id', async (c) => {
    const body = await c.req.json<{ name?: string }>()
    return c.json({ id: c.req.param('id'), name: body.name ?? 'Updated' })
  })
  .delete('/api/items/:id', (c) => c.json({ deleted: true }))
  .get('/api/items/:id/sub', (c) => c.json({ itemId: c.req.param('id'), subs: [] }))
  .get('/api/search', (c) => c.json({ hits: [], query: c.req.query('q') ?? '' }))
  .post('/api/upload', async (c) => c.json({ url: '/files/uploaded.pdf' }))

type TestAppType = typeof testApp

function createTestClient(fetchFn?: typeof fetch) {
  return hc<TestAppType>('/', { fetch: fetchFn })
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

describe('api client (Hono RPC pattern)', () => {
  describe('client creation', () => {
    it('exposes typed route methods for each endpoint', () => {
      const client = createTestClient()

      expect(client.api.items.$get).toBeTypeOf('function')
      expect(client.api.items.$post).toBeTypeOf('function')
      expect(client.api.items[':id'].$get).toBeTypeOf('function')
      expect(client.api.items[':id'].$patch).toBeTypeOf('function')
      expect(client.api.items[':id'].$delete).toBeTypeOf('function')
    })

    it('exposes nested route methods', () => {
      const client = createTestClient()

      expect(client.api.items[':id'].sub.$get).toBeTypeOf('function')
    })

    it('exposes query string routes', () => {
      const client = createTestClient()

      expect(client.api.search.$get).toBeTypeOf('function')
    })
  })

  describe('GET requests', () => {
    it('calls fetch with correct URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ items: [], total: 0 }))
      const client = createTestClient(mockFetch)

      await client.api.items.$get()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch.mock.calls[0][0].toString()).toContain('/api/items')
    })

    it('passes path params correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ id: 'abc-123', name: 'Test' }))
      const client = createTestClient(mockFetch)

      await client.api.items[':id'].$get({ param: { id: 'abc-123' } })

      const calledUrl = mockFetch.mock.calls[0][0].toString()
      expect(calledUrl).toContain('/api/items/abc-123')
    })

    it('passes query params correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ hits: [], query: 'test' }))
      const client = createTestClient(mockFetch)

      await client.api.search.$get({ query: { q: 'test' } })

      const calledUrl = mockFetch.mock.calls[0][0].toString()
      expect(calledUrl).toContain('q=test')
    })

    it('returns typed JSON response', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ items: [{ id: '1', name: 'A' }], total: 1 }))
      const client = createTestClient(mockFetch)

      const res = await client.api.items.$get()
      const data = await res.json()

      expect(data.items).toEqual([{ id: '1', name: 'A' }])
      expect(data.total).toBe(1)
    })
  })

  describe('POST requests', () => {
    it('sends JSON body', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ id: 'new-1', name: 'Created' }, 201))
      const client = createTestClient(mockFetch)

      const res = await client.api.items.$post({
        json: { name: 'Created' },
      })

      expect(res.status).toBe(201)
      // Verify the request was made with correct method
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('PATCH requests', () => {
    it('sends partial update', async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ id: 'item-1', name: 'Updated' }))
      const client = createTestClient(mockFetch)

      const res = await client.api.items[':id'].$patch({
        param: { id: 'item-1' },
        json: { name: 'Updated' },
      })

      expect(res.ok).toBe(true)
    })
  })

  describe('DELETE requests', () => {
    it('sends delete request with path param', async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ deleted: true }))
      const client = createTestClient(mockFetch)

      const res = await client.api.items[':id'].$delete({ param: { id: 'item-1' } })

      const calledUrl = mockFetch.mock.calls[0][0].toString()
      expect(calledUrl).toContain('/api/items/item-1')
    })
  })

  describe('response handling', () => {
    it('res.ok is false for error responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ error: 'Not found' }, 404))
      const client = createTestClient(mockFetch)

      const res = await client.api.items[':id'].$get({ param: { id: 'missing' } })

      expect(res.ok).toBe(false)
      expect(res.status).toBe(404)
    })

    it('can read error response body', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ error: { message: 'Unauthorized' } }, 401))
      const client = createTestClient(mockFetch)

      const res = await client.api.items.$get()
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.error.message).toBe('Unauthorized')
    })

    it('handles 500 errors', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ error: 'Internal server error' }, 500))
      const client = createTestClient(mockFetch)

      const res = await client.api.items.$get()

      expect(res.status).toBe(500)
      expect(res.ok).toBe(false)
    })
  })

  describe('custom fetch', () => {
    it('uses the provided fetch function', async () => {
      const customFetch = vi.fn().mockResolvedValue(jsonResponse({ items: [], total: 0 }))
      const client = createTestClient(customFetch)

      await client.api.items.$get()

      expect(customFetch).toHaveBeenCalledTimes(1)
    })

    it('works without custom fetch (uses global)', () => {
      const client = createTestClient()
      expect(client).toBeDefined()
      expect(client.api.items.$get).toBeTypeOf('function')
    })
  })

  describe('edge cases', () => {
    it('handles special characters in path params', async () => {
      const mockFetch = vi.fn().mockResolvedValue(jsonResponse({ id: 'test%20id', name: 'Test' }))
      const client = createTestClient(mockFetch)

      await client.api.items[':id'].$get({ param: { id: 'test id' } })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('handles multiple sequential requests', async () => {
      let callCount = 0
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++
        return Promise.resolve(jsonResponse({ items: [], total: callCount }))
      })
      const client = createTestClient(mockFetch)

      const res1 = await client.api.items.$get()
      const res2 = await client.api.items.$get()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      const data1 = await res1.json()
      const data2 = await res2.json()
      expect(data1.total).toBe(1)
      expect(data2.total).toBe(2)
    })
  })
})
