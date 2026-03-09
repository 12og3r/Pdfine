import { useEffect, useRef } from 'react'

export function Hero() {
  const orbRef1 = useRef<HTMLDivElement>(null)
  const orbRef2 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let animId: number
    let t = 0
    const animate = () => {
      t += 0.003
      if (orbRef1.current) {
        const x = Math.sin(t * 0.7) * 40
        const y = Math.cos(t * 0.5) * 30
        orbRef1.current.style.transform = `translate(${x}px, ${y}px) scale(${1 + Math.sin(t) * 0.05})`
      }
      if (orbRef2.current) {
        const x = Math.cos(t * 0.6) * 35
        const y = Math.sin(t * 0.8) * 25
        orbRef2.current.style.transform = `translate(${x}px, ${y}px) scale(${1 + Math.cos(t * 1.2) * 0.04})`
      }
      animId = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div className="flex flex-col items-center text-center relative" style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Floating gradient orbs */}
      <div
        ref={orbRef1}
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
          top: '-120px',
          left: '-180px',
          pointerEvents: 'none',
          filter: 'blur(60px)',
          willChange: 'transform',
        }}
      />
      <div
        ref={orbRef2}
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
          top: '-60px',
          right: '-140px',
          pointerEvents: 'none',
          filter: 'blur(60px)',
          willChange: 'transform',
        }}
      />

      {/* Badge */}
      <div
        className="animate-entrance"
        style={{
          animationDelay: '100ms',
          '--slide-y': '12px',
          marginBottom: '28px',
        } as React.CSSProperties}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '100px',
            background: 'var(--accent-soft)',
            border: '1px solid rgba(99, 102, 241, 0.12)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--accent)',
            fontFamily: 'var(--font-sans)',
            letterSpacing: '0.01em',
          }}
        >
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent-glow)',
            animation: 'subtlePulse 2s ease-in-out infinite',
          }} />
          100% Client-Side
        </div>
      </div>

      {/* Display Headline */}
      <h1
        className="animate-entrance"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)',
          fontSize: 'clamp(3.2rem, 9vw, 6rem)',
          lineHeight: 0.92,
          letterSpacing: '-0.04em',
          fontWeight: 800,
          marginBottom: '28px',
          animationDelay: '200ms',
          '--slide-y': '30px',
        } as React.CSSProperties}
      >
        Edit PDFs,{' '}
        <span className="gradient-text" style={{ fontStyle: 'italic', paddingRight: '0.05em' }}>
          beautifully
        </span>
        <span style={{ color: 'var(--accent)' }}>.</span>
      </h1>

      {/* Subtitle */}
      <p
        className="animate-entrance"
        style={{
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
          lineHeight: 1.7,
          maxWidth: '480px',
          margin: '0 auto',
          fontWeight: 400,
          animationDelay: '400ms',
          '--slide-y': '16px',
        } as React.CSSProperties}
      >
        A private, browser-based editor that preserves your document's typography.{' '}
        <span style={{ color: 'var(--text-muted)' }}>No uploads. No accounts. No compromises.</span>
      </p>
    </div>
  )
}
