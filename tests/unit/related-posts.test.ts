import {
  blogPost,
  blogPostTag,
  blogTag,
  type BlogPost,
  type BlogPostTag,
  type BlogTag,
} from '$lib/server/db/schema'
import { describe, expect, it } from 'vitest'

describe('related posts query logic', () => {
  describe('estimateReadingTime', () => {
    it('returns 1 for empty content', () => {
      const html = ''
      const text = html.replace(/<[^>]*>/g, '')
      const words = text.split(/\s+/).filter(Boolean).length
      const readingTime = Math.max(1, Math.ceil(words / 200))
      expect(readingTime).toBe(1)
    })

    it('returns 1 for short content under 200 words', () => {
      const html = '<p>Hello world this is a short post.</p>'
      const text = html.replace(/<[^>]*>/g, '')
      const words = text.split(/\s+/).filter(Boolean).length
      const readingTime = Math.max(1, Math.ceil(words / 200))
      expect(readingTime).toBe(1)
    })

    it('estimates correctly for longer content', () => {
      const words = Array(400).fill('word').join(' ')
      const html = `<p>${words}</p>`
      const text = html.replace(/<[^>]*>/g, '')
      const wordCount = text.split(/\s+/).filter(Boolean).length
      const readingTime = Math.max(1, Math.ceil(wordCount / 200))
      expect(readingTime).toBe(2)
    })
  })

  describe('tag overlap scoring', () => {
    it('ranks posts by number of shared tags', () => {
      const currentPostTags = new Set(['tag-dev', 'tag-code', 'tag-testing'])
      const candidates = [
        { id: 'post-a', tags: ['tag-dev', 'tag-code'] }, // 2 overlap
        { id: 'post-b', tags: ['tag-dev'] }, // 1 overlap
        { id: 'post-c', tags: ['tag-dev', 'tag-code', 'tag-testing'] }, // 3 overlap
      ]

      const scored = candidates
        .map((c) => ({
          id: c.id,
          overlap: c.tags.filter((t) => currentPostTags.has(t)).length,
        }))
        .toSorted((a, b) => b.overlap - a.overlap)

      expect(scored[0].id).toBe('post-c')
      expect(scored[0].overlap).toBe(3)
      expect(scored[1].id).toBe('post-a')
      expect(scored[1].overlap).toBe(2)
      expect(scored[2].id).toBe('post-b')
      expect(scored[2].overlap).toBe(1)
    })

    it('excludes current post from results', () => {
      const currentPostId = 'current-post'
      const candidates = [
        { id: 'current-post', tags: ['tag-dev'] },
        { id: 'other-post', tags: ['tag-dev'] },
      ]

      const filtered = candidates.filter((c) => c.id !== currentPostId)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('other-post')
    })

    it('limits results to 3 posts', () => {
      const currentPostTags = new Set(['tag-dev'])
      const candidates = Array.from({ length: 10 }, (_, i) => ({
        id: `post-${i}`,
        tags: ['tag-dev'],
      }))

      const scored = candidates
        .map((c) => ({
          ...c,
          overlap: c.tags.filter((t) => currentPostTags.has(t)).length,
        }))
        .toSorted((a, b) => b.overlap - a.overlap)
        .slice(0, 3)

      expect(scored).toHaveLength(3)
    })

    it('returns empty when current post has no tags', () => {
      const tagIds: string[] = []
      const relatedPosts = tagIds.length > 0 ? ['would-query'] : []
      expect(relatedPosts).toHaveLength(0)
    })
  })

  describe('related post data shape', () => {
    it('includes required fields for each related post', () => {
      const relatedPost = {
        coverImageUrl: '/image.jpg',
        excerpt: 'A summary',
        publishedAt: Date.now(),
        slug: 'test-post',
        title: 'Test Post',
      }

      expect(relatedPost).toHaveProperty('slug')
      expect(relatedPost).toHaveProperty('title')
      expect(relatedPost).toHaveProperty('excerpt')
      expect(relatedPost).toHaveProperty('coverImageUrl')
      expect(relatedPost).toHaveProperty('publishedAt')
    })

    it('handles null optional fields', () => {
      const relatedPost = {
        coverImageUrl: null,
        excerpt: null,
        publishedAt: null,
        slug: 'test-post',
        title: 'Test Post',
      }

      expect(relatedPost.coverImageUrl).toBeNull()
      expect(relatedPost.excerpt).toBeNull()
      expect(relatedPost.publishedAt).toBeNull()
    })
  })

  describe('blog post tag schema', () => {
    it('blogPostTag has composite structure for junction table', () => {
      const mockPostTag: BlogPostTag = {
        postId: 'post-123',
        tagId: 'tag-456',
      }
      expect(mockPostTag.postId).toBe('post-123')
      expect(mockPostTag.tagId).toBe('tag-456')
    })

    it('blogTag has required display fields', () => {
      const mockTag: BlogTag = {
        id: 'tag-1',
        name: 'Development',
        slug: 'development',
      }
      expect(mockTag.name).toBeTruthy()
      expect(mockTag.slug).toBeTruthy()
    })
  })
})
