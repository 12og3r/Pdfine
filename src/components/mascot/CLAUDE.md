# components/mascot/ — Inky, the Inkworld mascot

## Purpose
Reusable pixel-art mascot for the Inkworld theme. Inky is the product's "face"
and appears across landing, editor, and feedback states.

## Files
- `Inky.tsx` — SVG sprite renderer + action → CSS animation mapping
- `index.ts` — re-exports

## Sprite
Encoded as a 14×20 character grid inside `Inky.tsx`:
- `.` transparent, `K` ink-black outline, `R` red beret, `S` skin,
- `B` overalls blue, `L` shirt highlight, `Y` overall button, `O` boot.

Rendered as one `<rect>` per non-transparent cell, then scaled via CSS
`transform: scale(size)`. Uses `shape-rendering="crispEdges"` for pixel
precision.

## Actions
`idle` · `walk` · `jump` · `celebrate` · `confused` · `sleep`

Each maps to a `.inky-*` CSS class defined in `src/index.css`. Animations are
all `steps(N)` timing for a frame-based feel.

## autoFidget
When `autoFidget` is true and action is `idle`, Inky randomly plays a fidget
(`sneeze` | `celebrate` | `jump`) every 8–14 seconds so the mascot feels
alive instead of static.

## Usage
```tsx
import { Inky } from '../mascot';

<Inky action="idle" size={4} autoFidget direction="right" />
```

## Design notes
- Never use for blocking UI — mascot decorates, never gates interaction
- Size prop is an integer multiplier (1, 2, 3, 4) to preserve pixel crispness
- `prefers-reduced-motion` is respected globally via the `*` rule in index.css
