import type { TextStyle } from '../../types/document';
import type { IFontManager } from '../interfaces/IFontManager';
import { TextMeasurer } from './TextMeasurer';

export interface CharInfo {
  char: string;
  style: TextStyle;
  pdfWidth?: number;  // original PDF glyph width; undefined or NaN → fall back to canvas measurement
}

const NO_LINE_START = new Set('。，、；：！？）」』】〉》,.;:!?)]}');
const NO_LINE_END = new Set('（「『【〈《([{');

const CJK_RANGES: Array<[number, number]> = [
  [0x4e00, 0x9fff],   // CJK Unified
  [0x3400, 0x4dbf],   // CJK Extension A
  [0x3000, 0x303f],   // CJK Symbols
  [0x3040, 0x309f],   // Hiragana
  [0x30a0, 0x30ff],   // Katakana
  [0xf900, 0xfaff],   // CJK Compatibility
  [0xfe30, 0xfe4f],   // CJK Compatibility Forms
  [0xff00, 0xffef],   // Fullwidth Forms
];

function isCJK(char: string): boolean {
  const code = char.codePointAt(0)!;
  for (const [lo, hi] of CJK_RANGES) {
    if (code >= lo && code <= hi) return true;
  }
  return false;
}

export class GreedyLineBreaker {
  private measurer = new TextMeasurer();

  breakLines(
    chars: CharInfo[],
    maxWidth: number,
    fontManager: IFontManager,
    _lineSpacing: number,
  ): number[] {
    if (chars.length === 0) return [];

    const breaks: number[] = [];
    let lineWidth = 0;
    let lastBreakOpportunity = -1;
    let lineStart = 0;

    for (let i = 0; i < chars.length; i++) {
      const { char, style, pdfWidth } = chars[i];
      const letterSpacing = style.letterSpacing ?? 0;
      const charWidth = this.measurer.measureChar(char, style.fontId, style.fontSize, fontManager, letterSpacing, pdfWidth);

      // '\n' inside a run is the parser's inter-line-join marker placed at
      // every PDF-internal line boundary (see core/parser/TextBlockBuilder).
      // User-typed newlines create a new Paragraph (see
      // core/editor/EditCommands), so any '\n' we see here came from the PDF
      // and IS a line boundary we must preserve — force a hard break.
      //
      // Treating it as a soft break collapsed multi-row "label: value" blocks
      // on edit-mode entry: because bounds.width = width of the widest PDF
      // row, the greedy packer would swallow the next short row onto the
      // preceding line ("Employee Name: Guan Zhenzhi NRIC/FIN …"). A hard
      // break at '\n' keeps every PDF row on its own canvas line.
      if (char === '\n') {
        breaks.push(i + 1);
        lineStart = i + 1;
        lineWidth = 0;
        lastBreakOpportunity = -1;
        continue;
      }

      // Determine break opportunities
      if (this.isBreakOpportunity(chars, i)) {
        lastBreakOpportunity = i;
      }

      lineWidth += charWidth;

      // Use a small tolerance to avoid soft wraps caused by floating-point
      // rounding in proportional width scaling from PDF measurements.
      const SOFT_WRAP_TOLERANCE = 0.5;
      if (lineWidth > maxWidth + SOFT_WRAP_TOLERANCE && i > lineStart) {
        if (lastBreakOpportunity > lineStart) {
          // Break at last opportunity
          let breakAt = lastBreakOpportunity;
          // For spaces and '\n' markers, break AFTER the character so the
          // zero/white-space trailing glyph stays on the previous line (and
          // gets trimmed by ParagraphLayout's trailing-space/newline trim).
          if (chars[breakAt].char === ' ' || chars[breakAt].char === '\n') {
            breakAt = breakAt + 1;
          }
          breaks.push(breakAt);
          lineStart = breakAt;
          // Recalculate width from lineStart to i
          lineWidth = 0;
          for (let j = lineStart; j <= i; j++) {
            const s = chars[j].style;
            const ls = s.letterSpacing ?? 0;
            lineWidth += this.measurer.measureChar(chars[j].char, s.fontId, s.fontSize, fontManager, ls, chars[j].pdfWidth);
          }
          lastBreakOpportunity = -1;
        } else {
          // Emergency break at current character
          breaks.push(i);
          lineStart = i;
          lineWidth = charWidth;
          lastBreakOpportunity = -1;
        }
      }
    }

    return breaks;
  }

  private isBreakOpportunity(chars: CharInfo[], index: number): boolean {
    const char = chars[index].char;
    const nextChar = index + 1 < chars.length ? chars[index + 1].char : null;

    // Space is a break opportunity
    if (char === ' ') return true;

    // After a hyphen
    if (char === '-') return true;

    // CJK: can break between any CJK characters, respecting punctuation rules
    if (isCJK(char) || (nextChar && isCJK(nextChar))) {
      // Don't break if next char cannot start a line
      if (nextChar && NO_LINE_START.has(nextChar)) return false;
      // Don't break if current char cannot end a line
      if (NO_LINE_END.has(char)) return false;
      return true;
    }

    return false;
  }
}
