# core/render

## Purpose
Canvas rendering pipeline — displays PDF pages, text blocks, images, paths, overlays, selection highlights, and cursor. Also provides hit testing.

## Files

### RenderEngine.ts
Main orchestrator implementing `IRenderEngine`.
- `bindCanvas()` — attach HTMLCanvasElement with DPR scaling
- `renderPage()` — full render pipeline (see order below). Page positioning accounts for scroll offsets (`viewport.offsetX/offsetY`) — centers page when it fits, uses `PAGE_MARGIN` offset when scrollable
- `hitTest()` — delegates to HitTester
- `getPageOffset()` — returns page position for mouse→page coord conversion, accounts for scroll offsets
- Tracks modified blocks to preserve edited text after exiting edit mode
- White overlay + canvas re-render activates when `editingBlockDirty` is true
- White overlay padding uses `max(2, fontSize * 0.12) * scale`. Used to be `max(4, fontSize) * scale`, which for a 36pt title produced a 36 px pad that covered the first line of the following paragraph. The ascent / descent of the rendered text is already inside the block bounds, so a couple of pixels of safety for anti-aliasing is all that's needed
- `markEditingBlockDirty()` — called by EditorCore on both edit mode entry and text changes to activate overlay rendering
- Hover/editing highlights: renders rounded-rect backgrounds for hovered (`TEXT_HOVER_BG_COLOR`) and editing (`TEXT_EDITING_BG_COLOR`) editable text blocks
- `setHoveredBlockId()` / `getHoveredBlockId()` — manages hover state for text block highlighting

### PdfPageRenderer.ts
Async PDF page background rendering via pdfjs-dist.
- Renders to offscreen canvases, cached by `(pageIdx, scale)`
- Non-blocking: `getPageCanvas()` returns null if not ready, fires callback when done
- pdfjs uses 1-indexed pages internally

### TextRenderer.ts
Renders text blocks glyph-by-glyph.
- **Font resolution**: `resolveFontFamily()` checks `IFontManager` for registered FontFace first, falls back to CSS heuristics via `mapFontFamily()`
- **Weight/style resolution**: `resolveFontDescriptors()` — when a FontFace is registered, uses the FontFace's own `weight` / `style` in `ctx.font` instead of the run's style values, so the browser selects that face exactly and avoids `font-synthesis` (faux bold/italic). This prevents already-bold font files from being double-bolded when the run.style.fontWeight doesn't match what pdfjs registered the FontFace with (pdfjs typically registers with `weight="normal"` regardless of the font's actual weight). Falls back to the run style when no FontFace is registered.
- Constructor accepts optional `IFontManager`; also settable via `setFontManager()`
- `RenderEngine.setFontManager()` wires the font manager from EditorCore after PDF loading
- Font mapping heuristics (fallback only): recognizes Courier, Times, Arial, Helvetica, etc.
- Pixel alignment via `alignPixel()` for sharp HiDPI rendering
- Renders overflow warning borders (OVERFLOW_BORDER_COLOR)
- Text baseline: 'alphabetic' — positions glyphs at their baseline (glyph.y + ascent) for precise alignment with pdfjs rasterization; `getGlyphAscent()` helper queries IFontManager for per-glyph ascent

### ImageRenderer.ts
Renders images with rotation support.
- Decodes binary data to HTMLImageElement, caches by ID
- Async loading — first call may not render immediately
- Rotation: translate → rotate → draw

### PathRenderer.ts
Renders SVG-style path commands (M/L/C/Z).
- Coordinates scaled by viewport scale
- Separate fill and stroke with Color → rgba conversion

### SelectionRenderer.ts
Renders selection highlights and blinking cursor.
- Selection: solid color rectangles over selected glyphs, grouped by line
- `collectGlyphs()` accounts for `\n` between paragraphs and `\n` within runs (inter-line breaks) by inserting undefined placeholders, so selection offsets match `getTextContent()` offset space
- Cursor: 2px vertical line with blink timer (CURSOR_BLINK_INTERVAL_MS)

### HitTester.ts
Spatial indexing for click detection.
- `buildHitMap()` — indexes all elements (rebuilt each render)
- Hit test order (front-to-back): overlays → text → images → paths
- Text: binary search on Y-sorted lines, linear search on glyphs within line
- `indexTextBlock()` accounts for `\n` between paragraphs and `\n` within runs (inter-line breaks) in `globalCharOffset` so returned offsets match `getTextContent()` offset space
- Returns HitTestResult with element and glyph location

### OverlayManager.ts
Renders and manages overlay elements (drawings, shapes, textboxes).
- 8-point resize handles, drag/resize interaction state machines
- Minimum overlay size: 20px
- Cursor style changes based on hover state

### index.ts
Barrel exports.

## Rendering Pipeline Order
1. Clear canvas (gray background)
2. Draw page shadow
3. Render PDF background (async, from PdfPageRenderer cache)
4. Translate to page coordinate space
5. Render edited text blocks (white overlay + TextRenderer)
6. Render overlays (OverlayManager)
7. Render selection highlight
8. Render cursor

## Coordinate Systems
- **Canvas**: raw pixels, DPR-adjusted
- **Page**: logical PDF space (0,0)→(width,height), top-left origin
- **Screen**: CSS pixels from mouse events
- Page→Canvas: `coord * scale`, Canvas→Page: `coord / scale`

## Dependencies
- `types/document` — PageModel, TextBlock, ImageElement, PathElement, OverlayElement
- `types/ui` — Viewport, HitTestResult, CursorPosition, SelectionRange
- `config/constants` — SELECTION_COLOR, CURSOR_COLOR, CURSOR_BLINK_INTERVAL_MS, OVERFLOW_BORDER_COLOR, PAGE_MARGIN
- `interfaces/IRenderEngine`, `interfaces/IFontManager`
- `pdfjs-dist` (PdfPageRenderer only)

## Developer Notes
- Always use `ctx.save()/restore()` around canvas modifications
- HitMap is rebuilt every render — don't cache externally
- DPR handling is essential — removing it causes blurry rendering on HiDPI
- Hit test binary search depends on Y-sorting — don't break it
- PDF pages render asynchronously — handle null returns gracefully
