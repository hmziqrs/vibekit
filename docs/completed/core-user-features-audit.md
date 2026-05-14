# Core User Features — Implementation Audit

**Date:** 2026-05-14
**Status:** Audited

## Phase Coverage

| Phase                   | Status      | Notes                                                                          |
| ----------------------- | ----------- | ------------------------------------------------------------------------------ |
| User Profile & Settings | ✅ Complete | Avatar, display name, timezone, 2FA, passkeys, sessions, connected accounts    |
| User Account Lifecycle  | ✅ Complete | Email verification, deactivation, deletion (soft-delete 30-day), reactivation  |
| User Banning System     | ✅ Complete | Admin ban/unban with reason/duration, session termination, appeal, auto-expire |
| User Data Export        | ✅ Complete | Full JSON export, rate-limited 1/hr, audit logged                              |
| Onboarding Flow         | ⚠️ Partial  | 4-step wizard exists but no auto-redirect for new users                        |
| Dashboard               | ✅ Complete | Stats, recent items, activity feed, quick actions                              |

## Issues Found

### HIGH

1. **Bio field collected but never saved** — Profile form collects bio but `authClient.updateUser()` only sends displayName, name, timezone
2. **No notification preferences UI** — API and schema exist but no settings page section
3. **No onboarding auto-redirect** — New users can bypass onboarding entirely

### MEDIUM

4. **No language preference in user settings** — No locale/language field in profile
5. **Items search susceptible to LIKE wildcard injection** — `%` and `_` in search terms cause unexpected matches
6. **Notification filtering is client-side only** — Server API does not accept filter parameters
7. **Account deletion has no scheduled permanent cleanup** — No cron for hard-delete after 30 days

## Key Files

- `src/routes/(app)/app/profile/+page.svelte` — Profile page
- `src/routes/(app)/app/settings/+page.svelte` — Settings (1127 lines, monolithic)
- `src/routes/(app)/app/dashboard/+page.svelte` — Dashboard
- `src/routes/(app)/app/onboarding/+page.svelte` — Onboarding wizard
- `src/routes/(app)/app/notifications/+page.svelte` — Notifications
- `src/lib/server/hono/index.ts` — All API routes

## Test Coverage

- Unit: `account-lifecycle.test.ts`, `banning-system.test.ts`, `data-export.test.ts`, `onboarding.test.ts`
- Gaps: No integration tests for API handlers, no E2E tests for profile/settings/onboarding flows
