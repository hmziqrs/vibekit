# Deployment Guide

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `ORIGIN` | Public origin URL (e.g., `https://vibekit.example.com`) |
| `BETTER_AUTH_SECRET` | Secret key for Better Auth session encryption |

### Optional (Remote Database)

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_DATABASE_ID` | D1 database ID |
| `CLOUDFLARE_D1_TOKEN` | Cloudflare API token with D1 read/write permissions |

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
    "crons": ["0 3 * * *"] // Run daily at 3:00 AM UTC
  }
}
```

Then handle the cron in `src/routes/api/cron/+server.ts` or via a scheduled handler in the worker entry point.
