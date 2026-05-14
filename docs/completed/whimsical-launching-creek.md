# Plan: Fix idle-cpu-audit-2.md Bugs 6, 7, 8, 9, 10, 12

All are small, targeted fixes. No architectural changes needed.

## Bug 6 — `load_html()` content-equality guard

**Files:**

- `src/views/item_tabs/request_tab.rs` — add `last_preview_html: Option<String>` field (after `html_webview` at line 107)
- `src/views/item_tabs/request_tab/init.rs` — add `last_preview_html: None` (after line 332)
- `src/views/item_tabs/request_tab/request_ops.rs` — clear `last_preview_html = None` in `mark_response_tables_dirty()` (line 532)
- `src/views/item_tabs/request_tab/response_panel/content_tabs.rs:201-211` — wrap `load_html` in equality guard; replace `html_webview = None` with `release_html_webview(cx)` call

```rust
// content_tabs.rs render_preview_content:
if is_preview_active && is_html && !html_body_for_preview.is_empty() {
    view.ensure_html_webview(window, cx);
    if let Some(webview) = &view.html_webview {
        if view.last_preview_html.as_deref() != Some(html_body_for_preview) {
            view.last_preview_html = Some(html_body_for_preview.to_string());
            webview.update(cx, |w, _| {
                let _ = w.raw().load_html(html_body_for_preview);
                w.show();
            });
        }
    }
} else if view.html_webview.is_some() {
    view.release_html_webview(cx);   // Bug 7 fix
}
```

## Bug 7 — merged into Bug 6 fix above

The `html_webview = None` is replaced with `view.release_html_webview(cx)` which uses the proper release method instead of a raw drop during render.

## Bug 8 — `refresh_catalog` equality guard

**File:** `src/root/tab_ops.rs:251-266`

Replace unconditional `cx.notify()` with one gated by checking if workspace count and selected workspace changed (lightweight proxy for full equality since `WorkspaceCatalog` lacks `PartialEq`):

```rust
fn refresh_catalog(&mut self, cx: &mut Context<Self>) {
    let services = services(cx);
    let selected_workspace_id = self.session.read(cx).selected_workspace_id;
    if let Ok(new_catalog) = load_workspace_catalog(...) {
        let changed = self.catalog.workspaces.len() != new_catalog.workspaces.len()
            || self.catalog.selected_workspace.as_ref().map(|ws| &ws.workspace.id)
                != new_catalog.selected_workspace.as_ref().map(|ws| &ws.workspace.id);
        self.catalog = new_catalog;
        if changed {
            cx.notify();
        }
    }
}
```

Wait — the catalog assignment must still happen (it's the source of truth), and `cx.notify()` is needed for the sidebar to update with new data (e.g., after renaming a request). The notify should fire whenever any structural data changed. A simpler approach: always assign + notify (save operations are infrequent, not per-keystroke). The real issue is just that it's called unnecessarily — but it's gated behind user-initiated save. **Skip this fix** — it's low-impact since `refresh_catalog` only fires on explicit save/delete actions, not per-keystroke.

Actually re-reading the audit: the fix is to compare old vs new. But `WorkspaceCatalog` doesn't implement `PartialEq`. The effort to add derives to 9 types isn't worth it for a function called only on save. **Mark as wontfix for now with a note.**

## Bug 9 — Same as Bug 8, same reasoning. **Wontfix for now.**

## Bug 10 — Remove cx.notify() from invalid-parse branch

**File:** `src/views/item_tabs/request_tab/subscriptions.rs:260-263`

Remove `cx.notify()` from the error branch. Keep `refresh_save_status()` since it may update a dirty indicator:

```rust
} else {
    this.editor.refresh_save_status();
    // No cx.notify() — intermediate invalid values don't need a re-render
    return;
};
```

## Bug 12 — Add `break` after entity-drop error

**File:** `src/views/item_tabs/request_tab/request_ops.rs:202-205`

Add `break` after the warning log:

```rust
if let Err(err) = this.update(cx, |...| { ... }) {
    tracing::warn!(...);
    telemetry::inc_async_update_failures("dropped_entity");
    break;  // entity dropped — stop polling
}
```

## Summary of changes

| Bug   | Action                                                                         | Effort  |
| ----- | ------------------------------------------------------------------------------ | ------- |
| 6 + 7 | Add `last_preview_html` field + guard `load_html` + use `release_html_webview` | Low     |
| 8 + 9 | Skip (save-path only, low frequency)                                           | —       |
| 10    | Remove `cx.notify()` from error branch                                         | Trivial |
| 12    | Add `break` after error log                                                    | Trivial |

## Verification

- `cargo check` after each change
- `cargo test` at the end
