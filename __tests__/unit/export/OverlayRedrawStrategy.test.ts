import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OverlayRedrawStrategy } from '../../../src/core/export/OverlayRedrawStrategy'
import {
  createTextBlock,
  createParagraph,
  createTextRun,
  createTextStyle,
} from '../../../src/core/model/DocumentModel'
import type { TextBlock, PositionedGlyph } from '../../../src/types/document'
import type { PDFFont, PDFPage } from 'pdf-lib'

/**
 * Regression test for the export crash triggered by the color-preservation fix
 * (commit 21829f8). Prior to that commit every glyph had `color = {r:0,g:0,b:0}`,
 * so passing `style.color` straight into pdf-lib's `rgb(r, g, b)` happened to
 * succeed (0 is in [0,1]). After the color fix, real fill colors from the PDF
 * (e.g. the "Sample PDF" title at rgb(46,116,181)) are 0-255 ints, which
 * pdf-lib rejects with `` `red` must be at least 0 and at most 1 ``.
 *
 * The fix is to normalize `Color` (0-255) to pdf-lib's 0-1 range in
 * `OverlayRedrawStrategy.redrawText()`.
 */

function makeBlockWithColor(r: number, g: number, b: number): TextBlock {
  const style = createTextStyle({
    fontId: 'TestFont',
    fontSize: 12,
    color: { r, g, b, a: 1 },
  })
  const block = createTextBlock(
    [createParagraph([createTextRun('Hi', style)])],
    { x: 10, y: 10, width: 100, height: 20 },
    true,
  )
  // Synthesize a minimal positioned glyph so redrawText has something to draw
  const glyph: PositionedGlyph = {
    char: 'H',
    x: 0,
    y: 0,
    width: 6,
    height: 12,
    style,
  }
  block.paragraphs[0].lines = [{
    glyphs: [glyph],
    baseline: 10,
    width: 6,
    height: 12,
    y: 0,
  }]
  return block
}

describe('OverlayRedrawStrategy color handling', () => {
  let strategy: OverlayRedrawStrategy
  let mockPage: PDFPage
  let drawTextCalls: Array<{ char: string; colorArg: { r: number; g: number; b: number } | unknown }>
  let embeddedFonts: Map<string, PDFFont>

  beforeEach(() => {
    strategy = new OverlayRedrawStrategy()
    drawTextCalls = []
    mockPage = {
      drawRectangle: vi.fn(),
      drawText: vi.fn((char: string, opts: { color: unknown }) => {
        drawTextCalls.push({ char, colorArg: opts.color })
      }),
    } as unknown as PDFPage
    // Return a minimal PDFFont mock (not actually called by our test)
    embeddedFonts = new Map([['TestFont', {} as PDFFont]])
  })

  it('should normalize 0-255 Color channels to pdf-lib 0-1 range', () => {
    // rgb(46, 116, 181) — the blue of the "Sample PDF" title. Before the fix,
    // pdf-lib's rgb() validator throws because 46 > 1.
    const block = makeBlockWithColor(46, 116, 181)

    // Must not throw.
    expect(() => strategy.applyBlock(mockPage, block, 792, embeddedFonts)).not.toThrow()

    expect(drawTextCalls.length).toBeGreaterThan(0)
    const color = drawTextCalls[0].colorArg as { type: string; red: number; green: number; blue: number }
    // pdf-lib rgb() returns a Color object with red/green/blue in [0,1].
    expect(color.red).toBeCloseTo(46 / 255, 4)
    expect(color.green).toBeCloseTo(116 / 255, 4)
    expect(color.blue).toBeCloseTo(181 / 255, 4)
  })

  it('should handle pure black (0, 0, 0)', () => {
    const block = makeBlockWithColor(0, 0, 0)
    expect(() => strategy.applyBlock(mockPage, block, 792, embeddedFonts)).not.toThrow()
    const color = drawTextCalls[0].colorArg as { red: number; green: number; blue: number }
    expect(color.red).toBe(0)
    expect(color.green).toBe(0)
    expect(color.blue).toBe(0)
  })

  it('should handle pure white (255, 255, 255)', () => {
    const block = makeBlockWithColor(255, 255, 255)
    expect(() => strategy.applyBlock(mockPage, block, 792, embeddedFonts)).not.toThrow()
    const color = drawTextCalls[0].colorArg as { red: number; green: number; blue: number }
    expect(color.red).toBe(1)
    expect(color.green).toBe(1)
    expect(color.blue).toBe(1)
  })

  it('should clamp out-of-range channel values to [0, 1]', () => {
    // Should survive channels slightly outside 0-255 from floating-point
    // quirks in the parser (seen with CMYK → RGB conversion rounding).
    const block = makeBlockWithColor(-1, 256, 128)
    expect(() => strategy.applyBlock(mockPage, block, 792, embeddedFonts)).not.toThrow()
    const color = drawTextCalls[0].colorArg as { red: number; green: number; blue: number }
    expect(color.red).toBeGreaterThanOrEqual(0)
    expect(color.red).toBeLessThanOrEqual(1)
    expect(color.green).toBeGreaterThanOrEqual(0)
    expect(color.green).toBeLessThanOrEqual(1)
  })
})
