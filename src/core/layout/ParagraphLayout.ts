import type { Paragraph, TextRun, LayoutLine, PositionedGlyph, TextStyle } from '../../types/document';
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
    const chars = this.flattenRuns(paragraph, fontManager);
    if (chars.length === 0) {
      // Empty paragraph - produce a single empty line
      const defaultStyle = paragraph.runs[0]?.style;
      if (!defaultStyle) return [];
      const lineHeight = this.measurer.getLineHeight(
        defaultStyle.fontSize, paragraph.lineSpacing, defaultStyle.fontId, fontManager, paragraph.pdfLineHeight,
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
    // When a paragraph spans multiple lines with differing fonts, the first
    // line's ascent anchors every line's baseline so that the PDF's
    // baseline-to-baseline distance (`pdfLineHeight`) lands exactly where
    // pdfjs rasterized it. Passing each line its OWN ascent as the baseline
    // offset causes subsequent lines with a smaller ascent to render
    // `(firstAscent - thisAscent)` px above the original pdfjs baseline —
    // visible on the "Sample PDF / Created for testing PDFObject" title as a
    // 17 px upward shift of the subtitle on edit-mode entry. Locking the
    // offset to the first line's ascent keeps `lineY += lineHeight` accounting
    // intact (so contentHeight / overflow detection don't change) while still
    // placing glyphs at the right absolute baseline.
    let anchorBaselineOffset: number | undefined;

    for (let li = 0; li < lineRanges.length; li++) {
      const [lineStart, lineEnd] = lineRanges[li];
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
        dominantStyle.fontSize, paragraph.lineSpacing, dominantStyle.fontId, fontManager, paragraph.pdfLineHeight,
      );
      const thisLineBaseline = this.measurer.getBaseline(dominantStyle.fontSize, dominantStyle.fontId, fontManager);
      // Lock the effective baseline offset to the first line's value when we
      // have a PDF-derived line height — every line then shares the same
      // offset-from-lineY to baseline, so `lineY + effBaseline` walks in
      // `pdfLineHeight` increments exactly like pdfjs.
      if (anchorBaselineOffset === undefined) {
        anchorBaselineOffset = thisLineBaseline;
      }
      const effBaseline = paragraph.pdfLineHeight !== undefined
        ? anchorBaselineOffset
        : thisLineBaseline;

      // Measure total content width
      let contentWidth = 0;
      for (const c of trimmedChars) {
        const ls = c.style.letterSpacing ?? 0;
        contentWidth += this.measurer.measureChar(c.char, c.style.fontId, c.style.fontSize, fontManager, ls, c.pdfWidth);
      }

      // Position glyphs based on alignment
      const glyphs = this.positionGlyphs(
        trimmedChars, paragraph.alignment, maxWidth, contentWidth, currentY, effBaseline, fontManager,
      );

      lines.push({
        glyphs,
        baseline: currentY + effBaseline,
        width: contentWidth,
        height: lineHeight,
        y: currentY,
      });

      currentY += lineHeight;
    }

    return lines;
  }

  private flattenRuns(paragraph: Paragraph, fontManager: IFontManager): CharInfo[] {
    const chars: CharInfo[] = [];
    for (const run of paragraph.runs) {
      // If the run has pdfRunWidth/pdfLineWidths but no pdfCharWidths, compute proportional
      // per-char widths by scaling canvas-measured widths to match the PDF total.
      const hasPdfWidths = (run.pdfRunWidth !== undefined && run.pdfRunWidth > 0) || (run.pdfLineWidths && run.pdfLineWidths.length > 0);
      if (hasPdfWidths && !run.pdfCharWidths) {
        const proportionalWidths = this.computeProportionalWidths(run, fontManager);
        run.pdfCharWidths = proportionalWidths;
        run.pdfRunWidth = undefined;
        run.pdfLineWidths = undefined;
        for (let i = 0; i < run.text.length; i++) {
          chars.push(this.charInfoFor(run.text[i], run.style, proportionalWidths[i]));
        }
      } else {
        for (let i = 0; i < run.text.length; i++) {
          const pdfWidth = run.pdfCharWidths?.[i];
          chars.push(this.charInfoFor(
            run.text[i],
            run.style,
            (pdfWidth !== undefined && !isNaN(pdfWidth)) ? pdfWidth : undefined,
          ));
        }
      }
    }
    return chars;
  }

  /**
   * Convert a single source character into a CharInfo for layout.
   *
   * The parser inserts '\n' between PDF lines (TextBlockBuilder) to mark where
   * the original PDF's text engine wrapped the paragraph. In the PDF itself
   * those line breaks encode an implicit word separator — the reader sees
   * "...Integer" at end of line N and "odio..." at start of line N+1 as a
   * word boundary, not a concatenation. But the '\n' character has zero
   * drawable width and no semantics to Canvas/pdf-lib, so when the layout
   * re-flows content across a '\n' boundary (after an edit) the two words
   * end up visually glued ("Integernec"). Map '\n' to a real space here
   * so the layout, measurement, rendering, and export pipelines all treat
   * it as a word separator with natural canvas-measured space width. Leaves
   * `run.text` untouched — paragraph-level newlines (hard breaks from Enter)
   * live between paragraphs in the DocumentModel, not inside a run.
   */
  private charInfoFor(
    char: string,
    style: TextStyle,
    pdfWidth: number | undefined,
  ): CharInfo {
    if (char === '\n') {
      return { char: ' ', style, pdfWidth: undefined };
    }
    return { char, style, pdfWidth };
  }

  /**
   * Compute proportional per-character widths by scaling canvas-measured widths
   * to match the PDF's width. When per-line widths are available (pdfLineWidths),
   * scales each \n-delimited segment independently to preserve the PDF's per-line
   * layout. Otherwise falls back to scaling the entire run uniformly.
   */
  private computeProportionalWidths(run: TextRun, fontManager: IFontManager): number[] {
    const { text, style } = run;

    // Measure each character with canvas (newlines get zero width)
    const canvasWidths: number[] = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        canvasWidths.push(0);
      } else {
        const w = fontManager.measureChar(text[i], style.fontId, style.fontSize);
        canvasWidths.push(w);
      }
    }

    // Per-line scaling: each \n-delimited segment uses its own PDF width
    if (run.pdfLineWidths && run.pdfLineWidths.length > 0) {
      return this.scalePerSegment(text, canvasWidths, run.pdfLineWidths);
    }

    // Fallback: single scale factor for the entire run
    const pdfRunWidth = run.pdfRunWidth!;
    let canvasTotal = 0;
    for (const w of canvasWidths) canvasTotal += w;

    if (canvasTotal === 0) {
      const visibleCount = text.split('').filter(c => c !== '\n').length;
      const uniform = visibleCount > 0 ? pdfRunWidth / visibleCount : 0;
      return canvasWidths.map((_, i) => text[i] === '\n' ? 0 : uniform);
    }

    const scaleFactor = pdfRunWidth / canvasTotal;
    return canvasWidths.map(w => w * scaleFactor);
  }

  /**
   * Scale canvas widths per \n-delimited segment using per-line PDF widths.
   */
  private scalePerSegment(text: string, canvasWidths: number[], pdfLineWidths: number[]): number[] {
    const result: number[] = new Array(text.length);
    let segIdx = 0;
    let segStart = 0;

    for (let i = 0; i <= text.length; i++) {
      if (i === text.length || text[i] === '\n') {
        // Scale this segment
        const pdfWidth = segIdx < pdfLineWidths.length ? pdfLineWidths[segIdx] : 0;
        let segCanvasTotal = 0;
        for (let j = segStart; j < i; j++) segCanvasTotal += canvasWidths[j];

        if (segCanvasTotal > 0) {
          const scale = pdfWidth / segCanvasTotal;
          for (let j = segStart; j < i; j++) result[j] = canvasWidths[j] * scale;
        } else {
          const visibleCount = i - segStart;
          const uniform = visibleCount > 0 ? pdfWidth / visibleCount : 0;
          for (let j = segStart; j < i; j++) result[j] = uniform;
        }

        if (i < text.length) {
          result[i] = 0; // \n has zero width
        }
        segIdx++;
        segStart = i + 1;
      }
    }

    return result;
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
    for (const { char, style, pdfWidth } of chars) {
      const ls = style.letterSpacing ?? 0;
      const charWidth = this.measurer.measureChar(char, style.fontId, style.fontSize, fontManager, ls, pdfWidth);
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
