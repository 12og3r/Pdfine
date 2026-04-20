import type { TextBlock, PageModel } from '../../types/document';
import type { IFontManager } from '../interfaces/IFontManager';
import type { ILayoutEngine } from '../interfaces/ILayoutEngine';
import { GreedyLineBreaker } from './GreedyLineBreaker';
import { KnuthPlassLineBreaker } from './KnuthPlassLineBreaker';
import { ParagraphLayout } from './ParagraphLayout';
import type { LineBreaker } from './ParagraphLayout';
import { OverflowHandler } from './OverflowHandler';

export class LayoutEngine implements ILayoutEngine {
  private strategy: 'greedy' | 'knuth-plass' = 'greedy';
  private greedyBreaker = new GreedyLineBreaker();
  private knuthPlassBreaker = new KnuthPlassLineBreaker();
  private paragraphLayout = new ParagraphLayout();
  private overflowHandler = new OverflowHandler();

  setStrategy(strategy: 'greedy' | 'knuth-plass'): void {
    this.strategy = strategy;
  }

  getStrategy(): 'greedy' | 'knuth-plass' {
    return this.strategy;
  }

  reflowTextBlock(block: TextBlock, fontManager: IFontManager, options?: { autoGrow?: boolean; syncBounds?: boolean }): TextBlock {
    const lineBreaker = this.getLineBreaker();
    // In autoGrow mode, single-line blocks use Infinity so text stays on one line
    // and the block grows horizontally. Multi-line blocks keep original width and grow vertically.
    const isSingleLine = block.originalBounds.height < (block.paragraphs[0]?.runs[0]?.style.fontSize ?? 12) * 1.8;
    const maxWidth = (options?.autoGrow && isSingleLine) ? Infinity : block.bounds.width;

    // Layout each paragraph. When the parser captured per-paragraph
    // `firstBaselineY`, anchor each paragraph's first line at
    // `paragraph.firstBaselineY - block.firstBaselineY` so the rendered
    // baselines land exactly where they did in the source PDF — single-
    // line paragraphs without `pdfLineHeight` would otherwise use the
    // formula-based `fontSize * lineSpacing` inter-line gap, which for
    // a 9 pt font is 10.8 px even though the actual PDF gap between
    // rows is often 13.5 px. Every paragraph after the first accumulates
    // this ~2.7 px error upward, visible as the whole block jumping up
    // on edit-mode entry (reproduced in the "TikTok Pte. Ltd." block on
    // the SGP employment certificate).
    let currentY = 0;
    const blockBaselineY = block.firstBaselineY;
    const paragraphs = block.paragraphs.map((paragraph, idx) => {
      if (
        idx > 0 &&
        paragraph.firstBaselineY !== undefined &&
        blockBaselineY !== undefined
      ) {
        currentY = paragraph.firstBaselineY - blockBaselineY;
      }
      const lines = this.paragraphLayout.layoutParagraph(
        paragraph, maxWidth, fontManager, lineBreaker, currentY,
      );
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        currentY = lastLine.y + lastLine.height;
      }
      return { ...paragraph, lines };
    });

    let updatedBlock: TextBlock = { ...block, paragraphs };

    // syncBounds: update bounds.height to match actual content height.
    // Used during initial load and edit-start to prevent false overflow
    // when bounds (from PDF coordinates) don't account for the full
    // lineHeight of the last line.
    if (options?.syncBounds) {
      const contentHeight = currentY;
      if (contentHeight > updatedBlock.bounds.height) {
        updatedBlock = {
          ...updatedBlock,
          bounds: { ...updatedBlock.bounds, height: contentHeight },
          originalBounds: { ...updatedBlock.originalBounds, height: contentHeight },
        };
      }
    }

    if (options?.autoGrow) {
      // Auto-grow: expand bounds to fit content, skip overflow handling
      const contentHeight = currentY;
      const contentWidth = this.computeMaxLineWidth(paragraphs);
      const newBounds = { ...block.bounds };
      if (contentHeight > newBounds.height) {
        newBounds.height = contentHeight;
      }
      if (contentWidth > newBounds.width) {
        newBounds.width = contentWidth;
      }
      updatedBlock = { ...updatedBlock, bounds: newBounds, overflowState: { status: 'normal' } };
      return updatedBlock;
    }

    // Handle overflow detection and auto-shrink
    updatedBlock = this.overflowHandler.detectAndHandle(updatedBlock, fontManager, lineBreaker);

    // If auto-shrunk, we need to re-layout with the adjusted paragraphs
    if (updatedBlock.overflowState.status === 'auto_shrunk') {
      currentY = 0;
      const relaidParagraphs = updatedBlock.paragraphs.map((paragraph, idx) => {
        if (
          idx > 0 &&
          paragraph.firstBaselineY !== undefined &&
          blockBaselineY !== undefined
        ) {
          currentY = paragraph.firstBaselineY - blockBaselineY;
        }
        const lines = this.paragraphLayout.layoutParagraph(
          paragraph, maxWidth, fontManager, lineBreaker, currentY,
        );
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          currentY = lastLine.y + lastLine.height;
        }
        return { ...paragraph, lines };
      });
      updatedBlock = { ...updatedBlock, paragraphs: relaidParagraphs };
    }

    return updatedBlock;
  }

  private computeMaxLineWidth(paragraphs: { lines?: import('../../types/document').LayoutLine[] }[]): number {
    let maxWidth = 0;
    for (const p of paragraphs) {
      if (!p.lines) continue;
      for (const line of p.lines) {
        if (line.glyphs.length === 0) continue;
        const lastGlyph = line.glyphs[line.glyphs.length - 1];
        const lineWidth = lastGlyph.x + lastGlyph.width;
        if (lineWidth > maxWidth) maxWidth = lineWidth;
      }
    }
    return maxWidth;
  }

  reflowPage(page: PageModel, fontManager: IFontManager): PageModel {
    const elements = page.elements.map(element => {
      if (element.type === 'text') {
        return this.reflowTextBlock(element, fontManager, { syncBounds: true });
      }
      return element;
    });

    return { ...page, elements, dirty: false };
  }

  private getLineBreaker(): LineBreaker {
    return this.strategy === 'greedy' ? this.greedyBreaker : this.knuthPlassBreaker;
  }
}
