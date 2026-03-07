import { describe, it, expect } from 'vitest'
import {
  getTextContent,
  getRunAtOffset,
  splitRunAtOffset,
  applyCommand,
  inverseCommand,
} from '../../../src/core/editor/EditCommands'
import {
  createTextBlock,
  createParagraph,
  createTextRun,
  createTextStyle,
  createPageModel,
} from '../../../src/core/model/DocumentModel'
import type { TextBlock, PageModel, EditCommand } from '../../../src/types/document'

const defaultStyle = createTextStyle({ fontId: 'default', fontSize: 12 })

function makeBlock(text: string): TextBlock {
  const block = createTextBlock(
    [createParagraph([createTextRun(text, defaultStyle)])],
    { x: 0, y: 0, width: 200, height: 100 },
    true
  )
  // Assign a fixed ID for testing
  ;(block as { id: string }).id = 'block-1'
  return block
}

function makeBlockMultiRun(runs: string[]): TextBlock {
  const block = createTextBlock(
    [createParagraph(runs.map((t) => createTextRun(t, defaultStyle)))],
    { x: 0, y: 0, width: 200, height: 100 },
    true
  )
  ;(block as { id: string }).id = 'block-1'
  return block
}

function makePage(blocks: TextBlock[]): PageModel {
  const page = createPageModel(0, 612, 792)
  page.elements = blocks
  return page
}

describe('getTextContent', () => {
  it('should return plain text from single run', () => {
    const block = makeBlock('Hello World')
    expect(getTextContent(block)).toBe('Hello World')
  })

  it('should join multiple runs', () => {
    const block = makeBlockMultiRun(['Hello', ' ', 'World'])
    expect(getTextContent(block)).toBe('Hello World')
  })

  it('should join multiple paragraphs with newline', () => {
    const block = createTextBlock(
      [
        createParagraph([createTextRun('Line 1', defaultStyle)]),
        createParagraph([createTextRun('Line 2', defaultStyle)]),
      ],
      { x: 0, y: 0, width: 200, height: 100 },
      true
    )
    expect(getTextContent(block)).toBe('Line 1\nLine 2')
  })
})

describe('getRunAtOffset', () => {
  it('should find correct run at offset 0', () => {
    const block = makeBlockMultiRun(['Hello', ' World'])
    const loc = getRunAtOffset(block, 0)
    expect(loc.paragraphIdx).toBe(0)
    expect(loc.runIdx).toBe(0)
    expect(loc.localOffset).toBe(0)
  })

  it('should find correct run at boundary', () => {
    const block = makeBlockMultiRun(['Hello', ' World'])
    const loc = getRunAtOffset(block, 5)
    expect(loc.paragraphIdx).toBe(0)
    expect(loc.runIdx).toBe(1)
    expect(loc.localOffset).toBe(0)
  })

  it('should find correct run in middle', () => {
    const block = makeBlockMultiRun(['Hello', ' World'])
    const loc = getRunAtOffset(block, 3)
    expect(loc.paragraphIdx).toBe(0)
    expect(loc.runIdx).toBe(0)
    expect(loc.localOffset).toBe(3)
  })
})

describe('splitRunAtOffset', () => {
  it('should split a run into two', () => {
    const para = createParagraph([createTextRun('HelloWorld', defaultStyle)])
    splitRunAtOffset(para, 0, 5)
    expect(para.runs.length).toBe(2)
    expect(para.runs[0].text).toBe('Hello')
    expect(para.runs[1].text).toBe('World')
  })

  it('should not split at boundaries', () => {
    const para = createParagraph([createTextRun('Hello', defaultStyle)])
    splitRunAtOffset(para, 0, 0)
    expect(para.runs.length).toBe(1)
    splitRunAtOffset(para, 0, 5)
    expect(para.runs.length).toBe(1)
  })
})

describe('applyCommand - INSERT_TEXT', () => {
  it('should insert text at offset', () => {
    const block = makeBlock('Hello')
    const pages = [makePage([block])]

    applyCommand(
      { type: 'INSERT_TEXT', pageIdx: 0, blockId: 'block-1', offset: 5, text: ' World' },
      pages
    )

    expect(getTextContent(block)).toBe('Hello World')
    expect(pages[0].dirty).toBe(true)
  })

  it('should insert text at beginning', () => {
    const block = makeBlock('World')
    const pages = [makePage([block])]

    applyCommand(
      { type: 'INSERT_TEXT', pageIdx: 0, blockId: 'block-1', offset: 0, text: 'Hello ' },
      pages
    )

    expect(getTextContent(block)).toBe('Hello World')
  })

  it('should insert text in middle', () => {
    const block = makeBlock('Helo')
    const pages = [makePage([block])]

    applyCommand(
      { type: 'INSERT_TEXT', pageIdx: 0, blockId: 'block-1', offset: 2, text: 'l' },
      pages
    )

    expect(getTextContent(block)).toBe('Hello')
  })
})

describe('applyCommand - DELETE_TEXT', () => {
  it('should delete text at offset', () => {
    const block = makeBlock('Hello World')
    const pages = [makePage([block])]

    applyCommand(
      { type: 'DELETE_TEXT', pageIdx: 0, blockId: 'block-1', offset: 5, length: 6, deletedText: ' World' },
      pages
    )

    expect(getTextContent(block)).toBe('Hello')
  })

  it('should delete single character', () => {
    const block = makeBlock('Hello')
    const pages = [makePage([block])]

    applyCommand(
      { type: 'DELETE_TEXT', pageIdx: 0, blockId: 'block-1', offset: 4, length: 1, deletedText: 'o' },
      pages
    )

    expect(getTextContent(block)).toBe('Hell')
  })
})

describe('applyCommand - REPLACE_TEXT', () => {
  it('should replace text', () => {
    const block = makeBlock('Hello World')
    const pages = [makePage([block])]

    applyCommand(
      { type: 'REPLACE_TEXT', pageIdx: 0, blockId: 'block-1', offset: 6, length: 5, text: 'Earth', originalText: 'World' },
      pages
    )

    expect(getTextContent(block)).toBe('Hello Earth')
  })
})

describe('inverseCommand', () => {
  it('should invert INSERT_TEXT to DELETE_TEXT', () => {
    const cmd: EditCommand = {
      type: 'INSERT_TEXT', pageIdx: 0, blockId: 'b1', offset: 5, text: ' World',
    }
    const inv = inverseCommand(cmd)
    expect(inv.type).toBe('DELETE_TEXT')
    if (inv.type === 'DELETE_TEXT') {
      expect(inv.offset).toBe(5)
      expect(inv.length).toBe(6)
      expect(inv.deletedText).toBe(' World')
    }
  })

  it('should invert DELETE_TEXT to INSERT_TEXT', () => {
    const cmd: EditCommand = {
      type: 'DELETE_TEXT', pageIdx: 0, blockId: 'b1', offset: 5, length: 6, deletedText: ' World',
    }
    const inv = inverseCommand(cmd)
    expect(inv.type).toBe('INSERT_TEXT')
    if (inv.type === 'INSERT_TEXT') {
      expect(inv.offset).toBe(5)
      expect(inv.text).toBe(' World')
    }
  })

  it('should roundtrip: apply + inverse restores original', () => {
    const block = makeBlock('Hello World')
    const pages = [makePage([block])]

    const cmd: EditCommand = {
      type: 'INSERT_TEXT', pageIdx: 0, blockId: 'block-1', offset: 5, text: ' Beautiful',
    }

    applyCommand(cmd, pages)
    expect(getTextContent(block)).toBe('Hello Beautiful World')

    const inv = inverseCommand(cmd)
    applyCommand(inv, pages)
    expect(getTextContent(block)).toBe('Hello World')
  })
})

describe('applyCommand - BATCH', () => {
  it('should apply multiple commands', () => {
    const block = makeBlock('Hello')
    const pages = [makePage([block])]

    const batch: EditCommand = {
      type: 'BATCH',
      commands: [
        { type: 'INSERT_TEXT', pageIdx: 0, blockId: 'block-1', offset: 5, text: ' World' },
        { type: 'INSERT_TEXT', pageIdx: 0, blockId: 'block-1', offset: 11, text: '!' },
      ],
    }

    applyCommand(batch, pages)
    expect(getTextContent(block)).toBe('Hello World!')
  })
})
