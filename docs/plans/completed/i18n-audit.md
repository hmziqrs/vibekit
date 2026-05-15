---
name: i18n Implementation Audit
description: Detailed audit of i18n phase — claimed features vs actual implementation
type: project
---

# i18n Implementation Audit — 2026-05-15

## Claimed vs Actual

| Claimed Feature                       | Status                  | Details                                                                                                                                                                                                                                                                      |
| ------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All user-facing strings extracted     | **FALSE**               | ~89 keys defined in `messages/en.json` but only ~22 `m.xxx()` calls exist across 2 files (app layout, admin layout). 72+ other svelte files use hardcoded English. Most defined keys are unused.                                                                             |
| RTL support verification              | **PARTIAL**             | No `dir="rtl"` attributes found in any template. ~5 files use logical CSS properties (`ms-`/`me-`/`text-start`/`border-e` etc.); no `rtl:` Tailwind modifiers exist anywhere. The remaining ~70 files still use physical directional classes (`ml-`/`mr-`/`left-`/`right-`). |
| Plural rules                          | **INFRASTRUCTURE ONLY** | `Intl.PluralRules` available via paraglide, never called from app code.                                                                                                                                                                                                      |
| Date/number formatting per locale     | **COMPLETE**            | All 29 files with hardcoded formatting now use `formatDate`/`formatNumber` from `$lib/i18n.svelte`.                                                                                                                                                                          |
| Language switcher                     | **PARTIAL**             | Component exists but placed at bottom of page body outside main content.                                                                                                                                                                                                     |
| Missing translation detection         | **PARTIAL**             | Script exists, works, but NOT in CI pipeline.                                                                                                                                                                                                                                |
| Translation key linting               | **PARTIAL**             | Checks key parity, doesn't detect unused keys or hardcoded strings.                                                                                                                                                                                                          |
| ICU message format support            | **TRUE**                | Paraglide supports `{param}` syntax correctly.                                                                                                                                                                                                                               |
| Translation workflow for contributors | **FALSE**               | No docs, no external platform, no guide for adding locales.                                                                                                                                                                                                                  |

## Critical Gaps

1. ~~**23+ hardcoded formatDate/formatNumber calls**~~ — **FIXED**. All 27 files now import and use `formatDate`/`formatNumber` from `$lib/i18n.svelte` instead of hardcoded `'en-US'` or browser-default locale.

2. **~89 translation keys defined but mostly unused** — Only ~22 `m.xxx()` calls exist, confined to 2 layout files (app and admin navigation labels). Nav footers, CTAs, form labels, error messages, page headings, and all other content across 72+ svelte files remain hardcoded English.
   - **Fix**: Systematically replace hardcoded strings with `m.keyName()` calls file-by-file.

3. **RTL CSS barely started** — ~5 files use logical CSS properties (`ms-`/`me-`/`text-start`/`border-e` etc.). No `rtl:` Tailwind modifiers exist. No `dir="rtl"` attributes exist in any template. ~70 files still use physical directional classes (`ml-`/`mr-`/`left-`/`right-`) that break in RTL.
   - **Fix**: Replace physical directional classes with logical equivalents (`ml-`/`mr-` with `ms-`/`me-`, `text-left` with `text-start`, `right-0` with `end-0`) across all remaining files.

4. **i18n check not in CI** — Script runs locally but never in GitHub Actions.
   - **Fix**: Add `bun run i18n:check` to CI workflow.

5. **Language switcher placement** — Hidden at bottom of body, not in navigation.
   - **Fix**: Move into nav component.

## Files

- `messages/en.json` / `messages/ur.json` — ~89 translation keys (most unused)
- `src/lib/i18n.svelte.ts` — Locale-aware formatDate/formatNumber (used in 29 files)
- `src/lib/paraglide/` — Auto-generated runtime
- `src/routes/(app)/+layout.svelte` — Uses `m.xxx()` for nav labels (10 calls)
- `src/routes/(admin)/+layout.svelte` — Uses `m.xxx()` for nav labels (12 calls)
- `src/lib/components/language-switcher.svelte` — Language switcher component
- `scripts/i18n-check.ts` — Validation script (NOT in CI)
