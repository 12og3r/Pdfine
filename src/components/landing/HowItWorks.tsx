import { useEffect, useRef, useState, useCallback } from 'react'

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
  const [orbStep, setOrbStep] = useState(-1)
  const orbResetting = useRef(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); observer.disconnect() } },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Sequentially activate steps synced with orb travel (10s cycle)
  // Orb arrives at card → card animates → animation done → orb moves to next
  useEffect(() => {
    if (!revealed) return
    const CYCLE = 20000
    let timers: ReturnType<typeof setTimeout>[] = []

    const runCycle = () => {
      setActiveStep(-1)
      orbResetting.current = true
      setOrbStep(-1)
      timers = [
        setTimeout(() => { orbResetting.current = false; setOrbStep(0) }, 500),  // orb appears at card 1
        setTimeout(() => setActiveStep(0), 800),      // card 1 starts immediately
        setTimeout(() => setOrbStep(1), 2300),        // card 1 done → orb travels to card 2 (4s)
        setTimeout(() => setActiveStep(1), 3300),     // orb arrived (3300+4000) → card 2 starts
        setTimeout(() => setOrbStep(2), 4300),        // card 2 done → orb travels to card 3 (4s)
        setTimeout(() => setActiveStep(2), 5300),    // orb arrived (9800+4000) → card 3 starts
      ]
    }

    runCycle()
    const interval = setInterval(runCycle, CYCLE)
    return () => { timers.forEach(clearTimeout); clearInterval(interval) }
  }, [revealed])

  return (
    <section
      ref={sectionRef}
      className="w-full max-w-screen-xl mx-auto"
      style={{ padding: '100px 32px' }}
    >
      {/* Header */}
      <div
        className="text-center"
        style={{
          marginBottom: '80px',
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
          <span className="gradient-text">How it works</span>
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
          Three steps. <span style={{ color: 'var(--text-muted)' }}>No account.</span>
        </h2>
      </div>

      {/* Steps container */}
      <div style={{ position: 'relative', maxWidth: '900px', margin: '0 auto' }}>
        {/* SVG connecting path (desktop only) */}
        <svg
          className="hidden md:block"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
          }}
          viewBox="0 0 900 100"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="pathGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <filter id="pathGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Background path */}
          <path
            d="M150 50 C250 50, 200 50, 450 50 C700 50, 650 50, 750 50"
            stroke="#E5E7EB"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Animated gradient path — JS-driven, synced with orb */}
          {revealed && (
            <path
              d="M150 50 C250 50, 200 50, 450 50 C700 50, 650 50, 750 50"
              stroke="url(#pathGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              filter="url(#pathGlow)"
              style={{
                strokeDasharray: 600,
                strokeDashoffset: orbStep < 0 ? 600 : orbStep === 0 ? 400 : orbStep === 1 ? 200 : 0,
                transition: orbResetting.current ? 'none' : 'stroke-dashoffset 6s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          )}
          {/* Traveling orb — JS-driven position, perfectly synced with card timers */}
          {revealed && (
            <circle
              cx="0"
              cy="50"
              r="4"
              fill={orbStep <= 0 ? '#6366F1' : orbStep === 1 ? '#06B6D4' : '#10B981'}
              filter="url(#pathGlow)"
              style={{
                transform: `translateX(${orbStep <= 0 ? 150 : orbStep === 1 ? 450 : 750}px)`,
                opacity: orbStep >= 0 ? 1 : 0,
                transition: orbResetting.current ? 'none' : 'transform 6s cubic-bezier(0.22, 1, 0.36, 1), fill 4s ease, opacity 0.6s ease',
              }}
            />
          )}
        </svg>

        {/* Steps grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ gap: '32px', position: 'relative', zIndex: 1 }}
        >
          <StepCard
            step="01"
            title="Open"
            description="Drop your PDF or click to choose a file from your device."
            color="#6366F1"
            revealed={revealed}
            active={activeStep >= 0}
            delay={400}
          >
            <OpenAnimation active={activeStep >= 0} />
          </StepCard>

          <StepCard
            step="02"
            title="Edit"
            description="Click any text to edit. Changes reflow automatically."
            color="#06B6D4"
            revealed={revealed}
            active={activeStep >= 1}
            delay={800}
          >
            <EditAnimation active={activeStep >= 1} />
          </StepCard>

          <StepCard
            step="03"
            title="Export"
            description="Download your edited PDF. That's it."
            color="#10B981"
            revealed={revealed}
            active={activeStep >= 2}
            delay={1200}
          >
            <ExportAnimation active={activeStep >= 2} />
          </StepCard>
        </div>
      </div>
    </section>
  )
}

/* ===== Step Card with blooming activation ===== */
function StepCard({
  step, title, description, color, revealed, active, delay, children,
}: {
  step: string; title: string; description: string;
  color: string; revealed: boolean; active: boolean; delay: number;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }, [])

  return (
    <div
      ref={cardRef}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)',
        transition: `all 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMousePos({ x: 50, y: 50 }) }}
      onMouseMove={handleMouseMove}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '24px',
          padding: '32px 28px',
          border: `1px solid ${active ? `${color}25` : 'var(--border-solid)'}`,
          boxShadow: active
            ? `0 8px 32px ${color}10, 0 0 0 1px ${color}08`
            : 'var(--shadow-sm)',
          transition: 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          position: 'relative',
          overflow: 'hidden',
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        }}
      >
        {/* Mouse glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `radial-gradient(circle 200px at ${mousePos.x}% ${mousePos.y}%, ${color}08, transparent)`,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />

        {/* Step number + line */}
        <div className="flex items-center" style={{ gap: '12px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: active ? color : 'var(--bg-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 700,
              color: active ? 'white' : 'var(--text-ghost)',
              transition: 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
              boxShadow: active ? `0 4px 14px ${color}35` : 'none',
              transform: active ? 'scale(1)' : 'scale(0.9)',
            }}
          >
            {step}
          </div>
          <div
            style={{
              flex: 1,
              height: '1px',
              background: `linear-gradient(90deg, ${color}20, transparent)`,
              transformOrigin: 'left',
              transform: active ? 'scaleX(1)' : 'scaleX(0)',
              transition: 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
            }}
          />
        </div>

        {/* Animated visual area */}
        <div
          style={{
            height: '120px',
            borderRadius: '14px',
            background: `linear-gradient(135deg, ${color}06, ${color}03)`,
            border: `1px solid ${color}10`,
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {children}
        </div>

        {/* Text */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              color: active ? color : 'var(--text-primary)',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: '8px',
              transition: 'color 0.5s ease',
            }}
          >
            {title}
          </h3>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            lineHeight: 1.6,
          }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ===== Step Animations ===== */
function OpenAnimation({ active }: { active: boolean }) {
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* File dropping in */}
      <div
        style={{
          width: '48px',
          height: '60px',
          borderRadius: '8px',
          border: '2px solid rgba(99, 102, 241, 0.2)',
          background: 'white',
          position: 'relative',
          transform: active ? 'translateY(0) rotate(0deg)' : 'translateY(-30px) rotate(-5deg)',
          opacity: active ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: active ? '0 8px 24px rgba(99, 102, 241, 0.1)' : 'none',
        }}
      >
        {/* File corner fold */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: '14px', height: '14px',
          background: 'linear-gradient(135deg, transparent 50%, rgba(99,102,241,0.1) 50%)',
          borderBottomLeftRadius: '2px',
        }} />
        {/* Mini text lines */}
        <div style={{ padding: '14px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ height: '3px', width: '70%', borderRadius: '2px', background: 'rgba(99,102,241,0.15)' }} />
          <div style={{ height: '3px', width: '55%', borderRadius: '2px', background: 'rgba(99,102,241,0.1)' }} />
          <div style={{ height: '3px', width: '60%', borderRadius: '2px', background: 'rgba(99,102,241,0.08)' }} />
        </div>
        {/* PDF badge */}
        <div style={{
          position: 'absolute',
          bottom: '6px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '8px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: '#6366F1',
          letterSpacing: '0.05em',
        }}>PDF</div>
      </div>

      {/* Landing zone ring */}
      <div style={{
        position: 'absolute',
        bottom: '-8px',
        width: '64px',
        height: '4px',
        borderRadius: '50%',
        background: 'rgba(99, 102, 241, 0.08)',
        transform: active ? 'scaleX(1)' : 'scaleX(0)',
        transition: 'transform 0.4s ease 0.3s',
      }} />
    </div>
  )
}

function EditAnimation({ active }: { active: boolean }) {
  const [cursorVisible, setCursorVisible] = useState(false)

  useEffect(() => {
    if (!active) { setCursorVisible(false); return }
    const t = setTimeout(() => setCursorVisible(true), 400)
    return () => clearTimeout(t)
  }, [active])

  return (
    <div style={{ padding: '12px 20px', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <div style={{ height: '4px', width: active ? '80%' : '0%', borderRadius: '2px', background: 'rgba(6,182,212,0.12)', transition: 'width 0.4s ease' }} />
        <div className="flex items-center" style={{ gap: '0' }}>
          <div style={{ height: '4px', width: active ? '35%' : '0%', borderRadius: '2px', background: 'rgba(6,182,212,0.12)', transition: 'width 0.5s ease 0.2s' }} />
          {cursorVisible && (
            <div style={{
              width: '2px',
              height: '12px',
              background: '#06B6D4',
              borderRadius: '1px',
              marginLeft: '2px',
              animation: 'blink 1s step-end infinite',
              boxShadow: '0 0 6px rgba(6,182,212,0.4)',
            }} />
          )}
          {cursorVisible && (
            <div
              key={String(active)}
              style={{
                height: '4px',
                borderRadius: '2px',
                background: '#06B6D4',
                opacity: 0.3,
                marginLeft: '2px',
                animation: 'revealWidth2 0.8s ease 0.5s forwards',
                width: 0,
              }}
            />
          )}
        </div>
        <div style={{ height: '4px', width: active ? '60%' : '0%', borderRadius: '2px', background: 'rgba(6,182,212,0.08)', transition: 'width 0.5s ease 0.3s' }} />
      </div>
      <style>{`
        @keyframes revealWidth2 {
          from { width: 0; }
          to { width: 40px; }
        }
      `}</style>
    </div>
  )
}

function ExportAnimation({ active }: { active: boolean }) {
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    if (!active) { setDownloaded(false); return }
    const t = setTimeout(() => setDownloaded(true), 800)
    return () => clearTimeout(t)
  }, [active])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      {/* Download arrow */}
      <svg
        width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke={downloaded ? '#10B981' : '#D1D5DB'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{
          transform: active ? (downloaded ? 'translateY(0) scale(1.1)' : 'translateY(-8px)') : 'translateY(-20px)',
          opacity: active ? 1 : 0,
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: downloaded ? 'drop-shadow(0 2px 8px rgba(16,185,129,0.3))' : 'none',
        }}
      >
        {downloaded ? (
          <path d="M20 6L9 17l-5-5" style={{
            strokeDasharray: 30,
            strokeDashoffset: 0,
            animation: 'checkDraw2 0.4s ease forwards',
          }} />
        ) : (
          <>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </>
        )}
      </svg>

      {/* Progress bar */}
      <div style={{
        width: '60px',
        height: '3px',
        borderRadius: '2px',
        background: 'rgba(16,185,129,0.1)',
        overflow: 'hidden',
        opacity: active ? 1 : 0,
        transition: 'opacity 0.3s',
      }}>
        <div style={{
          height: '100%',
          borderRadius: '2px',
          background: '#10B981',
          width: downloaded ? '100%' : '0%',
          transition: 'width 0.6s ease',
          boxShadow: '0 0 8px rgba(16,185,129,0.3)',
        }} />
      </div>

      <style>{`
        @keyframes checkDraw2 {
          from { stroke-dashoffset: 30; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
