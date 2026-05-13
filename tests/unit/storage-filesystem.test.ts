import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StorageClient } from '../../src/lib/server/services/types'

const ORIGINAL_UPLOAD_DIR = process.env.UPLOAD_DIR

function createTempDir(): string {
  const dir = join(tmpdir(), `vibekit-test-${randomUUID()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

let storage: StorageClient
let testDir: string

beforeEach(async () => {
  testDir = createTempDir()
  process.env.UPLOAD_DIR = testDir
  // Re-import to pick up new UPLOAD_DIR
  vi.resetModules()
  const mod = await import('../../src/lib/server/adapter/node/storage-filesystem')
  storage = mod.createNodeStorage()
})

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true })
  process.env.UPLOAD_DIR = ORIGINAL_UPLOAD_DIR
})

describe('createNodeStorage', () => {
  it('creates upload directory if it does not exist', async () => {
    const freshDir = join(tmpdir(), `vibekit-test-fresh-${randomUUID()}`)
    process.env.UPLOAD_DIR = freshDir
    vi.resetModules()
    const mod = await import('../../src/lib/server/adapter/node/storage-filesystem')
    mod.createNodeStorage()
    expect(existsSync(freshDir)).toBe(true)
    rmSync(freshDir, { recursive: true, force: true })
  })
})

describe('put', () => {
  it('stores a Uint8Array and returns metadata', async () => {
    const data = new Uint8Array([1, 2, 3, 4])
    const result = await storage.put('test.bin', data, { contentType: 'application/octet-stream' })

    expect(result.key).toBe('test.bin')
    expect(result.size).toBe(4)
    expect(result.contentType).toBe('application/octet-stream')
    expect(result.url).toBe('/cdn/blog/test.bin')
    expect(existsSync(join(testDir, 'test.bin'))).toBe(true)
  })

  it('stores a Blob', async () => {
    const blob = new Blob([new Uint8Array([5, 6, 7])])
    const result = await storage.put('blob.dat', blob, { contentType: 'text/plain' })

    expect(result.size).toBe(3)
    expect(existsSync(join(testDir, 'blob.dat'))).toBe(true)
  })

  it('stores a ReadableStream', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([10, 11]))
        controller.enqueue(new Uint8Array([12, 13]))
        controller.close()
      },
    })
    const result = await storage.put('stream.dat', stream)

    expect(result.size).toBe(4)
    expect(existsSync(join(testDir, 'stream.dat'))).toBe(true)
  })

  it('writes metadata sidecar when options provided', async () => {
    await storage.put('meta.txt', new Uint8Array([1]), {
      cacheControl: 'max-age=3600',
      contentType: 'text/plain',
      metadata: { author: 'test' },
    })

    const metaPath = join(testDir, 'meta.txt.meta.json')
    expect(existsSync(metaPath)).toBe(true)
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    expect(meta.contentType).toBe('text/plain')
    expect(meta.cacheControl).toBe('max-age=3600')
    expect(meta.author).toBe('test')
  })

  it('does not write metadata sidecar when no options', async () => {
    await storage.put('nometa.txt', new Uint8Array([1]))
    expect(existsSync(join(testDir, 'nometa.txt.meta.json'))).toBe(false)
  })

  it('creates parent directories as needed', async () => {
    await storage.put('deep/nested/file.txt', new Uint8Array([42]))
    expect(existsSync(join(testDir, 'deep', 'nested', 'file.txt'))).toBe(true)
  })
})

describe('get', () => {
  it('returns null for missing key', async () => {
    const result = await storage.get('nonexistent.bin')
    expect(result).toBeNull()
  })

  it('returns stored object with correct properties', async () => {
    await storage.put('read.bin', new Uint8Array([1, 2, 3]), { contentType: 'image/png' })
    const result = await storage.get('read.bin')

    expect(result).not.toBeNull()
    expect(result!.contentType).toBe('image/png')
    expect(result!.size).toBe(3)
    expect(result!.body).toBeInstanceOf(ReadableStream)
  })

  it('reads body content correctly', async () => {
    const data = new Uint8Array([10, 20, 30, 40])
    await storage.put('content.bin', data)
    const result = await storage.get('content.bin')

    const reader = result!.body.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const total = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0))
    let offset = 0
    for (const chunk of chunks) {
      total.set(chunk, offset)
      offset += chunk.length
    }
    expect(total).toEqual(data)
  })

  it('defaults to application/octet-stream without metadata', async () => {
    writeFileSync(join(testDir, 'raw.dat'), Buffer.from([1]))
    const result = await storage.get('raw.dat')
    expect(result!.contentType).toBe('application/octet-stream')
  })

  it('reads cacheControl from metadata', async () => {
    writeFileSync(join(testDir, 'cached.dat'), Buffer.from([1]))
    writeFileSync(
      join(testDir, 'cached.dat.meta.json'),
      JSON.stringify({ cacheControl: 'max-age=86400', contentType: 'text/html' })
    )
    const result = await storage.get('cached.dat')
    expect(result!.cacheControl).toBe('max-age=86400')
    expect(result!.contentType).toBe('text/html')
  })

  it('handles malformed metadata gracefully', async () => {
    writeFileSync(join(testDir, 'bad.dat'), Buffer.from([1]))
    writeFileSync(join(testDir, 'bad.dat.meta.json'), 'not-json')
    const result = await storage.get('bad.dat')
    expect(result).not.toBeNull()
    expect(result!.contentType).toBe('application/octet-stream')
  })
})

describe('delete', () => {
  it('deletes a file', async () => {
    await storage.put('delete-me.txt', new Uint8Array([1]))
    expect(existsSync(join(testDir, 'delete-me.txt'))).toBe(true)

    await storage.delete('delete-me.txt')
    expect(existsSync(join(testDir, 'delete-me.txt'))).toBe(false)
  })

  it('deletes associated metadata file', async () => {
    await storage.put('with-meta.txt', new Uint8Array([1]), { contentType: 'text/plain' })
    expect(existsSync(join(testDir, 'with-meta.txt.meta.json'))).toBe(true)

    await storage.delete('with-meta.txt')
    expect(existsSync(join(testDir, 'with-meta.txt.meta.json'))).toBe(false)
  })

  it('does not throw for missing files', async () => {
    await expect(storage.delete('does-not-exist.txt')).resolves.toBeUndefined()
  })
})

describe('list', () => {
  it('returns empty list for empty directory', async () => {
    const result = await storage.list()
    expect(result.items).toEqual([])
    expect(result.truncated).toBe(false)
  })

  it('lists stored files', async () => {
    await storage.put('a.txt', new Uint8Array([1]), { contentType: 'text/plain' })
    await storage.put('b.txt', new Uint8Array([2]))

    const result = await storage.list()
    expect(result.items).toHaveLength(2)

    const keys = result.items.map((i) => i.key).sort()
    expect(keys).toEqual(['a.txt', 'b.txt'])
  })

  it('includes file metadata', async () => {
    await storage.put('listed.txt', new Uint8Array([1, 2, 3]), { contentType: 'text/plain' })
    const result = await storage.list()
    const item = result.items.find((i) => i.key === 'listed.txt')

    expect(item).toBeDefined()
    expect(item!.size).toBe(3)
    expect(item!.contentType).toBe('text/plain')
    expect(item!.lastModified).toBeTruthy()
  })

  it('filters by prefix', async () => {
    await storage.put('images/logo.png', new Uint8Array([1]))
    await storage.put('docs/readme.txt', new Uint8Array([2]))
    await storage.put('root.txt', new Uint8Array([3]))

    const result = await storage.list('images/')
    expect(result.items).toHaveLength(1)
    expect(result.items[0].key).toBe('images/logo.png')
  })

  it('respects limit parameter', async () => {
    for (let i = 0; i < 5; i++) {
      await storage.put(`file-${i}.txt`, new Uint8Array([i]))
    }

    const result = await storage.list(undefined, undefined, 3)
    expect(result.items).toHaveLength(3)
  })

  it('excludes .meta.json sidecar files from listing', async () => {
    await storage.put('doc.txt', new Uint8Array([1]), { contentType: 'text/plain' })
    const result = await storage.list()

    const keys = result.items.map((i) => i.key)
    expect(keys).toContain('doc.txt')
    expect(keys).not.toContain('doc.txt.meta.json')
  })

  it('lists nested directory contents', async () => {
    await storage.put('sub/dir/file.txt', new Uint8Array([1]))
    const result = await storage.list()
    expect(result.items).toHaveLength(1)
    expect(result.items[0].key).toBe('sub/dir/file.txt')
  })
})

describe('getPresignedUrl', () => {
  it('returns CDN URL for local dev', async () => {
    const url = await storage.getPresignedUrl('some/file.png')
    expect(url).toBe('/cdn/blog/some/file.png')
  })
})
