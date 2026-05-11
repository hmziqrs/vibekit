# Phase: Session & Device Management

## Status: In Progress

## Current State

- Session table already has `ipAddress` and `userAgent` columns
- Better Auth captures IP/UA automatically into session records
- `listSessions()`, `revokeSession()`, `revokeOtherSessions()` available without plugins
- `revokeOtherSessions: true` already enabled on password change
- No session management UI exists in settings

## Implementation Plan

### 1. Settings Page — Active Sessions Section

Add "Active Sessions" section to settings:

- List all active sessions with device info, IP, last active time
- Highlight current session
- "Sign out" button per session (except current)
- "Sign out all other sessions" button
- Parse user-agent to show browser/OS icons

### 2. No plugin needed

The built-in Better Auth APIs provide all needed functionality:

- `authClient.listSessions()` — list user sessions
- `authClient.revokeSession({ token })` — revoke specific session
- `authClient.revokeOtherSessions()` — revoke all except current

## Files to Modify

- `src/routes/(app)/app/settings/+page.svelte` — add active sessions section

## Tests

### Unit Tests

- Verify settings page has session management code

### E2E Tests

- Active sessions section visible in settings

## Quality Gates

- `bun run test`: All tests pass
- `bun run check`: Clean
- `bun run lint`: 0 errors
- `bun run format:check`: Clean
