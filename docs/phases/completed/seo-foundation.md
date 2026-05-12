# SEO Foundation

## Completed

### What was done

- Created `<SeoHead>` component that renders all meta, OG, Twitter, and JSON-LD tags from the `seo()` helper
- Replaced manual `<svelte:head>` blocks on all 8 public/blog pages with `<SeoHead>`
- Created dynamic `sitemap.xml` endpoint with static pages, blog posts, and tag pages
- Updated static `robots.txt` with Sitemap reference
- JSON-LD structured data: WebSite schema for pages, BlogPosting for articles

### Files created

- `src/lib/components/seo-head.svelte`
- `src/routes/(public)/sitemap.xml/+server.ts`
- `tests/unit/seo.test.ts`
- `tests/unit/sitemap-robots.test.ts`

### Files modified

- `src/routes/(public)/+page.svelte` — uses SeoHead
- `src/routes/(public)/about/+page.svelte` — uses SeoHead
- `src/routes/(public)/contact/+page.svelte` — uses SeoHead
- `src/routes/(public)/features/+page.svelte` — uses SeoHead
- `src/routes/(public)/pricing/+page.svelte` — uses SeoHead
- `src/routes/(public)/privacy/+page.svelte` — uses SeoHead
- `src/routes/(public)/terms/+page.svelte` — uses SeoHead
- `src/routes/(blog)/blog/+page.svelte` — uses SeoHead
- `src/routes/(blog)/blog/[slug]/+page.svelte` — uses SeoHead with article type
- `static/robots.txt` — added Sitemap reference
- `docs/loop.md` — marked SEO foundation complete
