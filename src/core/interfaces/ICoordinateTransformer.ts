export interface ICoordinateTransformer {
  layoutToCanvas(x: number, y: number): { cx: number; cy: number };
  canvasToLayout(cx: number, cy: number): { x: number; y: number };
  layoutToPdf(x: number, y: number): { px: number; py: number };
  pdfToLayout(px: number, py: number): { x: number; y: number };
  screenToLayout(
    screenX: number,
    screenY: number,
    scrollX: number,
    scrollY: number
  ): { x: number; y: number };
  updateViewport(
    scale: number,
    dpr: number,
    pageWidth: number,
    pageHeight: number
  ): void;
  getScale(): number;
  getDpr(): number;
  getPageHeight(): number;
  getPageWidth(): number;
}
