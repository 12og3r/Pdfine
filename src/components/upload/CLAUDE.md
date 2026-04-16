# components/upload

## Purpose
Password authentication flow for encrypted PDFs. The main drop zone lives in `components/landing/UploadWidget.tsx`.

## Files

### PasswordModal.tsx
Modal dialog for unlocking encrypted PDFs — Inkworld pixel style.
- Uses the shared pixel `Modal` primitive (coin-yellow title banner, cream paper body, 4px ink border, 8px hard shadow)
- Info box: cream paper pill with brick icon tile and DotGothic16 body copy
- Password input: Press Start 2P, cream background, 3px ink border, 3px offset shadow, `ENTER PASSWORD` placeholder
- Error message: red DotGothic16 "⚠ ..." line below input
- Two pixel buttons (Cancel / Unlock) using the shared `Button` primitive
- Enter key submission, autofocus on open
- Reads `pendingPdfData` from UIStore, calls `editorCore.loadPdf(data, password)`
- Proper state cleanup on close

## Flow
```
UploadWidget -> loadPdf() -> success -> editor
                           -> password error -> store PDF -> show PasswordModal
                                                           -> loadPdf(data, pw) -> success -> editor
```

## Dependencies
- `store/uiStore` — `showPasswordModal`, `pendingPdfData`
- `core/interfaces/IEditorCore` — `loadPdf(buffer, password?)`
- `components/ui/Modal`, `components/ui/Button`
- `lucide-react` — Lock icon
