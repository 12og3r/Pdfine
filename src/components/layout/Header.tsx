import { Minus, Plus, Download, ChevronLeft, Volume2, VolumeX } from 'lucide-react'
import { Tooltip } from '../ui/Tooltip'
import { useUIStore } from '../../store/uiStore'
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../../config/constants'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'
import { useExportPdf } from '../../hooks/useExportPdf'
import { useSfx } from '../../hooks/useSfx'

interface HeaderProps {
  editorCore: IEditorCore
}

export function Header({ editorCore }: HeaderProps) {
  const zoom = useUIStore((s) => s.zoom)
  const fileName = useUIStore((s) => s.fileName)
  const setZoom = useUIStore((s) => s.setZoom)
  const { exportPdf, isExporting } = useExportPdf(editorCore)
  const { play, muted, toggleMute } = useSfx()

  const handleZoomIn = () => {
    const next = Math.min(zoom + ZOOM_STEP, MAX_ZOOM)
    setZoom(next)
    editorCore.setZoom(next)
    play('click')
  }

  const handleZoomOut = () => {
    const next = Math.max(zoom - ZOOM_STEP, MIN_ZOOM)
    setZoom(next)
    editorCore.setZoom(next)
    play('click')
  }

  const handleBack = () => {
    play('click')
    useUIStore.getState().setDocumentLoaded(false)
  }

  const handleExport = async () => {
    play('coin')
    await exportPdf()
    play('powerUp')
  }

  const iconBtnStyle = (hover: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: hover ? 'var(--chrome-hover)' : 'transparent',
    color: hover ? 'var(--ink-coin)' : 'var(--chrome-text)',
    border: '2px solid var(--ink-black)',
    cursor: 'pointer',
    transition: 'all 80ms steps(2)',
    imageRendering: 'pixelated',
  })

  return (
    <header
      className="shrink-0 flex items-center justify-between relative z-20"
      style={{
        height: '56px',
        background: 'var(--ink-brick-deep)',
        borderBottom: '4px solid var(--ink-black)',
        padding: '0 16px',
        boxShadow: '0 4px 0 0 rgba(0,0,0,0.2)',
      }}
    >
      {/* Left: Back + File name */}
      <div className="flex items-center" style={{ minWidth: '220px', gap: '10px' }}>
        <Tooltip content="Back to home">
          <button
            aria-label="Back to home"
            style={iconBtnStyle(false)}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, iconBtnStyle(true))}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, iconBtnStyle(false))}
            onClick={handleBack}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* Pixel logo */}
        <div
          style={{
            width: '28px',
            height: '28px',
            background: 'var(--ink-coin)',
            border: '2px solid var(--ink-black)',
            boxShadow: 'inset -2px -2px 0 0 var(--ink-coin-dark), inset 2px 2px 0 0 #FFF07A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '10px',
              color: 'var(--ink-black)',
            }}
          >
            P
          </span>
        </div>

        <span
          style={{
            color: 'var(--ink-paper)',
            fontFamily: 'var(--font-display)',
            fontSize: '9px',
            letterSpacing: '0.08em',
            maxWidth: '160px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={fileName ?? undefined}
        >
          {(fileName ?? 'UNTITLED.PDF').toUpperCase()}
        </span>
      </div>

      {/* Center: Zoom controls */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <div
          className="flex items-center"
          style={{
            background: 'var(--ink-brick-dark)',
            border: '3px solid var(--ink-black)',
          }}
        >
          <Tooltip content="Zoom out">
            <button
              aria-label="Zoom out"
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderRight: '2px solid var(--ink-black)',
                color: 'var(--ink-paper)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--ink-coin-dark)'
                e.currentTarget.style.color = 'var(--ink-black)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--ink-paper)'
              }}
              onClick={handleZoomOut}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <span
            className="text-center tabular-nums select-none"
            style={{
              color: 'var(--ink-coin)',
              fontFamily: 'var(--font-display)',
              fontSize: '10px',
              minWidth: '3.5rem',
              padding: '0 8px',
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <Tooltip content="Zoom in">
            <button
              aria-label="Zoom in"
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderLeft: '2px solid var(--ink-black)',
                color: 'var(--ink-paper)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--ink-coin-dark)'
                e.currentTarget.style.color = 'var(--ink-black)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--ink-paper)'
              }}
              onClick={handleZoomIn}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Right: Mute + Export */}
      <div
        className="flex items-center"
        style={{ minWidth: '220px', justifyContent: 'flex-end', gap: '12px' }}
      >
        <Tooltip content={muted ? 'Unmute SFX' : 'Mute SFX'}>
          <button
            aria-label={muted ? 'Unmute SFX' : 'Mute SFX'}
            style={iconBtnStyle(false)}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, iconBtnStyle(true))}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, iconBtnStyle(false))}
            onClick={() => {
              toggleMute()
              if (muted) play('coin')
            }}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </Tooltip>
        <button
          className="pixel-btn"
          style={{
            fontSize: '9px',
            padding: '8px 14px',
            opacity: isExporting ? 0.5 : 1,
            pointerEvents: isExporting ? 'none' : 'auto',
          }}
          onClick={handleExport}
          disabled={isExporting}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'SAVING...' : 'EXPORT'}
          </span>
        </button>
      </div>
    </header>
  )
}
