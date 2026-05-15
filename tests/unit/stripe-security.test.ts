import { afterEach, describe, expect, it, vi } from 'vitest'

describe('StripeApiError', () => {
  it('wraps original error as cause', async () => {
    const { StripeApiError } = await import('$lib/server/billing/stripe')
    const original = new Error('API connection timeout')
    const err = new StripeApiError('Failed to create checkout session', original)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('StripeApiError')
    expect(err.message).toBe('Failed to create checkout session')
    expect(err.cause).toBe(original)
  })
})

describe('URL validation helpers', () => {
  describe('isSafeRedirectUrl', () => {
    it('accepts relative paths', async () => {
      const { isSafeRedirectUrl } = await import('$lib/server/billing/stripe')
      expect(isSafeRedirectUrl('/app/billing')).toBe(true)
      expect(isSafeRedirectUrl('/settings')).toBe(true)
    })

    it('rejects protocol-relative URLs', async () => {
      const { isSafeRedirectUrl } = await import('$lib/server/billing/stripe')
      expect(isSafeRedirectUrl('//evil.com')).toBe(false)
      expect(isSafeRedirectUrl('//evil.com/steal-cookies')).toBe(false)
    })

    it('rejects absolute URLs', async () => {
      const { isSafeRedirectUrl } = await import('$lib/server/billing/stripe')
      expect(isSafeRedirectUrl('https://evil.com')).toBe(false)
      expect(isSafeRedirectUrl('http://localhost:3000')).toBe(false)
    })

    it('rejects javascript: URLs', async () => {
      const { isSafeRedirectUrl } = await import('$lib/server/billing/stripe')
      expect(isSafeRedirectUrl('javascript:alert(1)')).toBe(false)
    })
  })

  describe('isSameOrigin', () => {
    it('accepts same-origin absolute URLs', async () => {
      const { isSameOrigin } = await import('$lib/server/billing/stripe')
      expect(isSameOrigin('https://app.example.com/billing', 'https://app.example.com')).toBe(true)
    })

    it('rejects different-origin URLs', async () => {
      const { isSameOrigin } = await import('$lib/server/billing/stripe')
      expect(isSameOrigin('https://evil.com/callback', 'https://app.example.com')).toBe(false)
    })

    it('handles relative URLs by resolving against origin', async () => {
      const { isSameOrigin } = await import('$lib/server/billing/stripe')
      expect(isSameOrigin('/billing/success', 'https://app.example.com')).toBe(true)
    })

    it('handles relative URLs as same-origin by resolving', async () => {
      const { isSameOrigin } = await import('$lib/server/billing/stripe')
      // 'not-a-url' resolves as a path relative to origin
      expect(isSameOrigin('not-a-url', 'https://app.example.com')).toBe(true)
    })

    it('rejects empty string with no origin', async () => {
      const { isSameOrigin } = await import('$lib/server/billing/stripe')
      expect(isSameOrigin('', '')).toBe(false)
    })
  })
})

describe('Stripe API error handling', () => {
  afterEach(() => {
    vi.resetModules()
  })

  function createMockStripe(method: string, impl: () => never) {
    const fn = vi.fn().mockImplementation(impl)
    return {
      billingPortal: { sessions: { create: method === 'portal' ? fn : vi.fn() } },
      checkout: { sessions: { create: method === 'checkout' ? fn : vi.fn() } },
      coupons: { create: method === 'coupon' ? fn : vi.fn() } as never,
      customers: { create: method === 'customer' ? fn : vi.fn() } as never,
      paymentMethods: { list: method === 'paymentMethods' ? fn : vi.fn() } as never,
      webhooks: {
        constructEvent: method === 'webhook' ? fn : vi.fn(),
      },
    }
  }

  it('wraps checkout session errors in StripeApiError', async () => {
    const { createCheckoutSession, StripeApiError } = await import('$lib/server/billing/stripe')
    const mock = createMockStripe('checkout', () => {
      throw new Error('Stripe API timeout')
    })

    await expect(
      createCheckoutSession(mock as never, {
        cancelUrl: '/cancel',
        successUrl: '/success',
        userId: 'user-1',
      })
    ).rejects.toThrow(StripeApiError)
    await expect(
      createCheckoutSession(mock as never, {
        cancelUrl: '/cancel',
        successUrl: '/success',
        userId: 'user-1',
      })
    ).rejects.toThrow('Failed to create checkout session')
  })

  it('wraps customer creation errors in StripeApiError', async () => {
    const { createCustomer, StripeApiError } = await import('$lib/server/billing/stripe')
    const mock = createMockStripe('customer', () => {
      throw new Error('Rate limited')
    })

    await expect(
      createCustomer(mock as never, {
        email: 'test@example.com',
        userId: 'user-1',
      })
    ).rejects.toThrow(StripeApiError)
  })

  it('wraps payment method listing errors in StripeApiError', async () => {
    const { listPaymentMethods, StripeApiError } = await import('$lib/server/billing/stripe')
    const mock = createMockStripe('paymentMethods', () => {
      throw new Error('Forbidden')
    })

    await expect(listPaymentMethods(mock as never, 'cus_123')).rejects.toThrow(StripeApiError)
  })

  it('wraps billing portal errors in StripeApiError', async () => {
    const { createBillingPortalSession, StripeApiError } =
      await import('$lib/server/billing/stripe')
    const mock = createMockStripe('portal', () => {
      throw new Error('Invalid customer')
    })

    await expect(
      createBillingPortalSession(mock as never, {
        customerId: 'cus_123',
        returnUrl: '/billing',
      })
    ).rejects.toThrow(StripeApiError)
  })
})

describe('Idempotency key support', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('passes idempotency key to checkout session', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'cs_1', url: 'https://stripe.com' })
    const mockStripe = { checkout: { sessions: { create: mockCreate } } }
    const { createCheckoutSession } = await import('$lib/server/billing/stripe')

    await createCheckoutSession(mockStripe as never, {
      cancelUrl: '/cancel',
      idempotencyKey: 'checkout-user-1-plan-pro',
      successUrl: '/success',
      userId: 'user-1',
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ idempotencyKey: 'checkout-user-1-plan-pro' })
    )
  })

  it('omits options when no idempotency key', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'cs_1', url: 'https://stripe.com' })
    const mockStripe = { checkout: { sessions: { create: mockCreate } } }
    const { createCheckoutSession } = await import('$lib/server/billing/stripe')

    await createCheckoutSession(mockStripe as never, {
      cancelUrl: '/cancel',
      successUrl: '/success',
      userId: 'user-1',
    })

    expect(mockCreate).toHaveBeenCalledWith(expect.any(Object), undefined)
  })

  it('passes idempotency key to customer creation', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'cus_1' })
    const mockStripe = { customers: { create: mockCreate } } as never
    const { createCustomer } = await import('$lib/server/billing/stripe')

    await createCustomer(mockStripe, {
      email: 'test@example.com',
      idempotencyKey: 'customer-user-1',
      userId: 'user-1',
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ idempotencyKey: 'customer-user-1' })
    )
  })
})

describe('coupons → discounts migration', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('uses discounts[] instead of coupons for checkout', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'cs_1', url: 'https://stripe.com' })
    const mockStripe = { checkout: { sessions: { create: mockCreate } } }
    const { createCheckoutSession } = await import('$lib/server/billing/stripe')

    await createCheckoutSession(mockStripe as never, {
      cancelUrl: '/cancel',
      couponId: 'coupon_50off',
      successUrl: '/success',
      userId: 'user-1',
    })

    const callArgs = mockCreate.mock.calls[0][0] as Record<string, unknown>
    expect(callArgs.discounts).toEqual([{ coupon: 'coupon_50off' }])
    expect(callArgs.coupons).toBeUndefined()
  })

  it('omits discounts when no couponId', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'cs_1', url: 'https://stripe.com' })
    const mockStripe = { checkout: { sessions: { create: mockCreate } } }
    const { createCheckoutSession } = await import('$lib/server/billing/stripe')

    await createCheckoutSession(mockStripe as never, {
      cancelUrl: '/cancel',
      successUrl: '/success',
      userId: 'user-1',
    })

    const callArgs = mockCreate.mock.calls[0][0] as Record<string, unknown>
    expect(callArgs.discounts).toBeUndefined()
  })
})

describe('cancelStripeSubscription', () => {
  it('calls stripe.subscriptions.update with cancel_at_period_end: true', async () => {
    const { cancelStripeSubscription } = await import('$lib/server/billing/stripe')
    const mockUpdate = vi.fn().mockResolvedValue({ cancel_at_period_end: true })
    const mockStripe = { subscriptions: { update: mockUpdate } }

    const result = await cancelStripeSubscription(mockStripe as never, 'sub_123')

    expect(mockUpdate).toHaveBeenCalledWith('sub_123', { cancel_at_period_end: true })
    expect(result.cancelAtPeriodEnd).toBe(true)
  })

  it('wraps errors in StripeApiError', async () => {
    const { cancelStripeSubscription, StripeApiError } = await import('$lib/server/billing/stripe')
    const mockUpdate = vi.fn().mockRejectedValue(new Error('Stripe down'))
    const mockStripe = { subscriptions: { update: mockUpdate } }

    await expect(cancelStripeSubscription(mockStripe as never, 'sub_123')).rejects.toThrow(
      StripeApiError
    )
  })
})

describe('reactivateStripeSubscription', () => {
  it('calls stripe.subscriptions.update with cancel_at_period_end: false', async () => {
    const { reactivateStripeSubscription } = await import('$lib/server/billing/stripe')
    const mockUpdate = vi.fn().mockResolvedValue({ cancel_at_period_end: false })
    const mockStripe = { subscriptions: { update: mockUpdate } }

    const result = await reactivateStripeSubscription(mockStripe as never, 'sub_123')

    expect(mockUpdate).toHaveBeenCalledWith('sub_123', { cancel_at_period_end: false })
    expect(result.cancelAtPeriodEnd).toBe(false)
  })

  it('wraps errors in StripeApiError', async () => {
    const { reactivateStripeSubscription, StripeApiError } =
      await import('$lib/server/billing/stripe')
    const mockUpdate = vi.fn().mockRejectedValue(new Error('Stripe down'))
    const mockStripe = { subscriptions: { update: mockUpdate } }

    await expect(reactivateStripeSubscription(mockStripe as never, 'sub_123')).rejects.toThrow(
      StripeApiError
    )
  })
})
