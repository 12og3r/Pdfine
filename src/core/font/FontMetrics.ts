import type { FontMetrics as FontMetricsType } from '../../types/font'
import { Logger } from '../infra/Logger'

const logger = new Logger('FontMetrics');

// Default metrics when opentype.js can't parse the font
const DEFAULT_METRICS: FontMetricsType = {
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  lineGap: 0,
  xHeight: 500,
  capHeight: 700,
};

export class FontMetricsParser {
  private metricsCache = new Map<string, FontMetricsType>();

  async parseMetrics(fontId: string, fontData: ArrayBuffer): Promise<FontMetricsType> {
    const cached = this.metricsCache.get(fontId);
    if (cached) return cached;

    try {
      const opentype = await this.loadOpentype();
      if (!opentype) {
        return DEFAULT_METRICS;
      }

      const font = opentype.parse(fontData);

      const metrics: FontMetricsType = {
        unitsPerEm: font.unitsPerEm || 1000,
        ascender: font.ascender || 800,
        descender: font.descender || -200,
        lineGap: (font.tables?.os2?.sTypoLineGap as number) || 0,
        xHeight: (font.tables?.os2?.sxHeight as number) || Math.round((font.ascender || 800) * 0.6),
        capHeight: (font.tables?.os2?.sCapHeight as number) || Math.round((font.ascender || 800) * 0.85),
      };

      this.metricsCache.set(fontId, metrics);
      return metrics;
    } catch (err) {
      logger.warn(`Failed to parse font metrics for ${fontId}:`, err);
      return DEFAULT_METRICS;
    }
  }

  getMetrics(fontId: string): FontMetricsType | null {
    return this.metricsCache.get(fontId) ?? null;
  }

  private async loadOpentype(): Promise<{ parse(data: ArrayBuffer): OpenTypeFont } | null> {
    try {
      const mod = await import('opentype.js');
      return (mod.default || mod) as { parse(data: ArrayBuffer): OpenTypeFont };
    } catch {
      logger.warn('opentype.js not available');
      return null;
    }
  }

  destroy(): void {
    this.metricsCache.clear();
  }
}

interface OpenTypeFont {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  tables: {
    os2?: {
      sTypoLineGap?: number;
      sxHeight?: number;
      sCapHeight?: number;
    };
  };
}
