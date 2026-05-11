# Phase: Dev Environment & DX

**Status:** In Progress
**Category:** Foundation & DX
**Started:** 2026-05-11

## Scope

Improve developer experience by filling gaps in local development tooling, cross-editor consistency, git hygiene, and onboarding friction.

---

## Items

### 1. Git Pre-commit Hooks

**Problem:** No automated pre-commit checks. Developers must manually run lint/format before committing.

**Plan:**

- Add `simple-git-hooks` as a dev dependency (lightweight alternative to Husky)
- Configure `simple-git-hooks` in `package.json` with a `pre-commit` hook:
  ```json
  "pre-commit": "bun run format:check && bun run lint"
  ```
  (Must use `bun run` — hooks run in bare shell without `node_modules/.bin` on PATH)
- Update `prepare` script to chain both commands:
  ```json
  "prepare": "svelte-kit sync || echo '' && simple-git-hooks"
  ```
- **Before enabling:** run `bun run lint:fix && bun run format` to clean existing violations, otherwise hooks block all commits

**Files changed:** `package.json`

**Why simple-git-hooks over Husky:** Zero config files, no `.husky/` directory pollution, config lives in `package.json`, works with any package manager. Works fine with Bun.

---

### 2. `.editorconfig`

**Problem:** No cross-editor consistency for basic file settings. Developers using non-VS Code editors have no baseline rules.

**Plan:**

- Create `.editorconfig` at project root matching `.oxfmtrc.json` settings:
  - `indent_style = space`, `indent_size = 2`
  - `end_of_line = lf`
  - `charset = utf-8`
  - `insert_final_newline = true`, `trim_trailing_whitespace = true`
  - Markdown files: `trim_trailing_whitespace = false` (trailing spaces are significant)

**Files changed:** `.editorconfig` (new)

---

### 3. VS Code Workspace Settings

**Problem:** Only `files.associations` configured. Missing format-on-save, default formatter, and other DX settings.

**Plan:**

- Update `.vscode/settings.json` with:
  - Format on save enabled
  - Default formatter for JS/TS/JSON files (oxfmt via extension or none — oxfmt doesn't have a VS Code extension yet, so skip formatter setting)
  - Editor tab size = 2
  - Files insert final newline
  - Files trim trailing whitespace
  - Files eol = \n
  - Search exclude patterns for `.svelte-kit`, `build`, `node_modules`, `.wrangler`
- Update `.vscode/extensions.json` recommendations:
  - Add `dbaeumer.vscode-eslint` or equivalent for oxlint (if available)
  - Add `bradlc.vscode-tailwindcss` (already recommended)
  - Add `ms-playwright.playwright` for E2E test authoring
  - Add `editorconfig.editorconfig` for `.editorconfig` support

**Files changed:** `.vscode/settings.json`, `.vscode/extensions.json`

---

### 4. Deploy Script

**Problem:** No `deploy` script in package.json. Production deployment requires manually running `wrangler deploy`.

**Plan:**

- Add `"deploy": "ADAPTER=cloudflare wrangler deploy"` to `package.json` scripts
- This ensures the adapter env var is set correctly during deployment

**Files changed:** `package.json`

---

### 5. Database Reset Script

**Problem:** No easy way to wipe and recreate the local D1 database for a clean slate.

**Plan:**

- Add `"db:reset:local"` script as a one-liner:
  ```json
  "db:reset:local": "rm -rf .wrangler/state/v3/d1/miniflare-D1DatabaseObject && bun run db:migrate:local"
  ```
- Uses `rm -rf` on the full directory (not individual files) for clean slate
- Re-runs all migrations via the existing `db:migrate:local` command

**Files changed:** `package.json`

---

### 6. Remove `package-lock.json` (Lock File Cleanup)

**Problem:** Both `bun.lock` and `package-lock.json` exist. Bun is the designated package manager per CLAUDE.md. The npm lock file is stale and misleading.

**Plan:**

- Delete `package-lock.json`
- Ensure `.gitignore` has `package-lock.json` in it to prevent re-creation
- Verify `bun.lock` is present and up to date

**Files changed:** `.gitignore`, delete `package-lock.json`

---

### 7. `.env.example` Defaults

**Problem:** `ORIGIN` and `BETTER_AUTH_SECRET` have empty defaults. First-time developers must guess values.

**Plan:**

- Set `ORIGIN="http://localhost:5173"` as the default
- Add a comment explaining `BETTER_AUTH_SECRET` can be any 32-char string for local dev
- Add all wrangler.jsonc vars that are missing from `.env.example` with comments:
  - `PUBLIC_FIREBASE_CONFIG`, `CONTACT_NOTIFICATION_EMAIL`, `CRON_SECRET`
  - These are needed when running with the Cloudflare adapter locally (e.g., `bun run preview`)

**Files changed:** `.env.example`

---

### 8. Setup Script (`scripts/setup.ts`) — DEFERRED

**Deferred to follow-up phase.** The `.env.example` improvements (Item 7) cover the most critical onboarding friction. A full setup script needs real-world testing by multiple contributors and has edge cases (Bun not on PATH, migration ordering, ADAPTER env var) that warrant careful implementation.

## Out of Scope (deferred to later phases)

- Server-side error logging / `handleError` → Phase: Error Handling Framework
- Production Wrangler config / staging environment → Phase: Infrastructure & DevOps
- CI/CD pipeline → Phase: CI/CD Pipeline
- Seed script alignment with node adapter → requires architectural decision about local dev strategy

## Success Criteria

- [ ] Pre-commit hooks catch formatting and lint errors before they're committed
- [ ] `.editorconfig` provides consistent baseline across all editors
- [ ] VS Code users have recommended extensions and workspace settings
- [ ] `bun run deploy` works for production deployment
- [ ] `bun run db:reset:local` cleanly resets the local D1 database
- [ ] Only `bun.lock` exists (no `package-lock.json`)
- [ ] `.env.example` has sensible defaults for local development
- [ ] All quality gates pass: `bun run check`, `bun run lint`, `bun run format:check`, `bun run test`
