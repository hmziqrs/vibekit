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
| Language switcher                     | **PARTIAL**             | Component exists but placed at bottom of page body outside main content.                                       |
| Missing translation detection         | **PARTIAL**             | Script exists, works, but NOT in CI pipeline.                                                                  |
| Translation key linting               | **PARTIAL**             | Checks key parity, doesn't detect unused keys or hardcoded strings.                                            |
| ICU message format support            | **TRUE**                | Paraglide supports `{param}` syntax correctly.                                                                 |
| Translation workflow for contributors | **FALSE**               | No docs, no external platform, no guide for adding locales.                                                    |

## Critical Gaps

1. ~~**23+ hardcoded formatDate/formatNumber calls**~~ — **FIXED**. All 27 files now import and use `formatDate`/`formatNumber` from `$lib/i18n.svelte` instead of hardcoded `'en-US'` or browser-default locale.

2. **83 translation keys defined but unused** — Only `lang_en` and `lang_ur` are consumed. Nav, footer, CTAs, form labels, error messages all hardcoded.
   - **Fix**: Systematically replace hardcoded strings with `m.keyName()` calls.

3. **RTL CSS completely absent** — No `rtl:` Tailwind modifiers, no logical properties. Dropdowns and padding break in Urdu.
   - **Fix**: Replace `ml-`/`mr-` with `ms-`/`me-`, `text-left` with `text-start`, `right-0` with `end-0`.

4. **i18n check not in CI** — Script runs locally but never in GitHub Actions.
   - **Fix**: Add `bun run i18n:check` to CI workflow.

5. **Language switcher placement** — Hidden at bottom of body, not in navigation.
   - **Fix**: Move into nav component.

## Files

- `messages/en.json` / `messages/ur.json` — 83 translation keys
- `src/lib/i18n.svelte.ts` — Locale-aware formatDate/formatNumber (UNUSED)
- `src/lib/paraglide/` — Auto-generated runtime
- `src/lib/components/language-switcher.svelte` — Only consumer of translations
- `scripts/i18n-check.ts` — Validation script (NOT in CI)
