import { describe, it, expect } from 'vitest'
import { TextBlockBuilder } from '../../../src/core/parser/TextBlockBuilder'
import type { RawTextItem } from '../../../src/core/parser/TextBlockBuilder'
import type { Color } from '../../../src/types/document'

const color: Color = { r: 0, g: 0, b: 0, a: 1 };

function makeItem(overrides: Partial<RawTextItem> & { text: string; x: number; y: number }): RawTextItem {
  return {
    width: overrides.text.length * 6,
    height: 12,
    fontSize: 12,
    fontId: 'TestFont',
    fontWeight: 400,
    fontStyle: 'normal',
    color,
    editable: true,
    ...overrides,
  };
}

describe('TextBlockBuilder pdfRunWidth preservation', () => {
  const builder = new TextBlockBuilder();

  it('should preserve per-line PDF widths when appending inter-line newline', () => {
    // Two lines that will be merged into one paragraph.
    // Items on each line have pdfItemWidth set.
    // Inter-line joins use newline (not space) to preserve original line structure.
    const items: RawTextItem[] = [
      makeItem({ text: 'Hello', x: 0, y: 12, width: 30, pdfItemWidth: 32 }),
      makeItem({ text: 'World', x: 0, y: 26, width: 30, pdfItemWidth: 31 }),
    ];

    const blocks = builder.buildBlocks(items);
    expect(blocks.length).toBe(1);

    const run = blocks[0].paragraphs[0].runs[0];
    // The inter-line newline should be added
    expect(run.text).toBe('Hello\nWorld');
    // Multi-line runs should use pdfLineWidths (per-segment) instead of pdfRunWidth
    expect(run.pdfLineWidths).toBeDefined();
    expect(run.pdfLineWidths).toHaveLength(2);
    expect(run.pdfLineWidths![0]).toBeCloseTo(32, 0); // first line: "Hello"
    expect(run.pdfLineWidths![1]).toBeCloseTo(31, 0); // second line: "World"
    // pdfRunWidth should be cleared since it's now tracked per-line
    expect(run.pdfRunWidth).toBeUndefined();
  });

  it('should detect centered alignment when paragraph lines share a common center', () => {
    // Reproduces the bug where "Sample PDF" (narrower) and "Created for testing PDFObject"
    // (wider) are both visually centered in the PDF but end up in the same text block.
    // Before the fix, alignment was hardcoded to 'left', causing the narrower line to
    // render at bounds.x + 0 (left of its original x) on edit mode entry.
    //
    // Line 1: "Sample PDF" - starts at x=190.31, width=231.66 → ends at 421.97, center 306.14
    // Line 2: "Created for testing PDFObject" - starts at x=179.47, width=253.34 → ends at 432.81, center 306.14
    const items: RawTextItem[] = [
      makeItem({
        text: 'Sample PDF',
        x: 190.31, y: 84.1,  // baseline y=84.1 (line 1)
        width: 231.66, height: 36, fontSize: 36, fontId: 'BigFont',
        pdfItemWidth: 231.66,
      }),
      makeItem({
        text: 'Created for testing PDFObject',
        x: 179.47, y: 123.94,  // baseline y=123.94 (line 2, pdfLineHeight ≈ 39.84)
        width: 253.34, height: 18, fontSize: 18, fontId: 'SmallFont',
        pdfItemWidth: 253.34,
      }),
    ];

    const blocks = builder.buildBlocks(items);
    expect(blocks.length).toBe(1);
    const block = blocks[0];

    // The block bounds should span the widest line
    expect(block.bounds.x).toBeCloseTo(179.47, 1);
    expect(block.bounds.width).toBeCloseTo(253.34, 1);

    // The paragraph's alignment should be detected as 'center' since both lines
    // share the same visual center (306.14)
    expect(block.paragraphs[0].alignment).toBe('center');
  });

  it('should keep left alignment when lines share a common left edge', () => {
    // Normal left-aligned paragraph: all lines start at the same x.
    const items: RawTextItem[] = [
      makeItem({ text: 'This is line one.', x: 36.14, y: 12, width: 96, pdfItemWidth: 96 }),
      makeItem({ text: 'This is line two.', x: 36.14, y: 26, width: 96, pdfItemWidth: 96 }),
      makeItem({ text: 'This is line three.', x: 36.14, y: 40, width: 108, pdfItemWidth: 108 }),
    ];

    const blocks = builder.buildBlocks(items);
    expect(blocks.length).toBe(1);
    expect(blocks[0].paragraphs[0].alignment).toBe('left');
  });

  it('should detect right alignment when lines share a common right edge', () => {
    // Lines right-aligned: same maxX but different minX.
    const items: RawTextItem[] = [
      makeItem({ text: 'short', x: 100, y: 12, width: 30, pdfItemWidth: 30 }),
      makeItem({ text: 'a bit longer', x: 70, y: 26, width: 60, pdfItemWidth: 60 }),
    ];

    const blocks = builder.buildBlocks(items);
    expect(blocks.length).toBe(1);
    // minX for line 1 = 100, for line 2 = 70. maxX for line 1 = 130, for line 2 = 130.
    expect(blocks[0].paragraphs[0].alignment).toBe('right');
  });

  it('should use item.width as fallback when pdfItemWidth is missing on merged item', () => {
    // Two items on the same line, same style. First has pdfItemWidth, second doesn't.
    const items: RawTextItem[] = [
      makeItem({ text: 'Foo', x: 0, y: 12, width: 20, pdfItemWidth: 22 }),
      makeItem({ text: 'Bar', x: 20, y: 12, width: 18 }), // no pdfItemWidth
    ];

    const blocks = builder.buildBlocks(items);
    expect(blocks.length).toBe(1);

    const run = blocks[0].paragraphs[0].runs[0];
    expect(run.text).toBe('FooBar');
    // pdfRunWidth should be preserved: 22 + 18 (item.width as fallback)
    expect(run.pdfRunWidth).toBeDefined();
    expect(run.pdfRunWidth).toBeCloseTo(40, 0);
  });
});
