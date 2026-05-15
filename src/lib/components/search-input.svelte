<script lang="ts">
  let {
    value = $bindable(''),
    placeholder = 'Search...',
  }: {
    value?: string
    placeholder?: string
  } = $props()
</script>

<div class="relative">
  <svg
    class="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
  <input
    type="text"
    bind:value
    {placeholder}
    aria-label={placeholder}
    class="w-full rounded-lg border border-border bg-input ps-9 pe-4 py-2 text-[13px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
  />
</div>
