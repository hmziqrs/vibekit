# Plan: Finish Oxploy Platform End-to-End

## Context

The Oxploy platform has 12 Rust crates, a Svelte 5 admin SPA, Dockerfile, and docker-compose.yml. The API layer, DB layer, auth, Docker client, Traefik config, and jobs are all structurally complete with real code, but disconnected: auth is extracted but not enforced, deploy endpoints create DB records without triggering Docker, the SPA has many stub pages, and the installation flow doesn't match Dokploy's single-container experience. The goal is to wire everything together so the platform is fully functional end-to-end.

## Approach: 5 Phases, each producing a testable system

---

### Phase 0: Bootable System (Backend + SPA + Docker)

**Goal**: `docker compose up` → working app at localhost:3000 with admin SPA, Postgres, migrations, first-user setup

| Task                                                          | Files                                             |
| ------------------------------------------------------------- | ------------------------------------------------- |
| Fix Dockerfile to build admin SPA and embed it                | `core/Dockerfile`                                 |
| Add bun build step (Node 22 stage → copy dist to Rust stage)  | `core/Dockerfile`                                 |
| Fix entrypoint.sh to wait for Postgres before migrating       | `core/entrypoint.sh`                              |
| Fix `oxploy serve` to pass `admin_dir` from config            | `core/crates/oxploy-cli/src/serve.rs`             |
| Add `register()` to API client matching `POST /admin/setup`   | `admin/src/lib/api/client.ts`                     |
| Fix Register.svelte to call the correct endpoint              | `admin/src/lib/pages/auth/Register.svelte`        |
| Fix Login.svelte `res.twoFactorRedirect` → `res.mfa_required` | `admin/src/lib/pages/auth/Login.svelte`           |
| Fix SPA field name mismatches (snake_case alignment)          | `admin/src/lib/api/client.ts`, all settings pages |

### Phase 1: Auth + Middleware

**Goal**: All protected routes require auth. CORS, tracing, compression middleware enabled. SPA has auth guard.

| Task                                                                       | Files                                                     |
| -------------------------------------------------------------------------- | --------------------------------------------------------- |
| Add CORS + TraceLayer + CompressionLayer to Axum app                       | `core/crates/oxploy-api/src/lib.rs`                       |
| Remove `_` prefix from auth params, add `AuthUser` to unprotected handlers | All router files in `core/crates/oxploy-api/src/routers/` |
| Mark login/register/health routes as public (no auth)                      | `core/crates/oxploy-api/src/routers/mod.rs`               |
| Add SPA auth guard (redirect to login if not authenticated)                | `admin/src/App.svelte`, `admin/src/lib/api/client.ts`     |
| Wire logout to call `POST /auth/logout` before redirect                    | `admin/src/lib/layouts/DashboardLayout.svelte`            |
| Add rate limiting on auth endpoints via `tower_governor`                   | `core/crates/oxploy-api/src/lib.rs`                       |

### Phase 2: CRUD Completion on All Pages

**Goal**: Every settings page has working create/delete. All API client methods match the backend.

| Task                                                     | Files                                                             |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| Add `create_ssh_key` endpoint + SPA dialog               | `routers/ssh_key.rs`, `infra/services/infra.rs`, `SSHKeys.svelte` |
| Wire Registry CRUD (create + delete)                     | `Registry.svelte`, `client.ts`                                    |
| Wire Notifications CRUD (create + delete + test)         | `Notifications.svelte`, `client.ts`                               |
| Replace GitProviders hardcoded data with API fetch       | `GitProviders.svelte`, `client.ts`                                |
| Replace Certificates empty array with API fetch + delete | `Certificates.svelte`, `client.ts`                                |
| Wire Users "Invite User" dialog                          | `Users.svelte`, `client.ts`                                       |
| Wire Servers "Add Server" dialog                         | `Servers.svelte`, `client.ts`                                     |
| Wire Profile password change + 2FA toggle                | `Profile.svelte`, `client.ts`                                     |

### Phase 3: Real Deploy Pipeline

**Goal**: Click "Deploy" → git clone → Docker build → Swarm service → Traefik routing → app accessible

| Task                                                                                            | Files                                        |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Wire deploy handler to spawn `run_application_deploy` via tokio::spawn                          | `routers/application.rs`                     |
| Initialize Swarm + create oxploy-network on startup                                             | `cli/serve.rs`, `docker/client.rs`           |
| Start Traefik as Docker service if not running                                                  | `cli/serve.rs`, `docker/client.rs`           |
| Call `init_traefik_directories()` on startup                                                    | `cli/serve.rs`                               |
| Wire stop/start to scale Swarm replicas (0/1)                                                   | `routers/application.rs`, `docker/client.rs` |
| Wire compose deploy to call `run_compose_deploy`                                                | `routers/compose.rs`                         |
| Add `swarm_init()`, `swarm_is_active()`, `create_network()`, `service_exists()` to DockerClient | `docker/client.rs`                           |
| Add `update_service_replicas()` to DockerClient                                                 | `docker/client.rs`                           |

### Phase 4: Polish + Single-Command Install

**Goal**: Production-quality experience matching Dokploy

| Task                                                                     | Files                                          |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| Add `install.sh` script (checks Docker, pulls image, runs container)     | `core/install.sh` (new)                        |
| Add input validation with `garde` on request structs                     | All router files                               |
| Add `PaginationParams` extractor + `PaginatedResponse`                   | New `core/crates/oxploy-api/src/pagination.rs` |
| Add pagination to list endpoints (applications, deployments, containers) | Key router files                               |
| Wire deployment event bus for real-time log streaming                    | `state.rs`, `ws.rs`, `deploy.rs`               |
| Fix admin SPA build to produce static assets for embedding               | `admin/vite.config.ts`                         |

---

## Verification

After each phase:

- `cargo test --workspace` passes all tests
- `docker compose up` starts the system
- Browser: SPA loads, login works, pages render real data
- Phase 3+: Deploy an app from git repo, access via Traefik URL
- Phase 4: Single `curl | sh` install command works on fresh machine
