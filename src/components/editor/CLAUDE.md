# components/editor

## Purpose
Core React UI components for the visual PDF editor — canvas rendering, user interactions, and text input capture.

## Files

### EditorCanvas.tsx
Main container managing the canvas element and viewport. Handles all mouse/wheel interactions and delegates to EditorCore.
- Uses `editor-canvas-bg` CSS class: warm gray background (#E8E7E2) with dot-grid pattern (20px spacing, `rgba(0,0,0,0.07)` dots)
- Manages HTMLCanvasElement with devicePixelRatio scaling (critical for HiDPI)
- ResizeObserver updates viewport on container resize
- Zoom via Ctrl/Cmd+Wheel, clamped to MIN_ZOOM/MAX_ZOOM
- Delegates mouse events (down, move, up, double-click) to editorCore
- Calls `preventDefault()` on mousedown when editing to prevent canvas from stealing textarea focus
- Renders TextEditInput as a child
- **Exit edit mode**: Enter or Escape or click outside the block. No Apply button — clean canvas.
- **Scroll support**: Container has `overflow: auto` with a spacer div sized to zoomed page + margins. Canvas uses `position: sticky` to stay in viewport while scrolling. Scroll events update viewport offsets and trigger re-render.
- Zoom changes recalculate scroll size via `updateCanvasSize()`

### TextEditInput.tsx
Hidden textarea that captures keyboard and IME composition events during text editing.
- Conditionally rendered based on `useUIStore.isEditing`
- Auto-focuses when editing starts
- Proxies input, keydown, and composition events to editorCore
- Hidden with `opacity-0 w-px h-px`, transparent caret

## Patterns
- **Event delegation**: All canvas/input events forwarded to `editorCore`
- **Zustand selectors**: `useUIStore((s) => s.zoom)` for fine-grained subscriptions
- **useCallback** with proper deps for all event handlers

## Dependencies
- `store/uiStore` — UI state (zoom, isEditing)
- `config/constants` — MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, PAGE_MARGIN
- `core/interfaces/IEditorCore` — editor core contract
