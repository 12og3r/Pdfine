import { useEffect, useRef, useCallback, useState } from 'react'

export function FeatureCards() {
  const sectionRef = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="w-full max-w-screen-xl mx-auto"
      style={{ padding: '80px 32px' }}
    >
      {/* Section header */}
      <div
        className="text-center"
        style={{
          marginBottom: '64px',
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <p
          className="font-semibold uppercase"
          style={{
            fontSize: '12px',
            letterSpacing: '0.2em',
            marginBottom: '16px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span className="gradient-text">Features</span>
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            letterSpacing: '-0.03em',
            fontWeight: 700,
          }}
        >
          Everything you need.{' '}
          <span style={{ color: 'var(--text-muted)' }}>Nothing you don't.</span>
        </h2>
      </div>

      {/* Bento Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '20px',
        }}
      >
        {/* Card 1: Direct Editing — large, spans 4 cols */}
        <BentoCard
          revealed={revealed}
          delay={200}
          style={{ gridColumn: 'span 6' }}
          className="bento-span-4"
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Animated preview area */}
            <div
              style={{
                flex: 1,
                minHeight: '220px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F8F7FF, #F0EFFF)',
                border: '1px solid rgba(99, 102, 241, 0.08)',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '28px',
              }}
            >
              <TypingDemo revealed={revealed} />
            </div>
            <div style={{ padding: '0 4px' }}>
              <div className="flex items-center" style={{ gap: '10px', marginBottom: '12px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6366F1',
                  background: 'rgba(99, 102, 241, 0.08)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.05em',
                }}>01</span>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}>Direct editing</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7, maxWidth: '400px' }}>
                Click any text to start typing. Original fonts, sizes, and colors are preserved. Text reflows automatically.
              </p>
            </div>
          </div>
        </BentoCard>

        {/* Card 2: Fully Private — spans 2 cols */}
        <BentoCard
          revealed={revealed}
          delay={400}
          style={{ gridColumn: 'span 6' }}
          className="bento-span-2"
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div
              style={{
                flex: 1,
                minHeight: '200px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F0FDFA, #E0F7FA)',
                border: '1px solid rgba(6, 182, 212, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '28px',
              }}
            >
              <ShieldDemo revealed={revealed} />
            </div>
            <div style={{ padding: '0 4px' }}>
              <div className="flex items-center" style={{ gap: '10px', marginBottom: '12px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#06B6D4',
                  background: 'rgba(6, 182, 212, 0.08)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.05em',
                }}>02</span>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}>Fully private</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
                Everything runs in your browser. Your documents never leave your device.
              </p>
            </div>
          </div>
        </BentoCard>

        {/* Card 3: Instant Export — spans 3 cols */}
        <BentoCard
          revealed={revealed}
          delay={500}
          style={{ gridColumn: 'span 6' }}
          className="bento-span-3"
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div
              style={{
                flex: 1,
                minHeight: '180px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
                border: '1px solid rgba(16, 185, 129, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '28px',
              }}
            >
              <ExportDemo revealed={revealed} />
            </div>
            <div style={{ padding: '0 4px' }}>
              <div className="flex items-center" style={{ gap: '10px', marginBottom: '12px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#10B981',
                  background: 'rgba(16, 185, 129, 0.08)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.05em',
                }}>03</span>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}>Instant export</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
                Download your edited PDF in one click. No watermarks, no account.
              </p>
            </div>
          </div>
        </BentoCard>

        {/* Card 4: Bonus — Typography preservation — spans 3 cols */}
        <BentoCard
          revealed={revealed}
          delay={600}
          style={{ gridColumn: 'span 6' }}
          className="bento-span-3"
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div
              style={{
                flex: 1,
                minHeight: '180px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
                border: '1px solid rgba(245, 158, 11, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '28px',
              }}
            >
              <TypographyDemo revealed={revealed} />
            </div>
            <div style={{ padding: '0 4px' }}>
              <div className="flex items-center" style={{ gap: '10px', marginBottom: '12px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#F59E0B',
                  background: 'rgba(245, 158, 11, 0.08)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.05em',
                }}>04</span>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}>Typography preserved</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
                Serif, sans, mono, bold, italic — every style stays exactly as intended.
              </p>
            </div>
          </div>
        </BentoCard>
      </div>
    </section>
  )
}

/* ===== Bento Card with 3D Tilt + Gradient Border ===== */
function BentoCard({
  children, revealed, delay, style, className = '',
}: {
  children: React.ReactNode; revealed: boolean; delay: number;
  style?: React.CSSProperties; className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    setMousePos({ x, y })
  }, [])

  const tiltX = mousePos.y * -4
  const tiltY = mousePos.x * 4
  const glowX = (mousePos.x + 1) * 50
  const glowY = (mousePos.y + 1) * 50

  return (
    <div
      ref={cardRef}
      className={className}
      style={{
        perspective: '1000px',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setMousePos({ x: 0, y: 0 }) }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-solid)',
          borderRadius: '20px',
          padding: '24px',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          transform: isHovered ? `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(10px)` : 'rotateX(0) rotateY(0) translateZ(0)',
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: isHovered
            ? 'var(--shadow-lg)'
            : 'var(--shadow-sm)',
          borderColor: isHovered ? 'var(--border-accent)' : 'var(--border-solid)',
        }}
      >
        {/* Mouse-following gradient highlight */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `radial-gradient(circle 400px at ${glowX}% ${glowY}%, rgba(99, 102, 241, 0.05), transparent)`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
            borderRadius: '20px',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ===== Typing Demo — Simulated text editing with cursor ===== */
function TypingDemo({ revealed }: { revealed: boolean }) {
  const [cursorPos, setCursorPos] = useState(0)
  const [showTyped, setShowTyped] = useState(false)

  useEffect(() => {
    if (!revealed) return
    const t1 = setTimeout(() => setCursorPos(1), 1200)
    const t2 = setTimeout(() => setCursorPos(2), 1500)
    const t3 = setTimeout(() => setShowTyped(true), 1800)
    const t4 = setTimeout(() => setCursorPos(3), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [revealed])

  const lineStyle = (width: string, color: string, opacity: number): React.CSSProperties => ({
    height: '8px',
    width,
    borderRadius: '4px',
    background: color,
    opacity,
  })

  return (
    <div style={{ fontFamily: 'var(--font-sans)', position: 'relative' }}>
      {/* Fake PDF header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={lineStyle('55%', '#6366F1', 0.2)} />
      </div>
      {/* Text lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="flex items-center" style={{ gap: '6px' }}>
          <div style={lineStyle('80%', '#374151', 0.15)} />
        </div>
        <div className="flex items-center" style={{ gap: '6px' }}>
          <div style={lineStyle('65%', '#374151', 0.15)} />
        </div>
        {/* Active editing line */}
        <div className="flex items-center" style={{ gap: '0', position: 'relative' }}>
          <div style={lineStyle('30%', '#374151', 0.15)} />
          {showTyped && (
            <div
              style={{
                height: '8px',
                borderRadius: '4px',
                background: '#6366F1',
                opacity: 0.4,
                marginLeft: '4px',
                animation: 'revealWidth 0.5s ease forwards',
                width: '0px',
              }}
            />
          )}
          {/* Blinking cursor */}
          <div
            style={{
              width: '2px',
              height: '14px',
              background: '#6366F1',
              borderRadius: '1px',
              marginLeft: '2px',
              opacity: cursorPos >= 1 ? 1 : 0,
              animation: cursorPos >= 1 ? 'blink 1s step-end infinite' : 'none',
              transition: 'opacity 0.2s',
              flexShrink: 0,
            }}
          />
        </div>
        <div style={lineStyle('70%', '#374151', 0.15)} />
        <div style={lineStyle('50%', '#374151', 0.1)} />
      </div>
      {/* Floating badge */}
      <div
        style={{
          position: 'absolute',
          top: '-4px',
          right: '0',
          background: 'white',
          borderRadius: '8px',
          padding: '6px 10px',
          boxShadow: '0 2px 12px rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#6366F1',
          fontFamily: 'var(--font-mono)',
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.8s',
        }}
      >
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#6366F1', animation: 'subtlePulse 2s ease-in-out infinite',
        }} />
        Live editing
      </div>
      <style>{`
        @keyframes revealWidth {
          from { width: 0px; }
          to { width: 60px; }
        }
      `}</style>
    </div>
  )
}

/* ===== Shield Demo — Orbiting security particles ===== */
function ShieldDemo({ revealed }: { revealed: boolean }) {
  return (
    <div style={{
      position: 'relative',
      width: '120px',
      height: '140px',
      opacity: revealed ? 1 : 0,
      transform: revealed ? 'scale(1)' : 'scale(0.8)',
      transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.6s',
    }}>
      {/* Orbiting rings */}
      <div style={{
        position: 'absolute',
        inset: '-20px',
        border: '1px dashed rgba(6, 182, 212, 0.2)',
        borderRadius: '50%',
        animation: 'spin 20s linear infinite',
      }} />
      <div style={{
        position: 'absolute',
        inset: '-35px',
        border: '1px dashed rgba(6, 182, 212, 0.1)',
        borderRadius: '50%',
        animation: 'spin 30s linear infinite reverse',
      }} />

      {/* Orbiting dots */}
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: i % 2 === 0 ? '#06B6D4' : '#6366F1',
            boxShadow: `0 0 10px ${i % 2 === 0 ? 'rgba(6,182,212,0.4)' : 'rgba(99,102,241,0.4)'}`,
            top: '50%',
            left: '50%',
            animation: `orbit${i} ${8 + i * 3}s linear infinite`,
            opacity: revealed ? 1 : 0,
            transition: `opacity 0.5s ease ${0.8 + i * 0.15}s`,
          }}
        />
      ))}

      {/* Central shield */}
      <svg
        width="120" height="140" viewBox="0 0 120 140"
        style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 4px 12px rgba(6, 182, 212, 0.15))' }}
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
        <path
          d="M60 10 L105 35 L105 75 C105 105 60 130 60 130 C60 130 15 105 15 75 L15 35 Z"
          fill="none"
          stroke="url(#shieldGrad)"
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d="M60 25 L92 43 L92 72 C92 95 60 115 60 115 C60 115 28 95 28 72 L28 43 Z"
          fill="url(#shieldGrad)"
          opacity="0.08"
        />
        {/* Checkmark */}
        <path
          d="M45 70 L55 80 L78 57"
          fill="none"
          stroke="url(#shieldGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 50,
            strokeDashoffset: revealed ? 0 : 50,
            transition: 'stroke-dashoffset 0.8s ease 1.2s',
          }}
        />
      </svg>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes orbit0 {
          from { transform: translate(-50%,-50%) rotate(0deg) translateX(55px) rotate(0deg); }
          to { transform: translate(-50%,-50%) rotate(360deg) translateX(55px) rotate(-360deg); }
        }
        @keyframes orbit1 {
          from { transform: translate(-50%,-50%) rotate(90deg) translateX(70px) rotate(-90deg); }
          to { transform: translate(-50%,-50%) rotate(450deg) translateX(70px) rotate(-450deg); }
        }
        @keyframes orbit2 {
          from { transform: translate(-50%,-50%) rotate(180deg) translateX(55px) rotate(-180deg); }
          to { transform: translate(-50%,-50%) rotate(540deg) translateX(55px) rotate(-540deg); }
        }
        @keyframes orbit3 {
          from { transform: translate(-50%,-50%) rotate(270deg) translateX(70px) rotate(-270deg); }
          to { transform: translate(-50%,-50%) rotate(630deg) translateX(70px) rotate(-630deg); }
        }
      `}</style>
    </div>
  )
}

/* ===== Export Demo — File download animation ===== */
function ExportDemo({ revealed }: { revealed: boolean }) {
  const [phase, setPhase] = useState(0) // 0=idle, 1=processing, 2=done

  useEffect(() => {
    if (!revealed) return
    const t1 = setTimeout(() => setPhase(1), 1000)
    const t2 = setTimeout(() => setPhase(2), 2500)
    const t3 = setTimeout(() => setPhase(0), 4500)
    const interval = setInterval(() => {
      setTimeout(() => setPhase(1), 0)
      setTimeout(() => setPhase(2), 1500)
      setTimeout(() => setPhase(0), 3500)
    }, 5000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearInterval(interval) }
  }, [revealed])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      opacity: revealed ? 1 : 0,
      transition: 'opacity 0.6s ease 0.6s',
    }}>
      {/* Source file */}
      <div style={{
        width: '52px',
        height: '64px',
        borderRadius: '8px',
        border: '2px solid rgba(16, 185, 129, 0.2)',
        background: 'white',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '8px',
      }}>
        <div style={{ width: '24px', height: '3px', borderRadius: '2px', background: 'rgba(16,185,129,0.3)' }} />
        <div style={{ width: '20px', height: '3px', borderRadius: '2px', background: 'rgba(16,185,129,0.2)' }} />
        <div style={{ width: '22px', height: '3px', borderRadius: '2px', background: 'rgba(16,185,129,0.15)' }} />
        <span style={{
          position: 'absolute', bottom: '-8px',
          fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-mono)',
          color: '#10B981', background: 'white', padding: '0 4px',
          letterSpacing: '0.05em',
        }}>PDF</span>
      </div>

      {/* Arrow with animation */}
      <div style={{ position: 'relative', width: '40px', height: '24px' }}>
        <svg width="40" height="24" viewBox="0 0 40 24">
          <path
            d="M0 12 L28 12"
            stroke={phase >= 1 ? '#10B981' : '#D1D5DB'}
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              strokeDasharray: 28,
              strokeDashoffset: phase >= 1 ? 0 : 28,
              transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s',
            }}
          />
          <path
            d="M24 6 L32 12 L24 18"
            fill="none"
            stroke={phase >= 1 ? '#10B981' : '#D1D5DB'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity: phase >= 1 ? 1 : 0.3,
              transition: 'opacity 0.3s ease, stroke 0.3s',
            }}
          />
        </svg>
        {phase === 1 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 10px rgba(16,185,129,0.5)',
            transform: 'translateY(-50%)',
            animation: 'travelDot 0.8s ease forwards',
          }} />
        )}
      </div>

      {/* Download result */}
      <div style={{
        width: '52px',
        height: '64px',
        borderRadius: '8px',
        border: `2px solid ${phase === 2 ? '#10B981' : 'rgba(16,185,129,0.15)'}`,
        background: phase === 2 ? 'rgba(16,185,129,0.05)' : 'white',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.4s ease',
        boxShadow: phase === 2 ? '0 4px 16px rgba(16,185,129,0.15)' : 'none',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={phase === 2 ? '#10B981' : '#D1D5DB'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'stroke 0.3s' }}
        >
          {phase === 2 ? (
            <>
              <path d="M20 6L9 17l-5-5" style={{ strokeDasharray: 30, strokeDashoffset: 0, animation: 'checkDraw 0.4s ease forwards' }} />
            </>
          ) : (
            <>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </>
          )}
        </svg>
      </div>

      <style>{`
        @keyframes travelDot {
          from { left: 0; }
          to { left: 34px; opacity: 0; }
        }
        @keyframes checkDraw {
          from { stroke-dashoffset: 30; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}

/* ===== Typography Demo — Font style showcase ===== */
function TypographyDemo({ revealed }: { revealed: boolean }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '16px',
      opacity: revealed ? 1 : 0,
      transition: 'opacity 0.6s ease 0.8s',
    }}>
      {[
        { text: 'Serif', font: 'Georgia, serif', weight: 400, style: 'normal', delay: 0 },
        { text: 'Sans Bold', font: 'var(--font-display)', weight: 700, style: 'normal', delay: 100 },
        { text: 'Mono', font: 'var(--font-mono)', weight: 400, style: 'normal', delay: 200 },
        { text: 'Italic', font: 'Georgia, serif', weight: 400, style: 'italic', delay: 300 },
      ].map(({ text, font, weight, style: fontStyle, delay }, i) => (
        <div
          key={text}
          style={{
            fontFamily: font,
            fontWeight: weight,
            fontStyle,
            fontSize: '18px',
            color: '#92400E',
            opacity: revealed ? 0.7 : 0,
            transform: revealed ? 'translateX(0)' : 'translateX(-10px)',
            transition: `all 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${1 + delay / 1000}s`,
            letterSpacing: i === 2 ? '0.05em' : '-0.01em',
          }}
        >
          {text}
        </div>
      ))}
    </div>
  )
}
