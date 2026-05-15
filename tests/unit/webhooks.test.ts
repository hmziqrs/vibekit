import { describe, expect, it, vi } from 'vitest'

vi.mock('$lib/server/db/schema', () => ({
  webhookDelivery: {
    attemptCount: 'attempt_count',
    createdAt: 'created_at',
    endpointId: 'endpoint_id',
    eventType: 'event_type',
    id: 'id',
    nextRetryAt: 'next_retry_at',
    payload: 'payload',
    responseBody: 'response_body',
    status: 'status',
    statusCode: 'status_code',
    updatedAt: 'updated_at',
  },
  webhookEndpoint: {
    active: 'active',
    createdAt: 'created_at',
    description: 'description',
    events: 'events',
    id: 'id',
    secret: 'secret',
    updatedAt: 'updated_at',
    url: 'url',
    userId: 'user_id',
  },
}))

vi.mock<typeof import('$lib/server/uuid')>(import('$lib/server/uuid'), () => ({
  uuid: () => `test-uuid-${Math.random().toString(36).slice(2, 8)}`,
}))

import { generateSecret, hmacSign } from '$lib/server/webhooks'
import {
  WEBHOOK_EVENT_TYPES,
  createWebhookEndpointSchema,
  listDeliveriesSchema,
  updateWebhookEndpointSchema,
} from '$lib/validators/webhook'

describe('webhook validators', () => {
  describe('createWebhookEndpointSchema', () => {
    it('validates correct input', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create', 'blog.update'],
        url: 'https://example.com/webhooks',
      })
      expect(result.success).toBeTruthy()
    })

    it('validates with description', () => {
      const result = createWebhookEndpointSchema.safeParse({
        description: 'My webhook',
        events: ['*'],
        url: 'https://example.com/webhooks',
      })
      expect(result.success).toBeTruthy()
    })

    it('rejects empty url', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: '',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects invalid url', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'not-a-url',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects url without protocol', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'example.com/webhooks',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects empty events', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: [],
        url: 'https://example.com/webhooks',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects invalid event type', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['invalid.event'],
        url: 'https://example.com/webhooks',
      })
      expect(result.success).toBeFalsy()
    })

    it('accepts wildcard event', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['*'],
        url: 'https://example.com/webhooks',
      })
      expect(result.success).toBeTruthy()
    })

    it('rejects http url (HTTPS required)', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'http://localhost:3000/webhooks',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects localhost with HTTPS', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://localhost/webhooks',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects 127.0.0.1', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://127.0.0.1/webhooks',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects private IP 10.x.x.x', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://10.0.0.1/webhooks',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects cloud metadata endpoint', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://169.254.169.254/webhooks',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects .internal TLD', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://something.internal/webhooks',
      })
      expect(result.success).toBeFalsy()
    })

    it('rejects description over 200 chars', () => {
      const result = createWebhookEndpointSchema.safeParse({
        description: 'a'.repeat(201),
        events: ['blog.create'],
        url: 'https://example.com/webhooks',
      })
      expect(result.success).toBeFalsy()
    })
  })

  describe('updateWebhookEndpointSchema', () => {
    it('allows partial update with url only', () => {
      const result = updateWebhookEndpointSchema.safeParse({
        url: 'https://new-url.com/webhooks',
      })
      expect(result.success).toBeTruthy()
    })

    it('allows updating events', () => {
      const result = updateWebhookEndpointSchema.safeParse({
        events: ['*'],
      })
      expect(result.success).toBeTruthy()
    })

    it('allows toggling active', () => {
      const result = updateWebhookEndpointSchema.safeParse({ active: false })
      expect(result.success).toBeTruthy()
    })

    it('rejects invalid url', () => {
      const result = updateWebhookEndpointSchema.safeParse({ url: 'bad' })
      expect(result.success).toBeFalsy()
    })
  })

  describe('listDeliveriesSchema', () => {
    it('uses default values', () => {
      const result = listDeliveriesSchema.safeParse({})
      expect(result.success).toBeTruthy()
      if (result.success) {
        expect(result.data.limit).toBe(50)
      }
    })

    it('accepts all filters', () => {
      const result = listDeliveriesSchema.safeParse({
        eventType: 'blog.create',
        limit: 25,
        status: 'failed',
      })
      expect(result.success).toBeTruthy()
    })

    it('rejects invalid status', () => {
      const result = listDeliveriesSchema.safeParse({ status: 'invalid' })
      expect(result.success).toBeFalsy()
    })

    it('rejects limit over 100', () => {
      const result = listDeliveriesSchema.safeParse({ limit: 101 })
      expect(result.success).toBeFalsy()
    })
  })
})

describe('webhook event types', () => {
  it('contains all expected event types', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('*')
    expect(WEBHOOK_EVENT_TYPES).toContain('blog.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('blog.update')
    expect(WEBHOOK_EVENT_TYPES).toContain('blog.delete')
    expect(WEBHOOK_EVENT_TYPES).toContain('item.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('comment.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('organization.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('team.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('user.update')
    expect(WEBHOOK_EVENT_TYPES).toContain('api_key.created')
    expect(WEBHOOK_EVENT_TYPES).toContain('webhook.test')
  })

  it('event types are sorted alphabetically', () => {
    const sorted = [...WEBHOOK_EVENT_TYPES].toSorted()
    expect(WEBHOOK_EVENT_TYPES).toStrictEqual(sorted)
  })
})

describe(hmacSign, () => {
  it('produces consistent signatures', async () => {
    const payload = '{"test":true}'
    const secret = 'whsec_abcdef1234567890'
    const ts = 1_700_000_000_000
    const sig1 = await hmacSign(payload, secret, ts)
    const sig2 = await hmacSign(payload, secret, ts)
    expect(sig1).toBe(sig2)
    expect(sig1).toHaveLength(64)
  })

  it('different payloads produce different signatures', async () => {
    const secret = 'whsec_test'
    const ts = 1_700_000_000_000
    const sig1 = await hmacSign('payload1', secret, ts)
    const sig2 = await hmacSign('payload2', secret, ts)
    expect(sig1).not.toBe(sig2)
  })

  it('different timestamps produce different signatures', async () => {
    const secret = 'whsec_test'
    const payload = 'same-payload'
    const sig1 = await hmacSign(payload, secret, 1000)
    const sig2 = await hmacSign(payload, secret, 2000)
    expect(sig1).not.toBe(sig2)
  })
})

describe(generateSecret, () => {
  it('produces secrets with whsec_ prefix', () => {
    const secret = generateSecret()
    expect(secret.startsWith('whsec_')).toBeTruthy()
    // 32 bytes = 64 hex chars + 6 char prefix = 70
    expect(secret).toHaveLength(70)
  })

  it('produces unique secrets', () => {
    const s1 = generateSecret()
    const s2 = generateSecret()
    expect(s1).not.toBe(s2)
  })
})
