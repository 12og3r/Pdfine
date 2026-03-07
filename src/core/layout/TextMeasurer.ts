import type { TextRun } from '../../types/document';
import type { IFontManager } from '../interfaces/IFontManager';

export class TextMeasurer {
  measureChar(
    char: string,
    fontId: string,
    fontSize: number,
    fontManager: IFontManager,
    letterSpacing: number = 0,
  ): number {
    const width = fontManager.measureChar(char, fontId, fontSize);
    return width + letterSpacing * fontSize;
  }

  measureRun(run: TextRun, fontManager: IFontManager): number {
    const { style, text } = run;
    const letterSpacing = style.letterSpacing ?? 0;
    let total = 0;
    for (let i = 0; i < text.length; i++) {
      total += this.measureChar(text[i], style.fontId, style.fontSize, fontManager, letterSpacing);
    }
    return total;
  }

  getLineHeight(fontSize: number, lineSpacing: number, fontId: string, fontManager: IFontManager): number {
    const metrics = fontManager.getMetrics(fontId);
    if (metrics) {
      const scale = fontSize / metrics.unitsPerEm;
      const ascent = metrics.ascender * scale;
      const descent = Math.abs(metrics.descender * scale);
      return (ascent + descent + metrics.lineGap * scale) * lineSpacing;
    }
    return fontSize * lineSpacing;
  }

  getBaseline(fontSize: number, fontId: string, fontManager: IFontManager): number {
    const metrics = fontManager.getMetrics(fontId);
    if (metrics) {
      const scale = fontSize / metrics.unitsPerEm;
      return metrics.ascender * scale;
    }
    return fontSize * 0.8;
  }
}
