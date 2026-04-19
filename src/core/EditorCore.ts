import type { IEditorCore } from './interfaces/IEditorCore'
import type { IFontManager } from './interfaces/IFontManager'
import type { ILayoutEngine } from './interfaces/ILayoutEngine'
import type { IRenderEngine } from './interfaces/IRenderEngine'
import type { IEditEngine } from './interfaces/IEditEngine'
import type { IExportModule } from './interfaces/IExportModule'
import type { ICoordinateTransformer } from './interfaces/ICoordinateTransformer'
import type {
  DocumentModel,
  PageModel,
  TextBlock,
  TextStyle,
  ExportValidation,
} from '../types/document'
import type { EditorEvents } from '../types/events'
import type { ActiveTool, Viewport } from '../types/ui'

import { EventBus } from './infra/EventBus'
import { CoordinateTransformer } from './infra/CoordinateTransformer'
import { Logger } from './infra/Logger'
import { PdfParser } from './parser/PdfParser'
import { FontManager } from './font/FontManager'
import { LayoutEngine } from './layout/LayoutEngine'
import { RenderEngine } from './render/RenderEngine'
import { EditEngine } from './editor/EditEngine'
import { ExportModule } from './export/ExportModule'
import { createTextBlock, createParagraph, createTextRun, createTextStyle } from './model/DocumentModel'
import { DEFAULT_NEW_TEXTBLOCK_WIDTH, DEFAULT_NEW_TEXTBLOCK_HEIGHT } from '../config/defaults'

import * as pdfjsLib from 'pdfjs-dist'

const logger = new Logger('EditorCore')

export class EditorCore implements IEditorCore {
  private eventBus = new EventBus()
  private coordinateTransformer = new CoordinateTransformer()
  private pdfParser = new PdfParser()
  private fontManager = new FontManager()
  private layoutEngine = new LayoutEngine()
  private renderEngine = new RenderEngine()
  private editEngine: EditEngine | null = null
  private exportModule = new ExportModule()

  private documentModel: DocumentModel | null = null
  private originalPdfData: ArrayBuffer | null = null
  /** Password the user supplied to unlock the source PDF (if any). Retained
   *  so the export path can hand it to pdf-lib's `PDFDocument.load({ password })`
   *  — otherwise loading an encrypted source PDF into pdf-lib throws even
   *  after pdfjs has accepted the password in the editor. */
  private openPassword: string | null = null
  private modifiedBlockIds = new Set<string>()
  private currentPage = 0
  private activeTool: ActiveTool = 'select'
  private viewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0, width: 800, height: 600 }
  private dragAnchor: { blockId: string; offset: number } | null = null

  constructor() {
    // Set up re-render callback for async PDF page rendering
    this.renderEngine.setRerenderCallback(() => this.render())
  }

  // =============== Initialization ===============

  async loadPdf(data: ArrayBuffer, password?: string): Promise<void> {
    logger.info('Loading PDF...')
    // pdfjs may transfer / detach the ArrayBuffer we hand to its worker.
    // Previously we sliced `data` for our own keep-copy and then passed the
    // caller's `data` straight through to pdfjs — but that detaches the
    // caller's buffer, so a retry (e.g. wrong-password → correct-password
    // flow where `PasswordModal` re-submits the same `pendingPdfData`)
    // would then fail at the top of this method with "Cannot perform
    // ArrayBuffer.prototype.slice on a detached ArrayBuffer". Copy TWICE
    // up-front: one copy we persist for export, one copy we hand to pdfjs.
    // The caller's `data` is never touched.
    this.originalPdfData = data.slice(0)
    this.openPassword = password ?? null
    const workerData = data.slice(0)

    // Re-set re-render callback (may have been cleared by destroy() in React strict mode)
    this.renderEngine.setRerenderCallback(() => this.render())

    // Parse PDF
    this.documentModel = await this.pdfParser.parse(workerData, password)

    // Get the pdfjs document proxy for page rendering
    const pdfDoc = (this.documentModel as DocumentModel & { _pdfDoc?: pdfjsLib.PDFDocumentProxy })._pdfDoc
    if (pdfDoc) {
      // Set up PDF page renderer with the document
      this.renderEngine.getPdfPageRenderer().setPdfDocument(pdfDoc)

      // Extract and register fonts
      await this.fontManager.extractAndRegister(pdfDoc)
      this.documentModel.fonts = this.fontManager.getFontMap()

      // Provide font manager to render engine so TextRenderer can use registered fonts
      this.renderEngine.setFontManager(this.fontManager)
    }

    // Initial layout for all pages
    for (let i = 0; i < this.documentModel.pages.length; i++) {
      this.documentModel.pages[i] = this.layoutEngine.reflowPage(
        this.documentModel.pages[i],
        this.fontManager
      )
    }

    // Adjust text block bounds to align Canvas rendering with PDF rendering.
    // TextBlockBuilder computes bounds.y = baseline - fontSize, but the actual
    // visual top of text is at baseline - ascent (from font metrics). The offset
    // (fontSize - ascent) causes vertical misalignment between Canvas fillText
    // and pdfjs rasterization. Correcting bounds.y here closes that gap.
    this.adjustBoundsToFontAscent(this.documentModel)

    // Set up edit engine
    this.editEngine = new EditEngine(
      this.documentModel,
      this.eventBus,
      (pageIdx) => this.getPageModel(pageIdx)
    )

    // Wire up event listeners
    this.setupEventListeners()

    // Update coordinate transformer
    if (this.documentModel.pages.length > 0) {
      const firstPage = this.documentModel.pages[0]
      this.coordinateTransformer.updateViewport(
        this.viewport.scale,
        window.devicePixelRatio || 1,
        firstPage.width,
        firstPage.height
      )
    }

    this.currentPage = 0

    // Emit document loaded
    this.eventBus.emit('documentLoaded', {
      pageCount: this.documentModel.pages.length,
    })

    // Render first page
    this.render()

    logger.info('PDF loaded successfully')
  }

  // =============== State Queries ===============

  getDocument(): DocumentModel | null {
    return this.documentModel
  }

  getCurrentPage(): number {
    return this.currentPage
  }

  getTotalPages(): number {
    return this.documentModel?.pages.length ?? 0
  }

  isEditing(): boolean {
    return this.editEngine?.isEditing() ?? false
  }

  getActiveTool(): ActiveTool {
    return this.activeTool
  }

  setActiveTool(tool: ActiveTool): void {
    if (this.activeTool === tool) return
    if (this.editEngine?.isEditing() && tool !== 'editText') {
      this.editEngine.exitEditMode()
    }
    this.activeTool = tool
  }

  // =============== Page Navigation ===============

  setCurrentPage(page: number): void {
    if (!this.documentModel) return
    const clamped = Math.max(0, Math.min(page, this.documentModel.pages.length - 1))
    if (clamped === this.currentPage) return

    // Exit edit mode before switching pages — otherwise the edit state stays
    // pinned to the previous page's block while the viewport moves, and a
    // subsequent double-click on the new page re-enters edit mode without
    // producing an `isEditing` false→true transition. TextEditInput only
    // re-focuses the hidden textarea on that transition, so without this
    // exit, keystrokes get swallowed by whatever element still holds focus
    // (typically the PageNavigator chevron button that triggered the nav).
    if (this.editEngine?.isEditing()) {
      this.editEngine.exitEditMode()
      // Clear the render engine's editing-block reference so its white
      // overlay / canvas re-render path doesn't still key off the previous
      // page's block id.
      this.renderEngine.setEditingBlockId(null)
    }

    this.currentPage = clamped

    const pageModel = this.documentModel.pages[clamped]
    if (pageModel) {
      this.coordinateTransformer.updateViewport(
        this.viewport.scale,
        window.devicePixelRatio || 1,
        pageModel.width,
        pageModel.height
      )
    }

    this.render()
    this.eventBus.emit('pageChanged', { pageIdx: clamped })
  }

  getPageModel(pageIdx: number): PageModel | null {
    return this.documentModel?.pages[pageIdx] ?? null
  }

  // =============== Viewport ===============

  setViewport(viewport: Viewport): void {
    this.viewport = viewport
  }

  getViewport(): Viewport {
    return this.viewport
  }

  setZoom(zoom: number): void {
    this.viewport = { ...this.viewport, scale: zoom }
    // Invalidate cached page renders when zoom changes
    this.renderEngine.getPdfPageRenderer().clearCache()
    this.coordinateTransformer.updateViewport(
      zoom,
      window.devicePixelRatio || 1,
      this.coordinateTransformer.getPageWidth(),
      this.coordinateTransformer.getPageHeight()
    )
    this.render()
  }

  getZoom(): number {
    return this.viewport.scale
  }

  // =============== Canvas ===============

  bindCanvas(canvas: HTMLCanvasElement): void {
    this.renderEngine.bindCanvas(canvas)
  }

  render(): void {
    if (!this.documentModel) return
    const page = this.documentModel.pages[this.currentPage]
    if (!page) return

    // Update cursor and selection state before rendering
    if (this.editEngine?.isEditing()) {
      this.renderEngine.updateCursor(this.editEngine.getCursorPosition())
      this.renderEngine.updateSelection(this.editEngine.getSelection())
    } else {
      this.renderEngine.updateCursor(null)
      this.renderEngine.updateSelection(null)
    }

    this.renderEngine.renderPage(page, this.viewport)
  }

  // =============== Mouse Events ===============

  handleCanvasMouseDown(e: MouseEvent): void {
    if (!this.documentModel) return

    const canvas = this.renderEngine.getCanvas()
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top

    // Account for page centering offset
    const pageOffset = this.renderEngine.getPageOffset()
    const scale = this.viewport.scale
    const x = (canvasX - pageOffset.x) / scale
    const y = (canvasY - pageOffset.y) / scale

    const hit = this.renderEngine.hitTest(x, y, this.currentPage)

    if (this.activeTool === 'select' || this.activeTool === 'editText') {
      if (hit && hit.elementType === 'text') {
        this.eventBus.emit('selectionChanged', {
          blockId: hit.blockId,
          startOffset: hit.charOffset,
          endOffset: hit.charOffset,
        })

        if (this.editEngine?.isEditing() && this.editEngine.getEditingBlockId() === hit.blockId) {
          const cursorMgr = (this.editEngine as EditEngine).getCursorManager()
          cursorMgr.setCursor(this.currentPage, hit.blockId, hit.charOffset)
          this.editEngine.getSelectionManager().clearSelection()
          // Remember the down-click point as the drag anchor so a subsequent
          // mousemove can extend the selection.
          this.dragAnchor = { blockId: hit.blockId, offset: hit.charOffset }
          // Refresh the inspector to reflect the run the cursor just landed on.
          ;(this.editEngine as EditEngine).refreshStyleAtCursor()
          this.render()
        }
      } else {
        if (this.editEngine?.isEditing()) {
          this.editEngine.exitEditMode()
          this.render()
        }
        this.dragAnchor = null
        this.eventBus.emit('selectionChanged', null)
      }
    } else if (this.activeTool === 'addText') {
      this.addTextBlock(this.currentPage, x, y)
    }
  }

  handleCanvasMouseMove(e: MouseEvent): void {
    if (!this.documentModel) return

    const canvas = this.renderEngine.getCanvas()
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top

    const pageOffset = this.renderEngine.getPageOffset()
    const scale = this.viewport.scale
    const x = (canvasX - pageOffset.x) / scale
    const y = (canvasY - pageOffset.y) / scale

    const hit = this.renderEngine.hitTest(x, y, this.currentPage)

    // Drag-extend selection while a drag is active inside the editing block.
    if (
      this.dragAnchor &&
      this.editEngine?.isEditing() &&
      this.editEngine.getEditingBlockId() === this.dragAnchor.blockId &&
      hit &&
      hit.elementType === 'text' &&
      hit.blockId === this.dragAnchor.blockId
    ) {
      const cursorMgr = (this.editEngine as EditEngine).getCursorManager()
      const selMgr = this.editEngine.getSelectionManager()
      const anchor = this.dragAnchor.offset
      const cursor = hit.charOffset
      cursorMgr.setCursor(this.currentPage, this.dragAnchor.blockId, cursor)
      if (anchor === cursor) {
        selMgr.clearSelection()
      } else {
        selMgr.setSelection(this.currentPage, this.dragAnchor.blockId, anchor, cursor)
      }
      // Let the inspector reflect the styles of whatever is currently under
      // the selection — otherwise it stays stuck on the previous range.
      ;(this.editEngine as EditEngine).refreshStyleAtCursor()
      canvas.style.cursor = 'text'
      this.render()
      return
    }

    if (hit && hit.elementType === 'text') {
      const page = this.documentModel.pages[this.currentPage]
      const el = page?.elements.find(e => e.id === hit.blockId)
      if (el && el.type === 'text' && el.editable) {
        this.renderEngine.setHoveredBlockId(hit.blockId)
        canvas.style.cursor = 'text'
        this.render()
        return
      }
    }

    // Not hovering over editable text
    if (this.renderEngine.getHoveredBlockId() !== null) {
      this.renderEngine.setHoveredBlockId(null)
      canvas.style.cursor = 'default'
      this.render()
    }
  }

  handleCanvasMouseUp(_e: MouseEvent): void {
    this.dragAnchor = null
  }

  handleCanvasDoubleClick(e: MouseEvent): void {
    if (!this.documentModel) return

    const canvas = this.renderEngine.getCanvas()
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top

    // Account for page centering offset
    const pageOffset = this.renderEngine.getPageOffset()
    const scale = this.viewport.scale
    const x = (canvasX - pageOffset.x) / scale
    const y = (canvasY - pageOffset.y) / scale

    const hit = this.renderEngine.hitTest(x, y, this.currentPage)

    if (hit && hit.elementType === 'text') {
      this.activeTool = 'editText'
      this.editEngine?.enterEditMode(hit.blockId)

      const cursorMgr = (this.editEngine as EditEngine).getCursorManager()
      cursorMgr.setCursor(this.currentPage, hit.blockId, hit.charOffset)

      this.render()
    }
  }

  // =============== Text Editing ===============

  handleInput(e: InputEvent): void {
    this.editEngine?.handleInput(e)
  }

  handleKeyDown(e: KeyboardEvent): void {
    this.editEngine?.handleKeyDown(e)
  }

  handleComposition(e: CompositionEvent): void {
    this.editEngine?.handleComposition(e)
  }

  // =============== Element Operations ===============

  addTextBlock(pageIdx: number, x: number, y: number): TextBlock {
    const defaultStyle = createTextStyle({ fontId: 'sans-serif', fontSize: 14 })
    const block = createTextBlock(
      [createParagraph([createTextRun('', defaultStyle)])],
      { x, y, width: DEFAULT_NEW_TEXTBLOCK_WIDTH, height: DEFAULT_NEW_TEXTBLOCK_HEIGHT },
      true
    )

    if (this.documentModel) {
      const page = this.documentModel.pages[pageIdx]
      if (page) {
        page.elements.push(block)
        page.dirty = true
        this.eventBus.emit('elementAdded', { pageIdx, elementId: block.id })

        this.activeTool = 'editText'
        this.editEngine?.enterEditMode(block.id)
        this.render()
      }
    }

    return block
  }

  deleteElement(pageIdx: number, elementId: string): void {
    if (!this.documentModel) return
    const page = this.documentModel.pages[pageIdx]
    if (!page) return

    const idx = page.elements.findIndex((el) => el.id === elementId)
    if (idx >= 0) {
      page.elements.splice(idx, 1)
      page.dirty = true
      this.eventBus.emit('elementRemoved', { pageIdx, elementId })
      this.render()
    }
  }

  moveElement(pageIdx: number, elementId: string, x: number, y: number): void {
    if (!this.documentModel) return
    const page = this.documentModel.pages[pageIdx]
    if (!page) return

    const el = page.elements.find((e) => e.id === elementId)
    if (el) {
      el.bounds = { ...el.bounds, x, y }
      page.dirty = true
      this.eventBus.emit('elementMoved', { pageIdx, elementId })
      this.render()
    }
  }

  // =============== Style ===============

  applyTextStyle(style: Partial<TextStyle>): void {
    this.editEngine?.applyStyle(style)
  }

  // =============== Undo/Redo ===============

  undo(): void {
    this.editEngine?.undo()
  }

  redo(): void {
    this.editEngine?.redo()
  }

  canUndo(): boolean {
    return this.editEngine?.canUndo() ?? false
  }

  canRedo(): boolean {
    return this.editEngine?.canRedo() ?? false
  }

  // =============== Export ===============

  validateForExport(): ExportValidation {
    if (!this.documentModel) {
      return { overflowBlocks: [], missingGlyphs: [], warnings: [], canExport: false }
    }
    return this.exportModule.validate(this.documentModel, this.fontManager, this.modifiedBlockIds)
  }

  async exportPdf(
    onProgress?: (p: number) => void,
    options?: import('./interfaces/IExportModule').ExportOptions,
  ): Promise<Uint8Array> {
    if (!this.documentModel || !this.originalPdfData) {
      throw new Error('No document loaded')
    }

    if (this.editEngine?.isEditing()) {
      this.editEngine.exitEditMode()
    }

    // Export uses the layout the editor has been maintaining on every edit
    // (via `reflowTextBlock` in the `textChanged` / `editStart` handlers).
    // Swapping to knuth-plass + calling `reflowPage` here would discard that
    // layout and produce different line breaks than what the user just saw,
    // so the exported PDF would not match the editor — WYSIWYG-breaking.
    // Thread the source PDF's open-password so pdf-lib can decrypt it — the
    // caller only passes the output-encryption password via `options.password`.
    const resolved: import('./interfaces/IExportModule').ExportOptions = {
      ...options,
      sourcePassword: options?.sourcePassword ?? this.openPassword ?? undefined,
    }
    return await this.exportModule.export(
      this.originalPdfData,
      this.documentModel,
      this.fontManager,
      onProgress,
      this.modifiedBlockIds,
      resolved,
    )
  }

  // =============== Event Subscription ===============

  on<K extends keyof EditorEvents>(
    event: K,
    callback: (data: EditorEvents[K]) => void
  ): () => void {
    return this.eventBus.on(event, callback)
  }

  // =============== Sub-module Access ===============

  getFontManager(): IFontManager {
    return this.fontManager
  }

  getLayoutEngine(): ILayoutEngine {
    return this.layoutEngine
  }

  getRenderEngine(): IRenderEngine {
    return this.renderEngine
  }

  getEditEngine(): IEditEngine {
    if (!this.editEngine) {
      throw new Error('EditEngine not initialized. Load a PDF first.')
    }
    return this.editEngine
  }

  getExportModule(): IExportModule {
    return this.exportModule
  }

  getCoordinateTransformer(): ICoordinateTransformer {
    return this.coordinateTransformer
  }

  // =============== Cleanup ===============

  destroy(): void {
    this.editEngine?.destroy()
    this.renderEngine.destroy()
    this.fontManager.destroy()
    this.eventBus.removeAllListeners()
    this.documentModel = null
    this.originalPdfData = null
    logger.info('EditorCore destroyed')
  }

  // =============== Internal ===============

  /**
   * Adjust text block bounds.y to use font ascender instead of fontSize.
   * TextBlockBuilder sets bounds.y = baseline - fontSize (approximate text top),
   * but the actual visual top is baseline - ascent. The difference causes
   * Canvas fillText to render vertically offset from pdfjs rasterization.
   */
  private adjustBoundsToFontAscent(doc: DocumentModel): void {
    for (const page of doc.pages) {
      for (const el of page.elements) {
        if (el.type !== 'text') continue
        const firstRun = el.paragraphs[0]?.runs[0]
        if (!firstRun) continue
        const { fontSize, fontId } = firstRun.style
        const ascent = this.fontManager.getAscent(fontId, fontSize)
        const offset = fontSize - ascent
        if (Math.abs(offset) < 0.1) continue
        el.bounds = { ...el.bounds, y: el.bounds.y + offset, height: el.bounds.height - offset }
        el.originalBounds = { ...el.originalBounds, y: el.originalBounds.y + offset, height: el.originalBounds.height - offset }
      }
    }
  }

  private setupEventListeners(): void {
    this.eventBus.on('textChanged', ({ pageIdx, blockId }) => {
      if (!this.documentModel) return
      const page = this.documentModel.pages[pageIdx]
      if (!page) return

      // Mark the editing block as dirty so the white overlay + re-render activates
      this.renderEngine.markEditingBlockDirty()

      for (let i = 0; i < page.elements.length; i++) {
        const el = page.elements[i]
        if (el.type === 'text' && el.id === blockId) {
          page.elements[i] = this.layoutEngine.reflowTextBlock(el, this.fontManager, { autoGrow: true })
          const reflowed = page.elements[i] as TextBlock

          if (reflowed.overflowState.status !== 'normal') {
            this.eventBus.emit('overflow', {
              blockId,
              state: reflowed.overflowState,
            })
          }

          break
        }
      }

      page.dirty = true
      this.render()

      this.eventBus.emit('historyChanged', {
        canUndo: this.editEngine?.canUndo() ?? false,
        canRedo: this.editEngine?.canRedo() ?? false,
      })
    })

    this.eventBus.on('cursorMoved', () => {
      this.renderEngine.resetCursorBlink()
      this.render()
    })

    this.eventBus.on('editStart', ({ blockId }) => {
      this.renderEngine.setEditingBlockId(blockId)

      // Re-run reflow so canvas-rendered text uses the same layout that
      // subsequent type+delete cycles will produce.  With the \n preservation
      // fix in TextBlockBuilder the greedy line breaker now reproduces the
      // original line breaks, so this is safe.
      if (this.documentModel) {
        const page = this.documentModel.pages[this.currentPage]
        if (page) {
          for (let i = 0; i < page.elements.length; i++) {
            const el = page.elements[i]
            if (el.type === 'text' && el.id === blockId) {
              page.elements[i] = this.layoutEngine.reflowTextBlock(el, this.fontManager, { syncBounds: true })
              break
            }
          }
        }
      }

      this.renderEngine.markEditingBlockDirty()
      this.render()
    })

    this.eventBus.on('editEnd', ({ blockId }) => {
      this.modifiedBlockIds.add(blockId)
      this.renderEngine.setEditingBlockId(null)
      this.activeTool = 'select'
      this.render()
    })
  }
}
