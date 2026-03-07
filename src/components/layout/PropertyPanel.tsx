import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  AlertTriangle,
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { Button } from '../ui/Button'
import { ColorPicker } from '../ui/ColorPicker'
import { FontSelector } from '../ui/FontSelector'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'
import type { Color } from '../../types/document'

interface PropertyPanelProps {
  editorCore: IEditorCore
}

export function PropertyPanel({ editorCore }: PropertyPanelProps) {
  const selectedBlockId = useUIStore((s) => s.selectedBlockId)
  const currentTextStyle = useUIStore((s) => s.currentTextStyle)
  const overflowWarnings = useUIStore((s) => s.overflowWarnings)

  if (!selectedBlockId || !currentTextStyle) {
    return (
      <div
        className="w-[248px] shrink-0 flex items-center justify-center"
        style={{
          background: 'var(--chrome)',
          borderLeft: '1px solid var(--chrome-border)',
        }}
      >
        <p
          className="text-xs"
          style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)' }}
        >
          Select a text block
        </p>
      </div>
    )
  }

  const hasOverflow = overflowWarnings.includes(selectedBlockId)

  const toggleBold = () => {
    editorCore.applyTextStyle({
      fontWeight: currentTextStyle.fontWeight >= 700 ? 400 : 700,
    })
  }

  const toggleItalic = () => {
    editorCore.applyTextStyle({
      fontStyle: currentTextStyle.fontStyle === 'italic' ? 'normal' : 'italic',
    })
  }

  const handleFontSizeChange = (value: string) => {
    const size = parseFloat(value)
    if (!isNaN(size) && size > 0 && size <= 200) {
      editorCore.applyTextStyle({ fontSize: size })
    }
  }

  const handleColorChange = (color: Color) => {
    editorCore.applyTextStyle({ color })
  }

  return (
    <div
      className="w-[248px] shrink-0 overflow-y-auto custom-scrollbar-dark"
      style={{
        background: 'var(--chrome)',
        borderLeft: '1px solid var(--chrome-border)',
      }}
    >
      <div style={{ padding: '16px' }}>
        {/* Font */}
        <section style={{ marginBottom: '16px' }}>
          <SectionLabel>Font</SectionLabel>
          <FontSelector
            value={currentTextStyle.fontId}
            onChange={(fontId) => editorCore.applyTextStyle({ fontId })}
            editorCore={editorCore}
          />
        </section>

        {/* Size */}
        <section style={{ marginBottom: '16px' }}>
          <SectionLabel>Size</SectionLabel>
          <input
            type="number"
            value={Math.round(currentTextStyle.fontSize * 10) / 10}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-shadow"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--chrome-border)',
              color: 'var(--chrome-text)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
            }}
            min={1}
            max={200}
            step={0.5}
          />
        </section>

        {/* Style */}
        <section style={{ marginBottom: '16px' }}>
          <SectionLabel>Style</SectionLabel>
          <div className="flex" style={{ gap: '4px' }}>
            <DarkStyleButton active={currentTextStyle.fontWeight >= 700} onClick={toggleBold}>
              <Bold className="w-3.5 h-3.5" />
            </DarkStyleButton>
            <DarkStyleButton active={currentTextStyle.fontStyle === 'italic'} onClick={toggleItalic}>
              <Italic className="w-3.5 h-3.5" />
            </DarkStyleButton>
            <DarkStyleButton active={false} onClick={() => {}}>
              <Underline className="w-3.5 h-3.5" />
            </DarkStyleButton>
          </div>
        </section>

        {/* Color */}
        <section style={{ marginBottom: '16px' }}>
          <SectionLabel>Color</SectionLabel>
          <ColorPicker value={currentTextStyle.color} onChange={handleColorChange} />
        </section>

        {/* Alignment */}
        <section style={{ marginBottom: '16px' }}>
          <SectionLabel>Alignment</SectionLabel>
          <div className="flex" style={{ gap: '4px' }}>
            {([
              { align: 'left' as const, icon: AlignLeft },
              { align: 'center' as const, icon: AlignCenter },
              { align: 'right' as const, icon: AlignRight },
              { align: 'justify' as const, icon: AlignJustify },
            ]).map(({ align, icon: Icon }) => (
              <DarkStyleButton key={align} active={false} onClick={() => {}}>
                <Icon className="w-3.5 h-3.5" />
              </DarkStyleButton>
            ))}
          </div>
        </section>

        {/* Line Spacing */}
        <section style={{ marginBottom: '16px' }}>
          <SectionLabel>Line Spacing</SectionLabel>
          <input
            type="range"
            min={0.8}
            max={3}
            step={0.1}
            defaultValue={1.5}
            className="w-full h-1 rounded-full accent-[var(--accent)]"
            style={{ opacity: 0.7 }}
          />
        </section>

        {/* Overflow warning */}
        {hasOverflow && (
          <div
            className="rounded-lg flex items-start"
            style={{
              padding: '12px',
              background: 'var(--warning-soft)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              gap: '8px',
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <div className="flex-1">
              <p className="text-xs font-semibold" style={{ color: '#F59E0B' }}>Content overflows</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(245, 158, 11, 0.7)' }}>Text exceeds block boundary.</p>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => {}}>
                Reset
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-[10px] font-medium uppercase"
      style={{
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: '0.1em',
        marginBottom: '8px',
      }}
    >
      {children}
    </label>
  )
}

function DarkStyleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="p-2 rounded-md cursor-pointer transition-all duration-150"
      style={{
        background: active ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
        color: active ? 'white' : 'var(--chrome-text-muted)',
        border: '1px solid ' + (active ? 'transparent' : 'var(--chrome-border)'),
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--chrome-text)' } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--chrome-text-muted)' } }}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
