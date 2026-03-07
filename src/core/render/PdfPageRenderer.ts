import * as pdfjsLib from 'pdfjs-dist'

/**
 * Renders PDF pages to offscreen canvases using pdfjs-dist's native rendering.
 * These cached canvases are used as background images in the editor.
 */
export class PdfPageRenderer {
  private pageCache = new Map<string, HTMLCanvasElement>()
  private renderingPages = new Set<string>()
  private pdfDoc: pdfjsLib.PDFDocumentProxy | null = null

  setPdfDocument(pdfDoc: pdfjsLib.PDFDocumentProxy): void {
    this.pdfDoc = pdfDoc
    this.pageCache.clear()
    this.renderingPages.clear()
  }

  /**
   * Get a rendered page canvas. Returns null if not yet rendered.
   * Triggers async rendering if needed.
   */
  getPageCanvas(
    pageIdx: number,
    scale: number,
    onReady?: () => void
  ): HTMLCanvasElement | null {
    const key = `${pageIdx}-${scale.toFixed(2)}`
    const cached = this.pageCache.get(key)
    if (cached) return cached

    // Start async render if not already in progress
    if (!this.renderingPages.has(key)) {
      this.renderPage(pageIdx, scale, key, onReady)
    }

    return null
  }

  private async renderPage(
    pageIdx: number,
    scale: number,
    cacheKey: string,
    onReady?: () => void
  ): Promise<void> {
    if (!this.pdfDoc) return
    this.renderingPages.add(cacheKey)

    try {
      const page = await this.pdfDoc.getPage(pageIdx + 1) // pdfjs is 1-indexed
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      })
      await renderTask.promise

      this.pageCache.set(cacheKey, canvas)
      onReady?.()
    } catch (err) {
      console.warn('[PdfPageRenderer] Failed to render PDF page', pageIdx, err)
    } finally {
      this.renderingPages.delete(cacheKey)
    }
  }

  /**
   * Invalidate cache for a specific page (e.g., when scale changes)
   */
  invalidatePage(pageIdx: number): void {
    for (const key of this.pageCache.keys()) {
      if (key.startsWith(`${pageIdx}-`)) {
        this.pageCache.delete(key)
      }
    }
  }

  /**
   * Clear all cached renders
   */
  clearCache(): void {
    this.pageCache.clear()
    this.renderingPages.clear()
  }

  destroy(): void {
    this.clearCache()
    this.pdfDoc = null
  }
}
