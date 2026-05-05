import type { PutOptions, PutResult, StorageClient, StoredObject } from '../../services/types'

export function createCloudflareStorage(bucket: R2Bucket): StorageClient {
  return {
    async delete(key: string): Promise<void> {
      await bucket.delete(key)
    },

    async get(key: string): Promise<StoredObject | null> {
      const object = await bucket.get(key)
      if (!object) return null
      return {
        body: object.body as ReadableStream,
        cacheControl: object.httpMetadata?.cacheControl,
        contentType: object.httpMetadata?.contentType ?? 'application/octet-stream',
        etag: object.etag,
        size: object.size,
      }
    },

    async put(
      key: string,
      body: ReadableStream | Uint8Array | Blob,
      opts?: PutOptions
    ): Promise<PutResult> {
      await bucket.put(key, body, {
        customMetadata: opts?.metadata,
        httpMetadata: {
          cacheControl: opts?.cacheControl,
          contentType: opts?.contentType,
        },
      })
      return {
        contentType: opts?.contentType ?? 'application/octet-stream',
        key,
        size: 0,
        url: `/cdn/blog/${key}`,
      }
    },
  }
}
