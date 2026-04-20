/**
 * Regression test for the "labeled field table" reflow bug.
 *
 * Setup: a PDF text block that holds several rows of short "Label: Value"
 * pairs. Row-to-row baseline gap is `1.5 * fontSize` so TextBlockBuilder
 * keeps them in one paragraph (same-paragraph threshold is `> 1.5 *
 * fontSize`). Widest row ("Designation: ...") makes the block's bounds.width
 * much wider than each individual row.
 *
 * Bug: on edit-mode entry EditorCore calls `reflowTextBlock({ syncBounds:
 * true })`. `ParagraphLayout.flattenRuns` converts the inter-line `\n` back
 * to a space, then GreedyLineBreaker sees one long string and greedily
 * re-packs words into `bounds.width`. Because "Employee Name: ..." is far
 * narrower than the block, the next row's leading word gets pulled up onto
 * row 1 — the user sees the second line "jump onto" the first line.
 *
 * The test fails today (reflowed line count != PDF line count, and row 1 is
 * contaminated with row 2's text). Once fixed it should produce the same 4
 * rows the PDF originally had.
 */
import { describe, it, expect } from 'vitest'
import { TextBlockBuilder } from '../../../src/core/parser/TextBlockBuilder'
import type { RawTextItem } from '../../../src/core/parser/TextBlockBuilder'
import { LayoutEngine } from '../../../src/core/layout/LayoutEngine'
import type { IFontManager } from '../../../src/core/interfaces/IFontManager'
import type { Color } from '../../../src/types/document'

const color: Color = { r: 0, g: 0, b: 0, a: 1 }
const FONT_SIZE = 9
const CHAR_WIDTH = 5

function mk(text: string, x: number, y: number): RawTextItem {
  const width = text.length * CHAR_WIDTH
  return {
    text,
    x,
    y,
    width,
    height: FONT_SIZE,
    fontSize: FONT_SIZE,
    fontId: 'TestFont',
    fontWeight: 400,
    fontStyle: 'normal',
    color,
    editable: true,
    pdfItemWidth: width,
  }
}

const fontManager: IFontManager = {
  measureChar: () => CHAR_WIDTH,
  measureText: (text: string) => ({ width: text.length * CHAR_WIDTH, height: FONT_SIZE }),
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

describe('multi-line block reflow preservation on editStart', () => {
  it('does not collapse short PDF lines onto the preceding line', () => {
    // 4 rows, baselines 13.5 apart (= 1.5 * fontSize) → same paragraph.
    // Widest row dominates bounds.width; narrow rows are far below it.
    // Each row has a label item + value item (two runs merge into one in
    // TextBlockBuilder because the style matches — gap > 0.15 * fontSize
    // inserts a space).
    const items: RawTextItem[] = [
      mk('Employee Name:', 72, 13.5),
      mk('Alex Kim', 145, 13.5),

      mk('ID Number:', 72, 27),
      mk('AX-4712 (ZZ-ID)', 125, 27),

      mk('Start Date:', 72, 40.5),
      mk('03 November 2025', 130, 40.5),

      mk('Designation:', 72, 54),
      mk('Senior Staff Engineer - Infrastructure Platform', 128, 54),
    ]

    const blocks = new TextBlockBuilder().buildBlocks(items)
    expect(blocks.length, 'all four rows should collapse into one block').toBe(1)

    const block = blocks[0]
    expect(block.paragraphs.length, 'gap=1.5*fs keeps them in one paragraph').toBe(1)

    // Sanity: the parser joined the four PDF rows with '\n'.
    const paragraphText = block.paragraphs[0].runs.map(r => r.text).join('')
    const pdfLineSegments = paragraphText.split('\n')
    expect(pdfLineSegments.length).toBe(4)

    // Simulate `EditorCore`'s editStart handler.
    const reflowed = new LayoutEngine().reflowTextBlock(block, fontManager, { syncBounds: true })
    const reflowedLines = reflowed.paragraphs.flatMap(p => p.lines ?? [])
    const lineTexts = reflowedLines.map(l => l.glyphs.map(g => g.char).join(''))

    // --- The regression assertions ---

    // The user-visible bug was that row N's leading content got pulled up
    // onto row N-1's line ("Employee Name: Alex Kim NRIC/FIN…"). So the
    // invariant we enforce is: each PDF row's label must appear at the start
    // of its own reflowed line, with no earlier reflowed line containing a
    // later row's label. Individual rows may legitimately wrap further (if
    // their content exceeds bounds.width due to an edit or proportional-
    // scaling rounding), so line count is not checked strictly.
    const expectedLabels = ['Employee Name:', 'ID Number:', 'Start Date:', 'Designation:']

    // Find the line index each label lands on. Labels must appear at the
    // start of some reflowed line (not in the middle), in order, and each
    // on a distinct line.
    let lastLabelLine = -1
    for (let i = 0; i < expectedLabels.length; i++) {
      const label = expectedLabels[i]
      const lineIdx = lineTexts.findIndex(t => t.startsWith(label))
      expect(
        lineIdx,
        `row ${i}: label "${label}" must start a reflowed line. Got lines: ${JSON.stringify(lineTexts)}`,
      ).toBeGreaterThan(lastLabelLine)
      lastLabelLine = lineIdx
    }

    // No reflowed line may contain TWO row labels (that was the bug: row 2's
    // label got packed onto row 1's line).
    for (const line of lineTexts) {
      const labelsInLine = expectedLabels.filter(l => line.includes(l))
      expect(
        labelsInLine.length,
        `reflowed line "${line}" contains multiple row labels: ${JSON.stringify(labelsInLine)}`,
      ).toBeLessThanOrEqual(1)
    }
  })
})
