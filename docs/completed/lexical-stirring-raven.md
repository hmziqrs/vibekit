# Plan: Move test files to `tests/{unit,e2e}/` structure

## Context

14 unit test files are co-located with source files in `src/`, bloating directories. Moving them to a dedicated `tests/unit/` folder while keeping E2E tests in `tests/e2e/` (moved from `e2e/`).

## New structure

```
tests/
  unit/
    cache.test.ts
    hono-index.test.ts
    hono-middleware.test.ts
    hono-routes.test.ts
    markdown.test.ts
    rate-limit.test.ts
    upload.test.ts
    uuid.test.ts
    utils.test.ts
    validators-auth.test.ts
    validators-blog.test.ts
    validators-common.test.ts
    validators-contact.test.ts
    validators-item.test.ts
  e2e/
    admin.spec.ts
    api.spec.ts
    auth.spec.ts
    authenticated.spec.ts
    blog.spec.ts
    contact.spec.ts
    crud.spec.ts
    errors.spec.ts
    public.spec.ts
    spec-testing/
      audit.ts
      rendering-production.spec.ts
      rendering.spec.ts
    helpers/
      auth.ts
```

## Steps

### 1. Create directories

```
mkdir -p tests/unit tests/e2e
```

### 2. Move unit test files (14 files)

Move each from `src/` to `tests/unit/` with flat names. Update all relative `./` imports to use `$lib/` alias paths.

| From                                     | To                                      | Import changes                                                                       |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/lib/server/cache.test.ts`           | `tests/unit/cache.test.ts`              | `./cache` → `$lib/server/cache`                                                      |
| `src/lib/server/hono/index.test.ts`      | `tests/unit/hono-index.test.ts`         | `./middleware` → `$lib/server/hono/middleware`, `./types` → `$lib/server/hono/types` |
| `src/lib/server/hono/middleware.test.ts` | `tests/unit/hono-middleware.test.ts`    | same pattern                                                                         |
| `src/lib/server/hono/routes.test.ts`     | `tests/unit/hono-routes.test.ts`        | same pattern                                                                         |
| `src/lib/server/markdown.test.ts`        | `tests/unit/markdown.test.ts`           | `./markdown` → `$lib/server/markdown`                                                |
| `src/lib/server/rate-limit.test.ts`      | `tests/unit/rate-limit.test.ts`         | `./rate-limit` → `$lib/server/rate-limit`                                            |
| `src/lib/server/upload.test.ts`          | `tests/unit/upload.test.ts`             | `./upload` → `$lib/server/upload`                                                    |
| `src/lib/server/uuid.test.ts`            | `tests/unit/uuid.test.ts`               | `./uuid` → `$lib/server/uuid`                                                        |
| `src/lib/utils.test.ts`                  | `tests/unit/utils.test.ts`              | `./utils` → `$lib/utils`                                                             |
| `src/lib/validators/auth.test.ts`        | `tests/unit/validators-auth.test.ts`    | `./auth` → `$lib/validators/auth`                                                    |
| `src/lib/validators/blog.test.ts`        | `tests/unit/validators-blog.test.ts`    | `./blog` → `$lib/validators/blog`                                                    |
| `src/lib/validators/common.test.ts`      | `tests/unit/validators-common.test.ts`  | `./common` → `$lib/validators/common`                                                |
| `src/lib/validators/contact.test.ts`     | `tests/unit/validators-contact.test.ts` | `./contact` → `$lib/validators/contact`                                              |
| `src/lib/validators/item.test.ts`        | `tests/unit/validators-item.test.ts`    | `./item` → `$lib/validators/item`                                                    |

### 3. Move E2E test files

Move `e2e/*` to `tests/e2e/` preserving structure (helpers/, spec-testing/).

### 4. Update vitest config

File: `vite.config.ts` (vitest config is inline)
Change `include` from `['src/**/*.{test,spec}.{js,ts}']` to `['tests/unit/**/*.test.{js,ts}']`.

### 5. Update playwright config

File: `playwright.config.ts`
Change `testDir` from `'./e2e'` to `'./tests/e2e'`.

### 6. Delete old test files from src/

### 7. Format and verify

- `bun run format`
- `bun run test` (132 tests)
- `npx playwright test tests/e2e/api.spec.ts` (25 tests)
