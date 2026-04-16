import { useState, useEffect } from 'react'
import type { IEditorCore } from '../../core/interfaces/IEditorCore'
import { Hero } from './Hero'
import { UploadWidget } from './UploadWidget'
import { TrustSignals } from './TrustSignals'
import { FeatureCards } from './FeatureCards'
import { HowItWorks } from './HowItWorks'
import { Footer } from './Footer'

interface LandingPageProps {
  editorCore: IEditorCore
}

export function LandingPage({ editorCore }: LandingPageProps) {
  const [error, setError] = useState<string | null>(null)
  const [shakeError, setShakeError] = useState(false)

  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault()
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', prevent)
    return () => {
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', prevent)
    }
  }, [])

  const handleError = (msg: string) => {
    setError(msg)
    setShakeError(true)
    setTimeout(() => setShakeError(false), 400)
  }

  return (
    <div className="lumen-bg noise-bg w-full min-h-full overflow-y-auto overflow-x-hidden relative">
      {/* ===== Navigation ===== */}
      <nav
        className="relative z-20 w-full flex justify-between items-center"
        style={{ padding: '20px 32px' }}
      >
        <div className="flex items-center" style={{ gap: '12px' }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: '36px',
              height: '36px',
              background: 'var(--ink-coin)',
              border: '3px solid var(--ink-black)',
              boxShadow:
                'inset -3px -3px 0 0 var(--ink-coin-dark), inset 3px 3px 0 0 #FFF07A, 2px 2px 0 0 var(--ink-black)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '14px',
                color: 'var(--ink-black)',
                textShadow: '1px 1px 0 rgba(255, 255, 255, 0.4)',
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
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="pixel-btn pixel-btn-ghost"
          style={{ fontSize: '9px', padding: '10px 14px' }}
        >
          GITHUB
        </a>
      </nav>

      {/* ===== Hero Section ===== */}
      <div
        className="relative z-10 w-full flex flex-col items-center"
        style={{ padding: '64px 32px 96px' }}
      >
        <Hero />

        {/* Upload Widget */}
        <div
          className="w-full max-w-xl animate-entrance"
          style={{ animationDelay: '550ms', '--slide-y': '24px', marginTop: '52px' } as React.CSSProperties}
        >
          <UploadWidget
            editorCore={editorCore}
            onLoadStart={() => setError(null)}
            onError={handleError}
          />

          {error && (
            <div
              className={`w-full text-center ${shakeError ? 'animate-shake' : ''}`}
              style={{ marginTop: '24px' }}
              role="alert"
            >
              <div
                className="inline-block"
                style={{
                  background: 'var(--ink-danger)',
                  color: 'var(--ink-paper)',
                  border: '3px solid var(--ink-black)',
                  boxShadow: '3px 3px 0 0 var(--ink-black)',
                  padding: '12px 20px',
                  fontFamily: 'var(--font-pixel-body)',
                  fontSize: '15px',
                }}
              >
                ⚠ {error}
              </div>
            </div>
          )}
        </div>

        {/* Trust Signals */}
        <div style={{ marginTop: '48px' }}>
          <TrustSignals />
        </div>
      </div>

      {/* ===== Below the fold ===== */}
      <div className="relative z-10 w-full" style={{ paddingBottom: '64px' }}>
        <FeatureCards />
        <HowItWorks />
        <Footer />
      </div>
    </div>
  )
}
