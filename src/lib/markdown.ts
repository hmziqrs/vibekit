import { escapeHtml } from '$lib/utils/escape-html'
import hljs from 'highlight.js'
import { sanitize } from 'isomorphic-dompurify'
import { micromark } from 'micromark'
import { gfm, gfmHtml } from 'micromark-extension-gfm'

const CODE_BLOCK_RE = /<pre><code(?:\s+class="language-(\w+)")?>([\s\S]*?)<\/code><\/pre>/g

function unescapeHtml(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

function highlightCodeBlocks(html: string): string {
  return html.replace(CODE_BLOCK_RE, (_match, lang: string | undefined, code: string) => {
    const rawCode = unescapeHtml(code).trim()
    const highlighted =
      lang && hljs.getLanguage(lang)
        ? hljs.highlight(rawCode, { language: lang }).value
        : hljs.highlightAuto(rawCode).value

    const langAttr = lang ? ` class="language-${lang} hljs"` : ' class="hljs"'
    return `<pre><code${langAttr}>${highlighted}</code></pre>`
  })
}

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
  return sanitize(html, {
    ADD_ATTR: ['target'],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['style', 'formaction', 'xlink:href', 'data', 'dynsrc', 'lowsrc'],
    FORBID_TAGS: ['style', 'form', 'input', 'textarea', 'select', 'button'],
  })
}

export function renderAndSanitize(raw: string): string {
  const html = renderMarkdown(raw)
  const highlighted = highlightCodeBlocks(html)
  return sanitizeHtml(highlighted)
}

export { escapeHtml, highlightCodeBlocks, renderMarkdown, sanitizeHtml }
