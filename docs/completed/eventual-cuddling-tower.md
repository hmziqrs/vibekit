# Fix Image Block Backspace/Edit Behavior

## Context

For headings, todos, lists, and blockquotes, the rich input system provides clean editing: the prefix (`# `, `- `, `[ ] `, `> `) is visually hidden and backspace at the start of content strips the entire prefix cleanly. Image blocks (`![alt](url)`) don't have this polish:

1. **Backspace on a loaded image with a URL** — pressing backspace removes individual characters from the URL instead of clearing the whole URL at once. The user sees random bracket fragments.
2. **Backspace on an empty image block (`![]()`)** — pressing backspace should remove the entire `![]()` prefix cleanly (like how headings remove `# `), but instead characters are deleted one-by-one, leaving messy brackets.

The root cause: `block_prefix_len()` returns `line.len()` for image blocks (the entire line is "prefix"). The generic backspace check `cursor == line_start + prefix_len` can only match if the cursor is at the very end of the line. For images, the cursor is placed _inside_ the `()` (before the closing `)`) — never at `line_start + prefix_len`.

## Plan

Add image-specific backspace and delete handling in `state.rs`, following the same pattern used for other block types.

### Change 1: Special-case backspace on image blocks

**File:** `gpui-component/crates/ui/src/rich_input/state.rs` — `backspace()` method (~line 1359)

Before the generic prefix-stripping logic, add image block detection:

```
if cursor is on an image block line:
    get the image line text (e.g., "![alt](https://example.com/img.jpg)")
    find the URL range inside "( ... )"

    if the URL is non-empty AND the cursor is inside the URL area:
        clear the entire URL, leaving "![]()"
        place cursor inside the empty parentheses
        return

    if the URL is empty (line is "![alt]()" or "![]()"):
        delete the ENTIRE line (all of "![]()" or "![alt]()")
        convert to empty paragraph
        return
```

This mirrors how Enter on an empty todo `[ ]` strips the whole line, and how backspace on a heading at content start strips `# `.

### Change 2: Special-case delete (forward) on image blocks

**File:** `gpui-component/crates/ui/src/rich_input/state.rs` — `delete()` method (~line 1398)

Same logic as backspace but for forward deletion:

- If cursor is inside the URL area with a non-empty URL, clear the whole URL
- If URL is empty, remove the entire image block

### Change 3: Enter on empty image block cleans up

**File:** `gpui-component/crates/ui/src/rich_input/state.rs` — enter handler (~line 1594)

Currently images just insert `\n`. Add empty-image detection (same as the todo list pattern at line 1571-1592): if the image has an empty URL, remove the entire line instead of inserting a newline.

## Files to Modify

- `gpui-component/crates/ui/src/rich_input/state.rs`
  - `backspace()` — add image-specific branch (~line 1370)
  - `delete()` — add image-specific branch (~line 1398)
  - Enter handler in `on_action_enter()` — add empty image cleanup (~line 1594)

## Verification

1. Run the app with `cargo run`
2. Navigate to the Text Editor page
3. Test: Insert an image block via `/image`, paste a URL → image loads. Press backspace → the entire URL should be cleared at once, leaving `![]()`. Press backspace again → the entire `![]()` is removed, leaving an empty paragraph.
4. Test: Insert an image block, leave URL empty → `![]()`. Press backspace → entire line removed.
5. Test: Insert an image with URL. Place cursor inside URL text. Press Delete (forward) → entire URL cleared.
6. Test: Verify heading, todo, bullet list backspace still works correctly (regression check).
7. `cargo clippy -- --deny warnings` passes.
