# Performance Optimization — Implementation Plan

## What exists

- System fonts only (no web fonts to optimize)
- Native `loading="lazy"` on below-the-fold images
- `data-sveltekit-preload-data="hover"` on body
- SvelteKit code-splitting per route (automatic)
- Tailwind CSS v4 (tree-shaking built in)

## What's needed

1. Vite build config: manual chunk splitting for large vendor deps
2. Lazy load heavy admin components (blog editor, media library)
3. Image optimization: `fetchpriority="high"` for hero images, `decoding="async"` for all images
4. Preconnect for external origins
5. Performance monitoring helper (reportWebVitals)
6. Build analysis script

## Files to Create

1. `src/lib/performance.svelte.ts` — web vitals reporting utility

## Files to Modify

1. `vite.config.ts` — add rollup chunk splitting
2. `src/app.html` — add preconnect hints
3. Blog hero images — add fetchpriority
4. `package.json` — add bundle analysis script
