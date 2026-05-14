# Notifications & Communication — Deep Audit

**Date:** 2026-05-14
**Scope:** Notification service, push notifications, broadcast, preferences, routes, schema

## Phase Coverage

| Phase                      | Status   | Notes                                                                          |
| -------------------------- | -------- | ------------------------------------------------------------------------------ |
| In-app notification system | Complete | Bell, read/unread, bulk mark-read, preferences                                 |
| System-to-user alerts      | Complete | Broadcast API, announcements with scheduling                                   |
| Email infrastructure       | Complete | Queue with backoff, bounce handling, unsubscribe                               |
| Email templates            | Partial  | 6 templates exist. Missing: invoice, subscription, team invite, security alert |
| Push notifications         | Complete | Web Push, VAPID, subscription management, dead sub cleanup                     |
| Email template editor      | Missing  | No admin UI for editing email templates                                        |

## Files Audited

| File                                                      | Lines | Status   |
| --------------------------------------------------------- | ----- | -------- |
| `src/lib/server/notifications.ts`                         | 142   | Complete |
| `src/lib/server/push.ts`                                  | 99    | Complete |
| `src/lib/server/db/schema.ts` (notification tables)       | ~50   | Complete |
| `src/lib/server/hono/index.ts` (notification/push routes) | ~200  | Complete |

## Issues Found & Fixed (HIGH)

| Issue                                                                                           | Fix                                                                |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| N+1 query in `createBroadcast` — O(n) DB calls for preference checks                            | Replaced with single bulk `SELECT ... WHERE userId IN (...)` query |
| TOCTOU race in `setNotificationPreference` — select-then-insert/update                          | Replaced with `INSERT ... ON CONFLICT DO UPDATE` upsert            |
| Non-atomic delete-then-insert in `subscribeToPush` — crash loses subscription                   | Replaced with `INSERT ... ON CONFLICT DO UPDATE` upsert            |
| No unique constraint on `(userId, type, channel)` in `notificationPreference`                   | Changed `index` to `uniqueIndex` for race condition protection     |
| No unique constraint on `endpoint` in `pushSubscription`                                        | Changed `index` to `uniqueIndex` for upsert support                |
| All 6 `createNotification` callers lack try/catch — notification failure kills parent operation | Changed all to fire-and-forget with `.catch()` logging             |

## Issues Documented (MEDIUM/LOW)

| Issue                                                                          | Severity | Notes                                        |
| ------------------------------------------------------------------------------ | -------- | -------------------------------------------- |
| No `push` channel in notificationPreference enum                               | MEDIUM   | Users cannot opt out of push via preferences |
| `NotificationType` duplicated in 4 locations                                   | MEDIUM   | Should be shared constant                    |
| Unbatched deletes for invalid push subscriptions                               | MEDIUM   | Fires N individual DELETE queries            |
| No rate limit on `POST /push/subscribe` and `/push/unsubscribe`                | MEDIUM   | Open to spam                                 |
| Missing email templates for billing/subscription/security events               | MEDIUM   | 6 of ~10 needed                              |
| `configureWebPush` called per-request instead of once at startup               | LOW      | Fragile global state mutation                |
| Inconsistent `entityType` default (`'general'` for lookup, `null` for storage) | LOW      | Semantic confusion                           |
| Hardcoded limit of 50 push subscriptions with no pagination                    | LOW      | Silent truncation                            |
| No email template editor UI                                                    | LOW      | Feature gap                                  |

## Tests

- `tests/unit/notifications.test.ts` — 16 tests covering exports, createNotification, createBroadcast, setNotificationPreference (upsert), getNotificationPreferences
- `tests/unit/notifications-broadcast.test.ts` — 12 tests covering createNotification, createBroadcast, preferences
- `tests/unit/push.test.ts` — 13 tests covering configureWebPush, subscribeToPush, sendPushNotification
- `tests/unit/push-notifications.test.ts` — 7 tests covering push operations

## Test Gaps

- No integration tests for notification/push route handlers
- No tests for concurrent setNotificationPreference (race verification)
- No E2E tests for push notification flow
