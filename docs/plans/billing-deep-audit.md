---
name: Billing & Payments Deep Audit
description: Detailed audit of billing phase — claimed features vs actual implementation
type: project
---

# Billing & Payments Deep Audit — 2026-05-15

## Claimed vs Actual

| Claimed Feature            | Status       | Details                                                                                                                                                                                                                                   |
| -------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan CRUD                  | **COMPLETE** | Schema, service, API, admin UI, validators, seed data                                                                                                                                                                                     |
| Plan comparison page       | **COMPLETE** | Static/hardcoded HTML on pricing page, not dynamic from DB                                                                                                                                                                                |
| Upgrade/downgrade flows    | **PARTIAL**  | Local DB update only — no Stripe API call for existing Stripe subs                                                                                                                                                                        |
| Proration handling         | **FIXED**    | `calculateProration()` now called in `changeSubscriptionPlan()`, returns proration amount in API response                                                                                                                                 |
| Trial periods              | **COMPLETE** | Schema, Stripe checkout integration, UI display                                                                                                                                                                                           |
| Stripe integration         | **COMPLETE** | Client factory, checkout sessions, portal, webhook verification                                                                                                                                                                           |
| Payment method management  | **PARTIAL**  | Synced via `payment_method.attached`/`detached` webhook events; no UI for management                                                                                                                                                      |
| Invoice generation         | **PARTIAL**  | Webhook creates records; no PDF generation, no line items                                                                                                                                                                                 |
| Payment failure handling   | **PARTIAL**  | Sets subscription to `past_due`; no automated recovery flow                                                                                                                                                                               |
| Dunning emails             | **FIXED**    | 5 billing email templates (payment failed, payment succeeded, subscription canceled, trial ending, plan changed) wired into webhook handlers                                                                                              |
| Metered billing            | **PARTIAL**  | Local DB tracking only; never reported to Stripe                                                                                                                                                                                          |
| Usage tracking             | **PARTIAL**  | API endpoint exists but nothing auto-tracks usage                                                                                                                                                                                         |
| Quota enforcement          | **FIXED**    | `checkUsageLimit()` now called in POST /billing/usage; soft-rejects when overage pricing not configured, allows overage when pricing exists in plan features JSON                                                                         |
| Overage handling           | **FIXED**    | `checkUsageLimit()` returns overage cost/rate/units; POST /billing/usage allows overage when plan has overage pricing configured in features JSON; hard-rejects when rate is 0; GET /billing/usage includes overage info in response      |
| Usage dashboard for users  | **FIXED**    | GET /billing/usage endpoint returns current usage and limits                                                                                                                                                                              |
| Revenue metrics            | **FIXED**    | MRR/ARR/ARPU/net revenue 30d/churned count/trial count in `getBillingOverview()`                                                                                                                                                          |
| Failed payment queue       | **PARTIAL**  | Invoices listable but no dedicated queue or bulk retry                                                                                                                                                                                    |
| Refund processing          | **FIXED**    | Admin refund endpoint POST /api/admin/billing/refund calls Stripe API, marks invoice void; charge.refunded webhook handles automatic refunds                                                                                              |
| Discount/coupon management | **FIXED**    | `coupon` table with code/name/percentOff/duration/maxRedemptions/redeemBy; admin CRUD (list/create/update/deactivate); Stripe coupon sync via createStripeCoupon(); user redemption endpoint; checkout coupon support; validators + tests |
| Tax configuration          | **FIXED**    | `taxRate`/`taxInclusive` on subscriptionPlan; `taxAmountInCents` on invoice; `calculateTax()` handles inclusive/exclusive; Stripe automatic_tax on checkout; validators updated; tests                                                    |
| Stripe webhook handler     | **DONE**     | Added handlers for customer.updated, payment_method.updated, and invoice.upcoming in webhook switch statement                                                                                                                                 |
| Idempotent processing      | **COMPLETE** | Unique constraint on eventId + pre-check                                                                                                                                                                                                  |
| Event logging              | **FIXED**    | Webhook events logged with status/retryCount/errorMessage; failed events recorded in DB                                                                                                                                                   |
| Failure recovery           | **FIXED**    | stripeWebhookEvent now tracks status/retryCount/nextRetryAt/errorMessage; catch block records failures with retry metadata; admin endpoints for viewing and retrying failed events                                                        |

## Critical Gaps

1. ~~**`change-plan` doesn't sync with Stripe**~~ — **FIXED**. Change-plan handler now calls `stripe.subscriptions.update()` with the new plan's `stripePriceId` when both `sub.stripeSubscriptionId` and `newPlan.stripePriceId` exist. Uses `proration_behavior: 'create_prorations'`.

2. ~~**`calculateProration()` is dead code**~~ — **FIXED**. Now called in `changeSubscriptionPlan()`, returns `{ prorationAmountInCents }` in the API response, and stored in subscription event metadata.

3. ~~**`checkUsageLimit()` is dead code**~~ — **FIXED**. Now called in POST /billing/usage; rejects requests that would exceed plan limits.

4. ~~**No dunning emails**~~ — **FIXED**. 5 billing email templates created and wired into Stripe webhook handlers: payment failed, payment succeeded, subscription canceled, trial ending soon, plan changed.

5. ~~**No refund processing**~~ — **FIXED**. Admin refund endpoint (POST /api/admin/billing/refund) validates via zod schema, calls Stripe refunds.create API, marks local invoice as void.

6. ~~**Webhook `checkout.session.completed` hardcodes 30-day period**~~ — **FIXED**. Now reads plan interval (month vs year) to compute correct `currentPeriodEnd`. Falls back to 30-day default. The subsequent `customer.subscription.updated` webhook corrects the period with Stripe's exact values.

7. ~~**`paymentMethod` table is dead schema`**~~ — **FIXED**. Now synced via `payment_method.attached` and `payment_method.detached` webhook events.

8. ~~**No revenue metrics**~~ — **FIXED**. `getBillingOverview()` now computes MRR, ARR, ARPU, net revenue (30d), churned subscriptions (30d), and trial subscription counts.

## Files

- `src/lib/server/billing/stripe.ts` — Stripe client factory, checkout, coupons
- `src/lib/server/billing/subscription-service.ts` — Business logic layer (plans, subs, coupons, overage, tax)
- `src/lib/validators/billing.ts` — Zod validators (plans, checkout, usage, refund, coupons)
- `src/lib/server/db/schema.ts` — Billing tables (subscriptionPlan, subscription, invoice, paymentMethod, usageRecord, subscriptionEvent, stripeWebhookEvent, coupon)
- `drizzle/0027_illegal_tigra.sql` — Coupon table migration
- `drizzle/0028_cooing_power_pack.sql` — Tax fields migration
- `src/lib/server/hono/index.ts` — API routes (billing + admin billing + coupons)
- `src/routes/(app)/app/settings/billing/+page.svelte` — User billing settings
- `src/routes/(admin)/admin/billing/+page.svelte` — Admin billing page
- `src/routes/(public)/pricing/+page.svelte` — Public pricing page

## Tests

- `tests/unit/billing.test.ts` — Validators + proration + status transitions
- `tests/unit/billing-stripe.test.ts` — Stripe client operations
- `tests/unit/billing-webhook.test.ts` — Webhook idempotency + logic
- `tests/unit/billing-validator.test.ts` — Validator edge cases
- `tests/unit/stripe-client.test.ts` — Client factory
- `tests/unit/billing-refund.test.ts` — Refund validator tests
- `tests/unit/billing-overage.test.ts` — Overage calculation tests
- `tests/unit/billing-coupon.test.ts` — Coupon validator tests
- `tests/unit/billing-tax.test.ts` — Tax calculation tests
- `tests/unit/billing-email.test.ts` — Billing email template tests
- `tests/unit/subscription-service.test.ts` — Full service layer
- `tests/e2e/billing.spec.ts` — E2E plans + checkout + cancel
- `tests/e2e/admin-billing-ui.spec.ts` — Admin billing UI

## E2E Browser Verification — 2026-05-15

- **Pricing page** (`/pricing`): Two tiers (Starter $0, Pro $29), FAQ section, CTA, dark theme with orange accents. Verified via screenshot + vision analysis.
- **Blog page** (`/blog`): Header with nav, search bar, category filters (Code, Development, General, Testing), 4 article listings, newsletter signup, footer. No errors.
- **Admin billing** (`/admin/billing`): Overview cards (Active Subs: 0, Total Subs: 0, Plans: 2), plan management with Starter and Pro plans, admin sidebar navigation. No errors.
- **User billing settings** (`/app/settings/billing`): "No active subscription" status, two plan cards (Starter Free, Pro $29/mo) with Subscribe CTAs. No errors.

### Migration Fix Applied

The local dev SQLite (`data/vibekit.db`) was missing:

- `tax_inclusive`, `tax_rate` columns on `subscription_plan` (from `0028_cooing_power_pack.sql`)
- `tax_amount_in_cents` column on `invoice`
- `coupon` table (from `0027_illegal_tigra.sql`)
- `stripe_webhook_event` table

These were applied to the local SQLite to resolve a 500 error on `/api/admin/billing/plans`. The wrangler D1 local DB already had these migrations.

### Quality Checks

- **Tests**: 3533 passed (164 test files)
- **Lint**: 5 pre-existing errors (max-params on email render functions)
- **Format**: All files pass
