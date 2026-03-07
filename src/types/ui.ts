import type { TextStyle } from './document'

export type ActiveTool = 'select' | 'editText' | 'addText' | 'image' | 'draw' | 'shape';

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export interface CursorPosition {
  pageIdx: number;
  blockId: string;
  paragraphIdx: number;
  runIdx: number;
  charOffset: number;
  x: number;
  y: number;
  height: number;
}

export interface SelectionRange {
  pageIdx: number;
  blockId: string;
  startOffset: number;
  endOffset: number;
}

export interface HitTestResult {
  pageIdx: number;
  blockId: string;
  paragraphIdx: number;
  runIdx: number;
  charOffset: number;
  elementType: 'text' | 'image' | 'path' | 'overlay';
}

export interface UIState {
  activeTool: ActiveTool;
  zoom: number;
  currentPage: number;
  totalPages: number;
  propertyPanelOpen: boolean;
  isExporting: boolean;
  exportProgress: number;
  documentLoaded: boolean;
  showPasswordModal: boolean;
  pendingPdfData: ArrayBuffer | null;
  fileName: string;

  selectedBlockId: string | null;
  currentTextStyle: TextStyle | null;
  overflowWarnings: string[];
  canUndo: boolean;
  canRedo: boolean;
  isEditing: boolean;

  setActiveTool: (tool: ActiveTool) => void;
  setZoom: (zoom: number) => void;
  setCurrentPage: (page: number) => void;
  setDocumentLoaded: (loaded: boolean, totalPages?: number) => void;
  setShowPasswordModal: (show: boolean) => void;
  setPendingPdfData: (data: ArrayBuffer | null) => void;
  setFileName: (name: string) => void;
  setSelectedBlockId: (id: string | null) => void;
  setCurrentTextStyle: (style: TextStyle | null) => void;
  setOverflowWarnings: (warnings: string[]) => void;
  setCanUndo: (canUndo: boolean) => void;
  setCanRedo: (canRedo: boolean) => void;
  setIsExporting: (exporting: boolean) => void;
  setExportProgress: (progress: number) => void;
  setIsEditing: (editing: boolean) => void;
}
