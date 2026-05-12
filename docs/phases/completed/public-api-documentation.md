# Public API Documentation — Implementation Plan

## Requirements (from docs/loop.md line 174)

- OpenAPI spec generation
- Interactive API explorer
- Code examples in multiple languages
- Authentication guide

## Design Decisions

### Approach: Static OpenAPI Spec + Scalar API Reference

Instead of refactoring all 150 routes to use `@hono/zod-openapi` (massive refactor), we'll:

1. **Hand-write a comprehensive OpenAPI 3.1 YAML spec** covering all API routes with schemas, descriptions, and examples
2. **Use Scalar** (modern, beautiful API docs renderer) for the interactive explorer — it reads OpenAPI specs and provides try-it-out functionality
3. **Build a custom documentation page** at `/docs` with sections: Authentication, Quick Start, API Reference, Code Examples

### Why Scalar over Swagger UI / Redoc

- Better design, mobile-responsive
- Built-in code examples in multiple languages
- Dark mode support (matches our dark-first design)
- Lightweight, no server-side rendering needed

### Architecture

1. **OpenAPI Spec** (`static/openapi.yaml`) — full YAML specification of the API
2. **Scalar Component** — renders the interactive explorer from the spec
3. **Docs Page** (`src/routes/(public)/docs/+page.svelte`) — public documentation hub
4. **Auth Guide** — detailed section on session auth and API key auth
5. **Code Examples** — curl, JavaScript (fetch), Python (requests), Go, Ruby snippets

### Files to Create

1. `static/openapi.yaml` — OpenAPI 3.1 spec (comprehensive)
2. `src/routes/(public)/docs/+page.svelte` — documentation hub page
3. `src/lib/components/api-explorer.svelte` — Scalar wrapper component
4. `tests/unit/openapi.test.ts` — validate spec structure
5. `tests/e2e/api-docs.spec.ts` — E2E tests for docs page

### Files to Modify

1. `docs/loop.md` — mark complete

### API Reference Sections

The spec will organize routes into these tags:

- **Authentication** — session-based auth, API keys
- **Items** — CRUD for user items
- **Blog** — blog post management (admin)
- **Users** — user management (admin)
- **Comments** — comment listing, moderation
- **Notifications** — push, in-app notifications
- **Organizations** — org CRUD, membership, RBAC
- **Teams** — team management within orgs
- **Webhooks** — endpoint management, delivery logs
- **API Keys** — key CRUD, rotation, usage
- **Billing** — plans, subscriptions, invoices
- **Reports** — content reporting
- **Analytics** — page views, reading stats
- **Newsletter** — subscribe, confirm, unsubscribe
- **Search** — blog search
- **Admin** — admin-only operations

### Quality Gates

- `bun run test` — all pass
- `bun run lint` — 0 new errors
- `bun run format:check` — pass
- Browser: docs page renders with Scalar explorer
