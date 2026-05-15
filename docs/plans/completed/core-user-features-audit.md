---
phase: 'Core User Features'
date: '2026-05-15'
auditor: 'automated'
status: 'complete'
---

# Core User Features Audit

## Summary

The Core User Features phase covers user profile, settings, dashboard, items CRUD, data export, and onboarding. The implementation is **substantial but has significant gaps** in notification preferences, appearance/language settings, items pagination, and CSV export. The dashboard is a fixed-layout page with no widget customization. Overall readiness: **~65%**.

---

## Claimed vs. Actual

| #   | Claimed Feature                                                                   | Status      | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | User profile (avatar, bio, display name, timezone, profile URL)                   | Partial     | Avatar, bio, display name, timezone all implemented. **No profile URL field** exists in the auth schema or profile page.                                                                                                                                                                                                                                                                                                 |
| 2   | User settings (notification preferences, appearance, language, security settings) | Partial     | Security settings are comprehensive (password, 2FA, passkeys, sessions, connected accounts, push notifications, consent). **Notification preferences page is absent** from settings (only API exists). **No appearance/theme settings** (dark mode toggle, font size). **No language preference UI** (Paraglide language switcher is buried at page bottom per i18n audit).                                              |
| 3   | Dashboard (personalized dashboard with widgets, activity feed, quick actions)     | Partial     | Dashboard has stats cards, recent items list, activity feed, and quick action links. **No widget customization** -- layout is hardcoded. **Not personalized** -- every user sees the same fixed layout. No drag-and-drop, no widget selection.                                                                                                                                                                           |
| 4   | Items CRUD (full CRUD, soft delete, pagination, filtering, sorting)               | Partial     | Full CRUD implemented (create, read, update, delete). Soft delete via `deletedAt` column with 30-day recovery mentioned in UI. Status filter tabs (all/active/archived) and search filter work. **No server-side pagination** -- the items list endpoint fetches all matching items with no `limit`/`offset` parameters. **No sorting** -- results are returned in default DB order with no user-selectable sort column. |
| 5   | Data export (JSON/CSV export, date range selection)                               | Partial     | JSON export exists at `GET /api/account/export` -- downloads a single JSON file with profile, items, org memberships, and audit log entries. Rate limited to 1/hour. **No CSV export option**. **No date range selection** -- always exports all data.                                                                                                                                                                   |
| 6   | Onboarding flow (multi-step wizard, progress tracking, skip/resume)               | Implemented | 4-step wizard (Welcome, Profile, Timezone, All Set). Progress bar shows current step. Skip button available at every step. Resume works via `GET /user/onboarding` which returns current step. Saves progress to `onboardingStep` and `onboardingCompleted` fields on user record.                                                                                                                                       |

---

## Critical Gaps

### HIGH

1. **No items pagination** ✅ FIXED: `GET /api/items` now supports `page` and `limit` query params and returns `{items, total}`.

2. **No items sorting** ✅ FIXED: `sort` query param added with `-` prefix for descending order. Allowlisted columns: `createdAt`, `name`, `status`, `updatedAt`.

3. **No notification preferences UI** ✅ FIXED: Notification preferences page exists at `/app/settings/notifications` with `in_app`, `email`, and `push` channels.

4. **No appearance/language settings**: No UI to switch between dark/light mode (dark mode is always on via `class="dark"` on `<html>`). No language preference selector in settings (i18n audit confirms language switcher is at page bottom, not in settings).

5. **No CSV export**: Export is JSON only. GDPR portability typically requires machine-readable formats; JSON is acceptable but CSV is standard for spreadsheet consumption.

### MEDIUM

6. **No profile URL field**: The auth schema has no `profileUrl` or `website` column. The claimed feature includes "profile URL" but it does not exist anywhere.

7. **Dashboard is not personalized or customizable**: The dashboard layout is entirely hardcoded. No widget reordering, no widget add/remove, no per-user layout persistence. Every user sees identical content.

8. **No date range on export**: Data export always exports everything. For users with large datasets, this means very large downloads with no way to scope.

9. **Onboarding does not redirect uncompleted users**: The onboarding page exists but there is no automatic redirect for users who have not completed onboarding. The `+page.server.ts` load functions in the app layout do not check `onboardingCompleted`.

### LOW

10. **Items search is client-side only**: The search parameter is sent to the API but the API does a `LIKE` query on item names. This is adequate for small datasets but will not scale.

---

## Files

### Routes (UI)

- `src/routes/(app)/app/profile/+page.svelte` -- Profile page (avatar, name, display name, bio, timezone)
- `src/routes/(app)/app/settings/+page.svelte` -- Settings page (password, 2FA, passkeys, sessions, connected accounts, push, consent, deactivate, delete)
- `src/routes/(app)/app/settings/api-keys/+page.svelte` -- API key management
- `src/routes/(app)/app/settings/billing/+page.svelte` -- Billing & subscription
- `src/routes/(app)/app/settings/integrations/+page.svelte` -- Third-party integrations
- `src/routes/(app)/app/settings/webhooks/+page.svelte` -- Webhook management
- `src/routes/(app)/app/dashboard/+page.svelte` -- Dashboard (stats, recent items, activity feed)
- `src/routes/(app)/app/items/+page.svelte` -- Items list (filter, search, archive/delete)
- `src/routes/(app)/app/items/new/+page.svelte` -- Create item form
- `src/routes/(app)/app/items/[id]/edit/+page.svelte` -- Edit item form
- `src/routes/(app)/app/onboarding/+page.svelte` -- 4-step onboarding wizard

### API Routes (Hono)

- `src/lib/server/hono/index.ts` lines 1058-1335 -- Items CRUD (no pagination/sorting)
- `src/lib/server/hono/index.ts` lines 1258-1335 -- Security events, audit log, stats
- `src/lib/server/hono/index.ts` lines 1335-1375 -- Avatar upload
- `src/lib/server/hono/index.ts` lines 1437-1580 -- Data export (JSON only), account delete/deactivate
- `src/lib/server/hono/index.ts` lines 1607-1650 -- Onboarding step tracking

### Schema

- `src/lib/server/db/schema.ts` -- `item` table (lines 147-171), `auditLog` table (lines 173-191)
- `src/lib/server/db/auth.schema.ts` -- `user` table (onboardingStep, onboardingCompleted fields)

### Validators

- `src/lib/validators/profile.ts` -- `updateProfileSchema`
- `src/lib/validators/item.ts` -- `createItemSchema`, `updateItemSchema`
- `src/lib/validators/common.ts` -- Shared validators (password, etc.)

### Tests

- `tests/unit/data-export.test.ts` -- Data export tests
- `tests/unit/schema.test.ts` -- Schema validation tests

---

## Recommendations

1. Add `limit`/`offset` parameters to `GET /api/items` and a pagination component to the items list page.
2. Add a `sort` query parameter to the items API (column + direction).
3. Create a notification preferences settings page at `/app/settings/notifications`.
4. Add appearance settings (theme toggle) and move the language switcher into settings.
5. Add a `profileUrl` column to the user table and expose it in the profile page.
6. Add CSV as an export format option with date range filtering.
7. Consider widget-based dashboard architecture if personalization is a priority.
