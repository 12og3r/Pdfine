import { create } from 'zustand'
import type { UIState, ActiveTool } from '../types/ui'
import type { TextStyle } from '../types/document'

export const useUIStore = create<UIState>((set) => ({
  activeTool: 'select',
  zoom: 1,
  currentPage: 0,
  totalPages: 0,
  propertyPanelOpen: true,
  isExporting: false,
  exportProgress: 0,
  documentLoaded: false,
  showPasswordModal: false,
  pendingPdfData: null,
  fileName: '',

  selectedBlockId: null,
  currentTextStyle: null,
  overflowWarnings: [],
  canUndo: false,
  canRedo: false,
  isEditing: false,

  setActiveTool: (tool: ActiveTool) => set({ activeTool: tool }),
  setZoom: (zoom: number) => set({ zoom }),
  setCurrentPage: (page: number) => set({ currentPage: page }),
  setDocumentLoaded: (loaded: boolean, totalPages?: number) =>
    set({ documentLoaded: loaded, totalPages: totalPages ?? 0 }),
  setShowPasswordModal: (show: boolean) => set({ showPasswordModal: show }),
  setPendingPdfData: (data: ArrayBuffer | null) => set({ pendingPdfData: data }),
  setFileName: (name: string) => set({ fileName: name }),
  setSelectedBlockId: (id: string | null) => set({ selectedBlockId: id }),
  setCurrentTextStyle: (style: TextStyle | null) => set({ currentTextStyle: style }),
  setOverflowWarnings: (warnings: string[]) => set({ overflowWarnings: warnings }),
  setCanUndo: (canUndo: boolean) => set({ canUndo }),
  setCanRedo: (canRedo: boolean) => set({ canRedo }),
  setIsExporting: (isExporting: boolean) => set({ isExporting }),
  setExportProgress: (exportProgress: number) => set({ exportProgress }),
  setIsEditing: (isEditing: boolean) => set({ isEditing }),
}))
