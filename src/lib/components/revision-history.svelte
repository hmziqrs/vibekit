<script lang="ts">
  interface Revision {
    authorId: string
    changeDescription: string | null
    createdAt: number | null
    id: string
    title: string
  }

  interface Props {
    postId: string
    onRestore: () => void
  }

  let { postId, onRestore }: Props = $props()
  let revisions = $state<Revision[]>([])
  let loading = $state(true)
  let error = $state('')
  let restoring = $state('')

  async function fetchRevisions() {
    loading = true
    error = ''
    try {
      const res = await fetch(`/api/blog/${postId}/revisions`)
      if (!res.ok) throw new Error('Failed to fetch')
      const { revisions: revs } = (await res.json()) as { revisions: Revision[] }
      revisions = revs
    } catch {
      error = 'Failed to load revisions'
    } finally {
      loading = false
    }
  }

  async function restoreRevision(revId: string) {
    if (!confirm('Restore this revision? A snapshot of the current state will be saved first.')) return
    restoring = revId
    try {
      const res = await fetch(`/api/blog/${postId}/revisions/${revId}/restore`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to restore')
      onRestore()
      fetchRevisions()
    } catch {
      error = 'Failed to restore revision'
    } finally {
      restoring = ''
    }
  }

  function formatDate(ts: number | null): string {
    if (!ts) return ''
    return new Date(ts).toLocaleString()
  }

  fetchRevisions()
</script>

<div class="space-y-3">
  <h3 class="text-sm font-medium text-text-secondary">Revision History</h3>

  {#if loading}
    <p class="text-xs text-text-faint">Loading...</p>
  {:else if error}
    <p class="text-xs text-red-400">{error}</p>
  {:else if revisions.length === 0}
    <p class="text-xs text-text-faint">No revisions yet.</p>
  {:else}
    <div class="space-y-2 max-h-64 overflow-y-auto">
      {#each revisions as rev}
        <div class="rounded border border-border p-2 space-y-1">
          <p class="text-xs font-medium text-text-primary truncate">{rev.title}</p>
          <div class="flex items-center justify-between">
            <p class="text-[11px] text-text-muted">{formatDate(rev.createdAt)}</p>
            {#if rev.changeDescription}
              <span class="text-[10px] rounded-full bg-surface px-1.5 py-0.5 text-text-subtle">
                {rev.changeDescription}
              </span>
            {/if}
          </div>
          <button
            onclick={() => restoreRevision(rev.id)}
            disabled={restoring === rev.id}
            class="text-[11px] text-brand hover:underline disabled:opacity-50"
          >
            {restoring === rev.id ? 'Restoring...' : 'Restore'}
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
