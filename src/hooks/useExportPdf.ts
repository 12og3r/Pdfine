import { useCallback } from 'react'
import { useUIStore } from '../store/uiStore'
import type { IEditorCore } from '../core/interfaces/IEditorCore'

export function useExportPdf(editorCore: IEditorCore) {
  const isExporting = useUIStore((s) => s.isExporting)
  const progress = useUIStore((s) => s.exportProgress)
  const setIsExporting = useUIStore((s) => s.setIsExporting)
  const setExportProgress = useUIStore((s) => s.setExportProgress)
  const fileName = useUIStore((s) => s.fileName)

  const exportPdf = useCallback(async () => {
    const validation = editorCore.validateForExport()

    if (validation.warnings.length > 0) {
      const proceed = window.confirm(
        `Export warnings:\n${validation.warnings.join('\n')}\n\nContinue anyway?`
      )
      if (!proceed) return
    }

    setIsExporting(true)
    setExportProgress(0)

    try {
      const data = await editorCore.exportPdf((p) => {
        setExportProgress(p)
      })

      const blob = new Blob([data as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.replace(/\.pdf$/i, '') + '_edited.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }, [editorCore, fileName, setIsExporting, setExportProgress])

  return { exportPdf, isExporting, progress }
}
