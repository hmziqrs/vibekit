import purify from 'isomorphic-dompurify'
import { micromark } from 'micromark'
import { gfm, gfmHtml } from 'micromark-extension-gfm'

function renderMarkdown(raw: string): string {
  if (!raw) {
    return ''
  }

  return micromark(raw, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  })
}

function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['style', 'formaction', 'xlink:href', 'data', 'dynsrc', 'lowsrc'],
    FORBID_TAGS: ['style', 'form', 'input', 'textarea', 'select', 'button'],
  })
}

export function renderAndSanitize(raw: string): string {
  return sanitizeHtml(renderMarkdown(raw))
}
