'use client'

import { ButtonHTMLAttributes, ReactNode, forwardRef, AnchorHTMLAttributes } from 'react'
import { Link } from '@/i18n/routing'

interface LiquidGlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  fullWidth?: boolean
  useTheme?: boolean
}

const LiquidGlassButton = forwardRef<HTMLButtonElement, LiquidGlassButtonProps>(({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  useTheme = true,
  className = '',
  children,
  disabled,
  style,
  ...props
}, ref) => {
  const baseStyles = {
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  }

  const variantStyles = {
    primary: useTheme
      ? {
          background: 'var(--theme-primary)',
          color: 'var(--theme-button-text)',
        }
      : {
          background: 'rgb(234 179 8)',
          color: 'black',
        },
    secondary: {
      color: useTheme ? 'var(--theme-primary-dark)' : 'var(--text-primary)',
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.8)',
      color: 'white',
    },
    neutral: {
      color: 'var(--text-primary)',
    },
  }

  // Background + border Tailwind classes per variant
  const variantClassName: Record<string, string> = {
    primary: 'border border-white/20 dark:border-white/10',
    secondary: 'bg-white/50 dark:bg-[rgb(var(--surface-card-rgb)/0.5)] border border-white/40 dark:border-white/10',
    danger: 'border border-white/20 dark:border-white/10',
    neutral: 'bg-white/40 dark:bg-[rgb(var(--surface-card-rgb)/0.4)] border border-white/30 dark:border-white/10',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const isIconOnly = !children && icon

  return (
    <button
      ref={ref}
      className={`
        rounded-full font-semibold transition-all duration-200
        flex items-center justify-center gap-2
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isIconOnly ? 'aspect-square' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg active:scale-95'}
        ${variantClassName[variant]}
        ${className}
      `}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        ...(disabled && {
          opacity: 0.5,
          cursor: 'not-allowed',
        }),
        ...style,
      }}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.filter = 'brightness(1.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.filter = ''
        }
      }}
      {...props}
    >
      {icon && <span className={children ? '' : ''}>{icon}</span>}
      {children}
    </button>
  )
})

LiquidGlassButton.displayName = 'LiquidGlassButton'

export default LiquidGlassButton

// Link version for navigation
interface LiquidGlassLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'popover'> {
  href: string
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  fullWidth?: boolean
  useTheme?: boolean
}

export function LiquidGlassLink({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  useTheme = true,
  className = '',
  children,
  ...props
}: LiquidGlassLinkProps) {
  const baseStyles = {
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  }

  const variantStyles = {
    primary: useTheme
      ? {
          background: 'var(--theme-primary)',
          color: 'var(--theme-button-text)',
        }
      : {
          background: 'rgb(234 179 8)',
          color: 'black',
        },
    secondary: {
      color: useTheme ? 'var(--theme-primary-dark)' : 'var(--text-primary)',
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.8)',
      color: 'white',
    },
    neutral: {
      color: 'var(--text-primary)',
    },
  }

  // Background + border Tailwind classes per variant
  const variantClassName: Record<string, string> = {
    primary: 'border border-white/20 dark:border-white/10',
    secondary: 'bg-white/50 dark:bg-[rgb(var(--surface-card-rgb)/0.5)] border border-white/40 dark:border-white/10',
    danger: 'border border-white/20 dark:border-white/10',
    neutral: 'bg-white/40 dark:bg-[rgb(var(--surface-card-rgb)/0.4)] border border-white/30 dark:border-white/10',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const isIconOnly = !children && icon

  return (
    <Link
      href={href}
      className={`
        rounded-full font-semibold transition-all duration-200
        flex items-center justify-center gap-2
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isIconOnly ? 'aspect-square' : ''}
        hover:shadow-lg active:scale-95
        ${variantClassName[variant]}
        ${className}
      `}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = ''
      }}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </Link>
  )
}
