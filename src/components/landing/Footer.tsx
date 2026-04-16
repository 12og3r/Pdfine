export function Footer() {
  return (
    <footer className="w-full" style={{ padding: '60px 32px 32px', position: 'relative' }}>
      {/* Brick baseline */}
      <div
        className="pixel-brick"
        style={{
          height: '24px',
          marginBottom: '32px',
          maxWidth: '1200px',
          margin: '0 auto 32px',
        }}
      />

      <div
        className="flex flex-col md:flex-row justify-between items-center"
        style={{ gap: '16px', maxWidth: '1200px', margin: '0 auto' }}
      >
        <div className="flex items-center" style={{ gap: '12px' }}>
          {/* Pixel logo — coin block */}
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'var(--ink-coin)',
              border: '3px solid var(--ink-black)',
              boxShadow:
                'inset -3px -3px 0 0 var(--ink-coin-dark), inset 3px 3px 0 0 #FFF07A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                color: 'var(--ink-black)',
                textShadow: '1px 1px 0 rgba(255, 255, 255, 0.4)',
              }}
            >
              P
            </span>
          </div>
          <span
            style={{
              color: 'var(--ink-black)',
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              letterSpacing: '0.05em',
            }}
          >
            PDFINE
          </span>
          <span
            style={{
              color: 'var(--ink-brick-dark)',
              fontFamily: 'var(--font-display)',
              fontSize: '9px',
            }}
          >
            © {new Date().getFullYear()}
          </span>
        </div>

        <p
          className="text-center md:text-right"
          style={{
            color: 'var(--ink-brick-dark)',
            fontFamily: 'var(--font-pixel-body)',
            fontSize: '14px',
          }}
        >
          Processed locally. No files uploaded. No data collected.
        </p>
      </div>
    </footer>
  )
}
