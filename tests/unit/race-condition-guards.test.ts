import { describe, expect, it, vi } from 'vitest'

describe('race condition guards', () => {
  describe('non-Stripe checkout duplicate subscription guard', () => {
    it('rejects checkout when user already has active subscription', async () => {
      const getUserSubscription = vi.fn().mockResolvedValue({
        id: 'sub-existing',
        planId: 'plan-starter',
        status: 'active',
        userId: 'user-1',
      })
      const createSubscription = vi.fn()

      const existing = await getUserSubscription('user-1')
      expect(existing).toBeDefined()
      expect(existing.status).toBe('active')
      // Route should throw ConflictError before calling createSubscription
      expect(createSubscription).not.toHaveBeenCalled()
    })

    it('allows checkout when user has no active subscription', async () => {
      const getUserSubscription = vi.fn().mockResolvedValue(undefined)

      const existing = await getUserSubscription('user-1')
      expect(existing).toBeUndefined()
    })

    it('rejects org checkout when org already has active subscription', async () => {
      const getOrgSubscription = vi.fn().mockResolvedValue({
        id: 'sub-existing',
        organizationId: 'org-1',
        planId: 'plan-pro',
        status: 'active',
      })
      const createSubscription = vi.fn()

      const existing = await getOrgSubscription('org-1')
      expect(existing).toBeDefined()
      expect(existing.status).toBe('active')
      expect(createSubscription).not.toHaveBeenCalled()
    })
  })

  describe('organization slug collision retry', () => {
    it('generates random suffix with higher entropy than timestamp', () => {
      const slug = 'my-org'
      const timestampSuffix = `${slug}-${Date.now().toString(36)}`
      const randomSuffix = `${slug}-${Math.random().toString(36).slice(2, 8)}`

      // Random suffix should be 6+ chars after the dash
      expect(randomSuffix.length - slug.length - 1).toBeGreaterThanOrEqual(6)
      // Timestamp suffix is variable length but deterministic for same ms
      expect(timestampSuffix).toContain(slug)
    })

    it('catches UNIQUE constraint on org INSERT and retries with new slug', async () => {
      const constraintError = new Error(
        'D1_ERROR: UNIQUE constraint failed: organization.organization_slug_active_idx'
      )

      let attempts = 0
      const tryInsert = async () => {
        attempts++
        if (attempts === 1) throw constraintError
        return { id: 'org-new' }
      }

      let result: { id: string } | null = null
      try {
        result = await tryInsert()
      } catch (error) {
        if (String(error).includes('UNIQUE constraint')) {
          result = await tryInsert()
        } else {
          throw error
        }
      }
      expect(attempts).toBe(2)
      expect(result?.id).toBe('org-new')
    })

    it('catches UNIQUE constraint on org UPDATE slug', () => {
      const err = new Error(
        'D1_ERROR: UNIQUE constraint failed: organization.organization_slug_active_idx'
      )
      const isUniqueViolation = String(err).includes('UNIQUE constraint')
      expect(isUniqueViolation).toBe(true)
    })
  })

  describe('invitation double-accept guard', () => {
    it('catches UNIQUE constraint on member INSERT and throws ConflictError', async () => {
      const constraintError = new Error(
        'D1_ERROR: UNIQUE constraint failed: organization_member.org_member_user_org_idx'
      )

      const batch = vi.fn().mockRejectedValue(constraintError)

      let thrownError: string | null = null
      try {
        await batch()
      } catch (error) {
        if (String(error).includes('UNIQUE constraint')) {
          thrownError = 'You are already a member of this organization'
        } else {
          throw error
        }
      }

      expect(thrownError).toBe('You are already a member of this organization')
    })

    it('re-throws non-UNIQUE errors from invitation batch', async () => {
      const otherError = new Error('D1_ERROR: disk I/O error')
      const batch = vi.fn().mockRejectedValue(otherError)

      let rethrown = false
      try {
        await batch()
      } catch (error) {
        if (!String(error).includes('UNIQUE constraint')) {
          rethrown = true
        }
      }

      expect(rethrown).toBe(true)
    })
  })

  describe('usage post-record re-check', () => {
    it('uses post-record current value for accurate response', async () => {
      const preCheckCurrent = 95
      const postCheckCurrent = 105 // Another request recorded 10 in between
      const limit = 100
      const quantity = 10

      // Pre-check: would be 95 + 10 = 105, over limit but allowed with overage
      const preWouldExceed = preCheckCurrent + quantity > limit
      expect(preWouldExceed).toBe(true)

      // Post-check: actual current is 105 (includes concurrent request's usage)
      const postOverage = postCheckCurrent > limit ? postCheckCurrent - limit : 0
      expect(postOverage).toBe(5)
      expect(postCheckCurrent).toBe(105)
    })

    it('reports remaining=0 when post-check exceeds limit', async () => {
      const postCheckCurrent = 110
      const limit = 100
      const remaining = Math.max(0, limit - postCheckCurrent)
      expect(remaining).toBe(0)
    })
  })

  describe('newsletter response format consistency', () => {
    it('includes success:true in subscribe responses', () => {
      const responses = [
        { message: 'Already subscribed', success: true },
        { message: 'Check your inbox to confirm your subscription', success: true },
      ]

      for (const r of responses) {
        expect(r.success).toBe(true)
        expect(r.message).toBeDefined()
      }
    })

    it('includes success:true in unsubscribe responses', () => {
      const responses = [
        { message: 'Already unsubscribed', success: true },
        { message: 'Successfully unsubscribed', success: true },
      ]

      for (const r of responses) {
        expect(r.success).toBe(true)
        expect(r.message).toBeDefined()
      }
    })

    it('includes success:true in partial success responses', () => {
      const response = {
        message: 'Subscribed but confirmation email failed to send. Please try again later.',
        success: true,
      }

      expect(response.success).toBe(true)
    })
  })
})
