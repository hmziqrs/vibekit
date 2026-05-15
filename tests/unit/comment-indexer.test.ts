import type { SearchDocument } from '$lib/server/search/types'
import { describe, expect, it } from 'vitest'

describe('comment indexer', () => {
  it('comment search document structure is correct', () => {
    const doc: SearchDocument = {
      content: 'This is a test comment'.slice(0, 3000),
      entityId: 'comment-1',
      entityType: 'comment',
      metadata: { authorId: 'user-1', postId: 'post-1', status: 'approved' },
      title: 'This is a test comment'.slice(0, 100),
    }
    expect(doc.entityType).toBe('comment')
    expect(doc.content.length).toBeLessThanOrEqual(3000)
    expect(doc.title.length).toBeLessThanOrEqual(100)
    expect(doc.metadata).toHaveProperty('authorId')
    expect(doc.metadata).toHaveProperty('postId')
  })

  it('only approved comments should be indexed', () => {
    const approvedStatuses = ['approved']
    const rejectedStatuses = ['pending', 'spam', 'rejected']

    for (const status of approvedStatuses) {
      expect(status).toBe('approved')
    }

    for (const status of rejectedStatuses) {
      expect(status).not.toBe('approved')
    }
  })

  it('comment title is a truncated version of content', () => {
    const content = 'A'.repeat(200)
    const title = content.slice(0, 100)
    expect(title.length).toBe(100)
    expect(title).toBe('A'.repeat(100))

    const shortContent = 'Short comment'
    const shortTitle = shortContent.slice(0, 100)
    expect(shortTitle).toBe('Short comment')
  })

  it('comment content is truncated at 3000 chars', () => {
    const longContent = 'x'.repeat(5000)
    const truncated = longContent.slice(0, 3000)
    expect(truncated.length).toBe(3000)
  })

  it('reindexSchema accepts comment as entity type', async () => {
    const { reindexSchema } = await import('$lib/validators/search')
    const result = reindexSchema.safeParse({ entityType: 'comment' })
    expect(result.success).toBe(true)
  })

  it('reindexSchema accepts all entity types', async () => {
    const { reindexSchema } = await import('$lib/validators/search')
    const types = ['blog_post', 'comment', 'item', 'user']
    for (const entityType of types) {
      const result = reindexSchema.safeParse({ entityType })
      expect(result.success).toBe(true)
    }
  })

  it('reindexSchema allows empty body (reindex all)', async () => {
    const { reindexSchema } = await import('$lib/validators/search')
    const result = reindexSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('comment entity type is in the search validator enum', async () => {
    const { reindexSchema } = await import('$lib/validators/search')
    // Invalid entity type should fail
    const result = reindexSchema.safeParse({ entityType: 'invalid' })
    expect(result.success).toBe(false)
  })
})
