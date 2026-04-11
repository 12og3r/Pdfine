# components/layout

## Purpose
Top-level layout components that structure the editor UI — dark chrome header, property panel, and page navigation.

## Files

### Header.tsx
Dark header bar (48px) with chrome background.
- **Left**: Back button (ChevronLeft) + divider + file name in monospace
- **Center**: Zoom controls (absolutely centered) in translucent pill with border, JetBrains Mono percentage
- **Right**: Gradient accent export button with Download icon (`btn-accent` class)
- Back button calls `useUIStore.setDocumentLoaded(false)` to return to landing page
- Zoom buttons enforce MIN_ZOOM/MAX_ZOOM bounds
- All interactive elements use accent-soft hover states on dark background

### PropertyPanel.tsx
Right sidebar (248px) with dark chrome background for editing text properties.
- Dark theme: `var(--chrome)` background, white text, chrome borders
- `SectionLabel` (uppercase, 0.3 white) and `DarkStyleButton` helper components
- Active style buttons use `var(--accent)` background
- Input fields use `rgba(255,255,255,0.06)` background
- Empty state shows monospace hint text
- Font selector, font size, bold/italic/underline toggles
- Color picker, alignment buttons, line spacing slider
- Overflow warning with amber/warning tones
- Uses `custom-scrollbar-dark` CSS class

### PageNavigator.tsx
Bottom-right floating control with dark chrome background for multi-page navigation.
- Rounded-xl, padding 5px, chrome border, deep box-shadow
- Buttons 32px (p-2) with 16px chevron icons
- Page numbers in JetBrains Mono at 12px, `rgba(255,255,255,0.6)`
- Hidden when totalPages <= 1
- 0-based indexing internally, 1-based display to users

## Patterns
- All components accept `editorCore: IEditorCore` prop
- Dual sync: changes update both UIStore AND editorCore
- **Dark chrome theme**: all editor chrome uses `var(--chrome)` background with `var(--chrome-text)` / `var(--chrome-text-muted)`
- Hover states use `var(--chrome-hover)` background, color transitions to chrome-text
- `lucide-react` icons throughout

## Dependencies
- `store/uiStore`, `core/interfaces/IEditorCore`, `types/ui`, `types/document`
- `config/constants` (zoom bounds)
- `hooks/useExportPdf` (Header only)
- `components/ui/*` (Button, ColorPicker, FontSelector, Tooltip)
- `lucide-react`
