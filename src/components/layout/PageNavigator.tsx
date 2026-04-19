import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'

interface PageNavigatorProps {
  editorCore: IEditorCore
}

export function PageNavigator({ editorCore }: PageNavigatorProps) {
  const currentPage = useUIStore((s) => s.currentPage)
  const totalPages = useUIStore((s) => s.totalPages)

  if (totalPages <= 1) return null

  const handlePrev = () => {
    if (currentPage > 0) {
      const next = currentPage - 1
      useUIStore.getState().setCurrentPage(next)
      editorCore.setCurrentPage(next)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      const next = currentPage + 1
      useUIStore.getState().setCurrentPage(next)
      editorCore.setCurrentPage(next)
    }
  }

  const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: disabled ? 'var(--p-ink-4)' : 'var(--p-ink-2)',
    border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background 150ms, color 150ms',
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--p-paper)',
        border: '1px solid var(--p-line)',
        borderRadius: 2,
        boxShadow: '0 12px 30px -15px rgba(0,0,0,0.18)',
      }}
    >
      <button
        aria-label="Previous page"
        style={{ ...navBtnStyle(currentPage === 0), borderRight: '1px solid var(--p-line)' }}
        onClick={handlePrev}
        disabled={currentPage === 0}
      >
        <ChevronLeft size={16} />
      </button>
      <span
        className="tabular-nums select-none"
        style={{
          color: 'var(--p-ink)',
          fontFamily: 'var(--pdfine-mono)',
          fontSize: 12,
          padding: '0 14px',
          minWidth: '4rem',
          textAlign: 'center',
        }}
      >
        {currentPage + 1} / {totalPages}
      </span>
      <button
        aria-label="Next page"
        style={{ ...navBtnStyle(currentPage >= totalPages - 1), borderLeft: '1px solid var(--p-line)' }}
        onClick={handleNext}
        disabled={currentPage >= totalPages - 1}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
