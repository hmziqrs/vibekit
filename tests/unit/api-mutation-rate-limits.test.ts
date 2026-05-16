import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const honoSource = readFileSync(
  resolve(import.meta.dirname, '../../src/lib/server/hono/index.ts'),
  'utf-8'
)

// Mutation endpoints that MUST have rate limiting.
// Pattern: [method, path, minCount] — minCount ensures at least that many
// occurrences have withRateLimit nearby.
const mutationEndpoints: Array<[string, string, number]> = [
  // Items
  ['post', '/items', 1],
  ['patch', '/items/:id', 1],
  ['delete', '/items/:id', 1],
  // Terms
  ['post', '/terms/accept', 1],
  // Upload session
  ['post', '/uploads/session', 1],
  // Trusted devices
  ['delete', '/trusted-devices/:id', 1],
  ['delete', '/trusted-devices', 1],
  // Onboarding
  ['post', '/user/onboarding', 1],
  // Notifications
  ['patch', '/notifications/:id/read', 1],
  ['delete', '/notifications/:id', 1],
  ['patch', '/notifications/:id/archive', 1],
  ['patch', '/notifications/:id/unarchive', 1],
  ['patch', '/notifications/preferences', 1],
  // Billing usage
  ['post', '/billing/usage', 1],
  // API keys
  ['patch', '/api-keys/:id', 1],
  ['post', '/api-keys/:id/revoke', 1],
  ['delete', '/api-keys/:id', 1],
  // Webhooks
  ['patch', '/webhooks/:id', 1],
  ['delete', '/webhooks/:id', 1],
  // Integrations
  ['post', '/integrations/connect/:provider', 1],
  ['delete', '/integrations/:id', 1],
  ['post', '/integrations/:id/refresh', 1],
  // Comments
  ['patch', '/comments/:id', 1],
  ['delete', '/comments/:id', 1],
  // Invitations
  ['post', '/invitations/:token/accept', 1],
  ['post', '/invitations/:token/decline', 1],
  // Coupons
  ['post', '/billing/coupons/redeem', 1],
  // Presigned URLs
  ['post', '/storage/presign-get', 1],
  ['post', '/storage/presign-put', 1],
  // Org mutations
  ['patch', '/:orgId', 1],
  ['delete', '/:orgId/members/:memberId', 1],
  ['delete', '/:orgId/invitations/:invitationId', 1],
  ['post', '/:orgId/transfer-ownership', 1],
]

describe('mutation endpoint rate limiting', () => {
  for (const [method, path] of mutationEndpoints) {
    it(`${method.toUpperCase()} ${path} has withRateLimit`, () => {
      // Build regex to match method + path (handles both single-line and multi-line formatting)
      const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
      const pattern = new RegExp(
        String.raw`(?:protectedApp|orgApp|adminApp)\.${method}\(\s*\n?\s*'${escapedPath}'\s*,[\s\S]*?withRateLimit`,
        'd'
      )
      const match = pattern.exec(honoSource)
      expect(
        match,
        `${method.toUpperCase()} ${path} not found or missing withRateLimit`
      ).not.toBeNull()
    })
  }
})
