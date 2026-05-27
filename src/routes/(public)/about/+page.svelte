<script lang="ts">
  import Nav from '$lib/components/nav.svelte'
  import Footer from '$lib/components/footer.svelte'
  import SmartLink from '$lib/components/smart-link.svelte'
  import SeoHead from '$lib/components/seo-head.svelte'

  const stack = [
    { desc: 'Full-stack framework with runes-mode Svelte 5', name: 'SvelteKit' },
    { desc: 'Edge runtime with global distribution', name: 'Cloudflare Workers' },
    { desc: 'Type-safe SQLite ORM at the edge', name: 'D1 / Drizzle' },
    { desc: 'Self-hosted auth with sessions and RBAC', name: 'Better Auth' },
    { desc: 'Utility-first styling with custom design tokens', name: 'Tailwind CSS' },
    { desc: 'Query, Table, and Router for server state', name: 'TanStack' },
    { desc: 'Compile-time i18n with zero runtime overhead', name: 'Paraglide JS' },
  ]
</script>

<SeoHead
  description="Learn about Vibekit — an open-source SvelteKit SaaS boilerplate built for Cloudflare Workers."
  title="About"
/>

<Nav />

<!-- ===== MISSION ===== -->
<section class="animate-fade-in-up relative overflow-hidden px-6 py-24">
  <div class="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 opacity-30"
    style="background: radial-gradient(ellipse at center, var(--glow-brand) 0%, transparent 70%);"></div>

  <div class="relative mx-auto max-w-4xl text-center">
    <h1 class="mb-6 text-[clamp(2rem,5vw,3rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
      Built for developers who<br />want to <span class="text-brand">ship</span>.
    </h1>
    <p class="mx-auto max-w-2xl text-lg leading-relaxed text-text-muted">
      Vibekit exists because every SaaS needs the same foundation — auth, database, admin panel, i18n.
      Instead of rebuilding that foundation each time, we built it once, properly, and open-sourced it.
    </p>
  </div>
</section>

<!-- ===== TECH STACK ===== -->
<section class="px-6 py-24">
  <div class="mx-auto max-w-6xl">
    <h2 class="mb-12 text-center text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.02em] text-text-primary">
      The stack
    </h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each stack as item, i}
        <div class="animate-fade-in-up delay-{i + 1}00 group rounded-2xl border border-white/[0.06] bg-surface p-6 transition-all duration-300 hover:border-white/[0.12]">
          <h3 class="mb-1 text-[16px] font-semibold text-text-primary">{item.name}</h3>
          <p class="text-[14px] leading-relaxed text-text-muted">{item.desc}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ===== OPEN SOURCE ===== -->
<section class="animate-fade-in px-6 py-24">
  <div class="mx-auto max-w-4xl text-center">
    <h2 class="mb-4 text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.02em] text-text-primary">
      Open source, always
    </h2>
    <p class="mx-auto max-w-2xl text-lg leading-relaxed text-text-muted">
      Vibekit is MIT-licensed and always will be. We believe the best developer tools are the ones
      the community can inspect, fork, and improve. Bug reports, PRs, and discussions are welcome.
    </p>
  </div>
</section>

<!-- ===== CTA ===== -->
<section class="animate-fade-in relative overflow-hidden px-6 py-24">
  <div class="pointer-events-none absolute inset-0 opacity-30"
    style="background: radial-gradient(ellipse at center, var(--glow-brand-hover) 0%, transparent 60%);"></div>
  <div class="relative mx-auto max-w-3xl text-center">
    <h2 class="mb-4 text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.02em] text-text-primary">
      Start building today
    </h2>
    <p class="mx-auto mb-8 max-w-lg text-[15px] leading-relaxed text-text-muted">
      Clone the repo, run one command, and have a full SaaS scaffold running locally in seconds.
    </p>
    <SmartLink href="/register" fallback="/app" class="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-medium rounded-lg hover:opacity-90 transition-opacity">
      Get started free
    </SmartLink>
  </div>
</section>

<Footer />
