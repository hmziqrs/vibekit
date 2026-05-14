# Plan: Wire Draft Request Tabs into the Tab Bar

## Context

Phase 3 Slice 6 is partial — `open_draft_request()` creates a `RequestTabView` entity and stores it in `request_draft_pages`, but never registers it with `TabManager`. The entity is unreachable through the tab UI. After first save, the draft must transition to a persisted tab without closing/reopening.

The core problem: `TabKey` wraps `ItemKey { kind, id: Option<ItemId> }` where `ItemKind::Request` always pairs with `ItemId::Request(RequestId)`. Draft tabs have no `RequestId` — they have a `RequestDraftId`. We need a way to represent draft tab identity within the existing key system.

## Approach

Add `ItemId::RequestDraft(RequestDraftId)` so draft tabs get unique keys under `ItemKind::Request`. This is the minimal extension — `ItemKind::Request.is_persisted()` returns true, and `Some(ItemId::RequestDraft(...))` passes the `ItemKey::new()` assertion. Draft tabs are filtered out of session persistence since they're ephemeral.

## Changes

### 1. `src/domain/item_id.rs` — Add RequestDraft variant

- Add `RequestDraft(RequestDraftId)` to `ItemId` enum
- Add `From<RequestDraftId> for ItemId` impl

### 2. `src/session/item_key.rs` — Draft key constructors + storage

- Add `ItemKey::request_draft(id: RequestDraftId)` constructor
- Handle `ItemId::RequestDraft(id)` in `to_storage_parts()` → `("request_draft", Some(id.to_string()))`
- Handle `"request_draft"` in `from_storage_parts()` → parse `ItemId::RequestDraft`
- Update `from_storage_parts()` match to also accept `"request_draft"` kind (maps to `ItemKind::Request` since we don't add a new ItemKind, or we could add `ItemKind::RequestDraft` — see below)

Wait — actually `from_storage_parts()` maps kind strings to `ItemKind` variants. Since we're not adding `ItemKind::RequestDraft`, we need to handle this differently. The storage format for drafts is `("request_draft", Some(draft_id))`, but `ItemKind::from_str("request_draft")` would fail.

**Better approach:** Don't add a new `ItemKind`. Instead, use `ItemKind::Request` for both persisted and draft requests, distinguished by `ItemId::Request(RequestId)` vs `ItemId::RequestDraft(RequestDraftId)`. For storage, we skip draft tabs entirely (filter them out in `persist_session_state`), so `to_storage_parts` / `from_storage_parts` never see `ItemId::RequestDraft` in production. Just add a fallback case in `to_storage_parts` that handles it gracefully in case it's ever called.

Changes:

- `ItemKey::request_draft(id: RequestDraftId)` → `ItemKey { kind: ItemKind::Request, id: Some(ItemId::RequestDraft(id)) }`
- `to_storage_parts()`: add `ItemId::RequestDraft(id)` → `("request_draft", Some(id.to_string()))`
- `from_storage_parts()`: add `"request_draft"` → `ItemKind::Request` + `ItemId::RequestDraft(parse(id))` (for robustness, though normally skipped)

### 3. `src/session/tab_manager.rs` — Add `replace_key()`

Add a method that replaces one tab key with another in-place (same position, same active state):

```rust
pub fn replace_key(&mut self, old_key: TabKey, new_key: TabKey) -> bool {
    if let Some(index) = self.index_of(old_key) {
        self.tabs[index].key = new_key;
        if self.active == Some(old_key) {
            self.active = Some(new_key);
        }
        true
    } else {
        false
    }
}
```

### 4. `src/root.rs` — Wire everything together (bulk of the work)

#### 4a. `open_draft_request()` — Register with TabManager + set up observer

- Create the entity as before
- Set up an `cx.observe(&page, ...)` callback that:
  - Checks if the editor identity transitioned from `Draft` → `Persisted`
  - On transition: calls `tab_manager.replace_key(old_draft_key, new_persisted_key)`, moves entity from `request_draft_pages` to `request_pages`
  - Always refreshes catalog
- Register the tab with `session.open_or_focus(ItemKey::request_draft(draft_id))`
- Call `persist_session_state(cx)`

#### 4b. `render_active_tab_content()` — Handle draft tabs

Add match arm for `(ItemKind::Request, Some(ItemId::RequestDraft(draft_id)))`:

- Look up entity in `request_draft_pages`
- Render it, or show empty state if not found

#### 4c. Tab title in render loop

In `AppRoot::render()`, when building `TabPresentation` items, check for `ItemId::RequestDraft` and look up the draft name from the entity:

```rust
let title = match tab.key.item().id {
    Some(ItemId::RequestDraft(draft_id)) => {
        self.request_draft_pages.get(&draft_id)
            .map(|p| p.read(cx).editor().draft().name.clone())
            .unwrap_or_else(|| localize("request_tab_draft_title"))
    }
    _ => self.catalog.find_title(tab.key.item())
        .unwrap_or_else(|| localize("tab_missing_short"))
};
```

#### 4d. `close_tab()` — Handle draft tab dirty confirmation

Extend to check `request_draft_pages` for dirty state:

```rust
let draft_id = match tab_key.item().id {
    Some(ItemId::RequestDraft(id)) => Some(id),
    _ => None,
};
let should_confirm = /* check request_pages OR request_draft_pages */;
```

#### 4e. `save_request_tab_by_key()` — Handle draft tab saves

Extend to find the entity in `request_draft_pages` as well. Return `Option<TabKey>` to indicate the current tab key after save (may differ if draft was promoted).

The close-dialog "Save" button uses the returned key to close the correct tab.

#### 4f. `delete_item()` — Skip draft tabs

Draft tabs don't appear in the catalog and can't be deleted from the sidebar. No changes needed.

#### 4g. `persist_session_state()` — Filter out draft tabs

Filter tabs where `id == Some(ItemId::RequestDraft(_))` before passing to `tab_session.save_session()`.

#### 4h. "New Request" trigger — Add context menu item on collections

In `render_collection_menu_item()`, add a "New Request" context menu item that calls `open_draft_request(collection_id)`. Add Fluent key `menu_new_request`.

### 5. `i18n/en/torii.ftl` + `i18n/zh-CN/torii.ftl` — New Fluent keys

- `request_tab_draft_title` = "Untitled Request"
- `menu_new_request` = "New Request" / "新建请求"

## Key files

- `src/domain/item_id.rs` (7 lines — add variant + From)
- `src/session/item_key.rs` (~20 lines — constructor + storage handling)
- `src/session/tab_manager.rs` (~10 lines — replace_key method)
- `src/root.rs` (~80 lines — the bulk: open_draft_request, render, close, save, persist)
- `i18n/en/torii.ftl` + `i18n/zh-CN/torii.ftl` (2 keys each)

## Verification

1. `cargo check` — type checks
2. `cargo test` — existing tests still pass
3. `cargo run` — manual test:
   - Right-click a collection → "New Request" → draft tab appears in tab bar
   - Edit the draft (name, URL) → tab title updates
   - Send the draft → response appears
   - Save → tab transitions to persisted, appears in sidebar
   - Close a dirty draft → confirmation dialog works
   - Restart app → draft tabs are not restored (ephemeral)
