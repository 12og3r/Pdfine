# Inkworld Pixel Theme — Design Spec

**Date**: 2026-04-11
**Status**: Approved, moving to implementation
**Replaces**: "Lumen" design system

## Goal

Transform Pdfine's landing and editor pages from the current clean indigo/cyan "Lumen" aesthetic into a playful, 8-bit game-inspired "Inkworld" theme — paying homage to the SNES era of Super Mario World / Yoshi's Island — while keeping the core PDF editing workflow fully usable and untouched.

## Core Decisions

| Axis | Choice |
|---|---|
| Depth | Full 8-bit game experience (originally C), grounded by "ambient game feel" (B) interaction level |
| Era | SNES (1990) — rich palette, soft shading, chunky sprites with outlines |
| World | Hybrid: classic outdoor side-scroller scenes + stationery-themed props (paper bricks, pencil weapons, ink coins) |
| Mascot | "Inky" the printmaker apprentice — beret, overalls, giant pencil slung on back |
| Interaction intensity | Ambient: cosmetic + mascot reacts to real events. **No new steps** added to the workflow. |
| Audio | 8-bit SFX synthesized via WebAudio. 4 sounds: click, save, error, upload. **No BGM.** Mute toggle persists in localStorage. |
| IP | Original characters only. No Nintendo assets. |

## Visual Identity

### Palette — "Inkworld"

```
Sky bright      #5FCDE4   hero background, sky
Sky deep        #3A7BD5   cloud shadow, gradient base
Grass light     #7EC850   ground surface, success
Grass dark      #3E8948   ground shadow, outline
Paper cream     #FFF3C4   card surface, "paper" backgrounds
Brick           #D17F44   brick blocks, primary button
Brick dark      #8C4B1D   brick outline, secondary text
Coin            #FFE045   accent, CTA fill
Coin dark       #E89900   CTA hover, outline
Ink (text)      #2B2B54   all body text, 1-2px outlines on sprites
Pipe green      #50A147   editor accent
Danger red      #D6331F   errors, delete
Cloud white     #FDFDFD   clouds, highlights
```

Every pixel element has a 1–2px `#2B2B54` outline — this is non-negotiable for the SNES aesthetic.

### Typography

| Role | Font |
|---|---|
| Display / H1–H3 | **Press Start 2P** (Google Fonts) |
| UI body / buttons / labels (Latin) | **Silkscreen** (Google Fonts) |
| UI body (CJK) | **DotGothic16** (Google Fonts) |
| Monospace | JetBrains Mono (unchanged) |
| **PDF editing content** | **UNCHANGED** — editable text keeps its original typography. This is the product's core promise. |

### Mascot — "Inky"

16×24px base sprite, rendered at 2×–4× scale via `image-rendering: pixelated`.

- Red beret, round nose, thick eyebrows
- Dark-blue overalls + white tee
- Giant yellow pencil with red eraser slung over one shoulder
- Chunky brown boots

**Animation states**: `idle` · `idle-fidget` · `walk` · `jump` · `write` · `celebrate` · `confused` · `sleep`

Idle-fidget auto-triggers every ~10s with a random pick (eraser polish, sneeze, head scratch) so the mascot feels alive.

## Scope

### Pages changed

- **Landing**: Hero, UploadWidget, FeatureCards, HowItWorks, TrustSignals, Footer — full pixel treatment
- **Editor**: Header, PageNavigator, PropertyPanel, canvas background — pixel chrome; mascot in bottom-right corner; mute toggle in header
- **Shared UI**: Button, Modal, Tooltip, ColorPicker, FontSelector — chunky pixel borders, hard shadows

### NOT changed

- PDF rendering canvas content (the actual PDF pixels and editable text) — the product's core must stay clean and readable
- Core engine (EditorCore, layout, render, export, font) — this is a pure theme/UI swap
- Tests — unit and E2E tests that only assert behavior should still pass; any tests asserting specific Lumen class names or hex values will be updated

## Technical Approach

1. **CSS variable remap**: keep every Lumen variable name in `src/index.css`, change only the values. Existing components auto-adopt the new palette without touching their source.
2. **Additive pixel utility classes**: `.pixel-border`, `.pixel-btn`, `.pixel-card`, `.pixel-shadow`, `.pixel-brick`, `.pixel-pipe`, `.pixel-cloud`, `.pixel-font-display`, `.pixel-font-body`. Components opt in where they need the stronger pixel look.
3. **Pixel art rendering**:
   - Mascot: inline SVG `<rect>` grid, frames toggled by CSS keyframe `steps()` animation
   - Decorative sprites (clouds, brick, pipe): CSS `box-shadow` pixel technique or small SVGs
   - Global `image-rendering: pixelated; -webkit-font-smoothing: none` on pixel elements
4. **SFX**: `src/hooks/useSfx.ts` synthesizes short tones via `AudioContext` oscillators + envelopes. No audio files. Mute state persisted in `localStorage` under `pdfine-muted`.
5. **Motion**: CSS keyframes with `animation-timing-function: steps(N)` for crisp frame-based animation. All animations respect `prefers-reduced-motion`.
6. **Accessibility**: WCAG AA maintained — pixel fonts passed through for readability sizes, color contrast verified against ink black (#2B2B54) on all backgrounds, keyboard nav untouched.

## Component Design Notes

### Hero

- Sky-blue gradient background, 3 animated pixel clouds drifting slowly
- Brick-block platform at the bottom
- Big pixel title using Press Start 2P with hard black drop shadow (`text-shadow: 4px 4px 0 #2B2B54`)
- Inky mascot on the right, 4× scale, idle + fidget loop
- CTA button styled as a `?` block that bounces on hover

### UploadWidget

- Drop zone = floating `?` brick. Hover/drag-over makes it bounce (`steps(4)` keyframe).
- Upload progress: Inky walks across and "carries" a paper sprite into a green pipe at the far side.
- Error state: `confused` mascot pose + shake.

### Editor Header

- Brick texture background with top-aligned pipe cap accents
- Pixel font button labels
- Mute toggle = pixel speaker icon (top-right)
- Saved state indicator = small coin icon, spins on save

### PropertyPanel

- Cream paper background with brick-outlined border
- Section dividers as pixel dotted lines
- Color picker swatches as pixel tiles

### Canvas Background

- Replace `radial-gradient` dot grid with a very faint pixel grid (2px squares, 5% opacity) — visible as decoration but doesn't compete with the PDF content.

## Build Order

1. Write this spec ✓
2. Theme foundation — `src/index.css` rewrite + new utilities + font imports
3. Inky mascot component
4. SFX hook
5. Landing: Hero → UploadWidget → remaining sections
6. Editor chrome: Header → PropertyPanel → PageNavigator → canvas bg
7. UI primitives: Button → Modal → Tooltip → ColorPicker → FontSelector
8. Wire mascot + SFX to app events (upload, save, error, idle)
9. Update all affected CLAUDE.md files
10. Run `pnpm build` and `pnpm dev`, verify no regressions

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Pixel fonts hurt readability for CJK | Use DotGothic16 for CJK; keep JetBrains Mono for code; only apply Press Start 2P to large headings |
| Users feel patronized by mascot | Mascot is never in the way; mute toggle also hides the mascot on long press (v2) |
| Existing tests break on class-name assertions | Keep CSS var names; update any test asserting literal Lumen hex values |
| SFX is intrusive | Default on but one-click mute in header persists forever |
| PDF content readability on pixel background | Canvas background stays subtle; PDF rendering pipeline untouched |

## Success Criteria

- Landing page is visibly a pixel-art side-scroller; Inky is visible and animated
- Editor still functions: upload, edit text, change font/color, save, export all work
- `pnpm build` succeeds with no new type errors
- `pnpm test` passes (tests that reference Lumen strings are updated alongside)
- No regression in core PDF editing fidelity
