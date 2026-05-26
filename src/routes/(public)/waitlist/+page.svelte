<script lang="ts">
  import Nav from '$lib/components/nav.svelte'
  import Footer from '$lib/components/footer.svelte'
  import SeoHead from '$lib/components/seo-head.svelte'
  import { enhance } from '$app/forms'
  import { waitlistSchema } from '$lib/validators/waitlist'

  const { form } = $props()

  let clientErrors = $state<Record<string, string>>({})
  let successContainer: HTMLElement | undefined = $state()
  const serverErrors = $derived<Record<string, string>>(
    Object.fromEntries(
      (form?.errors ?? []).map((e: { field: string; message: string }) => [e.field, e.message]),
    ),
  )
  const errors = $derived<Record<string, string>>({ ...serverErrors, ...clientErrors })
  const generalError = $derived(errors[''] ?? '')
  const values = $derived<Record<string, string>>(form?.values ?? {})
  const success = $derived(form?.success ?? false)
  let submitting = $state(false)

  function handleEnhance({
    cancel,
    formElement,
  }: {
    cancel: () => void
    formElement: HTMLFormElement
  }) {
    clientErrors = {}
    const formData = new FormData(formElement)
    const data = Object.fromEntries(formData)

    const result = waitlistSchema.safeParse(data)
    if (!result.success) {
      clientErrors = Object.fromEntries(
        result.error.issues.map((i) => [i.path[0] as string, i.message]),
      )
      cancel()
      return
    }

    submitting = true
    return async ({
      update,
    }: {
      update: (opts?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void>
    }) => {
      try {
        await update()
      } finally {
        submitting = false
      }
    }
  }

  $effect(() => {
    if (success && successContainer) {
      successContainer.focus()
    }
  })
</script>

<SeoHead
  description="Join the waitlist to get early access."
  title="Join Waitlist"
/>

<Nav />

<section class="relative overflow-hidden px-6 pb-24 pt-40">
  <!-- ambient glow -->
  <div
    class="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 opacity-40"
    style="background: radial-gradient(ellipse at center, var(--glow-brand-strong) 0%, transparent 70%);"
  ></div>

  <div class="relative mx-auto max-w-lg text-center">
    <h1
      class="mb-4 text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary"
    >
      Get early access
    </h1>
    <p class="mb-10 text-lg leading-relaxed text-text-muted">
      We're building something great. Drop your email and we'll let you in first.
    </p>

    {#if success}
      <div
        bind:this={successContainer}
        tabindex="-1"
        class="rounded-xl border border-brand/30 bg-brand/5 p-6 text-center outline-none"
        role="status"
        aria-live="polite"
      >
        <h2 class="mb-2 text-lg font-semibold text-text-primary">You're on the list!</h2>
        <p class="text-text-muted">We'll notify you when it's your turn.</p>
      </div>
    {:else}
      {#if generalError}
        <div
          class="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive"
          role="alert"
        >
          {generalError}
        </div>
      {/if}
      <form method="POST" use:enhance={handleEnhance} class="space-y-4" novalidate>
        <div>
          <label for="email" class="mb-2 block text-sm font-medium text-text-secondary">Email address</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={values.email ?? ''}
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            class="w-full rounded-xl border border-border bg-input px-4 py-3 text-[16px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="you@example.com"
          />
          {#if errors.email}
            <p id="email-error" class="mt-1 text-left text-[12px] text-destructive" role="alert">
              {errors.email}
            </p>
          {/if}
        </div>

        <button
          type="submit"
          disabled={submitting}
          class="w-full rounded-xl bg-brand px-7 py-3 text-[15px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover disabled:opacity-50"
        >
          {submitting ? 'Joining...' : 'Join Waitlist'}
        </button>

        <p class="text-[13px] text-text-subtle">No spam, ever. Unsubscribe anytime.</p>
      </form>
    {/if}
  </div>
</section>

<Footer />
