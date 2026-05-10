import TurndownService from 'turndown'

const td = new TurndownService({
  codeBlockStyle: 'fenced',
  headingStyle: 'atx',
})

td.addRule('figureImage', {
  filter: 'figure[data-figure-image]',
  replacement(_content, node) {
    const el = node as HTMLElement
    const img = el.querySelector('img')
    const caption = el.querySelector('figcaption')
    const alt = img?.getAttribute('alt') || ''
    const src = img?.getAttribute('src') || ''
    const cap = caption?.textContent?.trim()
    return cap ? `![${alt}](${src} "${cap}")\n\n` : `![${alt}](${src})\n\n`
  },
})

td.addRule('embedBlock', {
  filter: 'div[data-embed-block]',
  replacement(_content, node) {
    const el = node as HTMLElement
    const iframe = el.querySelector('iframe')
    const src = iframe?.getAttribute('src') || ''
    return `[embed](${src})\n\n`
  },
})

td.addRule('pullQuote', {
  filter: 'blockquote[data-pull-quote]',
  replacement(_content, node) {
    const el = node as HTMLElement
    const p = el.querySelector('p')
    const cite = el.querySelector('cite')
    const text = p?.textContent?.trim() || ''
    const attribution = cite?.textContent?.trim()
    const lines = [`> ${text}`]
    if (attribution) lines.push(`> — ${attribution}`)
    return `${lines.join('\n')}\n\n`
  },
})

td.addRule('relatedArticle', {
  filter: 'div[data-related-article]',
  replacement(_content, node) {
    const el = node as HTMLElement
    const link = el.querySelector('a')
    const href = link?.getAttribute('href') || ''
    const title = link?.textContent?.trim() || ''
    return `[related: ${title}](/blog/${href})\n\n`
  },
})

td.addRule('factBox', {
  filter: 'div[data-fact-box]',
  replacement(content, node) {
    const el = node as HTMLElement
    const title = el.querySelector('h4')?.textContent?.trim() || 'Key Facts'
    return `:::fact-box[${title}]\n${content}\n:::\n\n`
  },
})

td.addRule('correctionNote', {
  filter: 'div[data-correction-note]',
  replacement(content) {
    return `:::correction\n${content.trim()}\n:::\n\n`
  },
})

td.addRule('updateNote', {
  filter: 'div[data-update-note]',
  replacement(content) {
    return `:::update\n${content.trim()}\n:::\n\n`
  },
})

export function exportToMarkdown(html: string): string {
  return td.turndown(html)
}
