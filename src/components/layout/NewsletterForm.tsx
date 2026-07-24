'use client'

import { useId, useState } from 'react'

import type { ApiOkEnvelope } from '@/lib/api/envelope'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config'
import { cn } from '../ui/cn'

type Status = 'idle' | 'loading' | 'success' | 'error'

/**
 * Newsletter signup. Posts to /api/newsletter (Brevo double opt-in) — the
 * `{ email }` in / `{ ok, error }` out contract, the loading/success/error states
 * and the dict.newsletterForm copy are unchanged by the footer redesign
 * (Figma 3790:5036).
 *
 * Style rules v3 (owner): cards/pills are BORDERLESS and lift through drop shadow
 * only. Inputs are the one exception — thin grey border (`border-line`), grey
 * placeholder (`grey-600`) and a grey #bdbdbd focus, never a blue ring. The
 * footer's email pill is a borderless shadowed pill (per Figma); keyboard focus
 * shows as a grey ring. Blue appears only as the Subscribe gradient fill.
 */
export function NewsletterForm({
  tone = 'dark',
  variant = 'stacked',
  className,
  locale = DEFAULT_LOCALE,
}: {
  tone?: 'dark' | 'light'
  /** 'pill' = single rounded field with the button inside (footer card, Figma 3790:5036). */
  variant?: 'stacked' | 'pill'
  className?: string
  locale?: Locale
}) {
  const t = getDictionary(locale).newsletterForm
  const inputId = useId()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string>('')

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
      // The server's `{ ok } | { ok, error }` envelope (type-only import, T16) — the
      // success copy is client-side; the endpoint never returns a message of its own.
      const data = (await response.json().catch(() => null)) as ApiOkEnvelope | null

      if (response.ok && data?.ok) {
        setStatus('success')
        setMessage(t.success)
        form.reset()
      } else {
        setStatus('error')
        setMessage(data && !data.ok ? data.error : t.genericError)
      }
    } catch {
      setStatus('error')
      setMessage(t.genericError)
    }
  }

  const isDark = tone === 'dark'

  if (variant === 'pill') {
    return (
      <form onSubmit={handleSubmit} className={cn('w-full', className)}>
        {/* Label stays for screen readers; visually the placeholder carries it (owner req) */}
        <label htmlFor={inputId} className="sr-only">
          {t.emailLabel}
        </label>
        {/* Borderless pill lifted by drop shadow (v3); keyboard focus = grey ring, no blue */}
        <div className="flex items-center gap-1.5 rounded-full bg-paper p-1.5 shadow-[0_4px_16px_rgba(77,77,77,0.10)] transition-shadow duration-200 focus-within:ring-1 focus-within:ring-[#bdbdbd]">
          <input
            id={inputId}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.emailLabel}
            disabled={status === 'loading'}
            className="w-full min-w-0 border-0 bg-transparent px-3.5 text-sm text-ink outline-none placeholder:text-grey-600"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="shrink-0 rounded-full bg-gradient-to-b from-steel to-blue to-[80%] px-5 py-3 text-sm font-medium text-paper shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform duration-200 ease-brand hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {status === 'loading' ? t.sending : t.subscribe}
          </button>
        </div>
        <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-grey-600">
          {message}
        </p>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      <label
        htmlFor={inputId}
        className={cn('mb-1.5 block text-sm font-semibold', isDark ? 'text-paper' : 'text-ink')}
      >
        {t.emailLabel}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        {/* Input = the v3 exception: thin grey border, grey placeholder, grey focus */}
        <input
          id={inputId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          disabled={status === 'loading'}
          className={cn(
            'w-full min-w-0 rounded-full border px-4 py-2.5 text-sm outline-none transition-colors',
            isDark
              ? 'border-paper/25 bg-paper/10 text-paper placeholder:text-ice/50 focus:border-ice'
              : 'border-line bg-paper text-ink placeholder:text-grey-600 focus:border-[#bdbdbd]',
          )}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className={cn(
            'shrink-0 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 ease-brand disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
            isDark
              ? 'bg-paper text-blue hover:bg-ice/60'
              : 'bg-gradient-to-b from-steel to-blue to-[80%] text-paper shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] hover:scale-[1.03]',
          )}
        >
          {status === 'loading' ? t.subscribing : t.subscribe}
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={cn(
          'mt-2 min-h-5 text-sm',
          status === 'error' && (isDark ? 'text-ice' : 'text-grey-600'),
          status === 'success' && (isDark ? 'text-ice' : 'text-blue'),
        )}
      >
        {message}
      </p>
    </form>
  )
}
