import { createReportSchema, resolveReportSchema } from '$lib/validators/report'
import { describe, expect, it, test } from 'vitest'

describe('create report schema', () => {
  it('validates a complete report', () => {
    const result = createReportSchema.safeParse({
      entityId: 'abc-123',
      entityType: 'item',
      reason: 'spam',
    })
    expect(result.success).toBe(true)
  })

  it('validates with optional description', () => {
    const result = createReportSchema.safeParse({
      description: 'This is spam content',
      entityId: 'abc-123',
      entityType: 'blogPost',
      reason: 'inappropriate',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing entityId', () => {
    const result = createReportSchema.safeParse({
      entityType: 'item',
      reason: 'spam',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid entityType', () => {
    const result = createReportSchema.safeParse({
      entityId: 'abc-123',
      entityType: 'invalidType',
      reason: 'spam',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid reason', () => {
    const result = createReportSchema.safeParse({
      entityId: 'abc-123',
      entityType: 'item',
      reason: 'invalid_reason',
    })
    expect(result.success).toBe(false)
  })

  it('rejects description over 1000 chars', () => {
    const result = createReportSchema.safeParse({
      description: 'x'.repeat(1001),
      entityId: 'abc-123',
      entityType: 'item',
      reason: 'spam',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid entity types', () => {
    const types = ['blogPost', 'contactSubmission', 'item', 'organization', 'team', 'user']
    for (const type of types) {
      const result = createReportSchema.safeParse({
        entityId: 'abc-123',
        entityType: type,
        reason: 'spam',
      })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all valid reasons', () => {
    const reasons = ['harassment', 'inappropriate', 'misinformation', 'other', 'spam']
    for (const reason of reasons) {
      const result = createReportSchema.safeParse({
        entityId: 'abc-123',
        entityType: 'item',
        reason,
      })
      expect(result.success).toBe(true)
    }
  })

  it('trims description whitespace', () => {
    const result = createReportSchema.parse({
      description: '  spaced content  ',
      entityId: 'abc-123',
      entityType: 'item',
      reason: 'spam',
    })
    expect(result.description).toBe('spaced content')
  })
})

describe('resolve report schema', () => {
  it('validates resolved status with note', () => {
    const result = resolveReportSchema.safeParse({
      resolutionNote: 'Content removed and user warned',
      status: 'resolved',
    })
    expect(result.success).toBe(true)
  })

  it('validates dismissed status with note', () => {
    const result = resolveReportSchema.safeParse({
      resolutionNote: 'Not a violation',
      status: 'dismissed',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = resolveReportSchema.safeParse({
      resolutionNote: 'Some note',
      status: 'pending',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing resolutionNote', () => {
    const result = resolveReportSchema.safeParse({
      status: 'resolved',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty resolutionNote', () => {
    const result = resolveReportSchema.safeParse({
      resolutionNote: '',
      status: 'resolved',
    })
    expect(result.success).toBe(false)
  })

  it('rejects note over 500 chars', () => {
    const result = resolveReportSchema.safeParse({
      resolutionNote: 'x'.repeat(501),
      status: 'resolved',
    })
    expect(result.success).toBe(false)
  })

  it('trims resolution note whitespace', () => {
    const result = resolveReportSchema.parse({
      resolutionNote: '  some note  ',
      status: 'resolved',
    })
    expect(result.resolutionNote).toBe('some note')
  })
})
