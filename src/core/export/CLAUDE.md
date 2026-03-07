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

### OverlayRedrawStrategy.ts
Redraws edited text using white rectangle overlay.
- Draws white rect (with 2px padding) over original text bounds
- Redraws glyphs character-by-character with correct font/size/color
- Skips space characters
- Coordinates transformed from layout (Y-down) to PDF (Y-up) via CoordinateTransformer

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
- Individual glyph rendering means no ligatures or complex text shaping
- Font embedding uses `subset: false` (full font, not just used glyphs)
