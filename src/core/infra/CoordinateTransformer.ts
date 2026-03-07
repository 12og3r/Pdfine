import type { ICoordinateTransformer } from '../interfaces/ICoordinateTransformer'

export class CoordinateTransformer implements ICoordinateTransformer {
  private pageWidth = 612;
  private pageHeight = 792;
  private scale = 1;
  private dpr = 1;

  constructor(
    pageWidth?: number,
    pageHeight?: number,
    scale?: number,
    dpr?: number
  ) {
    if (pageWidth !== undefined) this.pageWidth = pageWidth;
    if (pageHeight !== undefined) this.pageHeight = pageHeight;
    if (scale !== undefined) this.scale = scale;
    if (dpr !== undefined) this.dpr = dpr;
  }

  updateViewport(scale: number, dpr: number, pageWidth: number, pageHeight: number): void {
    this.scale = scale;
    this.dpr = dpr;
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
  }

  /** Layout coordinates (pt, top-left origin, Y down) → Canvas pixel coordinates */
  layoutToCanvas(x: number, y: number): { cx: number; cy: number } {
    const cx = Math.round(x * this.scale * this.dpr) / this.dpr;
    const cy = Math.round(y * this.scale * this.dpr) / this.dpr;
    return { cx, cy };
  }

  /** Canvas pixel coordinates → Layout coordinates (pt) */
  canvasToLayout(cx: number, cy: number): { x: number; y: number } {
    return {
      x: cx / this.scale,
      y: cy / this.scale,
    };
  }

  /** Layout coordinates (top-left origin, Y down) → PDF coordinates (bottom-left origin, Y up) */
  layoutToPdf(x: number, y: number): { px: number; py: number } {
    return {
      px: x,
      py: this.pageHeight - y,
    };
  }

  /** PDF coordinates (bottom-left origin, Y up) → Layout coordinates (top-left origin, Y down) */
  pdfToLayout(px: number, py: number): { x: number; y: number } {
    return {
      x: px,
      y: this.pageHeight - py,
    };
  }

  /** Screen/mouse coordinates → Layout coordinates (accounting for scroll and scale) */
  screenToLayout(
    screenX: number,
    screenY: number,
    scrollX: number,
    scrollY: number
  ): { x: number; y: number } {
    return {
      x: (screenX + scrollX) / this.scale,
      y: (screenY + scrollY) / this.scale,
    };
  }

  getScale(): number {
    return this.scale;
  }

  getDpr(): number {
    return this.dpr;
  }

  getPageHeight(): number {
    return this.pageHeight;
  }

  getPageWidth(): number {
    return this.pageWidth;
  }
}
