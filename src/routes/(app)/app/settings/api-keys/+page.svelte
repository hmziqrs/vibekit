<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'

  interface ApiKey {
    createdAt: string
    expiresAt: string | null
    id: string
    keyPrefix: string
    lastUsedAt: string | null
    name: string
    rateLimit: number | null
    requestCount: number
    revokedAt: string | null
    scopes: string[]
  }

  const SCOPES = [
    { label: 'Read Items', value: 'read:items' },
    { label: 'Write Items', value: 'write:items' },
    { label: 'Delete Items', value: 'delete:items' },
    { label: 'Read Billing', value: 'read:billing' },
    { label: 'Write Billing', value: 'write:billing' },
    { label: 'Read Organizations', value: 'read:organizations' },
    { label: 'Write Organizations', value: 'write:organizations' },
    { label: 'Read Teams', value: 'read:teams' },
    { label: 'Write Teams', value: 'write:teams' },
    { label: 'Read Blog', value: 'read:blog' },
    { label: 'Write Blog', value: 'write:blog' },
    { label: 'Admin (Full Access)', value: 'admin' },
  ]

  let creating = $state(false)
  let rotating = $state(false)
  let name = $state('')
  let selectedScopes = $state<string[]>(['read:items'])
  let rateLimit = $state('')
  let newKey = $state<string | null>(null)
  let error = $state('')

  const queryClient = useQueryClient()

  const keysQuery = createQuery(() => ({
    queryFn: async (): Promise<ApiKey[]> => {
      const res = await fetch('/api/api-keys')
      if (!res.ok) return []
      const data = (await res.json()) as { keys: ApiKey[] }
      return data.keys
    },
    queryKey: ['api-keys'],
  }))

  async function handleCreate() {
    if (!name.trim() || selectedScopes.length === 0) return
    creating = true
    error = ''
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        scopes: selectedScopes,
      }
      if (rateLimit && Number(rateLimit) > 0) {
        body.rateLimit = Number(rateLimit)
      }
      const res = await fetch('/api/api-keys', {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        error = data.error ?? 'Failed to create API key'
        return
      }
      const data = (await res.json()) as { key: string }
      newKey = data.key
      name = ''
      selectedScopes = ['read:items']
      rateLimit = ''
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    } catch {
      error = 'Network error'
    } finally {
      creating = false
    }
  }

  async function handleRotate(keyId: string) {
    rotating = true
    error = ''
    try {
      const res = await fetch(`/api/api-keys/${keyId}/rotate`, { method: 'POST' })
      if (!res.ok) {
        error = 'Failed to rotate key'
        return
      }
      const data = (await res.json()) as { key: string }
      newKey = data.key
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    } catch {
      error = 'Network error'
    } finally {
      rotating = false
    }
  }

  async function handleRevoke(keyId: string) {
    error = ''
    try {
      const res = await fetch(`/api/api-keys/${keyId}/revoke`, { method: 'POST' })
      if (!res.ok) {
        error = 'Failed to revoke key'
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    } catch {
      error = 'Network error'
    }
  }

  async function handleDelete(keyId: string) {
    error = ''
    try {
      const res = await fetch(`/api/api-keys/${keyId}`, { method: 'DELETE' })
      if (!res.ok) {
        error = 'Failed to delete key'
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    } catch {
      error = 'Network error'
    }
  }

  function toggleScope(scope: string) {
    selectedScopes = selectedScopes.includes(scope)
      ? selectedScopes.filter((s) => s !== scope)
      : [...selectedScopes, scope]
  }

  function formatDate(date: string | null): string {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString()
  }
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-text-primary text-xl font-semibold">API Keys</h2>
    <p class="text-text-muted mt-1">Manage API keys for programmatic access to your account.</p>
  </div>

  {#if error}
    <div class="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
  {/if}

  {#if newKey}
    <div class="border-brand/30 rounded-lg border bg-surface p-4">
      <p class="text-text-primary text-sm font-medium">New API Key Created</p>
      <p class="text-text-muted mt-1 text-xs">
        Copy this key now. You won't be able to see it again.
      </p>
      <div class="bg-surface-elevated mt-2 flex items-center gap-2 rounded p-3">
        <code class="text-text-primary flex-1 overflow-auto text-xs">{newKey}</code>
        <button
          class="text-text-muted hover:text-brand shrink-0 text-xs"
          onclick={() => navigator.clipboard.writeText(newKey!)}
        >
          Copy
        </button>
      </div>
      <button
        class="text-text-muted hover:text-brand mt-2 text-xs"
        onclick={() => (newKey = null)}
      >
        Dismiss
      </button>
    </div>
  {/if}

  <!-- Create form -->
  <div class="border-border rounded-lg border bg-surface p-4">
    <h3 class="text-text-primary text-sm font-medium">Create New API Key</h3>
    <div class="mt-3 space-y-3">
      <div>
        <label for="api-key-name" class="text-text-muted mb-1 block text-xs">Name</label>
        <input
          id="api-key-name"
          bind:value={name}
          class="border-border bg-surface-base text-text-primary w-full rounded-md border px-3 py-2 text-sm"
          placeholder="e.g., Production API Key"
          type="text"
        />
      </div>
      <div>
        <span class="text-text-muted mb-1 block text-xs">Scopes</span>
        <div class="flex flex-wrap gap-2">
          {#each SCOPES as scope}
            <button
              class="rounded-full px-3 py-1 text-xs transition-colors {selectedScopes.includes(scope.value)
                ? 'bg-brand text-brand-foreground'
                : 'bg-surface-deep text-text-muted hover:bg-surface-elevated'}"
              onclick={() => toggleScope(scope.value)}
            >
              {scope.label}
            </button>
          {/each}
        </div>
      </div>
      <div>
        <label for="api-key-rate-limit" class="text-text-muted mb-1 block text-xs">Rate Limit (req/min, optional)</label>
        <input
          id="api-key-rate-limit"
          bind:value={rateLimit}
          class="border-border bg-surface-base text-text-primary w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Leave empty for default"
          type="number"
        />
      </div>
      <button
        class="bg-brand text-brand-foreground rounded-md px-4 py-2 text-sm transition-colors hover:bg-brand-hover disabled:opacity-50"
        disabled={creating || !name.trim() || selectedScopes.length === 0}
        onclick={handleCreate}
      >
        {creating ? 'Creating...' : 'Create Key'}
      </button>
    </div>
  </div>

  <!-- Keys list -->
  {#if keysQuery.isPending}
    <p class="text-text-muted text-sm">Loading API keys...</p>
  {:else if keysQuery.data && keysQuery.data.length > 0}
    <div class="space-y-3">
      {#each keysQuery.data as keyItem (keyItem.id)}
        <div
          class="border-border rounded-lg border bg-surface p-4 {keyItem.revokedAt
            ? 'opacity-60'
            : ''}"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-text-primary text-sm font-medium">{keyItem.name}</span>
                <code class="bg-surface-elevated rounded px-2 py-0.5 text-xs">{keyItem.keyPrefix}...</code>
                {#if keyItem.revokedAt}
                  <span class="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive text-xs">
                    Revoked
                  </span>
                {/if}
              </div>
              <div class="text-text-muted mt-1 flex flex-wrap gap-1">
                {#each keyItem.scopes as scope}
                  <span class="bg-surface-deep rounded px-1.5 py-0.5 text-xs">{scope}</span>
                {/each}
              </div>
              <div class="text-text-muted mt-2 flex gap-4 text-xs">
                <span>Created: {formatDate(keyItem.createdAt)}</span>
                <span>Last used: {formatDate(keyItem.lastUsedAt)}</span>
                <span>Requests: {keyItem.requestCount}</span>
                {#if keyItem.rateLimit}
                  <span>Rate limit: {keyItem.rateLimit}/min</span>
                {/if}
                {#if keyItem.expiresAt}
                  <span>Expires: {formatDate(keyItem.expiresAt)}</span>
                {/if}
              </div>
            </div>
            <div class="flex gap-2">
              {#if !keyItem.revokedAt}
                <button
                  class="text-text-muted hover:text-text-primary text-xs"
                  disabled={rotating}
                  onclick={() => handleRotate(keyItem.id)}
                >
                  Rotate
                </button>
                <button
                  class="text-text-muted hover:text-destructive text-xs"
                  onclick={() => handleRevoke(keyItem.id)}
                >
                  Revoke
                </button>
              {/if}
              <button
                class="text-text-muted hover:text-destructive text-xs"
                onclick={() => handleDelete(keyItem.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <p class="text-text-muted text-sm">No API keys yet. Create one above to get started.</p>
  {/if}
</div>
