# Phase 1 — Block-Based Rich Text Editor

## Context

We're building a Notion-like rich text editor for the Torii app. The current `src/editor/` module is a broken stub (`pub mod input` references a missing file). The build also fails because `Cargo.toml` is missing `[workspace.package]` section needed by gpui-component's `edition.workspace = true`.

Phase 1 goal: Get a working multi-block editor on screen where each block is a single-line `InputState`, Enter splits blocks, and arrow keys navigate between blocks.

**Key insight**: In single-line mode, `Input` does NOT register `MoveUp`/`MoveDown` action handlers (gated by `mode.is_multi_line()` at `input.rs:344`). These unhandled actions will bubble up to our container where we intercept them.

## Steps

### 1. Fix Cargo.toml

**File**: `Cargo.toml`

Add `[workspace.package]` with `edition = "2024"` (required by gpui-component's `edition.workspace = true`).

### 2. Rewrite `src/editor/mod.rs`

Remove broken `pub mod input`. Add `block` and `document` modules. Export `RichDocument`, `Block`, `BlockType`, `BlockId`.

### 3. Create `src/editor/block.rs`

Define types:

- `BlockId(usize)` — unique identifier
- `BlockType` — enum with `Paragraph` default (placeholders for future types)
- `Block` — holds `id: BlockId`, `block_type: BlockType`, `state: Entity<InputState>`

Helper constructors:

- `Block::new_paragraph(id, window, cx)` — empty single-line InputState
- `Block::new_paragraph_with_value(id, value, window, cx)` — pre-filled via `default_value()`

### 4. Create `src/editor/document.rs`

Core entity — `RichDocument`:

- **Fields**: `blocks: Vec<Block>`, `focus_handle`, `next_block_id`, `active_block_index`, `pending_ops: Vec<PendingOp>`, `_subscriptions`
- **Constructor**: Creates one empty paragraph block, subscribes to its events
- **Block management**: `append_block`, `insert_block_at`, `focus_block`
- **Event handling**: Subscribe to each block's `InputEvent`
  - `PressEnter` → queue `PendingOp::Split(index)`, call `cx.notify()`
  - `Focus` → update `active_block_index`
- **Pending ops**: Processed at start of `render()` (where `Window` is available)
  - `Split(index)` → read cursor pos, split text at cursor, `set_value` on current block, create new block with text after cursor, focus new block
- **Navigation**: `on_action` handlers for `MoveUp`/`MoveDown` on the container
  - `MoveUp` when cursor at position 0 → focus previous block
  - `MoveDown` when cursor at end → focus next block
- **Render**: Vertical list of blocks, each rendered as `Input::new(&state).appearance(false).bordered(false)`. Container has `.key_context("Input")` so MoveUp/MoveDown actions are matched and our `on_action` handlers intercept them.

### 5. Create `src/views/editor_page.rs`

Simple page wrapping an `Entity<RichDocument>`.

### 6. Update `src/views/mod.rs`

Add `mod editor_page` and `pub use editor_page::EditorPage`.

### 7. Update `src/sidebar.rs`

Add `Page::Editor` variant (icon: `IconName::FileText`, title: "Editor").

### 8. Update `src/root.rs`

Add `editor_page: Entity<EditorPage>` field to `AppRoot`, create in `new()`, handle in `active_page_view()`.

## Files to create/modify

| Action  | File                       |
| ------- | -------------------------- |
| Edit    | `Cargo.toml`               |
| Rewrite | `src/editor/mod.rs`        |
| Create  | `src/editor/block.rs`      |
| Create  | `src/editor/document.rs`   |
| Create  | `src/views/editor_page.rs` |
| Edit    | `src/views/mod.rs`         |
| Edit    | `src/sidebar.rs`           |
| Edit    | `src/root.rs`              |

## Verification

```bash
cargo build
```

Then run the app, navigate to the "Editor" page in the sidebar, and verify:

1. An empty text block appears, focusable and editable
2. Pressing Enter splits the text at cursor into two blocks
3. Pressing Up arrow at position 0 moves focus to the previous block
4. Pressing Down arrow at end of text moves focus to the next block
