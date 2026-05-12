import { sql } from 'drizzle-orm'

import type { AppDb } from './db'
import { comment } from './db/schema'

interface SpamCheckInput {
  content: string
  db: AppDb
  ipAddress: string
  userId: string
}

interface SpamResult {
  isSpam: boolean
  reasons: string[]
  score: number
}

const SPAM_THRESHOLD = 50

const BLOCKED_PATTERNS: Array<{
  reason: string
  score: number
  test: (content: string) => boolean
}> = [
  {
    reason: 'excessive_links',
    score: 20,
    test: (c) => (c.match(/https?:\/\/[^\s]+/g) ?? []).length > 3,
  },
  {
    reason: 'repeated_characters',
    score: 10,
    test: (c) => /(.)\1{5,}/.test(c),
  },
  {
    reason: 'excessive_caps',
    score: 15,
    test: (c) => {
      const letters = c.replace(/[^A-Za-z]/g, '')
      if (letters.length < 10) return false
      const upper = letters.replace(/[^A-Z]/g, '').length
      return upper / letters.length > 0.7
    },
  },
]

const BLOCKED_KEYWORDS = [
  'viagra',
  'casino',
  'lottery',
  'winner',
  'free money',
  'click here now',
  'act now',
  'limited time offer',
  'crypto giveaway',
  'double your bitcoin',
]

export async function detectSpam(input: SpamCheckInput): Promise<SpamResult> {
  const { content, db, userId } = input
  const reasons: string[] = []
  let score = 0

  // Content-based checks
  const lowerContent = content.toLowerCase()
  for (const keyword of BLOCKED_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      score += 30
      reasons.push(`blocked_keyword:${keyword}`)
      break
    }
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      score += pattern.score
      reasons.push(pattern.reason)
    }
  }

  // Very short content
  if (content.length < 3) {
    score += 10
    reasons.push('too_short')
  }

  // Duplicate check: same user, same content in last hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  const recent = await db
    .select({ id: comment.id })
    .from(comment)
    .where(sql`author_id = ${userId} AND content = ${content} AND created_at > ${oneHourAgo}`)
    .limit(1)
    .get()

  if (recent) {
    score += 25
    reasons.push('duplicate_content')
  }

  // Rate check: more than 10 comments in last hour
  const recentCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(comment)
    .where(sql`author_id = ${userId} AND created_at > ${oneHourAgo}`)
    .get()

  if (recentCount && recentCount.count > 10) {
    score += 20
    reasons.push('rate_exceeded')
  }

  return {
    isSpam: score >= SPAM_THRESHOLD,
    reasons,
    score,
  }
}
