<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'
  import { cn } from '$lib/utils'

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

  async function deletePost(id: string) {
    if (!confirm('Delete this post? This can be restored from trash.')) return
    const res = await fetch(`/api/blog/${id}`, { method: 'DELETE' })
    if (res.ok) postsQuery.refetch()
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

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      draft: 'bg-yellow-500/15 text-yellow-400',
      published: 'bg-green-500/15 text-green-400',
      archived: 'bg-red-500/15 text-red-400',
      trash: 'bg-white/[0.06] text-text-muted',
    }
    return map[status] ?? map.draft
  }
</script>

<div class="flex items-center justify-between">
  <h1 class="text-2xl font-bold text-text-primary">Blog Posts</h1>
  <a
    href="/admin/blog/new"
    class="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
  >
    New Post
  </a>
</div>

<!-- Status filter tabs -->
<div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div class="flex gap-1">
    {#each tabs as tab}
      <button
        class={cn(
          'rounded-lg px-3 py-2 text-[12px] font-medium transition-colors',
          statusFilter === tab.value
            ? 'bg-brand/10 text-brand'
            : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary',
        )}
        onclick={() => (statusFilter = tab.value)}
      >
        {tab.label}
      </button>
    {/each}
  </div>
  <div class="relative sm:max-w-xs sm:flex-1">
    <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <input
      type="text"
      placeholder="Search posts..."
      bind:value={search}
      class="w-full rounded-lg border border-white/[0.06] bg-surface px-9 py-2 text-[13px] text-text-primary placeholder:text-text-subtle outline-none transition-colors focus:border-brand/50"
    />
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
      {#each postsQuery.data.posts as post}
        <div class="flex items-center justify-between rounded-xl border border-white/[0.06] bg-surface px-5 py-4 transition-colors hover:bg-white/[0.02]">
          <div class="min-w-0 flex-1">
            <h3 class="truncate text-[15px] font-medium text-text-primary">{post.title}</h3>
            <div class="mt-1 flex items-center gap-3 text-[12px] text-text-subtle">
              <span>/blog/{post.slug}</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div class="ml-4 flex items-center gap-3">
            <span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium {statusBadge(statusFilter === 'trash' ? 'trash' : post.status)}">
              {statusFilter === 'trash' ? 'deleted' : post.status}
            </span>
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
                  onclick={() => deletePost(post.id)}
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
