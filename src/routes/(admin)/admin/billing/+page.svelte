<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'

  interface Plan {
    currency: string
    description: string | null
    features: string | null
    id: string
    interval: 'month' | 'year'
    isActive: boolean
    name: string
    priceInCents: number
    slug: string
    sortOrder: number
    trialDays: number
  }

  interface BillingOverview {
    activeSubscriptions: number
    planDistribution: { count: number; planName: string }[]
    totalSubscriptions: number
  }

  let showCreatePlan = $state(false)
  let newPlanName = $state('')
  let newPlanSlug = $state('')
  let newPlanPrice = $state('')
  let newPlanInterval = $state<'month' | 'year'>('month')
  let mutationError = $state('')

  const queryClient = useQueryClient()

  const overviewQuery = createQuery(() => ({
    queryFn: async (): Promise<BillingOverview> => {
      const res = await fetch('/api/admin/billing/overview')
      if (!res.ok) throw new Error('Failed to fetch billing overview')
      return (await res.json()) as BillingOverview
    },
    queryKey: ['admin', 'billing', 'overview'],
  }))

  const plansQuery = createQuery(() => ({
    queryFn: async (): Promise<Plan[]> => {
      const res = await fetch('/api/admin/billing/plans')
      if (!res.ok) throw new Error('Failed to fetch plans')
      const data = (await res.json()) as { plans: Plan[] }
      return data.plans
    },
    queryKey: ['admin', 'billing', 'plans'],
  }))

  async function togglePlan(planId: string, isActive: boolean) {
    try {
      mutationError = ''
      const res = await fetch(`/api/admin/billing/plans/${planId}`, {
        body: JSON.stringify({ isActive: !isActive }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (!res.ok) {
        mutationError = 'Failed to update plan status. Please try again.'
        return
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing'] })
    } catch (error) {
      mutationError = error instanceof Error ? e.message : 'Failed to update plan status.'
    }
  }

  async function deletePlan(planId: string) {
    try {
      mutationError = ''
      const res = await fetch(`/api/admin/billing/plans/${planId}`, { method: 'DELETE' })
      if (!res.ok) {
        mutationError = 'Failed to delete plan. Please try again.'
        return
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing'] })
    } catch (error) {
      mutationError = error instanceof Error ? e.message : 'Failed to delete plan.'
    }
  }

  async function createPlan() {
    if (!newPlanName.trim() || !newPlanSlug.trim() || !newPlanPrice) return

    try {
      mutationError = ''
      const res = await fetch('/api/admin/billing/plans', {
        body: JSON.stringify({
          interval: newPlanInterval,
          name: newPlanName.trim(),
          priceInCents: Math.round(Number(newPlanPrice) * 100),
          slug: newPlanSlug.trim(),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        mutationError = 'Failed to create plan. Please try again.'
        return
      }

      newPlanName = ''
      newPlanSlug = ''
      newPlanPrice = ''
      showCreatePlan = false
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing'] })
    } catch (error) {
      mutationError = error instanceof Error ? e.message : 'Failed to create plan.'
    }
  }

  function formatPrice(cents: number, currency: string): string {
    if (cents === 0) return 'Free'
    return `${currency.toUpperCase()} $${(cents / 100).toFixed(2)}`
  }

  const totalActive = $derived(() => overviewQuery.data?.activeSubscriptions ?? 0)
  const totalAll = $derived(() => overviewQuery.data?.totalSubscriptions ?? 0)
</script>

<div class="space-y-6 p-6">
  {#if mutationError}
    <p class="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-[13px] text-destructive">{mutationError}</p>
  {/if}

  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-text-primary">Billing</h1>
    <button
      onclick={() => (showCreatePlan = !showCreatePlan)}
      class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
    >
      {showCreatePlan ? 'Cancel' : 'Create Plan'}
    </button>
  </div>

  <!-- Overview Stats -->
  {#if overviewQuery.error}
    <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
      <p class="text-[14px] text-destructive">Failed to load billing overview.</p>
      <button
        onclick={() => overviewQuery.refetch()}
        class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Try again
      </button>
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-border bg-surface p-5">
        <p class="text-[13px] text-text-muted">Active Subscriptions</p>
        <p class="mt-1 text-2xl font-bold text-text-primary">{totalActive()}</p>
      </div>
      <div class="rounded-xl border border-border bg-surface p-5">
        <p class="text-[13px] text-text-muted">Total Subscriptions</p>
        <p class="mt-1 text-2xl font-bold text-text-primary">{totalAll()}</p>
      </div>
      <div class="rounded-xl border border-border bg-surface p-5">
        <p class="text-[13px] text-text-muted">Plans</p>
        <p class="mt-1 text-2xl font-bold text-text-primary">{plansQuery.data?.length ?? 0}</p>
      </div>
    </div>
  {/if}

  <!-- Plan Distribution -->
  {#if overviewQuery.data?.planDistribution && overviewQuery.data.planDistribution.length > 0}
    <div class="rounded-xl border border-border bg-surface p-5">
      <h2 class="mb-3 text-[15px] font-semibold text-text-primary">Plan Distribution</h2>
      <div class="space-y-2">
        {#each overviewQuery.data.planDistribution as dist}
          <div class="flex items-center justify-between">
            <span class="text-[13px] text-text-muted">{dist.planName}</span>
            <span class="text-[13px] font-medium text-text-primary">{dist.count}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Create Plan Form -->
  {#if showCreatePlan}
    <div class="rounded-xl border border-brand/20 bg-brand/[0.02] p-5">
      <h2 class="mb-4 text-[15px] font-semibold text-text-primary">New Plan</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="plan-name" class="mb-1 block text-[12px] text-text-muted">Name</label>
          <input
            id="plan-name"
            bind:value={newPlanName}
            class="w-full rounded-lg border border-border bg-surface-base px-3 py-2 text-[14px] text-text-primary"
            placeholder="Pro"
          />
        </div>
        <div>
          <label for="plan-slug" class="mb-1 block text-[12px] text-text-muted">Slug</label>
          <input
            id="plan-slug"
            bind:value={newPlanSlug}
            class="w-full rounded-lg border border-border bg-surface-base px-3 py-2 text-[14px] text-text-primary"
            placeholder="pro"
          />
        </div>
        <div>
          <label for="plan-price" class="mb-1 block text-[12px] text-text-muted">Price ($)</label>
          <input
            id="plan-price"
            bind:value={newPlanPrice}
            class="w-full rounded-lg border border-border bg-surface-base px-3 py-2 text-[14px] text-text-primary"
            placeholder="29.00"
            type="number"
          />
        </div>
        <div>
          <label for="plan-interval" class="mb-1 block text-[12px] text-text-muted">Interval</label>
          <select
            id="plan-interval"
            bind:value={newPlanInterval}
            class="w-full rounded-lg border border-border bg-surface-base px-3 py-2 text-[14px] text-text-primary"
          >
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
      </div>
      <button
        onclick={createPlan}
        class="mt-4 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
      >
        Create Plan
      </button>
    </div>
  {/if}

  <!-- Plans List -->
  <div>
    <h2 class="mb-3 text-[15px] font-semibold text-text-primary">Plans</h2>
    {#if plansQuery.isPending}
      <div class="space-y-2">
        {#each Array(3) as _}
          <div class="h-14 animate-pulse rounded-xl bg-surface-deep"></div>
        {/each}
      </div>
    {:else if plansQuery.error}
      <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
        <p class="text-[14px] text-destructive">Failed to load plans.</p>
        <button
          onclick={() => plansQuery.refetch()}
          class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
        >
          Try again
        </button>
      </div>
    {:else if plansQuery.data && plansQuery.data.length > 0}
      <div class="space-y-2">
        {#each plansQuery.data as plan (plan.id)}
          <div class="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4">
            <div>
              <div class="flex items-center gap-2">
                <p class="text-[14px] font-medium text-text-primary">{plan.name}</p>
                <span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium {plan.isActive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}">
                  {plan.isActive ? 'active' : 'inactive'}
                </span>
              </div>
              <p class="mt-0.5 text-[12px] text-text-muted">
                {plan.slug} &middot; {formatPrice(plan.priceInCents, plan.currency)}/{plan.interval}
                {#if plan.trialDays > 0}&middot; {plan.trialDays}d trial{/if}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                onclick={() => togglePlan(plan.id, plan.isActive)}
                class="rounded-lg border border-border px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-surface"
              >
                {plan.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onclick={() => deletePlan(plan.id)}
                class="rounded-lg border border-destructive/20 px-3 py-1.5 text-[12px] text-destructive transition-colors hover:bg-destructive/10"
              >
                Delete
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-text-muted">No plans configured</p>
    {/if}
  </div>
</div>
