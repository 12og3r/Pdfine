interface PaperPrivacyTeaserProps {
  onReadMore: () => void
}

export function PaperPrivacyTeaser({ onReadMore }: PaperPrivacyTeaserProps) {
  return (
    <>
      <SectionRule label="§ III — Privacy, in detail" />

      <section
        style={{
          padding: '40px 32px 80px',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
            gap: 56,
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--p-serif)',
                fontSize: 'clamp(36px, 4.5vw, 56px)',
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
                margin: 0,
                fontWeight: 400,
              }}
            >
              Your file never
              <br />
              <span style={{ fontStyle: 'italic', color: 'var(--p-accent)' }}>
                reaches a server
              </span>
              .
            </h2>
            <p
              style={{
                marginTop: 20,
                fontSize: 16,
                lineHeight: 1.6,
                color: 'var(--p-ink-2)',
                maxWidth: 520,
              }}
            >
              Parsing, reflow, and export all happen inside this browser tab. There is no account
              to breach, no log to subpoena, no vendor to trust. You can go offline and keep
              working.
            </p>
            <div style={{ marginTop: 28, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="paper-btn" onClick={onReadMore}>
                How it works
                <span style={{ fontFamily: 'var(--pdfine-mono)', fontSize: 13 }}>→</span>
              </button>
              <span
                style={{
                  fontFamily: 'var(--pdfine-mono)',
                  fontSize: 11,
                  color: 'var(--p-ink-3)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                GPL v3 · Audit the source
              </span>
            </div>
          </div>

          <div
            style={{
              background: 'var(--p-paper)',
              border: '1px solid var(--p-line)',
              padding: 28,
              position: 'relative',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--pdfine-mono)',
                fontSize: 10,
                color: 'var(--p-ink-3)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                marginBottom: 18,
              }}
            >
              Data path
            </div>
            <svg
              viewBox="0 0 500 180"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              aria-label="Data flows from PDF through Pdfine WASM to exported PDF, with no server involvement"
            >
              <defs>
                <marker
                  id="fl-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto"
                >
                  <path d="M0 0 L10 5 L0 10 z" fill="var(--p-ink)" />
                </marker>
              </defs>
              <rect x="10" y="30" width="360" height="130" fill="none" stroke="var(--p-ink)" strokeWidth="1.2" />
              <text
                x="20"
                y="50"
                fontFamily="var(--pdfine-mono)"
                fontSize="10"
                fill="var(--p-ink-3)"
                letterSpacing="0.08em"
              >
                BROWSER TAB
              </text>

              <rect x="30" y="80" width="80" height="55" fill="var(--p-bg-2)" stroke="var(--p-ink)" strokeWidth="1" />
              <text x="70" y="105" fontFamily="var(--p-serif)" fontSize="14" textAnchor="middle" fill="var(--p-ink)">
                PDF
              </text>
              <text x="70" y="122" fontFamily="var(--pdfine-mono)" fontSize="8" textAnchor="middle" fill="var(--p-ink-3)">
                input
              </text>

              <rect
                x="160"
                y="70"
                width="90"
                height="75"
                fill="var(--p-accent-2)"
                stroke="var(--p-accent)"
                strokeWidth="1.5"
              />
              <text x="205" y="100" fontFamily="var(--p-serif)" fontSize="14" textAnchor="middle" fill="var(--p-accent)">
                Pdfine
              </text>
              <text
                x="205"
                y="120"
                fontFamily="var(--pdfine-mono)"
                fontSize="8"
                textAnchor="middle"
                fill="var(--p-accent)"
              >
                WASM
              </text>

              <rect x="290" y="80" width="70" height="55" fill="var(--p-bg-2)" stroke="var(--p-ink)" strokeWidth="1" />
              <text x="325" y="105" fontFamily="var(--p-serif)" fontSize="14" textAnchor="middle" fill="var(--p-ink)">
                PDF′
              </text>
              <text x="325" y="122" fontFamily="var(--pdfine-mono)" fontSize="8" textAnchor="middle" fill="var(--p-ink-3)">
                output
              </text>

              <line x1="110" y1="108" x2="158" y2="108" stroke="var(--p-ink)" strokeWidth="1.5" markerEnd="url(#fl-arrow)" />
              <line x1="250" y1="108" x2="288" y2="108" stroke="var(--p-ink)" strokeWidth="1.5" markerEnd="url(#fl-arrow)" />

              <line
                x1="370"
                y1="108"
                x2="405"
                y2="108"
                stroke="var(--p-warm)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x="440"
                y="102"
                fontFamily="var(--p-serif)"
                fontSize="14"
                fontStyle="italic"
                textAnchor="middle"
                fill="var(--p-warm)"
              >
                server
              </text>
              <line x1="410" y1="90" x2="470" y2="130" stroke="var(--p-warm)" strokeWidth="1.5" />
              <line x1="470" y1="90" x2="410" y2="130" stroke="var(--p-warm)" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </section>
    </>
  )
}

function SectionRule({ label }: { label: string }) {
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <span style={{ flex: 1, height: 1, background: 'var(--p-line)' }} />
      <span
        style={{
          fontFamily: 'var(--pdfine-mono)',
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--p-ink-3)',
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--p-line)' }} />
    </div>
  )
}
