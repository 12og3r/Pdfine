import { rgb } from 'pdf-lib'
import type { PDFFont, PDFPage } from 'pdf-lib'
import type { PositionedGlyph, TextBlock, TextStyle } from '../../types/document'
import { CoordinateTransformer } from '../infra/CoordinateTransformer'

const OVERLAY_PADDING = 2;

export class OverlayRedrawStrategy {
  applyBlock(
    page: PDFPage,
    block: TextBlock,
    pageHeight: number,
    embeddedFonts: Map<string, PDFFont>
  ): void {
    this.drawWhiteOverlay(page, block, pageHeight);
    this.redrawText(page, block, pageHeight, embeddedFonts);
  }

  private drawWhiteOverlay(
    page: PDFPage,
    block: TextBlock,
    pageHeight: number
  ): void {
    const bounds = block.originalBounds;
    const transformer = new CoordinateTransformer(undefined, pageHeight);

    const { py } = transformer.layoutToPdf(
      bounds.x,
      bounds.y + bounds.height
    );

    page.drawRectangle({
      x: bounds.x - OVERLAY_PADDING,
      y: py - OVERLAY_PADDING,
      width: bounds.width + OVERLAY_PADDING * 2,
      height: bounds.height + OVERLAY_PADDING * 2,
      color: rgb(1, 1, 1),
    });
  }

  /**
   * Redraw edited text by grouping consecutive same-style glyphs within each
   * line and emitting a single `drawText(runText, ...)` call per group.
   *
   * Per-glyph drawing (the old strategy) is fragile when FontEmbedder falls
   * back to StandardFonts.Helvetica (e.g. pdfjs v5 registered the font via
   * FontFace for on-screen rendering but never exposed raw binary to us).
   * Layout glyph x-positions were computed from Canvas widths of the ORIGINAL
   * font, so drawing each character individually at those positions produces
   * visible gaps — exported titles looked like "Sem p l e PDF" when the real
   * text was "Semple PDF". Letting pdf-lib advance through an entire run with
   * the embedded font's own width table keeps spacing internally consistent,
   * even if the fallback font is slightly narrower or wider than the original.
   */
  private redrawText(
    page: PDFPage,
    block: TextBlock,
    pageHeight: number,
    embeddedFonts: Map<string, PDFFont>
  ): void {
    const transformer = new CoordinateTransformer(undefined, pageHeight);

    for (const para of block.paragraphs) {
      if (!para.lines) continue;

      for (const line of para.lines) {
        const baselineY = block.bounds.y + line.baseline;

        let runGlyphs: PositionedGlyph[] = [];
        let runFont: PDFFont | undefined;

        const flushRun = () => {
          if (runGlyphs.length === 0 || !runFont) {
            runGlyphs = [];
            runFont = undefined;
            return;
          }
          const first = runGlyphs[0];
          const layoutX = block.bounds.x + first.x;
          const { px, py } = transformer.layoutToPdf(layoutX, baselineY);

          // Color: our `Color` is 0-255 ints (from the pdfjs operator list);
          // pdf-lib's `rgb()` needs 0-1 and asserts range. Clamp defensively.
          const { r, g, b } = first.style.color;
          const toUnit = (v: number) => Math.min(1, Math.max(0, v / 255));

          const runText = runGlyphs.map(g => g.char).join('');

          page.drawText(runText, {
            x: px,
            y: py,
            size: first.style.fontSize,
            font: runFont,
            color: rgb(toUnit(r), toUnit(g), toUnit(b)),
          });

          runGlyphs = [];
          runFont = undefined;
        };

        for (const glyph of line.glyphs) {
          // Skip the parser's inter-line-join marker. It has zero layout width
          // (no effect on x-advance) but pdf-lib's `drawText` interprets '\n'
          // as a forced newline — so passing it through creates spurious line
          // breaks inside a single-line run in the exported PDF.
          if (glyph.char === '\n') continue;

          const font = embeddedFonts.get(glyph.style.fontId);
          if (!font) {
            // Missing font -> flush whatever we had and skip this glyph.
            flushRun();
            continue;
          }
          if (runGlyphs.length === 0) {
            runGlyphs.push(glyph);
            runFont = font;
            continue;
          }
          const prev = runGlyphs[runGlyphs.length - 1];
          if (font === runFont && sameStyle(prev.style, glyph.style)) {
            runGlyphs.push(glyph);
          } else {
            flushRun();
            runGlyphs.push(glyph);
            runFont = font;
          }
        }
        flushRun();
      }
    }
  }
}

function sameStyle(a: TextStyle, b: TextStyle): boolean {
  return (
    a.fontId === b.fontId &&
    a.fontSize === b.fontSize &&
    a.color.r === b.color.r &&
    a.color.g === b.color.g &&
    a.color.b === b.color.b
  );
}
