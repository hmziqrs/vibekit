# Code Quality Deep Audit

**Date:** 2026-05-15
**Scope:** Race conditions, missing input validation, type safety gaps, error handling

## Findings & Fixes

### 1. Race Conditions — Missing Loading Guards (3 medium)

**api-keys/+page.svelte** — `handleRevoke` and `handleDelete` had no loading guard. Rapid clicks sent duplicate API requests.

- **Fix:** Added `revokingOrDeleting` state, `if (revokingOrDeleting) return` guard, `disabled` on buttons.

**webhooks/+page.svelte** — `createEndpoint` and `deleteEndpoint` had no loading guard.

- **Fix:** Added `creating` and `deletingId` states, `disabled` on Create and Delete buttons.

**organizations/[id]/+page.svelte** — `changeRole` had no per-member loading state. Rapid dropdown changes fired concurrent PATCH requests.

- **Fix:** Added `changingRoleId` state, `disabled={changingRoleId === member.id}` on the `<select>`.

### 2. Type Safety — Untyped res.json() Crash Risks (4 high)

**admin/users/[id]/+page.svelte** and **admin/users/+page.svelte** — Impersonation response accessed `data.sessionToken` and `data.targetUser.email` without type guards. If API returned unexpected shape, `TypeError` would crash.

- **Fix:** Added `as { sessionToken?: string; targetUser?: { email?: string; name?: string } }` type assertion, null check before accessing.

**invitations/+page.svelte** — `res.json()` results untyped, error parsing used `data.error?.message` without type assertion.

- **Fix:** Added proper type assertions on all `res.json()` calls.

### 3. Missing Input Validation on Billing Routes (5 high)

**POST /billing/portal** — `returnUrl` parsed with TypeScript generic, not zod.

- **Fix:** Added `portalSessionSchema` to billing validators, used `safeParse`.

**POST /billing/payment-methods/detach** and **set-default** — `paymentMethodId` cast as `{ paymentMethodId?: string }` without zod.

- **Fix:** Added `paymentMethodIdSchema`, used `safeParse`.

**POST /:orgId/billing/checkout** — `planId`, `successUrl`, `cancelUrl` parsed with TypeScript generic.

- **Fix:** Used existing `checkoutSessionSchema.safeParse`.

**POST /:orgId/billing/change-plan** — `newPlanId` parsed with TypeScript generic.

- **Fix:** Used existing `changePlanSchema.safeParse`.

### 4. Browser Verification (all passed)

Verified pages via Playwright + snapshot analysis:

- Homepage — clean layout, no issues
- Pricing — 2 plan cards, CTAs, FAQ
- Blog listing — search, tags, article cards
- Blog article — code blocks, comments, series sidebar
- Features — 8 feature cards with icons
- App dashboard — stats, quick actions, activity feed
- Settings — password, 2FA, sessions, security, data export
- Admin guard correctly requires 2FA

## Files Modified

- `src/routes/(app)/app/settings/api-keys/+page.svelte` — loading guards
- `src/routes/(app)/app/settings/webhooks/+page.svelte` — loading guards
- `src/routes/(app)/app/organizations/[id]/+page.svelte` — changeRole guard
- `src/routes/(admin)/admin/users/[id]/+page.svelte` — type safety
- `src/routes/(admin)/admin/users/+page.svelte` — type safety
- `src/routes/(app)/app/invitations/+page.svelte` — type safety
- `src/lib/validators/billing.ts` — new schemas
- `src/lib/server/hono/index.ts` — billing route validation

## Verification

- `bun run format:check` — pass
- `bun run lint` — 0 errors (224 warnings pre-existing)
- `bun run test` — 4039 tests pass (199 files)
