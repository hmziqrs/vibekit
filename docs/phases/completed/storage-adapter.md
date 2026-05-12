# Storage Adapter Abstraction — Implementation Plan

## What exists

- StorageClient interface (put, get, delete, list) in services/types.ts
- R2 adapter (src/lib/server/adapter/cloudflare/storage-r2.ts)
- Filesystem adapter (src/lib/server/adapter/node/storage-filesystem.ts)
- Both adapters fully functional

## What's needed

1. Presigned URL support (for direct browser uploads)
2. S3-compatible adapter
3. getPresignedUrl method on StorageClient interface

## Files to Create

1. `src/lib/server/adapter/s3/storage-s3.ts` — S3-compatible adapter
2. `tests/unit/storage-adapters.test.ts`

## Files to Modify

1. `src/lib/server/services/types.ts` — add getPresignedUrl to interface
2. `src/lib/server/adapter/cloudflare/storage-r2.ts` — implement presigned URLs
3. `src/lib/server/adapter/node/storage-filesystem.ts` — implement presigned URLs
