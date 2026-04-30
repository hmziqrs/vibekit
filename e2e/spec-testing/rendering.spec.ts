import { test } from '@playwright/test'
import { runRenderingAudit } from './audit'

test.describe('Rendering Strategy Audit', () => {
  test('route-by-route server vs client rendering proof', async ({ page }) => {
    await runRenderingAudit(page, {
      title: 'COMPREHENSIVE RENDERING AUDIT — DEV SERVER',
      strategyKey: 'devStrategy',
      tolerantMode: true,
    })
  })
})
