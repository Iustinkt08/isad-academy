'use client'

import { useId, useState } from 'react'

import type { DeliverLeadMagnetResult } from '@/lib/blog/deliverLeadMagnet'
import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import { HoneypotField } from '../forms/HoneypotField'

type Status = 'idle' | 'loading' | 'success' | 'error'

/** The server's own response body union (type-only import, T16 — no ad-hoc mirror). */
type LeadMagnetBody = DeliverLeadMagnetResult['body']

/**
 * Lead-magnet card — Figma 3977-687 (desktop ≥lg) / 3977-718 (mobile <lg): FLAT white
 * card (radius 24, NO border/shadow) with a decorative gradient blob (blur 43px) bleeding
 * out of the top-right corner, clipped by the card. The form is a pill with a 2px BLACK
 * border and the site's black button ("Send me the file"). SAME contract as before:
 * posts `{ slug, email }` (+ the shared honeypot field) to /api/blog/lead-magnet, which
 * emails the download link — the file URL is never exposed in the page markup. Success
 * swaps the form for a confirmation line. All values are explicit px/hex per the
 * delivered redesign files.
 */
export function LeadMagnetCard({ slug, locale }: { slug: string; locale: Locale }) {
  const t = getDictionary(locale).blog.leadMagnet
  const inputId = useId()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string>('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    if (!email) return

    setStatus('loading')
    setError('')
    try {
      const response = await fetch('/api/blog/lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          email,
          website: String(formData.get('website') ?? ''),
        }),
      })
      const data = (await response.json().catch(() => null)) as LeadMagnetBody | null

      if (response.ok && data?.ok) {
        setStatus('success')
      } else {
        setStatus('error')
        setError(data && !data.ok ? data.error : t.genericError)
      }
    } catch {
      setStatus('error')
      setError(t.genericError)
    }
  }

  return (
    <div
      data-testid="lead-magnet-gate"
      className="relative w-full overflow-hidden rounded-[24px] bg-white p-6 lg:px-7 lg:py-[26px]"
    >
      {/* Decorative blob — blurred gradient bleeding out of the top-right corner */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[-32px] top-[-68px] h-[168px] w-[178px] rounded-full bg-[linear-gradient(135deg,#407ea2_0%,#1c5d99_28%,#407ea2_71%,#ffffff_100%)] blur-[43px]"
      />

      <div className="relative flex flex-col gap-3">
        <h2 className="text-[16px] font-medium leading-6 tracking-[-0.3px] text-[#222222] [word-break:break-word] lg:text-[19px] lg:leading-normal">
          {t.title}
        </h2>
        {status === 'success' ? (
          <p role="status" className="text-[12.5px] leading-[18px] font-medium text-[#222222] lg:text-[13.5px] lg:leading-normal">
            {t.success}
          </p>
        ) : (
          <>
            <p className="text-[12.5px] leading-[18px] text-[#222222] [word-break:break-word] lg:text-[13.5px] lg:leading-normal">
              {t.intro}
            </p>
            <form onSubmit={handleSubmit} className="w-full">
              <HoneypotField />
              <label htmlFor={inputId} className="sr-only">
                {t.emailLabel}
              </label>
              <div className="mt-1 flex items-center justify-between gap-2 rounded-[999px] border-2 border-black p-1.5">
                <input
                  id={inputId}
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={t.emailPlaceholder}
                  disabled={status === 'loading'}
                  className="min-w-0 flex-1 bg-transparent pl-2.5 text-[11px] text-[#222222] placeholder:text-[#222222] focus:outline-none lg:pl-4 lg:text-[14px]"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="shrink-0 rounded-[20px] bg-black px-4 py-2 text-[11px] font-semibold text-white transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none lg:text-[14px]"
                >
                  {status === 'loading' ? t.sending : t.submitFile}
                </button>
              </div>
              {status === 'error' && error && (
                <p role="alert" className="mt-2 px-2 text-[12.5px] text-[#595959]">
                  {error}
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}
