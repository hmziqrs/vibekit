import { extractToc, type TocItem } from '$lib/editor/utils/extract-toc'
import { describe, expect, it } from 'vitest'

describe(extractToc, () => {
  it('extracts headings from content', () => {
    const content = {
      content: [
        {
          attrs: { level: 2 },
          content: [{ text: 'Introduction', type: 'text' }],
          type: 'heading',
        },
        { type: 'paragraph', content: [{ text: 'Some text', type: 'text' }] },
        {
          attrs: { level: 3 },
          content: [{ text: 'Details', type: 'text' }],
          type: 'heading',
        },
      ],
      type: 'doc',
    }

    const items = extractToc(content)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({ id: 'introduction', level: 2, text: 'Introduction' })
    expect(items[1]).toEqual({ id: 'details', level: 3, text: 'Details' })
  })

  it('only includes heading levels 2-4', () => {
    const content = {
      content: [
        { attrs: { level: 1 }, content: [{ text: 'H1', type: 'text' }], type: 'heading' },
        { attrs: { level: 2 }, content: [{ text: 'H2', type: 'text' }], type: 'heading' },
        { attrs: { level: 3 }, content: [{ text: 'H3', type: 'text' }], type: 'heading' },
        { attrs: { level: 4 }, content: [{ text: 'H4', type: 'text' }], type: 'heading' },
        { attrs: { level: 5 }, content: [{ text: 'H5', type: 'text' }], type: 'heading' },
      ],
      type: 'doc',
    }

    const items = extractToc(content)
    expect(items).toHaveLength(3)
    expect(items.map((i) => i.level)).toEqual([2, 3, 4])
  })

  it('slugifies heading text for IDs', () => {
    const content = {
      content: [
        {
          attrs: { level: 2 },
          content: [{ text: 'Hello World! Foo Bar', type: 'text' }],
          type: 'heading',
        },
      ],
      type: 'doc',
    }

    const items = extractToc(content)
    expect(items[0].id).toBe('hello-world-foo-bar')
  })

  it('handles special characters in slugify', () => {
    const content = {
      content: [
        {
          attrs: { level: 2 },
          content: [{ text: "What's New? (2024)", type: 'text' }],
          type: 'heading',
        },
      ],
      type: 'doc',
    }

    const items = extractToc(content)
    expect(items[0].id).toBe('what-s-new-2024')
  })

  it('skips headings without text content', () => {
    const content = {
      content: [
        { attrs: { level: 2 }, type: 'heading' },
        { attrs: { level: 2 }, content: [{ text: 'Valid', type: 'text' }], type: 'heading' },
      ],
      type: 'doc',
    }

    const items = extractToc(content)
    expect(items).toHaveLength(1)
    expect(items[0].text).toBe('Valid')
  })

  it('returns empty array for empty content', () => {
    expect(extractToc({ type: 'doc' })).toEqual([])
    expect(extractToc({ type: 'doc', content: [] })).toEqual([])
  })

  it('walks nested content', () => {
    const content = {
      content: [
        {
          content: [
            {
              attrs: { level: 2 },
              content: [{ text: 'Nested', type: 'text' }],
              type: 'heading',
            },
          ],
          type: 'paragraph',
        },
      ],
      type: 'doc',
    }

    const items = extractToc(content)
    expect(items).toHaveLength(1)
    expect(items[0].text).toBe('Nested')
  })

  it('concatenates multiple text nodes in a heading', () => {
    const content = {
      content: [
        {
          attrs: { level: 2 },
          content: [
            { text: 'Part 1 ', type: 'text' },
            { text: 'Part 2', type: 'text' },
          ],
          type: 'heading',
        },
      ],
      type: 'doc',
    }

    const items = extractToc(content)
    expect(items[0].text).toBe('Part 1 Part 2')
    expect(items[0].id).toBe('part-1-part-2')
  })
})
