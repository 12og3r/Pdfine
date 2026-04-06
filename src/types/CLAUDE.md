# types

## Purpose
All core TypeScript type definitions for the PDF editor. Shared across the entire codebase.

## Files

### document.ts
Core data model and edit commands.
- **Model hierarchy**: DocumentModel → PageModel → PageElement (union) → TextBlock/ImageElement/PathElement/OverlayElement
- **Text structure**: TextBlock → Paragraph[] → TextRun[] → TextStyle; TextRun has optional `pdfCharWidths?: number[]` for per-character widths, `pdfRunWidth?: number` for total PDF run width, and `pdfLineWidths?: number[]` for per-line-segment PDF widths (enables per-segment proportional scaling); Paragraph has optional `pdfLineHeight?: number` for actual PDF baseline-to-baseline distance (used to preserve native line spacing)
- **Layout output**: LayoutLine → PositionedGlyph (char with x, y, width, height, style)
- **Edit commands**: Discriminated union (INSERT_TEXT, DELETE_TEXT, REPLACE_TEXT, CHANGE_STYLE, BATCH, etc.)
- **Overflow state**: Discriminated union (normal, within_tolerance, auto_shrunk, overflowing)
- **Basic types**: Rect, Color, Point, PathCommand

### events.ts
Typed event contracts for EventBus.
- `EditorEvents` interface maps event names to payload types
- Events: textChanged, elementAdded/Removed/Moved, editStart/End, cursorMoved, selectionChanged, overflow, fontFallback, error, documentLoaded/Unloaded, renderComplete, needsRender, historyChanged, styleAtCursor

### ui.ts
UI state and interaction types.
- `ActiveTool`: 'select' | 'editText' | 'addText' | 'image' | 'draw' | 'shape'
- `Viewport`, `CursorPosition`, `SelectionRange`, `HitTestResult`
- `UIState`: complete UI state shape with setter methods

### font.ts
Font metadata and metrics.
- `FontMetrics`: unitsPerEm, ascender, descender, xHeight, capHeight, lineGap
- `FontInfo`: id, name, family, weight, style, isEmbedded
- `GlyphMetrics`: advanceWidth, leftSideBearing

### opentype.d.ts
Type augmentation for opentype.js library (Font interface extensions).

## Discriminated Unions
- `PageElement` → by `type` ('text', 'image', 'path', 'overlay')
- `EditCommand` → by `type` (20+ command types)
- `OverflowState` → by `status`
- `PathCommand` → by `op` ('M', 'L', 'C', 'Z')

## Dependencies Between Files
- `events.ts` imports from `document.ts` (OverflowState, TextStyle)
- `ui.ts` imports from `document.ts` (TextStyle)
- `font.ts` and `opentype.d.ts` are standalone

## Developer Notes
- Always maintain discriminator fields when modifying union types
- EditCommand includes both original and new values (enables undo/redo)
- Changes to TextStyle, Paragraph, or LayoutLine affect the rendering pipeline
- All elements share `id` and `bounds` — use type guards for specific properties
