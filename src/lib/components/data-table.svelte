<script lang="ts">
  import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-svelte'

  interface Column {
    key: string
    label: string
    sortable?: boolean
    class?: string
  }

  interface Props {
    columns: Column[]
    rows: Record<string, unknown>[]
    loading?: boolean
    selectable?: boolean
    selectedIds?: Set<string>
    onSelectionChange?: (ids: Set<string>) => void
    sortKey?: string
    sortDir?: 'asc' | 'desc'
    onSort?: (key: string, dir: 'asc' | 'desc') => void
    error?: string
    emptyMessage?: string
    onRetry?: () => void
    children?: import('svelte').Snippet<[{ row: Record<string, unknown>; columnKey: string }]>
  }

  let {
    columns,
    rows,
    loading = false,
    selectable = false,
    selectedIds = new Set<string>(),
    onSelectionChange,
    sortKey = '',
    sortDir = 'desc',
    onSort,
    error = '',
    emptyMessage = 'No data',
    onRetry,
    children,
  }: Props = $props()

  let allChecked = $derived(rows.length > 0 && rows.every((r) => selectedIds.has(r.id as string)))
  let someChecked = $derived(!allChecked && rows.some((r) => selectedIds.has(r.id as string)))

  function handleHeaderSort(key: string) {
    if (!onSort) return
    if (sortKey === key) {
      onSort(key, sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(key, 'desc')
    }
  }

  function toggleAll() {
    if (!onSelectionChange) return
    if (allChecked) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(rows.map((r) => r.id as string)))
    }
  }

  function toggleRow(id: string) {
    if (!onSelectionChange) return
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }
</script>

<div class="overflow-hidden rounded-lg border border-border">
  <table class="w-full border-collapse">
    <thead>
      <tr class="bg-surface-deep">
        {#if selectable}
          <th class="w-10 px-3 py-3">
            <input
              type="checkbox"
              checked={allChecked}
              {someChecked}
              onchange={toggleAll}
              class="rounded border-border"
            />
          </th>
        {/if}
        {#each columns as col}
          <th class="px-4 py-3 text-left {col.class ?? ''}">
            {#if col.sortable && onSort}
              <button
                onclick={() => handleHeaderSort(col.key)}
                class="inline-flex items-center gap-1 text-[12px] font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-primary"
              >
                {col.label}
                {#if sortKey === col.key}
                  {#if sortDir === 'asc'}
                    <ArrowUp size={12} />
                  {:else}
                    <ArrowDown size={12} />
                  {/if}
                {:else}
                  <ArrowUpDown size={12} class="opacity-40" />
                {/if}
              </button>
            {:else}
              <span class="text-[12px] font-medium uppercase tracking-wider text-text-muted">{col.label}</span>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>

    <tbody>
      {#if loading}
        {#each Array(5) as _}
          <tr class="border-t border-border">
            {#if selectable}
              <td class="px-3 py-4"><div class="h-4 w-4 animate-pulse rounded bg-white/[0.06]"></div></td>
            {/if}
            {#each columns as col}
              <td class="px-4 py-4">
                <div class="h-4 w-full max-w-[200px] animate-pulse rounded bg-white/[0.06]"></div>
              </td>
            {/each}
          </tr>
        {/each}
      {:else if error}
        <tr>
          <td colspan={columns.length + (selectable ? 1 : 0)} class="px-4 py-8 text-center">
            <p class="text-[13px] text-red-400">{error}</p>
            {#if onRetry}
              <button onclick={onRetry} class="mt-2 text-[12px] text-brand hover:underline">Retry</button>
            {/if}
          </td>
        </tr>
      {:else if rows.length === 0}
        <tr>
          <td colspan={columns.length + (selectable ? 1 : 0)} class="px-4 py-8 text-center">
            <p class="text-[13px] text-text-muted">{emptyMessage}</p>
          </td>
        </tr>
      {:else}
        {#each rows as row (row.id as string)}
          <tr class="border-t border-border transition-colors hover:bg-white/[0.02]">
            {#if selectable}
              <td class="px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(row.id as string)}
                  onchange={() => toggleRow(row.id as string)}
                  class="rounded border-border"
                />
              </td>
            {/if}
            {#each columns as col}
              <td class="px-4 py-3 text-[13px] text-text-primary">
                {#if children}
                  {@render children({ columnKey: col.key, row })}
                {:else}
                  {row[col.key] ?? ''}
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>
