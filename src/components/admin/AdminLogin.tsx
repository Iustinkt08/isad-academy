/**
 * AdminLogin — the admin sign-in screen.
 * 1:1 from Figma (node 3768:18): 480px card, two-tone "Welcome back." title,
 * email + password (gray strokes, gray placeholders), Show toggle, forgot link,
 * gradient CTA. Blue appears ONLY on the title gradient, links and the CTA fill.
 *
 * Payload admins only (Silviu + team) — no client accounts (CLAUDE.md §3.1).
 * Mounted as the custom `login` view (payload.config.ts admin.components.views);
 * submit posts to Payload's own REST login and honours its `?redirect=` param.
 */

'use client'

import Link from 'next/link'
import { useState } from 'react'

import AdminAuthShell, { AdminBrand, adminInputCls } from './AdminAuthShell'

export default function AdminLogin() {
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    const data = Object.fromEntries(new FormData(e.currentTarget).entries())

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          errors?: { message?: string }[]
        } | null
        setError(body?.errors?.[0]?.message ?? 'Invalid email or password.')
        return
      }

      // Payload appends ?redirect=/admin/... when it bounces someone here.
      const redirect = new URLSearchParams(window.location.search).get('redirect')
      window.location.assign(redirect?.startsWith('/') ? redirect : '/admin')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminAuthShell>
      <form
        onSubmit={onSubmit}
        className="flex w-[480px] max-w-full flex-col items-center gap-3.5 rounded-[24px] border-[6px] border-line-soft bg-white px-10 pb-9 pt-10 shadow-[3px_12px_32px_rgba(77,77,77,0.06)]"
      >
        <AdminBrand />

        <h1 className="text-[32px] font-semibold tracking-[-1px] text-ink">
          Welcome <span className="text-gradient-brand tracking-[-1.3px]">back.</span>
        </h1>
        <p className="text-[14px] text-grey-600">Sign in to manage courses, orders and content.</p>

        {/* Figma 3768:18: ~24px extra air between the intro copy and the form */}
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

        <div className="relative w-full">
          <input
            name="password"
            type={showPass ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="Password"
            className={`${adminInputCls} pr-16`}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-[18px] top-1/2 -translate-y-1/2 text-[13px] font-medium text-grey-600 hover:text-ink"
          >
            {showPass ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="flex w-full justify-end">
          <Link href="/admin/forgot" className="text-[13px] font-medium text-blue hover:underline">
            Forgot password?
          </Link>
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
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-[12px] text-grey-600">
          Admin access only — accounts are created by the site owner.
        </p>
      </form>
    </AdminAuthShell>
  )
}
