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
      style={{ background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div
        className="w-full max-w-md mx-4 p-6 rounded-2xl animate-scale-up"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-solid)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <h2
          className="text-lg font-bold mb-4 tracking-[-0.02em]"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
