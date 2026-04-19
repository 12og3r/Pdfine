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
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          fontFamily: 'var(--p-sans)',
          fontSize: 13,
          color: 'var(--p-ink)',
          background: '#fff',
          border: '1px solid var(--p-line)',
          cursor: 'pointer',
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
          {selectedFont?.name ?? 'Select font'}
          {selectedFont && !selectedFont.editable && (
            <span
              style={{
                marginLeft: 6,
                fontFamily: 'var(--pdfine-mono)',
                fontSize: 10,
                color: 'var(--p-warm)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              · read-only
            </span>
          )}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--p-ink-3)', flexShrink: 0, marginLeft: 6 }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--p-paper)',
            border: '1px solid var(--p-ink)',
            boxShadow: '0 12px 30px -10px rgba(0,0,0,0.25)',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {fonts.map((font) => {
            const selected = font.id === value
            return (
              <button
                key={font.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  fontFamily: 'var(--p-sans)',
                  fontSize: 13,
                  color: selected ? 'var(--p-accent)' : 'var(--p-ink-2)',
                  background: selected ? 'var(--p-accent-2)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px dashed var(--p-line)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = 'var(--p-bg-2)'
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = 'transparent'
                }}
                onClick={() => {
                  onChange(font.id)
                  setOpen(false)
                }}
              >
                {font.name}
                {!font.editable && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontFamily: 'var(--pdfine-mono)',
                      fontSize: 10,
                      color: 'var(--p-warm)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    (r/o)
                  </span>
                )}
              </button>
            )
          })}
          {fonts.length === 0 && (
            <div style={{ padding: 12, fontSize: 13, color: 'var(--p-ink-3)' }}>
              No fonts available
            </div>
          )}
        </div>
      )}
    </div>
  )
}
