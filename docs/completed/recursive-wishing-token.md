# Phase 5 Audit Gap Fixes

## Context

Phase 5 audit found gaps between the plan (`docs/phase-5.md`) and the implementation. This plan addresses all gaps in priority order: blob ref correctness (H1/H2), security (H3), localization (H4/H5), missing tests (M1/M2), missing UI actions (M4), and cleanup (L1/L2).

---

## Step 1: Repo struct refactor — `create_pending` + `blob_refs` (H1)

Introduce `CreateHistoryRun` struct (mirrors existing `FinalizeStreamRun` pattern), update `create_pending` and `create_pending_for_request` to accept it.

**Files:**

- `src/repos/history_repo.rs` — add struct, change trait + impl signatures, insert blob refs in same transaction
- `src/services/request_execution.rs:322-336` — construct `CreateHistoryRun` in `create_pending_history`
- `src/services/protocol_execution.rs:105-113` — pass through blob_refs
- `src/views/item_tabs/request_tab/request_ops.rs:415,1133` — pass `vec![]`

**New struct** (after line 70):

```rust
pub struct CreateHistoryRun {
    pub workspace_id: WorkspaceId,
    pub request_id: Option<RequestId>,
    pub method: String,
    pub url: String,
    pub snapshot: Option<RequestSnapshot>,
    pub protocol_kind: String,
    pub request_name: Option<String>,
    pub request_collection_id: Option<CollectionId>,
    pub request_parent_folder_id: Option<FolderId>,
    pub request_snapshot_json: Option<String>,
    pub blob_refs: Vec<HistoryBlobRefInput>,
}
```

**Trait change:**

```rust
fn create_pending(&self, input: CreateHistoryRun) -> RepoResult<HistoryEntry>;
fn create_pending_for_request(
    &self,
    workspace_id: WorkspaceId,
    request_id: Option<RequestId>,
    request: &RequestItem,
    snapshot: Option<RequestSnapshot>,
    blob_refs: Vec<HistoryBlobRefInput>,
) -> RepoResult<HistoryEntry>;
```

`create_pending_for_request` default impl builds `CreateHistoryRun` from request fields + blob_refs, delegates to `create_pending`.

---

## Step 2: Repo struct refactor — finalize methods + `blob_refs` (H2)

Add `FinalizeCompletedRun`, `FinalizeFailedRun`, `FinalizeCancelledRun` structs with `blob_refs: Vec<HistoryBlobRefInput>`. Insert blob refs in same transaction as the status update.

**Files:**

- `src/repos/history_repo.rs` — add 3 structs, change trait + impl signatures
- `src/services/request_execution.rs:338-393` — construct structs in `finalize_history` (5 call sites: completed, failed, cancelled, preflight-failed, err)
- `src/views/item_tabs/request_tab/request_ops.rs:1236` — construct `FinalizeFailedRun` in WS error path

All callers pass `blob_refs: vec![]` for now (future work can populate with actual blob refs).

---

## Step 3: WebSocket handshake header redaction (H3)

**File:** `src/services/websocket_execution.rs`

Add `is_sensitive_header()` helper (check authorization, cookie, set-cookie, proxy-authorization, x-auth-\* prefixes). After the WS handshake response is received (~line 79), build a redacted `headers_json` that strips sensitive headers from the response before persisting to history. Currently `headers_json: None` is set (line 200) — change to serialize only non-sensitive response headers.

---

## Step 4: Localize history details strings (H4)

**Files:** `i18n/en/torii.ftl`, `i18n/zh-CN/torii.ftl`, `src/views/item_tabs/history_tab.rs`

New FTL keys:

```
history_tab_details_status = Status
history_tab_details_media_type = Media Type
history_tab_details_response_size = Response Size
history_tab_details_headers = Headers
history_tab_details_body_preview = Body Preview
history_tab_details_timing = Timing
history_tab_details_timing_ms = Timing (ms)
history_tab_details_cookies = Cookies
history_tab_details_no_set_cookie = No Set-Cookie headers
history_tab_details_body = Body
```

Replace in `history_tab.rs`:
| Line | Raw string | Replace with |
|------|-----------|--------------|
| 1165 | `"Status: {status}"` | `format!("{}: {status}", localize("history_tab_details_status"))` |
| 1168 | `"Media Type: {media_type}"` | `format!("{}: {media_type}", localize("history_tab_details_media_type"))` |
| 1171 | `"Response Size: {}"` | `format!("{}: {}", localize("history_tab_details_response_size"), ...)` |
| 1237 | `"Headers:\n{preview}"` | `format!("{}:\n{preview}", localize("history_tab_details_headers"))` |
| 1272 | `"Timing (ms): {timing_preview}"` | `format!("{}: {timing_preview}", localize("history_tab_details_timing_ms"))` |
| 1282 | `"Body Preview:\n{body}"` | `format!("{}:\n{body}", localize("history_tab_details_body_preview"))` |
| 1303 | `.label("Headers")` | `.label(localize("history_tab_details_headers"))` |
| 1307 | `"Headers".to_string()` | `localize("history_tab_details_headers")` |
| 1321 | `.label("Body")` | `.label(localize("history_tab_details_body"))` |
| 1324 | `"Body Preview".to_string()` | `localize("history_tab_details_body_preview")` |
| 1337 | `.label("Timing")` | `.label(localize("history_tab_details_timing"))` |
| 1340 | `"Timing".to_string()` | `localize("history_tab_details_timing")` |
| 1350 | `.label("Cookies")` | `.label(localize("history_tab_details_cookies"))` |
| 1353 | `"Cookies".to_string()` | `localize("history_tab_details_cookies")` |
| 1574 | `"No Set-Cookie headers".to_string()` | `localize("history_tab_details_no_set_cookie")` |

---

## Step 5: Localize "Restored History" collection name (H5)

**Files:** `i18n/en/torii.ftl`, `i18n/zh-CN/torii.ftl`, `src/root/request_pages.rs`

New key: `history_restore_collection_name` = "Restored History" / "已恢复历史"

Replace at `request_pages.rs:462` and `:467`.

---

## Step 6: Add missing tests (M1)

**`tests/history_query.rs`** — 5 new tests:

- `history_migration_timestamp_normalization` — insert with ms timestamps, verify they round-trip
- `history_blob_refs_are_authoritative` — finalize with blob_refs, verify `referenced_blob_hashes()` returns them
- `history_write_inserts_blob_refs_transactionally` — verify blob refs exist in `history_blob_refs` after finalize
- `history_migration_protocol_fields_persisted` — create_pending_for_request with GraphQL request, verify protocol_kind
- `history_recovery_preserves_blob_refs` — finalized row survives `mark_pending_as_failed_on_startup`

**`tests/history_restore.rs`** — 2 new tests:

- `history_restore_missing_collection_creates_restored_history` — deleted collection triggers auto-create
- `history_restore_missing_body_blob_marks_warning` — non-existent blob hash produces warning in snapshot

**`tests/graphql_execution.rs`** — 1 new test:

- `graphql_uses_http_history_and_response_restore` — build_graphql_http_request → create_pending_for_request stores protocol_kind=graphql

**`tests/websocket_streaming.rs`** — 2 new tests:

- `websocket_cancel_finalizes_once` — finalize_stream_cancelled is idempotent on already-terminal row
- `websocket_handshake_header_redaction` — verify sensitive header names are detected

**`tests/grpc_unary.rs`** — 1 new test:

- `grpc_unary_cancel_marks_cancelled` — create pending, finalize_cancelled, verify state

**`tests/request_protocol.rs`** — 1 new test:

- `http_send_routes_through_dispatcher` — verify HTTP protocol_kind dispatches to HTTP executor path

---

## Step 7: Replace gRPC streaming test stubs (M2)

**File:** `tests/grpc_streaming.rs`

Replace 3 stub tests with real behavior tests:

- `grpc_bidi_send_queue_backpressure` — fill `mpsc::channel` to `CHANNEL_CAP`, verify `try_send` returns error at capacity
- `grpc_stream_decode_error_is_recorded` — test `StreamRingBuffer` faithfully records messages, verify via `rows()` iterator
- `grpc_stream_transcript_restore_preview` — write records via `StreamTranscriptWriter`, finalize to blob store, read back with `read_transcript_preview`, verify content

---

## Step 8: Delete selected / delete matching filter (M4)

**Files:** `src/repos/history_repo.rs`, `src/root/history.rs`, `src/views/item_tabs/history_tab.rs`, FTL files

**Repo:** Add `delete_by_ids(ids: &[HistoryEntryId]) -> RepoResult<usize>` — DELETE with IN clause + cascade blob refs.

**AppRoot:** Add `delete_selected_history_entry` and `delete_filtered_history` following the `prune_history_before_for_workspace` pattern (delete + blob cleanup + refresh).

**UI:** Add toolbar buttons near the prune button. "Delete Filtered" with confirmation dialog showing count preview.

**FTL keys:** `history_tab_delete_filtered`, `history_tab_delete_filtered_confirm`, `history_tab_delete_success`

---

## Step 9: Remove dead code (L1)

**File:** `src/views/item_tabs/history_tab.rs`

Delete `history_rows_elements` function (lines 636-826) and its `#[allow(dead_code)]` attribute.

---

## Step 10: Add "Request" group-by mode (L2)

**Files:** `src/root/history.rs`, `src/views/item_tabs/history_tab.rs`, FTL files

Add `HistoryGroupBy::Request` variant to enum in `history.rs:42-48`. Add match arm in `group_entries` (line 1618) using `request_name` with fallback to `method url`. Add group button in toolbar (near line 380).

FTL: `history_tab_group_request` = "Request" / "请求"

---

## Dependency Order

```
Step 1 (H1) → Step 2 (H2) → Step 6 (M1 tests for H1/H2)
Step 3 (H3)                  → Step 6 (WS redaction test)
Step 4 (H4) — independent
Step 5 (H5) — independent
Step 7 (M2) — independent
Step 8 (M4) — independent
Step 9 (L1) — independent
Step 10 (L2) — independent
```

Steps 1-3 first, then 4-5, then 6-7, then 8-10.

---

## Verification

After all steps:

```bash
cargo fmt
cargo check --package torii
cargo test --package torii
cargo test --test history_query --test history_restore --test history_snapshot --test graphql_execution --test websocket_streaming --test grpc_unary --test grpc_streaming --test stream_transcript --test request_protocol
cargo clippy --package torii --all-targets --all-features -- -D warnings
cargo fmt --check
```
