import { escapeHtml } from './escape-html'

export function highlightMatch(text: string, term: string): string {
  const escaped = escapeHtml(text)
  if (!term) return escaped
  const escapedTerm = escapeHtml(term)
  const regex = new RegExp(`(${escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)})`, 'gi')
  return escaped.replace(
    regex,
    '<mark class="bg-brand/20 text-text-primary rounded px-0.5">$1</mark>'
  )
}
