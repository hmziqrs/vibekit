import type { Env, Variables } from '$lib/server/hono/types'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

type TestUser = NonNullable<Variables['user']>
type TestAuth = Variables['auth']
type TestServices = Variables['services']

function mockUser(id: string, role: string): TestUser {
  return { id, role } as unknown as TestUser
}

function mockAuth(): TestAuth {
  return { api: { getSession: vi.fn<() => Promise<void>>() } } as unknown as TestAuth
}

// Mock services factory for testing
function mockServices(overrides: Record<string, unknown> = {}): TestServices {
  const base = {
    cache: { purgeBlog: vi.fn<() => void>() },
    db: {
      all: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      delete: vi.fn<() => void>().mockReturnThis(),
      execute: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      from: vi.fn<() => void>().mockReturnThis(),
      get: vi.fn<() => Promise<unknown>>().mockResolvedValue(null),
      insert: vi.fn<() => void>().mockReturnThis(),
      limit: vi.fn<() => void>().mockReturnThis(),
      offset: vi.fn<() => void>().mockReturnThis(),
      orderBy: vi.fn<() => void>().mockReturnThis(),
      returning: vi.fn<() => void>().mockReturnThis(),
      run: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      select: vi.fn<() => void>().mockReturnThis(),
      set: vi.fn<() => void>().mockReturnThis(),
      update: vi.fn<() => void>().mockReturnThis(),
      values: vi.fn<() => void>().mockReturnThis(),
      where: vi.fn<() => void>().mockReturnThis(),
    },
    email: { send: vi.fn<() => void>() },
    env: {
      betterAuthSecret: 'test-secret',
      cronSecret: 'test-cron-secret',
      origin: 'http://localhost:5173',
    },
    storage: {
      delete: vi.fn<() => void>(),
      get: vi.fn<() => Promise<void>>(),
      put: vi.fn<() => void>(),
    },
  }
  return { ...base, ...overrides } as unknown as TestServices
}

// Helper to create a test Hono app with mocked middleware
function createAppWithUser(user: TestUser | null) {
  const services = mockServices()
  const app = new Hono<Env>()

  app.use('*', async (c, next) => {
    c.set('services', services)
    c.set('auth', mockAuth())
    c.set('user', user)
    c.set(
      'session',
      user ? ({ id: 'sess-1' } as unknown as NonNullable<Variables['session']>) : null
    )
    await next()
  })

  return { app, services }
}

describe('health endpoint', () => {
  it('returns connected when DB is available', async () => {
    const services = mockServices()
    const app = new Hono<Env>()

    app.use('*', async (c, next) => {
      c.set('services', services)
      c.set('auth', mockAuth())
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
      db: { run: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('DB down')) },
    })
    const app = new Hono<Env>()

    app.use('*', async (c, next) => {
      c.set('services', services)
      c.set('auth', mockAuth())
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
    app.get('/api/items', (c) => {
      const user = c.get('user')
      if (!user) return c.json({ error: 'Unauthorized' }, 401)
      return c.json({ items: [] })
    })

    const res = await app.request('/api/items')
    expect(res.status).toBe(401)
  })

  it('allows authenticated requests to protected routes', async () => {
    const { app } = createAppWithUser(mockUser('u1', 'user'))
    app.get('/api/items', (c) => {
      const user = c.get('user')
      if (!user) return c.json({ error: 'Unauthorized' }, 401)
      return c.json({ items: [] })
    })

    const res = await app.request('/api/items')
    expect(res.status).toBe(200)
  })
})

describe('admin route auth guard', () => {
  it('rejects non-admin users', async () => {
    const { app } = createAppWithUser(mockUser('u1', 'user'))
    app.get('/api/admin/users', (c) => {
      const user = c.get('user')
      if (!user) return c.json({ error: 'Unauthorized' }, 401)
      if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
      return c.json({ users: [] })
    })

    const res = await app.request('/api/admin/users')
    expect(res.status).toBe(403)
  })

  it('allows admin users', async () => {
    const { app } = createAppWithUser(mockUser('a1', 'admin'))
    app.get('/api/admin/users', (c) => {
      const user = c.get('user')
      if (!user) return c.json({ error: 'Unauthorized' }, 401)
      if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
      return c.json({ users: [] })
    })

    const res = await app.request('/api/admin/users')
    expect(res.status).toBe(200)
  })

  it('rejects unauthenticated users', async () => {
    const { app } = createAppWithUser(null)
    app.get('/api/admin/users', (c) => {
      const user = c.get('user')
      if (!user) return c.json({ error: 'Unauthorized' }, 401)
      if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
      return c.json({ users: [] })
    })

    const res = await app.request('/api/admin/users')
    expect(res.status).toBe(401)
  })
})
