import { Minus, Plus, Download, ChevronLeft } from 'lucide-react'
import { Tooltip } from '../ui/Tooltip'
import { useUIStore } from '../../store/uiStore'
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../../config/constants'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'
import { useExportPdf } from '../../hooks/useExportPdf'

interface HeaderProps {
  editorCore: IEditorCore
}

export function Header({ editorCore }: HeaderProps) {
  const zoom = useUIStore((s) => s.zoom)
  const fileName = useUIStore((s) => s.fileName)
  const setZoom = useUIStore((s) => s.setZoom)
  const { exportPdf, isExporting } = useExportPdf(editorCore)

  const handleZoomIn = () => {
    const next = Math.min(zoom + ZOOM_STEP, MAX_ZOOM)
    setZoom(next)
    editorCore.setZoom(next)
  }

  const handleZoomOut = () => {
    const next = Math.max(zoom - ZOOM_STEP, MIN_ZOOM)
    setZoom(next)
    editorCore.setZoom(next)
  }

  const handleBack = () => {
    useUIStore.getState().setDocumentLoaded(false)
  }

  return (
    <header
      className="shrink-0 flex items-center justify-between relative z-20"
      style={{
        height: '48px',
        background: 'var(--chrome)',
        borderBottom: '1px solid var(--chrome-border)',
        padding: '0 16px',
      }}
    >
      {/* Left: Back + File name */}
      <div className="flex items-center gap-1" style={{ minWidth: '200px' }}>
        <Tooltip content="Back to home">
          <button
            className="p-1.5 rounded-md cursor-pointer transition-all duration-200"
            style={{ color: 'var(--chrome-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--chrome-hover)'; e.currentTarget.style.color = 'var(--chrome-text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--chrome-text-muted)' }}
            onClick={handleBack}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </Tooltip>

        <div
          className="h-4 w-px mx-1"
          style={{ background: 'var(--chrome-border)' }}
        />

        <span
          className="text-xs truncate max-w-[180px]"
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.02em',
          }}
        >
          {fileName || 'Untitled.pdf'}
        </span>
      </div>

      {/* Center: Zoom controls */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <div
          className="flex items-center rounded-lg"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--chrome-border)' }}
        >
          <Tooltip content="Zoom out">
            <button
              className="p-1.5 cursor-pointer transition-all duration-200 rounded-l-lg"
              style={{ color: 'var(--chrome-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--chrome-hover)'; e.currentTarget.style.color = 'var(--chrome-text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--chrome-text-muted)' }}
              onClick={handleZoomOut}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <span
            className="px-2.5 text-center tabular-nums select-none"
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              minWidth: '3rem',
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <Tooltip content="Zoom in">
            <button
              className="p-1.5 cursor-pointer transition-all duration-200 rounded-r-lg"
              style={{ color: 'var(--chrome-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--chrome-hover)'; e.currentTarget.style.color = 'var(--chrome-text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--chrome-text-muted)' }}
              onClick={handleZoomIn}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Right: Export */}
      <div className="flex items-center" style={{ minWidth: '200px', justifyContent: 'flex-end' }}>
        <button
          className="btn-accent inline-flex items-center justify-center rounded-lg font-semibold cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          style={{
            height: '32px',
            padding: '0 16px',
            fontSize: '12px',
            letterSpacing: '0.01em',
            fontFamily: 'var(--font-sans)',
            position: 'relative',
            zIndex: 0,
          }}
          onClick={exportPdf}
          disabled={isExporting}
        >
          <span className="relative z-10 flex items-center">
            <Download className="w-3.5 h-3.5" style={{ marginRight: '6px' }} />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </span>
        </button>
      </div>
    </header>
  )
}
