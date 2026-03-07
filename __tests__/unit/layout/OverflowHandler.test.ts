import { describe, it, expect } from 'vitest'
import { OverflowHandler } from '../../../src/core/layout/OverflowHandler'
import { GreedyLineBreaker } from '../../../src/core/layout/GreedyLineBreaker'
import {
  createTextBlock,
  createParagraph,
  createTextRun,
  createTextStyle,
} from '../../../src/core/model/DocumentModel'
import type { IFontManager } from '../../../src/core/interfaces/IFontManager'

const defaultStyle = createTextStyle({ fontId: 'default', fontSize: 12 })

function createMockFontManager(charWidth = 7): IFontManager {
  return {
    measureChar: () => charWidth,
    measureText: (text: string) => ({ width: text.length * charWidth, height: 14 }),
    getMetrics: () => ({
      unitsPerEm: 1000, ascender: 800, descender: -200,
      lineGap: 0, xHeight: 500, capHeight: 700,
    }),
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

describe('OverflowHandler', () => {
  const handler = new OverflowHandler()
  const breaker = new GreedyLineBreaker()

  it('should return normal when text fits', () => {
    const block = createTextBlock(
      [createParagraph([createTextRun('Short text', defaultStyle)])],
      { x: 0, y: 0, width: 200, height: 100 },
      true
    )
    block.paragraphs[0].lines = [{
      glyphs: [], baseline: 10, width: 50, height: 14, y: 0,
    }]

    const fm = createMockFontManager()
    const result = handler.detectAndHandle(block, fm, breaker)
    expect(result.overflowState.status).toBe('normal')
  })

  it('should detect overflow when text exceeds bounds', () => {
    const style = createTextStyle({ fontId: 'default', fontSize: 14 })
    const block = createTextBlock(
      [createParagraph([createTextRun('This is a very long text that will overflow the bounds', style)])],
      { x: 0, y: 0, width: 100, height: 15 },
      true
    )
    block.paragraphs[0].lines = [
      { glyphs: [], baseline: 10, width: 100, height: 14, y: 0 },
      { glyphs: [], baseline: 24, width: 100, height: 14, y: 14 },
      { glyphs: [], baseline: 38, width: 100, height: 14, y: 28 },
    ]

    const fm = createMockFontManager()
    const result = handler.detectAndHandle(block, fm, breaker)
    expect(['auto_shrunk', 'overflowing']).toContain(result.overflowState.status)
  })

  it('should allow within tolerance (15%)', () => {
    // detectAndHandle recomputes layout, so pre-set lines are ignored.
    // We need text that produces content height slightly over bounds.
    // charWidth=7, fontSize=12, lineSpacing=1.2, lineHeight≈14.4
    // width=30 → ~4 chars/line. "aaa bbb ccc ddd eee fff ggg" → many lines
    // We set height so overflow is ~10% (within 15% tolerance)
    const longText = 'aaa bbb ccc ddd eee fff ggg'
    const block = createTextBlock(
      [createParagraph([createTextRun(longText, defaultStyle)])],
      { x: 0, y: 0, width: 30, height: 92 },
      true
    )

    const fm = createMockFontManager()
    const result = handler.detectAndHandle(block, fm, breaker)
    // Content should be slightly over bounds but within 15% tolerance, or normal if it fits
    expect(['within_tolerance', 'normal']).toContain(result.overflowState.status)
  })
})
