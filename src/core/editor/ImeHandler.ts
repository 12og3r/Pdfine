import type { DocumentModel, EditCommand, TextBlock } from '../../types/document'
import type { EventBus } from '../infra/EventBus'
import type { CursorManager } from './CursorManager'
import type { CommandHistory } from './CommandHistory'
import type { SelectionManager } from './SelectionManager'
import { getTextContent } from './EditCommands'

export class ImeHandler {
  private composing = false;
  private compositionText = '';
  private compositionStartOffset = 0;
  private ignoreNextInput = false;

  private documentModel: DocumentModel;
  private eventBus: EventBus;
  private cursorManager: CursorManager;
  private selectionManager: SelectionManager;
  private commandHistory: CommandHistory;

  constructor(
    documentModel: DocumentModel,
    eventBus: EventBus,
    cursorManager: CursorManager,
    selectionManager: SelectionManager,
    commandHistory: CommandHistory,
  ) {
    this.documentModel = documentModel;
    this.eventBus = eventBus;
    this.cursorManager = cursorManager;
    this.selectionManager = selectionManager;
    this.commandHistory = commandHistory;
  }

  handleCompositionStart(): void {
    this.composing = true;
    this.compositionText = '';
    this.compositionStartOffset = this.cursorManager.getCharOffset();

    // If there's a selection, delete it first
    if (this.selectionManager.hasSelection()) {
      const sel = this.selectionManager.getSelection()!;
      const block = this.getEditingBlock();
      if (block) {
        const deletedText = getTextContent(block).slice(sel.startOffset, sel.endOffset);
        const cmd: EditCommand = {
          type: 'DELETE_TEXT',
          pageIdx: sel.pageIdx,
          blockId: sel.blockId,
          offset: sel.startOffset,
          length: sel.endOffset - sel.startOffset,
          deletedText,
        };
        this.commandHistory.push(cmd);
        this.cursorManager.setCursor(sel.pageIdx, sel.blockId, sel.startOffset);
        this.compositionStartOffset = sel.startOffset;
        this.selectionManager.clearSelection();
        this.eventBus.emit('textChanged', { pageIdx: sel.pageIdx, blockId: sel.blockId });
      }
    }
  }

  handleCompositionUpdate(event: CompositionEvent): void {
    if (!this.composing) return;
    this.compositionText = event.data || '';
  }

  handleCompositionEnd(event: CompositionEvent): void {
    if (!this.composing) return;
    const finalText = event.data || '';
    this.composing = false;
    this.compositionText = '';

    const blockId = this.cursorManager.getBlockId();
    const pageIdx = this.cursorManager.getPageIdx();
    if (!blockId) return;

    const cmd: EditCommand = {
      type: 'INSERT_TEXT',
      pageIdx,
      blockId,
      offset: this.compositionStartOffset,
      text: finalText,
    };
    this.commandHistory.push(cmd);
    this.cursorManager.setCursor(pageIdx, blockId, this.compositionStartOffset + finalText.length);
    this.eventBus.emit('textChanged', { pageIdx, blockId });

    // Safari may fire an extra input event after compositionend - ignore it
    this.ignoreNextInput = true;
    queueMicrotask(() => {
      this.ignoreNextInput = false;
    });
  }

  shouldIgnoreInput(): boolean {
    return this.ignoreNextInput;
  }

  isComposing(): boolean {
    return this.composing;
  }

  getCompositionText(): string {
    return this.compositionText;
  }

  getCompositionStartOffset(): number {
    return this.compositionStartOffset;
  }

  private getEditingBlock(): TextBlock | null {
    const blockId = this.cursorManager.getBlockId();
    const pageIdx = this.cursorManager.getPageIdx();
    if (!blockId) return null;
    const page = this.documentModel.pages[pageIdx];
    if (!page) return null;
    for (const el of page.elements) {
      if (el.type === 'text' && el.id === blockId) return el;
    }
    return null;
  }

  destroy(): void {
    this.composing = false;
    this.compositionText = '';
  }
}
