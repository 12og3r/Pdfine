import type { CSSProperties } from 'react'
import { Inky } from '../mascot'

export function Hero() {
  return (
    <div
      className="relative"
      style={{
        maxWidth: '1080px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: '48px',
        alignItems: 'center',
        padding: '0 16px',
      }}
    >
      {/* Decorative pixel clouds */}
      <div className="pixel-cloud" style={{ top: '-40px', left: '8%', animation: 'float 6s steps(6) infinite' }} />
      <div
        className="pixel-cloud"
        style={{
          top: '60px',
          right: '4%',
          width: '72px',
          height: '32px',
          animation: 'float 8s steps(6) infinite',
          animationDelay: '-3s',
        }}
      />
      <div
        className="pixel-cloud"
        style={{
          top: '180px',
          left: '32%',
          width: '56px',
          height: '24px',
          animation: 'float 7s steps(6) infinite',
          animationDelay: '-1.5s',
        }}
      />

      {/* Left column: text */}
      <div className="flex flex-col items-start text-left relative" style={{ zIndex: 2 }}>
        {/* Coin Badge */}
        <div
          className="animate-entrance"
          style={
            {
              animationDelay: '100ms',
              '--slide-y': '12px',
              marginBottom: '28px',
            } as CSSProperties
          }
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 14px',
              background: 'var(--ink-paper)',
              border: '3px solid var(--ink-black)',
              boxShadow: '3px 3px 0 0 var(--ink-black)',
              fontFamily: 'var(--font-display)',
              fontSize: '9px',
              color: 'var(--ink-black)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span className="pixel-coin" style={{ width: '14px', height: '14px' }} />
            100% CLIENT-SIDE
          </div>
        </div>

        {/* Display Headline — chunky pixel drop-shadow title */}
        <h1
          className="animate-entrance"
          style={
            {
              fontFamily: 'var(--font-display)',
              color: 'var(--ink-coin)',
              fontSize: 'clamp(2rem, 6vw, 4rem)',
              lineHeight: 1.15,
              letterSpacing: '0.02em',
              fontWeight: 400,
              marginBottom: '28px',
              animationDelay: '200ms',
              '--slide-y': '30px',
              textShadow:
                '3px 0 0 var(--ink-black), -3px 0 0 var(--ink-black), 0 3px 0 var(--ink-black), 0 -3px 0 var(--ink-black), 3px 3px 0 var(--ink-black), -3px 3px 0 var(--ink-black), 3px -3px 0 var(--ink-black), -3px -3px 0 var(--ink-black), 6px 6px 0 var(--ink-brick-dark)',
            } as CSSProperties
          }
        >
          EDIT PDFS
          <br />
          <span style={{ color: 'var(--ink-cloud)' }}>LIKE A HERO</span>
        </h1>

        {/* Subtitle */}
        <p
          className="animate-entrance"
          style={
            {
              color: 'var(--ink-black)',
              fontFamily: 'var(--font-pixel-body)',
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              lineHeight: 1.6,
              maxWidth: '520px',
              fontWeight: 400,
              animationDelay: '400ms',
              '--slide-y': '16px',
              background: 'var(--ink-paper)',
              border: '3px solid var(--ink-black)',
              boxShadow: '4px 4px 0 0 var(--ink-black)',
              padding: '14px 18px',
            } as CSSProperties
          }
        >
          A private, browser-based PDF editor that preserves your document's
          typography.{' '}
          <span style={{ color: 'var(--ink-brick-dark)' }}>
            No uploads. No accounts. No compromises.
          </span>
        </p>
      </div>

      {/* Right column: Inky mascot */}
      <div
        className="hidden md:flex flex-col items-center justify-end animate-entrance"
        style={
          {
            animationDelay: '500ms',
            '--slide-y': '20px',
            minHeight: '200px',
            position: 'relative',
          } as CSSProperties
        }
      >
        <Inky action="idle" size={7} autoFidget />
        {/* Pixel grass tuft beneath Inky */}
        <div
          style={{
            width: '160px',
            height: '10px',
            background:
              'linear-gradient(180deg, var(--ink-grass) 0 5px, var(--ink-grass-dark) 5px 10px)',
            border: '3px solid var(--ink-black)',
            marginTop: '8px',
          }}
        />
      </div>
    </div>
  )
}
