import type { ReactNode } from 'react'

import { cn } from './cn'

export type BadgeVariant = 'info' | 'accent' | 'dark'

const VARIANTS: Record<BadgeVariant, string> = {
  /* Ice chip with blue text — neutral labels */
  info: 'bg-ice/60 text-blue',
  /* Steel-Blue-tinted chip — e.g. the Early Bird badge */
  accent: 'bg-steel/20 text-blue',
  /* Translucent chip for dark gradient sections */
  dark: 'border border-ice/30 bg-paper/10 text-ice backdrop-blur',
}

export function Badge({
  children,
  variant = 'info',
  className,
}: {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
