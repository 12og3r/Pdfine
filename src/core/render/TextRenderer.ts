import type { TextBlock, Color } from '../../types/document';
import type { IFontManager } from '../interfaces/IFontManager';
import { OVERFLOW_BORDER_COLOR } from '../../config/constants';

function colorToCSS(color: Color): string {
  const a = color.a ?? 1;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
}

function alignPixel(value: number, dpr: number): number {
  return Math.round(value * dpr) / dpr;
}

export class TextRenderer {
  private fontManager: IFontManager | null;

  constructor(fontManager?: IFontManager) {
    this.fontManager = fontManager ?? null;
  }

  setFontManager(fontManager: IFontManager): void {
    this.fontManager = fontManager;
  }

  renderTextBlock(
    ctx: CanvasRenderingContext2D,
    block: TextBlock,
    scale: number,
    dpr: number
  ): void {
    ctx.save();
    ctx.textBaseline = 'alphabetic';

    const bx = block.bounds.x;
    const by = block.bounds.y;

    for (const paragraph of block.paragraphs) {
      if (!paragraph.lines) continue;

      for (const line of paragraph.lines) {
        for (const glyph of line.glyphs) {
          const fontSize = glyph.style.fontSize * scale;
          const fontStyle = glyph.style.fontStyle === 'italic' ? 'italic' : '';
          const fontWeight = glyph.style.fontWeight;

          const fontFamily = this.resolveFontFamily(glyph.style.fontId);
          ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`.trim();
          ctx.fillStyle = colorToCSS(glyph.style.color);

          // glyph.y is the top of the glyph area (lineY + lineBaseline - charAscent).
          // With textBaseline='alphabetic', we need the baseline position:
          //   baselineY = glyph.y + charAscent
          // This bypasses differences between Canvas's 'top' metric and our
          // opentype.js-based ascent, giving precise baseline alignment with pdfjs.
          const charAscent = this.getGlyphAscent(glyph.style.fontId, glyph.style.fontSize);
          const px = alignPixel((bx + glyph.x) * scale, dpr);
          const py = alignPixel((by + glyph.y + charAscent) * scale, dpr);
          ctx.fillText(glyph.char, px, py);
        }
      }
    }

    ctx.restore();

    // Render overflow warning border
    if (block.overflowState.status === 'overflowing') {
      this.renderOverflowBorder(ctx, block, scale);
    }
  }

  /**
   * Get the font ascent for baseline positioning.
   * Uses IFontManager.getAscent() (opentype.js metrics) when available.
   */
  private getGlyphAscent(fontId: string, fontSize: number): number {
    if (this.fontManager) {
      return this.fontManager.getAscent(fontId, fontSize);
    }
    return fontSize * 0.8;
  }

  /**
   * Resolve font family for rendering. Priority:
   * 1. If the font was registered via FontFace API, use its ID directly
   * 2. Otherwise, fall back to CSS font family heuristics
   */
  private resolveFontFamily(fontId: string): string {
    if (this.fontManager) {
      const font = this.fontManager.getFont(fontId);
      if (font?.fontFace) {
        // Font was extracted from PDF and registered with the browser — use it directly
        return `"${fontId}", sans-serif`;
      }
    }
    return this.mapFontFamily(fontId);
  }

  /**
   * Map PDF internal font names to reasonable CSS font families.
   * Only used as fallback when the font is not registered via FontFace API.
   */
  private mapFontFamily(fontId: string): string {
    const lower = fontId.toLowerCase();

    // Check for common font name patterns
    if (lower.includes('courier') || lower.includes('mono')) {
      return '"Courier New", Courier, monospace';
    }
    if (lower.includes('times') || lower.includes('serif')) {
      if (lower.includes('sans')) {
        return 'sans-serif';
      }
      return '"Times New Roman", Times, serif';
    }
    if (lower.includes('arial') || lower.includes('helvetica') || lower.includes('sans')) {
      return 'Arial, Helvetica, sans-serif';
    }
    if (lower.includes('symbol')) {
      return 'Symbol, sans-serif';
    }

    // If it looks like an internal PDF font name (starts with g_ or has _f), use sans-serif
    if (lower.startsWith('g_') || lower.includes('_f') || /^[a-z]\d/.test(lower)) {
      return 'sans-serif';
    }

    // Try using the font name directly with a fallback
    return `"${fontId}", sans-serif`;
  }

  private renderOverflowBorder(
    ctx: CanvasRenderingContext2D,
    block: TextBlock,
    scale: number
  ): void {
    const { x, y, width, height } = block.bounds;
    ctx.save();
    ctx.strokeStyle = OVERFLOW_BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(x * scale, y * scale, width * scale, height * scale);
    ctx.restore();
  }
}
