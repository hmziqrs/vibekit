import type { Page } from '@playwright/test'

import { THRESHOLD } from './constants'
import type { ClientEvidence, ServerEvidence } from './types'

export async function fetchServerEvidence(page: Page, url: string): Promise<ServerEvidence> {
  const resp = await page.request.get(url, { maxRedirects: 0 })
  const status = resp.status()
  const html = await resp.text().catch(() => '')
  const headers: Record<string, string> = resp.headers()

  const bodyTextLength = extractBodyTextLength(html)
  const hasSvelteKitRuntime = html.includes('__sveltekit') || html.includes('sveltekit:')
  const hasHydrationData = html.includes('data-sveltekit-fetched') || html.includes('__data')
  const hasScripts =
    html.includes('<script') &&
    (html.includes('.js') || html.includes('type="module"') || html.includes('__sveltekit'))

  return {
    bodyTextLength,
    hasHydrationData,
    hasScripts,
    hasSvelteKitRuntime,
    headers,
    html,
    htmlSize: html.length,
    isEmptyShell: bodyTextLength < THRESHOLD.EMPTY_SHELL,
    isPopulated: bodyTextLength > THRESHOLD.POPULATED_BODY,
    status,
  }
}

export async function fetchClientEvidence(
  page: Page,
  url: string,
  serverBodyText: number
): Promise<ClientEvidence> {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(200)

  interface WindowWithSvelteKit extends Window {
    __sveltekit?: unknown
    start_app?: unknown
  }

  const hydrated = await page.evaluate(
    () =>
      Boolean((window as WindowWithSvelteKit).__sveltekit) ||
      Boolean((window as WindowWithSvelteKit).start_app) ||
      document.documentElement.innerHTML.includes('__sveltekit')
  )
  const bodyTextLength = await page.evaluate(
    () => document.body.textContent.replace(/\s+/g, ' ').trim().length
  )
  const finalHTMLSize = (await page.content()).length

  return {
    bodyTextDelta: bodyTextLength - serverBodyText,
    bodyTextLength,
    finalHTMLSize,
    hydrated,
  }
}

function extractBodyTextLength(html: string): number {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return (
    match?.[1]
      ?.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim().length ?? 0
  )
}
