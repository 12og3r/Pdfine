import type { PageModel, Rect } from '../../types/document'
import type { Viewport, HitTestResult, CursorPosition, SelectionRange } from '../../types/ui'
import type { PdfPageRenderer } from '../render/PdfPageRenderer'

export interface IRenderEngine {
  bindCanvas(canvas: HTMLCanvasElement): void;
  renderPage(page: PageModel, viewport: Viewport): void;
  renderSelection(selection: SelectionRange | null): void;
  renderCursor(cursor: CursorPosition | null): void;
  hitTest(x: number, y: number, pageIdx: number): HitTestResult | null;
  setDirtyRect(rect: Rect): void;
  clearDirtyRect(): void;
  getCanvas(): HTMLCanvasElement | null;
  getPageOffset(): { x: number; y: number };
  /** Access the async pdfjs page rasteriser — used by the sidebar for thumbnails. */
  getPdfPageRenderer(): PdfPageRenderer;
  /** Update the set of block IDs currently overflowing, so the editing frame
   *  can switch to the warm "OVERFLOW" treatment. */
  setOverflowBlockIds(ids: Iterable<string>): void;
  /** Restart the cursor blink cycle from the visible phase. Called on cursor
   *  moves / text input so the caret doesn't flicker mid-stride. */
  resetCursorBlink(): void;
  destroy(): void;
}
