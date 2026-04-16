import type { CSSProperties } from 'react'

interface Signal {
  text: string
  coinCount: number
  bg: string
}

const SIGNALS: Signal[] = [
  { text: 'PRIVATE', coinCount: 3, bg: 'var(--ink-grass)' },
  { text: 'NO UPLOADS', coinCount: 3, bg: 'var(--ink-sky)' },
  { text: 'OPEN SOURCE', coinCount: 3, bg: 'var(--ink-coin)' },
]

export function TrustSignals() {
  return (
    <div
      className="flex flex-wrap items-center justify-center"
      style={{ gap: '20px' }}
    >
      {SIGNALS.map((item, i) => (
        <div
          key={item.text}
          className="animate-entrance cursor-default"
          style={
            {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              background: item.bg,
              border: '3px solid var(--ink-black)',
              boxShadow: '3px 3px 0 0 var(--ink-black)',
              '--slide-y': '6px',
              animationDelay: `${700 + i * 120}ms`,
            } as CSSProperties
          }
        >
          {Array.from({ length: item.coinCount }).map((_, j) => (
            <span
              key={j}
              className="pixel-coin"
              style={{
                width: '12px',
                height: '12px',
                animationDelay: `${j * 200}ms`,
              }}
            />
          ))}
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '9px',
              color: 'var(--ink-black)',
              letterSpacing: '0.08em',
            }}
          >
            {item.text}
          </span>
        </div>
      ))}
    </div>
  )
}
