# core/export

## Purpose
PDF export pipeline — validates documents, embeds fonts, and redraws edited text blocks onto the original PDF using a white overlay strategy.

## Files

### ExportModule.ts
Main orchestrator implementing `IExportModule`.
- `validate(model, fontManager, modifiedBlockIds?)` — pre-export validation
- `export(originalPdf, model, fontManager, onProgress?, modifiedBlockIds?)` — full export
- Only processes pages containing modified blocks or with dirty flag
- Progress callback: `completed / totalSteps`

### ExportValidator.ts
Pre-export validation.
- Detects overflowing text blocks (`overflowState.status === 'overflowing'`)
- Checks glyph availability via `fontManager.hasGlyph()`
- Reports missing glyphs with fallback font suggestions
- `canExport` is always true (warnings don't block export)

### FontEmbedder.ts
Embeds fonts into PDF via pdf-lib.
- Collects unique fontIds from modified text blocks
- `pdfDoc.embedFont(fontData, { subset: false })` — full font embedding
- Falls back to `StandardFonts.Helvetica` if font data unavailable
- Caches embedded PDFFont objects to avoid redundant embedding
- **Cache is scoped per PDFDocument.** Each `export()` call loads a fresh `PDFDocument` and `PDFFont` objects are bound to the doc that embedded them — reusing a cached `PDFFont` across documents leaves pdf-lib emitting a `/Font` entry whose indirect ref points at the previous document's object graph (`BaseFont undefined`). pdfjs is lenient and falls back to a default font; strict PDF viewers (Preview.app, Acrobat, iOS Quick Look) can't resolve it and render the whole overlay-drawn paragraph as blank. `resetCacheIfDocChanged(pdfDoc)` clears the cache whenever the incoming `pdfDoc` differs from the one the cache was built for.

### OverlayRedrawStrategy.ts
Redraws edited text using white rectangle overlay.
- Draws white rect (with 2px padding) over original text bounds
- **Per-run redraw**: groups consecutive same-style glyphs within each line and emits ONE `page.drawText(runText, ...)` call per group, anchored at the first glyph's (x, baseline). The old per-glyph path positioned each character at its Canvas-measured layout x, which produced visible gaps when `FontEmbedder` fell back to `StandardFonts.Helvetica` (pdfjs v5 often registers a font via FontFace but doesn't expose raw binary — `getFontData()` returns undefined, so we embed Helvetica). Helvetica's advance widths don't match the original font's Canvas widths, so per-glyph placement made the title render as "Sem p l e PDF" after an edit. Letting pdf-lib advance through the run with the embedded font's own width table keeps spacing internally consistent regardless of fallback.
- A run breaks on any change in `fontId`, `fontSize`, or color (`r`/`g`/`b`), or when the fontId has no embedded font (that glyph is dropped and a new run starts after it). Spaces stay inside the run so pdf-lib's own space-width contributes to advance.
- **`\n` glyphs are skipped** — the parser's inter-line-join marker has zero layout width but `pdf-lib`'s `drawText` interprets a literal `\n` as a forced newline inside the run, which would emit spurious line breaks in the exported PDF. `ParagraphLayout.flattenRuns` normally converts `\n` → space upstream, but this skip is kept as defense-in-depth in case a glyph slips through with its original `\n` character.
- Coordinates transformed from layout (Y-down) to PDF (Y-up) via CoordinateTransformer
- **Color normalization**: `Color` stores channels as 0-255 ints (from the pdfjs operator-list parser), but `pdf-lib`'s `rgb()` expects 0-1. `redrawText` divides by 255 and clamps to `[0, 1]` before calling `rgb()`. Without this, any non-black run aborts the export with `assertRange` — first surfaced after the color-extraction fix (commit 21829f8) made blue/red titles exportable

## Export Pipeline
```
1. Load PDF into PDFDocument (pdf-lib)
2. FontEmbedder.embedAllUsedFonts() → Map<fontId, PDFFont>
3. Identify pages to export (modified blocks or dirty pages)
4. For each modified text block:
   → drawWhiteOverlay() to hide original
   → redrawText() with new content
5. Save PDF → Uint8Array
```

## Dependencies
- `pdf-lib` — PDFDocument, PDFFont, PDFPage, rgb, StandardFonts
- `types/document` — DocumentModel, TextBlock, ExportValidation
- `interfaces/IFontManager`, `interfaces/IExportModule`
- `infra/CoordinateTransformer` — layout ↔ PDF coordinate conversion

## Developer Notes
- Y-axis flip is critical: `py = pageHeight - layoutY`
- `modifiedBlockIds` Set optimizes all stages (validation, embedding, redrawing)
- White overlay won't work on colored/patterned PDF backgrounds
- Per-run drawing (current): pdf-lib handles intra-run advance using the embedded font's width table, so run widths may drift from the Canvas-measured layout widths when the embedded font is a fallback — acceptable trade-off vs the visible inter-glyph gaps of the old per-glyph path. No ligatures / complex text shaping.
- Font embedding uses `subset: false` (full font, not just used glyphs)
