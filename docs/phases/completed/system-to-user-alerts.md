# System-to-User Alerts Implementation Plan

## Status: Completed

## Overview

Extend the existing notification system with admin broadcasts, notification preferences, click-through navigation, and an email bridge for critical alerts.

## Current State

- `notification` table with per-user records, read/unread, entity association, type enum (error/info/success/warning)
- Full CRUD API: list, unread-count, mark-read, mark-all-read, delete
- `NotificationBell` component with 30s polling dropdown
- `createNotification()` helper used in 6 places (comments, org events)
- No admin broadcast, no preferences, no click-through, no email bridge

## Implementation

### 1. Admin Broadcast Notifications

**New admin API route:** `POST /api/admin/notifications/broadcast`

- Body: `{ title: string, body?: string, type: 'info'|'warning'|'success'|'error', target: 'all'|'admins', link?: string }`
- Creates a notification for every matching user
- Rate limited: 5/min

**New admin API route:** `GET /api/admin/notifications/broadcasts`

- List recent broadcasts with recipient counts

### 2. Notification Preferences

**New table:** `notification_preference`

- `id` TEXT PK
- `userId` TEXT FK → user.id
- `channel` TEXT ('in_app' | 'email')
- `type` TEXT ('comment_approved' | 'org_role_change' | 'org_removed' | 'org_ownership' | 'invitation_accepted' | 'broadcast' | 'security_alert')
- `enabled` INTEGER BOOLEAN DEFAULT 1
- PK composite: (userId, channel, type)

**New API routes:**

- `GET /api/notifications/preferences` — Get user's notification preferences
- `PATCH /api/notifications/preferences` — Update preferences

**Integration:** Before `createNotification()`, check if the user has disabled that type for the in_app channel.

### 3. Click-Through Navigation

**Modify:** `notification-bell.svelte`

- Add `link` column to notification table (nullable TEXT)
- On notification click, navigate to the link if present
- Construct links from `entityType` + `entityId` when no explicit link

**Migration:** `ALTER TABLE notification ADD COLUMN link TEXT`

### 4. Email Bridge for Critical Alerts

**New helper:** `src/lib/server/notifications.ts` — `createNotificationWithEmail()`

- Creates in-app notification as before
- If user has email enabled for that type, also sends via EmailService
- Only for `warning` and `error` type notifications by default

### 5. Security Alert Triggers

Wire security event notifications:

- New device login → notify user
- Password changed → notify user
- 2FA enabled/disabled → notify user
- Account suspended → notify user

### 6. Full Notifications Page

**New route:** `src/routes/(app)/app/notifications/+page.svelte`

- Full-page notification list with infinite scroll or pagination
- Filter by type, read/unread status
- Mark all as read button
- Delete individual notifications

### Files

**New files:**

- `drizzle/0027_notification_alerts.sql` — Migration
- `src/routes/(app)/app/notifications/+page.svelte` — Full notifications page
- `src/routes/(app)/app/notifications/+page.ts` — CSR config
- `tests/unit/system-alerts.test.ts`
- `tests/e2e/system-alerts.spec.ts`

**Modified files:**

- `src/lib/server/db/schema.ts` — Add notification_preference table, link column on notification
- `src/lib/server/hono/index.ts` — Add broadcast, preferences routes, security triggers
- `src/lib/server/notifications.ts` — Add preferences check, email bridge
- `src/lib/components/notification-bell.svelte` — Add click-through navigation
- `src/routes/(app)/app/+layout.svelte` — Wire notification preferences
