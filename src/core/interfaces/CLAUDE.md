# core/interfaces

## Purpose
TypeScript interface contracts for all core modules. Enables loose coupling, testability, and parallel development.

## Files

| Interface | Implementation | Key Responsibility |
|-----------|---------------|-------------------|
| `IEditorCore` | `EditorCore.ts` | Main facade — PDF loading, canvas binding, event subscription, sub-module access |
| `IEditEngine` | `editor/EditEngine.ts` | Text editing, cursor, selection, undo/redo, IME |
| `IRenderEngine` | `render/RenderEngine.ts` | Canvas rendering, hit testing, selection/cursor display, page offset queries |
| `ILayoutEngine` | `layout/LayoutEngine.ts` | Text reflow, strategy switching (greedy/knuth-plass) |
| `IFontManager` | `font/FontManager.ts` | Font extraction, registration, metrics, measurement, fallback, ascent calculation |
| `IPdfParser` | `parser/PdfParser.ts` | PDF → DocumentModel conversion |
| `IExportModule` | `export/ExportModule.ts` | Validation and PDF export |
| `ICoordinateTransformer` | `infra/CoordinateTransformer.ts` | Coordinate system conversions |

## Patterns
- `IEditorCore` is the facade composing all other interfaces
- Strategy pattern in `ILayoutEngine` (swappable line-breaking algorithms)
- Observer pattern via `on()` in `IEditorCore`
- All interfaces define `destroy()` for cleanup

## Dependencies
- `types/document`, `types/ui`, `types/events` — shared type definitions

## Developer Notes
- Any method signature change is a breaking change — update all implementations
- Query methods (get*, is*) must not modify state
- Async operations (loadPdf, export) return Promises
- Keep sub-interfaces focused and single-purpose
