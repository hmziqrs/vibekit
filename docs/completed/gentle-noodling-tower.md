# Fix boilerplate portability issues

## Context

This is a GPUI starter/boilerplate project. When cloned for a new project, several hardcoded values break silently. We're fixing them so `cargo build && cargo run` works cleanly after a rename.

## Changes (all in `src/app.rs`)

### 1. Dynamic tracing filter (line 63)

**Before:** `"gpui_starter=trace".parse().unwrap()`
**After:** Use `env!("CARGO_PKG_NAME")` to generate the filter string at compile time, so it always matches the current crate name.

### 2. Absolute project-root paths (lines 77, 84, 115)

Use `env!("CARGO_MANIFEST_DIR")` as the base for:

- `target/state.json` (read/write persisted state) — lines 77, 115
- `./themes` (theme directory watcher) — line 84

This makes paths relative to the project manifest, not the current working directory.

## Verification

- `cargo build` should compile without errors
- `cargo run` should launch the app and load themes correctly
