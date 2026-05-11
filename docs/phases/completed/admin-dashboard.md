# Admin Dashboard — Implementation Plan

## Overview

Build out the admin dashboard with real system health metrics, user growth stats, and recent activity from the audit log. Replace the current placeholder with a functional dashboard.

## What Exists

- Dashboard page at `/admin/dashboard` with 3 static stat cards (Users, Blog Posts, Items)
- Admin layout with sidebar nav (Dashboard, Users, Blog, Audit Log)
- Admin API: user management endpoints, upload, cleanup
- Audit log table and `writeAuditLog` helper already in place
- Health endpoint at `/api/health` (basic DB check)

## What's Missing

- No dedicated admin stats API endpoint
- Recent Activity section is a placeholder
- No system health metrics in dashboard
- No time-series data or charts

## Implementation

### 1. Admin Stats API

Create `GET /api/admin/stats` endpoint in `src/lib/server/hono/index.ts`:

- User counts: total users, active users (no deletedAt), suspended users, new users this week
- Content counts: total blog posts, published posts, draft posts
- Item counts: total items, active items
- Audit log: recent 10 entries with user info
- System: DB size estimate, uptime

### 2. Update Dashboard Page

Update `src/routes/(admin)/admin/dashboard/+page.svelte`:

- Replace multi-query approach with single `/api/admin/stats` call
- Show stat cards: Users, Posts, Items, Suspended Users
- Show "New this week" sub-metrics on cards
- Show Recent Activity from audit log (last 10 entries)
- Show system health indicator (DB connected)
- Show suspended/new user badges

### 3. Audit Log Display

- Show recent audit log entries in a table
- Columns: Timestamp, User, Action, Entity, Details
- Link to full audit log page (`/admin/audit`)

## File List

- `src/lib/server/hono/index.ts` — UPDATE: add GET /api/admin/stats
- `src/routes/(admin)/admin/dashboard/+page.svelte` — UPDATE: real dashboard with stats and activity
- `tests/unit/admin-dashboard.test.ts` — NEW: stats computation tests
- `tests/e2e/admin-dashboard.spec.ts` — NEW: E2E tests for admin dashboard
