<script lang="ts">
  import { page } from '$app/state'
  import type { Component } from 'svelte'

  interface StatusConfig {
    description: string
    icon: Component
    title: string
  }

  interface Props {
    homeHref: string
    homeLabel: string
    statuses: Record<number, StatusConfig>
    fallbackIcon: Component
  }

  let { homeHref, homeLabel, statuses, fallbackIcon }: Props = $props()

  const status = $derived(page.status)
  const config = $derived(
    statuses[status] ?? {
      description: page.error?.message ?? 'An unexpected error occurred.',
      title: 'Something Went Wrong',
    },
  )
  const Icon = $derived(statuses[status]?.icon ?? fallbackIcon)
</script>

<svelte:head>
  <title>{status} — {config.title}</title>
</svelte:head>

<div class="flex flex-1 items-center justify-center">
  <div class="text-center">
    <div
      class="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]"
    >
      <Icon class="h-8 w-8 text-brand" />
    </div>

    <span class="mb-2 block text-[13px] font-medium uppercase tracking-wider text-brand">
      Error {status}
    </span>

    <h1 class="mb-3 text-xl font-semibold text-text-primary">{config.title}</h1>
    <p class="mb-6 text-sm text-text-muted">{config.description}</p>

    <a
      href={homeHref}
      class="rounded-xl bg-brand px-6 py-2.5 text-[14px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
    >
      {homeLabel}
    </a>
  </div>
</div>
