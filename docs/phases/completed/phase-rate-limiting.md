# Phase: Rate Limiting & Abuse Prevention

## Status: Complete (pre-existing)

## Current Implementation

The project already has comprehensive rate limiting and abuse prevention:

### Better Auth Built-in Rate Limiting

- Global: 20 requests per 60-second window
- `/sign-in/email`: 5 req / 60s
- `/sign-up/email`: 3 req / 60s
- `/forget-password`: 3 req / 600s
- `/reset-password`: 5 req / 600s
- In-memory storage (TODO: migrate to database for multi-isolate)

### Brute-force Lockout (`src/lib/server/auth-lockout.ts`)

- Database-backed lockout via `login_attempt` table
- 5 max attempts within 15-minute window
- 15-minute lockout duration
- Integrated into hooks.server.ts for POST /api/auth/sign-in/email
- Records failed attempts, resets on success

### Hono API Rate Limiting (`src/lib/server/rate-limit.ts`)

- In-memory sliding-window rate limiter
- Applied via `withRateLimit` middleware in Hono routes
- Blog mutations: 50 req / 60s
- Blog uploads: 20 req / 60s
- Link previews: 30 req / 60s
- Admin uploads: 10 req / 60s
- Admin user mutations: 20 req / 60s

### Tests

- `tests/unit/rate-limit.test.ts` — 6 tests for in-memory rate limiter
- `tests/unit/auth-lockout.test.ts` — 10+ tests for lockout logic
- `tests/unit/auth-security.test.ts` — 170 lines of security config tests

## Remaining Improvements (not blocking)

- Migrate Better Auth rate limit storage from memory to database
- Add cleanup cron for expired lockout attempts
- Add rate limiting on public read endpoints
- Add progressive backoff (increasing lockout duration)
