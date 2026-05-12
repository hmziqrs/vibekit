<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { cn } from '$lib/utils'

  const queryClient = useQueryClient()

  let showCreateForm = $state(false)
  let viewingResults = $state<string | null>(null)

  let newExp = $state({
    description: '',
    key: '',
    name: '',
    targetMetric: 'conversion_rate',
    variants: [
      { isControl: true, name: 'Control', payload: '{}', trafficPercentage: 50 },
      { isControl: false, name: 'Variant A', payload: '{}', trafficPercentage: 50 },
    ],
  })

  const experimentsQuery = createQuery({
    queryKey: ['admin', 'experiments'],
    queryFn: async () => {
      const res = await fetch('/api/admin/experiments')
      if (!res.ok) throw new Error('Failed to fetch experiments')
      const data = await res.json()
      return data.experiments as Record<string, unknown>[]
    },
  })

  const resultsQuery = createQuery({
    queryKey: ['admin', 'experiment-results', viewingResults],
    queryFn: async () => {
      if (!viewingResults) return []
      const res = await fetch(`/api/admin/experiments/${encodeURIComponent(viewingResults)}/results`)
      if (!res.ok) throw new Error('Failed to fetch results')
      const data = await res.json()
      return data.results as Array<{
        conversions: number
        conversionRate: number
        exposureCount: number
        isControl: boolean
        isWinner: boolean
        name: string
        pValue: number | null
        variantId: string
        zScore: number | null
      }>
    },
    enabled: () => !!viewingResults,
  })

  const createMutation = createMutation(() => ({
    mutationFn: async () => {
      const res = await fetch('/api/admin/experiments', {
        body: JSON.stringify({
          ...newExp,
          variants: newExp.variants.map((v) => ({
            ...v,
            isControl: v.isControl,
            payload: JSON.parse(v.payload || '{}'),
          })),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Failed to create experiment')
      }
      return res.json()
    },
    onSuccess: () => {
      showCreateForm = false
      newExp = {
        description: '',
        key: '',
        name: '',
        targetMetric: 'conversion_rate',
        variants: [
          { isControl: true, name: 'Control', payload: '{}', trafficPercentage: 50 },
          { isControl: false, name: 'Variant A', payload: '{}', trafficPercentage: 50 },
        ],
      }
      void queryClient.invalidateQueries({ queryKey: ['admin', 'experiments'] })
    },
  }))

  const statusMutation = createMutation(() => ({
    mutationFn: async ({ key, status }: { key: string; status: string }) => {
      const res = await fetch(`/api/admin/experiments/${encodeURIComponent(key)}`, {
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'experiments'] })
    },
  }))

  const deleteMutation = createMutation(() => ({
    mutationFn: async (key: string) => {
      const res = await fetch(`/api/admin/experiments/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete experiment')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'experiments'] })
    },
  }))

  function addVariant() {
    const n = newExp.variants.length
    newExp.variants = [
      ...newExp.variants,
      { isControl: false, name: `Variant ${String.fromCharCode(65 + n)}`, payload: '{}', trafficPercentage: 10 },
    ]
  }

  function removeVariant(index: number) {
    if (newExp.variants.length <= 2) return
    newExp.variants = newExp.variants.filter((_, i) => i !== index)
  }

  function statusColor(status: string) {
    switch (status) {
      case 'running':
        return 'bg-green-500/10 text-green-400'
      case 'draft':
        return 'bg-white/[0.06] text-text-muted'
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-400'
      case 'completed':
        return 'bg-blue-500/10 text-blue-400'
      case 'archived':
        return 'bg-white/[0.04] text-text-faint'
      default:
        return 'bg-white/[0.06] text-text-muted'
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-semibold text-text-primary">A/B Experiments</h1>
      <p class="mt-1 text-sm text-text-muted">Create, monitor, and analyze experiments</p>
    </div>
    <button
      onclick={() => (showCreateForm = !showCreateForm)}
      class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
    >
      {showCreateForm ? 'Cancel' : 'New Experiment'}
    </button>
  </div>

  {#if viewingResults}
    <div class="rounded-lg border border-white/[0.06] bg-surface p-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-medium text-text-secondary">
          Results: <span class="font-mono text-brand">{viewingResults}</span>
        </h2>
        <button
          onclick={() => (viewingResults = null)}
          class="rounded px-3 py-1 text-xs text-text-muted hover:bg-white/[0.04]"
        >
          Close
        </button>
      </div>
      {#if resultsQuery.current?.isLoading}
        <div class="flex justify-center py-8">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
        </div>
      {:else if resultsQuery.current?.data && resultsQuery.current.data.length > 0}
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-white/[0.06]">
                <th class="px-3 py-2 text-left text-xs font-medium text-text-muted">Variant</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-text-muted">Exposures</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-text-muted">Conversions</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-text-muted">Conv. Rate</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-text-muted">Z-Score</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-text-muted">P-Value</th>
                <th class="px-3 py-2 text-right text-xs font-medium text-text-muted">Significant?</th>
              </tr>
            </thead>
            <tbody>
              {#each resultsQuery.current.data as result (result.variantId)}
                <tr class="border-b border-white/[0.04]">
                  <td class="px-3 py-2">
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-text-primary">{result.name}</span>
                      {#if result.isControl}
                        <span class="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-text-muted">Control</span>
                      {/if}
                      {#if result.isWinner}
                        <span class="rounded bg-brand/20 px-1.5 py-0.5 text-[10px] text-brand">Winner</span>
                      {/if}
                    </div>
                  </td>
                  <td class="px-3 py-2 text-right text-sm text-text-secondary">{result.exposureCount}</td>
                  <td class="px-3 py-2 text-right text-sm text-text-secondary">{result.conversions}</td>
                  <td class="px-3 py-2 text-right text-sm font-medium text-text-primary">
                    {(result.conversionRate * 100).toFixed(2)}%
                  </td>
                  <td class="px-3 py-2 text-right text-sm text-text-secondary">
                    {result.zScore !== null ? result.zScore.toFixed(3) : '—'}
                  </td>
                  <td class="px-3 py-2 text-right text-sm text-text-secondary">
                    {result.pValue !== null ? result.pValue.toFixed(4) : '—'}
                  </td>
                  <td class="px-3 py-2 text-right">
                    {#if result.pValue !== null && result.pValue < 0.05}
                      <span class="text-xs font-medium text-green-400">Yes (95%)</span>
                    {:else if result.pValue !== null && result.pValue < 0.1}
                      <span class="text-xs font-medium text-yellow-400">Marginal (90%)</span>
                    {:else}
                      <span class="text-xs text-text-muted">No</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <p class="text-sm text-text-muted">No results yet. Start the experiment and collect data.</p>
      {/if}
    </div>
  {/if}

  {#if showCreateForm}
    <div class="rounded-lg border border-white/[0.06] bg-surface p-6">
      <h2 class="mb-4 text-sm font-medium text-text-secondary">New Experiment</h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-xs text-text-muted">Key *</label>
          <input
            type="text"
            bind:value={newExp.key}
            placeholder="e.g. checkout-redesign"
            class="w-full rounded-md border border-white/[0.08] bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-text-muted">Name *</label>
          <input
            type="text"
            bind:value={newExp.name}
            placeholder="e.g. Checkout Redesign"
            class="w-full rounded-md border border-white/[0.08] bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-text-muted">Target Metric *</label>
          <input
            type="text"
            bind:value={newExp.targetMetric}
            placeholder="e.g. conversion_rate"
            class="w-full rounded-md border border-white/[0.08] bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-text-muted">Description</label>
          <input
            type="text"
            bind:value={newExp.description}
            placeholder="What this experiment tests"
            class="w-full rounded-md border border-white/[0.08] bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <div class="mt-4">
        <div class="mb-2 flex items-center justify-between">
          <label class="text-xs font-medium text-text-muted">Variants</label>
          <button
            onclick={addVariant}
            class="rounded px-2 py-1 text-xs text-brand hover:bg-brand/10"
          >
            + Add Variant
          </button>
        </div>
        <div class="space-y-2">
          {#each newExp.variants as variant, i (i)}
            <div class="flex items-center gap-2">
              <input
                type="text"
                bind:value={variant.name}
                placeholder="Variant name"
                class="w-40 rounded border border-white/[0.08] bg-surface-base px-2 py-1 text-sm text-text-primary"
              />
              <input
                type="number"
                min="1"
                max="100"
                bind:value={variant.trafficPercentage}
                class="w-20 rounded border border-white/[0.08] bg-surface-base px-2 py-1 text-sm text-text-primary"
              />
              <span class="text-xs text-text-muted">%</span>
              {#if i === 0}
                <span class="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-text-muted">Control</span>
              {:else}
                <button
                  onclick={() => removeVariant(i)}
                  class="rounded px-1 py-0.5 text-xs text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <div class="mt-4">
        <button
          onclick={() => createMutation.mutate()}
          disabled={createMutation.current?.isPending || !newExp.key || !newExp.name}
          class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {createMutation.current?.isPending ? 'Creating...' : 'Create Experiment'}
        </button>
      </div>
    </div>
  {/if}

  {#if experimentsQuery.current?.isLoading}
    <div class="flex items-center justify-center py-12">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
    </div>
  {:else if experimentsQuery.current?.data}
    {@const experiments = experimentsQuery.current.data}
    {#if experiments.length === 0}
      <div class="rounded-lg border border-white/[0.06] bg-surface p-8 text-center">
        <p class="text-sm text-text-muted">No experiments yet. Create one to start testing.</p>
      </div>
    {:else}
      <div class="overflow-hidden rounded-lg border border-white/[0.06]">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/[0.06] bg-surface-deep">
              <th class="px-4 py-3 text-left text-xs font-medium text-text-muted">Experiment</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-muted">Status</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-muted">Target Metric</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-text-muted">Created</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each experiments as exp (exp.key as string)}
              {@const key = exp.key as string}
              {@const status = exp.status as string}
              <tr class="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td class="px-4 py-3">
                  <p class="text-sm font-medium text-text-primary">{exp.name as string}</p>
                  <p class="font-mono text-xs text-text-muted">{key}</p>
                </td>
                <td class="px-4 py-3">
                  <span class={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', statusColor(status))}>
                    {status}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs text-text-secondary">{exp.targetMetric as string}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-xs text-text-muted">
                    {new Date(exp.createdAt as number).toLocaleDateString()}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    {#if status === 'draft'}
                      <button
                        onclick={() => statusMutation.mutate({ key, status: 'running' })}
                        class="rounded px-2 py-1 text-xs text-green-400 hover:bg-green-500/10"
                      >
                        Start
                      </button>
                    {:else if status === 'running'}
                      <button
                        onclick={() => statusMutation.mutate({ key, status: 'paused' })}
                        class="rounded px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-500/10"
                      >
                        Pause
                      </button>
                      <button
                        onclick={() => statusMutation.mutate({ key, status: 'completed' })}
                        class="rounded px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10"
                      >
                        Complete
                      </button>
                    {:else if status === 'paused'}
                      <button
                        onclick={() => statusMutation.mutate({ key, status: 'running' })}
                        class="rounded px-2 py-1 text-xs text-green-400 hover:bg-green-500/10"
                      >
                        Resume
                      </button>
                    {/if}
                    <button
                      onclick={() => (viewingResults = key)}
                      class="rounded px-2 py-1 text-xs text-brand hover:bg-brand/10"
                    >
                      Results
                    </button>
                    <button
                      onclick={() => {
                        if (confirm('Delete this experiment?')) deleteMutation.mutate(key)
                      }}
                      class="rounded px-2 py-1 text-xs text-text-faint hover:bg-red-500/10 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>
