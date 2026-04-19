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

export function PaperMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <rect x="4" y="2" width="16" height="22" rx="1" fill="var(--p-paper)" stroke="var(--p-ink)" strokeWidth="1.2" />
      <path d="M20 2v4h-4" fill="none" stroke="var(--p-ink)" strokeWidth="1.2" />
      <path d="M8 11h8M8 14h6M8 17h8" stroke="var(--p-ink-3)" strokeWidth="1" />
      <circle cx="20" cy="20" r="4" fill="var(--p-accent)" />
    </svg>
  )
}
