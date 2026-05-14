# Replace Custom-Painted Slash Menu with Native GPUI `List` Component

## Context

The slash command menu in the rich text editor (`element.rs` lines 1540-1691) is entirely custom-painted using `window.paint_quad()` and `window.text_system().shape_line()`. This gives no window-edge snapping, requires manual scrollbar painting, manual hit-testing, and manual keyboard handling. The codebase already has a proven pattern — the completion menu in `input/popovers/completion_menu.rs` — that uses `List` + `deferred(anchored())` to solve the same problem with native GPUI components.

## Approach

Replace the custom-painted slash command menu with a `List` component wrapped in `deferred(anchored())`, following the existing completion menu pattern.

## Files to Modify

### 1. Create `slash_menu.rs` — new popover entity

**Path:** `gpui-component/crates/ui/src/rich_input/popovers/slash_menu.rs`

Create a `SlashMenu` entity (similar to `CompletionMenu` in `input/popovers/completion_menu.rs`):

- Define a `SlashMenuDelegate` implementing `ListDelegate` to provide slash command items
- Handle keyboard navigation (up/down/enter/escape) via `List` built-ins
- Handle item selection to execute the slash command
- Render via `Render` trait using `deferred(anchored().snap_to_window_with_margin(px(8.)).position(cursor_position))` with `editor_popover()` styling
- Support scrollable list with max visible items (8)

### 2. Update `mod.rs` — register the new module

**Path:** `gpui-component/crates/ui/src/rich_input/popovers/mod.rs`

- Add `pub mod slash_menu;`
- Re-export `SlashMenu`

### 3. Update `state.rs` — integrate SlashMenu entity

**Path:** `gpui-component/crates/ui/src/rich_input/state.rs`

- Add `slash_menu: Entity<SlashMenu>` field to `RichInputState`
- Initialize in `new()`
- Remove manual slash menu keyboard handling (arrow up/down/enter/escape for slash menu)
- Remove manual scroll offset tracking (`slash_scroll_offset`)
- Remove `slash_menu_bounds` hit-testing field
- Keep the slash command filtering logic (filtering commands as user types)
- Wire slash menu open/close/selection to the new entity

### 4. Update `element.rs` — remove custom paint, position via anchor

**Path:** `gpui-component/crates/ui/src/rich_input/element.rs`

- Remove all custom painting code for slash menu (lines ~1540-1691)
- Remove shadow quad, background quad, border quad, item text, scrollbar painting
- Remove `slash_menu_bounds` caching
- Keep cursor position computation — pass it to `SlashMenu` for anchoring
- Keep image block painting untouched

### 5. Update `Render` impl in `state.rs` — render SlashMenu as child

**Path:** `gpui-component/crates/ui/src/rich_input/state.rs`

- When slash menu is open, include `slash_menu` entity as a child of the rich input container (deferred + anchored pattern)

## Reference Files

- `gpui-component/crates/ui/src/input/popovers/completion_menu.rs` — primary pattern to follow
- `gpui-component/crates/ui/src/input/popovers/mod.rs` — `editor_popover()` helper
- `gpui-component/crates/ui/src/rich_input/popovers/context_menu.rs` — `Render` + `deferred(anchored())` pattern
- `gpui-component/crates/ui/src/list/list.rs` — `List` component API
- `gpui-component/crates/ui/src/rich_input/slash_command.rs` — `SlashCommand` data type

## Verification

1. Run `cargo build` to verify compilation
2. Run the app, open the rich text editor
3. Type `/` to trigger the slash menu — verify it appears below cursor
4. Type to filter commands — verify filtering works
5. Use arrow keys to navigate — verify selection highlighting
6. Press Enter to select — verify command executes
7. Press Escape to dismiss — verify menu closes
8. Test with cursor near bottom of window — verify menu flips above cursor (window-edge snapping)
9. Test with many commands — verify scrolling works
10. Click a command — verify selection works
11. Verify right-click context menu still works (unaffected)
12. Verify image blocks still render correctly (unaffected)
