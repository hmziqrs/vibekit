# Phase: Error Handling Framework

**Status:** In Progress
**Category:** Foundation & DX
**Started:** 2026-05-11

## Scope

Build a structured error handling system: custom error classes, standardized API error format, global server/client error handlers, and Hono `HTTPException` integration. External monitoring (Sentry) is deferred to the Monitoring & Observability phase.

---

## Items

### 1. Custom Error Classes (`src/lib/server/errors.ts`)

**Problem:** No custom error classes exist. All API errors are manual `c.json({ error: string }, status)`, making it hard to standardize responses or classify errors.

**Plan:**

Create an `AppError` hierarchy:

- `AppError` (base) — extends `Error`, adds `status`, `code`, `detail` fields
- `NotFoundError` — status 404, for missing resources
- `ForbiddenError` — status 403, for permission denied
- `UnauthorizedError` — status 401, for unauthenticated
- `BadRequestError` — status 400, for invalid input
- `ConflictError` — status 409, for duplicate resources
- `RateLimitError` — status 429, for rate limiting
- `ServiceUnavailableError` — status 503, for degraded services

Each class serializes to a standard `{ error: { code, message, status } }` format.

**Files changed:** `src/lib/server/errors.ts` (new)

---

### 2. Standardize Hono API Error Responses

**Problem:** API errors use inconsistent formats — manual `c.json({ error: string })` vs. `@hono/zod-validator` default format.

**Plan:**

- Replace manual `c.json({ error: ... }, status)` calls in `src/lib/server/hono/index.ts` with thrown `AppError` subclasses
- Update Hono global `onError` handler to:
  1. Check if error is an `AppError` → return structured response
  2. Check if error is a Zod validation error → return formatted validation response
  3. Otherwise → log and return generic 500
- Add custom `zValidator` error hook to format Zod errors consistently
- Update middleware in `src/lib/server/hono/middleware.ts` to throw `AppError` subclasses

**Files changed:** `src/lib/server/hono/index.ts`, `src/lib/server/hono/middleware.ts`

---

### 3. Server `handleError` in `hooks.server.ts`

**Problem:** No centralized server-side error logging. Unhandled errors go to SvelteKit's default handling with no logging.

**Plan:**

- Add `export const handleError` to `hooks.server.ts`
- Log error details: status, message, URL, stack trace
- For now, log to `console.error` with structured format (JSON)
- This provides a single hook point for future Sentry integration

**Files changed:** `src/hooks.server.ts`

---

### 4. Client `handleError` in `hooks.ts`

**Problem:** No client-side error handling or logging.

**Plan:**

- Add `export const handleError` to `src/hooks.ts`
- Log client errors to `console.error` with structured format
- This provides a single hook point for future client-side error reporting

**Files changed:** `src/hooks.ts`

---

## Out of Scope (deferred to later phases)

- Custom 400/403/404/500/503 pages with brand design → separate phase
- External error monitoring (Sentry, Datadog) → Monitoring & Observability phase
- Toast/notification system for API errors → Notifications phase
- Request/correlation IDs → Infrastructure phase
- Structured JSON logging framework → Monitoring phase
- Email retry/queue for contact form failures → Email Infrastructure phase

## Success Criteria

- [x] Custom error class hierarchy exists with typed status codes
- [x] Hono API routes use `throw new AppError(...)` instead of manual `c.json()`
- [x] Hono global error handler classifies and formats all error types
- [x] Zod validation errors have consistent format matching other API errors
- [x] Server `handleError` logs all unhandled server errors
- [x] Client `handleError` logs all unhandled client errors
- [x] All existing tests pass, new tests for error utilities
- [ ] All quality gates pass
