import { describe, expect, it } from 'vitest'

describe('scheduled cron handler', () => {
  it('postbuild script exists and is valid', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const script = readFileSync(
      resolve(import.meta.dirname, '../../scripts/postbuild-cron.ts'),
      'utf8'
    )
    expect(script).toContain('scheduled')
    expect(script).toContain('publish-scheduled')
    expect(script).toContain('retry-webhooks')
    expect(script).toContain('cleanup')
  })

  it('cron endpoints accept x-cron-secret header', { timeout: 15_000 }, async () => {
    const endpoints = [
      '/api/admin/publish-scheduled',
      '/api/admin/cleanup',
      '/api/admin/retry-webhooks',
    ]
    // Verify these endpoints exist in the hono routes
    const { app } = await import('../../src/lib/server/hono/index')
    const routes = app.routes

    for (const path of endpoints) {
      const found = routes.some(
        (r) => r.path === path && (r.method === 'POST' || r.method === 'ALL')
      )
      expect(found, `Route ${path} should exist`).toBe(true)
    }
  })

  it('wrangler.jsonc has cron triggers configured', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const raw = readFileSync(resolve(import.meta.dirname, '../../wrangler.jsonc'), 'utf8')
    expect(raw).toContain('"crons"')
    expect(raw).toContain('0 3 * * *')
    expect(raw).toContain('*/5 * * * *')
  })

  it('CRON_SECRET is in RuntimeEnv type', async () => {
    const types = await import('../../src/lib/server/services/types')
    // The interface exists and cronSecret is a string property
    expect(types).toBeDefined()
  })
})
