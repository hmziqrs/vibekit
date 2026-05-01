import { test } from '@playwright/test'
import { test } from 'vitest'

import { runRenderingAudit } from './audit'

test.describe('Rendering Strategy Audit — Production Build', () => {
  test('route-by-route production build rendering proof', async ({ page }) => {
    await runRenderingAudit(page, {
      strategyKey: 'expectedStrategy',
      subtitle:
        'This test runs against the PRODUCTION build (wrangler dev).\n  It proves what was actually built and deployed.',
      title: 'COMPREHENSIVE RENDERING AUDIT — PRODUCTION BUILD',
    })
  })
})
