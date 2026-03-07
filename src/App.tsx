import { useState, useEffect } from 'react'
import { useUIStore } from './store/uiStore'
import { LandingPage } from './components/landing/LandingPage'
import { Header } from './components/layout/Header'
import { Toolbar } from './components/layout/Toolbar'
import { EditorCanvas } from './components/editor/EditorCanvas'
import { PasswordModal } from './components/upload/PasswordModal'
import { PageNavigator } from './components/layout/PageNavigator'
import { useEditorCore } from './hooks/useEditorCore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function App() {
  const documentLoaded = useUIStore((s) => s.documentLoaded)
  const showPasswordModal = useUIStore((s) => s.showPasswordModal)
  const editorCore = useEditorCore()

  const [showEditor, setShowEditor] = useState(documentLoaded)
  const [isExiting, setIsExiting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (documentLoaded) {
      setIsExiting(true)
      const timer = setTimeout(() => {
        setShowEditor(true)
        setIsExiting(false)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setShowEditor(false)
      setIsExiting(false)
    }
  }, [documentLoaded])

  useKeyboardShortcuts(editorCore)

  // Landing page
  if (!showEditor) {
    return (
      <div className={`w-full h-full ${isExiting ? 'animate-card-exit' : ''}`}>
        <LandingPage editorCore={editorCore} />
        {showPasswordModal && <PasswordModal editorCore={editorCore} />}
      </div>
    )
  }

  // Mobile warning
  if (isMobile) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 animate-fade-in" style={{ background: 'var(--bg)' }}>
        <div className="p-8 rounded-2xl max-w-sm text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border-solid)', boxShadow: 'var(--shadow-lg)' }}>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--gradient-subtle)' }}
          >
            <svg className="w-6 h-6" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 tracking-[-0.02em]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Desktop Only
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Pdfine works best on desktop. Please visit on a computer for the full experience.
          </p>
        </div>
      </div>
    )
  }

  // Editor view
  return (
    <div className="w-full h-full flex flex-col" style={{ background: 'var(--chrome)' }}>
      <div className="animate-fade-in">
        <Header editorCore={editorCore} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 animate-fade-in" style={{ animationDelay: '80ms' }}>
            <EditorCanvas editorCore={editorCore} />
          </div>

          {/* Floating Toolbar */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
            style={{ animation: 'fadeSlideInBottom 0.4s ease-out 150ms forwards', opacity: 0 }}
          >
            <Toolbar editorCore={editorCore} />
          </div>

          {/* Page Navigator */}
          <div
            className="absolute bottom-4 right-4 z-10"
            style={{ animation: 'fadeSlideInBottom 0.4s ease-out 250ms forwards', opacity: 0 }}
          >
            <PageNavigator editorCore={editorCore} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
