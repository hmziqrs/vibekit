# Plan: Clean Up Copied Input Module & Compile

## Context

We copied the entire `gpui_component::input` folder into `src/editor/input/` to bypass `pub(crate)` restrictions and have full control over the editor code for evolving into a rich text editor. The `use crate::input::` references have been fixed. Now we need to:

1. Fix remaining `use crate::` references (pointing to gpui_component types)
2. Add missing crate dependencies
3. Get it compiling
4. Then strip features we don't need (LSP, search, diagnostics, etc.)

---

## Step 1: Delete old plan

Delete `docs/phase-1-foundation.md`

## Step 2: Add missing crates to Cargo.toml

```
aho-corasick = "1"
tree-sitter = "0.24"
lsp-types = "0.97"
```

`lsp-types` may already be present — verify before adding.

## Step 3: Fix remaining `use crate::` → `gpui_component::`

12 files still have `use crate::` pointing to gpui_component sibling modules. Each needs `crate::` replaced with `gpui_component::`. Files:

| File                             | What it imports                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `input.rs`                       | `button`, `menu`, `scroll`, `spinner`, `ActiveTheme`, `Colorize`, `v_flex`, `IconName`, `Size`, `Selectable`, `StyledExt`, `h_flex`, `Sizable`, `StyleSized`       |
| `element.rs`                     | `ActiveTheme`, `Colorize`, `IconName`, `Root`, `Selectable`, `Sizable`, `Button`, `ButtonVariants`, `RopeExt`, `CURSOR_WIDTH`, `LineLayout`                        |
| `clear_button.rs`                | `Button`, `ButtonVariants`, `ActiveTheme`, `Icon`, `IconName`, `Sizable`                                                                                           |
| `number_input.rs`                | `ActiveTheme`, `Disableable`, `IconName`, `Sizable`, `Size`, `StyledExt`, `Button`, `h_flex`                                                                       |
| `otp_input.rs`                   | `ActiveTheme`, `Disableable`, `Icon`, `IconName`, `Sizable`, `Size`, `h_flex`, `v_flex`                                                                            |
| `indent.rs`                      | `RopeExt`, `Indent`, `IndentInline`, `InputState`, `LastLayout`, `Outdent`, `OutdentInline`, `TextElement`, `InputMode`                                            |
| `search.rs`                      | `ActiveTheme`, `Disableable`, `ElementExt`, `IconName`, `Selectable`, `Sizable`, `SelectUp`, `Button`, `ButtonVariants`, `h_flex`, `Label`, `v_flex` + input types |
| `popovers/completion_menu.rs`    | `ActiveTheme`, `IndexPath`, `Selectable`, `actions`, `h_flex`, `Label`, `List`, `ListDelegate`, `ListEvent`, `ListState`                                           |
| `popovers/context_menu.rs`       | `ActiveTheme`, `GlobalState`, `PopupMenu`                                                                                                                          |
| `popovers/code_action_menu.rs`   | `ActiveTheme`, `IndexPath`, `Selectable`, `actions`, `h_flex`, `List` types                                                                                        |
| `popovers/hover_popover.rs`      | `StyledExt`                                                                                                                                                        |
| `popovers/diagnostic_popover.rs` | `DiagnosticEntry`                                                                                                                                                  |
| `popovers/mod.rs`                | `ActiveTheme`, `StyledExt`, `TextView`, `TextViewStyle`                                                                                                            |
| `state.rs` L2540                 | `theme::Theme`                                                                                                                                                     |
| `state.rs` L2576                 | `highlighter::HighlightTheme`                                                                                                                                      |
| `mode.rs` L327                   | `highlighter::DiagnosticSet`, input types                                                                                                                          |

**Key pattern:** `use crate::` → `use gpui_component::` for cross-crate types.

For mixed blocks like `indent.rs` and `search.rs` that combine `crate::` root imports with `crate::input::` imports, split into separate lines:

- `use gpui_component::{...}` for crate-root types
- `use super::{...}` for input-internal types (already done for `crate::input::`)

## Step 4: Fix `element.rs` mixed import block

`element.rs` has both `crate::` root imports AND `crate::input::` in the same block. The `crate::input::` parts need `super::`:

```rust
// Before:
use crate::{
    ActiveTheme as _, Colorize, IconName, Root, Selectable, Sizable as _,
    button::{Button, ButtonVariants as _},
    input::{RopeExt as _, blink_cursor::CURSOR_WIDTH, display_map::LineLayout},
};

// After:
use gpui_component::{ActiveTheme as _, Colorize, IconName, Selectable, Sizable as _, button::{Button, ButtonVariants as _}};
use gpui::Root;
use super::{RopeExt as _, display_map::LineLayout};
use super::blink_cursor::CURSOR_WIDTH;
```

## Step 5: Run `cargo build`, fix iteratively

Expected remaining issues:

- `Root` — might be `gpui::Root` not `gpui_component::Root`
- `History` import in `state.rs` — already fixed to `gpui_component::{Root, history::History}`
- Any type mismatches from version differences

## Step 6: Verify compilation

Run `cargo build` and confirm zero errors.

---

## Files to modify

1. **Delete:** `docs/phase-1-foundation.md`
2. **Edit:** `Cargo.toml` — add missing deps
3. **Edit:** 12 files in `src/editor/input/` — fix `use crate::` references
4. **Edit:** `src/editor/input/state.rs` — fix remaining test imports

## Verification

```bash
cargo build
```

Should compile with zero errors (warnings acceptable for now).
