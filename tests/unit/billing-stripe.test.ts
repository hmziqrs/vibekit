import { afterEach, describe, expect, it, vi } from 'vitest'

describe('billing stripe module', () => {
  afterEach(() => {
    vi.resetModules()
  })

  function createMockStripe(overrides: Record<string, unknown> = {}) {
    const checkoutCreate = vi.fn().mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
    })
    const portalCreate = vi.fn().mockResolvedValue({
      url: 'https://billing.stripe.com/portal',
    })
    const customerCreate = vi.fn().mockResolvedValue({
      id: 'cus_test_123',
    })
    const paymentMethodsList = vi.fn().mockResolvedValue({
      data: [
        {
          card: { brand: 'visa', exp_month: 12, exp_year: 2027, last4: '4242' },
          id: 'pm_test_1',
          type: 'card',
        },
      ],
    })
    const constructEvent = vi
      .fn()
      .mockReturnValue({ id: 'evt_test', type: 'checkout.session.completed' })

    return {
      billingPortal: { sessions: { create: portalCreate } },
      checkout: { sessions: { create: checkoutCreate } },
      customers: { create: customerCreate },
      paymentMethods: { list: paymentMethodsList },
      webhooks: { constructEvent },
      ...overrides,
    }
  }

  describe('createCheckoutSession', () => {
    it('creates a subscription checkout session', async () => {
      const mockStripe = createMockStripe()
      const { createCheckoutSession } = await import('$lib/server/billing/stripe')

      const result = await createCheckoutSession(mockStripe as any, {
        cancelUrl: 'https://app.test.com/cancel',
        mode: 'subscription',
        priceId: 'price_abc',
        successUrl: 'https://app.test.com/success',
        userId: 'user-1',
      })

      expect(result.sessionId).toBe('cs_test_123')
      expect(result.url).toBe('https://checkout.stripe.com/test')
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          client_reference_id: 'user-1',
          line_items: [{ price: 'price_abc', quantity: 1 }],
          mode: 'subscription',
        })
      )
    })

    it('creates session with customer email', async () => {
      const mockStripe = createMockStripe()
      const { createCheckoutSession } = await import('$lib/server/billing/stripe')

      await createCheckoutSession(mockStripe as any, {
        cancelUrl: '/cancel',
        customerEmail: 'user@test.com',
        mode: 'payment',
        successUrl: '/success',
        userId: 'user-1',
      })

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: 'user@test.com',
          mode: 'payment',
        })
      )
    })

    it('creates session with trial period', async () => {
      const mockStripe = createMockStripe()
      const { createCheckoutSession } = await import('$lib/server/billing/stripe')

      await createCheckoutSession(mockStripe as any, {
        cancelUrl: '/cancel',
        priceId: 'price_pro',
        successUrl: '/success',
        trialDays: 14,
        userId: 'user-1',
      })

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: { trial_period_days: 14 },
        })
      )
    })

    it('includes plan metadata when provided', async () => {
      const mockStripe = createMockStripe()
      const { createCheckoutSession } = await import('$lib/server/billing/stripe')

      await createCheckoutSession(mockStripe as any, {
        cancelUrl: '/cancel',
        planId: 'plan_pro',
        priceId: 'price_pro',
        successUrl: '/success',
        userId: 'user-1',
      })

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { planId: 'plan_pro' },
        })
      )
    })

    it('skips trial when trialDays is 0', async () => {
      const mockStripe = createMockStripe()
      const { createCheckoutSession } = await import('$lib/server/billing/stripe')

      await createCheckoutSession(mockStripe as any, {
        cancelUrl: '/cancel',
        priceId: 'price_pro',
        successUrl: '/success',
        trialDays: 0,
        userId: 'user-1',
      })

      const call = mockStripe.checkout.sessions.create.mock.calls[0][0]
      expect(call.subscription_data).toBeUndefined()
    })

    it('defaults to subscription mode', async () => {
      const mockStripe = createMockStripe()
      const { createCheckoutSession } = await import('$lib/server/billing/stripe')

      await createCheckoutSession(mockStripe as any, {
        cancelUrl: '/cancel',
        priceId: 'price_abc',
        successUrl: '/success',
        userId: 'user-1',
      })

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'subscription' })
      )
    })
  })

  describe('createBillingPortalSession', () => {
    it('creates a billing portal session', async () => {
      const mockStripe = createMockStripe()
      const { createBillingPortalSession } = await import('$lib/server/billing/stripe')

      const result = await createBillingPortalSession(mockStripe as any, {
        customerId: 'cus_123',
        returnUrl: 'https://app.test.com/billing',
      })

      expect(result.url).toBe('https://billing.stripe.com/portal')
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://app.test.com/billing',
      })
    })
  })

  describe('createCustomer', () => {
    it('creates a Stripe customer with user metadata', async () => {
      const mockStripe = createMockStripe()
      const { createCustomer } = await import('$lib/server/billing/stripe')

      const result = await createCustomer(mockStripe as any, {
        email: 'user@test.com',
        name: 'Test User',
        userId: 'user-1',
      })

      expect(result.customerId).toBe('cus_test_123')
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'user@test.com',
        metadata: { userId: 'user-1' },
        name: 'Test User',
      })
    })

    it('creates customer without name', async () => {
      const mockStripe = createMockStripe()
      const { createCustomer } = await import('$lib/server/billing/stripe')

      await createCustomer(mockStripe as any, {
        email: 'user@test.com',
        userId: 'user-1',
      })

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'user@test.com',
        metadata: { userId: 'user-1' },
        name: undefined,
      })
    })
  })

  describe('listPaymentMethods', () => {
    it('lists card payment methods for a customer', async () => {
      const mockStripe = createMockStripe()
      const { listPaymentMethods } = await import('$lib/server/billing/stripe')

      const result = await listPaymentMethods(mockStripe as any, 'cus_123')

      expect(result).toEqual([
        {
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2027,
          id: 'pm_test_1',
          last4: '4242',
          type: 'card',
        },
      ])
      expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        type: 'card',
      })
    })

    it('handles empty payment methods list', async () => {
      const mockStripe = createMockStripe({
        paymentMethods: {
          list: vi.fn().mockResolvedValue({ data: [] }),
        },
      })
      const { listPaymentMethods } = await import('$lib/server/billing/stripe')

      const result = await listPaymentMethods(mockStripe as any, 'cus_123')

      expect(result).toEqual([])
    })

    it('handles card with null fields', async () => {
      const mockStripe = createMockStripe({
        paymentMethods: {
          list: vi.fn().mockResolvedValue({
            data: [{ card: null, id: 'pm_null', type: 'card' }],
          }),
        },
      })
      const { listPaymentMethods } = await import('$lib/server/billing/stripe')

      const result = await listPaymentMethods(mockStripe as any, 'cus_123')

      expect(result).toEqual([
        {
          brand: null,
          expiryMonth: null,
          expiryYear: null,
          id: 'pm_null',
          last4: null,
          type: 'card',
        },
      ])
    })
  })

  describe('verifyWebhookSignature', () => {
    it('constructs and returns a webhook event', async () => {
      const mockStripe = createMockStripe()
      const { verifyWebhookSignature } = await import('$lib/server/billing/stripe')

      const result = await verifyWebhookSignature(mockStripe as any, {
        body: '{"type":"test"}',
        signature: 't=123,v1=abc',
        webhookSecret: 'whsec_test',
      })

      expect(result).toEqual({ id: 'evt_test', type: 'checkout.session.completed' })
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        '{"type":"test"}',
        't=123,v1=abc',
        'whsec_test'
      )
    })
  })
})
