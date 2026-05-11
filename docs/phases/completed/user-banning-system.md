# Phase: User Banning System

## Status: Completed

## Overview

Build a full user banning system on top of the existing suspend/unsuspend infrastructure. Reuse `suspended` status for bans. Add ban reasons, temporary bans with cron-based auto-expiry, sign-in blocking, ban history tracking, user-facing ban notification, and admin UI improvements.

## Design Decisions (Post-Audit)

- **Reuse `suspended` status** for bans — no new `banned` status needed. Keeps middleware/hooks simpler.
- **Cron-based auto-expiry** instead of middleware lazy-expiry — avoids per-request DB writes. Add to existing cleanup cron.
- **Add `type` column** to `contact_submission` table for appeal tracking.

## Sub-Tasks

### 1. Schema: Add ban fields to user table + contact_submission type

- Add `banReason` (text, nullable) to user table
- Add `banExpiresAt` (integer timestamp_ms, nullable) to user table
- Add `type` (text, nullable, default 'general') to contact_submission table
- Generate migration
- Update auth.ts additionalFields for banReason, banExpiresAt

### 2. Block sign-in for suspended users

- In `hooks.server.ts`, before `svelteKitHandler` at the sign-in endpoint, query user by email
- If status is `suspended`, return 403 JSON with `{ error: { code: 'ACCOUNT_BANNED', message, reason, expiresAt } }`
- The client login page detects `ACCOUNT_BANNED` error and redirects to `/banned?email=...`

### 3. Ban auto-expiry via cron

- Add ban expiry logic to the existing `/api/admin/cleanup` cron endpoint
- Query for users with `status = 'suspended'` AND `banExpiresAt < now()`
- Set their status to `active`, clear `banReason` and `banExpiresAt`
- Write audit log with action `user.unban` and metadata `{ reason: 'auto_expired' }`

### 4. Dedicated ban/unban API endpoints

- Add `POST /api/admin/users/:id/ban` with body: `{ reason: string, durationDays?: number }` (null = permanent)
- Sets status to `suspended`, stores `banReason` and `banExpiresAt`, revokes sessions
- Add `POST /api/admin/users/:id/unban` — sets status to active, clears ban fields
- Both write audit logs with actions `user.ban` / `user.unban`

### 5. Admin UI: ban dialog

- Replace suspend toggle with "Ban User" action that opens a dialog
- Dialog: reason textarea, duration selector (permanent / 7d / 30d / 90d / custom)
- "Unban" action clears ban fields
- Show ban badge with reason/expiry in user list

### 6. User-facing ban notification page

- Create `/banned` route at `src/routes/(auth)/banned/+page.svelte`
- Reads `email` from URL params, fetches ban details
- Shows ban reason, expiry (if temporary), appeal link

### 7. Appeal flow

- Add `POST /api/appeal` endpoint (public, rate-limited)
- Stores in `contact_submission` with `type: 'ban_appeal'`
- Subject auto-set to "Ban Appeal"

## Files to Create/Modify

- `src/lib/server/db/auth.schema.ts` — add `banReason`, `banExpiresAt`
- `src/lib/server/db/schema.ts` — add `type` to contactSubmission
- `drizzle/0014_*.sql` — migration (generated)
- `src/lib/server/auth.ts` — add ban fields to additionalFields
- `src/lib/server/hono/index.ts` — ban/unban endpoints, cron expiry, appeal endpoint
- `src/hooks.server.ts` — block sign-in for suspended users
- `src/routes/(admin)/admin/users/+page.svelte` — ban dialog
- `src/routes/(auth)/banned/+page.svelte` — ban notification page
- `src/lib/auth.svelte.ts` — add `banReason`, `banExpiresAt` to AuthContext

## Testing Plan

- Unit tests: ban/unban validation, temporary ban expiry math
- E2E test: admin bans user → user sees ban notification on sign-in
- E2E test: appeal submission via public endpoint
- E2E test: ban/unban in admin UI

## Quality Gates

- `bun run check`, `bun run lint`, `bun run format:check`, `bun run test` all pass
