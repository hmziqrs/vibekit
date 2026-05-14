<script lang="ts">
	import SeoHead from '$lib/components/seo-head.svelte'
	import Nav from '$lib/components/nav.svelte'
	import Footer from '$lib/components/footer.svelte'
	import { formatDate } from '$lib/i18n.svelte'

	const { data } = $props()
</script>

<SeoHead
  description={data.series.description ?? `All posts in the ${data.series.name} series`}
  image={data.series.coverImageUrl ?? undefined}
  title="{data.series.name} — Series — Vibekit"
  type="website"
/>

<Nav />

<section class="px-6 py-24">
	<div class="mx-auto max-w-3xl">
		<header class="mb-10">
			<a href="/blog" class="mb-4 inline-block text-sm text-text-secondary transition-colors hover:text-brand">
				&larr; All Posts
			</a>
			<h1 class="mb-2 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
				{data.series.name}
			</h1>
			{#if data.series.description}
				<p class="text-text-muted">{data.series.description}</p>
			{/if}
			<p class="mt-2 text-sm text-text-faint">{data.posts.length} posts in this series</p>
		</header>

		{#if data.series.coverImageUrl}
			<img
				src={data.series.coverImageUrl}
				alt={data.series.name}
				class="mb-10 w-full rounded-xl border border-white/6"
				loading="lazy"
				decoding="async"
			/>
		{/if}

		<ol class="space-y-6">
			{#each data.posts as post, i}
				<li>
					<a
						href="/blog/{post.slug}"
						class="group flex gap-5 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-brand/40"
					>
						<span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-sm font-semibold text-text-secondary">
							{i + 1}
						</span>
						<div class="min-w-0 flex-1">
							<h2 class="font-medium text-text-primary group-hover:text-brand transition-colors">
								{post.title}
							</h2>
							{#if post.excerpt}
								<p class="mt-1 text-sm text-text-muted line-clamp-2">{post.excerpt}</p>
							{/if}
							{#if post.publishedAt}
								<time class="mt-2 block text-xs text-text-faint">
									{formatDate(post.publishedAt, {
										day: 'numeric',
										month: 'long',
										year: 'numeric',
									})}
								</time>
							{/if}
						</div>
					</a>
				</li>
			{/each}
		</ol>
	</div>
</section>

<Footer />
