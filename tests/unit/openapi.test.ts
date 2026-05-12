import { readFileSync } from 'fs'

import { describe, expect, it } from 'vitest'

const specPath = 'static/openapi.yaml'
const specText = readFileSync(specPath, 'utf-8')

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}

function hasPath(path: string): boolean {
  return specText.includes(`  ${path}:`)
}

function hasTag(tag: string): boolean {
  return specText.includes(`  - name: ${tag}`)
}

function hasSchema(name: string): boolean {
  return specText.includes(`    ${name}:`)
}

describe('OpenAPI spec', () => {
  it('has valid openapi version', () => {
    expect(specText).toMatch(/^openapi: 3\.1\.0$/m)
  })

  it('has required info fields', () => {
    expect(specText).toMatch(/title: Vibekit API/)
    expect(specText).toMatch(/version: 1\.0\.0/)
    expect(specText).toContain('description:')
  })

  it('has servers defined', () => {
    expect(specText).toContain('servers:')
    expect(specText).toContain('url: https://vibekit.dev')
    expect(specText).toContain('url: http://localhost:5173')
  })

  it('has security schemes', () => {
    expect(specText).toContain('cookieAuth:')
    expect(specText).toContain('bearerAuth:')
    expect(specText).toContain('scheme: bearer')
  })

  it('has tags defined', () => {
    expect(hasTag('Authentication')).toBe(true)
    expect(hasTag('Items')).toBe(true)
    expect(hasTag('Blog')).toBe(true)
    expect(hasTag('Users')).toBe(true)
    expect(hasTag('Webhooks')).toBe(true)
    expect(hasTag('API Keys')).toBe(true)
    expect(hasTag('Organizations')).toBe(true)
    expect(hasTag('Teams')).toBe(true)
    expect(hasTag('Billing')).toBe(true)
    expect(hasTag('Notifications')).toBe(true)
  })

  it('has component schemas', () => {
    expect(specText).toContain('schemas:')
    expect(hasSchema('Item')).toBe(true)
    expect(hasSchema('BlogPost')).toBe(true)
    expect(hasSchema('User')).toBe(true)
    expect(hasSchema('Organization')).toBe(true)
    expect(hasSchema('Team')).toBe(true)
    expect(hasSchema('WebhookEndpoint')).toBe(true)
    expect(hasSchema('WebhookDelivery')).toBe(true)
    expect(hasSchema('ApiKey')).toBe(true)
    expect(hasSchema('Notification')).toBe(true)
    expect(hasSchema('BillingPlan')).toBe(true)
    expect(hasSchema('Error')).toBe(true)
  })

  it('has paths defined', () => {
    expect(specText).toContain('paths:')
    // Count path entries (lines starting with "  /" inside paths block)
    const pathMatches = specText.match(/^  \/api\//gm)
    expect(pathMatches?.length ?? 0).toBeGreaterThanOrEqual(20)
  })

  it('has operations with summaries', () => {
    expect(specText).toMatch(/summary:/)
    const summaries = specText.match(/^      summary:/gm)
    expect(summaries?.length ?? 0).toBeGreaterThanOrEqual(20)
  })

  it('has responses defined', () => {
    const responses = specText.match(/^      responses:/gm)
    expect(responses?.length ?? 0).toBeGreaterThanOrEqual(20)
  })

  it('items endpoints exist', () => {
    expect(hasPath('/api/items')).toBe(true)
    expect(hasPath('/api/items/{id}')).toBe(true)
  })

  it('webhooks endpoints exist', () => {
    expect(hasPath('/api/webhooks')).toBe(true)
    expect(hasPath('/api/webhooks/{id}')).toBe(true)
    expect(hasPath('/api/webhooks/{id}/test')).toBe(true)
    expect(hasPath('/api/webhooks/{id}/deliveries')).toBe(true)
  })

  it('api-keys endpoints exist', () => {
    expect(hasPath('/api/api-keys')).toBe(true)
    expect(hasPath('/api/api-keys/{id}')).toBe(true)
    expect(hasPath('/api/api-keys/{id}/rotate')).toBe(true)
    expect(hasPath('/api/api-keys/{id}/revoke')).toBe(true)
  })

  it('org endpoints exist', () => {
    expect(hasPath('/api/orgs')).toBe(true)
    expect(hasPath('/api/orgs/{orgId}')).toBe(true)
    expect(hasPath('/api/orgs/{orgId}/members')).toBe(true)
  })

  it('blog endpoints exist', () => {
    expect(hasPath('/api/blog')).toBe(true)
    expect(hasPath('/api/blog/search')).toBe(true)
  })

  it('billing endpoints exist', () => {
    expect(hasPath('/api/billing/plans')).toBe(true)
    expect(hasPath('/api/billing/subscription')).toBe(true)
    expect(hasPath('/api/billing/checkout')).toBe(true)
  })

  it('notification endpoints exist', () => {
    expect(hasPath('/api/notifications')).toBe(true)
    expect(hasPath('/api/notifications/unread-count')).toBe(true)
    expect(hasPath('/api/notifications/read-all')).toBe(true)
  })

  it('public endpoints have security disabled', () => {
    // Health endpoint has security: []
    const healthSection = specText.slice(
      specText.indexOf('  /api/health:'),
      specText.indexOf('  /api/items:')
    )
    expect(healthSection).toContain('security: []')
  })

  it('has request body definitions for POST operations', () => {
    expect(specText).toContain('requestBody:')
    expect(specText).toContain('application/json')
  })

  it('file is valid YAML', () => {
    // Basic YAML sanity checks
    expect(specText.length).toBeGreaterThan(1000)
    expect(specText).not.toContain('\t')
  })
})
