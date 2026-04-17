import { useState, useEffect } from 'react'
import { useUIStore } from './store/uiStore'
import { LandingPage } from './components/landing/LandingPage'
import { Header } from './components/layout/Header'
import { EditorCanvas } from './components/editor/EditorCanvas'
import { PasswordModal } from './components/upload/PasswordModal'
import { PageNavigator } from './components/layout/PageNavigator'
import { Inky } from './components/mascot'
import { useEditorCore } from './hooks/useEditorCore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useSfx } from './hooks/useSfx'

function App() {
  const documentLoaded = useUIStore((s) => s.documentLoaded)
  const showPasswordModal = useUIStore((s) => s.showPasswordModal)
  const editorCore = useEditorCore()
  const { play } = useSfx()

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
      play('powerUp')
      const timer = setTimeout(() => {
        setShowEditor(true)
        setIsExiting(false)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setShowEditor(false)
      setIsExiting(false)
    }
  }, [documentLoaded, play])

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

  // Mobile warning — pixel version
  if (isMobile) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center overflow-hidden relative lumen-bg"
        style={{ padding: '32px 24px' }}
      >
        {/* Floating clouds */}
        <div className="pixel-cloud" style={{ top: '12%', left: '8%', animation: 'float 6s steps(6) infinite' }} />
        <div
          className="pixel-cloud"
          style={{
            top: '22%',
            right: '10%',
            width: '64px',
            height: '28px',
            animation: 'float 8s steps(6) infinite',
            animationDelay: '-2s',
          }}
        />

        {/* Logo */}
        <div
          className="flex items-center animate-fade-in"
          style={{ gap: '12px', marginBottom: '36px', zIndex: 2 }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              background: 'var(--ink-coin)',
              border: '3px solid var(--ink-black)',
              boxShadow: 'inset -3px -3px 0 0 var(--ink-coin-dark), inset 3px 3px 0 0 #FFF07A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '14px',
                color: 'var(--ink-black)',
              }}
            >
              P
            </span>
          </div>
          <span
            style={{
              color: 'var(--ink-black)',
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              letterSpacing: '0.05em',
            }}
          >
            PDFINE
          </span>
        </div>

        {/* Card */}
        <div
          className="animate-entrance relative z-10 w-full max-w-sm"
          style={{ '--slide-y': '20px' } as React.CSSProperties}
        >
          <div
            style={{
              background: 'var(--ink-paper)',
              padding: '36px 28px',
              border: '4px solid var(--ink-black)',
              boxShadow: '6px 6px 0 0 var(--ink-black)',
              textAlign: 'center',
            }}
          >
            {/* Inky confused */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <Inky action="confused" size={5} />
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '14px',
                color: 'var(--ink-black)',
                letterSpacing: '0.05em',
                marginBottom: '12px',
              }}
            >
              DESKTOP ONLY!
            </h2>

            <p
              style={{
                fontFamily: 'var(--font-pixel-body)',
                fontSize: '15px',
                lineHeight: 1.55,
                color: 'var(--ink-brick-dark)',
                marginBottom: '22px',
              }}
            >
              Pdfine uses canvas-based editing that requires a larger screen. Open this page on your computer for the full adventure.
            </p>

            <div
              style={{
                height: '3px',
                background: 'var(--ink-black)',
                marginBottom: '18px',
              }}
            />

            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '8px',
                color: 'var(--ink-brick-dark)',
                letterSpacing: '0.08em',
              }}
            >
              📎 COPY URL → OPEN ON DESKTOP
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Editor view
  return (
    <div
      className="w-full h-full flex flex-col relative"
      style={{ background: 'var(--ink-brick-deep)' }}
    >
      <div className="animate-fade-in">
        <Header editorCore={editorCore} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0">
            <EditorCanvas editorCore={editorCore} />
          </div>

          {/* Inky mascot — bottom-left corner of editor, idle */}
          <div
            className="absolute z-10 pointer-events-none"
            style={{
              bottom: '16px',
              left: '16px',
              animation: 'fadeSlideInBottom 0.4s steps(4) 400ms forwards',
              opacity: 0,
            }}
          >
            <Inky action="idle" size={3} autoFidget />
          </div>

          {/* Page Navigator */}
          <div
            className="absolute bottom-4 right-4 z-10"
            style={{ animation: 'fadeSlideInBottom 0.4s steps(4) 250ms forwards', opacity: 0 }}
          >
            <PageNavigator editorCore={editorCore} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
