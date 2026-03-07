import { FileText, ArrowUpRight, Lock as LockIcon, Shield } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'

interface UploadWidgetProps {
  editorCore: IEditorCore
  onDrop?: () => void
  onLoadStart?: () => void
  onLoadComplete?: () => void
  onError?: (error: string) => void
}

type LoadingPhase = 'parsing' | 'extracting' | 'preparing'

const LOADING_MESSAGES: Record<LoadingPhase, string> = {
  parsing: 'Parsing document...',
  extracting: 'Extracting text...',
  preparing: 'Preparing editor...',
}

const ERROR_MESSAGES: Record<string, string> = {
  type: 'Please choose a PDF file (.pdf). Other file types aren\'t supported yet.',
  corrupted: 'We couldn\'t open this PDF. The file may be damaged or use an unsupported format.',
  unknown: 'Something went wrong while opening your PDF. Please try again or use a different file.',
}

export function UploadWidget({ editorCore, onDrop, onLoadStart, onLoadComplete, onError }: UploadWidgetProps) {
  const [dragOverZone, setDragOverZone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('parsing')
  const [dropped, setDropped] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const loadingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const setShowPasswordModal = useUIStore((s) => s.setShowPasswordModal)
  const setPendingPdfData = useUIStore((s) => s.setPendingPdfData)
  const setFileName = useUIStore((s) => s.setFileName)

  useEffect(() => {
    return () => { loadingTimersRef.current.forEach(clearTimeout) }
  }, [])

  const startLoadingPhases = useCallback(() => {
    setLoadingPhase('parsing')
    loadingTimersRef.current.forEach(clearTimeout)
    loadingTimersRef.current = []
    const t1 = setTimeout(() => setLoadingPhase('extracting'), 2000)
    const t2 = setTimeout(() => setLoadingPhase('preparing'), 4000)
    loadingTimersRef.current = [t1, t2]
  }, [])

  const getErrorMessage = useCallback((message: string): string => {
    const lower = message.toLowerCase()
    if (lower.includes('password')) return ''
    if (lower.includes('invalid') || lower.includes('corrupt') || lower.includes('damaged')) return ERROR_MESSAGES.corrupted
    return ERROR_MESSAGES.unknown
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) { onError?.(ERROR_MESSAGES.type); return }
      onDrop?.()
      setDropped(true)
      setTimeout(() => { setDropped(false); setLoading(true); onLoadStart?.(); startLoadingPhases() }, 300)
      setFileName(file.name)
      try {
        const buffer = await file.arrayBuffer()
        await editorCore.loadPdf(buffer)
        onLoadComplete?.()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        if (message.toLowerCase().includes('password')) {
          const buffer = await file.arrayBuffer()
          setPendingPdfData(buffer)
          setShowPasswordModal(true)
        } else { onError?.(getErrorMessage(message)) }
      } finally { setLoading(false); loadingTimersRef.current.forEach(clearTimeout) }
    },
    [editorCore, setFileName, setPendingPdfData, setShowPasswordModal, startLoadingPhases, getErrorMessage, onDrop, onLoadStart, onLoadComplete, onError]
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || loading) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    setMousePos({ x, y })
  }, [loading])

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => { setMousePos({ x: 0, y: 0 }); setIsHovered(false) }, [])

  const handleZoneDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverZone(true) }, [])
  const handleZoneDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverZone(false) }, [])
  const handleZoneDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverZone(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file) }, [handleFile])
  const handleClick = useCallback(() => { if (loading) return; fileInputRef.current?.click() }, [loading])
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }, [handleClick])
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = '' }, [handleFile])

  const isActive = dragOverZone || dropped
  const tiltX = mousePos.y * -2.5
  const tiltY = mousePos.x * 2.5
  const glowX = (mousePos.x + 1) * 50
  const glowY = (mousePos.y + 1) * 50

  return (
    <>
      <style>{`
        @keyframes uw-shine-sweep {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(250%) skewX(-15deg); }
        }
        @keyframes uw-border-breathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes uw-glow-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
        @keyframes uw-dot-drift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes uw-progress-flow {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes uw-phase-in {
          from { opacity: 0; transform: translateY(6px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
      `}</style>

      <div
        ref={containerRef}
        className={`group relative w-full cursor-pointer ${dropped ? 'animate-drop-bounce' : ''}`}
        style={{ perspective: '800px' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDragOver={handleZoneDragOver}
        onDragLeave={handleZoneDragLeave}
        onDrop={handleZoneDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Upload a PDF file. You can also drag and drop a file here."
      >
        {/* Gradient border glow — visible on hover & drag */}
        <div
          style={{
            position: 'absolute',
            inset: '-1px',
            borderRadius: '21px',
            background: 'var(--gradient-accent)',
            opacity: isActive ? 0.9 : isHovered ? 0.45 : 0,
            transition: 'opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
            animation: isActive ? 'uw-glow-pulse 2s ease-in-out infinite' : 'none',
          }}
        />
        {/* Soft outer glow for drag state */}
        {isActive && (
          <div
            style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '26px',
              background: 'var(--gradient-accent)',
              opacity: 0.15,
              filter: 'blur(16px)',
              animation: 'uw-glow-pulse 2s ease-in-out infinite',
            }}
          />
        )}

        {/* Main card */}
        <div
          style={{
            position: 'relative',
            background: isActive
              ? 'rgba(255, 255, 255, 0.97)'
              : 'var(--surface)',
            borderRadius: '20px',
            padding: '52px 40px',
            transform: loading ? 'none' : `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
            transition: 'transform 0.15s ease-out, background 0.3s ease, box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
            overflow: 'hidden',
            boxShadow: isActive
              ? '0 8px 40px rgba(99, 102, 241, 0.12), inset 0 0 60px rgba(99, 102, 241, 0.03)'
              : isHovered
                ? '0 12px 40px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(99, 102, 241, 0.08)'
                : 'var(--shadow-md)',
          }}
        >
          {/* Shine sweep — triggers on hover */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
              borderRadius: '20px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '60%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5) 40%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.5) 60%, transparent)',
                animation: isHovered && !loading ? 'uw-shine-sweep 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'none',
                opacity: isHovered ? 1 : 0,
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Mouse-following radial glow */}
          {!loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: `radial-gradient(ellipse 320px 260px at ${glowX}% ${glowY}%, rgba(99, 102, 241, 0.07), transparent 70%)`,
                opacity: mousePos.x === 0 && mousePos.y === 0 ? 0 : 1,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}

          {/* Subtle corner accents */}
          {!loading && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  width: '24px',
                  height: '24px',
                  borderTop: `2px solid rgba(99, 102, 241, ${isActive ? 0.5 : isHovered ? 0.25 : 0.1})`,
                  borderLeft: `2px solid rgba(99, 102, 241, ${isActive ? 0.5 : isHovered ? 0.25 : 0.1})`,
                  borderTopLeftRadius: '6px',
                  transition: 'border-color 0.4s ease',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '24px',
                  height: '24px',
                  borderTop: `2px solid rgba(6, 182, 212, ${isActive ? 0.5 : isHovered ? 0.25 : 0.1})`,
                  borderRight: `2px solid rgba(6, 182, 212, ${isActive ? 0.5 : isHovered ? 0.25 : 0.1})`,
                  borderTopRightRadius: '6px',
                  transition: 'border-color 0.4s ease',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  width: '24px',
                  height: '24px',
                  borderBottom: `2px solid rgba(6, 182, 212, ${isActive ? 0.5 : isHovered ? 0.25 : 0.1})`,
                  borderLeft: `2px solid rgba(6, 182, 212, ${isActive ? 0.5 : isHovered ? 0.25 : 0.1})`,
                  borderBottomLeftRadius: '6px',
                  transition: 'border-color 0.4s ease',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  width: '24px',
                  height: '24px',
                  borderBottom: `2px solid rgba(99, 102, 241, ${isActive ? 0.5 : isHovered ? 0.25 : 0.1})`,
                  borderRight: `2px solid rgba(99, 102, 241, ${isActive ? 0.5 : isHovered ? 0.25 : 0.1})`,
                  borderBottomRightRadius: '6px',
                  transition: 'border-color 0.4s ease',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}

          <div className="flex flex-col items-center text-center relative z-10">
            {/* Icon */}
            <div
              className={`flex items-center justify-center transition-all duration-500 ${
                dragOverZone ? 'animate-icon-float' : loading ? 'animate-subtle-pulse' : ''
              }`}
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '20px',
                marginBottom: '24px',
                background: isActive
                  ? 'var(--gradient-accent)'
                  : isHovered
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(6, 182, 212, 0.08))'
                    : 'var(--gradient-subtle)',
                border: isActive
                  ? 'none'
                  : `1px solid ${isHovered ? 'rgba(99, 102, 241, 0.15)' : 'var(--border-solid)'}`,
                boxShadow: isActive
                  ? '0 6px 24px rgba(99, 102, 241, 0.25), 0 0 0 4px rgba(99, 102, 241, 0.08)'
                  : isHovered
                    ? '0 4px 16px rgba(99, 102, 241, 0.08)'
                    : 'none',
                transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {loading || dropped ? (
                <FileText className="w-7 h-7" style={{ color: 'var(--accent)' }} />
              ) : (
                <ArrowUpRight
                  className={`w-7 h-7 transition-all duration-300 ${
                    dragOverZone ? '' : 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
                  }`}
                  style={{ color: isActive ? 'white' : 'var(--text-primary)' }}
                />
              )}
            </div>

            {/* Text */}
            {loading ? (
              <div style={{ width: '100%', maxWidth: '280px' }}>
                <p
                  key={loadingPhase}
                  className="font-semibold"
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    marginBottom: '16px',
                    animation: 'uw-phase-in 400ms ease forwards',
                  }}
                >
                  {LOADING_MESSAGES[loadingPhase]}
                </p>
                {/* Progress track */}
                <div
                  style={{
                    position: 'relative',
                    height: '3px',
                    borderRadius: '2px',
                    background: 'var(--bg-deep)',
                    overflow: 'hidden',
                  }}
                  role="progressbar"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <div
                    style={{
                      height: '100%',
                      width: '100%',
                      borderRadius: '2px',
                      background: 'linear-gradient(90deg, #6366F1 0%, #06B6D4 25%, #10B981 50%, #06B6D4 75%, #6366F1 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'uw-progress-flow 2s linear infinite',
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <p
                  className="font-bold"
                  style={{
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                    letterSpacing: '-0.02em',
                    fontWeight: 700,
                  }}
                >
                  {dragOverZone ? 'Release to open' : 'Drop your PDF here'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '10px' }}>
                  or{' '}
                  <span
                    className="transition-colors duration-200"
                    style={{
                      color: 'var(--accent)',
                      textDecoration: 'underline',
                      textDecorationStyle: 'dotted',
                      textUnderlineOffset: '4px',
                      textDecorationColor: 'rgba(99, 102, 241, 0.4)',
                    }}
                  >
                    click to browse
                  </span>
                </p>
              </>
            )}

            {/* Footer info */}
            {!loading && (
              <div
                className="w-full flex items-center justify-center"
                style={{
                  marginTop: '32px',
                  paddingTop: '20px',
                  borderTop: '1px solid var(--border-solid)',
                  gap: '24px',
                }}
              >
                <div className="flex items-center" style={{ gap: '6px' }}>
                  <LockIcon className="w-3 h-3" style={{ color: 'var(--text-ghost)' }} />
                  <span
                    className="font-medium uppercase"
                    style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.06em' }}
                  >
                    Private
                  </span>
                </div>
                <div style={{ width: '1px', height: '12px', background: 'var(--border-solid)' }} />
                <div className="flex items-center" style={{ gap: '6px' }}>
                  <Shield className="w-3 h-3" style={{ color: 'var(--text-ghost)' }} />
                  <span
                    className="font-medium uppercase"
                    style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.06em' }}
                  >
                    Local only
                  </span>
                </div>
                <div style={{ width: '1px', height: '12px', background: 'var(--border-solid)' }} />
                <span className="font-medium" style={{ color: 'var(--text-ghost)', fontSize: '11px' }}>
                  .pdf up to 100MB
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleInputChange}
        aria-label="Choose a PDF file to edit"
      />
    </>
  )
}
