import type { CursorPosition } from '../../types/ui'
import type { TextBlock, PageModel, LayoutLine, PositionedGlyph } from '../../types/document'
import type { EventBus } from '../infra/EventBus'
import { getTextContent } from './EditCommands'

export class CursorManager {
  private pageIdx = 0;
  private blockId: string | null = null;
  private charOffset = 0;

  private eventBus: EventBus;
  private getPageModel: (pageIdx: number) => PageModel | null;

  constructor(
    eventBus: EventBus,
    getPageModel: (pageIdx: number) => PageModel | null,
  ) {
    this.eventBus = eventBus;
    this.getPageModel = getPageModel;
  }

  setCursor(pageIdx: number, blockId: string, charOffset: number): void {
    this.pageIdx = pageIdx;
    this.blockId = blockId;
    this.charOffset = charOffset;
    this.eventBus.emit('cursorMoved', { pageIdx, blockId, charOffset });
  }

  getCharOffset(): number {
    return this.charOffset;
  }

  getBlockId(): string | null {
    return this.blockId;
  }

  getPageIdx(): number {
    return this.pageIdx;
  }

  moveCursor(direction: 'left' | 'right' | 'up' | 'down'): void {
    const block = this.getCurrentBlock();
    if (!block) return;
    const textLen = getTextContent(block).length;

    switch (direction) {
      case 'left':
        if (this.charOffset > 0) this.charOffset--;
        break;
      case 'right':
        if (this.charOffset < textLen) this.charOffset++;
        break;
      case 'up':
      case 'down':
        this.moveVertical(block, direction);
        break;
    }
    this.eventBus.emit('cursorMoved', { pageIdx: this.pageIdx, blockId: this.blockId!, charOffset: this.charOffset });
  }

  moveWordLeft(): void {
    const block = this.getCurrentBlock();
    if (!block) return;
    const text = getTextContent(block);
    let pos = this.charOffset;
    // Skip whitespace
    while (pos > 0 && /\s/.test(text[pos - 1])) pos--;
    // Skip word chars
    while (pos > 0 && !/\s/.test(text[pos - 1])) pos--;
    this.charOffset = pos;
    this.eventBus.emit('cursorMoved', { pageIdx: this.pageIdx, blockId: this.blockId!, charOffset: this.charOffset });
  }

  moveWordRight(): void {
    const block = this.getCurrentBlock();
    if (!block) return;
    const text = getTextContent(block);
    let pos = this.charOffset;
    // Skip word chars
    while (pos < text.length && !/\s/.test(text[pos])) pos++;
    // Skip whitespace
    while (pos < text.length && /\s/.test(text[pos])) pos++;
    this.charOffset = pos;
    this.eventBus.emit('cursorMoved', { pageIdx: this.pageIdx, blockId: this.blockId!, charOffset: this.charOffset });
  }

  moveToLineStart(): void {
    const block = this.getCurrentBlock();
    if (!block) return;
    const { lineStartOffset } = this.findCurrentLine(block);
    this.charOffset = lineStartOffset;
    this.eventBus.emit('cursorMoved', { pageIdx: this.pageIdx, blockId: this.blockId!, charOffset: this.charOffset });
  }

  moveToLineEnd(): void {
    const block = this.getCurrentBlock();
    if (!block) return;
    const { lineEndOffset } = this.findCurrentLine(block);
    this.charOffset = lineEndOffset;
    this.eventBus.emit('cursorMoved', { pageIdx: this.pageIdx, blockId: this.blockId!, charOffset: this.charOffset });
  }

  getCursorPosition(): CursorPosition | null {
    if (!this.blockId) return null;
    const block = this.getCurrentBlock();
    if (!block) return null;

    const glyphInfo = this.getGlyphAtOffset(block, this.charOffset);
    if (!glyphInfo) {
      // Fallback: position at start of block
      return {
        pageIdx: this.pageIdx,
        blockId: this.blockId,
        paragraphIdx: 0,
        runIdx: 0,
        charOffset: this.charOffset,
        x: block.bounds.x,
        y: block.bounds.y,
        height: 14,
      };
    }

    return {
      pageIdx: this.pageIdx,
      blockId: this.blockId,
      paragraphIdx: glyphInfo.paragraphIdx,
      runIdx: glyphInfo.runIdx,
      charOffset: this.charOffset,
      x: glyphInfo.x,
      y: glyphInfo.y,
      height: glyphInfo.height,
    };
  }

  private getCurrentBlock(): TextBlock | null {
    if (!this.blockId) return null;
    const page = this.getPageModel(this.pageIdx);
    if (!page) return null;
    for (const el of page.elements) {
      if (el.type === 'text' && el.id === this.blockId) return el;
    }
    return null;
  }

  private getAllGlyphs(block: TextBlock): PositionedGlyph[] {
    const glyphs: PositionedGlyph[] = [];
    for (const para of block.paragraphs) {
      if (para.lines) {
        for (const line of para.lines) {
          glyphs.push(...line.glyphs);
        }
      }
    }
    return glyphs;
  }

  private getGlyphAtOffset(block: TextBlock, offset: number): { x: number; y: number; height: number; paragraphIdx: number; runIdx: number } | null {
    let globalIdx = 0;
    for (let pi = 0; pi < block.paragraphs.length; pi++) {
      // Account for \n between paragraphs (consistent with getTextContent)
      if (pi > 0) {
        if (globalIdx === offset) {
          // Cursor is at the \n position — show it at end of previous paragraph
          const prevPara = block.paragraphs[pi - 1];
          if (prevPara.lines && prevPara.lines.length > 0) {
            const lastLine = prevPara.lines[prevPara.lines.length - 1];
            if (lastLine.glyphs.length > 0) {
              const lastGlyph = lastLine.glyphs[lastLine.glyphs.length - 1];
              return { x: lastGlyph.x + lastGlyph.width + block.bounds.x, y: lastGlyph.y + block.bounds.y, height: lastGlyph.height, paragraphIdx: pi - 1, runIdx: 0 };
            }
          }
        }
        globalIdx++; // count the \n
      }
      const para = block.paragraphs[pi];
      if (!para.lines) continue;

      // Build flat glyph list for this paragraph
      const paraGlyphs: PositionedGlyph[] = [];
      for (const line of para.lines) {
        for (const g of line.glyphs) {
          paraGlyphs.push(g);
        }
      }

      // Walk through run text, matching visible chars to glyphs
      let glyphIdx = 0;
      for (const run of para.runs) {
        for (let ci = 0; ci < run.text.length; ci++) {
          if (run.text[ci] === '\n') {
            // \n within run has no glyph but counts as a text offset
            if (globalIdx === offset) {
              // Position cursor at end of current line (after last glyph before this \n)
              if (glyphIdx > 0) {
                const g = paraGlyphs[glyphIdx - 1];
                return { x: g.x + g.width + block.bounds.x, y: g.y + block.bounds.y, height: g.height, paragraphIdx: pi, runIdx: 0 };
              } else if (paraGlyphs.length > 0) {
                const g = paraGlyphs[0];
                return { x: g.x + block.bounds.x, y: g.y + block.bounds.y, height: g.height, paragraphIdx: pi, runIdx: 0 };
              }
            }
            globalIdx++;
          } else {
            if (globalIdx === offset) {
              if (glyphIdx < paraGlyphs.length) {
                const g = paraGlyphs[glyphIdx];
                return { x: g.x + block.bounds.x, y: g.y + block.bounds.y, height: g.height, paragraphIdx: pi, runIdx: 0 };
              }
            }
            globalIdx++;
            glyphIdx++;
          }
        }
      }
    }
    // Cursor at end: position after last glyph
    const allGlyphs = this.getAllGlyphs(block);
    if (allGlyphs.length > 0) {
      const lastGlyph = allGlyphs[allGlyphs.length - 1];
      return {
        x: lastGlyph.x + lastGlyph.width + block.bounds.x,
        y: lastGlyph.y + block.bounds.y,
        height: lastGlyph.height,
        paragraphIdx: block.paragraphs.length - 1,
        runIdx: 0,
      };
    }
    return null;
  }

  /**
   * Counts how many \n characters exist in the paragraph's run text.
   * These are inter-line newlines that have no corresponding glyph.
   */
  private countNewlinesInRuns(para: { runs: { text: string }[] }): number {
    let count = 0;
    for (const run of para.runs) {
      for (let i = 0; i < run.text.length; i++) {
        if (run.text[i] === '\n') count++;
      }
    }
    return count;
  }

  /**
   * Gets the total text length for a paragraph (glyphs + \n chars in runs).
   */
  private getParaTextLength(para: { runs: { text: string }[], lines?: LayoutLine[] }): number {
    let len = 0;
    for (const run of para.runs) {
      len += run.text.length;
    }
    return len;
  }

  /**
   * Distributes \n characters across lines to compute per-line text offset ranges.
   * Returns array of { lineStart, lineEnd } in text offset space.
   */
  private getLineOffsetRanges(block: TextBlock): { lineStart: number; lineEnd: number }[] {
    const ranges: { lineStart: number; lineEnd: number }[] = [];
    let globalIdx = 0;
    for (let pi = 0; pi < block.paragraphs.length; pi++) {
      if (pi > 0) globalIdx++; // \n between paragraphs
      const para = block.paragraphs[pi];
      if (!para.lines) {
        globalIdx += this.getParaTextLength(para);
        continue;
      }

      // Walk through run text to find where each layout line's glyphs start/end
      // in text offset space, accounting for \n within runs
      const paraGlyphCounts: number[] = para.lines.map(l => l.glyphs.length);
      let glyphIdx = 0;
      let lineIdx = 0;
      let lineGlyphsSeen = 0;
      let lineStart = globalIdx;

      for (const run of para.runs) {
        for (let ci = 0; ci < run.text.length; ci++) {
          if (run.text[ci] === '\n') {
            globalIdx++;
          } else {
            glyphIdx++;
            lineGlyphsSeen++;
            globalIdx++;
            // Check if we've consumed all glyphs for the current line
            if (lineIdx < paraGlyphCounts.length && lineGlyphsSeen >= paraGlyphCounts[lineIdx]) {
              ranges.push({ lineStart, lineEnd: globalIdx });
              lineIdx++;
              lineGlyphsSeen = 0;
              lineStart = globalIdx;
            }
          }
        }
      }
      // Handle any remaining line (e.g., empty last line)
      if (lineIdx < paraGlyphCounts.length) {
        ranges.push({ lineStart, lineEnd: globalIdx });
      }
    }
    return ranges;
  }

  private findCurrentLine(block: TextBlock): { lineStartOffset: number; lineEndOffset: number } {
    const ranges = this.getLineOffsetRanges(block);
    for (const { lineStart, lineEnd } of ranges) {
      if (this.charOffset >= lineStart && this.charOffset <= lineEnd) {
        return { lineStartOffset: lineStart, lineEndOffset: lineEnd };
      }
    }
    const textLen = getTextContent(block).length;
    return { lineStartOffset: 0, lineEndOffset: textLen };
  }

  private moveVertical(block: TextBlock, direction: 'up' | 'down'): void {
    // Use getLineOffsetRanges to get text-offset-aware line boundaries
    const ranges = this.getLineOffsetRanges(block);

    // Collect layout lines in order
    const layoutLines: LayoutLine[] = [];
    for (const para of block.paragraphs) {
      if (para.lines) {
        for (const line of para.lines) {
          layoutLines.push(line);
        }
      }
    }

    if (ranges.length !== layoutLines.length) return;

    // Find which line we're on
    let currentLineIdx = -1;
    for (let i = 0; i < ranges.length; i++) {
      if (this.charOffset >= ranges[i].lineStart && this.charOffset <= ranges[i].lineEnd) {
        currentLineIdx = i;
        break;
      }
    }
    if (currentLineIdx === -1) return;

    const targetLineIdx = direction === 'up' ? currentLineIdx - 1 : currentLineIdx + 1;
    if (targetLineIdx < 0 || targetLineIdx >= ranges.length) return;

    // Get current x position
    const cursorPos = this.getGlyphAtOffset(block, this.charOffset);
    if (!cursorPos) return;
    const targetX = cursorPos.x - block.bounds.x;

    // Find closest glyph on target line
    const targetLine = layoutLines[targetLineIdx];
    const targetRange = ranges[targetLineIdx];
    let bestOffset = targetRange.lineStart;
    let bestDist = Infinity;

    // Build text-offset for each glyph on the target line
    // Glyphs are sequential visible chars, but text offsets may skip \n chars
    const glyphTextOffsets: number[] = [];
    {
      let idx = targetRange.lineStart;
      const text = getTextContent(block);
      let placed = 0;
      while (placed < targetLine.glyphs.length && idx < targetRange.lineEnd) {
        if (text[idx] === '\n') {
          idx++;
        } else {
          glyphTextOffsets.push(idx);
          placed++;
          idx++;
        }
      }
    }

    for (let gi = 0; gi < targetLine.glyphs.length; gi++) {
      const g = targetLine.glyphs[gi];
      const textOffset = glyphTextOffsets[gi] ?? targetRange.lineStart;
      const dist = Math.abs(g.x - targetX);
      if (dist < bestDist) {
        bestDist = dist;
        bestOffset = textOffset;
      }
      // Also check right edge of glyph
      const distRight = Math.abs(g.x + g.width - targetX);
      if (distRight < bestDist) {
        bestDist = distRight;
        bestOffset = textOffset + 1;
      }
    }
    this.charOffset = Math.min(bestOffset, targetRange.lineEnd);
  }

  destroy(): void {
    this.blockId = null;
  }
}
