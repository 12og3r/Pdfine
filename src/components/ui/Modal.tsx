import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  eyebrow?: string
}

export function Modal({ open, onClose, title, children, eyebrow }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    // Lock page scroll while the modal is up so the backdrop really feels
    // like an overlay instead of a floating island over a scrollable page.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  // Render into <body> via a portal so the modal escapes any ancestor's
  // `overflow: hidden` / transform stacking context — without this, the
  // editor shell (which has `overflow: hidden` on its flex container) was
  // clipping the fixed-positioned backdrop and making the dialog look like
  // it was pushed into the page flow rather than floating on top.
  return createPortal(
    <div
      ref={backdropRef}
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(26, 23, 21, 0.45)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        animation: 'fadeIn 150ms ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--p-paper)',
          border: '1px solid var(--p-ink)',
          boxShadow: '0 30px 80px -30px rgba(0,0,0,0.55)',
          padding: 32,
          position: 'relative',
          fontFamily: 'var(--p-sans)',
          color: 'var(--p-ink)',
          animation: 'scaleUp 180ms cubic-bezier(.2,.8,.2,1)',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
        }}
      >
        <div className="paper-eyebrow" style={{ marginBottom: 6 }}>
          {eyebrow ?? 'Dialog'}
        </div>
        <h2
          style={{
            fontFamily: 'var(--p-serif)',
            fontSize: 28,
            margin: '0 0 18px',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            color: 'var(--p-ink)',
          }}
        >
          {title}
        </h2>
        {children}
      </div>
      <style>
        {`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
        `}
      </style>
    </div>,
    document.body,
  )
}
