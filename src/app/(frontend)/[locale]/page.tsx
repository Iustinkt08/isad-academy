import { getPayload } from 'payload'

import config from '@payload-config'
import {
  asMedia,
  asPublishedCourses,
  earliestUpcomingStart,
  hasActiveEarlyBird,
  lexicalToPlainText,
} from '@/components/courses/helpers'
import { HomeHero } from '@/components/home/Hero'
import { OurCoursesSection } from '@/components/home/OurCoursesSection'
import FaqSection, { type FaqEntry } from '@/components/FaqSection'
import { TestimonialsSection } from '@/components/home/TestimonialsSection'
import { WhyIsadShowcase, type ShowcaseStat } from '@/components/home/WhyIsadShowcase'
import WhySectionMobile from '@/components/sections/WhySectionMobile'
import { getDictionary, localePath, resolveLocale, type Locale } from '@/lib/i18n'
import type {
  Course,
  CourseSession,
  ExpertBio,
  Homepage,
  Review,
} from '@/payload-types'


/** Preview-card chip payload for the "Explore our courses" section. */
type CourseChip = { startDate: string | null; seatsRemaining: number | null }

type HomeData = {
  homepage: Homepage | null
  expert: ExpertBio | null
  /** faqItems mapped to the FAQ section's shape (question / plain-text answer / tab label). */
  faqEntries: FaqEntry[]
  reviews: Review[]
  featuredCourses: Course[]
  earlyBirdCourseIds: Set<number>
  /** courseId → preview-card chip data (start date + seats left) for "Explore our courses". */
  courseChips: Record<number, CourseChip>
}

/**
 * All public queries go through the Local API with `overrideAccess: false` and no user,
 * so access control applies exactly as it would on the public REST API — draft courses
 * can never leak into the homepage.
 */
async function getHomeData(locale: Locale): Promise<HomeData> {
  const faqCategoryLabels = getDictionary(locale).home.faqCategories
  const empty: HomeData = {
    homepage: null,
    expert: null,
    faqEntries: [],
    reviews: [],
    featuredCourses: [],
    earlyBirdCourseIds: new Set(),
    courseChips: {},
  }

  try {
    const payload = await getPayload({ config })
    const [homepage, expert, faqResult, reviewsResult] = await Promise.all([
      payload.findGlobal({
        slug: 'homepage',
        depth: 1,
        overrideAccess: false,
        locale,
        fallbackLocale: 'en',
      }),
      payload.findGlobal({
        slug: 'expertBio',
        depth: 1,
        overrideAccess: false,
        locale,
        fallbackLocale: 'en',
      }),
      payload.find({
        collection: 'faqItems',
        sort: 'order',
        pagination: false,
        depth: 0,
        overrideAccess: false,
        locale,
        fallbackLocale: 'en',
      }),
      payload.find({
        collection: 'reviews',
        where: { showOnHome: { equals: true } },
        // Max 5 testimonials on Home — enforced in the query (§4, §6)
        limit: 5,
        sort: '-createdAt',
        depth: 1,
        overrideAccess: false,
        locale,
        fallbackLocale: 'en',
      }),
    ])

    const featuredCourses = asPublishedCourses(homepage?.featuredCourses)

    const earlyBirdCourseIds = new Set<number>()
    const courseChips: HomeData['courseChips'] = {}
    if (featuredCourses.length > 0) {
      const sessionsResult = await payload.find({
        collection: 'courseSessions',
        where: { course: { in: featuredCourses.map((course) => course.id) } },
        pagination: false,
        depth: 0,
        overrideAccess: false,
        locale,
        fallbackLocale: 'en',
      })
      const byCourse = new Map<number, CourseSession[]>()
      for (const session of sessionsResult.docs) {
        const courseId = typeof session.course === 'object' ? session.course.id : session.course
        byCourse.set(courseId, [...(byCourse.get(courseId) ?? []), session])
      }
      for (const [courseId, sessions] of byCourse) {
        if (hasActiveEarlyBird(sessions)) earlyBirdCourseIds.add(courseId)
        const startMs = earliestUpcomingStart(sessions)
        if (startMs != null) {
          // Seats from the SAME soonest edition the start date comes from, for the smart chip.
          const soonest = sessions.find((s) => new Date(s.startDate).getTime() === startMs)
          const seatsRemaining = soonest ? soonest.capacity - (soonest.seatsSold ?? 0) : null
          courseChips[courseId] = { startDate: new Date(startMs).toISOString(), seatsRemaining }
        }
      }
    }

    // faqItems → FAQ section shape: plain-text answers, select values → tab labels.
    const faqEntries: FaqEntry[] = faqResult.docs
      .filter((item) => item.answer)
      .map((item) => ({
        q: item.question,
        a: lexicalToPlainText(item.answer),
        category:
          faqCategoryLabels[(item.category ?? '') as keyof typeof faqCategoryLabels] ??
          faqCategoryLabels.discover,
      }))

    return {
      homepage,
      expert,
      faqEntries,
      reviews: reviewsResult.docs,
      featuredCourses,
      earlyBirdCourseIds,
      courseChips,
    }
  } catch {
    // The page degrades to static hero copy when the CMS is unreachable.
    return empty
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale)
  const { homepage, expert, faqEntries, reviews, featuredCourses, courseChips } =
    await getHomeData(locale)

  // CMS stats (homepage.whyIsad.stats, D5) — the component falls back to design defaults.
  const showcaseStats: ShowcaseStat[] = (homepage?.whyIsad?.stats ?? [])
    .filter((stat) => stat.label)
    .map((stat) => ({ num: stat.value ?? undefined, label: stat.label! }))

  const dict = getDictionary(locale)
  const hero = homepage?.hero
  // CMS copy wins when set (localized via Payload); static fallbacks follow the locale.
  const title = hero?.title || dict.hero.titleFallback
  const subtitle = hero?.subtitle || dict.hero.subtitleFallback
  const ctaText = hero?.ctaText || dict.hero.ctaFallback
  const ctaLink = hero?.ctaLink || localePath(locale, '/courses')

  return (
    <>
      {/* 1 — Hero: light, stacked-centered, CSS certificate + chips (UI Redesign Spec §4) */}
      <HomeHero
        locale={locale}
        title={title}
        subtitle={subtitle}
        ctaText={ctaText}
        ctaLink={ctaLink}
      />

      {/* Why isad.academy? — showcase (owner Figma design 2026-07-12; replaces the old
          dark Why-isad section) */}
      <WhyIsadShowcase
        locale={locale}
        expertName={expert?.name || 'Dr. Silviu Gresoi'}
        expertPhotoUrl={asMedia(expert?.photo)?.url ?? null}
        stats={showcaseStats}
      />
      {/* Mobile counterpart — same section, Figma-exact card carousel (lg:hidden;
          desktop showcase above is hidden lg:block). Owner Figma 3858-2991 / 3781-19 */}
      <WhySectionMobile locale={locale} />

      {/* 2 — Explore our upcoming courses (curated via homepage.featuredCourses; owner
          Figma design 2026-07-12, node 3690-2902 — replaces the old FeaturedCoursesSection) */}
      <OurCoursesSection courses={featuredCourses} chips={courseChips} locale={locale} />

      {/* 3 — Testimonials marquee (reviews with showOnHome, max 5 — owner Figma extract
          node 3622:4020, 2026-07-13; sits right below the courses section) */}
      <TestimonialsSection reviews={reviews} locale={locale} />

      {/* 4 — FAQ (owner Figma extract node 3742:22, 2026-07-13) — CMS-driven via faqItems
          (question / answer / category); falls back to the built-in 12 Q&A when empty */}
      <FaqSection items={faqEntries} locale={locale} />
    </>
  )
}
