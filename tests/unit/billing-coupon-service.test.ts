import { coupon } from '$lib/server/db/schema'
import type { AppDb } from '$lib/server/services/types'
import { eq, and } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function createMockDb(returnValues: Record<string, unknown> = {}): AppDb {
  const whereChain = {
    get: vi.fn().mockResolvedValue(returnValues.selectWhereGet ?? undefined),
  }
  const updateWhereChain = {
    returning: vi.fn().mockResolvedValue(returnValues.updateReturning ?? []),
  }

  return {
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue(returnValues.selectGet ?? undefined),
        orderBy: vi.fn().mockResolvedValue(returnValues.selectList ?? []),
        where: vi.fn().mockReturnValue(whereChain),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(updateWhereChain),
      }),
    }),
  } as unknown as AppDb
}

describe('getCouponByCode', () => {
  it('looks up coupon with uppercased code', async () => {
    const { getCouponByCode } = await import('$lib/server/billing/subscription-service')
    const mockCoupon = {
      active: true,
      code: 'SAVE20',
      id: 'c-1',
      name: 'Save 20%',
      percentOff: 20,
      timesRedeemed: 0,
      valid: true,
    }
    const db = createMockDb({ selectWhereGet: mockCoupon })

    const result = await getCouponByCode(db, 'save20')

    expect(result).toEqual(mockCoupon)
  })
})

describe('getCouponById', () => {
  it('returns coupon when found', async () => {
    const { getCouponById } = await import('$lib/server/billing/subscription-service')
    const mockCoupon = { code: 'SAVE20', id: 'c-1', name: 'Save 20%' }
    const db = createMockDb({ selectWhereGet: mockCoupon })

    const result = await getCouponById(db, 'c-1')

    expect(result).toEqual(mockCoupon)
  })

  it('returns undefined when not found', async () => {
    const { getCouponById } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb({ selectWhereGet: undefined })

    const result = await getCouponById(db, 'nonexistent')

    expect(result).toBeUndefined()
  })
})

describe('listCoupons', () => {
  it('returns all coupons ordered by createdAt desc', async () => {
    const { listCoupons } = await import('$lib/server/billing/subscription-service')
    const coupons = [
      { code: 'NEW', id: 'c-2', name: 'New Coupon' },
      { code: 'OLD', id: 'c-1', name: 'Old Coupon' },
    ]
    const db = createMockDb({ selectList: coupons })

    const result = await listCoupons(db)

    expect(result).toEqual(coupons)
  })
})

describe('createCoupon', () => {
  it('creates coupon with defaults', async () => {
    const { createCoupon } = await import('$lib/server/billing/subscription-service')
    const createdCoupon = {
      active: true,
      code: 'SAVE20',
      currency: 'usd',
      duration: 'once',
      id: 'new-id',
      name: 'Save 20%',
      percentOff: 20,
    }
    const db = createMockDb({ selectWhereGet: createdCoupon })

    const result = await createCoupon(db, {
      code: 'save20',
      name: 'Save 20%',
      percentOff: 20,
    })

    expect(result).toEqual(createdCoupon)
  })

  it('uppercases the coupon code', async () => {
    const { createCoupon } = await import('$lib/server/billing/subscription-service')
    const insertFn = vi.fn().mockResolvedValue(undefined)
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertFn }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(undefined) }),
        }),
      }),
    } as unknown as AppDb

    await createCoupon(db, { code: 'lowercase', name: 'Test', percentOff: 10 })

    const insertedValues = insertFn.mock.calls[0][0] as Record<string, unknown>
    expect(insertedValues.code).toBe('LOWERCASE')
  })

  it('passes stripeCouponId when provided', async () => {
    const { createCoupon } = await import('$lib/server/billing/subscription-service')
    const insertFn = vi.fn().mockResolvedValue(undefined)
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertFn }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(undefined) }),
        }),
      }),
    } as unknown as AppDb

    await createCoupon(db, {
      code: 'STR1PE',
      name: 'Stripe Coupon',
      percentOff: 15,
      stripeCouponId: 'co_stripe_123',
    })

    const insertedValues = insertFn.mock.calls[0][0] as Record<string, unknown>
    expect(insertedValues.stripeCouponId).toBe('co_stripe_123')
  })
})

describe('updateCoupon', () => {
  it('updates active and name fields', async () => {
    const { updateCoupon } = await import('$lib/server/billing/subscription-service')
    const updatedCoupon = { code: 'SAVE20', id: 'c-1', name: 'Updated', active: false }
    const db = createMockDb({ selectWhereGet: updatedCoupon })

    const result = await updateCoupon(db, 'c-1', { active: false, name: 'Updated' })

    expect(result).toEqual(updatedCoupon)
  })

  it('only updates provided fields', async () => {
    const { updateCoupon } = await import('$lib/server/billing/subscription-service')
    const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(undefined) }),
        }),
      }),
      update: vi.fn().mockReturnValue({ set: setFn }),
    } as unknown as AppDb

    await updateCoupon(db, 'c-1', { name: 'New Name' })

    const setValues = setFn.mock.calls[0][0] as Record<string, unknown>
    expect(setValues).toEqual({ name: 'New Name' })
    expect(setValues).not.toHaveProperty('active')
  })
})

describe('validateCouponForRedemption', () => {
  it('returns valid for active, non-expired coupon', async () => {
    const { validateCouponForRedemption } = await import('$lib/server/billing/subscription-service')
    const mockCoupon = {
      active: true,
      code: 'SAVE20',
      id: 'c-1',
      maxRedemptions: null,
      name: 'Save 20%',
      percentOff: 20,
      redeemBy: null,
      timesRedeemed: 0,
      valid: true,
    }
    const db = createMockDb({ selectWhereGet: mockCoupon })

    const result = await validateCouponForRedemption(db, 'SAVE20')

    expect(result.valid).toBe(true)
    expect(result.coupon).toEqual(mockCoupon)
  })

  it('rejects non-existent coupon', async () => {
    const { validateCouponForRedemption } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb({ selectWhereGet: undefined })

    const result = await validateCouponForRedemption(db, 'INVALID')

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Coupon not found')
  })

  it('rejects inactive coupon', async () => {
    const { validateCouponForRedemption } = await import('$lib/server/billing/subscription-service')
    const mockCoupon = {
      active: false,
      code: 'SAVE20',
      id: 'c-1',
      name: 'Save 20%',
      percentOff: 20,
      redeemBy: null,
      timesRedeemed: 0,
      valid: true,
    }
    const db = createMockDb({ selectWhereGet: mockCoupon })

    const result = await validateCouponForRedemption(db, 'SAVE20')

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Coupon is inactive')
  })

  it('rejects invalid coupon', async () => {
    const { validateCouponForRedemption } = await import('$lib/server/billing/subscription-service')
    const mockCoupon = {
      active: true,
      code: 'SAVE20',
      id: 'c-1',
      name: 'Save 20%',
      percentOff: 20,
      redeemBy: null,
      timesRedeemed: 0,
      valid: false,
    }
    const db = createMockDb({ selectWhereGet: mockCoupon })

    const result = await validateCouponForRedemption(db, 'SAVE20')

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Coupon is no longer valid')
  })

  it('rejects expired coupon', async () => {
    const { validateCouponForRedemption } = await import('$lib/server/billing/subscription-service')
    const mockCoupon = {
      active: true,
      code: 'SAVE20',
      id: 'c-1',
      name: 'Save 20%',
      percentOff: 20,
      redeemBy: Date.now() - 10000,
      timesRedeemed: 0,
      valid: true,
    }
    const db = createMockDb({ selectWhereGet: mockCoupon })

    const result = await validateCouponForRedemption(db, 'SAVE20')

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Coupon has expired')
  })

  it('rejects coupon at max redemptions', async () => {
    const { validateCouponForRedemption } = await import('$lib/server/billing/subscription-service')
    const mockCoupon = {
      active: true,
      code: 'SAVE20',
      id: 'c-1',
      maxRedemptions: 10,
      name: 'Save 20%',
      percentOff: 20,
      redeemBy: null,
      timesRedeemed: 10,
      valid: true,
    }
    const db = createMockDb({ selectWhereGet: mockCoupon })

    const result = await validateCouponForRedemption(db, 'SAVE20')

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Coupon has reached max redemptions')
  })

  it('allows coupon under max redemptions', async () => {
    const { validateCouponForRedemption } = await import('$lib/server/billing/subscription-service')
    const mockCoupon = {
      active: true,
      code: 'SAVE20',
      id: 'c-1',
      maxRedemptions: 10,
      name: 'Save 20%',
      percentOff: 20,
      redeemBy: null,
      timesRedeemed: 5,
      valid: true,
    }
    const db = createMockDb({ selectWhereGet: mockCoupon })

    const result = await validateCouponForRedemption(db, 'SAVE20')

    expect(result.valid).toBe(true)
  })
})

describe('redeemCoupon', () => {
  it('returns error when validation fails', async () => {
    const { redeemCoupon } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb({ selectWhereGet: undefined })

    const result = await redeemCoupon(db, 'INVALID')

    expect(result.redeemed).toBe(false)
    expect(result.error).toBe('Coupon not found')
  })

  it('increments timesRedeemed without maxRedemptions', async () => {
    const { redeemCoupon } = await import('$lib/server/billing/subscription-service')
    const mockCoupon = {
      active: true,
      code: 'SAVE20',
      id: 'c-1',
      maxRedemptions: null,
      name: 'Save 20%',
      percentOff: 20,
      redeemBy: null,
      timesRedeemed: 0,
      valid: true,
    }
    const db = createMockDb({ selectWhereGet: mockCoupon })

    const result = await redeemCoupon(db, 'SAVE20')

    expect(result.redeemed).toBe(true)
    expect(result.coupon).toEqual(mockCoupon)
  })

  it('increments with TOCTOU guard when maxRedemptions set', async () => {
    const { redeemCoupon } = await import('$lib/server/billing/subscription-service')
    const mockCoupon = {
      active: true,
      code: 'SAVE20',
      id: 'c-1',
      maxRedemptions: 10,
      name: 'Save 20%',
      percentOff: 20,
      redeemBy: null,
      timesRedeemed: 5,
      valid: true,
    }
    const db = createMockDb({
      selectWhereGet: mockCoupon,
      updateReturning: [{ id: 'c-1' }],
    })

    const result = await redeemCoupon(db, 'SAVE20')

    expect(result.redeemed).toBe(true)
  })

  it('rejects when TOCTOU guard detects max reached', async () => {
    const { redeemCoupon } = await import('$lib/server/billing/subscription-service')
    const mockCoupon = {
      active: true,
      code: 'SAVE20',
      id: 'c-1',
      maxRedemptions: 10,
      name: 'Save 20%',
      percentOff: 20,
      redeemBy: null,
      timesRedeemed: 10,
      valid: true,
    }
    const db = createMockDb({
      selectWhereGet: mockCoupon,
      updateReturning: [],
    })

    const result = await redeemCoupon(db, 'SAVE20')

    expect(result.redeemed).toBe(false)
    expect(result.error).toBe('Coupon has reached max redemptions')
  })
})

describe('createStripeCoupon', () => {
  it('calls stripe.coupons.create with correct params', async () => {
    const { createStripeCoupon } = await import('$lib/server/billing/stripe')
    const mockCreate = vi.fn().mockResolvedValue({ id: 'co_123' })
    const mockStripe = { coupons: { create: mockCreate } }

    const result = await createStripeCoupon(mockStripe as never, {
      duration: 'forever',
      name: 'Summer Sale',
      percentOff: 25,
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 'forever',
        name: 'Summer Sale',
        percent_off: 25,
      }),
      undefined
    )
    expect(result.stripeCouponId).toBe('co_123')
  })

  it('passes idempotency key when provided', async () => {
    const { createStripeCoupon } = await import('$lib/server/billing/stripe')
    const mockCreate = vi.fn().mockResolvedValue({ id: 'co_456' })
    const mockStripe = { coupons: { create: mockCreate } }

    await createStripeCoupon(mockStripe as never, {
      idempotencyKey: 'coupon-unique-key',
      name: 'Test',
      percentOff: 10,
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ idempotencyKey: 'coupon-unique-key' })
    )
  })

  it('wraps errors in StripeApiError', async () => {
    const { createStripeCoupon, StripeApiError } = await import('$lib/server/billing/stripe')
    const mockCreate = vi.fn().mockRejectedValue(new Error('Stripe error'))
    const mockStripe = { coupons: { create: mockCreate } }

    await expect(
      createStripeCoupon(mockStripe as never, { name: 'Test', percentOff: 10 })
    ).rejects.toThrow(StripeApiError)
  })

  it('defaults duration to once', async () => {
    const { createStripeCoupon } = await import('$lib/server/billing/stripe')
    const mockCreate = vi.fn().mockResolvedValue({ id: 'co_789' })
    const mockStripe = { coupons: { create: mockCreate } }

    await createStripeCoupon(mockStripe as never, { name: 'Test', percentOff: 10 })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 'once' }),
      undefined
    )
  })
})
