# Keyboard Navigation — Implementation Plan

## What exists

- Search dialog with full keyboard nav (arrow keys, enter, escape)
- ConfirmDialog with Escape key handling
- Mobile menu with Escape close
- Cmd+K shortcut for search
- SkipLink component

## What's needed

1. Focus trap utility for modals
2. Keyboard shortcuts help panel (? or Cmd+/)
3. Shortcut registry for collision detection
4. Roving tabindex utility for lists

## Files to Create

1. `src/lib/keyboard.svelte.ts` — focus trap, roving tabindex, shortcut registry
2. `src/lib/components/shortcuts-help.svelte` — keyboard shortcuts overlay
3. `tests/unit/keyboard-navigation.test.ts`

## Files to Modify

1. `src/routes/(app)/+layout.svelte` — add shortcuts help trigger
