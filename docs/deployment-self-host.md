# Self-Host Deployment Guide

Run Vibekit on a VPS with Bun, SQLite, and filesystem storage behind a reverse proxy.

---

## Prerequisites

- VPS with Ubuntu 22.04+ (or similar Linux)
- Bun 1.2+ installed (`curl -fsSL https://bun.sh/install | bash`)
- Domain pointing to the VPS IP

## 1. System Setup

```bash
# Create app user
sudo useradd -r -s /bin/bash -d /opt/vibekit vibekit
sudo mkdir -p /opt/vibekit
sudo chown vibekit:vibekit /opt/vibekit

# Create data directories
sudo mkdir -p /opt/vibekit/data/uploads
sudo chown -R vibekit:vibekit /opt/vibekit/data
```

## 2. Deploy Application

```bash
cd /opt/vibekit
git clone <repo-url> .

bun install --production

# Build the Node adapter
ADAPTER=node bun run build:node
```

## 3. Environment Configuration

Copy `.env.example` and fill in values:

```bash
cp .env.example .env
```

Required:

| Variable             | Description                                         |
| -------------------- | --------------------------------------------------- |
| `ORIGIN`             | Public URL (e.g., `https://vibekit.example.com`)    |
| `BETTER_AUTH_SECRET` | 32+ char random string for session encryption       |
| `CRON_SECRET`        | Random string to authenticate cleanup cron requests |

Optional:

| Variable                     | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `ADAPTER`                    | `node` (default) or `cloudflare`                  |
| `DATABASE_PATH`              | SQLite path (default: `data/vibekit.db`)          |
| `UPLOAD_DIR`                 | File storage path (default: `data/uploads`)       |
| `CONTACT_NOTIFICATION_EMAIL` | Email for contact form notifications              |
| `CF_ACCOUNT_ID`              | Cloudflare account ID for email REST              |
| `CF_API_TOKEN`               | Cloudflare API token for email REST               |
| `EMAIL_FROM`                 | Verified sender address for Cloudflare Email REST |

Generate secrets:

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -hex 32)"
echo "CRON_SECRET=$(openssl rand -hex 16)"
```

## 4. Database Migration

```bash
# Run migrations against the SQLite database
for f in drizzle/*.sql; do
  bun -e "
    import { Database } from 'bun:sqlite';
    const db = new Database('data/vibekit.db');
    const sql = await Bun.file('$f').text();
    db.exec(sql);
    db.close();
  "
done
```

## 5. Caddy Reverse Proxy

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

## 6. systemd Service

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

## 7. Cleanup Cron

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

## 8. Backup and Restore

### Backup Script

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

### Restore

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

## Cloudflare Deploy (Secondary Adapter)

To deploy on Cloudflare Workers instead:

```bash
# Build for Cloudflare
ADAPTER=cloudflare bun run build

# Preview locally
bun run preview

# Deploy
wrangler deploy
```

Required Worker secrets:

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
