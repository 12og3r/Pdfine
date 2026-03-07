import type { SelectionRange } from '../../types/ui'
import type { TextBlock } from '../../types/document'
import type { EventBus } from '../infra/EventBus'
import { getTextContent } from './EditCommands'

export class SelectionManager {
  private selection: SelectionRange | null = null;

  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  setSelection(pageIdx: number, blockId: string, startOffset: number, endOffset: number): void {
    if (startOffset === endOffset) {
      this.clearSelection();
      return;
    }
    this.selection = {
      pageIdx,
      blockId,
      startOffset: Math.min(startOffset, endOffset),
      endOffset: Math.max(startOffset, endOffset),
    };
    this.eventBus.emit('selectionChanged', { ...this.selection });
  }

  clearSelection(): void {
    this.selection = null;
    this.eventBus.emit('selectionChanged', null);
  }

  extendSelection(pageIdx: number, blockId: string, anchorOffset: number, charOffset: number): void {
    this.setSelection(pageIdx, blockId, anchorOffset, charOffset);
  }

  getSelectedText(block: TextBlock): string {
    if (!this.selection || this.selection.blockId !== block.id) return '';
    const fullText = getTextContent(block);
    return fullText.slice(this.selection.startOffset, this.selection.endOffset);
  }

  getSelection(): SelectionRange | null {
    return this.selection;
  }

  hasSelection(): boolean {
    return this.selection !== null;
  }

  destroy(): void {
    this.selection = null;
  }
}
