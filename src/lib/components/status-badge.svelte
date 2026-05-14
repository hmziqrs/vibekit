<script lang="ts">
  const {
    status,
    colorMap,
  }: {
    status: string
    colorMap?: Record<string, string>
  } = $props()

  const defaultColors: Record<string, string> = {
    active: 'bg-success/10 text-success',
    archived: 'bg-warning/10 text-warning',
    draft: 'bg-warning/10 text-warning',
    published: 'bg-success/10 text-success',
    suspended: 'bg-destructive/10 text-destructive',
    trash: 'bg-destructive/10 text-destructive',
  }

  const colorClass = $derived(
    colorMap?.[status] ?? defaultColors[status] ?? 'bg-muted text-text-muted',
  )
</script>

<span
  class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium {colorClass}"
>
  {status}
</span>
