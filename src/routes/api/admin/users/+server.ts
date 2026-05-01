import { getDb } from '$lib/server/db'
import { user } from '$lib/server/db/schema'
import { json, type RequestHandler } from '@sveltejs/kit'
import { and, desc, eq, isNull, like, sql } from 'drizzle-orm'

export const GET: RequestHandler = async ({ url, locals, platform }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Unauthorized' }, { status: locals.user ? 403 : 401 })
  }

  const db = getDb(platform!.env.DB)

  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)))
  const offset = (page - 1) * limit

  const conditions = [isNull(user.deletedAt)]

  if (status === 'active' || status === 'suspended') {
    conditions.push(eq(user.status, status))
  }

  if (search) {
    conditions.push(like(user.email, `%${search}%`))
  }

  const whereClause = and(...conditions)

  const [countResult, users] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClause),
    db
      .select({
        createdAt: user.createdAt,
        displayName: user.displayName,
        email: user.email,
        emailVerified: user.emailVerified,
        id: user.id,
        image: user.image,
        lastLoginAt: user.lastLoginAt,
        name: user.name,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset),
  ])

  return json({ total: countResult[0].count, users })
}
