import { micromark } from 'micromark'
import { gfm, gfmHtml } from 'micromark-extension-gfm'

export function renderMarkdown(raw: string): string {
  if (!raw) {
    return ''
  }

  return micromark(raw, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  })
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
}

export function renderAndSanitize(raw: string): string {
  return sanitizeHtml(renderMarkdown(raw))
}
