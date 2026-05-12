# API Key Management — Implementation Plan

## Scope (from `docs/loop.md` line 172)

> API key management (scoped tokens, key rotation, usage logging, key revocation, per-key rate limits)

## Requirements

1. **Scoped tokens** — each key has an array of permission scopes (e.g. `read:items`, `write:items`, `read:billing`, `admin`)
2. **Key rotation** — users can regenerate a key's secret while keeping the same ID/prefix/scopes
3. **Usage logging** — track last used timestamp and request count per key
4. **Key revocation** — instant disable without deletion (soft delete via `revokedAt`)
5. **Per-key rate limits** — optional per-key rate limit overrides that take precedence over global limits
6. **Prefix-based identification** — store a human-readable prefix (e.g. `vk_live_`) for display

## Database

### New table: `apiKey`

| Column       | Type         | Notes                                                |
| ------------ | ------------ | ---------------------------------------------------- |
| id           | text PK      | UUID v7                                              |
| userId       | text FK→user | Not null, cascade delete                             |
| name         | text         | Human-readable label, trimmed, max 100               |
| keyHash      | text         | SHA-256 of the full key, unique                      |
| keyPrefix    | text         | First 8 chars of key for display (e.g. `vk_live_`)   |
| scopes       | text         | JSON array of scope strings                          |
| rateLimit    | integer      | Nullable, per-key requests per minute override       |
| lastUsedAt   | integer      | Nullable timestamp_ms                                |
| requestCount | integer      | Default 0, incremented on each authenticated request |
| expiresAt    | integer      | Nullable timestamp_ms, null = never expires          |
| revokedAt    | integer      | Nullable timestamp_ms, null = active                 |
| createdAt    | integer      | timestamp_ms, not null                               |

### New table: `apiKeyUsageLog`

| Column     | Type           | Notes                  |
| ---------- | -------------- | ---------------------- |
| id         | text PK        | UUID v7                |
| apiKeyId   | text FK→apiKey | Cascade delete         |
| endpoint   | text           | The API path called    |
| method     | text           | HTTP method            |
| statusCode | integer        | Response status        |
| userAgent  | text           | Nullable               |
| ipAddress  | text           | Nullable               |
| createdAt  | integer        | timestamp_ms, not null |

## Files to Create

1. `drizzle/0030_api_keys.sql` — migration
2. `src/lib/server/api-keys.ts` — service (create, validate, rotate, revoke, list, delete, log usage)
3. `src/lib/validators/api-key.ts` — Zod v4 schemas
4. `src/routes/(app)/app/settings/api-keys/+page.svelte` — management UI
5. `tests/unit/api-keys.test.ts` — unit tests
6. `tests/e2e/api-keys.spec.ts` — E2E tests

## Files to Modify

1. `src/lib/server/db/schema.ts` — add apiKey + apiKeyUsageLog tables
2. `src/lib/server/hono/middleware.ts` — add `withApiKey` middleware
3. `src/lib/server/hono/types.ts` — add `apiKey` to Variables
4. `src/lib/server/hono/index.ts` — add API key CRUD routes + apply middleware
5. `src/lib/validators/index.ts` — re-export new validators
6. `src/routes/(app)/+layout.svelte` — add API Keys nav item
7. `docs/loop.md` — mark complete

## Key Design Decisions

### Authentication flow

1. Client sends `Authorization: Bearer vk_live_<random32>` header
2. `withApiKey` middleware:
   - SHA-256 hashes the bearer token
   - Looks up `apiKey` by `keyHash`
   - Checks not revoked, not expired
   - Verifies the required scope for the route
   - Sets `c.set('apiKey', keyRecord)` and `c.set('user', lookupUser)`
   - Updates `lastUsedAt` and increments `requestCount`
   - Logs to `apiKeyUsageLog` (async, non-blocking)

### Scope system

Scopes follow `<action>:<resource>` pattern:

- `read:items`, `write:items`, `delete:items`
- `read:billing`, `write:billing`
- `read:organizations`, `write:organizations`
- `read:teams`, `write:teams`
- `read:blog`, `write:blog`
- `admin` — full access to all resources

### Key format

`vk_<env>_<random>` where env is `live` or `test`. Total length ~40 chars. The prefix stored is the first 12 characters for easy visual identification.

### Per-key rate limits

When an API key has a `rateLimit` value set, the `withRateLimit` middleware uses `apiKey:{keyId}` as the rate limit key with the key's custom limit. Otherwise falls back to user/IP-based limiting.

## Quality Gates

- `bun run check` — type check passes
- `bun run lint` — 0 errors (oxlint)
- `bun run format:check` — passes (oxfmt)
- `bun run test` — all tests pass
- Browser: API keys settings page loads, CRUD works
