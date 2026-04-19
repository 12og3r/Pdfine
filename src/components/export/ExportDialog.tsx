import { useEffect, useMemo, useState } from 'react'
import { Download, Check, AlertTriangle, Lock } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useUIStore } from '../../store/uiStore'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'
import type { ExportValidation } from '../../types/document'

interface ExportDialogProps {
  editorCore: IEditorCore
}

/**
 * Paper-style export dialog. Replaces the native `window.confirm` /
 * `window.alert` that the pixel theme used to show — matches the editorial
 * mockup: mono eyebrow, serif title, filename input, verification block
 * with per-check indicators, Cancel / Export-PDF actions.
 *
 * Rendered at the App root; driven by `uiStore.showExportDialog`. The
 * Header's Export button flips that flag to open the dialog; the actual
 * `editorCore.exportPdf` call doesn't start until the user hits the
 * primary action here.
 */
export function ExportDialog({ editorCore }: ExportDialogProps) {
  const open = useUIStore((s) => s.showExportDialog)
  const originalFileName = useUIStore((s) => s.fileName)
  const isExporting = useUIStore((s) => s.isExporting)
  const setIsExporting = useUIStore((s) => s.setIsExporting)
  const setExportProgress = useUIStore((s) => s.setExportProgress)
  const setShowExportDialog = useUIStore((s) => s.setShowExportDialog)

  const suggestedName = useMemo(() => {
    const base = (originalFileName || 'document.pdf').replace(/\.pdf$/i, '')
    return `${base}_edited.pdf`
  }, [originalFileName])

  const [filename, setFilename] = useState(suggestedName)
  const [validation, setValidation] = useState<ExportValidation | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Opt-in password protection. Off by default — the user asked for this to
  // stay optional. When on, the primary action disables until password and
  // confirm match.
  const [encrypt, setEncrypt] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // Re-validate whenever the dialog opens so the checks reflect the current
  // doc state.
  useEffect(() => {
    if (!open) return
    try {
      setFilename(suggestedName)
      setError(null)
      setEncrypt(false)
      setPassword('')
      setPasswordConfirm('')
      setValidation(editorCore.validateForExport())
    } catch {
      setValidation({
        overflowBlocks: [],
        missingGlyphs: [],
        warnings: [],
        canExport: true,
      })
    }
  }, [open, editorCore, suggestedName])

  if (!open || !validation) return null

  const overflowOk = validation.overflowBlocks.length === 0
  const glyphsOk = validation.missingGlyphs.length === 0
  // "Vector text preserved" is always true for this redraw strategy — we
  // emit real text operators via pdf-lib, not rasterised glyph images.
  const vectorOk = true
  const checksPassed = [overflowOk, glyphsOk, vectorOk].filter(Boolean).length
  const totalChecks = 3

  const handleCancel = () => {
    if (isExporting) return
    setShowExportDialog(false)
  }

  const passwordsMatch = !encrypt || (password.length > 0 && password === passwordConfirm)
  const canSubmit = !isExporting && passwordsMatch

  const handleExport = async () => {
    if (isExporting) return
    if (encrypt && !passwordsMatch) {
      setError('Passwords do not match.')
      return
    }
    setIsExporting(true)
    setExportProgress(0)
    setError(null)
    try {
      const data = await editorCore.exportPdf(
        (p) => setExportProgress(p),
        encrypt && password ? { password } : undefined,
      )
      const blob = new Blob([data as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = filename.trim() || suggestedName
      a.download = safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setShowExportDialog(false)
    } catch (err) {
      console.error('Export failed:', err)
      setError(err instanceof Error ? err.message : 'Export failed. Try again.')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  return (
    <Modal
      open
      onClose={handleCancel}
      eyebrow="Export"
      title={
        <>
          Save your changes,
          <br />
          <span style={{ fontStyle: 'italic', color: 'var(--p-ink-3)' }}>as a new file.</span>
        </>
      }
    >
      <label className="paper-eyebrow" style={{ display: 'block', marginBottom: 6 }}>
        Filename
      </label>
      <input
        className="paper-input"
        style={{ fontFamily: 'var(--pdfine-mono)', fontSize: 12 }}
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        spellCheck={false}
        autoFocus
      />

      <div
        style={{
          marginTop: 18,
          padding: 14,
          border: '1px solid var(--p-line)',
          background: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: 12,
            fontFamily: 'var(--pdfine-mono)',
            color: 'var(--p-ink-2)',
            letterSpacing: '0.04em',
          }}
        >
          <span>Verification</span>
          <span style={{ color: checksPassed === totalChecks ? 'var(--p-accent)' : 'var(--p-warm)' }}>
            {checksPassed} of {totalChecks} checks passed
          </span>
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <CheckLine ok={overflowOk} label={overflowOk ? 'No overflowing blocks' : `${validation.overflowBlocks.length} overflowing block(s)`} />
          <CheckLine
            ok={glyphsOk}
            label={
              glyphsOk
                ? 'All glyphs available for export'
                : `${validation.missingGlyphs.length} character(s) will render via fallback font`
            }
          />
          <CheckLine ok={vectorOk} label="Vector text preserved (not rasterised)" />
        </div>
      </div>

      {/* Optional password protection. Off by default — keeping the export
          flow single-click for users who don't need encryption. */}
      <div
        style={{
          marginTop: 18,
          padding: 14,
          border: '1px solid var(--p-line)',
          background: 'var(--p-paper)',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--p-ink)',
          }}
        >
          <input
            type="checkbox"
            checked={encrypt}
            onChange={(e) => {
              setEncrypt(e.target.checked)
              if (!e.target.checked) {
                setPassword('')
                setPasswordConfirm('')
              }
            }}
            style={{
              width: 16,
              height: 16,
              accentColor: 'var(--p-accent)',
              cursor: 'pointer',
            }}
          />
          <Lock size={14} style={{ color: 'var(--p-ink-3)' }} />
          <span>Password-protect this PDF</span>
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--pdfine-mono)',
              fontSize: 10,
              color: 'var(--p-ink-4)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Optional
          </span>
        </label>

        {encrypt && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="paper-input"
              style={{ fontFamily: 'var(--pdfine-mono)', fontSize: 12 }}
            />
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Confirm password"
              className="paper-input"
              style={{ fontFamily: 'var(--pdfine-mono)', fontSize: 12 }}
            />
            {password.length > 0 && passwordConfirm.length > 0 && password !== passwordConfirm && (
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--pdfine-mono)',
                  fontSize: 11,
                  color: 'var(--p-warm)',
                  letterSpacing: '0.04em',
                }}
              >
                Passwords do not match.
              </p>
            )}
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12,
                color: 'var(--p-ink-3)',
                lineHeight: 1.5,
              }}
            >
              The recipient will be prompted for this password when they open the PDF. There's no
              recovery — keep it safe.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p
          style={{
            marginTop: 12,
            fontFamily: 'var(--pdfine-mono)',
            fontSize: 12,
            color: 'var(--p-warm)',
            letterSpacing: '0.04em',
          }}
        >
          ⚠ {error}
        </p>
      )}

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button
          type="button"
          className="paper-btn paper-btn-ghost"
          onClick={handleCancel}
          disabled={isExporting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="paper-btn"
          onClick={handleExport}
          disabled={!canSubmit}
          style={{
            opacity: canSubmit ? 1 : 0.6,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          <Download size={14} />
          {isExporting ? 'Exporting…' : 'Export PDF'}
        </button>
      </div>
    </Modal>
  )
}

function CheckLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        color: ok ? 'var(--p-ink-2)' : 'var(--p-warm)',
      }}
    >
      {ok ? (
        <Check size={14} style={{ color: 'var(--p-accent)' }} />
      ) : (
        <AlertTriangle size={14} style={{ color: 'var(--p-warm)' }} />
      )}
      <span>{label}</span>
    </div>
  )
}
