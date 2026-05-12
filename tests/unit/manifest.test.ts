import { describe, expect, it } from 'vitest'

describe('automation manifest endpoint', () => {
  it('manifest endpoint returns valid structure', async () => {
    const response = await fetch('http://localhost:5173/api/automation/manifest')
    expect(response.ok).toBeTruthy()

    const manifest = (await response.json()) as {
      actions: Array<{ method: string; name: string; path: string }>
      auth: { headerName: string; type: string }
      baseUrl: string
      name: string
      triggers: Array<{ event: string; name: string }>
      version: string
      webhookSetup: {
        createEndpoint: string
        signatureHeader: string
      }
    }

    expect(manifest.name).toBe('Vibekit')
    expect(manifest.version).toBe('1.0.0')
    expect(manifest.triggers.length).toBeGreaterThan(10)
    expect(manifest.actions.length).toBeGreaterThan(3)
    expect(manifest.auth.type).toBe('bearer')
    expect(manifest.webhookSetup.createEndpoint).toBeTruthy()
    expect(manifest.webhookSetup.signatureHeader).toBe('X-Webhook-Signature')
  })

  it('triggers include expected events', async () => {
    const response = await fetch('http://localhost:5173/api/automation/manifest')
    const manifest = (await response.json()) as {
      triggers: Array<{ event: string }>
    }

    const events = manifest.triggers.map((t) => t.event)
    expect(events).toContain('blog.create')
    expect(events).toContain('blog.publish')
    expect(events).toContain('item.create')
    expect(events).toContain('comment.create')
    expect(events).toContain('webhook.test')
  })

  it('actions include expected operations', async () => {
    const response = await fetch('http://localhost:5173/api/automation/manifest')
    const manifest = (await response.json()) as {
      actions: Array<{ name: string }>
    }

    const names = manifest.actions.map((a) => a.name)
    expect(names).toContain('List Items')
    expect(names).toContain('Create Item')
    expect(names).toContain('Search Blog')
  })

  it('each trigger has required fields', async () => {
    const response = await fetch('http://localhost:5173/api/automation/manifest')
    const manifest = (await response.json()) as {
      triggers: Array<{ description: string; event: string; name: string; payloadExample: object }>
    }

    for (const trigger of manifest.triggers) {
      expect(trigger.name).toBeTruthy()
      expect(trigger.event).toBeTruthy()
      expect(trigger.description).toBeTruthy()
      expect(trigger.payloadExample).toBeDefined()
    }
  })

  it('each action has required fields', async () => {
    const response = await fetch('http://localhost:5173/api/automation/manifest')
    const manifest = (await response.json()) as {
      actions: Array<{ description: string; method: string; name: string; path: string }>
    }

    for (const action of manifest.actions) {
      expect(action.name).toBeTruthy()
      expect(action.path).toBeTruthy()
      expect(action.method).toBeTruthy()
      expect(action.description).toBeTruthy()
    }
  })

  it('auth section has required fields', async () => {
    const response = await fetch('http://localhost:5173/api/automation/manifest')
    const manifest = (await response.json()) as {
      auth: {
        description: string
        headerName: string
        headerValueFormat: string
        scopes: string[]
        type: string
      }
    }

    expect(manifest.auth.type).toBe('bearer')
    expect(manifest.auth.headerName).toBe('Authorization')
    expect(manifest.auth.scopes.length).toBeGreaterThan(5)
    expect(manifest.auth.headerValueFormat).toContain('Bearer')
  })
})
