# Plan: Interactive Column Resize Dragging for Table Blocks

## Context

Phase 13 (Tables) is complete except for interactive column resize. The scaffolding exists — 8px resize handles at column boundaries, hover detection, cursor style, and visual highlight — but there's no drag-to-resize wiring. Column widths are currently recomputed from content every frame during prepaint, with no persistence. This plan adds the full drag lifecycle and persists user-customized widths.

## Files to Modify

- `gpui-component/crates/ui/src/rich_input/state.rs` — new state fields, drag lifecycle, mouse-down hit-test, escape handling, width invalidation
- `gpui-component/crates/ui/src/rich_input/element.rs` — mouse-move/up listeners, prepaint user-width override, paint-time drag feedback, cursor during drag

## Steps

### 1. Add `ColumnResizeState` struct (state.rs, after line 583)

```rust
#[derive(Clone, Debug)]
pub struct ColumnResizeState {
    pub table_header_line: usize,
    pub left_col: u32,
    pub right_col: u32,
    pub start_mouse_x: Pixels,
    pub left_col_start_width: Pixels,
    pub right_col_start_width: Pixels,
    /// Snapshot of user widths before drag (for cancel revert).
    pub pre_drag_widths: Option<Vec<Pixels>>,
}
```

### 2. Add state fields (state.rs, after line 566)

```rust
pub(super) column_resize_state: Option<ColumnResizeState>,
pub(super) user_col_widths: HashMap<usize, Vec<Pixels>>,
```

Initialize both in `new()` (after line 672): `None` and `HashMap::new()`.

### 3. Drag lifecycle methods (state.rs, after `finish_drag` ~line 3668)

- **`start_column_resize(handle, mouse_x, col_widths, cx)`** — saves `ColumnResizeState` with start widths and a `pre_drag_widths` snapshot of the current `user_col_widths` entry (for cancel revert).
- **`update_column_resize(mouse_x, cx)`** — computes `delta = mouse_x - start_mouse_x`, sets `new_left = (left_start + delta).clamp(MIN, MAX)`, `new_right = (right_start - delta).clamp(MIN, MAX)`. If one side hits MIN, the other absorbs the remainder (`total - MIN`). Writes to `user_col_widths[header_line]`.
- **`finish_column_resize(cx)`** — clears `column_resize_state`. Widths are already in `user_col_widths`.
- **`cancel_column_resize(cx)`** — restores `pre_drag_widths` snapshot to `user_col_widths`, then clears state.
- **`invalidate_user_col_widths(header_line)`** — removes the entry from `user_col_widths`. Called from table mutation methods (insert/delete row/column).

### 4. Resize handle hit-test in `on_mouse_down` (state.rs, after line 2786)

Add check for `column_resize_handles` before the image block check. On hit, look up current widths from `user_col_widths` (or equal distribution as fallback), call `start_column_resize`, and return.

### 5. Escape handling (state.rs, after line 2721)

Add `if self.column_resize_state.is_some() { self.cancel_column_resize(cx); return; }` before the slash_active check.

### 6. Invalidate user widths on structural changes (state.rs)

Call `self.invalidate_user_col_widths(layout.header_line)` at the top of each table mutation method:

- `insert_table_row_above`, `insert_table_row_below`, `delete_table_row`
- `insert_table_column_left`, `insert_table_column_right`, `delete_table_column`

Row insert/delete don't change column count but do change table dimensions. Only column mutations truly need invalidation, but clearing on row changes too is safe and simple.

### 7. Mouse-move listener (element.rs, lines 56-82)

At the top of the `MouseMoveEvent` handler, check `column_resize_state.is_some()` first. If active, call `update_column_resize(event.position.x, cx)` and return early (skip block drag and text selection). Also skip the column resize hover tracking while actively dragging to avoid flicker.

### 8. Mouse-up listener (element.rs, lines 158-167)

Add `column_resize_state.is_some()` check before the `drag_state` check. If active, call `finish_column_resize(cx)` and return.

### 9. Prepaint: use user widths when available (element.rs, lines 1327-1387)

Before the content-based width computation, check `state.read(cx).user_col_widths.get(&buffer_line)`. If an entry exists and its length matches `cols`, use it (with the same clamp + scale-to-fit-table-width logic). Otherwise fall through to existing content-based computation.

### 10. Paint: drag visual feedback (element.rs, lines 2030-2052)

During active drag, paint a 2px guide line at the current left-column right edge (computed from `user_col_widths`), instead of the static hovered-handle highlight. Outside drag, keep existing hover behavior.

### 11. Cursor style during drag (element.rs, line 1867)

Expand the condition: `column_resize_state.is_some() || column_resize_hovered.is_some()`.

## Verification

1. `cargo check` — compiles clean
2. `cargo test -p gpui-component` — all existing tests pass
3. Manual testing:
   - Hover over a column boundary → cursor changes to `ResizeLeftRight`, 2px highlight appears
   - Click and drag → column widths update live, guide line follows
   - Release mouse → widths persist, survive typing in cells
   - Press Escape during drag → reverts to pre-drag widths
   - Insert/delete column → user widths cleared, reverts to content-based
   - Insert/delete row → user widths cleared, reverts to content-based
   - Multiple tables → resizing one doesn't affect others
