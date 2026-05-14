# Complete All Test Tiers for Torii Mock Server

## Context

The Torii mock server has 76 Rust integration tests and ~387 TypeScript tests all passing. A deep audit identified 4 tiers of gaps: 13+ endpoints with zero test coverage, ~52 REST endpoints with TS-only tests, infrastructure issues, and GraphQL subscriptions untested. The goal is complete coverage across all protocols.

## Cargo.toml Change

Add `cookies` feature to reqwest (needed for cookie jar tests):

```
reqwest = { version = "0.12", features = ["stream", "gzip", "brotli", "deflate", "json", "multipart", "http2", "cookies"] }
```

## Wave 1: Rust Integration Tests (8 new files, ~100 tests)

All agents run in parallel. Each file is self-contained with its own helpers.

### Agent 1: `tests/mock_server_rest_zero_coverage.rs` (~15 tests)

Zero-coverage REST endpoints. Copy pattern from `mock_server_integration.rs` (REST_BASE, build_client, ensure_server_running).

Tests: timeout (3s client timeout), stall/100 (streaming), stall/500, upload (multipart file), upload (multiple files), POST /headers, POST /auth/basic/protected, GET /auth/none, relative-redirect, redirect/chain/3, large/json/1kb, large/text/1kb, error/timeout, POST /cors, multi-range/100.

### Agent 2: `tests/mock_server_rest_body_types.rs` (~10 tests)

Copy pattern from `mock_server_integration.rs`.

Tests: POST /html (text/html), POST /binary (octet-stream echo), GET /binary/:size, GET /query (params), GET /query (empty), GET /headers/set (custom headers + set-cookie), GET /cookies/get, GET /cookies/delete, GET /cookies/clear.

### Agent 3: `tests/mock_server_rest_auth_extended.rs` (~10 tests)

Copy pattern from `mock_server_integration.rs`.

Tests: auth/cookie (valid session), auth/cookie (invalid), auth/digest (401 + WWW-Authenticate), auth/digest (with header → 200), oauth/password grant, oauth/refresh grant, oauth/protected (valid token), oauth/protected (no token → 401), jwt/sign+verify, jwt/protected.

### Agent 4: `tests/mock_server_rest_methods_errors.rs` (~15 tests)

Copy pattern from `mock_server_integration.rs`.

Tests: PATCH /patch, PUT /put, DELETE /delete, HEAD /head (200), POST /head (405), OPTIONS /options-test (200), GET /options-test (405), error/crash (500), error/xml (500 + application/xml), error/empty (204), error/unauthorized (401), error/forbidden (403), error/notfound (404), error/unavailable (503), error/unknown (500).

### Agent 5: `tests/mock_server_rest_streaming_special.rs` (~15 tests)

Copy pattern from `mock_server_integration.rs`.

Tests: GET /stream (chunked), GET /sse-resume, GET /sse-resume with Last-Event-ID: 2, GET /stream/infinite (read 2 chunks then drop), GET /slow-headers?delay=100, GET /slow-body, GET /connection-close (Connection: close), GET /keep-alive (Keep-Alive header), GET /secure-headers (HSTS, X-Frame-Options, etc.), GET /chunked-trailers (Trailer header), GET /negotiated gzip, GET /negotiated plain, GET /negotiate json, GET /negotiate xml, GET /negotiate html.

### Agent 6: `tests/mock_server_rest_validation_misc.rs` (~15 tests)

Copy pattern from `mock_server_integration.rs`.

Tests: POST /validate (valid → 200), POST /validate (invalid → 422), POST /validate (bad body → 400), POST /continue (with Expect header), POST /continue (without), GET /variables/:name, POST /variables, PUT /etag/:id (with If-Match → 200), PUT /etag/:id (without → 412), GET /connection, GET /absolute-redirect (302), GET /problem/not-found (404), GET /problem/rate-limited (429 + Retry-After), GET /problem/unauthorized (401), GET /problem/unknown (500).

### Agent 7: `tests/mock_server_ws_extended.rs` (~4 tests)

Copy pattern from `mock_server_websocket.rs` (WS_URL, connect, read_json).

Tests: broadcast (2 clients: client1 broadcasts, client2 receives), WSS connect (wss://localhost:3006/ws with self-signed TLS), WSS echo, WSS health.

For WSS, use `tokio_tungstenite::tungstenite::connector::NativeTlsConnector` or configure `connect_async_tls_with_config` with a custom TLS that accepts self-signed certs. Alternative: build a `reqwest::Client` with `danger_accept_invalid_certs(true)` for the health check, and use `tokio_tungstenite` with a custom `Connector` for the WebSocket.

### Agent 8: `tests/mock_server_gql_extended.rs` (~8 tests)

Copy pattern from `mock_server_graphql.rs` (GQL_URL, gql_request).

Tests: post(id: "1") query, connection query, createPost mutation, refreshToken mutation, upload mutation, headers query (with custom header), error/malformed query, error/unknown field.

## Wave 2: Infrastructure Fixes (5 tasks in parallel)

### Agent 9: Server cleanup — modify source + 7 TS test files

- Modify `servers/src/rest.ts`: change `startHttp2Server`, `startHttp2SecureServer`, `startMtlsServer` to return the server object
- Modify `servers/src/websocket.ts`: change `startWebSocketServer`, `startWebSocketSecureServer` to return the server/httpServer object
- Add `afterAll` cleanup to 7 TS test files:
  - `websocket.test.ts`, `websocket-edge-cases.test.ts`, `websocket-binary.test.ts`, `websocket-secure.test.ts`
  - `graphql.test.ts`, `graphql-edge-cases.test.ts`
  - `rest-extended.test.ts`, `rest-new-features.test.ts`
  - `grpc.test.ts`, `grpc-edge-cases.test.ts`

### Agent 10: Remove dead deps

- Edit `servers/package.json`: remove `supertest` and `@types/supertest` from devDependencies
- Run `cd servers && npm install` to update lockfile

### Agent 11: Fix no-op test

- Edit `servers/tests/rest-edge-cases.test.ts`: replace the TRACE `expect(true).toBe(true)` test with `it.skip(...)` or a meaningful test

### Agent 12: Fix flaky HTTP/2 push test

- Edit `servers/tests/rest-extended.test.ts`: replace `setTimeout(200)` with a Promise-based wait for push data

### Agent 13: `tests/mock_server_http2_tls.rs` (~6 tests) — HTTP/2 + TLS + mTLS Rust tests

New file. Uses `danger_accept_invalid_certs(true)` for self-signed certs.

Tests: HTTP/2 h2c health (port 3004), HTTP/2 h2c echo, HTTP/2+TLS health (port 3005), HTTP/2+TLS echo, mTLS health no cert (port 3007), mTLS endpoint no cert.

## Wave 3: GraphQL Subscriptions (deferred, most complex)

### Agent 14: `tests/mock_server_gql_subscriptions.rs` (~4 tests)

Implement graphql-ws protocol over WebSocket:

1. Connect to `ws://localhost:3003/graphql-ws` with subprotocol `graphql-transport-ws`
2. Send `{"type":"connection_init"}` → receive `connection_ack`
3. Subscribe with counter(max:3) → receive 3 next events + complete
4. Subscribe with message → receive 5 events
5. Invalid subscription → error response
6. time subscription test

## Verification

After all waves complete:

1. `cd servers && npm run dev` (start all 8 servers)
2. `cd servers && npx vitest run` (verify all TS tests still pass)
3. `cargo test --test mock_server_rest_zero_coverage --test mock_server_rest_body_types --test mock_server_rest_auth_extended --test mock_server_rest_methods_errors --test mock_server_rest_streaming_special --test mock_server_rest_validation_misc --test mock_server_ws_extended --test mock_server_gql_extended --test mock_server_http2_tls` (new Rust tests)
4. `cargo test --test mock_server_integration --test mock_server_websocket --test mock_server_graphql --test mock_server_grpc` (existing Rust tests — verify no regressions)
5. If doing Wave 3: `cargo test --test mock_server_gql_subscriptions`

## Summary

- **8 new Rust test files**, ~100 new Rust integration tests
- **1 new Rust test file** for GraphQL subscriptions (Wave 3)
- **~12 TS file edits** for infrastructure cleanup
- **1 Cargo.toml edit** (add cookies feature)
- **Total Rust tests after: ~180** (from 76)
