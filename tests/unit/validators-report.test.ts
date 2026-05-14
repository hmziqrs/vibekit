import { createReportSchema, resolveReportSchema } from '$lib/validators/report'
import { describe, expect, it } from 'vitest'

describe('createReportSchema', () => {
  const validInput = {
    entityId: 'post-123',
    entityType: 'blogPost',
    reason: 'spam',
  }

  it('accepts valid report', () => {
    const result = createReportSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts report with description', () => {
    const result = createReportSchema.safeParse({
      ...validInput,
      description: 'This is spam content',
    })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from description', () => {
    const data = createReportSchema.parse({ ...validInput, description: '  Spam content  ' })
    expect(data.description).toBe('Spam content')
  })

  it('rejects missing entityId', () => {
    const result = createReportSchema.safeParse({ entityType: 'blogPost', reason: 'spam' })
    expect(result.success).toBe(false)
  })

  it('rejects empty entityId', () => {
    const result = createReportSchema.safeParse({ ...validInput, entityId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid entityType', () => {
    const result = createReportSchema.safeParse({ ...validInput, entityType: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid entity types', () => {
    const types = [
      'blogPost',
      'comment',
      'contactSubmission',
      'item',
      'organization',
      'team',
      'user',
    ]
    for (const entityType of types) {
      const result = createReportSchema.safeParse({ ...validInput, entityType })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid reason', () => {
    const result = createReportSchema.safeParse({ ...validInput, reason: 'revenge' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid reasons', () => {
    const reasons = ['harassment', 'inappropriate', 'misinformation', 'other', 'spam']
    for (const reason of reasons) {
      const result = createReportSchema.safeParse({ ...validInput, reason })
      expect(result.success).toBe(true)
    }
  })

  it('rejects description exceeding 1000 chars', () => {
    const result = createReportSchema.safeParse({ ...validInput, description: 'a'.repeat(1001) })
    expect(result.success).toBe(false)
  })

  it('accepts description at max 1000 chars', () => {
    const result = createReportSchema.safeParse({ ...validInput, description: 'a'.repeat(1000) })
    expect(result.success).toBe(true)
  })
})

describe('resolveReportSchema', () => {
  it('accepts resolved status with note', () => {
    const result = resolveReportSchema.safeParse({
      resolutionNote: 'Content removed',
      status: 'resolved',
    })
    expect(result.success).toBe(true)
  })

  it('accepts dismissed status with note', () => {
    const result = resolveReportSchema.safeParse({
      resolutionNote: 'Not a violation',
      status: 'dismissed',
    })
    expect(result.success).toBe(true)
  })

  it('trims whitespace from resolution note', () => {
    const data = resolveReportSchema.parse({
      resolutionNote: '  Note  ',
      status: 'resolved',
    })
    expect(data.resolutionNote).toBe('Note')
  })

  it('rejects empty resolution note', () => {
    const result = resolveReportSchema.safeParse({
      resolutionNote: '',
      status: 'resolved',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing resolution note', () => {
    const result = resolveReportSchema.safeParse({ status: 'resolved' })
    expect(result.success).toBe(false)
  })

  it('rejects resolution note exceeding 500 chars', () => {
    const result = resolveReportSchema.safeParse({
      resolutionNote: 'a'.repeat(501),
      status: 'resolved',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = resolveReportSchema.safeParse({
      resolutionNote: 'Note',
      status: 'pending',
    })
    expect(result.success).toBe(false)
  })
})
