import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'

interface UploadWidgetProps {
  editorCore: IEditorCore
  onDrop?: () => void
  onLoadStart?: () => void
  onLoadComplete?: () => void
  onError?: (error: string) => void
  errorMessage?: string | null
}

type LoadingPhase = 'parsing' | 'extracting' | 'preparing'

const LOADING_MESSAGES: Record<LoadingPhase, string> = {
  parsing: 'Parsing document structure…',
  extracting: 'Extracting fonts & glyphs…',
  preparing: 'Building editable blocks…',
}

const ERROR_MESSAGES: Record<string, string> = {
  type: "That's not a PDF. Drop a .pdf file to continue.",
  corrupted: 'This file appears damaged and could not be parsed.',
  unknown: 'Something went wrong. Try a different file.',
}

export function UploadWidget({
  editorCore,
  onDrop,
  onLoadStart,
  onLoadComplete,
  onError,
  errorMessage,
}: UploadWidgetProps) {
  const [dragOver, setDragOver] = useState(false)
  const [hover, setHover] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('parsing')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const setShowPasswordModal = useUIStore((s) => s.setShowPasswordModal)
  const setPendingPdfData = useUIStore((s) => s.setPendingPdfData)
  const setFileName = useUIStore((s) => s.setFileName)

  useEffect(() => {
    return () => {
      loadingTimersRef.current.forEach(clearTimeout)
    }
  }, [])

  const startLoadingPhases = useCallback(() => {
    setLoadingPhase('parsing')
    loadingTimersRef.current.forEach(clearTimeout)
    const t1 = setTimeout(() => setLoadingPhase('extracting'), 1600)
    const t2 = setTimeout(() => setLoadingPhase('preparing'), 3400)
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
        onError?.(ERROR_MESSAGES.type)
        return
      }
      onDrop?.()
      setLoading(true)
      onLoadStart?.()
      startLoadingPhases()
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
        } else {
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
    ]
  )

  const handleZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])
  const handleZoneDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])
  const handleZoneDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )
  const openPicker = useCallback(() => {
    if (loading) return
    fileInputRef.current?.click()
  }, [loading])
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile]
  )

  const active = dragOver

  return (
    <div style={{ width: 'min(720px, 90vw)' }}>
      <label
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onDragOver={handleZoneDragOver}
        onDragLeave={handleZoneDragLeave}
        onDrop={handleZoneDrop}
        style={{
          display: 'block',
          width: '100%',
          padding: 40,
          background: 'var(--p-paper)',
          border: active ? '1px solid var(--p-accent)' : '1px solid var(--p-line)',
          borderRadius: 2,
          boxShadow: hover || active
            ? '0 2px 0 var(--p-ink-4), 0 30px 60px -20px rgba(26,23,21,0.2), 0 0 0 6px rgba(47,90,63,0.08)'
            : '0 1px 0 var(--p-ink-4), 0 20px 40px -20px rgba(26,23,21,0.15)',
          transition: 'all 0.3s cubic-bezier(.2,.8,.2,1)',
          cursor: loading ? 'progress' : 'pointer',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            fontFamily: 'var(--pdfine-mono)',
            fontSize: 10,
            color: 'var(--p-ink-4)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          01 / {loading ? 'Reading locally' : 'Drop to begin'}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            fontFamily: 'var(--pdfine-mono)',
            fontSize: 10,
            color: 'var(--p-ink-4)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          ↓ .pdf
        </div>

        <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginTop: 16 }}>
          <div style={{ flexShrink: 0, width: 120, height: 150, position: 'relative' }} aria-hidden>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--p-bg-2)',
                border: '1px solid var(--p-line)',
                transform: 'rotate(-6deg) translate(-4px, 6px)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--p-bg)',
                border: '1px solid var(--p-line)',
                transform: 'rotate(-2deg)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#fff',
                border: '1px solid var(--p-ink-3)',
                padding: 10,
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 100 125">
                <DocSheetLines />
                <path d="M80 5v15h15" fill="none" stroke="rgba(26,23,21,0.4)" strokeWidth="0.6" />
              </svg>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            {loading ? (
              <LoadingPhaseView phase={loadingPhase} />
            ) : (
              <>
                <div
                  style={{
                    fontFamily: 'var(--p-serif)',
                    fontSize: 32,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                    color: 'var(--p-ink)',
                  }}
                >
                  {active ? (
                    <>
                      Release to <span style={{ fontStyle: 'italic', color: 'var(--p-accent)' }}>begin</span>.
                    </>
                  ) : (
                    <>
                      Drop a PDF
                      <span style={{ fontStyle: 'italic', color: 'var(--p-ink-3)' }}> here</span>.
                    </>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--p-ink-3)',
                    marginTop: 10,
                    lineHeight: 1.5,
                  }}
                >
                  Or click to browse. Encrypted files, scanned pages, and mixed-font
                  documents up to 50&nbsp;pages.
                </p>
                <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="paper-btn"
                    onClick={(e) => {
                      e.preventDefault()
                      openPicker()
                    }}
                  >
                    Choose a file
                    <Upload size={15} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
      </label>

      {errorMessage && (
        <div
          role="alert"
          style={{
            marginTop: 16,
            padding: '10px 14px',
            background: 'color-mix(in srgb, var(--p-warm) 14%, transparent)',
            border: '1px solid var(--p-warm)',
            color: 'var(--p-warm)',
            fontFamily: 'var(--pdfine-mono)',
            fontSize: 12,
            letterSpacing: '0.06em',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Proof line beneath the upload widget */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 28,
          marginTop: 24,
          fontSize: 12,
          color: 'var(--p-ink-3)',
          fontFamily: 'var(--pdfine-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          flexWrap: 'wrap',
        }}
      >
        <span>
          <span style={{ color: 'var(--p-accent)' }}>●</span> 0 network requests
        </span>
        <span>
          <span style={{ color: 'var(--p-warm)' }}>●</span> 0 accounts
        </span>
        <span>
          <span style={{ color: 'var(--p-gold)' }}>●</span> 0 bytes logged
        </span>
      </div>
    </div>
  )
}

function LoadingPhaseView({ phase }: { phase: LoadingPhase }) {
  const stepPercents: Record<LoadingPhase, number> = {
    parsing: 33,
    extracting: 70,
    preparing: 100,
  }
  const pct = stepPercents[phase]
  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          fontFamily: 'var(--pdfine-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--p-ink-3)',
          marginBottom: 10,
        }}
      >
        Processing locally
      </div>
      <div
        style={{
          fontFamily: 'var(--p-serif)',
          fontSize: 26,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          color: 'var(--p-ink)',
        }}
      >
        {LOADING_MESSAGES[phase]}
      </div>
      <div
        style={{
          marginTop: 18,
          height: 4,
          background: 'var(--p-line-soft)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--p-accent)',
            transition: 'width 400ms cubic-bezier(.2,.8,.2,1)',
          }}
        />
      </div>
    </div>
  )
}

function DocSheetLines() {
  const lines: React.ReactElement[] = []
  const count = 9
  const padX = 10
  const padY = 14
  const lineGap = 10
  const width = 100
  for (let i = 0; i < count; i++) {
    const w =
      i % 5 === 0 ? width - padX * 2 - 40 : i % 3 === 0 ? width - padX * 2 - 16 : width - padX * 2
    lines.push(
      <rect
        key={i}
        x={padX}
        y={padY + i * lineGap}
        width={w}
        height="2"
        fill="rgba(26,23,21,0.15)"
        rx="1"
      />
    )
  }
  return <>{lines}</>
}
