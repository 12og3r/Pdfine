import type { TextStyle } from '../../types/document';
import type { IFontManager } from '../interfaces/IFontManager';
import { TextMeasurer } from './TextMeasurer';

export interface CharInfo {
  char: string;
  style: TextStyle;
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
      const { char, style } = chars[i];
      const letterSpacing = style.letterSpacing ?? 0;
      const charWidth = this.measurer.measureChar(char, style.fontId, style.fontSize, fontManager, letterSpacing);

      // Newline forces a break
      if (char === '\n') {
        breaks.push(i + 1);
        lineWidth = 0;
        lastBreakOpportunity = -1;
        lineStart = i + 1;
        continue;
      }

      // Determine break opportunities
      if (this.isBreakOpportunity(chars, i)) {
        lastBreakOpportunity = i;
      }

      lineWidth += charWidth;

      if (lineWidth > maxWidth && i > lineStart) {
        if (lastBreakOpportunity > lineStart) {
          // Break at last opportunity
          let breakAt = lastBreakOpportunity;
          // For spaces, break after the space
          if (chars[breakAt].char === ' ') {
            breakAt = breakAt + 1;
          }
          breaks.push(breakAt);
          lineStart = breakAt;
          // Recalculate width from lineStart to i
          lineWidth = 0;
          for (let j = lineStart; j <= i; j++) {
            const s = chars[j].style;
            const ls = s.letterSpacing ?? 0;
            lineWidth += this.measurer.measureChar(chars[j].char, s.fontId, s.fontSize, fontManager, ls);
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
