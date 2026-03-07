import { useState } from 'react'
import type { Color } from '../../types/document'

interface ColorPickerProps {
  value: Color
  onChange: (color: Color) => void
}

const PRESET_COLORS: Array<{ color: Color; label: string }> = [
  { color: { r: 0, g: 0, b: 0 }, label: 'Black' },
  { color: { r: 75, g: 85, b: 99 }, label: 'Dark Gray' },
  { color: { r: 239, g: 68, b: 68 }, label: 'Red' },
  { color: { r: 245, g: 158, b: 11 }, label: 'Orange' },
  { color: { r: 234, g: 179, b: 8 }, label: 'Yellow' },
  { color: { r: 34, g: 197, b: 94 }, label: 'Green' },
  { color: { r: 59, g: 130, b: 246 }, label: 'Blue' },
  { color: { r: 99, g: 102, b: 241 }, label: 'Indigo' },
  { color: { r: 168, g: 85, b: 247 }, label: 'Purple' },
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
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-1.5">
        {PRESET_COLORS.map(({ color, label }) => (
          <button
            key={label}
            title={label}
            className={`w-7 h-7 rounded-md border-2 cursor-pointer transition-transform hover:scale-110 ${
              colorsEqual(value, color) ? 'border-[var(--color-primary)] scale-110' : 'border-[var(--color-gray-200)]'
            }`}
            style={{ backgroundColor: colorToHex(color) }}
            onClick={() => {
              onChange(color)
              setCustomHex(colorToHex(color))
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={customHex}
          onChange={(e) => {
            setCustomHex(e.target.value)
            onChange(hexToColor(e.target.value))
          }}
          className="w-7 h-7 rounded cursor-pointer border-0 p-0"
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
          className="flex-1 text-xs px-2 py-1 border border-[var(--color-gray-200)] rounded-md font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}
