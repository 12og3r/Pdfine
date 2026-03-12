# core/font

## Purpose
Font management subsystem — extraction from PDFs, registration, metrics calculation, text measurement, and fallback strategy.

## Files

### FontManager.ts
Central manager implementing `IFontManager`.
- `extractAndRegister(pdfDoc)` — orchestrates extraction → registration → metrics parsing
- `measureText/measureChar()` — text measurement via OffscreenCanvas (cached)
- `getAscent(fontId, fontSize)` — font ascent in CSS pixels; uses opentype.js metrics when available, falls back to Canvas `TextMetrics.fontBoundingBoxAscent`, then `fontSize * 0.8`
- `hasGlyph(fontId, char)` — checks glyph existence via width > 0
- `getFallbackFont(fontId, char)` — finds substitute font
- Three caches: char widths, text measurements, metrics
- Registers fonts with browser's FontFace API

### FontExtractor.ts
Extracts font data from PDF documents via pdf.js APIs.
- **pdfjs v5+**: Finds font names from operator list (OPS.setFont), then uses `commonObjs.get(fontName)`
- **Legacy pdfjs**: Falls back to `commonObjs._objs` Map enumeration
- Detects fonts already registered by pdfjs in `document.fonts` (sets `fontFace` on `RegisteredFont`)
- Bold/italic detection: from pdfjs data flags, with fallback to font name analysis
- Detects format: TrueType, OpenType, Type1, CIDFont
- Fonts with registered FontFace are marked `editable: true` even without raw data
- Cleans font names: strips subset prefixes and style suffixes
- Converts Uint8Array to ArrayBuffer (prevents SharedArrayBuffer issues)

### FontMetrics.ts
Parses font metrics using opentype.js (lazy-loaded).
- `FontMetricsParser` class with caching
- Extracts: unitsPerEm, ascender, descender, lineGap, xHeight, capHeight
- Default fallback: 1000 unitsPerEm, 800 ascender, -200 descender
- xHeight/capHeight calculated from ascender if not in font tables

### FontFallback.ts
4-level hierarchical fallback strategy.
1. Original font (if FontFace loaded)
2. Same font family variant from registry
3. Category substitute (serif → Georgia/Times; mono → Courier; sans → Arial/Helvetica)
4. Generic 'sans-serif' as last resort

Category detected by font name keywords (mono, times, georgia, serif).

## Dependencies
- `opentype.js` — lazy-loaded for metrics parsing
- Browser APIs: FontFace, document.fonts, OffscreenCanvas
- `pdf.js` internals via pdfDoc parameter
- `infra/Logger`, `types/font`, `types/document`, `interfaces/IFontManager`

## Developer Notes
- pdfjs v5 uses `PDFObjects` with `get()/has()` methods (no `_objs` Map) — font names come from operator list
- pdfjs v5 auto-registers fonts with browser FontFace API under `loadedName`
- Fonts with pdfjs-registered FontFace are editable even without raw binary data
- Call `destroy()` on teardown — clears caches and unregisters FontFaces
- `hasGlyph()` uses measurement proxy (width > 0), not 100% accurate for all fonts
- Canvas-based measurement may differ slightly from actual PDF rendering
