import { writeAuditLog } from '$lib/server/audit'
import { user } from '$lib/server/db/schema'
import type { DrizzleDb } from '$lib/server/services/types'
import { and, eq, gte, ne, or, sql } from 'drizzle-orm'

interface BanEvasionResult {
  flagged: boolean
  matches: Array<{
    bannedEmail: string
    bannedReason: string | null
    matchType: 'email_domain' | 'email_local'
  }>
}

/**
 * Check if a new registration resembles a banned user.
 * Compares email domain and local part against recently banned accounts.
 * Returns match details for audit logging and admin review.
 */
export async function detectBanEvasion(
  db: DrizzleDb,
  newEmail: string,
  newIp: string
): Promise<BanEvasionResult> {
  const matches: BanEvasionResult['matches'] = []

  const [localPart, domain] = newEmail.split('@')
  if (!domain) return { flagged: false, matches }

  // Look for banned/suspended users with the same email domain
  // Only check accounts banned in the last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const bannedUsers = await db
    .select({ banReason: user.banReason, email: user.email })
    .from(user)
    .where(
      and(
        eq(user.status, 'suspended'),
        sql`${user.banExpiresAt} IS NULL OR ${user.banExpiresAt} > ${new Date()}`,
        sql`${user.createdAt} > ${ninetyDaysAgo}`,
        ne(user.email, newEmail)
      )
    )
    .limit(50)

  for (const banned of bannedUsers) {
    const [bannedLocal, bannedDomain] = banned.email.split('@')

    // Same domain is a weak signal
    if (bannedDomain === domain && bannedLocal) {
      // Stronger signal: same local part (e.g., john@gmail.com → john+1@gmail.com)
      const normalizedLocal = localPart?.split('+')[0]
      const bannedNormalizedLocal = bannedLocal.split('+')[0]
      if (normalizedLocal === bannedNormalizedLocal) {
        matches.push({
          bannedEmail: banned.email,
          bannedReason: banned.banReason,
          matchType: 'email_local',
        })
      } else {
        matches.push({
          bannedEmail: banned.email,
          bannedReason: banned.banReason,
          matchType: 'email_domain',
        })
      }
    }
  }

  return {
    flagged: matches.some((m) => m.matchType === 'email_local'),
    matches,
  }
}
