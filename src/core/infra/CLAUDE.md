# core/infra

## Purpose
Foundational infrastructure services shared across the editor core — event system, coordinate transformation, and logging.

## Files

### EventBus.ts
Type-safe pub/sub event system using `EditorEvents` interface.
- `on(event, callback)` — subscribe, returns unsubscribe function
- `emit(event, data)` — broadcast to all listeners
- Catches exceptions in callbacks to prevent cascade failures
- Listeners stored as `Map<string, Set<callback>>`

### CoordinateTransformer.ts
Converts between coordinate systems. Implements `ICoordinateTransformer`.
- **Layout** (top-left origin, Y-down, points) — editor internal
- **Canvas** (accounts for scale and DPR) — rendered output
- **PDF** (bottom-left origin, Y-up) — PDF specification
- **Screen** (viewport with scroll) — DOM mouse events

Key methods:
- `layoutToCanvas(x, y)` / `canvasToLayout(cx, cy)`
- `layoutToPdf(x, y)` / `pdfToLayout(px, py)` — Y-axis flip: `y_pdf = pageHeight - y_layout`
- `screenToLayout(screenX, screenY, scrollX, scrollY)`
- `updateViewport(scale, dpr, pageWidth, pageHeight)`

Defaults: 612x792pt (US Letter), scale 1, DPR 1.

### Logger.ts
Structured logging with configurable levels.
- `new Logger('ModuleName', minLevel?)` — default minLevel: 'info'
- Levels: debug (0) < info (1) < warn (2) < error (3)
- Output format: `[prefix] message` via native console methods

## Dependencies
- `types/events` — EditorEvents interface (EventBus)
- `interfaces/ICoordinateTransformer` — interface definition
- No dependencies between infra files — each is independent

## Developer Notes
- Y-axis flip between layout and PDF is the most common source of coordinate bugs
- Update viewport BEFORE transforming coordinates after zoom/resize
- EventBus error isolation: one callback error won't affect other listeners
- New event types go in `types/events.ts`, not in EventBus
- Roundtrip test: A→B→A should yield original coordinates
