import { Minus, Plus, Download, ChevronLeft } from 'lucide-react'
import { Tooltip } from '../ui/Tooltip'
import { useUIStore } from '../../store/uiStore'
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../../config/constants'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'
import { PaperMark } from '../landing/PaperTopBar'

interface HeaderProps {
  editorCore: IEditorCore
}

export function Header({ editorCore }: HeaderProps) {
  const zoom = useUIStore((s) => s.zoom)
  const fileName = useUIStore((s) => s.fileName)
  const setZoom = useUIStore((s) => s.setZoom)
  const isExporting = useUIStore((s) => s.isExporting)
  const setShowExportDialog = useUIStore((s) => s.setShowExportDialog)

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

  const handleExport = () => {
    setShowExportDialog(true)
  }

  const iconBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: 'transparent',
    color: 'var(--p-ink-2)',
    border: '1px solid var(--p-line)',
    borderRadius: 2,
    cursor: 'pointer',
    transition: 'background 150ms, color 150ms, border-color 150ms',
  }

  const zoomBtnStyle: React.CSSProperties = {
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--p-ink-2)',
    cursor: 'pointer',
  }

  return (
    <header
      className="shrink-0 flex items-center justify-between relative"
      style={{
        height: 64,
        background: 'color-mix(in srgb, var(--p-bg) 92%, transparent)',
        borderBottom: '1px solid var(--p-line)',
        padding: '0 24px',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 20,
      }}
    >
      {/* Left: Back + Brand + filename */}
      <div className="flex items-center" style={{ minWidth: 260, gap: 14 }}>
        <Tooltip content="Back to landing" side="bottom" align="start">
          <button
            aria-label="Back to landing"
            style={iconBtnStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--p-paper)'
              e.currentTarget.style.color = 'var(--p-ink)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--p-ink-2)'
            }}
            onClick={handleBack}
          >
            <ChevronLeft size={16} />
          </button>
        </Tooltip>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PaperMark />
          <span
            style={{
              fontFamily: 'var(--p-serif)',
              fontSize: 20,
              letterSpacing: '-0.01em',
              color: 'var(--p-ink)',
            }}
          >
            Pdfine
          </span>
        </div>

        <span
          style={{
            paddingLeft: 14,
            marginLeft: 4,
            borderLeft: '1px solid var(--p-line)',
            fontFamily: 'var(--pdfine-mono)',
            fontSize: 12,
            color: 'var(--p-ink-3)',
            letterSpacing: '0.04em',
            maxWidth: 260,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={fileName ?? undefined}
        >
          {fileName ?? 'untitled.pdf'}
        </span>
      </div>

      {/* Center: Zoom */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center"
        style={{
          border: '1px solid var(--p-line)',
          borderRadius: 2,
          background: 'var(--p-paper)',
          overflow: 'hidden',
        }}
      >
        <Tooltip content="Zoom out" side="bottom">
          <button
            aria-label="Zoom out"
            style={{ ...zoomBtnStyle, borderRight: '1px solid var(--p-line)' }}
            onClick={handleZoomOut}
          >
            <Minus size={14} />
          </button>
        </Tooltip>
        <span
          className="tabular-nums select-none"
          style={{
            color: 'var(--p-ink)',
            fontFamily: 'var(--pdfine-mono)',
            fontSize: 12,
            minWidth: '3.25rem',
            textAlign: 'center',
            padding: '0 10px',
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <Tooltip content="Zoom in" side="bottom">
          <button
            aria-label="Zoom in"
            style={{ ...zoomBtnStyle, borderLeft: '1px solid var(--p-line)' }}
            onClick={handleZoomIn}
          >
            <Plus size={14} />
          </button>
        </Tooltip>
      </div>

      {/* Right: Export */}
      <div
        className="flex items-center"
        style={{ minWidth: 260, justifyContent: 'flex-end', gap: 12 }}
      >
        <button
          className="paper-btn"
          onClick={handleExport}
          disabled={isExporting}
          style={{
            opacity: isExporting ? 0.6 : 1,
            pointerEvents: isExporting ? 'none' : 'auto',
          }}
        >
          <Download size={14} />
          {isExporting ? 'Saving…' : 'Export PDF'}
        </button>
      </div>
    </header>
  )
}
