import type { JSONContent } from '@tiptap/core'

export interface TocItem {
  id: string
  level: number
  text: string
}

export function extractToc(content: JSONContent): TocItem[] {
  const items: TocItem[] = []
  walkContent(content, items)
  return items
}

function walkContent(node: JSONContent, items: TocItem[]) {
  if (node.type === 'heading' && node.attrs?.level && node.content) {
    const level = node.attrs.level as number
    if (level >= 2 && level <= 4) {
      const text = extractTextContent(node)
      if (text) {
        items.push({
          id: slugify(text),
          level,
          text,
        })
      }
    }
  }
  if (node.content) {
    for (const child of node.content) {
      walkContent(child, items)
    }
  }
}

function extractTextContent(node: JSONContent): string {
  if (node.type === 'text' && node.text) return node.text
  if (node.content) return node.content.map(extractTextContent).join('')
  return ''
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
