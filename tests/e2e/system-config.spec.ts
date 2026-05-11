import { createServer } from 'http'
import type { AddressInfo } from 'net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('system config e2e', () => {
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

  describe('config endpoints', () => {
    it('GET /api/admin/config requires admin auth', async () => {
      const res = await fetch(`${baseUrl}/api/admin/config`)
      expect(res.status).toBe(401)
    })

    it('PATCH /api/admin/config/maintenance_mode requires admin auth', async () => {
      const res = await fetch(`${baseUrl}/api/admin/config/maintenance_mode`, {
        body: JSON.stringify({ value: 'true' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      expect(res.status).toBe(401)
    })
  })

  describe('announcement endpoints', () => {
    it('GET /api/admin/announcements requires admin auth', async () => {
      const res = await fetch(`${baseUrl}/api/admin/announcements`)
      expect(res.status).toBe(401)
    })

    it('POST /api/admin/announcements requires admin auth', async () => {
      const res = await fetch(`${baseUrl}/api/admin/announcements`, {
        body: JSON.stringify({ message: 'Test announcement' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      expect(res.status).toBe(401)
    })

    it('PATCH /api/admin/announcements/test-id requires admin auth', async () => {
      const res = await fetch(`${baseUrl}/api/admin/announcements/test-id`, {
        body: JSON.stringify({ isActive: false }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      expect(res.status).toBe(401)
    })

    it('DELETE /api/admin/announcements/test-id requires admin auth', async () => {
      const res = await fetch(`${baseUrl}/api/admin/announcements/test-id`, {
        method: 'DELETE',
      })
      expect(res.status).toBe(401)
    })

    it('GET /api/announcements returns empty array without auth', async () => {
      const res = await fetch(`${baseUrl}/api/announcements`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })
})
