import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'
import { useSfx } from '../../hooks/useSfx'

interface PageNavigatorProps {
  editorCore: IEditorCore
}

export function PageNavigator({ editorCore }: PageNavigatorProps) {
  const currentPage = useUIStore((s) => s.currentPage)
  const totalPages = useUIStore((s) => s.totalPages)
  const { play } = useSfx()

  if (totalPages <= 1) return null

  const handlePrev = () => {
    if (currentPage > 0) {
      const next = currentPage - 1
      useUIStore.getState().setCurrentPage(next)
      editorCore.setCurrentPage(next)
      play('click')
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      const next = currentPage + 1
      useUIStore.getState().setCurrentPage(next)
      editorCore.setCurrentPage(next)
      play('click')
    }
  }

  const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: disabled ? 'var(--ink-brick-deep)' : 'var(--ink-brick-dark)',
    color: disabled ? 'var(--text-ghost)' : 'var(--ink-coin)',
    border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--ink-brick-deep)',
        border: '3px solid var(--ink-black)',
        boxShadow: '4px 4px 0 0 var(--ink-black)',
      }}
    >
      <button
        aria-label="Previous page"
        style={{
          ...navBtnStyle(currentPage === 0),
          borderRight: '2px solid var(--ink-black)',
        }}
        onClick={handlePrev}
        disabled={currentPage === 0}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span
        className="tabular-nums select-none"
        style={{
          color: 'var(--ink-coin)',
          fontFamily: 'var(--font-display)',
          fontSize: '10px',
          padding: '0 12px',
          minWidth: '4rem',
          textAlign: 'center',
        }}
      >
        {currentPage + 1} / {totalPages}
      </span>
      <button
        aria-label="Next page"
        style={{
          ...navBtnStyle(currentPage >= totalPages - 1),
          borderLeft: '2px solid var(--ink-black)',
        }}
        onClick={handleNext}
        disabled={currentPage >= totalPages - 1}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
