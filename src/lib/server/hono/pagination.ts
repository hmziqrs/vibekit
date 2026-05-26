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
  const limit = parseClampInt({
    fallback: defaultLimit,
    max: maxLimit,
    min: 1,
    value: params.limit,
  })
  const offset = (page - 1) * limit

  return { limit, offset, page }
}

function parsePositiveInt(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

function parseClampInt(input: {
  fallback: number
  max: number
  min: number
  value: string | null | undefined
}): number {
  if (!input.value) return input.fallback
  const n = Number(input.value)
  if (!Number.isInteger(n)) return input.fallback
  return Math.min(input.max, Math.max(input.min, n))
}
