# Phase 2 — Blog

**Status:** Complete
**PRD Reference:** §18 Phase 2, §7.3 Blog Requirements, §19.4 Blog Checklist

---

## What's Already Done

- [x] Route group `(blog)` scaffolded with placeholder pages
- [x] Blog index route at `/blog`
- [x] Blog detail route at `/blog/[slug]`
- [x] Drizzle ORM configured
- [x] Admin panel shell with role guards

---

## Remaining Work

### 2.1 Install Blog Dependencies

```bash
bun add micromark micromark-extension-gfm dompurify
```

**Files:** `package.json`

---

### 2.2 Blog Database Schema

Add blog-related tables to `src/lib/server/db/schema.ts`:

**Tables:**

- `blogPost` — posts with title, slug, excerpt, contentBody, coverImageUrl, seoTitle, seoDescription, status (draft/published/archived), authorId, publishedAt, deletedAt
- `blogTag` — tags with name, slug
- `blogPostTag` — join table (postId, tagId composite PK)
- `blogPostSlugHistory` — old slugs for 301 redirects

**Files:**

- `src/lib/server/db/schema.ts` — add 4 new tables
- `drizzle/0003_*.sql` — new migration

---

### 2.3 Markdown Rendering Pipeline

Create `src/lib/server/markdown.ts`:

- Render raw Markdown to HTML using `micromark` with GFM extensions
- Sanitize output with DOMPurify
- Return safe HTML string for use with `{@html}`

**Files:**

- `src/lib/server/markdown.ts`

---

### 2.4 Blog Public Routes

Update existing placeholder pages:

**`/blog` index:**

- List published posts (title, excerpt, cover image, date, author)
- Pagination (offset-based, 10 per page)
- SEO metadata + JSON-LD (Blog listing schema)

**`/blog/[slug]` detail:**

- Load post by slug from D1
- Render Markdown content with prose styling
- Slug history fallback (301 redirect on old slug match)
- SEO metadata + JSON-LD (Article schema)
- Cache headers for edge caching

**Files:**

- `src/routes/(blog)/blog/+page.svelte` + `+page.server.ts`
- `src/routes/(blog)/blog/+page.ts` (load data)
- `src/routes/(blog)/blog/[slug]/+page.svelte` + `+page.server.ts`
- `src/routes/(blog)/blog/[slug]/+page.ts`

---

### 2.5 Blog Admin API Endpoints

Create `+server.ts` endpoints for blog CRUD:

- `POST /api/blog` — create draft
- `GET /api/blog` — list all posts (including drafts/archived)
- `GET /api/blog/[id]` — get single post
- `PATCH /api/blog/[id]` — update post
- `POST /api/blog/[id]/publish` — publish post
- `POST /api/blog/[id]/unpublish` — unpublish (revert to draft)
- `POST /api/blog/[id]/archive` — archive post
- `DELETE /api/blog/[id]` — soft-delete post (set deletedAt)
- `POST /api/blog/[id]/restore` — restore soft-deleted post

All admin endpoints verify `role === 'admin'` server-side.

**Files:**

- `src/routes/api/blog/+server.ts`
- `src/routes/api/blog/[id]/+server.ts`
- `src/routes/api/blog/[id]/publish/+server.ts`
- `src/routes/api/blog/[id]/unpublish/+server.ts`
- `src/routes/api/blog/[id]/archive/+server.ts`
- `src/routes/api/blog/[id]/restore/+server.ts`

---

### 2.6 Blog Admin UI

Update admin blog pages:

**`/admin/blog` — list:**

- Table with title, status badge, author, dates
- Filter by status (draft/published/archived/trash)
- Actions: edit, publish/unpublish, archive, soft-delete, restore

**`/admin/blog/new` — create:**

- Form with title, slug (auto-generated), excerpt, content (textarea), cover image upload, SEO fields, tags
- Save as draft

**`/admin/blog/[id]/edit` — edit:**

- Same form, pre-filled
- Slug change tracking (write to slug history)
- Publish/update actions

**Files:**

- `src/routes/(admin)/admin/blog/+page.svelte`
- `src/routes/(admin)/admin/blog/new/+page.svelte`
- `src/routes/(admin)/admin/blog/[id]/edit/+page.svelte`

---

### 2.7 Slug History + 301 Redirects

In `/blog/[slug]/+page.server.ts`:

1. Try to find post by slug
2. On miss, look up `blogPostSlugHistory`
3. If found in history, redirect 301 to current canonical slug

**Files:**

- `src/routes/(blog)/blog/[slug]/+page.server.ts`

---

### 2.8 Blog Validators

Create `src/lib/validators/blog.ts`:

- `createPostSchema` — title, slug, excerpt, contentBody, coverImageUrl?, seoTitle?, seoDescription?, status, tagIds?
- `updatePostSchema` — same but all optional
- `publishPostSchema` — validates minimum required fields for publishing

**Files:**

- `src/lib/validators/blog.ts`

---

### 2.9 Blog Tests

Unit and integration tests:

- `src/lib/server/markdown.test.ts` — Markdown rendering
- `src/lib/validators/blog.test.ts` — Blog schema validation
- Slug normalization/generation tests

**Files:**

- `src/lib/server/markdown.test.ts`
- `src/lib/validators/blog.test.ts`

---

## Implementation Order

1. Install dependencies (2.1)
2. Add blog database schema + migration (2.2)
3. Create markdown pipeline (2.3)
4. Create blog validators (2.8)
5. Create blog admin API endpoints (2.5)
6. Update public blog routes (2.4)
7. Add slug history + 301 redirects (2.7)
8. Update admin blog UI (2.6)
9. Write tests (2.9)
10. Run full test suite + type check

---

## Acceptance Criteria

- [x] Draft posts are not publicly reachable by slug
- [x] Published posts appear on `/blog` and `/blog/[slug]`
- [x] Editing a published post reflects publicly after regeneration
- [x] Duplicate slugs are rejected
- [x] Slug history 301 redirects work
- [x] Archive hides from public, keeps editable by admin
- [x] Soft-delete moves to trash, restorable
- [x] Markdown renders with GFM + sanitization
- [x] Admin can create/edit/publish/archive/soft-delete/restore posts
- [x] All admin mutations verify role server-side
- [x] `bun run check` passes clean (no source errors)
- [x] `bun run test` passes (66/66)

## Deferred to Later Phases

- R2 + Cloudflare Images upload integration (Phase 4 or 5)
- Cache-tag purge on publish / update / archive / delete (Phase 5)
- 30-day hard-delete Cron for trashed posts (Phase 5)
- Public cache strategy documentation (Phase 5)
