<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { cn } from '$lib/utils'

  const queryClient = useQueryClient()

  let showCreateForm = $state(false)
  let editingKey = $state<string | null>(null)

  let newFlag = $state({
    description: '',
    enabled: false,
    environment: '' as '' | 'development' | 'staging' | 'production',
    key: '',
    killSwitch: false,
    name: '',
    rolloutPercentage: 0,
  })

  let editFlag = $state<Record<string, unknown> | null>(null)

  const flagsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/admin/feature-flags')
      if (!res.ok) throw new Error('Failed to fetch flags')
      const data = await res.json()
      return data.flags as Record<string, unknown>[]
    },
    queryKey: ['admin', 'feature-flags'],
  }))

  const createFlagMutation = createMutation(() => ({
    mutationFn: async () => {
      const res = await fetch('/api/admin/feature-flags', {
        body: JSON.stringify({
          ...newFlag,
          environment: newFlag.environment || undefined,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Failed to create flag')
      }
      return res.json()
    },
    onSuccess: () => {
      showCreateForm = false
      newFlag = { description: '', enabled: false, environment: '', key: '', killSwitch: false, name: '', rolloutPercentage: 0 }
      void queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] })
    },
  }))

  const deleteMutation = createMutation(() => ({
    mutationFn: async (key: string) => {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(key)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete flag')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] })
    },
  }))

  const toggleMutation = createMutation(() => ({
    mutationFn: async ({ enabled, key }: { enabled: boolean; key: string }) => {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(key)}/toggle`, {
        body: JSON.stringify({ enabled }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to toggle flag')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] })
    },
  }))

  const killSwitchMutation = createMutation(() => ({
    mutationFn: async (key: string) => {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(key)}/kill-switch`, {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to activate kill switch')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] })
    },
  }))

  const updateMutation = createMutation(() => ({
    mutationFn: async ({ data, key }: { data: Record<string, unknown>; key: string }) => {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(key)}`, {
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (!res.ok) throw new Error('Failed to update flag')
      return res.json()
    },
    onSuccess: () => {
      editingKey = null
      editFlag = null
      void queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] })
    },
  }))

  function startEdit(flag: Record<string, unknown>) {
    editingKey = flag.key as string
    editFlag = { ...flag }
  }

  function saveEdit() {
    if (!editingKey || !editFlag) return
    const data: Record<string, unknown> = {}
    if (editFlag.name !== undefined) data.name = editFlag.name
    if (editFlag.description !== undefined) data.description = editFlag.description
    if (editFlag.rolloutPercentage !== undefined) data.rolloutPercentage = editFlag.rolloutPercentage
    if (editFlag.environment !== undefined) data.environment = editFlag.environment
    updateMutation.mutate({ data, key: editingKey })
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-semibold text-text-primary">Feature Flags</h1>
      <p class="mt-1 text-sm text-text-muted">Manage feature flags, rollouts, and kill switches</p>
    </div>
    <button
      onclick={() => (showCreateForm = !showCreateForm)}
      class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
    >
      {showCreateForm ? 'Cancel' : 'Create Flag'}
    </button>
  </div>

  {#if createFlagMutation.isError}
    <div class="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      {createFlagMutation.error?.message ?? 'Failed to create flag'}
    </div>
  {/if}

  {#if showCreateForm}
    <div class="rounded-lg border border-white/[0.06] bg-surface p-6">
      <h2 class="mb-4 text-sm font-medium text-text-secondary">New Feature Flag</h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-xs text-text-muted">Key *</label>
          <input
            type="text"
            bind:value={newFlag.key}
            placeholder="e.g. new-dashboard"
            class="w-full rounded-md border border-white/[0.08] bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-text-muted">Name *</label>
          <input
            type="text"
            bind:value={newFlag.name}
            placeholder="e.g. New Dashboard"
            class="w-full rounded-md border border-white/[0.08] bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs text-text-muted">Description</label>
          <input
            type="text"
            bind:value={newFlag.description}
            placeholder="What this flag controls"
            class="w-full rounded-md border border-white/[0.08] bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-text-muted">Environment</label>
          <select
            bind:value={newFlag.environment}
            class="w-full rounded-md border border-white/[0.08] bg-surface-base px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none"
          >
            <option value="">All environments</option>
            <option value="development">Development</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs text-text-muted">Rollout % (0-100)</label>
          <input
            type="number"
            min="0"
            max="100"
            bind:value={newFlag.rolloutPercentage}
            class="w-full rounded-md border border-white/[0.08] bg-surface-base px-3 py-2 text-sm text-text-primary focus:border-brand focus:outline-none"
          />
        </div>
      </div>
      <div class="mt-4 flex items-center gap-4">
        <label class="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" bind:checked={newFlag.enabled} class="rounded border-white/[0.08]" />
          Enabled
        </label>
        <button
          onclick={() => createFlagMutation.mutate()}
          disabled={createFlagMutation.isPending || !newFlag.key || !newFlag.name}
          class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {createFlagMutation.isPending ? 'Creating...' : 'Create Flag'}
        </button>
      </div>
    </div>
  {/if}

  {#if flagsQuery.isPending}
    <div class="flex items-center justify-center py-12">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
    </div>
  {:else if flagsQuery.data}
    {@const flags = flagsQuery.data}
    {#if flags.length === 0}
      <div class="rounded-lg border border-white/[0.06] bg-surface p-8 text-center">
        <p class="text-sm text-text-muted">No feature flags yet. Create one to get started.</p>
      </div>
    {:else}
      <div class="overflow-hidden rounded-lg border border-white/[0.06]">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/[0.06] bg-surface-deep">
              <th class="px-4 py-3 text-left text-xs font-medium text-text-muted">Flag</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-muted">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-muted">Rollout</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-muted">Environment</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-muted">Updated</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each flags as flag (flag.key as string)}
              {@const key = flag.key as string}
              {@const isEnabled = flag.enabled as boolean}
              {@const isKillSwitch = flag.killSwitch as boolean}
              {@const pct = flag.rolloutPercentage as number}
              <tr class="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td class="px-4 py-3">
                  {#if editingKey === key && editFlag}
                    <div class="space-y-1">
                      <input
                        type="text"
                        value={editFlag.name as string}
                        oninput={(e) => (editFlag = { ...editFlag, name: (e.target as HTMLInputElement).value })}
                        class="w-full rounded border border-brand/30 bg-surface-base px-2 py-1 text-sm text-text-primary"
                      />
                      <input
                        type="text"
                        value={editFlag.description as string ?? ''}
                        oninput={(e) => (editFlag = { ...editFlag, description: (e.target as HTMLInputElement).value })}
                        placeholder="Description"
                        class="w-full rounded border border-white/[0.08] bg-surface-base px-2 py-1 text-xs text-text-secondary"
                      />
                    </div>
                  {:else}
                    <div>
                      <p class="text-sm font-medium text-text-primary">{flag.name as string}</p>
                      <p class="font-mono text-xs text-text-muted">{key}</p>
                    </div>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  {#if isKillSwitch}
                    <span class="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                      Kill Switch
                    </span>
                  {:else if isEnabled}
                    <span class="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                      Enabled
                    </span>
                  {:else}
                    <span class="inline-flex items-center rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-text-muted">
                      Disabled
                    </span>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  {#if editingKey === key && editFlag}
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editFlag.rolloutPercentage as number}
                      oninput={(e) => (editFlag = { ...editFlag, rolloutPercentage: Number((e.target as HTMLInputElement).value) })}
                      class="w-20 rounded border border-brand/30 bg-surface-base px-2 py-1 text-sm text-text-primary"
                    />
                  {:else}
                    <div class="flex items-center gap-2">
                      <div class="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          class="h-full rounded-full bg-brand"
                          style="width: {Math.min(pct, 100)}%"
                        ></div>
                      </div>
                      <span class="text-xs text-text-muted">{pct}%</span>
                    </div>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  {#if editingKey === key && editFlag}
                    <select
                      value={editFlag.environment as string ?? ''}
                      onchange={(e) => (editFlag = { ...editFlag, environment: (e.target as HTMLSelectElement).value })}
                      class="rounded border border-brand/30 bg-surface-base px-2 py-1 text-sm text-text-primary"
                    >
                      <option value="">All</option>
                      <option value="development">Dev</option>
                      <option value="staging">Staging</option>
                      <option value="production">Prod</option>
                    </select>
                  {:else}
                    <span class="text-xs text-text-muted">{(flag.environment as string) ?? 'All'}</span>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs text-text-muted">
                    {new Date(flag.updatedAt as number).toLocaleDateString()}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    {#if editingKey === key}
                      <button
                        onclick={saveEdit}
                        class="rounded px-2 py-1 text-xs text-brand hover:bg-brand/10"
                      >
                        Save
                      </button>
                      <button
                        onclick={() => { editingKey = null; editFlag = null }}
                        class="rounded px-2 py-1 text-xs text-text-muted hover:bg-white/[0.04]"
                      >
                        Cancel
                      </button>
                    {:else}
                      <button
                        onclick={() => toggleMutation.mutate({ enabled: !isEnabled, key })}
                        class={cn(
                          'rounded px-2 py-1 text-xs transition-colors',
                          isEnabled
                            ? 'text-yellow-400 hover:bg-yellow-500/10'
                            : 'text-green-400 hover:bg-green-500/10',
                        )}
                      >
                        {isEnabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onclick={() => startEdit(flag)}
                        class="rounded px-2 py-1 text-xs text-text-muted hover:bg-white/[0.04]"
                      >
                        Edit
                      </button>
                      <button
                        onclick={() => killSwitchMutation.mutate(key)}
                        class="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                        title="Activate kill switch — immediately disables the flag"
                      >
                        Kill
                      </button>
                      <button
                        onclick={() => { if (confirm('Delete this flag?')) deleteMutation.mutate(key) }}
                        class="rounded px-2 py-1 text-xs text-text-faint hover:bg-red-500/10 hover:text-red-400"
                      >
                        Delete
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else if flagsQuery.isError}
    <div class="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      Failed to load feature flags
    </div>
  {/if}
</div>
