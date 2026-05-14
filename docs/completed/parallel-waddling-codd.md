# Plan: Unified Request URL Bar

## Context

The current request URL bar renders the HTTP method `Select` and URL `Input` as separate bordered components with a gap between them. The goal is to merge them into a single unified visual component — a wrapper div with one border, a vertical divider between the select and input, no individual borders/radius on the inner elements, and a box shadow for an "outline" effect. The send button should match the combined component's height.

## Changes

### File: `src/views/item_tabs/request_tab/layout.rs` (lines 113–133)

Replace the current URL bar row:

```rust
// BEFORE
h_flex()
    .gap_2()
    .items_center()
    .h(px(36.))
    .child(
        div()
            .w(px(120.))
            .child(Select::new(&view.method_select).large()),
    )
    .child(div().flex_1().child(Input::new(&view.url_input).large()))
    .child(
        Button::new("request-send")
            .primary()
            .large()
            .label(...)
            .on_click(...),
    ),
```

With:

```rust
// AFTER
h_flex()
    .gap_2()
    .items_center()
    .child(
        // Unified wrapper: one border, one bg, one shadow
        h_flex()
            .items_center()
            .flex_1()
            .border_1()
            .border_color(cx.theme().input)
            .bg(cx.theme().input_background())
            .rounded(cx.theme().radius)
            .when(cx.theme().shadow, |el| el.shadow_xs())
            .child(
                div()
                    .w(px(120.))
                    .child(
                        Select::new(&view.method_select)
                            .large()
                            .appearance(false),
                    ),
            )
            .child(
                Divider::vertical().color(cx.theme().border),
            )
            .child(
                div()
                    .flex_1()
                    .child(
                        Input::new(&view.url_input)
                            .large()
                            .appearance(false),
                    ),
            ),
    )
    .child(
        Button::new("request-send")
            .primary()
            .large()
            .label(es_fluent::localize("request_tab_action_send", None))
            .on_click(cx.listener(|this, _, _, cx| {
                this.send(cx);
            })),
    ),
```

Key points:

- `.appearance(false)` on both `Select` and `Input` strips their individual borders, backgrounds, rounded corners, and shadows
- The wrapper `h_flex()` provides a single unified border, background (`input_background()`), rounding, and conditional `shadow_xs()`
- `Divider::vertical()` from `gpui_component::divider::Divider` renders the separator line
- Removed `.h(px(36.))` from the row — children determine height naturally (`.large()` → `h_11()` = 44px)
- `.flex_1()` moved to the wrapper so it fills remaining space; inner input container is also `.flex_1()`
- Send button's `.large()` already matches the same 44px height as the `.large()` Select/Input

### File: `src/views/item_tabs/request_tab.rs` (imports, line ~5–14)

Add `Divider` to the gpui-component imports:

```rust
use gpui_component::{
    // ... existing imports ...
    divider::Divider,  // ADD
};
```

## Verification

1. `cargo check` — type-check passes
2. `cargo run` — visually verify:
   - Select + Input appear as one bordered component with a vertical line between them
   - No visible individual borders on the Select or Input
   - Box shadow visible around the unified component
   - Rounded corners on the wrapper only, not on the inner components' connecting edges
   - Send button is the same height as the unified bar
   - Select dropdown still opens and functions correctly
   - Focus behavior works (clicking input focuses it, typing works)
