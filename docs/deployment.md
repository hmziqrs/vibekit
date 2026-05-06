# Deployment Guide

Vibekit supports two runtimes: self-hosted on a VPS with Node.js v24 LTS + SQLite (default), and Cloudflare Workers with D1 + R2 (secondary). Both paths share the same application code through a service-abstraction layer.

---

## Architecture

App routes never import Cloudflare-specific bindings directly. Instead, all runtime dependencies are accessed through `event.locals.services`:

```ts
// Routes consume services through a typed boundary
const { db, storage, email, cache, env } = locals.services
// No platform.env, D1Database, R2Bucket, or SEND_EMAIL references at the route level
```

**Service interfaces** (`src/lib/server/services/types.ts`):

| Service      | Self-host default                     | Cloudflare adapter                       |
| ------------ | ------------------------------------- | ---------------------------------------- |
| `db`         | SQLite via `better-sqlite3` + Drizzle   | D1 binding + Drizzle                     |
| `storage`    | Filesystem (`data/uploads`)           | R2 binding (`R2_BLOG_MEDIA`)             |
| `email`      | Cloudflare Email Service REST         | Cloudflare Email Service REST            |
| `cache`      | No-op (Caddy/Nginx headers)           | Cloudflare Cache API purge               |
| `env`        | Process env (`process.env`)           | `event.platform.env`                     |

**Adapter selection** is controlled by the `ADAPTER` environment variable (`node` or `cloudflare`). Service implementations live in `src/lib/server/adapter/{node,cloudflare}/`. The `hooks.server.ts` boundary injects services at request time:

```ts
event.locals.services = createServices(event)
event.locals.auth = createAuth(event.locals.services.db)
```

**Config strategy** — `ADAPTER=node` is the default for both development and production. Cloudflare (`ADAPTER=cloudflare`) is preserved as a secondary deploy target. Node-specific files never import `cloudflare:workers`. Cloudflare-specific files are never imported during Node builds.

---

## Self-Host Deployment (Default)

Run Vibekit on a VPS with Node.js v24 LTS, SQLite (via better-sqlite3), and filesystem storage behind a reverse proxy.

### Prerequisites

- VPS with Ubuntu 22.04+ (or similar Linux)
- Node.js v24.15.0 LTS installed
- Domain pointing to the VPS IP

Install Node.js v24 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# better-sqlite3 needs native build tools
sudo apt install -y build-essential python3
```

### 1. System Setup

```bash
# Create app user
sudo useradd -r -s /bin/bash -d /opt/vibekit vibekit
sudo mkdir -p /opt/vibekit
sudo chown vibekit:vibekit /opt/vibekit

# Create data directories
sudo mkdir -p /opt/vibekit/data/uploads
sudo chown -R vibekit:vibekit /opt/vibekit/data
```

### 2. Deploy Application

```bash
cd /opt/vibekit
git clone <repo-url> .

npm ci --omit=dev

# Build the Node adapter
ADAPTER=node npm run build:node
```

### 3. Environment Configuration

Copy `.env.example` and fill in values:

```bash
cp .env.example .env
```

**Required:**

| Variable             | Description                                         |
| -------------------- | --------------------------------------------------- |
| `ORIGIN`             | Public URL (e.g., `https://vibekit.example.com`)    |
| `BETTER_AUTH_SECRET` | 32+ char random string for session encryption       |
| `CRON_SECRET`        | Random string to authenticate cleanup cron requests |

**Optional:**

| Variable                     | Description                                  |
| ---------------------------- | -------------------------------------------- |
| `ADAPTER`                    | `node` (default) or `cloudflare`             |
| `DATABASE_PATH`              | SQLite path (default: `data/vibekit.db`)     |
| `UPLOAD_DIR`                 | File storage path (default: `data/uploads`)  |
| `CONTACT_NOTIFICATION_EMAIL` | Email for contact form notifications         |
| `CF_ACCOUNT_ID`              | Cloudflare account ID for email REST         |
| `CF_API_TOKEN`               | Cloudflare API token for email REST          |
| `EMAIL_FROM`                 | Verified sender address for Cloudflare Email REST |

Generate secrets:

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -hex 32)"
echo "CRON_SECRET=$(openssl rand -hex 16)"
```

### 4. Database Migration

```bash
# Run migrations against the SQLite database
for f in drizzle/*.sql; do
  node -e "
    const Database = require('better-sqlite3');
    const fs = require('fs');
    const db = new Database('data/vibekit.db');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    const sql = fs.readFileSync('$f', 'utf8');
    db.exec(sql);
    db.close();
  "
done
```

### 5. Caddy Reverse Proxy

Install Caddy: `sudo apt install -y caddy`

`/etc/caddy/Caddyfile`:

```
vibekit.example.com {
    reverse_proxy localhost:3000

    # Static asset caching
    header /_app/* Cache-Control "public, max-age=31536000, immutable"

    # Security headers
    header {
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
    }
}
```

```bash
sudo systemctl reload caddy
```

### 6. systemd Service

`/etc/systemd/system/vibekit.service`:

```ini
[Unit]
Description=Vibekit
After=network.target

[Service]
Type=simple
User=vibekit
Group=vibekit
WorkingDirectory=/opt/vibekit
EnvironmentFile=/opt/vibekit/.env
Environment=ADAPTER=node
Environment=PORT=3000
Environment=ADDRESS_HEADER=X-Forwarded-For
ExecStart=/home/vibekit/.bun/bin/bun ./build/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vibekit
sudo systemctl status vibekit
```

### 7. Cleanup Cron

`/etc/systemd/system/vibekit-cleanup.timer`:

```ini
[Unit]
Description=Run Vibekit cleanup daily at 3 AM

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

`/etc/systemd/system/vibekit-cleanup.service`:

```ini
[Unit]
Description=Vibekit cleanup

[Service]
Type=oneshot
User=vibekit
ExecStart=/usr/bin/curl -s -X POST -H "x-cron-secret: YOUR_CRON_SECRET" http://localhost:3000/api/admin/cleanup
```

```bash
# Replace YOUR_CRON_SECRET with the value from .env
sudo systemctl daemon-reload
sudo systemctl enable --now vibekit-cleanup.timer
```

### 8. Backup and Restore

#### Backup Script

`/opt/vibekit/scripts/backup.sh`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/vibekit/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

mkdir -p "${BACKUP_PATH}"

# Stop the app for a consistent snapshot
sudo systemctl stop vibekit

# Backup SQLite
cp /opt/vibekit/data/vibekit.db "${BACKUP_PATH}/vibekit.db"

# Backup uploads
tar czf "${BACKUP_PATH}/uploads.tar.gz" -C /opt/vibekit/data uploads/

# Backup env
cp /opt/vibekit/.env "${BACKUP_PATH}/.env"

# Restart
sudo systemctl start vibekit

# Compress and keep last 30 days
tar czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "${TIMESTAMP}"
rm -rf "${BACKUP_PATH}"

# Cleanup old backups (30 days)
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +30 -delete

echo "Backup complete: ${BACKUP_PATH}.tar.gz"
```

```bash
chmod +x /opt/vibekit/scripts/backup.sh

# Add daily backup cron
sudo -u vibekit crontab -e
# Add: 0 2 * * * /opt/vibekit/scripts/backup.sh >> /opt/vibekit/backups/backup.log 2>&1
```

#### Restore

```bash
# Stop the app
sudo systemctl stop vibekit

# Extract backup
cd /opt/vibekit
tar xzf backups/YYYYMMDD_HHMMSS.tar.gz -C backups/

# Restore database
cp backups/YYYYMMDD_HHMMSS/vibekit.db data/vibekit.db

# Restore uploads
tar xzf backups/YYYYMMDD_HHMMSS/uploads.tar.gz -C data/

# Start the app
sudo systemctl start vibekit
```

---

## Cloudflare Deployment (Secondary Adapter)

### Environment Variables

**Required:**

| Variable             | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `ORIGIN`             | Public origin URL (e.g., `https://vibekit.example.com`) |
| `BETTER_AUTH_SECRET` | Secret key for Better Auth session encryption           |

**Optional (Remote Database):**

| Variable                 | Description                                         |
| ------------------------ | --------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`  | Cloudflare account ID                               |
| `CLOUDFLARE_DATABASE_ID` | D1 database ID                                      |
| `CLOUDFLARE_D1_TOKEN`    | Cloudflare API token with D1 read/write permissions |

Local development only requires the required variables in `.env`. Remote database variables are needed only for pushing migrations to production D1.

### Database Setup

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

### First Admin User

1. Register a new account via `/register`
2. Promote the user to admin by running against the remote database:

```sql
UPDATE user SET role = 'admin' WHERE email = 'your@email.com';
```

Run via wrangler:

```bash
wrangler d1 execute vibekit-db --remote --command "UPDATE user SET role = 'admin' WHERE email = 'your@email.com'"
```

### D1 Backup

#### Export

```bash
wrangler d1 export vibekit-db --remote --output backup.sql
```

#### Import

```bash
wrangler d1 execute vibekit-db --remote --file backup.sql
```

### Migration Runbook

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

### 30-Day Soft-Delete Cleanup (Cron)

Soft-deleted records older than 30 days should be purged periodically. Schedule the following via Cloudflare Cron Triggers in `wrangler.jsonc`:

#### Blog Posts

```sql
DELETE FROM blog_post
WHERE deleted_at IS NOT NULL
  AND deleted_at < unixepoch('now', '-30 days') * 1000;
```

#### Items

```sql
DELETE FROM item
WHERE deleted_at IS NOT NULL
  AND deleted_at < unixepoch('now', '-30 days') * 1000;
```

#### Users

```sql
DELETE FROM user
WHERE deleted_at IS NOT NULL
  AND deleted_at < unixepoch('now', '-30 days') * 1000;
```

#### Cron Trigger Configuration

Add a `triggers` section to `wrangler.jsonc`:

```jsonc
{
  "triggers": {
    "crons": ["0 3 * * *"]   // Run daily at 3:00 AM UTC
  }
}
```

An admin cleanup endpoint exists at `POST /api/admin/cleanup` that hard-deletes soft-deleted records older than 30 days. Call this endpoint from a Cloudflare Cron Trigger, an external scheduler (e.g., cron-job.org), or manually.

### Cache Strategy

#### Blog Pages (Public)

Blog pages use SSR at the edge with CDN-friendly cache headers:

| Header              | Value                                                           | Purpose                                                                           |
| ------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `Cache-Control`     | `public, max-age=300, s-maxage=3600, stale-while-revalidate=60` | Browser caches 5 min, CDN caches 1 hour, serves stale for 60s during revalidation |
| `CDN-Cache-Control` | `public, max-age=3600`                                          | Cloudflare CDN-specific override (1 hour)                                         |

#### Cache-Tag Purge

Blog mutation endpoints (publish, unpublish, update, archive, delete, restore) call `purgeBlogCache()` to invalidate cached responses. Tags used:

- `blog:index` — purges the blog listing page
- `blog:slug:{slug}` — purges a specific blog post page

#### Image CDN (R2)

Uploaded blog images are stored in Cloudflare R2 (`R2_BLOG_MEDIA` bucket) and served via `/cdn/blog/{key}` with:

| Header          | Value                                 | Purpose                                     |
| --------------- | ------------------------------------- | ------------------------------------------- |
| `Cache-Control` | `public, max-age=31536000, immutable` | Long-lived cache for immutable image assets |

#### Setup

1. Create the R2 bucket: `wrangler r2 bucket create vibekit-blog-media`
2. Configure cache rules in Cloudflare dashboard if needed
3. The cache purge logic uses the Cloudflare Cache API via `platform.caches`

### Build and Deploy

```bash
# Build for Cloudflare
ADAPTER=cloudflare bun run build

# Preview locally
bun run preview

# Deploy
wrangler deploy
```

Set Worker secrets:

```bash
wrangler secret put ORIGIN
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put CRON_SECRET
```

Optional Worker vars/secrets for email REST:

```bash
wrangler secret put CF_ACCOUNT_ID
wrangler secret put CF_API_TOKEN
wrangler secret put EMAIL_FROM
wrangler secret put CONTACT_NOTIFICATION_EMAIL
```

---

## Risks

| Risk                                                                 | Mitigation                                                                                                        |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Cloudflare bindings initialized globally break D1/auth               | Request-scoped Cloudflare services from `event.platform.env`; auth factory pattern                                |
| Self-host env validation blocks unrelated commands                   | Split env validation by concern; no single global parse that requires every integration                            |
| Bun-only DB makes Node execution invalid                             | Bun is the self-host runtime; add a `better-sqlite3` adapter only if Node runtime becomes required                |
| Storage URL mismatch breaks existing blog content                    | `/cdn/blog/{key}` is canonical URL across both adapters                                                           |
| R2 binding behavior regresses                                        | R2 binding adapter is preserved; Workers do not use public R2 S3 API                                              |
| Email REST credentials or Cloudflare Email product setup are missing | Adapter returns a clear configuration error outside dev; local dev uses explicit no-op/logging behavior            |
| Proxy/client IP is wrong on VPS                                      | Configure trusted proxy headers (`ADDRESS_HEADER=X-Forwarded-For`) in deploy docs                                 |
| Two adapters drift                                                    | Both `check:node` and `check:cf` are available; Node e2e and Cloudflare smoke tests validate parity               |

---

## Package Scripts

```json
{
  "dev": "ADAPTER=node vite dev",
  "build": "ADAPTER=cloudflare wrangler types --check && ADAPTER=cloudflare vite build",
  "build:node": "ADAPTER=node vite build",
  "start": "bun ./build/index.js",
  "check:node": "ADAPTER=node svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "check:cf": "ADAPTER=cloudflare wrangler types --check && ADAPTER=cloudflare svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
}
```
