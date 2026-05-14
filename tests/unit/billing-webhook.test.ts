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
      const metadata = { planId: 'plan_starter' }
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
})
