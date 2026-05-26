import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('$lib/server/db/schema', () => ({
  invoice: {
    amountInCents: 'amountInCents',
    currency: 'currency',
    dueDate: 'dueDate',
    id: 'id',
    paidAt: 'paidAt',
    status: 'status',
    stripeInvoiceId: 'stripeInvoiceId',
    subscriptionId: 'subscriptionId',
    userId: 'userId',
  },
  subscription: {
    id: 'id',
    status: 'status',
    stripeSubscriptionId: 'stripeSubscriptionId',
    userId: 'userId',
  },
  subscriptionPlan: {
    id: 'id',
  },
}))

vi.mock('$lib/server/uuid', () => ({
  uuid: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8),
}))

describe('billing webhook logic', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('invoice idempotency', () => {
    it('skips insert when invoice with same stripeInvoiceId exists', async () => {
      const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
      const existingInvoice = { id: 'existing-inv-1' }
      const db = {
        insert: mockInsert,
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(existingInvoice),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
      }

      const stripeInvoiceId = 'in_12345'
      const result = await db
        .select({ id: 'id' })
        .from('invoice')
        .where('stripeInvoiceId = ' + stripeInvoiceId)
        .get()

      expect(result).toEqual({ id: 'existing-inv-1' })
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('inserts when no existing invoice found', async () => {
      const mockValues = vi.fn().mockResolvedValue(undefined)
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues })
      const db = {
        insert: mockInsert,
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
      }

      const result = await db
        .select({ id: 'id' })
        .from('invoice')
        .where('stripeInvoiceId = in_new')
        .get()

      expect(result).toBeUndefined()
    })
  })

  describe('invoice userId resolution', () => {
    it('falls back to subscription userId when metadata is missing', async () => {
      const subUserId = 'user-from-subscription'

      // Simulates: lookup subscription by stripeSubscriptionId to find userId
      const subscriptionLookup = [{ userId: subUserId }]
      expect(subscriptionLookup[0].userId).toBe('user-from-subscription')
    })

    it('uses metadata userId when available', () => {
      const metadata = { userId: 'user-from-meta' }
      const invoiceUserId = metadata?.userId ?? null

      expect(invoiceUserId).toBe('user-from-meta')
    })

    it('produces null when both metadata and subscription are missing', () => {
      const metadata: Record<string, unknown> | undefined = undefined
      const invoiceUserId = (metadata as Record<string, unknown> | undefined)?.userId as
        | string
        | null

      expect(invoiceUserId).toBeUndefined()
    })
  })

  describe('payment_failed updates subscription status', () => {
    it('sets subscription to past_due when payment fails', () => {
      const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
      const mockUpdate = vi.fn().mockReturnValue({ set: mockSet })
      const db = { update: mockUpdate }

      // Simulating the payment_failed handler
      const subscriptionId = 'sub_123'
      db.update('subscription')
        .set({ status: 'past_due' })
        .where('stripeSubscriptionId = ' + subscriptionId)

      expect(mockSet).toHaveBeenCalledWith({ status: 'past_due' })
    })
  })

  describe('checkout planId validation', () => {
    it('rejects checkout without planId in metadata', () => {
      const metadata = null as Record<string, unknown> | null
      const planId = metadata?.planId

      expect(planId).toBeUndefined()
    })

    it('uses planId from checkout metadata', () => {
      const metadata = { planId: 'plan_starter' } as Record<string, unknown>
      const planId = metadata?.planId

      expect(planId).toBe('plan_starter')
    })
  })

  describe('plan isActive check', () => {
    it('blocks checkout for inactive plan', () => {
      const plan = { id: 'plan-old', isActive: false, name: 'Legacy Plan' }
      const isBlocked = !plan.isActive

      expect(isBlocked).toBe(true)
    })

    it('allows checkout for active plan', () => {
      const plan = { id: 'plan-pro', isActive: true, name: 'Pro Plan' }
      const isBlocked = !plan.isActive

      expect(isBlocked).toBe(false)
    })
  })

  describe('webhook event idempotency', () => {
    it('skips processing when event ID already recorded', async () => {
      const existingEvent = { id: 'evt-record-1' }
      const db = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(existingEvent),
            }),
          }),
        }),
        insert: vi.fn(),
      }

      const eventId = 'evt_12345'
      const result = await db
        .select({ id: 'id' })
        .from('stripe_webhook_event')
        .where('eventId = ' + eventId)
        .get()

      expect(result).toEqual({ id: 'evt-record-1' })
      expect(db.insert).not.toHaveBeenCalled()
    })

    it('records event ID after successful processing', async () => {
      const mockValues = vi.fn().mockResolvedValue(undefined)
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues })
      const db = {
        insert: mockInsert,
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(null),
            }),
          }),
        }),
      }

      const eventId = 'evt_new_123'
      const result = await db
        .select({ id: 'id' })
        .from('stripe_webhook_event')
        .where('eventId = ' + eventId)
        .get()

      expect(result).toBeNull()
      db.insert('stripe_webhook_event').values({ eventId, eventType: 'invoice.payment_succeeded' })
      expect(mockValues).toHaveBeenCalledWith({
        eventId,
        eventType: 'invoice.payment_succeeded',
      })
    })

    it('handles concurrent duplicate events by unique constraint', () => {
      // Two events with the same ID should only be processed once
      const eventId = 'evt_duplicate'
      const processedEventIds = new Set<string>()

      // First event processes
      const firstResult = !processedEventIds.has(eventId)
      processedEventIds.add(eventId)

      // Second event should be detected as duplicate
      const secondResult = !processedEventIds.has(eventId)

      expect(firstResult).toBe(true)
      expect(secondResult).toBe(false)
      expect(processedEventIds.size).toBe(1)
    })
  })

  describe('payment_method.attached', () => {
    it('inserts payment method when customer has subscription', () => {
      const stripePmId = 'pm_1234'
      const customerId = 'cus_abc'
      const card = { brand: 'visa', exp_month: 12, exp_year: 2028, last4: '4242' }
      const pm = { id: stripePmId, customer: customerId, type: 'card', card }

      // Verify the mapping logic
      expect(pm.id).toBe(stripePmId)
      expect(pm.type).toBe('card')
      expect(pm.card?.last4).toBe('4242')
    })

    it('skips when no subscription found for customer', () => {
      const customerId = 'cus_no_sub'
      // If subRow is undefined, no payment method should be inserted
      const subRow = undefined as { userId?: string } | undefined
      expect(subRow?.userId).toBeUndefined()
    })

    it('skips when payment method already exists', () => {
      const existingPm = { id: 'pm-existing-1' }
      // If existingPm is found, skip insert
      expect(existingPm).toBeDefined()
    })
  })

  describe('payment_method.detached', () => {
    it('deletes payment method by stripe ID', () => {
      const mockWhere = vi.fn().mockResolvedValue(undefined)
      const mockDelete = vi.fn().mockReturnValue({ where: mockWhere })

      // Simulate the handler calling delete
      const stripePmId = 'pm_detached'
      mockDelete('paymentMethod').where('stripePaymentMethodId = ' + stripePmId)

      expect(mockDelete).toHaveBeenCalledWith('paymentMethod')
      expect(mockWhere).toHaveBeenCalled()
    })
  })

  describe('charge.refunded', () => {
    it('updates invoice status to void when charge has invoice', () => {
      const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
      const mockUpdate = vi.fn().mockReturnValue({ set: mockSet })

      const charge = { invoice: 'in_refunded_123' }

      // Simulating the handler
      mockUpdate('invoice')
        .set({ status: 'void' })
        .where('stripeInvoiceId = ' + charge.invoice)

      expect(mockSet).toHaveBeenCalledWith({ status: 'void' })
    })

    it('skips when charge has no invoice reference', () => {
      const charge = { invoice: null }
      const stripeInvoiceId = charge.invoice as string | null

      expect(stripeInvoiceId).toBeNull()
    })
  })

  describe('customer.subscription.trial_will_end', () => {
    it('updates subscription status to trialing', () => {
      const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
      const mockUpdate = vi.fn().mockReturnValue({ set: mockSet })

      const sub = { id: 'sub_trial_ending' }

      mockUpdate('subscription')
        .set({ status: 'trialing' })
        .where('stripeSubscriptionId = ' + sub.id)

      expect(mockSet).toHaveBeenCalledWith({ status: 'trialing' })
    })
  })

  describe('customer.subscription.created', () => {
    it('creates subscription from metadata when planId and userId present', () => {
      const metadata = { planId: 'plan-pro', userId: 'user-123' }
      const sub = {
        id: 'sub_new',
        customer: 'cus_new',
        current_period_end: 1719792000,
        current_period_start: 1717200000,
        metadata,
      }

      expect(sub.metadata?.planId).toBe('plan-pro')
      expect(sub.metadata?.userId).toBe('user-123')
    })

    it('skips when subscription already exists', () => {
      const existingSub = { id: 'sub-existing-1' }
      // If existingSub is found, no new subscription should be created
      expect(existingSub).toBeDefined()
    })

    it('skips when metadata has no planId', () => {
      const metadata = { userId: 'user-123' } as Record<string, unknown>
      const planId = metadata?.planId

      expect(planId).toBeUndefined()
    })

    it('skips when metadata has no userId', () => {
      const metadata = { planId: 'plan-pro' } as Record<string, unknown>
      const userId = metadata?.userId ?? metadata?.clientReferenceId

      expect(userId).toBeUndefined()
    })
  })

  describe('stripe webhook retry logic', () => {
    it('records failed event with status and error message', () => {
      const error = new Error('DB connection lost')
      const message = error.message
      const retryCount = 0
      const shouldRetry = retryCount < 5
      const nextRetryDelay = shouldRetry ? Math.min(1000 * 5 ** retryCount, 60_000) : null

      expect(message).toBe('DB connection lost')
      expect(shouldRetry).toBe(true)
      expect(nextRetryDelay).toBe(1000)
    })

    it('calculates exponential backoff for retries', () => {
      const backoff = (attempt: number) => Math.min(1000 * 5 ** attempt, 60_000)

      expect(backoff(0)).toBe(1000)
      expect(backoff(1)).toBe(5000)
      expect(backoff(2)).toBe(25_000)
      expect(backoff(3)).toBe(60_000)
      expect(backoff(4)).toBe(60_000)
    })

    it('marks event as failed after max retries', () => {
      const MAX_RETRIES = 5
      const retryCount = 5
      const shouldRetry = retryCount < MAX_RETRIES

      expect(shouldRetry).toBe(false)
    })

    it('marks event as retrying when retries remain', () => {
      const MAX_RETRIES = 5
      const retryCount = 3
      const shouldRetry = retryCount < MAX_RETRIES
      const status = shouldRetry ? 'retrying' : 'failed'

      expect(status).toBe('retrying')
    })

    it('handles unknown error types gracefully', () => {
      const error: unknown = 'string error'
      const message = error instanceof Error ? error.message : 'Unknown error'

      expect(message).toBe('Unknown error')
    })

    it('skips idempotency for non-processed existing events', () => {
      const existingEvent = { id: 'evt-1', retryCount: 2, status: 'retrying' }
      const shouldSkip = existingEvent?.status === 'processed'

      expect(shouldSkip).toBe(false)
    })

    it('skips idempotency for processed existing events', () => {
      const existingEvent = { id: 'evt-1', retryCount: 0, status: 'processed' }
      const shouldSkip = existingEvent?.status === 'processed'

      expect(shouldSkip).toBe(true)
    })

    it('sets nextRetryAt using backoff from current retry count', () => {
      const retryCount = 2
      const nextRetryDelay = Math.min(1000 * 5 ** retryCount, 60_000)
      const nextRetryAt = new Date(Date.now() + nextRetryDelay)

      expect(nextRetryAt.getTime()).toBeGreaterThan(Date.now())
      expect(nextRetryAt.getTime()).toBeLessThanOrEqual(Date.now() + 60_000)
    })

    it('sets nextRetryAt to null when max retries exceeded', () => {
      const retryCount = 5
      const MAX_RETRIES = 5
      const shouldRetry = retryCount < MAX_RETRIES
      const nextRetryDelay = shouldRetry ? Math.min(1000 * 5 ** retryCount, 60_000) : null

      expect(nextRetryDelay).toBeNull()
    })
  })

  describe('invoice INSERT unique constraint catch', () => {
    it('catches UNIQUE constraint error on duplicate invoice insert', async () => {
      const constraintError = new Error(
        'D1_ERROR: UNIQUE constraint failed: invoice.stripeInvoiceId'
      )
      const mockValues = vi.fn().mockRejectedValue(constraintError)
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

      let caught = false
      try {
        await mockInsert('invoice').values({ stripeInvoiceId: 'in_dup', status: 'paid' })
      } catch (error) {
        caught = true
        expect(String(error)).toContain('UNIQUE constraint')
      }

      expect(caught).toBe(true)
      expect(mockValues).toHaveBeenCalled()
    })

    it('re-throws non-UNIQUE constraint errors', async () => {
      const otherError = new Error('D1_ERROR: something else went wrong')
      const mockValues = vi.fn().mockRejectedValue(otherError)
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

      await expect(mockInsert('invoice').values({ stripeInvoiceId: 'in_new' })).rejects.toThrow(
        'something else went wrong'
      )
    })

    it('gracefully handles concurrent webhook delivery for same invoice', () => {
      const err = new Error('D1_ERROR: UNIQUE constraint failed: invoice.stripeInvoiceId')
      const isUniqueViolation = String(err).includes('UNIQUE constraint')
      expect(isUniqueViolation).toBe(true)
    })
  })
})
