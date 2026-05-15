<script lang="ts">
  import Pagination from '$lib/components/pagination.svelte'
  import SeoHead from '$lib/components/seo-head.svelte'
  import { goto } from '$app/navigation'
  import Nav from '$lib/components/nav.svelte'
  import Footer from '$lib/components/footer.svelte'
  import NewsletterSignup from '$lib/components/newsletter-signup.svelte'
  import { formatDate } from '$lib/i18n.svelte'

  const { data } = $props()

  const limit = 10
  const totalPages = $derived(Math.ceil(data.total / limit))
  const startItem = $derived((data.page - 1) * limit + 1)
  const endItem = $derived(Math.min(data.page * limit, data.total))

  function goToPage(page: number) {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    goto(`/blog/tag/${data.tag!.slug}${qs ? `?${qs}` : ''}`)
  }
</script>

<SeoHead
  description="Articles tagged with {data.tag?.name ?? 'unknown'} on Vibekit Blog."
  title={data.tag ? `Posts tagged "${data.tag.name}"` : 'Tag not found'}
/>

<Nav />

<section class="px-6 py-24">
  <div class="mx-auto max-w-4xl">
    {#if data.tag}
      <div class="mb-8 flex items-center gap-3">
        <h1 class="text-3xl font-bold text-text-primary">
          Tagged: <span class="text-brand">{data.tag.name}</span>
        </h1>
        <a
          href="/blog"
          class="rounded-full bg-white/[0.06] px-3 py-1 text-[12px] text-text-muted transition-colors hover:bg-white/[0.1] hover:text-text-primary"
        >
          All posts
        </a>
      </div>

      <!-- Tag chips -->
      {#if data.tags.length > 0}
        <div class="mb-8 flex flex-wrap gap-2">
          {#each data.tags as tag (tag)}
            <a
              href="/blog/tag/{tag.slug}"
              class="rounded-full px-3 py-1 text-[12px] font-medium transition-colors {data.tag?.slug === tag.slug
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
    {:else}
      <h1 class="mb-8 text-3xl font-bold text-text-primary">Tag not found</h1>
      <p class="text-text-muted">
        This tag doesn't exist. <a href="/blog" class="text-brand hover:underline">Browse all posts</a>.
      </p>
    {/if}

    <div class="mb-8 rounded-lg border border-border bg-surface p-5">
      <h2 class="mb-1 text-sm font-semibold text-text-primary">Subscribe to the newsletter</h2>
      <NewsletterSignup source="blog" />
    </div>

    {#if data.tag && data.posts.length === 0}
      <p class="text-text-muted">No posts found with this tag.</p>
    {:else if data.posts.length > 0}
      <div class="space-y-8">
        {#each data.posts as post, i (post.id)}
          <a href="/blog/{post.slug}" class="group block">
            <article
              class="rounded-xl border border-white/[0.06] bg-surface p-6 transition-all hover:border-white/[0.12]"
            >
              {#if post.coverImageUrl}
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  class="mb-4 h-48 w-full rounded-lg object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  fetchpriority={i === 0 ? 'high' : undefined}
                  decoding="async"
                />
              {/if}
              <h2
                class="mb-2 text-xl font-semibold text-text-primary transition-colors group-hover:text-brand"
              >
                {post.title}
              </h2>
              {#if post.excerpt}
                <p class="mb-3 text-[14px] leading-relaxed text-text-muted">{post.excerpt}</p>
              {/if}
              <time class="text-[12px] text-text-subtle">
                {formatDate(post.publishedAt ?? post.createdAt, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
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
