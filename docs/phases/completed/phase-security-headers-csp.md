# Phase: Security Headers & CSP

**Status:** Complete
**Category:** Auth & Security
**Started:** 2026-05-11

## Scope

Harden HTTP security headers in `handleSecurityHeaders` (hooks.server.ts). Add missing headers (X-Frame-Options, COOP, COEP, CORP), tighten CSP (remove `unsafe-inline` from script-src using nonce-based approach), and add unit tests verifying all headers are present.

---

## Items

### 1. Add Missing Security Headers

**Problem:** Missing X-Frame-Options, Cross-Origin-Opener-Policy, Cross-Origin-Embedder-Policy, Cross-Origin-Resource-Policy headers.

**Plan:**

- In `handleSecurityHeaders` in `src/hooks.server.ts`, add:
  - `X-Frame-Options: DENY` — prevents clickjacking
  - `Cross-Origin-Opener-Policy: same-origin` — prevents cross-origin window access
  - `Cross-Origin-Resource-Policy: same-origin` — prevents cross-origin resource loading
  - Skip COEP for now — requires all resources to opt-in via CORP/CORS headers, which breaks many third-party resources (Cloudflare Analytics, fonts, images). Can be added later when resources are properly configured.

**Files changed:** `src/hooks.server.ts`

---

### 2. Add CSP frame-ancestors Directive

**Problem:** No `frame-ancestors` directive in CSP. This is the modern replacement for X-Frame-Options.

**Plan:**

- Add `frame-ancestors 'none'` to the CSP string
- This works alongside `X-Frame-Options: DENY` for maximum browser compatibility

**Files changed:** `src/hooks.server.ts`

---

### 3. Tighten CSP script-src with Nonce

**Problem:** CSP uses `'unsafe-inline'` for both `script-src` and `style-src`. The `'unsafe-inline'` in `script-src` significantly weakens XSS protection.

**Plan:**

- Generate a cryptographic nonce per request using `crypto.randomUUID()` or `crypto.getRandomValues()`
- Add the nonce to `script-src` as `'nonce-{value}'` instead of `'unsafe-inline'`
- Keep `'unsafe-inline'` in `style-src` — Tailwind CSS and Svelte component styles require it (scoped styles are injected inline)
- Pass the nonce to the page via `event.locals.cspNonce` so the HTML template can add it to `<script>` tags
- SvelteKit's built-in script handling should work with nonce if configured in `app.html` or via hooks

**Note:** SvelteKit automatically handles nonce for its own inline scripts when configured. For user-added scripts, the nonce must be explicitly added. Since this is an SPA for app routes, most scripts are loaded via Vite's module system (not inline), so nonce-based CSP is practical.

**Files changed:** `src/hooks.server.ts`, `src/app.html`

---

### 4. Write Unit Tests for Security Headers

**Problem:** No tests verifying security headers are present and correct.

**Plan:**

- Create `tests/unit/security-headers.test.ts`
- Test that `handleSecurityHeaders` sets all expected headers
- Test that API routes are excluded
- Test that HSTS is only set for HTTPS
- Test CSP contains expected directives

**Files changed:** `tests/unit/security-headers.test.ts` (new)

---

## Out of Scope

- COEP (Cross-Origin-Embedder-Policy) — requires all third-party resources to opt-in, breaks Cloudflare Analytics and external images
- CSP report-uri / report-to — needs a reporting endpoint, separate phase
- CSP nonce for style-src — Tailwind and Svelte require inline styles
- Subresource Integrity (SRI) — separate phase
- Cloudflare header config in wrangler.jsonc — headers are set dynamically per-request

## Success Criteria

- [x] X-Frame-Options header set to DENY
- [x] Cross-Origin-Opener-Policy set to same-origin
- [x] Cross-Origin-Resource-Policy set to same-origin
- [x] CSP includes frame-ancestors 'none'
- [x] CSP script-src uses nonce instead of unsafe-inline
- [x] All quality gates pass (check, lint, format, test)
