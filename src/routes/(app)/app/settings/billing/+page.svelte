<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { checkoutSessionSchema } from '$lib/validators/billing'
  import { formatDate } from '$lib/i18n.svelte'

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
    trialDays: number
  }

  interface Subscription {
    canceledAt: string | null
    createdAt: string
    currentPeriodEnd: string
    currentPeriodStart: string
    id: string
    planId: string
    status: string
    trialEnd: string | null
  }

  interface PaymentMethod {
    brand: string | null
    expiryMonth: number | null
    expiryYear: number | null
    id: string
    isDefault: boolean
    last4: string | null
    type: string
  }

  let changing = $state(false)
  let billingError = $state('')
  let canceling = $state(false)
  let detaching = $state<string | null>(null)
  let settingDefault = $state<string | null>(null)

  function tryParseFeatures(features: string | null): string[] {
    if (!features) return []
    try {
      return JSON.parse(features)
    } catch {
      return []
    }
  }

  const queryClient = useQueryClient()

  const plansQuery = createQuery(() => ({
    queryFn: async (): Promise<Plan[]> => {
      const res = await fetch('/api/billing/plans')
      if (!res.ok) return []
      const data = (await res.json()) as { plans: Plan[] }
      return data.plans
    },
    queryKey: ['billing', 'plans'],
  }))

  const subQuery = createQuery(() => ({
    queryFn: async (): Promise<Subscription | null> => {
      const res = await fetch('/api/billing/subscription')
      if (!res.ok) return null
      const data = (await res.json()) as { subscription: Subscription | null }
      return data.subscription
    },
    queryKey: ['billing', 'subscription'],
  }))

  const invoicesQuery = createQuery(() => ({
    queryFn: async (): Promise<unknown[]> => {
      const res = await fetch('/api/billing/invoices')
      if (!res.ok) return []
      const data = (await res.json()) as { invoices: unknown[] }
      return data.invoices
    },
    queryKey: ['billing', 'invoices'],
  }))

  const paymentMethodsQuery = createQuery(() => ({
    queryFn: async (): Promise<PaymentMethod[]> => {
      const res = await fetch('/api/billing/payment-methods')
      if (!res.ok) return []
      const data = (await res.json()) as { paymentMethods: PaymentMethod[] }
      return data.paymentMethods
    },
    queryKey: ['billing', 'payment-methods'],
  }))

  const currentPlan = $derived.by(() => {
    const sub = subQuery.data
    if (!sub) return null
    return plansQuery.data?.find((p) => p.id === sub.planId) ?? null
  })

  async function handleSubscribe(planId: string) {
    changing = true
    billingError = ''
    try {
      const payload = {
        cancelUrl: window.location.href,
        planId,
        successUrl: window.location.href,
      }
      const parsed = checkoutSessionSchema.safeParse(payload)
      if (!parsed.success) {
        billingError = 'Invalid checkout parameters'
        return
      }
      const res = await fetch('/api/billing/checkout', {
        body: JSON.stringify(parsed.data),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        billingError = 'Failed to start checkout session'
        return
      }
      const data = (await res.json()) as { subscription?: unknown; url?: string }
      if (data.url) {
        window.location.href = data.url
        return
      }
      queryClient.invalidateQueries({ queryKey: ['billing'] })
    } catch {
      billingError = 'An unexpected error occurred'
    } finally {
      changing = false
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel your subscription? You will lose access to paid features at the end of your billing period.')) return
    canceling = true
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      if (!res.ok) return
      queryClient.invalidateQueries({ queryKey: ['billing'] })
    } finally {
      canceling = false
    }
  }

  async function handleReactivate() {
    canceling = true
    try {
      const res = await fetch('/api/billing/reactivate', { method: 'POST' })
      if (!res.ok) return
      queryClient.invalidateQueries({ queryKey: ['billing'] })
    } finally {
      canceling = false
    }
  }

  async function handleDetachPaymentMethod(pmId: string) {
    if (!confirm('Remove this payment method? You may need to add a new one to keep your subscription active.')) return
    detaching = pmId
    try {
      const res = await fetch('/api/billing/payment-methods/detach', {
        body: JSON.stringify({ paymentMethodId: pmId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) return
      queryClient.invalidateQueries({ queryKey: ['billing', 'payment-methods'] })
    } finally {
      detaching = null
    }
  }

  async function handleSetDefault(pmId: string) {
    settingDefault = pmId
    try {
      const res = await fetch('/api/billing/payment-methods/set-default', {
        body: JSON.stringify({ paymentMethodId: pmId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) return
      queryClient.invalidateQueries({ queryKey: ['billing', 'payment-methods'] })
    } finally {
      settingDefault = null
    }
  }

  function formatCardBrand(brand: string | null): string {
    if (!brand) return 'Card'
    return brand.charAt(0).toUpperCase() + brand.slice(1)
  }

  function formatPrice(cents: number): string {
    if (cents === 0) return 'Free'
    return `$${(cents / 100).toFixed(2)}`
  }

  function statusColor(status: string): string {
    switch (status) {
      case 'active': { return 'bg-success/10 text-success' }
      case 'trialing': { return 'bg-brand/10 text-brand' }
      case 'canceled': { return 'bg-destructive/10 text-destructive' }
      case 'past_due': { return 'bg-warning/10 text-warning' }
      default: { return 'bg-white/[0.06] text-text-muted' }
    }
  }
</script>

<div class="mx-auto max-w-3xl space-y-6 p-6">
  <h1 class="text-2xl font-bold text-text-primary">Billing & Subscription</h1>

  {#if billingError}
    <div class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {billingError}
    </div>
  {/if}

  <!-- Current Subscription -->
  {#if subQuery.isPending}
    <div class="h-24 animate-pulse rounded-xl bg-white/[0.04]"></div>
  {:else if subQuery.data}
    {@const sub = subQuery.data}
    <div class="rounded-xl border border-white/[0.06] bg-surface p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[13px] text-text-muted">Current plan</p>
          <p class="mt-1 text-lg font-semibold text-text-primary">
            {currentPlan?.name ?? 'Unknown'}
          </p>
        </div>
        <span class="rounded-full px-2.5 py-1 text-[12px] font-medium {statusColor(sub.status)}">
          {sub.status}
        </span>
      </div>
      {#if currentPlan}
        <p class="mt-2 text-[14px] text-text-muted">
          {formatPrice(currentPlan!.priceInCents)}/{currentPlan!.interval}
          {#if sub.trialEnd}
            &middot; Trial ends {formatDate(sub.trialEnd)}
          {/if}
        </p>
      {/if}
      <p class="mt-1 text-[12px] text-text-faint">
        Period: {formatDate(sub.currentPeriodStart)} &ndash;
        {formatDate(sub.currentPeriodEnd)}
      </p>

      <div class="mt-4 flex gap-2">
        {#if sub.status === 'canceled'}
          <button
            onclick={handleReactivate}
            disabled={canceling}
            class="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            Reactivate
          </button>
        {:else}
          <button
            onclick={handleCancel}
            disabled={canceling}
            class="rounded-lg border border-white/[0.08] px-4 py-2 text-[13px] text-text-muted transition-colors hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancel subscription
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="rounded-xl border border-white/[0.06] bg-surface p-6 text-center">
      <p class="text-text-muted">No active subscription</p>
      <p class="mt-1 text-[13px] text-text-faint">Choose a plan below to get started</p>
    </div>
  {/if}

  <!-- Payment Methods -->
  {#if paymentMethodsQuery.isPending}
    <div class="space-y-3">
      {#each Array(2) as _}
        <div class="h-12 animate-pulse rounded-lg bg-white/[0.04]"></div>
      {/each}
    </div>
  {:else if paymentMethodsQuery.data && paymentMethodsQuery.data.length > 0}
    <div>
      <h2 class="mb-3 text-lg font-semibold text-text-primary">Payment Methods</h2>
      <div class="space-y-2">
        {#each paymentMethodsQuery.data as pm (pm.id)}
          <div
            class="flex items-center justify-between rounded-xl border border-white/[0.06] bg-surface px-4 py-3"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-8 w-12 items-center justify-center rounded bg-white/[0.06] text-[12px] font-medium text-text-muted"
              >
                {formatCardBrand(pm.brand)}
              </div>
              <div>
                <p class="text-[14px] text-text-primary">
                  &bull;&bull;&bull;&bull; {pm.last4 ?? '????'}
                  {#if pm.isDefault}
                    <span class="ms-2 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">Default</span>
                  {/if}
                </p>
                {#if pm.expiryMonth && pm.expiryYear}
                  <p class="text-[12px] text-text-faint">
                    Expires {String(pm.expiryMonth).padStart(2, '0')}/{pm.expiryYear}
                  </p>
                {/if}
              </div>
            </div>
            <div class="flex items-center gap-2">
              {#if !pm.isDefault}
                <button
                  onclick={() => handleSetDefault(pm.id)}
                  disabled={settingDefault === pm.id}
                  class="rounded-lg px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary disabled:opacity-50"
                >
                  {settingDefault === pm.id ? 'Setting...' : 'Set default'}
                </button>
              {/if}
              <button
                onclick={() => handleDetachPaymentMethod(pm.id)}
                disabled={detaching === pm.id}
                class="rounded-lg px-3 py-1.5 text-[12px] text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
              >
                {detaching === pm.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else if subQuery.data}
    <div class="rounded-xl border border-white/[0.06] bg-surface p-6 text-center">
      <p class="text-text-muted">No payment methods on file</p>
      <p class="mt-1 text-[13px] text-text-faint">
        Payment methods are added automatically during checkout.
      </p>
    </div>
  {/if}

  <!-- Available Plans -->
  {#if plansQuery.isPending}
    <div class="space-y-3">
      {#each Array(3) as _}
        <div class="h-12 animate-pulse rounded-lg bg-white/[0.04]"></div>
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
    <div>
      <h2 class="mb-3 text-lg font-semibold text-text-primary">Available Plans</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        {#each plansQuery.data as plan (plan.id)}
          <div class="rounded-xl border border-white/[0.06] bg-surface p-5">
            <div class="flex items-center justify-between">
              <h3 class="text-[15px] font-semibold text-text-primary">{plan.name}</h3>
              <span class="text-[14px] font-medium text-brand">
                {formatPrice(plan.priceInCents)}<span class="text-[11px] text-text-faint"
                  >/{plan.interval}</span
                >
              </span>
            </div>
            {#if plan.description}
              <p class="mt-1 text-[13px] text-text-muted">{plan.description}</p>
            {/if}
            {#if tryParseFeatures(plan.features).length > 0}
              <ul class="mt-3 space-y-1">
                {#each tryParseFeatures(plan.features) as feature}
                  <li class="flex items-center gap-2 text-[12px] text-text-muted">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-success">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feature}
                  </li>
                {/each}
              </ul>
            {/if}
            {#if plan.trialDays > 0}
              <p class="mt-2 text-[11px] text-text-faint">{plan.trialDays}-day free trial</p>
            {/if}
            {#if subQuery.data?.planId !== plan.id}
              <button
                onclick={() => handleSubscribe(plan.id)}
                disabled={changing}
                class="mt-4 w-full rounded-lg bg-brand px-3 py-2 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {subQuery.data ? 'Switch to this plan' : 'Subscribe'}
              </button>
            {:else}
              <div class="mt-4 w-full rounded-lg border border-brand/20 bg-brand/5 px-3 py-2 text-center text-[13px] font-medium text-brand">
                Current plan
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Invoices -->
  {#if invoicesQuery.isPending}
    <div class="space-y-3">
      {#each Array(3) as _}
        <div class="h-12 animate-pulse rounded-lg bg-white/[0.04]"></div>
      {/each}
    </div>
  {:else if invoicesQuery.error}
    <div class="rounded-xl border border-destructive/20 bg-surface p-8 text-center">
      <p class="text-[14px] text-destructive">Failed to load invoices.</p>
      <button
        onclick={() => invoicesQuery.refetch()}
        class="mt-2 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        Try again
      </button>
    </div>
  {:else if invoicesQuery.data && invoicesQuery.data.length > 0}
    <div>
      <h2 class="mb-3 text-lg font-semibold text-text-primary">Invoice History</h2>
      <div class="space-y-2">
        {#each invoicesQuery.data as inv}
          {@const invoice = inv as { amountInCents: number; createdAt: string; currency: string; id: string; status: string }}
          <div
            class="flex items-center justify-between rounded-xl border border-white/[0.06] bg-surface px-4 py-3"
          >
            <div>
              <p class="text-[14px] text-text-primary">
                {formatPrice(invoice.amountInCents)} {invoice.currency.toUpperCase()}
              </p>
              <p class="text-[12px] text-text-faint">{formatDate(invoice.createdAt)}</p>
            </div>
            <span class="rounded-full px-2 py-0.5 text-[11px] {statusColor(invoice.status)}">{invoice.status}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
