import { rgb } from 'pdf-lib'
import type { PDFFont, PDFPage } from 'pdf-lib'
import type { TextBlock } from '../../types/document'
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
        for (const glyph of line.glyphs) {
          if (glyph.char === ' ') continue;

          const font = embeddedFonts.get(glyph.style.fontId);
          if (!font) continue;

          const layoutX = block.bounds.x + glyph.x;
          const layoutY = block.bounds.y + line.baseline;

          const { px, py } = transformer.layoutToPdf(layoutX, layoutY);

          const { r, g, b } = glyph.style.color;

          page.drawText(glyph.char, {
            x: px,
            y: py,
            size: glyph.style.fontSize,
            font,
            color: rgb(r, g, b),
          });
        }
      }
    }
  }
}
