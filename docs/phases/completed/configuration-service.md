# Configuration Service — Implementation Plan

## What exists

- `systemConfig` table (id, key, value, type, description, updatedBy, timestamps)
- Admin CRUD routes (GET /config, PATCH /config/:key)
- Admin settings page with config editing UI
- Audit logging on config updates

## What's needed

1. **Environment-specific overrides**: config values can differ per environment (development/staging/production)
2. **Config versioning**: history table tracking all changes with old/new values

## DB Changes

### system_config: add environment column

- `environment TEXT` (nullable, null = all environments)

### New table: config_version

- id, configId (FK→systemConfig)
- key, oldValue, newValue
- environment
- changedBy (userId)
- createdAt

## Files to Create

1. `drizzle/0035_config_versioning.sql`
2. `src/lib/server/config-service.ts` — service layer
3. `src/lib/validators/config.ts` — update with env support (if not already adequate)
4. `tests/unit/config-service.test.ts`
5. `tests/e2e/config.spec.ts`

## Files to Modify

1. `src/lib/server/db/schema.ts` — add configVersion table, add environment to systemConfig
2. `src/lib/server/hono/index.ts` — add version history routes, update config update to record history
3. `src/routes/(admin)/admin/settings/+page.svelte` — add environment selector and version history
