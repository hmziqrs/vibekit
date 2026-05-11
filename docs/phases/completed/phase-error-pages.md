# Phase: Error Pages

**Status:** Complete
**Category:** Foundation & DX
**Started:** 2026-05-11

## Scope

Enhance the existing `+error.svelte` to cover all planned error codes (400/403/404/500/503), add 429 rate-limit handling, make recovery actions context-aware, and ensure no stack traces leak in production.

---

## Items

### 1. Extend Error Page Coverage (503, 429)

**Problem:** Error page handles 400/401/403/404/500 but missing 503 (service unavailable) and 429 (rate limited), both of which the API can return.

**Plan:**

- Add 503 icon (`CloudOff`) and message ("Service temporarily unavailable")
- Add 429 icon (`Timer`) and message ("Too many requests")
- Keep the generic fallback for unknown status codes

**Files changed:** `src/routes/+error.svelte`

---

### 2. Context-Aware Recovery Actions

**Problem:** All error codes show the same "Go back home" + "Go back" buttons. 401 should offer "Sign in", 404 could suggest search, etc.

**Plan:**

- 401: Primary action = "Sign in" (links to `/login`), secondary = "Go back"
- 403: Primary action = "Go back home", secondary = "Go back" (keep current)
- 404: Primary action = "Go back home", secondary = "Go back" (keep current)
- 429: Primary action = "Go back home", secondary = "Try again" (reload)
- 500/503: Primary action = "Try again" (reload), secondary = "Go back home"
- 400: Primary action = "Go back home", secondary = "Go back" (keep current)

**Files changed:** `src/routes/+error.svelte`

---

### 3. Ensure No Stack Traces in Production

**Problem:** Need to verify the fallback case doesn't leak stack traces.

**Plan:**

- The generic fallback shows `page.error?.message` which is safe (it's the error message string, not a stack trace)
- Verify that `handleError` in `hooks.server.ts` doesn't expose internals to the client
- No code changes needed if already safe

**Files changed:** None (verification only)

---

## Out of Scope

- Route-group-specific error pages (auth/app/admin errors redirect via guards)
- i18n for error messages (deferred to i18n phase)
- Error page animations (not critical)
- Sentry/monitoring integration (deferred to Monitoring phase)

## Success Criteria

- [x] Error page handles 400, 401, 403, 404, 429, 500, 503 with unique icons and messages
- [x] Recovery actions are context-aware per error code
- [x] No stack traces exposed to end users
- [x] Brand-consistent design maintained
- [x] All quality gates pass
