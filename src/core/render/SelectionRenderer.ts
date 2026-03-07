import type { TextBlock, PositionedGlyph } from '../../types/document';
import type { CursorPosition, SelectionRange } from '../../types/ui';
import {
  SELECTION_COLOR,
  CURSOR_COLOR,
  CURSOR_BLINK_INTERVAL_MS,
} from '../../config/constants';

export class SelectionRenderer {
  private blinkVisible = true;
  private blinkTimer: ReturnType<typeof setInterval> | null = null;
  private onBlinkChange: (() => void) | null = null;

  startBlink(onChange: () => void): void {
    this.stopBlink();
    this.blinkVisible = true;
    this.onBlinkChange = onChange;
    this.blinkTimer = setInterval(() => {
      this.blinkVisible = !this.blinkVisible;
      this.onBlinkChange?.();
    }, CURSOR_BLINK_INTERVAL_MS);
  }

  stopBlink(): void {
    if (this.blinkTimer !== null) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = null;
    }
    this.blinkVisible = true;
    this.onBlinkChange = null;
  }

  resetBlink(): void {
    this.blinkVisible = true;
    if (this.blinkTimer !== null && this.onBlinkChange) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = setInterval(() => {
        this.blinkVisible = !this.blinkVisible;
        this.onBlinkChange?.();
      }, CURSOR_BLINK_INTERVAL_MS);
    }
  }

  renderSelection(
    ctx: CanvasRenderingContext2D,
    selection: SelectionRange,
    block: TextBlock,
    scale: number
  ): void {
    const glyphs = this.collectGlyphs(block);
    if (glyphs.length === 0) return;

    const start = Math.min(selection.startOffset, selection.endOffset);
    const end = Math.max(selection.startOffset, selection.endOffset);
    if (start === end) return;

    ctx.save();
    ctx.fillStyle = SELECTION_COLOR;

    // Group selected glyphs by line (same y value)
    const lineGroups = new Map<number, PositionedGlyph[]>();
    for (let i = start; i < end && i < glyphs.length; i++) {
      const g = glyphs[i];
      const lineY = g.y; // top of glyph (with textBaseline='top')
      // Find existing line group within threshold
      let foundKey: number | null = null;
      for (const key of lineGroups.keys()) {
        if (Math.abs(key - lineY) < 1) {
          foundKey = key;
          break;
        }
      }
      const key = foundKey ?? lineY;
      if (!lineGroups.has(key)) lineGroups.set(key, []);
      lineGroups.get(key)!.push(g);
    }

    for (const [, lineGlyphs] of lineGroups) {
      if (lineGlyphs.length === 0) continue;
      const firstGlyph = lineGlyphs[0];
      const lastGlyph = lineGlyphs[lineGlyphs.length - 1];
      const bx = block.bounds.x;
      const by = block.bounds.y;
      const x = (firstGlyph.x + bx) * scale;
      const y = (firstGlyph.y + by) * scale;
      const w = (lastGlyph.x + lastGlyph.width - firstGlyph.x) * scale;
      const h = firstGlyph.height * scale;
      ctx.fillRect(x, y, w, h);
    }

    ctx.restore();
  }

  renderCursor(
    ctx: CanvasRenderingContext2D,
    cursor: CursorPosition,
    scale: number
  ): void {
    if (!this.blinkVisible) return;

    ctx.save();
    ctx.fillStyle = CURSOR_COLOR;

    const x = cursor.x * scale;
    const y = cursor.y * scale;
    const height = cursor.height * scale;
    const width = 2;

    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  private collectGlyphs(block: TextBlock): PositionedGlyph[] {
    const result: PositionedGlyph[] = [];
    for (const paragraph of block.paragraphs) {
      if (!paragraph.lines) continue;
      for (const line of paragraph.lines) {
        for (const glyph of line.glyphs) {
          result.push(glyph);
        }
      }
    }
    return result;
  }

  destroy(): void {
    this.stopBlink();
  }
}
