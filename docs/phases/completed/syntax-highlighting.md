# Syntax Highlighting for Code Blocks

## Status: Complete

## Implementation

### Library Choice: highlight.js (over Shiki)

- **Shiki rejected** because it generates inline `style` attributes which DOMPurify strips (FORBID_ATTR includes `style`)
- **Shiki also requires WASM** which is problematic on Cloudflare Workers
- **highlight.js chosen**: uses CSS class-based tokens (`hljs-keyword`, `hljs-string`, etc.) that survive DOMPurify sanitization

### Files Modified

1. **`src/lib/markdown.ts`** — Core rendering pipeline
   - Added `highlight.js` import
   - Added `escapeHtml()` and `unescapeHtml()` helpers
   - Added `highlightCodeBlocks()` function using regex to find `<pre><code>` blocks
   - Pipeline: micromark → highlightCodeBlocks → sanitizeHtml
   - Language auto-detection when no language specified
   - Preserves language class on output (`language-js hljs`)

2. **`src/routes/(admin)/admin/blog/[id]/preview/+page.svelte`** — Admin preview
   - Added `sanitizeWithHighlight()` function combining `highlightCodeBlocks` + `sanitizeHtml`
   - Applied to both TipTap raw HTML and `contentHtml` passthrough

3. **`src/routes/layout.css`** — Theme
   - Added `@import 'highlight.js/styles/github-dark-dimmed.css'` for dark theme

### Test Coverage

- **`tests/unit/syntax-highlighting.test.ts`** — 8 tests for highlighting + 3 for escapeHtml + 3 for highlightCodeBlocks
- **`tests/unit/markdown.test.ts`** — Updated to expect `hljs` class on code blocks
- **`tests/unit/input-sanitization.test.ts`** — Updated to check `sanitizeWithHighlight()` usage

### Quality Gates

- 703 tests pass (0 failures)
- 0 lint errors
- Format check passes
- Type check passes (pre-existing errors only)

### Browser Verification

Tested via Playwright on `http://localhost:5173/blog/code-test` with JS, Python, and Bash code blocks. Vision analysis confirmed:

- Keywords (orange): `function`, `const`, `return`, `def`, `if`, `for`
- Strings (light blue): quoted strings
- Function names (purple): `greet`, `fibonacci`
- Variables (white): `message`, `name`, `fib`
