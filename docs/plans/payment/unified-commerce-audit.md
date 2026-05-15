---
name: Unified Commerce Audit
description: Full audit of the payment architecture — subscriptions, one-time purchases, consumables, stock, and processor abstraction re-architecture
type: project
---

# Unified Commerce Audit

## What's Wrong With the Current Plan

### 1. Flat adapter forces Stripe's model on everyone

The `PaymentProcessor` interface encodes subscription-only checkout with Stripe's vocabulary (prices, checkout sessions, billing portals, coupons, proration). PayPal's two-phase activation flow doesn't fit. Crypto has none of these concepts. The interface has optional methods to paper over gaps — a smell.

### 2. No one-time purchase model at all

The schema has `subscription_plan` and `subscription` but no concept of buying a thing once. No product catalog. No purchase records. No inventory. Every payment flowing through this system must be a subscription, which is wrong for credits, courses, digital downloads, and anything with limited stock.

### 3. Crypto is fundamentally different

Crypto has no sandbox, no webhook-for-lifecycle, no prices, no checkout sessions. Forcing it into the same interface as Stripe creates a broken abstraction. Crypto should be its own module with its own document.

---

## What the Full System Actually Needs

| Model               | Example                      | Checkout Type    | Lifecycle                          |
| ------------------- | ---------------------------- | ---------------- | ---------------------------------- |
| Subscription        | Pro plan $10/mo              | Recurring        | active → past_due → canceled       |
| One-time durable    | Ebook, course, digital asset | One-time payment | purchased → owned (permanent)      |
| One-time consumable | Credits, tokens, API calls   | One-time payment | purchased → consumed (decremented) |
| One-time limited    | Limited-edition item         | One-time payment | available → out_of_stock           |
| Donation/tip        | Tip jar, pay-what-you-want   | One-time payment | completed (no ownership)           |

Each of these needs:

- A product definition (name, price, type, metadata)
- A checkout path through a payment processor
- Post-payment fulfillment (grant access, increment balance, reduce stock)
- Purchase history in the user's billing/settings page

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Routes & UI (hono routes, Svelte pages)                    │
│  - /billing/checkout    (subscription or one-time)          │
│  - /billing/portal      (customer billing portal)           │
│  - /billing/purchases   (purchase history)                  │
│  - /shop                (public product listing)            │
│  - /app/settings/billing (subscription + purchase history)  │
│  - /admin/billing       (plans, products, stock, revenue)   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  App Layer (subscription-service.ts, purchase-service.ts)   │
│  - Owns business logic: proration, stock deduction,         │
│    entitlement checks, usage limits                         │
│  - Knows about plans, products, subs, purchases             │
│  - Does NOT call processor APIs directly                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Adapter (billing/adapter.ts)                               │
│  - One function per operation:                              │
│    checkoutSubscription(plan, processor) → url              │
│    checkoutOneTime(product, processor, quantity) → url      │
│    changePlan(sub, newPlan) → void                          │
│    cancelSubscription(sub) → void                           │
│    refundTransaction(txn) → void                            │
│    createCustomer(email, name) → customer_id                │
│  - Normalizes inputs/outputs across providers               │
│  - Dispatches to the right provider based on sub.processor  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Providers (billing/providers/*.ts)                         │
│  - Each provider exposes its own natural interface           │
│  - Stripe:  stripe.checkout.sessions.create({mode: ...})    │
│  - Paddle:  POST /checkout (auto-detects sub vs one-time)   │
│  - PayPal:  POST /v1/billing/subscriptions (subscription)   │
│             POST /v2/checkout/orders (one-time)             │
│  - Lemon Squeezy:  POST /v1/checkouts (set variant type)   │
│  - Polar:  Same as Stripe pattern                           │
│  - Crypto:  Out of scope — separate module entirely         │
│  - No forced uniformity. Each provider has whatever methods │
│    make sense for that provider.                            │
└─────────────────────────────────────────────────────────────┘
```

### Why this is better than the flat interface

- **Providers aren't forced into a false abstraction.** Stripe has `subscriptions.update()`. PayPal has `POST /revise`. Crypto has nothing. The adapter bridges them, not the providers themselves.
- **App layer stays pure.** Business logic (proration, stock deduction, entitlement) never touches a provider API. Easy to test.
- **New purchase types don't break existing providers.** Adding "consumable credits" means a new adapter function `purchaseCredits()`. Providers that support one-time payments get wired. Crypto doesn't, and that's fine.
- **One-time and subscription checkout share the adapter, not the interface.** Both call the same `POST /billing/checkout` route, which inspects the product type and calls the right adapter function.

---

## Unified Product Model

Replace the `subscription_plan` table with a `product` table that covers both plans and purchasable items.

### `product` table

```
product
├── id              TEXT PK
├── name            TEXT NOT NULL
├── slug            TEXT NOT NULL UNIQUE
├── description     TEXT
├── type            TEXT NOT NULL  -- 'subscription' | 'durable' | 'consumable' | 'limited'
├── price_in_cents  INTEGER NOT NULL
├── currency        TEXT DEFAULT 'usd'
├── interval        TEXT  -- 'month' | 'year' (null for one-time)
├── trial_days      INTEGER DEFAULT 0  (subscription only)
├── features        TEXT  -- JSON array (subscription only)
├── stock           INTEGER  -- remaining quantity (limited only, null = unlimited)
├── max_per_user    INTEGER  -- max purchases per user (null = unlimited)
├── is_active       INTEGER DEFAULT 1
├── sort_order      INTEGER DEFAULT 0
├── tax_inclusive   INTEGER DEFAULT 0
├── tax_rate        INTEGER  -- basis points, e.g. 850 = 8.5%
├── metadata        TEXT  -- JSON for provider-specific config
├── created_at      INTEGER (timestamp ms)
├── updated_at      INTEGER (timestamp ms)
```

### `product_processor` junction table

A product can be sold through multiple processors:

```
product_processor
├── id              TEXT PK
├── product_id      TEXT NOT NULL → product.id
├── processor       TEXT NOT NULL  -- 'stripe' | 'polar' | 'lemon-squeezy' | 'paddle' | 'paypal'
├── price_id        TEXT NOT NULL  -- processor-specific price/product/variant ID
├── is_default      INTEGER DEFAULT 0
├── UNIQUE(product_id, processor)
```

### `purchase` table (new)

One-time purchase records. Separate from `subscription` because the lifecycle is different (no renewal, no cancel, no past_due).

```
purchase
├── id              TEXT PK
├── user_id         TEXT NOT NULL → user.id
├── product_id      TEXT NOT NULL → product.id
├── quantity        INTEGER NOT NULL DEFAULT 1
├── amount_in_cents INTEGER NOT NULL
├── currency        TEXT DEFAULT 'usd'
├── tax_amount_in_cents INTEGER DEFAULT 0
├── processor       TEXT NOT NULL
├── processor_charge_id TEXT  -- processor's transaction/charge/order ID
├── status          TEXT NOT NULL  -- 'pending' | 'completed' | 'refunded' | 'failed'
├── fulfilled       INTEGER DEFAULT 0  -- has the product been delivered/granted?
├── metadata        TEXT  -- JSON: tx hash, wallet address, etc.
├── created_at      INTEGER (timestamp ms)
```

### `user_product` table (new)

Tracks what a user owns. For durable products (courses, ebooks), this is the entitlement check. For consumables, this is the remaining balance.

```
user_product
├── id              TEXT PK
├── user_id         TEXT NOT NULL → user.id
├── product_id      TEXT NOT NULL → product.id
├── purchase_id     TEXT NOT NULL → purchase.id
├── remaining       INTEGER  -- consumable: remaining quantity. durable: null = owned.
├── expires_at      INTEGER  -- optional: access expires after date
├── created_at      INTEGER (timestamp ms)
```

### `stock_event` table (new)

Audit log for stock changes (purchase reduces stock, admin adds stock, return/refund increases stock).

```
stock_event
├── id              TEXT PK
├── product_id      TEXT NOT NULL → product.id
├── purchase_id     TEXT → purchase.id (if from a purchase)
├── change          INTEGER NOT NULL  -- negative = reduction, positive = increase
├── reason          TEXT  -- 'purchase' | 'refund' | 'admin_add' | 'admin_remove' | 'expiry_release'
├── remaining_after INTEGER NOT NULL  -- snapshotted stock after this event
├── created_at      INTEGER (timestamp ms)
```

### `subscription` table updates

Still exists, now references `product.id` instead of `subscription_plan.id`:

```
subscription
├── id              TEXT PK
├── user_id         TEXT → user.id
├── organization_id TEXT → organization.id
├── product_id      TEXT NOT NULL → product.id  (type = 'subscription')
├── processor       TEXT NOT NULL
├── processor_customer_id TEXT
├── processor_subscription_id TEXT
├── status          TEXT  -- 'active' | 'canceled' | 'incomplete' | 'past_due' | 'paused' | 'trialing'
├── current_period_start INTEGER (timestamp ms)
├── current_period_end   INTEGER (timestamp ms)
├── trial_end       INTEGER (timestamp ms)
├── canceled_at     INTEGER (timestamp ms)
├── metadata        TEXT  -- JSON
├── created_at      INTEGER (timestamp ms)
├── updated_at      INTEGER (timestamp ms)
```

### `subscription_event` — unchanged

### `invoice` table updates

Now covers both subscription invoices and one-time purchase receipts:

```
invoice
├── id              TEXT PK
├── user_id         TEXT
├── subscription_id TEXT → subscription.id (null for one-time purchases)
├── purchase_id     TEXT → purchase.id (null for subscriptions)
├── amount_in_cents INTEGER NOT NULL
├── currency        TEXT DEFAULT 'usd'
├── tax_amount_in_cents INTEGER DEFAULT 0
├── status          TEXT  -- 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
├── processor       TEXT NOT NULL
├── processor_invoice_id TEXT
├── pdf_url         TEXT
├── paid_at         INTEGER (timestamp ms)
├── due_date        INTEGER (timestamp ms)
├── created_at      INTEGER (timestamp ms)
```

### `coupon` table updates

Add `product_id` FK (optional) to scope coupons to specific products, not just globally:

```
coupon
├── ...existing columns...
├── processor       TEXT NOT NULL
├── processor_coupon_id TEXT
├── product_id      TEXT → product.id (null = applies to all)
```

---

## Adapter Changes

The adapter now has two checkout paths:

```
checkoutSubscription(plan, processor, input) → { sessionId, url }
  - Stripe: mode='subscription', price=plan.priceId
  - Paddle: items=[{price_id, quantity:1}], recurring
  - PayPal: POST /billing/subscriptions → returns approval URL
  - Lemon Squeezy: variant_id + checkout_options

checkoutOneTime(product, processor, quantity, input) → { sessionId, url }
  - Stripe: mode='payment', line_items=[{price, quantity}]
  - Paddle: items=[{price_id, quantity}], non-recurring
  - PayPal: POST /v2/checkout/orders → returns approval URL
  - Lemon Squeezy: variant_id + checkout_options
```

Fulfillment happens in webhook handlers, not in the adapter. The adapter creates the checkout. The webhook confirms the payment. The service layer handles fulfillment (grant access, reduce stock, increment balance).

Fulfillment flow (webhook → service layer):

```
charge.succeeded / order.paid / transaction.completed
  → getProductById()
  → if durable:    INSERT INTO user_product (type='owned')
  → if consumable: INSERT INTO user_product (remaining = quantity)
                     or UPDATE existing user_product SET remaining += quantity
  → if limited:    UPDATE product SET stock = stock - quantity
                   INSERT INTO stock_event (change=-quantity)
  → INSERT INTO invoice (paid)
  → send receipt email
```

---

## Routes

```typescript
// ── Catalog (public) ──
GET  /api/products                → list active products (type filterable)
GET  /api/products/:id            → product detail

// ── Checkout ──
POST /api/checkout                → { productId, quantity?, processor? } → { url }
     // Inspects product.type:
     //   subscription → adapter.checkoutSubscription()
     //   durable/consumable/limited → adapter.checkoutOneTime()

// ── Callbacks ──
GET  /api/checkout/callback/:processor  // PayPal activation, etc.

// ── User ──
GET  /api/user/subscription       → current subscription
GET  /api/user/purchases          → purchase history
GET  /api/user/entitlements       → owned products (user_product table)
POST /api/user/subscription/change-plan
POST /api/user/subscription/cancel
POST /api/user/subscription/reactivate
POST /api/user/portal             → billing portal URL

// ── Admin ──
GET    /api/admin/products        → list all products
POST   /api/admin/products        → create product
PATCH  /api/admin/products/:id    → update product
DELETE /api/admin/products/:id    → deactivate product
GET    /api/admin/purchases       → list purchases (pagination, filter by processor)
GET    /api/admin/stock           → stock levels
POST   /api/admin/stock/add       → admin adds stock
GET    /api/admin/revenue         → revenue by product, processor, period
POST   /api/admin/refund          → refund a purchase or subscription charge

// ── Webhooks ──
POST /api/webhooks/:processor     → unified webhook dispatcher
```

---

## Migration Path

1. Rename `subscription_plan` → `product`, add `type`, `stock`, `max_per_user`, `metadata` columns. Backfill existing plans with `type = 'subscription'`.
2. Create `product_processor` table. Migrate `subscription_plan.stripePriceId` into it with `processor = 'stripe'`.
3. Rename `subscription.planId` → `subscription.productId`, add `processor` column.
4. Create `purchase`, `user_product`, `stock_event` tables.
5. Rename `stripe_webhook_event` → `webhook_event`, add `processor` column, compound unique on `(event_id, processor)`.
6. Add `processor` and `processorCouponId` to `coupon`. Add `product_id` FK.
7. Add `purchase_id` FK and `processor` column to `invoice`.
8. Drop old Stripe-specific columns after backfill.

---

## What Falls Out of Scope

### Crypto

Crypto is its own document at `docs/plans/crypto-payments.md`. It does not implement the adapter pattern. It gets:

- A `POST /api/crypto/checkout` route that creates a Coinbase Commerce charge
- Webhook handling for `charge:confirmed`
- A cron trigger for renewal simulation
- No `product_processor` entry — it bypasses the multi-processor system entirely
- Documents all limitations: no sandbox, no proration, no portal, no native subscriptions

The admin UI hides the crypto option behind an explicit opt-in env var and shows a disclaimer about these limitations in the product editor.

### PayPal one-time purchases

PayPal's one-time checkout uses `POST /v2/checkout/orders`, which is a different API than the Subscriptions API. The PayPal provider module will have two separate internal clients: one for subscriptions, one for orders. The adapter picks which one to call based on whether it's `checkoutSubscription` or `checkoutOneTime`.

---

## Open Questions

1. Should `product` completely replace `subscription_plan` (rename + add columns), or should both tables coexist and `subscription_plan` becomes a thin FK to `product`?
2. For consumable products, should the same purchase stack (e.g. buying 50 credits twice = 100 balance) or create separate `user_product` rows?
3. Should `max_per_user` be enforced at checkout or post-fulfillment? If enforced at checkout, need a pre-check that queries `user_product` + `purchase` before creating the checkout session.
4. Should the pricing page show one-time products alongside subscription plans, or stay subscription-focused?
5. Should coupons apply to one-time purchases or subscriptions only?
6. Should refund behaviour differ per product type? (Durable: revoke access. Consumable: decrement balance. Limited: return to stock.)
