<script lang="ts">
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import FilterTabs from '$lib/components/filter-tabs.svelte'
  import SearchInput from '$lib/components/search-input.svelte'
  import StatusBadge from '$lib/components/status-badge.svelte'
  import { createQuery } from '@tanstack/svelte-query'

  interface PostRow {
    id: string
    title: string
    slug: string
    status: string
    publishedAt: string | null
    createdAt: string
    deletedAt: string | null
  }

  let statusFilter = $state('all')
  let search = $state('')
  let deleteTarget = $state<PostRow | null>(null)
  let showConfirmDialog = $state(false)

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-500/15 text-yellow-400',
    published: 'bg-green-500/15 text-green-400',
    archived: 'bg-red-500/15 text-red-400',
    trash: 'bg-white/[0.06] text-text-muted',
    deleted: 'bg-white/[0.06] text-text-muted',
  }

  const postsQuery = createQuery(() => ({
    queryKey: ['admin', 'posts', { status: statusFilter, search }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/blog?${params}`)
      if (!res.ok) throw new Error('Failed to fetch posts')
      const json: { posts?: PostRow[] } = await res.json()
      let posts = json.posts ?? []
      if (search) {
        const q = search.toLowerCase()
        posts = posts.filter((p) => p.title.toLowerCase().includes(q))
      }
      return { posts }
    },
    retry: 1,
  }))

  async function deletePost() {
    if (!deleteTarget) return
    const res = await fetch(`/api/blog/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      deleteTarget = null
      showConfirmDialog = false
      postsQuery.refetch()
    }
  }

  async function restorePost(id: string) {
    const res = await fetch(`/api/blog/${id}/restore`, { method: 'POST' })
    if (res.ok) postsQuery.refetch()
  }

  const tabs = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
    { value: 'trash', label: 'Trash' },
  ]
</script>

<ConfirmDialog
  bind:open={showConfirmDialog}
  title="Delete Post"
  message="Move this post to trash? It can be restored within 30 days."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={deletePost}
/>

<div class="flex items-center justify-between">
  <h1 class="text-2xl font-bold text-text-primary">Blog Posts</h1>
  <a
    href="/admin/blog/new"
    class="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
  >
    New Post
  </a>
</div>

<!-- Filters -->
<div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <FilterTabs tabs={tabs} bind:active={statusFilter} />
  <div class="sm:max-w-xs sm:flex-1">
    <SearchInput bind:value={search} placeholder="Search posts..." />
  </div>
</div>

<!-- Post list -->
<div class="mt-6">
  {#if postsQuery.isPending}
    <div class="space-y-3">
      {#each Array(4) as _}
        <div class="h-16 w-full animate-pulse rounded-xl bg-surface border border-white/[0.06]"></div>
      {/each}
    </div>
  {:else if postsQuery.error}
    <div class="rounded-xl border border-white/[0.06] bg-surface p-6 text-center">
      <p class="text-[13px] text-red-400">Failed to load posts.</p>
      <button class="mt-3 text-[13px] text-brand hover:underline" onclick={() => postsQuery.refetch()}>Retry</button>
    </div>
  {:else if !postsQuery.data?.posts.length}
    <div class="rounded-xl border border-white/[0.06] bg-surface p-6 text-center">
      <p class="text-[13px] text-text-muted">
        {statusFilter === 'trash' ? 'No trashed posts.' : 'No posts yet. Create your first post!'}
      </p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each postsQuery.data.posts as post (post.id)}
        <div class="flex items-center justify-between rounded-xl border border-white/[0.06] bg-surface px-5 py-4 transition-colors hover:bg-white/[0.02]">
          <div class="min-w-0 flex-1">
            <h3 class="truncate text-[15px] font-medium text-text-primary">{post.title}</h3>
            <div class="mt-1 flex items-center gap-3 text-[12px] text-text-subtle">
              <span>/blog/{post.slug}</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div class="ml-4 flex items-center gap-3">
            <StatusBadge
              status={statusFilter === 'trash' ? 'deleted' : post.status}
              colorMap={statusColors}
            />
            <div class="flex items-center gap-2">
              {#if statusFilter === 'trash'}
                <button
                  class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
                  onclick={() => restorePost(post.id)}
                >
                  Restore
                </button>
              {:else}
                <a
                  href="/admin/blog/{post.id}/edit"
                  class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
                >
                  Edit
                </a>
                <button
                  class="rounded-lg border border-red-500/30 px-3 py-1.5 text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
                  onclick={() => { deleteTarget = post; showConfirmDialog = true }}
                >
                  Delete
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
