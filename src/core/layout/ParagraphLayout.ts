import type { Paragraph, LayoutLine, PositionedGlyph, TextStyle } from '../../types/document';
import type { IFontManager } from '../interfaces/IFontManager';
import type { CharInfo } from './GreedyLineBreaker';
import { TextMeasurer } from './TextMeasurer';

export interface LineBreaker {
  breakLines(chars: CharInfo[], maxWidth: number, fontManager: IFontManager, lineSpacing: number): number[];
}

export class ParagraphLayout {
  private measurer = new TextMeasurer();

  layoutParagraph(
    paragraph: Paragraph,
    maxWidth: number,
    fontManager: IFontManager,
    lineBreaker: LineBreaker,
    startY: number,
  ): LayoutLine[] {
    const chars = this.flattenRuns(paragraph);
    if (chars.length === 0) {
      // Empty paragraph - produce a single empty line
      const defaultStyle = paragraph.runs[0]?.style;
      if (!defaultStyle) return [];
      const lineHeight = this.measurer.getLineHeight(
        defaultStyle.fontSize, paragraph.lineSpacing, defaultStyle.fontId, fontManager,
      );
      return [{
        glyphs: [],
        baseline: this.measurer.getBaseline(defaultStyle.fontSize, defaultStyle.fontId, fontManager),
        width: 0,
        height: lineHeight,
        y: startY,
      }];
    }

    const breaks = lineBreaker.breakLines(chars, maxWidth, fontManager, paragraph.lineSpacing);
    const lines: LayoutLine[] = [];

    // Split chars into lines based on break positions
    const lineRanges: Array<[number, number]> = [];
    let start = 0;
    for (const bp of breaks) {
      lineRanges.push([start, bp]);
      start = bp;
    }
    if (start < chars.length) {
      lineRanges.push([start, chars.length]);
    }

    let currentY = startY;

    for (const [lineStart, lineEnd] of lineRanges) {
      const lineChars = chars.slice(lineStart, lineEnd);
      // Trim trailing spaces/newlines from the line for width calculation
      let trimmedEnd = lineChars.length;
      while (trimmedEnd > 0 && (lineChars[trimmedEnd - 1].char === ' ' || lineChars[trimmedEnd - 1].char === '\n')) {
        trimmedEnd--;
      }
      const trimmedChars = lineChars.slice(0, trimmedEnd);

      // Find dominant font for line height
      const dominantStyle = this.getDominantStyle(lineChars);
      const lineHeight = this.measurer.getLineHeight(
        dominantStyle.fontSize, paragraph.lineSpacing, dominantStyle.fontId, fontManager,
      );
      const baseline = this.measurer.getBaseline(dominantStyle.fontSize, dominantStyle.fontId, fontManager);

      // Measure total content width
      let contentWidth = 0;
      for (const c of trimmedChars) {
        const ls = c.style.letterSpacing ?? 0;
        contentWidth += this.measurer.measureChar(c.char, c.style.fontId, c.style.fontSize, fontManager, ls);
      }

      // Position glyphs based on alignment
      const glyphs = this.positionGlyphs(
        trimmedChars, paragraph.alignment, maxWidth, contentWidth, currentY, baseline, fontManager,
      );

      lines.push({
        glyphs,
        baseline: currentY + baseline,
        width: contentWidth,
        height: lineHeight,
        y: currentY,
      });

      currentY += lineHeight;
    }

    return lines;
  }

  private flattenRuns(paragraph: Paragraph): CharInfo[] {
    const chars: CharInfo[] = [];
    for (const run of paragraph.runs) {
      for (const char of run.text) {
        chars.push({ char, style: run.style });
      }
    }
    return chars;
  }

  private getDominantStyle(chars: CharInfo[]): TextStyle {
    if (chars.length === 0) throw new Error('Empty chars array');
    // Use the style with the largest fontSize
    let dominant = chars[0].style;
    for (let i = 1; i < chars.length; i++) {
      if (chars[i].style.fontSize > dominant.fontSize) {
        dominant = chars[i].style;
      }
    }
    return dominant;
  }

  private positionGlyphs(
    chars: CharInfo[],
    alignment: Paragraph['alignment'],
    maxWidth: number,
    contentWidth: number,
    lineY: number,
    baseline: number,
    fontManager: IFontManager,
  ): PositionedGlyph[] {
    const glyphs: PositionedGlyph[] = [];
    if (chars.length === 0) return glyphs;

    let startX = 0;
    let extraSpacePerGap = 0;

    switch (alignment) {
      case 'center':
        startX = (maxWidth - contentWidth) / 2;
        break;
      case 'right':
        startX = maxWidth - contentWidth;
        break;
      case 'justify': {
        // Count word gaps (spaces) for distributing extra space
        const gapCount = chars.filter(c => c.char === ' ').length;
        if (gapCount > 0) {
          extraSpacePerGap = (maxWidth - contentWidth) / gapCount;
        }
        break;
      }
    }

    let x = startX;
    for (const { char, style } of chars) {
      const ls = style.letterSpacing ?? 0;
      const charWidth = this.measurer.measureChar(char, style.fontId, style.fontSize, fontManager, ls);
      const charHeight = style.fontSize;
      const charBaseline = this.measurer.getBaseline(style.fontSize, style.fontId, fontManager);

      glyphs.push({
        char,
        x,
        y: lineY + baseline - charBaseline,
        width: charWidth,
        height: charHeight,
        style,
      });

      x += charWidth;
      if (alignment === 'justify' && char === ' ') {
        x += extraSpacePerGap;
      }
    }

    return glyphs;
  }
}
