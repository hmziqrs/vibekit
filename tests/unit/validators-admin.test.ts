import {
  banUserSchema,
  broadcastNotificationSchema,
  impersonateUserSchema,
  stopImpersonateSchema,
} from '$lib/validators/admin'
import { describe, expect, it } from 'vitest'

describe(banUserSchema, () => {
  it('accepts valid ban with reason only', () => {
    const result = banUserSchema.safeParse({ reason: 'Violation of terms' })
    expect(result.success).toBe(true)
  })

  it('accepts valid ban with reason and duration', () => {
    const result = banUserSchema.safeParse({ durationDays: 7, reason: 'Spam' })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from reason', () => {
    const result = banUserSchema.parse({ reason: '  Spam  ' })
    expect(result.reason).toBe('Spam')
  })

  it('rejects empty reason', () => {
    const result = banUserSchema.safeParse({ reason: '' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only reason', () => {
    const result = banUserSchema.safeParse({ reason: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects missing reason', () => {
    const result = banUserSchema.safeParse({ durationDays: 7 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer durationDays', () => {
    const result = banUserSchema.safeParse({ durationDays: 7.5, reason: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects zero durationDays', () => {
    const result = banUserSchema.safeParse({ durationDays: 0, reason: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects negative durationDays', () => {
    const result = banUserSchema.safeParse({ durationDays: -1, reason: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects durationDays exceeding 3650 (10 years)', () => {
    const result = banUserSchema.safeParse({ durationDays: 3651, reason: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects non-number durationDays', () => {
    const result = banUserSchema.safeParse({ durationDays: 'forever', reason: 'Test' })
    expect(result.success).toBe(false)
  })

  it('accepts reason at max length (1000)', () => {
    const result = banUserSchema.safeParse({ reason: 'a'.repeat(1000) })
    expect(result.success).toBe(true)
  })

  it('rejects reason exceeding 1000 chars', () => {
    const result = banUserSchema.safeParse({ reason: 'a'.repeat(1001) })
    expect(result.success).toBe(false)
  })
})

describe(impersonateUserSchema, () => {
  it('accepts valid reason', () => {
    const result = impersonateUserSchema.safeParse({ reason: 'Debugging user issue' })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from reason', () => {
    const result = impersonateUserSchema.parse({ reason: '  Debug  ' })
    expect(result.reason).toBe('Debug')
  })

  it('rejects empty reason', () => {
    const result = impersonateUserSchema.safeParse({ reason: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing reason', () => {
    const result = impersonateUserSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects reason exceeding 500 chars', () => {
    const result = impersonateUserSchema.safeParse({ reason: 'a'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('accepts reason at max length (500)', () => {
    const result = impersonateUserSchema.safeParse({ reason: 'a'.repeat(500) })
    expect(result.success).toBe(true)
  })
})

describe(stopImpersonateSchema, () => {
  it('accepts valid session token', () => {
    const result = stopImpersonateSchema.safeParse({ sessionToken: 'abc123' })
    expect(result.success).toBe(true)
  })

  it('rejects empty session token', () => {
    const result = stopImpersonateSchema.safeParse({ sessionToken: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing session token', () => {
    const result = stopImpersonateSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects non-string session token', () => {
    const result = stopImpersonateSchema.safeParse({ sessionToken: 123 })
    expect(result.success).toBe(false)
  })
})

describe(broadcastNotificationSchema, () => {
  const validInput = {
    target: 'all' as const,
    title: 'System maintenance scheduled',
  }

  it('accepts valid minimal input', () => {
    const result = broadcastNotificationSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts all fields', () => {
    const result = broadcastNotificationSchema.safeParse({
      body: 'Details here',
      link: 'https://example.com/maintenance',
      target: 'admins',
      title: 'Admin notice',
      type: 'warning',
    })
    expect(result.success).toBe(true)
  })

  it('defaults type to info', () => {
    const result = broadcastNotificationSchema.parse(validInput)
    expect(result.type).toBe('info')
  })

  it('trims whitespace from title', () => {
    const result = broadcastNotificationSchema.parse({ ...validInput, title: '  Notice  ' })
    expect(result.title).toBe('Notice')
  })

  it('rejects empty title', () => {
    const result = broadcastNotificationSchema.safeParse({ ...validInput, title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing title', () => {
    const result = broadcastNotificationSchema.safeParse({ target: 'all' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid target', () => {
    const result = broadcastNotificationSchema.safeParse({ target: 'invalid', title: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = broadcastNotificationSchema.safeParse({
      ...validInput,
      type: 'critical',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid link URL', () => {
    const result = broadcastNotificationSchema.safeParse({
      ...validInput,
      link: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid types', () => {
    for (const type of ['error', 'info', 'success', 'warning'] as const) {
      const result = broadcastNotificationSchema.safeParse({ ...validInput, type })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all valid targets', () => {
    for (const target of ['all', 'admins'] as const) {
      const result = broadcastNotificationSchema.safeParse({ ...validInput, target })
      expect(result.success).toBe(true)
    }
  })

  it('rejects title exceeding 200 chars', () => {
    const result = broadcastNotificationSchema.safeParse({ ...validInput, title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('rejects body exceeding 1000 chars', () => {
    const result = broadcastNotificationSchema.safeParse({
      ...validInput,
      body: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})
