import type {
  OverlayElement,
  Color,
  Point,
  DrawingData,
  ShapeData,
  TextBoxData,
} from '../../types/document';

// ============== Types ==============

interface DragState {
  overlayId: string;
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
}

interface ResizeState {
  overlayId: string;
  handle: ResizeHandle;
  startX: number;
  startY: number;
  originalBounds: { x: number; y: number; width: number; height: number };
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

const HANDLE_SIZE = 8;
const MIN_SIZE = 20;

// ============== Helpers ==============

function colorToCSS(color: Color): string {
  const a = color.a ?? 1;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
}

// ============== OverlayManager ==============

export class OverlayManager {
  private selectedId: string | null = null;
  private dragState: DragState | null = null;
  private resizeState: ResizeState | null = null;

  getSelectedId(): string | null {
    return this.selectedId;
  }

  setSelectedId(id: string | null): void {
    this.selectedId = id;
  }

  // ============== Rendering ==============

  renderOverlays(
    ctx: CanvasRenderingContext2D,
    overlays: OverlayElement[],
    scale: number
  ): void {
    for (const overlay of overlays) {
      this.renderOverlay(ctx, overlay, scale);
    }

    // Draw selection handles for selected overlay
    if (this.selectedId) {
      const selected = overlays.find((o) => o.id === this.selectedId);
      if (selected) {
        this.renderSelectionHandles(ctx, selected, scale);
      }
    }
  }

  private renderOverlay(
    ctx: CanvasRenderingContext2D,
    overlay: OverlayElement,
    scale: number
  ): void {
    const { data } = overlay;

    switch (data.type) {
      case 'drawing':
        this.renderDrawing(ctx, overlay, data, scale);
        break;
      case 'shape':
        this.renderShape(ctx, overlay, data, scale);
        break;
      case 'textbox':
        this.renderTextBox(ctx, overlay, data, scale);
        break;
    }
  }

  private renderDrawing(
    ctx: CanvasRenderingContext2D,
    _overlay: OverlayElement,
    data: DrawingData,
    scale: number
  ): void {
    if (data.points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = colorToCSS(data.color);
    ctx.lineWidth = data.lineWidth * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const first = data.points[0];
    ctx.moveTo(first.x * scale, first.y * scale);

    for (let i = 1; i < data.points.length; i++) {
      const pt = data.points[i];
      ctx.lineTo(pt.x * scale, pt.y * scale);
    }

    ctx.stroke();
    ctx.restore();
  }

  private renderShape(
    ctx: CanvasRenderingContext2D,
    overlay: OverlayElement,
    data: ShapeData,
    scale: number
  ): void {
    const { x, y, width, height } = overlay.bounds;
    const sx = x * scale;
    const sy = y * scale;
    const sw = width * scale;
    const sh = height * scale;

    ctx.save();
    ctx.strokeStyle = colorToCSS(data.strokeColor);
    ctx.lineWidth = data.strokeWidth * scale;

    switch (data.shapeType) {
      case 'rectangle':
        if (data.fillColor) {
          ctx.fillStyle = colorToCSS(data.fillColor);
          ctx.fillRect(sx, sy, sw, sh);
        }
        ctx.strokeRect(sx, sy, sw, sh);
        break;

      case 'circle': {
        const cx = sx + sw / 2;
        const cy = sy + sh / 2;
        const rx = sw / 2;
        const ry = sh / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (data.fillColor) {
          ctx.fillStyle = colorToCSS(data.fillColor);
          ctx.fill();
        }
        ctx.stroke();
        break;
      }

      case 'line':
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + sw, sy + sh);
        ctx.stroke();
        break;

      case 'arrow': {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + sw, sy + sh);
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(sh, sw);
        const headLen = 12 * scale;
        ctx.beginPath();
        ctx.moveTo(sx + sw, sy + sh);
        ctx.lineTo(
          sx + sw - headLen * Math.cos(angle - Math.PI / 6),
          sy + sh - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(sx + sw, sy + sh);
        ctx.lineTo(
          sx + sw - headLen * Math.cos(angle + Math.PI / 6),
          sy + sh - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }

  private renderTextBox(
    ctx: CanvasRenderingContext2D,
    overlay: OverlayElement,
    data: TextBoxData,
    scale: number
  ): void {
    const { x, y, width, height } = overlay.bounds;
    const sx = x * scale;
    const sy = y * scale;
    const sw = width * scale;
    const sh = height * scale;

    // Draw text box background
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, sw, sh);

    // Render text content
    let textY = sy + 16 * scale;
    for (const paragraph of data.paragraphs) {
      for (const run of paragraph.runs) {
        const fontSize = run.style.fontSize * scale;
        const fontStyle = run.style.fontStyle === 'italic' ? 'italic' : '';
        ctx.font = `${fontStyle} ${run.style.fontWeight} ${fontSize}px ${run.style.fontId}`.trim();
        ctx.fillStyle = colorToCSS(run.style.color);
        ctx.fillText(run.text, sx + 4 * scale, textY);
        textY += fontSize * 1.2;
      }
    }

    ctx.restore();
  }

  // ============== Selection Handles ==============

  private renderSelectionHandles(
    ctx: CanvasRenderingContext2D,
    overlay: OverlayElement,
    scale: number
  ): void {
    const { x, y, width, height } = overlay.bounds;
    const sx = x * scale;
    const sy = y * scale;
    const sw = width * scale;
    const sh = height * scale;

    // Selection border
    ctx.save();
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.setLineDash([]);

    // Corner and edge handles
    const handles = this.getHandlePositions(sx, sy, sw, sh);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 1.5;

    for (const [, pos] of handles) {
      ctx.beginPath();
      ctx.rect(pos.x - HANDLE_SIZE / 2, pos.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  private getHandlePositions(
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ): [ResizeHandle, Point][] {
    return [
      ['nw', { x: sx, y: sy }],
      ['ne', { x: sx + sw, y: sy }],
      ['sw', { x: sx, y: sy + sh }],
      ['se', { x: sx + sw, y: sy + sh }],
      ['n', { x: sx + sw / 2, y: sy }],
      ['s', { x: sx + sw / 2, y: sy + sh }],
      ['w', { x: sx, y: sy + sh / 2 }],
      ['e', { x: sx + sw, y: sy + sh / 2 }],
    ];
  }

  // ============== Hit Testing ==============

  hitTestOverlay(
    x: number,
    y: number,
    overlays: OverlayElement[]
  ): OverlayElement | null {
    // Check in reverse order (top-most first)
    for (let i = overlays.length - 1; i >= 0; i--) {
      const o = overlays[i];
      if (
        x >= o.bounds.x &&
        x <= o.bounds.x + o.bounds.width &&
        y >= o.bounds.y &&
        y <= o.bounds.y + o.bounds.height
      ) {
        return o;
      }
    }
    return null;
  }

  hitTestHandle(
    x: number,
    y: number,
    overlay: OverlayElement,
    scale: number
  ): ResizeHandle | null {
    const { x: bx, y: by, width, height } = overlay.bounds;
    const handles = this.getHandlePositions(
      bx * scale,
      by * scale,
      width * scale,
      height * scale
    );

    const hitRadius = HANDLE_SIZE;
    for (const [handle, pos] of handles) {
      const dx = x * scale - pos.x;
      const dy = y * scale - pos.y;
      if (Math.abs(dx) <= hitRadius && Math.abs(dy) <= hitRadius) {
        return handle;
      }
    }

    return null;
  }

  // ============== Drag ==============

  handleDragStart(overlayId: string, x: number, y: number, overlay: OverlayElement): void {
    this.dragState = {
      overlayId,
      startX: x,
      startY: y,
      originalX: overlay.bounds.x,
      originalY: overlay.bounds.y,
    };
    this.selectedId = overlayId;
  }

  handleDrag(x: number, y: number, overlay: OverlayElement): void {
    if (!this.dragState || this.dragState.overlayId !== overlay.id) return;

    const dx = x - this.dragState.startX;
    const dy = y - this.dragState.startY;
    overlay.bounds.x = this.dragState.originalX + dx;
    overlay.bounds.y = this.dragState.originalY + dy;
  }

  handleDragEnd(): void {
    this.dragState = null;
  }

  isDragging(): boolean {
    return this.dragState !== null;
  }

  // ============== Resize ==============

  handleResizeStart(
    overlayId: string,
    handle: ResizeHandle,
    x: number,
    y: number,
    overlay: OverlayElement
  ): void {
    this.resizeState = {
      overlayId,
      handle,
      startX: x,
      startY: y,
      originalBounds: { ...overlay.bounds },
    };
    this.selectedId = overlayId;
  }

  handleResize(x: number, y: number, overlay: OverlayElement): void {
    if (!this.resizeState || this.resizeState.overlayId !== overlay.id) return;

    const dx = x - this.resizeState.startX;
    const dy = y - this.resizeState.startY;
    const ob = this.resizeState.originalBounds;
    const handle = this.resizeState.handle;

    let newX = ob.x;
    let newY = ob.y;
    let newW = ob.width;
    let newH = ob.height;

    // Horizontal adjustments
    if (handle.includes('w')) {
      newX = ob.x + dx;
      newW = ob.width - dx;
    } else if (handle.includes('e')) {
      newW = ob.width + dx;
    }

    // Vertical adjustments
    if (handle.includes('n')) {
      newY = ob.y + dy;
      newH = ob.height - dy;
    } else if (handle.includes('s')) {
      newH = ob.height + dy;
    }

    // Enforce minimum size
    if (newW < MIN_SIZE) {
      if (handle.includes('w')) {
        newX = ob.x + ob.width - MIN_SIZE;
      }
      newW = MIN_SIZE;
    }
    if (newH < MIN_SIZE) {
      if (handle.includes('n')) {
        newY = ob.y + ob.height - MIN_SIZE;
      }
      newH = MIN_SIZE;
    }

    overlay.bounds.x = newX;
    overlay.bounds.y = newY;
    overlay.bounds.width = newW;
    overlay.bounds.height = newH;
  }

  handleResizeEnd(): void {
    this.resizeState = null;
  }

  isResizing(): boolean {
    return this.resizeState !== null;
  }

  // ============== Cursor Style ==============

  getCursorStyle(
    x: number,
    y: number,
    overlays: OverlayElement[],
    scale: number
  ): string {
    if (this.selectedId) {
      const selected = overlays.find((o) => o.id === this.selectedId);
      if (selected) {
        const handle = this.hitTestHandle(x, y, selected, scale);
        if (handle) return this.handleToCursor(handle);
      }
    }

    const hit = this.hitTestOverlay(x, y, overlays);
    if (hit) return 'move';

    return 'default';
  }

  private handleToCursor(handle: ResizeHandle): string {
    const map: Record<ResizeHandle, string> = {
      nw: 'nwse-resize',
      se: 'nwse-resize',
      ne: 'nesw-resize',
      sw: 'nesw-resize',
      n: 'ns-resize',
      s: 'ns-resize',
      e: 'ew-resize',
      w: 'ew-resize',
    };
    return map[handle];
  }

  // ============== Cleanup ==============

  destroy(): void {
    this.selectedId = null;
    this.dragState = null;
    this.resizeState = null;
  }
}
