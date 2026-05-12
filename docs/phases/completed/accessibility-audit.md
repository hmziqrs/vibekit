# Accessibility Audit — Implementation Plan

## What exists

- SkipLink component (src/lib/components/skip-link.svelte)
- Search dialog with role="combobox", aria-expanded, aria-controls
- ConfirmDialog with keyboard handling
- Image alt text on blog images
- Language dir attributes (RTL for Urdu)

## What's needed

1. Reduced motion support (CSS prefers-reduced-motion)
2. Focus-visible outlines for keyboard navigation
3. ARIA landmarks on layout sections
4. Accessible form labels verification
5. Color contrast verification (design tokens already handle this)
6. Screen reader-only utility class

## Files to Create

1. `tests/unit/accessibility.test.ts`

## Files to Modify

1. `src/routes/layout.css` — add reduced-motion, focus-visible, sr-only
2. `src/routes/(app)/+layout.svelte` — add ARIA landmarks
3. `src/routes/(admin)/+layout.svelte` — add ARIA landmarks
