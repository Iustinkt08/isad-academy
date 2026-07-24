'use client'

import { useId, useState } from 'react'

import type { ApiOkEnvelope } from '@/lib/api/envelope'
import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'

type Status = 'idle' | 'loading' | 'success' | 'error'

/**
 * Blog newsletter strip — Figma 3802:39: borderless white card (drop shadow only),
 * copy on the left, email pill + gradient Subscribe on the right; stacks on mobile.
 * The email pill is borderless with a small shadow and a #959595 placeholder
 * (v3 style rules). Same Brevo double opt-in contract as the footer form:
 * POST /api/newsletter { email } → { ok } | { ok, error } (CLAUDE.md §10/§11).
 */
export default function BlogNewsletterCta({ locale }: { locale: Locale }) {
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
        body: JSON.stringify({ email }),
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
      className="flex flex-col gap-6 rounded-[24px] bg-white px-8 py-7 shadow-[3px_9px_24px_rgba(77,77,77,0.05)] lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-10"
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[20px] font-semibold tracking-[-0.6px] text-ink">{t.inboxTitle}</h2>
        <p className="text-[14px] text-grey-600">{t.inboxSub}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-[420px] shrink-0">
        <label htmlFor={inputId} className="sr-only">
          {f.emailLabel}
        </label>
        <div className="flex items-center gap-1.5 rounded-full bg-white p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.06)] focus-within:ring-1 focus-within:ring-[#bdbdbd]">
          <input
            id={inputId}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            disabled={status === 'loading'}
            className="w-full min-w-0 border-0 bg-transparent px-3.5 text-sm text-ink outline-none placeholder:text-[#959595]"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="shrink-0 rounded-full bg-gradient-to-b from-steel to-blue to-[80%] px-5 py-2.5 text-sm font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {status === 'loading' ? f.sending : f.subscribe}
          </button>
        </div>
        <p role="status" aria-live="polite" className="mt-2 min-h-5 px-2 text-sm text-grey-600">
          {message}
        </p>
      </form>
    </section>
  )
}
