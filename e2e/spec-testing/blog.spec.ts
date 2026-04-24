import { expect, test } from '@playwright/test'
import { ROUTES } from './routes'
import { captureServerHTML, detectStrategy } from './helpers'

const blogRoutes = ROUTES.filter((r) => r.group === '(blog)')

test.describe('Group: (blog) — Full SSR + CSR hydration', () => {
  for (const route of blogRoutes) {
    test(`${route.path} — ${route.description}`, async ({ page }) => {
      const serverHTML = await captureServerHTML(page, route.path)
      const { detected, details } = await detectStrategy(page, route.path, serverHTML)

      console.log(`\n[${route.path}] Detected strategy: ${detected}`)
      console.log(`  Server HTML length: ${details.serverHTMLLength}`)
      console.log(`  Final body text length: ${details.finalBodyTextLength}`)
      console.log(`  Has SvelteKit scripts: ${details.hasSvelteKitScripts}`)
      console.log(`  Body text delta: ${details.bodyTextDelta}`)

      // SSR returns populated HTML
      expect(details.serverHTMLLength).toBeGreaterThan(1000)
      expect(details.serverBodyTextLength).toBeGreaterThan(100)
      // Includes hydration scripts
      expect(details.hasSvelteKitScripts).toBe(true)
      expect(detected).toBe(route.expectedStrategy)
    })
  }
})
