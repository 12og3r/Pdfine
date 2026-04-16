import { useState } from 'react'
import type { Color } from '../../types/document'

interface ColorPickerProps {
  value: Color
  onChange: (color: Color) => void
}

const PRESET_COLORS: Array<{ color: Color; label: string }> = [
  { color: { r: 43, g: 43, b: 84 }, label: 'Ink' },
  { color: { r: 140, g: 75, b: 29 }, label: 'Brick Dark' },
  { color: { r: 214, g: 51, b: 31 }, label: 'Red' },
  { color: { r: 209, g: 127, b: 68 }, label: 'Brick' },
  { color: { r: 255, g: 224, b: 69 }, label: 'Coin' },
  { color: { r: 126, g: 200, b: 80 }, label: 'Grass' },
  { color: { r: 80, g: 161, b: 71 }, label: 'Pipe' },
  { color: { r: 95, g: 205, b: 228 }, label: 'Sky' },
  { color: { r: 58, g: 123, b: 213 }, label: 'Deep Sky' },
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '6px',
        }}
      >
        {PRESET_COLORS.map(({ color, label }) => {
          const selected = colorsEqual(value, color)
          return (
            <button
              key={label}
              title={label}
              style={{
                width: '100%',
                aspectRatio: '1',
                backgroundColor: colorToHex(color),
                border: '3px solid var(--ink-black)',
                boxShadow: selected
                  ? 'inset 0 0 0 2px var(--ink-coin), 2px 2px 0 0 var(--ink-black)'
                  : '2px 2px 0 0 var(--ink-black)',
                cursor: 'pointer',
                transform: selected ? 'translate(-1px, -1px)' : 'translate(0, 0)',
                transition: 'all 80ms steps(2)',
              }}
              onClick={() => {
                onChange(color)
                setCustomHex(colorToHex(color))
              }}
            />
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="color"
          value={customHex}
          onChange={(e) => {
            setCustomHex(e.target.value)
            onChange(hexToColor(e.target.value))
          }}
          style={{
            width: '30px',
            height: '30px',
            border: '3px solid var(--ink-black)',
            cursor: 'pointer',
            padding: 0,
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
          style={{
            flex: 1,
            fontSize: '10px',
            padding: '6px 8px',
            border: '3px solid var(--ink-black)',
            fontFamily: 'var(--font-display)',
            background: 'var(--ink-cloud)',
            color: 'var(--ink-black)',
          }}
          placeholder="#2B2B54"
        />
      </div>
    </div>
  )
}
