import type { TextStyle } from '../../types/document';
import type { IFontManager } from '../interfaces/IFontManager';
import type { CharInfo } from './GreedyLineBreaker';
import { TextMeasurer } from './TextMeasurer';

interface BreakNode {
  index: number;
  demerits: number;
  ratio: number;
  line: number;
  fitnessClass: number;
  totalWidth: number;
  totalStretch: number;
  totalShrink: number;
  previous: BreakNode | null;
}

const INFINITY_PENALTY = 10000;
const HYPHEN_PENALTY = 50;
const FITNESS_DEMERIT = 100;

function getFitnessClass(ratio: number): number {
  if (ratio < -0.5) return 0; // tight
  if (ratio <= 0.5) return 1; // normal
  if (ratio <= 1) return 2;   // loose
  return 3;                     // very loose
}

export class KnuthPlassLineBreaker {
  private measurer = new TextMeasurer();

  breakLines(
    chars: CharInfo[],
    maxWidth: number,
    fontManager: IFontManager,
    _lineSpacing: number,
  ): number[] {
    if (chars.length === 0) return [];

    // Build a list of "boxes" (characters), "glue" (spaces), and penalties
    const items = this.buildItems(chars, fontManager);
    const breaks = this.computeBreaks(items, maxWidth);
    return breaks;
  }

  private buildItems(chars: CharInfo[], fontManager: IFontManager): KPItem[] {
    const items: KPItem[] = [];

    for (let i = 0; i < chars.length; i++) {
      const { char, style } = chars[i];
      const letterSpacing = style.letterSpacing ?? 0;

      if (char === '\n') {
        // Forced break
        items.push({ type: 'penalty', index: i + 1, width: 0, penalty: -INFINITY_PENALTY, flagged: false });
        continue;
      }

      if (char === ' ') {
        const spaceWidth = this.measurer.measureChar(' ', style.fontId, style.fontSize, fontManager, letterSpacing);
        items.push({
          type: 'glue',
          index: i,
          width: spaceWidth,
          stretch: spaceWidth * 0.5,
          shrink: spaceWidth * 0.33,
        });
        continue;
      }

      if (char === '-') {
        const charWidth = this.measurer.measureChar(char, style.fontId, style.fontSize, fontManager, letterSpacing);
        items.push({ type: 'box', index: i, width: charWidth, char, style });
        items.push({ type: 'penalty', index: i + 1, width: 0, penalty: HYPHEN_PENALTY, flagged: true });
        continue;
      }

      const charWidth = this.measurer.measureChar(char, style.fontId, style.fontSize, fontManager, letterSpacing);
      items.push({ type: 'box', index: i, width: charWidth, char, style });
    }

    // Add finishing glue and forced break at end
    items.push({ type: 'glue', index: chars.length, width: 0, stretch: INFINITY_PENALTY, shrink: 0 });
    items.push({ type: 'penalty', index: chars.length, width: 0, penalty: -INFINITY_PENALTY, flagged: false });

    return items;
  }

  private computeBreaks(items: KPItem[], maxWidth: number): number[] {
    const activeNodes: BreakNode[] = [{
      index: 0, demerits: 0, ratio: 0, line: 0,
      fitnessClass: 1, totalWidth: 0, totalStretch: 0, totalShrink: 0, previous: null,
    }];

    let sumWidth = 0;
    let sumStretch = 0;
    let sumShrink = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type === 'box') {
        sumWidth += item.width;
        continue;
      }

      if (item.type === 'penalty' && item.penalty >= INFINITY_PENALTY) {
        continue;
      }

      // This is a feasible breakpoint (glue or penalty < infinity)
      let bestNode: BreakNode | null = null;
      let bestDemerits = Infinity;

      for (let j = activeNodes.length - 1; j >= 0; j--) {
        const node = activeNodes[j];
        const lineWidth = sumWidth - node.totalWidth;
        const lineStretch = sumStretch - node.totalStretch;
        const lineShrink = sumShrink - node.totalShrink;

        let ratio: number;
        if (lineWidth < maxWidth) {
          ratio = lineStretch > 0 ? (maxWidth - lineWidth) / lineStretch : INFINITY_PENALTY;
        } else if (lineWidth > maxWidth) {
          ratio = lineShrink > 0 ? (maxWidth - lineWidth) / lineShrink : INFINITY_PENALTY;
        } else {
          ratio = 0;
        }

        // Remove nodes that produce too-short lines
        if (ratio < -1) {
          activeNodes.splice(j, 1);
          continue;
        }

        const badness = ratio >= 0
          ? Math.min(100 * Math.pow(Math.abs(ratio), 3), INFINITY_PENALTY)
          : INFINITY_PENALTY;

        let demerits: number;
        const penalty = item.type === 'penalty' ? item.penalty : 0;

        if (penalty >= 0) {
          demerits = Math.pow(1 + badness + penalty, 2);
        } else if (penalty > -INFINITY_PENALTY) {
          demerits = Math.pow(1 + badness, 2) - Math.pow(penalty, 2);
        } else {
          demerits = Math.pow(1 + badness, 2);
        }

        const fitness = getFitnessClass(ratio);
        if (Math.abs(fitness - node.fitnessClass) > 1) {
          demerits += FITNESS_DEMERIT;
        }

        demerits += node.demerits;

        if (demerits < bestDemerits) {
          bestDemerits = demerits;
          bestNode = node;
        }
      }

      if (bestNode) {
        const breakIndex = item.type === 'penalty' ? item.index : item.index + 1;
        activeNodes.push({
          index: breakIndex,
          demerits: bestDemerits,
          ratio: 0,
          line: bestNode.line + 1,
          fitnessClass: getFitnessClass(0),
          totalWidth: sumWidth,
          totalStretch: sumStretch,
          totalShrink: sumShrink,
          previous: bestNode,
        });
      }

      if (item.type === 'glue') {
        sumWidth += item.width;
        sumStretch += item.stretch;
        sumShrink += item.shrink;
      }
    }

    // Trace back best path
    if (activeNodes.length === 0) return [];

    let node = activeNodes[activeNodes.length - 1];
    const breakPositions: number[] = [];

    while (node.previous) {
      if (node.index > 0 && node.index < Infinity) {
        breakPositions.unshift(node.index);
      }
      node = node.previous;
    }

    // Remove the final break (end of text)
    if (breakPositions.length > 0 && breakPositions[breakPositions.length - 1] >= items[items.length - 1].index) {
      breakPositions.pop();
    }

    return breakPositions;
  }
}

type KPItem =
  | { type: 'box'; index: number; width: number; char: string; style: TextStyle }
  | { type: 'glue'; index: number; width: number; stretch: number; shrink: number }
  | { type: 'penalty'; index: number; width: number; penalty: number; flagged: boolean };
