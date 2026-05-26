export interface PaginationParams {
  limit?: string | null
  page?: string | null
}

export interface PaginationResult {
  limit: number
  offset: number
  page: number
}

export function parsePagination(
  params: PaginationParams,
  defaults?: { limit?: number; maxLimit?: number }
): PaginationResult {
  const defaultLimit = defaults?.limit ?? 20
  const maxLimit = defaults?.maxLimit ?? 100

  const page = parsePositiveInt(params.page, 1)
  const limit = parseClampInt(params.limit, defaultLimit, 1, maxLimit)
  const offset = (page - 1) * limit

  return { limit, offset, page }
}

function parsePositiveInt(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

function parseClampInt(
  value: string | null | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (!value) return fallback
  const n = Number(value)
  if (!Number.isInteger(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
