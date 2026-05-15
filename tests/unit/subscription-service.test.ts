import type { AppDb } from '$lib/server/services/types'
import { beforeAll, describe, expect, it, vi } from 'vitest'

type MockDb = AppDb & {
  _allFn: ReturnType<typeof vi.fn>
  _getFn: ReturnType<typeof vi.fn>
  _insertFn: ReturnType<typeof vi.fn>
  _setFn: ReturnType<typeof vi.fn>
  _updateFn: ReturnType<typeof vi.fn>
  _valuesFn: ReturnType<typeof vi.fn>
  _whereFn: ReturnType<typeof vi.fn>
}

function createMockDb(
  opts: {
    planRow?: object | null
    rows?: object[]
    subRow?: object | null
  } = {}
): MockDb {
  const { planRow = null, rows = [], subRow = null } = opts

  const getFn = vi.fn().mockResolvedValue(planRow)
  const allFn = vi.fn().mockResolvedValue(rows)
  const valuesFn = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const insertFn = vi.fn<() => { values: typeof valuesFn }>().mockReturnValue({ values: valuesFn })
  const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
  const updateFn = vi.fn().mockReturnValue({ set: setFn })
  const orderByFn = vi.fn().mockReturnValue({
    get: getFn,
    limit: vi.fn().mockReturnValue({ get: getFn }),
  })
  const whereFn = vi.fn().mockReturnValue({
    get: getFn,
    orderBy: orderByFn,
  })
  const fromFn = vi.fn().mockReturnValue({
    all: allFn,
    get: getFn,
    orderBy: orderByFn,
    where: whereFn,
  })

  return {
    _allFn: allFn,
    _getFn: getFn,
    _insertFn: insertFn,
    _setFn: setFn,
    _updateFn: updateFn,
    _valuesFn: valuesFn,
    _whereFn: whereFn,
    all: allFn,
    insert: insertFn,
    select: vi.fn().mockReturnValue({ from: fromFn }),
    update: updateFn,
  } as unknown as MockDb
}

describe('subscription-service module', () => {
  it('exports all required functions', async () => {
    const mod = await import('$lib/server/billing/subscription-service')
    expect(typeof mod.getActivePlans).toBe('function')
    expect(typeof mod.getAllPlans).toBe('function')
    expect(typeof mod.getPlanBySlug).toBe('function')
    expect(typeof mod.getPlanById).toBe('function')
    expect(typeof mod.createPlan).toBe('function')
    expect(typeof mod.updatePlan).toBe('function')
    expect(typeof mod.deactivatePlan).toBe('function')
    expect(typeof mod.getUserSubscription).toBe('function')
    expect(typeof mod.getOrgSubscription).toBe('function')
    expect(typeof mod.createSubscription).toBe('function')
    expect(typeof mod.getSubscriptionById).toBe('function')
    expect(typeof mod.updateSubscriptionStatus).toBe('function')
    expect(typeof mod.cancelSubscription).toBe('function')
    expect(typeof mod.reactivateSubscription).toBe('function')
    expect(typeof mod.changeSubscriptionPlan).toBe('function')
    expect(typeof mod.recordUsage).toBe('function')
    expect(typeof mod.getUsageForPeriod).toBe('function')
    expect(typeof mod.getBillingOverview).toBe('function')
    expect(typeof mod.calculateProration).toBe('function')
  })
})

describe('createPlan', () => {
  it('inserts plan with defaults', async () => {
    const { createPlan } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()

    await createPlan(db, {
      interval: 'month',
      name: 'Pro',
      priceInCents: 2900,
      slug: 'pro',
    })

    expect(db._insertFn).toHaveBeenCalled()
    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.name).toBe('Pro')
    expect(values.priceInCents).toBe(2900)
    expect(values.slug).toBe('pro')
    expect(values.interval).toBe('month')
    expect(values.currency).toBe('usd')
    expect(values.isActive).toBe(true)
    expect(values.trialDays).toBe(0)
    expect(values.sortOrder).toBe(0)
  })

  it('stringifies features array', async () => {
    const { createPlan } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()

    await createPlan(db, {
      features: ['API access', 'Priority support'],
      interval: 'year',
      name: 'Enterprise',
      priceInCents: 9900,
      slug: 'enterprise',
    })

    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.features).toBe('["API access","Priority support"]')
  })

  it('sets features to null when not provided', async () => {
    const { createPlan } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()

    await createPlan(db, {
      interval: 'month',
      name: 'Basic',
      priceInCents: 0,
      slug: 'basic',
    })

    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.features).toBeNull()
  })
})

describe('updatePlan', () => {
  it('updates only provided fields', async () => {
    const { updatePlan } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()

    await updatePlan(db, 'plan-1', { name: 'Pro Plus', priceInCents: 4900 })

    expect(db._setFn).toHaveBeenCalledTimes(1)
    const setArg = db._setFn.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.name).toBe('Pro Plus')
    expect(setArg.priceInCents).toBe(4900)
    expect(setArg.slug).toBeUndefined()
  })

  it('stringifies features on update', async () => {
    const { updatePlan } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()

    await updatePlan(db, 'plan-1', { features: ['New feature'] })

    const setArg = db._setFn.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.features).toBe('["New feature"]')
  })
})

describe('createSubscription', () => {
  it('creates with active status when no trial', async () => {
    const { createSubscription } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()

    await createSubscription(db, {
      currentPeriodEnd: new Date('2026-06-01'),
      currentPeriodStart: new Date('2026-05-01'),
      planId: 'plan-1',
      userId: 'user-1',
    })

    // First insert = subscription, second insert = subscription_event
    expect(db._insertFn).toHaveBeenCalledTimes(2)
    const subValues = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(subValues.status).toBe('active')
    expect(subValues.trialEnd).toBeNull()
  })

  it('creates with trialing status when trial end is set', async () => {
    const { createSubscription } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()

    await createSubscription(db, {
      currentPeriodEnd: new Date('2026-06-01'),
      currentPeriodStart: new Date('2026-05-01'),
      planId: 'plan-1',
      trialEnd: new Date('2026-05-15'),
      userId: 'user-1',
    })

    const subValues = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(subValues.status).toBe('trialing')
    expect(subValues.trialEnd).toEqual(new Date('2026-05-15'))
  })

  it('logs a created event', async () => {
    const { createSubscription } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()

    await createSubscription(db, {
      currentPeriodEnd: new Date('2026-06-01'),
      currentPeriodStart: new Date('2026-05-01'),
      planId: 'plan-1',
      userId: 'user-1',
    })

    // Second valuesFn call is the event
    const eventValues = db._valuesFn.mock.calls[1][0] as Record<string, unknown>
    expect(eventValues.type).toBe('created')
    expect(eventValues.toPlanId).toBe('plan-1')
  })
})

describe('cancelSubscription', () => {
  it('sets status to canceled and logs event', async () => {
    const { cancelSubscription } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb({ planRow: { id: 'sub-1', planId: 'plan-1', status: 'active' } })

    await cancelSubscription(db, 'sub-1')

    expect(db._setFn).toHaveBeenCalledTimes(1)
    const setArg = db._setFn.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.status).toBe('canceled')
    expect(setArg.canceledAt).toBeInstanceOf(Date)

    // Event logged
    const eventValues = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(eventValues.type).toBe('canceled')
    expect(eventValues.subscriptionId).toBe('sub-1')
  })

  it('throws when subscription not found', async () => {
    const { cancelSubscription } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb({ planRow: null })

    await expect(cancelSubscription(db, 'sub-missing')).rejects.toThrow('Subscription not found')
  })

  it('throws when subscription is already canceled', async () => {
    const { cancelSubscription } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb({ planRow: { id: 'sub-1', planId: 'plan-1', status: 'canceled' } })

    await expect(cancelSubscription(db, 'sub-1')).rejects.toThrow(
      "Cannot cancel subscription in 'canceled' state"
    )
  })
})

describe('reactivateSubscription', () => {
  it('sets status to active and logs renewed event', async () => {
    const { reactivateSubscription } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb({ planRow: { id: 'sub-1', planId: 'plan-1', status: 'canceled' } })

    await reactivateSubscription(db, 'sub-1')

    const setArg = db._setFn.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.status).toBe('active')
    expect(setArg.canceledAt).toBeNull()

    const eventValues = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(eventValues.type).toBe('renewed')
  })

  it('throws when subscription not found', async () => {
    const { reactivateSubscription } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb({ planRow: null })

    await expect(reactivateSubscription(db, 'sub-missing')).rejects.toThrow(
      'Subscription not found'
    )
  })

  it('throws when subscription is already active', async () => {
    const { reactivateSubscription } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb({ planRow: { id: 'sub-1', planId: 'plan-1', status: 'active' } })

    await expect(reactivateSubscription(db, 'sub-1')).rejects.toThrow(
      "Cannot reactivate subscription in 'active' state"
    )
  })
})

describe('changeSubscriptionPlan', () => {
  it('throws when subscription not found', async () => {
    const { changeSubscriptionPlan } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb({ subRow: null })

    await expect(changeSubscriptionPlan(db, 'sub-missing', 'plan-2')).rejects.toThrow(
      'Subscription not found'
    )
  })

  it('throws when new plan not found', async () => {
    const { changeSubscriptionPlan } = await import('$lib/server/billing/subscription-service')
    let callIdx = 0
    const getFn = vi.fn().mockImplementation(() => {
      callIdx++
      // First call = subscription (found)
      if (callIdx === 1) return Promise.resolve({ planId: 'plan-1' })
      // Second call = old plan (found)
      if (callIdx === 2) return Promise.resolve({ priceInCents: 1000 })
      // Third call = new plan (not found)
      return Promise.resolve(null)
    })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn, get: getFn })
    const selectFn = vi.fn().mockReturnValue({ from: fromFn })

    const db = {
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
      select: selectFn,
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      }),
    } as unknown as AppDb

    await expect(changeSubscriptionPlan(db, 'sub-1', 'plan-missing')).rejects.toThrow(
      'New plan not found'
    )
  })
})

describe('calculateProration', () => {
  let calculateProration: (input: {
    currentPeriodEnd: Date
    currentPeriodStart: Date
    newPlanPriceInCents: number
    oldPlanPriceInCents: number
  }) => number

  beforeAll(async () => {
    const mod = await import('$lib/server/billing/subscription-service')
    calculateProration = mod.calculateProration
  })

  it('returns full new price when period is over', () => {
    const result = calculateProration({
      currentPeriodEnd: new Date('2026-04-01'),
      currentPeriodStart: new Date('2026-03-01'),
      newPlanPriceInCents: 4900,
      oldPlanPriceInCents: 2900,
    })
    expect(result).toBe(4900)
  })

  it('calculates credit for unused portion', () => {
    const periodStart = new Date('2026-05-01')
    const periodEnd = new Date('2026-06-01')
    // Halfway through the period
    const now = new Date('2026-05-16')
    vi.useFakeTimers({ now })

    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      currentPeriodStart: periodStart,
      newPlanPriceInCents: 4900,
      oldPlanPriceInCents: 2000,
    })

    // ~half of $20 = ~$10 credit. New price $49 - $10 = ~$39
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThanOrEqual(4900)

    vi.useRealTimers()
  })

  it('never returns negative', () => {
    const periodStart = new Date('2026-05-01')
    const periodEnd = new Date('2026-06-01')
    const now = new Date('2026-05-15')
    vi.useFakeTimers({ now })

    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      currentPeriodStart: periodStart,
      newPlanPriceInCents: 100,
      oldPlanPriceInCents: 10000,
    })

    expect(result).toBe(0)

    vi.useRealTimers()
  })

  it('returns full new price when total period is zero', () => {
    const sameDate = new Date('2026-05-01')
    const result = calculateProration({
      currentPeriodEnd: sameDate,
      currentPeriodStart: sameDate,
      newPlanPriceInCents: 2900,
      oldPlanPriceInCents: 0,
    })
    expect(result).toBe(2900)
  })
})

describe('deactivatePlan', () => {
  it('sets isActive to false', async () => {
    const { deactivatePlan } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()

    await deactivatePlan(db, 'plan-1')

    const setArg = db._setFn.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.isActive).toBe(false)
  })
})

describe('updateSubscriptionStatus', () => {
  it('updates subscription status', async () => {
    const { updateSubscriptionStatus } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()

    await updateSubscriptionStatus(db, 'sub-1', 'past_due')

    const setArg = db._setFn.mock.calls[0][0] as Record<string, unknown>
    expect(setArg.status).toBe('past_due')
  })
})

describe('recordUsage', () => {
  it('inserts usage record with correct values', async () => {
    const { recordUsage } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()

    await recordUsage(db, {
      metricType: 'api_calls',
      periodEnd: new Date('2026-06-01'),
      periodStart: new Date('2026-05-01'),
      quantity: 1500,
      subscriptionId: 'sub-1',
    })

    expect(db._insertFn).toHaveBeenCalledTimes(1)
    const values = db._valuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(values.metricType).toBe('api_calls')
    expect(values.quantity).toBe(1500)
    expect(values.subscriptionId).toBe('sub-1')
  })
})

describe('getBillingOverview', () => {
  it('returns overview with active and total counts', async () => {
    const { getBillingOverview } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()

    // Mock db.all() for the 7 raw SQL queries
    let allCallIdx = 0
    db._allFn.mockImplementation(() => {
      allCallIdx++
      if (allCallIdx === 1) return Promise.resolve([{ count: 42 }])
      if (allCallIdx === 2) return Promise.resolve([{ count: 50 }])
      if (allCallIdx === 3) return Promise.resolve([{ count: 30, planName: 'Pro' }])
      if (allCallIdx === 4) return Promise.resolve([{ mrr: 500000 }])
      if (allCallIdx === 5) return Promise.resolve([{ revenue: 750000 }])
      if (allCallIdx === 6) return Promise.resolve([{ count: 3 }])
      return Promise.resolve([{ count: 5 }])
    })

    const overview = await getBillingOverview(db)

    expect(overview.activeSubscriptions).toBe(42)
    expect(overview.totalSubscriptions).toBe(50)
    expect(overview.planDistribution).toEqual([{ count: 30, planName: 'Pro' }])
    expect(overview.mrr).toBe(500000)
    expect(overview.arr).toBe(6_000_000)
    expect(overview.netRevenue30d).toBe(750000)
    expect(overview.churnedLast30Days).toBe(3)
    expect(overview.trialSubscriptions).toBe(5)
    expect(overview.arpu).toBe(Math.round(500000 / 42))
  })

  it('handles empty results', async () => {
    const { getBillingOverview } = await import('$lib/server/billing/subscription-service')
    const db = createMockDb()
    db._allFn.mockResolvedValue([])

    const overview = await getBillingOverview(db)

    expect(overview.activeSubscriptions).toBe(0)
    expect(overview.totalSubscriptions).toBe(0)
    expect(overview.planDistribution).toEqual([])
    expect(overview.mrr).toBe(0)
    expect(overview.arr).toBe(0)
    expect(overview.netRevenue30d).toBe(0)
    expect(overview.churnedLast30Days).toBe(0)
    expect(overview.trialSubscriptions).toBe(0)
    expect(overview.arpu).toBe(0)
  })
})

describe('changeSubscriptionPlan success paths', () => {
  it('logs upgraded event when new plan costs more', async () => {
    const { changeSubscriptionPlan } = await import('$lib/server/billing/subscription-service')
    let callIdx = 0
    const getFn = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx === 1) return Promise.resolve({ planId: 'plan-starter' })
      if (callIdx === 2) return Promise.resolve({ priceInCents: 0 })
      if (callIdx === 3) return Promise.resolve({ priceInCents: 2900 })
      return Promise.resolve(null)
    })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn, get: getFn })
    const selectFn = vi.fn().mockReturnValue({ from: fromFn })

    const insertValuesFn = vi.fn().mockResolvedValue(undefined)
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertValuesFn }),
      select: selectFn,
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      }),
    } as unknown as AppDb

    await changeSubscriptionPlan(db, 'sub-1', 'plan-pro')

    const eventArg = insertValuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(eventArg.type).toBe('upgraded')
    expect(eventArg.fromPlanId).toBe('plan-starter')
    expect(eventArg.toPlanId).toBe('plan-pro')
  })

  it('logs downgraded event when new plan costs less', async () => {
    const { changeSubscriptionPlan } = await import('$lib/server/billing/subscription-service')
    let callIdx = 0
    const getFn = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx === 1) return Promise.resolve({ planId: 'plan-pro' })
      if (callIdx === 2) return Promise.resolve({ priceInCents: 2900 })
      if (callIdx === 3) return Promise.resolve({ priceInCents: 0 })
      return Promise.resolve(null)
    })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn, get: getFn })
    const selectFn = vi.fn().mockReturnValue({ from: fromFn })

    const insertValuesFn = vi.fn().mockResolvedValue(undefined)
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertValuesFn }),
      select: selectFn,
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      }),
    } as unknown as AppDb

    await changeSubscriptionPlan(db, 'sub-1', 'plan-starter')

    const eventArg = insertValuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(eventArg.type).toBe('downgraded')
  })

  it('logs downgraded when plans cost the same', async () => {
    const { changeSubscriptionPlan } = await import('$lib/server/billing/subscription-service')
    let callIdx = 0
    const getFn = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx === 1) return Promise.resolve({ planId: 'plan-a' })
      if (callIdx === 2) return Promise.resolve({ priceInCents: 2900 })
      if (callIdx === 3) return Promise.resolve({ priceInCents: 2900 })
      return Promise.resolve(null)
    })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn, get: getFn })
    const selectFn = vi.fn().mockReturnValue({ from: fromFn })

    const insertValuesFn = vi.fn().mockResolvedValue(undefined)
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertValuesFn }),
      select: selectFn,
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      }),
    } as unknown as AppDb

    await changeSubscriptionPlan(db, 'sub-1', 'plan-b')

    const eventArg = insertValuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(eventArg.type).toBe('downgraded')
  })

  it('handles old plan not found (defaults to downgraded)', async () => {
    const { changeSubscriptionPlan } = await import('$lib/server/billing/subscription-service')
    let callIdx = 0
    const getFn = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx === 1) return Promise.resolve({ planId: 'plan-old' })
      if (callIdx === 2) return Promise.resolve(null)
      if (callIdx === 3) return Promise.resolve({ priceInCents: 1000 })
      return Promise.resolve(null)
    })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn, get: getFn })
    const selectFn = vi.fn().mockReturnValue({ from: fromFn })

    const insertValuesFn = vi.fn().mockResolvedValue(undefined)
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertValuesFn }),
      select: selectFn,
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      }),
    } as unknown as AppDb

    await changeSubscriptionPlan(db, 'sub-1', 'plan-new')

    const eventArg = insertValuesFn.mock.calls[0][0] as Record<string, unknown>
    expect(eventArg.type).toBe('downgraded')
  })

  it('returns prorationAmountInCents from period dates', async () => {
    const { changeSubscriptionPlan } = await import('$lib/server/billing/subscription-service')
    const periodStart = new Date('2026-05-01')
    const periodEnd = new Date('2026-06-01')
    const now = new Date('2026-05-16')
    vi.useFakeTimers({ now })

    let callIdx = 0
    const getFn = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx === 1)
        return Promise.resolve({
          currentPeriodEnd: periodEnd,
          currentPeriodStart: periodStart,
          planId: 'plan-starter',
        })
      if (callIdx === 2) return Promise.resolve({ priceInCents: 2000 })
      if (callIdx === 3) return Promise.resolve({ priceInCents: 4900 })
      return Promise.resolve(null)
    })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn, get: getFn })
    const selectFn = vi.fn().mockReturnValue({ from: fromFn })

    const db = {
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
      select: selectFn,
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      }),
    } as unknown as AppDb

    const result = await changeSubscriptionPlan(db, 'sub-1', 'plan-pro')

    expect(result.prorationAmountInCents).toBeGreaterThan(0)
    expect(result.prorationAmountInCents).toBeLessThanOrEqual(4900)

    vi.useRealTimers()
  })

  it('returns new plan price as proration when subscription has no period dates', async () => {
    const { changeSubscriptionPlan } = await import('$lib/server/billing/subscription-service')
    let callIdx = 0
    const getFn = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx === 1) return Promise.resolve({ planId: 'plan-starter' })
      if (callIdx === 2) return Promise.resolve({ priceInCents: 0 })
      if (callIdx === 3) return Promise.resolve({ priceInCents: 2900 })
      return Promise.resolve(null)
    })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn, get: getFn })
    const selectFn = vi.fn().mockReturnValue({ from: fromFn })

    const insertValuesFn = vi.fn().mockResolvedValue(undefined)
    const db = {
      insert: vi.fn().mockReturnValue({ values: insertValuesFn }),
      select: selectFn,
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      }),
    } as unknown as AppDb

    const result = await changeSubscriptionPlan(db, 'sub-1', 'plan-pro')

    expect(result.prorationAmountInCents).toBe(2900)
  })
})

describe('calculateProration edge cases', () => {
  let calculateProration: (input: {
    currentPeriodEnd: Date
    currentPeriodStart: Date
    newPlanPriceInCents: number
    oldPlanPriceInCents: number
  }) => number

  beforeAll(async () => {
    const mod = await import('$lib/server/billing/subscription-service')
    calculateProration = mod.calculateProration
  })

  it('returns 0 when switching from expensive to free plan mid-period', () => {
    const periodStart = new Date('2026-05-01')
    const periodEnd = new Date('2026-06-01')
    vi.useFakeTimers({ now: new Date('2026-05-15') })

    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      currentPeriodStart: periodStart,
      newPlanPriceInCents: 0,
      oldPlanPriceInCents: 2900,
    })

    expect(result).toBe(0)
    vi.useRealTimers()
  })

  it('returns new plan price exactly at period end', () => {
    const periodStart = new Date('2026-05-01')
    const periodEnd = new Date('2026-06-01')
    vi.useFakeTimers({ now: periodEnd })

    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      currentPeriodStart: periodStart,
      newPlanPriceInCents: 4900,
      oldPlanPriceInCents: 2900,
    })

    expect(result).toBe(4900)
    vi.useRealTimers()
  })

  it('returns 0 when credit exceeds new plan price', () => {
    const periodStart = new Date('2026-05-01')
    const periodEnd = new Date('2026-06-01')
    vi.useFakeTimers({ now: new Date('2026-05-02') })

    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      currentPeriodStart: periodStart,
      newPlanPriceInCents: 500,
      oldPlanPriceInCents: 10000,
    })

    expect(result).toBe(0)
    vi.useRealTimers()
  })

  it('handles exact period boundary (remainingMs == 0)', () => {
    const periodStart = new Date('2026-05-01T00:00:00Z')
    const periodEnd = new Date('2026-05-01T00:00:00Z')
    const result = calculateProration({
      currentPeriodEnd: periodEnd,
      currentPeriodStart: periodStart,
      newPlanPriceInCents: 2900,
      oldPlanPriceInCents: 2900,
    })

    expect(result).toBe(2900)
  })
})

describe('checkUsageLimit', () => {
  function createCheckMock(getResult: unknown) {
    const getFn = vi.fn().mockResolvedValue(getResult)
    const limitFn = vi.fn().mockReturnValue({ get: getFn })
    const orderByFn = vi.fn().mockReturnValue({ get: getFn, limit: limitFn })
    const whereFn = vi.fn().mockReturnValue({ get: getFn, orderBy: orderByFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const selectFn = vi.fn().mockReturnValue({ from: fromFn })
    return {
      db: { select: selectFn } as unknown as AppDb,
      getFn,
    }
  }

  it('returns not exceeded when user has no subscription', async () => {
    const { checkUsageLimit } = await import('$lib/server/billing/subscription-service')
    const { db, getFn } = createCheckMock(null)
    getFn.mockResolvedValue(null)

    const result = await checkUsageLimit(db, {
      metricType: 'api_calls',
      periodEnd: new Date('2026-06-01'),
      periodStart: new Date('2026-05-01'),
      userId: 'user-no-sub',
    })

    expect(result.exceeded).toBe(false)
    expect(result.limit).toBeNull()
    expect(result.current).toBe(0)
  })

  it('returns not exceeded for inactive subscription', async () => {
    const { checkUsageLimit } = await import('$lib/server/billing/subscription-service')
    const { db, getFn } = createCheckMock(null)
    getFn.mockResolvedValueOnce({ planId: 'plan-1', status: 'canceled' })

    const result = await checkUsageLimit(db, {
      metricType: 'api_calls',
      periodEnd: new Date('2026-06-01'),
      periodStart: new Date('2026-05-01'),
      userId: 'user-canceled',
    })

    expect(result.exceeded).toBe(false)
    expect(result.limit).toBeNull()
  })

  it('returns not exceeded when plan has no limits defined', async () => {
    const { checkUsageLimit } = await import('$lib/server/billing/subscription-service')
    const { db, getFn } = createCheckMock(null)
    getFn
      .mockResolvedValueOnce({ planId: 'plan-custom', status: 'active' })
      .mockResolvedValueOnce({ slug: 'enterprise', features: null })

    const result = await checkUsageLimit(db, {
      metricType: 'api_calls',
      periodEnd: new Date('2026-06-01'),
      periodStart: new Date('2026-05-01'),
      userId: 'user-enterprise',
    })

    expect(result.exceeded).toBe(false)
    expect(result.limit).toBeNull()
  })

  it('returns exceeded when usage exceeds plan limit', async () => {
    const { checkUsageLimit } = await import('$lib/server/billing/subscription-service')

    let callIdx = 0
    const getFn = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx === 1)
        return Promise.resolve({ id: 'sub-1', planId: 'plan-pro', status: 'active' })
      if (callIdx === 2) return Promise.resolve({ slug: 'pro', features: null })
      return Promise.resolve(null)
    })
    const limitFn = vi.fn().mockReturnValue({ get: getFn })
    const orderByFn = vi.fn().mockReturnValue({ get: getFn, limit: limitFn })
    const whereFn = vi.fn().mockResolvedValue([{ quantity: 55000 }])
    const userSubWhereFn = vi.fn().mockReturnValue({ get: getFn, orderBy: orderByFn })
    const planWhereFn = vi.fn().mockReturnValue({ get: getFn })

    let selectCallIdx = 0
    const fromFn = vi.fn().mockImplementation(() => {
      selectCallIdx++
      if (selectCallIdx === 1) return { where: userSubWhereFn }
      if (selectCallIdx === 2) return { where: planWhereFn }
      return { where: whereFn }
    })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await checkUsageLimit(db, {
      metricType: 'api_calls',
      periodEnd: new Date('2026-06-01'),
      periodStart: new Date('2026-05-01'),
      userId: 'user-pro',
    })

    expect(result.exceeded).toBe(true)
    expect(result.limit).toBe(50000)
    expect(result.current).toBe(55000)
  })

  it('returns not exceeded when usage is under plan limit', async () => {
    const { checkUsageLimit } = await import('$lib/server/billing/subscription-service')

    let callIdx = 0
    const getFn = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx === 1)
        return Promise.resolve({ id: 'sub-1', planId: 'plan-pro', status: 'active' })
      if (callIdx === 2) return Promise.resolve({ slug: 'pro', features: null })
      return Promise.resolve(null)
    })
    const limitFn = vi.fn().mockReturnValue({ get: getFn })
    const orderByFn = vi.fn().mockReturnValue({ get: getFn, limit: limitFn })
    const whereFn = vi.fn().mockResolvedValue([{ quantity: 100 }])
    const userSubWhereFn = vi.fn().mockReturnValue({ get: getFn, orderBy: orderByFn })
    const planWhereFn = vi.fn().mockReturnValue({ get: getFn })

    let selectCallIdx = 0
    const fromFn = vi.fn().mockImplementation(() => {
      selectCallIdx++
      if (selectCallIdx === 1) return { where: userSubWhereFn }
      if (selectCallIdx === 2) return { where: planWhereFn }
      return { where: whereFn }
    })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await checkUsageLimit(db, {
      metricType: 'api_calls',
      periodEnd: new Date('2026-06-01'),
      periodStart: new Date('2026-05-01'),
      userId: 'user-pro',
    })

    expect(result.exceeded).toBe(false)
    expect(result.limit).toBe(50000)
    expect(result.current).toBe(100)
  })
})

describe('getActivePlans', () => {
  it('queries plans with isActive filter', async () => {
    const { getActivePlans } = await import('$lib/server/billing/subscription-service')
    const allFn = vi.fn().mockResolvedValue([{ id: 'p1', name: 'Pro' }])
    const whereFn = vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue(undefined) })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await getActivePlans(db)

    expect(db.select).toHaveBeenCalled()
    expect(whereFn).toHaveBeenCalled()
  })
})

describe('getAllPlans', () => {
  it('queries all plans without filter', async () => {
    const { getAllPlans } = await import('$lib/server/billing/subscription-service')
    const fromFn = vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue(undefined) })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    await getAllPlans(db)

    expect(db.select).toHaveBeenCalled()
  })
})

describe('getPlanBySlug', () => {
  it('queries plan by slug', async () => {
    const { getPlanBySlug } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue({ id: 'p1', slug: 'pro' })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await getPlanBySlug(db, 'pro')

    expect(whereFn).toHaveBeenCalled()
    expect(result).toEqual({ id: 'p1', slug: 'pro' })
  })

  it('returns undefined when plan not found', async () => {
    const { getPlanBySlug } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue(null)
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await getPlanBySlug(db, 'nonexistent')

    expect(result).toBeNull()
  })
})

describe('getPlanById', () => {
  it('queries plan by id', async () => {
    const { getPlanById } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue({ id: 'plan-1', name: 'Starter' })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await getPlanById(db, 'plan-1')

    expect(whereFn).toHaveBeenCalled()
    expect(result).toEqual({ id: 'plan-1', name: 'Starter' })
  })

  it('returns null when plan not found', async () => {
    const { getPlanById } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue(null)
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await getPlanById(db, 'nonexistent')

    expect(result).toBeNull()
  })
})

describe('getUserSubscription', () => {
  it('returns active subscription for user', async () => {
    const { getUserSubscription } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue({ id: 'sub-1', userId: 'user-1', status: 'active' })
    const limitFn = vi.fn().mockReturnValue({ get: getFn })
    const orderByFn = vi.fn().mockReturnValue({ get: getFn, limit: limitFn })
    const whereFn = vi.fn().mockReturnValue({ get: getFn, orderBy: orderByFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await getUserSubscription(db, 'user-1')

    expect(whereFn).toHaveBeenCalled()
    expect(limitFn).toHaveBeenCalledWith(1)
    expect(result).toEqual({ id: 'sub-1', userId: 'user-1', status: 'active' })
  })

  it('returns undefined when user has no subscription', async () => {
    const { getUserSubscription } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue(null)
    const limitFn = vi.fn().mockReturnValue({ get: getFn })
    const orderByFn = vi.fn().mockReturnValue({ get: getFn, limit: limitFn })
    const whereFn = vi.fn().mockReturnValue({ get: getFn, orderBy: orderByFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await getUserSubscription(db, 'user-none')

    expect(result).toBeNull()
  })
})

describe('getOrgSubscription', () => {
  it('returns active subscription for org', async () => {
    const { getOrgSubscription } = await import('$lib/server/billing/subscription-service')
    const getFn = vi
      .fn()
      .mockResolvedValue({ id: 'sub-2', organizationId: 'org-1', status: 'active' })
    const limitFn = vi.fn().mockReturnValue({ get: getFn })
    const orderByFn = vi.fn().mockReturnValue({ get: getFn, limit: limitFn })
    const whereFn = vi.fn().mockReturnValue({ get: getFn, orderBy: orderByFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await getOrgSubscription(db, 'org-1')

    expect(whereFn).toHaveBeenCalled()
    expect(result).toEqual({ id: 'sub-2', organizationId: 'org-1', status: 'active' })
  })
})

describe('getSubscriptionById', () => {
  it('returns subscription by id', async () => {
    const { getSubscriptionById } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue({ id: 'sub-1', status: 'active' })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await getSubscriptionById(db, 'sub-1')

    expect(whereFn).toHaveBeenCalled()
    expect(result).toEqual({ id: 'sub-1', status: 'active' })
  })

  it('returns null when not found', async () => {
    const { getSubscriptionById } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue(null)
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await getSubscriptionById(db, 'nonexistent')

    expect(result).toBeNull()
  })
})

describe('getUsageForPeriod', () => {
  it('queries usage records filtered by subscription and date range', async () => {
    const { getUsageForPeriod } = await import('$lib/server/billing/subscription-service')
    const records = [
      { metricType: 'api_calls', quantity: 500 },
      { metricType: 'api_calls', quantity: 300 },
    ]
    const whereFn = vi.fn().mockResolvedValue(records)
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const start = new Date('2026-05-01')
    const end = new Date('2026-06-01')
    const result = await getUsageForPeriod(db, 'sub-1', start, end)

    expect(whereFn).toHaveBeenCalled()
    expect(result).toEqual(records)
  })
})

describe('getFailedStripeWebhooks', () => {
  it('returns failed and retrying events ordered by createdAt desc', async () => {
    const { getFailedStripeWebhooks } = await import('$lib/server/billing/subscription-service')
    const events = [
      { id: 'evt-1', status: 'failed', eventType: 'invoice.payment_failed' },
      { id: 'evt-2', status: 'retrying', eventType: 'customer.subscription.updated' },
    ]
    const orderByFn = vi.fn().mockResolvedValue(events)
    const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await getFailedStripeWebhooks(db)

    expect(whereFn).toHaveBeenCalled()
    expect(orderByFn).toHaveBeenCalled()
    expect(result).toEqual(events)
  })
})

describe('retryStripeWebhook', () => {
  it('returns error when event not found', async () => {
    const { retryStripeWebhook } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue(null)
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await retryStripeWebhook(db, 'nonexistent')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Event not found')
  })

  it('returns error when event already processed', async () => {
    const { retryStripeWebhook } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue({
      id: 'evt-1',
      retryCount: 0,
      status: 'processed',
    })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await retryStripeWebhook(db, 'evt-1')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Event already processed')
  })

  it('returns error when max retries exceeded', async () => {
    const { retryStripeWebhook } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue({
      id: 'evt-1',
      retryCount: 5,
      status: 'failed',
    })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
    } as unknown as AppDb

    const result = await retryStripeWebhook(db, 'evt-1')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Max retries exceeded')
  })

  it('queues retry when retries remain', async () => {
    const { retryStripeWebhook } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue({
      id: 'evt-1',
      retryCount: 2,
      status: 'retrying',
    })
    const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
    const updateFn = vi.fn().mockReturnValue({ set: setFn })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
      update: updateFn,
    } as unknown as AppDb

    const result = await retryStripeWebhook(db, 'evt-1')

    expect(result.success).toBe(true)
    expect(result.message).toContain('Queued for retry')
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({
        retryCount: 3,
        status: 'retrying',
      })
    )
  })

  it('marks as failed on final attempt', async () => {
    const { retryStripeWebhook } = await import('$lib/server/billing/subscription-service')
    const getFn = vi.fn().mockResolvedValue({
      id: 'evt-1',
      retryCount: 4,
      status: 'retrying',
    })
    const setFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
    const updateFn = vi.fn().mockReturnValue({ set: setFn })
    const whereFn = vi.fn().mockReturnValue({ get: getFn })
    const fromFn = vi.fn().mockReturnValue({ where: whereFn })
    const db = {
      select: vi.fn().mockReturnValue({ from: fromFn }),
      update: updateFn,
    } as unknown as AppDb

    const result = await retryStripeWebhook(db, 'evt-1')

    expect(result.success).toBe(true)
    expect(result.message).toContain('Final attempt')
    expect(setFn).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
      })
    )
  })
})
