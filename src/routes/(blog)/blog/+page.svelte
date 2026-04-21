<script lang="ts">
	import { seo } from '$lib/seo'
	import Nav from '$lib/components/nav.svelte'
	import Footer from '$lib/components/footer.svelte'

	const meta = seo({
		title: 'Blog',
		description: 'Articles about SvelteKit, Cloudflare, and building SaaS products.',
	})

	let { data } = $props()
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
</svelte:head>

<Nav />

<section class="px-6 py-24">
	<div class="mx-auto max-w-4xl">
		<h1 class="mb-12 text-3xl font-bold text-text-primary">Blog</h1>

		{#if data.posts.length === 0}
			<p class="text-text-muted">No posts yet. Check back soon!</p>
		{:else}
			<div class="space-y-8">
				{#each data.posts as post}
					<a href="/blog/{post.slug}" class="group block">
						<article class="rounded-xl border border-white/[0.06] bg-surface p-6 transition-all hover:border-white/[0.12]">
							{#if post.coverImageUrl}
								<img src={post.coverImageUrl} alt={post.title} class="mb-4 h-48 w-full rounded-lg object-cover" loading="lazy" />
							{/if}
							<h2 class="mb-2 text-xl font-semibold text-text-primary transition-colors group-hover:text-brand">{post.title}</h2>
							{#if post.excerpt}
								<p class="mb-3 text-[14px] leading-relaxed text-text-muted">{post.excerpt}</p>
							{/if}
							<time class="text-[12px] text-text-subtle">
								{new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
							</time>
						</article>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>

<Footer />
