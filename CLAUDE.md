# PDF Editor - CLAUDE.md

## Project Overview

A pure front-end PDF editor enabling direct text editing of PDF content while preserving original typography (fonts, sizes, weights, colors) with automatic text reflow. All processing is client-side — no backend.

**Stack**: React 19 + TypeScript 5.9 + Vite 7 + Zustand 5 + Tailwind CSS 4 + Canvas API

**Key Libraries**:
- `pdfjs-dist` — PDF parsing & page rasterization
- `pdf-lib` — PDF export (overlay-based redraw)
- `opentype.js` — Font parsing & glyph metrics
- `lucide-react` — Icons

## Quick Commands

```bash
pnpm dev            # Start dev server (localhost:5173)
pnpm build          # Type-check + production build
pnpm lint           # ESLint
pnpm test           # Unit tests (vitest, single run)
pnpm test:watch     # Unit tests (watch mode)
npx playwright test # E2E tests (Chromium)
```

## Architecture

```
React Components (thin UI layer)
        ↓
EditorCore (central orchestrator)
        ↓
Core Modules (pure TypeScript)
  ├── parser/    — PDF parsing, text block extraction
  ├── model/     — Document data model factories
  ├── layout/    — Text reflow, line breaking (Greedy + Knuth-Plass)
  ├── render/    — Canvas rendering pipeline
  ├── editor/    — Text editing, input/IME, cursor, selection, undo/redo
  ├── font/      — Font registry, extraction, metrics, fallback
  ├── export/    — PDF export (white overlay + redraw strategy)
  ├── infra/     — EventBus, CoordinateTransformer, Logger
  └── interfaces/ — I-prefixed contracts (IEditorCore, IRenderEngine, etc.)
```

### Key Design Decisions

1. **Document model lives outside React state** — Performance requirement for real-time editing (100+ updates/sec). Zustand store holds UI-only state.
2. **Event-driven coordination** — Modules communicate via typed `EventBus`, not direct calls. EditorCore wires events between modules.
3. **Interface-first design** — All core modules implement `I`-prefixed interfaces for testability and decoupling.
4. **Hidden textarea for input** — Industry-standard pattern (like Google Docs) for keyboard + IME capture.
5. **Canvas rendering** — Custom canvas pipeline for character-level precision (not fabric.js).
6. **Export uses white overlay** — Draws white rect over original text, redraws edited text on top. Trade-off: simplicity over content stream editing.

### Data Flow: Text Edit

```
User types → hidden <textarea> → InputHandler → EditCommand
→ CommandHistory (undo/redo) → DocumentModel update
→ EventBus 'textChanged' → LayoutEngine reflow
→ RenderEngine re-render → Canvas update
```

## Code Conventions

### Naming
- **Files**: PascalCase for classes (`TextRenderer.ts`), camelCase for utilities (`constants.ts`)
- **Interfaces**: `I` prefix (`IEditorCore.ts`, `IFontManager.ts`)
- **Hooks**: `use` prefix (`useEditorCore.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MIN_ZOOM`, `OVERFLOW_TOLERANCE_PERCENT`)
- **Components**: PascalCase (`EditorCanvas.tsx`)

### Imports
- Use `import type` for type-only imports
- Relative paths only (no path aliases configured)
- Order: external libs → type imports → implementation imports

### React Patterns
- Functional components only with explicit `Props` interface
- Zustand selector pattern: `useUIStore((s) => s.zoom)`
- `useCallback` for event handlers, `useEffect` with cleanup

### Error Handling
- `Logger` class per module: `new Logger('ModuleName')`
- Try-catch in EventBus handlers to prevent cascade failures
- Graceful fallbacks (return null/defaults), no throw propagation

### Types
- Discriminated unions with `type` field for element types
- Section comments (`// ========`) to organize type files
- Core types in `src/types/`: `document.ts`, `events.ts`, `ui.ts`, `font.ts`

### Module Exports
- Each subsystem has `index.ts` re-exporting key classes and types

## Project Structure

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Root component
├── index.css                   # Tailwind CSS
├── components/
│   ├── editor/                 # EditorCanvas, TextEditInput
│   ├── layout/                 # Header, PageNavigator, PropertyPanel
│   ├── landing/                # LandingPage, Hero, UploadWidget, FeatureCards, HowItWorks, TrustSignals, Footer
│   ├── upload/                 # PasswordModal
│   ├── mascot/                 # Inky (Inkworld mascot, SVG pixel sprite)
│   └── ui/                     # Button, Modal, Tooltip, ColorPicker, FontSelector
├── core/
│   ├── EditorCore.ts           # Central orchestrator
│   ├── parser/                 # PdfParser, TextBlockBuilder, ImageExtractor, PathExtractor, TextColorExtractor
│   ├── model/                  # DocumentModel factory functions
│   ├── layout/                 # LayoutEngine, ParagraphLayout, line breakers, OverflowHandler
│   ├── render/                 # RenderEngine, TextRenderer, ImageRenderer, HitTester, etc.
│   ├── editor/                 # EditEngine, InputHandler, ImeHandler, CursorManager, CommandHistory
│   ├── font/                   # FontManager, FontExtractor, FontMetrics, FontFallback
│   ├── export/                 # ExportModule, ExportValidator, FontEmbedder, OverlayRedrawStrategy
│   ├── infra/                  # EventBus, CoordinateTransformer, Logger
│   └── interfaces/             # I-prefixed interface contracts
├── types/                      # document.ts, events.ts, ui.ts, font.ts
├── store/                      # uiStore.ts (Zustand)
├── hooks/                      # useEditorCore, useKeyboardShortcuts, useExportPdf, useSfx
└── config/                     # constants.ts (thresholds), defaults.ts (fallback fonts, styles)
```

## CLAUDE.md Maintenance (MUST FOLLOW)

After every code modification, update ALL affected CLAUDE.md files — from the edited file's folder up to the project root. Verify each document remains accurate. This includes:
- The folder-level CLAUDE.md where the edited file lives
- Any parent folder CLAUDE.md if the change affects architecture, exports, or dependencies
- The root `/CLAUDE.md` if project structure, conventions, or key configurations changed

Do NOT skip this step. Outdated documentation is worse than no documentation.

## Bug Fix Workflow (MUST FOLLOW)

1. **Write a test first** — Reproduce the bug with a failing test case before touching any implementation code.
2. **Fix the code** — Make the minimal change needed to resolve the issue.
3. **Run ALL tests** — Execute `pnpm test` (unit) and `npx playwright test` (E2E) to verify the fix AND ensure no regressions.

Never skip steps. A bug fix without a reproducing test is incomplete.

## Testing

### Unit Tests (`__tests__/`)
- Framework: Vitest + jsdom
- Pattern: `__tests__/unit/<module>/<Name>.test.ts`
- Setup file polyfills DOM APIs for pdfjs-dist (DOMMatrix, Path2D, FontFace, etc.)
- Run: `pnpm test`

### E2E Tests (`e2e/`)
- Framework: Playwright (Chromium only)
- Pattern: `e2e/<feature>.spec.ts`
- Tests canvas pixel inspection, text editing flows, export
- Run: `npx playwright test`

## Key Configuration

### TypeScript
- Target: ES2022, strict mode, `noUnusedLocals`, `noUnusedParameters`
- JSX: react-jsx

### ESLint
- Flat config (ESLint 9), TypeScript + React hooks + React refresh rules

### Important Constants (`src/config/constants.ts`)
- `OVERFLOW_TOLERANCE_PERCENT = 15` — auto-shrink threshold
- `CONTINUOUS_INPUT_MERGE_INTERVAL_MS = 500` — undo merge window
- `MIN_ZOOM = 0.25`, `MAX_ZOOM = 5.0`
- `CURSOR_BLINK_INTERVAL_MS = 530`

## Design System — "Inkworld" (MUST FOLLOW)

All frontend UI uses the **Inkworld** design system defined in `src/index.css`. A SNES-era pixel-art theme that pays homage to classic side-scrollers. Full spec: `docs/superpowers/specs/2026-04-11-inkworld-pixel-theme-design.md`.

### Core Principles
- **Pixel aesthetic**: Every visible UI element has a 1–3px `#2B2B54` (ink-black) outline. No rounded corners. No soft shadows — use hard offset shadows like `4px 4px 0 0 var(--ink-black)`.
- **Image rendering**: `image-rendering: pixelated`, `font-smooth: never`, `-webkit-font-smoothing: none` globally.
- **Stepped animations**: All keyframe animations use `steps(N)` timing for a frame-based feel.
- **Sanctuary zone**: The PDF rendering canvas itself is **never** themed. Edited PDF content keeps its original typography — this is the product's core promise.

### Landing Page (Sky + Paper)
- **Background**: Bright sky `var(--bg)` (#5FCDE4) with drifting pixel clouds
- **Text**: Ink hierarchy — `var(--text-primary)` (#2B2B54), `--text-secondary` (#4A2810), `--text-muted` (#8C4B1D)
- **Accent**: Coin `var(--accent)` (#FFE045) → Brick `var(--accent-secondary)` (#D17F44)
- **Cards/Surfaces**: Cream paper `var(--ink-paper)` (#FFF3C4) with ink-black outlines
- **Display title**: Press Start 2P + 8-direction hard drop-shadow (see `.gradient-text` class)

### Editor (Brick/Wood Chrome)
- **Chrome** (header, panels): `var(--chrome)` (#4A2810) deep brick-brown
- **Text on dark**: `var(--chrome-text)` (#FFF3C4 cream), `--chrome-text-muted` (#F5DFA0)
- **Active tool**: coin-yellow background with inset shadow (pressed-in look)
- **Canvas background**: `.editor-canvas-bg` — very faint pixel grid (2px) on muted sky-green (#E6F4E4)
- **Property panel**: Cream paper background (left-border 4px ink-black)
- **Mascot**: Inky appears bottom-left corner in idle + autoFidget mode

### Shared
- **Typography**:
  - `var(--font-display)` — **Press Start 2P** (headings, buttons, tabs). Always uppercase letters, `letterSpacing: 0.05em`.
  - `var(--font-pixel-body)` — **DotGothic16** / Silkscreen (body copy, including CJK)
  - `var(--font-sans)` — Silkscreen (short labels)
  - `var(--font-mono)` — JetBrains Mono (unchanged, for code)
- **Shadows** (hard, no blur):
  - `--shadow-xs` (2px), `--shadow-sm` (3px), `--shadow-md` (4px), `--shadow-lg` (6px), `--shadow-xl` (8px)
  - Direction is always bottom-right, color is always `#2B2B54`
- **Pixel utility classes** (use these in new components): `.pixel-btn`, `.pixel-card`, `.pixel-border`, `.pixel-border-thick`, `.pixel-cloud`, `.pixel-brick`, `.pixel-pipe`, `.pixel-question-block`, `.pixel-coin`, `.pixel-font-display`, `.pixel-font-body`
- **Animations**: stepped keyframes (`steps(4)`, `steps(6)`, `steps(8)`) for a frame-based feel. All respect `prefers-reduced-motion`.
- **Spacing**: Inline `style={{}}` for padding/margins to avoid Tailwind v4 reset conflicts
- **Accessibility**: WCAG 2.1 AA. ARIA attributes, keyboard nav, focus management. Focus ring uses 3px coin-yellow outline.
- **Interactions**: Hover = shift `translate(-2px, -2px)` + larger offset shadow. Active = press `translate(2px, 2px)` + smaller offset shadow.
- Never use raw Tailwind color classes — use CSS variables or raw hex values from the Inkworld palette.

### Mascot — Inky
- Import from `components/mascot`: `import { Inky } from '../mascot'`
- Props: `action`, `size` (integer multiplier), `direction`, `autoFidget`, `className`, `onClick`
- Appears in: landing Hero, landing UploadWidget (loading state), mobile warning, editor bottom-left corner, confused state on errors
- Never blocks interaction. Never gates flow. Always purely decorative reactions to real events.

### Audio — 8-bit SFX
- `src/hooks/useSfx.ts` — WebAudio synth, no audio files. 5 sounds: `click`, `coin`, `jump`, `error`, `powerUp`
- Mute toggle in editor Header. State persists in `localStorage` under `pdfine-muted`.
- Wire sound effects to existing events, not fabricated ones — every beep should correspond to a real user action.

## Known Limitations

- Export adds white overlays (increases file size, covered text becomes unsearchable)
- Only TrueType/OpenType fonts are editable (Type1/CIDFont fall back to system fonts)
- Text aggregation is heuristic-based (may fail on complex multi-column layouts)
- Canvas rendering has ±1-2px subpixel variance
- On edit mode entry, text block bounds are adjusted (fontSize→ascent) to minimize vertical shift between pdfjs raster and Canvas fillText rendering
