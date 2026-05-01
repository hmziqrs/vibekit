<script lang="ts">
	import { seo } from '$lib/seo'
	import Nav from '$lib/components/nav.svelte'
	import Footer from '$lib/components/footer.svelte'

	const { data } = $props()

	const meta = $derived(seo({
		description: data.post.seoDescription ?? data.post.excerpt ?? '',
		title: data.post.title,
	}))
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	{#if data.post.coverImageUrl}
		<meta property="og:image" content={data.post.coverImageUrl} />
	{/if}
</svelte:head>

<Nav />

<article class="px-6 py-24">
	<div class="mx-auto max-w-3xl">
		<header class="mb-10">
			<h1 class="mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
				{data.post.title}
			</h1>
			<time class="text-[14px] text-text-subtle">
				{new Date(data.post.publishedAt ?? data.post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
			</time>
		</header>

		{#if data.post.coverImageUrl}
			<img
				src={data.post.coverImageUrl}
				alt={data.post.title}
				class="mb-10 w-full rounded-xl border border-white/[0.06]"
				loading="lazy"
			/>
		{/if}

		<div class="prose prose-invert max-none">
			{@html data.post.contentHtml}
		</div>
	</div>
</article>

<Footer />
