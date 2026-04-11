import type { IRenderEngine } from '../interfaces/IRenderEngine';
import type { IFontManager } from '../interfaces/IFontManager';
import type { PageModel, Rect, TextBlock, OverlayElement } from '../../types/document';
import type { Viewport, HitTestResult, CursorPosition, SelectionRange } from '../../types/ui';
import { TextRenderer } from './TextRenderer';
import { ImageRenderer } from './ImageRenderer';
import { SelectionRenderer } from './SelectionRenderer';
import { HitTester } from './HitTester';
import { OverlayManager } from './OverlayManager';
import { PdfPageRenderer } from './PdfPageRenderer';
import { TEXT_HOVER_BG_COLOR, TEXT_EDITING_BG_COLOR, PAGE_MARGIN } from '../../config/constants';

export class RenderEngine implements IRenderEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private dirtyRect: Rect | null = null;

  private currentPage: PageModel | null = null;
  private currentViewport: Viewport | null = null;
  private currentSelection: SelectionRange | null = null;
  private currentCursor: CursorPosition | null = null;
  private editingBlockId: string | null = null;
  private editingBlockDirty = false;
  private modifiedBlockIds = new Set<string>();
  private hoveredBlockId: string | null = null;

  private textRenderer = new TextRenderer();
  private imageRenderer = new ImageRenderer();
  private selectionRenderer = new SelectionRenderer();
  private hitTester = new HitTester();
  private overlayManager = new OverlayManager();
  private pdfPageRenderer = new PdfPageRenderer();

  // Callback to trigger re-render when async PDF page rendering completes
  private onNeedRerender: (() => void) | null = null;

  setFontManager(fontManager: IFontManager): void {
    this.textRenderer.setFontManager(fontManager);
  }

  getPdfPageRenderer(): PdfPageRenderer {
    return this.pdfPageRenderer;
  }

  getOverlayManager(): OverlayManager {
    return this.overlayManager;
  }

  getSelectionRenderer(): SelectionRenderer {
    return this.selectionRenderer;
  }

  setRerenderCallback(cb: () => void): void {
    this.onNeedRerender = cb;
  }

  setEditingBlockId(blockId: string | null): void {
    // When exiting edit mode, remember the block as modified so it keeps rendering
    if (this.editingBlockId && blockId === null) {
      if (this.editingBlockDirty) {
        this.modifiedBlockIds.add(this.editingBlockId);
      }
    }
    this.editingBlockId = blockId;
    this.editingBlockDirty = false;
  }

  /** Mark the editing block as having content changes, triggering white overlay + re-render */
  markEditingBlockDirty(): void {
    this.editingBlockDirty = true;
  }

  /** Set the currently hovered text block for highlight rendering */
  setHoveredBlockId(blockId: string | null): void {
    if (this.hoveredBlockId !== blockId) {
      this.hoveredBlockId = blockId;
    }
  }

  getHoveredBlockId(): string | null {
    return this.hoveredBlockId;
  }

  bindCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
  }

  renderPage(page: PageModel, viewport: Viewport): void {
    if (!this.ctx || !this.canvas) return;

    this.currentPage = page;
    this.currentViewport = viewport;
    const ctx = this.ctx;
    const scale = viewport.scale;

    // Rebuild hit map for the page
    this.hitTester.buildHitMap(page);

    // 1. Clear canvas
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const canvasW = this.canvas.width / this.dpr;
    const canvasH = this.canvas.height / this.dpr;
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Fill background
    ctx.fillStyle = '#e5e7eb'; // gray-200
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Calculate page positioning (centered when fits, margin-offset when scrollable)
    const pageW = page.width * scale;
    const pageH = page.height * scale;
    const contentW = pageW + PAGE_MARGIN * 2;
    const contentH = pageH + PAGE_MARGIN * 2;
    // When page+margins fit in canvas, center; otherwise use PAGE_MARGIN
    const baseOffsetX = contentW <= canvasW ? (canvasW - pageW) / 2 : PAGE_MARGIN;
    const baseOffsetY = contentH <= canvasH ? (canvasH - pageH) / 2 : PAGE_MARGIN;
    const offsetX = baseOffsetX - viewport.offsetX;
    const offsetY = baseOffsetY - viewport.offsetY;

    // Draw page shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(offsetX, offsetY, pageW, pageH);
    ctx.restore();

    // 2. Render PDF page background
    const pageCanvas = this.pdfPageRenderer.getPageCanvas(
      page.index,
      scale * this.dpr,
      () => this.onNeedRerender?.()
    );

    if (pageCanvas) {
      ctx.drawImage(pageCanvas, offsetX, offsetY, pageW, pageH);
    } else {
      // Page not yet rendered - show white placeholder
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(offsetX, offsetY, pageW, pageH);
    }

    // 3. Translate to page coordinate space
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Render hover highlight for non-editing editable text blocks
    for (const el of page.elements) {
      if (el.type !== 'text' || !el.editable) continue;
      const isHovered = el.id === this.hoveredBlockId && el.id !== this.editingBlockId;
      if (isHovered) {
        this.renderBlockHighlight(ctx, el, TEXT_HOVER_BG_COLOR, scale);
      }
    }

    // Re-render the currently editing block and any previously modified blocks
    // This preserves the PDF background rendering for non-edited blocks
    for (const el of page.elements) {
      const isEditingDirty = el.id === this.editingBlockId && this.editingBlockDirty;
      if (el.type === 'text' && (isEditingDirty || this.modifiedBlockIds.has(el.id))) {
        // Draw white overlay to hide original PDF text for this block.
        // Use the union of current bounds and originalBounds so the overlay
        // covers both the pdfjs-rendered text (at original positions) and the
        // canvas-redrawn text (at possibly shifted positions after reflow).
        const ob = el.originalBounds;
        const ux = Math.min(el.bounds.x, ob.x);
        const uy = Math.min(el.bounds.y, ob.y);
        const uw = Math.max(el.bounds.x + el.bounds.width, ob.x + ob.width) - ux;
        const uh = Math.max(el.bounds.y + el.bounds.height, ob.y + ob.height) - uy;
        // Small safety pad covers anti-aliased edges that leak past the
        // nominal bounds rectangle. We used to use `max(4, fontSize)` here,
        // but that was up to a full em of overhang (36+ px on the 36pt
        // "Sample PDF" title), which ate the first line of the body
        // paragraph below the title. The bounds already include ascent /
        // descent, so a couple pixels is enough.
        const fontSize = el.paragraphs[0]?.runs[0]?.style.fontSize ?? 12;
        const pad = Math.max(2, fontSize * 0.12) * scale;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
          ux * scale - pad,
          uy * scale - pad,
          uw * scale + pad * 2,
          uh * scale + pad * 2
        );
        // Render editing highlight OVER the white overlay, UNDER the text
        if (el.id === this.editingBlockId) {
          this.renderBlockHighlight(ctx, el, TEXT_EDITING_BG_COLOR, scale);
        }
        // Render the edited text
        this.textRenderer.renderTextBlock(ctx, el, scale, this.dpr);
      }
    }

    // Render editing highlight for the editing block (before content is modified)
    if (this.editingBlockId && !this.editingBlockDirty) {
      for (const el of page.elements) {
        if (el.type === 'text' && el.id === this.editingBlockId) {
          this.renderBlockHighlight(ctx, el, TEXT_EDITING_BG_COLOR, scale);
          break;
        }
      }
    }

    // Render overlays if page is dirty
    if (page.dirty) {
      const overlays: OverlayElement[] = [];
      for (const el of page.elements) {
        if (el.type === 'overlay') overlays.push(el);
      }
      this.overlayManager.renderOverlays(ctx, overlays, scale);
    }

    // 6. Render selection highlights
    if (this.currentSelection) {
      const allTextBlocks = page.elements.filter(
        (e): e is TextBlock => e.type === 'text'
      );
      const block = allTextBlocks.find(
        (b) => b.id === this.currentSelection!.blockId
      );
      if (block) {
        this.selectionRenderer.renderSelection(
          ctx,
          this.currentSelection,
          block,
          scale
        );
      }
    }

    // 7. Render cursor
    if (this.currentCursor) {
      this.selectionRenderer.renderCursor(ctx, this.currentCursor, scale);
    }

    ctx.restore(); // page coordinate space
    ctx.restore(); // DPR transform
  }

  renderSelection(selection: SelectionRange | null): void {
    this.currentSelection = selection;
    if (this.currentPage && this.currentViewport) {
      this.renderPage(this.currentPage, this.currentViewport);
    }
  }

  renderCursor(cursor: CursorPosition | null): void {
    this.currentCursor = cursor;
    if (this.currentPage && this.currentViewport) {
      this.renderPage(this.currentPage, this.currentViewport);
    }
  }

  /** Update cursor state without triggering a re-render */
  updateCursor(cursor: CursorPosition | null): void {
    this.currentCursor = cursor;
  }

  /** Update selection state without triggering a re-render */
  updateSelection(selection: SelectionRange | null): void {
    this.currentSelection = selection;
  }

  hitTest(x: number, y: number, pageIdx: number): HitTestResult | null {
    return this.hitTester.hitTest(x, y, pageIdx);
  }

  /**
   * Get the page offset (for converting mouse coords to page coords)
   */
  getPageOffset(): { x: number; y: number } {
    if (!this.canvas || !this.currentPage || !this.currentViewport) {
      return { x: 0, y: 0 };
    }
    const canvasW = this.canvas.width / this.dpr;
    const canvasH = this.canvas.height / this.dpr;
    const scale = this.currentViewport.scale;
    const pageW = this.currentPage.width * scale;
    const pageH = this.currentPage.height * scale;
    const contentW = pageW + PAGE_MARGIN * 2;
    const contentH = pageH + PAGE_MARGIN * 2;
    const baseOffsetX = contentW <= canvasW ? (canvasW - pageW) / 2 : PAGE_MARGIN;
    const baseOffsetY = contentH <= canvasH ? (canvasH - pageH) / 2 : PAGE_MARGIN;
    return {
      x: baseOffsetX - this.currentViewport.offsetX,
      y: baseOffsetY - this.currentViewport.offsetY,
    };
  }

  setDirtyRect(rect: Rect): void {
    if (!this.dirtyRect) {
      this.dirtyRect = { ...rect };
    } else {
      const x1 = Math.min(this.dirtyRect.x, rect.x);
      const y1 = Math.min(this.dirtyRect.y, rect.y);
      const x2 = Math.max(
        this.dirtyRect.x + this.dirtyRect.width,
        rect.x + rect.width
      );
      const y2 = Math.max(
        this.dirtyRect.y + this.dirtyRect.height,
        rect.y + rect.height
      );
      this.dirtyRect = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    }
  }

  clearDirtyRect(): void {
    this.dirtyRect = null;
  }

  private renderBlockHighlight(
    ctx: CanvasRenderingContext2D,
    el: TextBlock,
    color: string,
    scale: number
  ): void {
    ctx.save();
    ctx.fillStyle = color;
    const pad = 3 * scale;
    const rx = 3 * scale;
    const bx = el.bounds.x * scale - pad;
    const by = el.bounds.y * scale - pad;
    const bw = el.bounds.width * scale + pad * 2;
    const bh = el.bounds.height * scale + pad * 2;
    ctx.beginPath();
    ctx.moveTo(bx + rx, by);
    ctx.lineTo(bx + bw - rx, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + rx);
    ctx.lineTo(bx + bw, by + bh - rx);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - rx, by + bh);
    ctx.lineTo(bx + rx, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - rx);
    ctx.lineTo(bx, by + rx);
    ctx.quadraticCurveTo(bx, by, bx + rx, by);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  destroy(): void {
    this.selectionRenderer.destroy();
    this.overlayManager.destroy();
    this.imageRenderer.clearCache();
    this.hitTester.clear();
    this.pdfPageRenderer.destroy();
    this.canvas = null;
    this.ctx = null;
    this.currentPage = null;
    this.currentViewport = null;
    this.currentSelection = null;
    this.currentCursor = null;
    this.dirtyRect = null;
    this.modifiedBlockIds.clear();
    this.hoveredBlockId = null;
    this.onNeedRerender = null;
  }
}
