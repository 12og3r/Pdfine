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

  it('should preserve pdfRunWidth when appending inter-line newline', () => {
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
    // pdfRunWidth should NOT be undefined — it should be preserved
    expect(run.pdfRunWidth).toBeDefined();
    // Should be: 32 (first item) + 31 (second item) = 63 (no space width added for newline)
    expect(run.pdfRunWidth).toBeCloseTo(63, 0);
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
