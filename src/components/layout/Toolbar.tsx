import {
  MousePointer2,
  Type,
  Plus,
  ImageIcon,
  Pen,
  Square,
  Undo2,
  Redo2,
} from 'lucide-react'
import { Tooltip } from '../ui/Tooltip'
import { useUIStore } from '../../store/uiStore'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'
import type { ActiveTool } from '../../types/ui'

interface ToolbarProps {
  editorCore: IEditorCore
}

const tools: Array<{ id: ActiveTool; icon: typeof MousePointer2; label: string }> = [
  { id: 'select', icon: MousePointer2, label: 'Select (V)' },
  { id: 'editText', icon: Type, label: 'Edit Text (E)' },
  { id: 'addText', icon: Plus, label: 'Add Text (T)' },
  { id: 'image', icon: ImageIcon, label: 'Image' },
  { id: 'draw', icon: Pen, label: 'Draw' },
  { id: 'shape', icon: Square, label: 'Shape' },
]

export function Toolbar({ editorCore }: ToolbarProps) {
  const activeTool = useUIStore((s) => s.activeTool)
  const setActiveTool = useUIStore((s) => s.setActiveTool)
  const canUndo = useUIStore((s) => s.canUndo)
  const canRedo = useUIStore((s) => s.canRedo)

  const handleToolClick = (tool: ActiveTool) => {
    setActiveTool(tool)
    editorCore.setActiveTool(tool)
  }

  return (
    <div
      className="flex items-center"
      style={{
        background: 'var(--chrome)',
        border: '1px solid var(--chrome-border)',
        borderRadius: '14px',
        padding: '6px 8px',
        gap: '4px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)',
      }}
    >
      {/* Tool buttons */}
      {tools.map(({ id, icon: Icon, label }) => {
        const isActive = activeTool === id
        return (
          <Tooltip key={id} content={label}>
            <button
              className="cursor-pointer transition-all duration-200 flex items-center justify-center"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: isActive ? 'var(--gradient-accent)' : 'transparent',
                color: isActive ? 'white' : 'var(--chrome-text-muted)',
                boxShadow: isActive ? '0 2px 12px rgba(99, 102, 241, 0.3)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--chrome-hover)'
                  e.currentTarget.style.color = 'var(--chrome-text)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--chrome-text-muted)'
                }
              }}
              onClick={() => handleToolClick(id)}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        )
      })}

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '18px',
          background: 'var(--chrome-border)',
          margin: '0 6px',
        }}
      />

      {/* Undo / Redo */}
      <Tooltip content="Undo (Ctrl+Z)">
        <button
          className="cursor-pointer transition-all duration-200 flex items-center justify-center disabled:opacity-20 disabled:cursor-default"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            color: 'var(--chrome-text-muted)',
          }}
          disabled={!canUndo}
          onMouseEnter={(e) => { if (canUndo) { e.currentTarget.style.background = 'var(--chrome-hover)'; e.currentTarget.style.color = 'var(--chrome-text)' } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--chrome-text-muted)' }}
          onClick={() => editorCore.undo()}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
      </Tooltip>
      <Tooltip content="Redo (Ctrl+Shift+Z)">
        <button
          className="cursor-pointer transition-all duration-200 flex items-center justify-center disabled:opacity-20 disabled:cursor-default"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            color: 'var(--chrome-text-muted)',
          }}
          disabled={!canRedo}
          onMouseEnter={(e) => { if (canRedo) { e.currentTarget.style.background = 'var(--chrome-hover)'; e.currentTarget.style.color = 'var(--chrome-text)' } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--chrome-text-muted)' }}
          onClick={() => editorCore.redo()}
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </Tooltip>
    </div>
  )
}
