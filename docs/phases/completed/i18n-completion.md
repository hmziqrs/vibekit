# i18n Completion — Implementation Plan

## What exists

- Paraglide JS with en/ur locales (2 locales)
- Server middleware fully wired (hooks.server.ts)
- RTL support for Urdu (getTextDirection)
- Cookie-based locale strategy
- Hidden locale switcher links in root layout
- 1 translation key: hello_world (placeholder)

## What's needed

1. Extract key UI strings to messages/en.json and messages/ur.json
2. Create visible language switcher component
3. Create formatting utility wrapping Paraglide registry
4. Add plural rules examples
5. Wire translation functions into public pages and app layout

## Files to Create

1. `src/lib/components/language-switcher.svelte` — visible language switcher
2. `src/lib/i18n.svelte.ts` — formatting utilities (date, number, plural)

## Files to Modify

1. `messages/en.json` — add UI string translations
2. `messages/ur.json` — add Urdu translations
3. `src/routes/+layout.svelte` — replace hidden links with visible switcher
