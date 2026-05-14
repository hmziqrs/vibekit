<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query'

  interface TopPost {
    slug: string
    title: string
    views: number
  }

  interface Referrer {
    count: number
    domain: string
  }

  interface OverviewData {
    avgCompletion: number
    referrers: Referrer[]
    topPosts: TopPost[]
    totalViews: number
    uniqueVisitors: number
  }

  let daysFilter = $state(30)

  const overviewQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/overview?days=${daysFilter}`)
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return (await res.json()) as OverviewData
    },
    queryKey: ['admin', 'analytics', 'overview', { days: daysFilter }],
    retry: 1,
  }))

  function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }
</script>

<div class="flex items-center justify-between">
  <h1 class="text-2xl font-bold text-text-primary">Analytics</h1>
  <a href="/admin/blog" class="text-[13px] text-text-muted hover:text-text-primary">
    Back to blog
  </a>
</div>

<!-- Date range filter -->
<div class="mt-4 flex gap-2">
  {#each [7, 30, 90, 365] as d}
    <button
      onclick={() => (daysFilter = d)}
      class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors {daysFilter === d
        ? 'bg-brand text-brand-foreground'
        : 'border border-border bg-surface text-text-muted hover:text-text-primary'}"
    >
      {d === 365 ? 'All time' : `${d}d`}
    </button>
  {/each}
</div>

<!-- Stats -->
<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
  <div class="rounded-lg border border-border bg-surface p-3">
    <div class="text-[12px] text-text-muted">Total Views</div>
    <div class="text-xl font-semibold text-text-primary">
      {overviewQuery.data ? formatNumber(overviewQuery.data.totalViews) : '—'}
    </div>
  </div>
  <div class="rounded-lg border border-border bg-surface p-3">
    <div class="text-[12px] text-text-muted">Unique Visitors</div>
    <div class="text-xl font-semibold text-text-primary">
      {overviewQuery.data ? formatNumber(overviewQuery.data.uniqueVisitors) : '—'}
    </div>
  </div>
  <div class="rounded-lg border border-border bg-surface p-3">
    <div class="text-[12px] text-text-muted">Avg Completion</div>
    <div class="text-xl font-semibold text-success">
      {overviewQuery.data ? `${overviewQuery.data.avgCompletion}%` : '—'}
    </div>
  </div>
  <div class="rounded-lg border border-border bg-surface p-3">
    <div class="text-[12px] text-text-muted">Top Referrers</div>
    <div class="text-xl font-semibold text-text-primary">
      {overviewQuery.data ? overviewQuery.data.referrers.length : '—'}
    </div>
  </div>
</div>

<!-- Top Posts -->
<div class="mt-6">
  <h2 class="mb-3 text-lg font-semibold text-text-primary">Top Posts</h2>
  {#if overviewQuery.isPending}
    <div class="text-[13px] text-text-muted">Loading...</div>
  {:else if overviewQuery.data?.topPosts.length}
    <div class="overflow-hidden rounded-lg border border-border">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border bg-surface">
            <th class="px-4 py-2 text-left text-[12px] font-medium text-text-muted">Post</th>
            <th class="w-[100px] px-4 py-2 text-right text-[12px] font-medium text-text-muted">Views</th>
          </tr>
        </thead>
        <tbody>
          {#each overviewQuery.data.topPosts as post, i}
            <tr class="border-b border-border last:border-0">
              <td class="px-4 py-2.5">
                <a
                  href="/blog/{post.slug}"
                  class="text-[13px] font-medium text-text-primary hover:text-brand"
                >
                  {post.title}
                </a>
              </td>
              <td class="px-4 py-2.5 text-right text-[13px] text-text-muted">
                {formatNumber(post.views)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="text-[13px] text-text-muted">No views recorded yet.</p>
  {/if}
</div>

<!-- Referrers -->
{#if overviewQuery.data?.referrers.length}
  <div class="mt-6">
    <h2 class="mb-3 text-lg font-semibold text-text-primary">Top Referrers</h2>
    <div class="overflow-hidden rounded-lg border border-border">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border bg-surface">
            <th class="px-4 py-2 text-left text-[12px] font-medium text-text-muted">Source</th>
            <th class="w-[100px] px-4 py-2 text-right text-[12px] font-medium text-text-muted">Views</th>
          </tr>
        </thead>
        <tbody>
          {#each overviewQuery.data.referrers as ref}
            <tr class="border-b border-border last:border-0">
              <td class="px-4 py-2.5 text-[13px] text-text-primary">{ref.domain}</td>
              <td class="px-4 py-2.5 text-right text-[13px] text-text-muted">
                {formatNumber(ref.count)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}
