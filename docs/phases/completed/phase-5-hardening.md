# Phase 5 — Hardening

**Status:** Complete
**PRD Reference:** §18 Phase 5, §19.7 Quality Checklist, §20 Test Strategy

---

## What's Already Done

- [x] Unit tests for validators (78 tests across 8 files)
- [x] Unit tests for utilities (cn, slug, markdown)
- [x] `/api/health` endpoint
- [x] Security headers in hooks.server.ts

---

## Remaining Work

### 5.1 E2E Tests with Playwright

Install Playwright and write E2E tests for critical flows:

- Visitor browses public site (landing, features, pricing, about)
- User registration flow
- User login flow
- User logout flow
- Protected route redirect (/app → /login)
- Admin route protection (non-admin → /app)

**Files:**

- `playwright.config.ts`
- `e2e/public.spec.ts`
- `e2e/auth.spec.ts`
- `e2e/app.spec.ts`

---

### 5.2 Consent Banner

Create a consent banner component for analytics:

- Show on first visit (check localStorage)
- "Accept" / "Decline" buttons
- Store preference in localStorage
- Gate analytics initialization behind consent
- Respect EU visitors (show by default)

**Files:**

- `src/lib/components/consent-banner.svelte`

---

### 5.3 Security Review

Verify and harden security:

- CSP headers (if not already)
- Rate limiting on auth + contact endpoints (already configured in Cloudflare)
- Review all admin endpoint authorization
- Review XSS vectors (markdown rendering, user input)
- Verify CSRF protection in Better Auth

---

### 5.4 Performance Review

- Verify prerendered public pages
- Check bundle sizes for CSR routes
- Verify no unnecessary client JS on SSR pages
- Add loading states for slow operations

---

### 5.5 Accessibility Pass

- Form labels and ARIA attributes on all forms
- Keyboard navigation (focus management)
- Skip-to-content link
- Color contrast verification
- Alt text for images

---

### 5.6 Deployment Documentation

Create deployment docs:

- Environment variables checklist
- D1 database setup and migration runbook
- First admin user creation
- D1 export / backup procedures
- 30-day trash cron runbook

**Files:**

- `docs/deployment.md`

---

## Implementation Order

1. Install Playwright + configure (5.1)
2. Write E2E tests (5.1)
3. Consent banner (5.2)
4. Security review (5.3)
5. Accessibility pass (5.5)
6. Performance review (5.4)
7. Deployment documentation (5.6)
8. Run full test suite + type check

---

## Acceptance Criteria

- [ ] Playwright E2E tests for public browsing, auth, app access
- [ ] Consent banner shows and stores preference
- [ ] All forms have proper labels and ARIA
- [ ] Security headers verified
- [ ] Deployment docs written
- [ ] `bun run check` passes clean (no source errors)
- [ ] `bun run test` passes
- [ ] E2E tests pass
