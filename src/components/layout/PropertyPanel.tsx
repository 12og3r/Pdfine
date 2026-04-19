import {
  Bold,
  Italic,
  AlertTriangle,
  Minus,
  Plus,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useUIStore } from '../../store/uiStore'
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
  const currentBlockBounds = useUIStore((s) => s.currentBlockBounds)
  const overflowWarnings = useUIStore((s) => s.overflowWarnings)

  if (!selectedBlockId || !currentTextStyle) {
    return (
      <aside
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 300,
          background: 'var(--p-paper)',
          borderLeft: '1px solid var(--p-line)',
        }}
      >
        <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 240 }}>
          <div
            className="paper-eyebrow"
            style={{ marginBottom: 16 }}
          >
            Properties
          </div>
          <p
            style={{
              fontFamily: 'var(--p-serif)',
              fontSize: 22,
              letterSpacing: '-0.015em',
              lineHeight: 1.2,
              color: 'var(--p-ink)',
              margin: 0,
            }}
          >
            Select a{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--p-accent)' }}>text block</span> on the
            page to edit.
          </p>
          <p
            style={{
              marginTop: 14,
              fontSize: 13,
              color: 'var(--p-ink-3)',
              lineHeight: 1.5,
            }}
          >
            Double-click any paragraph in the document. Its style shows up here.
          </p>
        </div>
      </aside>
    )
  }

  const hasOverflow = overflowWarnings.includes(selectedBlockId)

  // Wrap every style mutation so the hidden editing textarea reclaims focus
  // after the panel interaction that triggered it (color swatch click, font
  // dropdown select, native color picker commit, etc.) — otherwise focus
  // remains on the panel widget and subsequent keystrokes don't reach the
  // editor, leaving the user "unable to keep typing".
  const applyAndRefocus = (style: Partial<import('../../types/document').TextStyle>) => {
    editorCore.applyTextStyle(style)
    useUIStore.getState().requestEditFocus()
  }

  const toggleBold = () => {
    applyAndRefocus({
      fontWeight: currentTextStyle.fontWeight >= 700 ? 400 : 700,
    })
  }

  const toggleItalic = () => {
    applyAndRefocus({
      fontStyle: currentTextStyle.fontStyle === 'italic' ? 'normal' : 'italic',
    })
  }

  const handleFontSizeChange = (value: string) => {
    const size = parseFloat(value)
    if (!isNaN(size) && size > 0 && size <= 200) {
      applyAndRefocus({ fontSize: size })
    }
  }

  const stepFontSize = (delta: number) => {
    const next = Math.min(200, Math.max(1, currentTextStyle.fontSize + delta))
    applyAndRefocus({ fontSize: next })
  }

  const handleColorChange = (color: Color) => {
    applyAndRefocus({ color })
  }

  return (
    <aside
      className="shrink-0 overflow-y-auto"
      style={{
        width: 300,
        background: 'var(--p-paper)',
        borderLeft: '1px solid var(--p-line)',
      }}
    >
      <div style={{ padding: '22px 20px 32px' }}>
        <div className="paper-eyebrow">Properties · §2 Compensation</div>

        {hasOverflow && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              border: '1px solid var(--p-warm)',
              background: 'color-mix(in srgb, var(--p-warm) 10%, transparent)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: 'var(--p-warm)',
                fontWeight: 600,
              }}
            >
              <AlertTriangle size={14} /> Content overflow
            </div>
            <p
              style={{
                margin: '6px 0 10px',
                fontSize: 12,
                color: 'var(--p-ink-2)',
                lineHeight: 1.5,
              }}
            >
              Text exceeds the original block bounds. We auto-shrunk line height; consider
              splitting.
            </p>
          </div>
        )}

        <InspectorRow label="Font">
          <FontSelector
            value={currentTextStyle.fontId}
            onChange={(fontId) => applyAndRefocus({ fontId })}
            editorCore={editorCore}
          />
        </InspectorRow>

        <InspectorRow label="Size">
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="paper-input"
              style={{ width: 80, fontFamily: 'var(--pdfine-mono)' }}
              type="number"
              value={Math.round(currentTextStyle.fontSize * 10) / 10}
              onChange={(e) => handleFontSizeChange(e.target.value)}
              min={1}
              max={200}
              step={0.5}
            />
            <div style={{ display: 'flex', border: '1px solid var(--p-line)' }}>
              <button
                style={iconBtnStyle}
                onClick={() => stepFontSize(-0.5)}
                aria-label="Decrease size"
              >
                <Minus size={13} />
              </button>
              <button
                style={{ ...iconBtnStyle, borderLeft: '1px solid var(--p-line)' }}
                onClick={() => stepFontSize(0.5)}
                aria-label="Increase size"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </InspectorRow>

        <InspectorRow label="Style">
          <div style={{ display: 'flex', gap: 4 }}>
            <ToggleButton active={currentTextStyle.fontWeight >= 700} onClick={toggleBold} label="Bold">
              <Bold size={14} />
            </ToggleButton>
            <ToggleButton
              active={currentTextStyle.fontStyle === 'italic'}
              onClick={toggleItalic}
              label="Italic"
            >
              <Italic size={14} />
            </ToggleButton>
          </div>
        </InspectorRow>

        <InspectorRow label="Color">
          <ColorPicker value={currentTextStyle.color} onChange={handleColorChange} />
        </InspectorRow>

        <div style={{ marginTop: 26 }} className="paper-eyebrow">
          Block bounds
        </div>
        <div
          style={{
            marginTop: 10,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            fontFamily: 'var(--pdfine-mono)',
            fontSize: 12,
            color: 'var(--p-ink-2)',
          }}
        >
          <div>x {fmtBounds(currentBlockBounds?.x)}</div>
          <div>y {fmtBounds(currentBlockBounds?.y)}</div>
          <div>w {fmtBounds(currentBlockBounds?.width)}</div>
          <div>h {fmtBounds(currentBlockBounds?.height)}</div>
        </div>
      </div>
    </aside>
  )
}

function fmtBounds(v: number | undefined): string {
  if (v === undefined || v === null) return '—'
  return (Math.round(v * 10) / 10).toString()
}

const iconBtnStyle: CSSProperties = {
  width: 30,
  height: '100%',
  padding: '0 10px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--p-ink-2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

function InspectorRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          fontSize: 11,
          color: 'var(--p-ink-3)',
          marginBottom: 6,
          fontFamily: 'var(--pdfine-mono)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function ToggleButton({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  label?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      // Keep focus on the editing textarea so the user can keep typing
      // after toggling a style.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        padding: '7px 0',
        border: active ? '1px solid var(--p-accent)' : '1px solid var(--p-line)',
        background: active ? 'var(--p-accent-2)' : 'transparent',
        color: active ? 'var(--p-accent)' : 'var(--p-ink)',
        fontSize: 11,
        fontFamily: 'var(--pdfine-mono)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 34,
        boxShadow: active ? 'inset 0 0 0 1px var(--p-accent)' : 'none',
        transition: 'background 150ms, color 150ms, border-color 150ms',
      }}
    >
      {children}
    </button>
  )
}
