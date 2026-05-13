# In-App Notification System

## Overview

Implement real-time-ish in-app notifications with a bell icon in the app header, notification list, read/unread state, and API endpoints. Notifications are triggered by key system events (org invitations, role changes, security alerts, etc.).

## Database Schema

### `notification` table

```sql
CREATE TABLE notification (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'info' | 'warning' | 'success' | 'error'
  title TEXT NOT NULL,
  body TEXT,
  read_at INTEGER, -- null = unread
  entity_type TEXT, -- 'organization' | 'team' | 'item' | 'blog' | 'report' | 'security' | 'system'
  entity_id TEXT,
  metadata TEXT, -- JSON
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
);

CREATE INDEX notification_user_read_idx ON notification(user_id, read_at);
```

## API Endpoints

### Protected (require auth)

- `GET /api/notifications` — list notifications (paginated, newest first)
- `GET /api/notifications/unread-count` — return `{ count: number }`
- `PATCH /api/notifications/:id/read` — mark single notification as read
- `PATCH /api/notifications/read-all` — mark all as read for current user
- `DELETE /api/notifications/:id` — delete single notification

## Notification Triggers

Notifications are created server-side alongside audit logs:

1. **Organization invitations** — when a user is invited (`organization.invite`)
2. **Role changes** — when a user's role is changed (`organization.member.update_role`, `team.member.update_role`)
3. **Membership changes** — when added to or removed from a team/org
4. **Security alerts** — new device login, account locked, suspicious login
5. **Content moderation** — report resolved/dismissed on user's content
6. **System announcements** — when new announcement is created
7. **Ownership transfer** — org ownership transferred

## UI Components

### Notification Bell (`src/lib/components/notification-bell.svelte`)

- Bell icon with badge showing unread count
- Click opens dropdown with recent notifications
- Each notification shows icon (by type), title, body, time ago, read/unread indicator
- "Mark all as read" button
- Link to navigate to related entity

### Placement

In `(app)/+layout.svelte` header, replacing the "App" text with a flex row containing the bell.

## Files to Create/Modify

### New files

- `src/lib/validators/notification.ts` — validators (if needed)
- `src/lib/components/notification-bell.svelte` — bell icon + dropdown
- `drizzle/0021_*.sql` — migration
- `tests/e2e/notifications.spec.ts` — E2E tests

### Modified files

- `src/lib/server/db/schema.ts` — add notification table
- `src/lib/server/hono/index.ts` — add notification endpoints + createNotification calls
- `src/hooks.server.ts` — add security event notifications
- `src/routes/(app)/+layout.svelte` — add NotificationBell component
- `drizzle/meta/_journal.json` — register migration
