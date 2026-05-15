<script lang="ts">
  interface NotificationPref {
    channel: string
    enabled: boolean
    type: string
  }

  const NOTIFICATION_TYPES = [
    { label: 'Broadcasts', type: 'broadcast' },
    { label: 'Billing', type: 'billing' },
    { label: 'Security', type: 'security' },
    { label: 'Comments', type: 'comment' },
    { label: 'Organizations', type: 'organization' },
    { label: 'General', type: 'general' },
  ]

  const CHANNELS = [
    { channel: 'in_app', label: 'In-App' },
    { channel: 'email', label: 'Email' },
    { channel: 'push', label: 'Push' },
  ]

  let preferences = $state<NotificationPref[]>([])
  let loading = $state(true)
  let errorMsg = $state('')
  let saving = $state<string | null>(null)

  async function loadPreferences() {
    loading = true
    errorMsg = ''
    try {
      const res = await fetch('/api/notifications/preferences')
      if (!res.ok) throw new Error('Failed to load preferences')
      preferences = ((await res.json()) as { preferences: NotificationPref[] }).preferences ?? []
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : 'Failed to load preferences'
    } finally {
      loading = false
    }
  }

  function isEnabled(type: string, channel: string): boolean {
    return preferences.some((p) => p.type === type && p.channel === channel && p.enabled)
  }

  async function togglePref(type: string, channel: string) {
    const enabled = !isEnabled(type, channel)
    const key = `${type}-${channel}`
    saving = key
    errorMsg = ''
    try {
      const res = await fetch('/api/notifications/preferences', {
        body: JSON.stringify({ channel, enabled, type }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (!res.ok) throw new Error('Failed to update preference')
      // Optimistically update local state
      const existing = preferences.find((p) => p.type === type && p.channel === channel)
      if (existing) {
        existing.enabled = enabled
      } else {
        preferences = [...preferences, { channel, enabled, type }]
      }
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : 'Failed to update update preference'
    } finally {
      saving = null
    }
  }

  $effect(() => {
    loadPreferences()
  })
</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-2xl font-semibold text-text-primary">Notification Preferences</h1>
  <p class="mt-1 text-[14px] text-text-muted">Choose how you want to be notified.</p>

  {#if errorMsg}
    <p class="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
      {errorMsg}
    </p>
  {/if}

  {#if loading}
    <div class="mt-6 space-y-3">
      {#each Array(4) as _}
        <div class="h-12 animate-pulse rounded-lg bg-white/[0.04]"></div>
      {/each}
    </div>
  {:else}
    <div class="mt-6 overflow-hidden rounded-xl border border-white/6">
      <table class="w-full">
        <thead>
          <tr class="border-b border-white/6 bg-surface-elevated">
            <th class="px-4 py-3 text-start text-[12px] font-medium text-text-muted">Type</th>
            {#each CHANNELS as ch}
              <th class="px-4 py-3 text-center text-[12px] font-medium text-text-muted">{ch.label}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each NOTIFICATION_TYPES as nt}
            <tr class="border-b border-white/6 last:border-b-0">
              <td class="px-4 py-3 text-[13px] text-text-primary">{nt.label}</td>
              {#each CHANNELS as ch}
                {@const key = `${nt.type}-${ch.channel}`}
                {@const checked = isEnabled(nt.type, ch.channel)}
                <td class="px-4 py-3 text-center">
                  <button
                    onclick={() => togglePref(nt.type, ch.channel)}
                    disabled={saving === key}
                    class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand {checked ? 'bg-brand' : 'bg-white/10'}"
                    role="switch"
                    aria-checked={checked}
                    aria-label="{nt.label} {ch.label}"
                  >
                    <span
                      class="pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out {checked ? 'translate-x-4' : 'translate-x-0'}"
                    ></span>
                  </button>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <p class="mt-3 text-[12px] text-text-subtle">
      Changes are saved automatically. You will still receive critical security notifications.
    </p>
  {/if}
</div>
