import type { ReactNode } from 'react'

interface PaperHeroProps {
  onReadMore: () => void
  uploadSlot: ReactNode
}

export function PaperHero({ onReadMore, uploadSlot }: PaperHeroProps) {
  return (
    <main
      style={{
        padding: '56px 32px 24px',
        maxWidth: 1280,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 48,
        minHeight: 'calc(100vh - 63px)',
        boxSizing: 'border-box',
      }}
    >
      {/* Top — pill + headline */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 6px 6px 14px',
              border: '1px solid var(--p-accent)',
              borderRadius: 999,
              fontSize: 13,
              color: 'var(--p-accent)',
              background: 'var(--p-accent-2)',
            }}
          >
            Privacy is the feature.
            <button
              onClick={onReadMore}
              style={{
                fontFamily: 'var(--pdfine-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                padding: '3px 8px',
                borderRadius: 999,
                background: 'var(--p-warm)',
                color: 'var(--p-paper)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              READ MORE →
            </button>
          </div>
        </div>

        <h1
          style={{
            fontFamily: 'var(--p-serif)',
            fontWeight: 400,
            fontSize: 'clamp(48px, 7vw, 104px)',
            lineHeight: 0.95,
            letterSpacing: '-0.035em',
            textAlign: 'center',
            margin: 0,
            color: 'var(--p-ink)',
          }}
        >
          Edit PDFs,
          <br />
          <span style={{ fontStyle: 'italic', color: 'var(--p-accent)' }}>
            on your own <span style={{ color: 'var(--p-warm)' }}>machine</span>.
          </span>
        </h1>
      </div>

      {/* Middle — upload widget */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>{uploadSlot}</div>

      {/* Scroll hint */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'var(--pdfine-mono)',
          fontSize: 10,
          color: 'var(--p-ink-3)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          paddingTop: 24,
        }}
      >
        <span style={{ display: 'inline-block', width: 32, height: 1, background: 'var(--p-ink-3)' }} />
        Scroll · Capabilities below
        <span style={{ display: 'inline-block', width: 32, height: 1, background: 'var(--p-ink-3)' }} />
      </div>
    </main>
  )
}
