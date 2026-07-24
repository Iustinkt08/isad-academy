import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from './cn'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'inverse'
  | 'inverseOutline'
  | 'dark'

export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 ease-brand disabled:cursor-not-allowed disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
  /* Brand-gradient pill with a Deep Blue stroke and blue outer glow (matches the hero CTA) */
  primary:
    'border border-blue bg-[linear-gradient(180deg,#407ea2_0%,#1c5d99_80%)] text-paper shadow-[0_4px_14px_rgba(28,93,153,0.35)] hover:-translate-y-0.5 hover:shadow-[0_7px_20px_rgba(28,93,153,0.45)] active:translate-y-0',
  /* Outline blue pill for light surfaces */
  secondary: 'border-2 border-blue bg-transparent text-blue hover:bg-blue/10',
  /* Text-only pill for light surfaces */
  ghost: 'bg-transparent text-blue hover:bg-blue/10',
  /* Solid white pill for dark gradient sections */
  inverse: 'bg-paper text-blue hover:bg-ice/60',
  /* Outline pill for dark gradient sections */
  inverseOutline: 'border-2 border-ice/70 bg-transparent text-paper hover:bg-paper/10',
  /* Solid ink pill (e.g. equal-weight consent buttons) */
  dark: 'bg-ink text-paper hover:bg-ink/85',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
}

export type ButtonProps = {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  /** When set, renders a link styled as a button (Next <Link> internally, <a> for external URLs). */
  href?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  onClick?: () => void
  target?: string
  rel?: string
  'aria-label'?: string
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  href,
  type = 'button',
  disabled,
  onClick,
  target,
  rel,
  'aria-label': ariaLabel,
}: ButtonProps) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className)

  if (href !== undefined) {
    const isExternal = /^(https?:|mailto:|tel:)/.test(href)
    if (isExternal) {
      return (
        <a
          href={href}
          className={classes}
          target={target}
          rel={rel}
          onClick={onClick}
          aria-label={ariaLabel}
        >
          {children}
        </a>
      )
    }
    return (
      <Link
        href={href}
        className={classes}
        target={target}
        rel={rel}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}
