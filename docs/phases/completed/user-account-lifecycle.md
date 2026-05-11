# Phase: User Account Lifecycle

## Status: Completed

## Overview

Fix session revocation gaps for soft-deleted/suspended users, add self-service account deactivation using existing `status` enum, add grace period re-enable flow for deleted accounts, and update UI messaging.

## Existing Infrastructure (Already Built)

- Email verification: fully implemented (config, route, UI, DB schema). Email delivery is a console.log stub.
- Account deletion: soft-delete via `DELETE /account` with two-step confirmation UI.
- `deletedAt` column on user table with soft-delete filtering in admin queries.
- Hard cleanup cron (`POST /api/admin/cleanup`) permanently deletes records older than 30 days.
- `status` column: `text({ enum: ['active', 'suspended'] }).default('active')` already exists on user table.
- Admin suspend/unsuspend endpoints already exist with session revocation.

## Sub-Tasks

### 1. Middleware: reject deleted/suspended users

- In `src/lib/server/hono/middleware.ts`, after `auth.api.getSession()`, check:
  - If `user.deletedAt` is non-null → return 401
  - If `user.status === 'suspended'` → return 401
- This catches race conditions where sessions survive status changes

### 2. Session revocation on self-delete

- In `DELETE /account` endpoint, after setting `deletedAt`, revoke all sessions for the user
- Query `session` table by userId and delete all rows
- This ensures other browser sessions are invalidated, not just the current one

### 3. Session revocation on admin delete

- In `adminApp.delete('/users/:id')`, after soft-delete, revoke target user's sessions
- Copy the pattern from suspend flow (lines 1017-1019 in hono/index.ts)

### 4. Self-service account deactivation

- Extend `status` enum to include `'deactivated'` (user-initiated) vs `'suspended'` (admin-initiated)
- Add `PATCH /api/account/deactivate` endpoint (requires password confirmation)
- Sets `status: 'deactivated'`, revokes sessions
- Add `PATCH /api/account/reactivate` endpoint — reactivates within 30-day grace period
- Sets `status: 'active'`, clears `deletedAt` (if reactivating from deletion)
- Deactivation does NOT set `deletedAt` — only changes status. This preserves the user's data indefinitely.

### 5. Grace period re-enable flow for deleted accounts

- When deleted user tries to sign in, the middleware returns 401
- Client detects the 401 and checks if `deletedAt` is within 30 days
- Show "Your account is scheduled for deletion" with a "Reactivate" button
- Reactivation: `POST /api/account/reactivate` clears `deletedAt` and sets `status: 'active'`
- No new token/verification flow needed — just password re-authentication + API call

### 6. Settings UI updates

- Add "Deactivate Account" section (separate from delete)
- Update delete dialog: change "This action cannot be undone" to mention 30-day grace period
- Add link to data retention info

### 7. Data retention section on privacy page

- Add a "Data Retention" section to existing `/privacy` page
- Document: soft-delete holds data for 30 days, permanent deletion after cleanup
- Link from delete account dialog

### 8. AuthContext type updates

- Add `status` and `deletedAt` to the `AuthContext` user type in `src/lib/auth.svelte.ts`

## Files to Modify

- `src/lib/server/db/auth.schema.ts` — extend status enum to include 'deactivated'
- `drizzle/0014_*.sql` — migration (generated via `bun run db:generate`)
- `src/lib/server/auth.ts` — update status enum in additionalFields
- `src/lib/server/hono/index.ts` — session revocation in delete endpoints, add deactivation/reactivation endpoints
- `src/lib/server/hono/middleware.ts` — reject deleted/suspended users
- `src/routes/(app)/app/settings/+page.svelte` — add deactivate option, update delete UI
- `src/routes/(public)/privacy/+page.svelte` — add data retention section
- `src/lib/auth.svelte.ts` — add `status`, `deletedAt` to AuthContext type

## Files to Create

- `src/routes/(auth)/reactivate/+page.svelte` — reactivation flow for deleted accounts

## Testing Plan

- Unit tests: middleware rejection for deleted/suspended/deactivated users
- Unit tests: deactivation/reactivation API validation
- E2E test: deactivate → locked out → reactivate → access restored
- E2E test: delete → grace period → reactivate → access restored
- E2E test: admin suspend/delete with session revocation

## Quality Gates

- `bun run check`, `bun run lint`, `bun run format:check`, `bun run test` all pass
