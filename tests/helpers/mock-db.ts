import type { DrizzleDb } from '$lib/server/services/types'
import { vi } from 'vitest'

export interface MockDbResult {
  db: DrizzleDb
  mocks: {
    deleteFn: ReturnType<typeof vi.fn>
    fromFn: ReturnType<typeof vi.fn>
    getFn: ReturnType<typeof vi.fn>
    insertFn: ReturnType<typeof vi.fn>
    limitFn: ReturnType<typeof vi.fn>
    orderByFn: ReturnType<typeof vi.fn>
    returningFn: ReturnType<typeof vi.fn>
    selectFn: ReturnType<typeof vi.fn>
    setFn: ReturnType<typeof vi.fn>
    updateFn: ReturnType<typeof vi.fn>
    valuesFn: ReturnType<typeof vi.fn>
    whereFn: ReturnType<typeof vi.fn>
  }
}

export function createMockDb(opts?: {
  allResult?: unknown[]
  deleteResult?: unknown
  getResult?: unknown
  insertResult?: unknown[]
  updateResult?: unknown
}): MockDbResult {
  const getFn = vi.fn().mockResolvedValue(opts?.getResult ?? null)
  const allFn = vi.fn().mockResolvedValue(opts?.allResult ?? [])
  const limitFn = vi.fn().mockReturnValue({ get: getFn, all: allFn })
  const orderByFn = vi.fn().mockReturnValue({ get: getFn, limit: limitFn })
  const whereFn = vi
    .fn()
    .mockReturnValue({ all: allFn, get: getFn, limit: limitFn, orderBy: orderByFn })
  const fromFn = vi.fn().mockReturnValue({
    all: allFn,
    get: getFn,
    limit: limitFn,
    orderBy: orderByFn,
    where: whereFn,
  })
  const selectFn = vi.fn().mockReturnValue({ from: fromFn })

  const valuesFn = vi.fn().mockResolvedValue(opts?.insertResult ?? [])
  const returningFn = vi.fn().mockResolvedValue(opts?.insertResult ?? [])
  const onConflictDoUpdateFn = vi.fn().mockResolvedValue(opts?.insertResult ?? [])
  const setFn = vi
    .fn()
    .mockReturnValue({
      returning: returningFn,
      where: vi.fn().mockResolvedValue(opts?.updateResult ?? []),
    })
  const insertFn = vi
    .fn()
    .mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateFn, values: valuesFn })
  const updateFn = vi.fn().mockReturnValue({ set: setFn })

  const deleteWhereFn = vi.fn().mockResolvedValue(opts?.deleteResult ?? [])
  const deleteFn = vi.fn().mockReturnValue({ where: deleteWhereFn })

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
