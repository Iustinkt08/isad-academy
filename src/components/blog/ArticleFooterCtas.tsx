'use client'

import Link from 'next/link'
import { useId, useState } from 'react'

import type { ApiOkEnvelope } from '@/lib/api/envelope'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { localePath, type Locale } from '@/lib/i18n/config'
import type { Course } from '@/payload-types'

type Status = 'idle' | 'loading' | 'success' | 'error'

/**
 * Article footer CTAs — Figma 3838:64 (3840:66 + 3840:74):
 *   - RelatedCourseCard: white card (drop shadow only, borderless) with the brand
 *     monogram, "Related course" eyebrow, course title + duration, gradient View course
 *     pill. Rendered ONLY when the article has a published relatedCourse (§6).
 *   - ArticleNewsletterCta: #f6f6f6 card, ALWAYS rendered. Same Brevo double opt-in
 *     contract as everywhere else: POST /api/newsletter { email } → { ok } | { ok, error }
 *     (CLAUDE.md §10/§11) — the Figma button-only mock gains an email pill because the
 *     contract needs an address.
 */

export function RelatedCourseCard({ course, locale }: { course: Course; locale: Locale }) {
  const t = getDictionary(locale).blog
  return (
    <div
      data-testid="related-course"
      className="flex w-full flex-wrap items-center gap-[16px] rounded-[24px] bg-white py-[24px] pl-[28px] pr-[24px] shadow-[0_8px_28px_rgba(77,77,77,0.06)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/icon-gradient.svg"
        alt=""
        aria-hidden="true"
        className="h-[37px] w-[40px] shrink-0 select-none object-contain"
      />
      <div className="flex min-w-[200px] flex-1 flex-col gap-[3px]">
        <p className="text-[10.5px] font-medium uppercase tracking-[2px] text-[#959595]">
          {t.relatedCourse}
        </p>
        <p className="line-clamp-2 text-[17px] font-medium tracking-[-0.5px] text-[#222222] [word-break:break-word]">
          {course.title}
        </p>
        {course.durationHours != null && (
          <p className="text-[13px] text-[#959595]">{t.hoursLive(course.durationHours)}</p>
        )}
      </div>
      <Link
        href={localePath(locale, `/cursuri/${course.slug}`)}
        className="shrink-0 whitespace-nowrap rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] px-[18px] pb-[11px] pt-[10px] text-[14px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.03] motion-reduce:transition-none"
      >
        {t.viewCourse} <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}

export function ArticleNewsletterCta({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale)
  const t = dict.blog
  const f = dict.newsletterForm
  const inputId = useId()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const email = String(new FormData(form).get('email') ?? '').trim()
    if (!email) return

    setStatus('loading')
    setMessage('')
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      })
      const data = (await response.json().catch(() => null)) as ApiOkEnvelope | null
      if (response.ok && data?.ok) {
        setStatus('success')
        setMessage(f.success)
        form.reset()
      } else {
        setStatus('error')
        setMessage(data && !data.ok ? data.error : f.genericError)
      }
    } catch {
      setStatus('error')
      setMessage(f.genericError)
    }
  }

  return (
    <section
      aria-label={t.inboxTitle}
      className="flex w-full flex-col gap-[14px] rounded-[24px] bg-[#f6f6f6] py-[22px] pl-[28px] pr-[20px] sm:flex-row sm:items-center sm:justify-between sm:gap-[20px]"
    >
      <div className="flex flex-col gap-[2px]">
        <h2 className="text-[16px] font-medium tracking-[-0.5px] text-[#222222]">{t.inboxTitle}</h2>
        <p className="text-[12.5px] text-[#959595]">{t.inboxSub}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full sm:max-w-[340px] sm:shrink-0">
        <label htmlFor={inputId} className="sr-only">
          {f.emailLabel}
        </label>
        <div className="flex items-center gap-[6px] rounded-[999px] bg-white p-[6px] shadow-[0_0_7px_rgba(0,0,0,0.09)] focus-within:ring-1 focus-within:ring-[#bdbdbd]">
          <input
            id={inputId}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            disabled={status === 'loading'}
            className="w-full min-w-0 border-0 bg-transparent pl-[14px] text-[14px] text-[#222222] outline-none placeholder:text-[#959595]"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="shrink-0 whitespace-nowrap rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] px-[18px] pb-[11px] pt-[10px] text-[14px] font-medium text-white transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {status === 'loading' ? f.sending : f.subscribe}
          </button>
        </div>
        <p role="status" aria-live="polite" className="mt-2 min-h-5 px-2 text-[13px] text-[#595959]">
          {message}
        </p>
      </form>
    </section>
  )
}
