import type { Metadata } from 'next'
import { getPayload } from 'payload'

import config from '@payload-config'
import { Badge } from '@/components/ui/Badge'
import { Container } from '@/components/ui/Container'
import { getDictionary, resolveLocale } from '@/lib/i18n'
import { verifyReviewToken } from '@/lib/reviews/token'

import { ReviewSubmitForm } from './ReviewSubmitForm'

// Kept dynamic: token validity is time-based (expiry) — a cached render could keep
// serving the form for an already-expired link.
export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ locale: string; token: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const dict = getDictionary(locale)
  return {
    title: dict.review.title,
    description: dict.review.metaDescription,
  }
}

/**
 * Public review-submission landing page (CLAUDE.md §10, T13) — the destination of the link
 * sent in the post-session review-request email. The token is verified SERVER-SIDE before
 * anything renders: an invalid/tampered/expired token never reaches the client form, it just
 * gets a clear, static message instead. There are no accounts (§3) — the token itself IS the
 * authorization for this one-time submission; the client form (`./ReviewSubmitForm`) only
 * ever re-sends it to `POST /api/reviews/submit`, which re-verifies it server-side again.
 */
export default async function ReviewTokenPage({ params }: Args) {
  const { locale: localeParam, token } = await params
  const locale = resolveLocale(localeParam)
  const dict = getDictionary(locale)
  const verified = verifyReviewToken(token)

  if (!verified.ok) {
    return (
      <section className="bg-radial-wash">
        <Container className="flex max-w-xl flex-col items-start gap-4 py-20 sm:py-28">
          <Badge variant="accent">{dict.review.invalidBadge}</Badge>
          <h1 className="text-h1 text-ink">{dict.review.invalidTitle}</h1>
          <p className="text-body-lg text-ink/70">
            {dict.review.invalidBody}
          </p>
        </Container>
      </section>
    )
  }

  const payload = await getPayload({ config })
  const session = await payload
    .findByID({
      collection: 'courseSessions',
      id: verified.payload.sessionId,
      overrideAccess: true,
      depth: 1,
      locale,
      fallbackLocale: 'en',
    })
    .catch(() => null)

  const course = session?.course
  const courseTitle = course && typeof course === 'object' && 'title' in course ? String(course.title ?? '') : ''

  return (
    <section className="bg-radial-wash">
      <Container className="flex max-w-xl flex-col items-start gap-6 py-20 sm:py-28">
        <Badge variant="accent">{dict.review.badge}</Badge>
        <h1 className="text-h1 text-ink">
          {courseTitle ? dict.review.howWas(courseTitle) : dict.review.title}
        </h1>
        <p className="text-body-lg text-ink/70">
          {dict.review.subtitle}
        </p>
        <ReviewSubmitForm token={token} locale={locale} />
      </Container>
    </section>
  )
}
