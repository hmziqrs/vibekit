<script lang="ts">
  import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/svelte'

  interface Props {
    currentPage: number
    totalPages: number
    totalItems: number
    pageSize: number
    onPageChange: (page: number) => void
  }

  let { currentPage, totalPages, pageSize, totalItems, onPageChange }: Props = $props()

  let startItem = $derived((currentPage - 1) * pageSize + 1)
  let endItem = $derived(Math.min(currentPage * pageSize, totalItems))
  let pages = $derived(getPageNumbers(currentPage, totalPages))

  function getPageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)

    const pages: (number | '...')[] = [1]

    let start = Math.max(2, current - 1)
    let end = Math.min(total - 1, current + 1)

    if (current <= 3) {
      start = 2
      end = Math.min(4, total - 1)
    } else if (current >= total - 2) {
      start = Math.max(2, total - 3)
      end = total - 1
    }

    if (start > 2) pages.push('...')
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < total - 1) pages.push('...')

    pages.push(total)
    return pages
  }
</script>

<div class="flex items-center justify-between">
  <span class="text-[12px] text-text-muted">
    Showing {startItem}-{endItem} of {totalItems}
  </span>

  <div class="flex items-center gap-1">
    <button
      onclick={() => onPageChange(1)}
      disabled={currentPage <= 1}
      class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
    >
      <ChevronsLeft size={14} />
    </button>
    <button
      onclick={() => onPageChange(currentPage - 1)}
      disabled={currentPage <= 1}
      class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
    >
      <ChevronLeft size={14} />
    </button>

    {#each pages as page}
      {#if page === '...'}
        <span class="px-1 text-[12px] text-text-muted">...</span>
      {:else}
        <button
          onclick={() => onPageChange(page)}
          class="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors {page === currentPage
            ? 'bg-brand text-brand-foreground'
            : 'bg-surface text-text-muted hover:bg-white/[0.06] hover:text-text-primary'}"
        >
          {page}
        </button>
      {/if}
    {/each}

    <button
      onclick={() => onPageChange(currentPage + 1)}
      disabled={currentPage >= totalPages}
      class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
    >
      <ChevronRight size={14} />
    </button>
    <button
      onclick={() => onPageChange(totalPages)}
      disabled={currentPage >= totalPages}
      class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
    >
      <ChevronsRight size={14} />
    </button>
  </div>
</div>
