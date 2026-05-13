import { describe, expect, it, vi } from 'vitest'

const mockConstructEvent = vi.fn()
const mockCreateSession = vi.fn()
const mockCreatePortalSession = vi.fn()
const mockCreateCustomer = vi.fn()
const mockListPaymentMethods = vi.fn()

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(function (this: unknown) {
    return {
      billingPortal: { sessions: { create: mockCreatePortalSession } },
      checkout: { sessions: { create: mockCreateSession } },
      customers: { create: mockCreateCustomer },
      paymentMethods: { list: mockListPaymentMethods },
      webhooks: { constructEvent: mockConstructEvent },
    }
  }),
}))

function createMockStripe() {
  return {
    billingPortal: { sessions: { create: mockCreatePortalSession } },
    checkout: { sessions: { create: mockCreateSession } },
    customers: { create: mockCreateCustomer },
    paymentMethods: { list: mockListPaymentMethods },
    webhooks: { constructEvent: mockConstructEvent },
  } as never
}

beforeEach(() => {
  mockCreateSession.mockClear()
  mockCreatePortalSession.mockClear()
  mockCreateCustomer.mockClear()
  mockListPaymentMethods.mockClear()
  mockConstructEvent.mockClear()
})

describe('billing/stripe module', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports all required functions', async () => {
    const mod = await import('$lib/server/billing/stripe')
    expect(typeof mod.getStripeClient).toBe('function')
    expect(typeof mod.resetStripeClient).toBe('function')
    expect(typeof mod.createCheckoutSession).toBe('function')
    expect(typeof mod.createBillingPortalSession).toBe('function')
    expect(typeof mod.createCustomer).toBe('function')
    expect(typeof mod.listPaymentMethods).toBe('function')
    expect(typeof mod.verifyWebhookSignature).toBe('function')
  })
})

describe('getStripeClient', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns null when no secret key provided', async () => {
    const { getStripeClient, resetStripeClient } = await import('$lib/server/billing/stripe')
    resetStripeClient()
    expect(getStripeClient()).toBeNull()
  })

  it('returns null when secret key is empty string', async () => {
    const { getStripeClient, resetStripeClient } = await import('$lib/server/billing/stripe')
    resetStripeClient()
    expect(getStripeClient('')).toBeNull()
  })

  it('creates a client when secret key is provided', async () => {
    const { getStripeClient, resetStripeClient } = await import('$lib/server/billing/stripe')
    resetStripeClient()
    const client = getStripeClient('sk_test_123')
    expect(client).toBeDefined()
    expect(client).not.toBeNull()
  })

  it('returns same instance on subsequent calls', async () => {
    const { getStripeClient, resetStripeClient } = await import('$lib/server/billing/stripe')
    resetStripeClient()
    const a = getStripeClient('sk_test_456')
    const b = getStripeClient('sk_test_456')
    expect(a).toBe(b)
  })

  it('resetStripeClient clears the singleton', async () => {
    const { getStripeClient, resetStripeClient } = await import('$lib/server/billing/stripe')
    resetStripeClient()
    const a = getStripeClient('sk_test_789')
    resetStripeClient()
    const b = getStripeClient('sk_test_789')
    expect(b).toBeDefined()
  })
})

describe('createCheckoutSession', () => {
  it('creates session with correct parameters', async () => {
    const { createCheckoutSession } = await import('$lib/server/billing/stripe')
    mockCreateSession.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
    })

    const result = await createCheckoutSession(createMockStripe(), {
      cancelUrl: 'https://app.com/cancel',
      mode: 'subscription',
      priceId: 'price_123',
      successUrl: 'https://app.com/success',
      userId: 'user-1',
    })

    expect(result.sessionId).toBe('cs_test_123')
    expect(result.url).toBe('https://checkout.stripe.com/test')
    const callArgs = mockCreateSession.mock.calls[0][0]
    expect(callArgs.mode).toBe('subscription')
    expect(callArgs.line_items).toEqual([{ price: 'price_123', quantity: 1 }])
    expect(callArgs.client_reference_id).toBe('user-1')
  })

  it('includes subscription_data when trialDays > 0', async () => {
    const { createCheckoutSession } = await import('$lib/server/billing/stripe')
    mockCreateSession.mockResolvedValue({ id: 'cs_test', url: 'https://stripe.com' })

    await createCheckoutSession(createMockStripe(), {
      cancelUrl: 'https://cancel',
      priceId: 'price_abc',
      successUrl: 'https://success',
      trialDays: 14,
      userId: 'user-2',
    })

    expect(mockCreateSession.mock.calls[0][0].subscription_data).toEqual({
      trial_period_days: 14,
    })
  })

  it('omits subscription_data when trialDays is 0', async () => {
    const { createCheckoutSession } = await import('$lib/server/billing/stripe')
    mockCreateSession.mockResolvedValue({ id: 'cs_test', url: 'https://stripe.com' })

    await createCheckoutSession(createMockStripe(), {
      cancelUrl: 'https://cancel',
      priceId: 'price_abc',
      successUrl: 'https://success',
      trialDays: 0,
      userId: 'user-3',
    })

    expect(mockCreateSession.mock.calls[0][0].subscription_data).toBeUndefined()
  })

  it('defaults mode to subscription', async () => {
    const { createCheckoutSession } = await import('$lib/server/billing/stripe')
    mockCreateSession.mockResolvedValue({ id: 'cs_test', url: 'https://stripe.com' })

    await createCheckoutSession(createMockStripe(), {
      cancelUrl: 'https://cancel',
      successUrl: 'https://success',
      userId: 'user-4',
    })

    expect(mockCreateSession.mock.calls[0][0].mode).toBe('subscription')
  })

  it('passes customer email when provided', async () => {
    const { createCheckoutSession } = await import('$lib/server/billing/stripe')
    mockCreateSession.mockResolvedValue({ id: 'cs_test', url: 'https://stripe.com' })

    await createCheckoutSession(createMockStripe(), {
      cancelUrl: 'https://cancel',
      customerEmail: 'test@example.com',
      successUrl: 'https://success',
      userId: 'user-5',
    })

    expect(mockCreateSession.mock.calls[0][0].customer_email).toBe('test@example.com')
  })
})

describe('createBillingPortalSession', () => {
  it('creates portal session with correct parameters', async () => {
    const { createBillingPortalSession } = await import('$lib/server/billing/stripe')
    mockCreatePortalSession.mockResolvedValue({ url: 'https://billing.stripe.com/portal' })

    const result = await createBillingPortalSession(createMockStripe(), {
      customerId: 'cus_123',
      returnUrl: 'https://app.com/settings',
    })

    expect(result.url).toBe('https://billing.stripe.com/portal')
    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      customer: 'cus_123',
      return_url: 'https://app.com/settings',
    })
  })
})

describe('createCustomer', () => {
  it('creates customer with email and userId metadata', async () => {
    const { createCustomer } = await import('$lib/server/billing/stripe')
    mockCreateCustomer.mockResolvedValue({ id: 'cus_new' })

    const result = await createCustomer(createMockStripe(), {
      email: 'new@example.com',
      userId: 'user-10',
    })

    expect(result.customerId).toBe('cus_new')
    expect(mockCreateCustomer).toHaveBeenCalledWith({
      email: 'new@example.com',
      metadata: { userId: 'user-10' },
      name: undefined,
    })
  })

  it('includes name when provided', async () => {
    const { createCustomer } = await import('$lib/server/billing/stripe')
    mockCreateCustomer.mockResolvedValue({ id: 'cus_named' })

    await createCustomer(createMockStripe(), {
      email: 'named@example.com',
      name: 'John Doe',
      userId: 'user-11',
    })

    expect(mockCreateCustomer).toHaveBeenCalledWith(expect.objectContaining({ name: 'John Doe' }))
  })
})

describe('listPaymentMethods', () => {
  it('maps payment methods to normalized shape', async () => {
    const { listPaymentMethods } = await import('$lib/server/billing/stripe')
    mockListPaymentMethods.mockResolvedValue({
      data: [
        {
          card: { brand: 'visa', exp_month: 12, exp_year: 2027, last4: '4242' },
          id: 'pm_1',
          type: 'card',
        },
      ],
    })

    const methods = await listPaymentMethods(createMockStripe(), 'cus_123')

    expect(methods).toHaveLength(1)
    expect(methods[0]).toEqual({
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2027,
      id: 'pm_1',
      last4: '4242',
      type: 'card',
    })
  })

  it('handles missing card details gracefully', async () => {
    const { listPaymentMethods } = await import('$lib/server/billing/stripe')
    mockListPaymentMethods.mockResolvedValue({
      data: [{ card: undefined, id: 'pm_2', type: 'card' }],
    })

    const methods = await listPaymentMethods(createMockStripe(), 'cus_456')

    expect(methods[0].brand).toBeNull()
    expect(methods[0].last4).toBeNull()
  })

  it('returns empty array when no payment methods', async () => {
    const { listPaymentMethods } = await import('$lib/server/billing/stripe')
    mockListPaymentMethods.mockResolvedValue({ data: [] })

    const methods = await listPaymentMethods(createMockStripe(), 'cus_empty')
    expect(methods).toEqual([])
  })
})

describe('verifyWebhookSignature', () => {
  it('calls constructEvent with correct arguments', async () => {
    const { verifyWebhookSignature } = await import('$lib/server/billing/stripe')
    const mockEvent = { type: 'checkout.session.completed' }
    mockConstructEvent.mockReturnValue(mockEvent)

    const event = await verifyWebhookSignature(createMockStripe(), {
      body: '{"type":"test"}',
      signature: 'sig_header_value',
      webhookSecret: 'whsec_123',
    })

    expect(mockConstructEvent).toHaveBeenCalledWith(
      '{"type":"test"}',
      'sig_header_value',
      'whsec_123'
    )
    expect(event).toEqual(mockEvent)
  })

  it('throws when signature is invalid', async () => {
    const { verifyWebhookSignature } = await import('$lib/server/billing/stripe')
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    await expect(
      verifyWebhookSignature(createMockStripe(), {
        body: 'body',
        signature: 'bad_sig',
        webhookSecret: 'whsec_123',
      })
    ).rejects.toThrow('Invalid signature')
  })

  it('throws when webhook secret is wrong', async () => {
    const { verifyWebhookSignature } = await import('$lib/server/billing/stripe')
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature')
    })

    await expect(
      verifyWebhookSignature(createMockStripe(), {
        body: 'body',
        signature: 'sig',
        webhookSecret: 'wrong_secret',
      })
    ).rejects.toThrow('No signatures found')
  })

  it('returns event data for valid signature', async () => {
    const { verifyWebhookSignature } = await import('$lib/server/billing/stripe')
    const event = {
      data: { object: { id: 'evt_123' } },
      type: 'invoice.payment_succeeded',
    }
    mockConstructEvent.mockReturnValue(event)

    const result = await verifyWebhookSignature(createMockStripe(), {
      body: 'raw_body',
      signature: 'valid_sig',
      webhookSecret: 'whsecret',
    })

    expect(result.type).toBe('invoice.payment_succeeded')
    expect(result.data.object.id).toBe('evt_123')
  })
})
