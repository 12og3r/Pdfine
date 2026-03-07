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
      const para = block.paragraphs[pi];
      if (!para.lines) continue;
      for (const line of para.lines) {
        for (let gi = 0; gi < line.glyphs.length; gi++) {
          if (globalIdx === offset) {
            const g = line.glyphs[gi];
            return { x: g.x + block.bounds.x, y: g.y + block.bounds.y, height: g.height, paragraphIdx: pi, runIdx: 0 };
          }
          globalIdx++;
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

  private findCurrentLine(block: TextBlock): { lineStartOffset: number; lineEndOffset: number } {
    let globalIdx = 0;
    for (const para of block.paragraphs) {
      if (!para.lines) continue;
      for (const line of para.lines) {
        const lineStart = globalIdx;
        const lineEnd = globalIdx + line.glyphs.length;
        if (this.charOffset >= lineStart && this.charOffset <= lineEnd) {
          return { lineStartOffset: lineStart, lineEndOffset: lineEnd };
        }
        globalIdx = lineEnd;
      }
    }
    const textLen = getTextContent(block).length;
    return { lineStartOffset: 0, lineEndOffset: textLen };
  }

  private moveVertical(block: TextBlock, direction: 'up' | 'down'): void {
    // Find current line and x position, then move to adjacent line
    const lines: { line: LayoutLine; startOffset: number }[] = [];
    let globalIdx = 0;
    for (const para of block.paragraphs) {
      if (!para.lines) continue;
      for (const line of para.lines) {
        lines.push({ line, startOffset: globalIdx });
        globalIdx += line.glyphs.length;
      }
    }

    // Find which line we're on
    let currentLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const end = lines[i].startOffset + lines[i].line.glyphs.length;
      if (this.charOffset >= lines[i].startOffset && this.charOffset <= end) {
        currentLineIdx = i;
        break;
      }
    }
    if (currentLineIdx === -1) return;

    const targetLineIdx = direction === 'up' ? currentLineIdx - 1 : currentLineIdx + 1;
    if (targetLineIdx < 0 || targetLineIdx >= lines.length) return;

    // Get current x position
    const cursorPos = this.getGlyphAtOffset(block, this.charOffset);
    if (!cursorPos) return;
    const targetX = cursorPos.x - block.bounds.x;

    // Find closest glyph on target line
    const targetLine = lines[targetLineIdx];
    let bestOffset = targetLine.startOffset;
    let bestDist = Infinity;
    for (let gi = 0; gi < targetLine.line.glyphs.length; gi++) {
      const g = targetLine.line.glyphs[gi];
      const dist = Math.abs(g.x - targetX);
      if (dist < bestDist) {
        bestDist = dist;
        bestOffset = targetLine.startOffset + gi;
      }
      // Also check right edge of glyph
      const distRight = Math.abs(g.x + g.width - targetX);
      if (distRight < bestDist) {
        bestDist = distRight;
        bestOffset = targetLine.startOffset + gi + 1;
      }
    }
    this.charOffset = Math.min(bestOffset, targetLine.startOffset + targetLine.line.glyphs.length);
  }

  destroy(): void {
    this.blockId = null;
  }
}
