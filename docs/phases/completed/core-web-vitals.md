# Core Web Vitals — Implementation Plan

## What exists

- Web vitals utility (src/lib/performance.svelte.ts) with LCP/CLS/INP observers
- fetchpriority="high" on hero images
- loading="lazy" on below-the-fold images
- decoding="async" on blog images
- Vite chunk splitting for large vendor deps

## What's needed

1. Wire initWebVitals() into app layout for real-user monitoring
2. Add explicit width/height to images to prevent CLS
3. Performance budget config in package.json
4. Font-display swap for any future custom fonts (base CSS)
5. Skeleton loading states for CLS prevention during data fetch

## Files to Create

1. `tests/unit/core-web-vitals.test.ts`

## Files to Modify

1. `src/routes/(app)/+layout.svelte` — init web vitals
2. `src/routes/layout.css` — font-display fallback
3. `package.json` — add performance budget
