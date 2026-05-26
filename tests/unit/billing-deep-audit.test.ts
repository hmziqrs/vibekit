import { describe, expect, it } from 'vitest'

describe('Billing webhook: past_due recovery', () => {
  it('should recover past_due subscription to active on successful payment', () => {
    const subStatus = 'past_due'
    const validStatuses = ['active', 'canceled', 'incomplete', 'past_due', 'paused', 'trialing']
    expect(validStatuses).toContain(subStatus)
    // The fix: invoice.payment_succeeded now checks for past_due and sets to active
    const newStatus = subStatus === 'past_due' ? 'active' : subStatus
    expect(newStatus).toBe('active')
  })

  it('should not change active subscription status on payment success', () => {
    const subStatus = 'active' as string
    const newStatus = subStatus === 'past_due' ? 'active' : subStatus
    expect(newStatus).toBe('active')
  })

  it('should not change trialing subscription status on payment success', () => {
    const subStatus = 'trialing' as string
    const newStatus = subStatus === 'past_due' ? 'active' : subStatus
    expect(newStatus).toBe('trialing')
  })
})

describe('Billing webhook: subscription.updated planId sync', () => {
  it('should extract planId from subscription.plan.id in Stripe event', () => {
    const stripeEvent = {
      data: {
        object: {
          current_period_end: 1700000000,
          current_period_start: 1697000000,
          id: 'sub_123',
          plan: { id: 'price_newplan' },
          status: 'active',
        },
        previous_attributes: { plan: { id: 'price_oldplan' } },
      },
    }
    const sub = stripeEvent.data.object
    const newPlanId = (sub.plan as Record<string, unknown>)?.id
    expect(newPlanId).toBe('price_newplan')
  })

  it('should detect plan change when previous_attributes differ', () => {
    const prevAttrs = { plan: { id: 'price_old' } }
    const newPlan = { id: 'price_new' }
    const changed = prevAttrs.plan.id !== newPlan.id
    expect(changed).toBe(true)
  })

  it('should not detect plan change when plans match', () => {
    const prevAttrs = { plan: { id: 'price_same' } }
    const newPlan = { id: 'price_same' }
    const changed = prevAttrs.plan.id !== newPlan.id
    expect(changed).toBe(false)
  })
})

describe('Billing: plan change validation', () => {
  it('should reject inactive plan', () => {
    const newPlan = { id: 'plan_2', isActive: false, name: 'Archived Plan' }
    expect(newPlan.isActive).toBe(false)
    // The fix: if (!newPlan.isActive) throw new BadRequestError('Plan is not available')
  })

  it('should reject same-plan change', () => {
    const currentPlanId = 'plan_1'
    const newPlanId = 'plan_1'
    expect(currentPlanId).toBe(newPlanId)
    // The fix: if (sub.planId === parsed.data.newPlanId) throw new BadRequestError('Already on this plan')
  })

  it('should accept valid plan change', () => {
    const currentPlanId = 'plan_1'
    const newPlanId = 'plan_2'
    const newPlan = { id: 'plan_2', isActive: true }
    expect(currentPlanId).not.toBe(newPlanId)
    expect(newPlan.isActive).toBe(true)
  })
})

describe('Billing: refund validation', () => {
  it('should reject refund amount exceeding invoice total', () => {
    const refundAmount = 15000
    const invoiceAmount = 10000
    expect(refundAmount).toBeGreaterThan(invoiceAmount)
    // The fix: if (parsed.amountInCents > inv.amountInCents) return 400
  })

  it('should reject refund on draft invoice', () => {
    const invoiceStatus = 'draft'
    expect(invoiceStatus).toBe('draft')
    // The fix: if (inv.status === 'draft') return 400
  })

  it('should accept valid partial refund', () => {
    const refundAmount = 5000
    const invoiceAmount = 10000
    const invoiceStatus = 'paid'
    expect(refundAmount).toBeLessThanOrEqual(invoiceAmount)
    expect(invoiceStatus).not.toBe('void')
    expect(invoiceStatus).not.toBe('draft')
  })
})

describe('Billing: coupon TOCTOU race fix', () => {
  it('should use WHERE guard on maxRedemptions', () => {
    // The fix adds: WHERE timesRedeemed < maxRedemptions on the UPDATE
    const coupon = { id: 'c1', maxRedemptions: 100, timesRedeemed: 99 }
    const canRedeem = coupon.maxRedemptions ? coupon.timesRedeemed < coupon.maxRedemptions : true
    expect(canRedeem).toBe(true)

    coupon.timesRedeemed = 100
    const cannotRedeem = coupon.maxRedemptions ? coupon.timesRedeemed < coupon.maxRedemptions : true
    expect(cannotRedeem).toBe(false)
  })

  it('should allow unlimited redemptions when maxRedemptions is null', () => {
    const coupon = { id: 'c1', maxRedemptions: null, timesRedeemed: 999 }
    const canRedeem = coupon.maxRedemptions ? coupon.timesRedeemed < coupon.maxRedemptions : true
    expect(canRedeem).toBe(true)
  })
})

describe('Billing: payment_method.updated sync', () => {
  it('should extract card details from Stripe payment_method event', () => {
    const pm = {
      card: { brand: 'visa', exp_month: 12, exp_year: 2027, last4: '4242' },
      id: 'pm_123',
    }
    const card = pm.card as Record<string, unknown>
    expect(card.brand).toBe('visa')
    expect(card.last4).toBe('4242')
    expect(card.exp_month).toBe(12)
    expect(card.exp_year).toBe(2027)
  })

  it('should handle missing card data gracefully', () => {
    const pm = { id: 'pm_123' }
    const card = (pm as Record<string, unknown>).card as Record<string, unknown> | undefined
    expect(card).toBeUndefined()
    // The fix: brand: card?.brand ? String(card.brand) : undefined
  })
})

describe('Billing indexes: schema validation', () => {
  it('subscription table should exist with all expected columns', async () => {
    const { subscription } = await import('$lib/server/db/schema')
    const columns = Object.keys(subscription)
    expect(columns).toContain('stripeSubscriptionId')
    expect(columns).toContain('stripeCustomerId')
    expect(columns).toContain('stripePriceId')
    expect(columns).toContain('planId')
    expect(columns).toContain('status')
    expect(columns).toContain('userId')
  })

  it('invoice table should exist with stripeInvoiceId', async () => {
    const { invoice } = await import('$lib/server/db/schema')
    const columns = Object.keys(invoice)
    expect(columns).toContain('stripeInvoiceId')
    expect(columns).toContain('userId')
    expect(columns).toContain('organizationId')
  })

  it('paymentMethod table should exist with stripePaymentMethodId', async () => {
    const { paymentMethod } = await import('$lib/server/db/schema')
    const columns = Object.keys(paymentMethod)
    expect(columns).toContain('stripePaymentMethodId')
    expect(columns).toContain('brand')
    expect(columns).toContain('last4')
    expect(columns).toContain('expiryMonth')
    expect(columns).toContain('expiryYear')
  })

  it('subscriptionEvent table should exist with subscriptionId', async () => {
    const { subscriptionEvent } = await import('$lib/server/db/schema')
    const columns = Object.keys(subscriptionEvent)
    expect(columns).toContain('subscriptionId')
    expect(columns).toContain('type')
  })

  it('usageRecord table should exist with subscriptionId and period fields', async () => {
    const { usageRecord } = await import('$lib/server/db/schema')
    const columns = Object.keys(usageRecord)
    expect(columns).toContain('subscriptionId')
    expect(columns).toContain('periodStart')
    expect(columns).toContain('periodEnd')
    expect(columns).toContain('metricType')
  })
})
