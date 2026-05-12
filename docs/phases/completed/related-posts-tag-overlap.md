# Related Posts by Tag Overlap

## Status: Completed

## Implementation

Added related posts section to the single blog post page that displays up to 3 posts ranked by shared tag count.

### Changes

1. **Server-side query** (`src/routes/(blog)/blog/[slug]/+page.server.ts`):
   - After fetching current post's tags, queries `blogPostTag` for the post's tag IDs
   - Uses `innerJoin` on `blogPostTag`, `inArray` for tag IDs, `ne` to exclude current post
   - `groupBy(blogPost.id)` with `orderBy(desc(sql<number>\`count(\*)\`))` ranks by tag overlap count
   - Returns `relatedPosts` array with `slug`, `title`, `excerpt`, `coverImageUrl`, `publishedAt`
   - Returns empty array when post has no tags (no query executed)

2. **UI section** (`src/routes/(blog)/blog/[slug]/+page.svelte`):
   - Added related posts section after article content with `{#if data.relatedPosts.length > 0}`
   - Section separated by `border-t border-border` with "Related Posts" heading
   - 3-column grid (`sm:grid-cols-3`) of link cards
   - Each card shows: cover image (if available), title (h3), excerpt (clamped 2 lines), date
   - Cards have hover effects with `border-brand/40` and `text-brand` transitions

### Tests

- **Unit tests** (`tests/unit/related-posts.test.ts`): 9 tests covering reading time estimation, tag overlap scoring/ranking, exclusion of current post, limit to 3 results, empty tag handling, data shape validation, schema structure
- **E2E tests** (`tests/e2e/related-posts.spec.ts`): 7 tests covering section visibility, link validity, click navigation, cross-page related posts, tag links, date display

### Quality Gates

- 746 tests passing
- 0 lint errors (93 warnings, pre-existing)
- Format check clean
- Browser verified: related posts section renders correctly with ranked cards
