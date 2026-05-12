import { describe, expect, it, vi } from 'vitest'

describe('Search Dialog Utilities', () => {
  describe('highlightMatch', () => {
    function highlightMatch(text: string, term: string): string {
      if (!term) return text
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      return text.replace(regex, '<mark>$1</mark>')
    }

    it('highlights matching text', () => {
      expect(highlightMatch('Hello World', 'world')).toBe('Hello <mark>World</mark>')
    })

    it('highlights case-insensitively', () => {
      expect(highlightMatch('Hello World', 'hello')).toBe('<mark>Hello</mark> World')
    })

    it('returns original text when no term', () => {
      expect(highlightMatch('Hello World', '')).toBe('Hello World')
    })

    it('escapes regex special characters in term', () => {
      expect(highlightMatch('test (group)', '(group)')).toBe(
        'test <mark>(group)</mark>'
      )
    })

    it('highlights multiple occurrences', () => {
      expect(highlightMatch('test test test', 'test')).toBe(
        '<mark>test</mark> <mark>test</mark> <mark>test</mark>'
      )
    })

    it('handles text with no matches', () => {
      expect(highlightMatch('Hello World', 'xyz')).toBe('Hello World')
    })
  })

  describe('getTypeLabel', () => {
    function getTypeLabel(type: string): string {
      switch (type) {
        case 'blog_post':
          return 'Blog'
        case 'user':
          return 'User'
        case 'item':
          return 'Item'
        case 'page':
          return 'Page'
        default:
          return type
      }
    }

    it('returns correct label for blog_post', () => {
      expect(getTypeLabel('blog_post')).toBe('Blog')
    })

    it('returns correct label for user', () => {
      expect(getTypeLabel('user')).toBe('User')
    })

    it('returns correct label for item', () => {
      expect(getTypeLabel('item')).toBe('Item')
    })

    it('returns correct label for page', () => {
      expect(getTypeLabel('page')).toBe('Page')
    })

    it('returns type as-is for unknown types', () => {
      expect(getTypeLabel('custom_type')).toBe('custom_type')
    })
  })

  describe('buildResultUrl', () => {
    function buildResultUrl(result: { entityId: string; entityType: string }, query: string): string {
      switch (result.entityType) {
        case 'blog_post':
          return `/admin/blog/${result.entityId}/edit`
        case 'user':
          return `/admin/users`
        case 'item':
          return `/app/items`
        default:
          return `/app/search?q=${encodeURIComponent(query)}`
      }
    }

    it('routes blog_post to admin edit page', () => {
      expect(buildResultUrl({ entityId: '123', entityType: 'blog_post' }, 'test')).toBe(
        '/admin/blog/123/edit'
      )
    })

    it('routes user to admin users page', () => {
      expect(buildResultUrl({ entityId: '456', entityType: 'user' }, 'test')).toBe('/admin/users')
    })

    it('routes item to app items page', () => {
      expect(buildResultUrl({ entityId: '789', entityType: 'item' }, 'test')).toBe('/app/items')
    })

    it('routes unknown type to search page', () => {
      expect(buildResultUrl({ entityId: 'abc', entityType: 'unknown' }, 'my query')).toBe(
        '/app/search?q=my%20query'
      )
    })
  })

  describe('Recent Searches localStorage', () => {
    const STORAGE_KEY = 'vibekit:recent-searches'
    const MAX_RECENT = 5

    function saveRecentSearch(
      term: string,
      current: string[],
    ): string[] {
      const trimmed = term.trim()
      if (!trimmed) return current
      return [trimmed, ...current.filter((s) => s !== trimmed)].slice(0, MAX_RECENT)
    }

    it('adds new search to front of list', () => {
      const result = saveRecentSearch('new term', ['old term'])
      expect(result).toEqual(['new term', 'old term'])
    })

    it('moves existing search to front', () => {
      const result = saveRecentSearch('existing', ['existing', 'other'])
      expect(result).toEqual(['existing', 'other'])
    })

    it('trims whitespace', () => {
      const result = saveRecentSearch('  spaced  ', [])
      expect(result).toEqual(['spaced'])
    })

    it('ignores empty strings', () => {
      const result = saveRecentSearch('  ', ['existing'])
      expect(result).toEqual(['existing'])
    })

    it('limits to MAX_RECENT items', () => {
      const current = ['a', 'b', 'c', 'd', 'e']
      const result = saveRecentSearch('new', current)
      expect(result).toHaveLength(MAX_RECENT)
      expect(result[0]).toBe('new')
    })

    it('removes duplicate from middle when adding new', () => {
      const current = ['first', 'duplicate', 'third']
      const result = saveRecentSearch('duplicate', current)
      expect(result).toEqual(['duplicate', 'first', 'third'])
    })
  })

  describe('Search query sanitization', () => {
    function sanitizeQuery(query: string): string {
      return query.replace(/["*]/g, '').trim()
    }

    it('removes double quotes', () => {
      expect(sanitizeQuery('"hello"')).toBe('hello')
    })

    it('removes asterisks', () => {
      expect(sanitizeQuery('hello*')).toBe('hello')
    })

    it('removes both quotes and asterisks', () => {
      expect(sanitizeQuery('"*hello*"')).toBe('hello')
    })

    it('trims whitespace', () => {
      expect(sanitizeQuery('  hello  ')).toBe('hello')
    })

    it('preserves normal text', () => {
      expect(sanitizeQuery('hello world')).toBe('hello world')
    })
  })
})
