// oxlint-disable-next-line import/no-named-as-default
import type Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripeClient(secretKey?: string): Stripe | null {
  if (!secretKey) return null
  if (!_stripe) {
    const Stripe = require('stripe')
    _stripe = new Stripe(secretKey, { apiVersion: '2025-04-30.basil' })
  }
  return _stripe
}

export function resetStripeClient(): void {
  _stripe = null
}

export async function createCheckoutSession(
  stripe: Stripe,
  input: {
    cancelUrl: string
    customerEmail?: string
    customerId?: string
    mode?: 'payment' | 'subscription'
    planId?: string
    priceId?: string
    successUrl: string
    trialDays?: number
    userId: string
  }
) {
  const session = await stripe.checkout.sessions.create({
    cancel_url: input.cancelUrl,
    client_reference_id: input.userId,
    customer: input.customerId ?? undefined,
    customer_email: input.customerEmail,
    line_items: input.priceId ? [{ price: input.priceId, quantity: 1 }] : undefined,
    metadata: input.planId ? { planId: input.planId } : undefined,
    mode: input.mode ?? 'subscription',
    subscription_data:
      input.trialDays && input.trialDays > 0 ? { trial_period_days: input.trialDays } : undefined,
    success_url: input.successUrl,
  })

  return { sessionId: session.id, url: session.url }
}

export async function createBillingPortalSession(
  stripe: Stripe,
  input: {
    customerId: string
    returnUrl: string
  }
) {
  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  })

  return { url: session.url }
}

export async function createCustomer(
  stripe: Stripe,
  input: { email: string; name?: string; userId: string }
) {
  const customer = await stripe.customers.create({
    email: input.email,
    metadata: { userId: input.userId },
    name: input.name,
  })

  return { customerId: customer.id }
}

export async function listPaymentMethods(stripe: Stripe, customerId: string) {
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
}

export async function verifyWebhookSignature(
  stripe: Stripe,
  input: { body: string | Buffer; signature: string; webhookSecret: string }
) {
  const event = stripe.webhooks.constructEvent(input.body, input.signature, input.webhookSecret)
  return event
}
