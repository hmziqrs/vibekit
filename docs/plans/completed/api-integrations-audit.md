# Phase 1 Audit: API & Integrations

**Date**: 2026-05-15
**Auditor**: Automated code audit
**Scope**: API key management, webhooks & event bus, public API documentation, third-party integrations framework, Zapier/n8n connector

---

## 1. API Key Management

### Claimed Features

- Scoped tokens
- Key rotation
- Usage logging
- Key revocation
- Per-key rate limits

### Implementation Evidence

| Feature             | Status  | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scoped tokens       | DONE    | `src/lib/server/api-keys.ts` -- `createApiKey()` accepts `scopes: string[]`. `hasScope()` enforces hierarchical scope checking (`admin` > `write:X` > `read:X`). 12 scopes defined in `src/lib/validators/api-key.ts` (`API_KEY_SCOPES`).                                                                                                                                                                                                                   |
| Key rotation        | DONE    | `rotateApiKey()` in `api-keys.ts` generates a new key+hash, resets `requestCount` to 0, preserves metadata. API endpoint `POST /api-keys/:id/rotate` exists in Hono routes with rate limiting (5/min).                                                                                                                                                                                                                                                      |
| Usage logging       | DONE    | `logApiKeyUsage()` writes to `apiKeyUsageLog` table (endpoint, method, statusCode, IP, userAgent). `touchApiKey()` updates `lastUsedAt` and increments `requestCount`. Both are called via `executionCtx.waitUntil()` in the `withApiKey` middleware -- fire-and-forget after response.                                                                                                                                                                     |
| Key revocation      | DONE    | `revokeApiKey()` sets `revokedAt` timestamp. `validateApiKey()` filters by `isNull(apiKey.revokedAt)`. API endpoint `POST /api-keys/:id/revoke` exists.                                                                                                                                                                                                                                                                                                     |
| Per-key rate limits | DONE | `rateLimit` field on API keys is fully enforced in `withApiKey` middleware (middleware.ts:110-119). Uses `dbRateLimitCheck(db, 'apikey:{keyId}', keyRecord.rateLimit, 60_000)` with D1-backed store. Sets `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers. |

### Issues Found

~~**CRITICAL -- Per-key rate limits are not enforced.**~~ **FIXED** — Per-key rate limits are fully enforced. `withApiKey` middleware reads `keyRecord.rateLimit` and calls `dbRateLimitCheck` with D1-backed storage. The in-memory `Map` is only a fallback when `db` is null.

~~**MEDIUM -- Rate limit store is in-memory only.**~~ **FIXED** — `dbRateLimitCheck` in `rate-limit.ts` uses the `rate_limit_log` D1 table for production. In-memory `Map` is only used as a fallback when `db` is null (tests).

**MEDIUM -- API key hash lookup has no index hint for non-unique collisions.**

- Location: `src/lib/server/db/schema.ts` line 1105
- `api_key_hash_idx` is a non-unique index on `keyHash`. Since SHA-256 collisions are astronomically unlikely, this is acceptable. However, the `keyHash` column also has `.unique()` on line 1092, making the index redundant but not harmful.

**LOW -- No API key expiration cleanup job.**

- Expired keys (`expiresAt < now`) are filtered out during `validateApiKey()`, but there is no cron job or cleanup task to purge old expired keys from the database.

**LOW -- API key usage logs have no retention policy.**

- `apiKeyUsageLog` entries accumulate indefinitely. No TTL or cleanup mechanism exists.

### UI Components

| Component               | Status  | Location                                                                                                                                                                                             |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API key management page | DONE    | `src/routes/(app)/app/settings/api-keys/+page.svelte` -- Full CRUD: create with scope selection, rotate, revoke, delete. Shows key prefix, scopes, request count, last used, rate limit, expiration. |
| Usage log viewer        | PARTIAL | `GET /api/api-keys/:id/usage` endpoint exists but no dedicated UI page for viewing per-key usage logs.                                                                                               |
| Admin oversight         | MISSING | No admin page for viewing/managing all users' API keys. The admin panel has no API key section.                                                                                                      |

---

## 2. Webhooks & Event Bus

### Claimed Features

- Outbound webhook delivery
- Retry with exponential backoff
- Event subscription UI
- Payload signing
- Delivery logs

### Implementation Evidence

| Feature                        | Status | Evidence                                                                                                                                                                                                                                                            |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Outbound webhook delivery      | DONE   | `deliverWebhook()` in `src/lib/server/webhooks.ts` sends POST requests with JSON payload, `Content-Type`, `X-Webhook-ID`, `X-Webhook-Signature`, `X-Webhook-Timestamp` headers. 10s timeout via `AbortSignal`.                                                      |
| Retry with exponential backoff | DONE   | `getBackoffDelay()` implements `min(1000 * 5^attempt, 60000)` -- exponential backoff capped at 60s. `MAX_RETRIES = 5`. Failed deliveries get `nextRetryAt` set. `retryWebhookDelivery()` can manually retry.                                                        |
| Event subscription UI          | DONE   | `src/routes/(app)/app/settings/webhooks/+page.svelte` -- Create endpoints with URL, description, event selection (grouped by category). Supports wildcards (`*`). Test, view deliveries, delete.                                                                    |
| Payload signing                | DONE   | `hmacSign()` computes HMAC-SHA256 of `{timestamp}.{payload}` using the endpoint secret. Signature sent as `X-Webhook-Signature: sha256=<hex>`.                                                                                                                      |
| Delivery logs                  | DONE   | `webhookDelivery` table stores attemptCount, statusCode, responseBody (truncated to 10KB), status, nextRetryAt. `listWebhookDeliveries()` and `listAllDeliveries()` for per-endpoint and admin views. Admin UI at `src/routes/(admin)/admin/webhooks/+page.svelte`. |

### Issues Found

~~**CRITICAL -- No automatic retry processor for scheduled webhook retries.**~~ **FIXED** — `POST /api/admin/retry-webhooks` endpoint exists with cron secret authentication. The scheduled handler in `worker.ts` dispatches to this endpoint every 5 minutes via the cron trigger.

**MEDIUM -- `dispatchWebhooksForEvent` fetches ALL active endpoints.**

- Location: `src/lib/server/webhooks.ts` line 233
- `dispatchWebhooksForEvent()` queries `webhookEndpoint WHERE active = true` with no user scoping. This means every event dispatch queries all active webhook endpoints across all users, then filters in JavaScript.
- Impact: Performance degrades linearly with total active webhooks. On a multi-tenant platform, this is a scalability concern.
- Fix: Add `userId` filtering if the event has a user context, or maintain an index on `(eventType, active)`.

**MEDIUM -- Webhook dispatch is synchronous within `emitEvent`.**

- Location: `src/lib/server/events.ts` line 26
- Although wrapped in try/catch to not block the main operation, `dispatchWebhooksForEvent` is still awaited. On Cloudflare Workers with a CPU time limit, slow webhook deliveries could eat into the request budget.
- Fix: Use `executionCtx.waitUntil()` to move webhook dispatch off the critical path, or offload to a Queue.

**LOW -- No webhook endpoint URL validation beyond `url()`.**

- `createWebhookEndpointSchema` in `src/lib/validators/webhook.ts` uses `z.string().url()` but does not restrict to HTTPS or block internal/private IP ranges (e.g., `http://localhost`, `http://169.254.169.254` for SSRF).

**LOW -- Webhook secret is returned on creation but never shown again.**

- This is correct behavior (secrets should only be shown once), but the list endpoint (`GET /api/webhooks`) does not return the secret at all. Users who lose their secret must delete and recreate the endpoint. No "regenerate secret" endpoint exists.

### Event Bus Integration

- `emitEvent()` in `src/lib/server/events.ts` writes to the audit log and dispatches webhooks. This is the central event emitter.
- 61 event types defined in `src/lib/validators/webhook.ts` (`WEBHOOK_EVENT_TYPES`), covering blog, items, comments, organizations, teams, users, API keys, announcements, integrations, and newsletter events.
- `emitEvent()` is called throughout the Hono routes after mutations (e.g., after creating an API key, publishing a blog post, etc.).

---

## 3. Public API Documentation

### Claimed Features

- OpenAPI spec generation
- Interactive API explorer
- Code examples
- Authentication guide

### Implementation Evidence

| Feature                  | Status  | Evidence                                                                                                                                                                                                                                                                     |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAPI spec             | DONE    | `static/openapi.yaml` -- 1401-line OpenAPI 3.1.0 spec covering 28+ endpoints across 14 tags (Auth, Items, Blog, Users, Comments, Notifications, Organizations, Teams, Webhooks, API Keys, Billing, Reports, Analytics, Newsletter). Includes schemas for all major entities. |
| Interactive API explorer | DONE    | `src/routes/(public)/docs/+page.svelte` -- Embeds SwaggerUI via `swagger-ui-dist` with the OpenAPI spec at `/openapi.yaml`.                                                                                                                                                  |
| Code examples            | MISSING | No code examples (cURL, JavaScript, Python, etc.) found in the OpenAPI spec or docs page. The spec has no `x-codeSamples` extensions. The docs page itself does not include inline code examples.                                                                            |
| Authentication guide     | PARTIAL | The OpenAPI spec defines two security schemes (`cookieAuth`, `bearerAuth`) with descriptions. The docs page at `/docs` exists but there is no dedicated authentication guide page explaining how to obtain and use API keys vs session cookies.                              |

### Issues Found

**MEDIUM -- OpenAPI spec is static and can drift from implementation.**

- Location: `static/openapi.yaml`
- The spec is a hand-maintained YAML file. There is no automated generation from the Hono route definitions. As routes are added/modified, the spec can become stale.
- Impact: Documentation may not match actual API behavior.

**MEDIUM -- Several endpoints are missing from the OpenAPI spec.**

- Comparing Hono routes to the spec: `POST /api/api-keys` (create), `DELETE /api/api-keys/{id}`, `GET /api/push/subscriptions`, `POST /api/push/subscribe`, `POST /api/push/unsubscribe`, `POST /api/push/test`, `GET /api/integrations/providers`, `POST /api/integrations/connect/:provider`, `DELETE /api/integrations/:id`, `GET /api/automation/manifest`, and several admin endpoints are absent from the spec.

**LOW -- No API versioning.**

- The spec declares `version: 1.0.0` but there is no versioning in the URL paths (e.g., `/api/v1/...`). All routes are at `/api/...` with no mechanism for backward-compatible evolution.

---

## 4. Third-Party Integrations Framework

### Claimed Features

- OAuth connector pattern
- Integration catalog
- Per-user credentials
- Connection health monitoring

### Implementation Evidence

| Feature                      | Status | Evidence                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OAuth connector pattern      | DONE   | `src/lib/server/integrations/oauth.ts` -- Full PKCE OAuth flow: `generateOAuthState()` stores state+verifier in DB, `consumeOAuthState()` validates and cleans up, `getAuthorizationUrl()` builds the authorization URL, `exchangeCodeForTokens()` handles the code exchange. Uses `arctic` library for `generateCodeVerifier`/`generateState`. |
| Integration catalog          | DONE   | `src/lib/server/integrations/providers.ts` -- 5 providers defined (Slack, Discord, GitHub, Linear, Notion) with authorizeUrl, tokenUrl, scopes, category, description, and env key references. `getAvailableProviders()` checks which are configured.                                                                                           |
| Per-user credentials         | DONE   | `integration` table stores `accessToken`, `refreshToken`, `tokenExpiresAt`, `scopes`, `userId`, `organizationId`. `createIntegration()` and `disconnectIntegration()` manage lifecycle. `disconnectIntegration()` clears tokens and sets status to `disconnected` rather than deleting.                                                         |
| Connection health monitoring | DONE   | `checkIntegrationHealth()` in `src/lib/server/integrations/service.ts` -- Checks token expiry and pings the provider's auth test endpoint (GitHub, Slack, Discord, Notion, Linear each have specific health check implementations with 5s timeout). Updates status to `active`, `expired`, or `error`.                                          |

### Issues Found

**MEDIUM -- Access tokens stored in plaintext in the database.**

- Location: `src/lib/server/db/schema.ts` line 1214, `src/lib/server/integrations/service.ts`
- The `accessToken` and `refreshToken` fields are stored as plain text. On D1 (SQLite), there is no at-rest encryption option. If the database is compromised, all third-party tokens are exposed.
- Fix: Encrypt tokens at the application layer before storing, decrypt on read. Use a server-side encryption key stored in Workers secrets.

**MEDIUM -- No token refresh flow.**

- `updateIntegrationTokens()` exists to store refreshed tokens, but there is no automatic refresh mechanism. When a token expires (`checkIntegrationHealth()` returns `expired`), no refresh is attempted.
- Fix: Implement token refresh logic in the health check or as a separate cron job. Most OAuth providers support refresh token grants.

**LOW -- OAuth state cleanup relies on manual invocation.**

- `cleanupExpiredOAuthStates()` exists but is never called automatically. Expired state records accumulate in the `oauth_state` table.
- Fix: Add to a cron job.

**LOW -- `disconnectIntegration` does not revoke tokens on the provider side.**

- When a user disconnects an integration, the local tokens are cleared but no revocation request is sent to the provider (e.g., GitHub's revoke token endpoint).

### UI Components

| Component                   | Status | Location                                                                                                                                       |
| --------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| User integrations page      | DONE   | `src/routes/(app)/app/settings/integrations/+page.svelte` -- Provider catalog with connect/disconnect, status display, scopes, last sync time. |
| Admin integrations page     | DONE   | `src/routes/(admin)/admin/integrations/+page.svelte` -- Platform-wide view of all integrations with health check triggers.                     |
| Integration settings in nav | DONE   | `src/routes/(app)/+layout.svelte` line 49 -- "Integrations" link in app sidebar.                                                               |

---

## 5. Zapier/n8n Connector

### Claimed Features

- Expose actions and triggers for no-code automation platforms
- Machine-readable manifest

### Implementation Evidence

| Feature                      | Status  | Evidence                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Automation manifest endpoint | DONE    | `GET /api/automation/manifest` in Hono routes -- Returns JSON with `triggers` (all webhook event types), `actions` (6 API actions: List Items, Create Item, Publish Blog Post, Search Blog, Broadcast Notification, List Org Members), `auth` details (bearer token with scopes), and `webhookSetup` instructions. |
| Documentation page           | DONE    | `src/routes/(public)/docs/automation/+page.svelte` -- Tabbed docs for Zapier, n8n, and Make. Includes step-by-step setup instructions for triggers (webhook endpoints) and actions (HTTP requests with API keys). Shows example payloads.                                                                          |
| Zapier-specific connector    | MISSING | No Zapier app/manifest exists. Users must use Zapier's generic "Webhooks by Zapier" and "Custom Request" apps. There is no dedicated Zapier platform app with pre-built triggers/actions.                                                                                                                          |
| n8n-specific connector       | MISSING | No n8n community node exists. The docs reference an "automation manifest" at `/api/automation/manifest` but n8n does not natively consume this format. Users must use generic webhook/HTTP nodes.                                                                                                                  |

### Issues Found

**MEDIUM -- Automation manifest scope names do not match actual API key scopes.**

- Location: `src/lib/server/hono/index.ts` lines 2377-2390
- The manifest advertises scopes like `blog.read`, `blog.write`, `items.read`, `items.write`, `orgs.read`, `orgs.write`, `teams.read`, `teams.write`, `users.read`, `webhooks.read`, `webhooks.write`, `analytics.read`.
- The actual API key scopes defined in `src/lib/validators/api-key.ts` are: `read:blog`, `write:blog`, `read:items`, `write:items`, `read:organizations`, `write:organizations`, `read:teams`, `write:teams`, `read:billing`, `write:billing`, `delete:items`, `admin`.
- These are completely different naming conventions. An automation developer using the manifest's scope names would create keys that don't match any valid scope.
- Fix: Align manifest scope names with the actual `API_KEY_SCOPES` constant.

**LOW -- Manifest is static/hardcoded, not generated from route definitions.**

- The 6 actions listed in the manifest are a curated subset. Many more API endpoints exist but are not listed. The manifest could easily drift from reality.

---

## Summary Scorecard

| Feature Area             | Score | Verdict                                                                                          |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------ |
| API Key Management       | 7/10  | Solid foundation. Per-key rate limits stored but not enforced. Missing admin oversight UI.       |
| Webhooks & Event Bus     | 6/10  | Good delivery/signing/retry logic, but automatic retries are dead code without a cron processor. |
| Public API Documentation | 5/10  | Spec exists with SwaggerUI but is static, incomplete, and lacks code examples or auth guide.     |
| Third-Party Integrations | 7/10  | Clean OAuth pattern with 5 providers. Missing token encryption and auto-refresh.                 |
| Zapier/n8n Connector     | 4/10  | Manifest and docs exist but are cosmetic. No real platform connectors. Scope names are wrong.    |

### Priority Fixes (Ordered)

1. **Implement automatic webhook retry processor** -- Add cron endpoint to scan and retry `webhookDelivery` records where `status = 'retrying'` and `nextRetryAt <= now`.
2. **Enforce per-key rate limits in `withApiKey` middleware** -- Read `keyRecord.rateLimit` and apply it.
3. **Fix automation manifest scope names** -- Align with actual `API_KEY_SCOPES`.
4. **Encrypt integration tokens at rest** -- Application-layer encryption before storing in D1.
5. **Add missing endpoints to OpenAPI spec** -- Or better, auto-generate from Hono route definitions.
6. **Implement token refresh flow for integrations** -- Auto-refresh expired tokens during health checks.
