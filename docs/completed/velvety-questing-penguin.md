# Phase 7+8 — Strip Code Editor UI & Final Cleanup

## Context

Phases 0-4 are complete. The `rich_input/` module has no LSP, no search, no syntax highlighting, no code folding. It still carries code-editor UI baggage: line numbers, indent guides, active line highlight, whitespace indicators, NumberInput, OtpInput, MaskPattern, and the CodeEditor mode variant itself.

Phase 7 strips all of these. Phase 8 does final dependency cleanup.

**Keeping:** Context menu (Cut/Copy/Paste/SelectAll) and clear button — these are general text editing features, not code-editor-specific. A rich text editor needs right-click support.

**Strict rule:** `cargo check` must pass after EVERY step.

---

## Step 1 — Remove CodeEditor variant from InputMode

**File:** `rich_input/mode.rs`

- [ ] Remove entire `CodeEditor` variant from `InputMode` enum
- [ ] Remove `code_editor()` constructor
- [ ] Remove `is_code_editor()` method
- [ ] Remove `has_indent_guides()` method
- [ ] Remove `line_number()` method
- [ ] Remove `language` and `indent_guides` from all match arms
- [ ] Remove `CodeEditor` arm from: `is_multi_line()`, `tab()`, `rows()`, `min_rows()`, `max_rows()`, `update_auto_grow()`
- [ ] Remove `test_code_editor` test
- [ ] `cargo check` — expected errors in many files

## Step 2 — Clean CodeEditor from state.rs

**File:** `rich_input/state.rs`

Remove methods:

- [ ] `code_editor()` builder (lines ~480-505)
- [ ] `line_number()` builder (lines ~523-528)
- [ ] `set_line_number()` setter (lines ~532-538)
- [ ] `set_indent_guides()` from indent.rs integration

Remove fields:

- [ ] `show_whitespaces: bool` (line ~331)
- [ ] `show_whitespaces: false` from constructor (line ~421)
- [ ] `WhitespaceIndicators` struct (lines ~241-247)

Remove call sites:

- [ ] All `is_code_editor()` branch conditions — simplify to single path
- [ ] `self.mode.is_code_editor()` in soft_wrap width calc (lines ~980, 1008) — remove CodeEditor branch
- [ ] `is_code_editor()` in indent behavior (line ~1216) — use single indent path
- [ ] `is_code_editor()` in edge scroll (line ~1452)
- [ ] `show_whitespaces` builder/setter (lines ~719-751)

Remove from imports:

- [ ] `WhitespaceIndicators` usage

Remove `code_editor` references from:

- [ ] `element.rs` — `is_code_editor()` checks (line ~557, ~1014)
- [ ] `input.rs` — editor background color branch (line ~293)
- [ ] `indent.rs` — `is_code_editor()` assertions in `indent_guides()`, `set_indent_guides()`, `tab_size()`

- [ ] `cargo check`

## Step 3 — Remove line number rendering from element.rs

**File:** `rich_input/element.rs`

- [ ] Remove `LINE_NUMBER_RIGHT_MARGIN` constant (line 22)
- [ ] Remove `layout_line_numbers()` method (lines ~525-563)
- [ ] Remove `line_numbers` field from `PrepaintState` (line ~724)
- [ ] Remove line number shaping/painting code (lines ~1078-1138 prepaint, ~1200-1322 paint)
- [ ] Remove `line_number_width` from all offset/scroll calculations — text starts at x=0
- [ ] Remove `LastLayout.line_number_width` field from state.rs
- [ ] Remove all `line_number_width` references in state.rs (mouse position, bounds, index_for_mouse_position, bounds_for_range_utf16)
- [ ] Remove `LINE_NUMBER_RIGHT_MARGIN` import from input.rs
- [ ] Remove `line_number_width` offset from input.rs double-click handler
- [ ] `cargo check`

## Step 4 — Remove indent guides

**File:** `rich_input/element.rs`

- [ ] Remove `indent_guides_path` field from `PrepaintState` (line ~732)
- [ ] Remove indent guide layout call in prepaint (line ~1128)
- [ ] Remove indent guide painting (lines ~1225-1227)

**File:** `rich_input/indent.rs`

- [ ] Remove `layout_indent_guides()` method
- [ ] Remove `indent_guides()` builder
- [ ] Remove `set_indent_guides()` setter
- [ ] `cargo check`

## Step 5 — Remove active line highlight

**File:** `rich_input/element.rs`

- [ ] Remove `current_row` field from `PrepaintState` (line ~730)
- [ ] Remove active line background painting (lines ~1196-1219)
- [ ] Remove `current_row` from `layout_cursor` return and all callers
- [ ] Keep `current_row` tracking in `layout_cursor` only if needed for line number highlight (which is being removed) — otherwise remove entirely
- [ ] `cargo check`

## Step 6 — Remove show whitespaces

**File:** `rich_input/state.rs`

- [ ] Remove `show_whitespaces` field, builder, setter
- [ ] Remove `WhitespaceIndicators` struct

**File:** `rich_input/element.rs`

- [ ] Remove `layout_whitespace_indicators()` method
- [ ] Remove whitespace indicator prepaint call
- [ ] Remove `WhitespaceIndicators` import

**File:** `rich_input/display_map/text_wrapper.rs`

- [ ] Remove `whitespace_indicators` and `whitespace_chars` from `LineLayout`
- [ ] Remove `with_whitespaces()` method
- [ ] Remove whitespace painting from `LineLayout::paint()`

- [ ] `cargo check`

## Step 7 — Delete NumberInput

- [ ] Delete `rich_input/number_input.rs`
- [ ] Remove `mod number_input;` from `mod.rs`
- [ ] Remove `pub use number_input::{...}` from `mod.rs`
- [ ] Remove `number_input::init(cx)` from `state.rs` init function
- [ ] `cargo check`

## Step 8 — Delete OtpInput

- [ ] Delete `rich_input/otp_input.rs`
- [ ] Remove `mod otp_input;` from `mod.rs`
- [ ] Remove `pub use otp_input::*` from `mod.rs`
- [ ] `cargo check`

## Step 9 — Delete MaskPattern

- [ ] Delete `rich_input/mask_pattern.rs`
- [ ] Remove `mod mask_pattern;` from `mod.rs`
- [ ] Remove `pub use mask_pattern::MaskPattern` from `mod.rs`

**File:** `rich_input/state.rs`

- [ ] Remove `masked: bool` field and constructor default
- [ ] Remove `masked()` builder and `set_masked()` setter
- [ ] Remove `mask_pattern: MaskPattern` field and constructor default
- [ ] Remove `mask_pattern()` builder and `set_mask_pattern()` setter
- [ ] Remove mask/unmask logic in text replacement and cursor position methods
- [ ] Remove `MaskPattern` import

**File:** `rich_input/element.rs`

- [ ] Remove `masked_display_offset()` function
- [ ] Remove masked cursor/selection offset conversion (lines ~96-99, ~446-448)
- [ ] Remove masked text rendering branch (line ~869)
- [ ] Remove masked byte offset conversion (lines ~894-902)
- [ ] Remove `MASK_CHAR` import if no longer needed

**File:** `rich_input/mod.rs`

- [ ] Remove `MASK_CHAR` constant if unused after element.rs cleanup

- [ ] `cargo check`

## Step 10 — Clean external consumers

**File:** `gpui-component/crates/story/examples/editor.rs`

- [ ] Remove `code_editor()` usage — switch to `multi_line(true)` or similar
- [ ] Remove `line_number`, `indent_guides`, `folding` fields and methods
- [ ] Remove line number button, indent guides button renderers
- [ ] Remove any `set_line_number`, `set_indent_guides` calls

**File:** `gpui-component/crates/story/src/stories/editor_story.rs`

- [ ] Remove `.code_editor("rust")` — switch to `multi_line(true)` or plain text

**File:** `gpui-component/crates/story/src/stories/input_story.rs`

- [ ] Remove `.code_editor("json")` usage
- [ ] Remove `.masked()` and `.mask_pattern()` usage
- [ ] Remove `MaskPattern` import

- [ ] `cargo check`

## Step 11 — Final cleanup (Phase 8)

- [ ] Run `cargo check` — fix all remaining warnings (unused imports, dead_code)
- [ ] Remove `language` field from CodeEditor (already gone if CodeEditor variant removed)
- [ ] Remove any remaining `#[allow(dead_code)]` that are no longer needed
- [ ] Clean up `rope_ext.rs` — remove `Point` re-export from tree_sitter if no longer needed by display_map (check `wrap_display_point_to_point` usage)
- [ ] Remove `display_map/README.md` references to removed features
- [ ] `cargo check` — zero errors, zero warnings

## Step 12 — Update docs/plan.md

- [ ] Mark Phase 7 as ✅ COMPLETE with notes about what was kept (context menu, clear button)
- [ ] Mark Phase 8 as ✅ COMPLETE
- [ ] Update "What's Left After Stripping" section to reflect current state
- [ ] Update Compilation Checkpoints Summary table
- [ ] Add note: "Context menu and clear button kept — general text editing features needed for rich text editor (Phase 9+)."

## Step 13 — Remove unused crate dependencies (Phase 8.1)

After all code removals, check if these can be removed from Cargo.toml:

- [ ] `aho-corasick` — only used by deleted search.rs
- [ ] Check if `tree-sitter` is still needed (may be used by `input/` module or display_map Point type)
- [ ] Check if `lsp-types` is still needed (may be used by `input/` module)
- [ ] Do NOT remove if still used by the original `input/` module
- [ ] `cargo check`

---

## Verification Checklist

- [ ] `cargo check` — zero errors, zero warnings
- [ ] `cargo run` — app opens without panic
- [ ] Editor page — renders RichInput, typing works
- [ ] Right-click — context menu appears with Cut/Copy/Paste/SelectAll
- [ ] No `CodeEditor`, `line_number`, `indent_guide`, `is_folding`, `show_whitespace`, `masked`, `MaskPattern`, `NumberInput`, `OtpInput` references remain in `rich_input/`
- [ ] `rich_input/number_input.rs` does not exist
- [ ] `rich_input/otp_input.rs` does not exist
- [ ] `rich_input/mask_pattern.rs` does not exist
- [ ] `InputMode` enum has only `PlainText` and `AutoGrow` variants

---

## Files Summary

| File                                     | Action                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `rich_input/mode.rs`                     | Remove CodeEditor variant, is_code_editor, line_number, has_indent_guides                                           |
| `rich_input/state.rs`                    | Remove CodeEditor builder, line_number, indent_guides, show_whitespaces, masked, mask_pattern, WhitespaceIndicators |
| `rich_input/element.rs`                  | Remove line numbers, indent guides, active line, whitespaces, masked rendering                                      |
| `rich_input/indent.rs`                   | Remove indent guide layout, indent_guides/set_indent_guides                                                         |
| `rich_input/input.rs`                    | Remove LINE_NUMBER_RIGHT_MARGIN, line_number_width, CodeEditor background, MaskPattern usage                        |
| `rich_input/display_map/text_wrapper.rs` | Remove whitespace indicators from LineLayout                                                                        |
| `rich_input/number_input.rs`             | DELETE                                                                                                              |
| `rich_input/otp_input.rs`                | DELETE                                                                                                              |
| `rich_input/mask_pattern.rs`             | DELETE                                                                                                              |
| `rich_input/mod.rs`                      | Remove deleted module declarations and re-exports, remove MASK_CHAR                                                 |
| `story/examples/editor.rs`               | Replace code_editor with multi_line, remove buttons                                                                 |
| `story/src/stories/editor_story.rs`      | Replace code_editor with multi_line                                                                                 |
| `story/src/stories/input_story.rs`       | Remove code_editor, masked, mask_pattern usage                                                                      |
| `docs/plan.md`                           | Update phase status                                                                                                 |

**NOT deleted (kept for Phase 9+):**

- `rich_input/popovers/` — context menu (Cut/Copy/Paste/SelectAll)
- `rich_input/clear_button.rs` — clear X button
