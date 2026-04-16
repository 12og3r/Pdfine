import { useEffect, useRef, useState, type CSSProperties } from 'react'

interface Feature {
  number: string
  title: string
  description: string
  block: 'coin' | 'brick' | 'pipe' | 'mushroom'
  icon: string
}

const FEATURES: Feature[] = [
  {
    number: '01',
    title: 'DIRECT EDITING',
    description:
      "Click any text to start typing. Original fonts, sizes, and colors are preserved. Text reflows automatically.",
    block: 'coin',
    icon: 'A',
  },
  {
    number: '02',
    title: 'FULLY PRIVATE',
    description: 'Everything runs in your browser. Your documents never leave your device.',
    block: 'brick',
    icon: '★',
  },
  {
    number: '03',
    title: 'INSTANT EXPORT',
    description: 'Download your edited PDF in one click. No watermarks, no account.',
    block: 'pipe',
    icon: '↓',
  },
  {
    number: '04',
    title: 'TYPE PRESERVED',
    description: 'Serif, sans, mono, bold, italic — every style stays exactly as intended.',
    block: 'mushroom',
    icon: 'Aa',
  },
]

const BLOCK_COLORS: Record<Feature['block'], { bg: string; inner: string }> = {
  coin: { bg: 'var(--ink-coin)', inner: 'var(--ink-coin-dark)' },
  brick: { bg: 'var(--ink-brick)', inner: 'var(--ink-brick-dark)' },
  pipe: { bg: 'var(--ink-pipe)', inner: 'var(--ink-pipe-dark)' },
  mushroom: { bg: '#D6331F', inner: '#8C1F0F' },
}

export function FeatureCards() {
  const sectionRef = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="w-full" style={{ padding: '80px 32px' }}>
      {/* Section header */}
      <div
        className="text-center"
        style={{
          marginBottom: '56px',
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 500ms steps(8)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '10px',
            letterSpacing: '0.25em',
            marginBottom: '20px',
            color: 'var(--ink-brick-dark)',
          }}
        >
          ⸺ WORLD 1-1 · FEATURES ⸺
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--ink-coin)',
            fontSize: 'clamp(1.2rem, 3.2vw, 2rem)',
            lineHeight: 1.4,
            letterSpacing: '0.03em',
            textShadow:
              '3px 0 0 var(--ink-black), -3px 0 0 var(--ink-black), 0 3px 0 var(--ink-black), 0 -3px 0 var(--ink-black), 3px 3px 0 var(--ink-black), -3px 3px 0 var(--ink-black), 3px -3px 0 var(--ink-black), -3px -3px 0 var(--ink-black), 5px 5px 0 var(--ink-brick-dark)',
          }}
        >
          POWER-UP BLOCKS
        </h2>
      </div>

      {/* Grid of power-up blocks */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {FEATURES.map((feature, i) => (
          <PowerUpCard key={feature.number} feature={feature} revealed={revealed} delay={i * 120} />
        ))}
      </div>
    </section>
  )
}

function PowerUpCard({
  feature,
  revealed,
  delay,
}: {
  feature: Feature
  revealed: boolean
  delay: number
}) {
  const [hovered, setHovered] = useState(false)
  const colors = BLOCK_COLORS[feature.block]

  const style: CSSProperties = {
    background: 'var(--ink-paper)',
    border: '4px solid var(--ink-black)',
    padding: '28px 24px',
    position: 'relative',
    transition: 'transform 120ms steps(3), box-shadow 120ms steps(3)',
    transform: revealed
      ? hovered
        ? 'translate(-3px, -3px)'
        : 'translate(0, 0)'
      : 'translateY(24px)',
    boxShadow: hovered
      ? '7px 7px 0 0 var(--ink-black)'
      : '4px 4px 0 0 var(--ink-black)',
    opacity: revealed ? 1 : 0,
    transitionDelay: `${delay}ms`,
  }

  return (
    <div
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Big pixel block icon */}
      <div
        style={{
          width: '72px',
          height: '72px',
          background: colors.bg,
          border: '3px solid var(--ink-black)',
          boxShadow: `inset -5px -5px 0 0 ${colors.inner}, inset 5px 5px 0 0 rgba(255, 255, 255, 0.35)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          animation: hovered ? 'block-bounce 0.6s steps(6)' : 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: feature.icon.length > 1 ? '16px' : '28px',
            color: 'var(--ink-black)',
            lineHeight: 1,
            textShadow: '2px 2px 0 rgba(255, 255, 255, 0.4)',
          }}
        >
          {feature.icon}
        </span>
      </div>

      {/* Number + title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '9px',
            color: 'var(--ink-paper)',
            background: 'var(--ink-black)',
            padding: '4px 8px',
            letterSpacing: '0.05em',
          }}
        >
          {feature.number}
        </span>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            color: 'var(--ink-black)',
            letterSpacing: '0.05em',
          }}
        >
          {feature.title}
        </h3>
      </div>

      <p
        style={{
          color: 'var(--ink-brick-dark)',
          fontFamily: 'var(--font-pixel-body)',
          fontSize: '16px',
          lineHeight: 1.55,
        }}
      >
        {feature.description}
      </p>
    </div>
  )
}
