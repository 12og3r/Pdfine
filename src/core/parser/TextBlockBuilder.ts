import type { TextBlock, Paragraph, TextRun, TextStyle, Rect, Color } from '../../types/document'
import { LINE_SPACING_THRESHOLD, SAME_LINE_Y_THRESHOLD } from '../../config/constants'
import { createTextBlock, createParagraph, createTextRun, createTextStyle } from '../model/DocumentModel'
import { DEFAULT_LINE_SPACING } from '../../config/defaults'

export interface RawTextItem {
  text: string;
  x: number;
  y: number; // layout coords (top-left origin)
  width: number;
  height: number;
  fontSize: number;
  fontId: string;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  color: Color;
  editable: boolean;
  pdfItemWidth?: number;  // total PDF width for this text item (for proportional scaling at layout time)
}

interface TextLine {
  items: RawTextItem[];
  y: number;
  minX: number;
  maxX: number;
}

interface ParagraphGroup {
  lines: TextLine[];
  editable: boolean;
}

export class TextBlockBuilder {
  buildBlocks(items: RawTextItem[]): TextBlock[] {
    if (items.length === 0) return [];

    // Sort by y (top to bottom) then x (left to right)
    const sorted = [...items].sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > 1) return yDiff;
      return a.x - b.x;
    });

    // Group items into lines
    const lines = this.groupIntoLines(sorted);

    // Group lines into paragraphs/blocks
    const paragraphGroups = this.groupIntoParagraphs(lines);

    // Convert to TextBlock instances
    return paragraphGroups.map((group) => this.buildBlock(group));
  }

  private groupIntoLines(items: RawTextItem[]): TextLine[] {
    const lines: TextLine[] = [];

    for (const item of items) {
      let placed = false;
      for (const line of lines) {
        // Same-line detection: y values are close enough
        const refFontSize = line.items[0].fontSize;
        if (Math.abs(item.y - line.y) < refFontSize * SAME_LINE_Y_THRESHOLD) {
          // Check for multi-column jump: if x is far left of existing items
          // indicating a new column, don't merge
          const gap = item.x - line.maxX;
          const avgCharWidth = refFontSize * 0.6;
          if (gap > avgCharWidth * 8) {
            // Likely a new column, don't merge
            continue;
          }
          line.items.push(item);
          line.minX = Math.min(line.minX, item.x);
          line.maxX = Math.max(line.maxX, item.x + item.width);
          placed = true;
          break;
        }
      }

      if (!placed) {
        lines.push({
          items: [item],
          y: item.y,
          minX: item.x,
          maxX: item.x + item.width,
        });
      }
    }

    // Sort each line's items by x coordinate
    for (const line of lines) {
      line.items.sort((a, b) => a.x - b.x);
    }

    // Sort lines by y coordinate
    lines.sort((a, b) => a.y - b.y);

    return lines;
  }

  private groupIntoParagraphs(lines: TextLine[]): ParagraphGroup[] {
    if (lines.length === 0) return [];

    const groups: ParagraphGroup[] = [];
    let currentGroup: ParagraphGroup = {
      lines: [lines[0]],
      editable: lines[0].items[0].editable,
    };

    for (let i = 1; i < lines.length; i++) {
      const prevLine = lines[i - 1];
      const currLine = lines[i];
      const prevFontSize = prevLine.items[0].fontSize;
      const yGap = currLine.y - prevLine.y;

      // Check for column break (significantly different x ranges)
      const xOverlap = this.hasXOverlap(prevLine, currLine);

      // New block if: large y gap OR no x overlap (different column)
      if (yGap >= prevFontSize * LINE_SPACING_THRESHOLD || !xOverlap) {
        groups.push(currentGroup);
        currentGroup = {
          lines: [currLine],
          editable: currLine.items[0].editable,
        };
      } else {
        currentGroup.lines.push(currLine);
        // Block is editable only if all lines are editable
        if (!currLine.items[0].editable) {
          currentGroup.editable = false;
        }
      }
    }

    groups.push(currentGroup);
    return groups;
  }

  private hasXOverlap(a: TextLine, b: TextLine): boolean {
    // Check if the x ranges of two lines overlap reasonably
    const aLeft = a.minX;
    const aRight = a.maxX;
    const bLeft = b.minX;
    const bRight = b.maxX;

    const overlapLeft = Math.max(aLeft, bLeft);
    const overlapRight = Math.min(aRight, bRight);

    if (overlapRight <= overlapLeft) {
      // No overlap; check if they're close enough (within one line's width margin)
      const margin = Math.max(aRight - aLeft, bRight - bLeft) * 0.3;
      return Math.abs(bLeft - aLeft) < margin;
    }

    return true;
  }

  private buildBlock(group: ParagraphGroup): TextBlock {
    // Compute bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const line of group.lines) {
      for (const item of line.items) {
        minX = Math.min(minX, item.x);
        minY = Math.min(minY, item.y - item.height);
        maxX = Math.max(maxX, item.x + item.width);
        maxY = Math.max(maxY, item.y);
      }
    }

    const bounds: Rect = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    // Detect paragraph breaks within the group (larger line gap)
    const paragraphs: Paragraph[] = [];
    let currentRuns: TextRun[] = [];
    let prevLineY = group.lines[0].y;
    // Track baseline Y positions per paragraph to compute pdfLineHeight
    let currentLineYs: number[] = [group.lines[0].y];
    // Track the lines that belong to the current paragraph so we can detect
    // their shared alignment (left/center/right) from their original x extents.
    let currentParaLines: TextLine[] = [group.lines[0]];

    for (let li = 0; li < group.lines.length; li++) {
      const line = group.lines[li];

      // Check if this is a new paragraph within the block
      if (li > 0) {
        const prevFontSize = group.lines[li - 1].items[0].fontSize;
        const lineGap = line.y - prevLineY;
        if (lineGap > prevFontSize * 1.5) {
          // New paragraph
          if (currentRuns.length > 0) {
            // Finalize per-line width tracking for runs in this paragraph
            for (const run of currentRuns) {
              if (run.pdfLineWidths && run.pdfRunWidth !== undefined) {
                run.pdfLineWidths.push(run.pdfRunWidth);
                run.pdfRunWidth = undefined;
              }
            }
            const para = createParagraph(currentRuns, this.detectAlignment(currentParaLines), DEFAULT_LINE_SPACING);
            para.pdfLineHeight = this.computePdfLineHeight(currentLineYs);
            paragraphs.push(para);
            currentRuns = [];
            currentLineYs = [];
            currentParaLines = [];
          }
        }
        currentLineYs.push(line.y);
        currentParaLines.push(line);
      }

      // Build runs from items on this line
      for (let ii = 0; ii < line.items.length; ii++) {
        const item = line.items[ii];
        const style = createTextStyle({
          fontId: item.fontId,
          fontSize: item.fontSize,
          fontWeight: item.fontWeight,
          fontStyle: item.fontStyle,
          color: item.color,
        });

        // Try to merge with the previous run if same style
        if (currentRuns.length > 0) {
          const lastRun = currentRuns[currentRuns.length - 1];
          if (this.sameStyle(lastRun.style, style)) {
            // Add a space between items if there's a gap
            const prevItem = ii > 0 ? line.items[ii - 1] : null;
            if (prevItem) {
              const gap = item.x - (prevItem.x + prevItem.width);
              if (gap > item.fontSize * 0.15) {
                lastRun.text += ' ';
                // Accumulate gap into pdfRunWidth for space
                if (lastRun.pdfRunWidth !== undefined) {
                  lastRun.pdfRunWidth += gap;
                }
              }
            }
            lastRun.text += item.text;
            // Accumulate pdfRunWidth
            if (item.pdfItemWidth !== undefined) {
              if (lastRun.pdfRunWidth === undefined) {
                // Can't combine if previous part had no PDF width; drop tracking
                lastRun.pdfRunWidth = undefined;
              } else {
                lastRun.pdfRunWidth += item.pdfItemWidth;
              }
            } else if (lastRun.pdfRunWidth !== undefined) {
              // Item has no pdfItemWidth but has geometric width; use it as estimate
              lastRun.pdfRunWidth += item.width;
            }
            continue;
          }
        }

        const run = createTextRun(item.text, style);
        if (item.pdfItemWidth !== undefined) {
          run.pdfRunWidth = item.pdfItemWidth;
        }
        currentRuns.push(run);
      }

      // Add newline between lines to preserve original PDF line breaks.
      // Also snapshot the current line segment's accumulated PDF width
      // so proportional scaling can be done per-line (not per-run).
      if (li < group.lines.length - 1 && currentRuns.length > 0) {
        const lastRun = currentRuns[currentRuns.length - 1];
        // Record current line segment's PDF width before adding \n
        if (lastRun.pdfRunWidth !== undefined) {
          if (!lastRun.pdfLineWidths) {
            lastRun.pdfLineWidths = [];
          }
          lastRun.pdfLineWidths.push(lastRun.pdfRunWidth);
          // Reset pdfRunWidth accumulator for the next line segment
          lastRun.pdfRunWidth = 0;
        }
        lastRun.text += '\n';
      }

      prevLineY = line.y;
    }

    if (currentRuns.length > 0) {
      // Finalize per-line width tracking: push last segment's width
      for (const run of currentRuns) {
        if (run.pdfLineWidths && run.pdfRunWidth !== undefined) {
          run.pdfLineWidths.push(run.pdfRunWidth);
          run.pdfRunWidth = undefined;  // now fully tracked per-line
        }
      }
      const para = createParagraph(currentRuns, this.detectAlignment(currentParaLines), DEFAULT_LINE_SPACING);
      para.pdfLineHeight = this.computePdfLineHeight(currentLineYs);
      paragraphs.push(para);
    }

    // Ensure at least one paragraph
    if (paragraphs.length === 0) {
      paragraphs.push(createParagraph([createTextRun('', createTextStyle({ fontId: 'default', fontSize: 12 }))], 'left', DEFAULT_LINE_SPACING));
    }

    return createTextBlock(paragraphs, bounds, group.editable);
  }

  /**
   * Detect the paragraph's horizontal alignment from the x extents of its lines.
   *
   * PDF text is drawn at explicit (x, y) positions, so a "centered" paragraph
   * in the source PDF has each line positioned at its own centered x — the
   * lines don't share a left edge. When we aggregate such lines into a single
   * TextBlock, `bounds.x = min(line.minX)` anchors the block to the widest
   * line. Without detecting alignment, the layout engine would left-align all
   * lines at `bounds.x`, shifting the narrower lines leftward on edit-mode
   * entry (visible as a 10–15px horizontal jump for centered titles).
   *
   * Detection priority:
   *  1. Single line → 'left' (no evidence for anything else).
   *  2. All lines share the same minX (and right edges match too) → 'left'
   *     (handles ordinary left-aligned/justified paragraphs).
   *  3. All lines share the same minX → 'left'.
   *  4. All lines share the same visual center → 'center'.
   *  5. All lines share the same maxX → 'right'.
   *  6. Fallback → 'left'.
   */
  private detectAlignment(lines: TextLine[]): Paragraph['alignment'] {
    if (lines.length < 2) return 'left';
    // Tolerance is relative to the dominant font size — subpixel rounding and
    // kerning can jitter line edges by a fraction of an em.
    const dominantFontSize = Math.max(
      ...lines.flatMap(l => l.items.map(it => it.fontSize)),
    );
    const tolerance = Math.max(2, dominantFontSize * 0.1);

    const minXs = lines.map(l => l.minX);
    const maxXs = lines.map(l => l.maxX);
    const centers = lines.map(l => (l.minX + l.maxX) / 2);

    const sameLeft = Math.max(...minXs) - Math.min(...minXs) <= tolerance;
    const sameRight = Math.max(...maxXs) - Math.min(...maxXs) <= tolerance;
    const sameCenter = Math.max(...centers) - Math.min(...centers) <= tolerance;

    if (sameLeft) return 'left';
    if (sameCenter) return 'center';
    if (sameRight) return 'right';
    return 'left';
  }

  private computePdfLineHeight(lineYs: number[]): number | undefined {
    if (lineYs.length < 2) return undefined;
    let totalGap = 0;
    for (let i = 1; i < lineYs.length; i++) {
      totalGap += lineYs[i] - lineYs[i - 1];
    }
    return totalGap / (lineYs.length - 1);
  }

  private sameStyle(a: TextStyle, b: TextStyle): boolean {
    return (
      a.fontId === b.fontId &&
      a.fontSize === b.fontSize &&
      a.fontWeight === b.fontWeight &&
      a.fontStyle === b.fontStyle &&
      a.color.r === b.color.r &&
      a.color.g === b.color.g &&
      a.color.b === b.color.b
    );
  }
}
