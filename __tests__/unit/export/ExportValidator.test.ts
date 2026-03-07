import { describe, it, expect } from 'vitest'
import { ExportValidator } from '../../../src/core/export/ExportValidator'
import {
  createDocumentModel,
  createPageModel,
  createTextBlock,
  createParagraph,
  createTextRun,
  createTextStyle,
} from '../../../src/core/model/DocumentModel'
import type { IFontManager } from '../../../src/core/interfaces/IFontManager'
import type { TextBlock } from '../../../src/types/document'

const defaultStyle = createTextStyle({ fontId: 'default', fontSize: 12 })

function createMockFontManager(hasAllGlyphs = true): IFontManager {
  return {
    measureChar: () => 7,
    measureText: (text: string) => ({ width: text.length * 7, height: 14 }),
    getMetrics: () => ({
      unitsPerEm: 1000, ascender: 800, descender: -200,
      lineGap: 0, xHeight: 500, capHeight: 700,
    }),
    getFont: () => undefined,
    getAvailableFonts: () => [],
    getFontFace: () => null,
    hasGlyph: () => hasAllGlyphs,
    getFallbackFont: () => 'sans-serif',
    getFontData: () => undefined,
    extractAndRegister: () => Promise.resolve(),
    destroy: () => {},
  }
}

describe('ExportValidator', () => {
  const validator = new ExportValidator()

  it('should pass validation for normal document', () => {
    const page = createPageModel(0, 612, 792)
    const block = createTextBlock(
      [createParagraph([createTextRun('Hello', defaultStyle)])],
      { x: 0, y: 0, width: 200, height: 100 },
      true
    )
    page.elements = [block]
    const model = createDocumentModel(
      { pageCount: 1, encrypted: false },
      [page]
    )

    const fm = createMockFontManager()
    const result = validator.validate(model, fm)

    expect(result.canExport).toBe(true)
    expect(result.overflowBlocks).toHaveLength(0)
    expect(result.missingGlyphs).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('should detect overflowing blocks', () => {
    const page = createPageModel(0, 612, 792)
    const block: TextBlock = createTextBlock(
      [createParagraph([createTextRun('Overflow text', defaultStyle)])],
      { x: 0, y: 0, width: 200, height: 100 },
      true
    )
    block.overflowState = { status: 'overflowing', overflowPercent: 25 }
    page.elements = [block]
    page.dirty = true
    const model = createDocumentModel({ pageCount: 1, encrypted: false }, [page])

    const fm = createMockFontManager()
    const result = validator.validate(model, fm)

    expect(result.overflowBlocks).toContain(block.id)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.canExport).toBe(true)
  })

  it('should detect missing glyphs', () => {
    const page = createPageModel(0, 612, 792)
    const block = createTextBlock(
      [createParagraph([createTextRun('Hello', defaultStyle)])],
      { x: 0, y: 0, width: 200, height: 100 },
      true
    )
    page.elements = [block]
    page.dirty = true
    const model = createDocumentModel({ pageCount: 1, encrypted: false }, [page])

    const fm = createMockFontManager(false)
    const result = validator.validate(model, fm)

    expect(result.missingGlyphs.length).toBeGreaterThan(0)
    expect(result.canExport).toBe(true)
  })
})
