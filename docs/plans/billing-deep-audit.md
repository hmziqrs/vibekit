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
| Upgrade/downgrade flows    | **PARTIAL**         | Local DB update only — no Stripe API call for existing Stripe subs                                                                                                                                                    |
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
| Refund processing          | **NOT IMPLEMENTED** | No code, only marketing text on pricing page                                                                                                                                                                          |
| Discount/coupon management | **NOT IMPLEMENTED** | No tables, no code, no Stripe coupon integration                                                                                                                                                                      |
| Tax configuration          | **NOT IMPLEMENTED** | No tax fields, no calculation, no Stripe Tax                                                                                                                                                                          |
| Stripe webhook handler     | **PARTIAL**         | 11 events handled (added trial_will_end, subscription.created, payment_method.attached/detached, charge.refunded, checkout.session.expired); still missing customer.updated, payment_method.updated, invoice.upcoming |
| Idempotent processing      | **COMPLETE**        | Unique constraint on eventId + pre-check                                                                                                                                                                              |
| Event logging              | **FIXED**           | Webhook events logged with status/retryCount/errorMessage; failed events recorded in DB                                                                                                                               |
| Failure recovery           | **FIXED**           | stripeWebhookEvent now tracks status/retryCount/nextRetryAt/errorMessage; catch block records failures with retry metadata; admin endpoints for viewing and retrying failed events                                    |

## Critical Gaps

1. **`change-plan` doesn't sync with Stripe** — Only updates local DB. Stripe-managed subscriptions will diverge.
   - **Fix**: Call Stripe's `subscriptions.update` API in the change-plan handler.
   - **Why**: Downgrades/upgrades won't take effect in Stripe, causing billing discrepancies.

2. ~~**`calculateProration()` is dead code**~~ — **FIXED**. Now called in `changeSubscriptionPlan()`, returns `{ prorationAmountInCents }` in the API response, and stored in subscription event metadata.

3. ~~**`checkUsageLimit()` is dead code**~~ — **FIXED**. Now called in POST /billing/usage; rejects requests that would exceed plan limits.

4. ~~**No dunning emails**~~ — **FIXED**. 5 billing email templates created and wired into Stripe webhook handlers: payment failed, payment succeeded, subscription canceled, trial ending soon, plan changed.

5. **No refund processing** — Pricing page mentions "30-day refund policy" but zero code exists.
   - **Fix**: Add Stripe refund API call and admin endpoint.

6. **Webhook `checkout.session.completed` hardcodes 30-day period** — Line 927 hardcodes `currentPeriodEnd` instead of reading from Stripe.
   - **Fix**: Parse `current_period_start`/`current_period_end` from the Stripe subscription object.

7. ~~**`paymentMethod` table is dead schema`**~~ — **FIXED**. Now synced via `payment_method.attached` and `payment_method.detached` webhook events.

8. ~~**No revenue metrics**~~ — **FIXED**. `getBillingOverview()` now computes MRR, ARR, ARPU, net revenue (30d), churned subscriptions (30d), and trial subscription counts.

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
