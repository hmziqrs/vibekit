---
name: Multi-Processor Payment Integration Audit
description: Shortcomings audit of the multi-processor payment plan and current implementation
type: project
---

# Multi-Processor Audit

## Critical Gaps in Current Implementation

### 1. Cancel does not sync with processor

`POST /billing/cancel` (hono/index.ts:2497) only updates the local DB. It never calls the processor's cancel API -- not even for Stripe. User sees "canceled" but Stripe keeps charging.

Fix: Call `processor.cancelSubscription()` before the local DB update in the route handler.

### 2. Change-plan Stripe sync lives in route handler, not service

The Stripe `subscriptions.update` call (hono/index.ts:2482-2489) is inlined in the route handler, not in `subscription-service.ts`. The service layer's `changeSubscriptionPlan()` should orchestrate the processor call.

Fix: Move the Stripe sync from route handler into the service layer via `getProcessor(sub.processor).updateSubscription()`.

### 3. Single `processorPriceId` column breaks multi-processor plans

A plan needs to live on multiple processors (e.g. "Pro" on Stripe AND Paddle). One `processorPriceId` column on `subscription_plan` forces one plan = one processor.

Fix: Add a `plan_processor` junction table:

```sql
CREATE TABLE plan_processor (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES subscription_plan(id),
  processor TEXT NOT NULL,
  price_id TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  UNIQUE(plan_id, processor)
);
```

### 4. No coupon support in checkout UI or validator

`checkoutSessionSchema` has no `couponId` field. `createCheckoutSession` in `stripe.ts` accepts `couponId` but it's never plumbed through the API route. Users can't apply coupons at checkout.

Fix: Add `couponId` to `checkoutSessionSchema`, pass through route handler to processor.

### 5. Missing processor env vars in `Bindings` type

`src/lib/server/hono/types.ts` only declares `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. All new processor env vars need declaration for Cloudflare Workers type generation.

### 6. PayPal checkout is two-phase (breaks `CheckoutOutput` model)

Stripe/Polar/Paddle return a redirect URL. PayPal returns an approval URL and the backend must later activate the subscription via a callback. The single `url` return doesn't work.

Fix: Extend `CheckoutOutput` with `requiresActivation` flag and add a `GET /billing/callback/:processor` route to handle PayPal activation + the `activateSubscription()` method to the interface.

### 7. Crypto `createPrice` and `createCheckoutSession` break the interface

Coinbase Commerce has no concept of prices or checkout sessions. You create charges with amounts. These interface methods don't map.

Fix: Make `createPrice` return a no-op for crypto (it creates nothing, just returns a fake priceId from the plan's metadata). `createCheckoutSession` becomes `createCharge()` under the hood.

### 8. PayPal `createPrice` needs more fields than `PriceInput`

PayPal billing plans require `payment_preferences` (setup fee, cycles, frequency) and `merchant_preferences` (return/cancel URLs). `PriceInput` is too simple.

Fix: Extend `PriceInput` with optional `paymentPreferences` and `merchantPreferences` fields, or let the PayPal adapter read additional plan config from the `features` JSON column.

### 9. No error handling for processor API failures

`getStripeClient` returns `null` when key is absent (graceful). But if a processor is registered (key present) and its API is down, there's no retry, no circuit breaker, no graceful degradation.

Fix: Wrap processor calls in try/catch. On failure, return a structured error. Consider a retry policy in the service layer.

### 10. Local-only subscriptions have no management UI

When Stripe is absent, `createSubscription` creates a local sub but `stripeCustomerId` is null. The portal route throws `'No billing account found'`. Local-only users have no cancel/change-plan/invoice UI.

Fix: When the processor has no portal (or is local-only), the billing settings page should show inline cancel/change buttons that call the local-only API endpoints directly.

### 11. Webhook verification is non-uniform per processor

| Processor     | Verification header(s)                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stripe        | `stripe-signature` (t=timestamp,v1=sig format)                                                                                                       |
| Polar         | `polar-signature` (HMAC SHA-256)                                                                                                                     |
| Lemon Squeezy | `X-Signature` (HMAC-SHA256)                                                                                                                          |
| Paddle        | JWT with JWK public key rotation (verify via `https://api.paddle.com/.well-known/jwks`)                                                              |
| PayPal        | `PAYPAL-AUTH-ALGO` + `PAYPAL-CERT-URL` + `PAYPAL-TRANSMISSION-ID` + `PAYPAL-TRANSMISSION-SIG` + `PAYPAL-TRANSMISSION-TIME` (cert chain verification) |
| Coinbase      | `X-CC-Webhook-Signature` (HMAC-SHA256)                                                                                                               |

The generic `POST /billing/webhooks/:processor` dispatcher must read the correct headers per processor type. The `WebhookInput` interface needs a `rawHeaders: Record<string, string>` field instead of a single `signature` string.

### 12. Webhook idempotency differs per processor

| Processor     | Idempotency mechanism                              |
| ------------- | -------------------------------------------------- |
| Stripe        | `Idempotency-Key` header + event `id` uniqueness   |
| Polar         | Event `id` uniqueness                              |
| Lemon Squeezy | `custom_data` hook + event `id` uniqueness         |
| Paddle        | `notification_id` uniqueness                       |
| PayPal        | `PayPal-Request-Id` header + event `id` uniqueness |
| Coinbase      | Event `id` uniqueness                              |

The `webhook_event` table must use a compound unique constraint on `(eventId, processor)`, not just `eventId` alone. Stripe's auto-retry sends the same event with different `Idempotency-Key` values, so the primary idempotency check must be on event `id`, not the idempotency key.

### 13. No plan migration path between processors

If a user on Stripe wants to switch their plan to Paddle (same plan, different processor), they must cancel and re-subscribe. Acceptable for V1 but must be documented.

### 14. `payment_method` table schema is card-specific

`last4`, `expiryMonth`, `expiryYear`, `brand` are card fields. PayPal and crypto don't use cards. These columns should remain nullable for now, with a `metadata` JSON field added for processor-specific payment method data.

### 15. No webhook forwarding CLI for non-Stripe processors

Stripe has `stripe listen`. Polar, Lemon Squeezy, Paddle, PayPal, and Coinbase have no local dev forwarding tool. All testing requires a public tunnel (ngrok/cloudflared) or dashboard "send test" buttons.

### 16. Pricing page is static HTML, not DB-driven

The pricing page hardcodes two plan cards (Starter $0, Pro $29). It cannot show processor info or dynamically reflect admin-created plans. Must become a DB query.

### 17. No processor filtering in admin billing UI

Plan list has no processor column. Plan editor has no processor selector. Revenue overview has no per-processor filter.

### 18. Tax calculation must be skipped for merchant-of-record processors

Paddle and Lemon Squeezy handle tax themselves. The service layer's `calculateTax()` must be skipped for those subscriptions -- `calculateTax()` would double-add tax. The processor interface should expose a `handlesTax: boolean` property.

### 19. Reactivate doesn't propagate to processor

`reactivateSubscription()` in the service layer only updates D1. For Stripe, reactivating a subscription that was canceled at period-end requires calling the Stripe API. Same for other processors.

### 20. No idempotency key support in `createCheckoutSession` and `createCustomer`

Stripe and PayPal support idempotency keys to prevent duplicate operations. The interface currently has no `idempotencyKey` parameter. This should be added to `CheckoutInput` and `CustomerInput`.
