<script lang="ts">
</script>

<svelte:head>
	<title>Vibekit — Ship SvelteKit products on Cloudflare</title>
	<meta name="description" content="A complete SvelteKit stack on Cloudflare. Auth, edge database, admin panel, and blog engine — pre-wired so you start building features on day one." />
</svelte:head>

<!-- ===== NAVIGATION ===== -->
<header class="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
		<a href="/" class="flex items-center gap-2.5">
			<div class="flex h-7 w-7 items-center justify-center rounded-md bg-[#e8b86d] text-[#050505]">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
			</div>
			<span class="text-[15px] font-semibold tracking-tight text-[#f5f5f5]">Vibekit</span>
		</a>

		<nav class="hidden items-center gap-8 md:flex">
			<a href="#features" class="text-[13px] font-medium text-[#737373] transition-colors hover:text-[#f5f5f5]">Features</a>
			<a href="#pricing" class="text-[13px] font-medium text-[#737373] transition-colors hover:text-[#f5f5f5]">Pricing</a>
			<a href="/blog" class="text-[13px] font-medium text-[#737373] transition-colors hover:text-[#f5f5f5]">Blog</a>
			<a href="/docs" class="text-[13px] font-medium text-[#737373] transition-colors hover:text-[#f5f5f5]">Docs</a>
		</nav>

		<div class="flex items-center gap-3">
			<a href="/login" class="hidden text-[13px] font-medium text-[#a3a3a3] transition-colors hover:text-[#f5f5f5] sm:block">Log in</a>
			<a href="/register" class="rounded-lg bg-[#f5f5f5] px-4 py-2 text-[13px] font-semibold text-[#050505] transition-all hover:bg-white">Get started</a>
		</div>
	</div>
</header>

<!-- ===== HERO ===== -->
<section class="relative overflow-hidden px-6 pb-24 pt-40">
	<!-- ambient glow -->
	<div class="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 opacity-40" style="background: radial-gradient(ellipse at center, rgba(232,184,109,0.12) 0%, transparent 70%);"></div>
	<div class="pointer-events-none absolute right-0 top-20 h-[400px] w-[400px] opacity-20" style="background: radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 70%);"></div>

	<div class="relative mx-auto max-w-6xl">
		<div class="mx-auto max-w-3xl text-center">
			<div class="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5">
				<span class="relative flex h-1.5 w-1.5">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e8b86d] opacity-75"></span>
					<span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#e8b86d]"></span>
				</span>
				<span class="text-[13px] font-medium text-[#a3a3a3]">Open source · SvelteKit 5 · Cloudflare Workers</span>
			</div>

			<h1 class="hero-fade mb-6 text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[#f5f5f5]">
				The last boilerplate<br />
				you'll <span class="text-[#e8b86d]">ever need</span>
			</h1>

			<p class="hero-fade hero-fade-1 mx-auto mb-10 max-w-xl text-lg leading-relaxed text-[#737373]">
				A complete SvelteKit stack on Cloudflare. Auth, edge database, admin panel, and blog engine — all wired together so you can start shipping features on day one.
			</p>

			<div class="hero-fade hero-fade-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
				<a href="/register" class="w-full rounded-xl bg-[#e8b86d] px-7 py-3 text-[14px] font-semibold text-[#050505] transition-all hover:bg-[#d4a55f] sm:w-auto">
					Start building free
				</a>
				<a href="#features" class="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-7 py-3 text-[14px] font-medium text-[#a3a3a3] transition-all hover:border-white/[0.2] hover:text-[#f5f5f5] sm:w-auto">
					See what's inside
				</a>
			</div>
		</div>

		<!-- Terminal mockup -->
		<div class="hero-fade hero-fade-3 mx-auto mt-20 max-w-4xl">
			<div class="terminal-glow relative rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-1 shadow-2xl">
				<div class="flex items-center gap-2 rounded-xl bg-[#0c0c0c] px-5 py-4">
					<div class="flex gap-1.5">
						<div class="h-3 w-3 rounded-full bg-[#ff5f57]"></div>
						<div class="h-3 w-3 rounded-full bg-[#febc2e]"></div>
						<div class="h-3 w-3 rounded-full bg-[#28c840]"></div>
					</div>
					<div class="ml-4 flex-1 rounded-md bg-[#141414] px-3 py-1 text-center text-[11px] text-[#525252]">vibekit-project</div>
				</div>
				<div class="overflow-x-auto px-6 pb-6 pt-2">
					<pre class="font-mono text-[13px] leading-7 text-[#737373]"><code><span class="text-[#525252]"># Create your project</span>
<span class="text-[#e8b86d]">$</span> bun create vibekit@latest my-app
<span class="text-[#525252]">✓</span> Downloaded template
<span class="text-[#525252]">✓</span> Installed dependencies
<span class="text-[#525252]">✓</span> Configured D1 database

<span class="text-[#525252]"># Start developing</span>
<span class="text-[#e8b86d]">$</span> cd my-app && bun dev

<span class="text-[#525252]">  VITE v6.0  ready in 420ms</span>
<span class="text-[#e8b86d]">  ➜</span>  Local:   http://localhost:5173/
<span class="text-[#e8b86d]">  ➜</span>  Network: http://192.168.1.42:5173/</code></pre>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ===== LOGO STRIP ===== -->
<section class="border-y border-white/[0.06] bg-[#080808] py-10">
	<div class="mx-auto max-w-6xl px-6">
		<p class="mb-8 text-center text-[12px] font-medium uppercase tracking-[0.15em] text-[#525252]">Built on infrastructure you trust</p>
		<div class="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
			<span class="text-[15px] font-semibold tracking-tight text-[#404040]">SvelteKit</span>
			<span class="text-[15px] font-semibold tracking-tight text-[#404040]">Cloudflare</span>
			<span class="text-[15px] font-semibold tracking-tight text-[#404040]">Drizzle ORM</span>
			<span class="text-[15px] font-semibold tracking-tight text-[#404040]">Tailwind CSS</span>
			<span class="text-[15px] font-semibold tracking-tight text-[#404040]">Better Auth</span>
			<span class="text-[15px] font-semibold tracking-tight text-[#404040]">Bun</span>
		</div>
	</div>
</section>

<!-- ===== BENTO FEATURES ===== -->
<section id="features" class="relative px-6 py-32">
	<div class="pointer-events-none absolute left-0 top-40 h-[600px] w-[600px] opacity-20" style="background: radial-gradient(ellipse at center, rgba(232,184,109,0.06) 0%, transparent 70%);"></div>

	<div class="relative mx-auto max-w-6xl">
		<div class="mb-16 max-w-2xl">
			<h2 class="mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.02em] text-[#f5f5f5]">
				Stop configuring.<br />Start building.
			</h2>
			<p class="text-lg leading-relaxed text-[#737373]">
				Every SaaS needs the same foundation. We built it once — properly — so you never have to wire auth to a database again.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<!-- Large card: Auth -->
			<div class="group relative col-span-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0c] p-8 transition-all duration-300 hover:border-white/[0.12] md:col-span-2">
				<div class="absolute right-0 top-0 h-40 w-40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style="background: radial-gradient(circle at top right, rgba(232,184,109,0.08), transparent 70%);"></div>
				<div class="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
					<svg class="h-5 w-5 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>
				</div>
				<h3 class="mb-2 text-[18px] font-semibold text-[#f5f5f5]">Better Auth, built in</h3>
				<p class="max-w-md text-[15px] leading-relaxed text-[#737373]">
					Email and password login with secure sessions, password resets, and role-based access control. No third-party auth provider required. Your user data stays in your D1 database.
				</p>
			</div>

			<!-- Small card: Edge DB -->
			<div class="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0c] p-8 transition-all duration-300 hover:border-white/[0.12]">
				<div class="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
					<svg class="h-5 w-5 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C3.75 16.153 7.444 18 12 18s8.25-1.847 8.25-4.125v-3.75m0 0-.01-.03h.01"/></svg>
				</div>
				<h3 class="mb-2 text-[18px] font-semibold text-[#f5f5f5]">D1 at the edge</h3>
				<p class="text-[15px] leading-relaxed text-[#737373]">
					SQLite queries that run globally in under 50ms. Drizzle ORM keeps it type-safe from schema to API.
				</p>
			</div>

			<!-- Small card: Admin -->
			<div class="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0c] p-8 transition-all duration-300 hover:border-white/[0.12]">
				<div class="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
					<svg class="h-5 w-5 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/></svg>
				</div>
				<h3 class="mb-2 text-[18px] font-semibold text-[#f5f5f5]">Admin dashboard</h3>
				<p class="text-[15px] leading-relaxed text-[#737373]">
					User management, content publishing, and audit trails. Ready for your team from day one.
				</p>
			</div>

			<!-- Large card: Blog -->
			<div class="group relative col-span-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0c] p-8 transition-all duration-300 hover:border-white/[0.12] md:col-span-2">
				<div class="absolute right-0 top-0 h-40 w-40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style="background: radial-gradient(circle at top right, rgba(232,184,109,0.08), transparent 70%);"></div>
				<div class="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
					<svg class="h-5 w-5 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"/></svg>
				</div>
				<h3 class="mb-2 text-[18px] font-semibold text-[#f5f5f5]">Blog engine that scales</h3>
				<p class="max-w-md text-[15px] leading-relaxed text-[#737373]">
					Write in Markdown. Publish instantly with ISR-style cache invalidation. Draft, edit, and unpublish without redeploying. SEO metadata and structured data handled automatically.
				</p>
			</div>

			<!-- Small card: Type-safe -->
			<div class="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0c] p-8 transition-all duration-300 hover:border-white/[0.12]">
				<div class="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
					<svg class="h-5 w-5 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"/></svg>
				</div>
				<h3 class="mb-2 text-[18px] font-semibold text-[#f5f5f5]">Type-safe everything</h3>
				<p class="text-[15px] leading-relaxed text-[#737373]">
					Drizzle + TypeScript + SvelteKit 5 runes. Refactor without breaking things.
				</p>
			</div>

			<!-- Small card: Deploy -->
			<div class="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0c] p-8 transition-all duration-300 hover:border-white/[0.12]">
				<div class="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
					<svg class="h-5 w-5 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"/></svg>
				</div>
				<h3 class="mb-2 text-[18px] font-semibold text-[#f5f5f5]">Deploy in seconds</h3>
				<p class="text-[15px] leading-relaxed text-[#737373]">
					One command to Cloudflare Workers. Edge-cached, globally distributed.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- ===== QUICKSTART ===== -->
<section class="relative border-y border-white/[0.06] bg-[#080808] px-6 py-32">
	<div class="mx-auto max-w-6xl">
		<div class="grid items-center gap-16 lg:grid-cols-2">
			<div>
				<h2 class="mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.02em] text-[#f5f5f5]">
					From zero to production in under five minutes.
				</h2>
				<p class="mb-10 text-lg leading-relaxed text-[#737373]">
					No config files to wrestle with. No auth providers to sign up for. Just run the command and you have a working app with database, auth, and admin panel.
				</p>

				<div class="space-y-6">
					<div class="flex gap-4">
						<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] text-[13px] font-semibold text-[#e8b86d]">1</div>
						<div>
							<h4 class="mb-1 text-[15px] font-semibold text-[#f5f5f5]">Create your project</h4>
							<p class="text-[14px] leading-relaxed text-[#737373]">Run the CLI. Choose your app name. Everything else is handled.</p>
						</div>
					</div>
					<div class="flex gap-4">
						<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] text-[13px] font-semibold text-[#e8b86d]">2</div>
						<div>
							<h4 class="mb-1 text-[15px] font-semibold text-[#f5f5f5]">Set up your database</h4>
							<p class="text-[14px] leading-relaxed text-[#737373]">Local D1 spins up automatically. Migrations run on first start.</p>
						</div>
					</div>
					<div class="flex gap-4">
						<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] text-[13px] font-semibold text-[#e8b86d]">3</div>
						<div>
							<h4 class="mb-1 text-[15px] font-semibold text-[#f5f5f5]">Start building features</h4>
							<p class="text-[14px] leading-relaxed text-[#737373]">Auth, database, and admin are ready. Write your first Svelte 5 component.</p>
						</div>
					</div>
				</div>
			</div>

			<div class="relative">
				<div class="absolute -inset-4 rounded-3xl opacity-30 blur-2xl" style="background: radial-gradient(ellipse at center, rgba(232,184,109,0.1), transparent 70%);"></div>
				<div class="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0c]">
					<div class="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
						<div class="flex gap-1.5">
							<div class="h-2.5 w-2.5 rounded-full bg-[#ff5f57]"></div>
							<div class="h-2.5 w-2.5 rounded-full bg-[#febc2e]"></div>
							<div class="h-2.5 w-2.5 rounded-full bg-[#28c840]"></div>
						</div>
						<span class="ml-3 text-[11px] text-[#404040]">src/routes/app/+page.svelte</span>
					</div>
					<div class="overflow-x-auto p-6">
						<pre class="font-mono text-[12px] leading-6 text-[#737373]"><code><span class="text-[#525252]">&lt;script lang="ts"&gt;</span>
  <span class="text-[#a3a3a3]">let</span> <span class="text-[#f5f5f5]">count</span> <span class="text-[#a3a3a3]">=</span> <span class="text-[#e8b86d]">$state</span><span class="text-[#a3a3a3]">(</span><span class="text-[#e8b86d]">0</span><span class="text-[#a3a3a3]">)</span>

  <span class="text-[#a3a3a3]">const</span> <span class="text-[#f5f5f5]">double</span> <span class="text-[#a3a3a3]">=</span> <span class="text-[#e8b86d]">$derived</span><span class="text-[#a3a3a3]">(</span><span class="text-[#f5f5f5]">count</span> <span class="text-[#a3a3a3]">*</span> <span class="text-[#e8b86d]">2</span><span class="text-[#a3a3a3]">)</span>
<span class="text-[#525252]">&lt;/script&gt;</span>

<span class="text-[#525252]">&lt;button</span> <span class="text-[#e8b86d]">onclick</span><span class="text-[#a3a3a3]">=</span><span class="text-[#a3a3a3]">{'{'}</span><span class="text-[#a3a3a3]">()</span> <span class="text-[#a3a3a3]">=&gt;</span> <span class="text-[#f5f5f5]">count</span><span class="text-[#a3a3a3]">++</span><span class="text-[#a3a3a3]">{'}'}</span><span class="text-[#525252]">&gt;</span>
  <span class="text-[#f5f5f5]">Clicked </span><span class="text-[#a3a3a3]">{'{'}</span><span class="text-[#f5f5f5]">count</span><span class="text-[#a3a3a3]">{'}'}</span><span class="text-[#f5f5f5]"> times</span>
<span class="text-[#525252]">&lt;/button&gt;</span>

<span class="text-[#525252]">&lt;p&gt;</span><span class="text-[#f5f5f5]">Double: </span><span class="text-[#a3a3a3]">{'{'}</span><span class="text-[#f5f5f5]">double</span><span class="text-[#a3a3a3]">{'}'}</span><span class="text-[#f5f5f5]">&lt;/p&gt;</span></code></pre>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ===== PRICING ===== -->
<section id="pricing" class="relative px-6 py-32">
	<div class="pointer-events-none absolute right-0 top-20 h-[500px] w-[500px] opacity-20" style="background: radial-gradient(ellipse at center, rgba(232,184,109,0.06) 0%, transparent 70%);"></div>

	<div class="relative mx-auto max-w-4xl">
		<div class="mb-16 text-center">
			<h2 class="mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.02em] text-[#f5f5f5]">Simple, predictable pricing</h2>
			<p class="mx-auto max-w-lg text-lg leading-relaxed text-[#737373]">
				Start free. Upgrade when you need more. No surprise charges, no feature gates on the basics.
			</p>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			<!-- Starter -->
			<div class="rounded-2xl border border-white/[0.06] bg-[#0c0c0c] p-8">
				<div class="mb-6">
					<h3 class="mb-2 text-[18px] font-semibold text-[#f5f5f5]">Starter</h3>
					<p class="text-[14px] text-[#737373]">For side projects and early validation.</p>
				</div>
				<div class="mb-8">
					<span class="text-[42px] font-semibold tracking-tight text-[#f5f5f5]">$0</span>
					<span class="text-[15px] text-[#737373]">/month</span>
				</div>
				<ul class="mb-8 space-y-3">
					<li class="flex items-start gap-3 text-[14px] text-[#a3a3a3]">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Everything in the template
					</li>
					<li class="flex items-start gap-3 text-[14px] text-[#a3a3a3]">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Unlimited users (self-hosted)
					</li>
					<li class="flex items-start gap-3 text-[14px] text-[#a3a3a3]">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Community support
					</li>
					<li class="flex items-start gap-3 text-[14px] text-[#525252]">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
						Priority updates
					</li>
				</ul>
				<a href="/register" class="block w-full rounded-xl border border-white/[0.1] bg-white/[0.03] py-2.5 text-center text-[14px] font-medium text-[#a3a3a3] transition-all hover:border-white/[0.2] hover:text-[#f5f5f5]">
					Get started free
				</a>
			</div>

			<!-- Pro -->
			<div class="relative rounded-2xl border border-[#e8b86d]/30 bg-[#0c0c0c] p-8">
				<div class="absolute -top-3 left-8 rounded-full bg-[#e8b86d] px-3 py-1 text-[11px] font-semibold text-[#050505]">Most popular</div>
				<div class="mb-6">
					<h3 class="mb-2 text-[18px] font-semibold text-[#f5f5f5]">Pro</h3>
					<p class="text-[14px] text-[#737373]">For teams shipping to production.</p>
				</div>
				<div class="mb-8">
					<span class="text-[42px] font-semibold tracking-tight text-[#f5f5f5]">$29</span>
					<span class="text-[15px] text-[#737373]">/month</span>
				</div>
				<ul class="mb-8 space-y-3">
					<li class="flex items-start gap-3 text-[14px] text-[#a3a3a3]">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Everything in Starter
					</li>
					<li class="flex items-start gap-3 text-[14px] text-[#a3a3a3]">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Priority updates and new features
					</li>
					<li class="flex items-start gap-3 text-[14px] text-[#a3a3a3]">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Discord access with core team
					</li>
					<li class="flex items-start gap-3 text-[14px] text-[#a3a3a3]">
						<svg class="mt-0.5 h-4 w-4 shrink-0 text-[#e8b86d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
						Commercial license included
					</li>
				</ul>
				<a href="/register" class="block w-full rounded-xl bg-[#e8b86d] py-2.5 text-center text-[14px] font-semibold text-[#050505] transition-all hover:bg-[#d4a55f]">
					Start free trial
				</a>
			</div>
		</div>
	</div>
</section>

<!-- ===== CTA ===== -->
<section class="relative overflow-hidden px-6 py-32">
	<div class="pointer-events-none absolute inset-0 opacity-30" style="background: radial-gradient(ellipse at center, rgba(232,184,109,0.08) 0%, transparent 60%);"></div>
	<div class="relative mx-auto max-w-3xl text-center">
		<h2 class="mb-6 text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-tight tracking-[-0.02em] text-[#f5f5f5]">
			Ready to stop wiring<br />boilerplate?
		</h2>
		<p class="mx-auto mb-10 max-w-lg text-lg leading-relaxed text-[#737373]">
			Join developers who ship faster with a foundation that's already built, tested, and deployed to the edge.
		</p>
		<div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
			<a href="/register" class="w-full rounded-xl bg-[#e8b86d] px-8 py-3.5 text-[15px] font-semibold text-[#050505] transition-all hover:bg-[#d4a55f] sm:w-auto">
				Get started free
			</a>
			<a href="https://github.com" target="_blank" rel="noopener noreferrer" class="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-8 py-3.5 text-[15px] font-medium text-[#a3a3a3] transition-all hover:border-white/[0.2] hover:text-[#f5f5f5] sm:w-auto">
				View on GitHub
			</a>
		</div>
		<p class="mt-6 text-[13px] text-[#525252]">No credit card required. MIT licensed.</p>
	</div>
</section>

<!-- ===== FOOTER ===== -->
<footer class="border-t border-white/[0.06] bg-[#050505] px-6 pt-20 pb-12">
	<div class="mx-auto max-w-6xl">
		<div class="grid gap-12 md:grid-cols-12">
			<div class="md:col-span-5">
				<a href="/" class="mb-5 flex items-center gap-2.5">
					<div class="flex h-7 w-7 items-center justify-center rounded-md bg-[#e8b86d] text-[#050505]">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
					</div>
					<span class="text-[15px] font-semibold tracking-tight text-[#f5f5f5]">Vibekit</span>
				</a>
				<p class="max-w-xs text-[14px] leading-relaxed text-[#525252]">
					A complete SvelteKit stack for building SaaS on Cloudflare. Auth, database, admin, and blog — pre-wired and ready to ship.
				</p>
			</div>

			<div class="md:col-span-2">
				<h4 class="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[#737373]">Product</h4>
				<ul class="space-y-3">
					<li><a href="#features" class="text-[14px] text-[#525252] transition-colors hover:text-[#a3a3a3]">Features</a></li>
					<li><a href="#pricing" class="text-[14px] text-[#525252] transition-colors hover:text-[#a3a3a3]">Pricing</a></li>
					<li><a href="/blog" class="text-[14px] text-[#525252] transition-colors hover:text-[#a3a3a3]">Blog</a></li>
					<li><a href="/docs" class="text-[14px] text-[#525252] transition-colors hover:text-[#a3a3a3]">Documentation</a></li>
				</ul>
			</div>

			<div class="md:col-span-2">
				<h4 class="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[#737373]">Resources</h4>
				<ul class="space-y-3">
					<li><a href="https://github.com" target="_blank" rel="noopener noreferrer" class="text-[14px] text-[#525252] transition-colors hover:text-[#a3a3a3]">GitHub</a></li>
					<li><a href="/support" class="text-[14px] text-[#525252] transition-colors hover:text-[#a3a3a3]">Support</a></li>
					<li><a href="/changelog" class="text-[14px] text-[#525252] transition-colors hover:text-[#a3a3a3]">Changelog</a></li>
				</ul>
			</div>

			<div class="md:col-span-3">
				<h4 class="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[#737373]">Legal</h4>
				<ul class="space-y-3">
					<li><a href="/privacy" class="text-[14px] text-[#525252] transition-colors hover:text-[#a3a3a3]">Privacy Policy</a></li>
					<li><a href="/terms" class="text-[14px] text-[#525252] transition-colors hover:text-[#a3a3a3]">Terms of Service</a></li>
				</ul>
			</div>
		</div>

		<div class="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 md:flex-row">
			<p class="text-[13px] text-[#404040]">© 2026 Vibekit. All rights reserved.</p>
			<div class="flex items-center gap-6">
				<a href="https://twitter.com" target="_blank" rel="noopener noreferrer" class="text-[13px] text-[#404040] transition-colors hover:text-[#a3a3a3]">Twitter</a>
				<a href="https://github.com" target="_blank" rel="noopener noreferrer" class="text-[13px] text-[#404040] transition-colors hover:text-[#a3a3a3]">GitHub</a>
				<a href="https://discord.com" target="_blank" rel="noopener noreferrer" class="text-[13px] text-[#404040] transition-colors hover:text-[#a3a3a3]">Discord</a>
			</div>
		</div>
	</div>
</footer>

<style>
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.hero-fade {
		opacity: 0;
		animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	.hero-fade-1 { animation-delay: 0.1s; }
	.hero-fade-2 { animation-delay: 0.2s; }
	.hero-fade-3 { animation-delay: 0.35s; }

	.terminal-glow {
		box-shadow:
			0 0 0 1px rgba(232, 184, 109, 0.06),
			0 20px 60px -20px rgba(0, 0, 0, 0.8),
			0 0 80px -20px rgba(232, 184, 109, 0.08);
	}
</style>
