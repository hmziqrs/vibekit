---
name: Billing & Payments Deep Audit
description: Detailed audit of billing phase — claimed features vs actual implementation
type: project
---

# Billing & Payments Deep Audit — 2026-05-15

## Claimed vs Actual

| Claimed Feature            | Status              | Details                                                                                                                                                                                                               |
| -------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan CRUD                  | **COMPLETE**        | Schema, service, API, admin UI, validators, seed data                                                                                                                                                                 |
| Plan comparison page       | **COMPLETE**        | Static/hardcoded HTML on pricing page, not dynamic from DB                                                                                                                                                            |
| Upgrade/downgrade flows    | **COMPLETE**        | Both user and org change-plan endpoints call `stripe.subscriptions.update()` with new price and proration behavior before updating local DB                                                                           |
| Proration handling         | **FIXED**           | `calculateProration()` now called in `changeSubscriptionPlan()`, returns proration amount in API response                                                                                                             |
| Trial periods              | **COMPLETE**        | Schema, Stripe checkout integration, UI display                                                                                                                                                                       |
| Stripe integration         | **COMPLETE**        | Client factory, checkout sessions, portal, webhook verification                                                                                                                                                       |
| Payment method management  | **PARTIAL**         | Synced via `payment_method.attached`/`detached` webhook events; no UI for management                                                                                                                                  |
| Invoice generation         | **PARTIAL**         | Webhook creates records; no PDF generation, no line items                                                                                                                                                             |
| Payment failure handling   | **PARTIAL**         | Sets subscription to `past_due`; no automated recovery flow                                                                                                                                                           |
| Dunning emails             | **FIXED**           | 5 billing email templates (payment failed, payment succeeded, subscription canceled, trial ending, plan changed) wired into webhook handlers                                                                          |
| Metered billing            | **PARTIAL**         | Local DB tracking only; never reported to Stripe                                                                                                                                                                      |
| Usage tracking             | **PARTIAL**         | API endpoint exists but nothing auto-tracks usage                                                                                                                                                                     |
| Quota enforcement          | **FIXED**           | `checkUsageLimit()` now called in POST /billing/usage; rejects over-limit                                                                                                                                             |
| Overage handling           | **NOT IMPLEMENTED** | No overage pricing or automatic upgrade prompts                                                                                                                                                                       |
| Usage dashboard for users  | **FIXED**           | GET /billing/usage endpoint returns current usage and limits                                                                                                                                                          |
| Revenue metrics            | **FIXED**           | MRR/ARR/ARPU/net revenue 30d/churned count/trial count in `getBillingOverview()`                                                                                                                                      |
| Failed payment queue       | **PARTIAL**         | Invoices listable but no dedicated queue or bulk retry                                                                                                                                                                |
| Refund processing          | **FIXED**           | Admin refund endpoint POST /api/admin/billing/refund calls Stripe API, marks invoice void; charge.refunded webhook handles automatic refunds                                                                          |
| Discount/coupon management | **COMPLETE**        | Full coupon CRUD with Stripe sync (`createStripeCoupon`). Admin API for create/update/delete. User-facing redeem and validate endpoints. Schema with percentOff, duration, maxRedemptions, stripeCouponId.            |
| Tax configuration          | **COMPLETE**        | Local tax calculation (`calculateTax` with inclusive/exclusive modes). Schema fields `taxInclusive`, `taxRate`. Stripe automatic_tax enabled at checkout when `taxRate > 0`.                                          |
| Stripe webhook handler     | **PARTIAL**         | 11 events handled (added trial_will_end, subscription.created, payment_method.attached/detached, charge.refunded, checkout.session.expired); still missing customer.updated, payment_method.updated, invoice.upcoming |
| Idempotent processing      | **COMPLETE**        | Unique constraint on eventId + pre-check                                                                                                                                                                              |
| Event logging              | **FIXED**           | Webhook events logged with status/retryCount/errorMessage; failed events recorded in DB                                                                                                                               |
| Failure recovery           | **FIXED**           | stripeWebhookEvent now tracks status/retryCount/nextRetryAt/errorMessage; catch block records failures with retry metadata; admin endpoints for viewing and retrying failed events                                    |

## Critical Gaps

1. ~~**`change-plan` doesn't sync with Stripe**~~ **FIXED** — Both user and org change-plan endpoints now call `stripe.subscriptions.update()` with the new price and proration behavior before updating local DB.

2. ~~**`calculateProration()` is dead code**~~ — **FIXED**. Now called in `changeSubscriptionPlan()`, returns `{ prorationAmountInCents }` in the API response, and stored in subscription event metadata.

3. ~~**`checkUsageLimit()` is dead code**~~ — **FIXED**. Now called in POST /billing/usage; rejects requests that would exceed plan limits.

4. ~~**No dunning emails**~~ — **FIXED**. 5 billing email templates created and wired into Stripe webhook handlers: payment failed, payment succeeded, subscription canceled, trial ending soon, plan changed.

5. ~~**No refund processing**~~ — **FIXED**. Admin refund endpoint (POST /api/admin/billing/refund) validates via zod schema, calls Stripe refunds.create API, marks local invoice as void.

6. ~~**Webhook `checkout.session.completed` hardcodes 30-day period**~~ **FIXED** — Already uses `plan.interval` to compute correct period (365 days for yearly, 30 days for monthly). The user/org checkout endpoints also now use `plan.interval` instead of hardcoded 30 days.

7. ~~**`paymentMethod` table is dead schema`**~~ — **FIXED**. Now synced via `payment_method.attached` and `payment_method.detached` webhook events.

8. ~~**No revenue metrics**~~ — **FIXED**. `getBillingOverview()` now computes MRR, ARR, ARPU, net revenue (30d), churned subscriptions (30d), and trial subscription counts.

9. ~~**`invoice.subscriptionId` stores Stripe ID instead of local UUID**~~ **FIXED** — Webhook handlers now look up the local subscription UUID via `stripeSubscriptionId` before inserting invoice records.

10. ~~**Cancel/reactivate don't sync with Stripe**~~ **FIXED** — Added `cancelStripeSubscription()` and `reactivateStripeSubscription()` to stripe.ts; both cancel and reactivate endpoints now call Stripe before updating local DB.

11. ~~**Missing DB indexes**~~ **FIXED** — Added indexes for invoice(status), invoice(paidAt), invoice(userId+status), paymentMethod(userId), subscriptionPlan(isActive), subscription(canceledAt), stripeWebhookEvent(status+nextRetryAt).

12. ~~**Coupon service has zero tests**~~ **FIXED** — 24 tests covering all 7 coupon functions + createStripeCoupon, including TOCTOU race condition validation.

## Remaining Known Gaps

- Pricing page plans are hardcoded, not fetched from API (will go stale)
- Pricing page has no awareness of logged-in users (cannot adapt CTAs)
- No subscription status transition state machine (any status can transition to any other)
- ~~Org-level cancel/reactivate endpoints don't exist~~ **FIXED** — Added `POST /:orgId/billing/cancel` and `POST /:orgId/billing/reactivate` with Stripe sync
- Org checkout creates subscription without Stripe checkout session
- No confirmation dialogs on destructive actions (cancel, delete plan, detach payment method)
- Missing billing email templates for `customer.subscription.deleted` and `invoice.upcoming` webhook tests

## Files

- `src/lib/server/billing/stripe.ts` — Stripe client factory
- `src/lib/server/billing/subscription-service.ts` — Business logic layer
- `src/lib/validators/billing.ts` — Zod validators
- `src/lib/server/db/schema.ts` — Billing tables (subscriptionPlan, subscription, invoice, paymentMethod, usageRecord, subscriptionEvent, stripeWebhookEvent)
- `drizzle/0028_billing.sql` — Migration with seed data
- `src/lib/server/hono/index.ts` — API routes (billing + admin billing)
- `src/routes/(app)/app/settings/billing/+page.svelte` — User billing settings
- `src/routes/(admin)/admin/billing/+page.svelte` — Admin billing page
- `src/routes/(public)/pricing/+page.svelte` — Public pricing page

## Tests

- `tests/unit/billing.test.ts` — Validators + proration + status transitions
- `tests/unit/billing-stripe.test.ts` — Stripe client operations
- `tests/unit/billing-webhook.test.ts` — Webhook idempotency + logic
- `tests/unit/billing-validator.test.ts` — Validator edge cases
- `tests/unit/stripe-client.test.ts` — Client factory
- `tests/unit/subscription-service.test.ts` — Full service layer
- `tests/e2e/billing.spec.ts` — E2E plans + checkout + cancel
- `tests/e2e/admin-billing-ui.spec.ts` — Admin billing UI
