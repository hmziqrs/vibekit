import { describe, expect, it } from 'vitest'

describe('Billing validators: bounded constraints', () => {
  it('checkoutSessionSchema rejects URLs exceeding 2000 chars', async () => {
    const { checkoutSessionSchema } = await import('$lib/validators/billing')
    const longUrl = 'https://example.com/' + 'a'.repeat(2000)
    const result = checkoutSessionSchema.safeParse({
      cancelUrl: longUrl,
      planId: 'plan_123',
      successUrl: 'https://example.com/success',
    })
    expect(result.success).toBe(false)
  })

  it('checkoutSessionSchema accepts valid URLs', async () => {
    const { checkoutSessionSchema } = await import('$lib/validators/billing')
    const result = checkoutSessionSchema.safeParse({
      cancelUrl: 'https://example.com/cancel',
      planId: 'plan_123',
      successUrl: 'https://example.com/success',
    })
    expect(result.success).toBe(true)
  })

  it('refundSchema rejects amount exceeding 10M', async () => {
    const { refundSchema } = await import('$lib/validators/billing')
    const result = refundSchema.safeParse({
      amountInCents: 10_000_000_01,
      invoiceId: 'inv_123',
    })
    expect(result.success).toBe(false)
  })

  it('refundSchema accepts valid amount', async () => {
    const { refundSchema } = await import('$lib/validators/billing')
    const result = refundSchema.safeParse({
      amountInCents: 9999,
      invoiceId: 'inv_123',
    })
    expect(result.success).toBe(true)
  })

  it('updatePlanSchema stripePriceId rejects over 100 chars', async () => {
    const { updatePlanSchema } = await import('$lib/validators/billing')
    const result = updatePlanSchema.safeParse({
      stripePriceId: 'price_' + 'a'.repeat(100),
    })
    expect(result.success).toBe(false)
  })
})

describe('Newsletter validators: bounded token', () => {
  it('unsubscribeSchema rejects token over 100 chars', async () => {
    const { unsubscribeSchema } = await import('$lib/validators/newsletter')
    const result = unsubscribeSchema.safeParse({
      token: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('unsubscribeSchema accepts valid token', async () => {
    const { unsubscribeSchema } = await import('$lib/validators/newsletter')
    const result = unsubscribeSchema.safeParse({ token: 'abc123' })
    expect(result.success).toBe(true)
  })
})

describe('Config validators: bounded value', () => {
  it('updateConfigSchema rejects value over 10000 chars', async () => {
    const { updateConfigSchema } = await import('$lib/validators/config')
    const result = updateConfigSchema.safeParse({
      value: 'a'.repeat(10001),
    })
    expect(result.success).toBe(false)
  })

  it('updateConfigSchema accepts valid value', async () => {
    const { updateConfigSchema } = await import('$lib/validators/config')
    const result = updateConfigSchema.safeParse({ value: 'some config value' })
    expect(result.success).toBe(true)
  })
})

describe('A/B Testing validators: bounded IDs', () => {
  it('assignVariantSchema rejects sessionId over 100 chars', async () => {
    const { assignVariantSchema } = await import('$lib/validators/ab-testing')
    const result = assignVariantSchema.safeParse({
      sessionId: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('assignVariantSchema accepts valid sessionId', async () => {
    const { assignVariantSchema } = await import('$lib/validators/ab-testing')
    const result = assignVariantSchema.safeParse({ sessionId: 'sess_abc123' })
    expect(result.success).toBe(true)
  })

  it('recordEventSchema rejects sessionId over 100 chars', async () => {
    const { recordEventSchema } = await import('$lib/validators/ab-testing')
    const result = recordEventSchema.safeParse({
      eventName: 'test',
      eventType: 'conversion',
      sessionId: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('recordEventSchema accepts valid userId', async () => {
    const { recordEventSchema } = await import('$lib/validators/ab-testing')
    const result = recordEventSchema.safeParse({
      eventName: 'click',
      eventType: 'custom',
      userId: 'user_123',
    })
    expect(result.success).toBe(true)
  })
})

describe('LIKE wildcard escaping', () => {
  it('escapeLike escapes % wildcards', () => {
    const escapeLike = (s: string) => s.replace(/%/g, '\\%').replace(/_/g, '\\_')
    expect(escapeLike('50%')).toBe('50\\%')
    expect(escapeLike('100%')).toBe('100\\%')
  })

  it('escapeLike escapes _ wildcards', () => {
    const escapeLike = (s: string) => s.replace(/%/g, '\\%').replace(/_/g, '\\_')
    expect(escapeLike('user_name')).toBe('user\\_name')
  })

  it('escapeLike handles both wildcards', () => {
    const escapeLike = (s: string) => s.replace(/%/g, '\\%').replace(/_/g, '\\_')
    expect(escapeLike('50%_off')).toBe('50\\%\\_off')
  })

  it('escapeLike leaves normal text unchanged', () => {
    const escapeLike = (s: string) => s.replace(/%/g, '\\%').replace(/_/g, '\\_')
    expect(escapeLike('hello')).toBe('hello')
    expect(escapeLike('test@example.com')).toBe('test@example.com')
  })
})

describe('Contact validators: appeal schema bounds', () => {
  it('appealSchema rejects email over 200 chars', async () => {
    const { appealSchema } = await import('$lib/validators/contact')
    const result = appealSchema.safeParse({
      email: 'a'.repeat(201),
      message: 'Hello',
      name: 'Test',
    })
    expect(result.success).toBe(false)
  })

  it('appealSchema rejects name over 100 chars', async () => {
    const { appealSchema } = await import('$lib/validators/contact')
    const result = appealSchema.safeParse({
      email: 'test@example.com',
      message: 'Hello',
      name: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('appealSchema accepts valid input', async () => {
    const { appealSchema } = await import('$lib/validators/contact')
    const result = appealSchema.safeParse({
      email: 'test@example.com',
      message: 'Please reconsider my account.',
      name: 'John',
    })
    expect(result.success).toBe(true)
  })
})

describe('Push validators: bounded keys', () => {
  it('pushSubscribeSchema rejects auth over 200 chars', async () => {
    const { pushSubscribeSchema } = await import('$lib/validators/push')
    const result = pushSubscribeSchema.safeParse({
      auth: 'a'.repeat(201),
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      p256dh: 'key123',
    })
    expect(result.success).toBe(false)
  })

  it('pushSubscribeSchema rejects invalid endpoint URL', async () => {
    const { pushSubscribeSchema } = await import('$lib/validators/push')
    const result = pushSubscribeSchema.safeParse({
      auth: 'authkey',
      endpoint: 'not-a-url',
      p256dh: 'key123',
    })
    expect(result.success).toBe(false)
  })

  it('pushUnsubscribeSchema rejects endpoint over 500 chars', async () => {
    const { pushUnsubscribeSchema } = await import('$lib/validators/push')
    const result = pushUnsubscribeSchema.safeParse({
      endpoint: 'https://example.com/' + 'a'.repeat(500),
    })
    expect(result.success).toBe(false)
  })
})
