export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    description: 'A complete SvelteKit stack for building SaaS on Cloudflare.',
    logo: 'https://vibekit.dev/favicon.svg',
    name: 'Vibekit',
    url: 'https://vibekit.dev',
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Vibekit',
    url: 'https://vibekit.dev',
  }
}

export function webpageJsonLd(title: string, description: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    description,
    name: title,
    url,
  }
}

export function articleJsonLd({
  title,
  description,
  url,
  image,
  publishedTime,
  authorName,
}: {
  title: string
  description: string
  url: string
  image?: string
  publishedTime: string
  authorName: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    author: {
      '@type': 'Person',
      name: authorName,
    },
    datePublished: publishedTime,
    description,
    headline: title,
    image,
    publisher: {
      '@type': 'Organization',
      name: 'Vibekit',
    },
    url,
  }
}
