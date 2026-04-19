# components/export

## Purpose
Paper-styled export dialog. Replaces the old `window.confirm` + `window.alert` UI that shipped when the editor used the Inkworld theme — the native prompts broke the editorial visual language and didn't communicate validation state well.

## Files

### ExportDialog.tsx
Modal rendered at the App root, driven by `uiStore.showExportDialog`.
- **Eyebrow**: `EXPORT` in JetBrains Mono.
- **Title**: serif "Save your changes, *as a new file.*" in Newsreader, italic for the second clause.
- **Filename input**: `.paper-input` monospace, pre-filled with `{originalName}_edited.pdf`; auto-focused on open.
- **Verification block**: white surface inside the paper card showing a "N of 3 checks passed" summary plus per-check lines rendered by `CheckLine`:
  - No overflowing blocks (from `ExportValidator.overflowBlocks`)
  - All glyphs available (from `ExportValidator.missingGlyphs`)
  - Vector text preserved (always true with the current overlay-redraw strategy)
  Forest-green check icons when a check passes, terracotta warning icons when it fails.
- **Password protection (optional)**: a second paper card below the verification block with a checkbox "Password-protect this PDF · OPTIONAL". When checked, two monospace password inputs (password + confirm) appear with a "passwords do not match" inline warning when they diverge. The primary button is disabled until the two fields match. The password is forwarded to `editorCore.exportPdf(onProgress, { password })` — the actual encryption pass lives in `ExportModule.export` and currently throws with a clear error until an encryption library (e.g. `@cantoo/pdf-lib` fork or `crypto-js`-based PDF V4 handler) is wired in.
- **Actions**: `paper-btn paper-btn-ghost` Cancel + `paper-btn` Export PDF with `Download` icon. Cancel and backdrop click dismiss unless an export is in flight.
- On export, calls `editorCore.exportPdf(onProgress)`, streams progress to `uiStore.exportProgress`, builds a Blob, creates an object URL, triggers download, and closes the dialog.

## Flow
```
Header Export button → setShowExportDialog(true)
  → ExportDialog opens, validates, shows checks + filename
  → user clicks Export PDF
  → editorCore.exportPdf → Blob → <a download> → URL.revokeObjectURL
  → setShowExportDialog(false)
```

## Dependencies
- `store/uiStore` — `showExportDialog`, `fileName`, `isExporting`, `exportProgress`
- `core/interfaces/IEditorCore` — `validateForExport`, `exportPdf`
- `components/ui/Modal` — eyebrow + serif title + backdrop
- `lucide-react` — `Download`, `Check`, `AlertTriangle` icons
