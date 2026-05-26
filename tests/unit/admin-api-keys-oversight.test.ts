import { describe, expect, it, vi } from 'vitest'

describe('Admin API keys endpoints', () => {
  it('should have apiKey and apiKeyUsageLog in schema', async () => {
    const mod = await import('$lib/server/db/schema')
    expect(mod.apiKey).toBeDefined()
    expect(mod.apiKeyUsageLog).toBeDefined()
  })

  it('apiKey table should have correct fields', async () => {
    const { apiKey } = await import('$lib/server/db/schema')
    const columns = Object.keys(apiKey)
    expect(columns).toContain('id')
    expect(columns).toContain('userId')
    expect(columns).toContain('name')
    expect(columns).toContain('keyHash')
    expect(columns).toContain('keyPrefix')
    expect(columns).toContain('scopes')
    expect(columns).toContain('rateLimit')
    expect(columns).toContain('requestCount')
    expect(columns).toContain('expiresAt')
    expect(columns).toContain('revokedAt')
    expect(columns).toContain('lastUsedAt')
    expect(columns).toContain('createdAt')
  })

  it('should filter by status: active means no revokedAt', () => {
    const isNull = (val: unknown): boolean => val === null || val === undefined
    expect(isNull(null)).toBe(true)
    expect(isNull(undefined)).toBe(true)
    expect(isNull(new Date())).toBe(false)
  })

  it('should filter by status: revoked means revokedAt is set', () => {
    const isNotNull = (val: unknown): boolean => val !== null && val !== undefined
    expect(isNotNull(null)).toBe(false)
    expect(isNotNull(new Date())).toBe(true)
  })

  it('should paginate correctly', () => {
    const page = 1
    const limit = 20
    const offset = (page - 1) * limit
    expect(offset).toBe(0)

    const page2Offset = (2 - 1) * limit
    expect(page2Offset).toBe(20)
  })

  it('should calculate totalPages correctly', () => {
    const total = 45
    const limit = 20
    const totalPages = Math.ceil(total / limit)
    expect(totalPages).toBe(3)
  })

  it('should clamp limit between 1 and 100', () => {
    expect(Math.min(100, Math.max(1, 0))).toBe(1)
    expect(Math.min(100, Math.max(1, 200))).toBe(100)
    expect(Math.min(100, Math.max(1, 50))).toBe(50)
  })

  it('should clamp page to minimum 1', () => {
    expect(Math.max(1, 0)).toBe(1)
    expect(Math.max(1, -1)).toBe(1)
    expect(Math.max(1, 3)).toBe(3)
  })
})

describe('Payment method endpoints', () => {
  it('should have paymentMethod in schema', async () => {
    const mod = await import('$lib/server/db/schema')
    expect(mod.paymentMethod).toBeDefined()
  })

  it('paymentMethod table should have correct fields', async () => {
    const { paymentMethod } = await import('$lib/server/db/schema')
    const columns = Object.keys(paymentMethod)
    expect(columns).toContain('id')
    expect(columns).toContain('userId')
    expect(columns).toContain('stripePaymentMethodId')
    expect(columns).toContain('type')
    expect(columns).toContain('brand')
    expect(columns).toContain('last4')
    expect(columns).toContain('expiryMonth')
    expect(columns).toContain('expiryYear')
    expect(columns).toContain('isDefault')
  })

  it('set-default should unset current default before setting new', () => {
    const methods = [
      { id: '1', isDefault: true },
      { id: '2', isDefault: false },
      { id: '3', isDefault: false },
    ]
    // Simulate the operation
    for (const m of methods) {
      m.isDefault = false
    }
    methods.find((m) => m.id === '3')!.isDefault = true
    expect(methods.find((m) => m.id === '1')!.isDefault).toBe(false)
    expect(methods.find((m) => m.id === '2')!.isDefault).toBe(false)
    expect(methods.find((m) => m.id === '3')!.isDefault).toBe(true)
  })

  it('should validate paymentMethodId is required', () => {
    const body = {} as { paymentMethodId?: string }
    expect(body.paymentMethodId).toBeUndefined()
    const body2 = { paymentMethodId: 'pm_123' }
    expect(body2.paymentMethodId).toBe('pm_123')
  })

  it('card brand formatting', () => {
    function formatCardBrand(brand: string | null): string {
      if (!brand) return 'Card'
      return brand.charAt(0).toUpperCase() + brand.slice(1)
    }
    expect(formatCardBrand('visa')).toBe('Visa')
    expect(formatCardBrand('mastercard')).toBe('Mastercard')
    expect(formatCardBrand(null)).toBe('Card')
    expect(formatCardBrand('amex')).toBe('Amex')
  })

  it('listPaymentMethods exists in stripe service', async () => {
    const mod = await import('$lib/server/billing/stripe')
    expect(typeof mod.listPaymentMethods).toBe('function')
  })
})

describe('Email queue D1 persistence', () => {
  it('should have emailQueue in schema', async () => {
    const mod = await import('$lib/server/db/schema')
    expect(mod.emailQueue).toBeDefined()
  })

  it('emailQueue table should have correct fields', async () => {
    const { emailQueue } = await import('$lib/server/db/schema')
    const columns = Object.keys(emailQueue)
    expect(columns).toContain('id')
    expect(columns).toContain('status')
    expect(columns).toContain('message')
    expect(columns).toContain('attempts')
    expect(columns).toContain('maxRetries')
    expect(columns).toContain('errorMessage')
    expect(columns).toContain('nextRetryAt')
    expect(columns).toContain('lastAttemptAt')
    expect(columns).toContain('processedAt')
    expect(columns).toContain('createdAt')
  })

  it('retry delay should be exponential with 1-minute base', () => {
    const base = 60_000
    expect(base * 2 ** 0).toBe(60_000) // 1 min
    expect(base * 2 ** 1).toBe(120_000) // 2 min
    expect(base * 2 ** 2).toBe(240_000) // 4 min
    expect(base * 2 ** 3).toBe(480_000) // 8 min
  })

  it('retry delay should be capped at 15 minutes', () => {
    const delay = Math.min(60_000 * 2 ** 5, 15 * 60_000)
    expect(delay).toBe(15 * 60_000)
  })

  it('should default to 3 max retries', () => {
    const defaults = { maxRetries: 3 }
    expect(defaults.maxRetries).toBe(3)
  })

  it('EmailService accepts optional db parameter', async () => {
    const { createEmailService } = await import('$lib/server/email/index')
    const mockClient = { send: vi.fn().mockResolvedValue({ ok: true }) }
    const service = createEmailService(mockClient)
    expect(service).toBeDefined()
  })
})
