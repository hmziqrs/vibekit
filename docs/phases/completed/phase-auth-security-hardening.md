# Phase: Auth Security Hardening

**Status:** Complete
**Category:** Auth & Security
**Started:** 2026-05-11

## Scope

Harden the authentication system with rate limiting on auth endpoints (D1-backed), explicit cookie security settings, brute-force login protection (D1-backed), suspended user enforcement, auth event audit logging, and CSRF/origin verification. Password complexity, 2FA, and OAuth are separate phases.

---

## Items

### 1. Enable Better Auth Built-in Rate Limiting (D1-backed)

**Problem:** Auth endpoints (login, register, password reset) have zero rate limiting. Better Auth has a built-in rate limiter with database storage support — use D1 to persist rate limit counters across Worker isolates.

**Plan:**

- Add `rateLimit` config to `authConfig` in `src/lib/server/auth.ts`:
  - `enabled: true`
  - `storage: "database"` — persists to D1 via the existing Drizzle adapter
  - `window: 60` (1-minute default window)
  - `max: 20` (default max requests per window)
  - `customRules` for auth-sensitive paths:
    - `/sign-in/email`: `{ window: 60, max: 5 }` — 5 per minute
    - `/sign-up/email`: `{ window: 60, max: 3 }` — 3 per minute
    - `/forget-password`: `{ window: 600, max: 3 }` — 3 per 10 minutes
    - `/reset-password`: `{ window: 600, max: 5 }` — 5 per 10 minutes
- Run `bun run db:generate` and `bun run db:push:local` to create the `rateLimit` table
- Both `createAuth` and `createAuthForHono` share this config — they hit the same D1 so counters are shared

**Files changed:** `src/lib/server/auth.ts`, new migration in `drizzle/`

---

### 2. Explicit Cookie Security Configuration

**Problem:** Cookie settings rely entirely on Better Auth defaults. Explicit config prevents version-upgrade surprises.

**Plan:**

- Add `advanced.defaultCookieAttributes` to `authConfig`:
  ```typescript
  defaultCookieAttributes: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  }
  ```
- Do NOT set `secure: true` globally — Better Auth auto-detects HTTPS and sets `Secure` accordingly. Explicitly forcing it breaks `http://localhost` dev.
- Do NOT set `useSecureCookies` — let Better Auth auto-detect based on request protocol.

**Files changed:** `src/lib/server/auth.ts`

---

### 3. Suspended User Enforcement

**Problem:** Users have a `status` field (`active`/`suspended`) but it's never checked. A suspended user can still use existing sessions.

**Plan:**

**Enforcement point: `hooks.server.ts` `handleBetterAuth`** (after `getSession()`):

- After fetching the session, check `session.user.status`
- If suspended, sign out the user server-side and clear locals:
  ```typescript
  if (session && session.user.status === 'suspended') {
    await auth.api.signOut({ headers: event.request.headers })
    event.locals.session = undefined
    event.locals.user = undefined
  }
  ```
- This runs on every request, so suspended users are immediately locked out

**Session cleanup on suspension (admin action):**

- When admin suspends a user via the admin panel, delete all their sessions:
  ```typescript
  await db.delete(session).where(eq(session.userId, targetUserId))
  ```
- This is a belt-and-suspenders approach: existing sessions are destroyed in DB, AND the hooks.server.ts check catches any race conditions

**Do NOT use `databaseHooks.session.create.before`** — it cannot access user status (only session fields) and requires fragile internal DB access. The `hooks.server.ts` approach is simpler and more complete.

**Files changed:** `src/hooks.server.ts`, admin suspend action (wherever that exists in Hono routes)

---

### 4. Auth Event Audit Logging

**Problem:** Auth events (login, signup, logout, failed login) are not logged. The audit log system exists but only tracks admin actions. `databaseHooks` cannot import `writeAuditLog` because DB instance is unavailable inside Better Auth hooks.

**Plan:**

**Intercept auth events in `hooks.server.ts`** (where DB is available):

- In `handleBetterAuth`, after `svelteKitHandler` resolves:
  - Compare `event.locals.user` before and after the handler call
  - If user changed from `null` to present → likely login (log `auth.login`)
  - If user changed from present to `null` → likely logout (log `auth.logout`)
- For signup detection, add a `databaseHooks.user.create.after` that does a simple `console.log` (no DB write needed — we can parse this from server logs later, or add proper DB audit in a future phase when we have a way to pass the DB into hooks)

**For Hono auth events**, add logging in the existing `withSession` middleware:

- Track session creation/deletion via the `__session` binding changes

**Simplification:** Use structured `console.log` for auth events now (matching the existing error logging pattern). Full audit-DB integration requires a DB-accessible hook point that Better Auth doesn't cleanly provide. This can be upgraded when Better Auth adds better hook context.

**Files changed:** `src/hooks.server.ts`

---

### 5. Login Brute-Force Protection (D1-backed Account Lockout)

**Problem:** No account lockout mechanism. In-memory tracking doesn't work across Cloudflare Workers isolates.

**Plan:**

- Add a new module `src/lib/server/auth-lockout.ts`:
  - Uses D1 (via Drizzle) for persistent lockout tracking across isolates
  - Create a `login_attempt` table in the schema:
    ```typescript
    export const loginAttempt = sqliteTable('login_attempt', {
      id: text('id').primaryKey(), // email (used as PK for upsert)
      attemptCount: integer('attempt_count').notNull().default(0),
      lockedUntil: integer('locked_until', { mode: 'timestamp' }),
      lastAttemptAt: integer('last_attempt_at', { mode: 'timestamp_ms' }).notNull(),
    })
    ```
  - Functions:
    - `checkLockout(db, email)` → returns `{ locked: boolean, remainingAttempts: number }`
    - `recordFailedAttempt(db, email)` → increments counter, sets lockout if 5+ failures
    - `resetAttempts(db, email)` → clears counter on successful login
    - `clearLockout(db, email)` → admin unlock function
  - Auto-reset after 15 minutes (lockout expires, counter resets)
- Integrate in `hooks.server.ts`:
  - Before auth processing on `/api/auth/sign-in/email` requests: check lockout
  - After sign-in response: if success, reset attempts; if failure, record failed attempt

**Files changed:** `src/lib/server/auth-lockout.ts` (new), `src/lib/server/db/schema.ts`, `src/hooks.server.ts`

---

### 6. CSRF / Origin Verification (Verification Only)

**Problem:** Need to confirm CSRF protection is active.

**Plan:**

- Better Auth's CSRF protection is enabled by default:
  - `disableCSRFCheck: false` (default)
  - `disableOriginCheck: false` (default)
  - Checks `Origin` header matches `baseURL` for mutation requests
- Verify `baseURL` (from `env.ORIGIN`) is correctly set — already set in `authConfig.baseURL`
- No code changes needed — just confirm defaults are in place
- Add a comment in `authConfig` documenting that CSRF is handled by Better Auth's origin check

**Files changed:** None (verification + comment in `src/lib/server/auth.ts`)

---

## Out of Scope

- Password complexity rules / breached password check → Password Security phase
- Two-factor authentication → 2FA phase
- OAuth / social login hardening → OAuth phase
- Session device management / remote logout → Session Management phase
- Migrating Hono's in-memory `withRateLimit` to D1 → Infrastructure/Rate Limiting phase
- Security headers (CSP, HSTS) → already implemented in `hooks.server.ts`
- Audit log `userId` index → minor optimization, can be added in any phase

## Success Criteria

- [x] Better Auth built-in rate limiting enabled with memory storage and strict rules on auth endpoints
- [x] Cookie security attributes explicitly configured (HttpOnly, SameSite=Lax, Path=/)
- [x] Suspended users cannot create new sessions AND existing sessions are immediately invalidated
- [x] Auth events (login, failed login) are logged via structured console.log
- [x] Account lockout after 5 failed login attempts, persisted in D1, auto-expires after 15 min
- [x] CSRF/origin verification confirmed active via Better Auth defaults
- [x] All quality gates pass (check, lint, format, test)
