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
        className="relative z-20 w-full flex justify-between items-center max-w-screen-xl mx-auto"
        style={{ padding: '24px 32px' }}
      >
        <div className="flex items-center gap-2.5">
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
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="text-[13px] font-medium tracking-wide uppercase transition-all duration-200"
          style={{
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent)'
            e.currentTarget.style.borderColor = 'var(--border-accent)'
            e.currentTarget.style.background = 'var(--accent-soft)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.borderColor = 'transparent'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          GitHub
        </a>
      </nav>

      {/* ===== Hero Section ===== */}
      <div
        className="relative z-10 w-full max-w-screen-xl mx-auto flex flex-col items-center"
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
            <div className={`w-full text-center ${shakeError ? 'animate-shake' : ''}`} style={{ marginTop: '20px' }} role="alert">
              <div
                className="inline-block text-sm font-medium"
                style={{
                  background: 'var(--error-soft)',
                  color: 'var(--error)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  borderRadius: '10px',
                  padding: '10px 20px',
                }}
              >
                {error}
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
