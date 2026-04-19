import { useEffect, useRef } from 'react'
import { useUIStore } from '../store/uiStore'
import { EditorCore } from '../core/EditorCore'
import type { IEditorCore } from '../core/interfaces/IEditorCore'

export function useEditorCore(): IEditorCore {
  const editorRef = useRef<IEditorCore | null>(null)

  if (!editorRef.current) {
    editorRef.current = new EditorCore()
  }

  const editorCore = editorRef.current

  useEffect(() => {
    const store = useUIStore.getState()
    const unsubs: Array<() => void> = []

    unsubs.push(
      editorCore.on('documentLoaded', ({ pageCount }) => {
        store.setDocumentLoaded(true, pageCount)
      })
    )

    unsubs.push(
      editorCore.on('historyChanged', ({ canUndo, canRedo }) => {
        store.setCanUndo(canUndo)
        store.setCanRedo(canRedo)
      })
    )

    unsubs.push(
      editorCore.on('overflow', ({ blockId, state }) => {
        const current = useUIStore.getState().overflowWarnings
        let next = current
        if (state.status === 'overflowing' && !current.includes(blockId)) {
          next = [...current, blockId]
        } else if (state.status === 'normal') {
          next = current.filter((id) => id !== blockId)
        }
        if (next !== current) {
          store.setOverflowWarnings(next)
          editorCore.getRenderEngine().setOverflowBlockIds(next)
        }
      })
    )

    unsubs.push(
      editorCore.on('styleAtCursor', ({ style }) => {
        store.setCurrentTextStyle(style)
      })
    )

    unsubs.push(
      editorCore.on('selectionChanged', (data) => {
        store.setSelectedBlockId(data?.blockId ?? null)
      })
    )

    const syncBlockBounds = (pageIdx: number, blockId: string) => {
      const page = editorCore.getPageModel(pageIdx)
      if (!page) return
      const el = page.elements.find((e) => e.type === 'text' && e.id === blockId)
      if (!el) return
      store.setCurrentBlockBounds({ ...el.bounds })
    }

    unsubs.push(
      editorCore.on('editStart', ({ blockId }) => {
        store.setSelectedBlockId(blockId)
        store.setIsEditing(true)
        syncBlockBounds(editorCore.getCurrentPage(), blockId)
      })
    )

    unsubs.push(
      editorCore.on('editEnd', () => {
        store.setIsEditing(false)
        store.setCurrentBlockBounds(null)
      })
    )

    unsubs.push(
      editorCore.on('textChanged', ({ pageIdx, blockId }) => {
        // Reflow may have expanded the block — refresh the inspector's
        // "Block bounds" readout so x/y/w/h stay in sync with what's on the
        // canvas.
        syncBlockBounds(pageIdx, blockId)
      })
    )

    return () => {
      unsubs.forEach((unsub) => unsub())
    }
  }, [editorCore])

  useEffect(() => {
    // Expose EditorCore for E2E testing in development mode
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__EDITOR_CORE__ = editorCore
    }
    return () => {
      editorCore.destroy()
    }
  }, [editorCore])

  return editorCore
}
