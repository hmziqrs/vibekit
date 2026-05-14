<script lang="ts">
  let {
    open = $bindable(false),
    title = 'Confirm',
    message = 'Are you sure?',
    confirmLabel = 'Confirm',
    variant = 'default',
    disabled = false,
    onConfirm,
    children,
  }: {
    open?: boolean
    title?: string
    message?: string
    confirmLabel?: string
    variant?: 'danger' | 'default'
    disabled?: boolean
    onConfirm: () => void
    children?: import('svelte').Snippet
  } = $props()

  function handleConfirm() {
    if (disabled) return
    onConfirm()
    open = false
  }

  function handleCancel() {
    open = false
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {open = false}
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    role="dialog"
    aria-label={title}
    onkeydown={handleKeydown}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="mx-4 w-full max-w-md rounded-xl border border-white/[0.06] bg-surface p-6"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <h3 class="text-lg font-semibold text-text-primary">{title}</h3>
      <p class="mt-2 text-[14px] text-text-muted">{message}</p>

      {#if children}
        <div class="mt-3">
          {@render children()}
        </div>
      {/if}

      <div class="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onclick={handleCancel}
          class="rounded-lg border border-white/[0.1] px-4 py-2 text-[13px] font-medium text-text-secondary hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={handleConfirm}
          disabled={disabled}
          class="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-colors disabled:opacity-50 {variant ===
          'danger'
            ? 'bg-destructive hover:bg-destructive/90'
            : 'bg-brand hover:bg-brand-hover'}"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}
