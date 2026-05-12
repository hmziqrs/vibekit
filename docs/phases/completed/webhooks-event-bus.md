# Webhooks & Event Bus — Implementation Plan

## Requirements (from docs/loop.md line 173)

- Outbound webhook delivery
- Retry with exponential backoff
- Event subscription UI
- Payload signing
- Delivery logs

## Design Decisions

### Event Registry

Centralize all webhook event types as a typed union. Base them on existing audit log actions (`{entity}.{verb}` pattern) since they already cover the domain. New enum: `WebhookEventType` with ~40 event types matching the existing audit actions.

### Architecture

1. **Event Bus** (`src/lib/server/events.ts`) — lightweight pub/sub dispatcher
   - `emitEvent(db, { type, entityId, entityType, metadata, userId })` — central function
   - Calls `writeAuditLog` AND dispatches to matching webhook endpoints
   - Replaces direct `writeAuditLog` calls in route handlers with `emitEvent`

2. **Webhook Endpoint** — user-configurable HTTP endpoint that receives events
   - Each endpoint has: URL, secret (for HMAC signing), subscribed event types, active status
   - Belongs to a user

3. **Webhook Delivery** — individual delivery attempt record
   - Tracks: endpoint, event, HTTP status, response body, attempt count, next retry, status (pending/success/failed/retrying)
   - Max 5 retries with exponential backoff (1s, 5s, 25s, 125s, 625s)

4. **Payload Signing** — HMAC-SHA256 using endpoint secret
   - Header: `X-Webhook-Signature: sha256=<hex>`
   - Header: `X-Webhook-Timestamp: <unix>`
   - Header: `X-Webhook-ID: <delivery-id>`

### DB Tables

- `webhook_endpoint` — id, userId, url, secret, events (JSON array), description, isActive, createdAt, updatedAt
- `webhook_delivery` — id, endpointId, eventType, payload (JSON), statusCode, responseBody, attemptCount, nextRetryAt, status, createdAt, updatedAt

### Files to Create

1. `src/lib/server/events.ts` — event bus + emitEvent dispatcher
2. `src/lib/server/webhooks.ts` — webhook delivery service (dispatch, retry, signing)
3. `src/lib/validators/webhook.ts` — Zod schemas
4. `src/routes/(app)/app/settings/webhooks/+page.svelte` — user webhook management UI
5. `src/routes/(admin)/admin/webhooks/+page.svelte` — admin delivery log viewer
6. `drizzle/0031_webhooks.sql` — migration
7. `tests/unit/webhooks.test.ts` — unit tests
8. `tests/e2e/webhooks.spec.ts` — E2E tests

### Files to Modify

1. `src/lib/server/db/schema.ts` — add webhook tables
2. `src/lib/server/hono/index.ts` — add webhook API routes + replace writeAuditLog with emitEvent
3. `src/lib/server/hono/types.ts` — add webhook vars to Env
4. `src/lib/validators/index.ts` — re-export webhook validators
5. `src/routes/(app)/+layout.svelte` — add Webhooks nav item
6. `src/routes/(admin)/+layout.svelte` — add Webhooks admin nav item
7. `docs/loop.md` — mark complete

### API Routes

Protected (user):

- `GET /api/webhooks` — list user's endpoints
- `POST /api/webhooks` — create endpoint (url, events[], description)
- `PATCH /api/webhooks/:id` — update endpoint
- `DELETE /api/webhooks/:id` — delete endpoint
- `POST /api/webhooks/:id/test` — send test payload
- `GET /api/webhooks/:id/deliveries` — delivery history

Admin:

- `GET /api/admin/webhooks/deliveries` — all deliveries with filters
- `POST /api/admin/webhooks/:deliveryId/retry` — manual retry

### Quality Gates

- `bun run test` — all pass
- `bun run lint` — 0 new errors
- `bun run format:check` — pass
