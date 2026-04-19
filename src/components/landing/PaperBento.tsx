import type { CSSProperties, ReactNode } from 'react'
import { Shield } from 'lucide-react'

export function PaperBento() {
  return (
    <main
      id="features"
      style={{ padding: '40px 32px 40px', maxWidth: 1280, margin: '0 auto' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 36,
          paddingBottom: 16,
          borderBottom: '1px solid var(--p-line)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--p-serif)',
            fontSize: 'clamp(32px, 4vw, 48px)',
            letterSpacing: '-0.02em',
            margin: 0,
            fontWeight: 400,
          }}
        >
          A small set of{' '}
          <span style={{ fontStyle: 'italic', color: 'var(--p-accent)' }}>very good</span> tools.
        </h2>
        <span
          style={{
            fontFamily: 'var(--pdfine-mono)',
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--p-ink-3)',
          }}
        >
          § Capabilities
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gridAutoRows: 'minmax(180px, auto)',
          gap: 14,
        }}
      >
        <BentoCard
          style={{ gridColumn: 'span 4', gridRow: 'span 2', padding: 0, overflow: 'hidden' }}
        >
          <div style={{ padding: '24px 28px 16px 28px' }}>
            <div
              style={{
                fontFamily: 'var(--pdfine-mono)',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--p-accent)',
              }}
            >
              01 — Edit the original
            </div>
            <h3
              style={{
                fontFamily: 'var(--p-serif)',
                fontSize: 30,
                letterSpacing: '-0.02em',
                margin: '10px 0 6px',
                fontWeight: 400,
              }}
            >
              Rewrite in place, keep the typesetting.
            </h3>
            <p style={{ fontSize: 14, color: 'var(--p-ink-3)', margin: 0, maxWidth: 440 }}>
              Double-click any paragraph. We recompose it using the document's own fonts and
              measurements.
            </p>
          </div>
          <div style={{ position: 'relative', padding: '10px 28px 28px' }}>
            <MiniEditScreen />
          </div>
        </BentoCard>

        <BentoCard
          style={{
            gridColumn: 'span 2',
            gridRow: 'span 1',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--pdfine-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--p-warm)',
            }}
          >
            02 — Local-first
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--p-serif)',
                fontSize: 56,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                color: 'var(--p-warm)',
              }}
            >
              0
            </div>
            <div style={{ fontSize: 13, color: 'var(--p-ink-3)', marginTop: 4 }}>
              bytes leave your device
            </div>
          </div>
          <Shield size={22} strokeWidth={1.5} />
        </BentoCard>

        <BentoCard style={{ gridColumn: 'span 2', gridRow: 'span 1' }}>
          <div
            style={{
              fontFamily: 'var(--pdfine-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--p-gold)',
            }}
          >
            03 — Typography
          </div>
          <h3
            style={{
              fontFamily: 'var(--p-serif)',
              fontSize: 22,
              letterSpacing: '-0.015em',
              margin: '12px 0 8px',
              fontWeight: 400,
            }}
          >
            Fonts stay.
          </h3>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: 'var(--p-accent)' }}>
              Aa
            </span>
            <span style={{ fontFamily: 'var(--p-sans)', fontSize: 28, color: 'var(--p-warm)' }}>
              Aa
            </span>
            <span
              style={{ fontFamily: 'var(--pdfine-mono)', fontSize: 24, color: 'var(--p-plum)' }}
            >
              Aa
            </span>
          </div>
        </BentoCard>

        <BentoCard style={{ gridColumn: 'span 3', gridRow: 'span 1' }}>
          <div
            style={{
              fontFamily: 'var(--pdfine-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--p-plum)',
            }}
          >
            04 — Export
          </div>
          <h3
            style={{
              fontFamily: 'var(--p-serif)',
              fontSize: 22,
              letterSpacing: '-0.015em',
              margin: '12px 0 8px',
              fontWeight: 400,
            }}
          >
            Vector out, not a screenshot.
          </h3>
          <p style={{ fontSize: 13, color: 'var(--p-ink-3)', margin: 0 }}>
            Fonts are embedded. Text stays selectable. File size barely moves.
          </p>
        </BentoCard>

        <BentoCard style={{ gridColumn: 'span 3', gridRow: 'span 1' }}>
          <div
            style={{
              fontFamily: 'var(--pdfine-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--p-accent)',
            }}
          >
            05 — Reflow
          </div>
          <h3
            style={{
              fontFamily: 'var(--p-serif)',
              fontSize: 22,
              letterSpacing: '-0.015em',
              margin: '12px 0 8px',
              fontWeight: 400,
            }}
          >
            Lines break like the original.
          </h3>
          <p style={{ fontSize: 13, color: 'var(--p-ink-3)', margin: 0 }}>
            Greedy while typing, Knuth-Plass on export. You won't notice the switch.
          </p>
        </BentoCard>
      </div>

      <div
        style={{
          marginTop: 28,
          fontSize: 12,
          color: 'var(--p-ink-3)',
          fontFamily: 'var(--pdfine-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Fig. 02 — Feature map</span>
        <span>Edition 2026 · Open Source, GPL v3</span>
      </div>
    </main>
  )
}

function BentoCard({ style, children }: { style?: CSSProperties; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--p-paper)',
        border: '1px solid var(--p-line)',
        borderRadius: 2,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function MiniEditScreen() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--p-line)',
        borderRadius: 2,
        padding: '20px 28px',
        fontFamily: 'Georgia, serif',
        fontSize: 13,
        color: 'var(--p-ink)',
        lineHeight: 1.6,
        boxShadow: '0 10px 30px -15px rgba(0,0,0,0.2)',
        position: 'relative',
      }}
    >
      <p style={{ margin: 0 }}>
        Client shall pay Consultant the fees set forth in each Statement of Work. Unless otherwise
        specified, invoices are due within thirty (30) days of receipt. Late payments accrue
        interest at a rate of{' '}
        <span
          style={{
            background: 'var(--p-accent-2)',
            boxShadow: '0 0 0 1px rgba(26,23,21,0.3)',
            padding: '0 2px',
          }}
        >
          1.5%<span className="paper-caret" />
        </span>{' '}
        per month.
      </p>
      <div
        style={{
          position: 'absolute',
          top: -10,
          left: 16,
          background: 'var(--p-ink)',
          color: 'var(--p-paper)',
          padding: '2px 8px',
          fontFamily: 'var(--pdfine-mono)',
          fontSize: 10,
          letterSpacing: '0.06em',
        }}
      >
        EDITING · §2 Compensation
      </div>
    </div>
  )
}
