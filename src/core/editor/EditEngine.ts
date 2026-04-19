import type { IEditEngine } from '../interfaces/IEditEngine'
import type { DocumentModel, TextStyle, PageModel, EditCommand, TextBlock } from '../../types/document'
import type { CursorPosition, SelectionRange } from '../../types/ui'
import type { EventBus } from '../infra/EventBus'
import { CursorManager } from './CursorManager'
import { SelectionManager } from './SelectionManager'
import { InputHandler } from './InputHandler'
import { ImeHandler } from './ImeHandler'
import { CommandHistory } from './CommandHistory'
import { getTextContent, getRunAtOffset } from './EditCommands'

export class EditEngine implements IEditEngine {
  private editing = false;
  private editingBlockId: string | null = null;
  private cursorManager: CursorManager;
  private selectionManager: SelectionManager;
  private commandHistory: CommandHistory;
  private inputHandler: InputHandler;
  private imeHandler: ImeHandler;

  private documentModel: DocumentModel;
  private eventBus: EventBus;

  constructor(
    documentModel: DocumentModel,
    eventBus: EventBus,
    getPageModel: (pageIdx: number) => PageModel | null,
  ) {
    this.documentModel = documentModel;
    this.eventBus = eventBus;
    this.cursorManager = new CursorManager(eventBus, getPageModel);
    this.selectionManager = new SelectionManager(eventBus);
    this.commandHistory = new CommandHistory(documentModel.pages, eventBus);
    this.imeHandler = new ImeHandler(documentModel, eventBus, this.cursorManager, this.selectionManager, this.commandHistory);
    this.inputHandler = new InputHandler(documentModel, eventBus, this.cursorManager, this.selectionManager, this.commandHistory, this.imeHandler);
  }

  enterEditMode(blockId: string): void {
    if (this.editing && this.editingBlockId === blockId) return;
    if (this.editing) this.exitEditMode();

    this.editing = true;
    this.editingBlockId = blockId;

    // Find the page containing this block
    const pageIdx = this.findPageForBlock(blockId);
    if (pageIdx >= 0) {
      this.cursorManager.setCursor(pageIdx, blockId, 0);
    }

    this.eventBus.emit('editStart', { blockId });
    // Emit the initial style so the inspector panel reflects the run the
    // cursor just landed on. Without this, `styleAtCursor` only fires on the
    // first cursor movement, leaving the panel in its empty state.
    this.emitStyleAtCursor();
  }

  exitEditMode(): void {
    if (!this.editing) return;
    const blockId = this.editingBlockId!;

    // Commit any pending composition
    if (this.imeHandler.isComposing()) {
      // Force end composition - in practice the browser handles this
    }

    this.editing = false;
    this.editingBlockId = null;
    this.selectionManager.clearSelection();
    this.eventBus.emit('editEnd', { blockId });
  }

  isEditing(): boolean {
    return this.editing;
  }

  getEditingBlockId(): string | null {
    return this.editingBlockId;
  }

  handleInput(event: InputEvent): void {
    if (!this.editing) return;
    this.inputHandler.handleBeforeInput(event);
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (!this.editing) return;
    if (this.imeHandler.isComposing()) return;

    const isShift = event.shiftKey;
    const isMod = event.metaKey || event.ctrlKey;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (isShift) {
          this.extendSelectionByMove(() => {
            if (isMod) this.cursorManager.moveWordLeft();
            else this.cursorManager.moveCursor('left');
          });
        } else {
          this.selectionManager.clearSelection();
          if (isMod) this.cursorManager.moveWordLeft();
          else this.cursorManager.moveCursor('left');
        }
        this.commandHistory.breakMerge();
        this.emitStyleAtCursor();
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (isShift) {
          this.extendSelectionByMove(() => {
            if (isMod) this.cursorManager.moveWordRight();
            else this.cursorManager.moveCursor('right');
          });
        } else {
          this.selectionManager.clearSelection();
          if (isMod) this.cursorManager.moveWordRight();
          else this.cursorManager.moveCursor('right');
        }
        this.commandHistory.breakMerge();
        this.emitStyleAtCursor();
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (isShift) {
          this.extendSelectionByMove(() => this.cursorManager.moveCursor('up'));
        } else {
          this.selectionManager.clearSelection();
          this.cursorManager.moveCursor('up');
        }
        this.commandHistory.breakMerge();
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (isShift) {
          this.extendSelectionByMove(() => this.cursorManager.moveCursor('down'));
        } else {
          this.selectionManager.clearSelection();
          this.cursorManager.moveCursor('down');
        }
        this.commandHistory.breakMerge();
        break;

      case 'Home':
        if (isShift) {
          this.extendSelectionByMove(() => this.cursorManager.moveToLineStart());
        } else {
          this.selectionManager.clearSelection();
          this.cursorManager.moveToLineStart();
        }
        break;

      case 'End':
        if (isShift) {
          this.extendSelectionByMove(() => this.cursorManager.moveToLineEnd());
        } else {
          this.selectionManager.clearSelection();
          this.cursorManager.moveToLineEnd();
        }
        break;

      case 'a':
        if (isMod) {
          event.preventDefault();
          this.selectAll();
        }
        break;

      case 'z':
        if (isMod) {
          event.preventDefault();
          if (isShift) this.redo();
          else this.undo();
        }
        break;

      case 'y':
        if (isMod) {
          event.preventDefault();
          this.redo();
        }
        break;

      case 'b':
        if (isMod) {
          event.preventDefault();
          this.toggleBold();
        }
        break;

      case 'i':
        if (isMod) {
          event.preventDefault();
          this.toggleItalic();
        }
        break;

      case 'Backspace':
        event.preventDefault();
        if (this.selectionManager.hasSelection()) {
          this.deleteSelection();
        } else if (isMod) {
          this.inputHandler.handleDeleteWordBackward();
        } else {
          this.inputHandler.handleDeleteBackward();
        }
        break;

      case 'Delete':
        event.preventDefault();
        if (this.selectionManager.hasSelection()) {
          this.deleteSelection();
        } else if (isMod) {
          this.inputHandler.handleDeleteWordForward();
        } else {
          this.inputHandler.handleDeleteForward();
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (event.shiftKey) {
          this.inputHandler.handleInsertNewline();
        } else {
          this.exitEditMode();
        }
        break;

      case 'Escape':
        this.exitEditMode();
        break;
    }
  }

  handleComposition(event: CompositionEvent): void {
    if (!this.editing) return;
    switch (event.type) {
      case 'compositionstart':
        this.imeHandler.handleCompositionStart();
        break;
      case 'compositionupdate':
        this.imeHandler.handleCompositionUpdate(event);
        break;
      case 'compositionend':
        this.imeHandler.handleCompositionEnd(event);
        break;
    }
  }

  getCursorPosition(): CursorPosition | null {
    if (!this.editing) return null;
    return this.cursorManager.getCursorPosition();
  }

  getSelection(): SelectionRange | null {
    return this.selectionManager.getSelection();
  }

  applyStyle(style: Partial<TextStyle>): void {
    if (!this.editing) return;

    const block = this.getEditingBlock();
    if (!block) return;

    // When the user has a selection, the change scopes to that range.
    // Otherwise — cursor-only — apply the change to the entire editing block
    // so clicking Bold / Italic / changing font / size in the inspector has
    // a visible effect immediately (matching Word / Figma conventions where
    // style toggles with no selection change the surrounding run's style).
    const sel = this.selectionManager.getSelection();
    const cursorPageIdx = this.cursorManager.getPageIdx();
    const cursorOffset = this.cursorManager.getCharOffset();
    const pageIdx = sel?.pageIdx ?? (cursorPageIdx >= 0 ? cursorPageIdx : this.findPageForBlock(block.id));
    if (pageIdx < 0) return;

    const blockTextLength = getTextContent(block).length;
    const rangeStart = sel ? sel.startOffset : 0;
    const rangeLength = sel ? sel.endOffset - sel.startOffset : blockTextLength;
    if (rangeLength <= 0) return;

    // Capture original styles for undo. With no selection we snapshot the
    // style at the cursor (or offset 0) — any run inside the block is a fine
    // baseline for undo because CHANGE_STYLE's inverse restores each run's
    // prior style on a per-run basis.
    const snapshotOffset = sel ? sel.startOffset : cursorOffset;
    const originalStyle: Partial<TextStyle> = {};
    const loc = getRunAtOffset(block, Math.min(snapshotOffset, Math.max(0, blockTextLength - 1)));
    const run = block.paragraphs[loc.paragraphIdx].runs[loc.runIdx];
    for (const key of Object.keys(style) as Array<keyof TextStyle>) {
      (originalStyle as Record<string, unknown>)[key] = run.style[key];
    }

    const cmd: EditCommand = {
      type: 'CHANGE_STYLE',
      pageIdx,
      blockId: block.id,
      offset: rangeStart,
      length: rangeLength,
      style,
      originalStyle,
    };
    this.commandHistory.push(cmd);
    this.commandHistory.breakMerge();
    this.eventBus.emit('textChanged', { pageIdx, blockId: block.id });
    this.emitStyleAtCursor();
  }

  undo(): void {
    const inverse = this.commandHistory.undo();
    if (inverse) {
      // Restore cursor based on command
      this.emitTextChangedForCommand(inverse);
    }
  }

  redo(): void {
    const command = this.commandHistory.redo();
    if (command) {
      this.emitTextChangedForCommand(command);
    }
  }

  canUndo(): boolean {
    return this.commandHistory.canUndo();
  }

  canRedo(): boolean {
    return this.commandHistory.canRedo();
  }

  insertText(text: string): void {
    if (!this.editing) return;
    const blockId = this.editingBlockId!;
    const pageIdx = this.cursorManager.getPageIdx();

    // Delete selection first if any
    if (this.selectionManager.hasSelection()) {
      this.deleteSelection();
    }

    const offset = this.cursorManager.getCharOffset();
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
  }

  deleteSelection(): void {
    if (!this.selectionManager.hasSelection()) return;
    const sel = this.selectionManager.getSelection()!;
    const block = this.getEditingBlock();
    if (!block) return;

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
    this.selectionManager.clearSelection();
    this.cursorManager.setCursor(sel.pageIdx, sel.blockId, sel.startOffset);
    this.eventBus.emit('textChanged', { pageIdx: sel.pageIdx, blockId: sel.blockId });
  }

  selectAll(): void {
    if (!this.editing || !this.editingBlockId) return;
    const block = this.getEditingBlock();
    if (!block) return;
    const textLen = getTextContent(block).length;
    const pageIdx = this.cursorManager.getPageIdx();
    this.selectionManager.setSelection(pageIdx, this.editingBlockId, 0, textLen);
    this.cursorManager.setCursor(pageIdx, this.editingBlockId, textLen);
  }

  getCursorManager(): CursorManager {
    return this.cursorManager;
  }

  getSelectionManager(): SelectionManager {
    return this.selectionManager;
  }

  getCommandHistory(): CommandHistory {
    return this.commandHistory;
  }

  getImeHandler(): ImeHandler {
    return this.imeHandler;
  }

  destroy(): void {
    this.exitEditMode();
    this.cursorManager.destroy();
    this.selectionManager.destroy();
    this.imeHandler.destroy();
    this.inputHandler.destroy();
  }

  private findPageForBlock(blockId: string): number {
    for (let i = 0; i < this.documentModel.pages.length; i++) {
      for (const el of this.documentModel.pages[i].elements) {
        if (el.id === blockId) return i;
      }
    }
    return -1;
  }

  private getEditingBlock(): TextBlock | null {
    if (!this.editingBlockId) return null;
    const pageIdx = this.cursorManager.getPageIdx();
    const page = this.documentModel.pages[pageIdx];
    if (!page) return null;
    for (const el of page.elements) {
      if (el.type === 'text' && el.id === this.editingBlockId) return el;
    }
    return null;
  }

  private extendSelectionByMove(moveFn: () => void): void {
    const anchorOffset = this.selectionManager.hasSelection()
      ? this.getSelectionAnchor()
      : this.cursorManager.getCharOffset();

    moveFn();

    const newOffset = this.cursorManager.getCharOffset();
    const blockId = this.cursorManager.getBlockId()!;
    const pageIdx = this.cursorManager.getPageIdx();
    this.selectionManager.extendSelection(pageIdx, blockId, anchorOffset, newOffset);
  }

  private getSelectionAnchor(): number {
    const sel = this.selectionManager.getSelection();
    if (!sel) return this.cursorManager.getCharOffset();
    const cursorAt = this.cursorManager.getCharOffset();
    // Anchor is the end that isn't the cursor
    return cursorAt === sel.endOffset ? sel.startOffset : sel.endOffset;
  }

  private toggleBold(): void {
    const block = this.getEditingBlock();
    if (!block) return;
    const loc = getRunAtOffset(block, this.cursorManager.getCharOffset());
    const currentWeight = block.paragraphs[loc.paragraphIdx].runs[loc.runIdx]?.style.fontWeight ?? 400;
    const newWeight = currentWeight >= 700 ? 400 : 700;
    this.applyStyle({ fontWeight: newWeight });
  }

  private toggleItalic(): void {
    const block = this.getEditingBlock();
    if (!block) return;
    const loc = getRunAtOffset(block, this.cursorManager.getCharOffset());
    const currentStyle = block.paragraphs[loc.paragraphIdx].runs[loc.runIdx]?.style.fontStyle ?? 'normal';
    const newStyle = currentStyle === 'italic' ? 'normal' : 'italic';
    this.applyStyle({ fontStyle: newStyle });
  }

  /** Public shim so callers that drive selection (mouse drag) can ask the
   *  inspector to refresh after changing the selection range. */
  refreshStyleAtCursor(): void {
    this.emitStyleAtCursor();
  }

  private emitStyleAtCursor(): void {
    const block = this.getEditingBlock();
    if (!block) {
      this.eventBus.emit('styleAtCursor', { style: null });
      return;
    }
    // When there's a selection, the inspector should reflect the style of the
    // selected text (not of the run the cursor happens to sit in). After a
    // drag-select the cursor ends at the selection's trailing boundary, and
    // `getRunAtOffset` prefers the start of the *next* run for such boundary
    // offsets — so reading at the cursor would return the first unselected
    // run's style and the panel would show the *old* font / weight / size /
    // colour immediately after applying a change. Read at the selection's
    // start offset so we always land inside the modified range.
    const sel = this.selectionManager.getSelection();
    const readOffset = sel ? sel.startOffset : this.cursorManager.getCharOffset();
    const loc = getRunAtOffset(block, readOffset);
    const run = block.paragraphs[loc.paragraphIdx]?.runs[loc.runIdx];
    this.eventBus.emit('styleAtCursor', { style: run?.style ?? null });
  }

  private emitTextChangedForCommand(command: EditCommand): void {
    if (command.type === 'BATCH') {
      for (const sub of command.commands) {
        this.emitTextChangedForCommand(sub);
      }
      return;
    }
    if ('pageIdx' in command && 'blockId' in command) {
      const cmd = command as { pageIdx: number; blockId: string };
      this.eventBus.emit('textChanged', { pageIdx: cmd.pageIdx, blockId: cmd.blockId });
    }
  }
}
