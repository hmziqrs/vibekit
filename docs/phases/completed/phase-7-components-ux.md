# Phase 7 — Component Library, Auth UX, Rate Limiting

**Status:** In Progress
**Depends on:** Phase 6 (complete)

## Overview

Build reusable UI components to reduce duplication across app/admin surfaces, fix the 401/403 error page rendering, and add rate limiting to admin mutation endpoints.

## Remaining PRD Items (this phase)

- [x] Reusable table / form primitives
- [x] 401 / 403 UI states
- [x] Rate limiting on admin mutation endpoints

## Implementation Plan

### Step 1: Reusable UI Components

Create shared components that eliminate the repeating patterns found across 5 list/form pages (1020 lines total of duplicated patterns).

**New files:**

- `src/lib/components/form-field.svelte` — label + input/textarea + error display
- `src/lib/components/status-badge.svelte` — colored pill for status display
- `src/lib/components/search-input.svelte` — search input with magnifying glass icon
- `src/lib/components/filter-tabs.svelte` — tabbed filter bar
- `src/lib/components/confirm-dialog.svelte` — modal confirmation dialog

**`form-field.svelte`:**

- Props: `label`, `for` (id), `type` (text/email/password/textarea), `value` (bindable), `error?`, `required?`, `maxlength?`, `placeholder?`, `rows?`
- Renders: label + input/textarea + conditional error message
- Uses semantic color tokens for error states

**`status-badge.svelte`:**

- Props: `status` (string), `colorMap` (optional Record<string, string>)
- Default color map: { active: 'emerald', archived: 'amber', draft: 'yellow', published: 'green', suspended: 'red', trash: 'red' }
- Renders as `rounded-full px-2 py-0.5 text-[11px] font-medium` pill

**`search-input.svelte`:**

- Props: `value` (bindable), `placeholder?`
- Renders: search icon + input with `pl-9` padding

**`filter-tabs.svelte`:**

- Props: `tabs` (Array<{label, value}>), `active` (bindable string)
- Renders tab buttons with active/inactive styling

**`confirm-dialog.svelte`:**

- Props: `open` (bindable boolean), `title`, `message`, `confirmLabel?`, `variant?` ('danger' | 'default'), `onConfirm` (callback)
- Modal overlay with backdrop, Cancel + Confirm buttons
- Uses `AlertDialog`-like semantics

### Step 2: Refactor Existing Pages to Use New Components

**Update these files to use the new components:**

- `src/routes/(app)/app/items/+page.svelte` — use StatusBadge, SearchInput, FilterTabs, ConfirmDialog
- `src/routes/(app)/app/items/new/+page.svelte` — use FormField
- `src/routes/(app)/app/items/[id]/edit/+page.svelte` — use FormField
- `src/routes/(admin)/admin/users/+page.svelte` — use StatusBadge, SearchInput, FilterTabs, ConfirmDialog
- `src/routes/(admin)/admin/blog/+page.svelte` — use StatusBadge, SearchInput, FilterTabs, ConfirmDialog

**Goal:** Each file should lose 30-60 lines of duplicated markup. No behavioral changes.

### Step 3: Fix 401/403 Error Page Rendering

**Problem:** `hooks.server.ts` returns `new Response(null, { status: 403 })` for non-admin users hitting `/admin/*`. This bypasses SvelteKit's error handling, so `+error.svelte` never renders — users see a blank page.

**Fix:** Change `handleRouteGuards` to use SvelteKit's `error()` function instead of raw `Response`:

```ts
import { error } from '@sveltejs/kit'
// ...
if (user.role !== 'admin') {
  throw error(403, { message: 'Admin access required' })
}
```

This ensures `+error.svelte` renders with the proper 403 UI (shield icon, "Forbidden" heading).

**File:** `src/hooks.server.ts` — update `handleRouteGuards`

### Step 4: Rate Limiting on Admin Mutations

Implement a simple in-memory rate limiter for admin mutation endpoints using a sliding window counter.

**New file:** `src/lib/server/rate-limit.ts`

- `rateLimit(key, limit, windowMs)` — returns `{ allowed: boolean, remaining: number }`
- Uses an in-memory `Map<string, { count: number, resetAt: number }>`
- Keys are `userId + action` to scope per-user
- Default: 20 requests per minute for admin mutations
- Cleanup stale entries periodically

**Update these endpoints to use rate limiting:**

- `src/routes/api/blog/+server.ts` (POST)
- `src/routes/api/blog/[id]/+server.ts` (PATCH, DELETE)
- `src/routes/api/blog/[id]/publish/+server.ts` (POST)
- `src/routes/api/blog/[id]/unpublish/+server.ts` (POST)
- `src/routes/api/blog/[id]/archive/+server.ts` (POST)
- `src/routes/api/blog/[id]/restore/+server.ts` (POST)
- `src/routes/api/admin/users/[id]/+server.ts` (PATCH, DELETE)
- `src/routes/api/admin/upload/+server.ts` (POST)

**Note:** In-memory rate limiting is per-isolate (per-Worker instance). For production, this should be backed by Cloudflare Rate Limiting rules configured in the dashboard. The in-memory approach is a defense-in-depth layer.

### Step 5: Tests

**Unit tests:**

- `src/lib/server/rate-limit.test.ts` — test limit enforcement, window sliding, cleanup

**No new E2E tests** — the components and rate limiter are tested via unit tests. Existing E2E tests should still pass.

## File Size Limits

All files under 600 lines. New components are 30-80 lines each. Refactored pages should decrease in size.

## Acceptance Criteria

- [ ] FormField, StatusBadge, SearchInput, FilterTabs, ConfirmDialog components exist
- [ ] All list/form pages use the new components
- [ ] 403 responses render the error page UI (not a blank page)
- [ ] Rate limiting blocks excessive admin mutation requests
- [ ] All unit tests pass (97 existing + new)
- [ ] All E2E tests pass
