<script lang="ts">
	import NewsletterSignup from './newsletter-signup.svelte'
</script>

<footer class="border-t border-white/[0.06] bg-surface-base px-6 pt-20 pb-12">
	<div class="mx-auto max-w-6xl">
		<div class="mb-10 rounded-lg border border-border bg-surface p-5">
			<h4 class="mb-1 text-sm font-semibold text-text-primary">Subscribe to the newsletter</h4>
			<NewsletterSignup source="footer" compact={true} />
		</div>
		<div class="grid gap-12 md:grid-cols-12">
			<div class="md:col-span-5">
				<a href="/" class="mb-5 flex items-center gap-2.5">
					<div class="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
					</div>
					<span class="text-[15px] font-semibold tracking-tight text-text-primary">Vibekit</span>
				</a>
				<p class="max-w-xs text-[14px] leading-relaxed text-text-subtle">
					A complete SvelteKit stack for building SaaS on Cloudflare. Auth, database, admin, and blog — pre-wired and ready to ship.
				</p>
			</div>

			<div class="md:col-span-2">
				<h4 class="mb-4 text-[13px] font-semibold uppercase tracking-wider text-text-muted">Product</h4>
				<ul class="space-y-3">
					<li><a href="/features" class="text-[14px] text-text-subtle transition-colors hover:text-text-secondary">Features</a></li>
					<li><a href="/pricing" class="text-[14px] text-text-subtle transition-colors hover:text-text-secondary">Pricing</a></li>
					<li><a href="/blog" class="text-[14px] text-text-subtle transition-colors hover:text-text-secondary">Blog</a></li>
				</ul>
			</div>

			<div class="md:col-span-2">
				<h4 class="mb-4 text-[13px] font-semibold uppercase tracking-wider text-text-muted">Resources</h4>
				<ul class="space-y-3">
					<li><a href="https://github.com" target="_blank" rel="noopener noreferrer" class="text-[14px] text-text-subtle transition-colors hover:text-text-secondary">GitHub</a></li>
					<li><a href="/contact" class="text-[14px] text-text-subtle transition-colors hover:text-text-secondary">Support</a></li>
				</ul>
			</div>

			<div class="md:col-span-3">
				<h4 class="mb-4 text-[13px] font-semibold uppercase tracking-wider text-text-muted">Legal</h4>
				<ul class="space-y-3">
					<li><a href="/privacy" class="text-[14px] text-text-subtle transition-colors hover:text-text-secondary">Privacy Policy</a></li>
					<li><a href="/terms" class="text-[14px] text-text-subtle transition-colors hover:text-text-secondary">Terms of Service</a></li>
				</ul>
			</div>
		</div>

		<div class="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 md:flex-row">
			<p class="text-[13px] text-text-faint">&copy; 2026 Vibekit. All rights reserved.</p>
			<div class="flex items-center gap-6">
				<a href="https://twitter.com" target="_blank" rel="noopener noreferrer" class="text-[13px] text-text-faint transition-colors hover:text-text-secondary">Twitter</a>
				<a href="https://github.com" target="_blank" rel="noopener noreferrer" class="text-[13px] text-text-faint transition-colors hover:text-text-secondary">GitHub</a>
			</div>
		</div>
	</div>
</footer>
