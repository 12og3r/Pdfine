/**
 * Regression test for "double-click a name shifts the block and the text looks
 * heavier" — reported against a Singapore employment certificate (private file),
 * repro text "Liu Xiaojian".
 *
 * Root cause: `EditorCore.adjustBoundsToFontAscent()` corrects the block's
 * bounds.y by `fontSize - ascent`, assuming that `TextBlockBuilder` sets
 * `bounds.y = baseline - fontSize`. In reality the builder computes
 * `bounds.y = min(item.y - item.height)` (see `TextBlockBuilder.buildBlock`).
 * pdfjs reports `textItem.height` as the glyph bounding-box height, which for
 * many real-world fonts (CJK / condensed / display) differs from the text's
 * `fontSize` (= `|transform[3]|`).
 *
 * Consequence when `item.height !== fontSize`:
 *   - current correction leaves bounds.y at `baseline - ascent + (fontSize -
 *     item.height)` instead of the desired `baseline - ascent`
 *   - on edit-mode entry, Canvas `fillText` positions the first line at
 *     `bounds.y + ascent == baseline + (fontSize - item.height)`, which is
 *     not the pdfjs raster's baseline → a visible vertical jump
 *   - the white overlay is sized against the shifted bounds, so it no longer
 *     fully covers the original raster; the ghost glyph outlines leak past
 *     the overlay and stack on top of the canvas-redrawn glyphs, which reads
 *     as a "font weight changed / got bolder" visual.
 *
 * Fix: store the first-line baseline on the block at parse time, and use
 * `baseline - ascent` as the target bounds.y on adjust — no reliance on
 * `item.height == fontSize`.
 */
import { describe, it, expect } from 'vitest'
import { TextBlockBuilder } from '../../../src/core/parser/TextBlockBuilder'
import type { RawTextItem } from '../../../src/core/parser/TextBlockBuilder'
import { LayoutEngine } from '../../../src/core/layout/LayoutEngine'
import type { IFontManager } from '../../../src/core/interfaces/IFontManager'
import type { Color, TextBlock, DocumentModel } from '../../../src/types/document'
import { EditorCore } from '../../../src/core/EditorCore'

const color: Color = { r: 0, g: 0, b: 0, a: 1 }

/** Minimal mock FontManager with tunable ascent. `ascent < fontSize` matches
 *  real fonts; the ratio (0.78) is typical for Latin faces. */
function makeFontManager(ascentRatio: number, charWidth: number): IFontManager {
  return {
    measureChar: () => charWidth,
    measureText: (text: string) => ({ width: text.length * charWidth, height: 12 }),
    getMetrics: () => ({
      unitsPerEm: 1000,
      ascender: Math.round(1000 * ascentRatio),
      descender: -Math.round(1000 * (1 - ascentRatio)),
      lineGap: 0,
      xHeight: 500,
      capHeight: 700,
    }),
    getAscent: (_fontId: string, fontSize: number) => fontSize * ascentRatio,
    getFont: () => undefined,
    getAvailableFonts: () => [],
    getFontFace: () => null,
    hasGlyph: () => true,
    getFallbackFont: () => 'sans-serif',
    getFontData: () => undefined,
    extractAndRegister: () => Promise.resolve(),
    destroy: () => {},
  } as IFontManager
}

function mk(
  text: string,
  x: number,
  baselineY: number,
  opts: { fontSize: number; itemHeight: number; fontId?: string; width?: number },
): RawTextItem {
  const width = opts.width ?? text.length * 5
  return {
    text,
    x,
    y: baselineY,
    width,
    height: opts.itemHeight,
    fontSize: opts.fontSize,
    fontId: opts.fontId ?? 'TestFont',
    fontWeight: 400,
    fontStyle: 'normal',
    color,
    editable: true,
    pdfItemWidth: width,
  }
}

/** Exercise `EditorCore.adjustBoundsToFontAscent` against a real `EditorCore`
 *  instance using a known FontManager. We only need the adjust side-effect
 *  and the block reflow — not pdfjs or rendering. */
function runAdjust(block: TextBlock, fontManager: IFontManager): TextBlock {
  const doc: DocumentModel = {
    metadata: { pageCount: 1, encrypted: false },
    pages: [{ index: 0, width: 612, height: 792, elements: [block], dirty: false }],
    fonts: new Map(),
  }
  // Pre-reflow so paragraphs have `.lines` populated (mirrors what loadPdf
  // does via reflowPage before calling adjustBoundsToFontAscent).
  const layout = new LayoutEngine()
  doc.pages[0].elements[0] = layout.reflowTextBlock(block, fontManager, { syncBounds: true })

  const core = new EditorCore()
  // Inject our FontManager so adjustBoundsToFontAscent uses the test's ascent.
  ;(core as unknown as { fontManager: IFontManager }).fontManager = fontManager
  ;(core as unknown as { adjustBoundsToFontAscent(d: DocumentModel): void })
    .adjustBoundsToFontAscent(doc)

  return doc.pages[0].elements[0] as TextBlock
}

describe('Edit-mode entry does not shift when item.height differs from fontSize', () => {
  it('Canvas render Y for first line matches pdfjs raster baseline', () => {
    // Simulate a text block like the one containing the "Liu Xiaojian"
    // employee-name cell: one short name at baseline=120, fontSize=11, but
    // pdfjs reports item.height=13 (font bounding box taller than fontSize,
    // typical of some CJK-capable fonts / text using vertical metrics).
    const fontSize = 11
    const itemHeight = 13 // differs from fontSize — the exact case that breaks the current fix
    const baseline = 120
    const items: RawTextItem[] = [
      mk('Liu Xiaojian', 200, baseline, { fontSize, itemHeight }),
    ]

    const blocks = new TextBlockBuilder().buildBlocks(items)
    expect(blocks.length).toBe(1)
    const block = blocks[0]

    // Sanity: TextBlockBuilder sets bounds.y to baseline - item.height (NOT baseline - fontSize).
    // This is the hidden assumption mismatch that causes the shift.
    expect(block.bounds.y).toBeCloseTo(baseline - itemHeight, 2)

    const ascentRatio = 0.8
    const fontManager = makeFontManager(ascentRatio, 5)
    const adjusted = runAdjust(block, fontManager)

    // What Canvas's TextRenderer will draw the first line's baseline at:
    //   py = bounds.y + glyph.y + charAscent
    // For the first line, glyph.y = 0 (layout sets lineY=0 and
    // effBaseline == charBaseline == charAscent for a single-font line).
    // So: renderBaselineY = bounds.y + ascent.
    const ascent = fontSize * ascentRatio
    const renderBaselineY = adjusted.bounds.y + ascent

    // For the canvas redraw to land exactly on top of the pdfjs raster (no
    // visible shift between the two rendering paths), renderBaselineY must
    // equal the original PDF baseline.
    expect(
      renderBaselineY,
      `Expected Canvas render Y (${renderBaselineY}) to match pdfjs baseline (${baseline}) — ` +
      `a mismatch means the block will visibly jump on edit-mode entry and the white ` +
      `overlay won't fully cover the raster, causing a ghost that reads as a font-weight change.`,
    ).toBeCloseTo(baseline, 2)
  })

  it('holds for the typical case where item.height equals fontSize', () => {
    // Regression guard: make sure the fix doesn't break the common path
    // where pdfjs reports item.height == fontSize.
    const fontSize = 12
    const baseline = 100
    const items: RawTextItem[] = [
      mk('Hello', 50, baseline, { fontSize, itemHeight: fontSize }),
    ]
    const blocks = new TextBlockBuilder().buildBlocks(items)
    const ascentRatio = 0.78
    const fontManager = makeFontManager(ascentRatio, 5)
    const adjusted = runAdjust(blocks[0], fontManager)

    const ascent = fontSize * ascentRatio
    const renderBaselineY = adjusted.bounds.y + ascent
    expect(renderBaselineY).toBeCloseTo(baseline, 2)
  })
})
