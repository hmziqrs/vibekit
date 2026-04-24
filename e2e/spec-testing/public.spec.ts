import { expect, test } from '@playwright/test'
import { ROUTES } from './routes'
import { captureServerHTML, detectStrategy } from './helpers'

const publicRoutes = ROUTES.filter((r) => r.group === '(public)')

test.describe('Group: (public) — Pre-rendered, no CSR', () => {
  for (const route of publicRoutes) {
    test(`${route.path} — ${route.description}`, async ({ page }) => {
      const serverHTML = await captureServerHTML(page, route.path)
      const { detected, details } = await detectStrategy(page, route.path, serverHTML)

      console.log(`\n[${route.path}] Detected strategy: ${detected}`)
      console.log(`  Server HTML length: ${details.serverHTMLLength}`)
      console.log(`  Final body text length: ${details.finalBodyTextLength}`)
      console.log(`  Has SvelteKit scripts: ${details.hasSvelteKitScripts}`)
      console.log(`  Body text delta: ${details.bodyTextDelta}`)

      expect(details.serverHTMLLength).toBeGreaterThan(1000)
      expect(details.bodyTextDelta).toBeLessThan(100)
      expect(detected).toBe(route.expectedStrategy)
    })
  }
})
