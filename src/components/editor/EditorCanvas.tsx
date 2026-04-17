import { useEffect, useRef, useCallback, useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, PAGE_MARGIN } from '../../config/constants'
import { TextEditInput } from './TextEditInput'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'

interface EditorCanvasProps {
  editorCore: IEditorCore
}

export function EditorCanvas({ editorCore }: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const setZoom = useUIStore((s) => s.setZoom)
  const [scrollSize, setScrollSize] = useState({ width: 0, height: 0 })

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const width = container.clientWidth
    const height = container.clientHeight

    canvas.width = width * dpr
    canvas.height = height * dpr

    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    // Compute the scrollable content size based on the zoomed page
    const pageModel = editorCore.getPageModel(editorCore.getCurrentPage())
    const scale = editorCore.getZoom()
    if (pageModel) {
      const pageW = pageModel.width * scale + PAGE_MARGIN * 2
      const pageH = pageModel.height * scale + PAGE_MARGIN * 2
      setScrollSize({
        width: Math.max(pageW, width),
        height: Math.max(pageH, height),
      })
    }

    editorCore.setViewport({
      scale,
      offsetX: container.scrollLeft,
      offsetY: container.scrollTop,
      width,
      height,
    })
    editorCore.render()
  }, [editorCore])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    editorCore.bindCanvas(canvas)
    updateCanvasSize()
  }, [editorCore, updateCanvasSize])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => updateCanvasSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [updateCanvasSize])

  // Handle scroll — update viewport offset and re-render
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    editorCore.setViewport({
      scale: editorCore.getZoom(),
      offsetX: container.scrollLeft,
      offsetY: container.scrollTop,
      width: container.clientWidth,
      height: container.clientHeight,
    })
    editorCore.render()
  }, [editorCore])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
        const currentZoom = editorCore.getZoom()
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom + delta))
        setZoom(newZoom)
        editorCore.setZoom(newZoom)
        // Recalculate scroll size for new zoom level
        updateCanvasSize()
      }
    },
    [editorCore, setZoom, updateCanvasSize]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handleMouseDown = (e: React.MouseEvent) => {
    editorCore.handleCanvasMouseDown(e.nativeEvent)
    // Prevent canvas from stealing focus from hidden textarea during editing
    if (editorCore.isEditing()) {
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    editorCore.handleCanvasMouseMove(e.nativeEvent)
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    editorCore.handleCanvasMouseUp(e.nativeEvent)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    editorCore.handleCanvasDoubleClick(e.nativeEvent)
  }


  return (
    <div
      ref={containerRef}
      className="w-full h-full relative editor-canvas-bg"
      style={{ cursor: 'default', overflow: 'auto' }}
    >
      {/* Spacer div to create scrollable area when zoomed in; canvas inside it sticks to viewport */}
      <div style={{ width: scrollSize.width, height: scrollSize.height }}>
        <canvas
          ref={canvasRef}
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            display: 'block',
            // Sanctuary zone: undo the Inkworld pixel-art theme on the PDF canvas
            // so Canvas fillText renders with anti-aliasing — matching pdfjs's
            // offscreen raster and preventing a visible stroke-weight jump when
            // edit mode swaps in the canvas re-render.
            imageRendering: 'auto',
            WebkitFontSmoothing: 'subpixel-antialiased',
            MozOsxFontSmoothing: 'auto',
            fontSmooth: 'auto',
          } as React.CSSProperties}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
      </div>
      <TextEditInput editorCore={editorCore} />
    </div>
  )
}
