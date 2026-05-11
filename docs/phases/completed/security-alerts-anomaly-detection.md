# Phase: Security Alerts & Anomaly Detection

## Status: In Progress

## Overview

Add persistent security event tracking, anomaly detection (new device/IP), and user-facing security alerts. All self-hosted using existing infrastructure (Cloudflare Email Workers, `EmailClient`, `auditLog` table).

## Sub-Tasks

### 1. Security Event Schema

- Add `securityEvent` table to `src/lib/server/db/schema.ts`
- Fields: id (uuid), userId, eventType (text), ipAddress, userAgent, metadata (JSON text), createdAt
- Event types: `login`, `login_failed`, `logout`, `password_change`, `two_factor_enabled`, `two_factor_disabled`, `passkey_added`, `passkey_removed`, `new_device`, `suspicious_login`, `account_locked`, `account_unlocked`, `social_account_linked`, `social_account_unlinked`
- Generate migration SQL

### 2. Security Event Writer Service

- Create `src/lib/server/services/security-events.ts`
- `writeSecurityEvent(db, { userId, eventType, ipAddress?, userAgent?, metadata? })` — inserts into securityEvent table
- Also writes to existing `auditLog` table for admin visibility

### 3. Auth Database Hooks

- Add `databaseHooks` to `createAuth()` in `src/lib/server/auth.ts`
- `session.create.after`: Write `login` event, detect new IP/device
- `session.delete.after`: Write `logout` event
- `account.create.after`: Write `social_account_linked` event
- `account.update.after`: Write `password_change` or `two_factor_*` events (detect from changes)

### 4. New Device/IP Detection

- In `session.create.after` hook, query previous sessions for same userId
- Compare current IP against known IPs from session table
- If new IP: write `new_device` security event + send email alert (if email configured)
- Simple string comparison — no geolocation needed for MVP

### 5. Failed Login Threshold Alerts

- Enhance `hooks.server.ts` sign-in handler
- On 3rd failed attempt: write `login_failed` event with count
- On lockout (5th attempt): write `account_locked` event
- On successful login after previous failures: write `account_unlocked` event

### 6. Email Alert Templates

- Create plain-text email templates for security alerts
- Templates: new device login, failed login attempts, password change, 2FA change, account locked
- Use existing `EmailClient` — only send if email service is configured (no-op in dev)

### 7. Security Settings UI — Login History

- Add "Security Activity" section to `/app/settings` page
- Show last 20 security events with: event type, IP address, device info, timestamp
- Color-coded event types (green for login, yellow for warnings, red for suspicious)
- Link to revoke all sessions if suspicious activity detected

### 8. Security Notification Preferences

- Add notification preference toggles to settings page
- Store in user metadata or a separate preferences field
- Options: new device alerts, failed login alerts, security change alerts
- Default all ON

## Files to Create/Modify

- `src/lib/server/db/schema.ts` — add securityEvent table
- `drizzle/00XX_security_events.sql` — migration
- `src/lib/server/services/security-events.ts` — new file
- `src/lib/server/auth.ts` — add databaseHooks
- `src/hooks.server.ts` — enhance login event logging
- `src/routes/(app)/app/settings/+page.svelte` — add security activity section

## Testing Plan

- Unit tests for `writeSecurityEvent()`, new device detection logic
- Unit tests for event type classification
- E2E test: login → verify security event appears in settings
- E2E test: failed login → verify threshold alert logic

## Quality Gates

- `bun run check` passes
- `bun run lint` passes
- `bun run format:check` passes
- `bun run test` all tests pass
