interface PaperTopBarProps {
  onBrandClick?: () => void
}

export function PaperTopBar({ onBrandClick }: PaperTopBarProps) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 32px',
        borderBottom: '1px solid var(--p-line)',
        background: 'color-mix(in srgb, var(--p-bg) 88%, transparent)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <button
        onClick={onBrandClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'transparent',
          border: 'none',
          cursor: onBrandClick ? 'pointer' : 'default',
          padding: 0,
          color: 'var(--p-ink)',
        }}
      >
        <PaperMark />
        <span style={{ fontFamily: 'var(--p-serif)', fontSize: 22, letterSpacing: '-0.01em' }}>
          Pdfine
        </span>
        <span
          style={{
            fontFamily: 'var(--pdfine-mono)',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--p-ink-3)',
            marginLeft: 6,
          }}
        >
          v1.0
        </span>
      </button>

      <nav style={{ display: 'flex', gap: 28, fontSize: 14, color: 'var(--p-ink-2)' }}>
        <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Features</a>
        <a
          href="https://github.com/12og3r/Pdfine"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          Github
        </a>
      </nav>
    </header>
  )
}

interface PaperMarkProps {
  size?: number
}

export function PaperMark({ size = 26 }: PaperMarkProps) {
  const height = size
  const width = Math.round(size * (32 / 28))
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 28"
      aria-hidden
      style={{ display: 'block' }}
    >
      <text
        x="14"
        y="22"
        textAnchor="middle"
        fontFamily="Newsreader, 'Iowan Old Style', Georgia, serif"
        fontSize="28"
        fontStyle="italic"
        fontWeight="500"
        fill="var(--p-ink)"
      >
        P
      </text>
      <circle cx="24.5" cy="21" r="1.8" fill="var(--p-warm)" />
      <rect x="5" y="24.5" width="22" height="1.4" fill="var(--p-accent)" />
    </svg>
  )
}
