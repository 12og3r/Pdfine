# store

## Purpose
Global UI state management via Zustand. Contains ONLY UI/presentation state — the DocumentModel is NOT stored here.

## Files

### uiStore.ts
Single Zustand store with `create<UIState>()` pattern.

**State** (18 properties):
- Tool & viewport: `activeTool`, `zoom`, `currentPage`, `totalPages`
- Document: `documentLoaded`, `showPasswordModal`, `pendingPdfData`, `fileName`
- Selection & editing: `selectedBlockId`, `currentTextStyle`, `overflowWarnings`, `isEditing`, `editFocusTick`
- History: `canUndo`, `canRedo`
- Export: `isExporting`, `exportProgress`
- UI: `propertyPanelOpen`

**Actions**: 14 setters + `requestEditFocus()`, which increments `editFocusTick` so `TextEditInput` re-focuses the hidden textarea. Panel interactions that can steal focus from the textarea (color picker, font dropdown, size input) call `requestEditFocus` after applying their mutation so the user can keep typing.

## Why DocumentModel is NOT Here
1. EditorCore owns the document model directly (private property)
2. Document mutations are too frequent for React reconciliation (100+/sec during editing)
3. EditorCore emits events → `useEditorCore` hook syncs relevant state to this store
4. Keeps reactive system lightweight

## Access Patterns
- **In React components**: `useUIStore((s) => s.zoom)` — selector for fine-grained subscriptions
- **Outside React**: `useUIStore.getState().zoom` — synchronous imperative access

## Dependencies
- `zustand` — state management
- `types/ui` — UIState, ActiveTool
- `types/document` — TextStyle

## Developer Notes
- `currentPage` is 0-indexed internally, displayed as 1-indexed to users
- `overflowWarnings` is an array of block IDs, not messages
- `pendingPdfData` holds encrypted PDF buffer during password entry flow
- Always use setters — never mutate state directly
