# Backup & Disaster Recovery — Implementation Plan

## What exists

- Cloudflare D1 with built-in point-in-time recovery
- Cloudflare R2 with 11 nines durability

## What's been done

- D1 backup via `wrangler d1 export` command documented
- Point-in-time recovery via Cloudflare D1 time travel feature
- RTO target: <1 hour, RPO target: <15 minutes

## Backup procedures

- Daily D1 export via scheduled worker (cron)
- R2 objects have versioning enabled
- Restore procedure: wrangler d1 import from backup
