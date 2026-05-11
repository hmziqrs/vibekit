<script lang="ts">
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import TanstackField from '$lib/components/tanstack-field.svelte'
  import { z } from 'zod/v4'

  const appealSchema = z.object({
    email: z.email('Please enter a valid email address'),
    message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
    name: z.string().min(1, 'Name is required').max(100),
  })

  type AppealInput = z.infer<typeof appealSchema>

  let submitted = $state(false)

  const initialEmail = $derived(page.url.searchParams.get('email') ?? '')

  const form = createForm(() => ({
    defaultValues: {
      email: initialEmail,
      message: '',
      name: '',
    },
    onSubmit: async ({ value }: { value: AppealInput }) => {
      const res = await fetch('/api/appeal', {
        body: JSON.stringify(value),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: { message?: string } }
        return { form: data.error?.message ?? 'Failed to submit appeal' }
      }
      submitted = true
      return null
    },
    validators: {
      onSubmit: appealSchema,
    },
  }))
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Submit Appeal</Card.Title>
      <Card.Description class="text-text-muted">
        If you believe your account was suspended in error, let us know.
      </Card.Description>
    </Card.Header>

    <Card.Content>
      {#if submitted}
        <div class="space-y-4">
          <p class="text-sm text-emerald-400">Your appeal has been submitted. We will review it and get back to you.</p>
          <Button class="w-full" onclick={() => goto('/login')}>Back to login</Button>
        </div>
      {:else}
        <form
          onsubmit={(e: SubmitEvent) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          class="space-y-3"
          novalidate
        >
          <form.Field name="name">
            {#snippet children(field)}
              <TanstackField {field} label="Name" placeholder="Your name" />
            {/snippet}
          </form.Field>

          <form.Field name="email">
            {#snippet children(field)}
              <TanstackField
                {field}
                label="Email address"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
              />
            {/snippet}
          </form.Field>

          <form.Field name="message">
            {#snippet children(field)}
              <div>
                <label for={field.name} class="mb-1.5 block text-[13px] font-medium text-text-secondary">
                  Message
                </label>
                <textarea
                  id={field.name}
                  name={field.name}
                  maxlength={2000}
                  rows={4}
                  placeholder="Explain why you believe the suspension was in error"
                  value={field.state.value ?? ''}
                  onblur={() => field.handleBlur()}
                  oninput={(e) => field.handleChange((e.target as HTMLTextAreaElement).value)}
                  class="w-full rounded-lg border border-white/6 bg-surface-elevated px-3 py-2 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                ></textarea>
                {#if field.state.meta.errors.length > 0}
                  <p class="mt-1 text-[12px] text-destructive">{field.state.meta.errors[0]}</p>
                {/if}
              </div>
            {/snippet}
          </form.Field>

          <form.Subscribe selector={(state) => extractFormError(state.errorMap?.onSubmit)}>
            {#snippet children(formError)}
              {#if formError}
                <p class="text-[13px] text-destructive">{formError}</p>
              {/if}
            {/snippet}
          </form.Subscribe>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {#snippet children(isSubmitting)}
              <Button type="submit" class="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
              </Button>
            {/snippet}
          </form.Subscribe>
        </form>
      {/if}
    </Card.Content>

    {#if !submitted}
      <Card.Footer class="justify-center">
        <a href="/login" class="text-sm text-text-muted transition-colors hover:text-text-primary">
          Back to login
        </a>
      </Card.Footer>
    {/if}
  </Card.Root>
</div>
