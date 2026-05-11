# Dashboard Enhancement — Implementation Plan

## Overview

Enhance the existing dashboard with activity feed, accurate metrics, quick actions, and workspace overview. Keep it lightweight — no external chart libraries, use simple CSS-based visualizations.

## Scope

- API: `GET /api/audit-log` for user's activity feed
- API: `GET /api/stats` for accurate dashboard metrics
- Add audit logging to item CRUD endpoints
- Dashboard UI: activity feed, accurate stats, quick action buttons
- Fix: "Total Created" stat currently shows same value as "Active Items"

## Steps

### 1. Add audit logging to item CRUD

File: `src/lib/server/hono/index.ts`

- Import `writeAuditLog`
- Add `writeAuditLog` calls to: create item, update item, delete item
- Use actions: `item.create`, `item.update`, `item.delete`

### 2. Create `/api/audit-log` endpoint

File: `src/lib/server/hono/index.ts`

- `GET /api/audit-log` (protected) — returns user's recent audit log entries
- Params: `?limit=20`
- Select: action, entityType, entityId, metadata, createdAt

### 3. Create `/api/stats` endpoint

File: `src/lib/server/hono/index.ts`

- `GET /api/stats` (protected) — returns accurate counts
- Use `Promise.all` for: active items count, total items count, items this week count
- Return: `{ activeItems, totalItems, itemsThisWeek }`

### 4. Update Dashboard UI

File: `src/routes/(app)/app/dashboard/+page.svelte`

- Replace single items query with stats query + activity feed query
- Fix stats: show active items, total items, items created this week
- Add activity feed section showing recent actions
- Add quick actions row (Create Item, Edit Profile, Settings)

## File List

- `src/lib/server/hono/index.ts` — API endpoints + audit logging
- `src/routes/(app)/app/dashboard/+page.svelte` — enhanced dashboard UI
- `tests/unit/dashboard.test.ts` — unit tests
- `tests/e2e/dashboard.spec.ts` — E2E tests
