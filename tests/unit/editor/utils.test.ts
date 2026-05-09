import { detectEmbedProvider, getEmbedUrl } from '$lib/editor/utils/detect-embed-provider'
import { countWords, extractText, readingTime } from '$lib/editor/utils/extract-text'
import { normalizeUrl, isValidUrl } from '$lib/editor/utils/normalize-url'
import { validateContent } from '$lib/editor/utils/validate-content'
import { describe, expect, it } from 'vitest'

describe(normalizeUrl, () => {
  it('adds https:// when no protocol', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com')
  })

  it('preserves existing https://', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com')
  })

  it('preserves existing http://', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
  })

  it('trims whitespace', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeUrl('')).toBe('')
  })
})

describe(isValidUrl, () => {
  it('accepts valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
  })

  it('accepts URLs without protocol', () => {
    expect(isValidUrl('example.com')).toBe(true)
  })

  it('rejects empty strings', () => {
    expect(isValidUrl('')).toBe(false)
  })

  it('rejects non-http protocols', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false)
  })
})

describe(extractText, () => {
  it('extracts text from a text node', () => {
    expect(extractText({ text: 'Hello', type: 'text' })).toBe('Hello')
  })

  it('extracts text from nested content', () => {
    const doc = {
      content: [
        {
          content: [
            { text: 'Hello ', type: 'text' },
            { text: 'World', type: 'text' },
          ],
          type: 'paragraph',
        },
      ],
      type: 'doc',
    }
    expect(extractText(doc)).toBe('Hello World')
  })

  it('returns empty string for nodes without text', () => {
    expect(extractText({ type: 'paragraph' })).toBe('')
  })
})

describe(countWords, () => {
  it('counts words in a string', () => {
    expect(countWords('hello world foo')).toBe(3)
  })

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0)
  })

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   ')).toBe(0)
  })
})

describe(readingTime, () => {
  it('returns 1 for very short text', () => {
    expect(readingTime(10)).toBe(1)
  })

  it('calculates reading time correctly', () => {
    expect(readingTime(400, 200)).toBe(2)
  })

  it('uses custom WPM', () => {
    expect(readingTime(300, 100)).toBe(3)
  })
})

describe(validateContent, () => {
  it('detects missing image alt text', () => {
    const doc = {
      content: [
        {
          content: [{ text: 'text', type: 'text' }],
          type: 'paragraph',
        },
        {
          attrs: { alt: '', src: 'test.jpg' },
          type: 'image',
        },
      ],
      type: 'doc',
    }
    const warnings = validateContent(doc)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].type).toBe('missing-alt')
  })

  it('detects empty headings', () => {
    const doc = {
      content: [
        {
          attrs: { level: 2 },
          content: [{ text: '', type: 'text' }],
          type: 'heading',
        },
      ],
      type: 'doc',
    }
    const warnings = validateContent(doc)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].type).toBe('empty-heading')
  })

  it('detects very long paragraphs', () => {
    const longText = 'a'.repeat(900)
    const doc = {
      content: [
        {
          content: [{ text: longText, type: 'text' }],
          type: 'paragraph',
        },
      ],
      type: 'doc',
    }
    const warnings = validateContent(doc)
    expect(warnings.some((w) => w.type === 'long-paragraph')).toBe(true)
  })

  it('returns no warnings for valid content', () => {
    const doc = {
      content: [
        {
          content: [{ text: 'Short paragraph', type: 'text' }],
          type: 'paragraph',
        },
      ],
      type: 'doc',
    }
    expect(validateContent(doc)).toHaveLength(0)
  })
})

describe(detectEmbedProvider, () => {
  it('detects YouTube URLs', () => {
    expect(detectEmbedProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.name).toBe('youtube')
  })

  it('detects YouTube short URLs', () => {
    expect(detectEmbedProvider('https://youtu.be/dQw4w9WgXcQ')?.name).toBe('youtube')
  })

  it('detects Twitter/X URLs', () => {
    expect(detectEmbedProvider('https://twitter.com/user/status/123456789')?.name).toBe('twitter')
  })

  it('detects X.com URLs', () => {
    expect(detectEmbedProvider('https://x.com/user/status/123456789')?.name).toBe('twitter')
  })

  it('detects Vimeo URLs', () => {
    expect(detectEmbedProvider('https://vimeo.com/12345')?.name).toBe('vimeo')
  })

  it('returns null for unknown URLs', () => {
    expect(detectEmbedProvider('https://example.com')).toBeNull()
  })
})

describe(getEmbedUrl, () => {
  it('converts YouTube watch URL to embed URL', () => {
    expect(getEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    )
  })

  it('converts YouTube short URL to embed URL', () => {
    expect(getEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    )
  })

  it('converts Vimeo URL to player URL', () => {
    expect(getEmbedUrl('https://vimeo.com/12345')).toBe('https://player.vimeo.com/video/12345')
  })

  it('returns original URL for unknown providers', () => {
    expect(getEmbedUrl('https://example.com')).toBe('https://example.com')
  })
})
