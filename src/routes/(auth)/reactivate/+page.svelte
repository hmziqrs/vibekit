<script lang="ts">
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import { createForm } from '@tanstack/svelte-form'
  import { extractFormError } from '$lib/form-utils'
  import TanstackField from '$lib/components/tanstack-field.svelte'
  import { z } from 'zod/v4'

  const reactivateSchema = z.object({
    email: z.email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
  })

  type ReactivateInput = z.infer<typeof reactivateSchema>

  let errorMessage = $state('')
  let reactivated = $state(false)

  const initialEmail = $derived(page.url.searchParams.get('email') ?? '')

  const form = createForm(() => ({
    defaultValues: {
      email: initialEmail,
      password: '',
    },
    onSubmit: async ({ value }: { value: ReactivateInput }) => {
      errorMessage = ''
      try {
        const res = await fetch('/api/account/reactivate', {
          body: JSON.stringify({ email: value.email, password: value.password }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
        if (!res.ok) {
          const data = (await res.json()) as { error?: { message?: string } }
          errorMessage = data.error?.message ?? 'Failed to reactivate account'
          return { form: errorMessage }
        }

        reactivated = true
        return null
      } catch {
        errorMessage = 'Something went wrong'
        return { form: errorMessage }
      }
    },
    validators: {
      onSubmit: reactivateSchema,
    },
  }))
</script>

<div class="w-full max-w-sm">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-text-primary">Reactivate account</Card.Title>
      <Card.Description class="text-text-muted"
        >Your account is scheduled for deletion. Sign in to restore it.</Card.Description
      >
    </Card.Header>

    <Card.Content>
      {#if reactivated}
        <div class="space-y-4">
          <p class="text-sm text-success">Your account has been reactivated!</p>
          <Button class="w-full" onclick={() => goto('/app/dashboard')}>Go to dashboard</Button>
        </div>
      {:else}
        <p class="mb-4 text-[13px] text-text-muted">
          Accounts are permanently deleted after 30 days. Sign in below to cancel deletion and
          restore your account.
        </p>

        <form
          onsubmit={(e: SubmitEvent) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          class="space-y-3"
          novalidate
        >
          <form.Field name="email">
            {#snippet children(field)}
              <TanstackField
                field={field as never}
                label="Email address"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
              />
            {/snippet}
          </form.Field>

          <form.Field name="password">
            {#snippet children(field)}
              <TanstackField
                field={field as never}
                label="Password"
                type="password"
                placeholder="Enter your password"
                autocomplete="current-password"
              />
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
                {isSubmitting ? 'Reactivating...' : 'Reactivate account'}
              </Button>
            {/snippet}
          </form.Subscribe>
        </form>
      {/if}
    </Card.Content>

    {#if !reactivated}
      <Card.Footer class="justify-center">
        <a href="/login" class="text-sm text-text-muted transition-colors hover:text-text-primary">
          Back to login
        </a>
      </Card.Footer>
    {/if}
  </Card.Root>
</div>
