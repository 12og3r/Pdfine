import type { IFontManager } from '../interfaces/IFontManager'
import type { FontInfo, FontMetrics } from '../../types/font'
import type { RegisteredFont } from '../../types/document'
import { FontExtractor } from './FontExtractor'
import { FontMetricsParser } from './FontMetrics'
import { FontFallback } from './FontFallback'
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
  }

  async extractAndRegister(pdfDoc: unknown): Promise<void> {
    const extractedFonts = await this.fontExtractor.extractFonts(pdfDoc);

    for (const font of extractedFonts) {
      this.fonts.set(font.id, font);

      // Register via FontFace API if we have font data and it's an editable format
      if (font.data && font.editable) {
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
    return this.fonts.get(fontId);
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
