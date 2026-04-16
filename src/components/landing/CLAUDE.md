# components/landing

## Purpose
Landing page components for the PDF editor — the first thing users see before loading a document. **Inkworld** pixel-art theme: bright sky background with drifting pixel clouds, cream paper cards with ink-black outlines, chunky coin-yellow CTAs, and Inky the mascot.

## Files

### LandingPage.tsx
Main landing page layout. Orchestrates all sub-components.
- `lumen-bg noise-bg` wrapper (still named `lumen-bg` for CSS compat; the class now paints a SNES sky gradient)
- Document-level `dragover`/`drop` listeners to prevent browser default file opening
- Error display: red pixel pill with hard ink-black border + 3px offset shadow
- Sections: Nav → Hero → UploadWidget → TrustSignals → FeatureCards → HowItWorks → Footer
- Nav: pixel coin logo (P inside a yellow question block) + `pixel-btn pixel-btn-ghost` GitHub button

### Hero.tsx
Two-column hero — big pixel title + mascot on the right.
- Pixel clouds floating in the background (`.pixel-cloud` class)
- "Coin badge" at top: pixel-spinning coin + "100% CLIENT-SIDE" in Press Start 2P
- Giant title: `EDIT PDFS / LIKE A HERO` with 8-direction hard drop shadow + brick shadow
- Subtitle inside a cream paper pill with 3px ink-black border
- Right column: `<Inky action="idle" size={7} autoFidget />` atop a tiny pixel grass tuft

### UploadWidget.tsx
Drop zone disguised as a giant `?` block.
- Cream paper outer card with 4px ink-black border and 4px hard shadow
- Centerpiece: 96×96 coin-yellow `?` block with inset light/dark shadows (mimics pressed-out SNES block)
- On hover: `question-wobble` animation. On drag-over: `block-bounce` + coin-yellow glow ring.
- Loading state: pixel progress bar + Inky walking in the bottom-left corner
- 3 footer badges (PRIVATE / LOCAL ONLY / ≤100MB) as small pixel pills in grass/sky/brick
- SFX via `useSfx()`: `jump` on drop, `coin` on success, `error` on failure

### TrustSignals.tsx
Three pixel badges (PRIVATE / NO UPLOADS / OPEN SOURCE).
- Each badge = 3 spinning `.pixel-coin` sprites + label in Press Start 2P
- Background colors: grass / sky / coin; all with 3px ink borders and 3px offset shadows
- Staggered entrance animation

### FeatureCards.tsx
"WORLD 1-1 · POWER-UP BLOCKS" — a responsive grid of 4 cards.
- Each card is a cream paper tile with a big 72×72 pixel block icon (coin / brick / pipe / mushroom colors)
- Hover: lift `translate(-3px, -3px)` + larger offset shadow + block-bounce animation on icon
- Number chip (e.g. "01") in white-on-ink Press Start 2P
- Responsive `grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))`

### HowItWorks.tsx
"THREE STEPS TO VICTORY" — open / edit / export as pixel stages.
- Each step card shows a sprite illustration: green pipe (open), brick + ? block (edit), flag (export)
- "STAGE 01/02/03" banner floats on top-left of each card
- Simple ▶ arrow connectors between cards on desktop
- No orb/path animation — straightforward pixel staging
- Sprites built from `linear-gradient` + borders (CSS pixel art, no SVG needed)

### Footer.tsx
Brick baseline + mini coin logo + copyright text.
- Top: `.pixel-brick` textured band spanning the page
- Logo: same mini coin-block pattern as nav
- Body text: `var(--ink-brick-dark)` in DotGothic16/Silkscreen

## Patterns
- All spacing via inline `style={{}}` to avoid Tailwind v4 reset conflicts
- CSS variables from Inkworld (see root CLAUDE.md for the full palette)
- `IntersectionObserver` for scroll-triggered reveals (FeatureCards, HowItWorks)
- Stepped animations with `steps(N)` timing
- Never use rounded corners (pixel aesthetic)
- Use `<Inky>` from `../mascot` for any character art
- Use `useSfx()` from `../../hooks/useSfx` for sound effects

## Dependencies
- `core/interfaces/IEditorCore` — passed to UploadWidget
- `store/uiStore` — error state management
- `components/mascot` — Inky mascot
- `hooks/useSfx` — 8-bit sound effects
- `lucide-react` — icons (mostly retired in favor of pixel sprites; still used in Header/PropertyPanel)
- CSS classes from `src/index.css`: `lumen-bg`, `noise-bg`, `gradient-text`, `pixel-btn`, `pixel-card`, `pixel-cloud`, `pixel-coin`, `pixel-brick`, `animate-entrance`, `progress-shimmer`
