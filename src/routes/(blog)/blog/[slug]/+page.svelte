<script lang="ts">
	import SeoHead from '$lib/components/seo-head.svelte'
	import Nav from '$lib/components/nav.svelte'
	import Footer from '$lib/components/footer.svelte'

	const { data } = $props()

	const formattedDate = $derived(
		new Date(data.post.publishedAt ?? data.post.createdAt).toLocaleDateString('en-US', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		})
	)
</script>

<SeoHead
  description={data.post.seoDescription ?? data.post.excerpt ?? ''}
  image={data.post.coverImageUrl}
  publishedTime={data.post.publishedAt ? new Date(data.post.publishedAt).toISOString() : undefined}
  title={data.post.title}
  type="article"
/>

<Nav />

<article class="px-6 py-24">
	<div class="mx-auto max-w-3xl">
		<header class="mb-10">
			<h1 class="mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
				{data.post.title}
			</h1>
			<div class="flex flex-wrap items-center gap-3 text-[14px] text-text-subtle">
				{#if data.post.authorName}
					<div class="flex items-center gap-2">
						{#if data.post.authorImage}
							<img
								src={data.post.authorImage}
								alt={data.post.authorName}
								class="size-6 rounded-full"
							/>
						{/if}
						<span>{data.post.authorName}</span>
					</div>
					<span class="text-text-faint">·</span>
				{/if}
				<time>{formattedDate}</time>
				<span class="text-text-faint">·</span>
				<span>{data.post.readingTime} min read</span>
			</div>
			{#if data.post.tags.length > 0}
				<div class="mt-3 flex flex-wrap gap-2">
					{#each data.post.tags as tag}
						<a
							href="/blog?tag={tag.slug}"
							class="rounded-full bg-surface px-3 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
						>
							{tag.name}
						</a>
					{/each}
				</div>
			{/if}
		</header>

		{#if data.post.coverImageUrl}
			<img
				src={data.post.coverImageUrl}
				alt={data.post.title}
				class="mb-10 w-full rounded-xl border border-white/6"
				loading="lazy"
			/>
		{/if}

		<div class="prose prose-invert max-none">
			{@html data.post.contentHtml}
		</div>
	</div>
</article>

<Footer />
