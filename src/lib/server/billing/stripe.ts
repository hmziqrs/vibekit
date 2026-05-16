// oxlint-disable-next-line import/no-named-as-default
import type Stripe from 'stripe'

export class StripeApiError extends Error {
  constructor(
    message: string,
    public readonly cause: unknown
  ) {
    super(message)
    this.name = 'StripeApiError'
  }
}

let _stripe: Stripe | null = null
let _cachedKey: string | null = null

export function getStripeClient(secretKey?: string): Stripe | null {
  if (!secretKey) return null
  if (!_stripe || _cachedKey !== secretKey) {
    const Stripe = require('stripe')
    _stripe = new Stripe(secretKey, { apiVersion: '2025-04-30.basil' })
    _cachedKey = secretKey
  }
  return _stripe
}

export function resetStripeClient(): void {
  _stripe = null
  _cachedKey = null
}

export function isSameOrigin(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url, origin)
    return parsed.origin === origin
  } catch {
    return false
  }
}

export function isSafeRedirectUrl(url: string): boolean {
  const isRelative = url.startsWith('/') && !url.startsWith('//')
  return isRelative
}

export async function createCheckoutSession(
  stripe: Stripe,
  input: {
    automaticTax?: boolean
    cancelUrl: string
    couponId?: string
    customerEmail?: string
    customerId?: string
    idempotencyKey?: string
    metadata?: Record<string, string>
    mode?: 'payment' | 'subscription'
    planId?: string
    priceId?: string
    successUrl: string
    trialDays?: number
    userId: string
  }
) {
  try {
    const metadata = { ...input.metadata }
    if (input.planId) metadata.planId = input.planId
    const session = await stripe.checkout.sessions.create(
      {
        automatic_tax: input.automaticTax ? { enabled: true } : undefined,
        cancel_url: input.cancelUrl,
        client_reference_id: input.userId,
        customer: input.customerId ?? undefined,
        customer_email: input.customerEmail,
        discounts: input.couponId ? [{ coupon: input.couponId }] : undefined,
        line_items: input.priceId ? [{ price: input.priceId, quantity: 1 }] : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        mode: input.mode ?? 'subscription',
        subscription_data:
          input.trialDays && input.trialDays > 0
            ? { trial_period_days: input.trialDays }
            : undefined,
        success_url: input.successUrl,
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    )

    return { sessionId: session.id, url: session.url }
  } catch (error) {
    throw new StripeApiError('Failed to create checkout session', error)
  }
}

export async function createBillingPortalSession(
  stripe: Stripe,
  input: {
    customerId: string
    returnUrl: string
  }
) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    })

    return { url: session.url }
  } catch (error) {
    throw new StripeApiError('Failed to create billing portal session', error)
  }
}

export async function createCustomer(
  stripe: Stripe,
  input: { email: string; idempotencyKey?: string; name?: string; userId: string }
) {
  try {
    const customer = await stripe.customers.create(
      {
        email: input.email,
        metadata: { userId: input.userId },
        name: input.name,
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    )

    return { customerId: customer.id }
  } catch (error) {
    throw new StripeApiError('Failed to create Stripe customer', error)
  }
}

export async function listPaymentMethods(stripe: Stripe, customerId: string) {
  try {
    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    return methods.data.map((pm) => ({
      brand: pm.card?.brand ?? null,
      expiryMonth: pm.card?.exp_month ?? null,
      expiryYear: pm.card?.exp_year ?? null,
      id: pm.id,
      last4: pm.card?.last4 ?? null,
      type: pm.type === 'card' ? ('card' as const) : ('bank_transfer' as const),
    }))
  } catch (error) {
    throw new StripeApiError('Failed to list payment methods', error)
  }
}

export async function verifyWebhookSignature(
  stripe: Stripe,
  input: { body: string | Buffer; signature: string; webhookSecret: string }
) {
  try {
    const event = stripe.webhooks.constructEvent(input.body, input.signature, input.webhookSecret)
    return event
  } catch (error) {
    throw new StripeApiError('Webhook signature verification failed', error)
  }
}

export async function createStripeCoupon(
  stripe: Stripe,
  input: {
    duration?: 'forever' | 'once' | 'repeating'
    durationInMonths?: number
    idempotencyKey?: string
    maxRedemptions?: number
    name: string
    percentOff: number
    redeemBy?: number
  }
) {
  try {
    const coupon = await stripe.coupons.create(
      {
        duration: input.duration ?? 'once',
        duration_in_months: input.durationInMonths,
        max_redemptions: input.maxRedemptions,
        name: input.name,
        percent_off: input.percentOff,
        redeem_by: input.redeemBy,
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    )
    return { stripeCouponId: coupon.id }
  } catch (error) {
    throw new StripeApiError('Failed to create Stripe coupon', error)
  }
}

export async function cancelStripeSubscription(stripe: Stripe, stripeSubscriptionId: string) {
  try {
    const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
    return { cancelAtPeriodEnd: updated.cancel_at_period_end }
  } catch (error) {
    throw new StripeApiError('Failed to cancel Stripe subscription', error)
  }
}

export async function reactivateStripeSubscription(stripe: Stripe, stripeSubscriptionId: string) {
  try {
    const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    })
    return { cancelAtPeriodEnd: updated.cancel_at_period_end }
  } catch (error) {
    throw new StripeApiError('Failed to reactivate Stripe subscription', error)
  }
}

export async function reportMeteredUsage(
  stripe: Stripe,
  stripeSubscriptionItemId: string,
  quantity: number,
  timestamp: number
) {
  try {
    return await stripe.subscriptionItems.createUsageRecord(stripeSubscriptionItemId, {
      action: 'set',
      quantity,
      timestamp,
    })
  } catch (error) {
    throw new StripeApiError('Failed to report metered usage to Stripe', error)
  }
}
