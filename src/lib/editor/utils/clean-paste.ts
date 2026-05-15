import { Extension } from '@tiptap/core'

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'del',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'pre',
  'code',
  'span',
  'div',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
}

function filterTag(tag: string, attrs: string): string {
  const allowed = ALLOWED_ATTRS[tag]
  if (!allowed) {
    return `<${tag}>`
  }

  const filteredAttrs = attrs
    .split(/\s+/)
    .filter((attr: string) => {
      const name = attr.split('=')[0].toLowerCase()
      return allowed.has(name)
    })
    .filter((attr: string) => {
      // Block javascript:, data:, and vbscript: URIs in href/src
      const value = attr.split('=')[1]?.toLowerCase() ?? ''
      const unquoted = value.replace(/^["']|["']$/g, '')
      return !/^\s*(javascript|vbscript|data)\s*:/i.test(unquoted)
    })
    .join(' ')

  return filteredAttrs ? `<${tag} ${filteredAttrs}>` : `<${tag}>`
}

function processTag(parts: string[]): string {
  const [, closing, tag, attrs] = parts
  const lowerTag = tag.toLowerCase()

  if (!ALLOWED_TAGS.has(lowerTag)) {
    return ''
  }

  if (closing) {
    return `</${lowerTag}>`
  }

  return filterTag(lowerTag, attrs)
}

export function sanitizeHtml(html: string): string {
  return html.replace(/<\s*(\/?)\s*(\w+)([^>]*)>/g, (...args: string[]) => processTag(args))
}

export function cleanPastedHtml(html: string): string {
  let clean = html

  // Remove Google Docs wrapper
  clean = clean.replace(/<meta[^>]*>/gi, '')

  // Remove Word-specific markup
  clean = clean.replace(/<!--\[if.*?<!\[endif\]-->/gs, '')
  clean = clean.replace(/<o:p>.*?<\/o:p>/gi, '')
  clean = clean.replace(/<(\w+)[^>]*\sclass="Mso[^"]*"[^>]*>/gi, '<$1>')

  // Remove XML declarations
  clean = clean.replace(/<\?xml[^>]*>/gi, '')

  // Remove inline styles
  clean = clean.replace(/\s+style="[^"]*"/gi, '')

  // Remove class attributes (after extracting Word class above)
  clean = clean.replace(/\s+class="[^"]*"/gi, '')

  // Remove empty spans
  clean = clean.replace(/<span><\/span>/gi, '')

  // Remove spans with only whitespace content
  clean = clean.replace(/<span>\s*<\/span>/gi, '')

  // Unwrap spans that lost all attributes
  clean = clean.replace(/<span>(.*?)<\/span>/gi, '$1')

  // Remove unnecessary divs (convert to paragraphs)
  clean = clean.replace(/<div>/gi, '<p>')
  clean = clean.replace(/<\/div>/gi, '</p>')

  // Strip tags and attrs via sanitizeHtml
  clean = sanitizeHtml(clean)

  // Collapse multiple blank lines
  clean = clean.replace(/(<p>\s*<\/p>){3,}/gi, '<p><br></p>')

  return clean
}

export const CleanPaste = Extension.create({
  addProseMirrorPlugins() {
    return []
  },

  name: 'cleanPaste',

  transformPastedHTML(html) {
    return cleanPastedHtml(html)
  },
})
