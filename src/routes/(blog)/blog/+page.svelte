<script lang="ts">
  import Pagination from '$lib/components/pagination.svelte'
  import SeoHead from '$lib/components/seo-head.svelte'
  import { goto } from '$app/navigation'
  import Nav from '$lib/components/nav.svelte'
  import Footer from '$lib/components/footer.svelte'
  import NewsletterSignup from '$lib/components/newsletter-signup.svelte'

  const { data } = $props()

  const limit = 10
  const totalPages = $derived(Math.ceil(data.total / limit))
  const startItem = $derived((data.page - 1) * limit + 1)
  const endItem = $derived(Math.min(data.page * limit, data.total))

  function goToPage(page: number) {
    const params = new URLSearchParams()
    if (data.q) params.set('q', data.q)
    if (data.tag) params.set('tag', data.tag)
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    goto(`/blog${qs ? `?${qs}` : ''}`)
  }

  function clearFilter(type: 'q' | 'tag') {
    const params = new URLSearchParams()
    if (type === 'q' && data.tag) params.set('tag', data.tag)
    if (type === 'tag' && data.q) params.set('q', data.q)
    const qs = params.toString()
    goto(`/blog${qs ? `?${qs}` : ''}`)
  }
</script>

<SeoHead
  description="Articles about SvelteKit, Cloudflare, and building SaaS products."
  title={data.page > 1 ? `Blog — Page ${data.page}` : data.q ? `Search: ${data.q}` : 'Blog'}
/>

<Nav />

<section class="px-6 py-24">
  <div class="mx-auto max-w-4xl">
    <h1 class="mb-8 text-3xl font-bold text-text-primary">Blog</h1>

    <!-- Search form -->
    <form method="GET" action="/blog" class="mb-6">
      <div class="flex gap-2">
        <input
          type="text"
          name="q"
          aria-label="Search articles"
          value={data.q ?? ''}
          placeholder="Search articles..."
          class="w-full max-w-md rounded-lg border border-border bg-input px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          class="rounded-lg bg-brand px-5 py-2.5 text-[13px] font-semibold text-brand-foreground hover:bg-brand-hover"
        >
          Search
        </button>
      </div>
    </form>

    <!-- Active filters -->
    {#if data.q || data.tag}
      <div class="mb-6 flex flex-wrap items-center gap-2">
        {#if data.q}
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-[12px] text-text-muted">
            Search: "{data.q}"
            <button onclick={() => clearFilter('q')} class="text-text-faint hover:text-text-primary">&times;</button>
          </span>
        {/if}
        {#if data.tag}
          <span class="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-[12px] text-brand">
            Tag: {data.tag}
            <button onclick={() => clearFilter('tag')} class="text-brand/60 hover:text-brand">&times;</button>
          </span>
        {/if}
      </div>
    {/if}

    <!-- Tag chips -->
    {#if data.tags.length > 0}
      <div class="mb-8 flex flex-wrap gap-2">
        {#each data.tags as tag}
          <a
            href="/blog?tag={tag.slug}"
            class="rounded-full px-3 py-1 text-[12px] font-medium transition-colors {data.tag === tag.slug
              ? 'bg-brand text-brand-foreground'
              : 'bg-white/[0.06] text-text-muted hover:bg-white/[0.1] hover:text-text-primary'}"
          >
            {tag.name}
          </a>
        {/each}
      </div>
    {/if}

    {#if data.total > 0}
      <p class="mb-4 text-[12px] text-text-muted">
        Showing {startItem}-{endItem} of {data.total} article{data.total !== 1 ? 's' : ''}
      </p>
    {/if}

    <div class="mb-8 rounded-lg border border-border bg-surface p-5">
      <h3 class="mb-1 text-sm font-semibold text-text-primary">Subscribe to the newsletter</h3>
      <NewsletterSignup source="blog" />
    </div>

    {#if data.posts.length === 0}
      <p class="text-text-muted">
        {data.q || data.tag ? 'No articles match your search.' : 'No posts yet. Check back soon!'}
      </p>
    {:else}
      <div class="space-y-8">
        {#each data.posts as post, i (post.id)}
          <a href="/blog/{post.slug}" class="group block">
            <article class="rounded-xl border border-white/[0.06] bg-surface p-6 transition-all hover:border-white/[0.12]">
              {#if post.coverImageUrl}
                <img src={post.coverImageUrl} alt={post.title} class="mb-4 h-48 w-full rounded-lg object-cover" loading={i === 0 ? 'eager' : 'lazy'} fetchpriority={i === 0 ? 'high' : undefined} decoding="async" />
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

      {#if totalPages > 1}
        <div class="mt-10">
          <Pagination
            currentPage={data.page}
            {totalPages}
            totalItems={data.total}
            pageSize={limit}
            onPageChange={goToPage}
          />
        </div>
      {/if}
    {/if}
  </div>
</section>

<Footer />
