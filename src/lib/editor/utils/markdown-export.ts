import TurndownService from 'turndown'

// eslint-disable-next-line typescript-eslint/consistent-type-definitions
type Filter = Parameters<TurndownService['addRule']>[1]['filter']

const td = new TurndownService({
  codeBlockStyle: 'fenced',
  headingStyle: 'atx',
})

td.addRule('figureImage', {
  filter: 'figure[data-figure-image]' as Filter,
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
  filter: 'div[data-embed-block]' as Filter,
  replacement(_content, node) {
    const el = node as HTMLElement
    const iframe = el.querySelector('iframe')
    const src = iframe?.getAttribute('src') || ''
    return `[embed](${src})\n\n`
  },
})

td.addRule('pullQuote', {
  filter: 'blockquote[data-pull-quote]' as Filter,
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
  filter: 'div[data-related-article]' as Filter,
  replacement(_content, node) {
    const el = node as HTMLElement
    const link = el.querySelector('a')
    const href = link?.getAttribute('href') || ''
    const title = link?.textContent?.trim() || ''
    return `[related: ${title}](/blog/${href})\n\n`
  },
})

td.addRule('factBox', {
  filter: 'div[data-fact-box]' as Filter,
  replacement(content, node) {
    const el = node as HTMLElement
    const title = el.querySelector('h4')?.textContent?.trim() || 'Key Facts'
    return `:::fact-box[${title}]\n${content}\n:::\n\n`
  },
})

td.addRule('correctionNote', {
  filter: 'div[data-correction-note]' as Filter,
  replacement(content) {
    return `:::correction\n${content.trim()}\n:::\n\n`
  },
})

td.addRule('updateNote', {
  filter: 'div[data-update-note]' as Filter,
  replacement(content) {
    return `:::update\n${content.trim()}\n:::\n\n`
  },
})

export function exportToMarkdown(html: string): string {
  return td.turndown(html)
}
