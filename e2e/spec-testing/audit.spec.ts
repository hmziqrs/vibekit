import { expect, test } from '@playwright/test'
import { ROUTES } from './routes'
import {
  captureServerHTMLViaGoto,
  extractBodyTextLength,
  hasClientScripts,
  hasSvelteKitMarkers,
  isEmptyShell,
  isPopulated,
} from './helpers'

test.describe('Comprehensive Rendering Audit Report', () => {
  test('full route-by-route rendering analysis', async ({ page }) => {
    const results: Array<{
      path: string
      status: number
      htmlSize: number
      bodyTextLen: number
      hasScripts: boolean
      hasSvelteKit: boolean
      isPopulated: boolean
      isEmptyShell: boolean
      finalBodyText: number
      strategy: string
      notes: string[]
    }> = []

    for (const route of ROUTES) {
      try {
        const { serverHTML, status } = await captureServerHTMLViaGoto(page, route.path)
        const bodyTextLen = extractBodyTextLength(serverHTML)
        const scripts = hasClientScripts(serverHTML)
        const svelteKit = hasSvelteKitMarkers(serverHTML)
        const populated = isPopulated(serverHTML)
        const empty = isEmptyShell(serverHTML)

        let finalBodyText = 0
        if (status < 300) {
          await page.waitForLoadState('networkidle')
          finalBodyText = await page.evaluate(
            () => document.body.innerText.replace(/\s+/g, ' ').trim().length
          )
        }

        let strategy = 'unknown'
        const notes: string[] = []

        if (status >= 300 && status < 400) {
          strategy = 'redirect'
          notes.push('Server returned redirect response')
        } else if (populated && !scripts) {
          strategy = 'prerendered-no-csr'
          notes.push('Server sent fully populated HTML with NO hydration scripts (csr=false)')
        } else if (empty && scripts) {
          strategy = 'csr-only'
          notes.push('Server sent empty shell, client JS populates content (ssr=false, csr=true)')
        } else if (populated && scripts && svelteKit) {
          strategy = 'ssr-with-csr'
          notes.push('Server sent populated HTML with hydration scripts (ssr=true, csr=true)')
        } else if (populated && scripts && !svelteKit) {
          strategy = 'ssr-no-csr'
          notes.push('Server sent populated HTML but no SvelteKit hydration')
        }

        results.push({
          path: route.path,
          status,
          htmlSize: serverHTML.length,
          bodyTextLen,
          hasScripts: scripts,
          hasSvelteKit: svelteKit,
          isPopulated: populated,
          isEmptyShell: empty,
          finalBodyText,
          strategy,
          notes,
        })
      } catch (e: any) {
        results.push({
          path: route.path,
          status: 0,
          htmlSize: 0,
          bodyTextLen: 0,
          hasScripts: false,
          hasSvelteKit: false,
          isPopulated: false,
          isEmptyShell: true,
          finalBodyText: 0,
          strategy: 'error',
          notes: [`Error: ${e.message}`],
        })
      }
    }

    console.log('\n\n══════════════════════════════════════════════════════════════════════')
    console.log('  RENDERING STRATEGY AUDIT REPORT')
    console.log('  (Dev server behavior — production build may differ for prerender)')
    console.log('══════════════════════════════════════════════════════════════════════\n')

    for (const r of results) {
      const expected = ROUTES.find((x) => x.path === r.path)?.expectedStrategy ?? 'unknown'
      const passed = r.strategy === expected
      const statusText = passed ? 'PASS' : 'FAIL'

      console.log(`  [${statusText}] ${r.path}`)
      console.log(`         Expected: ${expected}`)
      console.log(`         Detected: ${r.strategy}`)
      console.log(`         Status: ${r.status}`)
      console.log(`         HTML size: ${r.htmlSize} bytes`)
      console.log(`         Body text (server): ${r.bodyTextLen}`)
      console.log(`         Body text (final):  ${r.finalBodyText}`)
      console.log(`         Has scripts: ${r.hasScripts}`)
      console.log(`         Has SvelteKit: ${r.hasSvelteKit}`)
      for (const note of r.notes) {
        console.log(`         Note: ${note}`)
      }
      console.log('')
    }

    const byGroup = new Map<string, typeof results>()
    for (const r of results) {
      const group = ROUTES.find((x) => x.path === r.path)?.group ?? 'unknown'
      const list = byGroup.get(group) ?? []
      list.push(r)
      byGroup.set(group, list)
    }

    console.log('──────────────────────────────────────────────────────────────────────')
    console.log('  SUMMARY BY GROUP')
    console.log('──────────────────────────────────────────────────────────────────────\n')

    for (const [group, pages] of byGroup) {
      const passed = pages.filter((p) => {
        const expected = ROUTES.find((x) => x.path === p.path)?.expectedStrategy ?? 'unknown'
        return p.strategy === expected
      }).length
      console.log(`  ${group}: ${passed}/${pages.length} passed`)
    }

    const totalPassed = results.filter((r) => {
      const expected = ROUTES.find((x) => x.path === r.path)?.expectedStrategy ?? 'unknown'
      return r.strategy === expected
    }).length

    console.log('\n══════════════════════════════════════════════════════════════════════')
    console.log(`  TOTAL: ${totalPassed}/${results.length} passed`)
    console.log('══════════════════════════════════════════════════════════════════════\n')

    expect(totalPassed).toBe(results.length)
  })
})
