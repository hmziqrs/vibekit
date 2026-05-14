<script lang="ts">
  import { locales, localizeHref, getLocale } from '$lib/paraglide/runtime'
  import * as m from '$lib/paraglide/messages.js'
  import { page } from '$app/state'

  let open = $state(false)

  const currentLocale = $derived(getLocale())

  function toggle() {
    open = !open
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false
  }

  function getLocaleLabel(locale: string): string {
    if (locale === 'en') return m.lang_en()
    if (locale === 'ur') return m.lang_ur()
    return locale
  }
</script>

<div class="relative">
  <button
    class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text-primary"
    onclick={toggle}
    aria-label="Change language"
    aria-expanded={open}
    aria-haspopup="true"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
    <span>{getLocaleLabel(currentLocale)}</span>
  </button>

  {#if open}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 z-40"
      onclick={() => (open = false)}
      onkeydown={handleKeydown}
    ></div>
    <div class="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-white/[0.06] bg-surface py-1 shadow-xl">
      {#each locales as locale (locale)}
        <a
          href={localizeHref(page.url.pathname, { locale })}
          class="flex items-center gap-2 px-3 py-2 text-[13px] transition-colors {locale === currentLocale ? 'bg-white/[0.04] text-brand' : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary'}"
          onclick={() => (open = false)}
        >
          <span class="font-medium">{getLocaleLabel(locale)}</span>
          {#if locale === currentLocale}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ms-auto text-brand">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          {/if}
        </a>
      {/each}
    </div>
  {/if}
</div>
