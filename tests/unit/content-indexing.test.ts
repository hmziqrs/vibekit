import { describe, expect, it } from 'vitest'

describe('Content Indexing', () => {
  describe('SearchDocument construction', () => {
    interface SearchDocument {
      content: string
      entityId: string
      entityType: string
      metadata?: Record<string, unknown>
      title: string
    }

    function buildBlogDocument(post: {
      contentBody: string | null
      excerpt: string | null
      id: string
      slug: string
      status: string
      title: string | null
    }): SearchDocument {
      return {
        content: [post.excerpt ?? '', post.contentBody ?? ''].join('\n').slice(0, 5000),
        entityId: post.id,
        entityType: 'blog_post',
        metadata: { slug: post.slug, status: post.status },
        title: post.title ?? post.slug,
      }
    }

    function buildItemDocument(row: {
      description: string | null
      id: string
      name: string
      status: string
    }): SearchDocument {
      return {
        content: row.description ?? '',
        entityId: row.id,
        entityType: 'item',
        metadata: { status: row.status },
        title: row.name,
      }
    }

    it('builds blog document with all fields', () => {
      const doc = buildBlogDocument({
        contentBody: '<p>Hello world</p>',
        excerpt: 'A test post',
        id: 'post-1',
        slug: 'test-post',
        status: 'published',
        title: 'Test Post',
      })

      expect(doc.title).toBe('Test Post')
      expect(doc.entityType).toBe('blog_post')
      expect(doc.entityId).toBe('post-1')
      expect(doc.content).toContain('A test post')
      expect(doc.content).toContain('<p>Hello world</p>')
      expect(doc.metadata).toEqual({ slug: 'test-post', status: 'published' })
    })

    it('falls back to slug when title is null', () => {
      const doc = buildBlogDocument({
        contentBody: 'content',
        excerpt: null,
        id: 'post-2',
        slug: 'no-title',
        status: 'draft',
        title: null,
      })

      expect(doc.title).toBe('no-title')
    })

    it('handles null excerpt and contentBody', () => {
      const doc = buildBlogDocument({
        contentBody: null,
        excerpt: null,
        id: 'post-3',
        slug: 'empty',
        status: 'draft',
        title: 'Empty Post',
      })

      expect(doc.content).toBe('\n')
    })

    it('truncates content to 5000 chars', () => {
      const longContent = 'x'.repeat(10000)
      const doc = buildBlogDocument({
        contentBody: longContent,
        excerpt: 'short',
        id: 'post-4',
        slug: 'long',
        status: 'published',
        title: 'Long Post',
      })

      expect(doc.content.length).toBeLessThanOrEqual(5000)
    })

    it('builds item document with all fields', () => {
      const doc = buildItemDocument({
        description: 'A test item',
        id: 'item-1',
        name: 'Test Item',
        status: 'active',
      })

      expect(doc.title).toBe('Test Item')
      expect(doc.entityType).toBe('item')
      expect(doc.entityId).toBe('item-1')
      expect(doc.content).toBe('A test item')
      expect(doc.metadata).toEqual({ status: 'active' })
    })

    it('handles null item description', () => {
      const doc = buildItemDocument({
        description: null,
        id: 'item-2',
        name: 'No Desc',
        status: 'active',
      })

      expect(doc.content).toBe('')
    })
  })

  describe('Indexing decision logic', () => {
    function shouldIndex(status: string): boolean {
      return status !== 'archived'
    }

    it('indexes published posts', () => {
      expect(shouldIndex('published')).toBe(true)
    })

    it('indexes draft posts', () => {
      expect(shouldIndex('draft')).toBe(true)
    })

    it('indexes scheduled posts', () => {
      expect(shouldIndex('scheduled')).toBe(true)
    })

    it('does not index archived posts', () => {
      expect(shouldIndex('archived')).toBe(false)
    })
  })

  describe('Content concatenation', () => {
    function buildContent(excerpt: string | null, body: string | null): string {
      return [excerpt ?? '', body ?? ''].join('\n').slice(0, 5000)
    }

    it('joins excerpt and body with newline', () => {
      expect(buildContent('Intro', 'Body')).toBe('Intro\nBody')
    })

    it('handles missing excerpt', () => {
      expect(buildContent(null, 'Body')).toBe('\nBody')
    })

    it('handles missing body', () => {
      expect(buildContent('Intro', null)).toBe('Intro\n')
    })

    it('handles both missing', () => {
      expect(buildContent(null, null)).toBe('\n')
    })
  })
})
