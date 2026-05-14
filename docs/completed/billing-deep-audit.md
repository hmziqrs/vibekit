# Billing & Payments Deep Audit

**Date:** 2026-05-14
**Auditor:** Claude Code (iteration 5)
**Scope:** Billing module — schema, Stripe integration, webhook handler, subscription service, validators, API routes, UI

## Files Audited

| File                                                 | Lines | Status   |
| ---------------------------------------------------- | ----- | -------- |
| `src/lib/server/billing/stripe.ts`                   | 98    | Complete |
| `src/lib/server/billing/subscription-service.ts`     | 371   | Complete |
| `src/lib/validators/billing.ts`                      | 50    | Complete |
| `src/lib/server/db/schema.ts` (billing tables)       | ~200  | Complete |
| `src/lib/server/hono/index.ts` (billing routes)      | ~200  | Complete |
| `src/routes/(app)/app/settings/billing/+page.svelte` | 272   | Complete |
| `src/routes/(admin)/admin/billing/+page.svelte`      | 238   | Complete |

## Issues Found & Fixed

### HIGH — Fixed

| Issue                                                                                                      | Fix                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Missing `)` in SQL default for 8 billing columns (`cast(unixepoch(...) as integer)` had unbalanced parens) | Added missing `)` to all 8 occurrences in schema.ts                      |
| Webhook creates duplicate invoices on Stripe retry (no idempotency check)                                  | Added `SELECT` check for existing `stripeInvoiceId` before `INSERT`      |
| Stripe invoices have `userId: null` — invisible to user invoice list                                       | Added subscription lookup fallback when metadata has no userId           |
| Hardcoded fallback `planId: 'plan_pro'` in webhook                                                         | Removed fallback; webhook now logs error if planId missing from metadata |
| User checkout doesn't check `plan.isActive`                                                                | Added `isActive` check with `BadRequestError` response                   |
| `invoice.payment_failed` doesn't update subscription to `past_due`                                         | Added status update to `past_due` on payment failure                     |
| Checkout session doesn't pass `planId` in Stripe metadata                                                  | Added `planId` to `createCheckoutSession` and Stripe metadata            |

### MEDIUM — Documented, not fixed (requires architecture decisions)

| Issue                                                 | Notes                                              |
| ----------------------------------------------------- | -------------------------------------------------- |
| Cancel/reactivate don't call Stripe API               | Requires design: cancel_at_period_end vs immediate |
| `updatePlan` accepts `Record<string, unknown>`        | Needs typed input matching Zod schema output       |
| `paymentMethod` table defined but unused in app code  | Dead code, could be removed or wired up            |
| `formatPrice` always shows `$` regardless of currency | UI issue, not security                             |

### LOW — Documented

| Issue                                             | Notes                                 |
| ------------------------------------------------- | ------------------------------------- |
| `require('stripe')` in ESM context                | Works via interop, inconsistent style |
| `trial_started` event type defined but never used | Audit log gap                         |
| Admin delete plan has no confirmation dialog      | UX improvement                        |
| Admin UI has no edit plan functionality           | Feature gap                           |

## Tests

- `tests/unit/billing.test.ts` — 35 tests (validators, proration)
- `tests/unit/subscription-service.test.ts` — 979 lines, comprehensive service tests
- `tests/unit/billing-validator.test.ts` — 666 lines, 60+ test cases
- `tests/unit/stripe-client.test.ts` — 348 lines, client tests
- `tests/unit/billing-webhook.test.ts` — 10 tests (new, webhook logic)
- `tests/e2e/billing.spec.ts` — 201 lines, E2E API tests

## Test Gaps

- No tests for webhook handler route itself (requires Stripe signature mock)
- No tests for organization billing routes
- No tests for race conditions (double checkout, concurrent cancel/reactivate)

## Fixes Applied After Audit (Iteration 8)

| Issue                                                                       | Fix                                                                                                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No Stripe event ID deduplication (webhook retries could double-process)     | Added `stripe_webhook_event` table with unique `event_id` index. Webhook handler now checks for previously processed events and records event IDs after successful processing. |
| `withApiKey` not imported in hono middleware (500 errors on pages using it) | Added `withApiKey` to destructured import from `./middleware`                                                                                                                  |
| Push notifications had no client-side registration UI                       | Added Push Notifications section to settings page with SW registration, permission request, and subscribe/unsubscribe via API                                                  |
