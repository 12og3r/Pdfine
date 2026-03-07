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

    for (let li = 0; li < group.lines.length; li++) {
      const line = group.lines[li];

      // Check if this is a new paragraph within the block
      if (li > 0) {
        const prevFontSize = group.lines[li - 1].items[0].fontSize;
        const lineGap = line.y - prevLineY;
        if (lineGap > prevFontSize * 1.5) {
          // New paragraph
          if (currentRuns.length > 0) {
            paragraphs.push(createParagraph(currentRuns, 'left', DEFAULT_LINE_SPACING));
            currentRuns = [];
          }
        }
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
              }
            }
            lastRun.text += item.text;
            continue;
          }
        }

        currentRuns.push(createTextRun(item.text, style));
      }

      // Add space/newline between lines
      if (li < group.lines.length - 1 && currentRuns.length > 0) {
        currentRuns[currentRuns.length - 1].text += ' ';
      }

      prevLineY = line.y;
    }

    if (currentRuns.length > 0) {
      paragraphs.push(createParagraph(currentRuns, 'left', DEFAULT_LINE_SPACING));
    }

    // Ensure at least one paragraph
    if (paragraphs.length === 0) {
      paragraphs.push(createParagraph([createTextRun('', createTextStyle({ fontId: 'default', fontSize: 12 }))], 'left', DEFAULT_LINE_SPACING));
    }

    return createTextBlock(paragraphs, bounds, group.editable);
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
