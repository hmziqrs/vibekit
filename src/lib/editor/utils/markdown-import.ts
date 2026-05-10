import { marked } from 'marked'

import { cleanPastedHtml } from './clean-paste'

export async function importMarkdown(md: string): Promise<string> {
  const html = (await marked.parse(md)) as string
  return cleanPastedHtml(html)
}
