import { describe, it, expect } from 'vitest'
import {
  createDocumentModel,
  createPageModel,
  createTextBlock,
  createParagraph,
  createTextRun,
  createTextStyle,
} from '../../../src/core/model/DocumentModel'
import {
  findTextBlock,
  getPlainText,
} from '../../../src/core/model/ModelOperations'

const defaultStyle = createTextStyle({ fontId: 'default', fontSize: 12 })

describe('DocumentModel factory functions', () => {
  it('should create a document model', () => {
    const model = createDocumentModel(
      { pageCount: 2, encrypted: false, title: 'Test' },
      []
    )
    expect(model.metadata.pageCount).toBe(2)
    expect(model.metadata.title).toBe('Test')
    expect(model.pages).toHaveLength(0)
    expect(model.fonts).toBeInstanceOf(Map)
  })

  it('should create a page model', () => {
    const page = createPageModel(0, 612, 792)
    expect(page.index).toBe(0)
    expect(page.width).toBe(612)
    expect(page.height).toBe(792)
    expect(page.dirty).toBe(false)
    expect(page.elements).toHaveLength(0)
  })

  it('should create a text block', () => {
    const block = createTextBlock(
      [createParagraph([createTextRun('Hello', defaultStyle)])],
      { x: 10, y: 20, width: 200, height: 100 },
      true
    )
    expect(block.type).toBe('text')
    expect(block.id).toBeTruthy()
    expect(block.bounds).toEqual({ x: 10, y: 20, width: 200, height: 100 })
    expect(block.originalBounds).toEqual(block.bounds)
    expect(block.editable).toBe(true)
    expect(block.overflowState.status).toBe('normal')
    expect(block.paragraphs).toHaveLength(1)
    expect(block.paragraphs[0].runs[0].text).toBe('Hello')
  })

  it('should create text style with defaults', () => {
    const style = createTextStyle({ fontId: 'test', fontSize: 14 })
    expect(style.fontSize).toBe(14)
    expect(style.fontId).toBe('test')
    expect(style.fontWeight).toBe(400)
    expect(style.fontStyle).toBe('normal')
    expect(style.color).toEqual({ r: 0, g: 0, b: 0, a: 1 })
  })
})

describe('ModelOperations', () => {
  it('should find text block by id', () => {
    const page = createPageModel(0, 612, 792)
    const block = createTextBlock(
      [createParagraph([createTextRun('Found', defaultStyle)])],
      { x: 0, y: 0, width: 100, height: 50 },
      true
    )
    page.elements.push(block)

    const found = findTextBlock(page, block.id)
    expect(found).toBeTruthy()
    expect(found!.id).toBe(block.id)

    const notFound = findTextBlock(page, 'nonexistent')
    expect(notFound).toBeUndefined()
  })

  it('should get plain text from text block', () => {
    const block = createTextBlock(
      [createParagraph([
        createTextRun('Hello ', defaultStyle),
        createTextRun('World', defaultStyle),
      ])],
      { x: 0, y: 0, width: 200, height: 100 },
      true
    )

    const text = getPlainText(block)
    expect(text).toBe('Hello World')
  })
})
