import type { Color } from '../../types/document'

/**
 * A pdfjs operator list (the bits we use). Kept structurally typed so callers
 * can pass the real `OperatorList` from pdfjs without an import.
 */
export interface OperatorListLike {
  fnArray: number[]
  argsArray: unknown[][]
}

/**
 * The subset of `pdfjs.OPS` constants this extractor needs. Numbers vary by
 * pdfjs version, so we accept them as a parameter instead of hardcoding.
 */
export interface OpsConstants {
  setFillRGBColor: number
  setFillGray: number
  setFillCMYKColor: number
  showText: number
  showSpacedText: number
  nextLineShowText?: number
  nextLineSetSpacingShowText?: number
}

/** A text-show event from the operator list, paired with the active fill color. */
export interface TextColorEvent {
  text: string
  color: Color
}

/** A textContent item split into one or more single-color segments. */
export interface ColoredSegment {
  /** Index of the original `textContent.items[]` element this segment came from. */
  itemIndex: number
  /** Character offset within the original item.str where this segment starts. */
  startOffset: number
  /** Substring of the original item.str. */
  text: string
  /** Fill color resolved from the operator list. */
  color: Color
}

const BLACK: Color = { r: 0, g: 0, b: 0, a: 1 }

function rgbFromArgs(args: unknown[]): Color {
  // pdfjs may pass either three numeric components or a single CSS color string
  // (the renderer pre-resolves the color in some configurations).
  if (typeof args[0] === 'string') {
    return parseCssColor(args[0]) ?? BLACK
  }
  return {
    r: clamp255(Math.round((args[0] as number) * 255)),
    g: clamp255(Math.round((args[1] as number) * 255)),
    b: clamp255(Math.round((args[2] as number) * 255)),
    a: 1,
  }
}

function grayFromArgs(args: unknown[]): Color {
  if (typeof args[0] === 'string') {
    return parseCssColor(args[0]) ?? BLACK
  }
  const g = clamp255(Math.round((args[0] as number) * 255))
  return { r: g, g, b: g, a: 1 }
}

function cmykFromArgs(args: unknown[]): Color {
  if (typeof args[0] === 'string') {
    return parseCssColor(args[0]) ?? BLACK
  }
  const c = args[0] as number
  const m = args[1] as number
  const y = args[2] as number
  const k = args[3] as number
  return {
    r: clamp255(Math.round(255 * (1 - c) * (1 - k))),
    g: clamp255(Math.round(255 * (1 - m) * (1 - k))),
    b: clamp255(Math.round(255 * (1 - y) * (1 - k))),
    a: 1,
  }
}

function clamp255(v: number): number {
  if (v < 0) return 0
  if (v > 255) return 255
  return v
}

function parseCssColor(css: string): Color | null {
  // Handle "#rrggbb" form (the only one pdfjs actually emits).
  if (css.startsWith('#') && css.length === 7) {
    const r = parseInt(css.slice(1, 3), 16)
    const g = parseInt(css.slice(3, 5), 16)
    const b = parseInt(css.slice(5, 7), 16)
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return { r, g, b, a: 1 }
    }
  }
  return null
}

function showTextArgsToString(args: unknown[]): string {
  // showText / showSpacedText carry an array whose elements are either
  // `{ unicode: string, ... }` glyph descriptors or numeric kerning offsets.
  const arr = args[0]
  if (!Array.isArray(arr)) return ''
  let out = ''
  for (const g of arr) {
    if (g && typeof g === 'object' && typeof (g as { unicode?: unknown }).unicode === 'string') {
      out += (g as { unicode: string }).unicode
    } else if (typeof g === 'string') {
      out += g
    }
    // numeric kerning offsets contribute no characters
  }
  return out
}

/**
 * Walks an operator list and emits one TextColorEvent per text-showing
 * operator, capturing the active fill color at the moment the text was drawn.
 *
 * The events appear in PDF reading order — the same order as
 * `page.getTextContent().items` — so they can be aligned by sequential
 * substring matching.
 */
export function extractTextColorEvents(
  opList: OperatorListLike,
  ops: OpsConstants,
): TextColorEvent[] {
  const events: TextColorEvent[] = []
  let currentFill: Color = { ...BLACK }

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i]
    const args = opList.argsArray[i] ?? []

    if (fn === ops.setFillRGBColor) {
      currentFill = rgbFromArgs(args)
    } else if (fn === ops.setFillGray) {
      currentFill = grayFromArgs(args)
    } else if (fn === ops.setFillCMYKColor) {
      currentFill = cmykFromArgs(args)
    } else if (
      fn === ops.showText ||
      fn === ops.showSpacedText ||
      (ops.nextLineShowText !== undefined && fn === ops.nextLineShowText) ||
      (ops.nextLineSetSpacingShowText !== undefined && fn === ops.nextLineSetSpacingShowText)
    ) {
      const text = showTextArgsToString(args)
      if (text) events.push({ text, color: { ...currentFill } })
    }
  }

  return events
}

function sameColor(a: Color, b: Color): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && (a.a ?? 1) === (b.a ?? 1)
}

interface MutableColorStream {
  text: string
  colors: Color[]
}

function buildColorStream(events: TextColorEvent[]): MutableColorStream {
  let text = ''
  const colors: Color[] = []
  for (const ev of events) {
    for (let i = 0; i < ev.text.length; i++) {
      text += ev.text[i]
      colors.push(ev.color)
    }
  }
  return { text, colors }
}

export interface TextItemLike {
  str: string
}

/**
 * Splits each `textContent.items[i].str` into one or more single-color
 * segments by matching it against the operator-list color stream.
 *
 * `getTextContent()` may merge multiple consecutive show operations into one
 * item even when their fill colors differ (color changes alone do not split
 * items, only font changes do). This helper restores the per-color granularity
 * so the parser can emit one RawTextItem per color segment.
 *
 * Items that cannot be matched (or that fall outside the stream) keep their
 * original text and are returned with the default black color.
 */
export function splitTextItemsByColor(
  items: ReadonlyArray<TextItemLike>,
  events: TextColorEvent[],
): ColoredSegment[] {
  const stream = buildColorStream(events)
  const segments: ColoredSegment[] = []
  let streamPos = 0

  for (let idx = 0; idx < items.length; idx++) {
    const str = items[idx]?.str ?? ''
    if (!str) continue

    let foundAt = stream.text.indexOf(str, streamPos)
    if (foundAt < 0) {
      // Try from the very beginning in case the streams desynchronized
      foundAt = stream.text.indexOf(str)
    }

    if (foundAt < 0) {
      // No match — fall back to a single black segment
      segments.push({ itemIndex: idx, startOffset: 0, text: str, color: { ...BLACK } })
      continue
    }

    // Walk str char by char, grouping consecutive characters with the same color
    let segStart = 0
    let segColor = stream.colors[foundAt]
    for (let i = 1; i < str.length; i++) {
      const c = stream.colors[foundAt + i]
      if (!sameColor(c, segColor)) {
        segments.push({
          itemIndex: idx,
          startOffset: segStart,
          text: str.slice(segStart, i),
          color: { ...segColor },
        })
        segStart = i
        segColor = c
      }
    }
    segments.push({
      itemIndex: idx,
      startOffset: segStart,
      text: str.slice(segStart),
      color: { ...segColor },
    })

    streamPos = foundAt + str.length
  }

  return segments
}
