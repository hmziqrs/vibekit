# Billing & Payments Implementation Plan

## Context

The next unchecked phases in `docs/loop.md` are the **Billing & Payments** section (lines 157-161), which is a prerequisite for Organization billing (line 116). Currently, the codebase has zero billing/payment code — no Stripe SDK, no billing tables, no subscription logic. The pricing page (`src/routes/(public)/pricing/+page.svelte`) is purely static marketing with two plans (Starter $0, Pro $29) and CTAs linking to `/register`.

This plan covers the entire Billing & Payments section as a single coherent implementation:

1. Subscription management
2. Payment processing (Stripe)
3. Usage-based billing
4. Billing admin
5. Payment webhooks

## Implementation Order

### Step 1: Database Schema & Migration

**File:** `src/lib/server/db/schema.ts`

New tables:

- `subscriptionPlan` — plan definitions (id, name, slug, description, priceInCents, currency, interval month/year, trialDays, features JSON, isActive, sortOrder, createdAt, updatedAt)
- `subscription` — user/org subscriptions (id, userId/orgId, planId, stripeCustomerId, stripeSubscriptionId, stripePriceId, status [active/past_due/canceled/incomplete/trialing/paused], currentPeriodStart, currentPeriodEnd, trialEnd, canceledAt, metadata JSON, createdAt, updatedAt)
- `subscriptionEvent` — audit log for subscription changes (id, subscriptionId, type [created/upgraded/downgraded/canceled/renewed/trial_started/trial_ended/past_due/payment_failed], fromPlanId, toPlanId, metadata JSON, createdAt)
- `usageRecord` — metered usage tracking (id, subscriptionId, metricType [api_calls/storage/seats/requests], quantity, periodStart, periodEnd, createdAt)
- `invoice` — invoices (id, userId/orgId, subscriptionId, stripeInvoiceId, amountInCents, currency, status [draft/open/paid/void/uncollectible], dueDate, paidAt, pdfUrl, createdAt)
- `paymentMethod` — stored payment methods (id, userId, stripePaymentMethodId, type [card/bank_transfer], last4, brand, expiryMonth, expiryYear, isDefault, createdAt)

Add fields to `organization` table: `stripeCustomerId`, `subscriptionPlanId`

**Migration:** `drizzle/0028_billing.sql`

### Step 2: Install Stripe SDK

```bash
bun add stripe
```

### Step 3: Stripe Service Layer

**New file:** `src/lib/server/billing/stripe.ts`

- `createStripeClient()` — factory using env.STRIPE_SECRET_KEY
- `createCheckoutSession()` — redirect to Stripe Checkout
- `createBillingPortalSession()` — redirect to Stripe Customer Portal
- `handleWebhookEvent()` — dispatch webhook events
- `createCustomer()` / `updateCustomer()` — customer management
- `createSubscription()` / `updateSubscription()` / `cancelSubscription()`
- `listInvoices()` / `getInvoice()`
- `addPaymentMethod()` / `removePaymentMethod()` / `setDefaultPaymentMethod()`

**New file:** `src/lib/server/billing/subscription-service.ts`

- Business logic layer between Stripe and DB
- `subscribeUserToPlan()`, `changePlan()`, `cancelSubscription()`, `reactivateSubscription()`
- `getSubscriptionStatus()`, `hasActiveSubscription()`
- `checkUsageLimit()`, `recordUsage()`, `getUsageForPeriod()`
- Proration calculation for plan changes

### Step 4: Validators

**New file:** `src/lib/validators/billing.ts`

- `createPlanSchema`, `updatePlanSchema`
- `checkoutSessionSchema` (planId, successUrl, cancelUrl)
- `changePlanSchema` (newPlanId)
- `recordUsageSchema` (metricType, quantity)
- All using zod v4 with `.trim()` before `.min()`

### Step 5: API Routes

**In `src/lib/server/hono/index.ts`:**

Protected routes (user):

- `GET /api/billing/plans` — list active plans
- `GET /api/billing/subscription` — get current subscription
- `POST /api/billing/checkout` — create checkout session → redirect URL
- `POST /api/billing/portal` — create billing portal session → redirect URL
- `POST /api/billing/change-plan` — upgrade/downgrade
- `POST /api/billing/cancel` — cancel subscription
- `POST /api/billing/reactivate` — reactivate canceled subscription
- `GET /api/billing/invoices` — list invoices
- `GET /api/billing/payment-methods` — list payment methods
- `POST /api/billing/payment-methods` — add payment method
- `DELETE /api/billing/payment-methods/:id` — remove payment method

Admin routes:

- `GET /api/admin/billing/plans` — list all plans (including inactive)
- `POST /api/admin/billing/plans` — create plan
- `PATCH /api/admin/billing/plans/:id` — update plan
- `DELETE /api/admin/billing/plans/:id` — deactivate plan
- `GET /api/admin/billing/overview` — revenue metrics (MRR, churn, active subs)
- `GET /api/admin/billing/invoices` — list all invoices with filters
- `GET /api/admin/billing/usage` — usage metrics across all subscriptions

Public route (no auth):

- `POST /api/billing/webhooks/stripe` — Stripe webhook endpoint (raw body, signature verification)

Organization routes (on orgApp):

- `GET /api/orgs/:orgId/billing/subscription` — org subscription
- `POST /api/orgs/:orgId/billing/checkout` — org checkout
- `POST /api/orgs/:orgId/billing/change-plan` — org plan change
- `GET /api/orgs/:orgId/billing/invoices` — org invoices

### Step 6: Frontend Pages

**Upgrade pricing page:** `src/routes/(public)/pricing/+page.svelte`

- Fetch plans from API instead of hardcoded
- Stripe Checkout redirect on plan selection
- Show current plan if logged in

**Billing settings page:** `src/routes/(app)/app/settings/billing/+page.svelte`

- Current plan display with status badge
- Plan comparison / upgrade section
- Payment methods management
- Invoice history
- Cancel/reactivate buttons
- Usage metrics display

**Admin billing page:** `src/routes/(admin)/admin/billing/+page.svelte`

- Revenue overview cards (MRR, ARR, active subs, churn rate)
- Plan distribution chart
- Recent subscriptions list
- Invoice management
- Plan CRUD

### Step 7: Environment Variables

**In `.env.example`:**

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

**In `src/lib/server/services/types.ts`:**

- Add Stripe env vars to service types

### Step 8: Tests

**Unit tests:** `tests/unit/billing.test.ts`

- Plan schema validation
- Subscription status transitions
- Proration calculations
- Usage limit checking
- Stripe webhook event parsing

**E2E tests:** `tests/e2e/billing.spec.ts`

- Pricing page renders plans
- Checkout flow (mocked Stripe)
- Admin plan management
- Billing settings page

## Files to Create

- `drizzle/0028_billing.sql`
- `src/lib/server/billing/stripe.ts`
- `src/lib/server/billing/subscription-service.ts`
- `src/lib/validators/billing.ts`
- `src/routes/(app)/app/settings/billing/+page.svelte`
- `src/routes/(admin)/admin/billing/+page.svelte`
- `tests/unit/billing.test.ts`
- `tests/e2e/billing.spec.ts`

## Files to Modify

- `src/lib/server/db/schema.ts` — add billing tables
- `src/lib/server/hono/index.ts` — add billing API routes
- `src/lib/server/services/types.ts` — add Stripe env vars
- `src/routes/(public)/pricing/+page.svelte` — dynamic plans
- `docs/loop.md` — mark billing phases complete
- `.env.example` — add Stripe vars

## Verification

1. `bun run check` — type check (allow pre-existing errors)
2. `bun run lint` — 0 errors
3. `bun run format:check` — pass
4. `bun run test` — all pass
5. Browser: pricing page shows plans, billing settings accessible, admin billing page loads
6. Unit tests cover plan CRUD, subscription logic, usage tracking
7. E2E tests cover pricing page, billing settings, admin billing
