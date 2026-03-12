import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TextRenderer } from '../../../src/core/render/TextRenderer'
import type { IFontManager } from '../../../src/core/interfaces/IFontManager'
import type { TextBlock } from '../../../src/types/document'
import {
  createTextBlock,
  createParagraph,
  createTextRun,
  createTextStyle,
} from '../../../src/core/model/DocumentModel'

function makeFontManager(registeredFontIds: Set<string>): IFontManager {
  return {
    getFont: (fontId: string) => {
      if (registeredFontIds.has(fontId)) {
        return {
          id: fontId,
          name: fontId,
          family: fontId,
          weight: 400,
          style: 'normal' as const,
          fontFace: {} as FontFace, // truthy = registered
          isEmbedded: true,
          supportedFormat: 'truetype' as const,
          editable: true,
        }
      }
      return undefined
    },
    extractAndRegister: vi.fn(),
    getMetrics: vi.fn().mockReturnValue(null),
    measureText: vi.fn().mockReturnValue({ width: 10, height: 12 }),
    measureChar: vi.fn().mockReturnValue(10),
    getAvailableFonts: vi.fn().mockReturnValue([]),
    getFontFace: (fontId: string) => registeredFontIds.has(fontId) ? {} as FontFace : null,
    hasGlyph: vi.fn().mockReturnValue(true),
    getFallbackFont: vi.fn().mockReturnValue('sans-serif'),
    getFontData: vi.fn().mockReturnValue(undefined),
    getAscent: vi.fn().mockImplementation((_fontId: string, fontSize: number) => fontSize * 0.8),
    destroy: vi.fn(),
  }
}

function makeBlockWithLayout(text: string, fontId: string, fontSize: number): TextBlock {
  const style = createTextStyle({ fontId, fontSize })
  const block = createTextBlock(
    [createParagraph([createTextRun(text, style)])],
    { x: 0, y: 0, width: 200, height: 50 },
    true
  )
  // Manually populate layout data (glyphs) since we're not running LayoutEngine
  block.paragraphs[0].lines = [{
    y: 0,
    height: fontSize,
    baseline: fontSize * 0.8,
    glyphs: text.split('').map((char, i) => ({
      char,
      x: i * 8,
      y: 0,
      width: 8,
      height: fontSize,
      style: { ...style },
    })),
  }]
  return block
}

describe('TextRenderer', () => {
  let ctx: CanvasRenderingContext2D
  let fontAssignments: string[]

  beforeEach(() => {
    fontAssignments = []
    ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      set textBaseline(_v: string) { /* noop */ },
      set fillStyle(_v: string) { /* noop */ },
      set font(v: string) { fontAssignments.push(v) },
    } as unknown as CanvasRenderingContext2D
  })

  it('should use registered fontId directly when FontFace is available', () => {
    const fontManager = makeFontManager(new Set(['g_d0_f1']))
    const renderer = new TextRenderer(fontManager)
    const block = makeBlockWithLayout('Hello', 'g_d0_f1', 12)

    renderer.renderTextBlock(ctx, block, 1, 1)

    // Every glyph should use the registered font ID, not "sans-serif"
    for (const fontStr of fontAssignments) {
      expect(fontStr).toContain('"g_d0_f1"')
      expect(fontStr).not.toBe('400 12px sans-serif')
    }
  })

  it('should fall back to mapFontFamily heuristics when font is not registered', () => {
    const fontManager = makeFontManager(new Set()) // no registered fonts
    const renderer = new TextRenderer(fontManager)
    const block = makeBlockWithLayout('Hello', 'g_d0_f1', 12)

    renderer.renderTextBlock(ctx, block, 1, 1)

    // Internal PDF font name should be mapped to sans-serif fallback
    for (const fontStr of fontAssignments) {
      expect(fontStr).toContain('sans-serif')
      expect(fontStr).not.toContain('g_d0_f1')
    }
  })

  it('should use CSS font family for well-known font names', () => {
    const fontManager = makeFontManager(new Set())
    const renderer = new TextRenderer(fontManager)
    const block = makeBlockWithLayout('Hi', 'TimesNewRoman', 14)

    renderer.renderTextBlock(ctx, block, 1, 1)

    for (const fontStr of fontAssignments) {
      expect(fontStr).toContain('Times')
    }
  })

  it('should preserve font consistency between original and inserted text', () => {
    const fontManager = makeFontManager(new Set(['g_d0_f1', 'g_d0_f2']))
    const renderer = new TextRenderer(fontManager)

    // Simulate a block with mixed fonts: "Hello" in f1, "World" in f2
    const style1 = createTextStyle({ fontId: 'g_d0_f1', fontSize: 11 })
    const style2 = createTextStyle({ fontId: 'g_d0_f2', fontSize: 11 })
    const block = createTextBlock(
      [createParagraph([
        createTextRun('Hello', style1),
        createTextRun('World', style2),
      ])],
      { x: 0, y: 0, width: 200, height: 50 },
      true
    )
    // Populate layout
    block.paragraphs[0].lines = [{
      y: 0,
      height: 11,
      baseline: 9,
      glyphs: [
        ...('Hello'.split('').map((char, i) => ({
          char, x: i * 8, y: 0, width: 8, height: 11,
          style: { ...style1 },
        }))),
        ...('World'.split('').map((char, i) => ({
          char, x: (i + 5) * 8, y: 0, width: 8, height: 11,
          style: { ...style2 },
        }))),
      ],
    }]

    renderer.renderTextBlock(ctx, block, 1, 1)

    // First 5 glyphs should use g_d0_f1, next 5 should use g_d0_f2
    const f1Assignments = fontAssignments.slice(0, 5)
    const f2Assignments = fontAssignments.slice(5, 10)

    for (const fontStr of f1Assignments) {
      expect(fontStr).toContain('"g_d0_f1"')
    }
    for (const fontStr of f2Assignments) {
      expect(fontStr).toContain('"g_d0_f2"')
    }
  })
})
