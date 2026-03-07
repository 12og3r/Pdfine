import type { PageModel, Rect } from '../../types/document'
import type { Viewport, HitTestResult, CursorPosition, SelectionRange } from '../../types/ui'

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
  destroy(): void;
}
