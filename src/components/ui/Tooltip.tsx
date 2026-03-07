import { useState, type ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap pointer-events-none z-50"
          style={{
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 500,
            borderRadius: '8px',
            background: 'var(--chrome)',
            color: 'var(--chrome-text)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--chrome-border)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {content}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
            style={{ borderTopColor: 'var(--chrome)' }}
          />
        </div>
      )}
    </div>
  )
}
