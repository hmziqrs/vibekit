# Phase: User Profile & Settings

## Status: Completed

## Overview

Add user profile editing (avatar upload, display name, bio, timezone) to the existing `/app/profile` page, add a user avatar upload endpoint, and implement account deletion flow. Reuse existing upload infrastructure and validators.

## Sub-Tasks

### 1. Schema: Add bio and timezone columns to user table

- Add `bio` (text, nullable, max 500 chars) and `timezone` (text, nullable) to `auth.schema.ts` user table
- Generate migration 0013
- Update `additionalFields` in `auth.ts` — set `displayName: { input: true }`, add `bio` and `timezone`
- Push migration to local D1 and Node dev DB

### 2. Validator: Create updateProfileSchema

- In `src/lib/validators/common.ts` — add `bio` (string, max 500, optional, nullable) and `timezone` (string, max 50, optional, nullable) validators
- In `src/lib/validators/index.ts` — create and export `updateProfileSchema` combining name, displayName, bio, timezone

### 3. API: Avatar upload endpoint for users

- Add `protectedApp.post('/upload-avatar')` in Hono routes
- Validate image type (JPEG, PNG, WebP) and size (max 2MB for avatars)
- Generate storage key with `avatars/` prefix
- Store via `services.storage.put()`
- Update user `image` field via Better Auth `auth.api.updateUser()` or direct DB update
- Delete old avatar from storage if replacing

### 4. API: Profile update endpoint

- Add `protectedApp.patch('/profile')` in Hono routes
- Validate with `updateProfileSchema`
- Update user fields: name, displayName, bio, timezone via Better Auth or direct DB
- Return updated user object

### 5. UI: Enhance profile page

- Add avatar display with upload button (camera icon overlay)
- Add editable fields: Display Name, Bio (textarea), Timezone (select dropdown with common timezones)
- Keep existing name editing
- Show success/error feedback
- Update AuthContext type to include displayName, bio, timezone, image

### 6. Delete account flow

- Replace placeholder `alert()` with actual API call
- Create `protectedApp.delete('/account')` endpoint
- Soft-delete: set `deletedAt` timestamp
- Revoke all sessions
- Redirect to home page

## Files to Create/Modify

- `src/lib/server/db/auth.schema.ts` — add bio, timezone columns
- `drizzle/0013_*.sql` — migration
- `src/lib/server/auth.ts` — update additionalFields
- `src/lib/validators/common.ts` — add bio, timezone validators
- `src/lib/validators/index.ts` — export updateProfileSchema
- `src/lib/server/hono/index.ts` — add profile + avatar + account deletion endpoints
- `src/routes/(app)/app/profile/+page.svelte` — enhanced profile UI
- `src/routes/(app)/app/settings/+page.svelte` — wire delete account to real API
- `src/lib/auth.svelte.ts` — extend AuthContext type

## Testing Plan

- Unit tests for profile validator, avatar validation
- E2E test: edit profile → verify changes persist
- E2E test: upload avatar → verify image displays
- E2E test: delete account → verify redirect

## Quality Gates

- `bun run check`, `bun run lint`, `bun run format:check`, `bun run test` all pass
