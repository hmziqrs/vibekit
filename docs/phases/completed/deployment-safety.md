# Deployment Safety — Implementation Plan

## What exists

- Cloudflare Workers gradual deployments (percentage-based rollout)
- Maintenance mode toggle in system config
- Health check endpoint for monitoring

## What's been done

- Gradual deploy via wrangler with --percentage flag
- Automatic rollback: monitor /api/health after deploy, rollback if unhealthy
- Deploy lock via git branch protection
- Maintenance mode: system config `maintenance_mode` flag checked in hooks.server.ts

## Rollback procedure

1. `wrangler deployments list` to find last stable deployment
2. `wrangler deployments rollback` to revert
3. Verify health endpoint returns 200
