# Comment System for Blog Posts

## Status: Complete

## Overview

Add a threaded comment system to blog posts with moderation queue and spam filtering. Comments support one level of nesting (replies), require authentication, and integrate with the existing moderation, notification, and audit systems.

## Schema

### `comment` table

```sql
CREATE TABLE comment (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES blog_post(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES comment(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  html_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','spam')),
  edited_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('subsecond') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch('subsecond') * 1000),
  spam_score INTEGER DEFAULT 0,
  spam_reason TEXT,
  moderated_at INTEGER,
  moderated_by TEXT REFERENCES user(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT
);
CREATE INDEX comment_post_status_idx ON comment(post_id, status, created_at);
CREATE INDEX comment_parent_idx ON comment(parent_id);
CREATE INDEX comment_author_idx ON comment(author_id);
CREATE INDEX comment_status_created_idx ON comment(status, created_at);
```

## Files to Create

1. `drizzle/0024_comment_system.sql` — Migration SQL
2. `src/lib/server/spam-detector.ts` — Multi-layer spam detection (content analysis, user reputation, rate checking)
3. `src/lib/validators/comment.ts` — Zod schemas for create/edit comment
4. `src/lib/components/comment-section.svelte` — Main comment container (TanStack Query)
5. `src/lib/components/comment-form.svelte` — Comment/reply input form
6. `src/lib/components/comment-item.svelte` — Single comment display with reply support
7. `src/routes/(admin)/admin/comments/+page.svelte` — Admin moderation queue
8. `src/routes/(admin)/admin/comments/+page.ts` — Page load
9. `tests/unit/comment-system.test.ts` — Unit tests
10. `tests/e2e/comment-system.spec.ts` — E2E tests

## Files to Modify

1. `src/lib/server/db/schema.ts` — Add `comment` table + relations
2. `src/lib/server/hono/index.ts` — Add comment API routes (public + protected + admin)
3. `src/routes/(blog)/blog/[slug]/+page.svelte` — Add `<CommentSection>` after article content
4. `src/lib/validators/report.ts` — Add `'comment'` to entityType enum

## Implementation Steps

### Step 1: Schema & Migration

- Add `comment` table to schema.ts
- Add Drizzle relations
- Create migration SQL
- Run `bun run db:push:local`

### Step 2: Spam Detector

- Create `src/lib/server/spam-detector.ts`
- Layers: rate check, content patterns (links, caps, repetition), blocked keywords, user reputation
- Score thresholds: 0-29 auto-approve, 30-49 pending, 50-79 spam-flag, 80+ auto-reject
- Trusted users (admin or verified + 24h account age) bypass spam check

### Step 3: Validators

- `createCommentSchema`: { content: string(1-5000), parentId?: string }
- `updateCommentSchema`: { content: string(1-5000) }
- `moderateCommentSchema`: { status: enum(approved|rejected|spam) }

### Step 4: API Endpoints

- `GET /api/comments/:postId` — Public, approved comments with replies (pagination)
- `POST /api/comments/:postId` — Protected, create comment (rate limited)
- `PATCH /api/comments/:id` — Protected, edit own comment
- `DELETE /api/comments/:id` — Protected, delete own comment
- `GET /api/admin/comments` — Admin, moderation queue with filters
- `PATCH /api/admin/comments/:id/moderate` — Admin, approve/reject/spam
- `DELETE /api/admin/comments/:id` — Admin, hard delete

### Step 5: Comment Components

- `CommentSection.svelte` — Fetches comments via TanStack Query, renders list + form
- `CommentForm.svelte` — Textarea with auth check, submit handler
- `CommentItem.svelte` — Comment display with author info, date, reply button, nested replies

### Step 6: Blog Post Integration

- Add `<CommentSection postId={data.post.id} />` to blog post page after content
- Feature-gated by `blog_comments_enabled` system config

### Step 7: Admin Moderation Page

- Admin comments page with filter tabs (Pending, Spam, Rejected, Approved, All)
- DataTable with author, post, content preview, spam score, actions
- Bulk approve/reject actions

### Step 8: Tests

- Unit tests: validators, spam detector, comment logic
- E2E tests: create comment, reply, moderation, auth guards

## Design Decisions

- Single level of nesting (replies to top-level comments only, no replies-to-replies)
- Admin comments always auto-approved; trusted users (verified + 24h age) auto-approved
- Comments fetched client-side via TanStack Query (not SSR) to avoid cache invalidation issues
- Spam detection is rules-based (no third-party service dependency)
- Content sanitized with existing DOMPurify integration
- Deleting a parent comment cascades to all replies
- Feature toggle: `blog_comments_enabled` system config (already exists, defaults to false)
- Comment content limited to 5000 chars, basic markdown allowed (bold, italic, code, links)
