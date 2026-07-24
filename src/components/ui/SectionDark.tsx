import type { ReactNode } from 'react'

import { cn } from './cn'

/**
 * Dark gradient section wrapper — #222222 → #1C5D99 (§12), with an optional radial glow.
 */
export function SectionDark({
  children,
  className,
  wash = true,
  'aria-labelledby': ariaLabelledby,
}: {
  children: ReactNode
  className?: string
  wash?: boolean
  'aria-labelledby'?: string
}) {
  return (
    <section
      aria-labelledby={ariaLabelledby}
      className={cn('bg-section-dark relative isolate overflow-hidden text-paper', className)}
    >
      {wash && <div aria-hidden="true" className="bg-radial-wash-dark absolute inset-0 -z-10" />}
      {children}
    </section>
  )
}
