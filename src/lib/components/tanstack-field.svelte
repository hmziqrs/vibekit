<script lang="ts" generics="TField extends FieldApi<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>">
  import type { FieldApi, StandardSchemaV1Issue } from '@tanstack/form-core'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import type { HTMLInputAttributes } from 'svelte/elements'
  import { getFieldError } from '$lib/validation'

  const {
    field,
    label,
    type = 'text',
    placeholder,
    autocomplete,
    rows,
    maxlength,
  }: {
    field: TField
    label: string
    type?: Exclude<HTMLInputAttributes['type'], null> | 'textarea'
    placeholder?: string
    autocomplete?: HTMLInputAttributes['autocomplete']
    rows?: number
    maxlength?: number
  } = $props()

  const errors = $derived(field.state.meta.errors as StandardSchemaV1Issue[])
  const hasError = $derived(errors.length > 0)
</script>

<div class="space-y-2">
  <Label for={String(field.name)}>{label}</Label>
  {#if type === 'textarea'}
    <textarea
      id={String(field.name)}
      {placeholder}
      {rows}
      {maxlength}
      value={field.state.value}
      oninput={(e) => field.handleChange(e.currentTarget.value)}
      onblur={field.handleBlur}
      class="flex min-h-[80px] w-full rounded-md border border-white/[0.06] bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
      aria-invalid={hasError ? 'true' : 'false'}
      aria-describedby={hasError ? `${String(field.name)}-error` : undefined}
    ></textarea>
  {:else}
    <Input
      id={String(field.name)}
      {type}
      {placeholder}
      {maxlength}
      {autocomplete}
      value={field.state.value}
      oninput={(e) => field.handleChange(e.currentTarget.value)}
      onblur={field.handleBlur}
      aria-invalid={hasError ? 'true' : 'false'}
      aria-describedby={hasError ? `${String(field.name)}-error` : undefined}
    />
  {/if}
  {#if hasError}
    <p id="{String(field.name)}-error" class="text-[12px] text-red-400">
      {getFieldError(errors)}
    </p>
  {/if}
</div>
