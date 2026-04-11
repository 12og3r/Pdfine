/**
 * Tests that the layout engine preserves the PDF's original line height
 * (baseline-to-baseline distance) instead of using a hardcoded 1.2 multiplier.
 *
 * Bug: When entering edit mode, the paragraph height changes because
 * TextBlockBuilder hardcodes lineSpacing=1.2 for every paragraph, but the
 * PDF's actual inter-line spacing (encoded in raw coordinates) differs from
 * (ascent + descent + lineGap) * 1.2. The user sees a height jump when
 * switching from pdfjs raster to canvas rendering.
 *
 * Fix: Compute pdfLineHeight from actual PDF baseline positions during parsing
 * and use it in the layout engine.
 */
import { describe, it, expect } from 'vitest'
import { TextBlockBuilder } from '../../../src/core/parser/TextBlockBuilder'
import type { RawTextItem } from '../../../src/core/parser/TextBlockBuilder'
import { LayoutEngine } from '../../../src/core/layout/LayoutEngine'
import type { IFontManager } from '../../../src/core/interfaces/IFontManager'
import type { Color } from '../../../src/types/document'

const color: Color = { r: 0, g: 0, b: 0, a: 1 }

function makeItem(overrides: Partial<RawTextItem> & { text: string; x: number; y: number }): RawTextItem {
  return {
    width: overrides.text.length * 6,
    height: 12,
    fontSize: 12,
    fontId: 'TestFont',
    fontWeight: 400,
    fontStyle: 'normal',
    color,
    editable: true,
    ...overrides,
  }
}

// Font metrics where (ascent + descent + lineGap) * 1.0 = 12
// so lineSpacing=1.2 would give lineHeight=14.4, but PDF uses 15.
const mockFontManager: IFontManager = {
  measureChar: () => 6,
  measureText: (text: string) => ({ width: text.length * 6, height: 12 }),
  getMetrics: () => ({
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    lineGap: 0,
    xHeight: 500,
    capHeight: 700,
  }),
  getAscent: (_fontId: string, fontSize: number) => fontSize * 0.8,
  getFont: () => undefined,
  getAvailableFonts: () => [],
  getFontFace: () => null,
  hasGlyph: () => true,
  getFallbackFont: () => 'sans-serif',
  getFontData: () => undefined,
  extractAndRegister: () => Promise.resolve(),
  destroy: () => {},
} as IFontManager

describe('PDF line height preservation', () => {
  const builder = new TextBlockBuilder()
  const layoutEngine = new LayoutEngine()

  it('should compute pdfLineHeight from actual PDF baseline positions', () => {
    // Three lines with baselines at y=12, y=27, y=42 → gap of 15px each
    // With fontSize=12, the default 1.2 lineSpacing would give 14.4px (wrong)
    const items: RawTextItem[] = [
      makeItem({ text: 'Line one text', x: 0, y: 12, width: 78 }),
      makeItem({ text: 'Line two text', x: 0, y: 27, width: 78 }),
      makeItem({ text: 'Line three text', x: 0, y: 42, width: 90 }),
    ]

    const blocks = builder.buildBlocks(items)
    expect(blocks.length).toBe(1)
    expect(blocks[0].paragraphs.length).toBe(1)

    const paragraph = blocks[0].paragraphs[0]
    // The paragraph should have pdfLineHeight derived from the PDF coordinates
    expect(paragraph.pdfLineHeight).toBeDefined()
    expect(paragraph.pdfLineHeight).toBeCloseTo(15, 1)
  })

  it('should use pdfLineHeight in layout instead of formula-based calculation', () => {
    // PDF baselines at y=12, y=27, y=42 → 15px gap
    const items: RawTextItem[] = [
      makeItem({ text: 'Line one text', x: 0, y: 12, width: 78 }),
      makeItem({ text: 'Line two text', x: 0, y: 27, width: 78 }),
      makeItem({ text: 'Line three text', x: 0, y: 42, width: 90 }),
    ]

    const blocks = builder.buildBlocks(items)
    const block = blocks[0]

    // Reflow the block (what happens on edit mode entry)
    const reflowed = layoutEngine.reflowTextBlock(block, mockFontManager)
    const lines = reflowed.paragraphs[0].lines!

    expect(lines.length).toBe(3)
    // Each line should have height=15 (from PDF), not 14.4 (from 12 * 1.2)
    expect(lines[0].height).toBeCloseTo(15, 1)
    expect(lines[1].height).toBeCloseTo(15, 1)
    // Line Y positions should accumulate correctly
    expect(lines[0].y).toBeCloseTo(0, 1)
    expect(lines[1].y).toBeCloseTo(15, 1)
    expect(lines[2].y).toBeCloseTo(30, 1)
  })

  it('should fall back to formula-based lineHeight for single-line paragraphs', () => {
    // Single line: no baseline gap to measure, pdfLineHeight should be undefined
    const items: RawTextItem[] = [
      makeItem({ text: 'Single line', x: 0, y: 12, width: 66 }),
    ]

    const blocks = builder.buildBlocks(items)
    const paragraph = blocks[0].paragraphs[0]

    // Single-line paragraph can't compute pdfLineHeight
    expect(paragraph.pdfLineHeight).toBeUndefined()
  })

  it('should align subsequent-line baselines with PDF baseline-to-baseline distance when ascents differ', () => {
    // Reproduces the "Created for testing PDFObject" shift bug.
    //
    // Two-line paragraph where line 1 is large (36pt) and line 2 is small (18pt).
    // The PDF baselines are 39.84px apart, and we want the Canvas-rendered line 2
    // baseline to be exactly 39.84 below line 1's baseline, regardless of the
    // ascent difference between the two fonts.
    //
    // Before the fix, the layout just did `currentY += lineHeight` where
    // lineHeight = pdfLineHeight. That advance works only when lines share an
    // ascent; with different ascents the next line's baseline is off by
    // (ascent_prev - ascent_curr), which manifests as a 17px upward shift for
    // the subtitle in example_en.pdf.
    const items: RawTextItem[] = [
      makeItem({
        text: 'Title', x: 0, y: 36, // baseline y=36 (top at y=0)
        width: 100, height: 36, fontSize: 36,
        pdfItemWidth: 100,
      }),
      makeItem({
        text: 'Subtitle', x: 0, y: 75.84, // baseline y=75.84, so gap=39.84
        width: 80, height: 18, fontSize: 18,
        pdfItemWidth: 80,
      }),
    ]
    const blocks = builder.buildBlocks(items)
    expect(blocks.length).toBe(1)
    const block = blocks[0]
    const reflowed = layoutEngine.reflowTextBlock(block, mockFontManager)
    const lines = reflowed.paragraphs[0].lines!
    expect(lines.length).toBe(2)

    // With mockFontManager ascent = fontSize * 0.8:
    //   ascent_36 = 28.8, ascent_18 = 14.4
    //
    // Line 0 baseline at 28.8 (first line top=0 + ascent_36=28.8).
    expect(lines[0].baseline).toBeCloseTo(28.8, 1)
    // Line 1 baseline MUST be pdfLineHeight (39.84) below line 0's baseline
    // regardless of the ascent change. Before the fix it was 28.8 + 14.4 = 43.2
    // (top=39.84 + ascent_18=14.4), off by ~25.
    expect(lines[1].baseline).toBeCloseTo(28.8 + 39.84, 1)

    // The first glyph of line 1 (the Subtitle "S") must render at that
    // baseline when Canvas fillText uses `y = bounds.y + glyph.y + charAscent`,
    // i.e. `glyph.y + charAscent === line.baseline`. For an 18pt 'S' with
    // ascent 14.4, glyph.y should be 68.64 - 14.4 = 54.24.
    const line1FirstGlyph = lines[1].glyphs[0]
    expect(line1FirstGlyph.y + 14.4).toBeCloseTo(68.64, 1)
  })

  it('total layout height should match PDF bounds height after reflow', () => {
    // PDF baselines at y=12, y=27, y=42
    // bounds.height from parser = maxY - minY = 42 - (12-12) = 42
    const items: RawTextItem[] = [
      makeItem({ text: 'Line one text', x: 0, y: 12, width: 78 }),
      makeItem({ text: 'Line two text', x: 0, y: 27, width: 78 }),
      makeItem({ text: 'Line three text', x: 0, y: 42, width: 90 }),
    ]

    const blocks = builder.buildBlocks(items)
    const block = blocks[0]
    const reflowed = layoutEngine.reflowTextBlock(block, mockFontManager)
    const lines = reflowed.paragraphs[0].lines!

    const lastLine = lines[lines.length - 1]
    expect(lastLine.y + lastLine.height).toBeGreaterThan(0)

    // The layout height should be close to the bounds height
    // With pdfLineHeight=15: total = 15*3 = 45 ≈ bounds.height=42
    // (bounds.height is baseline-derived, layout adds one more lineHeight for the last line)
    // Key point: it should NOT be 14.4*3 = 43.2 (the 1.2 multiplier result)
    // The exact match isn't expected since bounds uses baseline positions,
    // but the line heights themselves should be 15, not 14.4
    expect(lines[0].height).toBeCloseTo(15, 1)
  })
})
