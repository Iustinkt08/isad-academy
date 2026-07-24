import PillTag from '../PillTag'
import { Container } from '../ui/Container'

/**
 * Course / Header — breadcrumb, PillTag, two-tone title, teaser.
 * Redesign (owner Figma node 3790:4224, extracts 2026-07-13): SIMPLIFIED —
 * NO meta chips, NO Share button (both removed in the redesign).
 * Site adaptations kept from the previous integration: shared Container (navbar-logo
 * line) instead of the extract's max-w-[1300px] px-4; clamped title below desktop;
 * token mapping ink-body→ink, ink-muted→grey-600.
 * Title convention (owner): the LAST word carries the brand gradient, the final "."
 * stays Ink. All visible strings arrive pre-localized via `data` (built by the page
 * from dict.courseDetail / dict.nav), so this component needs no locale prop.
 */

export type CourseHeaderData = {
  breadcrumb: string[] // ['Courses', 'PECB ISO/IEC 42001', 'Lead Implementer']
  pillLabel: string
  titlePlain: string // ink part — e.g. "Lead "
  titleGradient: string // gradient part — e.g. "Implementer" (the "." is added in ink)
  teaser: string
}

export default function CourseHeader({ data }: { data: CourseHeaderData }) {
  return (
    <header className="pb-5 pt-8 lg:pb-9 lg:pt-[130px]">
      <Container className="flex w-full flex-col gap-3 lg:gap-4">
        <p className="text-[12px] tracking-[0.2px] text-grey-600 lg:text-[13px]">
          {data.breadcrumb.join('  →  ')}
        </p>

        {/* Mobil: text 13px pe UN rând (Figma 3925-115); desktop: 14px ca până acum */}
        <PillTag>
          <span className="whitespace-nowrap text-[13px] lg:text-[14px]">{data.pillLabel}</span>
        </PillTag>

        <h1 className="text-[28px] font-semibold leading-[34px] tracking-[-1px] text-ink lg:text-[clamp(34px,4.5vw,54px)] lg:leading-normal lg:tracking-[-0.028em]">
          {data.titlePlain}
          <span className="text-gradient-brand tracking-[-0.04em]">{data.titleGradient}</span>
          <span className="text-ink">.</span>
        </h1>

        <p className="max-w-[820px] text-[14px] leading-[21px] text-grey-600 lg:text-[17px] lg:leading-normal">
          {data.teaser}
        </p>
      </Container>
    </header>
  )
}
