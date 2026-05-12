# Drag-and-Drop Image Reordering for Inline Images

## Status: Complete

## Implementation

### Approach: HTML5 Drag and Drop with ProseMirror Plugin

Since `figureImage` is an `atom: true` block node with `contenteditable="false"`, ProseMirror's native drag handling cannot be initiated from inside the figure element. The solution uses the HTML5 Drag and Drop API on a custom drag handle with a custom MIME type.

### Files Modified

1. **`src/lib/editor/extensions/image-reorder.ts`** — New TipTap extension
   - ProseMirror plugin with `handleDrop` and `handleDOMEvents` (dragover, dragleave)
   - Custom MIME type `application/x-figure-image-pos` identifies figureImage drags
   - `handleDrop`: reads source position from dataTransfer, calculates drop position via `view.posAtCoords`, executes delete+insert transform with proper position mapping
   - `insertDropLine()`: visual 3px brand-colored line between blocks based on cursor Y position
   - `removeIndicators()`: cleans up drop line elements

2. **`src/lib/editor/extensions/figure-image.svelte.ts`** — Modified
   - Added `getNodePos: () => getPos()` prop to pass position getter to Svelte node view

3. **`src/lib/editor/nodeviews/figure-image-view.svelte`** — Modified
   - Added drag handle (grip dots SVG icon) visible on hover via Tailwind group
   - Handle positioned `absolute -left-8` with `draggable="true"`
   - `handleDragStart()` sets DRAG_MIME data with node position

4. **`src/lib/editor/article-editor.svelte`** — Modified
   - Registered `ImageReorder` extension in editor
   - Added CSS for `.figure-image-nodeview` positioning (`padding-left: 2rem`)

### Test Coverage

- **`tests/unit/editor/image-reorder.test.ts`** — 6 tests for extension exports, configuration, type
- **`tests/e2e/image-reorder.spec.ts`** — 4 E2E tests:
  - Drag handle visibility on figure images
  - Drag handle appears on hover
  - Drop line indicator appears during dragover
  - Drop line removed on dragleave

### Browser Verification

Tested via Playwright on `http://localhost:5173/admin/blog/drag-test-post/edit` with 3 figureImage nodes. Vision analysis confirmed:

- Drag handle (2x3 white dots grid) visible on left side of images on hover
- Drop line indicator (3px brand-colored line) appears between blocks during dragover
- Images render correctly with captions and credits
- Drop line removed cleanly on dragleave

### Quality Gates

- 709 tests pass (0 failures)
- 0 new lint errors (2 pre-existing)
- Format check passes
