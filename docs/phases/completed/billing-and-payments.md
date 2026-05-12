# Billing & Payments Implementation

## Status: Completed

## Overview

Full billing system with Stripe integration including subscription management, payment processing, usage-based billing, billing admin, and payment webhooks.

## Implementation

### Database

- `subscriptionPlan` — plan definitions with pricing, interval, trial days, features
- `subscription` — user/org subscriptions with status tracking
- `subscriptionEvent` — audit trail for subscription lifecycle events
- `usageRecord` — metered usage tracking
- `invoice` — invoice records with Stripe sync
- `paymentMethod` — stored payment methods

### API Routes

- User billing: plans, subscription, checkout, portal, change-plan, cancel, reactivate, invoices, usage
- Admin billing: plan CRUD, billing overview, invoices
- Org billing: subscription, checkout, change-plan, invoices
- Public: Stripe webhook handler

### Frontend

- Billing settings page at /app/settings/billing
- Admin billing page at /admin/billing

### Files

- `drizzle/0028_billing.sql`
- `src/lib/server/billing/stripe.ts`
- `src/lib/server/billing/subscription-service.ts`
- `src/lib/validators/billing.ts`
- `src/routes/(app)/app/settings/billing/+page.svelte`
- `src/routes/(admin)/admin/billing/+page.svelte`
- `tests/unit/billing.test.ts`
- `tests/e2e/billing.spec.ts`
