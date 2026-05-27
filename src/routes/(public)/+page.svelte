<script lang="ts">
	import Nav from '$lib/components/nav.svelte'
	import Footer from '$lib/components/footer.svelte'
	import SeoHead from '$lib/components/seo-head.svelte'
	import SmartLink from '$lib/components/smart-link.svelte'
	import { Rocket } from '@lucide/svelte'
</script>

<SeoHead
	description="A complete SvelteKit stack on Cloudflare. Auth, edge database, admin panel, and blog engine — pre-wired so you start building features on day one."
	title="Ship SvelteKit products on Cloudflare"
/>

<Nav />

<!-- ===== HERO ===== -->
<section class="relative overflow-hidden px-6 pb-24 pt-40">
	<!-- ambient glow -->
	<div class="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 opacity-40" style="background: radial-gradient(ellipse at center, var(--glow-brand-strong) 0%, transparent 70%);"></div>
	<div class="pointer-events-none absolute right-0 top-20 h-[400px] w-[400px] opacity-20" style="background: radial-gradient(ellipse at center, var(--glow-white) 0%, transparent 70%);"></div>

	<div class="relative mx-auto max-w-6xl">
		<div class="mx-auto max-w-3xl text-center">
			<div class="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5">
				<span class="relative flex h-1.5 w-1.5">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75"></span>
					<span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand"></span>
				</span>
				<span class="text-[13px] font-medium text-text-secondary">Open source · SvelteKit 5 · Cloudflare Workers</span>
			</div>

			<h1 class="animate-fade-in-up mb-6 text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-text-primary">
				The last boilerplate<br />
				you'll <span class="text-brand">ever need</span>
			</h1>

			<p class="animate-fade-in-up delay-100 mx-auto mb-10 max-w-xl text-lg leading-relaxed text-text-muted">
				A complete SvelteKit stack on Cloudflare. Auth, edge database, admin panel, and blog engine — all wired together so you can start shipping features on day one.
			</p>

			<div class="animate-fade-in-up delay-200 flex flex-col items-center justify-center gap-3 sm:flex-row">
				<SmartLink
            href="/register"
            fallback="/app"
            class="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <Rocket class="w-4 h-4" />
            Start Building Free
          </SmartLink>
				<SmartLink href="/register" fallback="/app" class="text-accent font-medium hover:opacity-80 transition-opacity text-base">Get started for free &rarr;</SmartLink>
				<a href="#features" class="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-7 py-3 text-[14px] font-medium text-text-secondary transition-all hover:border-white/[0.2] hover:text-text-primary sm:w-auto">
					See what's inside
				</a>
			</div>
		</div>

		<!-- Terminal mockup -->
		<div class="animate-fade-in-up delay-300 mx-auto mt-20 max-w-4xl">
			<div class="terminal-glow relative rounded-2xl border border-white/[0.08] bg-surface p-1 shadow-2xl">
				<div class="flex items-center gap-2 rounded-xl bg-surface px-5 py-4">
					<div class="flex gap-1.5">
						<div class="h-3 w-3 rounded-full bg-terminal-red"></div>
						<div class="h-3 w-3 rounded-full bg-terminal-yellow"></div>
						<div class="h-3 w-3 rounded-full bg-terminal-green"></div>
					</div>
					<div class="ms-4 flex-1 rounded-md bg-surface-elevated px-3 py-1 text-center text-[11px] text-text-subtle">vibekit-project</div>
				</div>
				<div class="overflow-x-auto px-6 pb-6 pt-2">
					<pre class="font-mono text-[13px] leading-7 text-text-muted"><code><span class="text-text-subtle"># Create your project</span>
		<span class="text-brand">$</span> bun create vibekit@latest my-app
		<span class="text-text-subtle">✓</span> Downloaded template
		<span class="text-text-subtle">✓</span> Installed dependencies
		<span class="text-text-subtle">✓</span> Configured D1 database

		<span class="text-text-subtle"># Start developing</span>
		<span class="text-brand">$</span> cd my-app && bun dev

		<span class="text-text-subtle">  VITE v6.0  ready in 420ms</span>
		<span class="text-brand">  ➜</span>  Local:   http://localhost:5173/
		<span class="text-brand">  ➜</span>  Network: http://192.168.1.42:5173/</code></pre>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ===== LOGO STRIP ===== -->
<section class="animate-fade-in border-y border-white/[0.06] bg-surface-deep py-10">
	<div class="mx-auto max-w-6xl px-6">
		<p class="mb-8 text-center text-[12px] font-medium uppercase tracking-[0.15em] text-text-subtle">Built on infrastructure you trust</p>
		<div class="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
			<span class="text-[15px] font-semibold tracking-tight text-text-faint">SvelteKit</span>
			<span class="text-[15px] font-semibold tracking-tight text-text-faint">Cloudflare</span>
			<span class="text-[15px] font-semibold tracking-tight text-text-faint">Drizzle ORM</span>
			<span class="text-[15px] font-semibold tracking-tight text-text-faint">Tailwind CSS</span>
			<span class="text-[15px] font-semibold tracking-tight text-text-faint">Better Auth</span>
			<span class="text-[15px] font-semibold tracking-tight text-text-faint">Bun</span>
		</div>
	</div>
</section>

<!-- ===== BENTO FEATURES ===== -->
<section id="features" class="relative px-6 py-32">
	<div class="pointer-events-none absolute left-0 top-40 h-[600px] w-[600px] opacity-20" style="background: radial-gradient(ellipse at center, var(--glow-brand) 0%, transparent 70%);"></div>

	<div class="relative mx-auto max-w-6xl">
		<div class="mb-16 max-w-2xl">
			<h2 class="mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
				Stop configuring.<br />Start building.
			</h2>
			<p class="text-lg leading-relaxed text-text-muted">
				Every SaaS needs the same foundation. We built it once — properly — so you never have to wire auth to a database again.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<!-- Large card: Auth -->
			<div class="animate-fade-in-up delay-100 group relative col-span-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-surface p-8 transition-all duration-300 hover:border-white/[0.12] md:col-span-2">
				<div class="absolute right-0 top-0 h-40 w-40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style="background: radial-gradient(circle at top right, var(--glow-brand-hover), transparent 70%);"></div>
				<div class="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
					<svg class="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>
				</div>
				<h3 class="mb-2 text-[18px] font-semibold text-text-primary">Better Auth, built in</h3>
				<p class="max-w-md text-[15px] leading-relaxed text-text-muted">
					Email and password login with secure sessions, password resets, and role-based access control. No third-party auth provider required. Your user data stays in your D1 database.
				</p>
			</div>

			<!-- Small card: Edge DB -->
			<div class="animate-fade-in-up delay-200 group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface p-8 transition-all duration-300 hover:border-white/[0.12]">
				<div class="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
					<svg class="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C3.75 16.153 7.444 18 12 18s8.25-1.847 8.25-4.125v-3.75m0 0-.01-.03h.01"/></svg>
				</div>
				<h3 class="mb-2 text-[18px] font-semibold text-text-primary">D1 at the edge</h3>
				<p class="text-[15px] leading-relaxed text-text-muted">
					SQLite queries that run globally in under 50ms. Drizzle ORM keeps it type-safe from schema to API.
				</p>
			</div>

			<!-- Small card: Admin -->
			<div class="animate-fade-in-up delay-300 group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface p-8 transition-all duration-300 hover:border-white/[0.12]">
				<div class="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
					<svg class="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/></svg>
				</div>
				<h3 class="mb-2 text-[18px] font-semibold text-text-primary">Admin dashboard</h3>
				<p class="text-[15px] leading-relaxed text-text-muted">
					User management, content publishing, and audit trails. Ready for your team from day one.
				</p>
			</div>

			<!-- Large card: Blog -->
			<div class="animate-fade-in-up delay-400 group relative col-span-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-surface p-8 transition-all duration-300 hover:border-white/[0.12] md:col-span-2">
				<div class="absolute right-0 top-0 h-40 w-40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style="background: radial-gradient(circle at top right, var(--glow-brand-hover), transparent 70%);"></div>
				<div class="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
					<svg class="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"/></svg>
				</div>
				<h3 class="mb-2 text-[18px] font-semibold text-text-primary">Blog engine that scales</h3>
				<p class="max-w-md text-[15px] leading-relaxed text-text-muted">
					Write in Markdown. Publish instantly with ISR-style cache invalidation. Draft, edit, and unpublish without redeploying. SEO metadata and structured data handled automatically.
				</p>
			</div>

			<!-- Small card: Type-safe -->
			<div class="animate-fade-in-up delay-500 group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface p-8 transition-all duration-300 hover:border-white/[0.12]">
				<div class="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
					<svg class="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"/></svg>
				</div>
				<h3 class="mb-2 text-[18px] font-semibold text-text-primary">Type-safe everything</h3>
				<p class="text-[15px] leading-relaxed text-text-muted">
					Drizzle + TypeScript + SvelteKit 5 runes. Refactor without breaking things.
				</p>
			</div>

			<!-- Small card: Deploy -->
			<div class="animate-fade-in-up delay-600 group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface p-8 transition-all duration-300 hover:border-white/[0.12]">
				<div class="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
					<svg class="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"/></svg>
				</div>
				<h3 class="mb-2 text-[18px] font-semibold text-text-primary">Deploy in seconds</h3>
				<p class="text-[15px] leading-relaxed text-text-muted">
					One command to Cloudflare Workers. Edge-cached, globally distributed.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- ===== QUICKSTART ===== -->
<section class="animate-fade-in relative border-y border-white/[0.06] bg-surface-deep px-6 py-32">
	<div class="mx-auto max-w-6xl">
		<div class="grid items-center gap-16 lg:grid-cols-2">
			<div>
				<h2 class="mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
					From zero to production in under five minutes.
				</h2>
				<p class="mb-10 text-lg leading-relaxed text-text-muted">
					No config files to wrestle with. No auth providers to sign up for. Just run the command and you have a working app with database, auth, and admin panel.
				</p>

				<div class="space-y-6">
					<div class="flex gap-4">
						<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] text-[13px] font-semibold text-brand">1</div>
						<div>
							<h4 class="mb-1 text-[15px] font-semibold text-text-primary">Create your project</h4>
							<p class="text-[14px] leading-relaxed text-text-muted">Run the CLI. Choose your app name. Everything else is handled.</p>
						</div>
					</div>
					<div class="flex gap-4">
						<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] text-[13px] font-semibold text-brand">2</div>
						<div>
							<h4 class="mb-1 text-[15px] font-semibold text-text-primary">Set up your database</h4>
							<p class="text-[14px] leading-relaxed text-text-muted">Local D1 spins up automatically. Migrations run on first start.</p>
						</div>
					</div>
					<div class="flex gap-4">
						<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] text-[13px] font-semibold text-brand">3</div>
						<div>
							<h4 class="mb-1 text-[15px] font-semibold text-text-primary">Start building features</h4>
							<p class="text-[14px] leading-relaxed text-text-muted">Auth, database, and admin are ready. Write your first Svelte 5 component.</p>
						</div>
					</div>
				</div>
			</div>

			<div class="relative">
				<div class="absolute -inset-4 rounded-3xl opacity-30 blur-2xl" style="background: radial-gradient(ellipse at center, var(--glow-brand-highlight), transparent 70%);"></div>
				<div class="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-surface">
					<div class="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
						<div class="flex gap-1.5">
							<div class="h-2.5 w-2.5 rounded-full bg-terminal-red"></div>
							<div class="h-2.5 w-2.5 rounded-full bg-terminal-yellow"></div>
							<div class="h-2.5 w-2.5 rounded-full bg-terminal-green"></div>
						</div>
						<span class="ms-3 text-[11px] text-text-faint">src/routes/app/+page.svelte</span>
					</div>
					<div class="overflow-x-auto p-6">
						<pre class="font-mono text-[12px] leading-6 text-text-muted"><code><span class="text-text-subtle">&lt;script lang="ts"&gt;</span>
		  <span class="text-text-secondary">let</span> <span class="text-text-primary">count</span> <span class="text-text-secondary">=</span> <span class="text-brand">$state</span><span class="text-text-secondary">(</span><span class="text-brand">0</span><span class="text-text-secondary">)</span>

		  <span class="text-text-secondary">const</span> <span class="text-text-primary">double</span> <span class="text-text-secondary">=</span> <span class="text-brand">$derived</span><span class="text-text-secondary">(</span><span class="text-text-primary">count</span> <span class="text-text-secondary">*</span> <span class="text-brand">2</span><span class="text-text-secondary">)</span>
		<span class="text-text-subtle">&lt;/script&gt;</span>

		<span class="text-text-subtle">&lt;button</span> <span class="text-brand">onclick</span><span class="text-text-secondary">=</span><span class="text-text-secondary">{'{'}</span><span class="text-text-secondary">()</span> <span class="text-text-secondary">=&gt;</span> <span class="text-text-primary">count</span><span class="text-text-secondary">++</span><span class="text-text-secondary">{'}'}</span><span class="text-text-subtle">&gt;</span>
		  <span class="text-text-primary">Clicked </span><span class="text-text-secondary">{'{'}</span><span class="text-text-primary">count</span><span class="text-text-secondary">{'}'}</span><span class="text-text-primary"> times</span>
		<span class="text-text-subtle">&lt;/button&gt;</span>

		<span class="text-text-subtle">&lt;p&gt;</span><span class="text-text-primary">Double: </span><span class="text-text-secondary">{'{'}</span><span class="text-text-primary">double</span><span class="text-text-secondary">{'}'}</span><span class="text-text-primary">&lt;/p&gt;</span></code></pre>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ===== PRICING ===== -->
<section id="pricing" class="relative px-6 py-32">
	<div class="pointer-events-none absolute right-0 top-20 h-[500px] w-[500px] opacity-20" style="background: radial-gradient(ellipse at center, var(--glow-brand) 0%, transparent 70%);"></div>

	<div class="relative mx-auto max-w-4xl">
		<div class="mb-16 text-center">
			<h2 class="mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">Simple, predictable pricing</h2>
			<p class="mx-auto max-w-lg text-lg leading-relaxed text-text-muted">
				Start free. Upgrade when you need more. No surprise charges, no feature gates on the basics.
			</p>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			<!-- Starter -->
			<div class="animate-fade-in-up delay-100 rounded-2xl border border-white/[0.06] bg-surface p-8">
				<div class="mb-6">
					<h3 class="mb-2 text-[18px] font-semibold text-text-primary">Starter</h3>
					<p class="text-[14px] text-text-muted">For side projects and early validation.</p>
				</div>
				<div class="mb-8">
					<span class="text-[42px] font-semibold tracking-tight text-text-primary">$0</span>
					<span class="text-[15px] text-text-muted">/month</span>
				</div>
				<ul class="mb-8 space-y-3">
					<li class="flex items-start gap-3 text-[14px] text-text-secondary">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Everything in the template
					</li>
					<li class="flex items-start gap-3 text-[14px] text-text-secondary">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Unlimited users (self-hosted)
					</li>
					<li class="flex items-start gap-3 text-[14px] text-text-secondary">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Community support
					</li>
					<li class="flex items-start gap-3 text-[14px] text-text-subtle">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
						Priority updates
					</li>
				</ul>
				<a href="/register" class="block w-full rounded-xl border border-white/[0.1] bg-white/[0.03] py-2.5 text-center text-[14px] font-medium text-text-secondary transition-all hover:border-white/[0.2] hover:text-text-primary">
					Get started free
				</a>
			</div>

			<!-- Pro -->
			<div class="animate-fade-in-up delay-300 relative rounded-2xl border border-brand/30 bg-surface p-8">
				<div class="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-brand-foreground">Most popular</div>
				<div class="mb-6">
					<h3 class="mb-2 text-[18px] font-semibold text-text-primary">Pro</h3>
					<p class="text-[14px] text-text-muted">For teams shipping to production.</p>
				</div>
				<div class="mb-8">
					<span class="text-[42px] font-semibold tracking-tight text-text-primary">$29</span>
					<span class="text-[15px] text-text-muted">/month</span>
				</div>
				<ul class="mb-8 space-y-3">
					<li class="flex items-start gap-3 text-[14px] text-text-secondary">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Everything in Starter
					</li>
					<li class="flex items-start gap-3 text-[14px] text-text-secondary">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Priority updates and new features
					</li>
					<li class="flex items-start gap-3 text-[14px] text-text-secondary">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Discord access with core team
					</li>
					<li class="flex items-start gap-3 text-[14px] text-text-secondary">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Commercial license included
					</li>
				</ul>
				<a href="/register" class="block w-full rounded-xl bg-brand py-2.5 text-center text-[14px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover">
					Start free trial
				</a>
			</div>
		</div>
	</div>
</section>

<!-- ===== CTA ===== -->
<section class="animate-fade-in relative overflow-hidden px-6 py-32">
	<div class="pointer-events-none absolute inset-0 opacity-30" style="background: radial-gradient(ellipse at center, var(--glow-brand-hover) 0%, transparent 60%);"></div>
	<div class="relative mx-auto max-w-3xl text-center">
		<h2 class="mb-6 text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
			Ready to stop wiring<br />boilerplate?
		</h2>
		<p class="mx-auto mb-10 max-w-lg text-lg leading-relaxed text-text-muted">
			Join developers who ship faster with a foundation that's already built, tested, and deployed to the edge.
		</p>
		<div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
			<a href="/register" class="w-full rounded-xl bg-brand px-8 py-3.5 text-[15px] font-semibold text-brand-foreground transition-all hover:bg-brand-hover sm:w-auto">
				Get started free
			</a>
			<a href="https://github.com" target="_blank" rel="noopener noreferrer" class="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-8 py-3.5 text-[15px] font-medium text-text-secondary transition-all hover:border-white/[0.2] hover:text-text-primary sm:w-auto">
				View on GitHub
			</a>
		</div>
		<p class="mt-6 text-[13px] text-text-subtle">No credit card required. MIT licensed.</p>
	</div>
</section>

<Footer />

<style>
	.terminal-glow {
		box-shadow:
			0 0 0 1px var(--shadow-brand),
			0 20px 60px -20px rgba(0, 0, 0, 0.8),
			0 0 80px -20px var(--shadow-brand-outer);
	}
</style>
