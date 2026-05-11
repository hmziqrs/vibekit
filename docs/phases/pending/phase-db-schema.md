# Phase: Database Schema Review & Normalization

**Status:** In Progress
**Category:** Foundation & DX
**Started:** 2026-05-11

## Scope

Add missing indexes, constraints, Drizzle relations, and fix `updatedAt` auto-update gaps in the database schema. Ensure migration safety.

---

## Items

### 1. Add Missing Indexes for High-Frequency Queries

**Problem:** Several frequently queried columns have no indexes, causing full table scans.

**Plan:**

Add indexes to `src/lib/server/db/schema.ts`:

| Index                                    | Table                | Columns                            | Rationale                                                                                                  |
| ---------------------------------------- | -------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `blog_post_status_deleted_published_idx` | `blog_post`          | `(status, deletedAt, publishedAt)` | Public blog list: every page load filters status=published + deletedAt IS NULL, orders by publishedAt DESC |
| `blog_post_deleted_idx`                  | `blog_post`          | `(deletedAt)`                      | Admin blog list: filters deletedAt IS NULL or IS NOT NULL                                                  |
| `item_user_deleted_idx`                  | `item`               | `(userId, deletedAt)`              | Items API: every request filters by userId + deletedAt                                                     |
| `audit_log_action_created_idx`           | `audit_log`          | `(action, createdAt)`              | Admin audit log: filters by action, orders by createdAt                                                    |
| `blog_post_tag_tag_id_idx`               | `blog_post_tag`      | `(tagId)`                          | Finding posts by tag                                                                                       |
| `blog_post_tag_post_id_idx`              | `blog_post_tag`      | `(postId)`                         | Managing tags on a post                                                                                    |
| `user_deleted_created_idx`               | `user`               | `(deletedAt, createdAt)`           | Admin user list: filters deletedAt IS NULL, orders by createdAt                                            |
| `contact_submission_created_idx`         | `contact_submission` | `(createdAt)`                      | Admin contact list ordering                                                                                |

**Files changed:** `src/lib/server/db/schema.ts`, new migration in `drizzle/`

---

### 2. Add Drizzle Relations for App Tables

**Problem:** Auth tables have Drizzle relations defined but application tables do not. Relations enable `db.query` API and type-safe joins.

**Plan:**

Add to `src/lib/server/db/schema.ts`:

- `blogPostRelations` — many-to-many with tags via `blogPostTag`, many revisions, many slug history entries, one author (user)
- `blogTagRelations` — many-to-many with posts via `blogPostTag`
- `itemRelations` — one user (owner)
- `auditLogRelations` — one user
- `blogPostRevisionRelations` — one post, one author (user)
- `blogPostSlugHistoryRelations` — one post

**Files changed:** `src/lib/server/db/schema.ts`

---

### 3. Fix `updatedAt` Auto-Update Gap

**Problem:** `blog_post.updatedAt` and `item.updatedAt` lack `.$onUpdate(() => new Date())`. The `updatedAt` timestamp will only reflect insert time unless manually set in every update query. Auth tables correctly use `.$onUpdate()`.

**Plan:**

Add `.$onUpdate(() => new Date())` to:

- `blogPost.updatedAt`
- `item.updatedAt`

**Files changed:** `src/lib/server/db/schema.ts`

---

### 4. Generate Migration

**Problem:** Schema changes need a corresponding migration file.

**Plan:**

- Run `bun run db:generate` to create a new migration SQL file
- Review the generated SQL for correctness
- Run `bun run db:push:local` to apply locally

**Files changed:** new file in `drizzle/`

---

## Out of Scope (deferred to later phases)

- Foreign key cascade behavior audit → already properly set with `onDelete: 'cascade'`
- Full-text search (FTS5) → Phase: Search
- Schema for future features (notifications, billing, etc.) → respective feature phases
- Data migration for existing records → not needed, new columns/indexes only

## Success Criteria

- [ ] High-frequency query patterns have covering indexes
- [ ] All application tables have Drizzle relations defined
- [ ] `updatedAt` columns auto-update on Drizzle `.update()` calls
- [ ] Migration generated and applied locally
- [ ] All quality gates pass: `bun run check`, `bun run lint`, `bun run format:check`, `bun run test`
