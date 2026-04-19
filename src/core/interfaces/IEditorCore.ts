import type { DocumentModel, ExportValidation, TextBlock, TextStyle } from '../../types/document'
import type { EditorEvents } from '../../types/events'
import type { ActiveTool, Viewport } from '../../types/ui'
import type { IFontManager } from './IFontManager'
import type { ILayoutEngine } from './ILayoutEngine'
import type { IRenderEngine } from './IRenderEngine'
import type { IEditEngine } from './IEditEngine'
import type { IExportModule } from './IExportModule'
import type { ICoordinateTransformer } from './ICoordinateTransformer'

export interface IEditorCore {
  // Initialization
  loadPdf(data: ArrayBuffer, password?: string): Promise<void>;

  // State queries
  getDocument(): DocumentModel | null;
  getCurrentPage(): number;
  getTotalPages(): number;
  isEditing(): boolean;
  getActiveTool(): ActiveTool;
  setActiveTool(tool: ActiveTool): void;

  // Page navigation
  setCurrentPage(page: number): void;
  getPageModel(pageIdx: number): import('../../types/document').PageModel | null;

  // Viewport
  setViewport(viewport: Viewport): void;
  getViewport(): Viewport;
  setZoom(zoom: number): void;
  getZoom(): number;

  // Canvas binding
  bindCanvas(canvas: HTMLCanvasElement): void;
  render(): void;

  // Mouse / touch events
  handleCanvasMouseDown(e: MouseEvent): void;
  handleCanvasMouseMove(e: MouseEvent): void;
  handleCanvasMouseUp(e: MouseEvent): void;
  handleCanvasDoubleClick(e: MouseEvent): void;

  // Text editing
  handleInput(e: InputEvent): void;
  handleKeyDown(e: KeyboardEvent): void;
  handleComposition(e: CompositionEvent): void;

  // Element operations
  addTextBlock(pageIdx: number, x: number, y: number): TextBlock;
  deleteElement(pageIdx: number, elementId: string): void;
  moveElement(pageIdx: number, elementId: string, x: number, y: number): void;

  // Style
  applyTextStyle(style: Partial<TextStyle>): void;

  // Undo/Redo
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;

  // Export
  validateForExport(): ExportValidation;
  exportPdf(
    onProgress?: (p: number) => void,
    options?: import('./IExportModule').ExportOptions,
  ): Promise<Uint8Array>;

  // Event subscription
  on<K extends keyof EditorEvents>(
    event: K,
    callback: (data: EditorEvents[K]) => void
  ): () => void;

  // Sub-modules access
  getFontManager(): IFontManager;
  getLayoutEngine(): ILayoutEngine;
  getRenderEngine(): IRenderEngine;
  getEditEngine(): IEditEngine;
  getExportModule(): IExportModule;
  getCoordinateTransformer(): ICoordinateTransformer;

  // Cleanup
  destroy(): void;
}
