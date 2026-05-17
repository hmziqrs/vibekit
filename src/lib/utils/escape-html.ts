export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escapeHtmlNullable(str: string | null | undefined): string | null {
  if (!str) return null
  return escapeHtml(str)
}
