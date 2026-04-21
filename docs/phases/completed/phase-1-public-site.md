# Phase 1 — Public Site

**Status:** In Progress
**PRD Reference:** §18 Phase 1, §19.3 Public Site Checklist

---

## What's Already Done

- [x] Home page (landing page with hero, features, pricing, CTA, footer)
- [x] Shared nav and footer components (`nav.svelte`, `footer.svelte`)
- [x] Prerender layout for `(public)` route group
- [x] Design system tokens and color system
- [x] shadcn-svelte base components (button, input, label, card, separator)
- [x] Zod validation framework
- [x] Error page (`+error.svelte`)

---

## Remaining Work

### 1.1 Features Page (`/features`)

Create `src/routes/(public)/features/+page.svelte` — dedicated features page expanding on the bento grid from the landing page. Mobile-first, prerendered.

**Content:**

- Expanded feature descriptions with code examples
- Technical stack highlights (SvelteKit, D1, Drizzle, Better Auth, TanStack)
- Feature comparison or capability grid
- CTA section

**Files:**

- `src/routes/(public)/features/+page.svelte`

---

### 1.2 Pricing Page (`/pricing`)

Create `src/routes/(public)/pricing/+page.svelte` — standalone pricing page. Mobile-first, prerendered.

**Content:**

- Pricing tiers (Starter $0, Pro $29)
- Feature comparison table
- FAQ section
- CTA

**Files:**

- `src/routes/(public)/pricing/+page.svelte`

---

### 1.3 About Page (`/about`)

Create `src/routes/(public)/about/+page.svelte` — about the project. Mobile-first, prerendered.

**Content:**

- Mission statement
- Technology stack overview
- Open source commitment

**Files:**

- `src/routes/(public)/about/+page.svelte`

---

### 1.4 Contact Page (`/contact`)

Create `src/routes/(public)/contact/+page.svelte` with a working form action.

**Requirements:**

- Contact form with name, email, subject, message fields
- SvelteKit form action (`+page.server.ts`) that:
  - Validates input with shared Zod schema
  - Persists to D1 (contact_submissions table)
  - Sends notification via `send_email` binding (graceful skip if unavailable)
  - Rate limited (Cloudflare Rate Limiting rules)
- Success/error states
- CSR can remain off for progressive enhancement

**Files:**

- `src/routes/(public)/contact/+page.svelte`
- `src/routes/(public)/contact/+page.server.ts`
- `src/lib/validators/contact.ts`
- `src/lib/server/db/schema.ts` — add `contactSubmission` table
- `drizzle/0002_*.sql` — new migration

---

### 1.5 Legal Pages (`/privacy`, `/terms`)

Create placeholder legal pages. Mobile-first, prerendered.

**Files:**

- `src/routes/(public)/privacy/+page.svelte`
- `src/routes/(public)/terms/+page.svelte`

---

### 1.6 Shared SEO Helper

Create `src/lib/seo.ts` — helper for generating consistent `<svelte:head>` metadata.

**Function:**

```typescript
export function seo({ title, description, canonical, og?, twitter? })
```

Returns an object or uses a Svelte action to set:

- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`
- Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`)
- Twitter Card tags

**Files:**

- `src/lib/seo.ts`

---

### 1.7 JSON-LD Support

Add JSON-LD structured data support for public pages (Organization, WebSite, WebPage schemas).

**Files:**

- `src/lib/json-ld.ts` — helper to generate JSON-LD script tags

---

## Implementation Order

1. Create SEO helper (1.6)
2. Create JSON-LD helper (1.7)
3. Create Features page (1.1)
4. Create Pricing page (1.2)
5. Create About page (1.3)
6. Create Contact page with form action + DB schema (1.4)
7. Create Legal pages (1.5)
8. Write tests for contact form validation
9. Run full test suite + type check

---

## Acceptance Criteria

- [ ] All public pages render without auth
- [ ] All public pages are prerendered
- [ ] Nav and footer links work across all pages
- [ ] SEO metadata present on every page via shared helper
- [ ] Contact form validates input (client + server)
- [ ] Contact form persists to D1
- [ ] `bun run check` passes clean
- [ ] `bun run test` passes
- [ ] `bun run dev` serves all pages correctly
