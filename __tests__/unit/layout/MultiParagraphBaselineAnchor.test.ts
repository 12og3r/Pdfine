/**
 * Regression test for "the TikTok Pte. Ltd. block jumps on edit-mode entry"
 * — reported against a private Singapore employment certificate.
 *
 * Repro layout (same shape as the real PDF block):
 *   Para 0: "TikTok Pte. Ltd."       (1 line, no pdfLineHeight)
 *   Para 1: "1 RAFFLES QUAY" +
 *           "#26-10, SOUTH TOWER"    (2 lines, pdfLineHeight = 13.5)
 *   Para 2: "SINGAPORE (048583)"     (1 line, no pdfLineHeight)
 *
 * PDF baselines: 156.25, 169.75 (+13.5), 183.25 (+13.5 within para 1),
 *                196.75 (+13.5 between para 1 and para 2).
 *
 * Bug: `LayoutEngine.reflowTextBlock` stacked paragraphs using
 * `currentY += lineHeight` where single-line paragraphs fall back to the
 * formula `fontSize * lineSpacing` (9 × 1.2 = 10.8 px). The real PDF gap
 * between paragraphs was 13.5 px, so every paragraph after the first
 * rendered ~2.7 px *above* its PDF baseline — users see the whole block
 * jump upward on double-click because the overlay is drawn against the
 * post-reflow bounds but the first paragraph is still pinned to the PDF
 * baseline via `adjustBoundsToFontAscent`.
 *
 * Fix: `Paragraph.firstBaselineY` (written by `TextBlockBuilder`) +
 * anchoring `currentY = paragraph.firstBaselineY - block.firstBaselineY`
 * at each new paragraph, so single-line paragraphs respect the original
 * PDF inter-paragraph gap regardless of the formula.
 */
import { describe, it, expect } from 'vitest'
import { LayoutEngine } from '../../../src/core/layout/LayoutEngine'
import type { IFontManager } from '../../../src/core/interfaces/IFontManager'
import type { TextBlock } from '../../../src/types/document'

const FONT_SIZE = 9
const CHAR_WIDTH = 5
const ASCENT_RATIO = 0.88

const fontManager = {
  measureChar: () => CHAR_WIDTH,
  measureText: (text: string) => ({ width: text.length * CHAR_WIDTH, height: FONT_SIZE }),
  getMetrics: () => ({
    unitsPerEm: 1000,
    ascender: Math.round(1000 * ASCENT_RATIO),
    descender: -Math.round(1000 * (1 - ASCENT_RATIO)),
    lineGap: 0, xHeight: 500, capHeight: 700,
  }),
  getAscent: (_fontId: string, fs: number) => fs * ASCENT_RATIO,
  getFont: () => undefined,
  getAvailableFonts: () => [],
  getFontFace: () => null,
  hasGlyph: () => true,
  getFallbackFont: () => 'sans-serif',
  getFontData: () => undefined,
  extractAndRegister: () => Promise.resolve(),
  destroy: () => {},
} as IFontManager

function mkRun(text: string, pdfRunWidth: number) {
  return {
    text,
    style: {
      fontId: 'Roboto', fontSize: FONT_SIZE, fontWeight: 700, fontStyle: 'normal' as const,
      color: { r: 0, g: 0, b: 0, a: 1 },
    },
    pdfRunWidth,
  }
}

describe('Multi-paragraph baseline anchoring on edit-mode reflow', () => {
  it('each paragraph first line lands on its original PDF baseline', () => {
    // PDF baselines extracted from the real TikTok block.
    // bounds.y = firstBaselineY - ascent (matches adjustBoundsToFontAscent).
    const ascent = FONT_SIZE * ASCENT_RATIO
    const firstBaselineY = 156.25
    const boundsY = firstBaselineY - ascent
    const block: TextBlock = {
      type: 'text',
      id: 'tb-tiktok',
      bounds: { x: 72, y: boundsY, width: 93.6, height: 48.5 },
      originalBounds: { x: 72, y: boundsY, width: 93.6, height: 48.5 },
      firstBaselineY,
      editable: true,
      overflowState: { status: 'normal' },
      paragraphs: [
        {
          runs: [mkRun('TikTok Pte. Ltd.', 16 * CHAR_WIDTH)],
          alignment: 'left',
          lineSpacing: 1.2,
          firstBaselineY: 156.25,
        },
        {
          runs: [mkRun('1 RAFFLES QUAY\n#26-10, SOUTH TOWER', 34 * CHAR_WIDTH)],
          alignment: 'left',
          lineSpacing: 1.2,
          pdfLineHeight: 13.5,
          firstBaselineY: 169.75,
        },
        {
          runs: [mkRun('SINGAPORE (048583)', 18 * CHAR_WIDTH)],
          alignment: 'left',
          lineSpacing: 1.2,
          firstBaselineY: 196.75,
        },
      ],
    }

    const reflowed = new LayoutEngine().reflowTextBlock(block, fontManager, { syncBounds: true })

    // For each paragraph, the rendered first-line baseline (in layout
    // coords, as TextRenderer will paint it) must equal the PDF baseline.
    // TextRenderer paints baseline at `bounds.y + line.baseline` (since
    // `line.baseline` is already absolute in the block's paragraph-stack
    // space).
    const by = reflowed.bounds.y
    const renderedBaselines = reflowed.paragraphs.map(p => by + (p.lines?.[0]?.baseline ?? NaN))
    const pdfBaselines = reflowed.paragraphs.map(p => p.firstBaselineY!)

    expect(renderedBaselines[0]).toBeCloseTo(pdfBaselines[0], 2)
    expect(renderedBaselines[1]).toBeCloseTo(pdfBaselines[1], 2)
    expect(renderedBaselines[2]).toBeCloseTo(pdfBaselines[2], 2)

    // Also guard the inter-paragraph gap: paragraph 1 must start 13.5 px
    // below paragraph 0's baseline (the actual PDF gap), NOT 10.8 px
    // (formula: fontSize * lineSpacing). Before the fix, the latter
    // applied and every subsequent paragraph drifted upward.
    expect(renderedBaselines[1] - renderedBaselines[0]).toBeCloseTo(13.5, 2)
    expect(renderedBaselines[2] - renderedBaselines[1]).toBeGreaterThan(10.9)
  })

  it('falls back to formula-based stacking when firstBaselineY is missing', () => {
    // Programmatically-created blocks (addTextBlock, etc.) don't have
    // firstBaselineY — the engine must still produce a valid layout.
    const block: TextBlock = {
      type: 'text',
      id: 'tb-programmatic',
      bounds: { x: 0, y: 0, width: 200, height: 40 },
      originalBounds: { x: 0, y: 0, width: 200, height: 40 },
      editable: true,
      overflowState: { status: 'normal' },
      paragraphs: [
        { runs: [mkRun('Hello', 5 * CHAR_WIDTH)], alignment: 'left', lineSpacing: 1.2 },
        { runs: [mkRun('World', 5 * CHAR_WIDTH)], alignment: 'left', lineSpacing: 1.2 },
      ],
    }

    const reflowed = new LayoutEngine().reflowTextBlock(block, fontManager)
    // Para 1 starts at FONT_SIZE * 1.2 after para 0's single line.
    const gap = (reflowed.paragraphs[1].lines?.[0]?.y ?? 0) - (reflowed.paragraphs[0].lines?.[0]?.y ?? 0)
    expect(gap).toBeCloseTo(FONT_SIZE * 1.2, 2)
  })
})
