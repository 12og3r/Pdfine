import type { IFontManager } from '../interfaces/IFontManager'
import type { FontInfo, FontMetrics } from '../../types/font'
import type { RegisteredFont } from '../../types/document'
import { FontExtractor } from './FontExtractor'
import { FontMetricsParser } from './FontMetrics'
import { FontFallback } from './FontFallback'
import { buildStandardRegisteredFonts, getStandardFontSpec, isStandardFontId } from './StandardFonts'
import { Logger } from '../infra/Logger'

const logger = new Logger('FontManager');

export class FontManager implements IFontManager {
  private fonts = new Map<string, RegisteredFont>();
  private metricsParser = new FontMetricsParser();
  private fallback: FontFallback;
  private fontExtractor = new FontExtractor();
  private measureCanvas: OffscreenCanvas | HTMLCanvasElement;
  private measureCtx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  private charWidthCache = new Map<string, number>();
  private textMeasureCache = new Map<string, { width: number; height: number }>();

  constructor() {
    this.fallback = new FontFallback(this.fonts);

    if (typeof OffscreenCanvas !== 'undefined') {
      this.measureCanvas = new OffscreenCanvas(1, 1);
      this.measureCtx = this.measureCanvas.getContext('2d')!;
    } else {
      this.measureCanvas = document.createElement('canvas');
      this.measureCtx = this.measureCanvas.getContext('2d')!;
    }

    // Seed the registry with the 14 PDF standard fonts (offered as 3 curated
    // families in the UI). These have no raw binary — Canvas falls back to
    // the system font stack and the exporter embeds the matching StandardFonts
    // variant, so on-screen widths agree with pdf-lib's widths.
    for (const font of buildStandardRegisteredFonts()) {
      this.fonts.set(font.id, font);
    }
  }

  async extractAndRegister(pdfDoc: unknown): Promise<void> {
    // Re-seed the curated PDF standard fonts in case a previous `destroy()`
    // cleared the map (common in React StrictMode, where `useEditorCore`'s
    // cleanup effect fires between mount and re-mount). Without this, the
    // inspector's Font dropdown would show only the PDF's embedded fonts
    // after the second mount — no Helvetica / Times Roman / Courier options.
    for (const font of buildStandardRegisteredFonts()) {
      if (!this.fonts.has(font.id)) this.fonts.set(font.id, font);
    }

    const extractedFonts = await this.fontExtractor.extractFonts(pdfDoc);

    for (const font of extractedFonts) {
      this.fonts.set(font.id, font);

      // Skip registration if pdfjs already registered the font (fontFace set by extractor)
      if (font.fontFace) {
        logger.info(`Font already registered by pdfjs: ${font.name} (${font.id})`);
      } else if (font.data && font.editable) {
        // Register via FontFace API if we have font data and it's an editable format
        try {
          const fontFace = new FontFace(font.id, font.data, {
            weight: String(font.weight),
            style: font.style,
          });
          await fontFace.load();
          document.fonts.add(fontFace);
          font.fontFace = fontFace;
          logger.info(`Registered font: ${font.name} (${font.id})`);
        } catch (err) {
          logger.warn(`Failed to register font ${font.name}:`, err);
          font.editable = false;
        }
      }

      // Parse metrics if we have font data
      if (font.data) {
        await this.metricsParser.parseMetrics(font.id, font.data);
      }
    }

    logger.info(`Font registration complete. ${this.fonts.size} fonts registered.`);
  }

  getFont(fontId: string): RegisteredFont | undefined {
    const font = this.fonts.get(fontId);
    if (font && !font.fontFace && typeof document !== 'undefined' && document.fonts) {
      // pdfjs v5 registers embedded TrueType/OpenType fonts with the
      // browser's FontFace API under `loadedName`, but `document.fonts.add`
      // fires asynchronously — it may land AFTER our `FontExtractor`
      // snapshot of `document.fonts` at `extractAndRegister` time. When it
      // does, the font enters our registry with `fontFace: undefined`,
      // `TextRenderer.resolveFontFamily` falls through to
      // `mapFontFamily`, and internal-looking ids (`g_d0_f1`, etc.) get
      // mapped to the generic `sans-serif` stack. The result on
      // edit-mode entry is that Canvas paints the block in the system
      // sans-serif — visible to the user as the font / weight changing
      // and the baseline jumping upward (sans-serif's ascent is usually
      // less than the original embedded face, so `bounds.y + ascent`
      // lands above the pdfjs raster's baseline). Rescan document.fonts
      // lazily here and cache the match so `renderTextBlock` sees the
      // real face once it's loaded.
      try {
        const fonts = document.fonts as unknown as Iterable<FontFace>
        for (const ff of fonts) {
          if (ff.family === fontId && ff.status === 'loaded') {
            font.fontFace = ff;
            font.editable = true;
            break;
          }
        }
      } catch {
        // document.fonts may not be iterable in some environments — ignore.
      }
    }
    return font;
  }

  getMetrics(fontId: string): FontMetrics | null {
    return this.metricsParser.getMetrics(fontId);
  }

  measureText(text: string, fontId: string, fontSize: number): { width: number; height: number } {
    const cacheKey = `${fontId}:${fontSize}:${text}`;
    const cached = this.textMeasureCache.get(cacheKey);
    if (cached) return cached;

    const fontString = this.buildFontString(fontId, fontSize);
    this.measureCtx.font = fontString;
    const metrics = this.measureCtx.measureText(text);

    const result = {
      width: metrics.width,
      height: fontSize * 1.2, // approximate line height
    };

    this.textMeasureCache.set(cacheKey, result);
    return result;
  }

  measureChar(char: string, fontId: string, fontSize: number): number {
    const cacheKey = `${fontId}:${char.charCodeAt(0)}:${fontSize}`;
    const cached = this.charWidthCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const fontString = this.buildFontString(fontId, fontSize);
    this.measureCtx.font = fontString;
    const width = this.measureCtx.measureText(char).width;

    this.charWidthCache.set(cacheKey, width);
    return width;
  }

  /**
   * Get the font's ascent in CSS pixels for a given fontSize.
   * Uses opentype.js metrics when available, falls back to Canvas TextMetrics API.
   */
  getAscent(fontId: string, fontSize: number): number {
    const metrics = this.getMetrics(fontId)
    if (metrics) {
      return metrics.ascender * (fontSize / metrics.unitsPerEm)
    }
    // Fallback: use Canvas TextMetrics (fontBoundingBoxAscent)
    const fontString = this.buildFontString(fontId, fontSize)
    this.measureCtx.font = fontString
    const tm = this.measureCtx.measureText('M')
    if (typeof (tm as any).fontBoundingBoxAscent === 'number') {
      return (tm as any).fontBoundingBoxAscent
    }
    // Last resort
    return fontSize * 0.8
  }

  getAvailableFonts(): FontInfo[] {
    const result: FontInfo[] = [];
    for (const [, font] of this.fonts) {
      result.push({
        id: font.id,
        name: font.name,
        family: font.family,
        weight: font.weight,
        style: font.style,
        isEmbedded: font.isEmbedded,
        editable: font.editable,
      });
    }
    return result;
  }

  getFontFace(fontId: string): FontFace | null {
    return this.fonts.get(fontId)?.fontFace ?? null;
  }

  hasGlyph(fontId: string, char: string): boolean {
    // If font is registered and loaded, attempt to measure - a zero width typically indicates missing glyph
    const font = this.fonts.get(fontId);
    if (!font?.fontFace) return false;

    const width = this.measureChar(char, fontId, 12);
    // Compare against the "missing glyph" width (measure a known-missing char)
    return width > 0;
  }

  getFallbackFont(fontId: string, char: string): string {
    return this.fallback.getFallbackFont(fontId, char);
  }

  getFontData(fontId: string): ArrayBuffer | undefined {
    return this.fonts.get(fontId)?.data;
  }

  destroy(): void {
    // Remove registered FontFace objects
    for (const [, font] of this.fonts) {
      if (font.fontFace) {
        try {
          document.fonts.delete(font.fontFace);
        } catch {
          // ignore
        }
      }
    }

    this.fonts.clear();
    this.charWidthCache.clear();
    this.textMeasureCache.clear();
    this.metricsParser.destroy();
    logger.info('FontManager destroyed');
  }

  /** Expose the internal font map for DocumentModel */
  getFontMap(): Map<string, RegisteredFont> {
    return this.fonts;
  }

  private buildFontString(fontId: string, fontSize: number): string {
    // Curated PDF standard fonts — resolve directly to the system stack so
    // Canvas measurement matches what the user will see in both the editor
    // and the exported PDF (pdf-lib's StandardFonts share these widths).
    if (isStandardFontId(fontId)) {
      const spec = getStandardFontSpec(fontId);
      if (spec) return `${fontSize}px ${spec.cssFamily}`;
    }
    const font = this.fonts.get(fontId);
    if (font?.fontFace) {
      // Use the registered font ID directly
      return `${font.style === 'italic' ? 'italic ' : ''}${font.weight} ${fontSize}px "${font.id}"`;
    }
    // Fallback to system font
    const fallbackId = this.fallback.getFallbackFont(fontId, '');
    return `${fontSize}px "${fallbackId}", sans-serif`;
  }
}
