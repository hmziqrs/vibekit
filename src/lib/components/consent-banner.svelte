<script lang="ts">
  import { initAnalyticsIfConsented } from '$lib/analytics.svelte'

  let visible = $state(typeof localStorage !== 'undefined' && !localStorage.getItem('consent'))

  function accept() {
    localStorage.setItem('consent', 'accepted')
    visible = false
    initAnalyticsIfConsented(
      typeof import.meta !== 'undefined'
        ? (import.meta.env as Record<string, string>)?.PUBLIC_FIREBASE_CONFIG
        : undefined,
    )
  }

  function decline() {
    localStorage.setItem('consent', 'declined')
    visible = false
  }
</script>

{#if visible}
  <div
    role="dialog"
    aria-label="Cookie consent"
    class="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-surface/95 backdrop-blur-lg px-6 py-4"
  >
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
      <p class="text-[13px] text-text-muted">
        We use cookies and analytics to improve your experience.
      </p>
      <div class="flex shrink-0 gap-2">
        <button
          type="button"
          onclick={decline}
          class="rounded-lg border border-white/[0.1] px-4 py-1.5 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
        >
          Decline
        </button>
        <button
          type="button"
          onclick={accept}
          class="rounded-lg bg-brand px-4 py-1.5 text-[13px] font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          Accept
        </button>
      </div>
    </div>
  </div>
{/if}
