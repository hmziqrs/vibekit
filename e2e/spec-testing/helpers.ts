import type { RenderingStrategy } from './types'

export async function captureServerHTML(page: any, url: string): Promise<string> {
  let serverHTML = ''
  await page.route(url, async (route: any) => {
    const response = await route.fetch()
    serverHTML = await response.text()
    await route.fulfill({ response })
  })
  await page.goto(url, { waitUntil: 'commit' })
  return serverHTML
}

export async function captureResponse(page: any, url: string): Promise<{ status: number; body: string; headers: Record<string, string> }> {
  const response = await page.request.get(url, { maxRedirects: 0 })
  const status = response.status()
  const body = await response.text().catch(() => '')
  const headers: Record<string, string> = {}
  for (const [k, v] of response.headers()) headers[k] = v
  return { status, body, headers }
}

export async function captureServerHTMLViaGoto(page: any, url: string): Promise<{ serverHTML: string; status: number }> {
  let serverHTML = ''
  let status = 0
  await page.route(url, async (route: any) => {
    const response = await route.fetch()
    status = response.status()
    serverHTML = await response.text()
    await route.fulfill({ response })
  })
  await page.goto(url, { waitUntil: 'commit' })
  return { serverHTML, status }
}

export function extractBodyTextLength(html: string): number {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return (
    match?.[1]
      ?.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim().length ?? 0
  )
}

export function hasClientScripts(html: string): boolean {
  return (
    html.includes('<script') &&
    (html.includes('.js') || html.includes('type="module"') || html.includes('__sveltekit'))
  )
}

export function hasSvelteKitMarkers(html: string): boolean {
  return html.includes('__sveltekit') || html.includes('data-sveltekit') || html.includes('sveltekit:')
}

export function isEmptyShell(html: string): boolean {
  return extractBodyTextLength(html) < 100
}

export function isPopulated(html: string): boolean {
  return extractBodyTextLength(html) > 200
}

export async function detectStrategy(
  page: any,
  url: string,
  serverHTML: string
): Promise<{ detected: RenderingStrategy; details: Record<string, any> }> {
  const details: Record<string, any> = {
    url,
    serverHTMLLength: serverHTML.length,
    hasSvelteKitScripts: hasSvelteKitMarkers(serverHTML),
    hasHydrationData: serverHTML.includes('data-sveltekit-fetched') || serverHTML.includes('__data'),
  }

  // Check if it's a redirect response
  if (serverHTML.includes('http-equiv="refresh"') || serverHTML.length < 200) {
    const status = await page.evaluate(() => (window as any).__sveltekit?.status)
    if (status === 307 || status === 302) {
      return { detected: 'redirect', details }
    }
  }

  // Check response status
  const response = await page.request.get(url)
  const statusCode = response.status()

  if (statusCode >= 300 && statusCode < 400) {
    return { detected: 'redirect', details }
  }

  // Wait for full client load
  await page.waitForLoadState('networkidle')
  const finalHTML = await page.content()
  const finalBodyText = await page.evaluate(() => document.body.innerText.trim().length)
  const serverBodyText = extractBodyTextLength(serverHTML)

  details.finalHTMLLength = finalHTML.length
  details.serverBodyTextLength = serverBodyText
  details.finalBodyTextLength = finalBodyText
  details.bodyTextDelta = finalBodyText - serverBodyText

  const isFullyPopulatedServer = serverBodyText > 500
  const hasClientScriptTags = hasClientScripts(serverHTML)
  const hasSvelteKitRuntime = serverHTML.includes('start_app') || serverHTML.includes('__sveltekit')

  if (!hasClientScriptTags && isFullyPopulatedServer) {
    return { detected: 'prerendered-no-csr', details }
  }

  const isShell =
    serverBodyText < 200 ||
    (serverHTML.match(/<div style="display: contents">/) && serverBodyText < 500)
  if (isShell && finalBodyText > 500) {
    return { detected: 'csr-only', details }
  }

  if (isFullyPopulatedServer && hasSvelteKitRuntime) {
    return { detected: 'ssr-with-csr', details }
  }

  if (isFullyPopulatedServer && !hasSvelteKitRuntime) {
    return { detected: 'ssr-no-csr', details }
  }

  if (isFullyPopulatedServer && hasClientScriptTags) {
    return { detected: 'prerendered-with-csr', details }
  }

  return { detected: 'unknown', details }
}
