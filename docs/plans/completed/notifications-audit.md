# Phase 2 Audit: Notifications & Communication

**Date**: 2026-05-15
**Auditor**: Automated code audit
**Scope**: In-app notification system, system-to-user alerts, email infrastructure, email templates, push notifications, Slack/Discord integration

---

## 1. In-App Notification System

### Claimed Features

- Notification bell
- Real-time updates
- Read/unread state
- Notification types
- Bulk actions
- Notification preferences

### Implementation Evidence

| Feature                  | Status  | Evidence                                                                                                                                                                                                                                                                                                              |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notification bell        | DONE    | `src/lib/components/notification-bell.svelte` -- Bell icon with unread badge (caps at "9+"). Dropdown panel shows latest 10 notifications with type color dots, time-ago formatting, click-to-navigate.                                                                                                               |
| Real-time updates        | PARTIAL | The bell polls `GET /api/notifications/unread-count` every 30 seconds via TanStack Query's `refetchInterval: 30_000`. This is polling, not real-time. No WebSocket, SSE, or Server-Sent Events implementation exists.                                                                                                 |
| Read/unread state        | DONE    | `notification.readAt` column tracks read state. API endpoints: `PATCH /notifications/:id/read` (mark single), `PATCH /notifications/read-all` (mark all). The bell component visually distinguishes read (opacity-60) from unread (blue dot).                                                                         |
| Notification types       | DONE    | `notification.type` enum: `info`, `success`, `warning`, `error`. Displayed via color-coded dots in the bell (`notificationTypeColor()` in `src/lib/notification-utils.ts`).                                                                                                                                           |
| Bulk actions             | PARTIAL | `markAllRead()` is implemented (marks all unread as read). No bulk delete or bulk archive exists.                                                                                                                                                                                                                     |
| Notification preferences | DONE    | `notificationPreference` table with `(userId, type, channel)` unique index. `createNotification()` checks `isInAppEnabled()` before inserting. `GET /notifications/preferences` and `PATCH /notifications/preferences` endpoints exist. However, there is no dedicated UI page for managing notification preferences. |

### Database Schema

| Table                    | Columns                                                                                | Indexes                                                             |
| ------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `notification`           | id, userId, title, body, type, entityType, entityId, link, metadata, readAt, createdAt | `notification_user_read_idx` on (userId, readAt)                    |
| `notificationPreference` | id, userId, type, channel, enabled                                                     | `notification_pref_user_type_idx` unique on (userId, type, channel) |

### API Endpoints

| Method | Path                              | Description                                                      |
| ------ | --------------------------------- | ---------------------------------------------------------------- |
| GET    | `/api/notifications`              | List with pagination (page, limit, offset). Returns total count. |
| GET    | `/api/notifications/unread-count` | Count unread notifications for current user.                     |
| PATCH  | `/api/notifications/read-all`     | Mark all unread as read.                                         |
| PATCH  | `/api/notifications/:id/read`     | Mark single notification as read.                                |
| DELETE | `/api/notifications/:id`          | Delete single notification.                                      |
| GET    | `/api/notifications/preferences`  | Get all preference entries.                                      |
| PATCH  | `/api/notifications/preferences`  | Set a single preference (upsert).                                |

### Issues Found

**MEDIUM -- No real-time delivery mechanism.**

- Location: `src/lib/components/notification-bell.svelte` line 31
- Notifications are polled every 30 seconds. In a Cloudflare Workers environment, implementing WebSockets is not straightforward, but Server-Sent Events (SSE) could work via the streaming response API.
- Impact: Users may not see notifications for up to 30 seconds. For time-sensitive alerts (security, payments), this is inadequate.

**MEDIUM -- No notification preferences UI.** ✅ FIXED

- The API endpoints for getting/setting preferences exist (`GET/PATCH /api/notifications/preferences`), but there is no user-facing settings page to configure them. The `notificationPreference` channel enum is limited to `in_app` and `email`, with no UI to toggle either.
- Impact: Users cannot control which notification types they receive. Preferences default to enabled (`isInAppEnabled` returns `true` when no preference exists).
- **Fix applied:** Notification preferences page already exists at `/app/settings/notifications` with `in_app`, `email`, and `push` channels.

**LOW -- Notification list has no filtering or search.**

- `GET /api/notifications` supports pagination but no filtering by type, read status, or date range. Users with many notifications cannot easily find specific ones.

**LOW -- No notification archiving.**

- Deleting a notification permanently removes it. There is no archive/snooze mechanism.

### UI Components

| Component                     | Status  | Location                                                                             |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------ |
| Notification bell             | DONE    | `src/lib/components/notification-bell.svelte`                                        |
| Notifications list page       | DONE    | `src/routes/(app)/app/notifications/+page.svelte` (exists, referenced in layout nav) |
| Notification preferences page | MISSING | No dedicated route or settings section.                                              |
| Notification link in app nav  | DONE    | `src/routes/(app)/+layout.svelte` line 44 -- "Notifications" link.                   |

---

## 2. System-to-User Alerts

### Claimed Features

- Payment receipts
- Admin warnings
- Broadcast announcements
- Account status changes

### Implementation Evidence

| Feature                 | Status | Evidence                                                                                                                                                                                                                                                                                                              |
| ----------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Broadcast announcements | DONE   | `createBroadcast()` in `src/lib/server/notifications.ts` -- Sends to all users or admins only. Bulk preference check (single query for disabled users). Batched inserts (100 per batch). Admin validator: `broadcastNotificationSchema` in `src/lib/validators/admin.ts`. Admin API endpoint exists for broadcasting. |
| Payment receipts        | DONE   | Billing emails wired to Stripe webhooks: sendPaymentSucceeded (invoice.payment_succeeded), sendPaymentFailed (invoice.payment_failed), sendSubscriptionCanceled (customer.subscription.deleted), sendTrialEndingSoon (customer.subscription.trial_will_end), sendPlanChanged (customer.subscription.updated).         |
| Admin warnings          | DONE   | Ban endpoint sends emailService.sendAccountSuspended() with reason and appeal URL (line 4749). Suspend endpoint also sends notification (line 4670).                                                                                                                                                                  |
| Account status changes  | DONE   | Ban (line 4749), suspend (line 4670), and unban endpoints all handle notifications via emailService.sendAccountSuspended().                                                                                                                                                                                           |

### Issues Found

**MEDIUM -- Broadcast notifications are not triggered by actual system events.**

- `createBroadcast()` must be called explicitly. There is no code that automatically broadcasts when, for example, a new feature is announced, maintenance is scheduled, or a critical security issue is discovered.
- The `announcement` table exists for scheduled announcements (`startsAt`, `endsAt`, `isActive`), but there is no bridge between announcements and the notification system.

**LOW -- `createBroadcast` does not create audit log entries.**

- Unlike `createNotification`, `createBroadcast` does not write to the audit log. Admin broadcasts are not tracked.

---

## 3. Email Infrastructure

### Claimed Features

- Template system with preview
- Transactional emails
- Email queue with retries
- Bounce handling
- Unsubscribe flow

### Implementation Evidence

| Feature                  | Status  | Evidence                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Template system          | DONE    | `src/lib/server/email/templates/base.ts` -- `renderEmail()` function generates HTML email with dark theme, brand colors, responsive table layout. `escapeHtml()` for XSS prevention. `textStyles` for consistent typography. Each template returns `{ html, text }` (multipart).                             |
| Template preview         | MISSING | No endpoint or UI to preview email templates with sample data. No admin page for template management. Templates are code-only with no visual editor.                                                                                                                                                         |
| Transactional emails     | DONE    | `EmailService` class in `src/lib/server/email/index.ts` wraps `EmailQueue`. Methods: `sendWelcome()`, `sendEmailVerification()`, `sendPasswordReset()`, `sendContactNotification()`, `sendNewsletterConfirmation()`. All use `sendImmediate()` which bypasses the queue.                                     |
| Email queue with retries | DONE    | `EmailQueue` in `src/lib/server/email/queue.ts` -- In-memory queue with exponential backoff (`min(1000 * 2^(attempts-1), 15000)`, max 15s). Configurable `maxRetries` (default 3). `onFinalFailure` callback for bounce handling.                                                                            |
| Bounce handling          | PARTIAL | `handleBounce()` in `src/lib/server/email/bounce-handler.ts` -- Updates `newsletterSubscriber.status` to `bounced`. Only handles newsletter subscriber bounces, not general email bounces (e.g., verification emails, password resets). No webhook receiver for ESP bounce events (SendGrid, Mailgun, etc.). |
| Unsubscribe flow         | PARTIAL | `POST /api/newsletter/unsubscribe` endpoint exists. Updates `newsletterSubscriber.status` to `unsubscribed` with timestamp. No `List-Unsubscribe` header in outgoing emails. No one-click unsubscribe (RFC 8058) support. No email preference center.                                                        |

### Issues Found

**CRITICAL -- Email queue is in-memory and lost on Worker recycle.**

- Location: `src/lib/server/email/queue.ts`
- The `EmailQueue` stores queued emails in a JavaScript array (`this.queue`). On Cloudflare Workers, isolate recycles happen frequently and unpredictably. Any queued emails are lost when the isolate dies.
- `sendImmediate()` bypasses the queue entirely, which is why most transactional emails use it. But `sendNewsletterConfirmation()` uses `enqueue()`, meaning newsletter confirmation emails can be silently lost.
- Impact: Newsletter confirmations may never arrive if the Worker recycles before the queue is processed.
- Fix: Use Cloudflare Queues or D1-backed persistence for the email queue. Alternatively, always use `sendImmediate()` for critical transactional emails.

~~**MEDIUM -- No `List-Unsubscribe` header.**~~ **FIXED** — `sendNewsletterConfirmation()` already includes `List-Unsubscribe: <https://vibekit.com/api/newsletter/unsubscribe>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers (email/index.ts lines 43-45).

**MEDIUM -- Bounce handling only covers newsletter subscribers.**

- `handleBounce()` only updates the `newsletterSubscriber` table. If a user's primary email bounces (e.g., during verification or password reset), there is no handling. The user's account could have an invalid email with no notification to the user or admin.

**LOW -- No email sending analytics or logging.**

- The `EmailQueue` logs errors to console but does not persist send results. There is no table tracking email delivery status, open rates, or bounce rates.

**LOW -- Hardcoded sender addresses.**

- All emails use `noreply@vibekit.com` as the sender. No configuration to customize per-template or per-tenant sender addresses.

### Email Adapters

| Adapter                  | Location                                             | Transport                                           |
| ------------------------ | ---------------------------------------------------- | --------------------------------------------------- |
| Cloudflare Email Workers | `src/lib/server/adapter/cloudflare/email-binding.ts` | Uses `env.EMAIL` binding (Cloudflare Email Workers) |
| Node/REST                | `src/lib/server/adapter/node/email-rest.ts`          | HTTP POST to configurable REST API endpoint         |

Both implement the `EmailClient` interface (`send(message: EmailMessage): Promise<EmailResult>`).

---

## 4. Email Templates

### Claimed Features

- Welcome email
- Verification email
- Password reset email
- Invoice email
- Subscription changes email
- Team invites email
- Security alerts email
- Custom templates

### Implementation Evidence

| Template                | Status  | Location                                                                                                                                                                                         |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Welcome                 | DONE    | `src/lib/server/email/templates/welcome.ts` -- Greeting, getting-started checklist, CTA to dashboard.                                                                                            |
| Email verification      | DONE    | `src/lib/server/email/templates/email-verification.ts` -- Verify button, fallback link, ignore-if-not-you note.                                                                                  |
| Password reset          | DONE    | `src/lib/server/email/templates/password-reset.ts` -- Reset button, 1-hour expiry warning.                                                                                                       |
| Invoice                 | DONE    | `src/lib/server/email/templates/billing.ts` -- `renderPaymentSucceeded()` sends invoice receipt with plan name, amount, and billing period. Wired to `invoice.payment_succeeded` Stripe webhook. |
| Subscription changes    | DONE    | `src/lib/server/email/templates/billing.ts` -- `renderPlanChanged()`, `renderSubscriptionCanceled()`, `renderTrialEndingSoon()`, `renderPaymentFailed()`. All wired to Stripe webhooks.          |
| Team invites            | DONE    | `src/lib/server/email/templates/team-invite.ts` -- Invitation email with team name, inviter name, accept button. Wired to `sendTeamInvite()` in EmailService.                                    |
| Security alerts         | DONE    | `src/lib/server/email/templates/security-alert.ts` -- Template for new device, password change, 2FA change alerts. Wired to `sendSecurityAlert()` called from `hooks.server.ts` at 3 locations.  |
| Account suspended       | DONE    | `src/lib/server/email/templates/account-suspended.ts` -- Suspended/banned account notification with reason and appeal URL. Wired to `sendAccountSuspended()`.                                    |
| Account deleted         | DONE    | `src/lib/server/email/templates/account-deleted.ts` -- Account deletion confirmation. Wired to `sendAccountDeleted()`.                                                                           |
| Comment notification    | DONE    | `src/lib/server/email/templates/comment-notification.ts` -- New comment on blog post notification with excerpt. Wired to `sendCommentNotification()`.                                            |
| Contact notification    | DONE    | `src/lib/server/email/templates/contact-notification.ts` -- Admin notification for contact form submissions.                                                                                     |
| Newsletter confirmation | DONE    | `src/lib/server/email/templates/newsletter-confirm.ts` -- Confirmation button for newsletter subscription.                                                                                       |
| Custom templates        | MISSING | No template editor, no admin UI for creating/editing templates. Templates are code-only.                                                                                                         |

### Template Quality Assessment

**Strengths:**

- Dark theme consistent with app design
- Proper HTML escaping via `escapeHtml()`
- Multipart (HTML + plain text) for all templates
- Responsive table-based layout (email client compatible)
- Brand color system (`#6366f1` brand, dark backgrounds)

**Issues:**

- No `List-Unsubscribe` header in any template
- No template preview mechanism
- CTA buttons use inline styles (correct for email) but brand color is hardcoded as `#6366f1` rather than using CSS variables (acceptable for email)
- No personalization beyond name greeting -- no support for dynamic content blocks, user preferences, or conditional sections
- No footer with unsubscribe link in newsletter emails

### Issues Found

**MEDIUM -- Only 1 of 9+ claimed templates is missing.**

- All critical templates exist: welcome, verification, password reset, billing (5 variants), team invite, security alert, account suspended/deleted, comment notification, newsletter confirmation. Only "custom templates" (admin editor) is missing.

**LOW -- No email template for account deletion confirmation.**

- Users can request account deletion, but no confirmation email is sent.

---

## 5. Push Notifications

### Claimed Features

- Web Push API
- Subscription management
- Notification click actions

### Implementation Evidence

| Feature                    | Status  | Evidence                                                                                                                                                                                                                                                                      |
| -------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web Push API               | DONE    | `src/lib/server/push.ts` -- Uses `web-push` library. `configureWebPush()` sets VAPID keys. `sendPushNotification()` sends to all user subscriptions.                                                                                                                          |
| Subscription management    | DONE    | `subscribeToPush()` with upsert (on conflict, update keys). `unsubscribeFromPush()` removes by endpoint. `getUserPushSubscriptions()` lists subs (limit 50). API endpoints: `POST /push/subscribe`, `POST /push/unsubscribe`, `GET /push/subscriptions`.                      |
| Notification click actions | PARTIAL | Push payload includes `data: { url: '/app/notifications' }` in the test notification. ✅ Service worker exists at `static/sw.js` with `push` and `notificationclick` event listeners. Registration happens in settings page via `navigator.serviceWorker.register('/sw.js')`. |

### Database Schema

| Table              | Columns                                                  | Indexes                                                                       |
| ------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `pushSubscription` | id, userId, endpoint, p256dh, auth, userAgent, createdAt | `push_sub_user_idx` on (userId), `push_sub_endpoint_idx` unique on (endpoint) |

### API Endpoints

| Method | Path                      | Description                                       |
| ------ | ------------------------- | ------------------------------------------------- |
| POST   | `/api/push/subscribe`     | Register push subscription (rate limited: 10/min) |
| POST   | `/api/push/unsubscribe`   | Remove push subscription (rate limited: 10/min)   |
| GET    | `/api/push/subscriptions` | List user's push subscriptions                    |
| POST   | `/api/push/test`          | Send test push notification (rate limited: 3/min) |

### Issues Found

**MEDIUM -- VAPID keys are configured per-request, not at startup.**

- Location: `src/lib/server/hono/index.ts` lines 2042-2051
- `configureWebPush()` is called inside the `/push/test` endpoint handler, not during app initialization. For the test endpoint this is fine (it's the only place that sends push), but if push sending were integrated into other flows (e.g., notification creation), VAPID keys would need to be configured each time.
- Fix: Configure VAPID keys once during app boot or in a middleware.

**MEDIUM -- No service worker for handling push notification clicks.** ✅ FIXED: `static/sw.js` exists with `push` and `notificationclick` event handlers. Service worker registered in settings page.

- Location: `src/web-push.d.ts` (type declaration exists, but no `sw.js` or `service-worker.js` file)
- The `web-push` library handles sending notifications to push services, but the browser side requires a service worker with `push` and `notificationclick` event listeners to display and handle clicked notifications.
- Impact: Push notifications may be received by the browser but not displayed, or if displayed, clicking them will not navigate the user to the relevant page.

**MEDIUM -- Push notifications are not integrated into the notification creation flow.** ✅ FIXED

- `createNotification()` in `src/lib/server/notifications.ts` only creates in-app notifications. It does not trigger push notifications. The two systems are completely disconnected.
- Impact: Users who have enabled push notifications will only receive the test notification, not actual system notifications.
- **Fix applied:** `createNotification()` now calls `sendPushNotification()` when the user's push notification preference is enabled.

**LOW -- No push notification preferences.** ✅ FIXED

- The `notificationPreference` table supports `channel: 'in_app' | 'email'` but has no `push` channel. There is no way for users to opt out of push while keeping in-app notifications enabled.
- **Fix applied:** `'push'` added to the `notificationPreference` channel enum.

**LOW -- Invalid subscription cleanup is synchronous.**

- `sendPushNotification()` deletes invalid subscriptions (410/404) with `Promise.all()` individual deletes. Batch delete would be more efficient.

### UI Components

| Component                          | Status  | Location                                                                                                                                                  |
| ---------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push notification toggle           | DONE    | `src/routes/(app)/app/settings/+page.svelte` lines 1121-1152 -- Enable/disable push with browser permission check. Shows supported/denied/granted states. |
| Push notification bell integration | MISSING | The notification bell does not register a service worker or subscribe to push.                                                                            |

---

## 6. Slack/Discord Integration

### Claimed Features

- Workspace notifications
- Slash commands
- Webhook delivery
- Channel-specific alerts

### Implementation Evidence

| Feature                 | Status  | Evidence                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace notifications | MISSING | No code sends notifications to Slack or Discord workspaces. The integration framework can connect to Slack/Discord via OAuth, but there is no notification dispatch logic that sends messages to connected Slack/Discord integrations.                                                                                          |
| Slash commands          | MISSING | No slash command handler exists. No bot framework integration. The Discord scopes include `bot` and `webhook.incoming`, and Slack scopes include `chat:write` and `channels:read`, but no code uses these scopes.                                                                                                               |
| Webhook delivery        | PARTIAL | The generic webhook system (`src/lib/server/webhooks.ts`) can deliver events to any URL, including Slack/Discord webhook URLs. Users could manually create a webhook endpoint pointing to a Slack/Discord incoming webhook URL. However, there is no Slack/Discord-specific formatting (e.g., Slack Block Kit, Discord embeds). |
| Channel-specific alerts | MISSING | No channel targeting or routing logic. No UI to select specific Slack channels or Discord channels for different notification types.                                                                                                                                                                                            |

### Issues Found

**HIGH -- Slack/Discord integration is connect-only with zero functionality.**

- Users can OAuth-connect their Slack/Discord accounts, and the health check pings the provider's auth endpoint, but no actual messages are ever sent to Slack or Discord.
- The claimed features (workspace notifications, slash commands, channel-specific alerts) are entirely unimplemented.
- The integration is essentially a credential store with no consumer.

**MEDIUM -- No Slack/Discord message formatting.**

- Even if webhook delivery were used to send to Slack/Discord, the payload format is generic JSON (`WebhookPayload` with `eventType`, `data`, `occurredAt`). Slack expects either `application/json` with specific Block Kit format or `application/x-www-form-urlencoded`. Discord expects embeds. Neither format is produced.

---

## Summary Scorecard

| Feature Area              | Score | Verdict                                                                                                                                                              |
| ------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| In-App Notifications      | 7/10  | Solid bell component with polling. Missing real-time, preferences UI, and filtering.                                                                                 |
| System-to-User Alerts     | 8/10  | Broadcast, payment receipts, admin warnings, and account status changes all implemented and wired to email service. Broadcast not auto-triggered.                    |
| Email Infrastructure      | 7/10  | Template system and queue exist. List-Unsubscribe header on newsletter emails. Queue is in-memory (Worker recycle concern). Bounce handling is newsletter-only.      |
| Email Templates           | 8/10  | 12 of 13 templates exist including all critical SaaS emails (billing, security, team invite). Only custom template editor missing. No preview mechanism.             |
| Push Notifications        | 7/10  | VAPID subscription flow works. Service worker integrated. Push dispatched from createNotification. Push preference channel added. VAPID keys configured per-request. |
| Slack/Discord Integration | 1/10  | OAuth connection exists. Zero actual functionality -- no messages sent, no slash commands, no channel routing.                                                       |

### Priority Fixes (Ordered)

1. **Fix email queue persistence** -- Replace in-memory queue with Cloudflare Queues or D1-backed queue to prevent email loss on Worker recycle. Critical for newsletter confirmations.
2. **Add missing email templates** -- Invoice receipt, subscription change notifications, team invitations, and security alerts are essential SaaS emails.
3. **Implement Slack/Discord message dispatch** -- Add notification routing to connected Slack/Discord workspaces with proper message formatting (Block Kit, embeds).
4. **Integrate push notifications with notification creation** -- When `createNotification()` is called, also trigger push if the user has subscriptions and preferences allow it.
5. **Add service worker for push notification click handling** -- Without this, push notifications cannot navigate users to relevant pages.
6. **Add `List-Unsubscribe` header to newsletter emails** -- Important for deliverability and spam compliance.
7. **Build notification preferences UI** -- Users need a page to toggle in-app, email, and push channels per notification type.
8. **Add email template preview** -- Admin page to preview all templates with sample data before sending.
