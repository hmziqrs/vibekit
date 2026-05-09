import type { JSONContent } from '@tiptap/core'

export interface ContentWarning {
  type: string
  message: string
  path?: string
}

export function validateContent(doc: JSONContent): ContentWarning[] {
  const warnings: ContentWarning[] = []

  walkNodes(doc, (node, path) => {
    if (node.type === 'image' && node.attrs && !node.attrs.alt) {
      warnings.push({ message: 'Image missing alt text', path, type: 'missing-alt' })
    }

    if ((node.type === 'heading' || node.type === 'figureImage') && node.content) {
      const text = node.content.map((c) => (c.type === 'text' && c.text) || '').join('')
      if (!text.trim() && node.type === 'heading') {
        warnings.push({ message: 'Empty heading found', path, type: 'empty-heading' })
      }
    }

    if (node.type === 'paragraph' && node.content) {
      const text = node.content.map((c) => (c.type === 'text' && c.text) || '').join('')
      if (text.length > 800) {
        warnings.push({
          message: `Very long paragraph (${text.length} chars)`,
          path,
          type: 'long-paragraph',
        })
      }
    }
  })

  return warnings
}

function walkNodes(
  node: JSONContent,
  visitor: (node: JSONContent, path: string) => void,
  path = ''
) {
  visitor(node, path || '/')
  if (node.content) {
    node.content.forEach((child, i) => {
      walkNodes(child, visitor, `${path}/${node.type}[${i}]`)
    })
  }
}
