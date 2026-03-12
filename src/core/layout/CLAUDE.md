# core/layout

## Purpose
Text layout pipeline — transforms styled text into positioned glyphs via line breaking, glyph positioning, and overflow handling.

## Files

### LayoutEngine.ts
Orchestrator implementing `ILayoutEngine`.
- `setStrategy('greedy' | 'knuth-plass')` — switch line breaking algorithm
- `reflowTextBlock(block, fontManager, options?)` — layout single block. When `options.autoGrow` is true: single-line blocks (originalBounds.height < fontSize * 1.8) use `Infinity` as maxWidth to grow horizontally; multi-line blocks keep original width and grow vertically. Otherwise runs two-pass: layout then overflow check.
- `reflowPage(page, fontManager)` — layout all text elements on a page

### ParagraphLayout.ts
Handles individual paragraph layout.
- `flattenRuns(paragraph, fontManager)` → CharInfo[] (flat character array with styles and optional `pdfWidth`); computes proportional per-char widths from `pdfRunWidth` using `computeProportionalWidths()`, then **stores them back** on `run.pdfCharWidths` and clears `run.pdfRunWidth` so subsequent layouts (after text insertion) preserve original character widths
- `layoutParagraph(paragraph, maxWidth, fontManager, lineBreaker, startY)` → LayoutLine[]
- `positionGlyphs()` — handles alignment: left, center, right, justify; uses per-char baseline from TextMeasurer for accurate Y positioning
- Justify distributes extra space across word gaps (spaces only)
- Trims trailing spaces for width calculation

### GreedyLineBreaker.ts
Fast O(n) first-fit line breaking.
- Breaks at: word boundaries (spaces), hyphens, between CJK characters
- CJK punctuation rules: NO_LINE_START / NO_LINE_END sets
- Emergency breaks when no opportunity exists before exceeding width
- Best for: real-time editing (default)

### KnuthPlassLineBreaker.ts
Optimal O(n²) dynamic programming line breaking.
- Models text as boxes (chars), glue (spaces with stretch/shrink), penalties (break points)
- Minimizes total badness (cubic penalty for width deviation)
- Fitness classes: tight, normal, loose, very loose
- Best for: export (higher typography quality)

### TextMeasurer.ts
Text measurement utilities.
- `measureChar(char, fontId, fontSize, fontManager, letterSpacing, pdfWidth?)` — character width; returns 0 for `\n`; uses `pdfWidth` when available (from PDF glyph tables), falls back to canvas measurement via fontManager
- `measureRun(run, fontManager)` — uses `run.pdfCharWidths` per character when available
- `getLineHeight(fontSize, lineSpacing, fontId, fontManager)` — using font metrics
- `getBaseline()` — baseline distance from line top; delegates to `fontManager.getAscent()` for consistent ascent calculation
- All measurements scale with fontSize; lineSpacing is a multiplier

### OverflowHandler.ts
Overflow detection and auto-shrinking.
- **Normal**: content fits → status 'normal'
- **Tolerance**: overflow ≤ 15% → status 'within_tolerance' (acceptable)
- **Auto-shrink** (priority order):
  1. Line spacing: -0.05/step, min 1.0
  2. Letter spacing: up to -0.05 total
  3. Font size: -1pt/step, max -3pt total
- **Overflowing**: all attempts failed → status 'overflowing'

### index.ts
Barrel exports: LayoutEngine, GreedyLineBreaker, KnuthPlassLineBreaker, TextMeasurer, ParagraphLayout, OverflowHandler, CharInfo, LineBreaker.

## Pipeline
```
1. Flatten: Paragraph.runs → CharInfo[] (chars with styles + optional pdfWidth; proportional scaling from pdfRunWidth happens here)
2. Line Break: CharInfo[] → number[] (break indices)
3. Position: CharInfo[] + breaks → PositionedGlyph[] (x,y coords)
4. Overflow: Check height → auto-shrink if needed → re-run 1-3
```

## Dependencies
- `types/document` — TextBlock, Paragraph, LayoutLine, PositionedGlyph, TextStyle
- `interfaces/IFontManager` — font measurement
- `interfaces/ILayoutEngine` — interface contract
- `config/constants` — OVERFLOW_TOLERANCE_PERCENT, MIN_LINE_SPACING, etc.

## Developer Notes
- Line break positions are indices in the flattened CharInfo array — watch for off-by-one
- OverflowHandler re-layouts entire block on shrink — avoid repeated cycles
- Font must be loaded before layout (measurements depend on IFontManager)
- Greedy has explicit CJK support; Knuth-Plass handles CJK via general glue/penalty model
- Empty paragraphs create a single empty line with proper height/baseline
