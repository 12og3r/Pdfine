interface PaperPrivacyProps {
  onBack: () => void
}

const STACK_ROWS: [string, string][] = [
  ['PDF parser', 'pdf.js 4.x, compiled to WebAssembly'],
  ['Font engine', 'opentype.js for metrics; fonts extracted in-memory'],
  ['Reflow', 'Custom layout engine, no external calls'],
  ['Storage', 'IndexedDB (opt-in); cleared on tab close by default'],
  ['Telemetry', 'None. No analytics library loaded.'],
  ['Crash reports', 'Logged to browser console only'],
]

const COMPARE_ROWS = [
  { name: 'Pdfine', dest: 'Nowhere — stays in tab', ok: true },
  { name: 'Adobe Acrobat Web', dest: 'Adobe servers (US)', ok: false },
  { name: 'SmallPDF', dest: 'SmallPDF servers (CH)', ok: false },
  { name: 'ILovePDF', dest: 'ILovePDF servers (ES)', ok: false },
  { name: 'DocHub', dest: 'Google Cloud', ok: false },
]

const VERIFY_CARDS = [
  {
    n: 'A',
    h: 'Open DevTools → Network tab.',
    p: 'Upload a file. You will see zero outbound requests during parse and export.',
  },
  {
    n: 'B',
    h: 'Go offline.',
    p: 'Disconnect your WiFi. Pdfine keeps working. Same result, no network.',
  },
  {
    n: 'C',
    h: 'Read the source.',
    p: 'Open source under GPL v3. Audit every line, or run your own fork locally.',
  },
]

export function PaperPrivacy({ onBack }: PaperPrivacyProps) {
  return (
    <main style={{ padding: '48px 32px 80px', maxWidth: 1080, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--pdfine-mono)',
          fontSize: 11,
          color: 'var(--p-ink-3)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom: 28,
        }}
      >
        <span>Fig. 02 — Architecture &amp; proofs</span>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            letterSpacing: 'inherit',
            textTransform: 'inherit',
            color: 'var(--p-accent)',
            cursor: 'pointer',
          }}
        >
          ← Back to landing
        </button>
      </div>

      <h1
        style={{
          fontFamily: 'var(--p-serif)',
          fontWeight: 400,
          fontSize: 'clamp(40px, 6vw, 72px)',
          lineHeight: 1.02,
          letterSpacing: '-0.03em',
          margin: 0,
          maxWidth: 860,
        }}
      >
        How we keep your PDF{' '}
        <span style={{ fontStyle: 'italic', color: 'var(--p-accent)' }}>on your machine</span>.
      </h1>
      <p
        style={{
          marginTop: 20,
          fontSize: 17,
          lineHeight: 1.6,
          color: 'var(--p-ink-2)',
          maxWidth: 640,
        }}
      >
        Every operation — parsing, font extraction, reflow, export — runs inside this browser tab.
        There is no server that could leak, no account that could be breached, no logs that could
        be subpoenaed.
      </p>

      <section style={{ marginTop: 56 }}>
        <div
          style={{
            fontFamily: 'var(--pdfine-mono)',
            fontSize: 10,
            color: 'var(--p-ink-3)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          § 1 — Data path
        </div>
        <div
          style={{
            background: 'var(--p-paper)',
            border: '1px solid var(--p-line)',
            padding: '40px 32px',
          }}
        >
          <svg viewBox="0 0 1000 240" style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              <marker
                id="priv-arrow"
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
            <rect x="20" y="20" width="600" height="200" fill="none" stroke="var(--p-ink)" strokeWidth="1.5" />
            <text
              x="32"
              y="42"
              fontFamily="var(--pdfine-mono)"
              fontSize="11"
              fill="var(--p-ink-3)"
              letterSpacing="0.1em"
            >
              YOUR DEVICE · BROWSER TAB
            </text>

            <rect x="60" y="90" width="120" height="80" fill="var(--p-bg-2)" stroke="var(--p-ink)" strokeWidth="1" />
            <text x="120" y="125" fontFamily="var(--p-serif)" fontSize="18" textAnchor="middle" fill="var(--p-ink)">
              PDF
            </text>
            <text x="120" y="148" fontFamily="var(--pdfine-mono)" fontSize="10" textAnchor="middle" fill="var(--p-ink-3)">
              input file
            </text>

            <rect
              x="260"
              y="70"
              width="160"
              height="120"
              fill="var(--p-accent-2)"
              stroke="var(--p-accent)"
              strokeWidth="1.5"
            />
            <text x="340" y="100" fontFamily="var(--p-serif)" fontSize="18" textAnchor="middle" fill="var(--p-accent)">
              Pdfine
            </text>
            <text
              x="340"
              y="120"
              fontFamily="var(--pdfine-mono)"
              fontSize="9"
              textAnchor="middle"
              fill="var(--p-accent)"
              letterSpacing="0.08em"
            >
              WASM · PDF.JS
            </text>
            <text x="340" y="145" fontFamily="var(--pdfine-mono)" fontSize="9" textAnchor="middle" fill="var(--p-ink-2)">
              parse · reflow
            </text>
            <text x="340" y="160" fontFamily="var(--pdfine-mono)" fontSize="9" textAnchor="middle" fill="var(--p-ink-2)">
              re-typeset · embed
            </text>

            <rect x="500" y="90" width="100" height="80" fill="var(--p-bg-2)" stroke="var(--p-ink)" strokeWidth="1" />
            <text x="550" y="125" fontFamily="var(--p-serif)" fontSize="18" textAnchor="middle" fill="var(--p-ink)">
              PDF′
            </text>
            <text x="550" y="148" fontFamily="var(--pdfine-mono)" fontSize="10" textAnchor="middle" fill="var(--p-ink-3)">
              output
            </text>

            <line x1="180" y1="130" x2="258" y2="130" stroke="var(--p-ink)" strokeWidth="1.5" markerEnd="url(#priv-arrow)" />
            <line x1="422" y1="130" x2="498" y2="130" stroke="var(--p-ink)" strokeWidth="1.5" markerEnd="url(#priv-arrow)" />

            <rect
              x="720"
              y="70"
              width="220"
              height="120"
              fill="none"
              stroke="var(--p-warm)"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
            <text
              x="830"
              y="100"
              fontFamily="var(--p-serif)"
              fontSize="18"
              fontStyle="italic"
              textAnchor="middle"
              fill="var(--p-warm)"
            >
              server
            </text>
            <text
              x="830"
              y="124"
              fontFamily="var(--pdfine-mono)"
              fontSize="10"
              textAnchor="middle"
              fill="var(--p-warm)"
              letterSpacing="0.1em"
            >
              NOT USED
            </text>
            <line x1="730" y1="80" x2="930" y2="180" stroke="var(--p-warm)" strokeWidth="2" />
            <line x1="930" y1="80" x2="730" y2="180" stroke="var(--p-warm)" strokeWidth="2" />

            <line
              x1="620"
              y1="130"
              x2="700"
              y2="130"
              stroke="var(--p-warm)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x="660"
              y="120"
              fontFamily="var(--pdfine-mono)"
              fontSize="9"
              textAnchor="middle"
              fill="var(--p-warm)"
              letterSpacing="0.1em"
            >
              SEVERED
            </text>
          </svg>
        </div>
      </section>

      <section
        style={{
          marginTop: 72,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 48,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--pdfine-mono)',
              fontSize: 10,
              color: 'var(--p-ink-3)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            § 2 — Technical stack
          </div>
          <h2
            style={{
              fontFamily: 'var(--p-serif)',
              fontSize: 32,
              letterSpacing: '-0.02em',
              fontWeight: 400,
              margin: 0,
            }}
          >
            What actually runs.
          </h2>
          <dl style={{ marginTop: 20, fontSize: 14, lineHeight: 1.7, color: 'var(--p-ink-2)' }}>
            {STACK_ROWS.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  padding: '10px 0',
                  borderBottom: '1px dashed var(--p-line)',
                }}
              >
                <dt
                  style={{
                    fontFamily: 'var(--pdfine-mono)',
                    fontSize: 11,
                    color: 'var(--p-ink-3)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    paddingTop: 2,
                  }}
                >
                  {k}
                </dt>
                <dd style={{ margin: 0 }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'var(--pdfine-mono)',
              fontSize: 10,
              color: 'var(--p-ink-3)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            § 3 — How we compare
          </div>
          <h2
            style={{
              fontFamily: 'var(--p-serif)',
              fontSize: 32,
              letterSpacing: '-0.02em',
              fontWeight: 400,
              margin: 0,
            }}
          >
            Where does your file go?
          </h2>
          <div style={{ marginTop: 20, border: '1px solid var(--p-line)', background: 'var(--p-paper)' }}>
            {COMPARE_ROWS.map((r, i) => (
              <div
                key={r.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 1.3fr',
                  padding: '12px 14px',
                  fontSize: 13,
                  borderBottom: i < COMPARE_ROWS.length - 1 ? '1px dashed var(--p-line)' : 'none',
                  background: r.ok ? 'var(--p-accent-2)' : 'transparent',
                }}
              >
                <span
                  style={{
                    color: r.ok ? 'var(--p-accent)' : 'var(--p-warm)',
                    fontFamily: 'var(--pdfine-mono)',
                    fontSize: 14,
                  }}
                >
                  {r.ok ? '●' : '✕'}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--p-serif)',
                    fontSize: 15,
                    fontStyle: r.ok ? 'italic' : 'normal',
                    color: r.ok ? 'var(--p-accent)' : 'var(--p-ink)',
                  }}
                >
                  {r.name}
                </span>
                <span
                  style={{
                    color: 'var(--p-ink-2)',
                    fontFamily: 'var(--pdfine-mono)',
                    fontSize: 11,
                    letterSpacing: '0.04em',
                  }}
                >
                  {r.dest}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginTop: 72 }}>
        <div
          style={{
            fontFamily: 'var(--pdfine-mono)',
            fontSize: 10,
            color: 'var(--p-ink-3)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          § 4 — Verify for yourself
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {VERIFY_CARDS.map((item) => (
            <div
              key={item.n}
              style={{
                border: '1px solid var(--p-line)',
                padding: 20,
                background: 'var(--p-paper)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--p-serif)',
                  fontSize: 48,
                  fontStyle: 'italic',
                  color: 'var(--p-accent)',
                  lineHeight: 1,
                }}
              >
                {item.n}
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontFamily: 'var(--p-serif)',
                  fontSize: 18,
                  letterSpacing: '-0.01em',
                }}
              >
                {item.h}
              </div>
              <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: 'var(--p-ink-2)' }}>
                {item.p}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          marginTop: 72,
          paddingTop: 32,
          borderTop: '1px solid var(--p-line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--pdfine-mono)',
          fontSize: 12,
          color: 'var(--p-ink-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <span>Fig. 02 — End of article</span>
        <button
          onClick={onBack}
          className="paper-btn paper-btn-ghost"
          style={{ textTransform: 'none' }}
        >
          ← Back to upload
        </button>
      </section>
    </main>
  )
}
