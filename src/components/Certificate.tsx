import Image from 'next/image'
import type { AriaRole } from 'react'

import { cn } from './ui/cn'

/**
 * Certificate — the 620×371 DOM certificate (Figma node 3725:5), rendered by the home
 * hero fan (dict-driven RO/EN copy — Hero maps its dictionary onto these flat props).
 * Top-right meta slot shows the participant (owner 2026-08-15; it used to show the
 * completion date), and the course line can carry an optional subtitle underneath
 * ("Artificial Intelligence Management Systems").
 *
 * Accessibility is the CALLER's concern: Hero passes role="img"/aria-label for the centre
 * card and aria-hidden for the decorative fan copies.
 * The icon is /brand/icon-black.svg (no plain icon.svg exists in public/brand/).
 */

export type CertificateProps = {
  trainerLabel: string
  trainer: string
  participantLabel: string
  participant: string
  certifiesLine: string
  studentName: string
  completedLine: string
  courseTitle: string
  courseSubtitle?: string
  className?: string
  role?: AriaRole
  'aria-label'?: string
  'aria-hidden'?: boolean
}

export default function Certificate({
  trainerLabel,
  trainer,
  participantLabel,
  participant,
  certifiesLine,
  studentName,
  completedLine,
  courseTitle,
  courseSubtitle,
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
      {/* Top row: Trainer / Participant */}
      <div className="absolute inset-x-[46px] top-[22px] flex justify-between text-[14px] font-medium text-ink">
        <div>
          <p>{trainerLabel}</p>
          <p className="mt-[6px]">{trainer}</p>
        </div>
        <div className="text-right">
          <p>{participantLabel}</p>
          <p className="mt-[6px]">{participant}</p>
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
        {courseSubtitle ? (
          <p className="mt-[4px] whitespace-nowrap text-[13px] font-medium text-grey-600">
            {courseSubtitle}
          </p>
        ) : null}
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
