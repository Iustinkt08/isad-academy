/**
 * AdminForgotPassword — the "reset your password" request screen.
 * Same shell/geometry as AdminLogin (480px card, two-tone title, gray-stroke
 * input, gradient CTA) — owner 2026-07-29: match the sign-in / create-user look.
 *
 * Mounted as the custom `forgot` view (payload.config.ts admin.components.views).
 * Submits to Payload's own REST endpoint `/api/users/forgot-password`, which
 * mints a reset token and mails the `/admin/reset/:token` link.
 *
 * The success state is deliberately generic ("if an account exists…") so the
 * form never reveals whether an email address is registered.
 */

'use client'

import Link from 'next/link'
import { useState } from 'react'

import AdminAuthShell, { AdminBrand, adminInputCls } from './AdminAuthShell'

export default function AdminForgotPassword() {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    const data = Object.fromEntries(new FormData(e.currentTarget).entries())

    try {
      const res = await fetch('/api/users/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          errors?: { message?: string }[]
        } | null
        setError(body?.errors?.[0]?.message ?? 'Could not send the reset link. Please try again.')
        return
      }

      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const cardCls =
    'flex w-[480px] max-w-full flex-col items-center gap-3.5 rounded-[24px] border-[6px] border-line-soft bg-white px-10 pb-9 pt-10 shadow-[3px_12px_32px_rgba(77,77,77,0.06)]'

  if (sent) {
    return (
      <AdminAuthShell>
        <div className={cardCls}>
          <AdminBrand />

          <h1 className="text-center text-[32px] font-semibold tracking-[-1px] text-ink">
            Check your <span className="text-gradient-brand tracking-[-1.3px]">inbox.</span>
          </h1>
          <p className="text-center text-[14px] text-grey-600">
            If an account exists for that address, we’ve sent a link to reset the password. The
            link expires in one hour.
          </p>

          <Link
            href="/admin/login"
            className="mt-6 w-full rounded-full bg-gradient-to-b from-steel to-blue to-[80%] pb-3.5 pt-[13px] text-center text-[16px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.01]"
          >
            Back to sign in
          </Link>
        </div>
      </AdminAuthShell>
    )
  }

  return (
    <AdminAuthShell>
      <form onSubmit={onSubmit} className={cardCls}>
        <AdminBrand />

        <h1 className="text-center text-[32px] font-semibold tracking-[-1px] text-ink">
          Reset your <span className="text-gradient-brand tracking-[-1.3px]">password.</span>
        </h1>
        <p className="text-center text-[14px] text-grey-600">
          Enter your email and we’ll send you a reset link.
        </p>

        {/* Same 24px of air between the intro copy and the form as on sign-in */}
        <div className="mt-6 w-full">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email address"
            className={adminInputCls}
          />
        </div>

        {error && (
          <p role="alert" className="w-full text-center text-[13px] text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full rounded-full bg-gradient-to-b from-steel to-blue to-[80%] pb-3.5 pt-[13px] text-[16px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>

        <Link href="/admin/login" className="text-[13px] font-medium text-blue hover:underline">
          Back to sign in
        </Link>
      </form>
    </AdminAuthShell>
  )
}
