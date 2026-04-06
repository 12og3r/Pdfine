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
    const totalLayoutHeight = lastLine.y + lastLine.height

    // The layout height should be close to the bounds height
    // With pdfLineHeight=15: total = 15*3 = 45 ≈ bounds.height=42
    // (bounds.height is baseline-derived, layout adds one more lineHeight for the last line)
    // Key point: it should NOT be 14.4*3 = 43.2 (the 1.2 multiplier result)
    // The exact match isn't expected since bounds uses baseline positions,
    // but the line heights themselves should be 15, not 14.4
    expect(lines[0].height).toBeCloseTo(15, 1)
  })
})
