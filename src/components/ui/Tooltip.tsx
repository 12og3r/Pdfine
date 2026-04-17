import { useState, useRef, useLayoutEffect, type ReactNode, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

type Side = 'top' | 'bottom'
type Align = 'start' | 'center' | 'end'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: Side
  align?: Align
}

const GAP = 10

export function Tooltip({ content, children, side = 'top', align = 'center' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!visible) return
    const trigger = triggerRef.current
    const bubble = bubbleRef.current
    if (!trigger || !bubble) return
    const t = trigger.getBoundingClientRect()
    const b = bubble.getBoundingClientRect()
    const top = side === 'top' ? t.top - b.height - GAP : t.bottom + GAP
    let left: number
    if (align === 'center') left = t.left + t.width / 2 - b.width / 2
    else if (align === 'start') left = t.left
    else left = t.right - b.width
    // Clamp to viewport with a small margin so corner triggers stay on-screen.
    const margin = 4
    const clampedLeft = Math.max(margin, Math.min(left, window.innerWidth - b.width - margin))
    setPos({ top, left: clampedLeft })
  }, [visible, side, align, content])

  const arrowStyle: CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeft: '5px solid transparent',
    borderRight: '5px solid transparent',
    ...(side === 'top'
      ? { top: '100%', borderTop: '5px solid var(--ink-black)' }
      : { bottom: '100%', borderBottom: '5px solid var(--ink-black)' }),
  }
  // Arrow horizontal position tracks the trigger center, not the bubble, so
  // corner alignments still point at the right element.
  const triggerRect = triggerRef.current?.getBoundingClientRect()
  const arrowLeftPx =
    pos && triggerRect
      ? triggerRect.left + triggerRect.width / 2 - pos.left - 5
      : null
  if (arrowLeftPx != null) arrowStyle.left = `${arrowLeftPx}px`

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible &&
        createPortal(
          <div
            ref={bubbleRef}
            className="whitespace-nowrap pointer-events-none"
            style={{
              position: 'fixed',
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              zIndex: 9999,
              padding: '6px 10px',
              fontSize: '9px',
              background: 'var(--ink-black)',
              color: 'var(--ink-coin)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.05em',
              border: '2px solid var(--ink-black)',
              boxShadow: '2px 2px 0 0 var(--ink-brick-dark)',
              visibility: pos ? 'visible' : 'hidden',
            }}
          >
            {content.toUpperCase()}
            <div style={arrowStyle} />
          </div>,
          document.body,
        )}
    </div>
  )
}
