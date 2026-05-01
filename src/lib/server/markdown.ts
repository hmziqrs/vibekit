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

// Basic HTML sanitization for rendered markdown
// Note: This provides basic XSS protection. For production, consider
// Integrating a full sanitizer like DOMPurify with a DOM shim for
// Cloudflare Workers.
const ALLOWED_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'ul',
  'ol',
  'li',
  'a',
  'strong',
  'em',
  'code',
  'pre',
  'blockquote',
  'del',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'input',
])

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
