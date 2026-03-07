import type { OverflowState, TextStyle } from './document'

export interface EditorEvents {
  // Model changes
  'textChanged': { pageIdx: number; blockId: string };
  'elementAdded': { pageIdx: number; elementId: string };
  'elementRemoved': { pageIdx: number; elementId: string };
  'elementMoved': { pageIdx: number; elementId: string };
  'pageChanged': { pageIdx: number };

  // Edit state
  'editStart': { blockId: string };
  'editEnd': { blockId: string };
  'cursorMoved': { pageIdx: number; blockId: string; charOffset: number };
  'selectionChanged': { blockId: string; startOffset: number; endOffset: number } | null;

  // Warnings
  'overflow': { blockId: string; state: OverflowState };
  'fontFallback': { blockId: string; char: string; fallbackFontId: string };

  // Errors
  'error': { code: string; message: string };

  // Document lifecycle
  'documentLoaded': { pageCount: number };
  'documentUnloaded': void;

  // Render
  'renderComplete': { pageIdx: number };
  'needsRender': { pageIdx: number };

  // History
  'historyChanged': { canUndo: boolean; canRedo: boolean };

  // Style
  'styleAtCursor': { style: TextStyle | null };
}
