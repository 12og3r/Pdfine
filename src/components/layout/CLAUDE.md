# components/layout

## Purpose
Editor chrome: a light ivory topbar with the Paper serif wordmark, an editorial properties inspector (right, 300px) on cream paper, and a floating page navigator. All using the **Paper** design system (warm ivory + Newsreader serif + forest / terracotta / mustard accents). The PDF rendering canvas itself is never themed — it stays a sanctuary zone hosting the user's original document.

## Files

### Header.tsx
Top bar (64px) with ivory background and a 1px `var(--p-line)` hairline underline.
- **Left**: back button + `PaperMark` SVG + "Pdfine" wordmark (Newsreader 20px) + mono filename pill, divided by hairlines.
- **Center**: zoom pill (paper-coloured, bordered, `- / {pct}% / +` in JetBrains Mono).
- **Right**: `Export PDF` uses the shared `.paper-btn` (ink background, cream text). Clicking it flips `uiStore.showExportDialog = true`; the actual export flow (validation, filename input, checks, download) lives in `components/export/ExportDialog.tsx`.
- Back button calls `useUIStore.setDocumentLoaded(false)` to return to landing.
- Zoom buttons enforce MIN_ZOOM/MAX_ZOOM bounds.
- Tooltips use `side="bottom"` so they render below the 64px bar.

### PagesSidebar.tsx
Left sidebar (240px) with a paper-tinted background and a 1px `var(--p-line)` right edge.
- Mono "Pages · N" eyebrow up top.
- Vertical list of page tiles. Each tile renders a real pdfjs preview of the page (up to 180×220 CSS px) with a two-digit mono label below.
- `PageThumb` requests `editorCore.getRenderEngine().getPdfPageRenderer().getPageCanvas(pageIdx, scale, onReady)` and copies the cached offscreen canvas into its own `<canvas>` via `drawImage`. Scale is computed from `editorCore.getPageModel(pageIdx)` bounds and `devicePixelRatio` so thumbs stay crisp on HiDPI.
- While the async render is in-flight, a `ThumbSkeleton` SVG shows indicative document lines and fades to the real bitmap on ready.
- Active page: cream paper surface with 1px `var(--p-ink-3)` outline and ink label.
- Hover on inactive tiles applies a translucent paper wash without border.
- Click calls both `useUIStore.setCurrentPage` and `editorCore.setCurrentPage`.
- Hidden when `totalPages <= 1`.
- Note: thumbnail rendering uses a different scale than the main canvas, so two cache entries per page exist in `PdfPageRenderer` after initial paint. Acceptable for typical doc sizes.

### PropertyPanel.tsx
Right inspector (300px) on cream paper (`var(--p-paper)`) with a 1px `var(--p-line)` left edge.
- Empty state: mono "Properties" eyebrow + serif callout asking the user to select a text block.
- Selected state: mono eyebrow, editorial font/size/style/color/alignment rows, a "Block bounds" mono table at the bottom.
- Style row: Bold + Italic toggles (underline was removed — the text model has no `textDecoration` field yet).
- Line-spacing slider was removed (no UI yet bound to a real setter).
- Overflow banner uses `var(--p-warm)` (terracotta) instead of a red alert.
- `ToggleButton` active state uses a forest-green outline + celadon wash (`var(--p-accent-2)`) + forest text so the "currently applied" value reads clearly against the cream paper background. Inactive is a hairline `var(--p-line)` border.
- `FontSelector` and `ColorPicker` (ui/) render the Paper-themed variants.

### PageNavigator.tsx
Bottom-right floating page pill.
- Paper background, hairline border, soft drop shadow (`0 12px 30px -15px rgba(0,0,0,0.18)`).
- Buttons 36×36 with ink chevrons, fade on disabled; `{current} / {total}` in mono.
- Hidden when `totalPages <= 1`.

## Patterns
- Accept `editorCore: IEditorCore` prop, sync changes to both UIStore and editorCore.
- All color via CSS variables (`--p-*`, `--p-line`, `--p-accent`, etc.).
- Hairline outlines (1px), never chunky shadows. Border radius 0–2px.
- Typography:
  - Display/eyebrow: `--pdfine-mono` (JetBrains Mono), 10–12px, 0.1–0.16em tracking, uppercase.
  - Labels/body: `--p-sans` (Inter) at 12–14px.
  - Wordmarks/hero numerals: `--p-serif` (Newsreader).
- Buttons reuse `.paper-btn` / `.paper-btn-ghost` from `src/index.css`.

## Dependencies
- `store/uiStore`, `core/interfaces/IEditorCore`, `types/ui`, `types/document`.
- `config/constants` (zoom bounds).
- `components/ui/{Tooltip, ColorPicker, FontSelector}`.
- `components/landing/PaperTopBar` — reused `PaperMark` SVG.
- `lucide-react`.
