# Phase: Two-Factor Authentication (TOTP)

**Status:** Complete
**Category:** Auth & Security
**Started:** 2026-05-11

## Scope

Add TOTP-based two-factor authentication using Better Auth's built-in `twoFactor` plugin. Users can enable 2FA from settings, scan a QR code with an authenticator app, verify during setup, and use backup codes as fallback. The login flow is automatically intercepted when 2FA is enabled. Email OTP is deferred — only TOTP + backup codes for now.

---

## Items

### 1. Enable Better Auth twoFactor Plugin

**Problem:** No 2FA plugin is configured in the auth setup.

**Plan:**

- In `src/lib/server/auth.ts`, add `twoFactor()` from `better-auth/plugins` to the plugins array
- Configure with `issuer: "Vibekit"`, TOTP digits: 6, period: 30
- In `src/lib/auth-client.ts`, add `twoFactorClient()` from `better-auth/client/plugins`
- Configure with `twoFactorPage: "/two-factor"` for redirect after sign-in

**Files changed:** `src/lib/server/auth.ts`, `src/lib/auth-client.ts`

---

### 2. Regenerate Auth Schema and Migrate Database

**Problem:** No `twoFactor` table or `twoFactorEnabled` column exists.

**Plan:**

- Run `bun run auth:schema` to regenerate `src/lib/server/db/auth.schema.ts` with the new table
- Run `bun run db:generate` to create a migration SQL file
- Run `bun run db:push:local` to apply the migration to local dev DB
- Also manually create the table in `data/vibekit.db` if needed (better-sqlite3)

**Files changed:** `src/lib/server/db/auth.schema.ts`, `drizzle/<migration>.sql`

---

### 3. Two-Factor Verification Page (Login Flow)

**Problem:** When a user with 2FA enabled signs in, they need a page to enter their TOTP code or backup code.

**Plan:**

- Create `src/routes/(auth)/two-factor/+page.svelte`:
  - Shows after sign-in redirect when 2FA is required
  - Has a TOTP code input (6 digits)
  - Has a "Use backup code" link that switches to backup code input
  - Has a "Trust this device for 30 days" checkbox
  - On submit, calls `authClient.twoFactor.verifyTotp()` or `authClient.twoFactor.verifyBackupCode()`
  - On success, redirects to `/app`
  - On failure, shows error message
- Uses existing Card components and TanStack Form

**Files changed:** `src/routes/(auth)/two-factor/+page.svelte` (new)

---

### 4. Two-Factor Settings in User Settings Page

**Problem:** Users need a way to enable/disable 2FA and manage backup codes from the settings page.

**Plan:**

- Add a "Two-Factor Authentication" section to `src/routes/(app)/app/settings/+page.svelte`
- States:
  1. **Not enabled**: Show "Enable 2FA" button
  2. **Enabling (verify step)**: Show TOTP QR code + backup codes + verification code input
  3. **Enabled**: Show "Disable 2FA" button + "Regenerate backup codes" button
- Enable flow:
  1. User clicks "Enable 2FA"
  2. Calls `authClient.twoFactor.enable({ password })` — returns `totpURI` and `backupCodes`
  3. Displays QR code (using a simple SVG or the URI as text) and backup codes
  4. User scans QR code, enters TOTP code to verify
  5. Calls `authClient.twoFactor.verifyTotp({ code })` to complete enrollment
- Disable flow:
  1. User clicks "Disable 2FA"
  2. Prompts for password
  3. Calls `authClient.twoFactor.disable({ password })`
- Backup codes:
  1. User clicks "Regenerate backup codes"
  2. Prompts for password
  3. Calls `authClient.twoFactor.generateBackupCodes({ password })`
  4. Shows new codes (old ones are deleted)

**Files changed:** `src/routes/(app)/app/settings/+page.svelte`

---

### 5. QR Code Generation for TOTP URI

**Problem:** Users need a scannable QR code to add their account to an authenticator app.

**Plan:**

- Create `src/lib/components/totp-qr.svelte`:
  - Takes a `uri` prop (the `otpauth://` URI from the enable response)
  - Renders a QR code using a lightweight SVG-based approach
  - Also shows the URI as copyable text for manual entry
  - No external dependencies — use inline SVG QR generation or a small utility

**Files changed:** `src/lib/components/totp-qr.svelte` (new)

---

## Out of Scope

- Email OTP (sendOTP callback) — requires email infrastructure, separate phase
- SMS OTP — not planned
- 2FA enforcement per-role — admin feature, separate phase
- Admin impersonation with 2FA — separate phase
- Passkey/WebAuthn — separate phase

## Success Criteria

- [x] Better Auth twoFactor plugin enabled on server and client
- [x] Auth schema includes `twoFactor` table and `twoFactorEnabled` user column
- [x] Database migration applied
- [x] Two-factor verification page works during login
- [x] Users can enable/disable 2FA from settings
- [x] QR code displayed during 2FA setup
- [x] Backup codes generated and viewable during setup
- [x] All quality gates pass (check, lint, format, test)
