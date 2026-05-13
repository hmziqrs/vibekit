import { cleanPastedHtml, sanitizeHtml } from '$lib/editor/utils/clean-paste'
import { describe, expect, it } from 'vitest'

describe(sanitizeHtml, () => {
  it('preserves allowed tags', () => {
    const html = '<p>Hello <strong>world</strong></p>'
    expect(sanitizeHtml(html)).toBe('<p>Hello <strong>world</strong></p>')
  })

  it('strips disallowed tags but keeps content', () => {
    const html = '<script>alert("xss")</script><p>Safe</p>'
    expect(sanitizeHtml(html)).toBe('alert("xss")<p>Safe</p>')
  })

  it('strips disallowed attributes from allowed tags', () => {
    const html = '<p onclick="evil()" class="foo">Text</p>'
    expect(sanitizeHtml(html)).toBe('<p>Text</p>')
  })

  it('preserves allowed attributes on links', () => {
    const html =
      '<a href="https://example.com" target="_blank" rel="noopener" onclick="evil()">Link</a>'
    const result = sanitizeHtml(html)
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('target="_blank"')
    expect(result).toContain('rel="noopener"')
    expect(result).not.toContain('onclick')
  })

  it('preserves allowed attributes on images', () => {
    const html = '<img src="pic.jpg" alt="Photo" width="100" height="200" onload="evil()">'
    const result = sanitizeHtml(html)
    expect(result).toContain('src="pic.jpg"')
    expect(result).toContain('alt="Photo"')
    expect(result).toContain('width="100"')
    expect(result).toContain('height="200"')
    expect(result).not.toContain('onload')
  })

  it('preserves colspan and rowspan on table cells', () => {
    const html = '<td colspan="2" rowspan="3" style="color:red">Cell</td>'
    const result = sanitizeHtml(html)
    expect(result).toContain('colspan="2"')
    expect(result).toContain('rowspan="3"')
    expect(result).not.toContain('style')
  })

  it('handles nested allowed tags', () => {
    const html = '<ul><li><strong>Bold</strong> item</li></ul>'
    expect(sanitizeHtml(html)).toBe('<ul><li><strong>Bold</strong> item</li></ul>')
  })

  it('strips iframe tags', () => {
    const html = '<iframe src="https://evil.com"></iframe><p>Text</p>'
    expect(sanitizeHtml(html)).toBe('<p>Text</p>')
  })

  it('strips form and input elements', () => {
    const html =
      '<form action="/steal"><input type="hidden" value="token"><button>Submit</button></form>'
    const result = sanitizeHtml(html)
    expect(result).not.toContain('<form')
    expect(result).not.toContain('<input')
    expect(result).not.toContain('<button')
  })

  it('handles malformed tags gracefully', () => {
    const html = '<p>Open but never closed'
    expect(sanitizeHtml(html)).toContain('<p>')
  })
})

describe(cleanPastedHtml, () => {
  it('removes Google Docs meta tags', () => {
    const html = '<meta charset="utf-8"><p>Content</p>'
    expect(cleanPastedHtml(html)).not.toContain('<meta')
    expect(cleanPastedHtml(html)).toContain('<p>Content</p>')
  })

  it('removes Word-specific conditional comments', () => {
    const html = '<!--[if gte mso 9]><xml>Word</xml><![endif]--><p>Content</p>'
    const result = cleanPastedHtml(html)
    expect(result).not.toContain('<!--[if')
    expect(result).toContain('<p>Content</p>')
  })

  it('removes Word paragraph markup (o:p)', () => {
    const html = '<p>Hello <o:p></o:p>World</p>'
    expect(cleanPastedHtml(html)).not.toContain('<o:p')
  })

  it('removes Word class attributes from Mso elements', () => {
    const html = '<p class="MsoNormal">Text</p>'
    const result = cleanPastedHtml(html)
    expect(result).not.toContain('MsoNormal')
    expect(result).toContain('<p>Text</p>')
  })

  it('removes XML declarations', () => {
    const html = '<?xml version="1.0"?><p>Text</p>'
    expect(cleanPastedHtml(html)).not.toContain('<?xml')
  })

  it('removes inline styles', () => {
    const html = '<p style="color: red; font-size: 14px">Text</p>'
    expect(cleanPastedHtml(html)).not.toContain('style=')
  })

  it('removes class attributes', () => {
    const html = '<p class="some-class">Text</p>'
    expect(cleanPastedHtml(html)).not.toContain('class=')
  })

  it('removes empty spans', () => {
    const html = '<p>Hello <span></span>World</p>'
    expect(cleanPastedHtml(html)).not.toContain('<span>')
  })

  it('removes whitespace-only spans', () => {
    const html = '<p>Hello <span>   </span>World</p>'
    expect(cleanPastedHtml(html)).not.toContain('<span>')
  })

  it('unwraps spans that lost attributes', () => {
    const html = '<span>Inner text</span>'
    expect(cleanPastedHtml(html)).not.toContain('<span>')
    expect(cleanPastedHtml(html)).toContain('Inner text')
  })

  it('converts divs to paragraphs', () => {
    const html = '<div>Block 1</div><div>Block 2</div>'
    const result = cleanPastedHtml(html)
    expect(result).toContain('<p>Block 1</p>')
    expect(result).toContain('<p>Block 2</p>')
    expect(result).not.toContain('<div')
  })

  it('collapses multiple empty paragraphs', () => {
    const html = '<p></p><p></p><p></p><p></p><p>Real content</p>'
    const result = cleanPastedHtml(html)
    // 4 empty paragraphs should collapse to one
    expect(result).toContain('Real content')
  })

  it('handles complex Google Docs paste correctly', () => {
    const html =
      '<meta charset="utf-8"><p style="margin:0" class="c0"><span style="font-weight:bold">Bold text</span></p>'
    const result = cleanPastedHtml(html)
    expect(result).not.toContain('<meta')
    expect(result).not.toContain('style=')
    expect(result).not.toContain('class=')
    expect(result).toContain('Bold text')
  })

  it('preserves table structure', () => {
    const html =
      '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>'
    const result = cleanPastedHtml(html)
    expect(result).toContain('<table>')
    expect(result).toContain('<thead>')
    expect(result).toContain('<th>Header</th>')
    expect(result).toContain('<tbody>')
    expect(result).toContain('<td>Cell</td>')
  })

  it('strips dangerous attributes from paste', () => {
    const html = '<a href="https://example.com" onmouseover="alert(1)">Link</a>'
    const result = cleanPastedHtml(html)
    expect(result).not.toContain('onmouseover')
    expect(result).toContain('href="https://example.com"')
  })

  it('handles empty input', () => {
    expect(cleanPastedHtml('')).toBe('')
  })

  it('handles plain text input', () => {
    expect(cleanPastedHtml('Just text')).toBe('Just text')
  })
})
