import type { DocumentModel, EditCommand, TextBlock } from '../../types/document'
import type { EventBus } from '../infra/EventBus'
import type { CursorManager } from './CursorManager'
import type { SelectionManager } from './SelectionManager'
import type { CommandHistory } from './CommandHistory'
import type { ImeHandler } from './ImeHandler'
import { getTextContent } from './EditCommands'

export class InputHandler {
  private documentModel: DocumentModel;
  private eventBus: EventBus;
  private cursorManager: CursorManager;
  private selectionManager: SelectionManager;
  private commandHistory: CommandHistory;
  private imeHandler: ImeHandler;

  constructor(
    documentModel: DocumentModel,
    eventBus: EventBus,
    cursorManager: CursorManager,
    selectionManager: SelectionManager,
    commandHistory: CommandHistory,
    imeHandler: ImeHandler,
  ) {
    this.documentModel = documentModel;
    this.eventBus = eventBus;
    this.cursorManager = cursorManager;
    this.selectionManager = selectionManager;
    this.commandHistory = commandHistory;
    this.imeHandler = imeHandler;
  }

  handleBeforeInput(event: InputEvent): void {
    // Ignore during IME composition
    if (this.imeHandler.isComposing()) return;
    if (this.imeHandler.shouldIgnoreInput()) return;

    const blockId = this.cursorManager.getBlockId();
    const pageIdx = this.cursorManager.getPageIdx();
    if (!blockId) return;

    switch (event.inputType) {
      case 'insertText':
        this.handleInsertText(pageIdx, blockId, event.data || '');
        break;
      case 'insertLineBreak':
      case 'insertParagraph':
        this.handleInsertText(pageIdx, blockId, '\n');
        break;
      case 'deleteContentBackward':
        this._deleteBackward(pageIdx, blockId);
        break;
      case 'deleteContentForward':
        this._deleteForward(pageIdx, blockId);
        break;
      case 'insertFromPaste':
        this.handleInsertText(pageIdx, blockId, event.data || (event as InputEvent & { dataTransfer?: DataTransfer }).dataTransfer?.getData('text/plain') || '');
        break;
      case 'deleteWordBackward':
        this._deleteWordBackward(pageIdx, blockId);
        break;
      case 'deleteWordForward':
        this._deleteWordForward(pageIdx, blockId);
        break;
    }
  }

  private handleInsertText(pageIdx: number, blockId: string, text: string): void {
    if (!text) return;

    // Delete selection first if any
    const insertOffset = this.deleteSelectionIfAny(pageIdx, blockId);
    const offset = insertOffset ?? this.cursorManager.getCharOffset();

    const cmd: EditCommand = {
      type: 'INSERT_TEXT',
      pageIdx,
      blockId,
      offset,
      text,
    };
    this.commandHistory.push(cmd);
    this.cursorManager.setCursor(pageIdx, blockId, offset + text.length);
    this.eventBus.emit('textChanged', { pageIdx, blockId });

    if (text === ' ' || text === '\n') {
      this.commandHistory.breakMerge();
    }
  }

  handleInsertNewline(): void {
    const blockId = this.cursorManager.getBlockId();
    const pageIdx = this.cursorManager.getPageIdx();
    if (!blockId) return;
    this.handleInsertText(pageIdx, blockId, '\n');
  }

  handleDeleteBackward(): void {
    const blockId = this.cursorManager.getBlockId();
    const pageIdx = this.cursorManager.getPageIdx();
    if (!blockId) return;
    this._deleteBackward(pageIdx, blockId);
  }

  handleDeleteForward(): void {
    const blockId = this.cursorManager.getBlockId();
    const pageIdx = this.cursorManager.getPageIdx();
    if (!blockId) return;
    this._deleteForward(pageIdx, blockId);
  }

  handleDeleteWordBackward(): void {
    const blockId = this.cursorManager.getBlockId();
    const pageIdx = this.cursorManager.getPageIdx();
    if (!blockId) return;
    this._deleteWordBackward(pageIdx, blockId);
  }

  handleDeleteWordForward(): void {
    const blockId = this.cursorManager.getBlockId();
    const pageIdx = this.cursorManager.getPageIdx();
    if (!blockId) return;
    this._deleteWordForward(pageIdx, blockId);
  }

  private _deleteBackward(pageIdx: number, blockId: string): void {
    if (this.selectionManager.hasSelection()) {
      this.deleteCurrentSelection(pageIdx, blockId);
      return;
    }

    const offset = this.cursorManager.getCharOffset();
    if (offset <= 0) return;

    const block = this.getBlock(pageIdx, blockId);
    if (!block) return;
    const text = getTextContent(block);
    const deletedText = text[offset - 1];

    const cmd: EditCommand = {
      type: 'DELETE_TEXT',
      pageIdx,
      blockId,
      offset: offset - 1,
      length: 1,
      deletedText,
    };
    this.commandHistory.push(cmd);
    this.commandHistory.breakMerge();
    this.cursorManager.setCursor(pageIdx, blockId, offset - 1);
    this.eventBus.emit('textChanged', { pageIdx, blockId });
  }

  private _deleteForward(pageIdx: number, blockId: string): void {
    if (this.selectionManager.hasSelection()) {
      this.deleteCurrentSelection(pageIdx, blockId);
      return;
    }

    const offset = this.cursorManager.getCharOffset();
    const block = this.getBlock(pageIdx, blockId);
    if (!block) return;
    const text = getTextContent(block);
    if (offset >= text.length) return;

    const deletedText = text[offset];
    const cmd: EditCommand = {
      type: 'DELETE_TEXT',
      pageIdx,
      blockId,
      offset,
      length: 1,
      deletedText,
    };
    this.commandHistory.push(cmd);
    this.commandHistory.breakMerge();
    this.eventBus.emit('textChanged', { pageIdx, blockId });
  }

  private _deleteWordBackward(pageIdx: number, blockId: string): void {
    if (this.selectionManager.hasSelection()) {
      this.deleteCurrentSelection(pageIdx, blockId);
      return;
    }
    const block = this.getBlock(pageIdx, blockId);
    if (!block) return;
    const text = getTextContent(block);
    const offset = this.cursorManager.getCharOffset();
    let pos = offset;
    while (pos > 0 && /\s/.test(text[pos - 1])) pos--;
    while (pos > 0 && !/\s/.test(text[pos - 1])) pos--;
    if (pos === offset) return;

    const deletedText = text.slice(pos, offset);
    const cmd: EditCommand = {
      type: 'DELETE_TEXT',
      pageIdx,
      blockId,
      offset: pos,
      length: offset - pos,
      deletedText,
    };
    this.commandHistory.push(cmd);
    this.commandHistory.breakMerge();
    this.cursorManager.setCursor(pageIdx, blockId, pos);
    this.eventBus.emit('textChanged', { pageIdx, blockId });
  }

  private _deleteWordForward(pageIdx: number, blockId: string): void {
    if (this.selectionManager.hasSelection()) {
      this.deleteCurrentSelection(pageIdx, blockId);
      return;
    }
    const block = this.getBlock(pageIdx, blockId);
    if (!block) return;
    const text = getTextContent(block);
    const offset = this.cursorManager.getCharOffset();
    let pos = offset;
    while (pos < text.length && !/\s/.test(text[pos])) pos++;
    while (pos < text.length && /\s/.test(text[pos])) pos++;
    if (pos === offset) return;

    const deletedText = text.slice(offset, pos);
    const cmd: EditCommand = {
      type: 'DELETE_TEXT',
      pageIdx,
      blockId,
      offset,
      length: pos - offset,
      deletedText,
    };
    this.commandHistory.push(cmd);
    this.commandHistory.breakMerge();
    this.eventBus.emit('textChanged', { pageIdx, blockId });
  }

  private deleteSelectionIfAny(pageIdx: number, blockId: string): number | null {
    if (!this.selectionManager.hasSelection()) return null;
    return this.deleteCurrentSelection(pageIdx, blockId);
  }

  private deleteCurrentSelection(pageIdx: number, blockId: string): number {
    const sel = this.selectionManager.getSelection()!;
    const block = this.getBlock(pageIdx, blockId);
    const deletedText = block ? getTextContent(block).slice(sel.startOffset, sel.endOffset) : '';

    const cmd: EditCommand = {
      type: 'DELETE_TEXT',
      pageIdx: sel.pageIdx,
      blockId: sel.blockId,
      offset: sel.startOffset,
      length: sel.endOffset - sel.startOffset,
      deletedText,
    };
    this.commandHistory.push(cmd);
    this.commandHistory.breakMerge();
    this.selectionManager.clearSelection();
    this.cursorManager.setCursor(pageIdx, blockId, sel.startOffset);
    this.eventBus.emit('textChanged', { pageIdx, blockId });
    return sel.startOffset;
  }

  private getBlock(pageIdx: number, blockId: string): TextBlock | null {
    const page = this.documentModel.pages[pageIdx];
    if (!page) return null;
    for (const el of page.elements) {
      if (el.type === 'text' && el.id === blockId) return el;
    }
    return null;
  }

  destroy(): void {
    // nothing to clean up
  }
}
