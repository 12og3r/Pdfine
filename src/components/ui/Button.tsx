import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variantStyles: Record<string, CSSProperties> = {
  primary: {
    background: 'var(--ink-coin)',
    color: 'var(--ink-black)',
    border: '3px solid var(--ink-black)',
    boxShadow: '3px 3px 0 0 var(--ink-black)',
  },
  secondary: {
    background: 'var(--ink-paper)',
    color: 'var(--ink-black)',
    border: '3px solid var(--ink-black)',
    boxShadow: '3px 3px 0 0 var(--ink-black)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ink-black)',
    border: '3px solid var(--ink-black)',
    boxShadow: 'none',
  },
  danger: {
    background: 'var(--ink-danger)',
    color: 'var(--ink-paper)',
    border: '3px solid var(--ink-black)',
    boxShadow: '3px 3px 0 0 var(--ink-black)',
  },
}

const sizeStyles: Record<string, CSSProperties> = {
  sm: { height: '28px', padding: '0 12px', fontSize: '9px' },
  md: { height: '34px', padding: '0 16px', fontSize: '10px' },
  lg: { height: '42px', padding: '0 22px', fontSize: '11px' },
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  style,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${className}`}
      style={{
        fontFamily: 'var(--font-display)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        transition: 'transform 100ms steps(2), box-shadow 100ms steps(2)',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translate(2px, 2px)'
        e.currentTarget.style.boxShadow = '1px 1px 0 0 var(--ink-black)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translate(0, 0)'
        e.currentTarget.style.boxShadow =
          (variantStyles[variant] as CSSProperties).boxShadow as string
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translate(0, 0)'
        e.currentTarget.style.boxShadow =
          (variantStyles[variant] as CSSProperties).boxShadow as string
      }}
      {...props}
    >
      {children}
    </button>
  )
}
