export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export function successResponse<T>(data: T, meta?: PaginationMeta) {
  return { success: true as const, data, ...(meta ? { meta } : {}) }
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return successResponse(data, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}

export function buildPaginationArgs(query: { page?: string; limit?: string }) {
  const page = Math.max(1, parseInt(query.page ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}
