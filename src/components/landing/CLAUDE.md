# components/landing

## Purpose
Landing page components for the PDF editor — the first thing users see before loading a document. "Lumen" design system with cool white background, indigo/cyan gradient accents, Outfit display typography, and animated interactions.

## Files

### LandingPage.tsx
Main landing page layout. Orchestrates all sub-components.
- `lumen-bg noise-bg` wrapper with gradient orbs background
- Document-level `dragover`/`drop` listeners to prevent browser default file opening
- Error display with shake animation and `var(--error-soft)` background
- Sections: Nav -> Hero -> UploadWidget -> TrustSignals -> FeatureCards -> HowItWorks -> Footer
- Nav logo uses `var(--gradient-accent)` background with indigo glow
- GitHub link has hover state with accent-soft background and border-accent
- All content areas use `max-w-screen-xl mx-auto` (1280px max)
- Inline `style={{}}` for all spacing (avoids Tailwind v4 reset issues)

### Hero.tsx
Hero section with Outfit display heading and animated gradient orbs.
- **Floating orbs**: Two `div` elements animated via `requestAnimationFrame` with sin/cos motion, blur(60px)
- **Badge**: Pulsing dot + "100% Client-Side" pill with accent-soft background
- **Headline**: `gradient-text` class for "beautifully" with indigo->cyan fill, italic
- Responsive font sizing via `clamp()`
- Staggered entrance animations with `animate-entrance`

### UploadWidget.tsx
Upload zone with gradient border glow, shine sweep, corner accents, 3D tilt, and mouse-following glow.
- **Gradient border glow**: Indigo→cyan gradient behind card, fades in on hover (0.45 opacity), intensifies on drag (0.9, pulsing)
- **Shine sweep**: Light reflection sweeps across card on hover via `uw-shine-sweep` animation (skewed white gradient)
- **Corner accents**: Four decorative corner brackets (indigo & cyan) that brighten on hover/drag
- **3D tilt**: `perspective: 800px` + `rotateX/Y` based on mouse position
- **Mouse glow**: Elliptical radial gradient follows cursor position
- **Icon states**: 3 visual tiers — subtle gradient (default), stronger gradient with border (hover), full accent gradient with ring shadow (drag-over)
- **Loading state**: Phase text animates in with blur-fade (`uw-phase-in`), tri-color flowing progress bar (indigo→cyan→emerald)
- Upload states: default, hover (shine sweep + corner brighten + glow border), drag-over (full border + outer blur glow), dropped (bounce), loading (phase text + flowing progress)
- Footer shows Private + Local only (Shield icon) + file size limit

### TrustSignals.tsx
Three trust badges in pill containers: Private, No uploads, Open source.
- Pill shape with `var(--surface)` bg, `var(--border-solid)` border, subtle shadow
- Icons colored individually: indigo, cyan, emerald
- Staggered entrance animations (700ms + 100ms per item)

### FeatureCards.tsx
**Bento Grid with animated live previews** — 4 cards in asymmetric grid layout.
- Grid: 6-column base, responsive via CSS classes (`bento-span-4`, `bento-span-2`, `bento-span-3`)
- **BentoCard** component: 3D perspective tilt on hover (`rotateX/Y`), mouse-following gradient glow, scroll-reveal with staggered delays, shadow + border-accent transitions
- **TypingDemo**: Simulated PDF editing — fake text lines, blinking cursor, typed text reveal animation, "Live editing" floating badge
- **ShieldDemo**: Orbiting security particles — dashed ring rotations, 4 orbiting colored dots (CSS keyframe orbits), SVG shield with gradient stroke, animated checkmark draw
- **ExportDemo**: File download flow — source PDF file, animated arrow with traveling dot, download target with check animation, loops every 5s
- **TypographyDemo**: Font style showcase — Serif/Sans Bold/Mono/Italic text with staggered slide-in reveals
- Each card has colored accent: indigo (#6366F1), cyan (#06B6D4), emerald (#10B981), amber (#F59E0B)
- Monospace numbered badges with accent-colored backgrounds

### HowItWorks.tsx
**Animated Journey with SVG path drawing** — 3 steps with sequential activation.
- **SVG path**: Straight connecting line with gradient (indigo->cyan->emerald), draws via `strokeDashoffset` animation, glow filter
- **Traveling orb**: SVG `<circle>` with `<animateMotion>` along path, color transitions from indigo->cyan->emerald
- **Sequential activation**: 10s infinite cycle synced with orb — orb arrives at card (500ms/3000ms/5500ms) → card animates → orb moves to next
- **StepCard**: Cards with blooming activation — number badge animates (color, scale, glow shadow), gradient line expands, border tints to step color, shadow deepens, mouse-following glow on hover, translateY(-4px) lift on hover
- **Step animations**:
  - OpenAnimation: PDF file drops in with spring bounce, landing zone ring scales in
  - EditAnimation: Text lines expand, blinking cursor appears, typed text reveals
  - ExportAnimation: Download icon drops in, progress bar fills, transforms to checkmark
- All animations driven by `active` prop from sequential timer

### Footer.tsx
Minimal footer with gradient logo and divider.
- Gradient divider (transparent -> border-solid -> transparent)
- Logo uses `var(--gradient-accent)` with indigo shadow
- Outfit font for brand name

## Patterns
- All spacing via inline `style={{}}` to avoid Tailwind v4 reset conflicts
- CSS variables from Lumen design system
- IntersectionObserver for scroll-triggered reveals (FeatureCards, HowItWorks)
- Mouse-following effects via React state + inline styles
- Sequential timer-driven animations (HowItWorks step activation)
- Inline `<style>` tags for component-scoped keyframe animations
- 3D perspective transforms for card tilt effects

## Dependencies
- `core/interfaces/IEditorCore` — passed to UploadWidget
- `store/uiStore` — error state management
- `lucide-react` — icons (TrustSignals only)
- CSS classes from `src/index.css`: `lumen-bg`, `noise-bg`, `gradient-text`, `animate-entrance`, `progress-shimmer`, `bento-span-*`
