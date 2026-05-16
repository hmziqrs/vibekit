import {
  banUserSchema,
  impersonateUserSchema,
  stopImpersonateSchema,
  broadcastNotificationSchema,
} from '$lib/validators/admin'
import { describe, expect, it } from 'vitest'

describe('banUserSchema', () => {
  it('accepts valid ban with reason only', () => {
    const result = banUserSchema.safeParse({ reason: 'Violation of terms' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.reason).toBe('Violation of terms')
    expect(result.success && result.data.durationDays).toBeUndefined()
  })

  it('accepts valid ban with reason and duration', () => {
    const result = banUserSchema.safeParse({
      durationDays: 7,
      reason: 'Spamming',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.durationDays).toBe(7)
  })

  it('accepts permanent ban (no duration)', () => {
    const result = banUserSchema.safeParse({ reason: 'Severe violation' })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from reason', () => {
    const result = banUserSchema.safeParse({ reason: '  spam  ' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.reason).toBe('spam')
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
    const result = banUserSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects reason exceeding 1000 characters', () => {
    const result = banUserSchema.safeParse({ reason: 'a'.repeat(1001) })
    expect(result.success).toBe(false)
  })

  it('accepts reason at exactly 1000 characters', () => {
    const result = banUserSchema.safeParse({ reason: 'a'.repeat(1000) })
    expect(result.success).toBe(true)
  })

  it('rejects non-string reason', () => {
    const result = banUserSchema.safeParse({ reason: 123 })
    expect(result.success).toBe(false)
  })

  it('rejects negative durationDays', () => {
    const result = banUserSchema.safeParse({
      durationDays: -1,
      reason: 'Ban',
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero durationDays', () => {
    const result = banUserSchema.safeParse({
      durationDays: 0,
      reason: 'Ban',
    })
    expect(result.success).toBe(false)
  })

  it('rejects durationDays exceeding 3650', () => {
    const result = banUserSchema.safeParse({
      durationDays: 3651,
      reason: 'Ban',
    })
    expect(result.success).toBe(false)
  })

  it('accepts durationDays at exactly 3650 (10 years)', () => {
    const result = banUserSchema.safeParse({
      durationDays: 3650,
      reason: 'Ban',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-integer durationDays', () => {
    const result = banUserSchema.safeParse({
      durationDays: 3.5,
      reason: 'Ban',
    })
    expect(result.success).toBe(false)
  })

  it('accepts durationDays of 1', () => {
    const result = banUserSchema.safeParse({
      durationDays: 1,
      reason: 'Minor violation',
    })
    expect(result.success).toBe(true)
  })
})

describe('impersonateUserSchema', () => {
  it('accepts valid reason', () => {
    const result = impersonateUserSchema.safeParse({
      reason: 'Debugging user-reported issue',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.reason).toBe('Debugging user-reported issue')
  })

  it('trims whitespace from reason', () => {
    const result = impersonateUserSchema.safeParse({ reason: '  testing  ' })
    expect(result.success).toBe(true)
    expect(result.success && result.data.reason).toBe('testing')
  })

  it('rejects empty reason', () => {
    const result = impersonateUserSchema.safeParse({ reason: '' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only reason', () => {
    const result = impersonateUserSchema.safeParse({ reason: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects missing reason', () => {
    const result = impersonateUserSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects reason exceeding 500 characters', () => {
    const result = impersonateUserSchema.safeParse({ reason: 'a'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('accepts reason at exactly 500 characters', () => {
    const result = impersonateUserSchema.safeParse({ reason: 'a'.repeat(500) })
    expect(result.success).toBe(true)
  })

  it('rejects non-string reason', () => {
    const result = impersonateUserSchema.safeParse({ reason: 42 })
    expect(result.success).toBe(false)
  })

  it('rejects null reason', () => {
    const result = impersonateUserSchema.safeParse({ reason: null })
    expect(result.success).toBe(false)
  })

  it('allows unicode characters in reason', () => {
    const result = impersonateUserSchema.safeParse({
      reason: "Dépannage du problème de l'utilisateur",
    })
    expect(result.success).toBe(true)
  })
})

describe('stopImpersonateSchema', () => {
  it('accepts valid session token', () => {
    const result = stopImpersonateSchema.safeParse({
      sessionToken: 'abc123-token-xyz',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.sessionToken).toBe('abc123-token-xyz')
  })

  it('accepts UUID format session token', () => {
    const token = '01912345-6789-7abc-def0-123456789abc'
    const result = stopImpersonateSchema.safeParse({ sessionToken: token })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from session token', () => {
    const result = stopImpersonateSchema.safeParse({
      sessionToken: '  token123  ',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.sessionToken).toBe('token123')
  })

  it('rejects empty session token', () => {
    const result = stopImpersonateSchema.safeParse({ sessionToken: '' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only session token', () => {
    const result = stopImpersonateSchema.safeParse({ sessionToken: '   ' })
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

  it('rejects null session token', () => {
    const result = stopImpersonateSchema.safeParse({ sessionToken: null })
    expect(result.success).toBe(false)
  })

  it('rejects session token exceeding 500 characters', () => {
    const result = stopImpersonateSchema.safeParse({
      sessionToken: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('accepts session token at exactly 500 characters', () => {
    const result = stopImpersonateSchema.safeParse({
      sessionToken: 'a'.repeat(500),
    })
    expect(result.success).toBe(true)
  })
})

describe('broadcastNotificationSchema', () => {
  it('accepts valid broadcast with required fields', () => {
    const result = broadcastNotificationSchema.safeParse({
      target: 'all',
      title: 'System Maintenance',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.target).toBe('all')
    expect(result.success && result.data.title).toBe('System Maintenance')
  })

  it('accepts broadcast to admins only', () => {
    const result = broadcastNotificationSchema.safeParse({
      target: 'admins',
      title: 'Admin Alert',
    })
    expect(result.success).toBe(true)
  })

  it('accepts broadcast with all optional fields', () => {
    const result = broadcastNotificationSchema.safeParse({
      body: 'Maintenance window: 2-4 AM UTC',
      link: 'https://status.example.com',
      target: 'all',
      title: 'Scheduled Maintenance',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.body).toBe('Maintenance window: 2-4 AM UTC')
    expect(result.success && result.data.link).toBe('https://status.example.com')
  })

  it('accepts broadcast without optional fields', () => {
    const result = broadcastNotificationSchema.safeParse({
      target: 'all',
      title: 'Quick Update',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.body).toBeUndefined()
    expect(result.success && result.data.link).toBeUndefined()
  })

  it('trims whitespace from title', () => {
    const result = broadcastNotificationSchema.safeParse({
      target: 'all',
      title: '  Hello World  ',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.title).toBe('Hello World')
  })

  it('trims whitespace from body', () => {
    const result = broadcastNotificationSchema.safeParse({
      body: '  Details here  ',
      target: 'all',
      title: 'Notice',
    })
    expect(result.success).toBe(true)
    expect(result.success && result.data.body).toBe('Details here')
  })

  it('rejects empty title', () => {
    const result = broadcastNotificationSchema.safeParse({
      target: 'all',
      title: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only title', () => {
    const result = broadcastNotificationSchema.safeParse({
      target: 'all',
      title: '   ',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing title', () => {
    const result = broadcastNotificationSchema.safeParse({ target: 'all' })
    expect(result.success).toBe(false)
  })

  it('rejects title exceeding 200 characters', () => {
    const result = broadcastNotificationSchema.safeParse({
      target: 'all',
      title: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('accepts title at exactly 200 characters', () => {
    const result = broadcastNotificationSchema.safeParse({
      target: 'all',
      title: 'a'.repeat(200),
    })
    expect(result.success).toBe(true)
  })

  it('rejects body exceeding 1000 characters', () => {
    const result = broadcastNotificationSchema.safeParse({
      body: 'a'.repeat(1001),
      target: 'all',
      title: 'Title',
    })
    expect(result.success).toBe(false)
  })

  it('accepts body at exactly 1000 characters', () => {
    const result = broadcastNotificationSchema.safeParse({
      body: 'a'.repeat(1000),
      target: 'all',
      title: 'Title',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid target', () => {
    const result = broadcastNotificationSchema.safeParse({
      target: 'everyone',
      title: 'Title',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing target', () => {
    const result = broadcastNotificationSchema.safeParse({ title: 'Title' })
    expect(result.success).toBe(false)
  })

  it('rejects non-string title', () => {
    const result = broadcastNotificationSchema.safeParse({
      target: 'all',
      title: 123,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid link URL', () => {
    const result = broadcastNotificationSchema.safeParse({
      link: 'not-a-url',
      target: 'all',
      title: 'Title',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid link URL', () => {
    const result = broadcastNotificationSchema.safeParse({
      link: 'https://example.com/maintenance',
      target: 'all',
      title: 'Title',
    })
    expect(result.success).toBe(true)
  })

  it('rejects case-sensitive target mismatch', () => {
    const result = broadcastNotificationSchema.safeParse({
      target: 'All',
      title: 'Title',
    })
    expect(result.success).toBe(false)
  })
})
