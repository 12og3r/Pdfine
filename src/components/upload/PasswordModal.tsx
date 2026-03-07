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
      setError(message.toLowerCase().includes('password')
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
        className="flex items-center gap-3 mb-5 p-3.5 rounded-lg"
        style={{ background: 'var(--accent-light)', border: '1px solid var(--border)' }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-soft)' }}
        >
          <Lock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          This PDF is encrypted. Enter the password to continue.
        </p>
      </div>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter password"
        className="w-full px-4 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30 transition-shadow"
        style={{ border: '1px solid var(--border-solid)', background: 'var(--bg-warm)' }}
        autoFocus
      />

      {error && (
        <p className="mt-2.5 text-sm font-medium" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button variant="primary" onClick={handleUnlock} disabled={loading || !password}>
          {loading ? 'Unlocking...' : 'Unlock'}
        </Button>
      </div>
    </Modal>
  )
}
