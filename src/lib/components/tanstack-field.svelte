<script lang="ts" generics="TField extends FieldApi<any, any, any, any, any>">
  import type { FieldApi, StandardSchemaV1Issue } from '@tanstack/form-core'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import type { HTMLInputAttributes } from 'svelte/elements'
  import { getFieldError } from '$lib/validation'

  let {
    field,
    label,
    type = 'text',
    placeholder,
    autocomplete,
  }: {
    field: TField
    label: string
    type?: HTMLInputAttributes['type']
    placeholder?: string
    autocomplete?: string
  } = $props()

  let errors = $derived(field.state.meta.errors as StandardSchemaV1Issue[])
  let hasError = $derived(errors.length > 0)
</script>

<div class="space-y-2">
  <Label for={String(field.name)}>{label}</Label>
  <Input
    id={String(field.name)}
    type={type as any}
    {placeholder}
    autocomplete={autocomplete as any}
    value={field.state.value}
    oninput={(e) => field.handleChange(e.currentTarget.value)}
    onblur={field.handleBlur}
    aria-invalid={hasError ? 'true' : 'false'}
    aria-describedby={hasError ? `${String(field.name)}-error` : undefined}
  />
  {#if hasError}
    <p id="{String(field.name)}-error" class="text-[12px] text-red-400">
      {getFieldError(errors)}
    </p>
  {/if}
</div>
