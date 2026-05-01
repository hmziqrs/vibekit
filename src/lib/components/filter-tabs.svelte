<script lang="ts">
  let {
    tabs,
    active = $bindable(''),
  }: {
    tabs: { label: string; value: string }[]
    active?: string
  } = $props()
</script>

<div class="flex gap-1 rounded-lg bg-white/[0.03] p-1">
  {#each tabs as tab (tab.value)}
    <button
      type="button"
      onclick={() => (active = tab.value)}
      class="rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors {active ===
      tab.value
        ? 'bg-white/8 text-text-primary'
        : 'text-text-muted hover:text-text-secondary'}"
    >
      {tab.label}
    </button>
  {/each}
</div>
