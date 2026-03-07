import { useRef, useEffect } from 'react'
import { useUIStore } from '../../store/uiStore'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'

interface TextEditInputProps {
  editorCore: IEditorCore
}

export function TextEditInput({ editorCore }: TextEditInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isEditing = useUIStore((s) => s.isEditing)

  useEffect(() => {
    if (!isEditing) return
    const textarea = textareaRef.current
    if (textarea) {
      textarea.focus()
    }
  }, [isEditing])

  if (!isEditing) return null

  return (
    <textarea
      ref={textareaRef}
      className="absolute w-px h-px opacity-0 overflow-hidden"
      style={{ top: 0, left: 0, caretColor: 'transparent' }}
      autoFocus
      onInput={(e) => editorCore.handleInput(e.nativeEvent as InputEvent)}
      onKeyDown={(e) => editorCore.handleKeyDown(e.nativeEvent)}
      onCompositionStart={(e) => editorCore.handleComposition(e.nativeEvent)}
      onCompositionUpdate={(e) => editorCore.handleComposition(e.nativeEvent)}
      onCompositionEnd={(e) => editorCore.handleComposition(e.nativeEvent)}
    />
  )
}
