# A/B Testing Framework — Implementation Plan

## DB Table: ab_experiment

- id, key (unique), name, description
- status (draft/running/paused/completed/archived)
- targetMetric (what we're measuring)
- startDate, endDate
- winningVariantId (nullable, set when concluded)
- createdAt, updatedAt

## DB Table: ab_variant

- id, experimentId (FK)
- name, description
- trafficPercentage (share of experiment traffic)
- payload (JSON — config/feature values for this variant)
- isControl (boolean)
- createdAt

## DB Table: ab_assignment

- id, experimentId (FK), variantId (FK)
- userId (nullable), sessionId (nullable)
- assignedAt

## DB Table: ab_event

- id, experimentId (FK), variantId (FK)
- userId (nullable), sessionId (nullable)
- eventType (exposure/conversion/custom)
- eventName, eventValue (nullable number)
- metadata (JSON)
- createdAt

## Architecture

1. DB tables + migration
2. Experiment service (CRUD, assignment, event recording)
3. Statistical significance calculator
4. API routes (protected + admin)
5. Admin UI for managing experiments
6. Client-side hook for variant assignment

## Files to Create

1. drizzle/0034_ab_testing.sql
2. src/lib/server/ab-testing.ts
3. src/lib/validators/ab-testing.ts
4. src/routes/(admin)/admin/experiments/+page.svelte
5. src/lib/hooks/use-experiment.svelte.ts
6. tests/unit/ab-testing.test.ts
7. tests/e2e/ab-testing.spec.ts

## Files to Modify

1. src/lib/server/db/schema.ts — add tables
2. src/lib/server/hono/index.ts — add routes
3. src/lib/validators/index.ts — re-export
4. src/routes/(admin)/+layout.svelte — add nav item
