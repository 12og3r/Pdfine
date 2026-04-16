import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
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
    <Modal open title="Password Required" onClose={handleClose}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '18px',
          padding: '12px 14px',
          background: 'var(--ink-paper-dark)',
          border: '3px solid var(--ink-black)',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--ink-brick)',
            border: '3px solid var(--ink-black)',
            flexShrink: 0,
          }}
        >
          <Lock className="w-4 h-4" style={{ color: 'var(--ink-paper)' }} />
        </div>
        <p
          style={{
            color: 'var(--ink-black)',
            fontFamily: 'var(--font-pixel-body)',
            fontSize: '14px',
            lineHeight: 1.4,
          }}
        >
          This PDF is locked. Enter the password to continue.
        </p>
      </div>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="ENTER PASSWORD"
        className="w-full focus:outline-none"
        style={{
          padding: '12px 14px',
          fontFamily: 'var(--font-display)',
          fontSize: '11px',
          letterSpacing: '0.05em',
          color: 'var(--ink-black)',
          background: 'var(--ink-cloud)',
          border: '3px solid var(--ink-black)',
          boxShadow: '3px 3px 0 0 var(--ink-black)',
        }}
        autoFocus
      />

      {error && (
        <p
          style={{
            marginTop: '12px',
            fontFamily: 'var(--font-pixel-body)',
            fontSize: '13px',
            color: 'var(--ink-danger)',
            fontWeight: 700,
          }}
        >
          ⚠ {error}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleUnlock} disabled={loading || !password}>
          {loading ? 'Unlocking...' : 'Unlock'}
        </Button>
      </div>
    </Modal>
  )
}
