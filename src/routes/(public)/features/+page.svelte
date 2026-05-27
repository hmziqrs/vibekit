<script lang="ts">
  import Nav from '$lib/components/nav.svelte'
  import Footer from '$lib/components/footer.svelte'
  import SmartLink from '$lib/components/smart-link.svelte'
  import SeoHead from '$lib/components/seo-head.svelte'

  const features = [
    {
      description:
        'Email/password login, secure sessions, password resets, and role-based access. Powered by Better Auth with your D1 database — no third-party provider needed.',
      icon: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z',
      title: 'Authentication',
    },
    {
      description:
        'Cloudflare D1 with Drizzle ORM gives you globally-distributed SQLite queries in under 50ms. Type-safe from schema to API.',
      icon: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C3.75 16.153 7.444 18 12 18s8.25-1.847 8.25-4.125v-3.75m0 0-.01-.03h.01',
      title: 'Edge Database',
    },
    {
      description:
        'User management, content publishing, and audit trails ready out of the box. Manage your SaaS without building custom tooling.',
      icon: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
      title: 'Admin Panel',
    },
    {
      description:
        'Write in Markdown, publish instantly with edge caching, and handle SEO metadata automatically. Draft, edit, and unpublish without redeploying.',
      icon: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z',
      title: 'Blog Engine',
    },
    {
      description:
        'Drizzle ORM, TypeScript strict mode, and Svelte 5 runes work together end-to-end. Catch errors at build time, not in production.',
      icon: 'M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5',
      title: 'Type Safety',
    },
    {
      description:
        'Paraglide JS compiles translations to tree-shakeable bundles. Ship in multiple languages without shipping the i18n library.',
      icon: 'M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802',
      title: 'Internationalization',
    },
    {
      description:
        'One command deploys to Cloudflare Workers. Automatic SSL, global distribution, and sub-50ms cold starts worldwide.',
      icon: 'm3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z',
      title: 'Edge Deployment',
    },
    {
      description:
        'Bun for blazing-fast installs, Vitest for testing, oxlint/oxfmt for linting and formatting. A dev workflow that stays out of your way.',
      icon: 'M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z',
      title: 'Developer Experience',
    },
  ]
</script>

<SeoHead
  description="Everything you need to ship a SvelteKit SaaS on Cloudflare — auth, edge database, admin panel, blog engine, type safety, i18n, and more."
  title="Features"
/>

<Nav />

<!-- ===== HEADER ===== -->
<section class="animate-fade-in-up relative overflow-hidden px-6 pb-16 pt-36">
  <div class="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 opacity-30" style="background: radial-gradient(ellipse at center, var(--glow-brand-strong) 0%, transparent 70%);"></div>

  <div class="relative mx-auto max-w-4xl text-center">
    <h1 class="mb-5 text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
      Built for <span class="text-brand">serious</span> SvelteKit products
    </h1>
    <p class="mx-auto max-w-2xl text-lg leading-relaxed text-text-muted">
      Every feature is production-ready and battle-tested. No placeholders, no TODOs — just the tools you need to ship fast.
    </p>
  </div>
</section>

<!-- ===== FEATURES GRID ===== -->
<section class="px-6 pb-32">
  <div class="mx-auto max-w-6xl">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each features as feature, i}
        <div class="animate-fade-in-up delay-{i + 1}00 group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface p-7 transition-all duration-300 hover:border-white/[0.12]">
          <div class="absolute right-0 top-0 h-32 w-32 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style="background: radial-gradient(circle at top right, var(--glow-brand-hover), transparent 70%);"></div>
          <div class="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
            <svg class="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d={feature.icon} />
            </svg>
          </div>
          <h3 class="mb-2 text-[16px] font-semibold text-text-primary">{feature.title}</h3>
          <p class="text-[14px] leading-relaxed text-text-muted">{feature.description}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- ===== CTA ===== -->
<section class="animate-fade-in relative overflow-hidden border-t border-white/[0.06] px-6 py-28">
  <div class="pointer-events-none absolute inset-0 opacity-25" style="background: radial-gradient(ellipse at center, var(--glow-brand-hover) 0%, transparent 60%);"></div>
  <div class="relative mx-auto max-w-3xl text-center">
    <h2 class="mb-5 text-[clamp(1.6rem,4vw,2.4rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
      Start building with all of this today
    </h2>
    <p class="mx-auto mb-9 max-w-lg text-lg leading-relaxed text-text-muted">
      No assembly required. Clone, configure, and start shipping features your users actually care about.
    </p>
    <SmartLink href="/register" fallback="/app" class="inline-block rounded-xl bg-brand px-8 py-3.5 text-[15px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover">
      Get started free
    </SmartLink>
    <p class="mt-5 text-[13px] text-text-subtle">No credit card required. MIT licensed.</p>
  </div>
</section>

<Footer />
