# Third-Party Integrations Framework — Implementation Plan

## Requirements (from docs/loop.md line 175)

- OAuth connector pattern
- Integration catalog
- Per-user credentials
- Connection health monitoring

## Design Decisions

### Provider Registry Pattern

Define supported integrations as a typed registry. Each provider has:

- Unique slug (e.g., `slack`, `notion`, `linear`, `github`, `discord`)
- OAuth config (authorize URL, token URL, scopes)
- Display metadata (name, icon, description, category)
- Health check endpoint

### OAuth Flow

Use `arctic` library for OAuth 2.0 flows. Each integration follows the standard pattern:

1. User clicks "Connect" → redirect to provider's OAuth consent
2. Provider redirects back with code
3. Exchange code for access/refresh tokens
4. Store tokens encrypted in DB
5. Refresh tokens automatically when expired

### Connection Health

Periodic health check that:

- Verifies token validity (try a lightweight API call)
- Updates `lastSyncedAt` and `status` (active/expired/error)
- Surface connection issues in the UI

### Architecture

1. **Provider Registry** (`src/lib/server/integrations/providers.ts`) — typed list of supported providers
2. **Integration Service** (`src/lib/server/integrations/service.ts`) — CRUD, connect, disconnect, health check
3. **OAuth Handler** (`src/lib/server/integrations/oauth.ts`) — authorization URL generation, callback handling
4. **DB Schema** — `integration` table (per-user/per-org)
5. **Validators** (`src/lib/validators/integration.ts`) — Zod schemas
6. **API Routes** — connect, disconnect, list, health check
7. **UI Pages** — user integrations settings, admin integrations overview

### DB Table: `integration`

- id, userId (nullable), organizationId (nullable)
- provider (slug), externalAccountId
- accessToken (encrypted), refreshToken (encrypted), tokenExpiresAt
- scopes (JSON array), metadata (JSON)
- status (active/expired/error/disconnected)
- lastSyncedAt, lastError
- createdAt, updatedAt

### Supported Providers (v1)

1. **Slack** — team messaging, notifications
2. **GitHub** — repository events, issue tracking
3. **Notion** — workspace pages, databases
4. **Linear** — issue tracking, project management
5. **Discord** — server notifications

### Files to Create

1. `src/lib/server/integrations/providers.ts` — provider registry
2. `src/lib/server/integrations/service.ts` — integration CRUD + health
3. `src/lib/server/integrations/oauth.ts` — OAuth flow handlers
4. `src/lib/validators/integration.ts` — Zod schemas
5. `drizzle/0032_integrations.sql` — migration
6. `src/routes/(app)/app/settings/integrations/+page.svelte` — user integrations UI
7. `src/routes/(admin)/admin/integrations/+page.svelte` — admin overview
8. `tests/unit/integrations.test.ts` — unit tests
9. `tests/e2e/integrations.spec.ts` — E2E tests

### Files to Modify

1. `src/lib/server/db/schema.ts` — add integration table
2. `src/lib/server/hono/index.ts` — add integration API routes
3. `src/routes/(app)/+layout.svelte` — add nav item
4. `src/routes/(admin)/+layout.svelte` — add admin nav item
5. `src/lib/validators/webhook.ts` — add integration event types
6. `src/lib/validators/index.ts` — re-export integration validators
7. `docs/loop.md` — mark complete

### API Routes

Public callback:

- `GET /api/integrations/callback/:provider` — OAuth callback (no auth, validates state token)

Protected (user):

- `GET /api/integrations` — list user's integrations
- `GET /api/integrations/providers` — list available providers
- `POST /api/integrations/connect/:provider` — initiate OAuth flow
- `DELETE /api/integrations/:id` — disconnect integration
- `POST /api/integrations/:id/refresh` — force token refresh
- `GET /api/integrations/:id/status` — check connection health

Admin:

- `GET /api/admin/integrations` — all integrations with filters
- `POST /api/admin/integrations/:id/health` — force health check

### Quality Gates

- `bun run test` — all pass
- `bun run lint` — 0 new errors
- `bun run format:check` — pass
