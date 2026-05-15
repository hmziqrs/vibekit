---
name: Multi-Processor Payment Integration
description: Payment processor abstraction and integrations for Polar, Lemon Squeezy, Paddle, PayPal, and crypto alongside Stripe
type: project
---

# Multi-Processor Payment Integration

## Processor Abstraction

Create `src/lib/server/billing/processor.ts`:

```typescript
export interface PaymentProcessor {
  name: string
  createCheckoutSession(input: CheckoutInput): Promise<CheckoutOutput>
  createBillingPortalSession(input: PortalInput): Promise<PortalOutput>
  createCustomer(input: CustomerInput): Promise<CustomerOutput>
  listPaymentMethods(customerId: string): Promise<PaymentMethod[]>
  verifyWebhookSignature(input: WebhookInput): Promise<WebhookEvent>
  createPrice(input: PriceInput): Promise<PriceOutput>
  updateSubscription(input: UpdateSubscriptionInput): Promise<void>
  cancelSubscription(subscriptionId: string): Promise<void>
  refundCharge(chargeId: string, amount?: number): Promise<void>
  createCoupon(input: CouponInput): Promise<{ processorCouponId: string }>
  handleWebhookEvent(event: WebhookEvent, db: AppDb, emailService: EmailService): Promise<void>
}

export interface CheckoutInput {
  cancelUrl: string
  couponId?: string
  customerEmail?: string
  customerId?: string
  priceId: string
  successUrl: string
  trialDays?: number
  userId: string
  metadata?: Record<string, string>
}

export interface CheckoutOutput {
  sessionId: string
  url: string | null
}

export interface PortalInput {
  customerId: string
  returnUrl: string
}
export interface PortalOutput {
  url: string
}

export interface CustomerInput {
  email: string
  name?: string
  userId: string
}
export interface CustomerOutput {
  customerId: string
}

export interface PriceInput {
  amountInCents: number
  currency: string
  interval: 'month' | 'year'
  productName: string
  trialDays?: number
}
export interface PriceOutput {
  priceId: string
}

export interface UpdateSubscriptionInput {
  processorSubscriptionId: string
  newPriceId: string
  prorationBehavior?: 'create_prorations' | 'none'
}

export interface CouponInput {
  duration: 'forever' | 'once' | 'repeating'
  durationInMonths?: number
  maxRedemptions?: number
  name: string
  percentOff: number
  redeemBy?: number
}

export interface WebhookInput {
  body: string | Buffer
  signature: string
  secret: string
}
export interface WebhookEvent {
  id: string
  type: string
  data: Record<string, unknown>
}
```

Create `src/lib/server/billing/registry.ts` — a singleton Map of `processorName → PaymentProcessor`, registered at startup in `hooks.server.ts`. Processors only register when their credentials env var is present.

## Schema Changes

| Table                  | Changes                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `subscription_plan`    | Add `processor` enum column (`stripe`, `polar`, `lemon-squeezy`, `paddle`, `paypal`, `crypto`). Rename `stripePriceId` → `processorPriceId`. |
| `subscription`         | Add `processor` column. Rename `stripeCustomerId` → `processorCustomerId`, `stripeSubscriptionId` → `processorSubscriptionId`.               |
| `invoice`              | Rename `stripeInvoiceId` → `processorInvoiceId`. Add `processor` column.                                                                     |
| `payment_method`       | Rename `stripePaymentMethodId` → `processorPaymentMethodId`. Add `processor` column.                                                         |
| `coupon`               | Rename `stripeCouponId` → `processorCouponId`. Add `processor` column.                                                                       |
| `stripe_webhook_event` | Rename to `webhook_event`. Add `processor` column. Keep `eventId` unique constraint.                                                         |

Migration strategy: add new columns alongside old, write to both during transition, backfill, then drop old columns.

## Stripe Refactor

Refactor `src/lib/server/billing/stripe.ts` to export a `createStripeProcessor(config): PaymentProcessor` factory instead of standalone functions. The existing functions map to interface methods. Add the missing methods that currently live in `hono/index.ts`:

- `createPrice()` — wraps `stripe.prices.create()`
- `updateSubscription()` — wraps `stripe.subscriptions.update()`
- `cancelSubscription()` — wraps `stripe.subscriptions.cancel()`
- `refundCharge()` — wraps `stripe.refunds.create()`
- `handleWebhookEvent()` — extract the webhook switch/case from `hono/index.ts`

The webhook route becomes a generic dispatcher:

```
POST /billing/webhooks/:processor
```

Dispatch to `getProcessor(processor).verifyWebhookSignature()` then `handleWebhookEvent()`.

## Polar

REST API at `api.polar.sh`. Similar model to Stripe: products → prices, checkout sessions, subscriptions, customer portal.

| API Call                                | Purpose              |
| --------------------------------------- | -------------------- |
| `POST /v1/checkout/sessions`            | Create checkout      |
| `POST /v1/customers`                    | Create customer      |
| `GET /v1/customers/:id/payment-methods` | List payment methods |
| `POST /v1/subscriptions/:id`            | Update plan          |
| `POST /v1/subscriptions/:id/cancel`     | Cancel               |
| `POST /v1/charges/:id/refund`           | Refund               |
| `POST /v1/products` + `POST /v1/prices` | Create product/price |
| `POST /v1/coupons`                      | Create coupon        |
| `POST /v1/billing-portal/sessions`      | Customer portal      |

Webhooks: `checkout.updated`, `subscription.active`, `subscription.revoked`, `subscription.updated`, `order.created`, `order.paid`, `order.refunded`, `customer.payment_method.attached`, `customer.payment_method.detached`.

## Lemon Squeezy

REST API. Hierarchy: store → product → variant (not product → price). No API for creating variants (manual via dashboard). Variant IDs are the price equivalents.

| API Call                            | Purpose          |
| ----------------------------------- | ---------------- |
| `POST /v1/checkouts`                | Create checkout  |
| `GET /v1/subscriptions/:id`         | Get subscription |
| `PATCH /v1/subscriptions/:id`       | Update plan      |
| `POST /v1/subscriptions/:id/cancel` | Cancel           |
| `GET /v1/variants`                  | List variants    |
| `GET /v1/orders`                    | List invoices    |

Webhook verification: `X-Signature` HMAC-SHA256.

Webhooks: `order_created`, `order_refunded`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_paused`, `subscription_unpaused`.

No customer portal. Billing management must be custom UI or link to Lemon Squeezy dashboard.

## Paddle

REST API at `api.paddle.com`. Products and prices like Stripe. Merchant-of-record (handles global tax).

| API Call                              | Purpose              |
| ------------------------------------- | -------------------- |
| `POST /checkout`                      | Create checkout      |
| `POST /customers`                     | Create customer      |
| `PATCH /subscriptions/:id`            | Update plan          |
| `POST /subscriptions/:id/cancel`      | Cancel               |
| `GET /subscriptions/:id`              | Get subscription     |
| `POST /transactions/:id/refund`       | Refund               |
| `POST /prices` / `POST /products`     | Create price/product |
| `POST /customers/:id/portal-sessions` | Customer portal      |

Webhook verification: JWK-based JWT with public key rotation.

Webhooks: `transaction.completed`, `transaction.paid`, `transaction.refunded`, `subscription.created`, `subscription.updated`, `subscription.canceled`, `subscription.activated`, `customer.updated`.

## PayPal

REST API. Uses OAuth 2.0 client credentials. Subscriptions API (`/v1/billing/subscriptions`), not the deprecated Billing Plans API.

| API Call                                      | Purpose                                    |
| --------------------------------------------- | ------------------------------------------ |
| `POST /v1/oauth2/token`                       | Auth                                       |
| `POST /v1/catalog/products`                   | Create product                             |
| `POST /v1/billing/plans`                      | Create billing plan                        |
| `POST /v1/billing/subscriptions`              | Create subscription (returns approval URL) |
| `POST /v1/billing/subscriptions/:id/cancel`   | Cancel                                     |
| `POST /v1/billing/subscriptions/:id/revise`   | Update plan                                |
| `GET /v1/billing/subscriptions/:id`           | Get details                                |
| `POST /v1/billing/subscriptions/:id/activate` | Activate/suspend                           |
| `POST /v1/payments/referenced-payouts`        | Refund                                     |

Checkout flow: backend creates subscription → returns approval URL → frontend redirects → PayPal redirects back to `return_url` with token → backend captures.

No customer portal. PayPal has no self-service billing management.

Webhooks: `BILLING.SUBSCRIPTION.CREATED`, `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.UPDATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.SUSPENDED`, `BILLING.SUBSCRIPTION.PAYMENT.FAILED`, `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`.

## Crypto (Coinbase Commerce)

No native recurring billing on chain. Use Coinbase Commerce charges API:

| API Call           | Purpose           |
| ------------------ | ----------------- |
| `POST /charges`    | Create charge     |
| `GET /charges/:id` | Get charge status |

Recurring simulation:

1. Create a charge on subscription creation.
2. On `charge:confirmed` webhook, activate subscription and schedule next charge (cron).
3. Each billing period, create a new charge.
4. Store on-chain tx hash in `invoice` table.

Supports USDC, USDT, DAI, ETH, BTC.

Webhooks: `charge:confirmed`, `charge:failed`, `charge:delayed`, `charge:pending`.

Limitations: no automatic recurring billing, no proration, no customer portal, no refunds (manual on-chain return), 15-60 min price lock window.

## Service Layer

`subscription-service.ts` becomes processor-aware. All Stripe-specific calls become `getProcessor(sub.processor).someMethod()`.

`hono/index.ts` checkout route: reads `processor` from request body (defaults to plan's processor), creates session via processor.

Portal route: forwards to processor's portal. For processors without a portal (Lemon Squeezy, PayPal, crypto), return custom UI URL.

## Frontend

- Checkout: processor selector if multiple providers available for the plan.
- Pricing page: processor badge per plan.
- Billing settings: processor badge on subscription card, "Manage billing" adapts to processor portal or inline form.
- Admin billing: processor column in plan list, processor selector in plan editor, filters.

## Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""

# Polar
POLAR_SECRET_KEY=""
POLAR_WEBHOOK_SECRET=""

# Lemon Squeezy
LEMON_SQUEEZY_API_KEY=""
LEMON_SQUEEZY_STORE_ID=""
LEMON_SQUEEZY_WEBHOOK_SECRET=""

# Paddle
PADDLE_API_KEY=""
PADDLE_WEBHOOK_SECRET=""
PADDLE_ENVIRONMENT="sandbox"

# PayPal
PAYPAL_CLIENT_ID=""
PAYPAL_CLIENT_SECRET=""
PAYPAL_WEBHOOK_ID=""
PAYPAL_ENVIRONMENT="sandbox"

# Crypto (Coinbase Commerce)
COINBASE_COMMERCE_API_KEY=""
COINBASE_COMMERCE_WEBHOOK_SECRET=""
```

## Testing

Unit: one test file per processor adapter, plus `registry.test.ts` and updated `subscription-service.test.ts`. All processors mocked with HTTP interceptors.

Integration: webhook fixture events per processor, plan CRUD with processor selection, checkout flow per processor type.

E2E: existing Stripe E2E updated for refactored routes, new E2E for processor selection UI and admin plan creation.

## Open Questions

- Do processors without a customer portal get custom inline management UI, or just a link to their dashboard?
- Can users migrate a subscription between processors (e.g. Stripe → Polar)? Only at renewal?
- When a plan exists on multiple processors, which processor does a new user default to?
- Coupons: processor-scoped or shared?
