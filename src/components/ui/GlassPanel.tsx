import type { ReactNode } from 'react'

import { cn } from './cn'

/**
 * Glassmorphism panel (§12). `tone="dark"` is for use inside dark gradient sections;
 * `tone="light"` sits on light washes.
 */
export function GlassPanel({
  children,
  className,
  tone = 'light',
  'data-testid': dataTestId,
}: {
  children: ReactNode
  className?: string
  tone?: 'light' | 'dark'
  'data-testid'?: string
}) {
  return (
    <div
      data-testid={dataTestId}
      className={cn(
        'rounded-3xl border backdrop-blur-md',
        tone === 'dark'
          ? 'border-paper/15 bg-paper/10 text-paper'
          : 'border-ice/70 bg-paper/70 text-ink shadow-lg shadow-blue/5',
        className,
      )}
    >
      {children}
    </div>
  )
}
