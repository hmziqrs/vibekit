import { renderCommentNotification } from '$lib/server/email/templates/comment-notification'
import { describe, expect, it } from 'vitest'

describe('renderCommentNotification', () => {
  const baseData = {
    commentAuthorName: 'John Smith',
    commentExcerpt: 'Great article! I really enjoyed the section about SvelteKit patterns.',
    postTitle: 'Getting Started with SvelteKit',
    postUrl: 'https://vibekit.com/blog/getting-started-with-sveltekit',
  }

  it('renders comment notification with all fields', () => {
    const { html, text } = renderCommentNotification(baseData)

    expect(html).toContain('John Smith')
    expect(html).toContain('Getting Started with SvelteKit')
    expect(html).toContain('Great article! I really enjoyed the section about SvelteKit patterns.')
    expect(html).toContain('https://vibekit.com/blog/getting-started-with-sveltekit')
    expect(html).toContain('View Comment')

    expect(text).toContain('John Smith')
    expect(text).toContain('Getting Started with SvelteKit')
    expect(text).toContain('https://vibekit.com/blog/getting-started-with-sveltekit')
  })

  it('escapes HTML in names and post title', () => {
    const { html } = renderCommentNotification({
      ...baseData,
      commentAuthorName: '<script>alert("xss")</script>',
      postTitle: '<b>Evil</b> Post',
    })

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;b&gt;')
  })

  it('escapes HTML in comment excerpt', () => {
    const { html } = renderCommentNotification({
      ...baseData,
      commentExcerpt: '<img src=x onerror=alert(1)>',
    })

    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img')
  })

  it('includes disable notification hint', () => {
    const { html, text } = renderCommentNotification(baseData)

    expect(html).toContain('disable these notifications')
    expect(text).toContain('disable these notifications')
  })

  it('renders with long comment excerpt', () => {
    const longExcerpt = 'A'.repeat(200)
    const { html, text } = renderCommentNotification({
      ...baseData,
      commentExcerpt: longExcerpt,
    })

    expect(html).toContain(longExcerpt)
    expect(text).toContain(longExcerpt)
  })
})
