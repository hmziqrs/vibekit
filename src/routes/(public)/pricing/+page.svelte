<script lang="ts">
  import Nav from '$lib/components/nav.svelte'
  import Footer from '$lib/components/footer.svelte'
  import { seo } from '$lib/seo'

  const meta = seo({
    title: 'Pricing',
    description:
      'Start free and upgrade when you need more. Simple, predictable pricing for SvelteKit SaaS projects on Cloudflare.',
  })

  const starterFeatures = [
    { text: 'Everything in the template', included: true },
    { text: 'Unlimited users (self-hosted)', included: true },
    { text: 'Community support', included: true },
    { text: 'Email and password auth', included: true },
    { text: 'Cloudflare D1 edge database', included: true },
    { text: 'Blog engine with Markdown', included: true },
    { text: 'Priority updates', included: false },
    { text: 'Commercial license', included: false },
    { text: 'Discord access', included: false },
    { text: 'Dedicated support', included: false },
  ]

  const proFeatures = [
    { text: 'Everything in Starter', included: true },
    { text: 'Priority updates and new features', included: true },
    { text: 'Discord access with core team', included: true },
    { text: 'Commercial license included', included: true },
    { text: 'Email and password auth', included: true },
    { text: 'Cloudflare D1 edge database', included: true },
    { text: 'Blog engine with Markdown', included: true },
    { text: 'Priority updates', included: true },
    { text: 'Commercial license', included: true },
    { text: 'Dedicated support', included: false },
  ]

  const faqs = [
    {
      question: 'Can I switch plans later?',
      answer:
        'Yes. Upgrade or downgrade at any time. When you upgrade, you get immediate access to Pro features. Downgrades take effect at the end of your billing cycle.',
    },
    {
      question: 'Is the source code included?',
      answer:
        'Absolutely. Both plans include the full source code. Starter is MIT licensed. Pro includes an additional commercial license for client work.',
    },
    {
      question: 'What happens after the free trial?',
      answer:
        'Pro includes a 14-day free trial with no credit card required. After the trial, you can continue with the Starter plan for free or upgrade to Pro.',
    },
    {
      question: 'Do you offer refunds?',
      answer:
        'Yes. If you are not satisfied within the first 30 days of a Pro subscription, contact us for a full refund — no questions asked.',
    },
  ]

  let openFaq = $state<number | null>(null)

  function toggleFaq(index: number) {
    openFaq = openFaq === index ? null : index
  }
</script>

<svelte:head>
  <title>{meta.title}</title>
  <meta name="description" content={meta.description} />
</svelte:head>

<Nav />

<!-- ===== HEADER ===== -->
<section class="relative overflow-hidden px-6 pb-16 pt-36">
  <div class="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 opacity-30" style="background: radial-gradient(ellipse at center, var(--glow-brand-strong) 0%, transparent 70%);"></div>

  <div class="relative mx-auto max-w-4xl text-center">
    <h1 class="mb-5 text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
      Simple, predictable pricing
    </h1>
    <p class="mx-auto max-w-lg text-lg leading-relaxed text-text-muted">
      Start free. Upgrade when you need more. No surprise charges, no feature gates on the basics.
    </p>
  </div>
</section>

<!-- ===== PRICING CARDS ===== -->
<section class="px-6 pb-32">
  <div class="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
    <!-- Starter -->
    <div class="rounded-2xl border border-white/[0.06] bg-surface p-8">
      <div class="mb-6">
        <h3 class="mb-2 text-[18px] font-semibold text-text-primary">Starter</h3>
        <p class="text-[14px] text-text-muted">For side projects and early validation.</p>
      </div>
      <div class="mb-8">
        <span class="text-[42px] font-semibold tracking-tight text-text-primary">$0</span>
        <span class="text-[15px] text-text-muted">/month</span>
      </div>
      <ul class="mb-8 space-y-3">
        {#each starterFeatures as feature}
          <li class="flex items-start gap-3 text-[14px] {feature.included ? 'text-text-secondary' : 'text-text-subtle'}">
            {#if feature.included}
              <svg class="mt-0.5 h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            {:else}
              <svg class="mt-0.5 h-4 w-4 shrink-0 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            {/if}
            {feature.text}
          </li>
        {/each}
      </ul>
      <a
        href="/register"
        class="block w-full rounded-xl border border-white/[0.1] bg-white/[0.03] py-2.5 text-center text-[14px] font-medium text-text-secondary transition-all hover:border-white/[0.2] hover:text-text-primary"
      >
        Get started free
      </a>
    </div>

    <!-- Pro -->
    <div class="relative rounded-2xl border border-brand/30 bg-surface p-8">
      <div class="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-brand-foreground">
        Most popular
      </div>
      <div class="mb-6">
        <h3 class="mb-2 text-[18px] font-semibold text-text-primary">Pro</h3>
        <p class="text-[14px] text-text-muted">For teams shipping to production.</p>
      </div>
      <div class="mb-8">
        <span class="text-[42px] font-semibold tracking-tight text-text-primary">$29</span>
        <span class="text-[15px] text-text-muted">/month</span>
      </div>
      <ul class="mb-8 space-y-3">
        {#each proFeatures as feature}
          <li class="flex items-start gap-3 text-[14px] {feature.included ? 'text-text-secondary' : 'text-text-subtle'}">
            {#if feature.included}
              <svg class="mt-0.5 h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            {:else}
              <svg class="mt-0.5 h-4 w-4 shrink-0 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            {/if}
            {feature.text}
          </li>
        {/each}
      </ul>
      <a
        href="/register"
        class="block w-full rounded-xl bg-brand py-2.5 text-center text-[14px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
      >
        Start free trial
      </a>
    </div>
  </div>
</section>

<!-- ===== FAQ ===== -->
<section class="border-t border-white/[0.06] px-6 pb-32 pt-24">
  <div class="mx-auto max-w-3xl">
    <h2 class="mb-12 text-center text-[clamp(1.6rem,3.5vw,2.2rem)] font-semibold tracking-[-0.02em] text-text-primary">
      Frequently asked questions
    </h2>
    <div class="space-y-3">
      {#each faqs as faq, i}
        <button
          type="button"
          onclick={() => toggleFaq(i)}
          class="flex w-full items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-surface px-6 py-5 text-left transition-all hover:border-white/[0.12]"
        >
          <span class="text-[15px] font-medium text-text-primary">{faq.question}</span>
          <svg
            class="h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 {openFaq === i ? 'rotate-180' : ''}"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {#if openFaq === i}
          <div class="px-6 pb-5 pt-2">
            <p class="text-[14px] leading-relaxed text-text-muted">{faq.answer}</p>
          </div>
        {/if}
      {/each}
    </div>
  </div>
</section>

<!-- ===== CTA ===== -->
<section class="relative overflow-hidden border-t border-white/[0.06] px-6 py-28">
  <div class="pointer-events-none absolute inset-0 opacity-25" style="background: radial-gradient(ellipse at center, var(--glow-brand-hover) 0%, transparent 60%);"></div>
  <div class="relative mx-auto max-w-3xl text-center">
    <h2 class="mb-5 text-[clamp(1.6rem,4vw,2.4rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
      Ready to start building?
    </h2>
    <p class="mx-auto mb-9 max-w-lg text-lg leading-relaxed text-text-muted">
      Get the full stack up and running in minutes. Auth, database, admin — everything wired together.
    </p>
    <a
      href="/register"
      class="inline-block rounded-xl bg-brand px-8 py-3.5 text-[15px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover"
    >
      Get started free
    </a>
    <p class="mt-5 text-[13px] text-text-subtle">No credit card required. MIT licensed.</p>
  </div>
</section>

<Footer />
