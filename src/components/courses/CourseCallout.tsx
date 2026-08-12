import Link from 'next/link'

import { getDictionary } from '@/lib/i18n/dictionaries'
import { localePath, type Locale } from '@/lib/i18n/config'

import { Container } from '../ui/Container'

/**
 * Course / Callout — the two cards under the course page (CLAUDE.md §6:
 * "Callout jos: corporate + contact"). Redesign extract (node 3790:4343),
 * adapted to the shared Container and site tokens (radius 24, grey-600 body); the left
 * card is a brand-gradient FILL (allowed) with a blue-tinted drop shadow, the right card
 * keeps the 6px line-soft frame + soft shadow — grey strokes only, never blue.
 */

/** Per-course copy overrides (owner 2026-08-12: `courses.callouts`) — empty/missing
 * fields fall back to the site-wide dictionary copy; the links stay fixed. */
export type CalloutOverrides = {
  team?: { title?: string | null; body?: string | null } | null
  questions?: { title?: string | null; body?: string | null } | null
}

const pick = (override: string | null | undefined, fallback: string): string => {
  const trimmed = override?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : fallback
}

export default function CourseCallout({
  locale,
  overrides,
}: {
  locale: Locale
  overrides?: CalloutOverrides | null
}) {
  const t = getDictionary(locale).courseDetail
  const copy = {
    teamTitle: pick(overrides?.team?.title, t.calloutTeamTitle),
    teamBody: pick(overrides?.team?.body, t.calloutTeamBody),
    questionsTitle: pick(overrides?.questions?.title, t.calloutQuestionsTitle),
    questionsBody: pick(overrides?.questions?.body, t.calloutQuestionsBody),
  }
  return (
    <section className="pb-16 lg:pb-[110px]">
      <Container className="flex w-full flex-wrap gap-5 px-5 sm:px-5 lg:gap-6 lg:px-8">
        <Link
          href={localePath(locale, '/corporate')}
          className="flex min-w-[min(300px,100%)] flex-1 flex-col gap-2.5 rounded-[24px] bg-gradient-to-br from-[#407ea2] to-[#1c5d99] to-[90%] px-9 py-[30px] transition-transform hover:scale-[1.01] lg:shadow-[3px_9px_24px_rgba(28,93,153,0.18)]"
        >
          <h2 className="text-[18px] font-medium leading-[26px] tracking-[-0.5px] text-white lg:text-[22px] lg:leading-normal lg:tracking-[-0.7px]">
            {copy.teamTitle}
          </h2>
          <p className="text-[13.5px] leading-5 text-[#e0edf7] lg:text-[15px] lg:leading-normal">
            {copy.teamBody}
          </p>
        </Link>
        <Link
          href={localePath(locale, '/contact')}
          className="flex min-w-[min(300px,100%)] flex-1 flex-col gap-2.5 rounded-[24px] border-[6px] border-line-soft bg-white px-9 py-[30px] transition-transform hover:scale-[1.01] lg:shadow-[3px_9px_20px_rgba(77,77,77,0.03)]"
        >
          <h2 className="text-[18px] font-medium leading-[26px] tracking-[-0.5px] text-ink lg:text-[22px] lg:leading-normal lg:tracking-[-0.7px]">
            {copy.questionsTitle}
          </h2>
          <p className="text-[13.5px] leading-5 text-grey-600 lg:text-[15px] lg:leading-normal">
            {copy.questionsBody}
          </p>
        </Link>
      </Container>
    </section>
  )
}
