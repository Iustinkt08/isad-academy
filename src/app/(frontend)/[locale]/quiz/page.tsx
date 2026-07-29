import type { Metadata } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import { isPastSession } from '@/components/courses/helpers'
import CourseQuiz from '@/components/quiz/CourseQuiz'
import type {
  QuizCourseProfile,
  QuizDomain,
  QuizLevel,
  QuizOutcome,
} from '@/components/quiz/quiz-data'
import { Reveal } from '@/components/ui/Reveal'
import { resolveLocale, type Locale } from '@/lib/i18n'

/**
 * /quiz — wizard-ul „Ce curs mi se potrivește?" v3 RESPONSIVE + LOADER (owner).
 * DESKTOP 1:1 cu Figma 3920-115 / 3920-153; MOBIL (<lg) 1:1 cu 3922-115 / 3922-153.
 * Fluxul: quiz (12 pași) → LOADER „Îți analizăm răspunsurile…" (~1.8s) → rezultat.
 *
 * MOTOR v2 (owner 2026-07-26): recomandarea e CMS-driven — pagina construiește
 * server-side profilurile cursurilor PUBLICATE și TAGATE (`courses.quizProfile` +
 * prima ediție viitoare cu locuri libere din `courseSessions`) și le pasează în
 * CourseQuiz; scoringul rulează client, în quiz-data.ts. Cursurile fără `level`
 * (ex. mockups) sunt excluse automat. Conținutul quiz-ului e în română pe ambele
 * locale (textele finale ale owner-ului), deci și profilurile se citesc cu
 * locale 'ro' (fallback EN). <main id="main-content"> vine din layout → <div>.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  // Bilingv (owner 2026-07-26) — quiz-ul urmează limba selectată.
  return locale === 'ro'
    ? {
        title: 'Quiz de cursuri',
        description:
          '12 întrebări scurte — îți recomandăm cursul sau parcursul potrivit, în mai puțin de două minute.',
      }
    : {
        title: 'Course quiz',
        description:
          '12 short questions — we recommend the right course or learning path in under two minutes.',
      }
}

async function getQuizCourses(locale: Locale): Promise<QuizCourseProfile[]> {
  try {
    const payload = await getPayload({ config })
    const coursesResult = await payload.find({
      collection: 'courses',
      pagination: false,
      depth: 0,
      overrideAccess: false,
      locale,
      fallbackLocale: 'en',
    })
    const tagged = coursesResult.docs.filter(
      (course) => course.quizProfile?.level && course.slug,
    )
    if (tagged.length === 0) return []

    const sessionsResult = await payload.find({
      collection: 'courseSessions',
      where: { course: { in: tagged.map((course) => course.id) } },
      pagination: false,
      depth: 0,
      overrideAccess: false,
    })

    // Prima ediție VIITOARE cu locuri libere per curs — tie-break-ul + bonusul de urgență.
    const nextByCourse = new Map<number, string>()
    for (const session of sessionsResult.docs) {
      if (isPastSession(session) || session.status === 'soldOut') continue
      const seatsLeft =
        session.seatsRemaining ??
        Math.max(0, (session.capacity ?? 0) - (session.seatsSold ?? 0))
      if (seatsLeft <= 0) continue
      const courseId =
        typeof session.course === 'object' ? session.course.id : session.course
      const start = String(session.startDate)
      const previous = nextByCourse.get(courseId)
      if (!previous || start < previous) nextByCourse.set(courseId, start)
    }

    return tagged.map((course) => ({
      id: course.id,
      title: course.title,
      slug: course.slug!,
      level: course.quizProfile!.level as QuizLevel,
      outcomes: (course.quizProfile?.outcomes ?? []) as QuizOutcome[],
      domains: (course.quizProfile?.domains ?? []) as QuizDomain[],
      pitch: course.quizProfile?.quizPitch?.trim() || null,
      nextStartDate: nextByCourse.get(course.id) ?? null,
    }))
  } catch {
    // CMS indisponibil → quiz-ul rulează cu 0 cursuri (gate-ul de fallback preia).
    return []
  }
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  const courses = await getQuizCourses(locale)

  return (
    <div className="bg-[#f8f9fa]">
      {/* Fade-in on scroll (owner 2026-07-25) — același Reveal ca pe homepage */}
      <Reveal>
        <CourseQuiz courses={courses} locale={locale} />
      </Reveal>
    </div>
  )
}
