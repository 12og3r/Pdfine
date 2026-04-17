# components/ui

## Purpose
Reusable, styled UI primitives used across the application. CSS variables + inline styles for all styling. All primitives follow the **Inkworld** pixel theme — hard ink-black borders, stepped offset shadows, no rounded corners, Press Start 2P for labels.

## Files

### Button.tsx
Multi-variant pixel button extending `ButtonHTMLAttributes`.
- Variants:
  - `primary` — coin-yellow background, ink-black border + shadow
  - `secondary` (default) — cream paper background, ink-black border + shadow
  - `ghost` — transparent background, ink-black border only
  - `danger` — red background, cream text, ink-black border + shadow
- Sizes: `sm` (28px), `md` (34px, default), `lg` (42px)
- Typography: Press Start 2P, uppercase, 0.05em letter spacing
- Press feedback: `translate(2px, 2px)` + smaller offset shadow on mousedown, restored on mouseup/leave
- No rounded corners

### Modal.tsx
Overlay modal with ink-toned backdrop.
- Props: `open`, `onClose`, `title`, `children`
- Escape key and backdrop click dismiss
- Card: cream paper background, 4px ink-black border, 8px hard offset shadow
- Title bar: coin-yellow banner with inset light/dark shadows (pressed SNES block style), Press Start 2P title uppercase
- Backdrop: translucent ink black (`rgba(43, 43, 84, 0.55)`)
- Entry: `animate-scale-up` + `animate-fade-in` (stepped)

### Tooltip.tsx
Hover-activated pixel tooltip. Rendered via `createPortal` to `document.body` with `position: fixed` so it escapes any ancestor stacking context / clip region (the editor's `overflow: hidden` content row and sticky canvas used to clip it).
- `side?: 'top' | 'bottom'` (default `top`) — which side of the trigger the bubble renders on. Use `bottom` for triggers near the top of the viewport (e.g. Header) so the tooltip doesn't clip above the window.
- `align?: 'start' | 'center' | 'end'` (default `center`) — horizontal alignment relative to the trigger. Use `start` for leftmost triggers, `end` for rightmost, so a wide label doesn't clip past the viewport edge. Position is also clamped to the viewport with a 4px margin as a final safety net. Arrow is positioned to point at the trigger's horizontal center regardless of alignment.
- Ink-black background with coin-yellow text (Press Start 2P, 9px, uppercase)
- 2px ink border + 2px brick-dark offset shadow
- CSS-triangle arrow points toward the trigger (down when `side=top`, up when `side=bottom`)
- Uses `useLayoutEffect` to measure bubble + trigger and pin the bubble to viewport coordinates before paint

### ColorPicker.tsx
Color selection with 9 Inkworld-palette presets + custom hex input.
- Color type: `{ r, g, b }` (0-255), NOT hex strings
- Preset colors (Ink, Brick Dark, Red, Brick, Coin, Grass, Pipe, Sky, Deep Sky)
- Helpers: `colorToHex()`, `hexToColor()`, `colorsEqual()`
- Each swatch: 3px ink-black border, 2px offset shadow; selected swatch has inner coin-yellow ring + lifted position
- Native HTML color picker + pixel text input for hex values
- Controlled component (value/onChange)

### FontSelector.tsx
Dropdown for selecting available fonts from EditorCore.
- Trigger button: Press Start 2P, cream background, 3px ink border, 2px offset shadow
- Dropdown: cream paper panel with 3px ink border + 4px offset shadow, each row separated by 2px ink divider
- Selected row: coin-yellow background
- Non-editable fonts show "(R/O)" suffix
- Click-outside detection for dismissal

## Patterns
- Explicit `*Props` interface per component
- Controlled components with `value`/`onChange` (ColorPicker, FontSelector)
- CSS variables for all colors; use Inkworld tokens (see root CLAUDE.md)
- Inline `style={{}}` for padding/spacing to avoid Tailwind v4 reset conflicts
- No rounded corners, no soft shadows
- Press Start 2P for labels and button text; always uppercase with letter spacing
- Parameter defaults for optional props

## Dependencies
- `types/document` — `Color` type (ColorPicker)
- `core/interfaces/IEditorCore` — editor core (FontSelector)
- `lucide-react` — ChevronDown icon (FontSelector)
