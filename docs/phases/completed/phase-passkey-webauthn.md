# Phase: Passkey / WebAuthn Support

## Status: Complete

## Summary

Added passkey/WebAuthn authentication support using the `@better-auth/passkey` plugin. Users can now sign in with platform authenticators (Touch ID, Windows Hello, fingerprint) and manage passkey credentials in the settings page.

## Changes

### Server Configuration (`src/lib/server/auth.ts`)

- Added `passkey` plugin from `@better-auth/passkey`
- Configured relying party with `origin`, `rpID` (extracted from ORIGIN), and `rpName: 'Vibekit'`

### Client Configuration (`src/lib/auth-client.ts`)

- Added `passkeyClient()` from `@better-auth/passkey/client`
- Plugin registered alongside existing `twoFactorClient`

### Database

- Auto-generated passkey table in `src/lib/server/db/auth.schema.ts`
- Migration `drizzle/0011_condemned_namorita.sql` creates `passkey` table with:
  - `credential_id` (WebAuthn credential ID)
  - `public_key` (authenticator public key)
  - `counter` (signature counter for replay protection)
  - `device_type`, `backed_up`, `transports`, `aaguid`
  - Foreign key to `user` table with cascade delete
  - Indexes on `credential_id` and `user_id`

### Login Page (`src/routes/(auth)/login/+page.svelte`)

- Added "or" divider between email/password form and passkey button
- Added "Sign in with Passkey" button with key SVG icon
- Added `handlePasskeySignIn()` using `authClient.signIn.passkey()`
- Added `passkeyError` state with red error message display

### Settings Page (`src/routes/(app)/app/settings/+page.svelte`)

- Added Passkeys section between 2FA and Delete Account
- Lists registered passkeys with name, creation date, and remove button
- Inline confirm/cancel for passkey deletion
- Input field for passkey name + "Add Passkey" button
- Loading states for registration and deletion
- Error display for passkey operations

### Dependencies

- Added `@better-auth/passkey` package

## Tests

### Unit Tests (`tests/unit/passkey-webauthn.test.ts`)

- 20 tests covering:
  - Server auth config: passkey plugin import, configuration options
  - Client auth config: passkeyClient import
  - Auth schema: passkey table columns, foreign keys, indexes, relations
  - Migration: table creation, indexes
  - Login page: button, API call, error state, separator, button styling
  - Settings page: passkey section, add/list/remove functionality, confirmation flow

### E2E Tests (`tests/e2e/passkey.spec.ts`)

- 8 tests covering:
  - Login page: passkey button visibility, separator, coexistence with email form, no-crash on click
  - Settings page: passkeys section visibility, add input/button, empty state, no-crash on add

## Quality Gates

- `bun run test`: 337+ tests passing
- `bun run check`: Clean
- `bun run lint`: 0 errors, 0 warnings
- `bun run format:check`: Clean
