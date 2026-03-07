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

  return (
    <div
      className="flex items-center rounded-xl"
      style={{
        background: 'var(--chrome)',
        padding: '5px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)',
        border: '1px solid var(--chrome-border)',
      }}
    >
      <button
        className="p-2 rounded-lg disabled:opacity-20 cursor-pointer disabled:cursor-default transition-colors"
        style={{ color: 'var(--chrome-text-muted)' }}
        onMouseEnter={(e) => { if (currentPage > 0) { e.currentTarget.style.background = 'var(--chrome-hover)'; e.currentTarget.style.color = 'var(--chrome-text)' } }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--chrome-text-muted)' }}
        onClick={handlePrev}
        disabled={currentPage === 0}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span
        className="tabular-nums select-none"
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          padding: '0 10px',
          minWidth: '3.5rem',
          textAlign: 'center',
        }}
      >
        {currentPage + 1} / {totalPages}
      </span>
      <button
        className="p-2 rounded-lg disabled:opacity-20 cursor-pointer disabled:cursor-default transition-colors"
        style={{ color: 'var(--chrome-text-muted)' }}
        onMouseEnter={(e) => { if (currentPage < totalPages - 1) { e.currentTarget.style.background = 'var(--chrome-hover)'; e.currentTarget.style.color = 'var(--chrome-text)' } }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--chrome-text-muted)' }}
        onClick={handleNext}
        disabled={currentPage >= totalPages - 1}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
