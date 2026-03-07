import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement } from 'react'
import { render, act } from '@testing-library/react'
import { useUIStore } from '../../../src/store/uiStore'
import { EditorCanvas } from '../../../src/components/editor/EditorCanvas'
import type { IEditorCore } from '../../../src/core/interfaces/IEditorCore'

function createMockEditorCore(): IEditorCore {
  return {
    loadPdf: vi.fn(),
    getDocument: vi.fn().mockReturnValue(null),
    getCurrentPage: vi.fn().mockReturnValue(0),
    getTotalPages: vi.fn().mockReturnValue(1),
    isEditing: vi.fn().mockReturnValue(true),
    getActiveTool: vi.fn().mockReturnValue('select' as const),
    setActiveTool: vi.fn(),
    setCurrentPage: vi.fn(),
    getPageModel: vi.fn().mockReturnValue(null),
    setViewport: vi.fn(),
    getViewport: vi.fn().mockReturnValue({ scale: 1, offsetX: 0, offsetY: 0, width: 800, height: 600 }),
    setZoom: vi.fn(),
    getZoom: vi.fn().mockReturnValue(1),
    bindCanvas: vi.fn(),
    render: vi.fn(),
    handleCanvasMouseDown: vi.fn(),
    handleCanvasMouseMove: vi.fn(),
    handleCanvasMouseUp: vi.fn(),
    handleCanvasDoubleClick: vi.fn(),
    handleInput: vi.fn(),
    handleKeyDown: vi.fn(),
    handleComposition: vi.fn(),
    addTextBlock: vi.fn(),
    deleteElement: vi.fn(),
    moveElement: vi.fn(),
    applyTextStyle: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: vi.fn().mockReturnValue(false),
    canRedo: vi.fn().mockReturnValue(false),
    validateForExport: vi.fn(),
    exportPdf: vi.fn(),
    on: vi.fn().mockReturnValue(() => {}),
    getFontManager: vi.fn(),
    getLayoutEngine: vi.fn(),
    getRenderEngine: vi.fn(),
    getEditEngine: vi.fn().mockReturnValue({
      getEditingBlockId: vi.fn().mockReturnValue(null),
      exitEditMode: vi.fn(),
      isEditing: vi.fn().mockReturnValue(false),
    }),
    getExportModule: vi.fn(),
    getCoordinateTransformer: vi.fn(),
    destroy: vi.fn(),
  } as unknown as IEditorCore
}

// Polyfill ResizeObserver for jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('TextEditInput focus retention', () => {
  let mockEditorCore: IEditorCore
  let originalResizeObserver: typeof globalThis.ResizeObserver

  beforeEach(() => {
    originalResizeObserver = globalThis.ResizeObserver
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
    mockEditorCore = createMockEditorCore()
    // Reset the zustand store to defaults
    useUIStore.setState({
      isEditing: false,
      zoom: 1,
      activeTool: 'select',
    })
  })

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver
  })

  it('should call preventDefault on mousedown when editing to retain textarea focus', async () => {
    // Start with editing mode active so TextEditInput renders
    useUIStore.setState({ isEditing: true })

    const { container } = render(
      createElement(EditorCanvas, { editorCore: mockEditorCore })
    )

    const textarea = container.querySelector('textarea')
    expect(textarea).not.toBeNull()

    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()

    // Simulate mousedown on canvas — in a real browser, preventDefault() on
    // mousedown prevents the browser from shifting focus to the clicked element.
    // jsdom doesn't replicate this, so we verify preventDefault was called.
    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    act(() => {
      canvas!.dispatchEvent(mouseDownEvent)
    })

    // The fix calls e.preventDefault() when editorCore.isEditing() is true,
    // which prevents the browser from stealing focus from the textarea.
    expect(mouseDownEvent.defaultPrevented).toBe(true)
  })

  it('should not call preventDefault on mousedown when not editing', () => {
    // When not in editing mode, mousedown should behave normally
    ;(mockEditorCore.isEditing as ReturnType<typeof vi.fn>).mockReturnValue(false)
    useUIStore.setState({ isEditing: false })

    const { container } = render(
      createElement(EditorCanvas, { editorCore: mockEditorCore })
    )

    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()

    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    act(() => {
      canvas!.dispatchEvent(mouseDownEvent)
    })

    // When not editing, default behavior should NOT be prevented
    expect(mouseDownEvent.defaultPrevented).toBe(false)
  })
})
