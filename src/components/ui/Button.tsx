import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: { background: 'var(--text-primary)', color: 'white' },
  secondary: { background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border-solid)' },
  ghost: { background: 'transparent', color: 'var(--text-secondary)' },
  danger: { background: 'var(--error)', color: 'white' },
}

const sizeClasses = {
  sm: 'h-7 px-3 text-[12px]',
  md: 'h-8 px-4 text-[13px]',
  lg: 'h-10 px-5 text-[14px]',
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
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer hover:opacity-85 active:scale-[0.98] ${sizeClasses[size]} ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  )
}
