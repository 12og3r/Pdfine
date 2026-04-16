import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{
        background: 'rgba(43, 43, 84, 0.55)',
      }}
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div
        className="w-full max-w-md mx-4 animate-scale-up"
        style={{
          background: 'var(--ink-paper)',
          border: '4px solid var(--ink-black)',
          boxShadow: '8px 8px 0 0 var(--ink-black)',
          padding: '24px 26px',
        }}
      >
        {/* Title bar — coin banner */}
        <div
          style={{
            background: 'var(--ink-coin)',
            border: '3px solid var(--ink-black)',
            boxShadow: 'inset -3px -3px 0 0 var(--ink-coin-dark), inset 3px 3px 0 0 #FFF07A',
            padding: '10px 14px',
            marginBottom: '20px',
          }}
        >
          <h2
            style={{
              color: 'var(--ink-black)',
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              letterSpacing: '0.05em',
              textShadow: '1px 1px 0 rgba(255, 255, 255, 0.35)',
            }}
          >
            {title.toUpperCase()}
          </h2>
        </div>
        {children}
      </div>
    </div>
  )
}
