<script lang="ts">
  import ConfirmDialog from '$lib/components/confirm-dialog.svelte'
  import { cn } from '$lib/utils'
  import { createQuery } from '@tanstack/svelte-query'
  import { formatDate } from '$lib/i18n.svelte'

  interface ConfigEntry {
    createdAt: string | null
    description: string
    id: string
    key: string
    type: 'boolean' | 'json' | 'string'
    updatedAt: string | null
    value: string
  }

  interface AnnouncementRow {
    createdAt: string
    createdBy: string | null
    endsAt: string | null
    id: string
    isActive: boolean
    message: string
    startsAt: string | null
    type: 'critical' | 'info' | 'warning'
    updatedAt: string
  }

  let editingKey = $state<string | null>(null)
  let editingValue = $state('')
  let savingConfig = $state(false)
  let showCreateAnnouncement = $state(false)
  let deletingId = $state<string | null>(null)
  let showDeleteDialog = $state(false)
  let newMessage = $state('')
  let newType = $state<'info' | 'warning' | 'critical'>('info')
  let newStartsAt = $state('')
  let newEndsAt = $state('')
  let creating = $state(false)
  let togglingId = $state<string | null>(null)
  let mutationError = $state('')
  let section = $state<'announcements' | 'config' | 'history' | 'maintenance'>('config')

  const configQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/admin/config')
      if (!res.ok) throw new Error('Failed to fetch config')
      return res.json() as Promise<ConfigEntry[]>
    },
    queryKey: ['admin', 'config'],
    retry: 1,
  }))

  const announcementsQuery = createQuery(() => ({
    queryFn: async () => {
      const res = await fetch('/api/admin/announcements')
      if (!res.ok) throw new Error('Failed to fetch announcements')
      return res.json() as Promise<{ announcements: AnnouncementRow[]; total: number }>
    },
    queryKey: ['admin', 'announcements'],
    retry: 1,
  }))

  const historyQuery = createQuery(() => ({
    enabled: section === 'history',
    queryFn: async () => {
      const res = await fetch('/api/admin/config/history?limit=20')
      if (!res.ok) throw new Error('Failed to fetch history')
      return res.json() as Promise<{
        versions: {
          changedBy: string | null
          configKey: string
          createdAt: number
          environment: string | null
          id: string
          newValue: string | null
          oldValue: string | null
        }[]
      }>
    },
    queryKey: ['admin', 'config-history'],
  }))

  const maintenanceConfig = $derived(configQuery.data?.find((c) => c.key === 'maintenance_mode'))
  const featureFlags = $derived(configQuery.data?.filter((c) => c.key !== 'maintenance_mode' && c.key !== 'maintenance_message') ?? [])

  const typeColors: Record<string, string> = {
    critical: 'bg-destructive/15 text-destructive',
    info: 'bg-info/15 text-info',
    warning: 'bg-warning/15 text-warning',
  }

  const typeLabels: Record<string, string> = {
    critical: 'Critical',
    info: 'Info',
    warning: 'Warning',
  }

  const configLabels: Record<string, string> = {
    blog_comments_enabled: 'Blog Comments',
    file_upload_max_mb: 'Max Upload Size (MB)',
    maintenance_message: 'Maintenance Message',
    registration_enabled: 'Registration',
  }

  function startEdit(config: ConfigEntry) {
    editingKey = config.key
    editingValue = config.value
  }

  function cancelEdit() {
    editingKey = null
    editingValue = ''
  }

  async function saveConfig(key: string, value: string) {
    savingConfig = true
    mutationError = ''
    try {
      const res = await fetch(`/api/admin/config/${key}`, {
        body: JSON.stringify({ value }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? 'Failed to save config')
      }
      editingKey = null
      editingValue = ''
      configQuery.refetch()
    } catch (error) {
      mutationError = error instanceof Error ? error.message : 'Failed to save config'
    } finally {
      savingConfig = false
    }
  }

  async function toggleBoolean(key: string, currentValue: string) {
    const newValue = currentValue === 'true' ? 'false' : 'true'
    await saveConfig(key, newValue)
  }

  async function toggleMaintenance() {
    if (!maintenanceConfig) return
    await toggleBoolean('maintenance_mode', maintenanceConfig.value)
  }

  async function createAnnouncement() {
    creating = true
    mutationError = ''
    try {
      const body: Record<string, unknown> = {
        isActive: true,
        message: newMessage,
        type: newType,
      }
      if (newStartsAt) body.startsAt = new Date(newStartsAt).toISOString()
      if (newEndsAt) body.endsAt = new Date(newEndsAt).toISOString()

      const res = await fetch('/api/admin/announcements', {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? 'Failed to create announcement')
      }
      showCreateAnnouncement = false
      newMessage = ''
      newType = 'info'
      newStartsAt = ''
      newEndsAt = ''
      announcementsQuery.refetch()
    } catch (error) {
      mutationError = error instanceof Error ? error.message : 'Failed to create announcement'
    } finally {
      creating = false
    }
  }

  async function toggleAnnouncementActive(id: string, currentActive: boolean) {
    togglingId = id
    mutationError = ''
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        body: JSON.stringify({ isActive: !currentActive }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? 'Failed to update announcement')
      }
      announcementsQuery.refetch()
    } catch (error) {
      mutationError = error instanceof Error ? error.message : 'Failed to update announcement'
    } finally {
      togglingId = null
    }
  }

  async function deleteAnnouncement() {
    if (!deletingId) return
    mutationError = ''
    try {
      const res = await fetch(`/api/admin/announcements/${deletingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? 'Failed to delete announcement')
      }
      deletingId = null
      showDeleteDialog = false
      announcementsQuery.refetch()
    } catch (error) {
      mutationError = error instanceof Error ? error.message : 'Failed to delete announcement'
    }
  }

  const sections = [
    { id: 'config' as const, label: 'Feature Flags' },
    { id: 'maintenance' as const, label: 'Maintenance' },
    { id: 'history' as const, label: 'History' },
    { id: 'announcements' as const, label: 'Announcements' },
  ]
</script>

<h1 class="text-2xl font-bold text-text-primary">System Settings</h1>
<p class="mt-1 text-[14px] text-text-muted">Manage feature flags, maintenance mode, and announcements.</p>

<!-- Section tabs -->
<div class="mt-6 flex gap-1 rounded-lg bg-white/[0.03] p-1">
  {#each sections as s (s.id)}
    <button
      class={cn(
        'rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
        section === s.id
          ? 'bg-white/8 text-text-primary'
          : 'text-text-muted hover:text-text-secondary',
      )}
      onclick={() => (section = s.id)}
    >{s.label}</button>
  {/each}
</div>

{#if mutationError}
  <div class="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
    {mutationError}
  </div>
{/if}

<!-- Feature Flags Section -->
{#if section === 'config'}
  <div class="mt-6 space-y-3">
    {#if configQuery.isPending}
      {#each Array(4) as _}
        <div class="h-16 w-full animate-pulse rounded-xl bg-white/[0.06]"></div>
      {/each}
    {:else if configQuery.error}
      <div class="rounded-xl border border-white/[0.06] bg-surface p-6 text-center">
        <p class="text-[13px] text-destructive">Failed to load config.</p>
        <button
          class="mt-3 text-[13px] text-brand hover:underline"
          onclick={() => configQuery.refetch()}
        >Retry</button>
      </div>
    {:else}
      {#each featureFlags as config (config.key)}
        <div class="rounded-xl border border-white/[0.06] bg-surface p-4">
          <div class="flex items-center justify-between">
            <div class="min-w-0 flex-1">
              <p class="text-[13px] font-medium text-text-primary">{configLabels[config.key] ?? config.key}</p>
              <p class="mt-0.5 text-[12px] text-text-subtle">{config.description}</p>
            </div>
            <div class="ms-4 flex items-center gap-3">
              {#if config.type === 'boolean'}
                <button
                  class={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    config.value === 'true' ? 'bg-brand' : 'bg-white/[0.12]',
                  )}
                  onclick={() => toggleBoolean(config.key, config.value)}
                  disabled={savingConfig}
                  role="switch"
                  aria-checked={config.value === 'true'}
                  aria-label={configLabels[config.key] ?? config.key}
                >
                  <span
                    class={cn(
                      'pointer-events-none inline-block h-5 w-5 rounded-full bg-primary-foreground shadow transition-transform',
                      config.value === 'true' ? 'translate-x-5' : 'translate-x-0',
                    )}
                  ></span>
                </button>
              {:else if editingKey === config.key}
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    class="w-32 rounded-md border border-white/[0.06] bg-surface-base px-2 py-1 text-[12px] text-text-primary focus:border-brand focus:outline-none"
                    bind:value={editingValue}
                    aria-label="Config value"
                  />
                  <button
                    class="rounded-md bg-brand px-2 py-1 text-[11px] font-medium text-brand-foreground"
                    onclick={() => saveConfig(config.key, editingValue)}
                    disabled={savingConfig}
                  >Save</button>
                  <button
                    class="rounded-md border border-white/[0.06] px-2 py-1 text-[11px] text-text-muted"
                    onclick={cancelEdit}
                  >Cancel</button>
                </div>
              {:else}
                <button
                  class="rounded-md border border-white/[0.06] px-3 py-1 text-[12px] text-text-secondary hover:bg-white/[0.04]"
                  onclick={() => startEdit(config)}
                >{config.value}</button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
{/if}

<!-- Maintenance Mode Section -->
{#if section === 'maintenance'}
  <div class="mt-6">
    {#if configQuery.isPending}
      <div class="h-32 w-full animate-pulse rounded-xl bg-white/[0.06]"></div>
    {:else}
      <div class={cn(
        'rounded-xl border p-6',
        maintenanceConfig?.value === 'true'
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-white/[0.06] bg-surface',
      )}>
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <svg class={cn('h-5 w-5', maintenanceConfig?.value === 'true' ? 'text-destructive' : 'text-text-muted')} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h3 class="text-[14px] font-semibold text-text-primary">Maintenance Mode</h3>
            </div>
            <p class="mt-1 text-[13px] text-text-muted">
              {maintenanceConfig?.value === 'true'
                ? 'Maintenance mode is active. Non-admin users are blocked.'
                : 'When enabled, all non-admin users will see a maintenance page.'}
            </p>
          </div>
          <button
            class={cn(
              'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              maintenanceConfig?.value === 'true' ? 'bg-destructive' : 'bg-white/[0.12]',
            )}
            onclick={toggleMaintenance}
            disabled={savingConfig}
            role="switch"
            aria-checked={maintenanceConfig?.value === 'true'}
            aria-label="Toggle maintenance mode"
          >
            <span
              class={cn(
                'pointer-events-none inline-block h-6 w-6 rounded-full bg-primary-foreground shadow transition-transform',
                maintenanceConfig?.value === 'true' ? 'translate-x-5' : 'translate-x-0',
              )}
            ></span>
          </button>
        </div>
      </div>

      <!-- Maintenance message config -->
      {#if maintenanceConfig?.value === 'true'}
        {@const msgConfig = configQuery.data?.find((c) => c.key === 'maintenance_message')}
        <div class="mt-4 rounded-xl border border-white/[0.06] bg-surface p-4">
          <p class="text-[12px] font-medium uppercase tracking-wider text-text-subtle">Maintenance Message</p>
          {#if editingKey === 'maintenance_message'}
            <div class="mt-2 flex items-start gap-2">
              <textarea aria-label="Maintenance message"
                class="w-full rounded-md border border-white/[0.06] bg-surface-base px-3 py-2 text-[13px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                rows="3"
                bind:value={editingValue}
              ></textarea>
              <div class="flex flex-col gap-1">
                <button
                  class="rounded-md bg-brand px-3 py-1.5 text-[11px] font-medium text-brand-foreground"
                  onclick={() => saveConfig('maintenance_message', editingValue)}
                  disabled={savingConfig}
                >Save</button>
                <button
                  class="rounded-md border border-white/[0.06] px-3 py-1.5 text-[11px] text-text-muted"
                  onclick={cancelEdit}
                >Cancel</button>
              </div>
            </div>
          {:else}
            <p class="mt-2 text-[13px] text-text-secondary">{msgConfig?.value ?? 'We are performing scheduled maintenance. Please check back soon.'}</p>
            <button
              class="mt-2 text-[12px] text-brand hover:underline"
              onclick={() => startEdit({ key: 'maintenance_message', value: msgConfig?.value ?? '', type: 'string', description: '', id: '', createdAt: null, updatedAt: null })}
            >Edit message</button>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
{/if}

<!-- Config History Section -->
{#if section === 'history'}
  <div class="mt-6">
    <p class="text-[14px] font-medium text-text-secondary">Configuration Change History</p>
    {#if historyQuery.isPending}
      <div class="mt-4 space-y-3">
        {#each Array(5) as _}
          <div class="h-12 w-full animate-pulse rounded-xl bg-white/[0.06]"></div>
        {/each}
      </div>
    {:else if historyQuery.error}
      <div class="mt-4 rounded-xl border border-white/[0.06] bg-surface p-6 text-center">
        <p class="text-[13px] text-destructive">Failed to load history.</p>
      </div>
    {:else if !historyQuery.data?.versions.length}
      <div class="mt-4 rounded-xl border border-white/[0.06] bg-surface p-6 text-center">
        <p class="text-[13px] text-text-muted">No configuration changes recorded yet.</p>
      </div>
    {:else}
      <div class="mt-4 overflow-hidden rounded-lg border border-white/[0.06]">
        <table class="w-full">
          <thead>
            <tr class="border-b border-white/[0.06] bg-surface-deep">
              <th class="px-4 py-2 text-start text-xs font-medium text-text-muted">Key</th>
              <th class="px-4 py-2 text-start text-xs font-medium text-text-muted">Environment</th>
              <th class="px-4 py-2 text-start text-xs font-medium text-text-muted">Old Value</th>
              <th class="px-4 py-2 text-start text-xs font-medium text-text-muted">New Value</th>
              <th class="px-4 py-2 text-start text-xs font-medium text-text-muted">Date</th>
            </tr>
          </thead>
          <tbody>
            {#each historyQuery.data.versions as v (v.id)}
              <tr class="border-b border-white/[0.04]">
                <td class="px-4 py-2 font-mono text-xs text-text-primary">{v.configKey}</td>
                <td class="px-4 py-2 text-xs text-text-muted">{v.environment ?? 'All'}</td>
                <td class="max-w-32 truncate px-4 py-2 font-mono text-xs text-text-muted">{v.oldValue ?? '—'}</td>
                <td class="max-w-32 truncate px-4 py-2 font-mono text-xs text-brand">{v.newValue ?? '—'}</td>
                <td class="px-4 py-2 text-xs text-text-faint">{formatDate(v.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
{/if}

<!-- Announcements Section -->
{#if section === 'announcements'}
  <div class="mt-6">
    <div class="flex items-center justify-between">
      <p class="text-[14px] font-medium text-text-secondary">System Announcements</p>
      <button
        class="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
        onclick={() => (showCreateAnnouncement = true)}
      >New Announcement</button>
    </div>

    <!-- Create announcement form -->
    {#if showCreateAnnouncement}
      <div class="mt-4 rounded-xl border border-white/[0.06] bg-surface p-4">
        <div class="space-y-3">
          <textarea aria-label="Announcement message"
            class="w-full rounded-md border border-white/[0.06] bg-surface-base px-3 py-2 text-[13px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            rows="3"
            placeholder="Announcement message..."
            maxlength="500"
            bind:value={newMessage}
          ></textarea>
          <div class="flex flex-wrap items-end gap-3">
            <div>
              <label for="announcement-type" class="mb-1 block text-[11px] font-medium text-text-subtle">Type</label>
              <select
                id="announcement-type"
                class="rounded-md border border-white/[0.06] bg-surface-base px-2 py-1 text-[12px] text-text-primary focus:border-brand focus:outline-none"
                bind:value={newType}
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label for="announcement-starts" class="mb-1 block text-[11px] font-medium text-text-subtle">Starts At (optional)</label>
              <input
                id="announcement-starts"
                type="datetime-local"
                class="rounded-md border border-white/[0.06] bg-surface-base px-2 py-1 text-[12px] text-text-primary focus:border-brand focus:outline-none"
                bind:value={newStartsAt}
              />
            </div>
            <div>
              <label for="announcement-ends" class="mb-1 block text-[11px] font-medium text-text-subtle">Ends At (optional)</label>
              <input
                id="announcement-ends"
                type="datetime-local"
                class="rounded-md border border-white/[0.06] bg-surface-base px-2 py-1 text-[12px] text-text-primary focus:border-brand focus:outline-none"
                bind:value={newEndsAt}
              />
            </div>
            <div class="flex gap-2">
              <button
                class="rounded-md bg-brand px-3 py-1.5 text-[12px] font-medium text-brand-foreground"
                onclick={createAnnouncement}
                disabled={creating || !newMessage.trim()}
              >{creating ? 'Creating...' : 'Create'}</button>
              <button
                class="rounded-md border border-white/[0.06] px-3 py-1.5 text-[12px] text-text-muted"
                onclick={() => { showCreateAnnouncement = false; newMessage = ''; newType = 'info'; newStartsAt = ''; newEndsAt = '' }}
              >Cancel</button>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Announcements list -->
    {#if announcementsQuery.isPending}
      <div class="mt-4 space-y-3">
        {#each Array(3) as _}
          <div class="h-20 w-full animate-pulse rounded-xl bg-white/[0.06]"></div>
        {/each}
      </div>
    {:else if announcementsQuery.error}
      <div class="mt-4 rounded-xl border border-white/[0.06] bg-surface p-6 text-center">
        <p class="text-[13px] text-destructive">Failed to load announcements.</p>
        <button class="mt-3 text-[13px] text-brand hover:underline" onclick={() => announcementsQuery.refetch()}>Retry</button>
      </div>
    {:else if !announcementsQuery.data?.announcements.length}
      <div class="mt-4 rounded-xl border border-white/[0.06] bg-surface p-6 text-center">
        <p class="text-[13px] text-text-muted">No announcements yet.</p>
      </div>
    {:else}
      <div class="mt-4 space-y-3">
        {#each announcementsQuery.data.announcements as a (a.id)}
          <div class="rounded-xl border border-white/[0.06] bg-surface p-4">
            <div class="flex items-start justify-between">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span
                    class={cn(
                      'inline-block rounded-full px-2 py-0.5 text-[11px] font-medium',
                      typeColors[a.type] ?? 'bg-white/[0.06] text-text-muted',
                    )}
                  >{typeLabels[a.type] ?? a.type}</span>
                  <span
                    class={cn(
                      'inline-block rounded-full px-2 py-0.5 text-[11px] font-medium',
                      a.isActive ? 'bg-success/15 text-success' : 'bg-white/[0.06] text-text-muted',
                    )}
                  >{a.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <p class="mt-2 text-[13px] text-text-primary">{a.message}</p>
                <div class="mt-1.5 flex items-center gap-3 text-[11px] text-text-faint">
                  <span>Created {formatDate(a.createdAt)}</span>
                  {#if a.startsAt}
                    <span>Starts {formatDate(a.startsAt)}</span>
                  {/if}
                  {#if a.endsAt}
                    <span>Ends {formatDate(a.endsAt)}</span>
                  {/if}
                </div>
              </div>
              <div class="ms-4 flex items-center gap-2">
                <button
                  class={cn(
                    'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                    a.isActive
                      ? 'border-warning/30 text-warning hover:bg-warning/10'
                      : 'border-success/30 text-success hover:bg-success/10',
                  )}
                  onclick={() => toggleAnnouncementActive(a.id, a.isActive)}
                  disabled={togglingId === a.id}
                >{a.isActive ? 'Deactivate' : 'Activate'}</button>
                <button
                  class="rounded-md border border-destructive/30 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10"
                  onclick={() => { deletingId = a.id; showDeleteDialog = true }}
                >Delete</button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<!-- Delete confirmation -->
<ConfirmDialog
  bind:open={showDeleteDialog}
  title="Delete Announcement"
  message="This action cannot be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={deleteAnnouncement}
/>
