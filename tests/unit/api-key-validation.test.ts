import { describe, expect, it } from 'vitest'

describe('api key validators', () => {
  it('createApiKeySchema accepts valid input', async () => {
    const { createApiKeySchema } = await import('$lib/validators/api-key')
    const result = createApiKeySchema.safeParse({
      name: 'Production Key',
      scopes: ['read:items', 'write:items'],
    })
    expect(result.success).toBe(true)
  })

  it('createApiKeySchema accepts with optional fields', async () => {
    const { createApiKeySchema } = await import('$lib/validators/api-key')
    const result = createApiKeySchema.safeParse({
      expiresAt: 1735689600,
      name: 'Key with Options',
      rateLimit: 100,
      scopes: ['admin'],
    })
    expect(result.success).toBe(true)
  })

  it('createApiKeySchema rejects empty name', async () => {
    const { createApiKeySchema } = await import('$lib/validators/api-key')
    const result = createApiKeySchema.safeParse({ name: '', scopes: ['read:items'] })
    expect(result.success).toBe(false)
  })

  it('createApiKeySchema rejects name over 100 chars', async () => {
    const { createApiKeySchema } = await import('$lib/validators/api-key')
    const result = createApiKeySchema.safeParse({ name: 'k'.repeat(101), scopes: ['read:items'] })
    expect(result.success).toBe(false)
  })

  it('createApiKeySchema rejects empty scopes', async () => {
    const { createApiKeySchema } = await import('$lib/validators/api-key')
    const result = createApiKeySchema.safeParse({ name: 'Valid', scopes: [] })
    expect(result.success).toBe(false)
  })

  it('createApiKeySchema rejects invalid scope', async () => {
    const { createApiKeySchema } = await import('$lib/validators/api-key')
    const result = createApiKeySchema.safeParse({ name: 'Valid', scopes: ['superadmin'] })
    expect(result.success).toBe(false)
  })

  it('createApiKeySchema rejects rateLimit over 10000', async () => {
    const { createApiKeySchema } = await import('$lib/validators/api-key')
    const result = createApiKeySchema.safeParse({
      name: 'Valid',
      rateLimit: 10_001,
      scopes: ['read:items'],
    })
    expect(result.success).toBe(false)
  })

  it('updateApiKeySchema accepts partial input', async () => {
    const { updateApiKeySchema } = await import('$lib/validators/api-key')
    const result = updateApiKeySchema.safeParse({ name: 'Updated' })
    expect(result.success).toBe(true)
  })

  it('rotateApiKeySchema accepts valid id', async () => {
    const { rotateApiKeySchema } = await import('$lib/validators/api-key')
    const result = rotateApiKeySchema.safeParse({ id: 'key-123' })
    expect(result.success).toBe(true)
  })

  it('rotateApiKeySchema rejects empty id', async () => {
    const { rotateApiKeySchema } = await import('$lib/validators/api-key')
    const result = rotateApiKeySchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
  })
})

describe('webhook validators', () => {
  it('createWebhookEndpointSchema accepts valid input', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      events: ['item.create'],
      url: 'https://example.com/webhook',
    })
    expect(result.success).toBe(true)
  })

  it('createWebhookEndpointSchema rejects http url', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      events: ['blog.create'],
      url: 'http://localhost:3000/hooks',
    })
    expect(result.success).toBe(false)
  })

  it('createWebhookEndpointSchema accepts wildcard event', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      events: ['*'],
      url: 'https://example.com/webhook',
    })
    expect(result.success).toBe(true)
  })

  it('createWebhookEndpointSchema rejects empty url', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      events: ['item.create'],
      url: '',
    })
    expect(result.success).toBe(false)
  })

  it('createWebhookEndpointSchema rejects non-http url', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      events: ['item.create'],
      url: 'ftp://example.com',
    })
    expect(result.success).toBe(false)
  })

  it('createWebhookEndpointSchema rejects localhost', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      events: ['item.create'],
      url: 'https://localhost/webhook',
    })
    expect(result.success).toBe(false)
  })

  it('createWebhookEndpointSchema rejects private IP', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      events: ['item.create'],
      url: 'https://10.0.0.1/webhook',
    })
    expect(result.success).toBe(false)
  })

  it('createWebhookEndpointSchema rejects cloud metadata', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      events: ['item.create'],
      url: 'https://169.254.169.254/webhook',
    })
    expect(result.success).toBe(false)
  })

  it('createWebhookEndpointSchema rejects .internal TLD', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      events: ['item.create'],
      url: 'https://something.internal/webhook',
    })
    expect(result.success).toBe(false)
  })

  it('createWebhookEndpointSchema rejects empty events', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      events: [],
      url: 'https://example.com/webhook',
    })
    expect(result.success).toBe(false)
  })

  it('createWebhookEndpointSchema rejects invalid event type', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      events: ['invalid.event'],
      url: 'https://example.com/webhook',
    })
    expect(result.success).toBe(false)
  })

  it('createWebhookEndpointSchema accepts with optional description', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      description: 'My webhook',
      events: ['item.create'],
      url: 'https://example.com/webhook',
    })
    expect(result.success).toBe(true)
  })

  it('createWebhookEndpointSchema rejects description over 200 chars', async () => {
    const { createWebhookEndpointSchema } = await import('$lib/validators/webhook')
    const result = createWebhookEndpointSchema.safeParse({
      description: 'd'.repeat(201),
      events: ['item.create'],
      url: 'https://example.com/webhook',
    })
    expect(result.success).toBe(false)
  })

  it('listDeliveriesSchema applies defaults', async () => {
    const { listDeliveriesSchema } = await import('$lib/validators/webhook')
    const result = listDeliveriesSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(50)
    }
  })

  it('listDeliveriesSchema validates status enum', async () => {
    const { listDeliveriesSchema } = await import('$lib/validators/webhook')
    const result = listDeliveriesSchema.safeParse({ status: 'invalid' })
    expect(result.success).toBe(false)
  })
})
