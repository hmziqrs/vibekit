# Remove Local/Static Blog Content System

## Context

The `consumer-dioxus` app has a complete alternative data pipeline (`demo-static-content` feature) that embeds markdown blog posts at compile time and serves them without the backend API. This was used for static demos (GitHub Pages, etc.) but is no longer wanted. The goal is to remove all local/static blog references so the app only loads content from the API.

## Files to Delete

1. `frontend/consumer-dioxus/src/demo_content/mod.rs` (754 lines) — entire static content engine
2. `frontend/consumer-dioxus/content/posts/` — all 10 markdown blog post files
3. `frontend/consumer-dioxus/content/` — empty directory after posts removed

## Files to Edit

### 1. `frontend/consumer-dioxus/Cargo.toml`

- Remove optional deps: `include_dir`, `serde_yaml`, `pulldown-cmark` (lines 40-42)
- Remove feature: `demo-static-content = ["include_dir", "serde_yaml", "pulldown-cmark"]` (line 130)

### 2. `frontend/consumer-dioxus/Dioxus.toml`

- Remove `[web.ssg]` section (lines 27-29)

### 3. `frontend/consumer-dioxus/src/main.rs`

- Remove `#[cfg(feature = "demo-static-content")] pub mod demo_content;` (lines 9-10)
- Remove `static_dir()` helper function (lines 40-47)
- Simplify server main: remove the `#[cfg(feature = "demo-static-content")]` incremental SSG block, keep only `ServeConfig::default()` (lines 54-68)

### 4. `frontend/consumer-dioxus/src/server_fns.rs`

- Remove module-level doc comment about demo-static-content (lines 1-4)
- Remove entire `demo_static` module block (lines 217-276)
- Remove `#[cfg(not(feature = "demo-static-content"))]` guard from `api_backed` module — make it the only module
- Remove conditional re-exports at bottom (lines 278-281), replace with `pub use api_backed::*;`

### 5. `frontend/consumer-dioxus/src/server/mod.rs`

- Remove entire `demo_static` module block (lines 83-193)
- Remove `#[cfg(not(feature = "demo-static-content"))]` guard from `api_backed`
- Remove conditional re-exports (lines 195-198), replace with `pub use api_backed::*;`

### 6. `frontend/consumer-dioxus/src/hooks/posts.rs`

- Remove `#[cfg(all(feature = "server", not(feature = "demo-static-content")))]` guards — simplify to just `#[cfg(feature = "server")]`
- Remove `#[cfg(any(not(feature = "server"), feature = "demo-static-content"))]` guards — simplify to `#[cfg(not(feature = "server"))]`

### 7. `frontend/consumer-dioxus/src/hooks/tags.rs`

- Same pattern: remove `not(feature = "demo-static-content")` from cfg gates, change `any(not(feature = "server"), feature = "demo-static-content")` to `not(feature = "server")`

### 8. `frontend/consumer-dioxus/src/hooks/categories.rs`

- Same pattern as tags.rs

### 9. `frontend/consumer-dioxus/src/screens/home/mod.rs`

- Remove `#[cfg(feature = "demo-static-content")] use crate::demo_content;` (line 4-5)
- Remove `#[cfg(not(feature = "demo-static-content"))]` guards from server fetch (lines 20-24)
- Remove demo-static-content data block (lines 25-28)
- Keep just the server future fetch unconditionally

### 10. `frontend/consumer-dioxus/src/screens/posts/view.rs`

- Remove `#[cfg(feature = "demo-static-content")] use crate::demo_content;` (lines 2-3)
- Remove `#[cfg(not(feature = "demo-static-content"))]` guard from fetch_post_by_slug import (lines 8-9)
- Remove `#[cfg(not(feature = "demo-static-content"))]` guards on server future (lines 61-67)
- Remove demo-static-content post lookup (lines 69-72)
- Simplify analytics: remove `#[cfg(all(feature = "analytics", feature = "demo-static-content"))]` block (lines 107-112), change `all(feature = "analytics", not(feature = "demo-static-content"))` to just `feature = "analytics"` (line 81)

### 11. `frontend/consumer-dioxus/src/screens/tags/view.rs`

- Remove `#[cfg(feature = "demo-static-content")] use crate::demo_content;` (lines 2-3)
- Remove `#[cfg(not(feature = "demo-static-content"))]` guards on server fetches (lines 15-22, 61-67)
- Remove demo-static-content lookup blocks (lines 23-26, 68-71)

### 12. `frontend/consumer-dioxus/src/screens/tags/mod.rs`

- Remove `#[cfg(feature = "demo-static-content")] use crate::demo_content;` (lines 10-11)
- Remove `#[cfg(not(feature = "demo-static-content"))]` guard from first TagsScreen (line 15)
- Remove entire second `#[cfg(feature = "demo-static-content")] TagsScreen` component (lines 78-116)

### 13. `frontend/consumer-dioxus/src/screens/categories/view.rs`

- Remove `#[cfg(feature = "demo-static-content")] use crate::demo_content;` (lines 2-3)
- Remove `#[cfg(not(feature = "demo-static-content"))]` guards on server fetches (lines 15-22, 61-67)
- Remove demo-static-content lookup blocks (lines 23-26, 68-71)

### 14. `frontend/consumer-dioxus/src/screens/categories/mod.rs`

- Remove `#[cfg(feature = "demo-static-content")] use crate::demo_content;` (lines 10-11)
- Remove `#[cfg(not(feature = "demo-static-content"))]` guard from first CategoriesScreen (line 15)
- Remove entire second `#[cfg(feature = "demo-static-content")] CategoriesScreen` component (lines 78-116)

### 15. `Justfile`

- Remove all 8 demo recipes: `consumer-demo-build`, `consumer-demo-bundle`, `consumer-demo-desktop`, `consumer-demo-desktop-native`, `consumer-demo-mobile`, `consumer-demo-mobile-native`, `consumer-demo-build-desktop`, `consumer-demo-build-mobile` (lines 104-262)
- Remove the section comment "Consumer static demo SSG builds" (line 104)
- Remove the section comment "Consumer native demo mode" (line 215)

### 16. Environment files (6 files)

- Remove `CONSUMER_BASE_PATH=/` from: `.env.dev`, `.env.example`, `.env.remote`, `.env.stage`, `.env.test`, `.env.prod`

### 17. `docs/KNOWLEDGEBASE.md`

- Remove "Static Demo SSG (Markdown Content)" section (lines 114-139)
- Remove "CONSUMER_BASE_PATH" references

## Verification

1. `cd frontend/consumer-dioxus && cargo check` — should compile without errors
2. `grep -rn "demo-static-content\|demo_content\|CONSUMER_BASE_PATH" frontend/consumer-dioxus/` — should return zero hits
3. `grep -rn "demo-static-content\|demo_content\|CONSUMER_BASE_PATH" Justfile .env.* docs/` — should return zero hits
4. `just consumer-dev env=dev` — app should still start and fetch from API
