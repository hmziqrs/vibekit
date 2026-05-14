<script lang="ts">
  import { cn } from '$lib/utils'
  import { createQuery } from '@tanstack/svelte-query'

  interface Announcement {
    id: string
    message: string
    type: 'critical' | 'info' | 'warning'
  }

  let dismissed = $state<Set<string>>(new Set())

  const query = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/announcements')
      if (!res.ok) return []
      return res.json() as Promise<Announcement[]>
    },
    queryKey: ['announcements'],
    refetchInterval: 60_000,
    retry: 0,
  }))

  const visibleAnnouncements = $derived(
    (query.data ?? []).filter((a) => !dismissed.has(a.id))
  )

  function dismiss(id: string) {
    dismissed = new Set([...dismissed, id])
  }

  const typeStyles: Record<string, string> = {
    critical: 'bg-destructive/10 border-destructive/20 text-destructive',
    info: 'bg-info/10 border-info/20 text-info',
    warning: 'bg-warning/10 border-warning/20 text-warning',
  }
</script>

{#if visibleAnnouncements.length > 0}
  <div class="space-y-2">
    {#each visibleAnnouncements as a (a.id)}
      <div
        class={cn(
          'flex items-center gap-3 border px-4 py-2.5 text-[13px]',
          typeStyles[a.type] ?? 'bg-surface border-border text-text-secondary',
        )}
      >
        <p class="min-w-0 flex-1">{a.message}</p>
        <button
          class="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
          onclick={() => dismiss(a.id)}
          aria-label="Dismiss announcement"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    {/each}
  </div>
{/if}
