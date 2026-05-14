# Phase 11 — Image Rendering: Detailed Implementation Plan

## Context

The rich text editor needs image support — both remote (URLs) and local (file paths) — with multiple rendering modes (Cover, Contain, Fill, ScaleDown, None). GPUI provides native `img(source)` with `ObjectFit` support, so we don't need an image decoding library.

**Core challenge**: `img()` is an Element, not a paint primitive. It can only be created in `render()`, not in `RichTextElement::paint()`. The solution: compute image positions in `prepaint()`, save to state, render `img()` as absolutely positioned children in `RichInputState::render()`.

---

## Sub-Phase 11.1 — Image Block Type & Detection

**File:** `gpui-component/crates/ui/src/rich_input/block.rs`

- Add `Image` variant to `BlockType`:
  ```rust
  Image {
      url: String,
      alt: String,
      object_fit: ObjectFit, // gpui::ObjectFit (Cover, Contain, Fill, ScaleDown, None)
      width: Option<Pixels>,
      height: Option<Pixels>,
  }
  ```
- Add `use gpui::{ObjectFit, Pixels};` import
- Update `detect_block_type()` — parse `![alt](url)` before the final `None` return
- Update `block_prefix_len()` — return `line.len()` for image lines (hide entire text, like Divider)
- Add `BlockType::Image` case to all match arms in `block.rs` (Clone, Debug, PartialEq, Hash derives)
- **Verify:** `cargo check`

---

## Sub-Phase 11.2 — Image State Fields & Methods

**Files:** `state.rs`, `block.rs`

- Add `ImageBlockInfo` struct:
  ```rust
  #[derive(Clone, Debug)]
  pub struct ImageBlockInfo {
      pub bounds: Bounds<Pixels>,
      pub buffer_line: usize,
      pub url: String,
      pub alt: String,
      pub object_fit: ObjectFit,
  }
  ```
- Add fields to `RichInputState`:
  - `image_block_bounds: Vec<ImageBlockInfo>` — cached positions from last layout
  - `selected_image_line: Option<usize>` — currently selected image block
- Add methods to `RichInputState`:
  - `insert_image(url, alt, window, cx)` — replace current block with `![alt](url)` text
  - `set_image_object_fit(buffer_line, object_fit, window, cx)` — change ObjectFit for an image
- Update `block_type_prefix()` in `state.rs` — `BlockType::Image { .. } => String::new()`
- Update `enter()` — image blocks behave like Divider (Enter creates new paragraph below)
- **Verify:** `cargo check`

---

## Sub-Phase 11.3 — Image Height in Line Layout

**File:** `element.rs`

- Add constants: `IMAGE_DEFAULT_HEIGHT: Pixels = px(200.)`, `IMAGE_CAPTION_HEIGHT: Pixels = px(28.)`
- In `layout_lines()`, handle `BlockType::Image` like Divider (hide entire line text):
  - Image lines get `(font_size, false, line_text.len())` for `(line_font_size, heading_bold, hide_prefix_len)`
  - Instead of shaping text, create N zero-width empty shaped lines to fill the image height
  - Height = `width.unwrap_or(IMAGE_DEFAULT_HEIGHT) + IMAGE_CAPTION_HEIGHT`, divided into `line_height`-sized rows
  - This reuses existing scroll/cursor/selection math — image occupies N virtual "lines"
- **Verify:** `cargo check`

---

## Sub-Phase 11.4 — Image Position Computation in Prepaint

**File:** `element.rs`

- Add `image_blocks: Vec<ImageBlockInfo>` to `PrepaintState`
- In `prepaint()`, after existing block decoration loop, compute image positions:
  - For each visible line that is `BlockType::Image`, compute bounds using `vi_y_offsets` + `bounds.origin`
  - Image width = content width (full), height from block metadata or `IMAGE_DEFAULT_HEIGHT`
- In `paint()`, save `prepaint.image_blocks` to `self.state.image_block_bounds` (same pattern as checkboxes)
- Paint image placeholder (rounded rect with muted background) so there's visual space even before `img()` loads
- **Verify:** `cargo check`

---

## Sub-Phase 11.5 — Image Rendering in RichInputState::render()

**File:** `state.rs`

- Add imports: `use gpui::{img, ObjectFit};`
- In `RichInputState::render()`, add image `img()` children after `RichTextElement`:
  ```rust
  .when(last_bounds.is_some(), |this| {
      let origin = last_bounds.unwrap().origin;
      // For each image_block_bounds entry:
      //   div().absolute()
      //     .left(img_bounds.origin.x - origin.x)
      //     .top(img_bounds.origin.y - origin.y)
      //     .w(img_bounds.size.width)
      //     .h(img_bounds.size.height)
      //     .overflow_hidden()
      //     .rounded(px(4.))
      //     .child(img(url).object_fit(object_fit).size_full())
      //     .child(caption div with alt text below)
  })
  ```
- Caption: a small text row below each image showing `alt` text in muted foreground
- **Verify:** `cargo check`, `cargo run` — type `![hello](https://example.com/image.png)` and see image render

---

## Sub-Phase 11.6 — Image Interaction (Select, Context Menu, ObjectFit Switcher)

**Files:** `state.rs`, `popovers/context_menu.rs`

- In `on_mouse_down()`: check if click landed on an image block's bounds → set `selected_image_line`, move cursor there
- In `paint()`: paint selection highlight (2px primary-color border) around selected image
- In context menu: when right-clicking an image block, add ObjectFit submenu items:
  - "Fit (Contain)", "Fill (Cover)", "Stretch (Fill)", "Original (None)", "Scale Down"
- Each option calls `set_image_object_fit()` on the state
- **Verify:** `cargo check`, `cargo run` — click image to select, right-click for ObjectFit options

---

## Sub-Phase 11.7 — Slash Commands & Paste

**Files:** `slash_command.rs`, `state.rs`

- Add slash commands:
  - `/image` — inserts `![]()` with cursor inside parentheses (user types URL)
  - `/cover` — inserts image block with `ObjectFit::Cover`, height 300px
  - `/contain` — inserts image block with `ObjectFit::Contain`, default height
- When `/image` executes and URL is empty, render a dashed-border placeholder with "Paste or type image URL" text
- Paste: if clipboard contains text matching a URL pattern ending in image extension, auto-insert as image block
- Full clipboard image paste deferred (depends on GPUI ClipboardItem image API)
- **Verify:** `cargo check`, `cargo run` — `/image` inserts image block, type URL to load

---

## Sub-Phase 11.8 — Serialization & Tests

**File:** `serializer.rs`

- `to_markdown()` already returns raw rope text — `![alt](url)` is already valid Markdown, no changes needed
- `from_markdown()` calls `BlockMap::rebuild()` which calls `detect_block_type()` — images auto-detected after 11.1
- Add tests:
  - `test_from_markdown_image` — single image block detected
  - `test_roundtrip_image` — image survives import/export
  - `test_image_with_heading_and_paragraph` — mixed blocks
- Add `BlockType::Image` to toolbar block type dropdown in `text_editor_page.rs`
- **Verify:** `cargo check`, `cargo test -p gpui-component`

---

## Compilation Checkpoints

| Step | Description                   | Verify                      |
| ---- | ----------------------------- | --------------------------- |
| 11.1 | BlockType::Image + detection  | `cargo check`               |
| 11.2 | Image state fields & methods  | `cargo check`               |
| 11.3 | Image height in layout        | `cargo check`               |
| 11.4 | Image positions in prepaint   | `cargo check`               |
| 11.5 | img() rendering in render()   | `cargo check` + `cargo run` |
| 11.6 | Click select + ObjectFit menu | `cargo check` + `cargo run` |
| 11.7 | Slash commands + paste        | `cargo check` + `cargo run` |
| 11.8 | Serialization + tests         | `cargo test`                |

## Key Files

| File                            | Changes                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `rich_input/block.rs`           | `BlockType::Image`, `detect_block_type`, `block_prefix_len`                   |
| `rich_input/state.rs`           | `ImageBlockInfo`, state fields, `render()` with `img()`, interaction handlers |
| `rich_input/element.rs`         | Image height layout, prepaint positions, paint placeholder + selection        |
| `rich_input/slash_command.rs`   | `/image`, `/cover`, `/contain` commands                                       |
| `rich_input/serializer.rs`      | Image roundtrip tests                                                         |
| `src/views/text_editor_page.rs` | Image block type in toolbar dropdown                                          |
