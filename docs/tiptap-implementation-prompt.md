Implement docs/tiptap-plan.md phase by phase, following the plan's build priority (MVP → Then add → Later polish).

Environment:

- SvelteKit 2, Svelte 5 runes mode (enforced via svelte.config.js)
- Admin routes are CSR-only SPA (ssr=false, csr=true) — no SSR concerns
- Package manager: Bun
- Tests: vitest in tests/unit/ (config in vite.config.ts, globals: true)
- E2E: existing Playwright setup at tests/e2e/ + agent-browser skill for manual verification
- Styling: Tailwind v4 with project color tokens from src/routes/layout.css — never hardcoded hex
- Icons: @lucide/svelte already installed
- Components: shadcn-svelte (Button, Input, Label, Card, Separator available)
- cn() from $lib/utils for conditional classes
- Code style: single quotes, no semicolons, 2-space tabs, oxlint/oxfmt

For each phase:

1. Build files per docs/tiptap-plan.md sections 2–11 (extensions, nodeviews, utils, Svelte components)

2. Write vitest unit tests in tests/unit/editor/ following existing project patterns:
   - Import describe, it, expect from vitest
   - Use $lib import alias
   - Use describe(functionRef, ...) convention with function reference as description
   - For component tests: jsdom environment, mount with constructor or testing-library

3. Run: bun run lint && bun run check && bun run test
   Fix all failures before moving on.

4. Create a dev test page at src/routes/(admin)/admin/editor-test/+page.svelte
   - Inherits ssr=false, csr=true from admin group layout
   - Mounts ArticleEditor with all toolbar buttons and custom blocks loaded

5. Start dev server (bun run dev) and use the agent-browser skill to run e2e tests:
   - Navigate to /admin/editor-test
   - Type content, click each toolbar button, verify ProseMirror DOM reflects correct formatting
   - Test slash menu (/ trigger), bubble menu (text selection)
   - Paste from external sources, verify paste cleanup strips unwanted styles
   - Insert each custom node, verify it renders in-editor and survives JSON roundtrip
   - Take screenshots after each verification step for manual review

6. Do NOT proceed to the next phase until both unit and e2e tests pass.

Svelte 5 Tiptap integration:
No @tiptap/svelte — use @tiptap/core Editor class directly. Mount and destroy via $effect:

$effect(() => {
const editor = new Editor({ element: el, extensions, content, onUpdate })
return () => editor.destroy()
})

Constraints:

- No @tiptap-pro/\*, no Tiptap Cloud, no Collaborator
- No Svelte 4 patterns (export let, $:, on: directives) — Svelte 5 runes only
- No hardcoded colors — use project token Tailwind classes only
- Editor must stay 100% OSS and reusable
