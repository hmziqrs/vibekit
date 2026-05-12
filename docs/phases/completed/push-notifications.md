# Push Notifications Implementation Plan

## Status: Completed

## Overview

Implement Web Push API for browser push notifications with subscription management, notification click actions, and cross-browser compatibility.

## Implementation

### 1. Database Schema

- `pushSubscription` table (id, userId, endpoint, p256dh, auth, userAgent, createdAt)
- Migration: `drizzle/0029_push_notifications.sql`

### 2. Service Worker

- `static/sw.js` — service worker with push event handler, notification click handler
- Push notification display with icon, body, actions
- Click-through to relevant page via notification data

### 3. VAPID Keys

- Generate VAPID key pair for push signing
- Store in env vars: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

### 4. API Routes

- `POST /api/push/subscribe` — register push subscription
- `DELETE /push/unsubscribe` — remove push subscription
- `POST /api/push/test` — send test notification (dev only)

### 5. Push Service

- `src/lib/server/push.ts` — web-push wrapper using `web-push` npm package
- `sendPushNotification()` — send to single user or all subscribers
- Integration with existing notification system

### 6. Client Components

- Push notification permission prompt
- Subscribe/unsubscribe toggle in settings
- Service worker registration on app load

### Files

- `drizzle/0029_push_notifications.sql`
- `src/lib/server/db/schema.ts` (modified)
- `src/lib/server/push.ts`
- `src/lib/server/hono/index.ts` (modified)
- `src/routes/(app)/app/settings/+page.svelte` (modified — add push toggle)
- `static/sw.js`
- `tests/unit/push-notifications.test.ts`
- `tests/e2e/push-notifications.spec.ts`
