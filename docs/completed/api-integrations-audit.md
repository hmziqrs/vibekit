# API & Integrations — Implementation Audit

**Date:** 2026-05-14
**Status:** Audited

## Phase Coverage

| Phase                    | Status             | Notes                                                                                            |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------ |
| API key management       | ⚠️ Partial         | CRUD, rotation, revocation done. `withApiKey` middleware never mounted — keys are non-functional |
| Webhooks & event bus     | ⚠️ Mostly Complete | Delivery, signing, retry, UI done. No automated retry scheduler. Secret leaked in list           |
| Public API documentation | ✅ Complete        | OpenAPI 3.1, Scalar explorer, code examples                                                      |
| Third-party integrations | ⚠️ Partial         | OAuth PKCE, 5 providers. State stored in-memory (lost on deploy). Tokens plaintext in D1         |
| Zapier/n8n connector     | ✅ Complete        | Automation manifest, documentation pages                                                         |

## Issues Found

### HIGH

1. **`withApiKey` middleware never used** — API keys cannot authenticate any endpoint
2. **Per-key rate limiting stored but never enforced**
3. **OAuth state stored in-memory Map** — Lost on every deploy/restart
4. **Webhook signing secret leaked in list endpoint**

### MEDIUM

5. **No automated webhook retry scheduler** — `nextRetryAt` set but never processed
6. **OAuth access tokens stored plaintext in D1**
7. **Scope name mismatch between docs and implementation** — Docs say `items.read`, code uses `read:items`
8. **`revokeApiKey` always returns `true`** — Cannot detect non-existent key
9. **`pingProvider` health check is a stub** — Always returns true
10. **Rate limiter is in-memory only** — Per-isolate on Cloudflare Workers

## Key Files

- `src/lib/server/api-keys.ts` — API key CRUD
- `src/lib/server/webhooks.ts` — Webhook delivery
- `src/lib/server/integrations/oauth.ts` — OAuth flow
- `src/lib/server/hono/middleware.ts` — `withApiKey` middleware (unused)
- `src/routes/(public)/docs/+page.svelte` — API documentation
- `static/openapi.yaml` — OpenAPI spec

## Test Coverage

- Unit: 13 files for api-keys, webhooks, oauth, integrations
- E2E: 5 spec files for api-keys, webhooks, integrations
- Gaps: No test for `withApiKey` middleware integration, no test for webhook secret leak
