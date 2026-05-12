<script lang="ts">
  import { seo, type SeoProps } from '$lib/seo'

  const ORIGIN = 'https://vibekit.dev'

  type Props = SeoProps

  const props: Props = $props()
  const meta = $derived(seo(props))

  function resolveImageUrl(image: string | undefined): string | undefined {
    if (!image) return undefined
    return image.startsWith('http') ? image : `${ORIGIN}${image}`
  }

  const SCRIPT_OPEN = '<script type="application/ld+json">'
  const SCRIPT_CLOSE = '</' + 'script>'

  const jsonLdScript = $derived(
    SCRIPT_OPEN +
      JSON.stringify(
        meta.openGraph.type === 'article'
          ? {
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              author: { '@type': 'Organization', name: 'Vibekit' },
              datePublished: props.publishedTime,
              description: meta.description,
              headline: meta.title,
              image: resolveImageUrl(props.image),
              mainEntityOfPage: { '@id': props.canonical ?? ORIGIN, '@type': 'WebPage' },
              publisher: { '@type': 'Organization', name: 'Vibekit', url: ORIGIN },
            }
          : {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Vibekit',
              url: ORIGIN,
            },
      ) +
      SCRIPT_CLOSE,
  )
</script>

<svelte:head>
  <title>{meta.title}</title>
  <meta name="description" content={meta.description} />
  <link rel="canonical" href={meta.canonical ?? ORIGIN} />

  <meta property="og:title" content={meta.openGraph.title} />
  <meta property="og:description" content={meta.openGraph.description} />
  <meta property="og:type" content={meta.openGraph.type} />
  <meta property="og:site_name" content={meta.openGraph.siteName} />
  {#if meta.openGraph.image}
    <meta property="og:image" content={meta.openGraph.image} />
  {/if}
  {#if meta.openGraph.publishedTime}
    <meta property="article:published_time" content={meta.openGraph.publishedTime} />
  {/if}

  <meta name="twitter:card" content={meta.twitter.card} />
  <meta name="twitter:title" content={meta.twitter.title} />
  <meta name="twitter:description" content={meta.twitter.description} />
  {#if meta.twitter.image}
    <meta name="twitter:image" content={meta.twitter.image} />
  {/if}

  {@html jsonLdScript}
</svelte:head>
