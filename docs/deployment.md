# Deployment Guide

## Environment Variables

### Required

| Variable             | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `ORIGIN`             | Public origin URL (e.g., `https://vibekit.example.com`) |
| `BETTER_AUTH_SECRET` | Secret key for Better Auth session encryption           |

### Optional (Remote Database)

| Variable                 | Description                                         |
| ------------------------ | --------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`  | Cloudflare account ID                               |
| `CLOUDFLARE_DATABASE_ID` | D1 database ID                                      |
| `CLOUDFLARE_D1_TOKEN`    | Cloudflare API token with D1 read/write permissions |

Local development only requires the required variables in `.env`. Remote database variables are needed only for pushing migrations to production D1.

## Database Setup

```bash
# Generate migration SQL from schema changes
bun run db:generate

# Push latest schema to local D1
bun run db:push:local

# Run all local migrations sequentially
bun run db:migrate:local
```

For production:

```bash
# Push schema to remote D1 (requires Cloudflare credentials)
bun run db:push
```

## First Admin User

1. Register a new account via `/register`
2. Promote the user to admin by running against the remote database:

```sql
UPDATE user SET role = 'admin' WHERE email = 'your@email.com';
```

Run via wrangler:

```bash
wrangler d1 execute vibekit-db --remote --command "UPDATE user SET role = 'admin' WHERE email = 'your@email.com'"
```

## D1 Backup

### Export

```bash
wrangler d1 export vibekit-db --remote --output backup.sql
```

### Import

```bash
wrangler d1 execute vibekit-db --remote --file backup.sql
```

## Migration Runbook

When making schema changes:

1. **Generate** the migration from schema changes:
   ```bash
   bun run db:generate
   ```
2. **Review** the generated SQL in `migrations/` before applying.
3. **Apply locally** to verify:
   ```bash
   bun run db:push:local
   ```
4. **Apply to production** after verifying locally:
   ```bash
   bun run db:push
   ```

## 30-Day Soft-Delete Cleanup (Cron)

Soft-deleted records older than 30 days should be purged periodically. Schedule the following via Cloudflare Cron Triggers in `wrangler.jsonc`:

### Blog Posts

```sql
DELETE FROM blog_post
WHERE deleted_at IS NOT NULL
  AND deleted_at < unixepoch('now', '-30 days') * 1000;
```

### Items

```sql
DELETE FROM item
WHERE deleted_at IS NOT NULL
  AND deleted_at < unixepoch('now', '-30 days') * 1000;
```

### Users

```sql
DELETE FROM user
WHERE deleted_at IS NOT NULL
  AND deleted_at < unixepoch('now', '-30 days') * 1000;
```

### Cron Trigger Configuration

Add a `triggers` section to `wrangler.jsonc`:

```jsonc
{
  "triggers": {
    "crons": ["0 3 * * *"], // Run daily at 3:00 AM UTC
  },
}
```

An admin cleanup endpoint exists at `POST /api/admin/cleanup` that hard-deletes soft-deleted records older than 30 days. Call this endpoint from a Cloudflare Cron Trigger, an external scheduler (e.g., cron-job.org), or manually.

---

## Cache Strategy

### Blog Pages (Public)

Blog pages use SSR at the edge with CDN-friendly cache headers:

| Header              | Value                                                           | Purpose                                                                           |
| ------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `Cache-Control`     | `public, max-age=300, s-maxage=3600, stale-while-revalidate=60` | Browser caches 5 min, CDN caches 1 hour, serves stale for 60s during revalidation |
| `CDN-Cache-Control` | `public, max-age=3600`                                          | Cloudflare CDN-specific override (1 hour)                                         |

### Cache-Tag Purge

Blog mutation endpoints (publish, unpublish, update, archive, delete, restore) call `purgeBlogCache()` to invalidate cached responses. Tags used:

- `blog:index` — purges the blog listing page
- `blog:slug:{slug}` — purges a specific blog post page

### Image CDN (R2)

Uploaded blog images are stored in Cloudflare R2 (`R2_BLOG_MEDIA` bucket) and served via `/cdn/blog/{key}` with:

| Header          | Value                                 | Purpose                                     |
| --------------- | ------------------------------------- | ------------------------------------------- |
| `Cache-Control` | `public, max-age=31536000, immutable` | Long-lived cache for immutable image assets |

### Setup

1. Create the R2 bucket: `wrangler r2 bucket create vibekit-blog-media`
2. Configure cache rules in Cloudflare dashboard if needed
3. The cache purge logic uses the Cloudflare Cache API via `platform.caches`
