export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Vibekit',
    url: 'https://vibekit.dev',
    logo: 'https://vibekit.dev/favicon.svg',
    description: 'A complete SvelteKit stack for building SaaS on Cloudflare.',
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
    name: title,
    description,
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
    headline: title,
    description,
    url,
    image,
    datePublished: publishedTime,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Vibekit',
    },
  }
}
