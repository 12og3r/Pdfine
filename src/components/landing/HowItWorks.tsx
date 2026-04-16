import { useEffect, useRef, useState, type CSSProperties } from 'react'

interface Step {
  number: string
  title: string
  description: string
  sprite: 'pipe' | 'brick' | 'flag'
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'OPEN',
    description: 'Drop your PDF or click to choose a file from your device.',
    sprite: 'pipe',
  },
  {
    number: '02',
    title: 'EDIT',
    description: 'Click any text to edit. Changes reflow automatically.',
    sprite: 'brick',
  },
  {
    number: '03',
    title: 'EXPORT',
    description: "Download your edited PDF. That's it — level cleared.",
    sprite: 'flag',
  },
]

export function HowItWorks() {
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
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="w-full" style={{ padding: '96px 32px' }}>
      {/* Header */}
      <div
        className="text-center"
        style={{
          marginBottom: '72px',
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
          ⸺ HOW IT WORKS ⸺
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--ink-coin)',
            fontSize: 'clamp(1.2rem, 3.2vw, 2rem)',
            letterSpacing: '0.03em',
            textShadow:
              '3px 0 0 var(--ink-black), -3px 0 0 var(--ink-black), 0 3px 0 var(--ink-black), 0 -3px 0 var(--ink-black), 3px 3px 0 var(--ink-black), -3px 3px 0 var(--ink-black), 3px -3px 0 var(--ink-black), -3px -3px 0 var(--ink-black), 5px 5px 0 var(--ink-brick-dark)',
          }}
        >
          THREE STEPS TO VICTORY
        </h2>
      </div>

      {/* Steps */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '32px',
          maxWidth: '1100px',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {STEPS.map((step, i) => (
          <StepCard key={step.number} step={step} revealed={revealed} delay={i * 180} index={i} />
        ))}
      </div>
    </section>
  )
}

function StepCard({
  step,
  revealed,
  delay,
  index,
}: {
  step: Step
  revealed: boolean
  delay: number
  index: number
}) {
  const style: CSSProperties = {
    background: 'var(--ink-paper)',
    border: '4px solid var(--ink-black)',
    boxShadow: '5px 5px 0 0 var(--ink-black)',
    padding: '32px 24px 28px',
    position: 'relative',
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'translateY(0)' : 'translateY(30px)',
    transition: `all 500ms steps(8) ${delay}ms`,
  }

  return (
    <div style={style}>
      {/* Floating number badge at top */}
      <div
        style={{
          position: 'absolute',
          top: '-16px',
          left: '20px',
          background: 'var(--ink-black)',
          color: 'var(--ink-coin)',
          fontFamily: 'var(--font-display)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          padding: '6px 10px',
          border: '3px solid var(--ink-black)',
        }}
      >
        STAGE {step.number}
      </div>

      {/* Sprite illustration */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '120px',
          margin: '8px 0 20px',
        }}
      >
        {step.sprite === 'pipe' && <PipeSprite />}
        {step.sprite === 'brick' && <BrickSprite />}
        {step.sprite === 'flag' && <FlagSprite />}
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '14px',
          color: 'var(--ink-black)',
          letterSpacing: '0.05em',
          marginBottom: '10px',
        }}
      >
        {step.title}
      </h3>
      <p
        style={{
          color: 'var(--ink-brick-dark)',
          fontFamily: 'var(--font-pixel-body)',
          fontSize: '16px',
          lineHeight: 1.55,
        }}
      >
        {step.description}
      </p>

      {/* Arrow connector (not on last card) */}
      {index < 2 && (
        <div
          aria-hidden
          className="hidden md:block"
          style={{
            position: 'absolute',
            right: '-24px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            color: 'var(--ink-coin)',
            textShadow: '2px 2px 0 var(--ink-black)',
            zIndex: 2,
          }}
        >
          ▶
        </div>
      )}
    </div>
  )
}

/* Pixel sprite illustrations — simple CSS/SVG */

function PipeSprite() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          width: '88px',
          height: '28px',
          background:
            'linear-gradient(90deg, var(--ink-pipe-dark) 0 5px, var(--ink-pipe) 5px 16px, #A5E39E 16px 24px, var(--ink-pipe) 24px 35px, var(--ink-pipe-dark) 35px 40px, var(--ink-pipe-dark) 48px 53px, var(--ink-pipe) 53px 64px, #A5E39E 64px 72px, var(--ink-pipe) 72px 83px, var(--ink-pipe-dark) 83px 88px)',
          border: '3px solid var(--ink-black)',
        }}
      />
      <div
        style={{
          width: '72px',
          height: '60px',
          background:
            'linear-gradient(90deg, var(--ink-pipe-dark) 0 5px, var(--ink-pipe) 5px 14px, #A5E39E 14px 22px, var(--ink-pipe) 22px 50px, var(--ink-pipe-dark) 50px 55px, var(--ink-pipe-dark) 57px 62px, var(--ink-pipe) 62px 72px)',
          border: '3px solid var(--ink-black)',
          borderTop: 'none',
        }}
      />
    </div>
  )
}

function BrickSprite() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div
        style={{
          width: '120px',
          height: '30px',
          background: 'var(--ink-brick)',
          border: '3px solid var(--ink-black)',
          position: 'relative',
          boxShadow:
            'inset -4px -4px 0 0 var(--ink-brick-dark), inset 4px 4px 0 0 #E59964',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '3px',
            background: 'var(--ink-black)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: '50%',
            left: '33%',
            width: '3px',
            background: 'var(--ink-black)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            bottom: 0,
            left: '66%',
            width: '3px',
            background: 'var(--ink-black)',
          }}
        />
      </div>
      <div
        style={{
          width: '120px',
          height: '30px',
          background: 'var(--ink-coin)',
          border: '3px solid var(--ink-black)',
          boxShadow:
            'inset -4px -4px 0 0 var(--ink-coin-dark), inset 4px 4px 0 0 #FFF07A',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            color: 'var(--ink-black)',
          }}
        >
          ?
        </span>
      </div>
    </div>
  )
}

function FlagSprite() {
  return (
    <div
      style={{
        position: 'relative',
        width: '80px',
        height: '110px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {/* Pole */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '6px',
          transform: 'translateX(-50%)',
          background: 'var(--ink-paper-dark)',
          border: '2px solid var(--ink-black)',
        }}
      />
      {/* Pole cap */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: '16px',
          height: '16px',
          transform: 'translateX(-50%)',
          background: 'var(--ink-coin)',
          border: '2px solid var(--ink-black)',
          boxShadow: 'inset -3px -3px 0 0 var(--ink-coin-dark)',
        }}
      />
      {/* Flag */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '22px',
          width: '46px',
          height: '30px',
          background: 'var(--ink-danger)',
          border: '3px solid var(--ink-black)',
          animation: 'float 1.5s steps(4) infinite',
        }}
      />
    </div>
  )
}
