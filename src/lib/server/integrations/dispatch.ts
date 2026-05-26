import { decryptToken } from '$lib/server/crypto'
import { integration } from '$lib/server/db/schema'
import { createLogger } from '$lib/server/logger'
import type { AppDb } from '$lib/server/services/types'
import { and, eq } from 'drizzle-orm'

const logger = createLogger('dispatch')

export interface DispatchMessage {
  body?: string
  link?: string
  title: string
  type?: 'error' | 'info' | 'success' | 'warning'
}

const TYPE_COLORS: Record<string, string> = {
  error: '#ef4444',
  info: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
}

export async function dispatchToIntegrations(
  db: AppDb,
  userId: string,
  message: DispatchMessage
): Promise<void> {
  const integrations = await db
    .select()
    .from(integration)
    .where(and(eq(integration.userId, userId), eq(integration.status, 'active')))

  await Promise.allSettled(
    integrations
      .filter((i) => i.provider === 'slack' || i.provider === 'discord')
      .map(async (i) => {
        const plainToken = await decryptToken(i.accessToken).catch(() => i.accessToken)
        return i.provider === 'slack'
          ? sendSlackMessage(plainToken, message)
          : sendDiscordMessage(i, message)
      })
  )
}

async function sendSlackMessage(token: string, message: DispatchMessage): Promise<void> {
  const blocks: unknown[] = [
    {
      text: { emoji: true, text: typeEmoji(message.type), type: 'plain_text' },
      type: 'header',
    },
    {
      text: { text: message.title, type: 'mrkdwn' },
      type: 'section',
    },
  ]

  if (message.body) {
    blocks.push({
      text: { text: message.body, type: 'mrkdwn' },
      type: 'section',
    })
  }

  if (message.link) {
    blocks.push({
      elements: [
        {
          text: 'View details',
          type: 'button',
          url: message.link,
        },
      ],
      type: 'actions',
    })
  }

  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      body: JSON.stringify({
        blocks,
        channel: '#general',
        text: message.title,
        unfurl_links: false,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      logger.error('Slack message dispatch failed', { status: res.status })
    }
  } catch (error) {
    logger.error('Slack message dispatch error', { error })
  }
}

async function sendDiscordMessage(
  integrationRecord: { accessToken: string; metadata: unknown },
  message: DispatchMessage
): Promise<void> {
  const metadata = integrationRecord.metadata as Record<string, unknown> | null
  const webhookUrl = metadata?.discordWebhookUrl as string | undefined

  if (!webhookUrl) return

  // Validate webhook URL is Discord's domain to prevent SSRF
  try {
    const parsed = new URL(webhookUrl)
    if (parsed.hostname !== 'discord.com' && parsed.hostname !== 'discordapp.com') {
      logger.error('Discord webhook URL rejected: invalid hostname')
      return
    }
    if (parsed.protocol !== 'https:') {
      logger.error('Discord webhook URL rejected: must use https')
      return
    }
  } catch {
    logger.error('Discord webhook URL rejected: invalid URL')
    return
  }

  const color = TYPE_COLORS[message.type ?? 'info'] ?? TYPE_COLORS.info

  const payload = {
    embeds: [
      {
        color: parseInt(color.replace('#', ''), 16),
        description: message.body,
        title: `${typeEmoji(message.type)} ${message.title}`,
        url: message.link,
      },
    ],
    username: 'Vibekit',
  }

  try {
    const res = await fetch(webhookUrl, {
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      logger.error('Discord webhook dispatch failed', { status: res.status })
    }
  } catch (error) {
    logger.error('Discord webhook dispatch error', { error })
  }
}

function typeEmoji(type?: string): string {
  switch (type) {
    case 'error': {
      return '🔴'
    }
    case 'success': {
      return '🟢'
    }
    case 'warning': {
      return '🟡'
    }
    default: {
      return '🔵'
    }
  }
}
