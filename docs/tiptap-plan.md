Got it. Ignore SSR, public rendering, publishing pipeline, SEO, blog rendering, ISR, etc.

You only need: **a complete Tiptap OSS editor working inside Svelte**.

# Tiptap OSS Svelte Editor Plan

## Goal

Build a reusable Svelte editor component:

```txt
src/lib/editor/ArticleEditor.svelte
```

It should support:

```txt
Title-style writing experience
Toolbar
Rich text editing
Images
Links
Headings
Lists
Quotes
Tables
Embeds later
JSON output
HTML output optional
```

No Cloud. No Pro. No SSR dependency.

---

# 1. Install packages

Use only free Tiptap packages:

```bash
bun add @tiptap/core @tiptap/starter-kit
bun add @tiptap/extension-link
bun add @tiptap/extension-image
bun add @tiptap/extension-placeholder
bun add @tiptap/extension-typography
bun add @tiptap/extension-text-align
bun add @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header
bun add @tiptap/extension-underline
bun add @tiptap/extension-character-count
```

Note: `@tiptap/pm` is a transitive dependency of `@tiptap/core` — do NOT install it separately.

Svelte 5 integration uses `@tiptap/core` directly. There is no `@tiptap/svelte-5` package.
Mount the Editor instance to a DOM element via `$effect` and call `editor.mount(element)` /
`editor.destroy()` manually. No Svelte 4 wrapper needed.

Avoid:

```txt
@tiptap-pro/*
Tiptap Cloud
TiptapCollabProvider
AI extension
Comments extension
Snapshot extension
Pages extension
Tracked changes extension
```

---

# 2. File structure

## Source code

```txt
src/lib/editor/
  ArticleEditor.svelte
  EditorToolbar.svelte
  BubbleMenu.svelte
  SlashMenu.svelte
  extensions/
    figure-image.ts
    embed-block.ts
    pull-quote.ts
    fact-box.ts
    timeline-block.ts
    source-block.ts
    related-article.ts
    correction-note.ts
    update-note.ts
  nodeviews/
    FigureImageView.svelte
    EmbedBlockView.svelte
    PullQuoteView.svelte
    FactBoxView.svelte
    TimelineView.svelte
    SourceBlockView.svelte
    RelatedArticleView.svelte
    NoteBlockView.svelte
  utils/
    detect-embed-provider.ts
    normalize-url.ts
    extract-text.ts
    validate-content.ts
    clean-paste.ts
```

## Test page (for e2e browser testing)

```txt
src/routes/(admin)/admin/editor-test/+page.svelte
```

This route inherits `ssr=false, csr=true` from the admin group layout — no SSR concerns.

## Unit tests

```txt
tests/unit/editor/
  article-editor.test.ts
  editor-toolbar.test.ts
  extensions.test.ts
  nodeviews.test.ts
  utils.test.ts
```

Tests follow the existing project pattern: vitest globals (`describe`/`it`/`expect`) imported explicitly.
Svelte component mount tests use jsdom or `@testing-library/svelte`.

Start simple:

```txt
ArticleEditor.svelte
EditorToolbar.svelte
```

Add custom extensions later.

---

# 3. Main editor component

No `@tiptap/svelte` — use `@tiptap/core`'s `Editor` class directly with manual DOM mounting.
In Svelte 5, create the editor in `$effect` and destroy it in the cleanup return.

Your editor should accept:

```ts
type ArticleEditorProps = {
  content?: object | string | null
  placeholder?: string
  editable?: boolean
}
```

And expose:

```ts
onUpdate(json, html, text)
onAutoSave?(json)
```

So the parent page can save content however it wants.

Usage:

```svelte
<script lang="ts">
  import ArticleEditor from '$lib/editor/ArticleEditor.svelte'

  let bodyJson = $state<object | null>(null)
  let bodyHtml = $state('')
  let bodyText = $state('')
</script>

<ArticleEditor
  content={bodyJson}
  placeholder="Start writing..."
  onUpdate={({ json, html, text }) => {
    bodyJson = json
    bodyHtml = html
    bodyText = text
  }}
/>
```

Svelte 5 integration pattern:

```svelte
<script lang="ts">
  import { Editor } from '@tiptap/core'
  // ... extensions

  let { content, placeholder, onUpdate }: Props = $props()
  let editorEl = $state<HTMLDivElement>()

  $effect(() => {
    const editor = new Editor({
      element: editorEl!,
      extensions: [...],
      content: content,
      onUpdate: ({ editor }) => {
        onUpdate({
          json: editor.getJSON(),
          html: editor.getHTML(),
          text: editor.getText(),
        })
      },
    })

    return () => editor.destroy()
  })
</script>

<div bind:this={editorEl}></div>
```

---

# 4. Initial extensions

Use this as the first extension list:

```ts
const extensions = [
  StarterKit.configure({
    heading: {
      levels: [2, 3, 4],
    },
  }),

  Placeholder.configure({
    placeholder: 'Start writing your article...',
  }),

  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
  }),

  Image.configure({
    inline: false,
    allowBase64: false,
  }),

  Underline,

  Typography,

  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),

  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
]
```

This gives you a strong base editor.

---

# 5. Toolbar buttons

Build a clean toolbar with these buttons first:

```txt
Undo
Redo

Paragraph
H2
H3
H4

Bold
Italic
Underline
Strike

Bullet list
Ordered list
Blockquote

Align left
Align center
Align right

Link
Image
Table

Clear formatting
```

Later add:

```txt
Embed
Pull quote
Fact box
Related article
Source/citation block
```

---

# 6. Editor styling

Use project Tailwind v4 color tokens — never hardcoded hex. Token reference in `src/routes/layout.css`.

Minimum styles — use `:global()` in a `<style>` block inside `ArticleEditor.svelte`:

```css
:global(.ProseMirror) {
  min-height: 500px;
  outline: none;
}

:global(.ProseMirror p) {
  margin: 0.75rem 0;
  line-height: 1.8;
}

:global(.ProseMirror h2) {
  font-size: 1.75rem;
  font-weight: 700;
  margin-top: 2rem;
}

:global(.ProseMirror h3) {
  font-size: 1.35rem;
  font-weight: 700;
  margin-top: 1.5rem;
}

:global(.ProseMirror blockquote) {
  border-left: 4px solid currentColor;
  padding-left: 1rem;
  opacity: 0.85;
}

:global(.ProseMirror img) {
  max-width: 100%;
  border-radius: 0.75rem;
}

:global(.ProseMirror table) {
  border-collapse: collapse;
  width: 100%;
}

:global(.ProseMirror td),
:global(.ProseMirror th) {
  border: 1px solid var(--border);
  padding: 0.5rem;
}
```

For toolbar/styling on editor chrome: use Tailwind classes like `bg-surface`, `text-text-primary`,
`border-border`, `text-brand` from `$lib/utils`'s `cn()` helper.

---

# 7. Content output

The editor should expose both:

```ts
editor.getJSON()
editor.getHTML()
```

But your main source should be:

```txt
JSON
```

Example output:

```ts
const json = editor.getJSON()
const html = editor.getHTML()
```

Parent component can decide what to do with it.

---

# 8. Image handling

Start with simple URL image insert:

```txt
Click image button
Prompt/popup asks for image URL
Insert image into editor
```

Later replace with upload flow.

Initial version:

```ts
editor.chain().focus().setImage({ src: imageUrl }).run()
```

Later custom image node should support:

```txt
src
alt
caption
credit
imageId
```

But don’t start with this unless needed immediately.

---

# 9. Link handling

Simple link flow:

```txt
Select text
Click link
Enter URL
Apply link
```

Commands:

```ts
editor.chain().focus().setLink({ href: url }).run()
editor.chain().focus().unsetLink().run()
```

Add URL validation before applying.

---

# 10. Custom news blocks — detailed specs

## 10.1 figureImage (highest priority)

Normal `<img>` is not enough for news. This is the first custom node you should build.

Custom node: `figureImage`

Fields:

```ts
{
  src: string
  alt: string
  caption?: string
  credit?: string
  sourceUrl?: string
}
```

Features:

```txt
Image upload / insert by URL
Alt text
Caption
Credit / source
Image alignment
Image size
Image crop/focal point (later)
```

Example JSON shape:

```json
{
  "type": "figureImage",
  "attrs": {
    "src": "/uploads/image.webp",
    "alt": "People standing near a flooded road",
    "caption": "A flooded road after heavy rain.",
    "credit": "Photo: Staff"
  }
}
```

---

## 10.2 Source / reference block

News articles often need to cite where something came from.

Custom node: `sourceBlock`

Example use:

```txt
Source: Sindh Health Department
Source: Police statement
Source: Court documents
Source: Dawn / Reuters / AP
```

Attrs:

```ts
{
  label: string
  url?: string
  sourceName?: string
}
```

---

## 10.3 Pull quote block

Important for long-form articles.

Custom node: `pullQuote`

Example:

```txt
"This was the largest rainfall event in the area this year."
```

Attrs:

```ts
{
  text: string
  attribution?: string
}
```

---

## 10.4 Fact box / info box

For explainer-style news.

Custom node: `factBox`

Example:

```txt
Key facts:
- What happened
- Where it happened
- Who is affected
- Current status
```

Good for Pakistani local news, politics, crime, weather, business, etc.

---

## 10.5 Timeline block

Very useful for developing stories.

Custom node: `timelineBlock`

Example:

```txt
10:30 AM — Incident reported
11:15 AM — Rescue team arrived
1:00 PM — Road reopened
```

Especially useful for breaking news, court cases, elections, protests, accidents, sports, and live-event style articles.

---

## 10.6 Correction / update note

Serious news websites need this.

Custom nodes: `correctionNote`, `updateNote`

Example:

```txt
Update: This story was updated at 6:20 PM with a police statement.

Correction: An earlier version misstated the location as Gulshan-e-Iqbal. It was Gulistan-e-Johar.
```

Design for it even if not used on day one.

---

## 10.7 Related article block

For internal linking.

Custom node: `relatedArticle`

Attrs:

```ts
{
  articleId: string
  title: string
  slug: string
  excerpt?: string
}
```

In the editor, show it as a card.

---

## 10.8 Embed block

One generic custom node for all embeds.

Custom node: `embedBlock`

Providers:

```txt
YouTube
X / Twitter
Facebook
Instagram
TikTok
Reddit
Generic trusted iframe
```

Attrs:

```ts
{
  provider: string
  url: string
  embedId?: string
  caption?: string
  sourceName?: string
}
```

---

# 11. Important writing UX

## 11.1 Slash command menu

For speed:

```txt
/type
```

Then show:

```txt
Heading
Image
Embed
Quote
Pull quote
Fact box
Timeline
Source
Related article
Table
```

This makes the editor feel modern and fast.

---

## 11.2 Bubble menu

When text is selected, show:

```txt
Bold
Italic
Underline
Link
Quote
Comment (later)
```

Not required for MVP, but very nice.

---

## 11.3 Paste cleanup

This is big. Writers will paste from:

```txt
Google Docs
Microsoft Word
Websites
WhatsApp
Twitter/X
Facebook
Other news sites
```

Paste cleanup rules:

```txt
Remove weird inline styles
Remove random font sizes
Remove unwanted spans
Convert pasted URLs into embeds when possible
Convert pasted images carefully
Preserve headings/lists/links
Block script/unsafe HTML
```

This matters more than people think.

---

## 11.4 Autosave

Even without full publishing, add editor-level autosave:

```txt
Save every 5–10 seconds after changes
Show "Saved" / "Saving…" / "Unsaved changes"
Warn before leaving page with unsaved changes
```

Critical for long articles.

---

## 11.5 Local draft backup

Optional but very useful. If API save fails or browser crashes:

```txt
Save latest JSON to localStorage/IndexedDB
Recover unsaved draft on reopen
```

For writers, this is a lifesaver.

---

## 11.6 Word count and reading time

Inside editor:

```txt
Words: 820
Estimated reading time: 4 min
Characters: 4,900
```

Use Tiptap character count extension or your own text extraction.

---

## 11.7 Content warnings / checks

Before saving/publishing, show warnings like:

```txt
Missing image alt text
Image has no credit
External link has no title
Empty heading
Very long paragraph
Too many H2s/H3s messed up
Broken embed URL
Unsupported embed provider
```

Even without public rendering, these checks help keep article quality high.

---

# 12. MVP phases

## Phase 1 — Basic working editor

Build:

```txt
ArticleEditor.svelte
Toolbar
StarterKit
Placeholder
Link
Image
Typography
TextAlign
JSON output
```

Done when:

```txt
You can type article content
Use headings
Use bold/italic/underline
Add lists
Add quotes
Add links
Add images by URL
Receive updated JSON in parent component
```

---

## Phase 2 — Better writing UX

Add:

```txt
Bubble menu for selected text
Floating menu for empty paragraph
Keyboard shortcuts
Word count
Character count
Autosave callback
```

Useful UX:

```txt
Cmd+B bold
Cmd+I italic
Cmd+K add link
Markdown shortcuts
Placeholder text
```

---

## Phase 3 — Media support

Add:

```txt
Image upload button
Image preview
Alt text input
Caption input
Credit input
Custom figureImage extension
```

This is where it starts feeling like a proper news editor.

---

## Phase 4 — Advanced article blocks

Add custom blocks:

```txt
Pull quote
Fact box
Embed block (YouTube + generic)
Related article block
Correction/update note
```

Each custom block should have its own toolbar insertion button.

---

## Phase 5 — Polish

Add:

```txt
Slash command menu
Drag/drop image support
Paste image support
Paste cleanup
Better table controls
Word count
Reading time estimate
Content warnings / validation
```

---

## Phase 6 — Later polish

```txt
X/Twitter embed
Facebook/Instagram/TikTok/Reddit embeds
Timeline block
Source/reference block
Local draft recovery
Inline editor comments
Revision snapshots
```

---

# 13. Final component API

Aim for this:

```svelte
<ArticleEditor
  content={bodyJson}
  editable={true}
  placeholder="Write your article..."
  onUpdate={({ json, html, text }) => {
    bodyJson = json
    bodyHtml = html
    bodyText = text
  }}
  onAutoSave={({ json }) => {
    // Save to API / localStorage
  }}
/>
```

All props use Svelte 5 `$props()` — no `export let`.
Editor lifecycle managed via `$effect` + cleanup, not `onMount`/`onDestroy`.

The editor should not know anything about:

```txt
database
SSR
routing
publishing
SEO
article pages
SvelteKit load functions
```

Admin routes are CSR-only (`ssr=false, csr=true`) — no SSR concerns.
It should only be a clean reusable Svelte 5 editor.

---

# 14. Build priority

Do not build everything at once.

## MVP

```txt
Basic editor
Toolbar
JSON output
Links
Images
Image caption/credit
YouTube embed
Generic embedBlock
Autosave callback
Word count
```

## Then add

```txt
X/Twitter embed
Facebook/Instagram/TikTok/Reddit embeds
Pull quote
Fact box
Source block
Paste cleanup
Slash menu
```

## Later polish

```txt
Timeline block
Related article block
Correction/update note
Local draft recovery
Inline editor comments
Revision snapshots
```

---

# 15. Final recommended feature list

For a proper news-grade Tiptap OSS editor (no Pro, no Cloud):

```txt
Rich text
Headings
Lists
Quotes
Tables
Links
Images with caption/credit/alt
YouTube embeds
Social embeds
Pull quotes
Fact boxes
Timeline blocks
Source/reference blocks
Related article cards
Correction/update notes
Slash menu
Bubble menu
Paste cleanup
Autosave
Local draft backup
Word count
Content validation
JSON output
```
