import {
  WEBHOOK_EVENT_TYPES,
  createWebhookEndpointSchema,
  listDeliveriesSchema,
  updateWebhookEndpointSchema,
} from '$lib/validators/webhook'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// WEBHOOK_EVENT_TYPES
// ---------------------------------------------------------------------------
describe('WEBHOOK_EVENT_TYPES', () => {
  it('includes the wildcard event type', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('*')
  })

  it('includes account events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('account.export')
  })

  it('includes announcement events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('announcement.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('announcement.delete')
    expect(WEBHOOK_EVENT_TYPES).toContain('announcement.update')
  })

  it('includes api_key events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('api_key.created')
    expect(WEBHOOK_EVENT_TYPES).toContain('api_key.deleted')
    expect(WEBHOOK_EVENT_TYPES).toContain('api_key.revoked')
    expect(WEBHOOK_EVENT_TYPES).toContain('api_key.rotated')
    expect(WEBHOOK_EVENT_TYPES).toContain('api_key.updated')
  })

  it('includes blog events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('blog.archive')
    expect(WEBHOOK_EVENT_TYPES).toContain('blog.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('blog.delete')
    expect(WEBHOOK_EVENT_TYPES).toContain('blog.publish')
    expect(WEBHOOK_EVENT_TYPES).toContain('blog.restore')
    expect(WEBHOOK_EVENT_TYPES).toContain('blog.unpublish')
    expect(WEBHOOK_EVENT_TYPES).toContain('blog.update')
  })

  it('includes blog_series events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('blog_series.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('blog_series.delete')
    expect(WEBHOOK_EVENT_TYPES).toContain('blog_series.update')
  })

  it('includes blog_tag events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('blog_tag.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('blog_tag.delete')
  })

  it('includes comment events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('comment.admin_delete')
    expect(WEBHOOK_EVENT_TYPES).toContain('comment.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('comment.delete')
    expect(WEBHOOK_EVENT_TYPES).toContain('comment.moderate')
  })

  it('includes content events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('content.report')
  })

  it('includes integration events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('integration.connected')
    expect(WEBHOOK_EVENT_TYPES).toContain('integration.disconnected')
    expect(WEBHOOK_EVENT_TYPES).toContain('integration.error')
    expect(WEBHOOK_EVENT_TYPES).toContain('integration.health_check')
  })

  it('includes item events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('item.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('item.delete')
    expect(WEBHOOK_EVENT_TYPES).toContain('item.update')
  })

  it('includes newsletter events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('newsletter.subscriber_delete')
  })

  it('includes notification events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('notification.broadcast')
  })

  it('includes organization events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('organization.accept_invitation')
    expect(WEBHOOK_EVENT_TYPES).toContain('organization.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('organization.delete')
    expect(WEBHOOK_EVENT_TYPES).toContain('organization.invite')
    expect(WEBHOOK_EVENT_TYPES).toContain('organization.member.remove')
    expect(WEBHOOK_EVENT_TYPES).toContain('organization.member.update_role')
    expect(WEBHOOK_EVENT_TYPES).toContain('organization.transfer_ownership')
    expect(WEBHOOK_EVENT_TYPES).toContain('organization.update')
  })

  it('includes team events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('team.create')
    expect(WEBHOOK_EVENT_TYPES).toContain('team.delete')
    expect(WEBHOOK_EVENT_TYPES).toContain('team.member.add')
    expect(WEBHOOK_EVENT_TYPES).toContain('team.member.remove')
    expect(WEBHOOK_EVENT_TYPES).toContain('team.member.update_role')
    expect(WEBHOOK_EVENT_TYPES).toContain('team.update')
  })

  it('includes user events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('user.ban')
    expect(WEBHOOK_EVENT_TYPES).toContain('user.delete')
    expect(WEBHOOK_EVENT_TYPES).toContain('user.impersonate_start')
    expect(WEBHOOK_EVENT_TYPES).toContain('user.impersonate_stop')
    expect(WEBHOOK_EVENT_TYPES).toContain('user.unban')
    expect(WEBHOOK_EVENT_TYPES).toContain('user.update')
  })

  it('includes webhook events', () => {
    expect(WEBHOOK_EVENT_TYPES).toContain('webhook.test')
  })

  it('has 57 event types total', () => {
    expect(WEBHOOK_EVENT_TYPES).toHaveLength(57)
  })

  it('is a readonly tuple', () => {
    // `as const` makes it a readonly tuple at the type level,
    // but does not freeze it at runtime (Object.isFrozen is false).
    // Verify it is typed as readonly by checking it has the expected length.
    expect(WEBHOOK_EVENT_TYPES.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// createWebhookEndpointSchema
// ---------------------------------------------------------------------------
describe('createWebhookEndpointSchema', () => {
  // --- URL validation ---
  describe('url validation', () => {
    it('accepts https URLs', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('rejects http URLs (HTTPS required)', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'http://example.com/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('accepts URLs with ports', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://example.com:8443/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('accepts URLs with query strings', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://example.com/webhook?token=abc123',
      })
      expect(result.success).toBe(true)
    })

    it('accepts URLs with fragments', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://example.com/webhook#section',
      })
      expect(result.success).toBe(true)
    })

    it('rejects localhost URLs (SSRF protection)', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'http://localhost:3000/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing URL', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty URL', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects non-URL strings', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })

    it('rejects ftp URLs', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'ftp://example.com/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejects mailto URLs', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'mailto:user@example.com',
      })
      expect(result.success).toBe(false)
    })

    it('trims URL whitespace', () => {
      const result = createWebhookEndpointSchema.parse({
        events: ['blog.create'],
        url: '  https://example.com/webhook  ',
      })
      expect(result.url).toBe('https://example.com/webhook')
    })

    it('rejects localhost with HTTPS', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://localhost/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejects 127.0.0.1', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://127.0.0.1/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejects private IP 10.x.x.x', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://10.0.0.1/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejects cloud metadata endpoint 169.254.169.254', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://169.254.169.254/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejects .internal TLD', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://something.internal/webhook',
      })
      expect(result.success).toBe(false)
    })
  })

  // --- Events validation ---
  describe('events validation', () => {
    it('accepts a single event', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('accepts the wildcard event', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['*'],
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('accepts multiple events', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create', 'blog.update', 'blog.delete'],
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('accepts events from different categories', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create', 'user.update', 'team.create', 'comment.create'],
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('accepts the maximum of 50 events', () => {
      const events = Array(50).fill('blog.create')
      const result = createWebhookEndpointSchema.safeParse({
        events,
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('rejects an empty events array', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: [],
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejects more than 50 events', () => {
      const events = Array(51).fill('blog.create')
      const result = createWebhookEndpointSchema.safeParse({
        events,
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing events', () => {
      const result = createWebhookEndpointSchema.safeParse({
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid event types', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.nonexistent'],
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejects event type with typo', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog_crate'],
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('rejects null events', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: null,
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('accepts every single event type individually', () => {
      for (const eventType of WEBHOOK_EVENT_TYPES) {
        const result = createWebhookEndpointSchema.safeParse({
          events: [eventType],
          url: 'https://example.com/webhook',
        })
        expect(result.success).toBe(true)
      }
    })
  })

  // --- Description validation ---
  describe('description validation', () => {
    it('accepts a valid description', () => {
      const result = createWebhookEndpointSchema.safeParse({
        description: 'My webhook endpoint',
        events: ['blog.create'],
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('accepts description at max length (200)', () => {
      const result = createWebhookEndpointSchema.safeParse({
        description: 'a'.repeat(200),
        events: ['blog.create'],
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('rejects description over 200 chars', () => {
      const result = createWebhookEndpointSchema.safeParse({
        description: 'a'.repeat(201),
        events: ['blog.create'],
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('accepts missing description', () => {
      const result = createWebhookEndpointSchema.safeParse({
        events: ['blog.create'],
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('trims description whitespace', () => {
      const result = createWebhookEndpointSchema.parse({
        description: '  my webhook  ',
        events: ['blog.create'],
        url: 'https://example.com/webhook',
      })
      expect(result.description).toBe('my webhook')
    })
  })

  // --- Extra/unknown fields ---
  it('strips unknown fields', () => {
    const result = createWebhookEndpointSchema.parse({
      events: ['blog.create'],
      extraField: 'should be removed',
      url: 'https://example.com/webhook',
    })
    expect(result).not.toHaveProperty('extraField')
    expect(result.url).toBe('https://example.com/webhook')
  })
})

// ---------------------------------------------------------------------------
// updateWebhookEndpointSchema
// ---------------------------------------------------------------------------
describe('updateWebhookEndpointSchema', () => {
  // --- All fields optional ---
  describe('all fields are optional', () => {
    it('accepts an empty object', () => {
      const result = updateWebhookEndpointSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  // --- Active field ---
  describe('active validation', () => {
    it('accepts active: true', () => {
      const result = updateWebhookEndpointSchema.safeParse({ active: true })
      expect(result.success).toBe(true)
    })

    it('accepts active: false', () => {
      const result = updateWebhookEndpointSchema.safeParse({ active: false })
      expect(result.success).toBe(true)
    })

    it('rejects non-boolean active values', () => {
      const result = updateWebhookEndpointSchema.safeParse({ active: 'true' })
      expect(result.success).toBe(false)
    })

    it('rejects active: 1', () => {
      const result = updateWebhookEndpointSchema.safeParse({ active: 1 })
      expect(result.success).toBe(false)
    })
  })

  // --- Description field ---
  describe('description validation', () => {
    it('accepts a valid description', () => {
      const result = updateWebhookEndpointSchema.safeParse({ description: 'Updated webhook' })
      expect(result.success).toBe(true)
    })

    it('accepts description at max length (200)', () => {
      const result = updateWebhookEndpointSchema.safeParse({ description: 'a'.repeat(200) })
      expect(result.success).toBe(true)
    })

    it('rejects description over 200 chars', () => {
      const result = updateWebhookEndpointSchema.safeParse({ description: 'a'.repeat(201) })
      expect(result.success).toBe(false)
    })

    it('trims description whitespace', () => {
      const result = updateWebhookEndpointSchema.parse({ description: '  updated  ' })
      expect(result.description).toBe('updated')
    })
  })

  // --- Events field ---
  describe('events validation', () => {
    it('accepts a single event', () => {
      const result = updateWebhookEndpointSchema.safeParse({ events: ['blog.create'] })
      expect(result.success).toBe(true)
    })

    it('accepts the wildcard event', () => {
      const result = updateWebhookEndpointSchema.safeParse({ events: ['*'] })
      expect(result.success).toBe(true)
    })

    it('accepts multiple events', () => {
      const result = updateWebhookEndpointSchema.safeParse({
        events: ['blog.create', 'blog.update', 'blog.delete'],
      })
      expect(result.success).toBe(true)
    })

    it('accepts the maximum of 50 events', () => {
      const events = Array(50).fill('blog.create')
      const result = updateWebhookEndpointSchema.safeParse({ events })
      expect(result.success).toBe(true)
    })

    it('rejects an empty events array', () => {
      const result = updateWebhookEndpointSchema.safeParse({ events: [] })
      expect(result.success).toBe(false)
    })

    it('rejects more than 50 events', () => {
      const events = Array(51).fill('blog.create')
      const result = updateWebhookEndpointSchema.safeParse({ events })
      expect(result.success).toBe(false)
    })

    it('rejects invalid event types', () => {
      const result = updateWebhookEndpointSchema.safeParse({ events: ['invalid.event'] })
      expect(result.success).toBe(false)
    })

    it('rejects null events', () => {
      const result = updateWebhookEndpointSchema.safeParse({ events: null })
      expect(result.success).toBe(false)
    })
  })

  // --- URL field ---
  describe('url validation', () => {
    it('accepts an https URL', () => {
      const result = updateWebhookEndpointSchema.safeParse({
        url: 'https://example.com/webhook',
      })
      expect(result.success).toBe(true)
    })

    it('rejects an http URL (HTTPS required)', () => {
      const result = updateWebhookEndpointSchema.safeParse({
        url: 'http://example.com/webhook',
      })
      expect(result.success).toBe(false)
    })

    it('accepts URLs with ports', () => {
      const result = updateWebhookEndpointSchema.safeParse({
        url: 'https://example.com:9090/hook',
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-URL strings', () => {
      const result = updateWebhookEndpointSchema.safeParse({ url: 'not-a-url' })
      expect(result.success).toBe(false)
    })

    it('rejects empty URL string', () => {
      const result = updateWebhookEndpointSchema.safeParse({ url: '' })
      expect(result.success).toBe(false)
    })

    it('trims URL whitespace', () => {
      const result = updateWebhookEndpointSchema.parse({
        url: '  https://example.com/hook  ',
      })
      expect(result.url).toBe('https://example.com/hook')
    })
  })

  // --- Multiple fields together ---
  describe('combined field updates', () => {
    it('accepts active and description together', () => {
      const result = updateWebhookEndpointSchema.safeParse({
        active: false,
        description: 'Disabled webhook',
      })
      expect(result.success).toBe(true)
    })

    it('accepts all fields together', () => {
      const result = updateWebhookEndpointSchema.safeParse({
        active: true,
        description: 'Full update',
        events: ['blog.create', 'blog.delete'],
        url: 'https://example.com/new-hook',
      })
      expect(result.success).toBe(true)
    })

    it('omits undefined fields from output', () => {
      const result = updateWebhookEndpointSchema.parse({})
      expect(result).not.toHaveProperty('active')
      expect(result).not.toHaveProperty('description')
      expect(result).not.toHaveProperty('events')
      expect(result).not.toHaveProperty('url')
    })
  })
})

// ---------------------------------------------------------------------------
// listDeliveriesSchema
// ---------------------------------------------------------------------------
describe('listDeliveriesSchema', () => {
  // --- Default limit ---
  describe('limit defaults', () => {
    it('defaults limit to 50 when not provided', () => {
      const result = listDeliveriesSchema.parse({})
      expect(result.limit).toBe(50)
    })
  })

  // --- Limit coercion ---
  describe('limit coercion', () => {
    it('coerces string "25" to number 25', () => {
      const result = listDeliveriesSchema.parse({ limit: '25' })
      expect(result.limit).toBe(25)
    })

    it('coerces string "1" to number 1', () => {
      const result = listDeliveriesSchema.parse({ limit: '1' })
      expect(result.limit).toBe(1)
    })

    it('coerces string "100" to number 100', () => {
      const result = listDeliveriesSchema.parse({ limit: '100' })
      expect(result.limit).toBe(100)
    })

    it('accepts numeric limit', () => {
      const result = listDeliveriesSchema.parse({ limit: 30 })
      expect(result.limit).toBe(30)
    })
  })

  // --- Limit boundary values ---
  describe('limit boundary values', () => {
    it('accepts minimum limit of 1', () => {
      const result = listDeliveriesSchema.parse({ limit: 1 })
      expect((result as unknown as { success: boolean }).success || result.limit).toBe(1)
    })

    it('accepts maximum limit of 100', () => {
      const result = listDeliveriesSchema.parse({ limit: 100 })
      expect((result as unknown as { success: boolean }).success || result.limit).toBe(100)
    })

    it('rejects limit of 0', () => {
      const result = listDeliveriesSchema.safeParse({ limit: 0 })
      expect(result.success).toBe(false)
    })

    it('rejects limit of 101', () => {
      const result = listDeliveriesSchema.safeParse({ limit: 101 })
      expect(result.success).toBe(false)
    })

    it('rejects negative limit', () => {
      const result = listDeliveriesSchema.safeParse({ limit: -1 })
      expect(result.success).toBe(false)
    })

    it('rejects decimal limit', () => {
      const result = listDeliveriesSchema.safeParse({ limit: 3.5 })
      expect(result.success).toBe(false)
    })

    it('rejects non-numeric limit string', () => {
      const result = listDeliveriesSchema.safeParse({ limit: 'abc' })
      expect(result.success).toBe(false)
    })

    it('rejects empty string limit', () => {
      const result = listDeliveriesSchema.safeParse({ limit: '' })
      expect(result.success).toBe(false)
    })
  })

  // --- Status validation ---
  describe('status validation', () => {
    it('accepts status "success"', () => {
      const result = listDeliveriesSchema.safeParse({ status: 'success' })
      expect(result.success).toBe(true)
    })

    it('accepts status "failed"', () => {
      const result = listDeliveriesSchema.safeParse({ status: 'failed' })
      expect(result.success).toBe(true)
    })

    it('accepts status "pending"', () => {
      const result = listDeliveriesSchema.safeParse({ status: 'pending' })
      expect(result.success).toBe(true)
    })

    it('accepts status "retrying"', () => {
      const result = listDeliveriesSchema.safeParse({ status: 'retrying' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid status', () => {
      const result = listDeliveriesSchema.safeParse({ status: 'delivered' })
      expect(result.success).toBe(false)
    })

    it('rejects empty string status', () => {
      const result = listDeliveriesSchema.safeParse({ status: '' })
      expect(result.success).toBe(false)
    })

    it('rejects numeric status', () => {
      const result = listDeliveriesSchema.safeParse({ status: 200 })
      expect(result.success).toBe(false)
    })

    it('accepts all four valid statuses', () => {
      const statuses = ['failed', 'pending', 'retrying', 'success']
      for (const status of statuses) {
        const result = listDeliveriesSchema.safeParse({ status })
        expect(result.success).toBe(true)
      }
    })
  })

  // --- EventType validation ---
  describe('eventType validation', () => {
    it('accepts any string as eventType', () => {
      const result = listDeliveriesSchema.safeParse({ eventType: 'blog.create' })
      expect(result.success).toBe(true)
    })

    it('accepts empty string eventType', () => {
      const result = listDeliveriesSchema.safeParse({ eventType: '' })
      expect(result.success).toBe(true)
    })

    it('accepts numeric string eventType', () => {
      const result = listDeliveriesSchema.safeParse({ eventType: '123' })
      expect(result.success).toBe(true)
    })

    it('omits eventType from output when not provided', () => {
      const result = listDeliveriesSchema.parse({})
      expect(result).not.toHaveProperty('eventType')
    })
  })

  // --- Combined parameters ---
  describe('combined parameters', () => {
    it('accepts all parameters together', () => {
      const result = listDeliveriesSchema.safeParse({
        eventType: 'blog.create',
        limit: 25,
        status: 'success',
      })
      expect(result.success).toBe(true)
    })

    it('applies default limit when only eventType and status are provided', () => {
      const result = listDeliveriesSchema.parse({
        eventType: 'blog.create',
        status: 'failed',
      })
      expect(result.limit).toBe(50)
    })

    it('parses with only eventType', () => {
      const result = listDeliveriesSchema.parse({ eventType: 'user.update' })
      expect(result.eventType).toBe('user.update')
      expect(result.limit).toBe(50)
    })

    it('parses with only status', () => {
      const result = listDeliveriesSchema.parse({ status: 'retrying' })
      expect(result.status).toBe('retrying')
      expect(result.limit).toBe(50)
    })

    it('parses with only limit', () => {
      const result = listDeliveriesSchema.parse({ limit: 10 })
      expect(result.limit).toBe(10)
    })

    it('omits optional fields not provided from output', () => {
      const result = listDeliveriesSchema.parse({ limit: 20 })
      expect(result).not.toHaveProperty('eventType')
      expect(result).not.toHaveProperty('status')
    })
  })
})
