# components/upload

## Purpose
PDF file upload and password authentication flow — the entry point for loading documents into the editor.

## Files

### UploadWidget.tsx
Upload zone with 3D tilt, dashed border, drag-and-drop and click-to-browse.
- **3D Tilt**: `perspective: 800px`, `rotateX/Y` driven by mouse position state
- **Mouse glow**: Radial gradient follows cursor via `glowX/glowY` calculations
- **Styling**: White bg, dashed border-solid border, rounded-20px, padding 56px 40px
- **Upload zone states**: default (dashed border), hover (mouse glow), drag-over (accent bg + accent border), dropped (bounce), loading (shimmer progress), error (shake)
- **Drag detection**: Zone-level only. Document-level `dragover`/`drop` prevented in LandingPage
- **Progressive loading**: 3 phases (parsing → extracting → preparing) with timed transitions
- **Friendly error messages**: Maps raw errors to user-friendly copy via `ERROR_MESSAGES` record
- **Password handling**: On password error, stores buffer in UIStore and shows PasswordModal
- **Accessibility**: `role="button"`, `tabIndex={0}`, `aria-label`, keyboard Enter/Space, `aria-live="polite"` for loading

### PasswordModal.tsx
Modal dialog for unlocking encrypted PDFs.
- White Modal with Outfit display title
- Lock icon in `var(--accent-soft)` rounded container
- Info box with `var(--accent-light)` background
- Reads `pendingPdfData` from UIStore
- Calls `editorCore.loadPdf(data, password)` with user-entered password
- Enter key submission, auto-focus on open
- Proper state cleanup on close

## Flow
```
UploadWidget -> loadPdf() -> success -> editor
                           -> password error -> store PDF -> show PasswordModal
                                                             -> loadPdf(data, pw) -> success -> editor
```

## Dependencies
- `store/uiStore` — `showPasswordModal`, `pendingPdfData`, `fileName`
- `core/interfaces/IEditorCore` — `loadPdf(buffer, password?)`
- `components/ui/Modal`, `components/ui/Button` (PasswordModal only)
- `lucide-react` — FileText, ArrowUpRight, Lock
- CSS classes from `src/index.css`: `progress-shimmer`, `animate-drop-bounce`, `animate-icon-float`, `animate-subtle-pulse`
