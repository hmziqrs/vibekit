# Zapier/n8n Connector — Implementation Plan

## Requirements (from docs/loop.md line 176)

- Expose actions and triggers for no-code automation platforms

## Design

### Approach: Webhook-Compatible API

Rather than building Zapier CLI apps or n8n nodes (which require per-platform SDKs), we provide:

1. **Integration manifest endpoint** (`/api/integrations/manifest`) — standardized JSON describing all available triggers, actions, and auth requirements
2. **Pre-configured webhook templates** — quick-setup templates for common Zapier/n8n workflows
3. **Setup guide page** (`/docs/automation`) — step-by-step instructions for connecting with Zapier and n8n

### Why This Approach

- Zapier and n8n both support generic webhooks and REST API calls
- Our existing webhook system already provides the trigger mechanism
- Our existing API (with bearer tokens) provides the action mechanism
- No need for per-platform SDK/CLI tools

### Architecture

1. **Manifest endpoint** — returns structured JSON with triggers (webhook events) and actions (API endpoints)
2. **Automation docs page** — setup guides for Zapier, n8n, Make (Integromat), and custom webhooks
3. **Webhook event samples** — example payloads for each trigger type

### Files to Create

1. `src/routes/(public)/docs/automation/+page.svelte` — automation guide page
2. `src/routes/(public)/docs/automation/+page.ts` — enable CSR for tabs
3. `tests/e2e/automation.spec.ts` — E2E tests
4. `tests/unit/manifest.test.ts` — unit tests

### Files to Modify

1. `src/lib/server/hono/index.ts` — add manifest endpoint
2. `docs/loop.md` — mark complete
