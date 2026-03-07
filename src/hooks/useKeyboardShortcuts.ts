import { useEffect } from 'react'
import { useUIStore } from '../store/uiStore'
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../config/constants'
import type { IEditorCore } from '../core/interfaces/IEditorCore'

export function useKeyboardShortcuts(editorCore: IEditorCore) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const isEditing = editorCore.isEditing()

      // Ctrl+Z — undo
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        editorCore.undo()
        return
      }

      // Ctrl+Shift+Z — redo
      if (ctrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        editorCore.redo()
        return
      }

      // Ctrl+S — export
      if (ctrl && e.key === 's') {
        e.preventDefault()
        // Export handled by useExportPdf; we just prevent default browser save
        return
      }

      // Ctrl+Plus — zoom in
      if (ctrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        const zoom = Math.min(editorCore.getZoom() + ZOOM_STEP, MAX_ZOOM)
        editorCore.setZoom(zoom)
        useUIStore.getState().setZoom(zoom)
        return
      }

      // Ctrl+Minus — zoom out
      if (ctrl && e.key === '-') {
        e.preventDefault()
        const zoom = Math.max(editorCore.getZoom() - ZOOM_STEP, MIN_ZOOM)
        editorCore.setZoom(zoom)
        useUIStore.getState().setZoom(zoom)
        return
      }

      // Ctrl+0 — reset zoom
      if (ctrl && e.key === '0') {
        e.preventDefault()
        editorCore.setZoom(1)
        useUIStore.getState().setZoom(1)
        return
      }

      // Escape — exit edit mode / deselect
      if (e.key === 'Escape') {
        editorCore.setActiveTool('select')
        useUIStore.getState().setActiveTool('select')
        return
      }

      // Tool shortcuts — only when not editing text
      if (!isEditing) {
        const toolMap: Record<string, Parameters<typeof editorCore.setActiveTool>[0]> = {
          v: 'select',
          e: 'editText',
          t: 'addText',
        }
        const tool = toolMap[e.key.toLowerCase()]
        if (tool) {
          editorCore.setActiveTool(tool)
          useUIStore.getState().setActiveTool(tool)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editorCore])
}
