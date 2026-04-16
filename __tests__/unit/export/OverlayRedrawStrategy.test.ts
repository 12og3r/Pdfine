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

/**
 * Regression test for the "edited title exports with widely-spaced letters"
 * bug. When pdfjs v5 registers a font via FontFace but doesn't expose raw
 * binary data (common for Type1/CID fonts), FontEmbedder falls back to
 * StandardFonts.Helvetica. Layout glyph x-positions were computed from Canvas
 * widths of the ORIGINAL font; drawing each glyph individually at those
 * positions with Helvetica advances produces visible gaps between characters
 * (user-visible as "Sem p l e PDF" — exported text looked blank/broken).
 *
 * Fix: group consecutive same-style glyphs within a line into a single
 * `drawText(runText, ...)` call. pdf-lib then lays out the string with the
 * embedded font's own advance widths — spacing is internally consistent even
 * when the fallback font differs from the original.
 */
describe('OverlayRedrawStrategy per-run glyph grouping', () => {
  let strategy: OverlayRedrawStrategy
  let mockPage: PDFPage
  let drawTextCalls: Array<{ char: string; opts: { x: number; y: number; size: number; font: PDFFont; color: unknown } }>
  let embeddedFonts: Map<string, PDFFont>
  const FONT_A = {} as PDFFont
  const FONT_B = {} as PDFFont

  beforeEach(() => {
    strategy = new OverlayRedrawStrategy()
    drawTextCalls = []
    mockPage = {
      drawRectangle: vi.fn(),
      drawText: vi.fn((char: string, opts) => {
        drawTextCalls.push({ char, opts })
      }),
    } as unknown as PDFPage
    embeddedFonts = new Map([
      ['FontA', FONT_A],
      ['FontB', FONT_B],
    ])
  })

  function buildBlock(lines: Array<{ glyphs: PositionedGlyph[]; baseline: number }>): TextBlock {
    const style = createTextStyle({ fontId: 'FontA', fontSize: 12 })
    const block = createTextBlock(
      [createParagraph([createTextRun('placeholder', style)])],
      { x: 0, y: 0, width: 200, height: 30 },
      true,
    )
    block.paragraphs[0].lines = lines.map(l => ({
      glyphs: l.glyphs,
      baseline: l.baseline,
      width: 0,
      height: 12,
      y: 0,
    }))
    return block
  }

  function glyph(char: string, x: number, overrides: Partial<PositionedGlyph['style']> = {}): PositionedGlyph {
    const style = createTextStyle({
      fontId: 'FontA',
      fontSize: 12,
      color: { r: 0, g: 0, b: 0, a: 1 },
      ...overrides,
    })
    return { char, x, y: 0, width: 6, height: 12, style }
  }

  it('groups consecutive same-style glyphs into a single drawText call per run', () => {
    // Six glyphs spelling "Semple", all same style.
    const glyphs = [
      glyph('S', 0),
      glyph('e', 8),
      glyph('m', 16),
      glyph('p', 28),
      glyph('l', 36),
      glyph('e', 42),
    ]
    const block = buildBlock([{ glyphs, baseline: 10 }])

    strategy.applyBlock(mockPage, block, 792, embeddedFonts)

    // Before the fix: 6 calls (one per glyph). After the fix: 1 call.
    expect(drawTextCalls).toHaveLength(1)
    expect(drawTextCalls[0].char).toBe('Semple')
    // Run's x must anchor at the FIRST glyph's x — pdf-lib advances the rest
    // using its embedded font's width table.
    expect(drawTextCalls[0].opts.x).toBeCloseTo(0, 4)
    expect(drawTextCalls[0].opts.font).toBe(FONT_A)
    expect(drawTextCalls[0].opts.size).toBe(12)
  })

  it('splits runs at style boundaries (font change)', () => {
    const glyphs = [
      glyph('A', 0, { fontId: 'FontA' }),
      glyph('B', 8, { fontId: 'FontA' }),
      glyph('C', 16, { fontId: 'FontB' }),
      glyph('D', 24, { fontId: 'FontB' }),
    ]
    const block = buildBlock([{ glyphs, baseline: 10 }])

    strategy.applyBlock(mockPage, block, 792, embeddedFonts)

    expect(drawTextCalls).toHaveLength(2)
    expect(drawTextCalls[0].char).toBe('AB')
    expect(drawTextCalls[0].opts.font).toBe(FONT_A)
    expect(drawTextCalls[1].char).toBe('CD')
    expect(drawTextCalls[1].opts.font).toBe(FONT_B)
    expect(drawTextCalls[1].opts.x).toBeCloseTo(16, 4)
  })

  it('splits runs at style boundaries (color change)', () => {
    const glyphs = [
      glyph('R', 0, { color: { r: 255, g: 0, b: 0, a: 1 } }),
      glyph('e', 8, { color: { r: 255, g: 0, b: 0, a: 1 } }),
      glyph('d', 16, { color: { r: 255, g: 0, b: 0, a: 1 } }),
      glyph('B', 24, { color: { r: 0, g: 0, b: 255, a: 1 } }),
      glyph('l', 32, { color: { r: 0, g: 0, b: 255, a: 1 } }),
      glyph('u', 40, { color: { r: 0, g: 0, b: 255, a: 1 } }),
    ]
    const block = buildBlock([{ glyphs, baseline: 10 }])

    strategy.applyBlock(mockPage, block, 792, embeddedFonts)

    expect(drawTextCalls).toHaveLength(2)
    expect(drawTextCalls[0].char).toBe('Red')
    expect(drawTextCalls[1].char).toBe('Blu')
  })

  it('splits runs at style boundaries (font size change)', () => {
    const glyphs = [
      glyph('B', 0, { fontSize: 36 }),
      glyph('i', 20, { fontSize: 36 }),
      glyph('g', 32, { fontSize: 36 }),
      glyph('s', 52, { fontSize: 12 }),
      glyph('m', 58, { fontSize: 12 }),
    ]
    const block = buildBlock([{ glyphs, baseline: 30 }])

    strategy.applyBlock(mockPage, block, 792, embeddedFonts)

    expect(drawTextCalls).toHaveLength(2)
    expect(drawTextCalls[0].char).toBe('Big')
    expect(drawTextCalls[0].opts.size).toBe(36)
    expect(drawTextCalls[1].char).toBe('sm')
    expect(drawTextCalls[1].opts.size).toBe(12)
  })

  it('includes spaces within a run (so pdf-lib advances correctly)', () => {
    // The per-glyph path skipped spaces. Per-run path must keep them so the
    // embedded font's own space width contributes to advance — otherwise
    // words collapse together in the export.
    const glyphs = [
      glyph('H', 0),
      glyph('i', 8),
      glyph(' ', 12),
      glyph('t', 16),
      glyph('o', 22),
    ]
    const block = buildBlock([{ glyphs, baseline: 10 }])

    strategy.applyBlock(mockPage, block, 792, embeddedFonts)

    expect(drawTextCalls).toHaveLength(1)
    expect(drawTextCalls[0].char).toBe('Hi to')
  })

  it('emits one run per line', () => {
    const line1 = [glyph('a', 0), glyph('b', 8)]
    const line2 = [glyph('c', 0), glyph('d', 8)]
    const block = buildBlock([
      { glyphs: line1, baseline: 10 },
      { glyphs: line2, baseline: 25 },
    ])

    strategy.applyBlock(mockPage, block, 792, embeddedFonts)

    expect(drawTextCalls).toHaveLength(2)
    expect(drawTextCalls[0].char).toBe('ab')
    expect(drawTextCalls[1].char).toBe('cd')
    // Different baselines → different y in PDF space.
    expect(drawTextCalls[0].opts.y).not.toBeCloseTo(drawTextCalls[1].opts.y, 4)
  })

  it('skips runs whose font is not embedded', () => {
    const glyphs = [
      glyph('A', 0, { fontId: 'FontA' }),
      glyph('B', 8, { fontId: 'FontA' }),
      glyph('?', 16, { fontId: 'MissingFont' }),
      glyph('C', 24, { fontId: 'FontA' }),
    ]
    const block = buildBlock([{ glyphs, baseline: 10 }])

    strategy.applyBlock(mockPage, block, 792, embeddedFonts)

    // Runs: "AB" [FontA] | "?" [MISSING, skipped] | "C" [FontA]
    expect(drawTextCalls).toHaveLength(2)
    expect(drawTextCalls[0].char).toBe('AB')
    expect(drawTextCalls[1].char).toBe('C')
  })
})
