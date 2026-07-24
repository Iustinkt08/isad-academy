import type { Metadata } from 'next'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { SectionDark } from '@/components/ui/SectionDark'
import { getDictionary, getLocale, localePath } from '@/lib/i18n'

/**
 * Next never passes route params to not-found files, so the [locale] segment is invisible
 * here — the language preference cookie (via `getLocale`, the documented escape hatch for
 * param-less request contexts) is the only signal. 404s are rendered on demand anyway
 * (the [...notFound] catch-all has no generateStaticParams), so reading the cookie does
 * not cost any static page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale())
  return {
    title: dict.notFound.title,
    robots: { index: false },
  }
}

/**
 * Branded 404 (T14, CLAUDE.md §7). Renders inside the (frontend) layout — header, footer
 * and consent banner stay in place. Reached by any `notFound()` in the frontend tree AND
 * by fully unmatched URLs via the `[...notFound]` catch-all route.
 */
export default async function NotFound() {
  const locale = await getLocale()
  const dict = getDictionary(locale)
  return (
    <SectionDark>
      <Container className="animate-rise flex flex-col items-start gap-6 py-24 sm:py-32">
        <p className="text-sm font-semibold uppercase tracking-wider text-ice/60">
          {dict.notFound.eyebrow}
        </p>
        <h1 className="text-display max-w-2xl">
          {dict.notFound.title}
        </h1>
        <p className="max-w-xl text-body-lg text-ice/85">
          {dict.notFound.body}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Button href={localePath(locale, '/cursuri')} variant="inverse" size="lg">
            {dict.notFound.browseCourses}
          </Button>
          <Button href={localePath(locale, '/blog')} variant="inverseOutline" size="lg">
            {dict.notFound.readBlog}
          </Button>
          <Button href={localePath(locale, '/')} variant="inverseOutline" size="lg">
            {dict.notFound.backHome}
          </Button>
        </div>
      </Container>
    </SectionDark>
  )
}
