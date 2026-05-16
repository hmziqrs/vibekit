<script lang="ts">
  import SeoHead from '$lib/components/seo-head.svelte'
  import { enhance } from '$app/forms'
  import { contactSchema } from '$lib/validators/contact'

  const { form } = $props()

  let clientErrors = $state<Record<string, string>>({})
  const serverErrors = $derived<Record<string, string>>(
    Object.fromEntries((form?.errors ?? []).map((e: { field: string; message: string }) => [e.field, e.message])),
  )
  const generalError = $derived(errors[''] ?? '')
  const errors = $derived<Record<string, string>>({ ...serverErrors, ...clientErrors })
  const values = $derived(form?.values ?? {})
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

<SeoHead
  description="Get in touch with the Vibekit team."
  title="Contact"
/>

<div class="mx-auto max-w-2xl px-6 py-24">
  <h1 class="mb-2 text-3xl font-bold text-text-primary">Contact us</h1>
  <p class="mb-10 text-text-muted">Send us a message and we'll get back to you soon.</p>

  {#if success}
    <div class="rounded-xl border border-brand/30 bg-brand/5 p-6 text-center">
      <h2 class="mb-2 text-lg font-semibold text-text-primary">Message sent!</h2>
      <p class="text-text-muted">Thank you for reaching out. We'll respond within 24 hours.</p>
    </div>
  {:else}
    {#if generalError}
      <div class="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
        {generalError}
      </div>
    {/if}
    <form method="POST" use:enhance={handleEnhance} class="space-y-6" novalidate>
      <div>
        <label for="name" class="mb-2 block text-sm font-medium text-text-secondary">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={values.name ?? ''}
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
          class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="Your name"
        />
        {#if errors.name}
          <p id="name-error" class="mt-1 text-[12px] text-destructive">{errors.name}</p>
        {/if}
      </div>

      <div>
        <label for="email" class="mb-2 block text-sm font-medium text-text-secondary">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={values.email ?? ''}
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
          class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="you@example.com"
        />
        {#if errors.email}
          <p id="email-error" class="mt-1 text-[12px] text-destructive">{errors.email}</p>
        {/if}
      </div>

      <div>
        <label for="subject" class="mb-2 block text-sm font-medium text-text-secondary">Subject</label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={values.subject ?? ''}
          aria-invalid={errors.subject ? 'true' : 'false'}
          aria-describedby={errors.subject ? 'subject-error' : undefined}
          class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="How can we help?"
        />
        {#if errors.subject}
          <p id="subject-error" class="mt-1 text-[12px] text-destructive">{errors.subject}</p>
        {/if}
      </div>

      <div>
        <label for="message" class="mb-2 block text-sm font-medium text-text-secondary">Message</label>
        <textarea
          id="message"
          name="message"
          rows="5"
          aria-invalid={errors.message ? 'true' : 'false'}
          aria-describedby={errors.message ? 'message-error' : undefined}
          class="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          placeholder="Tell us more..."
        >{values.message ?? ''}</textarea>
        {#if errors.message}
          <p id="message-error" class="mt-1 text-[12px] text-destructive">{errors.message}</p>
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
