# Plan: Proper R2 Cover Image Dimensions

## Context

When `media:rewrite` replaces `cover: "../media/foo.jpg"` with an R2 URL like `cover: "https://r2.dev/foo-hash.jpg"`, Astro can't produce `ImageMetadata` objects. The current code hacks around this with `typeof image === "string"` checks everywhere and omits width/height for remote images. The JSON API endpoints are also broken — `post.data.cover?.src ?? null` returns `null` for string URLs.

The fix: store dimensions in D1 at upload time, emit a JSON manifest at rewrite time, and normalize all covers into a uniform `{src, width, height}` shape at build time.

## Files to Modify

### 1. New migration: `apps/api/migrations/0002_media_dimensions.sql`

```sql
ALTER TABLE media ADD COLUMN width INTEGER;
ALTER TABLE media ADD COLUMN height INTEGER;
```

### 2. `scripts/media-pipeline.ts`

**Upload** — extract dimensions with `image-size` package and store in D1:

- Add `image-size` as dev dependency
- After reading file body, call `imageSize(filePath)` to get dimensions
- Update D1 upsert to include `width` and `height` columns

**Rewrite** — write `media-manifest.json` alongside rewritten posts:

- Query D1 for `{local_path, r2_url, width, height}`
- Write `{r2_url: {width, height}}` as `media-manifest.json` in the output dir

Output dir structure:

```
/tmp/blog-content-xxx/
  posts/
    hello-world.md
    building-with-astro-6.md
  media-manifest.json
```

### 3. New utility: `apps/web/src/utils/cover-image.ts`

```ts
interface CoverImage {
  readonly src: string
  readonly width: number
  readonly height: number
}

function normalizeCover(
  cover: ImageMetadata | string | undefined,
  manifest?: Record<string, { width: number; height: number }> | null
): CoverImage | undefined
```

- `string` → looks up dimensions in manifest, falls back to 1280x720
- `ImageMetadata` → extracts `.src`, `.width`, `.height`
- `undefined` → returns `undefined`

### 4. `apps/web/src/content.config.ts`

- Load `media-manifest.json` from `contentDir/../media-manifest.json` (present during deploy builds)
- Export `mediaManifest` for use by normalizer consumers
- Schema stays as `z.union([image(), z.string().url()]).optional()` — no change

### 5. `apps/web/src/components/ThemedImage.astro`

- Accept `CoverImage` instead of `ImageMetadata | string`
- Always has `width`/`height` — no branching

### 6. `apps/web/src/layouts/PostLayout.astro`

- Import `normalizeCover` + `mediaManifest`
- Normalize cover once, use `CoverImage` type throughout
- Simplify OG image path logic

### 7. `apps/web/src/layouts/BaseLayout.astro`

- Change `image` prop from `string | ImageMetadata` to `CoverImage`

### 8. `apps/web/src/components/PostCard.astro`

- Import `normalizeCover` + `mediaManifest`
- Normalize `post.data.cover` before using

### 9. JSON API endpoints (4 files)

- `apps/web/src/pages/api/index.json.ts`
- `apps/web/src/pages/api/posts/[...slug].json.ts`
- `apps/web/src/pages/api/category/[category].json.ts`
- `apps/web/src/pages/api/tags/[tag].json.ts`

Replace `post.data.cover?.src ?? null` with `normalizeCover()` call, returning `{src, width, height}` or `null`.

### 10. `apps/web/src/__tests__/collections.test.ts`

Add tests for `normalizeCover` function.

## Verification

1. `bun run dev:web` — local covers still work (no manifest file exists, covers are `ImageMetadata`)
2. `bun run media:upload` — D1 rows now have width/height
3. `CONTENT_DIR=$(bun run media:rewrite) turbo -F web build:prod` — manifest generated, build succeeds
4. Check generated HTML for `<img>` tags — all have `width` and `height`
5. Check JSON API — covers return `{src, width, height}` not `null`
