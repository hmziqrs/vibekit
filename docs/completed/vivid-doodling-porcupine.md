# Link Popover: Hover-based View, URL Validation, Positioning Fix

## Context

The link popover currently shows the View popover based on cursor position (caret-based). The user wants:

1. **URL validation** — only allow proper URLs (https://, http://, and native app schemes like mailto:, tel:, etc.), reject plain text
2. **Hover-based View popover** — show the View popover when the mouse hovers over a link, not when the caret moves onto one
3. **Fix popover positioning** — the popover currently uses cursor_bounds which may be stale/wrong; for hover we should position it relative to the hovered link region

## Files to modify

1. `crates/ui/src/rich_input/state.rs` — URL validation, hover-based popover trigger, remove caret-based trigger
2. `crates/ui/src/rich_input/element.rs` — mouse-move hover detection to show View popover
3. `crates/ui/src/rich_input/popovers/link_popover.rs` — show_view positioning, URL validation error state
4. `crates/ui/src/rich_input/movement.rs` — remove `update_link_popover` call from `move_to`

## Changes

### 1. Add URL validation function (`state.rs`)

Add a simple validation function (no external crate needed):

```rust
fn is_valid_link_url(url: &str) -> bool {
    let url = url.trim();
    if url.is_empty() {
        return false;
    }
    // Allow http://, https://, and any scheme with :// (deep links)
    url.starts_with("https://")
        || url.starts_with("http://")
        || url.contains("://")
}
```

Use it in both confirm paths:

- `LinkPopover::confirm()` — reject invalid URLs, keep popover open
- `RichInputState::enter()` (the Enter-key handler) — reject invalid URLs, keep popover open

### 2. Switch View popover from caret-based to hover-based

**Remove caret-based trigger** (`movement.rs:56`):

- Remove the `self.update_link_popover(window, cx)` call from `move_to()`

**Remove `update_link_popover` method** (`state.rs:950-986`):

- This method is no longer needed since View popover is now hover-based

**Add hover-based popover trigger** (`element.rs` — `paint_mouse_listeners`):
In the `MouseMoveEvent` handler, where we already track `link_hovered`, also detect which specific link region is hovered and show the View popover:

```rust
// Track link hover state for cursor + View popover
let hovered_region = state
    .read(cx)
    .link_hit_regions
    .iter()
    .find(|region| region.bounds.contains(&event.position))
    .cloned();
state.update(cx, |state, cx| {
    let is_hovering = hovered_region.is_some();
    if state.link_hovered != is_hovering {
        state.link_hovered = is_hovering;
    }
    // Show/hide View popover based on hover
    if let Some(region) = &hovered_region {
        let popover = state.link_popover.read(cx);
        let already_open = popover.is_open()
            && popover.link_range().map_or(false, |r| r == &region.byte_range);
        if !already_open && !state.link_popover_dismissed {
            // Position popover below the link region
            let pos = Point::new(
                region.bounds.origin.x,
                region.bounds.origin.y + region.bounds.size.height,
            );
            state.link_popover.update(cx, |popover, cx| {
                popover.show_view(&region.url, region.byte_range.clone(), pos, cx);
            });
        }
    } else {
        let popover = state.link_popover.read(cx);
        if popover.is_open() && popover.mode() == LinkPopoverMode::View {
            state.link_popover.update(cx, |popover, cx| {
                popover.hide(cx);
            });
            state.link_popover_dismissed = false;
        }
    }
    cx.notify();
});
```

### 3. Fix Edit popover positioning (`state.rs`)

For the Edit popover (triggered by Cmd-K or toolbar), use the link region bounds for positioning instead of cursor_bounds. Add a new method:

```rust
fn popover_position_for_range(&self, range: &Range<usize>, cx: &App) -> Point<Pixels> {
    // Find the link hit region for this byte range and use its bounds
    if let Some(region) = self.link_hit_regions.iter().find(|r| &r.byte_range == range) {
        return Point::new(
            region.bounds.origin.x,
            region.bounds.origin.y + region.bounds.size.height,
        );
    }
    // Fallback to cursor-based position
    self.popover_position_for_offset(range.start, cx)
}
```

Update `on_action_edit_link` to use the link region position when available.

### 4. URL validation error in popover (`link_popover.rs`)

Add a `validation_error: bool` field to `LinkPopover`. When the user tries to confirm an invalid URL:

- Set `validation_error = true`
- Show error styling on the input
- Keep the popover open

Clear the error when the user types in the input (via the `InputEvent::Change` subscription).

In the `Render` impl, apply error styling to the input:

```rust
Input::new(&url_input).small().appearance(true)
    // maybe add error styling
```

### 5. Handle popover dismissal on mouse leave

When the mouse moves off a link and onto another part of the editor (not a link), hide the View popover. This is already handled by the hover detection in step 2 — when `hovered_region` is `None`, the View popover is hidden.

Also handle: clicking on the editor while View popover is open should NOT close the View popover (let hover handle it), but clicking elsewhere should. This is already the case — the `on_mouse_down` only closes Edit-mode popovers.

## Verification

1. `cargo check` — zero errors
2. `cargo run` — manual testing:
   - Type text with a link, hover over it → View popover appears below the link text
   - Move mouse away → View popover disappears
   - Click Edit in View popover → Edit popover appears
   - Type invalid text (e.g., "hello") and press Enter → error shown, popover stays open
   - Type valid URL (https://example.com) and press Enter → link applied
   - Cmd-K with selection → Edit popover opens, position correct
   - Cmd-K on existing link → Edit popover opens with existing URL
