import { requireUser, requireAdmin, withRateLimit } from '$lib/server/hono/middleware'
import type { Env, ProtectedEnv } from '$lib/server/hono/types'
import { _reset } from '$lib/server/rate-limit'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock services factory for testing
function mockServices(overrides: Record<string, any> = {}) {
  return {
    cache: { purgeBlog: vi.fn<() => void>(), ...overrides.cache },
    db: {
      all: vi.fn<() => Promise<any[]>>().mockResolvedValue([]),
      delete: vi.fn<() => any>().mockReturnThis(),
      execute: vi.fn<() => Promise<any[]>>().mockResolvedValue([]),
      from: vi.fn<() => any>().mockReturnThis(),
      get: vi.fn<() => Promise<any>>().mockResolvedValue(null),
      insert: vi.fn<() => any>().mockReturnThis(),
      limit: vi.fn<() => any>().mockReturnThis(),
      offset: vi.fn<() => any>().mockReturnThis(),
      orderBy: vi.fn<() => any>().mockReturnThis(),
      returning: vi.fn<() => any>().mockReturnThis(),
      run: vi.fn<() => Promise<any>>().mockResolvedValue(undefined),
      select: vi.fn<() => any>().mockReturnThis(),
      set: vi.fn<() => any>().mockReturnThis(),
      update: vi.fn<() => any>().mockReturnThis(),
      values: vi.fn<() => any>().mockReturnThis(),
      where: vi.fn<() => any>().mockReturnThis(),
      ...overrides.db,
    },
    email: { send: vi.fn<() => void>(), ...overrides.email },
    env: {
      betterAuthSecret: 'test-secret',
      cronSecret: 'test-cron-secret',
      origin: 'http://localhost:5173',
      ...overrides.env,
    },
    storage: {
      delete: vi.fn<() => void>(),
      get: vi.fn<() => Promise<any>>(),
      put: vi.fn<() => void>(),
      ...overrides.storage,
    },
  }
}

// Helper to create a test Hono app with mocked middleware
function createAppWithUser(user: any) {
  const services = mockServices()
  const app = new Hono<Env>()

  app.use('*', async (c, next) => {
    c.set('services', services as any)
    c.set('auth', { api: { getSession: vi.fn<() => Promise<any>>() } } as any)
    c.set('user', user)
    c.set('session', user ? ({ id: 'sess-1' } as any) : null)
    await next()
  })

  return { app, services }
}

describe('health endpoint', () => {
  it('returns connected when DB is available', async () => {
    const services = mockServices()
    const app = new Hono<Env>()

    app.use('*', async (c, next) => {
      c.set('services', services as any)
      c.set('auth', {} as any)
      c.set('user', null)
      c.set('session', null)
      await next()
    })

    app.get('/api/health', async (c) => {
      const start = Date.now()
      let dbStatus: 'connected' | 'error' | 'unavailable' = 'error'
      try {
        const svc = c.get('services')
        if (svc) {
          await svc.db.run(sql`SELECT 1`)
          dbStatus = 'connected'
        } else {
          dbStatus = 'unavailable'
        }
      } catch {
        dbStatus = 'error'
      }
      return c.json({
        db: dbStatus,
        ok: dbStatus === 'connected',
        responseTime: Date.now() - start,
        time: new Date().toISOString(),
      })
    })

    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.ok).toBe(true)
    expect(body.db).toBe('connected')
    expect(body.responseTime).toBeGreaterThanOrEqual(0)
    expect(body.time).toBeTruthy()
  })

  it('returns error when DB throws', async () => {
    const services = mockServices({
      db: { run: vi.fn<() => Promise<any>>().mockRejectedValue(new Error('DB down')) },
    })
    const app = new Hono<Env>()

    app.use('*', async (c, next) => {
      c.set('services', services as any)
      c.set('auth', {} as any)
      c.set('user', null)
      c.set('session', null)
      await next()
    })

    app.get('/api/health', async (c) => {
      const start = Date.now()
      let dbStatus: 'connected' | 'error' | 'unavailable' = 'error'
      try {
        const svc = c.get('services')
        if (svc) {
          await svc.db.run(sql`SELECT 1`)
          dbStatus = 'connected'
        } else {
          dbStatus = 'unavailable'
        }
      } catch {
        dbStatus = 'error'
      }
      return c.json({
        db: dbStatus,
        ok: dbStatus === 'connected',
        responseTime: Date.now() - start,
        time: new Date().toISOString(),
      })
    })

    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.ok).toBe(false)
    expect(body.db).toBe('error')
  })
})

describe('protected route auth guard', () => {
  it('rejects unauthenticated requests to protected routes', async () => {
    const { app } = createAppWithUser(null)
    app.get('/api/items', requireUser, (c) => c.json({ items: [] }))

    const res = await app.request('/api/items')
    expect(res.status).toBe(401)
  })

  it('allows authenticated requests to protected routes', async () => {
    const { app } = createAppWithUser({ id: 'u1', role: 'user' })
    app.get('/api/items', requireUser, (c) => c.json({ items: [] }))

    const res = await app.request('/api/items')
    expect(res.status).toBe(200)
  })
})

describe('admin route auth guard', () => {
  it('rejects non-admin users', async () => {
    const { app } = createAppWithUser({ id: 'u1', role: 'user' })
    app.get('/api/admin/users', requireAdmin, (c) => c.json({ users: [] }))

    const res = await app.request('/api/admin/users')
    expect(res.status).toBe(403)
  })

  it('allows admin users', async () => {
    const { app } = createAppWithUser({ id: 'a1', role: 'admin' })
    app.get('/api/admin/users', requireAdmin, (c) => c.json({ users: [] }))

    const res = await app.request('/api/admin/users')
    expect(res.status).toBe(200)
  })

  it('rejects unauthenticated users', async () => {
    const { app } = createAppWithUser(null)
    app.get('/api/admin/users', requireAdmin, (c) => c.json({ users: [] }))

    const res = await app.request('/api/admin/users')
    expect(res.status).toBe(401)
  })
})

describe('rate limiting middleware', () => {
  beforeEach(() => {
    _reset()
  })

  it('blocks requests after limit is reached', async () => {
    const user = { id: 'rate-user', role: 'user' }
    const limiter = withRateLimit('test-rate', 2, 60_000)

    const app = new Hono<ProtectedEnv>()
      .use('*', async (c, next) => {
        c.set('services', mockServices() as any)
        c.set('auth', {} as any)
        c.set('user', user as any)
        c.set('session', { id: 's1' } as any)
        await next()
      })
      .get('/test', limiter, (c) => c.json({ ok: true }))

    // First two succeed
    const res1 = await app.request('/test')
    const res2 = await app.request('/test')
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)

    // Third fails
    const res3 = await app.request('/test')
    expect(res3.status).toBe(429)
  })
})
