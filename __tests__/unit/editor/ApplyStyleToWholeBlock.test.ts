/**
 * applyStyleToRange used to compute riEnd = endLoc.runIdx (exclusive) in every
 * branch, which silently dropped the final run when the range ended at the
 * end of that run (the whole-block / no-split case). Regression: applying
 * Bold / a colour to a block via the inspector with no selection left the
 * last run — and on single-run blocks, every run — unchanged.
 */
import { describe, it, expect } from 'vitest'
import { applyCommand } from '../../../src/core/editor/EditCommands'
import type { TextBlock, PageModel, Paragraph, TextStyle } from '../../../src/types/document'

function makeStyle(overrides: Partial<TextStyle> = {}): TextStyle {
  return {
    fontId: 'default',
    fontSize: 12,
    fontWeight: 400,
    fontStyle: 'normal',
    color: { r: 0, g: 0, b: 0 },
    ...overrides,
  }
}

function makeParagraph(runs: { text: string; style?: Partial<TextStyle> }[]): Paragraph {
  return {
    runs: runs.map((r) => ({ text: r.text, style: makeStyle(r.style) })),
    alignment: 'left',
    lineSpacing: 1.2,
    lines: [],
  }
}

function makeBlock(paragraphs: Paragraph[]): TextBlock {
  return {
    type: 'text',
    id: 'block-1',
    bounds: { x: 0, y: 0, width: 200, height: 50 },
    originalBounds: { x: 0, y: 0, width: 200, height: 50 },
    paragraphs,
    editable: true,
    overflowState: { status: 'normal' },
  }
}

function makePage(block: TextBlock): PageModel {
  return { index: 0, width: 612, height: 792, elements: [block], dirty: false }
}

describe('applyStyleToRange — whole block / end-at-run-boundary', () => {
  it('applies style to a single-run block (offset=0 length=textLen)', () => {
    const block = makeBlock([makeParagraph([{ text: 'Hello' }])])
    const pages = [makePage(block)]

    applyCommand(
      {
        type: 'CHANGE_STYLE',
        pageIdx: 0,
        blockId: 'block-1',
        offset: 0,
        length: 5,
        style: { color: { r: 47, g: 90, b: 63 } },
        originalStyle: { color: { r: 0, g: 0, b: 0 } },
      },
      pages
    )

    expect(block.paragraphs[0].runs[0].style.color).toEqual({ r: 47, g: 90, b: 63 })
  })

  it('applies style to every run when the range covers the whole block', () => {
    const block = makeBlock([
      makeParagraph([{ text: 'Alpha ' }, { text: 'Beta ' }, { text: 'Gamma' }]),
    ])
    const pages = [makePage(block)]
    const total = 'Alpha Beta Gamma'.length // 16

    applyCommand(
      {
        type: 'CHANGE_STYLE',
        pageIdx: 0,
        blockId: 'block-1',
        offset: 0,
        length: total,
        style: { fontWeight: 700 },
        originalStyle: { fontWeight: 400 },
      },
      pages
    )

    for (const run of block.paragraphs[0].runs) {
      expect(run.style.fontWeight).toBe(700)
    }
  })

  it('applies style across paragraphs, including the final run of the last paragraph', () => {
    const block = makeBlock([
      makeParagraph([{ text: 'para one' }]),
      makeParagraph([{ text: 'para ' }, { text: 'two' }]),
    ])
    const pages = [makePage(block)]
    const total = 'para one'.length + 1 /* \n */ + 'para two'.length

    applyCommand(
      {
        type: 'CHANGE_STYLE',
        pageIdx: 0,
        blockId: 'block-1',
        offset: 0,
        length: total,
        style: { fontStyle: 'italic' },
        originalStyle: { fontStyle: 'normal' },
      },
      pages
    )

    expect(block.paragraphs[0].runs[0].style.fontStyle).toBe('italic')
    for (const run of block.paragraphs[1].runs) {
      expect(run.style.fontStyle).toBe('italic')
    }
  })

  it('does NOT modify a run when the range ends exactly at its start (pre-existing behaviour)', () => {
    const block = makeBlock([
      makeParagraph([{ text: 'before' }, { text: 'AFTER', style: { fontWeight: 700 } }]),
    ])
    const pages = [makePage(block)]

    applyCommand(
      {
        type: 'CHANGE_STYLE',
        pageIdx: 0,
        blockId: 'block-1',
        offset: 0,
        length: 'before'.length,
        style: { color: { r: 184, g: 92, b: 58 } },
        originalStyle: { color: { r: 0, g: 0, b: 0 } },
      },
      pages
    )

    expect(block.paragraphs[0].runs[0].style.color).toEqual({ r: 184, g: 92, b: 58 })
    // The AFTER run must be untouched — range ends at the start of runs[1].
    expect(block.paragraphs[0].runs[1].style.color).toEqual({ r: 0, g: 0, b: 0 })
    expect(block.paragraphs[0].runs[1].style.fontWeight).toBe(700)
  })
})

describe('applyStyleToRange — partial selection (user dragged to select)', () => {
  function textStyles(block: TextBlock): { text: string; color: { r: number; g: number; b: number } }[] {
    const out: { text: string; color: { r: number; g: number; b: number } }[] = []
    for (const p of block.paragraphs) {
      for (const r of p.runs) {
        out.push({ text: r.text, color: r.style.color as { r: number; g: number; b: number } })
      }
    }
    return out
  }

  const RED = { r: 255, g: 0, b: 0 }
  const BLACK = { r: 0, g: 0, b: 0 }

  it('colours only the selected mid-run slice of a single-run block', () => {
    const block = makeBlock([makeParagraph([{ text: 'Hello World' }])])
    const pages = [makePage(block)]

    // Select "Hel" — offsets 0..3
    applyCommand(
      {
        type: 'CHANGE_STYLE',
        pageIdx: 0,
        blockId: 'block-1',
        offset: 0,
        length: 3,
        style: { color: RED },
        originalStyle: { color: BLACK },
      },
      pages
    )

    expect(textStyles(block)).toEqual([
      { text: 'Hel', color: RED },
      { text: 'lo World', color: BLACK },
    ])
  })

  it('colours only a mid-run slice with content on both sides', () => {
    const block = makeBlock([makeParagraph([{ text: 'Hello World' }])])
    const pages = [makePage(block)]

    // Select "lo W" — offsets 3..7
    applyCommand(
      {
        type: 'CHANGE_STYLE',
        pageIdx: 0,
        blockId: 'block-1',
        offset: 3,
        length: 4,
        style: { color: RED },
        originalStyle: { color: BLACK },
      },
      pages
    )

    expect(textStyles(block)).toEqual([
      { text: 'Hel', color: BLACK },
      { text: 'lo W', color: RED },
      { text: 'orld', color: BLACK },
    ])
  })

  it('colours only the selected slice across two runs', () => {
    // "Hello " | "World"  — two runs, select offsets 2..8 → "llo Wo"
    const block = makeBlock([
      makeParagraph([{ text: 'Hello ' }, { text: 'World' }]),
    ])
    const pages = [makePage(block)]

    applyCommand(
      {
        type: 'CHANGE_STYLE',
        pageIdx: 0,
        blockId: 'block-1',
        offset: 2,
        length: 6,
        style: { color: RED },
        originalStyle: { color: BLACK },
      },
      pages
    )

    expect(textStyles(block)).toEqual([
      { text: 'He', color: BLACK },
      { text: 'llo ', color: RED },
      { text: 'Wo', color: RED },
      { text: 'rld', color: BLACK },
    ])
  })
})
