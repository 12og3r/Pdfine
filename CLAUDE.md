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

## Design System — "Paper" (MUST FOLLOW)

All frontend UI uses the **Paper** design system defined in `src/index.css`. An editorial, warm ivory theme evoking a well-used literary magazine — Newsreader serif display, multi-hue accents (forest green, terracotta, mustard, plum), hairline ink borders, and generous white space. The original Inkworld pixel theme was retired but its CSS tokens remain in `index.css` for fallback (`--ink-*` variables). New code should target Paper tokens exclusively.

### Core Principles
- **Editorial feel**: hairline 1px borders in `var(--p-line)` (14% ink). Radii between 0 and 2px. No hard offset shadows — only soft drop shadows (`0 30px 80px -30px rgba(0,0,0,…)`) on modals and hero cards.
- **Typography hierarchy**: Newsreader serif (display + italic accents), Inter (body copy), JetBrains Mono (eyebrows, metrics, data labels). Eyebrows are always uppercase with 0.1–0.16em tracking.
- **Smoothed text**: `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`. No pixel rendering globally.
- **Sanctuary zone**: The PDF rendering canvas itself is **never** themed. Edited PDF content keeps its original typography — this is the product's core promise.

### Landing Page (Warm Ivory)
- **Background**: `var(--p-bg)` (#EFE8D9) warm ivory, plus a subtle SVG paper grain + forest/celadon radial washes.
- **Text**: `var(--p-ink)` (#221C15) primary, `--p-ink-2` / `--p-ink-3` / `--p-ink-4` for secondary/tertiary.
- **Accents**: `--p-accent` (#2F5A3F forest), `--p-warm` (#B85C3A terracotta), `--p-gold` (#C69545 mustard), `--p-plum` (#6B4266).
- **Cards/Surfaces**: Cream paper `var(--p-paper)` (#F7F1E1) with 1px `var(--p-line)` outlines.
- **Display title**: Newsreader regular at `clamp(48px, 7vw, 104px)`, italic spans for accents.

### Editor (Paper Chrome)
- **Chrome**: 64px ivory topbar with a `var(--p-line)` underline. Dark ink `.paper-btn` for the primary export action.
- **Properties panel**: cream paper background (`--p-paper`), 300px, hairline left border. ink-filled toggle buttons with `--p-paper` text on active.
- **Canvas background**: `var(--p-bg-2)` soft parchment, centered document sheet with gentle drop shadow. No background grid.
- **Page navigator**: floating paper pill, soft shadow.

### Shared
- **Typography**:
  - `var(--p-serif)` — **Newsreader** (headings, display, italic accents).
  - `var(--p-sans)` — **Inter** (body, UI labels). This replaces the previous Silkscreen/DotGothic16.
  - `var(--pdfine-mono)` — **JetBrains Mono** (eyebrows, figure tags, metric labels).
  - Legacy `var(--font-display|sans|pixel-body|mono)` tokens still resolve and are mapped to the pixel stack for any retained component.
- **Paper utility classes** (use these in new components): `.paper-theme` (root scope carrying tokens and grain), `.paper-btn`, `.paper-btn-ghost`, `.paper-btn-warm`, `.paper-input`, `.paper-eyebrow`, `.paper-caret`.
- **Spacing**: Inline `style={{}}` for padding/margins to avoid Tailwind v4 reset conflicts.
- **Accessibility**: WCAG 2.1 AA. ARIA attributes, keyboard nav, focus management.
- **Interactions**: hover lifts lightly (`translateY(-1px)`) with a warmer shadow; active returns to base.
- Never use raw Tailwind color classes — use CSS variables.

### Retired decorations
- The Inky mascot (`components/mascot/`) and 8-bit SFX (`hooks/useSfx.ts`) are no longer wired into the UI. Files remain for historical reference but should not be imported by new code. The editor, landing, and mobile warning no longer render them.

## Known Limitations

- Export adds white overlays (increases file size, covered text becomes unsearchable)
- Only TrueType/OpenType fonts are editable (Type1/CIDFont fall back to system fonts)
- Text aggregation is heuristic-based (may fail on complex multi-column layouts)
- Canvas rendering has ±1-2px subpixel variance
- On PDF load, text block bounds.y is aligned to `firstBaselineY - ascent` (the first line's baseline captured by `TextBlockBuilder`) so Canvas fillText lands on the pdfjs raster's baseline on edit-mode entry. Programmatically-created blocks without `firstBaselineY` fall back to the `fontSize - ascent` approximation, which is only exact when pdfjs's `item.height == fontSize`
