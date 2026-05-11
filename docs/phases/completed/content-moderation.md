# Content Moderation Tools — Implementation Plan

## Scope

Build a content moderation system: content reporting, moderation queue, moderator actions, and appeal flow.

## Sub-Bullets

### 1. Database Schema — ContentReport Table

**File:** `src/lib/server/db/schema.ts`

- `contentReport`: id, reporterId (FK nullable), entityType (text), entityId, reason (text enum: spam/harassment/inappropriate/other), description (text), status (text enum: pending/reviewing/resolved/dismissed), resolvedBy (FK nullable), resolvedAt (timestamp nullable), resolutionNote (text nullable), createdAt
- Indexes on (status, createdAt), (entityType, entityId)
- Drizzle relations for reporter and resolver

### 2. API Endpoints — Content Reports

**File:** `src/lib/server/hono/index.ts`

Public/auth endpoint:

- `POST /api/reports` — submit content report (auth required, validated with Zod)

Admin endpoints:

- `GET /api/admin/reports` — list reports with status/entityType filters, paginated
- `PATCH /api/admin/reports/:id` — resolve/dismiss report with resolution note
- `GET /api/admin/reports/stats` — counts by status for dashboard badge

All mutations write audit log entries.

### 3. Zod Validators

**File:** `src/lib/validators/report.ts`

- `createReportSchema`: entityType (enum), entityId, reason (enum), description (optional, max 1000)
- `resolveReportSchema`: status (resolved/dismissed), resolutionNote (required)

### 4. Admin UI — Moderation Page

**File:** `src/routes/(admin)/admin/moderation/+page.svelte`

- Report queue with status filters (pending/reviewing/resolved/dismissed)
- Entity type filter (item/blogPost/organization/team/user)
- Report cards showing: reporter name, content type, reason, description, timestamp
- Resolve/dismiss buttons with resolution note textarea
- Pending count badge in admin sidebar

### 5. Report Button in User-Facing Pages

Add "Report" button to item detail pages and organization detail pages.

- Opens a modal/dropdown with reason selection and optional description
- Calls `POST /api/reports`

## Implementation Order

1. Schema + migration
2. Validators
3. API endpoints (public report + admin moderation)
4. Admin UI (moderation queue page)
5. User-facing report button (item + org pages)

## Quality Gates

- All code passes `bun run check`, `bun run lint`, `bun run format:check`
- Unit tests for validators
- E2E tests for report submission and admin resolution workflow
