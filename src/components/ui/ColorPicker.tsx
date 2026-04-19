import { useEffect, useState } from 'react'
import type { Color } from '../../types/document'

interface ColorPickerProps {
  value: Color
  onChange: (color: Color) => void
}

const PRESET_COLORS: Array<{ color: Color; label: string }> = [
  { color: { r: 34, g: 28, b: 21 }, label: 'Ink' },
  { color: { r: 116, g: 104, b: 81 }, label: 'Muted' },
  { color: { r: 47, g: 90, b: 63 }, label: 'Forest' },
  { color: { r: 184, g: 92, b: 58 }, label: 'Terracotta' },
  { color: { r: 198, g: 149, b: 69 }, label: 'Mustard' },
  { color: { r: 107, g: 66, b: 102 }, label: 'Plum' },
  { color: { r: 17, g: 17, b: 17 }, label: 'Black' },
  { color: { r: 68, g: 74, b: 84 }, label: 'Slate' },
  { color: { r: 214, g: 51, b: 31 }, label: 'Red' },
]

function colorToHex(c: Color): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`
}

function hexToColor(hex: string): Color {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function colorsEqual(a: Color, b: Color): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [customHex, setCustomHex] = useState(colorToHex(value))

  // Keep the hex input in sync with the incoming value — otherwise picking a
  // swatch from an outside source (or entering edit mode on a block with a
  // different colour) leaves the text field showing a stale hex code.
  useEffect(() => {
    setCustomHex(colorToHex(value))
  }, [value])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 6 }}>
        {PRESET_COLORS.map(({ color, label }) => {
          const selected = colorsEqual(value, color)
          return (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={selected}
              // preventDefault on mousedown keeps the hidden editing textarea
              // focused — otherwise clicking a swatch transfers focus to the
              // button, any subsequent key-press goes nowhere, and some
              // browsers swallow the first click's focus transfer (producing
              // the "two clicks to change colour" symptom).
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange(color)}
              style={{
                width: '100%',
                aspectRatio: '1',
                backgroundColor: colorToHex(color),
                border: '1px solid var(--p-line)',
                borderRadius: 2,
                padding: 0,
                // Stable 1px border + outer ring via box-shadow so selected
                // swatches don't jitter adjacent cells, and the ring is
                // visible against dark swatches like Ink or Black.
                boxShadow: selected
                  ? '0 0 0 2px var(--p-paper), 0 0 0 4px var(--p-accent)'
                  : 'none',
                cursor: 'pointer',
                transition: 'box-shadow 120ms ease, transform 120ms ease',
              }}
            />
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="color"
          value={customHex}
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => {
            setCustomHex(e.target.value)
            onChange(hexToColor(e.target.value))
          }}
          style={{
            width: 30,
            height: 30,
            border: '1px solid var(--p-line)',
            cursor: 'pointer',
            padding: 0,
            background: '#fff',
          }}
        />
        <input
          type="text"
          value={customHex}
          onChange={(e) => {
            setCustomHex(e.target.value)
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
              onChange(hexToColor(e.target.value))
            }
          }}
          className="paper-input"
          style={{
            flex: 1,
            fontSize: 12,
            fontFamily: 'var(--pdfine-mono)',
          }}
          placeholder="#221C15"
        />
      </div>
    </div>
  )
}
