# File Upload Pipeline — Implementation Plan

## What exists

- `src/lib/server/upload.ts` — validation (image/media types, size limits), storage key generation
- `src/lib/server/adapter/cloudflare/storage-r2.ts` — R2 adapter
- `src/lib/server/adapter/node/storage-filesystem.ts` — filesystem adapter (local dev)
- Upload routes (avatar, blog, admin) in hono/index.ts
- Storage client interface with put/get/delete/list

## What's needed

1. **Chunked uploads**: Upload large files in chunks, reassemble server-side
2. **Upload sessions**: Track upload progress, support resumption
3. **File scanning hook**: Pluggable virus scanning interface (implementation optional)
4. **Upload status tracking**: DB table for upload sessions

## DB Table: upload_session

- id, userId
- fileName, fileSize, fileType, storageKey
- chunkSize, totalChunks, receivedChunks (JSON array)
- status (pending/uploading/complete/failed/expired)
- createdAt, updatedAt, expiresAt

## Files to Create

1. `drizzle/0036_upload_sessions.sql`
2. `src/lib/server/upload-session.ts` — session management + chunk assembly
3. `src/lib/validators/upload.ts` — chunk upload validation
4. `tests/unit/upload-session.test.ts`
5. `tests/e2e/upload.spec.ts`

## Files to Modify

1. `src/lib/server/db/schema.ts` — add uploadSession table
2. `src/lib/server/hono/index.ts` — add chunked upload routes
3. `src/lib/validators/index.ts` — re-export
