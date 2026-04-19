# components/upload

## Purpose
Password authentication flow for encrypted PDFs. The main drop zone lives in `components/landing/UploadWidget.tsx`.

## Files

### PasswordModal.tsx
Modal dialog for unlocking encrypted PDFs — Paper editorial style.
- Uses the shared `Modal` primitive with a "Password required" eyebrow and the title "Unlock this document."
- Info strip: forest-green accent box with a filled lock tile and Inter body copy.
- Password input: `.paper-input` using JetBrains Mono for monospaced masked characters.
- Error message: terracotta mono "⚠ …" line below the input.
- Two buttons (`.paper-btn-ghost` Cancel + `.paper-btn` Unlock) aligned right.
- Enter key submission, autofocus on open.
- Reads `pendingPdfData` from UIStore, calls `editorCore.loadPdf(data, password)`.
- Proper state cleanup on close.

## Flow
```
UploadWidget -> loadPdf() -> success -> editor
                           -> password error -> store PDF -> show PasswordModal
                                                           -> loadPdf(data, pw) -> success -> editor
```

## Dependencies
- `store/uiStore` — `showPasswordModal`, `pendingPdfData`
- `core/interfaces/IEditorCore` — `loadPdf(buffer, password?)`
- `components/ui/Modal`
- `lucide-react` — Lock icon
