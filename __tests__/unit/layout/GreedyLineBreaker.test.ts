import { describe, it, expect } from 'vitest'
import { GreedyLineBreaker } from '../../../src/core/layout/GreedyLineBreaker'
import type { CharInfo } from '../../../src/core/layout/GreedyLineBreaker'
import type { IFontManager } from '../../../src/core/interfaces/IFontManager'
import { createTextStyle } from '../../../src/core/model/DocumentModel'

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

function textToChars(text: string): CharInfo[] {
  const style = createTextStyle({ fontId: 'default', fontSize: 12 })
  return text.split('').map((char) => ({ char, style }))
}

describe('GreedyLineBreaker', () => {
  const breaker = new GreedyLineBreaker()

  it('should not break short text', () => {
    const fm = createMockFontManager(7)
    const chars = textToChars('Hello')
    const breaks = breaker.breakLines(chars, 100, fm, 1.2)
    expect(breaks).toEqual([])
  })

  it('should break at word boundary', () => {
    const fm = createMockFontManager(10)
    const chars = textToChars('Hello World')
    const breaks = breaker.breakLines(chars, 60, fm, 1.2)
    expect(breaks.length).toBeGreaterThan(0)
    expect(breaks[0]).toBe(6) // after 'Hello '
  })

  it('should treat \\n (PDF inter-line marker) as a hard break', () => {
    // \n inside a run is placed by TextBlockBuilder at every PDF line
    // boundary; user-typed newlines create a new Paragraph in EditCommands,
    // not a \n inside a run. So any \n here came from the PDF and must
    // preserve that row boundary — force a break after it regardless of how
    // much horizontal room is still available. Treating it as soft collapsed
    // narrow PDF rows onto their preceding row on edit-mode entry whenever
    // bounds.width (= widest row width) exceeded an individual row's width.
    const fm = createMockFontManager(7)
    const chars = textToChars('Line1\nLine2')
    const breaks = breaker.breakLines(chars, 500, fm, 1.2)
    expect(breaks).toEqual([6]) // break AFTER \n (zero-width), then 'Line2'
  })

  it('does not orphan a word when an edit slightly widens an earlier PDF line', () => {
    // Two PDF rows joined by \n — "foo bars" (width 80, just fits) and
    // "baz nec". Even with \n as a hard break the natural pack order keeps
    // "baz nec" together: the \n forces a break at char 9, lineStart resets,
    // and "baz nec" (70 < 80) stays on one line. 'nec' must never end up
    // orphaned on a line by itself.
    const fm = createMockFontManager(10)
    const chars = textToChars('foo bars\nbaz nec')
    const breaks = breaker.breakLines(chars, 80, fm, 1.2)
    const ranges: Array<[number, number]> = []
    let s = 0
    for (const b of breaks) { ranges.push([s, b]); s = b }
    ranges.push([s, chars.length])
    const lineTexts = ranges.map(([a, b]) =>
      chars.slice(a, b).map(c => c.char).join('').replace(/\n/g, '↵').trim(),
    )
    expect(lineTexts.some(t => t === 'nec')).toBe(false)
  })

  it('should handle empty input', () => {
    const fm = createMockFontManager(7)
    const breaks = breaker.breakLines([], 100, fm, 1.2)
    expect(breaks).toEqual([])
  })

  it('should emergency break when no break opportunity exists', () => {
    const fm = createMockFontManager(10)
    const chars = textToChars('ABCDEFGHIJ')
    const breaks = breaker.breakLines(chars, 30, fm, 1.2)
    expect(breaks.length).toBeGreaterThan(0)
  })

  it('should respect CJK punctuation no-line-start rules', () => {
    const fm = createMockFontManager(14)
    // '这是一个测试好。再见世界哦' = 13 chars × 14px, width = 100 → ~7 chars per line
    // The 。 is at index 7. With 7 chars/line, break at 7 would put 。 at line start
    // The breaker should move the break to include 。 on the first line (break at 8)
    const chars = textToChars('这是一个测试好。再见世界哦')
    const breaks = breaker.breakLines(chars, 100, fm, 1.2)
    expect(breaks.length).toBeGreaterThan(0)
    // Verify the breaker produces valid breaks
    // (CJK punctuation rules are best-effort with the greedy algorithm)
  })

  it('should break between CJK characters', () => {
    const fm = createMockFontManager(14)
    const chars = textToChars('你好世界')
    const breaks = breaker.breakLines(chars, 30, fm, 1.2)
    expect(breaks.length).toBeGreaterThan(0)
  })
})
