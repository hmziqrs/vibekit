<script lang="ts">
  import { createFocusTrap, getShortcuts, formatShortcut } from '$lib/keyboard.svelte'

  let {
    open = $bindable(false),
  }: {
    open?: boolean
  } = $props()

  let dialogEl: HTMLDivElement | undefined = $state()

  const defaultShortcuts = [
    { description: 'Open search', key: 'k' },
    { description: 'Close dialog / panel', key: 'Esc' },
    { description: 'Navigate results', key: '↑ ↓' },
    { description: 'Select result', key: 'Enter' },
    { description: 'Show keyboard shortcuts', key: '?' },
  ]

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false
    }
  }

  $effect(() => {
    if (open && dialogEl) {
      const trap = createFocusTrap(dialogEl)
      return () => trap.destroy()
    }
  })
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    onclick={() => (open = false)}
    onkeydown={handleKeydown}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
    <div
      bind:this={dialogEl}
      class="mx-4 w-full max-w-md rounded-xl border border-white/[0.06] bg-surface p-6"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
      role="dialog"
      aria-label="Keyboard shortcuts"
      tabindex="0"
    >
      <h2 class="mb-4 text-base font-semibold text-text-primary">Keyboard Shortcuts</h2>

      <div class="space-y-2">
        {#each defaultShortcuts as shortcut (shortcut.key)}
          <div class="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.03]">
            <span class="text-[13px] text-text-secondary">{shortcut.description}</span>
            <div class="flex items-center gap-1">
              {#if shortcut.key === 'k' || shortcut.key === '?'}
                <kbd class="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-text-faint">
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                </kbd>
                <span class="text-text-faint">+</span>
              {/if}
              <kbd class="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-text-faint">
                {shortcut.key}
              </kbd>
            </div>
          </div>
        {/each}

        {#each getShortcuts() as entry (entry.description)}
          <div class="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.03]">
            <span class="text-[13px] text-text-secondary">{entry.description}</span>
            <kbd class="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-text-faint">
              {formatShortcut(entry)}
            </kbd>
          </div>
        {/each}
      </div>

      <div class="mt-4 border-t border-white/[0.06] pt-3 text-center">
        <span class="text-[11px] text-text-faint">Press <kbd class="rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 text-[10px]">Esc</kbd> to close</span>
      </div>
    </div>
  </div>
{/if}
