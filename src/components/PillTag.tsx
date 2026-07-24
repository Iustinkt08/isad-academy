import type { ReactNode } from 'react'

/**
 * PillTag — the gradient-ring pill with a label, the site's signature badge.
 * Port of the Figma `PillTag` component (3701:4): a wrapper carrying the deep-blue↔cyan
 * ring gradient (`bg-brand-ring`, globals.css), 3px padding = ring thickness, and a white
 * inner that hugs the text. NEVER a fixed width.
 *
 * v2 (owner, 2026-07-13): adds the `xs` size (12px label — the "Early Bird open" badge on
 * catalog cards). Replaces the v1 shipped with /corporate; API unchanged.
 */

const SIZES = {
  xs: 'px-3 py-[3px] text-[12px]',
  sm: 'px-4 py-1 text-[14px]',
  md: 'px-4 py-0.5 text-[28px]',
} as const

export default function PillTag({
  children,
  size = 'sm',
}: {
  children: ReactNode
  size?: keyof typeof SIZES
}) {
  return (
    <span className="bg-brand-ring inline-block w-fit rounded-full p-[3px]">
      <span className={`flex items-center rounded-full bg-white font-medium text-ink ${SIZES[size]}`}>
        {children}
      </span>
    </span>
  )
}
