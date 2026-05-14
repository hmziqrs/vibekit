# Plan: Auto-fix lint issues

## Context

The project has 2,117 lint issues. Many are auto-fixable by oxlint. We'll run the auto-fixer first, then assess what remains.

## Steps

1. **Run `bun run lint:fix`** — auto-fixes what oxlint can handle (sort-imports, sort-keys, consistent-type-specifier-style, etc.)
2. **Run `bun run format`** — reformat with oxfmt to ensure style consistency after fixes
3. **Re-run `bun run lint`** — count remaining issues and report
4. **Identify unfixable issues** — categorize what's left (Svelte false positives, rules needing manual fixes, rules that should be disabled)

## Expected outcomes

- Sort imports/keys, import style, and formatting fixes should resolve ~300-400 issues
- Svelte-related false positives (`jest/require-hook`, `prefer-const` on `$bindable`) will remain — these are oxlint limitations, not real issues
- Some rules may warrant config changes (e.g. `no-ternary`, `no-magic-numbers` are very noisy)

## Verification

- `bun run lint` to count remaining issues
- `bun run check` to ensure no type errors were introduced
- `bun run test` to verify nothing broke
