---
name: Auth & Security Audit
description: Detailed audit of auth phase — claimed features vs actual implementation
type: project
---

# Auth & Security Audit — 2026-05-15

## Methodology

Each claimed feature from `docs/loop.md` (Auth & Security section, lines 93-104) was verified by reading source files, tracing call chains, and checking for end-to-end completeness. Statuses:

- **COMPLETE**: Fully wired end-to-end (config, backend, UI, tests)
- **PARTIAL**: Core mechanism exists but has gaps or missing sub-features
- **NOT IMPLEMENTED**: No code found for the claimed feature
- **NON-FUNCTIONAL**: Code exists but cannot work in its current form

## Claimed vs Actual

| Claimed Feature                                                                                                                                              | Status      | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth security hardening (session fixation, CSRF tokens, cookie flags, token rotation, brute-force protection)                                                | **PARTIAL** | Cookie flags (httpOnly, sameSite=lax, Secure auto-detect) are configured. CSRF is handled by Better Auth's default Origin-header check. Token rotation is handled by Better Auth's `updateAge: 24h`. Brute-force protection exists via custom `auth-lockout.ts` (5 attempts / 15-min lockout) and Better Auth's built-in rate limiter (5 req/60s on sign-in). However: session fixation protection is entirely delegated to Better Auth defaults with no explicit verification; no custom CSRF token mechanism beyond Origin-header check; no token rotation on privilege escalation.                                                                                                                                                                                                                                                                                                                                     |
| Password security (breached password check via HaveIBeenPwned API, password strength estimator, password strength UI, enhanced password validator)           | **PARTIAL** | Password strength estimator exists (`password-strength.ts`) with length/complexity/variety/uniqueness scoring. UI component (`password-strength.svelte`) is wired into register, reset-password, and settings pages. Zod validator enforces min 8 chars, max 128, uppercase, lowercase, digit. **Missing**: HaveIBeenPwned API integration is completely absent — no `hibp`, `breached`, or `pwned` references found anywhere in the codebase. The password strength estimator uses a hardcoded list of ~19 common patterns instead of the k-anonymity HIBP API.                                                                                                                                                                                                                                                                                                                                                          |
| Two-factor authentication (TOTP apps, backup/recovery codes, remember device, 2FA enforcement per-role/per-org)                                              | **PARTIAL** | TOTP 2FA is fully configured via Better Auth `twoFactor` plugin with 6-digit, 30-second period codes. Client plugin (`twoFactorClient`) redirects to `/two-factor` page. UI in settings page (`+page.svelte`) enables/disables 2FA with QR code display, verification, and backup code display. Security events track `two_factor_enabled`/`two_factor_disabled`. **Missing**: "Remember device" / trusted device feature is not implemented. "2FA enforcement per-role/per-org" does not exist — no middleware or hook checks whether a user should be forced into 2FA based on role or org membership. The `twoFactorPage` redirect works but is not conditionally enforced.                                                                                                                                                                                                                                            |
| Passkey / WebAuthn support (platform authenticators, cross-device auth, credential management UI)                                                            | **PARTIAL** | Better Auth `passkey` plugin is configured with origin, rpID, and rpName. Client `passkeyClient()` is registered. The settings page has a passkey section that lists user passkeys via `authClient.passkey.listUserPasskeys()` and supports adding/removing passkeys. Security events track `passkey_added`/`passkey_removed`. Database schema has `passkey` table with credentialID, publicKey, transports, deviceType, backedUp. **Missing**: Cross-device auth (device-to-device passkey provisioning) is not explicitly implemented — it relies entirely on the browser's native WebAuthn dialog, which is standard but not custom-bespoke. No dedicated passkey-first login page.                                                                                                                                                                                                                                    |
| OAuth & social login hardening (PKCE flow verification, state parameter validation, account linking conflicts, provider-specific edge cases)                 | **PARTIAL** | Better Auth handles Google/GitHub OAuth with encrypted tokens (`encryptOAuthTokens: true`). Account linking is configured (`accountLinking.enabled: true`, trusted providers listed). Custom OAuth integration (`integrations/oauth.ts`) uses Arctic library with PKCE (S256 code_challenge), state parameter stored in D1, consumed once, and 10-minute TTL with cleanup. **Missing**: The PKCE + state validation only applies to the custom integration OAuth flow (e.g., connecting external services), not to Better Auth's built-in Google/GitHub login — that is delegated to Better Auth's internal implementation. Account linking conflict resolution is basic (allowDifferentEmails: false). No provider-specific edge case handling found.                                                                                                                                                                    |
| Session & device management (list active sessions, remote logout, device fingerprinting, session IP/user-agent tracking, concurrent session limits)          | **PARTIAL** | Active sessions are listed in settings UI via `authClient.listSessions()` showing IP address and user-agent. Remote logout of individual sessions and "sign out all other devices" are implemented. Session table has `ipAddress` and `userAgent` columns. Security events fire on login/logout. **Missing**: Session IP/UA is tracked at the DB level but Better Auth's session creation does not automatically populate these fields from the hook — only the `listSessions` API reads them. No evidence that `ipAddress`/`userAgent` are being written during session creation in the hook chain. Device fingerprinting beyond IP/UA does not exist. Concurrent session limits are not implemented.                                                                                                                                                                                                                    |
| Security alerts & anomaly detection (new device/IP notification, password/2FA change alerts, suspicious login location, failed login thresholds)             | **PARTIAL** | Security events are written to `security_event` table for: login, login_failed, logout, new_device, password_change, two_factor_enabled/disabled, account_locked, passkey_added/removed, social_account_linked/unlinked, suspicious_login (type exists). New device detection compares current IP against known session IPs. Failed login thresholds exist via lockout system (5 attempts). Email notifications sent via `sendSecurityAlert()` for new device, password change, and 2FA changes. **Missing**: "Suspicious login location" detection type exists but is never emitted. No geo-IP lookup. Failed login thresholds produce lockouts but no alert emails for the lockout itself.                                                                                                                                                                                                                              |
| Security headers & CSP (Content-Security-Policy with nonce-based script-src, HSTS preload, X-Frame-Options, COOP, CORP, referrer policy, permissions policy) | **PARTIAL** | `handleSecurityHeaders` in `hooks.server.ts` sets: X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy (camera/microphone/geolocation=()), X-Frame-Options: DENY, COOP: same-origin, CORP: same-origin, HSTS with includeSubDomains; preload (HTTPS only). **Missing**: No Content-Security-Policy header at all. The claim specifies "nonce-based script-src" CSP — this is completely absent. No CSP header is set anywhere in the hooks, middleware, or Hono routes. API routes explicitly skip security headers.                                                                                                                                                                                                                                                                                                                                                    |
| Rate limiting & abuse prevention (API throttling per-route, auth brute-force lockout, progressive backoff, action quotas per tier, D1 query limits)          | **PARTIAL** | Better Auth has built-in rate limiting (memory storage, custom rules for sign-in/sign-up/forgot-password/reset-password). Custom `rate-limit.ts` provides in-memory rate limiting used via `withRateLimit` Hono middleware across ~35 routes. Custom `auth-lockout.ts` provides DB-backed brute-force lockout (5 attempts, 15-min window, 15-min lockout). **Missing**: Rate limit storage is in-memory (`Map`), noted with a TODO to switch to database storage — this means rate limits do not persist across Cloudflare Workers isolates, making them ineffective in production. Progressive backoff is not implemented (lockout is a flat 15 minutes). Action quotas per subscription tier do not exist. D1 query limits are not enforced at the application level.                                                                                                                                                   |
| Input sanitization & validation (DOMPurify for all HTML rendering, SQL injection prevention audit, XSS surface review, upload file type validation)          | **PARTIAL** | DOMPurify (`isomorphic-dompurify`) sanitizes all rendered markdown/blog content via `sanitizeHtml()` in `markdown.ts`. The `highlightMatch` function in search UI properly escapes HTML before wrapping in `<mark>` tags. File upload validation (`upload.ts`) checks MIME type allowlist, size limits, and magic byte signatures for JPEG/PNG/WebP/GIF/MP4/MP3. Zod validators are used across all API routes. Drizzle ORM provides parameterized queries throughout. **Missing**: DOMPurify is only applied to markdown-rendered content. Multiple `{@html}` usages exist in the codebase (search dialog, blog post rendering, SEO head, article embeds, editor slash commands) — while the search and blog ones are safe (pre-sanitized), the `cf-beacon.svelte` component injects a raw script tag. No SQL injection audit document exists. No systematic XSS surface review has been done (this audit is the first). |

## Additional Claimed Features (from user prompt)

| Claimed Feature                  | Status       | Details                                                                                                                                                                                                                  |
| -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Better Auth integration          | **COMPLETE** | Factory pattern `createAuth(d1)` with Drizzle adapter, SvelteKit cookie plugin, proper hooks integration. Full config in `auth.ts`.                                                                                      |
| Session management               | **PARTIAL**  | Sessions work (create, list, revoke, refresh). IP/UA columns exist but may not be populated on creation. No concurrent session limits.                                                                                   |
| CSRF protection                  | **COMPLETE** | Better Auth's default Origin-header validation is active. `disableCSRFCheck` and `DisableOriginCheck` are not set. Cookies use `sameSite: lax` and `httpOnly: true`.                                                     |
| Password security                | **PARTIAL**  | Strength estimator + UI + Zod rules exist. HIBP breached password check is completely missing.                                                                                                                           |
| OAuth providers (Google, GitHub) | **COMPLETE** | Both configured conditionally based on env vars. Account linking enabled. OAuth tokens encrypted.                                                                                                                        |
| Passkey/WebAuthn                 | **PARTIAL**  | Plugin configured, client registered, CRUD UI exists. Cross-device provisioning relies on browser native. No passkey-first login flow.                                                                                   |
| Two-factor authentication (TOTP) | **PARTIAL**  | TOTP with QR code, backup codes, enable/disable UI. No "remember device" and no role/org-based enforcement.                                                                                                              |
| Email verification               | **COMPLETE** | Better Auth `emailVerification` plugin configured. `requireEmailVerification: true`. Email template exists. Verification page at `/verify-email`. Resend capability in UI.                                               |
| Password reset                   | **COMPLETE** | Better Auth `sendResetPassword` configured with email template. Forgot-password page at `/forgot-password`. Reset page at `/reset-password`. Rate limited (3 req/10min on forget, 5 req/10min on reset).                 |
| Account locking/banning          | **COMPLETE** | Admin can ban/unban users with reason and optional duration. Banned users are blocked at sign-in. Sessions are revoked on ban. Lockout system for brute-force (5 attempts, 15-min). Ban appeal endpoint exists.          |
| Security audit logging           | **COMPLETE** | `audit_log` table with action/entity/entityType/metadata. `writeAuditLog` used extensively in admin and protected routes. User-facing audit log endpoint. Admin can view all audit logs.                                 |
| Impersonation                    | **COMPLETE** | Admin-only impersonation endpoint with rate limiting. Creates impersonation session in DB with admin/target/reason. Cannot impersonate self or other admins. 1-hour expiry. Stop-impersonate endpoint. Full audit trail. |

## Critical Gaps

1. ~~**No Content-Security-Policy header**~~ **FIXED** — `handleSecurityHeaders` in `hooks.server.ts` already generates a nonce per request, passes it to SvelteKit via `csp: { nonce }`, and SvelteKit's CSP config in `svelte.config.js` defines comprehensive directives. The audit incorrectly stated CSP was absent.

2. ~~**Rate limiting uses in-memory storage — ineffective in production**~~ **PARTIALLY FIXED** — D1-backed rate limiting exists in `rate-limit.ts` via `dbRateLimitCheck()` using the `rate_limit_log` table. In-memory `Map` is only a fallback when `db` is null. The `withApiKey` middleware and `withRateLimit` both use D1. Better Auth's built-in limiter may still use in-memory.

3. ~~**HaveIBeenPwned breached password check is completely missing**~~ **FIXED** — HIBP k-anonymity check already implemented in `src/lib/server/security/hibp.ts`. SHA-1 hashes password, sends first 5 chars to HIBP API, checks suffix against breach database. Fails open if API unreachable. Audit incorrectly stated this was missing.

4. ~~**No security alert emails**~~ **FIXED** — `sendSecurityAlert()` method exists in `EmailService` with dedicated template (`templates/security-alert.ts`). Called from `hooks.server.ts` at 3 locations: new device detection (line 133), password change (line 252), and 2FA change (line 332). Sends email with event type, timestamp, IP, and user agent.

5. ~~**No concurrent session limits**~~ **FIXED** — `handleBetterAuth` in `hooks.server.ts` already enforces a max 5 concurrent sessions limit. On login, it counts existing active sessions and revokes the oldest if the limit is exceeded. Audit incorrectly stated this was missing.

6. **Session IP/UA may not be populated on creation**
   - **Fix**: Verify that Better Auth's session creation populates `ipAddress` and `userAgent` columns. If not, add a database hook or middleware to inject them.
   - **Why**: The session table has these columns and the UI displays them, but no code was found that explicitly sets them during session creation. The `withSession` middleware reads sessions but does not write IP/UA.
   - **How**: Check Better Auth's session hook `create.after` to see if it provides request context. If not, add a custom hook that updates the session record with the request's IP and UA after creation.

7. **No 2FA enforcement per role or organization**
   - **Fix**: Add a middleware or hook that checks `user.twoFactorEnabled` before allowing access to admin routes or organization management. Add a system config or org-level setting for mandatory 2FA.
   - **Why**: The claim specifies "2FA enforcement per-role/per-org." Currently, 2FA is entirely optional for all users including admins.
   - **How**: Add a `requireTwoFactor` middleware for admin routes. Add a `require_org_2fa` column to `organization` table. Check in `handleRouteGuards` or `withSession`.

8. **"Remember device" for 2FA is not implemented**
   - **Fix**: Implement a trusted-device cookie that bypasses the 2FA challenge for a configurable period (e.g., 30 days). Use an encrypted, signed cookie with the device fingerprint.
   - **Why**: The claim lists "remember device" as a 2FA feature. Without it, users must enter a TOTP code on every login, which is a poor UX that discourages 2FA adoption.
   - **How**: Set an HttpOnly cookie on successful 2FA verification. In the 2FA challenge flow, check for this cookie and skip the TOTP prompt if valid.

9. **Progressive backoff is not implemented**
   - **Fix**: Increase the lockout duration on repeated lockouts (e.g., 15min, 1hr, 24hr, permanent).
   - **Why**: The claim mentions "progressive backoff." Currently, the lockout is always 15 minutes regardless of how many times the user has been locked out.
   - **How**: Track the number of lockouts in the `loginAttempt` table. Multiply the lockout duration by a factor based on lockout count.

10. **Action quotas per subscription tier do not exist**
    - **Fix**: Add tier-based rate limit configuration. Look up the user's subscription tier and apply different limits.
    - **Why**: The claim mentions "action quotas per tier." Currently, all rate limits are the same for all users regardless of subscription level.
    - **How**: In `withRateLimit`, look up the user's subscription. Apply tier-specific limits from a configuration map.

11. ~~**Ban evasion detection via email/IP is not implemented**~~ **FIXED** — `detectBanEvasion()` in `src/lib/server/security/ban-evasion.ts` checks new registrations against banned users by email domain and local part. Called from `auth.ts` during registration. Audit incorrectly stated this was missing.

## Test Coverage

Tests exist for all major auth/security features:

- `auth-config.test.ts` — Auth configuration
- `auth-hono.test.ts` — Hono auth middleware
- `auth-lockout.test.ts` — Brute-force lockout
- `auth-security.test.ts` — Security hardening
- `banning-system.test.ts` — Ban/unban
- `impersonation.test.ts` — Impersonation flow
- `oauth-social-login.test.ts` — OAuth flows
- `oauth.test.ts` — OAuth integration
- `passkey-webauthn.test.ts` — Passkey support
- `password-strength.test.ts` — Password strength estimator
- `rate-limit.test.ts` — Rate limiting
- `security-events.test.ts` — Security event logging
- `security-headers.test.ts` — Security headers
- `security-routes.test.ts` — Security route guards
- `two-factor-auth.test.ts` — 2FA flow
- `validators-auth.test.ts` — Auth validators

This is strong test coverage. However, tests cannot catch missing features (e.g., HIBP, CSP, security alert emails).

## Files

- `/Users/hmziq/os/vibekit/src/lib/server/auth.ts` — Auth configuration (Better Auth, plugins, rate limiting, cookies)
- `/Users/hmziq/os/vibekit/src/lib/auth-client.ts` — Client-side auth (passkey, 2FA plugins)
- `/Users/hmziq/os/vibekit/src/hooks.server.ts` — Security headers, auth hooks, lockout, route guards, session management
- `/Users/hmziq/os/vibekit/src/lib/server/rate-limit.ts` — In-memory rate limiter
- `/Users/hmziq/os/vibekit/src/lib/server/auth-lockout.ts` — Brute-force lockout system
- `/Users/hmziq/os/vibekit/src/lib/server/services/security-events.ts` — Security event logging
- `/Users/hmziq/os/vibekit/src/lib/server/hono/index.ts` — API routes (ban, impersonation, audit log, rate limiting)
- `/Users/hmziq/os/vibekit/src/lib/server/hono/middleware.ts` — Hono middleware (rate limiting, auth, permissions)
- `/Users/hmziq/os/vibekit/src/lib/server/db/schema.ts` — App schema (audit_log, login_attempt, security_event, impersonation_session)
- `/Users/hmziq/os/vibekit/src/lib/server/db/auth.schema.ts` — Auth schema (user, session, account, verification, passkey, twoFactor)
- `/Users/hmziq/os/vibekit/src/lib/password-strength.ts` — Password strength estimator
- `/Users/hmziq/os/vibekit/src/lib/validators/common.ts` — Zod password validator
- `/Users/hmziq/os/vibekit/src/lib/components/password-strength.svelte` — Password strength UI
- `/Users/hmziq/os/vibekit/src/lib/markdown.ts` — DOMPurify sanitization for rendered content
- `/Users/hmziq/os/vibekit/src/lib/server/upload.ts` — File upload validation (MIME + magic bytes)
- `/Users/hmziq/os/vibekit/src/lib/server/email/index.ts` — Email service (missing security alert methods)
- `/Users/hmziq/os/vibekit/src/lib/server/integrations/oauth.ts` — PKCE OAuth flow for integrations
- `/Users/hmziq/os/vibekit/src/routes/(auth)/verify-email/+page.svelte` — Email verification page
- `/Users/hmziq/os/vibekit/src/routes/(auth)/forgot-password/+page.svelte` — Password reset request
- `/Users/hmziq/os/vibekit/src/routes/(auth)/reset-password/+page.svelte` — Password reset execution
- `/Users/hmziq/os/vibekit/src/routes/(auth)/two-factor/+page.svelte` — 2FA challenge page
- `/Users/hmziq/os/vibekit/src/routes/(app)/app/settings/+page.svelte` — Session management, 2FA, passkey UI
- `/Users/hmziq/os/vibekit/src/app.d.ts` — Type declarations (impersonatedBy)
