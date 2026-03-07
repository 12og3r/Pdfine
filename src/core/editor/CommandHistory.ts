import type { EditCommand, PageModel } from '../../types/document'
import type { EventBus } from '../infra/EventBus'
import { CONTINUOUS_INPUT_MERGE_INTERVAL_MS } from '../../config/constants'
import { applyCommand, inverseCommand } from './EditCommands'

export class CommandHistory {
  private undoStack: EditCommand[] = [];
  private redoStack: EditCommand[] = [];
  private lastPushTime = 0;
  private mergeable = false;

  private pages: PageModel[];
  private eventBus: EventBus;

  constructor(pages: PageModel[], eventBus: EventBus) {
    this.pages = pages;
    this.eventBus = eventBus;
  }

  push(command: EditCommand): void {
    const now = Date.now();

    // Try to merge continuous INSERT_TEXT commands
    if (
      this.mergeable &&
      command.type === 'INSERT_TEXT' &&
      this.undoStack.length > 0 &&
      now - this.lastPushTime < CONTINUOUS_INPUT_MERGE_INTERVAL_MS
    ) {
      const last = this.undoStack[this.undoStack.length - 1];
      if (
        last.type === 'INSERT_TEXT' &&
        last.blockId === command.blockId &&
        last.pageIdx === command.pageIdx &&
        last.offset + last.text.length === command.offset &&
        !command.text.includes(' ') &&
        !command.text.includes('\n')
      ) {
        last.text += command.text;
        this.lastPushTime = now;
        // Apply the command to the model
        applyCommand(command, this.pages);
        return;
      }
    }

    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.lastPushTime = now;
    this.mergeable = command.type === 'INSERT_TEXT' && !command.text.includes(' ') && !command.text.includes('\n');

    // Apply the command to the model
    applyCommand(command, this.pages);
    this.emitHistoryChanged();
  }

  breakMerge(): void {
    this.mergeable = false;
  }

  undo(): EditCommand | null {
    if (this.undoStack.length === 0) return null;
    const command = this.undoStack.pop()!;
    const inverse = inverseCommand(command);
    applyCommand(inverse, this.pages);
    this.redoStack.push(command);
    this.mergeable = false;
    this.emitHistoryChanged();
    return inverse;
  }

  redo(): EditCommand | null {
    if (this.redoStack.length === 0) return null;
    const command = this.redoStack.pop()!;
    applyCommand(command, this.pages);
    this.undoStack.push(command);
    this.mergeable = false;
    this.emitHistoryChanged();
    return command;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.mergeable = false;
    this.emitHistoryChanged();
  }

  private emitHistoryChanged(): void {
    this.eventBus.emit('historyChanged', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }
}
