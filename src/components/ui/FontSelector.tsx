import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'

interface FontSelectorProps {
  value: string
  onChange: (fontId: string) => void
  editorCore: IEditorCore
}

export function FontSelector({ value, onChange, editorCore }: FontSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fonts = editorCore.getFontManager().getAvailableFonts()
  const selectedFont = fonts.find((f) => f.id === value)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          fontFamily: 'var(--font-display)',
          fontSize: '10px',
          color: 'var(--ink-black)',
          background: 'var(--ink-cloud)',
          border: '3px solid var(--ink-black)',
          boxShadow: '2px 2px 0 0 var(--ink-black)',
          cursor: 'pointer',
          letterSpacing: '0.03em',
        }}
        onClick={() => setOpen(!open)}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {(selectedFont?.name ?? 'SELECT FONT').toUpperCase()}
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 ml-1"
          style={{ color: 'var(--ink-brick-dark)' }}
        />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--ink-paper)',
            border: '3px solid var(--ink-black)',
            boxShadow: '4px 4px 0 0 var(--ink-black)',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
          className="custom-scrollbar"
        >
          {fonts.map((font) => {
            const selected = font.id === value
            return (
              <button
                key={font.id}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  fontFamily: 'var(--font-display)',
                  fontSize: '10px',
                  color: selected ? 'var(--ink-black)' : 'var(--ink-brick-dark)',
                  background: selected ? 'var(--ink-coin)' : 'transparent',
                  border: 'none',
                  borderBottom: '2px solid var(--ink-black)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = 'var(--ink-paper-dark)'
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = 'transparent'
                }}
                onClick={() => {
                  onChange(font.id)
                  setOpen(false)
                }}
              >
                {font.name.toUpperCase()}
                {!font.editable && (
                  <span
                    style={{
                      marginLeft: '6px',
                      fontSize: '8px',
                      color: 'var(--ink-brick)',
                    }}
                  >
                    (R/O)
                  </span>
                )}
              </button>
            )
          })}
          {fonts.length === 0 && (
            <div
              style={{
                padding: '10px',
                fontFamily: 'var(--font-display)',
                fontSize: '9px',
                color: 'var(--ink-brick-dark)',
              }}
            >
              NO FONTS AVAILABLE
            </div>
          )}
        </div>
      )}
    </div>
  )
}
