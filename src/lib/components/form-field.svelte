<script lang="ts">
  const {
    label,
    id,
    type = 'text',
    value = $bindable(''),
    error = '',
    required = false,
    maxlength,
    placeholder = '',
    rows = 3,
    disabled = false,
  }: {
    label: string
    id: string
    type?: 'text' | 'email' | 'password' | 'textarea'
    value?: string
    error?: string
    required?: boolean
    maxlength?: number
    placeholder?: string
    rows?: number
    disabled?: boolean
  } = $props()
</script>

<div>
  <label for={id} class="mb-1.5 block text-[13px] font-medium text-text-secondary">
    {label}
    {#if required}
      <span class="text-destructive">*</span>
    {/if}
  </label>

  {#if type === 'textarea'}
    <textarea
      {id}
      bind:value
      {maxlength}
      {placeholder}
      {rows}
      {disabled}
      class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand {error
        ? 'border-destructive'
        : ''}"
    ></textarea>
  {:else}
    <input
      {id}
      {type}
      bind:value
      {maxlength}
      {placeholder}
      {required}
      {disabled}
      class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand {error
        ? 'border-destructive'
        : ''}"
    />
  {/if}

  {#if error}
    <p class="mt-1 text-[12px] text-destructive">{error}</p>
  {/if}
</div>
