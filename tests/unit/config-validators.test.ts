import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  updateConfigSchema,
} from '$lib/validators/config'
import { describe, expect, it } from 'vitest'

describe('update config schema', () => {
  it('validates a valid config update', () => {
    const result = updateConfigSchema.safeParse({ value: 'true' })
    expect(result.success).toBe(true)
  })

  it('rejects missing value', () => {
    const result = updateConfigSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty value', () => {
    const result = updateConfigSchema.safeParse({ value: '' })
    expect(result.success).toBe(false)
  })

  it('accepts boolean string values', () => {
    expect(updateConfigSchema.safeParse({ value: 'true' }).success).toBe(true)
    expect(updateConfigSchema.safeParse({ value: 'false' }).success).toBe(true)
  })

  it('accepts numeric string values', () => {
    const result = updateConfigSchema.safeParse({ value: '10' })
    expect(result.success).toBe(true)
  })
})

describe('create announcement schema', () => {
  it('validates a minimal announcement', () => {
    const result = createAnnouncementSchema.safeParse({
      message: 'System maintenance scheduled',
    })
    expect(result.success).toBe(true)
  })

  it('validates a complete announcement', () => {
    const result = createAnnouncementSchema.safeParse({
      endsAt: '2026-06-01T00:00:00Z',
      isActive: false,
      message: 'Scheduled downtime',
      startsAt: '2026-05-15T00:00:00Z',
      type: 'warning',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing message', () => {
    const result = createAnnouncementSchema.safeParse({ type: 'info' })
    expect(result.success).toBe(false)
  })

  it('rejects empty message', () => {
    const result = createAnnouncementSchema.safeParse({ message: '' })
    expect(result.success).toBe(false)
  })

  it('rejects message over 500 chars', () => {
    const result = createAnnouncementSchema.safeParse({
      message: 'x'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = createAnnouncementSchema.safeParse({
      message: 'Test',
      type: 'debug',
    })
    expect(result.success).toBe(false)
  })

  it('defaults type to info', () => {
    const result = createAnnouncementSchema.parse({
      message: 'Hello',
    })
    expect(result.type).toBe('info')
  })

  it('accepts all valid types', () => {
    const types = ['critical', 'info', 'warning'] as const
    for (const type of types) {
      const result = createAnnouncementSchema.safeParse({
        message: 'Test',
        type,
      })
      expect(result.success).toBe(true)
    }
  })

  it('trims message whitespace', () => {
    const result = createAnnouncementSchema.parse({
      message: '  hello world  ',
    })
    expect(result.message).toBe('hello world')
  })
})

describe('update announcement schema', () => {
  it('validates partial update with isActive', () => {
    const result = updateAnnouncementSchema.safeParse({ isActive: false })
    expect(result.success).toBe(true)
  })

  it('validates partial update with message', () => {
    const result = updateAnnouncementSchema.safeParse({ message: 'Updated' })
    expect(result.success).toBe(true)
  })

  it('validates partial update with type', () => {
    const result = updateAnnouncementSchema.safeParse({ type: 'critical' })
    expect(result.success).toBe(true)
  })

  it('validates setting endsAt to null', () => {
    const result = updateAnnouncementSchema.safeParse({ endsAt: null })
    expect(result.success).toBe(true)
  })

  it('validates setting startsAt to null', () => {
    const result = updateAnnouncementSchema.safeParse({ startsAt: null })
    expect(result.success).toBe(true)
  })

  it('validates empty object', () => {
    const result = updateAnnouncementSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects invalid type', () => {
    const result = updateAnnouncementSchema.safeParse({ type: 'unknown' })
    expect(result.success).toBe(false)
  })
})
