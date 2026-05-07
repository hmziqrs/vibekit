import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'

describe('hono app structure', () => {
  it('can construct Hono app with the same middleware pipeline', () => {
    const app = new Hono()
      .use('*', async (_c, next) => await next())
      .get('/api/health', (c) => c.json({ ok: true }))

    expect(app).toBeInstanceOf(Hono)

    const { routes } = app
    expect(routes.length).toBeGreaterThan(0)
  })

  it('sub-apps can be mounted on the base app', () => {
    const base = new Hono()
    const sub = new Hono().get('/test', (c) => c.json({ ok: true }))
    const mounted = base.route('/api', sub)

    expect(mounted).toBeInstanceOf(Hono)
  })
})

describe('validation via zValidator', () => {
  const testSchema = z.object({
    description: z.string().max(2000).optional(),
    name: z.string().min(1),
  })

  it('returns 400 for invalid JSON body', async () => {
    const app = new Hono().post('/test', zValidator('json', testSchema), (c) =>
      c.json({ ok: true }, 201)
    )

    const res = await app.request('/test', {
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    expect(res.status).toBe(400)
  })

  it('returns 201 for valid JSON body', async () => {
    const app = new Hono().post('/test', zValidator('json', testSchema), (c) =>
      c.json({ ok: true }, 201)
    )

    const res = await app.request('/test', {
      body: JSON.stringify({ name: 'Test Item' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toStrictEqual({ ok: true })
  })

  it('returns 400 for missing content-type', async () => {
    const app = new Hono().post('/test', zValidator('json', testSchema), (c) =>
      c.json({ ok: true }, 201)
    )

    const res = await app.request('/test', {
      body: JSON.stringify({ name: 'Test Item' }),
      method: 'POST',
    })

    expect(res.status).toBe(400)
  })
})

describe('error handler', () => {
  it('catches thrown errors and returns 500', async () => {
    const app = new Hono()
      .onError((err, c) => {
        console.error(err)
        return c.json({ error: 'Internal Server Error' }, 500)
      })
      .get('/crash', () => {
        throw new Error('test error')
      })

    const res = await app.request('/crash')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toStrictEqual({ error: 'Internal Server Error' })
  })
})
