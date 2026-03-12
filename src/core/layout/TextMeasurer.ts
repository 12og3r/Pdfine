import type { TextRun } from '../../types/document';
import type { IFontManager } from '../interfaces/IFontManager';

export class TextMeasurer {
  measureChar(
    char: string,
    fontId: string,
    fontSize: number,
    fontManager: IFontManager,
    letterSpacing: number = 0,
    pdfWidth?: number,
  ): number {
    // Newline has zero width
    if (char === '\n') return 0;
    // Use PDF-stored width if available and valid (not NaN/undefined)
    const width = (pdfWidth !== undefined && !isNaN(pdfWidth))
      ? pdfWidth
      : fontManager.measureChar(char, fontId, fontSize);
    return width + letterSpacing * fontSize;
  }

  measureRun(run: TextRun, fontManager: IFontManager): number {
    const { style, text } = run;
    const letterSpacing = style.letterSpacing ?? 0;
    let total = 0;
    for (let i = 0; i < text.length; i++) {
      const pdfWidth = run.pdfCharWidths?.[i];
      total += this.measureChar(text[i], style.fontId, style.fontSize, fontManager, letterSpacing, pdfWidth);
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
    return fontManager.getAscent(fontId, fontSize);
  }
}
