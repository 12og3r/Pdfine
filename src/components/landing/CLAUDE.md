# components/landing

## Purpose
Editorial "Paper" landing surface: a warm ivory paper world with a Newsreader serif display, multi-hue accents (forest green / terracotta / mustard), and hard-cornered paper cards. This is the user's first impression before a document is loaded. Inkworld pixel styling was retired in favor of this editorial direction.

## Files

### LandingPage.tsx
Top-level landing orchestrator. Holds a local `page: 'landing' | 'privacy'` switch so the Privacy deep-dive can live in the same pre-document-loaded surface. Wraps everything in a `.paper-theme` root and wires `<PaperHero/>` → `<PaperBento/>` → `<PaperPrivacyTeaser/>`. Receives `editorCore` and passes it to `UploadWidget`. Adds document-level `dragover`/`drop` suppression so stray files don't navigate away.

### PaperTopBar.tsx
Sticky topbar (serif wordmark, mini "Pdfine" mark, v1.0 mono eyebrow, Features/Github nav). Brand click returns to the landing view. Exports `PaperMark` — an italic Newsreader "P" on a forest-green baseline with a terracotta period (defaults to 26px, `size` prop for larger surfaces, 32×28 viewBox) — reused by `Header` in the editor and by the mobile warning. Same mark also ships as `/public/favicon.svg` for the browser tab, wrapped in a 32×32 `rx=6` paper (`#F7F1E1`) fill so it stays legible on any tab chrome — picked over the ink- and green-backed variants for maximum brand consistency (`index.html` also declares `theme-color: #EFE8D9` so mobile browser chrome tints to the Paper ivory).

### PaperHero.tsx
Pill ("Privacy is the feature · READ MORE") + giant Newsreader headline ("Edit PDFs, / on your own machine.") + centered upload slot + an editorial "Scroll · Capabilities below" hint. The headline colors "on your own" forest green and "machine" terracotta to anchor the accent palette. `uploadSlot` is a `ReactNode` prop so the landing can inject the live `UploadWidget`.

### UploadWidget.tsx
The drop zone styled as a single paper tile with a stacked-document illustration, a serif prompt ("Drop a PDF here."), mono eyebrow markers (`01 / Drop to begin`, `↓ .pdf`), and a dark ink "Choose a file" `.paper-btn`. Hover/drag-over lifts the card with a soft shadow ring. While parsing, swaps to a serif progress view with stepped "Parsing → Extracting → Preparing" messages and a forest-green progress bar. A mono proof line (`0 network requests · 0 accounts · 0 bytes logged`) sits beneath the widget. Same behavior as before: password-protected PDFs still route through `PasswordModal` via UIStore.

### PaperBento.tsx
Capabilities grid. Section header with `§ Capabilities` monospace tag, followed by a 6-column / 2-row Bento:
- **01** Edit the original (big card, includes `MiniEditScreen` — a serif edit demo with a yellow selection highlight, a blinking `.paper-caret`, and an `EDITING · §2 Compensation` tag)
- **02** Local-first (`0` terracotta hero numeral + shield)
- **03** Typography (Aa specimens in forest / terracotta / plum)
- **04** Export — vector out, not a screenshot
- **05** Reflow — Greedy during typing, Knuth-Plass on export

### PaperPrivacyTeaser.tsx
Two-column teaser: editorial headline ("Your file never reaches a server.") + "How it works" CTA on the left, a data-path SVG on the right (PDF → Pdfine WASM → PDF′, with a crossed-out severed server). Separated from Bento by a `§ III — Privacy, in detail` section rule.

### PaperPrivacy.tsx
Full editorial Privacy page (§ 1 Data path diagram · § 2 Technical stack · § 3 Comparison table · § 4 Verify-yourself cards). Back-to-landing buttons at the top and bottom call the `onBack` prop.

## Patterns
- Scope everything inside `.paper-theme` (see `src/index.css`) so the tokens (`--p-*`, `--pdfine-mono`, `--p-serif`, `--p-sans`) are available.
- Inline `style={{}}` for typography/spacing because Tailwind v4 resets are still global — CSS variables are the source of truth for color.
- Serif (`var(--p-serif)` → Newsreader) for display + italic accents; body copy stays in `--p-sans` (Inter).
- Mono eyebrows use `--pdfine-mono` at 10–11px with 0.1–0.16em tracking.
- Card outline is always `1px solid var(--p-line)` on paper (`var(--p-paper)`) or ivory (`var(--p-bg)`). No rounded corners over 2px.
- Buttons use the `.paper-btn` / `.paper-btn-ghost` / `.paper-btn-warm` classes from `index.css`.
- Blinking cursors use the `.paper-caret` span.

## Dependencies
- `core/interfaces/IEditorCore` — passed to `UploadWidget`.
- `store/uiStore` — password modal handoff, `fileName`.
- `lucide-react` — `Upload`, `Shield` icons.
- CSS tokens and primitives live in `src/index.css` under `.paper-theme`, `.paper-btn*`, `.paper-input`, `.paper-eyebrow`, `.paper-caret`.
