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
    <div ref={ref} className="relative">
      <button
        className="w-full flex items-center justify-between px-3 py-1.5 text-sm border border-[var(--color-gray-200)] rounded-lg hover:border-[var(--color-gray-300)] bg-white cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">{selectedFont?.name ?? 'Select font'}</span>
        <ChevronDown className="w-4 h-4 text-[var(--color-gray-400)] shrink-0 ml-1" />
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-[var(--color-gray-200)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {fonts.map((font) => (
            <button
              key={font.id}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-gray-50)] cursor-pointer ${
                font.id === value ? 'bg-[var(--color-primary-50)] text-[var(--color-primary)]' : 'text-[var(--color-gray-700)]'
              }`}
              onClick={() => {
                onChange(font.id)
                setOpen(false)
              }}
            >
              {font.name}
              {!font.editable && (
                <span className="ml-1 text-xs text-[var(--color-gray-400)]">(read-only)</span>
              )}
            </button>
          ))}
          {fonts.length === 0 && (
            <div className="px-3 py-2 text-sm text-[var(--color-gray-400)]">No fonts available</div>
          )}
        </div>
      )}
    </div>
  )
}
