# Series/Collection Support for Blog Posts

## Status: Complete

## Overview

Group blog posts into named series with ordering. A series is a named collection (e.g., "Building a SaaS from Scratch", "React Deep Dive") where posts appear in a defined order. Series display on individual post pages as a navigation sidebar/section.

## Schema

### `blog_series` table

```sql
CREATE TABLE blog_series (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  created_at INTEGER DEFAULT (unixepoch('subsecond') * 1000),
  updated_at INTEGER DEFAULT (unixepoch('subsecond') * 1000)
);
```

### `blog_post_series` junction table

```sql
CREATE TABLE blog_post_series (
  post_id TEXT NOT NULL REFERENCES blog_post(id) ON DELETE CASCADE,
  series_id TEXT NOT NULL REFERENCES blog_series(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, series_id)
);
CREATE INDEX idx_blog_post_series_series_id ON blog_post_series(series_id);
```

## Files to Create/Modify

### New files

1. `drizzle/0023_series_support.sql` — Migration SQL
2. `src/routes/(blog)/blog/series/[slug]/+page.server.ts` — Public series page
3. `src/routes/(blog)/blog/series/[slug]/+page.svelte` — Public series page UI
4. `src/routes/(admin)/admin/blog/series/+page.svelte` — Admin series list
5. `tests/unit/series-collection.test.ts` — Unit tests
6. `tests/e2e/series-collection.spec.ts` — E2E tests

### Modified files

1. `src/lib/server/db/schema.ts` — Add `blogSeries`, `blogPostSeries` tables + relations
2. `src/lib/server/hono/index.ts` — Add series CRUD API endpoints + update post create/update to handle series
3. `src/lib/validators/blog.ts` — Add series validators
4. `src/routes/(blog)/blog/[slug]/+page.server.ts` — Fetch series info for single post
5. `src/routes/(blog)/blog/[slug]/+page.svelte` — Display series navigation on post page
6. `src/routes/(admin)/admin/blog/[id]/edit/+page.svelte` — Add series selector
7. `src/routes/(admin)/admin/blog/+page.svelte` — Add series column or filter

## Implementation Steps

### Step 1: Schema & Migration

- Add `blogSeries` and `blogPostSeries` tables to `schema.ts`
- Add Drizzle relations for both
- Create migration SQL file
- Run `bun run db:push:local`

### Step 2: API Endpoints

- Add `blogApp.get('/series', ...)` — List all series with post counts
- Add `blogApp.post('/series', ...)` — Create series
- Add `blogApp.patch('/series/:id', ...)` — Update series
- Add `blogApp.delete('/series/:id', ...)` — Delete series
- Update `blogApp.post('/')` — Handle `seriesIds` in post create
- Update `blogApp.patch('/:id')` — Handle `seriesIds` in post update

### Step 3: Validators

- Add `createSeriesSchema` and `updateSeriesSchema`
- Add `seriesIds` to post create/update schemas

### Step 4: Admin UI

- Create series list page with CRUD operations
- Add series selector (multi-select) to post editor

### Step 5: Public UI

- Add series info to single post page load function
- Display series navigation section on post page
- Create public series page showing all posts in order

### Step 6: Tests

- Unit tests for validators, schema shapes, series logic
- E2E tests for admin CRUD, public series page, series on post page

## Design Decisions

- A post can belong to multiple series (many-to-many via junction table)
- `sort_order` on the junction table controls ordering within each series
- Series are admin-managed only (no public creation)
- Deleting a series removes the junction rows (CASCADE) but not the posts
- Series page is public at `/blog/series/[slug]`
