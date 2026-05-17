import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../..')

describe('webhook auto-retry cron processor', () => {
  it('has processRetryableDeliveries function in webhooks.ts', () => {
    const source = readFileSync(resolve(root, 'src/lib/server/webhooks.ts'), 'utf8')
    expect(source).toContain('processRetryableDeliveries')
  })

  it('queries retrying deliveries where nextRetryAt <= now', () => {
    const source = readFileSync(resolve(root, 'src/lib/server/webhooks.ts'), 'utf8')
    expect(source).toContain("eq(webhookDelivery.status, 'retrying')")
    expect(source).toContain('lte(webhookDelivery.nextRetryAt, now)')
  })

  it('has cron endpoint in hono routes', () => {
    const source = readFileSync(resolve(root, 'src/lib/server/hono/index.ts'), 'utf8')
    expect(source).toContain('/api/admin/retry-webhooks')
    expect(source).toContain('processRetryableDeliveries')
  })

  it('cron endpoint accepts cron secret', () => {
    const source = readFileSync(resolve(root, 'src/lib/server/hono/index.ts'), 'utf8')
    expect(source).toContain('/api/admin/retry-webhooks')
    expect(source).toContain('requireCronOrAdmin')
  })
})

describe('automation manifest scope names', () => {
  it('uses actual API_KEY_SCOPES format (read:blog not blog.read)', () => {
    const source = readFileSync(resolve(root, 'src/lib/server/hono/index.ts'), 'utf8')
    // Extract the manifest scopes section
    const manifestSection = source.substring(
      source.indexOf("app.get('/api/automation/manifest'"),
      source.indexOf("app.get('/api/automation/manifest'") + 3000
    )
    expect(manifestSection).toContain('read:blog')
    expect(manifestSection).toContain('write:blog')
    expect(manifestSection).toContain('read:items')
    expect(manifestSection).toContain('write:items')
    expect(manifestSection).toContain('read:organizations')
    expect(manifestSection).toContain('admin')
  })

  it('no longer uses incorrect format (blog.read)', () => {
    const source = readFileSync(resolve(root, 'src/lib/server/hono/index.ts'), 'utf8')
    const manifestSection = source.substring(
      source.indexOf("app.get('/api/automation/manifest'"),
      source.indexOf("app.get('/api/automation/manifest'") + 3000
    )
    expect(manifestSection).not.toContain('blog.read')
    expect(manifestSection).not.toContain('items.read')
    expect(manifestSection).not.toContain('orgs.read')
    expect(manifestSection).not.toContain('teams.read')
  })
})
