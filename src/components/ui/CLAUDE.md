# components/ui

## Purpose
Reusable UI primitives used across the application. All primitives follow the **Paper** editorial theme — warm ivory surfaces, hairline ink borders, Newsreader serif display, and mono eyebrows. CSS variables + inline styles for all styling.

## Files

### Button.tsx
Legacy multi-variant pixel button. No longer referenced after the Paper redesign — new code uses the `.paper-btn` / `.paper-btn-ghost` / `.paper-btn-warm` classes defined in `src/index.css`. File kept intentionally in case an older flow still imports it.

### Modal.tsx
Centered editorial modal. Rendered via `createPortal` into `document.body` so it escapes the editor shell's `overflow: hidden` flex container — otherwise the "dialog" gets clipped and lays out inline instead of floating.
- Props: `open`, `onClose`, `title` (ReactNode), `children`, optional `eyebrow` (defaults to "Dialog").
- Backdrop: translucent ink with a light `backdrop-filter: blur(2px)` wash, hard-coded inline (Tailwind v4 source scanning didn't reliably emit `fixed`/`inset-0` utilities when those classes only appeared inside a portal-rendered tree).
- Card: cream paper surface, 1px ink border, soft drop shadow, max-height-capped + vertically scrollable if content overflows.
- Mono eyebrow + Newsreader title (28px, -0.02em tracking).
- Locks `document.body.style.overflow = 'hidden'` while open so the page beneath can't scroll; restored on close / unmount.
- Entry: inline `fadeIn` (backdrop) + `scaleUp` (card) keyframes.

### Tooltip.tsx
Portalled hover tooltip.
- `side?: 'top' | 'bottom'` (default `top`), `align?: 'start' | 'center' | 'end'` (default `center`).
- Ink-coloured background (`--p-ink`), paper text (`--p-paper`), JetBrains Mono at 11px with 0.06em tracking.
- CSS-triangle arrow points at the trigger; viewport clamping keeps corner triggers on screen.
- Rendered via `createPortal` so it escapes ancestor `overflow: hidden`.

### ColorPicker.tsx
Color selection with 9 paper-palette presets + custom hex input.
- Color type: `{ r, g, b }` (0-255).
- Presets: Ink, Muted, Forest, Terracotta, Mustard, Plum, Black, Slate, Red.
- Swatches: stable 1px hairline border + outer forest-green ring via `box-shadow: 0 0 0 2px paper, 0 0 0 4px accent` when selected (keeps border width constant so sibling swatches don't shift, and the ring stays visible even on dark swatches).
- Every interactive control calls `onMouseDown={e => e.preventDefault()}` so clicking a swatch / opening the native color input / focusing the hex text field does NOT steal focus from the hidden editing textarea — the user can keep typing right after picking a color.
- `customHex` syncs to the incoming `value` prop via `useEffect`, so the hex field reflects the current block's colour after entering edit mode or applying a preset.
- Controlled component.

### FontSelector.tsx
Dropdown for available fonts from EditorCore.
- Trigger button: Inter 13px, white surface, hairline border.
- Dropdown: paper panel with a 1px ink border and a soft drop shadow; dashed dividers between rows.
- Selected row: forest-green text on accent-2 (pale celadon) wash.
- Non-editable fonts show a mono "(r/o)" tag.
- Click-outside detection for dismissal.

## Patterns
- Explicit `*Props` interface per component.
- Controlled components with `value`/`onChange` (ColorPicker, FontSelector).
- CSS variables for all colors; use Paper tokens (`--p-*`, `--pdfine-mono`).
- Inline `style={{}}` for padding/spacing to avoid Tailwind v4 reset conflicts.
- Radii 0–2px; no pixel drop shadows.
- Newsreader for display, JetBrains Mono for eyebrows/metrics, Inter for body.

## Dependencies
- `types/document` — `Color` type (ColorPicker)
- `core/interfaces/IEditorCore` — editor core (FontSelector)
- `lucide-react` — ChevronDown icon (FontSelector)
