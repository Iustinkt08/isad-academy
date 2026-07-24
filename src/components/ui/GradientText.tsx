import type { ReactNode } from 'react'

import { cn } from './cn'

/**
 * Brand gradient text — Steel Blue → Deep Blue → Steel Blue (Brand Book p.10), for light
 * surfaces. Use `tone="ice"` on dark gradient sections: the brand never puts gradient text
 * on dark, so it renders solid Mist (#BBCDE5) instead.
 */
export function GradientText({
  children,
  className,
  tone = 'blue',
}: {
  children: ReactNode
  className?: string
  tone?: 'blue' | 'ice'
}) {
  return (
    <span className={cn(tone === 'ice' ? 'text-ice' : 'text-gradient', className)}>
      {children}
    </span>
  )
}
