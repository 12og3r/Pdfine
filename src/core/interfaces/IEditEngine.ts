import type { TextStyle } from '../../types/document'
import type { CursorPosition, SelectionRange } from '../../types/ui'

export interface IEditEngine {
  enterEditMode(blockId: string): void;
  exitEditMode(): void;
  isEditing(): boolean;
  getEditingBlockId(): string | null;
  handleInput(event: InputEvent): void;
  handleKeyDown(event: KeyboardEvent): void;
  handleComposition(event: CompositionEvent): void;
  getCursorPosition(): CursorPosition | null;
  getSelection(): SelectionRange | null;
  applyStyle(style: Partial<TextStyle>): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  insertText(text: string): void;
  deleteSelection(): void;
  selectAll(): void;
  destroy(): void;
}
