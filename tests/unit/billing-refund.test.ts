import { refundSchema } from '$lib/validators/billing'
import { describe, expect, it } from 'vitest'

describe('refundSchema', () => {
  it('validates with required invoiceId only', () => {
    const result = refundSchema.safeParse({ invoiceId: 'inv-123' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.invoiceId).toBe('inv-123')
      expect(result.data.amountInCents).toBeUndefined()
      expect(result.data.reason).toBeUndefined()
    }
  })

  it('validates with all fields', () => {
    const result = refundSchema.safeParse({
      amountInCents: 1500,
      invoiceId: 'inv-456',
      reason: 'requested_by_customer',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.amountInCents).toBe(1500)
      expect(result.data.invoiceId).toBe('inv-456')
      expect(result.data.reason).toBe('requested_by_customer')
    }
  })

  it('rejects missing invoiceId', () => {
    const result = refundSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty invoiceId', () => {
    const result = refundSchema.safeParse({ invoiceId: '  ' })
    expect(result.success).toBe(false)
  })

  it('rejects zero amountInCents', () => {
    const result = refundSchema.safeParse({ amountInCents: 0, invoiceId: 'inv-1' })
    expect(result.success).toBe(false)
  })

  it('rejects negative amountInCents', () => {
    const result = refundSchema.safeParse({ amountInCents: -100, invoiceId: 'inv-1' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid reason', () => {
    const result = refundSchema.safeParse({ invoiceId: 'inv-1', reason: 'other' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid reasons', () => {
    const reasons = ['duplicate', 'fraudulent', 'requested_by_customer']
    for (const reason of reasons) {
      const result = refundSchema.safeParse({ invoiceId: 'inv-1', reason })
      expect(result.success).toBe(true)
    }
  })

  it('trims whitespace from invoiceId', () => {
    const result = refundSchema.safeParse({ invoiceId: '  inv-1  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.invoiceId).toBe('inv-1')
    }
  })
})
