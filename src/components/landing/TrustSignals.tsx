import { ShieldCheck, ServerOff, Sparkles } from 'lucide-react'

export function TrustSignals() {
  return (
    <div className="flex flex-wrap items-center justify-center" style={{ gap: '24px' }}>
      {[
        { icon: ShieldCheck, text: 'Private', color: '#6366F1' },
        { icon: ServerOff, text: 'No uploads', color: '#06B6D4' },
        { icon: Sparkles, text: 'Open source', color: '#10B981' },
      ].map((item, i) => (
        <div
          key={item.text}
          className="flex items-center animate-entrance cursor-default"
          style={{
            gap: '8px',
            '--slide-y': '4px',
            animationDelay: `${700 + i * 100}ms`,
            padding: '6px 14px',
            borderRadius: '100px',
            background: 'var(--surface)',
            border: '1px solid var(--border-solid)',
            boxShadow: 'var(--shadow-xs)',
          } as React.CSSProperties}
        >
          <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
          <span
            className="font-medium"
            style={{ color: 'var(--text-secondary)', fontSize: '12px', letterSpacing: '0.03em' }}
          >
            {item.text}
          </span>
        </div>
      ))}
    </div>
  )
}
