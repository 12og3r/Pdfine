import { useState, useEffect } from 'react'
import { useUIStore } from './store/uiStore'
import { LandingPage } from './components/landing/LandingPage'
import { PaperMark } from './components/landing/PaperTopBar'
import { Header } from './components/layout/Header'
import { PropertyPanel } from './components/layout/PropertyPanel'
import { PagesSidebar } from './components/layout/PagesSidebar'
import { EditorCanvas } from './components/editor/EditorCanvas'
import { PasswordModal } from './components/upload/PasswordModal'
import { PageNavigator } from './components/layout/PageNavigator'
import { ExportDialog } from './components/export/ExportDialog'
import { useEditorCore } from './hooks/useEditorCore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function App() {
  const documentLoaded = useUIStore((s) => s.documentLoaded)
  const showPasswordModal = useUIStore((s) => s.showPasswordModal)
  const editorCore = useEditorCore()

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useKeyboardShortcuts(editorCore)

  // Landing page
  if (!documentLoaded) {
    return (
      <div className="w-full h-full">
        <LandingPage editorCore={editorCore} />
        {showPasswordModal && <PasswordModal editorCore={editorCore} />}
      </div>
    )
  }

  // Mobile warning
  if (isMobile) {
    return (
      <div
        className="paper-theme w-full h-full flex flex-col items-center justify-center"
        style={{ padding: '32px 24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <PaperMark />
          <span style={{ fontFamily: 'var(--p-serif)', fontSize: 26, letterSpacing: '-0.01em' }}>
            Pdfine
          </span>
        </div>
        <div
          style={{
            width: '100%',
            maxWidth: 360,
            background: 'var(--p-paper)',
            border: '1px solid var(--p-line)',
            padding: '32px 28px',
            textAlign: 'center',
            boxShadow: '0 30px 80px -30px rgba(0,0,0,0.35)',
          }}
        >
          <div className="paper-eyebrow" style={{ marginBottom: 12 }}>
            Desktop only
          </div>
          <h2
            style={{
              fontFamily: 'var(--p-serif)',
              fontSize: 28,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            Open this page <span style={{ fontStyle: 'italic', color: 'var(--p-accent)' }}>on a wider screen</span>.
          </h2>
          <p
            style={{
              marginTop: 14,
              fontSize: 14,
              lineHeight: 1.55,
              color: 'var(--p-ink-2)',
            }}
          >
            Pdfine renders PDFs on a canvas that needs more room than a phone offers. Copy this
            URL and open it on your computer.
          </p>
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px dashed var(--p-line)',
              fontFamily: 'var(--pdfine-mono)',
              fontSize: 11,
              color: 'var(--p-ink-3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Copy URL · Open on desktop
          </div>
        </div>
      </div>
    )
  }

  // Editor view
  return (
    <div
      className="paper-theme w-full h-full flex flex-col relative"
      style={{ overflow: 'hidden' }}
    >
      <Header editorCore={editorCore} />

      <div className="flex flex-1 overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
        <PagesSidebar editorCore={editorCore} />
        <div
          className="flex-1 relative overflow-hidden"
          style={{ background: 'var(--p-bg-2)' }}
        >
          <div className="absolute inset-0">
            <EditorCanvas editorCore={editorCore} />
          </div>

          <div className="absolute bottom-4 right-4 z-10">
            <PageNavigator editorCore={editorCore} />
          </div>
        </div>
        <PropertyPanel editorCore={editorCore} />
      </div>

      <ExportDialog editorCore={editorCore} />
    </div>
  )
}

export default App
