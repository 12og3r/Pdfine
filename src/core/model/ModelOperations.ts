import type { DocumentModel, PageModel, TextBlock, PageElement } from '../../types/document'

export function findTextBlock(page: PageModel, blockId: string): TextBlock | undefined {
  for (const el of page.elements) {
    if (el.type === 'text' && el.id === blockId) {
      return el;
    }
  }
  return undefined;
}

export function findElement(page: PageModel, elementId: string): PageElement | undefined {
  return page.elements.find(
    (el) => ('id' in el) && el.id === elementId
  );
}

export function getPlainText(block: TextBlock): string {
  const parts: string[] = [];
  for (let pi = 0; pi < block.paragraphs.length; pi++) {
    const para = block.paragraphs[pi];
    for (const run of para.runs) {
      parts.push(run.text);
    }
    if (pi < block.paragraphs.length - 1) {
      parts.push('\n');
    }
  }
  return parts.join('');
}

export function getTextOffset(block: TextBlock, paragraphIdx: number, runIdx: number, charIdx: number): number {
  let offset = 0;
  for (let pi = 0; pi < block.paragraphs.length; pi++) {
    const para = block.paragraphs[pi];
    for (let ri = 0; ri < para.runs.length; ri++) {
      if (pi === paragraphIdx && ri === runIdx) {
        return offset + charIdx;
      }
      offset += para.runs[ri].text.length;
    }
    if (pi < block.paragraphs.length - 1) {
      offset += 1; // newline between paragraphs
    }
  }
  return offset;
}

export function setTextAtOffset(block: TextBlock, offset: number, length: number, newText: string): void {
  let currentOffset = 0;

  for (let pi = 0; pi < block.paragraphs.length; pi++) {
    const para = block.paragraphs[pi];
    for (let ri = 0; ri < para.runs.length; ri++) {
      const run = para.runs[ri];
      const runEnd = currentOffset + run.text.length;

      if (currentOffset <= offset && offset < runEnd) {
        const localStart = offset - currentOffset;
        const localEnd = Math.min(localStart + length, run.text.length);
        const consumed = localEnd - localStart;

        run.text =
          run.text.slice(0, localStart) +
          newText +
          run.text.slice(localEnd);

        // If the deletion spans beyond this run, continue into next runs
        let remaining = length - consumed;
        if (remaining > 0) {
          let nextRi = ri + 1;
          let nextPi = pi;
          while (remaining > 0) {
            if (nextRi >= block.paragraphs[nextPi].runs.length) {
              nextPi++;
              nextRi = 0;
              if (nextPi >= block.paragraphs.length) break;
              remaining--; // consume the paragraph separator
              if (remaining <= 0) break;
            }
            const nextRun = block.paragraphs[nextPi].runs[nextRi];
            const deleteFromNext = Math.min(remaining, nextRun.text.length);
            nextRun.text = nextRun.text.slice(deleteFromNext);
            remaining -= deleteFromNext;
            if (nextRun.text.length === 0) {
              block.paragraphs[nextPi].runs.splice(nextRi, 1);
            } else {
              nextRi++;
            }
          }
        }
        return;
      }
      currentOffset = runEnd;
    }
    if (pi < block.paragraphs.length - 1) {
      currentOffset += 1; // newline
    }
  }
}

export function getPageByIndex(doc: DocumentModel, pageIdx: number): PageModel | undefined {
  return doc.pages[pageIdx];
}
