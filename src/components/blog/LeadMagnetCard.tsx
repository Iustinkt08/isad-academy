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
 * Lead-magnet card — Figma 3839:87 (blog article redesign, UI-only rename of the old
 * LeadMagnetGate): dark-gradient panel with an email-capture pill, shown on articles with
 * an enabled lead magnet. SAME contract as before: posts `{ slug, email }` (+ the shared
 * honeypot field) to /api/blog/lead-magnet, which emails the download link — the file URL
 * is never exposed in the page markup. Success swaps the form for a confirmation line.
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
      className="relative flex w-full flex-col gap-[12px] rounded-[24px] bg-[linear-gradient(163deg,#1c5d99_0%,#091f33_71.429%)] px-[28px] py-[26px]"
    >
      <h2 className="text-[19px] font-medium tracking-[-0.5px] text-white [word-break:break-word]">
        {t.title}
      </h2>
      {status === 'success' ? (
        <p role="status" className="text-[14px] font-medium text-[#e0edf7]">
          {t.success}
        </p>
      ) : (
        <>
          <p className="text-[13.5px] text-[#e0edf7] [word-break:break-word]">{t.intro}</p>
          <form onSubmit={handleSubmit} className="w-full">
            <HoneypotField />
            <label htmlFor={inputId} className="sr-only">
              {t.emailLabel}
            </label>
            <div className="flex w-full items-center gap-[6px] rounded-[999px] bg-white p-[6px] focus-within:ring-1 focus-within:ring-[#bdbdbd]">
              <input
                id={inputId}
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t.emailPlaceholder}
                disabled={status === 'loading'}
                className="w-full min-w-0 border-0 bg-transparent pl-[16px] text-[14px] text-[#222222] outline-none placeholder:text-[#959595]"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="shrink-0 whitespace-nowrap rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] px-[18px] pb-[11px] pt-[10px] text-[14px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >
                {status === 'loading' ? t.sending : t.submit}
              </button>
            </div>
            <p role="status" aria-live="polite" className="mt-2 min-h-5 px-2 text-[13px] text-[#e0edf7]">
              {error}
            </p>
          </form>
        </>
      )}
    </div>
  )
}
