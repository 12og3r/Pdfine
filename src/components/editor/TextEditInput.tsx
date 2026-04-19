import { useRef, useEffect } from 'react'
import { useUIStore } from '../../store/uiStore'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'

interface TextEditInputProps {
  editorCore: IEditorCore
}

export function TextEditInput({ editorCore }: TextEditInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isEditing = useUIStore((s) => s.isEditing)
  // editFocusTick is a counter bumped by `uiStore.requestEditFocus()` — any
  // panel interaction that may have stolen focus from the textarea (color
  // picker, font dropdown, numeric size input) calls it, re-running this
  // effect and restoring focus so typing resumes immediately.
  const editFocusTick = useUIStore((s) => s.editFocusTick)

  useEffect(() => {
    if (!isEditing) return
    const textarea = textareaRef.current
    if (textarea) {
      textarea.focus({ preventScroll: true })
    }
  }, [isEditing, editFocusTick])

  if (!isEditing) return null

  return (
    <textarea
      ref={textareaRef}
      className="w-px h-px opacity-0 overflow-hidden"
      style={{ position: 'fixed', top: 0, left: 0, caretColor: 'transparent' }}
      onInput={(e) => editorCore.handleInput(e.nativeEvent as InputEvent)}
      onKeyDown={(e) => editorCore.handleKeyDown(e.nativeEvent)}
      onCompositionStart={(e) => editorCore.handleComposition(e.nativeEvent)}
      onCompositionUpdate={(e) => editorCore.handleComposition(e.nativeEvent)}
      onCompositionEnd={(e) => editorCore.handleComposition(e.nativeEvent)}
    />
  )
}
