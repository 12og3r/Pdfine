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
      <div
        className="w-full h-full flex flex-col items-center justify-center overflow-hidden relative"
        style={{ background: 'var(--bg)', padding: '32px 24px' }}
      >
        {/* Background gradient orbs */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-30%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-20%',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        {/* Logo */}
        <div
          className="flex items-center animate-fade-in"
          style={{ gap: '10px', marginBottom: '48px' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'var(--gradient-accent)',
              boxShadow: '0 2px 10px rgba(99, 102, 241, 0.2)',
            }}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span
            className="text-[15px] font-bold tracking-[-0.02em]"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            Pdfine
          </span>
        </div>

        {/* Card */}
        <div
          className="animate-entrance relative z-10 w-full max-w-sm"
          style={{ '--slide-y': '20px' } as React.CSSProperties}
        >
          <div
            style={{
              position: 'relative',
              background: 'var(--surface)',
              borderRadius: '20px',
              padding: '40px 32px',
              border: '1px solid var(--border-solid)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(99, 102, 241, 0.04)',
              textAlign: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Subtle gradient accent at top */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '60%',
                height: '2px',
                background: 'var(--gradient-accent)',
                borderRadius: '0 0 2px 2px',
              }}
            />

            {/* Icon */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.06))',
                border: '1px solid rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <svg
                style={{ width: '28px', height: '28px', color: '#6366F1' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
              </svg>
            </div>

            {/* Title */}
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                marginBottom: '8px',
              }}
            >
              Built for Desktop
            </h2>

            {/* Description */}
            <p
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'var(--text-secondary)',
                marginBottom: '28px',
              }}
            >
              Pdfine uses canvas-based editing that requires a larger screen. Open this page on your computer for the full experience.
            </p>

            {/* Divider */}
            <div
              style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, var(--border-solid), transparent)',
                marginBottom: '20px',
              }}
            />

            {/* Hint */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <svg
                style={{ width: '14px', height: '14px', color: 'var(--text-ghost)', flexShrink: 0 }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.686a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
              </svg>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                Copy the URL and open it on desktop
              </span>
            </div>
          </div>
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
