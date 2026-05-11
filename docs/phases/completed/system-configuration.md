# System Configuration Management

## Overview

Implement runtime system configuration including feature flags, maintenance mode toggle, and system announcements. All configuration is stored in D1 and managed via admin UI — no redeploy needed for config changes.

## Database Schema

### `system_config` table

```sql
CREATE TABLE system_config (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'string', -- 'string' | 'boolean' | 'json'
  description TEXT,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedBy TEXT REFERENCES "user"(id)
);
```

### `announcement` table

```sql
CREATE TABLE announcement (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info' | 'warning' | 'critical'
  isActive INTEGER NOT NULL DEFAULT 1,
  startsAt TEXT,
  endsAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  createdBy TEXT REFERENCES "user"(id),
  dismissedBy TEXT -- JSON array of user IDs who dismissed
);
```

### Seed data for feature flags

Pre-populate `system_config` with:

- `maintenance_mode` (boolean, default false)
- `registration_enabled` (boolean, default true)
- `blog_comments_enabled` (boolean, default false)
- `file_upload_max_mb` (string, default "10")

## Admin API Endpoints

### Config

- `GET /api/admin/config` — list all config entries
- `PATCH /api/admin/config/:key` — update a config value (validates type)

### Announcements

- `GET /api/admin/announcements` — list all announcements (paginated)
- `POST /api/admin/announcements` — create announcement
- `PATCH /api/admin/announcements/:id` — update (toggle active, edit message)
- `DELETE /api/admin/announcements/:id` — delete

### Public

- `GET /api/announcements` — active announcements (no auth, for banner display)

## Validators

### `src/lib/validators/config.ts`

```ts
updateConfigSchema: { key: string, value: string }
createAnnouncementSchema: { message: string, type: enum, startsAt?: string, endsAt?: string }
updateAnnouncementSchema: { message?: string, type?: enum, isActive?: boolean, startsAt?: string, endsAt?: string }
```

## Admin UI Pages

### `/admin/settings` — System Settings Page

Three sections:

**1. Feature Flags**

- Grid of toggle cards, each showing flag name, description, current value
- Boolean flags show a toggle switch
- String/number flags show inline editable input
- Save button per flag

**2. Maintenance Mode**

- Prominent toggle card with warning styling
- When enabled, shows a textarea for maintenance message
- Audit log entry on toggle

**3. Announcements**

- Table of existing announcements (message, type badge, active status, dates)
- Create button opens a form dialog
- Edit/delete actions per row
- Toggle active/inactive

### Add to admin sidebar

Add "Settings" nav item to the admin layout navItems array.

## Server-Side: Maintenance Mode

### `hooks.server.ts`

Add a check after auth handling:

- On every request, check if `maintenance_mode` config is `true`
- If yes and user is NOT admin, return 503 with maintenance page
- Admins bypass maintenance mode (so they can disable it)
- Cache the maintenance mode value for 30 seconds to avoid DB hit per request

## Public: Announcement Banner

### `src/lib/components/announcement-banner.svelte`

- Fetches `/api/announcements` on mount
- Shows a dismissible banner at top of page for active announcements
- Color-coded by type (info=blue, warning=yellow, critical=red)
- Stores dismissed IDs in sessionStorage

## Files to Create/Modify

### New files

- `src/lib/validators/config.ts`
- `src/routes/(admin)/admin/settings/+page.svelte`
- `src/routes/(admin)/admin/settings/+page.ts`
- `src/lib/components/announcement-banner.svelte`
- `drizzle/0020_*.sql` (migration)
- `tests/unit/config-validators.test.ts`
- `tests/e2e/system-config.spec.ts`

### Modified files

- `src/lib/server/db/schema.ts` — add systemConfig, announcement tables
- `src/lib/server/hono/index.ts` — add admin config/announcement endpoints + public announcement endpoint
- `src/routes/(admin)/+layout.svelte` — add Settings nav item
- `src/hooks.server.ts` — add maintenance mode check
- `drizzle/meta/_journal.json` — register migration

## Audit & Edge Cases

1. **Race conditions**: Two admins toggling same flag simultaneously — last write wins, acceptable for config
2. **Cache invalidation**: Maintenance mode check should not be fully cached — use a short TTL or check per-request for critical flags
3. **Announcement scheduling**: startsAt/endsAt comparison should use server time, not client
4. **Dismissed announcements**: Store per-session, not per-user in DB — simpler, no GDPR concerns
5. **Type coercion**: Boolean configs stored as "true"/"false" strings, must parse correctly
6. **Default values**: If config row doesn't exist, API returns hardcoded defaults
7. **Feature flag checks in code**: Provide a `getConfig(db, key)` helper that returns the parsed value with fallback
