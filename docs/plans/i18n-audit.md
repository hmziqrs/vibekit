---
name: i18n Implementation Audit
description: Detailed audit of i18n phase — claimed features vs actual implementation
type: project
---

# i18n Implementation Audit — 2026-05-15

## Claimed vs Actual

| Claimed Feature                       | Status                  | Details                                                                                                        |
| ------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| All user-facing strings extracted     | **FALSE**               | 83 keys exist but only 2 used (language switcher). All pages have hardcoded English.                           |
| RTL support verification              | **MINIMAL**             | HTML `dir="rtl"` is set, but zero CSS uses RTL-aware patterns. 15+ hardcoded directional classes break in RTL. |
| Plural rules                          | **INFRASTRUCTURE ONLY** | `Intl.PluralRules` available via paraglide, never called from app code.                                        |
| Date/number formatting per locale     | **COMPLETE**            | All 27 files with hardcoded formatting now use `formatDate`/`formatNumber` from `$lib/i18n.svelte`.            |
| Language switcher                     | **DONE**                | Component exists and imported in app/admin layouts sidebar. Moved from page body to navigation. |
| Missing translation detection         | **DONE**                | Script exists and runs in CI via `bun run i18n:check` in ci.yml. |
| Translation key linting               | **PARTIAL**             | Checks key parity, doesn't detect unused keys or hardcoded strings.                                            |
| ICU message format support            | **TRUE**                | Paraglide supports `{param}` syntax correctly.                                                                 |
| Translation workflow for contributors | **FALSE**               | No docs, no external platform, no guide for adding locales.                                                    |

## Critical Gaps

1. ~~**23+ hardcoded formatDate/formatNumber calls**~~ — **FIXED**. All 27 files now import and use `formatDate`/`formatNumber` from `$lib/i18n.svelte` instead of hardcoded `'en-US'` or browser-default locale.

2. **83 translation keys defined but unused** — Only `lang_en` and `lang_ur` are consumed. Nav, footer, CTAs, form labels, error messages all hardcoded.
   - **Fix**: Systematically replace hardcoded strings with `m.keyName()` calls.

3. ~~**RTL CSS completely absent**~~ — **FIXED**. `text-left` replaced with `text-start` across 75 instances in Svelte components. Logical margin classes (`ms-`/`me-`, 388 instances) already in place. `text-start` flips correctly in RTL layouts.

4. ~~**i18n check not in CI**~~ — **FIXED**. `bun run i18n:check` added to `.github/workflows/ci.yml`.

5. ~~**Language switcher placement**~~ — **FIXED**. Language switcher moved into both app and admin sidebar navigation components.

## Files

- `messages/en.json` / `messages/ur.json` — 83 translation keys
- `src/lib/i18n.svelte.ts` — Locale-aware formatDate/formatNumber (UNUSED)
- `src/lib/paraglide/` — Auto-generated runtime
- `src/lib/components/language-switcher.svelte` — Only consumer of translations
- `scripts/i18n-check.ts` — Validation script (NOT in CI)
