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
import type { CSSProperties } from 'react'
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
        className="w-[260px] shrink-0 flex items-center justify-center"
        style={{
          background: 'var(--ink-paper)',
          borderLeft: '4px solid var(--ink-black)',
        }}
      >
        <p
          style={{
            color: 'var(--ink-brick-dark)',
            fontFamily: 'var(--font-display)',
            fontSize: '9px',
            letterSpacing: '0.08em',
            textAlign: 'center',
            padding: '0 20px',
          }}
        >
          SELECT A<br />TEXT BLOCK
          <br />
          <br />
          ↖↙↘↗
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
      className="w-[260px] shrink-0 overflow-y-auto custom-scrollbar"
      style={{
        background: 'var(--ink-paper)',
        borderLeft: '4px solid var(--ink-black)',
      }}
    >
      <div style={{ padding: '18px 16px' }}>
        {/* Font */}
        <section style={{ marginBottom: '20px' }}>
          <SectionLabel>FONT</SectionLabel>
          <FontSelector
            value={currentTextStyle.fontId}
            onChange={(fontId) => editorCore.applyTextStyle({ fontId })}
            editorCore={editorCore}
          />
        </section>

        {/* Size */}
        <section style={{ marginBottom: '20px' }}>
          <SectionLabel>SIZE</SectionLabel>
          <input
            type="number"
            value={Math.round(currentTextStyle.fontSize * 10) / 10}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="w-full focus:outline-none"
            style={{
              background: 'var(--ink-cloud)',
              border: '3px solid var(--ink-black)',
              color: 'var(--ink-black)',
              fontFamily: 'var(--font-display)',
              fontSize: '11px',
              padding: '8px 10px',
            }}
            min={1}
            max={200}
            step={0.5}
          />
        </section>

        {/* Style */}
        <section style={{ marginBottom: '20px' }}>
          <SectionLabel>STYLE</SectionLabel>
          <div className="flex" style={{ gap: '6px' }}>
            <PixelStyleButton
              active={currentTextStyle.fontWeight >= 700}
              onClick={toggleBold}
              ariaLabel="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </PixelStyleButton>
            <PixelStyleButton
              active={currentTextStyle.fontStyle === 'italic'}
              onClick={toggleItalic}
              ariaLabel="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </PixelStyleButton>
            <PixelStyleButton active={false} onClick={() => {}} ariaLabel="Underline">
              <Underline className="w-3.5 h-3.5" />
            </PixelStyleButton>
          </div>
        </section>

        {/* Color */}
        <section style={{ marginBottom: '20px' }}>
          <SectionLabel>COLOR</SectionLabel>
          <ColorPicker value={currentTextStyle.color} onChange={handleColorChange} />
        </section>

        {/* Alignment */}
        <section style={{ marginBottom: '20px' }}>
          <SectionLabel>ALIGN</SectionLabel>
          <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
            {(
              [
                { align: 'left' as const, icon: AlignLeft },
                { align: 'center' as const, icon: AlignCenter },
                { align: 'right' as const, icon: AlignRight },
                { align: 'justify' as const, icon: AlignJustify },
              ]
            ).map(({ align, icon: Icon }) => (
              <PixelStyleButton
                key={align}
                active={false}
                onClick={() => {}}
                ariaLabel={align}
              >
                <Icon className="w-3.5 h-3.5" />
              </PixelStyleButton>
            ))}
          </div>
        </section>

        {/* Line Spacing */}
        <section style={{ marginBottom: '20px' }}>
          <SectionLabel>LINE SPACING</SectionLabel>
          <input
            type="range"
            min={0.8}
            max={3}
            step={0.1}
            defaultValue={1.5}
            className="w-full"
            style={{
              accentColor: 'var(--ink-coin)',
            }}
          />
        </section>

        {/* Overflow warning */}
        {hasOverflow && (
          <div
            style={{
              padding: '12px',
              background: 'var(--ink-danger)',
              border: '3px solid var(--ink-black)',
              boxShadow: '3px 3px 0 0 var(--ink-black)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginTop: '12px',
            }}
          >
            <AlertTriangle
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: 'var(--ink-paper)' }}
            />
            <div className="flex-1">
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '9px',
                  color: 'var(--ink-paper)',
                  letterSpacing: '0.05em',
                }}
              >
                OVERFLOW!
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-pixel-body)',
                  fontSize: '12px',
                  color: 'var(--ink-paper)',
                  marginTop: '4px',
                }}
              >
                Text exceeds block boundary.
              </p>
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
      style={{
        display: 'block',
        fontFamily: 'var(--font-display)',
        fontSize: '9px',
        color: 'var(--ink-brick-dark)',
        letterSpacing: '0.12em',
        marginBottom: '10px',
      }}
    >
      {children}
    </label>
  )
}

function PixelStyleButton({
  active,
  onClick,
  children,
  ariaLabel,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  ariaLabel?: string
}) {
  const baseStyle: CSSProperties = {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: active ? 'var(--ink-coin)' : 'var(--ink-cloud)',
    color: 'var(--ink-black)',
    border: '3px solid var(--ink-black)',
    cursor: 'pointer',
    boxShadow: active ? 'inset -3px -3px 0 0 var(--ink-coin-dark)' : '2px 2px 0 0 var(--ink-black)',
    transform: active ? 'translate(1px, 1px)' : 'translate(0, 0)',
    transition: 'all 100ms steps(2)',
  }

  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={active}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--ink-paper-dark)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--ink-cloud)'
        }
      }}
    >
      {children}
    </button>
  )
}
