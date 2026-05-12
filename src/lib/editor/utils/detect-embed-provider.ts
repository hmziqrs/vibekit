export interface EmbedProvider {
  name: string
  urlPattern: RegExp
  toEmbedUrl: (url: string) => string
}

const FACEBOOK_PATTERN = /(?:facebook\.com|fb\.watch)\/.+/i
const GITHUB_GIST_PATTERN = /gist\.github\.com\/([\w-]+\/[\w-]+)/
const INSTAGRAM_PATTERN = /instagram\.com\/(?:p|reel|reels)\/([\w-]+)/i
const REDDIT_PATTERN = /reddit\.com\/r\/[\w]+\/comments\/([\w]+)/i
const TIKTOK_PATTERN = /tiktok\.com\/@[\w.]+\/video\/(\d+)/i
const TWITTER_PATTERN = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/
const VIMEO_PATTERN = /vimeo\.com\/(\d+)/
const YOUTUBE_PATTERN = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/

const providers: EmbedProvider[] = [
  {
    name: 'facebook',
    toEmbedUrl: (url) =>
      `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}`,
    urlPattern: FACEBOOK_PATTERN,
  },
  {
    name: 'github-gist',
    toEmbedUrl: (url) => {
      const match = url.match(GITHUB_GIST_PATTERN)
      if (!match) return url
      const fileParam = url.includes('?file=') ? `?file=${url.split('?file=')[1]}` : ''
      return `https://gist.github.com/${match[1]}.js${fileParam}`
    },
    urlPattern: GITHUB_GIST_PATTERN,
  },
  {
    name: 'instagram',
    toEmbedUrl: (url) => {
      const match = url.match(INSTAGRAM_PATTERN)
      return match ? `https://www.instagram.com/p/${match[1]}/embed` : url
    },
    urlPattern: INSTAGRAM_PATTERN,
  },
  {
    name: 'reddit',
    toEmbedUrl: (url) => url,
    urlPattern: REDDIT_PATTERN,
  },
  {
    name: 'tiktok',
    toEmbedUrl: (url) => {
      const match = url.match(TIKTOK_PATTERN)
      return match ? `https://www.tiktok.com/embed/v2/${match[1]}` : url
    },
    urlPattern: TIKTOK_PATTERN,
  },
  {
    name: 'twitter',
    toEmbedUrl: (url) => url,
    urlPattern: TWITTER_PATTERN,
  },
  {
    name: 'vimeo',
    toEmbedUrl: (url) => {
      const match = url.match(VIMEO_PATTERN)
      return match ? `https://player.vimeo.com/video/${match[1]}` : url
    },
    urlPattern: VIMEO_PATTERN,
  },
  {
    name: 'youtube',
    toEmbedUrl: (url) => {
      const match = url.match(YOUTUBE_PATTERN)
      return match ? `https://www.youtube.com/embed/${match[1]}` : url
    },
    urlPattern: YOUTUBE_PATTERN,
  },
]

export function detectEmbedProvider(url: string): EmbedProvider | null {
  return providers.find((p) => p.urlPattern.test(url)) ?? null
}

export function getEmbedUrl(url: string): string {
  const provider = detectEmbedProvider(url)
  return provider ? provider.toEmbedUrl(url) : url
}

export function isGistProvider(provider: EmbedProvider): boolean {
  return provider.name === 'github-gist'
}
