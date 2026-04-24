import { expect, test } from '@playwright/test'
import { ROUTES } from './routes'
import { captureServerHTML, detectStrategy } from './helpers'

const authRoutes = ROUTES.filter((r) => r.group === '(auth)')

test.describe('Group: (auth) — Default SSR + CSR', () => {
  for (const route of authRoutes) {
    test(`${route.path} — ${route.description}`, async ({ page }) => {
      const serverHTML = await captureServerHTML(page, route.path)
      const { detected, details } = await detectStrategy(page, route.path, serverHTML)

      console.log(`\n[${route.path}] Detected strategy: ${detected}`)
      console.log(`  Server HTML length: ${details.serverHTMLLength}`)
      console.log(`  Final body text length: ${details.finalBodyTextLength}`)
      console.log(`  Has SvelteKit scripts: ${details.hasSvelteKitScripts}`)
      console.log(`  Body text delta: ${details.bodyTextDelta}`)

      // Default: SSR + CSR hydration
      expect(details.serverHTMLLength).toBeGreaterThan(1000)
      expect(details.serverBodyTextLength).toBeGreaterThan(200)
      expect(details.hasSvelteKitScripts).toBe(true)
      expect(detected).toBe(route.expectedStrategy)
    })
  }
})
