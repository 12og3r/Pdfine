import { describe, it, expect } from 'vitest'
import { LayoutEngine } from '../../../src/core/layout/LayoutEngine'
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

describe('LayoutEngine autoGrow', () => {
  const engine = new LayoutEngine()

  it('should not wrap text at original block width when autoGrow is true', () => {
    // "Hello World" = 11 chars * 7px = 77px width needed
    // Block width = 70px (too narrow to fit on one line without wrapping)
    // Without autoGrow fix, text wraps to 2 lines
    // With autoGrow fix, text should stay on 1 line and block should expand
    const block = createTextBlock(
      [createParagraph([createTextRun('Hello World', defaultStyle)])],
      { x: 0, y: 0, width: 70, height: 20 },
      true
    )

    const fm = createMockFontManager(7)
    const result = engine.reflowTextBlock(block, fm, { autoGrow: true })

    // With autoGrow, text should NOT wrap - it should be a single line
    const lines = result.paragraphs[0].lines!
    expect(lines).toHaveLength(1)

    // The bounds should have expanded to fit the content
    expect(result.bounds.width).toBeGreaterThanOrEqual(77)
  })

  it('should still wrap at original width when autoGrow is false', () => {
    // Same setup but without autoGrow - text should wrap normally
    const block = createTextBlock(
      [createParagraph([createTextRun('Hello World', defaultStyle)])],
      { x: 0, y: 0, width: 70, height: 100 },
      true
    )

    const fm = createMockFontManager(7)
    const result = engine.reflowTextBlock(block, fm)

    // Without autoGrow, text should wrap since 77px > 70px width
    const lines = result.paragraphs[0].lines!
    expect(lines.length).toBeGreaterThan(1)
  })

  it('should expand bounds width when content exceeds original width in autoGrow', () => {
    // Block width exactly fits "Hi" (2*7=14px), but we type "Hi there" (8*7=56px)
    const block = createTextBlock(
      [createParagraph([createTextRun('Hi there', defaultStyle)])],
      { x: 0, y: 0, width: 14, height: 20 },
      true
    )

    const fm = createMockFontManager(7)
    const result = engine.reflowTextBlock(block, fm, { autoGrow: true })

    // Should be a single line
    const lines = result.paragraphs[0].lines!
    expect(lines).toHaveLength(1)

    // Bounds should expand to fit
    expect(result.bounds.width).toBeGreaterThanOrEqual(56)
  })
})
