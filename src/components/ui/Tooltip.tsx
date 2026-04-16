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
          className="absolute bottom-full left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-50"
          style={{
            marginBottom: '10px',
            padding: '6px 10px',
            fontSize: '9px',
            background: 'var(--ink-black)',
            color: 'var(--ink-coin)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.05em',
            border: '2px solid var(--ink-black)',
            boxShadow: '2px 2px 0 0 var(--ink-brick-dark)',
          }}
        >
          {content.toUpperCase()}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid var(--ink-black)',
            }}
          />
        </div>
      )}
    </div>
  )
}
