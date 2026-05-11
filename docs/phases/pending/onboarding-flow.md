# Onboarding Flow — Implementation Plan

## Overview

Guided setup wizard that appears on first login after registration. Users complete their profile (display name, bio, timezone, avatar), then see a brief feature tour. Skip/resume supported — incomplete onboarding redirects to wizard on next login.

## Scope

- Schema: add `onboardingCompleted` and `onboardingStep` to user table
- API: `GET/POST /api/user/onboarding` to read/save progress
- Route: `/app/onboarding` — multi-step wizard page (CSR-only, behind auth)
- Post-login redirect: hooks.server.ts checks onboarding state, redirects incomplete users
- Skip: user can skip, sets `onboardingCompleted = true` with no step progress
- Resume: incomplete onboarding (not skipped, not completed) redirects back to wizard
- Dashboard: show welcome banner for users who just completed onboarding

## Steps

### 1. Schema Changes

**File:** `src/lib/server/db/auth.schema.ts`

Add to `user` table (alphabetical order, after `name`):

```ts
onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).default(false).notNull(),
onboardingStep: integer('onboarding_step').default(0),
```

**File:** `src/lib/server/auth.ts`

Add to `additionalFields`:

```ts
onboardingCompleted: { input: false, required: false, type: 'boolean' },
onboardingStep: { input: false, required: false, type: 'number' },
```

**File:** `src/lib/auth.svelte.ts`

Add to `AuthContext.user`:

```ts
onboardingCompleted?: boolean
onboardingStep?: number | null
```

### 2. Database Migration

Run `bun run db:generate` and `bun run db:push:local`.

### 3. API Endpoint

**File:** `src/lib/server/hono/index.ts`

`GET /api/user/onboarding` (protected):

- Returns `{ completed, step }`

`POST /api/user/onboarding` (protected):

- Body: `{ step?: number, completed?: boolean }`
- Updates user row
- Returns `{ completed, step }`

### 4. Onboarding Route & Page

**File:** `src/routes/(app)/app/onboarding/+page.svelte`

Multi-step wizard with 4 steps:

1. **Welcome** — "Let's set up your account" with skip option
2. **Profile** — display name, bio (pre-populated if exists)
3. **Timezone** — timezone selector
4. **Done** — "You're all set!" with link to dashboard

Each step saves progress via `POST /api/user/onboarding`. Final step sets `completed = true`.

**Progress bar** at top showing current step (1-4).

**Skip button** available on every step — sets `completed = true` immediately.

### 5. Post-Login Redirect

**File:** `src/hooks.server.ts`

In `handleRouteGuards` — after confirming user is authenticated and on `/app`:

- Check if `user.onboardingCompleted === false`
- If so, redirect to `/app/onboarding`
- Skip for admin users (role === 'admin')

### 6. Dashboard Enhancement

**File:** `src/routes/(app)/app/dashboard/+page.svelte`

After onboarding completion, show a dismissible welcome banner:

- "Your account is set up! Here's a quick overview..."
- Auto-detect via query param `?onboarded=true`

### 7. Tests

**Unit tests** (`tests/unit/onboarding.test.ts`):

- Onboarding step validation (0-3 range)
- Skip sets completed = true
- Step progression logic
- API body validation

**E2E tests** (`tests/e2e/onboarding.spec.ts`):

- New user sees onboarding wizard
- Can navigate through steps
- Can skip onboarding
- Skipped/completed users go straight to dashboard
- Profile data saved during onboarding persists

## File List

- `src/lib/server/db/auth.schema.ts` — add onboarding columns
- `src/lib/server/auth.ts` — add additionalFields
- `src/lib/auth.svelte.ts` — add to AuthContext type
- `src/lib/server/hono/index.ts` — API endpoints
- `src/routes/(app)/app/onboarding/+page.svelte` — wizard page
- `src/hooks.server.ts` — redirect logic
- `src/routes/(app)/app/dashboard/+page.svelte` — welcome banner
- `tests/unit/onboarding.test.ts` — unit tests
- `tests/e2e/onboarding.spec.ts` — E2E tests
