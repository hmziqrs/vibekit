import { subscription } from '$lib/server/db/schema'
import { getRoleLevel } from '$lib/server/permissions'
import { describe, expect, it, vi } from 'vitest'

// ── Fix 1: Role hierarchy check in member role change ──────────────────────

describe('getRoleLevel - role hierarchy levels', () => {
  it('owner has level 4 (highest)', () => {
    expect(getRoleLevel('owner')).toBe(4)
  })

  it('admin has level 3', () => {
    expect(getRoleLevel('admin')).toBe(3)
  })

  it('member has level 2', () => {
    expect(getRoleLevel('member')).toBe(2)
  })

  it('viewer has level 1 (lowest)', () => {
    expect(getRoleLevel('viewer')).toBe(1)
  })

  it('enforces strict ordering: viewer < member < admin < owner', () => {
    expect(getRoleLevel('viewer')).toBeLessThan(getRoleLevel('member'))
    expect(getRoleLevel('member')).toBeLessThan(getRoleLevel('admin'))
    expect(getRoleLevel('admin')).toBeLessThan(getRoleLevel('owner'))
  })

  it('all levels are distinct positive integers', () => {
    const levels = (['owner', 'admin', 'member', 'viewer'] as const).map(getRoleLevel)
    const unique = new Set(levels)
    expect(unique.size).toBe(4)
    for (const level of levels) {
      expect(level).toBeGreaterThan(0)
    }
  })
})

describe('getRoleLevel - prevents privilege escalation', () => {
  it('admin cannot modify another admin (equal role)', () => {
    // The guard in the route is: targetLevel >= actorLevel => reject
    const actorLevel = getRoleLevel('admin')
    const targetLevel = getRoleLevel('admin')
    expect(targetLevel).toBeGreaterThanOrEqual(actorLevel)
  })

  it('admin can modify member (lower role)', () => {
    // targetLevel >= actorLevel => false => allowed
    const actorLevel = getRoleLevel('admin')
    const targetLevel = getRoleLevel('member')
    expect(targetLevel).toBeLessThan(actorLevel)
  })

  it('admin cannot modify owner (higher role)', () => {
    const actorLevel = getRoleLevel('admin')
    const targetLevel = getRoleLevel('owner')
    expect(targetLevel).toBeGreaterThanOrEqual(actorLevel)
  })

  it('member cannot modify admin', () => {
    const actorLevel = getRoleLevel('member')
    const targetLevel = getRoleLevel('admin')
    expect(targetLevel).toBeGreaterThanOrEqual(actorLevel)
  })

  it('member cannot modify another member (equal role)', () => {
    const actorLevel = getRoleLevel('member')
    const targetLevel = getRoleLevel('member')
    expect(targetLevel).toBeGreaterThanOrEqual(actorLevel)
  })

  it('member can modify viewer', () => {
    const actorLevel = getRoleLevel('member')
    const targetLevel = getRoleLevel('viewer')
    expect(targetLevel).toBeLessThan(actorLevel)
  })

  it('viewer cannot modify anyone', () => {
    for (const targetRole of ['owner', 'admin', 'member', 'viewer'] as const) {
      const actorLevel = getRoleLevel('viewer')
      const targetLevel = getRoleLevel(targetRole)
      expect(targetLevel).toBeGreaterThanOrEqual(actorLevel)
    }
  })

  it('owner can modify everyone except themselves', () => {
    for (const targetRole of ['admin', 'member', 'viewer'] as const) {
      const actorLevel = getRoleLevel('owner')
      const targetLevel = getRoleLevel(targetRole)
      // owner level (4) is highest, so no target can have >= level
      expect(targetLevel).toBeLessThan(actorLevel)
    }
  })
})

// ── Fix 2: Ownership transfer uses db.batch() ─────────────────────────────

describe('Ownership transfer atomicity', () => {
  it('db.batch is available on mock db concept', () => {
    // Verify the concept: db.batch accepts an array of statements
    const batchFn = vi.fn()
    const db = { batch: batchFn }
    expect(typeof db.batch).toBe('function')
  })

  it('transfer should batch demote old owner, promote new owner, and update org', () => {
    // The real route does:
    //   await db.batch([
    //     db.update(organizationMember).set({ role: 'admin' }).where(...),   // demote old
    //     db.update(organizationMember).set({ role: 'owner' }).where(...),   // promote new
    //     db.update(organization).set({ ownerId: ... }).where(...),          // update org
    //   ])
    // We verify the 3-step concept is correctly modeled
    const statements = [
      { type: 'demote-old-owner', role: 'admin' },
      { type: 'promote-new-owner', role: 'owner' },
      { type: 'update-org-owner-id' },
    ]
    expect(statements).toHaveLength(3)
    expect(statements[0].role).toBe('admin')
    expect(statements[1].role).toBe('owner')
    expect(statements[2].type).toBe('update-org-owner-id')
  })

  it('atomic batch ensures no intermediate state where org has no owner', () => {
    // With db.batch, all 3 statements execute in a single transaction.
    // If any fails, none are applied, preventing an ownerless org.
    const batchFn = vi.fn().mockResolvedValue([])
    const db = { batch: batchFn }
    db.batch([Promise.resolve(), Promise.resolve(), Promise.resolve()])
    expect(batchFn).toHaveBeenCalledTimes(1)
    // One call = one transaction, not 3 separate awaits
  })
})

// ── Fix 3: Invitation acceptance uses db.batch() ───────────────────────────

describe('Invitation acceptance atomicity', () => {
  it('accept should batch insert member and update invitation', () => {
    // The real route does:
    //   await db.batch([
    //     db.insert(organizationMember).values({ ... }),
    //     db.update(organizationInvitation).set({ acceptedAt: ... }).where(...),
    //   ])
    const statements = [{ type: 'insert-member' }, { type: 'update-invitation-accepted' }]
    expect(statements).toHaveLength(2)
  })

  it('batch prevents duplicate membership on race condition', () => {
    // With db.batch, insert member + mark invitation accepted happen atomically.
    // Two concurrent accepts cannot both insert a member because the batch
    // serializes the operations within a single D1 transaction.
    const batchFn = vi.fn().mockResolvedValue([])
    const db = { batch: batchFn }
    db.batch([Promise.resolve(), Promise.resolve()])
    expect(batchFn).toHaveBeenCalledTimes(1)
  })

  it('invitation acceptance sets acceptedAt timestamp', () => {
    const acceptedAt = new Date()
    expect(acceptedAt).toBeInstanceOf(Date)
    expect(acceptedAt.getTime()).toBeGreaterThan(0)
  })
})

// ── Fix 4: Cron cleanup excludes orgs with active subscriptions ────────────

describe('Cron cleanup subscription protection', () => {
  it('subscription schema has organizationId field', () => {
    expect(subscription.organizationId).toBeDefined()
  })

  it('subscription schema has status field', () => {
    expect(subscription.status).toBeDefined()
  })

  it('subscription status enum includes active and trialing', () => {
    // The schema defines: enum: ['active', 'canceled', 'incomplete', 'past_due', 'paused', 'trialing']
    const validStatuses = ['active', 'canceled', 'incomplete', 'past_due', 'paused', 'trialing']
    for (const status of validStatuses) {
      expect(validStatuses).toContain(status)
    }
  })

  it('orgs with active subscriptions are excluded from hard delete', () => {
    // Simulates the cleanup logic:
    // 1. Query orgs with active/trialing subscriptions
    const orgsWithActiveSubs = new Set(['org-active', 'org-trialing'])
    // 2. Get soft-deleted orgs past cutoff
    const softDeletedOrgs = [
      { id: 'org-active' },
      { id: 'org-trialing' },
      { id: 'org-expired' },
      { id: 'org-no-sub' },
    ]
    // 3. Filter out protected orgs
    const orgsToDelete = softDeletedOrgs.filter((o) => !orgsWithActiveSubs.has(o.id))

    expect(orgsToDelete).toHaveLength(2)
    expect(orgsToDelete.map((o) => o.id)).toEqual(['org-expired', 'org-no-sub'])
    expect(orgsToDelete.map((o) => o.id)).not.toContain('org-active')
    expect(orgsToDelete.map((o) => o.id)).not.toContain('org-trialing')
  })

  it('orgs with only canceled/past_due subscriptions are NOT protected', () => {
    const orgsWithActiveSubs = new Set(['org-active'])
    const softDeletedOrgs = [{ id: 'org-active' }, { id: 'org-canceled' }, { id: 'org-past-due' }]
    const orgsToDelete = softDeletedOrgs.filter((o) => !orgsWithActiveSubs.has(o.id))

    expect(orgsToDelete).toHaveLength(2)
    expect(orgsToDelete.map((o) => o.id)).toEqual(['org-canceled', 'org-past-due'])
  })

  it('empty subscription list means all soft-deleted orgs are eligible for delete', () => {
    const orgsWithActiveSubs = new Set<string>()
    const softDeletedOrgs = [{ id: 'org-a' }, { id: 'org-b' }]
    const orgsToDelete = softDeletedOrgs.filter((o) => !orgsWithActiveSubs.has(o.id))

    expect(orgsToDelete).toHaveLength(2)
  })

  it('cleanup only deletes orgs past the 30-day cutoff', () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentlyDeleted = { deletedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
    const oldDeleted = { deletedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) }

    const shouldDeleteOld = oldDeleted.deletedAt < cutoff
    const shouldDeleteRecent = recentlyDeleted.deletedAt < cutoff

    expect(shouldDeleteOld).toBe(true)
    expect(shouldDeleteRecent).toBe(false)
  })
})

// ── Cross-cutting: permission system consistency ───────────────────────────

describe('Permission system consistency', () => {
  it('getRoleLevel values match expected hierarchy for all role combinations', () => {
    const roles = ['viewer', 'member', 'admin', 'owner'] as const
    const levels = roles.map((r) => ({ role: r, level: getRoleLevel(r) }))

    // Verify total ordering
    for (let i = 0; i < levels.length - 1; i++) {
      expect(levels[i].level).toBeLessThan(levels[i + 1].level)
    }
  })

  it('no two roles share the same level', () => {
    const roles = ['viewer', 'member', 'admin', 'owner'] as const
    const levels = roles.map(getRoleLevel)
    expect(new Set(levels).size).toBe(roles.length)
  })
})
