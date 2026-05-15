import { describe, expect, it, vi } from 'vitest'

describe('integration dispatch', () => {
  it('dispatchToIntegrations sends to Slack and Discord', async () => {
    const { dispatchToIntegrations } = await import('$lib/server/integrations/dispatch')

    const mockIntegrations = [
      { accessToken: 'slack-token', metadata: null, provider: 'slack' },
      {
        accessToken: 'discord-token',
        metadata: { discordWebhookUrl: 'https://discord.com/api/webhooks/test' },
        provider: 'discord',
      },
    ]

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockIntegrations),
      }),
    })
    const mockDb = {
      select: mockSelect,
    } as never

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'))

    await dispatchToIntegrations(mockDb, 'user-1', {
      body: 'Test body',
      link: 'https://example.com',
      title: 'Test notification',
      type: 'info',
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)

    // Slack call
    const slackCall = fetchSpy.mock.calls[0]
    expect(slackCall[0]).toBe('https://slack.com/api/chat.postMessage')
    const slackBody = JSON.parse(slackCall[1]?.body as string) as { blocks: unknown[] }
    expect(slackBody.blocks.length).toBeGreaterThanOrEqual(2)

    // Discord call
    const discordCall = fetchSpy.mock.calls[1]
    expect(discordCall[0]).toBe('https://discord.com/api/webhooks/test')

    fetchSpy.mockRestore()
  })

  it('skips providers that are not Slack or Discord', async () => {
    const { dispatchToIntegrations } = await import('$lib/server/integrations/dispatch')

    const mockIntegrations = [{ accessToken: 'gh-token', metadata: null, provider: 'github' }]

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockIntegrations),
      }),
    })
    const mockDb = {
      select: mockSelect,
    } as never

    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await dispatchToIntegrations(mockDb, 'user-1', { title: 'Test' })

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('skips Discord when metadata has no webhook URL', async () => {
    const { dispatchToIntegrations } = await import('$lib/server/integrations/dispatch')

    const mockIntegrations = [{ accessToken: 'discord-token', metadata: null, provider: 'discord' }]

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockIntegrations),
      }),
    })
    const mockDb = {
      select: mockSelect,
    } as never

    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await dispatchToIntegrations(mockDb, 'user-1', { title: 'Test' })

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('handles Slack API failure gracefully', async () => {
    const { dispatchToIntegrations } = await import('$lib/server/integrations/dispatch')

    const mockIntegrations = [{ accessToken: 'slack-token', metadata: null, provider: 'slack' }]

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockIntegrations),
      }),
    })
    const mockDb = {
      select: mockSelect,
    } as never

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network timeout'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Should not throw
    await dispatchToIntegrations(mockDb, 'user-1', { title: 'Test' })

    expect(errorSpy).toHaveBeenCalled()

    fetchSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('handles no integrations gracefully', async () => {
    const { dispatchToIntegrations } = await import('$lib/server/integrations/dispatch')

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })
    const mockDb = {
      select: mockSelect,
    } as never

    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await dispatchToIntegrations(mockDb, 'user-1', { title: 'Test' })

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('formats Slack Block Kit message with header, body, and link', async () => {
    const { dispatchToIntegrations } = await import('$lib/server/integrations/dispatch')

    const mockIntegrations = [{ accessToken: 'slack-token', metadata: null, provider: 'slack' }]

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockIntegrations),
      }),
    })
    const mockDb = {
      select: mockSelect,
    } as never

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'))

    await dispatchToIntegrations(mockDb, 'user-1', {
      body: 'Something happened',
      link: 'https://app.example.com',
      title: 'Alert',
      type: 'warning',
    })

    const slackCall = fetchSpy.mock.calls[0]
    const body = JSON.parse(slackCall[1]?.body as string) as {
      blocks: Array<{ type: string; text?: { text: string } }>
    }
    // Header + section + body section + actions
    expect(body.blocks).toHaveLength(4)
    expect(body.blocks[0].type).toBe('header')
    expect(body.blocks[1].type).toBe('section')
    expect(body.blocks[2].type).toBe('section')
    expect(body.blocks[3].type).toBe('actions')

    fetchSpy.mockRestore()
  })

  it('formats Discord embed with correct color for type', async () => {
    const { dispatchToIntegrations } = await import('$lib/server/integrations/dispatch')

    const mockIntegrations = [
      {
        accessToken: 'discord-token',
        metadata: { discordWebhookUrl: 'https://discord.com/api/webhooks/test' },
        provider: 'discord',
      },
    ]

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockIntegrations),
      }),
    })
    const mockDb = {
      select: mockSelect,
    } as never

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'))

    await dispatchToIntegrations(mockDb, 'user-1', {
      title: 'Error alert',
      type: 'error',
    })

    const discordCall = fetchSpy.mock.calls[0]
    const body = JSON.parse(discordCall[1]?.body as string) as {
      embeds: Array<{ color: number; title: string }>
    }
    expect(body.embeds[0].color).toBe(0xef4444) // error red
    expect(body.embeds[0].title).toContain('Error alert')

    fetchSpy.mockRestore()
  })
})
