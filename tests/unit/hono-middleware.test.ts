import { isAppError } from '$lib/server/errors'
import {
  requireAdmin,
  requireUser,
  withOwnedItem,
  withRateLimit,
} from '$lib/server/hono/middleware'
import type { Env, ProtectedEnv, Variables } from '$lib/server/hono/types'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

type TestUser = NonNullable<Variables['user']>
type TestSession = NonNullable<Variables['session']>
type TestAuth = Variables['auth']
type TestServices = Variables['services']

function mockUser(id: string, role: string): TestUser {
  return { id, role } as unknown as TestUser
}

function mockSession(id: string): TestSession {
  return { id } as unknown as TestSession
}

function mockAuth(): TestAuth {
  return {} as unknown as TestAuth
}

function mockServices(): TestServices {
  return {} as unknown as TestServices
}

function withErrorHandler(app: Hono<Env | ProtectedEnv>) {
  return app.onError((err, c) => {
    if (isAppError(err)) {
      return c.json(err.toJSON(), err.status)
    }
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error', status: 500 } },
      500
    )
  })
}

describe(requireUser, () => {
  it('returns 401 when user is null', async () => {
    const app = withErrorHandler(
      new Hono<Env>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', null)
          c.set('session', null)
          await next()
        })
        .get('/test', requireUser, (c) => c.json({ ok: true }))
    )

    const res = await app.request('/test')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toStrictEqual({
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized', status: 401 },
    })
  })

  it('allows through when user is set', async () => {
    const user = mockUser('user-1', 'user')
    const app = withErrorHandler(
      new Hono<Env>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          await next()
        })
        .get('/test', requireUser, (c) => c.json({ ok: true }))
    )

    const res = await app.request('/test')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toStrictEqual({ ok: true })
  })
})

describe(requireAdmin, () => {
  it('returns 401 when user is null', async () => {
    const app = withErrorHandler(
      new Hono<Env>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', null)
          c.set('session', null)
          await next()
        })
        .get('/test', requireAdmin, (c) => c.json({ ok: true }))
    )

    const res = await app.request('/test')
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not admin', async () => {
    const user = mockUser('user-1', 'user')
    const app = withErrorHandler(
      new Hono<Env>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          await next()
        })
        .get('/test', requireAdmin, (c) => c.json({ ok: true }))
    )

    const res = await app.request('/test')
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toStrictEqual({
      error: { code: 'FORBIDDEN', message: 'Forbidden', status: 403 },
    })
  })

  it('allows through when user is admin', async () => {
    const user = mockUser('admin-1', 'admin')
    const app = withErrorHandler(
      new Hono<Env>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          await next()
        })
        .get('/test', requireAdmin, (c) => c.json({ ok: true }))
    )

    const res = await app.request('/test')
    expect(res.status).toBe(200)
  })
})

describe(withRateLimit, () => {
  it('allows requests within limit', async () => {
    const user = mockUser('user-1', 'user')
    const limiter = withRateLimit('test-middleware-allow', 5, 60_000)

    const app = withErrorHandler(
      new Hono<ProtectedEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          await next()
        })
        .get('/test', limiter, (c) => c.json({ ok: true }))
    )

    const res = await app.request('/test')
    expect(res.status).toBe(200)
  })

  it('returns 429 when over limit', async () => {
    const user = mockUser('user-2', 'user')
    const limiter = withRateLimit('test-overlimit', 2, 60_000)

    const app = withErrorHandler(
      new Hono<ProtectedEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          await next()
        })
        .get('/test', limiter, (c) => c.json({ ok: true }))
    )

    // First two should succeed
    await app.request('/test')
    await app.request('/test')
    // Third should be rate limited
    const res = await app.request('/test')
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body).toStrictEqual({
      error: { code: 'RATE_LIMITED', message: 'Too many requests', status: 429 },
    })
  })

  it('tracks rate limits independently per prefix', async () => {
    const user = mockUser('user-3', 'user')
    const limiterA = withRateLimit('prefix-a', 1, 60_000)
    const limiterB = withRateLimit('prefix-b', 1, 60_000)

    const app = withErrorHandler(
      new Hono<ProtectedEnv>()
        .use('*', async (c, next) => {
          c.set('services', mockServices())
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          await next()
        })
        .get('/a', limiterA, (c) => c.json({ ok: true }))
        .get('/b', limiterB, (c) => c.json({ ok: true }))
    )

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
    const user = mockUser('user-1', 'user')
    const mockDb = {
      from: vi.fn<() => void>().mockReturnThis(),
      get: vi.fn<() => Promise<unknown>>().mockResolvedValue(null),
      select: vi.fn<() => void>().mockReturnThis(),
      where: vi.fn<() => void>().mockReturnThis(),
    }

    const app = withErrorHandler(
      new Hono<ProtectedEnv>()
        .use('*', async (c, next) => {
          c.set('services', { db: mockDb } as unknown as TestServices)
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          await next()
        })
        .get('/items/:id', withOwnedItem, (c) => c.json({ ok: true }))
    )

    const res = await app.request('/items/nonexistent-id')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toStrictEqual({
      error: { code: 'NOT_FOUND', message: 'Not found', status: 404 },
    })
  })

  it('sets resource and continues when item is found', async () => {
    const user = mockUser('user-1', 'user')
    const mockItem = { deletedAt: null, id: 'item-1', name: 'Test', userId: 'user-1' }
    const mockDb = {
      from: vi.fn<() => void>().mockReturnThis(),
      get: vi.fn<() => Promise<unknown>>().mockResolvedValue(mockItem),
      select: vi.fn<() => void>().mockReturnThis(),
      where: vi.fn<() => void>().mockReturnThis(),
    }

    const app = withErrorHandler(
      new Hono<ProtectedEnv>()
        .use('*', async (c, next) => {
          c.set('services', { db: mockDb } as unknown as TestServices)
          c.set('auth', mockAuth())
          c.set('user', user)
          c.set('session', mockSession('sess-1'))
          await next()
        })
        .get('/items/:id', withOwnedItem, (c) => c.json({ ok: true }))
    )

    const res = await app.request('/items/item-1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toStrictEqual({ ok: true })
  })
})
