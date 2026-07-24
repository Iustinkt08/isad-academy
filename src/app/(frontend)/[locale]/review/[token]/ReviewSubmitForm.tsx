'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'
import type { SubmitReviewResult } from '@/lib/reviews'

type Status = 'idle' | 'submitting' | 'success' | 'error'

/** The server's own response body union (type-only import, T16 — no ad-hoc mirror). */
type SubmitReviewBody = SubmitReviewResult['body']

/**
 * Client form for the public review-submit page (CLAUDE.md §10, T13). Posts
 * `{ token, text, authorName, roleCompany }` to `POST /api/reviews/submit` — the token
 * itself is the whole authorization (no accounts, §3), so this form carries no other
 * credential. No rating field anywhere in this project (§4).
 */
export function ReviewSubmitForm({ token, locale }: { token: string; locale: Locale }) {
  const t = getDictionary(locale).review
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string>('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const text = String(data.get('text') ?? '').trim()
    const authorName = String(data.get('authorName') ?? '').trim()
    const roleCompany = String(data.get('roleCompany') ?? '').trim()

    setStatus('submitting')
    setError('')

    try {
      const response = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          text,
          ...(authorName ? { authorName } : {}),
          ...(roleCompany ? { roleCompany } : {}),
        }),
      })
      const result = (await response.json().catch(() => null)) as SubmitReviewBody | null

      if (response.ok && result?.ok) {
        setStatus('success')
        form.reset()
      } else {
        setStatus('error')
        setError(result && !result.ok ? result.error : t.genericError)
      }
    } catch {
      setStatus('error')
      setError(t.genericError)
    }
  }

  if (status === 'success') {
    return (
      <p role="status" className="text-body-lg font-semibold text-blue">
        {t.thanks}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <Textarea
        name="text"
        label={t.textLabel}
        placeholder={t.textPlaceholder}
        minLength={10}
        maxLength={2000}
        required
        disabled={status === 'submitting'}
      />
      <Input
        name="authorName"
        label={t.nameLabel}
        placeholder={t.namePlaceholder}
        disabled={status === 'submitting'}
      />
      <Input
        name="roleCompany"
        label={t.roleLabel}
        placeholder={t.rolePlaceholder}
        disabled={status === 'submitting'}
      />
      {status === 'error' && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? t.sending : t.submit}
      </Button>
    </form>
  )
}
