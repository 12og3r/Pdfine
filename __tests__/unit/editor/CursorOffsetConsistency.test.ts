/**
 * Tests that CursorManager.getGlyphAtOffset() and HitTester.indexTextBlock()
 * use the same offset space as EditCommands.getRunAtOffset() and getTextContent().
 *
 * Bug: HitTester and CursorManager counted only visible glyphs (no \n for paragraph breaks),
 * while getRunAtOffset/getTextContent count \n between paragraphs. After pressing Enter
 * (creating a paragraph break), cursor rendering and editing were off by 1 per \n.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CursorManager } from '../../../src/core/editor/CursorManager'
import { getTextContent, getRunAtOffset } from '../../../src/core/editor/EditCommands'
import { HitTester } from '../../../src/core/render/HitTester'
import type { TextBlock, PageModel, PositionedGlyph, LayoutLine, Paragraph } from '../../../src/types/document'
import type { EventBus } from '../../../src/core/infra/EventBus'

function makeGlyph(char: string, x: number, y: number, width: number, height: number): PositionedGlyph {
  return { char, x, y, width, height, style: { fontId: 'test', fontSize: 12, fontWeight: 400, fontStyle: 'normal', color: { r: 0, g: 0, b: 0 } } }
}

function makeLine(glyphs: PositionedGlyph[], y: number): LayoutLine {
  const width = glyphs.length > 0 ? glyphs[glyphs.length - 1].x + glyphs[glyphs.length - 1].width : 0
  return { glyphs, baseline: y + 10, width, height: 14, y }
}

function makeParagraph(text: string, startX: number, y: number): Paragraph {
  const glyphs = text.split('').map((ch, i) => makeGlyph(ch, startX + i * 8, y, 8, 14))
  return {
    runs: [{ text, style: { fontId: 'test', fontSize: 12, fontWeight: 400, fontStyle: 'normal', color: { r: 0, g: 0, b: 0 } } }],
    alignment: 'left' as const,
    lineSpacing: 1.2,
    lines: [makeLine(glyphs, y)],
  }
}

function makeBlock(paragraphs: Paragraph[]): TextBlock {
  return {
    type: 'text',
    id: 'block-1',
    bounds: { x: 10, y: 10, width: 200, height: 100 },
    originalBounds: { x: 10, y: 10, width: 200, height: 100 },
    paragraphs,
    editable: true,
    overflowState: { status: 'normal' },
  }
}

function makePage(elements: TextBlock[]): PageModel {
  return { index: 0, width: 612, height: 792, elements, dirty: false }
}

function createMockEventBus(): EventBus {
  return { emit: vi.fn(), on: vi.fn(() => () => {}), removeAllListeners: vi.fn() } as unknown as EventBus
}

describe('Cursor offset consistency with paragraph breaks', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = createMockEventBus()
  })

  it('getGlyphAtOffset should match getRunAtOffset for single paragraph', () => {
    const block = makeBlock([makeParagraph('Hello', 0, 0)])

    // getTextContent: "Hello" — 5 chars, no \n
    expect(getTextContent(block)).toBe('Hello')

    const cursorMgr = new CursorManager(eventBus, () => makePage([block]))
    cursorMgr.setCursor(0, 'block-1', 3) // After 'l' (before second 'l')

    const pos = cursorMgr.getCursorPosition()
    expect(pos).not.toBeNull()
    // Glyph at index 3 is the second 'l' in "Hello" — cursor should be at its left edge
    expect(pos!.x).toBe(block.bounds.x + 3 * 8) // each char is 8px wide

    // getRunAtOffset should point to same character
    const loc = getRunAtOffset(block, 3)
    expect(loc.paragraphIdx).toBe(0)
    expect(loc.localOffset).toBe(3)
    expect(block.paragraphs[0].runs[0].text[loc.localOffset]).toBe('l')
  })

  it('getGlyphAtOffset should match getRunAtOffset for TWO paragraphs', () => {
    const block = makeBlock([
      makeParagraph('abc', 0, 0),
      makeParagraph('def', 0, 20),
    ])

    // getTextContent: "abc\ndef" — 7 chars (including \n)
    expect(getTextContent(block)).toBe('abc\ndef')

    // Offset 4 in getTextContent is 'd' (first char of para2)
    // a=0, b=1, c=2, \n=3, d=4, e=5, f=6
    const loc = getRunAtOffset(block, 4)
    expect(loc.paragraphIdx).toBe(1)
    expect(loc.localOffset).toBe(0)
    expect(block.paragraphs[1].runs[0].text[0]).toBe('d')

    // CursorManager at offset 4 should also point to 'd'
    const cursorMgr = new CursorManager(eventBus, () => makePage([block]))
    cursorMgr.setCursor(0, 'block-1', 4)

    const pos = cursorMgr.getCursorPosition()
    expect(pos).not.toBeNull()
    // 'd' is the first glyph of paragraph 2, at x=0 in the line
    expect(pos!.x).toBe(block.bounds.x + 0) // first glyph of para2
    expect(pos!.y).toBe(block.bounds.y + 20) // y of para2's line
  })

  it('getGlyphAtOffset at paragraph break (\\n offset) should position between paragraphs', () => {
    const block = makeBlock([
      makeParagraph('abc', 0, 0),
      makeParagraph('def', 0, 20),
    ])

    // Offset 3 is '\n' — cursor should be at end of paragraph 1
    const cursorMgr = new CursorManager(eventBus, () => makePage([block]))
    cursorMgr.setCursor(0, 'block-1', 3)

    const pos = cursorMgr.getCursorPosition()
    expect(pos).not.toBeNull()
    // At the \n position, cursor should be at the end of paragraph 1 (after 'c')
    const lastGlyphPara1 = block.paragraphs[0].lines![0].glyphs[2] // 'c'
    expect(pos!.x).toBe(block.bounds.x + lastGlyphPara1.x + lastGlyphPara1.width)
  })

  it('HitTester charOffset should match getRunAtOffset for multi-paragraph block', () => {
    const block = makeBlock([
      makeParagraph('abc', 0, 0),
      makeParagraph('def', 0, 20),
    ])
    const page = makePage([block])
    const hitTester = new HitTester()
    hitTester.buildHitMap(page)

    // Click on 'd' (first glyph of paragraph 2) — at absolute position
    // Glyph 'd' is at x=0+10(block)=10, y=20+10(block)=30, width=8, height=14
    // Click at x = 10 + 2 (left half of 'd'), y = 30 + 7 (middle of line)
    const hit = hitTester.hitTest(10 + 2, 10 + 20 + 7, 0)
    expect(hit).not.toBeNull()
    expect(hit!.blockId).toBe('block-1')

    // The charOffset from hitTest should be 4 (matching getTextContent's offset for 'd')
    expect(hit!.charOffset).toBe(4)

    // Verify it matches getRunAtOffset
    const loc = getRunAtOffset(block, hit!.charOffset)
    expect(loc.paragraphIdx).toBe(1)
    expect(loc.localOffset).toBe(0)
  })

  it('three paragraphs: offsets should be consistent across all systems', () => {
    const block = makeBlock([
      makeParagraph('ab', 0, 0),
      makeParagraph('cd', 0, 20),
      makeParagraph('ef', 0, 40),
    ])

    // getTextContent: "ab\ncd\nef" — 8 chars
    // a=0, b=1, \n=2, c=3, d=4, \n=5, e=6, f=7
    expect(getTextContent(block)).toBe('ab\ncd\nef')

    const cursorMgr = new CursorManager(eventBus, () => makePage([block]))

    // Test offset 6 = 'e' (first char of para3)
    cursorMgr.setCursor(0, 'block-1', 6)
    const pos = cursorMgr.getCursorPosition()
    expect(pos).not.toBeNull()
    expect(pos!.x).toBe(block.bounds.x + 0) // first glyph of para3
    expect(pos!.y).toBe(block.bounds.y + 40) // y of para3

    const loc = getRunAtOffset(block, 6)
    expect(loc.paragraphIdx).toBe(2)
    expect(loc.localOffset).toBe(0)
  })

  it('cursor movement right should cross paragraph breaks correctly', () => {
    const block = makeBlock([
      makeParagraph('ab', 0, 0),
      makeParagraph('cd', 0, 20),
    ])

    const cursorMgr = new CursorManager(eventBus, () => makePage([block]))
    cursorMgr.setCursor(0, 'block-1', 0)

    // Move right through: a(0) → b(1) → \n(2) → c(3) → d(4)
    cursorMgr.moveCursor('right') // offset 1
    expect(cursorMgr.getCharOffset()).toBe(1)

    cursorMgr.moveCursor('right') // offset 2 (\n)
    expect(cursorMgr.getCharOffset()).toBe(2)

    cursorMgr.moveCursor('right') // offset 3 (c)
    expect(cursorMgr.getCharOffset()).toBe(3)

    // Verify offset 3 maps to 'c'
    const loc = getRunAtOffset(block, 3)
    expect(loc.paragraphIdx).toBe(1)
    expect(loc.localOffset).toBe(0)

    // And cursor position should be at start of paragraph 2
    const pos = cursorMgr.getCursorPosition()
    expect(pos).not.toBeNull()
    expect(pos!.y).toBe(block.bounds.y + 20) // para2's line y
  })
})
