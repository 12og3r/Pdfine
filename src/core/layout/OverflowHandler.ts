import type {
  TextBlock, Paragraph, ShrinkAdjustment,
} from '../../types/document';
import type { IFontManager } from '../interfaces/IFontManager';
import type { LineBreaker } from './ParagraphLayout';
import { ParagraphLayout } from './ParagraphLayout';
import {
  OVERFLOW_TOLERANCE_PERCENT,
  MIN_LINE_SPACING,
  MAX_LETTER_SPACING_REDUCTION,
  MAX_FONT_SIZE_REDUCTION_PT,
} from '../../config/constants';

export class OverflowHandler {
  private paragraphLayout = new ParagraphLayout();

  detectAndHandle(
    block: TextBlock,
    fontManager: IFontManager,
    lineBreaker: LineBreaker,
  ): TextBlock {
    const maxHeight = block.bounds.height;
    const maxWidth = block.bounds.width;

    // First compute layout height
    let contentHeight = this.computeContentHeight(block.paragraphs, maxWidth, fontManager, lineBreaker);

    // Layer 1: Normal - no overflow
    if (contentHeight <= maxHeight) {
      return { ...block, overflowState: { status: 'normal' } };
    }

    // Layer 1: Within tolerance (up to 15% overflow)
    const overflowPercent = ((contentHeight - maxHeight) / maxHeight) * 100;
    if (overflowPercent <= OVERFLOW_TOLERANCE_PERCENT) {
      return { ...block, overflowState: { status: 'within_tolerance', overflowPercent } };
    }

    // Layer 2: Auto-shrink
    const result = this.autoShrink(block, fontManager, lineBreaker);
    if (result) return result;

    // Layer 3: Still overflowing
    const finalHeight = this.computeContentHeight(block.paragraphs, maxWidth, fontManager, lineBreaker);
    const finalOverflow = ((finalHeight - maxHeight) / maxHeight) * 100;
    return { ...block, overflowState: { status: 'overflowing', overflowPercent: finalOverflow } };
  }

  private autoShrink(
    block: TextBlock,
    fontManager: IFontManager,
    lineBreaker: LineBreaker,
  ): TextBlock | null {
    const maxHeight = block.bounds.height;
    const maxWidth = block.bounds.width;
    const adjustments: ShrinkAdjustment[] = [];
    let paragraphs = this.deepCloneParagraphs(block.paragraphs);

    // Clear pdfLineHeight so formula-based lineSpacing adjustments can take effect
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].pdfLineHeight !== undefined) {
        paragraphs[i] = { ...paragraphs[i], pdfLineHeight: undefined };
      }
    }

    // Priority 1: Reduce lineSpacing
    const originalLineSpacings = paragraphs.map(p => p.lineSpacing);
    const step = 0.05;
    while (true) {
      let reduced = false;
      for (let i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].lineSpacing > MIN_LINE_SPACING) {
          paragraphs[i] = {
            ...paragraphs[i],
            lineSpacing: Math.max(MIN_LINE_SPACING, paragraphs[i].lineSpacing - step),
          };
          reduced = true;
        }
      }
      if (!reduced) break;

      const height = this.computeContentHeight(paragraphs, maxWidth, fontManager, lineBreaker);
      if (height <= maxHeight) {
        for (let i = 0; i < paragraphs.length; i++) {
          if (paragraphs[i].lineSpacing !== originalLineSpacings[i]) {
            adjustments.push({
              type: 'lineSpacing',
              originalValue: originalLineSpacings[i],
              adjustedValue: paragraphs[i].lineSpacing,
            });
          }
        }
        return {
          ...block,
          paragraphs,
          overflowState: { status: 'auto_shrunk', adjustments },
        };
      }
    }

    // Record line spacing adjustments even if not sufficient
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].lineSpacing !== originalLineSpacings[i]) {
        adjustments.push({
          type: 'lineSpacing',
          originalValue: originalLineSpacings[i],
          adjustedValue: paragraphs[i].lineSpacing,
        });
      }
    }

    // Priority 2: Reduce letterSpacing by 5%
    paragraphs = this.adjustLetterSpacing(paragraphs, -MAX_LETTER_SPACING_REDUCTION);
    let height = this.computeContentHeight(paragraphs, maxWidth, fontManager, lineBreaker);
    adjustments.push({
      type: 'letterSpacing',
      originalValue: 0,
      adjustedValue: -MAX_LETTER_SPACING_REDUCTION,
    });
    if (height <= maxHeight) {
      return {
        ...block,
        paragraphs,
        overflowState: { status: 'auto_shrunk', adjustments },
      };
    }

    // Priority 3: Reduce fontSize by 1pt at a time, max 3pt total
    for (let reduction = 1; reduction <= MAX_FONT_SIZE_REDUCTION_PT; reduction++) {
      const shrunkParagraphs = this.adjustFontSize(paragraphs, -1);
      paragraphs = shrunkParagraphs;
      height = this.computeContentHeight(paragraphs, maxWidth, fontManager, lineBreaker);

      if (height <= maxHeight) {
        adjustments.push({
          type: 'fontSize',
          originalValue: 0, // varies per run
          adjustedValue: -reduction,
        });
        return {
          ...block,
          paragraphs,
          overflowState: { status: 'auto_shrunk', adjustments },
        };
      }
    }

    // All attempts failed - return null to signal still overflowing
    return null;
  }

  private computeContentHeight(
    paragraphs: Paragraph[],
    maxWidth: number,
    fontManager: IFontManager,
    lineBreaker: LineBreaker,
  ): number {
    let y = 0;
    // Mirror `LayoutEngine.reflowTextBlock`'s baseline-anchored paragraph
    // stacking so overflow detection uses the same y advance that the
    // render pipeline will use. Without this, single-line paragraphs use
    // the formula-based gap (`fontSize * lineSpacing`) here while the
    // engine uses per-paragraph `firstBaselineY` — the two disagree by a
    // few px per paragraph and false-positive overflow can trigger on
    // load.
    const blockBaselineY = paragraphs[0]?.firstBaselineY;
    for (let idx = 0; idx < paragraphs.length; idx++) {
      const paragraph = paragraphs[idx];
      if (
        idx > 0 &&
        paragraph.firstBaselineY !== undefined &&
        blockBaselineY !== undefined
      ) {
        y = paragraph.firstBaselineY - blockBaselineY;
      }
      const lines = this.paragraphLayout.layoutParagraph(paragraph, maxWidth, fontManager, lineBreaker, y);
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        y = lastLine.y + lastLine.height;
      }
    }
    return y;
  }

  private deepCloneParagraphs(paragraphs: Paragraph[]): Paragraph[] {
    return paragraphs.map(p => ({
      ...p,
      runs: p.runs.map(r => ({
        ...r,
        style: { ...r.style },
      })),
    }));
  }

  private adjustLetterSpacing(paragraphs: Paragraph[], delta: number): Paragraph[] {
    return paragraphs.map(p => ({
      ...p,
      runs: p.runs.map(r => ({
        ...r,
        style: {
          ...r.style,
          letterSpacing: (r.style.letterSpacing ?? 0) + delta,
        },
      })),
    }));
  }

  private adjustFontSize(paragraphs: Paragraph[], delta: number): Paragraph[] {
    return paragraphs.map(p => ({
      ...p,
      runs: p.runs.map(r => ({
        ...r,
        style: {
          ...r.style,
          fontSize: Math.max(1, r.style.fontSize + delta),
        },
      })),
    }));
  }
}
