# Image Processing — Implementation Plan

## What exists

- Storage adapters (R2, filesystem) with put/get/delete/list
- Upload validation for images
- CDN URL generation (/cdn/blog/:key)
- Media library admin page

## Approach

In Cloudflare Workers, we use Cloudflare Image Resizing (via /cdnn/cdn-cgi/image/)
for on-the-fly resize/format conversion. For local dev, we generate URLs that
point to the original images.

## Implementation

1. Image URL builder service — generates resize/format URLs
2. Srcset generator — produces responsive image srcset strings
3. Upload hook — stores original + extracts metadata
4. Admin UI integration — show processed URLs

## Files to Create

1. `src/lib/server/image-processing.ts` — URL builder, srcset generator
2. `src/lib/validators/image.ts` — resize parameter validation
3. `tests/unit/image-processing.test.ts`

## Files to Modify

1. `src/lib/server/hono/index.ts` — add image resize proxy endpoint
