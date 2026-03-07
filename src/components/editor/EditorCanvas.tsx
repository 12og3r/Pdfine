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
  const isEditing = useUIStore((s) => s.isEditing)
  const [scrollSize, setScrollSize] = useState({ width: 0, height: 0 })
  const [applyBtnPos, setApplyBtnPos] = useState<{ x: number; y: number } | null>(null)

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

  // Compute Apply button position in scrollable content coordinates
  const updateApplyBtnPos = useCallback(() => {
    if (!isEditing) { setApplyBtnPos(null); return }
    const blockId = editorCore.getEditEngine().getEditingBlockId()
    if (!blockId) { setApplyBtnPos(null); return }
    const page = editorCore.getPageModel(editorCore.getCurrentPage())
    if (!page) { setApplyBtnPos(null); return }
    const el = page.elements.find(e => e.id === blockId)
    if (!el) { setApplyBtnPos(null); return }
    const container = containerRef.current
    if (!container) { setApplyBtnPos(null); return }
    const scale = editorCore.getZoom()
    const pageW = page.width * scale
    const pageH = page.height * scale
    const contentW = pageW + PAGE_MARGIN * 2
    const contentH = pageH + PAGE_MARGIN * 2
    const canvasW = container.clientWidth
    const canvasH = container.clientHeight
    const baseX = contentW <= canvasW ? (canvasW - pageW) / 2 : PAGE_MARGIN
    const baseY = contentH <= canvasH ? (canvasH - pageH) / 2 : PAGE_MARGIN
    setApplyBtnPos({
      x: baseX + (el.bounds.x + el.bounds.width) * scale,
      y: baseY + (el.bounds.y + el.bounds.height) * scale + 8,
    })
  }, [editorCore, isEditing])

  useEffect(() => {
    updateApplyBtnPos()
  }, [updateApplyBtnPos])

  // Update Apply button position when text changes (bounds may grow)
  useEffect(() => {
    if (!isEditing) return
    const unsub = editorCore.on('textChanged', () => {
      // Defer to next frame so layout reflow completes first
      requestAnimationFrame(updateApplyBtnPos)
    })
    return unsub
  }, [editorCore, isEditing, updateApplyBtnPos])

  const handleApply = useCallback(() => {
    editorCore.getEditEngine().exitEditMode()
    editorCore.render()
  }, [editorCore])

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
          style={{ position: 'sticky', top: 0, left: 0, display: 'block' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
      </div>
      <TextEditInput editorCore={editorCore} />
      {isEditing && applyBtnPos && (
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleApply()
          }}
          style={{
            position: 'absolute',
            left: applyBtnPos.x,
            top: applyBtnPos.y,
            zIndex: 10,
            padding: '4px 14px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#6366F1',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            lineHeight: '20px',
          }}
        >
          Apply
        </button>
      )}
    </div>
  )
}
