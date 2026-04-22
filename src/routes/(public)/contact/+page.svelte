<script lang="ts">
  import { seo } from '$lib/seo'
  import { enhance } from '$app/forms'
  import { contactSchema } from '$lib/validators/contact'

  const meta = seo({
    title: 'Contact',
    description: 'Get in touch with the Vibekit team.',
  })

  let { form } = $props()

  let clientErrors = $state<Record<string, string>>({})
  let serverErrors = $derived<Record<string, string>>(
    Object.fromEntries((form?.errors ?? []).map((e: { field: string; message: string }) => [e.field, e.message])),
  )
  let errors = $derived<Record<string, string>>({ ...serverErrors, ...clientErrors })
  let values = $derived(form?.values ?? {})
  let success = $derived(form?.success ?? false)
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

    const result = contactSchema.safeParse(data)
    if (!result.success) {
      clientErrors = Object.fromEntries(
        result.error.issues.map((i) => [i.path[0] as string, i.message]),
      )
      cancel()
      return
    }

    submitting = true
    return async ({ update }: { update: (opts?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void> }) => {
      await update()
      submitting = false
    }
  }
</script>

<svelte:head>
  <title>{meta.title}</title>
  <meta name="description" content={meta.description} />
</svelte:head>

<div class="mx-auto max-w-2xl px-6 py-24">
  <h1 class="mb-2 text-3xl font-bold text-text-primary">Contact us</h1>
  <p class="mb-10 text-text-muted">Send us a message and we'll get back to you soon.</p>

  {#if success}
    <div class="rounded-xl border border-brand/30 bg-brand/5 p-6 text-center">
      <h2 class="mb-2 text-lg font-semibold text-text-primary">Message sent!</h2>
      <p class="text-text-muted">Thank you for reaching out. We'll respond within 24 hours.</p>
    </div>
  {:else}
    <form method="POST" use:enhance={handleEnhance} class="space-y-6">
      <div>
        <label for="name" class="mb-2 block text-sm font-medium text-text-secondary">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={values.name ?? ''}
          class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="Your name"
        />
        {#if errors.name}
          <p class="mt-1 text-[12px] text-destructive">{errors.name}</p>
        {/if}
      </div>

      <div>
        <label for="email" class="mb-2 block text-sm font-medium text-text-secondary">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={values.email ?? ''}
          class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="you@example.com"
        />
        {#if errors.email}
          <p class="mt-1 text-[12px] text-destructive">{errors.email}</p>
        {/if}
      </div>

      <div>
        <label for="subject" class="mb-2 block text-sm font-medium text-text-secondary">Subject</label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={values.subject ?? ''}
          class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="How can we help?"
        />
        {#if errors.subject}
          <p class="mt-1 text-[12px] text-destructive">{errors.subject}</p>
        {/if}
      </div>

      <div>
        <label for="message" class="mb-2 block text-sm font-medium text-text-secondary">Message</label>
        <textarea
          id="message"
          name="message"
          rows="5"
          class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="Tell us more..."
        >{values.message ?? ''}</textarea>
        {#if errors.message}
          <p class="mt-1 text-[12px] text-destructive">{errors.message}</p>
        {/if}
      </div>

      <button
        type="submit"
        disabled={submitting}
        class="rounded-xl bg-brand px-7 py-3 text-[14px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover disabled:opacity-50"
      >
        {submitting ? 'Sending...' : 'Send message'}
      </button>
    </form>
  {/if}
</div>
