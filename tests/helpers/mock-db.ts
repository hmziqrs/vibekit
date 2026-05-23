import type { DrizzleDb } from '$lib/server/services/types'
import { vi } from 'vitest' // oxlint-disable-line vitest/no-importing-vitest-globals

export interface MockDbResult {
  db: DrizzleDb
  mocks: {
    deleteFn: ReturnType<typeof vi.fn>
    fromFn: ReturnType<typeof vi.fn>
    getFn: ReturnType<typeof vi.fn>
    insertFn: ReturnType<typeof vi.fn>
    limitFn: ReturnType<typeof vi.fn>
    onConflictDoUpdateFn: ReturnType<typeof vi.fn>
    orderByFn: ReturnType<typeof vi.fn>
    returningFn: ReturnType<typeof vi.fn>
    selectFn: ReturnType<typeof vi.fn>
    setFn: ReturnType<typeof vi.fn>
    updateFn: ReturnType<typeof vi.fn>
    valuesFn: ReturnType<typeof vi.fn>
    whereFn: ReturnType<typeof vi.fn>
  }
}

// Drizzle query builders are thenable — awaiting any point in the chain
// Resolves to the row array (equivalent to calling .all()).
function thenable(
  // oxlint-disable-line unicorn/consistent-function-scoping
  obj: Record<string, unknown>,
  resolveValue: unknown = []
): Record<string, unknown> & PromiseLike<unknown> {
  return {
    ...obj,
    // oxlint-disable-next-line unicorn/no-thenable
    then(resolve: (v: unknown) => void, _reject?: (e: unknown) => void): void {
      Promise.resolve(resolveValue).then(resolve)
    },
  }
}

export function createMockDb(opts?: {
  allResult?: unknown[]
  deleteResult?: unknown
  getResult?: unknown
  insertResult?: unknown[]
  updateResult?: unknown
}): MockDbResult {
  const getFn = vi.fn<() => Promise<unknown>>().mockResolvedValue(opts?.getResult ?? null)
  const allFn = vi.fn<() => Promise<unknown>>().mockResolvedValue(opts?.allResult ?? [])
  const allResult = opts?.allResult ?? []

  const limitResult = thenable({ all: allFn, get: getFn }, allResult)
  const limitFn = vi.fn<() => unknown>().mockReturnValue(limitResult)
  const orderByResult = thenable({ get: getFn, limit: limitFn }, allResult)
  const orderByFn = vi.fn<() => unknown>().mockReturnValue(orderByResult)
  const whereResult = thenable(
    { all: allFn, get: getFn, limit: limitFn, orderBy: orderByFn },
    allResult
  )
  const whereFn = vi.fn<() => unknown>().mockReturnValue(whereResult)
  const fromResult = thenable(
    {
      all: allFn,
      get: getFn,
      limit: limitFn,
      orderBy: orderByFn,
      where: whereFn,
    },
    allResult
  )
  const fromFn = vi.fn<() => unknown>().mockReturnValue(fromResult)
  const selectFn = vi.fn<() => unknown>().mockReturnValue({ from: fromFn })

  const insertResult = opts?.insertResult ?? []
  const returningFn = vi.fn<() => Promise<unknown>>().mockResolvedValue(insertResult)
  const onConflictDoUpdateFn = vi.fn<() => Promise<unknown>>().mockResolvedValue(insertResult)
  // .values() returns a thenable builder with .onConflictDoUpdate and .returning
  const valuesResult = thenable(
    { onConflictDoUpdate: onConflictDoUpdateFn, returning: returningFn },
    insertResult
  )
  const valuesFn = vi.fn<() => unknown>().mockReturnValue(valuesResult)
  const updateResult = opts?.updateResult ?? []
  const setWhereResult = thenable({ returning: returningFn }, updateResult)
  const setWhereFn = vi.fn<() => unknown>().mockReturnValue(setWhereResult)
  const setFn = vi.fn<() => unknown>().mockReturnValue({
    returning: returningFn,
    where: setWhereFn,
  })
  const insertFn = vi
    .fn<() => unknown>()
    .mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateFn, values: valuesFn })
  const updateFn = vi.fn<() => unknown>().mockReturnValue({ set: setFn })

  const deleteWhereFn = vi.fn<() => Promise<unknown>>().mockResolvedValue(opts?.deleteResult ?? [])
  const deleteFn = vi.fn<() => unknown>().mockReturnValue({ where: deleteWhereFn })

  const db = {
    delete: deleteFn,
    insert: insertFn,
    select: selectFn,
    update: updateFn,
  } as unknown as DrizzleDb

  return {
    db,
    mocks: {
      deleteFn,
      fromFn,
      getFn,
      insertFn,
      limitFn,
      onConflictDoUpdateFn,
      orderByFn,
      returningFn,
      selectFn,
      setFn,
      updateFn,
      valuesFn,
      whereFn,
    },
  }
}
