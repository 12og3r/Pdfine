# components/layout

## Purpose
Top-level layout components that structure the editor UI — brick/wood chrome header, cream paper property panel, and page navigation. All using the **Inkworld** pixel theme.

## Files

### Header.tsx
Brick-wood header bar (56px) with a 4px ink-black bottom border.
- **Left**: ChevronLeft back button + mini coin-block logo + file name in Press Start 2P
- **Center**: Zoom controls in a brick-dark pixel pill (minus / % / plus buttons, hard borders)
- **Right**: Mute toggle (Volume2/VolumeX icon) + coin-yellow EXPORT `pixel-btn`
- Back button calls `useUIStore.setDocumentLoaded(false)` to return to landing
- Zoom buttons enforce MIN_ZOOM/MAX_ZOOM bounds
- Wired to `useSfx()`: click on navigation, coin+powerUp on export

### PropertyPanel.tsx
Right sidebar (260px) with cream paper background for editing text properties.
- Background: `var(--ink-paper)`, 4px ink-black left border
- `SectionLabel`: Press Start 2P at 9px, brick-dark color, uppercase, letter-spaced
- `PixelStyleButton`: 36×36 pixel buttons with coin-yellow active state (inset dark shadow = pressed)
- Font selector, font size input (Press Start 2P numbers), bold/italic/underline toggles
- Color picker with Inkworld-palette presets + custom hex input
- Alignment buttons, line spacing slider
- Overflow warning: red pixel banner with 3px offset shadow
- Empty state: "SELECT A TEXT BLOCK" in Press Start 2P + directional arrows
- Uses `custom-scrollbar` CSS class (chunky brick scrollbar)

### PageNavigator.tsx
Bottom-right floating control for multi-page navigation.
- Deep brick-brown background, 3px ink-black border, 4px hard offset shadow
- Buttons 36×36 with chevron icons, coin-yellow on hover
- Page numbers in Press Start 2P at 10px, coin-yellow color
- Hidden when totalPages <= 1
- Plays `click` SFX on page change

## Patterns
- All components accept `editorCore: IEditorCore` prop
- Dual sync: changes update both UIStore AND editorCore
- **Inkworld theme tokens**:
  - Chrome background: `var(--ink-brick-deep)` (editor header) or `var(--ink-paper)` (property panel)
  - Text: `var(--ink-paper)` / `var(--ink-coin)` on dark chrome, `var(--ink-black)` on paper
  - Hover: coin-yellow highlight on brick; paper-dark highlight on cream
- No rounded corners anywhere
- Hard offset shadows (`Xpx Xpx 0 0 var(--ink-black)`)
- Press Start 2P for all labels; DotGothic16 only for long body copy
- `lucide-react` icons retained (lightweight, single-color, consistent with pixel border weight)

## Dependencies
- `store/uiStore`, `core/interfaces/IEditorCore`, `types/ui`, `types/document`
- `config/constants` (zoom bounds)
- `hooks/useExportPdf`, `hooks/useSfx` (Header)
- `components/ui/*` (Button, ColorPicker, FontSelector, Tooltip)
- `lucide-react`
