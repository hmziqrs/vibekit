# Phase 4 — Admin Panel

**Status:** Complete
**PRD Reference:** §18 Phase 4, §19.6 Admin Checklist

---

## What's Already Done

- [x] Admin shell layout with sidebar
- [x] Admin role guard in hooks.server.ts + layout.server.ts
- [x] Blog list page (basic table with status badges)
- [x] Blog create page (new post form)
- [x] Blog edit page (with publish/unpublish/archive actions)
- [x] Blog API endpoints (CRUD + publish/unpublish/archive/soft-delete/restore)
- [x] Admin dashboard stub

---

## Remaining Work

### 4.1 Audit Log Schema

Add `auditLog` table to schema:

- id (UUID v7 PK), action, entityType, entityId, userId (FK), metadata (JSON text), createdAt
- Migration: `drizzle/0005_*.sql`

**Files:**

- `src/lib/server/db/schema.ts`
- `src/lib/server/audit.ts` — helper to write audit entries

---

### 4.2 Admin User Management API

Create endpoints for user management:

- `GET /api/admin/users` — list all users (paginated)
- `PATCH /api/admin/users/[id]` — update user (role, status)
- `DELETE /api/admin/users/[id]` — soft-delete user (set deletedAt)

All require admin role check.

**Files:**

- `src/routes/api/admin/users/+server.ts`
- `src/routes/api/admin/users/[id]/+server.ts`

---

### 4.3 Enhanced Admin Layout

Update admin layout:

- Add TanStack QueryClientProvider
- Responsive sidebar with mobile menu
- Active link indicator
- User info in sidebar footer
- Add Audit Log nav link

**Files:**

- `src/routes/(admin)/+layout.svelte`

---

### 4.4 Admin Dashboard Page

Replace stub with functional dashboard:

- Quick stats: total users, total posts, total items
- Recent audit log entries
- Use TanStack Query

**Files:**

- `src/routes/(admin)/admin/dashboard/+page.svelte`

---

### 4.5 Admin Users Page

Replace stub with user management:

- User table (email, name, role, status, joined date)
- Status filter (active/suspended)
- Search by email or name
- Actions: change role, suspend, delete (with confirmation)
- TanStack Query for data fetching

**Files:**

- `src/routes/(admin)/admin/users/+page.svelte`

---

### 4.6 Enhanced Blog List

Improve blog list with:

- Status filter tabs (all/draft/published/archived/trash)
- Search by title
- Soft-delete and restore actions
- Delete confirmation dialogs

**Files:**

- `src/routes/(admin)/admin/blog/+page.svelte`
- `src/routes/(admin)/admin/blog/+page.server.ts` — add deleted posts support

---

### 4.7 Admin Audit Log Page

Create audit log viewer:

- Simple table with action, entity, user, timestamp, metadata
- Filter by action type
- Paginated

**Files:**

- `src/routes/(admin)/admin/audit/+page.svelte`
- `src/routes/(admin)/admin/audit/+page.server.ts`

---

### 4.8 Destructive Action Confirmations

Add confirmation dialogs to all destructive actions:

- User suspension/deletion
- Blog post deletion
- Use a shared confirmation component or inline confirm patterns

---

### 4.9 Admin Tests

- Audit log helper tests
- Admin API endpoint tests (if feasible)

---

## Implementation Order

1. Audit log schema + migration (4.1)
2. Audit helper (4.1)
3. Admin user management API (4.2)
4. Enhanced admin layout (4.3)
5. Admin dashboard page (4.4)
6. Admin users page (4.5)
7. Enhanced blog list (4.6)
8. Admin audit log page (4.7)
9. Write tests (4.9)
10. Run full test suite + type check

---

## Acceptance Criteria

- [ ] Admin dashboard shows stats (users, posts, items counts)
- [ ] User list page with search and filter
- [ ] Admin can change user role and status
- [ ] Admin can soft-delete users
- [ ] Blog list has status filter tabs
- [ ] Blog soft-delete and restore work from admin UI
- [ ] All destructive actions require confirmation
- [ ] Audit log records all admin mutations
- [ ] Audit log page shows entries with filtering
- [ ] All admin endpoints verify role === 'admin'
- [ ] `bun run check` passes clean (no source errors)
- [ ] `bun run test` passes
