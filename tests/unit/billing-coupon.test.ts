import { createCouponSchema, redeemCouponSchema, updateCouponSchema } from '$lib/validators/billing'
import { describe, expect, it } from 'vitest'

describe('createCouponSchema', () => {
  it('validates a minimal coupon', () => {
    const result = createCouponSchema.safeParse({
      code: 'SAVE20',
      name: 'Save 20%',
      percentOff: 20,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe('SAVE20')
      expect(result.data.percentOff).toBe(20)
      expect(result.data.duration).toBeUndefined()
    }
  })

  it('validates a full coupon', () => {
    const result = createCouponSchema.safeParse({
      active: false,
      code: 'LAUNCH50',
      currency: 'eur',
      duration: 'repeating',
      durationInMonths: 3,
      maxRedemptions: 100,
      name: 'Launch 50% off',
      percentOff: 50,
      redeemBy: 1735689600000,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.active).toBe(false)
      expect(result.data.duration).toBe('repeating')
      expect(result.data.durationInMonths).toBe(3)
      expect(result.data.maxRedemptions).toBe(100)
    }
  })

  it('rejects code shorter than 3 chars', () => {
    const result = createCouponSchema.safeParse({ code: 'AB', name: 'Test', percentOff: 10 })
    expect(result.success).toBe(false)
  })

  it('rejects code longer than 50 chars', () => {
    const result = createCouponSchema.safeParse({
      code: 'A'.repeat(51),
      name: 'Test',
      percentOff: 10,
    })
    expect(result.success).toBe(false)
  })

  it('rejects lowercase in code', () => {
    const result = createCouponSchema.safeParse({ code: 'save20', name: 'Test', percentOff: 20 })
    expect(result.success).toBe(false)
  })

  it('rejects special characters in code', () => {
    const result = createCouponSchema.safeParse({ code: 'SAVE 20', name: 'Test', percentOff: 20 })
    expect(result.success).toBe(false)
  })

  it('accepts hyphens in code', () => {
    const result = createCouponSchema.safeParse({ code: 'SAVE-20', name: 'Test', percentOff: 20 })
    expect(result.success).toBe(true)
  })

  it('rejects percentOff below 1', () => {
    const result = createCouponSchema.safeParse({ code: 'TEST', name: 'Test', percentOff: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects percentOff above 100', () => {
    const result = createCouponSchema.safeParse({ code: 'TEST', name: 'Test', percentOff: 101 })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = createCouponSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects invalid duration', () => {
    const result = createCouponSchema.safeParse({
      code: 'TEST',
      duration: 'weekly',
      name: 'Test',
      percentOff: 10,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative durationInMonths', () => {
    const result = createCouponSchema.safeParse({
      code: 'TEST',
      durationInMonths: -1,
      name: 'Test',
      percentOff: 10,
    })
    expect(result.success).toBe(false)
  })
})

describe('updateCouponSchema', () => {
  it('validates name update', () => {
    const result = updateCouponSchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('validates active toggle', () => {
    const result = updateCouponSchema.safeParse({ active: false })
    expect(result.success).toBe(true)
  })

  it('validates both fields', () => {
    const result = updateCouponSchema.safeParse({ active: true, name: 'Updated' })
    expect(result.success).toBe(true)
  })

  it('allows empty update', () => {
    const result = updateCouponSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = updateCouponSchema.safeParse({ name: '  ' })
    expect(result.success).toBe(false)
  })

  it('rejects name over 100 chars', () => {
    const result = updateCouponSchema.safeParse({ name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })
})

describe('redeemCouponSchema', () => {
  it('validates code', () => {
    const result = redeemCouponSchema.safeParse({ code: 'SAVE20' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe('SAVE20')
    }
  })

  it('rejects empty code', () => {
    const result = redeemCouponSchema.safeParse({ code: '' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only code', () => {
    const result = redeemCouponSchema.safeParse({ code: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects missing code', () => {
    const result = redeemCouponSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('trims whitespace from code', () => {
    const result = redeemCouponSchema.safeParse({ code: '  SAVE20  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe('SAVE20')
    }
  })
})
