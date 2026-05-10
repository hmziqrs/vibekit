import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, relative } from 'node:path'

import type {
  ListResult,
  PutOptions,
  PutResult,
  StorageClient,
  StoredObject,
} from '../../services/types'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'data/uploads'

export function createNodeStorage(): StorageClient {
  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true })
  }

  return {
    async delete(key: string): Promise<void> {
      const filePath = join(UPLOAD_DIR, key)
      if (existsSync(filePath)) {
        rmSync(filePath)
      }
      const metaPath = `${filePath}.meta.json`
      if (existsSync(metaPath)) {
        rmSync(metaPath)
      }
    },

    async get(key: string): Promise<StoredObject | null> {
      const filePath = join(UPLOAD_DIR, key)
      if (!existsSync(filePath)) return null

      const data = readFileSync(filePath)
      const stat = statSync(filePath)

      // Read metadata sidecar
      let contentType = 'application/octet-stream'
      let cacheControl: string | undefined
      const metaPath = `${filePath}.meta.json`
      if (existsSync(metaPath)) {
        try {
          const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as Record<string, string>
          contentType = meta['contentType'] ?? contentType
          cacheControl = meta['cacheControl'] ?? cacheControl
        } catch {
          // Ignore malformed metadata
        }
      }

      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(data)
            controller.close()
          },
        }),
        cacheControl,
        contentType,
        size: stat.size,
      }
    },

    async list(prefix?: string, _cursor?: string, limit = 100): Promise<ListResult> {
      const items: ListResult['items'] = []

      function walk(dir: string) {
        if (items.length >= limit) return
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (items.length >= limit) break
          const fullPath = join(dir, entry.name)
          if (entry.isDirectory()) {
            walk(fullPath)
          } else if (entry.isFile() && !entry.name.endsWith('.meta.json')) {
            const relKey = relative(UPLOAD_DIR, fullPath)
            if (prefix && !relKey.startsWith(prefix)) {
              // oxlint-disable-next-line no-continue
              continue
            }
            const stat = statSync(fullPath)
            let contentType: string | undefined
            const metaPath = `${fullPath}.meta.json`
            if (existsSync(metaPath)) {
              try {
                const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as Record<string, string>
                // oxlint-disable-next-line prefer-destructuring
                contentType = meta['contentType']
              } catch {
                // Ignore malformed metadata
              }
            }
            items.push({
              contentType,
              key: relKey,
              lastModified: stat.mtime.toISOString(),
              size: stat.size,
            })
          }
        }
      }

      walk(UPLOAD_DIR)
      return { items, truncated: false }
    },

    async put(
      key: string,
      body: ReadableStream | Uint8Array | Blob,
      opts?: PutOptions
    ): Promise<PutResult> {
      const filePath = join(UPLOAD_DIR, key)

      // Ensure parent directory exists
      const dir = join(filePath, '..')
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      let bytes: Uint8Array
      if (body instanceof Uint8Array) {
        bytes = body
      } else if (body instanceof Blob) {
        bytes = new Uint8Array(await body.arrayBuffer())
      } else {
        const chunks: Uint8Array[] = []
        const reader = body.getReader()
        // eslint-disable-next-line no-constant-condition
        while (true) {
          // oxlint-disable-next-line no-await-in-loop
          const { done, value } = await reader.read()
          if (done) break
          if (value) chunks.push(value)
        }
        bytes = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          bytes.set(chunk, offset)
          offset += chunk.length
        }
      }

      writeFileSync(filePath, bytes)

      // Write metadata sidecar if options provided
      if (opts?.contentType || opts?.cacheControl || opts?.metadata) {
        const meta: Record<string, string> = {}
        if (opts.contentType) meta['contentType'] = opts.contentType
        if (opts.cacheControl) meta['cacheControl'] = opts.cacheControl
        if (opts.metadata) Object.assign(meta, opts.metadata)
        writeFileSync(`${filePath}.meta.json`, JSON.stringify(meta))
      }

      return {
        contentType: opts?.contentType ?? 'application/octet-stream',
        key,
        size: bytes.length,
        url: `/cdn/blog/${key}`,
      }
    },
  }
}
