# components/ui

## Purpose
Reusable, styled UI primitives used across the application. CSS variables + inline styles for all styling.

## Files

### Button.tsx
Multi-variant button component extending `ButtonHTMLAttributes`.
- Variants: `primary` (`var(--text-primary)` bg, white text), `secondary` (white bg, border-solid), `ghost`, `danger`
- Sizes: `sm`, `md` (default), `lg`
- All buttons use rounded-lg border radius and font-semibold
- Disabled state: opacity-40, pointer-events-none
- Active: scale-[0.98] press effect

### Modal.tsx
Overlay modal dialog with blurred backdrop.
- Props: `open`, `onClose`, `title`, `children`
- Escape key and backdrop click dismiss
- White card with `var(--border-solid)` border, rounded-2xl
- Entry animation: `animate-scale-up` for card, `animate-fade-in` for backdrop
- Backdrop uses `rgba(0,0,0,0.2)` with `backdrop-filter: blur(6px)`
- Title uses `var(--font-display)` (Outfit)

### Tooltip.tsx
Hover-activated tooltip positioned above trigger element.
- Dark chrome background with white text, chrome-colored downward arrow
- Inline style padding (5px 10px) to avoid Tailwind v4 reset issues
- 11px font size, 8px border-radius, chrome border
- Shadow-lg, z-50 stacking, pointer-events-none

### ColorPicker.tsx
Color selection with 9 preset colors and custom hex input.
- Color type: `{ r, g, b }` (0-255), NOT hex strings
- Helpers: `colorToHex()`, `hexToColor()`, `colorsEqual()`
- Native HTML color picker + text input with hex validation
- Controlled component (value/onChange)

### FontSelector.tsx
Dropdown for selecting available fonts from EditorCore.
- Fetches fonts via `editorCore.getFontManager().getAvailableFonts()`
- Shows "(read-only)" label for non-editable fonts
- Click-outside detection for dismissal
- z-20 stacking

## Patterns
- Explicit `*Props` interface per component
- Controlled components with `value`/`onChange` (ColorPicker, FontSelector)
- CSS variables for all colors, no raw Tailwind color classes
- Inline `style={{}}` for padding/spacing to avoid Tailwind v4 reset conflicts
- Parameter defaults for optional props

## Dependencies
- `types/document` — `Color` type (ColorPicker)
- `core/interfaces/IEditorCore` — editor core (FontSelector)
- `lucide-react` — ChevronDown icon (FontSelector)
