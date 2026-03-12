import { describe, it, expect } from 'vitest'
import { ParagraphLayout } from '../../../src/core/layout/ParagraphLayout'
import { GreedyLineBreaker } from '../../../src/core/layout/GreedyLineBreaker'
import type { IFontManager } from '../../../src/core/interfaces/IFontManager'
import type { Paragraph, TextRun } from '../../../src/types/document'
import { createTextStyle, createTextRun, createParagraph } from '../../../src/core/model/DocumentModel'

/**
 * Mock font manager that returns proportional widths for characters.
 * 'V' is wider than 's', which is wider than 'i'.
 */
function createProportionalFontManager(): IFontManager {
  const charWidthMap: Record<string, number> = {
    'V': 8.0,
    'i': 3.0,
    's': 5.0,
    'u': 6.0,
    'a': 5.5,
    'l': 3.0,
    ' ': 3.0,
  }
  return {
    measureChar: (char: string) => charWidthMap[char] ?? 6.0,
    measureText: (text: string) => ({
      width: text.split('').reduce((sum, c) => sum + (charWidthMap[c] ?? 6.0), 0),
      height: 14,
    }),
    getMetrics: () => ({
      unitsPerEm: 1000, ascender: 800, descender: -200,
      lineGap: 0, xHeight: 500, capHeight: 700,
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
  }
}

describe('Proportional PDF width scaling', () => {
  const layout = new ParagraphLayout()
  const breaker = new GreedyLineBreaker()

  it('should produce proportional per-character widths, not uniform widths', () => {
    const fm = createProportionalFontManager()
    const style = createTextStyle({ fontId: 'test', fontSize: 12 })

    // Create a run with pdfRunWidth but no pdfCharWidths
    // This simulates a run parsed from PDF where we know the total width
    // Canvas measures: V=8, i=3, s=5 → canvasTotal=16
    // pdfRunWidth=32 → scale=2.0
    // Expected: V=16, i=6, s=10 (proportional, not uniform 32/3=10.67)
    const run: TextRun = createTextRun('Vis', style)
    run.pdfRunWidth = 32

    const paragraph: Paragraph = createParagraph([run], 'left', 1.2)
    const lines = layout.layoutParagraph(paragraph, 500, fm, breaker, 0)

    expect(lines.length).toBe(1)
    const glyphs = lines[0].glyphs
    expect(glyphs.length).toBe(3)

    // Check that widths are proportional, NOT uniform
    const vWidth = glyphs[0].width
    const iWidth = glyphs[1].width
    const sWidth = glyphs[2].width

    // V should be wider than i (proportional)
    expect(vWidth).toBeGreaterThan(iWidth)
    // s should be wider than i
    expect(sWidth).toBeGreaterThan(iWidth)
    // V should be wider than s
    expect(vWidth).toBeGreaterThan(sWidth)

    // Total width should match pdfRunWidth (within floating point tolerance)
    expect(vWidth + iWidth + sWidth).toBeCloseTo(32, 5)

    // Verify exact proportional values: scale = 32/16 = 2.0
    expect(vWidth).toBeCloseTo(16, 5)  // 8 * 2.0
    expect(iWidth).toBeCloseTo(6, 5)   // 3 * 2.0
    expect(sWidth).toBeCloseTo(10, 5)  // 5 * 2.0
  })

  it('should NOT produce uniform widths from pdfRunWidth', () => {
    const fm = createProportionalFontManager()
    const style = createTextStyle({ fontId: 'test', fontSize: 12 })

    const run: TextRun = createTextRun('Visual', style)
    // Canvas: V=8, i=3, s=5, u=6, a=5.5, l=3 → total=30.5
    // PDF total width = 61 → scale = 2.0
    run.pdfRunWidth = 61

    const paragraph: Paragraph = createParagraph([run], 'left', 1.2)
    const lines = layout.layoutParagraph(paragraph, 500, fm, breaker, 0)

    const glyphs = lines[0].glyphs
    // All chars should NOT have the same width (that's the bug we're fixing)
    const widths = glyphs.map(g => g.width)
    const allSame = widths.every(w => Math.abs(w - widths[0]) < 0.001)
    expect(allSame).toBe(false)
  })

  it('should store computed proportional widths back on the run so subsequent layouts preserve them', () => {
    const fm = createProportionalFontManager()
    const style = createTextStyle({ fontId: 'test', fontSize: 12 })

    // Simulate a run parsed from PDF: has pdfRunWidth but no pdfCharWidths
    // Canvas: V=8, i=3, s=5 → canvasTotal=16, pdfRunWidth=32, scale=2.0
    const run: TextRun = createTextRun('Vis', style)
    run.pdfRunWidth = 32

    const paragraph: Paragraph = createParagraph([run], 'left', 1.2)

    // First layout: computes proportional widths
    const lines1 = layout.layoutParagraph(paragraph, 500, fm, breaker, 0)
    const glyphs1 = lines1[0].glyphs

    // After first layout, run should have pdfCharWidths stored
    expect(run.pdfCharWidths).toBeDefined()
    expect(run.pdfCharWidths!.length).toBe(3)
    expect(run.pdfCharWidths![0]).toBeCloseTo(16, 5) // V
    expect(run.pdfCharWidths![1]).toBeCloseTo(6, 5)  // i
    expect(run.pdfCharWidths![2]).toBeCloseTo(10, 5) // s

    // pdfRunWidth should be cleared
    expect(run.pdfRunWidth).toBeUndefined()

    // Simulate text insertion: add 'Z' at end
    run.text = 'VisZ'
    // insertPlainText would splice NaN into pdfCharWidths for new char
    run.pdfCharWidths!.push(NaN)

    // Second layout: should preserve original char widths, use canvas for new char
    const lines2 = layout.layoutParagraph(paragraph, 500, fm, breaker, 0)
    const glyphs2 = lines2[0].glyphs

    // Original chars should keep their proportional widths (not re-scaled)
    expect(glyphs2[0].width).toBeCloseTo(16, 5) // V still 16
    expect(glyphs2[1].width).toBeCloseTo(6, 5)  // i still 6
    expect(glyphs2[2].width).toBeCloseTo(10, 5) // s still 10
    // Z should use canvas measurement (6.0 default)
    expect(glyphs2[3].width).toBeCloseTo(6, 5)
  })

  it('should fall back to canvas widths when no pdfRunWidth is set', () => {
    const fm = createProportionalFontManager()
    const style = createTextStyle({ fontId: 'test', fontSize: 12 })

    const run: TextRun = createTextRun('Vis', style)
    // No pdfRunWidth, no pdfCharWidths → pure canvas measurement

    const paragraph: Paragraph = createParagraph([run], 'left', 1.2)
    const lines = layout.layoutParagraph(paragraph, 500, fm, breaker, 0)

    const glyphs = lines[0].glyphs
    expect(glyphs[0].width).toBeCloseTo(8, 5)  // V
    expect(glyphs[1].width).toBeCloseTo(3, 5)  // i
    expect(glyphs[2].width).toBeCloseTo(5, 5)  // s
  })
})
