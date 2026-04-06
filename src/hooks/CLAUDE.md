# hooks

## Purpose
React hooks that bridge EditorCore (the editing engine) with React's component lifecycle and Zustand state management.

## Files

### useEditorCore.ts
Initializes EditorCore singleton and syncs editor events to UIStore.
- Creates EditorCore via `useRef` (singleton pattern)
- Subscribes to 7 events: documentLoaded, historyChanged, overflow, styleAtCursor, selectionChanged, editStart, editEnd
- Each subscription syncs to corresponding UIStore setter
- Exposes EditorCore on `window.__EDITOR_CORE__` in development mode (for E2E testing)
- Cleanup: unsubscribes all events + calls `editorCore.destroy()` on unmount
- Returns `IEditorCore` instance

### useExportPdf.ts
PDF export workflow with progress tracking.
- Validates before export, shows confirmation if warnings exist
- Calls `editorCore.exportPdf(onProgress)` with progress callback
- Triggers browser download: `{originalName}_edited.pdf`
- Returns `{ exportPdf, isExporting, progress }`

### useKeyboardShortcuts.ts
Global keyboard shortcuts (window keydown listener).
- **Ctrl+Z/Y**: Undo/Redo
- **Ctrl+S**: Prevent browser save
- **Ctrl+Plus/Minus/0**: Zoom in/out/reset (clamped to MIN_ZOOM/MAX_ZOOM)
- **Escape**: Exit edit mode, switch to select tool
- **V/E/T**: Tool shortcuts (only when NOT editing text)
- Cross-platform: checks both Ctrl and Cmd keys

## Bridge Pattern
```
EditorCore events → useEditorCore → UIStore → Component re-renders
User actions → hooks → EditorCore methods + UIStore setters (dual sync)
```

## Dependencies
- `store/uiStore` — Zustand UI state
- `core/EditorCore` — editor implementation (useEditorCore)
- `core/interfaces/IEditorCore` — type interface
- `config/constants` — MIN_ZOOM, MAX_ZOOM, ZOOM_STEP

## Developer Notes
- useEditorCore must be called at root level before other components mount
- When adding new editor events: add subscription in useEditorCore + UIStore setter
- Tool shortcuts (V/E/T) disabled during text editing to avoid conflicts
- Check `editorCore.isEditing()` (not store state) for editing detection — more reliable
- Always unsubscribe events on cleanup — prevents memory leaks
