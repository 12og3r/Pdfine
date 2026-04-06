# core/parser

## Purpose
PDF parsing engine — extracts structured content (text, images, vector paths) from PDF files using pdfjs-dist and converts to DocumentModel.

## Files

### PdfParser.ts
Main orchestrator implementing `IPdfParser`.
- `parse(data, password?)` — loads PDF, processes all pages, returns DocumentModel
- Coordinates TextBlockBuilder, ImageExtractor, PathExtractor
- Converts PDF coordinates (bottom-left origin) to layout coordinates (top-left origin)
- Stores pdfDoc reference in DocumentModel for later font extraction
- Passes total PDF item width as `pdfItemWidth` on `RawTextItem` (proportional per-char widths are computed at layout time)

### TextBlockBuilder.ts
Groups raw text items into logical blocks, paragraphs, and runs.
- **Pipeline**: Sort → Lines → Columns → Paragraphs → Runs (with style merging)
- Same-line detection: Y-distance < `refFontSize * SAME_LINE_Y_THRESHOLD`
- Column detection: X-gap > `avgCharWidth * 8`
- Paragraph break: Y-gap >= `prevFontSize * LINE_SPACING_THRESHOLD`
- Inter-item spacing: gap > `fontSize * 0.15` inserts space
- Merges consecutive runs with identical styles
- Font weight/style inferred from font name ("bold", "italic", "oblique")
- Accumulates `pdfItemWidth` from `RawTextItem` into `TextRun.pdfRunWidth` (total run width); uses `item.width` as fallback when `pdfItemWidth` is unavailable on a merged item
- Inter-line join uses `\n` (not space) to preserve original PDF line breaks; `\n` has zero width so no pdfRunWidth adjustment is needed; the GreedyLineBreaker treats `\n` as hard breaks
- Tracks per-line PDF widths (`TextRun.pdfLineWidths`) for multi-line runs: when `\n` is inserted between lines, the accumulated pdfRunWidth for that line segment is snapshotted into `pdfLineWidths`, enabling per-segment proportional width scaling in ParagraphLayout (prevents cross-line width contamination)
- Computes `pdfLineHeight` (average baseline-to-baseline distance) per paragraph from raw PDF line Y positions; stored on `Paragraph.pdfLineHeight` so the layout engine can reproduce the PDF's native line spacing instead of using `DEFAULT_LINE_SPACING`

### ImageExtractor.ts
Extracts embedded images from PDF operator list.
- Handles OPS 85 (paintImageXObject) and 82 (paintJpegXObject)
- Detects JPEG vs PNG by operator type
- Image bounds are placeholder (0,0) — CTM transform not implemented
- Gracefully handles missing image data

### PathExtractor.ts
Extracts vector graphics from PDF operator list.
- State machine tracking fill/stroke colors and line width
- Path commands: MOVETO(13)→M, LINETO(14)→L, CURVETO(15)→C, RECT(19)→M+L+Z, CLOSE(44)→Z
- Computes bounding boxes including control points
- Y-coordinate conversion: `y = pageHeight - pdfY`

## Dependencies
- `pdfjs-dist` — PDF parsing library
- `model/DocumentModel` — factory functions
- `config/constants` — LINE_SPACING_THRESHOLD, SAME_LINE_Y_THRESHOLD
- `config/defaults` — DEFAULT_LINE_SPACING
- `infra/Logger`

## Developer Notes
- Coordinate conversion (Y-flip) happens in multiple places — be careful with changes
- Text aggregation thresholds directly affect parsing quality
- All extractors use try-catch at page level — individual failures don't crash the whole page
- Font properties are heuristic (name-based); full registration happens downstream
- Image bounds don't reflect actual transform matrix — known limitation
