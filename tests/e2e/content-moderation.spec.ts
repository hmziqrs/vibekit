import { createServer } from 'http'
import type { AddressInfo } from 'net'

import { afterAll, beforeAll, describe, expect, test } from 'vitest'

describe('content moderation e2e', () => {
  let server: ReturnType<typeof createServer>
  let baseUrl: string

  beforeAll(async () => {
    const { app } = await import('../src/lib/server/hono/index')
    server = createServer((req, res) => {
      app.fetch(new Request(`http://localhost${req.url}`, req as never)).then((response) => {
        res.statusCode = response.status
        response.headers.forEach((value, key) => {
          res.setHeader(key, value)
        })
        response.arrayBuffer().then((buf) => {
          res.end(Buffer.from(buf))
        })
      })
    })
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as AddressInfo
        baseUrl = `http://localhost:${addr.port}`
        resolve()
      })
    })
  })

  afterAll(() => {
    server?.close()
  })

  test('POST /api/reports requires auth', async () => {
    const res = await fetch(`${baseUrl}/api/reports`, {
      body: JSON.stringify({
        entityId: 'test-id',
        entityType: 'item',
        reason: 'spam',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    expect(res.status).toBe(401)
  })

  test('GET /api/admin/reports requires admin auth', async () => {
    const res = await fetch(`${baseUrl}/api/admin/reports`)
    expect(res.status).toBe(401)
  })

  test('GET /api/admin/reports/stats requires admin auth', async () => {
    const res = await fetch(`${baseUrl}/api/admin/reports/stats`)
    expect(res.status).toBe(401)
  })

  test('PATCH /api/admin/reports/:id requires admin auth', async () => {
    const res = await fetch(`${baseUrl}/api/admin/reports/nonexistent`, {
      body: JSON.stringify({
        resolutionNote: 'test',
        status: 'resolved',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    })
    expect(res.status).toBe(401)
  })
})
