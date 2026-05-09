import type { JSONContent } from '@tiptap/core'

export function extractText(content: JSONContent): string {
  if (content.type === 'text' && content.text) {
    return content.text
  }

  if (content.content) {
    return content.content.map(extractText).join('')
  }

  return ''
}

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function readingTime(wordCount: number, wpm = 200): number {
  return Math.max(1, Math.ceil(wordCount / wpm))
}
