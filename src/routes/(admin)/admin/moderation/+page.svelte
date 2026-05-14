<script lang="ts">
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import FilterTabs from '$lib/components/filter-tabs.svelte'
  import { cn } from '$lib/utils'
  import { createQuery } from '@tanstack/svelte-query'

  interface ReportRow {
    id: string
    entityType: string
    entityId: string
    reason: string
    description: string | null
    status: string
    reporterName: string | null
    reporterEmail: string | null
    resolutionNote: string | null
    resolvedAt: string | null
    resolverName: string | null
    resolverEmail: string | null
    createdAt: string
  }

  let statusFilter = $state('pending')
  let entityTypeFilter = $state('')
  let pageNum = $state(1)
  let openMenuId = $state<string | null>(null)
  let resolveTarget = $state<ReportRow | null>(null)
  let showResolveDialog = $state(false)
  let resolveStatus = $state<'resolved' | 'dismissed'>('resolved')
  let resolutionNote = $state('')
  let resolving = $state(false)
  let mutationError = $state('')

  const statusTabs = [
    { label: 'Pending', value: 'pending' },
    { label: 'Reviewing', value: 'reviewing' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Dismissed', value: 'dismissed' },
    { label: 'All', value: '' },
  ]

  const entityTypeOptions = [
    { label: 'All Types', value: '' },
    { label: 'Blog Post', value: 'blogPost' },
    { label: 'Contact', value: 'contactSubmission' },
    { label: 'Item', value: 'item' },
    { label: 'Organization', value: 'organization' },
    { label: 'Team', value: 'team' },
    { label: 'User', value: 'user' },
  ]

  const reportsQuery = createQuery(() => ({
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (entityTypeFilter) params.set('entityType', entityTypeFilter)
      params.set('page', String(pageNum))
      params.set('limit', '20')
      const res = await fetch(`/api/admin/reports?${params}`)
      if (!res.ok) throw new Error('Failed to fetch reports')
      return res.json() as Promise<{ reports: ReportRow[]; total: number; page: number }>
    },
    queryKey: ['admin', 'reports', { entityType: entityTypeFilter, page: pageNum, status: statusFilter }],
    retry: 1,
  }))

  const statsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/admin/reports/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json() as Promise<{
        dismissed: number
        pending: number
        resolved: number
        reviewing: number
        total: number
      }>
    },
    queryKey: ['admin', 'reports', 'stats'],
    refetchInterval: 30_000,
    retry: 1,
  }))

  const totalPages = $derived(reportsQuery.data ? Math.ceil(reportsQuery.data.total / 20) : 1)

  const statusColors: Record<string, string> = {
    dismissed: 'bg-muted/15 text-text-muted',
    pending: 'bg-warning/15 text-warning',
    resolved: 'bg-success/15 text-success',
    reviewing: 'bg-info/15 text-info',
  }

  const reasonLabels: Record<string, string> = {
    harassment: 'Harassment',
    inappropriate: 'Inappropriate',
    misinformation: 'Misinformation',
    other: 'Other',
    spam: 'Spam',
  }

  const entityTypeLabels: Record<string, string> = {
    blogPost: 'Blog Post',
    contactSubmission: 'Contact',
    item: 'Item',
    organization: 'Organization',
    team: 'Team',
    user: 'User',
  }

  function closeMenus() {
    openMenuId = null
  }

  function openResolveDialog(report: ReportRow, action: 'resolved' | 'dismissed') {
    resolveTarget = report
    resolveStatus = action
    resolutionNote = ''
    showResolveDialog = true
    openMenuId = null
  }

  async function handleResolve() {
    if (!resolveTarget) return
    try {
      mutationError = ''
      resolving = true
      const res = await fetch(`/api/admin/reports/${resolveTarget.id}`, {
        body: JSON.stringify({ resolutionNote, status: resolveStatus }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      resolving = false
      if (res.ok) {
        showResolveDialog = false
        resolveTarget = null
        reportsQuery.refetch()
        statsQuery.refetch()
      } else {
        mutationError = 'Failed to resolve report. Please try again.'
      }
    } catch (error) {
      resolving = false
      mutationError = error instanceof Error ? error.message : 'Failed to resolve report.'
    }
  }

  function toggleMenu(id: string, e: Event) {
    e.stopPropagation()
    openMenuId = openMenuId === id ? null : id
  }

  $effect(() => {
    void statusFilter
    void entityTypeFilter
    pageNum = 1
  })
</script>

<svelte:window onclick={closeMenus} />

<ConfirmDialog
  bind:open={showResolveDialog}
  title={resolveStatus === 'resolved' ? 'Resolve Report' : 'Dismiss Report'}
  confirmLabel={resolving ? 'Saving...' : 'Confirm'}
  variant={resolveStatus === 'resolved' ? 'default' : 'danger'}
  onConfirm={handleResolve}
  disabled={resolving || !resolutionNote.trim()}
>
  {#if resolveTarget}
    <div class="space-y-3">
      <p class="text-[13px] text-text-muted">
        {resolveStatus === 'resolved'
          ? 'Mark this report as resolved with a note explaining the action taken.'
          : 'Dismiss this report as not requiring action.'}
      </p>
      <div class="rounded-lg border border-white/[0.06] bg-surface-base p-3">
        <p class="text-[12px] text-text-subtle">
          {entityTypeLabels[resolveTarget.entityType] ?? resolveTarget.entityType}
          &middot;
          {reasonLabels[resolveTarget.reason] ?? resolveTarget.reason}
        </p>
        {#if resolveTarget.description}
          <p class="mt-1 text-[13px] text-text-secondary">{resolveTarget.description}</p>
        {/if}
      </div>
      <textarea
        bind:value={resolutionNote}
        class="w-full rounded-lg border border-white/[0.06] bg-surface-base px-3 py-2 text-[13px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        rows="3"
        placeholder="Resolution note (required)..."
        maxlength="500"
      ></textarea>
    </div>
  {/if}
</ConfirmDialog>

{#if mutationError}
  <p class="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-[13px] text-destructive">{mutationError}</p>
{/if}

<h1 class="text-2xl font-bold text-text-primary">Content Moderation</h1>
<p class="mt-1 text-[14px] text-text-muted">Review and manage reported content.</p>

<!-- Stats -->
{#if statsQuery.data}
  <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
    <div class="rounded-xl border border-white/[0.06] bg-surface p-4">
      <p class="text-[12px] font-medium uppercase tracking-wider text-text-subtle">Pending</p>
      <p class="mt-1 text-2xl font-bold text-warning">{statsQuery.data.pending}</p>
    </div>
    <div class="rounded-xl border border-white/[0.06] bg-surface p-4">
      <p class="text-[12px] font-medium uppercase tracking-wider text-text-subtle">Reviewing</p>
      <p class="mt-1 text-2xl font-bold text-info">{statsQuery.data.reviewing}</p>
    </div>
    <div class="rounded-xl border border-white/[0.06] bg-surface p-4">
      <p class="text-[12px] font-medium uppercase tracking-wider text-text-subtle">Resolved</p>
      <p class="mt-1 text-2xl font-bold text-success">{statsQuery.data.resolved}</p>
    </div>
    <div class="rounded-xl border border-white/[0.06] bg-surface p-4">
      <p class="text-[12px] font-medium uppercase tracking-wider text-text-subtle">Total</p>
      <p class="mt-1 text-2xl font-bold text-text-primary">{statsQuery.data.total}</p>
    </div>
  </div>
{/if}

<!-- Filters -->
<div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div class="flex items-center gap-3">
    <select
      aria-label="Filter by entity type"
      class="rounded-lg border border-white/[0.06] bg-surface px-3 py-2 text-[13px] text-text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      bind:value={entityTypeFilter}
    >
      {#each entityTypeOptions as opt (opt.value)}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  </div>
  <FilterTabs tabs={statusTabs} bind:active={statusFilter} />
</div>

<!-- Table -->
<div class="mt-6 overflow-x-auto rounded-xl border border-white/[0.06] bg-surface">
  {#if reportsQuery.isPending}
    <div class="space-y-3 p-6">
      {#each Array(5) as _}
        <div class="h-16 w-full animate-pulse rounded bg-white/[0.06]"></div>
      {/each}
    </div>
  {:else if reportsQuery.error}
    <div class="p-6 text-center">
      <p class="text-[13px] text-destructive">Failed to load reports. Please try again.</p>
      <button
        class="mt-3 text-[13px] text-brand hover:underline"
        onclick={() => reportsQuery.refetch()}
      >Retry</button>
    </div>
  {:else if !reportsQuery.data?.reports.length}
    <div class="p-6 text-center">
      <p class="text-[13px] text-text-muted">No reports found.</p>
    </div>
  {:else}
    <table class="w-full min-w-[740px]">
      <thead>
        <tr class="border-b border-white/[0.06]">
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Report</th>
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Type</th>
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Reason</th>
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Status</th>
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Reporter</th>
          <th class="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-text-subtle">Date</th>
          <th class="px-5 py-3 text-right text-[12px] font-medium uppercase tracking-wider text-text-subtle">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-white/[0.04]">
        {#each reportsQuery.data.reports as report (report.id)}
          <tr class="transition-colors hover:bg-white/[0.02]">
            <td class="px-5 py-3.5">
              <div class="max-w-[200px]">
                <p class="truncate text-[12px] text-text-subtle" title={report.entityId}>
                  ID: {report.entityId.slice(0, 8)}...
                </p>
                {#if report.description}
                  <p class="mt-0.5 truncate text-[13px] text-text-secondary" title={report.description}>
                    {report.description}
                  </p>
                {/if}
                {#if report.resolutionNote}
                  <p class="mt-0.5 truncate text-[11px] text-text-faint" title={report.resolutionNote}>
                    Note: {report.resolutionNote}
                  </p>
                {/if}
              </div>
            </td>
            <td class="px-5 py-3.5">
              <span class="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-text-muted">
                {entityTypeLabels[report.entityType] ?? report.entityType}
              </span>
            </td>
            <td class="px-5 py-3.5 text-[13px] text-text-secondary">
              {reasonLabels[report.reason] ?? report.reason}
            </td>
            <td class="px-5 py-3.5">
              <span
                class={cn(
                  'inline-block rounded-full px-2 py-0.5 text-[11px] font-medium',
                  statusColors[report.status] ?? 'bg-white/[0.06] text-text-muted',
                )}
              >
                {report.status}
              </span>
            </td>
            <td class="px-5 py-3.5">
              <div>
                <p class="text-[13px] text-text-secondary">{report.reporterName || 'Anonymous'}</p>
                {#if report.reporterEmail}
                  <p class="text-[11px] text-text-faint">{report.reporterEmail}</p>
                {/if}
              </div>
            </td>
            <td class="px-5 py-3.5 text-[12px] text-text-subtle">
              {new Date(report.createdAt).toLocaleDateString()}
            </td>
            <td class="px-5 py-3.5 text-right">
              {#if report.status === 'pending' || report.status === 'reviewing'}
                <div class="relative inline-block">
                  <button
                    class="rounded-md p-1.5 text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
                    onclick={(e) => toggleMenu(report.id, e)}
                    aria-label="Report actions"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
                    </svg>
                  </button>
                  {#if openMenuId === report.id}
                    <div class="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-white/[0.06] bg-surface py-1 shadow-lg">
                      <button
                        class="w-full px-4 py-2 text-left text-[12px] text-success hover:bg-white/[0.04]"
                        onclick={() => openResolveDialog(report, 'resolved')}
                      >Resolve</button>
                      <button
                        class="w-full px-4 py-2 text-left text-[12px] text-warning hover:bg-white/[0.04]"
                        onclick={() => openResolveDialog(report, 'dismissed')}
                      >Dismiss</button>
                    </div>
                  {/if}
                </div>
              {:else if report.resolverName}
                <span class="text-[11px] text-text-faint">by {report.resolverName}</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
        <p class="text-[12px] text-text-subtle">
          Page {pageNum} of {totalPages}
        </p>
        <div class="flex gap-2">
          <button
            class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-white/[0.04] disabled:opacity-40"
            disabled={pageNum <= 1}
            onclick={() => (pageNum -= 1)}
          >Previous</button>
          <button
            class="rounded-lg border border-white/[0.06] px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:bg-white/[0.04] disabled:opacity-40"
            disabled={pageNum >= totalPages}
            onclick={() => (pageNum += 1)}
          >Next</button>
        </div>
      </div>
    {/if}
  {/if}
</div>
