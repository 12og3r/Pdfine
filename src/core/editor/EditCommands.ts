import type { EditCommand, TextBlock, Paragraph, TextRun, PageModel } from '../../types/document'

export interface RunLocation {
  paragraphIdx: number;
  runIdx: number;
  localOffset: number;
}

export function getTextContent(block: TextBlock): string {
  let text = '';
  for (let pi = 0; pi < block.paragraphs.length; pi++) {
    if (pi > 0) text += '\n';
    for (const run of block.paragraphs[pi].runs) {
      text += run.text;
    }
  }
  return text;
}

export function getRunAtOffset(block: TextBlock, offset: number): RunLocation {
  let remaining = offset;
  for (let pi = 0; pi < block.paragraphs.length; pi++) {
    if (pi > 0) {
      if (remaining === 0) {
        return { paragraphIdx: pi, runIdx: 0, localOffset: 0 };
      }
      remaining--; // account for \n between paragraphs
    }
    const para = block.paragraphs[pi];
    for (let ri = 0; ri < para.runs.length; ri++) {
      const run = para.runs[ri];
      if (remaining <= run.text.length) {
        // If remaining equals run length and there's a next run, prefer start of next run
        // unless this is the last run
        if (remaining === run.text.length && ri < para.runs.length - 1) {
          return { paragraphIdx: pi, runIdx: ri + 1, localOffset: 0 };
        }
        return { paragraphIdx: pi, runIdx: ri, localOffset: remaining };
      }
      remaining -= run.text.length;
    }
  }
  // Clamp to end
  const lastPi = block.paragraphs.length - 1;
  const lastPara = block.paragraphs[lastPi];
  const lastRi = lastPara.runs.length - 1;
  return {
    paragraphIdx: lastPi,
    runIdx: lastRi,
    localOffset: lastPara.runs[lastRi].text.length,
  };
}

export function splitRunAtOffset(paragraph: Paragraph, runIdx: number, localOffset: number): void {
  const run = paragraph.runs[runIdx];
  if (localOffset <= 0 || localOffset >= run.text.length) return;
  const before: TextRun = { text: run.text.slice(0, localOffset), style: { ...run.style } };
  const after: TextRun = { text: run.text.slice(localOffset), style: { ...run.style } };
  // Split pdfCharWidths if present
  if (run.pdfCharWidths) {
    before.pdfCharWidths = run.pdfCharWidths.slice(0, localOffset);
    after.pdfCharWidths = run.pdfCharWidths.slice(localOffset);
  }
  // Each half inherits the same PDF→canvas proportional scale so later
  // insertions in either half still match the original line's metric space.
  if (run.pdfWidthScale !== undefined) {
    before.pdfWidthScale = run.pdfWidthScale;
    after.pdfWidthScale = run.pdfWidthScale;
  }
  paragraph.runs.splice(runIdx, 1, before, after);
}

function findTextBlock(page: PageModel, blockId: string): TextBlock | null {
  for (const el of page.elements) {
    if (el.type === 'text' && el.id === blockId) return el;
  }
  return null;
}

function insertTextInBlock(block: TextBlock, offset: number, text: string): void {
  // Handle inserting newlines (which creates paragraph splits)
  if (text.includes('\n')) {
    const parts = text.split('\n');
    let currentOffset = offset;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length > 0) {
        insertPlainText(block, currentOffset, parts[i]);
        currentOffset += parts[i].length;
      }
      if (i < parts.length - 1) {
        insertParagraphBreak(block, currentOffset);
        currentOffset++; // \n counts as 1 in global offset
      }
    }
    return;
  }
  insertPlainText(block, offset, text);
}

function insertPlainText(block: TextBlock, offset: number, text: string): void {
  const loc = getRunAtOffset(block, offset);
  const para = block.paragraphs[loc.paragraphIdx];
  if (para.runs.length === 0) {
    para.runs.push({ text, style: { fontId: '', fontSize: 12, fontWeight: 400, fontStyle: 'normal', color: { r: 0, g: 0, b: 0 } } });
    return;
  }
  const run = para.runs[loc.runIdx];
  run.text = run.text.slice(0, loc.localOffset) + text + run.text.slice(loc.localOffset);
  // Insert NaN entries for new characters (no PDF width → fall back to canvas measurement)
  if (run.pdfCharWidths) {
    const nanEntries = new Array(text.length).fill(NaN);
    run.pdfCharWidths.splice(loc.localOffset, 0, ...nanEntries);
  }
}

function insertParagraphBreak(block: TextBlock, offset: number): void {
  const loc = getRunAtOffset(block, offset);
  const para = block.paragraphs[loc.paragraphIdx];

  // Split the current run if needed
  if (loc.localOffset > 0 && loc.localOffset < para.runs[loc.runIdx].text.length) {
    splitRunAtOffset(para, loc.runIdx, loc.localOffset);
  }

  // Determine split point in runs array
  const splitRunIdx = loc.localOffset === 0 ? loc.runIdx : loc.runIdx + 1;
  const remainingRuns = para.runs.splice(splitRunIdx);

  const newPara: Paragraph = {
    runs: remainingRuns.length > 0 ? remainingRuns : [{ text: '', style: { ...para.runs[para.runs.length - 1].style } }],
    alignment: para.alignment,
    lineSpacing: para.lineSpacing,
  };

  block.paragraphs.splice(loc.paragraphIdx + 1, 0, newPara);
}

function deleteTextInBlock(block: TextBlock, offset: number, length: number): void {
  let remaining = length;
  while (remaining > 0) {
    const loc = getRunAtOffset(block, offset);
    const para = block.paragraphs[loc.paragraphIdx];
    const run = para.runs[loc.runIdx];
    const availableInRun = run.text.length - loc.localOffset;

    if (availableInRun > 0) {
      const deleteCount = Math.min(remaining, availableInRun);
      run.text = run.text.slice(0, loc.localOffset) + run.text.slice(loc.localOffset + deleteCount);
      // Remove corresponding pdfCharWidths entries
      if (run.pdfCharWidths) {
        run.pdfCharWidths.splice(loc.localOffset, deleteCount);
      }
      remaining -= deleteCount;
      // Remove empty runs (but keep at least one per paragraph)
      if (run.text.length === 0 && para.runs.length > 1) {
        para.runs.splice(loc.runIdx, 1);
      }
    } else {
      // At end of paragraph - merge with next paragraph (delete \n)
      if (loc.paragraphIdx < block.paragraphs.length - 1) {
        const nextPara = block.paragraphs[loc.paragraphIdx + 1];
        para.runs.push(...nextPara.runs);
        block.paragraphs.splice(loc.paragraphIdx + 1, 1);
        remaining--;
      } else {
        break; // Nothing more to delete
      }
    }
  }
}

export function applyCommand(command: EditCommand, pages: PageModel[]): void {
  switch (command.type) {
    case 'INSERT_TEXT': {
      const page = pages[command.pageIdx];
      const block = findTextBlock(page, command.blockId);
      if (!block) return;
      insertTextInBlock(block, command.offset, command.text);
      page.dirty = true;
      break;
    }
    case 'DELETE_TEXT': {
      const page = pages[command.pageIdx];
      const block = findTextBlock(page, command.blockId);
      if (!block) return;
      deleteTextInBlock(block, command.offset, command.length);
      page.dirty = true;
      break;
    }
    case 'REPLACE_TEXT': {
      const page = pages[command.pageIdx];
      const block = findTextBlock(page, command.blockId);
      if (!block) return;
      deleteTextInBlock(block, command.offset, command.length);
      insertTextInBlock(block, command.offset, command.text);
      page.dirty = true;
      break;
    }
    case 'CHANGE_STYLE': {
      const page = pages[command.pageIdx];
      const block = findTextBlock(page, command.blockId);
      if (!block) return;
      applyStyleToRange(block, command.offset, command.length, command.style);
      page.dirty = true;
      break;
    }
    case 'BATCH': {
      for (const sub of command.commands) {
        applyCommand(sub, pages);
      }
      break;
    }
    default:
      // Other command types (INSERT_IMAGE, DELETE_ELEMENT, etc.) handled elsewhere
      break;
  }
}

function applyStyleToRange(
  block: TextBlock,
  offset: number,
  length: number,
  style: Partial<import('../../types/document').TextStyle>,
): void {
  const rangeStart = offset;
  const rangeEnd = offset + length;
  if (rangeEnd <= rangeStart) return;

  // Walk every run, compute its intersection with [rangeStart, rangeEnd) in
  // the block's global text-offset space (accounting for the implicit \n
  // between paragraphs), and apply the style to the covered slice — splitting
  // the run when the boundary falls mid-text. This replaces the previous
  // "split-then-iterate" implementation, which miscomputed endLoc after the
  // start split and silently dropped the last run when the range ended at a
  // run boundary (so Bold / colour on a whole block or across-runs selection
  // sometimes touched nothing, sometimes touched a partial set of runs).
  let cursor = 0;
  for (let pi = 0; pi < block.paragraphs.length; pi++) {
    if (pi > 0) cursor++; // \n between paragraphs
    const para = block.paragraphs[pi];

    let ri = 0;
    while (ri < para.runs.length) {
      const run = para.runs[ri];
      const runStart = cursor;
      const runEnd = runStart + run.text.length;
      // Advance the cursor past the original run length regardless of whether
      // we split it — the combined length of the split pieces equals the
      // original length, so global offsets stay aligned.
      cursor = runEnd;

      // No overlap with the target range — leave the run alone.
      if (runEnd <= rangeStart || runStart >= rangeEnd) {
        ri++;
        continue;
      }

      const interStart = Math.max(rangeStart, runStart);
      const interEnd = Math.min(rangeEnd, runEnd);

      // Run fully inside the range — apply in place.
      if (interStart === runStart && interEnd === runEnd) {
        run.style = { ...run.style, ...style };
        ri++;
        continue;
      }

      // Partial overlap. Split once or twice and tag the intersecting piece.
      const startsInside = interStart > runStart;
      const endsInside = interEnd < runEnd;

      if (startsInside && endsInside) {
        // [  run  ]  →  [before][target][after]
        splitRunAtOffset(para, ri, interStart - runStart);
        // After the first split: runs[ri] = before (untouched, outside range),
        // runs[ri + 1] = the remainder with length runEnd - interStart. The
        // intersection within the remainder lives at [0, interEnd - interStart).
        splitRunAtOffset(para, ri + 1, interEnd - interStart);
        // runs[ri] = before, runs[ri + 1] = target, runs[ri + 2] = after
        para.runs[ri + 1].style = { ...para.runs[ri + 1].style, ...style };
        ri += 3;
      } else if (startsInside) {
        // Range starts mid-run and extends past the run's end.
        splitRunAtOffset(para, ri, interStart - runStart);
        // runs[ri] = before (untouched), runs[ri + 1] = target
        para.runs[ri + 1].style = { ...para.runs[ri + 1].style, ...style };
        ri += 2;
      } else {
        // Range starts at the run's start (or earlier) and ends mid-run.
        splitRunAtOffset(para, ri, interEnd - runStart);
        // runs[ri] = target, runs[ri + 1] = after (untouched)
        para.runs[ri].style = { ...para.runs[ri].style, ...style };
        ri += 2;
      }
    }
  }
}

export function inverseCommand(command: EditCommand): EditCommand {
  switch (command.type) {
    case 'INSERT_TEXT':
      return {
        type: 'DELETE_TEXT',
        pageIdx: command.pageIdx,
        blockId: command.blockId,
        offset: command.offset,
        length: command.text.length,
        deletedText: command.text,
      };
    case 'DELETE_TEXT':
      return {
        type: 'INSERT_TEXT',
        pageIdx: command.pageIdx,
        blockId: command.blockId,
        offset: command.offset,
        text: command.deletedText,
      };
    case 'REPLACE_TEXT':
      return {
        type: 'REPLACE_TEXT',
        pageIdx: command.pageIdx,
        blockId: command.blockId,
        offset: command.offset,
        length: command.text.length,
        text: command.originalText,
        originalText: command.text,
      };
    case 'CHANGE_STYLE':
      return {
        type: 'CHANGE_STYLE',
        pageIdx: command.pageIdx,
        blockId: command.blockId,
        offset: command.offset,
        length: command.length,
        style: command.originalStyle,
        originalStyle: command.style,
      };
    case 'BATCH':
      return {
        type: 'BATCH',
        commands: command.commands.map(inverseCommand).reverse(),
      };
    default:
      return command;
  }
}
