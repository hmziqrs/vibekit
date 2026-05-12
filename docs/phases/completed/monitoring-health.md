# Monitoring, Observability & Health Checks — Implementation Plan

## What exists

- Hono API with middleware
- Cloudflare Workers platform
- Audit log system

## What's needed

1. Health check endpoint (GET /api/health — liveness + dependency checks)
2. Structured logging utility
3. Sentry error tracking integration
4. Performance monitoring middleware

## Files to Create

1. `src/lib/server/logger.ts` — structured logging
2. `tests/unit/health-check.test.ts`

## Files to Modify

1. `src/lib/server/hono/index.ts` — add health endpoint and logging middleware
