import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useUIStore } from '../../store/uiStore'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'

interface PasswordModalProps {
  editorCore: IEditorCore
}

export function PasswordModal({ editorCore }: PasswordModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const pendingPdfData = useUIStore((s) => s.pendingPdfData)
  const setShowPasswordModal = useUIStore((s) => s.setShowPasswordModal)
  const setPendingPdfData = useUIStore((s) => s.setPendingPdfData)

  const handleClose = () => {
    setShowPasswordModal(false)
    setPendingPdfData(null)
    setPassword('')
    setError(null)
  }

  const handleUnlock = async () => {
    if (!pendingPdfData || !password) return

    setLoading(true)
    setError(null)

    try {
      await editorCore.loadPdf(pendingPdfData, password)
      handleClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(
        message.toLowerCase().includes('password')
          ? 'Incorrect password. Please try again.'
          : message
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock()
  }

  return (
    <Modal open title="Unlock this document." eyebrow="Password required" onClose={handleClose}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 18,
          padding: '12px 14px',
          background: 'var(--p-accent-2)',
          border: '1px solid var(--p-accent)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--p-accent)',
            color: 'var(--p-paper)',
            flexShrink: 0,
          }}
        >
          <Lock size={16} />
        </div>
        <p style={{ color: 'var(--p-ink-2)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
          This PDF is encrypted. Enter the password to decrypt and edit it — the password is not
          stored.
        </p>
      </div>

      <label className="paper-eyebrow" style={{ display: 'block', marginBottom: 6 }}>
        Password
      </label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        className="paper-input"
        style={{ fontFamily: 'var(--pdfine-mono)' }}
        autoFocus
      />

      {error && (
        <p
          style={{
            marginTop: 10,
            fontFamily: 'var(--pdfine-mono)',
            fontSize: 12,
            color: 'var(--p-warm)',
            letterSpacing: '0.04em',
          }}
        >
          ⚠ {error}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
        <button type="button" className="paper-btn paper-btn-ghost" onClick={handleClose}>
          Cancel
        </button>
        <button
          type="button"
          className="paper-btn"
          onClick={handleUnlock}
          disabled={loading || !password}
          style={{ opacity: loading || !password ? 0.6 : 1 }}
        >
          {loading ? 'Unlocking…' : 'Unlock'}
        </button>
      </div>
    </Modal>
  )
}
