import { useEffect, useRef, useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'

interface PagesSidebarProps {
  editorCore: IEditorCore
}

const THUMB_MAX_WIDTH = 180
const THUMB_MAX_HEIGHT = 220

export function PagesSidebar({ editorCore }: PagesSidebarProps) {
  const currentPage = useUIStore((s) => s.currentPage)
  const totalPages = useUIStore((s) => s.totalPages)

  if (totalPages <= 1) return null

  const handleSelect = (index: number) => {
    if (index === currentPage) return
    useUIStore.getState().setCurrentPage(index)
    editorCore.setCurrentPage(index)
  }

  return (
    <aside
      className="shrink-0 overflow-y-auto"
      style={{
        width: 240,
        background: 'color-mix(in srgb, var(--p-bg) 50%, var(--p-paper))',
        borderRight: '1px solid var(--p-line)',
        padding: '20px 16px 32px',
      }}
    >
      <div className="paper-eyebrow" style={{ marginBottom: 14 }}>
        Pages · {totalPages}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Array.from({ length: totalPages }, (_, i) => (
          <PageTile
            key={i}
            pageIdx={i}
            active={i === currentPage}
            editorCore={editorCore}
            onSelect={() => handleSelect(i)}
          />
        ))}
      </div>
    </aside>
  )
}

interface PageTileProps {
  pageIdx: number
  active: boolean
  editorCore: IEditorCore
  onSelect: () => void
}

function PageTile({ pageIdx, active, editorCore, onSelect }: PageTileProps) {
  return (
    <button
      onClick={onSelect}
      aria-label={`Go to page ${pageIdx + 1}`}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        background: active ? 'var(--p-paper)' : 'transparent',
        border: active ? '1px solid var(--p-ink-3)' : '1px solid transparent',
        cursor: 'pointer',
        transition: 'background 150ms, border-color 150ms',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background =
            'color-mix(in srgb, var(--p-paper) 55%, transparent)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <PageThumb pageIdx={pageIdx} editorCore={editorCore} />
      <span
        style={{
          fontFamily: 'var(--pdfine-mono)',
          fontSize: 11,
          letterSpacing: '0.04em',
          color: active ? 'var(--p-ink)' : 'var(--p-ink-3)',
        }}
      >
        {String(pageIdx + 1).padStart(2, '0')}
      </span>
    </button>
  )
}

function PageThumb({ pageIdx, editorCore }: { pageIdx: number; editorCore: IEditorCore }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [cssSize, setCssSize] = useState<{ w: number; h: number } | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const pageModel = editorCore.getPageModel(pageIdx)
    if (!pageModel) return

    const dpr = window.devicePixelRatio || 1
    const baseScale = Math.min(
      THUMB_MAX_WIDTH / pageModel.width,
      THUMB_MAX_HEIGHT / pageModel.height
    )
    const scale = baseScale * dpr
    const cssW = Math.max(1, Math.floor(pageModel.width * baseScale))
    const cssH = Math.max(1, Math.floor(pageModel.height * baseScale))
    setCssSize({ w: cssW, h: cssH })
    setReady(false)

    let cancelled = false
    const renderer = editorCore.getRenderEngine().getPdfPageRenderer()

    const copy = (src: HTMLCanvasElement) => {
      const dst = canvasRef.current
      if (!dst) return
      dst.width = src.width
      dst.height = src.height
      const ctx = dst.getContext('2d')
      if (!ctx) return
      ctx.drawImage(src, 0, 0)
      setReady(true)
    }

    // Poll until the cached canvas appears. `getPageCanvas` kicks off the
    // async render on the first call and memoises; subsequent calls either
    // return the cached bitmap or null while it's still in flight. Polling
    // works regardless of StrictMode double-invocation, which would otherwise
    // swallow a fire-once `onReady` callback.
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const tick = () => {
      if (cancelled) return
      const src = renderer.getPageCanvas(pageIdx, scale)
      if (src) {
        copy(src)
        return
      }
      timeoutId = setTimeout(tick, 150)
    }
    tick()

    return () => {
      cancelled = true
      if (timeoutId != null) clearTimeout(timeoutId)
    }
  }, [pageIdx, editorCore])

  const width = cssSize?.w ?? THUMB_MAX_WIDTH
  const height = cssSize?.h ?? THUMB_MAX_HEIGHT

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        background: '#fff',
        border: '1px solid var(--p-line)',
        boxShadow: '0 6px 14px -10px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          opacity: ready ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
      />
      {!ready && <ThumbSkeleton width={width} height={height} />}
    </div>
  )
}

function ThumbSkeleton({ width, height }: { width: number; height: number }) {
  const padX = Math.max(6, Math.round(width * 0.08))
  const padY = Math.max(8, Math.round(height * 0.08))
  const lineGap = Math.max(6, Math.round(height * 0.05))
  const count = Math.max(4, Math.floor((height - padY * 2) / lineGap))
  const stroke = 'rgba(26,23,21,0.12)'
  const lines: React.ReactElement[] = []
  for (let i = 0; i < count; i++) {
    const w =
      i % 5 === 0
        ? width - padX * 2 - Math.round(width * 0.2)
        : i % 3 === 0
          ? width - padX * 2 - Math.round(width * 0.1)
          : width - padX * 2
    lines.push(
      <rect key={i} x={padX} y={padY + i * lineGap} width={w} height="1.5" fill={stroke} rx="0.5" />
    )
  }
  return (
    <svg
      style={{ position: 'absolute', inset: 0 }}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      {lines}
    </svg>
  )
}
