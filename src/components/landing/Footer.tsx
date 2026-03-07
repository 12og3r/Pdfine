export function Footer() {
  return (
    <footer className="w-full max-w-screen-xl mx-auto" style={{ padding: '40px 32px' }}>
      <div
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--border-solid), transparent)',
          marginBottom: '32px',
        }}
      />
      <div className="flex flex-col md:flex-row justify-between items-center" style={{ gap: '12px' }}>
        <div className="flex items-center" style={{ gap: '10px' }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '8px',
              background: 'var(--gradient-accent)',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.15)',
            }}
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
            Pdfine
          </span>
          <span style={{ color: 'var(--text-ghost)', fontSize: '12px' }}>&copy; {new Date().getFullYear()}</span>
        </div>
        <p className="text-center md:text-right" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          Processed locally. No files uploaded. No data collected.
        </p>
      </div>
    </footer>
  )
}
