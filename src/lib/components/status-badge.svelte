<script lang="ts">
  const {
    status,
    colorMap,
  }: {
    status: string
    colorMap?: Record<string, string>
  } = $props()

  const defaultColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400',
    archived: 'bg-amber-500/10 text-amber-400',
    draft: 'bg-yellow-500/10 text-yellow-400',
    published: 'bg-green-500/10 text-green-400',
    suspended: 'bg-red-500/10 text-red-400',
    trash: 'bg-red-500/10 text-red-400',
  }

  const colorClass = $derived(
    colorMap?.[status] ?? defaultColors[status] ?? 'bg-white/[0.06] text-text-muted',
  )
</script>

<span
  class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium {colorClass}"
>
  {status}
</span>
