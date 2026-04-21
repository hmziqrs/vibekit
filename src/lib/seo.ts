export interface SeoProps {
  title: string
  description: string
  canonical?: string
  image?: string
  type?: 'website' | 'article'
  publishedTime?: string
}

export function seo({
  title,
  description,
  canonical,
  image,
  type = 'website',
  publishedTime,
}: SeoProps) {
  const siteName = 'Vibekit'
  const fullTitle = title === siteName ? title : `${title} — ${siteName}`

  return {
    title: fullTitle,
    description,
    canonical,
    openGraph: {
      title: fullTitle,
      description,
      siteName,
      image,
      type,
      publishedTime,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: fullTitle,
      description,
      image,
    },
  }
}
