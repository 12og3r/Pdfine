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
- Checks glyph availability via `fontManager.hasGlyph()` for non-curated fonts.
- **Skips the glyph check for curated std/fallback fonts** (Helvetica, Times Roman, Courier, Arial, Georgia, Comic Sans MS, Inter, Open Sans). They all route through pdf-lib StandardFonts at export — which cover the full WinAnsi character set — but `hasGlyph()` returns false for them because no FontFace is registered against those IDs. Without the skip, picking e.g. Open Sans would raise a misleading "6 character(s) missing" warning even though the exported PDF would render every ASCII character correctly.
- Reports remaining missing glyphs with fallback font suggestions.
- `canExport` is always true (warnings don't block export).

### FontEmbedder.ts
Embeds fonts into PDF via pdf-lib.
- `embedForStyle(pdfDoc, style, fontManager)` is the primary entrypoint; `embedFont(fontId)` is a thin shim kept for callers that only know the fontId.
- Cache key is `fontEmbedKey(fontId, bold, italic)` from `core/font/StandardFonts.ts`:
  - curated standard fonts (std-helvetica / std-times-roman / std-courier) include the weight/italic axis so `StandardFonts.HelveticaBold`, `StandardFonts.TimesRomanItalic`, etc. can be picked per run — making Bold/Italic toggles survive the export.
  - other fonts collapse to bare fontId (one PDFFont per fontId — whatever we embedded from raw data, or the Helvetica fallback). That matches the pre-existing behavior.
- `embedAllUsedFonts` walks every run in modified blocks, deduplicates by composite key, and embeds each needed variant.
- Falls back to `StandardFonts.Helvetica` if font data is unavailable for a non-standard font.
- **Cache is scoped per PDFDocument.** Each `export()` call loads a fresh `PDFDocument` and `PDFFont` objects are bound to the doc that embedded them — reusing a cached `PDFFont` across documents leaves pdf-lib emitting a `/Font` entry whose indirect ref points at the previous document's object graph (`BaseFont undefined`). pdfjs is lenient and falls back to a default font; strict PDF viewers (Preview.app, Acrobat, iOS Quick Look) can't resolve it and render the whole overlay-drawn paragraph as blank. `resetCacheIfDocChanged(pdfDoc)` clears the cache whenever the incoming `pdfDoc` differs from the one the cache was built for.

### OverlayRedrawStrategy.ts
Redraws edited text using white rectangle overlay.
- Draws white rect (with 2px padding) over original text bounds
- **Per-run redraw**: groups consecutive same-style glyphs within each line and emits ONE `page.drawText(runText, ...)` call per group. The FIRST run on a line anchors to its first glyph's Canvas x; SUBSEQUENT runs on the same line anchor to the previous run's actual drawn width (`runFont.widthOfTextAtSize(runText, fontSize)` when available, else `lastGlyph.x + lastGlyph.width - firstGlyph.x`). Without this sequential positioning, applying a partial-range style change (e.g. recolouring just the middle of a line) anchored each resulting run at its own Canvas x — but pdf-lib advances internally by the embedded font's width table, so a run drawn with Helvetica fallback ended BEFORE the next Canvas-anchored run began, leaving a visible white gap in front of the recoloured segment.
- Each run looks its PDFFont up via `fontEmbedKey(style.fontId, bold, italic)` so curated std fonts pick the right Helvetica / TimesRoman / Courier variant; legacy callers that populate the map by bare fontId still resolve via a `?? embeddedFonts.get(fontId)` fallback. The old per-glyph path positioned each character at its Canvas-measured layout x, which produced visible gaps when `FontEmbedder` fell back to `StandardFonts.Helvetica` (pdfjs v5 often registers a font via FontFace but doesn't expose raw binary — `getFontData()` returns undefined, so we embed Helvetica). Helvetica's advance widths don't match the original font's Canvas widths, so per-glyph placement made the title render as "Sem p l e PDF" after an edit. Letting pdf-lib advance through the run with the embedded font's own width table keeps spacing internally consistent regardless of fallback.
- A run breaks on any change in `fontId`, `fontSize`, or color (`r`/`g`/`b`), or when the fontId has no embedded font (that glyph is dropped and a new run starts after it). Spaces stay inside the run so pdf-lib's own space-width contributes to advance.
- **`\n` glyphs are skipped** — the parser's inter-line-join marker has zero layout width but `pdf-lib`'s `drawText` interprets a literal `\n` as a forced newline inside the run, which would emit spurious line breaks in the exported PDF. `ParagraphLayout.flattenRuns` normally converts `\n` → space upstream, but this skip is kept as defense-in-depth in case a glyph slips through with its original `\n` character.
- Coordinates transformed from layout (Y-down) to PDF (Y-up) via CoordinateTransformer
- **Color normalization**: `Color` stores channels as 0-255 ints (from the pdfjs operator-list parser), but `pdf-lib`'s `rgb()` expects 0-1. `redrawText` divides by 255 and clamps to `[0, 1]` before calling `rgb()`. Without this, any non-black run aborts the export with `assertRange` — first surfaced after the color-extraction fix (commit 21829f8) made blue/red titles exportable

## Export Pipeline
```
1. Load PDF into PDFDocument (@cantoo/pdf-lib)
2. FontEmbedder.embedAllUsedFonts() → Map<compositeKey, PDFFont>
3. Identify pages to export (modified blocks or dirty pages)
4. For each modified text block:
   → drawWhiteOverlay() to hide original
   → redrawText() with new content
5. If options.password is set → pdfDoc.encrypt({ userPassword, ownerPassword })
6. Save PDF → Uint8Array
```

## Encryption
- Uses `@cantoo/pdf-lib`'s `PDFDocument.encrypt(options)` (called before `save()`) which installs a standards-compliant `/Encrypt` dictionary and encrypts strings/streams on save.
- `ExportOptions.password` is threaded through `IEditorCore.exportPdf` → `IExportModule.export`. Omitted or empty string → no encryption (backwards compatible).
- We hand the same secret to both `userPassword` and `ownerPassword`. Per-permission owner control (allow printing / disallow copy etc.) can be added later by exposing `permissions` in the UI.
- Smoke test lives in `__tests__/integration/export-encryption.test.ts` — sanity-checks that the `/Encrypt` dictionary is present in the saved bytes when `encrypt()` is called, and absent otherwise. Catches regressions if the fork's encrypt API shape changes.

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
