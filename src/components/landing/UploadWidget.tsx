import { useCallback, useEffect, useRef, useState } from 'react'
import { useUIStore } from '../../store/uiStore'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'
import { Inky } from '../mascot'
import { useSfx } from '../../hooks/useSfx'

interface UploadWidgetProps {
  editorCore: IEditorCore
  onDrop?: () => void
  onLoadStart?: () => void
  onLoadComplete?: () => void
  onError?: (error: string) => void
}

type LoadingPhase = 'parsing' | 'extracting' | 'preparing'

const LOADING_MESSAGES: Record<LoadingPhase, string> = {
  parsing: 'PARSING LEVEL...',
  extracting: 'EXTRACTING GLYPHS...',
  preparing: 'POWER-UP READY!',
}

const ERROR_MESSAGES: Record<string, string> = {
  type: "That's not a PDF! Drop a .pdf file to continue.",
  corrupted: "This file is damaged — Inky can't read it.",
  unknown: 'Something went wrong. Try a different file.',
}

export function UploadWidget({
  editorCore,
  onDrop,
  onLoadStart,
  onLoadComplete,
  onError,
}: UploadWidgetProps) {
  const [dragOverZone, setDragOverZone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('parsing')
  const [dropped, setDropped] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const setShowPasswordModal = useUIStore((s) => s.setShowPasswordModal)
  const setPendingPdfData = useUIStore((s) => s.setPendingPdfData)
  const setFileName = useUIStore((s) => s.setFileName)
  const { play } = useSfx()

  useEffect(() => {
    return () => {
      loadingTimersRef.current.forEach(clearTimeout)
    }
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
    if (lower.includes('invalid') || lower.includes('corrupt') || lower.includes('damaged'))
      return ERROR_MESSAGES.corrupted
    return ERROR_MESSAGES.unknown
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        play('error')
        onError?.(ERROR_MESSAGES.type)
        return
      }
      play('jump')
      onDrop?.()
      setDropped(true)
      setTimeout(() => {
        setDropped(false)
        setLoading(true)
        onLoadStart?.()
        startLoadingPhases()
      }, 300)
      setFileName(file.name)
      try {
        const buffer = await file.arrayBuffer()
        await editorCore.loadPdf(buffer)
        play('coin')
        onLoadComplete?.()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        if (message.toLowerCase().includes('password')) {
          const buffer = await file.arrayBuffer()
          setPendingPdfData(buffer)
          setShowPasswordModal(true)
        } else {
          play('error')
          onError?.(getErrorMessage(message))
        }
      } finally {
        setLoading(false)
        loadingTimersRef.current.forEach(clearTimeout)
      }
    },
    [
      editorCore,
      setFileName,
      setPendingPdfData,
      setShowPasswordModal,
      startLoadingPhases,
      getErrorMessage,
      onDrop,
      onLoadStart,
      onLoadComplete,
      onError,
      play,
    ]
  )

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => setIsHovered(false), [])

  const handleZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverZone(true)
  }, [])
  const handleZoneDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverZone(false)
  }, [])
  const handleZoneDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOverZone(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )
  const handleClick = useCallback(() => {
    if (loading) return
    fileInputRef.current?.click()
  }, [loading])
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    },
    [handleClick]
  )
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile]
  )

  const isActive = dragOverZone || dropped

  return (
    <>
      <style>{`
        @keyframes block-bounce {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(-12px); }
          60% { transform: translateY(-4px); }
        }
        @keyframes question-wobble {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-2deg) translateY(-3px); }
          75% { transform: rotate(2deg) translateY(-3px); }
        }
        @keyframes phase-swap {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className={`group relative w-full cursor-pointer ${dropped ? 'animate-drop-bounce' : ''}`}
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
        {/* Main card — chunky paper tile */}
        <div
          style={{
            position: 'relative',
            background: isActive ? 'var(--ink-paper-dark)' : 'var(--ink-paper)',
            border: '4px solid var(--ink-black)',
            padding: '48px 32px 40px',
            transform: isHovered && !loading ? 'translate(-2px, -2px)' : 'translate(0, 0)',
            transition: 'transform 0.12s steps(3), background 0.12s steps(3), box-shadow 0.12s steps(3)',
            boxShadow: isActive
              ? '6px 6px 0 0 var(--ink-black), 0 0 0 3px var(--ink-coin)'
              : isHovered
                ? '6px 6px 0 0 var(--ink-black)'
                : '4px 4px 0 0 var(--ink-black)',
          }}
        >
          <div className="flex flex-col items-center text-center relative z-10">
            {/* Big ? Block */}
            <div
              aria-hidden
              style={{
                position: 'relative',
                width: '96px',
                height: '96px',
                background: 'var(--ink-coin)',
                border: '4px solid var(--ink-black)',
                boxShadow:
                  'inset -6px -6px 0 0 var(--ink-coin-dark), inset 6px 6px 0 0 #FFF07A, 4px 4px 0 0 var(--ink-brick-dark)',
                marginBottom: '28px',
                animation: isActive
                  ? 'block-bounce 0.6s steps(6) infinite'
                  : isHovered
                    ? 'question-wobble 0.8s steps(6) infinite'
                    : 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: '48px',
                  color: 'var(--ink-black)',
                  lineHeight: 1,
                  textShadow: '3px 3px 0 var(--ink-paper)',
                  userSelect: 'none',
                }}
              >
                ?
              </div>
            </div>

            {/* Text */}
            {loading ? (
              <div style={{ width: '100%', maxWidth: '320px' }}>
                <p
                  key={loadingPhase}
                  style={{
                    color: 'var(--ink-black)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '11px',
                    letterSpacing: '0.08em',
                    marginBottom: '18px',
                    animation: 'phase-swap 300ms steps(4) forwards',
                  }}
                >
                  {LOADING_MESSAGES[loadingPhase]}
                </p>
                <div
                  style={{
                    position: 'relative',
                    height: '14px',
                    background: 'var(--ink-paper-dark)',
                    border: '3px solid var(--ink-black)',
                    overflow: 'hidden',
                  }}
                  role="progressbar"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <div
                    className="progress-shimmer"
                    style={{
                      height: '100%',
                      width: '100%',
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <p
                  style={{
                    color: 'var(--ink-black)',
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
                    letterSpacing: '0.05em',
                    lineHeight: 1.3,
                  }}
                >
                  {dragOverZone ? 'RELEASE TO PLAY!' : 'DROP YOUR PDF'}
                </p>
                <p
                  style={{
                    color: 'var(--ink-brick-dark)',
                    fontFamily: 'var(--font-pixel-body)',
                    fontSize: '18px',
                    marginTop: '14px',
                  }}
                >
                  or{' '}
                  <span
                    style={{
                      color: 'var(--ink-brick)',
                      textDecoration: 'underline',
                      textDecorationStyle: 'solid',
                      textUnderlineOffset: '4px',
                    }}
                  >
                    press START to browse
                  </span>
                </p>
              </>
            )}

            {/* Footer pixel badges */}
            {!loading && (
              <div
                className="w-full flex items-center justify-center"
                style={{
                  marginTop: '32px',
                  paddingTop: '22px',
                  borderTop: '3px dashed var(--ink-black)',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '8px',
                    color: 'var(--ink-black)',
                    letterSpacing: '0.08em',
                    background: 'var(--ink-grass)',
                    border: '2px solid var(--ink-black)',
                    padding: '5px 9px',
                  }}
                >
                  PRIVATE
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '8px',
                    color: 'var(--ink-black)',
                    letterSpacing: '0.08em',
                    background: 'var(--ink-sky)',
                    border: '2px solid var(--ink-black)',
                    padding: '5px 9px',
                  }}
                >
                  LOCAL ONLY
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '8px',
                    color: 'var(--ink-paper)',
                    letterSpacing: '0.08em',
                    background: 'var(--ink-brick)',
                    border: '2px solid var(--ink-black)',
                    padding: '5px 9px',
                  }}
                >
                  .PDF ≤ 100MB
                </span>
              </div>
            )}
          </div>

          {/* Loading Inky walking */}
          {loading && (
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '12px',
                transform: 'translateY(6px)',
                animation: 'inkyWalk 0.3s steps(2) infinite',
              }}
            >
              <Inky action="walk" size={2} />
            </div>
          )}
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
