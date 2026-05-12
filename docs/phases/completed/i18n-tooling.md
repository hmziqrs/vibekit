# i18n Tooling — Implementation Plan

## What exists

- 75+ translation keys in en.json and ur.json
- Paraglide JS compiler with message format support
- Language switcher component

## What's needed

1. Translation key linting script (detect missing keys between locales)
2. Unused translation key detection
3. Translation validation script for CI
4. ICU message format already supported by Paraglide ({name} params)

## Files to Create

1. `scripts/i18n-check.ts` — lint translation files
2. `tests/unit/i18n-tooling.test.ts`

## Files to Modify

1. `package.json` — add i18n:check script
