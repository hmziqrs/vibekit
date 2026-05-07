import { _reset } from '$lib/server/rate-limit'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAdmin, requireUser, withOwnedItem, withRateLimit } from './middleware'
import type { Env, ProtectedEnv } from './types'

describe(requireUser, () => {
  it('returns 401 when user is null', async () => {
    const app = new Hono<Env>()
      .use('*', async (c, next) => {
        c.set('services', {} as any)
        c.set('auth', {} as any)
        c.set('user', null)
        c.set('session', null)
        await next()
      })
      .get('/test', requireUser, (c) => c.json({ ok: true }))

    const res = await app.request('/test')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toStrictEqual({ error: 'Unauthorized' })
  })

  it('allows through when user is set', async () => {
    const mockUser = { id: 'user-1', role: 'user' } as any
    const app = new Hono<Env>()
      .use('*', async (c, next) => {
        c.set('services', {} as any)
        c.set('auth', {} as any)
        c.set('user', mockUser)
        c.set('session', { id: 'sess-1' } as any)
        await next()
      })
      .get('/test', requireUser, (c) => c.json({ ok: true }))

    const res = await app.request('/test')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toStrictEqual({ ok: true })
  })
})

describe(requireAdmin, () => {
  it('returns 401 when user is null', async () => {
    const app = new Hono<Env>()
      .use('*', async (c, next) => {
        c.set('services', {} as any)
        c.set('auth', {} as any)
        c.set('user', null)
        c.set('session', null)
        await next()
      })
      .get('/test', requireAdmin, (c) => c.json({ ok: true }))

    const res = await app.request('/test')
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not admin', async () => {
    const mockUser = { id: 'user-1', role: 'user' } as any
    const app = new Hono<Env>()
      .use('*', async (c, next) => {
        c.set('services', {} as any)
        c.set('auth', {} as any)
        c.set('user', mockUser)
        c.set('session', { id: 'sess-1' } as any)
        await next()
      })
      .get('/test', requireAdmin, (c) => c.json({ ok: true }))

    const res = await app.request('/test')
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toStrictEqual({ error: 'Forbidden' })
  })

  it('allows through when user is admin', async () => {
    const mockUser = { id: 'admin-1', role: 'admin' } as any
    const app = new Hono<Env>()
      .use('*', async (c, next) => {
        c.set('services', {} as any)
        c.set('auth', {} as any)
        c.set('user', mockUser)
        c.set('session', { id: 'sess-1' } as any)
        await next()
      })
      .get('/test', requireAdmin, (c) => c.json({ ok: true }))

    const res = await app.request('/test')
    expect(res.status).toBe(200)
  })
})

describe(withRateLimit, () => {
  beforeEach(() => {
    _reset()
  })

  it('allows requests within limit', async () => {
    const mockUser = { id: 'user-1', role: 'user' } as any
    const limiter = withRateLimit('test', 5, 60_000)

    const app = new Hono<ProtectedEnv>()
      .use('*', async (c, next) => {
        c.set('services', {} as any)
        c.set('auth', {} as any)
        c.set('user', mockUser)
        c.set('session', { id: 'sess-1' } as any)
        await next()
      })
      .get('/test', limiter, (c) => c.json({ ok: true }))

    const res = await app.request('/test')
    expect(res.status).toBe(200)
  })

  it('returns 429 when over limit', async () => {
    const mockUser = { id: 'user-2', role: 'user' } as any
    const limiter = withRateLimit('test-overlimit', 2, 60_000)

    const app = new Hono<ProtectedEnv>()
      .use('*', async (c, next) => {
        c.set('services', {} as any)
        c.set('auth', {} as any)
        c.set('user', mockUser)
        c.set('session', { id: 'sess-1' } as any)
        await next()
      })
      .get('/test', limiter, (c) => c.json({ ok: true }))

    // First two should succeed
    await app.request('/test')
    await app.request('/test')
    // Third should be rate limited
    const res = await app.request('/test')
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body).toStrictEqual({ error: 'Too many requests' })
  })

  it('tracks rate limits independently per prefix', async () => {
    const mockUser = { id: 'user-3', role: 'user' } as any
    const limiterA = withRateLimit('prefix-a', 1, 60_000)
    const limiterB = withRateLimit('prefix-b', 1, 60_000)

    const app = new Hono<ProtectedEnv>()
      .use('*', async (c, next) => {
        c.set('services', {} as any)
        c.set('auth', {} as any)
        c.set('user', mockUser)
        c.set('session', { id: 'sess-1' } as any)
        await next()
      })
      .get('/a', limiterA, (c) => c.json({ ok: true }))
      .get('/b', limiterB, (c) => c.json({ ok: true }))

    // Exhaust prefix-a
    await app.request('/a')
    const resA = await app.request('/a')
    expect(resA.status).toBe(429)

    // Prefix-b should still be available
    const resB = await app.request('/b')
    expect(resB.status).toBe(200)
  })
})

describe(withOwnedItem, () => {
  it('returns 404 when item not found', async () => {
    const mockUser = { id: 'user-1', role: 'user' } as any
    const mockDb = {
      from: vi.fn<() => any>().mockReturnThis(),
      get: vi.fn<() => Promise<any>>().mockResolvedValue(null),
      select: vi.fn<() => any>().mockReturnThis(),
      where: vi.fn<() => any>().mockReturnThis(),
    }

    const app = new Hono<ProtectedEnv>()
      .use('*', async (c, next) => {
        c.set('services', { db: mockDb } as any)
        c.set('auth', {} as any)
        c.set('user', mockUser)
        c.set('session', { id: 'sess-1' } as any)
        await next()
      })
      .get('/items/:id', withOwnedItem, (c) => c.json({ ok: true }))

    const res = await app.request('/items/nonexistent-id')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toStrictEqual({ error: 'Not found' })
  })

  it('sets resource and continues when item is found', async () => {
    const mockUser = { id: 'user-1', role: 'user' } as any
    const mockItem = { deletedAt: null, id: 'item-1', name: 'Test', userId: 'user-1' }
    const mockDb = {
      from: vi.fn<() => any>().mockReturnThis(),
      get: vi.fn<() => Promise<any>>().mockResolvedValue(mockItem),
      select: vi.fn<() => any>().mockReturnThis(),
      where: vi.fn<() => any>().mockReturnThis(),
    }

    const app = new Hono<ProtectedEnv>()
      .use('*', async (c, next) => {
        c.set('services', { db: mockDb } as any)
        c.set('auth', {} as any)
        c.set('user', mockUser)
        c.set('session', { id: 'sess-1' } as any)
        await next()
      })
      .get('/items/:id', withOwnedItem, (c) => c.json({ ok: true }))

    const res = await app.request('/items/item-1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toStrictEqual({ ok: true })
  })
})
