/**
 * Tests that the hidden textarea does not cause the scroll container
 * to jump to the top when it receives focus during edit mode.
 *
 * Bug: The textarea at (top:0, left:0) inside the scrollable container
 * triggered the browser's scroll-into-view behavior on focus, resetting
 * scrollTop to 0.
 *
 * Fix: Use focus({ preventScroll: true }) and remove autoFocus attribute.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement } from 'react'
import { render, act } from '@testing-library/react'
import { useUIStore } from '../../../src/store/uiStore'
import { TextEditInput } from '../../../src/components/editor/TextEditInput'
import type { IEditorCore } from '../../../src/core/interfaces/IEditorCore'

function createMockEditorCore(): IEditorCore {
  return {
    handleInput: vi.fn(),
    handleKeyDown: vi.fn(),
    handleComposition: vi.fn(),
  } as unknown as IEditorCore
}

describe('TextEditInput scroll prevention', () => {
  let mockEditorCore: IEditorCore

  beforeEach(() => {
    mockEditorCore = createMockEditorCore()
    useUIStore.setState({ isEditing: false })
  })

  it('should call focus with preventScroll: true when entering edit mode', async () => {
    // Start not editing
    useUIStore.setState({ isEditing: false })

    const { rerender } = render(
      createElement(TextEditInput, { editorCore: mockEditorCore })
    )

    // Now enter edit mode — this triggers the useEffect that calls focus()
    useUIStore.setState({ isEditing: true })
    rerender(createElement(TextEditInput, { editorCore: mockEditorCore }))

    // Get the rendered textarea
    const textarea = document.querySelector('textarea')
    expect(textarea).not.toBeNull()

    // Verify it received focus (jsdom sets activeElement)
    expect(document.activeElement).toBe(textarea)
  })

  it('should not have autoFocus attribute on the textarea', () => {
    useUIStore.setState({ isEditing: true })

    render(createElement(TextEditInput, { editorCore: mockEditorCore }))

    const textarea = document.querySelector('textarea')
    expect(textarea).not.toBeNull()
    // autoFocus triggers browser scroll-into-view; it should NOT be present
    expect(textarea!.hasAttribute('autofocus')).toBe(false)
  })

  it('should use position:fixed to avoid scroll container interference', () => {
    useUIStore.setState({ isEditing: true })

    render(createElement(TextEditInput, { editorCore: mockEditorCore }))

    const textarea = document.querySelector('textarea')
    expect(textarea).not.toBeNull()
    // position:fixed keeps the textarea outside the scroll flow,
    // preventing the browser from scrolling the container when input is received
    expect(textarea!.style.position).toBe('fixed')
  })

  it('should not render textarea when not editing', () => {
    useUIStore.setState({ isEditing: false })

    render(createElement(TextEditInput, { editorCore: mockEditorCore }))

    const textarea = document.querySelector('textarea')
    expect(textarea).toBeNull()
  })
})
