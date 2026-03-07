import type {
  PageModel,
  TextBlock,
  ImageElement,
  PathElement,
  OverlayElement,
  LayoutLine,
} from '../../types/document';
import type { HitTestResult } from '../../types/ui';

interface GlyphLocation {
  paragraphIdx: number;
  runIdx: number;
  charOffset: number;
}

interface LineEntry {
  line: LayoutLine;
  glyphLocations: GlyphLocation[];
  blockId: string;
}

interface HitMap {
  lines: LineEntry[];
  imageElements: ImageElement[];
  pathElements: PathElement[];
  overlayElements: OverlayElement[];
}

export class HitTester {
  private hitMap: HitMap | null = null;

  buildHitMap(page: PageModel): void {
    const lines: LineEntry[] = [];
    const imageElements: ImageElement[] = [];
    const pathElements: PathElement[] = [];
    const overlayElements: OverlayElement[] = [];

    for (const element of page.elements) {
      switch (element.type) {
        case 'text':
          this.indexTextBlock(element, lines);
          break;
        case 'image':
          imageElements.push(element);
          break;
        case 'path':
          pathElements.push(element);
          break;
        case 'overlay':
          overlayElements.push(element);
          break;
      }
    }

    // Sort lines by y position for binary search
    lines.sort((a, b) => a.line.y - b.line.y);

    this.hitMap = { lines, imageElements, pathElements, overlayElements };
  }

  private indexTextBlock(block: TextBlock, lines: LineEntry[]): void {
    let globalCharOffset = 0;
    const bx = block.bounds.x;
    const by = block.bounds.y;

    for (let pIdx = 0; pIdx < block.paragraphs.length; pIdx++) {
      const paragraph = block.paragraphs[pIdx];
      if (!paragraph.lines) continue;

      let runIdx = 0;
      let charInRun = 0;

      for (const line of paragraph.lines) {
        const glyphLocations: GlyphLocation[] = [];

        // Create an adjusted line with absolute positions (block offset added)
        const adjustedGlyphs = line.glyphs.map(g => ({
          ...g,
          x: g.x + bx,
          y: g.y + by,
        }));
        const adjustedLine: LayoutLine = {
          ...line,
          glyphs: adjustedGlyphs,
          y: line.y + by,
        };

        for (const _glyph of line.glyphs) {
          glyphLocations.push({
            paragraphIdx: pIdx,
            runIdx,
            charOffset: globalCharOffset,
          });

          globalCharOffset++;
          charInRun++;

          while (
            runIdx < paragraph.runs.length &&
            charInRun >= paragraph.runs[runIdx].text.length
          ) {
            charInRun -= paragraph.runs[runIdx].text.length;
            runIdx++;
          }
        }

        lines.push({ line: adjustedLine, glyphLocations, blockId: block.id });
      }
    }
  }

  hitTest(x: number, y: number, pageIdx: number): HitTestResult | null {
    if (!this.hitMap) return null;

    // Check overlays first (top-most layer)
    for (let i = this.hitMap.overlayElements.length - 1; i >= 0; i--) {
      const el = this.hitMap.overlayElements[i];
      if (this.isInsideBounds(x, y, el.bounds)) {
        return {
          pageIdx,
          blockId: el.id,
          paragraphIdx: 0,
          runIdx: 0,
          charOffset: 0,
          elementType: 'overlay',
        };
      }
    }

    // Check text - binary search for line by y
    const textResult = this.hitTestText(x, y, pageIdx);
    if (textResult) return textResult;

    // Check images
    for (let i = this.hitMap.imageElements.length - 1; i >= 0; i--) {
      const el = this.hitMap.imageElements[i];
      if (this.isInsideBounds(x, y, el.bounds)) {
        return {
          pageIdx,
          blockId: el.id,
          paragraphIdx: 0,
          runIdx: 0,
          charOffset: 0,
          elementType: 'image',
        };
      }
    }

    // Check paths
    for (let i = this.hitMap.pathElements.length - 1; i >= 0; i--) {
      const el = this.hitMap.pathElements[i];
      if (this.isInsideBounds(x, y, el.bounds)) {
        return {
          pageIdx,
          blockId: el.id,
          paragraphIdx: 0,
          runIdx: 0,
          charOffset: 0,
          elementType: 'path',
        };
      }
    }

    return null;
  }

  private hitTestText(x: number, y: number, pageIdx: number): HitTestResult | null {
    if (!this.hitMap || this.hitMap.lines.length === 0) return null;

    // Binary search for the line closest to y
    const lines = this.hitMap.lines;
    let lo = 0;
    let hi = lines.length - 1;
    let bestLine = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const lineY = lines[mid].line.y;
      const lineBottom = lineY + lines[mid].line.height;

      if (y < lineY) {
        hi = mid - 1;
      } else if (y > lineBottom) {
        lo = mid + 1;
      } else {
        bestLine = mid;
        break;
      }
    }

    // If no exact hit, find the closest line
    if (bestLine === -1) {
      if (lo >= lines.length) {
        bestLine = lines.length - 1;
      } else if (hi < 0) {
        bestLine = 0;
      } else {
        // Pick the closer of lo and hi
        const distLo = lo < lines.length ? Math.abs(y - lines[lo].line.y) : Infinity;
        const distHi = hi >= 0 ? Math.abs(y - (lines[hi].line.y + lines[hi].line.height)) : Infinity;
        bestLine = distLo < distHi ? lo : hi;
      }
    }

    const entry = lines[bestLine];
    const lineGlyphs = entry.line.glyphs;
    if (lineGlyphs.length === 0) return null;

    // Check if y is reasonably close to this line
    const lineTop = entry.line.y;
    const lineBottom = lineTop + entry.line.height;
    if (y < lineTop - entry.line.height || y > lineBottom + entry.line.height) {
      return null;
    }

    // Linear search for the glyph by x
    let glyphIdx = lineGlyphs.length - 1; // default to last
    for (let i = 0; i < lineGlyphs.length; i++) {
      const glyph = lineGlyphs[i];
      if (x < glyph.x + glyph.width / 2) {
        glyphIdx = i;
        break;
      }
    }

    const loc = entry.glyphLocations[glyphIdx];
    if (!loc) return null;

    return {
      pageIdx,
      blockId: entry.blockId,
      paragraphIdx: loc.paragraphIdx,
      runIdx: loc.runIdx,
      charOffset: loc.charOffset,
      elementType: 'text',
    };
  }

  private isInsideBounds(
    x: number,
    y: number,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  clear(): void {
    this.hitMap = null;
  }
}
