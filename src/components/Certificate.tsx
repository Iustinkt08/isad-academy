import Image from 'next/image'
import type { AriaRole } from 'react'

import { cn } from './ui/cn'

/**
 * Certificate — the 620×371 DOM certificate (Figma node 3725:5), SHARED between the home
 * hero fan (dict-driven RO/EN copy — Hero maps its dictionary onto these flat props) and
 * the course page's Certification card (scaled 0.5 with the REAL course title, uppercase
 * applied by the caller). Markup/classes are byte-identical to the Hero-internal version
 * it replaces, so the hero's visual output does not change.
 *
 * Accessibility is the CALLER's concern: Hero passes role="img"/aria-label for the centre
 * card and aria-hidden for the decorative fan copies; the course page passes aria-hidden.
 * The icon is /brand/icon-black.svg (no plain icon.svg exists in public/brand/).
 */

export type CertificateProps = {
  trainerLabel: string
  trainer: string
  dateLabel: string
  date: string
  certifiesLine: string
  studentName: string
  completedLine: string
  courseTitle: string
  className?: string
  role?: AriaRole
  'aria-label'?: string
  'aria-hidden'?: boolean
}

export default function Certificate({
  trainerLabel,
  trainer,
  dateLabel,
  date,
  certifiesLine,
  studentName,
  completedLine,
  courseTitle,
  className,
  role,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
}: CertificateProps) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden || undefined}
      className={cn(
        'relative h-[371px] w-[620px] rounded-[40px] bg-white drop-shadow-[0_0_2.65px_rgba(0,0,0,0.25)]',
        className,
      )}
    >
      {/* Top row: Trainer / Date */}
      <div className="absolute inset-x-[46px] top-[22px] flex justify-between text-[14px] font-medium text-ink">
        <div>
          <p>{trainerLabel}</p>
          <p className="mt-[6px]">{trainer}</p>
        </div>
        <div className="text-right">
          <p>{dateLabel}</p>
          <p className="mt-[6px]">{date}</p>
        </div>
      </div>

      {/* Centre: certifies → name pill → training line → course */}
      <div className="absolute left-1/2 top-[95px] flex w-[440px] -translate-x-1/2 flex-col items-center">
        <p className="text-[14px] font-medium text-grey-600">{certifiesLine}</p>
        <span className="mt-[13px] flex h-[45px] min-w-[217px] items-center justify-center rounded-[37px] bg-[rgba(187,187,187,0.3)] px-6 text-[24px] font-medium text-ink shadow-[0_0_4px_rgba(0,0,0,0.25)]">
          {studentName}
        </span>
        <p className="mt-[15px] text-[14px] font-medium text-grey-600">{completedLine}</p>
        <p className="mt-[12px] whitespace-nowrap text-[14px] font-medium text-grey-600">
          {courseTitle}
        </p>
      </div>

      {/* Bottom row: logo mark + wordmark (always lowercase) */}
      <div className="absolute inset-x-[45px] top-[306px] flex h-8 items-center justify-between">
        <Image
          src="/brand/icon-black.svg"
          alt=""
          aria-hidden="true"
          width={36}
          height={32}
          unoptimized
          className="h-8 w-9 object-contain object-left"
        />
        <span className="text-[16px] font-semibold text-ink">isad.academy</span>
      </div>
    </div>
  )
}
