# Link Card / oEmbed Support

## Status: Complete

## Implementation Plan

### Current State

- `detect-embed-provider.ts` exists with 7 providers (Facebook, Instagram, Reddit, TikTok, Twitter/X, Vimeo, YouTube) but is **dead code** — nothing calls it
- `EmbedBlock` extension renders iframes with raw URLs (no embed URL conversion)
- `LinkPreviewCard` extension fetches OG metadata server-side (no oEmbed)
- Slash command inserts embed blocks with `provider: 'generic'` without URL detection
- No GitHub gist support exists

### Changes Required

1. **Wire `detect-embed-provider` into slash command** (`slash-command.ts`)
   - When user provides a URL, call `detectEmbedProvider(url)` first
   - If provider found, use `getEmbedUrl(url)` for the iframe src and set correct provider name
   - If no provider found, insert as `linkPreviewCard` instead (OG metadata fetch)

2. **Add oEmbed discovery to server-side link preview API**
   - For known providers (YouTube, Vimeo, Twitter, etc.), use oEmbed endpoint directly
   - For unknown URLs, check `<link rel="alternate" type="application/json+oembed">` in HTML
   - Return richer data from oEmbed (html embed code, width, height, thumbnail_url)
   - Fall back to OG tag scraping when oEmbed unavailable

3. **Add GitHub gist support**
   - Add gist URL pattern to `detect-embed-provider.ts`
   - Gist embed: use `<script src="gist-url.js">` approach or iframe
   - Handle both gist.github.com/user/gistId and gist.github.com/user/gistId?file=filename

4. **Improve EmbedBlock nodeview**
   - Use the embed URL from `getEmbedUrl()` (converted URL, not raw URL)
   - Show provider icon/name
   - Handle GitHub gist specially (script embed, not iframe)

### Files to Modify

- `src/lib/editor/extensions/slash-command.ts` — Wire provider detection
- `src/lib/editor/utils/detect-embed-provider.ts` — Add GitHub gist provider
- `src/lib/server/hono/index.ts` — Add oEmbed support to link-preview endpoint
- `src/lib/editor/nodeviews/embed-block-view.svelte` — Show provider info, handle gist
- `src/lib/editor/extensions/embed-block.svelte.ts` — Add provider-specific rendering hint

### Testing

- Unit tests for `detectEmbedProvider` (already exist in `nodeviews.test.ts`)
- Unit tests for GitHub gist URL detection
- Unit tests for oEmbed URL construction
- E2E test: insert embed via slash command, verify iframe renders
