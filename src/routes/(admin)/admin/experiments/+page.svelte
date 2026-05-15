<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { cn } from '$lib/utils'
  import { formatDate } from '$lib/i18n.svelte'

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

  const experimentsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/admin/experiments')
      if (!res.ok) throw new Error('Failed to fetch experiments')
      const data = (await res.json()) as { experiments: Record<string, unknown>[] }
      return data.experiments
    },
    queryKey: ['admin', 'experiments'],
  }))

  const resultsQuery = createQuery(() => ({
    enabled: Boolean(viewingResults),
    queryFn: async () => {
      if (!viewingResults) return []
      const res = await fetch(`/api/admin/experiments/${encodeURIComponent(viewingResults)}/results`)
      if (!res.ok) throw new Error('Failed to fetch results')
      const data = (await res.json()) as {
        results: {
          conversions: number
          conversionRate: number
          exposureCount: number
          isControl: boolean
          isWinner: boolean
          name: string
          pValue: number | null
          variantId: string
          zScore: number | null
        }[]
      }
      return data.results
    },
    queryKey: ['admin', 'experiment-results', typeof viewingResults],
  }))

  const createExpMutation = createMutation(() => ({
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
        const err = (await res.json()) as { error?: { message?: string } }
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
      case 'running': {
        return 'bg-success/10 text-success'
      }
      case 'draft': {
        return 'bg-muted text-text-muted'
      }
      case 'paused': {
        return 'bg-warning/10 text-warning'
      }
      case 'completed': {
        return 'bg-info/10 text-info'
      }
      case 'archived': {
        return 'bg-muted text-text-faint'
      }
      default: {
        return 'bg-muted text-text-muted'
      }
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
    <div class="rounded-lg border border-border bg-surface p-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-medium text-text-secondary">
          Results: <span class="font-mono text-brand">{viewingResults}</span>
        </h2>
        <button
          onclick={() => (viewingResults = null)}
          class="rounded px-3 py-1 text-xs text-text-muted hover:bg-surface"
        >
          Close
        </button>
      </div>
      {#if resultsQuery.isPending}
        <div class="flex justify-center py-8">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
        </div>
      {:else if resultsQuery.data && resultsQuery.data.length > 0}
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th class="px-3 py-2 text-start text-xs font-medium text-text-muted">Variant</th>
                <th class="px-3 py-2 text-end text-xs font-medium text-text-muted">Exposures</th>
                <th class="px-3 py-2 text-end text-xs font-medium text-text-muted">Conversions</th>
                <th class="px-3 py-2 text-end text-xs font-medium text-text-muted">Conv. Rate</th>
                <th class="px-3 py-2 text-end text-xs font-medium text-text-muted">Z-Score</th>
                <th class="px-3 py-2 text-end text-xs font-medium text-text-muted">P-Value</th>
                <th class="px-3 py-2 text-end text-xs font-medium text-text-muted">Significant?</th>
              </tr>
            </thead>
            <tbody>
              {#each resultsQuery.data as result (result.variantId)}
                <tr class="border-b border-border">
                  <td class="px-3 py-2">
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-text-primary">{result.name}</span>
                      {#if result.isControl}
                        <span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-text-muted">Control</span>
                      {/if}
                      {#if result.isWinner}
                        <span class="rounded bg-brand/20 px-1.5 py-0.5 text-[10px] text-brand">Winner</span>
                      {/if}
                    </div>
                  </td>
                  <td class="px-3 py-2 text-end text-sm text-text-secondary">{result.exposureCount}</td>
                  <td class="px-3 py-2 text-end text-sm text-text-secondary">{result.conversions}</td>
                  <td class="px-3 py-2 text-end text-sm font-medium text-text-primary">
                    {(result.conversionRate * 100).toFixed(2)}%
                  </td>
                  <td class="px-3 py-2 text-end text-sm text-text-secondary">
                    {result.zScore !== null ? result.zScore.toFixed(3) : '—'}
                  </td>
                  <td class="px-3 py-2 text-end text-sm text-text-secondary">
                    {result.pValue !== null ? result.pValue.toFixed(4) : '—'}
                  </td>
                  <td class="px-3 py-2 text-end">
                    {#if result.pValue !== null && result.pValue < 0.05}
                      <span class="text-xs font-medium text-success">Yes (95%)</span>
                    {:else if result.pValue !== null && result.pValue < 0.1}
                      <span class="text-xs font-medium text-warning">Marginal (90%)</span>
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
    <div class="rounded-lg border border-border bg-surface p-6">
      <h2 class="mb-4 text-sm font-medium text-text-secondary">New Experiment</h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label for="experiment-key" class="mb-1 block text-xs text-text-muted">Key *</label>
          <input
            id="experiment-key"
            type="text"
            bind:value={newExp.key}
            placeholder="e.g. checkout-redesign"
            class="w-full rounded-md border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label for="experiment-name" class="mb-1 block text-xs text-text-muted">Name *</label>
          <input
            id="experiment-name"
            type="text"
            bind:value={newExp.name}
            placeholder="e.g. Checkout Redesign"
            class="w-full rounded-md border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label for="experiment-target-metric" class="mb-1 block text-xs text-text-muted">Target Metric *</label>
          <input
            id="experiment-target-metric"
            type="text"
            bind:value={newExp.targetMetric}
            placeholder="e.g. conversion_rate"
            class="w-full rounded-md border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label for="experiment-description" class="mb-1 block text-xs text-text-muted">Description</label>
          <input
            id="experiment-description"
            type="text"
            bind:value={newExp.description}
            placeholder="What this experiment tests"
            class="w-full rounded-md border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      <div class="mt-4" aria-labelledby="experiment-variants-label">
        <div class="mb-2 flex items-center justify-between">
          <span id="experiment-variants-label" class="text-xs font-medium text-text-muted">Variants</span>
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
                aria-label="Variant name"
                class="w-40 rounded border border-border bg-surface-base px-2 py-1 text-sm text-text-primary"
              />
              <input
                type="number"
                min="1"
                max="100"
                bind:value={variant.trafficPercentage}
                aria-label="Traffic percentage"
                class="w-20 rounded border border-border bg-surface-base px-2 py-1 text-sm text-text-primary"
              />
              <span class="text-xs text-text-muted">%</span>
              {#if i === 0}
                <span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-text-muted">Control</span>
              {:else}
                <button
                  onclick={() => removeVariant(i)}
                  class="rounded px-1 py-0.5 text-xs text-destructive hover:bg-destructive/10"
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
          onclick={() => createExpMutation.mutate()}
          disabled={createExpMutation.isPending || !newExp.key || !newExp.name}
          class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {createExpMutation.isPending ? 'Creating...' : 'Create Experiment'}
        </button>
      </div>
    </div>
  {/if}

  {#if experimentsQuery.isPending}
    <div class="flex items-center justify-center py-12">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
    </div>
  {:else if experimentsQuery.error}
    <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
      <p class="text-[14px] text-destructive">Failed to load experiments.</p>
      <button
        onclick={() => experimentsQuery.refetch()}
        class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Try again
      </button>
    </div>
  {:else if experimentsQuery.data}
    {@const experiments = experimentsQuery.data}
    {#if experiments.length === 0}
      <div class="rounded-lg border border-border bg-surface p-8 text-center">
        <p class="text-sm text-text-muted">No experiments yet. Create one to start testing.</p>
      </div>
    {:else}
      <div class="overflow-hidden rounded-lg border border-border">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border bg-surface-deep">
              <th class="px-4 py-3 text-start text-xs font-medium text-text-muted">Experiment</th>
              <th class="px-4 py-3 text-start text-xs font-medium text-text-muted">Status</th>
              <th class="px-4 py-3 text-start text-xs font-medium text-text-muted">Target Metric</th>
              <th class="px-4 py-3 text-start text-xs font-medium text-text-muted">Created</th>
              <th class="px-4 py-3 text-end text-xs font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each experiments as exp (exp.key as string)}
              {@const key = exp.key as string}
              {@const status = exp.status as string}
              <tr class="border-b border-border hover:bg-surface-deep/50">
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
                    {formatDate(exp.createdAt as number)}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    {#if status === 'draft'}
                      <button
                        onclick={() => statusMutation.mutate({ key, status: 'running' })}
                        class="rounded px-2 py-1 text-xs text-success hover:bg-success/10"
                      >
                        Start
                      </button>
                    {:else if status === 'running'}
                      <button
                        onclick={() => statusMutation.mutate({ key, status: 'paused' })}
                        class="rounded px-2 py-1 text-xs text-warning hover:bg-warning/10"
                      >
                        Pause
                      </button>
                      <button
                        onclick={() => statusMutation.mutate({ key, status: 'completed' })}
                        class="rounded px-2 py-1 text-xs text-info hover:bg-info/10"
                      >
                        Complete
                      </button>
                    {:else if status === 'paused'}
                      <button
                        onclick={() => statusMutation.mutate({ key, status: 'running' })}
                        class="rounded px-2 py-1 text-xs text-success hover:bg-success/10"
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
                      class="rounded px-2 py-1 text-xs text-text-faint hover:bg-destructive/10 hover:text-destructive"
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
