import { createServer } from 'http'
import type { AddressInfo } from 'net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('notifications e2e', () => {
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

  describe('notification endpoints', () => {
    it('GET /api/notifications requires auth', async () => {
      const res = await fetch(`${baseUrl}/api/notifications`)
      expect(res.status).toBe(401)
    })

    it('GET /api/notifications/unread-count requires auth', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/unread-count`)
      expect(res.status).toBe(401)
    })

    it('PATCH /api/notifications/read-all requires auth', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/read-all`, { method: 'PATCH' })
      expect(res.status).toBe(401)
    })

    it('PATCH /api/notifications/:id/read requires auth', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/test-id/read`, { method: 'PATCH' })
      expect(res.status).toBe(401)
    })

    it('DELETE /api/notifications/:id requires auth', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/test-id`, { method: 'DELETE' })
      expect(res.status).toBe(401)
    })
  })
})
