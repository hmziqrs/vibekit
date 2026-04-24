import { expect, test } from '@playwright/test'
import { ROUTES } from './routes'
import { captureServerHTML, detectStrategy, captureResponse } from './helpers'

const redirectRoutes = ROUTES.filter((r) => r.group === '(app)' || r.group === '(admin)')

test.describe('Group: (app) / (admin) — Redirect assertions', () => {
  for (const route of redirectRoutes) {
    test(`${route.path} — ${route.description}`, async ({ page }) => {
      const { status, headers } = await captureResponse(page, route.path)

      console.log(`\n[${route.path}]`)
      console.log(`  Status: ${status}`)
      console.log(`  Location header: ${headers['location'] ?? 'none'}`)

      // Unauthenticated requests redirect to /login
      expect(status).toBeGreaterThanOrEqual(300)
      expect(status).toBeLessThan(400)
      expect(headers['location'] ?? '').toContain('/login')
    })
  }
})

test.describe('Group: (app) — SPA mode (CSR only, no SSR)', () => {
  const appRoutes = ROUTES.filter((r) => r.group === '(app)')

  for (const route of appRoutes) {
    test(`${route.path} — SPA strategy detection`, async ({ page }) => {
      const serverHTML = await captureServerHTML(page, route.path)
      const { detected, details } = await detectStrategy(page, route.path, serverHTML)

      console.log(`\n[${route.path}] Detected strategy: ${detected}`)
      console.log(`  Server HTML length: ${details.serverHTMLLength}`)
      console.log(`  Final body text length: ${details.finalBodyTextLength}`)
      console.log(`  Body text delta: ${details.bodyTextDelta}`)

      if (route.expectedStrategy === 'redirect') {
        expect(detected).toBe('redirect')
        return
      }

      expect(details.serverBodyTextLength).toBeLessThan(500)
      expect(detected).toBe(route.expectedStrategy)
    })
  }
})

test.describe('Group: (admin) — SPA mode (CSR only, no SSR)', () => {
  const adminRoutes = ROUTES.filter((r) => r.group === '(admin)')

  for (const route of adminRoutes) {
    test(`${route.path} — SPA strategy detection`, async ({ page }) => {
      const serverHTML = await captureServerHTML(page, route.path)
      const { detected, details } = await detectStrategy(page, route.path, serverHTML)

      console.log(`\n[${route.path}] Detected strategy: ${detected}`)
      console.log(`  Server HTML length: ${details.serverHTMLLength}`)
      console.log(`  Final body text length: ${details.finalBodyTextLength}`)
      console.log(`  Body text delta: ${details.bodyTextDelta}`)

      if (route.expectedStrategy === 'redirect') {
        expect(detected).toBe('redirect')
        return
      }

      expect(detected).toBe(route.expectedStrategy)
    })
  }
})
