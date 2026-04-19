import type { TextBlock, Color, TextStyle, RegisteredFont } from '../../types/document';
import type { IFontManager } from '../interfaces/IFontManager';
import { OVERFLOW_BORDER_COLOR } from '../../config/constants';
import { getStandardFontSpec } from '../font/StandardFonts';

function colorToCSS(color: Color): string {
  const a = color.a ?? 1;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
}

function alignPixel(value: number, dpr: number): number {
  return Math.round(value * dpr) / dpr;
}

function numericWeight(face: FontFace): number {
  const raw = (face.weight ?? '400').trim().toLowerCase();
  if (raw === 'bold') return 700;
  if (raw === 'normal' || raw === '') return 400;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 400;
}

function faceIsItalic(face: FontFace): boolean {
  const s = (face.style ?? 'normal').trim().toLowerCase();
  return s === 'italic' || s === 'oblique';
}

/**
 * Compute the weight and style strings to put into `ctx.font`.
 *
 * Goal: when the user's requested style matches the font file's actual
 * weight/style we use the FontFace's own descriptors so the browser picks
 * the exact registered face — skipping `font-synthesis` and avoiding double-
 * bold on an already-bold PDF font. When the user EXPLICITLY asked for a
 * different weight/style (Bold / Italic toggle in the inspector), we pass
 * the requested values and let the browser synthesize faux bold/italic on
 * top of the registered face — otherwise clicking Bold had no visible effect
 * because the FontFace was always registered with weight='normal' by pdfjs.
 *
 * `font.weight` on the RegisteredFont reflects the actual font file (from
 * name / pdfjs flags / metric tables); `face.weight` on the FontFace is the
 * CSS descriptor pdfjs used to register it (typically 'normal' regardless
 * of the file). We compare against `font.weight` / `font.style` when we
 * have them — that's the source of truth about whether the already-embedded
 * glyphs are "bold enough" to satisfy the request.
 */
function resolveFontDescriptors(
  style: TextStyle,
  face: FontFace | null,
  registered: RegisteredFont | undefined,
): { ctxWeight: string; ctxStyle: string } {
  const requestBold = style.fontWeight >= 600;
  const requestItalic = style.fontStyle === 'italic';

  if (face && registered) {
    const fileBold = registered.weight >= 600;
    const fileItalic = registered.style === 'italic';
    const weightMatches = requestBold === fileBold;
    const styleMatches = requestItalic === fileItalic;
    if (weightMatches && styleMatches) {
      // Exact-enough match — ride the registered face, no synthesis.
      return {
        ctxWeight: String(numericWeight(face)),
        ctxStyle: faceIsItalic(face) ? 'italic' : '',
      };
    }
    // Mismatch — browser will look for a registered variant first, then fall
    // back to font-synthesis. That's what makes Bold / Italic toggle visible.
    return {
      ctxWeight: String(style.fontWeight),
      ctxStyle: requestItalic ? 'italic' : '',
    };
  }
  if (face) {
    // No metadata about the file — conservative default: use the face's own
    // descriptors so we don't double-synthesize.
    return {
      ctxWeight: String(numericWeight(face)),
      ctxStyle: faceIsItalic(face) ? 'italic' : '',
    };
  }
  return {
    ctxWeight: String(style.fontWeight),
    ctxStyle: requestItalic ? 'italic' : '',
  };
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

          // When a FontFace is registered (either by pdfjs or by FontManager),
          // use the FontFace's OWN weight/style in ctx.font so the browser
          // picks it exactly and skips `font-synthesis: weight/style` —
          // otherwise an already-bold glyph file requested via weight=700
          // would get faux-bold on top of real bold, making glyphs visibly
          // thicker than the pdfjs raster.
          const registered = this.fontManager?.getFont(glyph.style.fontId);
          const registeredFace = registered?.fontFace ?? null;
          const { ctxWeight, ctxStyle } = resolveFontDescriptors(
            glyph.style,
            registeredFace,
            registered,
          );

          const fontFamily = this.resolveFontFamily(glyph.style.fontId);
          ctx.font = `${ctxStyle} ${ctxWeight} ${fontSize}px ${fontFamily}`.trim();
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
   * 1. Curated PDF standard fonts (Helvetica / Times Roman / Courier) →
   *    resolve to the system font stack that matches pdf-lib's StandardFonts,
   *    so on-screen widths match what the exporter draws.
   * 2. If the font was registered via FontFace API, use its ID directly.
   * 3. Otherwise, fall back to CSS font family heuristics.
   */
  private resolveFontFamily(fontId: string): string {
    const std = getStandardFontSpec(fontId);
    if (std) return std.cssFamily;
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
