# Feature Flags & Kill Switches — Implementation Plan

## DB Table: feature_flag

- id, key (unique), name, description
- enabled (boolean), killSwitch (boolean - instant disable)
- rolloutPercentage (0-100)
- cohortRules (JSON - targeting rules)
- dependencies (JSON - flag keys that must be enabled)
- environment (text - dev/staging/production or null for all)
- createdAt, updatedAt

## Architecture

1. Feature flag table + CRUD service
2. Flag evaluation function (check enabled, rollout%, cohorts, deps)
3. Admin UI for managing flags
4. API middleware for flag checks
5. Client-side flag hook for Svelte components

## Files to Create

1. src/lib/server/feature-flags.ts - service
2. src/lib/validators/feature-flag.ts - schemas
3. drizzle/0033_feature_flags.sql - migration
4. src/routes/(admin)/admin/feature-flags/+page.svelte - admin UI
5. src/lib/hooks/use-feature-flag.svelte.ts - client hook
6. tests/unit/feature-flags.test.ts
7. tests/e2e/feature-flags.spec.ts
